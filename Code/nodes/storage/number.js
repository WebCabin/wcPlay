wcNodeStorage.extend('wcNodeStorageNumber', 'Number', 'Core', {
  /**
   * @class
   * Stores a number value.<br>
   * When inheriting, make sure to include 'this._super(parent, pos, type);' at the top of your init function.
   *
   * @constructor wcNodeStorageNumber
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [type="Number"] - The type name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, type) {
    this._super(parent, pos, type);

    this.createProperty('value', wcPlay.PROPERTY_TYPE.NUMBER);
  },
});
