wcNodeComposite.extend('wcNodeCompositeProperty', 'Property', 'Linkers', {
  /**
   * @class
   * This node acts as a connection between exit links on a composite node and the script inside.<br>
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeCompositeProperty
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} linkName - The name of the exit link.
   */
  init: function(parent, pos, linkName) {
    this._super(parent, pos);

    if (!(parent instanceof wcNodeCompositeScript)) {
      this._invalid = true;
    }

    this.description("References a property from its parent Composite Node.");
    this.details("The title name for this node becomes the name of the Property on the parent Composite Node. Multiple Property Nodes can reference the same property value name.\n\nAlthough this node does nothing while it is outside of a Composite Node, it can be placed within the Root level of the script. Doing so is useful if you intend to 'File->Import' this script into another.");
    this.name = linkName || 'value';

    if (!this._invalid) {
      this._parent && this._parent.createProperty(this.name, wcPlay.PROPERTY.STRING, '');
    }

    this.createProperty('value', wcPlay.PROPERTY.STRING, '');
  },

  /**
   * Event that is called when the name of this node has changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeProperty#onNameChanged
   * @param {String} oldName - The current name.
   * @param {String} newName - The new name.
   */
  onNameChanged: function(oldName, newName) {
    this._super(oldName, newName);

    if (this._invalid) {
      return;
    }

    if (newName) {
      // Attempt to create a new property, if it does not exist, then synchronize our local property.
      if (this._parent) {
        this._parent.createProperty(newName, wcPlay.PROPERTY.STRING, '');
        // Copy all chains from the old property links to the new.
        var inputChains = this._parent.listInputChains(oldName);
        var outputChains = this._parent.listOutputChains(oldName);
        var engine = this.engine();
        if (engine) {
          for (var i = 0; i < inputChains.length; ++i) {
            this._parent.connectInput(newName, engine.nodeById(inputChains[i].outNodeId), inputChains[i].outName);
          }
          for (var i = 0; i < outputChains.length; ++i) {
            this._parent.connectOutput(newName, engine.nodeById(outputChains[i].inNodeId), outputChains[i].inName);
          }
        }
        this._parent.sortPropertyLinks();
      }
      this.property('value', this.property('value'));
    } else {
      this.property('value', '');
    }
  },

  /**
   * Event that is called when a property is about to be changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeProperty#onPropertyChanging
   * @param {String} name - The name of the property.
   * @param {Object} oldValue - The current value of the property.
   * @param {Object} newValue - The new, proposed, value of the property.
   * @returns {Object} - Return the new value of the property (usually newValue unless you are proposing restrictions). If no value is returned, newValue is assumed.
   */
  onPropertyChanging: function(name, oldValue, newValue) {
    this._super(name, oldValue, newValue);

    if (this._invalid) {
      return '';
    }

    if (name === 'value') {
      if (this.name) {
        this._parent && this._parent.property(this.name, newValue);
      }
    }
  },

  /**
   * Always redirect property gets on 'value' to the referenced global property.<br>
   * Event that is called when the property is being asked its value, before the value is actually retrieved.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeProperty#onPropertyGet
   * @param {String} name - The name of the property.
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
   * Any changes to the 'value' property will also change the global property.<br>
   * Event that is called when a property initial value is about to be changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeProperty#onInitialPropertyChanging
   * @param {String} name - The name of the property.
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
   * Always redirect property gets on 'value' to the referenced global property.<br>
   * Event that is called when the property initial value is being asked its value, before the value is actually retrieved.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeProperty#onInitialPropertyGet
   * @param {String} name - The name of the property.
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
   * Event that is called after the node has been destroyed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeProperty#onDestroyed
   */
  onDestroyed: function() {
    this._super();

    if (this._invalid) {
      return;
    }

    this._parent.sortPropertyLinks();
  },
});