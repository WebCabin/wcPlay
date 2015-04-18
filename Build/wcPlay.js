/* Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 * Modified by Jeff Houde https://play.webcabin.org/
 */
(function(){
  var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
 
  // The base Class implementation (does nothing)
  this.Class = function(){};
 
  // Create a new Class that inherits from this class
  Class.extend = function() {
    // First argument is always the class name.
    var className = arguments[0];
    // Full argument list will all be passed into the classInit function call.
    // Last argument is always the class definition.
    var prop = arguments[arguments.length-1];

    var _super = this.prototype;
   
    // Instantiate a base class (but only create the instance,
    // don't run the init constructor)
    initializing = true;
    var prototype = new this(arguments);
    initializing = false;
   
    // Copy the properties over onto the new prototype
    for (var name in prop) {
      // Check if we're overwriting an existing function
      prototype[name] = typeof prop[name] == "function" &&
        typeof _super[name] == "function" && fnTest.test(prop[name]) ?
        (function(name, fn){
          return function() {
            var tmp = this._super;
           
            // Add a new ._super() method that is the same method
            // but on the super-class
            this._super = _super[name];
           
            // The method only need to be bound temporarily, so we
            // remove it when we're done executing
            var ret = fn.apply(this, arguments);        
            this._super = tmp;
           
            return ret;
          };
        })(name, prop[name]) :
        prop[name];
    }
   
    // The dummy class constructor
    function Class() {
      // All construction is actually done in the init method
      if (!initializing) {
        this.init && this.init.apply(this, arguments);
      } else {
        this.classInit && this.classInit.apply(this, arguments[0]);
      }
    }
   
    // Populate our constructed prototype object
    Class.prototype = prototype;
   
    // Enforce the constructor to be what we expect
    Class.prototype.constructor = Class;
 
    // And make this class extendable
    Class.extend = arguments.callee;
   
    window[className] = Class;
  };
})();
/**
 * @class
 * The main scripting engine.
 *
 * @constructor
 * @param {wcPlay~Options} [options] - Custom options.
 */
function wcPlay(options) {
  this._entryNodes = [];
  this._processNodes = [];
  this._compositeNodes = [];
  this._storageNodes = [];

  this._properties = [];

  this._queuedChain = [];
  this._queuedProperties = [];

  this._updateID = 0;
  this._isPaused = false;
  this._isStepping = false;

  this._editors = [];

  // Setup our options.
  this._options = {
    silent: false,
    updateRate: 25,
    updateLimit: 100,
    debugging: true,
  };
  for (var prop in options) {
    this._options[prop] = options[prop];
  }
};

/**
 * Determines how a property's control should be rendered within the editor view.
 * @enum {String}
 */
wcPlay.PROPERTY_TYPE = {
  /** Displays the property based on the type of data it holds. Options depend on the property type it holds, you can include properties from all the types together as they do not share option values. */
  DYNAMIC: 'dynamic',
  /** Displays the property as a checkbox. No options are used. */
  TOGGLE: 'toggle',
  /** Displays the property as a number control. [Number options]{@link wcNode~NumberOptions} are used. */
  NUMBER: 'number',
  /** Displays the property as a text field. [String options]{@link wcNode~StringOptions} are used. */
  STRING: 'string',
  /** Displays the property as a combo box control. [Select options]{@link wcNode~SelectOptions} are used. */
  SELECT: 'select',
};

/**
 * The different types of nodes.
 * @enum {String}
 */
wcPlay.NODE_TYPE = {
  ENTRY: 'entry',
  PROCESS: 'process',
  COMPOSITE: 'composite',
  STORAGE: 'storage',
};

/**
 * A global list of nodes that exist. All node types must add themselves into this list when they are coded.
 * @member
 */
wcPlay.NODE_LIBRARY = [];

/**
 * A global function that registers a new node type into the library. This is called automatically when a new extended node type is defined, you should not have to do this manually.
 * @param {String} name - The name of the node constructor.
 * @param {String} displayName - The display name.
 * @param {String} category - The display category name.
 * @param {wcPlay.NODE_TYPE} type - The node's type.
 * @returns {Boolean} - Success or failure.
 */
wcPlay.registerNodeType = function(name, displayName, category, type) {
  for (var i = 0; i < wcPlay.NODE_LIBRARY.length; ++i) {
    if (wcPlay.NODE_LIBRARY[i].name === name) {
      return false;
    }
  }

  wcPlay.NODE_LIBRARY.push({
    name: name,
    displayName: displayName,
    category: category,
    type: type,
  });
  return true;
}

wcPlay.prototype = {
  /**
   * Gets whether the script is running in [silent mode]{@link wcPlay~Options}.
   * @returns {Boolean}
   */
  isSilent: function() {
    return this._options.silent;
  },

  /**
   * Initializes the script and begins the update process.
   * @function wcPlay#start
   */
  start: function() {
    var self = this;
    this._updateID = setInterval(function() {
      self.update();
    }, this._options.updateRate);

    this.__notifyNodes('onStart', []);
  },

  /**
   * Update handler.
   * @function wcPlay#update
   */
  update: function() {
    // Skip updates on pause.
    if (this._isPaused) {
      return;
    }

    // Update a queued property if any
    var count = Math.min(this._queuedProperties.length, this._options.updateLimit);
    while (count) {
      count--;
      var item = this._queuedProperties.shift();
      item.node._meta.flash = true;
      item.node._meta.paused = false;
      item.node.property(item.name, item.value);
    }

    // Update a queued node entry only if there are no more properties to update.
    if (!this._queuedProperties.length) {
      count = Math.min(this._queuedChain.length, this._options.updateLimit - count);
      while (count) {
        count--;
        var item = this._queuedChain.shift();
        item.node._meta.flash = true;
        item.node._meta.paused = false;
        item.node.onTriggered(item.name);
      }
    }

    // If we are step debugging, pause the script here.
    if (this._isStepping) {
      this._isPaused = true;
    }
  },

  /**
   * Gets, or Sets the debugging state of the script.
   * @function wcPlay#debugging
   * @param {Boolean} [debug] - If supplied, will assign the debugging state of the script.
   * @returns {Boolean} - The current debugging state of the script.
   */
  debugging: function(debug) {
    if (debug !== undefined) {
      this._options.debugging = debug? true: false;
    }

    return this._options.debugging;
  },

  /**
   * Gets, or Sets the pause state of the script.
   * @function wcPlay#paused
   * @param {Boolean} [paused] - If supplied, will assign the paused state of the script.
   * @returns {Boolean} - The current pause state of the script.
   */
  paused: function(paused) {
    if (paused !== undefined) {
      this._isPaused = paused? true: false;
    }

    return this._isPaused;
  },

  /**
   * Gets, or Sets the stepping state of the script.
   * @function wcPlay#stepping
   * @param {Boolean} [stepping] - If supplied, will assign the stepping state of the script.
   * @returns {Boolean} - The current stepping state of the script.
   */
  stepping: function(stepping) {
    if (stepping !== undefined) {
      this._isStepping = stepping? true: false;
    }

    return this._isStepping;
  },

  /**
   * Creates a new global property.
   * @param {String} name - The name of the property.
   * @param {wcPlay.PROPERTY_TYPE} type - The type of property.
   * @param {Object} [defaultValue] - A default value for this property.
   * @param {Object} [options] - Additional options for this property, see {@link wcPlay.PROPERTY_TYPE}.
   * @returns {Boolean} - Failes if the property does not exist.
   */
  createProperty: function(name, type, defaultValue, options) {
    // Make sure this property doesn't already exist.
    for (var i = 0; i < this._properties.length; ++i) {
      if (this._properties[i].name === name) {
        return false;
      }
    }

    // Make sure the type is valid.
    if (!wcPlay.PROPERTY_TYPE.hasOwnProperty(type)) {
      type = wcPlay.PROPERTY_TYPE.STRING;
    }

    this._properties.push({
      name: name,
      value: defaultValue,
      defaultValue: defaultValue,
      type: type,
      options: options || {},
    });
    return true;
  },

  /**
   * Renames an existing global property.
   * @function wcPlay#renameProperty
   * @param {String} name - The current name of the global property to rename.
   * @param {String} newName - The new desired name of the global property.
   * @returns {Boolean} - Fails if the property was not found or if the new name is already used.
   */
  renameProperty: function(name, newName) {
    var prop = null;
    for (var i = 0; i < this._properties.length; ++i) {
      if (this._properties[i].name === newName) {
        return false;
      }

      if (this._properties[i].name === name) {
        prop = this._properties[i];
      }
    }

    if (!prop) {
      return false;
    }

    prop.name = newName;
    this.__notifyNodes('onSharedPropertyRenamed', [name, newName]);
  },

  /**
   * Gets, or Sets a global property value.
   * @function wcPlay#property
   * @param {String} name - The name of the property.
   * @param {Object} [value] - If supplied, will assign a new value to the property.
   * @returns {Object} - The current value of the property, or undefined if not found.
   */
  property: function(name, value) {
    var prop = null;
    for (var i = 0; i < this._properties.length; ++i) {
      if (this._properties[i].name === name) {
        prop = this._properties[i];
        break;
      }
    }

    if (!prop) {
      return;
    }

    if (value !== undefined && value !== prop.value) {
      var oldValue = prop.value;
      prop.value = value;
      this.__notifyNodes('onSharedPropertyChanged', [prop.name, oldValue, prop.value]);
    }
  },

  /**
   * Triggers an event into the Play script.
   * @function wcPlay#triggerEvent
   * @param {String} name - The event name to trigger (more specifically, the name of the wcNodeEntry).
   * @param {Object} data - Any data object that will be passed into the entry node.
   */
  triggerEvent: function(name, data) {
    for (var i = 0; i < this._entryNodes.length; ++i) {
      if (this._entryNodes[i].name === name) {
        this._entryNodes[i].onTriggered(data);
      }
    }
  },

  /**
   * Queues a node entry link to trigger on the next update.
   * @function wcPlay#queueNodeEntry
   * @param {wcNode} node - The node being queued.
   * @param {String} name - The entry link name.
   */
  queueNodeEntry: function(node, name) {
    if (node.enabled()) {
      this._queuedChain.push({
        node: node,
        name: name,
      });

      if (node.debugBreak() || this._isStepping) {
        node._meta.flash = true;
        node._meta.paused = true;
        this._isPaused = true;
      }
    }
  },

  /**
   * Queues a node property value change to trigger on the next update.
   * @function wcPlay#queueNodeProperty
   * @param {wcNode} node - The node being queued.
   * @param {String} name - The property name.
   * @param {Object} value - The property value.
   */
  queueNodeProperty: function(node, name, value) {
    if (node.enabled()) {
      this._queuedProperties.push({
        node: node,
        name: name,
        value: value,
      });

      if (node.debugBreak() || this._isStepping) {
        node._meta.flash = true;
        node._meta.paused = true;
        this._isPaused = true;
      }
    }
  },

  /**
   * Adds a node into the known node stacks.
   * @function wcPlay#__addNode
   * @private
   * @param {wcNode} node - The node to add.
   */
  __addNode: function(node) {
    if (node instanceof wcNodeEntry) {
      this._entryNodes.push(node);
    } else if (node instanceof wcNodeProcess) {
      this._processNodes.push(node);
    } else if (node instanceof wcNodeStorage) {
      this._storageNodes.push(node);
    } else if (node instanceof wcNodeComposite) {
      this._compositeNodes.push(node);
    }
  },

  /**
   * Removes a node from the known node stacks.
   * @function wcPlay#__removeNode
   * @private
   * @param {wcNode} node - The node to remove.
   */
  __removeNode: function(node) {
    if (node instanceof wcNodeEntry) {
      this._entryNodes.splice(this._entryNodes.indexOf(node), 1);
    } else if (node instanceof wcNodeProcess) {
      this._processNodes.splice(this._processNodes.indexOf(node), 1);
    } else if (node instanceof wcNodeStorage) {
      this._storageNodes.splice(this._storageNodes.indexOf(node), 1);
    } else if (node instanceof wcNodeComposite) {
      this._compositeNodes.splice(this._compositeNodes.indexOf(node), 1);
    }
  },

  /**
   * Sends a custom notification event to all nodes.
   * @function wcPlay#__notifyNodes
   * @private
   * @param {String} func - The node function to call.
   * @param {Object[]} args - A list of arguments to forward into the function call.
   */
  __notifyNodes: function(func, args) {
    var self;
    for (var i = 0; i < this._storageNodes.length; ++i) {
      self = this._storageNodes[i];
      if (typeof self[func] === 'function') {
        self[func].apply(self, args);
      }
    }
    for (var i = 0; i < this._processNodes.length; ++i) {
      self = this._processNodes[i];
      if (typeof self[func] === 'function') {
        self[func].apply(self, args);
      }
    }
    for (var i = 0; i < this._compositeNodes.length; ++i) {
      self = this._compositeNodes[i];
      if (typeof self[func] === 'function') {
        self[func].apply(self, args);
      }
    }
    for (var i = 0; i < this._entryNodes.length; ++i) {
      self = this._entryNodes[i];
      if (typeof self[func] === 'function') {
        self[func].apply(self, args);
      }
    }
  },

  /**
   * Sends a custom notification event to all renderers.
   * @function wcPlay#__notifyEditors
   * @private
   * @param {String} func - The renderer function to call.
   * @param {Object[]} args - A list of arguments to forward into the function call.
   */
  __notifyEditors: function(func, args) {
    var self;
    for (var i = 0; i < this._editors.length; ++i) {
      self = this._editors[i];
      if (typeof self[func] === 'function') {
        self[func].apply(self, args);
      }
    }
  },
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
  this.$viewport = null;
  this._viewportContext = null;
  this.$palette = null;
  this._paletteContext = null;
  this._paletteSize = 0.25;

  this._size = {x: 0, y: 0};

  this._engine = null;
  this._nodeLibrary = {};

  this._font = {
    title: {size: 15, family: 'Arial', weight: 'bold'},
    links: {size: 10, family: 'Arial'},
    property: {size: 10, family: 'Arial', weight: 'italic'},
    value: {size: 10, family: 'Arial', weight: 'bold'},
  };

  this._drawStyle = {
    palette: {
      spacing: 20,        // Spacing between nodes in the palette view.
    },
    node: {
      radius: 10,         // The radius to draw node corners.
      margin: 15,         // The pixel space between the property text and the edge of the node border.
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

  // Control properties.
  this._viewportCamera = {x: 0, y: 0, z: 1};
  this._paletteCamera = {x: 0, y: 0, z: 1};
  this._viewportMovingNode = false;
  this._viewportMoving = false;
  this._viewportMoved = false;
  this._paletteMoving = false;

  this._mouse = null;
  this._highlightNode = null;
  this._selectedNode = null;
  this._expandedNode = null;
  this._expandedNodeWasCollapsed = false;

  this._highlightCollapser = false;
  this._highlightBreakpoint = false;
  this._highlightEntryLink = false;
  this._highlightExitLink = false;
  this._highlightInputLink = false;
  this._highlightOutputLink = false;
  this._highlightPropertyValue = false;

  this._selectedEntryLink = false;
  this._selectedExitLink = false;
  this._selectedInputLink = false;
  this._selectedOutputLink = false;

  // Setup our options.
  this._options = {
    readOnly: false,
  };
  for (var prop in options) {
    this._options[prop] = options[prop];
  }

  this.$palette = $('<canvas class="wcPlayPalette">');
  this._paletteContext = this.$palette[0].getContext('2d');
  this.$viewport = $('<canvas class="wcPlayViewport">');
  this._viewportContext = this.$viewport[0].getContext('2d');

  this.$container.append(this.$palette);
  this.$container.append(this.$viewport);

  this.onResized();

  this.__setupControls();

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
    if (engine !== undefined) {
      if (this._engine) {
        var index = this._engine._editors.indexOf(this);
        if (index > -1) {
          this._engine._editors.splice(index, 1);
        }
      }

      this._engine = engine;

      if (this._engine) {
        this._engine._editors.push(this);
      }
    }

    return this._engine;
  },

  /**
   * Positions the canvas view to the center of all nodes.
   * @function wcPlayEditor#center
   */
  center: function() {
    // TODO:
  },

  /**
   * Event that is called when the container view is resized.
   * @function wcPlayEditor#onResized
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
        which: 1,
      };
    }

    return {
      x: (event.clientX || event.pageX) - (offset? offset.left: 0) - (translation? translation.x: 0),
      y: (event.clientY || event.pageY) - (offset? offset.top: 0) - (translation? translation.y: 0),
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
      return str.substring(0, len) + '...';
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
   * @param {wcPlayEditor~Rect} - A bounding rectangle that encloses all given rectangles.
   */
  __expandRect: function(rects) {
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
   * Tests whether a given point is within a bounding rectangle.
   * @function wcPlayEditor#__inRect
   * @private
   * @param {wcPlay~Coordinates} pos - The position to test.
   * @param {wcPlayEditor~Rect} rect - The bounding rectangle.
   * @param {wcPlay~Coordinates} [trans] - An optional camera translation to apply to the pos.
   * @returns {Boolean} - Whether there is a collision.
   */
  __inRect: function(pos, rect, trans) {
    if (trans === undefined) {
      trans = {
        x: 0,
        y: 0,
        z: 1,
      };
    }

    if ((pos.y - trans.y) / trans.z >= rect.top &&
        (pos.x - trans.x) / trans.z >= rect.left &&
        (pos.y - trans.y) / trans.z <= rect.top + rect.height &&
        (pos.x - trans.x) / trans.z <= rect.left + rect.width) {
      return true;
    }
    return false;
  },

  /**
   * Draws a bounding rectangle.
   * @function wcPlayEditor#__drawRect
   * @private
   * @param {wcPlayEditor~Rect} rect - The rectangle bounds to draw.
   * @param {String} color - The color to draw.
   * @param {external:Canvas~Context} context - The canvas context to render on.
   */
  __drawRect: function(rect, color, context) {
    context.strokeStyle = color;
    context.strokeRect(rect.left, rect.top, rect.width, rect.height);
  },

  __drawRoundedRect: function(rect, color, lineWidth, radius, context) {
    context.save();
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.beginPath();
    context.moveTo(rect.left + radius, rect.top);
    context.arcTo(rect.left + rect.width, rect.top, rect.left + rect.width, rect.top + radius, radius);
    context.arcTo(rect.left + rect.width, rect.top + rect.height, rect.left + rect.width - radius, rect.top + rect.height, radius);
    context.arcTo(rect.left, rect.top + rect.height, rect.left, rect.top + rect.height - radius, radius);
    context.arcTo(rect.left, rect.top, rect.left + radius, rect.top, radius);
    context.closePath();
    context.stroke();
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
          var node = this._nodeLibrary[data.category][data.name] = new window[data.name](null);
          this.__updateNode(node, 0);
        }
      }

      // Render the nodes in the palette.
      this._paletteContext.clearRect(0, 0, this.$palette.width(), this.$palette.height());
      var yPos = this._drawStyle.palette.spacing;
      var xPos = this.$palette.width() / 2;
      for (var cat in this._nodeLibrary) {
        for (var node in this._nodeLibrary[cat]) {
          var drawData = this.__drawNode(this._nodeLibrary[cat][node], {x: this._paletteCamera.x + xPos, y: this._paletteCamera.y + yPos}, this._paletteContext, true);
          yPos += drawData.rect.height + this._drawStyle.palette.spacing;
        }
      }

      // Setup viewport canvas.
      this._viewportContext.clearRect(0, 0, this.$viewport.width(), this.$viewport.height());

      this._viewportContext.save();
      this._viewportContext.translate(this._viewportCamera.x, this._viewportCamera.y);
      this._viewportContext.scale(this._viewportCamera.z, this._viewportCamera.z);
      // this._viewportContext.translate(this._viewportCamera.x / this._viewportCamera.z, this._viewportCamera.y / this._viewportCamera.z);

      // Update nodes.
      this.__updateNodes(this._engine._entryNodes, elapsed);
      this.__updateNodes(this._engine._processNodes, elapsed);
      this.__updateNodes(this._engine._compositeNodes, elapsed);
      this.__updateNodes(this._engine._storageNodes, elapsed);

      // Render the nodes in the main script.
      this.__drawNodes(this._engine._entryNodes, this._viewportContext);
      this.__drawNodes(this._engine._processNodes, this._viewportContext);
      this.__drawNodes(this._engine._compositeNodes, this._viewportContext);
      this.__drawNodes(this._engine._storageNodes, this._viewportContext);

      // Render chains between nodes.
      this.__drawChains(this._engine._entryNodes, this._viewportContext);
      this.__drawChains(this._engine._processNodes, this._viewportContext);
      this.__drawChains(this._engine._compositeNodes, this._viewportContext);
      this.__drawChains(this._engine._storageNodes, this._viewportContext);
      this._viewportContext.restore();
    }

    window.requestAnimationFrame(this.__update.bind(this));
  },

  /**
   * Updates the status of a list of nodes.
   * @function wcPlayEditor#__updateNodes
   * @private
   * @param {wcNode[]} nodes - The nodes to update.
   * @param {Number} elapsed - Elapsed time since last update.
   */
  __updateNodes: function(nodes, elapsed) {
    for (var i = 0; i < nodes.length; ++i) {
      this.__updateNode(nodes[i], elapsed);
    }
  },

  /**
   * Updates the status of a node.
   * @function wcPlayEditor#__updateNode
   * @private
   * @param {wcNode} node - The Node to update.
   * @param {Number} elapsed - Elapsed time since last update.
   */
  __updateNode: function(node, elapsed) {
    // Update flash state.
    var self = this;
    function __updateFlash(meta, darkColor, lightColor, pauseColor, keepPaused, colorMul) {
      if (meta.flash) {
        meta.flashDelta += elapsed * 10.0;
        if (meta.flashDelta >= 1.0) {
          meta.flashDelta = 1.0;

          if (!meta.awake && (!meta.paused || (!keepPaused && !self._engine.paused()))) {
            meta.flash = false;
          }
        }
      } else if (meta.flashDelta > 0.0) {
        meta.flashDelta -= elapsed * 5.0;
        if (meta.flashDelta <= 0.0) {
          meta.flashDelta = 0;
          meta.paused = keepPaused? meta.paused: false;
        }
      }

      meta.color = self.__blendColors(darkColor, meta.paused? pauseColor: lightColor, meta.flashDelta * colorMul);
    }

    var color = node.color;
    if (this._highlightNode === node) {
      color = this.__blendColors(node.color, "#00FFFF", 0.5);
    }
    __updateFlash(node._meta, color, "#FFFFFF", "#FFFFFF", true, 0.5);

    var blackColor = "#000000";
    var propColor  = "#117711";
    var flashColor = "#FFFF00";
    for (var i = 0; i < node.chain.entry.length; ++i) {
      __updateFlash(node.chain.entry[i].meta, blackColor, flashColor, flashColor, false, 0.9);
    }
    for (var i = 0; i < node.chain.exit.length; ++i) {
      __updateFlash(node.chain.exit[i].meta, blackColor, flashColor, flashColor, false, 0.9);
    }
    for (var i = 0; i < node.properties.length; ++i) {
      __updateFlash(node.properties[i].inputMeta, propColor, flashColor, flashColor, false, 0.9);
      __updateFlash(node.properties[i].outputMeta, propColor, flashColor, flashColor, false, 0.9);
    }
  },

  /**
   * Draws a list of nodes on the canvas.
   * @function wcPlayEditor#__drawNodes
   * @private
   * @param {wcNode[]} nodes - The node to render.
   * @param {external:Canvas~Context} context - The canvas context to render on.
   * @param {Boolean} [hideCollapsible] - If true, all collapsible properties will be hidden, even if the node is not collapsed.
   */
  __drawNodes: function(nodes, context, hideCollapsible) {
    for (var i = 0; i < nodes.length; ++i) {
      this.__drawNode(nodes[i], nodes[i].pos, context, hideCollapsible);
    }
  },

  /**
   * Draws a single node on the canvas at a given position.
   * @function wcPlayEditor#__drawNode
   * @private
   * @param {wcNode} node - The node to render.
   * @param {wcPlay~Coordinates} pos - The position to render the node in the canvas, relative to the top-middle of the node.
   * @param {external:Canvas~Context} context - The canvas context to render on.
   * @param {Boolean} [hideCollapsible] - If true, all collapsible properties will be hidden, even if the node is not collapsed.
   * @returns {wcPlayEditor~DrawNodeData} - Data associated with the newly drawn node.
   */
  __drawNode: function(node, pos, context, hideCollapsible) {
    var data = {
      node: node,
      rect: {
        top: pos.y,
        left: pos.x,
        width: 0,
        height: 0,
      },
    };

    // TODO: Ignore drawing if the node is outside of view.

    // Take some measurements so we know where everything on the node should be drawn.
    var entryBounds  = this.__measureEntryLinks(node, context, pos);
    var centerBounds = this.__measureCenter(node, context, {x: pos.x, y: pos.y + entryBounds.height}, hideCollapsible);
    var exitBounds   = this.__measureExitLinks(node, context, {x: pos.x, y: pos.y + entryBounds.height + centerBounds.height});

    var bounds = this.__expandRect([entryBounds, centerBounds, exitBounds]);
    bounds.top = centerBounds.top;
    bounds.height = centerBounds.height;

    // Now use our measurements to draw our node.
    var propBounds  = this.__drawCenter(node, context, bounds, hideCollapsible);
    var entryLinkBounds = this.__drawEntryLinks(node, context, pos, entryBounds.width);
    var exitLinkBounds = this.__drawExitLinks(node, context, {x: pos.x, y: pos.y + entryBounds.height + centerBounds.height}, exitBounds.width);

    data.entryBounds = entryLinkBounds;
    data.exitBounds = exitLinkBounds;
    data.inputBounds = propBounds.inputBounds;
    data.outputBounds = propBounds.outputBounds;
    data.valueBounds = propBounds.valueBounds;

    data.inner = this.__expandRect([centerBounds]);
    data.rect = this.__expandRect([entryBounds, centerBounds, exitBounds]);
    data.inner.left = data.rect.left;
    data.inner.width = data.rect.width;
    data.rect.left -= this._drawStyle.links.length;
    data.rect.width += this._drawStyle.links.length * 2;

    if (node.chain.entry.length) {
      data.inner.top -= this._drawStyle.links.padding + this._font.links.size;
      data.inner.height += this._drawStyle.links.padding + this._font.links.size;
    } else {
      data.rect.top -= this._drawStyle.links.length;
      data.rect.height += this._drawStyle.links.length;
    }
    if (node.chain.exit.length) {
      data.inner.height += this._drawStyle.links.padding + this._font.links.size;
    } else {
      data.rect.height += this._drawStyle.links.length;
    }

    data.farRect = {
      top: data.inner.top - data.inner.height/4,
      left: data.inner.left - data.inner.width/4,
      width: data.inner.width * 1.5,
      height: data.inner.height * 1.5,
    };

    // Add a collapse button to the node in the left margin of the title.
    data.collapser = {
      left: data.inner.left + 4,
      top: data.inner.top + 4 + (node.chain.entry.length? this._font.links.size + this._drawStyle.links.padding: 0),
      width: this._drawStyle.node.margin - 5,
      height: this._font.title.size - 4,
    };

    context.save();
    context.fillStyle = (this._highlightCollapser && this._highlightNode === node? "darkgray": "white");
    context.strokeStyle = "black";
    context.lineWidth = 1;
    context.fillRect(data.collapser.left, data.collapser.top, data.collapser.width, data.collapser.height);
    context.strokeRect(data.collapser.left, data.collapser.top, data.collapser.width, data.collapser.height);

    context.strokeStyle = "black";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(data.collapser.left + 1, data.collapser.top + data.collapser.height/2);
    context.lineTo(data.collapser.left + data.collapser.width - 1, data.collapser.top + data.collapser.height/2);
    if (node.collapsed()) {
      context.moveTo(data.collapser.left + data.collapser.width/2, data.collapser.top + 1);
      context.lineTo(data.collapser.left + data.collapser.width/2, data.collapser.top + data.collapser.height - 1);
    }
    context.stroke();
    context.restore();

    // Add breakpoint button to the node in the right margin of the title.
    data.breakpoint = {
      left: data.inner.left + data.inner.width - this._drawStyle.node.margin + 2,
      top: data.inner.top + 4 + (node.chain.entry.length? this._font.links.size + this._drawStyle.links.padding: 0),
      width: this._drawStyle.node.margin - 5,
      height: this._font.title.size - 4,
    };

    context.save();
    var gradient = context.createRadialGradient(
      data.breakpoint.left + data.breakpoint.width/2,
      data.breakpoint.top + data.breakpoint.height/2,
      0,
      data.breakpoint.left + data.breakpoint.width/2,
      data.breakpoint.top + data.breakpoint.height/2,
      Math.min(data.breakpoint.width*0.5, data.breakpoint.height*0.5));
    gradient.addColorStop(0, (node._break? "darkred": "gray"));
    gradient.addColorStop(1, (this._highlightBreakpoint && this._highlightNode === node? "darkgray": "white"));
    context.fillStyle = gradient;
    context.fillRect(data.breakpoint.left, data.breakpoint.top, data.breakpoint.width, data.breakpoint.height);

    context.strokeStyle = "black";
    context.lineWidth = 1;
    context.strokeRect(data.breakpoint.left, data.breakpoint.top, data.breakpoint.width, data.breakpoint.height);
    context.restore();

    // DEBUG: Render bounding box geometry.
    // context.strokeStyle = "red";
    // function __drawBoundList(list) {
    //   for (var i = 0; i < list.length; ++i) {
    //     context.strokeRect(list[i].rect.left, list[i].rect.top, list[i].rect.width, list[i].rect.height);
    //   };
    // }
    // __drawBoundList(data.entryBounds);
    // __drawBoundList(data.exitBounds);
    // __drawBoundList(data.inputBounds);
    // __drawBoundList(data.outputBounds);
    // __drawBoundList(data.valueBounds);
    // context.strokeRect(entryBounds.left, entryBounds.top, entryBounds.width, entryBounds.height);
    // context.strokeRect(exitBounds.left, exitBounds.top, exitBounds.width, exitBounds.height);
    // context.strokeRect(data.inner.left, data.inner.top, data.inner.width, data.inner.height);
    // context.strokeRect(data.rect.left, data.rect.top, data.rect.width, data.rect.height);

    // Increase the nodes border thickness when flashing.
    if (node._meta.flashDelta) {
      if (node._meta.paused) {
        this.__drawRoundedRect(data.inner, "#CC0000", 5, 10, context);
      } else {
        this.__drawRoundedRect(data.inner, "yellow", 2, 10, context);
      }
    }

    // Show an additional bounding rect around selected nodes.
    if (node === this._selectedNode) {
      this.__drawRoundedRect(data.rect, "cyan", 2, 10, context);
    }

    node._meta.bounds = data;
    return data;
  },

  /**
   * Measures the space to render entry links for a node.
   * @function wcPlayEditor#__measureEntryLinks
   * @private
   * @param {wcNode} node - The node to measure.
   * @param {external:Canvas~Context} context - The canvas context.
   * @param {wcPlay~Coordinates} pos - The (top, center) position to measure the links.
   * @returns {wcPlayEditor~Rect} - A bounding rectangle.
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
   * @function wcPlayEditor#__measureExitLinks
   * @private
   * @param {wcNode} node - The node to measure.
   * @param {external:Canvas~Context} context - The canvas context.
   * @param {wcPlay~Coordinates} pos - The (top, center) position to measure the links.
   * @returns {wcPlayEditor~Rect} - A bounding rectangle.
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
   * @function wcPlayEditor#__measureCenter
   * @private
   * @param {wcNode} node - The node to measure.
   * @param {external:Canvas~Context} context - The canvas context.
   * @param {wcPlay~Coordinates} pos - The (top, center) position to measure.
   * @param {Boolean} [hideCollapsible] - If true, all collapsible properties will be hidden, even if the node is not collapsed.
   * @returns {wcPlayEditor~Rect} - A bounding rectangle. The height is only the amount of space rendered within the node bounds (links stick out).
   */
  __measureCenter: function(node, context, pos, hideCollapsible) {
    var bounds = {
      top: pos.y,
      left: pos.x,
      width: 0,
      height: this._font.title.size + this._drawStyle.title.spacing + this._drawStyle.links.padding,
    };

    // Measure the title bar area.
    this.__setCanvasFont(this._font.title, context);
    bounds.width = context.measureText(node.type + (node.name? ': ' + node.name: '')).width;

    // Measure the node's viewport.
    if (node._viewportSize) {
      bounds.width = Math.max(bounds.width, node._viewportSize.x);
      bounds.height += node._viewportSize.y + this._drawStyle.property.spacing;
    }

    // Measure properties.
    var collapsed = node.collapsed();
    var props = node.properties;
    for (var i = 0; i < props.length; ++i) {
      // Skip properties that are collapsible if it is not chained.
      if ((!collapsed && !hideCollapsible) || !props[i].options.collapsible || props[i].inputs.length || props[i].outputs.length) {
        bounds.height += this._font.property.size + this._drawStyle.property.spacing;

        // Property name.
        this.__setCanvasFont(this._font.property, context);
        var w = context.measureText(props[i].name + ': ').width;

        // Property value.
        this.__setCanvasFont(this._font.value, context);
        w += context.measureText('[' + this.__clampString(node.property(props[i].name).toString(), this._drawStyle.property.strLen) + ']').width;
        bounds.width = Math.max(w, bounds.width);
      }
    }

    bounds.left -= bounds.width/2 + this._drawStyle.node.margin;
    bounds.width += this._drawStyle.node.margin * 2;
    return bounds;
  },

  /**
   * Draws the entry links of a node.
   * @function wcPlayEditor#__drawEntryLinks
   * @private
   * @param {wcNode} node - The node to draw.
   * @param {external:Canvas~Context} context - The canvas context.
   * @param {wcPlay~Coordinates} pos - The (top, center) position to draw the links on the canvas.
   * @param {Number} width - The width of the area to draw in.
   * @returns {wcPlayEditor~BoundingData[]} - An array of bounding rectangles, one for each link 'nub'.
   */
  __drawEntryLinks: function(node, context, pos, width) {
    var xPos = pos.x - width/2 + this._drawStyle.links.margin;
    var yPos = pos.y + this._drawStyle.links.length + this._font.links.size;

    this.__setCanvasFont(this._font.links, context);

    var result = [];

    var collapsed = node.collapsed();
    var links = node.chain.entry;
    for (var i = 0; i < links.length; ++i) {
      if (!collapsed || links[i].links.length) {
        // Link label
        context.fillStyle = "black";
        var w = context.measureText(links[i].name).width + this._drawStyle.links.spacing;
        context.fillText(links[i].name, xPos + this._drawStyle.links.spacing/2, yPos);

        // Link nub
        var rect = {
          top: yPos - this._drawStyle.links.length - this._font.links.size,
          left: xPos + w/2 - this._drawStyle.links.width/2,
          width: this._drawStyle.links.width,
          height: this._drawStyle.links.length,
        };

        context.fillStyle = (this._highlightEntryLink && this._highlightEntryLink.name === links[i].name && this._highlightNode === node? "cyan": links[i].meta.color);
        context.strokeStyle = "black";
        context.beginPath();
        context.moveTo(rect.left, rect.top);
        context.lineTo(rect.left + rect.width/2, rect.top + rect.height/3);
        context.lineTo(rect.left + rect.width, rect.top);
        context.lineTo(rect.left + rect.width, rect.top + rect.height);
        context.lineTo(rect.left, rect.top + rect.height);
        context.closePath();
        context.stroke();
        context.fill();

        // Expand the bounding rect just a little so it is easier to click.
        rect.left -= 5;
        rect.width += 10;

        result.push({
          rect: rect,
          point: {
            x: rect.left + rect.width/2,
            y: rect.top + rect.height/3,
          },
          name: links[i].name,
        });

        xPos += w;
      }
    }

    return result;
  },

  /**
   * Draws the exit links of a node.
   * @function wcPlayEditor#__drawExitLinks
   * @private
   * @param {wcNode} node - The node to draw.
   * @param {external:Canvas~Context} context - The canvas context.
   * @param {wcPlay~Coordinates} pos - The (top, center) position to draw the links on the canvas.
   * @param {Number} width - The width of the area to draw in.
   * @returns {wcPlayEditor~BoundingData[]} - An array of bounding rectangles, one for each link 'nub'.
   */
  __drawExitLinks: function(node, context, pos, width) {
    var xPos = pos.x - width/2 + this._drawStyle.links.margin;
    var yPos = pos.y + this._font.links.size;

    this.__setCanvasFont(this._font.links, context);

    var result = [];

    var collapsed = node.collapsed();
    var links = node.chain.exit;
    for (var i = 0; i < links.length; ++i) {
      if (!collapsed || links[i].links.length) {
        // Link label
        context.fillStyle = "black";
        var w = context.measureText(links[i].name).width + this._drawStyle.links.spacing;
        context.fillText(links[i].name, xPos + this._drawStyle.links.spacing/2, yPos);

        // Link nub
        var rect = {
          top: yPos + this._drawStyle.links.padding,
          left: xPos + w/2 - this._drawStyle.links.width/2,
          width: this._drawStyle.links.width,
          height: this._drawStyle.links.length,
        };

        context.fillStyle = (this._highlightExitLink && this._highlightExitLink.name === links[i].name && this._highlightNode === node? "cyan": links[i].meta.color);
        context.strokeStyle = "black";
        context.beginPath();
        context.moveTo(rect.left, rect.top);
        context.lineTo(rect.left + rect.width, rect.top);
        context.lineTo(rect.left + rect.width, rect.top + rect.height/2);
        context.lineTo(rect.left + rect.width/2, rect.top + rect.height);
        context.lineTo(rect.left, rect.top + rect.height/2);
        context.closePath();
        context.stroke();
        context.fill();

        // Expand the bounding rect just a little so it is easier to click.
        rect.left -= 5;
        rect.width += 10;

        result.push({
          rect: rect,
          point: {
            x: rect.left + rect.width/2,
            y: rect.top + rect.height,
          },
          name: links[i].name,
        });

        xPos += w;
      }
    }

    return result;
  },

  /**
   * Measures the space to render the center area for a node.
   * @function wcPlayEditor#__drawCenter
   * @private
   * @param {wcNode} node - The node to draw.
   * @param {external:Canvas~Context} context - The canvas context.
   * @param {wcPlayEditor~Rect} rect - The bounding area to draw in.
   * @param {Boolean} [hideCollapsible] - If true, all collapsible properties will be hidden, even if the node is not collapsed.
   * @returns {wcPlayEditor~DrawPropertyData} - Contains bounding rectangles for various drawings.
   */
  __drawCenter: function(node, context, rect, hideCollapsible) {
    var upper = node.chain.entry.length? this._font.links.size + this._drawStyle.links.padding: 0;
    var lower = node.chain.exit.length? this._font.links.size + this._drawStyle.links.padding: 0;

    // Node background
    context.save();
      var left = rect.left + rect.width/2;
      var top = rect.top + (rect.height)/2;
      var gradient = context.createRadialGradient(left, top, 10, left, top, Math.max(rect.width, rect.height));
      gradient.addColorStop(0, node._meta.color);
      gradient.addColorStop(1, "white");
      context.fillStyle = context.strokeStyle = gradient;
      context.lineJoin = "round";
      var diameter = this._drawStyle.node.radius*2;
      context.lineWidth = diameter;
      context.fillRect(rect.left + diameter/2, rect.top - upper + diameter/2, rect.width - diameter, rect.height + upper + lower - diameter);
      context.strokeRect(rect.left + diameter/2, rect.top - upper + diameter/2, rect.width - diameter, rect.height + upper + lower - diameter);
    context.restore();
    this.__drawRoundedRect({
      left: rect.left,
      top: rect.top - upper,
      width: rect.width,
      height: rect.height + upper + lower
    }, node._meta.color, 3, this._drawStyle.node.radius, context);

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
    context.save();
    upper += this._font.title.size;
    context.fillStyle = "black";
    context.strokeStyle = "black";
    context.textAlign = "center";
    this.__setCanvasFont(this._font.title, context);
    context.fillText(node.type + (node.name? ': ' + node.name: ''), rect.left + rect.width/2, rect.top + upper);
    context.restore();

    // Title Lower Bar
    upper += this._drawStyle.title.spacing;
    // context.strokeStyle = node._meta.color;
    // context.beginPath();
    // context.moveTo(rect.left, rect.top + upper);
    // context.lineTo(rect.left + rect.width, rect.top + upper);
    // context.stroke();

    // Draw the node's viewport.
    if (node._viewportSize) {
      // Calculate the translation to make the viewport 0,0.
      var corner = {
        x: -this._viewportCamera.x + rect.left + (rect.width/2 - node._viewportSize.x/2),
        y: -this._viewportCamera.y + rect.top + upper,
      };

      context.save();
      // Translate the canvas so 0,0 is the beginning of the viewport.
      context.translate(corner.x, corner.y);

      // Draw the viewport.
      node.onViewport(context);

      // Now revert the translation.
      context.translate(-corner.x, -corner.y);
      context.restore();

      upper += node._viewportSize.y + this._drawStyle.property.spacing;
    }

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

      // Skip properties that are collapsible if it is not chained.
      if ((!collapsed && !hideCollapsible) || !props[i].options.collapsible || props[i].inputs.length || props[i].outputs.length) {
        upper += this._font.property.size;

        // Property name.
        context.fillStyle = "black";
        context.textAlign = "left";
        this.__setCanvasFont(this._font.property, context);
        context.fillText(props[i].name + ': ', rect.left + this._drawStyle.node.margin, rect.top + upper);

        // Property value.
        context.textAlign = "right";
        this.__setCanvasFont(this._font.value, context);
        var w = context.measureText('[' + this.__clampString(node.property(props[i].name).toString(), this._drawStyle.property.strLen) + ']').width;

        var valueBound = {
          rect: {
            top: rect.top + upper - this._font.property.size,
            left: rect.left + rect.width - this._drawStyle.node.margin - w,
            width: w,
            height: this._font.property.size + this._drawStyle.property.spacing,
          },
          name: props[i].name,
        };
        result.valueBounds.push(valueBound);

        // Highlight hovered values.
        if (this._highlightNode === node && this._highlightPropertyValue && this._highlightPropertyValue.name === props[i].name) {
          context.fillStyle = "darkgray";
          context.fillRect(valueBound.rect.left, valueBound.rect.top, valueBound.rect.width, valueBound.rect.height);
        }
        context.fillStyle = "black";
        context.fillText('[' + this.__clampString(node.property(props[i].name).toString(), this._drawStyle.property.strLen) + ']', rect.left + rect.width - this._drawStyle.node.margin, rect.top + upper);

        // Property input.
        if (!collapsed || props[i].inputs.length) {
          linkRect = {
            top: rect.top + upper - this._font.property.size/3 - this._drawStyle.links.width/2,
            left: rect.left - this._drawStyle.links.length,
            width: this._drawStyle.links.length,
            height: this._drawStyle.links.width,
          };

          context.fillStyle = (this._highlightInputLink && this._highlightInputLink.name === props[i].name && this._highlightNode === node? "cyan": props[i].inputMeta.color);
          context.strokeStyle = "black";
          context.beginPath();
          context.moveTo(linkRect.left, linkRect.top);
          context.lineTo(linkRect.left + linkRect.width, linkRect.top);
          context.lineTo(linkRect.left + linkRect.width, linkRect.top + linkRect.height);
          context.lineTo(linkRect.left, linkRect.top + linkRect.height);
          context.lineTo(linkRect.left + linkRect.width/3, linkRect.top + linkRect.height/2);
          context.closePath();
          context.stroke();
          context.fill();

          // Expand the bounding rect just a little so it is easier to click.
          linkRect.top -= 5;
          linkRect.height += 10;

          result.inputBounds.push({
            rect: linkRect,
            point: {
              x: linkRect.left + linkRect.width/3,
              y: linkRect.top + linkRect.height/2,
            },
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

          context.fillStyle = (this._highlightOutputLink && this._highlightOutputLink.name === props[i].name && this._highlightNode === node? "cyan": props[i].outputMeta.color);
          context.strokeStyle = "black";
          context.beginPath();
          context.moveTo(linkRect.left, linkRect.top);
          context.lineTo(linkRect.left + linkRect.width/2, linkRect.top);
          context.lineTo(linkRect.left + linkRect.width, linkRect.top + linkRect.height/2);
          context.lineTo(linkRect.left + linkRect.width/2, linkRect.top + linkRect.height);
          context.lineTo(linkRect.left, linkRect.top + linkRect.height);
          context.closePath();
          context.stroke();
          context.fill();

          // Expand the bounding rect just a little so it is easier to click.
          linkRect.top -= 5;
          linkRect.height += 10;

          result.outputBounds.push({
            rect: linkRect,
            point: {
              x: linkRect.left + linkRect.width,
              y: linkRect.top + linkRect.height/2,
            },
            name: props[i].name,
          });
        }

        upper += this._drawStyle.property.spacing;
      }
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

        // Now we have both our links, lets chain them together!
        this.__drawFlowChain(exitPoint, entryPoint, node._meta.bounds.rect, targetNode._meta.bounds.rect, context, flash);
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

        var flash = (outputProp.outputMeta.flashDelta > 0 && inputProp.inputMeta.flashDelta > 0);

        // Now we have both our links, lets chain them together!
        this.__drawPropertyChain(outputPoint, inputPoint, node._meta.bounds.rect, targetNode._meta.bounds.rect, context, flash);
      }
    }

    // Draw a link to the mouse cursor if we are making a connection.
    if (this._selectedNode === node && this._selectedEntryLink) {
      var targetPos;
      var targetRect = null;
      var highlight = false;
      if (this._highlightNode && this._highlightExitLink) {
        targetPos = this._highlightExitLink.point;
        targetRect = this._highlightExitLink.rect;
        highlight = true;
      } else {
        targetPos = {
          x: (this._mouse.x - this._viewportCamera.x) / this._viewportCamera.z,
          y: (this._mouse.y - this._viewportCamera.y) / this._viewportCamera.z,
        };
      }

      // In case our selected node gets uncollapsed, get the current position of the link.
      var point;
      for (var i = 0; i < node._meta.bounds.entryBounds.length; ++i) {
        if (node._meta.bounds.entryBounds[i].name === this._selectedEntryLink.name) {
          point = node._meta.bounds.entryBounds[i].point;
        }
      }

      this.__drawFlowChain(point, targetPos, node._meta.bounds.rect, targetRect, context, highlight);
    }

    if (this._selectedNode === node && this._selectedExitLink) {
      var targetPos;
      var targetRect = null;
      var highlight = false;
      if (this._highlightNode && this._highlightEntryLink) {
        targetPos = this._highlightEntryLink.point;
        targetRect = this._highlightEntryLink.rect;
        highlight = true;
      } else {
        targetPos = {
          x: (this._mouse.x - this._viewportCamera.x) / this._viewportCamera.z,
          y: (this._mouse.y - this._viewportCamera.y) / this._viewportCamera.z,
        };
      }

      // In case our selected node gets uncollapsed, get the current position of the link.
      var point;
      for (var i = 0; i < node._meta.bounds.exitBounds.length; ++i) {
        if (node._meta.bounds.exitBounds[i].name === this._selectedExitLink.name) {
          point = node._meta.bounds.exitBounds[i].point;
        }
      }

      this.__drawFlowChain(point, targetPos, node._meta.bounds.rect, targetRect, context, highlight);
    }

    if (this._selectedNode === node && this._selectedInputLink) {
      var targetPos;
      var targetRect = null;
      var highlight = false;
      if (this._highlightNode && this._highlightOutputLink) {
        targetPos = this._highlightOutputLink.point;
        targetRect = this._highlightOutputLink.rect;
        highlight = true;
      } else {
        targetPos = {
          x: (this._mouse.x - this._viewportCamera.x) / this._viewportCamera.z,
          y: (this._mouse.y - this._viewportCamera.y) / this._viewportCamera.z,
        };
      }

      // In case our selected node gets uncollapsed, get the current position of the link.
      var point;
      for (var i = 0; i < node._meta.bounds.inputBounds.length; ++i) {
        if (node._meta.bounds.inputBounds[i].name === this._selectedInputLink.name) {
          point = node._meta.bounds.inputBounds[i].point;
        }
      }

      this.__drawPropertyChain(point, targetPos, node._meta.bounds.rect, targetRect, context, highlight);
    }

    if (this._selectedNode === node && this._selectedOutputLink) {
      var targetPos;
      var targetRect = null;
      var highlight = false;
      if (this._highlightNode && this._highlightInputLink) {
        targetPos = this._highlightInputLink.point;
        targetRect = this._highlightInputLink.rect;
        highlight = true;
      } else {
        targetPos = {
          x: (this._mouse.x - this._viewportCamera.x) / this._viewportCamera.z,
          y: (this._mouse.y - this._viewportCamera.y) / this._viewportCamera.z,
        };
      }

      // In case our selected node gets uncollapsed, get the current position of the link.
      var point;
      for (var i = 0; i < node._meta.bounds.outputBounds.length; ++i) {
        if (node._meta.bounds.outputBounds[i].name === this._selectedOutputLink.name) {
          point = node._meta.bounds.outputBounds[i].point;
        }
      }

      this.__drawPropertyChain(point, targetPos, node._meta.bounds.rect, targetRect, context, highlight);
    }
  },

  /**
   * Draws a connection chain between an exit link and an entry link.
   * @function wcPlayEditor#__drawFlowChain
   * @private
   * @param {wcPlay~Coordinates} startPos - The start position (the exit link).
   * @param {wcPlay~Coordinates} endPos - The end position (the entry link).
   * @param {wcPlayEditor~Rect} startRect - The start node's bounding rect to avoid.
   * @param {wcPlayEditor~Rect} endPos - The end node's bounding rect to avoid.
   * @param {Boolean} [flash] - If true, will flash the link.
   * @param {external:Canvas~Context} context - The canvas context.
   */
  __drawFlowChain: function(startPos, endPos, startRect, endRect, context, flash) {
    context.save();
    context.strokeStyle = (flash? '#CCCC00': '#000000');
    context.lineWidth = 2;

    context.beginPath();
    context.moveTo(startPos.x, startPos.y);
    context.lineTo(endPos.x, endPos.y);
    context.stroke();
    context.restore();
  },

  /**
   * Draws a connection chain between an input link and an output link of properties.
   * @function wcPlayEditor#__drawPropertyChain
   * @private
   * @param {wcPlay~Coordinates} startPos - The start position (the exit link).
   * @param {wcPlay~Coordinates} endPos - The end position (the entry link).
   * @param {wcPlayEditor~Rect} startRect - The start node's bounding rect to avoid.
   * @param {wcPlayEditor~Rect} endPos - The end node's bounding rect to avoid.
   * @param {Boolean} [flash] - If true, will flash the link.
   * @param {external:Canvas~Context} context - The canvas context.
   */
  __drawPropertyChain: function(startPos, endPos, startRect, endRect, context, flash) {
    context.save();
    context.strokeStyle = (flash? '#55FF00': '#33CC33');
    context.lineWidth = 2;

    context.beginPath();
    context.moveTo(startPos.x, startPos.y);
    context.lineTo(endPos.x, endPos.y);
    context.stroke();
    context.restore();
  },

  /**
   * Draws the editor control for a property.
   * @function wcPlayEditor#__drawPropertyEditor
   * @private
   * @param {wcNode} node - The node to draw for.
   * @param {Object} property - The property data.
   * @param {wcPlayEditor~BoundingData} bounds - The bounding data for this property.
   */
  __drawPropertyEditor: function(node, property, bounds) {
    var $control = null;
    var cancelled = false;
    var enterConfirms = true;

    var type = property.type;
    if (type === wcPlay.PROPERTY_TYPE.DYNAMIC) {
      var value = node.property(property.name);
      if (typeof value === 'string') {
        type = wcPlay.PROPERTY_TYPE.STRING;
      } else if (typeof value === 'bool') {
        type = wcPlay.PROPERTY_TYPE.TOGGLE;
      } else if (typeof value === 'number') {
        type = wcPlay.PROPERTY_TYPE.NUMBER;
      }
    }

    // Determine what editor to use for the property.
    switch (type) {
      case wcPlay.PROPERTY_TYPE.TOGGLE:
        // Toggles do not show an editor, instead, they just toggle their state.
        node.property(property.name, !node.property(property.name));
        break;
      case wcPlay.PROPERTY_TYPE.NUMBER:
        $control = $('<input type="number"' + (property.options.min? ' min="' + property.options.min + '"': '') + (property.options.max? ' max="' + property.options.max + '"': '') + (property.options.step? ' step="' + property.options.step + '"': '') + '>');
        $control.val(parseFloat(node.property(property.name)));
        $control.change(function() {
          if (!cancelled) {
            node.property(property.name, $control.val());
          }
        });
        break;
      case wcPlay.PROPERTY_TYPE.STRING:
        if (property.options.multiline) {
          $control = $('<textarea' + (property.options.maxlength? ' maxlength="' + property.options.maxlength + '"': '') + '>');
          enterConfirms = false;
        } else {
          $control = $('<input type="text" maxlength="' + (property.options.maxlength || 524288) + '">');
        }
        $control.val(node.property(property.name).toString());
        $control.change(function() {
          if (!cancelled) {
            node.property(property.name, $control.val());
          }
        });
        break;
      case wcPlay.PROPERTY_TYPE.SELECT:
        break;
    }

    if ($control) {
      var offset = this.$viewport.offset();
      this.$container.append($control);

      $control.addClass('wcPlayEditorControl');
      $control.focus();
      $control.select();

      // Clicking away will close the editor control.
      $control.blur(function() {
        $(this).remove();
      });

      $control.keyup(function(event) {
        switch (event.keyCode) {
          case 13: // Enter.to confirm.
            if (enterConfirms || event.shiftKey) {
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

      $control.css('top', offset.top + bounds.rect.top * this._viewportCamera.z + this._viewportCamera.y)
        .css('left', offset.left + bounds.rect.left * this._viewportCamera.z + this._viewportCamera.x)
        .css('width', 200)
        .css('height', Math.max(bounds.rect.height * this._viewportCamera.z * 0.8, 15));
    }
  },

  /**
   * Initializes user control.
   * @funciton wcPlayEditor#__setupControls
   * @private
   */
  __setupControls: function() {
    var self = this;
    this.$viewport.on('mousemove',  function(event){self.__onViewportMouseMove(event, this);});
    this.$viewport.on('mousedown',  function(event){self.__onViewportMouseDown(event, this);});
    this.$viewport.on('click',      function(event){self.__onViewportMouseClick(event, this);});
    this.$viewport.on('dblclick',   function(event){self.__onViewportMouseDoubleClick(event, this);});
    this.$viewport.on('mouseup',    function(event){self.__onViewportMouseUp(event, this);});
    // this.$viewport.on('mouseleave', function(event){self.__onViewportMouseUp(event, this);});
    this.$viewport.on('mousewheel DOMMouseScroll', function(event) {self.__onViewportMouseWheel(event, this);});
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

    // Viewport panning.
    if (this._viewportMoving) {
      var moveX = mouse.x - this._mouse.x;
      var moveY = mouse.y - this._mouse.y;
      this._viewportCamera.x += moveX;
      this._viewportCamera.y += moveY;
      this._mouse = mouse;
      if (!this._viewportMoved) {
        this._viewportMoved = true;
        this.$viewport.addClass('wcMoving');
      }
      return;
    }

    if (this._viewportMovingNode) {
      var moveX = mouse.x - this._mouse.x;
      var moveY = mouse.y - this._mouse.y;
      this._selectedNode.pos.x += moveX / this._viewportCamera.z;
      this._selectedNode.pos.y += moveY / this._viewportCamera.z;
      this._mouse = mouse;
      return;
    }

    this._mouse = mouse;
    this._highlightCollapser = false;
    this._highlightBreakpoint = false;
    this._highlightEntryLink = false;
    this._highlightExitLink = false;
    this._highlightInputLink = false;
    this._highlightOutputLink = false;
    this._highlightPropertyValue = false;

    var node = this.__findNodeAtPos(mouse, this._viewportCamera);
    if (node) {

      // Collapser button.
      if (this.__inRect(mouse, node._meta.bounds.collapser, this._viewportCamera)) {
        this._highlightCollapser = true;
      }

      // Breakpoint button.
      if (this.__inRect(mouse, node._meta.bounds.breakpoint, this._viewportCamera)) {
        this._highlightBreakpoint = true;
      }

      // Entry links.
      for (var i = 0; i < node._meta.bounds.entryBounds.length; ++i) {
        if (this.__inRect(mouse, node._meta.bounds.entryBounds[i].rect, this._viewportCamera)) {
          this._highlightNode = node;
          this._highlightEntryLink = node._meta.bounds.entryBounds[i];
          break;
        }
      }

      // Exit links.
      for (var i = 0; i < node._meta.bounds.exitBounds.length; ++i) {
        if (this.__inRect(mouse, node._meta.bounds.exitBounds[i].rect, this._viewportCamera)) {
          this._highlightNode = node;
          this._highlightExitLink = node._meta.bounds.exitBounds[i];
          break;
        }
      }

      // Input links.
      for (var i = 0; i < node._meta.bounds.inputBounds.length; ++i) {
        if (this.__inRect(mouse, node._meta.bounds.inputBounds[i].rect, this._viewportCamera)) {
          this._highlightNode = node;
          this._highlightInputLink = node._meta.bounds.inputBounds[i];
          break;
        }
      }

      // Output links.
      for (var i = 0; i < node._meta.bounds.outputBounds.length; ++i) {
        if (this.__inRect(mouse, node._meta.bounds.outputBounds[i].rect, this._viewportCamera)) {
          this._highlightNode = node;
          this._highlightOutputLink = node._meta.bounds.outputBounds[i];
          break;
        }
      }

      // Property values.
      var propBounds;
      for (var i = 0; i < node._meta.bounds.valueBounds.length; ++i) {
        if (this.__inRect(this._mouse, node._meta.bounds.valueBounds[i].rect, this._viewportCamera)) {
          propBounds = node._meta.bounds.valueBounds[i];
          break;
        }
      }

      if (propBounds) {
        for (var i = 0; i < node.properties.length; ++i) {
          if (node.properties[i].name === propBounds.name) {
            this._highlightNode = node;
            this._highlightPropertyValue = propBounds;
            break;
          }
        }
      }

      // Check for main node collision.
      if (this.__inRect(mouse, node._meta.bounds.inner, this._viewportCamera)) {
        this._highlightNode = node;
        this.$viewport.addClass('wcClickable');
      } else {
        this.$viewport.removeClass('wcClickable');
      }
    } else {
      this._highlightNode = null;
      this.$viewport.removeClass('wcClickable');
    }

    // If you hover over a node that is not currently expanded by hovering, force the expanded node to collapse again.
    if (this._expandedNode && this._expandedNode !== this._highlightNode) {
      // If we are not highlighting a new node, only uncollapse the previously hovered node if we are far from it.
      if (this._highlightNode || !this.__inRect(mouse, this._expandedNode._meta.bounds.farRect, this._viewportCamera)) {
        // Recollapse our previous node, if necessary.
        if (this._expandedNodeWasCollapsed) {
          this._expandedNode.collapsed(true);
        }

        this._expandedNode = null;
      }
    }

    // If the user is creating a new connection and hovering over another node, uncollapse it temporarily to expose links.
    if (!this._expandedNode && this._highlightNode &&
        (this._selectedEntryLink || this._selectedExitLink ||
        this._selectedInputLink || this._selectedOutputLink) && 
        this.__inRect(mouse, node._meta.bounds.inner, this._viewportCamera)) {

      this._expandedNode = this._highlightNode;
      this._expandedNodeWasCollapsed = this._expandedNode.collapsed();
      this._expandedNode.collapsed(false);
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

    this._mouseMoved = false;

    var hasTarget = false;
    var node = this.__findNodeAtPos(this._mouse, this._viewportCamera);
    if (node) {
      // Entry links.
      if (!hasTarget) {
        for (var i = 0; i < node._meta.bounds.entryBounds.length; ++i) {
          if (this.__inRect(this._mouse, node._meta.bounds.entryBounds[i].rect, this._viewportCamera)) {
            hasTarget = true;
            // Alt click to disconnect all chains from this link.
            if (event.altKey) {
              node.disconnectEntry(node._meta.bounds.entryBounds[i].name);
              break;
            }
            this._selectedNode = node;
            this._selectedEntryLink = node._meta.bounds.entryBounds[i];
            break;
          }
        }
      }

      // Exit links.
      if (!hasTarget) {
        for (var i = 0; i < node._meta.bounds.exitBounds.length; ++i) {
          if (this.__inRect(this._mouse, node._meta.bounds.exitBounds[i].rect, this._viewportCamera)) {
            hasTarget = true;
            // Alt click to disconnect all chains from this link.
            if (event.altKey) {
              node.disconnectExit(node._meta.bounds.exitBounds[i].name);
              break;
            } 
            // Shift click to manually fire this exit chain.
            else if (event.shiftKey) {
              node.triggerExit(node._meta.bounds.exitBounds[i].name);
              break;
            }
            this._selectedNode = node;
            this._selectedExitLink = node._meta.bounds.exitBounds[i];
            break;
          }
        }
      }

      // Input links.
      if (!hasTarget) {
        for (var i = 0; i < node._meta.bounds.inputBounds.length; ++i) {
          if (this.__inRect(this._mouse, node._meta.bounds.inputBounds[i].rect, this._viewportCamera)) {
            hasTarget = true;
            // Alt click to disconnect all chains from this link.
            if (event.altKey) {
              node.disconnectInput(node._meta.bounds.inputBounds[i].name);
              break;
            }
            this._selectedNode = node;
            this._selectedInputLink = node._meta.bounds.inputBounds[i];
            break;
          }
        }
      }

      // Output links.
      if (!hasTarget) {
        for (var i = 0; i < node._meta.bounds.outputBounds.length; ++i) {
          if (this.__inRect(this._mouse, node._meta.bounds.outputBounds[i].rect, this._viewportCamera)) {
            hasTarget = true;
            // Alt click to disconnect all chains from this link.
            if (event.altKey) {
              node.disconnectOutput(node._meta.bounds.outputBounds[i].name);
              break;
            }
            this._selectedNode = node;
            this._selectedOutputLink = node._meta.bounds.outputBounds[i];
            break;
          }
        }
      }

      // Center area.
      if (!hasTarget && this.__inRect(this._mouse, node._meta.bounds.inner, this._viewportCamera)) {
        hasTarget = true;
        this._selectedNode = node;
        this._viewportMovingNode = true;
      }
    }

    // Click outside of a node begins the canvas drag process.
    if (!hasTarget) {
      this._viewportMoving = true;
      this._viewportMoved = false;
    }
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
      this._mouse = this.__mouse(event, this.$viewport.offset());

      var hasTarget = false;
      var node = this.__findNodeAtPos(this._mouse, this._viewportCamera);
      if (node) {
        // Collapser button.
        if (this.__inRect(this._mouse, node._meta.bounds.collapser, this._viewportCamera)) {
          node.collapsed(!node.collapsed());
        }

        // Breakpoint button.
        if (this.__inRect(this._mouse, node._meta.bounds.breakpoint, this._viewportCamera)) {
          node.debugBreak(!node._break);
        }

        // Property values.
        var propBounds;
        for (var i = 0; i < node._meta.bounds.valueBounds.length; ++i) {
          if (this.__inRect(this._mouse, node._meta.bounds.valueBounds[i].rect, this._viewportCamera)) {
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
      // Collapser button.
      if (this.__inRect(this._mouse, node._meta.bounds.collapser, this._viewportCamera)) {
        hasTarget = true;
      }

      // Breakpoint button.
      if (this.__inRect(this._mouse, node._meta.bounds.breakpoint, this._viewportCamera)) {
        hasTarget = true;
      }

      // Property values.
      for (var i = 0; i < node._meta.bounds.valueBounds.length; ++i) {
        if (this.__inRect(this._mouse, node._meta.bounds.valueBounds[i].rect, this._viewportCamera)) {
          hasTarget = true;
          break;
        }
      }

      // Exit links.
      if (!hasTarget) {
        for (var i = 0; i < node._meta.bounds.exitBounds.length; ++i) {
          if (this.__inRect(this._mouse, node._meta.bounds.exitBounds[i].rect, this._viewportCamera)) {
            hasTarget = true;
            // Double click to manually fire this exit chain.
            node.triggerExit(node._meta.bounds.exitBounds[i].name);
            break;
          }
        }
      }

      // Center area.
      if (!hasTarget && this.__inRect(this._mouse, node._meta.bounds.inner, this._viewportCamera)) {
        hasTarget = true;
        node.collapsed(!node.collapsed());
      }
    }
  },

  /**
   * Handle mouse release events over the viewport canvas.
   * @function wcPlayEditor#__onViewportMouseDown
   * @private
   * @param {Object} event - The mouse event.
   * @param {Object} elem - The target element.
   */
  __onViewportMouseUp: function(event, elem) {

    // Check for link connections.
    if (this._selectedNode && this._selectedEntryLink && this._highlightNode && this._highlightExitLink) {
      if (this._selectedNode.connectEntry(this._selectedEntryLink.name, this._highlightNode, this._highlightExitLink.name) === wcNode.CONNECT_RESULT.ALREADY_CONNECTED) {
        this._selectedNode.disconnectEntry(this._selectedEntryLink.name, this._highlightNode, this._highlightExitLink.name);
      }
    }
    if (this._selectedNode && this._selectedExitLink && this._highlightNode && this._highlightEntryLink) {
      if (this._selectedNode.connectExit(this._selectedExitLink.name, this._highlightNode, this._highlightEntryLink.name) === wcNode.CONNECT_RESULT.ALREADY_CONNECTED) {
        this._selectedNode.disconnectExit(this._selectedExitLink.name, this._highlightNode, this._highlightEntryLink.name);
      }
    }
    if (this._selectedNode && this._selectedInputLink && this._highlightNode && this._highlightOutputLink) {
      if (this._selectedNode.connectInput(this._selectedInputLink.name, this._highlightNode, this._highlightOutputLink.name) === wcNode.CONNECT_RESULT.ALREADY_CONNECTED) {
        this._selectedNode.disconnectInput(this._selectedInputLink.name, this._highlightNode, this._highlightOutputLink.name);
      }
    }
    if (this._selectedNode && this._selectedOutputLink && this._highlightNode && this._highlightInputLink) {
      if (this._selectedNode.connectOutput(this._selectedOutputLink.name, this._highlightNode, this._highlightInputLink.name) === wcNode.CONNECT_RESULT.ALREADY_CONNECTED) {
        this._selectedNode.disconnectOutput(this._selectedOutputLink.name, this._highlightNode, this._highlightInputLink.name);
      }
    }

    // Re-collapse the node, if necessary.
    if (this._expandedNode && this._expandedNodeWasCollapsed) {
      this._expandedNode.collapsed(true);
    }

    this._expandedNode = null;
    this._selectedEntryLink = false;
    this._selectedExitLink = false;
    this._selectedInputLink = false;
    this._selectedOutputLink = false;
    this._viewportMovingNode = false;

    if (this._viewportMoving) {
      this._viewportMoving = false;

      if (!this._viewportMoved) {
        this._selectedNode = null;
      } else {
        this._viewportMoved = false;
        this.$viewport.removeClass('wcMoving');
      }
    }
  },

  __onViewportMouseWheel: function(event, elem) {
    var oldZoom = this._viewportCamera.z;
    var mouse = this.__mouse(event, this.$viewport.offset());

    if (event.originalEvent.wheelDelta > 0 || event.originalEvent.detail < 0) {
      // scroll up to zoom in.
      this._viewportCamera.z = Math.min(this._viewportCamera.z * 1.25, 5);
    } else {
      // scroll down to zoom out.
      this._viewportCamera.z = Math.max(this._viewportCamera.z * 0.75, 0.1);
    }

    this._viewportCamera.x = (this._viewportCamera.x - mouse.x) / (oldZoom / this._viewportCamera.z) + mouse.x;
    this._viewportCamera.y = (this._viewportCamera.y - mouse.y) / (oldZoom / this._viewportCamera.z) + mouse.y;
  },

  /**
   * Does a bounding collision test to find any nodes at a given position.
   * @function wcPlayEditor#__findNodeAtPos
   * @private
   * @param {wcPlay~Coordinates} pos - The position.
   * @param {wcPlay~Coordinates} camera - The position of the camera.
   * @returns {wcNode|null} - A node at the given position, or null if none was found.
   */
  __findNodeAtPos: function(pos, camera) {
    if (this._engine) {
      var self = this;
      function __test(nodes) {
        // Iterate backwards so we always test the nodes that are drawn on top first.
        for (var i = nodes.length-1; i >= 0; --i) {
          if (nodes[i]._meta.bounds && self.__inRect(pos, nodes[i]._meta.bounds.rect, camera)) {
            return nodes[i];
          }
        }
        return null;
      };

      return __test(this._engine._storageNodes) ||
             __test(this._engine._compositeNodes) ||
             __test(this._engine._processNodes) ||
             __test(this._engine._entryNodes);
    }
    return null;
  },
};
Class.extend('wcNode', 'Node', '', {
  /**
   * @class
   * The foundation class for all nodes.<br>
   * When inheriting, make sure to include 'this._super(parent, pos, type);' at the top of your init functions.
   *
   * @constructor wcNode
   * @description
   * <b>Should be inherited and never constructed directly.</b>
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [type="Node"] - The type name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, type) {
    this.type = type || this.name;
    this.name = '';
    this.color = '#FFFFFF';

    this._viewportSize = null;

    this.pos = {
      x: pos && pos.x || 0,
      y: pos && pos.y || 0,
    };

    this.chain = {
      entry: [],
      exit: [],
    };
    this.properties = [];

    this._meta = {
      flash: false,
      flashDelta: 0,
      color: null,
      paused: false,
      awake: false,
      threads: [],
    };
    this._threadIndex = 0;
    this._collapsed = false;
    this._break = false;

    this._parent = parent;

    // Give the node its default properties.
    this.createProperty(wcNode.PROPERTY.ENABLED, wcPlay.PROPERTY_TYPE.TOGGLE, true, {collapsible: true});
    this.createProperty(wcNode.PROPERTY.DEBUG_LOG, wcPlay.PROPERTY_TYPE.TOGGLE, false, {collapsible: true});

    var engine = this.engine();
    engine && engine.__addNode(this);
  },

  /**
   * Destroys and removes the node.
   * @function wcNode#destroy
   */
  destroy: function() {
    // Remove all links.
    for (var i = 0; i < this.chain.entry.length; ++i) {
      var item = this.chain.entry[i];
      this.disconnectEntry(item.name);
    }

    for (var i = 0; i < this.chain.exit.length; ++i) {
      var item = this.chain.exit[i];
      this.disconnectExit(item.name);
    }

    for (var i = 0; i < this.properties.length; ++i) {
      var item = this.properties[i];
      this.disconnectInput(item.name);
      this.disconnectOutput(item.name);
    }

    // Remove the node from wcPlay
    var engine = this.engine();
    engine && engine.__removeNode(this);
  },

  /**
   * Retrieves the wcPlay engine that owns this node.
   * @function wcNode#engine
   * @returns {wcPlay|null} - Either the wcPlay engine, or null if it doesn't belong to one.
   */
  engine: function() {
    var play = this._parent;
    while (play && !(play instanceof wcPlay)) {
      play = play._parent;
    }
    return play || null;
  },

  /**
   * Sets, or Gets this node's enabled state.
   * @function wcNode#enabled
   * @param {Boolean} [enabled] - If supplied, will assign a new enabled state.
   * @returns {Boolean} - The current enabled state.
   */
  enabled: function(enabled) {
    if (enabled !== undefined) {
      this.property(wcNode.PROPERTY.ENABLED, enabled? true: false);
    }

    return this.property(wcNode.PROPERTY.ENABLED);
  },

  /**
   * Sets, or Gets this node's debug log state.
   * @function wcNode#debugLog
   * @param {Boolean} [enabled] - If supplied, will assign a new debug log state.
   * @returns {Boolean} - The current debug log state.
   */
  debugLog: function(enabled) {
    if (enabled !== undefined) {
      this.property(wcNode.PROPERTY.DEBUG_LOG, enabled? true: false);
    }

    var engine = this.engine();
    return (!engine || engine.isSilent())? false: this.property(wcNode.PROPERTY.DEBUG_LOG);
  },

  /**
   * Sets, or Gets this node's debug pause state.
   * @function wcNode#debugBreak
   * @param {Boolean} [enabled] - If supplied, will assign a new debug pause state.
   * @returns {Boolean} - The current debug pause state.
   */
  debugBreak: function(enabled) {
    if (enabled !== undefined) {
      this._break = enabled? true: false;
    }

    var engine = this.engine();
    return (engine && engine.debugging() && this._break);
  },

  /**
   * Sets, or Gets this node's collapsed state.
   * @function wcNode#collapsed
   * @param {Boolean} [enabled] - If supplied, will assign a new debug pause state.
   * @returns {Boolean} - The current debug pause state.
   */
  collapsed: function(enabled) {
    if (enabled !== undefined) {
      this._collapsed = enabled;
    }

    return this._collapsed;
  },

  /**
   * If your node takes time to process, call this to begin a thread that will keep the node 'active' until you close the thread with {@link wcNode#finishThread}.<br>
   * This ensures that, even if a node is executed more than once at the same time, each 'thread' is kept track of individually.<br>
   * <b>Note:</b> This is not necessary if your node executes immediately without a timeout.
   * @function wcNode#beginThread
   * @returns {Number} - A thread ID that you will use with {@link wcNode#finishThread}.
   * @example
   *  onTriggered: function(name) {
   *    this._super(name);
   *
   *    // Always fire the 'out' link immediately.
   *    this.triggerExit('out');
   *
   *    // Now set a timeout to wait for 'Milliseconds' amount of time.
   *    var self = this;
   *    var delay = this.property('milliseconds');
   *
   *    // Start a new thread that will keep the node alive until we are finished.
   *    var thread = this.beginThread();
   *    setTimeout(function() {
   *      // Once the time has completed, fire the 'Finished' link and finish our thread.
   *      self.triggerExit('finished');
   *      self.finishThread(thread);
   *    }, delay);
   *  },
   *
   */
  beginThread: function() {
    this._threadIndex++;
    this._meta.threads.push(this._threadIndex);
    this._meta.awake = true;
    return this._threadIndex;
  },

  /**
   * Finishes a previously started thread from {@link wcNode#beginThread}.<br>
   * <b>Note:</b> If you do not properly finish a thread that was generated, your node will remain forever in its active state.
   * @function wcNode#finishThread
   * @param {Number} id - The thread ID to close, generated by {@link wcNode#beginThread}.
   */
  finishThread: function(id) {
    var index = this._meta.threads.indexOf(id);
    if (index > -1) {
      this._meta.threads.splice(index, 1);

      if (!this._meta.threads.length) {
        this._meta.awake = false;
      }
    }
  },

  /**
   * Gets, or Sets the current position of the node.
   * @function wcNode#pos
   * @param {wcPlay~Coordinates} [pos] - If supplied, will assign a new position for this node.
   * @returns {wcPlay~Coordinates} - The current position of this node.
   */
  pos: function(pos) {
    if (pos !== undefined) {
      this.pos.x = pos.x;
      this.pos.y = pos.y;
    }

    return {x: this.pos.x, y: this.pos.y};
  },

  /**
   * Creates a new entry link on the node.
   * @function wcNode#createEntry
   * @param {String} [name="In"] - The name of the entry link.
   * @returns {Boolean} - Fails if the entry link name already exists.
   */
  createEntry: function(name) {
    for (var i = 0; i < this.chain.entry.length; ++i) {
      if (this.chain.entry[i].name === name) {
        return false;
      }
    }

    this.chain.entry.push({
      name: name,
      active: false,
      links: [],
      meta: {
        flash: false,
        flashDelta: 0,
        color: "#000000",
      },
    });
    return true;
  },

  /**
   * Creates a new exit link on the node.
   * @function wcNode#createExit
   * @param {String} name - The name of the exit link.
   * @returns {Boolean} - Fails if the exit link name already exists.
   */
  createExit: function(name) {
    for (var i = 0; i < this.chain.exit.length; ++i) {
      if (this.chain.exit[i].name === name) {
        return false;
      }
    }

    this.chain.exit.push({
      name: name,
      links: [],
      meta: {
        flash: false,
        flashDelta: 0,
        color: "#000000",
      },
    });
    return true;
  },

  /**
   * Creates a new property.
   * @function wcNode#createProperty
   * @param {String} name - The name of the property.
   * @param {wcPlay.PROPERTY_TYPE} type - The type of property.
   * @param {Object} [initialValue] - A initial value for this property when the script starts.
   * @param {Object} [options] - Additional options for this property, see {@link wcPlay.PROPERTY_TYPE}.
   * @returns {Boolean} - Failes if the property does not exist.
   */
  createProperty: function(name, type, initialValue, options) {
    // Make sure this property doesn't already exist.
    for (var i = 0; i < this.properties.length; ++i) {
      if (this.properties[i].name === name) {
        return false;
      }
    }

    if (initialValue === undefined) {
      initialValue = 0;
    }

    this.properties.push({
      name: name,
      value: initialValue,
      initialValue: initialValue,
      type: type,
      inputs: [],
      outputs: [],
      options: options || {},
      inputMeta: {
        flash: false,
        flashDelta: 0,
        color: "#000000",
      },
      outputMeta: {
        flash: false,
        flashDelta: 0,
        color: "#000000",
      },
    });
    return true;
  },

  /**
   * Removes an entry link from the node.
   * @function wcNode#removeEntry
   * @param {String} name - The name of the entry link to remove.
   * @returns {Boolean} - Fails if the link does not exist.
   */
  removeEntry: function(name) {
    for (var i = 0; i < this.chain.entry.length; ++i) {
      if (this.chain.entry[i].name === name) {
        if (this.disconnectEntry(name) === wcNode.CONNECT_RESULT.SUCCESS) {
          this.chain.entry.splice(i, 1);
          return true;
        }
      }
    }
    return false;
  },

  /**
   * Removes an exit link from the node.
   * @function wcNode#removeExit
   * @param {String} name - The name of the exit link to remove.
   * @returns {Boolean} - Fails if the link does not exist.
   */
  removeExit: function(name) {
    for (var i = 0; i < this.chain.exit.length; ++i) {
      if (this.chain.exit[i].name === name) {
        if (this.disconnectExit(name) === wcNode.CONNECT_RESULT.SUCCESS) {
          this.chain.exit.splice(i, 1);
          return true;
        }
      }
    }
    return false;
  },

  /**
   * Removes a property from the node.
   * @function wcNode#removeProperty
   * @param {String} name - The name of the property to remove.
   * @returns {Boolean} - Fails if the property does not exist.
   */
  removeProperty: function(name) {
    for (var i = 0; i < this.properties.length; ++i) {
      if (this.properties[i].name === name) {
        if (this.disconnectInput(name) === this.disconnectOutput(name) === wcNode.CONNECT_RESULT.SUCCESS) {
          this.properties.splice(i, 1);
          return true;
        }
      }
    }
    return false;
  },

  /**
   * Connects an entry link on this node to an exit link of another.
   * @function wcNode#connectEntry
   * @param {String} name - The name of the entry link on this node.
   * @param {wcNode} targetNode - The target node to link to.
   * @param {String} targetName - The name of the target node's exit link to link to.
   * @returns {wcNode.CONNECT_RESULT} - The result.
   */
  connectEntry: function(name, targetNode, targetName) {
    if (!(targetNode instanceof wcNode)) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    var myLink = null;
    var targetLink = null;

    // Find my link.
    for (var i = 0; i < this.chain.entry.length; ++i) {
      if (this.chain.entry[i].name === name) {
        myLink = this.chain.entry[i];
        break;
      }
    }

    // Find the target link.
    for (var i = 0; i < targetNode.chain.exit.length; ++i) {
      if (targetNode.chain.exit[i].name === targetName) {
        targetLink = targetNode.chain.exit[i];
        break;
      }
    }

    if (!myLink || !targetLink) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Make sure the connection doesn't already exist.
    for (var i = 0; i < myLink.links.length; ++i) {
      if (myLink.links[i].node === targetNode && myLink.links[i].name === targetLink.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
    }

    for (var i = 0; i < targetLink.links.length; ++i) {
      if (targetLink.links[i].node === this && targetLink.links[i].name === myLink.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
    }

    // Now make the connection.
    myLink.links.push({
      name: targetLink.name,
      node: targetNode,
    });

    targetLink.links.push({
      name: myLink.name,
      node: this,
    });

    // Notify of the connection change.
    this.onConnect(true, myLink.name, wcNode.LINK_TYPE.ENTRY, targetNode, targetLink.name, wcNode.LINK_TYPE.EXIT);
    targetNode.onConnect(true, targetLink.name, wcNode.LINK_TYPE.EXIT, this, myLink.name, wcNode.LINK_TYPE.ENTRY);
    return wcNode.CONNECT_RESULT.SUCCESS;
  },

  /**
   * Connects an exit link on this node to an entry link of another.
   * @function wcNode#connectExit
   * @param {String} name - The name of the exit link on this node.
   * @param {wcNode} targetNode - The target node to link to.
   * @param {String} targetName - The name of the target node's entry link to link to.
   * @returns {wcNode.CONNECT_RESULT} - The result.
   */
  connectExit: function(name, targetNode, targetName) {
    if (!(targetNode instanceof wcNode)) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    var myLink = null;
    var targetLink = null;

    // Find my link.
    for (var i = 0; i < this.chain.exit.length; ++i) {
      if (this.chain.exit[i].name === name) {
        myLink = this.chain.exit[i];
        break;
      }
    }

    // Find the target link.
    for (var i = 0; i < targetNode.chain.entry.length; ++i) {
      if (targetNode.chain.entry[i].name === targetName) {
        targetLink = targetNode.chain.entry[i];
        break;
      }
    }

    if (!myLink || !targetLink) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Make sure the connection doesn't already exist.
    for (var i = 0; i < myLink.links.length; ++i) {
      if (myLink.links[i].node === targetNode && myLink.links[i].name === targetLink.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
    }

    for (var i = 0; i < targetLink.links.length; ++i) {
      if (targetLink.links[i].node === this && targetLink.links[i].name === myLink.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
    }

    // Now make the connection.
    myLink.links.push({
      name: targetLink.name,
      node: targetNode,
    });

    targetLink.links.push({
      name: myLink.name,
      node: this,
    });

    // Notify of the connection change.
    this.onConnect(true, myLink.name, wcNode.LINK_TYPE.EXIT, targetNode, targetLink.name, wcNode.LINK_TYPE.ENTRY);
    targetNode.onConnect(true, targetLink.name, wcNode.LINK_TYPE.ENTRY, this, myLink.name, wcNode.LINK_TYPE.EXIT);
    return wcNode.CONNECT_RESULT.SUCCESS;
  },

  /**
   * Connects a property input link to a target property output link.
   * @function wcNode#connectInput
   * @param {String} name - The name of the property being connected.
   * @param {wcNode} targetNode - The target node to connect with.
   * @param {String} targetName - The name of the property on the target node to connect with.
   * @returns {wcNode.CONNECT_RESULT} - The result.
   */
  connectInput: function(name, targetNode, targetName) {
    if (!(targetNode instanceof wcNode)) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    var myProperty = null;
    var targetProperty = null;

    // Find my property.
    for (var i = 0; i < this.properties.length; ++i) {
      if (this.properties[i].name === name) {
        myProperty = this.properties[i];
        break;
      }
    }

    // Find the target property.
    for (var i = 0; i < targetNode.properties.length; ++i) {
      if (targetNode.properties[i].name === targetName) {
        targetProperty = targetNode.properties[i];
        break;
      }
    }

    if (!myProperty || !targetProperty) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Make sure the connection doesn't already exist.
    for (var i = 0; i < myProperty.inputs.length; ++i) {
      if (myProperty.inputs[i].node === targetNode && myProperty.inputs[i].name === targetProperty.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
    }

    for (var i = 0; i < targetProperty.outputs.length; ++i) {
      if (targetProperty.outputs[i].node === this && targetProperty.outputs[i].name === myProperty.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
    }

    // Now make the connection.
    myProperty.inputs.push({
      name: targetProperty.name,
      node: targetNode,
    });

    targetProperty.outputs.push({
      name: myProperty.name,
      node: this,
    });

    // Notify of the connection change.
    this.onConnect(true, myProperty.name, wcNode.LINK_TYPE.INPUT, targetNode, targetProperty.name, wcNode.LINK_TYPE.OUTPUT);
    targetNode.onConnect(true, targetProperty.name, wcNode.LINK_TYPE.OUTPUT, this, myProperty.name, wcNode.LINK_TYPE.INPUT);
    return wcNode.CONNECT_RESULT.SUCCESS;
  },

  /**
   * Connects a property output link to a target property input link.
   * @function wcNode#connectOutput
   * @param {String} name - The name of the property being connected.
   * @param {wcNode} targetNode - The target node to connect with.
   * @param {String} targetName - The name of the property on the target node to connect with.
   * @returns {wcNode.CONNECT_RESULT} - The result.
   */
  connectOutput: function(name, targetNode, targetName) {
    if (!(targetNode instanceof wcNode)) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    var myProperty = null;
    var targetProperty = null;

    // Find my property.
    for (var i = 0; i < this.properties.length; ++i) {
      if (this.properties[i].name === name) {
        myProperty = this.properties[i];
        break;
      }
    }

    // Find the target property.
    for (var i = 0; i < targetNode.properties.length; ++i) {
      if (targetNode.properties[i].name === targetName) {
        targetProperty = targetNode.properties[i];
        break;
      }
    }

    if (!myProperty || !targetProperty) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Make sure the connection doesn't already exist.
    for (var i = 0; i < myProperty.outputs.length; ++i) {
      if (myProperty.outputs[i].node === targetNode && myProperty.outputs[i].name === targetProperty.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
    }

    for (var i = 0; i < targetProperty.inputs.length; ++i) {
      if (targetProperty.inputs[i].node === this && targetProperty.inputs[i].name === myProperty.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
    }

    // Now make the connection.
    myProperty.outputs.push({
      name: targetProperty.name,
      node: targetNode,
    });

    targetProperty.inputs.push({
      name: myProperty.name,
      node: this,
    });

    // Notify of the connection change.
    this.onConnect(true, myProperty.name, wcNode.LINK_TYPE.OUTPUT, targetNode, targetProperty.name, wcNode.LINK_TYPE.INPUT);
    targetNode.onConnect(true, targetProperty.name, wcNode.LINK_TYPE.INPUT, this, myProperty.name, wcNode.LINK_TYPE.OUTPUT);
    return wcNode.CONNECT_RESULT.SUCCESS;
  },

  /**
   * Disconnects a chain, or all chains, from an entry link.
   * @function wcNode#disconnectEntry
   * @param {String} name - The name of the entry link.
   * @param {wcNode} [targetNode] - If supplied, will only remove links to the specified target node.
   * @param {String} [targetName] - If supplied, will only remove links to the specified named exit links.
   * @returns {wcNode.CONNECT_RESULT}
   */
  disconnectEntry: function(name, targetNode, targetName) {
    // Find my entry link.
    var myLink = null;
    for (var i = 0; i < this.chain.entry.length; ++i) {
      if (this.chain.entry[i].name === name) {
        myLink = this.chain.entry[i];
        break;
      }
    }

    if (!myLink) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Iterate through all chained links and disconnect as necessary.
    for (var i = 0; i < myLink.links.length; ++i) {
      var targetLink = myLink.links[i];
      if ((!targetNode || targetNode === targetLink.node) && (!targetName || targetName === targetLink.name)) {
        // Remove this link.
        myLink.links.splice(i, 1);
        i--;

        targetLink.node.disconnectExit(targetLink.name, this, name);
      }
    }
    return wcNode.CONNECT_RESULT.SUCCESS;
  },

  /**
   * Disconnects a chain, or all chains, from an exit link.
   * @function wcNode#disconnectExit
   * @param {String} name - The name of the exit link.
   * @param {wcNode} [targetNode] - If supplied, will only remove links to the specified target node.
   * @param {String} [targetName] - If supplied, will only remove links to the specified named entry links.
   * @returns {wcNode.CONNECT_RESULT}
   */
  disconnectExit: function(name, targetNode, targetName) {
    // Find my exit link.
    var myLink = null;
    for (var i = 0; i < this.chain.exit.length; ++i) {
      if (this.chain.exit[i].name === name) {
        myLink = this.chain.exit[i];
        break;
      }
    }

    if (!myLink) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Iterate through all chained links and disconnect as necessary.
    for (var i = 0; i < myLink.links.length; ++i) {
      var targetLink = myLink.links[i];
      if ((!targetNode || targetNode === targetLink.node) && (!targetName || targetName === targetLink.name)) {
        // Remove this link.
        myLink.links.splice(i, 1);
        i--;

        targetLink.node.disconnectEntry(targetLink.name, this, name);
      }
    }
    return wcNode.CONNECT_RESULT.SUCCESS;
  },

  /**
   * Disconnects a chain, or all chains, from a property input.
   * @function wcNode#disconnectInput
   * @param {String} name - The name of the property.
   * @param {wcNode} [targetNode] - If supplied, will only remove links to the specified target node.
   * @param {String} [targetName] - If supplied, will only remove links to the specified named property output links.
   * @returns {wcNode.CONNECT_RESULT}
   */
  disconnectInput: function(name, targetNode, targetName) {
    // Find my property.
    var myProperty = null;
    for (var i = 0; i < this.properties.length; ++i) {
      if (this.properties[i].name === name) {
        myProperty = this.properties[i];
        break;
      }
    }

    if (!myProperty) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Iterate through all chained links and disconnect as necessary.
    for (var i = 0; i < myProperty.inputs.length; ++i) {
      var targetProperty = myProperty.inputs[i];
      if ((!targetNode || targetNode === targetProperty.node) && (!targetName || targetName === targetProperty.name)) {
        // Remove this link.
        myProperty.inputs.splice(i, 1);
        i--;

        targetProperty.node.disconnectOutput(targetProperty.name, this, name);
      }
    }
    return wcNode.CONNECT_RESULT.SUCCESS;
  },

  /**
   * Disconnects a chain, or all chains, from a property output.
   * @function wcNode#disconnectOutput
   * @param {String} name - The name of the property.
   * @param {wcNode} [targetNode] - If supplied, will only remove links to the specified target node.
   * @param {String} [targetName] - If supplied, will only remove links to the specified named property input links.
   * @returns {wcNode.CONNECT_RESULT}
   */
  disconnectOutput: function(name, targetNode, targetName) {
    // Find my property.
    var myProperty = null;
    for (var i = 0; i < this.properties.length; ++i) {
      if (this.properties[i].name === name) {
        myProperty = this.properties[i];
        break;
      }
    }

    if (!myProperty) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Iterate through all chained links and disconnect as necessary.
    for (var i = 0; i < myProperty.outputs.length; ++i) {
      var targetProperty = myProperty.outputs[i];
      if ((!targetNode || targetNode === targetProperty.node) && (!targetName || targetName === targetProperty.name)) {
        // Remove this link.
        myProperty.outputs.splice(i, 1);
        i--;

        targetProperty.node.disconnectInput(targetProperty.name, this, name);
      }
    }
    return wcNode.CONNECT_RESULT.SUCCESS;
  },

  /**
   * Triggers an entry link and activates this node.
   * @function wcNode#triggerEntry
   * @param {String} name - The name of the entry link to trigger.
   * @returns {Boolean} - Fails if the entry link does not exist.
   */
  triggerEntry: function(name) {
    for (var i = 0; i < this.chain.entry.length; ++i) {
      if (this.chain.entry[i].name == name) {
        // Always queue the trigger so execution is not immediate.
        var engine = this.engine();
        this.chain.entry[i].meta.flash = true;
        if (this.debugBreak() || (engine && engine.stepping())) {
          this.chain.entry[i].meta.paused = true;
        }
        engine && engine.queueNodeEntry(this, this.chain.entry[i].name);
        return true;
      }
    }

    return false;
  },

  /**
   * Triggers an exit link.
   * @function wcNode#triggerExit
   * @param {String} name - The name of the exit link to trigger.
   * @returns {Boolean} - Fails if the exit link does not exist.
   */
  triggerExit: function(name) {
    if (this.debugLog()) {
      console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' - ' + this.name: '') + '" Triggered Exit link "' + name + '"');
    }

    for (var i = 0; i < this.chain.exit.length; ++i) {
      var exitLink = this.chain.exit[i];
      if (exitLink.name == name) {
        this.chain.exit[i].meta.flash = true;
        // Activate all entry links chained to this exit.
        var engine = this.engine();

        for (var a = 0; a < exitLink.links.length; ++a) {
          if (exitLink.links[a].node) {
            exitLink.links[a].node.triggerEntry(exitLink.links[a].name);
            if (exitLink.links[a].node.debugBreak() || (engine && engine.stepping())) {
              this.chain.exit[i].meta.paused = true;
            }
          }
        }
        return true;
      }
    }

    return false;
  },

  /**
   * Gets, or Sets the value of a property.
   * @function wcNode#property
   * @param {String} name - The name of the property.
   * @param {Object} [value] - If supplied, will assign a new value to the property.
   * @param {Boolean} [forceOrSilent] - If supplied, true will force the change event to be sent to all chained properties even if this value didn't change while false will force the change to not be chained.
   * @returns {Object|undefined} - The value of the property, or undefined if not found.
   */
  property: function(name, value, forceOrSilent) {
    for (var i = 0; i < this.properties.length; ++i) {
      var prop = this.properties[i];
      if (prop.name === name) {
        if (value !== undefined) {
          // Retrieve the current value of the property
          var oldValue = prop.value;

          var engine = this.engine();
          prop.outputMeta.flash = true;
          if (this.debugBreak() || (engine && engine.stepping())) {
            prop.outputMeta.paused = true;
          }

          // Notify about to change event.
          if (forceOrSilent || prop.value !== value) {
            value = this.onPropertyChanging(prop.name, oldValue, value) || value;
          }

          if (forceOrSilent || prop.value !== value) {
            prop.value = value;

            // Notify that the property has changed.
            this.onPropertyChanged(prop.name, oldValue, value);

            // Now follow any output links and assign the new value to them as well.
            if (forceOrSilent === undefined || forceOrSilent) {
              for (a = 0; a < prop.outputs.length; ++a) {
                prop.outputs[a].node && prop.outputs[a].node.triggerProperty(prop.outputs[a].name, value);
              }
            }
          }
        }

        return prop.value;
      }
    }
  },

  /**
   * Triggers a property that is about to be changed by the output of another property.
   * @function wcNode#triggerProperty
   * @param {String} name - The name of the property.
   * @param {Object} value - The new value of the property.
   */
  triggerProperty: function(name, value) {
    var engine = this.engine();
    if (engine) {
      engine.queueNodeProperty(this, name, value);
    }

    for (var i = 0; i < this.properties.length; ++i) {
      var prop = this.properties[i];
      if (prop.name === name) {
        prop.inputMeta.flash = true;
        if (this.debugBreak() || (engine && engine.stepping())) {
          prop.inputMeta.paused = true;
        }
      }
    }
  },

  /**
   * Gets, or Sets the initial value of a property.
   * @function wcNode#initialValue
   * @param {String} name - The name of the property.
   * @param {Object} [value] - If supplied, will assign a new default value to the property.
   * @returns {Object|undefined} - The default value of the property, or undefined if not found.
   */
  initialValue: function(name, value) {
    for (var i = 0; i < this.properties.length; ++i) {
      var prop = this.properties[i];
      if (prop.name === name) {
        prop.initialValue = value;
      }
    }
  },

  /**
   * Sets a size for the custom viewport.<br>
   * The custom viewport is a rectangular area embedded into the node's visual display in which you can 'draw' whatever you wish. It appears below the title text and above properties.
   * @function wcNode#viewportSize
   * @param {Number} [width] - If supplied, assigns the width of the viewport desired. Use 0 or null to disable the viewport.
   * @param {Number} [height] - If supplied, assigns the height of the viewport desired. Use 0 or null to disable the viewport.
   * @returns {wcPlay~Coordinates} - The current size of the viewport.
   */
  viewportSize: function(width, height) {
    if (width !== undefined && height !== undefined) {
      if (!width || !height) {
        this._viewportSize = null;
      } else {
        this._viewportSize = {
          x: width,
          y: height,
        };
      }
    }

    return {x: this._viewportSize.x, y: this._viewportSize.y};
  },

  /**
   * Event that is called when it is time to draw the contents of your custom viewport.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onViewport
   * @param {external:Canvas~Context} context - The canvas context to draw on, coordinates 0,0 will be the top left corner of your viewport. It is up to you to stay within the [viewport bounds]{@link wcNode#viewportSize} you have assigned.
   * @see wcNode#viewportSize
   */
  onViewport: function(context) {
  },

  /**
   * Event that is called when a connection has been made.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onConnect
   * @param {Boolean} isConnecting - True if a connection is being made, false if it is a disconnection.
   * @param {String} name - The name of the link being connected to.
   * @param {wcNode.LINK_TYPE} type - The link's type.
   * @param {wcNode} targetNode - The target node being connected to.
   * @param {String} targetName - The link name on the target node being connected to.
   * @param {wcNode.LINK_TYPE} targetType - The target link's type.
   */
  onConnect: function(isConnecting, name, type, targetNode, targetName, targetType) {
    // If we are connecting one of our property outputs to another property, alert them and send your value to them.
    if (isConnecting && type === wcNode.LINK_TYPE.OUTPUT) {
      targetNode.triggerProperty(targetName, this.property(name));
    }
  },

  /**
   * Event that is called as soon as the Play script has started.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onStart
   */
  onStart: function() {
    if (this.debugLog()) {
      console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' - ' + this.name: '') + '" started!');
    }
  },

  /**
   * Event that is called when an entry link has been triggered.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onTriggered
   * @param {String} name - The name of the entry link triggered.
   */
  onTriggered: function(name) {
    if (this.debugLog()) {
      console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' - ' + this.name: '') + '" Triggered Entry link "' + name + '"');
    }
  },

  /**
   * Event that is called when a property is about to be changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onPropertyChanging
   * @param {String} name - The name of the property.
   * @param {Object} oldValue - The current value of the property.
   * @param {Object} newValue - The new, proposed, value of the property.
   * @returns {Object} - Return the new value of the property (usually newValue unless you are proposing restrictions). If no value is returned, newValue is assumed.
   */
  onPropertyChanging: function(name, oldValue, newValue) {
    // if (this.debugLog()) {
    //   console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' - ' + this.name: '') + '" Changing Property "' + name + '" from "' + oldValue + '" to "' + newValue + '"');
    // }
  },

  /**
   * Event that is called when a property has changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onPropertyChanged
   * @param {String} name - The name of the property.
   * @param {Object} oldValue - The old value of the property.
   * @param {Object} newValue - The new value of the property.
   */
  onPropertyChanged: function(name, oldValue, newValue) {
    if (this.debugLog()) {
      console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' - ' + this.name: '') + '" Changed Property "' + name + '" from "' + oldValue + '" to "' + newValue + '"');
    }
  },

  /**
   * Event that is called when the property is being asked its value, before the value is actually retrieved.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onPropertyGet
   * @param {String} name - The name of the property.
   */
  onPropertyGet: function(name) {
    // if (this.debugLog()) {
    //   console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' - ' + this.name: '') + '" Requested Property "' + name + '"');
    // }
  },

  /**
   * Event that is called when the property has had its value retrieved.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onPropertyGot
   * @param {String} name - The name of the property.
   */
  onPropertyGot: function(name) {
    if (this.debugLog()) {
      console.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' - ' + this.name: '') + '" Got Property "' + name + '"');
    }
  },

  /**
   * Event that is called when a global property value has changed.
   * Overload this in inherited nodes.<br>
   * <b>Note:</b> Do not call 'this._super(..)' for this function, as the parent does not implement it.
   * @function wcNode#onSharedPropertyChanged
   * @param {String} name - The name of the global property.
   * @param {Object} oldValue - The old value of the global property.
   * @param {Object} newValue - The new value of the global property.
   */
  // onSharedPropertyChanged: function(name, oldValue, newValue) {
  // },

  /**
   * Event that is called when a global property has been renamed.
   * Overload this in inherited nodes.<br>
   * <b>Note:</b> Do not call 'this._super(..)' for this function, as the parent does not implement it.
   * @function wcNode#onSharedPropertyRenamed
   * @param {String} oldName - The old name of the global property.
   * @param {String} newName - The new name of the global property.
   */
  // onSharedPropertyRenamed: function(oldName, newName) {
  // },
});

/**
 * The type of node link.
 * @enum {String}
 */
wcNode.LINK_TYPE = {
  ENTRY: 'entry',
  EXIT: 'exit',
  INPUT: 'input',
  OUTPUT: 'output',
};

/**
 * The connection result.
 * @enum {String}
 */
wcNode.CONNECT_RESULT = {
  NOT_FOUND: 'not_found',
  ALREADY_CONNECTED: 'already_connected',
  SUCCESS: 'success',
};


/**
 * Default property type names.
 * @enum {String}
 */
wcNode.PROPERTY = {
  ENABLED: 'enabled',
  DEBUG_LOG: 'debug log',
};
wcNode.extend('wcNodeEntry', 'Entry Node', '', {
  /**
   * @class
   * The base class for all entry nodes. These are nodes that start script chains.<br>
   * When inheriting, make sure to include 'this._super(parent, pos, type);' at the top of your init function.
   *
   * @constructor wcNodeEntry
   * @description
   * <b>Should be inherited and never constructed directly.</b>
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [type="Entry Node"] - The type name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, type) {
    this._super(parent, pos, type);
    this.color = '#CCCC00';

    // Create a default exit link.
    this.createExit('out');
  },

  /**
   * Magic function that is called whenever any new class type is extended from this one.<br>
   * Handles initializing of the class as well as registering the new node type.
   * @function wcNodeEntry#classInit
   * @param {String} className - The name of the class constructor.
   * @param {String} name - A display name for the node.
   * @param {String} category - A category where this node will be grouped.
   */
  classInit: function(className, name, category) {
    if (category) {
      this.className = className;
      this.name = name;
      this.category = category;
      wcPlay.registerNodeType(className, name, category, wcPlay.NODE_TYPE.ENTRY);
    }
  },

  /**
   * Overloading the default onTriggered event handler so we can make it immediately trigger our exit link if our conditions are met.
   * @function wcNodeEntry#onTriggered
   * @see wcNodeEntry#triggerCondition
   * @param {Object} [data] - A custom data object passed in from the triggerer.
   */
  onTriggered: function(data) {
    if (this.triggerCondition(data)) {
      this.triggerExit('out');
    }
  },

  /**
   * Overload this in inherited nodes if you want to apply a condition when this entry node is triggered.
   * @function wcNodeEntry#triggerCondition
   * @returns {Boolean} - Whether the condition passes and the entry node should trigger (true by default).
   * @param {Object} [data] - A custom data object passed in from the triggerer.
   */
  triggerCondition: function(data) {
    return true;
  },

  // *
  //  * Event that is called when a property has changed.<br>
  //  * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
  //  * @function wcNode#onPropertyChanged
  //  * @param {String} name - The name of the property.
  //  * @param {Object} oldValue - The old value of the property.
  //  * @param {Object} newValue - The new value of the property.
   
  // onPropertyChanged: function(name, oldValue, newValue) {
  //   this._super(name, oldValue, newValue);

  //   // Manually trigger the event.
  //   // if (name === wcNode.PROPERTY.TRIGGER && newValue) {
  //   //   this.triggerExit('out');

  //   //   // Turn the toggle back off so it can be used again.
  //   //   this.property(wcNode.PROPERTY.TRIGGER, false);
  //   // }
  // },
});


wcNode.extend('wcNodeProcess', 'Node Process', '', {
  /**
   * @class
   * The base class for all process nodes. These are nodes that make up the bulk of script chains.<br>
   * When inheriting, make sure to include 'this._super(parent, pos, type);' at the top of your init function.
   *
   * @constructor wcNodeProcess
   * @description
   * <b>Should be inherited and never constructed directly.</b>
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [type="Node Process"] - The type name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, type) {
    this._super(parent, pos, type);
    this.color = '#007ACC';

    // Create a default links.
    this.createEntry('in');
    this.createExit('out');
  },

  /**
   * Magic function that is called whenever any new class type is extended from this one.<br>
   * Handles initializing of the class as well as registering the new node type.
   * @function wcNodeProcess#classInit
   * @param {String} className - The name of the class constructor.
   * @param {String} name - A display name for the node.
   * @param {String} category - A category where this node will be grouped.
   */
  classInit: function(className, name, category) {
    if (category) {
      this.className = className;
      this.name = name;
      this.category = category;
      wcPlay.registerNodeType(className, name, category, wcPlay.NODE_TYPE.PROCESS);
    }
  },
});

wcNode.extend('wcNodeStorage', 'Storage', '', {
  /**
   * @class
   * The base class for all storage nodes. These are nodes designed solely for managing data.<br>
   * When inheriting, make sure to include 'this._super(parent, pos, type);' at the top of your init function.<br>
   * Also when inheriting, a 'value' property MUST be created as the storage value.
   *
   * @constructor wcNodeStorage
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [type="Storage"] - The type name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, type) {
    this._super(parent, pos, type);
    this.color = '#009900';
  },

  /**
   * Magic function that is called whenever any new class type is extended from this one.<br>
   * Handles initializing of the class as well as registering the new node type.
   * @function wcNodeEntry#classInit
   * @param {String} className - The name of the class constructor.
   * @param {String} name - A display name for the node.
   * @param {String} category - A category where this node will be grouped.
   */
  classInit: function(className, name, category) {
    if (category) {
      this.className = className;
      this.name = name;
      this.category = category;
      wcPlay.registerNodeType(className, name, category, wcPlay.NODE_TYPE.STORAGE);
    }
  },

  /**
   * Event that is called as soon as the Play script has started.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeStorage#onStart
   */
  onStart: function() {
    this._super();

    // Force a property change event so all connected nodes receive our value.
    this.property('value', this.property('value'), true);
  },
});

wcNodeEntry.extend('wcNodeEntryStart', 'Start', 'Core', {
  /**
   * @class
   * An entry node that fires as soon as the script [starts]{@link wcPlay#start}.<br>
   * When inheriting, make sure to include 'this._super(parent, pos, type);' at the top of your init function.
   *
   * @constructor wcNodeEntryStart
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [type="Start"] - The type name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, type) {
    this._super(parent, pos, type);
  },

  /**
   * Event that is called as soon as the Play script has started.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeEntryStart#onStart
   */
  onStart: function() {
    this._super();
    this.onTriggered();
  },
});
wcNodeProcess.extend('wcNodeProcessDelay', 'Delay', 'Core', {
  /**
   * @class
   * Waits for a specified amount of time before continuing the node chain.<br>
   * When inheriting, make sure to include 'this._super(parent, pos, type);' at the top of your init function.
   *
   * @constructor wcNodeProcessDelay
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [type="Delay"] - The type name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, type) {
    this._super(parent, pos, type);

    // Create a finished exit that only triggers after the delay has elapsed.
    this.createExit('finished');

    // Create the message property so we know what to output in the log.
    this.createProperty('milliseconds', wcPlay.PROPERTY_TYPE.NUMBER, 1000);
  },

  /**
   * Event that is called when an entry link has been triggered.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessDelay#onTriggered
   * @param {String} name - The name of the entry link triggered.
   */
  onTriggered: function(name) {
    this._super(name);

    // Always fire the 'out' link immediately.
    this.triggerExit('out');

    // Now set a timeout to wait for 'Milliseconds' amount of time.    
    var self = this;
    var delay = this.property('milliseconds');

    // Start a new thread that will keep the node alive until we are finished.
    var thread = this.beginThread();
    setTimeout(function() {
      // Once the time has completed, fire the 'Finished' link and finish our thread.
      self.triggerExit('finished');
      self.finishThread(thread);
    }, delay);
  },
});

wcNodeProcess.extend('wcNodeProcessLog', 'Log', 'Core', {
  /**
   * @class
   * For debugging purposes, will print out a message into the console log the moment it is activated. Ignores [silent mode]{@link wcPlay~Options}.<br>
   * When inheriting, make sure to include 'this._super(parent, pos, type);' at the top of your init function.
   *
   * @constructor wcNodeProcessLog
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [type="Log"] - The type name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, type) {
    this._super(parent, pos, type);

    // Create the message property so we know what to output in the log.
    this.createProperty('message', wcPlay.PROPERTY_TYPE.STRING, 'Log message.', {multiline: true});
  },

  /**
   * Event that is called when an entry link has been triggered.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessDelay#onTriggered
   * @param {String} name - The name of the entry link triggered.
   */
  onTriggered: function(name) {
    this._super(name);

    var msg = this.property('message');
    console.log('LOG: ' + msg);
    this.triggerExit('out');
  },
});

wcNodeProcess.extend('wcNodeProcessOperation', 'Operation', 'Core', {
  /**
   * @class
   * Performs a simple math operation on two values.
   * When inheriting, make sure to include 'this._super(parent, pos, type);' at the top of your init function.
   *
   * @constructor wcNodeProcessOperation
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [type="Operation"] - The type name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, type) {
    this._super(parent, pos, type);

    // Remove our default entry.
    this.removeEntry('in');

    // Create an input link per operation type.
    this.createEntry('add');
    this.createEntry('sub');
    this.createEntry('mul');
    this.createEntry('div');

    // Create our two operator values.
    this.createProperty('valueA', wcPlay.PROPERTY_TYPE.NUMBER, 0);
    this.createProperty('valueB', wcPlay.PROPERTY_TYPE.NUMBER, 0);
    this.createProperty('result', wcPlay.PROPERTY_TYPE.NUMBER, 0);
  },

  /**
   * Event that is called when an entry link has been triggered.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessDelay#onTriggered
   * @param {String} name - The name of the entry link triggered.
   */
  onTriggered: function(name) {
    this._super(name);

    var a = parseFloat(this.property('valueA'));
    var b = parseFloat(this.property('valueB'));
    var result;

    switch (name) {
      case 'add': result = a + b; break;
      case 'sub': result = a - b; break;
      case 'mul': result = a * b; break;
      case 'div': result = a / b; break;
    }

    this.property('result', result);
    this.triggerExit('out');
  },
});

wcNodeStorage.extend('wcNodeStorageToggle', 'Toggle', 'Core', {
  /**
   * @class
   * Stores a boolean (toggleable) value.
   * When inheriting, make sure to include 'this._super(parent, pos, type);' at the top of your init function.
   *
   * @constructor wcNodeStorageToggle
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [type="Toggle"] - The type name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, type) {
    this._super(parent, pos, type);

    this.createProperty('value', wcPlay.PROPERTY_TYPE.TOGGLE, false);
  },
});

wcNodeStorage.extend('wcNodeStorageNumber', 'Number', 'Core', {
  /**
   * @class
   * Stores a number value.<br>
   * When inheriting, make sure to include 'this._super(parent, pos, type);' at the top of your init function.
   *
   * @constructor wcNodeStorageNumber
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [type="Number"] - The type name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, type) {
    this._super(parent, pos, type);

    this.createProperty('value', wcPlay.PROPERTY_TYPE.NUMBER);
  },
});

wcNodeStorage.extend('wcNodeStorageString', 'String', 'Core', {
  /**
   * @class
   * The base class for all storage nodes. These are nodes that interact with script variables and exchange data.<br>
   * When inheriting, make sure to include 'this._super(parent, pos, type);' at the top of your init function.
   *
   * @constructor wcNodeStorageString
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   * @param {String} [type="String"] - The type name of the node, as displayed on the title bar.
   */
  init: function(parent, pos, type) {
    this._super(parent, pos, type);

    this.createProperty('value', wcPlay.PROPERTY_TYPE.STRING, '', {multiline: true});
  },
});
