var socket = new SockJS('/socket');

model = {};

model.memory = ko.observable(0);
model.memory_hwm = ko.computed(function() {
  return model.memory() > 50;
});

model.mps = ko.observable(0);

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

  this.scaled = ko.computed(function() {
    var max = self.maximum();
    var values = [];
    self.samples().forEach(function(v, i) {
      values.push({index: i, value: (max > 0) ? v / max : 0});
    });
    return values;
  }, self);

  this.add = function(value) {
    if (self.samples().length + 1 > len) {
      self.samples.shift();
    }
    self.samples.push(value);
  }
}
model.messages_window = new SlidingWindow(7);

// this probably won't work. bloody floats.
function decimalplaces(val, digits) {
  var mult = Math.pow(10, digits);
  var rounded = Math.round(val * mult);
  return rounded / mult;
}

socket.onmessage = function(msg) {
  console.log(msg.data);
  var event = JSON.parse(msg.data);
  if (event.nodes) {
    var total = 0, number = 0;
    event.nodes.forEach(function(node) {
      total += (node.mem_used / node.mem_limit);
      number++;
    });
    console.log(total / number);
    model.memory(decimalplaces(100 * total / number, 2));
  }
  else if (event.overview) {
    model.mps(decimalplaces(event.overview.message_stats.publish_details.rate, 1));
    var mw = model.messages_window;
    mw.add(event.overview.queue_totals.messages);
  }
};
