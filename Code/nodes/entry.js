wcPlayNodes.wcNode.extend('wcNodeEntry', 'Entry Node', '', {
  /**
   * The base class for all entry nodes. These are nodes that start script chains.
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * <br><b>Should be inherited and never constructed directly</b>.
   * @class wcNodeEntry
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);
    this.color = '#CCCC00';

    // Create a default exit link.
    this.createExit('out');
  },

  /**
   * Magic function that is called whenever any new class type is extended from this one.
   * Handles initializing of the class as well as registering the new node type.
   * @function wcNodeEntry#classInit
   * @param {string} className - The name of the class constructor.
   * @param {string} type - The type name for the node.
   * @param {string} category - A category where this node will be grouped.
   */
  classInit: function(className, type, category) {
    if (category) {
      this.className = className;
      this.type = type;
      this.nodeType = wcPlay.NODE.ENTRY;
      this.category = category;
      wcPlay.registerNodeType(className, type, category, wcPlay.NODE.ENTRY);
    }
  },

  /**
   * Overloading the default onActivated event handler so we can make it immediately trigger our Exit link.
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeEntry#onActivated
   * @param {string} name - The name of the entry link triggered.
   */
  onActivated: function(name) {
    this._super(name);
    this.activateExit('out');
  },
});

