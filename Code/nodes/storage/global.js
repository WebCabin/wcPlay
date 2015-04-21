wcNodeStorage.extend('wcNodeStorageGlobal', 'Global Property', 'Core', {
  /**
   * @class
   * References a global property on the script.
   * When inheriting, make sure to include 'this._super(parent, pos, type);' at the top of your init function.
   *
   * @constructor wcNodeStorageGlobal
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [type="Toggle"] - The type name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, type) {
    this._super(parent, pos, type);

    this.createProperty('property', wcPlay.PROPERTY_TYPE.SELECT, '', {items: this.propertyList});
    this.createProperty('value', wcPlay.PROPERTY_TYPE.STRING, '');
  },

  /**
   * Callback to retrieve a list of properties to display in the combo box.
   * @function wcNodeStorageGlobal#propertyList
   * @returns {String[]} - A list of property names.
   */
  propertyList: function() {
    var result = [];
    var engine = this.engine();
    if (engine) {
      var props = engine.listProperties();
      for (var i = 0; i < props.length; ++i) {
        result.push(props[i].name);
      }
    }

    return result;
  },
});
