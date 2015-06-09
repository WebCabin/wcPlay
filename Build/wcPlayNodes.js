wcNodeEntry.extend('wcNodeEntryStart', 'Start', 'Automatic', {
  /**
   * @class
   * An entry node that fires as soon as the script [starts]{@link wcPlay#start}.<br>
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeEntryStart
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("When the script starts, this will activate immediately and only once.");
  },

  /**
   * Event that is called as soon as the Play script has started.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeEntryStart#onStart
   */
  onStart: function() {
    this._super();
    this.onActivated();
  },
});
wcNodeEntry.extend('wcNodeEntryUpdate', 'Update', 'Automatic', {
  /**
   * @class
   * An entry node that fires continuously on a regular update.<br>
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeEntryUpdate
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("Once the script starts, this will activate continuously on a time interval defined by the milliseconds property.");

    this.createProperty("milliseconds", wcPlay.PROPERTY.NUMBER, 1000, {description: "The time, in milliseconds, per update."});
  },

  /**
   * Overloading the default onActivated event handler so we can make it immediately trigger our exit link if our conditions are met.
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeEntryUpdate#onActivated
   * @param {String} name - The name of the entry link triggered.
   */
  onActivated: function(name) {
    var interval = this.property('milliseconds');
    this.resetThreads();

    this.setInterval(function() {
      this.activateExit('out');
    }, interval);
  },

  /**
   * Event that is called as soon as the Play script has started.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeEntryUpdate#onStart
   */
  onStart: function() {
    this._super();

    this.onActivated();
  },

  /**
   * Event that is called when a property has changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeEntryUpdate#onPropertyChanged
   * @param {String} name - The name of the property.
   * @param {Object} oldValue - The old value of the property.
   * @param {Object} newValue - The new value of the property.
   */
  onPropertyChanged: function(name, oldValue, newValue) {
    this._super(name, oldValue, newValue);

    if (name === 'milliseconds') {
      this.resetThreads();
      this.onActivated();
    }
  },
});
wcNodeEntry.extend('wcNodeEntryRemote', 'Remote Event', 'Flow Control', {
  /**
   * @class
   * An entry node that fires when a [Call Remote Event Node]{@link wcNodeEntryCallRemote} of the same name is activated.<br>
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeEntryRemote
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("An entry node that fires when a Call Remote Event Node of the same name is activated.");
    this.details("This node uses it's Title Name value as an identifier that links it with any Call Remote Event Nodes of the same name. Whenever any Call Remote Event Node of the same name is activated, this Node will become active as well. If multiple Remote Nodes exist with the same name, they will all be called in parallel.");
  },
});
wcNodeEntry.extend('wcNodeEntryCallRemote', 'Call Remote Event', 'Flow Control', {
  /**
   * @class
   * An entry node that fires when a [Call Remote Event Node]{@link wcNodeEntryCallRemote} of the same name is activated.<br>
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeEntryCallRemote
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("An entry node that activates all Remote Event Nodes of the same name.");
    this.details("This node uses it's Title Name value as an identifier that links it with any Remote Event Nodes of the same name. Whenever this Node is activated, All Remote Event Nodes of the same name will also become active as well.");

    this.createEntry('in');
    this.removeExit('out');

    this.createProperty('local', wcPlay.PROPERTY.TOGGLE, true, {description: "If true, only matching Remote Event Nodes that are within, or nested within, the same Composite Node or scope will be activated."});
  },

  /**
   * Event that is called when an entry link has been activated.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeEntryCallRemote#onActivated
   * @param {String} name - The name of the entry link triggered.
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
        engine.queueNodeEntry(remoteNodes[i], 'in', this, 'out');
      }
    }
  },
});
wcNodeProcess.extend('wcNodeProcessDelay', 'Delay', 'Flow Control', {
  /**
   * @class
   * Waits for a specified amount of time before continuing the flow chain.<br>
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeProcessDelay
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("Waits for a specified amount of time before continuing the flow chain.");

    this.createProperty('milliseconds', wcPlay.PROPERTY.NUMBER, 1000, {description: "The time delay, in milliseconds, to wait before firing the 'out' Exit link."});
  },

  /**
   * Event that is called when an entry link has been activated.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessDelay#onActivated
   * @param {String} name - The name of the entry link triggered.
   */
  onActivated: function(name) {
    this._super(name);

    // Now set a timeout to wait for 'Milliseconds' amount of time.    
    var delay = this.property('milliseconds');

    // Start a timeout event using the node's built in timeout handler.
    this.setTimeout(function() {
      this.activateExit('out');
    }, delay);
  },
});

wcNodeProcess.extend('wcNodeProcessOperation', 'Operation', 'Data Manipulation', {
  /**
   * @class
   * Performs a simple math operation on two values.
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeProcessOperation
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("Performs a simple math operation on two values.");
    this.details("Activate the entry link of the operation you want to perform, either an addition, subtraction, multiplication, or division. The operation will then be performed using valueA and valueB, the result will be output to the result property.");

    // Remove our default entry.
    this.removeEntry('in');

    // Create an input link per operation type.
    this.createEntry('add', "valueA + valueB = result");
    this.createEntry('sub', "valueA - valueB = result");
    this.createEntry('mul', "valueA * valueB = result");
    this.createEntry('div', "valueA / valueB = result");

    // Create our two operator values.
    this.createProperty('valueA', wcPlay.PROPERTY.NUMBER, 0, {description: "Left hand value for the operation.", noread: true});
    this.createProperty('valueB', wcPlay.PROPERTY.NUMBER, 0, {description: "Right hand value for the operation.", noread: true});
    this.createProperty('result', wcPlay.PROPERTY.NUMBER, 0, {description: "The result of the operation.", nowrite: true});
  },

  /**
   * Event that is called when an entry link has been activated.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessOperation#onActivated
   * @param {String} name - The name of the entry link triggered.
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
  },
});

wcNodeProcess.extend('wcNodeProcessStrCat', 'String Concat', 'Data Manipulation', {
  /**
   * @class
   * Formats a templated string by replacing template commands with the value of other properties.
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeProcessStrCat
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("Concatenates two string values.");
    this.details("This takes the string of valueA and appends valueB to it, the result is stored in the result property.");

    // Create our two operator values.
    this.createProperty('valueA', wcPlay.PROPERTY.STRING, '', {description: "The left side string to join.", noread: true});
    this.createProperty('valueB', wcPlay.PROPERTY.STRING, '', {description: "The right side string to join.", noread: true});
    this.createProperty('result', wcPlay.PROPERTY.STRING, '', {description: "The concatenated result.", nowrite: true});
  },

  /**
   * Event that is called when an entry link has been activated.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessStrCat#onActivated
   * @param {String} name - The name of the entry link triggered.
   */
  onActivated: function(name) {
    this._super(name);

    this.property('result', this.property('valueA').toString() + this.property('valueB'));
    this.activateExit('out');
  },
});

wcNodeProcess.extend('wcNodeProcessAJAX', 'AJAX', 'Data Retrieval', {
  /**
   * @class
   * Performs an AJAX request.<br>
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeProcessAJAX
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("Performs an AJAX request.");
    this.details("Once activated, a request will be sent to the given URL.  Either the success or failure exit links will activate once the operation is completed and the result will be assigned to the result property.");

    this.removeExit('out');
    this.createExit('success');
    this.createExit('failure');

    this.createProperty('type', wcPlay.PROPERTY.SELECT, 'GET', {items: ['GET', 'POST'], description:"The AJAX method to perform.", noread: true});
    this.createProperty('url', wcPlay.PROPERTY.STRING, 'example.com', {description: "The URL to send the request.", noread: true});
    this.createProperty('data', wcPlay.PROPERTY.STRING, 'foo=bar&bar=foo', {description: "The data to send with the request. This can be in query string form, or any object that $.ajax supports as the data parameter.", noread: true});
    this.createProperty('result', wcPlay.PROPERTY.STRING, '', {description: "The result of the ajax request, if successful.", nowrite: true});
  },

  /**
   * Event that is called when an entry link has been activated.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessAJAX#onActivated
   * @param {String} name - The name of the entry link triggered.
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
      },
    });
  },
});

wcNodeProcess.extend('wcNodeProcessConsoleLog', 'Console Log', 'Debugging', {
  /**
   * @class
   * For debugging purposes, will print out a message into the console log the moment it is activated. [Silent mode]{@link wcPlay~Options} will silence this node.<br>
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeProcessConsoleLog
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("For debugging purposes, will print out a message into the console log when activated (only if silent mode is not on).");

    // Create the message property so we know what to output in the log.
    this.createProperty('message', wcPlay.PROPERTY.STRING, 'msg', {description: "The message that will appear in the console log.", noread: true});
  },

  /**
   * Event that is called when an entry link has been activated.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessConsoleLog#onActivated
   * @param {String} name - The name of the entry link triggered.
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
  },
});

wcNodeProcess.extend('wcNodeProcessAlert', 'Alert', 'Debugging', {
  /**
   * @class
   * For debugging purposes, will popup an alert box with a message the moment it is activated. [Silent mode]{@link wcPlay~Options} will silence this node.<br>
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeProcessAlert
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("For debugging purposes, will popup an alert box with a message when activated (only if silent mode is not on).");

    // Create the message property so we know what to output in the log.
    this.createProperty('message', wcPlay.PROPERTY.STRING, 'Alert message.', {multiline: true, description: "The message that will appear in the alert box.", noread: true});
  },

  /**
   * Event that is called when an entry link has been activated.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeProcessAlert#onActivated
   * @param {String} name - The name of the entry link triggered.
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
  },
});

wcNodeStorage.extend('wcNodeStorageGlobal', 'Global', 'Global', {
  /**
   * @class
   * References a global property on the script.
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeStorageGlobal
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);
    this.color = '#77CC77';

    this.description("References a global property on the script.");
    this.details("The title name for this node becomes the name of the global property it references. Duplicate Global Nodes with the same name will all reference the same value.");

    this.createProperty('value', wcPlay.PROPERTY.STRING, '', {description: "The current value of the global property (Use the title to identify the property)."});
  },

  /**
   * Event that is called when the name of this node has changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeStorageGlobal#onNameChanged
   * @param {String} oldName - The current name.
   * @param {String} newName - The new name.
   */
  onNameChanged: function(oldName, newName) {
    this._super(oldName, newName);

    // Attempt to create a new property if it does not exist.
    var engine = this.engine();
    if (engine) {
      engine.createProperty(newName, wcPlay.PROPERTY.STRING, '');
      
      // Perform a search and remove all global properties no longer being referenced.
      var propList = engine.listProperties();

      var globalNodes = engine.nodesByClassName(this.className);
      for (var i = 0; i < globalNodes.length; ++i) {
        var name = globalNodes[i].name;
        for (var a = 0; a < propList.length; ++a) {
          if (propList[a].name === name) {
            propList.splice(a, 1);
            break;
          }
        }
      }

      for (var i = 0; i < propList.length; ++i) {
        engine.removeProperty(propList[i].name);
      }

      this.property('value', engine.property(newName));
      this.initialProperty('value', engine.initialProperty(newName));
    }
  },

  /**
   * Any changes to the 'value' property will also change the global property.<br>
   * Event that is called when a property has changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeStorageGlobal#onPropertyChanged
   * @param {String} name - The name of the property.
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
   * Always redirect property gets on 'value' to the referenced global property.<br>
   * Event that is called when the property is being asked its value, before the value is actually retrieved.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeStorageGlobal#onPropertyGet
   * @param {String} name - The name of the property.
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
   * Any changes to the 'value' property will also change the global property.<br>
   * Event that is called when a property initial value is about to be changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeStorageGlobal#onInitialPropertyChanging
   * @param {String} name - The name of the property.
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
   * Always redirect property gets on 'value' to the referenced global property.<br>
   * Event that is called when the property initial value is being asked its value, before the value is actually retrieved.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeStorageGlobal#onInitialPropertyGet
   * @param {String} name - The name of the property.
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
   * Overload this in inherited nodes.<br>
   * <b>Note:</b> Do not call 'this._super(..)' for this function, as the parent does not implement it.
   * @function wcNodeStorageGlobal#onGlobalPropertyChanged
   * @param {String} name - The name of the global property.
   * @param {Object} oldValue - The old value of the global property.
   * @param {Object} newValue - The new value of the global property.
   */
  onGlobalPropertyChanged: function(name, oldValue, newValue) {
    if (this.name === name) {
      this.property('value', newValue, true, true);
    };
  },

  /**
   * Event that is called when a global property has been removed.
   * Overload this in inherited nodes.<br>
   * <b>Note:</b> Do not call 'this._super(..)' for this function, as the parent does not implement it.
   * @function wcNodeStorageGlobal#onGlobalPropertyRemoved
   * @param {String} name - The name of the global property.
   */
  onGlobalPropertyRemoved: function(name) {
    if (this.name == name) {
      this.name = '';
    }
  },

  /**
   * Event that is called when a global property has been renamed.
   * Overload this in inherited nodes.<br>
   * <b>Note:</b> Do not call 'this._super(..)' for this function, as the parent does not implement it.
   * @function wcNodeStorageGlobal#onGlobalPropertyRenamed
   * @param {String} oldName - The old name of the global property.
   * @param {String} newName - The new name of the global property.
   */
  onGlobalPropertyRenamed: function(oldName, newName) {
    if (this.name == oldName) {
      this.name = newName;
    }
  },
});

wcNodeStorage.extend('wcNodeStorageString', 'String', 'Local', {
  /**
   * @class
   * Stores a string value.<br>
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeStorageString
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("Stores a string value.");

    this.createProperty('value', wcPlay.PROPERTY.STRING, '', {multiline: true});
  },
});

wcNodeStorage.extend('wcNodeStorageNumber', 'Number', 'Local', {
  /**
   * @class
   * Stores a number value.<br>
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeStorageNumber
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("Stores a number value.");

    this.createProperty('value', wcPlay.PROPERTY.NUMBER);
  },
});

wcNodeStorage.extend('wcNodeStorageToggle', 'Toggle', 'Local', {
  /**
   * @class
   * Stores a boolean (toggleable) value.
   * When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   *
   * @constructor wcNodeStorageToggle
   * @param {String} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("Stores a boolean (toggleable) value.");

    this.createProperty('not', wcPlay.PROPERTY.TOGGLE, true, {description: "If set, will assign the opposite to value."});
    this.createProperty('value', wcPlay.PROPERTY.TOGGLE, false);
  },

  /**
   * Event that is called when a property has changed.<br>
   * Overload this in inherited nodes, be sure to call 'this._super(..)' at the top.
   * @function wcNodeStorageToggle#onPropertyChanged
   * @param {String} name - The name of the property.
   * @param {Object} oldValue - The old value of the property.
   * @param {Object} newValue - The new value of the property.
   */
  onPropertyChanged: function(name, oldValue, newValue) {
    this._super(name, oldValue, newValue);

    if (name === 'not') {
      this.property('value', !newValue, true, true);
    }
  },
});
