wcNodeComposite.extend('wcNodeCompositeEntry', 'Entry', 'External', {
  /**
   * @class
   * This node acts as a connection between entry links on a composite node and the script inside.<br>
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeCompositeEntry
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} linkName - The name of the entry link.
   */
  init: function(parent, pos, linkName) {
    this._super(parent, pos);

    if (!(parent instanceof wcNodeCompositeScript)) {
      this._invalid = true;
    }

    this.description("Activates when the corresponding Entry link of the parent Composite node has been activated.");

    // Prevent duplicate link names.
    linkName = linkName || 'in'
    var name = linkName;

    if (!this._invalid) {
      var index = 0;
      while (true) {
        if (this._parent.createEntry(name)) {
          break;
        }
        index++;
        name = linkName + index;
      }
    }

    this.removeEntry('in');
    this.createExit('out');

    this.name = name;
  },

  /**
   * Event that is called when the name of this node is about to change.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeEntry#onNameChanging
   * @param {String} oldName - The current name.
   * @param {String} newName - The new name.
   * @return {String|undefined} - Return the new value of the name (usually newValue unless you are restricting the name). If no value is returned, newValue is assumed.
   */
  onNameChanging: function(oldName, newName) {
    this._super(oldName, newName);

    if (this._invalid) {
      return;
    }

    // Prevent renaming to a link that already exists.
    for (var i = 0; i < this._parent.chain.entry.length; ++i) {
      if (this._parent.chain.entry[i].name === newName) {
        return oldName;
      }
    }
  },

  /**
   * Event that is called when the name of this node has changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeEntry#onNameChanged
   * @param {String} oldName - The current name.
   * @param {String} newName - The new name.
   */
  onNameChanged: function(oldName, newName) {
    this._super(oldName, newName);

    if (this._invalid) {
      return;
    }

    // Rename the appropriate composite link.
    this._parent.renameEntry(oldName, newName);
    this._parent.sortEntryLinks();
  },

  /**
   * Event that is called after the node has changed its position.
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeEntry#onMoving
   * @param {wcPlay~Coordinates} oldPos - The old position of the node.
   * @param {wcPlay~Coordinates} newPos - The new position of the node.
   */
  onMoved: function(oldPos, newPos) {
    this._super(oldPos, newPos);

    if (this._invalid) {
      return;
    }

    this._parent.sortEntryLinks();
  },

  /**
   * Event that is called after the node has been destroyed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeEntry#onDestroyed
   */
  onDestroyed: function() {
    this._super();

    if (this._invalid) {
      return;
    }

    this._parent.sortEntryLinks();
  },
});