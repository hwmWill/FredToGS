const apiKey = "900a9664571c53f38f7d9da40d372f07";

// fetch data and return response in json format
function cleanQuery(endpoint) {
  let response = UrlFetchApp.fetch(endpoint, {'muteHttpExceptions': true});
  let json = response.getContentText();
  let data = JSON.parse(json);
  return data
}

// convert YYYY-MM-DD string to Date
function makeDate(dateStr) {
  var year = dateStr.substring(0, 4);
  var month = dateStr.substring(5, 7);
  var day = dateStr.substring(8, 10);
  return new Date(year, month - 1, day, 1);
}

//******************************************//
// class for getting data from FRED API
function FredQuery(seriesId, ps={}) {
  this.paramDict = {units:"lin", start:"1776-07-04", end:"9999-12-31", frequency:"", aggMethod:"avg", sortOrder:"asc"};
  var ks = Object.keys(ps);
  if (ks.length > 0) {
    for (var i = 0; i < ks.length; i++) {
      this.paramDict[ks[i]] = ps[ks[i]];    
    }
  }
  this.urlStart = "https://api.stlouisfed.org/fred/series/observations?series_id=";
  this.seriesId = seriesId;
  this.releaseDict = this.releaseInfo()
}

// set this attributes from paramDict
FredQuery.prototype.setParams = function() {
  this.units = this.paramDict["units"];
  this.start = this.paramDict["start"];
  this.end = this.paramDict["end"];
  this.frequency = this.paramDict["frequency"];
  this.aggMethod = this.paramDict["aggMethod"];
  this.sortOrder = this.paramDict["sortOrder"];
  // url to fetch
  this.endpoint = `${this.urlStart}${this.seriesId}&units=${this.units}&observation_start=${this.start}&observation_end=${this.end}&frequency=${this.frequency}&aggregation_method=${this.aggMethod}&sort_order=${this.sortOrder}&api_key=${apiKey}&file_type=json`;
}

FredQuery.prototype.addDateRange = function(dateN, dateType) {
  //
  var latest = this.releaseDict["seriesInfo"][0]["lastDate"];
  //
  var daterange = new DateRange(latest, dateN, dateType);
  var startEnd = daterange.range();
  this.paramDict["start"] = startEnd["start"];
  this.paramDict["end"] = startEnd["end"];
  this.setParams()
}

// get date and value arrays
FredQuery.prototype.run = function() {
  this.setParams()
  // fetch endpoint and extract json
  data = cleanQuery(this.endpoint);
  // limit results data to just dates and values columns
  let results = data["observations"];
  var dates = [];
  var values = [];
  for (var i = 0; i < results.length; i++) {
    //date
    let date = makeDate(results[i].date);
    dates.push(date);
    // value
    values.push(parseFloat(results[i].value));
  };
  return [dates, values]
}

// get releaseId
FredQuery.prototype.releaseId = function() {
  var baseUrl = "https://api.stlouisfed.org/fred/series/release?series_id=";
  var releaseIdUrl = `${baseUrl}${this.seriesId}&api_key=${apiKey}&file_type=json`;
  let data = cleanQuery(releaseIdUrl);
  // limit results data to name and id
  let release = data["releases"][0];
  this.releaseName = release["name"];
  this.releaseLink = release["link"];
  this.r_Id = release["id"];
}

FredQuery.prototype.releaseInfo = function() {
  this.releaseId();
  var rInfo = new FredRelease(this.r_Id, this.releaseName, this.releaseLink);
  return rInfo.releaseInfo([this.seriesId])
}

//******************************************//
// class for table of series Id results
function FredRelease(releaseId, releaseName=null, releaseLink=null) {
  this.releaseId = releaseId;
  this.releaseName = releaseName;
  this.releaseLink = releaseLink;
}

FredRelease.prototype.seriesInfo = function() {
  var endpoint = `https://api.stlouisfed.org/fred/release/series?release_id=${this.releaseId}&api_key=${apiKey}&file_type=json`;
  var data = cleanQuery(endpoint);
  var sInfo = data["seriess"];
  var keepInfo = [];
  var updateDates = [];
  for (var i = 0; i < sInfo.length; i++) {
    if (!updateDates.includes(sInfo[i]["last_updated"])) {
      updateDates.push(sInfo[i]["last_updated"]);
    } 
    keepInfo.push({
      sId: sInfo[i]["id"],
      name: sInfo[i]["title"],
      seriesFrequency: sInfo[i]["frequency"],
      units: sInfo[i]["units"],
      adjusted: sInfo[i]["seasonal_adjustment"],
      firstDate: sInfo[i]["observation_start"] ,
      lastDate: sInfo[i]["observation_end"]
    })
  }
  this.lastUpdate = updateDates.reduce((max, c) => c > max ? c : max);
  return keepInfo
}

FredRelease.prototype.source = function() {
  var data = cleanQuery(`https://api.stlouisfed.org/fred/release/sources?release_id=${this.releaseId}&api_key=${apiKey}&file_type=json`);
  var srcs = data["sources"];
  var sources = [];
  for (var i = 0; i < srcs.length; i++) {
    sources.push(srcs[i]["name"])
  }
  return sources
}

// get date of next release
FredRelease.prototype.nextRelease = function() {
  var endUrl = `https://api.stlouisfed.org/fred/release/dates?release_id=${this.releaseId}&include_release_dates_with_no_data=true&sort_order=desc&api_key=${apiKey}&file_type=json`;
  // var endUrl = `https://fred.stlouisfed.org/releases/calendar?rid=${this.releaseId}&vs=2024-01-01&ve=2024-12-31&rdc=1`;
  data = cleanQuery(endUrl);
  let releases = data["release_dates"];
  var now = new Date();
  releases = releases.filter((element) => element["date"].substring(0,4) === String(now.getFullYear()));
  var releaseDates = [];
  for (var i = 0; i < releases.length; i++) {
    let d = releases[i]["date"];
    if (d > this.lastUpdate) {
      releaseDates.push(d)
    }
  };
  // Logger.log(releaseDates);
  return releaseDates[releaseDates.length - 1]
}

FredRelease.prototype.releaseInfo = function(seriesIds=[]) {
  var si = this.seriesInfo();
  if (seriesIds.length > 0) {
    var seriesDetails = []
    for (var i = 0; i < seriesIds.length; i++) {
      seriesDetails.push(si.find((element) => seriesIds.includes(element["sId"])))
    }
  } else {
    var seriesDetails = si;
  }
  return {
    release: this.releaseName,
    releaseLink: this.releaseLink,
    sources: this.source(),
    seriesInfo: seriesDetails,
    next: this.nextRelease(),
    updated: this.lastUpdate,
  }
}

//******************************************//
// class for table of series Id results
function FredDataTable(seriesIds, seriesNames, ps={}) {
  this.seriesIds = seriesIds;
  this.seriesNames = seriesNames;
  this.ps = ps;
  //
  this.fqs = [];
  for (i = 0; i < this.seriesIds.length; i++) {
    this.fqs.push(new FredQuery(this.seriesIds[i], this.ps))
  }
  //
  this.releaseDicts = [];
  var releases = [];
  for (i = 0; i < this.fqs.length; i++) {
    let row = this.fqs[i].releaseInfo();
    let name = row["release"];
    if (!releases.includes(name)) {
      this.releaseDicts.push(row);
      releases.push(name)
    }
  }
  //
  
}

FredDataTable.prototype.addDateRange = function(dateN, dateType) {
  //
  var latest = this.releaseDicts[0]["seriesInfo"][0]["lastDate"];
  //
  var daterange = new DateRange(latest, dateN, dateType);
  var startEnd = daterange.range();
  this.ps["start"] = startEnd["start"];
  this.ps["end"] = startEnd["end"];
}

// get date and value arrays of series
FredDataTable.prototype.getData = function() {
  var valueArrays = [];
  for (var i = 0; i < this.seriesIds.length; i++) {
    var fq = new FredQuery(this.seriesIds[i], this.ps);
    var results = fq.run();
    if (i === 0) {
      valueArrays.push(results[0])
    }
    valueArrays.push(results[1])
  }
  // this.releases = releases;
  return valueArrays
}

// write table with headers to spreadsheet
FredDataTable.prototype.writeTable = function(sheet, startRow, startCol) {
  var headerRow = sheet.getRange(startRow, startCol, 1, this.seriesNames.length+1);
  headerRow.setValues([["Date"].concat(this.seriesNames)]);
  headerRow.setFontWeight("bold")
           .setFontColor("#ffffff")
           .setBackground("#5db7de");
  var data = this.getData();
  var col = startCol;
  for (var i = 0; i < data.length; i++) {
    let range = sheet.getRange(startRow + 1, col, data[0].length);
    let colData = []
    for (var x = 0; x < data[i].length; x++) {
      colData.push([data[i][x]])
    }
    // Logger.log(range.getA1Notation())
    range.setValues(colData);
    col++;
  }
  for (var i = 0; i < this.seriesIds.length + 1; i++) {
    if (i === 0) {
      sheet.setColumnWidth(1, 75)
    }
    else {
      sheet.setColumnWidth(i + 1, 150);
      sheet.getRange(startRow, i + 1, 1, 1).setWrap(true);
    }
  }
} 

FredDataTable.prototype.releaseInfo = function() {
  if (this.releases) {
    return this.releases
  } else {
    this.getData();
    return this.releases
  }
}

FredDataTable.prototype.writeReleaseTable = function(sheet, startRow, startCol) {
  var richValue = SpreadsheetApp.newRichTextValue()
   .setText(this.releaseDicts[0]["release"])
   .setLinkUrl(this.releaseDicts[0]["releaseLink"])
   .build();
  var headerRow = sheet.getRange(startRow, startCol, 1, 1);
  headerRow.setValue("Release:");
  headerRow = sheet.getRange(startRow, startCol + 1, 1, 1);
  headerRow.setRichTextValue(richValue);
  headerRow = sheet.getRange(startRow, startCol, 1, 6);
  headerRow.setFontWeight("bold")
           .setFontColor("#ffffff")
           .setBackground("#7d1725")
           .setBorder(
              true, true, true, true, null, null,
              null,
              SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sheet.getRange(startRow, startCol + 1, 1, 5).mergeAcross();
  // sheet.getRange(startRow + 1, startCol + 1, 1, 1).setNumberFormat("mmm d, yyyy");
  // sheet.getRange(startRow + 1, startCol + 3, 1, 1).setNumberFormat("mmm d, yyyy");
  sheet.setColumnWidth(startCol, 300);
  sheet.setColumnWidth(startCol + 1, 200);
  var releaseDate = sheet.getRange(startRow + 1, startCol, 1, 4);
  releaseDate.setValues([[`Updated: ${Utilities.formatDate(makeDate(this.releaseDicts[0]["updated"].substring(0,10)), "America/New_York","MMM d, yyyy")}`, 
                        `Next Release: ${Utilities.formatDate(makeDate(this.releaseDicts[0]["next"]), "America/New_York", "MMM d, yyyy")}`,
                        "Sources:", this.releaseDicts[0]["sources"].join(", ")]]);
  releaseDate.setFontWeight("bold");
  sheet.getRange(startRow + 1, startCol + 3, 1, 3).mergeAcross();
  sheet.getRange(startRow + 1, startCol + 3, 1, 1).setWrap(true);
  var data = this.releaseDicts[0]["seriesInfo"];
  let seriesHeaders = [["Series", "Units", "Frequency", "Adjusted", "Earliest", "Latest"]];
  let sh = sheet.getRange(startRow + 2, startCol, 1, 6);
  sh.setValues(seriesHeaders);
  sh.setFontWeight("bold");
  for (var i = 0; i < data.length; i++) {
    let row = [[data[i]["name"], data[i]["units"], data[i]["seriesFrequency"], data[i]["adjusted"], data[i]["firstDate"], data[i]["lastDate"]]];
    let range = sheet.getRange(startRow + i + 3, startCol, 1, 6);
    range.setValues(row);
    sheet.getRange(startRow + i + 3, startCol, 1, 1).setWrap(true);
    sheet.getRange(startRow + i + 3, startCol + 4, 1, 2).setNumberFormat("mmm d, yyyy");
  }  
}

//*****************s*************************//
// class for creating date strings for start and end parameters
function DateRange(mostRecent, dateN, dateType) {
  this.mostRecent = mostRecent;
  this.dateN = dateN;
  this.dateType = dateType;
}

// Create start and end date strings
// Returns two YYYY-MM-DD strings
// dateType options: 'year', 'month', 'day'
DateRange.prototype.range = function() {
  if (this.dateType === 'year') {
      return {start: this.nYears(this.mostRecent, this.dateN), end: this.mostRecent}
  } else if (this.dateType === 'month') {
      return {start: this.nMonths(this.mostRecent, this.dateN), end: this.mostRecent}
  } else if (this.dateType === 'day') {
      return {start: this.nDays(this.mostRecent, this.dateN), end: this.mostRecent}
  }
  else return 
}

// Returns date n years before latest
// Returns date as YYYY-MM-DD string
DateRange.prototype.nYears = function() {
  var year = this.mostRecent.substring(0, 4);
  var month = this.mostRecent.substring(5, 7);
  var day = this.mostRecent.substring(8, 10);
  var newYear = parseInt(year) - this.dateN;
  return newYear.toString() + "-" + month + "-" + day
}

// Returns date n months before latest
// Returns date as YYYY-MM-DD string
DateRange.prototype.nMonths = function() { 
  var year = this.mostRecent.substring(0, 4);
  var month = this.mostRecent.substring(5, 7);
  var day = this.mostRecent.substring(8, 10);
  var newYear = parseInt(year);
  var newMonth = parseInt(month);
  let n = this.dateN;
  // Start with years
  if (n % 12 === 0) {
      return this.nYears(latest, n / 12)
  };
  if (n > 12) {
      var years = Math.floor(n / 12);
      newYear = newYear - years
      n = n - years * 12;
  }
  // Handle months
  newMonth = newMonth - n;
  if (newMonth === 0) {
      newMonth = 12;
      newYear = newMonth - 1
  }; 
  if (newMonth < 0) {
      newMonth = 12 + newMonth;
      newYear = newYear - 1
  };
  newMonth = newMonth.toString().padStart(2, "0");
  newYear = newYear.toString();
  return newYear + "-" + newMonth + "-" + day
}

// Returns date n days before latest
// Returns date as YYYY-MM-DD string
DateRange.prototype.nDays = function() {
  var year = this.mostRecent.substring(0, 4);
  var month = this.mostRecent.substring(5, 7);
  var day = this.mostRecent.substring(8, 10);
  var latestDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  latestDate.setDate(latestDate.getDate() - this.dateN);
  var newDate = latestDate.toLocaleDateString();
  return newDate.split("/")[2] + "-" + newDate.split("/")[0].padStart(2, "0") + "-" + newDate.split("/")[1].padStart(2, "0")
}

///// FredQuery tests
// let tst = new FredQuery("EOWNOCCUSQ176N", {start:"2023-01-01", end:"2023-07-01"});
// Logger.log(tst.run())
// Logger.log(tst.releaseInfo())

// let tst2 = new FredQuery("EOWNOCCUSQ176N", {units: "pc1", start:"2023-01-01", end:"2023-07-01"});
// Logger.log(tst2.run())

// let tst3 = new FredQuery("EOWNOCCUSQ176N", {});
// Logger.log(tst3.releaseDates())

// let tst4 = new FredQuery("EOWNOCCUSQ176N", {});
// Logger.log(tst4.releaseSource())

// let wdr = new FredQuery("EOWNOCCUSQ176N", {});
// wdr.addDateRange(2, "year");
// Logger.log(wdr.run())

// let rinfo = new FredQuery("EOWNOCCUSQ176N", {});
// Logger.log(rinfo.releaseInfo())

///// FredRelease tests
// let rls = new FredRelease(291, "this", "this.com");
// let rls = new FredRelease(27, "this", "this.com");
// Logger.log(rls.releaseInfo())
// Logger.log(rls.seriesInfo())
// Logger.log(rls.source())
// Logger.log(rls.releaseInfo(["PERMIT1", "PERMIT24", "PERMIT5", "PERMIT"]))
// Logger.log(rls.releaseInfo())

// let rls2 = new FredQuery("PERMIT1", {});
// rls2.addDateRange(1, "year");
// Logger.log(rls2.releaseInfo())

///// FredDataTable tests
// let tst5 = new FredDataTable(["EOWNOCCUSQ176N", "EOWNOCCMWQ176N"], ["U.S. Owner Occupied", "Midwest Owner Occupied"], {units:"pc1", start:"2023-01-01"});
// var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Example");
// tst5.writeTable(sheet, 1, 1);
// tst5.writeReleaseTable(sheet, 1, 5)

// let dtwithdr = new FredDataTable(["EOWNOCCUSQ176N"], ["U.S. Owner Occupied"], {units: "chg"});
// var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Example");
// dtwithdr.addDateRange(2, "year");
// Logger.log(dtwithdr.getData())
// dtwithdr.writeTable(sheet, 1, 5);
// dtwithdr.writeReleaseTable(sheet, 1, 12)

// let tst7 = new FredDataTable(["EOWNOCCUSQ176N", "EOWNOCCMWQ176N"], ["U.S. Owner Occupied", "Midwest Owner Occupied"], {units:"pc1", start:"2023-01-01"});
// Logger.log(tst7.releaseInfo())

///// DateRange tests
// let dr = new DateRange("2023-12-01", 5, "year");
// Logger.log(dr.range());
// dr = new DateRange("2023-12-01", 13, "month");
// Logger.log(dr.range());
// dr = new DateRange("2023-12-01", 10, "day");
// Logger.log(dr.range())

