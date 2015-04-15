wcNode.extend('wcNodeStorage', 'Storage', 'Core', {
  /**
   * @class wcNodeStorage
   * The base class for all storage nodes. These are nodes that interact with script variables and exchange data.<br>
   * When inheriting, make sure to include 'this._super(parent, pos, name);' at the top of your init function.
   *
   * @constructor wcNodeStorage
   * @description
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [name="Storage"] - The name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, name) {
    this._super(parent, pos, name);

    this.createProperty('Value', wcPlay.PROPERTY_TYPE.STRING, '');
  },

  /**
   * Event that is called as soon as the Play script has started.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeStorage#onStart
   */
  onStart: function() {
    this._super();

    // Force a property change event so all connected nodes receive our value.
    this.property('Value', this.property('Value'), true);
  },
});
