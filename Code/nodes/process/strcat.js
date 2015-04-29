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

    // Create our two operator values.
    this.createProperty('valueA', wcPlay.PROPERTY.STRING, '', {description: "The left side string to join."});
    this.createProperty('valueB', wcPlay.PROPERTY.STRING, '', {description: "The right side string to join."});
    this.createProperty('result', wcPlay.PROPERTY.STRING, '', {description: "The concatenated result."});
  },

  /**
   * Event that is called when an entry link has been triggered.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessStrCat#onTriggered
   * @param {String} name - The name of the entry link triggered.
   */
  onTriggered: function(name) {
    this._super(name);

    // Immediately activate the 'out' Exit link.
    this.activateExit('out');
    this.property('result', this.property('valueA').toString() + this.property('valueB'));
  },
});
