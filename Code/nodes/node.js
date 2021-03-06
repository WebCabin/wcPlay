wcPlayNodes.wcClass.extend('wcNode', 'Node', '', {
  /**
   * The foundation class for all nodes.<br>
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init functions.<br>
   * <b>Should be inherited and never constructed directly</b>.
   * @class wcNode
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);
    this.color = '#FFFFFF';
    if (!this.name) {
      this.name = '';
    }

    this._activeTracker = null;
    this._viewportSize = null;

    this.pos = {
      x: pos && pos.x || 0,
      y: pos && pos.y || 0
    };

    this.chain = {
      entry: [],
      exit: []
    };
    this.properties = [];

    this._meta = {
      flash: false,
      flashDelta: 0,
      color: null,
      broken: 0,
      awake: false,
      dirty: true,
      threads: [],
      description: '',
      details: ''
    };
    this._break = false;
    this._log = false;

    this._parent = parent;

    // Give the node its default properties.
    this.createProperty(wcNode.PROPERTY_ENABLED, wcPlay.PROPERTY.TOGGLE, true, {description: 'Disabled nodes will be treated as if they were not there, all connections will be ignored.', input: true, output: true});

    // Add this node to its parent.
    if (this._parent) {
      this._parent.__addNode(this);
    }

    // Assign this node a unique ID if possible.
    var engine = this.engine();
    if (engine) {
      this.id = engine.__nextNodeId();
    }
  },

  /**
   * @member {string} wcNode#name - The title name of this node, editable by the user and shown in the editor view.
   */
  name: '',

  /**
   * Outputs a log message.
   * @function wcNode#log
   * @param {...string} args - The log messages.
   */
  log: function(args) {
    /* eslint-disable no-console */
    args = Array.prototype.slice.call(arguments);
    args.splice(0, 0, 'wcNode:');
    console.log.apply(console, args);
    /* eslint-enable no-console */
  },

  /**
   * Outputs an error message.
   * @function wcNode#error
   * @param {...string} args - The log messages.
   */
  error: function(args) {
    /* eslint-disable no-console */
    args = Array.prototype.slice.call(arguments);
    args.splice(0, 0, 'wcNode ERROR:');
    if (console.error) {
      console.error.apply(console, args);
    } else {
      console.log.apply(console, args);
    }
    /* eslint-enable no-console */
  },

  /**
   * Inherits a new class from this node.
   * @function wcNode#extend
   * @param {string} className - The class name for your node, this should be unique between all global class names.
   * @param {string} displayName - The display name of your node.
   * @param {string} category - The category to display your node in the editor palette.
   * @param {Object} classDef - An object that defines your class with all functions and variables.
   */

  /**
   * Destroys and removes the node.
   * @function wcNode#destroy
   */
  destroy: function() {
    var i = 0, item = null;
    this.onDestroying();

    var engine = this.engine();
    if (engine) {
      engine.endFlowTracker(this._activeTracker);
    }

    // Remove all links.
    for (i = 0; i < this.chain.entry.length; ++i) {
      item = this.chain.entry[i];
      this.disconnectEntry(item.name);
    }

    for (i = 0; i < this.chain.exit.length; ++i) {
      item = this.chain.exit[i];
      this.disconnectExit(item.name);
    }

    for (i = 0; i < this.properties.length; ++i) {
      item = this.properties[i];
      this.disconnectInput(item.name);
      this.disconnectOutput(item.name);
    }

    this.reset();

    // Remove the node from its parent.
    this._parent && this._parent.__removeNode(this);

    this.onDestroyed();
  },

  /**
   * Resets all properties to their initial values.
   * @function wcNode#reset
   */
  reset: function() {
    this.onReset();

    this.resetThreads();
    this._meta.awake = false;
    this._meta.dirty = true;
    this._meta.broken = 0;
    this._meta.paused = false;

    for (var i = 0; i < this.properties.length; ++i) {
      this.properties[i].value = this.properties[i].initialValue;
    }
  },

  /**
   * Resets only latent running threads.
   * @function wcNode#resetThreads
   */
  resetThreads: function() {
    var engine = this.engine();
    for (var i = 0; i < this._meta.threads.length; ++i) {
      var thread = this._meta.threads[i];
      if (typeof thread.id === 'number') {
        // Number values indicate either a timeout or an interval, clear them both.
        clearTimeout(thread.id);
        clearInterval(thread.id);
      } else if (typeof thread.id.__clear === 'function') {
        // wcNodeTimeoutEvent has a __clear method that will clear this timeout.
        thread.id.__clear();
      } else if (typeof thread.id.abort === 'function') {
        // jqXHR has an abort method that will stop the ajax call.
        // Using the built in fetch request will also create the abort method.
        thread.id.abort();
      } else if (typeof thread.id === 'function') {
        // A function callback is simply called.
        this._activeTracker = thread.tracker;
        thread.id();
      }
      engine && engine.endFlowTracker(thread.tracker);
    }
    this._meta.threads = [];
  },

  /**
   * Imports previously [exported]{@link wcNode#export} data to generate this node.
   * @function wcNode#import
   * @param {Object} data - The data to import.
   * @param {Number[]} [idMap] - If supplied, identifies a mapping of old ID's to new ID's, any not found in this list will be unchanged.
   */
  import: function(data, idMap) {
    var i = 0, chain = null, targetNode = null;
    this.onImporting(data, idMap);

    this.id = idMap && idMap[data.id] || data.id;
    this.name = data.name,
    this.color = data.color,
    this.pos.x = data.pos.x,
    this.pos.y = data.pos.y,
    this.debugBreak(data.breakpoint);

    // Restore property values.
    for (i = 0; i < data.properties.length; ++i) {
      this.initialProperty(data.properties[i].name, data.properties[i].initialValue);
      this.property(data.properties[i].name, data.properties[i].value);
    }

    var engine = this.engine();
    if (!engine) {
      return;
    }

    if (this.id > engine.__curNodeId()) {
      engine.__curNodeId(this.id);
    }

    // Re-connect all chains.
    for (i = 0; i < data.entryChains.length; ++i) {
      chain = data.entryChains[i];
      targetNode = engine.nodeById((idMap && idMap[chain.outNodeId]) || chain.outNodeId);
      if (targetNode && this._parent === targetNode._parent) {
        this.connectEntry(chain.inName, targetNode, chain.outName);
      }
    }
    for (i = 0; i < data.exitChains.length; ++i) {
      chain = data.exitChains[i];
      targetNode = engine.nodeById((idMap && idMap[chain.inNodeId]) || chain.inNodeId);
      if (targetNode && this._parent === targetNode._parent) {
        this.connectExit(chain.outName, targetNode, chain.inName);
      }
    }
    for (i = 0; i < data.inputChains.length; ++i) {
      chain = data.inputChains[i];
      targetNode = engine.nodeById((idMap && idMap[chain.outNodeId]) || chain.outNodeId);
      if (targetNode && this._parent === targetNode._parent) {
        this.connectInput(chain.inName, targetNode, chain.outName);
      }
    }
    for (i = 0; i < data.outputChains.length; ++i) {
      chain = data.outputChains[i];
      targetNode = engine.nodeById((idMap && idMap[chain.inNodeId]) || chain.inNodeId);
      if (targetNode && this._parent === targetNode._parent) {
        this.connectOutput(chain.outName, targetNode, chain.inName);
      }
    }
    this._meta.dirty = true;

    this.onImported(data, idMap);
  },

  /**
   * Exports information about this node as well as all connected chain data so it can be [imported]{@link wcNode#import} later.
   * @function wcNode#export
   * @param {boolean} [minimal] - If true, only the most important data should be exported, this means current values and redundant link connections are omitted.
   * @returns {Object} - The exported data for this node.
   */
  export: function(minimal) {
    var data = {
      className: this.className,
      id: this.id,
      name: this.name,
      color: this.color,
      pos: {
        x: this.pos.x,
        y: this.pos.y
      },
      breakpoint: this._break,
      properties: this.listProperties(minimal),
      exitChains: this.listExitChains(),
      outputChains: this.listOutputChains()
    };

    // Include additional info if we aren't minimal
    if (!minimal) {
      data.entryChains = this.listEntryChains();
      data.inputChains = this.listInputChains();
    } else {
      data.entryChains = [];
      data.inputChains = [];
    }

    this.onExport(data, minimal);
    return data;
  },

  /**
   * Retrieves the wcPlay engine that owns this node.
   * @function wcNode#engine
   * @returns {wcPlay|null} - Either the wcPlay engine, or null if it doesn't belong to one.
   */
  engine: function() {
    var play = this._parent;
    while (play && !(play.instanceOf('wcPlay'))) {
      play = play._parent;
    }
    return play || null;
  },

  /**
   * Sets, or Gets this node's enabled state.
   * @function wcNode#enabled
   * @param {boolean} [enabled] - If supplied, will assign a new enabled state.
   * @returns {boolean} - The current enabled state.
   */
  enabled: function(enabled) {
    if (enabled !== undefined) {
      this.property(wcNode.PROPERTY_ENABLED, enabled? true: false);
      this._meta.dirty = true;
    }

    return this.property(wcNode.PROPERTY_ENABLED);
  },

  /**
   * Gets, or Sets whether this node is paused, or any nodes inside if it is a composite.<br>
   * When pausing, all {@link wcNode#setTimeout} events are also paused so they don't jump ahead of the debugger.
   * @function wcNode#paused
   * @param {boolean} paused - If supplied, will assign a new paused state.
   * @returns {boolean} - Whether this, or inner nodes, are paused.
   */
  paused: function(paused) {
    var i = 0;
    if (paused !== undefined) {
      // Pausing the node.
      if (paused) {
        for (i = 0; i < this._meta.threads.length; ++i) {
          if (typeof this._meta.threads[i].id.pause === 'function') {
            // wcNodeTimeoutEvent has a pause method.
            this._meta.threads[i].id.pause();
          }
        }
        this._meta.paused = true;
      } else {
        for (i = 0; i < this._meta.threads.length; ++i) {
          if (typeof this._meta.threads[i].id.resume === 'function') {
            // wcNodeTimeoutEvent has a resume method.
            this._meta.threads[i].id.resume();
          }
        }

        this._meta.paused = false;
      }
    }
    return this._meta.paused;
  },

  /**
   * Retrieves whether the node has been broken via breakpoint in the debugger tool.
   * @function wcNode#isBroken
   * @returns {boolean} - Whether the script is 'broken' (paused).
   */
  isBroken: function() {
    return this._meta.broken > 0;
  },

  /**
   * Sets, or Gets this node's debug log state.
   * @function wcNode#debugLog
   * @param {boolean} [enabled] - If supplied, will assign a new debug log state.
   * @returns {boolean} - The current debug log state.
   */
  debugLog: function(enabled) {
    if (enabled !== undefined) {
      this._log = enabled? true: false;
    }

    var engine = this.engine();
    return (!engine || engine.silent())? false: this._log;
  },

  /**
   * Sets, or Gets this node's debug pause state.
   * @function wcNode#debugBreak
   * @param {boolean} [enabled] - If supplied, will assign a new debug pause state.
   * @returns {boolean} - The current debug pause state.
   */
  debugBreak: function(enabled) {
    if (enabled !== undefined) {
      this._break = enabled? true: false;
    }

    var engine = this.engine();
    return (engine && engine.debugging() && this._break);
  },

  /**
   * Gets, or Sets the description for this node. This is usually shown as a tooltip for the node within the editor tool.
   * @function wcNode#description
   * @param {string} [description] - If supplied, will assign a new description for this node.
   * @returns {string} - The current description of this node.
   */
  description: function(description) {
    if (description !== undefined) {
      this._meta.description = description;
    }

    return this._meta.description;
  },

  /**
   * Gets, or Sets the very verbose description details for this node. This is usually shown as a popup dialog to further explain the user of the node.
   * @function wcNode#details
   * @param {string} [details] - If supplied, will assign a new description details for this node.
   * @returns {string} - The current description details of this node.
   */
  details: function(details) {
    if (details !== undefined) {
      this._meta.details = details;
    }

    return this._meta.details;
  },

  /**
   * Determines whether a search value matches this node.
   * @function wcNode#search
   * @param {string} search - The search value.
   * @returns {boolean} - True if the search matches this node.
   */
  search: function(search) {
    if (this.type.toLowerCase().indexOf(search) > -1 ||
        this.name.toLowerCase().indexOf(search) > -1) {
      return true;
    }

    return false;
  },

  /**
   * Utility function for setting a timed event in a way that is compatible with live debugging in the editor tool.
   * @function wcNode#setTimeout
   * @param {Function} callback - A callback function to call when the time has elapsed. As an added convenience, 'this' will be the node instance.
   * @param {number} delay - The time delay, in milliseconds, to wait before calling the callback function.
   * @example
   * onActivated: function(name) {
   *   this._super(name);
   *
   *   // Now set a timeout to wait for 'Milliseconds' amount of time.
   *   var delay = this.property('milliseconds');
   *
   *   // Start a timeout event using the node's built in timeout handler.
   *   this.setTimeout(function() {
   *     this.activateExit('out');
   *   }, delay);
   * }
   */
  setTimeout: function(callback, delay) {
    var timer = new wcNodeTimeoutEvent(this, callback, delay);
    this.beginThread(timer);
    if (!this._meta.paused) {
      timer.resume();
    }
  },

  /** <br>
   * Utility function for setting an interval update in a way that is compatible with live debugging in the editor tool.
   * <b>Note:</b> You can call {@link wcNode#resetThreads} if you want to cancel any existing intervals running on your node.
   * @function wcNode#setInterval
   * @param {Function} callback - A callback function to call each time the time interval has elapsed. As an added convenience, 'this' will be the node instance.
   * @param {number} interval - The time interval, in milliseconds, between each call to callback.
   * @example
   * onActivated: function(name) {
   *   var interval = this.property('milliseconds');
   *   this.resetThreads();
   *
   *   this.setInterval(function() {
   *     this.activateExit('out');
   *   }, interval);
   * }
   */
  setInterval: function(callback, interval) {
    function __onInterval() {
      callback && callback.call(this);

      // Really just call the set timeout, over and over.
      this.setTimeout(__onInterval, interval);
    }

    this.setTimeout(__onInterval, interval);
  },

  /**
   * Utility function for performing an AJAX request in a way that is compatible with live debugging in the editor tool.<br>
   * The success, error, and complete callback functions are changed so that the 'this' object is the node instance, or the custom context if you provided a context in your options.<br>
   * Note: This method specifically uses JQuery for the ajax operation, so you will need to include that library if you intend to use this.
   * @function wcNode#ajax
   * @param {string} [url] - Option URL to send the request, if not supplied, it should be provided in the options parameter.
   * @param {Object} [options] - The options for the request, as described here: {@link http://api.jquery.com/jquery.ajax/}.
   * @returns {jqXHR|function} - The jQuery XHR object generated by the ajax request. If an older version of jQuery is used, you will receive a function instead.
   */
  ajax: function(url, options) {
    if (typeof url === 'object') {
      options = url;
    }

    if (!options) {
      options = {};
    }

    if (typeof url === 'string') {
      options.url = url;
    }

    var cancelled = false;
    var self = this;
    var context = options.context || this;
    function __wrapCallbackComplete(cb) {
      return function() {
        setTimeout(function() {
          self.finishThread(xhr);
        }, 0);
        __wrapCallback(cb)();
      };
    }
    function __wrapCallback(cb) {
      return function() {
        if (!cancelled) {
          cb && cb.apply(context, arguments);
        }
      };
    }

    options.success  = __wrapCallback(options.success);
    options.error    = __wrapCallback(options.error);
    options.complete = __wrapCallbackComplete(options.complete);

    var xhr = $.ajax(options);

    // Failsafe in case we are running an older version of jQuery which does not yet return the jqXHR object.
    if (xhr === undefined) {
      xhr = function() {
        cancelled = true;
      };
    }
    return this.beginThread(xhr);
  },

  /**
   * Utility function for performing a fetch request in a way that is compatible with live debugging in the editor tool.<br>
   * The success, error, and complete callback functions are changed so that the 'this' object is the node instance, or the custom context if you provided a context in your options.<br>
   * Note: This method specifically uses browsers fetch which is an experimental technology and not supported by all browsers unless a polyfill is used.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
   * @function wcNode#fetch
   * @param {string} url - URL to send the request.
   * @param {Object} [options] - The options for the request, as described here: {@link https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch}.
   * @returns {Promise.<Object>} - The promise object that carries the response. This will throw if the response was not a success.
   */
  fetch: function(url, options) {
    var cancelled = false;
    var self = this;
    var promise = null;
    try {
      promise = fetch(url, options).catch(function(err) {
        // Something bad happened before we got a response! Perhaps invalid options?
        setTimeout(function() {
          self.finishThread(promise);
        }, 0);
        throw err;
      }).then(function(result) {
        // Finish the thread.
        setTimeout(function() {
          self.finishThread(promise);
        }, 0);

        // Check the status of the response.
        if (!cancelled) {
          if (result.status >= 200 && result.status < 300) {
            return result.text();
          } else {
            var err = new Error(result.statusText);
            err.response = result;
            throw err;
          }
        } else {
          throw new Error('Fetch operation was cancelled.');
        }
      });
    } catch (err) {
      promise = new Promise(function(resolve, reject) {
        reject(err);
      });
    }
    // Provide my own 'abort' method to call in the
    // case we want to cancel the request.
    // Promises can not really be cancelled, but I can
    // at least stop the chain from reaching the caller.
    promise.abort = function() {
      cancelled = true;
    };
    return this.beginThread(promise);
  },

  /**
   * If your node takes time to process, call this to begin a thread that will keep the node 'active' until you close the thread with {@link wcNode#finishThread}.<br>
   * This ensures that, even if a node is executed more than once at the same time, each 'thread' is kept track of individually.<br>
   * <b>Note:</b> This is not necessary if your node executes immediately without a timeout.
   * <b>Also Note:</b> If using a setTimeout event, it is recommended that you use {@link wcNode#setTimeout} instead.
   * @function wcNode#beginThread
   * @param {Number|Function} id - The thread ID, generated by a call to setTimeout, setInterval, or a function to call when we want to force cancel the job.
   * @returns {number} - The id that was given {@link wcNode#finishThread}.
   * @example
   *  onActivated: function(name) {
   *    this._super(name);
   *
   *    // Always fire the 'out' link immediately.
   *    this.activateExit('out');
   *
   *    // Now set a timeout to wait for 'Milliseconds' amount of time.
   *    var self = this;
   *    var delay = this.property('milliseconds');
   *
   *    // Start a new thread that will keep the node alive until we are finished.
   *    var thread = this.beginThread(setTimeout(function() {
   *      // Once the time has completed, fire the 'Finished' link and finish our thread.
   *      self.activateExit('finished');
   *      self.finishThread(thread);
   *    }, delay));
   *  }
   */
  beginThread: function(id) {
    var thread = {
      id: id,
      tracker: this._activeTracker
    };

    this._meta.threads.push(thread);
    this._meta.flash = true;
    this._meta.awake = true;
    return id;
  },

  /**
   * Finishes a previously started thread from {@link wcNode#beginThread}.<br>
   * <b>Note:</b> If you do not properly finish a thread that was generated, your node will remain forever in its active state.
   * @function wcNode#finishThread
   * @param {Number|Function} id - The thread ID to close, returned to you by the call to {@link wcNode#beginThread}.
   */
  finishThread: function(id) {
    var index = this._meta.threads.findIndex(function(thread) {
      return thread.id === id;
    });

    if (index > -1) {
      var tracker = this._meta.threads[index].tracker;

      this._meta.threads.splice(index, 1);

      if (!this._meta.threads.length) {
        this._meta.awake = false;
      }

      // Finish any trackers.
      var engine = this.engine();
      setTimeout(function() {
        engine && engine.endFlowTracker(tracker);
      });
      this._activeTracker = tracker;
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
      this._meta.dirty = true;
    }

    return {x: this.pos.x, y: this.pos.y};
  },

  /**
   * Creates a new entry link on the node.
   * @function wcNode#createEntry
   * @param {string} name - The name of the entry link.
   * @param {string} [description] - An optional description to display as a tooltip for this link.
   * @returns {boolean} - Fails if the entry link name already exists.
   */
  createEntry: function(name, description) {
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
        broken: 0,
        color: '#000000',
        description: description
      }
    });
    this._meta.dirty = true;
    return true;
  },

  /**
   * Creates a new exit link on the node.
   * @function wcNode#createExit
   * @param {string} name - The name of the exit link.
   * @param {string} [description] - An optional description to display as a tooltip for this link.
   * @returns {boolean} - Fails if the exit link name already exists.
   */
  createExit: function(name, description) {
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
        broken: 0,
        color: '#000000',
        description: description
      }
    });
    this._meta.dirty = true;
    return true;
  },

  /**
   * Creates a new property.
   * @function wcNode#createProperty
   * @param {string} name - The name of the property.
   * @param {wcPlay.PROPERTY} type - The type of property.
   * @param {Object} [initialValue] - A initial value for this property when the script starts.
   * @param {Object} [options] - Additional options for this property, see {@link wcPlay.PROPERTY}.
   * @returns {boolean} - Fails if the property does not exist.
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
        broken: 0,
        color: '#000000'
      },
      outputMeta: {
        flash: false,
        flashDelta: 0,
        broken: 0,
        color: '#000000'
      }
    });
    this._meta.dirty = true;
    return true;
  },

  /**
   * Removes an entry link from the node.
   * @function wcNode#removeEntry
   * @param {string} name - The name of the entry link to remove.
   * @returns {boolean} - Fails if the link does not exist.
   */
  removeEntry: function(name) {
    for (var i = 0; i < this.chain.entry.length; ++i) {
      if (this.chain.entry[i].name === name) {
        if (this.disconnectEntry(name) === wcNode.CONNECT_RESULT.SUCCESS) {
          this.chain.entry.splice(i, 1);
          this._meta.dirty = true;
          return true;
        }
      }
    }
    return false;
  },

  /**
   * Removes an exit link from the node.
   * @function wcNode#removeExit
   * @param {string} name - The name of the exit link to remove.
   * @returns {boolean} - Fails if the link does not exist.
   */
  removeExit: function(name) {
    for (var i = 0; i < this.chain.exit.length; ++i) {
      if (this.chain.exit[i].name === name) {
        if (this.disconnectExit(name) === wcNode.CONNECT_RESULT.SUCCESS) {
          this.chain.exit.splice(i, 1);
          this._meta.dirty = true;
          return true;
        }
      }
    }
    return false;
  },

  /**
   * Removes a property from the node.
   * @function wcNode#removeProperty
   * @param {string} name - The name of the property to remove.
   * @returns {boolean} - Fails if the property does not exist.
   */
  removeProperty: function(name) {
    for (var i = 0; i < this.properties.length; ++i) {
      if (this.properties[i].name === name) {
        if (this.disconnectInput(name) === wcNode.CONNECT_RESULT.SUCCESS &&
            this.disconnectOutput(name) === wcNode.CONNECT_RESULT.SUCCESS) {
          this.properties.splice(i, 1);
          this._meta.dirty = true;
          return true;
        }
      }
    }
    return false;
  },

  /**
   * Renames an entry link on this node while preserving all connected chains.
   * @function wcNode#renameEntry
   * @param {string} oldName - The old (current) name of the link.
   * @param {string} newName - The new name of the link.
   * @returns {boolean} - Fails if the new name already exists, or the old name does not.
   */
  renameEntry: function(oldName, newName) {
    if (!this.createEntry(newName)) {
      return false;
    }

    if (this.createEntry(oldName)) {
      this.removeEntry(oldName);
      this.removeEntry(newName);
      return false;
    }

    var chains = this.listEntryChains(oldName);
    this.removeEntry(oldName);

    var engine = this.engine();
    if (engine) {
      for (var i = 0; i < chains.length; ++i) {
        this.connectEntry(newName, engine.nodeById(chains[i].outNodeId), chains[i].outName);
      }
    }
    this._meta.dirty = true;
    return true;
  },

  /**
   * Renames an exit link on this node while preserving all connected chains.
   * @function wcNode#renameExit
   * @param {string} oldName - The old (current) name of the link.
   * @param {string} newName - The new name of the link.
   * @returns {boolean} - Fails if the new name already exists, or the old name does not.
   */
  renameExit: function(oldName, newName) {
    if (!this.createExit(newName)) {
      return false;
    }

    if (this.createExit(oldName)) {
      this.removeExit(oldName);
      this.removeExit(newName);
      return false;
    }

    var chains = this.listExitChains(oldName);
    this.removeExit(oldName);

    var engine = this.engine();
    if (engine) {
      for (var i = 0; i < chains.length; ++i) {
        this.connectExit(newName, engine.nodeById(chains[i].inNodeId), chains[i].inName);
      }
    }
    this._meta.dirty = true;
    return true;
  },

  /**
   * Renames a property on this node while preserving all connected chains.
   * @function wcNode#renameProperty
   * @param {string} oldName - The old (current) name of the link.
   * @param {string} newName - The new name of the link.
   * @returns {boolean} - Fails if the new name already exists, or the old name does not.
   */
  renameProperty: function(oldName, newName) {
    var prop = null, i = 0;
    for (i = 0; i < this.properties.length; ++i) {
      if (this.properties[i].name === oldName) {
        prop = this.properties[i];
      }
      if (this.properties[i].name === newName) {
        return false;
      }
    }

    if (!prop) {
      return false;
    }

    this.createProperty(newName, prop.type, prop.initialValue, prop.options);
    this.property(newName, prop.value, false);

    var inputChains = this.listInputChains(oldName);
    var outputChains= this.listOutputChains(oldName);
    this.removeProperty(oldName);

    var engine = this.engine();
    if (engine) {
      for (i = 0; i < inputChains.length; ++i) {
        this.connectInput(newName, engine.nodeById(inputChains[i].outNodeId), inputChains[i].outName);
      }
      for (i = 0; i < outputChains.length; ++i) {
        this.connectOutput(newName, engine.nodeById(outputChains[i].inNodeId), outputChains[i].inName);
      }
    }
    this._meta.dirty = true;
    return true;
  },

  /**
   * Connects an entry link on this node to an exit link of another.
   * @function wcNode#connectEntry
   * @param {string} name - The name of the entry link on this node.
   * @param {wcNode} targetNode - The target node to link to.
   * @param {string} targetName - The name of the target node's exit link to link to.
   * @returns {wcNode.CONNECT_RESULT} - The result.
   */
  connectEntry: function(name, targetNode, targetName) {
    if (!(targetNode && targetNode.instanceOf('wcNode'))) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    var myLink = null;
    var targetLink = null;
    var i = 0;

    // Find my link.
    for (i = 0; i < this.chain.entry.length; ++i) {
      if (this.chain.entry[i].name === name) {
        myLink = this.chain.entry[i];
        break;
      }
    }

    // Find the target link.
    for (i = 0; i < targetNode.chain.exit.length; ++i) {
      if (targetNode.chain.exit[i].name === targetName) {
        targetLink = targetNode.chain.exit[i];
        break;
      }
    }

    if (!myLink || !targetLink) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Make sure the connection doesn't already exist.
    for (i = 0; i < myLink.links.length; ++i) {
      if (myLink.links[i].node === targetNode && myLink.links[i].name === targetLink.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
    }

    for (i = 0; i < targetLink.links.length; ++i) {
      if (targetLink.links[i].node === this && targetLink.links[i].name === myLink.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
    }

    // Now make the connection.
    myLink.links.push({
      name: targetLink.name,
      node: targetNode
    });

    targetLink.links.push({
      name: myLink.name,
      node: this
    });

    // Notify of the connection change.
    this.onConnect(true, myLink.name, wcNode.LINK_TYPE.ENTRY, targetNode, targetLink.name, wcNode.LINK_TYPE.EXIT);
    targetNode.onConnect(true, targetLink.name, wcNode.LINK_TYPE.EXIT, this, myLink.name, wcNode.LINK_TYPE.ENTRY);
    return wcNode.CONNECT_RESULT.SUCCESS;
  },

  /**
   * Connects an exit link on this node to an entry link of another.
   * @function wcNode#connectExit
   * @param {string} name - The name of the exit link on this node.
   * @param {wcNode} targetNode - The target node to link to.
   * @param {string} targetName - The name of the target node's entry link to link to.
   * @returns {wcNode.CONNECT_RESULT} - The result.
   */
  connectExit: function(name, targetNode, targetName) {
    if (!(targetNode && targetNode.instanceOf('wcNode'))) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    var myLink = null;
    var targetLink = null;
    var i = 0;

    // Find my link.
    for (i = 0; i < this.chain.exit.length; ++i) {
      if (this.chain.exit[i].name === name) {
        myLink = this.chain.exit[i];
        break;
      }
    }

    // Find the target link.
    for (i = 0; i < targetNode.chain.entry.length; ++i) {
      if (targetNode.chain.entry[i].name === targetName) {
        targetLink = targetNode.chain.entry[i];
        break;
      }
    }

    if (!myLink || !targetLink) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Make sure the connection doesn't already exist.
    for (i = 0; i < myLink.links.length; ++i) {
      if (myLink.links[i].node === targetNode && myLink.links[i].name === targetLink.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
    }

    for (i = 0; i < targetLink.links.length; ++i) {
      if (targetLink.links[i].node === this && targetLink.links[i].name === myLink.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
    }

    // Now make the connection.
    myLink.links.push({
      name: targetLink.name,
      node: targetNode
    });

    targetLink.links.push({
      name: myLink.name,
      node: this
    });

    // Notify of the connection change.
    this.onConnect(true, myLink.name, wcNode.LINK_TYPE.EXIT, targetNode, targetLink.name, wcNode.LINK_TYPE.ENTRY);
    targetNode.onConnect(true, targetLink.name, wcNode.LINK_TYPE.ENTRY, this, myLink.name, wcNode.LINK_TYPE.EXIT);
    return wcNode.CONNECT_RESULT.SUCCESS;
  },

  /**
   * Connects a property input link to a target property output link.
   * @function wcNode#connectInput
   * @param {string} name - The name of the property being connected.
   * @param {wcNode} targetNode - The target node to connect with.
   * @param {string} targetName - The name of the property on the target node to connect with.
   * @returns {wcNode.CONNECT_RESULT} - The result.
   */
  connectInput: function(name, targetNode, targetName) {
    if (!(targetNode && targetNode.instanceOf('wcNode'))) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    var myProperty = null;
    var targetProperty = null;
    var i = 0;

    // Find my property.
    for (i = 0; i < this.properties.length; ++i) {
      if (this.properties[i].name === name) {
        myProperty = this.properties[i];
        break;
      }
    }

    // Find the target property.
    for (i = 0; i < targetNode.properties.length; ++i) {
      if (targetNode.properties[i].name === targetName) {
        targetProperty = targetNode.properties[i];
        break;
      }
    }

    if (!myProperty || !targetProperty) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Make sure the connection doesn't already exist.
    for (i = 0; i < myProperty.inputs.length; ++i) {
      if (myProperty.inputs[i].node === targetNode && myProperty.inputs[i].name === targetProperty.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
    }

    for (i = 0; i < targetProperty.outputs.length; ++i) {
      if (targetProperty.outputs[i].node === this && targetProperty.outputs[i].name === myProperty.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
    }

    // Ask if this node can connect with the other.
    if (myProperty.options.inputCondition &&
        !myProperty.options.inputCondition.call(this, targetNode, targetProperty.name)) {
      return wcNode.CONNECT_RESULT.REFUSED;
    }

    // Ask if the other node can connect with this.
    if (targetProperty.options.outputCondition &&
        !targetProperty.options.outputCondition.call(targetNode, this, myProperty.name)) {
      return wcNode.CONNECT_RESULT.REFUSED;
    }

    // Now make the connection.
    myProperty.inputs.push({
      name: targetProperty.name,
      node: targetNode
    });

    targetProperty.outputs.push({
      name: myProperty.name,
      node: this
    });

    // Notify of the connection change.
    this.onConnect(true, myProperty.name, wcNode.LINK_TYPE.INPUT, targetNode, targetProperty.name, wcNode.LINK_TYPE.OUTPUT);
    targetNode.onConnect(true, targetProperty.name, wcNode.LINK_TYPE.OUTPUT, this, myProperty.name, wcNode.LINK_TYPE.INPUT);
    return wcNode.CONNECT_RESULT.SUCCESS;
  },

  /**
   * Connects a property output link to a target property input link.
   * @function wcNode#connectOutput
   * @param {string} name - The name of the property being connected.
   * @param {wcNode} targetNode - The target node to connect with.
   * @param {string} targetName - The name of the property on the target node to connect with.
   * @returns {wcNode.CONNECT_RESULT} - The result.
   */
  connectOutput: function(name, targetNode, targetName) {
    if (!(targetNode && targetNode.instanceOf('wcNode'))) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    var myProperty = null;
    var targetProperty = null;
    var i = 0;

    // Find my property.
    for (i = 0; i < this.properties.length; ++i) {
      if (this.properties[i].name === name) {
        myProperty = this.properties[i];
        break;
      }
    }

    // Find the target property.
    for (i = 0; i < targetNode.properties.length; ++i) {
      if (targetNode.properties[i].name === targetName) {
        targetProperty = targetNode.properties[i];
        break;
      }
    }

    if (!myProperty || !targetProperty) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Make sure the connection doesn't already exist.
    for (i = 0; i < myProperty.outputs.length; ++i) {
      if (myProperty.outputs[i].node === targetNode && myProperty.outputs[i].name === targetProperty.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
    }

    for (i = 0; i < targetProperty.inputs.length; ++i) {
      if (targetProperty.inputs[i].node === this && targetProperty.inputs[i].name === myProperty.name) {
        return wcNode.CONNECT_RESULT.ALREADY_CONNECTED;
      }
    }

    // Ask if this node can connect with the other.
    if (myProperty.options.outputCondition &&
        !myProperty.options.outputCondition.call(this, targetNode, targetProperty.name)) {
      return wcNode.CONNECT_RESULT.REFUSED;
    }

    // Ask if the other node can connect with this.
    if (targetProperty.options.inputCondition &&
        !targetProperty.options.inputCondition.call(targetNode, this, myProperty.name)) {
      return wcNode.CONNECT_RESULT.REFUSED;
    }

    // Now make the connection.
    myProperty.outputs.push({
      name: targetProperty.name,
      node: targetNode
    });

    targetProperty.inputs.push({
      name: myProperty.name,
      node: this
    });

    // Notify of the connection change.
    this.onConnect(true, myProperty.name, wcNode.LINK_TYPE.OUTPUT, targetNode, targetProperty.name, wcNode.LINK_TYPE.INPUT);
    targetNode.onConnect(true, targetProperty.name, wcNode.LINK_TYPE.INPUT, this, myProperty.name, wcNode.LINK_TYPE.OUTPUT);
    return wcNode.CONNECT_RESULT.SUCCESS;
  },

  /**
   * Disconnects a chain, or all chains, from an entry link.
   * @function wcNode#disconnectEntry
   * @param {string} name - The name of the entry link.
   * @param {wcNode} [targetNode] - If supplied, will only remove links to the specified target node.
   * @param {string} [targetName] - If supplied, will only remove links to the specified named exit links.
   * @returns {wcNode.CONNECT_RESULT} - The result of the disconnection.
   */
  disconnectEntry: function(name, targetNode, targetName) {
    var i = 0;
    var myLink = null;

    // Find my entry link.
    for (i = 0; i < this.chain.entry.length; ++i) {
      if (this.chain.entry[i].name === name) {
        myLink = this.chain.entry[i];
        break;
      }
    }

    if (!myLink) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Iterate through all chained links and disconnect as necessary.
    for (i = 0; i < myLink.links.length; ++i) {
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
   * @param {string} name - The name of the exit link.
   * @param {wcNode} [targetNode] - If supplied, will only remove links to the specified target node.
   * @param {string} [targetName] - If supplied, will only remove links to the specified named entry links.
   * @returns {wcNode.CONNECT_RESULT} - The result of the disconnection.
   */
  disconnectExit: function(name, targetNode, targetName) {
    // Find my exit link.
    var myLink = null, i = 0;
    for (i = 0; i < this.chain.exit.length; ++i) {
      if (this.chain.exit[i].name === name) {
        myLink = this.chain.exit[i];
        break;
      }
    }

    if (!myLink) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Iterate through all chained links and disconnect as necessary.
    for (i = 0; i < myLink.links.length; ++i) {
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
   * @param {string} name - The name of the property.
   * @param {wcNode} [targetNode] - If supplied, will only remove links to the specified target node.
   * @param {string} [targetName] - If supplied, will only remove links to the specified named property output links.
   * @returns {wcNode.CONNECT_RESULT} - The result of the disconnection.
   */
  disconnectInput: function(name, targetNode, targetName) {
    // Find my property.
    var myProperty = null, i = 0;
    for (i = 0; i < this.properties.length; ++i) {
      if (this.properties[i].name === name) {
        myProperty = this.properties[i];
        break;
      }
    }

    if (!myProperty) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Iterate through all chained links and disconnect as necessary.
    for (i = 0; i < myProperty.inputs.length; ++i) {
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
   * @param {string} name - The name of the property.
   * @param {wcNode} [targetNode] - If supplied, will only remove links to the specified target node.
   * @param {string} [targetName] - If supplied, will only remove links to the specified named property input links.
   * @returns {wcNode.CONNECT_RESULT} - The result of the disconnection.
   */
  disconnectOutput: function(name, targetNode, targetName) {
    // Find my property.
    var myProperty = null, i = 0;
    for (i = 0; i < this.properties.length; ++i) {
      if (this.properties[i].name === name) {
        myProperty = this.properties[i];
        break;
      }
    }

    if (!myProperty) {
      return wcNode.CONNECT_RESULT.NOT_FOUND;
    }

    // Iterate through all chained links and disconnect as necessary.
    for (i = 0; i < myProperty.outputs.length; ++i) {
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
   * Activates an entry link and activates this node.
   * @function wcNode#activateEntry
   * @param {string} name - The name of the entry link to trigger.
   * @param {wcNode} fromNode - The node triggering the entry.
   * @param {string} fromName - The Exit link name.
   * @param {wcPlay~FlowTracker} [tracker] - Optional flow tracker.
   * @returns {boolean} - Fails if the entry link does not exist.
   */
  activateEntry: function(name, fromNode, fromName, tracker) {
    var engine = this.engine();
    for (var i = 0; i < this.chain.entry.length; ++i) {
      if (this.chain.entry[i].name === name) {
        // Always queue the trigger so execution is not immediate.
        if (engine) {
          engine.queueNodeEntry(this, this.chain.entry[i].name, fromNode, fromName, false, tracker);
        }
        return true;
      }
    }

    if (engine) {
      // Timeout one frame before attempting to close this tracker.
      setTimeout(function() {
        engine.endFlowTracker(tracker);
      }, 0);
    }
    return false;
  },

  /**
   * Activates an exit link.
   * @function wcNode#activateExit
   * @param {string} name - The name of the exit link to trigger.
   * @param {Function} [done] - An optional callback to call when the entire exit chain has finished.
   * @returns {boolean} - Fails if the exit link does not exist or this node is disabled.
   */
  activateExit: function(name, done) {
    if (!this.enabled()) {
      // Node not enabled, unable to process.
      done && done();
      return false;
    }

    if (this.debugLog()) {
      this.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" Triggered Exit link "' + name + '"');
    }

    var engine = this.engine();
    for (var i = 0; i < this.chain.exit.length; ++i) {
      var exitLink = this.chain.exit[i];
      if (exitLink.name === name) {
        var queued = false;
        var activeTracker = this._activeTracker;

        if (typeof done === 'function') {
          activeTracker = engine.beginFlowTracker(this, activeTracker, done);
          done = null;
        }

        // Activate all entry links chained to this exit.
        for (var a = 0; a < exitLink.links.length; ++a) {
          if (exitLink.links[a].node) {
            queued = true;
            exitLink.links[a].node.activateEntry(exitLink.links[a].name, this, name, engine.beginFlowTracker(exitLink.links[a].node, activeTracker));
          }
        }

        // If we did not queue another node to activate, we should manually flash this link.
        if (!queued) {
          this.chain.exit[i].meta.flash = true;
          this._meta.flash = true;
          // Timeout one frame before attempting to close this tracker.
          setTimeout(function() {
            engine.endFlowTracker(activeTracker);
          }, 0);
          done && done();
        }
        return true;
      }
    }

    // No link exists with the name provided.
    done && done();
    return false;
  },

  /**
   * Gets the type of a property.
   * @function wcNode#propertyType
   * @param {string} name - The name of the property.
   * @returns {wcPlay.PROPERTY|null} - Returns null if the property was not found.
   */
  propertyType: function(name) {
    for (var i = 0; i < this.properties.length; ++i) {
      var prop = this.properties[i];
      if (prop.name === name) {
        return prop.type;
      }
    }
  },

  /**
   * Gets the options assigned to a property, you may change attributes from here.
   * @function wcNode#propertyOptions
   * @param {string} name - The name of the property.
   * @returns {Object|null} - The options object associated with the property, or null if the property does not exist.
   */
  propertyOptions: function(name) {
    for (var i = 0; i < this.properties.length; ++i) {
      var prop = this.properties[i];
      if (prop.name === name) {
        // Assume the user will change options for this property, so make it dirty.
        this._meta.dirty = true;
        return prop.options;
      }
    }
    return null;
  },

  /**
   * Gets, or Sets the value of a property.
   * @function wcNode#property
   * @param {string} name - The name of the property.
   * @param {Object} [value] - If supplied, will assign a new value to the property.
   * @param {boolean} [forceOrSilent] - If supplied, true will force the change event to be sent to all chained properties even if this value didn't change while false will force the change to not be chained.
   * @param {boolean} [forceUpstream] - Contrary to normal operation, if this is true then the property change will be sent backwards, from this property's input link to any outputs connected to it.
   * @param {external:wcUndoManager} [undo] - If the change is triggered by the user and undo management is enabled, this will be the undo manager.
   * @returns {Object|undefined} - The value of the property, or undefined if not found.
   */
  property: function(name, value, forceOrSilent, forceUpstream, undo) {
    var i = 0, a = 0;
    for (i = 0; i < this.properties.length; ++i) {
      var prop = this.properties[i];
      if (prop.name === name) {
        if (value !== undefined) {
          // Retrieve the current value of the property
          var oldValue = prop.value;

          // Apply restrictions to the property based on its type and options supplied.
          switch (prop.type) {
            case wcPlay.PROPERTY.TOGGLE:
              value = value? true: false;
              break;
            case wcPlay.PROPERTY.NUMBER:
              var min = (prop.options.min !== undefined? prop.options.min: -Infinity);
              var max = (prop.options.max !== undefined? prop.options.max:  Infinity);
              var num = Math.min(max, Math.max(min, parseInt(value)));
              if (isNaN(num)) {
                value = Math.min(max, Math.max(min, 0));
              }
              break;
            case wcPlay.PROPERTY.STRING:
              var len = prop.options.maxlength;
              if (len) {
                value = value.toString().substring(0, len);
              }
              break;
            case wcPlay.PROPERTY.SELECT:
              var items = prop.options.items;
              if (typeof items === 'function') {
                items = items.call(this);
              }
              var found = false;
              if (Array.isArray(items)) {
                for (a = 0; a < items.length; ++a) {
                  if (typeof items[a] === 'object') {
                    if (items[a].value == value) {
                      found = true;
                      break;
                    }
                  } else {
                    if (items[a] == value) {
                      found = true;
                      break;
                    }
                  }
                }
              }

              if (!found) {
                if (!prop.options.hasOwnProperty('allowNone') || prop.options.allowNone) {
                  if (prop.options.hasOwnProperty('noneValue')) {
                    value = prop.options.noneValue;
                  } else {
                    value = '';
                  }
                }
              }
              break;
          }

          var engine = this.engine();
          prop.outputMeta.flash = true;
          if (this.debugBreak() || (engine && engine.stepping())) {
            prop.outputMeta.broken++;
          }

          // Notify about to change event.
          if (forceOrSilent || prop.value !== value) {
            value = this.onPropertyChanging(prop.name, oldValue, value, undo) || value;
          }

          if (forceOrSilent || prop.value !== value) {
            this._meta.dirty = true;
            prop.value = value;

            // Notify that the property has changed.
            this.onPropertyChanged(prop.name, oldValue, value, undo);

            // Linked properties must sync with their initial values as well.
            if (prop.options.linked) {
              this.initialProperty(prop.name, value, undefined, undefined, undo);
            }

            // Now follow any output links and assign the new value to them as well.
            if (forceOrSilent === undefined || forceOrSilent) {
              for (a = 0; a < prop.outputs.length; ++a) {
                if (prop.outputs[a].node) {
                  if (undo) {
                    // Triggered by a user through the editor, this change should propagate immediately.
                    prop.outputs[a].node.property(prop.outputs[a].name, value, undefined, undefined, undo);
                  } else {
                    prop.outputs[a].node.activateProperty(prop.outputs[a].name, value, undefined);
                  }
                }
              }
            }

            // Now propagate the change upstream if necessary.
            if (forceUpstream) {
              for (a = 0; a < prop.inputs.length; ++a) {
                if (prop.inputs[a].node) {
                  if (undo) {
                    // Triggered by a user through the editor, this change should propagate immediately.
                    prop.outputs[a].node.property(prop.outputs[a].name, value, true, true, undo);
                  } else {
                    prop.inputs[a].node.activateProperty(prop.inputs[a].name, value, true);
                  }
                }
              }
            }
          }
        }

        return this.onPropertyGet(prop.name) || prop.value;
      }
    }
  },

  /**
   * Gets, or Sets the initial value of a property.
   * @function wcNode#initialProperty
   * @param {string} name - The name of the property.
   * @param {Object} [value] - If supplied, will assign a new default value to the property.
   * @param {boolean} [forceOrSilent] - If supplied, true will force the change event to be sent to all chained properties even if this value didn't change while false will force the change to not be chained.
   * @param {boolean} [forceUpstream] - Contrary to normal operation, if this is true then the property change will be sent backwards, from this property's input link to any outputs connected to it.
   * @param {external:wcUndoManager} [undo] - If the change is triggered by the user and undo management is enabled, this will be the undo manager.
   * @returns {Object|undefined} - The default value of the property, or undefined if not found.
   */
  initialProperty: function(name, value, forceOrSilent, forceUpstream, undo) {
    var i = 0, a = 0;
    for (i = 0; i < this.properties.length; ++i) {
      var prop = this.properties[i];
      if (prop.name === name) {
        if (value !== undefined) {
          value = this.onInitialPropertyChanging(prop.name, prop.initialValue, value, undo) || value;
          if (prop.value == prop.initialValue) {
            this.property(name, value);
          }
          var oldValue = prop.initialValue;

          if (forceOrSilent || prop.initialValue !== value) {
            this._meta.dirty = true;
            prop.initialValue = value;

            // Notify that the property has changed.
            this.onInitialPropertyChanged(prop.name, oldValue, value, undo);

            // Linked properties must sync with their initial values as well.
            if (prop.options.linked) {
              this.property(prop.name, value);
            }

            prop.outputMeta.flash = true;
            var engine = this.engine();
            if (this.debugBreak() || (engine && engine.stepping())) {
              prop.outputMeta.broken++;
            }

            // Now follow any output links and assign the new value to them as well.
            if (forceOrSilent === undefined || forceOrSilent) {
              for (a = 0; a < prop.outputs.length; ++a) {
                prop.outputs[a].node && prop.outputs[a].node.initialProperty(prop.outputs[a].name, value, undefined, false, undo);
              }
            }

            // Now propagate the change upstream if necessary.
            if (forceUpstream) {
              for (a = 0; a < prop.inputs.length; ++a) {
                prop.inputs[a].node && prop.inputs[a].node.initialProperty(prop.inputs[a].name, value, undefined, true, undo);
              }
            }
          }
        }

        return this.onInitialPropertyGet(prop.name) || prop.initialValue;
      }
    }
  },

  /**
   * Activates a property that is about to be changed by the output of another property.
   * @function wcNode#activateProperty
   * @param {string} name - The name of the property.
   * @param {Object} value - The new value of the property.
   * @param {boolean} [upstream] - If true, the activation was from a property in its output, and we are propagating in reverse.
   */
  activateProperty: function(name, value, upstream) {
    var engine = this.engine();
    if (engine) {
      engine.queueNodeProperty(this, name, value, upstream);
    }

    for (var i = 0; i < this.properties.length; ++i) {
      var prop = this.properties[i];
      if (prop.name === name) {
        prop.inputMeta.flash = true;
        if (this.debugBreak() || (engine && engine.stepping())) {
          prop.inputMeta.broken++;
        }
      }
    }
  },

  /**
   * Retrieves a list of all chains connected to an entry link on this node.
   * @function wcNode#listEntryChains
   * @param {string} [name] - The entry link, if omitted, all link chains are retrieved.
   * @param {wcNode[]} [ignoreNodes] - If supplied, will ignore all chains connected to a node in this list.
   * @returns {wcNode~ChainData[]} - A list of all chains connected to this link, if the link was not found, an empty list is returned.
   */
  listEntryChains: function(name, ignoreNodes) {
    var result = [];
    for (var i = 0; i < this.chain.entry.length; ++i) {
      if (!name || this.chain.entry[i].name === name) {
        var myLink = this.chain.entry[i];
        for (var a = 0; a < myLink.links.length; ++a) {
          if (!ignoreNodes || ignoreNodes.indexOf(myLink.links[a].node) === -1) {
            result.push({
              inName: myLink.name,
              inNodeId: this.id,
              outName: myLink.links[a].name,
              outNodeId: myLink.links[a].node.id
            });
          }
        }
      }
    }

    return result;
  },

  /**
   * Retrieves a list of all chains connected to an exit link on this node.
   * @function wcNode#listExitChains
   * @param {string} [name] - The exit link, if omitted, all link chains are retrieved.
   * @param {wcNode[]} [ignoreNodes] - If supplied, will ignore all chains connected to a node in this list.
   * @returns {wcNode~ChainData[]} - A list of all chains connected to this link, if the link was not found, an empty list is returned.
   */
  listExitChains: function(name, ignoreNodes) {
    var result = [];
    for (var i = 0; i < this.chain.exit.length; ++i) {
      if (!name || this.chain.exit[i].name === name) {
        var myLink = this.chain.exit[i];
        for (var a = 0; a < myLink.links.length; ++a) {
          if (!ignoreNodes || ignoreNodes.indexOf(myLink.links[a].node) === -1) {
            result.push({
              inName: myLink.links[a].name,
              inNodeId: myLink.links[a].node.id,
              outName: myLink.name,
              outNodeId: this.id
            });
          }
        }
      }
    }

    return result;
  },

  /**
   * Retrieves a list of all chains connected to a property input link on this node.
   * @function wcNode#listInputChains
   * @param {string} [name] - The property input link, if omitted, all link chains are retrieved.
   * @param {wcNode[]} [ignoreNodes] - If supplied, will ignore all chains connected to a node in this list.
   * @returns {wcNode~ChainData[]} - A list of all chains connected to this link, if the link was not found, an empty list is returned.
   */
  listInputChains: function(name, ignoreNodes) {
    var result = [];
    for (var i = 0; i < this.properties.length; ++i) {
      if (!name || this.properties[i].name === name) {
        var myProp = this.properties[i];
        for (var a = 0; a < myProp.inputs.length; ++a) {
          if (!ignoreNodes || ignoreNodes.indexOf(myProp.inputs[a].node) === -1) {
            result.push({
              inName: myProp.name,
              inNodeId: this.id,
              outName: myProp.inputs[a].name,
              outNodeId: myProp.inputs[a].node.id
            });
          }
        }
      }
    }

    return result;
  },

  /**
   * Retrieves a list of all chains connected to a property output link on this node.
   * @function wcNode#listOutputChains
   * @param {string} [name] - The property output link, if omitted, all link chains are retrieved.
   * @param {wcNode[]} [ignoreNodes] - If supplied, will ignore all chains connected to a node in this list.
   * @returns {wcNode~ChainData[]} - A list of all chains connected to this link, if the link was not found, an empty list is returned.
   */
  listOutputChains: function(name, ignoreNodes) {
    var result = [];
    for (var i = 0; i < this.properties.length; ++i) {
      if (!name || this.properties[i].name === name) {
        var myProp = this.properties[i];
        for (var a = 0; a < myProp.outputs.length; ++a) {
          if (!ignoreNodes || ignoreNodes.indexOf(myProp.outputs[a].node) === -1) {
            result.push({
              inName: myProp.outputs[a].name,
              inNodeId: myProp.outputs[a].node.id,
              outName: myProp.name,
              outNodeId: this.id
            });
          }
        }
      }
    }

    return result;
  },

  /**
   * Retrieves a list of all properties and their values for this node.
   * @function wcNode#listProperties
   * @param {boolean} [minimal] - If true, only the minimal data is listed, this means current values will be omitted.
   * @returns {wcNode~PropertyData[]} - A list of all property data.
   */
  listProperties: function(minimal) {
    var result = [];
    for (var i = 0; i < this.properties.length; ++i) {
      var myProp = this.properties[i];
      var data = {
        name: myProp.name,
        type: myProp.type,
        initialValue: myProp.initialValue,
        options: myProp.options
      };

      if (!minimal) {
        data.value = myProp.value;
      }

      if (typeof myProp.options.exportValue === 'function') {
        var val = myProp.options.exportValue(myProp.initialValue);
        if (val !== undefined) {
          data.initialValue = val;
        }
      }

      result.push(data);
    }

    return result;
  },

  /**
   * Sets a size for the custom viewport.<br>
   * The custom viewport is a rectangular area embedded into the node's visual display in which you can 'draw' whatever you wish. It appears below the title text and above properties.
   * @function wcNode#viewportSize
   * @param {number} [width] - If supplied, assigns the width of the viewport desired. Use 0 or null to disable the viewport.
   * @param {number} [height] - If supplied, assigns the height of the viewport desired. Use 0 or null to disable the viewport.
   * @returns {wcPlay~Coordinates} - The current size of the viewport.
   * @see wcNode#onViewportDraw
   */
  viewportSize: function(width, height) {
    if (width !== undefined && height !== undefined) {
      this._meta.dirty = true;
      if (!width || !height) {
        this._viewportSize = null;
      } else {
        this._viewportSize = {
          x: width,
          y: height
        };
      }
    }

    return {x: this._viewportSize.x, y: this._viewportSize.y};
  },

  /**
   * Event that is called when it is time to draw the contents of your custom viewport. It is up to you to stay within the [wcNode.viewportSize]{@link wcNode#viewportSize} you've specified.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onViewportDraw
   * @param {external:Canvas~Context} context - The canvas context to draw on, coordinates 0,0 will be the top left corner of your viewport. It is up to you to stay within the [viewport bounds]{@link wcNode#viewportSize} you have assigned.
   * @param {boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   * @see wcNode#viewportSize
   */
  onViewportDraw: function(context, readOnly) {
    this._super(context, readOnly);
  },

  /**
   * Event that is called when the mouse has entered the viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onViewportMouseEnter
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @param {boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   */
  onViewportMouseEnter: function(event, pos, readOnly) {
    this._super(event, pos, readOnly);
    if (this.debugLog()) {
      this.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" mouse entered custom viewport!');
    }
  },

  /**
   * Event that is called when the mouse has left the viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onViewportMouseLeave
   * @param {Object} event - The original jquery mouse event.
   * @param {boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   */
  onViewportMouseLeave: function(event, readOnly) {
    this._super(event, readOnly);
    if (this.debugLog()) {
      this.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" mouse left custom viewport!');
    }
  },

  /**
   * Event that is called when the mouse button is pressed over your viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onViewportMouseDown
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @param {boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   * @returns {Boolean|undefined} - Return true if you want to disable node dragging during mouse down within your viewport.
   */
  onViewportMouseDown: function(event, pos, readOnly) {
    this._super(event, pos, readOnly);
  },

  /**
   * Event that is called when the mouse button is released over your viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onViewportMouseUp
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @param {boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   */
  onViewportMouseUp: function(event, pos, readOnly) {
    this._super(event, pos, readOnly);
  },

  /**
   * Event that is called when the mouse has moved over your viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onViewportMouseMove
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @param {boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   */
  onViewportMouseMove: function(event, pos, readOnly) {
    this._super(event, pos, readOnly);
  },

  /**
   * Event that is called when the mouse wheel is used over your viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onViewportMouseWheel
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @param {number} scrollDelta - The scroll amount and direction.
   * @param {boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   */
  onViewportMouseWheel: function(event, pos, scrollDelta, readOnly) {
    this._super(event, pos, scrollDelta, readOnly);
  },

  /**
   * Event that is called when the mouse button is pressed and released in the same spot over your viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onViewportMouseClick
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @param {boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   */
  onViewportMouseClick: function(event, pos, readOnly) {
    this._super(event, pos, readOnly);
  },

  /**
   * Event that is called when the mouse button is double clicked in the same spot over your viewport area.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onViewportMouseDoubleClick
   * @param {Object} event - The original jquery mouse event.
   * @param {wcPlay~Coordinates} pos - The position of the mouse relative to the viewport area (top left corner is 0,0).
   * @param {boolean} readOnly - The editors readonly status, when true, you should not allow changes to the node.
   * @returns {Boolean|undefined} - Return true if you want to disable node auto-collapse when double clicking.
   */
  onViewportMouseDoubleClick: function(event, pos, readOnly) {
    this._super(event, pos, readOnly);
  },

  /**
   * Event that is called when a connection has been made.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onConnect
   * @param {boolean} isConnecting - True if a connection is being made, false if it is a disconnection.
   * @param {string} name - The name of the link being connected to.
   * @param {wcNode.LINK_TYPE} type - The link's type.
   * @param {wcNode} targetNode - The target node being connected to.
   * @param {string} targetName - The link name on the target node being connected to.
   * @param {wcNode.LINK_TYPE} targetType - The target link's type.
   */
  onConnect: function(isConnecting, name, type, targetNode, targetName, targetType) {
    this._super(isConnecting, name, type, targetNode, targetName, targetType);
    // If we are connecting one of our property outputs to another property, alert them and send your value to them.
    if (isConnecting && type === wcNode.LINK_TYPE.OUTPUT) {
      targetNode.activateProperty(targetName, this.property(name));
      targetNode.initialProperty(targetName, this.initialProperty(name));
    }
  },

  /**
   * Event that is called as soon as the Play script has started.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onStart
   */
  onStart: function() {
    this._super();
    if (this.debugLog()) {
      this.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" started!');
    }
  },

  /**
   * Event that is called as soon as the Play script has stopped.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onStop
   */
  onStop: function() {
    this._super();
    this._meta.dirty = true;

    if (this.debugLog()) {
      this.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" stopped!');
    }
  },

  /**
   * Event that is called when this node is about to be drawn.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onDraw
   */
  onDraw: function() {
    this._super();
  },

  /**
   * Event that is called when an entry link has been activated.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onActivated
   * @param {string} name - The name of the entry link triggered.
   */
  onActivated: function(name) {
    this._super(name);
    if (this.debugLog()) {
      this.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" Triggered Entry link "' + name + '"');
    }
  },

  /**
   * Event that is called when the node is about to change its position.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onMoving
   * @param {wcPlay~Coordinates} oldPos - The current position of the node.
   * @param {wcPlay~Coordinates} newPos - The new position to move the node.
   * @returns {wcPlay~Coordinates|undefined} - Return the new position of the node (usually newPos unless you are restricting the position). If no value is returned, newPos is assumed.
   */
  onMoving: function(oldPos, newPos) {
    this._super(oldPos, newPos);
  },

  /**
   * Event that is called after the node has changed its position.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onMoved
   * @param {wcPlay~Coordinates} oldPos - The old position of the node.
   * @param {wcPlay~Coordinates} newPos - The new position of the node.
   */
  onMoved: function(oldPos, newPos) {
    this._super(oldPos, newPos);
  },

  /**
   * Event that is called when the node's name is about to be edited by the user.<br>
   * You can use this to suggest a list of names that the user can conveniently choose from.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @see http://caniuse.com/#search=datalist
   * @function wcNode#onNameEditSuggestion
   * @returns {wcNode~SelectItem[]|String[]|undefined} - An option list of options to display for the user as suggestions.
   */
  onNameEditSuggestion: function() {
    this._super();
  },

  /**
   * Event that is called when the name of this node is about to change.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onNameChanging
   * @param {string} oldName - The current name.
   * @param {string} newName - The new name.
   * @returns {string|undefined} - Return the new value of the name (usually newValue unless you are restricting the name). If no value is returned, newValue is assumed.
   */
  onNameChanging: function(oldName, newName) {
    this._super(oldName, newName);
  },

  /**
   * Event that is called when the name of this node has changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onNameChanged
   * @param {string} oldName - The current name.
   * @param {string} newName - The new name.
   * @param {external:wcUndoManager} [undo] - If the change is triggered by the user and undo management is enabled, this will be the undo manager. Note: The value change is already recorded, use this only if you have other things to record.
   */
  onNameChanged: function(oldName, newName, undo) {
    this._super(oldName, newName, undo);
    this._meta.dirty = true;
  },

  /**
   * Event that is called when a property is about to be changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onPropertyChanging
   * @param {string} name - The name of the property.
   * @param {Object} oldValue - The current value of the property.
   * @param {Object} newValue - The new, proposed, value of the property.
   * @param {external:wcUndoManager} [undo] - If the change is triggered by the user and undo management is enabled, this will be the undo manager. Note: The value change is already recorded, use this only if you have other things to record.
   * @returns {Object} - Return the new value of the property (usually newValue unless you are proposing restrictions). If no value is returned, newValue is assumed.
   */
  onPropertyChanging: function(name, oldValue, newValue, undo) {
    this._super(name, oldValue, newValue, undo);
    if (this.debugLog()) {
      this.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" Changing Property "' + name + '" from "' + oldValue + '" to "' + newValue + '"');
    }
  },

  /**
   * Event that is called when a property has changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onPropertyChanged
   * @param {string} name - The name of the property.
   * @param {Object} oldValue - The old value of the property.
   * @param {Object} newValue - The new value of the property.
   * @param {external:wcUndoManager} [undo] - If the change is triggered by the user and undo management is enabled, this will be the undo manager. Note: The value change is already recorded, use this only if you have other things to record.
   */
  onPropertyChanged: function(name, oldValue, newValue, undo) {
    this._super(name, oldValue, newValue, undo);
    if (this.debugLog()) {
      this.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" Changed Property "' + name + '" from "' + oldValue + '" to "' + newValue + '"');
    }
  },

  /**
   * Event that is called when the property is being asked its value, before the value is actually retrieved.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onPropertyGet
   * @param {string} name - The name of the property.
   * @returns {Object|undefined} - If a value is returned, that value is what will be retrieved from the get.
   */
  onPropertyGet: function(name) {
    this._super(name);
    // if (this.debugLog()) {
    //   this.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" Requested Property "' + name + '"');
    // }
  },

  /**
   * Event that is called when a property initial value is about to be changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onInitialPropertyChanging
   * @param {string} name - The name of the property.
   * @param {Object} oldValue - The current value of the property.
   * @param {Object} newValue - The new, proposed, value of the property.
   * @param {external:wcUndoManager} [undo] - If the change is triggered by the user and undo management is enabled, this will be the undo manager. Note: The value change is already recorded, use this only if you have other things to record.
   * @returns {Object} - Return the new value of the property (usually newValue unless you are proposing restrictions). If no value is returned, newValue is assumed.
   */
  onInitialPropertyChanging: function(name, oldValue, newValue, undo) {
    this._super(name, oldValue, newValue, undo);
    if (this.debugLog()) {
      this.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" Changing Initial Property "' + name + '" from "' + oldValue + '" to "' + newValue + '"');
    }
  },

  /**
   * Event that is called when a property initial value has changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onInitialPropertyChanged
   * @param {string} name - The name of the property.
   * @param {Object} oldValue - The old value of the property.
   * @param {Object} newValue - The new value of the property.
   * @param {external:wcUndoManager} [undo] - If the change is triggered by the user and undo management is enabled, this will be the undo manager. Note: The value change is already recorded, use this only if you have other things to record.
   */
  onInitialPropertyChanged: function(name, oldValue, newValue, undo) {
    this._super(name, oldValue, newValue, undo);
    if (this.debugLog()) {
      this.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" Changed Initial Property "' + name + '" from "' + oldValue + '" to "' + newValue + '"');
    }
  },

  /**
   * Event that is called when the property initial value is being asked its value, before the value is actually retrieved.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onInitialPropertyGet
   * @param {string} name - The name of the property.
   * @returns {Object|undefined} - If a value is returned, that value is what will be retrieved from the get.
   */
  onInitialPropertyGet: function(name) {
    this._super(name);
    // if (this.debugLog()) {
    //   this.log('DEBUG: Node "' + this.category + '.' + this.type + (this.name? ' (' + this.name + ')': '') + '" Requested Initial Property "' + name + '"');
    // }
  },

  /**
   * Event that is called when a global property value has changed.
   * Overload this in inherited nodes.<br>
   * <b>Note:</b> Do not call 'this._super(..)' for this function, as the parent does not implement it.
   * @function wcNode#onGlobalPropertyChanged
   * @param {string} name - The name of the global property.
   * @param {Object} oldValue - The old value of the global property.
   * @param {Object} newValue - The new value of the global property.
   */
  onGlobalPropertyChanged: function(name, oldValue, newValue) {
    this._super(name, oldValue, newValue);
  },

  /**
   * Event that is called when a global property has been removed.
   * Overload this in inherited nodes.<br>
   * <b>Note:</b> Do not call 'this._super(..)' for this function, as the parent does not implement it.
   * @function wcNode#onGlobalPropertyRemoved
   * @param {string} name - The name of the global property.
   */
  onGlobalPropertyRemoved: function(name) {
    this._super(name);
  },

  /**
   * Event that is called when a global property has been renamed.
   * Overload this in inherited nodes.<br>
   * <b>Note:</b> Do not call 'this._super(..)' for this function, as the parent does not implement it.
   * @function wcNode#onGlobalPropertyRenamed
   * @param {string} oldName - The old name of the global property.
   * @param {string} newName - The new name of the global property.
   */
  onGlobalPropertyRenamed: function(oldName, newName) {
    this._super(oldName, newName);
  },

  /**
   * Event that is called when a global property initial value has changed.
   * Overload this in inherited nodes.<br>
   * <b>Note:</b> Do not call 'this._super(..)' for this function, as the parent does not implement it.
   * @function wcNode#onGlobalInitialPropertyChanged
   * @param {string} name - The name of the global property.
   * @param {Object} oldValue - The old value of the global property.
   * @param {Object} newValue - The new value of the global property.
   */
  onGlobalInitialPropertyChanged: function(name, oldValue, newValue) {
    this._super(name, oldValue, newValue);
  },

  /**
   * Event that is called when the node is about to be imported. This is your chance to prepare the node for import, or possibly modify the import data.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onImporting
   * @param {Object} data - The data being imported.
   * @param {Number[]} [idMap] - If supplied, identifies a mapping of old ID's to new ID's, any not found in this list will be unchanged.
   */
  onImporting: function(data, idMap) {
    this._super(data, idMap);
  },

  /**
   * Event that is called after the node has imported.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onImported
   * @param {Object} data - The data being imported.
   * @param {Number[]} [idMap] - If supplied, identifies a mapping of old ID's to new ID's, any not found in this list will be unchanged.
   */
  onImported: function(data, idMap) {
    this._super(data, idMap);
  },

  /**
   * Event that is called when the node is being exported, after the export data has been configured.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onExport
   * @param {Object} data - The export data for this node.
   * @param {boolean} [minimal] - If true, only the most important data should be exported, this means current values and redundant link connections are omitted.
   */
  onExport: function(data, minimal) {
    this._super(data, minimal);
  },

  /**
   * Event that is called when the node is about to be reset.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onReset
   */
  onReset: function() {
    this._super();
  },

  /**
   * Event that is called when the node is about to be destroyed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onDestroying
   */
  onDestroying: function() {
    this._super();
  },

  /**
   * Event that is called after the node has been destroyed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNode#onDestroyed
   */
  onDestroyed: function() {
    this._super();
  }
});

window.wcNode = {};

/**
 * The type of node link.
 * @enum {string}
 */
wcNode.LINK_TYPE = {
  ENTRY: 'entry',
  EXIT: 'exit',
  INPUT: 'input',
  OUTPUT: 'output'
};

/**
 * The connection result.
 * @enum {string}
 */
wcNode.CONNECT_RESULT = {
  NOT_FOUND: 'not_found',
  ALREADY_CONNECTED: 'already_connected',
  REFUSED: 'refused',
  SUCCESS: 'success'
};


/**
 * Enabled property name.
 * @typedef {string}
 */
wcNode.PROPERTY_ENABLED = 'enabled';
