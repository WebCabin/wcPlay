# Web Cabin Undo Manager #


Web Cabin's Undo Manager can be used to effectively provide undo/redo events into your own web application with ease.

View a simple demonstration here: [http://undo.webcabin.org](http://undo.webcabin.org)

****
## Basic Usage ##

Begin by initializing an instance of the undo manager:

    var undoManager = new wcUndoManager();

To add an event into the manager, call addEvent() with the following parameters:
* info: A string value that describes the event.
* data: This data will be stored with the event, it should be an object that contains enough information to perform both undo and redo events, and should not contain object references that could potentially change.
* Undo(): This function will be called whenever the event is being un-done.  The 'this' variable will be the previously entered data object.
* Redo(): This function will be called whenever the event is being re-done.  The 'this' variable will be the previously entered data object.

    undoManager.addEvent(info, data, Undo, Redo);

Here is an example:

    var oldValue; // This should contain the old value of the element before the change.
    var newValue = document.getElementById("edit").value;
    undoManager.addEvent("Text Changed",
      // Data
      {
        oldValue: oldValue,
        newValue: newValue
      },
      // Undo Function
      function() {
        document.getElementById("edit").value = this.oldValue;
      },
      // Redo Function
      function() {
        document.getElementById("edit").value = this.newValue;
      });

To perform an undo or redo event, simply call the undo or redo functions on the manager.

    undoManager.undo();
    // or
    undoManager.redo();
    
The canUndo() and canRedo() functions will tell you whether an undo or redo action can be done.

The undoInfo() and redoInfo() functions will retrieve the description of the very next undo or redo event in the stack, this is useful if you want your undo/redo buttons to show tooltips or descriptions about what is about to be undone.

****
## Advanced Usage ##

You can group several undo events together into a single event by wrapping those events between calls to beginGroup() and endGroup().  For example, if you are writing a paint program and every pixel painted creates a new undo event, you wouldn't want the user to have to undo dozens of times just to undo a single line they made.  The solution is to beginGroup() when the user presses down on the mouse and then endGroup() when they release, every undo pixel event added in between these calls will automatically be groupped together and treated as one event.

The Undo and Redo event function callbacks from addEvent() can optionally return an object value with properties inside.  This object can then be caught as a result of the managers undo() or redo() call and then used as desired.  Most notably, this feature is meant to be used to specify what changed in order to more accurately target page refresh.

In this example, we take our previous example and add a return value.

    var oldValue; // This should contain the old value of the element before the change.
    var newValue = document.getElementById("edit").value;
    undoManager.addEvent("Text Changed",
      // Init Function
      function() {
        this.oldValue = oldValue;
        this.newValue = newValue;
      },
      // Undo Function
      function() {
        document.getElementById("edit").value = this.oldValue;
        return {editValueChanged: this.oldValue};
      },
      // Redo Function
      function() {
        document.getElementById("edit").value = this.newValue;
        return {editValueChanged: this.newValue};
      });
      
Now, whenever this event is called, it will return the property 'editValueChanged' into our result.

    var obj = undoManager.undo();
    if (obj.hasOwnProperty("editValueChanged")) {
      // Perform some operation, possibly a refresh on a specific item within the app.
    }

Group events will automatically attempt to combine multiple event results into a single object.

Assuming all saveable actions are recorded as undo events, the manager can also keep track of whether the current state of the application is modified from its last recorded position.  This means whenever a new undo event is added, the state is modified, but that modified state will go away if the user undoes that action.  When the application is saved, a call to clearModified() will assign the current state as the un-modified state.  You can then use isModified() at any time to check whether your application contains any changes.

****
## License ##

[MIT License](http://www.opensource.org/licenses/mit-license.php)

&copy; 2014 Jeff P. Houde ([lochemage@gmail.com](mailto:lochemage@gmail.com))

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

****
## Suggestions/Comments? ##
Please feel free to contact me, Jeff Houde ([lochemage@gmail.com](mailto:lochemage@gmail.com)), for any information or to give feedback and suggestions.

Thank you
