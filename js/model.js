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
  this.evaluating = ko.observable(false);

  this.save = function() {
    that.editing(false);
  };

  this.edit = function() {
    that.editing(true);
  };

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
