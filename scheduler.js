var snrub = require('snrub'),
  context = require('rabbit.js').createContext();

// ==== Subscription server

exports.start = function() {

  var scheduler = snrub.createPoller();

  // Listen for subscription requests, subscribe if necessary, and
  // publish updates.

  context.on('ready', function() {
    var pub = context.socket('PUB');
    pub.connect('updates');
    scheduler.on('update', function(topic, data, headers) {
      console.warn({polled_update: data, headers: headers});
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
      console.warn({subscription_request: req});
      if (req['subscribe']) {
        // %%% Artificially low polling interval
        scheduler.register(req.subscribe, {baseInterval: 60});
      }
    }
    catch (err) {
      console.warn({error: "Subscription request failed", reason: err});
    }
  }

}
