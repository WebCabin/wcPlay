wcPlayNodes.wcNodeEntry.extend('wcNodeEntryCallRemote', 'Call Remote Event', 'Flow Control', {
  /**
   * An entry node that fires when a [Call Remote Event Node]{@link wcNodeEntryCallRemote} of the same name is activated.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * @class wcNodeEntryCallRemote
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description('An entry node that activates all Remote Event Nodes of the same name.');
    this.details('This node uses it\'s Title Name value as an identifier that links it with any Remote Event Nodes of the same name. Whenever this Node is activated, All Remote Event Nodes of the same name will also become active as well.');

    this.createEntry('in');
    this.removeExit('out');

    this.createProperty('local', wcPlay.PROPERTY.TOGGLE, true, {description: 'If true, only matching Remote Event Nodes that are within, or nested within, the same Composite Node or scope will be activated.'});
  },

  /**
   * Event that is called when an entry link has been activated.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeEntryCallRemote#onActivated
   * @param {string} name - The name of the entry link triggered.
   */
  onActivated: function(name) {
    this._super(name);

    var engine = this.engine();
    var scope = engine;
    if (this.property('local')) {
      scope = this._parent;
    }

    var remoteNodes = scope.nodesByClassName('wcNodeEntryRemote');
    for (var i = 0; i < remoteNodes.length; ++i) {
      if (remoteNodes[i].name === this.name) {
        engine.queueNodeEntry(remoteNodes[i], 'in', this, 'out', false, engine.beginFlowTracker(this, this._activeTracker));
      }
    }
  }
});