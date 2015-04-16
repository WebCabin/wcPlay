/**
 * @class
 * The main scripting engine.
 *
 * @constructor
 * @description
 * @param {wcPlay~Options} [options] - Custom options.
 */
function wcPlay(options) {
  this._entryNodes = [];
  this._processNodes = [];
  this._compositeNodes = [];
  this._storageNodes = [];

  this._properties = [];

  this._queuedChain = [];
  this._queuedProperties = [];

  this._updateID = 0;
  this._isPaused = false;
  this._isStepping = false;

  this._renders = [];

  // Setup our options.
  this._options = {
    silent: false,
    updateRate: 25,
  };
  for (var prop in options) {
    this._options[prop] = options[prop];
  }
};

/**
 * Determines how a property's control should be rendered within the editor view.
 * @enum {String}
 */
wcPlay.PROPERTY_TYPE = {
  /** Displays the property as a checkbox. No options are used. */
  TOGGLE: 'toggle',
  /** Displays the property as a number control. [Number options]{@link wcNode~NumberOptions} are used. */
  NUMBER: 'number',
  /** Displays the property as a text field. No options are used. */
  STRING: 'string',
  /** Displays the property as a combo box control. [Select options]{@link wcNode~SelectOptions} are used. */
  SELECT: 'select',
  /** Displays the property as a color picker button. No options are used. */
  COLOR: 'color',
};

/**
 * The different types of nodes.
 * @enum {String}
 */
wcPlay.NODE_TYPE = {
  ENTRY: 'entry',
  PROCESS: 'process',
  COMPOSITE: 'composite',
  STORAGE: 'storage',
};

/**
 * A global list of nodes that exist. All node types must add themselves into this list when they are coded.
 * @member
 */
wcPlay.NODE_LIBRARY = [];

/**
 * A global function that registers a new node type into the library. This is called automatically when a new extended node type is defined, you should not have to do this manually.
 * @param {String} name - The name of the node constructor.
 * @param {String} displayName - The display name.
 * @param {String} category - The display category name.
 * @param {wcPlay.NODE_TYPE} type - The node's type.
 * @returns {Boolean} - Success or failure.
 */
wcPlay.registerNodeType = function(name, displayName, category, type) {
  for (var i = 0; i < wcPlay.NODE_LIBRARY.length; ++i) {
    if (wcPlay.NODE_LIBRARY[i].name === name) {
      return false;
    }
  }

  wcPlay.NODE_LIBRARY.push({
    name: name,
    displayName: displayName,
    category: category,
    type: type,
  });
  return true;
}

wcPlay.prototype = {
  /**
   * Gets whether the script is running in [silent mode]{@link wcPlay~Options}.
   * @returns {Boolean}
   */
  isSilent: function() {
    return this._options.silent;
  },

  /**
   * Initializes the script and begins the update process.
   * @function wcPlay#start
   */
  start: function() {
    var self = this;
    this._updateID = setInterval(function() {
      self.update();
    }, this._options.updateRate);

    this.__notifyNodes('onStart', []);
  },

  /**
   * Update handler.
   * @function wcPlay#update
   */
  update: function() {
    // Skip updates on pause.
    if (this._isPaused) {
      return;
    }

    // Update a queued property if any
    var count = this._queuedProperties.length;
    while (count) {
      count--;
      var item = this._queuedProperties.shift();
      item.node.property(item.name, item.value);
    }

    // Update a queued node entry only if there are no more properties to update.
    if (!this._queuedProperties.length) {
      count = this._queuedChain.length;
      while (count) {
        count--;
        var item = this._queuedChain.shift();
        item.node.onTriggered(item.name);
      }
    }

    // If we are step debugging, pause the script here.
    if (this._isStepping) {
      this._isPaused = true;
    }
  },

  /**
   * Creates a new global property.
   * @param {String} name - The name of the property.
   * @param {wcPlay.PROPERTY_TYPE} [controlType=wcPlay.PROPERTY_TYPE.STRING] - The type of property.
   * @param {Object} [defaultValue] - A default value for this property.
   * @param {Object} [options] - Additional options for this property, see {@link wcPlay.PROPERTY_TYPE}.
   * @returns {Boolean} - Failes if the property does not exist.
   */
  createProperty: function(name, controlType, defaultValue, options) {
    // Make sure this property doesn't already exist.
    for (var i = 0; i < this._properties.length; ++i) {
      if (this._properties[i].name === name) {
        return false;
      }
    }

    // Make sure the type is valid.
    if (!wcPlay.PROPERTY_TYPE.hasOwnProperty(controlType)) {
      controlType = wcPlay.PROPERTY_TYPE.STRING;
    }

    this._properties.push({
      name: name,
      value: defaultValue,
      defaultValue: defaultValue,
      controlType: controlType,
      options: options || {},
    });
    return true;
  },

  /**
   * Renames an existing global property.
   * @function wcPlay#renameProperty
   * @param {String} name - The current name of the global property to rename.
   * @param {String} newName - The new desired name of the global property.
   * @returns {Boolean} - Fails if the property was not found or if the new name is already used.
   */
  renameProperty: function(name, newName) {
    var prop = null;
    for (var i = 0; i < this._properties.length; ++i) {
      if (this._properties[i].name === newName) {
        return false;
      }

      if (this._properties[i].name === name) {
        prop = this._properties[i];
      }
    }

    if (!prop) {
      return false;
    }

    prop.name = newName;
    this.__notifyNodes('onGlobalPropertyRenamed', [name, newName]);
  },

  /**
   * Gets, or Sets a global property value.
   * @function wcPlay#property
   * @param {String} name - The name of the property.
   * @param {Object} [value] - If supplied, will assign a new value to the property.
   * @returns {Object} - The current value of the property, or undefined if not found.
   */
  property: function(name, value) {
    var prop = null;
    for (var i = 0; i < this._properties.length; ++i) {
      if (this._properties[i].name === name) {
        prop = this._properties[i];
        break;
      }
    }

    if (!prop) {
      return;
    }

    if (value !== undefined && value !== prop.value) {
      var oldValue = prop.value;
      prop.value = value;
      this.__notifyNodes('onGlobalPropertyChanged', [prop.name, oldValue, prop.value]);
    }
  },

  /**
   * Triggers an event into the Play script.
   * @function wcPlay#triggerEvent
   * @param {String} name - The event name to trigger (more specifically, the name of the wcNodeEntry).
   * @param {Object} data - Any data object that will be passed into the entry node.
   */
  triggerEvent: function(name, data) {
    for (var i = 0; i < this._entryNodes.length; ++i) {
      if (this._entryNodes[i].name === name) {
        this._entryNodes[i].onTriggered(data);
      }
    }
  },

  /**
   * Queues a node entry link to trigger on the next update.
   * @function wcPlay#queueNodeEntry
   * @param {wcNode} node - The node being queued.
   * @param {String} name - The entry link name.
   */
  queueNodeEntry: function(node, name) {
    if (node.enabled()) {
      this._queuedChain.push({
        node: node,
        name: name,
      });
    }
  },

  /**
   * Queues a node property value change to trigger on the next update.
   * @function wcPlay#queueNodeProperty
   * @param {wcNode} node - The node being queued.
   * @param {String} name - The property name.
   * @param {Object} value - The property value.
   */
  queueNodeProperty: function(node, name, value) {
    if (node.enabled()) {
      this._queuedProperties.push({
        node: node,
        name: name,
        value: value,
      });
    }
  },

  /**
   * Adds a node into the known node stacks.
   * @function wcPlay#__addNode
   * @private
   * @param {wcNode} node - The node to add.
   */
  __addNode: function(node) {
    if (node instanceof wcNodeEntry) {
      this._entryNodes.push(node);
    } else if (node instanceof wcNodeProcess) {
      this._processNodes.push(node);
    } else if (node instanceof wcNodeStorage) {
      this._storageNodes.push(node);
    } else if (node instanceof wcNodeComposite) {
      this._compositeNodes.push(node);
    }
  },

  /**
   * Removes a node from the known node stacks.
   * @function wcPlay#__removeNode
   * @private
   * @param {wcNode} node - The node to remove.
   */
  __removeNode: function(node) {
    if (node instanceof wcNodeEntry) {
      this._entryNodes.splice(this._entryNodes.indexOf(node), 1);
    } else if (node instanceof wcNodeProcess) {
      this._processNodes.splice(this._processNodes.indexOf(node), 1);
    } else if (node instanceof wcNodeStorage) {
      this._storageNodes.splice(this._storageNodes.indexOf(node), 1);
    } else if (node instanceof wcNodeComposite) {
      this._compositeNodes.splice(this._compositeNodes.indexOf(node), 1);
    }
  },

  /**
   * Sends a custom notification event to all nodes.
   * @function wcPlay#__notifyNodes
   * @private
   * @param {String} func - The node function to call.
   * @param {Object[]} args - A list of arguments to forward into the function call.
   */
  __notifyNodes: function(func, args) {
    var self;
    for (var i = 0; i < this._storageNodes.length; ++i) {
      self = this._storageNodes[i];
      if (typeof self[func] === 'function') {
        self[func].apply(self, args);
      }
    }
    for (var i = 0; i < this._processNodes.length; ++i) {
      self = this._processNodes[i];
      if (typeof self[func] === 'function') {
        self[func].apply(self, args);
      }
    }
    for (var i = 0; i < this._compositeNodes.length; ++i) {
      self = this._compositeNodes[i];
      if (typeof self[func] === 'function') {
        self[func].apply(self, args);
      }
    }
    for (var i = 0; i < this._entryNodes.length; ++i) {
      self = this._entryNodes[i];
      if (typeof self[func] === 'function') {
        self[func].apply(self, args);
      }
    }
  },
};