wcNodeProcess.extend('wcNodeProcessGameMove', 'Move', 'Hero', {
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("Moves the hero in a direction.");

    this.createProperty('direction', wcPlay.PROPERTY.SELECT, 'north', {description: "The direction to move the hero.", items: ['north', 'south', 'east', 'west', 'forward', 'backward', 'left', 'right']});
  },

  onActivated: function(name) {
    this._super(name);

    var direction = this.property('direction');

    Crafty.trigger('Slide', direction);

    this.setTimeout(function() {
      this.activateExit('out');
    }, 100);
  },
});

wcNodeProcess.extend('wcNodeProcessGameCanMove', 'Can Move', 'Hero', {
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description("Checks if the hero can move in a direction.");

    this.removeExit('out');
    this.createExit('yes');
    this.createExit('no');

    this.createProperty('direction', wcPlay.PROPERTY.SELECT, 'north', {description: "The direction to move the hero.", items: ['north', 'south', 'east', 'west', 'forward', 'backward', 'left', 'right']});
  },

  onActivated: function(name) {
    this._super(name);

    var direction = this.property('direction');

    var moves = {};
    Crafty.trigger('OpenDirections', moves);

    if (moves[direction]) {
      this.activateExit('yes');
    } else {
      this.activateExit('no');
    }
  },
});
