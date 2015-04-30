wcNodeEntry.extend('wcNodeEntryStart', 'Start', 'Automatic', {
  /**
   * @class
   * An entry node that fires as soon as the script [starts]{@link wcPlay#start}.<br>
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeEntryStart
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("When the script starts, this will activate immediately and only once.");
  },

  /**
   * Event that is called as soon as the Play script has started.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeEntryStart#onStart
   */
  onStart: function() {
    this._super();
    this.onActivated();
  },
});