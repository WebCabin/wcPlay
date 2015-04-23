wcNodeProcess.extend('wcNodeProcessOperation', 'Operation', 'Core', {
  /**
   * @class
   * Performs a simple math operation on two values.
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeProcessOperation
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("Performs a simple math operation on two values.");

    // Remove our default entry.
    this.removeEntry('in');

    // Create an input link per operation type.
    this.createEntry('add', "valueA + valueB = result");
    this.createEntry('sub', "valueA - valueB = result");
    this.createEntry('mul', "valueA * valueB = result");
    this.createEntry('div', "valueA / valueB = result");

    // Create our two operator values.
    this.createProperty('valueA', wcPlay.PROPERTY.NUMBER, 0, {description: "Left hand value for the operation."});
    this.createProperty('valueB', wcPlay.PROPERTY.NUMBER, 0, {description: "Right hand value for the operation."});
    this.createProperty('result', wcPlay.PROPERTY.NUMBER, 0, {description: "The result of the operation."});
  },

  /**
   * Event that is called when an entry link has been triggered.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessOperation#onTriggered
   * @param {String} name - The name of the entry link triggered.
   */
  onTriggered: function(name) {
    this._super(name);

    var a = parseFloat(this.property('valueA'));
    var b = parseFloat(this.property('valueB'));
    var result;

    switch (name) {
      case 'add': result = a + b; break;
      case 'sub': result = a - b; break;
      case 'mul': result = a * b; break;
      case 'div': result = a / b; break;
    }

    this.property('result', result, true);
    this.triggerExit('out');
  },
});
