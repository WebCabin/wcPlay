/**
 * @class
 * Renders the Play script using an HTML5 canvas element (among other things).
 *
 * @constructor
 * @description
 * @param {external:jQuery~Object|external:jQuery~Selector|external:domNode} container - The container element.
 * @param {wcRenderCanvas~Options} [options] - Custom options.
 */
function wcRenderCanvas(container, options) {
  this.$container = $(container);
  this.$viewport = null;
  this._viewportContext = null;
  this.$palette = null;
  this._paletteContext = null;
  this._paletteSize = 0.25;

  this._size = {x: 0, y: 0};

  this._engine = null;
  this._viewportCamera = {x: 0, y: 0, z: 1};
  this._paletteCamera = {x: 0, y: 0, z: 1};

  this._nodeLibrary = {};

  this._font = {
    title: {size: 20, family: 'Arial'},
    links: {size: 15, family: 'Arial'},
    property: {size: 15, family: 'Arial'},
    value: {size: 15, family: 'Arial'},
  };

  this._drawStyle = {
    palette: {
      spacing: 20,        // Spacing between nodes in the palette view.
    },
    node: {
      radius: 40,         // The radius to draw node corners.
      margin: 10,         // The pixel space between the property text and the edge of the node border.
    },
    links: {
      length: 12,         // Length of each link 'nub'
      width: 8,           // Width of each link 'nub'
      spacing: 10,        // The pixel space between the text of adjacent links.
      padding: 5,         // The pixel space between the link and its text.
      margin: 10,         // The pixel space between the link text and the edge of the node border.
    },
    property: {
      spacing: 5,         // The pixel space between adjacent properties.
    },
  };

  // Update properties.
  this._lastUpdate = 0;

  // Setup our options.
  this._options = {
    readOnly: false,
  };
  for (var prop in options) {
    this._options[prop] = options[prop];
  }

  this.$palette = $('<canvas style="position: absolute; top: 0px; left: 0px; height: 100%; border-right:2px solid black;">');
  this._paletteContext = this.$palette[0].getContext('2d');
  this.$viewport = $('<canvas style="position: absolute; top: 0px; right: 0px; height: 100%;">');
  this._viewportContext = this.$viewport[0].getContext('2d');

  this.$container.append(this.$palette);
  this.$container.append(this.$viewport);

  this.onResized();

  window.requestAnimationFrame(this.__update.bind(this));
}


wcRenderCanvas.prototype = {
  /**
   * Gets, or Sets the {@link wcPlay} engine that this renderer will render.
   * @function wcRenderCanvas#engine
   * @param {wcPlay} [engine] - If supplied, will assign a new {@link wcPlay} engine to render.
   * @returns {wcPlay} - The current {@link wcPlay} engine.
   */
  engine: function(engine) {
    if (engine !== undefined) {
      if (this._engine) {
        var index = this._engine._renders.indexOf(this);
        if (index > -1) {
          this._engine._renders.splice(index, 1);
        }
      }

      this._engine = engine;

      if (this._engine) {
        this._engine._renders.push(this);
      }
    }

    return this._engine;
  },

  /**
   * Positions the canvas view to the center of all nodes.
   * @function wcRenderCanvas#center
   */
  center: function() {
    // TODO:
  },

  /**
   * Event that is called when the container view is resized.
   * @function wcRenderCanvas#onResized
   */
  onResized: function() {
    var width = this.$container.width();
    var height= this.$container.height();

    if (this._size.x !== width || this._size.y !== height) {
      this._size.x = width;
      this._size.y = height;

      var w = width * this._paletteSize;
      this.$palette.css('width', w).attr('width', w).attr('height', height);
      this.$viewport.css('width', width - w).attr('width', width - w).attr('height', height);
    }
  },

  /**
   * Renders a new frame.
   * @function wcRenderCanvas#__update
   * @private
   */
  __update: function(timestamp) {
    if (!this._lastUpdate) {
      this._lastUpdate = timestamp;
    }
    var elapsed = 0;
    elapsed = (timestamp - this._lastUpdate) / 1000;

    this._lastUpdate = timestamp;

    this.onResized();

    if (this._engine) {
      // Palette
      for (var i = 0; i < wcPlay.NODE_LIBRARY.length; ++i) {
        var data = wcPlay.NODE_LIBRARY[i];

        // Initialize the node category if it is new.
        if (!this._nodeLibrary.hasOwnProperty(data.category)) {
          this._nodeLibrary[data.category] = {};
        }

        // Make sure an instance of the node exists so we can render it.
        if (!this._nodeLibrary[data.category].hasOwnProperty(data.name)) {
          this._nodeLibrary[data.category][data.name] = new window[data.name](null);
        }
      }

      // Render the nodes in the palette.
      this._paletteContext.clearRect(0, 0, this.$palette.width(), this.$palette.height());
      var yPos = this._drawStyle.palette.spacing;
      var xPos = this.$palette.width() / 2;
      for (var cat in this._nodeLibrary) {
        for (var node in this._nodeLibrary[cat]) {
          var drawData = this.__drawNode(this._nodeLibrary[cat][node], {x: this._paletteCamera.x + xPos, y: this._paletteCamera.y + yPos}, this._paletteContext);
          yPos += drawData.rect.height + this._drawStyle.palette.spacing;
        }
      }
    }

    window.requestAnimationFrame(this.__update.bind(this));
  },

  /**
   * Assigns font data to the canvas.
   * @function wcRenderCanvas#__setCanvasFont
   * @private
   * @param {Object} font - The font data to assign (wcRenderCanvas~_font object).
   * @param {external:Canvas~Context} context - The canvas context.
   */
  __setCanvasFont: function(font, context) {
    context.font = font.size + 'px ' + font.family;
  },

  /**
   * Retrieves a bounding rectangle that encloses all given rectangles.
   * @function wcRenderCanvas#__boundingRect
   * @private
   * @param {wcRenderCanvas~Rect[]} rects - A list of rectangles to expand from.
   * @param {wcRenderCanvas~Rect} - A bounding rectangle that encloses all given rectangles.
   */
  __boundingRect: function(rects) {
    var bounds = {
      top: rects[0].top,
      left: rects[0].left,
      width: rects[0].width,
      height: rects[0].height,
    };

    for (var i = 1; i < rects.length; ++i) {
      if (rects[i].top < bounds.top) {
        bounds.top = rects[i].top;
      }
      if (rects[i].left < bounds.left) {
        bounds.left = rects[i].left;
      }
      if (rects[i].top + rects[i].height > bounds.top + bounds.height) {
        bounds.height = (rects[i].top + rects[i].height) - bounds.top;
      }
      if (rects[i].left + rects[i].width > bounds.left + bounds.width) {
        bounds.width = (rects[i].left + rects[i].width) - bounds.left;
      }
    }

    return bounds;
  },

  /**
   * Draws a single node on the canvas at a given position.
   * @function wcRenderCanvas#__drawNode
   * @private
   * @param {wcNode} node - The node to render.
   * @param {wcPlay~Coordinates} pos - The position to render the node in the canvas, relative to the top-middle of the node.
   * @param {external:Canvas~Context} context - The canvas context to render on.
   * @param {wcRenderCanvas~DrawNodeOptions} [options] - Custom options.
   * @returns {wcRenderCanvas~DrawNodeData} - Data associated with the newly drawn node.
   */
  __drawNode: function(node, pos, context, options) {
    var data = {
      rect: {
        top: pos.y,
        left: pos.x,
        width: 0,
        height: 0,
      },
    };

    var entryBounds  = this.__measureEntryLinks(node, context, pos);
    var centerBounds = this.__measureCenter(node, context, {x: pos.x, y: pos.y + entryBounds.height});


    data.rect.width = Math.max(entryBounds.width, 0);
    data.rect.height = entryBounds.height + this._drawStyle.links.length;


    this.__drawCenter(node, context, this.__boundingRect([centerBounds, entryBounds]));
    data.entryLinks = this.__drawEntryLinks(node, context, pos, entryBounds.width);

    data.rect = this.__boundingRect([entryBounds, centerBounds]);


    context.strokeStyle = "gray";
    context.strokeRect(entryBounds.left, entryBounds.top, entryBounds.width, entryBounds.height);
    context.strokeRect(centerBounds.left, centerBounds.top, centerBounds.width, centerBounds.height);
    context.strokeRect(data.rect.left, data.rect.top, data.rect.width, data.rect.height);
    return data;
  },

  /**
   * Measures the space to render entry links for a node.
   * @function wcRenderCanvas#__measureEntryLinks
   * @private
   * @param {wcNode} node - The node to measure.
   * @param {external:Canvas~Context} context - the canvas context.
   * @param {wcPlay~Coordinates} pos - The (top, center) position to measure the links.
   * @returns {wcRenderCanvas~Rect} - A bounding rectangle. The height is only the amount of space rendered within the node bounds (links stick out).
   */
  __measureEntryLinks: function(node, context, pos) {
    var bounds = {
      top: pos.y,
      left: pos.x,
      width: 0,
      height: 0,
    };

    this.__setCanvasFont(this._font.links, context);

    var collapsed = node._collapsed;
    var links = node.chain.entry;
    for (var i = 0; i < links.length; ++i) {
      if (!collapsed || links[i].links.length) {
        bounds.width += context.measureText(links[i].name).width + this._drawStyle.links.spacing;
      }
    }

    bounds.left -= bounds.width/2 + this._drawStyle.links.margin;
    bounds.width += this._drawStyle.links.margin * 2;
    if (node.chain.entry.length) {
      bounds.height = this._font.links.size + this._drawStyle.links.padding + this._drawStyle.links.length;
    }
    return bounds;
  },

  /**
   * Draws the entry links of a node.
   * @function wcRenderCanvas#__drawEntryLinks
   * @private
   * @param {wcNode} node - The node to draw.
   * @param {external:Canvas~Context} context - the canvas context.
   * @param {wcPlay~Coordinates} pos - The (top, center) position to draw the links on the canvas.
   * @param {Number} width - The width of the area to draw in.
   */
  __drawEntryLinks: function(node, context, pos, width) {
    var xPos = pos.x - width/2 + this._drawStyle.links.margin;
    var yPos = pos.y + this._drawStyle.links.length + this._drawStyle.links.padding + this._font.links.size;

    this.__setCanvasFont(this._font.links, context);
    context.fillStyle = "black";

    var collapsed = node._collapsed;
    var links = node.chain.entry;
    for (var i = 0; i < links.length; ++i) {
      if (!collapsed || links[i].links.length) {
        // Link label
        var w = context.measureText(links[i].name).width + this._drawStyle.links.spacing;
        context.fillText(links[i].name, xPos + this._drawStyle.links.spacing/2, yPos);

        // Link nub
        context.fillRect(xPos + w/2 - this._drawStyle.links.width/2, yPos - this._drawStyle.links.length - this._font.links.size - this._drawStyle.links.padding, this._drawStyle.links.width, this._drawStyle.links.length);

        xPos += w;
      }
    }
  },

  /**
   * Measures the space to render the center area for a node.
   * @function wcRenderCanvas#__measureCenter
   * @private
   * @param {wcNode} node - The node to measure.
   * @param {external:Canvas~Context} context - the canvas context.
   * @param {wcPlay~Coordinates} pos - The (top, center) position to measure.
   * @returns {wcRenderCanvas~Rect} - A bounding rectangle. The height is only the amount of space rendered within the node bounds (links stick out).
   */
  __measureCenter: function(node, context, pos) {
    var bounds = {
      top: pos.y,
      left: pos.x,
      width: 0,
      height: this._font.title.size,
    };

    // Measure the title bar area.
    this.__setCanvasFont(this._font.title, context);
    bounds.width = context.measureText(node.name).width;

    // Measure properties.
    this.__setCanvasFont(this._font.property, context);
    var collapsed = node._collapsed;
    var links = node.properties;
    for (var i = 0; i < links.length; ++i) {
      // if (!collapsed || links[i].inputs.length || links[i].outputs.length) {
        bounds.height += this._font.property.size + this._drawStyle.property.spacing;
        var w = context.measureText(links[i].name + ': [' + node.property(links[i].name) + ']').width;
        bounds.width = Math.max(w, bounds.width);
      // }
    }

    bounds.left -= bounds.width/2 + this._drawStyle.node.margin;
    bounds.width += this._drawStyle.node.margin * 2;
    return bounds;
  },

  /**
   * Measures the space to render the center area for a node.
   * @function wcRenderCanvas#__drawCenter
   * @private
   * @param {wcNode} node - The node to draw.
   * @param {external:Canvas~Context} context - the canvas context.
   * @param {wcRenderCanvas~Rect} rect - The bounding area to draw in.
   */
  __drawCenter: function(node, context, rect) {

    var upper = (node.chain.entry.length)? this._drawStyle.links.length: 0;
    var lower = (node.chain.exit.length)? this._font.links.size + this._drawStyle.links.padding: 0;

    // Node background
    context.save();
    var gradient = context.createRadialGradient(
      rect.left + rect.width/2,
      rect.top + rect.height/2,
      10,
      rect.left + rect.width/2,
      rect.top + rect.height/2,
      Math.max(rect.width, rect.height));
    gradient.addColorStop(0, node.color);
    gradient.addColorStop(1, "white");
    context.fillStyle = gradient;
    context.strokeStyle = gradient;
    context.lineJoin = "round";
    var radius = this._drawStyle.node.radius;
    context.lineWidth = radius;
    context.fillRect(rect.left + radius/2, rect.top + upper + radius/2, rect.width - radius, rect.height + lower - radius);
    context.strokeRect(rect.left + radius/2, rect.top + upper + radius/2, rect.width - radius, rect.height + lower - radius);
    context.restore();
    // context.strokeStyle = node.color;
    // context.lineWidth = 1;
    // context.strokeRect(rect.left, rect.top - upper, rect.width, rect.height + upper + lower);

    // // Title Bar
    // this.fillStyle = "black";
    // this.__setCanvasFont(this._font.title, context);
    // context.fillText()
    // bounds.width = context.measureText(node.name).width;

    // // Measure properties.
    // this.__setCanvasFont(this._font.property, context);
    // var collapsed = node._collapsed;
    // var links = node.properties;
    // for (var i = 0; i < links.length; ++i) {
    //   // if (!collapsed || links[i].inputs.length || links[i].outputs.length) {
    //     bounds.height += this._font.property.size + this._drawStyle.property.spacing;
    //     var w = context.measureText(links[i].name + ': ' + node.property(links[i].name)).width;
    //     bounds.width = Math.max(w, bounds.width);
    //   // }
    // }

    // bounds.left -= bounds.width/2;
    // return bounds;
  },
};