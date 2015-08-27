// Create a global clipboard that can be shared between all instances of the editor tool.
window.wcPlayEditorClipboard = {
  bounds: {
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  },
  nodes: []
};

/**
 * @class
 * Provides a visual interface for editing a Play script. Requires HTML5 canvas.
 *
 * @constructor
 * @param {external:jQuery~Object|external:jQuery~Selector|external:domNode} container - The container element.
 * @param {wcPlayEditor~Options} [options] - Custom options.
 */
function wcPlayEditor(container, options) {
  this.$container = $(container);
  this.$typeButton = [];
  this.$typeArea = [];
  this._paletteSize = 300;
  this._chainStyle = 1;
  this._chainStyleMax = 1;

  this._menu = null;

  this._size = {x: 0, y: 0};

  this._engine = null;
  this._parent = null;
  this._nodeLibrary = {};

  // this._nodeDrawCount = 0;
  // this._chainDrawCount = 0;

  this._font = {
    breadcrumbs: {size: 10, family: 'Arial', weight: 'bold'},
    title: {size: 13, family: 'Arial', weight: 'bold'},
    titleDesc: {size: 10, family: 'Arial', weight: 'italic'},
    details: {size: 9, family: 'Arial', weight: 'bold'},
    links: {size: 9, family: 'Arial'},
    property: {size: 9, family: 'Arial', weight: 'italic'},
    value: {size: 9, family: 'Arial', weight: 'bold'},
    initialValue: {size: 9, family: 'Arial', weight: 'bold italic'},
  };

  this._drawStyle = {
    palette: {
      spacing: 10,          // Spacing between nodes in the palette view.
    },
    node: {
      radius: 7,            // The radius to draw node corners.
      margin: 14,           // The pixel space between the property text and the edge of the node border.
    },
    title: {
      spacing: 5,           // The pixel space between the title text and the bar that separates the properties.
      wrapL: '  ',          // The left string to wrap around the title text.
      wrapR: '  ',          // The right string to wrap around the title text.
      placeholder: '  ',    // A placeholder label if there is no title name.
      nameWrapL: ' (',      // The left string to wrap around the name portion of the title text.
      nameWrapR: ') ',      // The right string to wrap around the name portion of the title text.
      details: ' [?] ',     // The text to display for the detail popup button for the node.
    },
    links: {
      length: 10,           // Length of each link 'nub'
      width: 7,             // Width of each link 'nub'
      spacing: 7,           // The pixel space between the text of adjacent links.
      padding: 5,           // The pixel space between the link and its text.
      margin: 7,           // The pixel space between the link text and the edge of the node border.
    },
    property: {
      spacing: 5,           // The pixel space between adjacent properties.
      strLen: 20,           // The maximum character length a property value can display.
      minLength: 30,        // The minimum length the property value can be.
      valueWrapL: ' [',      // The left string to wrap around a property value.
      valueWrapR: '] ',      // The right string to wrap around a property value.
      initialWrapL: ' ',   // The left string to wrap around a property initial value.
      initialWrapR: ' ',   // The right string to wrap around a property initial value.
      highlightColor: 'rgba(255, 255, 255, 0.5)',
      normalColor:    'rgba(255, 255, 255, 0.5)',
      highlightBorder: -1,
      normalBorder: 1,
    },
  };

  // Update properties.
  this._lastUpdate = 0;

  // Control properties.
  this._viewportCamera = {x: 0, y: 0, z: 1};
  this._viewportBounds = {left: 0, top: 0, width: 0, height: 0};
  this._viewportMovingNode = false;
  this._viewportMoving = false;
  this._viewportMoved = false;
  this._paletteMoving = false;
  this._autoScrollDirection = {x: 0, y: 0};
  this._autoScrollInterval = 0;
  this._autoScrollNodes = false;

  this._mouse = {x: 0, y: 0};
  this._mouseInViewport = false;
  this._highlightRect = null;
  this._highlightNode = null;
  this._selectedNode = null;
  this._selectedNodes = [];

  this._highlightTitle = false;
  this._highlightDetails = false;
  this._highlightDebugLog = false;
  this._highlightBreakpoint = false;
  this._highlightEntryLink = false;
  this._highlightExitLink = false;
  this._highlightInputLink = false;
  this._highlightOutputLink = false;
  this._highlightPropertyValue = false;
  this._highlightPropertyInitialValue = false;
  this._highlightViewport = false;

  this._selectedEntryLink = false;
  this._selectedExitLink = false;
  this._selectedInputLink = false;
  this._selectedOutputLink = false;
  this._selectedNodeOrigins = [];

  this._draggingNodeData = null;

  this._highlightCrumb = -1;
  this._crumbBounds = [];

  // Undo management is optional.
  this._undoManager = null;

  // Setup our options.
  this._options = {
    readOnly: false,
    playable: true,
    category: {
      items: [],
      isBlacklist: true,
    },
  };
  for (var prop in options) {
    this._options[prop] = options[prop];
  }

  this.$top = $('<div class="wcPlayEditorTop" tabindex="1">');
  this.$main = $('<div class="wcPlayEditorMain" tabindex="1">');
  this.$palette = $('<div class="wcPlayPalette wcPlayNoHighlights" tabindex="1">');
  this.$paletteScroller = $('<div class="wcPlayPaletteScroller" tabindex="1">');
  this.$paletteInner = $('<div class="wcPlayPaletteInner" tabindex="1">');
  this.$viewport = $('<canvas class="wcPlayViewport" tabindex="1">');
  this._viewportContext = this.$viewport[0].getContext('2d');

  this.$palette.append(this.$paletteScroller);
  this.$paletteScroller.append(this.$paletteInner);

  this.$main.append(this.$palette);
  this.$main.append(this.$viewport);
  this.$container.append(this.$top);
  this.$container.append(this.$main);

  this.$search = $('<div class="wcPlayEditorSearch wcPlayHidden"><span>Search</span><input type="text"/><i class="fa fa-chevron-up wcPlayEditorSearchPrev"/><i class="fa fa-chevron-down wcPlayEditorSearchNext"/></div>');
  this.$hiddenFileLoader = $('<input type="file" id="wcPlayEditorHiddenFileLoader"/>');
  this.$hiddenFileImporter = $('<input type="file" id="wcPlayEditorHiddenFileImporter"/>');

  this.$container.append(this.$search);

  this.onResized();

  this.__setupMenu();
  this.__setupControls();
  this.$top.focus();

  window.requestAnimationFrame(this.__update.bind(this));
}

wcPlayEditor.prototype = {
  /**
   * Gets, or Sets the {@link wcPlay} engine that this renderer will render.
   * @function wcPlayEditor#engine
   * @param {wcPlay} [engine] - If supplied, will assign a new {@link wcPlay} engine to render.
   * @returns {wcPlay} - The current {@link wcPlay} engine.
   */
  engine: function(engine) {
    if (engine !== undefined && engine !== this._engine) {
      if (this._engine) {
        var index = this._engine._editors.indexOf(this);
        if (index > -1) {
          this._engine._editors.splice(index, 1);
        }
        this._engine._undoManager = this._undoManager;
        this._undoManager = null;
      }

      this._engine = engine;
      this._parent = engine;
      this.__setupPalette();
      this.center();

      if (this._engine) {
        this._engine._editors.push(this);
        this._undoManager = this._engine._undoManager;
        if (!this._undoManager && window.wcUndoManager) {
          this._undoManager = new wcUndoManager();
          this._engine._undoManager = this._undoManager;
        }
      }
    }

    return this._engine;
  },

  /**
   * Retrieves the menu instance.
   * @function wcPlayEditor#menu
   * @returns {wcMenu}
   */
  menu: function() {
    return this._menu;
  },

  /**
   * Positions the canvas view to the center of all nodes.
   * @function wcPlayEditor#center
   */
  center: function() {
    if (this._parent) {
      this.focus(this._parent._entryNodes.concat(this._parent._processNodes, this._parent._storageNodes, this._parent._compositeNodes));
    }
  },

  /**
   * Scrolls the canvas view until a given set of nodes are within view.
   * @function wcPlayEditor#focus
   * @param {wcNode} nodes - A list of nodes to focus the view on.
   */
  focus: function(nodes) {
    if (nodes.length) {
      this.__updateNodes(nodes, 0, this._viewportContext);
      this.__drawNodes(nodes, this._viewportContext);
      var boundList = [];
      var offsetList = [];
      for (var i = 0; i < nodes.length; ++i) {
        boundList.push(nodes[i]._meta.bounds.farRect);
        offsetList.push(nodes[i].pos);
      }
      var focusRect = this.__expandRect(boundList, offsetList);
      // Clamp the focus rect to a minimum size, so we can not zoom in too far.
      if (focusRect.width < 1000) {
        focusRect.left -= (1000 - focusRect.width)/2;
        focusRect.width = 1000;
      }
      this.focusRect(focusRect);
    }
  },

  /**
   * Scrolls the canvas view and centers on a given bounding rectangle.
   * @function wcPlayEditor#focusRect
   * @param {wcPlayEditor~Rect} rect - The rectangle to focus on.
   */
  focusRect: function(rect) {
    var scaleX = this.$viewport.width()? (this.$viewport.width() / (rect.width + 100)): 1;
    var scaleY = this.$viewport.height()? (this.$viewport.height() / (rect.height + 100)): 1;
    this._viewportCamera.z = Math.min(scaleX, scaleY);
    if (scaleX > scaleY) {
      rect.left -= ((this.$viewport.width() / scaleY - (rect.width + 100))) / 2;
    } else {
      rect.top -= ((this.$viewport.height() / scaleX - (rect.height + 100))) / 2;
    }
    this._viewportCamera.x = -(rect.left - 50) * this._viewportCamera.z;
    this._viewportCamera.y = -(rect.top - 50) * this._viewportCamera.z;
  },

  /**
   * Event that is called to begin an undo manager group operation.
   * @function wcPlayEditor#onBeginUndoGroup
   * @param {String} description - The description of the undo event.
   */
  onBeginUndoGroup: function(description) {
    this._undoManager && this._undoManager.beginGroup(description);
  },

  /**
   * Event that is called to end an undo manager group operation.
   * @function wcPlayEditor#onEndUndoGroup
   */
  onEndUndoGroup: function() {
    this._undoManager && this._undoManager.endGroup();
  },

  /**
   * Event that is called when the container view is resized.
   * @function wcPlayEditor#onResized
   */
  onResized: function() {
    var width = this.$main.width();
    var height= this.$main.height();

    if (this._size.x !== width || this._size.y !== height || this._size.z !== this._paletteSize) {
      this._size.x = width;
      this._size.y = height;
      this._size.z = this._paletteSize;

      this.$palette.css('width', this._size.z).attr('width', this._size.z).attr('height', height);
      this.$viewport.css('width', width - this._size.z).attr('width', width - this._size.z).attr('height', height);
    }

    this._viewportBounds.top    = -this._viewportCamera.y / this._viewportCamera.z;
    this._viewportBounds.left   = -this._viewportCamera.x / this._viewportCamera.z;
    this._viewportBounds.width  = this._size.x / this._viewportCamera.z;
    this._viewportBounds.height = this._size.y / this._viewportCamera.z;
  },

  /**
   * Disconnects all chains attached to a node's entry link.
   * @function wcPlayEditor#onDisconnectEntryChains
   * @param {wcNode} node - The node to disconnect from.
   * @param {String} linkName - The name of the link.
   */
  onDisconnectEntryChains: function(node, linkName) {
      var chains = node.listEntryChains(linkName);
      if (chains.length) {
        this._undoManager && this._undoManager.addEvent('Disconnected Entry Links for "' + node.category + '.' + node.type + '.' + linkName + '"',
          {
            id: node.id,
            name: linkName,
            chains: chains,
            engine: this._engine,
          },
          // Undo
          function() {
            var myNode = this.engine.nodeById(this.id);
            for (var i = 0; i < this.chains.length; ++i) {
              var targetNode = this.engine.nodeById(this.chains[i].outNodeId);
              var targetName = this.chains[i].outName;
              myNode.connectEntry(this.name, targetNode, targetName);
            }
          },
          // Redo
          function() {
            var myNode = this.engine.nodeById(this.id);
            myNode.disconnectEntry(this.name);
          });
      }
      node.disconnectEntry(linkName);
  },

  /**
   * Disconnects all chains attached to a node's exit link.
   * @function wcPlayEditor#onDisconnectExitChains
   * @param {wcNode} node - The node to disconnect from.
   * @param {String} linkName - The name of the link.
   */
  onDisconnectExitChains: function(node, linkName) {
    var chains = node.listExitChains(linkName);
    if (chains.length) {
      this._undoManager && this._undoManager.addEvent('Disconnected Exit Links for "' + node.category + '.' + node.type + '.' + linkName + '"',
        {
          id: node.id,
          name: linkName,
          chains: chains,
          engine: this._engine,
        },
        // Undo
        function() {
          var myNode = this.engine.nodeById(this.id);
          for (var i = 0; i < this.chains.length; ++i) {
            var targetNode = this.engine.nodeById(this.chains[i].inNodeId);
            var targetName = this.chains[i].inName;
            myNode.connectExit(this.name, targetNode, targetName);
          }
        },
        // Redo
        function() {
          var myNode = this.engine.nodeById(this.id);
          myNode.disconnectExit(this.name);
        });
    }
    node.disconnectExit(linkName);
  },

  /**
   * Disconnects all chains attached to a node's input link.
   * @function wcPlayEditor#onDisconnectInputChains
   * @param {wcNode} node - The node to disconnect from.
   * @param {String} linkName - The name of the link.
   */
  onDisconnectInputChains: function(node, linkName) {
    var chains = node.listInputChains(linkName);
    if (chains.length) {
      this._undoManager && this._undoManager.addEvent('Disconnected Property Input Links for "' + node.category + '.' + node.type + '.' + linkName + '"',
        {
          id: node.id,
          name: linkName,
          chains: chains,
          engine: this._engine,
        },
        // Undo
        function() {
          var myNode = this.engine.nodeById(this.id);
          for (var i = 0; i < this.chains.length; ++i) {
            var targetNode = this.engine.nodeById(this.chains[i].outNodeId);
            var targetName = this.chains[i].outName;
            myNode.connectInput(this.name, targetNode, targetName);
          }
        },
        // Redo
        function() {
          var myNode = this.engine.nodeById(this.id);
          myNode.disconnectInput(this.name);
        });
    }
    node.disconnectInput(linkName);
  },

  /**
   * Disconnects all chains attached to a node's output link.
   * @function wcPlayEditor#onDisconnectOutputChains
   * @param {wcNode} node - The node to disconnect from.
   * @param {String} linkName - The name of the link.
   */
  onDisconnectOutputChains: function(node, linkName) {
    var chains = node.listOutputChains(linkName);
    if (chains.length) {
      this._undoManager && this._undoManager.addEvent('Disconnected Property Output Links for "' + node.category + '.' + node.type + '.' + linkName + '"',
        {
          id: node.id,
          name: linkName,
          chains: chains,
          engine: this._engine,
        },
        // Undo
        function() {
          var myNode = this.engine.nodeById(this.id);
          for (var i = 0; i < this.chains.length; ++i) {
            var targetNode = this.engine.nodeById(this.chains[i].inNodeId);
            var targetName = this.chains[i].inName;
            myNode.connectOutput(this.name, targetNode, targetName);
          }
        },
        // Redo
        function() {
          var myNode = this.engine.nodeById(this.id);
          myNode.disconnectOutput(this.name);
        });
    }
    node.disconnectOutput(linkName);
  },

  /**
   * Retrieve mouse or touch position.
   * @function wcPlayEditor#__mouse
   * @private
   * @param {Object} event - The mouse event.
   * @param {wcPlayEditor~Offset} [offset] - An optional screen offset to apply to the pos.
   * @param {wcPlay~Coordinates} [translation] - An optional camera translation to apply to the pos.
   * @return {wcPlay~Coordinates} - The mouse position.
   */
  __mouse: function(event, offset, translation) {
    if (event.originalEvent && (event.originalEvent.touches || event.originalEvent.changedTouches)) {
      var touch = event.originalEvent.touches[0] || event.originalEvent.changedTouches[0];
      return {
        x: touch.clientX - (offset? offset.left: 0) - (translation? translation.x: 0),
        y: touch.clientY - (offset? offset.top: 0) - (translation? translation.y: 0),
        gx: touch.clientX,
        gy: touch.clientY,
        which: 1,
      };
    }

    return {
      x: (event.clientX || event.pageX) - (offset? offset.left: 0) - (translation? translation.x: 0),
      y: (event.clientY || event.pageY) - (offset? offset.top: 0) - (translation? translation.y: 0),
      gx: (event.clientX || event.pageX),
      gy: (event.clientY || event.pageY),
      which: event.which || 1,
    };
  },

  /**
   * Assigns font data to the canvas.
   * @function wcPlayEditor#__setCanvasFont
   * @private
   * @param {Object} font - The font data to assign (wcPlayEditor~_font object).
   * @param {external:Canvas~Context} context - The canvas context.
   */
  __setCanvasFont: function(font, context) {
    context.font = (font.weight? font.weight + ' ': '') + (font.size + 'px ') + font.family;
  },

  /**
   * Clamps a given string value to a specific number of characters and appends a '...' if necessary.
   * @function wcPlayEditor#__clampString
   * @private
   * @param {String} str - The string to clamp.
   * @param {Number} len - The number of characters to allow.
   * @returns {String} - A clamped string.
   */
  __clampString: function(str, len) {
    if (str.length > len) {
      return str.substr(0, len) + '...';
    }
    return str;
  },

  /**
   * Blends two colors together. Color strings can be in hex string {'#ffffff'} or rgb string {'rgb(250,250,250)'} formats.
   * @function wcPlayEditor#__blendColors
   * @private
   * @param {String} c0 - The first color string.
   * @param {String} c1 - The second color string.
   * @param {Number} p - a multiplier to blend the colors by.
   */
  __blendColors: function(c0, c1, p) {
      var n=p<0?p*-1:p,u=Math.round,w=parseInt;
      if(c0.length>7){
          var f=c0.split(","),t=(c1?c1:p<0?"rgb(0,0,0)":"rgb(255,255,255)").split(","),R=w(f[0].slice(4)),G=w(f[1]),B=w(f[2]);
          return "rgb("+(u((w(t[0].slice(4))-R)*n)+R)+","+(u((w(t[1])-G)*n)+G)+","+(u((w(t[2])-B)*n)+B)+")"
      }else{
          var f=w(c0.slice(1),16),t=w((c1?c1:p<0?"#000000":"#FFFFFF").slice(1),16),R1=f>>16,G1=f>>8&0x00FF,B1=f&0x0000FF;
          return "#"+(0x1000000+(u(((t>>16)-R1)*n)+R1)*0x10000+(u(((t>>8&0x00FF)-G1)*n)+G1)*0x100+(u(((t&0x0000FF)-B1)*n)+B1)).toString(16).slice(1)
      }
  },

  /**
   * Retrieves a bounding rectangle that encloses all given rectangles.
   * @function wcPlayEditor#__expandRect
   * @private
   * @param {wcPlayEditor~Rect[]} rects - A list of rectangles to expand from.
   * @param {wcPlay~Coordinates[]} [offsets] - Optional offsets for each rectangle, must be the same size as rects param.
   * @returns {wcPlayEditor~Rect} - A bounding rectangle that encloses all given rectangles.
   */
  __expandRect: function(rects, offsets) {
    var bounds = {
      top: rects[0].top + (offsets? offsets[0].y: 0),
      left: rects[0].left + (offsets? offsets[0].x: 0),
      width: rects[0].width,
      height: rects[0].height,
    };

    for (var i = 1; i < rects.length; ++i) {
      var offsetX = 0;
      var offsetY = 0;
      if (offsets) {
        offsetX = offsets[i].x;
        offsetY = offsets[i].y;
      }

      if ((rects[i].top + offsetY) < bounds.top) {
        bounds.top = (rects[i].top + offsetY);
      }
      if ((rects[i].left + offsetX) < bounds.left) {
        bounds.left = (rects[i].left + offsetX);
      }
    }

    for (var i = 0; i < rects.length; ++i) {
      var offsetX = 0;
      var offsetY = 0;
      if (offsets) {
        offsetX = offsets[i].x;
        offsetY = offsets[i].y;
      }

      if ((rects[i].top + offsetY) + rects[i].height > bounds.top + bounds.height) {
        bounds.height = ((rects[i].top + offsetY) + rects[i].height) - bounds.top;
      }
      if ((rects[i].left + offsetX) + rects[i].width > bounds.left + bounds.width) {
        bounds.width = ((rects[i].left + offsetX) + rects[i].width) - bounds.left;
      }
    }

    return bounds;
  },

  /**
   * Tests whether a given point is within a bounding rectangle.
   * @function wcPlayEditor#__inRect
   * @private
   * @param {wcPlay~Coordinates} pos - The position to test.
   * @param {wcPlayEditor~Rect} rect - The bounding rectangle.
   * @param {wcPlay~Coordinates} [offset] - An optional offset to apply to the rect.
   * @param {wcPlay~Coordinates} [trans] - An optional camera translation to apply to the pos.
   * @returns {Boolean} - Whether there is a collision.
   */
  __inRect: function(pos, rect, offset, trans) {
    if (offset === undefined) {
      offset = {
        x: 0,
        y: 0,
      };
    }
    if (trans === undefined) {
      trans = {
        x: 0,
        y: 0,
        z: 1,
      };
    }

    if ((pos.y - trans.y) / trans.z >= offset.y + rect.top &&
        (pos.x - trans.x) / trans.z >= offset.x + rect.left &&
        (pos.y - trans.y) / trans.z <= offset.y + rect.top + rect.height &&
        (pos.x - trans.x) / trans.z <= offset.x + rect.left + rect.width) {
      return true;
    }
    return false;
  },

  /**
   * Tests whether a given rectangle is within a bounding rectangle.
   * @function wcPlayEditor#__rectOnRect
   * @private
   * @param {wcPlayEditor~Rect} rectA - The first rectangle.
   * @param {wcPlayEditor~Rect} rectB - The second rectangle.
   * @param {wcPlay~Coordinates} [offsetA] - An optional offset to apply to the rectA.
   * @returns {Boolean} - Whether there is a collision.
   */
  __rectOnRect: function(rectA, rectB, offsetA) {
    if (offsetA === undefined) {
      offsetA = {
        x: 0,
        y: 0,
      };
    }

    return !(rectB.left > offsetA.x + rectA.left + rectA.width ||
            rectB.left + rectB.width < offsetA.x + rectA.left ||
            rectB.top > offsetA.y + rectA.top + rectA.height ||
            rectB.top + rectB.height < offsetA.y + rectA.top);
  },

  /**
   * Draws a rounded rectangle.
   * @function wcPlayEditor#__drawRoundedRect
   * @private
   * @param {wcPlayEditor~Rect} rect - The rectangle bounds to draw.
   * @param {String} color - The color of the line.
   * @param {Number} lineWidth - The thickness of the line, -1 will fill the shape.
   * @param {Number} radius - The radius of the rounded corners.
   * @param {external:Canvas~Context} context - The canvas context to render on.
   * @param {wcPlay~Coordinates} [pos] - An option positional offset to draw the rect.
   */
  __drawRoundedRect: function(rect, color, lineWidth, radius, context, pos) {
    if (!pos) {
      pos = {x: 0, y: 0};
    }
    context.save();
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = (lineWidth > 0)? lineWidth: 1;
    context.beginPath();
    context.moveTo(pos.x + rect.left + radius, pos.y + rect.top);
    context.arcTo(pos.x + rect.left + rect.width, pos.y + rect.top, pos.x + rect.left + rect.width, pos.y + rect.top + radius, radius);
    context.arcTo(pos.x + rect.left + rect.width, pos.y + rect.top + rect.height, pos.x + rect.left + rect.width - radius, pos.y + rect.top + rect.height, radius);
    context.arcTo(pos.x + rect.left, pos.y + rect.top + rect.height, pos.x + rect.left, pos.y + rect.top + rect.height - radius, radius);
    context.arcTo(pos.x + rect.left, pos.y + rect.top, pos.x + rect.left + radius, pos.y + rect.top, radius);
    context.closePath();
    lineWidth == -1? context.fill(): context.stroke();
    context.restore();
  },

  /**
   * Renders a new frame.
   * @function wcPlayEditor#__update
   * @private
   */
  __update: function(timestamp) {
    if (!this._lastUpdate) {
      this._lastUpdate = timestamp;
    }
    var elapsed = (timestamp - this._lastUpdate) / 1000;
    this._lastUpdate = timestamp;

    this.onResized();

    this._menu.update();
    if (this._parent) {

      // Render the palette.
      this.__drawPalette(elapsed);

      // Setup viewport canvas.
      this._viewportContext.clearRect(0, 0, this.$viewport.width(), this.$viewport.height());

      this._viewportContext.save();
      this._viewportContext.translate(this._viewportCamera.x, this._viewportCamera.y);
      this._viewportContext.scale(this._viewportCamera.z, this._viewportCamera.z);

      // Update nodes.
      this.__updateNodes(this._parent._entryNodes, elapsed, this._viewportContext);
      this.__updateNodes(this._parent._processNodes, elapsed, this._viewportContext);
      this.__updateNodes(this._parent._storageNodes, elapsed, this._viewportContext);
      this.__updateNodes(this._parent._compositeNodes, elapsed, this._viewportContext);

      // Render the nodes in the main script.
      this.__drawNodes(this._parent._entryNodes, this._viewportContext);
      this.__drawNodes(this._parent._processNodes, this._viewportContext);
      this.__drawNodes(this._parent._compositeNodes, this._viewportContext);
      this.__drawNodes(this._parent._storageNodes, this._viewportContext);

      // Render chains between nodes.
      this.__drawChains(this._parent._entryNodes, this._viewportContext);
      this.__drawChains(this._parent._processNodes, this._viewportContext);
      this.__drawChains(this._parent._compositeNodes, this._viewportContext);
      this.__drawChains(this._parent._storageNodes, this._viewportContext);

      if (this._highlightRect) {
        var radius = Math.min(10, this._highlightRect.width/2, this._highlightRect.height/2);
        this.__drawRoundedRect(this._highlightRect, "rgba(0, 255, 255, 0.25)", -1, radius, this._viewportContext);
        this.__drawRoundedRect(this._highlightRect, "darkcyan", 2, radius, this._viewportContext);
      }

      // console.log('Draw count - Nodes: ' + this._nodeDrawCount + ', Chains: ' + this._chainDrawCount);
      // this._nodeDrawCount = 0;
      // this._chainDrawCount = 0;

      // if (this._selectedNodes.length) {
      //   var boundList = [];
      //   var offsetList = [];
      //   for (var i = 0; i < this._selectedNodes.length; ++i) {
      //     var node = this._selectedNodes[i];
      //     boundList.push(node._meta.bounds.farRect);
      //     offsetList.push(node.pos);
      //   }
      //   this.__drawRoundedRect(this.__expandRect(boundList, offsetList), "red", -1, 10, this._viewportContext);
      // }

      this._viewportContext.restore();

      // Draw breadcrumbs.
      var scopes = [];
      var scopeNames = [];
      var scope = this._parent;
      while (!(scope instanceof wcPlay)) {
        scopes.unshift(scope);
        scopeNames.unshift(scope.type + (scope.name? ' (' + scope.name + ')': ''));
        scope = scope._parent;
      }
      scopes.unshift(this._engine);
      scopeNames.unshift('Root');

      this._viewportContext.fillStyle = 'black';
      this.__setCanvasFont(this._font.breadcrumbs, this._viewportContext);

      this._crumbBounds = [];
      var left = 2;
      for (var i = 0; i < scopeNames.length; ++i) {
        var w = this._viewportContext.measureText(scopeNames[i]).width;
        var w2 = this._viewportContext.measureText(' / ').width;
        var boundData = {
          rect: {
            top: 0,
            left: left,
            width: w + 6,
            height: this._font.breadcrumbs.size + this._drawStyle.property.spacing,
          },
          parent: scopes[i],
        };
        this._crumbBounds.push(boundData);
        left += w + w2;

        if (this._highlightCrumb === i) {
          this.__drawRoundedRect(boundData.rect, "rgba(0, 255, 255, 0.25)", -1, 3, this._viewportContext);
          this.__drawRoundedRect(boundData.rect, "darkcyan", 2, 3, this._viewportContext);
        }
      }
      this._viewportContext.fillText(scopeNames.join(' / '), 5, this._font.breadcrumbs.size);
    }

    window.requestAnimationFrame(this.__update.bind(this));
  },

  /**
   * Updates the status of a list of nodes.
   * @function wcPlayEditor#__updateNodes
   * @private
   * @param {wcNode[]} nodes - The nodes to update.
   * @param {Number} elapsed - Elapsed time since last update.
   * @param {external:Canvas~Context} context - The canvas context to render on.
   */
  __updateNodes: function(nodes, elapsed, context) {
    for (var i = 0; i < nodes.length; ++i) {
      this.__updateNode(nodes[i], elapsed, context);
    }
  },

  /**
   * Updates the status of a node.
   * @function wcPlayEditor#__updateNode
   * @private
   * @param {wcNode} node - The Node to update.
   * @param {Number} elapsed - Elapsed time since last update.
   * @param {external:Canvas~Context} context - The canvas context to render on.
   */
  __updateNode: function(node, elapsed, context) {
    node.onDraw();

    // Update flash state.
    var self = this;
    function __updateFlash(meta, darkColor, lightColor, pauseColor, keepBroken, colorMul) {
      if (meta.flash) {
        meta.flashDelta += elapsed * 10.0;
        if (meta.flashDelta >= 1.0) {
          meta.flashDelta = 1.0;

          if (!meta.awake && (!meta.broken || (!keepBroken && !self._engine.paused()))) {
            meta.flash = false;
          }
        }
      } else if (meta.flashDelta > 0.0) {
        meta.flashDelta -= elapsed * 5.0;
        if (meta.flashDelta <= 0.0) {
          meta.flashDelta = 0;
          meta.broken = keepBroken? meta.broken: meta.broken - 1;
        }
      }

      meta.color = self.__blendColors(darkColor, meta.broken? pauseColor: lightColor, meta.flashDelta * colorMul);
    }

    var color = node.color;
    if (this._highlightNode === node) {
      color = this.__blendColors(node.color, "#FFFFFF", 0.25);
    }
    __updateFlash(node._meta, color, "#FFFFFF", "#FFFFFF", true, 0.5);

    var blackColor = "#000000";
    var propColor  = "#117711";
    var flashColor = "#FFFF00";
    for (var i = 0; i < node.properties.length; ++i) {
      __updateFlash(node.properties[i].inputMeta, propColor, flashColor, flashColor, false, 0.9);
      __updateFlash(node.properties[i].outputMeta, propColor, flashColor, flashColor, false, 0.9);
    }

    if (this._engine._queuedProperties.length === 0) {
      for (var i = 0; i < node.chain.entry.length; ++i) {
        __updateFlash(node.chain.entry[i].meta, blackColor, flashColor, flashColor, false, 0.9);
      }
      for (var i = 0; i < node.chain.exit.length; ++i) {
        __updateFlash(node.chain.exit[i].meta, blackColor, flashColor, flashColor, false, 0.9);
      }
    }

    // Measure bounding areas for node, if it is dirty.
    if (node._meta.dirty) {
      node._meta.dirty = false;

      node._meta.bounds = {
        node: node,
      };

      var entryBounds = this.__measureEntryLinkOuter(node, context);
      var outerBounds = this.__measureOuter(node, context, entryBounds.height);
      var exitBounds  = this.__measureExitLinkOuter(node, context, entryBounds.height + outerBounds.height);

      var bounds = this.__expandRect([entryBounds, outerBounds, exitBounds]);
      bounds.top = outerBounds.top;
      bounds.height = outerBounds.height;
      bounds.propWidth = outerBounds.propWidth;
      bounds.valueWidth = outerBounds.valueWidth;
      bounds.initialWidth = outerBounds.initialWidth;

      node._meta.bounds.entryOuter = entryBounds;
      node._meta.bounds.exitOuter = exitBounds;
      node._meta.bounds.centerOuter = outerBounds;
      node._meta.bounds.rect = this.__expandRect([entryBounds, outerBounds, exitBounds]);
      node._meta.bounds.inner = this.__expandRect([outerBounds]);
      node._meta.bounds.inner.left = node._meta.bounds.rect.left;
      node._meta.bounds.inner.width = node._meta.bounds.rect.width;
      node._meta.bounds.rect.top -= 3;
      node._meta.bounds.rect.left -= this._drawStyle.links.length + 3;
      node._meta.bounds.rect.width += this._drawStyle.links.length * 2 + 6;
      node._meta.bounds.rect.height += 6;

      if (node.chain.entry.length) {
        node._meta.bounds.inner.top -= this._drawStyle.links.padding + this._font.links.size;
        node._meta.bounds.inner.height += this._drawStyle.links.padding + this._font.links.size;
      } else {
        node._meta.bounds.rect.top -= this._drawStyle.links.length;
        node._meta.bounds.rect.height += this._drawStyle.links.length;
      }
      if (node.chain.exit.length) {
        node._meta.bounds.inner.height += this._drawStyle.links.padding + this._font.links.size;
      } else {
        node._meta.bounds.rect.height += this._drawStyle.links.length;
      }

      var maxValueWidth = (node._meta.bounds.inner.width - this._drawStyle.node.margin*2 - bounds.propWidth);
      if (maxValueWidth > bounds.valueWidth + bounds.initialWidth) {
        var extra = (maxValueWidth - (bounds.valueWidth + bounds.initialWidth)) / 2;
        bounds.valueWidth += extra;
        bounds.initialWidth += extra;
      }

      // Now use our measurements to draw our node.
      this.__measureCenter(node, context, bounds);
      this.__measureEntryLinks(node, context, entryBounds.width);
      this.__measureExitLinks(node, context, entryBounds.height + outerBounds.height, exitBounds.width);

      node._meta.bounds.farRect = {
        top: node._meta.bounds.inner.top - 30,
        left: node._meta.bounds.inner.left - 30,
        width: node._meta.bounds.inner.width + 60,
        height: node._meta.bounds.inner.height + 60,
      };

      // Add a collapse button to the node in the left margin of the title.
      node._meta.bounds.debugLog = {
        left: node._meta.bounds.inner.left + 4,
        top: node._meta.bounds.inner.top + 4 + (node.chain.entry.length? this._font.links.size + this._drawStyle.links.padding: 0),
        width: this._drawStyle.node.margin - 5,
        height: this._font.title.size - 4,
      };

      // Add breakpoint button to the node in the right margin of the title.
      node._meta.bounds.breakpoint = {
        left: node._meta.bounds.inner.left + node._meta.bounds.inner.width - this._drawStyle.node.margin + 2,
        top: node._meta.bounds.inner.top + 4 + (node.chain.entry.length? this._font.links.size + this._drawStyle.links.padding: 0),
        width: this._drawStyle.node.margin - 5,
        height: this._font.title.size - 4,
      };
    }
  },

  /**
   * Retrieves the index for a node type.
   * @function wcPlayEditor#__typeIndex
   * @private
   * @param {wcPlay.NODE} type - The node type.
   * @returns {Number} - The type index.
   */
  __typeIndex: function(type) {
    switch (type) {
      case wcPlay.NODE.ENTRY: return 0;
      case wcPlay.NODE.PROCESS: return 1;
      case wcPlay.NODE.STORAGE: return 2;
      case wcPlay.NODE.COMPOSITE: return 3;
    }
  },

  /**
   * Initializes the file menu and toolbar.
   * @function wcPlayEditor#__setupMenu
   * @private
   */
  __setupMenu: function() {
    this._menu = new wcMenu(this.$top, {
      outer: this.$main,
      manualUpdate: true,
      data: this,
      version: "v1.0.0"
    });

    // File -> New Script...
    this._menu.addOption('File', 'New Script', {
      hotkeys: "Alt+N",
      icon: "fa fa-file-o fa-lg",
      description: "Start a new script...",
      toolbarIndex: -1,
      condition: function(editor) {
        return !editor._options.readOnly;
      },
      onActivated: function(editor) {
        if (editor._engine) {
          editor._engine.clear();
          editor._undoManager && editor._undoManager.clear();
          editor._parent = editor._engine;
        }
      }
    });

    // File -> Open Script...
    this._menu.addOption('File', 'Open Script...', {
      hotkeys: "Ctrl+O",
      icon: "fa fa-folder-open-o fa-lg",
      description: "Open a script file...",
      toolbarIndex: -1,
      condition: function(editor) {
        return !editor._options.readOnly;
      },
      onActivated: function(editor) {
        if (editor._engine) {
          if (document.createEvent) {
            var evt = document.createEvent("MouseEvents");
            evt.initEvent("click", true, false);
            editor.$container.prepend(editor.$hiddenFileLoader);
            editor.$hiddenFileLoader[0].dispatchEvent(evt);
          }
        }
      }
    });

    // File -> Save Script
    this._menu.addOption('File', 'Save Script', {
      hotkeys: "Ctrl+S",
      icon: "fa fa-save fa-lg",
      description: "Save this script...",
      toolbarIndex: -1,
      condition: function(editor) {
        return !editor._options.readOnly;
      },
      onActivated: function(editor) {
        if (editor._engine) {
          if (!saveAs) {
            console.log("ERROR: Attempted to save the script when external dependency 'FileSaver' was not included.");
            return;
          }

          var savedData = editor._engine.save();
          var blob;
          try {
            blob = new Blob([savedData], {type: 'text/plain'});
          } catch (e) {
            // Legacy support
            var bb = new BlobBuilder();
            bb.append(savedData);
            blob = bb.getBlob('text/plain');
          }

          saveAs(blob, 'script.wcplay');
        }
      }
    });

    // File -> Import...
    this._menu.addOption('File', 'Import...', {
      icon: "fa fa-plus-square-o fa-lg",
      description: "Import a script file as a Composite Node.",
      toolbarIndex: -1,
      condition: function(editor) {
        return !editor._options.readOnly;
      },
      onActivated: function(editor) {
        if (editor._engine) {
          if (document.createEvent) {
            var evt = document.createEvent("MouseEvents");
            evt.initEvent("click", true, false);
            editor.$container.prepend(editor.$hiddenFileImporter);
            editor.$hiddenFileImporter[0].dispatchEvent(evt);
          }
        }
      }
    });

    // Edit -> Undo
    this._menu.addOption('Edit', 'Undo', {
      hotkeys: "Ctrl+Z",
      icon: "fa fa-undo fa-lg",
      toolbarIndex: -1,
      description: function(editor) {
        return 'Undo ' + ((editor._undoManager && editor._undoManager.undoInfo()) || 'Event');
      },
      condition: function(editor) {
        return editor._undoManager && editor._undoManager.canUndo();
      },
      onActivated: function(editor) {
        editor._undoManager && editor._undoManager.undo();
      }
    });

    // Edit -> Redo
    this._menu.addOption('Edit', 'Redo', {
      hotkeys: "Ctrl+Y,Ctrl+Shift+Z",
      icon: "fa fa-undo fa-flip-horizontal fa-lg",
      toolbarIndex: -1,
      description: function(editor) {
        return 'Redo ' + ((editor._undoManager && editor._undoManager.redoInfo()) || 'Event');
      },
      condition: function(editor) {
        return editor._undoManager && editor._undoManager.canRedo();
      },
      onActivated: function(editor) {
        editor._undoManager && editor._undoManager.redo();
      }
    });

    function __copy(editor) {
      wcPlayEditorClipboard.nodes = [];
      var bounds = [];
      var offsets = [];
      for (var i = 0; i < editor._selectedNodes.length; ++i) {
        var node = editor._selectedNodes[i];
        var data = node.export();
        bounds.push(node._meta.bounds.farRect);
        offsets.push(node.pos);

        wcPlayEditorClipboard.nodes.push(data);
      }
      wcPlayEditorClipboard.bounds = editor.__expandRect(bounds, offsets);
    }

    // Edit -> Cut
    this._menu.addOption('Edit', 'Cut', {
      hotkeys: "Ctrl+X",
      icon: "fa fa-cut fa-lg",
      toolbarIndex: -1,
      description: "Cut selected node(s) out of your script and into the clipboard.",
      condition: function(editor) {
        return editor._selectedNodes.length > 0;
      },
      onActivated: function(editor) {
        __copy(editor, editor._engine);

        editor._undoManager && editor._undoManager.beginGroup('Cut Nodes to clipboard');
        for (var i = 0; i < editor._selectedNodes.length; ++i) {
          editor.__onDestroyNode(editor._selectedNodes[i]);
          editor._selectedNodes[i].destroy();
        }
        editor._selectedNodes = [];
        editor._undoManager && editor._undoManager.endGroup();
      }
    });

    // Edit -> Copy
    this._menu.addOption('Edit', 'Copy', {
      hotkeys: "Ctrl+C",
      icon: "fa fa-copy fa-lg",
      toolbarIndex: -1,
      description: "Copy selected node(s) to your clipboard.",
      condition: function(editor) {
        return editor._selectedNodes.length > 0;
      },
      onActivated: __copy
    });

    // Edit -> Paste
    this._menu.addOption('Edit', 'Paste', {
      hotkeys: "Ctrl+V",
      icon: "fa fa-paste fa-lg",
      toolbarIndex: -1,
      description: "Paste node(s) in clipboard into your script.",
      condition: function(editor) {
        return wcPlayEditorClipboard.nodes.length > 0;
      },
      onActivated: function(editor) {
        var mouse = {
          x: editor._mouse.x,
          y: editor._mouse.y,
        };
        if (!editor._mouseInViewport) {
          mouse.x = editor.$viewport.width()/2;
          mouse.y = editor.$viewport.height()/2;
        }

        editor._selectedNode = null;
        editor._selectedNodes = [];

        var idMap = [];
        var nodes = [];
        editor._undoManager && editor._undoManager.beginGroup('Paste Nodes from clipboard');
        var bounds = wcPlayEditorClipboard.bounds;
        for (var i = 0; i < wcPlayEditorClipboard.nodes.length; ++i) {
          var data = wcPlayEditorClipboard.nodes[i];

          var newNode = new window[data.className](editor._parent, data.pos);

          idMap[data.id] = newNode.id;
          nodes.push(newNode);
        }

        for (var i = 0; i < wcPlayEditorClipboard.nodes.length; ++i) {
          var data = wcPlayEditorClipboard.nodes[i];
          var newNode = nodes[i];
          editor._selectedNodes.push(newNode);
          if (!editor._selectedNode) {
            editor._selectedNode = newNode;
          }

          newNode.import(data, idMap);
          newNode.pos.x = (mouse.x - editor._viewportCamera.x) / editor._viewportCamera.z - bounds.width/2 + (data.pos.x - bounds.left);
          newNode.pos.y = (mouse.y - editor._viewportCamera.y) / editor._viewportCamera.z - bounds.height/2 + (data.pos.y - bounds.top);

          editor.__onCreateNode(newNode);
        }
        editor._undoManager && editor._undoManager.endGroup();
      }
    });

    // Edit -> Delete
    this._menu.addOption('Edit', 'Delete', {
      hotkeys: "Delete",
      icon: "fa fa-trash fa-lg",
      toolbarIndex: -1,
      description: "Delete selected node(s).",
      condition: function(editor) {
        return editor._selectedNodes.length > 0;
      },
      onActivated: function(editor) {
        if (editor._selectedNodes.length) {
          editor._undoManager && editor._undoManager.beginGroup('Removed Nodes');
          for (var i = 0; i < editor._selectedNodes.length; ++i) {
            editor.__onDestroyNode(editor._selectedNodes[i]);
            editor._selectedNodes[i].destroy();
          }
          editor._selectedNode = null;
          editor._selectedNodes = [];
          editor._undoManager && editor._undoManager.endGroup();
        }
      }
    });

    // Edit -> Create Composite
    this._menu.addOption('Edit', 'Create Composite', {
      hotkeys: 'C',
      icon: "fa fa-suitcase fa-lg",
      toolbarIndex: -1,
      description: "Combine all selected nodes into a new \'Composite\' Node.",
      condition: function(editor) {
        return editor._selectedNodes.length > 0;
      },
      onActivated: function(editor) {
        if (editor._selectedNodes.length && editor._parent) {
          editor._undoManager && editor._undoManager.beginGroup("Combined Nodes into Composite");
          // Create undo events for removing the selected nodes.
          for (var i = 0; i < editor._selectedNodes.length; ++i) {
            editor.__onDestroyNode(editor._selectedNodes[i]);

            // Now give this node a new ID so it is treated like a different node.
            editor._selectedNodes[i].id = ++window.wcNodeNextID;
          }

          var compNode = new wcNodeCompositeScript(editor._parent, {x: 0, y: 0}, editor._selectedNodes);

          // Calculate the bounding box of all moved nodes.
          var boundList = [];
          var offsetList = [];
          for (var i = 0; i < editor._selectedNodes.length; ++i) {
            var node = editor._selectedNodes[i];

            boundList.push(node._meta.bounds.farRect);
            offsetList.push(node.pos);
          }
          var bounds = editor.__expandRect(boundList, offsetList);

          var exportedNodes = [];
          for (var i = 0; i < editor._selectedNodes.length; ++i) {
            var node = editor._selectedNodes[i];

            // The node was already moved to the composite node, now remove it from the parent object.
            editor._parent.__removeNode(node);

            // Find all chains that connect to an external node.
            var entryChains = node.listEntryChains(undefined, editor._selectedNodes);
            var exitChains = node.listExitChains(undefined, editor._selectedNodes);
            var inputChains = node.listInputChains(undefined, editor._selectedNodes);
            var outputChains = node.listOutputChains(undefined, editor._selectedNodes);

            // External entry chains.
            var createdLinks = [];
            for (var a = 0; a < entryChains.length; ++a) {
              var targetNode = editor._engine.nodeById(entryChains[a].outNodeId);
              var targetName = entryChains[a].outName;
              var node = editor._engine.nodeById(entryChains[a].inNodeId);
              var linkName = entryChains[a].inName;

              // Make sure we only create one Composite Entry per link.
              var linkNode = null;
              for (var b = 0; b < createdLinks.length; ++b) {
                if (createdLinks[b].name === linkName) {
                  linkNode = createdLinks[b].node;
                  break;
                }
              }
              if (!linkNode) {
                // Create a Composite Entry Node, this acts as a surrogate entry link for the Composite node.
                linkNode = new wcNodeCompositeEntry(compNode, {x: node.pos.x, y: bounds.top - 100}, linkName);
                createdLinks.push({
                  name: linkName,
                  node: linkNode,
                });
              }

              linkNode.connectExit('out', node, linkName);
              compNode.connectEntry(linkNode.name, targetNode, targetName);
              targetNode.disconnectExit(targetName, node, linkName);
            }

            // External exit chains.
            createdLinks = [];
            for (var a = 0; a < exitChains.length; ++a) {
              var targetNode = editor._engine.nodeById(exitChains[a].inNodeId);
              var targetName = exitChains[a].inName;
              var node = editor._engine.nodeById(exitChains[a].outNodeId);
              var linkName = exitChains[a].outName;

              // Make sure we only create one Composite Entry per link.
              var linkNode = null;
              for (var b = 0; b < createdLinks.length; ++b) {
                if (createdLinks[b].name === linkName) {
                  linkNode = createdLinks[b].node;
                  break;
                }
              }
              if (!linkNode) {
                // Create a Composite Exit Node, this acts as a surrogate exit link for the Composite node.
                linkNode = new wcNodeCompositeExit(compNode, {x: node.pos.x, y: bounds.top + bounds.height + 50}, linkName);
                createdLinks.push({
                  name: linkName,
                  node: linkNode,
                });
              }

              linkNode.connectEntry('in', node, linkName);
              compNode.connectExit(linkNode.name, targetNode, targetName);
              targetNode.disconnectEntry(targetName, node, linkName);
            }

            // External property input chains.
            createdLinks = [];
            for (var a = 0; a < inputChains.length; ++a) {
              var targetNode = editor._engine.nodeById(inputChains[a].outNodeId);
              var targetName = inputChains[a].outName;
              var node = editor._engine.nodeById(inputChains[a].inNodeId);
              var linkName = inputChains[a].inName;

              // Make sure we only create one Composite Entry per link.
              var linkNode = null;
              for (var b = 0; b < createdLinks.length; ++b) {
                if (createdLinks[b].name === linkName) {
                  linkNode = createdLinks[b].node;
                  break;
                }
              }
              if (!linkNode) {
                // Create a Composite Property Node, this acts as a surrogate property link for the Composite node.
                linkNode = new wcNodeCompositeProperty(compNode, {x: bounds.left - 200, y: node.pos.y}, linkName);
                createdLinks.push({
                  name: linkName,
                  node: linkNode,
                });
              }

              linkNode.connectOutput('value', node, linkName);
              compNode.connectInput(linkNode.name, targetNode, targetName);
              targetNode.disconnectOutput(targetName, node, linkName);
            }

            // External property output chains.
            createdLinks = [];
            for (var a = 0; a < outputChains.length; ++a) {
              var targetNode = editor._engine.nodeById(outputChains[a].inNodeId);
              var targetName = outputChains[a].inName;
              var node = editor._engine.nodeById(outputChains[a].outNodeId);
              var linkName = outputChains[a].outName;

              // Make sure we only create one Composite Entry per link.
              var linkNode = null;
              for (var b = 0; b < createdLinks.length; ++b) {
                if (createdLinks[b].name === linkName) {
                  linkNode = createdLinks[b].node;
                  break;
                }
              }
              if (!linkNode) {
                // Create a Composite Property Node, this acts as a surrogate property link for the Composite node.
                linkNode = new wcNodeCompositeProperty(compNode, {x: bounds.left + bounds.width + 200, y: node.pos.y}, linkName);
                createdLinks.push({
                  name: linkName,
                  node: linkNode,
                });
              }

              linkNode.connectInput('value', node, linkName);
              compNode.connectOutput(linkNode.name, targetNode, targetName);
              targetNode.disconnectInput(targetName, node, linkName);
            }
          }

          editor._selectedNode = null;
          editor._selectedNodes = [];

          compNode.pos.x = bounds.left + bounds.width/2;
          compNode.pos.y = bounds.top + bounds.height/2;

          // Compile the meta data for this node based on the nodes inside.
          // compNode.compile();

          // Create undo event for creating the composite node.
          editor.__onCreateNode(compNode);

          editor._undoManager && editor._undoManager.endGroup();

          editor.__setupPalette();
        }
      }
    });

    // Debugging -> Toggle Debug Mode
    this._menu.addOption('Debugging', 'Toggle Debug Mode', {
      icon: function(editor) {
        if (editor._engine && editor._engine.debugging()) {
          return "fa fa-dot-circle-o fa-lg";
        } else {
          return "fa fa-circle-o fa-lg";
        }
      },
      toolbarIndex: -1,
      description: "Toggle debugging mode for the entire script.",
      onActivated: function(editor) {
        if (editor._engine) {
          editor._engine.debugging(!editor._engine.debugging());
          editor._engine.paused(false);
        }
      }
    });

    // Debugging -> Toggle Silence Mode
    this._menu.addOption('Debugging', 'Toggle Silence Mode', {
      icon: function(editor) {
        if (editor._engine && editor._engine.silent()) {
          return "fa fa-volume-off fa-lg";
        } else {
          return "fa fa-volume-up fa-lg";
        }
      },
      toolbarIndex: -1,
      description: "Toggle silent mode for the entire script.",
      onActivated: function(editor) {
        if (editor._engine) {
          editor._engine.silent(!editor._engine.silent());
        }
      }
    });

    // Debugging -> Restart Script
    this._menu.addOption('Debugging', 'Start Script', {
      hotkeys: "Shift+Enter",
      icon: function(editor) {
        if (editor._engine && editor._engine.isRunning()) {
          return "fa fa-stop fa-lg";
        } else {
          return "fa fa-play fa-lg";
        }
      },
      toolbarIndex: -1,
      display: function(editor) {
        if (editor._engine && editor._engine.isRunning()) {
          return "Stop Script";
        } else {
          return "Start Script";
        }
      },
      description: "Starts or Stops execution of the script.",
      condition: function(editor) {
        return !editor._options.readOnly && editor._options.playable;
      },
      onActivated: function(editor) {
        if (editor._engine) {
          if (editor._engine.isRunning()) {
            editor._engine.stop();
          } else {
            editor._engine.start();
          }
        }
      }
    });

    // Debugging -> Pause/Continue Script
    this._menu.addOption('Debugging', 'Pause Script', {
      hotkeys: 'Return',
      icon: "fa fa-pause fa-lg",
      toggle: function(editor) {
        return editor._engine && editor._engine.paused();
      },
      display: function(editor) {
        if (editor._engine && editor._engine.paused()) {
          return 'Resume Script';
        } else {
          return 'Pause Script';
        }
      },
      toolbarIndex: -1,
      description: "Pause or Continue the script.",
      condition: function(editor) {
        return !editor._options.readOnly && (editor._engine && editor._engine.isRunning());
      },
      onActivated: function(editor) {
        if (editor._engine) {
          if (editor._engine.paused() || editor._engine.stepping()) {
            editor._engine.paused(false);
            editor._engine.stepping(false);
          } else {
            editor._engine.stepping(true);
          }
        }
      }
    });

    // Debugging -> Step Script
    this._menu.addOption('Debugging', 'Step Script', {
      hotkeys: 'Spacebar',
      icon: "fa fa-fast-forward fa-lg",
      toolbarIndex: -1,
      description: "Perform a single script update.",
      condition: function(editor) {
        return !editor._options.readOnly && (editor._engine && editor._engine.isRunning());
      },
      onActivated: function(editor) {
        if (editor._engine) {
          editor._engine.paused(false);
          editor._engine.stepping(true);
        }
      }
    });

    // View -> Create Composite
    this._menu.addOption('View', 'Fit in View', {
      hotkeys: 'F',
      icon: "fa fa-crosshairs fa-lg",
      categoryIndex: 2,
      toolbarIndex: -1,
      description: "Center view on selected node(s).",
      onActivated: function(editor) {
        if (editor._selectedNodes.length) {
          editor.focus(editor._selectedNodes);
        } else {
          editor.center();
        }
      }
    });

    // View -> Exit Composite
    this._menu.addOption('View', 'Exit Composite', {
      hotkeys: 'O',
      icon: "fa fa-level-up fa-lg",
      toolbarIndex: -1,
      description: "Step out of this Composite Node.",
      condition: function(editor) {
        return editor._parent instanceof wcNodeCompositeScript;
      },
      onActivated: function(editor) {
        var focusNode = editor._parent;
        editor._parent = editor._parent._parent;

        editor._selectedNode = focusNode;
        editor._selectedNodes = [focusNode];
        editor.focus(editor._selectedNodes);
      }
    });

    // View -> Enter Composite
    this._menu.addOption('View', 'Enter Composite', {
      hotkeys: 'I',
      icon: "fa fa-level-down fa-lg",
      toolbarIndex: -1,
      description: "Step in to this Composite Node.",
      condition: function(editor) {
        return (editor._selectedNodes.length === 1 && editor._selectedNodes[0] instanceof wcNodeCompositeScript);
      },
      onActivated: function(editor) {
        editor._parent = editor._selectedNodes[0];
        editor._selectedNode = null;
        editor._selectedNodes = [];

        editor.center();
      }
    });

    // View -> Chain Style
    this._menu.addOption('View', 'Chain Style', {
      hotkeys: 'V',
      icon: "fa fa-sitemap fa-lg",
      toolbarIndex: -1,
      description: "Toggle the visual style of the chains.",
      onActivated: function(editor) {
        editor._chainStyle += 1;
        if (editor._chainStyle > editor._chainStyleMax) {
          editor._chainStyle = 0;
        }
      }
    });

    var self = this;
    var $field = this.$search.children('input');
    var searchResults = [];
    var searchParent = null;
    var searchValue = '';
    var searchIndex = 0;
    function __searchNodes() {
      // Search nodes and focus on them.
      if (searchParent) {
        searchResults = searchParent.nodesBySearch(searchValue);

        if (searchResults.length > 0) {
          self._parent = searchResults[searchIndex]._parent;
          self.focus([searchResults[searchIndex]]);
          self._selectedNodes = searchResults;
        }
      }
    };

    function __searchPrev() {
      if (searchResults.length) {
        searchIndex -= 1;
        if (searchIndex < 0) {
          searchIndex = searchResults.length-1;
        }
        self._parent = searchResults[searchIndex]._parent;
        self.focus([searchResults[searchIndex]]);
        self._selectedNodes = searchResults;
      }
    };

    function __searchNext() {
      if (searchResults.length) {
        searchIndex += 1;
        if (searchIndex >= searchResults.length) {
          searchIndex = 0;
        }
        self._parent = searchResults[searchIndex]._parent;
        self.focus([searchResults[searchIndex]]);
        self._selectedNodes = searchResults;
      }
    };

    this.$search.children('.wcPlayEditorSearchPrev').click(__searchPrev);
    this.$search.children('.wcPlayEditorSearchNext').click(__searchNext);

    this.$search.keydown(function(event) {
      if (event.keyCode === 27) {
        if (!self.$search.hasClass('wcPlayHidden')) {
          self.$search.addClass('wcPlayHidden');
        }
      }
      // Return, Down arrow, or Tab to cycle next item.
      else if (event.keyCode === 13 || event.keyCode === 40 || event.keyCode === 9) {
        __searchNext();
        event.stopPropagation();
        event.preventDefault();
        return true;
      }
      // Up arrow to cycle previous item.
      else if (event.keyCode === 38) {
        __searchPrev();
        event.stopPropagation();
        event.preventDefault();
        return true;
      }
    });

    this.$search.keyup(function(event) {
      // Re-perform the search when the search value has changed.
      var val = $field.val().toLowerCase();
      if (searchValue !== val) {
        searchIndex = 0;
        searchParent = self._parent;
        searchValue = val;
        __searchNodes();
      }
    });

    // View -> Search...
    this._menu.addOption('View', 'Search...', {
      hotkeys: 'Ctrl+F',
      icon: "fa fa-search fa-lg",
      toolbarIndex: -1,
      description: "Toggle the visual style of the chains.",
      onActivated: function(editor) {
        editor.$search.removeClass('wcPlayHidden');
        $field.focus();
        $field.select();

        if (searchResults.length) {
          __searchNodes();
        }
      }
    });

    // Help -> Documentation...
    this._menu.addOption('Help', 'Documentation...', {
      icon: "fa fa-file-pdf-o fa-lg",
      description: "Open the documentation for wcPlay in another window.",
      onActivated: function(editor) {
        window.open('http://play.api.webcabin.org/', '_blank');
      }
    });

    this._menu.addSpacer('File', 'Save Script');
    this._menu.addSpacer('File', 'Import...');
    this._menu.addSpacer('Edit', 'Redo');
    this._menu.addSpacer('Edit', 'Delete');
    this._menu.addSpacer('View', 'Enter Composite');
    this._menu.addSpacer('View', 'Chain Style');
    this._menu.addSpacer('Debugging', 'Toggle Silence Mode');
    this._menu.addToolbarSpacer('File', 'Save Script');
    this._menu.addToolbarSpacer('File', 'Import...');
    this._menu.addToolbarSpacer('Edit', 'Redo');
    this._menu.addToolbarSpacer('Edit', 'Delete');
    this._menu.addToolbarSpacer('Edit', 'Create Composite');
    this._menu.addToolbarSpacer('View', 'Enter Composite');
    this._menu.addToolbarSpacer('View', 'Chain Style');
    this._menu.addToolbarSpacer('Debugging', 'Toggle Silence Mode');
    this._menu.addToolbarSpacer('Debugging', 'Step Script');
  },

  /**
   * Initializes the palette view.
   * @function wcPlayEditor#__setupPalette
   * @private
   */
  __setupPalette: function() {
    if (!this._engine) {
      return;
    }

    this._paletteSize = this._options.readOnly? 0: 300;
    this.onResized();

    if (this.$typeButton.length == 0) {
      // Create our top bar with buttons for each node type.
      this.$typeButton.push($('<button class="wcPlayEditorButton wcToggled" title="Show Entry Nodes.">Entry</button>'));
      this.$typeButton.push($('<button class="wcPlayEditorButton" title="Show Process Nodes.">Process</button>'));
      this.$typeButton.push($('<button class="wcPlayEditorButton" title="Show Storage Nodes.">Storage</button>'));
      this.$typeButton.push($('<button class="wcPlayEditorButton" title="Show Composite Nodes.">Composite</button>'));
      this.$palette.append(this.$typeButton[0]);
      this.$palette.append(this.$typeButton[1]);
      this.$palette.append(this.$typeButton[2]);
      this.$palette.append(this.$typeButton[3]);

      this.$typeArea.push($('<div class="wcPlayTypeArea">'));
      this.$typeArea.push($('<div class="wcPlayTypeArea wcPlayHidden">'));
      this.$typeArea.push($('<div class="wcPlayTypeArea wcPlayHidden">'));
      this.$typeArea.push($('<div class="wcPlayTypeArea wcPlayHidden">'));
      this.$paletteInner.append(this.$typeArea[0]);
      this.$paletteInner.append(this.$typeArea[1]);
      this.$paletteInner.append(this.$typeArea[2]);
      this.$paletteInner.append(this.$typeArea[3]);
    }

    // Empty out our current node library.
    if (this._nodeLibrary) {
      for (var cat in this._nodeLibrary) {
        for (var type in this._nodeLibrary[cat]) {
          var typeData = this._nodeLibrary[cat][type];
          typeData.$button.remove();
          typeData.$canvas.remove();
          typeData.$category.remove();
          for (var i = 0; i < typeData.nodes.length; ++i) {
            typeData.nodes[i].destroy();
          }
        }
      }

      this._nodeLibrary = {};
    }

    function __organize(data) {
      // Initialize the node category if it is new.
      if (!this._nodeLibrary.hasOwnProperty(data.category)) {
        this._nodeLibrary[data.category] = {};
      }

      // Further categorize the node by its type.
      if (!this._nodeLibrary[data.category].hasOwnProperty(data.nodeType)) {
        var typeData = {
          $category: $('<div class="wcPlayTypeCategory">'),
          $button: $('<button class="wcPlayCategoryButton" title="Toggle visibility of this category.">' + data.category + '</button>'),
          $canvas: $('<canvas class="wcPlayTypeCategoryArea">'),
          context: null,
          nodes: [],
        };
        typeData.context = typeData.$canvas[0].getContext('2d');
        typeData.$category.append(typeData.$button);
        typeData.$category.append(typeData.$canvas);
        this.$typeArea[this.__typeIndex(data.nodeType)].append(typeData.$category);

        (function __setupCollapseHandler(d) {
          d.$button.click(function() {
            if (!d.$button.hasClass('wcToggled')) {
              d.$button.addClass('wcToggled');
              d.$canvas.addClass('wcPlayHidden');
            } else {
              d.$button.removeClass('wcToggled');
              d.$canvas.removeClass('wcPlayHidden');
            }
          });
        })(typeData);

        this._nodeLibrary[data.category][data.nodeType] = typeData;
      }
    }

    // Initialize our node library.
    for (var i = 0; i < wcPlay.NODE_LIBRARY.length; ++i) {
      var data = wcPlay.NODE_LIBRARY[i];

      // Skip categories we are not showing.
      if (data.className !== 'wcNodeCompositeScript') {
        var catIndex = this._options.category.items.indexOf(data.category);
        if ((!this._options.category.isBlacklist && catIndex === -1) ||
            (this._options.category.isBlacklist && catIndex > -1)) {
          continue;
        }
      } else {
        continue;
      }

      __organize.call(this, data);

      // Now create an instance of the node.
      var node = new window[data.className](null);
      this._nodeLibrary[data.category][data.nodeType].nodes.push(node);
    }

    // Load our imported composite nodes as well.
    var composites = this._engine.importedComposites();
    for (var i = 0; i < composites.length; ++i) {
      var node = composites[i];
      
      __organize.call(this, node);

      this._nodeLibrary[node.category][node.nodeType].nodes.push(node);
    }

    // Now draw each of our palette nodes once so we can configure the size of the canvases.
    for (var cat in this._nodeLibrary) {
      for (var type in this._nodeLibrary[cat]) {
        var typeData = this._nodeLibrary[cat][type];
        typeData.$canvas.attr('width', this.$paletteInner.width());
        var yPos = this._drawStyle.palette.spacing;
        var xPos = this.$paletteInner.width() / 2;
        for (var i = 0; i < typeData.nodes.length; ++i) {
          this.__updateNode(typeData.nodes[i], 0, typeData.context);
          typeData.nodes[i].pos.x = xPos;
          typeData.nodes[i].pos.y = yPos;
          this.__drawNode(typeData.nodes[i], typeData.context);
          yPos += typeData.nodes[i]._meta.bounds.rect.height + this._drawStyle.palette.spacing;
        }
        typeData.$canvas.attr('height', yPos);
      }
    }

    var self = this;
    this.$typeButton[0].click(function() {
      self.$typeButton[0].addClass('wcToggled');
      self.$typeButton[1].removeClass('wcToggled');
      self.$typeButton[2].removeClass('wcToggled');
      self.$typeButton[3].removeClass('wcToggled');

      self.$typeArea[0].removeClass('wcPlayHidden');
      self.$typeArea[1].addClass('wcPlayHidden');
      self.$typeArea[2].addClass('wcPlayHidden');
      self.$typeArea[3].addClass('wcPlayHidden');
    });
    this.$typeButton[1].click(function() {
      self.$typeButton[0].removeClass('wcToggled');
      self.$typeButton[1].addClass('wcToggled');
      self.$typeButton[2].removeClass('wcToggled');
      self.$typeButton[3].removeClass('wcToggled');

      self.$typeArea[0].addClass('wcPlayHidden');
      self.$typeArea[1].removeClass('wcPlayHidden');
      self.$typeArea[2].addClass('wcPlayHidden');
      self.$typeArea[3].addClass('wcPlayHidden');
    });
    this.$typeButton[2].click(function() {
      self.$typeButton[0].removeClass('wcToggled');
      self.$typeButton[1].removeClass('wcToggled');
      self.$typeButton[2].addClass('wcToggled');
      self.$typeButton[3].removeClass('wcToggled');

      self.$typeArea[0].addClass('wcPlayHidden');
      self.$typeArea[1].addClass('wcPlayHidden');
      self.$typeArea[2].removeClass('wcPlayHidden');
      self.$typeArea[3].addClass('wcPlayHidden');
    });
    this.$typeButton[3].click(function() {
      self.$typeButton[0].removeClass('wcToggled');
      self.$typeButton[1].removeClass('wcToggled');
      self.$typeButton[2].removeClass('wcToggled');
      self.$typeButton[3].addClass('wcToggled');

      self.$typeArea[0].addClass('wcPlayHidden');
      self.$typeArea[1].addClass('wcPlayHidden');
      self.$typeArea[2].addClass('wcPlayHidden');
      self.$typeArea[3].removeClass('wcPlayHidden');
    });
  },

  /**
   * Draws each node in the palette view.
   * @function wcPlayEditor#__drawPalette
   * @private
   * @param {Number} elapsed - Elapsed time since last update.
   */
  __drawPalette: function(elapsed) {
    for (var cat in this._nodeLibrary) {
      for (var type in this._nodeLibrary[cat]) {

        // Ignore types that are not visible.
        if (!this.$typeButton[this.__typeIndex(type)].hasClass('wcToggled')) continue;

        var typeData = this._nodeLibrary[cat][type];

        // Ignore categories that are not visible.
        if (typeData.$button.hasClass('wcToggled')) continue;

        var yPos = this._drawStyle.palette.spacing;
        var xPos = this.$paletteInner.width() / 2;
        typeData.$canvas.attr('width', this.$paletteInner.width());
        typeData.context.clearRect(0, 0, typeData.$canvas.width(), typeData.$canvas.height());
        typeData.context.save();

        for (var i = 0; i < typeData.nodes.length; ++i) {
          this.__updateNode(typeData.nodes[i], 0, typeData.context);
          typeData.nodes[i].pos.x = xPos;
          typeData.nodes[i].pos.y = yPos;
          this.__drawNode(typeData.nodes[i], typeData.context, true);
          yPos += typeData.nodes[i]._meta.bounds.rect.height + this._drawStyle.palette.spacing;
        }

        typeData.context.restore();
      }
    }
  },

  /**
   * Draws a list of nodes on the canvas.
   * @function wcPlayEditor#__drawNodes
   * @private
   * @param {wcNode[]} nodes - The node to render.
   * @param {external:Canvas~Context} context - The canvas context to render on.
   */
  __drawNodes: function(nodes, context) {
    for (var i = 0; i < nodes.length; ++i) {
      this.__drawNode(nodes[i], context);
    }
  },

  /**
   * Draws a single node on the canvas at a given position.
   * @function wcPlayEditor#__drawNode
   * @private
   * @param {wcNode} node - The node to render.
   * @param {external:Canvas~Context} context - The canvas context to render on.
   * @param {Boolean} [isPalette] - If true, this node will be rendered for the palette view. 
   */
  __drawNode: function(node, context, isPalette) {
    // Ignore drawing if the node is outside of view.
    if (!isPalette && !this.__rectOnRect(node._meta.bounds.farRect, this._viewportBounds, node.pos)) {
      node._meta.visible = false;
      return;
    }

    node._meta.visible = true;
    // this._nodeDrawCount += 1;

    // Show an additional bounding rect around selected nodes.
    if (this._selectedNodes.indexOf(node) > -1) {
      this.__drawRoundedRect(node._meta.bounds.rect, "rgba(0, 255, 255, 0.25)", -1, 10, context, node.pos);
      this.__drawRoundedRect(node._meta.bounds.rect, "darkcyan", 2, 10, context, node.pos);
    }

    // Now use our measurements to draw our node.
    this.__drawCenter(node, context, isPalette);
    this.__drawEntryLinks(node, context, node._meta.bounds.entryOuter.width);
    this.__drawExitLinks(node, context, node._meta.bounds.entryOuter.height + node._meta.bounds.centerOuter.height, node._meta.bounds.exitOuter.width);

    // Add a collapse button to the node in the left margin of the title.
    context.save();
    context.fillStyle = (this._highlightDebugLog && this._highlightNode === node? "black": "white");
    context.strokeStyle = "black";
    context.lineWidth = 1;
    context.fillRect(node.pos.x + node._meta.bounds.debugLog.left, node.pos.y + node._meta.bounds.debugLog.top, node._meta.bounds.debugLog.width, node._meta.bounds.debugLog.height);
    context.strokeRect(node.pos.x + node._meta.bounds.debugLog.left, node.pos.y + node._meta.bounds.debugLog.top, node._meta.bounds.debugLog.width, node._meta.bounds.debugLog.height);

    context.strokeStyle = (node._log? "red": (this._highlightDebugLog && this._highlightNode === node? "white": "black"));
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(node.pos.x + node._meta.bounds.debugLog.left + 1, node.pos.y + node._meta.bounds.debugLog.top + 1);
    context.lineTo(node.pos.x + node._meta.bounds.debugLog.left + node._meta.bounds.debugLog.width/2, node.pos.y + node._meta.bounds.debugLog.top + node._meta.bounds.debugLog.height/2);
    context.lineTo(node.pos.x + node._meta.bounds.debugLog.left + 1, node.pos.y + node._meta.bounds.debugLog.top + node._meta.bounds.debugLog.height - 1);
    context.moveTo(node.pos.x + node._meta.bounds.debugLog.left + node._meta.bounds.debugLog.width/2, node.pos.y + node._meta.bounds.debugLog.top + node._meta.bounds.debugLog.height - 2);
    context.lineTo(node.pos.x + node._meta.bounds.debugLog.left + node._meta.bounds.debugLog.width, node.pos.y + node._meta.bounds.debugLog.top + node._meta.bounds.debugLog.height - 2);
    context.stroke();
    context.restore();

    // Add breakpoint button to the node in the right margin of the title.
    context.save();
    context.fillStyle = (this._highlightBreakpoint && this._highlightNode === node? "black": "white");
    context.fillRect(node.pos.x + node._meta.bounds.breakpoint.left, node.pos.y + node._meta.bounds.breakpoint.top, node._meta.bounds.breakpoint.width, node._meta.bounds.breakpoint.height);

    context.strokeStyle = (node._break? "red": (this._highlightBreakpoint && this._highlightNode === node? "white": "black"));
    context.fillStyle = "red";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(node.pos.x + node._meta.bounds.breakpoint.left + node._meta.bounds.breakpoint.width/2, node.pos.y + node._meta.bounds.breakpoint.top + node._meta.bounds.breakpoint.height/2, Math.min(node._meta.bounds.breakpoint.width/2-2, node._meta.bounds.breakpoint.height/2-2), 0, 2 * Math.PI);
    node._break && context.fill();
    context.stroke();

    context.strokeStyle = "black";
    context.lineWidth = 1;
    context.strokeRect(node.pos.x + node._meta.bounds.breakpoint.left, node.pos.y + node._meta.bounds.breakpoint.top, node._meta.bounds.breakpoint.width, node._meta.bounds.breakpoint.height);
    context.restore();

    // Increase the nodes border thickness when flashing.
    if (node.isBroken()) {
      this.__drawRoundedRect(node._meta.bounds.inner, "#CC0000", 5, this._drawStyle.node.radius, context, node.pos);
    } else if (node._meta.flashDelta) {
      this.__drawRoundedRect(node._meta.bounds.inner, "yellow", 2, this._drawStyle.node.radius, context, node.pos);
    }
  },

  /**
   * Measures the space to render entry links for a node.
   * @function wcPlayEditor#__measureEntryLinkOuter
   * @private
   * @param {wcNode} node - The node to measure.
   * @param {external:Canvas~Context} context - The canvas context.
   * @returns {wcPlayEditor~Rect} - A bounding rectangle.
   */
  __measureEntryLinkOuter: function(node, context) {
    var bounds = {
      top: 0,
      left: 0,
      width: 0,
      height: 0,
    };

    this.__setCanvasFont(this._font.links, context);

    var links = node.chain.entry;
    for (var i = 0; i < links.length; ++i) {
      bounds.width += context.measureText(links[i].name).width + this._drawStyle.links.spacing;
    }

    bounds.left -= bounds.width/2 + this._drawStyle.links.margin;
    bounds.width += this._drawStyle.links.margin * 2;
    if (node.chain.entry.length) {
      bounds.height = this._font.links.size + this._drawStyle.links.padding + this._drawStyle.links.length;
    }
    return bounds;
  },

  /**
   * Measures the space to render exit links for a node.
   * @function wcPlayEditor#__measureExitLinkOuter
   * @private
   * @param {wcNode} node - The node to measure.
   * @param {external:Canvas~Context} context - The canvas context.
   * @param {Number} offset - The top position to measure the links.
   * @returns {wcPlayEditor~Rect} - A bounding rectangle.
   */
  __measureExitLinkOuter: function(node, context, offset) {
    var bounds = {
      top: offset,
      left: 0,
      width: 0,
      height: 0,
    };

    this.__setCanvasFont(this._font.links, context);

    var links = node.chain.exit;
    for (var i = 0; i < links.length; ++i) {
      bounds.width += context.measureText(links[i].name).width + this._drawStyle.links.spacing;
    }

    bounds.left -= bounds.width/2 + this._drawStyle.links.margin;
    bounds.width += this._drawStyle.links.margin * 2;
    if (node.chain.exit.length) {
      bounds.height = this._font.links.size + this._drawStyle.links.padding + this._drawStyle.links.length;
    }
    return bounds;
  },

  /**
   * Measures the space to render the center area for a node.
   * @function wcPlayEditor#__measureOuter
   * @private
   * @param {wcNode} node - The node to measure.
   * @param {external:Canvas~Context} context - The canvas context.
   * @param {Number} offset - The upper offset.
   * @returns {wcPlayEditor~Rect} - A bounding rectangle. The height is only the amount of space rendered within the node bounds (links stick out).
   */
  __measureOuter: function(node, context, offset) {
    var bounds = {
      top: offset,
      left: 0,
      width: 0,
      height: this._font.title.size + this._drawStyle.title.spacing + this._drawStyle.links.padding,
    };

    // Measure the title bar area.
    this.__setCanvasFont(this._font.title, context);
    bounds.width = context.measureText(this._drawStyle.title.wrapL + node.type + ': ' + this._drawStyle.title.wrapR).width;
    this.__setCanvasFont(this._font.titleDesc, context);
    bounds.width += context.measureText(this._drawStyle.title.nameWrapL + (node.name || this._drawStyle.title.placeholder) + this._drawStyle.title.nameWrapR).width;
    if (node.description() || node.details()) {
      this.__setCanvasFont(this._font.details, context);
      bounds.width += context.measureText(this._drawStyle.title.details).width;
    }

    // Measure the node's viewport.
    if (node._viewportSize) {
      bounds.width = Math.max(bounds.width, node._viewportSize.x);
      bounds.height += node._viewportSize.y + this._drawStyle.property.spacing;
    }

    // Measure properties.
    var propWidth = 0;
    var valueWidth = 0;
    var initialWidth = 0;
    var props = node.properties;
    for (var i = 0; i < props.length; ++i) {
      bounds.height += this._font.property.size + this._drawStyle.property.spacing;

      // Property name.
      this.__setCanvasFont(this._font.property, context);
      propWidth = Math.max(context.measureText(props[i].name + ': ').width, propWidth);

      // Property value.
      this.__setCanvasFont(this._font.value, context);
      valueWidth = Math.max(context.measureText(this._drawStyle.property.valueWrapL + this.__drawPropertyValue(node, props[i]) + this._drawStyle.property.valueWrapR).width, this._drawStyle.property.minLength, valueWidth);

      // Property initial value.
      this.__setCanvasFont(this._font.initialValue, context);
      initialWidth = Math.max(context.measureText(this._drawStyle.property.initialWrapL + this.__drawPropertyValue(node, props[i], true) + this._drawStyle.property.initialWrapR).width, this._drawStyle.property.minLength, initialWidth);
    }

    bounds.width = Math.max(propWidth + valueWidth + initialWidth, bounds.width) + this._drawStyle.node.margin * 2;
    bounds.left -= bounds.width/2;
    bounds.propWidth = propWidth;
    bounds.valueWidth = valueWidth;
    bounds.initialWidth = initialWidth;
    return bounds;
  },

  /**
   * Measures the space to render the center area for a node.
   * @function wcPlayEditor#__measureCenter
   * @private
   * @param {wcNode} node - The node to draw.
   * @param {external:Canvas~Context} context - The canvas context.
   * @param {wcPlayEditor~Rect} rect - The bounding area to draw in.
   */
  __measureCenter: function(node, context, rect) {
    var upper = node.chain.entry.length? this._font.links.size + this._drawStyle.links.padding: 0;
    var lower = node.chain.exit.length? this._font.links.size + this._drawStyle.links.padding: 0;

    node._meta.bounds.center = rect;
    node._meta.bounds.inputBounds = [];
    node._meta.bounds.outputBounds = [];
    node._meta.bounds.propertyBounds = [];
    node._meta.bounds.valueBounds = [];
    node._meta.bounds.initialBounds = [];

    context.save();

    // Measure the title bar area.
    this.__setCanvasFont(this._font.title, context);
    var titleTypeWidth = context.measureText(this._drawStyle.title.wrapL + node.type + ': ').width;
    var titleWrapRWidth = context.measureText(this._drawStyle.title.wrapR).width;
    this.__setCanvasFont(this._font.titleDesc, context);
    var titleTextWidth = context.measureText(this._drawStyle.title.nameWrapL + (node.name || this._drawStyle.title.placeholder) + this._drawStyle.title.nameWrapR).width;
    var titleDetailsWidth = 0;
    if (node.description() || node.details()) {
      this.__setCanvasFont(this._font.details, context);
      titleDetailsWidth = context.measureText(this._drawStyle.title.details).width;
    }

    node._meta.bounds.titleBounds = {
      top: rect.top,
      left: rect.left + titleTypeWidth + (rect.width - (titleTypeWidth + titleWrapRWidth + titleTextWidth + titleDetailsWidth))/2,
      width: titleTextWidth,
      height: this._font.title.size + this._drawStyle.title.spacing - 1,

      typeWidth: titleTypeWidth,
      wrapRWidth: titleWrapRWidth,
      textWidth: titleTextWidth,
    };

    node._meta.bounds.detailsBounds = {
      top: rect.top,
      left: rect.left + rect.width - this._drawStyle.node.margin - titleDetailsWidth,
      width: titleDetailsWidth,
      height: this._font.details.size + this._drawStyle.title.spacing - 1,
    };

    // Title Lower Bar
    upper = this._font.title.size;
    upper += this._drawStyle.title.spacing;

    // Draw the node's viewport.
    if (node._viewportSize) {
      // Calculate the translation to make the viewport 0,0.
      node._meta.bounds.viewportBounds = {
        top: rect.top + upper,
        left: rect.left + (rect.width/2 - node._viewportSize.x/2),
        width: node._viewportSize.x,
        height: node._viewportSize.y,
      };

      upper += node._viewportSize.y + this._drawStyle.property.spacing;
    }

    var linkRect;
    var props = node.properties;
    for (var i = 0; i < props.length; ++i) {
      upper += this._font.property.size;
      // Property name.
      var propertyBound = {
        rect: {
          top: rect.top + upper - this._font.property.size,
          left: rect.left + this._drawStyle.node.margin,
          width: rect.width - this._drawStyle.node.margin * 2,
          height: this._font.property.size + this._drawStyle.property.spacing,
        },
        name: props[i].name,
      };
      node._meta.bounds.propertyBounds.push(propertyBound);

      // Initial property value.
      var initialBound = {
        rect: {
          top: rect.top + upper - this._font.property.size,
          left: rect.left + rect.width - this._drawStyle.node.margin - rect.initialWidth,
          width: rect.initialWidth,
          height: this._font.property.size + this._drawStyle.property.spacing,
        },
        name: props[i].name,
      };
      node._meta.bounds.initialBounds.push(initialBound);

      // Property value.
      var valueBound = {
        rect: {
          top: rect.top + upper - this._font.property.size,
          left: rect.left + rect.width - this._drawStyle.node.margin - rect.valueWidth - rect.initialWidth,
          width: (this._engine.isRunning()? rect.valueWidth: 0),
          height: this._font.property.size + this._drawStyle.property.spacing,
        },
        name: props[i].name,
      };
      node._meta.bounds.valueBounds.push(valueBound);

      // Property input.
      linkRect = {
        top: rect.top + upper - this._font.property.size/3 - this._drawStyle.links.width/2 - 5,
        left: rect.left - this._drawStyle.links.length,
        width: this._drawStyle.links.length,
        height: (props[i].options && props[i].options.input)? this._drawStyle.links.width + 10: 0,
      };

      node._meta.bounds.inputBounds.push({
        rect: linkRect,
        point: {
          x: linkRect.left + linkRect.width/3 - 2,
          y: linkRect.top + linkRect.height/2,
        },
        name: props[i].name,
      });

      // Property output.
      linkRect = {
        top: rect.top + upper - this._font.property.size/3 - this._drawStyle.links.width/2 - 5,
        left: rect.left + rect.width,
        width: this._drawStyle.links.length,
        height: (props[i].options && props[i].options.output)? this._drawStyle.links.width + 10: 0,
      }

      node._meta.bounds.outputBounds.push({
        rect: linkRect,
        point: {
          x: linkRect.left + linkRect.width + 1,
          y: linkRect.top + linkRect.height/2,
        },
        name: props[i].name,
      });

      upper += this._drawStyle.property.spacing;
    }

    context.restore();
  },

  /**
   * Draws the entry links of a node.
   * @function wcPlayEditor#__measureEntryLinks
   * @private
   * @param {wcNode} node - The node to draw.
   * @param {external:Canvas~Context} context - The canvas context.
   * @param {Number} width - The width of the area to draw in.
   */
  __measureEntryLinks: function(node, context, width) {
    node._meta.bounds.entryBounds = [];

    var xPos = -width/2 + this._drawStyle.links.margin;
    var yPos = this._drawStyle.links.length + this._font.links.size;

    context.save();
    this.__setCanvasFont(this._font.links, context);

    var links = node.chain.entry;
    for (var i = 0; i < links.length; ++i) {
      // Link label
      var w = context.measureText(links[i].name).width + this._drawStyle.links.spacing;

      // Link connector
      var rect = {
        top: yPos - this._drawStyle.links.length - this._font.links.size,
        left: xPos + w/2 - this._drawStyle.links.width/2,
        width: this._drawStyle.links.width,
        height: this._drawStyle.links.length,
      };

      // Expand the bounding rect just a little so it is easier to click.
      rect.left -= 5;
      rect.width += 10;

      node._meta.bounds.entryBounds.push({
        rect: rect,
        point: {
          x: rect.left + rect.width/2,
          y: rect.top + rect.height/3 - 2,
        },
        name: links[i].name,
      });

      xPos += w;
    }
    context.restore();
  },

  /**
   * Draws the exit links of a node.
   * @function wcPlayEditor#__measureExitLinks
   * @private
   * @param {wcNode} node - The node to draw.
   * @param {external:Canvas~Context} context - The canvas context.
   * @param {Number} offset - The upper offset.
   * @param {Number} width - The width of the area to draw in.
   */
  __measureExitLinks: function(node, context, offset, width) {
    node._meta.bounds.exitBounds = [];

    var xPos = -width/2 + this._drawStyle.links.margin;
    var yPos = offset + this._font.links.size;

    context.save();
    this.__setCanvasFont(this._font.links, context);

    var links = node.chain.exit;
    for (var i = 0; i < links.length; ++i) {
      // Link label
      var w = context.measureText(links[i].name).width + this._drawStyle.links.spacing;

      // Link connector
      var rect = {
        top: yPos + this._drawStyle.links.padding,
        left: xPos + w/2 - this._drawStyle.links.width/2,
        width: this._drawStyle.links.width,
        height: this._drawStyle.links.length,
      };

      // Expand the bounding rect just a little so it is easier to click.
      rect.left -= 5;
      rect.width += 10;

      node._meta.bounds.exitBounds.push({
        rect: rect,
        point: {
          x: rect.left + rect.width/2,
          y: rect.top + rect.height + 1,
        },
        name: links[i].name,
      });

      xPos += w;
    }
    context.restore();
  },

  /**
   * Measures the space to render the center area for a node.
   * @function wcPlayEditor#__drawCenter
   * @private
   * @param {wcNode} node - The node to draw.
   * @param {external:Canvas~Context} context - The canvas context.
   * @param {Boolean} [isPalette] - If true, this node will be rendered for the palette view. 
   * @returns {wcPlayEditor~DrawPropertyData} - Contains bounding rectangles for various drawings.
   */
  __drawCenter: function(node, context, isPalette) {
    var upper = node.chain.entry.length? this._font.links.size + this._drawStyle.links.padding: 0;
    var lower = node.chain.exit.length? this._font.links.size + this._drawStyle.links.padding: 0;

    // Node background
    context.save();
      var left = node.pos.x + node._meta.bounds.center.left + node._meta.bounds.center.width/2;
      var top = node.pos.y + node._meta.bounds.center.top + (node._meta.bounds.center.height)/2;
      var gradient = context.createRadialGradient(left, top, 10, left, top, Math.max(node._meta.bounds.center.width, node._meta.bounds.center.height));
      gradient.addColorStop(0, (node.enabled()? node._meta.color: '#555'));
      gradient.addColorStop(1, "white");
      context.fillStyle = context.strokeStyle = gradient;
      context.lineJoin = "round";
      var diameter = this._drawStyle.node.radius*2;
      context.lineWidth = diameter;
      context.fillRect(node.pos.x + node._meta.bounds.center.left + diameter/2, node.pos.y + node._meta.bounds.center.top - upper + diameter/2, node._meta.bounds.center.width - diameter, node._meta.bounds.center.height + upper + lower - diameter);
      context.strokeRect(node.pos.x + node._meta.bounds.center.left + diameter/2, node.pos.y + node._meta.bounds.center.top - upper + diameter/2, node._meta.bounds.center.width - diameter, node._meta.bounds.center.height + upper + lower - diameter);
    context.restore();
    this.__drawRoundedRect({
      left: node._meta.bounds.center.left,
      top: node._meta.bounds.center.top - upper,
      width: node._meta.bounds.center.width,
      height: node._meta.bounds.center.height + upper + lower
    }, node._meta.color, 3, this._drawStyle.node.radius, context, node.pos);

    // Title Upper Bar
    upper = 0;
    if (node.chain.entry.length) {
      context.strokeStyle = node._meta.color;
      context.beginPath();
      context.moveTo(node.pos.x + node._meta.bounds.center.left, node.pos.y + node._meta.bounds.center.top + upper);
      context.lineTo(node.pos.x + node._meta.bounds.center.left + node._meta.bounds.center.width, node.pos.y + node._meta.bounds.center.top + upper);
      context.stroke();
    }

    // Highlight title text.
    if (!this._options.readOnly && !isPalette) {
      if (this._highlightTitle && this._highlightNode === node) {
        this.__drawRoundedRect(node._meta.bounds.titleBounds, this._drawStyle.property.highlightColor, this._drawStyle.property.highlightBorder, this._font.title.size/2, context, node.pos);
      } else if (this._highlightNode === node) {
        this.__drawRoundedRect(node._meta.bounds.titleBounds, this._drawStyle.property.normalColor, this._drawStyle.property.normalBorder, this._font.title.size/2, context, node.pos);
      }
    }

    // Highlight details button.
    if (!this._options.readOnly && node._meta.bounds.detailsBounds.width > 0 && !isPalette) {
      if (this._highlightDetails && this._highlightNode === node) {
        this.__drawRoundedRect(node._meta.bounds.detailsBounds, this._drawStyle.property.highlightColor, this._drawStyle.property.highlightBorder, this._font.title.size/2, context, node.pos);
      } else if (this._highlightNode === node) {
        this.__drawRoundedRect(node._meta.bounds.detailsBounds, this._drawStyle.property.normalColor, this._drawStyle.property.normalBorder, this._font.title.size/2, context, node.pos);
      }
    }

    // Title Text
    context.save();
    upper += this._font.title.size;
    context.fillStyle = "black";
    context.strokeStyle = "black";
    context.textAlign = "left";
    this.__setCanvasFont(this._font.title, context);
    context.fillText(this._drawStyle.title.wrapL + node.type + ': ', node.pos.x + node._meta.bounds.titleBounds.left - node._meta.bounds.titleBounds.typeWidth, node.pos.y + node._meta.bounds.titleBounds.top + upper);

    this.__setCanvasFont(this._font.titleDesc, context);
    context.fillText(this._drawStyle.title.nameWrapL + (node.name || this._drawStyle.title.placeholder) + this._drawStyle.title.nameWrapR, node.pos.x + node._meta.bounds.titleBounds.left, node.pos.y + node._meta.bounds.titleBounds.top + upper);

    context.textAlign = "right";
    this.__setCanvasFont(this._font.title, context);
    context.fillText(this._drawStyle.title.wrapR, node.pos.x + node._meta.bounds.titleBounds.left, node.pos.y + node._meta.bounds.titleBounds.top + upper);

    if (node.description() || node.details()) {
      this.__setCanvasFont(this._font.details, context);
      context.fillText(this._drawStyle.title.details, node.pos.x + node._meta.bounds.detailsBounds.left + node._meta.bounds.detailsBounds.width, node.pos.y + node._meta.bounds.detailsBounds.top + this._font.details.size);
    }
    context.restore();

    // Title Lower Bar
    upper += this._drawStyle.title.spacing;

    // Draw the node's viewport.
    if (node._meta.bounds.viewportBounds) {
      context.save();
      // Translate the canvas so 0,0 is the beginning of the viewport.
      context.translate(node.pos.x + node._meta.bounds.viewportBounds.left, node.pos.y + node._meta.bounds.viewportBounds.top);

      // Draw the viewport.
      node.onViewportDraw(context, this._options.readOnly);

      // Now revert the translation.
      context.translate(-node.pos.x - node._meta.bounds.viewportBounds.left, -node.pos.y - node._meta.bounds.viewportBounds.top);
      context.restore();

      upper += node._viewportSize.y + this._drawStyle.property.spacing;
    }

    context.save();
    var props = node.properties;
    for (var i = 0; i < props.length; ++i) {
      upper += this._font.property.size;

      var propertyBound = null;
      for (var a = 0; a < node._meta.bounds.propertyBounds.length; ++a) {
        if (node._meta.bounds.propertyBounds[a].name === props[i].name) {
          propertyBound = node._meta.bounds.propertyBounds[a];
          break;
        }
      }

      // Initial property value.
      var initialBound = null;
      for (var a = 0; a < node._meta.bounds.initialBounds.length; ++a) {
        if (node._meta.bounds.initialBounds[a].name === props[i].name) {
          initialBound = node._meta.bounds.initialBounds[a];
          break;
        }
      }

      // Property value.
      var valueBound = null;
      for (var a = 0; a < node._meta.bounds.valueBounds.length; ++a) {
        if (node._meta.bounds.valueBounds[a].name === props[i].name) {
          valueBound = node._meta.bounds.valueBounds[a];
          break;
        }
      }

      // Highlight hovered values.
      if (!this._options.readOnly && !isPalette) {
        if (this._engine && this._engine.isRunning()) {
          if (this._highlightNode === node && this._highlightPropertyValue && this._highlightPropertyValue.name === props[i].name) {
            this.__drawRoundedRect(valueBound.rect, this._drawStyle.property.highlightColor, this._drawStyle.property.highlightBorder, this._font.property.size/2, context, node.pos);
          } else if (this._highlightNode === node) {
            this.__drawRoundedRect(valueBound.rect, this._drawStyle.property.normalColor, this._drawStyle.property.normalBorder, this._font.property.size/2, context, node.pos);
          }
        }

        if (this._highlightNode === node && this._highlightPropertyInitialValue && this._highlightPropertyInitialValue.name === props[i].name) {
          this.__drawRoundedRect(initialBound.rect, this._drawStyle.property.highlightColor, this._drawStyle.property.highlightBorder, this._font.property.size/2, context, node.pos);
        } else if (this._highlightNode === node) {
          this.__drawRoundedRect(initialBound.rect, this._drawStyle.property.normalColor, this._drawStyle.property.normalBorder, this._font.property.size/2, context, node.pos);
        }
      }

      context.fillStyle = "black";
      context.textAlign = "left";
      this.__setCanvasFont(this._font.property, context);
      context.fillText(props[i].name + ': ', node.pos.x + node._meta.bounds.center.left + this._drawStyle.node.margin, node.pos.y + node._meta.bounds.center.top + upper);

      context.textAlign = "right";
      this.__setCanvasFont(this._font.initialValue, context);
      context.fillStyle = "black";
      context.fillText(this._drawStyle.property.initialWrapL + this.__drawPropertyValue(node, props[i], true) + this._drawStyle.property.initialWrapR, node.pos.x + node._meta.bounds.center.left + node._meta.bounds.center.width - this._drawStyle.node.margin, node.pos.y + node._meta.bounds.center.top + upper);

      if (this._engine && this._engine.isRunning()) {
        this.__setCanvasFont(this._font.value, context);
        context.fillStyle = "#444444";
        context.fillText(this._drawStyle.property.valueWrapL + this.__drawPropertyValue(node, props[i]) + this._drawStyle.property.valueWrapR, node.pos.x + node._meta.bounds.center.left + node._meta.bounds.center.width - this._drawStyle.node.margin - node._meta.bounds.center.initialWidth, node.pos.y + node._meta.bounds.center.top + upper);
      }

      // Property input.
      var linkRect = null;
      for (var a = 0; a < node._meta.bounds.inputBounds.length; ++a) {
        if (node._meta.bounds.inputBounds[a].name === props[i].name) {
          linkRect = node._meta.bounds.inputBounds[a].rect;
          break;
        }
      }

      if (props[i].options && props[i].options.input) {
        context.fillStyle = (this._highlightInputLink && this._highlightInputLink.name === props[i].name && this._highlightNode === node? "cyan": props[i].inputMeta.color);
        context.strokeStyle = "black";
        context.beginPath();
        context.moveTo(node.pos.x + linkRect.left, node.pos.y + linkRect.top + 5);
        context.lineTo(node.pos.x + linkRect.left + linkRect.width, node.pos.y + linkRect.top + 5);
        context.lineTo(node.pos.x + linkRect.left + linkRect.width, node.pos.y + linkRect.top + linkRect.height - 5);
        context.lineTo(node.pos.x + linkRect.left, node.pos.y + linkRect.top + linkRect.height - 5);
        context.lineTo(node.pos.x + linkRect.left + linkRect.width/3, node.pos.y + linkRect.top + linkRect.height/2);
        context.closePath();
        context.stroke();
        context.fill();
      }

      // Property output.
      var linkRect = null;
      for (var a = 0; a < node._meta.bounds.outputBounds.length; ++a) {
        if (node._meta.bounds.outputBounds[a].name === props[i].name) {
          linkRect = node._meta.bounds.outputBounds[a].rect;
          break;
        }
      }

      if (props[i].options && props[i].options.output) {
        context.fillStyle = (this._highlightOutputLink && this._highlightOutputLink.name === props[i].name && this._highlightNode === node? "cyan": props[i].outputMeta.color);
        context.strokeStyle = "black";
        context.beginPath();
        context.moveTo(node.pos.x + linkRect.left, node.pos.y + linkRect.top + 5);
        context.lineTo(node.pos.x + linkRect.left + linkRect.width/2, node.pos.y + linkRect.top + 5);
        context.lineTo(node.pos.x + linkRect.left + linkRect.width, node.pos.y + linkRect.top + linkRect.height/2);
        context.lineTo(node.pos.x + linkRect.left + linkRect.width/2, node.pos.y + linkRect.top + linkRect.height - 5);
        context.lineTo(node.pos.x + linkRect.left, node.pos.y + linkRect.top + linkRect.height - 5);
        context.closePath();
        context.stroke();
        context.fill();
      }

      upper += this._drawStyle.property.spacing;
    }

    // Lower Bar
    if (node.chain.exit.length) {
      context.strokeStyle = node._meta.color;
      context.beginPath();
      context.moveTo(node.pos.x + node._meta.bounds.center.left, node.pos.y + node._meta.bounds.center.top + node._meta.bounds.center.height);
      context.lineTo(node.pos.x + node._meta.bounds.center.left + node._meta.bounds.center.width, node.pos.y + node._meta.bounds.center.top + node._meta.bounds.center.height);
      context.stroke();
    }

    context.restore();
  },

  /**
   * Draws the entry links of a node.
   * @function wcPlayEditor#__drawEntryLinks
   * @private
   * @param {wcNode} node - The node to draw.
   * @param {external:Canvas~Context} context - The canvas context.
   * @param {Number} width - The width of the area to draw in.
   */
  __drawEntryLinks: function(node, context, width) {
    var xPos = node.pos.x - width/2 + this._drawStyle.links.margin;
    var yPos = node.pos.y + this._drawStyle.links.length + this._font.links.size;

    context.save();
    this.__setCanvasFont(this._font.links, context);

    var links = node.chain.entry;
    for (var i = 0; i < links.length; ++i) {
      // Link label
      context.fillStyle = "black";
      var w = context.measureText(links[i].name).width + this._drawStyle.links.spacing;
      context.fillText(links[i].name, xPos + this._drawStyle.links.spacing/2, yPos);

      // Link connector
      var rect = null;
      for (var a = 0; a < node._meta.bounds.entryBounds.length; ++a) {
        if (node._meta.bounds.entryBounds[a].name === links[i].name) {
          rect = node._meta.bounds.entryBounds[a].rect;
          break;
        }
      }

      context.fillStyle = (this._highlightEntryLink && this._highlightEntryLink.name === links[i].name && this._highlightNode === node? "cyan": links[i].meta.color);
      context.strokeStyle = "black";
      context.beginPath();
      context.moveTo(node.pos.x + rect.left + 5, node.pos.y + rect.top);
      context.lineTo(node.pos.x + rect.left + rect.width/2, node.pos.y + rect.top + rect.height/3);
      context.lineTo(node.pos.x + rect.left + rect.width - 5, node.pos.y + rect.top);
      context.lineTo(node.pos.x + rect.left + rect.width - 5, node.pos.y + rect.top + rect.height);
      context.lineTo(node.pos.x + rect.left + 5, node.pos.y + rect.top + rect.height);
      context.closePath();
      context.stroke();
      context.fill();

      xPos += w;
    }

    context.restore();
  },

  /**
   * Draws the exit links of a node.
   * @function wcPlayEditor#__drawExitLinks
   * @private
   * @param {wcNode} node - The node to draw.
   * @param {external:Canvas~Context} context - The canvas context.
   * @param {Number} offset - An offset height.
   * @param {Number} width - The width of the area to draw in.
   */
  __drawExitLinks: function(node, context, offset, width) {
    var xPos = node.pos.x - width/2 + this._drawStyle.links.margin;
    var yPos = node.pos.y + offset + this._font.links.size;

    context.save();
    this.__setCanvasFont(this._font.links, context);

    var links = node.chain.exit;
    for (var i = 0; i < links.length; ++i) {
      // Link label
      context.fillStyle = "black";
      var w = context.measureText(links[i].name).width + this._drawStyle.links.spacing;
      context.fillText(links[i].name, xPos + this._drawStyle.links.spacing/2, yPos);

      // Link connector
      var rect = null;
      for (var a = 0; a < node._meta.bounds.exitBounds.length; ++a) {
        if (node._meta.bounds.exitBounds[a].name === links[i].name) {
          rect = node._meta.bounds.exitBounds[a].rect;
          break;
        }
      }

      context.fillStyle = (this._highlightExitLink && this._highlightExitLink.name === links[i].name && this._highlightNode === node? "cyan": links[i].meta.color);
      context.strokeStyle = "black";
      context.beginPath();
      context.moveTo(node.pos.x + rect.left + 5, node.pos.y + rect.top);
      context.lineTo(node.pos.x + rect.left + rect.width - 5, node.pos.y + rect.top);
      context.lineTo(node.pos.x + rect.left + rect.width - 5, node.pos.y + rect.top + rect.height/2);
      context.lineTo(node.pos.x + rect.left + rect.width/2, node.pos.y + rect.top + rect.height);
      context.lineTo(node.pos.x + rect.left + 5, node.pos.y + rect.top + rect.height/2);
      context.closePath();
      context.stroke();
      context.fill();
      xPos += w;
    }

    context.restore();
  },

  /**
   * Draws connection chains for a list of nodes.
   * @function wcPlayEditor#__drawChains
   * @private
   * @param {wcNode[]} nodes - A list of nodes to render chains for.
   * @param {external:Canvas~Context} context - The canvas context.
   */
  __drawChains: function(nodes, context) {
    for (var i = 0; i < nodes.length; ++i) {
      this.__drawNodeChains(nodes[i], context);
    }
  },

  /**
   * Draws connection chains for a single node.
   * @function wcPlayEditor#__drawNodeChains
   * @private
   * @param {wcNode} node - A node to render chains for.
   * @param {external:Canvas~Context} context - The canvas context.
   */
  __drawNodeChains: function(node, context) {
    for (var i = 0; i < node.chain.exit.length; ++i) {
      var exitLink = node.chain.exit[i];

      // Skip links that are not chained with anything.
      if (!exitLink.links.length) {
        continue;
      }

      var exitPoint;
      // Find the corresponding meta data for this link.
      for (var a = 0; a < node._meta.bounds.exitBounds.length; ++a) {
        if (node._meta.bounds.exitBounds[a].name === exitLink.name) {
          exitPoint = node._meta.bounds.exitBounds[a].point;
          break;
        }
      }

      // Skip links that do not contain meta data (should not happen).
      if (!exitPoint) {
        console.log('ERROR: Attempted to draw chains for an exit link that has no meta data.');
        continue;
      }

      // Follow each chain to their entry links.
      for (var a = 0; a < exitLink.links.length; ++a) {
        var targetNode = exitLink.links[a].node;
        var targetName = exitLink.links[a].name;
        var entryLink;

        // Skip pairs of nodes that are not visible.
        if (!node._meta.visible && !targetNode._meta.visible) {
          continue;
        }

        for (var b = 0; b < targetNode.chain.entry.length; ++b) {
          if (targetNode.chain.entry[b].name === targetName) {
            entryLink = targetNode.chain.entry[b];
            break;
          }
        }

        // The link for this chain was not found.
        if (!entryLink) {
          console.log('ERROR: Attempted to chain an exit link to an entry link that was not found.');
          continue;
        }

        // Find the corresponding meta data for this link.
        var entryPoint;
        for (var b = 0; b < targetNode._meta.bounds.entryBounds.length; ++b) {
          if (targetNode._meta.bounds.entryBounds[b].name === entryLink.name) {
            entryPoint = targetNode._meta.bounds.entryBounds[b].point;
            break;
          }
        }

        // Could not find meta data for this link.
        if (!entryPoint) {
          console.log('ERROR: Attempted to draw chains to an entry link that has no meta data.');
          continue;
        }

        var flash = (exitLink.meta.flashDelta > 0 && entryLink.meta.flashDelta > 0);

        var highlight = 
          (this._highlightNode === targetNode && this._highlightEntryLink && this._highlightEntryLink.name === entryLink.name) ||
          (this._highlightNode === node && this._highlightExitLink && this._highlightExitLink.name === exitLink.name);

        // Now we have both our links, lets chain them together!
        this.__drawChain(node.pos, targetNode.pos, exitPoint, entryPoint, node._meta.bounds.rect, targetNode._meta.bounds.rect, context, flash, highlight);
      }
    }

    for (var i = 0; i < node.properties.length; ++i) {
      var outputProp = node.properties[i];

      // Skip properties with no output links.
      if (!outputProp.outputs.length) {
        continue;
      }

      // Find the corresponding meta data for this link.
      var outputPoint;
      for (var a = 0; a < node._meta.bounds.outputBounds.length; ++a) {
        if (node._meta.bounds.outputBounds[a].name === outputProp.name) {
          outputPoint = node._meta.bounds.outputBounds[a].point;
          break;
        }
      }

      // Failed to find bounds for the output link.
      if (!outputPoint) {
        console.log('ERROR: Attempted to draw chains for an output link that has no meta data.');
        continue;
      }

      // Follow each chain to their input links.
      for (var a = 0; a < outputProp.outputs.length; ++a) {
        var targetNode = outputProp.outputs[a].node;
        var targetName = outputProp.outputs[a].name;
        var inputProp;

        // Skip pairs of nodes that are not visible.
        if (!node._meta.visible && !targetNode._meta.visible) {
          continue;
        }

        for (var b = 0; b < targetNode.properties.length; ++b) {
          if (targetNode.properties[b].name === targetName) {
            inputProp = targetNode.properties[b];
          }
        }

        // Failed to find the input property to link with.
        if (!inputProp) {
          console.log('ERROR: Attempted to chain a property link to a property that was not found.');
          continue;
        }

        // Find the corresponding meta data for this link.
        var inputPoint;
        for (var b = 0; b < targetNode._meta.bounds.inputBounds.length; ++b) {
          if (targetNode._meta.bounds.inputBounds[b].name === inputProp.name) {
            inputPoint = targetNode._meta.bounds.inputBounds[b].point;
            break;
          }
        }

        // Failed to find the meta data for a property input link.
        if (!inputPoint) {
          console.log('ERROR: Attempted to draw chains to a property input link that has no meta data.');
          continue;
        }

        var flash = (outputProp.outputMeta.flashDelta > 0 || inputProp.inputMeta.flashDelta > 0);
        var highlight =
          (this._highlightNode === targetNode && this._highlightInputLink && this._highlightInputLink.name === inputProp.name) ||
          (this._highlightNode === node && this._highlightOutputLink && this._highlightOutputLink.name === outputProp.name);

        // Now we have both our links, lets chain them together!
        this.__drawChain(node.pos, targetNode.pos, outputPoint, inputPoint, node._meta.bounds.rect, targetNode._meta.bounds.rect, context, flash, highlight, true);
      }
    }

    // Draw a link to the mouse cursor if we are making a connection.
    if (this._selectedNode === node && this._selectedEntryLink) {
      var targetPos;
      var targetRect = null;
      var targetOffset = null;
      var highlight = false;
      if (this._highlightNode && this._highlightExitLink) {
        targetPos = this._highlightExitLink.point;
        targetRect = this._highlightExitLink.rect;
        targetOffset = this._highlightNode.pos;
        highlight = true;
      } else {
        targetPos = {
          x: (this._mouse.x - this._viewportCamera.x) / this._viewportCamera.z,
          y: (this._mouse.y - this._viewportCamera.y) / this._viewportCamera.z,
        };
        targetRect = {
          left: targetPos.x,
          top: targetPos.y,
          width: 1,
          height: 1,
        };
        targetOffset = {x: 0, y: 0};
      }

      var point;
      for (var i = 0; i < node._meta.bounds.entryBounds.length; ++i) {
        if (node._meta.bounds.entryBounds[i].name === this._selectedEntryLink.name) {
          point = node._meta.bounds.entryBounds[i].point;
        }
      }

      this.__drawChain(targetOffset, node.pos, targetPos, point, targetRect, node._meta.bounds.rect, context, highlight);
    }

    if (this._selectedNode === node && this._selectedExitLink) {
      var targetPos;
      var targetRect = null;
      var targetOffset = null;
      var highlight = false;
      if (this._highlightNode && this._highlightEntryLink) {
        targetPos = this._highlightEntryLink.point;
        targetRect = this._highlightEntryLink.rect;
        targetOffset = this._highlightNode.pos;
        highlight = true;
      } else {
        targetPos = {
          x: (this._mouse.x - this._viewportCamera.x) / this._viewportCamera.z,
          y: (this._mouse.y - this._viewportCamera.y) / this._viewportCamera.z,
        };
        targetRect = {
          left: targetPos.x,
          top: targetPos.y,
          width: 1,
          height: 1,
        };
        targetOffset = {x: 0, y: 0};
      }

      var point;
      for (var i = 0; i < node._meta.bounds.exitBounds.length; ++i) {
        if (node._meta.bounds.exitBounds[i].name === this._selectedExitLink.name) {
          point = node._meta.bounds.exitBounds[i].point;
        }
      }

      this.__drawChain(node.pos, targetOffset, point, targetPos, node._meta.bounds.rect, targetRect, context, highlight);
    }

    if (this._selectedNode === node && this._selectedInputLink) {
      var targetPos;
      var targetRect = null;
      var targetOffset = null;
      var highlight = false;
      if (this._highlightNode && this._highlightOutputLink) {
        targetPos = this._highlightOutputLink.point;
        targetRect = this._highlightOutputLink.rect;
        targetOffset = this._highlightNode.pos;
        highlight = true;
      } else {
        targetPos = {
          x: (this._mouse.x - this._viewportCamera.x) / this._viewportCamera.z,
          y: (this._mouse.y - this._viewportCamera.y) / this._viewportCamera.z,
        };
        targetRect = {
          left: targetPos.x,
          top: targetPos.y,
          width: 1,
          height: 1,
        };
        targetOffset = {x: 0, y: 0};
      }

      var point;
      for (var i = 0; i < node._meta.bounds.inputBounds.length; ++i) {
        if (node._meta.bounds.inputBounds[i].name === this._selectedInputLink.name) {
          point = node._meta.bounds.inputBounds[i].point;
        }
      }

      this.__drawChain(targetOffset, node.pos, targetPos, point, targetRect, node._meta.bounds.rect, context, highlight, false, true);
    }

    if (this._selectedNode === node && this._selectedOutputLink) {
      var targetPos;
      var targetRect = null;
      var targetOffset = null;
      var highlight = false;
      if (this._highlightNode && this._highlightInputLink) {
        targetPos = this._highlightInputLink.point;
        targetRect = this._highlightInputLink.rect;
        targetOffset = this._highlightNode.pos;
        highlight = true;
      } else {
        targetPos = {
          x: (this._mouse.x - this._viewportCamera.x) / this._viewportCamera.z,
          y: (this._mouse.y - this._viewportCamera.y) / this._viewportCamera.z,
        };
        targetRect = {
          left: targetPos.x,
          top: targetPos.y,
          width: 1,
          height: 1,
        };
        targetOffset = {x: 0, y: 0};
      }

      var point;
      for (var i = 0; i < node._meta.bounds.outputBounds.length; ++i) {
        if (node._meta.bounds.outputBounds[i].name === this._selectedOutputLink.name) {
          point = node._meta.bounds.outputBounds[i].point;
        }
      }

      this.__drawChain(node.pos, targetOffset, point, targetPos, node._meta.bounds.rect, targetRect, context, highlight, false, true);
    }
  },

  /**
   * Generic draw chain function, you can flip the x and y axes to achieve either a flow or property chain orientation.
   * @function wcPlayEditor#__drawChain
   * @private
   * @param {wcPlay~Coordinates} startOffset - The offset for the start position and rect.
   * @param {wcPlay~Coordinates} endOffset - The offset for the end position and rect.
   * @param {wcPlay~Coordinates} startPos - The start position (the exit link).
   * @param {wcPlay~Coordinates} endPos - The end position (the entry link).
   * @param {wcPlayEditor~Rect} startRect - The start node's bounding rect to avoid.
   * @param {wcPlayEditor~Rect} endPos - The end node's bounding rect to avoid.
   * @param {Boolean} [flash] - If true, will flash the link.
   * @param {Boolean} [isProperty] - If true, will render property chain orientation.
   * @param {external:Canvas~Context} context - The canvas context.
   */
  __drawChain: function(startOffset, endOffset, startPos, endPos, startRect, endRect, context, flash, highlight, isProperty) {
    context.save();
    context.lineWidth = 2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo((startOffset.x + startPos.x), (startOffset.y + startPos.y));

    // this._chainDrawCount += 1;

    // Do some preparation to make the orientation invisible.
    function __lineTo(x, y) {
      if (isProperty) {
        context.lineTo(y, x);
      } else {
        context.lineTo(x, y);
      }
    };

    function __arcTo(x1, y1, x2, y2, radius) {
      if (isProperty) {
        context.arcTo(y1, x1, y2, x2, radius);
      } else {
        context.arcTo(x1, y1, x2, y2, radius);
      }
    };

    function __curveTo(x1, y1, x2, y2, x3, y3) {
      if (isProperty) {
        context.bezierCurveTo(y1, x1, y2, x2, y3, x3);
      } else {
        context.bezierCurveTo(x1, y1, x2, y2, x3, y3);
      }
    };

    var start, end, startBounds, endBounds;
    if (isProperty) {
      start = {
        x: startOffset.y + startPos.y,
        y: startOffset.x + startPos.x,
      };
      end = {
        x: endOffset.y + endPos.y,
        y: endOffset.x + endPos.x,
      };
      startBounds = {
        top: startRect.left + startOffset.x,
        left: startRect.top + startOffset.y,
        width: startRect.height,
        height: startRect.width,
      };
      endBounds = {
        top: endRect.left + endOffset.x,
        left: endRect.top + endOffset.y,
        width: endRect.height,
        height: endRect.width,
      };
      context.strokeStyle = (highlight? 'cyan': (flash? '#CCCC00': '#33CC33'));
    } else {
      start = {
        x: startOffset.x + startPos.x,
        y: startOffset.y + startPos.y,
      };
      end = {
        x: endOffset.x + endPos.x,
        y: endOffset.y + endPos.y,
      };
      startBounds = {
        top: startRect.top + startOffset.y,
        left: startRect.left + startOffset.x,
        width: startRect.width,
        height: startRect.height,
      };
      endBounds = {
        top: endRect.top + endOffset.y,
        left: endRect.left + endOffset.x,
        width: endRect.width,
        height: endRect.height,
      };
      context.strokeStyle = (highlight? 'cyan': (flash? '#CCCC00': '#000000'));
    }

    switch (this._chainStyle) {
      // Squared chains
      case 0:
        var coreRadius = 15;
        // If the exit link is above the entry link
        if (start.y < end.y) {
          var midx = (end.x + start.x) / 2;
          var midy = (end.y + start.y) / 2;
          var radius = Math.min(coreRadius, Math.abs(end.x - start.x)/2, Math.abs(end.y - start.y)/2);
          __arcTo(start.x, midy, midx, midy, radius);
          __arcTo(end.x, midy, end.x, end.y, radius);
        }
        // If the start rect is to the left side of the end rect.
        else if (startBounds.left + startBounds.width < endBounds.left) {
          var midx = (endBounds.left + startBounds.left + startBounds.width) / 2 - 2;
          var midy = (end.y + start.y) / 2;
          var leftx = (midx + start.x) / 2;
          var rightx = (end.x + midx) / 2;
          var radius = Math.min(coreRadius, Math.abs(end.y - start.y)/4, Math.abs(midx - leftx), Math.abs(midx - rightx));
          __arcTo(start.x, start.y + radius, leftx, start.y + radius, radius);
          __arcTo(midx, start.y + radius, midx, midy, radius);
          __arcTo(midx, end.y - radius, rightx, end.y - radius, radius);
          __arcTo(end.x, end.y - radius, end.x, end.y, radius);
        }
        // If the start rect is to the right side of the end rect.
        else if (startBounds.left > endBounds.left + endBounds.width) {
          var midx = (startBounds.left + endBounds.left + endBounds.width) / 2 + 2;
          var midy = (end.y + start.y) / 2;
          var leftx = (midx + end.x) / 2;
          var rightx = (start.x + midx) / 2;
          var radius = Math.min(coreRadius, Math.abs(end.y - start.y)/4, Math.abs(midx - leftx), Math.abs(midx - rightx));
          __arcTo(start.x, start.y + radius, rightx, start.y + radius, radius);
          __arcTo(midx, start.y + radius, midx, midy, radius);
          __arcTo(midx, end.y - radius, leftx, end.y - radius, radius);
          __arcTo(end.x, end.y - radius, end.x, end.y, radius);
        }
        // If the start link is below the end link. Makes a loop around the nodes.
        else if (start.y > end.y && Math.abs(start.y - end.y) > this._drawStyle.links.length) {
          var a = start.x;
          var top = Math.min(startBounds.top - coreRadius, endBounds.top - coreRadius);
          var bottom = Math.max(startBounds.top + startBounds.height + coreRadius, endBounds.top + endBounds.height + coreRadius);
          var midy = (start.y + end.y) / 2;
          // Choose left or right.
          if (Math.abs(Math.min(startBounds.left, endBounds.left) - start.x) <= Math.abs(Math.max(startBounds.left + startBounds.width, endBounds.left + endBounds.width) - end.x)) {
            // Left
            a = Math.min(startBounds.left - coreRadius, endBounds.left - coreRadius);
            bottom -= 2;
          } else {
            // Right
            a = Math.max(startBounds.left + startBounds.width + coreRadius, endBounds.left + endBounds.width + coreRadius);
            bottom += 2;
          }
          var midx = (start.x + a) / 2;
          var radius = Math.min(coreRadius, Math.abs(a - (start.x))/2, Math.abs(a - (end.x))/2);

          __arcTo(start.x, bottom, midx, bottom, radius);
          __arcTo(a, bottom, a, midy, radius);
          __arcTo(a, top, midx, top, radius);
          __arcTo(end.x, top, end.x, end.y, radius);
        }
        break;
      // Splined chains.
      case 1:
        // If the Exit link is right above the Entry link target.
        if (start.y < end.y) {
          var midy = (start.y + end.y) / 2;
          var midx = (start.x + end.x) / 2;
          __curveTo(start.x, midy, end.x, midy, end.x, end.y);
        }
        // If the start rect is to the left or right side of the end rect.
        else if (startBounds.left + startBounds.width < endBounds.left || startBounds.left > endBounds.left + endBounds.width) {
          var radius = Math.abs(start.y - end.y) / 2;
          var top = endBounds.top - radius;
          var bottom = startBounds.top + startBounds.height + radius;
          __curveTo(start.x, bottom, end.x, top, end.x, end.y);
        }
        // If the start link is below the end link. Makes a loop around the nodes.
        else if (start.y > end.y && Math.abs(start.y - end.y) > this._drawStyle.links.length) {
          var sidex = start.x;
          // Choose left or right.
          if (Math.abs(Math.min(startBounds.left, endBounds.left) - start.x) <= Math.abs(Math.max(startBounds.left + startBounds.width, endBounds.left + endBounds.width) - end.x)) {
            // Left
            sidex = Math.min(startBounds.left, endBounds.left) - 15;
          } else {
            // Right
            sidex = Math.max(startBounds.left + startBounds.width, endBounds.left + endBounds.width) + 15;
          }
          var top = endBounds.top - 30;
          var bottom = Math.max(startBounds.top + startBounds.height + 30, endBounds.top + endBounds.height + 30);
          var midy = (start.y + end.y)/2;
          __curveTo(start.x, bottom, sidex, bottom, sidex, midy);
          __curveTo(sidex, top, end.x, top, end.x, end.y);

          // var top = endBounds.top - Math.abs(end.x - sidex)/2;
          // var bottom = Math.max(startBounds.top + startBounds.height + Math.abs(start.x - sidex)/2, endBounds.top + endBounds.height + Math.abs(end.x - sidex)/2);
          // __curveTo(start.x, bottom, sidex, bottom, sidex, start.y);
          // __lineTo(sidex, end.y);
          // __curveTo(sidex, top, end.x, top, end.x, end.y);
        }
        break;
    }

    // Finish our line to the end position.
    context.lineTo((endOffset.x + endPos.x), (endOffset.y + endPos.y));
    context.stroke();
    context.restore();
  },

  /**
   * Draws the value of a property embedded on the node.
   * @function wcPlayEditor#__drawPropertyValue
   * @private
   * @param {wcNode} node - The node that owns this property.
   * @param {Object} property - The property data.
   * @param {Boolean} [initial] - Set true if the property being viewed is the initial value.
   * @returns {String} - A string value to print as the value.
   *
   * @see {wcNode~wcNode~PropertyOptions}
   * @see {wcNode~PropertyDisplay}
   */
  __drawPropertyValue: function(node, property, initial) {
    var value;
    if (initial) {
      value = node.initialProperty(property.name);
    } else {
      value = node.property(property.name);
    }

    if (typeof property.options.display === 'function') {
      value = property.options.display(value);
    } else {
      // Handle custom display of certain property types.
      switch (property.type) {
        case wcPlay.PROPERTY.TOGGLE:
          // Display toggle buttons as 'yes', 'no'
          return (value? 'yes': 'no');
        case wcPlay.PROPERTY.SELECT:
          var noneValue = '';
          if (property.options.hasOwnProperty('noneValue')) {
            noneValue = property.options.noneValue;
          }

          if (value == noneValue) {
            return '<none>';
          }

          var items = property.options.items;
          if ($.isFunction(items)) {
            items = items.call(node);
          }

          if ($.isArray(items)) {
            var found = false;
            for (var i = 0; i < items.length; ++i) {
              if (typeof items[i] === 'object') {
                if (items[i].value == value) {
                  value = items[i].name;
                  found = true;
                  break;
                }
              } else if (typeof items[i] === 'string') {
                if (items[i] == value) {
                  found = true;
                  break;
                }
              }
            }

            if (!found) {
              value = 'Unknown';
            }
          }
          break;
      }
    }

    return this.__clampString(String(value), this._drawStyle.property.strLen)
  },

  /**
   * Draws the detail popup box for the node.
   * @function wcPlayEditor#__drawDetailsPopup
   * @param {wcNode} node - The node to draw for.
   */
  __drawDetailsPopup: function(node) {
    var displayTitle = node.type + ' Node';

    var displayInfo = node.description();
    if (displayInfo) {
      displayInfo += '\n\n';
    }
    displayInfo += node.details();

    var $blocker = $('<div class="wcPlayDetailsPopupBlocker">');
    var $popup = $('<div class="wcPlayDetailsPopup">');
    var $title = $('<h3>' + displayTitle + '</h3>');
    var $info = $('<pre class="wcPlayDetailsPopupText">' + displayInfo + '</pre>');

    $popup.append($title);
    $popup.append($info);
    $blocker.append($popup);
    $('body').append($blocker);

    $blocker.click(function() {
      $(this).remove();
    });
  },

  /**
   * Draws the editor control for the title of the node.
   * @function wcPlayEditor#__drawTitleEditor
   * @private
   * @param {wcNode} node - The node to draw for.
   * @param {wcPlayEditor~BoundingData} bounds - The bounding data for the title.
   */
  __drawTitleEditor: function(node, bounds) {
    if (this._options.readOnly) {
      return;
    }

    var self = this;
    var cancelled = false;

    var $control = $('<input type="text">');
    $control.val(node.name);
    $control.change(function() {
      if (!cancelled) {
        self._undoManager && self._undoManager.addEvent('Title changed for Node "' + node.category + '.' + node.type + '"',
        {
          id: node.id,
          oldValue: node.name,
          newValue: $control.val(),
          engine: self._engine,
        },
        // Undo
        function() {
          var myNode = this.engine.nodeById(this.id);
          var oldName = myNode.name;
          var newName = myNode.onNameChanging(oldName, this.oldValue);
          if (newName === undefined) {
            newName = this.oldValue;
          }
          myNode.name = newName;
          myNode.onNameChanged(oldName, newName);
        },
        // Redo
        function() {
          var myNode = this.engine.nodeById(this.id);
          var oldName = myNode.name;
          var newName = myNode.onNameChanging(oldName, this.newValue);
          if (newName === undefined) {
            newName = this.newValue;
          }
          myNode.name = newName;
          myNode.onNameChanged(oldName, newName);
        });

        var oldName = node.name;
        var newName = node.onNameChanging(oldName, $control.val());
        if (newName === undefined) {
          newName = $control.val();
        }
        node.name = newName;
        node.onNameChanged(oldName, newName);
      }
    });

    var offset = {
      top: 0,
      left: this.$palette.width(),
    };

    this.$main.append($control);

    $control.addClass('wcPlayEditorControl');
    $control.focus();
    $control.select();

    // Clicking away will close the editor control.
    $control.blur(function() {
      $(this).remove();
    });

    $control.keydown(function(event) {
      event.stopPropagation();
    });
    $control.keyup(function(event) {
      switch (event.keyCode) {
        case 13: // Enter to confirm.
          $control.blur();
          break;
        case 27: // Escape to cancel.
          cancelled = true;
          $control.blur();
          break;
      }
      return false;
    });

    $control.css('top', offset.top + (node.pos.y + bounds.top) * this._viewportCamera.z + this._viewportCamera.y)
      .css('left', offset.left + (node.pos.x + bounds.left) * this._viewportCamera.z + this._viewportCamera.x)
      .css('width', Math.max(bounds.width * this._viewportCamera.z, 200))
      .css('height', Math.max(bounds.height * this._viewportCamera.z, 15));
  },

  /**
   * Draws the editor control for a property.
   * @function wcPlayEditor#__drawPropertyEditor
   * @private
   * @param {wcNode} node - The node to draw for.
   * @param {Object} property - The property data.
   * @param {wcPlayEditor~BoundingData} bounds - The bounding data for this property.
   * @param {Boolean} [initial] - Set true if the property being changed is the initial value.
   */
  __drawPropertyEditor: function(node, property, bounds, initial) {
    if (this._options.readOnly) {
      return;
    }

    var $control = null;
    var cancelled = false;
    var enterConfirms = true;
    var propFn = (initial? 'initialProperty': 'property');

    var self = this;
    function undoChange(node, name, oldValue, newValue) {
      self._undoManager && self._undoManager.addEvent('Property "' + name + '" changed for Node "' + node.category + '.' + node.type + '"',
      {
        id: node.id,
        name: name,
        propFn: propFn,
        oldValue: oldValue,
        newValue: newValue,
        engine: self._engine,
      },
      // Undo
      function() {
        var myNode = this.engine.nodeById(this.id);
        if (myNode) {
          myNode[this.propFn](this.name, this.oldValue, true, true);
        }
      },
      // Redo
      function() {
        var myNode = this.engine.nodeById(this.id);
        if (myNode) {
          myNode[this.propFn](this.name, this.newValue, true, true);
        }
      });
    };

    var $blocker = $('<div class="wcPlayEditorBlocker">');

    // Determine what editor to use for the property.
    switch (property.type) {

      case wcPlay.PROPERTY.TOGGLE:
        // Toggles do not show an editor, instead, they just toggle their state.
        var state = node[propFn](property.name);
        node[propFn](property.name, !state, true, true);
        undoChange(node, property.name, state, !state);
        break;


      case wcPlay.PROPERTY.NUMBER:
        $control = $('<input type="number"' + (property.options.min? ' min="' + property.options.min + '"': '') + (property.options.max? ' max="' + property.options.max + '"': '') + (property.options.step? ' step="' + property.options.step + '"': '') + '>');
        $control.val(parseFloat(node[propFn](property.name)));
        $control.change(function() {
          if (!cancelled) {
            var min = $(this).attr('min') !== undefined? parseInt($(this).attr('min')): -Infinity;
            var max = $(this).attr('max') !== undefined? parseInt($(this).attr('max')):  Infinity;
            value = Math.min(max, Math.max(min, parseFloat($control.val())));
            node[propFn](property.name, value, true, true);
            undoChange(node, property.name, value, node[propFn](property.name));
            // $blocker.click();
          }
        });
        break;


      case wcPlay.PROPERTY.STRING:
      case wcPlay.PROPERTY.DYNAMIC:
        if (property.options.multiline) {
          $control = $('<textarea' + (property.options.maxlength? ' maxlength="' + property.options.maxlength + '"': '') + '>');
          enterConfirms = false;
        } else {
          $control = $('<input type="text" maxlength="' + (property.options.maxlength || 524288) + '">');
        }
        $control.val(node[propFn](property.name).toString());
        $control.change(function() {
          if (!cancelled) {
            value = node[propFn](property.name);
            node[propFn](property.name, $control.val(), true, true);
            undoChange(node, property.name, value, node[propFn](property.name));
            $blocker.click();
          }
        });
        break;


      case wcPlay.PROPERTY.SELECT:
        var value = node[propFn](property.name);
        $control = $('<select>');

        var items = property.options.items;
        if ($.isFunction(items)) {
          items = items.call(node);
        }

        if ($.isArray(items)) {
          var noneValue = '';
          if (property.options.hasOwnProperty('noneValue')) {
            noneValue = property.options.noneValue;
          }
          $control.append($('<option value=""' + (noneValue == value? ' selected': '') + '>&lt;none&gt;</option>'));
          for (var i = 0; i < items.length; ++i) {
            if (typeof items[i] === 'object') {
              $control.append($('<option value="' + items[i].value + '"' + (items[i].value == value? ' selected': '') + '>' + items[i].name + '</option>'));
            } else {
              $control.append($('<option value="' + items[i] + '"' + (items[i] == value? ' selected': '') + '>' + items[i] + '</option>'));
            }
          }
        } else {
          console.log("ERROR: Tried to display a Select type property when no selection list was provided.");
          return;
        }

        $control.change(function() {
          if (!cancelled) {
            value = node[propFn](property.name);
            var newValue = $control.val();
            if (newValue == '' && property.options.hasOwnProperty('noneValue')) {
              newValue = property.options.noneValue;
            }
            node[propFn](property.name, newValue, true, true);
            undoChange(node, property.name, value, node[propFn](property.name));
            $blocker.click();
          }
        });
        break;


      case wcPlay.PROPERTY.CUSTOM:
        if (typeof property.options.onCreate === 'function') {
          var value = node[propFn](property.name);

          $control = $(property.options.onCreate(node, property.name, value, initial, function(newValue) {
            if (!cancelled) {
              value = node[propFn](property.name);
              node[propFn](property.name, newValue, true, true);
              undoChange(node, property.name, value, node[propFn](property.name));
              $blocker.click();
            }
          }));
        }
        break;
    }

    if ($control) {
      var offset = {
        top: 0,
        left: this.$palette.width(),
      };

      this.$main.append($blocker);
      this.$main.append($control);

      $control.addClass('wcPlayEditorControl');
      $control.focus();
      $control.select();

      // Clicking away will close the editor control.
      $blocker.click(function(event) {
        event.stopPropagation();
        $blocker.remove();
        $control.remove();
      });

      $control.keydown(function(event) {
        event.stopPropagation();
      });
      $control.keyup(function(event) {
        switch (event.keyCode) {
          case 13: // Enter to confirm.
            if (enterConfirms || event.ctrlKey) {
              $control.blur();
            }
            break;
          case 27: // Escape to cancel.
            cancelled = true;
            $control.blur();
            break;
        }
        return false;
      });

      $control.css('top', offset.top + (node.pos.y + bounds.rect.top) * this._viewportCamera.z + this._viewportCamera.y)
        .css('left', offset.left + (node.pos.x + bounds.rect.left) * this._viewportCamera.z + this._viewportCamera.x)
        .css('width', Math.max(bounds.rect.width * this._viewportCamera.z, 200))
        .css('height', Math.max(bounds.rect.height * this._viewportCamera.z, 15));
    }
  },

  /**
   * Generates an undo event for a node that was created.
   * @function wcPlayEditor#__onCreateNode
   * @param {wcNode} node - The node that was created.
   */
  __onCreateNode: function(node) {
    this._undoManager && this._undoManager.addEvent('Created Node "' + node.category + '.' + node.type + '"',
    {
      id: node.id,
      className: node.className,
      data: node.export(),
      engine: this._engine,
      parent: this._parent,
    },
    // Undo
    function() {
      var myNode = this.engine.nodeById(this.id);

      // If we are viewing a script inside the node that is being removed, re-direct our view to its parents.
      for (var i = 0; i < this.engine._editors.length; ++i) {
        var parent = this.engine._editors[i]._parent;
        while (!(parent instanceof wcPlay)) {
          if (parent == myNode) {
            this.engine._editors[i]._parent = myNode._parent;
            this.engine._editors[i].center();
            break;
          }

          parent = parent._parent;
        }
      }

      // Now destroy this node.
      myNode.destroy();
    },
    // Redo
    function() {
      var myNode = new window[this.className](this.parent, this.data.pos);
      myNode.id = this.id;
      myNode.import(this.data);
    });
  },

  /**
   * Generates an undo event for a node that is destroyed.
   * @function wcPlayEditor#__onDestroyNode
   * @param {wcNode} node - the node to destroy.
   */
  __onDestroyNode: function(node) {
    this._undoManager && this._undoManager.addEvent('',
    {
      data: node.export(),
      parent: this._parent,
      engine: this._engine,
    },
    // Undo
    function() {
      var myNode = new window[this.data.className](this.parent, this.data.pos);
      myNode.import(this.data);
    },
    // Redo
    function() {
      var myNode = this.engine.nodeById(this.data.id);

      // If we are viewing a script inside the node that is being removed, re-direct our view to its parents.
      for (var i = 0; i < this.engine._editors.length; ++i) {
        var parent = this.engine._editors[i]._parent;
        while (!(parent instanceof wcPlay)) {
          if (parent == myNode) {
            this.engine._editors[i]._parent = myNode._parent;
            this.engine._editors[i].center();
            break;
          }

          parent = parent._parent;
        }
      }

      // Now destroy this node.
      myNode.destroy();
    });
  },

  /**
   * Handles auto scrolling based on mouse position.
   * @function wcPlayEditor#__handleAutoScroll
   * @param {Boolean} active - Whether the auto scroll is active.
   * @param {Boolean} movingNodes - If true, the auto scroll will also move selected nodes.
   */
  __handleAutoScroll: function(active, movingNodes) {
    var shouldBeActive = false;

    var width = this.$viewport.width();
    var height = this.$viewport.height();
    var THRESHOLD = Math.min(50, width/2, height/2);
    this._autoScrollNodes = movingNodes;

    if (active) {
      if (this._mouse.x >= width - THRESHOLD) {
        shouldBeActive = true;
        this._autoScrollDirection.x = this._mouse.x - width + THRESHOLD;
        this._autoScrollDirection.y = 0;
      } else if (this._mouse.x <= THRESHOLD) {
        shouldBeActive = true;
        this._autoScrollDirection.x = this._mouse.x - THRESHOLD;
        this._autoScrollDirection.y = 0;
      }

      if (this._mouse.y >= height - THRESHOLD) {
        shouldBeActive = true;
        this._autoScrollDirection.x = 0;
        this._autoScrollDirection.y = this._mouse.y - height + THRESHOLD;
      } else if (this._mouse.y <= THRESHOLD) {
        shouldBeActive = true;
        this._autoScrollDirection.x = 0;
        this._autoScrollDirection.y = this._mouse.y - THRESHOLD;
      }
    }

    if (shouldBeActive && !this._autoScrollInterval) {
      var self = this;
      this._autoScrollInterval = setInterval(function() {
        var moveX = self._autoScrollDirection.x;
        var moveY = self._autoScrollDirection.y;

        self._viewportCamera.x -= moveX;
        self._viewportCamera.y -= moveY;

        if (self._autoScrollNodes) {
          for (var i = 0; i < self._selectedNodes.length; ++i) {
            var node = self._selectedNodes[i];
            var oldPos = {
              x: node.pos.x,
              y: node.pos.y,
            };
            var newPos = {
              x: node.pos.x + (moveX / self._viewportCamera.z),
              y: node.pos.y + (moveY / self._viewportCamera.z),
            };

            var newPos = node.onMoving(oldPos, newPos) || newPos;

            if (oldPos.x !== newPos.x || oldPos.y !== newPos.y) {
              node.pos.x = newPos.x;
              node.pos.y = newPos.y;
              node.onMoved(oldPos, newPos);
            }
          }
        }
      }, 10);
    } else if (this._autoScrollInterval && !shouldBeActive) {
      clearInterval(this._autoScrollInterval);
      this._autoScrollInterval = 0;
    }
  },

  /**
   * Initializes user control.
   * @funciton wcPlayEditor#__setupControls
   * @private
   */
  __setupControls: function() {
    var self = this;

    // Menu
    this.__bindMenuHandlers();

    // Palette
    this.$palette.on('mousemove',  function(event){self.__onPaletteMouseMove(event, this);});
    this.$palette.on('mousedown',  function(event){self.__onPaletteMouseDown(event, this);});
    this.$palette.on('mouseup',  function(event){self.__onPaletteMouseUp(event, this);});

    // Viewport
    this.$viewport.on('mousemove',  function(event){self.__onViewportMouseMove(event, this);});
    this.$viewport.on('mousedown',  function(event){self.__onViewportMouseDown(event, this);});
    this.$viewport.on('mouseup',    function(event){self.__onViewportMouseUp(event, this);});
    this.$viewport.on('mouseenter', function(event){self.__onViewportMouseEnter(event, this);});
    this.$viewport.on('mouseleave', function(event){self.__onViewportMouseLeave(event, this);});
    this.$viewport.on('click',      function(event){self.__onViewportMouseClick(event, this);});
    this.$viewport.on('dblclick',   function(event){self.__onViewportMouseDoubleClick(event, this);});
    this.$viewport.on('mousewheel DOMMouseScroll', function(event) {self.__onViewportMouseWheel(event, this);});
  },

  /**
   * Binds click event handlers to each of the options in the menu and toolbar.
   * @function wcPlayEditor#__bindMenuHandlers
   * @private
   */
  __bindMenuHandlers: function() {
    var self = this;
    // Import the contents of a file.
    function __importScriptFile(file, importing) {
      var reader = new FileReader();
      reader.onload = function(e) {
        if (self._engine) {
          if (importing) {
            // Import the script as its own Composite node.
            if (self._engine.import(e.target.result, file.name)) {
              self.__setupPalette();
              self.$typeButton[3].click();
            }
          } else {
            if (self._engine.load(e.target.result)) {
              self._parent = self._engine;
              self._selectedNode = null;
              self._selectedNodes = [];
              self._undoManager && self._undoManager.clear();
              self.center();
            } else {
              alert('Failed to open file "' + file.name + '"\nPlease check to ensure it is actually a wcPlay script file.');
            }
          }
        }
      };

      reader.readAsText(file);
    }
    // A hidden file input field that will handle opening the open file dialog for us.
    $('body').on('change', '#wcPlayEditorHiddenFileLoader', function(event) {
      if ($(this).hasClass('disabled')) {
        return;
      }
      if (event.target.files.length) {
        __importScriptFile(event.target.files[0]);
        $(this).val('');
        $(this).remove();
      }
    });
    $('body').on('change', '#wcPlayEditorHiddenFileImporter', function(event) {
      if ($(this).hasClass('disabled')) {
        return;
      }
      if (event.target.files.length) {
        __importScriptFile(event.target.files[0], true);
        $(this).val('');
        $(this).remove();
      }
    });
    // Support drag-drop over the entire window.
    this.$container.on('dragover', function(event) {
      event.stopPropagation();
      event.preventDefault();
      event.originalEvent.dataTransfer.dropEffect = 'copy';
    });
    this.$container.on('drop', function(event) {
      event.stopPropagation();
      event.preventDefault();

      if (event.originalEvent.dataTransfer.files.length) {
        __importScriptFile(event.originalEvent.dataTransfer.files[0], event.ctrlKey);
      }
    });
  },

  /**
   * Handle mouse move events over the palette view.
   * @function wcPlayEditor#__onPaletteMouseMove
   * @private
   * @param {Object} event - The mouse event.
   * @param {Object} elem - The target element.
   */
  __onPaletteMouseMove: function(event, elem) {
    var mouse = this.__mouse(event);

    this._highlightTitle = false;
    this._highlightDetails = false;
    this._highlightDebugLog = false;
    this._highlightBreakpoint = false;
    this._highlightEntryLink = false;
    this._highlightExitLink = false;
    this._highlightInputLink = false;
    this._highlightOutputLink = false;
    this._highlightPropertyValue = false;
    this._highlightPropertyInitialValue = false;
    this._highlightViewport = false;

    // Dragging a node from the palette view.
    if (this._draggingNodeData) {
      var pos = {
        x: mouse.gx + this._draggingNodeData.offset.x,
        y: mouse.gy + this._draggingNodeData.offset.y,
      };

      this._draggingNodeData.$canvas.css('left', pos.x).css('top', pos.y);
      return;
    }

    var categoryData = this.__findCategoryAreaAtPos(mouse);
    if (categoryData) {
      var offset = categoryData.$canvas.offset();
      mouse = this.__mouse(event, offset);
      var node = this.__findNodeAtPos(mouse, undefined, categoryData.nodes);
      if (node) {
        this._highlightNode = node;
        this.$palette.addClass('wcClickable');
        this.$palette.attr('title', 'Create a new instance of this node by dragging this into your script.');
      } else {
        this._highlightNode = null;
        this.$palette.removeClass('wcClickable');
        this.$palette.attr('title', '');
      }
    }
  },

  /**
   * Handle mouse down events over the palette view.
   * @function wcPlayEditor#__onPaletteMouseDown
   * @private
   * @param {Object} event - The mouse event.
   * @param {Object} elem - The target element.
   */
  __onPaletteMouseDown: function(event, elem) {
    if (this._highlightNode) {
      this.__onPaletteMouseUp(event, elem);
      var mouse = this.__mouse(event);
      var rect = this._highlightNode._meta.bounds.rect;
      var categoryData = this.__findCategoryAreaAtPos(mouse);
      if (categoryData) {
        var offset = categoryData.$canvas.offset();
        var screenOffset = this.$container.offset();

        this._draggingNodeData = {
          node: this._highlightNode,
          $canvas: $('<canvas class="wcPlayHoverCanvas">'),
          offset: {x: 0, y: 0}
        };
        this.$container.append(this._draggingNodeData.$canvas);

        this.$palette.addClass('wcMoving');
        this.$viewport.addClass('wcMoving');

        this._draggingNodeData.$canvas.css('left', this._highlightNode.pos.x + rect.left + offset.left - screenOffset.left)
          .css('top', this._highlightNode.pos.y + rect.top + offset.top - screenOffset.top);
        this._draggingNodeData.$canvas.attr('width', rect.width).css('width', rect.width);
        this._draggingNodeData.$canvas.attr('height', rect.height).css('height', rect.height);

        this._draggingNodeData.offset.x = (this._highlightNode.pos.x + rect.left + offset.left - screenOffset.left) - mouse.x;
        this._draggingNodeData.offset.y = (this._highlightNode.pos.y + rect.top + offset.top - screenOffset.top) - mouse.y;

        var yPos = 0;
        if (!this._highlightNode.chain.entry.length) {
          yPos += this._drawStyle.links.length;
        }

        this._highlightNode.pos.x = rect.width/2;
        this._highlightNode.pos.y = yPos+3;
        this.__drawNode(this._highlightNode, this._draggingNodeData.$canvas[0].getContext('2d'), true);
      }
    }
  },

  /**
   * Handle mouse up events over the palette view.
   * @function wcPlayEditor#__onPaletteMouseDown
   * @private
   * @param {Object} event - The mouse event.
   * @param {Object} elem - The target element.
   */
  __onPaletteMouseUp: function(event, elem) {
    if (this._draggingNodeData) {
      this._draggingNodeData.$canvas.remove();
      this._draggingNodeData.$canvas = null;
      this._draggingNodeData = null;
      this.$palette.removeClass('wcMoving');
      this.$viewport.removeClass('wcMoving');
    }
  },

  /**
   * Handle mouse move events over the viewport canvas.
   * @function wcPlayEditor#__onViewportMouseMove
   * @private
   * @param {Object} event - The mouse event.
   * @param {Object} elem - The target element.
   */
  __onViewportMouseMove: function(event, elem) {
    var mouse = this.__mouse(event, this.$viewport.offset());
    if (mouse.x !== this._mouse.x || mouse.y !== this._mouse.y) {
      this._mouseMoved = true;
    }

    // Dragging a node from the palette view.
    if (this._draggingNodeData) {
      var pos = {
        x: mouse.gx + this._draggingNodeData.offset.x,
        y: mouse.gy + this._draggingNodeData.offset.y,
      };

      this._draggingNodeData.$canvas.css('left', pos.x).css('top', pos.y);
      this._mouse = mouse;
      this.__handleAutoScroll(true);
      return;
    }

    // Box selection.
    if (this._highlightRect && this._parent) {
      this._highlightRect.x = ((mouse.x - this._viewportCamera.x) / this._viewportCamera.z) - this._highlightRect.ox;
      this._highlightRect.y = ((mouse.y - this._viewportCamera.y) / this._viewportCamera.z) - this._highlightRect.oy;

      this._highlightRect.width = this._highlightRect.x;
      this._highlightRect.height = this._highlightRect.y;
      if (this._highlightRect.width < 0) {
        this._highlightRect.left = this._highlightRect.ox + this._highlightRect.width;
        this._highlightRect.width *= -1;
      }
      if (this._highlightRect.height < 0) {
        this._highlightRect.top = this._highlightRect.oy + this._highlightRect.height;
        this._highlightRect.height *= -1;
      }

      this._selectedNodes = [];
      var self = this;
      function __nodesInRect(nodes) {
        for (var i = 0; i < nodes.length; ++i) {
          if (self.__rectOnRect(nodes[i]._meta.bounds.inner, self._highlightRect, nodes[i].pos)) {
            self._selectedNodes.push(nodes[i]);
          }
        }
      };
      __nodesInRect(this._parent._storageNodes);
      __nodesInRect(this._parent._compositeNodes);
      __nodesInRect(this._parent._processNodes);
      __nodesInRect(this._parent._entryNodes);
      this._mouse = mouse;
      this.__handleAutoScroll(true);
      return;
    }

    // Viewport panning.
    if (this._viewportMoving) {
      var moveX = mouse.x - this._mouse.x;
      var moveY = mouse.y - this._mouse.y;
      this._viewportCamera.x += moveX;
      this._viewportCamera.y += moveY;
      this._mouse = mouse;
      if (!this._viewportMoved && this._mouseMoved) {
        this._viewportMoved = true;
        this.$viewport.addClass('wcMoving');
      }
      this.__handleAutoScroll(false);
      return;
    }

    // Moving nodes
    if (this._viewportMovingNode) {
      var moveX = mouse.x - this._mouse.x;
      var moveY = mouse.y - this._mouse.y;

      for (var i = 0; i < this._selectedNodes.length; ++i) {
        var node = this._selectedNodes[i];
        var oldPos = {
          x: node.pos.x,
          y: node.pos.y,
        };
        var newPos = {
          x: node.pos.x + (moveX / this._viewportCamera.z),
          y: node.pos.y + (moveY / this._viewportCamera.z),
        };

        var newPos = node.onMoving(oldPos, newPos) || newPos;

        if (oldPos.x !== newPos.x || oldPos.y !== newPos.y) {
          node.pos.x = newPos.x;
          node.pos.y = newPos.y;
          node.onMoved(oldPos, newPos);
        }
      }
      this._mouse = mouse;
      this.__handleAutoScroll(true, true);
      return;
    }

    this._mouse = mouse;
    this._highlightNode = null;
    this._highlightCrumb = -1;
    this._highlightTitle = false;
    this._highlightDetails = false;
    this._highlightDebugLog = false;
    this._highlightBreakpoint = false;
    this._highlightEntryLink = false;
    this._highlightExitLink = false;
    this._highlightInputLink = false;
    this._highlightOutputLink = false;
    this._highlightPropertyValue = false;
    this._highlightPropertyInitialValue = false;

    this.__handleAutoScroll(this._selectedEntryLink || this._selectedExitLink || this._selectedInputLink || this._selectedOutputLink);

    var wasOverViewport = this._highlightViewport;
    this._highlightViewport = false;

    this.$viewport.removeClass('wcClickable wcMoving wcGrab');
    this.$viewport.attr('title', '');
    
    for (var i = 0; i < this._crumbBounds.length; ++i) {
      if (this.__inRect(mouse, this._crumbBounds[i].rect)) {
        this._highlightCrumb = i;
        this.$viewport.addClass('wcClickable');
        this.$viewport.attr('title', 'Click to go to this level in the hierarchy.');
        break;
      }
    }

    var node = null;
    if (this._highlightCrumb === -1) {
      node = this.__findNodeAtPos(mouse, this._viewportCamera);
    }

    if (node) {
      // Check for main node collision.
      if (!this._options.readOnly && this.__inRect(mouse, node._meta.bounds.farRect, node.pos, this._viewportCamera)) {
        this._highlightNode = node;
        // if (this.__inRect(mouse, node._meta.bounds.inner, node.pos, this._viewportCamera)) {
          this.$viewport.attr('title', (node._meta.description? node._meta.description + '\n': ''));
          this.$viewport.addClass('wcMoving');
        // }
      }

      if (!this._selectedEntryLink && !this._selectedExitLink && !this._selectedInputLink && !this._selectedOutputLink) {
        // Debug Log button.
        if (this.__inRect(mouse, node._meta.bounds.debugLog, node.pos, this._viewportCamera)) {
          this._highlightDebugLog = true;
          this._highlightNode = node;
          this.$viewport.addClass('wcClickable');
          if (node._log) {
            this.$viewport.attr('title', 'Disable debug logging for this node.');
          } else {
            this.$viewport.attr('title', 'Enable debug logging for this node.');
          }
        }

        // Breakpoint button.
        if (this.__inRect(mouse, node._meta.bounds.breakpoint, node.pos, this._viewportCamera)) {
          this._highlightBreakpoint = true;
          this._highlightNode = node;
          this.$viewport.addClass('wcClickable');
          this.$viewport.attr('title', 'Toggle debug breakpoint on this node.');
        }
      }

      // Entry links.
      if (!this._options.readOnly && !this._selectedEntryLink && !this._selectedInputLink && !this._selectedOutputLink) {
        for (var i = 0; i < node._meta.bounds.entryBounds.length; ++i) {
          if (this.__inRect(mouse, node._meta.bounds.entryBounds[i].rect, node.pos, this._viewportCamera)) {
            this._highlightNode = node;
            this._highlightEntryLink = node._meta.bounds.entryBounds[i];

            var link;
            for (var a = 0; a < node.chain.entry.length; ++a) {
              if (node.chain.entry[a].name == this._highlightEntryLink.name) {
                link = node.chain.entry[a];
                break;
              }
            }

            this.$viewport.attr('title', (link.meta.description? link.meta.description + '\n': '') + 'Click and drag to create a new flow chain from another node. Double click to manually fire this entry link.');
            this.$viewport.addClass('wcGrab');
            break;
          }
        }
      }

      // Exit links.
      if (!this._options.readOnly && !this._selectedExitLink && !this._selectedInputLink && !this._selectedOutputLink) {
        for (var i = 0; i < node._meta.bounds.exitBounds.length; ++i) {
          if (this.__inRect(mouse, node._meta.bounds.exitBounds[i].rect, node.pos, this._viewportCamera)) {
            this._highlightNode = node;
            this._highlightExitLink = node._meta.bounds.exitBounds[i];

            var link;
            for (var a = 0; a < node.chain.exit.length; ++a) {
              if (node.chain.exit[a].name == this._highlightExitLink.name) {
                link = node.chain.exit[a];
                break;
              }
            }

            this.$viewport.attr('title', (link.meta.description? link.meta.description + '\n': '') + 'Click and drag to create a new flow chain to another node. Double click to manually fire this exit link.');
            this.$viewport.addClass('wcGrab');
            break;
          }
        }
      }

      // Input links.
      if (!this._options.readOnly && !this._selectedEntryLink && !this._selectedExitLink && !this._selectedInputLink) {
        for (var i = 0; i < node._meta.bounds.inputBounds.length; ++i) {
          if (this.__inRect(mouse, node._meta.bounds.inputBounds[i].rect, node.pos, this._viewportCamera)) {
            this._highlightNode = node;
            this._highlightInputLink = node._meta.bounds.inputBounds[i];
            this.$viewport.attr('title', 'Click and drag to chain this property to the output of another.');
            this.$viewport.addClass('wcGrab');
            break;
          }
        }
      }

        // Output links.
      if (!this._options.readOnly && !this._selectedEntryLink && !this._selectedExitLink && !this._selectedOutputLink) {
        for (var i = 0; i < node._meta.bounds.outputBounds.length; ++i) {
          if (this.__inRect(mouse, node._meta.bounds.outputBounds[i].rect, node.pos, this._viewportCamera)) {
            this._highlightNode = node;
            this._highlightOutputLink = node._meta.bounds.outputBounds[i];
            this.$viewport.attr('title', 'Click and drag to chain this property to the input of another. Double click to manually propagate this property through the chain.');
            this.$viewport.addClass('wcGrab');
            break;
          }
        }
      }

      if (!this._selectedEntryLink && !this._selectedExitLink && !this._selectedInputLink && !this._selectedOutputLink) {
        if (!this._options.readOnly) {
          // Title label.
          if (this.__inRect(this._mouse, node._meta.bounds.titleBounds, node.pos, this._viewportCamera)) {
            this._highlightNode = node;
            this._highlightTitle = true;
            this.$viewport.attr('title', 'Click to add or modify an additional label for this title.');
            this.$viewport.addClass('wcClickable');
          }

          // Details button.
          if (this.__inRect(this._mouse, node._meta.bounds.detailsBounds, node.pos, this._viewportCamera)) {
            this._highlightNode = node;
            this._highlightDetails = true;
            this.$viewport.attr('title', 'Click to see futher details for this node.');
            this.$viewport.addClass('wcClickable');
          }

          // Property labels.
          var propBounds;
          for (var i = 0; i < node._meta.bounds.propertyBounds.length; ++i) {
            if (this.__inRect(this._mouse, node._meta.bounds.propertyBounds[i].rect, node.pos, this._viewportCamera)) {
              propBounds = node._meta.bounds.propertyBounds[i];
              break;
            }
          }

          if (propBounds) {
            for (var i = 0; i < node.properties.length; ++i) {
              if (node.properties[i].name === propBounds.name) {
                this.$viewport.attr('title', (node.properties[i].options.description? node.properties[i].options.description + '\n': ''));
                this.$viewport.addClass('wcClickable');
                break;
              }
            }
          }

          // Property values.
          var valueBounds;
          for (var i = 0; i < node._meta.bounds.valueBounds.length; ++i) {
            if (this.__inRect(this._mouse, node._meta.bounds.valueBounds[i].rect, node.pos, this._viewportCamera)) {
              valueBounds = node._meta.bounds.valueBounds[i];
              break;
            }
          }

          if (valueBounds) {
            for (var i = 0; i < node.properties.length; ++i) {
              if (node.properties[i].name === valueBounds.name) {
                this._highlightNode = node;
                this._highlightPropertyValue = valueBounds;
                this.$viewport.attr('title', (node.properties[i].options.description? node.properties[i].options.description + '\n': '') + 'Click to change the current value of this property.\nValue = "' + node.properties[i].value + '"\n');
                this.$viewport.addClass('wcClickable');
                break;
              }
            }
          }

          // Property initial values.
          var initialBounds;
          for (var i = 0; i < node._meta.bounds.initialBounds.length; ++i) {
            if (this.__inRect(this._mouse, node._meta.bounds.initialBounds[i].rect, node.pos, this._viewportCamera)) {
              initialBounds = node._meta.bounds.initialBounds[i];
              break;
            }
          }

          if (initialBounds) {
            for (var i = 0; i < node.properties.length; ++i) {
              if (node.properties[i].name === initialBounds.name) {
                this._highlightNode = node;
                this._highlightPropertyInitialValue = initialBounds;
                this.$viewport.attr('title', (node.properties[i].options.description? node.properties[i].options.description + '\n': '') + 'Click to change the initial value of this property.\nValue = "' + node.properties[i].initialValue + '"\n');
                this.$viewport.addClass('wcClickable');
                break;
              }
            }
          }
        }

        // Custom viewport area.
        if (node._meta.bounds.viewportBounds) {
          var pos = {
            x: (mouse.x - this._viewportCamera.x) / this._viewportCamera.z - (node.pos.x + node._meta.bounds.viewportBounds.left),
            y: (mouse.y - this._viewportCamera.y) / this._viewportCamera.z - (node.pos.y + node._meta.bounds.viewportBounds.top),
          };

          if (this.__inRect(this._mouse, node._meta.bounds.viewportBounds, node.pos, this._viewportCamera)) {
            this._highlightNode = node;
            this._highlightViewport = true;
            this.$viewport.addClass('wcClickable');

            if (!wasOverViewport) {
              node.onViewportMouseEnter(event, pos, this._options.readOnly);
            }

            node.onViewportMouseMove(event, pos, this._options.readOnly);
          } else if (wasOverViewport) {
            node.onViewportMouseLeave(event, pos, this._options.readOnly);
          }
        }
      }
    }
  },

  /**
   * Handle mouse press events over the viewport canvas.
   * @function wcPlayEditor#__onViewportMouseDown
   * @private
   * @param {Object} event - The mouse event.
   * @param {Object} elem - The target element.
   */
  __onViewportMouseDown: function(event, elem) {
    this._mouse = this.__mouse(event, this.$viewport.offset());
    if (this._mouse.which === 3) {
      return;
    }
    this._mouseMoved = false;

    // Control+drag or middle+drag to box select.
    if (event.ctrlKey || this._mouse.which === 2) {
      this._highlightRect = {
        top: (this._mouse.y - this._viewportCamera.y) / this._viewportCamera.z,
        left: (this._mouse.x - this._viewportCamera.x) / this._viewportCamera.z,
        oy: (this._mouse.y - this._viewportCamera.y) / this._viewportCamera.z,
        ox: (this._mouse.x - this._viewportCamera.x) / this._viewportCamera.z,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      };
      return;
    }

    var hasTarget = false;
    var node = this.__findNodeAtPos(this._mouse, this._viewportCamera);
    if (node) {
      // Entry links.
      if (!hasTarget && !this._options.readOnly) {
        for (var i = 0; i < node._meta.bounds.entryBounds.length; ++i) {
          if (this.__inRect(this._mouse, node._meta.bounds.entryBounds[i].rect, node.pos, this._viewportCamera)) {
            hasTarget = true;
            // Alt click to disconnect all chains from this link.
            if (event.altKey) {
              this.onDisconnectEntryChains(node, node._meta.bounds.entryBounds[i].name);
              break;
            }
            this._selectedNode = node;
            this._selectedNodes = [node];
            this._selectedEntryLink = node._meta.bounds.entryBounds[i];
            this.$viewport.addClass('wcGrabbing');
            break;
          }
        }
      }

      // Exit links.
      if (!hasTarget && !this._options.readOnly) {
        for (var i = 0; i < node._meta.bounds.exitBounds.length; ++i) {
          if (this.__inRect(this._mouse, node._meta.bounds.exitBounds[i].rect, node.pos, this._viewportCamera)) {
            hasTarget = true;
            // Alt click to disconnect all chains from this link.
            if (event.altKey) {
              this.onDisconnectExitChains(node, node._meta.bounds.exitBounds[i].name);
              break;
            } 
            // Shift click to manually fire this exit chain.
            else if (event.shiftKey) {
              node.activateExit(node._meta.bounds.exitBounds[i].name);
              break;
            }
            this._selectedNode = node;
            this._selectedNodes = [node];
            this._selectedExitLink = node._meta.bounds.exitBounds[i];
            this.$viewport.addClass('wcGrabbing');
            break;
          }
        }
      }

      // Input links.
      if (!hasTarget && !this._options.readOnly) {
        for (var i = 0; i < node._meta.bounds.inputBounds.length; ++i) {
          if (this.__inRect(this._mouse, node._meta.bounds.inputBounds[i].rect, node.pos, this._viewportCamera)) {
            hasTarget = true;
            // Alt click to disconnect all chains from this link.
            if (event.altKey) {
              this.onDisconnectInputChains(node, node._meta.bounds.inputBounds[i].name);
              break;
            }
            this._selectedNode = node;
            this._selectedNodes = [node];
            this._selectedInputLink = node._meta.bounds.inputBounds[i];
            this.$viewport.addClass('wcGrabbing');
            break;
          }
        }
      }

      // Output links.
      if (!hasTarget && !this._options.readOnly) {
        for (var i = 0; i < node._meta.bounds.outputBounds.length; ++i) {
          if (this.__inRect(this._mouse, node._meta.bounds.outputBounds[i].rect, node.pos, this._viewportCamera)) {
            hasTarget = true;
            // Alt click to disconnect all chains from this link.
            if (event.altKey) {
              this.onDisconnectOutputChains(node, node._meta.bounds.outputBounds[i].name);
              break;
            }
            this._selectedNode = node;
            this._selectedNodes = [node];
            this._selectedOutputLink = node._meta.bounds.outputBounds[i];
            this.$viewport.addClass('wcGrabbing');
            break;
          }
        }
      }

      // Custom viewport area.
      if (!hasTarget && node._meta.bounds.viewportBounds) {
        var pos = {
          x: (this._mouse.x - this._viewportCamera.x) / this._viewportCamera.z - node._meta.bounds.viewportBounds.left,
          y: (this._mouse.y - this._viewportCamera.y) / this._viewportCamera.z - node._meta.bounds.viewportBounds.top,
        };

        if (this.__inRect(this._mouse, node._meta.bounds.viewportBounds, node.pos, this._viewportCamera)) {
          this._selectedNode = node;
          this._selectedNodes = [node];

          if (node.onViewportMouseDown(event, pos, this._options.readOnly)) {
            hasTarget = true;
          }
        }
      }

      // Center area.
      if (!hasTarget && this.__inRect(this._mouse, node._meta.bounds.farRect, node.pos, this._viewportCamera)) {
        hasTarget = true;
        if (!this._selectedNodes.length || this._selectedNodes.indexOf(node) === -1) {
          this._selectedNode = node;
          this._selectedNodes = [node];
        }
        this._viewportMovingNode = !this._options.readOnly;
        this._selectedNodeOrigins = [];
        for (var i = 0; i < this._selectedNodes.length; ++i) {
          var myNode = this._selectedNodes[i];
          this._selectedNodeOrigins.push({
            x: myNode.pos.x,
            y: myNode.pos.y,
          });
        }
      }
    }

    // Click outside of a node begins the canvas drag process.
    if (!hasTarget) {
      this._viewportMoving = true;
      this._viewportMoved = false;
    }
  },

  /**
   * Handle mouse release events over the viewport canvas.
   * @function wcPlayEditor#__onViewportMouseUp
   * @private
   * @param {Object} event - The mouse event.
   * @param {Object} elem - The target element.
   */
  __onViewportMouseUp: function(event, elem) {
    this.$viewport.removeClass('wcGrabbing');

    if (this._draggingNodeData && event.type === 'mouseup') {
      // Create an instance of the node and add it to the script.
      var screenOffset = this.$container.offset();
      var mouse = this.__mouse(event, this.$viewport.offset(), this._viewportCamera);
      var newNode = new window[this._draggingNodeData.node.className](this._parent, {x: 0, y: 0});
      var data = this._draggingNodeData.node.export();
      data.id = newNode.id;
      data.pos.x = (mouse.x / this._viewportCamera.z) + (this._draggingNodeData.$canvas.width()/2 + this._draggingNodeData.offset.x + screenOffset.left);
      data.pos.y = (mouse.y / this._viewportCamera.z) + (this._draggingNodeData.offset.y + 5 + screenOffset.top);
      if (!newNode.chain.entry.length) {
        data.y += this._drawStyle.links.length;
      }
      newNode.import(data, []);

      this.__onCreateNode(newNode);

      this._selectedNode = newNode;
      this._selectedNodes = [newNode];

      this.__updateNode(newNode, 0, this._viewportContext);
      this.__drawNode(newNode, this._viewportContext);

      this._draggingNodeData.$canvas.remove();
      this._draggingNodeData.$canvas = null;
      this._draggingNodeData = null;
      this.$palette.removeClass('wcMoving');
      this.$viewport.removeClass('wcMoving');
    }

    if (this._highlightRect && this._parent) {
      this._highlightRect = null;
      return;
    }

    // Finished moving a node.
    if (this._selectedNodes.length && this._selectedNodeOrigins.length) {
      this._undoManager && this._undoManager.beginGroup('Node(s) moved.');

      for (var i = 0; i < this._selectedNodes.length; ++i) {
        var node = this._selectedNodes[i];
        if (node.pos.x !== this._selectedNodeOrigins[i].x || node.pos.y !== this._selectedNodeOrigins[i].y) {
          node.onMoved({x: this._selectedNodeOrigins[i].x, y: this._selectedNodeOrigins[i].y}, {x: node.pos.x, y: node.pos.y});

          this._undoManager && this._undoManager.addEvent('Moved Node "' + node.category + '.' + node.type + '"',
          {
            id: node.id,
            start: {
              x: this._selectedNodeOrigins[i].x,
              y: this._selectedNodeOrigins[i].y,
            },
            end: {
              x: node.pos.x,
              y: node.pos.y,
            },
            engine: this._engine,
          },
          // Undo
          function() {
            var myNode = this.engine.nodeById(this.id);
            var pos = myNode.onMoving({x: this.end.x, y: this.end.y}, {x: this.start.x, y: this.start.y}) || this.start;
            myNode.pos.x = this.start.x;
            myNode.pos.y = this.start.y;
            myNode.onMoved({x: this.end.x, y: this.end.y}, {x: pos.x, y: pos.y});
          },
          // Redo
          function() {
            var myNode = this.engine.nodeById(this.id);
            var pos = myNode.onMoving({x: this.start.x, y: this.start.y}, {x: this.end.x, y: this.end.y}) || this.end;
            myNode.pos.x = this.end.x;
            myNode.pos.y = this.end.y;
            myNode.onMoved({x: this.start.x, y: this.start.y}, {x: pos.x, y: pos.y});
          });
        }
      }

      this._undoManager && this._undoManager.endGroup();
      this._selectedNodeOrigins = [];
    }

    // Check for link connections.
    if (this._selectedNode && this._selectedEntryLink && this._highlightNode && this._highlightExitLink) {
      if (this._selectedNode.connectEntry(this._selectedEntryLink.name, this._highlightNode, this._highlightExitLink.name) === wcNode.CONNECT_RESULT.ALREADY_CONNECTED) {
        this._selectedNode.disconnectEntry(this._selectedEntryLink.name, this._highlightNode, this._highlightExitLink.name);
        this._undoManager && this._undoManager.addEvent('Disconnected Entry Link "' + this._selectedNode.category + '.' + this._selectedNode.type + '.' + this._selectedEntryLink.name + '" to Exit Link "' + this._highlightNode.category + '.' + this._highlightNode.type + '.' + this._highlightExitLink.name + '"',
        {
          id: this._selectedNode.id,
          name: this._selectedEntryLink.name,
          targetId: this._highlightNode.id,
          targetName: this._highlightExitLink.name,
          engine: this._engine,
        },
        // Undo
        function() {
          var myNode = this.engine.nodeById(this.id);
          var targetNode = this.engine.nodeById(this.targetId);
          myNode.connectEntry(this.name, targetNode, this.targetName);
        },
        // Redo
        function() {
          var myNode = this.engine.nodeById(this.id);
          var targetNode = this.engine.nodeById(this.targetId);
          myNode.disconnectEntry(this.name, targetNode, this.targetName);
        });
      } else {
        this._undoManager && this._undoManager.addEvent('Connected Entry Link "' + this._selectedNode.category + '.' + this._selectedNode.type + '.' + this._selectedEntryLink.name + '" to Exit Link "' + this._highlightNode.category + '.' + this._highlightNode.type + '.' + this._highlightExitLink.name + '"',
        {
          id: this._selectedNode.id,
          name: this._selectedEntryLink.name,
          targetId: this._highlightNode.id,
          targetName: this._highlightExitLink.name,
          engine: this._engine,
        },
        // Undo
        function() {
          var myNode = this.engine.nodeById(this.id);
          var targetNode = this.engine.nodeById(this.targetId);
          myNode.disconnectEntry(this.name, targetNode, this.targetName);
        },
        // Redo
        function() {
          var myNode = this.engine.nodeById(this.id);
          var targetNode = this.engine.nodeById(this.targetId);
          myNode.connectEntry(this.name, targetNode, this.targetName);
        });
      }
    }
    if (this._selectedNode && this._selectedExitLink && this._highlightNode && this._highlightEntryLink) {
      if (this._selectedNode.connectExit(this._selectedExitLink.name, this._highlightNode, this._highlightEntryLink.name) === wcNode.CONNECT_RESULT.ALREADY_CONNECTED) {
        this._selectedNode.disconnectExit(this._selectedExitLink.name, this._highlightNode, this._highlightEntryLink.name);
        this._undoManager && this._undoManager.addEvent('Disconnected Exit Link "' + this._selectedNode.category + '.' + this._selectedNode.type + '.' + this._selectedExitLink.name + '" to Entry Link "' + this._highlightNode.category + '.' + this._highlightNode.type + '.' + this._highlightEntryLink.name + '"',
        {
          id: this._selectedNode.id,
          name: this._selectedExitLink.name,
          targetId: this._highlightNode.id,
          targetName: this._highlightEntryLink.name,
          engine: this._engine,
        },
        // Undo
        function() {
          var myNode = this.engine.nodeById(this.id);
          var targetNode = this.engine.nodeById(this.targetId);
          myNode.connectExit(this.name, targetNode, this.targetName);
        },
        // Redo
        function() {
          var myNode = this.engine.nodeById(this.id);
          var targetNode = this.engine.nodeById(this.targetId);
          myNode.disconnectExit(this.name, targetNode, this.targetName);
        });
      } else {
        this._undoManager && this._undoManager.addEvent('Connected Exit Link "' + this._selectedNode.category + '.' + this._selectedNode.type + '.' + this._selectedExitLink.name + '" to Entry Link "' + this._highlightNode.category + '.' + this._highlightNode.type + '.' + this._highlightEntryLink.name + '"',
        {
          id: this._selectedNode.id,
          name: this._selectedExitLink.name,
          targetId: this._highlightNode.id,
          targetName: this._highlightEntryLink.name,
          engine: this._engine,
        },
        // Undo
        function() {
          var myNode = this.engine.nodeById(this.id);
          var targetNode = this.engine.nodeById(this.targetId);
          myNode.disconnectExit(this.name, targetNode, this.targetName);
        },
        // Redo
        function() {
          var myNode = this.engine.nodeById(this.id);
          var targetNode = this.engine.nodeById(this.targetId);
          myNode.connectExit(this.name, targetNode, this.targetName);
        });
      }
    }
    if (this._selectedNode && this._selectedInputLink && this._highlightNode && this._highlightOutputLink) {
      if (this._selectedNode.connectInput(this._selectedInputLink.name, this._highlightNode, this._highlightOutputLink.name) === wcNode.CONNECT_RESULT.ALREADY_CONNECTED) {
        this._selectedNode.disconnectInput(this._selectedInputLink.name, this._highlightNode, this._highlightOutputLink.name);
        this._undoManager && this._undoManager.addEvent('Disconnected Property Input Link "' + this._selectedNode.category + '.' + this._selectedNode.type + '.' + this._selectedInputLink.name + '" to Property Output Link "' + this._highlightNode.category + '.' + this._highlightNode.type + '.' + this._highlightOutputLink.name + '"',
        {
          id: this._selectedNode.id,
          name: this._selectedInputLink.name,
          targetId: this._highlightNode.id,
          targetName: this._highlightOutputLink.name,
          engine: this._engine,
        },
        // Undo
        function() {
          var myNode = this.engine.nodeById(this.id);
          var targetNode = this.engine.nodeById(this.targetId);
          myNode.connectInput(this.name, targetNode, this.targetName);
        },
        // Redo
        function() {
          var myNode = this.engine.nodeById(this.id);
          var targetNode = this.engine.nodeById(this.targetId);
          myNode.disconnectInput(this.name, targetNode, this.targetName);
        });
      } else {
        this._undoManager && this._undoManager.addEvent('Connected Property Input Link "' + this._selectedNode.category + '.' + this._selectedNode.type + '.' + this._selectedInputLink.name + '" to Property Output Link "' + this._highlightNode.category + '.' + this._highlightNode.type + '.' + this._highlightOutputLink.name + '"',
        {
          id: this._selectedNode.id,
          name: this._selectedInputLink.name,
          targetId: this._highlightNode.id,
          targetName: this._highlightOutputLink.name,
          engine: this._engine,
        },
        // Undo
        function() {
          var myNode = this.engine.nodeById(this.id);
          var targetNode = this.engine.nodeById(this.targetId);
          myNode.disconnectInput(this.name, targetNode, this.targetName);
        },
        // Redo
        function() {
          var myNode = this.engine.nodeById(this.id);
          var targetNode = this.engine.nodeById(this.targetId);
          myNode.connectInput(this.name, targetNode, this.targetName);
        });
      }
    }
    if (this._selectedNode && this._selectedOutputLink && this._highlightNode && this._highlightInputLink) {
      if (this._selectedNode.connectOutput(this._selectedOutputLink.name, this._highlightNode, this._highlightInputLink.name) === wcNode.CONNECT_RESULT.ALREADY_CONNECTED) {
        this._selectedNode.disconnectOutput(this._selectedOutputLink.name, this._highlightNode, this._highlightInputLink.name);
        this._undoManager && this._undoManager.addEvent('Disconnected Property Output Link "' + this._selectedNode.category + '.' + this._selectedNode.type + '.' + this._selectedOutputLink.name + '" to Property Input Link "' + this._highlightNode.category + '.' + this._highlightNode.type + '.' + this._highlightInputLink.name + '"',
        {
          id: this._selectedNode.id,
          name: this._selectedOutputLink.name,
          targetId: this._highlightNode.id,
          targetName: this._highlightInputLink.name,
          engine: this._engine,
        },
        // Undo
        function() {
          var myNode = this.engine.nodeById(this.id);
          var targetNode = this.engine.nodeById(this.targetId);
          myNode.connectOutput(this.name, targetNode, this.targetName);
        },
        // Redo
        function() {
          var myNode = this.engine.nodeById(this.id);
          var targetNode = this.engine.nodeById(this.targetId);
          myNode.disconnectOutput(this.name, targetNode, this.targetName);
        });
      } else {
        this._undoManager && this._undoManager.addEvent('Connected Property Output Link "' + this._selectedNode.category + '.' + this._selectedNode.type + '.' + this._selectedOutputLink.name + '" to Property Input Link "' + this._highlightNode.category + '.' + this._highlightNode.type + '.' + this._highlightInputLink.name + '"',
        {
          id: this._selectedNode.id,
          name: this._selectedOutputLink.name,
          targetId: this._highlightNode.id,
          targetName: this._highlightInputLink.name,
          engine: this._engine,
        },
        // Undo
        function() {
          var myNode = this.engine.nodeById(this.id);
          var targetNode = this.engine.nodeById(this.targetId);
          myNode.disconnectOutput(this.name, targetNode, this.targetName);
        },
        // Redo
        function() {
          var myNode = this.engine.nodeById(this.id);
          var targetNode = this.engine.nodeById(this.targetId);
          myNode.connectOutput(this.name, targetNode, this.targetName);
        });
      }
    }

    // Custom viewport area.
    if (this._selectedNode && this._highlightViewport) {
      var mouse = this.__mouse(event, this.$viewport.offset());
      var pos = {
        x: (mouse.x - this._viewportCamera.x) / this._viewportCamera.z - this._selectedNode._meta.bounds.viewportBounds.left,
        y: (mouse.y - this._viewportCamera.y) / this._viewportCamera.z - this._selectedNode._meta.bounds.viewportBounds.top,
      };

      this._selectedNode.onViewportMouseUp(event, pos, this._options.readOnly);
    }

    this._selectedEntryLink = false;
    this._selectedExitLink = false;
    this._selectedInputLink = false;
    this._selectedOutputLink = false;
    this._viewportMovingNode = false;

    if (this._viewportMoving) {
      this._viewportMoving = false;

      if (!this._viewportMoved) {
        this._selectedNode = null;
        this._selectedNodes = [];
      } else {
        this._viewportMoved = false;
        this.$viewport.removeClass('wcMoving');
      }
    }
  },

  /**
   * Handle mouse entering the viewport canvas.
   * @function wcPlayEditor#__onViewportMouseEnter
   * @private
   * @param {Object} event - The mouse event.
   * @param {Object} elem - The target element.
   */
  __onViewportMouseEnter: function(event, elem) {
    this._mouseInViewport = true;
  },

  /**
   * Handle mouse leaving the viewport canvas.
   * @function wcPlayEditor#__onViewportMouseLeave
   * @private
   * @param {Object} event - The mouse event.
   * @param {Object} elem - The target element.
   */
  __onViewportMouseLeave: function(event, elem) {
    this._mouseInViewport = false;
    this.__handleAutoScroll(false);
    this.__onViewportMouseUp(event, elem);
  },

  /**
   * Handle mouse click events over the viewport canvas.
   * @function wcPlayEditor#__onViewportMouseDown
   * @private
   * @param {Object} event - The mouse event.
   * @param {Object} elem - The target element.
   */
  __onViewportMouseClick: function(event, elem) {
    if (!this._mouseMoved) {
      if (this._highlightCrumb > -1) {
        if (this._crumbBounds[this._highlightCrumb].parent !== this._parent) {
          var focusNode = this._crumbBounds[this._highlightCrumb+1].parent;
          this._parent = this._crumbBounds[this._highlightCrumb].parent;

          this._selectedNode = focusNode;
          this._selectedNodes = [focusNode];
          this.focus(this._selectedNodes);
        }
        return;
      }

      this._mouse = this.__mouse(event, this.$viewport.offset());

      var hasTarget = false;
      var node = this.__findNodeAtPos(this._mouse, this._viewportCamera);
      if (node) {
        // Debug Log button.
        if (this.__inRect(this._mouse, node._meta.bounds.debugLog, node.pos, this._viewportCamera)) {
          var state = !node._log;
          node.debugLog(state);
          this._undoManager && this._undoManager.addEvent((state? 'Enabled': 'Disabled') + ' Debug Logging for Node "' + node.category + '.' + node.type + '"',
          {
            id: node.id,
            state: state,
            engine: this._engine,
          },
          // Undo
          function() {
            var myNode = this.engine.nodeById(this.id);
            myNode.debugLog(!this.state);
          },
          // Redo
          function() {
            var myNode = this.engine.nodeById(this.id);
            myNode.debugLog(this.state);
          });
        }

        // Breakpoint button.
        if (this.__inRect(this._mouse, node._meta.bounds.breakpoint, node.pos, this._viewportCamera)) {
          var state = !node._break;
          node.debugBreak(state);
          this._undoManager && this._undoManager.addEvent((state? 'Enabled': 'Disabled') + ' Breakpoint on Node "' + node.category + '.' + node.type + '"',
          {
            id: node.id,
            state: state,
            engine: this._engine,
          },
          // Undo
          function() {
            var myNode = this.engine.nodeById(this.id);
            myNode.debugBreak(!this.state);
          },
          // Redo
          function() {
            var myNode = this.engine.nodeById(this.id);
            myNode.debugBreak(this.state);
          });
        }

        // Title label.
        if (this.__inRect(this._mouse, node._meta.bounds.titleBounds, node.pos, this._viewportCamera)) {
          this.__drawTitleEditor(node, node._meta.bounds.titleBounds);
        }

        // Details button.
        if (this.__inRect(this._mouse, node._meta.bounds.detailsBounds, node.pos, this._viewportCamera)) {
          this.__drawDetailsPopup(node);
        }

        // Property values.
        var propBounds;
        for (var i = 0; i < node._meta.bounds.valueBounds.length; ++i) {
          if (this.__inRect(this._mouse, node._meta.bounds.valueBounds[i].rect, node.pos, this._viewportCamera)) {
            propBounds = node._meta.bounds.valueBounds[i];
            break;
          }
        }

        if (propBounds) {
          for (var i = 0; i < node.properties.length; ++i) {
            if (node.properties[i].name === propBounds.name) {
              this.__drawPropertyEditor(node, node.properties[i], propBounds);
              break;
            }
          }
        }

        var propInitialBounds;
        for (var i = 0; i < node._meta.bounds.initialBounds.length; ++i) {
          if (this.__inRect(this._mouse, node._meta.bounds.initialBounds[i].rect, node.pos, this._viewportCamera)) {
            propInitialBounds = node._meta.bounds.initialBounds[i];
            break;
          }
        }

        if (propInitialBounds) {
          for (var i = 0; i < node.properties.length; ++i) {
            if (node.properties[i].name === propInitialBounds.name) {
              this.__drawPropertyEditor(node, node.properties[i], propInitialBounds, true);
              break;
            }
          }
        }

        // Custom viewport area.
        if (node._meta.bounds.viewportBounds) {
          var pos = {
            x: (this._mouse.x - this._viewportCamera.x) / this._viewportCamera.z - node._meta.bounds.viewportBounds.left,
            y: (this._mouse.y - this._viewportCamera.y) / this._viewportCamera.z - node._meta.bounds.viewportBounds.top,
          };

          if (this.__inRect(this._mouse, node._meta.bounds.viewportBounds, node.pos, this._viewportCamera)) {
            node.onViewportMouseClick(event, pos, this._options.readOnly);
          }
        }
      }
    }
  },

  /**
   * Handle mouse double click events over the viewport canvas.
   * @function wcPlayEditor#__onViewportMouseDoubleClick
   * @private
   * @param {Object} event - The mouse event.
   * @param {Object} elem - The target element.
   */
  __onViewportMouseDoubleClick: function(event, elem) {
    this._mouse = this.__mouse(event, this.$viewport.offset());

    var hasTarget = false;
    var node = this.__findNodeAtPos(this._mouse, this._viewportCamera);
    if (node) {
      // Debug Log button.
      if (this.__inRect(this._mouse, node._meta.bounds.debugLog, node.pos, this._viewportCamera)) {
        hasTarget = true;
      }

      // Breakpoint button.
      if (this.__inRect(this._mouse, node._meta.bounds.breakpoint, node.pos, this._viewportCamera)) {
        hasTarget = true;
      }

      // Property values.
      for (var i = 0; i < node._meta.bounds.valueBounds.length; ++i) {
        if (this.__inRect(this._mouse, node._meta.bounds.valueBounds[i].rect, node.pos, this._viewportCamera)) {
          hasTarget = true;
          break;
        }
      }

      // Entry links.
      if (!this._options.readOnly && !hasTarget) {
        for (var i = 0; i < node._meta.bounds.entryBounds.length; ++i) {
          if (this.__inRect(this._mouse, node._meta.bounds.entryBounds[i].rect, node.pos, this._viewportCamera)) {
            hasTarget = true;
            // Double click to manually fire this entry chain.
            node.activateEntry(node._meta.bounds.entryBounds[i].name);
            break;
          }
        }
      }

      // Exit links.
      if (!this._options.readOnly && !hasTarget) {
        for (var i = 0; i < node._meta.bounds.exitBounds.length; ++i) {
          if (this.__inRect(this._mouse, node._meta.bounds.exitBounds[i].rect, node.pos, this._viewportCamera)) {
            hasTarget = true;
            // Double click to manually fire this exit chain.
            node.activateExit(node._meta.bounds.exitBounds[i].name);
            break;
          }
        }
      }

      // Output links.
      if (!this._options.readOnly && !hasTarget) {
        for (var i = 0; i < node._meta.bounds.outputBounds.length; ++i) {
          if (this.__inRect(this._mouse, node._meta.bounds.outputBounds[i].rect, node.pos, this._viewportCamera)) {
            hasTarget = true;
            // Double click to manually fire this output chain.
            node.property(node._meta.bounds.outputBounds[i].name, node.property(node._meta.bounds.outputBounds[i].name), true);
            break;
          }
        }
      }

      // Custom viewport area.
      if (!hasTarget && node._meta.bounds.viewportBounds) {
        var pos = {
          x: (this._mouse.x - this._viewportCamera.x) / this._viewportCamera.z - node._meta.bounds.viewportBounds.left,
          y: (this._mouse.y - this._viewportCamera.y) / this._viewportCamera.z - node._meta.bounds.viewportBounds.top,
        };

        if (this.__inRect(this._mouse, node._meta.bounds.viewportBounds, node.pos, this._viewportCamera)) {
          hasTarget = node.onViewportMouseDoubleClick(event, pos, this._options.readOnly);
        }
      }

      // Center area.
      if (!hasTarget && this.__inRect(this._mouse, node._meta.bounds.inner, node.pos, this._viewportCamera)) {
        hasTarget = true;
        if (node instanceof wcNodeCompositeScript) {
          // Step into composite script nodes.
          this._parent = node;
          this._selectedNode = null;
          this._selectedNodes = [];
          this.center();
        } else if (node instanceof wcNodeComposite && this._parent instanceof wcNodeCompositeScript) {
          // Step out if double clicking on an external link node.
          var focusNode = this._parent;
          this._parent = this._parent._parent;

          this._selectedNode = focusNode;
          this._selectedNodes = [focusNode];
          this.focus(this._selectedNodes);
        } else if (node instanceof wcNodeEntry) {
          node.onActivated();
        }
      }
    }
  },

  __onViewportMouseWheel: function(event, elem) {
    var oldZoom = this._viewportCamera.z;

    // Custom viewport area.
    if (this._highlightNode && this._highlightNode._meta.bounds.viewportBounds) {
      var pos = {
        x: (this._mouse.x - this._viewportCamera.x) / this._viewportCamera.z - this._highlightNode._meta.bounds.viewportBounds.left,
        y: (this._mouse.y - this._viewportCamera.y) / this._viewportCamera.z - this._highlightNode._meta.bounds.viewportBounds.top,
      };

      if (this.__inRect(this._mouse, this._highlightNode._meta.bounds.viewportBounds, this._highlightNode.pos, this._viewportCamera) &&
          this._highlightNode.onViewportMouseWheel(event, pos, (event.originalEvent.wheelDelta > 0 || event.originalEvent.detail < 0), this._options.readOnly)) {
        return;
      }
    }

    if (event.originalEvent.wheelDelta > 0 || event.originalEvent.detail < 0) {
      // scroll up to zoom in.
      this._viewportCamera.z = Math.min(this._viewportCamera.z * 1.25, 5);
    } else {
      // scroll down to zoom out.
      this._viewportCamera.z = Math.max(this._viewportCamera.z * 0.75, 0.1);
    }

    this._viewportCamera.x = (this._viewportCamera.x - this._mouse.x) / (oldZoom / this._viewportCamera.z) + this._mouse.x;
    this._viewportCamera.y = (this._viewportCamera.y - this._mouse.y) / (oldZoom / this._viewportCamera.z) + this._mouse.y;
  },

  /**
   * Does a bounding collision test to find any nodes at a given position.
   * @function wcPlayEditor#__findNodeAtPos
   * @private
   * @param {wcPlay~Coordinates} pos - The position.
   * @param {wcPlay~Coordinates} camera - The position of the camera.
   * @param {wcNode[]} [nodes] - If supplied, will only search this list of nodes, otherwise will search all nodes in the viewport.
   * @returns {wcNode|null} - A node at the given position, or null if none was found.
   */
  __findNodeAtPos: function(pos, camera, nodes) {
    if (this._parent) {
      var self = this;
      function __test(nodes) {
        // Iterate backwards so we always test the nodes that are drawn on top first.
        for (var i = nodes.length-1; i >= 0; --i) {
          if (nodes[i]._meta.bounds && self.__inRect(pos, nodes[i]._meta.bounds.rect, nodes[i].pos, camera)) {
            return nodes[i];
          }
        }
        return null;
      };

      if (nodes === undefined) {
        return __test(this._parent._storageNodes) ||
               __test(this._parent._compositeNodes) ||
               __test(this._parent._processNodes) ||
               __test(this._parent._entryNodes);
      } else {
        return __test(nodes);
      }
    }
    return null;
  },

  /**
   * Finds the category area of the palette at a given position.
   * @function wcPlayEditor#__findCategoryAreaAtPos
   * @private
   * @param {wcPlay~Coordinates} pos - The position.
   * @returns {Object|null} - The category data found, or null if not found.
   */
  __findCategoryAreaAtPos: function(pos) {
    for (var cat in this._nodeLibrary) {
      for (var type in this._nodeLibrary[cat]) {

        // Ignore types that are not visible.
        if (!this.$typeButton[this.__typeIndex(type)].hasClass('wcToggled')) continue;

        var typeData = this._nodeLibrary[cat][type];

        // Ignore categories that are not visible.
        if (typeData.$button.hasClass('wcToggled')) continue;

        var rect = typeData.$canvas.offset();
        rect.width = typeData.$canvas.width();
        rect.height = typeData.$canvas.height();
        if (this.__inRect(pos, rect)) {
          return typeData;
        }
      }
    }
  },
};