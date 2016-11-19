var mongoose = require("mongoose");

var Schema = mongoose.Schema;

// create a schema
var actorMapSchema = new Schema({
	id: String,
    parentId: String,
    node: Object
});

// the schema is useless so far
// we need to create a model using it
var actorMap = mongoose.model('actorMap', actorMapSchema);

module.exports = actorMap;