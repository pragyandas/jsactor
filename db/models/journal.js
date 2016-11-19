var mongoose = require("mongoose");

var Schema = mongoose.Schema;

// create a schema
var journalSchema = new Schema({
	msg: Object,
    actorId: String,
    timestamp: Number
});

// the schema is useless so far
// we need to create a model using it
var journal = mongoose.model('journal', journalSchema);

module.exports = journal;