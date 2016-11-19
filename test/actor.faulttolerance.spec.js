var expect = require('chai').expect;
var sinon = require('sinon');
var Actor = require("../lib/actor.js");
var Context = require("../utilities/context.js");


//create actor and perform actor tasks
describe("create actor and perform various actor behaviour", function () {

	module.exports = function* dummy(callback) {

		var actor = this;

		const _states = {
			"start": 0,
			"end": 1
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

						break;
					case 1:

						break;
					default:

					}

					//callback for next reading next message in the mailbox
					callback();

				}
			} catch (exp) {

			}
		}
	}


	this.timeout(2000);

	//create an actor
	it("should create an actor", function (done) {
		var actor_props = {
			id: 1234,
			type: "dummy",
			parent: null
		}
		var context = new Context(actor_props.id, actor_props.type, actor_props.parent);
		var actor = new Actor(dummy, context);

		expect(actor.generator.name).to.equal("account");
		expect(actor.context.id).to.equal(1234);
		done();
	});

	it("child actor can be stopped by the parent", function (done) {

	});

	it("child actor can be restarted by the parent", function (done) {

	});
})