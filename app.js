var express = require('express'),
  http = require('http'),
  sockjs = require('sockjs'),
  rjs = require('rabbit.js');

var app = express.createServer();

app.configure(function() {
  app.use(express.static(__dirname));
});

var sjs = require('sockjs').listen(app, {prefix: '[/]socket'});

module.exports.sockjs = sjs;
module.exports.http = app;

var context = rjs.createContext();
context.on('ready', function() {
  sjs.on('connection', function(c) {
    var s = context.socket('SUB');
    c.on('close', function() { s.destroy(); });
    s.pipe(c);
    s.connect('events');
  });

  var pub = context.socket('PUB');
  pub.connect('events');

  function slurp(event) {
    return function(res) {
      // probably quicker to cons a buffer, but easier to debug this way.
      res.setEncoding('utf8');
      var chunks = ['{"' + event + '":'];
      res.on('data', function(chunk) { chunks.push(chunk); });
      res.on('end', function() {
        chunks.push('}');
        pub.write(chunks.join(''), 'utf8');
      });
    }
  }

  function poll(path, event) {
    return function() {
      http.get({host: 'localhost',
                port: 55672,
                path: path,
                auth: 'guest:guest'}, slurp(event));
    };
  }

  setInterval(poll('/api/nodes', 'nodes'), 5000);
  setInterval(poll('/api/overview', 'overview'), 5000);
});


app.listen(8000);
