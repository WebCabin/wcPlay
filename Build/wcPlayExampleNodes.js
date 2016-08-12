wcPlayNodes.wcNodeProcess.extend('wcNodeProcessExampleViewport', 'Example Viewport', 'Example', {
  /**
   * @class
   * This node demonstrates an example of using the node's viewport for displaying graphics directly on your node. It can also receive mouse events for interactivity.
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeProcessExampleViewport
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

    this.createProperty('lock viewport', wcPlay.PROPERTY.TOGGLE, true, {description: "If true, dragging in the viewport will not move the node.", input: true});
  },

  /**
   * Event that is called when it is time to draw the contents of your custom viewport. It is up to you to stay within the [wcNode.viewportSize]{@link wcNode~viewportSize} you've specified.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessExampleViewport#onViewportDraw
   * @param {external:Canvas~Context} context - The canvas context to draw on, coordinates 0,0 will be the top left corner of your viewport. It is up to you to stay within the [viewport bounds]{@link wcNode#viewportSize} you have assigned.
   * @param {Boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   * @see wcNode#viewportSize
   */
  onViewportDraw: function(context, readOnly) {
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
   * @function wcNodeProcessExampleViewport~onViewportMouseEnter
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @param {Boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   */
  onViewportMouseEnter: function(event, pos, readOnly) {
    this._super(event, pos, readOnly);
    this.hoverPos = pos;
  },

  /**
   * Event that is called when the mouse has left the viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessExampleViewport~onViewportMouseLeave
   * @param {Object} event - The original jquery mouse event.
   * @param {Boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   */
  onViewportMouseLeave: function(event, readOnly) {
    this._super(event, readOnly);
    this.hoverPos = null;
    this.mousePressed = false;
  },

  /**
   * Event that is called when the mouse button is pressed over your viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessExampleViewport~onViewportMouseDown
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @param {Boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   * @returns {Boolean|undefined} - Return true if you want to disable node dragging during mouse down within your viewport.
   */
  onViewportMouseDown: function(event, pos, readOnly) {
    this._super(event, pos, readOnly);
    this.mousePressed = true;
    return this.property('lock viewport');
  },

  /**
   * Event that is called when the mouse button is released over your viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessExampleViewport~onViewportMouseUp
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @param {Boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   */
  onViewportMouseUp: function(event, pos, readOnly) {
    this._super(event, pos, readOnly);
    this.mousePressed = false;
  },

  /**
   * Event that is called when the mouse has moved over your viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessExampleViewport~onViewportMouseMove
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @param {Boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   */
  onViewportMouseMove: function(event, pos, readOnly) {
    this._super(event, pos, readOnly);
    this.hoverPos = pos;
  },

  /**
   * Event that is called when the mouse wheel is used over your viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessExampleViewport~onViewportMouseWheel
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @param {Number} scroll - The scroll amount and direction.
   * @param {Boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   */
  onViewportMouseWheel: function(event, pos, scroll, readOnly) {
    this._super(event, pos, scroll, readOnly);
    return this.property('lock viewport');
  },

  /**
   * Event that is called when the mouse button is pressed and released in the same spot over your viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessExampleViewport~onViewportMouseClick
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @param {Boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   */
  onViewportMouseClick: function(event, pos, readOnly) {
    this._super(event, pos, readOnly);
    this.mouseClicked = !this.mouseClicked;
  },

  /**
   * Event that is called when the mouse button is double clicked in the same spot over your viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessExampleViewport~onViewportMouseClick
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @param {Boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   * @returns {Boolean|undefined} - Return true if you want to disable node auto-collapse when double clicking.
   */
  onViewportMouseDoubleClick: function(event, pos, readOnly) {
    this._super(event, pos, readOnly);
    this.mouseDoubleClicked = !this.mouseDoubleClicked;
    return true;
  },
});

wcPlayNodes.wcNodeProcess.extend('wcNodeProcessExampleProperties', 'Example Properties', 'Example', {
  /**
   * @class
   * This node demonstrates an example of the different property types and how their values can be limited.
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeProcessExampleProperties
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("This node demonstrates an example of the different property types and how their values can be limited.");

    // Get rid of the flow links, as they do not function.
    this.removeEntry('in');
    this.removeExit('out');

    this.createProperty('toggle', wcPlay.PROPERTY.TOGGLE, true, {description: "Demonstration of the toggle property type."});
    this.createProperty('number', wcPlay.PROPERTY.NUMBER, 3, {description: "Demonstration of the number property type with a clamped range of 1-5.", min: 1, max: 5});
    this.createProperty('string', wcPlay.PROPERTY.STRING, 'Text', {description: "Demonstration of the string property with a max character length of 10.", maxlength: 10});
    this.createProperty('suggest string', wcPlay.PROPERTY.STRING, '', {description: "Demonstration of the string property with an item dropdown for suggestions.", items: ['Check', 'out', 'this', 'list', 'of', 'suggestions', 'like', 'a', 'select', 'property', '####', 'but', 'you', 'can', 'still', 'type', 'anything', 'you', 'want!']});
    this.createProperty('select', wcPlay.PROPERTY.SELECT, 3, {description: "Demonstration of the select property with a dynamic number of options based on the 'number' property.", items: this.selectItems});
    this.createProperty('select no none', wcPlay.PROPERTY.SELECT, 'dunno', {description: "Demonstration of a select property that does not allow none as an option.", items: ['Option 1', 'Option 2', 'Option 3'], allowNone: false});
    this.createProperty('read only', wcPlay.PROPERTY.STRING, "Can't edit me!", {description: "Demonstration of a property that is marked as read only.", output: true, readOnly: true})
    this.createProperty('linked prop', wcPlay.PROPERTY.STRING, 'Both values linked!', {description: "Demonstration of a property that has both value and initial values linked.", linked: true, input: true, output: true});
    this.createProperty('refuse link', wcPlay.PROPERTY.STRING, 'refuses numbers', {description: "Demonstration of a link that will not connect to any number property link.", output: true, input: true});
  },

  /**
   * This function is used in the 'select' property to list a dynamic number of items that appear in edit combo box.
   * @function wcNodeProcessExampleProperties#selectItems
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

  /**
   * Event that is called when a property connection is being requested.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessExampleProperties#onRequestConnect
   * @param {String} name - The name of the link being connected to.
   * @param {wcNode.LINK_TYPE} type - The link's type.
   * @param {wcNode} targetNode - The target node being connected to.
   * @param {String} targetName - The link name on the target node being connected to.
   * @param {wcNode.LINK_TYPE} targetType - The target link's type.
   * @returns {Boolean} - Return true if you will allow the connection.
   */
  onRequestConnect: function(name, type, targetNode, targetName, targetType) {
    this._super(name, type, targetNode, targetName, targetType);

    if (name === 'refuse link') {
      if (targetNode.propertyType(targetName) === wcPlay.PROPERTY.NUMBER) {
        return false;
      }
    }

    return true;
  }
});

wcPlayNodes.wcNodeProcess.extend('wcNodeProcessExampleDynamic', 'Example Dynamic', 'Example', {
  /**
   * @class
   * This node demonstrates an example of a number of possible dynamic behaviors.
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeProcessExampleDynamic
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("This node demonstrates an example of using different flow links to determine how the node behaves.");

    // Remove the default 'in' entry link.
    this.removeEntry('in');

    this.createEntry('change color', "Change the color of this node!");

    this._propCount = 0;
    this.createProperty('count', wcPlay.PROPERTY.NUMBER, 0, {min: 0, max: 10, description: "Dynamically create a property for each count.", input: true});
  },

  /**
   * Event that is called when an entry link has been activated.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessExampleDynamic#onActivated
   * @param {String} name - The name of the entry link triggered.
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
   * Event that is called when a property has changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessExampleDynamic#onPropertyChanged
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
          this.createProperty('Prop ' + this._propCount, wcPlay.PROPERTY.STRING, 'val ' + this._propCount, {description: "Dynamically created property!"});
        }
      }
    }
  },
});
