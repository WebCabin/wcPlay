/* Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 * Modified by Jeff Houde https://play.webcabin.org/
 */
(function(){
  var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
  window.wcNodeInstances = {};

  // The base Class implementation (does nothing)
  this.Class = function(){};
 
  // Create a new Class that inherits from this class
  Class.extend = function() {
    // First argument is always the class name.
    var className = arguments[0];
    // Full argument list will all be passed into the classInit function call.
    // Last argument is always the class definition.
    var prop = arguments[arguments.length-1];

    var _super = this.prototype;
   
    // Instantiate a base class (but only create the instance,
    // don't run the init constructor)
    initializing = true;
    var prototype = new this(arguments);
    initializing = false;
   
    // Copy the properties over onto the new prototype
    for (var name in prop) {
      // Check if we're overwriting an existing function
      prototype[name] = typeof prop[name] == "function" &&
        typeof _super[name] == "function" && fnTest.test(prop[name]) ?
        (function(name, fn){
          return function() {
            var tmp = this._super;
           
            // Add a new ._super() method that is the same method
            // but on the super-class
            this._super = _super[name];
           
            // The method only need to be bound temporarily, so we
            // remove it when we're done executing
            var ret = fn.apply(this, arguments);        
            this._super = tmp;
           
            return ret;
          };
        })(name, prop[name]) :
        prop[name];
    }
   
    // The dummy class constructor
    function Class() {
      // All construction is actually done in the init method
      if (!initializing) {
        window.wcNodeInstances[this.className].push(this);
        this.init && this.init.apply(this, arguments);
      } else {
        this.classInit && this.classInit.apply(this, arguments[0]);
      }
    }
   
    // Populate our constructed prototype object
    Class.prototype = prototype;
   
    // Enforce the constructor to be what we expect
    Class.prototype.constructor = Class;
 
    // And make this class extendable
    Class.extend = arguments.callee;
   
    window[className] = Class;
    window.wcNodeInstances[className] = [];
  };
})();
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

  this._queuedChain = [];
  this._queuedProperties = [];
  this._importedScripts = [];

  this._updateID = 0;
  this._isPaused = false;
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
};

/**
 * Determines how a property's control should be rendered within the editor view.
 * @enum {String}
 */
wcPlay.PROPERTY = {
  /** Displays the property as a string, but does not enforce or convert its type. [Default options]{@link wcNode~PropertyOptions} are used. */
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
    if (wcPlay.NODE_LIBRARY[i].name === name) {
      return false;
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
    this._isPaused = false;
    this._isStepping = false;

    if (!this._updateId) {
      var self = this;
      this._updateID = setInterval(function() {
        self.update();
      }, this._options.updateRate);
    }

    this.__notifyNodes('onStart', []);
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
    var data = {};
    data.properties = this.listProperties();

    data.nodes = [];
    for (var i = 0; i < this._entryNodes.length; ++i) {
      data.nodes.push(this._entryNodes[i].export());
    }
    for (var i = 0; i < this._processNodes.length; ++i) {
      data.nodes.push(this._processNodes[i].export());
    }
    for (var i = 0; i < this._storageNodes.length; ++i) {
      data.nodes.push(this._storageNodes[i].export());
    }
    for (var i = 0; i < this._compositeNodes.length; ++i) {
      data.nodes.push(this._compositeNodes[i].export());
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
          nodes.push({
            node: newNode,
            data: data.nodes[i],
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
      this.restore(saveData);
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

      newNode.import(data);
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

    // Update a queued property if any
    var count = Math.min(this._queuedProperties.length, this._options.updateLimit);
    var index = count;
    while (index) {
      index--;
      var item = this._queuedProperties.shift();
      item.node._meta.flash = true;
      item.node._meta.paused = false;
      item.node.property(item.name, item.value, (item.upstream? false: undefined), item.upstream);
    }

    // Update a queued node entry only if there are no more properties to update.
    if (!count) {
      count = Math.min(this._queuedChain.length, this._options.updateLimit - count);
      index = count;
      while (index) {
        index--;
        var item = this._queuedChain.shift();
        item.node._meta.flash = true;
        item.node._meta.paused = false;
        item.node.onTriggered(item.name);
      }
    }

    // If we are step debugging, pause the script here.
    if (this._isStepping) {
      this._isPaused = true;
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
      this._isPaused = paused? true: false;
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

      if (node.debugBreak() || this._isStepping) {
        node._meta.flash = true;
        node._meta.paused = true;
        this._isPaused = true;
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
    if (node.enabled()) {
      this._queuedProperties.push({
        node: node,
        name: name,
        value: value,
        upstream: upstream,
      });

      if (node.debugBreak() || this._isStepping) {
        node._meta.flash = true;
        node._meta.paused = true;
        this._isPaused = true;
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
var wcNodeNextID = 0;
Class.extend('wcNode', 'Node', '', {
  /**
   * @class
   * The foundation class for all nodes.<br>
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init functions.
   *
   * @constructor wcNode
   * @description
   * <b>Should be inherited and never constructed directly.</b>
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this.id = ++wcNodeNextID;
    this.color = '#FFFFFF';
    if (!this.name) {
      this.name = '';
    }

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
      paused: false,
      awake: false,
      threads: [],
      description: '',
    };
    this._collapsed = true;
    this._break = false;
    this._log = false;

    this._parent = parent;

    // Give the node its default properties.
    this.createProperty(wcNode.PROPERTY_ENABLED, wcPlay.PROPERTY.TOGGLE, true, {description: "Disabled nodes will be treated as if they were not there, all connections will be ignored."});
    // this.createProperty(wcNode.PROPERTY.DEBUG_LOG, wcPlay.PROPERTY.TOGGLE, false, {collapsible: true, description: "Output various debugging information about this node."});

    // Add this node to its parent.
    this._parent && this._parent.__addNode(this);
  },

  /**
   * Inherits a new class from this node.
   * @function wcNode#extend
   * @param {String} className - The class name for your node, this should be unique between all global class names.
   * @param {String} displayName - The display name of your node.
   * @param {String} category - The category to display your node in the editor palette.
   * @param {Object} classDef - An object that defines your class with all functions and variables.
   */

  /**
   * Destroys and removes the node.
   * @function wcNode#destroy
   */
  destroy: function() {
    this.onDestroying();

    // Remove all links.
    for (var i = 0; i < this.chain.entry.length; ++i) {
      var item = this.chain.entry[i];
      this.disconnectEntry(item.name);
    }

    for (var i = 0; i < this.chain.exit.length; ++i) {
      var item = this.chain.exit[i];
      this.disconnectExit(item.name);
    }

    for (var i = 0; i < this.properties.length; ++i) {
      var item = this.properties[i];
      this.disconnectInput(item.name);
      this.disconnectOutput(item.name);
    }

    this.reset();

    var instanceIndex = window.wcNodeInstances[this.className].indexOf(this);
    if (instanceIndex === -1) {
      console.log("ERROR: Could not remove instance of node.");
    }
    window.wcNodeInstances[this.className].splice(instanceIndex, 1);

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

    for (var i = 0; i < this._meta.threads.length; ++i) {
      if (typeof this._meta.threads[i] === 'number') {
        clearTimeout(this._meta.threads[i]);
        clearInterval(this._meta.threads[i]);
      } else if (typeof this._meta.threads[i] === 'function') {
        this._meta.threads[i]();
      }
    }
    this._meta.threads = [];
    this._meta.awake = false;

    for (var i = 0; i < this.properties.length; ++i) {
      this.properties[i].value = this.properties[i].initialValue;
    }
  },

  /**
   * Imports previously [exported]{@link wcNode#export} data to generate this node.
   * @function wcNode#import
   * @param {Object} data - The data to import.
   * @param {Number[]} [idMap] - If supplied, identifies a mapping of old ID's to new ID's, any not found in this list will be unchanged.
   */
  import: function(data, idMap) {
    this.onImporting(data, idMap);

    this.id = idMap && idMap[data.id] || data.id;
    this.name = data.name,
    this.color = data.color,
    this.pos.x = data.pos.x,
    this.pos.y = data.pos.y,
    this.collapsed(data.collapsed);
    this.debugBreak(data.breakpoint);

    if (this.id > wcNodeNextID) {
      wcNodeNextID = this.id;
    }

    // Restore property values.
    for (var i = 0; i < data.properties.length; ++i) {
      this.initialProperty(data.properties[i].name, data.properties[i].initialValue);
      this.property(data.properties[i].name, data.properties[i].value);
    }

    var engine = this.engine();
    if (!engine) {
      return;
    }

    // Re-connect all chains.
    for (var i = 0; i < data.entryChains.length; ++i) {
      var chain = data.entryChains[i];
      var targetNode = engine.nodeById((idMap && idMap[chain.outNodeId]) || chain.outNodeId);
      if (targetNode && this._parent === targetNode._parent) {
        this.connectEntry(chain.inName, targetNode, chain.outName);
      }
    }
    for (var i = 0; i < data.exitChains.length; ++i) {
      var chain = data.exitChains[i];
      var targetNode = engine.nodeById((idMap && idMap[chain.inNodeId]) || chain.inNodeId);
      if (targetNode && this._parent === targetNode._parent) {
        this.connectExit(chain.outName, targetNode, chain.inName);
      }
    }
    for (var i = 0; i < data.inputChains.length; ++i) {
      var chain = data.inputChains[i];
      var targetNode = engine.nodeById((idMap && idMap[chain.outNodeId]) || chain.outNodeId);
      if (targetNode && this._parent === targetNode._parent) {
        this.connectInput(chain.inName, targetNode, chain.outName);
      }
    }
    for (var i = 0; i < data.outputChains.length; ++i) {
      var chain = data.outputChains[i];
      var targetNode = engine.nodeById((idMap && idMap[chain.inNodeId]) || chain.inNodeId);
      if (targetNode && this._parent === targetNode._parent) {
        this.connectOutput(chain.outName, targetNode, chain.inName);
      }
    }

    this.onImported(data, idMap);
  },

  /**
   * Exports information about this node as well as all connected chain data so it can be [imported]{@link wcNode#import} later.
   * @function wcNode#export
   * @returns {Object} - The exported data for this node.
   */
  export: function() {
    var data = {
      className: this.className,
      id: this.id,
      name: this.name,
      color: this.color,
      pos: {
        x: this.pos.x,
        y: this.pos.y,
      },
      collapsed: this.collapsed(),
      breakpoint: this._break,
      properties: this.listProperties(),
      entryChains: this.listEntryChains(),
      exitChains: this.listExitChains(),
      inputChains: this.listInputChains(),
      outputChains: this.listOutputChains(),
    };

    this.onExport(data);
    return data;
  },

  /**
   * Retrieves the wcPlay engine that owns this node.
   * @function wcNode#engine
   * @returns {wcPlay|null} - Either the wcPlay engine, or null if it doesn't belong to one.
   */
  engine: function() {
    var play = this._parent;
    while (play && !(play instanceof wcPlay)) {
      play = play._parent;
    }
    return play || null;
  },

  /**
   * Sets, or Gets this node's enabled state.
   * @function wcNode#enabled
   * @param {Boolean} [enabled] - If supplied, will assign a new enabled state.
   * @returns {Boolean} - The current enabled state.
   */
  enabled: function(enabled) {
    if (enabled !== undefined) {
      this.property(wcNode.PROPERTY_ENABLED, enabled? true: false);
    }

    return this.property(wcNode.PROPERTY_ENABLED);
  },

  /**
   * Gets whether this node is paused, or any nodes inside if it is a composite.
   * @function wcNode#paused
   * @returns {Boolean} - Whether this, or inner nodes, are paused.
   */
  isPaused: function() {
    return this._meta.paused;
  },

  /**
   * Sets, or Gets this node's debug log state.
   * @function wcNode#debugLog
   * @param {Boolean} [enabled] - If supplied, will assign a new debug log state.
   * @returns {Boolean} - The current debug log state.
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
   * @param {Boolean} [enabled] - If supplied, will assign a new debug pause state.
   * @returns {Boolean} - The current debug pause state.
   */
  debugBreak: function(enabled) {
    if (enabled !== undefined) {
      this._break = enabled? true: false;
    }

    var engine = this.engine();
    return (engine && engine.debugging() && this._break);
  },

  /**
   * Sets, or Gets this node's collapsed state.
   * @function wcNode#collapsed
   * @param {Boolean} [enabled] - If supplied, will assign a new debug pause state.
   * @returns {Boolean} - The current debug pause state.
   */
  collapsed: function(enabled) {
    if (enabled !== undefined) {
      this._collapsed = enabled;
    }

    return this._collapsed;
  },

  /**
   * Gets, or Sets the description for this node.
   * @function wcNode#description
   * @param {String} [description] - If supplied, will assign a new description for this node.
   * @returns {String} - The current description of this node.
   */
  description: function(description) {
    if (description !== undefined) {
      this._meta.description = description;
    }

    return this._meta.description;
  },

  /**
   * If your node takes time to process, call this to begin a thread that will keep the node 'active' until you close the thread with {@link wcNode#finishThread}.<br>
   * This ensures that, even if a node is executed more than once at the same time, each 'thread' is kept track of individually.<br>
   * <b>Note:</b> This is not necessary if your node executes immediately without a timeout.
   * @function wcNode#beginThread
   * @params {Number|Function} id - The thread ID, generated by a call to setTimeout, setInterval, or a function to call when we want to force cancel the job.
   * @returns {Number} - The id that was given {@link wcNode#finishThread}.
   * @example
   *  onTriggered: function(name) {
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
   *  },
   *
   */
  beginThread: function(id) {
    this._meta.threads.push(id);
    this._meta.flash = true;
    this._meta.awake = true;
    return id;
  },

  /**
   * Finishes a previously started thread from {@link wcNode#beginThread}.<br>
   * <b>Note:</b> If you do not properly finish a thread that was generated, your node will remain forever in its active state.
   * @function wcNode#finishThread
   * @params {Number|Function} id - The thread ID to close, returned to you by the call to {@link wcNode#beginThread}.
   */
  finishThread: function(id) {
    var index = this._meta.threads.indexOf(id);
    if (index > -1) {
      this._meta.threads.splice(index, 1);

      if (!this._meta.threads.length) {
        this._meta.awake = false;
      }
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
    }

    return {x: this.pos.x, y: this.pos.y};
  },

  /**
   * Creates a new entry link on the node.
   * @function wcNode#createEntry
   * @param {String} name - The name of the entry link.
   * @param {String} [description] - An optional description to display as a tooltip for this link.
   * @returns {Boolean} - Fails if the entry link name already exists.
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
        color: "#000000",
        description: description,
      },
    });
    return true;
  },

  /**
   * Creates a new exit link on the node.
   * @function wcNode#createExit
   * @param {String} name - The name of the exit link.
   * @param {String} [description] - An optional description to display as a tooltip for this link.
   * @returns {Boolean} - Fails if the exit link name already exists.
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
        color: "#000000",
        description: description,
      },
    });
    return true;
  },

  /**
   * Creates a new property.
   * @function wcNode#createProperty
   * @param {String} name - The name of the property.
   * @param {wcPlay.PROPERTY} type - The type of property.
   * @param {Object} [initialValue] - A initial value for this property when the script starts.
   * @param {Object} [options] - Additional options for this property, see {@link wcPlay.PROPERTY}.
   * @returns {Boolean} - Fails if the property does not exist.
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
        color: "#000000",
      },
      outputMeta: {
        flash: false,
        flashDelta: 0,
        color: "#000000",
      },
    });
    return true;
  },

  /**
   * Removes an entry link from the node.
   * @function wcNode#removeEntry
   * @param {String} name - The name of the entry link to remove.
   * @returns {Boolean} - Fails if the link does not exist.
   */
  removeEntry: function(name) {
    for (var i = 0; i < this.chain.entry.length; ++i) {
      if (this.chain.entry[i].name === name) {
        if (this.disconnectEntry(name) === wcNode.CONNECT_RESULT.SUCCESS) {
          this.chain.entry.splice(i, 1);
          return true;
        }
      }
    }
    return false;
  },

  /**
   * Removes an exit link from the node.
   * @function wcNode#removeExit
   * @param {String} name - The name of the exit link to remove.
   * @returns {Boolean} - Fails if the link does not exist.
   */
  removeExit: function(name) {
    for (var i = 0; i < this.chain.exit.length; ++i) {
      if (this.chain.exit[i].name === name) {
        if (this.disconnectExit(name) === wcNode.CONNECT_RESULT.SUCCESS) {
          this.chain.exit.splice(i, 1);
          return true;
        }
      }
    }
    return false;
  },

  /**
   * Removes a property from the node.
   * @function wcNode#removeProperty
   * @param {String} name - The name of the property to remove.
   * @returns {Boolean} - Fails if the property does not exist.
   */
  removeProperty: function(name) {
    for (var i = 0; i < this.properties.length; ++i) {
      if (this.properties[i].name === name) {
        if (this.disconnectInput(name) === wcNode.CONNECT_RESULT.SUCCESS &&
            this.disconnectOutput(name) === wcNode.CONNECT_RESULT.SUCCESS) {
          this.properties.splice(i, 1);
          return true;
        }
      }
    }
    return false;
  },

  /**
   * Renames an entry link on this node while preserving all connected chains.
   * @function wcNode#renameEntry
   * @param {String} oldName - The old (current) name of the link.
   * @param {String} newName - The new name of the link.
   * @returns {Boolean} - Fails if the new name already exists, or the old name does not.
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
    return true;
  },

  /**
   * Renames an exit link on this node while preserving all connected chains.
   * @function wcNode#renameExit
   * @param {String} oldName - The old (current) name of the link.
   * @param {String} newName - The new name of the link.
   * @returns {Boolean} - Fails if the new name already exists, or the old name does not.
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
    return true;
  },

  /**
   * Renames a property on this node while preserving all connected chains.
   * @function wcNode#renameProperty
   * @param {String} oldName - The old (current) name of the link.
   * @param {String} newName - The new name of the link.
   * @returns {Boolean} - Fails if the new name already exists, or the old name does not.
   */
  renameProperty: function(oldName, newName) {
    var prop;
    for (var i = 0; i < this.properties.length; ++i) {
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
      for (var i = 0; i < inputChains.length; ++i) {
        this.connectInput(newName, engine.nodeById(inputChains[i].outNodeId), inputChains[i].outName);
      }
      for (var i = 0; i < outputChains.length; ++i) {
        this.connectOutput(newName, engine.nodeById(outputChains[i].inNodeId), outputChains[i].inName);
      }
    }
    return true;
  },

  /**
   * Connects an entry link on this node to an exit link of another.
   * @function wcNode#connectEntry
   * @param {String} name - The name of the entry link on this node.
   * @param {wcNode} targetNode - The target node to link to.
   * @param {String} targetName - The name of the target node's exit link to link to.
   * @returns {wcNode.CONNECT_RESULT} - The result.
   */
  connectEntry: function(name, targetNode, targetName) {
    if (!(targetNode instanceof wcNode)) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    var myLink = null;
    var targetLink = null;

    // Find my link.
    for (var i = 0; i < this.chain.entry.length; ++i) {
      if (this.chain.entry[i].name === name) {
        myLink = this.chain.entry[i];
        break;
      }
    }

    // Find the target link.
    for (var i = 0; i < targetNode.chain.exit.length; ++i) {
      if (targetNode.chain.exit[i].name === targetName) {
        targetLink = targetNode.chain.exit[i];
        break;
      }
    }

    if (!myLink || !targetLink) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Make sure the connection doesn't already exist.
    for (var i = 0; i < myLink.links.length; ++i) {
      if (myLink.links[i].node === targetNode && myLink.links[i].name === targetLink.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
    }

    for (var i = 0; i < targetLink.links.length; ++i) {
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
   * @param {String} name - The name of the exit link on this node.
   * @param {wcNode} targetNode - The target node to link to.
   * @param {String} targetName - The name of the target node's entry link to link to.
   * @returns {wcNode.CONNECT_RESULT} - The result.
   */
  connectExit: function(name, targetNode, targetName) {
    if (!(targetNode instanceof wcNode)) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    var myLink = null;
    var targetLink = null;

    // Find my link.
    for (var i = 0; i < this.chain.exit.length; ++i) {
      if (this.chain.exit[i].name === name) {
        myLink = this.chain.exit[i];
        break;
      }
    }

    // Find the target link.
    for (var i = 0; i < targetNode.chain.entry.length; ++i) {
      if (targetNode.chain.entry[i].name === targetName) {
        targetLink = targetNode.chain.entry[i];
        break;
      }
    }

    if (!myLink || !targetLink) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Make sure the connection doesn't already exist.
    for (var i = 0; i < myLink.links.length; ++i) {
      if (myLink.links[i].node === targetNode && myLink.links[i].name === targetLink.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
    }

    for (var i = 0; i < targetLink.links.length; ++i) {
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
   * @param {String} name - The name of the property being connected.
   * @param {wcNode} targetNode - The target node to connect with.
   * @param {String} targetName - The name of the property on the target node to connect with.
   * @returns {wcNode.CONNECT_RESULT} - The result.
   */
  connectInput: function(name, targetNode, targetName) {
    if (!(targetNode instanceof wcNode)) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    var myProperty = null;
    var targetProperty = null;

    // Find my property.
    for (var i = 0; i < this.properties.length; ++i) {
      if (this.properties[i].name === name) {
        myProperty = this.properties[i];
        break;
      }
    }

    // Find the target property.
    for (var i = 0; i < targetNode.properties.length; ++i) {
      if (targetNode.properties[i].name === targetName) {
        targetProperty = targetNode.properties[i];
        break;
      }
    }

    if (!myProperty || !targetProperty) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Make sure the connection doesn't already exist.
    for (var i = 0; i < myProperty.inputs.length; ++i) {
      if (myProperty.inputs[i].node === targetNode && myProperty.inputs[i].name === targetProperty.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
    }

    for (var i = 0; i < targetProperty.outputs.length; ++i) {
      if (targetProperty.outputs[i].node === this && targetProperty.outputs[i].name === myProperty.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
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
   * @param {String} name - The name of the property being connected.
   * @param {wcNode} targetNode - The target node to connect with.
   * @param {String} targetName - The name of the property on the target node to connect with.
   * @returns {wcNode.CONNECT_RESULT} - The result.
   */
  connectOutput: function(name, targetNode, targetName) {
    if (!(targetNode instanceof wcNode)) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    var myProperty = null;
    var targetProperty = null;

    // Find my property.
    for (var i = 0; i < this.properties.length; ++i) {
      if (this.properties[i].name === name) {
        myProperty = this.properties[i];
        break;
      }
    }

    // Find the target property.
    for (var i = 0; i < targetNode.properties.length; ++i) {
      if (targetNode.properties[i].name === targetName) {
        targetProperty = targetNode.properties[i];
        break;
      }
    }

    if (!myProperty || !targetProperty) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Make sure the connection doesn't already exist.
    for (var i = 0; i < myProperty.outputs.length; ++i) {
      if (myProperty.outputs[i].node === targetNode && myProperty.outputs[i].name === targetProperty.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
    }

    for (var i = 0; i < targetProperty.inputs.length; ++i) {
      if (targetProperty.inputs[i].node === this && targetProperty.inputs[i].name === myProperty.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
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
   * @param {String} name - The name of the entry link.
   * @param {wcNode} [targetNode] - If supplied, will only remove links to the specified target node.
   * @param {String} [targetName] - If supplied, will only remove links to the specified named exit links.
   * @returns {wcNode.CONNECT_RESULT}
   */
  disconnectEntry: function(name, targetNode, targetName) {
    // Find my entry link.
    var myLink = null;
    for (var i = 0; i < this.chain.entry.length; ++i) {
      if (this.chain.entry[i].name === name) {
        myLink = this.chain.entry[i];
        break;
      }
    }

    if (!myLink) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Iterate through all chained links and disconnect as necessary.
    for (var i = 0; i < myLink.links.length; ++i) {
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
   * @param {String} name - The name of the exit link.
   * @param {wcNode} [targetNode] - If supplied, will only remove links to the specified target node.
   * @param {String} [targetName] - If supplied, will only remove links to the specified named entry links.
   * @returns {wcNode.CONNECT_RESULT}
   */
  disconnectExit: function(name, targetNode, targetName) {
    // Find my exit link.
    var myLink = null;
    for (var i = 0; i < this.chain.exit.length; ++i) {
      if (this.chain.exit[i].name === name) {
        myLink = this.chain.exit[i];
        break;
      }
    }

    if (!myLink) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Iterate through all chained links and disconnect as necessary.
    for (var i = 0; i < myLink.links.length; ++i) {
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
   * @param {String} name - The name of the property.
   * @param {wcNode} [targetNode] - If supplied, will only remove links to the specified target node.
   * @param {String} [targetName] - If supplied, will only remove links to the specified named property output links.
   * @returns {wcNode.CONNECT_RESULT}
   */
  disconnectInput: function(name, targetNode, targetName) {
    // Find my property.
    var myProperty = null;
    for (var i = 0; i < this.properties.length; ++i) {
      if (this.properties[i].name === name) {
        myProperty = this.properties[i];
        break;
      }
    }

    if (!myProperty) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Iterate through all chained links and disconnect as necessary.
    for (var i = 0; i < myProperty.inputs.length; ++i) {
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
   * @param {String} name - The name of the property.
   * @param {wcNode} [targetNode] - If supplied, will only remove links to the specified target node.
   * @param {String} [targetName] - If supplied, will only remove links to the specified named property input links.
   * @returns {wcNode.CONNECT_RESULT}
   */
  disconnectOutput: function(name, targetNode, targetName) {
    // Find my property.
    var myProperty = null;
    for (var i = 0; i < this.properties.length; ++i) {
      if (this.properties[i].name === name) {
        myProperty = this.properties[i];
        break;
      }
    }

    if (!myProperty) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Iterate through all chained links and disconnect as necessary.
    for (var i = 0; i < myProperty.outputs.length; ++i) {
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
   * @param {String} name - The name of the entry link to trigger.
   * @returns {Boolean} - Fails if the entry link does not exist.
   */
  activateEntry: function(name) {
    for (var i = 0; i < this.chain.entry.length; ++i) {
      if (this.chain.entry[i].name == name) {
        // Always queue the trigger so execution is not immediate.
        var engine = this.engine();
        this.chain.entry[i].meta.flash = true;
        if (this.debugBreak() || (engine && engine.stepping())) {
          this.chain.entry[i].meta.paused = true;
        }
        engine && engine.queueNodeEntry(this, this.chain.entry[i].name);
        return true;
      }
    }

    return false;
  },

  /**
   * Activates an exit link.
   * @function wcNode#activateExit
   * @param {String} name - The name of the exit link to trigger.
   * @returns {Boolean} - Fails if the exit link does not exist.
   */
  activateExit: function(name) {
    if (!this.enabled()) {
      return false;
    }
    if (this.debugLog()) {
      console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" Triggered Exit link "' + name + '"');
    }

    for (var i = 0; i < this.chain.exit.length; ++i) {
      var exitLink = this.chain.exit[i];
      if (exitLink.name == name) {
        this.chain.exit[i].meta.flash = true;
        this._meta.flash = true;

        // Activate all entry links chained to this exit.
        var engine = this.engine();
        for (var a = 0; a < exitLink.links.length; ++a) {
          if (exitLink.links[a].node) {
            exitLink.links[a].node.activateEntry(exitLink.links[a].name);
            if (exitLink.links[a].node.debugBreak() || (engine && engine.stepping())) {
              this.chain.exit[i].meta.paused = true;
            }
          }
        }
        return true;
      }
    }

    return false;
  },

  /**
   * Gets, or Sets the value of a property.
   * @function wcNode#property
   * @param {String} name - The name of the property.
   * @param {Object} [value] - If supplied, will assign a new value to the property.
   * @param {Boolean} [forceOrSilent] - If supplied, true will force the change event to be sent to all chained properties even if this value didn't change while false will force the change to not be chained.
   * @param {Boolean} [forceUpstream] - Contrary to normal operation, if this is true then the property change will be sent backwards, from this property's input link to any outputs connected to it.
   * @returns {Object|undefined} - The value of the property, or undefined if not found.
   */
  property: function(name, value, forceOrSilent, forceUpstream) {
    for (var i = 0; i < this.properties.length; ++i) {
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
              if ($.isArray(items)) {
                for (var i = 0; i < items.length; ++i) {
                  if (typeof items[i] === 'object') {
                    if (items[i].value == value) {
                      found = true;
                      break;
                    }
                  } else {
                    if (items[i] == value) {
                      found = true;
                      break;
                    }
                  }
                }
              }

              if (!found) {
                value = '';
              }
              break;
          }

          var engine = this.engine();
          prop.outputMeta.flash = true;
          if (this.debugBreak() || (engine && engine.stepping())) {
            prop.outputMeta.paused = true;
          }

          // Notify about to change event.
          if (forceOrSilent || prop.value !== value) {
            value = this.onPropertyChanging(prop.name, oldValue, value) || value;
          }

          if (forceOrSilent || prop.value !== value) {
            prop.value = value;

            // Notify that the property has changed.
            this.onPropertyChanged(prop.name, oldValue, value);

            // Now follow any output links and assign the new value to them as well.
            if (forceOrSilent === undefined || forceOrSilent) {
              for (a = 0; a < prop.outputs.length; ++a) {
                prop.outputs[a].node && prop.outputs[a].node.activateProperty(prop.outputs[a].name, value);
              }
            }

            // Now propagate the change upstream if necessary.
            if (forceUpstream) {
              for (a = 0; a < prop.inputs.length; ++a) {
                prop.inputs[a].node && prop.inputs[a].node.activateProperty(prop.inputs[a].name, value, true);
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
   * @param {String} name - The name of the property.
   * @param {Object} [value] - If supplied, will assign a new default value to the property.
   * @param {Boolean} [forceOrSilent] - If supplied, true will force the change event to be sent to all chained properties even if this value didn't change while false will force the change to not be chained.
   * @param {Boolean} [forceUpstream] - Contrary to normal operation, if this is true then the property change will be sent backwards, from this property's input link to any outputs connected to it.
   * @returns {Object|undefined} - The default value of the property, or undefined if not found.
   */
  initialProperty: function(name, value, forceOrSilent, forceUpstream) {
    for (var i = 0; i < this.properties.length; ++i) {
      var prop = this.properties[i];
      if (prop.name === name) {
        if (value !== undefined) {
          value = this.onInitialPropertyChanging(prop.name, prop.initialValue, value) || value;
          if (prop.value == prop.initialValue) {
            this.property(name, value);
          }
          var oldValue = prop.initialValue;

          if (forceOrSilent || prop.initialValue !== value) {
            prop.initialValue = value;

            // Notify that the property has changed.
            this.onInitialPropertyChanged(prop.name, oldValue, value);

            // Now follow any output links and assign the new value to them as well.
            if (forceOrSilent === undefined || forceOrSilent) {
              for (a = 0; a < prop.outputs.length; ++a) {
                prop.outputs[a].node && prop.outputs[a].node.initialProperty(prop.outputs[a].name, value);
              }
            }

            // Now propagate the change upstream if necessary.
            if (forceUpstream) {
              for (a = 0; a < prop.inputs.length; ++a) {
                prop.inputs[a].node && prop.inputs[a].node.initialProperty(prop.inputs[a].name, value, undefined, true);
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
   * @param {String} name - The name of the property.
   * @param {Object} value - The new value of the property.
   * @param {Boolean} [upstream] - If true, the activation was from a property in its output, and we are propagating in reverse.
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
          prop.inputMeta.paused = true;
        }
      }
    }
  },

  /**
   * Retrieves a list of all chains connected to an entry link on this node.
   * @function wcNode#listEntryChains
   * @param {String} [name] - The entry link, if omitted, all link chains are retrieved.
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
   * @param {String} [name] - The exit link, if omitted, all link chains are retrieved.
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
   * @param {String} [name] - The property input link, if omitted, all link chains are retrieved.
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
   * @param {String} [name] - The property output link, if omitted, all link chains are retrieved.
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
   * @returns {wcNode~PropertyData[]} - A list of all property data.
   */
  listProperties: function() {
    var result = [];
    for (var i = 0; i < this.properties.length; ++i) {
      var myProp = this.properties[i];
      result.push({
        name: myProp.name,
        value: myProp.value,
        initialValue: myProp.initialValue,
      });
    }

    return result;
  },

  /**
   * Sets a size for the custom viewport.<br>
   * The custom viewport is a rectangular area embedded into the node's visual display in which you can 'draw' whatever you wish. It appears below the title text and above properties.
   * @function wcNode#viewportSize
   * @param {Number} [width] - If supplied, assigns the width of the viewport desired. Use 0 or null to disable the viewport.
   * @param {Number} [height] - If supplied, assigns the height of the viewport desired. Use 0 or null to disable the viewport.
   * @returns {wcPlay~Coordinates} - The current size of the viewport.
   * @see wcNode#onViewportDraw
   */
  viewportSize: function(width, height) {
    if (width !== undefined && height !== undefined) {
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
   * Event that is called when it is time to draw the contents of your custom viewport. It is up to you to stay within the [wcNode.viewportSize]{@link wcNode~viewportSize} you've specified.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onViewportDraw
   * @param {external:Canvas~Context} context - The canvas context to draw on, coordinates 0,0 will be the top left corner of your viewport. It is up to you to stay within the [viewport bounds]{@link wcNode#viewportSize} you have assigned.
   * @param {Boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   * @see wcNode#viewportSize
   */
  onViewportDraw: function(context, readOnly) {
    // this._super(context, readOnly);
  },

  /**
   * Event that is called when the mouse has entered the viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode~onViewportMouseEnter
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @param {Boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   */
  onViewportMouseEnter: function(event, pos, readOnly) {
    // this._super(event, pos, readOnly);
    if (this.debugLog()) {
      console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" mouse entered custom viewport!');
    }
  },

  /**
   * Event that is called when the mouse has left the viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode~onViewportMouseLeave
   * @param {Object} event - The original jquery mouse event.
   * @param {Boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   */
  onViewportMouseLeave: function(event, readOnly) {
    // this._super(event, readOnly);
    if (this.debugLog()) {
      console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" mouse left custom viewport!');
    }
  },

  /**
   * Event that is called when the mouse button is pressed over your viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode~onViewportMouseDown
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @param {Boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   * @returns {Boolean|undefined} - Return true if you want to disable node dragging during mouse down within your viewport.
   */
  onViewportMouseDown: function(event, pos, readOnly) {
    // this._super(event, pos, readOnly);
  },

  /**
   * Event that is called when the mouse button is released over your viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode~onViewportMouseUp
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @param {Boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   */
  onViewportMouseUp: function(event, pos, readOnly) {
    // this._super(event, pos, readOnly);
  },

  /**
   * Event that is called when the mouse has moved over your viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode~onViewportMouseMove
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @param {Boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   */
  onViewportMouseMove: function(event, pos, readOnly) {
    // this._super(event, pos, readOnly);
  },

  /**
   * Event that is called when the mouse wheel is used over your viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode~onViewportMouseWheel
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @param {Number} scrollDelta - The scroll amount and direction.
   * @param {Boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   */
  onViewportMouseWheel: function(event, pos, scrollDelta, readOnly) {
    // this._super(event, pos, scrollDelta, readOnly);
  },

  /**
   * Event that is called when the mouse button is pressed and released in the same spot over your viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode~onViewportMouseClick
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @param {Boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   */
  onViewportMouseClick: function(event, pos, readOnly) {
    // this._super(event, pos, readOnly);
  },

  /**
   * Event that is called when the mouse button is double clicked in the same spot over your viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode~onViewportMouseClick
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @param {Boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   * @returns {Boolean|undefined} - Return true if you want to disable node auto-collapse when double clicking.
   */
  onViewportMouseDoubleClick: function(event, pos, readOnly) {
    // this._super(event, pos, readOnly);
  },

  /**
   * Event that is called when a connection has been made.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onConnect
   * @param {Boolean} isConnecting - True if a connection is being made, false if it is a disconnection.
   * @param {String} name - The name of the link being connected to.
   * @param {wcNode.LINK_TYPE} type - The link's type.
   * @param {wcNode} targetNode - The target node being connected to.
   * @param {String} targetName - The link name on the target node being connected to.
   * @param {wcNode.LINK_TYPE} targetType - The target link's type.
   */
  onConnect: function(isConnecting, name, type, targetNode, targetName, targetType) {
    // this._super(isConnecting, name, type, targetNode, targetName, targetType);
    // If we are connecting one of our property outputs to another property, alert them and send your value to them.
    if (isConnecting && type === wcNode.LINK_TYPE.OUTPUT) {
      targetNode.activateProperty(targetName, this.property(name));
    }
  },

  /**
   * Event that is called as soon as the Play script has started.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onStart
   */
  onStart: function() {
    // this._super();
    if (this.debugLog()) {
      console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" started!');
    }
  },

  /**
   * Event that is called when this node is about to be drawn.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onDraw
   */
  onDraw: function() {
    // this._super();
  },

  /**
   * Event that is called when an entry link has been triggered.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onTriggered
   * @param {String} name - The name of the entry link triggered.
   */
  onTriggered: function(name) {
    // this._super(name);
    if (this.debugLog()) {
      console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" Triggered Entry link "' + name + '"');
    }
  },

  /**
   * Event that is called when the node is about to change its position.
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onMoving
   * @param {wcPlay~Coordinates} oldPos - The current position of the node.
   * @param {wcPlay~Coordinates} newPos - The new position to move the node.
   * @returns {wcPlay~Coordinates|undefined} - Return the new position of the node (usually newPos unless you are restricting the position). If no value is returned, newPos is assumed.
   */
  onMoving: function(oldPos, newPos) {
    // this._super(oldPos, newPos);
  },

  /**
   * Event that is called after the node has changed its position.
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onMoving
   * @param {wcPlay~Coordinates} oldPos - The old position of the node.
   * @param {wcPlay~Coordinates} newPos - The new position of the node.
   */
  onMoved: function(oldPos, newPos) {
    // this._super(oldPos, newPos);
  },

  /**
   * Event that is called when the name of this node is about to change.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onNameChanging
   * @param {String} oldName - The current name.
   * @param {String} newName - The new name.
   * @return {String|undefined} - Return the new value of the name (usually newValue unless you are restricting the name). If no value is returned, newValue is assumed.
   */
  onNameChanging: function(oldName, newName) {
    // this._super(oldName, newName);
  },

  /**
   * Event that is called when the name of this node has changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onNameChanged
   * @param {String} oldName - The current name.
   * @param {String} newName - The new name.
   */
  onNameChanged: function(oldName, newName) {
    // this._super(oldName, newName);
  },

  /**
   * Event that is called when a property is about to be changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onPropertyChanging
   * @param {String} name - The name of the property.
   * @param {Object} oldValue - The current value of the property.
   * @param {Object} newValue - The new, proposed, value of the property.
   * @returns {Object} - Return the new value of the property (usually newValue unless you are proposing restrictions). If no value is returned, newValue is assumed.
   */
  onPropertyChanging: function(name, oldValue, newValue) {
    // this._super(name, oldValue, newValue);
    // if (this.debugLog()) {
    //   console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" Changing Property "' + name + '" from "' + oldValue + '" to "' + newValue + '"');
    // }
  },

  /**
   * Event that is called when a property has changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onPropertyChanged
   * @param {String} name - The name of the property.
   * @param {Object} oldValue - The old value of the property.
   * @param {Object} newValue - The new value of the property.
   */
  onPropertyChanged: function(name, oldValue, newValue) {
    // this._super(name, oldValue, newValue);
    if (this.debugLog()) {
      console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" Changed Property "' + name + '" from "' + oldValue + '" to "' + newValue + '"');
    }
  },

  /**
   * Event that is called when the property is being asked its value, before the value is actually retrieved.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onPropertyGet
   * @param {String} name - The name of the property.
   * @returns {Object|undefined} - If a value is returned, that value is what will be retrieved from the get.
   */
  onPropertyGet: function(name) {
    // this._super(name);
    // if (this.debugLog()) {
    //   console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" Requested Property "' + name + '"');
    // }
  },

  /**
   * Event that is called when a property initial value is about to be changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onInitialPropertyChanging
   * @param {String} name - The name of the property.
   * @param {Object} oldValue - The current value of the property.
   * @param {Object} newValue - The new, proposed, value of the property.
   * @returns {Object} - Return the new value of the property (usually newValue unless you are proposing restrictions). If no value is returned, newValue is assumed.
   */
  onInitialPropertyChanging: function(name, oldValue, newValue) {
    // this._super(name, oldValue, newValue);
    // if (this.debugLog()) {
    //   console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" Changing Property "' + name + '" from "' + oldValue + '" to "' + newValue + '"');
    // }
  },

  /**
   * Event that is called when a property initial value has changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onInitialPropertyChanged
   * @param {String} name - The name of the property.
   * @param {Object} oldValue - The old value of the property.
   * @param {Object} newValue - The new value of the property.
   */
  onInitialPropertyChanged: function(name, oldValue, newValue) {
    // this._super(name, oldValue, newValue);
    if (this.debugLog()) {
      console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" Changed Property "' + name + '" from "' + oldValue + '" to "' + newValue + '"');
    }
  },

  /**
   * Event that is called when the property initial value is being asked its value, before the value is actually retrieved.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onInitialPropertyGet
   * @param {String} name - The name of the property.
   * @returns {Object|undefined} - If a value is returned, that value is what will be retrieved from the get.
   */
  onInitialPropertyGet: function(name) {
    // this._super(name);
    // if (this.debugLog()) {
    //   console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" Requested Property "' + name + '"');
    // }
  },

  /**
   * Event that is called when a global property value has changed.
   * Overload this in inherited nodes.<br>
   * <b>Note:</b> Do not call 'this._super(..)' for this function, as the parent does not implement it.
   * @function wcNode#onGlobalPropertyChanged
   * @param {String} name - The name of the global property.
   * @param {Object} oldValue - The old value of the global property.
   * @param {Object} newValue - The new value of the global property.
   */
  // onGlobalPropertyChanged: function(name, oldValue, newValue) {
  // },

  /**
   * Event that is called when a global property has been removed.
   * Overload this in inherited nodes.<br>
   * <b>Note:</b> Do not call 'this._super(..)' for this function, as the parent does not implement it.
   * @function wcNode#onGlobalPropertyRemoved
   * @param {String} name - The name of the global property.
   */
  // onGlobalPropertyRemoved: function(name) {
  // },

  /**
   * Event that is called when a global property has been renamed.
   * Overload this in inherited nodes.<br>
   * <b>Note:</b> Do not call 'this._super(..)' for this function, as the parent does not implement it.
   * @function wcNode#onGlobalPropertyRenamed
   * @param {String} oldName - The old name of the global property.
   * @param {String} newName - The new name of the global property.
   */
  // onGlobalPropertyRenamed: function(oldName, newName) {
  // },

  /**
   * Event that is called when a global property initial value has changed.
   * Overload this in inherited nodes.<br>
   * <b>Note:</b> Do not call 'this._super(..)' for this function, as the parent does not implement it.
   * @function wcNode#onGlobalInitialPropertyChanged
   * @param {String} name - The name of the global property.
   * @param {Object} oldValue - The old value of the global property.
   * @param {Object} newValue - The new value of the global property.
   */
  // onGlobalInitialPropertyChanged: function(name, oldValue, newValue) {
  // },

  /**
   * Event that is called when the node is about to be imported. This is your chance to prepare the node for import, or possibly modify the import data.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onImporting
   * @param {Object} data - The data being imported.
   * @param {Number[]} [idMap] - If supplied, identifies a mapping of old ID's to new ID's, any not found in this list will be unchanged.
   */
  onImporting: function(data, idMap) {
    // this._super(data, idMap);
  },

  /**
   * Event that is called after the node has imported.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onImported
   * @param {Object} data - The data being imported.
   * @param {Number[]} [idMap] - If supplied, identifies a mapping of old ID's to new ID's, any not found in this list will be unchanged.
   */
  onImported: function(data, idMap) {
    // this._super(data, idMap);
  },

  /**
   * Event that is called when the node is being exported, after the export data has been configured.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onExport
   * @param {Object} data - The export data for this node.
   */
  onExport: function(data) {
    // this._super(data);
  },

  /**
   * Event that is called when the node is about to be reset.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onReset
   */
  onReset: function() {
    // this._super();
  },

  /**
   * Event that is called when the node is about to be destroyed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onDestroying
   */
  onDestroying: function() {
    // this._super();
  },

  /**
   * Event that is called after the node has been destroyed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onDestroyed
   */
  onDestroyed: function() {
    // this._super();
  },
});

/**
 * The type of node link.
 * @enum {String}
 */
wcNode.LINK_TYPE = {
  ENTRY: 'entry',
  EXIT: 'exit',
  INPUT: 'input',
  OUTPUT: 'output',
};

/**
 * The connection result.
 * @enum {String}
 */
wcNode.CONNECT_RESULT = {
  NOT_FOUND: 'not_found',
  ALREADY_CONNECTED: 'already_connected',
  SUCCESS: 'success',
};


/**
 * Enabled property name.
 * @typedef {String}
 */
wcNode.PROPERTY_ENABLED = 'enabled';

wcNode.extend('wcNodeEntry', 'Entry Node', '', {
  /**
   * @class
   * The base class for all entry nodes. These are nodes that start script chains.<br>
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeEntry
   * @description
   * <b>Should be inherited and never constructed directly.</b>
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);
    this.color = '#CCCC00';

    // Create a default exit link.
    this.createExit('out');
  },

  /**
   * Magic function that is called whenever any new class type is extended from this one.<br>
   * Handles initializing of the class as well as registering the new node type.
   * @function wcNodeEntry#classInit
   * @param {String} className - The name of the class constructor.
   * @param {String} type - The type name for the node.
   * @param {String} category - A category where this node will be grouped.
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
   * Overloading the default onTriggered event handler so we can make it immediately trigger our Exit link.
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeEntry#onTriggered
   * @param {String} name - The name of the entry link triggered.
   */
  onTriggered: function(name) {
    this._super(name);
    this.activateExit('out');
  },
});


wcNode.extend('wcNodeProcess', 'Node Process', '', {
  /**
   * @class
   * The base class for all process nodes. These are nodes that make up the bulk of script chains.<br>
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeProcess
   * @description
   * <b>Should be inherited and never constructed directly.</b>
   * @param {String} parent - The parent object of this node.
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
   * Magic function that is called whenever any new class type is extended from this one.<br>
   * Handles initializing of the class as well as registering the new node type.
   * @function wcNodeProcess#classInit
   * @param {String} className - The name of the class constructor.
   * @param {String} type - The type name for the node.
   * @param {String} category - A category where this node will be grouped.
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

wcNode.extend('wcNodeStorage', 'Storage', '', {
  /**
   * @class
   * The base class for all storage nodes. These are nodes designed solely for managing data.<br>
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.<br>
   * Also when inheriting, a 'value' property MUST be created as the storage value.
   *
   * @constructor wcNodeStorage
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);
    this.color = '#009900';
  },

  /**
   * Magic function that is called whenever any new class type is extended from this one.<br>
   * Handles initializing of the class as well as registering the new node type.
   * @function wcNodeStorage#classInit
   * @param {String} className - The name of the class constructor.
   * @param {String} type - The type name for the node.
   * @param {String} category - A category where this node will be grouped.
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
   * Event that is called as soon as the Play script has started.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeStorage#onStart
   */
  onStart: function() {
    this._super();

    // Force a property change event so all connected nodes receive our value.
    this.property('value', this.property('value'), true);
  },
});

wcNode.extend('wcNodeComposite', 'Composite', '', {
  /**
   * @class
   * The base class for all composite nodes.<br>
   *
   * @constructor wcNodeComposite
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);
    this.color = '#990099';

    this.removeEntry('in');
    this.removeExit('out');
  },

  /**
   * Magic function that is called whenever any new class type is extended from this one.<br>
   * Handles initializing of the class as well as registering the new node type.
   * @function wcNodeComposite#classInit
   * @param {String} className - The name of the class constructor.
   * @param {String} type - The type name for the node.
   * @param {String} category - A category where this node will be grouped.
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

wcNodeComposite.extend('wcNodeCompositeScript', 'Composite', 'Imported', {
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

    this._entryNodes = [];
    this._processNodes = [];
    this._storageNodes = [];
    this._compositeNodes = [];

    if ($.isArray(nodes)) {
      for (var i = 0; i < nodes.length; ++i) {
        this.__addNode(nodes[i]);
        nodes[i]._parent = this;
      }
    }
  },

  /**
   * Gets whether this node is paused, or any nodes inside if it is a composite.
   * @function wcNode#paused
   * @returns {Boolean} - Whether this, or inner nodes, are paused.
   */
  isPaused: function() {
    for (var i = 0; i < this._compositeNodes.length; ++i) {
      if (this._compositeNodes[i].isPaused()) {
        return true;
      }
    }
    for (var i = 0; i < this._entryNodes.length; ++i) {
      if (this._entryNodes[i].isPaused()) {
        return true;
      }
    }
    for (var i = 0; i < this._processNodes.length; ++i) {
      if (this._processNodes[i].isPaused()) {
        return true;
      }
    }
    for (var i = 0; i < this._storageNodes.length; ++i) {
      if (this._storageNodes[i].isPaused()) {
        return true;
      }
    }

    return this._super();
  },

  /**
   * Compiles all nodes inside this composite into meta-data.
   * @function wcNodeCompositeScript#compile
   */
  compile: function() {
    this.compiledNodes = [];

    function __compileNodes(nodes) {
      for (var i = 0; i < nodes.length; ++i) {
        this.compiledNodes.push(nodes[i].export());
      }
    };

    __compileNodes.call(this, this._entryNodes);
    __compileNodes.call(this, this._storageNodes);
    __compileNodes.call(this, this._processNodes);
    __compileNodes.call(this, this._compositeNodes);
  },

  /**
   * Loads the contents of this node based on its compiled data.
   * @function wcNodeCompositeScript#decompile
   * @param {Boolean} [restoreIds] - If true, nodes created will be restored to their original ID's rather than assigned new ones.
   */
  decompile: function(restoreIds) {
    this.onDestroying();

    var idMap = [];
    var newNodes = [];

    if (this.compiledNodes) {
      for (var i = 0; i < this.compiledNodes.length; ++i) {
        var data = this.compiledNodes[i];
        if (window[data.className]) {
          var newNode = new window[data.className](this, data.pos, data.name);
          if (!restoreIds) {
            idMap[data.id] = newNode.id;
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
   * Called by a child composite link node to notify and sort entry links based on position.
   * @function wcNodeCompositeScript#sortEntryLinks
   */
  sortEntryLinks: function() {
    var order = [];
    // Find the Composite Entry nodes and order our entry links based on their x position.
    for (var i = 0; i < this._compositeNodes.length; ++i) {
      var node = this._compositeNodes[i];
      if (node instanceof wcNodeCompositeEntry) {
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
    this.chain.entry = [];
    for (var i = 0; i < order.length; ++i) {
      var name = order[i].name;
      for (var a = 0; a < oldLinks.length; ++a) {
        if (oldLinks[a].name === name) {
          this.chain.entry.push(oldLinks[a]);
        }
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
      if (node instanceof wcNodeCompositeExit) {
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
    this.chain.exit = [];
    for (var i = 0; i < order.length; ++i) {
      var name = order[i].name;
      for (var a = 0; a < oldLinks.length; ++a) {
        if (oldLinks[a].name === name) {
          this.chain.exit.push(oldLinks[a]);
        }
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
      if (node instanceof wcNodeCompositeProperty) {
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
      if (this._compositeNodes[i] instanceof wcNodeCompositeScript) {
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
   * Event that is called when an entry link has been triggered.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeScript#onTriggered
   * @param {String} name - The name of the entry link triggered.
   */
  onTriggered: function(name) {
    this._super(name);

    // Find the Composite Entry node that matches the triggered entry.
    for (var i = 0; i < this._compositeNodes.length; ++i) {
      var node = this._compositeNodes[i];
      if (node instanceof wcNodeCompositeEntry) {
        if (node.name === name) {
          node.activateExit('out');
          break;
        }
      }
    }
  },

  /**
   * Event that is called when the name of this node has changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeScript#onNameChanged
   * @param {String} oldName - The current name.
   * @param {String} newName - The new name.
   */
  onNameChanged: function(oldName, newName) {
    this._super(oldName, newName);
    // window[this.className].prototype.name = newName;

    // for (var i = 0; i < window.wcNodeInstances[this.className].length; ++i) {
    //   window.wcNodeInstances[this.className][i].name = newName;
    // }
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
      if (node instanceof wcNodeCompositeProperty) {
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
    this.decompile(idMap? false: false);

    this._super(data, idMap);
  },

  /**
   * Event that is called when the node is being exported, after the export data has been configured.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeScript#onExport
   * @param {Object} data - The export data for this node.
   */
  onExport: function(data) {
    this._super(data);

    // Export the current set of nodes into our data.
    this.compile();
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
   * Adds a node into the known node stacks.
   * @function wcNodeCompositeScript#__addNode
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
   * @function wcNodeCompositeScript#__removeNode
   * @private
   * @param {wcNode} node - The node to remove.
   * @returns {Boolean} - Fails if the node was not found in this script.
   */
  __removeNode: function(node) {
    var index = -1;
    if (node instanceof wcNodeEntry) {
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
    } else if (node instanceof wcNodeComposite) {
      index = this._compositeNodes.indexOf(node);
      if (index > -1) {
        this._compositeNodes.splice(index, 1);
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
   * @function wcNodeCompositeScript#__notifyNodes
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
      if (this._compositeNodes[i] instanceof wcNodeCompositeScript) {
        this._compositeNodes[i].__notifyNodes(func, args);
      }
    }
  },
});

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
    this._parent.sortEntryLinks();
  },
});
wcNodeComposite.extend('wcNodeCompositeExit', 'Exit', 'External', {
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

    if (!(parent instanceof wcNodeCompositeScript)) {
      this._invalid = true;
    }

    this.description("Activates the corresponding Exit link of the parent Composite node when it has been activated.");

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
  },

  /**
   * Event that is called when an entry link has been triggered.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeCompositeExit#onTriggered
   * @param {String} name - The name of the entry link triggered.
   */
  onTriggered: function(name) {
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
    this._parent.sortExitLinks();
  },
});
wcNodeComposite.extend('wcNodeCompositeProperty', 'Property', 'External', {
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
wcNodeEntry.extend('wcNodeEntryStart', 'Start', 'Core', {
  /**
   * @class
   * An entry node that fires as soon as the script [starts]{@link wcPlay#start}.<br>
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeEntryStart
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("Event that fires once on script execution.");
  },

  /**
   * Event that is called as soon as the Play script has started.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeEntryStart#onStart
   */
  onStart: function() {
    this._super();
    this.onTriggered();
  },
});
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
wcNodeProcess.extend('wcNodeProcessDelay', 'Delay', 'Core', {
  /**
   * @class
   * Waits for a specified amount of time before continuing the flow chain.<br>
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeProcessDelay
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("Waits for a specified amount of time before continuing the flow chain.");

    // Create the message property so we know what to output in the log.
    this.createProperty('milliseconds', wcPlay.PROPERTY.NUMBER, 1000, {description: "The time delay, in milliseconds, to wait before firing the 'out' Exit link."});
  },

  /**
   * Event that is called when an entry link has been triggered.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessDelay#onTriggered
   * @param {String} name - The name of the entry link triggered.
   */
  onTriggered: function(name) {
    this._super(name);

    // Now set a timeout to wait for 'Milliseconds' amount of time.    
    var self = this;
    var delay = this.property('milliseconds');

    // Start a new thread that will keep the node alive until we are finished.
    var thread = this.beginThread(setTimeout(function() {
      // Once the time has completed, fire the 'out' link and finish our thread.
      self.activateExit('out');
      self.finishThread(thread);
    }, delay));
  },
});

wcNodeProcess.extend('wcNodeProcessConsoleLog', 'Console Log', 'Debugging', {
  /**
   * @class
   * For debugging purposes, will print out a message into the console log the moment it is activated. [Silent mode]{@link wcPlay~Options} will silence this node.<br>
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeProcessConsoleLog
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("For debugging purposes, will print out a message into the console log the moment it is activated (only if silent mode is not on).");

    // Create the message property so we know what to output in the log.
    this.createProperty('message', wcPlay.PROPERTY.STRING, 'Log message.', {description: "The message that will appear in the console log."});
  },

  /**
   * Event that is called when an entry link has been triggered.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessConsoleLog#onTriggered
   * @param {String} name - The name of the entry link triggered.
   */
  onTriggered: function(name) {
    this._super(name);

    // Always trigger the out immediately.
    this.activateExit('out');

    // Cancel the log in silent mode.
    var engine = this.engine();
    if (!engine || engine.silent()) {
      return;
    }

    var msg = this.property('message');
    console.log(msg);
  },
});

wcNodeProcess.extend('wcNodeProcessAlert', 'Alert', 'Debugging', {
  /**
   * @class
   * For debugging purposes, will popup an alert box with a message the moment it is activated. [Silent mode]{@link wcPlay~Options} will silence this node.<br>
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeProcessAlert
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("For debugging purposes, will popup an alert box with a message the moment it is activated (only if silent mode is not on).");

    // Create the message property so we know what to output in the log.
    this.createProperty('message', wcPlay.PROPERTY.STRING, 'Alert message.', {multiline: true, description: "The message that will appear in the alert box."});
  },

  /**
   * Event that is called when an entry link has been triggered.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessAlert#onTriggered
   * @param {String} name - The name of the entry link triggered.
   */
  onTriggered: function(name) {
    this._super(name);

    // Always trigger the out immediately.
    this.activateExit('out');

    // Cancel the log in silent mode.
    var engine = this.engine();
    if (!engine || engine.silent()) {
      return;
    }

    var msg = this.property('message');
    alert(msg);
  },
});

wcNodeProcess.extend('wcNodeProcessOperation', 'Operation', 'Core', {
  /**
   * @class
   * Performs a simple math operation on two values.
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeProcessOperation
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("Performs a simple math operation on two values.");

    // Remove our default entry.
    this.removeEntry('in');

    // Create an input link per operation type.
    this.createEntry('add', "valueA + valueB = result");
    this.createEntry('sub', "valueA - valueB = result");
    this.createEntry('mul', "valueA * valueB = result");
    this.createEntry('div', "valueA / valueB = result");

    // Create our two operator values.
    this.createProperty('valueA', wcPlay.PROPERTY.NUMBER, 0, {description: "Left hand value for the operation."});
    this.createProperty('valueB', wcPlay.PROPERTY.NUMBER, 0, {description: "Right hand value for the operation."});
    this.createProperty('result', wcPlay.PROPERTY.NUMBER, 0, {description: "The result of the operation."});
  },

  /**
   * Event that is called when an entry link has been triggered.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessOperation#onTriggered
   * @param {String} name - The name of the entry link triggered.
   */
  onTriggered: function(name) {
    this._super(name);

    var a = parseFloat(this.property('valueA'));
    var b = parseFloat(this.property('valueB'));
    var result;

    switch (name) {
      case 'add': result = a + b; break;
      case 'sub': result = a - b; break;
      case 'mul': result = a * b; break;
      case 'div': result = a / b; break;
    }

    this.property('result', result, true);
    this.activateExit('out');
  },
});

wcNodeStorage.extend('wcNodeStorageGlobal', 'Global', 'Core', {
  /**
   * @class
   * References a global property on the script.
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeStorageGlobal
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);
    this.color = '#77CC77';

    this.description("References a global property on the script.");

    this.createProperty('value', wcPlay.PROPERTY.STRING, '', {description: "The current value of the global property (Use the title to identify the property)."});
  },

  /**
   * Event that is called when the name of this node has changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeStorageGlobal#onNameChanged
   * @param {String} oldName - The current name.
   * @param {String} newName - The new name.
   */
  onNameChanged: function(oldName, newName) {
    this._super(oldName, newName);

    // Attempt to create a new property if it does not exist.
    var engine = this.engine();
    if (engine) {
      engine.createProperty(newName, wcPlay.PROPERTY.STRING, '');
      
      // Perform a search and remove all global properties no longer being referenced.
      var propList = engine.listProperties();

      for (var i = 0; i < window.wcNodeInstances.wcNodeStorageGlobal.length; ++i) {
        var name = window.wcNodeInstances.wcNodeStorageGlobal[i].name;
        for (var a = 0; a < propList.length; ++a) {
          if (propList[a].name === name) {
            propList.splice(a, 1);
            break;
          }
        }
      }

      for (var i = 0; i < propList.length; ++i) {
        engine.removeProperty(propList[i].name);
      }
    }
  },

  /**
   * Any changes to the 'value' property will also change the global property.<br>
   * Event that is called when a property has changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeStorageGlobal#onPropertyChanged
   * @param {String} name - The name of the property.
   * @param {Object} oldValue - The old value of the property.
   * @param {Object} newValue - The new value of the property.
   */
  onPropertyChanged: function(name, oldValue, newValue) {
    this._super(name, oldValue, newValue);

    if (name === 'value') {
      if (this.name) {
        var engine = this.engine();
        engine && engine.property(this.name, newValue);
      }
    }
  },

  /**
   * Always redirect property gets on 'value' to the referenced global property.<br>
   * Event that is called when the property is being asked its value, before the value is actually retrieved.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeStorageGlobal#onPropertyGet
   * @param {String} name - The name of the property.
   * @returns {Object|undefined} - If a value is returned, that value is what will be retrieved from the get.
   */
  onPropertyGet: function(name) {
    this._super(name);

    if (name === 'value') {
      if (this.name) {
        var engine = this.engine();
        return (engine && engine.property(this.name)) || 0;
      }
    }
  },

  /**
   * Any changes to the 'value' property will also change the global property.<br>
   * Event that is called when a property initial value is about to be changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeStorageGlobal#onInitialPropertyChanging
   * @param {String} name - The name of the property.
   * @param {Object} oldValue - The current value of the property.
   * @param {Object} newValue - The new, proposed, value of the property.
   * @returns {Object} - Return the new value of the property (usually newValue unless you are proposing restrictions). If no value is returned, newValue is assumed.
   */
  onInitialPropertyChanging: function(name, oldValue, newValue) {
    this._super(name, oldValue, newValue);

    if (name === 'value') {
      if (this.name) {
        var engine = this.engine();
        engine && engine.initialProperty(this.name, newValue);
      }
    }
  },

  /**
   * Always redirect property gets on 'value' to the referenced global property.<br>
   * Event that is called when the property initial value is being asked its value, before the value is actually retrieved.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeStorageGlobal#onInitialPropertyGet
   * @param {String} name - The name of the property.
   * @returns {Object|undefined} - If a value is returned, that value is what will be retrieved from the get.
   */
  onInitialPropertyGet: function(name) {
    this._super(name);

    if (name === 'value') {
      if (this.name) {
        var engine = this.engine();
        return (engine && engine.initialProperty(this.name)) || 0;
      }
    }
  },


  /**
   * Event that is called when a global property value has changed.
   * Overload this in inherited nodes.<br>
   * <b>Note:</b> Do not call 'this._super(..)' for this function, as the parent does not implement it.
   * @function wcNodeStorageGlobal#onGlobalPropertyChanged
   * @param {String} name - The name of the global property.
   * @param {Object} oldValue - The old value of the global property.
   * @param {Object} newValue - The new value of the global property.
   */
  onGlobalPropertyChanged: function(name, oldValue, newValue) {
    if (this.name == name) {
      this.property('value', this.property('value'), true, true);
    };
  },

  /**
   * Event that is called when a global property has been removed.
   * Overload this in inherited nodes.<br>
   * <b>Note:</b> Do not call 'this._super(..)' for this function, as the parent does not implement it.
   * @function wcNodeStorageGlobal#onGlobalPropertyRemoved
   * @param {String} name - The name of the global property.
   */
  onGlobalPropertyRemoved: function(name) {
    if (this.name == name) {
      this.name = '';
    }
  },

  /**
   * Event that is called when a global property has been renamed.
   * Overload this in inherited nodes.<br>
   * <b>Note:</b> Do not call 'this._super(..)' for this function, as the parent does not implement it.
   * @function wcNodeStorageGlobal#onGlobalPropertyRenamed
   * @param {String} oldName - The old name of the global property.
   * @param {String} newName - The new name of the global property.
   */
  onGlobalPropertyRenamed: function(oldName, newName) {
    if (this.name == oldName) {
      this.name = newName;
    }
  },
});

wcNodeStorage.extend('wcNodeStorageToggle', 'Toggle', 'Core', {
  /**
   * @class
   * Stores a boolean (toggleable) value.
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeStorageToggle
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("Stores a boolean (toggleable) value.");

    this.createProperty('value', wcPlay.PROPERTY.TOGGLE, false);
  },
});

wcNodeStorage.extend('wcNodeStorageNumber', 'Number', 'Core', {
  /**
   * @class
   * Stores a number value.<br>
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeStorageNumber
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("Stores a number value.");

    this.createProperty('value', wcPlay.PROPERTY.NUMBER);
  },
});

wcNodeStorage.extend('wcNodeStorageString', 'String', 'Core', {
  /**
   * @class
   * Stores a string value.<br>
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeStorageString
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("Stores a string value.");

    this.createProperty('value', wcPlay.PROPERTY.STRING, '', {multiline: true});
  },
});
