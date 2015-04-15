/* Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 * Modified by Jeff Houde https://play.webcabin.org/
 */
(function(){
  var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
 
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
  };
})();
/**
 * @class wcPlay
 * The main class for wcPlay.
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

  var defaultOptions = {
    silent: false,
    updateRate: 25,
  };

  this._options = {};
  for (var prop in defaultOptions) {
    this._options[prop] = defaultOptions[prop];
  }
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
 * @param {String} name - The name of the node.
 * @param {String} constructor - The constructor name.
 * @param {wcPlay.NODE_TYPE} type - The node's type.
 * @returns {Boolean} - Success or failure.
 */
wcPlay.registerNodeType = function(name, constructor, type) {
  for (var i = 0; i < wcPlay.NODE_LIBRARY.length; ++i) {
    if (wcPlay.NODE_LIBRARY[i].constructor === constructor) {
      return false;
    }
  }

  wcPlay.NODE_LIBRARY.push({
    name: name,
    constructor: constructor,
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
   * @function wcPlay#init
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
Class.extend('wcNode', 'Node', 'Core', {
  /**
   * @class wcNode
   * The foundation class for all nodes.<br>
   * When inheriting, make sure to include 'this._super(parent, pos, name);' at the top of your init functions.
   *
   * @constructor wcNode
   * @description
   * <b>Should be inherited and never constructed directly.</b>
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [name="Node"] - The name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, name) {
    this.name = name || this.name;
    this.color = null;

    this.pos = pos;

    this.chain = {
      entry: [],
      exit: [],
    };
    this.properties = [];

    this._meta = {};
    this._awake = false;
    this._parent = parent;

    // Give the node its default properties.
    this.createProperty(wcNode.PROPERTY.ENABLED, wcPlay.PROPERTY_TYPE.TOGGLE, true);
    this.createProperty(wcNode.PROPERTY.LOG, wcPlay.PROPERTY_TYPE.TOGGLE, false);
    this.createProperty(wcNode.PROPERTY.BREAK, wcPlay.PROPERTY_TYPE.TOGGLE, false);

    this.engine().__addNode(this);
  },

  /**
   * Magic function that is called whenever any new class type is extended from this one.<br>
   * Handles initializing of the class as well as registering the new node type.
   * @function wcNodeStorage#classInit
   * @param {wcNode} this - The new class type.
   * @param {String} className - The name of the class constructor.
   * @param {String} name - A display name for the node.
   * @param {String} category - A category where this node will be grouped.
   */
  classInit: function(className, name, category) {
    this.className = className;
    this.name = name;
    this.category = category;
    wcPlay.registerNodeType(name, className, wcPlay.NODE_TYPE.STORAGE);
  },

  /**
   * Destroys and removes the node.
   * @function wcNode#destroy
   */
  destroy: function() {
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

    // Remove the node from wcPlay
    this.engine().__removeNode(this);
  },

  /**
   * Retrieves the wcPlay engine that owns this node.
   * @function wcNode#engine
   * @returns {wcPlay}
   */
  engine: function() {
    var play = this._parent;
    while (!(play instanceof wcPlay)) {
      play = play._parent;
    }
    return play;
  },

  /**
   * Sets, or Gets this node's enabled state.
   * @function wcNode#enabled
   * @param {Boolean} [enabled] - If supplied, will assign a new enabled state.
   * @returns {Boolean} - The current enabled state.
   */
  enabled: function(enabled) {
    if (enabled !== undefined) {
      this.property(wcNode.PROPERTY.ENABLED, enabled? true: false);
    }

    return this.property(wcNode.PROPERTY.ENABLED);
  },

  /**
   * Sets, or Gets this node's debug log state.
   * @function wcNode#debugLog
   * @param {Boolean} [enabled] - If supplied, will assign a new debug log state.
   * @returns {Boolean} - The current debug log state.
   */
  debugLog: function(enabled) {
    if (enabled !== undefined) {
      this.property(wcNode.PROPERTY.LOG, enabled? true: false);
    }

    return this.engine().isSilent()? false: this.property(wcNode.PROPERTY.LOG);
  },

  /**
   * Sets, or Gets this node's debug pause state.
   * @function wcNode#debugPause
   * @param {Boolean} [enabled] - If supplied, will assign a new debug pause state.
   * @returns {Boolean} - The current debug pause state.
   */
  debugPause: function(enabled) {
    if (enabled !== undefined) {
      this.property(wcNode.PROPERTY.BREAK, enabled? true: false);
    }

    return this.property(wcNode.PROPERTY.BREAK);
  },

  /**
   * Awakens this node. This should be used if your node takes time to fully process before it is done. Use {@link wcNode#sleep} when the processes have been completed.
   * @function wcNode#wake
   * @see wcNode#sleep
   */
  wake: function() {
    // TODO:
  },

  /**
   * Makes the node go back to sleep.
   * @function wcNode#sleep
   * @see wcNode#wake
   */
  sleep: function() {
    // TODO:
  },

  /**
   * Creates a new entry link on the node.
   * @function wcNode#createEntry
   * @param {String} [name="In"] - The name of the entry link.
   * @returns {Boolean} - Fails if the entry link name already exists.
   */
  createEntry: function(name) {
    if (name === undefined) {
      name = 'In';
    }

    for (var i = 0; i < this.chain.entry.length; ++i) {
      if (this.chain.entry[i].name === name) {
        return false;
      }
    }

    this.chain.entry.push({
      name: name,
      active: false,
      links: [],
    });
    return true;
  },

  /**
   * Creates a new exit link on the node.
   * @function wcNode#createExit
   * @param {String} name - The name of the exit link.
   * @returns {Boolean} - Fails if the exit link name already exists.
   */
  createExit: function(name) {
    for (var i = 0; i < this.chain.exit.length; ++i) {
      if (this.chain.exit[i].name === name) {
        return false;
      }
    }

    this.chain.exit.push({
      name: name,
      links: [],
    });
    return true;
  },

  /**
   * Creates a new property.
   * @function wcNode#createProperty
   * @param {String} name - The name of the property.
   * @param {wcPlay.PROPERTY_TYPE} [controlType=wcPlay.PROPERTY_TYPE.STRING] - The type of property.
   * @param {Object} [defaultValue] - A default value for this property.
   * @param {Object} [options] - Additional options for this property, see {@link wcPlay.PROPERTY_TYPE}.
   * @returns {Boolean} - Failes if the property does not exist.
   */
  createProperty: function(name, controlType, defaultValue, options) {
    // Make sure this property doesn't already exist.
    for (var i = 0; i < this.properties.length; ++i) {
      if (this.properties[i].name === name) {
        return false;
      }
    }

    // Make sure the type is valid.
    if (!wcPlay.PROPERTY_TYPE.hasOwnProperty(controlType)) {
      controlType = wcPlay.PROPERTY_TYPE.STRING;
    }

    this.properties.push({
      name: name,
      value: defaultValue,
      defaultValue: defaultValue,
      controlType: controlType,
      inputs: [],
      outputs: [],
      options: options || {},
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
        return this.disconnectEntry(name) === wcNode.CONNECT_RESULT.SUCCESS;
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
        return this.disconnectExit(name) === wcNode.CONNECT_RESULT.SUCCESS;
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
        return this.disconnectInput(name) === this.disconnectOutput(name) === wcNode.CONNECT_RESULT.SUCCESS;
      }
    }
    return false;
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
   * Connects a property input link to a target property output link.
   * @function wcNode#connectInput
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
   * Triggers an entry link and activates this node.
   * @function wcNode#triggerEntry
   * @param {String} name - The name of the entry link to trigger.
   * @returns {Boolean} - Fails if the entry link does not exist.
   */
  triggerEntry: function(name) {
    for (var i = 0; i < this.chain.entry.length; ++i) {
      if (this.chain.entry[i].name == name) {
        // Always queue the trigger so execution is not immediate.
        this.engine().queueNodeEntry(this, this.chain.entry[i].name);
        return true;
      }
    }

    return false;
  },

  /**
   * Triggers an exit link.
   * @function wcNode#triggerExit
   * @param {String} name - The name of the exit link to trigger.
   * @returns {Boolean} - Fails if the exit link does not exist.
   */
  triggerExit: function(name) {
    if (this.debugLog()) {
      console.log('DEBUG: Node "' + this.category + '.' + this.name + '" Triggered Exit link "' + name + '"');
    }

    for (var i = 0; i < this.chain.exit.length; ++i) {
      var exitLink = this.chain.exit[i];
      if (exitLink.name == name) {
        // Activate all entry links chained to this exit.
        for (var a = 0; a < exitLink.links.length; ++a) {
          exitLink.links[a].node && exitLink.links[a].node.triggerEntry(exitLink.links[a].name);
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
   * @param {Boolean} [forceChange] - If value is supplied, set this to true if you want to force the change event to be sent to all chained properties.
   * @returns {Object|undefined} - The value of the property, or undefined if not found.
   */
  property: function(name, value, forceChange) {
    for (var i = 0; i < this.properties.length; ++i) {
      var prop = this.properties[i];
      if (prop.name === name) {
        if (value !== undefined) {
          // Retrieve the current value of the property
          var oldValue = prop.value;

          // Notify about to change event.
          if (forceChange || prop.value !== value) {
            value = this.onPropertyChanging(prop.name, oldValue, value) || value;
          }

          if (forceChange || prop.value !== value) {
            prop.value = value;

            // Notify that the property has changed.
            this.onPropertyChanged(prop.name, oldValue, value);

            // Now follow any output links and assign the new value to them as well.
            var engine = this.engine();
            for (a = 0; a < prop.outputs.length; ++a) {
              engine.queueNodeProperty(prop.outputs[a].node, prop.outputs[a].name, value);
            }
          }
        }

        return prop.value;
      }
    }
  },

  /**
   * Gets, or Sets the default value of a property.
   * @function wcNode#defaultValue
   * @param {String} name - The name of the property.
   * @param {Object} [value] - If supplied, will assign a new default value to the property.
   * @returns {Object|undefined} - The default value of the property, or undefined if not found.
   */
  defaultValue: function(name, value) {
    for (var i = 0; i < this.properties.length; ++i) {
      var prop = this.properties[i];
      if (prop.name === name) {
        prop.defaultValue = value;
      }
    }
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
  },

  /**
   * Event that is called as soon as the Play script has started.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onStart
   */
  onStart: function() {
    if (this.debugLog()) {
      console.log('DEBUG: Node "' + this.category + '.' + this.name + '" started!');
    }
  },

  /**
   * Event that is called when an entry link has been triggered.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onTriggered
   * @param {String} name - The name of the entry link triggered.
   */
  onTriggered: function(name) {
    if (this.debugLog()) {
      console.log('DEBUG: Node "' + this.category + '.' + this.name + '" Triggered Entry link "' + name + '"');
    }
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
    // if (this.debugLog()) {
    //   console.log('DEBUG: Node "' + this.category + '.' + this.name + '" Changing Property "' + name + '" from "' + oldValue + '" to "' + newValue + '"');
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
    if (this.debugLog()) {
      console.log('DEBUG: Node "' + this.category + '.' + this.name + '" Changed Property "' + name + '" from "' + oldValue + '" to "' + newValue + '"');
    }
  },

  /**
   * Event that is called when the property is being asked its value, before the value is actually retrieved.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onPropertyGet
   * @param {String} name - The name of the property.
   */
  onPropertyGet: function(name) {
    // if (this.debugLog()) {
    //   console.log('DEBUG: Node "' + this.category + '.' + this.name + '" Requested Property "' + name + '"');
    // }
  },

  /**
   * Event that is called when the property has had its value retrieved.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onPropertyGot
   * @param {String} name - The name of the property.
   */
  onPropertyGot: function(name) {
    if (this.debugLog()) {
      console.log('DEBUG: Node "' + this.category + '.' + this.name + '" Got Property "' + name + '"');
    }
  },

  /**
   * Event that is called when a global property value has changed.
   * Overload this in inherited nodes.
   * @function wcNode#onGlobalPropertyChanged
   * @param {String} name - The name of the global property.
   * @param {Object} oldValue - The old value of the global property.
   * @param {Object} newValue - The new value of the global property.
   */
  // onGlobalPropertyChanged: function(name, oldValue, newValue) {
  // },

  /**
   * Event that is called when a global property has been renamed.
   * Overload this in inherited nodes.
   * @function wcNode#onGlobalPropertyRenamed
   * @param {String} oldName - The old name of the global property.
   * @param {String} newName - The new name of the global property.
   */
  // onGlobalPropertyRenamed: function(oldName, newName) {
  // },
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
 * Default property type names.
 * @enum {String}
 */
wcNode.PROPERTY = {
  ENABLED: 'enabled',
  LOG: 'debug log',
  BREAK: 'debug break',
  TRIGGER: 'trigger',
};
wcNode.extend('wcNodeEntry', 'Entry Node', 'Core', {
  /**
   * @class wcNodeEntry
   * The base class for all entry nodes. These are nodes that start script chains.<br>
   * When inheriting, make sure to include 'this._super(parent, pos, name);' at the top of your init function.
   *
   * @constructor wcNodeEntry
   * @description
   * <b>Should be inherited and never constructed directly.</b>
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [name="Entry Node"] - The name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, name) {
    this._super(parent, pos, name);

    // Create a default exit link.
    this.createExit('Out');

    // Add a manual trigger control.
    this.createProperty(wcNode.PROPERTY.TRIGGER, wcPlay.PROPERTY_TYPE.TOGGLE, false);
  },

  /**
   * Magic function that is called whenever any new class type is extended from this one.<br>
   * Handles initializing of the class as well as registering the new node type.
   * @function wcNodeEntry#classInit
   * @param {wcNode} this - The new class type.
   * @param {String} className - The name of the class constructor.
   * @param {String} name - A display name for the node.
   * @param {String} category - A category where this node will be grouped.
   */
  classInit: function(className, name, category) {
    this.className = className;
    this.name = name;
    this.category = category;
    wcPlay.registerNodeType(name, className, wcPlay.NODE_TYPE.ENTRY);
  },

  /**
   * Overloading the default onTriggered event handler so we can make it immediately trigger our exit link if our conditions are met.
   * @function wcNodeEntry#onTriggered
   * @see wcNodeEntry#triggerCondition
   * @param {Object} [data] - A custom data object passed in from the triggerer.
   */
  onTriggered: function(data) {
    if (this.triggerCondition(data)) {
      this.triggerExit('Out');
    }
  },

  /**
   * Overload this in inherited nodes if you want to apply a condition when this entry node is triggered.
   * @function wcNodeEntry#triggerCondition
   * @returns {Boolean} - Whether the condition passes and the entry node should trigger (true by default).
   * @param {Object} [data] - A custom data object passed in from the triggerer.
   */
  triggerCondition: function(data) {
    return true;
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
    this._super(name, oldValue, newValue);

    // Manually trigger the event.
    if (name === wcNode.PROPERTY.TRIGGER && newValue) {
      this.triggerExit('Out');

      // Turn the toggle back off so it can be used again.
      this.property(wcNode.PROPERTY.TRIGGER, false);
    }
  },
});


wcNode.extend('wcNodeProcess', 'Node Process', 'Core', {
  /**
   * @class wcNodeProcess
   * The base class for all process nodes. These are nodes that make up the bulk of script chains.<br>
   * When inheriting, make sure to include 'this._super(parent, pos, name);' at the top of your init function.
   *
   * @constructor wcNodeProcess
   * @description
   * <b>Should be inherited and never constructed directly.</b>
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [name="Node Process"] - The name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, name) {
    this._super(parent, pos, name);

    // Create a default links.
    this.createEntry('In');
    this.createExit('Out');
  },

  /**
   * Magic function that is called whenever any new class type is extended from this one.<br>
   * Handles initializing of the class as well as registering the new node type.
   * @function wcNodeProcess#classInit
   * @param {wcNode} this - The new class type.
   * @param {String} className - The name of the class constructor.
   * @param {String} name - A display name for the node.
   * @param {String} category - A category where this node will be grouped.
   */
  classInit: function(className, name, category) {
    this.className = className;
    this.name = name;
    this.category = category;
    wcPlay.registerNodeType(name, className, wcPlay.NODE_TYPE.PROCESS);
  },
});

// wcNodeProcess.prototype.classInit = function(className, name) {
//   this.className = className;
//   this.name = name;
//   wcPlay.registerNodeType(name, className, wcPlay.NODE_TYPE.PROCESS);
// };


wcNode.extend('wcNodeStorage', 'Storage', 'Core', {
  /**
   * @class wcNodeStorage
   * The base class for all storage nodes. These are nodes that interact with script variables and exchange data.<br>
   * When inheriting, make sure to include 'this._super(parent, pos, name);' at the top of your init function.
   *
   * @constructor wcNodeStorage
   * @description
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [name="Storage"] - The name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, name) {
    this._super(parent, pos, name);

    this.createProperty('Value', wcPlay.PROPERTY_TYPE.STRING, '');
  },

  /**
   * Event that is called as soon as the Play script has started.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeStorage#onStart
   */
  onStart: function() {
    this._super();

    // Force a property change event so all connected nodes receive our value.
    this.property('Value', this.property('Value'), true);
  },
});

wcNodeEntry.extend('wcNodeEntryStart', 'Start', 'Core', {
  /**
   * The base class for all entry nodes. These are nodes that start script chains.<br>
   * When inheriting, make sure to include 'this._super(parent, pos, name);' at the top of your init function.
   * @class wcNodeEntryStart
   *
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [name="Start"] - The name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, name) {
    this._super(parent, pos, name);
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
wcNodeProcess.extend('wcNodeProcessDelay', 'Delay', 'Core', {
  /**
   * The base class for all process nodes. These are nodes that make up the bulk of script chains.<br>
   * When inheriting, make sure to include 'this._super(parent, pos, name);' at the top of your init function.
   * @class wcNodeProcessDelay
   *
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [name="Delay"] - The name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, name) {
    this._super(parent, pos, name);

    // Create a finished exit that only triggers after the delay has elapsed.
    this.createExit('Finished');

    // Create the message property so we know what to output in the log.
    this.createProperty('Milliseconds', wcPlay.PROPERTY_TYPE.NUMBER, 1000);
  },

  /**
   * Event that is called when an entry link has been triggered.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onTriggered
   * @param {String} name - The name of the entry link triggered.
   */
  onTriggered: function(name) {
    this._super(name);

    // Always fire the 'Out' link immediately.
    this.triggerExit('Out');

    // Notify that this node is starting a synchronous process.
    this.wake();

    // Now set a timeout to wait for 'Milliseconds' amount of time.    
    var self = this;
    var delay = this.property('Milliseconds');
    setTimeout(function() {
      // Once the time has completed, fire the 'Finished' link and put the node back to sleep.
      self.triggerExit('Finished');
      self.sleep();
    }, delay);
  },
});

wcNodeProcess.extend('wcNodeProcessLog', 'Log', 'Core', {
  /**
   * The base class for all process nodes. These are nodes that make up the bulk of script chains.<br>
   * When inheriting, make sure to include 'this._super(parent, pos, name);' at the top of your init function.
   * @class wcNodeProcessLog
   *
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [name="Log"] - The name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, name) {
    this._super(parent, pos, name);

    // Create the message property so we know what to output in the log.
    this.createProperty('Message', wcPlay.PROPERTY_TYPE.STRING, 'Log message.');
  },

  /**
   * Event that is called when an entry link has been triggered.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onTriggered
   * @param {String} name - The name of the entry link triggered.
   */
  onTriggered: function(name) {
    this._super(name);

    var msg = this.property('Message');
    console.log('LOG: ' + msg);
    this.triggerExit('Out');
  },
});
