Class.extend('wcNode', 'Node', '', {
  /**
   * @class
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
    this.color = '#FFFFFF';

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
      awake: false,
      color: null,
      paused: false,
    };
    this._collapsed = false;
    this._awake = false;
    this._log = false;
    this._break = false;
    this._parent = parent;

    // Give the node its default properties.
    this.createProperty(wcNode.PROPERTY.ENABLED, wcPlay.PROPERTY_TYPE.TOGGLE, true);

    var engine = this.engine();
    engine && engine.__addNode(this);
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
    if (category) {
      this.className = className;
      this.name = name;
      this.category = category;
      wcPlay.registerNodeType(className, name, category, wcPlay.NODE_TYPE.STORAGE);
    }
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
    var engine = this.engine();
    engine && engine.__removeNode(this);
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
      this._log = enabled? true: false;
    }

    var engine = this.engine();
    return (!engine || engine.isSilent())? false: this._log;
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
    return engine.debugging() && this._break;
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
   * Awakens this node. This should be used if your node takes time to fully process before it is done. Use {@link wcNode#sleep} when the processes have been completed.
   * @function wcNode#wake
   * @see wcNode#sleep
   */
  wake: function() {
    this._meta.awake = true;
  },

  /**
   * Makes the node go back to sleep.
   * @function wcNode#sleep
   * @see wcNode#wake
   */
  sleep: function() {
    this._meta.awake = false;
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
   * @param {String} [name="In"] - The name of the entry link.
   * @returns {Boolean} - Fails if the entry link name already exists.
   */
  createEntry: function(name) {
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
      },
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
      meta: {
        flash: false,
        flashDelta: 0,
        color: "#000000",
      },
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
        if (this.disconnectInput(name) === this.disconnectOutput(name) === wcNode.CONNECT_RESULT.SUCCESS) {
          this.properties.splice(i, 1);
          return true;
        }
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
        this.chain.exit[i].meta.flash = true;
        // Activate all entry links chained to this exit.
        var engine = this.engine();

        for (var a = 0; a < exitLink.links.length; ++a) {
          if (exitLink.links[a].node) {
            exitLink.links[a].node.triggerEntry(exitLink.links[a].name);
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

          var engine = this.engine();
          prop.outputMeta.flash = true;
          if (this.debugBreak() || (engine && engine.stepping())) {
            prop.outputMeta.paused = true;
          }

          // Notify about to change event.
          if (forceChange || prop.value !== value) {
            value = this.onPropertyChanging(prop.name, oldValue, value) || value;
          }

          if (forceChange || prop.value !== value) {
            prop.value = value;

            // Notify that the property has changed.
            this.onPropertyChanged(prop.name, oldValue, value);

            // Now follow any output links and assign the new value to them as well.
            for (a = 0; a < prop.outputs.length; ++a) {
              prop.outputs[a].node && prop.outputs[a].node.triggerProperty(prop.outputs[a].name, value);
            }
          }
        }

        return prop.value;
      }
    }
  },

  /**
   * Triggers a property that is about to be changed by the output of another property.
   * @function wcNode#triggerProperty
   * @param {String} name - The name of the property.
   * @param {Object} value - The new value of the property.
   */
  triggerProperty: function(name, value) {
    var engine = this.engine();
    if (engine) {
      engine.queueNodeProperty(this, name, value);
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
};