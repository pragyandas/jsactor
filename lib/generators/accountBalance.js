"use strict";
//receive messages and move to states to perform an action
//each action is considered as an unit of work

var services = require("../../db/services");
var logger = require('../../utilities/logger.js').systemLogger;
module.exports = function* account(callback) {

	//context stores all the metadata of the actor
	var context = this.context;
	var strategy = this.strategy;
	var actor = this;
	//The allowed states this actor can go to
	//after receiving a valid message
	const _states = {
		"increment": 0,
		"decrement": 1
	};

	while (true) {
		try {
			var mail = yield;
			if (mail) {
				//get state from the message action
				var state = _states[mail.action];
				var payload = mail.payload;
				//var sender = mail.sender;

				//move to a particular state using state
				switch (state) {

					//Implementing states
				case 0:
					//increment
					//call service to increase balance

					//encapsulate the service call to hold the
					//correct instance of payload to be sent when the async request returns
					(function (mail) {
						services.incrementBalance(actor.context.id, mail.payload.amount).then(function (res) {
							if (res) {
								//send a deposited message with payload
								var msg = {
									action: "deposited",
									payload: mail.payload
								}

								//send message to parent
								actor.context.send(actor.context.parentSupervisorId, msg);
							}
						}).catch(function (exp) {
							logger.log('err ~ ' + JSON.stringify(exp));
							//actor.handleException(exp, mail);
						})
					}(mail));
					break;
				case 1:
					//decrement
					//call service to decrement balance

					//encapsulate the service call to hold the
					//correct instance of payload to be sent when the async request returns
					(function (mail) {
						services.decrementBalance(actor.context.id, mail.payload.amount).then(function (res) {
							if (res) {
								//send a withdrawn message with payload
								var msg = {
									action: "withdrawn",
									payload: mail.payload
								}

								//send message to the parent
								actor.context.send(actor.context.parentSupervisorId, msg);
							}
						}).catch(function (exp) {
							logger.log('err ~ ' + JSON.parse(exp));
							//actor.handleException(exp, mail);
						})
					}(mail));
					break;

				default:
					//can send a response back stating invalid message received.
					break;
				}

				//callback for next reading next message in the mailbox
				callback();
			}
		} catch (exp) {
			logger.log('exception ~ ' + exp);
			//actor.handleException(exp, mail);
		}
	}
}