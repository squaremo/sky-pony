var socket = new SockJS('/socket');

model = {};

model.memory = ko.observable(0);
model.memory_hwm = ko.computed(function() {
  return model.memory() > 50;
});

model.mps = ko.observable(0);

model.messages_window = new SlidingWindow(3);
model.messages_hwm = ko.computed(function() {
  return model.messages_window.average() > 20000;
});

// this probably won't work. bloody floats.
function decimalplaces(val, digits) {
  var mult = Math.pow(10, digits);
  var rounded = Math.round(val * mult);
  return rounded / mult;
}

socket.onmessage = function(msg) {
  var event = JSON.parse(msg.data);
  if (event.nodes) {
    var total = 0, number = 0;
    event.nodes.forEach(function(node) {
      total += (node.mem_used / node.mem_limit);
      number++;
    });
    model.memory(decimalplaces(100 * total / number, 2));
  }
  else if (event.overview) {
    model.mps(decimalplaces(event.overview.message_stats.publish_details.rate, 1));
    var mw = model.messages_window;
    mw.push(event.overview.queue_totals.messages);
  }
};
