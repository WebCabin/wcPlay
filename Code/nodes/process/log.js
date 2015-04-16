wcNodeProcess.extend('wcNodeProcessLog', 'Log', 'Core', {
  /**
   * @class
   * For debugging purposes, will print out a message into the console log the moment it is activated. Ignores [silent mode]{@link wcPlay~Options}.<br>
   * When inheriting, make sure to include 'this._super(parent, pos, name);' at the top of your init function.
   *
   * @constructor wcNodeProcessLog
   * @description
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [name="Log"] - The name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, name) {
    this._super(parent, pos, name);

    this.createEntry('something');
    this.createEntry('somethingelse');

    // Create the message property so we know what to output in the log.
    this.createProperty('Message', wcPlay.PROPERTY_TYPE.STRING, 'Log message.');
  },

  /**
   * Event that is called when an entry link has been triggered.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onTriggered
   * @param {String} name - The name of the entry link triggered.
   */
  onTriggered: function(name) {
    this._super(name);

    var msg = this.property('Message');
    console.log('LOG: ' + msg);
    this.triggerExit('Out');
  },
});
