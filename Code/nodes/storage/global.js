wcNodeStorage.extend('wcNodeStorageGlobal', 'Global Property', 'Core', {
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

    this.description("References a global property on the script.");

    this.createProperty('property', wcPlay.PROPERTY_TYPE.SELECT, '', {items: this.propertyList, description: "The global script property to reference."});
    this.createProperty('value', wcPlay.PROPERTY_TYPE.STRING, '', {description: "The current value of the global property chosen above."});
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

  /**
   * Any changes to the 'value' property will also change the global property.<br>
   * Event that is called when a property has changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onPropertyChanged
   * @param {String} name - The name of the property.
   * @param {Object} oldValue - The old value of the property.
   * @param {Object} newValue - The new value of the property.
   */
  onPropertyChanged: function(name, oldValue, newValue) {
    this._super(name, oldValue, newValue);

    if (name === 'value') {
      var propVal = this.property('property');
      if (propVal) {
        var engine = this.engine();
        engine && engine.property(propVal, newValue);
      }
    } else if (name === 'property') {
      if (newValue) {
        this.property('value', this.property('value'));
      } else {
        this.property('value', '');
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
      var propVal = this.property('property');
      if (propVal) {
        var engine = this.engine();
        return (engine && engine.property(propVal)) || 0;
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
      var propVal = this.property('property');
      if (propVal) {
        var engine = this.engine();
        engine && engine.initialProperty(propVal, newValue);
      }
    } else if (name === 'property') {
      var engine = this.engine();
      engine && this.property('value', engine.property(newValue));
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
      var propVal = this.property('property');
      if (propVal) {
        var engine = this.engine();
        return (engine && engine.initialProperty(propVal)) || 0;
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
    if (this.property('property') == name) {
      this.property('value', this.property('value'), true);
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
    if (this.property('property') == name) {
      this.property('property', '');
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
    if (this.property('property') == oldName) {
      this.property('property', newName);
    }
  },
});
