var snrub = require('snrub'),
  context = require('rabbit.js').createContext();

// ==== Subscription server

var scheduler = snrub.createPoller();

// Listen for subscription requests, subscribe if necessary, and
// publish updates.

context.on('ready', function() {
  var pub = context.socket('PUB');
  pub.connect('updates');
  scheduler.on('update', function(topic, data, headers) {
    pub.write(JSON.stringify({topic: topic, data: data, headers: headers}));;
  });

  var req = context.socket('PULL');
  req.connect('subscriptions');
  req.setEncoding('utf8');
  req.on('data', subscriptionRequest);
});

function subscriptionRequest(str) {
  try {
    var req = JSON.parse(str);
    console.info({request: req});
    if (req['subscribe']) {
      scheduler.register(req.subscribe);
    }
  }
  catch (err) {
    console.warn({error: "Subscription request failed", reason: err});
  }
}
