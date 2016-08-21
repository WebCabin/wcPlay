/* globals Crafty */

wcPlayNodes.wcNodeProcess.extend('wcNodeProcessGameMove', 'Move', 'Hero', {
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description('Moves the hero in a direction.');

    this.createProperty('direction', wcPlay.PROPERTY.SELECT, 'north', {description: 'The direction to move the hero.', items: ['north', 'south', 'east', 'west', 'forward', 'backward', 'left', 'right']});
  },

  onActivated: function(name) {
    this._super(name);

    var direction = this.property('direction');

    Crafty.trigger('Slide', direction);

    // A small delay to account for the character movement animation.
    this.setTimeout(function() {
      this.activateExit('out');
    }, 125);
  },
});

wcPlayNodes.wcNodeProcess.extend('wcNodeProcessGameCanMove', 'Can Move', 'Hero', {
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description('Checks if the hero can move in a direction.');

    this.removeExit('out');
    this.createExit('yes');
    this.createExit('no');

    this.createProperty('direction', wcPlay.PROPERTY.SELECT, 'north', {description: 'The direction to move the hero.', items: ['north', 'south', 'east', 'west', 'forward', 'backward', 'left', 'right']});
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

wcPlayNodes.wcNodeEntry.extend('wcNodeEntryGameUpdate', 'Game Update', 'Hero', {
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description('Game update loop.');
  }
});

wcPlayNodes.wcNodeEntry.extend('wcNodeEntryGameWin', 'Game Win', 'Hero', {
  init: function(parent, pos) {
    this._super(parent, pos);

    this.description('Game has won event.');
  }
});