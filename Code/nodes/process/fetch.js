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
