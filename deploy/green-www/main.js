var redis   = require('redis');
var multer  = require('multer');
var express = require('express');
var fs      = require('fs');
var httpProxy = require('http-proxy');
var http = require('http');

var app = express();

var args = process.argv.slice(2);
var server_port = args[0];
var redis_port = args[1];
var client = redis.createClient(redis_port, '127.0.0.1', {});


// Add hook to make it easier to get all visited URLS.
app.use(function(req, res, next)
{
  console.log(req.method, req.url);
  client.lpush('recent', req.url);
  client.ltrim('recent', 0, 4);
  next(); // Passing the request to the next handler in the stack.
});

app.get('/', function(req, res) {
  res.send('hello world (server port: ' + server_port + ', redis port: ' +
    redis_port + ')');
});

app.get('/get', function(req, res) {
  client.get("foo", function(err, val) {
    val = (val) ? val : "No value set - try POST /set";
    res.send(val);
  });
});

app.post('/set', function(req, res) {
  var key = "foo";
  client.set(key, "this message will self-destruct in 10 seconds");
  client.expire(key, 10);
  res.send("key set!");
});

app.get('/recent', function(req, res) {
  client.lrange("recent", 0, 4, function(err, val) {res.send(val)});
})

app.post('/upload',[ multer({ dest: './uploads/'}), function(req, res) {
  console.log(req.body); // form fields
  console.log(req.files); // form files

  if( req.files.image )
  {
    fs.readFile( req.files.image.path, function (err, data) {
      if (err) throw err;
      var img = new Buffer(data).toString('base64');
      client.lpush('images', img, function (err, data) {
        fs.unlink(req.files.image.path, function (err) {
          if (err) throw err;
          console.log('Deleted temp file ' + req.files.image.path);
        });
      });
    });
  }
  res.status(204).end();
}]);

app.get('/meow', function(req, res) {
    client.lpop('images', function (err, data) {
      res.writeHead(200, {'content-type':'text/html'});
      res.write("<img src='data:my_pic.jpg;base64,"+data+"'/>");
      res.end();
    });
});

var server = app.listen(server_port, function () {
  var host = server.address();
  console.log('Example app listening at http://%s:%s',
    host.address, host.port);
});
