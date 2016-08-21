wcPlayNodes.wcNodeStorage.extend('wcNodeStorageNumber', 'Number', 'Local', {
  /**
   * Stores a number value.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * @class wcNodeStorageNumber
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description('Stores a number value.');

    this.createProperty('value', wcPlay.PROPERTY.NUMBER, '', {input: true, output: true});
  }
});
