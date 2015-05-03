'use strict'

/**
 * @class
 * The menu management class.
 *
 * @constructor
 * @param {external:jQuery~Object|external:jQuery~Selector|external:domNode} container - The container element.
 * @param {external:jQuery~Object|external:jQuery~Selector|external:domNode} outerContainer - The outer container element, this is your main container area for the entire window.
 * @param {wcMenu~Options} [options] - Custom options.
 */
function wcMenu(container, outerContainer, options) {
  this.$container = $(container);
  this.$outer = $(outerContainer);

  if (!this.$outer.attr('tabindex')) {
    this.$outer.attr('tabindex', '1');
  }

  this._menuOptions = [];

  // Setup our options.
  this._options = {
    data: false,
    manualUpdate: false,
    version: ''
  };
  for (var prop in options) {
    this._options[prop] = options[prop];
  }

  this.$fileMenu = $('<ul class="wcMenu wcMenuNoHighlights"></ul>');
  this.$toolbar = $('<div class="wcMenuToolbar wcMenuNoHighlights"></div>');
  this.$version = $('<div class="wcMenuVersionTag">' + this._options.version + '</div>');

  this.$container.append(this.$fileMenu);
  this.$container.append(this.$toolbar);
  this.$fileMenu.append(this.$version);

  // Setup events.
  var self = this;
  this.$container.on('mouseenter',  'ul.wcMenu > li',      function(event) {self.__onMouseEnter.call(this, event, self);});
  this.$container.on('click',       'ul.wcMenu > li > ul', function(event) {self.__onClicked.call(this, event, self);});
  this.$container.on('mouseleave',  'ul.wcMenu > li',      function(event) {self.__onMouseLeave.call(this, event, self);});
  this.$container.on('mouseleave',  'ul.wcMenu > li > ul', function(event) {self.__onSubMouseLeave.call(this, event, self);});
  this.$outer.on('keydown', function(event) {self.__onKey.call(this, event, self);});

  if (!this._options.manualUpdate) {
    window.requestAnimationFrame(function() {self.__autoUpdate();});
  }
}

wcMenu.prototype = {
  /**
   * Updates dynamic menus, if you've assigned options.manualUpdate = false, then you will need to call this yourself.
   * @function wcMenu#update
   */
  update: function() {
    // Update menu items.
    for (var i = 0; i < this._menuOptions.length; ++i) {
      var items = this._menuOptions[i].items;
      for (var a = 0; a < items.length; ++a) {
        var item = items[a];
        if (item.display) {
          item.$itemSpan.html('&nbsp;&nbsp;&nbsp;&nbsp;' + item.display(this._options.data))
          item.$itemSpan.prepend(item.$icon).append(item.$hotkey);
        }

        if (item.icon) {
          var icon = item.icon(this._options.data);
          item.$icon.removeClass().addClass('wcMenuIcon wcButton ' + icon);
          item.$toolbarIcon.removeClass().addClass('wcMenuIcon wcButton ' + icon);
        }

        if (item.description) {
          var desc = item.description(this._options.data);
          item.$itemSpan.attr('title', desc);
          if (item.$toolbar) {
            item.$toolbarSpan.attr('title', desc + (item.hotkeyString? ' (' + item.hotkeyString + ')': ''));
          }
        }

        if (item.condition) {
          var disabled = !item.condition(this._options.data);
          item.$itemSpan.toggleClass('disabled', disabled);
          if (item.$toolbar) {
            item.$toolbar.toggleClass('disabled', disabled);
          }
        }
      }
    }
  },

  /**
   * Gets, or Sets the version tag to display in the right margin of the menu bar.
   * @function wcMenu#version
   * @param {String} [tag] - The version tag.
   * @returns {String}
   */
  version: function(tag) {
    if (tag !== undefined) {
      this.$version.text(tag);
    }

    return this.$version.text();
  },

  /**
   * Adds a new file menu and/or toolbar option.
   * @function wcMenu#addOption
   * @param {String} categoryName - The top level category to place this option in the menu.
   * @param {String} name - The name to display for the option.
   * @param {wcMenu~MenuOptions} options - Custom options for the menu item.
   * @returns {Boolean} - Success or failure.
   */
  addOption: function(categoryName, name, options) {
    if (!name || !categoryName) {
      return false;
    }

    var optionData = {
      name: name,
    };

    if (options && typeof options.onActivated === 'function') {
      optionData.click = options.onActivated;
    }

    if (options && typeof options.display === 'function') {
      optionData.display = options.display;
    }

    // Find the category if it exists.
    var category = null;
    var $category = null;
    for (var i = 0; i < this._menuOptions.length; ++i) {
      if (this._menuOptions[i].name === categoryName) {
        category = this._menuOptions[i];
        break;
      }
    }

    if (options && typeof options.toolbarIndex === 'number') {
      optionData.$toolbar = $('<div><span class="wcMenuIcon wcButton"/></div>');
      optionData.$toolbarSpan = optionData.$toolbar.children('span');

      var $tools = this.$toolbar.children();
      if ($tools.length === 0 || options.toolbarIndex < 0 || options.toolbarIndex >= $tools.length) {
        this.$toolbar.append(optionData.$toolbar);
      } else {
        optionData.$toolbar.insertBefore($tools[options.toolbarIndex]);
      }
    }

    if (options && typeof options.condition === 'function') {
      optionData.condition = options.condition;
    }

    // Category doesn't exist, make it.
    if (!category) {
      $category = $('<li class="wcMenuCategory"><span>' + categoryName + '</span><ul></ul></li>');
      category = {
        name: categoryName,
        $category: $category,
        items: []
      };

      if (this._menuOptions.length === 0) {
        this.$fileMenu.append($category);
        this._menuOptions.push(category);
      } else {
        var insertIndex = this._menuOptions.length;
        if (options && typeof options.categoryIndex === 'number' && options.categoryIndex >= 0 && options.categoryIndex < insertIndex) {
          insertIndex = options.categoryIndex;
        }

        if (insertIndex < this._menuOptions.length) {
          $category.insertBefore(this._menuOptions[insertIndex].$category);
          this._menuOptions.splice(insertIndex, 0, category);
        } else {
          $category.insertAfter(this._menuOptions[this._menuOptions.length-1].$category);
          this._menuOptions.push(category);
        }
      }
    } else {
      $category = category.$category;
    }

    // Create the menu item.
    optionData.$item = $('<li><span class="wcMenuItem">&nbsp;&nbsp;&nbsp;&nbsp;' + name + '</span></li>');
    optionData.$itemSpan = optionData.$item.children('span');

    var $icon = $('<i class="wcMenuIcon wcButton"/>');
    if (options && options.icon) {
      if (typeof options.icon === 'string') {
        $icon.addClass(options.icon);

        if (optionData.$toolbar) {
          optionData.$toolbarSpan.addClass(options.icon);
        }
      } else if (typeof options.icon === 'function') {
        optionData.icon = options.icon;
      }
    }
    optionData.$icon = $icon;
    if (optionData.$toolbar) {
      optionData.$toolbarIcon = optionData.$toolbarSpan;
    }

    if (options && typeof options.description === 'string') {
      optionData.$itemSpan.attr('title', options.description);

      if (optionData.$toolbar) {
        optionData.$toolbarSpan.attr('title', options.description);
      }
    } else if (options && typeof options.description === 'function') {
      optionData.description = options.description;
    }

    var $hotkey = $('<span class="wcMenuHotkey">');
    if (options && typeof options.hotkeys === 'string') {
      optionData.hotkeys = [];

      var hotkeys = (options.hotkeys.indexOf(',') > -1? options.hotkeys.split(','): [options.hotkeys]);

      for (var i = 0; i < hotkeys.length; ++i) {
        var hotkey = hotkeys[i].toLowerCase();
        var hotkeyData = {
          ctrlKey: false,
          altKey: false,
          shiftKey: false
        };

        // Modifier keys.
        if (hotkey.indexOf('ctrl') > -1) {
          hotkeyData.ctrlKey = true;
        }
        if (hotkey.indexOf('alt') > -1) {
          hotkeyData.altKey = true;
        }
        if (hotkey.indexOf('shift') > -1) {
          hotkeyData.shiftKey = true;
        }

        // Special keys.
        if (hotkey.indexOf('del') > -1) {
          hotkeyData.keyCode = 46;
        } else if (hotkey.indexOf('ent') > -1 || hotkey.indexOf('ret') > -1) {
          hotkeyData.keyCode = 13;
        } else if (hotkey.indexOf('space') > -1 || hotkey.indexOf('spc') > -1) {
          hotkeyData.keyCode = 32;
        } else {
          // Ascii character code.
          hotkeyData.keyCode = hotkey.toUpperCase().charCodeAt(hotkey.length-1);
        }

        optionData.hotkeys.push(hotkeyData);
      }
      optionData.$hotkey = $hotkey;

      optionData.hotkeyString = options.hotkeys;
      
      $hotkey.text(options.hotkeys);
      if (optionData.$toolbar) {
        optionData.$toolbarSpan.attr('title', optionData.$toolbarSpan.attr('title') + ' (' + options.hotkeys + ')');
      }
    }

    optionData.$itemSpan.prepend($icon).append($hotkey);
    if (category.items.length === 0) {
      category.items.push(optionData);
      $category.children('ul').append(optionData.$item);
    } else {
      insertIndex = category.items.length;
      if (options && typeof options.itemIndex === 'number' && options.itemIndex >= 0 && options.itemIndex < insertIndex) {
        insertIndex = options.itemIndex;
      }

      if (insertIndex < category.items.length) {
        optionData.$item.insertBefore(category.items[insertIndex].$item);
        category.items.splice(insertIndex, 0, optionData);
      } else {
        optionData.$item.insertAfter(category.items[category.items.length-1].$spacer || category.items[category.items.length-1].$item);
        category.items.push(optionData);
      }
    }

    var menuOptions = this._options;
    function __onActivated(event) {
      if ($(this).hasClass('disabled')) {
        return;
      }

      optionData.click && optionData.click(menuOptions.data);
    };

    optionData.$itemSpan.click(__onActivated);
    if (optionData.$toolbar) {
      optionData.$toolbar.click(__onActivated);
    }

    return true;
  },

  /**
   * Adds a spacer to a menu list.
   * @function wcMenu#addSpacer
   * @param {String} categoryName - The top level category to place this spacer in the menu.
   * @param {Number} index - The insertion index to place the spacer, use -1 to append to end. This spacer will go after the menu item found at that index, other spacers do not count as an index.
   * @returns {Boolean} - Success or failure.
   */
  addSpacer: function(categoryName, index) {
    var category = null;
    for (var i = 0; i < this._menuOptions.length; ++i) {
      if (this._menuOptions[i].name === categoryName) {
        category = this._menuOptions[i];
        break;
      }
    }

    if (!category) {
      return false;
    }

    if (index < 0 || index >= category.items.length) {
      index = category.items.length-1;
    }

    var item = category.items[index];
    item.$spacer = $('<li><hr class="wcMenuSeparator"></li>');
    item.$spacer.insertAfter(item.$item);
    return true;
  },

  /**
   * Adds a spacer to the toolbar.
   * @function wcMenu#addToolbarSpacer
   * @param {String} categoryName - The top level category to place this spacer in the menu.
   * @param {Number} index - The insertion index to place the spacer, use -1 to append to end. This spacer will go after the toolbar button of the corresponding menu option, other spacers do not count as an index.
   * @returns {Boolean} - Success or failure.
   */
  addToolbarSpacer: function(categoryName, index) {
    var category = null;
    for (var i = 0; i < this._menuOptions.length; ++i) {
      if (this._menuOptions[i].name === categoryName) {
        category = this._menuOptions[i];
        break;
      }
    }

    if (!category) {
      return false;
    }

    if (index < 0 || index >= category.items.length) {
      index = category.items.length-1;
    }

    var item = category.items[index];
    if (item.$toolbar) {
      item.$toolbarSpacer = $('<div class="ARPG_Separator"></div>');
      item.$toolbarSpacer.insertAfter(item.$toolbar);
    }
    return true;
  },

  /**
   * Used when options.manualUpdate is not enabled.
   * @function wcMenu#__autoUpdate
   * @private
   */
  __autoUpdate: function() {
    this.update();

    var self = this;
    window.requestAnimationFrame(function() {self.__autoUpdate();});
  },

  /**
   * Mouse over an menu option on the top bar to open it.
   * @function wcMenu#__onMouseEnter
   * @private
   * @param {Object} event - The mouse event.
   * @param {wcMenu} menu - The menu instance.
   */
  __onMouseEnter: function(event, menu) {
    var $self = $(this);
    setTimeout(function() {
      if ($self.is(':hover')) {
        $self.addClass('wcMenuOpen').addClass('wcMenuItemHover');
      }
    }, 100);
  },

  /**
   * Clicking a menu item will also hide that menu.
   * @function wcMenu#__onClicked
   * @private
   * @param {Object} event - The mouse event.
   * @param {wcMenu} menu - The menu instance.
   */
  __onClicked: function(event, menu) {
    // Clicking a menu item will also hide that menu.
    menu.$container.find('ul.wcMenu li ul').css('display', 'none');
    setTimeout(function() {
      menu.$container.find('ul.wcMenu li ul').css('display', '');
    }, 200);
  },

  /**
   * Leaving the popup menu will hide it.
   * @function wcMenu#__onMouseLeave
   * @private
   * @param {Object} event - The mouse event.
   * @param {wcMenu} menu - The menu instance.
   */
  __onMouseLeave: function(event, menu) {
    if ($(this).find(event.toElement).length === 0) {
      $(this).removeClass('wcMenuOpen').removeClass('wcMenuItemHover');
    }
  },

  /**
   * Moving your mouse cursor away from the drop down menu will also hide it.
   * @function wcMenu#__onSubMouseLeave
   * @private
   * @param {Object} event - The mouse event.
   * @param {wcMenu} menu - The menu instance.
   */
  __onSubMouseLeave: function(event, menu) {
    // Make sure that we are actually leaving the menu
    // and not just jumping to another item in the menu
    var $parent = $(this).parent();
    if ($parent.find(event.toElement).length === 0) {
      $parent.removeClass('wcMenuOpen').removeClass('wcMenuItemHover');
    }
  },

  /**
   * Handle key press events.
   * @function wcMenu#__onKey
   * @private
   * @param {Object} event - The mouse event.
   * @param {wcMenu} menu - The menu instance.
   */
  __onKey: function(event, menu) {
    // Update menu items.
    for (var i = 0; i < menu._menuOptions.length; ++i) {
      var items = menu._menuOptions[i].items;
      for (var a = 0; a < items.length; ++a) {
        var item = items[a];
        if (item.hotkeys) {
          for (var b = 0; b < item.hotkeys.length; ++b) {
            var hotkey = item.hotkeys[b];
            if (hotkey.ctrlKey == event.ctrlKey &&
                hotkey.shiftKey == event.shiftKey &&
                hotkey.altKey == event.altKey &&
                hotkey.keyCode == event.keyCode) {
              item.$itemSpan.click();
            }
          }
        }
      }
    }
  },
};
