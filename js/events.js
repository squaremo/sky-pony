// Things for processing events as they come in.

function Subscriber(socket) {

  var subscriptions = this.subs = {};
  socket.onmessage = function(msg) {
    var js = JSON.parse(msg.data);
    var event, topic;
    if ((event = js.update) && (topic = event.topic)) {
      if (subscriptions[topic]) {
        subscriptions[topic](event);
      }
    }
  };

  this.subscribe = function(url, callback) {
    subscriptions[url] = callback;
    socket.send(JSON.stringify({subscribe: url}));
  }
}

function SlidingWindow(len) {
  var self = this;

  this.samples = ko.observableArray();

  this.maximum = ko.computed(function() {
    var samples = self.samples();
    var max = samples[0], i = samples.length;
    while (--i > 0) {
      if (samples[i] > max) max = samples[i];
    }
    return max;
  }, self);

  // Yes yes, abstraction
  this.minimum = ko.computed(function() {
    var samples = self.samples();
    var min = samples[0], i = samples.length;
    while (--i > 0) {
      if (samples[i] < min) min = samples[i];
    }
    return min;
  }, self);

  // These ff might be easier given .added and .removed

  this.sum = ko.computed(function() {
    var sum = 0;
    self.samples().forEach(function(v) { sum += v; });
    return sum;
  });

  this.average = ko.computed(function() {
    var len = self.samples().length;
    return (len > 0) ? self.sum() / self.samples().length : 0;
  }, self);

  this.scaled = ko.computed(function() {
    var max = self.maximum();
    var values = [];
    self.samples().forEach(function(v, i) {
      values.push({index: i, value: (max > 0) ? v / max : 0});
    });
    return values;
  }, self);

  this.push = function(value) {
    if (self.samples().length + 1 > len) {
      self.samples.shift();
    }
    self.samples.push(value);
  }
}
