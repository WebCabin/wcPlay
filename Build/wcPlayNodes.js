wcPlayNodes.wcNodeEntry.extend('wcNodeEntryStart', 'Start', 'Automatic', {
  /**
   * An entry node that fires as soon as the script [starts]{@link wcPlay#start}.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * @class wcNodeEntryStart
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description('When the script starts, this will activate immediately and only once.');
  },

  /**
   * Event that is called as soon as the Play script has started.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeEntryStart#onStart
   */
  onStart: function() {
    this._super();
    this.onActivated();
  }
});

wcPlayNodes.wcNodeEntry.extend('wcNodeEntryUpdate', 'Update', 'Automatic', {
  /**
   * An entry node that fires continuously as soon as the flow chain has finished.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * @class wcNodeEntryUpdate
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description('Once the script starts, this will activate continuously any time attached nodes have finished.');
  },

  /**
   * Overloading the default onActivated event handler so we can make it immediately trigger our exit link if our conditions are met.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeEntryUpdate#onActivated
   * @param {string} name - The name of the entry link triggered.
   */
  onActivated: function(name) {
    this._super(name);
    this.resetThreads();

    this.activateExit('out', function() {
      this.onActivated();
    });
  },

  /**
   * Event that is called as soon as the Play script has started.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeEntryUpdate#onStart
   */
  onStart: function() {
    this._super();

    this.onActivated();
  },

  /**
   * Event that is called when a property has changed.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeEntryUpdate#onPropertyChanged
   * @param {string} name - The name of the property.
   * @param {Object} oldValue - The old value of the property.
   * @param {Object} newValue - The new value of the property.
   */
  onPropertyChanged: function(name, oldValue, newValue) {
    this._super(name, oldValue, newValue);

    if (name === 'milliseconds') {
      this.resetThreads();
      this.onActivated();
    }
  }
});

wcPlayNodes.wcNodeEntry.extend('wcNodeEntryInterval', 'Interval', 'Automatic', {
  /**
   * An entry node that fires continuously on a regular interval.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * @class wcNodeEntryInterval
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description('Once the script starts, this will activate continuously on a time interval defined by the milliseconds property.');

    this.createProperty('milliseconds', wcPlay.PROPERTY.NUMBER, 1000, {description: 'The time, in milliseconds, per update.', input: true});
  },

  /**
   * Overloading the default onActivated event handler so we can make it trigger our exit link on an interval.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeEntryInterval#onActivated
   * @param {string} name - The name of the entry link triggered.
   */
  onActivated: function(name) {
    this._super(name);
    this.resetThreads();

    var interval = this.property('milliseconds');
    this.setInterval(function() {
      this.activateExit('out');
    }, interval);
  },

  /**
   * Event that is called as soon as the Play script has started.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeEntryInterval#onStart
   */
  onStart: function() {
    this._super();

    this.onActivated();
  },

  /**
   * Event that is called when a property has changed.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeEntryInterval#onPropertyChanged
   * @param {string} name - The name of the property.
   * @param {Object} oldValue - The old value of the property.
   * @param {Object} newValue - The new value of the property.
   */
  onPropertyChanged: function(name, oldValue, newValue) {
    this._super(name, oldValue, newValue);

    if (name === 'milliseconds') {
      this.onActivated();
    }
  }
});

wcPlayNodes.wcNodeEntry.extend('wcNodeEntryRemote', 'Remote Event', 'Flow Control', {
  /**
   * An entry node that fires when a [Call Remote Event Node]{@link wcNodeEntryCallRemote} of the same name is activated.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * @class wcNodeEntryRemote
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description('An entry node that fires when a Call Remote Event Node of the same name is activated.');
    this.details('This node uses it\'s Title Name value as an identifier that links it with any Call Remote Event Nodes of the same name. Whenever any Call Remote Event Node of the same name is activated, this Node will become active as well. If multiple Remote Nodes exist with the same name, they will all be called in parallel.');
  }
});

wcPlayNodes.wcNodeEntry.extend('wcNodeEntryCallRemote', 'Call Remote Event', 'Flow Control', {
  /**
   * An entry node that fires when a [Call Remote Event Node]{@link wcNodeEntryCallRemote} of the same name is activated.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * @class wcNodeEntryCallRemote
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description('An entry node that activates all Remote Event Nodes of the same name.');
    this.details('This node uses it\'s Title Name value as an identifier that links it with any Remote Event Nodes of the same name. Whenever this Node is activated, All Remote Event Nodes of the same name will also become active as well.');

    this.createEntry('in');
    this.removeExit('out');

    this.createProperty('local', wcPlay.PROPERTY.TOGGLE, true, {description: 'If true, only matching Remote Event Nodes that are within, or nested within, the same Composite Node or scope will be activated.'});
  },

  /**
   * Event that is called when an entry link has been activated.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeEntryCallRemote#onActivated
   * @param {string} name - The name of the entry link triggered.
   */
  onActivated: function(name) {
    this._super(name);

    var engine = this.engine();
    var scope = engine;
    if (this.property('local')) {
      scope = this._parent;
    }

    var remoteNodes = scope.nodesByClassName('wcNodeEntryRemote');
    for (var i = 0; i < remoteNodes.length; ++i) {
      if (remoteNodes[i].name === this.name) {
        engine.queueNodeEntry(remoteNodes[i], 'in', this, 'out', false, engine.beginFlowTracker(this, this._activeTracker));
      }
    }
  }
});

wcPlayNodes.wcNodeProcess.extend('wcNodeProcessDelay', 'Delay', 'Flow Control', {
  /**
   * Waits for a specified amount of time before continuing the flow chain.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * @class wcNodeProcessDelay
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description('Waits for a specified amount of time before continuing the flow chain.');

    this.createProperty('milliseconds', wcPlay.PROPERTY.NUMBER, 1000, {description: 'The time delay, in milliseconds, to wait before firing the "out" Exit link.', input: true});
  },

  /**
   * Event that is called when an entry link has been activated.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessDelay#onActivated
   * @param {string} name - The name of the entry link triggered.
   */
  onActivated: function(name) {
    this._super(name);

    // Now set a timeout to wait for 'Milliseconds' amount of time.
    var delay = this.property('milliseconds');

    // Start a timeout event using the node's built in timeout handler.
    this.setTimeout(function() {
      this.activateExit('out');
    }, delay);
  }
});

wcPlayNodes.wcNodeProcess.extend('wcNodeProcessOperation', 'Operation', 'Data Manipulation', {
  /**
   * Performs a simple math operation on two values.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * @class wcNodeProcessOperation
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description('Performs a simple math operation on two values.');
    this.details('Activate the entry link of the operation you want to perform, either an addition, subtraction, multiplication, or division. The operation will then be performed using valueA and valueB, the result will be output to the result property.');

    // Remove our default entry.
    this.removeEntry('in');

    // Create an input link per operation type.
    this.createEntry('add', 'valueA + valueB = result');
    this.createEntry('sub', 'valueA - valueB = result');
    this.createEntry('mul', 'valueA * valueB = result');
    this.createEntry('div', 'valueA / valueB = result');

    // Create our two operator values.
    this.createProperty('valueA', wcPlay.PROPERTY.NUMBER, 0, {description: 'Left hand value for the operation.', input: true});
    this.createProperty('valueB', wcPlay.PROPERTY.NUMBER, 0, {description: 'Right hand value for the operation.', input: true});
    this.createProperty('result', wcPlay.PROPERTY.NUMBER, 0, {description: 'The result of the operation.', output: true});
  },

  /**
   * Event that is called when an entry link has been activated.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessOperation#onActivated
   * @param {string} name - The name of the entry link triggered.
   */
  onActivated: function(name) {
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

    this.property('result', result, true);
    this.activateExit('out');
  }
});

wcPlayNodes.wcNodeProcess.extend('wcNodeProcessStrCat', 'String Concat', 'Data Manipulation', {
  /**
   * Formats a templated string by replacing template commands with the value of other properties.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * @class wcNodeProcessStrCat
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description('Concatenates two string values.');
    this.details('This takes the string of valueA and appends valueB to it, the result is stored in the result property.');

    // Create our two operator values.
    this.createProperty('valueA', wcPlay.PROPERTY.STRING, '', {description: 'The left side string to join.', input: true});
    this.createProperty('valueB', wcPlay.PROPERTY.STRING, '', {description: 'The right side string to join.', input: true});
    this.createProperty('result', wcPlay.PROPERTY.STRING, '', {description: 'The concatenated result.', output: true});
  },

  /**
   * Event that is called when an entry link has been activated.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessStrCat#onActivated
   * @param {string} name - The name of the entry link triggered.
   */
  onActivated: function(name) {
    this._super(name);

    this.property('result', this.property('valueA').toString() + this.property('valueB'));
    this.activateExit('out');
  }
});

wcPlayNodes.wcNodeProcess.extend('wcNodeProcessAJAX', 'AJAX', 'Data Retrieval', {
  /**
   * Performs an AJAX request.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * @class wcNodeProcessAJAX
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description('Performs an AJAX request.');
    this.details('Once activated, a request will be sent to the given URL.  Either the success or failure exit links will activate once the operation is completed and the result will be assigned to the result property.');

    this.removeExit('out');
    this.createExit('success');
    this.createExit('failure');

    this.createProperty('type', wcPlay.PROPERTY.SELECT, 'GET', {items: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'], description: 'The AJAX method to perform.', input: true, allowNone: false});
    this.createProperty('url', wcPlay.PROPERTY.STRING, 'example.com', {description: 'The URL to send the request.', input: true});
    this.createProperty('data', wcPlay.PROPERTY.STRING, 'foo=bar&bar=foo', {description: 'The data to send with the request. This can be in query string form, or any object that $.ajax supports as the data parameter.', input: true});
    this.createProperty('result', wcPlay.PROPERTY.STRING, '', {description: 'The result of the ajax request, if successful.', output: true});
  },

  /**
   * Event that is called when an entry link has been activated.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessAJAX#onActivated
   * @param {string} name - The name of the entry link triggered.
   */
  onActivated: function(name) {
    this._super(name);

    var type = this.property('type');
    var url  = this.property('url');
    var data = this.property('data');

    if (!url) {
      this.activateExit('failure');
      return;
    }

    this.ajax({
      type: type,
      url: url,
      data: data,
      success: function(result) {
        this.property('result', result);
        this.activateExit('success');
      },
      error: function(XHR, status, msg) {
        this.property('result', msg);
        this.activateExit('failure');
      }
    });
  }
});

wcPlayNodes.wcNodeProcess.extend('wcNodeProcessFetch', 'Fetch Request', 'Data Retrieval', {
  /**
   * Performs a fetch request.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
   * @class wcNodeProcessFetch
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description('Performs a fetch request.');
    this.details('Once activated, a request will be sent to the given URL. Either the success or failure exit links will activate once the operation is completed and the result will be assigned to the result property.');

    this.removeExit('out');
    this.createExit('success');
    this.createExit('failure');

    this.createProperty('type', wcPlay.PROPERTY.SELECT, 'GET', {items: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'], description: 'The request method to perform.', allowNone: false});
    this.createProperty('url', wcPlay.PROPERTY.STRING, 'http://www.example.com', {description: 'The URL to send the request.', input: true});
    this.createProperty('headers', wcPlay.PROPERTY.SELECT, 'text/plain', {items: ['text/plain'], description: 'The expected response data type (for now, only support text/plain).', allowNone: false});
    this.createProperty('mode', wcPlay.PROPERTY.SELECT, 'cors', {items: ['cors', 'no-cors', 'same-origin'], description: 'The mode.', allowNone: false});
    this.createProperty('credentials', wcPlay.PROPERTY.SELECT, 'omit', {items: ['omit', 'same-origins'], description: 'Should cookies go with the request?', allowNone: false});
    this.createProperty('redirect', wcPlay.PROPERTY.SELECT, 'follow', {items: ['follow', 'error', 'manual'], description: 'What happens if the request redirects you?', allowNone: false});
    this.createProperty('integrity', wcPlay.PROPERTY.STRING, '', {description: 'Subresource integrity value.'});
    this.createProperty('cache', wcPlay.PROPERTY.SELECT, 'default', {items: ['default', 'reload', 'no-cache'], description: 'Cache mode.', allowNone: false});
    this.createProperty('data', wcPlay.PROPERTY.STRING, '{}', {description: 'The data to send with the request. This should be in the form of an object or JSON string.', input: true, multiline: true});
    this.createProperty('result', wcPlay.PROPERTY.STRING, '', {description: 'The result of the fetch request.', output: true, readonly: true, multiline: true});
  },

  /**
   * Event that is called when an entry link has been activated.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessFetch#onActivated
   * @param {string} name - The name of the entry link triggered.
   */
  onActivated: function(name) {
    this._super(name);

    var type = this.property('type');
    var url  = this.property('url');
    var headers = this.property('headers');
    var mode = this.property('mode');
    var credentials = this.property('credentials');
    var redirect = this.property('redirect');
    var integrity = this.property('integrity');
    var cache = this.property('cache');
    var data = this.property('data');

    if (!url) {
      this.activateExit('failure');
      return;
    }

    var self = this;
    var id = this.fetch(url, {
      method: type,
      headers: {'Content-Type': headers},
      mode: mode,
      credentials: credentials,
      redirect: redirect,
      integrity: integrity,
      cache: cache,
      data: JSON.stringify(data)
    });
    id.then(function(result) {
      self.property('result', result);
      self.activateExit('success');
    }).catch(function(err) {
      self.property('result', err.message);
      self.activateExit('failure');
    });
  }
});

wcPlayNodes.wcNodeProcess.extend('wcNodeProcessConsoleLog', 'Console Log', 'Debugging', {
  /**
   * For debugging purposes, will print out a message into the console log the moment it is activated. [Silent mode]{@link wcPlay~Options} will silence this node.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * @class wcNodeProcessConsoleLog
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description('For debugging purposes, will print out a message into the console log when activated (only if silent mode is not on).');

    // Create the message property so we know what to output in the log.
    this.createProperty('message', wcPlay.PROPERTY.STRING, 'msg', {description: 'The message that will appear in the console log.', input: true});
  },

  /**
   * Event that is called when an entry link has been activated.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessConsoleLog#onActivated
   * @param {string} name - The name of the entry link triggered.
   */
  onActivated: function(name) {
    this._super(name);

    // Always trigger the out immediately.
    this.activateExit('out');

    // Cancel the log in silent mode.
    var engine = this.engine();
    if (!engine || engine.silent()) {
      return;
    }

    var msg = this.property('message');
    console.log(msg);
  }
});

wcPlayNodes.wcNodeProcess.extend('wcNodeProcessAlert', 'Alert', 'Debugging', {
  /**
   * For debugging purposes, will popup an alert box with a message the moment it is activated. [Silent mode]{@link wcPlay~Options} will silence this node.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * @class wcNodeProcessAlert
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description('For debugging purposes, will popup an alert box with a message when activated (only if silent mode is not on).');

    // Create the message property so we know what to output in the log.
    this.createProperty('message', wcPlay.PROPERTY.STRING, 'Alert message.', {multiline: true, description: 'The message that will appear in the alert box.', input: true});
  },

  /**
   * Event that is called when an entry link has been activated.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessAlert#onActivated
   * @param {string} name - The name of the entry link triggered.
   */
  onActivated: function(name) {
    this._super(name);

    // Always trigger the out immediately.
    this.activateExit('out');

    // Cancel the log in silent mode.
    var engine = this.engine();
    if (!engine || engine.silent()) {
      return;
    }

    var msg = this.property('message');
    alert(msg);
  }
});

wcPlayNodes.wcNodeStorage.extend('wcNodeStorageGlobal', 'Global Value', 'Global', {
  /**
   * References a global property on the script.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * @class wcNodeStorageGlobal
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);
    this.color = '#77CC77';

    this.description('References a global property on the script.');
    this.details('The title name for this node becomes the name of the global property it references. Duplicate Global Nodes with the same name will all reference the same value.');

    this.createProperty('value', wcPlay.PROPERTY.STRING, '', {description: 'The current value of the global property (Use the title to identify the property).', input: true, output: true});
  },

  /**
   * Event that is called when the node's name is about to be edited by the user.
   * <br>You can use this to suggest a list of names that the user can conveniently choose from.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @see http://caniuse.com/#search=datalist
   * @function wcNodeStorageGlobal#onNameEditSuggestion
   * @returns {wcNode~SelectItem[]|string[]|undefined} - An option list of options to display for the user as suggestions.
   */
  onNameEditSuggestion: function() {
    this._super();
    var engine = this.engine();
    if (engine) {
      var props = engine.listProperties();
      var suggestions = [];
      for (var i = 0; i < props.length; ++i) {
        suggestions.push(props[i].name);
      }
      return suggestions;
    }
  },

  /**
   * Event that is called when the name of this node has changed.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeStorageGlobal#onNameChanged
   * @param {string} oldName - The current name.
   * @param {string} newName - The new name.
   * @param {external:wcUndoManager} [undo] - If the change is triggered by the user and undo management is enabled, this will be the undo manager. Note: The value change is already recorded, use this only if you have other things to record.
   */
  onNameChanged: function(oldName, newName, undo) {
    this._super(oldName, newName, undo);

    // Attempt to create a new property if it does not exist.
    var engine = this.engine();
    if (engine) {
      engine.createProperty(newName, wcPlay.PROPERTY.STRING, '');

      // Perform a search and remove all global properties no longer being referenced.
      var propList = engine.listProperties();
      var i = 0;

      var globalNodes = engine.nodesByClassName(this.className);
      for (i = 0; i < globalNodes.length; ++i) {
        var name = globalNodes[i].name;
        for (var a = 0; a < propList.length; ++a) {
          if (propList[a].name === name) {
            propList.splice(a, 1);
            break;
          }
        }
      }

      for (i = 0; i < propList.length; ++i) {

        undo && undo.addEvent('', {
          engine: engine,
          name: propList[i].name,
          type: propList[i].type,
          options: propList[i].options,
          value: propList[i].value,
          initialValue: propList[i].initialValue
        },
        // Undo
        function() {
          this.engine.createProperty(this.name, this.type, this.initialValue, this.options);
          this.engine.property(this.name, this.value);
        },
        // Redo
        function() {
          this.engine.removeProperty(this.name);
        });

        engine.removeProperty(propList[i].name);
      }

      this.property('value', engine.property(newName));
      this.initialProperty('value', engine.initialProperty(newName));
    }
  },

  /**
   * Any changes to the 'value' property will also change the global property.
   * <br>Event that is called when a property has changed.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeStorageGlobal#onPropertyChanged
   * @param {string} name - The name of the property.
   * @param {Object} oldValue - The old value of the property.
   * @param {Object} newValue - The new value of the property.
   */
  onPropertyChanged: function(name, oldValue, newValue) {
    this._super(name, oldValue, newValue);

    if (name === 'value') {
      if (this.name) {
        var engine = this.engine();
        engine && engine.property(this.name, newValue);
      }
    }
  },

  /**
   * Always redirect property gets on 'value' to the referenced global property.
   * <br>Event that is called when the property is being asked its value, before the value is actually retrieved.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeStorageGlobal#onPropertyGet
   * @param {string} name - The name of the property.
   * @returns {Object|undefined} - If a value is returned, that value is what will be retrieved from the get.
   */
  onPropertyGet: function(name) {
    this._super(name);

    if (name === 'value') {
      if (this.name) {
        var engine = this.engine();
        return (engine && engine.property(this.name));
      }
    }
  },

  /**
   * Any changes to the 'value' property will also change the global property.
   * <br>Event that is called when a property initial value is about to be changed.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeStorageGlobal#onInitialPropertyChanging
   * @param {string} name - The name of the property.
   * @param {Object} oldValue - The current value of the property.
   * @param {Object} newValue - The new, proposed, value of the property.
   * @returns {Object} - Return the new value of the property (usually newValue unless you are proposing restrictions). If no value is returned, newValue is assumed.
   */
  onInitialPropertyChanging: function(name, oldValue, newValue) {
    this._super(name, oldValue, newValue);

    if (name === 'value') {
      if (this.name) {
        var engine = this.engine();
        engine && engine.initialProperty(this.name, newValue);
      }
    }
  },

  /**
   * Always redirect property gets on 'value' to the referenced global property.
   * <br>Event that is called when the property initial value is being asked its value, before the value is actually retrieved.
   * <br>Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeStorageGlobal#onInitialPropertyGet
   * @param {string} name - The name of the property.
   * @returns {Object|undefined} - If a value is returned, that value is what will be retrieved from the get.
   */
  onInitialPropertyGet: function(name) {
    this._super(name);

    if (name === 'value') {
      if (this.name) {
        var engine = this.engine();
        return (engine && engine.initialProperty(this.name));
      }
    }
  },


  /**
   * Event that is called when a global property value has changed.
   * <br>Overload this in inherited nodes.
   * <br><b>Note:</b> Do not call 'this._super(..)' for this function, as the parent does not implement it.
   * @function wcNodeStorageGlobal#onGlobalPropertyChanged
   * @param {string} name - The name of the global property.
   * @param {Object} oldValue - The old value of the global property.
   * @param {Object} newValue - The new value of the global property.
   */
  onGlobalPropertyChanged: function(name, oldValue, newValue) {
    if (this.name === name) {
      this.property('value', newValue, true, true);
      this._meta.dirty = true;
    }
  },

  /**
   * Event that is called when a global property initial value has changed.
   * <br>Overload this in inherited nodes.<br>
   * <br><b>Note:</b> Do not call 'this._super(..)' for this function, as the parent does not implement it.
   * @function wcNodeStorageGlobal#onGlobalInitialPropertyChanged
   * @param {string} name - The name of the global property.
   * @param {Object} oldValue - The old value of the global property.
   * @param {Object} newValue - The new value of the global property.
   */
  onGlobalInitialPropertyChanged: function(name, oldValue, newValue) {
    if (this.name === name) {
      this.initialProperty('value', newValue, true, true);
      this._meta.dirty = true;
    }
  },

  /**
   * Event that is called when a global property has been removed.
   * <br>Overload this in inherited nodes.
   * <br><b>Note:</b> Do not call 'this._super(..)' for this function, as the parent does not implement it.
   * @function wcNodeStorageGlobal#onGlobalPropertyRemoved
   * @param {string} name - The name of the global property.
   */
  onGlobalPropertyRemoved: function(name) {
    if (this.name == name) {
      this.name = '';
    }
  },

  /**
   * Event that is called when a global property has been renamed.
   * <br>Overload this in inherited nodes.
   * <br><b>Note:</b> Do not call 'this._super(..)' for this function, as the parent does not implement it.
   * @function wcNodeStorageGlobal#onGlobalPropertyRenamed
   * @param {string} oldName - The old name of the global property.
   * @param {string} newName - The new name of the global property.
   */
  onGlobalPropertyRenamed: function(oldName, newName) {
    if (this.name == oldName) {
      this.name = newName;
    }
  }
});

wcPlayNodes.wcNodeStorage.extend('wcNodeStorageString', 'String', 'Local', {
  /**
   * Stores a string value.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * @class wcNodeStorageString
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description('Stores a string value.');

    this.createProperty('value', wcPlay.PROPERTY.STRING, '', {multiline: true, input: true, output: true});
  }
});

wcPlayNodes.wcNodeStorage.extend('wcNodeStorageNumber', 'Number', 'Local', {
  /**
   * Stores a number value.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * @class wcNodeStorageNumber
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description('Stores a number value.');

    this.createProperty('value', wcPlay.PROPERTY.NUMBER, '', {input: true, output: true});
  }
});

wcPlayNodes.wcNodeStorage.extend('wcNodeStorageToggle', 'Toggle', 'Local', {
  /**
   * Stores a boolean (toggleable) value.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * @class wcNodeStorageToggle
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description('Stores a boolean (toggleable) value.');

    this.createProperty('value', wcPlay.PROPERTY.TOGGLE, false, {input: true, output: true});
  }
});
