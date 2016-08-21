wcPlayNodes.wcNodeStorage.extend('wcNodeStorageString', 'String', 'Local', {
  /**
   * Stores a string value.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * @class wcNodeStorageString
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description('Stores a string value.');

    this.createProperty('value', wcPlay.PROPERTY.STRING, '', {multiline: true, input: true, output: true});
  }
});
