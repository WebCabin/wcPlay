wcPlayNodes.wcNodeComposite.extend('wcNodeCompositeProperty', 'Property', 'Linkers', {
  /**
   * This node acts as a connection between exit links on a composite node and the script inside.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * @class wcNodeCompositeProperty
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {string} linkName - The name of the exit link.
   */
  init: function(parent, pos, linkName) {
    this._super(parent, pos);

    if (!(parent && parent.instanceOf('wcNodeCompositeScript'))) {
      this._invalid = true;
    }

    this.description('References a property from its parent Composite Node.');
    this.details('The title name for this node becomes the name of the Property on the parent Composite Node. Multiple Property Nodes can reference the same property value name.\n\nAlthough this node does nothing while it is outside of a Composite Node, it can be placed within the Root level of the script. Doing so is useful if you intend to "File->Import" this script into another.');
    this.name = linkName || 'value';

    if (!this._invalid && this._parent) {
      this._parent.createProperty(this.name, wcPlay.PROPERTY.STRING, '', {input: true, output: true});
    }

    this.createProperty('input', wcPlay.PROPERTY.TOGGLE, true, {description: 'Assign whether the parent Composite Node can set this property\'s value.'});
    this.createProperty('output', wcPlay.PROPERTY.TOGGLE, true, {description: 'Assign whether the parent Composite Node can read this property\'s value.'});
    this.createProperty('value', wcPlay.PROPERTY.STRING, '', {input: true, output: true});

    if (!this._invalid && this._parent) {
      this._parent.sortPropertyLinks();
    }
  },

  /**
   * Event that is called when the name of this node has changed.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeProperty#onNameChanged
   * @param {string} oldName - The current name.
   * @param {string} newName - The new name.
   */
  onNameChanged: function(oldName, newName) {
    this._super(oldName, newName);

    if (this._invalid) {
      return;
    }

    if (newName) {
      // Attempt to create a new property, if it does not exist, then synchronize our local property.
      if (this._parent) {
        this._parent.renameProperty(oldName, newName);
        var options = this._parent.propertyOptions(newName);
        options.input = this.property('input');
        options.output = this.property('output');
      }
      this.property('value', this.property('value'));
    } else {
      this.property('value', '');
    }
  },

  /**
   * Event that is called when a property is about to be changed.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeProperty#onPropertyChanging
   * @param {string} name - The name of the property.
   * @param {Object} oldValue - The current value of the property.
   * @param {Object} newValue - The new, proposed, value of the property.
   * @returns {Object} - Return the new value of the property (usually newValue unless you are proposing restrictions). If no value is returned, newValue is assumed.
   */
  onPropertyChanging: function(name, oldValue, newValue) {
    this._super(name, oldValue, newValue);

    if (this._invalid || !this.name || !this._parent) {
      return '';
    }

    var engine = this.engine();
    var opts = this._parent.propertyOptions(this.name);

    switch (name) {
      case 'value':
        this._parent.property(this.name, newValue);
        break;
      case 'input':
        if (opts && engine) {
          engine.notifyEditors('onBeginUndoGroup', ['Property "' + name + '" changed for Node "' + this.category + '.' + this.type + '"']);
          opts.input = newValue;

          if (!opts.input) {
            engine.notifyEditors('onDisconnectInputChains', [this._parent, this.name]);
            this._parent.disconnectInput(this.name);
          }
        }
        break;
      case 'output':
        if (opts && engine) {
          engine.notifyEditors('onBeginUndoGroup', ['Property "' + name + '" changed for Node "' + this.category + '.' + this.type + '"']);
          opts.output = newValue;

          if (!opts.output) {
            engine.notifyEditors('onDisconnectOutputChains', [this._parent, this.name]);
            this._parent.disconnectOutput(this.name);
          }
        }
        break;
    }
  },

  /**
   * Event that is called when a property has changed.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeProperty#onPropertyChanged
   * @param {string} name - The name of the property.
   * @param {Object} oldValue - The old value of the property.
   * @param {Object} newValue - The new value of the property.
   */
  onPropertyChanged: function(name, oldValue, newValue) {
    this._super(name, oldValue, newValue);

    if (name === 'input' || name === 'output') {
      var engine = this.engine();
      if (engine) {
        setTimeout(function() {
          engine.notifyEditors('onEndUndoGroup');
        }, 0);
      }
    }
  },

  /**
   * Always redirect property gets on 'value' to the referenced global property.
   * <br>Event that is called when the property is being asked its value, before the value is actually retrieved.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeProperty#onPropertyGet
   * @param {string} name - The name of the property.
   * @returns {Object|undefined} - If a value is returned, that value is what will be retrieved from the get.
   */
  onPropertyGet: function(name) {
    this._super(name);

    if (this._invalid) {
      return '';
    }

    if (name === 'value') {
      if (this.name) {
        return this._parent.property(this.name);
      }
    }
  },

  /**
   * Any changes to the 'value' property will also change the global property.
   * <br>Event that is called when a property initial value is about to be changed.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeProperty#onInitialPropertyChanging
   * @param {string} name - The name of the property.
   * @param {Object} oldValue - The current value of the property.
   * @param {Object} newValue - The new, proposed, value of the property.
   * @returns {Object} - Return the new value of the property (usually newValue unless you are proposing restrictions). If no value is returned, newValue is assumed.
   */
  onInitialPropertyChanging: function(name, oldValue, newValue) {
    this._super(name, oldValue, newValue);

    if (this._invalid) {
      return '';
    }

    if (name === 'value') {
      if (this.name) {
        this._parent.initialProperty(this.name, newValue);
      }
    }
  },

  /**
   * Always redirect property gets on 'value' to the referenced global property.
   * <br>Event that is called when the property initial value is being asked its value, before the value is actually retrieved.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeProperty#onInitialPropertyGet
   * @param {string} name - The name of the property.
   * @returns {Object|undefined} - If a value is returned, that value is what will be retrieved from the get.
   */
  onInitialPropertyGet: function(name) {
    this._super(name);

    if (this._invalid) {
      return '';
    }

    if (name === 'value') {
      if (this.name) {
        return this._parent.initialProperty(this.name);
      }
    }
  },

  /**
   * Event that is called after the node has changed its position.
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeProperty#onMoving
   * @param {wcPlay~Coordinates} oldPos - The old position of the node.
   * @param {wcPlay~Coordinates} newPos - The new position of the node.
   */
  onMoved: function(oldPos, newPos) {
    this._super(oldPos, newPos);

    if (this._invalid) {
      return;
    }

    this._parent.sortPropertyLinks();
  },

  /**
   * Event that is called after the node has been destroyed.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeProperty#onDestroyed
   */
  onDestroyed: function() {
    this._super();

    if (this._invalid) {
      return;
    }

    this._parent.sortPropertyLinks();
  }
});
