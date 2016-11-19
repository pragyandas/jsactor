var mongoose = require("mongoose");

var Schema = mongoose.Schema;

// create a schema
var accountSchema = new Schema({
	accountNo: Number,
    name: String
});

// the schema is useless so far
// we need to create a model using it
var account = mongoose.model('account', accountSchema);

module.exports = account;