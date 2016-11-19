var mongoose = require("mongoose");

var Schema = mongoose.Schema;

// create a schema
var rogueMessageSchema = new Schema({
	messages: {
		type: Array,
		"default": []
	},
	actorId: String
});

// the schema is useless so far
// we need to create a model using it
var rogueMessage = mongoose.model('rogueMessage', rogueMessageSchema);

module.exports = rogueMessage;