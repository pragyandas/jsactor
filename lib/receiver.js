"use strict"

//receiver is used by actor to decide on the received messages
//there can be three category of messages:
//system : denotes any system event such exception, restart, shutdown, etc.
//forward : denotes any message that needs to be forwarded to an actor through the current actor
//others: these are regular messages that are exchanged between actors for processing and performing tasks 

module.exports = function* () {
	//receiver generator which receives messages
	var _states = {
		"system": 0,
		"forward": 1
	};

	while (true) {
		let msg = yield;
		if (msg) {
			var state = _states[msg.action];
			switch (state) {
			case 0:
				setImmediate(function () {
					this.handleSystemMessages(msg);
				}.bind(this));
				break;
			case 1:
				setImmediate(function () {
					this.handleForwardedMessages(msg);
				}.bind(this));
				break;
			default:
				//push message to the mailbox					
				this._mailbox.push(msg);

				//peek into the mailbox if actor is not running 
				//and new message arivved for processing
				if (!this._actor_running) {
					this._peek();
				}
			}
		}
	}
}