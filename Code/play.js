'use strict';

/**
 * The main scripting engine.
 * @class
 * @param {wcPlay~Options} [options] - Custom options.
 */
function wcPlay(options) {
  var lib = null;

  /**
   * Contains a library of node types. Accessible via {@link wcPlay#nodeLibrary}. This
   * is used by the editor tool to determine what nodes a user is allowed to use
   * within a script. By default, this contains all nodes loaded by the browser. After
   * updating this library, you will need to re-load the script within the editor
   * to update the palette.
   * @class wcNodeLibrary
   */
  function wcNodeLibrary() {}
  wcNodeLibrary.prototype = {
    /**
     * Retrieves the library list of nodes.
     * @function wcNodeLibrary#get
     * @returns {wcNode[]} - The node list.
     */
    get: function() {
      if (lib === null) {
        this.all();
      }
      return lib;
    },

    /**
     * Adds all node types to the library.
     * @function wcNodeLibrary#all
     */
    all: function() {
      lib = [];
      for (var i = 0; i < wcPlay.NODE_LIBRARY.length; ++i) {
        lib.push(wcPlay.NODE_LIBRARY[i]);
      }
    },

    /**
     * Clears all nodes from the library.
     * @function wcNodeLibrary#clear
     */
    clear: function() {
      lib = [];
    },

    /**
     * Retrieves whether a node exists in the library.
     * @function wcNodeLibrary#has
     * @param {string} nodeName - The name of the node.
     * @returns {boolean} - True if the node exists in the library.
     */
    has: function(nodeName) {
      if (lib === null) {
        this.all();
      }
      for (var i = 0; i < lib.length; ++i) {
        if (lib[i].className === nodeName) {
          return true;
        }
      }
      return false;
    },

    /**
     * Adds a node of a given class name to the library.
     * @function wcNodeLibrary#add
     * @param {string} nodeName - The node to add.
     * @returns {boolean} - True if the node was added.
     */
    add: function(nodeName) {
      if (lib === null) {
        this.all();
      }
      for (var i = 0; i < wcPlay.NODE_LIBRARY.length; ++i) {
        if (wcPlay.NODE_LIBRARY[i].className === nodeName) {
          if (lib.indexOf(wcPlay.NODE_LIBRARY[i]) === -1) {
            lib.push(wcPlay.NODE_LIBRARY[i]);
          }
          return true;
        }
      }
      return false;
    },

    /**
     * Remove a node of a given class name from the library
     * @function wcNodeLibrary#remove
     * @param {string} nodeName - The node to remove.
     * @returns {boolean} - True if the node was removed.
     */
    remove: function(nodeName) {
      if (lib === null) {
        this.all();
      }
      for (var i = 0; i < lib.length; ++i) {
        if (lib[i].className === nodeName) {
          lib.splice(i, 1);
          return true;
        }
      }
      return false;
    }
  };

  this._nodeLibrary = new wcNodeLibrary();

  this._compositeNodes = [];
  this._entryNodes = [];
  this._processNodes = [];
  this._storageNodes = [];

  this._properties = [];

  this._waitingChain = [];
  this._queuedChain = [];
  this._queuedProperties = [];
  this._importedScripts = [];

  this._nodeId = 0;
  this._flowTrackers = 0;
  this._hasWarnedTrackLimit = false;
  this._updateInterval = 0;
  this._isRunning = false;
  this._isPaused = false;
  this._isPausing = false;
  this._isStepping = false;

  this._customData = null;

  this._editors = [];

  // Setup our options.
  this._options = {
    silent: false,
    updateRate: 25,
    updateLimit: 100,
    flowTrackerLimit: 1000,
    debugging: true
  };
  for (var prop in options) {
    this._options[prop] = options[prop];
  }

  if (!this._updateInterval) {
    var self = this;
    this._updateInterval = setInterval(function() {
      self.update();
    }, this._options.updateRate);
  }

  wcPlay.INSTANCE_LIBRARY.push(this);
}

/**
 * Determines how a property's control should be rendered within the editor view.
 * @enum {string}
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
  /** Displays the property as a custom control. [Custom options]{@link wcNode~CustomOptions} are used. */
  CUSTOM: 'custom'
};

/**
 * The different types of nodes.
 * @enum {string}
 */
wcPlay.NODE = {
  /** Entry nodes mark the beginning of an execution flow chain and are usually triggered by some type of event that happens outside of the script. */
  ENTRY: 'entry',
  /** Process nodes perform a process, often very simple, and make up the bulk of a flow chain within the script. */
  PROCESS: 'process',
  /** Storage nodes are designed with a single purpose of storing data for use within the script. */
  STORAGE: 'storage',
  /** Composite nodes are a group of nodes combined into a single visible node. They appear in the composite section of the node palette for easy duplication within your script. */
  COMPOSITE: 'composite'
};

/**
 * A global list of nodes that exist. All node types must add themselves into this list when they are coded.
 * @member
 */
wcPlay.NODE_LIBRARY = [];

/**
 * A global list of play engine instances that exist.
 * @member
 */
wcPlay.INSTANCE_LIBRARY = [];

/**
 * A global function that registers a new node type into the library. This is called automatically when a new extended node type is defined, you should not have to do this manually.
 * @param {string} name - The name of the node constructor.
 * @param {string} displayName - The display name.
 * @param {string} category - The display category name.
 * @param {wcPlay.NODE} nodeType - The node's type.
 * @returns {boolean} - Success or failure.
 */
wcPlay.registerNodeType = function(name, displayName, category, nodeType) {
  var data = {
    className: name,
    displayName: displayName,
    category: category,
    nodeType: nodeType
  };

  for (var i = 0; i < wcPlay.NODE_LIBRARY.length; ++i) {
    if (wcPlay.NODE_LIBRARY[i].className === name) {
      wcPlay.NODE_LIBRARY[i] = data;

      for (var a = 0; a < wcPlay.INSTANCE_LIBRARY.length; ++a) {
        var play = wcPlay.INSTANCE_LIBRARY[a];
        for (var b = 0; b < play._editors.length; ++b) {
          var editor = play._editors[b];
          editor.__setupPalette();
        }
      }
      return true;
    }
  }

  wcPlay.NODE_LIBRARY.push(data);
  return true;
};

/**
 * A global function that unregisters a node type from the library.
 * @param {string} name - The name of the node constructor.
 * @returns {boolean} - True if the node type has been found and removed.
 */
wcPlay.unregisterNodeType = function(name) {
  for (var i = 0; i < wcPlay.NODE_LIBRARY.length; ++i) {
    if (wcPlay.NODE_LIBRARY[i].className === name) {
      wcPlay.NODE_LIBRARY.splice(i, 1);

      for (var a = 0; a < wcPlay.INSTANCE_LIBRARY.length; ++a) {
        var play = wcPlay.INSTANCE_LIBRARY[a];
        for (var b = 0; b < play._editors.length; ++b) {
          var editor = play._editors[b];
          editor.__setupPalette();
        }
      }
      return true;
    }
  }

  return false;
};

wcPlay.prototype = {
  /**
   * Retrieves the node library for this script. This is an object that allows
   * you to manage the nodes you are allowed to use in this script.
   * @function wcPlay#nodeLibrary
   * @returns {wcNodeLibrary} - The node library list.
   */
  nodeLibrary: function() {
    return this._nodeLibrary;
  },

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

    this.notifyNodes('onStart', []);
  },

  /**
   * Stops the script.
   * @function wcPlay#stop
   */
  stop: function() {
    this._isRunning = false;
    this.reset();

    this.notifyNodes('onStop', []);
  },

  /**
   * Retrieves whether the script engine is running.
   * @function wcPlay#isRunning
   * @returns {boolean} - Whether the script engine is running.
   */
  isRunning: function() {
    return this._isRunning;
  },

  /**
   * Resets all volotile data in the script.
   * @function wcPlay#reset
   */
  reset: function() {
    var i = 0;
    for (i = 0; i < this._compositeNodes.length; ++i) {
      this._compositeNodes[i].reset();
    }
    for (i = 0; i < this._entryNodes.length; ++i) {
      this._entryNodes[i].reset();
    }
    for (i = 0; i < this._processNodes.length; ++i) {
      this._processNodes[i].reset();
    }
    for (i = 0; i < this._storageNodes.length; ++i) {
      this._storageNodes[i].reset();
    }

    while(this._queuedChain.length) {
      var item = this._queuedChain.shift();
      this.endFlowTracker(item.tracker);
    }
    this._queuedProperties = [];

    for (i = 0; i < this._properties.length; ++i) {
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
    this._waitingChain = [];

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
   * @returns {string} - A serialized string with the entire script.
   */
  save: function() {
    var data = {
      version: '1.0.0'
    };

    data.custom = this.customData();
    data.properties = this.listProperties();
    var i = 0;

    data.nodes = [];
    for (i = 0; i < this._compositeNodes.length; ++i) {
      data.nodes.push(this._compositeNodes[i].export(true));
    }
    for (i = 0; i < this._entryNodes.length; ++i) {
      data.nodes.push(this._entryNodes[i].export(true));
    }
    for (i = 0; i < this._processNodes.length; ++i) {
      data.nodes.push(this._processNodes[i].export(true));
    }
    for (i = 0; i < this._storageNodes.length; ++i) {
      data.nodes.push(this._storageNodes[i].export(true));
    }

    return JSON.stringify(data, function(key, value) {
      if (value == Infinity) {
        return 'Infinity';
      }
      return value;
    });
  },

  /**
   * Loads a script from previously serialized data generated by [save]{@link wcPlay#save}.
   * @function wcPlay#load
   * @param {string} serialData - The serialized data to load.
   * @returns {boolean} - Success or failure.
   */
  load: function(serialData) {
    // For safety in case the imported file does not load property, save the current state of the script so we can restore it if necessary.
    var saveData = this.save();
    var i = 0;

    try {
      var data = JSON.parse(serialData, function(key, value) {
        if (value === 'Infinity') {
          return Infinity;
        }
        return value;
      });

      this.customData(data.custom);

      this.clear();
      for (i = 0; i < data.properties.length; ++i) {
        this.createProperty(data.properties[i].name, data.properties[i].type, data.properties[i].initialValue, data.properties[i].options);
      }

      // First pass, create all nodes.
      var nodes = [];
      for (i = 0; i < data.nodes.length; ++i) {
        if (window.wcPlayNodes[data.nodes[i].className]) {
          try {
            var newNode = new window.wcPlayNodes[data.nodes[i].className](this, data.nodes[i].pos, data.nodes[i].name);
            newNode.id = data.nodes[i].id;
            nodes.push({
              node: newNode,
              data: data.nodes[i]
            });
          } catch (e) {
            this.error('Attempted to load node "' + data.nodes[i].className + '" with error :' + e);
          }
        } else {
          this.error('Attempted to load node "' + data.nodes[i].className + '", but the constructor could not be found!');
        }
      }

      // Second pass, import each node's serialized data.
      for (i = 0; i < nodes.length; ++i) {
        nodes[i].node.import(nodes[i].data);
      }

      this.reset();
      return true;
    } catch (err) {
      // Something went wrong, restore the previous script.
      this.error(err.stack);
      this.load(saveData);
    }
    return false;
  },

  /**
   * Gets, or Sets, a custom data object to the script that will be saved and restored with the output file data.
   * <br>NOTE: Binding new data will always replace any data that may have been previously bound.
   * @function wcPlay#customData
   * @param {Object|Function} [data] - If supplied, will assign a new custom data. If you supply a function, it will be invoked when retrieving the data. If not supplied, will retrieve the currently bound data.
   * @returns {Object} - The current custom data object.
   */
  customData: function(data) {
    if (typeof data !== 'undefined') {
      this._customData = data;
    }

    if (typeof this._customData === 'function') {
      return this._customData();
    }

    return this._customData;
  },

  /**
   * Imports a script as a new composite node that can be retrieved with {@link wcPlay#importedComposites}.
   * @function wcPlay#import
   * @param {string} serialData - The serialized data to import.
   * @param {string} name - The name of the composite node to create.
   * @returns {boolean} - Whether the new composite node was created.
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
      newNode = new wcPlayNodes.wcNodeCompositeScript(this, data.pos);
      newNode.nodeType = wcPlay.NODE.COMPOSITE;
      newNode.category = 'Imported';

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
    } catch (err) {
      this.error(err.stack);
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

    var item = null;
    var count = Math.min(this._queuedProperties.length, this._options.updateLimit);
    if (this._isRunning && !count && this._waitingChain.length) {
      // If no properties are queued, but we have waiting flow nodes, add them to the queue for next update.
      for (var i = 0; i < this._waitingChain.length; ++i) {
        item = this._waitingChain[i];

        this.queueNodeEntry(item.node, item.name, item.fromNode, item.fromName, true, item.tracker);
      }

      this._waitingChain = [];
      return;
    }

    // Update a queued properties if any
    var index = count;
    while (index) {
      index--;
      item = this._queuedProperties.shift();
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
        item = this._queuedChain.shift();
        item.node._meta.flash = true;
        if (item.node._meta.broken > 0) {
          item.node._meta.broken--;
        }
        item.node._activeTracker = item.tracker;
        item.node.onActivated(item.name);
        item.node._activeTracker = null;
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
   * @param {number} id - The ID of the node.
   * @returns {wcNode|null} - Either the found node, or null.
   */
  nodeById: function(id) {
    var i = 0;
    for (i = 0; i < this._compositeNodes.length; ++i) {
      if (this._compositeNodes[i].id === id) {
        return this._compositeNodes[i];
      }
    }
    for (i = 0; i < this._entryNodes.length; ++i) {
      if (this._entryNodes[i].id === id) {
        return this._entryNodes[i];
      }
    }
    for (i = 0; i < this._processNodes.length; ++i) {
      if (this._processNodes[i].id === id) {
        return this._processNodes[i];
      }
    }
    for (i = 0; i < this._storageNodes.length; ++i) {
      if (this._storageNodes[i].id === id) {
        return this._storageNodes[i];
      }
    }

    for (i = 0; i < this._compositeNodes.length; ++i) {
      if (this._compositeNodes[i].instanceOf('wcNodeCompositeScript')) {
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
   * @param {string} className - The className of the nodes to retrieve.
   * @returns {wcNode[]} - A list of all found nodes.
   */
  nodesByClassName: function(className) {
    var i = 0;
    var result = [];
    for (i = 0; i < this._compositeNodes.length; ++i) {
      if (this._compositeNodes[i].className === className) {
        result.push(this._compositeNodes[i]);
      }
    }
    for (i = 0; i < this._entryNodes.length; ++i) {
      if (this._entryNodes[i].className === className) {
        result.push(this._entryNodes[i]);
      }
    }
    for (i = 0; i < this._processNodes.length; ++i) {
      if (this._processNodes[i].className === className) {
        result.push(this._processNodes[i]);
      }
    }
    for (i = 0; i < this._storageNodes.length; ++i) {
      if (this._storageNodes[i].className === className) {
        result.push(this._storageNodes[i]);
      }
    }

    for (i = 0; i < this._compositeNodes.length; ++i) {
      if (this._compositeNodes[i].instanceOf('wcNodeCompositeScript')) {
        var found = this._compositeNodes[i].nodesByClassName(className);
        if (found.length) {
          result = result.concat(found);
        }
      }
    }
    return result;
  },

  /**
   * Retrieves a list of nodes that match a given search filter.
   * @function wcPlay#nodesBySearch
   * @param {string} search - The search value.
   * @returns {wcNode[]} - A list of all found nodes.
   */
  nodesBySearch: function(search) {
    var i = 0;
    var result = [];
    for (i = 0; i < this._compositeNodes.length; ++i) {
      if (this._compositeNodes[i].search(search)) {
        result.push(this._compositeNodes[i]);
      }
    }
    for (i = 0; i < this._entryNodes.length; ++i) {
      if (this._entryNodes[i].search(search)) {
        result.push(this._entryNodes[i]);
      }
    }
    for (i = 0; i < this._processNodes.length; ++i) {
      if (this._processNodes[i].search(search)) {
        result.push(this._processNodes[i]);
      }
    }
    for (i = 0; i < this._storageNodes.length; ++i) {
      if (this._storageNodes[i].search(search)) {
        result.push(this._storageNodes[i]);
      }
    }

    for (i = 0; i < this._compositeNodes.length; ++i) {
      if (this._compositeNodes[i].instanceOf('wcNodeCompositeScript')) {
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
   * @param {boolean} silent - If supplied, assigns a new silent state of the script.
   * @returns {boolean} - The current silent state of the script.
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
   * @param {boolean} [debug] - If supplied, will assign the debugging state of the script.
   * @returns {boolean} - The current debugging state of the script.
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
   * @param {boolean} [paused] - If supplied, will assign the paused state of the script.
   * @returns {boolean} - The current pause state of the script.
   */
  paused: function(paused) {
    if (paused !== undefined) {
      paused = paused? true: false;
      var i = 0;

      if (this._isPaused !== paused) {
        for (i = 0; i < this._compositeNodes.length; ++i) {
          this._compositeNodes[i].paused(paused);
        }
        for (i = 0; i < this._entryNodes.length; ++i) {
          this._entryNodes[i].paused(paused);
        }
        for (i = 0; i < this._processNodes.length; ++i) {
          this._processNodes[i].paused(paused);
        }
        for (i = 0; i < this._storageNodes.length; ++i) {
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
   * @param {boolean} [stepping] - If supplied, will assign the stepping state of the script.
   * @returns {boolean} - The current stepping state of the script.
   */
  stepping: function(stepping) {
    if (stepping !== undefined) {
      this._isStepping = stepping? true: false;
    }

    return this._isStepping;
  },

  /**
   * Outputs a log message.
   * @function wcPlay#log
   * @param {...string} args - The log messages.
   */
  log: function(args) {
    /* eslint-disable no-console */
    args = Array.prototype.slice.call(arguments);
    args.splice(0, 0, 'wcPlay:');
    console.log.apply(console, args);
    /* eslint-enable no-console */
  },

  /**
   * Outputs an error message.
   * @function wcPlay#error
   * @param {...string} args - The log messages.
   */
  error: function(args) {
    /* eslint-disable no-console */
    args = Array.prototype.slice.call(arguments);
    args.splice(0, 0, 'wcPlay ERROR:');
    if (console.error) {
      console.error.apply(console, args);
    } else {
      console.log.apply(console, args);
    }
    /* eslint-enable no-console */
  },

  /**
   * Creates a new global property (can be used with the global storage node).
   * @function wcPlay#createProperty
   * @param {string} name - The name of the property.
   * @param {wcPlay.PROPERTY} type - The type of property.
   * @param {Object} [initialValue] - A default value for this property.
   * @param {Object} [options] - Additional options for this property, see {@link wcPlay.PROPERTY}.
   * @returns {boolean} - Fails if the property does not exist.
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
      options: options || {}
    });
    return true;
  },

  /**
   * Renames an existing global property.
   * @function wcPlay#renameProperty
   * @param {string} name - The current name of the global property to rename.
   * @param {string} newName - The new desired name of the global property.
   * @returns {boolean} - Fails if the property was not found or if the new name is already used.
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
    this.notifyNodes('onGlobalPropertyRenamed', [name, newName]);
  },

  /**
   * Removes a global property.
   * @function wcPlay#removeProperty
   * @param {string} name - The name of the property to remove.
   * @returns {boolean} - Fails if the property does not exist.
   */
  removeProperty: function(name) {
    for (var i = 0; i < this._properties.length; ++i) {
      if (this._properties[i].name === name) {
        this.notifyNodes('onGlobalPropertyRemoved', [name]);
        this._properties.splice(i, 1);
        return true;
      }
    }
    return false;
  },

  /**
   * Gets, or Sets a global property value.
   * @function wcPlay#property
   * @param {string} name - The name of the property.
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
      this.notifyNodes('onGlobalPropertyChanged', [prop.name, oldValue, prop.value]);
    }

    return prop.value;
  },

  /**
   * Gets, or Sets a global property initial value.
   * @function wcPlay#initialProperty
   * @param {string} name - The name of the property.
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
      this.notifyNodes('onGlobalInitialPropertyChanged', [prop.name, oldValue, prop.initialValue]);

      if (prop.value == oldValue) {
        prop.value = value;
        this.notifyNodes('onGlobalPropertyChanged', [prop.name, oldValue, prop.value]);
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
        type: myProp.type,
        value: myProp.value,
        initialValue: myProp.initialValue,
        options: myProp.options
      });
    }

    return result;
  },

  /**
   * Triggers an event into the Play script.
   * @function wcPlay#triggerEvent
   * @param {string} type - The type name of the node (as displayed in the title).
   * @param {wcPlay~TriggerEventOptions} [options] - Optional parameters.
   */
  triggerEvent: function(type, options) {
    options = options || {};

    var activeTracker = null;
    if (typeof options.done === 'function') {
      activeTracker = this.beginFlowTracker({}, null, options.done);
    }

    if (this._isRunning) {
      for (var i = 0; i < this._entryNodes.length; ++i) {
        var node = this._entryNodes[i];
        if (node.type === type && (!options.hasOwnProperty('name') || node.name === options.name)) {
          node._activeTracker = activeTracker;
          node.onActivated(options.data);
          node._activeTracker = null;
        }
      }
    }

    var self = this;
    setTimeout(function() {
      self.endFlowTracker(activeTracker);
    }, 0);
  },

  /**
   * Sends a custom notification event to all nodes.
   * @function wcPlay#notifyNodes
   * @param {string} func - The node function to call.
   * @param {Object[]} args - A list of arguments to forward into the function call.
   * @param {boolean} [includeEditorPalette] - If true, will also notify all nodes generated for use with editor palette views.
   */
  notifyNodes: function(func, args, includeEditorPalette) {
    var i = 0;
    var self = null;
    for (i = 0; i < this._compositeNodes.length; ++i) {
      self = this._compositeNodes[i];
      if (typeof self[func] === 'function') {
        self[func].apply(self, args);
      }
    }
    for (i = 0; i < this._entryNodes.length; ++i) {
      self = this._entryNodes[i];
      if (typeof self[func] === 'function') {
        self[func].apply(self, args);
      }
    }
    for (i = 0; i < this._processNodes.length; ++i) {
      self = this._processNodes[i];
      if (typeof self[func] === 'function') {
        self[func].apply(self, args);
      }
    }
    for (i = 0; i < this._storageNodes.length; ++i) {
      self = this._storageNodes[i];
      if (typeof self[func] === 'function') {
        self[func].apply(self, args);
      }
    }

    for (i = 0; i < this._compositeNodes.length; ++i) {
      if (this._compositeNodes[i].instanceOf('wcNodeCompositeScript')) {
        this._compositeNodes[i].notifyNodes(func, args);
      }
    }

    if (includeEditorPalette) {
      this.notifyEditors('notifyPaletteNodes', [func, args]);
    }
  },

  /**
   * Sends a custom notification event to all renderers.
   * @function wcPlay#notifyEditors
   * @param {string} func - The renderer function to call.
   * @param {Object[]} args - A list of arguments to forward into the function call.
   */
  notifyEditors: function(func, args) {
    var self = null;
    for (var i = 0; i < this._editors.length; ++i) {
      self = this._editors[i];
      if (typeof self[func] === 'function') {
        self[func].apply(self, args);
      }
    }
  },

  /**
   * Queues a node entry link to trigger on the next update.
   * @function wcPlay#queueNodeEntry
   * @param {wcNode} node - The node being queued.
   * @param {string} name - The entry link name.
   * @param {wcNode} fromNode - The node causing the queue.
   * @param {string} fromName - The exit link name.
   * @param {boolean} [forceQueue] - If true, will force the event into the queue rather than the waiting list.
   * @param {wcPlay~FlowTracker} [tracker] - Optional flow tracker.
   */
  queueNodeEntry: function(node, name, fromNode, fromName, forceQueue, tracker) {
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
          fromName: fromName,
          tracker: tracker
        });
      }
      return;
    }

    if (node.enabled()) {
      this._queuedChain.push({
        node: node,
        name: name,
        tracker: tracker
      });

      if (node.debugBreak() || this._isStepping) {
        node._meta.flash = true;
        node._meta.broken++;
        this._isPausing = true;
      }

      // Flash the entry link.
      var i = 0;
      for (i = 0; i < node.chain.entry.length; ++i) {
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
        for (i = 0; i < fromNode.chain.exit.length; ++i) {
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
    } else {
      this.endFlowTracker(tracker);
    }
  },

  /**
   * Queues a node property value change to trigger on the next update.
   * @function wcPlay#queueNodeProperty
   * @param {wcNode} node - The node being queued.
   * @param {string} name - The property name.
   * @param {Object} value - The property value.
   * @param {boolean} [upstream] - If true, we are propagating the property change in reverse.
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
        upstream: upstream
      });

      // if (this._queuedChain.length > 0) {
      //   this._waitingChain = this._queuedChain;
      //   this._queuedChain = [];
      // }

      if (node.debugBreak()) {
        node._meta.flash = true;
      }

      if (this._isStepping) {
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
   * Creates a chain tracker for a callback method.
   * @function wcPlay#beginFlowTracker
   * @param {wcNode} node - The node invoking this tracker.
   * @param {wcPlay~FlowTracker} [parent] - Parent tracker object.
   * @param {Function} [callback] - Optional callback handler to call when this tracked chain has finished.
   * @returns {wcPlay~FlowTracker} - A chain tracker object.
   */
  beginFlowTracker: function(node, parent, callback) {
    // No need to track if we have nothing listening.
    if (!parent && !callback) {
      return null;
    }

    if (this._flowTrackers >= this._options.flowTrackerLimit) {
      if (!this._hasWarnedTrackLimit) {
        this._hasWarnedTrackLimit = true;
        if (this._editors.length) {
          alert('Flow Trackers have exceeded the limit, please ensure that you are not creating an infinite flow loop.\n\nThe chain will be forced to stop.\n\nThis message will only appear once.');
        }
      }
      this.error('Flow Trackers have exceeded the limit, please ensure that you are not creating an infinite flow loop. The chain will be forced to stop.');
      this.endFlowTracker(parent);
      return null;
    }

    var tracker = {
      node: node,
      parent: parent,
      callback: callback,
      children: []
    };

    this._flowTrackers++;
    if (parent) {
      parent.children.push(tracker);
    }
    return tracker;
  },

  /**
   * Finishes a chain tracker.
   * @function wcPlay#endFlowTracker
   * @param {wcPlay~FlowTracker} tracker - The tracker to finish.
   */
  endFlowTracker: function(tracker) {
    // Ignore if there is no tracker, or the tracker is dead.
    if (!tracker || tracker.dead) {
      return;
    }

    // Cannot end a tracker that still has children.
    if (tracker.children.length) {
      return;
    }

    this._flowTrackers--;
    if (this._flowTrackers < 0) {
      this.error('Flow tracker count reduced below zero!');
    }

    // Kill this tracker, in case anything else is still referencing it.
    tracker.dead = true;

    // Call any callbacks on this finished flow tracker.
    if (tracker.callback) {
      tracker.node._activeTracker = tracker.parent;
      tracker.callback.call(tracker.node);
      tracker.node._activeTracker = null;
    }

    // Now remove this tracker from its parent, if able.
    if (tracker.parent) {
      var index = tracker.parent.children.indexOf(tracker);
      if (index > -1) {
        tracker.parent.children.splice(index, 1);
      }
      // If there are no more children to track for this parent,
      // we can end this parent as well.
      if (tracker.parent.children.length === 0) {
        this.endFlowTracker(tracker.parent);
      }
    }
  },

  /**
   * Destroys this instance.
   * @function wcPlay#destroy
   */
  destroy: function() {
    this.clear();

    this._importedScripts = [];

    while (this._editors.length) {
      this._editors[0].engine(null);
    }

    if (this._updateInterval) {
      clearInterval(this._updateInterval);
    }

    var index = wcPlay.INSTANCE_LIBRARY.indexOf(this);
    if (index > -1) {
      wcPlay.INSTANCE_LIBRARY.splice(index, 1);
    }
  },

  /**
   * Retrieves the class name of this object.
   * @function wcPlay#isA
   * @param {string} name - The class name to test.
   * @returns {boolean} - True if this named class is this class.
   */
  isA: function(name) {
    return name === 'wcPlay';
  },

  /**
   * Retrieves the class name of this object.
   * @function wcPlay#instanceOf
   * @param {string} name - The class name to test.
   * @returns {boolean} - True if the named class is an instanced of this class.
   */
  instanceOf: function(name) {
    return name === 'wcPlay';
  },

  /**
   * Adds a node into the known node stacks.
   * @function wcPlay#__addNode
   * @private
   * @param {wcNode} node - The node to add.
   */
  __addNode: function(node) {
    if (node.instanceOf('wcNodeComposite')) {
      this._compositeNodes.push(node);
    } else if (node.instanceOf('wcNodeEntry')) {
      this._entryNodes.push(node);
    } else if (node.instanceOf('wcNodeProcess')) {
      this._processNodes.push(node);
    } else if (node.instanceOf('wcNodeStorage')) {
      this._storageNodes.push(node);
    }
  },

  /**
   * Removes a node from the known node stacks.
   * @function wcPlay#__removeNode
   * @private
   * @param {wcNode} node - The node to remove.
   * @returns {boolean} - Fails if the node was not found in this script.
   */
  __removeNode: function(node) {
    var index = -1;
    if (node.instanceOf('wcNodeComposite')) {
      index = this._compositeNodes.indexOf(node);
      if (index > -1) {
        this._compositeNodes.splice(index, 1);
      }
    } else if (node.instanceOf('wcNodeEntry')) {
      index = this._entryNodes.indexOf(node);
      if (index > -1) {
        this._entryNodes.splice(index, 1);
      }
    } else if (node.instanceOf('wcNodeProcess')) {
      index = this._processNodes.indexOf(node);
      if (index > -1) {
        this._processNodes.splice(index, 1);
      }
    } else if (node.instanceOf('wcNodeStorage')) {
      index = this._storageNodes.indexOf(node);
      if (index > -1) {
        this._storageNodes.splice(index, 1);
      }
    }

    // If the node was not found, propagate the removal to all composite nodes.
    if (index === -1) {
      for (var i = 0; i < this._compositeNodes.length; ++i) {
        if (this._compositeNodes[i].instanceOf('wcNodeCompositeScript') &&
            this._compositeNodes[i].__removeNode(node)) {
          return true;
        }
      }
    }

    return false;
  },

  /**
   * Retrieves the next node id.
   * @function wcPlay#__nextNodeId
   * @private
   * @returns {number} - The next available node id.
   */
  __nextNodeId: function() {
    return ++this._nodeId;
  },

  /**
   * Gets or sets the current node id.
   * @function wcPlay#__curNodeId
   * @private
   * @param {number} [cur] - If supplied, will assign the current node id.
   * @returns {number} - The current node id.
   */
  __curNodeId: function(cur) {
    if (typeof cur === 'number') {
      this._nodeId = cur;
    }
    return this._nodeId;
  }
};



function wcNodeTimeoutEvent(node, callback, delay) {
  this._node = node;
  this._timerId = 0;
  this._callback = callback;
  this._remaining = delay;
  this._marker = 0;
}

wcNodeTimeoutEvent.prototype = {
  pause: function() {
    clearTimeout(this._timerId);
    this._remaining -= new Date().getTime() - this._marker;
  },

  resume: function() {
    this._marker = new Date().getTime();
    clearTimeout(this._timerId);
    var self = this;
    this._timerId = setTimeout(function() {
      self._node.finishThread(self);
      self._callback && self._callback.call(self._node);
      self.__clear();
    }, this._remaining);
  },

  __clear: function() {
    this._node = null;
    this._callback = null;
    clearTimeout(this._timerId);
  }
};
