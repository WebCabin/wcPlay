wcPlayNodes.wcNode.extend('wcNodeProcess', 'Node Process', '', {
  /**
   * The base class for all process nodes. These are nodes that make up the bulk of script chains.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * <br><b>Should be inherited and never constructed directly</b>.
   * @class wcNodeProcess
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);
    this.color = '#007ACC';

    // Create a default links.
    this.createEntry('in');
    this.createExit('out');
  },

  /**
   * Magic function that is called whenever any new class type is extended from this one.
   * <br>Handles initializing of the class as well as registering the new node type.
   * @function wcNodeProcess#classInit
   * @param {string} className - The name of the class constructor.
   * @param {string} type - The type name for the node.
   * @param {string} category - A category where this node will be grouped.
   */
  classInit: function(className, type, category) {
    if (category) {
      this.className = className;
      this.type = type;
      this.nodeType = wcPlay.NODE.PROCESS;
      this.category = category;
      wcPlay.registerNodeType(className, type, category, wcPlay.NODE.PROCESS);
    }
  }
});
