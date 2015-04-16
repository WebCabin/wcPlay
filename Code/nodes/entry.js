wcNode.extend('wcNodeEntry', 'Entry Node', '', {
  /**
   * @class
   * The base class for all entry nodes. These are nodes that start script chains.<br>
   * When inheriting, make sure to include 'this._super(parent, pos, name);' at the top of your init function.
   *
   * @constructor wcNodeEntry
   * @description
   * <b>Should be inherited and never constructed directly.</b>
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [name="Entry Node"] - The name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, name) {
    this._super(parent, pos, name);
    this.color = '#CCCC00';
    this.colorAccent = '#888800';

    // Create a default exit link.
    this.createExit('out');

    // Add a manual trigger control.
    this.createProperty(wcNode.PROPERTY.TRIGGER, wcPlay.PROPERTY_TYPE.TOGGLE, false);
  },

  /**
   * Magic function that is called whenever any new class type is extended from this one.<br>
   * Handles initializing of the class as well as registering the new node type.
   * @function wcNodeEntry#classInit
   * @param {wcNode} this - The new class type.
   * @param {String} className - The name of the class constructor.
   * @param {String} name - A display name for the node.
   * @param {String} category - A category where this node will be grouped.
   */
  classInit: function(className, name, category) {
    if (category) {
      this.className = className;
      this.name = name;
      this.category = category;
      wcPlay.registerNodeType(className, name, category, wcPlay.NODE_TYPE.ENTRY);
    }
  },

  /**
   * Overloading the default onTriggered event handler so we can make it immediately trigger our exit link if our conditions are met.
   * @function wcNodeEntry#onTriggered
   * @see wcNodeEntry#triggerCondition
   * @param {Object} [data] - A custom data object passed in from the triggerer.
   */
  onTriggered: function(data) {
    if (this.triggerCondition(data)) {
      this.triggerExit('out');
    }
  },

  /**
   * Overload this in inherited nodes if you want to apply a condition when this entry node is triggered.
   * @function wcNodeEntry#triggerCondition
   * @returns {Boolean} - Whether the condition passes and the entry node should trigger (true by default).
   * @param {Object} [data] - A custom data object passed in from the triggerer.
   */
  triggerCondition: function(data) {
    return true;
  },

  /**
   * Event that is called when a property has changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onPropertyChanged
   * @param {String} name - The name of the property.
   * @param {Object} oldValue - The old value of the property.
   * @param {Object} newValue - The new value of the property.
   */
  onPropertyChanged: function(name, oldValue, newValue) {
    this._super(name, oldValue, newValue);

    // Manually trigger the event.
    if (name === wcNode.PROPERTY.TRIGGER && newValue) {
      this.triggerExit('out');

      // Turn the toggle back off so it can be used again.
      this.property(wcNode.PROPERTY.TRIGGER, false);
    }
  },
});

