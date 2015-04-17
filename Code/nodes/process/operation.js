wcNodeProcess.extend('wcNodeProcessOperation', 'Operation', 'Core', {
  /**
   * @class
   * Performs a simple math operation on two values.
   * When inheriting, make sure to include 'this._super(parent, pos, type);' at the top of your init function.
   *
   * @constructor wcNodeProcessOperation
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [name="Log"] - The name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, type) {
    this._super(parent, pos, type);

    // Remove our default entry.
    this.removeEntry('in');

    // Create an input link per operation type.
    this.createEntry('add');
    this.createEntry('sub');
    this.createEntry('mul');
    this.createEntry('div');

    // Create our two operator values.
    this.createProperty('valueA', wcPlay.PROPERTY_TYPE.NUMBER, 0);
    this.createProperty('valueB', wcPlay.PROPERTY_TYPE.NUMBER, 0);
    this.createProperty('result', wcPlay.PROPERTY_TYPE.NUMBER, 0);
  },

  /**
   * Event that is called when an entry link has been triggered.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onTriggered
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

    this.property('result', result);
    this.triggerExit('out');
  },
});
