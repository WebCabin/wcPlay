wcNodeStorage.extend('wcNodeStorageString', 'String', 'Core', {
  /**
   * @class
   * The base class for all storage nodes. These are nodes that interact with script variables and exchange data.<br>
   * When inheriting, make sure to include 'this._super(parent, pos, type);' at the top of your init function.
   *
   * @constructor wcNodeStorageString
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [type="String"] - The type name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, type) {
    this._super(parent, pos, type);

    this.createProperty('value', wcPlay.PROPERTY_TYPE.STRING, '', {multiline: true});
  },
});
