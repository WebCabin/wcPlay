wcNodeProcess.extend('wcNodeProcessExampleViewport', 'Example Viewport', 'Example', {
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

    this.createProperty('lock viewport', wcPlay.PROPERTY.TOGGLE, true, {description: "If true, dragging in the viewport will not move the node."});
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
