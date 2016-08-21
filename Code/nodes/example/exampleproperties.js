wcPlayNodes.wcNodeProcess.extend('wcNodeProcessExampleProperties', 'Example Properties', 'Example', {
  /**
   * This node demonstrates an example of the different property types and how their values can be limited.
   * <br>When inheriting, make sure to include 'this._super(parent, pos);' at the top of your init function.
   * @class wcNodeProcessExampleProperties
   * @param {string} parent - The parent object of this node.
   * @param {wcPlay~Coordinates} pos - The position of this node in the visual editor.
   */
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description('This node demonstrates an example of the different property types and how their values can be limited.');

    // Get rid of the flow links, as they do not function.
    this.removeEntry('in');
    this.removeExit('out');

    this.createProperty('toggle', wcPlay.PROPERTY.TOGGLE, true, {description: 'Demonstration of the toggle property type.'});
    this.createProperty('number', wcPlay.PROPERTY.NUMBER, 3, {description: 'Demonstration of the number property type with a clamped range of 1-5.', min: 1, max: 5});
    this.createProperty('string', wcPlay.PROPERTY.STRING, 'Text', {description: 'Demonstration of the string property with a max character length of 10.', maxlength: 10});
    this.createProperty('suggest string', wcPlay.PROPERTY.STRING, '', {description: 'Demonstration of the string property with an item dropdown for suggestions.', items: ['Check', 'out', 'this', 'list', 'of', 'suggestions', 'like', 'a', 'select', 'property', '####', 'but', 'you', 'can', 'still', 'type', 'anything', 'you', 'want!']});
    this.createProperty('select', wcPlay.PROPERTY.SELECT, 3, {description: 'Demonstration of the select property with a dynamic number of options based on the "number" property.', items: this.selectItems});
    this.createProperty('select no none', wcPlay.PROPERTY.SELECT, 'dunno', {description: 'Demonstration of a select property that does not allow none as an option.', items: ['Option 1', 'Option 2', 'Option 3'], allowNone: false});
    this.createProperty('read only', wcPlay.PROPERTY.STRING, 'Can\'t edit me!', {description: 'Demonstration of a property that is marked as read only.', output: true, readOnly: true});
    this.createProperty('linked prop', wcPlay.PROPERTY.STRING, 'Both values linked!', {description: 'Demonstration of a property that has both value and initial values linked.', linked: true, input: true, output: true});
    this.createProperty('refuse link', wcPlay.PROPERTY.STRING, 'refuses numbers', {
      description: 'Demonstration of a link that will not connect to any number property link.',
      inputCondition: __refuseCondition,
      outputCondition: __refuseCondition,
      output: true,
      input: true
    });

    function __refuseCondition(targetNode, targetName) {
      if (targetNode.propertyType(targetName) === wcPlay.PROPERTY.NUMBER) {
        return false;
      }
      return true;
    }
  },

  /**
   * This function is used in the 'select' property to list a dynamic number of items that appear in edit combo box.
   * @function wcNodeProcessExampleProperties#selectItems
   * @returns {wcNode~SelectItem[]} - A list of items to populate in the combo box.
   */
  selectItems: function() {
    var result = [];

    var count = parseInt(this.property('number'));
    for (var i = 0; i < count; ++i) {
      result.push({
        name: 'Option ' + (i+1),
        value: i+1
      });
    }

    return result;
  }
});
