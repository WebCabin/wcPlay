wcPlayNodes.wcNodeProcess.extend('wcNodeProcessExampleDynamic', 'Example Dynamic', 'Example', {
  /**
   * This node demonstrates an example of a number of possible dynamic behaviors.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * @class wcNodeProcessExampleDynamic
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description('This node demonstrates an example of using different flow links to determine how the node behaves.');

    // Remove the default 'in' entry link.
    this.removeEntry('in');

    this.createEntry('change color', 'Change the color of this node!');

    this._propCount = 0;
    this.createProperty('count', wcPlay.PROPERTY.NUMBER, 0, {min: 0, max: 10, description: 'Dynamically create a property for each count.', input: true});
  },

  /**
   * Event that is called when an entry link has been activated.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessExampleDynamic#onActivated
   * @param {string} name - The name of the entry link triggered.
   */
  onActivated: function(name) {
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

    this.activateExit('out');
  },

  /**
   * Event that is called when a property has changed.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessExampleDynamic#onPropertyChanged
   * @param {string} name - The name of the property.
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
          this.createProperty('Prop ' + this._propCount, wcPlay.PROPERTY.STRING, 'val ' + this._propCount, {description: 'Dynamically created property!'});
        }
      }
    }
  }
});
