var chai = require('chai');
// var expect = require('chai').expect;
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var Actor = require("../lib/actor.js");
var Context = require("../utilities/context.js");

chai.use(sinonChai);

//create actor and perform actor tasks
describe("create actor and perform basic actor behaviour", function () {

	var genMap = {
		'foo': foo,
		'bar': bar
	}

	var actorMap = {};


	//stubbing the router used by the context to send message to other actors
	var router = {
		send: function (id, mail) {
			var _actor = actorMap[id];
			//if actor doesn't exist create actor and add to actor map
			if (!_actor && mail.child_context) {
				_actor = new Actor(genMap[mail.child_context.type], mail.child_context);
				actorMap[id] = _actor;
			}
			_actor.receive(mail);
			// console.log("sent");
		}
	}

	function* foo(callback) {

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
						var child = actor.context.createIfNotExists("4321", "bar");
						var msg = {
							action: "eat"
						};
						actor.context.send(child.id, msg, child.context);
						break;
					case 1:
						console.log("end");
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

	function* bar(callback) {

		var actor = this;

		const _states = {
			"eat": 0,
			"sleep": 1
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
						console.log("eat");
						break;
					case 1:
						console.log("sleep");
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


	before(function () {
		sinon.spy(console, 'log');
	});


	//create an actor
	it("should create an actor of type foo", function (done) {
		var actor_props = {
			id: '1234',
			type: "foo",
			parent: null
		}
		var context = new Context(actor_props.id, actor_props.type, actor_props.parent, router);
		var actor = new Actor(foo, context);

		actorMap[actor_props.id] = actor;

		chai.expect(actor.generator.name).to.equal("foo");
		chai.expect(actor.context.id).to.equal('1234');
		done();
	});

	it("should receive a message", function (done) {
		var message = {
			action: "end"
		}

		router.send("1234", message);
		setImmediate(function () {
			chai.expect(console.log).to.have.been.called;
			chai.expect(console.log).to.have.been.calledWith("end");
			done();
		});

	});

	it("should be able to create child actor", function (done) {
		var message = {
			action: "start"
		}

		router.send("1234", message);
		setImmediate(function () {
			chai.expect(actorMap["4321"]).to.be.an.instanceof(Actor);
			done();
		});
	});

	it("should be able send a message", function (done) {
		var message = {
			action: "start"
		}

		router.send("1234", message);

		setImmediate(function () {
			chai.expect(console.log).to.have.been.called;
			chai.expect(console.log).to.have.been.calledWith("eat");
			done();
		});
	});
})