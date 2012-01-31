// Elements of a view model

// attrs: e.g., hwm
function Meter(observable, attributes) {
  this.value = observable;
  this.unit = attributes.unit || '';
  this.hwm = attributes.hwm && ko.computed(function() {
    return observable() >= attributes.hwm;
  }) || ko.observable(false) ;
  this.sparkline = attributes.sparkline;
  this.has_sparkline = !!attributes.sparkline;
}
