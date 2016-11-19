var mongoose = require("mongoose");

module.exports = function cleanDb(cb) {

	mongoose.connection.db.listCollections({
			name: 'accounts'
		})
		.next(function (err, account) {
			if (account) {
				mongoose.connection.db.dropCollection('accounts', function (err, result) {
					if (err) throw err;
					console.log("account dropped successfully");
					cb();
				});
			} else {
				cb();
			}
		});
		mongoose.connection.db.listCollections({
			name: 'accountbalances'
		})
		.next(function (err, accountBalance) {
			if (accountBalance) {
				mongoose.connection.db.dropCollection('accountbalances', function (err, result) {
					if (err) throw err;
					console.log("account balance dropped successfully");
					cb();
				});
			} else {
				cb();
			}
		});
}