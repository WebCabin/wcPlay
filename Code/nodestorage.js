wcNodeStorage = wcNode.extend({
  /**
   * The base class for all storage nodes. These are nodes that interact with script variables and exchange data.<br>
   * When inheriting, make sure to include 'this._super(parent, name, pos);' at the top of your init function.
   * @class wcNodeStorage
   *
   * @param {String} parent - The parent object of this node.
   * @param {String} name - The name of the node, as displayed on the title bar.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, name, pos) {
    this._super(parent, name, pos);
  },
});