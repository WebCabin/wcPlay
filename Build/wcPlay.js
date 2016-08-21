(function(){
  // Already defined, then we can skip.
  if (this.wcPlayNodes && this.wcPlayNodes['wcClass']) {
    return;
  }

  if (!this.wcPlayNodes) {
    this.wcPlayNodes = {};
  }

  if (!Function.prototype.bind) {
    Function.prototype.bind = function(oThis) {
      if (typeof this !== 'function') {
        // closest thing possible to the ECMAScript 5
        // internal IsCallable function
        throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
      }

      var aArgs   = Array.prototype.slice.call(arguments, 1),
        fToBind = this,
        fNOP    = function() {},
        fBound  = function() {
          return fToBind.apply(this instanceof fNOP? this : oThis, aArgs.concat(Array.prototype.slice.call(arguments)));
        };

      if (this.prototype) {
        // Function.prototype doesn't have a prototype property
        fNOP.prototype = this.prototype; 
      }
      fBound.prototype = new fNOP();

      return fBound;
    };
  }

  var initializing = false;

  /**
   * JavaScript class inheritance system.
   * @class wcClass
   */
  var wcClass = function(){};

  /**
   * Extends the class object.
   * @function wcClass.extend
   * @param {string} className - The name of the class to define.
   * @param {...Object} _args - Any parameters to pass on to the class constructor.
   * @returns {Object} - The new inherited class object.
   */
  wcClass.extend = function(className, _args) {
    // Validate class name.
    if (!className.match(/^[a-z]+[\w]*$/i)) {
      throw new Error('Class name contains invalid characters!');
    }

    _args;
    // Last argument is always the class definition.
    var props = arguments[arguments.length-1];

    var _super = this.prototype;

    // Create a bound super class object that contains all of the
    // parent methods, but bound to the current object.
    var _boundSuper = {};
    for (var key in _super) {
      if (typeof _super[key] === 'function') {
        _boundSuper[key] = _super[key].bind(prototype);
      }
    }


    // Instantiate a base class (but only create the instance,
    // don't run the init constructor)
    initializing = true;
    var prototype = new this(arguments);
    initializing = false;

    function BindSuper(owner, name) {
      var bound = null;
      if (_super && typeof _super[name] === 'function') {
        bound = _super[name].bind(owner);
      } else {
        bound = function(){};
      }
      bound.prototype = _boundSuper;
      return bound;
    }

    // Copy the properties over onto the new prototype
    for (var name in props) {
      // Check if we're overwriting an existing function
      // prototype[name] = typeof props[name] === 'function' && typeof _super[name] === 'function'?
      prototype[name] = typeof props[name] === 'function'?
        (function(name, fn){
          return function() {
            var tmp = this._super;
           
            // Add a new this._super() method that is the same method
            // but on the super-class
            this._super = BindSuper(this, name);
           
            // The method only need to be bound temporarily, so we
            // remove it when we're done executing
            var ret = fn.apply(this, arguments);
            this._super = tmp;
           
            return ret;
          };
        })(name, props[name]):
        props[name];
    }

    function __init() {
      if(!initializing) {
        this.init && this.init.apply(this, arguments);
      } else {
        this.classInit && this.classInit.apply(this, arguments[0]);
      }
    }

    // Is a functionality.
    prototype.isA = function(name) {
      return name === className;
    };

    // Instance of functionality.
    prototype.instanceOf = function(name) {
      return this.isA(name) || (_super.instanceOf && _super.instanceOf(name));
    };

    // Converts __init to a new function that is named after className
    var Class = 'wcPlayNodes.' + className + ' = function ' + className + '() {' + __init.toString().match(/function[^{]+\{([\s\S]*)\}$/)[1] + '};';
    eval(Class);

    // Populate our constructed prototype object
    wcPlayNodes[className].prototype = prototype;

    // And make this class extendable
    wcPlayNodes[className].extend = arguments.callee;
    return Class;
  };
  this.wcPlayNodes.wcClass = wcClass;

  /**
   * Class constructor.
   * @function wcClass#init
   * @params {..Object} Any parameters to pass on to the class constructor.
   */
  /**
   * Initializes a class type.
   * @function wcClass#classInit
   * @params {..Object} Any parameters to pass on to the class constructor.
   */
})();
'use strict';

/**
 * The main scripting engine.
 * @class
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
    debugging: true,
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
  CUSTOM: 'custom',
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
  COMPOSITE: 'composite',
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
    nodeType: nodeType,
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

    this._queuedChain = [];
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
            console.log('wcPlay ERROR: Attempted to load node "' + data.nodes[i].className + '" with error :' + e);
          }
        } else {
          console.log('wcPlay ERROR: Attempted to load node "' + data.nodes[i].className + '", but the constructor could not be found!');
        }
      }

      // Second pass, import each node's serialized data.
      for (i = 0; i < nodes.length; ++i) {
        nodes[i].node.import(nodes[i].data);
      }

      this.reset();
      return true;
    } catch (e) {
      // Something went wrong, restore the previous script.
      console.log(e.stack);
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
    } catch (e) {
      console.log(e.stack);
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
      options: options || {},
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

    for (var i = 0; i < this._entryNodes.length; ++i) {
      var node = this._entryNodes[i];
      if (node.type === type && (!options.hasOwnProperty('name') || node.name === options.name)) {
        node._activeTracker = activeTracker;
        node.onActivated(options.data);
        node._activeTracker = null;
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
      console.log('wcPlay ERROR: Flow Trackers have exceeded the limit, please ensure that you are not creating an infinite flow loop. The chain will be forced to stop.');
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
      console.log('wcPlay ERROR: Flow tracker count reduced below zero!');
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
  },
};

wcPlayNodes.wcClass.extend('wcNode', 'Node', '', {
  /**
   * The foundation class for all nodes.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init functions.
   * <br><b>Should be inherited and never constructed directly</b>.
   * @class wcNode
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);
    this.color = '#FFFFFF';
    if (!this.name) {
      this.name = '';
    }

    this._activeTracker = null;
    this._viewportSize = null;

    this.pos = {
      x: pos && pos.x || 0,
      y: pos && pos.y || 0,
    };

    this.chain = {
      entry: [],
      exit: [],
    };
    this.properties = [];

    this._meta = {
      flash: false,
      flashDelta: 0,
      color: null,
      broken: 0,
      awake: false,
      dirty: true,
      threads: [],
      description: '',
      details: '',
    };
    this._break = false;
    this._log = false;

    this._parent = parent;

    // Give the node its default properties.
    this.createProperty(wcNode.PROPERTY_ENABLED, wcPlay.PROPERTY.TOGGLE, true, {description: 'Disabled nodes will be treated as if they were not there, all connections will be ignored.', input: true, output: true});

    // Add this node to its parent.
    if (this._parent) {
      this._parent.__addNode(this);
    }

    // Assign this node a unique ID if possible.
    var engine = this.engine();
    if (engine) {
      this.id = engine.__nextNodeId();
    }
  },

  /**
   * Inherits a new class from this node.
   * @function wcNode#extend
   * @param {string} className - The class name for your node, this should be unique between all global class names.
   * @param {string} displayName - The display name of your node.
   * @param {string} category - The category to display your node in the editor palette.
   * @param {Object} classDef - An object that defines your class with all functions and variables.
   */

  /**
   * Destroys and removes the node.
   * @function wcNode#destroy
   */
  destroy: function() {
    var i = 0, item = null;
    this.onDestroying();

    // Remove all links.
    for (i = 0; i < this.chain.entry.length; ++i) {
      item = this.chain.entry[i];
      this.disconnectEntry(item.name);
    }

    for (i = 0; i < this.chain.exit.length; ++i) {
      item = this.chain.exit[i];
      this.disconnectExit(item.name);
    }

    for (i = 0; i < this.properties.length; ++i) {
      item = this.properties[i];
      this.disconnectInput(item.name);
      this.disconnectOutput(item.name);
    }

    this.reset();

    // Remove the node from its parent.
    this._parent && this._parent.__removeNode(this);
    this.onDestroyed();
  },

  /**
   * Resets all properties to their initial values.
   * @function wcNode#reset
   */
  reset: function() {
    this.onReset();

    this.resetThreads();
    this._meta.awake = false;
    this._meta.dirty = true;
    this._meta.broken = 0;
    this._meta.paused = false;

    for (var i = 0; i < this.properties.length; ++i) {
      this.properties[i].value = this.properties[i].initialValue;
    }
  },

  /**
   * Resets only latent running threads.
   * @function wcNode#resetThreads
   */
  resetThreads: function() {
    var engine = this.engine();
    for (var i = 0; i < this._meta.threads.length; ++i) {
      var thread = this._meta.threads[i];
      if (typeof thread.id === 'number') {
        // Number values indicate either a timeout or an interval, clear them both.
        clearTimeout(thread.id);
        clearInterval(thread.id);
      } else if (typeof thread.id.__clear === 'function') {
        // wcNodeTimeoutEvent has a __clear method that will clear this timeout.
        thread.id.__clear();
      } else if (typeof thread.id.abort === 'function') {
        // jqXHR has an abort method that will stop the ajax call.
        // Using the built in fetch request will also create the abort method.
        thread.id.abort();
      } else if (typeof thread.id === 'function') {
        // A function callback is simply called.
        this._activeTracker = thread.tracker;
        thread.id();
      }
      engine && engine.endFlowTracker(thread.tracker);
    }
    this._meta.threads = [];
  },

  /**
   * Imports previously [exported]{@link wcNode#export} data to generate this node.
   * @function wcNode#import
   * @param {Object} data - The data to import.
   * @param {Number[]} [idMap] - If supplied, identifies a mapping of old ID's to new ID's, any not found in this list will be unchanged.
   */
  import: function(data, idMap) {
    var i = 0, chain = null, targetNode = null;
    this.onImporting(data, idMap);

    this.id = idMap && idMap[data.id] || data.id;
    this.name = data.name,
    this.color = data.color,
    this.pos.x = data.pos.x,
    this.pos.y = data.pos.y,
    this.debugBreak(data.breakpoint);

    // Restore property values.
    for (i = 0; i < data.properties.length; ++i) {
      this.initialProperty(data.properties[i].name, data.properties[i].initialValue);
      this.property(data.properties[i].name, data.properties[i].value);
    }

    var engine = this.engine();
    if (!engine) {
      return;
    }

    if (this.id > engine.__curNodeId()) {
      engine.__curNodeId(this.id);
    }

    // Re-connect all chains.
    for (i = 0; i < data.entryChains.length; ++i) {
      chain = data.entryChains[i];
      targetNode = engine.nodeById((idMap && idMap[chain.outNodeId]) || chain.outNodeId);
      if (targetNode && this._parent === targetNode._parent) {
        this.connectEntry(chain.inName, targetNode, chain.outName);
      }
    }
    for (i = 0; i < data.exitChains.length; ++i) {
      chain = data.exitChains[i];
      targetNode = engine.nodeById((idMap && idMap[chain.inNodeId]) || chain.inNodeId);
      if (targetNode && this._parent === targetNode._parent) {
        this.connectExit(chain.outName, targetNode, chain.inName);
      }
    }
    for (i = 0; i < data.inputChains.length; ++i) {
      chain = data.inputChains[i];
      targetNode = engine.nodeById((idMap && idMap[chain.outNodeId]) || chain.outNodeId);
      if (targetNode && this._parent === targetNode._parent) {
        this.connectInput(chain.inName, targetNode, chain.outName);
      }
    }
    for (i = 0; i < data.outputChains.length; ++i) {
      chain = data.outputChains[i];
      targetNode = engine.nodeById((idMap && idMap[chain.inNodeId]) || chain.inNodeId);
      if (targetNode && this._parent === targetNode._parent) {
        this.connectOutput(chain.outName, targetNode, chain.inName);
      }
    }
    this._meta.dirty = true;

    this.onImported(data, idMap);
  },

  /**
   * Exports information about this node as well as all connected chain data so it can be [imported]{@link wcNode#import} later.
   * @function wcNode#export
   * @param {boolean} [minimal] - If true, only the most important data should be exported, this means current values and redundant link connections are omitted.
   * @returns {Object} - The exported data for this node.
   */
  export: function(minimal) {
    var data = {
      className: this.className,
      id: this.id,
      name: this.name,
      color: this.color,
      pos: {
        x: this.pos.x,
        y: this.pos.y
      },
      breakpoint: this._break,
      properties: this.listProperties(minimal),
      exitChains: this.listExitChains(),
      outputChains: this.listOutputChains(),
    };

    // Include additional info if we aren't minimal
    if (!minimal) {
      data.entryChains = this.listEntryChains();
      data.inputChains = this.listInputChains();
    } else {
      data.entryChains = [];
      data.inputChains = [];
    }

    this.onExport(data, minimal);
    return data;
  },

  /**
   * Retrieves the wcPlay engine that owns this node.
   * @function wcNode#engine
   * @returns {wcPlay|null} - Either the wcPlay engine, or null if it doesn't belong to one.
   */
  engine: function() {
    var play = this._parent;
    while (play && !(play.instanceOf('wcPlay'))) {
      play = play._parent;
    }
    return play || null;
  },

  /**
   * Sets, or Gets this node's enabled state.
   * @function wcNode#enabled
   * @param {boolean} [enabled] - If supplied, will assign a new enabled state.
   * @returns {boolean} - The current enabled state.
   */
  enabled: function(enabled) {
    if (enabled !== undefined) {
      this.property(wcNode.PROPERTY_ENABLED, enabled? true: false);
      this._meta.dirty = true;
    }

    return this.property(wcNode.PROPERTY_ENABLED);
  },

  /**
   * Gets, or Sets whether this node is paused, or any nodes inside if it is a composite.
   * <br>When pausing, all {@link wcNode#setTimeout} events are also paused so they don't jump ahead of the debugger.
   * @function wcNode#paused
   * @param {boolean} paused - If supplied, will assign a new paused state.
   * @returns {boolean} - Whether this, or inner nodes, are paused.
   */
  paused: function(paused) {
    var i = 0;
    if (paused !== undefined) {
      // Pausing the node.
      if (paused) {
        for (i = 0; i < this._meta.threads.length; ++i) {
          if (typeof this._meta.threads[i].id.pause === 'function') {
            // wcNodeTimeoutEvent has a pause method.
            this._meta.threads[i].id.pause();
          }
        }
        this._meta.paused = true;
      } else {
        for (i = 0; i < this._meta.threads.length; ++i) {
          if (typeof this._meta.threads[i].id.resume === 'function') {
            // wcNodeTimeoutEvent has a resume method.
            this._meta.threads[i].id.resume();
          }
        }

        this._meta.paused = false;
      }
    }
    return this._meta.paused;
  },

  /**
   * Retrieves whether the node has been broken via breakpoint in the debugger tool.
   * @function wcNode#isBroken
   * @returns {boolean} - Whether the script is 'broken' (paused).
   */
  isBroken: function() {
    return this._meta.broken > 0;
  },

  /**
   * Sets, or Gets this node's debug log state.
   * @function wcNode#debugLog
   * @param {boolean} [enabled] - If supplied, will assign a new debug log state.
   * @returns {boolean} - The current debug log state.
   */
  debugLog: function(enabled) {
    if (enabled !== undefined) {
      this._log = enabled? true: false;
    }

    var engine = this.engine();
    return (!engine || engine.silent())? false: this._log;
  },

  /**
   * Sets, or Gets this node's debug pause state.
   * @function wcNode#debugBreak
   * @param {boolean} [enabled] - If supplied, will assign a new debug pause state.
   * @returns {boolean} - The current debug pause state.
   */
  debugBreak: function(enabled) {
    if (enabled !== undefined) {
      this._break = enabled? true: false;
    }

    var engine = this.engine();
    return (engine && engine.debugging() && this._break);
  },

  /**
   * Gets, or Sets the description for this node. This is usually shown as a tooltip for the node within the editor tool.
   * @function wcNode#description
   * @param {string} [description] - If supplied, will assign a new description for this node.
   * @returns {string} - The current description of this node.
   */
  description: function(description) {
    if (description !== undefined) {
      this._meta.description = description;
    }

    return this._meta.description;
  },

  /**
   * Gets, or Sets the very verbose description details for this node. This is usually shown as a popup dialog to further explain the user of the node.
   * @function wcNode#details
   * @param {string} [details] - If supplied, will assign a new description details for this node.
   * @returns {string} - The current description details of this node.
   */
  details: function(details) {
    if (details !== undefined) {
      this._meta.details = details;
    }

    return this._meta.details;
  },

  /**
   * Determines whether a search value matches this node.
   * @function wcNode#search
   * @param {string} search - The search value.
   * @returns {boolean} - True if the search matches this node.
   */
  search: function(search) {
    if (this.type.toLowerCase().indexOf(search) > -1 ||
        this.name.toLowerCase().indexOf(search) > -1) {
      return true;
    }

    return false;
  },

  /**
   * Utility function for setting a timed event in a way that is compatible with live debugging in the editor tool.
   * @function wcNode#setTimeout
   * @param {Function} callback - A callback function to call when the time has elapsed. As an added convenience, 'this' will be the node instance.
   * @param {number} delay - The time delay, in milliseconds, to wait before calling the callback function.
   * @example
   * onActivated: function(name) {
   *   this._super(name);
   *
   *   // Now set a timeout to wait for 'Milliseconds' amount of time.    
   *   var delay = this.property('milliseconds');
   *
   *   // Start a timeout event using the node's built in timeout handler.
   *   this.setTimeout(function() {
   *     this.activateExit('out');
   *   }, delay);
   * }
   */
  setTimeout: function(callback, delay) {
    var timer = new wcNodeTimeoutEvent(this, callback, delay);
    this.beginThread(timer);
    if (!this._meta.paused) {
      timer.resume();
    }
  },

  /**
   * Utility function for setting an interval update in a way that is compatible with live debugging in the editor tool.<br>
   * <b>Note:</b> You can call {@link wcNode#resetThreads} if you want to cancel any existing intervals running on your node.
   * @function wcNode#setInterval
   * @param {Function} callback - A callback function to call each time the time interval has elapsed. As an added convenience, 'this' will be the node instance.
   * @param {number} interval - The time interval, in milliseconds, between each call to callback.
   * @example
   * onActivated: function(name) {
   *   var interval = this.property('milliseconds');
   *   this.resetThreads();
   *
   *   this.setInterval(function() {
   *     this.activateExit('out');
   *   }, interval);
   * }
   */
  setInterval: function(callback, interval) {
    function __onInterval() {
      callback && callback.call(this);

      // Really just call the set timeout, over and over.
      this.setTimeout(__onInterval, interval);
    }

    this.setTimeout(__onInterval, interval);
  },

  /**
   * Utility function for performing an AJAX request in a way that is compatible with live debugging in the editor tool.
   * <br>The success, error, and complete callback functions are changed so that the 'this' object is the node instance, or the custom context if you provided a context in your options.
   * <br>Note: This method specifically uses JQuery for the ajax operation, so you will need to include that library if you intend to use this.
   * @function wcNode#ajax
   * @param {string} [url] - Option URL to send the request, if not supplied, it should be provided in the options parameter.
   * @param {Object} [options] - The options for the request, as described here: {@link http://api.jquery.com/jquery.ajax/}.
   * @returns {jqXHR|function} - The jQuery XHR object generated by the ajax request. If an older version of jQuery is used, you will receive a function instead.
   */
  ajax: function(url, options) {
    if (typeof url === 'object') {
      options = url;
    }

    if (!options) {
      options = {};
    }

    if (typeof url === 'string') {
      options.url = url;
    }

    var cancelled = false;
    var self = this;
    var context = options.context || this;
    function __wrapCallbackComplete(cb) {
      return function() {
        setTimeout(function() {
          self.finishThread(xhr);
        }, 0);
        __wrapCallback(cb)();
      };
    }
    function __wrapCallback(cb) {
      return function() {
        if (!cancelled) {
          cb && cb.apply(context, arguments);
        }
      };
    }

    options.success  = __wrapCallback(options.success);
    options.error    = __wrapCallback(options.error);
    options.complete = __wrapCallbackComplete(options.complete);

    var xhr = $.ajax(options);

    // Failsafe in case we are running an older version of jQuery which does not yet return the jqXHR object.
    if (xhr === undefined) {
      xhr = function() {
        cancelled = true;
      };
    }
    return this.beginThread(xhr);
  },

  /**
   * Utility function for performing a fetch request in a way that is compatible with live debugging in the editor tool.
   * <br>The success, error, and complete callback functions are changed so that the 'this' object is the node instance, or the custom context if you provided a context in your options.
   * <br>Note: This method specifically uses browsers fetch which is an experimental technology and not supported by all browsers unless a polyfill is used.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
   * @function wcNode#fetch
   * @param {string} url - URL to send the request.
   * @param {Object} [options] - The options for the request, as described here: {@link https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch}.
   * @returns {Promise.<Object>} - The promise object that carries the response. This will throw if the response was not a success.
   */
  fetch: function(url, options) {
    var cancelled = false;
    var self = this;
    var promise = null;
    try {
      promise = fetch(url, options).catch(function(err) {
        // Something bad happened before we got a response! Perhaps invalid options?
        setTimeout(function() {
          self.finishThread(promise);
        }, 0);
        throw err;
      }).then(function(result) {
        // Finish the thread.
        setTimeout(function() {
          self.finishThread(promise);
        }, 0);

        // Check the status of the response.
        if (!cancelled) {
          if (result.status >= 200 && result.status < 300) {
            return result.text();
          } else {
            var err = new Error(result.statusText);
            err.response = result;
            throw err;
          }
        } else {
          throw new Error('Fetch operation was cancelled.');
        }
      });
    } catch (err) {
      promise = new Promise(function(resolve, reject) {
        reject(err);
      });
    }
    // Provide my own 'abort' method to call in the
    // case we want to cancel the request.
    // Promises can not really be cancelled, but I can
    // at least stop the chain from reaching the caller.
    promise.abort = function() {
      cancelled = true;
    };
    return this.beginThread(promise);
  },

  /**
   * If your node takes time to process, call this to begin a thread that will keep the node 'active' until you close the thread with {@link wcNode#finishThread}.
   * <br>This ensures that, even if a node is executed more than once at the same time, each 'thread' is kept track of individually.
   * <br><b>Note:</b> This is not necessary if your node executes immediately without a timeout.
   * <b>Also Note:</b> If using a setTimeout event, it is recommended that you use {@link wcNode#setTimeout} instead.
   * @function wcNode#beginThread
   * @param {Number|Function} id - The thread ID, generated by a call to setTimeout, setInterval, or a function to call when we want to force cancel the job.
   * @returns {number} - The id that was given {@link wcNode#finishThread}.
   * @example
   *  onActivated: function(name) {
   *    this._super(name);
   *
   *    // Always fire the 'out' link immediately.
   *    this.activateExit('out');
   *
   *    // Now set a timeout to wait for 'Milliseconds' amount of time.
   *    var self = this;
   *    var delay = this.property('milliseconds');
   *
   *    // Start a new thread that will keep the node alive until we are finished.
   *    var thread = this.beginThread(setTimeout(function() {
   *      // Once the time has completed, fire the 'Finished' link and finish our thread.
   *      self.activateExit('finished');
   *      self.finishThread(thread);
   *    }, delay));
   *  }
   */
  beginThread: function(id) {
    var thread = {
      id: id,
      tracker: this._activeTracker
    };

    this._meta.threads.push(thread);
    this._meta.flash = true;
    this._meta.awake = true;
    return id;
  },

  /**
   * Finishes a previously started thread from {@link wcNode#beginThread}.
   * <br><b>Note:</b> If you do not properly finish a thread that was generated, your node will remain forever in its active state.
   * @function wcNode#finishThread
   * @param {Number|Function} id - The thread ID to close, returned to you by the call to {@link wcNode#beginThread}.
   */
  finishThread: function(id) {
    var index = this._meta.threads.findIndex(function(thread) {
      return thread.id === id;
    });
    
    if (index > -1) {
      var tracker = this._meta.threads[index].tracker;

      this._meta.threads.splice(index, 1);

      if (!this._meta.threads.length) {
        this._meta.awake = false;
      }

      // Finish any trackers.
      var engine = this.engine();
      setTimeout(function() {
        engine && engine.endFlowTracker(tracker);
      });
      this._activeTracker = tracker;
    }
  },

  /**
   * Gets, or Sets the current position of the node.
   * @function wcNode#pos
   * @param {wcPlay~Coordinates} [pos] - If supplied, will assign a new position for this node.
   * @returns {wcPlay~Coordinates} - The current position of this node.
   */
  pos: function(pos) {
    if (pos !== undefined) {
      this.pos.x = pos.x;
      this.pos.y = pos.y;
      this._meta.dirty = true;
    }

    return {x: this.pos.x, y: this.pos.y};
  },

  /**
   * Creates a new entry link on the node.
   * @function wcNode#createEntry
   * @param {string} name - The name of the entry link.
   * @param {string} [description] - An optional description to display as a tooltip for this link.
   * @returns {boolean} - Fails if the entry link name already exists.
   */
  createEntry: function(name, description) {
    for (var i = 0; i < this.chain.entry.length; ++i) {
      if (this.chain.entry[i].name === name) {
        return false;
      }
    }

    this.chain.entry.push({
      name: name,
      active: false,
      links: [],
      meta: {
        flash: false,
        flashDelta: 0,
        broken: 0,
        color: '#000000',
        description: description,
      },
    });
    this._meta.dirty = true;
    return true;
  },

  /**
   * Creates a new exit link on the node.
   * @function wcNode#createExit
   * @param {string} name - The name of the exit link.
   * @param {string} [description] - An optional description to display as a tooltip for this link.
   * @returns {boolean} - Fails if the exit link name already exists.
   */
  createExit: function(name, description) {
    for (var i = 0; i < this.chain.exit.length; ++i) {
      if (this.chain.exit[i].name === name) {
        return false;
      }
    }

    this.chain.exit.push({
      name: name,
      links: [],
      meta: {
        flash: false,
        flashDelta: 0,
        broken: 0,
        color: '#000000',
        description: description,
      },
    });
    this._meta.dirty = true;
    return true;
  },

  /**
   * Creates a new property.
   * @function wcNode#createProperty
   * @param {string} name - The name of the property.
   * @param {wcPlay.PROPERTY} type - The type of property.
   * @param {Object} [initialValue] - A initial value for this property when the script starts.
   * @param {Object} [options] - Additional options for this property, see {@link wcPlay.PROPERTY}.
   * @returns {boolean} - Fails if the property does not exist.
   */
  createProperty: function(name, type, initialValue, options) {
    // Make sure this property doesn't already exist.
    for (var i = 0; i < this.properties.length; ++i) {
      if (this.properties[i].name === name) {
        return false;
      }
    }

    if (initialValue === undefined) {
      initialValue = 0;
    }

    this.properties.push({
      name: name,
      value: initialValue,
      initialValue: initialValue,
      type: type,
      inputs: [],
      outputs: [],
      options: options || {},
      inputMeta: {
        flash: false,
        flashDelta: 0,
        broken: 0,
        color: '#000000',
      },
      outputMeta: {
        flash: false,
        flashDelta: 0,
        broken: 0,
        color: '#000000',
      }
    });
    this._meta.dirty = true;
    return true;
  },

  /**
   * Removes an entry link from the node.
   * @function wcNode#removeEntry
   * @param {string} name - The name of the entry link to remove.
   * @returns {boolean} - Fails if the link does not exist.
   */
  removeEntry: function(name) {
    for (var i = 0; i < this.chain.entry.length; ++i) {
      if (this.chain.entry[i].name === name) {
        if (this.disconnectEntry(name) === wcNode.CONNECT_RESULT.SUCCESS) {
          this.chain.entry.splice(i, 1);
          this._meta.dirty = true;
          return true;
        }
      }
    }
    return false;
  },

  /**
   * Removes an exit link from the node.
   * @function wcNode#removeExit
   * @param {string} name - The name of the exit link to remove.
   * @returns {boolean} - Fails if the link does not exist.
   */
  removeExit: function(name) {
    for (var i = 0; i < this.chain.exit.length; ++i) {
      if (this.chain.exit[i].name === name) {
        if (this.disconnectExit(name) === wcNode.CONNECT_RESULT.SUCCESS) {
          this.chain.exit.splice(i, 1);
          this._meta.dirty = true;
          return true;
        }
      }
    }
    return false;
  },

  /**
   * Removes a property from the node.
   * @function wcNode#removeProperty
   * @param {string} name - The name of the property to remove.
   * @returns {boolean} - Fails if the property does not exist.
   */
  removeProperty: function(name) {
    for (var i = 0; i < this.properties.length; ++i) {
      if (this.properties[i].name === name) {
        if (this.disconnectInput(name) === wcNode.CONNECT_RESULT.SUCCESS &&
            this.disconnectOutput(name) === wcNode.CONNECT_RESULT.SUCCESS) {
          this.properties.splice(i, 1);
          this._meta.dirty = true;
          return true;
        }
      }
    }
    return false;
  },

  /**
   * Renames an entry link on this node while preserving all connected chains.
   * @function wcNode#renameEntry
   * @param {string} oldName - The old (current) name of the link.
   * @param {string} newName - The new name of the link.
   * @returns {boolean} - Fails if the new name already exists, or the old name does not.
   */
  renameEntry: function(oldName, newName) {
    if (!this.createEntry(newName)) {
      return false;
    }

    if (this.createEntry(oldName)) {
      this.removeEntry(oldName);
      this.removeEntry(newName);
      return false;
    }

    var chains = this.listEntryChains(oldName);
    this.removeEntry(oldName);

    var engine = this.engine();
    if (engine) {
      for (var i = 0; i < chains.length; ++i) {
        this.connectEntry(newName, engine.nodeById(chains[i].outNodeId), chains[i].outName);
      }
    }
    this._meta.dirty = true;
    return true;
  },

  /**
   * Renames an exit link on this node while preserving all connected chains.
   * @function wcNode#renameExit
   * @param {string} oldName - The old (current) name of the link.
   * @param {string} newName - The new name of the link.
   * @returns {boolean} - Fails if the new name already exists, or the old name does not.
   */
  renameExit: function(oldName, newName) {
    if (!this.createExit(newName)) {
      return false;
    }

    if (this.createExit(oldName)) {
      this.removeExit(oldName);
      this.removeExit(newName);
      return false;
    }

    var chains = this.listExitChains(oldName);
    this.removeExit(oldName);

    var engine = this.engine();
    if (engine) {
      for (var i = 0; i < chains.length; ++i) {
        this.connectExit(newName, engine.nodeById(chains[i].inNodeId), chains[i].inName);
      }
    }
    this._meta.dirty = true;
    return true;
  },

  /**
   * Renames a property on this node while preserving all connected chains.
   * @function wcNode#renameProperty
   * @param {string} oldName - The old (current) name of the link.
   * @param {string} newName - The new name of the link.
   * @returns {boolean} - Fails if the new name already exists, or the old name does not.
   */
  renameProperty: function(oldName, newName) {
    var prop = null, i = 0;
    for (i = 0; i < this.properties.length; ++i) {
      if (this.properties[i].name === oldName) {
        prop = this.properties[i];
      }
      if (this.properties[i].name === newName) {
        return false;
      }
    }

    if (!prop) {
      return false;
    }

    this.createProperty(newName, prop.type, prop.initialValue, prop.options);
    this.property(newName, prop.value, false);

    var inputChains = this.listInputChains(oldName);
    var outputChains= this.listOutputChains(oldName);
    this.removeProperty(oldName);

    var engine = this.engine();
    if (engine) {
      for (i = 0; i < inputChains.length; ++i) {
        this.connectInput(newName, engine.nodeById(inputChains[i].outNodeId), inputChains[i].outName);
      }
      for (i = 0; i < outputChains.length; ++i) {
        this.connectOutput(newName, engine.nodeById(outputChains[i].inNodeId), outputChains[i].inName);
      }
    }
    this._meta.dirty = true;
    return true;
  },

  /**
   * Connects an entry link on this node to an exit link of another.
   * @function wcNode#connectEntry
   * @param {string} name - The name of the entry link on this node.
   * @param {wcNode} targetNode - The target node to link to.
   * @param {string} targetName - The name of the target node's exit link to link to.
   * @returns {wcNode.CONNECT_RESULT} - The result.
   */
  connectEntry: function(name, targetNode, targetName) {
    if (!(targetNode && targetNode.instanceOf('wcNode'))) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    var myLink = null;
    var targetLink = null;
    var i = 0;

    // Find my link.
    for (i = 0; i < this.chain.entry.length; ++i) {
      if (this.chain.entry[i].name === name) {
        myLink = this.chain.entry[i];
        break;
      }
    }

    // Find the target link.
    for (i = 0; i < targetNode.chain.exit.length; ++i) {
      if (targetNode.chain.exit[i].name === targetName) {
        targetLink = targetNode.chain.exit[i];
        break;
      }
    }

    if (!myLink || !targetLink) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Make sure the connection doesn't already exist.
    for (i = 0; i < myLink.links.length; ++i) {
      if (myLink.links[i].node === targetNode && myLink.links[i].name === targetLink.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
    }

    for (i = 0; i < targetLink.links.length; ++i) {
      if (targetLink.links[i].node === this && targetLink.links[i].name === myLink.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
    }

    // Now make the connection.
    myLink.links.push({
      name: targetLink.name,
      node: targetNode,
    });

    targetLink.links.push({
      name: myLink.name,
      node: this,
    });

    // Notify of the connection change.
    this.onConnect(true, myLink.name, wcNode.LINK_TYPE.ENTRY, targetNode, targetLink.name, wcNode.LINK_TYPE.EXIT);
    targetNode.onConnect(true, targetLink.name, wcNode.LINK_TYPE.EXIT, this, myLink.name, wcNode.LINK_TYPE.ENTRY);
    return wcNode.CONNECT_RESULT.SUCCESS;
  },

  /**
   * Connects an exit link on this node to an entry link of another.
   * @function wcNode#connectExit
   * @param {string} name - The name of the exit link on this node.
   * @param {wcNode} targetNode - The target node to link to.
   * @param {string} targetName - The name of the target node's entry link to link to.
   * @returns {wcNode.CONNECT_RESULT} - The result.
   */
  connectExit: function(name, targetNode, targetName) {
    if (!(targetNode && targetNode.instanceOf('wcNode'))) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    var myLink = null;
    var targetLink = null;
    var i = 0;

    // Find my link.
    for (i = 0; i < this.chain.exit.length; ++i) {
      if (this.chain.exit[i].name === name) {
        myLink = this.chain.exit[i];
        break;
      }
    }

    // Find the target link.
    for (i = 0; i < targetNode.chain.entry.length; ++i) {
      if (targetNode.chain.entry[i].name === targetName) {
        targetLink = targetNode.chain.entry[i];
        break;
      }
    }

    if (!myLink || !targetLink) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Make sure the connection doesn't already exist.
    for (i = 0; i < myLink.links.length; ++i) {
      if (myLink.links[i].node === targetNode && myLink.links[i].name === targetLink.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
    }

    for (i = 0; i < targetLink.links.length; ++i) {
      if (targetLink.links[i].node === this && targetLink.links[i].name === myLink.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
    }

    // Now make the connection.
    myLink.links.push({
      name: targetLink.name,
      node: targetNode,
    });

    targetLink.links.push({
      name: myLink.name,
      node: this,
    });

    // Notify of the connection change.
    this.onConnect(true, myLink.name, wcNode.LINK_TYPE.EXIT, targetNode, targetLink.name, wcNode.LINK_TYPE.ENTRY);
    targetNode.onConnect(true, targetLink.name, wcNode.LINK_TYPE.ENTRY, this, myLink.name, wcNode.LINK_TYPE.EXIT);
    return wcNode.CONNECT_RESULT.SUCCESS;
  },

  /**
   * Connects a property input link to a target property output link.
   * @function wcNode#connectInput
   * @param {string} name - The name of the property being connected.
   * @param {wcNode} targetNode - The target node to connect with.
   * @param {string} targetName - The name of the property on the target node to connect with.
   * @returns {wcNode.CONNECT_RESULT} - The result.
   */
  connectInput: function(name, targetNode, targetName) {
    if (!(targetNode && targetNode.instanceOf('wcNode'))) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    var myProperty = null;
    var targetProperty = null;
    var i = 0;

    // Find my property.
    for (i = 0; i < this.properties.length; ++i) {
      if (this.properties[i].name === name) {
        myProperty = this.properties[i];
        break;
      }
    }

    // Find the target property.
    for (i = 0; i < targetNode.properties.length; ++i) {
      if (targetNode.properties[i].name === targetName) {
        targetProperty = targetNode.properties[i];
        break;
      }
    }

    if (!myProperty || !targetProperty) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Make sure the connection doesn't already exist.
    for (i = 0; i < myProperty.inputs.length; ++i) {
      if (myProperty.inputs[i].node === targetNode && myProperty.inputs[i].name === targetProperty.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
    }

    for (i = 0; i < targetProperty.outputs.length; ++i) {
      if (targetProperty.outputs[i].node === this && targetProperty.outputs[i].name === myProperty.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
    }

    // Ask if this node can connect with the other.
    if (myProperty.options.inputCondition &&
        !myProperty.options.inputCondition.call(this, targetNode, targetProperty.name)) {
      return wcNode.CONNECT_RESULT.REFUSED;
    }

    // Ask if the other node can connect with this.
    if (targetProperty.options.outputCondition &&
        !targetProperty.options.outputCondition.call(targetNode, this, myProperty.name)) {
      return wcNode.CONNECT_RESULT.REFUSED;
    }

    // Now make the connection.
    myProperty.inputs.push({
      name: targetProperty.name,
      node: targetNode,
    });

    targetProperty.outputs.push({
      name: myProperty.name,
      node: this,
    });

    // Notify of the connection change.
    this.onConnect(true, myProperty.name, wcNode.LINK_TYPE.INPUT, targetNode, targetProperty.name, wcNode.LINK_TYPE.OUTPUT);
    targetNode.onConnect(true, targetProperty.name, wcNode.LINK_TYPE.OUTPUT, this, myProperty.name, wcNode.LINK_TYPE.INPUT);
    return wcNode.CONNECT_RESULT.SUCCESS;
  },

  /**
   * Connects a property output link to a target property input link.
   * @function wcNode#connectOutput
   * @param {string} name - The name of the property being connected.
   * @param {wcNode} targetNode - The target node to connect with.
   * @param {string} targetName - The name of the property on the target node to connect with.
   * @returns {wcNode.CONNECT_RESULT} - The result.
   */
  connectOutput: function(name, targetNode, targetName) {
    if (!(targetNode && targetNode.instanceOf('wcNode'))) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    var myProperty = null;
    var targetProperty = null;
    var i = 0;

    // Find my property.
    for (i = 0; i < this.properties.length; ++i) {
      if (this.properties[i].name === name) {
        myProperty = this.properties[i];
        break;
      }
    }

    // Find the target property.
    for (i = 0; i < targetNode.properties.length; ++i) {
      if (targetNode.properties[i].name === targetName) {
        targetProperty = targetNode.properties[i];
        break;
      }
    }

    if (!myProperty || !targetProperty) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Make sure the connection doesn't already exist.
    for (i = 0; i < myProperty.outputs.length; ++i) {
      if (myProperty.outputs[i].node === targetNode && myProperty.outputs[i].name === targetProperty.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
    }

    for (i = 0; i < targetProperty.inputs.length; ++i) {
      if (targetProperty.inputs[i].node === this && targetProperty.inputs[i].name === myProperty.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
    }

    // Ask if this node can connect with the other.
    if (myProperty.options.outputCondition &&
        !myProperty.options.outputCondition.call(this, targetNode, targetProperty.name)) {
      return wcNode.CONNECT_RESULT.REFUSED;
    }

    // Ask if the other node can connect with this.
    if (targetProperty.options.inputCondition &&
        !targetProperty.options.inputCondition.call(targetNode, this, myProperty.name)) {
      return wcNode.CONNECT_RESULT.REFUSED;
    }

    // Now make the connection.
    myProperty.outputs.push({
      name: targetProperty.name,
      node: targetNode,
    });

    targetProperty.inputs.push({
      name: myProperty.name,
      node: this,
    });

    // Notify of the connection change.
    this.onConnect(true, myProperty.name, wcNode.LINK_TYPE.OUTPUT, targetNode, targetProperty.name, wcNode.LINK_TYPE.INPUT);
    targetNode.onConnect(true, targetProperty.name, wcNode.LINK_TYPE.INPUT, this, myProperty.name, wcNode.LINK_TYPE.OUTPUT);
    return wcNode.CONNECT_RESULT.SUCCESS;
  },

  /**
   * Disconnects a chain, or all chains, from an entry link.
   * @function wcNode#disconnectEntry
   * @param {string} name - The name of the entry link.
   * @param {wcNode} [targetNode] - If supplied, will only remove links to the specified target node.
   * @param {string} [targetName] - If supplied, will only remove links to the specified named exit links.
   * @returns {wcNode.CONNECT_RESULT} - The result of the disconnection.
   */
  disconnectEntry: function(name, targetNode, targetName) {
    var i = 0;
    var myLink = null;

    // Find my entry link.
    for (i = 0; i < this.chain.entry.length; ++i) {
      if (this.chain.entry[i].name === name) {
        myLink = this.chain.entry[i];
        break;
      }
    }

    if (!myLink) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Iterate through all chained links and disconnect as necessary.
    for (i = 0; i < myLink.links.length; ++i) {
      var targetLink = myLink.links[i];
      if ((!targetNode || targetNode === targetLink.node) && (!targetName || targetName === targetLink.name)) {
        // Remove this link.
        myLink.links.splice(i, 1);
        i--;

        targetLink.node.disconnectExit(targetLink.name, this, name);
      }
    }
    return wcNode.CONNECT_RESULT.SUCCESS;
  },

  /**
   * Disconnects a chain, or all chains, from an exit link.
   * @function wcNode#disconnectExit
   * @param {string} name - The name of the exit link.
   * @param {wcNode} [targetNode] - If supplied, will only remove links to the specified target node.
   * @param {string} [targetName] - If supplied, will only remove links to the specified named entry links.
   * @returns {wcNode.CONNECT_RESULT} - The result of the disconnection.
   */
  disconnectExit: function(name, targetNode, targetName) {
    // Find my exit link.
    var myLink = null, i = 0;
    for (i = 0; i < this.chain.exit.length; ++i) {
      if (this.chain.exit[i].name === name) {
        myLink = this.chain.exit[i];
        break;
      }
    }

    if (!myLink) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Iterate through all chained links and disconnect as necessary.
    for (i = 0; i < myLink.links.length; ++i) {
      var targetLink = myLink.links[i];
      if ((!targetNode || targetNode === targetLink.node) && (!targetName || targetName === targetLink.name)) {
        // Remove this link.
        myLink.links.splice(i, 1);
        i--;

        targetLink.node.disconnectEntry(targetLink.name, this, name);
      }
    }
    return wcNode.CONNECT_RESULT.SUCCESS;
  },

  /**
   * Disconnects a chain, or all chains, from a property input.
   * @function wcNode#disconnectInput
   * @param {string} name - The name of the property.
   * @param {wcNode} [targetNode] - If supplied, will only remove links to the specified target node.
   * @param {string} [targetName] - If supplied, will only remove links to the specified named property output links.
   * @returns {wcNode.CONNECT_RESULT} - The result of the disconnection.
   */
  disconnectInput: function(name, targetNode, targetName) {
    // Find my property.
    var myProperty = null, i = 0;
    for (i = 0; i < this.properties.length; ++i) {
      if (this.properties[i].name === name) {
        myProperty = this.properties[i];
        break;
      }
    }

    if (!myProperty) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Iterate through all chained links and disconnect as necessary.
    for (i = 0; i < myProperty.inputs.length; ++i) {
      var targetProperty = myProperty.inputs[i];
      if ((!targetNode || targetNode === targetProperty.node) && (!targetName || targetName === targetProperty.name)) {
        // Remove this link.
        myProperty.inputs.splice(i, 1);
        i--;

        targetProperty.node.disconnectOutput(targetProperty.name, this, name);
      }
    }
    return wcNode.CONNECT_RESULT.SUCCESS;
  },

  /**
   * Disconnects a chain, or all chains, from a property output.
   * @function wcNode#disconnectOutput
   * @param {string} name - The name of the property.
   * @param {wcNode} [targetNode] - If supplied, will only remove links to the specified target node.
   * @param {string} [targetName] - If supplied, will only remove links to the specified named property input links.
   * @returns {wcNode.CONNECT_RESULT} - The result of the disconnection.
   */
  disconnectOutput: function(name, targetNode, targetName) {
    // Find my property.
    var myProperty = null, i = 0;
    for (i = 0; i < this.properties.length; ++i) {
      if (this.properties[i].name === name) {
        myProperty = this.properties[i];
        break;
      }
    }

    if (!myProperty) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Iterate through all chained links and disconnect as necessary.
    for (i = 0; i < myProperty.outputs.length; ++i) {
      var targetProperty = myProperty.outputs[i];
      if ((!targetNode || targetNode === targetProperty.node) && (!targetName || targetName === targetProperty.name)) {
        // Remove this link.
        myProperty.outputs.splice(i, 1);
        i--;

        targetProperty.node.disconnectInput(targetProperty.name, this, name);
      }
    }
    return wcNode.CONNECT_RESULT.SUCCESS;
  },

  /**
   * Activates an entry link and activates this node.
   * @function wcNode#activateEntry
   * @param {string} name - The name of the entry link to trigger.
   * @param {wcNode} fromNode - The node triggering the entry.
   * @param {string} fromName - The Exit link name.
   * @param {wcPlay~FlowTracker} [tracker] - Optional flow tracker.
   * @returns {boolean} - Fails if the entry link does not exist.
   */
  activateEntry: function(name, fromNode, fromName, tracker) {
    var engine = this.engine();
    for (var i = 0; i < this.chain.entry.length; ++i) {
      if (this.chain.entry[i].name === name) {
        // Always queue the trigger so execution is not immediate.
        if (engine) {
          engine.queueNodeEntry(this, this.chain.entry[i].name, fromNode, fromName, false, tracker);
        }
        return true;
      }
    }

    if (engine) {
      // Timeout one frame before attempting to close this tracker.
      setTimeout(function() {
        engine.endFlowTracker(tracker);
      }, 0);
    }    
    return false;
  },

  /**
   * Activates an exit link.
   * @function wcNode#activateExit
   * @param {string} name - The name of the exit link to trigger.
   * @param {Function} [done] - An optional callback to call when the entire exit chain has finished.
   * @returns {boolean} - Fails if the exit link does not exist or this node is disabled.
   */
  activateExit: function(name, done) {
    if (!this.enabled()) {
      // Node not enabled, unable to process.
      done && done();
      return false;
    }

    if (this.debugLog()) {
      console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" Triggered Exit link "' + name + '"');
    }

    var engine = this.engine();
    for (var i = 0; i < this.chain.exit.length; ++i) {
      var exitLink = this.chain.exit[i];
      if (exitLink.name === name) {
        var queued = false;
        var activeTracker = this._activeTracker;

        if (typeof done === 'function') {
          activeTracker = engine.beginFlowTracker(this, activeTracker, done);
          done = null;
        }

        // Activate all entry links chained to this exit.
        for (var a = 0; a < exitLink.links.length; ++a) {
          if (exitLink.links[a].node) {
            queued = true;
            exitLink.links[a].node.activateEntry(exitLink.links[a].name, this, name, engine.beginFlowTracker(exitLink.links[a].node, activeTracker, done));
          }
        }

        // If we did not queue another node to activate, we should manually flash this link.
        if (!queued) {
          this.chain.exit[i].meta.flash = true;
          this._meta.flash = true;
          // Timeout one frame before attempting to close this tracker.
          setTimeout(function() {
            engine.endFlowTracker(activeTracker);
          }, 0);
          done && done();
        }
        return true;
      }
    }

    // No link exists with the name provided.
    done && done();
    return false;
  },

  /**
   * Gets the type of a property.
   * @function wcNode#propertyType
   * @param {string} name - The name of the property.
   * @returns {wcPlay.PROPERTY|null} - Returns null if the property was not found.
   */
  propertyType: function(name) {
    for (var i = 0; i < this.properties.length; ++i) {
      var prop = this.properties[i];
      if (prop.name === name) {
        return prop.type;
      }
    }
  },

  /**
   * Gets the options assigned to a property, you may change attributes from here.
   * @function wcNode#propertyOptions
   * @param {string} name - The name of the property.
   * @returns {Object|null} - The options object associated with the property, or null if the property does not exist.
   */
  propertyOptions: function(name) {
    for (var i = 0; i < this.properties.length; ++i) {
      var prop = this.properties[i];
      if (prop.name === name) {
        // Assume the user will change options for this property, so make it dirty.
        this._meta.dirty = true;
        return prop.options;
      }
    }
    return null;
  },

  /**
   * Gets, or Sets the value of a property.
   * @function wcNode#property
   * @param {string} name - The name of the property.
   * @param {Object} [value] - If supplied, will assign a new value to the property.
   * @param {boolean} [forceOrSilent] - If supplied, true will force the change event to be sent to all chained properties even if this value didn't change while false will force the change to not be chained.
   * @param {boolean} [forceUpstream] - Contrary to normal operation, if this is true then the property change will be sent backwards, from this property's input link to any outputs connected to it.
   * @param {external:wcUndoManager} [undo] - If the change is triggered by the user and undo management is enabled, this will be the undo manager.
   * @returns {Object|undefined} - The value of the property, or undefined if not found.
   */
  property: function(name, value, forceOrSilent, forceUpstream, undo) {
    var i = 0, a = 0;
    for (i = 0; i < this.properties.length; ++i) {
      var prop = this.properties[i];
      if (prop.name === name) {
        if (value !== undefined) {
          // Retrieve the current value of the property
          var oldValue = prop.value;

          // Apply restrictions to the property based on its type and options supplied.
          switch (prop.type) {
            case wcPlay.PROPERTY.TOGGLE:
              value = value? true: false;
              break;
            case wcPlay.PROPERTY.NUMBER:
              var min = (prop.options.min !== undefined? prop.options.min: -Infinity);
              var max = (prop.options.max !== undefined? prop.options.max:  Infinity);
              var num = Math.min(max, Math.max(min, parseInt(value)));
              if (isNaN(num)) {
                value = Math.min(max, Math.max(min, 0));
              }
              break;
            case wcPlay.PROPERTY.STRING:
              var len = prop.options.maxlength;
              if (len) {
                value = value.toString().substring(0, len);
              }
              break;
            case wcPlay.PROPERTY.SELECT:
              var items = prop.options.items;
              if (typeof items === 'function') {
                items = items.call(this);
              }
              var found = false;
              if (Array.isArray(items)) {
                for (a = 0; a < items.length; ++a) {
                  if (typeof items[a] === 'object') {
                    if (items[a].value == value) {
                      found = true;
                      break;
                    }
                  } else {
                    if (items[a] == value) {
                      found = true;
                      break;
                    }
                  }
                }
              }

              if (!found) {
                if (!prop.options.hasOwnProperty('allowNone') || prop.options.allowNone) {
                  if (prop.options.hasOwnProperty('noneValue')) {
                    value = prop.options.noneValue;
                  } else {
                    value = '';
                  }
                }
              }
              break;
          }

          var engine = this.engine();
          prop.outputMeta.flash = true;
          if (this.debugBreak() || (engine && engine.stepping())) {
            prop.outputMeta.broken++;
          }

          // Notify about to change event.
          if (forceOrSilent || prop.value !== value) {
            value = this.onPropertyChanging(prop.name, oldValue, value, undo) || value;
          }

          if (forceOrSilent || prop.value !== value) {
            this._meta.dirty = true;
            prop.value = value;

            // Notify that the property has changed.
            this.onPropertyChanged(prop.name, oldValue, value, undo);

            // Linked properties must sync with their initial values as well.
            if (prop.options.linked) {
              this.initialProperty(prop.name, value, undefined, undefined, undo);
            }

            // Now follow any output links and assign the new value to them as well.
            if (forceOrSilent === undefined || forceOrSilent) {
              for (a = 0; a < prop.outputs.length; ++a) {
                if (prop.outputs[a].node) {
                  if (undo) {
                    // Triggered by a user through the editor, this change should propagate immediately.
                    prop.outputs[a].node.property(prop.outputs[a].name, value, undefined, undefined, undo);
                  } else {
                    prop.outputs[a].node.activateProperty(prop.outputs[a].name, value, undefined);
                  }
                }
              }
            }

            // Now propagate the change upstream if necessary.
            if (forceUpstream) {
              for (a = 0; a < prop.inputs.length; ++a) {
                if (prop.inputs[a].node) {
                  if (undo) {
                    // Triggered by a user through the editor, this change should propagate immediately.
                    prop.outputs[a].node.property(prop.outputs[a].name, value, true, true, undo);
                  } else {
                    prop.inputs[a].node.activateProperty(prop.inputs[a].name, value, true);
                  }
                }
              }
            }
          }
        }

        return this.onPropertyGet(prop.name) || prop.value;
      }
    }
  },

  /**
   * Gets, or Sets the initial value of a property.
   * @function wcNode#initialProperty
   * @param {string} name - The name of the property.
   * @param {Object} [value] - If supplied, will assign a new default value to the property.
   * @param {boolean} [forceOrSilent] - If supplied, true will force the change event to be sent to all chained properties even if this value didn't change while false will force the change to not be chained.
   * @param {boolean} [forceUpstream] - Contrary to normal operation, if this is true then the property change will be sent backwards, from this property's input link to any outputs connected to it.
   * @param {external:wcUndoManager} [undo] - If the change is triggered by the user and undo management is enabled, this will be the undo manager.
   * @returns {Object|undefined} - The default value of the property, or undefined if not found.
   */
  initialProperty: function(name, value, forceOrSilent, forceUpstream, undo) {
    var i = 0, a = 0;
    for (i = 0; i < this.properties.length; ++i) {
      var prop = this.properties[i];
      if (prop.name === name) {
        if (value !== undefined) {
          value = this.onInitialPropertyChanging(prop.name, prop.initialValue, value, undo) || value;
          if (prop.value == prop.initialValue) {
            this.property(name, value);
          }
          var oldValue = prop.initialValue;

          if (forceOrSilent || prop.initialValue !== value) {
            this._meta.dirty = true;
            prop.initialValue = value;

            // Notify that the property has changed.
            this.onInitialPropertyChanged(prop.name, oldValue, value, undo);

            // Linked properties must sync with their initial values as well.
            if (prop.options.linked) {
              this.property(prop.name, value);
            }

            prop.outputMeta.flash = true;
            var engine = this.engine();
            if (this.debugBreak() || (engine && engine.stepping())) {
              prop.outputMeta.broken++;
            }

            // Now follow any output links and assign the new value to them as well.
            if (forceOrSilent === undefined || forceOrSilent) {
              for (a = 0; a < prop.outputs.length; ++a) {
                prop.outputs[a].node && prop.outputs[a].node.initialProperty(prop.outputs[a].name, value, undefined, false, undo);
              }
            }

            // Now propagate the change upstream if necessary.
            if (forceUpstream) {
              for (a = 0; a < prop.inputs.length; ++a) {
                prop.inputs[a].node && prop.inputs[a].node.initialProperty(prop.inputs[a].name, value, undefined, true, undo);
              }
            }
          }
        }

        return this.onInitialPropertyGet(prop.name) || prop.initialValue;
      }
    }
  },

  /**
   * Activates a property that is about to be changed by the output of another property.
   * @function wcNode#activateProperty
   * @param {string} name - The name of the property.
   * @param {Object} value - The new value of the property.
   * @param {boolean} [upstream] - If true, the activation was from a property in its output, and we are propagating in reverse.
   */
  activateProperty: function(name, value, upstream) {
    var engine = this.engine();
    if (engine) {
      engine.queueNodeProperty(this, name, value, upstream);
    }

    for (var i = 0; i < this.properties.length; ++i) {
      var prop = this.properties[i];
      if (prop.name === name) {
        prop.inputMeta.flash = true;
        if (this.debugBreak() || (engine && engine.stepping())) {
          prop.inputMeta.broken++;
        }
      }
    }
  },

  /**
   * Retrieves a list of all chains connected to an entry link on this node.
   * @function wcNode#listEntryChains
   * @param {string} [name] - The entry link, if omitted, all link chains are retrieved.
   * @param {wcNode[]} [ignoreNodes] - If supplied, will ignore all chains connected to a node in this list.
   * @returns {wcNode~ChainData[]} - A list of all chains connected to this link, if the link was not found, an empty list is returned.
   */
  listEntryChains: function(name, ignoreNodes) {
    var result = [];
    for (var i = 0; i < this.chain.entry.length; ++i) {
      if (!name || this.chain.entry[i].name === name) {
        var myLink = this.chain.entry[i];
        for (var a = 0; a < myLink.links.length; ++a) {
          if (!ignoreNodes || ignoreNodes.indexOf(myLink.links[a].node) === -1) {
            result.push({
              inName: myLink.name,
              inNodeId: this.id,
              outName: myLink.links[a].name,
              outNodeId: myLink.links[a].node.id,
            });
          }
        }
      }
    }

    return result;
  },

  /**
   * Retrieves a list of all chains connected to an exit link on this node.
   * @function wcNode#listExitChains
   * @param {string} [name] - The exit link, if omitted, all link chains are retrieved.
   * @param {wcNode[]} [ignoreNodes] - If supplied, will ignore all chains connected to a node in this list.
   * @returns {wcNode~ChainData[]} - A list of all chains connected to this link, if the link was not found, an empty list is returned.
   */
  listExitChains: function(name, ignoreNodes) {
    var result = [];
    for (var i = 0; i < this.chain.exit.length; ++i) {
      if (!name || this.chain.exit[i].name === name) {
        var myLink = this.chain.exit[i];
        for (var a = 0; a < myLink.links.length; ++a) {
          if (!ignoreNodes || ignoreNodes.indexOf(myLink.links[a].node) === -1) {
            result.push({
              inName: myLink.links[a].name,
              inNodeId: myLink.links[a].node.id,
              outName: myLink.name,
              outNodeId: this.id,
            });
          }
        }
      }
    }

    return result;
  },

  /**
   * Retrieves a list of all chains connected to a property input link on this node.
   * @function wcNode#listInputChains
   * @param {string} [name] - The property input link, if omitted, all link chains are retrieved.
   * @param {wcNode[]} [ignoreNodes] - If supplied, will ignore all chains connected to a node in this list.
   * @returns {wcNode~ChainData[]} - A list of all chains connected to this link, if the link was not found, an empty list is returned.
   */
  listInputChains: function(name, ignoreNodes) {
    var result = [];
    for (var i = 0; i < this.properties.length; ++i) {
      if (!name || this.properties[i].name === name) {
        var myProp = this.properties[i];
        for (var a = 0; a < myProp.inputs.length; ++a) {
          if (!ignoreNodes || ignoreNodes.indexOf(myProp.inputs[a].node) === -1) {
            result.push({
              inName: myProp.name,
              inNodeId: this.id,
              outName: myProp.inputs[a].name,
              outNodeId: myProp.inputs[a].node.id,
            });
          }
        }
      }
    }

    return result;
  },

  /**
   * Retrieves a list of all chains connected to a property output link on this node.
   * @function wcNode#listOutputChains
   * @param {string} [name] - The property output link, if omitted, all link chains are retrieved.
   * @param {wcNode[]} [ignoreNodes] - If supplied, will ignore all chains connected to a node in this list.
   * @returns {wcNode~ChainData[]} - A list of all chains connected to this link, if the link was not found, an empty list is returned.
   */
  listOutputChains: function(name, ignoreNodes) {
    var result = [];
    for (var i = 0; i < this.properties.length; ++i) {
      if (!name || this.properties[i].name === name) {
        var myProp = this.properties[i];
        for (var a = 0; a < myProp.outputs.length; ++a) {
          if (!ignoreNodes || ignoreNodes.indexOf(myProp.outputs[a].node) === -1) {
            result.push({
              inName: myProp.outputs[a].name,
              inNodeId: myProp.outputs[a].node.id,
              outName: myProp.name,
              outNodeId: this.id,
            });
          }
        }
      }
    }

    return result;
  },

  /**
   * Retrieves a list of all properties and their values for this node.
   * @function wcNode#listProperties
   * @param {boolean} [minimal] - If true, only the minimal data is listed, this means current values will be omitted.
   * @returns {wcNode~PropertyData[]} - A list of all property data.
   */
  listProperties: function(minimal) {
    var result = [];
    for (var i = 0; i < this.properties.length; ++i) {
      var myProp = this.properties[i];
      var data = {
        name: myProp.name,
        type: myProp.type,
        initialValue: myProp.initialValue,
        options: myProp.options
      };

      if (!minimal) {
        data.value = myProp.value;
      }

      if (typeof myProp.options.exportValue === 'function') {
        var val = myProp.options.exportValue(myProp.initialValue);
        if (val !== undefined) {
          data.initialValue = val;
        }
      }

      result.push(data);
    }

    return result;
  },

  /**
   * Sets a size for the custom viewport.
   * <br>The custom viewport is a rectangular area embedded into the node's visual display in which you can 'draw' whatever you wish. It appears below the title text and above properties.
   * @function wcNode#viewportSize
   * @param {number} [width] - If supplied, assigns the width of the viewport desired. Use 0 or null to disable the viewport.
   * @param {number} [height] - If supplied, assigns the height of the viewport desired. Use 0 or null to disable the viewport.
   * @returns {wcPlay~Coordinates} - The current size of the viewport.
   * @see wcNode#onViewportDraw
   */
  viewportSize: function(width, height) {
    if (width !== undefined && height !== undefined) {
      this._meta.dirty = true;
      if (!width || !height) {
        this._viewportSize = null;
      } else {
        this._viewportSize = {
          x: width,
          y: height,
        };
      }
    }

    return {x: this._viewportSize.x, y: this._viewportSize.y};
  },

  /**
   * Event that is called when it is time to draw the contents of your custom viewport. It is up to you to stay within the [wcNode.viewportSize]{@link wcNode#viewportSize} you've specified.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onViewportDraw
   * @param {external:Canvas~Context} context - The canvas context to draw on, coordinates 0,0 will be the top left corner of your viewport. It is up to you to stay within the [viewport bounds]{@link wcNode#viewportSize} you have assigned.
   * @param {boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   * @see wcNode#viewportSize
   */
  onViewportDraw: function(context, readOnly) {
    this._super(context, readOnly);
  },

  /**
   * Event that is called when the mouse has entered the viewport area.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onViewportMouseEnter
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @param {boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   */
  onViewportMouseEnter: function(event, pos, readOnly) {
    this._super(event, pos, readOnly);
    if (this.debugLog()) {
      console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" mouse entered custom viewport!');
    }
  },

  /**
   * Event that is called when the mouse has left the viewport area.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onViewportMouseLeave
   * @param {Object} event - The original jquery mouse event.
   * @param {boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   */
  onViewportMouseLeave: function(event, readOnly) {
    this._super(event, readOnly);
    if (this.debugLog()) {
      console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" mouse left custom viewport!');
    }
  },

  /**
   * Event that is called when the mouse button is pressed over your viewport area.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onViewportMouseDown
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @param {boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   * @returns {Boolean|undefined} - Return true if you want to disable node dragging during mouse down within your viewport.
   */
  onViewportMouseDown: function(event, pos, readOnly) {
    this._super(event, pos, readOnly);
  },

  /**
   * Event that is called when the mouse button is released over your viewport area.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onViewportMouseUp
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @param {boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   */
  onViewportMouseUp: function(event, pos, readOnly) {
    this._super(event, pos, readOnly);
  },

  /**
   * Event that is called when the mouse has moved over your viewport area.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onViewportMouseMove
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @param {boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   */
  onViewportMouseMove: function(event, pos, readOnly) {
    this._super(event, pos, readOnly);
  },

  /**
   * Event that is called when the mouse wheel is used over your viewport area.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onViewportMouseWheel
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @param {number} scrollDelta - The scroll amount and direction.
   * @param {boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   */
  onViewportMouseWheel: function(event, pos, scrollDelta, readOnly) {
    this._super(event, pos, scrollDelta, readOnly);
  },

  /**
   * Event that is called when the mouse button is pressed and released in the same spot over your viewport area.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onViewportMouseClick
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @param {boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   */
  onViewportMouseClick: function(event, pos, readOnly) {
    this._super(event, pos, readOnly);
  },

  /**
   * Event that is called when the mouse button is double clicked in the same spot over your viewport area.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onViewportMouseDoubleClick
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @param {boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   * @returns {Boolean|undefined} - Return true if you want to disable node auto-collapse when double clicking.
   */
  onViewportMouseDoubleClick: function(event, pos, readOnly) {
    this._super(event, pos, readOnly);
  },

  /**
   * Event that is called when a connection has been made.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onConnect
   * @param {boolean} isConnecting - True if a connection is being made, false if it is a disconnection.
   * @param {string} name - The name of the link being connected to.
   * @param {wcNode.LINK_TYPE} type - The link's type.
   * @param {wcNode} targetNode - The target node being connected to.
   * @param {string} targetName - The link name on the target node being connected to.
   * @param {wcNode.LINK_TYPE} targetType - The target link's type.
   */
  onConnect: function(isConnecting, name, type, targetNode, targetName, targetType) {
    this._super(isConnecting, name, type, targetNode, targetName, targetType);
    // If we are connecting one of our property outputs to another property, alert them and send your value to them.
    if (isConnecting && type === wcNode.LINK_TYPE.OUTPUT) {
      targetNode.activateProperty(targetName, this.property(name));
      targetNode.initialProperty(targetName, this.initialProperty(name));
    }
  },

  /**
   * Event that is called as soon as the Play script has started.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onStart
   */
  onStart: function() {
    this._super();
    if (this.debugLog()) {
      console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" started!');
    }
  },

  /**
   * Event that is called as soon as the Play script has stopped.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onStop
   */
  onStop: function() {
    this._super();
    this._meta.dirty = true;

    if (this.debugLog()) {
      console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" stopped!');
    }
  },

  /**
   * Event that is called when this node is about to be drawn.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onDraw
   */
  onDraw: function() {
    this._super();
  },

  /**
   * Event that is called when an entry link has been activated.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onActivated
   * @param {string} name - The name of the entry link triggered.
   */
  onActivated: function(name) {
    this._super(name);
    if (this.debugLog()) {
      console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" Triggered Entry link "' + name + '"');
    }
  },

  /**
   * Event that is called when the node is about to change its position.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onMoving
   * @param {wcPlay~Coordinates} oldPos - The current position of the node.
   * @param {wcPlay~Coordinates} newPos - The new position to move the node.
   * @returns {wcPlay~Coordinates|undefined} - Return the new position of the node (usually newPos unless you are restricting the position). If no value is returned, newPos is assumed.
   */
  onMoving: function(oldPos, newPos) {
    this._super(oldPos, newPos);
  },

  /**
   * Event that is called after the node has changed its position.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onMoved
   * @param {wcPlay~Coordinates} oldPos - The old position of the node.
   * @param {wcPlay~Coordinates} newPos - The new position of the node.
   */
  onMoved: function(oldPos, newPos) {
    this._super(oldPos, newPos);
  },

  /**
   * Event that is called when the node's name is about to be edited by the user.
   * <br>You can use this to suggest a list of names that the user can conveniently choose from.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @see http://caniuse.com/#search=datalist
   * @function wcNode#onNameEditSuggestion
   * @returns {wcNode~SelectItem[]|String[]|undefined} - An option list of options to display for the user as suggestions.
   */
  onNameEditSuggestion: function() {
    this._super();
  },

  /**
   * Event that is called when the name of this node is about to change.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onNameChanging
   * @param {string} oldName - The current name.
   * @param {string} newName - The new name.
   * @returns {string|undefined} - Return the new value of the name (usually newValue unless you are restricting the name). If no value is returned, newValue is assumed.
   */
  onNameChanging: function(oldName, newName) {
    this._super(oldName, newName);
  },

  /**
   * Event that is called when the name of this node has changed.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onNameChanged
   * @param {string} oldName - The current name.
   * @param {string} newName - The new name.
   * @param {external:wcUndoManager} [undo] - If the change is triggered by the user and undo management is enabled, this will be the undo manager. Note: The value change is already recorded, use this only if you have other things to record.
   */
  onNameChanged: function(oldName, newName, undo) {
    this._super(oldName, newName, undo);
    this._meta.dirty = true;
  },

  /**
   * Event that is called when a property is about to be changed.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onPropertyChanging
   * @param {string} name - The name of the property.
   * @param {Object} oldValue - The current value of the property.
   * @param {Object} newValue - The new, proposed, value of the property.
   * @param {external:wcUndoManager} [undo] - If the change is triggered by the user and undo management is enabled, this will be the undo manager. Note: The value change is already recorded, use this only if you have other things to record.
   * @returns {Object} - Return the new value of the property (usually newValue unless you are proposing restrictions). If no value is returned, newValue is assumed.
   */
  onPropertyChanging: function(name, oldValue, newValue, undo) {
    this._super(name, oldValue, newValue, undo);
    if (this.debugLog()) {
      console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" Changing Property "' + name + '" from "' + oldValue + '" to "' + newValue + '"');
    }
  },

  /**
   * Event that is called when a property has changed.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onPropertyChanged
   * @param {string} name - The name of the property.
   * @param {Object} oldValue - The old value of the property.
   * @param {Object} newValue - The new value of the property.
   * @param {external:wcUndoManager} [undo] - If the change is triggered by the user and undo management is enabled, this will be the undo manager. Note: The value change is already recorded, use this only if you have other things to record.
   */
  onPropertyChanged: function(name, oldValue, newValue, undo) {
    this._super(name, oldValue, newValue, undo);
    if (this.debugLog()) {
      console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" Changed Property "' + name + '" from "' + oldValue + '" to "' + newValue + '"');
    }
  },

  /**
   * Event that is called when the property is being asked its value, before the value is actually retrieved.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onPropertyGet
   * @param {string} name - The name of the property.
   * @returns {Object|undefined} - If a value is returned, that value is what will be retrieved from the get.
   */
  onPropertyGet: function(name) {
    this._super(name);
    // if (this.debugLog()) {
    //   console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" Requested Property "' + name + '"');
    // }
  },

  /**
   * Event that is called when a property initial value is about to be changed.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onInitialPropertyChanging
   * @param {string} name - The name of the property.
   * @param {Object} oldValue - The current value of the property.
   * @param {Object} newValue - The new, proposed, value of the property.
   * @param {external:wcUndoManager} [undo] - If the change is triggered by the user and undo management is enabled, this will be the undo manager. Note: The value change is already recorded, use this only if you have other things to record.
   * @returns {Object} - Return the new value of the property (usually newValue unless you are proposing restrictions). If no value is returned, newValue is assumed.
   */
  onInitialPropertyChanging: function(name, oldValue, newValue, undo) {
    this._super(name, oldValue, newValue, undo);
    if (this.debugLog()) {
      console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" Changing Initial Property "' + name + '" from "' + oldValue + '" to "' + newValue + '"');
    }
  },

  /**
   * Event that is called when a property initial value has changed.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onInitialPropertyChanged
   * @param {string} name - The name of the property.
   * @param {Object} oldValue - The old value of the property.
   * @param {Object} newValue - The new value of the property.
   * @param {external:wcUndoManager} [undo] - If the change is triggered by the user and undo management is enabled, this will be the undo manager. Note: The value change is already recorded, use this only if you have other things to record.
   */
  onInitialPropertyChanged: function(name, oldValue, newValue, undo) {
    this._super(name, oldValue, newValue, undo);
    if (this.debugLog()) {
      console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" Changed Initial Property "' + name + '" from "' + oldValue + '" to "' + newValue + '"');
    }
  },

  /**
   * Event that is called when the property initial value is being asked its value, before the value is actually retrieved.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onInitialPropertyGet
   * @param {string} name - The name of the property.
   * @returns {Object|undefined} - If a value is returned, that value is what will be retrieved from the get.
   */
  onInitialPropertyGet: function(name) {
    this._super(name);
    // if (this.debugLog()) {
    //   console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" Requested Initial Property "' + name + '"');
    // }
  },

  /**
   * Event that is called when a global property value has changed.
   * Overload this in inherited nodes.
   * <br><b>Note:</b> Do not call 'this._super(..)' for this function, as the parent does not implement it.
   * @function wcNode#onGlobalPropertyChanged
   * @param {string} name - The name of the global property.
   * @param {Object} oldValue - The old value of the global property.
   * @param {Object} newValue - The new value of the global property.
   */
  onGlobalPropertyChanged: function(name, oldValue, newValue) {
    this._super(name, oldValue, newValue);
  },

  /**
   * Event that is called when a global property has been removed.
   * Overload this in inherited nodes.
   * <br><b>Note:</b> Do not call 'this._super(..)' for this function, as the parent does not implement it.
   * @function wcNode#onGlobalPropertyRemoved
   * @param {string} name - The name of the global property.
   */
  onGlobalPropertyRemoved: function(name) {
    this._super(name);
  },

  /**
   * Event that is called when a global property has been renamed.
   * Overload this in inherited nodes.
   * <br><b>Note:</b> Do not call 'this._super(..)' for this function, as the parent does not implement it.
   * @function wcNode#onGlobalPropertyRenamed
   * @param {string} oldName - The old name of the global property.
   * @param {string} newName - The new name of the global property.
   */
  onGlobalPropertyRenamed: function(oldName, newName) {
    this._super(oldName, newName);
  },

  /**
   * Event that is called when a global property initial value has changed.
   * Overload this in inherited nodes.
   * <br><b>Note:</b> Do not call 'this._super(..)' for this function, as the parent does not implement it.
   * @function wcNode#onGlobalInitialPropertyChanged
   * @param {string} name - The name of the global property.
   * @param {Object} oldValue - The old value of the global property.
   * @param {Object} newValue - The new value of the global property.
   */
  onGlobalInitialPropertyChanged: function(name, oldValue, newValue) {
    this._super(name, oldValue, newValue);
  },

  /**
   * Event that is called when the node is about to be imported. This is your chance to prepare the node for import, or possibly modify the import data.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onImporting
   * @param {Object} data - The data being imported.
   * @param {Number[]} [idMap] - If supplied, identifies a mapping of old ID's to new ID's, any not found in this list will be unchanged.
   */
  onImporting: function(data, idMap) {
    this._super(data, idMap);
  },

  /**
   * Event that is called after the node has imported.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onImported
   * @param {Object} data - The data being imported.
   * @param {Number[]} [idMap] - If supplied, identifies a mapping of old ID's to new ID's, any not found in this list will be unchanged.
   */
  onImported: function(data, idMap) {
    this._super(data, idMap);
  },

  /**
   * Event that is called when the node is being exported, after the export data has been configured.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onExport
   * @param {Object} data - The export data for this node.
   * @param {boolean} [minimal] - If true, only the most important data should be exported, this means current values and redundant link connections are omitted.
   */
  onExport: function(data, minimal) {
    this._super(data, minimal);
  },

  /**
   * Event that is called when the node is about to be reset.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onReset
   */
  onReset: function() {
    this._super();
  },

  /**
   * Event that is called when the node is about to be destroyed.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onDestroying
   */
  onDestroying: function() {
    this._super();
  },

  /**
   * Event that is called after the node has been destroyed.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onDestroyed
   */
  onDestroyed: function() {
    this._super();
  },
});

window.wcNode = {};

/**
 * The type of node link.
 * @enum {string}
 */
wcNode.LINK_TYPE = {
  ENTRY: 'entry',
  EXIT: 'exit',
  INPUT: 'input',
  OUTPUT: 'output',
};

/**
 * The connection result.
 * @enum {string}
 */
wcNode.CONNECT_RESULT = {
  NOT_FOUND: 'not_found',
  ALREADY_CONNECTED: 'already_connected',
  REFUSED: 'refused',
  SUCCESS: 'success',
};


/**
 * Enabled property name.
 * @typedef {string}
 */
wcNode.PROPERTY_ENABLED = 'enabled';

wcPlayNodes.wcNode.extend('wcNodeEntry', 'Entry Node', '', {
  /**
   * The base class for all entry nodes. These are nodes that start script chains.
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * <br><b>Should be inherited and never constructed directly</b>.
   * @class wcNodeEntry
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);
    this.color = '#CCCC00';

    // Create a default exit link.
    this.createExit('out');
  },

  /**
   * Magic function that is called whenever any new class type is extended from this one.
   * Handles initializing of the class as well as registering the new node type.
   * @function wcNodeEntry#classInit
   * @param {string} className - The name of the class constructor.
   * @param {string} type - The type name for the node.
   * @param {string} category - A category where this node will be grouped.
   */
  classInit: function(className, type, category) {
    if (category) {
      this.className = className;
      this.type = type;
      this.nodeType = wcPlay.NODE.ENTRY;
      this.category = category;
      wcPlay.registerNodeType(className, type, category, wcPlay.NODE.ENTRY);
    }
  },

  /**
   * Overloading the default onActivated event handler so we can make it immediately trigger our Exit link.
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeEntry#onActivated
   * @param {string} name - The name of the entry link triggered.
   */
  onActivated: function(name) {
    this._super(name);
    this.activateExit('out');
  },
});


wcPlayNodes.wcNode.extend('wcNodeProcess', 'Node Process', '', {
  /**
   * The base class for all process nodes. These are nodes that make up the bulk of script chains.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * <br><b>Should be inherited and never constructed directly</b>.
   * @class wcNodeProcess
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);
    this.color = '#007ACC';

    // Create a default links.
    this.createEntry('in');
    this.createExit('out');
  },

  /**
   * Magic function that is called whenever any new class type is extended from this one.
   * <br>Handles initializing of the class as well as registering the new node type.
   * @function wcNodeProcess#classInit
   * @param {string} className - The name of the class constructor.
   * @param {string} type - The type name for the node.
   * @param {string} category - A category where this node will be grouped.
   */
  classInit: function(className, type, category) {
    if (category) {
      this.className = className;
      this.type = type;
      this.nodeType = wcPlay.NODE.PROCESS;
      this.category = category;
      wcPlay.registerNodeType(className, type, category, wcPlay.NODE.PROCESS);
    }
  },
});

wcPlayNodes.wcNode.extend('wcNodeStorage', 'Storage', '', {
  /**
   * The base class for all storage nodes. These are nodes designed solely for managing data.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * <br>Also when inheriting, a 'value' property MUST be created as the storage value.
   * @class wcNodeStorage
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);
    this.color = '#009900';
  },

  /**
   * Magic function that is called whenever any new class type is extended from this one.
   * <br>Handles initializing of the class as well as registering the new node type.
   * @function wcNodeStorage#classInit
   * @param {string} className - The name of the class constructor.
   * @param {string} type - The type name for the node.
   * @param {string} category - A category where this node will be grouped.
   */
  classInit: function(className, type, category) {
    if (category) {
      this.className = className;
      this.type = type;
      this.nodeType = wcPlay.NODE.STORAGE;
      this.category = category;
      wcPlay.registerNodeType(className, type, category, wcPlay.NODE.STORAGE);
    }
  },

  /**
   * Event that is called as soon as the Play script has started.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeStorage#onStart
   */
  onStart: function() {
    this._super();

    // Force a property change event so all connected nodes receive our value.
    this.property('value', this.property('value'), true);
  },
});

wcPlayNodes.wcNode.extend('wcNodeComposite', 'Composite', '', {
  /**
   * The base class for all composite nodes.
   * @class wcNodeComposite
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);
    this.color = '#990099';

    this.removeEntry('in');
    this.removeExit('out');
  },

  /**
   * Magic function that is called whenever any new class type is extended from this one.
   * Handles initializing of the class as well as registering the new node type.
   * @function wcNodeComposite#classInit
   * @param {string} className - The name of the class constructor.
   * @param {string} type - The type name for the node.
   * @param {string} category - A category where this node will be grouped.
   */
  classInit: function(className, type, category) {
    if (category) {
      this.className = className;
      this.type = type;
      this.nodeType = wcPlay.NODE.COMPOSITE;
      this.category = category;
      wcPlay.registerNodeType(className, type, category, wcPlay.NODE.COMPOSITE);
    }
  },
});

wcPlayNodes.wcNodeComposite.extend('wcNodeCompositeScript', 'Composite', 'Imported', {
  /**
   * @class
   * A composite script node. These are nodes that contain additional nodes inside.<br>
   *
   * @constructor wcNodeCompositeScript
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {wcNode[]} [nodes] - An optional set a nodes to use, instead of it's default behavior of generating a new set of nodes. Use this when porting existing nodes into a new composite.
   */
  init: function(parent, pos, nodes) {
    this._super(parent, pos);

    this.description("A node that contains its own set of nodes. Double click to view and edit its contents.");
    this.details("Composite nodes can also be generated from an external script file using the 'File->Import' option. Doing so will allow you to load the entire script into a single Composite Node that appears in the Palette on the left side.");

    this._entryNodes = [];
    this._processNodes = [];
    this._storageNodes = [];
    this._compositeNodes = [];

    if (Array.isArray(nodes)) {
      for (var i = 0; i < nodes.length; ++i) {
        this.__addNode(nodes[i]);
        nodes[i]._parent = this;
      }
    }
  },

  /**
   * Gets, or Sets whether this node is paused, or any nodes inside if it is a composite.<br>
   * When pausing, all {@link wcNode#setTimeout} events are also paused so they don't jump ahead of the debugger.
   * @function wcNode#paused
   * @param {Boolean} paused - If supplied, will assign a new paused state.
   * @returns {Boolean} - Whether this, or inner nodes, are paused.
   */
  paused: function(paused) {
    var result = false;
    for (var i = 0; i < this._compositeNodes.length; ++i) {
      result |= this._compositeNodes[i].paused(paused);
    }
    for (var i = 0; i < this._entryNodes.length; ++i) {
      result |= this._entryNodes[i].paused(paused);
    }
    for (var i = 0; i < this._processNodes.length; ++i) {
      result |= this._processNodes[i].paused(paused);
    }
    for (var i = 0; i < this._storageNodes.length; ++i) {
      result |= this._storageNodes[i].paused(paused);
    }

    return this._super(paused) || result;
  },

  /**
   * Compiles all nodes inside this composite into meta-data.
   * @function wcNodeCompositeScript#compile
   * @param {Boolean} [minimal] - If true, only the most important data should be exported, this means current values and redundant link connections are omitted.
   */
  compile: function(minimal) {
    this.compiledNodes = [];

    function __compileNodes(nodes) {
      for (var i = 0; i < nodes.length; ++i) {
        this.compiledNodes.push(nodes[i].export(minimal));
      }
    };

    __compileNodes.call(this, this._compositeNodes);
    __compileNodes.call(this, this._entryNodes);
    __compileNodes.call(this, this._storageNodes);
    __compileNodes.call(this, this._processNodes);
  },

  /**
   * Loads the contents of this node based on its compiled data.
   * @function wcNodeCompositeScript#decompile
   * @param {Boolean} [restoreIds] - If true, nodes created will be restored to their original ID's rather than assigned new ones.
   */
  decompile: function(idMap) {
    this.onDestroying();

    var newNodes = [];

    if (this.compiledNodes) {
      for (var i = 0; i < this.compiledNodes.length; ++i) {
        var data = this.compiledNodes[i];
        if (wcPlayNodes[data.className]) {
          var newNode = new wcPlayNodes[data.className](this, data.pos, data.name);
          if (idMap) {
            idMap[data.id] = newNode.id;
          } else {
            newNode.id = data.id;
          }
          newNodes.push(newNode);
        } else {
          console.log('ERROR: Attempted to load node "' + this.compiledNodes[i].className + '", but the constructor could not be found!');
          newNodes.push(null);
        }
      }
      for (var i = 0; i < this.compiledNodes.length; ++i) {
        if (newNodes[i]) {
          var data = this.compiledNodes[i];
          newNodes[i].import(data, idMap);
        }
      }
    }
  },

  /**
   * Retrieves a node from a given ID, if it exists in this script.
   * @function wcNodeCompositeScript#nodeById
   * @param {Number} id - The ID of the node.
   * @returns {wcNode|null} - Either the found node, or null.
   */
  nodeById: function(id) {
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
      if (this._compositeNodes[i].id === id) {
        return this._compositeNodes[i];
      }
    }

    for (var i = 0; i < this._compositeNodes.length; ++i) {
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
   * Called by a child composite link node to notify and sort entry links based on position.
   * @function wcNodeCompositeScript#sortEntryLinks
   */
  sortEntryLinks: function() {
    var order = [];
    // Find the Composite Entry nodes and order our entry links based on their x position.
    for (var i = 0; i < this._compositeNodes.length; ++i) {
      var node = this._compositeNodes[i];
      if (node.instanceOf('wcNodeCompositeEntry')) {
        order.push({
          name: node.name,
          pos: node.pos.x,
        });
      }
    }

    order.sort(function(a, b) {
      return a.pos - b.pos;
    });

    var oldLinks = this.chain.entry;

    var oldOrder = [];
    for (var i = 0; i < oldLinks.length; ++i) {
      oldOrder.push(oldLinks[i].name);
    }

    this.chain.entry = [];
    for (var i = 0; i < order.length; ++i) {
      var name = order[i].name;
      for (var a = 0; a < oldLinks.length; ++a) {
        if (oldLinks[a].name === name) {
          this.chain.entry.push(oldLinks[a]);
        }
      }
    }

    // Check to see if our order has changed.
    for (var i = 0; i < oldOrder.length; ++i) {
      if (this.chain.entry.length <= i || this.chain.entry[i].name !== oldOrder[i]) {
        this._meta.dirty = true;
        break;
      }
    }
  },

  /**
   * Called by a child composite link node to notify and sort exit links based on position.
   * @function wcNodeCompositeScript#sortExitLinks
   */
  sortExitLinks: function() {
    var order = [];
    // Find the Composite Exit nodes and order our exit links based on their x position.
    for (var i = 0; i < this._compositeNodes.length; ++i) {
      var node = this._compositeNodes[i];
      if (node.instanceOf('wcNodeCompositeExit')) {
        order.push({
          name: node.name,
          pos: node.pos.x,
        });
      }
    }

    order.sort(function(a, b) {
      return a.pos - b.pos;
    });

    var oldLinks = this.chain.exit;

    var oldOrder = [];
    for (var i = 0; i < oldLinks.length; ++i) {
      oldOrder.push(oldLinks[i].name);
    }

    this.chain.exit = [];
    for (var i = 0; i < order.length; ++i) {
      var name = order[i].name;
      for (var a = 0; a < oldLinks.length; ++a) {
        if (oldLinks[a].name === name) {
          this.chain.exit.push(oldLinks[a]);
        }
      }
    }

    // Check to see if our order has changed.
    for (var i = 0; i < oldOrder.length; ++i) {
      if (this.chain.exit.length <= i || this.chain.exit[i].name !== oldOrder[i]) {
        this._meta.dirty = true;
        break;
      }
    }
  },

  /**
   * Called by a child composite link node to notify and sort property links based on position.
   * @function wcNodeCompositeScript#sortPropertyLinks
   */
  sortPropertyLinks: function() {
    var order = [];
    // Find the Composite Property nodes and order our property links based on their y position.
    for (var i = 0; i < this._compositeNodes.length; ++i) {
      var node = this._compositeNodes[i];
      if (node.instanceOf('wcNodeCompositeProperty')) {
        order.push({
          name: node.name,
          pos: node.pos.y,
        });
      }
    }

    order.sort(function(a, b) {
      return a.pos - b.pos;
    });

    var oldProperties = this.properties;

    var oldOrder = [];
    for (var i = 0; i < oldProperties.length; ++i) {
      oldOrder.push(oldProperties[i].name);
    }

    this.properties = [oldProperties[0]];
    oldProperties.splice(0, 1);
    for (var i = 0; i < order.length; ++i) {
      var name = order[i].name;
      for (var a = 0; a < oldProperties.length; ++a) {
        if (oldProperties[a].name === name) {
          this.properties.push(oldProperties[a]);
          oldProperties.splice(a, 1);
          a--;
        }
      }
    }

    // Check to see if our order has changed.
    for (var i = 0; i < oldOrder.length; ++i) {
      if (this.properties.length <= i || this.properties[i].name !== oldOrder[i]) {
        this._meta.dirty = true;
        break;
      }
    }
  },

  /**
   * Check children nodes, if any one is awake, this node should also be awake.<br>
   * Event that is called when this node is about to be drawn.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeScript#onDraw
   */
  onDraw: function() {
    this._super();
    this._meta.awake = false;

    for (var i = 0; i < this._entryNodes.length; ++i) {
      if (this._entryNodes[i]._meta.awake) {
        this._meta.awake = true;
        this._meta.flash = true;
        return;
      }
    }
    for (var i = 0; i < this._processNodes.length; ++i) {
      if (this._processNodes[i]._meta.awake) {
        this._meta.awake = true;
        this._meta.flash = true;
        return;
      }
    }
    for (var i = 0; i < this._storageNodes.length; ++i) {
      if (this._storageNodes[i]._meta.awake) {
        this._meta.awake = true;
        this._meta.flash = true;
        return;
      }
    }
    for (var i = 0; i < this._compositeNodes.length; ++i) {
      if (this._compositeNodes[i].instanceOf('wcNodeCompositeScript')) {
        this._compositeNodes[i].onDraw();
      }

      if (this._compositeNodes[i]._meta.awake) {
        this._meta.awake = true;
        this._meta.flash = true;
        return;
      }
    }
  },

  /**
   * Event that is called when an entry link has been activated.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeScript#onActivated
   * @param {String} name - The name of the entry link triggered.
   */
  onActivated: function(name) {
    this._super(name);

    // Find the Composite Entry node that matches the triggered entry.
    for (var i = 0; i < this._compositeNodes.length; ++i) {
      var node = this._compositeNodes[i];
      if (node.instanceOf('wcNodeCompositeEntry')) {
        if (node.name === name) {
          node._activeTracker = this._activeTracker;
          node.onActivated();
          node._activeTracker = null;
          break;
        }
      }
    }
  },

  /**
   * Event that is called when a property has changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeScript#onPropertyChanged
   * @param {String} name - The name of the property.
   * @param {Object} oldValue - The old value of the property.
   * @param {Object} newValue - The new value of the property.
   */
  onPropertyChanged: function(name, oldValue, newValue) {
    this._super(name, oldValue, newValue);

    // Find all Composite Property nodes that match the changed property.
    for (var i = 0; i < this._compositeNodes.length; ++i) {
      var node = this._compositeNodes[i];
      if (node.instanceOf('wcNodeCompositeProperty')) {
        if (node.name === name) {
          node.property('value', newValue, true);
        }
      }
    }
  },

  /**
   * Event that is called when the node is about to be imported. This is your chance to prepare the node for import, or possibly modify the import data.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeScript#onImporting
   * @param {Object} data - The data being imported.
   * @param {Number[]} [idMap] - If supplied, identifies a mapping of old ID's to new ID's, any not found in this list will be unchanged.
   */
  onImporting: function(data, idMap) {
    this.compiledNodes = data.nodes;
    this.decompile(idMap);

    this._super(data, idMap);
  },

  /**
   * Event that is called when the node is being exported, after the export data has been configured.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeScript#onExport
   * @param {Object} data - The export data for this node.
   * @param {Boolean} [minimal] - If true, only the most important data should be exported, this means current values and redundant link connections are omitted.
   */
  onExport: function(data, minimal) {
    this._super(data, minimal);

    // Export the current set of nodes into our data.
    this.compile(minimal);
    data.nodes = this.compiledNodes;
  },

  /**
   * Event that is called when the node is about to be reset.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeScript#onReset
   */
  onReset: function() {
    this._super();

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
  },

  /**
   * Event that is called after the node has been destroyed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeScript#onDestroyed
   */
  onDestroyed: function() {
    this._super();

    for (var i = 0; i < this._entryNodes.length; ++i) {
      this._entryNodes[i].destroy();
    }
    for (var i = 0; i < this._processNodes.length; ++i) {
      this._processNodes[i].destroy();
    }
    for (var i = 0; i < this._storageNodes.length; ++i) {
      this._storageNodes[i].destroy();
    }
    for (var i = 0; i < this._compositeNodes.length; ++i) {
      this._compositeNodes[i].destroy();
    }
    this._entryNodes = [];
    this._processNodes = [];
    this._storageNodes = [];
    this._compositeNodes = [];
  },

  /**
   * Sends a custom notification event to all nodes.
   * @function wcNodeCompositeScript#notifyNodes
   * @private
   * @param {String} func - The node function to call.
   * @param {Object[]} args - A list of arguments to forward into the function call.
   */
  notifyNodes: function(func, args) {
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
    for (var i = 0; i < this._entryNodes.length; ++i) {
      self = this._entryNodes[i];
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

    for (var i = 0; i < this._compositeNodes.length; ++i) {
      if (this._compositeNodes[i].instanceOf('wcNodeCompositeScript')) {
        this._compositeNodes[i].notifyNodes(func, args);
      }
    }
  },

  /**
   * Adds a node into the known node stacks.
   * @function wcNodeCompositeScript#__addNode
   * @private
   * @param {wcNode} node - The node to add.
   */
  __addNode: function(node) {
    if (node.instanceOf('wcNodeEntry')) {
      this._entryNodes.push(node);
    } else if (node.instanceOf('wcNodeProcess')) {
      this._processNodes.push(node);
    } else if (node.instanceOf('wcNodeStorage')) {
      this._storageNodes.push(node);
    } else if (node.instanceOf('wcNodeComposite')) {
      this._compositeNodes.push(node);
    }
  },

  /**
   * Removes a node from the known node stacks.
   * @function wcNodeCompositeScript#__removeNode
   * @private
   * @param {wcNode} node - The node to remove.
   * @returns {Boolean} - Fails if the node was not found in this script.
   */
  __removeNode: function(node) {
    var index = -1;
    if (node.instanceOf('wcNodeEntry')) {
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
    } else if (node.instanceOf('wcNodeComposite')) {
      index = this._compositeNodes.indexOf(node);
      if (index > -1) {
        this._compositeNodes.splice(index, 1);
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
});

wcPlayNodes.wcNodeComposite.extend('wcNodeCompositeEntry', 'Entry', 'Linkers', {
  /**
   * @class
   * This node acts as a connection between entry links on a composite node and the script inside.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * @class wcNodeCompositeEntry
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {string} linkName - The name of the entry link.
   */
  init: function(parent, pos, linkName) {
    this._super(parent, pos);

    if (!(parent && parent.instanceOf('wcNodeCompositeScript'))) {
      this._invalid = true;
    }

    this.description('Activates when the corresponding Entry link of the parent Composite node has been activated.');
    this.details('The title name for this node becomes the name of the Entry link in the parent Composite Node.\n\nAlthough this node does nothing while it is outside of a Composite Node, it can be placed within the Root level of the script. Doing so is useful if you intend to "File->Import" this script into another.');

    // Prevent duplicate link names.
    linkName = linkName || 'in';
    var name = linkName;

    if (!this._invalid) {
      var index = 0;
      while (!this._parent.createEntry(name)) {
        index++;
        name = linkName + index;
      }
    }

    this.removeEntry('in');
    this.createExit('out');

    this.name = name;

    if (!this._invalid && this._parent) {
      this._parent.sortEntryLinks();
    }
  },

  /**
   * Event that is called when an entry link has been activated.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeScript#onActivated
   * @param {String} name - The name of the entry link triggered.
   */
  onActivated: function(name) {
    name;
    this.activateExit('out');
  },

  /**
   * Event that is called when the name of this node is about to change.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeEntry#onNameChanging
   * @param {string} oldName - The current name.
   * @param {string} newName - The new name.
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
   * @param {string} oldName - The current name.
   * @param {string} newName - The new name.
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

  /**
   * Event that is called when the node is about to be imported. This is your chance to prepare the node for import, or possibly modify the import data.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeEntry#onImporting
   * @param {Object} data - The data being imported.
   * @param {Number[]} [idMap] - If supplied, identifies a mapping of old ID's to new ID's, any not found in this list will be unchanged.
   */
  onImporting: function(data, idMap) {
    this._super(data, idMap);

    if (!this._invalid) {
      if (data.name !== this.name) {
        // Prevent duplicate link names.
        var name = data.name;

        this._parent.removeEntry(this.name);
        var index = 0;
        while (true) {
          if (this._parent.createEntry(name)) {
            break;
          }
          index++;
          name = data.name + index;
        }
        data.name = name;
      }
    }
  },

  /**
   * Event that is called after the node has imported.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeEntry#onImported
   * @param {Object} data - The data being imported.
   * @param {Number[]} [idMap] - If supplied, identifies a mapping of old ID's to new ID's, any not found in this list will be unchanged.
   */
  onImported: function(data, idMap) {
    this._super(data, idMap);

    if (this._invalid) {
      return;
    }

    this._parent.sortEntryLinks();
  },
});
wcPlayNodes.wcNodeComposite.extend('wcNodeCompositeExit', 'Exit', 'Linkers', {
  /**
   * @class
   * This node acts as a connection between exit links on a composite node and the script inside.<br>
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeCompositeExit
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} linkName - The name of the exit link.
   */
  init: function(parent, pos, linkName) {
    this._super(parent, pos);

    if (!(parent && parent.instanceOf('wcNodeCompositeScript'))) {
      this._invalid = true;
    }

    this.description("Activates the corresponding Exit link of the parent Composite node when it has been activated.");
    this.details("The title name for this node becomes the name of the Exit link in the parent Composite Node.\n\nAlthough this node does nothing while it is outside of a Composite Node, it can be placed within the Root level of the script. Doing so is useful if you intend to 'File->Import' this script into another.");

    // Prevent duplicate link names.
    linkName = linkName || 'out'
    var name = linkName;

    if (!this._invalid) {
      var index = 0;
      while (true) {
        if (this._parent.createExit(name)) {
          break;
        }
        index++;
        name = linkName + index;
      }
    }

    this.createEntry('in');
    this.removeExit('out');

    this.name = name;

    if (!this._invalid && this._parent) {
      this._parent.sortExitLinks();
    }
  },

  /**
   * Event that is called when an entry link has been activated.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeExit#onActivated
   * @param {String} name - The name of the entry link triggered.
   */
  onActivated: function(name) {
    this._super(name);

    if (this._invalid) {
      return;
    }

    // Trigger the corresponding exit link on the parent Composite node.
    this._parent.activateExit(this.name);
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
    for (var i = 0; i < this._parent.chain.exit.length; ++i) {
      if (this._parent.chain.exit[i].name === newName) {
        return oldName;
      }
    }
  },

  /**
   * Event that is called when the name of this node has changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeExit#onNameChanged
   * @param {String} oldName - The current name.
   * @param {String} newName - The new name.
   */
  onNameChanged: function(oldName, newName) {
    this._super(oldName, newName);

    if (this._invalid) {
      return;
    }

    // Rename the appropriate composite link.
    this._parent.renameExit(oldName, newName);
    this._parent.sortExitLinks();
  },

  /**
   * Event that is called after the node has changed its position.
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeExit#onMoving
   * @param {wcPlay~Coordinates} oldPos - The old position of the node.
   * @param {wcPlay~Coordinates} newPos - The new position of the node.
   */
  onMoved: function(oldPos, newPos) {
    this._super(oldPos, newPos);

    if (this._invalid) {
      return;
    }

    this._parent.sortExitLinks();
  },

  /**
   * Event that is called after the node has been destroyed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeExit#onDestroyed
   */
  onDestroyed: function() {
    this._super();

    if (this._invalid) {
      return;
    }

    this._parent.sortExitLinks();
  },

  /**
   * Event that is called when the node is about to be imported. This is your chance to prepare the node for import, or possibly modify the import data.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeExit#onImporting
   * @param {Object} data - The data being imported.
   * @param {Number[]} [idMap] - If supplied, identifies a mapping of old ID's to new ID's, any not found in this list will be unchanged.
   */
  onImporting: function(data, idMap) {
    this._super(data, idMap);

    if (!this._invalid) {
      if (data.name !== this.name) {
        // Prevent duplicate link names.
        var name = data.name;

        this._parent.removeExit(this.name);
        var index = 0;
        while (true) {
          if (this._parent.createExit(name)) {
            break;
          }
          index++;
          name = data.name + index;
        }
        data.name = name;
      }
    }
  },

  /**
   * Event that is called after the node has imported.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeExit#onImported
   * @param {Object} data - The data being imported.
   * @param {Number[]} [idMap] - If supplied, identifies a mapping of old ID's to new ID's, any not found in this list will be unchanged.
   */
  onImported: function(data, idMap) {
    this._super(data, idMap);

    if (this._invalid) {
      return;
    }

    this._parent.sortExitLinks();
  },
});
wcPlayNodes.wcNodeComposite.extend('wcNodeCompositeProperty', 'Property', 'Linkers', {
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

    if (!(parent && parent.instanceOf('wcNodeCompositeScript'))) {
      this._invalid = true;
    }

    this.description("References a property from its parent Composite Node.");
    this.details("The title name for this node becomes the name of the Property on the parent Composite Node. Multiple Property Nodes can reference the same property value name.\n\nAlthough this node does nothing while it is outside of a Composite Node, it can be placed within the Root level of the script. Doing so is useful if you intend to 'File->Import' this script into another.");
    this.name = linkName || 'value';

    if (!this._invalid && this._parent) {
      this._parent.createProperty(this.name, wcPlay.PROPERTY.STRING, '', {input: true, output: true});
    }

    this.createProperty('input', wcPlay.PROPERTY.TOGGLE, true, {description: "Assign whether the parent Composite Node can set this property's value."});
    this.createProperty('output', wcPlay.PROPERTY.TOGGLE, true, {description: "Assign whether the parent Composite Node can read this property's value."});
    this.createProperty('value', wcPlay.PROPERTY.STRING, '', {input: true, output: true});

    if (!this._invalid && this._parent) {
      this._parent.sortPropertyLinks();
    }
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

    if (this._invalid || !this.name || !this._parent) {
      return '';
    }

    switch (name) {
      case 'value':
        this._parent.property(this.name, newValue);
        break;
      case 'input':
        var engine = this.engine();
        var opts = this._parent.propertyOptions(this.name);
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
        var engine = this.engine();
        var opts = this._parent.propertyOptions(this.name);
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
   * Event that is called when a property has changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeProperty#onPropertyChanged
   * @param {String} name - The name of the property.
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