// Elements of a view model

// attrs: e.g., hwm
function Meter(observable, attributes) {
  this.value = observable;
  this.unit = attributes.unit || '';
  this.hwm = attributes.hwm && ko.computed(function() {
    return observable >= attributes.hwm;
  }) || false;
}
