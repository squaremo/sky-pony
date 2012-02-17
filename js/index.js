// Constraint: this (eventually) needs to be a JSONable value, or at
// least something that can be sent over a network protocol. This has
// to be able to be assembled into a value-producing thunk,
// effectively.

var model = {
  leftmostColumn: ko.observable(0),
  numVisibleColumns: ko.observable(1),
  columnDefs: ko.observableArray()
};

model.visibleColumns = ko.computed(function() {
  var cols = [];
  var defs = model.columnDefs();
  var leftmost = model.leftmostColumn();
  var maxCols = defs.length;
  var possCols = leftmost + model.numVisibleColumns();
  for (var i = leftmost; i < possCols && i < maxCols; i++) {
    cols.push({index: i, def: defs[i]});
  }
  return cols;
});

model.addColumn = function() {
  model.columnDefs.push(new Column());
};

var socket = new SockJS('/socket');
var subscriber = new Subscriber(socket);

model.save = function(tile) {
  tile.save();
  var url = tile.formula();
  var updater = false;
  // Garbage collection. This should probably be done more
  // declaratively: say what the situation should be and let the
  // server sort it out.
  subscriber.subscribe(url, function(update) {
    // first time we get an update, look at the content type to see
    // what kind of tile we should make.
    if (!updater) {
      var contentType = update.contentType;
      if (contentType === 'application/atom+xml') {
        var entries = ko.observableArray();
        tile.view(new Stack(ko.observable(update.topic), entries));
        updater = function(entry) {
          var xml = $.parseXML(entry.data);
          entries.push({
            'title': $('title', xml).text(),
            'href': $('link[rel="alternate"]', xml).attr('href')
          });
        }
      }
      else {
        value = ko.observable(update.data);
        tile.view(new Value(value));
        updater = function(entry) {
          value(entry.data);
        }
      }
    }
    updater(update);
  });
};
