(function(){
  // Already defined, then we can skip.
  if (this.wcPlayNodes && this.wcPlayNodes['wcClass']) {
    return;
  }

  if (!this.wcPlayNodes) {
    this.wcPlayNodes = {};
  }

  if (!Function.prototype.bind) {
    Function.prototype.bind = function(oThis) {
      if (typeof this !== 'function') {
        // closest thing possible to the ECMAScript 5
        // internal IsCallable function
        throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
      }

      var aArgs   = Array.prototype.slice.call(arguments, 1),
        fToBind = this,
        fNOP    = function() {},
        fBound  = function() {
          return fToBind.apply(this instanceof fNOP? this : oThis, aArgs.concat(Array.prototype.slice.call(arguments)));
        };

      if (this.prototype) {
        // Function.prototype doesn't have a prototype property
        fNOP.prototype = this.prototype; 
      }
      fBound.prototype = new fNOP();

      return fBound;
    };
  }

  var initializing = false;

  /**
   * JavaScript class inheritance system.
   * @class wcClass
   */
  var wcClass = function(){};

  /**
   * Extends the class object.
   * @function wcClass.extend
   * @param {string} className - The name of the class to define.
   * @param {...Object} _args - Any parameters to pass on to the class constructor.
   * @returns {Object} - The new inherited class object.
   */
  wcClass.extend = function(className, _args) {
    // Validate class name.
    if (!className.match(/^[a-z]+[\w]*$/i)) {
      throw new Error('Class name contains invalid characters!');
    }

    _args;
    // Last argument is always the class definition.
    var props = arguments[arguments.length-1];

    var _super = this.prototype;

    // Create a bound super class object that contains all of the
    // parent methods, but bound to the current object.
    var _boundSuper = {};
    for (var key in _super) {
      if (typeof _super[key] === 'function') {
        _boundSuper[key] = _super[key].bind(prototype);
      }
    }


    // Instantiate a base class (but only create the instance,
    // don't run the init constructor)
    initializing = true;
    var prototype = new this(arguments);
    initializing = false;

    function BindSuper(owner, name) {
      var bound = null;
      if (_super && typeof _super[name] === 'function') {
        bound = _super[name].bind(owner);
      } else {
        bound = function(){};
      }
      bound.prototype = _boundSuper;
      return bound;
    }

    // Copy the properties over onto the new prototype
    for (var name in props) {
      // Check if we're overwriting an existing function
      // prototype[name] = typeof props[name] === 'function' && typeof _super[name] === 'function'?
      prototype[name] = typeof props[name] === 'function'?
        (function(name, fn){
          return function() {
            var tmp = this._super;
           
            // Add a new this._super() method that is the same method
            // but on the super-class
            this._super = BindSuper(this, name);
           
            // The method only need to be bound temporarily, so we
            // remove it when we're done executing
            var ret = fn.apply(this, arguments);
            this._super = tmp;
           
            return ret;
          };
        })(name, props[name]):
        props[name];
    }

    function __init() {
      if(!initializing) {
        this.init && this.init.apply(this, arguments);
      } else {
        this.classInit && this.classInit.apply(this, arguments[0]);
      }
    }

    // Is a functionality.
    prototype.isA = function(name) {
      return name === className;
    };

    // Instance of functionality.
    prototype.instanceOf = function(name) {
      return this.isA(name) || (_super.instanceOf && _super.instanceOf(name));
    };

    // Converts __init to a new function that is named after className
    var Class = 'wcPlayNodes.' + className + ' = function ' + className + '() {' + __init.toString().match(/function[^{]+\{([\s\S]*)\}$/)[1] + '};';
    eval(Class);

    // Populate our constructed prototype object
    wcPlayNodes[className].prototype = prototype;

    // And make this class extendable
    wcPlayNodes[className].extend = arguments.callee;
    return Class;
  };
  this.wcPlayNodes.wcClass = wcClass;

  /**
   * Class constructor.
   * @function wcClass#init
   * @params {..Object} Any parameters to pass on to the class constructor.
   */
  /**
   * Initializes a class type.
   * @function wcClass#classInit
   * @params {..Object} Any parameters to pass on to the class constructor.
   */
})();