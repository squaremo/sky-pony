// Elements of a view model

// this probably won't work. bloody floats.
function decimalplaces(val, digits) {
  var mult = Math.pow(10, digits);
  var rounded = Math.round(val * mult);
  return rounded / mult;
}

// attrs: e.g., hwm
function Meter(observable, attributes) {
  if (attributes.precision !== undefined) {
    this.value = ko.computed(function() {
      return decimalplaces(observable(), attributes.precision);
    });
  }
  else {
    this.value = observable;
  }
  this.unit = attributes.unit || '';
  this.hwm = attributes.hwm && ko.computed(function() {
    return observable() >= attributes.hwm;
  }) || ko.observable(false) ;
  this.sparkline = attributes.sparkline;
  this.has_sparkline = !!attributes.sparkline;
}

function Column() {
  this.tiles = ko.observableArray();
}
Column.prototype.newTile = function() {
  var t = new Tile(this);
  this.add(t);
  return t;
};
Column.prototype.add = function(tile) {
  this.tiles.push(tile);
};
Column.prototype.toJS = function() {
  var entries = [];
  this.tiles().forEach(function(tile) {
    entries.push({formula: tile.formula()});
  });
  return entries;
}
Column.fromJS = function(defs) {
  var col = new Column();
  defs.forEach(function(def) {
    var tile = new Tile(col);
    tile.formula(def.formula);
    col.add(tile);
  });
  return col;
};

function Tile(col) {
  var that = this;
  this.column = ko.observable(col);
  this.formula = ko.observable('');
  this.evaluating = ko.observable(false);

  this.cell = "[0][0]";

  this.view = ko.observable(new Formula(this.formula));
}

// === Views

function Resource(url, observableTitle, contentType) {
  this.url = url;
  this.title = observableTitle;
  this.type = contentType;
  this.template = 'resource';
}

function Stack(observableTitle, observableCollection, attributes) {
  this.title = observableTitle;
  this.entries = observableCollection;
  this.folded = ko.observable(true);
  this.toggle = function() { this.folded(!this.folded()); };
  this.template = 'stack';
}

function Formula(formula) {
  this.value = formula;
  this.template = 'formula';
}

function Value(observable) {
  this.value = observable;
  this.template = 'value';
}

// === Knockout bindings

/*
ko.bindingHandlers.carousel = {
  'init': function(elem) {
    $(elem).addClass('carousel');
    $(elem).carousel({nextPrevLinks: true, noOfRows: 1, itemsPerPage: 1});
  },
  'update': function() {}
};
*/
