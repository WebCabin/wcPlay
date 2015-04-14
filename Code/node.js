/**
 * The base class for all nodes, contains the core functionality of a node.
 * @class wcNode
 */
window.wcNode = Class.extend({
  /**
   * @constructor
   *
   * @param {String} parent - The parent object of this node.
   * @param {String} name - The name of the node, as displayed on the title bar.
   * @param {String} [category="default"] - An optional category to organize the node.
   */
  init: function(parent, name, category) {
    this.name = name;
    this._parent = parent;
    this._type = typeof this;
    this._category = category || "default";

    this._active = false;

    this.chain = {
      entry: [],
      exit: [],
    };
    this._prop = {};
  },

  /**
   * Retrieves the wcPlay instance that owns this node.
   * @returns {wcPlay} - The wcPlay instance.
   */
  wcPlay: function() {
    var play = this._parent;
    while (!(play instanceof wcPlay)) {
      play = play._parent;
    }
    return play;
  },

  /**
   * Creates a new property.
   * @param {String} name - The name of the property.
   * @param {wcPlay.PROP_TYPE} [type=wcPlay.PROP_TYPE.STRING] - The type of property.
   * @param {Object} [defaultValue=0] - A default value for this property.
   * @param {Object} [options=null] - Additional options for this property, depends on the type.
   * @returns {Boolean} - Success or failure.
   */
  createValue: function(name, type, defaultValue, options) {
    // Make sure this property doesn't already exist.
    if (this._prop.hasOwnProperty(name)) {
      return false;
    }

    // Make sure the type is valid.
    if (!wcPlay.PROP_TYPE.hasOwnProperty(type)) {
      type = wcPlay.PROP_TYPE.STRING;
    }

    this._prop[name] = {
      type: type,
      value: defaultValue,
      defaultValue: defaultValue,
      input: [],
      output: [],
      options: options || null,
    };
    return true;
  },

  /**
   * Gets, or Sets the value of a property.
   * @param {String} name - The name of the property.
   * @param {Any} [value] - If supplied, will assign a new value to the property.
   * @returns {Any|null} - The value of the property, or null if not found.
   */
  value: function(name, value) {
    if (this._prop.hasOwnProperty(name)) {
      if (value !== undefined) {
        this._prop[name].value = value;
      }
      return this._prop[name].value;
    }
    return null;
  },

  /**
   * Gets, or Sets the default value of a property.
   * @param {String} name - The name of the property.
   * @param {Any} [value] - If supplied, will assign a new value to the property.
   * @returns {Any|null} - The value of the property, or null if not found.
   */
  defaultValue: function(name, value) {
    if (this._prop.hasOwnProperty(name)) {
      if (value !== undefined) {
        this._prop[name].defaultValue = value;
      }
      return this._prop[name].defaultValue;
    }
    return null;
  },


  /**
   * Triggers an exit point to activate the next nodes that are chained.
   * @param {String} name - The name of the exit link to trigger.
   * @param {Boolean} [fin] - If true, the node will no longer be active after this call.
   * @returns {Boolean} - Fails if the exit link does not exist.
   */
  trigger: function(name, fin) {
    for (var i = 0; i < this.chain.exit.length; ++i) {
      if (this.chain.exit[i].name == name) {
        this.chain.exit[i].active = true;
        this._active = !fin;
        return true;
      }
    }

    return false;
  },

  /**
   * Triggers a chain entry point to activate this node.
   * @private
   * @param {String} name - The name of the entry link to trigger.
   * @returns {Boolean} - Fails if the entry link does not exist.
   */
  __entry: function(name) {
    for (var i = 0; i < this.chain.entry.length; ++i) {
      if (this.chain.entry[i].name == name) {
        this.chain.entry[i].active = true;
        this._active = true;
        return true;
      }
    }

    return false;
  },
});

