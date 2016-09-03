wcPlayNodes.wcNodeEntry.extend('wcNodeEntryInterval', 'Interval', 'Automatic', {
  /**
   * An entry node that fires continuously on a regular interval.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * @class wcNodeEntryInterval
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description('Once the script starts, this will activate continuously on a time interval defined by the milliseconds property.');

    this.createProperty('milliseconds', wcPlay.PROPERTY.NUMBER, 1000, {description: 'The time, in milliseconds, per update.', input: true});
  },

  /**
   * Overloading the default onActivated event handler so we can make it trigger our exit link on an interval.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeEntryInterval#onActivated
   * @param {string} name - The name of the entry link triggered.
   */
  onActivated: function(name) {
    this._super(name);
    this.resetThreads();

    var interval = this.property('milliseconds');
    this.setInterval(function() {
      this.activateExit('out');
    }, interval);
  },

  /**
   * Event that is called as soon as the Play script has started.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeEntryInterval#onStart
   */
  onStart: function() {
    this._super();

    this.onActivated();
  },

  /**
   * Event that is called when a property has changed.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeEntryInterval#onPropertyChanged
   * @param {string} name - The name of the property.
   * @param {Object} oldValue - The old value of the property.
   * @param {Object} newValue - The new value of the property.
   */
  onPropertyChanged: function(name, oldValue, newValue) {
    this._super(name, oldValue, newValue);

    if (name === 'milliseconds') {
      this.onActivated();
    }
  }
});
