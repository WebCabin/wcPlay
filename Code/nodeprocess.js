wcNodeProcess = wcNode.extend({
  /**
   * The base class for all process nodes. These are nodes that make up the bulk of script chains.<br>
   * When inheriting, make sure to include 'this._super(parent, name, pos);' at the top of your init function.
   * @class wcNodeProcess
   *
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} name - The name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, name) {
    this._super(parent, pos, name);

    // Create a default links.
    this.createEntry();
    this.createExit();
  },
});