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
  this.tiles.push(new Tile());
}

function Tile() {
  var that = this;
  this.editing = ko.observable(true);
  this.formula = ko.observable('');

  this.save = function() {
    that.editing(false);
  };

  this.edit = function() {
    that.editing(true);
  };

  this.view = ko.observable(new Formula(this.formula));
}

// === Views

function Stack(observableCollection, attributes) {
  this.entries = observableCollection;
  this.folded = ko.observable(true);
  this.template = 'carousel';
}

function Formula(formula) {
  this.value = formula;
  this.template = 'formula';
}

function Value(observable) {
  this.value = observable;
  this.template = 'value';
}
