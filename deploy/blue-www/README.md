Cache, Proxies, Queues - *initial instructions at the end*
=========================
All portions of the assignment are complete. Most of the implementation is 1:1 and very straight-forward
according to the instructions given below.  However, some things which may be less obvious are as follows:

The proxy strategy is to simply forward requests from port 80 to port 3000, 3001, 3002 in a round-robin
style starting with port 3000. These values are hard-coded (inserted into redis at start time). Note 
that the key 'hosts' will be wiped out when the application is started.

I also added a bit to delete each temp file which is created when saving the image uploaded via `POST 
/upload`.  It didn't make sense to keep these temp files around since they are being stored in redis. The
file is deleted after it is stored in redis.

Also, it should be mentioned that the "cat picture uploads: queue" portion isn't really a queue.
It actually follows stack-like behaviour (LIFO), despite the naming throughout the instructions.


=========================

### Setup

* Clone this repo, run `npm install`.
* Install redis and run on localhost:6379

### A simple web server

Use [express](http://expressjs.com/) to install a simple web server.

	var server = app.listen(3000, function () {
	
	  var host = server.address().address
	  var port = server.address().port
	
	  console.log('Example app listening at http://%s:%s', host, port)
	})

Express uses the concept of routes to use pattern matching against requests and sending them to specific functions.  You can simply write back a response body.

	app.get('/', function(req, res) {
	  res.send('hello world')
	})

### Redis

You will be using [redis](http://redis.io/) to build some simple infrastructure components, using the [node-redis client](https://github.com/mranney/node_redis).

	var redis = require('redis')
	var client = redis.createClient(6379, '127.0.0.1', {})

In general, you can run all the redis commands in the following manner: client.CMD(args). For example:

	client.set("key", "value");
	client.get("key", function(err,value){ console.log(value)});

### An expiring cache

Create two routes, `/get` and `/set`.

When `/set` is visited, set a new key, with the value:
> "this message will self-destruct in 10 seconds".

Use the expire command to make sure this key will expire in 10 seconds.

When `/get` is visited, fetch that key, and send value back to the client: `res.send(value)` 


### Recent visited sites

Create a new route, `/recent`, which will display the most recently visited sites.

There is already a global hook setup, which will allow you to see each site that is requested:

	app.use(function(req, res, next) 
	{
	...

Use the lpush, ltrim, and lrange redis commands to store the most recent 5 sites visited, and return that to the client.

### Cat picture uploads: queue

Implement two routes, `/upload`, and `/meow`.
 
A stub for upload and meow has already been provided.

Use curl to help you upload easily.

	curl -F "image=@./img/morning.jpg" localhost:3000/upload

Have `upload` store the images in a queue.  Have `meow` display the most recent image to the client and *remove* the image from the queue.

### Proxy server

Bonus: How might you use redis and express to introduce a proxy server?

See [rpoplpush](http://redis.io/commands/rpoplpush)
