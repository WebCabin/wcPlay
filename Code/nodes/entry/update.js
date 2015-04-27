wcNodeEntry.extend('wcNodeEntryUpdate', 'Update', 'Core', {
  /**
   * @class
   * An entry node that fires continuously on a regular update.<br>
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeEntryUpdate
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("Event that fires continuously.");

    this.createProperty("milliseconds", wcPlay.PROPERTY.NUMBER, 1000, {description: "The time, in milliseconds, per update."});
  },

  /**
   * Overloading the default onTriggered event handler so we can make it immediately trigger our exit link if our conditions are met.
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeEntryUpdate#onTriggered
   * @param {String} name - The name of the entry link triggered.
   */
  onTriggered: function(name) {
    var self = this;
    this.reset();
    function __update() {
      self.activateExit('out');
      self.finishThread(threadID);
      threadID = self.beginThread(setTimeout(__update, self.property('milliseconds')));
    };

    var threadID = this.beginThread(setTimeout(__update, this.property('milliseconds')));
  },

  /**
   * Event that is called as soon as the Play script has started.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeEntryUpdate#onStart
   */
  onStart: function() {
    this._super();

    this.onTriggered();
  },
});