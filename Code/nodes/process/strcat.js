wcNodeProcess.extend('wcNodeProcessStrCat', 'String Concat', 'Data Manipulation', {
  /**
   * @class
   * Formats a templated string by replacing template commands with the value of other properties.
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeProcessStrCat
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("Concatenates two string values.");
    this.details("This takes the string of valueA and appends valueB to it, the result is stored in the result property.");

    // Create our two operator values.
    this.createProperty('valueA', wcPlay.PROPERTY.STRING, '', {description: "The left side string to join."});
    this.createProperty('valueB', wcPlay.PROPERTY.STRING, '', {description: "The right side string to join."});
    this.createProperty('result', wcPlay.PROPERTY.STRING, '', {description: "The concatenated result."});
  },

  /**
   * Event that is called when an entry link has been activated.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessStrCat#onActivated
   * @param {String} name - The name of the entry link triggered.
   */
  onActivated: function(name) {
    this._super(name);

    this.property('result', this.property('valueA').toString() + this.property('valueB'));
    this.activateExit('out');
  },
});
