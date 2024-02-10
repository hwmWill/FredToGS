const apiKey = "900a9664571c53f38f7d9da40d372f07"
const bySeries = "https://api.stlouisfed.org/fred/series/observations?series_id="

// Get most recent data for series
// Return json
function getLatest(seriesId) {
  // FRED api fetch endpoint
  var url = bySeries + seriesId 
            + "&sort_order=" + "desc"
            + "&limit=" + "1"
            + "&api_key=" + apiKey
            + "&file_type=" + "json";
  // fetch data
  var response = UrlFetchApp.fetch(url, {'muteHttpExceptions': true});
  var json = response.getContentText();
  return JSON.parse(json);
}

// Gets data from FRED for seriesID and number of years
// Optional: gets dates for data over specified period if withDates is True
function getData(seriesId, years, withDates) {
    // date of most recent data
    var latest = latestDataDate(seriesId);
    // start date for date window
    var start_date = nYears(latest, years);
    var url = bySeries + seriesId 
              + "&observation_start=" + start_date
              + "&observation_end=" + "9999-12-31" 
              + "&api_key=" + apiKey
              + "&file_type=json";
    var response = UrlFetchApp.fetch(url, {'muteHttpExceptions': true});
    var json = response.getContentText();
    var data = JSON.parse(json);
    var observations = data['observations'];
    var series = [];
    for (var i = 0; i < observations.length; i++) {
      series.push(parseFloat(observations[i].value));
    };
    if (withDates) {
      dates = [];
      for (var i = 0; i < observations.length; i++) {
        var dateStr = observations[i].date;
        var year = dateStr.substring(0, 4);
        var month = dateStr.substring(5, 7);
        var day = dateStr.substring(8, 10);
        var date = new Date(year, month - 1, day, 1);
        dates.push(date);
      };
      return [dates, series]
    }
    else {
      return series
    }
  }