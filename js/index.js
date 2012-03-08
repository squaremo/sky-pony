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

model.add = function(tile) {
  tile.column().newTile();
};

model.loadColumns = function() {
  $.getJSON('/user/columns', function(js) {
    js.columns.forEach(function(def) {
      model.columnDefs.push(Column.fromJS(def));
    });
  });
};

var socket = new SockJS('/socket');
var subscriber = new Subscriber(socket);

model.save = function(tile) {
  tile.save();
  tile.evaluating(true);
  var url = tile.formula();
  var updater = false;
  // Garbage collection. This should probably be done more
  // declaratively: say what the situation should be and let the
  // server sort it out.
  tile.view(new Formula(url));
  subscriber.apply(tile.cell, url, function(updateMsg) {
    // first time we get an update, look at the content type to see
    // what kind of tile we should make.
    if (!updater) {
      var contentType = updateMsg['type'];
      console.info(updateMsg);
      if (contentType == 'feed') {
        var title = ko.observable();
        var entries = ko.observableArray([]);

        tile.view(new Stack(title, entries, {}));
        updater = function(update) {
          if (update['meta']) {
            title(update.meta.title);
          }
          if (update['entries']) {
            var newEntries = update['entries'], len = newEntries.length;
            for (var i = 0; i < len; i++) {
              var entry = $.parseXML(newEntries[i].data);
              entries.push({
                title: $('title', entry).text(),
                href: $('link[rel=alternate]', entry).attr('href')
              });
            }
          }
        }
      }
      else {
        var value = ko.observable(url);
        tile.view(new Resource(value, contentType));
        updater = function(update) {
          value(update);
        }
      }
    }
    tile.evaluating(false);
    updater(updateMsg.update);
  });
};

model.loadColumns();
