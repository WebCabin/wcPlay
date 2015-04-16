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
    title: {size: 20, family: 'Arial', weight: 'bold'},
    links: {size: 15, family: 'Arial'},
    property: {size: 15, family: 'Arial', weight: 'italic'},
    value: {size: 15, family: 'Arial', weight: 'bold'},
  };

  this._drawStyle = {
    palette: {
      spacing: 20,        // Spacing between nodes in the palette view.
    },
    node: {
      radius: 40,         // The radius to draw node corners.
      margin: 10,         // The pixel space between the property text and the edge of the node border.
    },
    title: {
      spacing: 5,         // The pixel space between the title text and the bar that separates the properties.
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
      strLen: 10,         // The maximum character length a property value can display.
    },
  };

  // Update properties.
  this._lastUpdate = 0;
  this._elapsed = 0;

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
        var index = this._engine._renderers.indexOf(this);
        if (index > -1) {
          this._engine._renderers.splice(index, 1);
        }
      }

      this._engine = engine;

      if (this._engine) {
        this._engine._renderers.push(this);
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
    this._elapsed = (timestamp - this._lastUpdate) / 1000;

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

      // Render the nodes in the main script.
      this._viewportContext.clearRect(0, 0, this.$viewport.width(), this.$viewport.height());
      this.__drawNodes(this._engine._entryNodes, this._viewportContext);
      this.__drawNodes(this._engine._processNodes, this._viewportContext);
      this.__drawNodes(this._engine._compositeNodes, this._viewportContext);
      this.__drawNodes(this._engine._storageNodes, this._viewportContext);
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
    context.font = (font.weight? font.weight + ' ': '') + (font.size + 'px ') + font.family;
  },

  /**
   * Clamps a given string value to a specific number of characters and appends a '...' if necessary.
   * @function wcRenderCanvas#__clampString
   * @private
   * @param {String} str - The string to clamp.
   * @param {Number} len - The number of characters to allow.
   * @returns {String} - A clamped string.
   */
  __clampString: function(str, len) {
    if (str.length > len) {
      return str.substring(0, len) + '...';
    }
    return str;
  },

  /**
   * Blends two colors together.
   * @function wcRenderCanvas#__blendColors
   * @private
   * @param {String} c0 - The first color, must be in hex string format: "#FFFFFF".
   * @param {String} c1 - The second color, must be in hex string format: "#FFFFFF".
   * @param {Number} p - a multiplier to blend the colors by.
   */
  __blendColors: function(c0, c1, p) {
    var f=parseInt(c0.slice(1),16),t=parseInt(c1.slice(1),16),R1=f>>16,G1=f>>8&0x00FF,B1=f&0x0000FF,R2=t>>16,G2=t>>8&0x00FF,B2=t&0x0000FF;
    return "#"+(0x1000000+(Math.round((R2-R1)*p)+R1)*0x10000+(Math.round((G2-G1)*p)+G1)*0x100+(Math.round((B2-B1)*p)+B1)).toString(16).slice(1);
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
   * Draws a list of nodes on the canvas.
   * @function wcRenderCanvas#__drawNodes
   * @private
   * @param {wcNode[]} node - The node to render.
   * @param {external:Canvas~Context} context - The canvas context to render on.
   * @param {wcRenderCanvas~DrawNodeOptions} [options] - Custom options.
   */
  __drawNodes: function(nodes, context, options) {
    for (var i = 0; i < nodes.length; ++i) {
      this.__drawNode(nodes[i], nodes[i].pos, context, options);
    }
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
      node: node,
      rect: {
        top: pos.y,
        left: pos.x,
        width: 0,
        height: 0,
      },
    };

    // Update flash state.
    if (node._meta.flash) {
      node._meta.flashDelta += this._elapsed * 10.0;
      if (node._meta.flashDelta >= 1.0) {
        node._meta.flashDelta = 1.0;

        if (!node._meta.awake) {
          node._meta.flash = false;
        }
      }
    } else if (node._meta.flashDelta > 0.0) {
      node._meta.flashDelta -= this._elapsed * 5.0;
      if (node._meta.flashDelta <= 0.0) {
        node._meta.flashDelta = 0;
      }
    }

    node._meta.color = this.__blendColors(node.color, "#FFFFFF", node._meta.flashDelta*0.5);

    // Take some measurements so we know where everything on the node should be drawn.
    var entryBounds  = this.__measureEntryLinks(node, context, pos);
    var centerBounds = this.__measureCenter(node, context, {x: pos.x, y: pos.y + entryBounds.height});
    var exitBounds   = this.__measureExitLinks(node, context, {x: pos.x, y: pos.y + entryBounds.height + centerBounds.height});

    var bounds = this.__boundingRect([entryBounds, centerBounds, exitBounds]);
    bounds.top = centerBounds.top;
    bounds.height = centerBounds.height;

    // Now use our measurements to draw our node.
    var propBounds  = this.__drawCenter(node, context, bounds);
    var entryLinkBounds = this.__drawEntryLinks(node, context, pos, entryBounds.width);
    var exitLinkBounds = this.__drawExitLinks(node, context, {x: pos.x, y: pos.y + entryBounds.height + centerBounds.height}, exitBounds.width);

    data.entryBounds = entryLinkBounds;
    data.exitBounds = exitLinkBounds;
    data.inputBounds = propBounds.inputBounds;
    data.outputBounds = propBounds.outputBounds;
    data.valueBounds = propBounds.valueBounds;

    data.rect = this.__boundingRect([entryBounds, centerBounds, exitBounds]);
    data.rect.left -= this._drawStyle.links.length;
    data.rect.width += this._drawStyle.links.length * 2;

    context.strokeStyle = "gray";
    // context.strokeRect(entryBounds.left, entryBounds.top, entryBounds.width, entryBounds.height);
    // context.strokeRect(exitBounds.left, exitBounds.top, exitBounds.width, exitBounds.height);
    // context.strokeRect(centerBounds.left, centerBounds.top, centerBounds.width, centerBounds.height);
    // context.strokeRect(data.rect.left, data.rect.top, data.rect.width, data.rect.height);
    return data;
  },

  /**
   * Measures the space to render entry links for a node.
   * @function wcRenderCanvas#__measureEntryLinks
   * @private
   * @param {wcNode} node - The node to measure.
   * @param {external:Canvas~Context} context - The canvas context.
   * @param {wcPlay~Coordinates} pos - The (top, center) position to measure the links.
   * @returns {wcRenderCanvas~Rect} - A bounding rectangle.
   */
  __measureEntryLinks: function(node, context, pos) {
    var bounds = {
      top: pos.y,
      left: pos.x,
      width: 0,
      height: 0,
    };

    this.__setCanvasFont(this._font.links, context);

    var collapsed = node.collapsed();
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
   * Measures the space to render exit links for a node.
   * @function wcRenderCanvas#__measureExitLinks
   * @private
   * @param {wcNode} node - The node to measure.
   * @param {external:Canvas~Context} context - The canvas context.
   * @param {wcPlay~Coordinates} pos - The (top, center) position to measure the links.
   * @returns {wcRenderCanvas~Rect} - A bounding rectangle.
   */
  __measureExitLinks: function(node, context, pos) {
    var bounds = {
      top: pos.y,
      left: pos.x,
      width: 0,
      height: 0,
    };

    this.__setCanvasFont(this._font.links, context);

    var collapsed = node.collapsed();
    var links = node.chain.exit;
    for (var i = 0; i < links.length; ++i) {
      if (!collapsed || links[i].links.length) {
        bounds.width += context.measureText(links[i].name).width + this._drawStyle.links.spacing;
      }
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
   * @function wcRenderCanvas#__measureCenter
   * @private
   * @param {wcNode} node - The node to measure.
   * @param {external:Canvas~Context} context - The canvas context.
   * @param {wcPlay~Coordinates} pos - The (top, center) position to measure.
   * @returns {wcRenderCanvas~Rect} - A bounding rectangle. The height is only the amount of space rendered within the node bounds (links stick out).
   */
  __measureCenter: function(node, context, pos) {
    var bounds = {
      top: pos.y,
      left: pos.x,
      width: 0,
      height: this._font.title.size + this._drawStyle.title.spacing + this._drawStyle.links.padding,
    };

    // Measure the title bar area.
    this.__setCanvasFont(this._font.title, context);
    bounds.width = context.measureText(node.name).width;

    // Measure properties.
    var collapsed = node.collapsed();
    var props = node.properties;
    for (var i = 0; i < props.length; ++i) {
      bounds.height += this._font.property.size + this._drawStyle.property.spacing;

      // Property name.
      this.__setCanvasFont(this._font.property, context);
      var w = context.measureText(props[i].name + ': ').width;

      // Property value.
      this.__setCanvasFont(this._font.value, context);
      w += context.measureText('[' + this.__clampString(node.property(props[i].name).toString(), this._drawStyle.property.strLen) + ']').width;
      bounds.width = Math.max(w, bounds.width);
    }

    bounds.left -= bounds.width/2 + this._drawStyle.node.margin;
    bounds.width += this._drawStyle.node.margin * 2;
    return bounds;
  },

  /**
   * Draws the entry links of a node.
   * @function wcRenderCanvas#__drawEntryLinks
   * @private
   * @param {wcNode} node - The node to draw.
   * @param {external:Canvas~Context} context - The canvas context.
   * @param {wcPlay~Coordinates} pos - The (top, center) position to draw the links on the canvas.
   * @param {Number} width - The width of the area to draw in.
   * @returns {wcRenderCanvas~BoundingData[]} - An array of bounding rectangles, one for each link 'nub'.
   */
  __drawEntryLinks: function(node, context, pos, width) {
    var xPos = pos.x - width/2 + this._drawStyle.links.margin;
    var yPos = pos.y + this._drawStyle.links.length + this._font.links.size;

    this.__setCanvasFont(this._font.links, context);
    context.fillStyle = "black";

    var result = [];

    var collapsed = node.collapsed();
    var links = node.chain.entry;
    for (var i = 0; i < links.length; ++i) {
      if (!collapsed || links[i].links.length) {
        // Link label
        var w = context.measureText(links[i].name).width + this._drawStyle.links.spacing;
        context.fillText(links[i].name, xPos + this._drawStyle.links.spacing/2, yPos);

        // Link nub
        var rect = {
          top: yPos - this._drawStyle.links.length - this._font.links.size,
          left: xPos + w/2 - this._drawStyle.links.width/2,
          width: this._drawStyle.links.width,
          height: this._drawStyle.links.length,
        };

        context.fillRect(rect.left, rect.top, rect.width, rect.height);
        result.push({
          rect: rect,
          name: links[i].name,
        });

        xPos += w;
      }
    }

    return result;
  },

  /**
   * Draws the exit links of a node.
   * @function wcRenderCanvas#__drawExitLinks
   * @private
   * @param {wcNode} node - The node to draw.
   * @param {external:Canvas~Context} context - The canvas context.
   * @param {wcPlay~Coordinates} pos - The (top, center) position to draw the links on the canvas.
   * @param {Number} width - The width of the area to draw in.
   * @returns {wcRenderCanvas~BoundingData[]} - An array of bounding rectangles, one for each link 'nub'.
   */
  __drawExitLinks: function(node, context, pos, width) {
    var xPos = pos.x - width/2 + this._drawStyle.links.margin;
    var yPos = pos.y + this._font.links.size;

    this.__setCanvasFont(this._font.links, context);
    context.fillStyle = "black";

    var result = [];

    var collapsed = node.collapsed();
    var links = node.chain.exit;
    for (var i = 0; i < links.length; ++i) {
      if (!collapsed || links[i].links.length) {
        // Link label
        var w = context.measureText(links[i].name).width + this._drawStyle.links.spacing;
        context.fillText(links[i].name, xPos + this._drawStyle.links.spacing/2, yPos);

        // Link nub
        var rect = {
          top: yPos + this._drawStyle.links.padding,
          left: xPos + w/2 - this._drawStyle.links.width/2,
          width: this._drawStyle.links.width,
          height: this._drawStyle.links.length,
        };

        context.beginPath();
        context.moveTo(rect.left, rect.top);
        context.lineTo(rect.left + rect.width, rect.top);
        context.lineTo(rect.left + rect.width, rect.top + rect.height/2);
        context.lineTo(rect.left + rect.width/2, rect.top + rect.height);
        context.lineTo(rect.left, rect.top + rect.height/2);
        context.closePath();
        context.stroke();
        context.fill();
        result.push({
          rect: rect,
          name: links[i].name,
        });

        xPos += w;
      }
    }

    return result;
  },

  /**
   * Measures the space to render the center area for a node.
   * @function wcRenderCanvas#__drawCenter
   * @private
   * @param {wcNode} node - The node to draw.
   * @param {external:Canvas~Context} context - The canvas context.
   * @param {wcRenderCanvas~Rect} rect - The bounding area to draw in.
   * @returns {wcRenderCanvas~DrawPropertyData} - Contains bounding rectangles for various drawings.
   */
  __drawCenter: function(node, context, rect) {
    var upper = (node.chain.entry.length)? this._font.links.size + this._drawStyle.links.padding: 0;
    var lower = ((node.chain.exit.length)? this._font.links.size + this._drawStyle.links.padding: 0) - ((this._font.links.size + this._drawStyle.links.padding) - upper);

    // Node background
    context.save();
      var left = rect.left + rect.width/2;
      var top = rect.top + (rect.height)/2;
      var gradient = context.createRadialGradient(left, top, 10, left, top, Math.max(rect.width, rect.height));
      gradient.addColorStop(0, node._meta.color);
      gradient.addColorStop(1, "white");
      context.fillStyle = context.strokeStyle = gradient;
      context.lineJoin = "round";
      var radius = this._drawStyle.node.radius;
      context.lineWidth = radius;
      context.fillRect(rect.left + radius/2, rect.top - upper + radius/2, rect.width - radius, rect.height + lower - radius/2);
      context.strokeRect(rect.left + radius/2, rect.top - upper + radius/2, rect.width - radius, rect.height + lower - radius/2);
    context.restore();

    // Title Upper Bar
    upper = 0;
    if (node.chain.entry.length) {
      context.strokeStyle = node._meta.color;
      context.beginPath();
      context.moveTo(rect.left, rect.top + upper);
      context.lineTo(rect.left + rect.width, rect.top + upper);
      context.stroke();
    }

    // Title Text
    upper += this._font.title.size;
    context.fillStyle = "black";
    context.strokeStyle = "black";
    this.__setCanvasFont(this._font.title, context);
    context.fillText(node.name, rect.left + this._drawStyle.node.margin, rect.top + upper);

    // Title Lower Bar
    upper += this._drawStyle.title.spacing;
    // context.strokeStyle = node._meta.color;
    // context.beginPath();
    // context.moveTo(rect.left, rect.top + upper);
    // context.lineTo(rect.left + rect.width, rect.top + upper);
    // context.stroke();

    // Properties
    var result = {
      valueBounds:  [],
      inputBounds:  [],
      outputBounds: [],
    };
    var linkRect;

    context.save();
    var collapsed = node.collapsed();
    var props = node.properties;
    for (var i = 0; i < props.length; ++i) {
      upper += this._font.property.size;

      // Property name.
      context.textAlign = "left";
      this.__setCanvasFont(this._font.property, context);
      context.fillText(props[i].name + ': ', rect.left + this._drawStyle.node.margin, rect.top + upper);

      // Property value.
      context.textAlign = "right";
      this.__setCanvasFont(this._font.value, context);
      context.fillText('[' + this.__clampString(node.property(props[i].name).toString(), this._drawStyle.property.strLen) + ']', rect.left + rect.width - this._drawStyle.node.margin, rect.top + upper);
      var w = context.measureText('[' + this.__clampString(node.property(props[i].name).toString(), this._drawStyle.property.strLen) + ']').width;

      result.valueBounds.push({
        rect: {
          top: upper - this._font.property.size,
          left: rect.left + rect.width - this._drawStyle.node.margin,
          width: w,
          height: this._font.property.size,
        },
        name: props[i].name,
      });

      // Property input.
      if (!collapsed || props[i].inputs.length) {
        linkRect = {
          top: rect.top + upper - this._font.property.size/3 - this._drawStyle.links.width/2,
          left: rect.left - this._drawStyle.links.length,
          width: this._drawStyle.links.length,
          height: this._drawStyle.links.width,
        };

        context.fillRect(linkRect.left, linkRect.top, linkRect.width, linkRect.height);
        result.inputBounds.push({
          rect: linkRect,
          name: props[i].name,
        });
      }

      // Property output.
      if (!collapsed || props[i].outputs.length) {
        linkRect = {
          top: rect.top + upper - this._font.property.size/3 - this._drawStyle.links.width/2,
          left: rect.left + rect.width,
          width: this._drawStyle.links.length,
          height: this._drawStyle.links.width,
        }
        // context.fillRect(linkRect.left, linkRect.top, linkRect.width/2, linkRect.height);
        context.beginPath();
        context.moveTo(linkRect.left, linkRect.top);
        context.lineTo(linkRect.left + linkRect.width/2, linkRect.top);
        context.lineTo(linkRect.left + linkRect.width, linkRect.top + linkRect.height/2);
        context.lineTo(linkRect.left + linkRect.width/2, linkRect.top + linkRect.height);
        context.lineTo(linkRect.left, linkRect.top + linkRect.height);
        context.closePath();
        context.stroke();
        context.fill();
        result.outputBounds.push({
          rect: linkRect,
          name: props[i].name,
        });
      }

      upper += this._drawStyle.property.spacing;
    }
    context.restore();

    // Lower Bar
    if (node.chain.exit.length) {
      context.strokeStyle = node._meta.color;
      context.beginPath();
      context.moveTo(rect.left, rect.top + rect.height);
      context.lineTo(rect.left + rect.width, rect.top + rect.height);
      context.stroke();
    }
    return result;
  },
};