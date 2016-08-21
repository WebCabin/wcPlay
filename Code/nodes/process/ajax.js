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
