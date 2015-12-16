/**
 * Created by aditya on 12/14/15.
 */

var request = require('request'),
		fs  = require('fs'),
		htmlparser = require('htmlparser2'),
		CLASS_NAMES = require('./ScraperConstants').CLASS_NAMES;


function MatrixScraper() {
	var searchInfo = JSON.parse(fs.readFileSync('FlightSearchInfo.json', 'utf8'));
	var baseUrl = searchInfo.base_url;
	this._splashUrl = searchInfo.splash_url;
	//Construct search url
	this._searchUrl = baseUrl.concat("f=", searchInfo.source, ";", "t=", searchInfo.dest, ";", "d=", searchInfo.start_date, ";", "r=", searchInfo.to_date);
	this._dateAndPrices = {};
}

MatrixScraper.prototype.searchFlights = function () {
	var queryData = {url: this._searchUrl, images: 0, wait: 5, timeout: 60};
	var dateAndPrices = this._dateAndPrices;
	var isDate, isPrice, isMonth;
	//Left hand and right hand months
	var lhsMonth, rhsMonth, currentMonth;
	//The current date we are working with
	var currentDate;

	return request.get({url: this._splashUrl, qs: queryData}, (function (resp, body) {
		var parser = new htmlparser.Parser({
			onopentag: function (name, attribs) {
				var className = attribs["class"];

				if (name === "table") {
					if (className.indexOf(CLASS_NAMES.LHS_TABLE.name) != -1) {
						currentMonth = lhsMonth;
					} else if (className.indexOf(CLASS_NAMES.RHS_TABLE.name) != -1) {
						currentMonth = rhsMonth;
					}
				}
				if (name === "div" && "class" in attribs) {
					if (className.indexOf(CLASS_NAMES.FARE_VALUE.name) != -1) {
						isPrice = true;
					} else if (className.indexOf(CLASS_NAMES.DAY_VALUE.name) != -1) {
						isDate = true;
					} else if (className.indexOf(CLASS_NAMES.MONTH_VALUE.name) != -1) {
						isMonth = true;
					}
				}
			},
			ontext: function (text) {
				if (isMonth) {
					if (lhsMonth === undefined) {
						lhsMonth = text;
					} else {
						rhsMonth = text;
					}
					isMonth = false;
				}
				if (isPrice) {
					//Set the price for current date
					dateAndPrices[currentDate] = text;
					isPrice = false;
				} else if (isDate) {
					currentDate = text.concat(" ", currentMonth);
					isDate = false;
				}
			}
		}, {decodeEntities: false});
		parser.write(body.body);
		parser.end();
		console.log("Date And prices " + JSON.stringify(dateAndPrices));
	}));
};

new MatrixScraper().searchFlights();