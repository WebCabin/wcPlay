wcNodeProcess = wcNode.extend({
  /**
   * The base class for all process nodes. These are nodes that make up the bulk of script chains.<br>
   * When inheriting, make sure to include 'this._super(parent, name, pos);' at the top of your init function.
   * @class wcNodeProcess
   *
   * @param {String} parent - The parent object of this node.
   * @param {String} name - The name of the node, as displayed on the title bar.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, name, pos) {
    this._super(parent, name, pos);

    // Create a default links.
    this.createEntry('In');
    this.createExit('Out');
  },
});