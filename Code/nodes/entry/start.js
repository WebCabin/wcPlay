wcNodeEntry.extend('wcNodeEntryStart', 'Start', 'Core', {
  /**
   * @class
   * An entry node that fires as soon as the script [starts]{@link wcPlay#start}.<br>
   * When inheriting, make sure to include 'this._super(parent, pos, type);' at the top of your init function.
   *
   * @constructor wcNodeEntryStart
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [type="Start"] - The type name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, type) {
    this._super(parent, pos, type);
  },

  /**
   * Event that is called as soon as the Play script has started.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeEntryStart#onStart
   */
  onStart: function() {
    this._super();
    this.onTriggered();
  },
});