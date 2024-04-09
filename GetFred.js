/** Fetches data from endpoint and returns json results.
 * @paramater {string} Endpoint url.
*/
function cleanQuery(endpoint) {
    let response = UrlFetchApp.fetch(endpoint, { 'muteHttpExceptions': true });
    let json = response.getContentText();
    let data = JSON.parse(json);
    return data
}

/** Converts YYYY-MM-DD string to Date instance. 
 * @parameter {string} YYYY-MM-DD string.
 * @returns {Object} Date.
*/
function makeDate(dateStr) {
    var year = dateStr.substring(0, 4);
    var month = dateStr.substring(5, 7);
    var day = dateStr.substring(8, 10);
    return new Date(year, month - 1, day, 12, 0, 0, 0)
    // return new Date(year, month - 1, day, 1)
}

const api_key = "";

/**
* Represents a start date and end date represented as strings in YYYY-MM-DD format.
* @constructor
* @param {string} most_recent - A date to count backwards from in YYYY-MM-DD format.
* @param {number} date_n - The number of units to count backwards.
* @param {string} date_type - The type of units used to count backwards. Allowable are "year", "month", and "day".
*/
function DateRange(most_recent, date_n, date_type) {
    this.most_recent = most_recent;
    this.date_n = date_n;
    this.date_type = date_type;
}

/** Returns start date date_n years before most_recent. 
 * @returns {string}
*/
DateRange.prototype.nYears = function () {
    var year = this.most_recent.substring(0, 4);
    var month = this.most_recent.substring(5, 7);
    var day = this.most_recent.substring(8, 10);
    var newYear = parseInt(year) - this.date_n;
    return newYear.toString() + "-" + month + "-" + day
}

/** Returns start date date_n months before most_recent. 
 * * @returns {string}
*/
DateRange.prototype.nMonths = function () {
    var year = this.most_recent.substring(0, 4);
    var month = this.most_recent.substring(5, 7);
    var day = this.most_recent.substring(8, 10);
    var newYear = parseInt(year);
    var newMonth = parseInt(month);
    let n = this.date_n;
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

/** Returns start date date_n days before most_recent. 
 * * @returns {string}
*/
DateRange.prototype.nDays = function () {
    var year = this.most_recent.substring(0, 4);
    var month = this.most_recent.substring(5, 7);
    var day = this.most_recent.substring(8, 10);
    var latestDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    latestDate.setDate(latestDate.getDate() - this.date_n);
    var newDate = latestDate.toLocaleDateString();
    return newDate.split("/")[2] + "-" + newDate.split("/")[0].padStart(2, "0") + "-" + newDate.split("/")[1].padStart(2, "0")
}

/** Generates start date and end date strings.
 * * @returns {object} {start: YYYY-MM-DD, end: YYYY-MM-DD}
*/
DateRange.prototype.range = function () {
    if (this.date_type === 'year') {
        return { start: this.nYears(this.most_recent, this.date_n), end: this.most_recent }
    } else if (this.date_type === 'month') {
        return { start: this.nMonths(this.most_recent, this.date_n), end: this.most_recent }
    } else if (this.date_type === 'day') {
        return { start: this.nDays(this.most_recent, this.date_n), end: this.most_recent }
    }
    else return
}

/**
* Represents a request for data over the FRED API. Initializes with default query parameters.
* @constructor.
* 
* Properties can be accessed and set after object initalization.
*  - units - The units requested. Default is "lin." Allowable are "lin" (as is), "chg" (change), "ch1" (change from year ago), "pch" (percent change), "pc1" (percent change from year ago), "pca" (compounded annual rate of change), "cch" (continuously compounded rate of change), "cca" (continuously compounded annual rate of change), and "log" (natural log).
* - start - Start date in YYYY-MM-DD format. Default is "1776-07-04".
* - end - End date in YYYY-MM-DD format. Default is "9999-12-31".
* - frequency - Timespan over which to aggregate date. Default is none (""). Allowable are "", "d" (daily), "w" (weekly), "bw" (biweekly), "m" (monthly), "q" (quarterly), "sa" (semiannually), "a" (annually), "wef" (weekly ending Friday), "weth" (weekly ending Thursday), "wew" (weekly ending Wednesday), "wetu" (weekly ending Tuesday), "wem" (weekly ending Monday), "wesu" (weekly ending Sunday), "wesa" (weekly ending Saturday), "bwew" (biweekly ending Wednesday), and "bwem" (biweekly ending Monday).
* - agg_method - Method of aggregation used if a frequency is specified. Allowable are "avg" (average), "sum" (sum), and "eop" (end of period).
* - sort_order - Sort ascending or descending by observation_date order. Default is "asc". Allowable are "asc" (ascending) or "desc" (descending). 
* @param {string} series_id - The code used by FRED to identify a unique dataset.
*/
function FredQuery(series_id) {
    this.series_id = series_id;
    this.units = "lin";
    this.start = "1776-07-04";
    this.end = "9999-12-31";
    this.frequency = "";
    this.agg_method = "avg";
    this.sort_order = "asc";
}

/** Sets start and date query parameters based on desired timespan. 
 * @paramater {DateRange} date_range
*/
FredQuery.prototype.setDateRange = function (date_range) {
    let r = date_range.range();
    this.start = r["start"];
    this.end = r["end"]
}

/** Creates url from parameters to be used in fetch request.*/
FredQuery.prototype.setEndpoint = function () {
    this.endpoint = `https://api.stlouisfed.org/fred/series/observations?series_id=${this.series_id}&units=${this.units}&observation_start=${this.start}&observation_end=${this.end}&frequency=${this.frequency}&aggregation_method=${this.agg_method}&sort_order=${this.sort_order}&api_key=${api_key}&file_type=json`
}

/** Fetches max observation date.*/
FredQuery.prototype.maxDate = function () {
    var endpoint = `https://api.stlouisfed.org/fred/series/observations?series_id=${this.series_id}&sort_order=desc&api_key=${api_key}&limit=1&file_type=json`;
    var data = cleanQuery(endpoint);
    return data["observations"][0]["date"]
}

/** Runs query, retrieves observations and dates and returns data as array of arrays.
 * @returns {array} [array of dates, array of values]
*/
FredQuery.prototype.getResults = function () {
    this.setEndpoint();
    let data = cleanQuery(this.endpoint);
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

/** Runs fetch query to get series' release ID from FRED API.
 * @returns {object} {release_id: [release_name, release_link]}
 */
FredQuery.prototype.releaseId = function () {
    let endpoint = `https://api.stlouisfed.org/fred/series/release?series_id=${this.series_id}&api_key=${api_key}&file_type=json`;
    let data = cleanQuery(endpoint);
    // limit results data to name and id
    let release = data["releases"][0];
    let release_name = release["name"];
    let release_link = release["link"];
    let release_id = release["id"];
    let r = {};
    r[release_id] = [release_name, release_link];
    return r
}

/**
 * Represents a request for release information over the FRED API.
 * @constructor
 * @param {object} release_object - {release_id: [release_name, release_link]}
 */
function FredRelease(release_object) {
    if (release_object) {
        this.release_id = Object.keys(release_object)[0];
        this.release_name = release_object[this.release_id][0];
        this.release_link = release_object[this.release_id][1];
    }
}

/** Fetches series that are included in release. Sets series_info and observation_end properties.
*/
FredRelease.prototype.getSeries = function () {
    var endpoint = `https://api.stlouisfed.org/fred/release/series?release_id=${this.release_id}&api_key=${api_key}&file_type=json`;
    var data = cleanQuery(endpoint);
    this.series_info = data["seriess"];
    this.observation_end = this.series_info[0]["observation_end"];
}

/** Fetches source(s) of data in release. Sets sources property. 
*/
FredRelease.prototype.getSources = function () {
    var data = cleanQuery(`https://api.stlouisfed.org/fred/release/sources?release_id=${this.release_id}&api_key=${api_key}&file_type=json`);
    var srcs = data["sources"];
    var sources = [];
    for (var i = 0; i < srcs.length; i++) {
        sources.push(srcs[i]["name"])
    }
    this.sources = sources
}

/** Fetches date of next release publication. Sets next_date property. 
*/
FredRelease.prototype.getNextRelease = function () {
    var endUrl = `https://api.stlouisfed.org/fred/release/dates?release_id=${this.release_id}&include_release_dates_with_no_data=true&sort_order=desc&api_key=${api_key}&file_type=json`;
    data = cleanQuery(endUrl);
    let releases = data["release_dates"];
    var now = new Date();
    releases = releases.filter((element) => new Date(element["date"].substring(0, 4), element["date"].substring(5, 7) - 1, element["date"].substring(8, 10)) >= now);
    var release_dates = [];
    for (var i = 0; i < releases.length; i++) {
        release_dates.push(releases[i]["date"])
    }
    release_dates.reverse();
    try {
        this.next_date = makeDate(release_dates[0])
    }
    catch {
        var d = new Date();
        d.setDate(d.getDate() + 1);
        d = d.toLocaleDateString();
        d = d.split("/")[2] + "-" + d.split("/")[0].padStart(2, "0") + "-" + d.split("/")[1].padStart(2, "0");
        var y = d.substring(0, 4);
        endUrl = `https://fred.stlouisfed.org/releases/calendar?rid=${this.release_id}&vs=${d}&ve=${y}-12-31&rdc=1`;
        this.next_date = makeDate(cleanQuery(endUrl)["events"][0]["start"])
    }
}


/** Runs getSeries, getSources, and getNextRelease methods to set series_info, observation_end, sources, and next_date properties. 
*/
FredRelease.prototype.setReleaseInfo = function () {
    this.getSeries();
    this.getSources();
    this.getNextRelease();
}


/**
 * A constructor of multiple FredQuery objects.
 * @constructor
 * @param {array} series_ids - Array of series identifiers from FRED.
 */
function MultiQuery(series_ids) {
    if (series_ids) {
        this.series_ids = series_ids;
        this.queries = [];
        for (var i = 0; i < series_ids.length; i++) {
            this.queries.push(new FredQuery(series_ids[i]))
        }
        this.releases = [];
    }
}

/** Fetches max observation date of series IDs.
 */
MultiQuery.prototype.maxDate = function () {
    var dates = [];
    for (var i = 0; i < this.queries.length; i++) {
        dates.push(this.queries[i].maxDate())
    }
    return dates.reduce((max, c) => c > max ? c : max)
}

/** Sets start and date query parameters based on desired timespan. 
 * @paramater {DateRange} date_range
*/
MultiQuery.prototype.setDateRange = function (date_range) {
    for (var i = 0; i < this.queries.length; i++) {
        this.queries[i].setDateRange(date_range)
    }
}

/** Runs queries, retrieves observations and dates and returns data as array of arrays.
 * @returns {array} [array of dates, array of values]
*/
MultiQuery.prototype.getResults = function () {
    var first_results = this.queries[0].getResults();
    var combined = [first_results[0], first_results[1]];
    for (var i = 1; i < this.queries.length; i++) {
        combined.push(this.queries[i].getResults()[1])
    }
    return combined
}

/** Runs fetch query to get series' release IDs from FRED API.
 * @returns {object} {release_id: [release_name, release_link]}
 */
MultiQuery.prototype.getReleases = function () {
    let release_dict = {};
    for (var i = 0; i < this.queries.length; i++) {
        let release = this.queries[i].releaseId();
        release_dict[Object.keys(release)[0]] = release[Object.keys(release)[0]]
    }
    for (const [key, value] of Object.entries(release_dict)) {
        let obj = {};
        obj[key] = value;
        this.releases.push(new FredRelease(obj))
    }
}

/** Gets release details for each release and filters out series_info information for series IDs that are not in series_ids property.
 * @returns {array} 
 */
MultiQuery.prototype.releasesInfo = function () {
    if (this.releases.length == 0) {
        this.getReleases()
    }
    for (let fr of this.releases) {
        fr.setReleaseInfo();
        fr["series_info"] = fr["series_info"].filter((element) => this.series_ids.includes(element["id"]))
    }
    return this.releases
}

/**
 * Represents a table of FRED API query results to be written to a Google Sheet.
 * @constructor
 * @param {object} multi_query - MultiQuery object.
 */
function TableMaker(multi_query) {
    if (multi_query) {
        this.multi_query = multi_query
    }
}

/** Runs multi_query.getResults method and configures table to be able to write to Google Sheets.
 * @param {array=} headers - Array of header names. Empty array makes table headless. Date is automatically added at front of non-empty array.
*/
TableMaker.prototype.resultsTable = function (headers = []) {
    var data = this.multi_query.getResults();
    // convert to vertical
    var vertical = [];
    for (var i = 0; i < data[0].length; i++) {
        let row = [];
        for (var j = 0; j < data.length; j++) {
            row.push(data[j][i])
        };
        vertical.push(row)
    }
    if (headers.length > 0) {
        var col_headers = ["Date"].concat(headers);
        // data = [col_headers].concat(vertical)
        vertical = [col_headers].concat(vertical)
    }
    return vertical
}

/** Writes results table to Google Sheets.
 * @param {array} data - Result of resultsTable method execution. 
 * @param {object} sheet - Sheet object.
 * @param {number} start_row - Row for top of table.
 * @param {number} start_column - Column for left of table.
*/
TableMaker.prototype.writeResults = function (data, sheet, start_row, start_column) {
    var numrows = data.length;
    var numcolumns = data[0].length;
    var r = sheet.getRange(start_row, start_column, numrows, numcolumns);
    r.setValues(data)
}

/** Runs multi_query.releasesInfo method and configures table to be able to write to Google Sheets.
*/
TableMaker.prototype.releasesTable = function () {
    var ri = this.multi_query.releasesInfo();
    var releaseTables = []
    for (let release of ri) {
        let row1 = [[`Release: ${release["release_name"]}`]];
        let updated = release["series_info"][0]["last_updated"];
        let row2 = [[`Updated: ${updated.substring(5, 7)}/${updated.substring(8, 10)}/${updated.substring(0, 4)}`,
        `Next: ${Utilities.formatDate(release["next_date"], "America/New_York", "MM/dd/yyyy")}`,
        `Sources: ${release["sources"].join(", ")}`]];
        let row3 = [["Series", "Units", "Frequency", "Adjustment", "Earliest", "Latest"]];
        let series_rows = [];
        for (let series of release["series_info"]) {
            series_rows.push(
                [series["title"], series["units_short"], series["frequency"], series["seasonal_adjustment"], Utilities.formatDate(makeDate(series["observation_start"]), "America/New_York", "MM/dd/yyyy"), Utilities.formatDate(makeDate(series["observation_end"]), "America/New_York", "MM/dd/yyyy")]
            )
        }
        let tableObj = {
            row1: row1,
            row2: row2,
            row3: row3,
            series_rows: series_rows
        }
        releaseTables.push(tableObj)
    }
    return releaseTables
}

/** Writes releases tables to Google Sheets.
 * @param {object} sheet - Sheet object.
 * @param {number} start_row - Row for top of table.
 * @param {number} start_column - Column for left of table.
*/
TableMaker.prototype.writeReleases = function (sheet, start_row, start_column) {
    var rt = this.releasesTable();
    for (var i = 0; i < rt.length; i++) {
        let tab = rt[i];
        // row 1
        let r = sheet.getRange(start_row + (i * (3 + tab["series_rows"].length)), start_column);
        r.setValues(tab["row1"]);
        sheet.getRange(start_row + (i * (3 + tab["series_rows"].length)), start_column, 1, 6)
            .mergeAcross()
            .setHorizontalAlignment("center")
            .setFontWeight("bold");
        // row 2
        r = sheet.getRange(start_row + 1 + (i * (3 + tab["series_rows"].length)), start_column);
        r.setValue(tab["row2"][0][2]);
        sheet.getRange(start_row + 1 + (i * (3 + tab["series_rows"].length)), start_column, 1, 4)
            .mergeAcross()
            .setFontWeight("bold")
            .setWrap(true);
        r = sheet.getRange(start_row + 1 + (i * (3 + tab["series_rows"].length)), start_column + 4, 1, 2);
        let row2 = tab["row2"][0];
        row2.pop();
        r.setValues([row2])
            .setFontWeight("bold");
        sheet.setColumnWidth(start_column + 4, 150);
        sheet.setColumnWidth(start_column + 5, 150);
        //row 3
        r = sheet.getRange(start_row + 2 + (i * (3 + tab["series_rows"].length)), start_column, 1, 6);
        r.setValues(tab["row3"])
            .setFontWeight("bold");
        // series rows
        var numrows = tab["series_rows"].length;
        var numcolumns = 6;
        r = sheet.getRange(start_row + 3 + (i * (3 + tab["series_rows"].length)), start_column, numrows, numcolumns);
        r.setValues(tab["series_rows"])
            .setWrap(true);
        sheet.setColumnWidth(start_column, 300)
    }
}

