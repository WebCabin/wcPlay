wcPlayNodes.wcNode.extend('wcNodeComposite', 'Composite', '', {
  /**
   * The base class for all composite nodes.
   * @class wcNodeComposite
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);
    this.color = '#990099';

    this.removeEntry('in');
    this.removeExit('out');
  },

  /**
   * Magic function that is called whenever any new class type is extended from this one.
   * Handles initializing of the class as well as registering the new node type.
   * @function wcNodeComposite#classInit
   * @param {string} className - The name of the class constructor.
   * @param {string} type - The type name for the node.
   * @param {string} category - A category where this node will be grouped.
   */
  classInit: function(className, type, category) {
    if (category) {
      this.className = className;
      this.type = type;
      this.nodeType = wcPlay.NODE.COMPOSITE;
      this.category = category;
      wcPlay.registerNodeType(className, type, category, wcPlay.NODE.COMPOSITE);
    }
  }
});
