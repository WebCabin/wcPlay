wcPlayNodes.wcNodeProcess.extend('wcNodeProcessConsoleLog', 'Console Log', 'Debugging', {
  /**
   * For debugging purposes, will print out a message into the console log the moment it is activated. [Silent mode]{@link wcPlay~Options} will silence this node.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * @class wcNodeProcessConsoleLog
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description('For debugging purposes, will print out a message into the console log when activated (only if silent mode is not on).');

    // Create the message property so we know what to output in the log.
    this.createProperty('message', wcPlay.PROPERTY.STRING, 'msg', {description: 'The message that will appear in the console log.', input: true});
  },

  /**
   * Event that is called when an entry link has been activated.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessConsoleLog#onActivated
   * @param {string} name - The name of the entry link triggered.
   */
  onActivated: function(name) {
    this._super(name);

    // Always trigger the out immediately.
    this.activateExit('out');

    // Cancel the log in silent mode.
    var engine = this.engine();
    if (!engine || engine.silent()) {
      return;
    }

    var msg = this.property('message');
    console.log(msg);
  }
});
