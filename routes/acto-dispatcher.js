"use strict"

var HashRing = require('hashring');
var nodeCount = 0;
var express = require('express');
var bodyParser = require('body-parser');
var rest = require('restler');
var Context = require('../utilities/context.js');
var Journal = require('../utilities/journal.js');
var journal = new Journal();
var config = require('../config.json');
var logger = require('../utilities/logger.js').systemLogger;
var port = config.dispatcherPort || 3000;
var ring = new HashRing('http://localhost:3001'); //['http://localhost:3001', 'http://localhost:3002','http://localhost:3003']
var _map = {};
var nodes = [];
var app = express();
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({
	extended: true
})); // for parsing application/x-www-form-urlencoded
var http = require('http').Server(app);
var io = require('socket.io')(http);
var matchIp = '((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))'

journal.out.subscribe(function (message) {
	//var message = {msg:env?env:msg,actorId:forward}
	var actoNode = ring.get(message.actorId);
	rest.post(actoNode + '/Actor', {
		data: {
			id: message.actorId,
			msg: message.msg
		}
	});
});

/** 
 * for external message, urlencoded "message" object should be like
 * {"id":<target actor id>,"type": "<type of actor>","message": <object> },
 **/
app.post('/create', function (req, res) {
	var data = null;
	if (typeof req.body.message === 'string') {
		data = JSON.parse(req.body.message);
	} else {
		data = req.body.message;
	}


	//POST to node for creating the actor and return the success/failure
	var msg = {
		action: 'initiate',
		payload: {
			"id": data.id,
			"type": data.type,
			"message": data.message
		}
	};
	journal.in.onNext({
		msg: msg,
		actorId: 'system-root'
	});
	return res.send('transfer initiated');
});


/** 
 * for internal actor to send message to a specific actor or to system-root using a path, 
 * urlencoded "req.body" should be like
 * {"id":<target actor id>,"type": "message": <object> },
 * 
 * "id": could be a specific actor ID or a path like system-root/1234/321
 **/
app.post('/send', function (req, res) {
	var forward = req.body.id;
	var msg = req.body.message;
	//wrapped in a box
	var env = null;
	//check if its new or forward
	var paths = forward.split('/');
	if (paths.length > 1) {
		forward = paths.splice(0, 1);
		paths = paths.join('/');
		env = {};
		env.id = paths;
		env.action = 'forward';
		env.box = msg;
	}
	//POST to node for creating the actor and return the success/failure
	journal.in.onNext({
		msg: env ? env : msg,
		actorId: forward
	});
	return res.end();
});

//handle socket disconnection, on disconnection remove server from node ring
io.on('connection', function (socket) {
	console.log('NODE: A connection established ~ from ' + socket.request.connection.remoteAddress.toString().match(matchIp)[1] + ' port ' + socket.request._query.port);

	socket.on('disconnect', function (s) {
		var nodeData = nodes[socket.id];
		nodeData.failureTime = Date.now();
		io.sockets.emit('event', nodeData);
		var server = 'http://' + nodeData.node + ':' + nodeData.port;
		ring.remove(server);
		nodes.splice(nodes.indexOf(socket.id), 1);
		nodeCount--;
		console.log(server + ' got disconnected.');
	});
});

//socket middleware to track connection from clients and add server of new clients to the node ring
io.use(function (socket, next) {
	var ip = socket.request.connection.remoteAddress.toString().match(matchIp)[1];
	ip = (ip == "127.0.0.1") ? 'localhost' : ip;
	var port = socket.request._query.port;
	var server = 'http://' + ip + ':' + port;

	if (!ring.has(server)) { // if server is not already added to ring
		console.log('new server added - ' + server)
		ring.add(server); //then add the server
	}
	//keep track of socket and respective server details
	nodes[socket.id] = {
		'node': ip,
		'port': port
	};
	nodeCount++
	//Hard coded for time being... root would be created as soon as 3001 port establish a connection
	if (server == config.rootNodeServer) {
		var actoNode = ring.get('system-root');
		console.log('Creating root @ ' + actoNode);
		var rootContext = new Context('system-root', 'system-root', null);
		//this would create root actor 
		var msg = {
			action: null,
			payload: null,
			sender_context: null,
			child_context: rootContext
		};

		var root = {
			id: 'system-root',
			msg: msg
		};

		rest.post(actoNode + '/Actor', {
			data: root
		}).on('complete', function (data, response) {
			console.log('root process initiated!');
		});
	}
	next();
});

http.listen(port, function () {
	console.log('listening on port 3000!');
});