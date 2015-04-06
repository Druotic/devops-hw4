var http      = require('http');
var httpProxy = require('http-proxy');
var exec = require('child_process').exec;
var request = require("request");
var redis = require('redis');

var hostIP = '127.0.0.1'
var blueSPort = '9090';
var blueRPort = '6379';
var greenSPort = '5060';
var greenRPort = '6380';

var green = 'http://' + hostIP + ':' + greenSPort;
var blue  = 'http://' + hostIP + ':' + blueSPort;

var greenRedis = redis.createClient(greenRPort, hostIP, {});
var blueRedis = redis.createClient(blueRPort, hostIP, {});

//defaults
var target = blue;

var printSwitch = function(res, slice) {
  res.write("Successfully switched to " + slice + " slice." );
  res.end();
}

var infrastructure =
{
  setup: function()
  {
    // Proxy.
    var options = {};
    var proxy   = httpProxy.createProxyServer(options);
    var slice;

    var server  = http.createServer(function(req, res)
    {
      if(req.url == "/switch") {
        if(target == blue) {
          target = green;
          slice = "green";
          // migrate images from blue to green, db 0 (default?), 5s timeout, copy, replace
          blueRedis.migrate(hostIP, greenRPort, "images", 0, 10, function (err, data) {
            if(err) throw err;
            printSwitch(res, slice);
          });
        }
        else {
          target = blue;
          slice = "blue";
          greenRedis.migrate(hostIP, blueRPort, "images", 0, 10, function (err, data) {
            if(err) throw err;
            printSwitch(res, slice);
          });
        }
      }
      else
        proxy.web( req, res, {target: target } );

    });
    server.listen(8080);

    // Launch green slice
    exec('forever start --watch deploy/blue-www/main.js ' + blueSPort + ' ' + blueRPort);
    console.log("blue slice");

    // Launch blue slice
    exec('forever start --watch deploy/green-www/main.js ' + greenSPort + ' ' + greenRPort);
    console.log("green slice");

    //setTimeout
    var options =
    {
     url: "http://localhost:8080"
    };

    // request(options, function (error, res, body) {});
  },

  teardown: function()
  {
    exec('forever stopall', function()
    {
      console.log("infrastructure shutdown");
      process.exit();
    });
  }
}
  infrastructure.setup();

  // Make sure to clean up.
  process.on('exit', function(){infrastructure.teardown();} );
  process.on('SIGINT', function(){infrastructure.teardown();} );
  process.on('uncaughtException', function(err){
    console.log(err);
    infrastructure.teardown();} );
