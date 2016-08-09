/**
 * @class wcClass
 * JavaScript class inheritance system.
 */
(function(){
  // Already defined, then we can skip.
  if (this.wcPlayNodes && this.wcPlayNodes['wcClass']) {
    return;
  }

  if (!this.wcPlayNodes) {
    this.wcPlayNodes = {};
  }

  var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;

  var wcClass = function(){};
   wcClass.extend = function(className) {
    // Validate class name.
    if (!className.match(/^[a-z]+[\w]*$/i)) {
      throw new Error('Class name contains invalid characters!');
    }

    // Last argument is always the class definition.
    var props = arguments[arguments.length-1];

    var _super = this.prototype;

    // Instantiate a base class (but only create the instance,
    // don't run the init constructor)
    initializing = true;
    var prototype = new this(arguments);
    initializing = false;

    function BindSuper(owner, superObj, name) {
      var bound = superObj[name].bind(owner);
      for (var key in superObj) {
        if (typeof superObj[key] === 'function') {
          bound[key] = superObj[key].bind(owner);
        }
      }
      return bound;
    };
   
    // Copy the properties over onto the new prototype
    for (var name in props) {
      // Check if we're overwriting an existing function
      prototype[name] = typeof props[name] == "function" &&
        typeof _super[name] == "function" && fnTest.test(props[name]) ?
        (function(name, fn){
          return function() {
            var tmp = this._super;
           
            // Add a new ._super() method that is the same method
            // but on the super-class
            this._super = BindSuper(this, _super, name);
           
            // The method only need to be bound temporarily, so we
            // remove it when we're done executing
            var ret = fn.apply(this, arguments);
            this._super = tmp;
           
            return ret;
          };
        })(name, props[name]) :
        props[name];
    }

    // Is a functionality.
    prototype.isA = function(name) {
      return name === className;
    };

    // Instance of functionality.
    prototype.instanceOf = function(name) {
      return this.isA(name) || (_super.instanceOf && _super.instanceOf(name));
    };
   
    eval('window.wcPlayNodes["' + className + '"]=function ' + className + '(){if(!initializing){this.init && this.init.apply(this, arguments);}else{this.classInit && this.classInit.apply(this, arguments[0])}};');

    // Populate our constructed prototype object
    window.wcPlayNodes[className].prototype = prototype;
 
    // And make this class extendable
    window.wcPlayNodes[className].extend = arguments.callee;
  };
  this.wcPlayNodes.wcClass = wcClass;
})();