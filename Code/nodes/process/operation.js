wcPlayNodes.wcNodeProcess.extend('wcNodeProcessOperation', 'Operation', 'Data Manipulation', {
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
    this.details("Activate the entry link of the operation you want to perform, either an addition, subtraction, multiplication, or division. The operation will then be performed using valueA and valueB, the result will be output to the result property.");

    // Remove our default entry.
    this.removeEntry('in');

    // Create an input link per operation type.
    this.createEntry('add', "valueA + valueB = result");
    this.createEntry('sub', "valueA - valueB = result");
    this.createEntry('mul', "valueA * valueB = result");
    this.createEntry('div', "valueA / valueB = result");

    // Create our two operator values.
    this.createProperty('valueA', wcPlay.PROPERTY.NUMBER, 0, {description: "Left hand value for the operation.", input: true});
    this.createProperty('valueB', wcPlay.PROPERTY.NUMBER, 0, {description: "Right hand value for the operation.", input: true});
    this.createProperty('result', wcPlay.PROPERTY.NUMBER, 0, {description: "The result of the operation.", output: true});
  },

  /**
   * Event that is called when an entry link has been activated.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessOperation#onActivated
   * @param {String} name - The name of the entry link triggered.
   */
  onActivated: function(name) {
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
    this.activateExit('out');
  },
});
