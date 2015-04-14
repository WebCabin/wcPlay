/**
 * The main class for wcPlay.
 * @class wcPlay
 */
function wcPlay() {

};

/**
 * Property types.
 * @enum {String}
 */
wcPlay.PROP_TYPE = {
  /** Displays the property with no edit control. No options are used. */
  NONE: 'none',
  /** Displays the property as a checkbox. No options are used. */
  TOGGLE: 'toggle',
  /** Displays the property as a number control. See {@link wcPlay~NumberOptions} for options. */
  NUMBER: 'number',
  STRING: 'string',
  SELECT: 'select'
};

/**
 * A global list of node types. All node types must add themselves into this list when they are coded.
 */
wcPlay.NODE_TYPE = {

}

wcPlay.prototype = {

}