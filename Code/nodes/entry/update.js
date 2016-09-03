wcPlayNodes.wcNodeEntry.extend('wcNodeEntryUpdate', 'Update', 'Automatic', {
  /**
   * An entry node that fires continuously as soon as the flow chain has finished.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * @class wcNodeEntryUpdate
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description('Once the script starts, this will activate continuously any time attached nodes have finished.');
  },

  /**
   * Overloading the default onActivated event handler so we can make it immediately trigger our exit link if our conditions are met.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeEntryUpdate#onActivated
   * @param {string} name - The name of the entry link triggered.
   */
  onActivated: function(name) {
    this._super(name);
    this.resetThreads();

    this.activateExit('out', function() {
      this.onActivated();
    });
  },

  /**
   * Event that is called as soon as the Play script has started.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeEntryUpdate#onStart
   */
  onStart: function() {
    this._super();

    this.onActivated();
  },

  /**
   * Event that is called when a property has changed.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeEntryUpdate#onPropertyChanged
   * @param {string} name - The name of the property.
   * @param {Object} oldValue - The old value of the property.
   * @param {Object} newValue - The new value of the property.
   */
  onPropertyChanged: function(name, oldValue, newValue) {
    this._super(name, oldValue, newValue);

    if (name === 'milliseconds') {
      this.resetThreads();
      this.onActivated();
    }
  }
});
