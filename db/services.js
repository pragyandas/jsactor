var mongoose = require("mongoose");
var acc_bal = require('./models/account-balance.js');
var journal = require('./models/journal.js');
var actorMap = require('./models/actor-map.js');
var rogueMessage = require('./models/rogue-message.js');
mongoose.connect('mongodb://localhost/storedb');


function incrementBalance(accountNo, amount) {
	return new Promise(function (resolve, reject) {
		acc_bal.findOneAndUpdate({
			"accountNo": accountNo
		}, {
			$inc: {
				"amount": amount
			}
		}, {}, function (err, result) {
			if (err) {
				console.log('IncrementBalance failed ~ ' + accountNo + ' ~ amount ~ ' + amount + ' ~ err ~ ' + JSON.stringify(err));
				reject(err);
			}
			resolve(true);
		});
	});
}

function decrementBalance(accountNo, amount) {
	return new Promise(function (resolve, reject) {
		acc_bal.findOneAndUpdate({
			"accountNo": accountNo
		}, {
			$inc: {
				"amount": -amount
			}
		}, {}, function (err, result) {
			if (err) {
				console.log('decrementBalance failed ~ ' + accountNo + ' ~ amount ~ ' + amount + ' ~ err ~ ' + JSON.stringify(err));
				reject(err);
			}
			resolve(true);
		});
	});
}

function saveJournal(msg) {
	return new Promise(function (resolve, reject) {
		var j = {};
		j.msg = msg.msg;
		j.timestamp = msg.timestamp;
		j.actorId = msg.actorId;
		journal.create(j, function (err, res) {
			if (err) {
				console.log('Journal err ~ ' + JSON.stringify(err))
				reject(err);
			}
			resolve(true);
		});
	});
}


function retrieveJournal(startTime, endTime, actorId) {
	return new Promise(function (resolve, reject) {
		var result = journal.find({
			"actorId": actorId,
			"timestamp": {
				$gte: startTime,
				$lte: endTime
			},
			"msg.action":{
				$ne: "system"
			},
			"msg.subaction":{
				$ne: "recover"
			}
		},function (err, res) {
			console.log(actorId + ' recovering between ' + startTime + ' - ' + endTime)
			if (err) {
				console.log('retreiveJournal err ~ ' + JSON.stringify(err));
				reject(err);
			}
			console.log(JSON.stringify(res));
			resolve(res);
		});
	});
}



function saveActorMap(data) {
	return new Promise(function (resolve, reject) {
		var aMap = {};
		aMap.id = data.id;
		aMap.parentId = data.parentId;
		aMap.node = data.node;
		actorMap.findOneAndUpdate({"id":data.id, "parentId":data.parentId},aMap,{"upsert":true}, function (err, res) {
			if (err) {
				console.log('ActorMap err ~ ' + JSON.stringify(err))
				reject(err);
			}
			resolve(true);
		});
	});
}

function retrieveChildActorMap(parentId) {
	return new Promise(function (resolve, reject) {
		actorMap.find({
			"parentId": parentId
		},function (err, res) {
			if (err) {
				console.log('retreiveActorMap err ~ ' + JSON.stringify(err));
				reject(err);
				return;
			}
			resolve(res);
		});
	});
}

function retrieveActorMap(parentId, actoNode) {
	return new Promise(function (resolve, reject) {
		actorMap.find({
			"node.port": actoNode.port,
			"node.node": actoNode.node,
			"parentId": parentId
		},function (err, res) {
			if (err) {
				console.log('retreiveActorMap err ~ ' + JSON.stringify(err));
				reject(err);
				return;
			}
			resolve(res);
		});
	});
}

function saveRogueMessages(id, messages) {
	var rogue_msg = {
		actorId: id,
		messages: messages
	};
	return new Promise(function (resolve, reject) {
		rogueMessage.update({
			actorId: id
		}, rogue_msg, {
			upsert: true
		}, function (err, res) {
			if (err) {
				reject(err);
			}
			resolve(true);
		});
	});
}

function retrieveRogueMessages(id) {
	return new Promise(function (resolve, reject) {
		rogueMessage.find({
			"actorId": id
		}, function (err, msgs) {
			if (err) {
				reject(err);
			}

			resolve(msgs);
		});
	});
}

	module.exports = {
		incrementBalance: incrementBalance,
		decrementBalance: decrementBalance,
		saveRogueMessages: saveRogueMessages,
		retrieveRogueMessages: retrieveRogueMessages,
		saveJournal: saveJournal,
		retrieveJournal: retrieveJournal,
		saveActorMap: saveActorMap,
		retrieveActorMap: retrieveActorMap,
		retrieveChildActorMap : retrieveChildActorMap
	}