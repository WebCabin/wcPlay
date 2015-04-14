/**
 * The base class for all nodes, contains the core functionality of a node.
 * @class wcPlayNode
 */
window.wcPlayNode = Class.extend({
  /**
   * @constructor
   *
   * @param {String} name - The name of the node, as displayed on the title bar.
   */
  init: function(name) {
    this.name = name;
    this.chain = {
      entry: [],
      exit: [],
      input: [],
      output: [],
    };
    this._prop = {};
  },

  /**
   * Creates a new property.
   * @param {String} name - The name of the property.
   * @param {wcPlay.PROP_TYPE} [type=wcPlay.PROP_TYPE.STRING] - The type of property.
   * @param {Object} [defaultValue=0] - A default value for this property.
   * @param {Object} [options=NULL] - Additional options for this property, depends on the type.
   * @returns {Boolean} - Success or failure.
   */
  createProp: function(name, type, defaultValue, options) {
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
      options: options
    };
    return true;
  },

  /**
   * Gets, or Sets the value of a property.
   * @param {String} name - The name of the property.
   * @param {Any} [value] - If supplied, will assign a new value to the property.
   */
  prop: function(name, value) {

  },

  trigger: function(inputName) {

  },
});

