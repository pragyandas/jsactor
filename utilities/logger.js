var winston = require('winston');

var failureLogger = new (winston.Logger)({
    transports: [
      new (winston.transports.File)({ filename: '../logs/failure.log' })
    ]
  });

  var systemLogger = new (winston.Logger)({
    transports: [
      new (winston.transports.File)({ filename: '../logs/system.log' })
    ]
  });

  module.exports = {
      failureLogger: failureLogger,
      systemLogger: systemLogger
  }