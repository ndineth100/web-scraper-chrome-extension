(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.contentScraper = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var jquery = require('jquery-deferred')
/**
 * @url http://jsperf.com/blob-base64-conversion
 * @type {{blobToBase64: blobToBase64, base64ToBlob: base64ToBlob}}
 */
var Base64 = {

  blobToBase64: function (blob) {
    var deferredResponse = jquery.Deferred()
    var reader = new FileReader()
    reader.onload = function () {
      var dataUrl = reader.result
      var base64 = dataUrl.split(',')[1]
      deferredResponse.resolve(base64)
    }
    reader.readAsDataURL(blob)

    return deferredResponse.promise()
  },

  base64ToBlob: function (base64, mimeType) {
    var deferredResponse = jquery.Deferred()
    var binary = atob(base64)
    var len = binary.length
    var buffer = new ArrayBuffer(len)
    var view = new Uint8Array(buffer)
    for (var i = 0; i < len; i++) {
      view[i] = binary.charCodeAt(i)
    }
    var blob = new Blob([view], {type: mimeType})
    deferredResponse.resolve(blob)

    return deferredResponse.promise()
  }
}

module.exports = Base64

},{"jquery-deferred":29}],2:[function(require,module,exports){
var jquery = require('jquery-deferred')
/**
 * @author Martins Balodis
 *
 * An alternative version of $.when which can be used to execute asynchronous
 * calls sequentially one after another.
 *
 * @returns jqueryDeferred().promise()
 */
module.exports = function whenCallSequentially (functionCalls) {
  var deferredResonse = jquery.Deferred()
  var resultData = []

	// nothing to do
  if (functionCalls.length === 0) {
    return deferredResonse.resolve(resultData).promise()
  }

  var currentDeferred = functionCalls.shift()()
	// execute synchronous calls synchronously
  while (currentDeferred.state() === 'resolved') {
    currentDeferred.done(function (data) {
      resultData.push(data)
    })
    if (functionCalls.length === 0) {
      return deferredResonse.resolve(resultData).promise()
    }
    currentDeferred = functionCalls.shift()()
  }

	// handle async calls
  var interval = setInterval(function () {
		// handle mixed sync calls
    while (currentDeferred.state() === 'resolved') {
      currentDeferred.done(function (data) {
        resultData.push(data)
      })
      if (functionCalls.length === 0) {
        clearInterval(interval)
        deferredResonse.resolve(resultData)
        break
      }
      currentDeferred = functionCalls.shift()()
    }
  }, 10)

  return deferredResonse.promise()
}

},{"jquery-deferred":29}],3:[function(require,module,exports){
var StoreDevtools = require('./StoreDevtools')
var SitemapController = require('./Controller')

$(function () {
	// init bootstrap alerts
  $('.alert').alert()

  var store = new StoreDevtools({$})
  new SitemapController({
    store: store,
    templateDir: 'views/'
  }, {$})
})

},{"./Controller":7,"./StoreDevtools":24}],4:[function(require,module,exports){
var jquery = require('jquery-deferred')
/**
 * ContentScript that can be called from anywhere within the extension
 */
var BackgroundScript = {

  dummy: function () {
    return jquery.Deferred().resolve('dummy').promise()
  },

	/**
	 * Returns the id of the tab that is visible to user
	 * @returns jquery.Deferred() integer
	 */
  getActiveTabId: function () {
    var deferredResponse = jquery.Deferred()

    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, function (tabs) {
      if (tabs.length < 1) {
				// @TODO must be running within popup. maybe find another active window?
        deferredResponse.reject("couldn't find the active tab")
      } else {
        var tabId = tabs[0].id
        deferredResponse.resolve(tabId)
      }
    })
    return deferredResponse.promise()
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
    }
    var deferredResponse = jquery.Deferred()
    var deferredActiveTabId = this.getActiveTabId()
    deferredActiveTabId.done(function (tabId) {
      chrome.tabs.sendMessage(tabId, reqToContentScript, function (response) {
        deferredResponse.resolve(response)
      })
    })

    return deferredResponse
  }
}

module.exports = BackgroundScript

},{"jquery-deferred":29}],5:[function(require,module,exports){
var ContentSelector = require('./ContentSelector')
var jquery = require('jquery-deferred')
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
    var $ = options.$
    var deferredHTML = jquery.Deferred()
    var html = $(request.CSSSelector).clone().wrap('<p>').parent().html()
    deferredHTML.resolve(html)
    return deferredHTML.promise()
  },

	/**
	 * Removes current content selector if is in use within the page
	 * @returns jquery.Deferred()
	 */
  removeCurrentContentSelector: function () {
    var deferredResponse = jquery.Deferred()
    var contentSelector = window.cs
    if (contentSelector === undefined) {
      deferredResponse.resolve()
    } else {
      contentSelector.removeGUI()
      window.cs = undefined
      deferredResponse.resolve()
    }

    return deferredResponse.promise()
  },

	/**
	 * Select elements within the page
	 * @param request.parentCSSSelector
	 * @param request.allowedElements
	 */
  selectSelector: function (request, options) {
    var $ = options.$
    var deferredResponse = jquery.Deferred()

    this.removeCurrentContentSelector().done(function () {
      var contentSelector = new ContentSelector({
        parentCSSSelector: request.parentCSSSelector,
        allowedElements: request.allowedElements
      }, {$})
      window.cs = contentSelector

      var deferredCSSSelector = contentSelector.getCSSSelector()
      deferredCSSSelector.done(function (response) {
        this.removeCurrentContentSelector().done(function () {
          deferredResponse.resolve(response)
          window.cs = undefined
        })
      }.bind(this)).fail(function (message) {
        deferredResponse.reject(message)
        window.cs = undefined
      })
    }.bind(this))

    return deferredResponse.promise()
  },

	/**
	 * Preview elements
	 * @param request.parentCSSSelector
	 * @param request.elementCSSSelector
	 */
  previewSelector: function (request, options) {
    var $ = options.$
    var deferredResponse = jquery.Deferred()
    this.removeCurrentContentSelector().done(function () {
      var contentSelector = new ContentSelector({
        parentCSSSelector: request.parentCSSSelector
      }, {$})
      window.cs = contentSelector

      var deferredSelectorPreview = contentSelector.previewSelector(request.elementCSSSelector)
      deferredSelectorPreview.done(function () {
        deferredResponse.resolve()
      }).fail(function (message) {
        deferredResponse.reject(message)
        window.cs = undefined
      })
    })
    return deferredResponse
  }
}

module.exports = ContentScript

},{"./ContentSelector":6,"jquery-deferred":29}],6:[function(require,module,exports){
var ElementQuery = require('./ElementQuery')
var jquery = require('jquery-deferred')
var CssSelector = require('css-selector').CssSelector
/**
 * @param options.parentCSSSelector	Elements can be only selected within this element
 * @param options.allowedElements	Elements that can only be selected
 * @constructor
 */
var ContentSelector = function (options, moreOptions) {
	// deferred response
  this.deferredCSSSelectorResponse = jquery.Deferred()

  this.allowedElements = options.allowedElements
  this.parentCSSSelector = options.parentCSSSelector.trim()
  this.alert = options.alert || function (txt) { alert(txt) }

  this.$ = moreOptions.$
this.document = moreOptions.document
this.window = moreOptions.window
  if (!this.$) throw new Error('Missing jquery in content selector')
if (!this.document) throw new Error("Missing document")
if(!this.window)throw new Error("Missing window")
  if (this.parentCSSSelector) {
    this.parent = this.$(this.parentCSSSelector)[0]

		//  handle situation when parent selector not found
    if (this.parent === undefined) {
      this.deferredCSSSelectorResponse.reject('parent selector not found')
      this.alert('Parent element not found!')
    }
  }	else {
    this.parent = this.$('body')[0]
  }
}

ContentSelector.prototype = {

	/**
	 * get css selector selected by the user
	 */
  getCSSSelector: function (request) {
    if (this.deferredCSSSelectorResponse.state() !== 'rejected') {
			// elements that are selected by the user
      this.selectedElements = []
			// element selected from top
      this.top = 0

			// initialize css selector
      this.initCssSelector(false)

      this.initGUI()
    }

    return this.deferredCSSSelectorResponse.promise()
  },

  getCurrentCSSSelector: function () {
    if (this.selectedElements && this.selectedElements.length > 0) {
      var cssSelector

			// handle special case when parent is selected
      if (this.isParentSelected()) {
        if (this.selectedElements.length === 1) {
          cssSelector = '_parent_'
        } else if (this.$('#-selector-toolbar [name=diferentElementSelection]').prop('checked')) {
          var selectedElements = this.selectedElements.clone()
          selectedElements.splice(selectedElements.indexOf(this.parent), 1)
          cssSelector = '_parent_, ' + this.cssSelector.getCssSelector(selectedElements, this.top)
        } else {
					// will trigger error where multiple selections are not allowed
          cssSelector = this.cssSelector.getCssSelector(this.selectedElements, this.top)
        }
      }			else {
        cssSelector = this.cssSelector.getCssSelector(this.selectedElements, this.top)
      }

      return cssSelector
    }
    return ''
  },

  isParentSelected: function () {
    return this.selectedElements.indexOf(this.parent) !== -1
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
      ignoredClasses: [
        '-sitemap-select-item-selected',
        '-sitemap-select-item-hover',
        '-sitemap-parent',
        '-web-scraper-img-on-top',
        '-web-scraper-selection-active'
      ],
      query: this.$
    })
  },

  previewSelector: function (elementCSSSelector) {
    var $ = this.$
    if (this.deferredCSSSelectorResponse.state() !== 'rejected') {
      this.highlightParent()
      $(ElementQuery(elementCSSSelector, this.parent, {$})).addClass('-sitemap-select-item-selected')
      this.deferredCSSSelectorResponse.resolve()
    }

    return this.deferredCSSSelectorResponse.promise()
  },

  initGUI: function () {
    var document = this.document
    this.highlightParent()

		// all elements except toolbar
    this.$allElements = this.$(this.allowedElements + ':not(#-selector-toolbar):not(#-selector-toolbar *)', this.parent)
		// allow selecting parent also
    if (this.parent !== document.body) {
      this.$allElements.push(this.parent)
    }

    this.bindElementHighlight()
    this.bindElementSelection()
    this.bindKeyboardSelectionManipulations()
    this.attachToolbar()
    this.bindMultipleGroupCheckbox()
    this.bindMultipleGroupPopupHide()
    this.bindMoveImagesToTop()
  },

  bindElementSelection: function () {
    this.$allElements.bind('click.elementSelector', function (e) {
      var element = e.currentTarget
      if (this.selectedElements.indexOf(element) === -1) {
        this.selectedElements.push(element)
      }
      this.highlightSelectedElements()

			// Cancel all other events
      return false
    }.bind(this))
  },

	/**
	 * Add to select elements the element that is under the mouse
	 */
  selectMouseOverElement: function () {
    var element = this.mouseOverElement
    if (element) {
      this.selectedElements.push(element)
      this.highlightSelectedElements()
    }
  },

  bindElementHighlight: function () {
    this.$(this.$allElements).bind('mouseover.elementSelector', function (e) {
      var element = e.currentTarget
      this.mouseOverElement = element
      this.$(element).addClass('-sitemap-select-item-hover')
      return false
    }.bind(this)).bind('mouseout.elementSelector', function (e) {
      var element = e.currentTarget
      this.mouseOverElement = null
      this.$(element).removeClass('-sitemap-select-item-hover')
      return false
    }.bind(this))
  },

  bindMoveImagesToTop: function () {
    this.$('body').addClass('-web-scraper-selection-active')

		// do this only when selecting images
    if (this.allowedElements === 'img') {
      this.$('img').filter(function (i, element) {
        return this.$(element).css('position') === 'static'
      }).addClass('-web-scraper-img-on-top')
    }
  },

  unbindMoveImagesToTop: function () {
    this.$('body.-web-scraper-selection-active').removeClass('-web-scraper-selection-active')
    this.$('img.-web-scraper-img-on-top').removeClass('-web-scraper-img-on-top')
  },

  selectChild: function () {
    this.top--
    if (this.top < 0) {
      this.top = 0
    }
  },
  selectParent: function () {
    this.top++
  },

	// User with keyboard arrows can select child or paret elements of selected elements.
  bindKeyboardSelectionManipulations: function () {
    var document = this.document
		// check for focus
    var lastFocusStatus
    this.keyPressFocusInterval = setInterval(function () {
      var focus = document.hasFocus()
      if (focus === lastFocusStatus) return
      lastFocusStatus = focus

      this.$('#-selector-toolbar .key-button').toggleClass('hide', !focus)
      this.$('#-selector-toolbar .key-events').toggleClass('hide', focus)
    }, 200)

		// Using up/down arrows user can select elements from top of the
		// selected element
    this.$(document).bind('keydown.selectionManipulation', function (event) {
			// select child C
      if (event.keyCode === 67) {
        this.animateClickedKey(this.$('#-selector-toolbar .key-button-child'))
        this.selectChild()
      }
			// select parent P
      else if (event.keyCode === 80) {
        this.animateClickedKey(this.$('#-selector-toolbar .key-button-parent'))
        this.selectParent()
      }
			// select element
      else if (event.keyCode === 83) {
        this.animateClickedKey(this.$('#-selector-toolbar .key-button-select'))
        this.selectMouseOverElement()
      }

      this.highlightSelectedElements()
    }.bind(this))
  },

  animateClickedKey: function (element) {
    this.$(element).removeClass('clicked').removeClass('clicked-animation')
    setTimeout(function () {
      this.$(element).addClass('clicked')
      setTimeout(function () {
        this.$(element).addClass('clicked-animation')
      }, 100)
    }, 1)
  },

  highlightSelectedElements: function () {
    var $ = this.$
    try {
      var resultCssSelector = this.getCurrentCSSSelector()

      $('body #-selector-toolbar .selector').text(resultCssSelector)
			// highlight selected elements
      $('.-sitemap-select-item-selected').removeClass('-sitemap-select-item-selected')
      $(ElementQuery(resultCssSelector, this.parent, {$})).addClass('-sitemap-select-item-selected')
    } catch (err) {
      if (err === 'found multiple element groups, but allowMultipleSelectors disabled') {
        console.log('multiple different element selection disabled')

        this.showMultipleGroupPopup()
				// remove last added element
        this.selectedElements.pop()
        this.highlightSelectedElements()
      }
    }
  },

  showMultipleGroupPopup: function () {
    this.$('#-selector-toolbar .popover').attr('style', 'display:block !important;')
  },

  hideMultipleGroupPopup: function () {
    this.$('#-selector-toolbar .popover').attr('style', '')
  },

  bindMultipleGroupPopupHide: function () {
    this.$('#-selector-toolbar .popover .close').click(this.hideMultipleGroupPopup.bind(this))
  },

  unbindMultipleGroupPopupHide: function () {
    this.$('#-selector-toolbar .popover .close').unbind('click')
  },

  bindMultipleGroupCheckbox: function () {
    this.$('#-selector-toolbar [name=diferentElementSelection]').change(function (e) {
      if (this.$(e.currentTarget).is(':checked')) {
        this.initCssSelector(true)
      } else {
        this.initCssSelector(false)
      }
    }.bind(this))
  },
  unbindMultipleGroupCheckbox: function () {
    this.$('#-selector-toolbar .diferentElementSelection').unbind('change')
  },

  attachToolbar: function () {
    var $toolbar = '<div id="-selector-toolbar">' +
			'<div class="list-item"><div class="selector-container"><div class="selector"></div></div></div>' +
			'<div class="input-group-addon list-item">' +
				'<input type="checkbox" title="Enable different type element selection" name="diferentElementSelection">' +
				'<div class="popover top">' +
				'<div class="close">×</div>' +
				'<div class="arrow"></div>' +
				'<div class="popover-content">' +
				'<div class="txt">' +
				'Different type element selection is disabled. If the element ' +
				'you clicked should also be included then enable this and ' +
				'click on the element again. Usually this is not needed.' +
				'</div>' +
				'</div>' +
				'</div>' +
			'</div>' +
			'<div class="list-item key-events"><div title="Click here to enable key press events for selection">Enable key events</div></div>' +
			'<div class="list-item key-button key-button-select hide" title="Use S key to select element">S</div>' +
			'<div class="list-item key-button key-button-parent hide" title="Use P key to select parent">P</div>' +
			'<div class="list-item key-button key-button-child hide" title="Use C key to select child">C</div>' +
			'<div class="list-item done-selecting-button">Done selecting!</div>' +
			'</div>'
    this.$('body').append($toolbar)

    this.$('body #-selector-toolbar .done-selecting-button').click(function () {
      this.selectionFinished()
    }.bind(this))
  },
  highlightParent: function () {
		// do not highlight parent if its the body
    if (!this.$(this.parent).is('body') && !this.$(this.parent).is('#webpage')) {
      this.$(this.parent).addClass('-sitemap-parent')
    }
  },

  unbindElementSelection: function () {
    this.$(this.$allElements).unbind('click.elementSelector')
		// remove highlighted element classes
    this.unbindElementSelectionHighlight()
  },
  unbindElementSelectionHighlight: function () {
    this.$('.-sitemap-select-item-selected').removeClass('-sitemap-select-item-selected')
    this.$('.-sitemap-parent').removeClass('-sitemap-parent')
  },
  unbindElementHighlight: function () {
    this.$(this.$allElements).unbind('mouseover.elementSelector')
			.unbind('mouseout.elementSelector')
  },
  unbindKeyboardSelectionMaipulatios: function () {
    this.$(document).unbind('keydown.selectionManipulation')
    clearInterval(this.keyPressFocusInterval)
  },
  removeToolbar: function () {
    this.$('body #-selector-toolbar a').unbind('click')
    this.$('#-selector-toolbar').remove()
  },

	/**
	 * Remove toolbar and unbind events
	 */
  removeGUI: function () {
    this.unbindElementSelection()
    this.unbindElementHighlight()
    this.unbindKeyboardSelectionMaipulatios()
    this.unbindMultipleGroupPopupHide()
    this.unbindMultipleGroupCheckbox()
    this.unbindMoveImagesToTop()
    this.removeToolbar()
  },

  selectionFinished: function () {
    var resultCssSelector = this.getCurrentCSSSelector()

    this.deferredCSSSelectorResponse.resolve({
      CSSSelector: resultCssSelector
    })
  }
}

module.exports = ContentSelector

},{"./ElementQuery":8,"css-selector":28,"jquery-deferred":29}],7:[function(require,module,exports){
var selectors = require('./Selectors')
var Selector = require('./Selector')
var SelectorTable = selectors.SelectorTable
var Sitemap = require('./Sitemap')
// var SelectorGraphv2 = require('./SelectorGraphv2')
var getBackgroundScript = require('./getBackgroundScript')
var getContentScript = require('./getContentScript')
var SitemapController = function (options, moreOptions) {
  this.$ = moreOptions.$
this.document = moreOptions.document
this.window = moreOptions.window
  if (!this.$) throw new Error('Missing jquery in Controller')
if (!this.document) throw new Error("Missing document")
if(!this.window)throw new Error("Missing window")
  for (var i in options) {
    this[i] = options[i]
  }
  this.init()
}

SitemapController.prototype = {

  backgroundScript: getBackgroundScript('DevTools'),
  contentScript: getContentScript('DevTools'),

  control: function (controls) {
    var controller = this

    for (var selector in controls) {
      for (var event in controls[selector]) {
        this.$(document).on(event, selector, (function (selector, event) {
          return function () {
            var continueBubbling = controls[selector][event].call(controller, this)
            if (continueBubbling !== true) {
              return false
            }
          }
        })(selector, event))
      }
    }
  },

	/**
	 * Loads templates for ICanHaz
	 */
  loadTemplates: function (cbAllTemplatesLoaded) {
    var templateIds = [
      'Viewport',
      'SitemapList',
      'SitemapListItem',
      'SitemapCreate',
      'SitemapStartUrlField',
      'SitemapImport',
      'SitemapExport',
      'SitemapBrowseData',
      'SitemapScrapeConfig',
      'SitemapExportDataCSV',
      'SitemapEditMetadata',
      'SelectorList',
      'SelectorListItem',
      'SelectorEdit',
      'SelectorEditTableColumn',
      // 'SitemapSelectorGraph',
      'DataPreview'
    ]
    var templatesLoaded = 0
    var cbLoaded = function (templateId, template) {
      templatesLoaded++
      ich.addTemplate(templateId, template)
      if (templatesLoaded === templateIds.length) {
        cbAllTemplatesLoaded()
      }
    }

    templateIds.forEach(function (templateId) {
      this.$.get(this.templateDir + templateId + '.html', cbLoaded.bind(this, templateId))
    }.bind(this))
  },

  init: function () {
    this.loadTemplates(function () {
			// currently viewed objects
      this.clearState()

			// render main viewport
      ich.Viewport().appendTo('body')

			// cancel all form submits
      this.$('form').bind('submit', function () {
        return false
      })

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
          submit: function () { return false }
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
        '#submit-scrape-sitemap-form': {
          submit: function () { return false }
        },
        '#submit-scrape-sitemap': {
          click: this.scrapeSitemap
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
      })
      this.showSitemaps()
    }.bind(this))
  },

  clearState: function () {
    this.state = {
			// sitemap that is currently open
      currentSitemap: null,
			// selector ids that are shown in the navigation
      editSitemapBreadcumbsSelectors: null,
      currentParentSelectorId: null,
      currentSelector: null
    }
  },

  setStateEditSitemap: function (sitemap) {
    this.state.currentSitemap = sitemap
    this.state.editSitemapBreadcumbsSelectors = [
			{id: '_root'}
    ]
    this.state.currentParentSelectorId = '_root'
  },

  setActiveNavigationButton: function (navigationId) {
    this.$('.nav .active').removeClass('active')
    this.$('#' + navigationId + '-nav-button').closest('li').addClass('active')

    if (navigationId.match(/^sitemap-/)) {
      this.$('#sitemap-nav-button').removeClass('disabled')
      this.$('#sitemap-nav-button').closest('li').addClass('active')
      this.$('#navbar-active-sitemap-id').text('(' + this.state.currentSitemap._id + ')')
    }		else {
      this.$('#sitemap-nav-button').addClass('disabled')
      this.$('#navbar-active-sitemap-id').text('')
    }

    if (navigationId.match(/^create-sitemap-/)) {
      this.$('#create-sitemap-nav-button').closest('li').addClass('active')
    }
  },

	/**
	 * Simple info popup for sitemap start url input field
	 */
  initMultipleStartUrlHelper: function () {
    this.$('#startUrl')
			.popover({
  title: 'Multiple start urls',
  html: true,
  content: 'You can create ranged start urls like this:<br />http://example.com/[1-100].html',
  placement: 'bottom'
})
			.blur(function () {
  this.$(this).popover('hide')
})
  },

	/**
	 * Returns bootstrapValidator object for current form in viewport
	 */
  getFormValidator: function () {
    var validator = this.$('#viewport form').data('bootstrapValidator')
    return validator
  },

	/**
	 * Returns whether current form in the viewport is valid
	 * @returns {Boolean}
	 */
  isValidForm: function () {
    var validator = this.getFormValidator()

		// validator.validate();
		// validate method calls submit which is not needed in this case.
    for (var field in validator.options.fields) {
      validator.validateField(field)
    }

    var valid = validator.isValid()
    return valid
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
                return true
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
    })
  },

  showCreateSitemap: function () {
    this.setActiveNavigationButton('create-sitemap-create')
    var sitemapForm = ich.SitemapCreate()
    this.$('#viewport').html(sitemapForm)
    this.initMultipleStartUrlHelper()
    this.initSitemapValidation()

    return true
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
                return true
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
                  JSON.parse(value)
                } catch (e) {
                  return false
                }
                return true
              }
            }
          }
        }
      }
    })
  },

  showImportSitemapPanel: function () {
    this.setActiveNavigationButton('create-sitemap-import')
    var sitemapForm = ich.SitemapImport()
    this.$('#viewport').html(sitemapForm)
    this.initImportStiemapValidation()
    return true
  },

  showSitemapExportPanel: function () {
    this.setActiveNavigationButton('sitemap-export')
    var sitemap = this.state.currentSitemap
    var sitemapJSON = sitemap.exportSitemap()
    var sitemapExportForm = ich.SitemapExport({
      sitemapJSON: sitemapJSON
    })
    this.$('#viewport').html(sitemapExportForm)
    return true
  },

  showSitemaps: function () {
    this.clearState()
    this.setActiveNavigationButton('sitemaps')

    this.store.getAllSitemaps(function (sitemaps) {
      var $sitemapListPanel = ich.SitemapList()
      sitemaps.forEach(function (sitemap) {
        var $sitemap = ich.SitemapListItem(sitemap)
        $sitemap.data('sitemap', sitemap)
        $sitemapListPanel.find('tbody').append($sitemap)
      })
      this.$('#viewport').html($sitemapListPanel)
    })
  },

  getSitemapFromMetadataForm: function () {
    var id = this.$('#viewport form input[name=_id]').val()
    var $startUrlInputs = this.$('#viewport form .input-start-url')
    var startUrl
    if ($startUrlInputs.length === 1) {
      startUrl = $startUrlInputs.val()
    } else {
      startUrl = []
      $startUrlInputs.each(function (i, element) {
        startUrl.push(this.$(element).val())
      })
    }

    return {
      id: id,
      startUrl: startUrl
    }
  },

  createSitemap: function (form) {
    var $ = this.$
		// cancel submit if invalid form
    if (!this.isValidForm()) {
      return false
    }

    var sitemapData = this.getSitemapFromMetadataForm()

		// check whether sitemap with this id already exist
    this.store.sitemapExists(sitemapData.id, function (sitemapExists) {
      if (sitemapExists) {
        var validator = this.getFormValidator()
        validator.updateStatus('_id', 'INVALID', 'callback')
      } else {
        var sitemap = new Sitemap({
          _id: sitemapData.id,
          startUrl: sitemapData.startUrl,
          selectors: []
        }, {$})
        this.store.createSitemap(sitemap, function (sitemap) {
          this._editSitemap(sitemap, ['_root'])
        }.bind(this, sitemap))
      }
    }.bind(this))
  },

  importSitemap: function () {
    var $ = this.$
		// cancel submit if invalid form
    if (!this.isValidForm()) {
      return false
    }

		// load data from form
    var sitemapJSON = this.$('[name=sitemapJSON]').val()
    var id = this.$('input[name=_id]').val()
    var sitemap = new Sitemap(null, {$})
    sitemap.importSitemap(sitemapJSON)
    if (id.length) {
      sitemap._id = id
    }
		// check whether sitemap with this id already exist
    this.store.sitemapExists(sitemap._id, function (sitemapExists) {
      if (sitemapExists) {
        var validator = this.getFormValidator()
        validator.updateStatus('_id', 'INVALID', 'callback')
      } else {
        this.store.createSitemap(sitemap, function (sitemap) {
          this._editSitemap(sitemap, ['_root'])
        }.bind(this, sitemap))
      }
    }.bind(this))
  },

  editSitemapMetadata: function (button) {
    this.setActiveNavigationButton('sitemap-edit-metadata')

    var sitemap = this.state.currentSitemap
    var $sitemapMetadataForm = ich.SitemapEditMetadata(sitemap)
    this.$('#viewport').html($sitemapMetadataForm)
    this.initMultipleStartUrlHelper()
    this.initSitemapValidation()

    return true
  },

  editSitemapMetadataSave: function (button) {
    var $ = this.$
    var sitemap = this.state.currentSitemap
    var sitemapData = this.getSitemapFromMetadataForm()

		// cancel submit if invalid form
    if (!this.isValidForm()) {
      return false
    }

		// check whether sitemap with this id already exist
    this.store.sitemapExists(sitemapData.id, function (sitemapExists) {
      if (sitemap._id !== sitemapData.id && sitemapExists) {
        var validator = this.getFormValidator()
        validator.updateStatus('_id', 'INVALID', 'callback')
        return
      }

			// change data
      sitemap.startUrl = sitemapData.startUrl

			// just change sitemaps url
      if (sitemapData.id === sitemap._id) {
        this.store.saveSitemap(sitemap, function (sitemap) {
          this.showSitemapSelectorList()
        }.bind(this))
      } else {
        // id changed. we need to delete the old one and create a new one
        var newSitemap = new Sitemap(sitemap, {$})
        var oldSitemap = sitemap
        newSitemap._id = sitemapData.id
        this.store.createSitemap(newSitemap, function (newSitemap) {
          this.store.deleteSitemap(oldSitemap, function () {
            this.state.currentSitemap = newSitemap
            this.showSitemapSelectorList()
          }.bind(this))
        }.bind(this))
      }
    }.bind(this))
  },

	/**
	 * Callback when sitemap edit button is clicked in sitemap grid
	 */
  editSitemap: function (tr) {
    var sitemap = this.$(tr).data('sitemap')
    this._editSitemap(sitemap)
  },
  _editSitemap: function (sitemap) {
    this.setStateEditSitemap(sitemap)
    this.setActiveNavigationButton('sitemap')

    this.showSitemapSelectorList()
  },
  showSitemapSelectorList: function () {
    this.setActiveNavigationButton('sitemap-selector-list')

    var sitemap = this.state.currentSitemap
    var parentSelectors = this.state.editSitemapBreadcumbsSelectors
    var parentSelectorId = this.state.currentParentSelectorId

    var $selectorListPanel = ich.SelectorList({
      parentSelectors: parentSelectors
    })
    var selectors = sitemap.getDirectChildSelectors(parentSelectorId)
    selectors.forEach(function (selector) {
      var $selector = ich.SelectorListItem(selector)
      $selector.data('selector', selector)
      $selectorListPanel.find('tbody').append($selector)
    })
    this.$('#viewport').html($selectorListPanel)

    return true
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
    var selector = this.$(tr).data('selector')
    var parentSelectors = this.state.editSitemapBreadcumbsSelectors
    this.state.currentParentSelectorId = selector.id
    parentSelectors.push(selector)

    this.showSitemapSelectorList()
  },

  treeNavigationshowSitemapSelectorList: function (button) {
    var parentSelectors = this.state.editSitemapBreadcumbsSelectors
    var controller = this
    this.$('#selector-tree .breadcrumb li a').each(function (i, parentSelectorButton) {
      if (parentSelectorButton === button) {
        parentSelectors.splice(i + 1)
        controller.state.currentParentSelectorId = parentSelectors[i].id
      }
    })
    this.showSitemapSelectorList()
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
                  return true
                }

                var matches = ''.match(new RegExp(value))
                if (matches !== null && matches[0] === '') {
                  return false
                } else {
                  return true
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
                var sitemap = this.getCurrentlyEditedSelectorSitemap()
                return !sitemap.selectors.hasRecursiveElementSelectors()
              }.bind(this)
            }
          }
        }
      }
    })
  },
  editSelector: function (button) {
    var selector = this.$(button).closest('tr').data('selector')
    this._editSelector(selector)
  },
  updateSelectorParentListOnIdChange: function () {
    var selector = this.getCurrentlyEditedSelector()
    this.$('.currently-edited').val(selector.id).text(selector.id)
  },
  _editSelector: function (selector) {
    var sitemap = this.state.currentSitemap
    var selectorIds = sitemap.getPossibleParentSelectorIds()

    var $editSelectorForm = ich.SelectorEdit({
      selector: selector,
      selectorIds: selectorIds,
      selectorTypes: [
        {
          type: 'SelectorText',
          title: 'Text'
        },
        {
          type: 'SelectorLink',
          title: 'Link'
        },
        {
          type: 'SelectorPopupLink',
          title: 'Popup Link'
        },
        {
          type: 'SelectorImage',
          title: 'Image'
        },
        {
          type: 'SelectorTable',
          title: 'Table'
        },
        {
          type: 'SelectorElementAttribute',
          title: 'Element attribute'
        },
        {
          type: 'SelectorHTML',
          title: 'HTML'
        },
        {
          type: 'SelectorElement',
          title: 'Element'
        },
        {
          type: 'SelectorElementScroll',
          title: 'Element scroll down'
        },
        {
          type: 'SelectorElementClick',
          title: 'Element click'
        },
        {
          type: 'SelectorGroup',
          title: 'Grouped'
        }
      ]
    })
    this.$('#viewport').html($editSelectorForm)
		// mark initially opened selector as currently edited
    var self = this
    this.$('#edit-selector #parentSelectors option').each(function (i, element) {
      if (self.$(element).val() === selector.id) {
        self.$(element).addClass('currently-edited')
      }
    })

		// set clickType
    if (selector.clickType) {
      $editSelectorForm.find('[name=clickType]').val(selector.clickType)
    }
		// set clickElementUniquenessType
    if (selector.clickElementUniquenessType) {
      $editSelectorForm.find('[name=clickElementUniquenessType]').val(selector.clickElementUniquenessType)
    }

		// handle selects seperately
    $editSelectorForm.find('[name=type]').val(selector.type)
    selector.parentSelectors.forEach(function (parentSelectorId) {
      $editSelectorForm.find("#parentSelectors [value='" + parentSelectorId + "']").attr('selected', 'selected')
    })

    this.state.currentSelector = selector
    this.selectorTypeChanged()
    this.initSelectorValidation()
  },
  selectorTypeChanged: function () {
    var type = this.$('#edit-selector select[name=type]').val()
    var features = selectors[type].getFeatures()
    this.$('#edit-selector .feature').hide()
    var self = this
    features.forEach(function (feature) {
      self.$('#edit-selector .feature-' + feature).show()
    })

		// add this selector to possible parent selector
    var selector = this.getCurrentlyEditedSelector()
    if (selector.canHaveChildSelectors()) {
      if (this.$('#edit-selector #parentSelectors .currently-edited').length === 0) {
        var $option = this.$('<option class="currently-edited"></option>')
        $option.text(selector.id).val(selector.id)
        this.$('#edit-selector #parentSelectors').append($option)
      }
    } else {
		// remove if type doesn't allow to have child selectors
      this.$('#edit-selector #parentSelectors .currently-edited').remove()
    }
  },
  saveSelector: function (button) {
    var sitemap = this.state.currentSitemap
    var selector = this.state.currentSelector
    var newSelector = this.getCurrentlyEditedSelector()

		// cancel submit if invalid form
    if (!this.isValidForm()) {
      return false
    }

		// cancel possible element selection
    this.contentScript.removeCurrentContentSelector().done(function () {
      sitemap.updateSelector(selector, newSelector)

      this.store.saveSitemap(sitemap, function () {
        this.showSitemapSelectorList()
      }.bind(this))
    }.bind(this))
  },
	/**
	 * Get selector from selector editing form
	 */
  getCurrentlyEditedSelector: function () {
    var id = this.$('#edit-selector [name=id]').val()
    var selectorsSelector = this.$('#edit-selector [name=selector]').val()
    var tableDataRowSelector = this.$('#edit-selector [name=tableDataRowSelector]').val()
    var tableHeaderRowSelector = this.$('#edit-selector [name=tableHeaderRowSelector]').val()
    var clickElementSelector = this.$('#edit-selector [name=clickElementSelector]').val()
    var type = this.$('#edit-selector [name=type]').val()
    var clickElementUniquenessType = this.$('#edit-selector [name=clickElementUniquenessType]').val()
    var clickType = this.$('#edit-selector [name=clickType]').val()
    var discardInitialElements = this.$('#edit-selector [name=discardInitialElements]').is(':checked')
    var multiple = this.$('#edit-selector [name=multiple]').is(':checked')
    var downloadImage = this.$('#edit-selector [name=downloadImage]').is(':checked')
    var clickPopup = this.$('#edit-selector [name=clickPopup]').is(':checked')
    var regex = this.$('#edit-selector [name=regex]').val()
    var delay = this.$('#edit-selector [name=delay]').val()
    var extractAttribute = this.$('#edit-selector [name=extractAttribute]').val()
    var parentSelectors = this.$('#edit-selector [name=parentSelectors]').val()
    var columns = []
    var $columnHeaders = this.$('#edit-selector .column-header')
    var $columnNames = this.$('#edit-selector .column-name')
    var $columnExtracts = this.$('#edit-selector .column-extract')

    var self = this
    $columnHeaders.each(function (i) {
      var header = self.$($columnHeaders[i]).val()
      var name = self.$($columnNames[i]).val()
      var extract = self.$($columnExtracts[i]).is(':checked')
      columns.push({
        header: header,
        name: name,
        extract: extract
      })
    })

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
      $: this.$
    })
    return newSelector
  },
	/**
	 * @returns {Sitemap|*} Cloned Sitemap with currently edited selector
	 */
  getCurrentlyEditedSelectorSitemap: function () {
    var sitemap = this.state.currentSitemap.clone()
    var selector = sitemap.getSelectorById(this.state.currentSelector.id)
    var newSelector = this.getCurrentlyEditedSelector()
    sitemap.updateSelector(selector, newSelector)
    return sitemap
  },
  cancelSelectorEditing: function (button) {
		// cancel possible element selection
    this.contentScript.removeCurrentContentSelector().done(function () {
      this.showSitemapSelectorList()
    }.bind(this))
  },
  addSelector: function () {
    var parentSelectorId = this.state.currentParentSelectorId
    var sitemap = this.state.currentSitemap

    var selector = new Selector({
      parentSelectors: [parentSelectorId],
      type: 'SelectorText',
      multiple: false
    }, {$: this.$})

    this._editSelector(selector, sitemap)
  },
  deleteSelector: function (button) {
    var sitemap = this.state.currentSitemap
    var selector = this.$(button).closest('tr').data('selector')
    sitemap.deleteSelector(selector)

    this.store.saveSitemap(sitemap, function () {
      this.showSitemapSelectorList()
    }.bind(this))
  },
  deleteSitemap: function (button) {
    var sitemap = this.$(button).closest('tr').data('sitemap')
    var controller = this
    this.store.deleteSitemap(sitemap, function () {
      controller.showSitemaps()
    })
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
                return value >= 2000
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
                return value >= 500
              }
            }
          }
        }
      }
    })
  },
  showScrapeSitemapConfigPanel: function () {
    this.setActiveNavigationButton('sitemap-scrape')
    var scrapeConfigPanel = ich.SitemapScrapeConfig()
    this.$('#viewport').html(scrapeConfigPanel)
    this.initScrapeSitemapConfigValidation()
    return true
  },
  scrapeSitemap: function () {
    if (!this.isValidForm()) {
      return false
    }

    var requestInterval = this.$('input[name=requestInterval]').val()
    var pageLoadDelay = this.$('input[name=pageLoadDelay]').val()

    var sitemap = this.state.currentSitemap
    var request = {
      scrapeSitemap: true,
      sitemap: JSON.parse(JSON.stringify(sitemap)),
      requestInterval: requestInterval,
      pageLoadDelay: pageLoadDelay
    }

		// show sitemap scraping panel
    this.getFormValidator().destroy()
    this.$('.scraping-in-progress').removeClass('hide')
    this.$('#submit-scrape-sitemap').closest('.form-group').hide()
    this.$('#scrape-sitemap-config input').prop('disabled', true)

    chrome.runtime.sendMessage(request, function (response) {
      this.browseSitemapData()
    }.bind(this))
    return false
  },
  sitemapListBrowseSitemapData: function (button) {
    var sitemap = this.$(button).closest('tr').data('sitemap')
    this.setStateEditSitemap(sitemap)
    this.browseSitemapData()
  },
  browseSitemapData: function () {
    this.setActiveNavigationButton('sitemap-browse')
    var sitemap = this.state.currentSitemap
    this.store.getSitemapData(sitemap, function (data) {
      var dataColumns = sitemap.getDataColumns()

      var dataPanel = ich.SitemapBrowseData({
        columns: dataColumns
      })
      this.$('#viewport').html(dataPanel)

			// display data
			// Doing this the long way so there aren't xss vulnerubilites
			// while working with data or with the selector titles
      var $tbody = this.$('#sitemap-data tbody')
      var self = this
      data.forEach(function (row) {
        var $tr = self.$('<tr></tr>')
        dataColumns.forEach(function (column) {
          var $td = self.$('<td></td>')
          var cellData = row[column]
          if (typeof cellData === 'object') {
            cellData = JSON.stringify(cellData)
          }
          $td.text(cellData)
          $tr.append($td)
        })
        $tbody.append($tr)
      })
    })

    return true
  },

  showSitemapExportDataCsvPanel: function () {
    this.setActiveNavigationButton('sitemap-export-data-csv')

    var sitemap = this.state.currentSitemap
    var exportPanel = ich.SitemapExportDataCSV(sitemap)
    this.$('#viewport').html(exportPanel)

		// generate data
    this.$('.download-button').hide()
    this.store.getSitemapData(sitemap, function (data) {
      var blob = sitemap.getDataExportCsvBlob(data)
      this.$('.download-button a').attr('href', window.URL.createObjectURL(blob))
      this.$('.download-button a').attr('download', sitemap._id + '.csv')
      this.$('.download-button').show()
    })

    return true
  },

  selectSelector: function (button) {
    var $ = this.$
    var input = $(button).closest('.form-group').find('input.selector-value')
    var sitemap = this.getCurrentlyEditedSelectorSitemap()
    var selector = this.getCurrentlyEditedSelector()
    var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds()
    var parentCSSSelector = sitemap.selectors.getParentCSSSelectorWithinOnePage(currentStateParentSelectorIds)

    var deferredSelector = this.contentScript.selectSelector({
      parentCSSSelector: parentCSSSelector,
      allowedElements: selector.getItemCSSSelector()
    }, {$})

    deferredSelector.done(function (result) {
      $(input).val(result.CSSSelector)

			// update validation for selector field
      var validator = this.getFormValidator()
      validator.revalidateField(input)

			// @TODO how could this be encapsulated?
			// update header row, data row selectors after selecting the table. selectors are updated based on tables
			// inner html
      if (selector.type === 'SelectorTable') {
        this.getSelectorHTML().done(function (html) {
          var tableHeaderRowSelector = SelectorTable.getTableHeaderRowSelectorFromTableHTML(html, {$})
          var tableDataRowSelector = SelectorTable.getTableDataRowSelectorFromTableHTML(html, {$})
          $('input[name=tableHeaderRowSelector]').val(tableHeaderRowSelector)
          $('input[name=tableDataRowSelector]').val(tableDataRowSelector)

          var headerColumns = SelectorTable.getTableHeaderColumnsFromHTML(tableHeaderRowSelector, html, {$})
          this.renderTableHeaderColumns(headerColumns)
        }.bind(this))
      }
    }.bind(this))
  },

  getCurrentStateParentSelectorIds: function () {
    var parentSelectorIds = this.state.editSitemapBreadcumbsSelectors.map(function (selector) {
      return selector.id
    })

    return parentSelectorIds
  },

  selectTableHeaderRowSelector: function (button) {
    var $ = this.$
    var input = $(button).closest('.form-group').find('input.selector-value')
    var sitemap = this.getCurrentlyEditedSelectorSitemap()
    var selector = this.getCurrentlyEditedSelector()
    var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds()
    var parentCSSSelector = sitemap.selectors.getCSSSelectorWithinOnePage(selector.id, currentStateParentSelectorIds)

    var deferredSelector = this.contentScript.selectSelector({
      parentCSSSelector: parentCSSSelector,
      allowedElements: 'tr'
    }, {$})

    deferredSelector.done(function (result) {
      var tableHeaderRowSelector = result.CSSSelector
      $(input).val(tableHeaderRowSelector)

      this.getSelectorHTML().done(function (html) {
        var headerColumns = SelectorTable.getTableHeaderColumnsFromHTML(tableHeaderRowSelector, html, {$})
        this.renderTableHeaderColumns(headerColumns)
      }.bind(this))

			// update validation for selector field
      var validator = this.getFormValidator()
      validator.revalidateField(input)
    }.bind(this))
  },

  selectTableDataRowSelector: function (button) {
    var $ = this.$
    var input = this.$(button).closest('.form-group').find('input.selector-value')
    var sitemap = this.getCurrentlyEditedSelectorSitemap()
    var selector = this.getCurrentlyEditedSelector()
    var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds()
    var parentCSSSelector = sitemap.selectors.getCSSSelectorWithinOnePage(selector.id, currentStateParentSelectorIds)

    var deferredSelector = this.contentScript.selectSelector({
      parentCSSSelector: parentCSSSelector,
      allowedElements: 'tr'
    }, {$})

    var self = this
    deferredSelector.done(function (result) {
      self.$(input).val(result.CSSSelector)

			// update validation for selector field
      var validator = this.getFormValidator()
      validator.revalidateField(input)
    }.bind(this))
  },

	/**
	 * update table selector column editing fields
	 */
  renderTableHeaderColumns: function (headerColumns) {
		// reset previous columns
    var $tbody = this.$('.feature-columns table tbody')
    $tbody.html('')
    headerColumns.forEach(function (column) {
      var $row = ich.SelectorEditTableColumn(column)
      $tbody.append($row)
    })
  },

	/**
	 * Returns HTML that the current selector would select
	 */
  getSelectorHTML: function () {
    var $ = this.$
    var sitemap = this.getCurrentlyEditedSelectorSitemap()
    var selector = this.getCurrentlyEditedSelector()
    var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds()
    var CSSSelector = sitemap.selectors.getCSSSelectorWithinOnePage(selector.id, currentStateParentSelectorIds)
    var deferredHTML = this.contentScript.getHTML({CSSSelector: CSSSelector}, {$})

    return deferredHTML
  },
  previewSelector: function (button) {
    var $ = this.$
    if (!$(button).hasClass('preview')) {
      var sitemap = this.getCurrentlyEditedSelectorSitemap()
      var selector = this.getCurrentlyEditedSelector()
      var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds()
      var parentCSSSelector = sitemap.selectors.getParentCSSSelectorWithinOnePage(currentStateParentSelectorIds)
      var deferredSelectorPreview = this.contentScript.previewSelector({
        parentCSSSelector: parentCSSSelector,
        elementCSSSelector: selector.selector
      }, {$})

      deferredSelectorPreview.done(function () {
        $(button).addClass('preview')
      })
    } else {
      this.contentScript.removeCurrentContentSelector()
      $(button).removeClass('preview')
    }
  },
  previewClickElementSelector: function (button) {
    var $ = this.$
    if (!$(button).hasClass('preview')) {
      var sitemap = this.state.currentSitemap
      var selector = this.getCurrentlyEditedSelector()
      var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds()
      var parentCSSSelector = sitemap.selectors.getParentCSSSelectorWithinOnePage(currentStateParentSelectorIds)

      var deferredSelectorPreview = this.contentScript.previewSelector({
        parentCSSSelector: parentCSSSelector,
        elementCSSSelector: selector.clickElementSelector
      }, {$})

      deferredSelectorPreview.done(function () {
        $(button).addClass('preview')
      })
    } else {
      this.contentScript.removeCurrentContentSelector()
      $(button).removeClass('preview')
    }
  },
  previewTableRowSelector: function (button) {
    var $ = this.$
    if (!$(button).hasClass('preview')) {
      var sitemap = this.getCurrentlyEditedSelectorSitemap()
      var selector = this.getCurrentlyEditedSelector()
      var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds()
      var parentCSSSelector = sitemap.selectors.getCSSSelectorWithinOnePage(selector.id, currentStateParentSelectorIds)
      var rowSelector = $(button).closest('.form-group').find('input').val()

      var deferredSelectorPreview = this.contentScript.previewSelector({
        parentCSSSelector: parentCSSSelector,
        elementCSSSelector: rowSelector
      }, {$})

      deferredSelectorPreview.done(function () {
        $(button).addClass('preview')
      })
    } else {
      this.contentScript.removeCurrentContentSelector()
      $(button).removeClass('preview')
    }
  },
  previewSelectorFromSelectorTree: function (button) {
    var $ = this.$
    if (!$(button).hasClass('preview')) {
      var sitemap = this.state.currentSitemap
      var selector = $(button).closest('tr').data('selector')
      var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds()
      var parentCSSSelector = sitemap.selectors.getParentCSSSelectorWithinOnePage(currentStateParentSelectorIds)
      var deferredSelectorPreview = this.contentScript.previewSelector({
        parentCSSSelector: parentCSSSelector,
        elementCSSSelector: selector.selector
      }, {$})

      deferredSelectorPreview.done(function () {
        $(button).addClass('preview')
      })
    } else {
      this.contentScript.removeCurrentContentSelector()
      $(button).removeClass('preview')
    }
  },
  previewSelectorDataFromSelectorTree: function (button) {
    var self = this
    var sitemap = this.state.currentSitemap
    var selector = self.$(button).closest('tr').data('selector')
    this.previewSelectorData(sitemap, selector.id)
  },
  previewSelectorDataFromSelectorEditing: function () {
    var sitemap = this.state.currentSitemap.clone()
    var selector = sitemap.getSelectorById(this.state.currentSelector.id)
    var newSelector = this.getCurrentlyEditedSelector()
    sitemap.updateSelector(selector, newSelector)
    this.previewSelectorData(sitemap, newSelector.id)
  },
	/**
	 * Returns a list of selector ids that the user has opened
	 * @returns {Array}
	 */
  getStateParentSelectorIds: function () {
    var parentSelectorIds = []
    this.state.editSitemapBreadcumbsSelectors.forEach(function (selector) {
      parentSelectorIds.push(selector.id)
    })
    return parentSelectorIds
  },
  previewSelectorData: function (sitemap, selectorId) {
		// data preview will be base on how the selector tree is opened
    var parentSelectorIds = this.getStateParentSelectorIds()

    var self = this

    var request = {
      previewSelectorData: true,
      sitemap: JSON.parse(JSON.stringify(sitemap)),
      parentSelectorIds: parentSelectorIds,
      selectorId: selectorId
    }
    chrome.runtime.sendMessage(request, function (response) {
      if (response.length === 0) {
        return
      }
      var dataColumns = Object.keys(response[0])

      console.log(dataColumns)

      var $dataPreviewPanel = ich.DataPreview({
        columns: dataColumns
      })
      self.$('#viewport').append($dataPreviewPanel)
      $dataPreviewPanel.modal('show')
			// display data
			// Doing this the long way so there aren't xss vulnerubilites
			// while working with data or with the selector titles
      var $tbody = self.$('tbody', $dataPreviewPanel)
      response.forEach(function (row) {
        var $tr = self.$('<tr></tr>')
        dataColumns.forEach(function (column) {
          var $td = self.$('<td></td>')
          var cellData = row[column]
          if (typeof cellData === 'object') {
            cellData = JSON.stringify(cellData)
          }
          $td.text(cellData)
          $tr.append($td)
        })
        $tbody.append($tr)
      })

      var windowHeight = self.$(window).height()

      self.$('.data-preview-modal .modal-body').height(windowHeight - 130)

			// remove modal from dom after it is closed
      $dataPreviewPanel.on('hidden.bs.modal', function () {
        self.$(this).remove()
      })
    })
  },
	/**
	 * Add start url to sitemap creation or editing form
	 * @param button
	 */
  addStartUrl: function (button) {
    var self = this
    var $startUrlInputField = ich.SitemapStartUrlField()
    self.$('#viewport .start-url-block:last').after($startUrlInputField)
    var validator = this.getFormValidator()
    validator.addField($startUrlInputField.find('input'))
  },
	/**
	 * Remove start url from sitemap creation or editing form.
	 * @param button
	 */
  removeStartUrl: function (button) {
    var self = this
    var $block = self.$(button).closest('.start-url-block')
    if (self.$('#viewport .start-url-block').length > 1) {
			// remove from validator
      var validator = this.getFormValidator()
      validator.removeField($block.find('input'))

      $block.remove()
    }
  }
}

module.exports = SitemapController

},{"./Selector":9,"./Selectors":22,"./Sitemap":23,"./getBackgroundScript":26,"./getContentScript":27}],8:[function(require,module,exports){
/**
 * Element selector. Uses jQuery as base and adds some more features
 * @param CSSSelector
 * @param parentElement
 * @param options
 */
var ElementQuery = function (CSSSelector, parentElement, options) {
  CSSSelector = CSSSelector || ''
  this.$ = options.$
this.document = options.document
this.window = options.window
  if (!this.$) throw new Error('Missing jquery for ElementQuery')
if (!this.document) throw new Error("Missing document")
if(!this.window)throw new Error("Missing window")
  var selectedElements = []

  var addElement = function (element) {
    if (selectedElements.indexOf(element) === -1) {
      selectedElements.push(element)
    }
  }

  var selectorParts = ElementQuery.getSelectorParts(CSSSelector)
  var self = this
  selectorParts.forEach(function (selector) {
		// handle special case when parent is selected
    if (selector === '_parent_') {
      self.$(parentElement).each(function (i, element) {
        addElement(element)
      })
    }		else {
      var elements = self.$(selector, self.$(parentElement))
      elements.each(function (i, element) {
        addElement(element)
      })
    }
  })

  return selectedElements
}

ElementQuery.getSelectorParts = function (CSSSelector) {
  var selectors = CSSSelector.split(/(,|".*?"|'.*?'|\(.*?\))/)

  var resultSelectors = []
  var currentSelector = ''
  selectors.forEach(function (selector) {
    if (selector === ',') {
      if (currentSelector.trim().length) {
        resultSelectors.push(currentSelector.trim())
      }
      currentSelector = ''
    }		else {
      currentSelector += selector
    }
  })
  if (currentSelector.trim().length) {
    resultSelectors.push(currentSelector.trim())
  }

  return resultSelectors
}

module.exports = ElementQuery

},{}],9:[function(require,module,exports){
var selectors = require('./Selectors')
var ElementQuery = require('./ElementQuery')
var jquery = require('jquery-deferred')

var Selector = function (selector, options) {
  this.$ = options.$
this.document = options.document
this.window = options.window
  if (!this.$) throw new Error('Missing jquery')
if (!this.document) throw new Error("Missing document")
if(!this.window)throw new Error("Missing window")

  this.updateData(selector)
  this.initType()
}

Selector.prototype = {

	/**
	 * Is this selector configured to return multiple items?
	 * @returns {boolean}
	 */
  willReturnMultipleRecords: function () {
    return this.canReturnMultipleRecords() && this.multiple
  },

	/**
	 * Update current selector configuration
	 * @param data
	 */
  updateData: function (data) {
    var allowedKeys = ['id', 'type', 'selector', 'parentSelectors']
    console.log('data type', data.type)
    allowedKeys = allowedKeys.concat(selectors[data.type].getFeatures())
    var key
		// update data
    for (key in data) {
      if (allowedKeys.indexOf(key) !== -1 || typeof data[key] === 'function') {
        this[key] = data[key]
      }
    }

		// remove values that are not needed for this type of selector
    for (key in this) {
      if (allowedKeys.indexOf(key) === -1 && typeof this[key] !== 'function') {
        delete this[key]
      }
    }
  },

	/**
	 * CSS selector which will be used for element selection
	 * @returns {string}
	 */
  getItemCSSSelector: function () {
    return '*'
  },

	/**
	 * override objects methods based on seletor type
	 */
  initType: function () {
    if (selectors[this.type] === undefined) {
      throw new Error('Selector type not defined ' + this.type)
    }

		// overrides objects methods
    for (var i in selectors[this.type]) {
      this[i] = selectors[this.type][i]
    }
  },

	/**
	 * Check whether a selector is a paren selector of this selector
	 * @param selectorId
	 * @returns {boolean}
	 */
  hasParentSelector: function (selectorId) {
    return (this.parentSelectors.indexOf(selectorId) !== -1)
  },

  removeParentSelector: function (selectorId) {
    var index = this.parentSelectors.indexOf(selectorId)
    if (index !== -1) {
      this.parentSelectors.splice(index, 1)
    }
  },

  renameParentSelector: function (originalId, replacementId) {
    if (this.hasParentSelector(originalId)) {
      var pos = this.parentSelectors.indexOf(originalId)
      this.parentSelectors.splice(pos, 1, replacementId)
    }
  },

  getDataElements: function (parentElement) {
    var $ = this.$
    var elements = ElementQuery(this.selector, parentElement, {$})
    if (this.multiple) {
      return elements
    } else if (elements.length > 0) {
      return [elements[0]]
    } else {
      return []
    }
  },

  getData: function (parentElement) {
    var d = jquery.Deferred()
    var timeout = this.delay || 0

		// this works much faster because whenCallSequentally isn't running next data extraction immediately
    if (timeout === 0) {
      var deferredData = this._getData(parentElement)
      deferredData.done(function (data) {
        d.resolve(data)
      })
    }		else {
      setTimeout(function () {
        var deferredData = this._getData(parentElement)
        deferredData.done(function (data) {
          d.resolve(data)
        })
      }.bind(this), timeout)
    }

    return d.promise()
  }
}

module.exports = Selector

},{"./ElementQuery":8,"./Selectors":22,"jquery-deferred":29}],10:[function(require,module,exports){
var jquery = require('jquery-deferred')

var SelectorElement = {

  canReturnMultipleRecords: function () {
    return true
  },

  canHaveChildSelectors: function () {
    return true
  },

  canHaveLocalChildSelectors: function () {
    return true
  },

  canCreateNewJobs: function () {
    return false
  },
  willReturnElements: function () {
    return true
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred()

    var elements = this.getDataElements(parentElement)
    dfd.resolve(this.$.makeArray(elements))

    return dfd.promise()
  },

  getDataColumns: function () {
    return []
  },

  getFeatures: function () {
    return ['multiple', 'delay']
  }
}

module.exports = SelectorElement

},{"jquery-deferred":29}],11:[function(require,module,exports){
var jquery = require('jquery-deferred')
var SelectorElementAttribute = {
  canReturnMultipleRecords: function () {
    return true
  },

  canHaveChildSelectors: function () {
    return false
  },

  canHaveLocalChildSelectors: function () {
    return false
  },

  canCreateNewJobs: function () {
    return false
  },
  willReturnElements: function () {
    return false
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred()
    var self = this
    var elements = this.getDataElements(parentElement)

    var result = []
    self.$(elements).each(function (k, element) {
      var data = {}

      data[this.id] = self.$(element).attr(this.extractAttribute)
      result.push(data)
    }.bind(this))

    if (this.multiple === false && elements.length === 0) {
      var data = {}
      data[this.id + '-src'] = null
      result.push(data)
    }
    dfd.resolve(result)

    return dfd.promise()
  },

  getDataColumns: function () {
    return [this.id]
  },

  getFeatures: function () {
    return ['multiple', 'extractAttribute', 'delay']
  }
}

module.exports = SelectorElementAttribute

},{"jquery-deferred":29}],12:[function(require,module,exports){
var jquery = require('jquery-deferred')
var UniqueElementList = require('./../UniqueElementList')
var ElementQuery = require('./../ElementQuery')
var CssSelector = require('css-selector').CssSelector
var SelectorElementClick = {

  canReturnMultipleRecords: function () {
    return true
  },

  canHaveChildSelectors: function () {
    return true
  },

  canHaveLocalChildSelectors: function () {
    return true
  },

  canCreateNewJobs: function () {
    return false
  },
  willReturnElements: function () {
    return true
  },

  getClickElements: function (parentElement) {
    var $ = this.$
    var clickElements = ElementQuery(this.clickElementSelector, parentElement, {$})
    return clickElements
  },

	/**
	 * Check whether element is still reachable from html. Useful to check whether the element is removed from DOM.
	 * @param element
	 */
  isElementInHTML: function (element) {
    return this.$(element).closest('html').length !== 0
  },

  triggerButtonClick: function (clickElement) {
    var document = this.document
    var cs = new CssSelector({
      enableSmartTableSelector: false,
      parent: this.$('body')[0],
      enableResultStripping: false
    })
    var cssSelector = cs.getCssSelector([clickElement])

		// this function will catch window.open call and place the requested url as the elements data attribute
    var script = document.createElement('script')
    script.type = 'text/javascript'
    script.text = '' +
			'(function(){ ' +
			"var el = document.querySelectorAll('" + cssSelector + "')[0]; " +
			'el.click(); ' +
			'})();'
    document.body.appendChild(script)
  },

  getClickElementUniquenessType: function () {
    if (this.clickElementUniquenessType === undefined) {
      return 'uniqueText'
    } else {
      return this.clickElementUniquenessType
    }
  },

  _getData: function (parentElement) {
    var $ = this.$
    var delay = parseInt(this.delay) || 0
    var deferredResponse = jquery.Deferred()
    var foundElements = new UniqueElementList('uniqueText', {$})
    var clickElements = this.getClickElements(parentElement)
    var doneClickingElements = new UniqueElementList(this.getClickElementUniquenessType(), {$})

		// add elements that are available before clicking
    var elements = this.getDataElements(parentElement)
    elements.forEach(foundElements.push.bind(foundElements))

		// discard initial elements
    if (this.discardInitialElements) {
      foundElements = new UniqueElementList('uniqueText', {$})
    }

		// no elements to click at the beginning
    if (clickElements.length === 0) {
      deferredResponse.resolve(foundElements)
      return deferredResponse.promise()
    }

		// initial click and wait
    var currentClickElement = clickElements[0]
    this.triggerButtonClick(currentClickElement)
    var nextElementSelection = (new Date()).getTime() + delay

		// infinitely scroll down and find all items
    var interval = setInterval(function () {
			// find those click elements that are not in the black list
      var allClickElements = this.getClickElements(parentElement)
      clickElements = []
      allClickElements.forEach(function (element) {
        if (!doneClickingElements.isAdded(element)) {
          clickElements.push(element)
        }
      })

      var now = (new Date()).getTime()
			// sleep. wait when to extract next elements
      if (now < nextElementSelection) {
				// console.log("wait");
        return
      }

			// add newly found elements to element foundElements array.
      var elements = this.getDataElements(parentElement)
      var addedAnElement = false
      elements.forEach(function (element) {
        var added = foundElements.push(element)
        if (added) {
          addedAnElement = true
        }
      })
			// console.log("added", addedAnElement);

			// no new elements found. Stop clicking this button
      if (!addedAnElement) {
        doneClickingElements.push(currentClickElement)
      }

			// continue clicking and add delay, but if there is nothing
			// more to click the finish
			// console.log("total buttons", clickElements.length)
      if (clickElements.length === 0) {
        clearInterval(interval)
        deferredResponse.resolve(foundElements)
      } else {
				// console.log("click");
        currentClickElement = clickElements[0]
				// click on elements only once if the type is clickonce
        if (this.clickType === 'clickOnce') {
          doneClickingElements.push(currentClickElement)
        }
        this.triggerButtonClick(currentClickElement)
        nextElementSelection = now + delay
      }
    }.bind(this), 50)

    return deferredResponse.promise()
  },

  getDataColumns: function () {
    return []
  },

  getFeatures: function () {
    return ['multiple', 'delay', 'clickElementSelector', 'clickType', 'discardInitialElements', 'clickElementUniquenessType']
  }
}

module.exports = SelectorElementClick

},{"./../ElementQuery":8,"./../UniqueElementList":25,"css-selector":28,"jquery-deferred":29}],13:[function(require,module,exports){
var jquery = require('jquery-deferred')
var SelectorElementScroll = {

  canReturnMultipleRecords: function () {
    return true
  },

  canHaveChildSelectors: function () {
    return true
  },

  canHaveLocalChildSelectors: function () {
    return true
  },

  canCreateNewJobs: function () {
    return false
  },
  willReturnElements: function () {
    return true
  },
  scrollToBottom: function () {
    var document = this.document
    window.scrollTo(0, document.body.scrollHeight)
  },
  _getData: function (parentElement) {
    var delay = parseInt(this.delay) || 0
    var deferredResponse = jquery.Deferred()
    var foundElements = []

		// initially scroll down and wait
    this.scrollToBottom()
    var nextElementSelection = (new Date()).getTime() + delay

		// infinitely scroll down and find all items
    var interval = setInterval(function () {
      var now = (new Date()).getTime()
			// sleep. wait when to extract next elements
      if (now < nextElementSelection) {
        return
      }

      var elements = this.getDataElements(parentElement)
			// no new elements found
      if (elements.length === foundElements.length) {
        clearInterval(interval)
        deferredResponse.resolve(this.$.makeArray(elements))
      } else {
				// continue scrolling and add delay
        foundElements = elements
        this.scrollToBottom()
        nextElementSelection = now + delay
      }
    }.bind(this), 50)

    return deferredResponse.promise()
  },

  getDataColumns: function () {
    return []
  },

  getFeatures: function () {
    return ['multiple', 'delay']
  }
}

module.exports = SelectorElementScroll

},{"jquery-deferred":29}],14:[function(require,module,exports){
var jquery = require('jquery-deferred')
var SelectorGroup = {

  canReturnMultipleRecords: function () {
    return false
  },

  canHaveChildSelectors: function () {
    return false
  },

  canHaveLocalChildSelectors: function () {
    return false
  },

  canCreateNewJobs: function () {
    return false
  },
  willReturnElements: function () {
    return false
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred()
    var self = this
		// cannot reuse this.getDataElements because it depends on *multiple* property
    var elements = self.$(this.selector, parentElement)

    var records = []
    self.$(elements).each(function (k, element) {
      var data = {}

      data[this.id] = self.$(element).text()

      if (this.extractAttribute) {
        data[this.id + '-' + this.extractAttribute] = self.$(element).attr(this.extractAttribute)
      }

      records.push(data)
    }.bind(this))

    var result = {}
    result[this.id] = records

    dfd.resolve([result])
    return dfd.promise()
  },

  getDataColumns: function () {
    return [this.id]
  },

  getFeatures: function () {
    return ['delay', 'extractAttribute']
  }
}

module.exports = SelectorGroup

},{"jquery-deferred":29}],15:[function(require,module,exports){
var jquery = require('jquery-deferred')
var SelectorHTML = {

  canReturnMultipleRecords: function () {
    return true
  },

  canHaveChildSelectors: function () {
    return false
  },

  canHaveLocalChildSelectors: function () {
    return false
  },

  canCreateNewJobs: function () {
    return false
  },
  willReturnElements: function () {
    return false
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred()
    var self = this
    var elements = this.getDataElements(parentElement)

    var result = []
    self.$(elements).each(function (k, element) {
      var data = {}
      var html = self.$(element).html()

      if (this.regex !== undefined && this.regex.length) {
        var matches = html.match(new RegExp(this.regex))
        if (matches !== null) {
          html = matches[0]
        } else {
          html = null
        }
      }
      data[this.id] = html

      result.push(data)
    }.bind(this))

    if (this.multiple === false && elements.length === 0) {
      var data = {}
      data[this.id] = null
      result.push(data)
    }

    dfd.resolve(result)
    return dfd.promise()
  },

  getDataColumns: function () {
    return [this.id]
  },

  getFeatures: function () {
    return ['multiple', 'regex', 'delay']
  }
}

module.exports = SelectorHTML

},{"jquery-deferred":29}],16:[function(require,module,exports){
var jquery = require('jquery-deferred')
var whenCallSequentially = require('../../assets/jquery.whencallsequentially')
var Base64 = require('../../assets/base64')
var SelectorImage = {
  canReturnMultipleRecords: function () {
    return true
  },

  canHaveChildSelectors: function () {
    return false
  },

  canHaveLocalChildSelectors: function () {
    return false
  },

  canCreateNewJobs: function () {
    return false
  },
  willReturnElements: function () {
    return false
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred()

    var elements = this.getDataElements(parentElement)

    var deferredDataCalls = []
    this.$(elements).each(function (i, element) {
      deferredDataCalls.push(function () {
        var deferredData = jquery.Deferred()

        var data = {}
        data[this.id + '-src'] = element.src

				// download image if required
        if (!this.downloadImage) {
          deferredData.resolve(data)
        } else {
          var deferredImageBase64 = this.downloadImageBase64(element.src)

          deferredImageBase64.done(function (imageResponse) {
            data['_imageBase64-' + this.id] = imageResponse.imageBase64
            data['_imageMimeType-' + this.id] = imageResponse.mimeType

            deferredData.resolve(data)
          }.bind(this)).fail(function () {
						// failed to download image continue.
						// @TODO handle errror
            deferredData.resolve(data)
          })
        }

        return deferredData.promise()
      }.bind(this))
    }.bind(this))

    whenCallSequentially(deferredDataCalls).done(function (dataResults) {
      if (this.multiple === false && elements.length === 0) {
        var data = {}
        data[this.id + '-src'] = null
        dataResults.push(data)
      }

      dfd.resolve(dataResults)
    })

    return dfd.promise()
  },

  downloadFileAsBlob: function (url) {
    var deferredResponse = jquery.Deferred()
    var xhr = new XMLHttpRequest()
    xhr.onreadystatechange = function () {
      if (this.readyState == 4) {
        if (this.status == 200) {
          var blob = this.response
          deferredResponse.resolve(blob)
        } else {
          deferredResponse.reject(xhr.statusText)
        }
      }
    }
    xhr.open('GET', url)
    xhr.responseType = 'blob'
    xhr.send()

    return deferredResponse.promise()
  },

  downloadImageBase64: function (url) {
    var deferredResponse = jquery.Deferred()
    var deferredDownload = this.downloadFileAsBlob(url)
    deferredDownload.done(function (blob) {
      var mimeType = blob.type
      var deferredBlob = Base64.blobToBase64(blob)
      deferredBlob.done(function (imageBase64) {
        deferredResponse.resolve({
          mimeType: mimeType,
          imageBase64: imageBase64
        })
      })
    }).fail(deferredResponse.fail)
    return deferredResponse.promise()
  },

  getDataColumns: function () {
    return [this.id + '-src']
  },

  getFeatures: function () {
    return ['multiple', 'delay', 'downloadImage']
  },

  getItemCSSSelector: function () {
    return 'img'
  }
}

module.exports = SelectorImage

},{"../../assets/base64":1,"../../assets/jquery.whencallsequentially":2,"jquery-deferred":29}],17:[function(require,module,exports){
var jquery = require('jquery-deferred')
var whenCallSequentially = require('../../assets/jquery.whencallsequentially')

var SelectorLink = {
  canReturnMultipleRecords: function () {
    return true
  },

  canHaveChildSelectors: function () {
    return true
  },

  canHaveLocalChildSelectors: function () {
    return false
  },

  canCreateNewJobs: function () {
    return true
  },
  willReturnElements: function () {
    return false
  },
  _getData: function (parentElement) {
    var elements = this.getDataElements(parentElement)
    var self = this

    var dfd = jquery.Deferred()

		// return empty record if not multiple type and no elements found
    if (this.multiple === false && elements.length === 0) {
      var data = {}
      data[this.id] = null
      dfd.resolve([data])
      return dfd
    }

		// extract links one by one
    var deferredDataExtractionCalls = []
    self.$(elements).each(function (k, element) {
      deferredDataExtractionCalls.push(function (element) {
        var deferredData = jquery.Deferred()

        var data = {}
        data[this.id] = self.$(element).text()
        data._followSelectorId = this.id
        data[this.id + '-href'] = element.href
        data._follow = element.href
        deferredData.resolve(data)

        return deferredData
      }.bind(this, element))
    }.bind(this))

    whenCallSequentially(deferredDataExtractionCalls).done(function (responses) {
      var result = []
      responses.forEach(function (dataResult) {
        result.push(dataResult)
      })
      dfd.resolve(result)
    })

    return dfd.promise()
  },

  getDataColumns: function () {
    return [this.id, this.id + '-href']
  },

  getFeatures: function () {
    return ['multiple', 'delay']
  },

  getItemCSSSelector: function () {
    return 'a'
  }
}

module.exports = SelectorLink

},{"../../assets/jquery.whencallsequentially":2,"jquery-deferred":29}],18:[function(require,module,exports){
var whenCallSequentially = require('../../assets/jquery.whencallsequentially')
var jquery = require('jquery-deferred')
var CssSelector = require('css-selector').CssSelector
var SelectorPopupLink = {
  canReturnMultipleRecords: function () {
    return true
  },

  canHaveChildSelectors: function () {
    return true
  },

  canHaveLocalChildSelectors: function () {
    return false
  },

  canCreateNewJobs: function () {
    return true
  },
  willReturnElements: function () {
    return false
  },
  _getData: function (parentElement) {
    var $ = this.$
    var elements = this.getDataElements(parentElement)

    var dfd = jquery.Deferred()

		// return empty record if not multiple type and no elements found
    if (this.multiple === false && elements.length === 0) {
      var data = {}
      data[this.id] = null
      dfd.resolve([data])
      return dfd
    }

		// extract links one by one
    var deferredDataExtractionCalls = []
    $(elements).each(function (k, element) {
      deferredDataExtractionCalls.push(function (element) {
        var deferredData = jquery.Deferred()

        var data = {}
        data[this.id] = $(element).text()
        data._followSelectorId = this.id

        var deferredPopupURL = this.getPopupURL(element)
        deferredPopupURL.done(function (url) {
          data[this.id + '-href'] = url
          data._follow = url
          deferredData.resolve(data)
        }.bind(this))

        return deferredData
      }.bind(this, element))
    }.bind(this))

    whenCallSequentially(deferredDataExtractionCalls).done(function (responses) {
      var result = []
      responses.forEach(function (dataResult) {
        result.push(dataResult)
      })
      dfd.resolve(result)
    })

    return dfd.promise()
  },

	/**
	 * Gets an url from a window.open call by mocking the window.open function
	 * @param element
	 * @returns $.Deferred()
	 */
  getPopupURL: function (element) {
    var $ = this.$
    var document = this.document
    // override window.open function. we need to execute this in page scope.
		// we need to know how to find this element from page scope.
    var cs = new CssSelector({
      enableSmartTableSelector: false,
      parent: document.body,
      enableResultStripping: false
    })
    var cssSelector = cs.getCssSelector([element])
    console.log(cssSelector)
    console.log(document.body.querySelectorAll(cssSelector))
		// this function will catch window.open call and place the requested url as the elements data attribute
    var script = document.createElement('script')
    script.type = 'text/javascript'
    console.log(cssSelector)
    console.log(document.querySelectorAll(cssSelector))
    script.text = `
			(function(){
        var open = window.open;
        var el = document.querySelectorAll('${cssSelector}')[0];
        var openNew = function() { 
          var url = arguments[0]; 
          el.dataset.webScraperExtractUrl = url; 
          window.open = open; 
        };
        window.open = openNew; 
        el.click(); 
			})()`
    document.body.appendChild(script)

		// wait for url to be available
    var deferredURL = jquery.Deferred()
    var timeout = Math.abs(5000 / 30) // 5s timeout to generate an url for popup
    var interval = setInterval(function () {
      var url = $(element).data('web-scraper-extract-url')
      if (url) {
        deferredURL.resolve(url)
        clearInterval(interval)
        script.remove()
      }
			// timeout popup opening
      if (timeout-- <= 0) {
        clearInterval(interval)
        script.remove()
      }
    }, 30)

    return deferredURL.promise()
  },

  getDataColumns: function () {
    return [this.id, this.id + '-href']
  },

  getFeatures: function () {
    return ['multiple', 'delay']
  },

  getItemCSSSelector: function () {
    return '*'
  }
}

module.exports = SelectorPopupLink

},{"../../assets/jquery.whencallsequentially":2,"css-selector":28,"jquery-deferred":29}],19:[function(require,module,exports){
var jquery = require('jquery-deferred')

var SelectorTable = {

  canReturnMultipleRecords: function () {
    return true
  },

  canHaveChildSelectors: function () {
    return false
  },

  canHaveLocalChildSelectors: function () {
    return false
  },

  canCreateNewJobs: function () {
    return false
  },
  willReturnElements: function () {
    return false
  },
  getTableHeaderColumns: function ($table) {
    var columns = {}
    var $ = this.$
    var headerRowSelector = this.getTableHeaderRowSelector()
    var $headerRow = $($table).find(headerRowSelector)
    if ($headerRow.length > 0) {
      $headerRow.find('td,th').each(function (i) {
        var header = $(this).text().trim()
        columns[header] = {
          index: i + 1
        }
      })
    }
    return columns
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred()
    var $ = this.$

    var tables = this.getDataElements(parentElement)

    var result = []
    $(tables).each(function (k, table) {
      var columns = this.getTableHeaderColumns($(table))

      var dataRowSelector = this.getTableDataRowSelector()
      $(table).find(dataRowSelector).each(function (i, row) {
        var data = {}
        this.columns.forEach(function (column) {
          if (column.extract === true) {
            if (columns[column.header] === undefined) {
              data[column.name] = null
            } else {
              var rowText = $(row).find('>:nth-child(' + columns[column.header].index + ')').text().trim()
              data[column.name] = rowText
            }
          }
        })
        result.push(data)
      }.bind(this))
    }.bind(this))

    dfd.resolve(result)
    return dfd.promise()
  },

  getDataColumns: function () {
    var dataColumns = []
    this.columns.forEach(function (column) {
      if (column.extract === true) {
        dataColumns.push(column.name)
      }
    })
    return dataColumns
  },

  getFeatures: function () {
    return ['multiple', 'columns', 'delay', 'tableDataRowSelector', 'tableHeaderRowSelector']
  },

  getItemCSSSelector: function () {
    return 'table'
  },

  getTableHeaderRowSelectorFromTableHTML: function (html, options = {}) {
    var $ = options.$ || this.$
    var $table = $(html)
    if ($table.find('thead tr:has(td:not(:empty)), thead tr:has(th:not(:empty))').length) {
      if ($table.find('thead tr').length === 1) {
        return 'thead tr'
      }			else {
        var $rows = $table.find('thead tr')
				// first row with data
        var rowIndex = $rows.index($rows.filter(':has(td:not(:empty)),:has(th:not(:empty))')[0])
        return 'thead tr:nth-of-type(' + (rowIndex + 1) + ')'
      }
    }		else if ($table.find('tr td:not(:empty), tr th:not(:empty)').length) {
      var $rows = $table.find('tr')
			// first row with data
      var rowIndex = $rows.index($rows.filter(':has(td:not(:empty)),:has(th:not(:empty))')[0])
      return 'tr:nth-of-type(' + (rowIndex + 1) + ')'
    }		else {
      return ''
    }
  },

  getTableDataRowSelectorFromTableHTML: function (html, options = {}) {
    var $ = options.$ || this.$
    var $table = $(html)
    if ($table.find('thead tr:has(td:not(:empty)), thead tr:has(th:not(:empty))').length) {
      return 'tbody tr'
    }		else if ($table.find('tr td:not(:empty), tr th:not(:empty)').length) {
      var $rows = $table.find('tr')
			// first row with data
      var rowIndex = $rows.index($rows.filter(':has(td:not(:empty)),:has(th:not(:empty))')[0])
      return 'tr:nth-of-type(n+' + (rowIndex + 2) + ')'
    }		else {
      return ''
    }
  },

  getTableHeaderRowSelector: function () {
		// handle legacy selectors
    if (this.tableHeaderRowSelector === undefined) {
      return 'thead tr'
    }		else {
      return this.tableHeaderRowSelector
    }
  },

  getTableDataRowSelector: function () {
		// handle legacy selectors
    if (this.tableDataRowSelector === undefined) {
      return 'tbody tr'
    }		else {
      return this.tableDataRowSelector
    }
  },

	/**
	 * Extract table header column info from html
	 * @param html
	 */
  getTableHeaderColumnsFromHTML: function (headerRowSelector, html, options = {}) {
    var $ = options.$ || this.$
    var $table = $(html)
    var $headerRowColumns = $table.find(headerRowSelector).find('td,th')

    var columns = []

    $headerRowColumns.each(function (i, columnEl) {
      var header = $(columnEl).text().trim()
      var name = header
      if (header.length !== 0) {
        columns.push({
          header: header,
          name: name,
          extract: true
        })
      }
    })
    return columns
  }
}

module.exports = SelectorTable

},{"jquery-deferred":29}],20:[function(require,module,exports){
var jquery = require('jquery-deferred')
var SelectorText = {

  canReturnMultipleRecords: function () {
    return true
  },

  canHaveChildSelectors: function () {
    return false
  },

  canHaveLocalChildSelectors: function () {
    return false
  },

  canCreateNewJobs: function () {
    return false
  },
  willReturnElements: function () {
    return false
  },
  _getData: function (parentElement) {
    var $ = this.$
    var dfd = jquery.Deferred()

    var elements = this.getDataElements(parentElement)

    var result = []
    $(elements).each(function (k, element) {
      var data = {}

			// remove script, style tag contents from text results
      var $element_clone = $(element).clone()
      $element_clone.find('script, style').remove()
			// <br> replace br tags with newlines
      $element_clone.find('br').after('\n')

      var text = $element_clone.text()
      if (this.regex !== undefined && this.regex.length) {
        var matches = text.match(new RegExp(this.regex))
        if (matches !== null) {
          text = matches[0]
        } else {
          text = null
        }
      }
      data[this.id] = text

      result.push(data)
    }.bind(this))

    if (this.multiple === false && elements.length === 0) {
      var data = {}
      data[this.id] = null
      result.push(data)
    }

    dfd.resolve(result)
    return dfd.promise()
  },

  getDataColumns: function () {
    return [this.id]
  },

  getFeatures: function () {
    return ['multiple', 'regex', 'delay']
  }
}

module.exports = SelectorText

},{"jquery-deferred":29}],21:[function(require,module,exports){
var Selector = require('./Selector')

var SelectorList = function (selectors, options) {
  var $ = options.$
  var document = options.document
  var window = options.window
  // We don't want enumerable properties
  Object.defineProperty(this, '$', {
    get: function () {return $},
    enumerable: false
  })
  Object.defineProperty(this, 'window', {
    get: function () {return window},
    enumerable: false
  })
  Object.defineProperty(this, 'document', {
    get: function () {return document},
    enumerable: false
  })
  if (!this.$) throw new Error('Missing jquery')
if (!this.document) throw new Error("Missing document")
if(!this.window)throw new Error("Missing window")

  if (selectors === null || selectors === undefined) {
    return
  }

  for (var i = 0; i < selectors.length; i++) {
    this.push(selectors[i])
  }
}

SelectorList.prototype = []

SelectorList.prototype.push = function (selector) {
  if (!this.hasSelector(selector.id)) {
    if (!(selector instanceof Selector)) {
      selector = new Selector(selector, {$: this.$})
    }
    Array.prototype.push.call(this, selector)
  }
}

SelectorList.prototype.hasSelector = function (selectorId) {
  if (selectorId instanceof Object) {
    selectorId = selectorId.id
  }

  for (var i = 0; i < this.length; i++) {
    if (this[i].id === selectorId) {
      return true
    }
  }
  return false
}

/**
 * Returns all selectors or recursively find and return all child selectors of a parent selector.
 * @param parentSelectorId
 * @returns {Array}
 */
SelectorList.prototype.getAllSelectors = function (parentSelectorId) {
  if (parentSelectorId === undefined) {
    return this
  }

  var getAllChildSelectors = function (parentSelectorId, resultSelectors) {
    this.forEach(function (selector) {
      if (selector.hasParentSelector(parentSelectorId)) {
        if (resultSelectors.indexOf(selector) === -1) {
          resultSelectors.push(selector)
          getAllChildSelectors(selector.id, resultSelectors)
        }
      }
    })
  }.bind(this)

  var resultSelectors = []
  getAllChildSelectors(parentSelectorId, resultSelectors)
  return resultSelectors
}

/**
 * Returns only selectors that are directly under a parent
 * @param parentSelectorId
 * @returns {Array}
 */
SelectorList.prototype.getDirectChildSelectors = function (parentSelectorId) {
  var resultSelectors = new SelectorList(null, {$: this.$})
  this.forEach(function (selector) {
    if (selector.hasParentSelector(parentSelectorId)) {
      resultSelectors.push(selector)
    }
  })
  return resultSelectors
}

SelectorList.prototype.clone = function () {
  var resultList = new SelectorList(null, {$: this.$})
  this.forEach(function (selector) {
    resultList.push(selector)
  })
  return resultList
}

SelectorList.prototype.fullClone = function () {
  var resultList = new SelectorList(null, {$: this.$})
  this.forEach(function (selector) {
    resultList.push(JSON.parse(JSON.stringify(selector)))
  })
  return resultList
}

SelectorList.prototype.concat = function () {
  var resultList = this.clone()
  for (var i in arguments) {
    arguments[i].forEach(function (selector) {
      resultList.push(selector)
    })
  }
  return resultList
}

SelectorList.prototype.getSelector = function (selectorId) {
  for (var i = 0; i < this.length; i++) {
    var selector = this[i]
    if (selector.id === selectorId) {
      return selector
    }
  }
}

/**
 * Returns all selectors if this selectors including all parent selectors within this page
 * @TODO not used any more.
 * @param selectorId
 * @returns {*}
 */
SelectorList.prototype.getOnePageSelectors = function (selectorId) {
  var resultList = new SelectorList(null, {$: this.$})
  var selector = this.getSelector(selectorId)
  resultList.push(this.getSelector(selectorId))

	// recursively find all parent selectors that could lead to the page where selectorId is used.
  var findParentSelectors = function (selector) {
    selector.parentSelectors.forEach(function (parentSelectorId) {
      if (parentSelectorId === '_root') return
      var parentSelector = this.getSelector(parentSelectorId)
      if (resultList.indexOf(parentSelector) !== -1) return
      if (parentSelector.willReturnElements()) {
        resultList.push(parentSelector)
        findParentSelectors(parentSelector)
      }
    }.bind(this))
  }.bind(this)

  findParentSelectors(selector)

	// add all child selectors
  resultList = resultList.concat(this.getSinglePageAllChildSelectors(selector.id))
  return resultList
}

/**
 * Returns all child selectors of a selector which can be used within one page.
 * @param parentSelectorId
 */
SelectorList.prototype.getSinglePageAllChildSelectors = function (parentSelectorId) {
  var resultList = new SelectorList(null, {$: this.$})
  var addChildSelectors = function (parentSelector) {
    if (parentSelector.willReturnElements()) {
      var childSelectors = this.getDirectChildSelectors(parentSelector.id)
      childSelectors.forEach(function (childSelector) {
        if (resultList.indexOf(childSelector) === -1) {
          resultList.push(childSelector)
          addChildSelectors(childSelector)
        }
      })
    }
  }.bind(this)

  var parentSelector = this.getSelector(parentSelectorId)
  addChildSelectors(parentSelector)
  return resultList
}

SelectorList.prototype.willReturnMultipleRecords = function (selectorId) {
	// handle reuqested selector
  var selector = this.getSelector(selectorId)
  if (selector.willReturnMultipleRecords() === true) {
    return true
  }

	// handle all its child selectors
  var childSelectors = this.getAllSelectors(selectorId)
  for (var i = 0; i < childSelectors.length; i++) {
    var selector = childSelectors[i]
    if (selector.willReturnMultipleRecords() === true) {
      return true
    }
  }

  return false
}

/**
 * When serializing to JSON convert to an array
 * @returns {Array}
 */
SelectorList.prototype.toJSON = function () {
  var result = []
  this.forEach(function (selector) {
    result.push(selector)
  })
  return result
}

SelectorList.prototype.getSelectorById = function (selectorId) {
  for (var i = 0; i < this.length; i++) {
    var selector = this[i]
    if (selector.id === selectorId) {
      return selector
    }
  }
}

/**
 * returns css selector for a given element. css selector includes all parent element selectors
 * @param selectorId
 * @param parentSelectorIds array of parent selector ids from devtools Breadcumb
 * @returns string
 */
SelectorList.prototype.getCSSSelectorWithinOnePage = function (selectorId, parentSelectorIds) {
  var CSSSelector = this.getSelector(selectorId).selector
  var parentCSSSelector = this.getParentCSSSelectorWithinOnePage(parentSelectorIds)
  CSSSelector = parentCSSSelector + CSSSelector

  return CSSSelector
}

/**
 * returns css selector for parent selectors that are within one page
 * @param parentSelectorIds array of parent selector ids from devtools Breadcumb
 * @returns string
 */
SelectorList.prototype.getParentCSSSelectorWithinOnePage = function (parentSelectorIds) {
  var CSSSelector = ''

  for (var i = parentSelectorIds.length - 1; i > 0; i--) {
    var parentSelectorId = parentSelectorIds[i]
    var parentSelector = this.getSelector(parentSelectorId)
    if (parentSelector.willReturnElements()) {
      CSSSelector = parentSelector.selector + ' ' + CSSSelector
    } else {
      break
    }
  }

  return CSSSelector
}

SelectorList.prototype.hasRecursiveElementSelectors = function () {
  var RecursionFound = false

  this.forEach(function (topSelector) {
    var visitedSelectors = []

    var checkRecursion = function (parentSelector) {
			// already visited
      if (visitedSelectors.indexOf(parentSelector) !== -1) {
        RecursionFound = true
        return
      }

      if (parentSelector.willReturnElements()) {
        visitedSelectors.push(parentSelector)
        var childSelectors = this.getDirectChildSelectors(parentSelector.id)
        childSelectors.forEach(checkRecursion)
        visitedSelectors.pop()
      }
    }.bind(this)

    checkRecursion(topSelector)
  }.bind(this))

  return RecursionFound
}

module.exports = SelectorList

},{"./Selector":9}],22:[function(require,module,exports){
var SelectorElement = require('./Selector/SelectorElement')
var SelectorElementAttribute = require('./Selector/SelectorElementAttribute')
var SelectorElementClick = require('./Selector/SelectorElementClick')
var SelectorElementScroll = require('./Selector/SelectorElementScroll')
var SelectorGroup = require('./Selector/SelectorGroup')
var SelectorHTML = require('./Selector/SelectorHTML')
var SelectorImage = require('./Selector/SelectorImage')
var SelectorLink = require('./Selector/SelectorLink')
var SelectorPopupLink = require('./Selector/SelectorPopupLink')
var SelectorTable = require('./Selector/SelectorTable')
var SelectorText = require('./Selector/SelectorText')

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
}

},{"./Selector/SelectorElement":10,"./Selector/SelectorElementAttribute":11,"./Selector/SelectorElementClick":12,"./Selector/SelectorElementScroll":13,"./Selector/SelectorGroup":14,"./Selector/SelectorHTML":15,"./Selector/SelectorImage":16,"./Selector/SelectorLink":17,"./Selector/SelectorPopupLink":18,"./Selector/SelectorTable":19,"./Selector/SelectorText":20}],23:[function(require,module,exports){
var Selector = require('./Selector')
var SelectorList = require('./SelectorList')
var Sitemap = function (sitemapObj, options) {
  this.$ = options.$
this.document = options.document
this.window = options.window
  if (!this.$) throw new Error('Missing jquery')
if (!this.document) throw new Error("Missing document")
if(!this.window)throw new Error("Missing window")
  this.initData(sitemapObj)
}

Sitemap.prototype = {

  initData: function (sitemapObj) {
    console.log(this)
    for (var key in sitemapObj) {
      console.log(key)
      this[key] = sitemapObj[key]
    }
    console.log(this)

    var selectors = this.selectors
    this.selectors = new SelectorList(this.selectors, {$: this.$})
  },

	/**
	 * Returns all selectors or recursively find and return all child selectors of a parent selector.
	 * @param parentSelectorId
	 * @returns {Array}
	 */
  getAllSelectors: function (parentSelectorId) {
    return this.selectors.getAllSelectors(parentSelectorId)
  },

	/**
	 * Returns only selectors that are directly under a parent
	 * @param parentSelectorId
	 * @returns {Array}
	 */
  getDirectChildSelectors: function (parentSelectorId) {
    return this.selectors.getDirectChildSelectors(parentSelectorId)
  },

	/**
	 * Returns all selector id parameters
	 * @returns {Array}
	 */
  getSelectorIds: function () {
    var ids = ['_root']
    this.selectors.forEach(function (selector) {
      ids.push(selector.id)
    })
    return ids
  },

	/**
	 * Returns only selector ids which can have child selectors
	 * @returns {Array}
	 */
  getPossibleParentSelectorIds: function () {
    var ids = ['_root']
    this.selectors.forEach(function (selector) {
      if (selector.canHaveChildSelectors()) {
        ids.push(selector.id)
      }
    })
    return ids
  },

  getStartUrls: function () {
    var startUrls = this.startUrl
		// single start url
    if (this.startUrl.push === undefined) {
      startUrls = [startUrls]
    }

    var urls = []
    startUrls.forEach(function (startUrl) {
			// zero padding helper
      var lpad = function (str, length) {
        while (str.length < length) { str = '0' + str }
        return str
      }

      var re = /^(.*?)\[(\d+)\-(\d+)(:(\d+))?\](.*)$/
      var matches = startUrl.match(re)
      if (matches) {
        var startStr = matches[2]
        var endStr = matches[3]
        var start = parseInt(startStr)
        var end = parseInt(endStr)
        var incremental = 1
        console.log(matches[5])
        if (matches[5] !== undefined) {
          incremental = parseInt(matches[5])
        }
        for (var i = start; i <= end; i += incremental) {
					// with zero padding
          if (startStr.length === endStr.length) {
            urls.push(matches[1] + lpad(i.toString(), startStr.length) + matches[6])
          } else {
            urls.push(matches[1] + i + matches[6])
          }
        }
        return urls
      } else {
        urls.push(startUrl)
      }
    })

    return urls
  },

  updateSelector: function (selector, selectorData) {
		// selector is undefined when creating a new one
    if (selector === undefined) {
      selector = new Selector(selectorData, {$: this.$})
    }

		// update child selectors
    if (selector.id !== undefined && selector.id !== selectorData.id) {
      this.selectors.forEach(function (currentSelector) {
        currentSelector.renameParentSelector(selector.id, selectorData.id)
      })

			// update cyclic selector
      var pos = selectorData.parentSelectors.indexOf(selector.id)
      if (pos !== -1) {
        selectorData.parentSelectors.splice(pos, 1, selectorData.id)
      }
    }

    selector.updateData(selectorData)

    if (this.getSelectorIds().indexOf(selector.id) === -1) {
      this.selectors.push(selector)
    }
  },
  deleteSelector: function (selectorToDelete) {
    this.selectors.forEach(function (selector) {
      if (selector.hasParentSelector(selectorToDelete.id)) {
        selector.removeParentSelector(selectorToDelete.id)
        if (selector.parentSelectors.length === 0) {
          this.deleteSelector(selector)
        }
      }
    }.bind(this))

    for (var i in this.selectors) {
      if (this.selectors[i].id === selectorToDelete.id) {
        this.selectors.splice(i, 1)
        break
      }
    }
  },
  getDataTableId: function () {
    return this._id.replace(/\./g, '_')
  },
  exportSitemap: function () {
    var sitemapObj = JSON.parse(JSON.stringify(this))
    delete sitemapObj._rev
    return JSON.stringify(sitemapObj)
  },
  importSitemap: function (sitemapJSON) {
    var sitemapObj = JSON.parse(sitemapJSON)
    this.initData(sitemapObj)
  },
	// return a list of columns than can be exported
  getDataColumns: function () {
    var columns = []
    this.selectors.forEach(function (selector) {
      columns = columns.concat(selector.getDataColumns())
    })

    return columns
  },
  getDataExportCsvBlob: function (data) {
    var columns = this.getDataColumns(),
      delimiter = ',',
      newline = '\n',
      csvData = ['\ufeff'] // utf-8 bom char

		// header
    csvData.push(columns.join(delimiter) + newline)

		// data
    data.forEach(function (row) {
      var rowData = []
      columns.forEach(function (column) {
        var cellData = row[column]
        if (cellData === undefined) {
          cellData = ''
        }				else if (typeof cellData === 'object') {
          cellData = JSON.stringify(cellData)
        }

        rowData.push('"' + cellData.replace(/"/g, '""').trim() + '"')
      })
      csvData.push(rowData.join(delimiter) + newline)
    })

    return new Blob(csvData, {type: 'text/csv'})
  },
  getSelectorById: function (selectorId) {
    return this.selectors.getSelectorById(selectorId)
  },
	/**
	 * Create full clone of sitemap
	 * @returns {Sitemap}
	 */
  clone: function () {
    var $ = this.$
    var clonedJSON = JSON.parse(JSON.stringify(this))
    var sitemap = new Sitemap(clonedJSON, {$})
    return sitemap
  }
}

module.exports = Sitemap

},{"./Selector":9,"./SelectorList":21}],24:[function(require,module,exports){
var Sitemap = require('./Sitemap')

/**
 * From devtools panel there is no possibility to execute XHR requests. So all requests to a remote CouchDb must be
 * handled through Background page. StoreDevtools is a simply a proxy store
 * @constructor
 */
var StoreDevtools = function (options) {
  this.$ = options.$
this.document = options.document
this.window = options.window
  if (!this.$) throw new Error('jquery required')
if (!this.document) throw new Error("Missing document")
if(!this.window)throw new Error("Missing window")
}

StoreDevtools.prototype = {
  createSitemap: function (sitemap, callback) {
    var request = {
      createSitemap: true,
      sitemap: JSON.parse(JSON.stringify(sitemap))
    }

    chrome.runtime.sendMessage(request, function (callbackFn, originalSitemap, newSitemap) {
      originalSitemap._rev = newSitemap._rev
      callbackFn(originalSitemap)
    }.bind(this, callback, sitemap))
  },
  saveSitemap: function (sitemap, callback) {
    this.createSitemap(sitemap, callback)
  },
  deleteSitemap: function (sitemap, callback) {
    var request = {
      deleteSitemap: true,
      sitemap: JSON.parse(JSON.stringify(sitemap))
    }
    chrome.runtime.sendMessage(request, function (response) {
      callback()
    })
  },
  getAllSitemaps: function (callback) {
    var $ = this.$
    var request = {
      getAllSitemaps: true
    }

    chrome.runtime.sendMessage(request, function (response) {
      var sitemaps = []

      for (var i in response) {
        sitemaps.push(new Sitemap(response[i], {$}))
      }
      callback(sitemaps)
    })
  },
  getSitemapData: function (sitemap, callback) {
    var request = {
      getSitemapData: true,
      sitemap: JSON.parse(JSON.stringify(sitemap))
    }

    chrome.runtime.sendMessage(request, function (response) {
      callback(response)
    })
  },
  sitemapExists: function (sitemapId, callback) {
    var request = {
      sitemapExists: true,
      sitemapId: sitemapId
    }

    chrome.runtime.sendMessage(request, function (response) {
      callback(response)
    })
  }
}

module.exports = StoreDevtools

},{"./Sitemap":23}],25:[function(require,module,exports){
var CssSelector = require('css-selector').CssSelector
// TODO get rid of jquery

/**
 * Only Elements unique will be added to this array
 * @constructor
 */
function UniqueElementList (clickElementUniquenessType, options) {
  this.$ = options.$
this.document = options.document
this.window = options.window
  if (!this.$) throw new Error('jquery required')
if (!this.document) throw new Error("Missing document")
if(!this.window)throw new Error("Missing window")
  this.clickElementUniquenessType = clickElementUniquenessType
  this.addedElements = {}
}

UniqueElementList.prototype = []

UniqueElementList.prototype.push = function (element) {
  var $ = this.$
  if (this.isAdded(element)) {
    return false
  } else {
    var elementUniqueId = this.getElementUniqueId(element)
    this.addedElements[elementUniqueId] = true
    Array.prototype.push.call(this, $(element).clone(true)[0])
    return true
  }
}

UniqueElementList.prototype.getElementUniqueId = function (element) {
  var $ = this.$
  if (this.clickElementUniquenessType === 'uniqueText') {
    var elementText = $(element).text().trim()
    return elementText
  } else if (this.clickElementUniquenessType === 'uniqueHTMLText') {
    var elementHTML = $("<div class='-web-scraper-should-not-be-visible'>").append($(element).eq(0).clone()).html()
    return elementHTML
  } else if (this.clickElementUniquenessType === 'uniqueHTML') {
		// get element without text
    var $element = $(element).eq(0).clone()

    var removeText = function ($element) {
      $element.contents()
				.filter(function () {
  if (this.nodeType !== 3) {
    removeText($(this))
  }
  return this.nodeType == 3 // Node.TEXT_NODE
}).remove()
    }
    removeText($element)

    var elementHTML = $("<div class='-web-scraper-should-not-be-visible'>").append($element).html()
    return elementHTML
  } else if (this.clickElementUniquenessType === 'uniqueCSSSelector') {
    var cs = new CssSelector({
      enableSmartTableSelector: false,
      parent: $('body')[0],
      enableResultStripping: false
    })
    var CSSSelector = cs.getCssSelector([element])
    return CSSSelector
  } else {
    throw 'Invalid clickElementUniquenessType ' + this.clickElementUniquenessType
  }
}

module.exports = UniqueElementList

UniqueElementList.prototype.isAdded = function (element) {
  var elementUniqueId = this.getElementUniqueId(element)
  var isAdded = elementUniqueId in this.addedElements
  return isAdded
}

},{"css-selector":28}],26:[function(require,module,exports){
var jquery = require('jquery-deferred')
var BackgroundScript = require('./BackgroundScript')
/**
 * @param location	configure from where the content script is being accessed (ContentScript, BackgroundPage, DevTools)
 * @returns BackgroundScript
 */
var getBackgroundScript = function (location) {
  // Handle calls from different places
  if (location === 'BackgroundScript') {
    return BackgroundScript
  } else if (location === 'DevTools' || location === 'ContentScript') {
    // if called within background script proxy calls to content script
    var backgroundScript = {}

    Object.keys(BackgroundScript).forEach(function (attr) {
      if (typeof BackgroundScript[attr] === 'function') {
        backgroundScript[attr] = function (request) {
          var reqToBackgroundScript = {
            backgroundScriptCall: true,
            fn: attr,
            request: request
          }

          var deferredResponse = jquery.Deferred()

          chrome.runtime.sendMessage(reqToBackgroundScript, function (response) {
            deferredResponse.resolve(response)
          })

          return deferredResponse
        }
      } else {
        backgroundScript[attr] = BackgroundScript[attr]
      }
    })

    return backgroundScript
  } else {
    throw new Error('Invalid BackgroundScript initialization - ' + location)
  }
}

module.exports = getBackgroundScript

},{"./BackgroundScript":4,"jquery-deferred":29}],27:[function(require,module,exports){
var getBackgroundScript = require('./getBackgroundScript')
var ContentScript = require('./ContentScript')
/**
 *
 * @param location	configure from where the content script is being accessed (ContentScript, BackgroundPage, DevTools)
 * @param options
 * @returns ContentScript
 */
var getContentScript = function (location) {
  var contentScript

  // Handle calls from different places
  if (location === 'ContentScript') {
    contentScript = ContentScript
    contentScript.backgroundScript = getBackgroundScript('ContentScript')
    return contentScript
  } else if (location === 'BackgroundScript' || location === 'DevTools') {
    var backgroundScript = getBackgroundScript(location)

    // if called within background script proxy calls to content script
    contentScript = {}
    Object.keys(ContentScript).forEach(function (attr) {
      if (typeof ContentScript[attr] === 'function') {
        contentScript[attr] = function (request) {
          var reqToContentScript = {
            contentScriptCall: true,
            fn: attr,
            request: request
          }

          return backgroundScript.executeContentScript(reqToContentScript)
        }
      } else {
        contentScript[attr] = ContentScript[attr]
      }
    })
    contentScript.backgroundScript = backgroundScript
    return contentScript
  } else {
    throw new Error('Invalid ContentScript initialization - ' + location)
  }
}

module.exports = getContentScript

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJleHRlbnNpb24vYXNzZXRzL2Jhc2U2NC5qcyIsImV4dGVuc2lvbi9hc3NldHMvanF1ZXJ5LndoZW5jYWxsc2VxdWVudGlhbGx5LmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvQXBwLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvQmFja2dyb3VuZFNjcmlwdC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL0NvbnRlbnRTY3JpcHQuanMiLCJleHRlbnNpb24vc2NyaXB0cy9Db250ZW50U2VsZWN0b3IuanMiLCJleHRlbnNpb24vc2NyaXB0cy9Db250cm9sbGVyLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvRWxlbWVudFF1ZXJ5LmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckVsZW1lbnQuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckVsZW1lbnRBdHRyaWJ1dGUuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckVsZW1lbnRDbGljay5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9yL1NlbGVjdG9yRWxlbWVudFNjcm9sbC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9yL1NlbGVjdG9yR3JvdXAuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckhUTUwuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckltYWdlLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IvU2VsZWN0b3JMaW5rLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IvU2VsZWN0b3JQb3B1cExpbmsuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvclRhYmxlLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IvU2VsZWN0b3JUZXh0LmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3JMaXN0LmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3JzLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2l0ZW1hcC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1N0b3JlRGV2dG9vbHMuanMiLCJleHRlbnNpb24vc2NyaXB0cy9VbmlxdWVFbGVtZW50TGlzdC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL2dldEJhY2tncm91bmRTY3JpcHQuanMiLCJleHRlbnNpb24vc2NyaXB0cy9nZXRDb250ZW50U2NyaXB0LmpzIiwibm9kZV9tb2R1bGVzL2Nzcy1zZWxlY3Rvci9saWIvQ3NzU2VsZWN0b3IuanMiLCJub2RlX21vZHVsZXMvanF1ZXJ5LWRlZmVycmVkL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2pxdWVyeS1kZWZlcnJlZC9saWIvanF1ZXJ5LWNhbGxiYWNrcy5qcyIsIm5vZGVfbW9kdWxlcy9qcXVlcnktZGVmZXJyZWQvbGliL2pxdWVyeS1jb3JlLmpzIiwibm9kZV9tb2R1bGVzL2pxdWVyeS1kZWZlcnJlZC9saWIvanF1ZXJ5LWRlZmVycmVkLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3YyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN2VBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG4vKipcbiAqIEB1cmwgaHR0cDovL2pzcGVyZi5jb20vYmxvYi1iYXNlNjQtY29udmVyc2lvblxuICogQHR5cGUge3tibG9iVG9CYXNlNjQ6IGJsb2JUb0Jhc2U2NCwgYmFzZTY0VG9CbG9iOiBiYXNlNjRUb0Jsb2J9fVxuICovXG52YXIgQmFzZTY0ID0ge1xuXG4gIGJsb2JUb0Jhc2U2NDogZnVuY3Rpb24gKGJsb2IpIHtcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGRhdGFVcmwgPSByZWFkZXIucmVzdWx0XG4gICAgICB2YXIgYmFzZTY0ID0gZGF0YVVybC5zcGxpdCgnLCcpWzFdXG4gICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUoYmFzZTY0KVxuICAgIH1cbiAgICByZWFkZXIucmVhZEFzRGF0YVVSTChibG9iKVxuXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gIH0sXG5cbiAgYmFzZTY0VG9CbG9iOiBmdW5jdGlvbiAoYmFzZTY0LCBtaW1lVHlwZSkge1xuICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgYmluYXJ5ID0gYXRvYihiYXNlNjQpXG4gICAgdmFyIGxlbiA9IGJpbmFyeS5sZW5ndGhcbiAgICB2YXIgYnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKGxlbilcbiAgICB2YXIgdmlldyA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlcilcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB2aWV3W2ldID0gYmluYXJ5LmNoYXJDb2RlQXQoaSlcbiAgICB9XG4gICAgdmFyIGJsb2IgPSBuZXcgQmxvYihbdmlld10sIHt0eXBlOiBtaW1lVHlwZX0pXG4gICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKGJsb2IpXG5cbiAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZS5wcm9taXNlKClcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEJhc2U2NFxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG4vKipcbiAqIEBhdXRob3IgTWFydGlucyBCYWxvZGlzXG4gKlxuICogQW4gYWx0ZXJuYXRpdmUgdmVyc2lvbiBvZiAkLndoZW4gd2hpY2ggY2FuIGJlIHVzZWQgdG8gZXhlY3V0ZSBhc3luY2hyb25vdXNcbiAqIGNhbGxzIHNlcXVlbnRpYWxseSBvbmUgYWZ0ZXIgYW5vdGhlci5cbiAqXG4gKiBAcmV0dXJucyBqcXVlcnlEZWZlcnJlZCgpLnByb21pc2UoKVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHdoZW5DYWxsU2VxdWVudGlhbGx5IChmdW5jdGlvbkNhbGxzKSB7XG4gIHZhciBkZWZlcnJlZFJlc29uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICB2YXIgcmVzdWx0RGF0YSA9IFtdXG5cblx0Ly8gbm90aGluZyB0byBkb1xuICBpZiAoZnVuY3Rpb25DYWxscy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gZGVmZXJyZWRSZXNvbnNlLnJlc29sdmUocmVzdWx0RGF0YSkucHJvbWlzZSgpXG4gIH1cblxuICB2YXIgY3VycmVudERlZmVycmVkID0gZnVuY3Rpb25DYWxscy5zaGlmdCgpKClcblx0Ly8gZXhlY3V0ZSBzeW5jaHJvbm91cyBjYWxscyBzeW5jaHJvbm91c2x5XG4gIHdoaWxlIChjdXJyZW50RGVmZXJyZWQuc3RhdGUoKSA9PT0gJ3Jlc29sdmVkJykge1xuICAgIGN1cnJlbnREZWZlcnJlZC5kb25lKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICByZXN1bHREYXRhLnB1c2goZGF0YSlcbiAgICB9KVxuICAgIGlmIChmdW5jdGlvbkNhbGxzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGRlZmVycmVkUmVzb25zZS5yZXNvbHZlKHJlc3VsdERhdGEpLnByb21pc2UoKVxuICAgIH1cbiAgICBjdXJyZW50RGVmZXJyZWQgPSBmdW5jdGlvbkNhbGxzLnNoaWZ0KCkoKVxuICB9XG5cblx0Ly8gaGFuZGxlIGFzeW5jIGNhbGxzXG4gIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcblx0XHQvLyBoYW5kbGUgbWl4ZWQgc3luYyBjYWxsc1xuICAgIHdoaWxlIChjdXJyZW50RGVmZXJyZWQuc3RhdGUoKSA9PT0gJ3Jlc29sdmVkJykge1xuICAgICAgY3VycmVudERlZmVycmVkLmRvbmUoZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgcmVzdWx0RGF0YS5wdXNoKGRhdGEpXG4gICAgICB9KVxuICAgICAgaWYgKGZ1bmN0aW9uQ2FsbHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpXG4gICAgICAgIGRlZmVycmVkUmVzb25zZS5yZXNvbHZlKHJlc3VsdERhdGEpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjdXJyZW50RGVmZXJyZWQgPSBmdW5jdGlvbkNhbGxzLnNoaWZ0KCkoKVxuICAgIH1cbiAgfSwgMTApXG5cbiAgcmV0dXJuIGRlZmVycmVkUmVzb25zZS5wcm9taXNlKClcbn1cbiIsInZhciBTdG9yZURldnRvb2xzID0gcmVxdWlyZSgnLi9TdG9yZURldnRvb2xzJylcbnZhciBTaXRlbWFwQ29udHJvbGxlciA9IHJlcXVpcmUoJy4vQ29udHJvbGxlcicpXG5cbiQoZnVuY3Rpb24gKCkge1xuXHQvLyBpbml0IGJvb3RzdHJhcCBhbGVydHNcbiAgJCgnLmFsZXJ0JykuYWxlcnQoKVxuXG4gIHZhciBzdG9yZSA9IG5ldyBTdG9yZURldnRvb2xzKHskfSlcbiAgbmV3IFNpdGVtYXBDb250cm9sbGVyKHtcbiAgICBzdG9yZTogc3RvcmUsXG4gICAgdGVtcGxhdGVEaXI6ICd2aWV3cy8nXG4gIH0sIHskfSlcbn0pXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbi8qKlxuICogQ29udGVudFNjcmlwdCB0aGF0IGNhbiBiZSBjYWxsZWQgZnJvbSBhbnl3aGVyZSB3aXRoaW4gdGhlIGV4dGVuc2lvblxuICovXG52YXIgQmFja2dyb3VuZFNjcmlwdCA9IHtcblxuICBkdW1teTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBqcXVlcnkuRGVmZXJyZWQoKS5yZXNvbHZlKCdkdW1teScpLnByb21pc2UoKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIHRoZSBpZCBvZiB0aGUgdGFiIHRoYXQgaXMgdmlzaWJsZSB0byB1c2VyXG5cdCAqIEByZXR1cm5zIGpxdWVyeS5EZWZlcnJlZCgpIGludGVnZXJcblx0ICovXG4gIGdldEFjdGl2ZVRhYklkOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgY2hyb21lLnRhYnMucXVlcnkoe1xuICAgICAgYWN0aXZlOiB0cnVlLFxuICAgICAgY3VycmVudFdpbmRvdzogdHJ1ZVxuICAgIH0sIGZ1bmN0aW9uICh0YWJzKSB7XG4gICAgICBpZiAodGFicy5sZW5ndGggPCAxKSB7XG5cdFx0XHRcdC8vIEBUT0RPIG11c3QgYmUgcnVubmluZyB3aXRoaW4gcG9wdXAuIG1heWJlIGZpbmQgYW5vdGhlciBhY3RpdmUgd2luZG93P1xuICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlamVjdChcImNvdWxkbid0IGZpbmQgdGhlIGFjdGl2ZSB0YWJcIilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB0YWJJZCA9IHRhYnNbMF0uaWRcbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKHRhYklkKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gIH0sXG5cblx0LyoqXG5cdCAqIEV4ZWN1dGUgYSBmdW5jdGlvbiB3aXRoaW4gdGhlIGFjdGl2ZSB0YWIgd2l0aGluIGNvbnRlbnQgc2NyaXB0XG5cdCAqIEBwYXJhbSByZXF1ZXN0LmZuXHRmdW5jdGlvbiB0byBjYWxsXG5cdCAqIEBwYXJhbSByZXF1ZXN0LnJlcXVlc3RcdHJlcXVlc3QgdGhhdCB3aWxsIGJlIHBhc3NlZCB0byB0aGUgZnVuY3Rpb25cblx0ICovXG4gIGV4ZWN1dGVDb250ZW50U2NyaXB0OiBmdW5jdGlvbiAocmVxdWVzdCkge1xuICAgIHZhciByZXFUb0NvbnRlbnRTY3JpcHQgPSB7XG4gICAgICBjb250ZW50U2NyaXB0Q2FsbDogdHJ1ZSxcbiAgICAgIGZuOiByZXF1ZXN0LmZuLFxuICAgICAgcmVxdWVzdDogcmVxdWVzdC5yZXF1ZXN0XG4gICAgfVxuICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgZGVmZXJyZWRBY3RpdmVUYWJJZCA9IHRoaXMuZ2V0QWN0aXZlVGFiSWQoKVxuICAgIGRlZmVycmVkQWN0aXZlVGFiSWQuZG9uZShmdW5jdGlvbiAodGFiSWQpIHtcbiAgICAgIGNocm9tZS50YWJzLnNlbmRNZXNzYWdlKHRhYklkLCByZXFUb0NvbnRlbnRTY3JpcHQsIGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUocmVzcG9uc2UpXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQmFja2dyb3VuZFNjcmlwdFxuIiwidmFyIENvbnRlbnRTZWxlY3RvciA9IHJlcXVpcmUoJy4vQ29udGVudFNlbGVjdG9yJylcbnZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxuLyoqXG4gKiBDb250ZW50U2NyaXB0IHRoYXQgY2FuIGJlIGNhbGxlZCBmcm9tIGFueXdoZXJlIHdpdGhpbiB0aGUgZXh0ZW5zaW9uXG4gKi9cbnZhciBDb250ZW50U2NyaXB0ID0ge1xuXG5cdC8qKlxuXHQgKiBGZXRjaFxuXHQgKiBAcGFyYW0gcmVxdWVzdC5DU1NTZWxlY3Rvclx0Y3NzIHNlbGVjdG9yIGFzIHN0cmluZ1xuXHQgKiBAcmV0dXJucyBqcXVlcnkuRGVmZXJyZWQoKVxuXHQgKi9cbiAgZ2V0SFRNTDogZnVuY3Rpb24gKHJlcXVlc3QsIG9wdGlvbnMpIHtcbiAgICB2YXIgJCA9IG9wdGlvbnMuJFxuICAgIHZhciBkZWZlcnJlZEhUTUwgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciBodG1sID0gJChyZXF1ZXN0LkNTU1NlbGVjdG9yKS5jbG9uZSgpLndyYXAoJzxwPicpLnBhcmVudCgpLmh0bWwoKVxuICAgIGRlZmVycmVkSFRNTC5yZXNvbHZlKGh0bWwpXG4gICAgcmV0dXJuIGRlZmVycmVkSFRNTC5wcm9taXNlKClcbiAgfSxcblxuXHQvKipcblx0ICogUmVtb3ZlcyBjdXJyZW50IGNvbnRlbnQgc2VsZWN0b3IgaWYgaXMgaW4gdXNlIHdpdGhpbiB0aGUgcGFnZVxuXHQgKiBAcmV0dXJucyBqcXVlcnkuRGVmZXJyZWQoKVxuXHQgKi9cbiAgcmVtb3ZlQ3VycmVudENvbnRlbnRTZWxlY3RvcjogZnVuY3Rpb24gKCkge1xuICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgY29udGVudFNlbGVjdG9yID0gd2luZG93LmNzXG4gICAgaWYgKGNvbnRlbnRTZWxlY3RvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUoKVxuICAgIH0gZWxzZSB7XG4gICAgICBjb250ZW50U2VsZWN0b3IucmVtb3ZlR1VJKClcbiAgICAgIHdpbmRvdy5jcyA9IHVuZGVmaW5lZFxuICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKClcbiAgICB9XG5cbiAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZS5wcm9taXNlKClcbiAgfSxcblxuXHQvKipcblx0ICogU2VsZWN0IGVsZW1lbnRzIHdpdGhpbiB0aGUgcGFnZVxuXHQgKiBAcGFyYW0gcmVxdWVzdC5wYXJlbnRDU1NTZWxlY3RvclxuXHQgKiBAcGFyYW0gcmVxdWVzdC5hbGxvd2VkRWxlbWVudHNcblx0ICovXG4gIHNlbGVjdFNlbGVjdG9yOiBmdW5jdGlvbiAocmVxdWVzdCwgb3B0aW9ucykge1xuICAgIHZhciAkID0gb3B0aW9ucy4kXG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgdGhpcy5yZW1vdmVDdXJyZW50Q29udGVudFNlbGVjdG9yKCkuZG9uZShmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgY29udGVudFNlbGVjdG9yID0gbmV3IENvbnRlbnRTZWxlY3Rvcih7XG4gICAgICAgIHBhcmVudENTU1NlbGVjdG9yOiByZXF1ZXN0LnBhcmVudENTU1NlbGVjdG9yLFxuICAgICAgICBhbGxvd2VkRWxlbWVudHM6IHJlcXVlc3QuYWxsb3dlZEVsZW1lbnRzXG4gICAgICB9LCB7JH0pXG4gICAgICB3aW5kb3cuY3MgPSBjb250ZW50U2VsZWN0b3JcblxuICAgICAgdmFyIGRlZmVycmVkQ1NTU2VsZWN0b3IgPSBjb250ZW50U2VsZWN0b3IuZ2V0Q1NTU2VsZWN0b3IoKVxuICAgICAgZGVmZXJyZWRDU1NTZWxlY3Rvci5kb25lKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICB0aGlzLnJlbW92ZUN1cnJlbnRDb250ZW50U2VsZWN0b3IoKS5kb25lKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUocmVzcG9uc2UpXG4gICAgICAgICAgd2luZG93LmNzID0gdW5kZWZpbmVkXG4gICAgICAgIH0pXG4gICAgICB9LmJpbmQodGhpcykpLmZhaWwoZnVuY3Rpb24gKG1lc3NhZ2UpIHtcbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZWplY3QobWVzc2FnZSlcbiAgICAgICAgd2luZG93LmNzID0gdW5kZWZpbmVkXG4gICAgICB9KVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBQcmV2aWV3IGVsZW1lbnRzXG5cdCAqIEBwYXJhbSByZXF1ZXN0LnBhcmVudENTU1NlbGVjdG9yXG5cdCAqIEBwYXJhbSByZXF1ZXN0LmVsZW1lbnRDU1NTZWxlY3RvclxuXHQgKi9cbiAgcHJldmlld1NlbGVjdG9yOiBmdW5jdGlvbiAocmVxdWVzdCwgb3B0aW9ucykge1xuICAgIHZhciAkID0gb3B0aW9ucy4kXG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHRoaXMucmVtb3ZlQ3VycmVudENvbnRlbnRTZWxlY3RvcigpLmRvbmUoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGNvbnRlbnRTZWxlY3RvciA9IG5ldyBDb250ZW50U2VsZWN0b3Ioe1xuICAgICAgICBwYXJlbnRDU1NTZWxlY3RvcjogcmVxdWVzdC5wYXJlbnRDU1NTZWxlY3RvclxuICAgICAgfSwgeyR9KVxuICAgICAgd2luZG93LmNzID0gY29udGVudFNlbGVjdG9yXG5cbiAgICAgIHZhciBkZWZlcnJlZFNlbGVjdG9yUHJldmlldyA9IGNvbnRlbnRTZWxlY3Rvci5wcmV2aWV3U2VsZWN0b3IocmVxdWVzdC5lbGVtZW50Q1NTU2VsZWN0b3IpXG4gICAgICBkZWZlcnJlZFNlbGVjdG9yUHJldmlldy5kb25lKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKClcbiAgICAgIH0pLmZhaWwoZnVuY3Rpb24gKG1lc3NhZ2UpIHtcbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZWplY3QobWVzc2FnZSlcbiAgICAgICAgd2luZG93LmNzID0gdW5kZWZpbmVkXG4gICAgICB9KVxuICAgIH0pXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2VcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnRTY3JpcHRcbiIsInZhciBFbGVtZW50UXVlcnkgPSByZXF1aXJlKCcuL0VsZW1lbnRRdWVyeScpXG52YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciBDc3NTZWxlY3RvciA9IHJlcXVpcmUoJ2Nzcy1zZWxlY3RvcicpLkNzc1NlbGVjdG9yXG4vKipcbiAqIEBwYXJhbSBvcHRpb25zLnBhcmVudENTU1NlbGVjdG9yXHRFbGVtZW50cyBjYW4gYmUgb25seSBzZWxlY3RlZCB3aXRoaW4gdGhpcyBlbGVtZW50XG4gKiBAcGFyYW0gb3B0aW9ucy5hbGxvd2VkRWxlbWVudHNcdEVsZW1lbnRzIHRoYXQgY2FuIG9ubHkgYmUgc2VsZWN0ZWRcbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgQ29udGVudFNlbGVjdG9yID0gZnVuY3Rpb24gKG9wdGlvbnMsIG1vcmVPcHRpb25zKSB7XG5cdC8vIGRlZmVycmVkIHJlc3BvbnNlXG4gIHRoaXMuZGVmZXJyZWRDU1NTZWxlY3RvclJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICB0aGlzLmFsbG93ZWRFbGVtZW50cyA9IG9wdGlvbnMuYWxsb3dlZEVsZW1lbnRzXG4gIHRoaXMucGFyZW50Q1NTU2VsZWN0b3IgPSBvcHRpb25zLnBhcmVudENTU1NlbGVjdG9yLnRyaW0oKVxuICB0aGlzLmFsZXJ0ID0gb3B0aW9ucy5hbGVydCB8fCBmdW5jdGlvbiAodHh0KSB7IGFsZXJ0KHR4dCkgfVxuXG4gIHRoaXMuJCA9IG1vcmVPcHRpb25zLiRcbnRoaXMuZG9jdW1lbnQgPSBtb3JlT3B0aW9ucy5kb2N1bWVudFxudGhpcy53aW5kb3cgPSBtb3JlT3B0aW9ucy53aW5kb3dcbiAgaWYgKCF0aGlzLiQpIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBqcXVlcnkgaW4gY29udGVudCBzZWxlY3RvcicpXG5pZiAoIXRoaXMuZG9jdW1lbnQpIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgZG9jdW1lbnRcIilcbmlmKCF0aGlzLndpbmRvdyl0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHdpbmRvd1wiKVxuICBpZiAodGhpcy5wYXJlbnRDU1NTZWxlY3Rvcikge1xuICAgIHRoaXMucGFyZW50ID0gdGhpcy4kKHRoaXMucGFyZW50Q1NTU2VsZWN0b3IpWzBdXG5cblx0XHQvLyAgaGFuZGxlIHNpdHVhdGlvbiB3aGVuIHBhcmVudCBzZWxlY3RvciBub3QgZm91bmRcbiAgICBpZiAodGhpcy5wYXJlbnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5kZWZlcnJlZENTU1NlbGVjdG9yUmVzcG9uc2UucmVqZWN0KCdwYXJlbnQgc2VsZWN0b3Igbm90IGZvdW5kJylcbiAgICAgIHRoaXMuYWxlcnQoJ1BhcmVudCBlbGVtZW50IG5vdCBmb3VuZCEnKVxuICAgIH1cbiAgfVx0ZWxzZSB7XG4gICAgdGhpcy5wYXJlbnQgPSB0aGlzLiQoJ2JvZHknKVswXVxuICB9XG59XG5cbkNvbnRlbnRTZWxlY3Rvci5wcm90b3R5cGUgPSB7XG5cblx0LyoqXG5cdCAqIGdldCBjc3Mgc2VsZWN0b3Igc2VsZWN0ZWQgYnkgdGhlIHVzZXJcblx0ICovXG4gIGdldENTU1NlbGVjdG9yOiBmdW5jdGlvbiAocmVxdWVzdCkge1xuICAgIGlmICh0aGlzLmRlZmVycmVkQ1NTU2VsZWN0b3JSZXNwb25zZS5zdGF0ZSgpICE9PSAncmVqZWN0ZWQnKSB7XG5cdFx0XHQvLyBlbGVtZW50cyB0aGF0IGFyZSBzZWxlY3RlZCBieSB0aGUgdXNlclxuICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnRzID0gW11cblx0XHRcdC8vIGVsZW1lbnQgc2VsZWN0ZWQgZnJvbSB0b3BcbiAgICAgIHRoaXMudG9wID0gMFxuXG5cdFx0XHQvLyBpbml0aWFsaXplIGNzcyBzZWxlY3RvclxuICAgICAgdGhpcy5pbml0Q3NzU2VsZWN0b3IoZmFsc2UpXG5cbiAgICAgIHRoaXMuaW5pdEdVSSgpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZGVmZXJyZWRDU1NTZWxlY3RvclJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG4gIGdldEN1cnJlbnRDU1NTZWxlY3RvcjogZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLnNlbGVjdGVkRWxlbWVudHMgJiYgdGhpcy5zZWxlY3RlZEVsZW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgIHZhciBjc3NTZWxlY3RvclxuXG5cdFx0XHQvLyBoYW5kbGUgc3BlY2lhbCBjYXNlIHdoZW4gcGFyZW50IGlzIHNlbGVjdGVkXG4gICAgICBpZiAodGhpcy5pc1BhcmVudFNlbGVjdGVkKCkpIHtcbiAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWRFbGVtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICBjc3NTZWxlY3RvciA9ICdfcGFyZW50XydcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLiQoJyMtc2VsZWN0b3ItdG9vbGJhciBbbmFtZT1kaWZlcmVudEVsZW1lbnRTZWxlY3Rpb25dJykucHJvcCgnY2hlY2tlZCcpKSB7XG4gICAgICAgICAgdmFyIHNlbGVjdGVkRWxlbWVudHMgPSB0aGlzLnNlbGVjdGVkRWxlbWVudHMuY2xvbmUoKVxuICAgICAgICAgIHNlbGVjdGVkRWxlbWVudHMuc3BsaWNlKHNlbGVjdGVkRWxlbWVudHMuaW5kZXhPZih0aGlzLnBhcmVudCksIDEpXG4gICAgICAgICAgY3NzU2VsZWN0b3IgPSAnX3BhcmVudF8sICcgKyB0aGlzLmNzc1NlbGVjdG9yLmdldENzc1NlbGVjdG9yKHNlbGVjdGVkRWxlbWVudHMsIHRoaXMudG9wKVxuICAgICAgICB9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIHdpbGwgdHJpZ2dlciBlcnJvciB3aGVyZSBtdWx0aXBsZSBzZWxlY3Rpb25zIGFyZSBub3QgYWxsb3dlZFxuICAgICAgICAgIGNzc1NlbGVjdG9yID0gdGhpcy5jc3NTZWxlY3Rvci5nZXRDc3NTZWxlY3Rvcih0aGlzLnNlbGVjdGVkRWxlbWVudHMsIHRoaXMudG9wKVxuICAgICAgICB9XG4gICAgICB9XHRcdFx0ZWxzZSB7XG4gICAgICAgIGNzc1NlbGVjdG9yID0gdGhpcy5jc3NTZWxlY3Rvci5nZXRDc3NTZWxlY3Rvcih0aGlzLnNlbGVjdGVkRWxlbWVudHMsIHRoaXMudG9wKVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gY3NzU2VsZWN0b3JcbiAgICB9XG4gICAgcmV0dXJuICcnXG4gIH0sXG5cbiAgaXNQYXJlbnRTZWxlY3RlZDogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLnNlbGVjdGVkRWxlbWVudHMuaW5kZXhPZih0aGlzLnBhcmVudCkgIT09IC0xXG4gIH0sXG5cblx0LyoqXG5cdCAqIGluaXRpYWxpemUgb3IgcmVjb25maWd1cmUgY3NzIHNlbGVjdG9yIGNsYXNzXG5cdCAqIEBwYXJhbSBhbGxvd011bHRpcGxlU2VsZWN0b3JzXG5cdCAqL1xuICBpbml0Q3NzU2VsZWN0b3I6IGZ1bmN0aW9uIChhbGxvd011bHRpcGxlU2VsZWN0b3JzKSB7XG4gICAgdGhpcy5jc3NTZWxlY3RvciA9IG5ldyBDc3NTZWxlY3Rvcih7XG4gICAgICBlbmFibGVTbWFydFRhYmxlU2VsZWN0b3I6IHRydWUsXG4gICAgICBwYXJlbnQ6IHRoaXMucGFyZW50LFxuICAgICAgYWxsb3dNdWx0aXBsZVNlbGVjdG9yczogYWxsb3dNdWx0aXBsZVNlbGVjdG9ycyxcbiAgICAgIGlnbm9yZWRDbGFzc2VzOiBbXG4gICAgICAgICctc2l0ZW1hcC1zZWxlY3QtaXRlbS1zZWxlY3RlZCcsXG4gICAgICAgICctc2l0ZW1hcC1zZWxlY3QtaXRlbS1ob3ZlcicsXG4gICAgICAgICctc2l0ZW1hcC1wYXJlbnQnLFxuICAgICAgICAnLXdlYi1zY3JhcGVyLWltZy1vbi10b3AnLFxuICAgICAgICAnLXdlYi1zY3JhcGVyLXNlbGVjdGlvbi1hY3RpdmUnXG4gICAgICBdLFxuICAgICAgcXVlcnk6IHRoaXMuJFxuICAgIH0pXG4gIH0sXG5cbiAgcHJldmlld1NlbGVjdG9yOiBmdW5jdGlvbiAoZWxlbWVudENTU1NlbGVjdG9yKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICBpZiAodGhpcy5kZWZlcnJlZENTU1NlbGVjdG9yUmVzcG9uc2Uuc3RhdGUoKSAhPT0gJ3JlamVjdGVkJykge1xuICAgICAgdGhpcy5oaWdobGlnaHRQYXJlbnQoKVxuICAgICAgJChFbGVtZW50UXVlcnkoZWxlbWVudENTU1NlbGVjdG9yLCB0aGlzLnBhcmVudCwgeyR9KSkuYWRkQ2xhc3MoJy1zaXRlbWFwLXNlbGVjdC1pdGVtLXNlbGVjdGVkJylcbiAgICAgIHRoaXMuZGVmZXJyZWRDU1NTZWxlY3RvclJlc3BvbnNlLnJlc29sdmUoKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmRlZmVycmVkQ1NTU2VsZWN0b3JSZXNwb25zZS5wcm9taXNlKClcbiAgfSxcblxuICBpbml0R1VJOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGRvY3VtZW50ID0gdGhpcy5kb2N1bWVudFxuICAgIHRoaXMuaGlnaGxpZ2h0UGFyZW50KClcblxuXHRcdC8vIGFsbCBlbGVtZW50cyBleGNlcHQgdG9vbGJhclxuICAgIHRoaXMuJGFsbEVsZW1lbnRzID0gdGhpcy4kKHRoaXMuYWxsb3dlZEVsZW1lbnRzICsgJzpub3QoIy1zZWxlY3Rvci10b29sYmFyKTpub3QoIy1zZWxlY3Rvci10b29sYmFyICopJywgdGhpcy5wYXJlbnQpXG5cdFx0Ly8gYWxsb3cgc2VsZWN0aW5nIHBhcmVudCBhbHNvXG4gICAgaWYgKHRoaXMucGFyZW50ICE9PSBkb2N1bWVudC5ib2R5KSB7XG4gICAgICB0aGlzLiRhbGxFbGVtZW50cy5wdXNoKHRoaXMucGFyZW50KVxuICAgIH1cblxuICAgIHRoaXMuYmluZEVsZW1lbnRIaWdobGlnaHQoKVxuICAgIHRoaXMuYmluZEVsZW1lbnRTZWxlY3Rpb24oKVxuICAgIHRoaXMuYmluZEtleWJvYXJkU2VsZWN0aW9uTWFuaXB1bGF0aW9ucygpXG4gICAgdGhpcy5hdHRhY2hUb29sYmFyKClcbiAgICB0aGlzLmJpbmRNdWx0aXBsZUdyb3VwQ2hlY2tib3goKVxuICAgIHRoaXMuYmluZE11bHRpcGxlR3JvdXBQb3B1cEhpZGUoKVxuICAgIHRoaXMuYmluZE1vdmVJbWFnZXNUb1RvcCgpXG4gIH0sXG5cbiAgYmluZEVsZW1lbnRTZWxlY3Rpb246IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiRhbGxFbGVtZW50cy5iaW5kKCdjbGljay5lbGVtZW50U2VsZWN0b3InLCBmdW5jdGlvbiAoZSkge1xuICAgICAgdmFyIGVsZW1lbnQgPSBlLmN1cnJlbnRUYXJnZXRcbiAgICAgIGlmICh0aGlzLnNlbGVjdGVkRWxlbWVudHMuaW5kZXhPZihlbGVtZW50KSA9PT0gLTEpIHtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnRzLnB1c2goZWxlbWVudClcbiAgICAgIH1cbiAgICAgIHRoaXMuaGlnaGxpZ2h0U2VsZWN0ZWRFbGVtZW50cygpXG5cblx0XHRcdC8vIENhbmNlbCBhbGwgb3RoZXIgZXZlbnRzXG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG5cblx0LyoqXG5cdCAqIEFkZCB0byBzZWxlY3QgZWxlbWVudHMgdGhlIGVsZW1lbnQgdGhhdCBpcyB1bmRlciB0aGUgbW91c2Vcblx0ICovXG4gIHNlbGVjdE1vdXNlT3ZlckVsZW1lbnQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZWxlbWVudCA9IHRoaXMubW91c2VPdmVyRWxlbWVudFxuICAgIGlmIChlbGVtZW50KSB7XG4gICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudHMucHVzaChlbGVtZW50KVxuICAgICAgdGhpcy5oaWdobGlnaHRTZWxlY3RlZEVsZW1lbnRzKClcbiAgICB9XG4gIH0sXG5cbiAgYmluZEVsZW1lbnRIaWdobGlnaHQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQodGhpcy4kYWxsRWxlbWVudHMpLmJpbmQoJ21vdXNlb3Zlci5lbGVtZW50U2VsZWN0b3InLCBmdW5jdGlvbiAoZSkge1xuICAgICAgdmFyIGVsZW1lbnQgPSBlLmN1cnJlbnRUYXJnZXRcbiAgICAgIHRoaXMubW91c2VPdmVyRWxlbWVudCA9IGVsZW1lbnRcbiAgICAgIHRoaXMuJChlbGVtZW50KS5hZGRDbGFzcygnLXNpdGVtYXAtc2VsZWN0LWl0ZW0taG92ZXInKVxuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfS5iaW5kKHRoaXMpKS5iaW5kKCdtb3VzZW91dC5lbGVtZW50U2VsZWN0b3InLCBmdW5jdGlvbiAoZSkge1xuICAgICAgdmFyIGVsZW1lbnQgPSBlLmN1cnJlbnRUYXJnZXRcbiAgICAgIHRoaXMubW91c2VPdmVyRWxlbWVudCA9IG51bGxcbiAgICAgIHRoaXMuJChlbGVtZW50KS5yZW1vdmVDbGFzcygnLXNpdGVtYXAtc2VsZWN0LWl0ZW0taG92ZXInKVxuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuXG4gIGJpbmRNb3ZlSW1hZ2VzVG9Ub3A6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoJ2JvZHknKS5hZGRDbGFzcygnLXdlYi1zY3JhcGVyLXNlbGVjdGlvbi1hY3RpdmUnKVxuXG5cdFx0Ly8gZG8gdGhpcyBvbmx5IHdoZW4gc2VsZWN0aW5nIGltYWdlc1xuICAgIGlmICh0aGlzLmFsbG93ZWRFbGVtZW50cyA9PT0gJ2ltZycpIHtcbiAgICAgIHRoaXMuJCgnaW1nJykuZmlsdGVyKGZ1bmN0aW9uIChpLCBlbGVtZW50KSB7XG4gICAgICAgIHJldHVybiB0aGlzLiQoZWxlbWVudCkuY3NzKCdwb3NpdGlvbicpID09PSAnc3RhdGljJ1xuICAgICAgfSkuYWRkQ2xhc3MoJy13ZWItc2NyYXBlci1pbWctb24tdG9wJylcbiAgICB9XG4gIH0sXG5cbiAgdW5iaW5kTW92ZUltYWdlc1RvVG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKCdib2R5Li13ZWItc2NyYXBlci1zZWxlY3Rpb24tYWN0aXZlJykucmVtb3ZlQ2xhc3MoJy13ZWItc2NyYXBlci1zZWxlY3Rpb24tYWN0aXZlJylcbiAgICB0aGlzLiQoJ2ltZy4td2ViLXNjcmFwZXItaW1nLW9uLXRvcCcpLnJlbW92ZUNsYXNzKCctd2ViLXNjcmFwZXItaW1nLW9uLXRvcCcpXG4gIH0sXG5cbiAgc2VsZWN0Q2hpbGQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnRvcC0tXG4gICAgaWYgKHRoaXMudG9wIDwgMCkge1xuICAgICAgdGhpcy50b3AgPSAwXG4gICAgfVxuICB9LFxuICBzZWxlY3RQYXJlbnQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnRvcCsrXG4gIH0sXG5cblx0Ly8gVXNlciB3aXRoIGtleWJvYXJkIGFycm93cyBjYW4gc2VsZWN0IGNoaWxkIG9yIHBhcmV0IGVsZW1lbnRzIG9mIHNlbGVjdGVkIGVsZW1lbnRzLlxuICBiaW5kS2V5Ym9hcmRTZWxlY3Rpb25NYW5pcHVsYXRpb25zOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGRvY3VtZW50ID0gdGhpcy5kb2N1bWVudFxuXHRcdC8vIGNoZWNrIGZvciBmb2N1c1xuICAgIHZhciBsYXN0Rm9jdXNTdGF0dXNcbiAgICB0aGlzLmtleVByZXNzRm9jdXNJbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBmb2N1cyA9IGRvY3VtZW50Lmhhc0ZvY3VzKClcbiAgICAgIGlmIChmb2N1cyA9PT0gbGFzdEZvY3VzU3RhdHVzKSByZXR1cm5cbiAgICAgIGxhc3RGb2N1c1N0YXR1cyA9IGZvY3VzXG5cbiAgICAgIHRoaXMuJCgnIy1zZWxlY3Rvci10b29sYmFyIC5rZXktYnV0dG9uJykudG9nZ2xlQ2xhc3MoJ2hpZGUnLCAhZm9jdXMpXG4gICAgICB0aGlzLiQoJyMtc2VsZWN0b3ItdG9vbGJhciAua2V5LWV2ZW50cycpLnRvZ2dsZUNsYXNzKCdoaWRlJywgZm9jdXMpXG4gICAgfSwgMjAwKVxuXG5cdFx0Ly8gVXNpbmcgdXAvZG93biBhcnJvd3MgdXNlciBjYW4gc2VsZWN0IGVsZW1lbnRzIGZyb20gdG9wIG9mIHRoZVxuXHRcdC8vIHNlbGVjdGVkIGVsZW1lbnRcbiAgICB0aGlzLiQoZG9jdW1lbnQpLmJpbmQoJ2tleWRvd24uc2VsZWN0aW9uTWFuaXB1bGF0aW9uJywgZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHQvLyBzZWxlY3QgY2hpbGQgQ1xuICAgICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDY3KSB7XG4gICAgICAgIHRoaXMuYW5pbWF0ZUNsaWNrZWRLZXkodGhpcy4kKCcjLXNlbGVjdG9yLXRvb2xiYXIgLmtleS1idXR0b24tY2hpbGQnKSlcbiAgICAgICAgdGhpcy5zZWxlY3RDaGlsZCgpXG4gICAgICB9XG5cdFx0XHQvLyBzZWxlY3QgcGFyZW50IFBcbiAgICAgIGVsc2UgaWYgKGV2ZW50LmtleUNvZGUgPT09IDgwKSB7XG4gICAgICAgIHRoaXMuYW5pbWF0ZUNsaWNrZWRLZXkodGhpcy4kKCcjLXNlbGVjdG9yLXRvb2xiYXIgLmtleS1idXR0b24tcGFyZW50JykpXG4gICAgICAgIHRoaXMuc2VsZWN0UGFyZW50KClcbiAgICAgIH1cblx0XHRcdC8vIHNlbGVjdCBlbGVtZW50XG4gICAgICBlbHNlIGlmIChldmVudC5rZXlDb2RlID09PSA4Mykge1xuICAgICAgICB0aGlzLmFuaW1hdGVDbGlja2VkS2V5KHRoaXMuJCgnIy1zZWxlY3Rvci10b29sYmFyIC5rZXktYnV0dG9uLXNlbGVjdCcpKVxuICAgICAgICB0aGlzLnNlbGVjdE1vdXNlT3ZlckVsZW1lbnQoKVxuICAgICAgfVxuXG4gICAgICB0aGlzLmhpZ2hsaWdodFNlbGVjdGVkRWxlbWVudHMoKVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcblxuICBhbmltYXRlQ2xpY2tlZEtleTogZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICB0aGlzLiQoZWxlbWVudCkucmVtb3ZlQ2xhc3MoJ2NsaWNrZWQnKS5yZW1vdmVDbGFzcygnY2xpY2tlZC1hbmltYXRpb24nKVxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy4kKGVsZW1lbnQpLmFkZENsYXNzKCdjbGlja2VkJylcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLiQoZWxlbWVudCkuYWRkQ2xhc3MoJ2NsaWNrZWQtYW5pbWF0aW9uJylcbiAgICAgIH0sIDEwMClcbiAgICB9LCAxKVxuICB9LFxuXG4gIGhpZ2hsaWdodFNlbGVjdGVkRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIHRyeSB7XG4gICAgICB2YXIgcmVzdWx0Q3NzU2VsZWN0b3IgPSB0aGlzLmdldEN1cnJlbnRDU1NTZWxlY3RvcigpXG5cbiAgICAgICQoJ2JvZHkgIy1zZWxlY3Rvci10b29sYmFyIC5zZWxlY3RvcicpLnRleHQocmVzdWx0Q3NzU2VsZWN0b3IpXG5cdFx0XHQvLyBoaWdobGlnaHQgc2VsZWN0ZWQgZWxlbWVudHNcbiAgICAgICQoJy4tc2l0ZW1hcC1zZWxlY3QtaXRlbS1zZWxlY3RlZCcpLnJlbW92ZUNsYXNzKCctc2l0ZW1hcC1zZWxlY3QtaXRlbS1zZWxlY3RlZCcpXG4gICAgICAkKEVsZW1lbnRRdWVyeShyZXN1bHRDc3NTZWxlY3RvciwgdGhpcy5wYXJlbnQsIHskfSkpLmFkZENsYXNzKCctc2l0ZW1hcC1zZWxlY3QtaXRlbS1zZWxlY3RlZCcpXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAoZXJyID09PSAnZm91bmQgbXVsdGlwbGUgZWxlbWVudCBncm91cHMsIGJ1dCBhbGxvd011bHRpcGxlU2VsZWN0b3JzIGRpc2FibGVkJykge1xuICAgICAgICBjb25zb2xlLmxvZygnbXVsdGlwbGUgZGlmZmVyZW50IGVsZW1lbnQgc2VsZWN0aW9uIGRpc2FibGVkJylcblxuICAgICAgICB0aGlzLnNob3dNdWx0aXBsZUdyb3VwUG9wdXAoKVxuXHRcdFx0XHQvLyByZW1vdmUgbGFzdCBhZGRlZCBlbGVtZW50XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50cy5wb3AoKVxuICAgICAgICB0aGlzLmhpZ2hsaWdodFNlbGVjdGVkRWxlbWVudHMoKVxuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBzaG93TXVsdGlwbGVHcm91cFBvcHVwOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKCcjLXNlbGVjdG9yLXRvb2xiYXIgLnBvcG92ZXInKS5hdHRyKCdzdHlsZScsICdkaXNwbGF5OmJsb2NrICFpbXBvcnRhbnQ7JylcbiAgfSxcblxuICBoaWRlTXVsdGlwbGVHcm91cFBvcHVwOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKCcjLXNlbGVjdG9yLXRvb2xiYXIgLnBvcG92ZXInKS5hdHRyKCdzdHlsZScsICcnKVxuICB9LFxuXG4gIGJpbmRNdWx0aXBsZUdyb3VwUG9wdXBIaWRlOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKCcjLXNlbGVjdG9yLXRvb2xiYXIgLnBvcG92ZXIgLmNsb3NlJykuY2xpY2sodGhpcy5oaWRlTXVsdGlwbGVHcm91cFBvcHVwLmJpbmQodGhpcykpXG4gIH0sXG5cbiAgdW5iaW5kTXVsdGlwbGVHcm91cFBvcHVwSGlkZTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJCgnIy1zZWxlY3Rvci10b29sYmFyIC5wb3BvdmVyIC5jbG9zZScpLnVuYmluZCgnY2xpY2snKVxuICB9LFxuXG4gIGJpbmRNdWx0aXBsZUdyb3VwQ2hlY2tib3g6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoJyMtc2VsZWN0b3ItdG9vbGJhciBbbmFtZT1kaWZlcmVudEVsZW1lbnRTZWxlY3Rpb25dJykuY2hhbmdlKGZ1bmN0aW9uIChlKSB7XG4gICAgICBpZiAodGhpcy4kKGUuY3VycmVudFRhcmdldCkuaXMoJzpjaGVja2VkJykpIHtcbiAgICAgICAgdGhpcy5pbml0Q3NzU2VsZWN0b3IodHJ1ZSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuaW5pdENzc1NlbGVjdG9yKGZhbHNlKVxuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcbiAgdW5iaW5kTXVsdGlwbGVHcm91cENoZWNrYm94OiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKCcjLXNlbGVjdG9yLXRvb2xiYXIgLmRpZmVyZW50RWxlbWVudFNlbGVjdGlvbicpLnVuYmluZCgnY2hhbmdlJylcbiAgfSxcblxuICBhdHRhY2hUb29sYmFyOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyICR0b29sYmFyID0gJzxkaXYgaWQ9XCItc2VsZWN0b3ItdG9vbGJhclwiPicgK1xuXHRcdFx0JzxkaXYgY2xhc3M9XCJsaXN0LWl0ZW1cIj48ZGl2IGNsYXNzPVwic2VsZWN0b3ItY29udGFpbmVyXCI+PGRpdiBjbGFzcz1cInNlbGVjdG9yXCI+PC9kaXY+PC9kaXY+PC9kaXY+JyArXG5cdFx0XHQnPGRpdiBjbGFzcz1cImlucHV0LWdyb3VwLWFkZG9uIGxpc3QtaXRlbVwiPicgK1xuXHRcdFx0XHQnPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIHRpdGxlPVwiRW5hYmxlIGRpZmZlcmVudCB0eXBlIGVsZW1lbnQgc2VsZWN0aW9uXCIgbmFtZT1cImRpZmVyZW50RWxlbWVudFNlbGVjdGlvblwiPicgK1xuXHRcdFx0XHQnPGRpdiBjbGFzcz1cInBvcG92ZXIgdG9wXCI+JyArXG5cdFx0XHRcdCc8ZGl2IGNsYXNzPVwiY2xvc2VcIj7DlzwvZGl2PicgK1xuXHRcdFx0XHQnPGRpdiBjbGFzcz1cImFycm93XCI+PC9kaXY+JyArXG5cdFx0XHRcdCc8ZGl2IGNsYXNzPVwicG9wb3Zlci1jb250ZW50XCI+JyArXG5cdFx0XHRcdCc8ZGl2IGNsYXNzPVwidHh0XCI+JyArXG5cdFx0XHRcdCdEaWZmZXJlbnQgdHlwZSBlbGVtZW50IHNlbGVjdGlvbiBpcyBkaXNhYmxlZC4gSWYgdGhlIGVsZW1lbnQgJyArXG5cdFx0XHRcdCd5b3UgY2xpY2tlZCBzaG91bGQgYWxzbyBiZSBpbmNsdWRlZCB0aGVuIGVuYWJsZSB0aGlzIGFuZCAnICtcblx0XHRcdFx0J2NsaWNrIG9uIHRoZSBlbGVtZW50IGFnYWluLiBVc3VhbGx5IHRoaXMgaXMgbm90IG5lZWRlZC4nICtcblx0XHRcdFx0JzwvZGl2PicgK1xuXHRcdFx0XHQnPC9kaXY+JyArXG5cdFx0XHRcdCc8L2Rpdj4nICtcblx0XHRcdCc8L2Rpdj4nICtcblx0XHRcdCc8ZGl2IGNsYXNzPVwibGlzdC1pdGVtIGtleS1ldmVudHNcIj48ZGl2IHRpdGxlPVwiQ2xpY2sgaGVyZSB0byBlbmFibGUga2V5IHByZXNzIGV2ZW50cyBmb3Igc2VsZWN0aW9uXCI+RW5hYmxlIGtleSBldmVudHM8L2Rpdj48L2Rpdj4nICtcblx0XHRcdCc8ZGl2IGNsYXNzPVwibGlzdC1pdGVtIGtleS1idXR0b24ga2V5LWJ1dHRvbi1zZWxlY3QgaGlkZVwiIHRpdGxlPVwiVXNlIFMga2V5IHRvIHNlbGVjdCBlbGVtZW50XCI+UzwvZGl2PicgK1xuXHRcdFx0JzxkaXYgY2xhc3M9XCJsaXN0LWl0ZW0ga2V5LWJ1dHRvbiBrZXktYnV0dG9uLXBhcmVudCBoaWRlXCIgdGl0bGU9XCJVc2UgUCBrZXkgdG8gc2VsZWN0IHBhcmVudFwiPlA8L2Rpdj4nICtcblx0XHRcdCc8ZGl2IGNsYXNzPVwibGlzdC1pdGVtIGtleS1idXR0b24ga2V5LWJ1dHRvbi1jaGlsZCBoaWRlXCIgdGl0bGU9XCJVc2UgQyBrZXkgdG8gc2VsZWN0IGNoaWxkXCI+QzwvZGl2PicgK1xuXHRcdFx0JzxkaXYgY2xhc3M9XCJsaXN0LWl0ZW0gZG9uZS1zZWxlY3RpbmctYnV0dG9uXCI+RG9uZSBzZWxlY3RpbmchPC9kaXY+JyArXG5cdFx0XHQnPC9kaXY+J1xuICAgIHRoaXMuJCgnYm9keScpLmFwcGVuZCgkdG9vbGJhcilcblxuICAgIHRoaXMuJCgnYm9keSAjLXNlbGVjdG9yLXRvb2xiYXIgLmRvbmUtc2VsZWN0aW5nLWJ1dHRvbicpLmNsaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuc2VsZWN0aW9uRmluaXNoZWQoKVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcbiAgaGlnaGxpZ2h0UGFyZW50OiBmdW5jdGlvbiAoKSB7XG5cdFx0Ly8gZG8gbm90IGhpZ2hsaWdodCBwYXJlbnQgaWYgaXRzIHRoZSBib2R5XG4gICAgaWYgKCF0aGlzLiQodGhpcy5wYXJlbnQpLmlzKCdib2R5JykgJiYgIXRoaXMuJCh0aGlzLnBhcmVudCkuaXMoJyN3ZWJwYWdlJykpIHtcbiAgICAgIHRoaXMuJCh0aGlzLnBhcmVudCkuYWRkQ2xhc3MoJy1zaXRlbWFwLXBhcmVudCcpXG4gICAgfVxuICB9LFxuXG4gIHVuYmluZEVsZW1lbnRTZWxlY3Rpb246IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQodGhpcy4kYWxsRWxlbWVudHMpLnVuYmluZCgnY2xpY2suZWxlbWVudFNlbGVjdG9yJylcblx0XHQvLyByZW1vdmUgaGlnaGxpZ2h0ZWQgZWxlbWVudCBjbGFzc2VzXG4gICAgdGhpcy51bmJpbmRFbGVtZW50U2VsZWN0aW9uSGlnaGxpZ2h0KClcbiAgfSxcbiAgdW5iaW5kRWxlbWVudFNlbGVjdGlvbkhpZ2hsaWdodDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJCgnLi1zaXRlbWFwLXNlbGVjdC1pdGVtLXNlbGVjdGVkJykucmVtb3ZlQ2xhc3MoJy1zaXRlbWFwLXNlbGVjdC1pdGVtLXNlbGVjdGVkJylcbiAgICB0aGlzLiQoJy4tc2l0ZW1hcC1wYXJlbnQnKS5yZW1vdmVDbGFzcygnLXNpdGVtYXAtcGFyZW50JylcbiAgfSxcbiAgdW5iaW5kRWxlbWVudEhpZ2hsaWdodDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJCh0aGlzLiRhbGxFbGVtZW50cykudW5iaW5kKCdtb3VzZW92ZXIuZWxlbWVudFNlbGVjdG9yJylcblx0XHRcdC51bmJpbmQoJ21vdXNlb3V0LmVsZW1lbnRTZWxlY3RvcicpXG4gIH0sXG4gIHVuYmluZEtleWJvYXJkU2VsZWN0aW9uTWFpcHVsYXRpb3M6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoZG9jdW1lbnQpLnVuYmluZCgna2V5ZG93bi5zZWxlY3Rpb25NYW5pcHVsYXRpb24nKVxuICAgIGNsZWFySW50ZXJ2YWwodGhpcy5rZXlQcmVzc0ZvY3VzSW50ZXJ2YWwpXG4gIH0sXG4gIHJlbW92ZVRvb2xiYXI6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoJ2JvZHkgIy1zZWxlY3Rvci10b29sYmFyIGEnKS51bmJpbmQoJ2NsaWNrJylcbiAgICB0aGlzLiQoJyMtc2VsZWN0b3ItdG9vbGJhcicpLnJlbW92ZSgpXG4gIH0sXG5cblx0LyoqXG5cdCAqIFJlbW92ZSB0b29sYmFyIGFuZCB1bmJpbmQgZXZlbnRzXG5cdCAqL1xuICByZW1vdmVHVUk6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnVuYmluZEVsZW1lbnRTZWxlY3Rpb24oKVxuICAgIHRoaXMudW5iaW5kRWxlbWVudEhpZ2hsaWdodCgpXG4gICAgdGhpcy51bmJpbmRLZXlib2FyZFNlbGVjdGlvbk1haXB1bGF0aW9zKClcbiAgICB0aGlzLnVuYmluZE11bHRpcGxlR3JvdXBQb3B1cEhpZGUoKVxuICAgIHRoaXMudW5iaW5kTXVsdGlwbGVHcm91cENoZWNrYm94KClcbiAgICB0aGlzLnVuYmluZE1vdmVJbWFnZXNUb1RvcCgpXG4gICAgdGhpcy5yZW1vdmVUb29sYmFyKClcbiAgfSxcblxuICBzZWxlY3Rpb25GaW5pc2hlZDogZnVuY3Rpb24gKCkge1xuICAgIHZhciByZXN1bHRDc3NTZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudENTU1NlbGVjdG9yKClcblxuICAgIHRoaXMuZGVmZXJyZWRDU1NTZWxlY3RvclJlc3BvbnNlLnJlc29sdmUoe1xuICAgICAgQ1NTU2VsZWN0b3I6IHJlc3VsdENzc1NlbGVjdG9yXG4gICAgfSlcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnRTZWxlY3RvclxuIiwidmFyIHNlbGVjdG9ycyA9IHJlcXVpcmUoJy4vU2VsZWN0b3JzJylcbnZhciBTZWxlY3RvciA9IHJlcXVpcmUoJy4vU2VsZWN0b3InKVxudmFyIFNlbGVjdG9yVGFibGUgPSBzZWxlY3RvcnMuU2VsZWN0b3JUYWJsZVxudmFyIFNpdGVtYXAgPSByZXF1aXJlKCcuL1NpdGVtYXAnKVxuLy8gdmFyIFNlbGVjdG9yR3JhcGh2MiA9IHJlcXVpcmUoJy4vU2VsZWN0b3JHcmFwaHYyJylcbnZhciBnZXRCYWNrZ3JvdW5kU2NyaXB0ID0gcmVxdWlyZSgnLi9nZXRCYWNrZ3JvdW5kU2NyaXB0JylcbnZhciBnZXRDb250ZW50U2NyaXB0ID0gcmVxdWlyZSgnLi9nZXRDb250ZW50U2NyaXB0JylcbnZhciBTaXRlbWFwQ29udHJvbGxlciA9IGZ1bmN0aW9uIChvcHRpb25zLCBtb3JlT3B0aW9ucykge1xuICB0aGlzLiQgPSBtb3JlT3B0aW9ucy4kXG50aGlzLmRvY3VtZW50ID0gbW9yZU9wdGlvbnMuZG9jdW1lbnRcbnRoaXMud2luZG93ID0gbW9yZU9wdGlvbnMud2luZG93XG4gIGlmICghdGhpcy4kKSB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcganF1ZXJ5IGluIENvbnRyb2xsZXInKVxuaWYgKCF0aGlzLmRvY3VtZW50KSB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIGRvY3VtZW50XCIpXG5pZighdGhpcy53aW5kb3cpdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB3aW5kb3dcIilcbiAgZm9yICh2YXIgaSBpbiBvcHRpb25zKSB7XG4gICAgdGhpc1tpXSA9IG9wdGlvbnNbaV1cbiAgfVxuICB0aGlzLmluaXQoKVxufVxuXG5TaXRlbWFwQ29udHJvbGxlci5wcm90b3R5cGUgPSB7XG5cbiAgYmFja2dyb3VuZFNjcmlwdDogZ2V0QmFja2dyb3VuZFNjcmlwdCgnRGV2VG9vbHMnKSxcbiAgY29udGVudFNjcmlwdDogZ2V0Q29udGVudFNjcmlwdCgnRGV2VG9vbHMnKSxcblxuICBjb250cm9sOiBmdW5jdGlvbiAoY29udHJvbHMpIHtcbiAgICB2YXIgY29udHJvbGxlciA9IHRoaXNcblxuICAgIGZvciAodmFyIHNlbGVjdG9yIGluIGNvbnRyb2xzKSB7XG4gICAgICBmb3IgKHZhciBldmVudCBpbiBjb250cm9sc1tzZWxlY3Rvcl0pIHtcbiAgICAgICAgdGhpcy4kKGRvY3VtZW50KS5vbihldmVudCwgc2VsZWN0b3IsIChmdW5jdGlvbiAoc2VsZWN0b3IsIGV2ZW50KSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBjb250aW51ZUJ1YmJsaW5nID0gY29udHJvbHNbc2VsZWN0b3JdW2V2ZW50XS5jYWxsKGNvbnRyb2xsZXIsIHRoaXMpXG4gICAgICAgICAgICBpZiAoY29udGludWVCdWJibGluZyAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pKHNlbGVjdG9yLCBldmVudCkpXG4gICAgICB9XG4gICAgfVxuICB9LFxuXG5cdC8qKlxuXHQgKiBMb2FkcyB0ZW1wbGF0ZXMgZm9yIElDYW5IYXpcblx0ICovXG4gIGxvYWRUZW1wbGF0ZXM6IGZ1bmN0aW9uIChjYkFsbFRlbXBsYXRlc0xvYWRlZCkge1xuICAgIHZhciB0ZW1wbGF0ZUlkcyA9IFtcbiAgICAgICdWaWV3cG9ydCcsXG4gICAgICAnU2l0ZW1hcExpc3QnLFxuICAgICAgJ1NpdGVtYXBMaXN0SXRlbScsXG4gICAgICAnU2l0ZW1hcENyZWF0ZScsXG4gICAgICAnU2l0ZW1hcFN0YXJ0VXJsRmllbGQnLFxuICAgICAgJ1NpdGVtYXBJbXBvcnQnLFxuICAgICAgJ1NpdGVtYXBFeHBvcnQnLFxuICAgICAgJ1NpdGVtYXBCcm93c2VEYXRhJyxcbiAgICAgICdTaXRlbWFwU2NyYXBlQ29uZmlnJyxcbiAgICAgICdTaXRlbWFwRXhwb3J0RGF0YUNTVicsXG4gICAgICAnU2l0ZW1hcEVkaXRNZXRhZGF0YScsXG4gICAgICAnU2VsZWN0b3JMaXN0JyxcbiAgICAgICdTZWxlY3Rvckxpc3RJdGVtJyxcbiAgICAgICdTZWxlY3RvckVkaXQnLFxuICAgICAgJ1NlbGVjdG9yRWRpdFRhYmxlQ29sdW1uJyxcbiAgICAgIC8vICdTaXRlbWFwU2VsZWN0b3JHcmFwaCcsXG4gICAgICAnRGF0YVByZXZpZXcnXG4gICAgXVxuICAgIHZhciB0ZW1wbGF0ZXNMb2FkZWQgPSAwXG4gICAgdmFyIGNiTG9hZGVkID0gZnVuY3Rpb24gKHRlbXBsYXRlSWQsIHRlbXBsYXRlKSB7XG4gICAgICB0ZW1wbGF0ZXNMb2FkZWQrK1xuICAgICAgaWNoLmFkZFRlbXBsYXRlKHRlbXBsYXRlSWQsIHRlbXBsYXRlKVxuICAgICAgaWYgKHRlbXBsYXRlc0xvYWRlZCA9PT0gdGVtcGxhdGVJZHMubGVuZ3RoKSB7XG4gICAgICAgIGNiQWxsVGVtcGxhdGVzTG9hZGVkKClcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0ZW1wbGF0ZUlkcy5mb3JFYWNoKGZ1bmN0aW9uICh0ZW1wbGF0ZUlkKSB7XG4gICAgICB0aGlzLiQuZ2V0KHRoaXMudGVtcGxhdGVEaXIgKyB0ZW1wbGF0ZUlkICsgJy5odG1sJywgY2JMb2FkZWQuYmluZCh0aGlzLCB0ZW1wbGF0ZUlkKSlcbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG5cbiAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMubG9hZFRlbXBsYXRlcyhmdW5jdGlvbiAoKSB7XG5cdFx0XHQvLyBjdXJyZW50bHkgdmlld2VkIG9iamVjdHNcbiAgICAgIHRoaXMuY2xlYXJTdGF0ZSgpXG5cblx0XHRcdC8vIHJlbmRlciBtYWluIHZpZXdwb3J0XG4gICAgICBpY2guVmlld3BvcnQoKS5hcHBlbmRUbygnYm9keScpXG5cblx0XHRcdC8vIGNhbmNlbCBhbGwgZm9ybSBzdWJtaXRzXG4gICAgICB0aGlzLiQoJ2Zvcm0nKS5iaW5kKCdzdWJtaXQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfSlcblxuICAgICAgdGhpcy5jb250cm9sKHtcbiAgICAgICAgJyNzaXRlbWFwcy1uYXYtYnV0dG9uJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNob3dTaXRlbWFwc1xuICAgICAgICB9LFxuICAgICAgICAnI2NyZWF0ZS1zaXRlbWFwLWNyZWF0ZS1uYXYtYnV0dG9uJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNob3dDcmVhdGVTaXRlbWFwXG4gICAgICAgIH0sXG4gICAgICAgICcjY3JlYXRlLXNpdGVtYXAtaW1wb3J0LW5hdi1idXR0b24nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2hvd0ltcG9ydFNpdGVtYXBQYW5lbFxuICAgICAgICB9LFxuICAgICAgICAnI3NpdGVtYXAtZXhwb3J0LW5hdi1idXR0b24nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2hvd1NpdGVtYXBFeHBvcnRQYW5lbFxuICAgICAgICB9LFxuICAgICAgICAnI3NpdGVtYXAtZXhwb3J0LWRhdGEtY3N2LW5hdi1idXR0b24nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2hvd1NpdGVtYXBFeHBvcnREYXRhQ3N2UGFuZWxcbiAgICAgICAgfSxcbiAgICAgICAgJyNzdWJtaXQtY3JlYXRlLXNpdGVtYXAnOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuY3JlYXRlU2l0ZW1hcFxuICAgICAgICB9LFxuICAgICAgICAnI3N1Ym1pdC1pbXBvcnQtc2l0ZW1hcCc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5pbXBvcnRTaXRlbWFwXG4gICAgICAgIH0sXG4gICAgICAgICcjc2l0ZW1hcC1lZGl0LW1ldGFkYXRhLW5hdi1idXR0b24nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuZWRpdFNpdGVtYXBNZXRhZGF0YVxuICAgICAgICB9LFxuICAgICAgICAnI3NpdGVtYXAtc2VsZWN0b3ItbGlzdC1uYXYtYnV0dG9uJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNob3dTaXRlbWFwU2VsZWN0b3JMaXN0XG4gICAgICAgIH0sIC8qLCAgICAgICAgJyNzaXRlbWFwLXNlbGVjdG9yLWdyYXBoLW5hdi1idXR0b24nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2hvd1NpdGVtYXBTZWxlY3RvckdyYXBoXG4gICAgICAgIH0gKi9cbiAgICAgICAgJyNzaXRlbWFwLWJyb3dzZS1uYXYtYnV0dG9uJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLmJyb3dzZVNpdGVtYXBEYXRhXG4gICAgICAgIH0sXG4gICAgICAgICdidXR0b24jc3VibWl0LWVkaXQtc2l0ZW1hcCc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5lZGl0U2l0ZW1hcE1ldGFkYXRhU2F2ZVxuICAgICAgICB9LFxuICAgICAgICAnI2VkaXQtc2l0ZW1hcC1tZXRhZGF0YS1mb3JtJzoge1xuICAgICAgICAgIHN1Ym1pdDogZnVuY3Rpb24gKCkgeyByZXR1cm4gZmFsc2UgfVxuICAgICAgICB9LFxuICAgICAgICAnI3NpdGVtYXBzIHRyJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLmVkaXRTaXRlbWFwXG4gICAgICAgIH0sXG4gICAgICAgICcjc2l0ZW1hcHMgYnV0dG9uW2FjdGlvbj1kZWxldGUtc2l0ZW1hcF0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuZGVsZXRlU2l0ZW1hcFxuICAgICAgICB9LFxuICAgICAgICAnI3NpdGVtYXAtc2NyYXBlLW5hdi1idXR0b24nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2hvd1NjcmFwZVNpdGVtYXBDb25maWdQYW5lbFxuICAgICAgICB9LFxuICAgICAgICAnI3N1Ym1pdC1zY3JhcGUtc2l0ZW1hcC1mb3JtJzoge1xuICAgICAgICAgIHN1Ym1pdDogZnVuY3Rpb24gKCkgeyByZXR1cm4gZmFsc2UgfVxuICAgICAgICB9LFxuICAgICAgICAnI3N1Ym1pdC1zY3JhcGUtc2l0ZW1hcCc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5zY3JhcGVTaXRlbWFwXG4gICAgICAgIH0sXG4gICAgICAgICcjc2l0ZW1hcHMgYnV0dG9uW2FjdGlvbj1icm93c2Utc2l0ZW1hcC1kYXRhXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5zaXRlbWFwTGlzdEJyb3dzZVNpdGVtYXBEYXRhXG4gICAgICAgIH0sXG4gICAgICAgICcjc2l0ZW1hcHMgYnV0dG9uW2FjdGlvbj1jc3YtZG93bmxvYWQtc2l0ZW1hcC1kYXRhXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5kb3dubG9hZFNpdGVtYXBEYXRhXG4gICAgICAgIH0sXG5cdFx0XHRcdC8vIEBUT0RPIG1vdmUgdG8gdHJcbiAgICAgICAgJyNzZWxlY3Rvci10cmVlIHRib2R5IHRyJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNob3dDaGlsZFNlbGVjdG9yc1xuICAgICAgICB9LFxuICAgICAgICAnI3NlbGVjdG9yLXRyZWUgLmJyZWFkY3J1bWIgYSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy50cmVlTmF2aWdhdGlvbnNob3dTaXRlbWFwU2VsZWN0b3JMaXN0XG4gICAgICAgIH0sXG4gICAgICAgICcjc2VsZWN0b3ItdHJlZSB0ciBidXR0b25bYWN0aW9uPWVkaXQtc2VsZWN0b3JdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLmVkaXRTZWxlY3RvclxuICAgICAgICB9LFxuICAgICAgICAnI2VkaXQtc2VsZWN0b3Igc2VsZWN0W25hbWU9dHlwZV0nOiB7XG4gICAgICAgICAgY2hhbmdlOiB0aGlzLnNlbGVjdG9yVHlwZUNoYW5nZWRcbiAgICAgICAgfSxcbiAgICAgICAgJyNlZGl0LXNlbGVjdG9yIGJ1dHRvblthY3Rpb249c2F2ZS1zZWxlY3Rvcl0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2F2ZVNlbGVjdG9yXG4gICAgICAgIH0sXG4gICAgICAgICcjZWRpdC1zZWxlY3RvciBidXR0b25bYWN0aW9uPWNhbmNlbC1zZWxlY3Rvci1lZGl0aW5nXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5jYW5jZWxTZWxlY3RvckVkaXRpbmdcbiAgICAgICAgfSxcbiAgICAgICAgJyNlZGl0LXNlbGVjdG9yICNzZWxlY3RvcklkJzoge1xuICAgICAgICAgIGtleXVwOiB0aGlzLnVwZGF0ZVNlbGVjdG9yUGFyZW50TGlzdE9uSWRDaGFuZ2VcbiAgICAgICAgfSxcbiAgICAgICAgJyNzZWxlY3Rvci10cmVlIGJ1dHRvblthY3Rpb249YWRkLXNlbGVjdG9yXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5hZGRTZWxlY3RvclxuICAgICAgICB9LFxuICAgICAgICAnI3NlbGVjdG9yLXRyZWUgdHIgYnV0dG9uW2FjdGlvbj1kZWxldGUtc2VsZWN0b3JdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLmRlbGV0ZVNlbGVjdG9yXG4gICAgICAgIH0sXG4gICAgICAgICcjc2VsZWN0b3ItdHJlZSB0ciBidXR0b25bYWN0aW9uPXByZXZpZXctc2VsZWN0b3JdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnByZXZpZXdTZWxlY3RvckZyb21TZWxlY3RvclRyZWVcbiAgICAgICAgfSxcbiAgICAgICAgJyNzZWxlY3Rvci10cmVlIHRyIGJ1dHRvblthY3Rpb249ZGF0YS1wcmV2aWV3LXNlbGVjdG9yXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5wcmV2aWV3U2VsZWN0b3JEYXRhRnJvbVNlbGVjdG9yVHJlZVxuICAgICAgICB9LFxuICAgICAgICAnI2VkaXQtc2VsZWN0b3IgYnV0dG9uW2FjdGlvbj1zZWxlY3Qtc2VsZWN0b3JdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNlbGVjdFNlbGVjdG9yXG4gICAgICAgIH0sXG4gICAgICAgICcjZWRpdC1zZWxlY3RvciBidXR0b25bYWN0aW9uPXNlbGVjdC10YWJsZS1oZWFkZXItcm93LXNlbGVjdG9yXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5zZWxlY3RUYWJsZUhlYWRlclJvd1NlbGVjdG9yXG4gICAgICAgIH0sXG4gICAgICAgICcjZWRpdC1zZWxlY3RvciBidXR0b25bYWN0aW9uPXNlbGVjdC10YWJsZS1kYXRhLXJvdy1zZWxlY3Rvcl0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2VsZWN0VGFibGVEYXRhUm93U2VsZWN0b3JcbiAgICAgICAgfSxcbiAgICAgICAgJyNlZGl0LXNlbGVjdG9yIGJ1dHRvblthY3Rpb249cHJldmlldy1zZWxlY3Rvcl0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMucHJldmlld1NlbGVjdG9yXG4gICAgICAgIH0sXG4gICAgICAgICcjZWRpdC1zZWxlY3RvciBidXR0b25bYWN0aW9uPXByZXZpZXctY2xpY2stZWxlbWVudC1zZWxlY3Rvcl0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMucHJldmlld0NsaWNrRWxlbWVudFNlbGVjdG9yXG4gICAgICAgIH0sXG4gICAgICAgICcjZWRpdC1zZWxlY3RvciBidXR0b25bYWN0aW9uPXByZXZpZXctdGFibGUtcm93LXNlbGVjdG9yXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5wcmV2aWV3VGFibGVSb3dTZWxlY3RvclxuICAgICAgICB9LFxuICAgICAgICAnI2VkaXQtc2VsZWN0b3IgYnV0dG9uW2FjdGlvbj1wcmV2aWV3LXNlbGVjdG9yLWRhdGFdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnByZXZpZXdTZWxlY3RvckRhdGFGcm9tU2VsZWN0b3JFZGl0aW5nXG4gICAgICAgIH0sXG4gICAgICAgICdidXR0b24uYWRkLWV4dHJhLXN0YXJ0LXVybCc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5hZGRTdGFydFVybFxuICAgICAgICB9LFxuICAgICAgICAnYnV0dG9uLnJlbW92ZS1zdGFydC11cmwnOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMucmVtb3ZlU3RhcnRVcmxcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIHRoaXMuc2hvd1NpdGVtYXBzKClcbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG5cbiAgY2xlYXJTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc3RhdGUgPSB7XG5cdFx0XHQvLyBzaXRlbWFwIHRoYXQgaXMgY3VycmVudGx5IG9wZW5cbiAgICAgIGN1cnJlbnRTaXRlbWFwOiBudWxsLFxuXHRcdFx0Ly8gc2VsZWN0b3IgaWRzIHRoYXQgYXJlIHNob3duIGluIHRoZSBuYXZpZ2F0aW9uXG4gICAgICBlZGl0U2l0ZW1hcEJyZWFkY3VtYnNTZWxlY3RvcnM6IG51bGwsXG4gICAgICBjdXJyZW50UGFyZW50U2VsZWN0b3JJZDogbnVsbCxcbiAgICAgIGN1cnJlbnRTZWxlY3RvcjogbnVsbFxuICAgIH1cbiAgfSxcblxuICBzZXRTdGF0ZUVkaXRTaXRlbWFwOiBmdW5jdGlvbiAoc2l0ZW1hcCkge1xuICAgIHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXAgPSBzaXRlbWFwXG4gICAgdGhpcy5zdGF0ZS5lZGl0U2l0ZW1hcEJyZWFkY3VtYnNTZWxlY3RvcnMgPSBbXG5cdFx0XHR7aWQ6ICdfcm9vdCd9XG4gICAgXVxuICAgIHRoaXMuc3RhdGUuY3VycmVudFBhcmVudFNlbGVjdG9ySWQgPSAnX3Jvb3QnXG4gIH0sXG5cbiAgc2V0QWN0aXZlTmF2aWdhdGlvbkJ1dHRvbjogZnVuY3Rpb24gKG5hdmlnYXRpb25JZCkge1xuICAgIHRoaXMuJCgnLm5hdiAuYWN0aXZlJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpXG4gICAgdGhpcy4kKCcjJyArIG5hdmlnYXRpb25JZCArICctbmF2LWJ1dHRvbicpLmNsb3Nlc3QoJ2xpJykuYWRkQ2xhc3MoJ2FjdGl2ZScpXG5cbiAgICBpZiAobmF2aWdhdGlvbklkLm1hdGNoKC9ec2l0ZW1hcC0vKSkge1xuICAgICAgdGhpcy4kKCcjc2l0ZW1hcC1uYXYtYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJylcbiAgICAgIHRoaXMuJCgnI3NpdGVtYXAtbmF2LWJ1dHRvbicpLmNsb3Nlc3QoJ2xpJykuYWRkQ2xhc3MoJ2FjdGl2ZScpXG4gICAgICB0aGlzLiQoJyNuYXZiYXItYWN0aXZlLXNpdGVtYXAtaWQnKS50ZXh0KCcoJyArIHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXAuX2lkICsgJyknKVxuICAgIH1cdFx0ZWxzZSB7XG4gICAgICB0aGlzLiQoJyNzaXRlbWFwLW5hdi1idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgdGhpcy4kKCcjbmF2YmFyLWFjdGl2ZS1zaXRlbWFwLWlkJykudGV4dCgnJylcbiAgICB9XG5cbiAgICBpZiAobmF2aWdhdGlvbklkLm1hdGNoKC9eY3JlYXRlLXNpdGVtYXAtLykpIHtcbiAgICAgIHRoaXMuJCgnI2NyZWF0ZS1zaXRlbWFwLW5hdi1idXR0b24nKS5jbG9zZXN0KCdsaScpLmFkZENsYXNzKCdhY3RpdmUnKVxuICAgIH1cbiAgfSxcblxuXHQvKipcblx0ICogU2ltcGxlIGluZm8gcG9wdXAgZm9yIHNpdGVtYXAgc3RhcnQgdXJsIGlucHV0IGZpZWxkXG5cdCAqL1xuICBpbml0TXVsdGlwbGVTdGFydFVybEhlbHBlcjogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJCgnI3N0YXJ0VXJsJylcblx0XHRcdC5wb3BvdmVyKHtcbiAgdGl0bGU6ICdNdWx0aXBsZSBzdGFydCB1cmxzJyxcbiAgaHRtbDogdHJ1ZSxcbiAgY29udGVudDogJ1lvdSBjYW4gY3JlYXRlIHJhbmdlZCBzdGFydCB1cmxzIGxpa2UgdGhpczo8YnIgLz5odHRwOi8vZXhhbXBsZS5jb20vWzEtMTAwXS5odG1sJyxcbiAgcGxhY2VtZW50OiAnYm90dG9tJ1xufSlcblx0XHRcdC5ibHVyKGZ1bmN0aW9uICgpIHtcbiAgdGhpcy4kKHRoaXMpLnBvcG92ZXIoJ2hpZGUnKVxufSlcbiAgfSxcblxuXHQvKipcblx0ICogUmV0dXJucyBib290c3RyYXBWYWxpZGF0b3Igb2JqZWN0IGZvciBjdXJyZW50IGZvcm0gaW4gdmlld3BvcnRcblx0ICovXG4gIGdldEZvcm1WYWxpZGF0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdmFsaWRhdG9yID0gdGhpcy4kKCcjdmlld3BvcnQgZm9ybScpLmRhdGEoJ2Jvb3RzdHJhcFZhbGlkYXRvcicpXG4gICAgcmV0dXJuIHZhbGlkYXRvclxuICB9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIHdoZXRoZXIgY3VycmVudCBmb3JtIGluIHRoZSB2aWV3cG9ydCBpcyB2YWxpZFxuXHQgKiBAcmV0dXJucyB7Qm9vbGVhbn1cblx0ICovXG4gIGlzVmFsaWRGb3JtOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHZhbGlkYXRvciA9IHRoaXMuZ2V0Rm9ybVZhbGlkYXRvcigpXG5cblx0XHQvLyB2YWxpZGF0b3IudmFsaWRhdGUoKTtcblx0XHQvLyB2YWxpZGF0ZSBtZXRob2QgY2FsbHMgc3VibWl0IHdoaWNoIGlzIG5vdCBuZWVkZWQgaW4gdGhpcyBjYXNlLlxuICAgIGZvciAodmFyIGZpZWxkIGluIHZhbGlkYXRvci5vcHRpb25zLmZpZWxkcykge1xuICAgICAgdmFsaWRhdG9yLnZhbGlkYXRlRmllbGQoZmllbGQpXG4gICAgfVxuXG4gICAgdmFyIHZhbGlkID0gdmFsaWRhdG9yLmlzVmFsaWQoKVxuICAgIHJldHVybiB2YWxpZFxuICB9LFxuXG5cdC8qKlxuXHQgKiBBZGQgdmFsaWRhdGlvbiB0byBzaXRlbWFwIGNyZWF0aW9uIG9yIGVkaXRpbmcgZm9ybVxuXHQgKi9cbiAgaW5pdFNpdGVtYXBWYWxpZGF0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKCcjdmlld3BvcnQgZm9ybScpLmJvb3RzdHJhcFZhbGlkYXRvcih7XG4gICAgICBmaWVsZHM6IHtcbiAgICAgICAgJ19pZCc6IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBub3RFbXB0eToge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnVGhlIHNpdGVtYXAgaWQgaXMgcmVxdWlyZWQgYW5kIGNhbm5vdCBiZSBlbXB0eSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdHJpbmdMZW5ndGg6IHtcbiAgICAgICAgICAgICAgbWluOiAzLFxuICAgICAgICAgICAgICBtZXNzYWdlOiAnVGhlIHNpdGVtYXAgaWQgc2hvdWxkIGJlIGF0bGVhc3QgMyBjaGFyYWN0ZXJzIGxvbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVnZXhwOiB7XG4gICAgICAgICAgICAgIHJlZ2V4cDogL15bYS16XVthLXowLTlfJCgpK1xcLS9dKyQvLFxuICAgICAgICAgICAgICBtZXNzYWdlOiAnT25seSBsb3dlcmNhc2UgY2hhcmFjdGVycyAoYS16KSwgZGlnaXRzICgwLTkpLCBvciBhbnkgb2YgdGhlIGNoYXJhY3RlcnMgXywgJCwgKCwgKSwgKywgLSwgYW5kIC8gYXJlIGFsbG93ZWQuIE11c3QgYmVnaW4gd2l0aCBhIGxldHRlci4nXG4gICAgICAgICAgICB9LFxuXHRcdFx0XHRcdFx0Ly8gcGxhY2Vob2xkZXIgZm9yIHNpdGVtYXAgaWQgZXhpc3RhbmNlIHZhbGlkYXRpb25cbiAgICAgICAgICAgIGNhbGxiYWNrOiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdTaXRlbWFwIHdpdGggdGhpcyBpZCBhbHJlYWR5IGV4aXN0cycsXG4gICAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbiAodmFsdWUsIHZhbGlkYXRvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgICdzdGFydFVybFtdJzoge1xuICAgICAgICAgIHZhbGlkYXRvcnM6IHtcbiAgICAgICAgICAgIG5vdEVtcHR5OiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgc3RhcnQgVVJMIGlzIHJlcXVpcmVkIGFuZCBjYW5ub3QgYmUgZW1wdHknXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXJpOiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgc3RhcnQgVVJMIGlzIG5vdCBhIHZhbGlkIFVSTCdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICB9LFxuXG4gIHNob3dDcmVhdGVTaXRlbWFwOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zZXRBY3RpdmVOYXZpZ2F0aW9uQnV0dG9uKCdjcmVhdGUtc2l0ZW1hcC1jcmVhdGUnKVxuICAgIHZhciBzaXRlbWFwRm9ybSA9IGljaC5TaXRlbWFwQ3JlYXRlKClcbiAgICB0aGlzLiQoJyN2aWV3cG9ydCcpLmh0bWwoc2l0ZW1hcEZvcm0pXG4gICAgdGhpcy5pbml0TXVsdGlwbGVTdGFydFVybEhlbHBlcigpXG4gICAgdGhpcy5pbml0U2l0ZW1hcFZhbGlkYXRpb24oKVxuXG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBpbml0SW1wb3J0U3RpZW1hcFZhbGlkYXRpb246IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoJyN2aWV3cG9ydCBmb3JtJykuYm9vdHN0cmFwVmFsaWRhdG9yKHtcbiAgICAgIGZpZWxkczoge1xuICAgICAgICAnX2lkJzoge1xuICAgICAgICAgIHZhbGlkYXRvcnM6IHtcbiAgICAgICAgICAgIHN0cmluZ0xlbmd0aDoge1xuICAgICAgICAgICAgICBtaW46IDMsXG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgc2l0ZW1hcCBpZCBzaG91bGQgYmUgYXRsZWFzdCAzIGNoYXJhY3RlcnMgbG9uZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZWdleHA6IHtcbiAgICAgICAgICAgICAgcmVnZXhwOiAvXlthLXpdW2EtejAtOV8kKCkrXFwtL10rJC8sXG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdPbmx5IGxvd2VyY2FzZSBjaGFyYWN0ZXJzIChhLXopLCBkaWdpdHMgKDAtOSksIG9yIGFueSBvZiB0aGUgY2hhcmFjdGVycyBfLCAkLCAoLCApLCArLCAtLCBhbmQgLyBhcmUgYWxsb3dlZC4gTXVzdCBiZWdpbiB3aXRoIGEgbGV0dGVyLidcbiAgICAgICAgICAgIH0sXG5cdFx0XHRcdFx0XHQvLyBwbGFjZWhvbGRlciBmb3Igc2l0ZW1hcCBpZCBleGlzdGFuY2UgdmFsaWRhdGlvblxuICAgICAgICAgICAgY2FsbGJhY2s6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1NpdGVtYXAgd2l0aCB0aGlzIGlkIGFscmVhZHkgZXhpc3RzJyxcbiAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICh2YWx1ZSwgdmFsaWRhdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc2l0ZW1hcEpTT046IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBub3RFbXB0eToge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnU2l0ZW1hcCBKU09OIGlzIHJlcXVpcmVkIGFuZCBjYW5ub3QgYmUgZW1wdHknXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2FsbGJhY2s6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ0pTT04gaXMgbm90IHZhbGlkJyxcbiAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICh2YWx1ZSwgdmFsaWRhdG9yKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgIEpTT04ucGFyc2UodmFsdWUpXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICB9LFxuXG4gIHNob3dJbXBvcnRTaXRlbWFwUGFuZWw6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNldEFjdGl2ZU5hdmlnYXRpb25CdXR0b24oJ2NyZWF0ZS1zaXRlbWFwLWltcG9ydCcpXG4gICAgdmFyIHNpdGVtYXBGb3JtID0gaWNoLlNpdGVtYXBJbXBvcnQoKVxuICAgIHRoaXMuJCgnI3ZpZXdwb3J0JykuaHRtbChzaXRlbWFwRm9ybSlcbiAgICB0aGlzLmluaXRJbXBvcnRTdGllbWFwVmFsaWRhdGlvbigpXG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBzaG93U2l0ZW1hcEV4cG9ydFBhbmVsOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zZXRBY3RpdmVOYXZpZ2F0aW9uQnV0dG9uKCdzaXRlbWFwLWV4cG9ydCcpXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgdmFyIHNpdGVtYXBKU09OID0gc2l0ZW1hcC5leHBvcnRTaXRlbWFwKClcbiAgICB2YXIgc2l0ZW1hcEV4cG9ydEZvcm0gPSBpY2guU2l0ZW1hcEV4cG9ydCh7XG4gICAgICBzaXRlbWFwSlNPTjogc2l0ZW1hcEpTT05cbiAgICB9KVxuICAgIHRoaXMuJCgnI3ZpZXdwb3J0JykuaHRtbChzaXRlbWFwRXhwb3J0Rm9ybSlcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIHNob3dTaXRlbWFwczogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuY2xlYXJTdGF0ZSgpXG4gICAgdGhpcy5zZXRBY3RpdmVOYXZpZ2F0aW9uQnV0dG9uKCdzaXRlbWFwcycpXG5cbiAgICB0aGlzLnN0b3JlLmdldEFsbFNpdGVtYXBzKGZ1bmN0aW9uIChzaXRlbWFwcykge1xuICAgICAgdmFyICRzaXRlbWFwTGlzdFBhbmVsID0gaWNoLlNpdGVtYXBMaXN0KClcbiAgICAgIHNpdGVtYXBzLmZvckVhY2goZnVuY3Rpb24gKHNpdGVtYXApIHtcbiAgICAgICAgdmFyICRzaXRlbWFwID0gaWNoLlNpdGVtYXBMaXN0SXRlbShzaXRlbWFwKVxuICAgICAgICAkc2l0ZW1hcC5kYXRhKCdzaXRlbWFwJywgc2l0ZW1hcClcbiAgICAgICAgJHNpdGVtYXBMaXN0UGFuZWwuZmluZCgndGJvZHknKS5hcHBlbmQoJHNpdGVtYXApXG4gICAgICB9KVxuICAgICAgdGhpcy4kKCcjdmlld3BvcnQnKS5odG1sKCRzaXRlbWFwTGlzdFBhbmVsKVxuICAgIH0pXG4gIH0sXG5cbiAgZ2V0U2l0ZW1hcEZyb21NZXRhZGF0YUZvcm06IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaWQgPSB0aGlzLiQoJyN2aWV3cG9ydCBmb3JtIGlucHV0W25hbWU9X2lkXScpLnZhbCgpXG4gICAgdmFyICRzdGFydFVybElucHV0cyA9IHRoaXMuJCgnI3ZpZXdwb3J0IGZvcm0gLmlucHV0LXN0YXJ0LXVybCcpXG4gICAgdmFyIHN0YXJ0VXJsXG4gICAgaWYgKCRzdGFydFVybElucHV0cy5sZW5ndGggPT09IDEpIHtcbiAgICAgIHN0YXJ0VXJsID0gJHN0YXJ0VXJsSW5wdXRzLnZhbCgpXG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXJ0VXJsID0gW11cbiAgICAgICRzdGFydFVybElucHV0cy5lYWNoKGZ1bmN0aW9uIChpLCBlbGVtZW50KSB7XG4gICAgICAgIHN0YXJ0VXJsLnB1c2godGhpcy4kKGVsZW1lbnQpLnZhbCgpKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IGlkLFxuICAgICAgc3RhcnRVcmw6IHN0YXJ0VXJsXG4gICAgfVxuICB9LFxuXG4gIGNyZWF0ZVNpdGVtYXA6IGZ1bmN0aW9uIChmb3JtKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcblx0XHQvLyBjYW5jZWwgc3VibWl0IGlmIGludmFsaWQgZm9ybVxuICAgIGlmICghdGhpcy5pc1ZhbGlkRm9ybSgpKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cbiAgICB2YXIgc2l0ZW1hcERhdGEgPSB0aGlzLmdldFNpdGVtYXBGcm9tTWV0YWRhdGFGb3JtKClcblxuXHRcdC8vIGNoZWNrIHdoZXRoZXIgc2l0ZW1hcCB3aXRoIHRoaXMgaWQgYWxyZWFkeSBleGlzdFxuICAgIHRoaXMuc3RvcmUuc2l0ZW1hcEV4aXN0cyhzaXRlbWFwRGF0YS5pZCwgZnVuY3Rpb24gKHNpdGVtYXBFeGlzdHMpIHtcbiAgICAgIGlmIChzaXRlbWFwRXhpc3RzKSB7XG4gICAgICAgIHZhciB2YWxpZGF0b3IgPSB0aGlzLmdldEZvcm1WYWxpZGF0b3IoKVxuICAgICAgICB2YWxpZGF0b3IudXBkYXRlU3RhdHVzKCdfaWQnLCAnSU5WQUxJRCcsICdjYWxsYmFjaycpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgc2l0ZW1hcCA9IG5ldyBTaXRlbWFwKHtcbiAgICAgICAgICBfaWQ6IHNpdGVtYXBEYXRhLmlkLFxuICAgICAgICAgIHN0YXJ0VXJsOiBzaXRlbWFwRGF0YS5zdGFydFVybCxcbiAgICAgICAgICBzZWxlY3RvcnM6IFtdXG4gICAgICAgIH0sIHskfSlcbiAgICAgICAgdGhpcy5zdG9yZS5jcmVhdGVTaXRlbWFwKHNpdGVtYXAsIGZ1bmN0aW9uIChzaXRlbWFwKSB7XG4gICAgICAgICAgdGhpcy5fZWRpdFNpdGVtYXAoc2l0ZW1hcCwgWydfcm9vdCddKVxuICAgICAgICB9LmJpbmQodGhpcywgc2l0ZW1hcCkpXG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuXG4gIGltcG9ydFNpdGVtYXA6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuXHRcdC8vIGNhbmNlbCBzdWJtaXQgaWYgaW52YWxpZCBmb3JtXG4gICAgaWYgKCF0aGlzLmlzVmFsaWRGb3JtKCkpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cblxuXHRcdC8vIGxvYWQgZGF0YSBmcm9tIGZvcm1cbiAgICB2YXIgc2l0ZW1hcEpTT04gPSB0aGlzLiQoJ1tuYW1lPXNpdGVtYXBKU09OXScpLnZhbCgpXG4gICAgdmFyIGlkID0gdGhpcy4kKCdpbnB1dFtuYW1lPV9pZF0nKS52YWwoKVxuICAgIHZhciBzaXRlbWFwID0gbmV3IFNpdGVtYXAobnVsbCwgeyR9KVxuICAgIHNpdGVtYXAuaW1wb3J0U2l0ZW1hcChzaXRlbWFwSlNPTilcbiAgICBpZiAoaWQubGVuZ3RoKSB7XG4gICAgICBzaXRlbWFwLl9pZCA9IGlkXG4gICAgfVxuXHRcdC8vIGNoZWNrIHdoZXRoZXIgc2l0ZW1hcCB3aXRoIHRoaXMgaWQgYWxyZWFkeSBleGlzdFxuICAgIHRoaXMuc3RvcmUuc2l0ZW1hcEV4aXN0cyhzaXRlbWFwLl9pZCwgZnVuY3Rpb24gKHNpdGVtYXBFeGlzdHMpIHtcbiAgICAgIGlmIChzaXRlbWFwRXhpc3RzKSB7XG4gICAgICAgIHZhciB2YWxpZGF0b3IgPSB0aGlzLmdldEZvcm1WYWxpZGF0b3IoKVxuICAgICAgICB2YWxpZGF0b3IudXBkYXRlU3RhdHVzKCdfaWQnLCAnSU5WQUxJRCcsICdjYWxsYmFjaycpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnN0b3JlLmNyZWF0ZVNpdGVtYXAoc2l0ZW1hcCwgZnVuY3Rpb24gKHNpdGVtYXApIHtcbiAgICAgICAgICB0aGlzLl9lZGl0U2l0ZW1hcChzaXRlbWFwLCBbJ19yb290J10pXG4gICAgICAgIH0uYmluZCh0aGlzLCBzaXRlbWFwKSlcbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG5cbiAgZWRpdFNpdGVtYXBNZXRhZGF0YTogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHRoaXMuc2V0QWN0aXZlTmF2aWdhdGlvbkJ1dHRvbignc2l0ZW1hcC1lZGl0LW1ldGFkYXRhJylcblxuICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcFxuICAgIHZhciAkc2l0ZW1hcE1ldGFkYXRhRm9ybSA9IGljaC5TaXRlbWFwRWRpdE1ldGFkYXRhKHNpdGVtYXApXG4gICAgdGhpcy4kKCcjdmlld3BvcnQnKS5odG1sKCRzaXRlbWFwTWV0YWRhdGFGb3JtKVxuICAgIHRoaXMuaW5pdE11bHRpcGxlU3RhcnRVcmxIZWxwZXIoKVxuICAgIHRoaXMuaW5pdFNpdGVtYXBWYWxpZGF0aW9uKClcblxuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgZWRpdFNpdGVtYXBNZXRhZGF0YVNhdmU6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcFxuICAgIHZhciBzaXRlbWFwRGF0YSA9IHRoaXMuZ2V0U2l0ZW1hcEZyb21NZXRhZGF0YUZvcm0oKVxuXG5cdFx0Ly8gY2FuY2VsIHN1Ym1pdCBpZiBpbnZhbGlkIGZvcm1cbiAgICBpZiAoIXRoaXMuaXNWYWxpZEZvcm0oKSkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG5cdFx0Ly8gY2hlY2sgd2hldGhlciBzaXRlbWFwIHdpdGggdGhpcyBpZCBhbHJlYWR5IGV4aXN0XG4gICAgdGhpcy5zdG9yZS5zaXRlbWFwRXhpc3RzKHNpdGVtYXBEYXRhLmlkLCBmdW5jdGlvbiAoc2l0ZW1hcEV4aXN0cykge1xuICAgICAgaWYgKHNpdGVtYXAuX2lkICE9PSBzaXRlbWFwRGF0YS5pZCAmJiBzaXRlbWFwRXhpc3RzKSB7XG4gICAgICAgIHZhciB2YWxpZGF0b3IgPSB0aGlzLmdldEZvcm1WYWxpZGF0b3IoKVxuICAgICAgICB2YWxpZGF0b3IudXBkYXRlU3RhdHVzKCdfaWQnLCAnSU5WQUxJRCcsICdjYWxsYmFjaycpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG5cdFx0XHQvLyBjaGFuZ2UgZGF0YVxuICAgICAgc2l0ZW1hcC5zdGFydFVybCA9IHNpdGVtYXBEYXRhLnN0YXJ0VXJsXG5cblx0XHRcdC8vIGp1c3QgY2hhbmdlIHNpdGVtYXBzIHVybFxuICAgICAgaWYgKHNpdGVtYXBEYXRhLmlkID09PSBzaXRlbWFwLl9pZCkge1xuICAgICAgICB0aGlzLnN0b3JlLnNhdmVTaXRlbWFwKHNpdGVtYXAsIGZ1bmN0aW9uIChzaXRlbWFwKSB7XG4gICAgICAgICAgdGhpcy5zaG93U2l0ZW1hcFNlbGVjdG9yTGlzdCgpXG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGlkIGNoYW5nZWQuIHdlIG5lZWQgdG8gZGVsZXRlIHRoZSBvbGQgb25lIGFuZCBjcmVhdGUgYSBuZXcgb25lXG4gICAgICAgIHZhciBuZXdTaXRlbWFwID0gbmV3IFNpdGVtYXAoc2l0ZW1hcCwgeyR9KVxuICAgICAgICB2YXIgb2xkU2l0ZW1hcCA9IHNpdGVtYXBcbiAgICAgICAgbmV3U2l0ZW1hcC5faWQgPSBzaXRlbWFwRGF0YS5pZFxuICAgICAgICB0aGlzLnN0b3JlLmNyZWF0ZVNpdGVtYXAobmV3U2l0ZW1hcCwgZnVuY3Rpb24gKG5ld1NpdGVtYXApIHtcbiAgICAgICAgICB0aGlzLnN0b3JlLmRlbGV0ZVNpdGVtYXAob2xkU2l0ZW1hcCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcCA9IG5ld1NpdGVtYXBcbiAgICAgICAgICAgIHRoaXMuc2hvd1NpdGVtYXBTZWxlY3Rvckxpc3QoKVxuICAgICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcblxuXHQvKipcblx0ICogQ2FsbGJhY2sgd2hlbiBzaXRlbWFwIGVkaXQgYnV0dG9uIGlzIGNsaWNrZWQgaW4gc2l0ZW1hcCBncmlkXG5cdCAqL1xuICBlZGl0U2l0ZW1hcDogZnVuY3Rpb24gKHRyKSB7XG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLiQodHIpLmRhdGEoJ3NpdGVtYXAnKVxuICAgIHRoaXMuX2VkaXRTaXRlbWFwKHNpdGVtYXApXG4gIH0sXG4gIF9lZGl0U2l0ZW1hcDogZnVuY3Rpb24gKHNpdGVtYXApIHtcbiAgICB0aGlzLnNldFN0YXRlRWRpdFNpdGVtYXAoc2l0ZW1hcClcbiAgICB0aGlzLnNldEFjdGl2ZU5hdmlnYXRpb25CdXR0b24oJ3NpdGVtYXAnKVxuXG4gICAgdGhpcy5zaG93U2l0ZW1hcFNlbGVjdG9yTGlzdCgpXG4gIH0sXG4gIHNob3dTaXRlbWFwU2VsZWN0b3JMaXN0OiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zZXRBY3RpdmVOYXZpZ2F0aW9uQnV0dG9uKCdzaXRlbWFwLXNlbGVjdG9yLWxpc3QnKVxuXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgdmFyIHBhcmVudFNlbGVjdG9ycyA9IHRoaXMuc3RhdGUuZWRpdFNpdGVtYXBCcmVhZGN1bWJzU2VsZWN0b3JzXG4gICAgdmFyIHBhcmVudFNlbGVjdG9ySWQgPSB0aGlzLnN0YXRlLmN1cnJlbnRQYXJlbnRTZWxlY3RvcklkXG5cbiAgICB2YXIgJHNlbGVjdG9yTGlzdFBhbmVsID0gaWNoLlNlbGVjdG9yTGlzdCh7XG4gICAgICBwYXJlbnRTZWxlY3RvcnM6IHBhcmVudFNlbGVjdG9yc1xuICAgIH0pXG4gICAgdmFyIHNlbGVjdG9ycyA9IHNpdGVtYXAuZ2V0RGlyZWN0Q2hpbGRTZWxlY3RvcnMocGFyZW50U2VsZWN0b3JJZClcbiAgICBzZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgIHZhciAkc2VsZWN0b3IgPSBpY2guU2VsZWN0b3JMaXN0SXRlbShzZWxlY3RvcilcbiAgICAgICRzZWxlY3Rvci5kYXRhKCdzZWxlY3RvcicsIHNlbGVjdG9yKVxuICAgICAgJHNlbGVjdG9yTGlzdFBhbmVsLmZpbmQoJ3Rib2R5JykuYXBwZW5kKCRzZWxlY3RvcilcbiAgICB9KVxuICAgIHRoaXMuJCgnI3ZpZXdwb3J0JykuaHRtbCgkc2VsZWN0b3JMaXN0UGFuZWwpXG5cbiAgICByZXR1cm4gdHJ1ZVxuICB9LCAvKlxuICBzaG93U2l0ZW1hcFNlbGVjdG9yR3JhcGg6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNldEFjdGl2ZU5hdmlnYXRpb25CdXR0b24oJ3NpdGVtYXAtc2VsZWN0b3ItZ3JhcGgnKVxuICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcFxuICAgIHZhciAkc2VsZWN0b3JHcmFwaFBhbmVsID0gaWNoLlNpdGVtYXBTZWxlY3RvckdyYXBoKClcbiAgICAkKCcjdmlld3BvcnQnKS5odG1sKCRzZWxlY3RvckdyYXBoUGFuZWwpXG4gICAgdmFyIGdyYXBoRGl2ID0gJCgnI3NlbGVjdG9yLWdyYXBoJylbMF1cbiAgICB2YXIgZ3JhcGggPSBuZXcgU2VsZWN0b3JHcmFwaHYyKHNpdGVtYXApXG4gICAgZ3JhcGguZHJhdyhncmFwaERpdiwgJChkb2N1bWVudCkud2lkdGgoKSwgMjAwKVxuICAgIHJldHVybiB0cnVlXG4gIH0sICovXG4gIHNob3dDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKHRyKSB7XG4gICAgdmFyIHNlbGVjdG9yID0gdGhpcy4kKHRyKS5kYXRhKCdzZWxlY3RvcicpXG4gICAgdmFyIHBhcmVudFNlbGVjdG9ycyA9IHRoaXMuc3RhdGUuZWRpdFNpdGVtYXBCcmVhZGN1bWJzU2VsZWN0b3JzXG4gICAgdGhpcy5zdGF0ZS5jdXJyZW50UGFyZW50U2VsZWN0b3JJZCA9IHNlbGVjdG9yLmlkXG4gICAgcGFyZW50U2VsZWN0b3JzLnB1c2goc2VsZWN0b3IpXG5cbiAgICB0aGlzLnNob3dTaXRlbWFwU2VsZWN0b3JMaXN0KClcbiAgfSxcblxuICB0cmVlTmF2aWdhdGlvbnNob3dTaXRlbWFwU2VsZWN0b3JMaXN0OiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyIHBhcmVudFNlbGVjdG9ycyA9IHRoaXMuc3RhdGUuZWRpdFNpdGVtYXBCcmVhZGN1bWJzU2VsZWN0b3JzXG4gICAgdmFyIGNvbnRyb2xsZXIgPSB0aGlzXG4gICAgdGhpcy4kKCcjc2VsZWN0b3ItdHJlZSAuYnJlYWRjcnVtYiBsaSBhJykuZWFjaChmdW5jdGlvbiAoaSwgcGFyZW50U2VsZWN0b3JCdXR0b24pIHtcbiAgICAgIGlmIChwYXJlbnRTZWxlY3RvckJ1dHRvbiA9PT0gYnV0dG9uKSB7XG4gICAgICAgIHBhcmVudFNlbGVjdG9ycy5zcGxpY2UoaSArIDEpXG4gICAgICAgIGNvbnRyb2xsZXIuc3RhdGUuY3VycmVudFBhcmVudFNlbGVjdG9ySWQgPSBwYXJlbnRTZWxlY3RvcnNbaV0uaWRcbiAgICAgIH1cbiAgICB9KVxuICAgIHRoaXMuc2hvd1NpdGVtYXBTZWxlY3Rvckxpc3QoKVxuICB9LFxuXG4gIGluaXRTZWxlY3RvclZhbGlkYXRpb246IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoJyN2aWV3cG9ydCBmb3JtJykuYm9vdHN0cmFwVmFsaWRhdG9yKHtcbiAgICAgIGZpZWxkczoge1xuICAgICAgICAnaWQnOiB7XG4gICAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgICAgbm90RW1wdHk6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1NpdGVtYXAgaWQgcmVxdWlyZWQgYW5kIGNhbm5vdCBiZSBlbXB0eSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdHJpbmdMZW5ndGg6IHtcbiAgICAgICAgICAgICAgbWluOiAzLFxuICAgICAgICAgICAgICBtZXNzYWdlOiAnVGhlIHNpdGVtYXAgaWQgc2hvdWxkIGJlIGF0bGVhc3QgMyBjaGFyYWN0ZXJzIGxvbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVnZXhwOiB7XG4gICAgICAgICAgICAgIHJlZ2V4cDogL15bXl9dLiokLyxcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1NlbGVjdG9yIGlkIGNhbm5vdCBzdGFydCB3aXRoIGFuIHVuZGVyc2NvcmUgXydcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHNlbGVjdG9yOiB7XG4gICAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgICAgbm90RW1wdHk6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1NlbGVjdG9yIGlzIHJlcXVpcmVkIGFuZCBjYW5ub3QgYmUgZW1wdHknXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICByZWdleDoge1xuICAgICAgICAgIHZhbGlkYXRvcnM6IHtcbiAgICAgICAgICAgIGNhbGxiYWNrOiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdKYXZhU2NyaXB0IGRvZXMgbm90IHN1cHBvcnQgcmVndWxhciBleHByZXNzaW9ucyB0aGF0IGNhbiBtYXRjaCAwIGNoYXJhY3RlcnMuJyxcbiAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICh2YWx1ZSwgdmFsaWRhdG9yKSB7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gYWxsb3cgbm8gcmVnZXhcbiAgICAgICAgICAgICAgICBpZiAoIXZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBtYXRjaGVzID0gJycubWF0Y2gobmV3IFJlZ0V4cCh2YWx1ZSkpXG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoZXMgIT09IG51bGwgJiYgbWF0Y2hlc1swXSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2xpY2tFbGVtZW50U2VsZWN0b3I6IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBub3RFbXB0eToge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnQ2xpY2sgc2VsZWN0b3IgaXMgcmVxdWlyZWQgYW5kIGNhbm5vdCBiZSBlbXB0eSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHRhYmxlSGVhZGVyUm93U2VsZWN0b3I6IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBub3RFbXB0eToge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnSGVhZGVyIHJvdyBzZWxlY3RvciBpcyByZXF1aXJlZCBhbmQgY2Fubm90IGJlIGVtcHR5J1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgdGFibGVEYXRhUm93U2VsZWN0b3I6IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBub3RFbXB0eToge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnRGF0YSByb3cgc2VsZWN0b3IgaXMgcmVxdWlyZWQgYW5kIGNhbm5vdCBiZSBlbXB0eSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgICAgbnVtZXJpYzoge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnRGVsYXkgbXVzdCBiZSBudW1lcmljJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgcGFyZW50U2VsZWN0b3JzOiB7XG4gICAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgICAgbm90RW1wdHk6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1lvdSBtdXN0IGNob29zZSBhdCBsZWFzdCBvbmUgcGFyZW50IHNlbGVjdG9yJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNhbGxiYWNrOiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdDYW5ub3QgaGFuZGxlIHJlY3Vyc2l2ZSBlbGVtZW50IHNlbGVjdG9ycycsXG4gICAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbiAodmFsdWUsIHZhbGlkYXRvciwgJGZpZWxkKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNpdGVtYXAgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yU2l0ZW1hcCgpXG4gICAgICAgICAgICAgICAgcmV0dXJuICFzaXRlbWFwLnNlbGVjdG9ycy5oYXNSZWN1cnNpdmVFbGVtZW50U2VsZWN0b3JzKClcbiAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgfSxcbiAgZWRpdFNlbGVjdG9yOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyIHNlbGVjdG9yID0gdGhpcy4kKGJ1dHRvbikuY2xvc2VzdCgndHInKS5kYXRhKCdzZWxlY3RvcicpXG4gICAgdGhpcy5fZWRpdFNlbGVjdG9yKHNlbGVjdG9yKVxuICB9LFxuICB1cGRhdGVTZWxlY3RvclBhcmVudExpc3RPbklkQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGVjdG9yID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvcigpXG4gICAgdGhpcy4kKCcuY3VycmVudGx5LWVkaXRlZCcpLnZhbChzZWxlY3Rvci5pZCkudGV4dChzZWxlY3Rvci5pZClcbiAgfSxcbiAgX2VkaXRTZWxlY3RvcjogZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgdmFyIHNlbGVjdG9ySWRzID0gc2l0ZW1hcC5nZXRQb3NzaWJsZVBhcmVudFNlbGVjdG9ySWRzKClcblxuICAgIHZhciAkZWRpdFNlbGVjdG9yRm9ybSA9IGljaC5TZWxlY3RvckVkaXQoe1xuICAgICAgc2VsZWN0b3I6IHNlbGVjdG9yLFxuICAgICAgc2VsZWN0b3JJZHM6IHNlbGVjdG9ySWRzLFxuICAgICAgc2VsZWN0b3JUeXBlczogW1xuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ1NlbGVjdG9yVGV4dCcsXG4gICAgICAgICAgdGl0bGU6ICdUZXh0J1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ1NlbGVjdG9yTGluaycsXG4gICAgICAgICAgdGl0bGU6ICdMaW5rJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ1NlbGVjdG9yUG9wdXBMaW5rJyxcbiAgICAgICAgICB0aXRsZTogJ1BvcHVwIExpbmsnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnU2VsZWN0b3JJbWFnZScsXG4gICAgICAgICAgdGl0bGU6ICdJbWFnZSdcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6ICdTZWxlY3RvclRhYmxlJyxcbiAgICAgICAgICB0aXRsZTogJ1RhYmxlJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ1NlbGVjdG9yRWxlbWVudEF0dHJpYnV0ZScsXG4gICAgICAgICAgdGl0bGU6ICdFbGVtZW50IGF0dHJpYnV0ZSdcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6ICdTZWxlY3RvckhUTUwnLFxuICAgICAgICAgIHRpdGxlOiAnSFRNTCdcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6ICdTZWxlY3RvckVsZW1lbnQnLFxuICAgICAgICAgIHRpdGxlOiAnRWxlbWVudCdcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6ICdTZWxlY3RvckVsZW1lbnRTY3JvbGwnLFxuICAgICAgICAgIHRpdGxlOiAnRWxlbWVudCBzY3JvbGwgZG93bidcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6ICdTZWxlY3RvckVsZW1lbnRDbGljaycsXG4gICAgICAgICAgdGl0bGU6ICdFbGVtZW50IGNsaWNrJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ1NlbGVjdG9yR3JvdXAnLFxuICAgICAgICAgIHRpdGxlOiAnR3JvdXBlZCdcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0pXG4gICAgdGhpcy4kKCcjdmlld3BvcnQnKS5odG1sKCRlZGl0U2VsZWN0b3JGb3JtKVxuXHRcdC8vIG1hcmsgaW5pdGlhbGx5IG9wZW5lZCBzZWxlY3RvciBhcyBjdXJyZW50bHkgZWRpdGVkXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdGhpcy4kKCcjZWRpdC1zZWxlY3RvciAjcGFyZW50U2VsZWN0b3JzIG9wdGlvbicpLmVhY2goZnVuY3Rpb24gKGksIGVsZW1lbnQpIHtcbiAgICAgIGlmIChzZWxmLiQoZWxlbWVudCkudmFsKCkgPT09IHNlbGVjdG9yLmlkKSB7XG4gICAgICAgIHNlbGYuJChlbGVtZW50KS5hZGRDbGFzcygnY3VycmVudGx5LWVkaXRlZCcpXG4gICAgICB9XG4gICAgfSlcblxuXHRcdC8vIHNldCBjbGlja1R5cGVcbiAgICBpZiAoc2VsZWN0b3IuY2xpY2tUeXBlKSB7XG4gICAgICAkZWRpdFNlbGVjdG9yRm9ybS5maW5kKCdbbmFtZT1jbGlja1R5cGVdJykudmFsKHNlbGVjdG9yLmNsaWNrVHlwZSlcbiAgICB9XG5cdFx0Ly8gc2V0IGNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlXG4gICAgaWYgKHNlbGVjdG9yLmNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlKSB7XG4gICAgICAkZWRpdFNlbGVjdG9yRm9ybS5maW5kKCdbbmFtZT1jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZV0nKS52YWwoc2VsZWN0b3IuY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUpXG4gICAgfVxuXG5cdFx0Ly8gaGFuZGxlIHNlbGVjdHMgc2VwZXJhdGVseVxuICAgICRlZGl0U2VsZWN0b3JGb3JtLmZpbmQoJ1tuYW1lPXR5cGVdJykudmFsKHNlbGVjdG9yLnR5cGUpXG4gICAgc2VsZWN0b3IucGFyZW50U2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9ySWQpIHtcbiAgICAgICRlZGl0U2VsZWN0b3JGb3JtLmZpbmQoXCIjcGFyZW50U2VsZWN0b3JzIFt2YWx1ZT0nXCIgKyBwYXJlbnRTZWxlY3RvcklkICsgXCInXVwiKS5hdHRyKCdzZWxlY3RlZCcsICdzZWxlY3RlZCcpXG4gICAgfSlcblxuICAgIHRoaXMuc3RhdGUuY3VycmVudFNlbGVjdG9yID0gc2VsZWN0b3JcbiAgICB0aGlzLnNlbGVjdG9yVHlwZUNoYW5nZWQoKVxuICAgIHRoaXMuaW5pdFNlbGVjdG9yVmFsaWRhdGlvbigpXG4gIH0sXG4gIHNlbGVjdG9yVHlwZUNoYW5nZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdHlwZSA9IHRoaXMuJCgnI2VkaXQtc2VsZWN0b3Igc2VsZWN0W25hbWU9dHlwZV0nKS52YWwoKVxuICAgIHZhciBmZWF0dXJlcyA9IHNlbGVjdG9yc1t0eXBlXS5nZXRGZWF0dXJlcygpXG4gICAgdGhpcy4kKCcjZWRpdC1zZWxlY3RvciAuZmVhdHVyZScpLmhpZGUoKVxuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIGZlYXR1cmVzLmZvckVhY2goZnVuY3Rpb24gKGZlYXR1cmUpIHtcbiAgICAgIHNlbGYuJCgnI2VkaXQtc2VsZWN0b3IgLmZlYXR1cmUtJyArIGZlYXR1cmUpLnNob3coKVxuICAgIH0pXG5cblx0XHQvLyBhZGQgdGhpcyBzZWxlY3RvciB0byBwb3NzaWJsZSBwYXJlbnQgc2VsZWN0b3JcbiAgICB2YXIgc2VsZWN0b3IgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yKClcbiAgICBpZiAoc2VsZWN0b3IuY2FuSGF2ZUNoaWxkU2VsZWN0b3JzKCkpIHtcbiAgICAgIGlmICh0aGlzLiQoJyNlZGl0LXNlbGVjdG9yICNwYXJlbnRTZWxlY3RvcnMgLmN1cnJlbnRseS1lZGl0ZWQnKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdmFyICRvcHRpb24gPSB0aGlzLiQoJzxvcHRpb24gY2xhc3M9XCJjdXJyZW50bHktZWRpdGVkXCI+PC9vcHRpb24+JylcbiAgICAgICAgJG9wdGlvbi50ZXh0KHNlbGVjdG9yLmlkKS52YWwoc2VsZWN0b3IuaWQpXG4gICAgICAgIHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgI3BhcmVudFNlbGVjdG9ycycpLmFwcGVuZCgkb3B0aW9uKVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG5cdFx0Ly8gcmVtb3ZlIGlmIHR5cGUgZG9lc24ndCBhbGxvdyB0byBoYXZlIGNoaWxkIHNlbGVjdG9yc1xuICAgICAgdGhpcy4kKCcjZWRpdC1zZWxlY3RvciAjcGFyZW50U2VsZWN0b3JzIC5jdXJyZW50bHktZWRpdGVkJykucmVtb3ZlKClcbiAgICB9XG4gIH0sXG4gIHNhdmVTZWxlY3RvcjogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcFxuICAgIHZhciBzZWxlY3RvciA9IHRoaXMuc3RhdGUuY3VycmVudFNlbGVjdG9yXG4gICAgdmFyIG5ld1NlbGVjdG9yID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvcigpXG5cblx0XHQvLyBjYW5jZWwgc3VibWl0IGlmIGludmFsaWQgZm9ybVxuICAgIGlmICghdGhpcy5pc1ZhbGlkRm9ybSgpKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cblx0XHQvLyBjYW5jZWwgcG9zc2libGUgZWxlbWVudCBzZWxlY3Rpb25cbiAgICB0aGlzLmNvbnRlbnRTY3JpcHQucmVtb3ZlQ3VycmVudENvbnRlbnRTZWxlY3RvcigpLmRvbmUoZnVuY3Rpb24gKCkge1xuICAgICAgc2l0ZW1hcC51cGRhdGVTZWxlY3RvcihzZWxlY3RvciwgbmV3U2VsZWN0b3IpXG5cbiAgICAgIHRoaXMuc3RvcmUuc2F2ZVNpdGVtYXAoc2l0ZW1hcCwgZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnNob3dTaXRlbWFwU2VsZWN0b3JMaXN0KClcbiAgICAgIH0uYmluZCh0aGlzKSlcbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG5cdC8qKlxuXHQgKiBHZXQgc2VsZWN0b3IgZnJvbSBzZWxlY3RvciBlZGl0aW5nIGZvcm1cblx0ICovXG4gIGdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGlkID0gdGhpcy4kKCcjZWRpdC1zZWxlY3RvciBbbmFtZT1pZF0nKS52YWwoKVxuICAgIHZhciBzZWxlY3RvcnNTZWxlY3RvciA9IHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9c2VsZWN0b3JdJykudmFsKClcbiAgICB2YXIgdGFibGVEYXRhUm93U2VsZWN0b3IgPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPXRhYmxlRGF0YVJvd1NlbGVjdG9yXScpLnZhbCgpXG4gICAgdmFyIHRhYmxlSGVhZGVyUm93U2VsZWN0b3IgPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPXRhYmxlSGVhZGVyUm93U2VsZWN0b3JdJykudmFsKClcbiAgICB2YXIgY2xpY2tFbGVtZW50U2VsZWN0b3IgPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPWNsaWNrRWxlbWVudFNlbGVjdG9yXScpLnZhbCgpXG4gICAgdmFyIHR5cGUgPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPXR5cGVdJykudmFsKClcbiAgICB2YXIgY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUgPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPWNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlXScpLnZhbCgpXG4gICAgdmFyIGNsaWNrVHlwZSA9IHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9Y2xpY2tUeXBlXScpLnZhbCgpXG4gICAgdmFyIGRpc2NhcmRJbml0aWFsRWxlbWVudHMgPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPWRpc2NhcmRJbml0aWFsRWxlbWVudHNdJykuaXMoJzpjaGVja2VkJylcbiAgICB2YXIgbXVsdGlwbGUgPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPW11bHRpcGxlXScpLmlzKCc6Y2hlY2tlZCcpXG4gICAgdmFyIGRvd25sb2FkSW1hZ2UgPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPWRvd25sb2FkSW1hZ2VdJykuaXMoJzpjaGVja2VkJylcbiAgICB2YXIgY2xpY2tQb3B1cCA9IHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9Y2xpY2tQb3B1cF0nKS5pcygnOmNoZWNrZWQnKVxuICAgIHZhciByZWdleCA9IHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9cmVnZXhdJykudmFsKClcbiAgICB2YXIgZGVsYXkgPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPWRlbGF5XScpLnZhbCgpXG4gICAgdmFyIGV4dHJhY3RBdHRyaWJ1dGUgPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPWV4dHJhY3RBdHRyaWJ1dGVdJykudmFsKClcbiAgICB2YXIgcGFyZW50U2VsZWN0b3JzID0gdGhpcy4kKCcjZWRpdC1zZWxlY3RvciBbbmFtZT1wYXJlbnRTZWxlY3RvcnNdJykudmFsKClcbiAgICB2YXIgY29sdW1ucyA9IFtdXG4gICAgdmFyICRjb2x1bW5IZWFkZXJzID0gdGhpcy4kKCcjZWRpdC1zZWxlY3RvciAuY29sdW1uLWhlYWRlcicpXG4gICAgdmFyICRjb2x1bW5OYW1lcyA9IHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgLmNvbHVtbi1uYW1lJylcbiAgICB2YXIgJGNvbHVtbkV4dHJhY3RzID0gdGhpcy4kKCcjZWRpdC1zZWxlY3RvciAuY29sdW1uLWV4dHJhY3QnKVxuXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgJGNvbHVtbkhlYWRlcnMuZWFjaChmdW5jdGlvbiAoaSkge1xuICAgICAgdmFyIGhlYWRlciA9IHNlbGYuJCgkY29sdW1uSGVhZGVyc1tpXSkudmFsKClcbiAgICAgIHZhciBuYW1lID0gc2VsZi4kKCRjb2x1bW5OYW1lc1tpXSkudmFsKClcbiAgICAgIHZhciBleHRyYWN0ID0gc2VsZi4kKCRjb2x1bW5FeHRyYWN0c1tpXSkuaXMoJzpjaGVja2VkJylcbiAgICAgIGNvbHVtbnMucHVzaCh7XG4gICAgICAgIGhlYWRlcjogaGVhZGVyLFxuICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICBleHRyYWN0OiBleHRyYWN0XG4gICAgICB9KVxuICAgIH0pXG5cbiAgICB2YXIgbmV3U2VsZWN0b3IgPSBuZXcgU2VsZWN0b3Ioe1xuICAgICAgaWQ6IGlkLFxuICAgICAgc2VsZWN0b3I6IHNlbGVjdG9yc1NlbGVjdG9yLFxuICAgICAgdGFibGVIZWFkZXJSb3dTZWxlY3RvcjogdGFibGVIZWFkZXJSb3dTZWxlY3RvcixcbiAgICAgIHRhYmxlRGF0YVJvd1NlbGVjdG9yOiB0YWJsZURhdGFSb3dTZWxlY3RvcixcbiAgICAgIGNsaWNrRWxlbWVudFNlbGVjdG9yOiBjbGlja0VsZW1lbnRTZWxlY3RvcixcbiAgICAgIGNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlOiBjbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSxcbiAgICAgIGNsaWNrVHlwZTogY2xpY2tUeXBlLFxuICAgICAgZGlzY2FyZEluaXRpYWxFbGVtZW50czogZGlzY2FyZEluaXRpYWxFbGVtZW50cyxcbiAgICAgIHR5cGU6IHR5cGUsXG4gICAgICBtdWx0aXBsZTogbXVsdGlwbGUsXG4gICAgICBkb3dubG9hZEltYWdlOiBkb3dubG9hZEltYWdlLFxuICAgICAgY2xpY2tQb3B1cDogY2xpY2tQb3B1cCxcbiAgICAgIHJlZ2V4OiByZWdleCxcbiAgICAgIGV4dHJhY3RBdHRyaWJ1dGU6IGV4dHJhY3RBdHRyaWJ1dGUsXG4gICAgICBwYXJlbnRTZWxlY3RvcnM6IHBhcmVudFNlbGVjdG9ycyxcbiAgICAgIGNvbHVtbnM6IGNvbHVtbnMsXG4gICAgICBkZWxheTogZGVsYXlcbiAgICB9LCB7XG4gICAgICAkOiB0aGlzLiRcbiAgICB9KVxuICAgIHJldHVybiBuZXdTZWxlY3RvclxuICB9LFxuXHQvKipcblx0ICogQHJldHVybnMge1NpdGVtYXB8Kn0gQ2xvbmVkIFNpdGVtYXAgd2l0aCBjdXJyZW50bHkgZWRpdGVkIHNlbGVjdG9yXG5cdCAqL1xuICBnZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvclNpdGVtYXA6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXAuY2xvbmUoKVxuICAgIHZhciBzZWxlY3RvciA9IHNpdGVtYXAuZ2V0U2VsZWN0b3JCeUlkKHRoaXMuc3RhdGUuY3VycmVudFNlbGVjdG9yLmlkKVxuICAgIHZhciBuZXdTZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3IoKVxuICAgIHNpdGVtYXAudXBkYXRlU2VsZWN0b3Ioc2VsZWN0b3IsIG5ld1NlbGVjdG9yKVxuICAgIHJldHVybiBzaXRlbWFwXG4gIH0sXG4gIGNhbmNlbFNlbGVjdG9yRWRpdGluZzogZnVuY3Rpb24gKGJ1dHRvbikge1xuXHRcdC8vIGNhbmNlbCBwb3NzaWJsZSBlbGVtZW50IHNlbGVjdGlvblxuICAgIHRoaXMuY29udGVudFNjcmlwdC5yZW1vdmVDdXJyZW50Q29udGVudFNlbGVjdG9yKCkuZG9uZShmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLnNob3dTaXRlbWFwU2VsZWN0b3JMaXN0KClcbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG4gIGFkZFNlbGVjdG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHBhcmVudFNlbGVjdG9ySWQgPSB0aGlzLnN0YXRlLmN1cnJlbnRQYXJlbnRTZWxlY3RvcklkXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG5cbiAgICB2YXIgc2VsZWN0b3IgPSBuZXcgU2VsZWN0b3Ioe1xuICAgICAgcGFyZW50U2VsZWN0b3JzOiBbcGFyZW50U2VsZWN0b3JJZF0sXG4gICAgICB0eXBlOiAnU2VsZWN0b3JUZXh0JyxcbiAgICAgIG11bHRpcGxlOiBmYWxzZVxuICAgIH0sIHskOiB0aGlzLiR9KVxuXG4gICAgdGhpcy5fZWRpdFNlbGVjdG9yKHNlbGVjdG9yLCBzaXRlbWFwKVxuICB9LFxuICBkZWxldGVTZWxlY3RvcjogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcFxuICAgIHZhciBzZWxlY3RvciA9IHRoaXMuJChidXR0b24pLmNsb3Nlc3QoJ3RyJykuZGF0YSgnc2VsZWN0b3InKVxuICAgIHNpdGVtYXAuZGVsZXRlU2VsZWN0b3Ioc2VsZWN0b3IpXG5cbiAgICB0aGlzLnN0b3JlLnNhdmVTaXRlbWFwKHNpdGVtYXAsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuc2hvd1NpdGVtYXBTZWxlY3Rvckxpc3QoKVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcbiAgZGVsZXRlU2l0ZW1hcDogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciBzaXRlbWFwID0gdGhpcy4kKGJ1dHRvbikuY2xvc2VzdCgndHInKS5kYXRhKCdzaXRlbWFwJylcbiAgICB2YXIgY29udHJvbGxlciA9IHRoaXNcbiAgICB0aGlzLnN0b3JlLmRlbGV0ZVNpdGVtYXAoc2l0ZW1hcCwgZnVuY3Rpb24gKCkge1xuICAgICAgY29udHJvbGxlci5zaG93U2l0ZW1hcHMoKVxuICAgIH0pXG4gIH0sXG4gIGluaXRTY3JhcGVTaXRlbWFwQ29uZmlnVmFsaWRhdGlvbjogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJCgnI3ZpZXdwb3J0IGZvcm0nKS5ib290c3RyYXBWYWxpZGF0b3Ioe1xuICAgICAgZmllbGRzOiB7XG4gICAgICAgICdyZXF1ZXN0SW50ZXJ2YWwnOiB7XG4gICAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgICAgbm90RW1wdHk6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSByZXF1ZXN0IGludGVydmFsIGlzIHJlcXVpcmVkIGFuZCBjYW5ub3QgYmUgZW1wdHknXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbnVtZXJpYzoge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnVGhlIHJlcXVlc3QgaW50ZXJ2YWwgbXVzdCBiZSBudW1lcmljJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNhbGxiYWNrOiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgcmVxdWVzdCBpbnRlcnZhbCBtdXN0IGJlIGF0bGVhc3QgMjAwMCBtaWxsaXNlY29uZHMnLFxuICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKHZhbHVlLCB2YWxpZGF0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUgPj0gMjAwMFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAncGFnZUxvYWREZWxheSc6IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBub3RFbXB0eToge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnVGhlIHBhZ2UgbG9hZCBkZWxheSBpcyByZXF1aXJlZCBhbmQgY2Fubm90IGJlIGVtcHR5J1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG51bWVyaWM6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSBwYWdlIGxhb2QgZGVsYXkgbXVzdCBiZSBudW1lcmljJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNhbGxiYWNrOiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgcGFnZSBsb2FkIGRlbGF5IG11c3QgYmUgYXRsZWFzdCA1MDAgbWlsbGlzZWNvbmRzJyxcbiAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICh2YWx1ZSwgdmFsaWRhdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlID49IDUwMFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgfSxcbiAgc2hvd1NjcmFwZVNpdGVtYXBDb25maWdQYW5lbDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2V0QWN0aXZlTmF2aWdhdGlvbkJ1dHRvbignc2l0ZW1hcC1zY3JhcGUnKVxuICAgIHZhciBzY3JhcGVDb25maWdQYW5lbCA9IGljaC5TaXRlbWFwU2NyYXBlQ29uZmlnKClcbiAgICB0aGlzLiQoJyN2aWV3cG9ydCcpLmh0bWwoc2NyYXBlQ29uZmlnUGFuZWwpXG4gICAgdGhpcy5pbml0U2NyYXBlU2l0ZW1hcENvbmZpZ1ZhbGlkYXRpb24oKVxuICAgIHJldHVybiB0cnVlXG4gIH0sXG4gIHNjcmFwZVNpdGVtYXA6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuaXNWYWxpZEZvcm0oKSkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG4gICAgdmFyIHJlcXVlc3RJbnRlcnZhbCA9IHRoaXMuJCgnaW5wdXRbbmFtZT1yZXF1ZXN0SW50ZXJ2YWxdJykudmFsKClcbiAgICB2YXIgcGFnZUxvYWREZWxheSA9IHRoaXMuJCgnaW5wdXRbbmFtZT1wYWdlTG9hZERlbGF5XScpLnZhbCgpXG5cbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICB2YXIgcmVxdWVzdCA9IHtcbiAgICAgIHNjcmFwZVNpdGVtYXA6IHRydWUsXG4gICAgICBzaXRlbWFwOiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHNpdGVtYXApKSxcbiAgICAgIHJlcXVlc3RJbnRlcnZhbDogcmVxdWVzdEludGVydmFsLFxuICAgICAgcGFnZUxvYWREZWxheTogcGFnZUxvYWREZWxheVxuICAgIH1cblxuXHRcdC8vIHNob3cgc2l0ZW1hcCBzY3JhcGluZyBwYW5lbFxuICAgIHRoaXMuZ2V0Rm9ybVZhbGlkYXRvcigpLmRlc3Ryb3koKVxuICAgIHRoaXMuJCgnLnNjcmFwaW5nLWluLXByb2dyZXNzJykucmVtb3ZlQ2xhc3MoJ2hpZGUnKVxuICAgIHRoaXMuJCgnI3N1Ym1pdC1zY3JhcGUtc2l0ZW1hcCcpLmNsb3Nlc3QoJy5mb3JtLWdyb3VwJykuaGlkZSgpXG4gICAgdGhpcy4kKCcjc2NyYXBlLXNpdGVtYXAtY29uZmlnIGlucHV0JykucHJvcCgnZGlzYWJsZWQnLCB0cnVlKVxuXG4gICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UocmVxdWVzdCwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICB0aGlzLmJyb3dzZVNpdGVtYXBEYXRhKClcbiAgICB9LmJpbmQodGhpcykpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHNpdGVtYXBMaXN0QnJvd3NlU2l0ZW1hcERhdGE6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuJChidXR0b24pLmNsb3Nlc3QoJ3RyJykuZGF0YSgnc2l0ZW1hcCcpXG4gICAgdGhpcy5zZXRTdGF0ZUVkaXRTaXRlbWFwKHNpdGVtYXApXG4gICAgdGhpcy5icm93c2VTaXRlbWFwRGF0YSgpXG4gIH0sXG4gIGJyb3dzZVNpdGVtYXBEYXRhOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zZXRBY3RpdmVOYXZpZ2F0aW9uQnV0dG9uKCdzaXRlbWFwLWJyb3dzZScpXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgdGhpcy5zdG9yZS5nZXRTaXRlbWFwRGF0YShzaXRlbWFwLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgdmFyIGRhdGFDb2x1bW5zID0gc2l0ZW1hcC5nZXREYXRhQ29sdW1ucygpXG5cbiAgICAgIHZhciBkYXRhUGFuZWwgPSBpY2guU2l0ZW1hcEJyb3dzZURhdGEoe1xuICAgICAgICBjb2x1bW5zOiBkYXRhQ29sdW1uc1xuICAgICAgfSlcbiAgICAgIHRoaXMuJCgnI3ZpZXdwb3J0JykuaHRtbChkYXRhUGFuZWwpXG5cblx0XHRcdC8vIGRpc3BsYXkgZGF0YVxuXHRcdFx0Ly8gRG9pbmcgdGhpcyB0aGUgbG9uZyB3YXkgc28gdGhlcmUgYXJlbid0IHhzcyB2dWxuZXJ1YmlsaXRlc1xuXHRcdFx0Ly8gd2hpbGUgd29ya2luZyB3aXRoIGRhdGEgb3Igd2l0aCB0aGUgc2VsZWN0b3IgdGl0bGVzXG4gICAgICB2YXIgJHRib2R5ID0gdGhpcy4kKCcjc2l0ZW1hcC1kYXRhIHRib2R5JylcbiAgICAgIHZhciBzZWxmID0gdGhpc1xuICAgICAgZGF0YS5mb3JFYWNoKGZ1bmN0aW9uIChyb3cpIHtcbiAgICAgICAgdmFyICR0ciA9IHNlbGYuJCgnPHRyPjwvdHI+JylcbiAgICAgICAgZGF0YUNvbHVtbnMuZm9yRWFjaChmdW5jdGlvbiAoY29sdW1uKSB7XG4gICAgICAgICAgdmFyICR0ZCA9IHNlbGYuJCgnPHRkPjwvdGQ+JylcbiAgICAgICAgICB2YXIgY2VsbERhdGEgPSByb3dbY29sdW1uXVxuICAgICAgICAgIGlmICh0eXBlb2YgY2VsbERhdGEgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBjZWxsRGF0YSA9IEpTT04uc3RyaW5naWZ5KGNlbGxEYXRhKVxuICAgICAgICAgIH1cbiAgICAgICAgICAkdGQudGV4dChjZWxsRGF0YSlcbiAgICAgICAgICAkdHIuYXBwZW5kKCR0ZClcbiAgICAgICAgfSlcbiAgICAgICAgJHRib2R5LmFwcGVuZCgkdHIpXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIHNob3dTaXRlbWFwRXhwb3J0RGF0YUNzdlBhbmVsOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zZXRBY3RpdmVOYXZpZ2F0aW9uQnV0dG9uKCdzaXRlbWFwLWV4cG9ydC1kYXRhLWNzdicpXG5cbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICB2YXIgZXhwb3J0UGFuZWwgPSBpY2guU2l0ZW1hcEV4cG9ydERhdGFDU1Yoc2l0ZW1hcClcbiAgICB0aGlzLiQoJyN2aWV3cG9ydCcpLmh0bWwoZXhwb3J0UGFuZWwpXG5cblx0XHQvLyBnZW5lcmF0ZSBkYXRhXG4gICAgdGhpcy4kKCcuZG93bmxvYWQtYnV0dG9uJykuaGlkZSgpXG4gICAgdGhpcy5zdG9yZS5nZXRTaXRlbWFwRGF0YShzaXRlbWFwLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgdmFyIGJsb2IgPSBzaXRlbWFwLmdldERhdGFFeHBvcnRDc3ZCbG9iKGRhdGEpXG4gICAgICB0aGlzLiQoJy5kb3dubG9hZC1idXR0b24gYScpLmF0dHIoJ2hyZWYnLCB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKSlcbiAgICAgIHRoaXMuJCgnLmRvd25sb2FkLWJ1dHRvbiBhJykuYXR0cignZG93bmxvYWQnLCBzaXRlbWFwLl9pZCArICcuY3N2JylcbiAgICAgIHRoaXMuJCgnLmRvd25sb2FkLWJ1dHRvbicpLnNob3coKVxuICAgIH0pXG5cbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIHNlbGVjdFNlbGVjdG9yOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICB2YXIgaW5wdXQgPSAkKGJ1dHRvbikuY2xvc2VzdCgnLmZvcm0tZ3JvdXAnKS5maW5kKCdpbnB1dC5zZWxlY3Rvci12YWx1ZScpXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yU2l0ZW1hcCgpXG4gICAgdmFyIHNlbGVjdG9yID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvcigpXG4gICAgdmFyIGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzID0gdGhpcy5nZXRDdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcygpXG4gICAgdmFyIHBhcmVudENTU1NlbGVjdG9yID0gc2l0ZW1hcC5zZWxlY3RvcnMuZ2V0UGFyZW50Q1NTU2VsZWN0b3JXaXRoaW5PbmVQYWdlKGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzKVxuXG4gICAgdmFyIGRlZmVycmVkU2VsZWN0b3IgPSB0aGlzLmNvbnRlbnRTY3JpcHQuc2VsZWN0U2VsZWN0b3Ioe1xuICAgICAgcGFyZW50Q1NTU2VsZWN0b3I6IHBhcmVudENTU1NlbGVjdG9yLFxuICAgICAgYWxsb3dlZEVsZW1lbnRzOiBzZWxlY3Rvci5nZXRJdGVtQ1NTU2VsZWN0b3IoKVxuICAgIH0sIHskfSlcblxuICAgIGRlZmVycmVkU2VsZWN0b3IuZG9uZShmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAkKGlucHV0KS52YWwocmVzdWx0LkNTU1NlbGVjdG9yKVxuXG5cdFx0XHQvLyB1cGRhdGUgdmFsaWRhdGlvbiBmb3Igc2VsZWN0b3IgZmllbGRcbiAgICAgIHZhciB2YWxpZGF0b3IgPSB0aGlzLmdldEZvcm1WYWxpZGF0b3IoKVxuICAgICAgdmFsaWRhdG9yLnJldmFsaWRhdGVGaWVsZChpbnB1dClcblxuXHRcdFx0Ly8gQFRPRE8gaG93IGNvdWxkIHRoaXMgYmUgZW5jYXBzdWxhdGVkP1xuXHRcdFx0Ly8gdXBkYXRlIGhlYWRlciByb3csIGRhdGEgcm93IHNlbGVjdG9ycyBhZnRlciBzZWxlY3RpbmcgdGhlIHRhYmxlLiBzZWxlY3RvcnMgYXJlIHVwZGF0ZWQgYmFzZWQgb24gdGFibGVzXG5cdFx0XHQvLyBpbm5lciBodG1sXG4gICAgICBpZiAoc2VsZWN0b3IudHlwZSA9PT0gJ1NlbGVjdG9yVGFibGUnKSB7XG4gICAgICAgIHRoaXMuZ2V0U2VsZWN0b3JIVE1MKCkuZG9uZShmdW5jdGlvbiAoaHRtbCkge1xuICAgICAgICAgIHZhciB0YWJsZUhlYWRlclJvd1NlbGVjdG9yID0gU2VsZWN0b3JUYWJsZS5nZXRUYWJsZUhlYWRlclJvd1NlbGVjdG9yRnJvbVRhYmxlSFRNTChodG1sLCB7JH0pXG4gICAgICAgICAgdmFyIHRhYmxlRGF0YVJvd1NlbGVjdG9yID0gU2VsZWN0b3JUYWJsZS5nZXRUYWJsZURhdGFSb3dTZWxlY3RvckZyb21UYWJsZUhUTUwoaHRtbCwgeyR9KVxuICAgICAgICAgICQoJ2lucHV0W25hbWU9dGFibGVIZWFkZXJSb3dTZWxlY3Rvcl0nKS52YWwodGFibGVIZWFkZXJSb3dTZWxlY3RvcilcbiAgICAgICAgICAkKCdpbnB1dFtuYW1lPXRhYmxlRGF0YVJvd1NlbGVjdG9yXScpLnZhbCh0YWJsZURhdGFSb3dTZWxlY3RvcilcblxuICAgICAgICAgIHZhciBoZWFkZXJDb2x1bW5zID0gU2VsZWN0b3JUYWJsZS5nZXRUYWJsZUhlYWRlckNvbHVtbnNGcm9tSFRNTCh0YWJsZUhlYWRlclJvd1NlbGVjdG9yLCBodG1sLCB7JH0pXG4gICAgICAgICAgdGhpcy5yZW5kZXJUYWJsZUhlYWRlckNvbHVtbnMoaGVhZGVyQ29sdW1ucylcbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcblxuICBnZXRDdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkczogZnVuY3Rpb24gKCkge1xuICAgIHZhciBwYXJlbnRTZWxlY3RvcklkcyA9IHRoaXMuc3RhdGUuZWRpdFNpdGVtYXBCcmVhZGN1bWJzU2VsZWN0b3JzLm1hcChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgIHJldHVybiBzZWxlY3Rvci5pZFxuICAgIH0pXG5cbiAgICByZXR1cm4gcGFyZW50U2VsZWN0b3JJZHNcbiAgfSxcblxuICBzZWxlY3RUYWJsZUhlYWRlclJvd1NlbGVjdG9yOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICB2YXIgaW5wdXQgPSAkKGJ1dHRvbikuY2xvc2VzdCgnLmZvcm0tZ3JvdXAnKS5maW5kKCdpbnB1dC5zZWxlY3Rvci12YWx1ZScpXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yU2l0ZW1hcCgpXG4gICAgdmFyIHNlbGVjdG9yID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvcigpXG4gICAgdmFyIGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzID0gdGhpcy5nZXRDdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcygpXG4gICAgdmFyIHBhcmVudENTU1NlbGVjdG9yID0gc2l0ZW1hcC5zZWxlY3RvcnMuZ2V0Q1NTU2VsZWN0b3JXaXRoaW5PbmVQYWdlKHNlbGVjdG9yLmlkLCBjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcylcblxuICAgIHZhciBkZWZlcnJlZFNlbGVjdG9yID0gdGhpcy5jb250ZW50U2NyaXB0LnNlbGVjdFNlbGVjdG9yKHtcbiAgICAgIHBhcmVudENTU1NlbGVjdG9yOiBwYXJlbnRDU1NTZWxlY3RvcixcbiAgICAgIGFsbG93ZWRFbGVtZW50czogJ3RyJ1xuICAgIH0sIHskfSlcblxuICAgIGRlZmVycmVkU2VsZWN0b3IuZG9uZShmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICB2YXIgdGFibGVIZWFkZXJSb3dTZWxlY3RvciA9IHJlc3VsdC5DU1NTZWxlY3RvclxuICAgICAgJChpbnB1dCkudmFsKHRhYmxlSGVhZGVyUm93U2VsZWN0b3IpXG5cbiAgICAgIHRoaXMuZ2V0U2VsZWN0b3JIVE1MKCkuZG9uZShmdW5jdGlvbiAoaHRtbCkge1xuICAgICAgICB2YXIgaGVhZGVyQ29sdW1ucyA9IFNlbGVjdG9yVGFibGUuZ2V0VGFibGVIZWFkZXJDb2x1bW5zRnJvbUhUTUwodGFibGVIZWFkZXJSb3dTZWxlY3RvciwgaHRtbCwgeyR9KVxuICAgICAgICB0aGlzLnJlbmRlclRhYmxlSGVhZGVyQ29sdW1ucyhoZWFkZXJDb2x1bW5zKVxuICAgICAgfS5iaW5kKHRoaXMpKVxuXG5cdFx0XHQvLyB1cGRhdGUgdmFsaWRhdGlvbiBmb3Igc2VsZWN0b3IgZmllbGRcbiAgICAgIHZhciB2YWxpZGF0b3IgPSB0aGlzLmdldEZvcm1WYWxpZGF0b3IoKVxuICAgICAgdmFsaWRhdG9yLnJldmFsaWRhdGVGaWVsZChpbnB1dClcbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG5cbiAgc2VsZWN0VGFibGVEYXRhUm93U2VsZWN0b3I6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIHZhciBpbnB1dCA9IHRoaXMuJChidXR0b24pLmNsb3Nlc3QoJy5mb3JtLWdyb3VwJykuZmluZCgnaW5wdXQuc2VsZWN0b3ItdmFsdWUnKVxuICAgIHZhciBzaXRlbWFwID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvclNpdGVtYXAoKVxuICAgIHZhciBzZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3IoKVxuICAgIHZhciBjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcyA9IHRoaXMuZ2V0Q3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMoKVxuICAgIHZhciBwYXJlbnRDU1NTZWxlY3RvciA9IHNpdGVtYXAuc2VsZWN0b3JzLmdldENTU1NlbGVjdG9yV2l0aGluT25lUGFnZShzZWxlY3Rvci5pZCwgY3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMpXG5cbiAgICB2YXIgZGVmZXJyZWRTZWxlY3RvciA9IHRoaXMuY29udGVudFNjcmlwdC5zZWxlY3RTZWxlY3Rvcih7XG4gICAgICBwYXJlbnRDU1NTZWxlY3RvcjogcGFyZW50Q1NTU2VsZWN0b3IsXG4gICAgICBhbGxvd2VkRWxlbWVudHM6ICd0cidcbiAgICB9LCB7JH0pXG5cbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICBkZWZlcnJlZFNlbGVjdG9yLmRvbmUoZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgc2VsZi4kKGlucHV0KS52YWwocmVzdWx0LkNTU1NlbGVjdG9yKVxuXG5cdFx0XHQvLyB1cGRhdGUgdmFsaWRhdGlvbiBmb3Igc2VsZWN0b3IgZmllbGRcbiAgICAgIHZhciB2YWxpZGF0b3IgPSB0aGlzLmdldEZvcm1WYWxpZGF0b3IoKVxuICAgICAgdmFsaWRhdG9yLnJldmFsaWRhdGVGaWVsZChpbnB1dClcbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG5cblx0LyoqXG5cdCAqIHVwZGF0ZSB0YWJsZSBzZWxlY3RvciBjb2x1bW4gZWRpdGluZyBmaWVsZHNcblx0ICovXG4gIHJlbmRlclRhYmxlSGVhZGVyQ29sdW1uczogZnVuY3Rpb24gKGhlYWRlckNvbHVtbnMpIHtcblx0XHQvLyByZXNldCBwcmV2aW91cyBjb2x1bW5zXG4gICAgdmFyICR0Ym9keSA9IHRoaXMuJCgnLmZlYXR1cmUtY29sdW1ucyB0YWJsZSB0Ym9keScpXG4gICAgJHRib2R5Lmh0bWwoJycpXG4gICAgaGVhZGVyQ29sdW1ucy5mb3JFYWNoKGZ1bmN0aW9uIChjb2x1bW4pIHtcbiAgICAgIHZhciAkcm93ID0gaWNoLlNlbGVjdG9yRWRpdFRhYmxlQ29sdW1uKGNvbHVtbilcbiAgICAgICR0Ym9keS5hcHBlbmQoJHJvdylcbiAgICB9KVxuICB9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIEhUTUwgdGhhdCB0aGUgY3VycmVudCBzZWxlY3RvciB3b3VsZCBzZWxlY3Rcblx0ICovXG4gIGdldFNlbGVjdG9ySFRNTDogZnVuY3Rpb24gKCkge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yU2l0ZW1hcCgpXG4gICAgdmFyIHNlbGVjdG9yID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvcigpXG4gICAgdmFyIGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzID0gdGhpcy5nZXRDdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcygpXG4gICAgdmFyIENTU1NlbGVjdG9yID0gc2l0ZW1hcC5zZWxlY3RvcnMuZ2V0Q1NTU2VsZWN0b3JXaXRoaW5PbmVQYWdlKHNlbGVjdG9yLmlkLCBjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcylcbiAgICB2YXIgZGVmZXJyZWRIVE1MID0gdGhpcy5jb250ZW50U2NyaXB0LmdldEhUTUwoe0NTU1NlbGVjdG9yOiBDU1NTZWxlY3Rvcn0sIHskfSlcblxuICAgIHJldHVybiBkZWZlcnJlZEhUTUxcbiAgfSxcbiAgcHJldmlld1NlbGVjdG9yOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICBpZiAoISQoYnV0dG9uKS5oYXNDbGFzcygncHJldmlldycpKSB7XG4gICAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3JTaXRlbWFwKClcbiAgICAgIHZhciBzZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3IoKVxuICAgICAgdmFyIGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzID0gdGhpcy5nZXRDdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcygpXG4gICAgICB2YXIgcGFyZW50Q1NTU2VsZWN0b3IgPSBzaXRlbWFwLnNlbGVjdG9ycy5nZXRQYXJlbnRDU1NTZWxlY3RvcldpdGhpbk9uZVBhZ2UoY3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMpXG4gICAgICB2YXIgZGVmZXJyZWRTZWxlY3RvclByZXZpZXcgPSB0aGlzLmNvbnRlbnRTY3JpcHQucHJldmlld1NlbGVjdG9yKHtcbiAgICAgICAgcGFyZW50Q1NTU2VsZWN0b3I6IHBhcmVudENTU1NlbGVjdG9yLFxuICAgICAgICBlbGVtZW50Q1NTU2VsZWN0b3I6IHNlbGVjdG9yLnNlbGVjdG9yXG4gICAgICB9LCB7JH0pXG5cbiAgICAgIGRlZmVycmVkU2VsZWN0b3JQcmV2aWV3LmRvbmUoZnVuY3Rpb24gKCkge1xuICAgICAgICAkKGJ1dHRvbikuYWRkQ2xhc3MoJ3ByZXZpZXcnKVxuICAgICAgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jb250ZW50U2NyaXB0LnJlbW92ZUN1cnJlbnRDb250ZW50U2VsZWN0b3IoKVxuICAgICAgJChidXR0b24pLnJlbW92ZUNsYXNzKCdwcmV2aWV3JylcbiAgICB9XG4gIH0sXG4gIHByZXZpZXdDbGlja0VsZW1lbnRTZWxlY3RvcjogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgaWYgKCEkKGJ1dHRvbikuaGFzQ2xhc3MoJ3ByZXZpZXcnKSkge1xuICAgICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgICB2YXIgc2VsZWN0b3IgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yKClcbiAgICAgIHZhciBjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcyA9IHRoaXMuZ2V0Q3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMoKVxuICAgICAgdmFyIHBhcmVudENTU1NlbGVjdG9yID0gc2l0ZW1hcC5zZWxlY3RvcnMuZ2V0UGFyZW50Q1NTU2VsZWN0b3JXaXRoaW5PbmVQYWdlKGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzKVxuXG4gICAgICB2YXIgZGVmZXJyZWRTZWxlY3RvclByZXZpZXcgPSB0aGlzLmNvbnRlbnRTY3JpcHQucHJldmlld1NlbGVjdG9yKHtcbiAgICAgICAgcGFyZW50Q1NTU2VsZWN0b3I6IHBhcmVudENTU1NlbGVjdG9yLFxuICAgICAgICBlbGVtZW50Q1NTU2VsZWN0b3I6IHNlbGVjdG9yLmNsaWNrRWxlbWVudFNlbGVjdG9yXG4gICAgICB9LCB7JH0pXG5cbiAgICAgIGRlZmVycmVkU2VsZWN0b3JQcmV2aWV3LmRvbmUoZnVuY3Rpb24gKCkge1xuICAgICAgICAkKGJ1dHRvbikuYWRkQ2xhc3MoJ3ByZXZpZXcnKVxuICAgICAgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jb250ZW50U2NyaXB0LnJlbW92ZUN1cnJlbnRDb250ZW50U2VsZWN0b3IoKVxuICAgICAgJChidXR0b24pLnJlbW92ZUNsYXNzKCdwcmV2aWV3JylcbiAgICB9XG4gIH0sXG4gIHByZXZpZXdUYWJsZVJvd1NlbGVjdG9yOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICBpZiAoISQoYnV0dG9uKS5oYXNDbGFzcygncHJldmlldycpKSB7XG4gICAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3JTaXRlbWFwKClcbiAgICAgIHZhciBzZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3IoKVxuICAgICAgdmFyIGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzID0gdGhpcy5nZXRDdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcygpXG4gICAgICB2YXIgcGFyZW50Q1NTU2VsZWN0b3IgPSBzaXRlbWFwLnNlbGVjdG9ycy5nZXRDU1NTZWxlY3RvcldpdGhpbk9uZVBhZ2Uoc2VsZWN0b3IuaWQsIGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzKVxuICAgICAgdmFyIHJvd1NlbGVjdG9yID0gJChidXR0b24pLmNsb3Nlc3QoJy5mb3JtLWdyb3VwJykuZmluZCgnaW5wdXQnKS52YWwoKVxuXG4gICAgICB2YXIgZGVmZXJyZWRTZWxlY3RvclByZXZpZXcgPSB0aGlzLmNvbnRlbnRTY3JpcHQucHJldmlld1NlbGVjdG9yKHtcbiAgICAgICAgcGFyZW50Q1NTU2VsZWN0b3I6IHBhcmVudENTU1NlbGVjdG9yLFxuICAgICAgICBlbGVtZW50Q1NTU2VsZWN0b3I6IHJvd1NlbGVjdG9yXG4gICAgICB9LCB7JH0pXG5cbiAgICAgIGRlZmVycmVkU2VsZWN0b3JQcmV2aWV3LmRvbmUoZnVuY3Rpb24gKCkge1xuICAgICAgICAkKGJ1dHRvbikuYWRkQ2xhc3MoJ3ByZXZpZXcnKVxuICAgICAgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jb250ZW50U2NyaXB0LnJlbW92ZUN1cnJlbnRDb250ZW50U2VsZWN0b3IoKVxuICAgICAgJChidXR0b24pLnJlbW92ZUNsYXNzKCdwcmV2aWV3JylcbiAgICB9XG4gIH0sXG4gIHByZXZpZXdTZWxlY3RvckZyb21TZWxlY3RvclRyZWU6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIGlmICghJChidXR0b24pLmhhc0NsYXNzKCdwcmV2aWV3JykpIHtcbiAgICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcFxuICAgICAgdmFyIHNlbGVjdG9yID0gJChidXR0b24pLmNsb3Nlc3QoJ3RyJykuZGF0YSgnc2VsZWN0b3InKVxuICAgICAgdmFyIGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzID0gdGhpcy5nZXRDdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcygpXG4gICAgICB2YXIgcGFyZW50Q1NTU2VsZWN0b3IgPSBzaXRlbWFwLnNlbGVjdG9ycy5nZXRQYXJlbnRDU1NTZWxlY3RvcldpdGhpbk9uZVBhZ2UoY3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMpXG4gICAgICB2YXIgZGVmZXJyZWRTZWxlY3RvclByZXZpZXcgPSB0aGlzLmNvbnRlbnRTY3JpcHQucHJldmlld1NlbGVjdG9yKHtcbiAgICAgICAgcGFyZW50Q1NTU2VsZWN0b3I6IHBhcmVudENTU1NlbGVjdG9yLFxuICAgICAgICBlbGVtZW50Q1NTU2VsZWN0b3I6IHNlbGVjdG9yLnNlbGVjdG9yXG4gICAgICB9LCB7JH0pXG5cbiAgICAgIGRlZmVycmVkU2VsZWN0b3JQcmV2aWV3LmRvbmUoZnVuY3Rpb24gKCkge1xuICAgICAgICAkKGJ1dHRvbikuYWRkQ2xhc3MoJ3ByZXZpZXcnKVxuICAgICAgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jb250ZW50U2NyaXB0LnJlbW92ZUN1cnJlbnRDb250ZW50U2VsZWN0b3IoKVxuICAgICAgJChidXR0b24pLnJlbW92ZUNsYXNzKCdwcmV2aWV3JylcbiAgICB9XG4gIH0sXG4gIHByZXZpZXdTZWxlY3RvckRhdGFGcm9tU2VsZWN0b3JUcmVlOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgdmFyIHNlbGVjdG9yID0gc2VsZi4kKGJ1dHRvbikuY2xvc2VzdCgndHInKS5kYXRhKCdzZWxlY3RvcicpXG4gICAgdGhpcy5wcmV2aWV3U2VsZWN0b3JEYXRhKHNpdGVtYXAsIHNlbGVjdG9yLmlkKVxuICB9LFxuICBwcmV2aWV3U2VsZWN0b3JEYXRhRnJvbVNlbGVjdG9yRWRpdGluZzogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcC5jbG9uZSgpXG4gICAgdmFyIHNlbGVjdG9yID0gc2l0ZW1hcC5nZXRTZWxlY3RvckJ5SWQodGhpcy5zdGF0ZS5jdXJyZW50U2VsZWN0b3IuaWQpXG4gICAgdmFyIG5ld1NlbGVjdG9yID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvcigpXG4gICAgc2l0ZW1hcC51cGRhdGVTZWxlY3RvcihzZWxlY3RvciwgbmV3U2VsZWN0b3IpXG4gICAgdGhpcy5wcmV2aWV3U2VsZWN0b3JEYXRhKHNpdGVtYXAsIG5ld1NlbGVjdG9yLmlkKVxuICB9LFxuXHQvKipcblx0ICogUmV0dXJucyBhIGxpc3Qgb2Ygc2VsZWN0b3IgaWRzIHRoYXQgdGhlIHVzZXIgaGFzIG9wZW5lZFxuXHQgKiBAcmV0dXJucyB7QXJyYXl9XG5cdCAqL1xuICBnZXRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHBhcmVudFNlbGVjdG9ySWRzID0gW11cbiAgICB0aGlzLnN0YXRlLmVkaXRTaXRlbWFwQnJlYWRjdW1ic1NlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgcGFyZW50U2VsZWN0b3JJZHMucHVzaChzZWxlY3Rvci5pZClcbiAgICB9KVxuICAgIHJldHVybiBwYXJlbnRTZWxlY3Rvcklkc1xuICB9LFxuICBwcmV2aWV3U2VsZWN0b3JEYXRhOiBmdW5jdGlvbiAoc2l0ZW1hcCwgc2VsZWN0b3JJZCkge1xuXHRcdC8vIGRhdGEgcHJldmlldyB3aWxsIGJlIGJhc2Ugb24gaG93IHRoZSBzZWxlY3RvciB0cmVlIGlzIG9wZW5lZFxuICAgIHZhciBwYXJlbnRTZWxlY3RvcklkcyA9IHRoaXMuZ2V0U3RhdGVQYXJlbnRTZWxlY3RvcklkcygpXG5cbiAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgIHZhciByZXF1ZXN0ID0ge1xuICAgICAgcHJldmlld1NlbGVjdG9yRGF0YTogdHJ1ZSxcbiAgICAgIHNpdGVtYXA6IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoc2l0ZW1hcCkpLFxuICAgICAgcGFyZW50U2VsZWN0b3JJZHM6IHBhcmVudFNlbGVjdG9ySWRzLFxuICAgICAgc2VsZWN0b3JJZDogc2VsZWN0b3JJZFxuICAgIH1cbiAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZShyZXF1ZXN0LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgIGlmIChyZXNwb25zZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgZGF0YUNvbHVtbnMgPSBPYmplY3Qua2V5cyhyZXNwb25zZVswXSlcblxuICAgICAgY29uc29sZS5sb2coZGF0YUNvbHVtbnMpXG5cbiAgICAgIHZhciAkZGF0YVByZXZpZXdQYW5lbCA9IGljaC5EYXRhUHJldmlldyh7XG4gICAgICAgIGNvbHVtbnM6IGRhdGFDb2x1bW5zXG4gICAgICB9KVxuICAgICAgc2VsZi4kKCcjdmlld3BvcnQnKS5hcHBlbmQoJGRhdGFQcmV2aWV3UGFuZWwpXG4gICAgICAkZGF0YVByZXZpZXdQYW5lbC5tb2RhbCgnc2hvdycpXG5cdFx0XHQvLyBkaXNwbGF5IGRhdGFcblx0XHRcdC8vIERvaW5nIHRoaXMgdGhlIGxvbmcgd2F5IHNvIHRoZXJlIGFyZW4ndCB4c3MgdnVsbmVydWJpbGl0ZXNcblx0XHRcdC8vIHdoaWxlIHdvcmtpbmcgd2l0aCBkYXRhIG9yIHdpdGggdGhlIHNlbGVjdG9yIHRpdGxlc1xuICAgICAgdmFyICR0Ym9keSA9IHNlbGYuJCgndGJvZHknLCAkZGF0YVByZXZpZXdQYW5lbClcbiAgICAgIHJlc3BvbnNlLmZvckVhY2goZnVuY3Rpb24gKHJvdykge1xuICAgICAgICB2YXIgJHRyID0gc2VsZi4kKCc8dHI+PC90cj4nKVxuICAgICAgICBkYXRhQ29sdW1ucy5mb3JFYWNoKGZ1bmN0aW9uIChjb2x1bW4pIHtcbiAgICAgICAgICB2YXIgJHRkID0gc2VsZi4kKCc8dGQ+PC90ZD4nKVxuICAgICAgICAgIHZhciBjZWxsRGF0YSA9IHJvd1tjb2x1bW5dXG4gICAgICAgICAgaWYgKHR5cGVvZiBjZWxsRGF0YSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGNlbGxEYXRhID0gSlNPTi5zdHJpbmdpZnkoY2VsbERhdGEpXG4gICAgICAgICAgfVxuICAgICAgICAgICR0ZC50ZXh0KGNlbGxEYXRhKVxuICAgICAgICAgICR0ci5hcHBlbmQoJHRkKVxuICAgICAgICB9KVxuICAgICAgICAkdGJvZHkuYXBwZW5kKCR0cilcbiAgICAgIH0pXG5cbiAgICAgIHZhciB3aW5kb3dIZWlnaHQgPSBzZWxmLiQod2luZG93KS5oZWlnaHQoKVxuXG4gICAgICBzZWxmLiQoJy5kYXRhLXByZXZpZXctbW9kYWwgLm1vZGFsLWJvZHknKS5oZWlnaHQod2luZG93SGVpZ2h0IC0gMTMwKVxuXG5cdFx0XHQvLyByZW1vdmUgbW9kYWwgZnJvbSBkb20gYWZ0ZXIgaXQgaXMgY2xvc2VkXG4gICAgICAkZGF0YVByZXZpZXdQYW5lbC5vbignaGlkZGVuLmJzLm1vZGFsJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxmLiQodGhpcykucmVtb3ZlKClcbiAgICAgIH0pXG4gICAgfSlcbiAgfSxcblx0LyoqXG5cdCAqIEFkZCBzdGFydCB1cmwgdG8gc2l0ZW1hcCBjcmVhdGlvbiBvciBlZGl0aW5nIGZvcm1cblx0ICogQHBhcmFtIGJ1dHRvblxuXHQgKi9cbiAgYWRkU3RhcnRVcmw6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICB2YXIgJHN0YXJ0VXJsSW5wdXRGaWVsZCA9IGljaC5TaXRlbWFwU3RhcnRVcmxGaWVsZCgpXG4gICAgc2VsZi4kKCcjdmlld3BvcnQgLnN0YXJ0LXVybC1ibG9jazpsYXN0JykuYWZ0ZXIoJHN0YXJ0VXJsSW5wdXRGaWVsZClcbiAgICB2YXIgdmFsaWRhdG9yID0gdGhpcy5nZXRGb3JtVmFsaWRhdG9yKClcbiAgICB2YWxpZGF0b3IuYWRkRmllbGQoJHN0YXJ0VXJsSW5wdXRGaWVsZC5maW5kKCdpbnB1dCcpKVxuICB9LFxuXHQvKipcblx0ICogUmVtb3ZlIHN0YXJ0IHVybCBmcm9tIHNpdGVtYXAgY3JlYXRpb24gb3IgZWRpdGluZyBmb3JtLlxuXHQgKiBAcGFyYW0gYnV0dG9uXG5cdCAqL1xuICByZW1vdmVTdGFydFVybDogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIHZhciAkYmxvY2sgPSBzZWxmLiQoYnV0dG9uKS5jbG9zZXN0KCcuc3RhcnQtdXJsLWJsb2NrJylcbiAgICBpZiAoc2VsZi4kKCcjdmlld3BvcnQgLnN0YXJ0LXVybC1ibG9jaycpLmxlbmd0aCA+IDEpIHtcblx0XHRcdC8vIHJlbW92ZSBmcm9tIHZhbGlkYXRvclxuICAgICAgdmFyIHZhbGlkYXRvciA9IHRoaXMuZ2V0Rm9ybVZhbGlkYXRvcigpXG4gICAgICB2YWxpZGF0b3IucmVtb3ZlRmllbGQoJGJsb2NrLmZpbmQoJ2lucHV0JykpXG5cbiAgICAgICRibG9jay5yZW1vdmUoKVxuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNpdGVtYXBDb250cm9sbGVyXG4iLCIvKipcbiAqIEVsZW1lbnQgc2VsZWN0b3IuIFVzZXMgalF1ZXJ5IGFzIGJhc2UgYW5kIGFkZHMgc29tZSBtb3JlIGZlYXR1cmVzXG4gKiBAcGFyYW0gQ1NTU2VsZWN0b3JcbiAqIEBwYXJhbSBwYXJlbnRFbGVtZW50XG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG52YXIgRWxlbWVudFF1ZXJ5ID0gZnVuY3Rpb24gKENTU1NlbGVjdG9yLCBwYXJlbnRFbGVtZW50LCBvcHRpb25zKSB7XG4gIENTU1NlbGVjdG9yID0gQ1NTU2VsZWN0b3IgfHwgJydcbiAgdGhpcy4kID0gb3B0aW9ucy4kXG50aGlzLmRvY3VtZW50ID0gb3B0aW9ucy5kb2N1bWVudFxudGhpcy53aW5kb3cgPSBvcHRpb25zLndpbmRvd1xuICBpZiAoIXRoaXMuJCkgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIGpxdWVyeSBmb3IgRWxlbWVudFF1ZXJ5JylcbmlmICghdGhpcy5kb2N1bWVudCkgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyBkb2N1bWVudFwiKVxuaWYoIXRoaXMud2luZG93KXRocm93IG5ldyBFcnJvcihcIk1pc3Npbmcgd2luZG93XCIpXG4gIHZhciBzZWxlY3RlZEVsZW1lbnRzID0gW11cblxuICB2YXIgYWRkRWxlbWVudCA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgaWYgKHNlbGVjdGVkRWxlbWVudHMuaW5kZXhPZihlbGVtZW50KSA9PT0gLTEpIHtcbiAgICAgIHNlbGVjdGVkRWxlbWVudHMucHVzaChlbGVtZW50KVxuICAgIH1cbiAgfVxuXG4gIHZhciBzZWxlY3RvclBhcnRzID0gRWxlbWVudFF1ZXJ5LmdldFNlbGVjdG9yUGFydHMoQ1NTU2VsZWN0b3IpXG4gIHZhciBzZWxmID0gdGhpc1xuICBzZWxlY3RvclBhcnRzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG5cdFx0Ly8gaGFuZGxlIHNwZWNpYWwgY2FzZSB3aGVuIHBhcmVudCBpcyBzZWxlY3RlZFxuICAgIGlmIChzZWxlY3RvciA9PT0gJ19wYXJlbnRfJykge1xuICAgICAgc2VsZi4kKHBhcmVudEVsZW1lbnQpLmVhY2goZnVuY3Rpb24gKGksIGVsZW1lbnQpIHtcbiAgICAgICAgYWRkRWxlbWVudChlbGVtZW50KVxuICAgICAgfSlcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgdmFyIGVsZW1lbnRzID0gc2VsZi4kKHNlbGVjdG9yLCBzZWxmLiQocGFyZW50RWxlbWVudCkpXG4gICAgICBlbGVtZW50cy5lYWNoKGZ1bmN0aW9uIChpLCBlbGVtZW50KSB7XG4gICAgICAgIGFkZEVsZW1lbnQoZWxlbWVudClcbiAgICAgIH0pXG4gICAgfVxuICB9KVxuXG4gIHJldHVybiBzZWxlY3RlZEVsZW1lbnRzXG59XG5cbkVsZW1lbnRRdWVyeS5nZXRTZWxlY3RvclBhcnRzID0gZnVuY3Rpb24gKENTU1NlbGVjdG9yKSB7XG4gIHZhciBzZWxlY3RvcnMgPSBDU1NTZWxlY3Rvci5zcGxpdCgvKCx8XCIuKj9cInwnLio/J3xcXCguKj9cXCkpLylcblxuICB2YXIgcmVzdWx0U2VsZWN0b3JzID0gW11cbiAgdmFyIGN1cnJlbnRTZWxlY3RvciA9ICcnXG4gIHNlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgIGlmIChzZWxlY3RvciA9PT0gJywnKSB7XG4gICAgICBpZiAoY3VycmVudFNlbGVjdG9yLnRyaW0oKS5sZW5ndGgpIHtcbiAgICAgICAgcmVzdWx0U2VsZWN0b3JzLnB1c2goY3VycmVudFNlbGVjdG9yLnRyaW0oKSlcbiAgICAgIH1cbiAgICAgIGN1cnJlbnRTZWxlY3RvciA9ICcnXG4gICAgfVx0XHRlbHNlIHtcbiAgICAgIGN1cnJlbnRTZWxlY3RvciArPSBzZWxlY3RvclxuICAgIH1cbiAgfSlcbiAgaWYgKGN1cnJlbnRTZWxlY3Rvci50cmltKCkubGVuZ3RoKSB7XG4gICAgcmVzdWx0U2VsZWN0b3JzLnB1c2goY3VycmVudFNlbGVjdG9yLnRyaW0oKSlcbiAgfVxuXG4gIHJldHVybiByZXN1bHRTZWxlY3RvcnNcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFbGVtZW50UXVlcnlcbiIsInZhciBzZWxlY3RvcnMgPSByZXF1aXJlKCcuL1NlbGVjdG9ycycpXG52YXIgRWxlbWVudFF1ZXJ5ID0gcmVxdWlyZSgnLi9FbGVtZW50UXVlcnknKVxudmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG5cbnZhciBTZWxlY3RvciA9IGZ1bmN0aW9uIChzZWxlY3Rvciwgb3B0aW9ucykge1xuICB0aGlzLiQgPSBvcHRpb25zLiRcbnRoaXMuZG9jdW1lbnQgPSBvcHRpb25zLmRvY3VtZW50XG50aGlzLndpbmRvdyA9IG9wdGlvbnMud2luZG93XG4gIGlmICghdGhpcy4kKSB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcganF1ZXJ5JylcbmlmICghdGhpcy5kb2N1bWVudCkgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyBkb2N1bWVudFwiKVxuaWYoIXRoaXMud2luZG93KXRocm93IG5ldyBFcnJvcihcIk1pc3Npbmcgd2luZG93XCIpXG5cbiAgdGhpcy51cGRhdGVEYXRhKHNlbGVjdG9yKVxuICB0aGlzLmluaXRUeXBlKClcbn1cblxuU2VsZWN0b3IucHJvdG90eXBlID0ge1xuXG5cdC8qKlxuXHQgKiBJcyB0aGlzIHNlbGVjdG9yIGNvbmZpZ3VyZWQgdG8gcmV0dXJuIG11bHRpcGxlIGl0ZW1zP1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICovXG4gIHdpbGxSZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5jYW5SZXR1cm5NdWx0aXBsZVJlY29yZHMoKSAmJiB0aGlzLm11bHRpcGxlXG4gIH0sXG5cblx0LyoqXG5cdCAqIFVwZGF0ZSBjdXJyZW50IHNlbGVjdG9yIGNvbmZpZ3VyYXRpb25cblx0ICogQHBhcmFtIGRhdGFcblx0ICovXG4gIHVwZGF0ZURhdGE6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdmFyIGFsbG93ZWRLZXlzID0gWydpZCcsICd0eXBlJywgJ3NlbGVjdG9yJywgJ3BhcmVudFNlbGVjdG9ycyddXG4gICAgY29uc29sZS5sb2coJ2RhdGEgdHlwZScsIGRhdGEudHlwZSlcbiAgICBhbGxvd2VkS2V5cyA9IGFsbG93ZWRLZXlzLmNvbmNhdChzZWxlY3RvcnNbZGF0YS50eXBlXS5nZXRGZWF0dXJlcygpKVxuICAgIHZhciBrZXlcblx0XHQvLyB1cGRhdGUgZGF0YVxuICAgIGZvciAoa2V5IGluIGRhdGEpIHtcbiAgICAgIGlmIChhbGxvd2VkS2V5cy5pbmRleE9mKGtleSkgIT09IC0xIHx8IHR5cGVvZiBkYXRhW2tleV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpc1trZXldID0gZGF0YVtrZXldXG4gICAgICB9XG4gICAgfVxuXG5cdFx0Ly8gcmVtb3ZlIHZhbHVlcyB0aGF0IGFyZSBub3QgbmVlZGVkIGZvciB0aGlzIHR5cGUgb2Ygc2VsZWN0b3JcbiAgICBmb3IgKGtleSBpbiB0aGlzKSB7XG4gICAgICBpZiAoYWxsb3dlZEtleXMuaW5kZXhPZihrZXkpID09PSAtMSAmJiB0eXBlb2YgdGhpc1trZXldICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzW2tleV1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cblx0LyoqXG5cdCAqIENTUyBzZWxlY3RvciB3aGljaCB3aWxsIGJlIHVzZWQgZm9yIGVsZW1lbnQgc2VsZWN0aW9uXG5cdCAqIEByZXR1cm5zIHtzdHJpbmd9XG5cdCAqL1xuICBnZXRJdGVtQ1NTU2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gJyonXG4gIH0sXG5cblx0LyoqXG5cdCAqIG92ZXJyaWRlIG9iamVjdHMgbWV0aG9kcyBiYXNlZCBvbiBzZWxldG9yIHR5cGVcblx0ICovXG4gIGluaXRUeXBlOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHNlbGVjdG9yc1t0aGlzLnR5cGVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignU2VsZWN0b3IgdHlwZSBub3QgZGVmaW5lZCAnICsgdGhpcy50eXBlKVxuICAgIH1cblxuXHRcdC8vIG92ZXJyaWRlcyBvYmplY3RzIG1ldGhvZHNcbiAgICBmb3IgKHZhciBpIGluIHNlbGVjdG9yc1t0aGlzLnR5cGVdKSB7XG4gICAgICB0aGlzW2ldID0gc2VsZWN0b3JzW3RoaXMudHlwZV1baV1cbiAgICB9XG4gIH0sXG5cblx0LyoqXG5cdCAqIENoZWNrIHdoZXRoZXIgYSBzZWxlY3RvciBpcyBhIHBhcmVuIHNlbGVjdG9yIG9mIHRoaXMgc2VsZWN0b3Jcblx0ICogQHBhcmFtIHNlbGVjdG9ySWRcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuICBoYXNQYXJlbnRTZWxlY3RvcjogZnVuY3Rpb24gKHNlbGVjdG9ySWQpIHtcbiAgICByZXR1cm4gKHRoaXMucGFyZW50U2VsZWN0b3JzLmluZGV4T2Yoc2VsZWN0b3JJZCkgIT09IC0xKVxuICB9LFxuXG4gIHJlbW92ZVBhcmVudFNlbGVjdG9yOiBmdW5jdGlvbiAoc2VsZWN0b3JJZCkge1xuICAgIHZhciBpbmRleCA9IHRoaXMucGFyZW50U2VsZWN0b3JzLmluZGV4T2Yoc2VsZWN0b3JJZClcbiAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICB0aGlzLnBhcmVudFNlbGVjdG9ycy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgfVxuICB9LFxuXG4gIHJlbmFtZVBhcmVudFNlbGVjdG9yOiBmdW5jdGlvbiAob3JpZ2luYWxJZCwgcmVwbGFjZW1lbnRJZCkge1xuICAgIGlmICh0aGlzLmhhc1BhcmVudFNlbGVjdG9yKG9yaWdpbmFsSWQpKSB7XG4gICAgICB2YXIgcG9zID0gdGhpcy5wYXJlbnRTZWxlY3RvcnMuaW5kZXhPZihvcmlnaW5hbElkKVxuICAgICAgdGhpcy5wYXJlbnRTZWxlY3RvcnMuc3BsaWNlKHBvcywgMSwgcmVwbGFjZW1lbnRJZClcbiAgICB9XG4gIH0sXG5cbiAgZ2V0RGF0YUVsZW1lbnRzOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIGVsZW1lbnRzID0gRWxlbWVudFF1ZXJ5KHRoaXMuc2VsZWN0b3IsIHBhcmVudEVsZW1lbnQsIHskfSlcbiAgICBpZiAodGhpcy5tdWx0aXBsZSkge1xuICAgICAgcmV0dXJuIGVsZW1lbnRzXG4gICAgfSBlbHNlIGlmIChlbGVtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gW2VsZW1lbnRzWzBdXVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gW11cbiAgICB9XG4gIH0sXG5cbiAgZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIHRpbWVvdXQgPSB0aGlzLmRlbGF5IHx8IDBcblxuXHRcdC8vIHRoaXMgd29ya3MgbXVjaCBmYXN0ZXIgYmVjYXVzZSB3aGVuQ2FsbFNlcXVlbnRhbGx5IGlzbid0IHJ1bm5pbmcgbmV4dCBkYXRhIGV4dHJhY3Rpb24gaW1tZWRpYXRlbHlcbiAgICBpZiAodGltZW91dCA9PT0gMCkge1xuICAgICAgdmFyIGRlZmVycmVkRGF0YSA9IHRoaXMuX2dldERhdGEocGFyZW50RWxlbWVudClcbiAgICAgIGRlZmVycmVkRGF0YS5kb25lKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIGQucmVzb2x2ZShkYXRhKVxuICAgICAgfSlcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkZWZlcnJlZERhdGEgPSB0aGlzLl9nZXREYXRhKHBhcmVudEVsZW1lbnQpXG4gICAgICAgIGRlZmVycmVkRGF0YS5kb25lKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgZC5yZXNvbHZlKGRhdGEpXG4gICAgICAgIH0pXG4gICAgICB9LmJpbmQodGhpcyksIHRpbWVvdXQpXG4gICAgfVxuXG4gICAgcmV0dXJuIGQucHJvbWlzZSgpXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvclxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG5cbnZhciBTZWxlY3RvckVsZW1lbnQgPSB7XG5cbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBkZmQgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcbiAgICBkZmQucmVzb2x2ZSh0aGlzLiQubWFrZUFycmF5KGVsZW1lbnRzKSlcblxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW11cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2RlbGF5J11cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yRWxlbWVudFxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgU2VsZWN0b3JFbGVtZW50QXR0cmlidXRlID0ge1xuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcblxuICAgIHZhciByZXN1bHQgPSBbXVxuICAgIHNlbGYuJChlbGVtZW50cykuZWFjaChmdW5jdGlvbiAoaywgZWxlbWVudCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuXG4gICAgICBkYXRhW3RoaXMuaWRdID0gc2VsZi4kKGVsZW1lbnQpLmF0dHIodGhpcy5leHRyYWN0QXR0cmlidXRlKVxuICAgICAgcmVzdWx0LnB1c2goZGF0YSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICBpZiAodGhpcy5tdWx0aXBsZSA9PT0gZmFsc2UgJiYgZWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICBkYXRhW3RoaXMuaWQgKyAnLXNyYyddID0gbnVsbFxuICAgICAgcmVzdWx0LnB1c2goZGF0YSlcbiAgICB9XG4gICAgZGZkLnJlc29sdmUocmVzdWx0KVxuXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbdGhpcy5pZF1cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2V4dHJhY3RBdHRyaWJ1dGUnLCAnZGVsYXknXVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JFbGVtZW50QXR0cmlidXRlXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciBVbmlxdWVFbGVtZW50TGlzdCA9IHJlcXVpcmUoJy4vLi4vVW5pcXVlRWxlbWVudExpc3QnKVxudmFyIEVsZW1lbnRRdWVyeSA9IHJlcXVpcmUoJy4vLi4vRWxlbWVudFF1ZXJ5JylcbnZhciBDc3NTZWxlY3RvciA9IHJlcXVpcmUoJ2Nzcy1zZWxlY3RvcicpLkNzc1NlbGVjdG9yXG52YXIgU2VsZWN0b3JFbGVtZW50Q2xpY2sgPSB7XG5cbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgZ2V0Q2xpY2tFbGVtZW50czogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIHZhciBjbGlja0VsZW1lbnRzID0gRWxlbWVudFF1ZXJ5KHRoaXMuY2xpY2tFbGVtZW50U2VsZWN0b3IsIHBhcmVudEVsZW1lbnQsIHskfSlcbiAgICByZXR1cm4gY2xpY2tFbGVtZW50c1xuICB9LFxuXG5cdC8qKlxuXHQgKiBDaGVjayB3aGV0aGVyIGVsZW1lbnQgaXMgc3RpbGwgcmVhY2hhYmxlIGZyb20gaHRtbC4gVXNlZnVsIHRvIGNoZWNrIHdoZXRoZXIgdGhlIGVsZW1lbnQgaXMgcmVtb3ZlZCBmcm9tIERPTS5cblx0ICogQHBhcmFtIGVsZW1lbnRcblx0ICovXG4gIGlzRWxlbWVudEluSFRNTDogZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICByZXR1cm4gdGhpcy4kKGVsZW1lbnQpLmNsb3Nlc3QoJ2h0bWwnKS5sZW5ndGggIT09IDBcbiAgfSxcblxuICB0cmlnZ2VyQnV0dG9uQ2xpY2s6IGZ1bmN0aW9uIChjbGlja0VsZW1lbnQpIHtcbiAgICB2YXIgZG9jdW1lbnQgPSB0aGlzLmRvY3VtZW50XG4gICAgdmFyIGNzID0gbmV3IENzc1NlbGVjdG9yKHtcbiAgICAgIGVuYWJsZVNtYXJ0VGFibGVTZWxlY3RvcjogZmFsc2UsXG4gICAgICBwYXJlbnQ6IHRoaXMuJCgnYm9keScpWzBdLFxuICAgICAgZW5hYmxlUmVzdWx0U3RyaXBwaW5nOiBmYWxzZVxuICAgIH0pXG4gICAgdmFyIGNzc1NlbGVjdG9yID0gY3MuZ2V0Q3NzU2VsZWN0b3IoW2NsaWNrRWxlbWVudF0pXG5cblx0XHQvLyB0aGlzIGZ1bmN0aW9uIHdpbGwgY2F0Y2ggd2luZG93Lm9wZW4gY2FsbCBhbmQgcGxhY2UgdGhlIHJlcXVlc3RlZCB1cmwgYXMgdGhlIGVsZW1lbnRzIGRhdGEgYXR0cmlidXRlXG4gICAgdmFyIHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpXG4gICAgc2NyaXB0LnR5cGUgPSAndGV4dC9qYXZhc2NyaXB0J1xuICAgIHNjcmlwdC50ZXh0ID0gJycgK1xuXHRcdFx0JyhmdW5jdGlvbigpeyAnICtcblx0XHRcdFwidmFyIGVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnXCIgKyBjc3NTZWxlY3RvciArIFwiJylbMF07IFwiICtcblx0XHRcdCdlbC5jbGljaygpOyAnICtcblx0XHRcdCd9KSgpOydcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHNjcmlwdClcbiAgfSxcblxuICBnZXRDbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZTogZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiAndW5pcXVlVGV4dCdcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGVcbiAgICB9XG4gIH0sXG5cbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICB2YXIgZGVsYXkgPSBwYXJzZUludCh0aGlzLmRlbGF5KSB8fCAwXG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciBmb3VuZEVsZW1lbnRzID0gbmV3IFVuaXF1ZUVsZW1lbnRMaXN0KCd1bmlxdWVUZXh0JywgeyR9KVxuICAgIHZhciBjbGlja0VsZW1lbnRzID0gdGhpcy5nZXRDbGlja0VsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG4gICAgdmFyIGRvbmVDbGlja2luZ0VsZW1lbnRzID0gbmV3IFVuaXF1ZUVsZW1lbnRMaXN0KHRoaXMuZ2V0Q2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUoKSwgeyR9KVxuXG5cdFx0Ly8gYWRkIGVsZW1lbnRzIHRoYXQgYXJlIGF2YWlsYWJsZSBiZWZvcmUgY2xpY2tpbmdcbiAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuICAgIGVsZW1lbnRzLmZvckVhY2goZm91bmRFbGVtZW50cy5wdXNoLmJpbmQoZm91bmRFbGVtZW50cykpXG5cblx0XHQvLyBkaXNjYXJkIGluaXRpYWwgZWxlbWVudHNcbiAgICBpZiAodGhpcy5kaXNjYXJkSW5pdGlhbEVsZW1lbnRzKSB7XG4gICAgICBmb3VuZEVsZW1lbnRzID0gbmV3IFVuaXF1ZUVsZW1lbnRMaXN0KCd1bmlxdWVUZXh0JywgeyR9KVxuICAgIH1cblxuXHRcdC8vIG5vIGVsZW1lbnRzIHRvIGNsaWNrIGF0IHRoZSBiZWdpbm5pbmdcbiAgICBpZiAoY2xpY2tFbGVtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZShmb3VuZEVsZW1lbnRzKVxuICAgICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gICAgfVxuXG5cdFx0Ly8gaW5pdGlhbCBjbGljayBhbmQgd2FpdFxuICAgIHZhciBjdXJyZW50Q2xpY2tFbGVtZW50ID0gY2xpY2tFbGVtZW50c1swXVxuICAgIHRoaXMudHJpZ2dlckJ1dHRvbkNsaWNrKGN1cnJlbnRDbGlja0VsZW1lbnQpXG4gICAgdmFyIG5leHRFbGVtZW50U2VsZWN0aW9uID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKSArIGRlbGF5XG5cblx0XHQvLyBpbmZpbml0ZWx5IHNjcm9sbCBkb3duIGFuZCBmaW5kIGFsbCBpdGVtc1xuICAgIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcblx0XHRcdC8vIGZpbmQgdGhvc2UgY2xpY2sgZWxlbWVudHMgdGhhdCBhcmUgbm90IGluIHRoZSBibGFjayBsaXN0XG4gICAgICB2YXIgYWxsQ2xpY2tFbGVtZW50cyA9IHRoaXMuZ2V0Q2xpY2tFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuICAgICAgY2xpY2tFbGVtZW50cyA9IFtdXG4gICAgICBhbGxDbGlja0VsZW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgaWYgKCFkb25lQ2xpY2tpbmdFbGVtZW50cy5pc0FkZGVkKGVsZW1lbnQpKSB7XG4gICAgICAgICAgY2xpY2tFbGVtZW50cy5wdXNoKGVsZW1lbnQpXG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIHZhciBub3cgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpXG5cdFx0XHQvLyBzbGVlcC4gd2FpdCB3aGVuIHRvIGV4dHJhY3QgbmV4dCBlbGVtZW50c1xuICAgICAgaWYgKG5vdyA8IG5leHRFbGVtZW50U2VsZWN0aW9uKSB7XG5cdFx0XHRcdC8vIGNvbnNvbGUubG9nKFwid2FpdFwiKTtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cblx0XHRcdC8vIGFkZCBuZXdseSBmb3VuZCBlbGVtZW50cyB0byBlbGVtZW50IGZvdW5kRWxlbWVudHMgYXJyYXkuXG4gICAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuICAgICAgdmFyIGFkZGVkQW5FbGVtZW50ID0gZmFsc2VcbiAgICAgIGVsZW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgdmFyIGFkZGVkID0gZm91bmRFbGVtZW50cy5wdXNoKGVsZW1lbnQpXG4gICAgICAgIGlmIChhZGRlZCkge1xuICAgICAgICAgIGFkZGVkQW5FbGVtZW50ID0gdHJ1ZVxuICAgICAgICB9XG4gICAgICB9KVxuXHRcdFx0Ly8gY29uc29sZS5sb2coXCJhZGRlZFwiLCBhZGRlZEFuRWxlbWVudCk7XG5cblx0XHRcdC8vIG5vIG5ldyBlbGVtZW50cyBmb3VuZC4gU3RvcCBjbGlja2luZyB0aGlzIGJ1dHRvblxuICAgICAgaWYgKCFhZGRlZEFuRWxlbWVudCkge1xuICAgICAgICBkb25lQ2xpY2tpbmdFbGVtZW50cy5wdXNoKGN1cnJlbnRDbGlja0VsZW1lbnQpXG4gICAgICB9XG5cblx0XHRcdC8vIGNvbnRpbnVlIGNsaWNraW5nIGFuZCBhZGQgZGVsYXksIGJ1dCBpZiB0aGVyZSBpcyBub3RoaW5nXG5cdFx0XHQvLyBtb3JlIHRvIGNsaWNrIHRoZSBmaW5pc2hcblx0XHRcdC8vIGNvbnNvbGUubG9nKFwidG90YWwgYnV0dG9uc1wiLCBjbGlja0VsZW1lbnRzLmxlbmd0aClcbiAgICAgIGlmIChjbGlja0VsZW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKVxuICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUoZm91bmRFbGVtZW50cylcbiAgICAgIH0gZWxzZSB7XG5cdFx0XHRcdC8vIGNvbnNvbGUubG9nKFwiY2xpY2tcIik7XG4gICAgICAgIGN1cnJlbnRDbGlja0VsZW1lbnQgPSBjbGlja0VsZW1lbnRzWzBdXG5cdFx0XHRcdC8vIGNsaWNrIG9uIGVsZW1lbnRzIG9ubHkgb25jZSBpZiB0aGUgdHlwZSBpcyBjbGlja29uY2VcbiAgICAgICAgaWYgKHRoaXMuY2xpY2tUeXBlID09PSAnY2xpY2tPbmNlJykge1xuICAgICAgICAgIGRvbmVDbGlja2luZ0VsZW1lbnRzLnB1c2goY3VycmVudENsaWNrRWxlbWVudClcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnRyaWdnZXJCdXR0b25DbGljayhjdXJyZW50Q2xpY2tFbGVtZW50KVxuICAgICAgICBuZXh0RWxlbWVudFNlbGVjdGlvbiA9IG5vdyArIGRlbGF5XG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpLCA1MClcblxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFtdXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydtdWx0aXBsZScsICdkZWxheScsICdjbGlja0VsZW1lbnRTZWxlY3RvcicsICdjbGlja1R5cGUnLCAnZGlzY2FyZEluaXRpYWxFbGVtZW50cycsICdjbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSddXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvckVsZW1lbnRDbGlja1xuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgU2VsZWN0b3JFbGVtZW50U2Nyb2xsID0ge1xuXG4gIGNhblJldHVybk11bHRpcGxlUmVjb3JkczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUNoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlTG9jYWxDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuICBzY3JvbGxUb0JvdHRvbTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBkb2N1bWVudCA9IHRoaXMuZG9jdW1lbnRcbiAgICB3aW5kb3cuc2Nyb2xsVG8oMCwgZG9jdW1lbnQuYm9keS5zY3JvbGxIZWlnaHQpXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBkZWxheSA9IHBhcnNlSW50KHRoaXMuZGVsYXkpIHx8IDBcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIGZvdW5kRWxlbWVudHMgPSBbXVxuXG5cdFx0Ly8gaW5pdGlhbGx5IHNjcm9sbCBkb3duIGFuZCB3YWl0XG4gICAgdGhpcy5zY3JvbGxUb0JvdHRvbSgpXG4gICAgdmFyIG5leHRFbGVtZW50U2VsZWN0aW9uID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKSArIGRlbGF5XG5cblx0XHQvLyBpbmZpbml0ZWx5IHNjcm9sbCBkb3duIGFuZCBmaW5kIGFsbCBpdGVtc1xuICAgIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBub3cgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpXG5cdFx0XHQvLyBzbGVlcC4gd2FpdCB3aGVuIHRvIGV4dHJhY3QgbmV4dCBlbGVtZW50c1xuICAgICAgaWYgKG5vdyA8IG5leHRFbGVtZW50U2VsZWN0aW9uKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuXHRcdFx0Ly8gbm8gbmV3IGVsZW1lbnRzIGZvdW5kXG4gICAgICBpZiAoZWxlbWVudHMubGVuZ3RoID09PSBmb3VuZEVsZW1lbnRzLmxlbmd0aCkge1xuICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKVxuICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUodGhpcy4kLm1ha2VBcnJheShlbGVtZW50cykpXG4gICAgICB9IGVsc2Uge1xuXHRcdFx0XHQvLyBjb250aW51ZSBzY3JvbGxpbmcgYW5kIGFkZCBkZWxheVxuICAgICAgICBmb3VuZEVsZW1lbnRzID0gZWxlbWVudHNcbiAgICAgICAgdGhpcy5zY3JvbGxUb0JvdHRvbSgpXG4gICAgICAgIG5leHRFbGVtZW50U2VsZWN0aW9uID0gbm93ICsgZGVsYXlcbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcyksIDUwKVxuXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW11cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2RlbGF5J11cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yRWxlbWVudFNjcm9sbFxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgU2VsZWN0b3JHcm91cCA9IHtcblxuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5IYXZlTG9jYWxDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkNyZWF0ZU5ld0pvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBkZmQgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciBzZWxmID0gdGhpc1xuXHRcdC8vIGNhbm5vdCByZXVzZSB0aGlzLmdldERhdGFFbGVtZW50cyBiZWNhdXNlIGl0IGRlcGVuZHMgb24gKm11bHRpcGxlKiBwcm9wZXJ0eVxuICAgIHZhciBlbGVtZW50cyA9IHNlbGYuJCh0aGlzLnNlbGVjdG9yLCBwYXJlbnRFbGVtZW50KVxuXG4gICAgdmFyIHJlY29yZHMgPSBbXVxuICAgIHNlbGYuJChlbGVtZW50cykuZWFjaChmdW5jdGlvbiAoaywgZWxlbWVudCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuXG4gICAgICBkYXRhW3RoaXMuaWRdID0gc2VsZi4kKGVsZW1lbnQpLnRleHQoKVxuXG4gICAgICBpZiAodGhpcy5leHRyYWN0QXR0cmlidXRlKSB7XG4gICAgICAgIGRhdGFbdGhpcy5pZCArICctJyArIHRoaXMuZXh0cmFjdEF0dHJpYnV0ZV0gPSBzZWxmLiQoZWxlbWVudCkuYXR0cih0aGlzLmV4dHJhY3RBdHRyaWJ1dGUpXG4gICAgICB9XG5cbiAgICAgIHJlY29yZHMucHVzaChkYXRhKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIHZhciByZXN1bHQgPSB7fVxuICAgIHJlc3VsdFt0aGlzLmlkXSA9IHJlY29yZHNcblxuICAgIGRmZC5yZXNvbHZlKFtyZXN1bHRdKVxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW3RoaXMuaWRdXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydkZWxheScsICdleHRyYWN0QXR0cmlidXRlJ11cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yR3JvdXBcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxudmFyIFNlbGVjdG9ySFRNTCA9IHtcblxuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcblxuICAgIHZhciByZXN1bHQgPSBbXVxuICAgIHNlbGYuJChlbGVtZW50cykuZWFjaChmdW5jdGlvbiAoaywgZWxlbWVudCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuICAgICAgdmFyIGh0bWwgPSBzZWxmLiQoZWxlbWVudCkuaHRtbCgpXG5cbiAgICAgIGlmICh0aGlzLnJlZ2V4ICE9PSB1bmRlZmluZWQgJiYgdGhpcy5yZWdleC5sZW5ndGgpIHtcbiAgICAgICAgdmFyIG1hdGNoZXMgPSBodG1sLm1hdGNoKG5ldyBSZWdFeHAodGhpcy5yZWdleCkpXG4gICAgICAgIGlmIChtYXRjaGVzICE9PSBudWxsKSB7XG4gICAgICAgICAgaHRtbCA9IG1hdGNoZXNbMF1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBodG1sID0gbnVsbFxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBkYXRhW3RoaXMuaWRdID0gaHRtbFxuXG4gICAgICByZXN1bHQucHVzaChkYXRhKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIGlmICh0aGlzLm11bHRpcGxlID09PSBmYWxzZSAmJiBlbGVtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHZhciBkYXRhID0ge31cbiAgICAgIGRhdGFbdGhpcy5pZF0gPSBudWxsXG4gICAgICByZXN1bHQucHVzaChkYXRhKVxuICAgIH1cblxuICAgIGRmZC5yZXNvbHZlKHJlc3VsdClcbiAgICByZXR1cm4gZGZkLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFt0aGlzLmlkXVxuICB9LFxuXG4gIGdldEZlYXR1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFsnbXVsdGlwbGUnLCAncmVnZXgnLCAnZGVsYXknXVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JIVE1MXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciB3aGVuQ2FsbFNlcXVlbnRpYWxseSA9IHJlcXVpcmUoJy4uLy4uL2Fzc2V0cy9qcXVlcnkud2hlbmNhbGxzZXF1ZW50aWFsbHknKVxudmFyIEJhc2U2NCA9IHJlcXVpcmUoJy4uLy4uL2Fzc2V0cy9iYXNlNjQnKVxudmFyIFNlbGVjdG9ySW1hZ2UgPSB7XG4gIGNhblJldHVybk11bHRpcGxlUmVjb3JkczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUNoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZGZkID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICAgIHZhciBlbGVtZW50cyA9IHRoaXMuZ2V0RGF0YUVsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG5cbiAgICB2YXIgZGVmZXJyZWREYXRhQ2FsbHMgPSBbXVxuICAgIHRoaXMuJChlbGVtZW50cykuZWFjaChmdW5jdGlvbiAoaSwgZWxlbWVudCkge1xuICAgICAgZGVmZXJyZWREYXRhQ2FsbHMucHVzaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkZWZlcnJlZERhdGEgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgICAgIHZhciBkYXRhID0ge31cbiAgICAgICAgZGF0YVt0aGlzLmlkICsgJy1zcmMnXSA9IGVsZW1lbnQuc3JjXG5cblx0XHRcdFx0Ly8gZG93bmxvYWQgaW1hZ2UgaWYgcmVxdWlyZWRcbiAgICAgICAgaWYgKCF0aGlzLmRvd25sb2FkSW1hZ2UpIHtcbiAgICAgICAgICBkZWZlcnJlZERhdGEucmVzb2x2ZShkYXRhKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBkZWZlcnJlZEltYWdlQmFzZTY0ID0gdGhpcy5kb3dubG9hZEltYWdlQmFzZTY0KGVsZW1lbnQuc3JjKVxuXG4gICAgICAgICAgZGVmZXJyZWRJbWFnZUJhc2U2NC5kb25lKGZ1bmN0aW9uIChpbWFnZVJlc3BvbnNlKSB7XG4gICAgICAgICAgICBkYXRhWydfaW1hZ2VCYXNlNjQtJyArIHRoaXMuaWRdID0gaW1hZ2VSZXNwb25zZS5pbWFnZUJhc2U2NFxuICAgICAgICAgICAgZGF0YVsnX2ltYWdlTWltZVR5cGUtJyArIHRoaXMuaWRdID0gaW1hZ2VSZXNwb25zZS5taW1lVHlwZVxuXG4gICAgICAgICAgICBkZWZlcnJlZERhdGEucmVzb2x2ZShkYXRhKVxuICAgICAgICAgIH0uYmluZCh0aGlzKSkuZmFpbChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHQvLyBmYWlsZWQgdG8gZG93bmxvYWQgaW1hZ2UgY29udGludWUuXG5cdFx0XHRcdFx0XHQvLyBAVE9ETyBoYW5kbGUgZXJycm9yXG4gICAgICAgICAgICBkZWZlcnJlZERhdGEucmVzb2x2ZShkYXRhKVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZGVmZXJyZWREYXRhLnByb21pc2UoKVxuICAgICAgfS5iaW5kKHRoaXMpKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIHdoZW5DYWxsU2VxdWVudGlhbGx5KGRlZmVycmVkRGF0YUNhbGxzKS5kb25lKGZ1bmN0aW9uIChkYXRhUmVzdWx0cykge1xuICAgICAgaWYgKHRoaXMubXVsdGlwbGUgPT09IGZhbHNlICYmIGVsZW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICAgIGRhdGFbdGhpcy5pZCArICctc3JjJ10gPSBudWxsXG4gICAgICAgIGRhdGFSZXN1bHRzLnB1c2goZGF0YSlcbiAgICAgIH1cblxuICAgICAgZGZkLnJlc29sdmUoZGF0YVJlc3VsdHMpXG4gICAgfSlcblxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG4gIH0sXG5cbiAgZG93bmxvYWRGaWxlQXNCbG9iOiBmdW5jdGlvbiAodXJsKSB7XG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAodGhpcy5yZWFkeVN0YXRlID09IDQpIHtcbiAgICAgICAgaWYgKHRoaXMuc3RhdHVzID09IDIwMCkge1xuICAgICAgICAgIHZhciBibG9iID0gdGhpcy5yZXNwb25zZVxuICAgICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZShibG9iKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVqZWN0KHhoci5zdGF0dXNUZXh0KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHhoci5vcGVuKCdHRVQnLCB1cmwpXG4gICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdibG9iJ1xuICAgIHhoci5zZW5kKClcblxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG4gIGRvd25sb2FkSW1hZ2VCYXNlNjQ6IGZ1bmN0aW9uICh1cmwpIHtcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIGRlZmVycmVkRG93bmxvYWQgPSB0aGlzLmRvd25sb2FkRmlsZUFzQmxvYih1cmwpXG4gICAgZGVmZXJyZWREb3dubG9hZC5kb25lKGZ1bmN0aW9uIChibG9iKSB7XG4gICAgICB2YXIgbWltZVR5cGUgPSBibG9iLnR5cGVcbiAgICAgIHZhciBkZWZlcnJlZEJsb2IgPSBCYXNlNjQuYmxvYlRvQmFzZTY0KGJsb2IpXG4gICAgICBkZWZlcnJlZEJsb2IuZG9uZShmdW5jdGlvbiAoaW1hZ2VCYXNlNjQpIHtcbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKHtcbiAgICAgICAgICBtaW1lVHlwZTogbWltZVR5cGUsXG4gICAgICAgICAgaW1hZ2VCYXNlNjQ6IGltYWdlQmFzZTY0XG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0pLmZhaWwoZGVmZXJyZWRSZXNwb25zZS5mYWlsKVxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFt0aGlzLmlkICsgJy1zcmMnXVxuICB9LFxuXG4gIGdldEZlYXR1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFsnbXVsdGlwbGUnLCAnZGVsYXknLCAnZG93bmxvYWRJbWFnZSddXG4gIH0sXG5cbiAgZ2V0SXRlbUNTU1NlbGVjdG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICdpbWcnXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvckltYWdlXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciB3aGVuQ2FsbFNlcXVlbnRpYWxseSA9IHJlcXVpcmUoJy4uLy4uL2Fzc2V0cy9qcXVlcnkud2hlbmNhbGxzZXF1ZW50aWFsbHknKVxuXG52YXIgU2VsZWN0b3JMaW5rID0ge1xuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBlbGVtZW50cyA9IHRoaXMuZ2V0RGF0YUVsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG4gICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICB2YXIgZGZkID0ganF1ZXJ5LkRlZmVycmVkKClcblxuXHRcdC8vIHJldHVybiBlbXB0eSByZWNvcmQgaWYgbm90IG11bHRpcGxlIHR5cGUgYW5kIG5vIGVsZW1lbnRzIGZvdW5kXG4gICAgaWYgKHRoaXMubXVsdGlwbGUgPT09IGZhbHNlICYmIGVsZW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuICAgICAgZGF0YVt0aGlzLmlkXSA9IG51bGxcbiAgICAgIGRmZC5yZXNvbHZlKFtkYXRhXSlcbiAgICAgIHJldHVybiBkZmRcbiAgICB9XG5cblx0XHQvLyBleHRyYWN0IGxpbmtzIG9uZSBieSBvbmVcbiAgICB2YXIgZGVmZXJyZWREYXRhRXh0cmFjdGlvbkNhbGxzID0gW11cbiAgICBzZWxmLiQoZWxlbWVudHMpLmVhY2goZnVuY3Rpb24gKGssIGVsZW1lbnQpIHtcbiAgICAgIGRlZmVycmVkRGF0YUV4dHJhY3Rpb25DYWxscy5wdXNoKGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIHZhciBkZWZlcnJlZERhdGEgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgICAgIHZhciBkYXRhID0ge31cbiAgICAgICAgZGF0YVt0aGlzLmlkXSA9IHNlbGYuJChlbGVtZW50KS50ZXh0KClcbiAgICAgICAgZGF0YS5fZm9sbG93U2VsZWN0b3JJZCA9IHRoaXMuaWRcbiAgICAgICAgZGF0YVt0aGlzLmlkICsgJy1ocmVmJ10gPSBlbGVtZW50LmhyZWZcbiAgICAgICAgZGF0YS5fZm9sbG93ID0gZWxlbWVudC5ocmVmXG4gICAgICAgIGRlZmVycmVkRGF0YS5yZXNvbHZlKGRhdGEpXG5cbiAgICAgICAgcmV0dXJuIGRlZmVycmVkRGF0YVxuICAgICAgfS5iaW5kKHRoaXMsIGVsZW1lbnQpKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIHdoZW5DYWxsU2VxdWVudGlhbGx5KGRlZmVycmVkRGF0YUV4dHJhY3Rpb25DYWxscykuZG9uZShmdW5jdGlvbiAocmVzcG9uc2VzKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW11cbiAgICAgIHJlc3BvbnNlcy5mb3JFYWNoKGZ1bmN0aW9uIChkYXRhUmVzdWx0KSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKGRhdGFSZXN1bHQpXG4gICAgICB9KVxuICAgICAgZGZkLnJlc29sdmUocmVzdWx0KVxuICAgIH0pXG5cbiAgICByZXR1cm4gZGZkLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFt0aGlzLmlkLCB0aGlzLmlkICsgJy1ocmVmJ11cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2RlbGF5J11cbiAgfSxcblxuICBnZXRJdGVtQ1NTU2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gJ2EnXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvckxpbmtcbiIsInZhciB3aGVuQ2FsbFNlcXVlbnRpYWxseSA9IHJlcXVpcmUoJy4uLy4uL2Fzc2V0cy9qcXVlcnkud2hlbmNhbGxzZXF1ZW50aWFsbHknKVxudmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgQ3NzU2VsZWN0b3IgPSByZXF1aXJlKCdjc3Mtc2VsZWN0b3InKS5Dc3NTZWxlY3RvclxudmFyIFNlbGVjdG9yUG9wdXBMaW5rID0ge1xuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcblxuICAgIHZhciBkZmQgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG5cdFx0Ly8gcmV0dXJuIGVtcHR5IHJlY29yZCBpZiBub3QgbXVsdGlwbGUgdHlwZSBhbmQgbm8gZWxlbWVudHMgZm91bmRcbiAgICBpZiAodGhpcy5tdWx0aXBsZSA9PT0gZmFsc2UgJiYgZWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICBkYXRhW3RoaXMuaWRdID0gbnVsbFxuICAgICAgZGZkLnJlc29sdmUoW2RhdGFdKVxuICAgICAgcmV0dXJuIGRmZFxuICAgIH1cblxuXHRcdC8vIGV4dHJhY3QgbGlua3Mgb25lIGJ5IG9uZVxuICAgIHZhciBkZWZlcnJlZERhdGFFeHRyYWN0aW9uQ2FsbHMgPSBbXVxuICAgICQoZWxlbWVudHMpLmVhY2goZnVuY3Rpb24gKGssIGVsZW1lbnQpIHtcbiAgICAgIGRlZmVycmVkRGF0YUV4dHJhY3Rpb25DYWxscy5wdXNoKGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIHZhciBkZWZlcnJlZERhdGEgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgICAgIHZhciBkYXRhID0ge31cbiAgICAgICAgZGF0YVt0aGlzLmlkXSA9ICQoZWxlbWVudCkudGV4dCgpXG4gICAgICAgIGRhdGEuX2ZvbGxvd1NlbGVjdG9ySWQgPSB0aGlzLmlkXG5cbiAgICAgICAgdmFyIGRlZmVycmVkUG9wdXBVUkwgPSB0aGlzLmdldFBvcHVwVVJMKGVsZW1lbnQpXG4gICAgICAgIGRlZmVycmVkUG9wdXBVUkwuZG9uZShmdW5jdGlvbiAodXJsKSB7XG4gICAgICAgICAgZGF0YVt0aGlzLmlkICsgJy1ocmVmJ10gPSB1cmxcbiAgICAgICAgICBkYXRhLl9mb2xsb3cgPSB1cmxcbiAgICAgICAgICBkZWZlcnJlZERhdGEucmVzb2x2ZShkYXRhKVxuICAgICAgICB9LmJpbmQodGhpcykpXG5cbiAgICAgICAgcmV0dXJuIGRlZmVycmVkRGF0YVxuICAgICAgfS5iaW5kKHRoaXMsIGVsZW1lbnQpKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIHdoZW5DYWxsU2VxdWVudGlhbGx5KGRlZmVycmVkRGF0YUV4dHJhY3Rpb25DYWxscykuZG9uZShmdW5jdGlvbiAocmVzcG9uc2VzKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW11cbiAgICAgIHJlc3BvbnNlcy5mb3JFYWNoKGZ1bmN0aW9uIChkYXRhUmVzdWx0KSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKGRhdGFSZXN1bHQpXG4gICAgICB9KVxuICAgICAgZGZkLnJlc29sdmUocmVzdWx0KVxuICAgIH0pXG5cbiAgICByZXR1cm4gZGZkLnByb21pc2UoKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBHZXRzIGFuIHVybCBmcm9tIGEgd2luZG93Lm9wZW4gY2FsbCBieSBtb2NraW5nIHRoZSB3aW5kb3cub3BlbiBmdW5jdGlvblxuXHQgKiBAcGFyYW0gZWxlbWVudFxuXHQgKiBAcmV0dXJucyAkLkRlZmVycmVkKClcblx0ICovXG4gIGdldFBvcHVwVVJMOiBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIGRvY3VtZW50ID0gdGhpcy5kb2N1bWVudFxuICAgIC8vIG92ZXJyaWRlIHdpbmRvdy5vcGVuIGZ1bmN0aW9uLiB3ZSBuZWVkIHRvIGV4ZWN1dGUgdGhpcyBpbiBwYWdlIHNjb3BlLlxuXHRcdC8vIHdlIG5lZWQgdG8ga25vdyBob3cgdG8gZmluZCB0aGlzIGVsZW1lbnQgZnJvbSBwYWdlIHNjb3BlLlxuICAgIHZhciBjcyA9IG5ldyBDc3NTZWxlY3Rvcih7XG4gICAgICBlbmFibGVTbWFydFRhYmxlU2VsZWN0b3I6IGZhbHNlLFxuICAgICAgcGFyZW50OiBkb2N1bWVudC5ib2R5LFxuICAgICAgZW5hYmxlUmVzdWx0U3RyaXBwaW5nOiBmYWxzZVxuICAgIH0pXG4gICAgdmFyIGNzc1NlbGVjdG9yID0gY3MuZ2V0Q3NzU2VsZWN0b3IoW2VsZW1lbnRdKVxuICAgIGNvbnNvbGUubG9nKGNzc1NlbGVjdG9yKVxuICAgIGNvbnNvbGUubG9nKGRvY3VtZW50LmJvZHkucXVlcnlTZWxlY3RvckFsbChjc3NTZWxlY3RvcikpXG5cdFx0Ly8gdGhpcyBmdW5jdGlvbiB3aWxsIGNhdGNoIHdpbmRvdy5vcGVuIGNhbGwgYW5kIHBsYWNlIHRoZSByZXF1ZXN0ZWQgdXJsIGFzIHRoZSBlbGVtZW50cyBkYXRhIGF0dHJpYnV0ZVxuICAgIHZhciBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKVxuICAgIHNjcmlwdC50eXBlID0gJ3RleHQvamF2YXNjcmlwdCdcbiAgICBjb25zb2xlLmxvZyhjc3NTZWxlY3RvcilcbiAgICBjb25zb2xlLmxvZyhkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKGNzc1NlbGVjdG9yKSlcbiAgICBzY3JpcHQudGV4dCA9IGBcblx0XHRcdChmdW5jdGlvbigpe1xuICAgICAgICB2YXIgb3BlbiA9IHdpbmRvdy5vcGVuO1xuICAgICAgICB2YXIgZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcke2Nzc1NlbGVjdG9yfScpWzBdO1xuICAgICAgICB2YXIgb3Blbk5ldyA9IGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgICB2YXIgdXJsID0gYXJndW1lbnRzWzBdOyBcbiAgICAgICAgICBlbC5kYXRhc2V0LndlYlNjcmFwZXJFeHRyYWN0VXJsID0gdXJsOyBcbiAgICAgICAgICB3aW5kb3cub3BlbiA9IG9wZW47IFxuICAgICAgICB9O1xuICAgICAgICB3aW5kb3cub3BlbiA9IG9wZW5OZXc7IFxuICAgICAgICBlbC5jbGljaygpOyBcblx0XHRcdH0pKClgXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzY3JpcHQpXG5cblx0XHQvLyB3YWl0IGZvciB1cmwgdG8gYmUgYXZhaWxhYmxlXG4gICAgdmFyIGRlZmVycmVkVVJMID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgdGltZW91dCA9IE1hdGguYWJzKDUwMDAgLyAzMCkgLy8gNXMgdGltZW91dCB0byBnZW5lcmF0ZSBhbiB1cmwgZm9yIHBvcHVwXG4gICAgdmFyIGludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHVybCA9ICQoZWxlbWVudCkuZGF0YSgnd2ViLXNjcmFwZXItZXh0cmFjdC11cmwnKVxuICAgICAgaWYgKHVybCkge1xuICAgICAgICBkZWZlcnJlZFVSTC5yZXNvbHZlKHVybClcbiAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbClcbiAgICAgICAgc2NyaXB0LnJlbW92ZSgpXG4gICAgICB9XG5cdFx0XHQvLyB0aW1lb3V0IHBvcHVwIG9wZW5pbmdcbiAgICAgIGlmICh0aW1lb3V0LS0gPD0gMCkge1xuICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKVxuICAgICAgICBzY3JpcHQucmVtb3ZlKClcbiAgICAgIH1cbiAgICB9LCAzMClcblxuICAgIHJldHVybiBkZWZlcnJlZFVSTC5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbdGhpcy5pZCwgdGhpcy5pZCArICctaHJlZiddXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydtdWx0aXBsZScsICdkZWxheSddXG4gIH0sXG5cbiAgZ2V0SXRlbUNTU1NlbGVjdG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICcqJ1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JQb3B1cExpbmtcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxuXG52YXIgU2VsZWN0b3JUYWJsZSA9IHtcblxuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgZ2V0VGFibGVIZWFkZXJDb2x1bW5zOiBmdW5jdGlvbiAoJHRhYmxlKSB7XG4gICAgdmFyIGNvbHVtbnMgPSB7fVxuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIGhlYWRlclJvd1NlbGVjdG9yID0gdGhpcy5nZXRUYWJsZUhlYWRlclJvd1NlbGVjdG9yKClcbiAgICB2YXIgJGhlYWRlclJvdyA9ICQoJHRhYmxlKS5maW5kKGhlYWRlclJvd1NlbGVjdG9yKVxuICAgIGlmICgkaGVhZGVyUm93Lmxlbmd0aCA+IDApIHtcbiAgICAgICRoZWFkZXJSb3cuZmluZCgndGQsdGgnKS5lYWNoKGZ1bmN0aW9uIChpKSB7XG4gICAgICAgIHZhciBoZWFkZXIgPSAkKHRoaXMpLnRleHQoKS50cmltKClcbiAgICAgICAgY29sdW1uc1toZWFkZXJdID0ge1xuICAgICAgICAgIGluZGV4OiBpICsgMVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgICByZXR1cm4gY29sdW1uc1xuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZGZkID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgJCA9IHRoaXMuJFxuXG4gICAgdmFyIHRhYmxlcyA9IHRoaXMuZ2V0RGF0YUVsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG5cbiAgICB2YXIgcmVzdWx0ID0gW11cbiAgICAkKHRhYmxlcykuZWFjaChmdW5jdGlvbiAoaywgdGFibGUpIHtcbiAgICAgIHZhciBjb2x1bW5zID0gdGhpcy5nZXRUYWJsZUhlYWRlckNvbHVtbnMoJCh0YWJsZSkpXG5cbiAgICAgIHZhciBkYXRhUm93U2VsZWN0b3IgPSB0aGlzLmdldFRhYmxlRGF0YVJvd1NlbGVjdG9yKClcbiAgICAgICQodGFibGUpLmZpbmQoZGF0YVJvd1NlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uIChpLCByb3cpIHtcbiAgICAgICAgdmFyIGRhdGEgPSB7fVxuICAgICAgICB0aGlzLmNvbHVtbnMuZm9yRWFjaChmdW5jdGlvbiAoY29sdW1uKSB7XG4gICAgICAgICAgaWYgKGNvbHVtbi5leHRyYWN0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICBpZiAoY29sdW1uc1tjb2x1bW4uaGVhZGVyXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIGRhdGFbY29sdW1uLm5hbWVdID0gbnVsbFxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdmFyIHJvd1RleHQgPSAkKHJvdykuZmluZCgnPjpudGgtY2hpbGQoJyArIGNvbHVtbnNbY29sdW1uLmhlYWRlcl0uaW5kZXggKyAnKScpLnRleHQoKS50cmltKClcbiAgICAgICAgICAgICAgZGF0YVtjb2x1bW4ubmFtZV0gPSByb3dUZXh0XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICByZXN1bHQucHVzaChkYXRhKVxuICAgICAgfS5iaW5kKHRoaXMpKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIGRmZC5yZXNvbHZlKHJlc3VsdClcbiAgICByZXR1cm4gZGZkLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGRhdGFDb2x1bW5zID0gW11cbiAgICB0aGlzLmNvbHVtbnMuZm9yRWFjaChmdW5jdGlvbiAoY29sdW1uKSB7XG4gICAgICBpZiAoY29sdW1uLmV4dHJhY3QgPT09IHRydWUpIHtcbiAgICAgICAgZGF0YUNvbHVtbnMucHVzaChjb2x1bW4ubmFtZSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBkYXRhQ29sdW1uc1xuICB9LFxuXG4gIGdldEZlYXR1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFsnbXVsdGlwbGUnLCAnY29sdW1ucycsICdkZWxheScsICd0YWJsZURhdGFSb3dTZWxlY3RvcicsICd0YWJsZUhlYWRlclJvd1NlbGVjdG9yJ11cbiAgfSxcblxuICBnZXRJdGVtQ1NTU2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gJ3RhYmxlJ1xuICB9LFxuXG4gIGdldFRhYmxlSGVhZGVyUm93U2VsZWN0b3JGcm9tVGFibGVIVE1MOiBmdW5jdGlvbiAoaHRtbCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdmFyICQgPSBvcHRpb25zLiQgfHwgdGhpcy4kXG4gICAgdmFyICR0YWJsZSA9ICQoaHRtbClcbiAgICBpZiAoJHRhYmxlLmZpbmQoJ3RoZWFkIHRyOmhhcyh0ZDpub3QoOmVtcHR5KSksIHRoZWFkIHRyOmhhcyh0aDpub3QoOmVtcHR5KSknKS5sZW5ndGgpIHtcbiAgICAgIGlmICgkdGFibGUuZmluZCgndGhlYWQgdHInKS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmV0dXJuICd0aGVhZCB0cidcbiAgICAgIH1cdFx0XHRlbHNlIHtcbiAgICAgICAgdmFyICRyb3dzID0gJHRhYmxlLmZpbmQoJ3RoZWFkIHRyJylcblx0XHRcdFx0Ly8gZmlyc3Qgcm93IHdpdGggZGF0YVxuICAgICAgICB2YXIgcm93SW5kZXggPSAkcm93cy5pbmRleCgkcm93cy5maWx0ZXIoJzpoYXModGQ6bm90KDplbXB0eSkpLDpoYXModGg6bm90KDplbXB0eSkpJylbMF0pXG4gICAgICAgIHJldHVybiAndGhlYWQgdHI6bnRoLW9mLXR5cGUoJyArIChyb3dJbmRleCArIDEpICsgJyknXG4gICAgICB9XG4gICAgfVx0XHRlbHNlIGlmICgkdGFibGUuZmluZCgndHIgdGQ6bm90KDplbXB0eSksIHRyIHRoOm5vdCg6ZW1wdHkpJykubGVuZ3RoKSB7XG4gICAgICB2YXIgJHJvd3MgPSAkdGFibGUuZmluZCgndHInKVxuXHRcdFx0Ly8gZmlyc3Qgcm93IHdpdGggZGF0YVxuICAgICAgdmFyIHJvd0luZGV4ID0gJHJvd3MuaW5kZXgoJHJvd3MuZmlsdGVyKCc6aGFzKHRkOm5vdCg6ZW1wdHkpKSw6aGFzKHRoOm5vdCg6ZW1wdHkpKScpWzBdKVxuICAgICAgcmV0dXJuICd0cjpudGgtb2YtdHlwZSgnICsgKHJvd0luZGV4ICsgMSkgKyAnKSdcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgcmV0dXJuICcnXG4gICAgfVxuICB9LFxuXG4gIGdldFRhYmxlRGF0YVJvd1NlbGVjdG9yRnJvbVRhYmxlSFRNTDogZnVuY3Rpb24gKGh0bWwsIG9wdGlvbnMgPSB7fSkge1xuICAgIHZhciAkID0gb3B0aW9ucy4kIHx8IHRoaXMuJFxuICAgIHZhciAkdGFibGUgPSAkKGh0bWwpXG4gICAgaWYgKCR0YWJsZS5maW5kKCd0aGVhZCB0cjpoYXModGQ6bm90KDplbXB0eSkpLCB0aGVhZCB0cjpoYXModGg6bm90KDplbXB0eSkpJykubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gJ3Rib2R5IHRyJ1xuICAgIH1cdFx0ZWxzZSBpZiAoJHRhYmxlLmZpbmQoJ3RyIHRkOm5vdCg6ZW1wdHkpLCB0ciB0aDpub3QoOmVtcHR5KScpLmxlbmd0aCkge1xuICAgICAgdmFyICRyb3dzID0gJHRhYmxlLmZpbmQoJ3RyJylcblx0XHRcdC8vIGZpcnN0IHJvdyB3aXRoIGRhdGFcbiAgICAgIHZhciByb3dJbmRleCA9ICRyb3dzLmluZGV4KCRyb3dzLmZpbHRlcignOmhhcyh0ZDpub3QoOmVtcHR5KSksOmhhcyh0aDpub3QoOmVtcHR5KSknKVswXSlcbiAgICAgIHJldHVybiAndHI6bnRoLW9mLXR5cGUobisnICsgKHJvd0luZGV4ICsgMikgKyAnKSdcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgcmV0dXJuICcnXG4gICAgfVxuICB9LFxuXG4gIGdldFRhYmxlSGVhZGVyUm93U2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcblx0XHQvLyBoYW5kbGUgbGVnYWN5IHNlbGVjdG9yc1xuICAgIGlmICh0aGlzLnRhYmxlSGVhZGVyUm93U2VsZWN0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuICd0aGVhZCB0cidcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMudGFibGVIZWFkZXJSb3dTZWxlY3RvclxuICAgIH1cbiAgfSxcblxuICBnZXRUYWJsZURhdGFSb3dTZWxlY3RvcjogZnVuY3Rpb24gKCkge1xuXHRcdC8vIGhhbmRsZSBsZWdhY3kgc2VsZWN0b3JzXG4gICAgaWYgKHRoaXMudGFibGVEYXRhUm93U2VsZWN0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuICd0Ym9keSB0cidcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMudGFibGVEYXRhUm93U2VsZWN0b3JcbiAgICB9XG4gIH0sXG5cblx0LyoqXG5cdCAqIEV4dHJhY3QgdGFibGUgaGVhZGVyIGNvbHVtbiBpbmZvIGZyb20gaHRtbFxuXHQgKiBAcGFyYW0gaHRtbFxuXHQgKi9cbiAgZ2V0VGFibGVIZWFkZXJDb2x1bW5zRnJvbUhUTUw6IGZ1bmN0aW9uIChoZWFkZXJSb3dTZWxlY3RvciwgaHRtbCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdmFyICQgPSBvcHRpb25zLiQgfHwgdGhpcy4kXG4gICAgdmFyICR0YWJsZSA9ICQoaHRtbClcbiAgICB2YXIgJGhlYWRlclJvd0NvbHVtbnMgPSAkdGFibGUuZmluZChoZWFkZXJSb3dTZWxlY3RvcikuZmluZCgndGQsdGgnKVxuXG4gICAgdmFyIGNvbHVtbnMgPSBbXVxuXG4gICAgJGhlYWRlclJvd0NvbHVtbnMuZWFjaChmdW5jdGlvbiAoaSwgY29sdW1uRWwpIHtcbiAgICAgIHZhciBoZWFkZXIgPSAkKGNvbHVtbkVsKS50ZXh0KCkudHJpbSgpXG4gICAgICB2YXIgbmFtZSA9IGhlYWRlclxuICAgICAgaWYgKGhlYWRlci5sZW5ndGggIT09IDApIHtcbiAgICAgICAgY29sdW1ucy5wdXNoKHtcbiAgICAgICAgICBoZWFkZXI6IGhlYWRlcixcbiAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgIGV4dHJhY3Q6IHRydWVcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBjb2x1bW5zXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvclRhYmxlXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciBTZWxlY3RvclRleHQgPSB7XG5cbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5IYXZlTG9jYWxDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkNyZWF0ZU5ld0pvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuXG4gICAgdmFyIHJlc3VsdCA9IFtdXG4gICAgJChlbGVtZW50cykuZWFjaChmdW5jdGlvbiAoaywgZWxlbWVudCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuXG5cdFx0XHQvLyByZW1vdmUgc2NyaXB0LCBzdHlsZSB0YWcgY29udGVudHMgZnJvbSB0ZXh0IHJlc3VsdHNcbiAgICAgIHZhciAkZWxlbWVudF9jbG9uZSA9ICQoZWxlbWVudCkuY2xvbmUoKVxuICAgICAgJGVsZW1lbnRfY2xvbmUuZmluZCgnc2NyaXB0LCBzdHlsZScpLnJlbW92ZSgpXG5cdFx0XHQvLyA8YnI+IHJlcGxhY2UgYnIgdGFncyB3aXRoIG5ld2xpbmVzXG4gICAgICAkZWxlbWVudF9jbG9uZS5maW5kKCdicicpLmFmdGVyKCdcXG4nKVxuXG4gICAgICB2YXIgdGV4dCA9ICRlbGVtZW50X2Nsb25lLnRleHQoKVxuICAgICAgaWYgKHRoaXMucmVnZXggIT09IHVuZGVmaW5lZCAmJiB0aGlzLnJlZ2V4Lmxlbmd0aCkge1xuICAgICAgICB2YXIgbWF0Y2hlcyA9IHRleHQubWF0Y2gobmV3IFJlZ0V4cCh0aGlzLnJlZ2V4KSlcbiAgICAgICAgaWYgKG1hdGNoZXMgIT09IG51bGwpIHtcbiAgICAgICAgICB0ZXh0ID0gbWF0Y2hlc1swXVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRleHQgPSBudWxsXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGRhdGFbdGhpcy5pZF0gPSB0ZXh0XG5cbiAgICAgIHJlc3VsdC5wdXNoKGRhdGEpXG4gICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgaWYgKHRoaXMubXVsdGlwbGUgPT09IGZhbHNlICYmIGVsZW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuICAgICAgZGF0YVt0aGlzLmlkXSA9IG51bGxcbiAgICAgIHJlc3VsdC5wdXNoKGRhdGEpXG4gICAgfVxuXG4gICAgZGZkLnJlc29sdmUocmVzdWx0KVxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW3RoaXMuaWRdXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydtdWx0aXBsZScsICdyZWdleCcsICdkZWxheSddXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvclRleHRcbiIsInZhciBTZWxlY3RvciA9IHJlcXVpcmUoJy4vU2VsZWN0b3InKVxuXG52YXIgU2VsZWN0b3JMaXN0ID0gZnVuY3Rpb24gKHNlbGVjdG9ycywgb3B0aW9ucykge1xuICB2YXIgJCA9IG9wdGlvbnMuJFxuICB2YXIgZG9jdW1lbnQgPSBvcHRpb25zLmRvY3VtZW50XG4gIHZhciB3aW5kb3cgPSBvcHRpb25zLndpbmRvd1xuICAvLyBXZSBkb24ndCB3YW50IGVudW1lcmFibGUgcHJvcGVydGllc1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJyQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7cmV0dXJuICR9LFxuICAgIGVudW1lcmFibGU6IGZhbHNlXG4gIH0pXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnd2luZG93Jywge1xuICAgIGdldDogZnVuY3Rpb24gKCkge3JldHVybiB3aW5kb3d9LFxuICAgIGVudW1lcmFibGU6IGZhbHNlXG4gIH0pXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnZG9jdW1lbnQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7cmV0dXJuIGRvY3VtZW50fSxcbiAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICB9KVxuICBpZiAoIXRoaXMuJCkgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIGpxdWVyeScpXG5pZiAoIXRoaXMuZG9jdW1lbnQpIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgZG9jdW1lbnRcIilcbmlmKCF0aGlzLndpbmRvdyl0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHdpbmRvd1wiKVxuXG4gIGlmIChzZWxlY3RvcnMgPT09IG51bGwgfHwgc2VsZWN0b3JzID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZWN0b3JzLmxlbmd0aDsgaSsrKSB7XG4gICAgdGhpcy5wdXNoKHNlbGVjdG9yc1tpXSlcbiAgfVxufVxuXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlID0gW11cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gIGlmICghdGhpcy5oYXNTZWxlY3RvcihzZWxlY3Rvci5pZCkpIHtcbiAgICBpZiAoIShzZWxlY3RvciBpbnN0YW5jZW9mIFNlbGVjdG9yKSkge1xuICAgICAgc2VsZWN0b3IgPSBuZXcgU2VsZWN0b3Ioc2VsZWN0b3IsIHskOiB0aGlzLiR9KVxuICAgIH1cbiAgICBBcnJheS5wcm90b3R5cGUucHVzaC5jYWxsKHRoaXMsIHNlbGVjdG9yKVxuICB9XG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuaGFzU2VsZWN0b3IgPSBmdW5jdGlvbiAoc2VsZWN0b3JJZCkge1xuICBpZiAoc2VsZWN0b3JJZCBpbnN0YW5jZW9mIE9iamVjdCkge1xuICAgIHNlbGVjdG9ySWQgPSBzZWxlY3RvcklkLmlkXG4gIH1cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAodGhpc1tpXS5pZCA9PT0gc2VsZWN0b3JJZCkge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59XG5cbi8qKlxuICogUmV0dXJucyBhbGwgc2VsZWN0b3JzIG9yIHJlY3Vyc2l2ZWx5IGZpbmQgYW5kIHJldHVybiBhbGwgY2hpbGQgc2VsZWN0b3JzIG9mIGEgcGFyZW50IHNlbGVjdG9yLlxuICogQHBhcmFtIHBhcmVudFNlbGVjdG9ySWRcbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqL1xuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5nZXRBbGxTZWxlY3RvcnMgPSBmdW5jdGlvbiAocGFyZW50U2VsZWN0b3JJZCkge1xuICBpZiAocGFyZW50U2VsZWN0b3JJZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHZhciBnZXRBbGxDaGlsZFNlbGVjdG9ycyA9IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3RvcklkLCByZXN1bHRTZWxlY3RvcnMpIHtcbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICBpZiAoc2VsZWN0b3IuaGFzUGFyZW50U2VsZWN0b3IocGFyZW50U2VsZWN0b3JJZCkpIHtcbiAgICAgICAgaWYgKHJlc3VsdFNlbGVjdG9ycy5pbmRleE9mKHNlbGVjdG9yKSA9PT0gLTEpIHtcbiAgICAgICAgICByZXN1bHRTZWxlY3RvcnMucHVzaChzZWxlY3RvcilcbiAgICAgICAgICBnZXRBbGxDaGlsZFNlbGVjdG9ycyhzZWxlY3Rvci5pZCwgcmVzdWx0U2VsZWN0b3JzKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgfS5iaW5kKHRoaXMpXG5cbiAgdmFyIHJlc3VsdFNlbGVjdG9ycyA9IFtdXG4gIGdldEFsbENoaWxkU2VsZWN0b3JzKHBhcmVudFNlbGVjdG9ySWQsIHJlc3VsdFNlbGVjdG9ycylcbiAgcmV0dXJuIHJlc3VsdFNlbGVjdG9yc1xufVxuXG4vKipcbiAqIFJldHVybnMgb25seSBzZWxlY3RvcnMgdGhhdCBhcmUgZGlyZWN0bHkgdW5kZXIgYSBwYXJlbnRcbiAqIEBwYXJhbSBwYXJlbnRTZWxlY3RvcklkXG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZ2V0RGlyZWN0Q2hpbGRTZWxlY3RvcnMgPSBmdW5jdGlvbiAocGFyZW50U2VsZWN0b3JJZCkge1xuICB2YXIgcmVzdWx0U2VsZWN0b3JzID0gbmV3IFNlbGVjdG9yTGlzdChudWxsLCB7JDogdGhpcy4kfSlcbiAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgIGlmIChzZWxlY3Rvci5oYXNQYXJlbnRTZWxlY3RvcihwYXJlbnRTZWxlY3RvcklkKSkge1xuICAgICAgcmVzdWx0U2VsZWN0b3JzLnB1c2goc2VsZWN0b3IpXG4gICAgfVxuICB9KVxuICByZXR1cm4gcmVzdWx0U2VsZWN0b3JzXG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciByZXN1bHRMaXN0ID0gbmV3IFNlbGVjdG9yTGlzdChudWxsLCB7JDogdGhpcy4kfSlcbiAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgIHJlc3VsdExpc3QucHVzaChzZWxlY3RvcilcbiAgfSlcbiAgcmV0dXJuIHJlc3VsdExpc3Rcbn1cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5mdWxsQ2xvbmUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciByZXN1bHRMaXN0ID0gbmV3IFNlbGVjdG9yTGlzdChudWxsLCB7JDogdGhpcy4kfSlcbiAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgIHJlc3VsdExpc3QucHVzaChKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHNlbGVjdG9yKSkpXG4gIH0pXG4gIHJldHVybiByZXN1bHRMaXN0XG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuY29uY2F0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgcmVzdWx0TGlzdCA9IHRoaXMuY2xvbmUoKVxuICBmb3IgKHZhciBpIGluIGFyZ3VtZW50cykge1xuICAgIGFyZ3VtZW50c1tpXS5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgcmVzdWx0TGlzdC5wdXNoKHNlbGVjdG9yKVxuICAgIH0pXG4gIH1cbiAgcmV0dXJuIHJlc3VsdExpc3Rcbn1cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5nZXRTZWxlY3RvciA9IGZ1bmN0aW9uIChzZWxlY3RvcklkKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBzZWxlY3RvciA9IHRoaXNbaV1cbiAgICBpZiAoc2VsZWN0b3IuaWQgPT09IHNlbGVjdG9ySWQpIHtcbiAgICAgIHJldHVybiBzZWxlY3RvclxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFJldHVybnMgYWxsIHNlbGVjdG9ycyBpZiB0aGlzIHNlbGVjdG9ycyBpbmNsdWRpbmcgYWxsIHBhcmVudCBzZWxlY3RvcnMgd2l0aGluIHRoaXMgcGFnZVxuICogQFRPRE8gbm90IHVzZWQgYW55IG1vcmUuXG4gKiBAcGFyYW0gc2VsZWN0b3JJZFxuICogQHJldHVybnMgeyp9XG4gKi9cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZ2V0T25lUGFnZVNlbGVjdG9ycyA9IGZ1bmN0aW9uIChzZWxlY3RvcklkKSB7XG4gIHZhciByZXN1bHRMaXN0ID0gbmV3IFNlbGVjdG9yTGlzdChudWxsLCB7JDogdGhpcy4kfSlcbiAgdmFyIHNlbGVjdG9yID0gdGhpcy5nZXRTZWxlY3RvcihzZWxlY3RvcklkKVxuICByZXN1bHRMaXN0LnB1c2godGhpcy5nZXRTZWxlY3RvcihzZWxlY3RvcklkKSlcblxuXHQvLyByZWN1cnNpdmVseSBmaW5kIGFsbCBwYXJlbnQgc2VsZWN0b3JzIHRoYXQgY291bGQgbGVhZCB0byB0aGUgcGFnZSB3aGVyZSBzZWxlY3RvcklkIGlzIHVzZWQuXG4gIHZhciBmaW5kUGFyZW50U2VsZWN0b3JzID0gZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgc2VsZWN0b3IucGFyZW50U2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9ySWQpIHtcbiAgICAgIGlmIChwYXJlbnRTZWxlY3RvcklkID09PSAnX3Jvb3QnKSByZXR1cm5cbiAgICAgIHZhciBwYXJlbnRTZWxlY3RvciA9IHRoaXMuZ2V0U2VsZWN0b3IocGFyZW50U2VsZWN0b3JJZClcbiAgICAgIGlmIChyZXN1bHRMaXN0LmluZGV4T2YocGFyZW50U2VsZWN0b3IpICE9PSAtMSkgcmV0dXJuXG4gICAgICBpZiAocGFyZW50U2VsZWN0b3Iud2lsbFJldHVybkVsZW1lbnRzKCkpIHtcbiAgICAgICAgcmVzdWx0TGlzdC5wdXNoKHBhcmVudFNlbGVjdG9yKVxuICAgICAgICBmaW5kUGFyZW50U2VsZWN0b3JzKHBhcmVudFNlbGVjdG9yKVxuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfS5iaW5kKHRoaXMpXG5cbiAgZmluZFBhcmVudFNlbGVjdG9ycyhzZWxlY3RvcilcblxuXHQvLyBhZGQgYWxsIGNoaWxkIHNlbGVjdG9yc1xuICByZXN1bHRMaXN0ID0gcmVzdWx0TGlzdC5jb25jYXQodGhpcy5nZXRTaW5nbGVQYWdlQWxsQ2hpbGRTZWxlY3RvcnMoc2VsZWN0b3IuaWQpKVxuICByZXR1cm4gcmVzdWx0TGlzdFxufVxuXG4vKipcbiAqIFJldHVybnMgYWxsIGNoaWxkIHNlbGVjdG9ycyBvZiBhIHNlbGVjdG9yIHdoaWNoIGNhbiBiZSB1c2VkIHdpdGhpbiBvbmUgcGFnZS5cbiAqIEBwYXJhbSBwYXJlbnRTZWxlY3RvcklkXG4gKi9cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZ2V0U2luZ2xlUGFnZUFsbENoaWxkU2VsZWN0b3JzID0gZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9ySWQpIHtcbiAgdmFyIHJlc3VsdExpc3QgPSBuZXcgU2VsZWN0b3JMaXN0KG51bGwsIHskOiB0aGlzLiR9KVxuICB2YXIgYWRkQ2hpbGRTZWxlY3RvcnMgPSBmdW5jdGlvbiAocGFyZW50U2VsZWN0b3IpIHtcbiAgICBpZiAocGFyZW50U2VsZWN0b3Iud2lsbFJldHVybkVsZW1lbnRzKCkpIHtcbiAgICAgIHZhciBjaGlsZFNlbGVjdG9ycyA9IHRoaXMuZ2V0RGlyZWN0Q2hpbGRTZWxlY3RvcnMocGFyZW50U2VsZWN0b3IuaWQpXG4gICAgICBjaGlsZFNlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChjaGlsZFNlbGVjdG9yKSB7XG4gICAgICAgIGlmIChyZXN1bHRMaXN0LmluZGV4T2YoY2hpbGRTZWxlY3RvcikgPT09IC0xKSB7XG4gICAgICAgICAgcmVzdWx0TGlzdC5wdXNoKGNoaWxkU2VsZWN0b3IpXG4gICAgICAgICAgYWRkQ2hpbGRTZWxlY3RvcnMoY2hpbGRTZWxlY3RvcilcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG4gIH0uYmluZCh0aGlzKVxuXG4gIHZhciBwYXJlbnRTZWxlY3RvciA9IHRoaXMuZ2V0U2VsZWN0b3IocGFyZW50U2VsZWN0b3JJZClcbiAgYWRkQ2hpbGRTZWxlY3RvcnMocGFyZW50U2VsZWN0b3IpXG4gIHJldHVybiByZXN1bHRMaXN0XG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUud2lsbFJldHVybk11bHRpcGxlUmVjb3JkcyA9IGZ1bmN0aW9uIChzZWxlY3RvcklkKSB7XG5cdC8vIGhhbmRsZSByZXVxZXN0ZWQgc2VsZWN0b3JcbiAgdmFyIHNlbGVjdG9yID0gdGhpcy5nZXRTZWxlY3RvcihzZWxlY3RvcklkKVxuICBpZiAoc2VsZWN0b3Iud2lsbFJldHVybk11bHRpcGxlUmVjb3JkcygpID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuXG5cdC8vIGhhbmRsZSBhbGwgaXRzIGNoaWxkIHNlbGVjdG9yc1xuICB2YXIgY2hpbGRTZWxlY3RvcnMgPSB0aGlzLmdldEFsbFNlbGVjdG9ycyhzZWxlY3RvcklkKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkU2VsZWN0b3JzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHNlbGVjdG9yID0gY2hpbGRTZWxlY3RvcnNbaV1cbiAgICBpZiAoc2VsZWN0b3Iud2lsbFJldHVybk11bHRpcGxlUmVjb3JkcygpID09PSB0cnVlKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmYWxzZVxufVxuXG4vKipcbiAqIFdoZW4gc2VyaWFsaXppbmcgdG8gSlNPTiBjb252ZXJ0IHRvIGFuIGFycmF5XG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gKCkge1xuICB2YXIgcmVzdWx0ID0gW11cbiAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgIHJlc3VsdC5wdXNoKHNlbGVjdG9yKVxuICB9KVxuICByZXR1cm4gcmVzdWx0XG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZ2V0U2VsZWN0b3JCeUlkID0gZnVuY3Rpb24gKHNlbGVjdG9ySWQpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHNlbGVjdG9yID0gdGhpc1tpXVxuICAgIGlmIChzZWxlY3Rvci5pZCA9PT0gc2VsZWN0b3JJZCkge1xuICAgICAgcmV0dXJuIHNlbGVjdG9yXG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogcmV0dXJucyBjc3Mgc2VsZWN0b3IgZm9yIGEgZ2l2ZW4gZWxlbWVudC4gY3NzIHNlbGVjdG9yIGluY2x1ZGVzIGFsbCBwYXJlbnQgZWxlbWVudCBzZWxlY3RvcnNcbiAqIEBwYXJhbSBzZWxlY3RvcklkXG4gKiBAcGFyYW0gcGFyZW50U2VsZWN0b3JJZHMgYXJyYXkgb2YgcGFyZW50IHNlbGVjdG9yIGlkcyBmcm9tIGRldnRvb2xzIEJyZWFkY3VtYlxuICogQHJldHVybnMgc3RyaW5nXG4gKi9cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZ2V0Q1NTU2VsZWN0b3JXaXRoaW5PbmVQYWdlID0gZnVuY3Rpb24gKHNlbGVjdG9ySWQsIHBhcmVudFNlbGVjdG9ySWRzKSB7XG4gIHZhciBDU1NTZWxlY3RvciA9IHRoaXMuZ2V0U2VsZWN0b3Ioc2VsZWN0b3JJZCkuc2VsZWN0b3JcbiAgdmFyIHBhcmVudENTU1NlbGVjdG9yID0gdGhpcy5nZXRQYXJlbnRDU1NTZWxlY3RvcldpdGhpbk9uZVBhZ2UocGFyZW50U2VsZWN0b3JJZHMpXG4gIENTU1NlbGVjdG9yID0gcGFyZW50Q1NTU2VsZWN0b3IgKyBDU1NTZWxlY3RvclxuXG4gIHJldHVybiBDU1NTZWxlY3RvclxufVxuXG4vKipcbiAqIHJldHVybnMgY3NzIHNlbGVjdG9yIGZvciBwYXJlbnQgc2VsZWN0b3JzIHRoYXQgYXJlIHdpdGhpbiBvbmUgcGFnZVxuICogQHBhcmFtIHBhcmVudFNlbGVjdG9ySWRzIGFycmF5IG9mIHBhcmVudCBzZWxlY3RvciBpZHMgZnJvbSBkZXZ0b29scyBCcmVhZGN1bWJcbiAqIEByZXR1cm5zIHN0cmluZ1xuICovXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmdldFBhcmVudENTU1NlbGVjdG9yV2l0aGluT25lUGFnZSA9IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3Rvcklkcykge1xuICB2YXIgQ1NTU2VsZWN0b3IgPSAnJ1xuXG4gIGZvciAodmFyIGkgPSBwYXJlbnRTZWxlY3Rvcklkcy5sZW5ndGggLSAxOyBpID4gMDsgaS0tKSB7XG4gICAgdmFyIHBhcmVudFNlbGVjdG9ySWQgPSBwYXJlbnRTZWxlY3Rvcklkc1tpXVxuICAgIHZhciBwYXJlbnRTZWxlY3RvciA9IHRoaXMuZ2V0U2VsZWN0b3IocGFyZW50U2VsZWN0b3JJZClcbiAgICBpZiAocGFyZW50U2VsZWN0b3Iud2lsbFJldHVybkVsZW1lbnRzKCkpIHtcbiAgICAgIENTU1NlbGVjdG9yID0gcGFyZW50U2VsZWN0b3Iuc2VsZWN0b3IgKyAnICcgKyBDU1NTZWxlY3RvclxuICAgIH0gZWxzZSB7XG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBDU1NTZWxlY3RvclxufVxuXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmhhc1JlY3Vyc2l2ZUVsZW1lbnRTZWxlY3RvcnMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBSZWN1cnNpb25Gb3VuZCA9IGZhbHNlXG5cbiAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uICh0b3BTZWxlY3Rvcikge1xuICAgIHZhciB2aXNpdGVkU2VsZWN0b3JzID0gW11cblxuICAgIHZhciBjaGVja1JlY3Vyc2lvbiA9IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3Rvcikge1xuXHRcdFx0Ly8gYWxyZWFkeSB2aXNpdGVkXG4gICAgICBpZiAodmlzaXRlZFNlbGVjdG9ycy5pbmRleE9mKHBhcmVudFNlbGVjdG9yKSAhPT0gLTEpIHtcbiAgICAgICAgUmVjdXJzaW9uRm91bmQgPSB0cnVlXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICBpZiAocGFyZW50U2VsZWN0b3Iud2lsbFJldHVybkVsZW1lbnRzKCkpIHtcbiAgICAgICAgdmlzaXRlZFNlbGVjdG9ycy5wdXNoKHBhcmVudFNlbGVjdG9yKVxuICAgICAgICB2YXIgY2hpbGRTZWxlY3RvcnMgPSB0aGlzLmdldERpcmVjdENoaWxkU2VsZWN0b3JzKHBhcmVudFNlbGVjdG9yLmlkKVxuICAgICAgICBjaGlsZFNlbGVjdG9ycy5mb3JFYWNoKGNoZWNrUmVjdXJzaW9uKVxuICAgICAgICB2aXNpdGVkU2VsZWN0b3JzLnBvcCgpXG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpXG5cbiAgICBjaGVja1JlY3Vyc2lvbih0b3BTZWxlY3RvcilcbiAgfS5iaW5kKHRoaXMpKVxuXG4gIHJldHVybiBSZWN1cnNpb25Gb3VuZFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yTGlzdFxuIiwidmFyIFNlbGVjdG9yRWxlbWVudCA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JFbGVtZW50JylcbnZhciBTZWxlY3RvckVsZW1lbnRBdHRyaWJ1dGUgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yRWxlbWVudEF0dHJpYnV0ZScpXG52YXIgU2VsZWN0b3JFbGVtZW50Q2xpY2sgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yRWxlbWVudENsaWNrJylcbnZhciBTZWxlY3RvckVsZW1lbnRTY3JvbGwgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yRWxlbWVudFNjcm9sbCcpXG52YXIgU2VsZWN0b3JHcm91cCA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JHcm91cCcpXG52YXIgU2VsZWN0b3JIVE1MID0gcmVxdWlyZSgnLi9TZWxlY3Rvci9TZWxlY3RvckhUTUwnKVxudmFyIFNlbGVjdG9ySW1hZ2UgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9ySW1hZ2UnKVxudmFyIFNlbGVjdG9yTGluayA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JMaW5rJylcbnZhciBTZWxlY3RvclBvcHVwTGluayA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JQb3B1cExpbmsnKVxudmFyIFNlbGVjdG9yVGFibGUgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yVGFibGUnKVxudmFyIFNlbGVjdG9yVGV4dCA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JUZXh0JylcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIFNlbGVjdG9yRWxlbWVudCxcbiAgU2VsZWN0b3JFbGVtZW50QXR0cmlidXRlLFxuICBTZWxlY3RvckVsZW1lbnRDbGljayxcbiAgU2VsZWN0b3JFbGVtZW50U2Nyb2xsLFxuICBTZWxlY3Rvckdyb3VwLFxuICBTZWxlY3RvckhUTUwsXG4gIFNlbGVjdG9ySW1hZ2UsXG4gIFNlbGVjdG9yTGluayxcbiAgU2VsZWN0b3JQb3B1cExpbmssXG4gIFNlbGVjdG9yVGFibGUsXG4gIFNlbGVjdG9yVGV4dFxufVxuIiwidmFyIFNlbGVjdG9yID0gcmVxdWlyZSgnLi9TZWxlY3RvcicpXG52YXIgU2VsZWN0b3JMaXN0ID0gcmVxdWlyZSgnLi9TZWxlY3Rvckxpc3QnKVxudmFyIFNpdGVtYXAgPSBmdW5jdGlvbiAoc2l0ZW1hcE9iaiwgb3B0aW9ucykge1xuICB0aGlzLiQgPSBvcHRpb25zLiRcbnRoaXMuZG9jdW1lbnQgPSBvcHRpb25zLmRvY3VtZW50XG50aGlzLndpbmRvdyA9IG9wdGlvbnMud2luZG93XG4gIGlmICghdGhpcy4kKSB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcganF1ZXJ5JylcbmlmICghdGhpcy5kb2N1bWVudCkgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyBkb2N1bWVudFwiKVxuaWYoIXRoaXMud2luZG93KXRocm93IG5ldyBFcnJvcihcIk1pc3Npbmcgd2luZG93XCIpXG4gIHRoaXMuaW5pdERhdGEoc2l0ZW1hcE9iailcbn1cblxuU2l0ZW1hcC5wcm90b3R5cGUgPSB7XG5cbiAgaW5pdERhdGE6IGZ1bmN0aW9uIChzaXRlbWFwT2JqKSB7XG4gICAgY29uc29sZS5sb2codGhpcylcbiAgICBmb3IgKHZhciBrZXkgaW4gc2l0ZW1hcE9iaikge1xuICAgICAgY29uc29sZS5sb2coa2V5KVxuICAgICAgdGhpc1trZXldID0gc2l0ZW1hcE9ialtrZXldXG4gICAgfVxuICAgIGNvbnNvbGUubG9nKHRoaXMpXG5cbiAgICB2YXIgc2VsZWN0b3JzID0gdGhpcy5zZWxlY3RvcnNcbiAgICB0aGlzLnNlbGVjdG9ycyA9IG5ldyBTZWxlY3Rvckxpc3QodGhpcy5zZWxlY3RvcnMsIHskOiB0aGlzLiR9KVxuICB9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIGFsbCBzZWxlY3RvcnMgb3IgcmVjdXJzaXZlbHkgZmluZCBhbmQgcmV0dXJuIGFsbCBjaGlsZCBzZWxlY3RvcnMgb2YgYSBwYXJlbnQgc2VsZWN0b3IuXG5cdCAqIEBwYXJhbSBwYXJlbnRTZWxlY3RvcklkXG5cdCAqIEByZXR1cm5zIHtBcnJheX1cblx0ICovXG4gIGdldEFsbFNlbGVjdG9yczogZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9ySWQpIHtcbiAgICByZXR1cm4gdGhpcy5zZWxlY3RvcnMuZ2V0QWxsU2VsZWN0b3JzKHBhcmVudFNlbGVjdG9ySWQpXG4gIH0sXG5cblx0LyoqXG5cdCAqIFJldHVybnMgb25seSBzZWxlY3RvcnMgdGhhdCBhcmUgZGlyZWN0bHkgdW5kZXIgYSBwYXJlbnRcblx0ICogQHBhcmFtIHBhcmVudFNlbGVjdG9ySWRcblx0ICogQHJldHVybnMge0FycmF5fVxuXHQgKi9cbiAgZ2V0RGlyZWN0Q2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3RvcklkKSB7XG4gICAgcmV0dXJuIHRoaXMuc2VsZWN0b3JzLmdldERpcmVjdENoaWxkU2VsZWN0b3JzKHBhcmVudFNlbGVjdG9ySWQpXG4gIH0sXG5cblx0LyoqXG5cdCAqIFJldHVybnMgYWxsIHNlbGVjdG9yIGlkIHBhcmFtZXRlcnNcblx0ICogQHJldHVybnMge0FycmF5fVxuXHQgKi9cbiAgZ2V0U2VsZWN0b3JJZHM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaWRzID0gWydfcm9vdCddXG4gICAgdGhpcy5zZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgIGlkcy5wdXNoKHNlbGVjdG9yLmlkKVxuICAgIH0pXG4gICAgcmV0dXJuIGlkc1xuICB9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIG9ubHkgc2VsZWN0b3IgaWRzIHdoaWNoIGNhbiBoYXZlIGNoaWxkIHNlbGVjdG9yc1xuXHQgKiBAcmV0dXJucyB7QXJyYXl9XG5cdCAqL1xuICBnZXRQb3NzaWJsZVBhcmVudFNlbGVjdG9ySWRzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGlkcyA9IFsnX3Jvb3QnXVxuICAgIHRoaXMuc2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICBpZiAoc2VsZWN0b3IuY2FuSGF2ZUNoaWxkU2VsZWN0b3JzKCkpIHtcbiAgICAgICAgaWRzLnB1c2goc2VsZWN0b3IuaWQpXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gaWRzXG4gIH0sXG5cbiAgZ2V0U3RhcnRVcmxzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN0YXJ0VXJscyA9IHRoaXMuc3RhcnRVcmxcblx0XHQvLyBzaW5nbGUgc3RhcnQgdXJsXG4gICAgaWYgKHRoaXMuc3RhcnRVcmwucHVzaCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBzdGFydFVybHMgPSBbc3RhcnRVcmxzXVxuICAgIH1cblxuICAgIHZhciB1cmxzID0gW11cbiAgICBzdGFydFVybHMuZm9yRWFjaChmdW5jdGlvbiAoc3RhcnRVcmwpIHtcblx0XHRcdC8vIHplcm8gcGFkZGluZyBoZWxwZXJcbiAgICAgIHZhciBscGFkID0gZnVuY3Rpb24gKHN0ciwgbGVuZ3RoKSB7XG4gICAgICAgIHdoaWxlIChzdHIubGVuZ3RoIDwgbGVuZ3RoKSB7IHN0ciA9ICcwJyArIHN0ciB9XG4gICAgICAgIHJldHVybiBzdHJcbiAgICAgIH1cblxuICAgICAgdmFyIHJlID0gL14oLio/KVxcWyhcXGQrKVxcLShcXGQrKSg6KFxcZCspKT9cXF0oLiopJC9cbiAgICAgIHZhciBtYXRjaGVzID0gc3RhcnRVcmwubWF0Y2gocmUpXG4gICAgICBpZiAobWF0Y2hlcykge1xuICAgICAgICB2YXIgc3RhcnRTdHIgPSBtYXRjaGVzWzJdXG4gICAgICAgIHZhciBlbmRTdHIgPSBtYXRjaGVzWzNdXG4gICAgICAgIHZhciBzdGFydCA9IHBhcnNlSW50KHN0YXJ0U3RyKVxuICAgICAgICB2YXIgZW5kID0gcGFyc2VJbnQoZW5kU3RyKVxuICAgICAgICB2YXIgaW5jcmVtZW50YWwgPSAxXG4gICAgICAgIGNvbnNvbGUubG9nKG1hdGNoZXNbNV0pXG4gICAgICAgIGlmIChtYXRjaGVzWzVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpbmNyZW1lbnRhbCA9IHBhcnNlSW50KG1hdGNoZXNbNV0pXG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDw9IGVuZDsgaSArPSBpbmNyZW1lbnRhbCkge1xuXHRcdFx0XHRcdC8vIHdpdGggemVybyBwYWRkaW5nXG4gICAgICAgICAgaWYgKHN0YXJ0U3RyLmxlbmd0aCA9PT0gZW5kU3RyLmxlbmd0aCkge1xuICAgICAgICAgICAgdXJscy5wdXNoKG1hdGNoZXNbMV0gKyBscGFkKGkudG9TdHJpbmcoKSwgc3RhcnRTdHIubGVuZ3RoKSArIG1hdGNoZXNbNl0pXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHVybHMucHVzaChtYXRjaGVzWzFdICsgaSArIG1hdGNoZXNbNl0pXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1cmxzXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB1cmxzLnB1c2goc3RhcnRVcmwpXG4gICAgICB9XG4gICAgfSlcblxuICAgIHJldHVybiB1cmxzXG4gIH0sXG5cbiAgdXBkYXRlU2VsZWN0b3I6IGZ1bmN0aW9uIChzZWxlY3Rvciwgc2VsZWN0b3JEYXRhKSB7XG5cdFx0Ly8gc2VsZWN0b3IgaXMgdW5kZWZpbmVkIHdoZW4gY3JlYXRpbmcgYSBuZXcgb25lXG4gICAgaWYgKHNlbGVjdG9yID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHNlbGVjdG9yID0gbmV3IFNlbGVjdG9yKHNlbGVjdG9yRGF0YSwgeyQ6IHRoaXMuJH0pXG4gICAgfVxuXG5cdFx0Ly8gdXBkYXRlIGNoaWxkIHNlbGVjdG9yc1xuICAgIGlmIChzZWxlY3Rvci5pZCAhPT0gdW5kZWZpbmVkICYmIHNlbGVjdG9yLmlkICE9PSBzZWxlY3RvckRhdGEuaWQpIHtcbiAgICAgIHRoaXMuc2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKGN1cnJlbnRTZWxlY3Rvcikge1xuICAgICAgICBjdXJyZW50U2VsZWN0b3IucmVuYW1lUGFyZW50U2VsZWN0b3Ioc2VsZWN0b3IuaWQsIHNlbGVjdG9yRGF0YS5pZClcbiAgICAgIH0pXG5cblx0XHRcdC8vIHVwZGF0ZSBjeWNsaWMgc2VsZWN0b3JcbiAgICAgIHZhciBwb3MgPSBzZWxlY3RvckRhdGEucGFyZW50U2VsZWN0b3JzLmluZGV4T2Yoc2VsZWN0b3IuaWQpXG4gICAgICBpZiAocG9zICE9PSAtMSkge1xuICAgICAgICBzZWxlY3RvckRhdGEucGFyZW50U2VsZWN0b3JzLnNwbGljZShwb3MsIDEsIHNlbGVjdG9yRGF0YS5pZClcbiAgICAgIH1cbiAgICB9XG5cbiAgICBzZWxlY3Rvci51cGRhdGVEYXRhKHNlbGVjdG9yRGF0YSlcblxuICAgIGlmICh0aGlzLmdldFNlbGVjdG9ySWRzKCkuaW5kZXhPZihzZWxlY3Rvci5pZCkgPT09IC0xKSB7XG4gICAgICB0aGlzLnNlbGVjdG9ycy5wdXNoKHNlbGVjdG9yKVxuICAgIH1cbiAgfSxcbiAgZGVsZXRlU2VsZWN0b3I6IGZ1bmN0aW9uIChzZWxlY3RvclRvRGVsZXRlKSB7XG4gICAgdGhpcy5zZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgIGlmIChzZWxlY3Rvci5oYXNQYXJlbnRTZWxlY3RvcihzZWxlY3RvclRvRGVsZXRlLmlkKSkge1xuICAgICAgICBzZWxlY3Rvci5yZW1vdmVQYXJlbnRTZWxlY3RvcihzZWxlY3RvclRvRGVsZXRlLmlkKVxuICAgICAgICBpZiAoc2VsZWN0b3IucGFyZW50U2VsZWN0b3JzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIHRoaXMuZGVsZXRlU2VsZWN0b3Ioc2VsZWN0b3IpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICBmb3IgKHZhciBpIGluIHRoaXMuc2VsZWN0b3JzKSB7XG4gICAgICBpZiAodGhpcy5zZWxlY3RvcnNbaV0uaWQgPT09IHNlbGVjdG9yVG9EZWxldGUuaWQpIHtcbiAgICAgICAgdGhpcy5zZWxlY3RvcnMuc3BsaWNlKGksIDEpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuICB9LFxuICBnZXREYXRhVGFibGVJZDogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9pZC5yZXBsYWNlKC9cXC4vZywgJ18nKVxuICB9LFxuICBleHBvcnRTaXRlbWFwOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNpdGVtYXBPYmogPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMpKVxuICAgIGRlbGV0ZSBzaXRlbWFwT2JqLl9yZXZcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoc2l0ZW1hcE9iailcbiAgfSxcbiAgaW1wb3J0U2l0ZW1hcDogZnVuY3Rpb24gKHNpdGVtYXBKU09OKSB7XG4gICAgdmFyIHNpdGVtYXBPYmogPSBKU09OLnBhcnNlKHNpdGVtYXBKU09OKVxuICAgIHRoaXMuaW5pdERhdGEoc2l0ZW1hcE9iailcbiAgfSxcblx0Ly8gcmV0dXJuIGEgbGlzdCBvZiBjb2x1bW5zIHRoYW4gY2FuIGJlIGV4cG9ydGVkXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNvbHVtbnMgPSBbXVxuICAgIHRoaXMuc2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICBjb2x1bW5zID0gY29sdW1ucy5jb25jYXQoc2VsZWN0b3IuZ2V0RGF0YUNvbHVtbnMoKSlcbiAgICB9KVxuXG4gICAgcmV0dXJuIGNvbHVtbnNcbiAgfSxcbiAgZ2V0RGF0YUV4cG9ydENzdkJsb2I6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdmFyIGNvbHVtbnMgPSB0aGlzLmdldERhdGFDb2x1bW5zKCksXG4gICAgICBkZWxpbWl0ZXIgPSAnLCcsXG4gICAgICBuZXdsaW5lID0gJ1xcbicsXG4gICAgICBjc3ZEYXRhID0gWydcXHVmZWZmJ10gLy8gdXRmLTggYm9tIGNoYXJcblxuXHRcdC8vIGhlYWRlclxuICAgIGNzdkRhdGEucHVzaChjb2x1bW5zLmpvaW4oZGVsaW1pdGVyKSArIG5ld2xpbmUpXG5cblx0XHQvLyBkYXRhXG4gICAgZGF0YS5mb3JFYWNoKGZ1bmN0aW9uIChyb3cpIHtcbiAgICAgIHZhciByb3dEYXRhID0gW11cbiAgICAgIGNvbHVtbnMuZm9yRWFjaChmdW5jdGlvbiAoY29sdW1uKSB7XG4gICAgICAgIHZhciBjZWxsRGF0YSA9IHJvd1tjb2x1bW5dXG4gICAgICAgIGlmIChjZWxsRGF0YSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY2VsbERhdGEgPSAnJ1xuICAgICAgICB9XHRcdFx0XHRlbHNlIGlmICh0eXBlb2YgY2VsbERhdGEgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgY2VsbERhdGEgPSBKU09OLnN0cmluZ2lmeShjZWxsRGF0YSlcbiAgICAgICAgfVxuXG4gICAgICAgIHJvd0RhdGEucHVzaCgnXCInICsgY2VsbERhdGEucmVwbGFjZSgvXCIvZywgJ1wiXCInKS50cmltKCkgKyAnXCInKVxuICAgICAgfSlcbiAgICAgIGNzdkRhdGEucHVzaChyb3dEYXRhLmpvaW4oZGVsaW1pdGVyKSArIG5ld2xpbmUpXG4gICAgfSlcblxuICAgIHJldHVybiBuZXcgQmxvYihjc3ZEYXRhLCB7dHlwZTogJ3RleHQvY3N2J30pXG4gIH0sXG4gIGdldFNlbGVjdG9yQnlJZDogZnVuY3Rpb24gKHNlbGVjdG9ySWQpIHtcbiAgICByZXR1cm4gdGhpcy5zZWxlY3RvcnMuZ2V0U2VsZWN0b3JCeUlkKHNlbGVjdG9ySWQpXG4gIH0sXG5cdC8qKlxuXHQgKiBDcmVhdGUgZnVsbCBjbG9uZSBvZiBzaXRlbWFwXG5cdCAqIEByZXR1cm5zIHtTaXRlbWFwfVxuXHQgKi9cbiAgY2xvbmU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIHZhciBjbG9uZWRKU09OID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzKSlcbiAgICB2YXIgc2l0ZW1hcCA9IG5ldyBTaXRlbWFwKGNsb25lZEpTT04sIHskfSlcbiAgICByZXR1cm4gc2l0ZW1hcFxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2l0ZW1hcFxuIiwidmFyIFNpdGVtYXAgPSByZXF1aXJlKCcuL1NpdGVtYXAnKVxuXG4vKipcbiAqIEZyb20gZGV2dG9vbHMgcGFuZWwgdGhlcmUgaXMgbm8gcG9zc2liaWxpdHkgdG8gZXhlY3V0ZSBYSFIgcmVxdWVzdHMuIFNvIGFsbCByZXF1ZXN0cyB0byBhIHJlbW90ZSBDb3VjaERiIG11c3QgYmVcbiAqIGhhbmRsZWQgdGhyb3VnaCBCYWNrZ3JvdW5kIHBhZ2UuIFN0b3JlRGV2dG9vbHMgaXMgYSBzaW1wbHkgYSBwcm94eSBzdG9yZVxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBTdG9yZURldnRvb2xzID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgdGhpcy4kID0gb3B0aW9ucy4kXG50aGlzLmRvY3VtZW50ID0gb3B0aW9ucy5kb2N1bWVudFxudGhpcy53aW5kb3cgPSBvcHRpb25zLndpbmRvd1xuICBpZiAoIXRoaXMuJCkgdGhyb3cgbmV3IEVycm9yKCdqcXVlcnkgcmVxdWlyZWQnKVxuaWYgKCF0aGlzLmRvY3VtZW50KSB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIGRvY3VtZW50XCIpXG5pZighdGhpcy53aW5kb3cpdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB3aW5kb3dcIilcbn1cblxuU3RvcmVEZXZ0b29scy5wcm90b3R5cGUgPSB7XG4gIGNyZWF0ZVNpdGVtYXA6IGZ1bmN0aW9uIChzaXRlbWFwLCBjYWxsYmFjaykge1xuICAgIHZhciByZXF1ZXN0ID0ge1xuICAgICAgY3JlYXRlU2l0ZW1hcDogdHJ1ZSxcbiAgICAgIHNpdGVtYXA6IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoc2l0ZW1hcCkpXG4gICAgfVxuXG4gICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UocmVxdWVzdCwgZnVuY3Rpb24gKGNhbGxiYWNrRm4sIG9yaWdpbmFsU2l0ZW1hcCwgbmV3U2l0ZW1hcCkge1xuICAgICAgb3JpZ2luYWxTaXRlbWFwLl9yZXYgPSBuZXdTaXRlbWFwLl9yZXZcbiAgICAgIGNhbGxiYWNrRm4ob3JpZ2luYWxTaXRlbWFwKVxuICAgIH0uYmluZCh0aGlzLCBjYWxsYmFjaywgc2l0ZW1hcCkpXG4gIH0sXG4gIHNhdmVTaXRlbWFwOiBmdW5jdGlvbiAoc2l0ZW1hcCwgY2FsbGJhY2spIHtcbiAgICB0aGlzLmNyZWF0ZVNpdGVtYXAoc2l0ZW1hcCwgY2FsbGJhY2spXG4gIH0sXG4gIGRlbGV0ZVNpdGVtYXA6IGZ1bmN0aW9uIChzaXRlbWFwLCBjYWxsYmFjaykge1xuICAgIHZhciByZXF1ZXN0ID0ge1xuICAgICAgZGVsZXRlU2l0ZW1hcDogdHJ1ZSxcbiAgICAgIHNpdGVtYXA6IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoc2l0ZW1hcCkpXG4gICAgfVxuICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHJlcXVlc3QsIGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgY2FsbGJhY2soKVxuICAgIH0pXG4gIH0sXG4gIGdldEFsbFNpdGVtYXBzOiBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIHZhciByZXF1ZXN0ID0ge1xuICAgICAgZ2V0QWxsU2l0ZW1hcHM6IHRydWVcbiAgICB9XG5cbiAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZShyZXF1ZXN0LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgIHZhciBzaXRlbWFwcyA9IFtdXG5cbiAgICAgIGZvciAodmFyIGkgaW4gcmVzcG9uc2UpIHtcbiAgICAgICAgc2l0ZW1hcHMucHVzaChuZXcgU2l0ZW1hcChyZXNwb25zZVtpXSwgeyR9KSlcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKHNpdGVtYXBzKVxuICAgIH0pXG4gIH0sXG4gIGdldFNpdGVtYXBEYXRhOiBmdW5jdGlvbiAoc2l0ZW1hcCwgY2FsbGJhY2spIHtcbiAgICB2YXIgcmVxdWVzdCA9IHtcbiAgICAgIGdldFNpdGVtYXBEYXRhOiB0cnVlLFxuICAgICAgc2l0ZW1hcDogSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzaXRlbWFwKSlcbiAgICB9XG5cbiAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZShyZXF1ZXN0LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKVxuICAgIH0pXG4gIH0sXG4gIHNpdGVtYXBFeGlzdHM6IGZ1bmN0aW9uIChzaXRlbWFwSWQsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICBzaXRlbWFwRXhpc3RzOiB0cnVlLFxuICAgICAgc2l0ZW1hcElkOiBzaXRlbWFwSWRcbiAgICB9XG5cbiAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZShyZXF1ZXN0LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKVxuICAgIH0pXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTdG9yZURldnRvb2xzXG4iLCJ2YXIgQ3NzU2VsZWN0b3IgPSByZXF1aXJlKCdjc3Mtc2VsZWN0b3InKS5Dc3NTZWxlY3RvclxuLy8gVE9ETyBnZXQgcmlkIG9mIGpxdWVyeVxuXG4vKipcbiAqIE9ubHkgRWxlbWVudHMgdW5pcXVlIHdpbGwgYmUgYWRkZWQgdG8gdGhpcyBhcnJheVxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFVuaXF1ZUVsZW1lbnRMaXN0IChjbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSwgb3B0aW9ucykge1xuICB0aGlzLiQgPSBvcHRpb25zLiRcbnRoaXMuZG9jdW1lbnQgPSBvcHRpb25zLmRvY3VtZW50XG50aGlzLndpbmRvdyA9IG9wdGlvbnMud2luZG93XG4gIGlmICghdGhpcy4kKSB0aHJvdyBuZXcgRXJyb3IoJ2pxdWVyeSByZXF1aXJlZCcpXG5pZiAoIXRoaXMuZG9jdW1lbnQpIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgZG9jdW1lbnRcIilcbmlmKCF0aGlzLndpbmRvdyl0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHdpbmRvd1wiKVxuICB0aGlzLmNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlID0gY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGVcbiAgdGhpcy5hZGRlZEVsZW1lbnRzID0ge31cbn1cblxuVW5pcXVlRWxlbWVudExpc3QucHJvdG90eXBlID0gW11cblxuVW5pcXVlRWxlbWVudExpc3QucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICB2YXIgJCA9IHRoaXMuJFxuICBpZiAodGhpcy5pc0FkZGVkKGVsZW1lbnQpKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0gZWxzZSB7XG4gICAgdmFyIGVsZW1lbnRVbmlxdWVJZCA9IHRoaXMuZ2V0RWxlbWVudFVuaXF1ZUlkKGVsZW1lbnQpXG4gICAgdGhpcy5hZGRlZEVsZW1lbnRzW2VsZW1lbnRVbmlxdWVJZF0gPSB0cnVlXG4gICAgQXJyYXkucHJvdG90eXBlLnB1c2guY2FsbCh0aGlzLCAkKGVsZW1lbnQpLmNsb25lKHRydWUpWzBdKVxuICAgIHJldHVybiB0cnVlXG4gIH1cbn1cblxuVW5pcXVlRWxlbWVudExpc3QucHJvdG90eXBlLmdldEVsZW1lbnRVbmlxdWVJZCA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gIHZhciAkID0gdGhpcy4kXG4gIGlmICh0aGlzLmNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlID09PSAndW5pcXVlVGV4dCcpIHtcbiAgICB2YXIgZWxlbWVudFRleHQgPSAkKGVsZW1lbnQpLnRleHQoKS50cmltKClcbiAgICByZXR1cm4gZWxlbWVudFRleHRcbiAgfSBlbHNlIGlmICh0aGlzLmNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlID09PSAndW5pcXVlSFRNTFRleHQnKSB7XG4gICAgdmFyIGVsZW1lbnRIVE1MID0gJChcIjxkaXYgY2xhc3M9Jy13ZWItc2NyYXBlci1zaG91bGQtbm90LWJlLXZpc2libGUnPlwiKS5hcHBlbmQoJChlbGVtZW50KS5lcSgwKS5jbG9uZSgpKS5odG1sKClcbiAgICByZXR1cm4gZWxlbWVudEhUTUxcbiAgfSBlbHNlIGlmICh0aGlzLmNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlID09PSAndW5pcXVlSFRNTCcpIHtcblx0XHQvLyBnZXQgZWxlbWVudCB3aXRob3V0IHRleHRcbiAgICB2YXIgJGVsZW1lbnQgPSAkKGVsZW1lbnQpLmVxKDApLmNsb25lKClcblxuICAgIHZhciByZW1vdmVUZXh0ID0gZnVuY3Rpb24gKCRlbGVtZW50KSB7XG4gICAgICAkZWxlbWVudC5jb250ZW50cygpXG5cdFx0XHRcdC5maWx0ZXIoZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5ub2RlVHlwZSAhPT0gMykge1xuICAgIHJlbW92ZVRleHQoJCh0aGlzKSlcbiAgfVxuICByZXR1cm4gdGhpcy5ub2RlVHlwZSA9PSAzIC8vIE5vZGUuVEVYVF9OT0RFXG59KS5yZW1vdmUoKVxuICAgIH1cbiAgICByZW1vdmVUZXh0KCRlbGVtZW50KVxuXG4gICAgdmFyIGVsZW1lbnRIVE1MID0gJChcIjxkaXYgY2xhc3M9Jy13ZWItc2NyYXBlci1zaG91bGQtbm90LWJlLXZpc2libGUnPlwiKS5hcHBlbmQoJGVsZW1lbnQpLmh0bWwoKVxuICAgIHJldHVybiBlbGVtZW50SFRNTFxuICB9IGVsc2UgaWYgKHRoaXMuY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUgPT09ICd1bmlxdWVDU1NTZWxlY3RvcicpIHtcbiAgICB2YXIgY3MgPSBuZXcgQ3NzU2VsZWN0b3Ioe1xuICAgICAgZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yOiBmYWxzZSxcbiAgICAgIHBhcmVudDogJCgnYm9keScpWzBdLFxuICAgICAgZW5hYmxlUmVzdWx0U3RyaXBwaW5nOiBmYWxzZVxuICAgIH0pXG4gICAgdmFyIENTU1NlbGVjdG9yID0gY3MuZ2V0Q3NzU2VsZWN0b3IoW2VsZW1lbnRdKVxuICAgIHJldHVybiBDU1NTZWxlY3RvclxuICB9IGVsc2Uge1xuICAgIHRocm93ICdJbnZhbGlkIGNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlICcgKyB0aGlzLmNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBVbmlxdWVFbGVtZW50TGlzdFxuXG5VbmlxdWVFbGVtZW50TGlzdC5wcm90b3R5cGUuaXNBZGRlZCA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gIHZhciBlbGVtZW50VW5pcXVlSWQgPSB0aGlzLmdldEVsZW1lbnRVbmlxdWVJZChlbGVtZW50KVxuICB2YXIgaXNBZGRlZCA9IGVsZW1lbnRVbmlxdWVJZCBpbiB0aGlzLmFkZGVkRWxlbWVudHNcbiAgcmV0dXJuIGlzQWRkZWRcbn1cbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxudmFyIEJhY2tncm91bmRTY3JpcHQgPSByZXF1aXJlKCcuL0JhY2tncm91bmRTY3JpcHQnKVxuLyoqXG4gKiBAcGFyYW0gbG9jYXRpb25cdGNvbmZpZ3VyZSBmcm9tIHdoZXJlIHRoZSBjb250ZW50IHNjcmlwdCBpcyBiZWluZyBhY2Nlc3NlZCAoQ29udGVudFNjcmlwdCwgQmFja2dyb3VuZFBhZ2UsIERldlRvb2xzKVxuICogQHJldHVybnMgQmFja2dyb3VuZFNjcmlwdFxuICovXG52YXIgZ2V0QmFja2dyb3VuZFNjcmlwdCA9IGZ1bmN0aW9uIChsb2NhdGlvbikge1xuICAvLyBIYW5kbGUgY2FsbHMgZnJvbSBkaWZmZXJlbnQgcGxhY2VzXG4gIGlmIChsb2NhdGlvbiA9PT0gJ0JhY2tncm91bmRTY3JpcHQnKSB7XG4gICAgcmV0dXJuIEJhY2tncm91bmRTY3JpcHRcbiAgfSBlbHNlIGlmIChsb2NhdGlvbiA9PT0gJ0RldlRvb2xzJyB8fCBsb2NhdGlvbiA9PT0gJ0NvbnRlbnRTY3JpcHQnKSB7XG4gICAgLy8gaWYgY2FsbGVkIHdpdGhpbiBiYWNrZ3JvdW5kIHNjcmlwdCBwcm94eSBjYWxscyB0byBjb250ZW50IHNjcmlwdFxuICAgIHZhciBiYWNrZ3JvdW5kU2NyaXB0ID0ge31cblxuICAgIE9iamVjdC5rZXlzKEJhY2tncm91bmRTY3JpcHQpLmZvckVhY2goZnVuY3Rpb24gKGF0dHIpIHtcbiAgICAgIGlmICh0eXBlb2YgQmFja2dyb3VuZFNjcmlwdFthdHRyXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBiYWNrZ3JvdW5kU2NyaXB0W2F0dHJdID0gZnVuY3Rpb24gKHJlcXVlc3QpIHtcbiAgICAgICAgICB2YXIgcmVxVG9CYWNrZ3JvdW5kU2NyaXB0ID0ge1xuICAgICAgICAgICAgYmFja2dyb3VuZFNjcmlwdENhbGw6IHRydWUsXG4gICAgICAgICAgICBmbjogYXR0cixcbiAgICAgICAgICAgIHJlcXVlc3Q6IHJlcXVlc3RcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZShyZXFUb0JhY2tncm91bmRTY3JpcHQsIGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKHJlc3BvbnNlKVxuICAgICAgICAgIH0pXG5cbiAgICAgICAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBiYWNrZ3JvdW5kU2NyaXB0W2F0dHJdID0gQmFja2dyb3VuZFNjcmlwdFthdHRyXVxuICAgICAgfVxuICAgIH0pXG5cbiAgICByZXR1cm4gYmFja2dyb3VuZFNjcmlwdFxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBCYWNrZ3JvdW5kU2NyaXB0IGluaXRpYWxpemF0aW9uIC0gJyArIGxvY2F0aW9uKVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0QmFja2dyb3VuZFNjcmlwdFxuIiwidmFyIGdldEJhY2tncm91bmRTY3JpcHQgPSByZXF1aXJlKCcuL2dldEJhY2tncm91bmRTY3JpcHQnKVxudmFyIENvbnRlbnRTY3JpcHQgPSByZXF1aXJlKCcuL0NvbnRlbnRTY3JpcHQnKVxuLyoqXG4gKlxuICogQHBhcmFtIGxvY2F0aW9uXHRjb25maWd1cmUgZnJvbSB3aGVyZSB0aGUgY29udGVudCBzY3JpcHQgaXMgYmVpbmcgYWNjZXNzZWQgKENvbnRlbnRTY3JpcHQsIEJhY2tncm91bmRQYWdlLCBEZXZUb29scylcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiBAcmV0dXJucyBDb250ZW50U2NyaXB0XG4gKi9cbnZhciBnZXRDb250ZW50U2NyaXB0ID0gZnVuY3Rpb24gKGxvY2F0aW9uKSB7XG4gIHZhciBjb250ZW50U2NyaXB0XG5cbiAgLy8gSGFuZGxlIGNhbGxzIGZyb20gZGlmZmVyZW50IHBsYWNlc1xuICBpZiAobG9jYXRpb24gPT09ICdDb250ZW50U2NyaXB0Jykge1xuICAgIGNvbnRlbnRTY3JpcHQgPSBDb250ZW50U2NyaXB0XG4gICAgY29udGVudFNjcmlwdC5iYWNrZ3JvdW5kU2NyaXB0ID0gZ2V0QmFja2dyb3VuZFNjcmlwdCgnQ29udGVudFNjcmlwdCcpXG4gICAgcmV0dXJuIGNvbnRlbnRTY3JpcHRcbiAgfSBlbHNlIGlmIChsb2NhdGlvbiA9PT0gJ0JhY2tncm91bmRTY3JpcHQnIHx8IGxvY2F0aW9uID09PSAnRGV2VG9vbHMnKSB7XG4gICAgdmFyIGJhY2tncm91bmRTY3JpcHQgPSBnZXRCYWNrZ3JvdW5kU2NyaXB0KGxvY2F0aW9uKVxuXG4gICAgLy8gaWYgY2FsbGVkIHdpdGhpbiBiYWNrZ3JvdW5kIHNjcmlwdCBwcm94eSBjYWxscyB0byBjb250ZW50IHNjcmlwdFxuICAgIGNvbnRlbnRTY3JpcHQgPSB7fVxuICAgIE9iamVjdC5rZXlzKENvbnRlbnRTY3JpcHQpLmZvckVhY2goZnVuY3Rpb24gKGF0dHIpIHtcbiAgICAgIGlmICh0eXBlb2YgQ29udGVudFNjcmlwdFthdHRyXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBjb250ZW50U2NyaXB0W2F0dHJdID0gZnVuY3Rpb24gKHJlcXVlc3QpIHtcbiAgICAgICAgICB2YXIgcmVxVG9Db250ZW50U2NyaXB0ID0ge1xuICAgICAgICAgICAgY29udGVudFNjcmlwdENhbGw6IHRydWUsXG4gICAgICAgICAgICBmbjogYXR0cixcbiAgICAgICAgICAgIHJlcXVlc3Q6IHJlcXVlc3RcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gYmFja2dyb3VuZFNjcmlwdC5leGVjdXRlQ29udGVudFNjcmlwdChyZXFUb0NvbnRlbnRTY3JpcHQpXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnRlbnRTY3JpcHRbYXR0cl0gPSBDb250ZW50U2NyaXB0W2F0dHJdXG4gICAgICB9XG4gICAgfSlcbiAgICBjb250ZW50U2NyaXB0LmJhY2tncm91bmRTY3JpcHQgPSBiYWNrZ3JvdW5kU2NyaXB0XG4gICAgcmV0dXJuIGNvbnRlbnRTY3JpcHRcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgQ29udGVudFNjcmlwdCBpbml0aWFsaXphdGlvbiAtICcgKyBsb2NhdGlvbilcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdldENvbnRlbnRTY3JpcHRcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHRDc3NTZWxlY3Rvcixcblx0RWxlbWVudFNlbGVjdG9yLFxuXHRFbGVtZW50U2VsZWN0b3JMaXN0XG59XG5cblxuZnVuY3Rpb24gQ3NzU2VsZWN0b3IgKG9wdGlvbnMpIHtcblxuXHR2YXIgbWUgPSB0aGlzO1xuXG5cdC8vIGRlZmF1bHRzXG5cdHRoaXMuaWdub3JlZFRhZ3MgPSBbJ2ZvbnQnLCAnYicsICdpJywgJ3MnXTtcblx0dGhpcy5wYXJlbnQgPSBvcHRpb25zLmRvY3VtZW50IHx8IG9wdGlvbnMucGFyZW50XG5cdHRoaXMuZG9jdW1lbnQgPSBvcHRpb25zLmRvY3VtZW50IHx8IG9wdGlvbnMucGFyZW50IFxuXHR0aGlzLmlnbm9yZWRDbGFzc0Jhc2UgPSBmYWxzZTtcblx0dGhpcy5lbmFibGVSZXN1bHRTdHJpcHBpbmcgPSB0cnVlO1xuXHR0aGlzLmVuYWJsZVNtYXJ0VGFibGVTZWxlY3RvciA9IGZhbHNlO1xuXHR0aGlzLmlnbm9yZWRDbGFzc2VzID0gW107XG4gICAgdGhpcy5hbGxvd011bHRpcGxlU2VsZWN0b3JzID0gZmFsc2U7XG5cdHRoaXMucXVlcnkgPSBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcblx0XHRyZXR1cm4gbWUucGFyZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuXHR9O1xuXG5cdC8vIG92ZXJyaWRlcyBkZWZhdWx0cyB3aXRoIG9wdGlvbnNcblx0Zm9yICh2YXIgaSBpbiBvcHRpb25zKSB7XG5cdFx0dGhpc1tpXSA9IG9wdGlvbnNbaV07XG5cdH1cbn07XG5cbi8vIFRPRE8gcmVmYWN0b3IgZWxlbWVudCBzZWxlY3RvciBsaXN0IGludG8gYSB+IGNsYXNzXG5mdW5jdGlvbiBFbGVtZW50U2VsZWN0b3IgKGVsZW1lbnQsIGlnbm9yZWRDbGFzc2VzKSB7XG5cblx0dGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblx0dGhpcy5pc0RpcmVjdENoaWxkID0gdHJ1ZTtcblx0dGhpcy50YWcgPSBlbGVtZW50LmxvY2FsTmFtZTtcblx0dGhpcy50YWcgPSB0aGlzLnRhZy5yZXBsYWNlKC86L2csICdcXFxcOicpO1xuXG5cdC8vIG50aC1vZi1jaGlsZChuKzEpXG5cdHRoaXMuaW5kZXhuID0gbnVsbDtcblx0dGhpcy5pbmRleCA9IDE7XG5cdHRoaXMuaWQgPSBudWxsO1xuXHR0aGlzLmNsYXNzZXMgPSBuZXcgQXJyYXkoKTtcblxuXHQvLyBkbyBub3QgYWRkIGFkZGl0aW5hbCBpbmZvIHRvIGh0bWwsIGJvZHkgdGFncy5cblx0Ly8gaHRtbDpudGgtb2YtdHlwZSgxKSBjYW5ub3QgYmUgc2VsZWN0ZWRcblx0aWYodGhpcy50YWcgPT09ICdodG1sJyB8fCB0aGlzLnRhZyA9PT0gJ0hUTUwnXG5cdFx0fHwgdGhpcy50YWcgPT09ICdib2R5JyB8fCB0aGlzLnRhZyA9PT0gJ0JPRFknKSB7XG5cdFx0dGhpcy5pbmRleCA9IG51bGw7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0aWYgKGVsZW1lbnQucGFyZW50Tm9kZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0Ly8gbnRoLWNoaWxkXG5cdFx0Ly90aGlzLmluZGV4ID0gW10uaW5kZXhPZi5jYWxsKGVsZW1lbnQucGFyZW50Tm9kZS5jaGlsZHJlbiwgZWxlbWVudCkrMTtcblxuXHRcdC8vIG50aC1vZi10eXBlXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50LnBhcmVudE5vZGUuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBjaGlsZCA9IGVsZW1lbnQucGFyZW50Tm9kZS5jaGlsZHJlbltpXTtcblx0XHRcdGlmIChjaGlsZCA9PT0gZWxlbWVudCkge1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHRcdGlmIChjaGlsZC50YWdOYW1lID09PSBlbGVtZW50LnRhZ05hbWUpIHtcblx0XHRcdFx0dGhpcy5pbmRleCsrO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGlmIChlbGVtZW50LmlkICE9PSAnJykge1xuXHRcdGlmICh0eXBlb2YgZWxlbWVudC5pZCA9PT0gJ3N0cmluZycpIHtcblx0XHRcdHRoaXMuaWQgPSBlbGVtZW50LmlkO1xuXHRcdFx0dGhpcy5pZCA9IHRoaXMuaWQucmVwbGFjZSgvOi9nLCAnXFxcXDonKTtcblx0XHR9XG5cdH1cblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnQuY2xhc3NMaXN0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIGNjbGFzcyA9IGVsZW1lbnQuY2xhc3NMaXN0W2ldO1xuXHRcdGlmIChpZ25vcmVkQ2xhc3Nlcy5pbmRleE9mKGNjbGFzcykgPT09IC0xKSB7XG5cdFx0XHRjY2xhc3MgPSBjY2xhc3MucmVwbGFjZSgvOi9nLCAnXFxcXDonKTtcblx0XHRcdHRoaXMuY2xhc3Nlcy5wdXNoKGNjbGFzcyk7XG5cdFx0fVxuXHR9XG59O1xuXG5mdW5jdGlvbiBFbGVtZW50U2VsZWN0b3JMaXN0IChDc3NTZWxlY3Rvcikge1xuXHR0aGlzLkNzc1NlbGVjdG9yID0gQ3NzU2VsZWN0b3I7XG59O1xuXG5FbGVtZW50U2VsZWN0b3JMaXN0LnByb3RvdHlwZSA9IG5ldyBBcnJheSgpO1xuXG5FbGVtZW50U2VsZWN0b3JMaXN0LnByb3RvdHlwZS5nZXRDc3NTZWxlY3RvciA9IGZ1bmN0aW9uICgpIHtcblxuXHR2YXIgcmVzdWx0U2VsZWN0b3JzID0gW107XG5cblx0Ly8gVEREXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBzZWxlY3RvciA9IHRoaXNbaV07XG5cblx0XHR2YXIgaXNGaXJzdFNlbGVjdG9yID0gaSA9PT0gdGhpcy5sZW5ndGgtMTtcblx0XHR2YXIgcmVzdWx0U2VsZWN0b3IgPSBzZWxlY3Rvci5nZXRDc3NTZWxlY3Rvcihpc0ZpcnN0U2VsZWN0b3IpO1xuXG5cdFx0aWYgKHRoaXMuQ3NzU2VsZWN0b3IuZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yKSB7XG5cdFx0XHRpZiAoc2VsZWN0b3IudGFnID09PSAndHInKSB7XG5cdFx0XHRcdGlmIChzZWxlY3Rvci5lbGVtZW50LmNoaWxkcmVuLmxlbmd0aCA9PT0gMikge1xuXHRcdFx0XHRcdGlmIChzZWxlY3Rvci5lbGVtZW50LmNoaWxkcmVuWzBdLnRhZ05hbWUgPT09ICdURCdcblx0XHRcdFx0XHRcdHx8IHNlbGVjdG9yLmVsZW1lbnQuY2hpbGRyZW5bMF0udGFnTmFtZSA9PT0gJ1RIJ1xuXHRcdFx0XHRcdFx0fHwgc2VsZWN0b3IuZWxlbWVudC5jaGlsZHJlblswXS50YWdOYW1lID09PSAnVFInKSB7XG5cblx0XHRcdFx0XHRcdHZhciB0ZXh0ID0gc2VsZWN0b3IuZWxlbWVudC5jaGlsZHJlblswXS50ZXh0Q29udGVudDtcblx0XHRcdFx0XHRcdHRleHQgPSB0ZXh0LnRyaW0oKTtcblxuXHRcdFx0XHRcdFx0Ly8gZXNjYXBlIHF1b3Rlc1xuXHRcdFx0XHRcdFx0dGV4dC5yZXBsYWNlKC8oXFxcXCopKCcpL2csIGZ1bmN0aW9uICh4KSB7XG5cdFx0XHRcdFx0XHRcdHZhciBsID0geC5sZW5ndGg7XG5cdFx0XHRcdFx0XHRcdHJldHVybiAobCAlIDIpID8geCA6IHguc3Vic3RyaW5nKDAsIGwgLSAxKSArIFwiXFxcXCdcIjtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0cmVzdWx0U2VsZWN0b3IgKz0gXCI6Y29udGFpbnMoJ1wiICsgdGV4dCArIFwiJylcIjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXN1bHRTZWxlY3RvcnMucHVzaChyZXN1bHRTZWxlY3Rvcik7XG5cdH1cblxuXHR2YXIgcmVzdWx0Q1NTU2VsZWN0b3IgPSByZXN1bHRTZWxlY3RvcnMucmV2ZXJzZSgpLmpvaW4oJyAnKTtcblx0cmV0dXJuIHJlc3VsdENTU1NlbGVjdG9yO1xufTtcblxuRWxlbWVudFNlbGVjdG9yLnByb3RvdHlwZSA9IHtcblxuXHRnZXRDc3NTZWxlY3RvcjogZnVuY3Rpb24gKGlzRmlyc3RTZWxlY3Rvcikge1xuXG5cdFx0aWYoaXNGaXJzdFNlbGVjdG9yID09PSB1bmRlZmluZWQpIHtcblx0XHRcdGlzRmlyc3RTZWxlY3RvciA9IGZhbHNlO1xuXHRcdH1cblxuXHRcdHZhciBzZWxlY3RvciA9IHRoaXMudGFnO1xuXHRcdGlmICh0aGlzLmlkICE9PSBudWxsKSB7XG5cdFx0XHRzZWxlY3RvciArPSAnIycgKyB0aGlzLmlkO1xuXHRcdH1cblx0XHRpZiAodGhpcy5jbGFzc2VzLmxlbmd0aCkge1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmNsYXNzZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0c2VsZWN0b3IgKz0gXCIuXCIgKyB0aGlzLmNsYXNzZXNbaV07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmICh0aGlzLmluZGV4ICE9PSBudWxsKSB7XG5cdFx0XHRzZWxlY3RvciArPSAnOm50aC1vZi10eXBlKCcgKyB0aGlzLmluZGV4ICsgJyknO1xuXHRcdH1cblx0XHRpZiAodGhpcy5pbmRleG4gIT09IG51bGwgJiYgdGhpcy5pbmRleG4gIT09IC0xKSB7XG5cdFx0XHRzZWxlY3RvciArPSAnOm50aC1vZi10eXBlKG4rJyArIHRoaXMuaW5kZXhuICsgJyknO1xuXHRcdH1cblx0XHRpZih0aGlzLmlzRGlyZWN0Q2hpbGQgJiYgaXNGaXJzdFNlbGVjdG9yID09PSBmYWxzZSkge1xuXHRcdFx0c2VsZWN0b3IgPSBcIj4gXCIrc2VsZWN0b3I7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHNlbGVjdG9yO1xuXHR9LFxuXHQvLyBtZXJnZXMgdGhpcyBzZWxlY3RvciB3aXRoIGFub3RoZXIgb25lLlxuXHRtZXJnZTogZnVuY3Rpb24gKG1lcmdlU2VsZWN0b3IpIHtcblxuXHRcdGlmICh0aGlzLnRhZyAhPT0gbWVyZ2VTZWxlY3Rvci50YWcpIHtcblx0XHRcdHRocm93IFwiZGlmZmVyZW50IGVsZW1lbnQgc2VsZWN0ZWQgKHRhZylcIjtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5pbmRleCAhPT0gbnVsbCkge1xuXHRcdFx0aWYgKHRoaXMuaW5kZXggIT09IG1lcmdlU2VsZWN0b3IuaW5kZXgpIHtcblxuXHRcdFx0XHQvLyB1c2UgaW5kZXhuIG9ubHkgZm9yIHR3byBlbGVtZW50c1xuXHRcdFx0XHRpZiAodGhpcy5pbmRleG4gPT09IG51bGwpIHtcblx0XHRcdFx0XHR2YXIgaW5kZXhuID0gTWF0aC5taW4obWVyZ2VTZWxlY3Rvci5pbmRleCwgdGhpcy5pbmRleCk7XG5cdFx0XHRcdFx0aWYgKGluZGV4biA+IDEpIHtcblx0XHRcdFx0XHRcdHRoaXMuaW5kZXhuID0gTWF0aC5taW4obWVyZ2VTZWxlY3Rvci5pbmRleCwgdGhpcy5pbmRleCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHRoaXMuaW5kZXhuID0gLTE7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR0aGlzLmluZGV4ID0gbnVsbDtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZih0aGlzLmlzRGlyZWN0Q2hpbGQgPT09IHRydWUpIHtcblx0XHRcdHRoaXMuaXNEaXJlY3RDaGlsZCA9IG1lcmdlU2VsZWN0b3IuaXNEaXJlY3RDaGlsZDtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5pZCAhPT0gbnVsbCkge1xuXHRcdFx0aWYgKHRoaXMuaWQgIT09IG1lcmdlU2VsZWN0b3IuaWQpIHtcblx0XHRcdFx0dGhpcy5pZCA9IG51bGw7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2xhc3Nlcy5sZW5ndGggIT09IDApIHtcblx0XHRcdHZhciBjbGFzc2VzID0gbmV3IEFycmF5KCk7XG5cblx0XHRcdGZvciAodmFyIGkgaW4gdGhpcy5jbGFzc2VzKSB7XG5cdFx0XHRcdHZhciBjY2xhc3MgPSB0aGlzLmNsYXNzZXNbaV07XG5cdFx0XHRcdGlmIChtZXJnZVNlbGVjdG9yLmNsYXNzZXMuaW5kZXhPZihjY2xhc3MpICE9PSAtMSkge1xuXHRcdFx0XHRcdGNsYXNzZXMucHVzaChjY2xhc3MpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuY2xhc3NlcyA9IGNsYXNzZXM7XG5cdFx0fVxuXHR9XG59O1xuXG5Dc3NTZWxlY3Rvci5wcm90b3R5cGUgPSB7XG5cdG1lcmdlRWxlbWVudFNlbGVjdG9yczogZnVuY3Rpb24gKG5ld1NlbGVjb3JzKSB7XG5cblx0XHRpZiAobmV3U2VsZWNvcnMubGVuZ3RoIDwgMSkge1xuXHRcdFx0dGhyb3cgXCJObyBzZWxlY3RvcnMgc3BlY2lmaWVkXCI7XG5cdFx0fVxuXHRcdGVsc2UgaWYgKG5ld1NlbGVjb3JzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0cmV0dXJuIG5ld1NlbGVjb3JzWzBdO1xuXHRcdH1cblxuXHRcdC8vIGNoZWNrIHNlbGVjdG9yIHRvdGFsIGNvdW50XG5cdFx0dmFyIGVsZW1lbnRDb3VudEluU2VsZWN0b3IgPSBuZXdTZWxlY29yc1swXS5sZW5ndGg7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBuZXdTZWxlY29ycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHNlbGVjdG9yID0gbmV3U2VsZWNvcnNbaV07XG5cdFx0XHRpZiAoc2VsZWN0b3IubGVuZ3RoICE9PSBlbGVtZW50Q291bnRJblNlbGVjdG9yKSB7XG5cdFx0XHRcdHRocm93IFwiSW52YWxpZCBlbGVtZW50IGNvdW50IGluIHNlbGVjdG9yXCI7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gbWVyZ2Ugc2VsZWN0b3JzXG5cdFx0dmFyIHJlc3VsdGluZ0VsZW1lbnRzID0gbmV3U2VsZWNvcnNbMF07XG5cdFx0Zm9yICh2YXIgaSA9IDE7IGkgPCBuZXdTZWxlY29ycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIG1lcmdlRWxlbWVudHMgPSBuZXdTZWxlY29yc1tpXTtcblxuXHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBlbGVtZW50Q291bnRJblNlbGVjdG9yOyBqKyspIHtcblx0XHRcdFx0cmVzdWx0aW5nRWxlbWVudHNbal0ubWVyZ2UobWVyZ2VFbGVtZW50c1tqXSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHRpbmdFbGVtZW50cztcblx0fSxcblx0c3RyaXBTZWxlY3RvcjogZnVuY3Rpb24gKHNlbGVjdG9ycykge1xuXG5cdFx0dmFyIGNzc1NlbGV0b3IgPSBzZWxlY3RvcnMuZ2V0Q3NzU2VsZWN0b3IoKTtcblx0XHR2YXIgYmFzZVNlbGVjdGVkRWxlbWVudHMgPSB0aGlzLnF1ZXJ5KGNzc1NlbGV0b3IpO1xuXG5cdFx0dmFyIGNvbXBhcmVFbGVtZW50cyA9IGZ1bmN0aW9uIChlbGVtZW50cykge1xuXHRcdFx0aWYgKGJhc2VTZWxlY3RlZEVsZW1lbnRzLmxlbmd0aCAhPT0gZWxlbWVudHMubGVuZ3RoKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBiYXNlU2VsZWN0ZWRFbGVtZW50cy5sZW5ndGg7IGorKykge1xuXHRcdFx0XHRpZiAoW10uaW5kZXhPZi5jYWxsKGVsZW1lbnRzLCBiYXNlU2VsZWN0ZWRFbGVtZW50c1tqXSkgPT09IC0xKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9O1xuXHRcdC8vIHN0cmlwIGluZGV4ZXNcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHNlbGVjdG9ycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHNlbGVjdG9yID0gc2VsZWN0b3JzW2ldO1xuXHRcdFx0aWYgKHNlbGVjdG9yLmluZGV4ICE9PSBudWxsKSB7XG5cdFx0XHRcdHZhciBpbmRleCA9IHNlbGVjdG9yLmluZGV4O1xuXHRcdFx0XHRzZWxlY3Rvci5pbmRleCA9IG51bGw7XG5cdFx0XHRcdHZhciBjc3NTZWxldG9yID0gc2VsZWN0b3JzLmdldENzc1NlbGVjdG9yKCk7XG5cdFx0XHRcdHZhciBuZXdTZWxlY3RlZEVsZW1lbnRzID0gdGhpcy5xdWVyeShjc3NTZWxldG9yKTtcblx0XHRcdFx0Ly8gaWYgcmVzdWx0cyBkb2Vzbid0IG1hdGNoIHRoZW4gdW5kbyBjaGFuZ2VzXG5cdFx0XHRcdGlmICghY29tcGFyZUVsZW1lbnRzKG5ld1NlbGVjdGVkRWxlbWVudHMpKSB7XG5cdFx0XHRcdFx0c2VsZWN0b3IuaW5kZXggPSBpbmRleDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIHN0cmlwIGlzRGlyZWN0Q2hpbGRcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHNlbGVjdG9ycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHNlbGVjdG9yID0gc2VsZWN0b3JzW2ldO1xuXHRcdFx0aWYgKHNlbGVjdG9yLmlzRGlyZWN0Q2hpbGQgPT09IHRydWUpIHtcblx0XHRcdFx0c2VsZWN0b3IuaXNEaXJlY3RDaGlsZCA9IGZhbHNlO1xuXHRcdFx0XHR2YXIgY3NzU2VsZXRvciA9IHNlbGVjdG9ycy5nZXRDc3NTZWxlY3RvcigpO1xuXHRcdFx0XHR2YXIgbmV3U2VsZWN0ZWRFbGVtZW50cyA9IHRoaXMucXVlcnkoY3NzU2VsZXRvcik7XG5cdFx0XHRcdC8vIGlmIHJlc3VsdHMgZG9lc24ndCBtYXRjaCB0aGVuIHVuZG8gY2hhbmdlc1xuXHRcdFx0XHRpZiAoIWNvbXBhcmVFbGVtZW50cyhuZXdTZWxlY3RlZEVsZW1lbnRzKSkge1xuXHRcdFx0XHRcdHNlbGVjdG9yLmlzRGlyZWN0Q2hpbGQgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gc3RyaXAgaWRzXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzZWxlY3RvcnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBzZWxlY3RvciA9IHNlbGVjdG9yc1tpXTtcblx0XHRcdGlmIChzZWxlY3Rvci5pZCAhPT0gbnVsbCkge1xuXHRcdFx0XHR2YXIgaWQgPSBzZWxlY3Rvci5pZDtcblx0XHRcdFx0c2VsZWN0b3IuaWQgPSBudWxsO1xuXHRcdFx0XHR2YXIgY3NzU2VsZXRvciA9IHNlbGVjdG9ycy5nZXRDc3NTZWxlY3RvcigpO1xuXHRcdFx0XHR2YXIgbmV3U2VsZWN0ZWRFbGVtZW50cyA9IHRoaXMucXVlcnkoY3NzU2VsZXRvcik7XG5cdFx0XHRcdC8vIGlmIHJlc3VsdHMgZG9lc24ndCBtYXRjaCB0aGVuIHVuZG8gY2hhbmdlc1xuXHRcdFx0XHRpZiAoIWNvbXBhcmVFbGVtZW50cyhuZXdTZWxlY3RlZEVsZW1lbnRzKSkge1xuXHRcdFx0XHRcdHNlbGVjdG9yLmlkID0gaWQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBzdHJpcCBjbGFzc2VzXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzZWxlY3RvcnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBzZWxlY3RvciA9IHNlbGVjdG9yc1tpXTtcblx0XHRcdGlmIChzZWxlY3Rvci5jbGFzc2VzLmxlbmd0aCAhPT0gMCkge1xuXHRcdFx0XHRmb3IgKHZhciBqID0gc2VsZWN0b3IuY2xhc3Nlcy5sZW5ndGggLSAxOyBqID4gMDsgai0tKSB7XG5cdFx0XHRcdFx0dmFyIGNjbGFzcyA9IHNlbGVjdG9yLmNsYXNzZXNbal07XG5cdFx0XHRcdFx0c2VsZWN0b3IuY2xhc3Nlcy5zcGxpY2UoaiwgMSk7XG5cdFx0XHRcdFx0dmFyIGNzc1NlbGV0b3IgPSBzZWxlY3RvcnMuZ2V0Q3NzU2VsZWN0b3IoKTtcblx0XHRcdFx0XHR2YXIgbmV3U2VsZWN0ZWRFbGVtZW50cyA9IHRoaXMucXVlcnkoY3NzU2VsZXRvcik7XG5cdFx0XHRcdFx0Ly8gaWYgcmVzdWx0cyBkb2Vzbid0IG1hdGNoIHRoZW4gdW5kbyBjaGFuZ2VzXG5cdFx0XHRcdFx0aWYgKCFjb21wYXJlRWxlbWVudHMobmV3U2VsZWN0ZWRFbGVtZW50cykpIHtcblx0XHRcdFx0XHRcdHNlbGVjdG9yLmNsYXNzZXMuc3BsaWNlKGosIDAsIGNjbGFzcyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gc3RyaXAgdGFnc1xuXHRcdGZvciAodmFyIGkgPSBzZWxlY3RvcnMubGVuZ3RoIC0gMTsgaSA+IDA7IGktLSkge1xuXHRcdFx0dmFyIHNlbGVjdG9yID0gc2VsZWN0b3JzW2ldO1xuXHRcdFx0c2VsZWN0b3JzLnNwbGljZShpLCAxKTtcblx0XHRcdHZhciBjc3NTZWxldG9yID0gc2VsZWN0b3JzLmdldENzc1NlbGVjdG9yKCk7XG5cdFx0XHR2YXIgbmV3U2VsZWN0ZWRFbGVtZW50cyA9IHRoaXMucXVlcnkoY3NzU2VsZXRvcik7XG5cdFx0XHQvLyBpZiByZXN1bHRzIGRvZXNuJ3QgbWF0Y2ggdGhlbiB1bmRvIGNoYW5nZXNcblx0XHRcdGlmICghY29tcGFyZUVsZW1lbnRzKG5ld1NlbGVjdGVkRWxlbWVudHMpKSB7XG5cdFx0XHRcdHNlbGVjdG9ycy5zcGxpY2UoaSwgMCwgc2VsZWN0b3IpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBzZWxlY3RvcnM7XG5cdH0sXG5cdGdldEVsZW1lbnRTZWxlY3RvcnM6IGZ1bmN0aW9uIChlbGVtZW50cywgdG9wKSB7XG5cdFx0dmFyIGVsZW1lbnRTZWxlY3RvcnMgPSBbXTtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBlbGVtZW50ID0gZWxlbWVudHNbaV07XG5cdFx0XHR2YXIgZWxlbWVudFNlbGVjdG9yID0gdGhpcy5nZXRFbGVtZW50U2VsZWN0b3IoZWxlbWVudCwgdG9wKTtcblx0XHRcdGVsZW1lbnRTZWxlY3RvcnMucHVzaChlbGVtZW50U2VsZWN0b3IpO1xuXHRcdH1cblxuXHRcdHJldHVybiBlbGVtZW50U2VsZWN0b3JzO1xuXHR9LFxuXHRnZXRFbGVtZW50U2VsZWN0b3I6IGZ1bmN0aW9uIChlbGVtZW50LCB0b3ApIHtcblxuXHRcdHZhciBlbGVtZW50U2VsZWN0b3JMaXN0ID0gbmV3IEVsZW1lbnRTZWxlY3Rvckxpc3QodGhpcyk7XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdGlmIChlbGVtZW50ID09PSB0aGlzLnBhcmVudCkge1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKGVsZW1lbnQgPT09IHVuZGVmaW5lZCB8fCBlbGVtZW50ID09PSB0aGlzLmRvY3VtZW50KSB7XG5cdFx0XHRcdHRocm93ICdlbGVtZW50IGlzIG5vdCBhIGNoaWxkIG9mIHRoZSBnaXZlbiBwYXJlbnQnO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRoaXMuaXNJZ25vcmVkVGFnKGVsZW1lbnQudGFnTmFtZSkpIHtcblxuXHRcdFx0XHRlbGVtZW50ID0gZWxlbWVudC5wYXJlbnROb2RlO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblx0XHRcdGlmICh0b3AgPiAwKSB7XG5cdFx0XHRcdHRvcC0tO1xuXHRcdFx0XHRlbGVtZW50ID0gZWxlbWVudC5wYXJlbnROb2RlO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0dmFyIHNlbGVjdG9yID0gbmV3IEVsZW1lbnRTZWxlY3RvcihlbGVtZW50LCB0aGlzLmlnbm9yZWRDbGFzc2VzKTtcblx0XHRcdC8vIGRvY3VtZW50IGRvZXMgbm90IGhhdmUgYSB0YWdOYW1lXG5cdFx0XHRpZihlbGVtZW50LnBhcmVudE5vZGUgPT09IHRoaXMuZG9jdW1lbnQgfHwgdGhpcy5pc0lnbm9yZWRUYWcoZWxlbWVudC5wYXJlbnROb2RlLnRhZ05hbWUpKSB7XG5cdFx0XHRcdHNlbGVjdG9yLmlzRGlyZWN0Q2hpbGQgPSBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0ZWxlbWVudFNlbGVjdG9yTGlzdC5wdXNoKHNlbGVjdG9yKTtcblx0XHRcdGVsZW1lbnQgPSBlbGVtZW50LnBhcmVudE5vZGU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGVsZW1lbnRTZWxlY3Rvckxpc3Q7XG5cdH0sXG5cbiAgICAvKipcbiAgICAgKiBDb21wYXJlcyB3aGV0aGVyIHR3byBlbGVtZW50cyBhcmUgc2ltaWxhci4gU2ltaWxhciBlbGVtZW50cyBzaG91bGRcbiAgICAgKiBoYXZlIGEgY29tbW9uIHBhcnJlbnQgYW5kIGFsbCBwYXJlbnQgZWxlbWVudHMgc2hvdWxkIGJlIHRoZSBzYW1lIHR5cGUuXG4gICAgICogQHBhcmFtIGVsZW1lbnQxXG4gICAgICogQHBhcmFtIGVsZW1lbnQyXG4gICAgICovXG4gICAgY2hlY2tTaW1pbGFyRWxlbWVudHM6IGZ1bmN0aW9uKGVsZW1lbnQxLCBlbGVtZW50Mikge1xuXG4gICAgICAgIHdoaWxlICh0cnVlKSB7XG5cbiAgICAgICAgICAgIGlmKGVsZW1lbnQxLnRhZ05hbWUgIT09IGVsZW1lbnQyLnRhZ05hbWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZihlbGVtZW50MSA9PT0gZWxlbWVudDIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gc3RvcCBhdCBib2R5IHRhZ1xuICAgICAgICAgICAgaWYgKGVsZW1lbnQxID09PSB1bmRlZmluZWQgfHwgZWxlbWVudDEudGFnTmFtZSA9PT0gJ2JvZHknXG4gICAgICAgICAgICAgICAgfHwgZWxlbWVudDEudGFnTmFtZSA9PT0gJ0JPRFknKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGVsZW1lbnQyID09PSB1bmRlZmluZWQgfHwgZWxlbWVudDIudGFnTmFtZSA9PT0gJ2JvZHknXG4gICAgICAgICAgICAgICAgfHwgZWxlbWVudDIudGFnTmFtZSA9PT0gJ0JPRFknKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBlbGVtZW50MSA9IGVsZW1lbnQxLnBhcmVudE5vZGU7XG4gICAgICAgICAgICBlbGVtZW50MiA9IGVsZW1lbnQyLnBhcmVudE5vZGU7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR3JvdXBzIGVsZW1lbnRzIGludG8gZ3JvdXBzIGlmIHRoZSBlbWVsZW50cyBhcmUgbm90IHNpbWlsYXJcbiAgICAgKiBAcGFyYW0gZWxlbWVudHNcbiAgICAgKi9cbiAgICBnZXRFbGVtZW50R3JvdXBzOiBmdW5jdGlvbihlbGVtZW50cykge1xuXG4gICAgICAgIC8vIGZpcnN0IGVsbWVudCBpcyBpbiB0aGUgZmlyc3QgZ3JvdXBcbiAgICAgICAgLy8gQFRPRE8gbWF5YmUgaSBkb250IG5lZWQgdGhpcz9cbiAgICAgICAgdmFyIGdyb3VwcyA9IFtbZWxlbWVudHNbMF1dXTtcblxuICAgICAgICBmb3IodmFyIGkgPSAxOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBlbGVtZW50TmV3ID0gZWxlbWVudHNbaV07XG4gICAgICAgICAgICB2YXIgYWRkZWRUb0dyb3VwID0gZmFsc2U7XG4gICAgICAgICAgICBmb3IodmFyIGogPSAwOyBqIDwgZ3JvdXBzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGdyb3VwID0gZ3JvdXBzW2pdO1xuICAgICAgICAgICAgICAgIHZhciBlbGVtZW50R3JvdXAgPSBncm91cFswXTtcbiAgICAgICAgICAgICAgICBpZih0aGlzLmNoZWNrU2ltaWxhckVsZW1lbnRzKGVsZW1lbnROZXcsIGVsZW1lbnRHcm91cCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZ3JvdXAucHVzaChlbGVtZW50TmV3KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkZWRUb0dyb3VwID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBhZGQgbmV3IGdyb3VwXG4gICAgICAgICAgICBpZighYWRkZWRUb0dyb3VwKSB7XG4gICAgICAgICAgICAgICAgZ3JvdXBzLnB1c2goW2VsZW1lbnROZXddKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBncm91cHM7XG4gICAgfSxcblx0Z2V0Q3NzU2VsZWN0b3I6IGZ1bmN0aW9uIChlbGVtZW50cywgdG9wKSB7XG5cblx0XHR0b3AgPSB0b3AgfHwgMDtcblxuXHRcdHZhciBlbmFibGVTbWFydFRhYmxlU2VsZWN0b3IgPSB0aGlzLmVuYWJsZVNtYXJ0VGFibGVTZWxlY3Rvcjtcblx0XHRpZiAoZWxlbWVudHMubGVuZ3RoID4gMSkge1xuXHRcdFx0dGhpcy5lbmFibGVTbWFydFRhYmxlU2VsZWN0b3IgPSBmYWxzZTtcblx0XHR9XG5cbiAgICAgICAgLy8gZ3JvdXAgZWxlbWVudHMgaW50byBzaW1pbGFyaXR5IGdyb3Vwc1xuICAgICAgICB2YXIgZWxlbWVudEdyb3VwcyA9IHRoaXMuZ2V0RWxlbWVudEdyb3VwcyhlbGVtZW50cyk7XG5cbiAgICAgICAgdmFyIHJlc3VsdENTU1NlbGVjdG9yO1xuXG4gICAgICAgIGlmKHRoaXMuYWxsb3dNdWx0aXBsZVNlbGVjdG9ycykge1xuXG4gICAgICAgICAgICB2YXIgZ3JvdXBTZWxlY3RvcnMgPSBbXTtcblxuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGVsZW1lbnRHcm91cHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgZ3JvdXBFbGVtZW50cyA9IGVsZW1lbnRHcm91cHNbaV07XG5cbiAgICAgICAgICAgICAgICB2YXIgZWxlbWVudFNlbGVjdG9ycyA9IHRoaXMuZ2V0RWxlbWVudFNlbGVjdG9ycyhncm91cEVsZW1lbnRzLCB0b3ApO1xuICAgICAgICAgICAgICAgIHZhciByZXN1bHRTZWxlY3RvciA9IHRoaXMubWVyZ2VFbGVtZW50U2VsZWN0b3JzKGVsZW1lbnRTZWxlY3RvcnMpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmVuYWJsZVJlc3VsdFN0cmlwcGluZykge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRTZWxlY3RvciA9IHRoaXMuc3RyaXBTZWxlY3RvcihyZXN1bHRTZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZ3JvdXBTZWxlY3RvcnMucHVzaChyZXN1bHRTZWxlY3Rvci5nZXRDc3NTZWxlY3RvcigpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVzdWx0Q1NTU2VsZWN0b3IgPSBncm91cFNlbGVjdG9ycy5qb2luKCcsICcpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYoZWxlbWVudEdyb3Vwcy5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBcImZvdW5kIG11bHRpcGxlIGVsZW1lbnQgZ3JvdXBzLCBidXQgYWxsb3dNdWx0aXBsZVNlbGVjdG9ycyBkaXNhYmxlZFwiO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgZWxlbWVudFNlbGVjdG9ycyA9IHRoaXMuZ2V0RWxlbWVudFNlbGVjdG9ycyhlbGVtZW50cywgdG9wKTtcbiAgICAgICAgICAgIHZhciByZXN1bHRTZWxlY3RvciA9IHRoaXMubWVyZ2VFbGVtZW50U2VsZWN0b3JzKGVsZW1lbnRTZWxlY3RvcnMpO1xuICAgICAgICAgICAgaWYgKHRoaXMuZW5hYmxlUmVzdWx0U3RyaXBwaW5nKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0U2VsZWN0b3IgPSB0aGlzLnN0cmlwU2VsZWN0b3IocmVzdWx0U2VsZWN0b3IpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXN1bHRDU1NTZWxlY3RvciA9IHJlc3VsdFNlbGVjdG9yLmdldENzc1NlbGVjdG9yKCk7XG4gICAgICAgIH1cblxuXHRcdHRoaXMuZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yID0gZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yO1xuXG5cdFx0Ly8gc3RyaXAgZG93biBzZWxlY3RvclxuXHRcdHJldHVybiByZXN1bHRDU1NTZWxlY3Rvcjtcblx0fSxcblx0aXNJZ25vcmVkVGFnOiBmdW5jdGlvbiAodGFnKSB7XG5cdFx0cmV0dXJuIHRoaXMuaWdub3JlZFRhZ3MuaW5kZXhPZih0YWcudG9Mb3dlckNhc2UoKSkgIT09IC0xO1xuXHR9XG59O1xuIiwiXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vbGliL2pxdWVyeS1kZWZlcnJlZCcpOyIsInZhciBqUXVlcnkgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL2pxdWVyeS1jb3JlLmpzXCIpLFxuXHRjb3JlX3JzcGFjZSA9IC9cXHMrLztcbi8qKlxuKiBqUXVlcnkgQ2FsbGJhY2tzXG4qXG4qIENvZGUgZnJvbTogaHR0cHM6Ly9naXRodWIuY29tL2pxdWVyeS9qcXVlcnkvYmxvYi9tYXN0ZXIvc3JjL2NhbGxiYWNrcy5qc1xuKlxuKi9cblxuXG4vLyBTdHJpbmcgdG8gT2JqZWN0IG9wdGlvbnMgZm9ybWF0IGNhY2hlXG52YXIgb3B0aW9uc0NhY2hlID0ge307XG5cbi8vIENvbnZlcnQgU3RyaW5nLWZvcm1hdHRlZCBvcHRpb25zIGludG8gT2JqZWN0LWZvcm1hdHRlZCBvbmVzIGFuZCBzdG9yZSBpbiBjYWNoZVxuZnVuY3Rpb24gY3JlYXRlT3B0aW9ucyggb3B0aW9ucyApIHtcblx0dmFyIG9iamVjdCA9IG9wdGlvbnNDYWNoZVsgb3B0aW9ucyBdID0ge307XG5cdGpRdWVyeS5lYWNoKCBvcHRpb25zLnNwbGl0KCBjb3JlX3JzcGFjZSApLCBmdW5jdGlvbiggXywgZmxhZyApIHtcblx0XHRvYmplY3RbIGZsYWcgXSA9IHRydWU7XG5cdH0pO1xuXHRyZXR1cm4gb2JqZWN0O1xufVxuXG4vKlxuICogQ3JlYXRlIGEgY2FsbGJhY2sgbGlzdCB1c2luZyB0aGUgZm9sbG93aW5nIHBhcmFtZXRlcnM6XG4gKlxuICpcdG9wdGlvbnM6IGFuIG9wdGlvbmFsIGxpc3Qgb2Ygc3BhY2Utc2VwYXJhdGVkIG9wdGlvbnMgdGhhdCB3aWxsIGNoYW5nZSBob3dcbiAqXHRcdFx0dGhlIGNhbGxiYWNrIGxpc3QgYmVoYXZlcyBvciBhIG1vcmUgdHJhZGl0aW9uYWwgb3B0aW9uIG9iamVjdFxuICpcbiAqIEJ5IGRlZmF1bHQgYSBjYWxsYmFjayBsaXN0IHdpbGwgYWN0IGxpa2UgYW4gZXZlbnQgY2FsbGJhY2sgbGlzdCBhbmQgY2FuIGJlXG4gKiBcImZpcmVkXCIgbXVsdGlwbGUgdGltZXMuXG4gKlxuICogUG9zc2libGUgb3B0aW9uczpcbiAqXG4gKlx0b25jZTpcdFx0XHR3aWxsIGVuc3VyZSB0aGUgY2FsbGJhY2sgbGlzdCBjYW4gb25seSBiZSBmaXJlZCBvbmNlIChsaWtlIGEgRGVmZXJyZWQpXG4gKlxuICpcdG1lbW9yeTpcdFx0XHR3aWxsIGtlZXAgdHJhY2sgb2YgcHJldmlvdXMgdmFsdWVzIGFuZCB3aWxsIGNhbGwgYW55IGNhbGxiYWNrIGFkZGVkXG4gKlx0XHRcdFx0XHRhZnRlciB0aGUgbGlzdCBoYXMgYmVlbiBmaXJlZCByaWdodCBhd2F5IHdpdGggdGhlIGxhdGVzdCBcIm1lbW9yaXplZFwiXG4gKlx0XHRcdFx0XHR2YWx1ZXMgKGxpa2UgYSBEZWZlcnJlZClcbiAqXG4gKlx0dW5pcXVlOlx0XHRcdHdpbGwgZW5zdXJlIGEgY2FsbGJhY2sgY2FuIG9ubHkgYmUgYWRkZWQgb25jZSAobm8gZHVwbGljYXRlIGluIHRoZSBsaXN0KVxuICpcbiAqXHRzdG9wT25GYWxzZTpcdGludGVycnVwdCBjYWxsaW5ncyB3aGVuIGEgY2FsbGJhY2sgcmV0dXJucyBmYWxzZVxuICpcbiAqL1xualF1ZXJ5LkNhbGxiYWNrcyA9IGZ1bmN0aW9uKCBvcHRpb25zICkge1xuXG5cdC8vIENvbnZlcnQgb3B0aW9ucyBmcm9tIFN0cmluZy1mb3JtYXR0ZWQgdG8gT2JqZWN0LWZvcm1hdHRlZCBpZiBuZWVkZWRcblx0Ly8gKHdlIGNoZWNrIGluIGNhY2hlIGZpcnN0KVxuXHRvcHRpb25zID0gdHlwZW9mIG9wdGlvbnMgPT09IFwic3RyaW5nXCIgP1xuXHRcdCggb3B0aW9uc0NhY2hlWyBvcHRpb25zIF0gfHwgY3JlYXRlT3B0aW9ucyggb3B0aW9ucyApICkgOlxuXHRcdGpRdWVyeS5leHRlbmQoIHt9LCBvcHRpb25zICk7XG5cblx0dmFyIC8vIExhc3QgZmlyZSB2YWx1ZSAoZm9yIG5vbi1mb3JnZXR0YWJsZSBsaXN0cylcblx0XHRtZW1vcnksXG5cdFx0Ly8gRmxhZyB0byBrbm93IGlmIGxpc3Qgd2FzIGFscmVhZHkgZmlyZWRcblx0XHRmaXJlZCxcblx0XHQvLyBGbGFnIHRvIGtub3cgaWYgbGlzdCBpcyBjdXJyZW50bHkgZmlyaW5nXG5cdFx0ZmlyaW5nLFxuXHRcdC8vIEZpcnN0IGNhbGxiYWNrIHRvIGZpcmUgKHVzZWQgaW50ZXJuYWxseSBieSBhZGQgYW5kIGZpcmVXaXRoKVxuXHRcdGZpcmluZ1N0YXJ0LFxuXHRcdC8vIEVuZCBvZiB0aGUgbG9vcCB3aGVuIGZpcmluZ1xuXHRcdGZpcmluZ0xlbmd0aCxcblx0XHQvLyBJbmRleCBvZiBjdXJyZW50bHkgZmlyaW5nIGNhbGxiYWNrIChtb2RpZmllZCBieSByZW1vdmUgaWYgbmVlZGVkKVxuXHRcdGZpcmluZ0luZGV4LFxuXHRcdC8vIEFjdHVhbCBjYWxsYmFjayBsaXN0XG5cdFx0bGlzdCA9IFtdLFxuXHRcdC8vIFN0YWNrIG9mIGZpcmUgY2FsbHMgZm9yIHJlcGVhdGFibGUgbGlzdHNcblx0XHRzdGFjayA9ICFvcHRpb25zLm9uY2UgJiYgW10sXG5cdFx0Ly8gRmlyZSBjYWxsYmFja3Ncblx0XHRmaXJlID0gZnVuY3Rpb24oIGRhdGEgKSB7XG5cdFx0XHRtZW1vcnkgPSBvcHRpb25zLm1lbW9yeSAmJiBkYXRhO1xuXHRcdFx0ZmlyZWQgPSB0cnVlO1xuXHRcdFx0ZmlyaW5nSW5kZXggPSBmaXJpbmdTdGFydCB8fCAwO1xuXHRcdFx0ZmlyaW5nU3RhcnQgPSAwO1xuXHRcdFx0ZmlyaW5nTGVuZ3RoID0gbGlzdC5sZW5ndGg7XG5cdFx0XHRmaXJpbmcgPSB0cnVlO1xuXHRcdFx0Zm9yICggOyBsaXN0ICYmIGZpcmluZ0luZGV4IDwgZmlyaW5nTGVuZ3RoOyBmaXJpbmdJbmRleCsrICkge1xuXHRcdFx0XHRpZiAoIGxpc3RbIGZpcmluZ0luZGV4IF0uYXBwbHkoIGRhdGFbIDAgXSwgZGF0YVsgMSBdICkgPT09IGZhbHNlICYmIG9wdGlvbnMuc3RvcE9uRmFsc2UgKSB7XG5cdFx0XHRcdFx0bWVtb3J5ID0gZmFsc2U7IC8vIFRvIHByZXZlbnQgZnVydGhlciBjYWxscyB1c2luZyBhZGRcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0ZmlyaW5nID0gZmFsc2U7XG5cdFx0XHRpZiAoIGxpc3QgKSB7XG5cdFx0XHRcdGlmICggc3RhY2sgKSB7XG5cdFx0XHRcdFx0aWYgKCBzdGFjay5sZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRmaXJlKCBzdGFjay5zaGlmdCgpICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2UgaWYgKCBtZW1vcnkgKSB7XG5cdFx0XHRcdFx0bGlzdCA9IFtdO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHNlbGYuZGlzYWJsZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblx0XHQvLyBBY3R1YWwgQ2FsbGJhY2tzIG9iamVjdFxuXHRcdHNlbGYgPSB7XG5cdFx0XHQvLyBBZGQgYSBjYWxsYmFjayBvciBhIGNvbGxlY3Rpb24gb2YgY2FsbGJhY2tzIHRvIHRoZSBsaXN0XG5cdFx0XHRhZGQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAoIGxpc3QgKSB7XG5cdFx0XHRcdFx0Ly8gRmlyc3QsIHdlIHNhdmUgdGhlIGN1cnJlbnQgbGVuZ3RoXG5cdFx0XHRcdFx0dmFyIHN0YXJ0ID0gbGlzdC5sZW5ndGg7XG5cdFx0XHRcdFx0KGZ1bmN0aW9uIGFkZCggYXJncyApIHtcblx0XHRcdFx0XHRcdGpRdWVyeS5lYWNoKCBhcmdzLCBmdW5jdGlvbiggXywgYXJnICkge1xuXHRcdFx0XHRcdFx0XHR2YXIgdHlwZSA9IGpRdWVyeS50eXBlKCBhcmcgKTtcblx0XHRcdFx0XHRcdFx0aWYgKCB0eXBlID09PSBcImZ1bmN0aW9uXCIgKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCAhb3B0aW9ucy51bmlxdWUgfHwgIXNlbGYuaGFzKCBhcmcgKSApIHtcblx0XHRcdFx0XHRcdFx0XHRcdGxpc3QucHVzaCggYXJnICk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKCBhcmcgJiYgYXJnLmxlbmd0aCAmJiB0eXBlICE9PSBcInN0cmluZ1wiICkge1xuXHRcdFx0XHRcdFx0XHRcdC8vIEluc3BlY3QgcmVjdXJzaXZlbHlcblx0XHRcdFx0XHRcdFx0XHRhZGQoIGFyZyApO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9KSggYXJndW1lbnRzICk7XG5cdFx0XHRcdFx0Ly8gRG8gd2UgbmVlZCB0byBhZGQgdGhlIGNhbGxiYWNrcyB0byB0aGVcblx0XHRcdFx0XHQvLyBjdXJyZW50IGZpcmluZyBiYXRjaD9cblx0XHRcdFx0XHRpZiAoIGZpcmluZyApIHtcblx0XHRcdFx0XHRcdGZpcmluZ0xlbmd0aCA9IGxpc3QubGVuZ3RoO1xuXHRcdFx0XHRcdC8vIFdpdGggbWVtb3J5LCBpZiB3ZSdyZSBub3QgZmlyaW5nIHRoZW5cblx0XHRcdFx0XHQvLyB3ZSBzaG91bGQgY2FsbCByaWdodCBhd2F5XG5cdFx0XHRcdFx0fSBlbHNlIGlmICggbWVtb3J5ICkge1xuXHRcdFx0XHRcdFx0ZmlyaW5nU3RhcnQgPSBzdGFydDtcblx0XHRcdFx0XHRcdGZpcmUoIG1lbW9yeSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH0sXG5cdFx0XHQvLyBSZW1vdmUgYSBjYWxsYmFjayBmcm9tIHRoZSBsaXN0XG5cdFx0XHRyZW1vdmU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAoIGxpc3QgKSB7XG5cdFx0XHRcdFx0alF1ZXJ5LmVhY2goIGFyZ3VtZW50cywgZnVuY3Rpb24oIF8sIGFyZyApIHtcblx0XHRcdFx0XHRcdHZhciBpbmRleDtcblx0XHRcdFx0XHRcdHdoaWxlKCAoIGluZGV4ID0galF1ZXJ5LmluQXJyYXkoIGFyZywgbGlzdCwgaW5kZXggKSApID4gLTEgKSB7XG5cdFx0XHRcdFx0XHRcdGxpc3Quc3BsaWNlKCBpbmRleCwgMSApO1xuXHRcdFx0XHRcdFx0XHQvLyBIYW5kbGUgZmlyaW5nIGluZGV4ZXNcblx0XHRcdFx0XHRcdFx0aWYgKCBmaXJpbmcgKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCBpbmRleCA8PSBmaXJpbmdMZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRmaXJpbmdMZW5ndGgtLTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCBpbmRleCA8PSBmaXJpbmdJbmRleCApIHtcblx0XHRcdFx0XHRcdFx0XHRcdGZpcmluZ0luZGV4LS07XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gQ29udHJvbCBpZiBhIGdpdmVuIGNhbGxiYWNrIGlzIGluIHRoZSBsaXN0XG5cdFx0XHRoYXM6IGZ1bmN0aW9uKCBmbiApIHtcblx0XHRcdFx0cmV0dXJuIGpRdWVyeS5pbkFycmF5KCBmbiwgbGlzdCApID4gLTE7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gUmVtb3ZlIGFsbCBjYWxsYmFja3MgZnJvbSB0aGUgbGlzdFxuXHRcdFx0ZW1wdHk6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRsaXN0ID0gW107XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fSxcblx0XHRcdC8vIEhhdmUgdGhlIGxpc3QgZG8gbm90aGluZyBhbnltb3JlXG5cdFx0XHRkaXNhYmxlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0bGlzdCA9IHN0YWNrID0gbWVtb3J5ID0gdW5kZWZpbmVkO1xuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH0sXG5cdFx0XHQvLyBJcyBpdCBkaXNhYmxlZD9cblx0XHRcdGRpc2FibGVkOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuICFsaXN0O1xuXHRcdFx0fSxcblx0XHRcdC8vIExvY2sgdGhlIGxpc3QgaW4gaXRzIGN1cnJlbnQgc3RhdGVcblx0XHRcdGxvY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRzdGFjayA9IHVuZGVmaW5lZDtcblx0XHRcdFx0aWYgKCAhbWVtb3J5ICkge1xuXHRcdFx0XHRcdHNlbGYuZGlzYWJsZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fSxcblx0XHRcdC8vIElzIGl0IGxvY2tlZD9cblx0XHRcdGxvY2tlZDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiAhc3RhY2s7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gQ2FsbCBhbGwgY2FsbGJhY2tzIHdpdGggdGhlIGdpdmVuIGNvbnRleHQgYW5kIGFyZ3VtZW50c1xuXHRcdFx0ZmlyZVdpdGg6IGZ1bmN0aW9uKCBjb250ZXh0LCBhcmdzICkge1xuXHRcdFx0XHRhcmdzID0gYXJncyB8fCBbXTtcblx0XHRcdFx0YXJncyA9IFsgY29udGV4dCwgYXJncy5zbGljZSA/IGFyZ3Muc2xpY2UoKSA6IGFyZ3MgXTtcblx0XHRcdFx0aWYgKCBsaXN0ICYmICggIWZpcmVkIHx8IHN0YWNrICkgKSB7XG5cdFx0XHRcdFx0aWYgKCBmaXJpbmcgKSB7XG5cdFx0XHRcdFx0XHRzdGFjay5wdXNoKCBhcmdzICk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGZpcmUoIGFyZ3MgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gQ2FsbCBhbGwgdGhlIGNhbGxiYWNrcyB3aXRoIHRoZSBnaXZlbiBhcmd1bWVudHNcblx0XHRcdGZpcmU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRzZWxmLmZpcmVXaXRoKCB0aGlzLCBhcmd1bWVudHMgKTtcblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gVG8ga25vdyBpZiB0aGUgY2FsbGJhY2tzIGhhdmUgYWxyZWFkeSBiZWVuIGNhbGxlZCBhdCBsZWFzdCBvbmNlXG5cdFx0XHRmaXJlZDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiAhIWZpcmVkO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0cmV0dXJuIHNlbGY7XG59O1xuXG4iLCIvKipcbiogalF1ZXJ5IGNvcmUgb2JqZWN0LlxuKlxuKiBXb3JrZXIgd2l0aCBqUXVlcnkgZGVmZXJyZWRcbipcbiogQ29kZSBmcm9tOiBodHRwczovL2dpdGh1Yi5jb20vanF1ZXJ5L2pxdWVyeS9ibG9iL21hc3Rlci9zcmMvY29yZS5qc1xuKlxuKi9cblxudmFyIGpRdWVyeSA9IG1vZHVsZS5leHBvcnRzID0ge1xuXHR0eXBlOiB0eXBlXG5cdCwgaXNBcnJheTogaXNBcnJheVxuXHQsIGlzRnVuY3Rpb246IGlzRnVuY3Rpb25cblx0LCBpc1BsYWluT2JqZWN0OiBpc1BsYWluT2JqZWN0XG5cdCwgZWFjaDogZWFjaFxuXHQsIGV4dGVuZDogZXh0ZW5kXG5cdCwgbm9vcDogZnVuY3Rpb24oKSB7fVxufTtcblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxudmFyIGNsYXNzMnR5cGUgPSB7fTtcbi8vIFBvcHVsYXRlIHRoZSBjbGFzczJ0eXBlIG1hcFxuXCJCb29sZWFuIE51bWJlciBTdHJpbmcgRnVuY3Rpb24gQXJyYXkgRGF0ZSBSZWdFeHAgT2JqZWN0XCIuc3BsaXQoXCIgXCIpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuXHRjbGFzczJ0eXBlWyBcIltvYmplY3QgXCIgKyBuYW1lICsgXCJdXCIgXSA9IG5hbWUudG9Mb3dlckNhc2UoKTtcbn0pO1xuXG5cbmZ1bmN0aW9uIHR5cGUoIG9iaiApIHtcblx0cmV0dXJuIG9iaiA9PSBudWxsID9cblx0XHRTdHJpbmcoIG9iaiApIDpcblx0XHRcdGNsYXNzMnR5cGVbIHRvU3RyaW5nLmNhbGwob2JqKSBdIHx8IFwib2JqZWN0XCI7XG59XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oIG9iaiApIHtcblx0cmV0dXJuIGpRdWVyeS50eXBlKG9iaikgPT09IFwiZnVuY3Rpb25cIjtcbn1cblxuZnVuY3Rpb24gaXNBcnJheSggb2JqICkge1xuXHRyZXR1cm4galF1ZXJ5LnR5cGUob2JqKSA9PT0gXCJhcnJheVwiO1xufVxuXG5mdW5jdGlvbiBlYWNoKCBvYmplY3QsIGNhbGxiYWNrLCBhcmdzICkge1xuXHR2YXIgbmFtZSwgaSA9IDAsXG5cdGxlbmd0aCA9IG9iamVjdC5sZW5ndGgsXG5cdGlzT2JqID0gbGVuZ3RoID09PSB1bmRlZmluZWQgfHwgaXNGdW5jdGlvbiggb2JqZWN0ICk7XG5cblx0aWYgKCBhcmdzICkge1xuXHRcdGlmICggaXNPYmogKSB7XG5cdFx0XHRmb3IgKCBuYW1lIGluIG9iamVjdCApIHtcblx0XHRcdFx0aWYgKCBjYWxsYmFjay5hcHBseSggb2JqZWN0WyBuYW1lIF0sIGFyZ3MgKSA9PT0gZmFsc2UgKSB7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0Zm9yICggOyBpIDwgbGVuZ3RoOyApIHtcblx0XHRcdFx0aWYgKCBjYWxsYmFjay5hcHBseSggb2JqZWN0WyBpKysgXSwgYXJncyApID09PSBmYWxzZSApIHtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIEEgc3BlY2lhbCwgZmFzdCwgY2FzZSBmb3IgdGhlIG1vc3QgY29tbW9uIHVzZSBvZiBlYWNoXG5cdH0gZWxzZSB7XG5cdFx0aWYgKCBpc09iaiApIHtcblx0XHRcdGZvciAoIG5hbWUgaW4gb2JqZWN0ICkge1xuXHRcdFx0XHRpZiAoIGNhbGxiYWNrLmNhbGwoIG9iamVjdFsgbmFtZSBdLCBuYW1lLCBvYmplY3RbIG5hbWUgXSApID09PSBmYWxzZSApIHtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRmb3IgKCA7IGkgPCBsZW5ndGg7ICkge1xuXHRcdFx0XHRpZiAoIGNhbGxiYWNrLmNhbGwoIG9iamVjdFsgaSBdLCBpLCBvYmplY3RbIGkrKyBdICkgPT09IGZhbHNlICkge1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIG9iamVjdDtcbn1cblxuZnVuY3Rpb24gaXNQbGFpbk9iamVjdCggb2JqICkge1xuXHQvLyBNdXN0IGJlIGFuIE9iamVjdC5cblx0aWYgKCAhb2JqIHx8IGpRdWVyeS50eXBlKG9iaikgIT09IFwib2JqZWN0XCIgKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cdHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBleHRlbmQoKSB7XG5cdHZhciBvcHRpb25zLCBuYW1lLCBzcmMsIGNvcHksIGNvcHlJc0FycmF5LCBjbG9uZSxcblx0dGFyZ2V0ID0gYXJndW1lbnRzWzBdIHx8IHt9LFxuXHRpID0gMSxcblx0bGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCxcblx0ZGVlcCA9IGZhbHNlO1xuXG5cdC8vIEhhbmRsZSBhIGRlZXAgY29weSBzaXR1YXRpb25cblx0aWYgKCB0eXBlb2YgdGFyZ2V0ID09PSBcImJvb2xlYW5cIiApIHtcblx0XHRkZWVwID0gdGFyZ2V0O1xuXHRcdHRhcmdldCA9IGFyZ3VtZW50c1sxXSB8fCB7fTtcblx0XHQvLyBza2lwIHRoZSBib29sZWFuIGFuZCB0aGUgdGFyZ2V0XG5cdFx0aSA9IDI7XG5cdH1cblxuXHQvLyBIYW5kbGUgY2FzZSB3aGVuIHRhcmdldCBpcyBhIHN0cmluZyBvciBzb21ldGhpbmcgKHBvc3NpYmxlIGluIGRlZXAgY29weSlcblx0aWYgKCB0eXBlb2YgdGFyZ2V0ICE9PSBcIm9iamVjdFwiICYmICFqUXVlcnkuaXNGdW5jdGlvbih0YXJnZXQpICkge1xuXHRcdHRhcmdldCA9IHt9O1xuXHR9XG5cblx0Ly8gZXh0ZW5kIGpRdWVyeSBpdHNlbGYgaWYgb25seSBvbmUgYXJndW1lbnQgaXMgcGFzc2VkXG5cdGlmICggbGVuZ3RoID09PSBpICkge1xuXHRcdHRhcmdldCA9IHRoaXM7XG5cdFx0LS1pO1xuXHR9XG5cblx0Zm9yICggOyBpIDwgbGVuZ3RoOyBpKysgKSB7XG5cdFx0Ly8gT25seSBkZWFsIHdpdGggbm9uLW51bGwvdW5kZWZpbmVkIHZhbHVlc1xuXHRcdGlmICggKG9wdGlvbnMgPSBhcmd1bWVudHNbIGkgXSkgIT0gbnVsbCApIHtcblx0XHRcdC8vIEV4dGVuZCB0aGUgYmFzZSBvYmplY3Rcblx0XHRcdGZvciAoIG5hbWUgaW4gb3B0aW9ucyApIHtcblx0XHRcdFx0c3JjID0gdGFyZ2V0WyBuYW1lIF07XG5cdFx0XHRcdGNvcHkgPSBvcHRpb25zWyBuYW1lIF07XG5cblx0XHRcdFx0Ly8gUHJldmVudCBuZXZlci1lbmRpbmcgbG9vcFxuXHRcdFx0XHRpZiAoIHRhcmdldCA9PT0gY29weSApIHtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFJlY3Vyc2UgaWYgd2UncmUgbWVyZ2luZyBwbGFpbiBvYmplY3RzIG9yIGFycmF5c1xuXHRcdFx0XHRpZiAoIGRlZXAgJiYgY29weSAmJiAoIGpRdWVyeS5pc1BsYWluT2JqZWN0KGNvcHkpIHx8IChjb3B5SXNBcnJheSA9IGpRdWVyeS5pc0FycmF5KGNvcHkpKSApICkge1xuXHRcdFx0XHRcdGlmICggY29weUlzQXJyYXkgKSB7XG5cdFx0XHRcdFx0XHRjb3B5SXNBcnJheSA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0Y2xvbmUgPSBzcmMgJiYgalF1ZXJ5LmlzQXJyYXkoc3JjKSA/IHNyYyA6IFtdO1xuXG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGNsb25lID0gc3JjICYmIGpRdWVyeS5pc1BsYWluT2JqZWN0KHNyYykgPyBzcmMgOiB7fTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBOZXZlciBtb3ZlIG9yaWdpbmFsIG9iamVjdHMsIGNsb25lIHRoZW1cblx0XHRcdFx0XHR0YXJnZXRbIG5hbWUgXSA9IGpRdWVyeS5leHRlbmQoIGRlZXAsIGNsb25lLCBjb3B5ICk7XG5cblx0XHRcdFx0XHQvLyBEb24ndCBicmluZyBpbiB1bmRlZmluZWQgdmFsdWVzXG5cdFx0XHRcdH0gZWxzZSBpZiAoIGNvcHkgIT09IHVuZGVmaW5lZCApIHtcblx0XHRcdFx0XHR0YXJnZXRbIG5hbWUgXSA9IGNvcHk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvLyBSZXR1cm4gdGhlIG1vZGlmaWVkIG9iamVjdFxuXHRyZXR1cm4gdGFyZ2V0O1xufTtcblxuXG4iLCJcbi8qIVxuKiBqcXVlcnktZGVmZXJyZWRcbiogQ29weXJpZ2h0KGMpIDIwMTEgSGlkZGVuIDx6emRoaWRkZW5AZ21haWwuY29tPlxuKiBNSVQgTGljZW5zZWRcbiovXG5cbi8qKlxuKiBMaWJyYXJ5IHZlcnNpb24uXG4qL1xuXG52YXIgalF1ZXJ5ID0gbW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9qcXVlcnktY2FsbGJhY2tzLmpzXCIpLFxuXHRjb3JlX3NsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xuXG4vKipcbiogalF1ZXJ5IGRlZmVycmVkXG4qXG4qIENvZGUgZnJvbTogaHR0cHM6Ly9naXRodWIuY29tL2pxdWVyeS9qcXVlcnkvYmxvYi9tYXN0ZXIvc3JjL2RlZmVycmVkLmpzXG4qIERvYzogaHR0cDovL2FwaS5qcXVlcnkuY29tL2NhdGVnb3J5L2RlZmVycmVkLW9iamVjdC9cbipcbiovXG5cbmpRdWVyeS5leHRlbmQoe1xuXG5cdERlZmVycmVkOiBmdW5jdGlvbiggZnVuYyApIHtcblx0XHR2YXIgdHVwbGVzID0gW1xuXHRcdFx0XHQvLyBhY3Rpb24sIGFkZCBsaXN0ZW5lciwgbGlzdGVuZXIgbGlzdCwgZmluYWwgc3RhdGVcblx0XHRcdFx0WyBcInJlc29sdmVcIiwgXCJkb25lXCIsIGpRdWVyeS5DYWxsYmFja3MoXCJvbmNlIG1lbW9yeVwiKSwgXCJyZXNvbHZlZFwiIF0sXG5cdFx0XHRcdFsgXCJyZWplY3RcIiwgXCJmYWlsXCIsIGpRdWVyeS5DYWxsYmFja3MoXCJvbmNlIG1lbW9yeVwiKSwgXCJyZWplY3RlZFwiIF0sXG5cdFx0XHRcdFsgXCJub3RpZnlcIiwgXCJwcm9ncmVzc1wiLCBqUXVlcnkuQ2FsbGJhY2tzKFwibWVtb3J5XCIpIF1cblx0XHRcdF0sXG5cdFx0XHRzdGF0ZSA9IFwicGVuZGluZ1wiLFxuXHRcdFx0cHJvbWlzZSA9IHtcblx0XHRcdFx0c3RhdGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBzdGF0ZTtcblx0XHRcdFx0fSxcblx0XHRcdFx0YWx3YXlzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRkZWZlcnJlZC5kb25lKCBhcmd1bWVudHMgKS5mYWlsKCBhcmd1bWVudHMgKTtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdFx0fSxcblx0XHRcdFx0dGhlbjogZnVuY3Rpb24oIC8qIGZuRG9uZSwgZm5GYWlsLCBmblByb2dyZXNzICovICkge1xuXHRcdFx0XHRcdHZhciBmbnMgPSBhcmd1bWVudHM7XG5cdFx0XHRcdFx0cmV0dXJuIGpRdWVyeS5EZWZlcnJlZChmdW5jdGlvbiggbmV3RGVmZXIgKSB7XG5cdFx0XHRcdFx0XHRqUXVlcnkuZWFjaCggdHVwbGVzLCBmdW5jdGlvbiggaSwgdHVwbGUgKSB7XG5cdFx0XHRcdFx0XHRcdHZhciBhY3Rpb24gPSB0dXBsZVsgMCBdLFxuXHRcdFx0XHRcdFx0XHRcdGZuID0gZm5zWyBpIF07XG5cdFx0XHRcdFx0XHRcdC8vIGRlZmVycmVkWyBkb25lIHwgZmFpbCB8IHByb2dyZXNzIF0gZm9yIGZvcndhcmRpbmcgYWN0aW9ucyB0byBuZXdEZWZlclxuXHRcdFx0XHRcdFx0XHRkZWZlcnJlZFsgdHVwbGVbMV0gXSggalF1ZXJ5LmlzRnVuY3Rpb24oIGZuICkgP1xuXHRcdFx0XHRcdFx0XHRcdGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0dmFyIHJldHVybmVkID0gZm4uYXBwbHkoIHRoaXMsIGFyZ3VtZW50cyApO1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKCByZXR1cm5lZCAmJiBqUXVlcnkuaXNGdW5jdGlvbiggcmV0dXJuZWQucHJvbWlzZSApICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm5lZC5wcm9taXNlKClcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQuZG9uZSggbmV3RGVmZXIucmVzb2x2ZSApXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0LmZhaWwoIG5ld0RlZmVyLnJlamVjdCApXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0LnByb2dyZXNzKCBuZXdEZWZlci5ub3RpZnkgKTtcblx0XHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdG5ld0RlZmVyWyBhY3Rpb24gKyBcIldpdGhcIiBdKCB0aGlzID09PSBkZWZlcnJlZCA/IG5ld0RlZmVyIDogdGhpcywgWyByZXR1cm5lZCBdICk7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fSA6XG5cdFx0XHRcdFx0XHRcdFx0bmV3RGVmZXJbIGFjdGlvbiBdXG5cdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdGZucyA9IG51bGw7XG5cdFx0XHRcdFx0fSkucHJvbWlzZSgpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHQvLyBHZXQgYSBwcm9taXNlIGZvciB0aGlzIGRlZmVycmVkXG5cdFx0XHRcdC8vIElmIG9iaiBpcyBwcm92aWRlZCwgdGhlIHByb21pc2UgYXNwZWN0IGlzIGFkZGVkIHRvIHRoZSBvYmplY3Rcblx0XHRcdFx0cHJvbWlzZTogZnVuY3Rpb24oIG9iaiApIHtcblx0XHRcdFx0XHRyZXR1cm4gb2JqICE9IG51bGwgPyBqUXVlcnkuZXh0ZW5kKCBvYmosIHByb21pc2UgKSA6IHByb21pc2U7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRkZWZlcnJlZCA9IHt9O1xuXG5cdFx0Ly8gS2VlcCBwaXBlIGZvciBiYWNrLWNvbXBhdFxuXHRcdHByb21pc2UucGlwZSA9IHByb21pc2UudGhlbjtcblxuXHRcdC8vIEFkZCBsaXN0LXNwZWNpZmljIG1ldGhvZHNcblx0XHRqUXVlcnkuZWFjaCggdHVwbGVzLCBmdW5jdGlvbiggaSwgdHVwbGUgKSB7XG5cdFx0XHR2YXIgbGlzdCA9IHR1cGxlWyAyIF0sXG5cdFx0XHRcdHN0YXRlU3RyaW5nID0gdHVwbGVbIDMgXTtcblxuXHRcdFx0Ly8gcHJvbWlzZVsgZG9uZSB8IGZhaWwgfCBwcm9ncmVzcyBdID0gbGlzdC5hZGRcblx0XHRcdHByb21pc2VbIHR1cGxlWzFdIF0gPSBsaXN0LmFkZDtcblxuXHRcdFx0Ly8gSGFuZGxlIHN0YXRlXG5cdFx0XHRpZiAoIHN0YXRlU3RyaW5nICkge1xuXHRcdFx0XHRsaXN0LmFkZChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvLyBzdGF0ZSA9IFsgcmVzb2x2ZWQgfCByZWplY3RlZCBdXG5cdFx0XHRcdFx0c3RhdGUgPSBzdGF0ZVN0cmluZztcblxuXHRcdFx0XHQvLyBbIHJlamVjdF9saXN0IHwgcmVzb2x2ZV9saXN0IF0uZGlzYWJsZTsgcHJvZ3Jlc3NfbGlzdC5sb2NrXG5cdFx0XHRcdH0sIHR1cGxlc1sgaSBeIDEgXVsgMiBdLmRpc2FibGUsIHR1cGxlc1sgMiBdWyAyIF0ubG9jayApO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBkZWZlcnJlZFsgcmVzb2x2ZSB8IHJlamVjdCB8IG5vdGlmeSBdID0gbGlzdC5maXJlXG5cdFx0XHRkZWZlcnJlZFsgdHVwbGVbMF0gXSA9IGxpc3QuZmlyZTtcblx0XHRcdGRlZmVycmVkWyB0dXBsZVswXSArIFwiV2l0aFwiIF0gPSBsaXN0LmZpcmVXaXRoO1xuXHRcdH0pO1xuXG5cdFx0Ly8gTWFrZSB0aGUgZGVmZXJyZWQgYSBwcm9taXNlXG5cdFx0cHJvbWlzZS5wcm9taXNlKCBkZWZlcnJlZCApO1xuXG5cdFx0Ly8gQ2FsbCBnaXZlbiBmdW5jIGlmIGFueVxuXHRcdGlmICggZnVuYyApIHtcblx0XHRcdGZ1bmMuY2FsbCggZGVmZXJyZWQsIGRlZmVycmVkICk7XG5cdFx0fVxuXG5cdFx0Ly8gQWxsIGRvbmUhXG5cdFx0cmV0dXJuIGRlZmVycmVkO1xuXHR9LFxuXG5cdC8vIERlZmVycmVkIGhlbHBlclxuXHR3aGVuOiBmdW5jdGlvbiggc3Vib3JkaW5hdGUgLyogLCAuLi4sIHN1Ym9yZGluYXRlTiAqLyApIHtcblx0XHR2YXIgaSA9IDAsXG5cdFx0XHRyZXNvbHZlVmFsdWVzID0gY29yZV9zbGljZS5jYWxsKCBhcmd1bWVudHMgKSxcblx0XHRcdGxlbmd0aCA9IHJlc29sdmVWYWx1ZXMubGVuZ3RoLFxuXG5cdFx0XHQvLyB0aGUgY291bnQgb2YgdW5jb21wbGV0ZWQgc3Vib3JkaW5hdGVzXG5cdFx0XHRyZW1haW5pbmcgPSBsZW5ndGggIT09IDEgfHwgKCBzdWJvcmRpbmF0ZSAmJiBqUXVlcnkuaXNGdW5jdGlvbiggc3Vib3JkaW5hdGUucHJvbWlzZSApICkgPyBsZW5ndGggOiAwLFxuXG5cdFx0XHQvLyB0aGUgbWFzdGVyIERlZmVycmVkLiBJZiByZXNvbHZlVmFsdWVzIGNvbnNpc3Qgb2Ygb25seSBhIHNpbmdsZSBEZWZlcnJlZCwganVzdCB1c2UgdGhhdC5cblx0XHRcdGRlZmVycmVkID0gcmVtYWluaW5nID09PSAxID8gc3Vib3JkaW5hdGUgOiBqUXVlcnkuRGVmZXJyZWQoKSxcblxuXHRcdFx0Ly8gVXBkYXRlIGZ1bmN0aW9uIGZvciBib3RoIHJlc29sdmUgYW5kIHByb2dyZXNzIHZhbHVlc1xuXHRcdFx0dXBkYXRlRnVuYyA9IGZ1bmN0aW9uKCBpLCBjb250ZXh0cywgdmFsdWVzICkge1xuXHRcdFx0XHRyZXR1cm4gZnVuY3Rpb24oIHZhbHVlICkge1xuXHRcdFx0XHRcdGNvbnRleHRzWyBpIF0gPSB0aGlzO1xuXHRcdFx0XHRcdHZhbHVlc1sgaSBdID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBjb3JlX3NsaWNlLmNhbGwoIGFyZ3VtZW50cyApIDogdmFsdWU7XG5cdFx0XHRcdFx0aWYoIHZhbHVlcyA9PT0gcHJvZ3Jlc3NWYWx1ZXMgKSB7XG5cdFx0XHRcdFx0XHRkZWZlcnJlZC5ub3RpZnlXaXRoKCBjb250ZXh0cywgdmFsdWVzICk7XG5cdFx0XHRcdFx0fSBlbHNlIGlmICggISggLS1yZW1haW5pbmcgKSApIHtcblx0XHRcdFx0XHRcdGRlZmVycmVkLnJlc29sdmVXaXRoKCBjb250ZXh0cywgdmFsdWVzICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXHRcdFx0fSxcblxuXHRcdFx0cHJvZ3Jlc3NWYWx1ZXMsIHByb2dyZXNzQ29udGV4dHMsIHJlc29sdmVDb250ZXh0cztcblxuXHRcdC8vIGFkZCBsaXN0ZW5lcnMgdG8gRGVmZXJyZWQgc3Vib3JkaW5hdGVzOyB0cmVhdCBvdGhlcnMgYXMgcmVzb2x2ZWRcblx0XHRpZiAoIGxlbmd0aCA+IDEgKSB7XG5cdFx0XHRwcm9ncmVzc1ZhbHVlcyA9IG5ldyBBcnJheSggbGVuZ3RoICk7XG5cdFx0XHRwcm9ncmVzc0NvbnRleHRzID0gbmV3IEFycmF5KCBsZW5ndGggKTtcblx0XHRcdHJlc29sdmVDb250ZXh0cyA9IG5ldyBBcnJheSggbGVuZ3RoICk7XG5cdFx0XHRmb3IgKCA7IGkgPCBsZW5ndGg7IGkrKyApIHtcblx0XHRcdFx0aWYgKCByZXNvbHZlVmFsdWVzWyBpIF0gJiYgalF1ZXJ5LmlzRnVuY3Rpb24oIHJlc29sdmVWYWx1ZXNbIGkgXS5wcm9taXNlICkgKSB7XG5cdFx0XHRcdFx0cmVzb2x2ZVZhbHVlc1sgaSBdLnByb21pc2UoKVxuXHRcdFx0XHRcdFx0LmRvbmUoIHVwZGF0ZUZ1bmMoIGksIHJlc29sdmVDb250ZXh0cywgcmVzb2x2ZVZhbHVlcyApIClcblx0XHRcdFx0XHRcdC5mYWlsKCBkZWZlcnJlZC5yZWplY3QgKVxuXHRcdFx0XHRcdFx0LnByb2dyZXNzKCB1cGRhdGVGdW5jKCBpLCBwcm9ncmVzc0NvbnRleHRzLCBwcm9ncmVzc1ZhbHVlcyApICk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0LS1yZW1haW5pbmc7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBpZiB3ZSdyZSBub3Qgd2FpdGluZyBvbiBhbnl0aGluZywgcmVzb2x2ZSB0aGUgbWFzdGVyXG5cdFx0aWYgKCAhcmVtYWluaW5nICkge1xuXHRcdFx0ZGVmZXJyZWQucmVzb2x2ZVdpdGgoIHJlc29sdmVDb250ZXh0cywgcmVzb2x2ZVZhbHVlcyApO1xuXHRcdH1cblxuXHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG5cdH1cbn0pO1xuIl19
