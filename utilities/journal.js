"use strict";
//stream the messages through the journal function which
//does all the journalizing while passing the messages downstream to the required actor.


//fires and forgets promises
//so that whenever a message is sent around the system it gets
//implicitly stored without adding any delay to the overall communication cycle.

var Rx = require('rx');
var Subject = Rx.Subject;
var Observable = Rx.Observable;
var uuid = require("node-uuid");
var services = require("../db/services");

var MAX_RETRIES =  3;

class Journal {
	constructor() {
		/*subject is both an Observable as well as an Observer
		so the messages when arriving at the actor are passed thorugh
		this subject so that it can just perform a few actions	``
		and then return to the world subscibed from.*/

		//the start and end of the pipe
		//data can be pushed through one end
		//data can be subscribed through the other end
		//journalizing happens in the pipe without any delay
		this.in = new Subject();
		this.out = this.in.map(generateId).do(journalize);
	}
}

/*
message,
actorId,
msgId,
timestamp
 */

//time-based id to identify each message with a unique number
function generateId(mail) {

	mail.msg = Object.assign(mail.msg, {
		msgId: uuid.v4()
	});

	mail.timestamp = Date.now();

	return mail;
}

//for each value pumped into the subject(this.in)
//journalize will create an observable from Promise(wrapper of database call)

//Observable sequence has retryStrategy 
//built-in to handle the failure of Promise

//when the promise resolves the message can be logged
/*when the promise rejects the : 
1 - value can be put into memory to be periodically retried
2 - can be logged with a retry count of 1 
periodic retries will increase the retry count 
for each in-memory store entry on repeated failure  */
function journalize(mail) {
	var retry_count = 0;

	Observable
		.fromPromise(services.saveJournal(mail))
		.retryWhen(retryStrategy(retry_count))
		.subscribe(function (x) {
			//TODO: log
		}, function (err) {
			//write to in_memory store and log
		});
}


//retries the rejected or failed promise 
//errors out when retry_count >  MAX_RETRIES
function retryStrategy(retry_count) {
	return function (errors) {
		return errors.map(function (x) {
			if (retry_count > MAX_RETRIES) {
				throw new Error("Cannot write to journal");
			}
			retry_count++;
			return x;
		});
	}
}

module.exports = Journal;