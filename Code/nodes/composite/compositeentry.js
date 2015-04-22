wcNodeComposite.extend('wcNodeCompositeEntry', 'Composite Entry', 'Link', {
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

    if (!(parent instanceof wcNodeComposite)) {
      console.log('ERROR: Attempted to use the Composite Entry node while not inside a Composite Node!');
      this._invalid = true;
    }

    this.description("Activates when the corresponding Entry link of the parent Composite node has been activated.");

    // Prevent duplicate link names.
    var name = linkName;
    var index = 0;
    while (true) {
      if (this._parent.createEntry(name)) {
        break;
      }
      index++;
      name = linkName + index;
    }

    this.removeEntry('in');
    this.createExit('out');

    this.createProperty('link name', wcPlay.PROPERTY_TYPE.STRING, name);
  },

  /**
   * Event that is called when a property is about to be changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeEntry#onPropertyChanging
   * @param {String} name - The name of the property.
   * @param {Object} oldValue - The current value of the property.
   * @param {Object} newValue - The new, proposed, value of the property.
   * @returns {Object} - Return the new value of the property (usually newValue unless you are proposing restrictions). If no value is returned, newValue is assumed.
   */
  onPropertyChanging: function(name, oldValue, newValue) {
    this._super(name, oldValue, newValue);

    if (this._invalid) {
      return 'error';
    }

    // Prevent renaming to a link that already exists.
    for (var i = 0; i < this._parent.chain.entry.length; ++i) {
      if (this._parent.chain.entry[i].name === newValue) {
        return oldValue;
      }
    }
  },

  /**
   * Event that is called when a property has changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeEntry#onPropertyChanged
   * @param {String} name - The name of the property.
   * @param {Object} oldValue - The old value of the property.
   * @param {Object} newValue - The new value of the property.
   */
  onPropertyChanged: function(name, oldValue, newValue) {
    this._super(name, oldValue, newValue);

    if (this._invalid) {
      return;
    }

    // Rename the appropriate composite link.
    this._parent.renameEntry(oldValue, newValue);
  },
});