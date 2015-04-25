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
          console.log('ERROR: Attempted to load node "' + data.nodes[i].category + '.' + data.nodes[i].type + '", but the constructor could not be found!');
        }
      }
      for (var i = 0; i < this.compiledNodes.length; ++i) {
        var data = this.compiledNodes[i];
        newNodes[i].import(data, idMap);
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
    this.properties = [oldProperties[0], oldProperties[1]];
    oldProperties.splice(0, 2);
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
          node.triggerExit('out');
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
