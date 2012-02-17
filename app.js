var express = require('express'),
  http = require('http'),
  sockjs = require('sockjs'),
  rjs = require('rabbit.js'),
  snrub = require('snrub'),
  xml = require('libxmljs');

var app = express.createServer();

app.configure(function() {
  app.use(express.static(__dirname));
});

var sjs = require('sockjs').listen(app, {prefix: '[/]socket'});

app.listen(8000);

// For interactive use
module.exports.sockjs = sjs;
module.exports.http = app;


// ==== Client connections

var context = rjs.createContext();
context.on('ready', function() {

  // Pipe things to and from each connection

  sjs.on('connection', function(c) {
    // updates from the subscription server
    var s = context.socket('SUB');
    c.on('close', function() { s.destroy(); });
    s.connect('updates', function() { s.pipe(c); });

    // subscription requests from the client
    var r = context.socket('PUSH');
    c.on('close', function() { r.destroy(); });
    r.connect('subscriptions', function() { c.pipe(r); });
  });
});


// ==== Subscription server

var scheduler = snrub.createPoller();

// Also act as a subscription server; NB this could be done in another
// process.
var srvcontext = rjs.createContext();
srvcontext.on('ready', function() {
  var pub = context.socket('PUB');
  pub.connect('updates');
  scheduler.on('update', function(topic, data, headers) {
    sendNewEntries(topic, data, headers, pub);
  });

  var req = context.socket('PULL');
  req.connect('subscriptions');
  req.setEncoding('utf8');
  req.on('data', function(d) {
    subscriptionRequest(d, pub);
  });
});


var dedup = snrub.dedup();

function subscriptionRequest(str, sock) {
  try {
    var req = JSON.parse(str);
    if (req['subscribe']) {
      scheduler.register(req.subscribe);
      sendEntries(req.subscribe, dedup.allEntries(req.subscribe), sock);
    }
  }
  catch (err) {
    console.warn({error: "Subscription request failed", reason: err});
  }
}

var NAMESPACES = {atom: 'http://www.w3.org/2005/Atom'};

function removeOtherNamespaces(element, href) {
  if (element.namespace() &&
      element.namespace().href() != href) {
    element.remove();
  }
  else {
    var attrs = element.attrs();
    for (var i=0; i < attrs.length; i++) {
      if (attrs[i].namespace() &&
          attrs[i].namespace().href() != href) {
        attrs[i].remove();
      }
    }
    var children = element.childNodes();
    for (i=0; i < children.length; i++) {
      removeOtherNamespaces(children[i], href);
    }
  }
}

function sendEntries(topic, entries, sock) {
  entries.forEach(function(entry) {
    sock.write(JSON.stringify({update: {timestamp: entry.timestamp,
                                        contentType: entry.contentType,
                                        data: entry.data,
                                        topic: topic}}));
  });
}

function sendNewEntries(topic, data, headers, sock) {
  var entries = [];
  var contentType = headers['content-type'];
  var semi = contentType.indexOf(';');
  if (semi > -1) {
    contentType = contentType.substr(0, semi).replace(' ', '');
  }
  // Special cases for now
  if (contentType === 'application/atom+xml') {
    var doc = xml.parseXmlString(data);
    var atomentries = doc.root().find('//atom:entry', NAMESPACES);
    atomentries.forEach(function(entry) {
      removeOtherNamespaces(entry, NAMESPACES['atom']);
      entries.push({'id': entry.get('atom:id', NAMESPACES).text(),
                    'data': entry.toString(),
                    'contentType': contentType,
                    'timestamp': +new Date(entry.get('atom:updated', NAMESPACES).text())
                   });
    });
    entries = dedup.newEntries(topic, entries);
  }
  else if (contentType === 'application/rss+xml') {
    var doc = xml.parseXmlString(data);
    var rssentries = doc.root().find('//item');
    rssentries.forEach(function(entry) {
      entries.push({'id': entry.get('guid').text(),
                    'data': entry.toString(),
                    'contentType': contentType,
                    'timestamp': +new Date(entry.get('pubDate').text())
                   });
    });
    entries = dedup.newEntries(topic, entries);
  }
  else {
    entries = [{'data': data,
                'contentType': contentType,
                'timestamp': +new Date}];
  }
  sendEntries(topic, entries, sock);
}
