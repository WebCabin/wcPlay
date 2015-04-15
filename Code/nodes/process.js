wcNode.extend('wcNodeProcess', 'Node Process', 'Core', {
  /**
   * @class
   * The base class for all process nodes. These are nodes that make up the bulk of script chains.<br>
   * When inheriting, make sure to include 'this._super(parent, pos, name);' at the top of your init function.
   *
   * @constructor wcNodeProcess
   * @description
   * <b>Should be inherited and never constructed directly.</b>
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [name="Node Process"] - The name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, name) {
    this._super(parent, pos, name);

    // Create a default links.
    this.createEntry('In');
    this.createExit('Out');
  },

  /**
   * Magic function that is called whenever any new class type is extended from this one.<br>
   * Handles initializing of the class as well as registering the new node type.
   * @function wcNodeProcess#classInit
   * @param {wcNode} this - The new class type.
   * @param {String} className - The name of the class constructor.
   * @param {String} name - A display name for the node.
   * @param {String} category - A category where this node will be grouped.
   */
  classInit: function(className, name, category) {
    this.className = className;
    this.name = name;
    this.category = category;
    wcPlay.registerNodeType(name, className, wcPlay.NODE_TYPE.PROCESS);
  },
});

// wcNodeProcess.prototype.classInit = function(className, name) {
//   this.className = className;
//   this.name = name;
//   wcPlay.registerNodeType(name, className, wcPlay.NODE_TYPE.PROCESS);
// };

