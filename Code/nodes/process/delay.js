wcNodeProcess.extend('wcNodeProcessDelay', 'Delay', 'Core', {
  /**
   * @class
   * Waits for a specified amount of time before continuing the node chain.<br>
   * When inheriting, make sure to include 'this._super(parent, pos, name);' at the top of your init function.
   *
   * @constructor wcNodeProcessDelay
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [name="Delay"] - The name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, name) {
    this._super(parent, pos, name);

    // Create a finished exit that only triggers after the delay has elapsed.
    this.createExit('finished');

    // Create the message property so we know what to output in the log.
    this.createProperty('milliseconds', wcPlay.PROPERTY_TYPE.NUMBER, 1000);
  },

  /**
   * Event that is called when an entry link has been triggered.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onTriggered
   * @param {String} name - The name of the entry link triggered.
   */
  onTriggered: function(name) {
    this._super(name);

    // Always fire the 'out' link immediately.
    this.triggerExit('out');

    // Notify that this node is starting a synchronous process.
    this.wake();

    // Now set a timeout to wait for 'Milliseconds' amount of time.    
    var self = this;
    var delay = this.property('milliseconds');
    setTimeout(function() {
      // Once the time has completed, fire the 'Finished' link and put the node back to sleep.
      self.triggerExit('finished');
      self.sleep();
    }, delay);
  },
});
