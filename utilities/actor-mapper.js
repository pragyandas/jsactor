"use strict";
var Rx = require('rx');
var Subject = Rx.Subject;
var Observable = Rx.Observable;
var services = require("../db/services");
var fail = require('./logger.js').failureLogger;
var logger = require('./logger.js').systemLogger;
var MAX_RETRIES = 3;


var actor_mapper = new Subject();


actor_mapper.flatMap(get_observable_from_promise)
                .subscribe(function (d) {
                                //log db save successful message
                });


//takes a value to perform db opration and returns an observable from promise
//retry mechanism built_in to retry specified number of times
//if retry fails then it it logged into a file
function get_observable_from_promise(val) {
                var query = Rx.Observable.fromPromise(services.saveActorMap(val));

                var retry_count = 0;

                return query.retryWhen(retryStrategy(retry_count)).catch(function (err) {
								//log errored out messages after it has been retried the specified number of times
								fail.log(err.payload);
                                return Rx.Observable.empty();
                });
}

//retries the rejected or failed promise 
//errors out when retry_count >  MAX_RETRIES
function retryStrategy(retry_count) {
                return function (errors) {
                                return errors.map(function (x) {
                                                if (retry_count > MAX_RETRIES) {
                                                                throw new Error({message:"Cannot write to actor map", payload: x  });
                                                }
                                                retry_count++;
                                                return x;
                                });
                }
}

module.exports = actor_mapper;
