wcNode.extend('wcNodeComposite', 'Composite', '', {
  /**
   * @class
   * The base class for all composite nodes. These are nodes that contain additional nodes inside.<br>
   *
   * @constructor wcNodeComposite
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);
    this.color = '#009999';
  },

  /**
   * Magic function that is called whenever any new class type is extended from this one.<br>
   * Handles initializing of the class as well as registering the new node type.
   * @function wcNodeComposite#classInit
   * @param {String} className - The name of the class constructor.
   * @param {String} type - The type name for the node.
   * @param {String} category - A category where this node will be grouped.
   */
  classInit: function(className, type, category) {
    if (category) {
      this.className = className;
      this.type = type;
      this.category = category;
      wcPlay.registerNodeType(className, type, category, wcPlay.NODE_TYPE.COMPOSITE);
    }
  },
});
