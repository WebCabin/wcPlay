wcNodeProcess.extend('wcNodeProcessTutorialViewport', 'Example Viewport', 'Tutorial', {
  /**
   * @class
   * This node demonstrates an example of using the node's viewport for displaying graphics directly on your node. It can also receive mouse events for interactivity.
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeProcessTutorialViewport
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("This node demonstrates an example of using the node's viewport for displaying graphics directly on your node. It can also receive mouse events for interactivity.");

    // Get rid of the flow links, as they do not function.
    this.removeEntry('in');
    this.removeExit('out');

    this.viewportSize(100, 100);
    this.hoverPos = null;
    this.mousePressed = false;
    this.mouseClicked = false;
    this.mouseDoubleClicked = false;

    this.createProperty('lock viewport', wcPlay.PROPERTY_TYPE.TOGGLE, true, {description: "If true, dragging in the viewport will not move the node."});
  },

  /**
   * Event that is called when it is time to draw the contents of your custom viewport. It is up to you to stay within the [wcNode.viewportSize]{@link wcNode~viewportSize} you've specified.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessTutorialViewport#onViewportDraw
   * @param {external:Canvas~Context} context - The canvas context to draw on, coordinates 0,0 will be the top left corner of your viewport. It is up to you to stay within the [viewport bounds]{@link wcNode#viewportSize} you have assigned.
   * @see wcNode#viewportSize
   */
  onViewportDraw: function(context) {
    this._super(context);

    if (this.mouseClicked) {
      context.fillStyle = "green";
      context.fillRect(0, 0, 100, 50);
    }
    if (this.mouseDoubleClicked) {
      context.fillStyle = "darkgreen";
      context.fillRect(0, 50, 100, 50);
    }

    context.strokeStyle = "red";
    context.strokeRect(0, 0, 100, 100);
    context.beginPath();
    context.moveTo(0,0);
    context.lineTo(100, 100);
    context.stroke();
    context.beginPath();
    context.moveTo(100,0);
    context.lineTo(0, 100);
    context.stroke();

    if (this.hoverPos) {
      context.fillStyle = this.mousePressed? "red": "blue";
      context.fillRect(this.hoverPos.x - 5, this.hoverPos.y - 5, 10, 10);
    }
  },

  /**
   * Event that is called when the mouse has entered the viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessTutorialViewport~onViewportMouseEnter
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   */
  onViewportMouseEnter: function(event, pos) {
    this._super(event, pos);
    this.hoverPos = pos;
  },

  /**
   * Event that is called when the mouse has left the viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessTutorialViewport~onViewportMouseLeave
   * @param {Object} event - The original jquery mouse event.
   */
  onViewportMouseLeave: function(event) {
    this._super(event);
    this.hoverPos = null;
    this.mousePressed = false;
  },

  /**
   * Event that is called when the mouse button is pressed over your viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessTutorialViewport~onViewportMouseDown
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @returns {Boolean|undefined} - Return true if you want to disable node dragging during mouse down within your viewport.
   */
  onViewportMouseDown: function(event, pos) {
    this._super(event, pos);
    this.mousePressed = true;
    return this.property('lock viewport');
  },

  /**
   * Event that is called when the mouse button is released over your viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessTutorialViewport~onViewportMouseUp
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   */
  onViewportMouseUp: function(event, pos) {
    this._super(event, pos);
    this.mousePressed = false;
  },

  /**
   * Event that is called when the mouse has moved over your viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessTutorialViewport~onViewportMouseMove
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   */
  onViewportMouseMove: function(event, pos) {
    this._super(event, pos);
    this.hoverPos = pos;
  },

  /**
   * Event that is called when the mouse wheel is used over your viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessTutorialViewport~onViewportMouseWheel
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @param {Number} scroll - The scroll amount and direction.
   */
  onViewportMouseWheel: function(event, pos, scroll) {
    this._super(event, pos, scroll);
    return this.property('lock viewport');
  },

  /**
   * Event that is called when the mouse button is pressed and released in the same spot over your viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessTutorialViewport~onViewportMouseClick
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   */
  onViewportMouseClick: function(event, pos) {
    this._super(event, pos);
    this.mouseClicked = !this.mouseClicked;
  },

  /**
   * Event that is called when the mouse button is double clicked in the same spot over your viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessTutorialViewport~onViewportMouseClick
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @returns {Boolean|undefined} - Return true if you want to disable node auto-collapse when double clicking.
   */
  onViewportMouseDoubleClick: function(event, pos) {
    this._super(event, pos);
    this.mouseDoubleClicked = !this.mouseDoubleClicked;
    return true;
  },
});

wcNodeProcess.extend('wcNodeProcessTutorialProperties', 'Example Properties', 'Tutorial', {
  /**
   * @class
   * This node demonstrates an example of the different property types and how their values can be limited.
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeProcessTutorialProperties
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("This node demonstrates an example of the different property types and how their values can be limited.");

    // Get rid of the flow links, as they do not function.
    this.removeEntry('in');
    this.removeExit('out');

    this.createProperty('toggle', wcPlay.PROPERTY_TYPE.TOGGLE, true, {description: "Demonstration of the toggle property type."});
    this.createProperty('number', wcPlay.PROPERTY_TYPE.NUMBER, 3, {description: "Demonstration of the number property type with a clamped range of 1-5.", min: 1, max: 5});
    this.createProperty('string', wcPlay.PROPERTY_TYPE.STRING, 'Text', {description: "Demonstration of the string property with a max character length of 10.", maxlength: 10});
    this.createProperty('select', wcPlay.PROPERTY_TYPE.SELECT, 3, {description: "Demonstration of the select property with a dynamic number of options based on the 'number' property.", items: this.selectItems});
  },

  /**
   * This function is used in the 'select' property to list a dynamic number of items that appear in edit combo box.
   * @function wcNodeProcessTutorialProperties#selectItems
   * @returns {wcNode~SelectItem[]} - A list of items to populate in the combo box.
   */
  selectItems: function() {
    var result = [];

    var count = parseInt(this.property('number'));
    for (var i = 0; i < count; ++i) {
      result.push({
        name: 'Option ' + (i+1),
        value: i+1,
      });
    }

    return result;
  },
});

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
