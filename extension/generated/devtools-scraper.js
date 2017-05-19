(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.contentScraper = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var jquery = require('jquery-deferred');
/**
 * @url http://jsperf.com/blob-base64-conversion
 * @type {{blobToBase64: blobToBase64, base64ToBlob: base64ToBlob}}
 */
var Base64 = {

  blobToBase64: function (blob) {
    var deferredResponse = jquery.Deferred();
    var reader = new FileReader();
    reader.onload = function () {
      var dataUrl = reader.result;
      var base64 = dataUrl.split(',')[1];
      deferredResponse.resolve(base64);
    };
    reader.readAsDataURL(blob);

    return deferredResponse.promise();
  },

  base64ToBlob: function (base64, mimeType) {
    var deferredResponse = jquery.Deferred();
    var binary = atob(base64);
    var len = binary.length;
    var buffer = new ArrayBuffer(len);
    var view = new Uint8Array(buffer);
    for (var i = 0; i < len; i++) {
      view[i] = binary.charCodeAt(i);
    }
    var blob = new Blob([view], { type: mimeType });
    deferredResponse.resolve(blob);

    return deferredResponse.promise();
  }
};

module.exports = Base64;

},{"jquery-deferred":29}],2:[function(require,module,exports){
var jquery = require('jquery-deferred');
/**
 * @author Martins Balodis
 *
 * An alternative version of $.when which can be used to execute asynchronous
 * calls sequentially one after another.
 *
 * @returns jqueryDeferred().promise()
 */
module.exports = function whenCallSequentially(functionCalls) {
  var deferredResonse = jquery.Deferred();
  var resultData = [];

  // nothing to do
  if (functionCalls.length === 0) {
    return deferredResonse.resolve(resultData).promise();
  }

  var currentDeferred = functionCalls.shift()();
  // execute synchronous calls synchronously
  while (currentDeferred.state() === 'resolved') {
    currentDeferred.done(function (data) {
      resultData.push(data);
    });
    if (functionCalls.length === 0) {
      return deferredResonse.resolve(resultData).promise();
    }
    currentDeferred = functionCalls.shift()();
  }

  // handle async calls
  var interval = setInterval(function () {
    // handle mixed sync calls
    while (currentDeferred.state() === 'resolved') {
      currentDeferred.done(function (data) {
        resultData.push(data);
      });
      if (functionCalls.length === 0) {
        clearInterval(interval);
        deferredResonse.resolve(resultData);
        break;
      }
      currentDeferred = functionCalls.shift()();
    }
  }, 10);

  return deferredResonse.promise();
};

},{"jquery-deferred":29}],3:[function(require,module,exports){
var StoreDevtools = require('./StoreDevtools');
var SitemapController = require('./Controller');

$(function () {
  // init bootstrap alerts
  $('.alert').alert();

  var store = new StoreDevtools({ $, document, window });
  new SitemapController({
    store: store,
    templateDir: 'views/'
  }, { $, document, window });
});

},{"./Controller":7,"./StoreDevtools":24}],4:[function(require,module,exports){
var jquery = require('jquery-deferred');
/**
 * ContentScript that can be called from anywhere within the extension
 */
var BackgroundScript = {

  dummy: function () {
    return jquery.Deferred().resolve('dummy').promise();
  },

  /**
   * Returns the id of the tab that is visible to user
   * @returns jquery.Deferred() integer
   */
  getActiveTabId: function () {
    var deferredResponse = jquery.Deferred();

    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, function (tabs) {
      if (tabs.length < 1) {
        // @TODO must be running within popup. maybe find another active window?
        deferredResponse.reject("couldn't find the active tab");
      } else {
        var tabId = tabs[0].id;
        deferredResponse.resolve(tabId);
      }
    });
    return deferredResponse.promise();
  },

  /**
   * Execute a function within the active tab within content script
   * @param request.fn	function to call
   * @param request.request	request that will be passed to the function
   */
  executeContentScript: function (request) {
    var reqToContentScript = {
      contentScriptCall: true,
      fn: request.fn,
      request: request.request
    };
    var deferredResponse = jquery.Deferred();
    var deferredActiveTabId = this.getActiveTabId();
    deferredActiveTabId.done(function (tabId) {
      chrome.tabs.sendMessage(tabId, reqToContentScript, function (response) {
        deferredResponse.resolve(response);
      });
    });

    return deferredResponse;
  }
};

module.exports = BackgroundScript;

},{"jquery-deferred":29}],5:[function(require,module,exports){
var ContentSelector = require('./ContentSelector');
var jquery = require('jquery-deferred');
/**
 * ContentScript that can be called from anywhere within the extension
 */
var ContentScript = {

  /**
   * Fetch
   * @param request.CSSSelector	css selector as string
   * @returns jquery.Deferred()
   */
  getHTML: function (request, options) {
    var $ = options.$;
    var deferredHTML = jquery.Deferred();
    var html = $(request.CSSSelector).clone().wrap('<p>').parent().html();
    deferredHTML.resolve(html);
    return deferredHTML.promise();
  },

  /**
   * Removes current content selector if is in use within the page
   * @returns jquery.Deferred()
   */
  removeCurrentContentSelector: function () {
    var deferredResponse = jquery.Deferred();
    var contentSelector = window.cs;
    if (contentSelector === undefined) {
      deferredResponse.resolve();
    } else {
      contentSelector.removeGUI();
      window.cs = undefined;
      deferredResponse.resolve();
    }

    return deferredResponse.promise();
  },

  /**
   * Select elements within the page
   * @param request.parentCSSSelector
   * @param request.allowedElements
   */
  selectSelector: function (request, options) {
    var $ = options.$;
    var deferredResponse = jquery.Deferred();

    this.removeCurrentContentSelector().done(function () {
      var contentSelector = new ContentSelector({
        parentCSSSelector: request.parentCSSSelector,
        allowedElements: request.allowedElements
      }, { $, document, window });
      window.cs = contentSelector;

      var deferredCSSSelector = contentSelector.getCSSSelector();
      deferredCSSSelector.done(function (response) {
        this.removeCurrentContentSelector().done(function () {
          deferredResponse.resolve(response);
          window.cs = undefined;
        });
      }.bind(this)).fail(function (message) {
        deferredResponse.reject(message);
        window.cs = undefined;
      });
    }.bind(this));

    return deferredResponse.promise();
  },

  /**
   * Preview elements
   * @param request.parentCSSSelector
   * @param request.elementCSSSelector
   */
  previewSelector: function (request, options) {
    var $ = options.$;
    var deferredResponse = jquery.Deferred();
    this.removeCurrentContentSelector().done(function () {
      var contentSelector = new ContentSelector({
        parentCSSSelector: request.parentCSSSelector
      }, { $, document, window });
      window.cs = contentSelector;

      var deferredSelectorPreview = contentSelector.previewSelector(request.elementCSSSelector);
      deferredSelectorPreview.done(function () {
        deferredResponse.resolve();
      }).fail(function (message) {
        deferredResponse.reject(message);
        window.cs = undefined;
      });
    });
    return deferredResponse;
  }
};

module.exports = ContentScript;

},{"./ContentSelector":6,"jquery-deferred":29}],6:[function(require,module,exports){
var ElementQuery = require('./ElementQuery');
var jquery = require('jquery-deferred');
var CssSelector = require('css-selector').CssSelector;
/**
 * @param options.parentCSSSelector	Elements can be only selected within this element
 * @param options.allowedElements	Elements that can only be selected
 * @constructor
 */
var ContentSelector = function (options, moreOptions) {
  // deferred response
  this.deferredCSSSelectorResponse = jquery.Deferred();

  this.allowedElements = options.allowedElements;
  this.parentCSSSelector = options.parentCSSSelector.trim();
  this.alert = options.alert || function (txt) {
    alert(txt);
  };

  this.$ = moreOptions.$;
  this.document = moreOptions.document;
  this.window = moreOptions.window;
  if (!this.$) throw new Error('Missing jquery in content selector');
  if (!this.document) throw new Error("Missing document");
  if (!this.window) throw new Error("Missing window");
  if (this.parentCSSSelector) {
    this.parent = this.$(this.parentCSSSelector)[0];

    //  handle situation when parent selector not found
    if (this.parent === undefined) {
      this.deferredCSSSelectorResponse.reject('parent selector not found');
      this.alert('Parent element not found!');
    }
  } else {
    this.parent = this.$('body')[0];
  }
};

ContentSelector.prototype = {

  /**
   * get css selector selected by the user
   */
  getCSSSelector: function (request) {
    if (this.deferredCSSSelectorResponse.state() !== 'rejected') {
      // elements that are selected by the user
      this.selectedElements = [];
      // element selected from top
      this.top = 0;

      // initialize css selector
      this.initCssSelector(false);

      this.initGUI();
    }

    return this.deferredCSSSelectorResponse.promise();
  },

  getCurrentCSSSelector: function () {
    if (this.selectedElements && this.selectedElements.length > 0) {
      var cssSelector;

      // handle special case when parent is selected
      if (this.isParentSelected()) {
        if (this.selectedElements.length === 1) {
          cssSelector = '_parent_';
        } else if (this.$('#-selector-toolbar [name=diferentElementSelection]').prop('checked')) {
          var selectedElements = this.selectedElements.clone();
          selectedElements.splice(selectedElements.indexOf(this.parent), 1);
          cssSelector = '_parent_, ' + this.cssSelector.getCssSelector(selectedElements, this.top);
        } else {
          // will trigger error where multiple selections are not allowed
          cssSelector = this.cssSelector.getCssSelector(this.selectedElements, this.top);
        }
      } else {
        cssSelector = this.cssSelector.getCssSelector(this.selectedElements, this.top);
      }

      return cssSelector;
    }
    return '';
  },

  isParentSelected: function () {
    return this.selectedElements.indexOf(this.parent) !== -1;
  },

  /**
   * initialize or reconfigure css selector class
   * @param allowMultipleSelectors
   */
  initCssSelector: function (allowMultipleSelectors) {
    this.cssSelector = new CssSelector({
      enableSmartTableSelector: true,
      parent: this.parent,
      allowMultipleSelectors: allowMultipleSelectors,
      ignoredClasses: ['-sitemap-select-item-selected', '-sitemap-select-item-hover', '-sitemap-parent', '-web-scraper-img-on-top', '-web-scraper-selection-active'],
      query: this.$
    });
  },

  previewSelector: function (elementCSSSelector) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    if (this.deferredCSSSelectorResponse.state() !== 'rejected') {
      this.highlightParent();
      $(ElementQuery(elementCSSSelector, this.parent, { $, document, window })).addClass('-sitemap-select-item-selected');
      this.deferredCSSSelectorResponse.resolve();
    }

    return this.deferredCSSSelectorResponse.promise();
  },

  initGUI: function () {
    var document = this.document;
    this.highlightParent();

    // all elements except toolbar
    this.$allElements = this.$(this.allowedElements + ':not(#-selector-toolbar):not(#-selector-toolbar *)', this.parent);
    // allow selecting parent also
    if (this.parent !== document.body) {
      this.$allElements.push(this.parent);
    }

    this.bindElementHighlight();
    this.bindElementSelection();
    this.bindKeyboardSelectionManipulations();
    this.attachToolbar();
    this.bindMultipleGroupCheckbox();
    this.bindMultipleGroupPopupHide();
    this.bindMoveImagesToTop();
  },

  bindElementSelection: function () {
    this.$allElements.bind('click.elementSelector', function (e) {
      var element = e.currentTarget;
      if (this.selectedElements.indexOf(element) === -1) {
        this.selectedElements.push(element);
      }
      this.highlightSelectedElements();

      // Cancel all other events
      return false;
    }.bind(this));
  },

  /**
   * Add to select elements the element that is under the mouse
   */
  selectMouseOverElement: function () {
    var element = this.mouseOverElement;
    if (element) {
      this.selectedElements.push(element);
      this.highlightSelectedElements();
    }
  },

  bindElementHighlight: function () {
    var $ = this.$;
    $(this.$allElements).bind('mouseover.elementSelector', function (e) {
      var element = e.currentTarget;
      this.mouseOverElement = element;
      $(element).addClass('-sitemap-select-item-hover');
      return false;
    }.bind(this)).bind('mouseout.elementSelector', function (e) {
      var element = e.currentTarget;
      this.mouseOverElement = null;
      $(element).removeClass('-sitemap-select-item-hover');
      return false;
    }.bind(this));
  },

  bindMoveImagesToTop: function () {
    var $ = this.$;
    $('body').addClass('-web-scraper-selection-active');

    // do this only when selecting images
    if (this.allowedElements === 'img') {
      $('img').filter(function (i, element) {
        return $(element).css('position') === 'static';
      }).addClass('-web-scraper-img-on-top');
    }
  },

  unbindMoveImagesToTop: function () {
    this.$('body.-web-scraper-selection-active').removeClass('-web-scraper-selection-active');
    this.$('img.-web-scraper-img-on-top').removeClass('-web-scraper-img-on-top');
  },

  selectChild: function () {
    this.top--;
    if (this.top < 0) {
      this.top = 0;
    }
  },
  selectParent: function () {
    this.top++;
  },

  // User with keyboard arrows can select child or paret elements of selected elements.
  bindKeyboardSelectionManipulations: function () {
    var $ = this.$;
    var document = this.document;
    // check for focus
    var lastFocusStatus;
    this.keyPressFocusInterval = setInterval(function () {
      var focus = document.hasFocus();
      if (focus === lastFocusStatus) return;
      lastFocusStatus = focus;

      $('#-selector-toolbar .key-button').toggleClass('hide', !focus);
      $('#-selector-toolbar .key-events').toggleClass('hide', focus);
    }, 200);

    // Using up/down arrows user can select elements from top of the
    // selected element
    $(document).bind('keydown.selectionManipulation', function (event) {
      // select child C
      if (event.keyCode === 67) {
        this.animateClickedKey($('#-selector-toolbar .key-button-child'));
        this.selectChild();
      }
      // select parent P
      else if (event.keyCode === 80) {
          this.animateClickedKey($('#-selector-toolbar .key-button-parent'));
          this.selectParent();
        }
        // select element
        else if (event.keyCode === 83) {
            this.animateClickedKey($('#-selector-toolbar .key-button-select'));
            this.selectMouseOverElement();
          }

      this.highlightSelectedElements();
    }.bind(this));
  },

  animateClickedKey: function (element) {
    var $ = this.$;
    $(element).removeClass('clicked').removeClass('clicked-animation');
    setTimeout(function () {
      $(element).addClass('clicked');
      setTimeout(function () {
        $(element).addClass('clicked-animation');
      }, 100);
    }, 1);
  },

  highlightSelectedElements: function () {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    try {
      var resultCssSelector = this.getCurrentCSSSelector();

      $('body #-selector-toolbar .selector').text(resultCssSelector);
      // highlight selected elements
      $('.-sitemap-select-item-selected').removeClass('-sitemap-select-item-selected');
      $(ElementQuery(resultCssSelector, this.parent, { $, document, window })).addClass('-sitemap-select-item-selected');
    } catch (err) {
      if (err === 'found multiple element groups, but allowMultipleSelectors disabled') {
        console.log('extension/scripts/ContentSelector.js:267:20:\'multiple different element selection disabled\'', 'multiple different element selection disabled');

        this.showMultipleGroupPopup();
        // remove last added element
        this.selectedElements.pop();
        this.highlightSelectedElements();
      }
    }
  },

  showMultipleGroupPopup: function () {
    this.$('#-selector-toolbar .popover').attr('style', 'display:block !important;');
  },

  hideMultipleGroupPopup: function () {
    this.$('#-selector-toolbar .popover').attr('style', '');
  },

  bindMultipleGroupPopupHide: function () {
    this.$('#-selector-toolbar .popover .close').click(this.hideMultipleGroupPopup.bind(this));
  },

  unbindMultipleGroupPopupHide: function () {
    this.$('#-selector-toolbar .popover .close').unbind('click');
  },

  bindMultipleGroupCheckbox: function () {
    var $ = this.$;
    $('#-selector-toolbar [name=diferentElementSelection]').change(function (e) {
      if ($(e.currentTarget).is(':checked')) {
        this.initCssSelector(true);
      } else {
        this.initCssSelector(false);
      }
    }.bind(this));
  },
  unbindMultipleGroupCheckbox: function () {
    this.$('#-selector-toolbar .diferentElementSelection').unbind('change');
  },

  attachToolbar: function () {
    var $ = this.$;
    var $toolbar = '<div id="-selector-toolbar">' + '<div class="list-item"><div class="selector-container"><div class="selector"></div></div></div>' + '<div class="input-group-addon list-item">' + '<input type="checkbox" title="Enable different type element selection" name="diferentElementSelection">' + '<div class="popover top">' + '<div class="close">×</div>' + '<div class="arrow"></div>' + '<div class="popover-content">' + '<div class="txt">' + 'Different type element selection is disabled. If the element ' + 'you clicked should also be included then enable this and ' + 'click on the element again. Usually this is not needed.' + '</div>' + '</div>' + '</div>' + '</div>' + '<div class="list-item key-events"><div title="Click here to enable key press events for selection">Enable key events</div></div>' + '<div class="list-item key-button key-button-select hide" title="Use S key to select element">S</div>' + '<div class="list-item key-button key-button-parent hide" title="Use P key to select parent">P</div>' + '<div class="list-item key-button key-button-child hide" title="Use C key to select child">C</div>' + '<div class="list-item done-selecting-button">Done selecting!</div>' + '</div>';
    $('body').append($toolbar);

    $('body #-selector-toolbar .done-selecting-button').click(function () {
      this.selectionFinished();
    }.bind(this));
  },
  highlightParent: function () {
    var $ = this.$;
    // do not highlight parent if its the body
    if (!$(this.parent).is('body') && !$(this.parent).is('#webpage')) {
      $(this.parent).addClass('-sitemap-parent');
    }
  },

  unbindElementSelection: function () {
    var $ = this.$;
    $(this.$allElements).unbind('click.elementSelector');
    // remove highlighted element classes
    this.unbindElementSelectionHighlight();
  },
  unbindElementSelectionHighlight: function () {
    this.$('.-sitemap-select-item-selected').removeClass('-sitemap-select-item-selected');
    this.$('.-sitemap-parent').removeClass('-sitemap-parent');
  },
  unbindElementHighlight: function () {
    this.$(this.$allElements).unbind('mouseover.elementSelector').unbind('mouseout.elementSelector');
  },
  unbindKeyboardSelectionMaipulatios: function () {
    this.$(document).unbind('keydown.selectionManipulation');
    clearInterval(this.keyPressFocusInterval);
  },
  removeToolbar: function () {
    this.$('body #-selector-toolbar a').unbind('click');
    this.$('#-selector-toolbar').remove();
  },

  /**
   * Remove toolbar and unbind events
   */
  removeGUI: function () {
    this.unbindElementSelection();
    this.unbindElementHighlight();
    this.unbindKeyboardSelectionMaipulatios();
    this.unbindMultipleGroupPopupHide();
    this.unbindMultipleGroupCheckbox();
    this.unbindMoveImagesToTop();
    this.removeToolbar();
  },

  selectionFinished: function () {
    var resultCssSelector = this.getCurrentCSSSelector();

    this.deferredCSSSelectorResponse.resolve({
      CSSSelector: resultCssSelector
    });
  }
};

module.exports = ContentSelector;

},{"./ElementQuery":8,"css-selector":28,"jquery-deferred":29}],7:[function(require,module,exports){
var selectors = require('./Selectors');
var Selector = require('./Selector');
var SelectorTable = selectors.SelectorTable;
var Sitemap = require('./Sitemap');
// var SelectorGraphv2 = require('./SelectorGraphv2')
var getBackgroundScript = require('./getBackgroundScript');
var getContentScript = require('./getContentScript');
var SitemapController = function (options, moreOptions) {
  this.$ = moreOptions.$;
  this.document = moreOptions.document;
  this.window = moreOptions.window;
  if (!this.$) throw new Error('Missing jquery in Controller');
  if (!this.document) throw new Error("Missing document");
  if (!this.window) throw new Error("Missing window");
  for (var i in options) {
    this[i] = options[i];
  }
  this.init();
};

SitemapController.prototype = {

  backgroundScript: getBackgroundScript('DevTools'),
  contentScript: getContentScript('DevTools'),

  control: function (controls) {
    var controller = this;

    for (var selector in controls) {
      for (var event in controls[selector]) {
        this.$(document).on(event, selector, function (selector, event) {
          return function () {
            var continueBubbling = controls[selector][event].call(controller, this);
            if (continueBubbling !== true) {
              return false;
            }
          };
        }(selector, event));
      }
    }
  },

  /**
   * Loads templates for ICanHaz
   */
  loadTemplates: function (cbAllTemplatesLoaded) {
    var templateIds = ['Viewport', 'SitemapList', 'SitemapListItem', 'SitemapCreate', 'SitemapStartUrlField', 'SitemapImport', 'SitemapExport', 'SitemapBrowseData', 'SitemapHeadlessScrapeConfig', 'SitemapScrapeConfig', 'SitemapExportDataCSV', 'SitemapEditMetadata', 'SelectorList', 'SelectorListItem', 'SelectorEdit', 'SelectorEditTableColumn',
    // 'SitemapSelectorGraph',
    'DataPreview'];
    var templatesLoaded = 0;
    var cbLoaded = function (templateId, template) {
      templatesLoaded++;
      ich.addTemplate(templateId, template);
      if (templatesLoaded === templateIds.length) {
        cbAllTemplatesLoaded();
      }
    };

    templateIds.forEach(function (templateId) {
      this.$.get(this.templateDir + templateId + '.html', cbLoaded.bind(this, templateId));
    }.bind(this));
  },

  init: function () {
    this.loadTemplates(function () {
      // currently viewed objects
      this.clearState();

      // render main viewport
      ich.Viewport().appendTo('body');

      // cancel all form submits
      this.$('form').bind('submit', function () {
        return false;
      });

      this.control({
        '#sitemaps-nav-button': {
          click: this.showSitemaps
        },
        '#create-sitemap-create-nav-button': {
          click: this.showCreateSitemap
        },
        '#create-sitemap-import-nav-button': {
          click: this.showImportSitemapPanel
        },
        '#sitemap-export-nav-button': {
          click: this.showSitemapExportPanel
        },
        '#sitemap-export-data-csv-nav-button': {
          click: this.showSitemapExportDataCsvPanel
        },
        '#submit-create-sitemap': {
          click: this.createSitemap
        },
        '#submit-import-sitemap': {
          click: this.importSitemap
        },
        '#sitemap-edit-metadata-nav-button': {
          click: this.editSitemapMetadata
        },
        '#sitemap-selector-list-nav-button': {
          click: this.showSitemapSelectorList
        }, /*,        '#sitemap-selector-graph-nav-button': {
           click: this.showSitemapSelectorGraph
           } */
        '#sitemap-browse-nav-button': {
          click: this.browseSitemapData
        },
        'button#submit-edit-sitemap': {
          click: this.editSitemapMetadataSave
        },
        '#edit-sitemap-metadata-form': {
          submit: function () {
            return false;
          }
        },
        '#sitemaps tr': {
          click: this.editSitemap
        },
        '#sitemaps button[action=delete-sitemap]': {
          click: this.deleteSitemap
        },
        '#sitemap-scrape-nav-button': {
          click: this.showScrapeSitemapConfigPanel

        },
        '#sitemap-headless-scrape-nav-button': {
          click: this.showHeadlessScrapeSitemapConfigPanel
        },
        '#submit-scrape-sitemap-form': {
          submit: function () {
            return false;
          }
        },
        '#submit-scrape-sitemap': {
          click: this.scrapeSitemap
        },
        '#submit-headless-scrape-sitemap': {
          click: this.headlessScrapeSitemap
        },
        '#sitemaps button[action=browse-sitemap-data]': {
          click: this.sitemapListBrowseSitemapData
        },
        '#sitemaps button[action=csv-download-sitemap-data]': {
          click: this.downloadSitemapData
        },
        // @TODO move to tr
        '#selector-tree tbody tr': {
          click: this.showChildSelectors
        },
        '#selector-tree .breadcrumb a': {
          click: this.treeNavigationshowSitemapSelectorList
        },
        '#selector-tree tr button[action=edit-selector]': {
          click: this.editSelector
        },
        '#edit-selector select[name=type]': {
          change: this.selectorTypeChanged
        },
        '#edit-selector button[action=save-selector]': {
          click: this.saveSelector
        },
        '#edit-selector button[action=cancel-selector-editing]': {
          click: this.cancelSelectorEditing
        },
        '#edit-selector #selectorId': {
          keyup: this.updateSelectorParentListOnIdChange
        },
        '#selector-tree button[action=add-selector]': {
          click: this.addSelector
        },
        '#selector-tree tr button[action=delete-selector]': {
          click: this.deleteSelector
        },
        '#selector-tree tr button[action=preview-selector]': {
          click: this.previewSelectorFromSelectorTree
        },
        '#selector-tree tr button[action=data-preview-selector]': {
          click: this.previewSelectorDataFromSelectorTree
        },
        '#edit-selector button[action=select-selector]': {
          click: this.selectSelector
        },
        '#edit-selector button[action=select-table-header-row-selector]': {
          click: this.selectTableHeaderRowSelector
        },
        '#edit-selector button[action=select-table-data-row-selector]': {
          click: this.selectTableDataRowSelector
        },
        '#edit-selector button[action=preview-selector]': {
          click: this.previewSelector
        },
        '#edit-selector button[action=preview-click-element-selector]': {
          click: this.previewClickElementSelector
        },
        '#edit-selector button[action=preview-table-row-selector]': {
          click: this.previewTableRowSelector
        },
        '#edit-selector button[action=preview-selector-data]': {
          click: this.previewSelectorDataFromSelectorEditing
        },
        'button.add-extra-start-url': {
          click: this.addStartUrl
        },
        'button.remove-start-url': {
          click: this.removeStartUrl
        }
      });
      this.showSitemaps();
    }.bind(this));
  },

  clearState: function () {
    this.state = {
      // sitemap that is currently open
      currentSitemap: null,
      // selector ids that are shown in the navigation
      editSitemapBreadcumbsSelectors: null,
      currentParentSelectorId: null,
      currentSelector: null
    };
  },

  setStateEditSitemap: function (sitemap) {
    this.state.currentSitemap = sitemap;
    this.state.editSitemapBreadcumbsSelectors = [{ id: '_root' }];
    this.state.currentParentSelectorId = '_root';
  },

  setActiveNavigationButton: function (navigationId) {
    this.$('.nav .active').removeClass('active');
    this.$('#' + navigationId + '-nav-button').closest('li').addClass('active');

    if (navigationId.match(/^sitemap-/)) {
      this.$('#sitemap-nav-button').removeClass('disabled');
      this.$('#sitemap-nav-button').closest('li').addClass('active');
      this.$('#navbar-active-sitemap-id').text('(' + this.state.currentSitemap._id + ')');
    } else {
      this.$('#sitemap-nav-button').addClass('disabled');
      this.$('#navbar-active-sitemap-id').text('');
    }

    if (navigationId.match(/^create-sitemap-/)) {
      this.$('#create-sitemap-nav-button').closest('li').addClass('active');
    }
  },

  /**
   * Simple info popup for sitemap start url input field
   */
  initMultipleStartUrlHelper: function () {
    this.$('#startUrl').popover({
      title: 'Multiple start urls',
      html: true,
      content: 'You can create ranged start urls like this:<br />http://example.com/[1-100].html',
      placement: 'bottom'
    }).blur(function () {
      this.$(this).popover('hide');
    });
  },

  /**
   * Returns bootstrapValidator object for current form in viewport
   */
  getFormValidator: function () {
    var validator = this.$('#viewport form').data('bootstrapValidator');
    return validator;
  },

  /**
   * Returns whether current form in the viewport is valid
   * @returns {Boolean}
   */
  isValidForm: function () {
    var validator = this.getFormValidator();

    // validator.validate();
    // validate method calls submit which is not needed in this case.
    for (var field in validator.options.fields) {
      validator.validateField(field);
    }

    var valid = validator.isValid();
    return valid;
  },

  /**
   * Add validation to sitemap creation or editing form
   */
  initSitemapValidation: function () {
    this.$('#viewport form').bootstrapValidator({
      fields: {
        '_id': {
          validators: {
            notEmpty: {
              message: 'The sitemap id is required and cannot be empty'
            },
            stringLength: {
              min: 3,
              message: 'The sitemap id should be atleast 3 characters long'
            },
            regexp: {
              regexp: /^[a-z][a-z0-9_$()+\-/]+$/,
              message: 'Only lowercase characters (a-z), digits (0-9), or any of the characters _, $, (, ), +, -, and / are allowed. Must begin with a letter.'
            },
            // placeholder for sitemap id existance validation
            callback: {
              message: 'Sitemap with this id already exists',
              callback: function (value, validator) {
                return true;
              }
            }
          }
        },
        'startUrl[]': {
          validators: {
            notEmpty: {
              message: 'The start URL is required and cannot be empty'
            },
            uri: {
              message: 'The start URL is not a valid URL'
            }
          }
        }
      }
    });
  },

  showCreateSitemap: function () {
    this.setActiveNavigationButton('create-sitemap-create');
    var sitemapForm = ich.SitemapCreate();
    this.$('#viewport').html(sitemapForm);
    this.initMultipleStartUrlHelper();
    this.initSitemapValidation();

    return true;
  },

  initImportStiemapValidation: function () {
    this.$('#viewport form').bootstrapValidator({
      fields: {
        '_id': {
          validators: {
            stringLength: {
              min: 3,
              message: 'The sitemap id should be atleast 3 characters long'
            },
            regexp: {
              regexp: /^[a-z][a-z0-9_$()+\-/]+$/,
              message: 'Only lowercase characters (a-z), digits (0-9), or any of the characters _, $, (, ), +, -, and / are allowed. Must begin with a letter.'
            },
            // placeholder for sitemap id existance validation
            callback: {
              message: 'Sitemap with this id already exists',
              callback: function (value, validator) {
                return true;
              }
            }
          }
        },
        sitemapJSON: {
          validators: {
            notEmpty: {
              message: 'Sitemap JSON is required and cannot be empty'
            },
            callback: {
              message: 'JSON is not valid',
              callback: function (value, validator) {
                try {
                  JSON.parse(value);
                } catch (e) {
                  return false;
                }
                return true;
              }
            }
          }
        }
      }
    });
  },

  showImportSitemapPanel: function () {
    this.setActiveNavigationButton('create-sitemap-import');
    var sitemapForm = ich.SitemapImport();
    this.$('#viewport').html(sitemapForm);
    this.initImportStiemapValidation();
    return true;
  },

  showSitemapExportPanel: function () {
    this.setActiveNavigationButton('sitemap-export');
    var sitemap = this.state.currentSitemap;
    var sitemapJSON = sitemap.exportSitemap();
    var sitemapExportForm = ich.SitemapExport({
      sitemapJSON: sitemapJSON
    });
    this.$('#viewport').html(sitemapExportForm);
    return true;
  },

  showSitemaps: function () {
    this.clearState();
    this.setActiveNavigationButton('sitemaps');

    this.store.getAllSitemaps(function (sitemaps) {
      var $sitemapListPanel = ich.SitemapList();
      sitemaps.forEach(function (sitemap) {
        var $sitemap = ich.SitemapListItem(sitemap);
        $sitemap.data('sitemap', sitemap);
        $sitemapListPanel.find('tbody').append($sitemap);
      });
      this.$('#viewport').html($sitemapListPanel);
    });
  },

  getSitemapFromMetadataForm: function () {
    var id = this.$('#viewport form input[name=_id]').val();
    var $startUrlInputs = this.$('#viewport form .input-start-url');
    var startUrl;
    if ($startUrlInputs.length === 1) {
      startUrl = $startUrlInputs.val();
    } else {
      startUrl = [];
      $startUrlInputs.each(function (i, element) {
        startUrl.push(this.$(element).val());
      });
    }

    return {
      id: id,
      startUrl: startUrl
    };
  },

  createSitemap: function (form) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    // cancel submit if invalid form
    if (!this.isValidForm()) {
      return false;
    }

    var sitemapData = this.getSitemapFromMetadataForm();

    // check whether sitemap with this id already exist
    this.store.sitemapExists(sitemapData.id, function (sitemapExists) {
      if (sitemapExists) {
        var validator = this.getFormValidator();
        validator.updateStatus('_id', 'INVALID', 'callback');
      } else {
        var sitemap = new Sitemap({
          _id: sitemapData.id,
          startUrl: sitemapData.startUrl,
          selectors: []
        }, { $, document, window });
        this.store.createSitemap(sitemap, function (sitemap) {
          this._editSitemap(sitemap, ['_root']);
        }.bind(this, sitemap));
      }
    }.bind(this));
  },

  importSitemap: function () {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    // cancel submit if invalid form
    if (!this.isValidForm()) {
      return false;
    }

    // load data from form
    var sitemapJSON = this.$('[name=sitemapJSON]').val();
    var id = this.$('input[name=_id]').val();
    var sitemap = new Sitemap(null, { $, document, window });
    sitemap.importSitemap(sitemapJSON);
    if (id.length) {
      sitemap._id = id;
    }
    // check whether sitemap with this id already exist
    this.store.sitemapExists(sitemap._id, function (sitemapExists) {
      if (sitemapExists) {
        var validator = this.getFormValidator();
        validator.updateStatus('_id', 'INVALID', 'callback');
      } else {
        this.store.createSitemap(sitemap, function (sitemap) {
          this._editSitemap(sitemap, ['_root']);
        }.bind(this, sitemap));
      }
    }.bind(this));
  },

  editSitemapMetadata: function (button) {
    this.setActiveNavigationButton('sitemap-edit-metadata');

    var sitemap = this.state.currentSitemap;
    var $sitemapMetadataForm = ich.SitemapEditMetadata(sitemap);
    this.$('#viewport').html($sitemapMetadataForm);
    this.initMultipleStartUrlHelper();
    this.initSitemapValidation();

    return true;
  },

  editSitemapMetadataSave: function (button) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var sitemap = this.state.currentSitemap;
    var sitemapData = this.getSitemapFromMetadataForm();

    // cancel submit if invalid form
    if (!this.isValidForm()) {
      return false;
    }

    // check whether sitemap with this id already exist
    this.store.sitemapExists(sitemapData.id, function (sitemapExists) {
      if (sitemap._id !== sitemapData.id && sitemapExists) {
        var validator = this.getFormValidator();
        validator.updateStatus('_id', 'INVALID', 'callback');
        return;
      }

      // change data
      sitemap.startUrl = sitemapData.startUrl;

      // just change sitemaps url
      if (sitemapData.id === sitemap._id) {
        this.store.saveSitemap(sitemap, function (sitemap) {
          this.showSitemapSelectorList();
        }.bind(this));
      } else {
        // id changed. we need to delete the old one and create a new one
        var newSitemap = new Sitemap(sitemap, { $, document, window });
        var oldSitemap = sitemap;
        newSitemap._id = sitemapData.id;
        this.store.createSitemap(newSitemap, function (newSitemap) {
          this.store.deleteSitemap(oldSitemap, function () {
            this.state.currentSitemap = newSitemap;
            this.showSitemapSelectorList();
          }.bind(this));
        }.bind(this));
      }
    }.bind(this));
  },

  /**
   * Callback when sitemap edit button is clicked in sitemap grid
   */
  editSitemap: function (tr) {
    var sitemap = this.$(tr).data('sitemap');
    this._editSitemap(sitemap);
  },
  _editSitemap: function (sitemap) {
    this.setStateEditSitemap(sitemap);
    this.setActiveNavigationButton('sitemap');

    this.showSitemapSelectorList();
  },
  showSitemapSelectorList: function () {
    this.setActiveNavigationButton('sitemap-selector-list');

    var sitemap = this.state.currentSitemap;
    var parentSelectors = this.state.editSitemapBreadcumbsSelectors;
    var parentSelectorId = this.state.currentParentSelectorId;

    var $selectorListPanel = ich.SelectorList({
      parentSelectors: parentSelectors
    });
    var selectors = sitemap.getDirectChildSelectors(parentSelectorId);
    selectors.forEach(function (selector) {
      var $selector = ich.SelectorListItem(selector);
      $selector.data('selector', selector);
      $selectorListPanel.find('tbody').append($selector);
    });
    this.$('#viewport').html($selectorListPanel);

    return true;
  }, /*
     showSitemapSelectorGraph: function () {
     this.setActiveNavigationButton('sitemap-selector-graph')
     var sitemap = this.state.currentSitemap
     var $selectorGraphPanel = ich.SitemapSelectorGraph()
     $('#viewport').html($selectorGraphPanel)
     var graphDiv = $('#selector-graph')[0]
     var graph = new SelectorGraphv2(sitemap)
     graph.draw(graphDiv, $(document).width(), 200)
     return true
     }, */
  showChildSelectors: function (tr) {
    var selector = this.$(tr).data('selector');
    var parentSelectors = this.state.editSitemapBreadcumbsSelectors;
    this.state.currentParentSelectorId = selector.id;
    parentSelectors.push(selector);

    this.showSitemapSelectorList();
  },

  treeNavigationshowSitemapSelectorList: function (button) {
    var parentSelectors = this.state.editSitemapBreadcumbsSelectors;
    var controller = this;
    this.$('#selector-tree .breadcrumb li a').each(function (i, parentSelectorButton) {
      if (parentSelectorButton === button) {
        parentSelectors.splice(i + 1);
        controller.state.currentParentSelectorId = parentSelectors[i].id;
      }
    });
    this.showSitemapSelectorList();
  },

  initSelectorValidation: function () {
    this.$('#viewport form').bootstrapValidator({
      fields: {
        'id': {
          validators: {
            notEmpty: {
              message: 'Sitemap id required and cannot be empty'
            },
            stringLength: {
              min: 3,
              message: 'The sitemap id should be atleast 3 characters long'
            },
            regexp: {
              regexp: /^[^_].*$/,
              message: 'Selector id cannot start with an underscore _'
            }
          }
        },
        selector: {
          validators: {
            notEmpty: {
              message: 'Selector is required and cannot be empty'
            }
          }
        },
        regex: {
          validators: {
            callback: {
              message: 'JavaScript does not support regular expressions that can match 0 characters.',
              callback: function (value, validator) {
                // allow no regex
                if (!value) {
                  return true;
                }

                var matches = ''.match(new RegExp(value));
                if (matches !== null && matches[0] === '') {
                  return false;
                } else {
                  return true;
                }
              }
            }
          }
        },
        clickElementSelector: {
          validators: {
            notEmpty: {
              message: 'Click selector is required and cannot be empty'
            }
          }
        },
        tableHeaderRowSelector: {
          validators: {
            notEmpty: {
              message: 'Header row selector is required and cannot be empty'
            }
          }
        },
        tableDataRowSelector: {
          validators: {
            notEmpty: {
              message: 'Data row selector is required and cannot be empty'
            }
          }
        },
        delay: {
          validators: {
            numeric: {
              message: 'Delay must be numeric'
            }
          }
        },
        parentSelectors: {
          validators: {
            notEmpty: {
              message: 'You must choose at least one parent selector'
            },
            callback: {
              message: 'Cannot handle recursive element selectors',
              callback: function (value, validator, $field) {
                var sitemap = this.getCurrentlyEditedSelectorSitemap();
                return !sitemap.selectors.hasRecursiveElementSelectors();
              }.bind(this)
            }
          }
        }
      }
    });
  },
  editSelector: function (button) {
    var selector = this.$(button).closest('tr').data('selector');
    this._editSelector(selector);
  },
  updateSelectorParentListOnIdChange: function () {
    var selector = this.getCurrentlyEditedSelector();
    this.$('.currently-edited').val(selector.id).text(selector.id);
  },
  _editSelector: function (selector) {
    var sitemap = this.state.currentSitemap;
    var selectorIds = sitemap.getPossibleParentSelectorIds();

    var $editSelectorForm = ich.SelectorEdit({
      selector: selector,
      selectorIds: selectorIds,
      selectorTypes: [{
        type: 'SelectorText',
        title: 'Text'
      }, {
        type: 'SelectorLink',
        title: 'Link'
      }, {
        type: 'SelectorPopupLink',
        title: 'Popup Link'
      }, {
        type: 'SelectorImage',
        title: 'Image'
      }, {
        type: 'SelectorTable',
        title: 'Table'
      }, {
        type: 'SelectorElementAttribute',
        title: 'Element attribute'
      }, {
        type: 'SelectorHTML',
        title: 'HTML'
      }, {
        type: 'SelectorElement',
        title: 'Element'
      }, {
        type: 'SelectorElementScroll',
        title: 'Element scroll down'
      }, {
        type: 'SelectorElementClick',
        title: 'Element click'
      }, {
        type: 'SelectorGroup',
        title: 'Grouped'
      }]
    });
    this.$('#viewport').html($editSelectorForm);
    // mark initially opened selector as currently edited
    var self = this;
    this.$('#edit-selector #parentSelectors option').each(function (i, element) {
      if (self.$(element).val() === selector.id) {
        self.$(element).addClass('currently-edited');
      }
    });

    // set clickType
    if (selector.clickType) {
      $editSelectorForm.find('[name=clickType]').val(selector.clickType);
    }
    // set clickElementUniquenessType
    if (selector.clickElementUniquenessType) {
      $editSelectorForm.find('[name=clickElementUniquenessType]').val(selector.clickElementUniquenessType);
    }

    // handle selects seperately
    $editSelectorForm.find('[name=type]').val(selector.type);
    selector.parentSelectors.forEach(function (parentSelectorId) {
      $editSelectorForm.find("#parentSelectors [value='" + parentSelectorId + "']").attr('selected', 'selected');
    });

    this.state.currentSelector = selector;
    this.selectorTypeChanged();
    this.initSelectorValidation();
  },
  selectorTypeChanged: function () {
    var type = this.$('#edit-selector select[name=type]').val();
    var features = selectors[type].getFeatures();
    this.$('#edit-selector .feature').hide();
    var self = this;
    features.forEach(function (feature) {
      self.$('#edit-selector .feature-' + feature).show();
    });

    // add this selector to possible parent selector
    var selector = this.getCurrentlyEditedSelector();
    if (selector.canHaveChildSelectors()) {
      if (this.$('#edit-selector #parentSelectors .currently-edited').length === 0) {
        var $option = this.$('<option class="currently-edited"></option>');
        $option.text(selector.id).val(selector.id);
        this.$('#edit-selector #parentSelectors').append($option);
      }
    } else {
      // remove if type doesn't allow to have child selectors
      this.$('#edit-selector #parentSelectors .currently-edited').remove();
    }
  },
  saveSelector: function (button) {
    var sitemap = this.state.currentSitemap;
    var selector = this.state.currentSelector;
    var newSelector = this.getCurrentlyEditedSelector();

    // cancel submit if invalid form
    if (!this.isValidForm()) {
      return false;
    }

    // cancel possible element selection
    this.contentScript.removeCurrentContentSelector().then(function () {
      sitemap.updateSelector(selector, newSelector);

      this.store.saveSitemap(sitemap, function () {
        this.showSitemapSelectorList();
      }.bind(this));
    }.bind(this));
  },
  /**
   * Get selector from selector editing form
   */
  getCurrentlyEditedSelector: function () {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var id = $('#edit-selector [name=id]').val();
    var selectorsSelector = $('#edit-selector [name=selector]').val();
    var tableDataRowSelector = $('#edit-selector [name=tableDataRowSelector]').val();
    var tableHeaderRowSelector = $('#edit-selector [name=tableHeaderRowSelector]').val();
    var clickElementSelector = $('#edit-selector [name=clickElementSelector]').val();
    var type = $('#edit-selector [name=type]').val();
    var clickElementUniquenessType = $('#edit-selector [name=clickElementUniquenessType]').val();
    var clickType = $('#edit-selector [name=clickType]').val();
    var discardInitialElements = $('#edit-selector [name=discardInitialElements]').is(':checked');
    var multiple = $('#edit-selector [name=multiple]').is(':checked');
    var downloadImage = $('#edit-selector [name=downloadImage]').is(':checked');
    var clickPopup = $('#edit-selector [name=clickPopup]').is(':checked');
    var regex = $('#edit-selector [name=regex]').val();
    var delay = $('#edit-selector [name=delay]').val();
    var extractAttribute = $('#edit-selector [name=extractAttribute]').val();
    var parentSelectors = $('#edit-selector [name=parentSelectors]').val();
    var columns = [];
    var $columnHeaders = $('#edit-selector .column-header');
    var $columnNames = $('#edit-selector .column-name');
    var $columnExtracts = $('#edit-selector .column-extract');

    $columnHeaders.each(function (i) {
      var header = $($columnHeaders[i]).val();
      var name = $($columnNames[i]).val();
      var extract = $($columnExtracts[i]).is(':checked');
      columns.push({
        header: header,
        name: name,
        extract: extract
      });
    });

    var newSelector = new Selector({
      id: id,
      selector: selectorsSelector,
      tableHeaderRowSelector: tableHeaderRowSelector,
      tableDataRowSelector: tableDataRowSelector,
      clickElementSelector: clickElementSelector,
      clickElementUniquenessType: clickElementUniquenessType,
      clickType: clickType,
      discardInitialElements: discardInitialElements,
      type: type,
      multiple: multiple,
      downloadImage: downloadImage,
      clickPopup: clickPopup,
      regex: regex,
      extractAttribute: extractAttribute,
      parentSelectors: parentSelectors,
      columns: columns,
      delay: delay
    }, {
      $, document, window
    });
    return newSelector;
  },
  /**
   * @returns {Sitemap|*} Cloned Sitemap with currently edited selector
   */
  getCurrentlyEditedSelectorSitemap: function () {
    var sitemap = this.state.currentSitemap.clone();
    var selector = sitemap.getSelectorById(this.state.currentSelector.id);
    var newSelector = this.getCurrentlyEditedSelector();
    sitemap.updateSelector(selector, newSelector);
    return sitemap;
  },
  cancelSelectorEditing: function (button) {
    // cancel possible element selection
    this.contentScript.removeCurrentContentSelector().then(function () {
      this.showSitemapSelectorList();
    }.bind(this));
  },
  addSelector: function () {
    var parentSelectorId = this.state.currentParentSelectorId;
    var sitemap = this.state.currentSitemap;

    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var selector = new Selector({
      parentSelectors: [parentSelectorId],
      type: 'SelectorText',
      multiple: false
    }, { $, window, document });

    this._editSelector(selector, sitemap);
  },
  deleteSelector: function (button) {
    var sitemap = this.state.currentSitemap;
    var selector = this.$(button).closest('tr').data('selector');
    sitemap.deleteSelector(selector);

    this.store.saveSitemap(sitemap, function () {
      this.showSitemapSelectorList();
    }.bind(this));
  },
  deleteSitemap: function (button) {
    var sitemap = this.$(button).closest('tr').data('sitemap');
    var controller = this;
    this.store.deleteSitemap(sitemap, function () {
      controller.showSitemaps();
    });
  },
  initScrapeSitemapConfigValidation: function () {
    this.$('#viewport form').bootstrapValidator({
      fields: {
        'requestInterval': {
          validators: {
            notEmpty: {
              message: 'The request interval is required and cannot be empty'
            },
            numeric: {
              message: 'The request interval must be numeric'
            },
            callback: {
              message: 'The request interval must be atleast 2000 milliseconds',
              callback: function (value, validator) {
                return value >= 2000;
              }
            }
          }
        },
        'pageLoadDelay': {
          validators: {
            notEmpty: {
              message: 'The page load delay is required and cannot be empty'
            },
            numeric: {
              message: 'The page laod delay must be numeric'
            },
            callback: {
              message: 'The page load delay must be atleast 500 milliseconds',
              callback: function (value, validator) {
                return value >= 500;
              }
            }
          }
        }
      }
    });
  },
  initHeadlessScrapeSitemapConfigValidation: function () {
    this.$('#viewport form').bootstrapValidator({
      fields: {
        'requestInterval': {
          validators: {
            notEmpty: {
              message: 'The request interval is required and cannot be empty'
            },
            numeric: {
              message: 'The request interval must be numeric'
            },
            callback: {
              message: 'The request interval must be atleast 2000 milliseconds',
              callback: function (value, validator) {
                return value >= 2000;
              }
            }
          }
        },
        'pageLoadDelay': {
          validators: {
            notEmpty: {
              message: 'The page load delay is required and cannot be empty'
            },
            numeric: {
              message: 'The page laod delay must be numeric'
            },
            callback: {
              message: 'The page load delay must be atleast 500 milliseconds',
              callback: function (value, validator) {
                return value >= 500;
              }
            }
          }
        }
      }
    });
  },
  showScrapeSitemapConfigPanel: function () {
    this.setActiveNavigationButton('sitemap-scrape');
    var scrapeConfigPanel = ich.SitemapScrapeConfig();
    this.$('#viewport').html(scrapeConfigPanel);
    this.initScrapeSitemapConfigValidation();
    return true;
  },
  showHeadlessScrapeSitemapConfigPanel: function () {
    this.setActiveNavigationButton('sitemap-headless-scrape');
    var scrapeConfigPanel = ich.SitemapHeadlessScrapeConfig();
    this.$('#viewport').html(scrapeConfigPanel);
    this.initHeadlessScrapeSitemapConfigValidation();
    return true;
  },
  scrapeSitemap: function () {
    if (!this.isValidForm()) {
      return false;
    }

    var requestInterval = this.$('input[name=requestInterval]').val();
    var pageLoadDelay = this.$('input[name=pageLoadDelay]').val();

    var sitemap = this.state.currentSitemap;
    var request = {
      scrapeSitemap: true,
      sitemap: JSON.parse(JSON.stringify(sitemap)),
      requestInterval: requestInterval,
      pageLoadDelay: pageLoadDelay
    };

    // show sitemap scraping panel
    this.getFormValidator().destroy();
    this.$('.scraping-in-progress').removeClass('hide');
    this.$('#submit-scrape-sitemap').closest('.form-group').hide();
    this.$('#scrape-sitemap-config input').prop('disabled', true);

    chrome.runtime.sendMessage(request, function (response) {
      this.browseSitemapData();
    }.bind(this));
    return false;
  },
  headlessScrapeSitemap: function () {
    if (!this.isValidForm()) {
      return false;
    }

    var requestInterval = this.$('input[name=requestInterval]').val();
    var pageLoadDelay = this.$('input[name=pageLoadDelay]').val();

    var sitemap = this.state.currentSitemap;
    var request = {
      headlessScrapeSitemap: true,
      sitemap: JSON.parse(JSON.stringify(sitemap)),
      requestInterval: requestInterval,
      pageLoadDelay: pageLoadDelay
    };

    // show sitemap scraping panel
    this.getFormValidator().destroy();
    this.$('.scraping-in-progress').removeClass('hide');
    this.$('#submit-scrape-sitemap').closest('.form-group').hide();
    this.$('#scrape-sitemap-config input').prop('disabled', true);

    chrome.runtime.sendMessage(request, function (response) {
      this.browseSitemapData();
    }.bind(this));
    return false;
  },
  sitemapListBrowseSitemapData: function (button) {
    var sitemap = this.$(button).closest('tr').data('sitemap');
    this.setStateEditSitemap(sitemap);
    this.browseSitemapData();
  },
  browseSitemapData: function () {
    this.setActiveNavigationButton('sitemap-browse');
    var sitemap = this.state.currentSitemap;
    this.store.getSitemapData(sitemap, function (data) {
      var dataColumns = sitemap.getDataColumns();

      var dataPanel = ich.SitemapBrowseData({
        columns: dataColumns
      });
      this.$('#viewport').html(dataPanel);

      // display data
      // Doing this the long way so there aren't xss vulnerubilites
      // while working with data or with the selector titles
      var $tbody = this.$('#sitemap-data tbody');
      var self = this;
      data.forEach(function (row) {
        var $tr = self.$('<tr></tr>');
        dataColumns.forEach(function (column) {
          var $td = self.$('<td></td>');
          var cellData = row[column];
          if (typeof cellData === 'object') {
            cellData = JSON.stringify(cellData);
          }
          $td.text(cellData);
          $tr.append($td);
        });
        $tbody.append($tr);
      });
    });

    return true;
  },

  showSitemapExportDataCsvPanel: function () {
    this.setActiveNavigationButton('sitemap-export-data-csv');

    var sitemap = this.state.currentSitemap;
    var exportPanel = ich.SitemapExportDataCSV(sitemap);
    this.$('#viewport').html(exportPanel);

    // generate data
    this.$('.download-button').hide();
    this.store.getSitemapData(sitemap, function (data) {
      var blob = sitemap.getDataExportCsvBlob(data);
      this.$('.download-button a').attr('href', window.URL.createObjectURL(blob));
      this.$('.download-button a').attr('download', sitemap._id + '.csv');
      this.$('.download-button').show();
    });

    return true;
  },

  selectSelector: function (button) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var input = $(button).closest('.form-group').find('input.selector-value');
    var sitemap = this.getCurrentlyEditedSelectorSitemap();
    var selector = this.getCurrentlyEditedSelector();
    var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds();
    var parentCSSSelector = sitemap.selectors.getParentCSSSelectorWithinOnePage(currentStateParentSelectorIds);

    var deferredSelector = this.contentScript.selectSelector({
      parentCSSSelector: parentCSSSelector,
      allowedElements: selector.getItemCSSSelector()
    }, { $, document, window });

    deferredSelector.done(function (result) {
      $(input).val(result.CSSSelector);

      // update validation for selector field
      var validator = this.getFormValidator();
      validator.revalidateField(input);

      // @TODO how could this be encapsulated?
      // update header row, data row selectors after selecting the table. selectors are updated based on tables
      // inner html
      if (selector.type === 'SelectorTable') {
        this.getSelectorHTML().done(function (html) {
          var tableHeaderRowSelector = SelectorTable.getTableHeaderRowSelectorFromTableHTML(html, { $, document, window });
          var tableDataRowSelector = SelectorTable.getTableDataRowSelectorFromTableHTML(html, { $, document, window });
          $('input[name=tableHeaderRowSelector]').val(tableHeaderRowSelector);
          $('input[name=tableDataRowSelector]').val(tableDataRowSelector);

          var headerColumns = SelectorTable.getTableHeaderColumnsFromHTML(tableHeaderRowSelector, html, { $, document, window });
          this.renderTableHeaderColumns(headerColumns);
        }.bind(this));
      }
    }.bind(this));
  },

  getCurrentStateParentSelectorIds: function () {
    var parentSelectorIds = this.state.editSitemapBreadcumbsSelectors.map(function (selector) {
      return selector.id;
    });

    return parentSelectorIds;
  },

  selectTableHeaderRowSelector: function (button) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var input = $(button).closest('.form-group').find('input.selector-value');
    var sitemap = this.getCurrentlyEditedSelectorSitemap();
    var selector = this.getCurrentlyEditedSelector();
    var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds();
    var parentCSSSelector = sitemap.selectors.getCSSSelectorWithinOnePage(selector.id, currentStateParentSelectorIds);

    var deferredSelector = this.contentScript.selectSelector({
      parentCSSSelector: parentCSSSelector,
      allowedElements: 'tr'
    }, { $, document, window });

    deferredSelector.done(function (result) {
      var tableHeaderRowSelector = result.CSSSelector;
      $(input).val(tableHeaderRowSelector);

      this.getSelectorHTML().done(function (html) {
        var headerColumns = SelectorTable.getTableHeaderColumnsFromHTML(tableHeaderRowSelector, html, { $, document, window });
        this.renderTableHeaderColumns(headerColumns);
      }.bind(this));

      // update validation for selector field
      var validator = this.getFormValidator();
      validator.revalidateField(input);
    }.bind(this));
  },

  selectTableDataRowSelector: function (button) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var input = this.$(button).closest('.form-group').find('input.selector-value');
    var sitemap = this.getCurrentlyEditedSelectorSitemap();
    var selector = this.getCurrentlyEditedSelector();
    var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds();
    var parentCSSSelector = sitemap.selectors.getCSSSelectorWithinOnePage(selector.id, currentStateParentSelectorIds);

    var deferredSelector = this.contentScript.selectSelector({
      parentCSSSelector: parentCSSSelector,
      allowedElements: 'tr'
    }, { $, document, window });

    var self = this;
    deferredSelector.done(function (result) {
      if (!result) return console.error('extension/scripts/Controller.js:1259:40:new Error(\'result should not be null\')', new Error('result should not be null'));
      self.$(input).val(result.CSSSelector);

      // update validation for selector field
      var validator = this.getFormValidator();
      validator.revalidateField(input);
    }.bind(this));
  },

  /**
   * update table selector column editing fields
   */
  renderTableHeaderColumns: function (headerColumns) {
    // reset previous columns
    var $tbody = this.$('.feature-columns table tbody');
    $tbody.html('');
    headerColumns.forEach(function (column) {
      var $row = ich.SelectorEditTableColumn(column);
      $tbody.append($row);
    });
  },

  /**
   * Returns HTML that the current selector would select
   */
  getSelectorHTML: function () {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var sitemap = this.getCurrentlyEditedSelectorSitemap();
    var selector = this.getCurrentlyEditedSelector();
    var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds();
    var CSSSelector = sitemap.selectors.getCSSSelectorWithinOnePage(selector.id, currentStateParentSelectorIds);
    var deferredHTML = this.contentScript.getHTML({ CSSSelector: CSSSelector }, { $, document, window });

    return deferredHTML;
  },
  previewSelector: function (button) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    if (!$(button).hasClass('preview')) {
      var sitemap = this.getCurrentlyEditedSelectorSitemap();
      var selector = this.getCurrentlyEditedSelector();
      var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds();
      var parentCSSSelector = sitemap.selectors.getParentCSSSelectorWithinOnePage(currentStateParentSelectorIds);
      var deferredSelectorPreview = this.contentScript.previewSelector({
        parentCSSSelector: parentCSSSelector,
        elementCSSSelector: selector.selector
      }, { $, document, window });

      deferredSelectorPreview.done(function () {
        $(button).addClass('preview');
      });
    } else {
      this.contentScript.removeCurrentContentSelector();
      $(button).removeClass('preview');
    }
  },
  previewClickElementSelector: function (button) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    if (!$(button).hasClass('preview')) {
      var sitemap = this.state.currentSitemap;
      var selector = this.getCurrentlyEditedSelector();
      var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds();
      var parentCSSSelector = sitemap.selectors.getParentCSSSelectorWithinOnePage(currentStateParentSelectorIds);

      var deferredSelectorPreview = this.contentScript.previewSelector({
        parentCSSSelector: parentCSSSelector,
        elementCSSSelector: selector.clickElementSelector
      }, { $, document, window });

      deferredSelectorPreview.done(function () {
        $(button).addClass('preview');
      });
    } else {
      this.contentScript.removeCurrentContentSelector();
      $(button).removeClass('preview');
    }
  },
  previewTableRowSelector: function (button) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    if (!$(button).hasClass('preview')) {
      var sitemap = this.getCurrentlyEditedSelectorSitemap();
      var selector = this.getCurrentlyEditedSelector();
      var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds();
      var parentCSSSelector = sitemap.selectors.getCSSSelectorWithinOnePage(selector.id, currentStateParentSelectorIds);
      var rowSelector = $(button).closest('.form-group').find('input').val();

      var deferredSelectorPreview = this.contentScript.previewSelector({
        parentCSSSelector: parentCSSSelector,
        elementCSSSelector: rowSelector
      }, { $, document, window });

      deferredSelectorPreview.done(function () {
        $(button).addClass('preview');
      });
    } else {
      this.contentScript.removeCurrentContentSelector();
      $(button).removeClass('preview');
    }
  },
  previewSelectorFromSelectorTree: function (button) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    if (!$(button).hasClass('preview')) {
      var sitemap = this.state.currentSitemap;
      var selector = $(button).closest('tr').data('selector');
      var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds();
      var parentCSSSelector = sitemap.selectors.getParentCSSSelectorWithinOnePage(currentStateParentSelectorIds);
      var deferredSelectorPreview = this.contentScript.previewSelector({
        parentCSSSelector: parentCSSSelector,
        elementCSSSelector: selector.selector
      }, { $, document, window });

      deferredSelectorPreview.done(function () {
        $(button).addClass('preview');
      });
    } else {
      this.contentScript.removeCurrentContentSelector();
      $(button).removeClass('preview');
    }
  },
  previewSelectorDataFromSelectorTree: function (button) {
    var self = this;
    var sitemap = this.state.currentSitemap;
    var selector = self.$(button).closest('tr').data('selector');
    this.previewSelectorData(sitemap, selector.id);
  },
  previewSelectorDataFromSelectorEditing: function () {
    var sitemap = this.state.currentSitemap.clone();
    var selector = sitemap.getSelectorById(this.state.currentSelector.id);
    var newSelector = this.getCurrentlyEditedSelector();
    sitemap.updateSelector(selector, newSelector);
    this.previewSelectorData(sitemap, newSelector.id);
  },
  /**
   * Returns a list of selector ids that the user has opened
   * @returns {Array}
   */
  getStateParentSelectorIds: function () {
    var parentSelectorIds = [];
    this.state.editSitemapBreadcumbsSelectors.forEach(function (selector) {
      parentSelectorIds.push(selector.id);
    });
    return parentSelectorIds;
  },
  previewSelectorData: function (sitemap, selectorId) {
    // data preview will be base on how the selector tree is opened
    var parentSelectorIds = this.getStateParentSelectorIds();

    var self = this;

    var request = {
      previewSelectorData: true,
      sitemap: JSON.parse(JSON.stringify(sitemap)),
      parentSelectorIds: parentSelectorIds,
      selectorId: selectorId
    };
    chrome.runtime.sendMessage(request, function (response) {
      if (response.length === 0) {
        return;
      }
      var dataColumns = Object.keys(response[0]);

      console.log('extension/scripts/Controller.js:1429:18:dataColumns', dataColumns);

      var $dataPreviewPanel = ich.DataPreview({
        columns: dataColumns
      });
      self.$('#viewport').append($dataPreviewPanel);
      $dataPreviewPanel.modal('show');
      // display data
      // Doing this the long way so there aren't xss vulnerubilites
      // while working with data or with the selector titles
      var $tbody = self.$('tbody', $dataPreviewPanel);
      response.forEach(function (row) {
        var $tr = self.$('<tr></tr>');
        dataColumns.forEach(function (column) {
          var $td = self.$('<td></td>');
          var cellData = row[column];
          if (typeof cellData === 'object') {
            cellData = JSON.stringify(cellData);
          }
          $td.text(cellData);
          $tr.append($td);
        });
        $tbody.append($tr);
      });

      var windowHeight = self.$(window).height();

      self.$('.data-preview-modal .modal-body').height(windowHeight - 130);

      // remove modal from dom after it is closed
      $dataPreviewPanel.on('hidden.bs.modal', function () {
        self.$(this).remove();
      });
    });
  },
  /**
   * Add start url to sitemap creation or editing form
   * @param button
   */
  addStartUrl: function (button) {
    var self = this;
    var $startUrlInputField = ich.SitemapStartUrlField();
    self.$('#viewport .start-url-block:last').after($startUrlInputField);
    var validator = this.getFormValidator();
    validator.addField($startUrlInputField.find('input'));
  },
  /**
   * Remove start url from sitemap creation or editing form.
   * @param button
   */
  removeStartUrl: function (button) {
    var self = this;
    var $block = self.$(button).closest('.start-url-block');
    if (self.$('#viewport .start-url-block').length > 1) {
      // remove from validator
      var validator = this.getFormValidator();
      validator.removeField($block.find('input'));

      $block.remove();
    }
  }
};

module.exports = SitemapController;

},{"./Selector":9,"./Selectors":22,"./Sitemap":23,"./getBackgroundScript":26,"./getContentScript":27}],8:[function(require,module,exports){
/**
 * Element selector. Uses jQuery as base and adds some more features
 * @param CSSSelector
 * @param parentElement
 * @param options
 */
var ElementQuery = function (CSSSelector, parentElement, options) {
  CSSSelector = CSSSelector || '';
  this.$ = options.$;
  this.document = options.document;
  this.window = options.window;
  if (!this.$) throw new Error('Missing jquery for ElementQuery');
  if (!this.document) throw new Error("Missing document");
  if (!this.window) throw new Error("Missing window");
  var selectedElements = [];

  var addElement = function (element) {
    if (selectedElements.indexOf(element) === -1) {
      selectedElements.push(element);
    }
  };

  var selectorParts = ElementQuery.getSelectorParts(CSSSelector);
  var self = this;
  selectorParts.forEach(function (selector) {
    // handle special case when parent is selected
    if (selector === '_parent_') {
      self.$(parentElement).each(function (i, element) {
        addElement(element);
      });
    } else {
      var elements = self.$(selector, self.$(parentElement));
      elements.each(function (i, element) {
        addElement(element);
      });
    }
  });

  return selectedElements;
};

ElementQuery.getSelectorParts = function (CSSSelector) {
  var selectors = CSSSelector.split(/(,|".*?"|'.*?'|\(.*?\))/);

  var resultSelectors = [];
  var currentSelector = '';
  selectors.forEach(function (selector) {
    if (selector === ',') {
      if (currentSelector.trim().length) {
        resultSelectors.push(currentSelector.trim());
      }
      currentSelector = '';
    } else {
      currentSelector += selector;
    }
  });
  if (currentSelector.trim().length) {
    resultSelectors.push(currentSelector.trim());
  }

  return resultSelectors;
};

module.exports = ElementQuery;

},{}],9:[function(require,module,exports){
var selectors = require('./Selectors');
var ElementQuery = require('./ElementQuery');
var jquery = require('jquery-deferred');

var Selector = function (selector, options) {
  var $ = options.$;
  var document = options.document;
  var window = options.window;
  // We don't want enumerable properties
  Object.defineProperty(this, '$', {
    value: $,
    enumerable: false
  });
  Object.defineProperty(this, 'window', {
    value: window,
    enumerable: false
  });
  Object.defineProperty(this, 'document', {
    value: document,
    enumerable: false
  });
  if (!this.$) throw new Error('Missing jquery');
  if (!this.document) throw new Error("Missing document");
  if (!this.window) throw new Error("Missing window");

  this.updateData(selector);
  this.initType();
};

Selector.prototype = {

  /**
   * Is this selector configured to return multiple items?
   * @returns {boolean}
   */
  willReturnMultipleRecords: function () {
    return this.canReturnMultipleRecords() && this.multiple;
  },

  /**
   * Update current selector configuration
   * @param data
   */
  updateData: function (data) {
    var allowedKeys = ['window', 'document', 'id', 'type', 'selector', 'parentSelectors'];
    console.log('extension/scripts/Selector.js:46:16:\'data type\',data.type', 'data type', data.type);
    allowedKeys = allowedKeys.concat(selectors[data.type].getFeatures());
    var key;
    // update data
    for (key in data) {
      if (allowedKeys.indexOf(key) !== -1 || typeof data[key] === 'function') {
        this[key] = data[key];
      }
    }

    // remove values that are not needed for this type of selector
    for (key in this) {
      if (allowedKeys.indexOf(key) === -1 && typeof this[key] !== 'function') {
        delete this[key];
      }
    }
  },

  /**
   * CSS selector which will be used for element selection
   * @returns {string}
   */
  getItemCSSSelector: function () {
    return '*';
  },

  /**
   * override objects methods based on seletor type
   */
  initType: function () {
    if (selectors[this.type] === undefined) {
      throw new Error('Selector type not defined ' + this.type);
    }

    // overrides objects methods
    for (var i in selectors[this.type]) {
      this[i] = selectors[this.type][i];
    }
  },

  /**
   * Check whether a selector is a paren selector of this selector
   * @param selectorId
   * @returns {boolean}
   */
  hasParentSelector: function (selectorId) {
    return this.parentSelectors.indexOf(selectorId) !== -1;
  },

  removeParentSelector: function (selectorId) {
    var index = this.parentSelectors.indexOf(selectorId);
    if (index !== -1) {
      this.parentSelectors.splice(index, 1);
    }
  },

  renameParentSelector: function (originalId, replacementId) {
    if (this.hasParentSelector(originalId)) {
      var pos = this.parentSelectors.indexOf(originalId);
      this.parentSelectors.splice(pos, 1, replacementId);
    }
  },

  getDataElements: function (parentElement) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var elements = ElementQuery(this.selector, parentElement, { $, document, window });
    if (this.multiple) {
      return elements;
    } else if (elements.length > 0) {
      return [elements[0]];
    } else {
      return [];
    }
  },

  getData: function (parentElement) {
    var d = jquery.Deferred();
    var timeout = this.delay || 0;

    // this works much faster because whenCallSequentally isn't running next data extraction immediately
    if (timeout === 0) {
      var deferredData = this._getData(parentElement);
      deferredData.done(function (data) {
        d.resolve(data);
      });
    } else {
      setTimeout(function () {
        var deferredData = this._getData(parentElement);
        deferredData.done(function (data) {
          d.resolve(data);
        });
      }.bind(this), timeout);
    }

    return d.promise();
  }
};

module.exports = Selector;

},{"./ElementQuery":8,"./Selectors":22,"jquery-deferred":29}],10:[function(require,module,exports){
var jquery = require('jquery-deferred');

var SelectorElement = {

  canReturnMultipleRecords: function () {
    return true;
  },

  canHaveChildSelectors: function () {
    return true;
  },

  canHaveLocalChildSelectors: function () {
    return true;
  },

  canCreateNewJobs: function () {
    return false;
  },
  willReturnElements: function () {
    return true;
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred();

    var elements = this.getDataElements(parentElement);
    dfd.resolve(this.$.makeArray(elements));

    return dfd.promise();
  },

  getDataColumns: function () {
    return [];
  },

  getFeatures: function () {
    return ['multiple', 'delay'];
  }
};

module.exports = SelectorElement;

},{"jquery-deferred":29}],11:[function(require,module,exports){
var jquery = require('jquery-deferred');
var SelectorElementAttribute = {
  canReturnMultipleRecords: function () {
    return true;
  },

  canHaveChildSelectors: function () {
    return false;
  },

  canHaveLocalChildSelectors: function () {
    return false;
  },

  canCreateNewJobs: function () {
    return false;
  },
  willReturnElements: function () {
    return false;
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred();
    var self = this;
    var elements = this.getDataElements(parentElement);

    var result = [];
    self.$(elements).each(function (k, element) {
      var data = {};

      data[this.id] = self.$(element).attr(this.extractAttribute);
      result.push(data);
    }.bind(this));

    if (this.multiple === false && elements.length === 0) {
      var data = {};
      data[this.id + '-src'] = null;
      result.push(data);
    }
    dfd.resolve(result);

    return dfd.promise();
  },

  getDataColumns: function () {
    return [this.id];
  },

  getFeatures: function () {
    return ['multiple', 'extractAttribute', 'delay'];
  }
};

module.exports = SelectorElementAttribute;

},{"jquery-deferred":29}],12:[function(require,module,exports){
var jquery = require('jquery-deferred');
var UniqueElementList = require('./../UniqueElementList');
var ElementQuery = require('./../ElementQuery');
var CssSelector = require('css-selector').CssSelector;
var SelectorElementClick = {

  canReturnMultipleRecords: function () {
    return true;
  },

  canHaveChildSelectors: function () {
    return true;
  },

  canHaveLocalChildSelectors: function () {
    return true;
  },

  canCreateNewJobs: function () {
    return false;
  },
  willReturnElements: function () {
    return true;
  },

  getClickElements: function (parentElement) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var clickElements = ElementQuery(this.clickElementSelector, parentElement, { $, document, window });
    return clickElements;
  },

  /**
   * Check whether element is still reachable from html. Useful to check whether the element is removed from DOM.
   * @param element
   */
  isElementInHTML: function (element) {
    return this.$(element).closest('html').length !== 0;
  },

  triggerButtonClick: function (clickElement) {
    var document = this.document;
    var cs = new CssSelector({
      enableSmartTableSelector: false,
      parent: this.$('body')[0],
      enableResultStripping: false
    });
    var cssSelector = cs.getCssSelector([clickElement]);

    document.querySelectorAll(cssSelector)[0].click();
    /*    // this function will catch window.open call and place the requested url as the elements data attribute
        var script = document.createElement('script')
        script.type = 'text/javascript'
        script.text = '' +
    			'(function(){ ' +
    			"var el = document.querySelectorAll('" + cssSelector + "')[0]; " +
    			'el.click(); ' +
    			'})();'
        document.body.appendChild(script)*/
  },

  getClickElementUniquenessType: function () {
    if (this.clickElementUniquenessType === undefined) {
      return 'uniqueText';
    } else {
      return this.clickElementUniquenessType;
    }
  },

  _getData: function (parentElement) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var delay = parseInt(this.delay) || 0;
    var deferredResponse = jquery.Deferred();
    var foundElements = new UniqueElementList('uniqueText', { $, document, window });
    var clickElements = this.getClickElements(parentElement);
    var doneClickingElements = new UniqueElementList(this.getClickElementUniquenessType(), { $, document, window });

    // add elements that are available before clicking
    var elements = this.getDataElements(parentElement);
    elements.forEach(foundElements.push.bind(foundElements));

    // discard initial elements
    if (this.discardInitialElements) {
      foundElements = new UniqueElementList('uniqueText', { $, document, window });
    }

    // no elements to click at the beginning
    if (clickElements.length === 0) {
      deferredResponse.resolve(foundElements);
      return deferredResponse.promise();
    }

    // initial click and wait
    var currentClickElement = clickElements[0];
    this.triggerButtonClick(currentClickElement);
    var nextElementSelection = new Date().getTime() + delay;

    // infinitely scroll down and find all items
    var interval = setInterval(function () {
      // find those click elements that are not in the black list
      var allClickElements = this.getClickElements(parentElement);
      clickElements = [];
      allClickElements.forEach(function (element) {
        if (!doneClickingElements.isAdded(element)) {
          clickElements.push(element);
        }
      });

      var now = new Date().getTime();
      // sleep. wait when to extract next elements
      if (now < nextElementSelection) {
        // console.log("wait");
        return;
      }

      // add newly found elements to element foundElements array.
      var elements = this.getDataElements(parentElement);
      var addedAnElement = false;
      elements.forEach(function (element) {
        var added = foundElements.push(element);
        if (added) {
          addedAnElement = true;
        }
      });
      // console.log("added", addedAnElement);

      // no new elements found. Stop clicking this button
      if (!addedAnElement) {
        doneClickingElements.push(currentClickElement);
      }

      // continue clicking and add delay, but if there is nothing
      // more to click the finish
      // console.log("total buttons", clickElements.length)
      if (clickElements.length === 0) {
        clearInterval(interval);
        deferredResponse.resolve(foundElements);
      } else {
        // console.log("click");
        currentClickElement = clickElements[0];
        // click on elements only once if the type is clickonce
        if (this.clickType === 'clickOnce') {
          doneClickingElements.push(currentClickElement);
        }
        this.triggerButtonClick(currentClickElement);
        nextElementSelection = now + delay;
      }
    }.bind(this), 50);

    return deferredResponse.promise();
  },

  getDataColumns: function () {
    return [];
  },

  getFeatures: function () {
    return ['multiple', 'delay', 'clickElementSelector', 'clickType', 'discardInitialElements', 'clickElementUniquenessType'];
  }
};

module.exports = SelectorElementClick;

},{"./../ElementQuery":8,"./../UniqueElementList":25,"css-selector":28,"jquery-deferred":29}],13:[function(require,module,exports){
var jquery = require('jquery-deferred');
var SelectorElementScroll = {

  canReturnMultipleRecords: function () {
    return true;
  },

  canHaveChildSelectors: function () {
    return true;
  },

  canHaveLocalChildSelectors: function () {
    return true;
  },

  canCreateNewJobs: function () {
    return false;
  },
  willReturnElements: function () {
    return true;
  },
  scrollToBottom: function () {
    var document = this.document;
    window.scrollTo(0, document.body.scrollHeight);
  },
  _getData: function (parentElement) {
    var delay = parseInt(this.delay) || 0;
    var deferredResponse = jquery.Deferred();
    var foundElements = [];

    // initially scroll down and wait
    this.scrollToBottom();
    var nextElementSelection = new Date().getTime() + delay;

    // infinitely scroll down and find all items
    var interval = setInterval(function () {
      var now = new Date().getTime();
      // sleep. wait when to extract next elements
      if (now < nextElementSelection) {
        return;
      }

      var elements = this.getDataElements(parentElement);
      // no new elements found
      if (elements.length === foundElements.length) {
        clearInterval(interval);
        deferredResponse.resolve(this.$.makeArray(elements));
      } else {
        // continue scrolling and add delay
        foundElements = elements;
        this.scrollToBottom();
        nextElementSelection = now + delay;
      }
    }.bind(this), 50);

    return deferredResponse.promise();
  },

  getDataColumns: function () {
    return [];
  },

  getFeatures: function () {
    return ['multiple', 'delay'];
  }
};

module.exports = SelectorElementScroll;

},{"jquery-deferred":29}],14:[function(require,module,exports){
var jquery = require('jquery-deferred');
var SelectorGroup = {

  canReturnMultipleRecords: function () {
    return false;
  },

  canHaveChildSelectors: function () {
    return false;
  },

  canHaveLocalChildSelectors: function () {
    return false;
  },

  canCreateNewJobs: function () {
    return false;
  },
  willReturnElements: function () {
    return false;
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred();
    var self = this;
    // cannot reuse this.getDataElements because it depends on *multiple* property
    var elements = self.$(this.selector, parentElement);

    var records = [];
    self.$(elements).each(function (k, element) {
      var data = {};

      data[this.id] = self.$(element).text();

      if (this.extractAttribute) {
        data[this.id + '-' + this.extractAttribute] = self.$(element).attr(this.extractAttribute);
      }

      records.push(data);
    }.bind(this));

    var result = {};
    result[this.id] = records;

    dfd.resolve([result]);
    return dfd.promise();
  },

  getDataColumns: function () {
    return [this.id];
  },

  getFeatures: function () {
    return ['delay', 'extractAttribute'];
  }
};

module.exports = SelectorGroup;

},{"jquery-deferred":29}],15:[function(require,module,exports){
var jquery = require('jquery-deferred');
var SelectorHTML = {

  canReturnMultipleRecords: function () {
    return true;
  },

  canHaveChildSelectors: function () {
    return false;
  },

  canHaveLocalChildSelectors: function () {
    return false;
  },

  canCreateNewJobs: function () {
    return false;
  },
  willReturnElements: function () {
    return false;
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred();
    var self = this;
    var elements = this.getDataElements(parentElement);

    var result = [];
    self.$(elements).each(function (k, element) {
      var data = {};
      var html = self.$(element).html();

      if (this.regex !== undefined && this.regex.length) {
        var matches = html.match(new RegExp(this.regex));
        if (matches !== null) {
          html = matches[0];
        } else {
          html = null;
        }
      }
      data[this.id] = html;

      result.push(data);
    }.bind(this));

    if (this.multiple === false && elements.length === 0) {
      var data = {};
      data[this.id] = null;
      result.push(data);
    }

    dfd.resolve(result);
    return dfd.promise();
  },

  getDataColumns: function () {
    return [this.id];
  },

  getFeatures: function () {
    return ['multiple', 'regex', 'delay'];
  }
};

module.exports = SelectorHTML;

},{"jquery-deferred":29}],16:[function(require,module,exports){
var jquery = require('jquery-deferred');
var whenCallSequentially = require('../../assets/jquery.whencallsequentially');
var Base64 = require('../../assets/base64');
var SelectorImage = {
  canReturnMultipleRecords: function () {
    return true;
  },

  canHaveChildSelectors: function () {
    return false;
  },

  canHaveLocalChildSelectors: function () {
    return false;
  },

  canCreateNewJobs: function () {
    return false;
  },
  willReturnElements: function () {
    return false;
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred();

    var elements = this.getDataElements(parentElement);

    var deferredDataCalls = [];
    this.$(elements).each(function (i, element) {
      deferredDataCalls.push(function () {
        var deferredData = jquery.Deferred();

        var data = {};
        data[this.id + '-src'] = element.src;

        // download image if required
        if (!this.downloadImage) {
          deferredData.resolve(data);
        } else {
          var deferredImageBase64 = this.downloadImageBase64(element.src);

          deferredImageBase64.done(function (imageResponse) {
            data['_imageBase64-' + this.id] = imageResponse.imageBase64;
            data['_imageMimeType-' + this.id] = imageResponse.mimeType;

            deferredData.resolve(data);
          }.bind(this)).fail(function () {
            // failed to download image continue.
            // @TODO handle errror
            deferredData.resolve(data);
          });
        }

        return deferredData.promise();
      }.bind(this));
    }.bind(this));

    whenCallSequentially(deferredDataCalls).done(function (dataResults) {
      if (this.multiple === false && elements.length === 0) {
        var data = {};
        data[this.id + '-src'] = null;
        dataResults.push(data);
      }

      dfd.resolve(dataResults);
    });

    return dfd.promise();
  },

  downloadFileAsBlob: function (url) {
    var window = this.window;
    var deferredResponse = jquery.Deferred();
    var xhr = new window.XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (this.readyState == 4) {
        if (this.status == 200) {
          var blob = this.response;
          deferredResponse.resolve(blob);
        } else {
          deferredResponse.reject(xhr.statusText);
        }
      }
    };
    xhr.open('GET', url);
    xhr.responseType = 'blob';
    xhr.send();

    return deferredResponse.promise();
  },

  downloadImageBase64: function (url) {
    var deferredResponse = jquery.Deferred();
    var deferredDownload = this.downloadFileAsBlob(url);
    deferredDownload.done(function (blob) {
      var mimeType = blob.type;
      var deferredBlob = Base64.blobToBase64(blob);
      deferredBlob.done(function (imageBase64) {
        deferredResponse.resolve({
          mimeType: mimeType,
          imageBase64: imageBase64
        });
      });
    }).fail(deferredResponse.fail);
    return deferredResponse.promise();
  },

  getDataColumns: function () {
    return [this.id + '-src'];
  },

  getFeatures: function () {
    return ['multiple', 'delay', 'downloadImage'];
  },

  getItemCSSSelector: function () {
    return 'img';
  }
};

module.exports = SelectorImage;

},{"../../assets/base64":1,"../../assets/jquery.whencallsequentially":2,"jquery-deferred":29}],17:[function(require,module,exports){
var jquery = require('jquery-deferred');
var whenCallSequentially = require('../../assets/jquery.whencallsequentially');

var SelectorLink = {
  canReturnMultipleRecords: function () {
    return true;
  },

  canHaveChildSelectors: function () {
    return true;
  },

  canHaveLocalChildSelectors: function () {
    return false;
  },

  canCreateNewJobs: function () {
    return true;
  },
  willReturnElements: function () {
    return false;
  },
  _getData: function (parentElement) {
    var elements = this.getDataElements(parentElement);
    var self = this;

    var dfd = jquery.Deferred();

    // return empty record if not multiple type and no elements found
    if (this.multiple === false && elements.length === 0) {
      var data = {};
      data[this.id] = null;
      dfd.resolve([data]);
      return dfd;
    }

    // extract links one by one
    var deferredDataExtractionCalls = [];
    self.$(elements).each(function (k, element) {
      deferredDataExtractionCalls.push(function (element) {
        var deferredData = jquery.Deferred();

        var data = {};
        data[this.id] = self.$(element).text();
        data._followSelectorId = this.id;
        data[this.id + '-href'] = element.href;
        data._follow = element.href;
        deferredData.resolve(data);

        return deferredData;
      }.bind(this, element));
    }.bind(this));

    whenCallSequentially(deferredDataExtractionCalls).done(function (responses) {
      var result = [];
      responses.forEach(function (dataResult) {
        result.push(dataResult);
      });
      dfd.resolve(result);
    });

    return dfd.promise();
  },

  getDataColumns: function () {
    return [this.id, this.id + '-href'];
  },

  getFeatures: function () {
    return ['multiple', 'delay'];
  },

  getItemCSSSelector: function () {
    return 'a';
  }
};

module.exports = SelectorLink;

},{"../../assets/jquery.whencallsequentially":2,"jquery-deferred":29}],18:[function(require,module,exports){
var whenCallSequentially = require('../../assets/jquery.whencallsequentially');
var jquery = require('jquery-deferred');
var CssSelector = require('css-selector').CssSelector;
var SelectorPopupLink = {
  canReturnMultipleRecords: function () {
    return true;
  },

  canHaveChildSelectors: function () {
    return true;
  },

  canHaveLocalChildSelectors: function () {
    return false;
  },

  canCreateNewJobs: function () {
    return true;
  },
  willReturnElements: function () {
    return false;
  },
  _getData: function (parentElement) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var elements = this.getDataElements(parentElement);

    var dfd = jquery.Deferred();

    // return empty record if not multiple type and no elements found
    if (this.multiple === false && elements.length === 0) {
      var data = {};
      data[this.id] = null;
      dfd.resolve([data]);
      return dfd;
    }

    // extract links one by one
    var deferredDataExtractionCalls = [];
    $(elements).each(function (k, element) {
      deferredDataExtractionCalls.push(function (element) {
        var deferredData = jquery.Deferred();

        var data = {};
        data[this.id] = $(element).text();
        data._followSelectorId = this.id;

        var deferredPopupURL = this.getPopupURL(element);
        deferredPopupURL.done(function (url) {
          data[this.id + '-href'] = url;
          data._follow = url;
          deferredData.resolve(data);
        }.bind(this));

        return deferredData;
      }.bind(this, element));
    }.bind(this));

    whenCallSequentially(deferredDataExtractionCalls).done(function (responses) {
      var result = [];
      responses.forEach(function (dataResult) {
        result.push(dataResult);
      });
      dfd.resolve(result);
    });

    return dfd.promise();
  },

  /**
   * Gets an url from a window.open call by mocking the window.open function
   * @param element
   * @returns $.Deferred()
   */
  getPopupURL: function (element) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    // override window.open function. we need to execute this in page scope.
    // we need to know how to find this element from page scope.
    var cs = new CssSelector({
      enableSmartTableSelector: false,
      parent: document.body,
      enableResultStripping: false
    });
    var cssSelector = cs.getCssSelector([element]);
    console.log('extension/scripts/Selector/SelectorPopupLink.js:88:16:cssSelector', cssSelector);
    console.log('extension/scripts/Selector/SelectorPopupLink.js:89:16:document.body.querySelectorAll(cssSelector)', document.body.querySelectorAll(cssSelector));
    // this function will catch window.open call and place the requested url as the elements data attribute
    var script = document.createElement('script');
    script.type = 'text/javascript';
    console.log('extension/scripts/Selector/SelectorPopupLink.js:93:16:cssSelector', cssSelector);
    console.log('extension/scripts/Selector/SelectorPopupLink.js:94:16:document.querySelectorAll(cssSelector)', document.querySelectorAll(cssSelector));
    var el = document.querySelectorAll(cssSelector)[0];

    const open = window.open;
    window.open = function () {
      var url = arguments[0];
      el.dataset.webScraperExtractUrl = url;
      window.open = open;
    };
    el.click();

    // wait for url to be available
    var deferredURL = jquery.Deferred();
    var timeout = Math.abs(5000 / 30); // 5s timeout to generate an url for popup
    var interval = setInterval(function () {
      var url = $(element).data('web-scraper-extract-url');
      if (url) {
        deferredURL.resolve(url);
        clearInterval(interval);
        script.remove();
      }
      // timeout popup opening
      if (timeout-- <= 0) {
        clearInterval(interval);
        script.remove();
      }
    }, 30);

    return deferredURL.promise();
  },

  getDataColumns: function () {
    return [this.id, this.id + '-href'];
  },

  getFeatures: function () {
    return ['multiple', 'delay'];
  },

  getItemCSSSelector: function () {
    return '*';
  }
};

module.exports = SelectorPopupLink;

},{"../../assets/jquery.whencallsequentially":2,"css-selector":28,"jquery-deferred":29}],19:[function(require,module,exports){
var jquery = require('jquery-deferred');

var SelectorTable = {

  canReturnMultipleRecords: function () {
    return true;
  },

  canHaveChildSelectors: function () {
    return false;
  },

  canHaveLocalChildSelectors: function () {
    return false;
  },

  canCreateNewJobs: function () {
    return false;
  },
  willReturnElements: function () {
    return false;
  },
  getTableHeaderColumns: function ($table) {
    var columns = {};
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var headerRowSelector = this.getTableHeaderRowSelector();
    var $headerRow = $($table).find(headerRowSelector);
    if ($headerRow.length > 0) {
      $headerRow.find('td,th').each(function (i) {
        var header = $(this).text().trim();
        columns[header] = {
          index: i + 1
        };
      });
    }
    return columns;
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred();
    var $ = this.$;
    var document = this.document;
    var window = this.window;

    var tables = this.getDataElements(parentElement);

    var result = [];
    $(tables).each(function (k, table) {
      var columns = this.getTableHeaderColumns($(table));

      var dataRowSelector = this.getTableDataRowSelector();
      $(table).find(dataRowSelector).each(function (i, row) {
        var data = {};
        this.columns.forEach(function (column) {
          if (column.extract === true) {
            if (columns[column.header] === undefined) {
              data[column.name] = null;
            } else {
              var rowText = $(row).find('>:nth-child(' + columns[column.header].index + ')').text().trim();
              data[column.name] = rowText;
            }
          }
        });
        result.push(data);
      }.bind(this));
    }.bind(this));

    dfd.resolve(result);
    return dfd.promise();
  },

  getDataColumns: function () {
    var dataColumns = [];
    this.columns.forEach(function (column) {
      if (column.extract === true) {
        dataColumns.push(column.name);
      }
    });
    return dataColumns;
  },

  getFeatures: function () {
    return ['multiple', 'columns', 'delay', 'tableDataRowSelector', 'tableHeaderRowSelector'];
  },

  getItemCSSSelector: function () {
    return 'table';
  },

  getTableHeaderRowSelectorFromTableHTML: function (html, options = {}) {
    var $ = options.$ || this.$;
    var $table = $(html);
    if ($table.find('thead tr:has(td:not(:empty)), thead tr:has(th:not(:empty))').length) {
      if ($table.find('thead tr').length === 1) {
        return 'thead tr';
      } else {
        var $rows = $table.find('thead tr');
        // first row with data
        var rowIndex = $rows.index($rows.filter(':has(td:not(:empty)),:has(th:not(:empty))')[0]);
        return 'thead tr:nth-of-type(' + (rowIndex + 1) + ')';
      }
    } else if ($table.find('tr td:not(:empty), tr th:not(:empty)').length) {
      var $rows = $table.find('tr');
      // first row with data
      var rowIndex = $rows.index($rows.filter(':has(td:not(:empty)),:has(th:not(:empty))')[0]);
      return 'tr:nth-of-type(' + (rowIndex + 1) + ')';
    } else {
      return '';
    }
  },

  getTableDataRowSelectorFromTableHTML: function (html, options = {}) {
    var $ = options.$ || this.$;
    var $table = $(html);
    if ($table.find('thead tr:has(td:not(:empty)), thead tr:has(th:not(:empty))').length) {
      return 'tbody tr';
    } else if ($table.find('tr td:not(:empty), tr th:not(:empty)').length) {
      var $rows = $table.find('tr');
      // first row with data
      var rowIndex = $rows.index($rows.filter(':has(td:not(:empty)),:has(th:not(:empty))')[0]);
      return 'tr:nth-of-type(n+' + (rowIndex + 2) + ')';
    } else {
      return '';
    }
  },

  getTableHeaderRowSelector: function () {
    // handle legacy selectors
    if (this.tableHeaderRowSelector === undefined) {
      return 'thead tr';
    } else {
      return this.tableHeaderRowSelector;
    }
  },

  getTableDataRowSelector: function () {
    // handle legacy selectors
    if (this.tableDataRowSelector === undefined) {
      return 'tbody tr';
    } else {
      return this.tableDataRowSelector;
    }
  },

  /**
   * Extract table header column info from html
   * @param html
   */
  getTableHeaderColumnsFromHTML: function (headerRowSelector, html, options = {}) {
    var $ = options.$ || this.$;
    var $table = $(html);
    var $headerRowColumns = $table.find(headerRowSelector).find('td,th');

    var columns = [];

    $headerRowColumns.each(function (i, columnEl) {
      var header = $(columnEl).text().trim();
      var name = header;
      if (header.length !== 0) {
        columns.push({
          header: header,
          name: name,
          extract: true
        });
      }
    });
    return columns;
  }
};

module.exports = SelectorTable;

},{"jquery-deferred":29}],20:[function(require,module,exports){
var jquery = require('jquery-deferred');
var SelectorText = {

  canReturnMultipleRecords: function () {
    return true;
  },

  canHaveChildSelectors: function () {
    return false;
  },

  canHaveLocalChildSelectors: function () {
    return false;
  },

  canCreateNewJobs: function () {
    return false;
  },
  willReturnElements: function () {
    return false;
  },
  _getData: function (parentElement) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var dfd = jquery.Deferred();

    var elements = this.getDataElements(parentElement);

    var result = [];
    $(elements).each(function (k, element) {
      var data = {};

      // remove script, style tag contents from text results
      var $element_clone = $(element).clone();
      $element_clone.find('script, style').remove();
      // <br> replace br tags with newlines
      $element_clone.find('br').after('\n');

      var text = $element_clone.text();
      if (this.regex !== undefined && this.regex.length) {
        var matches = text.match(new RegExp(this.regex));
        if (matches !== null) {
          text = matches[0];
        } else {
          text = null;
        }
      }
      data[this.id] = text;

      result.push(data);
    }.bind(this));

    if (this.multiple === false && elements.length === 0) {
      var data = {};
      data[this.id] = null;
      result.push(data);
    }

    dfd.resolve(result);
    return dfd.promise();
  },

  getDataColumns: function () {
    return [this.id];
  },

  getFeatures: function () {
    return ['multiple', 'regex', 'delay'];
  }
};

module.exports = SelectorText;

},{"jquery-deferred":29}],21:[function(require,module,exports){
var Selector = require('./Selector');

var SelectorList = function (selectors, options) {
  var $ = options.$;
  var document = options.document;
  var window = options.window;
  // We don't want enumerable properties
  Object.defineProperty(this, '$', {
    value: $,
    enumerable: false
  });
  Object.defineProperty(this, 'window', {
    value: window,
    enumerable: false
  });
  Object.defineProperty(this, 'document', {
    value: document,
    enumerable: false
  });
  if (!this.$) throw new Error('Missing jquery');
  if (!this.document) throw new Error("Missing document");
  if (!this.window) throw new Error("Missing window");

  if (selectors === null || selectors === undefined) {
    return;
  }

  for (var i = 0; i < selectors.length; i++) {
    this.push(selectors[i]);
  }
};

SelectorList.prototype = [];

SelectorList.prototype.push = function (selector) {
  if (!this.hasSelector(selector.id)) {
    if (!(selector instanceof Selector)) {
      var $ = this.$;
      var document = this.document;
      var window = this.window;
      selector = new Selector(selector, { $, window, document });
    }
    Array.prototype.push.call(this, selector);
  }
};

SelectorList.prototype.hasSelector = function (selectorId) {
  if (selectorId instanceof Object) {
    selectorId = selectorId.id;
  }

  for (var i = 0; i < this.length; i++) {
    if (this[i].id === selectorId) {
      return true;
    }
  }
  return false;
};

/**
 * Returns all selectors or recursively find and return all child selectors of a parent selector.
 * @param parentSelectorId
 * @returns {Array}
 */
SelectorList.prototype.getAllSelectors = function (parentSelectorId) {
  if (parentSelectorId === undefined) {
    return this;
  }

  var getAllChildSelectors = function (parentSelectorId, resultSelectors) {
    this.forEach(function (selector) {
      if (selector.hasParentSelector(parentSelectorId)) {
        if (resultSelectors.indexOf(selector) === -1) {
          resultSelectors.push(selector);
          getAllChildSelectors(selector.id, resultSelectors);
        }
      }
    });
  }.bind(this);

  var resultSelectors = [];
  getAllChildSelectors(parentSelectorId, resultSelectors);
  return resultSelectors;
};

/**
 * Returns only selectors that are directly under a parent
 * @param parentSelectorId
 * @returns {Array}
 */
SelectorList.prototype.getDirectChildSelectors = function (parentSelectorId) {
  var $ = this.$;
  var document = this.document;
  var window = this.window;
  var resultSelectors = new SelectorList(null, { $, window, document });
  this.forEach(function (selector) {
    if (selector.hasParentSelector(parentSelectorId)) {
      resultSelectors.push(selector);
    }
  });
  return resultSelectors;
};

SelectorList.prototype.clone = function () {
  var $ = this.$;
  var document = this.document;
  var window = this.window;
  var resultList = new SelectorList(null, { $, window, document });
  this.forEach(function (selector) {
    resultList.push(selector);
  });
  return resultList;
};

SelectorList.prototype.fullClone = function () {
  var $ = this.$;
  var document = this.document;
  var window = this.window;
  var resultList = new SelectorList(null, { $, window, document });
  this.forEach(function (selector) {
    resultList.push(JSON.parse(JSON.stringify(selector)));
  });
  return resultList;
};

SelectorList.prototype.concat = function () {
  var resultList = this.clone();
  for (var i in arguments) {
    arguments[i].forEach(function (selector) {
      resultList.push(selector);
    });
  }
  return resultList;
};

SelectorList.prototype.getSelector = function (selectorId) {
  for (var i = 0; i < this.length; i++) {
    var selector = this[i];
    if (selector.id === selectorId) {
      return selector;
    }
  }
};

/**
 * Returns all selectors if this selectors including all parent selectors within this page
 * @TODO not used any more.
 * @param selectorId
 * @returns {*}
 */
SelectorList.prototype.getOnePageSelectors = function (selectorId) {
  var $ = this.$;
  var document = this.document;
  var window = this.window;
  var resultList = new SelectorList(null, { $, window, document });
  var selector = this.getSelector(selectorId);
  resultList.push(this.getSelector(selectorId));

  // recursively find all parent selectors that could lead to the page where selectorId is used.
  var findParentSelectors = function (selector) {
    selector.parentSelectors.forEach(function (parentSelectorId) {
      if (parentSelectorId === '_root') return;
      var parentSelector = this.getSelector(parentSelectorId);
      if (resultList.indexOf(parentSelector) !== -1) return;
      if (parentSelector.willReturnElements()) {
        resultList.push(parentSelector);
        findParentSelectors(parentSelector);
      }
    }.bind(this));
  }.bind(this);

  findParentSelectors(selector);

  // add all child selectors
  resultList = resultList.concat(this.getSinglePageAllChildSelectors(selector.id));
  return resultList;
};

/**
 * Returns all child selectors of a selector which can be used within one page.
 * @param parentSelectorId
 */
SelectorList.prototype.getSinglePageAllChildSelectors = function (parentSelectorId) {
  var $ = this.$;
  var document = this.document;
  var window = this.window;
  var resultList = new SelectorList(null, { $, window, document });
  var addChildSelectors = function (parentSelector) {
    if (parentSelector.willReturnElements()) {
      var childSelectors = this.getDirectChildSelectors(parentSelector.id);
      childSelectors.forEach(function (childSelector) {
        if (resultList.indexOf(childSelector) === -1) {
          resultList.push(childSelector);
          addChildSelectors(childSelector);
        }
      });
    }
  }.bind(this);

  var parentSelector = this.getSelector(parentSelectorId);
  addChildSelectors(parentSelector);
  return resultList;
};

SelectorList.prototype.willReturnMultipleRecords = function (selectorId) {
  // handle reuqested selector
  var selector = this.getSelector(selectorId);
  if (selector.willReturnMultipleRecords() === true) {
    return true;
  }

  // handle all its child selectors
  var childSelectors = this.getAllSelectors(selectorId);
  for (var i = 0; i < childSelectors.length; i++) {
    var selector = childSelectors[i];
    if (selector.willReturnMultipleRecords() === true) {
      return true;
    }
  }

  return false;
};

/**
 * When serializing to JSON convert to an array
 * @returns {Array}
 */
SelectorList.prototype.toJSON = function () {
  var result = [];
  this.forEach(function (selector) {
    result.push(selector);
  });
  return result;
};

SelectorList.prototype.getSelectorById = function (selectorId) {
  for (var i = 0; i < this.length; i++) {
    var selector = this[i];
    if (selector.id === selectorId) {
      return selector;
    }
  }
};

/**
 * returns css selector for a given element. css selector includes all parent element selectors
 * @param selectorId
 * @param parentSelectorIds array of parent selector ids from devtools Breadcumb
 * @returns string
 */
SelectorList.prototype.getCSSSelectorWithinOnePage = function (selectorId, parentSelectorIds) {
  var CSSSelector = this.getSelector(selectorId).selector;
  var parentCSSSelector = this.getParentCSSSelectorWithinOnePage(parentSelectorIds);
  CSSSelector = parentCSSSelector + CSSSelector;

  return CSSSelector;
};

/**
 * returns css selector for parent selectors that are within one page
 * @param parentSelectorIds array of parent selector ids from devtools Breadcumb
 * @returns string
 */
SelectorList.prototype.getParentCSSSelectorWithinOnePage = function (parentSelectorIds) {
  var CSSSelector = '';

  for (var i = parentSelectorIds.length - 1; i > 0; i--) {
    var parentSelectorId = parentSelectorIds[i];
    var parentSelector = this.getSelector(parentSelectorId);
    if (parentSelector.willReturnElements()) {
      CSSSelector = parentSelector.selector + ' ' + CSSSelector;
    } else {
      break;
    }
  }

  return CSSSelector;
};

SelectorList.prototype.hasRecursiveElementSelectors = function () {
  var RecursionFound = false;

  this.forEach(function (topSelector) {
    var visitedSelectors = [];

    var checkRecursion = function (parentSelector) {
      // already visited
      if (visitedSelectors.indexOf(parentSelector) !== -1) {
        RecursionFound = true;
        return;
      }

      if (parentSelector.willReturnElements()) {
        visitedSelectors.push(parentSelector);
        var childSelectors = this.getDirectChildSelectors(parentSelector.id);
        childSelectors.forEach(checkRecursion);
        visitedSelectors.pop();
      }
    }.bind(this);

    checkRecursion(topSelector);
  }.bind(this));

  return RecursionFound;
};

module.exports = SelectorList;

},{"./Selector":9}],22:[function(require,module,exports){
var SelectorElement = require('./Selector/SelectorElement');
var SelectorElementAttribute = require('./Selector/SelectorElementAttribute');
var SelectorElementClick = require('./Selector/SelectorElementClick');
var SelectorElementScroll = require('./Selector/SelectorElementScroll');
var SelectorGroup = require('./Selector/SelectorGroup');
var SelectorHTML = require('./Selector/SelectorHTML');
var SelectorImage = require('./Selector/SelectorImage');
var SelectorLink = require('./Selector/SelectorLink');
var SelectorPopupLink = require('./Selector/SelectorPopupLink');
var SelectorTable = require('./Selector/SelectorTable');
var SelectorText = require('./Selector/SelectorText');

module.exports = {
  SelectorElement,
  SelectorElementAttribute,
  SelectorElementClick,
  SelectorElementScroll,
  SelectorGroup,
  SelectorHTML,
  SelectorImage,
  SelectorLink,
  SelectorPopupLink,
  SelectorTable,
  SelectorText
};

},{"./Selector/SelectorElement":10,"./Selector/SelectorElementAttribute":11,"./Selector/SelectorElementClick":12,"./Selector/SelectorElementScroll":13,"./Selector/SelectorGroup":14,"./Selector/SelectorHTML":15,"./Selector/SelectorImage":16,"./Selector/SelectorLink":17,"./Selector/SelectorPopupLink":18,"./Selector/SelectorTable":19,"./Selector/SelectorText":20}],23:[function(require,module,exports){
var Selector = require('./Selector');
var SelectorList = require('./SelectorList');
var Sitemap = function (sitemapObj, options) {
  var $ = options.$;
  var document = options.document;
  var window = options.window;
  // We don't want enumerable properties
  Object.defineProperty(this, '$', {
    value: $,
    enumerable: false
  });
  Object.defineProperty(this, 'window', {
    value: window,
    enumerable: false
  });
  Object.defineProperty(this, 'document', {
    value: document,
    enumerable: false
  });
  if (!this.$) throw new Error('Missing jquery');
  if (!this.document) {
    console.error('extension/scripts/Sitemap.js:22:16:(new Error()).stack', new Error().stack);

    throw new Error("Missing document");
  }
  if (!this.window) throw new Error("Missing window");
  this.initData(sitemapObj);
};

Sitemap.prototype = {

  initData: function (sitemapObj) {
    console.log('extension/scripts/Sitemap.js:33:16:this', this);
    for (var key in sitemapObj) {
      console.log('extension/scripts/Sitemap.js:35:18:key', key);
      this[key] = sitemapObj[key];
    }
    console.log('extension/scripts/Sitemap.js:38:16:this', this);
    var $ = this.$;
    var window = this.window;
    var document = this.document;
    var selectors = this.selectors;
    this.selectors = new SelectorList(this.selectors, { $, window, document });
  },

  /**
   * Returns all selectors or recursively find and return all child selectors of a parent selector.
   * @param parentSelectorId
   * @returns {Array}
   */
  getAllSelectors: function (parentSelectorId) {
    return this.selectors.getAllSelectors(parentSelectorId);
  },

  /**
   * Returns only selectors that are directly under a parent
   * @param parentSelectorId
   * @returns {Array}
   */
  getDirectChildSelectors: function (parentSelectorId) {
    return this.selectors.getDirectChildSelectors(parentSelectorId);
  },

  /**
   * Returns all selector id parameters
   * @returns {Array}
   */
  getSelectorIds: function () {
    var ids = ['_root'];
    this.selectors.forEach(function (selector) {
      ids.push(selector.id);
    });
    return ids;
  },

  /**
   * Returns only selector ids which can have child selectors
   * @returns {Array}
   */
  getPossibleParentSelectorIds: function () {
    var ids = ['_root'];
    this.selectors.forEach(function (selector) {
      if (selector.canHaveChildSelectors()) {
        ids.push(selector.id);
      }
    });
    return ids;
  },

  getStartUrls: function () {
    var startUrls = this.startUrl;
    // single start url
    if (this.startUrl.push === undefined) {
      startUrls = [startUrls];
    }

    var urls = [];
    startUrls.forEach(function (startUrl) {
      // zero padding helper
      var lpad = function (str, length) {
        while (str.length < length) {
          str = '0' + str;
        }
        return str;
      };

      var re = /^(.*?)\[(\d+)\-(\d+)(:(\d+))?\](.*)$/;
      var matches = startUrl.match(re);
      if (matches) {
        var startStr = matches[2];
        var endStr = matches[3];
        var start = parseInt(startStr);
        var end = parseInt(endStr);
        var incremental = 1;
        console.log('extension/scripts/Sitemap.js:113:20:matches[5]', matches[5]);
        if (matches[5] !== undefined) {
          incremental = parseInt(matches[5]);
        }
        for (var i = start; i <= end; i += incremental) {
          // with zero padding
          if (startStr.length === endStr.length) {
            urls.push(matches[1] + lpad(i.toString(), startStr.length) + matches[6]);
          } else {
            urls.push(matches[1] + i + matches[6]);
          }
        }
        return urls;
      } else {
        urls.push(startUrl);
      }
    });

    return urls;
  },

  updateSelector: function (selector, selectorData) {
    // selector is undefined when creating a new one
    if (selector === undefined) {
      var $ = this.$;
      var document = this.document;
      var window = this.window;
      selector = new Selector(selectorData, { $, window, document });
    }

    // update child selectors
    if (selector.id !== undefined && selector.id !== selectorData.id) {
      this.selectors.forEach(function (currentSelector) {
        currentSelector.renameParentSelector(selector.id, selectorData.id);
      });

      // update cyclic selector
      var pos = selectorData.parentSelectors.indexOf(selector.id);
      if (pos !== -1) {
        selectorData.parentSelectors.splice(pos, 1, selectorData.id);
      }
    }

    selector.updateData(selectorData);

    if (this.getSelectorIds().indexOf(selector.id) === -1) {
      this.selectors.push(selector);
    }
  },
  deleteSelector: function (selectorToDelete) {
    this.selectors.forEach(function (selector) {
      if (selector.hasParentSelector(selectorToDelete.id)) {
        selector.removeParentSelector(selectorToDelete.id);
        if (selector.parentSelectors.length === 0) {
          this.deleteSelector(selector);
        }
      }
    }.bind(this));

    for (var i in this.selectors) {
      if (this.selectors[i].id === selectorToDelete.id) {
        this.selectors.splice(i, 1);
        break;
      }
    }
  },
  getDataTableId: function () {
    return this._id.replace(/\./g, '_');
  },
  exportSitemap: function () {
    var sitemapObj = JSON.parse(JSON.stringify(this));
    delete sitemapObj._rev;
    return JSON.stringify(sitemapObj);
  },
  importSitemap: function (sitemapJSON) {
    var sitemapObj = JSON.parse(sitemapJSON);
    this.initData(sitemapObj);
  },
  // return a list of columns than can be exported
  getDataColumns: function () {
    var columns = [];
    this.selectors.forEach(function (selector) {
      columns = columns.concat(selector.getDataColumns());
    });

    return columns;
  },
  getDataExportCsvBlob: function (data) {
    var window = this.window;
    var columns = this.getDataColumns(),
        delimiter = ';',
        newline = '\n',
        csvData = ['\ufeff']; // utf-8 bom char

    // header
    csvData.push(columns.join(delimiter) + newline);

    // data
    data.forEach(function (row) {
      var rowData = [];
      columns.forEach(function (column) {
        var cellData = row[column];
        if (cellData === undefined) {
          cellData = '';
        } else if (typeof cellData === 'object') {
          cellData = JSON.stringify(cellData);
        }

        rowData.push('"' + cellData.replace(/"/g, '""').trim() + '"');
      });
      csvData.push(rowData.join(delimiter) + newline);
    });

    return new window.Blob(csvData, { type: 'text/csv' });
  },
  getSelectorById: function (selectorId) {
    return this.selectors.getSelectorById(selectorId);
  },
  /**
   * Create full clone of sitemap
   * @returns {Sitemap}
   */
  clone: function () {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var clonedJSON = JSON.parse(JSON.stringify(this));
    var sitemap = new Sitemap(clonedJSON, { $, document, window });
    return sitemap;
  }
};

module.exports = Sitemap;

},{"./Selector":9,"./SelectorList":21}],24:[function(require,module,exports){
var Sitemap = require('./Sitemap');

/**
 * From devtools panel there is no possibility to execute XHR requests. So all requests to a remote CouchDb must be
 * handled through Background page. StoreDevtools is a simply a proxy store
 * @constructor
 */
var StoreDevtools = function (options) {
  this.$ = options.$;
  this.document = options.document;
  this.window = options.window;
  if (!this.$) throw new Error('jquery required');
  if (!this.document) throw new Error("Missing document");
  if (!this.window) throw new Error("Missing window");
};

StoreDevtools.prototype = {
  createSitemap: function (sitemap, callback) {
    var request = {
      createSitemap: true,
      sitemap: JSON.parse(JSON.stringify(sitemap))
    };

    chrome.runtime.sendMessage(request, function (callbackFn, originalSitemap, newSitemap) {
      originalSitemap._rev = newSitemap._rev;
      callbackFn(originalSitemap);
    }.bind(this, callback, sitemap));
  },
  saveSitemap: function (sitemap, callback) {
    this.createSitemap(sitemap, callback);
  },
  deleteSitemap: function (sitemap, callback) {
    var request = {
      deleteSitemap: true,
      sitemap: JSON.parse(JSON.stringify(sitemap))
    };
    chrome.runtime.sendMessage(request, function (response) {
      callback();
    });
  },
  getAllSitemaps: function (callback) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var request = {
      getAllSitemaps: true
    };

    chrome.runtime.sendMessage(request, function (response) {
      var sitemaps = [];

      for (var i in response) {
        sitemaps.push(new Sitemap(response[i], { $, document, window }));
      }
      callback(sitemaps);
    });
  },
  getSitemapData: function (sitemap, callback) {
    var request = {
      getSitemapData: true,
      sitemap: JSON.parse(JSON.stringify(sitemap))
    };

    chrome.runtime.sendMessage(request, function (response) {
      callback(response);
    });
  },
  sitemapExists: function (sitemapId, callback) {
    var request = {
      sitemapExists: true,
      sitemapId: sitemapId
    };

    chrome.runtime.sendMessage(request, function (response) {
      callback(response);
    });
  }
};

module.exports = StoreDevtools;

},{"./Sitemap":23}],25:[function(require,module,exports){
var CssSelector = require('css-selector').CssSelector;
// TODO get rid of jquery

/**
 * Only Elements unique will be added to this array
 * @constructor
 */
function UniqueElementList(clickElementUniquenessType, options) {
  var $ = options.$;
  var window = options.window;
  var document = options.document;

  Object.defineProperty(this, '$', {
    value: $,
    enumerable: false
  });
  Object.defineProperty(this, 'window', {
    value: window,
    enumerable: false
  });
  Object.defineProperty(this, 'document', {
    value: document,
    enumerable: false
  });
  if (!this.$) throw new Error('jquery required');
  if (!this.document) {
    throw new Error("Missing document");
  }
  if (!this.window) throw new Error("Missing window");
  this.clickElementUniquenessType = clickElementUniquenessType;
  this.addedElements = {};
}

UniqueElementList.prototype = [];

UniqueElementList.prototype.push = function (element) {
  var $ = this.$;
  var document = this.document;
  var window = this.window;
  if (this.isAdded(element)) {
    return false;
  } else {
    var elementUniqueId = this.getElementUniqueId(element);
    this.addedElements[elementUniqueId] = true;
    Array.prototype.push.call(this, $(element).clone(true)[0]);
    return true;
  }
};

UniqueElementList.prototype.getElementUniqueId = function (element) {
  var $ = this.$;
  var document = this.document;
  var window = this.window;
  if (this.clickElementUniquenessType === 'uniqueText') {
    var elementText = $(element).text().trim();
    return elementText;
  } else if (this.clickElementUniquenessType === 'uniqueHTMLText') {
    var elementHTML = $("<div class='-web-scraper-should-not-be-visible'>").append($(element).eq(0).clone()).html();
    return elementHTML;
  } else if (this.clickElementUniquenessType === 'uniqueHTML') {
    // get element without text
    var $element = $(element).eq(0).clone();

    var removeText = function ($element) {
      $element.contents().filter(function () {
        if (this.nodeType !== 3) {
          removeText($(this));
        }
        return this.nodeType == 3; // Node.TEXT_NODE
      }).remove();
    };
    removeText($element);

    var elementHTML = $("<div class='-web-scraper-should-not-be-visible'>").append($element).html();
    return elementHTML;
  } else if (this.clickElementUniquenessType === 'uniqueCSSSelector') {
    var cs = new CssSelector({
      enableSmartTableSelector: false,
      parent: $('body')[0],
      enableResultStripping: false
    });
    var CSSSelector = cs.getCssSelector([element]);
    return CSSSelector;
  } else {
    throw 'Invalid clickElementUniquenessType ' + this.clickElementUniquenessType;
  }
};

module.exports = UniqueElementList;

UniqueElementList.prototype.isAdded = function (element) {
  var elementUniqueId = this.getElementUniqueId(element);
  var isAdded = elementUniqueId in this.addedElements;
  return isAdded;
};

},{"css-selector":28}],26:[function(require,module,exports){
var jquery = require('jquery-deferred');
var BackgroundScript = require('./BackgroundScript');
/**
 * @param location	configure from where the content script is being accessed (ContentScript, BackgroundPage, DevTools)
 * @returns BackgroundScript
 */
var getBackgroundScript = function (location) {
  // Handle calls from different places
  if (location === 'BackgroundScript') {
    return BackgroundScript;
  } else if (location === 'DevTools' || location === 'ContentScript') {
    // if called within background script proxy calls to content script
    var backgroundScript = {};

    Object.keys(BackgroundScript).forEach(function (attr) {
      if (typeof BackgroundScript[attr] === 'function') {
        backgroundScript[attr] = function (request) {
          var reqToBackgroundScript = {
            backgroundScriptCall: true,
            fn: attr,
            request: request
          };

          var deferredResponse = jquery.Deferred();

          chrome.runtime.sendMessage(reqToBackgroundScript, function (response) {
            deferredResponse.resolve(response);
          });

          return deferredResponse;
        };
      } else {
        backgroundScript[attr] = BackgroundScript[attr];
      }
    });

    return backgroundScript;
  } else {
    throw new Error('Invalid BackgroundScript initialization - ' + location);
  }
};

module.exports = getBackgroundScript;

},{"./BackgroundScript":4,"jquery-deferred":29}],27:[function(require,module,exports){
var getBackgroundScript = require('./getBackgroundScript');
var ContentScript = require('./ContentScript');
/**
 *
 * @param location	configure from where the content script is being accessed (ContentScript, BackgroundPage, DevTools)
 * @param options
 * @returns ContentScript
 */
var getContentScript = function (location) {
  var contentScript;

  // Handle calls from different places
  if (location === 'ContentScript') {
    contentScript = ContentScript;
    contentScript.backgroundScript = getBackgroundScript('ContentScript');
    return contentScript;
  } else if (location === 'BackgroundScript' || location === 'DevTools') {
    var backgroundScript = getBackgroundScript(location);

    // if called within background script proxy calls to content script
    contentScript = {};
    Object.keys(ContentScript).forEach(function (attr) {
      if (typeof ContentScript[attr] === 'function') {
        contentScript[attr] = function (request) {
          var reqToContentScript = {
            contentScriptCall: true,
            fn: attr,
            request: request
          };

          return backgroundScript.executeContentScript(reqToContentScript);
        };
      } else {
        contentScript[attr] = ContentScript[attr];
      }
    });
    contentScript.backgroundScript = backgroundScript;
    return contentScript;
  } else {
    throw new Error('Invalid ContentScript initialization - ' + location);
  }
};

module.exports = getContentScript;

},{"./ContentScript":5,"./getBackgroundScript":26}],28:[function(require,module,exports){
module.exports = {
	CssSelector,
	ElementSelector,
	ElementSelectorList
}


function CssSelector (options) {

	var me = this;

	// defaults
	this.ignoredTags = ['font', 'b', 'i', 's'];
	this.parent = options.document || options.parent
	this.document = options.document || options.parent 
	this.ignoredClassBase = false;
	this.enableResultStripping = true;
	this.enableSmartTableSelector = false;
	this.ignoredClasses = [];
    this.allowMultipleSelectors = false;
	this.query = function (selector) {
		return me.parent.querySelectorAll(selector);
	};

	// overrides defaults with options
	for (var i in options) {
		this[i] = options[i];
	}
};

// TODO refactor element selector list into a ~ class
function ElementSelector (element, ignoredClasses) {

	this.element = element;
	this.isDirectChild = true;
	this.tag = element.localName;
	this.tag = this.tag.replace(/:/g, '\\:');

	// nth-of-child(n+1)
	this.indexn = null;
	this.index = 1;
	this.id = null;
	this.classes = new Array();

	// do not add additinal info to html, body tags.
	// html:nth-of-type(1) cannot be selected
	if(this.tag === 'html' || this.tag === 'HTML'
		|| this.tag === 'body' || this.tag === 'BODY') {
		this.index = null;
		return;
	}

	if (element.parentNode !== undefined) {
		// nth-child
		//this.index = [].indexOf.call(element.parentNode.children, element)+1;

		// nth-of-type
		for (var i = 0; i < element.parentNode.children.length; i++) {
			var child = element.parentNode.children[i];
			if (child === element) {
				break;
			}
			if (child.tagName === element.tagName) {
				this.index++;
			}
		}
	}

	if (element.id !== '') {
		if (typeof element.id === 'string') {
			this.id = element.id;
			this.id = this.id.replace(/:/g, '\\:');
		}
	}

	for (var i = 0; i < element.classList.length; i++) {
		var cclass = element.classList[i];
		if (ignoredClasses.indexOf(cclass) === -1) {
			cclass = cclass.replace(/:/g, '\\:');
			this.classes.push(cclass);
		}
	}
};

function ElementSelectorList (CssSelector) {
	this.CssSelector = CssSelector;
};

ElementSelectorList.prototype = new Array();

ElementSelectorList.prototype.getCssSelector = function () {

	var resultSelectors = [];

	// TDD
	for (var i = 0; i < this.length; i++) {
		var selector = this[i];

		var isFirstSelector = i === this.length-1;
		var resultSelector = selector.getCssSelector(isFirstSelector);

		if (this.CssSelector.enableSmartTableSelector) {
			if (selector.tag === 'tr') {
				if (selector.element.children.length === 2) {
					if (selector.element.children[0].tagName === 'TD'
						|| selector.element.children[0].tagName === 'TH'
						|| selector.element.children[0].tagName === 'TR') {

						var text = selector.element.children[0].textContent;
						text = text.trim();

						// escape quotes
						text.replace(/(\\*)(')/g, function (x) {
							var l = x.length;
							return (l % 2) ? x : x.substring(0, l - 1) + "\\'";
						});
						resultSelector += ":contains('" + text + "')";
					}
				}
			}
		}

		resultSelectors.push(resultSelector);
	}

	var resultCSSSelector = resultSelectors.reverse().join(' ');
	return resultCSSSelector;
};

ElementSelector.prototype = {

	getCssSelector: function (isFirstSelector) {

		if(isFirstSelector === undefined) {
			isFirstSelector = false;
		}

		var selector = this.tag;
		if (this.id !== null) {
			selector += '#' + this.id;
		}
		if (this.classes.length) {
			for (var i = 0; i < this.classes.length; i++) {
				selector += "." + this.classes[i];
			}
		}
		if (this.index !== null) {
			selector += ':nth-of-type(' + this.index + ')';
		}
		if (this.indexn !== null && this.indexn !== -1) {
			selector += ':nth-of-type(n+' + this.indexn + ')';
		}
		if(this.isDirectChild && isFirstSelector === false) {
			selector = "> "+selector;
		}

		return selector;
	},
	// merges this selector with another one.
	merge: function (mergeSelector) {

		if (this.tag !== mergeSelector.tag) {
			throw "different element selected (tag)";
		}

		if (this.index !== null) {
			if (this.index !== mergeSelector.index) {

				// use indexn only for two elements
				if (this.indexn === null) {
					var indexn = Math.min(mergeSelector.index, this.index);
					if (indexn > 1) {
						this.indexn = Math.min(mergeSelector.index, this.index);
					}
				}
				else {
					this.indexn = -1;
				}

				this.index = null;
			}
		}

		if(this.isDirectChild === true) {
			this.isDirectChild = mergeSelector.isDirectChild;
		}

		if (this.id !== null) {
			if (this.id !== mergeSelector.id) {
				this.id = null;
			}
		}

		if (this.classes.length !== 0) {
			var classes = new Array();

			for (var i in this.classes) {
				var cclass = this.classes[i];
				if (mergeSelector.classes.indexOf(cclass) !== -1) {
					classes.push(cclass);
				}
			}

			this.classes = classes;
		}
	}
};

CssSelector.prototype = {
	mergeElementSelectors: function (newSelecors) {

		if (newSelecors.length < 1) {
			throw "No selectors specified";
		}
		else if (newSelecors.length === 1) {
			return newSelecors[0];
		}

		// check selector total count
		var elementCountInSelector = newSelecors[0].length;
		for (var i = 0; i < newSelecors.length; i++) {
			var selector = newSelecors[i];
			if (selector.length !== elementCountInSelector) {
				throw "Invalid element count in selector";
			}
		}

		// merge selectors
		var resultingElements = newSelecors[0];
		for (var i = 1; i < newSelecors.length; i++) {
			var mergeElements = newSelecors[i];

			for (var j = 0; j < elementCountInSelector; j++) {
				resultingElements[j].merge(mergeElements[j]);
			}
		}
		return resultingElements;
	},
	stripSelector: function (selectors) {

		var cssSeletor = selectors.getCssSelector();
		var baseSelectedElements = this.query(cssSeletor);

		var compareElements = function (elements) {
			if (baseSelectedElements.length !== elements.length) {
				return false;
			}

			for (var j = 0; j < baseSelectedElements.length; j++) {
				if ([].indexOf.call(elements, baseSelectedElements[j]) === -1) {
					return false;
				}
			}
			return true;
		};
		// strip indexes
		for (var i = 0; i < selectors.length; i++) {
			var selector = selectors[i];
			if (selector.index !== null) {
				var index = selector.index;
				selector.index = null;
				var cssSeletor = selectors.getCssSelector();
				var newSelectedElements = this.query(cssSeletor);
				// if results doesn't match then undo changes
				if (!compareElements(newSelectedElements)) {
					selector.index = index;
				}
			}
		}

		// strip isDirectChild
		for (var i = 0; i < selectors.length; i++) {
			var selector = selectors[i];
			if (selector.isDirectChild === true) {
				selector.isDirectChild = false;
				var cssSeletor = selectors.getCssSelector();
				var newSelectedElements = this.query(cssSeletor);
				// if results doesn't match then undo changes
				if (!compareElements(newSelectedElements)) {
					selector.isDirectChild = true;
				}
			}
		}

		// strip ids
		for (var i = 0; i < selectors.length; i++) {
			var selector = selectors[i];
			if (selector.id !== null) {
				var id = selector.id;
				selector.id = null;
				var cssSeletor = selectors.getCssSelector();
				var newSelectedElements = this.query(cssSeletor);
				// if results doesn't match then undo changes
				if (!compareElements(newSelectedElements)) {
					selector.id = id;
				}
			}
		}

		// strip classes
		for (var i = 0; i < selectors.length; i++) {
			var selector = selectors[i];
			if (selector.classes.length !== 0) {
				for (var j = selector.classes.length - 1; j > 0; j--) {
					var cclass = selector.classes[j];
					selector.classes.splice(j, 1);
					var cssSeletor = selectors.getCssSelector();
					var newSelectedElements = this.query(cssSeletor);
					// if results doesn't match then undo changes
					if (!compareElements(newSelectedElements)) {
						selector.classes.splice(j, 0, cclass);
					}
				}
			}
		}

		// strip tags
		for (var i = selectors.length - 1; i > 0; i--) {
			var selector = selectors[i];
			selectors.splice(i, 1);
			var cssSeletor = selectors.getCssSelector();
			var newSelectedElements = this.query(cssSeletor);
			// if results doesn't match then undo changes
			if (!compareElements(newSelectedElements)) {
				selectors.splice(i, 0, selector);
			}
		}

		return selectors;
	},
	getElementSelectors: function (elements, top) {
		var elementSelectors = [];

		for (var i = 0; i < elements.length; i++) {
			var element = elements[i];
			var elementSelector = this.getElementSelector(element, top);
			elementSelectors.push(elementSelector);
		}

		return elementSelectors;
	},
	getElementSelector: function (element, top) {

		var elementSelectorList = new ElementSelectorList(this);
		while (true) {
			if (element === this.parent) {
				break;
			}
			else if (element === undefined || element === this.document) {
				throw 'element is not a child of the given parent';
			}
			if (this.isIgnoredTag(element.tagName)) {

				element = element.parentNode;
				continue;
			}
			if (top > 0) {
				top--;
				element = element.parentNode;
				continue;
			}

			var selector = new ElementSelector(element, this.ignoredClasses);
			// document does not have a tagName
			if(element.parentNode === this.document || this.isIgnoredTag(element.parentNode.tagName)) {
				selector.isDirectChild = false;
			}

			elementSelectorList.push(selector);
			element = element.parentNode;
		}

		return elementSelectorList;
	},

    /**
     * Compares whether two elements are similar. Similar elements should
     * have a common parrent and all parent elements should be the same type.
     * @param element1
     * @param element2
     */
    checkSimilarElements: function(element1, element2) {

        while (true) {

            if(element1.tagName !== element2.tagName) {
                return false;
            }
            if(element1 === element2) {
                return true;
            }

            // stop at body tag
            if (element1 === undefined || element1.tagName === 'body'
                || element1.tagName === 'BODY') {
                return false;
            }
            if (element2 === undefined || element2.tagName === 'body'
                || element2.tagName === 'BODY') {
                return false;
            }

            element1 = element1.parentNode;
            element2 = element2.parentNode;
        }
    },

    /**
     * Groups elements into groups if the emelents are not similar
     * @param elements
     */
    getElementGroups: function(elements) {

        // first elment is in the first group
        // @TODO maybe i dont need this?
        var groups = [[elements[0]]];

        for(var i = 1; i < elements.length; i++) {
            var elementNew = elements[i];
            var addedToGroup = false;
            for(var j = 0; j < groups.length; j++) {
                var group = groups[j];
                var elementGroup = group[0];
                if(this.checkSimilarElements(elementNew, elementGroup)) {
                    group.push(elementNew);
                    addedToGroup = true;
                    break;
                }
            }

            // add new group
            if(!addedToGroup) {
                groups.push([elementNew]);
            }
        }

        return groups;
    },
	getCssSelector: function (elements, top) {

		top = top || 0;

		var enableSmartTableSelector = this.enableSmartTableSelector;
		if (elements.length > 1) {
			this.enableSmartTableSelector = false;
		}

        // group elements into similarity groups
        var elementGroups = this.getElementGroups(elements);

        var resultCSSSelector;

        if(this.allowMultipleSelectors) {

            var groupSelectors = [];

            for(var i = 0; i < elementGroups.length; i++) {
                var groupElements = elementGroups[i];

                var elementSelectors = this.getElementSelectors(groupElements, top);
                var resultSelector = this.mergeElementSelectors(elementSelectors);
                if (this.enableResultStripping) {
                    resultSelector = this.stripSelector(resultSelector);
                }

                groupSelectors.push(resultSelector.getCssSelector());
            }

            resultCSSSelector = groupSelectors.join(', ');
        }
        else {
            if(elementGroups.length !== 1) {
                throw "found multiple element groups, but allowMultipleSelectors disabled";
            }

            var elementSelectors = this.getElementSelectors(elements, top);
            var resultSelector = this.mergeElementSelectors(elementSelectors);
            if (this.enableResultStripping) {
                resultSelector = this.stripSelector(resultSelector);
            }

            resultCSSSelector = resultSelector.getCssSelector();
        }

		this.enableSmartTableSelector = enableSmartTableSelector;

		// strip down selector
		return resultCSSSelector;
	},
	isIgnoredTag: function (tag) {
		return this.ignoredTags.indexOf(tag.toLowerCase()) !== -1;
	}
};

},{}],29:[function(require,module,exports){

module.exports = require('./lib/jquery-deferred');
},{"./lib/jquery-deferred":32}],30:[function(require,module,exports){
var jQuery = module.exports = require("./jquery-core.js"),
	core_rspace = /\s+/;
/**
* jQuery Callbacks
*
* Code from: https://github.com/jquery/jquery/blob/master/src/callbacks.js
*
*/


// String to Object options format cache
var optionsCache = {};

// Convert String-formatted options into Object-formatted ones and store in cache
function createOptions( options ) {
	var object = optionsCache[ options ] = {};
	jQuery.each( options.split( core_rspace ), function( _, flag ) {
		object[ flag ] = true;
	});
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	options = typeof options === "string" ?
		( optionsCache[ options ] || createOptions( options ) ) :
		jQuery.extend( {}, options );

	var // Last fire value (for non-forgettable lists)
		memory,
		// Flag to know if list was already fired
		fired,
		// Flag to know if list is currently firing
		firing,
		// First callback to fire (used internally by add and fireWith)
		firingStart,
		// End of the loop when firing
		firingLength,
		// Index of currently firing callback (modified by remove if needed)
		firingIndex,
		// Actual callback list
		list = [],
		// Stack of fire calls for repeatable lists
		stack = !options.once && [],
		// Fire callbacks
		fire = function( data ) {
			memory = options.memory && data;
			fired = true;
			firingIndex = firingStart || 0;
			firingStart = 0;
			firingLength = list.length;
			firing = true;
			for ( ; list && firingIndex < firingLength; firingIndex++ ) {
				if ( list[ firingIndex ].apply( data[ 0 ], data[ 1 ] ) === false && options.stopOnFalse ) {
					memory = false; // To prevent further calls using add
					break;
				}
			}
			firing = false;
			if ( list ) {
				if ( stack ) {
					if ( stack.length ) {
						fire( stack.shift() );
					}
				} else if ( memory ) {
					list = [];
				} else {
					self.disable();
				}
			}
		},
		// Actual Callbacks object
		self = {
			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {
					// First, we save the current length
					var start = list.length;
					(function add( args ) {
						jQuery.each( args, function( _, arg ) {
							var type = jQuery.type( arg );
							if ( type === "function" ) {
								if ( !options.unique || !self.has( arg ) ) {
									list.push( arg );
								}
							} else if ( arg && arg.length && type !== "string" ) {
								// Inspect recursively
								add( arg );
							}
						});
					})( arguments );
					// Do we need to add the callbacks to the
					// current firing batch?
					if ( firing ) {
						firingLength = list.length;
					// With memory, if we're not firing then
					// we should call right away
					} else if ( memory ) {
						firingStart = start;
						fire( memory );
					}
				}
				return this;
			},
			// Remove a callback from the list
			remove: function() {
				if ( list ) {
					jQuery.each( arguments, function( _, arg ) {
						var index;
						while( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
							list.splice( index, 1 );
							// Handle firing indexes
							if ( firing ) {
								if ( index <= firingLength ) {
									firingLength--;
								}
								if ( index <= firingIndex ) {
									firingIndex--;
								}
							}
						}
					});
				}
				return this;
			},
			// Control if a given callback is in the list
			has: function( fn ) {
				return jQuery.inArray( fn, list ) > -1;
			},
			// Remove all callbacks from the list
			empty: function() {
				list = [];
				return this;
			},
			// Have the list do nothing anymore
			disable: function() {
				list = stack = memory = undefined;
				return this;
			},
			// Is it disabled?
			disabled: function() {
				return !list;
			},
			// Lock the list in its current state
			lock: function() {
				stack = undefined;
				if ( !memory ) {
					self.disable();
				}
				return this;
			},
			// Is it locked?
			locked: function() {
				return !stack;
			},
			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				args = args || [];
				args = [ context, args.slice ? args.slice() : args ];
				if ( list && ( !fired || stack ) ) {
					if ( firing ) {
						stack.push( args );
					} else {
						fire( args );
					}
				}
				return this;
			},
			// Call all the callbacks with the given arguments
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},
			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};


},{"./jquery-core.js":31}],31:[function(require,module,exports){
/**
* jQuery core object.
*
* Worker with jQuery deferred
*
* Code from: https://github.com/jquery/jquery/blob/master/src/core.js
*
*/

var jQuery = module.exports = {
	type: type
	, isArray: isArray
	, isFunction: isFunction
	, isPlainObject: isPlainObject
	, each: each
	, extend: extend
	, noop: function() {}
};

var toString = Object.prototype.toString;

var class2type = {};
// Populate the class2type map
"Boolean Number String Function Array Date RegExp Object".split(" ").forEach(function(name) {
	class2type[ "[object " + name + "]" ] = name.toLowerCase();
});


function type( obj ) {
	return obj == null ?
		String( obj ) :
			class2type[ toString.call(obj) ] || "object";
}

function isFunction( obj ) {
	return jQuery.type(obj) === "function";
}

function isArray( obj ) {
	return jQuery.type(obj) === "array";
}

function each( object, callback, args ) {
	var name, i = 0,
	length = object.length,
	isObj = length === undefined || isFunction( object );

	if ( args ) {
		if ( isObj ) {
			for ( name in object ) {
				if ( callback.apply( object[ name ], args ) === false ) {
					break;
				}
			}
		} else {
			for ( ; i < length; ) {
				if ( callback.apply( object[ i++ ], args ) === false ) {
					break;
				}
			}
		}

		// A special, fast, case for the most common use of each
	} else {
		if ( isObj ) {
			for ( name in object ) {
				if ( callback.call( object[ name ], name, object[ name ] ) === false ) {
					break;
				}
			}
		} else {
			for ( ; i < length; ) {
				if ( callback.call( object[ i ], i, object[ i++ ] ) === false ) {
					break;
				}
			}
		}
	}

	return object;
}

function isPlainObject( obj ) {
	// Must be an Object.
	if ( !obj || jQuery.type(obj) !== "object" ) {
		return false;
	}
	return true;
}

function extend() {
	var options, name, src, copy, copyIsArray, clone,
	target = arguments[0] || {},
	i = 1,
	length = arguments.length,
	deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !jQuery.isFunction(target) ) {
		target = {};
	}

	// extend jQuery itself if only one argument is passed
	if ( length === i ) {
		target = this;
		--i;
	}

	for ( ; i < length; i++ ) {
		// Only deal with non-null/undefined values
		if ( (options = arguments[ i ]) != null ) {
			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// Prevent never-ending loop
				if ( target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)) ) ) {
					if ( copyIsArray ) {
						copyIsArray = false;
						clone = src && jQuery.isArray(src) ? src : [];

					} else {
						clone = src && jQuery.isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[ name ] = jQuery.extend( deep, clone, copy );

					// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};



},{}],32:[function(require,module,exports){

/*!
* jquery-deferred
* Copyright(c) 2011 Hidden <zzdhidden@gmail.com>
* MIT Licensed
*/

/**
* Library version.
*/

var jQuery = module.exports = require("./jquery-callbacks.js"),
	core_slice = Array.prototype.slice;

/**
* jQuery deferred
*
* Code from: https://github.com/jquery/jquery/blob/master/src/deferred.js
* Doc: http://api.jquery.com/category/deferred-object/
*
*/

jQuery.extend({

	Deferred: function( func ) {
		var tuples = [
				// action, add listener, listener list, final state
				[ "resolve", "done", jQuery.Callbacks("once memory"), "resolved" ],
				[ "reject", "fail", jQuery.Callbacks("once memory"), "rejected" ],
				[ "notify", "progress", jQuery.Callbacks("memory") ]
			],
			state = "pending",
			promise = {
				state: function() {
					return state;
				},
				always: function() {
					deferred.done( arguments ).fail( arguments );
					return this;
				},
				then: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;
					return jQuery.Deferred(function( newDefer ) {
						jQuery.each( tuples, function( i, tuple ) {
							var action = tuple[ 0 ],
								fn = fns[ i ];
							// deferred[ done | fail | progress ] for forwarding actions to newDefer
							deferred[ tuple[1] ]( jQuery.isFunction( fn ) ?
								function() {
									var returned = fn.apply( this, arguments );
									if ( returned && jQuery.isFunction( returned.promise ) ) {
										returned.promise()
											.done( newDefer.resolve )
											.fail( newDefer.reject )
											.progress( newDefer.notify );
									} else {
										newDefer[ action + "With" ]( this === deferred ? newDefer : this, [ returned ] );
									}
								} :
								newDefer[ action ]
							);
						});
						fns = null;
					}).promise();
				},
				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					return obj != null ? jQuery.extend( obj, promise ) : promise;
				}
			},
			deferred = {};

		// Keep pipe for back-compat
		promise.pipe = promise.then;

		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 3 ];

			// promise[ done | fail | progress ] = list.add
			promise[ tuple[1] ] = list.add;

			// Handle state
			if ( stateString ) {
				list.add(function() {
					// state = [ resolved | rejected ]
					state = stateString;

				// [ reject_list | resolve_list ].disable; progress_list.lock
				}, tuples[ i ^ 1 ][ 2 ].disable, tuples[ 2 ][ 2 ].lock );
			}

			// deferred[ resolve | reject | notify ] = list.fire
			deferred[ tuple[0] ] = list.fire;
			deferred[ tuple[0] + "With" ] = list.fireWith;
		});

		// Make the deferred a promise
		promise.promise( deferred );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	},

	// Deferred helper
	when: function( subordinate /* , ..., subordinateN */ ) {
		var i = 0,
			resolveValues = core_slice.call( arguments ),
			length = resolveValues.length,

			// the count of uncompleted subordinates
			remaining = length !== 1 || ( subordinate && jQuery.isFunction( subordinate.promise ) ) ? length : 0,

			// the master Deferred. If resolveValues consist of only a single Deferred, just use that.
			deferred = remaining === 1 ? subordinate : jQuery.Deferred(),

			// Update function for both resolve and progress values
			updateFunc = function( i, contexts, values ) {
				return function( value ) {
					contexts[ i ] = this;
					values[ i ] = arguments.length > 1 ? core_slice.call( arguments ) : value;
					if( values === progressValues ) {
						deferred.notifyWith( contexts, values );
					} else if ( !( --remaining ) ) {
						deferred.resolveWith( contexts, values );
					}
				};
			},

			progressValues, progressContexts, resolveContexts;

		// add listeners to Deferred subordinates; treat others as resolved
		if ( length > 1 ) {
			progressValues = new Array( length );
			progressContexts = new Array( length );
			resolveContexts = new Array( length );
			for ( ; i < length; i++ ) {
				if ( resolveValues[ i ] && jQuery.isFunction( resolveValues[ i ].promise ) ) {
					resolveValues[ i ].promise()
						.done( updateFunc( i, resolveContexts, resolveValues ) )
						.fail( deferred.reject )
						.progress( updateFunc( i, progressContexts, progressValues ) );
				} else {
					--remaining;
				}
			}
		}

		// if we're not waiting on anything, resolve the master
		if ( !remaining ) {
			deferred.resolveWith( resolveContexts, resolveValues );
		}

		return deferred.promise();
	}
});

},{"./jquery-callbacks.js":30}]},{},[3])(3)
});