wcNodeProcess.extend('wcNodeProcessTutorialDynamic', 'Example Dynamic', 'Tutorial', {
  /**
   * @class
   * This node demonstrates an example of a number of possible dynamic behaviors.
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeProcessTutorialDynamic
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("This node demonstrates an example of using different flow links to determine how this node behaves.");

    // Remove the default 'in' entry link.
    this.removeEntry('in');

    this.createEntry('change color', "Change the color of this node!");

    this._propCount = 0;
    this.createProperty('count', wcPlay.PROPERTY_TYPE.NUMBER, 0, {min: 0, max: 10, description: "Dynamically create a property for each count."});
  },

  /**
   * Event that is called when an entry link has been triggered.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessTutorialDynamic#onTriggered
   * @param {String} name - The name of the entry link triggered.
   */
  onTriggered: function(name) {
    this._super(name);

    switch (name) {
      case 'change color':
        if (this.color == '#007ACC') {
          this.color = '#00CC7A';
        } else {
          this.color = '#007ACC';
        }
        break;
    }

    this.triggerExit('out');
  },

  /**
   * Event that is called when a property has changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessTutorialDynamic#onPropertyChanged
   * @param {String} name - The name of the property.
   * @param {Object} oldValue - The old value of the property.
   * @param {Object} newValue - The new value of the property.
   */
  onPropertyChanged: function(name, oldValue, newValue) {
    this._super(name, oldValue, newValue);

    if (name === 'count') {
      var count = parseInt(newValue);

      if (count < this._propCount) {
        while (this._propCount > count) {
          this.removeProperty('Prop ' + this._propCount);
          this._propCount--;
        }
      } else if (count > this._propCount) {
        while (this._propCount < count) {
          this._propCount++;
          this.createProperty('Prop ' + this._propCount, wcPlay.PROPERTY_TYPE.STRING, 'val ' + this._propCount, {description: "Dynamically created property!"});
        }
      }
    }
  },
});
