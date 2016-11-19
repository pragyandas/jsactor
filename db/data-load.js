var fs = require("fs");
var async = require("async");
var account = require('./models/account.js');
var accountBalance = require('./models/account-balance.js');
var mongoose = require("mongoose");
var dbClean = require('./db-clean');

var accountData = JSON.parse(fs.readFileSync('./data/accounts.json', 'utf8'));
var accountBalanceData = JSON.parse(fs.readFileSync('./data/account-balance.json', 'utf8'));

mongoose.connect('mongodb://127.0.0.1:27017/storedb', function (err) {
	if (err) {
		throw err;
	}

	dbClean(function () {
		async.each(accountData, function (item, cb) {
			account.create(item, cb);
		}, function (err) {
			if (err) {}
			console.log("account data loaded successfully");
			async.each(accountBalanceData, function (item, cb) {
				accountBalance.create(item, cb);
				}, function (err) {
					if (err) {}
					console.log("account balance data loaded successfully");
					mongoose.disconnect();
				});
		});
		
	});
});