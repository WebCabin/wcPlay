'use strict'

/**
 * @class
 * The menu management class.
 *
 * @constructor
 * @param {external:jQuery~Object|external:jQuery~Selector|external:domNode} container - The container element.
 * @param {wcMenu~Options} [options] - Custom options.
 */
function wcMenu(container, options) {
  this.$container = $(container);

  this._menuOptions = [];

  // Setup our options.
  this._options = {
    outer: 'body',
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

  this.$outer = $(this._options.outer);
  this.$container.append(this.$fileMenu);
  this.$container.append(this.$toolbar);
  this.$fileMenu.append(this.$version);

  if (!this.$outer.attr('tabindex')) {
    this.$outer.attr('tabindex', '1');
  }

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
          var display = item.display(this._options.data);
          if (display !== item.lastDisplay) {
            item.$itemSpan.html('&nbsp;&nbsp;&nbsp;&nbsp;' + display)
            item.$itemSpan.prepend(item.$icon).append(item.$hotkey);
            item.lastDisplay = display;
          }
        }

        if (item.toggle) {
          var toggle = item.toggle(this._options.data);
          if (toggle !== item.lastToggle) {
            item.$icon.toggleClass('wcButtonActive', toggle);
            if (item.$toolbarIcon) {
              item.$toolbarIcon.parent().toggleClass('wcButtonActive', toggle);
            }
            item.lastToggle = toggle;
          }
        }

        if (item.icon) {
          var icon = item.icon(this._options.data);
          if (icon !== item.lastIcon) {
            item.$icon.children('i').removeClass().addClass('' + icon);
            if (item.$toolbarIcon) {
              item.$toolbarIcon.removeClass().addClass('' + icon);
            }
            item.lastIcon = icon;
          }
        }

        if (item.description) {
          var desc = item.description(this._options.data);
          if (desc !== item.lastDesc) {
            item.$itemSpan.attr('title', desc);
            if (item.$toolbar) {
              item.$toolbarSpan.attr('title', desc + (item.hotkeyString? ' (' + item.hotkeyString + ')': ''));
            }
            item.lastDesc = desc;
          }
        }

        if (item.condition) {
          var disabled = !item.condition(this._options.data);
          if (disabled !== item.lastDisabled) {
            item.$itemSpan.toggleClass('disabled', disabled);
            if (item.$toolbar) {
              item.$toolbar.toggleClass('disabled', disabled);
            }
            item.lastDisabled = disabled;
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
   * @param {String} name - The name for the option.
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

    if (options && typeof options.toggle === 'function') {
      optionData.toggle = options.toggle;
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
      optionData.$toolbar = $('<div class="wcMenuIcon wcButton"><span></span></div>');
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
      $category = $('<li class="wcMenuCategory"><span>' + categoryName + '</span><ul class="wcMenuCategoryDropdown"></ul></li>');
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

    var $icon = $('<div class="wcMenuIcon wcButton"><i></i></div>');
    if (options && options.icon) {
      if (typeof options.icon === 'string') {
        $icon.children('i').addClass(options.icon);

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
    } else {
      optionData.$itemSpan.attr('title', '');

      if (optionData.$toolbar) {
        optionData.$toolbarSpan.attr('title', '');
      }
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
        optionData.$toolbarSpan.attr('title', optionData.$toolbarSpan.attr('title') + (options.hotkeys? ' (' + options.hotkeys + ')': ''));
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
   * Removes an existing file menu and/or toolbar option.
   * @function wcMenu#removeOption
   * @param {String} categoryName - The top level category to place this option in the menu.
   * @param {String} name - The name to display for the option.
   * @param {wcMenu~MenuOptions} options - Custom options for the menu item.
   * @returns {Boolean} - Success or failure.
   */
  removeOption: function(categoryName, name) {
    if (!name || !categoryName) {
      return false;
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

    if (!category) {
      return false;
    }

    var optionData = null;
    for (var i = 0; i < category.items.length; ++i) {
      if (category.items[i].name === name) {
        optionData = category.items[i];
        category.items.splice(i, 1);
        break;
      }
    }

    if (!optionData) {
      return false;
    }

    optionData.$item.remove();
    optionData.$toolbar.remove();

    if (optionData.$spacer) {
      optionData.$spacer.remove();
    }

    if (optionData.$toolbarSpacer) {
      optionData.$toolbarSpacer.remove();
    }
  },

  /**
   * Adds a spacer to a menu list.
   * @function wcMenu#addSpacer
   * @param {String} categoryName - The top level category to place this spacer in the menu.
   * @param {Number} name - The name of the menu option, the spacer is inserted after.
   * @returns {Boolean} - Success or failure.
   */
  addSpacer: function(categoryName, name) {
    if (!name || !categoryName) {
      return false;
    }

    // Find the category if it exists.
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

    var optionData = null;
    for (var i = 0; i < category.items.length; ++i) {
      if (category.items[i].name === name) {
        optionData = category.items[i];
        break;
      }
    }

    if (!optionData) {
      return false;
    }

    optionData.$spacer = $('<li><hr class="wcMenuSeparator"></li>');
    optionData.$spacer.insertAfter(optionData.$item);
    return true;
  },

  /**
   * Removes an existing spacer from the menu list.
   * @function wcMenu#removeSpacer
   * @param {String} categoryName - The top level category where this spacer can be found.
   * @param {Number} name - The name of the menu option to remove the spacer from.
   * @returns {Boolean} - Success or failure.
   */
  removeSpacer: function(categoryName, name) {
    if (!name || !categoryName) {
      return false;
    }

    // Find the category if it exists.
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

    var optionData = null;
    for (var i = 0; i < category.items.length; ++i) {
      if (category.items[i].name === name) {
        optionData = category.items[i];
        break;
      }
    }

    if (!optionData) {
      return false;
    }

    if (optionData.$spacer) {
      optionData.$spacer.remove();
    }
    return true;
  },

  /**
   * Adds a spacer to the toolbar.
   * @function wcMenu#addToolbarSpacer
   * @param {String} categoryName - The top level category to place this spacer in the menu.
   * @param {Number} name - The name of the toolbar option, the spacer is inserted after.
   * @returns {Boolean} - Success or failure.
   */
  addToolbarSpacer: function(categoryName, name) {
    if (!name || !categoryName) {
      return false;
    }

    // Find the category if it exists.
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

    var optionData = null;
    for (var i = 0; i < category.items.length; ++i) {
      if (category.items[i].name === name) {
        optionData = category.items[i];
        break;
      }
    }

    if (!optionData) {
      return false;
    }

    if (optionData.$toolbar) {
      optionData.$toolbarSpacer = $('<div class="wcMenuSeparator"></div>');
      optionData.$toolbarSpacer.insertAfter(optionData.$toolbar);
    }
    return true;
  },

  /**
   * Removes an existing spacer from the toolbar.
   * @function wcMenu#removeToolbarSpacer
   * @param {String} categoryName - The top level category where this spacer can be found.
   * @param {Number} name - The name of the toolbar option to remove the spacer from.
   * @returns {Boolean} - Success or failure.
   */
  removeToolbarSpacer: function(categoryName, name) {
    if (!name || !categoryName) {
      return false;
    }

    // Find the category if it exists.
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

    var optionData = null;
    for (var i = 0; i < category.items.length; ++i) {
      if (category.items[i].name === name) {
        optionData = category.items[i];
        break;
      }
    }

    if (!optionData) {
      return false;
    }

    if (optionData.$toolbarSpacer) {
      optionData.$toolbarSpacer.remove();
    }
    return true;
  },

  /**
   * Replaces the activation handler for an existing option.
   * @function wcMenu#optionOnActivated
   * @param {String} categoryName - The top level category of the option.
   * @param {String} name - The name of the option.
   * @param {wcMenu~OnActivation} onActivated - A handler to call when the option is activated.
   * @returns {Boolean} - Success or failure.
   */
  optionOnActivated: function(categoryName, name, onActivated) {
    if (!name || !categoryName) {
      return false;
    }

    if (typeof onActivated !== 'function') {
      return false;
    }

    // Find the category if it exists.
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

    var optionData = null;
    for (var i = 0; i < category.items.length; ++i) {
      if (category.items[i].name === name) {
        optionData = category.items[i];
        break;
      }
    }

    if (!optionData) {
      return false;
    }

    optionData.click = onActivated;
    return true;
  },

  /**
   * Replaces the display for an existing option.
   * @function wcMenu#optionDisplay
   * @param {String} categoryName - The top level category of the option.
   * @param {String} name - The name of the option.
   * @param {wcMenu~MenuDisplayFunc} [display] - A function that returns the display text that should be shown on the menu option item. If not supplied, the default menu name will be applied.
   * @returns {Boolean} - Success or failure.
   */
  optionDisplay: function(categoryName, name, display) {
    if (!name || !categoryName) {
      return false;
    }

    // Find the category if it exists.
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

    var optionData = null;
    for (var i = 0; i < category.items.length; ++i) {
      if (category.items[i].name === name) {
        optionData = category.items[i];
        break;
      }
    }

    if (!optionData) {
      return false;
    }

    if (typeof display !== 'function') {
      optionData.display = undefined;
      delete optionData.display;
    } else {
      optionData.display = display;
    }
    return true;
  },

  /**
   * Replaces the toggle function for an existing option.
   * @function wcMenu#optionToggle
   * @param {String} categoryName - The top level category of the option.
   * @param {String} name - The name of the option.
   * @param {wcMenu~MenuToggleFunc} [toggle] - A function that returns the toggle state of the menu option item. If not supplied, option will no longer toggle.
   * @returns {Boolean} - Success or failure.
   */
  optionToggle: function(categoryName, name, toggle) {
    if (!name || !categoryName) {
      return false;
    }

    // Find the category if it exists.
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

    var optionData = null;
    for (var i = 0; i < category.items.length; ++i) {
      if (category.items[i].name === name) {
        optionData = category.items[i];
        break;
      }
    }

    if (!optionData) {
      return false;
    }

    if (typeof toggle !== 'function') {
      optionData.toggle = undefined;
      delete optionData.toggle;

      optionData.$icon.removeClass('wcButtonActive');
      if (item.$toolbarIcon) {
        optionData.$toolbarIcon.parent().removeClass('wcButtonActive');
      }
    } else {
      optionData.toggle = toggle;
    }
    return true;
  },

  /**
   * Replaces the icon for an existing option.
   * @function wcMenu#optionIcon
   * @param {String} categoryName - The top level category of the option.
   * @param {String} name - The name of the option.
   * @param {String|wcMenu~MenuIconFunc} [icon] - A classname to apply as an icon for the option.  If this is a function, it will be called during the update call and should return the icon class.
   * @returns {Boolean} - Success or failure.
   */
  optionIcon: function(categoryName, name, icon) {
    if (!name || !categoryName) {
      return false;
    }

    // Find the category if it exists.
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

    var optionData = null;
    for (var i = 0; i < category.items.length; ++i) {
      if (category.items[i].name === name) {
        optionData = category.items[i];
        break;
      }
    }

    if (!optionData) {
      return false;
    }

    if (typeof icon !== 'function') {
      optionData.icon = undefined;
      delete optionData.icon;

      if (typeof icon === 'string') {
        optionData.$icon.children('i').removeClass().addClass('' + icon);
        if (optionData.$toolbar) {
          optionData.$toolbarIcon.removeClass().addClass('' + icon);
        }
      }
    } else {
      optionData.icon = icon;
    }
    return true;
  },


  /**
   * Replaces the description for an existing option.
   * @function wcMenu#optionCondition
   * @param {String} categoryName - The top level category of the option.
   * @param {String} name - The name of the option.
   * @param {String|wcMenu~MenuDescriptionFunc} [description] - The description to show as a tooltip for this option.
   * @returns {Boolean} - Success or failure.
   */
  optionDescription: function(categoryName, name, description) {
    if (!name || !categoryName) {
      return false;
    }

    // Find the category if it exists.
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

    var optionData = null;
    for (var i = 0; i < category.items.length; ++i) {
      if (category.items[i].name === name) {
        optionData = category.items[i];
        break;
      }
    }

    if (!optionData) {
      return false;
    }

    if (typeof description !== 'function') {
      optionData.description = undefined;
      delete optionData.description;

      if (typeof description === 'string') {
        optionData.$itemSpan.attr('title', description);
        if (optionData.$toolbar) {
          optionData.$toolbarSpan.attr('title', description + (item.hotkeyString? ' (' + item.hotkeyString + ')': ''));
        }
      }
    } else {
      optionData.description = description;
    }
    return true;
  },

  /**
   * Replaces the hotkeys for an existing option.
   * @function wcMenu#optionHotkeys
   * @param {String} categoryName - The top level category of the option.
   * @param {String} name - The name of the option.
   * @property {String} [hotkeys] - A string that describes hotkeys for your control, the format is 'Ctrl+Z' or 'Alt+Shift+L,Shift+L' for multiple.
   * @returns {Boolean} - Success or failure.
   */
  optionHotkeys: function(categoryName, name, hotkeys) {
    if (!name || !categoryName) {
      return false;
    }

    // Find the category if it exists.
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

    var optionData = null;
    for (var i = 0; i < category.items.length; ++i) {
      if (category.items[i].name === name) {
        optionData = category.items[i];
        break;
      }
    }

    if (!optionData) {
      return false;
    }

    if (typeof hotkeys === 'string') {
      optionData.hotkeys = [];

      var optionHotkeys = (hotkeys.indexOf(',') > -1? hotkeys.split(','): [hotkeys]);

      for (var i = 0; i < optionHotkeys.length; ++i) {
        var hotkey = optionHotkeys[i].toLowerCase();
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

      optionData.$hotkey.text(hotkeys);
      if (optionData.$toolbar) {
        var title = optionData.$toolbarSpan.attr('title');
        if (optionData.hotkeyString) {
          title = title.replace(' (' + optionData.hotkeyString + ')', '');
        }

        optionData.$toolbarSpan.attr('title', title + (hotkeys? ' (' + hotkeys + ')': ''));
      }
      optionData.hotkeyString = hotkeys;
    }
    return true;
  },

  /**
   * Replaces the condition for an existing option.
   * @function wcMenu#optionCondition
   * @param {String} categoryName - The top level category of the option.
   * @param {String} name - The name of the option.
   * @param {Function} [condition] - A function to call during the update to determine if the menu option should be enabled or disabled. Return false to disable the option.
   * @returns {Boolean} - Success or failure.
   */
  optionCondition: function(categoryName, name, condition) {
    if (!name || !categoryName) {
      return false;
    }

    // Find the category if it exists.
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

    var optionData = null;
    for (var i = 0; i < category.items.length; ++i) {
      if (category.items[i].name === name) {
        optionData = category.items[i];
        break;
      }
    }

    if (!optionData) {
      return false;
    }

    if (typeof condition !== 'function') {
      optionData.condition = undefined;
      delete optionData.condition;
    } else {
      optionData.condition = condition;
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
              event.stopPropagation();
              event.preventDefault();
              return false;
            }
          }
        }
      }
    }
  },
};
