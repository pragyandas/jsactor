var mongoose = require("mongoose");

var Schema = mongoose.Schema;

// create a schema
var accountBalanceSchema = new Schema({
	"accountNo": String,
    "amount": Number
});

// the schema is useless so far
// we need to create a model using it
var accountBalance = mongoose.model('accountBalance', accountBalanceSchema);

module.exports = accountBalance;