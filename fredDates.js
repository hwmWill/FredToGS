const apiKey = "900a9664571c53f38f7d9da40d372f07"
const bySeries = "https://api.stlouisfed.org/fred/series/observations?series_id="

// Create start and end date strings
// Returns two YYYY-MM-DD strings
// dateType options: 'year', 'month', 'day'
function dateWindow(seriesId, dateN, dateType) {
  var latest = latestDataDate(seriesId);
  var latestStr = latest.substring(0, 4) + "-" + latest.substring(5, 7) + "-" + latest.substring(8, 10);
  if (dateType === 'year') {
      return [nYears(latest, dateN), latestStr]
  } else if (dateType === 'month') {
      return [nMonths(latest, dateN), latestStr]
  } else if (dateType === 'day') {
      return [nDays(latest, dateN), latestStr]
  }
  else return 
}

// Gets date of most recent data point
// Used to create start date for date window of # years or # months
// Returns date as YYYY-MM-DD string
function latestDataDate(seriesId) {
  var data = getLatest(seriesId);
  return data.observations[0].date;
}

// Returns date n years before latest
// Returns date as YYYY-MM-DD string
function nYears(latest, n) {
  var year = latest.substring(0, 4);
  var month = latest.substring(5, 7);
  var day = latest.substring(8, 10);
  var newYear = parseInt(year) - n;
  return newYear.toString() + "-" + month + "-" + day
}

// Returns date n months before latest
// Returns date as YYYY-MM-DD string
function nMonths(latest, n) { 
  var year = latest.substring(0, 4);
  var month = latest.substring(5, 7);
  var day = latest.substring(8, 10);
  var newYear = parseInt(year);
  var newMonth = parseInt(month);
  // Start with years
  if (n % 12 === 0) {
      return nYears(latest, n / 12)
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
function nDays(latest, n) {
  var year = latest.substring(0, 4);
  var month = latest.substring(5, 7);
  var day = latest.substring(8, 10);
  var latestDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  latestDate.setDate(latestDate.getDate() - n);
  var newDate = latestDate.toLocaleDateString();
  return newDate.split("/")[2] + "-" + newDate.split("/")[0].padStart(2, "0") + "-" + newDate.split("/")[1].padStart(2, "0")
}