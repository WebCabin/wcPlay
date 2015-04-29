wcNodeProcess.extend('wcNodeProcessDelay', 'Delay', 'Flow Control', {
  /**
   * @class
   * Waits for a specified amount of time before continuing the flow chain.<br>
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeProcessDelay
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("Waits for a specified amount of time before continuing the flow chain.");

    this.createProperty('milliseconds', wcPlay.PROPERTY.NUMBER, 1000, {description: "The time delay, in milliseconds, to wait before firing the 'out' Exit link."});
  },

  /**
   * Event that is called when an entry link has been triggered.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessDelay#onTriggered
   * @param {String} name - The name of the entry link triggered.
   */
  onTriggered: function(name) {
    this._super(name);

    // Now set a timeout to wait for 'Milliseconds' amount of time.    
    var delay = this.property('milliseconds');

    // Start a timeout event using the node's built in timeout handler.
    this.setTimeout(function() {
      this.activateExit('out');
    }, delay);
  },
});
