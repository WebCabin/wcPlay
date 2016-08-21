wcPlayNodes.wcNodeStorage.extend('wcNodeStorageToggle', 'Toggle', 'Local', {
  /**
   * Stores a boolean (toggleable) value.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * @class wcNodeStorageToggle
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description('Stores a boolean (toggleable) value.');

    this.createProperty('value', wcPlay.PROPERTY.TOGGLE, false, {input: true, output: true});
  }
});
