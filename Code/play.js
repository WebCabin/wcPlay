/**
 * @class
 * The main scripting engine.
 *
 * @constructor
 * @param {wcPlay~Options} [options] - Custom options.
 */
function wcPlay(options) {
  this._compositeNodes = [];
  this._entryNodes = [];
  this._processNodes = [];
  this._storageNodes = [];

  this._properties = [];

  this._waitingChain = [];
  this._queuedChain = [];
  this._queuedProperties = [];
  this._importedScripts = [];

  this._updateID = 0;
  this._isRunning = false;
  this._isPaused = false;
  this._isPausing = false;
  this._isStepping = false;

  this._editors = [];

  // Setup our options.
  this._options = {
    silent: false,
    updateRate: 25,
    updateLimit: 100,
    debugging: true,
  };
  for (var prop in options) {
    this._options[prop] = options[prop];
  }

  if (!this._updateId) {
    var self = this;
    this._updateID = setInterval(function() {
      self.update();
    }, this._options.updateRate);
  }
};

/**
 * Determines how a property's control should be rendered within the editor view.
 * @enum {String}
 */
wcPlay.PROPERTY = {
  /** Displays the property as a string, but does not enforce or convert its type. [String options]{@link wcNode~StringOptions} are used. */
  DYNAMIC: 'dynamic',
  /** Displays the property as a checkbox. [Default options]{@link wcNode~PropertyOptions} are used. */
  TOGGLE: 'toggle',
  /** Displays the property as a number control. [Number options]{@link wcNode~NumberOptions} are used. */
  NUMBER: 'number',
  /** Displays the property as a text field. [String options]{@link wcNode~StringOptions} are used. */
  STRING: 'string',
  /** Displays the property as a combo box control. [Select options]{@link wcNode~SelectOptions} are used. */
  SELECT: 'select',
  /** Displays the property as a custom control. (This feature is not yet available.) */
  CUSTOM: 'custom',
};

/**
 * The different types of nodes.
 * @enum {String}
 */
wcPlay.NODE = {
  /** Entry nodes mark the beginning of an execution flow chain and are usually triggered by some type of event that happens outside of the script. */
  ENTRY: 'entry',
  /** Process nodes perform a process, often very simple, and make up the bulk of a flow chain within the script. */
  PROCESS: 'process',
  /** Storage nodes are designed with a single purpose of storing data for use within the script. */
  STORAGE: 'storage',
  /** Composite nodes are a group of nodes combined into a single visible node. They appear in the composite section of the node palette for easy duplication within your script. */
  COMPOSITE: 'composite',
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
 * @param {wcPlay.NODE} nodeType - The node's type.
 * @returns {Boolean} - Success or failure.
 */
wcPlay.registerNodeType = function(name, displayName, category, nodeType) {
  for (var i = 0; i < wcPlay.NODE_LIBRARY.length; ++i) {
    if (wcPlay.NODE_LIBRARY[i].className === name) {
      wcPlay.NODE_LIBRARY.splice(i, 1);
      break;
    }
  }

  wcPlay.NODE_LIBRARY.push({
    className: name,
    displayName: displayName,
    category: category,
    nodeType: nodeType,
  });
  return true;
}

wcPlay.prototype = {

  /**
   * Initializes the script and begins the update process.
   * @function wcPlay#start
   */
  start: function() {
    this.reset();
    this._isRunning = true;
    this._isPaused = false;
    this._isPausing = false;
    this._isStepping = false;

    this.__notifyNodes('onStart', []);
  },

  /**
   * Stops the script.
   * @function wcPlay#stop
   */
  stop: function() {
    this._isRunning = false;
  },

  /**
   * Retrieves whether the script is running.
   * @returns {Boolean}
   */
  isRunning: function() {
    return this._isRunning;
  },

  /**
   * Resets all volotile data in the script.
   * @function wcPlay#reset
   */
  reset: function() {
    for (var i = 0; i < this._compositeNodes.length; ++i) {
      this._compositeNodes[i].reset();
    }
    for (var i = 0; i < this._entryNodes.length; ++i) {
      this._entryNodes[i].reset();
    }
    for (var i = 0; i < this._processNodes.length; ++i) {
      this._processNodes[i].reset();
    }
    for (var i = 0; i < this._storageNodes.length; ++i) {
      this._storageNodes[i].reset();
    }

    this._queuedChain = [];
    this._queuedProperties = [];

    for (var i = 0; i < this._properties.length; ++i) {
      this.property(this._properties[i].name, this._properties[i].initialValue, true);
    }
  },

  /**
   * Clears all nodes from the script.
   * @function wcPlay#clear
   */
  clear: function() {
    this._queuedChain = [];
    this._queuedProperties = [];

    this._properties = [];

    while (this._compositeNodes.length) {
      this._compositeNodes[0].destroy();
    }
    while (this._entryNodes.length) {
      this._entryNodes[0].destroy();
    }
    while (this._processNodes.length) {
      this._processNodes[0].destroy();
    }
    while (this._storageNodes.length) {
      this._storageNodes[0].destroy();
    }
  },

  /**
   * Serializes the script into a string that can be saved into a file and [restored]{@link wcPlay#load}.
   * @function wcPlay#save
   * @returns {String} - A serialized string with the entire script.
   */
  save: function() {
    var data = {
      version: '1.0.0'
    };
    data.properties = this.listProperties();

    data.nodes = [];
    for (var i = 0; i < this._compositeNodes.length; ++i) {
      data.nodes.push(this._compositeNodes[i].export(true));
    }
    for (var i = 0; i < this._entryNodes.length; ++i) {
      data.nodes.push(this._entryNodes[i].export(true));
    }
    for (var i = 0; i < this._processNodes.length; ++i) {
      data.nodes.push(this._processNodes[i].export(true));
    }
    for (var i = 0; i < this._storageNodes.length; ++i) {
      data.nodes.push(this._storageNodes[i].export(true));
    }

    return JSON.stringify(data, function(key, value) {
      if (value == Infinity) {
        return "Infinity";
      }
      return value;
    });
  },

  /**
   * Loads a script from previously serialized data generated by [save]{@link wcPlay#save}.
   * @function wcPlay#load
   * @param {String} serialData - The serialized data to load.
   * @returns {Boolean} - Success or failure.
   */
  load: function(serialData) {
    // For safety in case the imported file does not load property, save the current state of the script so we can restore it if necessary.
    var saveData = this.save();

    try {
      var data = JSON.parse(serialData, function(key, value) {
        if (value === 'Infinity') {
          return Infinity;
        }
        return value;
      });

      this.clear();
      for (var i = 0; i < data.properties.length; ++i) {
        this.createProperty(data.properties[i].name, data.properties[i].type, data.properties[i].initialValue, data.properties[i].options);
      }

      // First pass, create all nodes.
      var nodes = [];
      for (var i = 0; i < data.nodes.length; ++i) {
        if (window[data.nodes[i].className]) {
          var newNode = new window[data.nodes[i].className](this, data.nodes[i].pos, data.nodes[i].name);
          newNode.id = data.nodes[i].id;
          nodes.push({
            node: newNode,
            data: data.nodes[i]
          });
        } else {
          console.log('ERROR: Attempted to load node "' + data.nodes[i].className + '", but the constructor could not be found!');
        }
      }

      // Second pass, import each node's serialized data.
      for (var i = 0; i < nodes.length; ++i) {
        nodes[i].node.import(nodes[i].data);
      }

      this.reset();
      return true;
    } catch (e) {
      // Something went wrong, restore the previous script.
      this.load(saveData);
    }
    return false;
  },

  /**
   * Imports a script as a new composite node that can be retrieved with {@link wcPlay#importedComposites}.
   * @function wcPlay#import
   * @param {String} serialData - The serialized data to import.
   * @returns {Boolean} - Whether the new composite node was created.
   */
  import: function(serialData, name) {
    var newNode = null;

    try {
      var data = JSON.parse(serialData, function(key, value) {
        if (value === 'Infinity') {
          return Infinity;
        }
        return value;
      });

      // TODO: Ignore properties on the script?
      data.pos = {x: 0, y: 0};
      newNode = new wcNodeCompositeScript(this, data.pos);
      newNode.nodeType = wcPlay.NODE.COMPOSITE;
      newNode.category = "Imported";

      data.id = newNode.id;
      data.name = name;
      data.color = newNode.color;
      data.collapsed = false;
      data.breakpoint = false;
      data.properties = [];
      data.entryChains = [];
      data.exitChains = [];
      data.inputChains = [];
      data.outputChains = [];

      newNode.import(data, []);
      newNode._parent = null;

      this.__removeNode(newNode);
      this._importedScripts.push(newNode);
      return true;
    } catch (e) {
      if (newNode) {
        newNode.destroy();
      }
    }

    return false;
  },

  /**
   * Retrieves the list of all imported composite nodes.
   * @function wcPlay#importedComposites
   * @returns {wcNodeCompositeScript[]} - An array of imported composite nodes.
   * @see wcPlay#importComposite
   */
  importedComposites: function() {
    return this._importedScripts;
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

    var count = Math.min(this._queuedProperties.length, this._options.updateLimit);
    if (this._isRunning && !count && this._waitingChain.length) {
      // If no properties are queued, but we have waiting flow nodes, add them to the queue for next update.
      for (var i = 0; i < this._waitingChain.length; ++i) {
        var item = this._waitingChain[i];

        this.queueNodeEntry(item.node, item.name, item.fromNode, item.fromName, true);
      }

      this._waitingChain = [];
      return;
    }

    // Update a queued properties if any
    var index = count;
    while (index) {
      index--;
      var item = this._queuedProperties.shift();
      item.node._meta.flash = true;
      if (item.node._meta.broken > 0) {
        item.node._meta.broken--;
      }
      item.node.property(item.name, item.value, (item.upstream? false: undefined), item.upstream);
    }

    // Update a queued node entry only if there are no more properties to update.
    if (this._isRunning && !count) {
      count = Math.min(this._queuedChain.length, this._options.updateLimit - count);
      index = count;
      while (index) {
        index--;
        var item = this._queuedChain.shift();
        item.node._meta.flash = true;
        if (item.node._meta.broken > 0) {
          item.node._meta.broken--;
        }
        item.node.onActivated(item.name);
      }
    }

    // If we are step debugging, pause the script here.
    if (this._isStepping) {
      this._isPausing = true;
    }
  },

  /**
   * Retrieves a node from a given ID, if it exists in this script.
   * @function wcPlay#nodeById
   * @param {Number} id - The ID of the node.
   * @returns {wcNode|null} - Either the found node, or null.
   */
  nodeById: function(id) {
    for (var i = 0; i < this._compositeNodes.length; ++i) {
      if (this._compositeNodes[i].id === id) {
        return this._compositeNodes[i];
      }
    }
    for (var i = 0; i < this._entryNodes.length; ++i) {
      if (this._entryNodes[i].id === id) {
        return this._entryNodes[i];
      }
    }
    for (var i = 0; i < this._processNodes.length; ++i) {
      if (this._processNodes[i].id === id) {
        return this._processNodes[i];
      }
    }
    for (var i = 0; i < this._storageNodes.length; ++i) {
      if (this._storageNodes[i].id === id) {
        return this._storageNodes[i];
      }
    }

    for (var i = 0; i < this._compositeNodes.length; ++i) {
      if (this._compositeNodes[i] instanceof wcNodeCompositeScript) {
        var found = this._compositeNodes[i].nodeById(id);
        if (found) {
          return found;
        }
      }
    }
    return null;
  },

  /**
   * Retrieves a list of nodes that match a given class name, if they exists in this script.
   * @function wcPlay#nodesByClassName
   * @param {String} className - The className of the nodes to retrieve.
   * @returns {wcNode[]} - A list of all found nodes.
   */
  nodesByClassName: function(className) {
    var result = [];
    for (var i = 0; i < this._compositeNodes.length; ++i) {
      if (this._compositeNodes[i].className === className) {
        result.push(this._compositeNodes[i]);
      }
    }
    for (var i = 0; i < this._entryNodes.length; ++i) {
      if (this._entryNodes[i].className === className) {
        result.push(this._entryNodes[i]);
      }
    }
    for (var i = 0; i < this._processNodes.length; ++i) {
      if (this._processNodes[i].className === className) {
        result.push(this._processNodes[i]);
      }
    }
    for (var i = 0; i < this._storageNodes.length; ++i) {
      if (this._storageNodes[i].className === className) {
        result.push(this._storageNodes[i]);
      }
    }

    for (var i = 0; i < this._compositeNodes.length; ++i) {
      if (this._compositeNodes[i] instanceof wcNodeCompositeScript) {
        var found = this._compositeNodes[i].nodesByClassName(className);
        if (found.length) {
          result.concat(found);
        }
      }
    }
    return result;
  },

  /**
   * Retrieves a list of nodes that match a given search filter.
   * @function wcPlay#nodesBySearch
   * @param {String} search - The search value.
   * @returns {wcNode[]} - A list of all found nodes.
   */
  nodesBySearch: function(search) {
    var result = [];
    for (var i = 0; i < this._compositeNodes.length; ++i) {
      if (this._compositeNodes[i].search(search)) {
        result.push(this._compositeNodes[i]);
      }
    }
    for (var i = 0; i < this._entryNodes.length; ++i) {
      if (this._entryNodes[i].search(search)) {
        result.push(this._entryNodes[i]);
      }
    }
    for (var i = 0; i < this._processNodes.length; ++i) {
      if (this._processNodes[i].search(search)) {
        result.push(this._processNodes[i]);
      }
    }
    for (var i = 0; i < this._storageNodes.length; ++i) {
      if (this._storageNodes[i].search(search)) {
        result.push(this._storageNodes[i]);
      }
    }

    for (var i = 0; i < this._compositeNodes.length; ++i) {
      if (this._compositeNodes[i] instanceof wcNodeCompositeScript) {
        var found = this._compositeNodes[i].nodesBySearch(search);
        if (found.length) {
          result = result.concat(found);
        }
      }
    }
    return result;
  },

  /**
   * Gets, or Sets whether the script is running in [silent mode]{@link wcPlay~Options}.
   * @function wcPlay#silent
   * @param {Boolean} silent - If supplied, assigns a new silent state of the script.
   * @returns {Boolean} - The current silent state of the script.
   */
  silent: function(silent) {
    if (silent !== undefined) {
      this._options.silent = silent? true: false;
    }

    return this._options.silent;
  },

  /**
   * Gets, or Sets the debugging state of the script.
   * @function wcPlay#debugging
   * @param {Boolean} [debug] - If supplied, will assign the debugging state of the script.
   * @returns {Boolean} - The current debugging state of the script.
   */
  debugging: function(debug) {
    if (debug !== undefined) {
      this._options.debugging = debug? true: false;
    }

    return this._options.debugging;
  },

  /**
   * Gets, or Sets the pause state of the script.
   * @function wcPlay#paused
   * @param {Boolean} [paused] - If supplied, will assign the paused state of the script.
   * @returns {Boolean} - The current pause state of the script.
   */
  paused: function(paused) {
    if (paused !== undefined) {
      paused = paused? true: false;

      if (this._isPaused !== paused) {
        for (var i = 0; i < this._compositeNodes.length; ++i) {
          this._compositeNodes[i].paused(paused);
        }
        for (var i = 0; i < this._entryNodes.length; ++i) {
          this._entryNodes[i].paused(paused);
        }
        for (var i = 0; i < this._processNodes.length; ++i) {
          this._processNodes[i].paused(paused);
        }
        for (var i = 0; i < this._storageNodes.length; ++i) {
          this._storageNodes[i].paused(paused);
        }

        this._isPaused = paused;
        this._isPausing = false;
      }
    }

    return this._isPaused;
  },

  /**
   * Gets, or Sets the stepping state of the script.
   * @function wcPlay#stepping
   * @param {Boolean} [stepping] - If supplied, will assign the stepping state of the script.
   * @returns {Boolean} - The current stepping state of the script.
   */
  stepping: function(stepping) {
    if (stepping !== undefined) {
      this._isStepping = stepping? true: false;
    }

    return this._isStepping;
  },

  /**
   * Creates a new global property (can be used with the global storage node).
   * @param {String} name - The name of the property.
   * @param {wcPlay.PROPERTY} type - The type of property.
   * @param {Object} [initialValue] - A default value for this property.
   * @param {Object} [options] - Additional options for this property, see {@link wcPlay.PROPERTY}.
   * @returns {Boolean} - Fails if the property does not exist.
   */
  createProperty: function(name, type, initialValue, options) {
    // Make sure this property doesn't already exist.
    for (var i = 0; i < this._properties.length; ++i) {
      if (this._properties[i].name === name) {
        return false;
      }
    }

    if (initialValue === undefined) {
      initialValue = 0;
    }

    this._properties.push({
      name: name,
      value: initialValue,
      initialValue: initialValue,
      type: type,
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
   * Removes a global property.
   * @param {String} name - The name of the property to remove.
   * @returns {Boolean} - Fails if the property does not exist.
   */
  removeProperty: function(name) {
    for (var i = 0; i < this._properties.length; ++i) {
      if (this._properties[i].name === name) {
        this.__notifyNodes('onGlobalPropertyRemoved', [name]);
        this._properties.splice(i, 1);
        return true;
      }
    }
    return false;
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

    return prop.value;
  },

  /**
   * Gets, or Sets a global property initial value.
   * @function wcPlay#initialProperty
   * @param {String} name - The name of the property.
   * @param {Object} [value] - If supplied, will assign a new value to the property.
   * @returns {Object} - The current value of the property, or undefined if not found.
   */
  initialProperty: function(name, value) {
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

    if (value !== undefined && value !== prop.initialValue) {
      var oldValue = prop.initialValue;
      prop.initialValue = value;

      if (prop.value == oldValue) {
        prop.value = value;
        this.__notifyNodes('onGlobalInitialPropertyChanged', [prop.name, oldValue, prop.value]);
      }
    }

    return prop.initialValue;
  },

  /**
   * Retrieves a list of all global properties and their values for this script.
   * @function wcPlay#listProperties
   * @returns {wcNode~PropertyData[]} - A list of all property data.
   */
  listProperties: function() {
    var result = [];
    for (var i = 0; i < this._properties.length; ++i) {
      var myProp = this._properties[i];
      result.push({
        name: myProp.name,
        value: myProp.value,
        initialValue: myProp.initialValue,
        type: myProp.type,
        options: myProp.options,
      });
    }

    return result;
  },

  /**
   * Triggers an event into the Play script.
   * @function wcPlay#triggerEvent
   * @param {String} type - The type name of the node (as displayed in the title).
   * @param {String} name - The event name to trigger (as displayed in the title between the parenthesis).
   * @param {Object} data - Any data object that will be passed into the entry node.
   */
  triggerEvent: function(type, name, data) {
    for (var i = 0; i < this._entryNodes.length; ++i) {
      if (this._entryNodes[i].type === type && this._entryNodes[i].name === name) {
        this._entryNodes[i].onActivated(data);
      }
    }
  },

  /**
   * Queues a node entry link to trigger on the next update.
   * @function wcPlay#queueNodeEntry
   * @param {wcNode} node - The node being queued.
   * @param {String} name - The entry link name.
   * @param {wcNode} fromNode - The node causing the queue.
   * @param {String} fromName - The exit link name.
   * @param {Boolean} [forceQueue] - If true, will force the event into the queue rather than the waiting list.
   */
  queueNodeEntry: function(node, name, fromNode, fromName, forceQueue) {
    // Skip node queueing if the script is not even running.
    if (!this._isRunning) {
      return;
    }

    if (!forceQueue && this._isStepping && this._isPaused) {
      if (node.enabled()) {
        this._waitingChain.push({
          node: node,
          name: name,
          fromNode: fromNode,
          fromName: fromName
        });
      }
      return;
    }

    if (node.enabled()) {
      this._queuedChain.push({
        node: node,
        name: name
      });

      if (node.debugBreak() || this._isStepping) {
        node._meta.flash = true;
        node._meta.broken++;
        this._isPausing = true;
      }

      // Flash the entry link.
      for (var i = 0; i < node.chain.entry.length; ++i) {
        if (node.chain.entry[i].name == name) {
          node.chain.entry[i].meta.flash = true;
          if (node.debugBreak() || this._isStepping) {
            node.chain.entry[i].meta.broken++;
          }
          break;
        }
      }

      // Flash the exit link.
      if (fromNode && fromName) {
        for (var i = 0; i < fromNode.chain.exit.length; ++i) {
          var exitLink = fromNode.chain.exit[i];
          if (exitLink.name == fromName) {
            fromNode.chain.exit[i].meta.flash = true;
            fromNode._meta.flash = true;

            if (node.debugBreak() || this._isStepping) {
              fromNode.chain.exit[i].meta.broken++;
            }
            break;
          }
        }
      }

      if (this._isPausing) {
        this.paused(true);
        this._isPausing = false;
      }
    }
  },

  /**
   * Queues a node property value change to trigger on the next update.
   * @function wcPlay#queueNodeProperty
   * @param {wcNode} node - The node being queued.
   * @param {String} name - The property name.
   * @param {Object} value - The property value.
   * @param {Boolean} [upstream] - If true, we are propagating the property change in reverse.
   */
  queueNodeProperty: function(node, name, value, upstream) {
    // Skip node queueing if the script is not even running.
    if (!this._isRunning) {
      return;
    }

    if (node.enabled() || name === 'enabled') {
      this._queuedProperties.push({
        node: node,
        name: name,
        value: value,
        upstream: upstream,
      });

      // if (this._queuedChain.length > 0) {
      //   this._waitingChain = this._queuedChain;
      //   this._queuedChain = [];
      // }

      if (node.debugBreak() || this._isStepping) {
        node._meta.flash = true;
        node._meta.broken++;
        this._isPausing = true;
      }

      if (this._isPausing) {
        this.paused(true);
        this._isPausing = false;
      }
    }
  },

  /**
   * Adds a node into the known node stacks.
   * @function wcPlay#__addNode
   * @private
   * @param {wcNode} node - The node to add.
   */
  __addNode: function(node) {
    if (node instanceof wcNodeComposite) {
      this._compositeNodes.push(node);
    } else if (node instanceof wcNodeEntry) {
      this._entryNodes.push(node);
    } else if (node instanceof wcNodeProcess) {
      this._processNodes.push(node);
    } else if (node instanceof wcNodeStorage) {
      this._storageNodes.push(node);
    }
  },

  /**
   * Removes a node from the known node stacks.
   * @function wcPlay#__removeNode
   * @private
   * @param {wcNode} node - The node to remove.
   * @returns {Boolean} - Fails if the node was not found in this script.
   */
  __removeNode: function(node) {
    var index = -1;
    if (node instanceof wcNodeComposite) {
      index = this._compositeNodes.indexOf(node);
      if (index > -1) {
        this._compositeNodes.splice(index, 1);
      }
    } else if (node instanceof wcNodeEntry) {
      index = this._entryNodes.indexOf(node);
      if (index > -1) {
        this._entryNodes.splice(index, 1);
      }
    } else if (node instanceof wcNodeProcess) {
      index = this._processNodes.indexOf(node);
      if (index > -1) {
        this._processNodes.splice(index, 1);
      }
    } else if (node instanceof wcNodeStorage) {
      index = this._storageNodes.indexOf(node);
      if (index > -1) {
        this._storageNodes.splice(index, 1);
      }
    }

    // If the node was not found, propagate the removal to all composite nodes.
    if (index === -1) {
      for (var i = 0; i < this._compositeNodes.length; ++i) {
        if (this._compositeNodes[i] instanceof wcNodeCompositeScript &&
            this._compositeNodes[i].__removeNode(node)) {
          return true;
        }
      }
    }

    return false;
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
    for (var i = 0; i < this._processNodes.length; ++i) {
      self = this._processNodes[i];
      if (typeof self[func] === 'function') {
        self[func].apply(self, args);
      }
    }
    for (var i = 0; i < this._storageNodes.length; ++i) {
      self = this._storageNodes[i];
      if (typeof self[func] === 'function') {
        self[func].apply(self, args);
      }
    }

    for (var i = 0; i < this._compositeNodes.length; ++i) {
      if (this._compositeNodes[i] instanceof wcNodeCompositeScript) {
        this._compositeNodes[i].__notifyNodes(func, args);
      }
    }
  },

  /**
   * Sends a custom notification event to all renderers.
   * @function wcPlay#__notifyEditors
   * @private
   * @param {String} func - The renderer function to call.
   * @param {Object[]} args - A list of arguments to forward into the function call.
   */
  __notifyEditors: function(func, args) {
    var self;
    for (var i = 0; i < this._editors.length; ++i) {
      self = this._editors[i];
      if (typeof self[func] === 'function') {
        self[func].apply(self, args);
      }
    }
  },
};



function wcNodeTimeoutEvent(node, callback, delay) {
  this._node = node;
  this._timerId = 0;
  this._callback = callback;
  this._remaining = delay;
  this._marker = 0;
};

wcNodeTimeoutEvent.prototype = {
  pause: function() {
    window.clearTimeout(this._timerId);
    this._remaining -= new Date().getTime() - this._marker;
  },

  resume: function() {
    this._marker = new Date().getTime();
    window.clearTimeout(this._timerId);
    var self = this;
    this._timerId = window.setTimeout(function() {
      self._node.finishThread(self);
      self._callback && self._callback.call(self._node);
      self.__clear();
    }, this._remaining);
  },

  __clear: function() {
    this._node = null;
    this._callback = null;
    window.clearTimeout(this._timerId);
  },
};
