wcNodeStorage.extend('wcNodeStorageToggle', 'Toggle', 'Local', {
  /**
   * @class
   * Stores a boolean (toggleable) value.
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeStorageToggle
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("Stores a boolean (toggleable) value.");

    this.createProperty('not', wcPlay.PROPERTY.TOGGLE, true, {description: "If set, will assign the opposite to value."});
    this.createProperty('value', wcPlay.PROPERTY.TOGGLE, false);
  },

  /**
   * Event that is called when a property has changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeStorageToggle#onPropertyChanged
   * @param {String} name - The name of the property.
   * @param {Object} oldValue - The old value of the property.
   * @param {Object} newValue - The new value of the property.
   */
  onPropertyChanged: function(name, oldValue, newValue) {
    this._super(name, oldValue, newValue);

    if (name === 'not') {
      this.property('value', !newValue);
    }
  },
});
