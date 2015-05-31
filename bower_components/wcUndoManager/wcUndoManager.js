function wcUndoManager(limit) {

  this._performingEvent = false;
  this._enabled = true;
  this._currentEvent = 0;
  this._undoList = [];
  this._redoList = [];
  this._groupList = [];
  this._undoLimit = 0;

  this.maxEvents(limit);
};

wcUndoManager.prototype = {
  // ---------------------------------------------------------------------------
  // Begins an undo group, this will wrap all subsequent events together
  // into one undo event.  Be sure to call wcUndoManager.endGroup() to
  // end and close this group.  A group can also contain multiple groups
  // inside of it.
  //  Params:
  //    info      - A string that describes the group.
  beginGroup: function(info) {
    if (this._performingEvent || !this._enabled) {
      return false;
    }

    var group = {
      info: info,
      data: {
        eventList: [],
        combineOptions: function(a, b) {
          // Ensure both items are objects.
          if (typeof a !== 'object') {
            return b;
          }
          if (typeof b !== 'object') {
            return a;
          }

          // Iterate through each property in object b.
          for (prop in b) {
            if (b.hasOwnProperty(prop)) {
              // If object a also contains the same property.
              if (a.hasOwnProperty(prop)) {
                // Append to an array.
                if ($.isArray(a[prop]) &&
                    $.isArray(b[prop])) {
                  a[prop] = a[prop].concat(b[prop]);
                // If this is a nested object, try combining that as well.
                } else {
                  this.combineOptions.call(this, a[prop], b[prop]);
                }
              // If object a does not have this property yet.
              } else {
                a[prop] = b[prop];
              }
            }
          }
        },
      },
      addEvent: function(event) {
        this.data.eventList.push(event);
      },
      // Undo
      undo: function() {
        var options = {};
        for (var i = this.eventList.length - 1; i >= 0; --i) {
          var result = this.eventList[i].undo.call(this.eventList[i].data);
          this.combineOptions.call(this, options, result);
        }
        return options;
      },
      // Redo
      redo: function() {
        var options = {};
        for (var i = 0; i < this.eventList.length; ++i) {
          var result = this.eventList[i].redo.call(this.eventList[i].data);
          this.combineOptions.call(this, options, result);
        }
        return options;
      },
    };

    this._groupList.push(group);
    return true;
  },

  // ---------------------------------------------------------------------------
  // Ends a previously began group.  This will close the group and add it to
  // the event stack.  If you nest groups into other groups, they must all be
  // ended in order before the final group will be added to the event stack.
  endGroup: function() {
    if (this._performingEvent || !this._enabled) {
      return false;
    }

    if (this._groupList.length) {
      var group = this._groupList.pop();

      // Don't add empty groups to the event list.
      if (group.data.eventList.length === 0) {
        return;
      }

      this.addEventRaw(group);
      return true;
    }
    return false;
  },

  // ---------------------------------------------------------------------------
  // Add an undo event to the stack.  The undo and redo functions may also
  // optionally return an options object; This object can be used
  // however you wish, most notably it can be used to specify what changed
  // in order to more accurately target page refresh.
  // Params:
  //    info    A string that describes the event.
  //    data    Custom data to store inside the event.  This is an
  //            object that contains both the previous and new values
  //            so that both undo and redo events can be performed.
  //    undo    Callback function to perform the undo event.
  //            The 'this' variable is the data given.
  //    redo    Callback function to perform the redo event.
  //            The 'this' variable is the data given.
  // Return:
  //    The event object created, or false if error.
  addEvent: function(info, data, undo, redo) {
    if (this._performingEvent || !this._enabled) {
      return false;
    }

    var event = {
      info: info,
      data: data,
      undo: undo,
      redo: redo,
    };

    if (typeof event.undo !== 'function') {
      return false;
    }

    if (typeof event.redo !== 'function') {
      return false;
    }

    if (this._groupList.length) {
      this._groupList[this._groupList.length-1].addEvent(event);
    } else {
      if (this._currentEvent > this._undoList.length) {
        this._currentEvent = -1;
      }

      while (this._redoList.pop());
      this._undoList.push(event);

      // Limit the size of undo events available.
      while (this._undoLimit > 0 && this._undoList.length > this._undoLimit) {
        this._undoList.pop(0);
        if (this._currentEvent > -1) {
          this._currentEvent--;
        }
      }
    }
    return event;
  },

  // --------------------------------------------------------------------------------
  // An alternative to the addEvent() method.  This one just takes an already
  // constructed event object, it needs to contain an undo and redo function,
  // along with any internal variables that it needs to function.
  // Params:
  //    event               The raw event object.
  //      {
  //        info: String    An informative string that describes the event.
  //        data: Object    An object that contains data used for the event.
  //        undo: Function  A function callback to undo the event, 'this' is the above data object.
  //        redo: Function  A function callback to redo the event, 'this' is the above data object.
  //      }
  addEventRaw: function(event) {
    if (this._performingEvent || !this._enabled) {
      return false;
    }

    if (typeof event !== 'object') {
      return false;
    }

    if (typeof event.undo !== 'function') {
      return false;
    }

    if (typeof event.redo !== 'function') {
      return false;
    }

    if (typeof event.info !== 'string') {
      event.info = '';
    }

    if (this._groupList.length) {
      this._groupList[this._groupList.length-1].addEvent(event);
    } else {
      if (this._currentEvent > this._undoList.length) {
        this._currentEvent = -1;
      }

      while (this._redoList.pop());
      this._undoList.push(event);

      // Limit the size of undo events available.
      while (this._undoLimit > 0 && this._undoList.length > this._undoLimit) {
        this._undoList.pop(0);
        if (this._currentEvent > -1) {
          this._currentEvent--;
        }
      }
    }
    return event;
  },

  // ---------------------------------------------------------------------------
  // This will clear the modified state of the manager.  Use this method during
  // a save operation for example.  This does not clear the undo/redo events, it
  // only flags the current position as the un-modified state.
  clearModified: function() {
    this._currentEvent = this._undoList.length;
  },

  // ---------------------------------------------------------------------------
  // Retrieves whether the current undo state is modified from the last clear
  // position, see wcUndoManager.clearModified().
  isModified: function() {
    return this._currentEvent !== this._undoList.length;
  },

  // ---------------------------------------------------------------------------
  // Retrieves whether there is an event left to undo.
  canUndo: function() {
    return this._undoList.length > 0;
  },

  // ---------------------------------------------------------------------------
  // Retrieves whether there is an event left to redo.
  canRedo: function() {
    return this._redoList.length > 0;
  },

  // ---------------------------------------------------------------------------
  // If an undo event can be made, this will retrieve the info description
  // assigned to that event.
  undoInfo: function() {
    if (this._undoList.length) {
      var event = this._undoList[this._undoList.length-1];
      return event.info;
    }
    return '';
  },

  // ---------------------------------------------------------------------------
  // If a redo event can be made, this will retrieve the info description
  // assigned to that event.
  redoInfo: function() {
    if (this._redoList.length) {
      var event = this._redoList[this._redoList.length-1];
      return event.info;
    }
    return '';
  },

  // ---------------------------------------------------------------------------
  // Performs an undo event.  This will automatically move the recently
  // performed undo event to the redo stack and change the modified flag
  // as necessary.
  // This function returns an object that contains any custom
  // options retrieved by the performed event.
  undo: function() {
    if (this._undoList.length && !this._performingEvent) {
      this._performingEvent = true;
      var event = this._undoList.pop();
      this._redoList.push(event);

      var options = event.undo.call(event.data);

      this._performingEvent = false;
      if (!options) {
        return {};
      }
      return options;
    }
    return false;
  },

  // ---------------------------------------------------------------------------
  // Performs a redo event.  This will automatically move the recently
  // performed redo event to the undo stack and change the modified flag
  // as necessary.
  // This function returns an object that contains any custom
  // options retrieved by the performed event.
  redo: function() {
    if (this._redoList.length && !this._performingEvent) {
      this._performingEvent = true;
      var event = this._redoList.pop();
      this._undoList.push(event);

      var options = event.redo.call(event.data);

      this._performingEvent = false;
      if (!options) {
        return {};
      }
      return options;
    }
    return false;
  },

  // ---------------------------------------------------------------------------
  // Clears all events from the undo and redo stacks.
  clear: function() {
    while (this._undoList.pop());
    while (this._redoList.pop());
    this._currentEvent = 0;
  },

  // ---------------------------------------------------------------------------
  // Sets the enabled status of the undo manager.
  enabled: function(enabled) {
    if (typeof enabled === 'undefined') {
      return this._enabled;
    }
    this._enabled = enabled;
  },

  // ---------------------------------------------------------------------------
  // Gets or Sets the maximum number of events allowed.  All groups and events
  // inside another group are not counted as part of this limit.  Assign this
  // value to zero for unlimited events or do not pass in a parameter if you
  // wish to just retrieve the current limit.
  maxEvents: function(limit) {
    if (typeof limit == 'number') {
      this._undoLimit = limit;
    }
    return this._undoLimit;
  },
};