/**
 * The main class for wcPlay.
 * @class wcPlay
 */
function wcPlay() {
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
};

/**
 * Determines how a property's control should be rendered within the editor view.
 * @enum {String}
 */
wcPlay.PROPERTY_TYPE = {
  /** Displays the property with no edit control. No options are used. */
  NONE: 'none',
  /** Displays the property as a checkbox. No options are used. */
  TOGGLE: 'toggle',
  /** Displays the property as a number control. [Number options]{@link wcNode~NumberOptions} are used. */
  NUMBER: 'number',
  /** Displays the property as a text field. No options are used. */
  STRING: 'string',
  /** Displays the property as a combo box control. [Select options]{@link wcNode~SelectOptions} are used. */
  SELECT: 'select',
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
 * A global function that registers a new node type into the library.
 * @param {String} name - The name of the node.
 * @param {String} constructor - The constructor name.
 * @param {}
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
   * Initializes the script and begins the update process.
   * @function wcPlay#init
   */
  start: function() {
    var self = this;
    this._updateID = setInterval(function() {
      self.update();
    }, 25);

    for (var i = 0; i < this._storageNodes.length; ++i) {
      this._storageNodes[i].onStart();
    }
    for (var i = 0; i < this._processNodes.length; ++i) {
      this._processNodes[i].onStart();
    }
    for (var i = 0; i < this._compositeNodes.length; ++i) {
      this._compositeNodes[i].onStart();
    }
    for (var i = 0; i < this._entryNodes.length; ++i) {
      this._entryNodes[i].onStart();
    }
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
   * Queues a node entry link to trigger on the next update.
   * @function wcPlay#__queueNodeEntry
   * @private
   * @param {wcNode} node - The node being queued.
   * @param {String} name - The entry link name.
   */
  __queueNodeEntry: function(node, name) {
    if (node.enabled()) {
      this._queuedChain.push({
        node: node,
        name: name,
      });
    }
  },

  /**
   * Queues a node property value change to trigger on the next update.
   * @function wcPlay#__queueNodeProperty
   * @private
   * @param {wcNode} node - The node being queued.
   * @param {String} name - The property name.
   * @param {Object} value - The property value.
   */
  __queueNodeProperty: function(node, name, value) {
    if (node.enabled()) {
      this._queuedProperties.push({
        node: node,
        name: name,
        value: value,
      });
    }
  },
};