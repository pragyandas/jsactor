var Rx = require('rx');
var rest = require('restler');
var async = require('async');
var fs = require('fs');
var testData = JSON.parse(fs.readFileSync('./test_data/test-data-100.json', 'utf8'));

console.time('Test');
async.eachSeries(testData, function (item, cb) {
        rest.post('http://localhost:3000/create', {
            data: {
                message: item
            }
        }).on('complete', function (data, response) {
            console.log('FT: ~ ' + JSON.stringify(item));
            cb();
        });

    }, function () {
        console.timeEnd('Test');
    })
    /*
    var numbers = Rx.Observable.timer(0, 100);
    numbers.subscribe(function (x) {
        var msg = {
            from: x, 
            to: x+1,
            amount: 100
        }
        rest.post('http://localhost:3000/create',{data:{id:x, type:'account',message:msg}}).on('complete',function(data, response){
            console.log(x);
        });
    });
    */