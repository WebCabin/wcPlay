wcNodeComposite.extend('wcNodeCompositeProperty', 'Composite Property', 'Link', {
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

    if (!(parent instanceof wcNodeComposite)) {
      console.log('ERROR: Attempted to use the Composite Property node while not inside a Composite Node!');
      this._invalid = true;
    }

    this.description("References a property from its parent Composite Node.");

    this._parent && this._parent.createProperty(linkName, wcPlay.PROPERTY_TYPE.STRING, '');

    this.createProperty('property', wcPlay.PROPERTY_TYPE.STRING, linkName);
    this.createProperty('value', wcPlay.PROPERTY_TYPE.STRING, '');
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
      return 'error';
    }

    if (name === 'value') {
      var propName = this.property('property');
      if (propName) {
        this._parent && this._parent.property(propName, newValue);
      }
    } else if (name === 'property') {
      if (newValue) {
        // Attempt to create a new property, if it does not exist, then synchronize our local property.
        this._parent && this._parent.createProperty(newValue, wcPlay.PROPERTY_TYPE.STRING, '');
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
   * @function wcNodeCompositeProperty#onPropertyGet
   * @param {String} name - The name of the property.
   * @returns {Object|undefined} - If a value is returned, that value is what will be retrieved from the get.
   */
  onPropertyGet: function(name) {
    this._super(name);

    if (this._invalid) {
      return 'error';
    }

    if (name === 'value') {
      var propName = this.property('property');
      if (propName) {
        return (this._parent && this._parent.property(propName)) || 0;
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
      return 'error';
    }

    if (name === 'value') {
      var propName = this.property('property');
      if (propName) {
        this._parent && this._parent.initialProperty(propName, newValue);
      }
    } else if (name === 'property') {
      this._parent && this.property('value', this._parent.property(newValue));
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

    if (name === 'value') {
      var propName = this.property('property');
      if (propName) {
        return (this._parent && this._parent.initialProperty(propName)) || 0;
      }
    }
  },
});