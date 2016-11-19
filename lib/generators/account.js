"use strict";

var logger = require('../../utilities/logger.js').systemLogger;
//receive messages and move to states to perform an action
//each action is considered as an unit of work

module.exports = function* account(callback) {

	var actor = this;

	actor._child_type = "accountBalance";

	//The allowed states this actor can go to
	//after receiving a valid message
	const _states = {
		"initiate": 0,
		"deposit": 1,
		"withdraw": 2,
		"deposited": 3,
		"withdrawn": 4,
		"complete": 5
	};

	while (true) {
		try {
			var mail = yield;
			if (mail) {
				//get state from the message action
				var state = _states[mail.action];
				var payload = mail.payload;

				//move to a particular state using state
				switch (state) {

					//Implementing states
				case 0:
					//fund_transfer
					//initiates the fund transfer request
					var msg = {
						action: "withdraw",
						payload: payload
					};

					//send a message to self to initiate a withdrawl
					actor.context.send(actor.context.id, msg);
					break;
				case 1:
					//deposit
					//spawns child accountBalance if not present
					//sends increment message to the child
					var child = actor.context.createIfNotExists("AccBal_" + actor.context.id, actor._child_type);

					var msg = {
						action: "increment",
						payload: payload
					};

					//send message to the child
					actor.context.send(child.id, msg, child.context);
					break;
				case 2:
					//withdraw
					//spawns child accountBalance if not present
					//sends decrement message to the child
					var child = actor.context.createIfNotExists("AccBal_" + actor.context.id, actor._child_type);

					var msg = {
						action: "decrement",
						payload: payload
					};

					//send message to the child
					actor.context.send(child.id, msg, child.context);
					break;
				case 3:
					//deposited
					//after amount has been deposited to the actor
					var msg = {
						action: "complete",
						payload: payload
					}

					//send completed message to parent
					actor.context.send("system-root/" + payload.from, msg);

					break;
				case 4:
					//withdrawn
					//after amount has been withdrawn from the current actor
					var msg = {
						action: "deposit",
						payload: payload
					}

					//send a message to the receiving actor to deposit amount
					actor.context.send("system-root/" + payload.to, msg);

					break;
				case 5:
					//complete
					//send parent message that transfer has completed
					var msg = {
						action: "complete",
						payload: payload
					}

					actor.context.send(actor.context.parentSupervisorId, msg);

					break;
				default:
					//can send a response back stating invalid message received.
					break;
				}

				//callback for next reading next message in the mailbox
				callback();

			}
		} catch (exp) {
			logger.log('exception ~ '+ exp);
			//actor.handleException(exp, mail);
		}
	}
}