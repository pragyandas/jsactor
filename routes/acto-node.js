"use strict"

var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require("mongoose");
var port = process.env.PORT || 1337;
var Context = require('../utilities/context.js');
var logger = require('../utilities/logger.js').systemLogger;
var Actor = require('../lib/actor.js');
var genMap = require('../lib/generator-mapper.js');
var _map = {};
var actorMap = require('../utilities/actor-mapper.js');
var app = express();
var faultInfo = require('../utilities/fault-line.js');
var io = require('socket.io-client'),

//connect to dispatcher, pass port as parameter (query is the predefined key to pass parameter in socket.io)
socket = io.connect('http://localhost:3000',{'query': 'port=' + port});

//listen to any even if any node got disconnected from node ring 
socket.on('event', function(data){
	//push to subject so that all actor subscribing this can know about any event on node ring
	faultInfo.onNext(data);
});

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

//remove a actor in case an actor is terminated
function removeActorFromMap(actorId){
	delete _map[actorId];
}

//yet to implement
app.get('/Actor/:id', function(req,res){
	res.send('TO DO: do something')
	return;
});

/**
 * /Actor is express route to accept a message from dispatcher, no one else talk to acto-node
 * req.body comes as 
 * {id:<id of target actor>, msg: <object>}
 */
app.post('/Actor', function(req, res){
	var pkg = req.body;
	var msg = pkg.msg;
	var actorId = req.body.id;
	var parentId = msg && msg.child_context ? msg.child_context.parentSupervisorId : null;

	var aMap = {}
	if(parentId){
		aMap.id = actorId;
		aMap.parentId = parentId;
		aMap.node = { 'node': req.get('host').split(":")[0], 'port': port } ;
		actorMap.onNext(aMap);
	}

	if(msg && msg.child_context){	// child_context present means the actor needs to be created
		//TO DO: need to check if actor exists and child_context came by mistake
		msg.child_context = new Context(msg.child_context.id, msg.child_context.type,parentId);
		var generator = genMap(msg.child_context.type);
        var actor = new Actor(generator,msg.child_context);
		_map[actorId] = actor;
        actor.receive(msg);
    }else{	//no child_context, hense actor already exists
        _map[actorId] && _map[actorId].receive(msg);
    }
    return res.end();
	
});


app.listen(port, function () {
  console.log('listening on port ' + port);
});