var express = require('express'),
  http = require('http'),
  sockjs = require('sockjs'),
  rjs = require('rabbit.js'),
  xml = require('libxmljs');

var app = express.createServer();

// Values and buffers for e.g., feed entries.
var spool = require('spool').createContext();

app.configure(function() {
  app.use(express.static(__dirname));
  app.use(require('./user').middleware(spool));
});

var sjs = require('sockjs').listen(app, {prefix: '[/]socket'});

app.listen(8000);

// For interactive use
exports.sockjs = sjs;
exports.http = app;


// ==== Client connections

sjs.on('connection', function(c) {
  clientConnection(c);
});

// Sockets for us to communicate with the "backend" services

var scheduler_proxy = {};

var context = rjs.createContext();
context.on('ready', function() {
  var updates = context.socket('SUB');
  updates.setEncoding('utf8');
  updates.on('data', injectUpdate);
  updates.connect('updates');

  var subscriptions = context.socket('PUSH');
  subscriptions.connect('subscriptions');

  // Not convinced about this proxy thing.
  scheduler_proxy.subscribe = function(topic) {
    subscriptions.write(JSON.stringify({subscribe: topic}));
  }
});


function injectUpdate(data) {
  console.warn({from_updates: data});
  var update = JSON.parse(data);
  var signal = spool.value(update['topic']);
  console.warn({writing_value: update['data']});
  signal.write(update['data']);
}

// Formulas

// url
function url(cell, url, client) {
  scheduler_proxy.subscribe(url);
  var signal = spool.value(url);
  signal.read(function(data) {
    client.write(JSON.stringify({update: data, type: 'value', cell: cell}));
  });
}

// atom(url)
function atom(cell, url, client) {
  scheduler_proxy.subscribe(url);
  rawkey = 'raw:' + url;
  var signal = spool.value(rawkey);

  // Ah now how do I make sure this happens only in one place?
  // Assuming we have one server isn't enough -- I'd have to assume
  // only one person wants any particular feed, or at least be happy
  // to repeat work.
  var buftopic = 'entries:' + url;
  var buffer = spool.buffer(buftopic);
  var metatopic = 'meta:' + url;
  var meta = spool.value(metatopic);
  shred_into(signal, meta, buffer);

  meta.read(function(data) {
    client.write(JSON.stringify({update: {meta: JSON.parse(data)},
                                 type: 'feed', cell: cell}));
  });
  buffer.last(10, function(entries) {
    console.warn({entries_from_buffer: entries});
    client.write(JSON.stringify({update: {entries: entries},
                                 type: 'feed', cell: cell}));
  });
}

function shred_into(signal, meta, buffer) {
  signal.read(function(data) {
    var entries = [];
    if (data) {
      var doc = xml.parseXmlString(data);
      var props = {
        title: doc.root().get('/atom:feed/atom:title', NAMESPACES).text(),
      };
      meta.write(JSON.stringify(props));

      var atomentries = doc.root().find('//atom:entry', NAMESPACES);
      atomentries.forEach(function(entry) {
        removeOtherNamespaces(entry, NAMESPACES['atom']);
        entries.push({'id': entry.get('atom:id', NAMESPACES).text(),
                      'data': entry.toString(),
                      'timestamp': +new Date(entry.get('atom:updated', NAMESPACES).text())
                     });
      });
      buffer.append(entries);
    }
  });
}

// Interpreter for client commands
function clientConnection(conn) {
  // only UTF8 is supported anyway
  //conn.setEncoding('utf8');
  conn.on('data', function(data) {
    try {
      var command = JSON.parse(data);
      // {apply: formula, cell: address}
      if (command.apply !== undefined && command.cell !== undefined) {
        var matches;
        if (matches = /atom\((.*)\)/.exec(command.apply)) {
          url = matches[1];
          atom(command.cell, url, conn);
        }
        else {
          url(command.cell, command.apply, conn);
        }
      }
      else {
        console.warn({command_error: "Unable to interpret command",
                      client_command: data});
        conn.write(JSON.stringify({error: "Unable to interpret command"}));
      }
    }
    catch (err) {
      console.warn({command_error: err, client_command: data});
    }
  });
}

// start the sceduler

require('./scheduler').start();

// === unused for now

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

