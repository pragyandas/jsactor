"use strict";

//Supervision strategy is used by each actor to supervise the child actors
//It is used to countering failures of the child actors
//This helps in containment of the error 

/*
Supervision strategies:
One-For-One - default - affects the direct children
All-For-One - affects the whole hierarchy of the parent
*/

var Directive = require("./supervision-directive.js");

class SupervisorStrategy {
	constructor(maxRetries, duration) {
		//if the number of retries is greater than maxRetries 
		//then call the decider with the exception 
		//and the decider will decide the directive it needs to dispatch
		//to deal with the upset child 
		this._maxRetries = maxRetries;
		this._duration = duration;

		//to record the retry count for each child
		this._retries = {};

		//maintain timer for each child
		this._timers = {};
	}

	//getter and setter for each property
	get duration() {
		return this._duration;
	}

	set duration(duration) {
		this._duration = duration;
	}

	get maxRetries() {
		return this._maxRetries;
	}

	set maxRetries(maxRetries) {
		this._maxRetries = maxRetries;
	}

	get timers() {
		return this._timers;
	}

	get retries() {
		return this._retries;
	}

	//returns a directive based on types of exception
	//if exception doesn't match any of the exception types
	//"Restart directive is dispatched" 
	decider(exp) {

		//	Maybe ArithmeticException is not application critical
		// so we just ignore the error and keep going.
		// Error that we have no idea what to do with
		// Error that we can't recover from, stop the failing child
		// otherwise restart the failing child

		//example directiveExceptionMap
		// {
		// 	"ArithmeticException": Directive.Resume,
		// 	"InsanelyBadException:/": Directive.Escalete,
		// 	"NotSupportedException:(": Directive.Stop,
		// }

		return this._directiveExceptionMap[exp.type || typeof exp] || Directive.Restart;

	}

	//actor calls register exception to receive an acknowledgement 
	//to retry or use directive to apply on the child
	registerException(exp, key) {
		//increase retry count on each retry
		var retryCount = this.retries[key] = (this.retries[key] && ++this.retries[key]) || 1;
		if (retryCount === 1) {

			//reset retry count after the duration
			this.timers[key] = setTimeout(function () {
				this.retries[key] = 0;
			}.bind(this), this.duration);
			return {
				retry: true,
				directive: null
			};

		} else if (retryCount > this.maxRetries) {

			//if retries is more than maxRetries
			//clear timeout and return the appropriate directive
			//using decider
			clearTimeout(this.timers[key]);
			this.retries[key] = 0;
			return {
				retry: false,
				directive: this.decider(exp)
			};
		} else {
			return {
				retry: true,
				directive: null
			};
		}
	}

}


class OneForOneStrategy extends SupervisorStrategy {
	/**
	 * [initialize instance]
	 * @param  {[number]} maxRetries            [in integer]
	 * @param  {[number]} duration              [in milliseconds]
	 * @param  {[object]<optional>} directiveExceptionMap [<exceptionType>:<["Resume","Escalate","Stop","Restart"]>]
	 * @return {[OneForOneStrategy]}           [instance]
	 */
	constructor(maxRetries, duration, directiveExceptionMap) {
		super(maxRetries, duration);
		this._directiveExceptionMap = directiveExceptionMap || {
			//To be implemented
			MinorRecoverableException: "Restart",
			Exception: "Stop"
		}
	}
}

class AllForOneStrategy extends SupervisorStrategy {
	/**
	 * [initialize instance]
	 * @param  {[number]} maxRetries            [in integer]
	 * @param  {[number]} duration              [in milliseconds]
	 * @param  {[object]<optional>} directiveExceptionMap [<exceptionType>:<["Resume","Escalate","Stop","Restart"]>]
	 * @return {[AllForOneStrategy]}           [instance]
	 */
	constructor(maxRetries, duration, directiveExceptionMap) {
		super(maxRetries, duration);
		this._directiveExceptionMap = directiveExceptionMap || {
			//to be implemented
			MajorUnRecoverableException: "Stop",
			Exception: "Escalate"
		}
	}
}

//export modules
module.exports = {
	OneForOneStrategy: OneForOneStrategy,
	AllForOneStrategy: AllForOneStrategy
}