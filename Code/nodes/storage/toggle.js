wcNodeStorage.extend('wcNodeStorageToggle', 'Toggle', 'Core', {
  /**
   * @class
   * Stores a boolean (toggleable) value.
   * When inheriting, make sure to include 'this._super(parent, pos, type);' at the top of your init function.
   *
   * @constructor wcNodeStorageToggle
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [type="Toggle"] - The type name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, type) {
    this._super(parent, pos, type);

    this.createProperty('value', wcPlay.PROPERTY_TYPE.TOGGLE, false);
  },
});
