"use strict"

var supervision_strategy = require("../utilities/supervision/supervision-strategy.js");
var faultInfo = require("../utilities/fault-line.js");
var services = require("../db/services.js");
var receiver = require("./receiver.js");
var system_message_handler = require("./system-message-handler.js");
var forward_message_handler = require("./forward-message-handler.js");
var logger = require('../utilities/logger.js').systemLogger;
var Context = require('../utilities/context.js');

class Actor {
	/**
	 * [takes a generator and returns an actor instance]
	 * @param  {Generator} fn      	[generator]
	 * @param  {[object]}  context  [description]
	 * @param  {[object]}  strategy [optional - strategy object]
	 * @return {[Actor]}            [Actor instance]
	 */
	constructor(fn, context, strategy) {
		//the context object stores all the metadata of the actor
		this.context = context;

		//startegy object maintains the failure recovery guidelines
		//that parent actor can send to the children 
		//in case children complain "something has gone wrong!!!"
		this.strategy = strategy;

		this.generator = fn;

		//if strategy is not applied then the actor deafults to AllForOneStrategy
		//as if one/more children fail we revert all the children
		if (!this.strategy) {
			let maxRetries = 3;
			let duration = 500;
			this.strategy = new supervision_strategy.OneForOneStrategy(maxRetries, duration);
		}

		//collection of incoming mails to handle backpressure
		//queue-like implementation
		//except the case of system messages 
		//system messages are shoved into the front of the collection rather than the back
		this._mailbox = [];

		//rougue messages - its trouble
		//<rogueMailId> : <mail>
		this.rogueMessages = {};

		//prep the actor to receive incoming messages
		this._preStart();
	}


	//preparing the mailbox after initailizing the statestore and the receiver.
	//To get value into a generator for processing we need it in suspended state

	//pre start takes care of creating the statestore
	//initiating the receiver
	_preStart() {

		//flag to indicate if actor is currently processing any message
		this._actor_running = false;

		//processes any message sent to it
		//and maintains the state of the actor
		this._stateStore = this.generator.call(this, this._peek.bind(this));

		//receives messages
		this._receiver = receiver.call(this);

		//initializes the actor to recieve messages
		//_stateStore is an instance of the generator 

		//initializing _stateStore - sending empty message
		this._stateStore.next();

		//initializing _receiver - sending empty message
		this._receiver.next();

		//subscribe to the cluster event for reacting to any node failure if any child exists on that node
		//if node fails then the actor consults the actor map in the db to restart all the dead children 
		//with the same id so that the children can be restored to the previous state and resume
		faultInfo.subscribe(function (data) {
			// var ip = machine.node;
			// var port = machine.port;

			debugger;

			var self = this;
			var machine = {
				'node': data.node,
				'port': data.port
			};

			services.retrieveActorMap(self.context.id, machine).then(function (childCollection) {
				childCollection.map(function (actorMap) {
					return actorMap.id;
				}).forEach(function (childId) {
					if (self.context.ifExists(childId)) {
						var msg = {
							action: "system",
							subaction: "recover",
							failedNode: machine,
							failureTime: data.failureTime
						};
						console.log('recovery of ~ ', childId);
						var child_context = new Context(childId, self._child_type, self.context.id);
						self.context.send(childId, msg, child_context);
					}
				});
			}, function (err) {
				//log error
			})
		}.bind(this));
	}

	//recover the actor if the actor has crashed
	//will restore the actor to the previously held state at the time of failure
	recover(startTime, node) {
		//call preRestart
		var endTime = this._preRecover();
		var childToRecover = [];
		var self = this;

		services.retrieveChildActorMap(self.context.id).then(function (children) {
				var childrenIds = children.map(function (child) {
					if (child.node.node == node.node && child.node.port == node.port) {
						childToRecover.push(child.id);
					}
					return child.id;
				});
				self.supervisedChildren = new Set(childrenIds);

				var msg = {
					action: "system",
					subaction: "recover",
					failedNode: node,
					failureTime: startTime
				};

				childToRecover.forEach(function (childId) {
					var child_context = new Context(childId, self._child_type, self.context.id);
					self.context.send(childId, msg, child_context);
				});

				return services.retrieveJournal(startTime, endTime, self.context.id)
			})
			//get all the messages from the journal between the startTime and endTime
			//add it to the primary mailbox

		.then(function (journal_msgs) {
				self._mailbox = journal_msgs;
				//retrive all the rogue messages from the rogue store using the actor id
				return services.retrieveRogueMessages(self.context.id)
			})
			.then(function (rogue_messages) {
				self.rogueMessages = rogue_messages;
				self._postRecover();
			})
			.catch(function (err) {
				logger.log('Recover error ' + err);
			});
	}

	//create auxiliary storage  
	//refresh the mail
	//route all the mails to an auxiliary mailbox - _mailbox=aux_mailbox
	_preRecover() {
		this._aux_mailbox = [];
		this._switch_to_auxiliary_mailbox = true;
		return Date.now();
	}

	//add auxiliary message box to the to the end of primary mailbox
	//switch primary mailbox to recieve mails
	_postRecover() {
		this._mailbox = this._mailbox.concat(this._aux_mailbox);
		this._aux_mailbox = [];
		this._switch_to_auxiliary_mailbox = false;
		console.log(this.context.id + " mails after recovery ~ " + this._mailbox);
		//peek into the mailbox after it has been restored
		this._peek();
	}

	//restart the actor
	restart() {
		this._preRestart(function () {
			var restart_msg = {
				action: "system",
				subaction: "restart"
			}

			//send restart message to each children
			for (let child of this.context.supervisedChildren) {
				this.context.send(child, restart_msg);
			}

			this._postRestart();

		}.bind(this));
	}

	_preRestart(cb) {
		this._suspend_mailbox = true;
	}

	_postRestart() {
		this._preStart();
		this._peek();
	}

	stop() {
		//suspend the mailbox
		this._suspend_mailbox = true;

		//check if supervisedChildren set it empty then directly call _postStop
		//as actor doesn't need the children to successfully shutdown
		if (!this.context.supervisedChildren.size) {
			//call _postStop
			this._postStop();
		} else {
			this._watch_children_callback = function () {
				this._postStop();

				//dump mailbox into system deadletters

				//clear up any other resources if necessary

				//remove actor from current node's actorMap

			}.bind(this);
		}

		//create terminate message
		var terminate_msg = {
			action: "system",
			subaction: "terminate"
		};

		//send termination message to each children
		for (let child of this.context.supervisedChildren) {
			this.context.send(child, terminate_msg);
		}


	}

	registerChildTermination(childId) {
		if (this._watch_children_callback) {
			if (!this.terminated_set) {
				this.terminated_set = new Set();
			}

			this.terminated_set.add(childId);

			if (eqSet(this.terminated_set, this.context.supervisedChildren)) {
				this._watch_children_callback();
			}
		}

		function eqSet(as, bs) {
			if (as.size !== bs.size) return false;
			for (var a of as)
				if (!bs.has(a)) return false;
			return true;
		}
	}

	//send terminated message to parent
	_postStop() {

		//send "terminated" message to the parent
		var msg = {
			action: "system",
			subaction: "terminated"
		};
		this.context.send(this.context.parentSupervisorId, msg);
	}

	//peek into the mailbox to look for messages
	//take one mail at a time to process it
	_peek() {
		if (!this._suspend_mailbox) {
			let msg = this._mailbox.shift();

			//if we get no message from the mailbox we mark the actor as not running
			//i.e. the actor is not processing any messages so that when it recives any new message 
			//it can restart processing the message by again calling peek  
			if (msg) {
				this._actor_running = true;
				setImmediate(function () {
					this._stateStore.next(msg);
				}.bind(this));
			} else {
				this._actor_running = false;
			}
		}
	}

	//takes message and sends it to the receiver
	//if auxiliary mailbox is activated 
	//then store all the incoming messages in the auxiliary mailbox
	receive(msg) {
		if (this._switch_to_auxiliary_mailbox) {
			this._aux_mailbox.push(msg);
		} else {
			this._receiver.next(msg);
		}
	}

	//add a message to the rogueMessages object
	markRogue(msg) {
		this.rogueMessages[msg.msgId] = msg;
	}

	//remove message from the rogueMessages list
	//it removes and returns the message stored in the object
	unmarkRogue(msgId) {
		var msg = this.rogueMessages[msgId];
		delete this.rogueMessages[msgId];
		return msg;
	}

	//retry the message from the rogue messages list
	retry(msgId) {
		//get rogue message from the rogue list of messages
		var msg = this.unmarkRogue(msgId);

		//push the message into the mailbox - to be retrired
		this.receive(msg);
	}

	//apply parent provided directive to handle a particular exception
	applyDirective(directive, msgId) {
		//unmark message from the rogue list
		var msg = this.unmarkRogue(msgId);

		//apply directive
	}

	//handle forwarded messages
	/*	forwarded messages are the one which are not processed by the actor 
		rather forwarded to a particular child in its hierarchy*/
	handleForwardedMessages(mail) {
		forward_message_handler.call(this, mail);
	}

	//handle system messages 
	//perform actions based on the subactions specified in the  messages
	handleSystemMessages(mail) {
		system_message_handler.call(this, mail);

	}

	/**
 	[handleException wrap the exception into a system message
	and send it to the parent for processing]
	 * @param  {[object]} exp  [exception]
	 * @param  {[object]} mail [mail which caused the exception]
	 */
	handleException(exp, mail) {
		//mark the mail as rogue
		this.markRogue(mail);

		//write the rogue message collection to the database
		//if the collection doesn't exist for the actor then create
		//or replace the existing collection to keep the rougue message collection fresh
		//to help in recovery of the actor during failures or enforced restarts
		services.saveRogueMessages(this.context.id, this.rogueMessages).then(function (d) {
			//log 
			//logger.log("Rogue messages saved for actor", this.context.id, "successfully");
		}, function (err) {
			//log
			//logger.log("Cannot save rogue messages for actor", this.context.id);
		});

		//wrap the exception in a system message
		var msg = {
			action: "system",
			subaction: "exception",
			payload: exp,
			rogueMailId: mail.msgId
		};

		//send it to the parent for processing
		this.context.send(this.context.parentSupervisorId, msg);
	}
}

module.exports = Actor;