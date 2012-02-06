var socket = new SockJS('/socket');

model = {'columnTitle': "RabbitMQ health"};

var meters = model.meters = [];

var memory = ko.observable(0);
meters.push(new Meter(memory, {'unit': '% memory',
                               'precision': 1,
                               'hwm': 50}));

var mps = ko.observable(0);
meters.push(new Meter(mps, {'unit': 'msg / sec',
                            'precision': 0}));

var messages_window = new SlidingWindow(3);
var big_messages_window = new SlidingWindow(20);
meters.push(new Meter(messages_window.average,
                      {'unit': 'moving avg total msgs',
                       'precision': 0,
                       'hwm': 100000,
                       'sparkline': big_messages_window}));

var sparkline_opts1 = {
  'composite': true,
  'type': 'bar',
  'width': '320px',
  'height': '80px',
  'chartRangeMin': 0,
  'barColor': '#ccc',
  'barWidth': 14
};

function sparkline_opts2(len) {
  return {
    'type': 'line',
    'width': (len * 16) + 'px',
    'height': '80px',
    'chartRangeMin': 0,
    'spotColor': '#fff',
    'lineColor': '#666',
    'fillColor': '#ccc'
  };
}

ko.bindingHandlers.sparkline = {
  init: function(element, valueAccessor, _allBindingsAccessor) {
    $(element).sparkline(valueAccessor().samples(), sparkline_opts1);
  },
  update: function(element, valueAccessor, _allBindingsAccessor) {
    var samples = valueAccessor().samples();
    $(element).sparkline(valueAccessor().average(), sparkline_opts2(samples.length));
//    $(element).sparkline(samples, sparkline_opts1);
  }
}

socket.onmessage = function(msg) {
  var event = JSON.parse(msg.data);
  if (event.nodes) {
    var total = 0, number = 0;
    event.nodes.forEach(function(node) {
      total += (node.mem_used / node.mem_limit);
      number++;
    });
    memory(decimalplaces(100 * total / number, 2));
  }
  else if (event.overview) {
    mps(decimalplaces(event.overview.message_stats.publish_details.rate, 1));
    messages_window.push(event.overview.queue_totals.messages);
    big_messages_window.push(event.overview.queue_totals.messages);
  }
};
