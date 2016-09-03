wcPlayNodes.wcNodeEntry.extend('wcNodeEntryRemote', 'Remote Event', 'Flow Control', {
  /**
   * An entry node that fires when a [Call Remote Event Node]{@link wcNodeEntryCallRemote} of the same name is activated.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * @class wcNodeEntryRemote
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description('An entry node that fires when a Call Remote Event Node of the same name is activated.');
    this.details('This node uses it\'s Title Name value as an identifier that links it with any Call Remote Event Nodes of the same name. Whenever any Call Remote Event Node of the same name is activated, this Node will become active as well. If multiple Remote Nodes exist with the same name, they will all be called in parallel.');
  }
});
