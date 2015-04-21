wcNodeProcess.extend('wcNodeProcessTutorialViewport', 'Example Viewport', 'Tutorial', {
  /**
   * @class
   * This node demonstrates an example of using the custom viewport to display custom graphics into the node, as well as handling mouse events within that viewport.
   * When inheriting, make sure to include 'this._super(parent, pos, type);' at the top of your init function.
   *
   * @constructor wcNodeProcessTutorialViewport
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [type="Toggle"] - The type name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, type) {
    this._super(parent, pos, type);

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
});
