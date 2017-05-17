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
  if (!options.$) throw new Error('Missing jquery')

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
  if (!options.$) throw new Error('Missing jquery')

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
  if (!options.$) throw new Error('Missing jquery')
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJleHRlbnNpb24vYXNzZXRzL2Jhc2U2NC5qcyIsImV4dGVuc2lvbi9hc3NldHMvanF1ZXJ5LndoZW5jYWxsc2VxdWVudGlhbGx5LmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvQXBwLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvQmFja2dyb3VuZFNjcmlwdC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL0NvbnRlbnRTY3JpcHQuanMiLCJleHRlbnNpb24vc2NyaXB0cy9Db250ZW50U2VsZWN0b3IuanMiLCJleHRlbnNpb24vc2NyaXB0cy9Db250cm9sbGVyLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvRWxlbWVudFF1ZXJ5LmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckVsZW1lbnQuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckVsZW1lbnRBdHRyaWJ1dGUuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckVsZW1lbnRDbGljay5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9yL1NlbGVjdG9yRWxlbWVudFNjcm9sbC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9yL1NlbGVjdG9yR3JvdXAuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckhUTUwuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckltYWdlLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IvU2VsZWN0b3JMaW5rLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IvU2VsZWN0b3JQb3B1cExpbmsuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvclRhYmxlLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IvU2VsZWN0b3JUZXh0LmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3JMaXN0LmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3JzLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2l0ZW1hcC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1N0b3JlRGV2dG9vbHMuanMiLCJleHRlbnNpb24vc2NyaXB0cy9VbmlxdWVFbGVtZW50TGlzdC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL2dldEJhY2tncm91bmRTY3JpcHQuanMiLCJleHRlbnNpb24vc2NyaXB0cy9nZXRDb250ZW50U2NyaXB0LmpzIiwibm9kZV9tb2R1bGVzL2Nzcy1zZWxlY3Rvci9saWIvQ3NzU2VsZWN0b3IuanMiLCJub2RlX21vZHVsZXMvanF1ZXJ5LWRlZmVycmVkL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2pxdWVyeS1kZWZlcnJlZC9saWIvanF1ZXJ5LWNhbGxiYWNrcy5qcyIsIm5vZGVfbW9kdWxlcy9qcXVlcnktZGVmZXJyZWQvbGliL2pxdWVyeS1jb3JlLmpzIiwibm9kZV9tb2R1bGVzL2pxdWVyeS1kZWZlcnJlZC9saWIvanF1ZXJ5LWRlZmVycmVkLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4WEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyMkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdlQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxuLyoqXG4gKiBAdXJsIGh0dHA6Ly9qc3BlcmYuY29tL2Jsb2ItYmFzZTY0LWNvbnZlcnNpb25cbiAqIEB0eXBlIHt7YmxvYlRvQmFzZTY0OiBibG9iVG9CYXNlNjQsIGJhc2U2NFRvQmxvYjogYmFzZTY0VG9CbG9ifX1cbiAqL1xudmFyIEJhc2U2NCA9IHtcblxuICBibG9iVG9CYXNlNjQ6IGZ1bmN0aW9uIChibG9iKSB7XG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBkYXRhVXJsID0gcmVhZGVyLnJlc3VsdFxuICAgICAgdmFyIGJhc2U2NCA9IGRhdGFVcmwuc3BsaXQoJywnKVsxXVxuICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKGJhc2U2NClcbiAgICB9XG4gICAgcmVhZGVyLnJlYWRBc0RhdGFVUkwoYmxvYilcblxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG4gIGJhc2U2NFRvQmxvYjogZnVuY3Rpb24gKGJhc2U2NCwgbWltZVR5cGUpIHtcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIGJpbmFyeSA9IGF0b2IoYmFzZTY0KVxuICAgIHZhciBsZW4gPSBiaW5hcnkubGVuZ3RoXG4gICAgdmFyIGJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcihsZW4pXG4gICAgdmFyIHZpZXcgPSBuZXcgVWludDhBcnJheShidWZmZXIpXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgdmlld1tpXSA9IGJpbmFyeS5jaGFyQ29kZUF0KGkpXG4gICAgfVxuICAgIHZhciBibG9iID0gbmV3IEJsb2IoW3ZpZXddLCB7dHlwZTogbWltZVR5cGV9KVxuICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZShibG9iKVxuXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlNjRcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxuLyoqXG4gKiBAYXV0aG9yIE1hcnRpbnMgQmFsb2Rpc1xuICpcbiAqIEFuIGFsdGVybmF0aXZlIHZlcnNpb24gb2YgJC53aGVuIHdoaWNoIGNhbiBiZSB1c2VkIHRvIGV4ZWN1dGUgYXN5bmNocm9ub3VzXG4gKiBjYWxscyBzZXF1ZW50aWFsbHkgb25lIGFmdGVyIGFub3RoZXIuXG4gKlxuICogQHJldHVybnMganF1ZXJ5RGVmZXJyZWQoKS5wcm9taXNlKClcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB3aGVuQ2FsbFNlcXVlbnRpYWxseSAoZnVuY3Rpb25DYWxscykge1xuICB2YXIgZGVmZXJyZWRSZXNvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgdmFyIHJlc3VsdERhdGEgPSBbXVxuXG5cdC8vIG5vdGhpbmcgdG8gZG9cbiAgaWYgKGZ1bmN0aW9uQ2FsbHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIGRlZmVycmVkUmVzb25zZS5yZXNvbHZlKHJlc3VsdERhdGEpLnByb21pc2UoKVxuICB9XG5cbiAgdmFyIGN1cnJlbnREZWZlcnJlZCA9IGZ1bmN0aW9uQ2FsbHMuc2hpZnQoKSgpXG5cdC8vIGV4ZWN1dGUgc3luY2hyb25vdXMgY2FsbHMgc3luY2hyb25vdXNseVxuICB3aGlsZSAoY3VycmVudERlZmVycmVkLnN0YXRlKCkgPT09ICdyZXNvbHZlZCcpIHtcbiAgICBjdXJyZW50RGVmZXJyZWQuZG9uZShmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgcmVzdWx0RGF0YS5wdXNoKGRhdGEpXG4gICAgfSlcbiAgICBpZiAoZnVuY3Rpb25DYWxscy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBkZWZlcnJlZFJlc29uc2UucmVzb2x2ZShyZXN1bHREYXRhKS5wcm9taXNlKClcbiAgICB9XG4gICAgY3VycmVudERlZmVycmVkID0gZnVuY3Rpb25DYWxscy5zaGlmdCgpKClcbiAgfVxuXG5cdC8vIGhhbmRsZSBhc3luYyBjYWxsc1xuICB2YXIgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG5cdFx0Ly8gaGFuZGxlIG1peGVkIHN5bmMgY2FsbHNcbiAgICB3aGlsZSAoY3VycmVudERlZmVycmVkLnN0YXRlKCkgPT09ICdyZXNvbHZlZCcpIHtcbiAgICAgIGN1cnJlbnREZWZlcnJlZC5kb25lKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHJlc3VsdERhdGEucHVzaChkYXRhKVxuICAgICAgfSlcbiAgICAgIGlmIChmdW5jdGlvbkNhbGxzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKVxuICAgICAgICBkZWZlcnJlZFJlc29uc2UucmVzb2x2ZShyZXN1bHREYXRhKVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY3VycmVudERlZmVycmVkID0gZnVuY3Rpb25DYWxscy5zaGlmdCgpKClcbiAgICB9XG4gIH0sIDEwKVxuXG4gIHJldHVybiBkZWZlcnJlZFJlc29uc2UucHJvbWlzZSgpXG59XG4iLCJ2YXIgU3RvcmVEZXZ0b29scyA9IHJlcXVpcmUoJy4vU3RvcmVEZXZ0b29scycpXG52YXIgU2l0ZW1hcENvbnRyb2xsZXIgPSByZXF1aXJlKCcuL0NvbnRyb2xsZXInKVxuXG4kKGZ1bmN0aW9uICgpIHtcblx0Ly8gaW5pdCBib290c3RyYXAgYWxlcnRzXG4gICQoJy5hbGVydCcpLmFsZXJ0KClcblxuICB2YXIgc3RvcmUgPSBuZXcgU3RvcmVEZXZ0b29scyh7JH0pXG4gIG5ldyBTaXRlbWFwQ29udHJvbGxlcih7XG4gICAgc3RvcmU6IHN0b3JlLFxuICAgIHRlbXBsYXRlRGlyOiAndmlld3MvJ1xuICB9LCB7JH0pXG59KVxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG4vKipcbiAqIENvbnRlbnRTY3JpcHQgdGhhdCBjYW4gYmUgY2FsbGVkIGZyb20gYW55d2hlcmUgd2l0aGluIHRoZSBleHRlbnNpb25cbiAqL1xudmFyIEJhY2tncm91bmRTY3JpcHQgPSB7XG5cbiAgZHVtbXk6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ganF1ZXJ5LkRlZmVycmVkKCkucmVzb2x2ZSgnZHVtbXknKS5wcm9taXNlKClcbiAgfSxcblxuXHQvKipcblx0ICogUmV0dXJucyB0aGUgaWQgb2YgdGhlIHRhYiB0aGF0IGlzIHZpc2libGUgdG8gdXNlclxuXHQgKiBAcmV0dXJucyBqcXVlcnkuRGVmZXJyZWQoKSBpbnRlZ2VyXG5cdCAqL1xuICBnZXRBY3RpdmVUYWJJZDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICAgIGNocm9tZS50YWJzLnF1ZXJ5KHtcbiAgICAgIGFjdGl2ZTogdHJ1ZSxcbiAgICAgIGN1cnJlbnRXaW5kb3c6IHRydWVcbiAgICB9LCBmdW5jdGlvbiAodGFicykge1xuICAgICAgaWYgKHRhYnMubGVuZ3RoIDwgMSkge1xuXHRcdFx0XHQvLyBAVE9ETyBtdXN0IGJlIHJ1bm5pbmcgd2l0aGluIHBvcHVwLiBtYXliZSBmaW5kIGFub3RoZXIgYWN0aXZlIHdpbmRvdz9cbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZWplY3QoXCJjb3VsZG4ndCBmaW5kIHRoZSBhY3RpdmUgdGFiXCIpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgdGFiSWQgPSB0YWJzWzBdLmlkXG4gICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZSh0YWJJZClcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBFeGVjdXRlIGEgZnVuY3Rpb24gd2l0aGluIHRoZSBhY3RpdmUgdGFiIHdpdGhpbiBjb250ZW50IHNjcmlwdFxuXHQgKiBAcGFyYW0gcmVxdWVzdC5mblx0ZnVuY3Rpb24gdG8gY2FsbFxuXHQgKiBAcGFyYW0gcmVxdWVzdC5yZXF1ZXN0XHRyZXF1ZXN0IHRoYXQgd2lsbCBiZSBwYXNzZWQgdG8gdGhlIGZ1bmN0aW9uXG5cdCAqL1xuICBleGVjdXRlQ29udGVudFNjcmlwdDogZnVuY3Rpb24gKHJlcXVlc3QpIHtcbiAgICB2YXIgcmVxVG9Db250ZW50U2NyaXB0ID0ge1xuICAgICAgY29udGVudFNjcmlwdENhbGw6IHRydWUsXG4gICAgICBmbjogcmVxdWVzdC5mbixcbiAgICAgIHJlcXVlc3Q6IHJlcXVlc3QucmVxdWVzdFxuICAgIH1cbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIGRlZmVycmVkQWN0aXZlVGFiSWQgPSB0aGlzLmdldEFjdGl2ZVRhYklkKClcbiAgICBkZWZlcnJlZEFjdGl2ZVRhYklkLmRvbmUoZnVuY3Rpb24gKHRhYklkKSB7XG4gICAgICBjaHJvbWUudGFicy5zZW5kTWVzc2FnZSh0YWJJZCwgcmVxVG9Db250ZW50U2NyaXB0LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKHJlc3BvbnNlKVxuICAgICAgfSlcbiAgICB9KVxuXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2VcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tncm91bmRTY3JpcHRcbiIsInZhciBDb250ZW50U2VsZWN0b3IgPSByZXF1aXJlKCcuL0NvbnRlbnRTZWxlY3RvcicpXG52YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbi8qKlxuICogQ29udGVudFNjcmlwdCB0aGF0IGNhbiBiZSBjYWxsZWQgZnJvbSBhbnl3aGVyZSB3aXRoaW4gdGhlIGV4dGVuc2lvblxuICovXG52YXIgQ29udGVudFNjcmlwdCA9IHtcblxuXHQvKipcblx0ICogRmV0Y2hcblx0ICogQHBhcmFtIHJlcXVlc3QuQ1NTU2VsZWN0b3JcdGNzcyBzZWxlY3RvciBhcyBzdHJpbmdcblx0ICogQHJldHVybnMganF1ZXJ5LkRlZmVycmVkKClcblx0ICovXG4gIGdldEhUTUw6IGZ1bmN0aW9uIChyZXF1ZXN0LCBvcHRpb25zKSB7XG4gICAgdmFyICQgPSBvcHRpb25zLiRcbiAgICB2YXIgZGVmZXJyZWRIVE1MID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgaHRtbCA9ICQocmVxdWVzdC5DU1NTZWxlY3RvcikuY2xvbmUoKS53cmFwKCc8cD4nKS5wYXJlbnQoKS5odG1sKClcbiAgICBkZWZlcnJlZEhUTUwucmVzb2x2ZShodG1sKVxuICAgIHJldHVybiBkZWZlcnJlZEhUTUwucHJvbWlzZSgpXG4gIH0sXG5cblx0LyoqXG5cdCAqIFJlbW92ZXMgY3VycmVudCBjb250ZW50IHNlbGVjdG9yIGlmIGlzIGluIHVzZSB3aXRoaW4gdGhlIHBhZ2Vcblx0ICogQHJldHVybnMganF1ZXJ5LkRlZmVycmVkKClcblx0ICovXG4gIHJlbW92ZUN1cnJlbnRDb250ZW50U2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIGNvbnRlbnRTZWxlY3RvciA9IHdpbmRvdy5jc1xuICAgIGlmIChjb250ZW50U2VsZWN0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKClcbiAgICB9IGVsc2Uge1xuICAgICAgY29udGVudFNlbGVjdG9yLnJlbW92ZUdVSSgpXG4gICAgICB3aW5kb3cuY3MgPSB1bmRlZmluZWRcbiAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZSgpXG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gIH0sXG5cblx0LyoqXG5cdCAqIFNlbGVjdCBlbGVtZW50cyB3aXRoaW4gdGhlIHBhZ2Vcblx0ICogQHBhcmFtIHJlcXVlc3QucGFyZW50Q1NTU2VsZWN0b3Jcblx0ICogQHBhcmFtIHJlcXVlc3QuYWxsb3dlZEVsZW1lbnRzXG5cdCAqL1xuICBzZWxlY3RTZWxlY3RvcjogZnVuY3Rpb24gKHJlcXVlc3QsIG9wdGlvbnMpIHtcbiAgICB2YXIgJCA9IG9wdGlvbnMuJFxuICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICAgIHRoaXMucmVtb3ZlQ3VycmVudENvbnRlbnRTZWxlY3RvcigpLmRvbmUoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGNvbnRlbnRTZWxlY3RvciA9IG5ldyBDb250ZW50U2VsZWN0b3Ioe1xuICAgICAgICBwYXJlbnRDU1NTZWxlY3RvcjogcmVxdWVzdC5wYXJlbnRDU1NTZWxlY3RvcixcbiAgICAgICAgYWxsb3dlZEVsZW1lbnRzOiByZXF1ZXN0LmFsbG93ZWRFbGVtZW50c1xuICAgICAgfSwgeyR9KVxuICAgICAgd2luZG93LmNzID0gY29udGVudFNlbGVjdG9yXG5cbiAgICAgIHZhciBkZWZlcnJlZENTU1NlbGVjdG9yID0gY29udGVudFNlbGVjdG9yLmdldENTU1NlbGVjdG9yKClcbiAgICAgIGRlZmVycmVkQ1NTU2VsZWN0b3IuZG9uZShmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgdGhpcy5yZW1vdmVDdXJyZW50Q29udGVudFNlbGVjdG9yKCkuZG9uZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKHJlc3BvbnNlKVxuICAgICAgICAgIHdpbmRvdy5jcyA9IHVuZGVmaW5lZFxuICAgICAgICB9KVxuICAgICAgfS5iaW5kKHRoaXMpKS5mYWlsKGZ1bmN0aW9uIChtZXNzYWdlKSB7XG4gICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVqZWN0KG1lc3NhZ2UpXG4gICAgICAgIHdpbmRvdy5jcyA9IHVuZGVmaW5lZFxuICAgICAgfSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZS5wcm9taXNlKClcbiAgfSxcblxuXHQvKipcblx0ICogUHJldmlldyBlbGVtZW50c1xuXHQgKiBAcGFyYW0gcmVxdWVzdC5wYXJlbnRDU1NTZWxlY3RvclxuXHQgKiBAcGFyYW0gcmVxdWVzdC5lbGVtZW50Q1NTU2VsZWN0b3Jcblx0ICovXG4gIHByZXZpZXdTZWxlY3RvcjogZnVuY3Rpb24gKHJlcXVlc3QsIG9wdGlvbnMpIHtcbiAgICB2YXIgJCA9IG9wdGlvbnMuJFxuICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB0aGlzLnJlbW92ZUN1cnJlbnRDb250ZW50U2VsZWN0b3IoKS5kb25lKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBjb250ZW50U2VsZWN0b3IgPSBuZXcgQ29udGVudFNlbGVjdG9yKHtcbiAgICAgICAgcGFyZW50Q1NTU2VsZWN0b3I6IHJlcXVlc3QucGFyZW50Q1NTU2VsZWN0b3JcbiAgICAgIH0sIHskfSlcbiAgICAgIHdpbmRvdy5jcyA9IGNvbnRlbnRTZWxlY3RvclxuXG4gICAgICB2YXIgZGVmZXJyZWRTZWxlY3RvclByZXZpZXcgPSBjb250ZW50U2VsZWN0b3IucHJldmlld1NlbGVjdG9yKHJlcXVlc3QuZWxlbWVudENTU1NlbGVjdG9yKVxuICAgICAgZGVmZXJyZWRTZWxlY3RvclByZXZpZXcuZG9uZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZSgpXG4gICAgICB9KS5mYWlsKGZ1bmN0aW9uIChtZXNzYWdlKSB7XG4gICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVqZWN0KG1lc3NhZ2UpXG4gICAgICAgIHdpbmRvdy5jcyA9IHVuZGVmaW5lZFxuICAgICAgfSlcbiAgICB9KVxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50U2NyaXB0XG4iLCJ2YXIgRWxlbWVudFF1ZXJ5ID0gcmVxdWlyZSgnLi9FbGVtZW50UXVlcnknKVxudmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgQ3NzU2VsZWN0b3IgPSByZXF1aXJlKCdjc3Mtc2VsZWN0b3InKS5Dc3NTZWxlY3RvclxuLyoqXG4gKiBAcGFyYW0gb3B0aW9ucy5wYXJlbnRDU1NTZWxlY3Rvclx0RWxlbWVudHMgY2FuIGJlIG9ubHkgc2VsZWN0ZWQgd2l0aGluIHRoaXMgZWxlbWVudFxuICogQHBhcmFtIG9wdGlvbnMuYWxsb3dlZEVsZW1lbnRzXHRFbGVtZW50cyB0aGF0IGNhbiBvbmx5IGJlIHNlbGVjdGVkXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIENvbnRlbnRTZWxlY3RvciA9IGZ1bmN0aW9uIChvcHRpb25zLCBtb3JlT3B0aW9ucykge1xuXHQvLyBkZWZlcnJlZCByZXNwb25zZVxuICB0aGlzLmRlZmVycmVkQ1NTU2VsZWN0b3JSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgdGhpcy5hbGxvd2VkRWxlbWVudHMgPSBvcHRpb25zLmFsbG93ZWRFbGVtZW50c1xuICB0aGlzLnBhcmVudENTU1NlbGVjdG9yID0gb3B0aW9ucy5wYXJlbnRDU1NTZWxlY3Rvci50cmltKClcbiAgdGhpcy5hbGVydCA9IG9wdGlvbnMuYWxlcnQgfHwgZnVuY3Rpb24gKHR4dCkgeyBhbGVydCh0eHQpIH1cblxuICB0aGlzLiQgPSBtb3JlT3B0aW9ucy4kXG50aGlzLmRvY3VtZW50ID0gbW9yZU9wdGlvbnMuZG9jdW1lbnRcbnRoaXMud2luZG93ID0gbW9yZU9wdGlvbnMud2luZG93XG4gIGlmICghdGhpcy4kKSB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcganF1ZXJ5IGluIGNvbnRlbnQgc2VsZWN0b3InKVxuICBpZiAodGhpcy5wYXJlbnRDU1NTZWxlY3Rvcikge1xuICAgIHRoaXMucGFyZW50ID0gdGhpcy4kKHRoaXMucGFyZW50Q1NTU2VsZWN0b3IpWzBdXG5cblx0XHQvLyAgaGFuZGxlIHNpdHVhdGlvbiB3aGVuIHBhcmVudCBzZWxlY3RvciBub3QgZm91bmRcbiAgICBpZiAodGhpcy5wYXJlbnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5kZWZlcnJlZENTU1NlbGVjdG9yUmVzcG9uc2UucmVqZWN0KCdwYXJlbnQgc2VsZWN0b3Igbm90IGZvdW5kJylcbiAgICAgIHRoaXMuYWxlcnQoJ1BhcmVudCBlbGVtZW50IG5vdCBmb3VuZCEnKVxuICAgIH1cbiAgfVx0ZWxzZSB7XG4gICAgdGhpcy5wYXJlbnQgPSB0aGlzLiQoJ2JvZHknKVswXVxuICB9XG59XG5cbkNvbnRlbnRTZWxlY3Rvci5wcm90b3R5cGUgPSB7XG5cblx0LyoqXG5cdCAqIGdldCBjc3Mgc2VsZWN0b3Igc2VsZWN0ZWQgYnkgdGhlIHVzZXJcblx0ICovXG4gIGdldENTU1NlbGVjdG9yOiBmdW5jdGlvbiAocmVxdWVzdCkge1xuICAgIGlmICh0aGlzLmRlZmVycmVkQ1NTU2VsZWN0b3JSZXNwb25zZS5zdGF0ZSgpICE9PSAncmVqZWN0ZWQnKSB7XG5cdFx0XHQvLyBlbGVtZW50cyB0aGF0IGFyZSBzZWxlY3RlZCBieSB0aGUgdXNlclxuICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnRzID0gW11cblx0XHRcdC8vIGVsZW1lbnQgc2VsZWN0ZWQgZnJvbSB0b3BcbiAgICAgIHRoaXMudG9wID0gMFxuXG5cdFx0XHQvLyBpbml0aWFsaXplIGNzcyBzZWxlY3RvclxuICAgICAgdGhpcy5pbml0Q3NzU2VsZWN0b3IoZmFsc2UpXG5cbiAgICAgIHRoaXMuaW5pdEdVSSgpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZGVmZXJyZWRDU1NTZWxlY3RvclJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG4gIGdldEN1cnJlbnRDU1NTZWxlY3RvcjogZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLnNlbGVjdGVkRWxlbWVudHMgJiYgdGhpcy5zZWxlY3RlZEVsZW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgIHZhciBjc3NTZWxlY3RvclxuXG5cdFx0XHQvLyBoYW5kbGUgc3BlY2lhbCBjYXNlIHdoZW4gcGFyZW50IGlzIHNlbGVjdGVkXG4gICAgICBpZiAodGhpcy5pc1BhcmVudFNlbGVjdGVkKCkpIHtcbiAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWRFbGVtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICBjc3NTZWxlY3RvciA9ICdfcGFyZW50XydcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLiQoJyMtc2VsZWN0b3ItdG9vbGJhciBbbmFtZT1kaWZlcmVudEVsZW1lbnRTZWxlY3Rpb25dJykucHJvcCgnY2hlY2tlZCcpKSB7XG4gICAgICAgICAgdmFyIHNlbGVjdGVkRWxlbWVudHMgPSB0aGlzLnNlbGVjdGVkRWxlbWVudHMuY2xvbmUoKVxuICAgICAgICAgIHNlbGVjdGVkRWxlbWVudHMuc3BsaWNlKHNlbGVjdGVkRWxlbWVudHMuaW5kZXhPZih0aGlzLnBhcmVudCksIDEpXG4gICAgICAgICAgY3NzU2VsZWN0b3IgPSAnX3BhcmVudF8sICcgKyB0aGlzLmNzc1NlbGVjdG9yLmdldENzc1NlbGVjdG9yKHNlbGVjdGVkRWxlbWVudHMsIHRoaXMudG9wKVxuICAgICAgICB9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIHdpbGwgdHJpZ2dlciBlcnJvciB3aGVyZSBtdWx0aXBsZSBzZWxlY3Rpb25zIGFyZSBub3QgYWxsb3dlZFxuICAgICAgICAgIGNzc1NlbGVjdG9yID0gdGhpcy5jc3NTZWxlY3Rvci5nZXRDc3NTZWxlY3Rvcih0aGlzLnNlbGVjdGVkRWxlbWVudHMsIHRoaXMudG9wKVxuICAgICAgICB9XG4gICAgICB9XHRcdFx0ZWxzZSB7XG4gICAgICAgIGNzc1NlbGVjdG9yID0gdGhpcy5jc3NTZWxlY3Rvci5nZXRDc3NTZWxlY3Rvcih0aGlzLnNlbGVjdGVkRWxlbWVudHMsIHRoaXMudG9wKVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gY3NzU2VsZWN0b3JcbiAgICB9XG4gICAgcmV0dXJuICcnXG4gIH0sXG5cbiAgaXNQYXJlbnRTZWxlY3RlZDogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLnNlbGVjdGVkRWxlbWVudHMuaW5kZXhPZih0aGlzLnBhcmVudCkgIT09IC0xXG4gIH0sXG5cblx0LyoqXG5cdCAqIGluaXRpYWxpemUgb3IgcmVjb25maWd1cmUgY3NzIHNlbGVjdG9yIGNsYXNzXG5cdCAqIEBwYXJhbSBhbGxvd011bHRpcGxlU2VsZWN0b3JzXG5cdCAqL1xuICBpbml0Q3NzU2VsZWN0b3I6IGZ1bmN0aW9uIChhbGxvd011bHRpcGxlU2VsZWN0b3JzKSB7XG4gICAgdGhpcy5jc3NTZWxlY3RvciA9IG5ldyBDc3NTZWxlY3Rvcih7XG4gICAgICBlbmFibGVTbWFydFRhYmxlU2VsZWN0b3I6IHRydWUsXG4gICAgICBwYXJlbnQ6IHRoaXMucGFyZW50LFxuICAgICAgYWxsb3dNdWx0aXBsZVNlbGVjdG9yczogYWxsb3dNdWx0aXBsZVNlbGVjdG9ycyxcbiAgICAgIGlnbm9yZWRDbGFzc2VzOiBbXG4gICAgICAgICctc2l0ZW1hcC1zZWxlY3QtaXRlbS1zZWxlY3RlZCcsXG4gICAgICAgICctc2l0ZW1hcC1zZWxlY3QtaXRlbS1ob3ZlcicsXG4gICAgICAgICctc2l0ZW1hcC1wYXJlbnQnLFxuICAgICAgICAnLXdlYi1zY3JhcGVyLWltZy1vbi10b3AnLFxuICAgICAgICAnLXdlYi1zY3JhcGVyLXNlbGVjdGlvbi1hY3RpdmUnXG4gICAgICBdLFxuICAgICAgcXVlcnk6IHRoaXMuJFxuICAgIH0pXG4gIH0sXG5cbiAgcHJldmlld1NlbGVjdG9yOiBmdW5jdGlvbiAoZWxlbWVudENTU1NlbGVjdG9yKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICBpZiAodGhpcy5kZWZlcnJlZENTU1NlbGVjdG9yUmVzcG9uc2Uuc3RhdGUoKSAhPT0gJ3JlamVjdGVkJykge1xuICAgICAgdGhpcy5oaWdobGlnaHRQYXJlbnQoKVxuICAgICAgJChFbGVtZW50UXVlcnkoZWxlbWVudENTU1NlbGVjdG9yLCB0aGlzLnBhcmVudCwgeyR9KSkuYWRkQ2xhc3MoJy1zaXRlbWFwLXNlbGVjdC1pdGVtLXNlbGVjdGVkJylcbiAgICAgIHRoaXMuZGVmZXJyZWRDU1NTZWxlY3RvclJlc3BvbnNlLnJlc29sdmUoKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmRlZmVycmVkQ1NTU2VsZWN0b3JSZXNwb25zZS5wcm9taXNlKClcbiAgfSxcblxuICBpbml0R1VJOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGRvY3VtZW50ID0gdGhpcy5kb2N1bWVudFxuICAgIHRoaXMuaGlnaGxpZ2h0UGFyZW50KClcblxuXHRcdC8vIGFsbCBlbGVtZW50cyBleGNlcHQgdG9vbGJhclxuICAgIHRoaXMuJGFsbEVsZW1lbnRzID0gdGhpcy4kKHRoaXMuYWxsb3dlZEVsZW1lbnRzICsgJzpub3QoIy1zZWxlY3Rvci10b29sYmFyKTpub3QoIy1zZWxlY3Rvci10b29sYmFyICopJywgdGhpcy5wYXJlbnQpXG5cdFx0Ly8gYWxsb3cgc2VsZWN0aW5nIHBhcmVudCBhbHNvXG4gICAgaWYgKHRoaXMucGFyZW50ICE9PSBkb2N1bWVudC5ib2R5KSB7XG4gICAgICB0aGlzLiRhbGxFbGVtZW50cy5wdXNoKHRoaXMucGFyZW50KVxuICAgIH1cblxuICAgIHRoaXMuYmluZEVsZW1lbnRIaWdobGlnaHQoKVxuICAgIHRoaXMuYmluZEVsZW1lbnRTZWxlY3Rpb24oKVxuICAgIHRoaXMuYmluZEtleWJvYXJkU2VsZWN0aW9uTWFuaXB1bGF0aW9ucygpXG4gICAgdGhpcy5hdHRhY2hUb29sYmFyKClcbiAgICB0aGlzLmJpbmRNdWx0aXBsZUdyb3VwQ2hlY2tib3goKVxuICAgIHRoaXMuYmluZE11bHRpcGxlR3JvdXBQb3B1cEhpZGUoKVxuICAgIHRoaXMuYmluZE1vdmVJbWFnZXNUb1RvcCgpXG4gIH0sXG5cbiAgYmluZEVsZW1lbnRTZWxlY3Rpb246IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiRhbGxFbGVtZW50cy5iaW5kKCdjbGljay5lbGVtZW50U2VsZWN0b3InLCBmdW5jdGlvbiAoZSkge1xuICAgICAgdmFyIGVsZW1lbnQgPSBlLmN1cnJlbnRUYXJnZXRcbiAgICAgIGlmICh0aGlzLnNlbGVjdGVkRWxlbWVudHMuaW5kZXhPZihlbGVtZW50KSA9PT0gLTEpIHtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnRzLnB1c2goZWxlbWVudClcbiAgICAgIH1cbiAgICAgIHRoaXMuaGlnaGxpZ2h0U2VsZWN0ZWRFbGVtZW50cygpXG5cblx0XHRcdC8vIENhbmNlbCBhbGwgb3RoZXIgZXZlbnRzXG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG5cblx0LyoqXG5cdCAqIEFkZCB0byBzZWxlY3QgZWxlbWVudHMgdGhlIGVsZW1lbnQgdGhhdCBpcyB1bmRlciB0aGUgbW91c2Vcblx0ICovXG4gIHNlbGVjdE1vdXNlT3ZlckVsZW1lbnQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZWxlbWVudCA9IHRoaXMubW91c2VPdmVyRWxlbWVudFxuICAgIGlmIChlbGVtZW50KSB7XG4gICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudHMucHVzaChlbGVtZW50KVxuICAgICAgdGhpcy5oaWdobGlnaHRTZWxlY3RlZEVsZW1lbnRzKClcbiAgICB9XG4gIH0sXG5cbiAgYmluZEVsZW1lbnRIaWdobGlnaHQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQodGhpcy4kYWxsRWxlbWVudHMpLmJpbmQoJ21vdXNlb3Zlci5lbGVtZW50U2VsZWN0b3InLCBmdW5jdGlvbiAoZSkge1xuICAgICAgdmFyIGVsZW1lbnQgPSBlLmN1cnJlbnRUYXJnZXRcbiAgICAgIHRoaXMubW91c2VPdmVyRWxlbWVudCA9IGVsZW1lbnRcbiAgICAgIHRoaXMuJChlbGVtZW50KS5hZGRDbGFzcygnLXNpdGVtYXAtc2VsZWN0LWl0ZW0taG92ZXInKVxuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfS5iaW5kKHRoaXMpKS5iaW5kKCdtb3VzZW91dC5lbGVtZW50U2VsZWN0b3InLCBmdW5jdGlvbiAoZSkge1xuICAgICAgdmFyIGVsZW1lbnQgPSBlLmN1cnJlbnRUYXJnZXRcbiAgICAgIHRoaXMubW91c2VPdmVyRWxlbWVudCA9IG51bGxcbiAgICAgIHRoaXMuJChlbGVtZW50KS5yZW1vdmVDbGFzcygnLXNpdGVtYXAtc2VsZWN0LWl0ZW0taG92ZXInKVxuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuXG4gIGJpbmRNb3ZlSW1hZ2VzVG9Ub3A6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoJ2JvZHknKS5hZGRDbGFzcygnLXdlYi1zY3JhcGVyLXNlbGVjdGlvbi1hY3RpdmUnKVxuXG5cdFx0Ly8gZG8gdGhpcyBvbmx5IHdoZW4gc2VsZWN0aW5nIGltYWdlc1xuICAgIGlmICh0aGlzLmFsbG93ZWRFbGVtZW50cyA9PT0gJ2ltZycpIHtcbiAgICAgIHRoaXMuJCgnaW1nJykuZmlsdGVyKGZ1bmN0aW9uIChpLCBlbGVtZW50KSB7XG4gICAgICAgIHJldHVybiB0aGlzLiQoZWxlbWVudCkuY3NzKCdwb3NpdGlvbicpID09PSAnc3RhdGljJ1xuICAgICAgfSkuYWRkQ2xhc3MoJy13ZWItc2NyYXBlci1pbWctb24tdG9wJylcbiAgICB9XG4gIH0sXG5cbiAgdW5iaW5kTW92ZUltYWdlc1RvVG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKCdib2R5Li13ZWItc2NyYXBlci1zZWxlY3Rpb24tYWN0aXZlJykucmVtb3ZlQ2xhc3MoJy13ZWItc2NyYXBlci1zZWxlY3Rpb24tYWN0aXZlJylcbiAgICB0aGlzLiQoJ2ltZy4td2ViLXNjcmFwZXItaW1nLW9uLXRvcCcpLnJlbW92ZUNsYXNzKCctd2ViLXNjcmFwZXItaW1nLW9uLXRvcCcpXG4gIH0sXG5cbiAgc2VsZWN0Q2hpbGQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnRvcC0tXG4gICAgaWYgKHRoaXMudG9wIDwgMCkge1xuICAgICAgdGhpcy50b3AgPSAwXG4gICAgfVxuICB9LFxuICBzZWxlY3RQYXJlbnQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnRvcCsrXG4gIH0sXG5cblx0Ly8gVXNlciB3aXRoIGtleWJvYXJkIGFycm93cyBjYW4gc2VsZWN0IGNoaWxkIG9yIHBhcmV0IGVsZW1lbnRzIG9mIHNlbGVjdGVkIGVsZW1lbnRzLlxuICBiaW5kS2V5Ym9hcmRTZWxlY3Rpb25NYW5pcHVsYXRpb25zOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGRvY3VtZW50ID0gdGhpcy5kb2N1bWVudFxuXHRcdC8vIGNoZWNrIGZvciBmb2N1c1xuICAgIHZhciBsYXN0Rm9jdXNTdGF0dXNcbiAgICB0aGlzLmtleVByZXNzRm9jdXNJbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBmb2N1cyA9IGRvY3VtZW50Lmhhc0ZvY3VzKClcbiAgICAgIGlmIChmb2N1cyA9PT0gbGFzdEZvY3VzU3RhdHVzKSByZXR1cm5cbiAgICAgIGxhc3RGb2N1c1N0YXR1cyA9IGZvY3VzXG5cbiAgICAgIHRoaXMuJCgnIy1zZWxlY3Rvci10b29sYmFyIC5rZXktYnV0dG9uJykudG9nZ2xlQ2xhc3MoJ2hpZGUnLCAhZm9jdXMpXG4gICAgICB0aGlzLiQoJyMtc2VsZWN0b3ItdG9vbGJhciAua2V5LWV2ZW50cycpLnRvZ2dsZUNsYXNzKCdoaWRlJywgZm9jdXMpXG4gICAgfSwgMjAwKVxuXG5cdFx0Ly8gVXNpbmcgdXAvZG93biBhcnJvd3MgdXNlciBjYW4gc2VsZWN0IGVsZW1lbnRzIGZyb20gdG9wIG9mIHRoZVxuXHRcdC8vIHNlbGVjdGVkIGVsZW1lbnRcbiAgICB0aGlzLiQoZG9jdW1lbnQpLmJpbmQoJ2tleWRvd24uc2VsZWN0aW9uTWFuaXB1bGF0aW9uJywgZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHQvLyBzZWxlY3QgY2hpbGQgQ1xuICAgICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDY3KSB7XG4gICAgICAgIHRoaXMuYW5pbWF0ZUNsaWNrZWRLZXkodGhpcy4kKCcjLXNlbGVjdG9yLXRvb2xiYXIgLmtleS1idXR0b24tY2hpbGQnKSlcbiAgICAgICAgdGhpcy5zZWxlY3RDaGlsZCgpXG4gICAgICB9XG5cdFx0XHQvLyBzZWxlY3QgcGFyZW50IFBcbiAgICAgIGVsc2UgaWYgKGV2ZW50LmtleUNvZGUgPT09IDgwKSB7XG4gICAgICAgIHRoaXMuYW5pbWF0ZUNsaWNrZWRLZXkodGhpcy4kKCcjLXNlbGVjdG9yLXRvb2xiYXIgLmtleS1idXR0b24tcGFyZW50JykpXG4gICAgICAgIHRoaXMuc2VsZWN0UGFyZW50KClcbiAgICAgIH1cblx0XHRcdC8vIHNlbGVjdCBlbGVtZW50XG4gICAgICBlbHNlIGlmIChldmVudC5rZXlDb2RlID09PSA4Mykge1xuICAgICAgICB0aGlzLmFuaW1hdGVDbGlja2VkS2V5KHRoaXMuJCgnIy1zZWxlY3Rvci10b29sYmFyIC5rZXktYnV0dG9uLXNlbGVjdCcpKVxuICAgICAgICB0aGlzLnNlbGVjdE1vdXNlT3ZlckVsZW1lbnQoKVxuICAgICAgfVxuXG4gICAgICB0aGlzLmhpZ2hsaWdodFNlbGVjdGVkRWxlbWVudHMoKVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcblxuICBhbmltYXRlQ2xpY2tlZEtleTogZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICB0aGlzLiQoZWxlbWVudCkucmVtb3ZlQ2xhc3MoJ2NsaWNrZWQnKS5yZW1vdmVDbGFzcygnY2xpY2tlZC1hbmltYXRpb24nKVxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy4kKGVsZW1lbnQpLmFkZENsYXNzKCdjbGlja2VkJylcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLiQoZWxlbWVudCkuYWRkQ2xhc3MoJ2NsaWNrZWQtYW5pbWF0aW9uJylcbiAgICAgIH0sIDEwMClcbiAgICB9LCAxKVxuICB9LFxuXG4gIGhpZ2hsaWdodFNlbGVjdGVkRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIHRyeSB7XG4gICAgICB2YXIgcmVzdWx0Q3NzU2VsZWN0b3IgPSB0aGlzLmdldEN1cnJlbnRDU1NTZWxlY3RvcigpXG5cbiAgICAgICQoJ2JvZHkgIy1zZWxlY3Rvci10b29sYmFyIC5zZWxlY3RvcicpLnRleHQocmVzdWx0Q3NzU2VsZWN0b3IpXG5cdFx0XHQvLyBoaWdobGlnaHQgc2VsZWN0ZWQgZWxlbWVudHNcbiAgICAgICQoJy4tc2l0ZW1hcC1zZWxlY3QtaXRlbS1zZWxlY3RlZCcpLnJlbW92ZUNsYXNzKCctc2l0ZW1hcC1zZWxlY3QtaXRlbS1zZWxlY3RlZCcpXG4gICAgICAkKEVsZW1lbnRRdWVyeShyZXN1bHRDc3NTZWxlY3RvciwgdGhpcy5wYXJlbnQsIHskfSkpLmFkZENsYXNzKCctc2l0ZW1hcC1zZWxlY3QtaXRlbS1zZWxlY3RlZCcpXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAoZXJyID09PSAnZm91bmQgbXVsdGlwbGUgZWxlbWVudCBncm91cHMsIGJ1dCBhbGxvd011bHRpcGxlU2VsZWN0b3JzIGRpc2FibGVkJykge1xuICAgICAgICBjb25zb2xlLmxvZygnbXVsdGlwbGUgZGlmZmVyZW50IGVsZW1lbnQgc2VsZWN0aW9uIGRpc2FibGVkJylcblxuICAgICAgICB0aGlzLnNob3dNdWx0aXBsZUdyb3VwUG9wdXAoKVxuXHRcdFx0XHQvLyByZW1vdmUgbGFzdCBhZGRlZCBlbGVtZW50XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50cy5wb3AoKVxuICAgICAgICB0aGlzLmhpZ2hsaWdodFNlbGVjdGVkRWxlbWVudHMoKVxuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBzaG93TXVsdGlwbGVHcm91cFBvcHVwOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKCcjLXNlbGVjdG9yLXRvb2xiYXIgLnBvcG92ZXInKS5hdHRyKCdzdHlsZScsICdkaXNwbGF5OmJsb2NrICFpbXBvcnRhbnQ7JylcbiAgfSxcblxuICBoaWRlTXVsdGlwbGVHcm91cFBvcHVwOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKCcjLXNlbGVjdG9yLXRvb2xiYXIgLnBvcG92ZXInKS5hdHRyKCdzdHlsZScsICcnKVxuICB9LFxuXG4gIGJpbmRNdWx0aXBsZUdyb3VwUG9wdXBIaWRlOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKCcjLXNlbGVjdG9yLXRvb2xiYXIgLnBvcG92ZXIgLmNsb3NlJykuY2xpY2sodGhpcy5oaWRlTXVsdGlwbGVHcm91cFBvcHVwLmJpbmQodGhpcykpXG4gIH0sXG5cbiAgdW5iaW5kTXVsdGlwbGVHcm91cFBvcHVwSGlkZTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJCgnIy1zZWxlY3Rvci10b29sYmFyIC5wb3BvdmVyIC5jbG9zZScpLnVuYmluZCgnY2xpY2snKVxuICB9LFxuXG4gIGJpbmRNdWx0aXBsZUdyb3VwQ2hlY2tib3g6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoJyMtc2VsZWN0b3ItdG9vbGJhciBbbmFtZT1kaWZlcmVudEVsZW1lbnRTZWxlY3Rpb25dJykuY2hhbmdlKGZ1bmN0aW9uIChlKSB7XG4gICAgICBpZiAodGhpcy4kKGUuY3VycmVudFRhcmdldCkuaXMoJzpjaGVja2VkJykpIHtcbiAgICAgICAgdGhpcy5pbml0Q3NzU2VsZWN0b3IodHJ1ZSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuaW5pdENzc1NlbGVjdG9yKGZhbHNlKVxuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcbiAgdW5iaW5kTXVsdGlwbGVHcm91cENoZWNrYm94OiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKCcjLXNlbGVjdG9yLXRvb2xiYXIgLmRpZmVyZW50RWxlbWVudFNlbGVjdGlvbicpLnVuYmluZCgnY2hhbmdlJylcbiAgfSxcblxuICBhdHRhY2hUb29sYmFyOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyICR0b29sYmFyID0gJzxkaXYgaWQ9XCItc2VsZWN0b3ItdG9vbGJhclwiPicgK1xuXHRcdFx0JzxkaXYgY2xhc3M9XCJsaXN0LWl0ZW1cIj48ZGl2IGNsYXNzPVwic2VsZWN0b3ItY29udGFpbmVyXCI+PGRpdiBjbGFzcz1cInNlbGVjdG9yXCI+PC9kaXY+PC9kaXY+PC9kaXY+JyArXG5cdFx0XHQnPGRpdiBjbGFzcz1cImlucHV0LWdyb3VwLWFkZG9uIGxpc3QtaXRlbVwiPicgK1xuXHRcdFx0XHQnPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIHRpdGxlPVwiRW5hYmxlIGRpZmZlcmVudCB0eXBlIGVsZW1lbnQgc2VsZWN0aW9uXCIgbmFtZT1cImRpZmVyZW50RWxlbWVudFNlbGVjdGlvblwiPicgK1xuXHRcdFx0XHQnPGRpdiBjbGFzcz1cInBvcG92ZXIgdG9wXCI+JyArXG5cdFx0XHRcdCc8ZGl2IGNsYXNzPVwiY2xvc2VcIj7DlzwvZGl2PicgK1xuXHRcdFx0XHQnPGRpdiBjbGFzcz1cImFycm93XCI+PC9kaXY+JyArXG5cdFx0XHRcdCc8ZGl2IGNsYXNzPVwicG9wb3Zlci1jb250ZW50XCI+JyArXG5cdFx0XHRcdCc8ZGl2IGNsYXNzPVwidHh0XCI+JyArXG5cdFx0XHRcdCdEaWZmZXJlbnQgdHlwZSBlbGVtZW50IHNlbGVjdGlvbiBpcyBkaXNhYmxlZC4gSWYgdGhlIGVsZW1lbnQgJyArXG5cdFx0XHRcdCd5b3UgY2xpY2tlZCBzaG91bGQgYWxzbyBiZSBpbmNsdWRlZCB0aGVuIGVuYWJsZSB0aGlzIGFuZCAnICtcblx0XHRcdFx0J2NsaWNrIG9uIHRoZSBlbGVtZW50IGFnYWluLiBVc3VhbGx5IHRoaXMgaXMgbm90IG5lZWRlZC4nICtcblx0XHRcdFx0JzwvZGl2PicgK1xuXHRcdFx0XHQnPC9kaXY+JyArXG5cdFx0XHRcdCc8L2Rpdj4nICtcblx0XHRcdCc8L2Rpdj4nICtcblx0XHRcdCc8ZGl2IGNsYXNzPVwibGlzdC1pdGVtIGtleS1ldmVudHNcIj48ZGl2IHRpdGxlPVwiQ2xpY2sgaGVyZSB0byBlbmFibGUga2V5IHByZXNzIGV2ZW50cyBmb3Igc2VsZWN0aW9uXCI+RW5hYmxlIGtleSBldmVudHM8L2Rpdj48L2Rpdj4nICtcblx0XHRcdCc8ZGl2IGNsYXNzPVwibGlzdC1pdGVtIGtleS1idXR0b24ga2V5LWJ1dHRvbi1zZWxlY3QgaGlkZVwiIHRpdGxlPVwiVXNlIFMga2V5IHRvIHNlbGVjdCBlbGVtZW50XCI+UzwvZGl2PicgK1xuXHRcdFx0JzxkaXYgY2xhc3M9XCJsaXN0LWl0ZW0ga2V5LWJ1dHRvbiBrZXktYnV0dG9uLXBhcmVudCBoaWRlXCIgdGl0bGU9XCJVc2UgUCBrZXkgdG8gc2VsZWN0IHBhcmVudFwiPlA8L2Rpdj4nICtcblx0XHRcdCc8ZGl2IGNsYXNzPVwibGlzdC1pdGVtIGtleS1idXR0b24ga2V5LWJ1dHRvbi1jaGlsZCBoaWRlXCIgdGl0bGU9XCJVc2UgQyBrZXkgdG8gc2VsZWN0IGNoaWxkXCI+QzwvZGl2PicgK1xuXHRcdFx0JzxkaXYgY2xhc3M9XCJsaXN0LWl0ZW0gZG9uZS1zZWxlY3RpbmctYnV0dG9uXCI+RG9uZSBzZWxlY3RpbmchPC9kaXY+JyArXG5cdFx0XHQnPC9kaXY+J1xuICAgIHRoaXMuJCgnYm9keScpLmFwcGVuZCgkdG9vbGJhcilcblxuICAgIHRoaXMuJCgnYm9keSAjLXNlbGVjdG9yLXRvb2xiYXIgLmRvbmUtc2VsZWN0aW5nLWJ1dHRvbicpLmNsaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuc2VsZWN0aW9uRmluaXNoZWQoKVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcbiAgaGlnaGxpZ2h0UGFyZW50OiBmdW5jdGlvbiAoKSB7XG5cdFx0Ly8gZG8gbm90IGhpZ2hsaWdodCBwYXJlbnQgaWYgaXRzIHRoZSBib2R5XG4gICAgaWYgKCF0aGlzLiQodGhpcy5wYXJlbnQpLmlzKCdib2R5JykgJiYgIXRoaXMuJCh0aGlzLnBhcmVudCkuaXMoJyN3ZWJwYWdlJykpIHtcbiAgICAgIHRoaXMuJCh0aGlzLnBhcmVudCkuYWRkQ2xhc3MoJy1zaXRlbWFwLXBhcmVudCcpXG4gICAgfVxuICB9LFxuXG4gIHVuYmluZEVsZW1lbnRTZWxlY3Rpb246IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQodGhpcy4kYWxsRWxlbWVudHMpLnVuYmluZCgnY2xpY2suZWxlbWVudFNlbGVjdG9yJylcblx0XHQvLyByZW1vdmUgaGlnaGxpZ2h0ZWQgZWxlbWVudCBjbGFzc2VzXG4gICAgdGhpcy51bmJpbmRFbGVtZW50U2VsZWN0aW9uSGlnaGxpZ2h0KClcbiAgfSxcbiAgdW5iaW5kRWxlbWVudFNlbGVjdGlvbkhpZ2hsaWdodDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJCgnLi1zaXRlbWFwLXNlbGVjdC1pdGVtLXNlbGVjdGVkJykucmVtb3ZlQ2xhc3MoJy1zaXRlbWFwLXNlbGVjdC1pdGVtLXNlbGVjdGVkJylcbiAgICB0aGlzLiQoJy4tc2l0ZW1hcC1wYXJlbnQnKS5yZW1vdmVDbGFzcygnLXNpdGVtYXAtcGFyZW50JylcbiAgfSxcbiAgdW5iaW5kRWxlbWVudEhpZ2hsaWdodDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJCh0aGlzLiRhbGxFbGVtZW50cykudW5iaW5kKCdtb3VzZW92ZXIuZWxlbWVudFNlbGVjdG9yJylcblx0XHRcdC51bmJpbmQoJ21vdXNlb3V0LmVsZW1lbnRTZWxlY3RvcicpXG4gIH0sXG4gIHVuYmluZEtleWJvYXJkU2VsZWN0aW9uTWFpcHVsYXRpb3M6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoZG9jdW1lbnQpLnVuYmluZCgna2V5ZG93bi5zZWxlY3Rpb25NYW5pcHVsYXRpb24nKVxuICAgIGNsZWFySW50ZXJ2YWwodGhpcy5rZXlQcmVzc0ZvY3VzSW50ZXJ2YWwpXG4gIH0sXG4gIHJlbW92ZVRvb2xiYXI6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoJ2JvZHkgIy1zZWxlY3Rvci10b29sYmFyIGEnKS51bmJpbmQoJ2NsaWNrJylcbiAgICB0aGlzLiQoJyMtc2VsZWN0b3ItdG9vbGJhcicpLnJlbW92ZSgpXG4gIH0sXG5cblx0LyoqXG5cdCAqIFJlbW92ZSB0b29sYmFyIGFuZCB1bmJpbmQgZXZlbnRzXG5cdCAqL1xuICByZW1vdmVHVUk6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnVuYmluZEVsZW1lbnRTZWxlY3Rpb24oKVxuICAgIHRoaXMudW5iaW5kRWxlbWVudEhpZ2hsaWdodCgpXG4gICAgdGhpcy51bmJpbmRLZXlib2FyZFNlbGVjdGlvbk1haXB1bGF0aW9zKClcbiAgICB0aGlzLnVuYmluZE11bHRpcGxlR3JvdXBQb3B1cEhpZGUoKVxuICAgIHRoaXMudW5iaW5kTXVsdGlwbGVHcm91cENoZWNrYm94KClcbiAgICB0aGlzLnVuYmluZE1vdmVJbWFnZXNUb1RvcCgpXG4gICAgdGhpcy5yZW1vdmVUb29sYmFyKClcbiAgfSxcblxuICBzZWxlY3Rpb25GaW5pc2hlZDogZnVuY3Rpb24gKCkge1xuICAgIHZhciByZXN1bHRDc3NTZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudENTU1NlbGVjdG9yKClcblxuICAgIHRoaXMuZGVmZXJyZWRDU1NTZWxlY3RvclJlc3BvbnNlLnJlc29sdmUoe1xuICAgICAgQ1NTU2VsZWN0b3I6IHJlc3VsdENzc1NlbGVjdG9yXG4gICAgfSlcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnRTZWxlY3RvclxuIiwidmFyIHNlbGVjdG9ycyA9IHJlcXVpcmUoJy4vU2VsZWN0b3JzJylcbnZhciBTZWxlY3RvciA9IHJlcXVpcmUoJy4vU2VsZWN0b3InKVxudmFyIFNlbGVjdG9yVGFibGUgPSBzZWxlY3RvcnMuU2VsZWN0b3JUYWJsZVxudmFyIFNpdGVtYXAgPSByZXF1aXJlKCcuL1NpdGVtYXAnKVxuLy8gdmFyIFNlbGVjdG9yR3JhcGh2MiA9IHJlcXVpcmUoJy4vU2VsZWN0b3JHcmFwaHYyJylcbnZhciBnZXRCYWNrZ3JvdW5kU2NyaXB0ID0gcmVxdWlyZSgnLi9nZXRCYWNrZ3JvdW5kU2NyaXB0JylcbnZhciBnZXRDb250ZW50U2NyaXB0ID0gcmVxdWlyZSgnLi9nZXRDb250ZW50U2NyaXB0JylcbnZhciBTaXRlbWFwQ29udHJvbGxlciA9IGZ1bmN0aW9uIChvcHRpb25zLCBtb3JlT3B0aW9ucykge1xuICB0aGlzLiQgPSBtb3JlT3B0aW9ucy4kXG50aGlzLmRvY3VtZW50ID0gbW9yZU9wdGlvbnMuZG9jdW1lbnRcbnRoaXMud2luZG93ID0gbW9yZU9wdGlvbnMud2luZG93XG4gIGlmICghdGhpcy4kKSB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcganF1ZXJ5IGluIENvbnRyb2xsZXInKVxuICBmb3IgKHZhciBpIGluIG9wdGlvbnMpIHtcbiAgICB0aGlzW2ldID0gb3B0aW9uc1tpXVxuICB9XG4gIHRoaXMuaW5pdCgpXG59XG5cblNpdGVtYXBDb250cm9sbGVyLnByb3RvdHlwZSA9IHtcblxuICBiYWNrZ3JvdW5kU2NyaXB0OiBnZXRCYWNrZ3JvdW5kU2NyaXB0KCdEZXZUb29scycpLFxuICBjb250ZW50U2NyaXB0OiBnZXRDb250ZW50U2NyaXB0KCdEZXZUb29scycpLFxuXG4gIGNvbnRyb2w6IGZ1bmN0aW9uIChjb250cm9scykge1xuICAgIHZhciBjb250cm9sbGVyID0gdGhpc1xuXG4gICAgZm9yICh2YXIgc2VsZWN0b3IgaW4gY29udHJvbHMpIHtcbiAgICAgIGZvciAodmFyIGV2ZW50IGluIGNvbnRyb2xzW3NlbGVjdG9yXSkge1xuICAgICAgICB0aGlzLiQoZG9jdW1lbnQpLm9uKGV2ZW50LCBzZWxlY3RvciwgKGZ1bmN0aW9uIChzZWxlY3RvciwgZXZlbnQpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGNvbnRpbnVlQnViYmxpbmcgPSBjb250cm9sc1tzZWxlY3Rvcl1bZXZlbnRdLmNhbGwoY29udHJvbGxlciwgdGhpcylcbiAgICAgICAgICAgIGlmIChjb250aW51ZUJ1YmJsaW5nICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSkoc2VsZWN0b3IsIGV2ZW50KSlcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cblx0LyoqXG5cdCAqIExvYWRzIHRlbXBsYXRlcyBmb3IgSUNhbkhhelxuXHQgKi9cbiAgbG9hZFRlbXBsYXRlczogZnVuY3Rpb24gKGNiQWxsVGVtcGxhdGVzTG9hZGVkKSB7XG4gICAgdmFyIHRlbXBsYXRlSWRzID0gW1xuICAgICAgJ1ZpZXdwb3J0JyxcbiAgICAgICdTaXRlbWFwTGlzdCcsXG4gICAgICAnU2l0ZW1hcExpc3RJdGVtJyxcbiAgICAgICdTaXRlbWFwQ3JlYXRlJyxcbiAgICAgICdTaXRlbWFwU3RhcnRVcmxGaWVsZCcsXG4gICAgICAnU2l0ZW1hcEltcG9ydCcsXG4gICAgICAnU2l0ZW1hcEV4cG9ydCcsXG4gICAgICAnU2l0ZW1hcEJyb3dzZURhdGEnLFxuICAgICAgJ1NpdGVtYXBTY3JhcGVDb25maWcnLFxuICAgICAgJ1NpdGVtYXBFeHBvcnREYXRhQ1NWJyxcbiAgICAgICdTaXRlbWFwRWRpdE1ldGFkYXRhJyxcbiAgICAgICdTZWxlY3Rvckxpc3QnLFxuICAgICAgJ1NlbGVjdG9yTGlzdEl0ZW0nLFxuICAgICAgJ1NlbGVjdG9yRWRpdCcsXG4gICAgICAnU2VsZWN0b3JFZGl0VGFibGVDb2x1bW4nLFxuICAgICAgLy8gJ1NpdGVtYXBTZWxlY3RvckdyYXBoJyxcbiAgICAgICdEYXRhUHJldmlldydcbiAgICBdXG4gICAgdmFyIHRlbXBsYXRlc0xvYWRlZCA9IDBcbiAgICB2YXIgY2JMb2FkZWQgPSBmdW5jdGlvbiAodGVtcGxhdGVJZCwgdGVtcGxhdGUpIHtcbiAgICAgIHRlbXBsYXRlc0xvYWRlZCsrXG4gICAgICBpY2guYWRkVGVtcGxhdGUodGVtcGxhdGVJZCwgdGVtcGxhdGUpXG4gICAgICBpZiAodGVtcGxhdGVzTG9hZGVkID09PSB0ZW1wbGF0ZUlkcy5sZW5ndGgpIHtcbiAgICAgICAgY2JBbGxUZW1wbGF0ZXNMb2FkZWQoKVxuICAgICAgfVxuICAgIH1cblxuICAgIHRlbXBsYXRlSWRzLmZvckVhY2goZnVuY3Rpb24gKHRlbXBsYXRlSWQpIHtcbiAgICAgIHRoaXMuJC5nZXQodGhpcy50ZW1wbGF0ZURpciArIHRlbXBsYXRlSWQgKyAnLmh0bWwnLCBjYkxvYWRlZC5iaW5kKHRoaXMsIHRlbXBsYXRlSWQpKVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcblxuICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5sb2FkVGVtcGxhdGVzKGZ1bmN0aW9uICgpIHtcblx0XHRcdC8vIGN1cnJlbnRseSB2aWV3ZWQgb2JqZWN0c1xuICAgICAgdGhpcy5jbGVhclN0YXRlKClcblxuXHRcdFx0Ly8gcmVuZGVyIG1haW4gdmlld3BvcnRcbiAgICAgIGljaC5WaWV3cG9ydCgpLmFwcGVuZFRvKCdib2R5JylcblxuXHRcdFx0Ly8gY2FuY2VsIGFsbCBmb3JtIHN1Ym1pdHNcbiAgICAgIHRoaXMuJCgnZm9ybScpLmJpbmQoJ3N1Ym1pdCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9KVxuXG4gICAgICB0aGlzLmNvbnRyb2woe1xuICAgICAgICAnI3NpdGVtYXBzLW5hdi1idXR0b24nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2hvd1NpdGVtYXBzXG4gICAgICAgIH0sXG4gICAgICAgICcjY3JlYXRlLXNpdGVtYXAtY3JlYXRlLW5hdi1idXR0b24nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2hvd0NyZWF0ZVNpdGVtYXBcbiAgICAgICAgfSxcbiAgICAgICAgJyNjcmVhdGUtc2l0ZW1hcC1pbXBvcnQtbmF2LWJ1dHRvbic6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5zaG93SW1wb3J0U2l0ZW1hcFBhbmVsXG4gICAgICAgIH0sXG4gICAgICAgICcjc2l0ZW1hcC1leHBvcnQtbmF2LWJ1dHRvbic6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5zaG93U2l0ZW1hcEV4cG9ydFBhbmVsXG4gICAgICAgIH0sXG4gICAgICAgICcjc2l0ZW1hcC1leHBvcnQtZGF0YS1jc3YtbmF2LWJ1dHRvbic6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5zaG93U2l0ZW1hcEV4cG9ydERhdGFDc3ZQYW5lbFxuICAgICAgICB9LFxuICAgICAgICAnI3N1Ym1pdC1jcmVhdGUtc2l0ZW1hcCc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5jcmVhdGVTaXRlbWFwXG4gICAgICAgIH0sXG4gICAgICAgICcjc3VibWl0LWltcG9ydC1zaXRlbWFwJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLmltcG9ydFNpdGVtYXBcbiAgICAgICAgfSxcbiAgICAgICAgJyNzaXRlbWFwLWVkaXQtbWV0YWRhdGEtbmF2LWJ1dHRvbic6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5lZGl0U2l0ZW1hcE1ldGFkYXRhXG4gICAgICAgIH0sXG4gICAgICAgICcjc2l0ZW1hcC1zZWxlY3Rvci1saXN0LW5hdi1idXR0b24nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2hvd1NpdGVtYXBTZWxlY3Rvckxpc3RcbiAgICAgICAgfSwgLyosICAgICAgICAnI3NpdGVtYXAtc2VsZWN0b3ItZ3JhcGgtbmF2LWJ1dHRvbic6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5zaG93U2l0ZW1hcFNlbGVjdG9yR3JhcGhcbiAgICAgICAgfSAqL1xuICAgICAgICAnI3NpdGVtYXAtYnJvd3NlLW5hdi1idXR0b24nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuYnJvd3NlU2l0ZW1hcERhdGFcbiAgICAgICAgfSxcbiAgICAgICAgJ2J1dHRvbiNzdWJtaXQtZWRpdC1zaXRlbWFwJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLmVkaXRTaXRlbWFwTWV0YWRhdGFTYXZlXG4gICAgICAgIH0sXG4gICAgICAgICcjZWRpdC1zaXRlbWFwLW1ldGFkYXRhLWZvcm0nOiB7XG4gICAgICAgICAgc3VibWl0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBmYWxzZSB9XG4gICAgICAgIH0sXG4gICAgICAgICcjc2l0ZW1hcHMgdHInOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuZWRpdFNpdGVtYXBcbiAgICAgICAgfSxcbiAgICAgICAgJyNzaXRlbWFwcyBidXR0b25bYWN0aW9uPWRlbGV0ZS1zaXRlbWFwXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5kZWxldGVTaXRlbWFwXG4gICAgICAgIH0sXG4gICAgICAgICcjc2l0ZW1hcC1zY3JhcGUtbmF2LWJ1dHRvbic6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5zaG93U2NyYXBlU2l0ZW1hcENvbmZpZ1BhbmVsXG4gICAgICAgIH0sXG4gICAgICAgICcjc3VibWl0LXNjcmFwZS1zaXRlbWFwLWZvcm0nOiB7XG4gICAgICAgICAgc3VibWl0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBmYWxzZSB9XG4gICAgICAgIH0sXG4gICAgICAgICcjc3VibWl0LXNjcmFwZS1zaXRlbWFwJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNjcmFwZVNpdGVtYXBcbiAgICAgICAgfSxcbiAgICAgICAgJyNzaXRlbWFwcyBidXR0b25bYWN0aW9uPWJyb3dzZS1zaXRlbWFwLWRhdGFdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNpdGVtYXBMaXN0QnJvd3NlU2l0ZW1hcERhdGFcbiAgICAgICAgfSxcbiAgICAgICAgJyNzaXRlbWFwcyBidXR0b25bYWN0aW9uPWNzdi1kb3dubG9hZC1zaXRlbWFwLWRhdGFdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLmRvd25sb2FkU2l0ZW1hcERhdGFcbiAgICAgICAgfSxcblx0XHRcdFx0Ly8gQFRPRE8gbW92ZSB0byB0clxuICAgICAgICAnI3NlbGVjdG9yLXRyZWUgdGJvZHkgdHInOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2hvd0NoaWxkU2VsZWN0b3JzXG4gICAgICAgIH0sXG4gICAgICAgICcjc2VsZWN0b3ItdHJlZSAuYnJlYWRjcnVtYiBhJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnRyZWVOYXZpZ2F0aW9uc2hvd1NpdGVtYXBTZWxlY3Rvckxpc3RcbiAgICAgICAgfSxcbiAgICAgICAgJyNzZWxlY3Rvci10cmVlIHRyIGJ1dHRvblthY3Rpb249ZWRpdC1zZWxlY3Rvcl0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuZWRpdFNlbGVjdG9yXG4gICAgICAgIH0sXG4gICAgICAgICcjZWRpdC1zZWxlY3RvciBzZWxlY3RbbmFtZT10eXBlXSc6IHtcbiAgICAgICAgICBjaGFuZ2U6IHRoaXMuc2VsZWN0b3JUeXBlQ2hhbmdlZFxuICAgICAgICB9LFxuICAgICAgICAnI2VkaXQtc2VsZWN0b3IgYnV0dG9uW2FjdGlvbj1zYXZlLXNlbGVjdG9yXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5zYXZlU2VsZWN0b3JcbiAgICAgICAgfSxcbiAgICAgICAgJyNlZGl0LXNlbGVjdG9yIGJ1dHRvblthY3Rpb249Y2FuY2VsLXNlbGVjdG9yLWVkaXRpbmddJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLmNhbmNlbFNlbGVjdG9yRWRpdGluZ1xuICAgICAgICB9LFxuICAgICAgICAnI2VkaXQtc2VsZWN0b3IgI3NlbGVjdG9ySWQnOiB7XG4gICAgICAgICAga2V5dXA6IHRoaXMudXBkYXRlU2VsZWN0b3JQYXJlbnRMaXN0T25JZENoYW5nZVxuICAgICAgICB9LFxuICAgICAgICAnI3NlbGVjdG9yLXRyZWUgYnV0dG9uW2FjdGlvbj1hZGQtc2VsZWN0b3JdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLmFkZFNlbGVjdG9yXG4gICAgICAgIH0sXG4gICAgICAgICcjc2VsZWN0b3ItdHJlZSB0ciBidXR0b25bYWN0aW9uPWRlbGV0ZS1zZWxlY3Rvcl0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuZGVsZXRlU2VsZWN0b3JcbiAgICAgICAgfSxcbiAgICAgICAgJyNzZWxlY3Rvci10cmVlIHRyIGJ1dHRvblthY3Rpb249cHJldmlldy1zZWxlY3Rvcl0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMucHJldmlld1NlbGVjdG9yRnJvbVNlbGVjdG9yVHJlZVxuICAgICAgICB9LFxuICAgICAgICAnI3NlbGVjdG9yLXRyZWUgdHIgYnV0dG9uW2FjdGlvbj1kYXRhLXByZXZpZXctc2VsZWN0b3JdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnByZXZpZXdTZWxlY3RvckRhdGFGcm9tU2VsZWN0b3JUcmVlXG4gICAgICAgIH0sXG4gICAgICAgICcjZWRpdC1zZWxlY3RvciBidXR0b25bYWN0aW9uPXNlbGVjdC1zZWxlY3Rvcl0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2VsZWN0U2VsZWN0b3JcbiAgICAgICAgfSxcbiAgICAgICAgJyNlZGl0LXNlbGVjdG9yIGJ1dHRvblthY3Rpb249c2VsZWN0LXRhYmxlLWhlYWRlci1yb3ctc2VsZWN0b3JdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNlbGVjdFRhYmxlSGVhZGVyUm93U2VsZWN0b3JcbiAgICAgICAgfSxcbiAgICAgICAgJyNlZGl0LXNlbGVjdG9yIGJ1dHRvblthY3Rpb249c2VsZWN0LXRhYmxlLWRhdGEtcm93LXNlbGVjdG9yXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5zZWxlY3RUYWJsZURhdGFSb3dTZWxlY3RvclxuICAgICAgICB9LFxuICAgICAgICAnI2VkaXQtc2VsZWN0b3IgYnV0dG9uW2FjdGlvbj1wcmV2aWV3LXNlbGVjdG9yXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5wcmV2aWV3U2VsZWN0b3JcbiAgICAgICAgfSxcbiAgICAgICAgJyNlZGl0LXNlbGVjdG9yIGJ1dHRvblthY3Rpb249cHJldmlldy1jbGljay1lbGVtZW50LXNlbGVjdG9yXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5wcmV2aWV3Q2xpY2tFbGVtZW50U2VsZWN0b3JcbiAgICAgICAgfSxcbiAgICAgICAgJyNlZGl0LXNlbGVjdG9yIGJ1dHRvblthY3Rpb249cHJldmlldy10YWJsZS1yb3ctc2VsZWN0b3JdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnByZXZpZXdUYWJsZVJvd1NlbGVjdG9yXG4gICAgICAgIH0sXG4gICAgICAgICcjZWRpdC1zZWxlY3RvciBidXR0b25bYWN0aW9uPXByZXZpZXctc2VsZWN0b3ItZGF0YV0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMucHJldmlld1NlbGVjdG9yRGF0YUZyb21TZWxlY3RvckVkaXRpbmdcbiAgICAgICAgfSxcbiAgICAgICAgJ2J1dHRvbi5hZGQtZXh0cmEtc3RhcnQtdXJsJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLmFkZFN0YXJ0VXJsXG4gICAgICAgIH0sXG4gICAgICAgICdidXR0b24ucmVtb3ZlLXN0YXJ0LXVybCc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5yZW1vdmVTdGFydFVybFxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgdGhpcy5zaG93U2l0ZW1hcHMoKVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcblxuICBjbGVhclN0YXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zdGF0ZSA9IHtcblx0XHRcdC8vIHNpdGVtYXAgdGhhdCBpcyBjdXJyZW50bHkgb3BlblxuICAgICAgY3VycmVudFNpdGVtYXA6IG51bGwsXG5cdFx0XHQvLyBzZWxlY3RvciBpZHMgdGhhdCBhcmUgc2hvd24gaW4gdGhlIG5hdmlnYXRpb25cbiAgICAgIGVkaXRTaXRlbWFwQnJlYWRjdW1ic1NlbGVjdG9yczogbnVsbCxcbiAgICAgIGN1cnJlbnRQYXJlbnRTZWxlY3RvcklkOiBudWxsLFxuICAgICAgY3VycmVudFNlbGVjdG9yOiBudWxsXG4gICAgfVxuICB9LFxuXG4gIHNldFN0YXRlRWRpdFNpdGVtYXA6IGZ1bmN0aW9uIChzaXRlbWFwKSB7XG4gICAgdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcCA9IHNpdGVtYXBcbiAgICB0aGlzLnN0YXRlLmVkaXRTaXRlbWFwQnJlYWRjdW1ic1NlbGVjdG9ycyA9IFtcblx0XHRcdHtpZDogJ19yb290J31cbiAgICBdXG4gICAgdGhpcy5zdGF0ZS5jdXJyZW50UGFyZW50U2VsZWN0b3JJZCA9ICdfcm9vdCdcbiAgfSxcblxuICBzZXRBY3RpdmVOYXZpZ2F0aW9uQnV0dG9uOiBmdW5jdGlvbiAobmF2aWdhdGlvbklkKSB7XG4gICAgdGhpcy4kKCcubmF2IC5hY3RpdmUnKS5yZW1vdmVDbGFzcygnYWN0aXZlJylcbiAgICB0aGlzLiQoJyMnICsgbmF2aWdhdGlvbklkICsgJy1uYXYtYnV0dG9uJykuY2xvc2VzdCgnbGknKS5hZGRDbGFzcygnYWN0aXZlJylcblxuICAgIGlmIChuYXZpZ2F0aW9uSWQubWF0Y2goL15zaXRlbWFwLS8pKSB7XG4gICAgICB0aGlzLiQoJyNzaXRlbWFwLW5hdi1idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgdGhpcy4kKCcjc2l0ZW1hcC1uYXYtYnV0dG9uJykuY2xvc2VzdCgnbGknKS5hZGRDbGFzcygnYWN0aXZlJylcbiAgICAgIHRoaXMuJCgnI25hdmJhci1hY3RpdmUtc2l0ZW1hcC1pZCcpLnRleHQoJygnICsgdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcC5faWQgKyAnKScpXG4gICAgfVx0XHRlbHNlIHtcbiAgICAgIHRoaXMuJCgnI3NpdGVtYXAtbmF2LWJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpXG4gICAgICB0aGlzLiQoJyNuYXZiYXItYWN0aXZlLXNpdGVtYXAtaWQnKS50ZXh0KCcnKVxuICAgIH1cblxuICAgIGlmIChuYXZpZ2F0aW9uSWQubWF0Y2goL15jcmVhdGUtc2l0ZW1hcC0vKSkge1xuICAgICAgdGhpcy4kKCcjY3JlYXRlLXNpdGVtYXAtbmF2LWJ1dHRvbicpLmNsb3Nlc3QoJ2xpJykuYWRkQ2xhc3MoJ2FjdGl2ZScpXG4gICAgfVxuICB9LFxuXG5cdC8qKlxuXHQgKiBTaW1wbGUgaW5mbyBwb3B1cCBmb3Igc2l0ZW1hcCBzdGFydCB1cmwgaW5wdXQgZmllbGRcblx0ICovXG4gIGluaXRNdWx0aXBsZVN0YXJ0VXJsSGVscGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKCcjc3RhcnRVcmwnKVxuXHRcdFx0LnBvcG92ZXIoe1xuICB0aXRsZTogJ011bHRpcGxlIHN0YXJ0IHVybHMnLFxuICBodG1sOiB0cnVlLFxuICBjb250ZW50OiAnWW91IGNhbiBjcmVhdGUgcmFuZ2VkIHN0YXJ0IHVybHMgbGlrZSB0aGlzOjxiciAvPmh0dHA6Ly9leGFtcGxlLmNvbS9bMS0xMDBdLmh0bWwnLFxuICBwbGFjZW1lbnQ6ICdib3R0b20nXG59KVxuXHRcdFx0LmJsdXIoZnVuY3Rpb24gKCkge1xuICB0aGlzLiQodGhpcykucG9wb3ZlcignaGlkZScpXG59KVxuICB9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIGJvb3RzdHJhcFZhbGlkYXRvciBvYmplY3QgZm9yIGN1cnJlbnQgZm9ybSBpbiB2aWV3cG9ydFxuXHQgKi9cbiAgZ2V0Rm9ybVZhbGlkYXRvcjogZnVuY3Rpb24gKCkge1xuICAgIHZhciB2YWxpZGF0b3IgPSB0aGlzLiQoJyN2aWV3cG9ydCBmb3JtJykuZGF0YSgnYm9vdHN0cmFwVmFsaWRhdG9yJylcbiAgICByZXR1cm4gdmFsaWRhdG9yXG4gIH0sXG5cblx0LyoqXG5cdCAqIFJldHVybnMgd2hldGhlciBjdXJyZW50IGZvcm0gaW4gdGhlIHZpZXdwb3J0IGlzIHZhbGlkXG5cdCAqIEByZXR1cm5zIHtCb29sZWFufVxuXHQgKi9cbiAgaXNWYWxpZEZvcm06IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdmFsaWRhdG9yID0gdGhpcy5nZXRGb3JtVmFsaWRhdG9yKClcblxuXHRcdC8vIHZhbGlkYXRvci52YWxpZGF0ZSgpO1xuXHRcdC8vIHZhbGlkYXRlIG1ldGhvZCBjYWxscyBzdWJtaXQgd2hpY2ggaXMgbm90IG5lZWRlZCBpbiB0aGlzIGNhc2UuXG4gICAgZm9yICh2YXIgZmllbGQgaW4gdmFsaWRhdG9yLm9wdGlvbnMuZmllbGRzKSB7XG4gICAgICB2YWxpZGF0b3IudmFsaWRhdGVGaWVsZChmaWVsZClcbiAgICB9XG5cbiAgICB2YXIgdmFsaWQgPSB2YWxpZGF0b3IuaXNWYWxpZCgpXG4gICAgcmV0dXJuIHZhbGlkXG4gIH0sXG5cblx0LyoqXG5cdCAqIEFkZCB2YWxpZGF0aW9uIHRvIHNpdGVtYXAgY3JlYXRpb24gb3IgZWRpdGluZyBmb3JtXG5cdCAqL1xuICBpbml0U2l0ZW1hcFZhbGlkYXRpb246IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoJyN2aWV3cG9ydCBmb3JtJykuYm9vdHN0cmFwVmFsaWRhdG9yKHtcbiAgICAgIGZpZWxkczoge1xuICAgICAgICAnX2lkJzoge1xuICAgICAgICAgIHZhbGlkYXRvcnM6IHtcbiAgICAgICAgICAgIG5vdEVtcHR5OiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgc2l0ZW1hcCBpZCBpcyByZXF1aXJlZCBhbmQgY2Fubm90IGJlIGVtcHR5J1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN0cmluZ0xlbmd0aDoge1xuICAgICAgICAgICAgICBtaW46IDMsXG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgc2l0ZW1hcCBpZCBzaG91bGQgYmUgYXRsZWFzdCAzIGNoYXJhY3RlcnMgbG9uZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZWdleHA6IHtcbiAgICAgICAgICAgICAgcmVnZXhwOiAvXlthLXpdW2EtejAtOV8kKCkrXFwtL10rJC8sXG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdPbmx5IGxvd2VyY2FzZSBjaGFyYWN0ZXJzIChhLXopLCBkaWdpdHMgKDAtOSksIG9yIGFueSBvZiB0aGUgY2hhcmFjdGVycyBfLCAkLCAoLCApLCArLCAtLCBhbmQgLyBhcmUgYWxsb3dlZC4gTXVzdCBiZWdpbiB3aXRoIGEgbGV0dGVyLidcbiAgICAgICAgICAgIH0sXG5cdFx0XHRcdFx0XHQvLyBwbGFjZWhvbGRlciBmb3Igc2l0ZW1hcCBpZCBleGlzdGFuY2UgdmFsaWRhdGlvblxuICAgICAgICAgICAgY2FsbGJhY2s6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1NpdGVtYXAgd2l0aCB0aGlzIGlkIGFscmVhZHkgZXhpc3RzJyxcbiAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICh2YWx1ZSwgdmFsaWRhdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgJ3N0YXJ0VXJsW10nOiB7XG4gICAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgICAgbm90RW1wdHk6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSBzdGFydCBVUkwgaXMgcmVxdWlyZWQgYW5kIGNhbm5vdCBiZSBlbXB0eSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1cmk6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSBzdGFydCBVUkwgaXMgbm90IGEgdmFsaWQgVVJMJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIH0sXG5cbiAgc2hvd0NyZWF0ZVNpdGVtYXA6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNldEFjdGl2ZU5hdmlnYXRpb25CdXR0b24oJ2NyZWF0ZS1zaXRlbWFwLWNyZWF0ZScpXG4gICAgdmFyIHNpdGVtYXBGb3JtID0gaWNoLlNpdGVtYXBDcmVhdGUoKVxuICAgIHRoaXMuJCgnI3ZpZXdwb3J0JykuaHRtbChzaXRlbWFwRm9ybSlcbiAgICB0aGlzLmluaXRNdWx0aXBsZVN0YXJ0VXJsSGVscGVyKClcbiAgICB0aGlzLmluaXRTaXRlbWFwVmFsaWRhdGlvbigpXG5cbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGluaXRJbXBvcnRTdGllbWFwVmFsaWRhdGlvbjogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJCgnI3ZpZXdwb3J0IGZvcm0nKS5ib290c3RyYXBWYWxpZGF0b3Ioe1xuICAgICAgZmllbGRzOiB7XG4gICAgICAgICdfaWQnOiB7XG4gICAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgICAgc3RyaW5nTGVuZ3RoOiB7XG4gICAgICAgICAgICAgIG1pbjogMyxcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSBzaXRlbWFwIGlkIHNob3VsZCBiZSBhdGxlYXN0IDMgY2hhcmFjdGVycyBsb25nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJlZ2V4cDoge1xuICAgICAgICAgICAgICByZWdleHA6IC9eW2Etel1bYS16MC05XyQoKStcXC0vXSskLyxcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ09ubHkgbG93ZXJjYXNlIGNoYXJhY3RlcnMgKGEteiksIGRpZ2l0cyAoMC05KSwgb3IgYW55IG9mIHRoZSBjaGFyYWN0ZXJzIF8sICQsICgsICksICssIC0sIGFuZCAvIGFyZSBhbGxvd2VkLiBNdXN0IGJlZ2luIHdpdGggYSBsZXR0ZXIuJ1xuICAgICAgICAgICAgfSxcblx0XHRcdFx0XHRcdC8vIHBsYWNlaG9sZGVyIGZvciBzaXRlbWFwIGlkIGV4aXN0YW5jZSB2YWxpZGF0aW9uXG4gICAgICAgICAgICBjYWxsYmFjazoge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnU2l0ZW1hcCB3aXRoIHRoaXMgaWQgYWxyZWFkeSBleGlzdHMnLFxuICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKHZhbHVlLCB2YWxpZGF0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBzaXRlbWFwSlNPTjoge1xuICAgICAgICAgIHZhbGlkYXRvcnM6IHtcbiAgICAgICAgICAgIG5vdEVtcHR5OiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdTaXRlbWFwIEpTT04gaXMgcmVxdWlyZWQgYW5kIGNhbm5vdCBiZSBlbXB0eSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjYWxsYmFjazoge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnSlNPTiBpcyBub3QgdmFsaWQnLFxuICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKHZhbHVlLCB2YWxpZGF0b3IpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgSlNPTi5wYXJzZSh2YWx1ZSlcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIH0sXG5cbiAgc2hvd0ltcG9ydFNpdGVtYXBQYW5lbDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2V0QWN0aXZlTmF2aWdhdGlvbkJ1dHRvbignY3JlYXRlLXNpdGVtYXAtaW1wb3J0JylcbiAgICB2YXIgc2l0ZW1hcEZvcm0gPSBpY2guU2l0ZW1hcEltcG9ydCgpXG4gICAgdGhpcy4kKCcjdmlld3BvcnQnKS5odG1sKHNpdGVtYXBGb3JtKVxuICAgIHRoaXMuaW5pdEltcG9ydFN0aWVtYXBWYWxpZGF0aW9uKClcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIHNob3dTaXRlbWFwRXhwb3J0UGFuZWw6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNldEFjdGl2ZU5hdmlnYXRpb25CdXR0b24oJ3NpdGVtYXAtZXhwb3J0JylcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICB2YXIgc2l0ZW1hcEpTT04gPSBzaXRlbWFwLmV4cG9ydFNpdGVtYXAoKVxuICAgIHZhciBzaXRlbWFwRXhwb3J0Rm9ybSA9IGljaC5TaXRlbWFwRXhwb3J0KHtcbiAgICAgIHNpdGVtYXBKU09OOiBzaXRlbWFwSlNPTlxuICAgIH0pXG4gICAgdGhpcy4kKCcjdmlld3BvcnQnKS5odG1sKHNpdGVtYXBFeHBvcnRGb3JtKVxuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgc2hvd1NpdGVtYXBzOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5jbGVhclN0YXRlKClcbiAgICB0aGlzLnNldEFjdGl2ZU5hdmlnYXRpb25CdXR0b24oJ3NpdGVtYXBzJylcblxuICAgIHRoaXMuc3RvcmUuZ2V0QWxsU2l0ZW1hcHMoZnVuY3Rpb24gKHNpdGVtYXBzKSB7XG4gICAgICB2YXIgJHNpdGVtYXBMaXN0UGFuZWwgPSBpY2guU2l0ZW1hcExpc3QoKVxuICAgICAgc2l0ZW1hcHMuZm9yRWFjaChmdW5jdGlvbiAoc2l0ZW1hcCkge1xuICAgICAgICB2YXIgJHNpdGVtYXAgPSBpY2guU2l0ZW1hcExpc3RJdGVtKHNpdGVtYXApXG4gICAgICAgICRzaXRlbWFwLmRhdGEoJ3NpdGVtYXAnLCBzaXRlbWFwKVxuICAgICAgICAkc2l0ZW1hcExpc3RQYW5lbC5maW5kKCd0Ym9keScpLmFwcGVuZCgkc2l0ZW1hcClcbiAgICAgIH0pXG4gICAgICB0aGlzLiQoJyN2aWV3cG9ydCcpLmh0bWwoJHNpdGVtYXBMaXN0UGFuZWwpXG4gICAgfSlcbiAgfSxcblxuICBnZXRTaXRlbWFwRnJvbU1ldGFkYXRhRm9ybTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBpZCA9IHRoaXMuJCgnI3ZpZXdwb3J0IGZvcm0gaW5wdXRbbmFtZT1faWRdJykudmFsKClcbiAgICB2YXIgJHN0YXJ0VXJsSW5wdXRzID0gdGhpcy4kKCcjdmlld3BvcnQgZm9ybSAuaW5wdXQtc3RhcnQtdXJsJylcbiAgICB2YXIgc3RhcnRVcmxcbiAgICBpZiAoJHN0YXJ0VXJsSW5wdXRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgc3RhcnRVcmwgPSAkc3RhcnRVcmxJbnB1dHMudmFsKClcbiAgICB9IGVsc2Uge1xuICAgICAgc3RhcnRVcmwgPSBbXVxuICAgICAgJHN0YXJ0VXJsSW5wdXRzLmVhY2goZnVuY3Rpb24gKGksIGVsZW1lbnQpIHtcbiAgICAgICAgc3RhcnRVcmwucHVzaCh0aGlzLiQoZWxlbWVudCkudmFsKCkpXG4gICAgICB9KVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBpZDogaWQsXG4gICAgICBzdGFydFVybDogc3RhcnRVcmxcbiAgICB9XG4gIH0sXG5cbiAgY3JlYXRlU2l0ZW1hcDogZnVuY3Rpb24gKGZvcm0pIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuXHRcdC8vIGNhbmNlbCBzdWJtaXQgaWYgaW52YWxpZCBmb3JtXG4gICAgaWYgKCF0aGlzLmlzVmFsaWRGb3JtKCkpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cblxuICAgIHZhciBzaXRlbWFwRGF0YSA9IHRoaXMuZ2V0U2l0ZW1hcEZyb21NZXRhZGF0YUZvcm0oKVxuXG5cdFx0Ly8gY2hlY2sgd2hldGhlciBzaXRlbWFwIHdpdGggdGhpcyBpZCBhbHJlYWR5IGV4aXN0XG4gICAgdGhpcy5zdG9yZS5zaXRlbWFwRXhpc3RzKHNpdGVtYXBEYXRhLmlkLCBmdW5jdGlvbiAoc2l0ZW1hcEV4aXN0cykge1xuICAgICAgaWYgKHNpdGVtYXBFeGlzdHMpIHtcbiAgICAgICAgdmFyIHZhbGlkYXRvciA9IHRoaXMuZ2V0Rm9ybVZhbGlkYXRvcigpXG4gICAgICAgIHZhbGlkYXRvci51cGRhdGVTdGF0dXMoJ19pZCcsICdJTlZBTElEJywgJ2NhbGxiYWNrJylcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBzaXRlbWFwID0gbmV3IFNpdGVtYXAoe1xuICAgICAgICAgIF9pZDogc2l0ZW1hcERhdGEuaWQsXG4gICAgICAgICAgc3RhcnRVcmw6IHNpdGVtYXBEYXRhLnN0YXJ0VXJsLFxuICAgICAgICAgIHNlbGVjdG9yczogW11cbiAgICAgICAgfSwgeyR9KVxuICAgICAgICB0aGlzLnN0b3JlLmNyZWF0ZVNpdGVtYXAoc2l0ZW1hcCwgZnVuY3Rpb24gKHNpdGVtYXApIHtcbiAgICAgICAgICB0aGlzLl9lZGl0U2l0ZW1hcChzaXRlbWFwLCBbJ19yb290J10pXG4gICAgICAgIH0uYmluZCh0aGlzLCBzaXRlbWFwKSlcbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG5cbiAgaW1wb3J0U2l0ZW1hcDogZnVuY3Rpb24gKCkge1xuICAgIHZhciAkID0gdGhpcy4kXG5cdFx0Ly8gY2FuY2VsIHN1Ym1pdCBpZiBpbnZhbGlkIGZvcm1cbiAgICBpZiAoIXRoaXMuaXNWYWxpZEZvcm0oKSkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG5cdFx0Ly8gbG9hZCBkYXRhIGZyb20gZm9ybVxuICAgIHZhciBzaXRlbWFwSlNPTiA9IHRoaXMuJCgnW25hbWU9c2l0ZW1hcEpTT05dJykudmFsKClcbiAgICB2YXIgaWQgPSB0aGlzLiQoJ2lucHV0W25hbWU9X2lkXScpLnZhbCgpXG4gICAgdmFyIHNpdGVtYXAgPSBuZXcgU2l0ZW1hcChudWxsLCB7JH0pXG4gICAgc2l0ZW1hcC5pbXBvcnRTaXRlbWFwKHNpdGVtYXBKU09OKVxuICAgIGlmIChpZC5sZW5ndGgpIHtcbiAgICAgIHNpdGVtYXAuX2lkID0gaWRcbiAgICB9XG5cdFx0Ly8gY2hlY2sgd2hldGhlciBzaXRlbWFwIHdpdGggdGhpcyBpZCBhbHJlYWR5IGV4aXN0XG4gICAgdGhpcy5zdG9yZS5zaXRlbWFwRXhpc3RzKHNpdGVtYXAuX2lkLCBmdW5jdGlvbiAoc2l0ZW1hcEV4aXN0cykge1xuICAgICAgaWYgKHNpdGVtYXBFeGlzdHMpIHtcbiAgICAgICAgdmFyIHZhbGlkYXRvciA9IHRoaXMuZ2V0Rm9ybVZhbGlkYXRvcigpXG4gICAgICAgIHZhbGlkYXRvci51cGRhdGVTdGF0dXMoJ19pZCcsICdJTlZBTElEJywgJ2NhbGxiYWNrJylcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuc3RvcmUuY3JlYXRlU2l0ZW1hcChzaXRlbWFwLCBmdW5jdGlvbiAoc2l0ZW1hcCkge1xuICAgICAgICAgIHRoaXMuX2VkaXRTaXRlbWFwKHNpdGVtYXAsIFsnX3Jvb3QnXSlcbiAgICAgICAgfS5iaW5kKHRoaXMsIHNpdGVtYXApKVxuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcblxuICBlZGl0U2l0ZW1hcE1ldGFkYXRhOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdGhpcy5zZXRBY3RpdmVOYXZpZ2F0aW9uQnV0dG9uKCdzaXRlbWFwLWVkaXQtbWV0YWRhdGEnKVxuXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgdmFyICRzaXRlbWFwTWV0YWRhdGFGb3JtID0gaWNoLlNpdGVtYXBFZGl0TWV0YWRhdGEoc2l0ZW1hcClcbiAgICB0aGlzLiQoJyN2aWV3cG9ydCcpLmh0bWwoJHNpdGVtYXBNZXRhZGF0YUZvcm0pXG4gICAgdGhpcy5pbml0TXVsdGlwbGVTdGFydFVybEhlbHBlcigpXG4gICAgdGhpcy5pbml0U2l0ZW1hcFZhbGlkYXRpb24oKVxuXG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBlZGl0U2l0ZW1hcE1ldGFkYXRhU2F2ZTogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgdmFyIHNpdGVtYXBEYXRhID0gdGhpcy5nZXRTaXRlbWFwRnJvbU1ldGFkYXRhRm9ybSgpXG5cblx0XHQvLyBjYW5jZWwgc3VibWl0IGlmIGludmFsaWQgZm9ybVxuICAgIGlmICghdGhpcy5pc1ZhbGlkRm9ybSgpKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cblx0XHQvLyBjaGVjayB3aGV0aGVyIHNpdGVtYXAgd2l0aCB0aGlzIGlkIGFscmVhZHkgZXhpc3RcbiAgICB0aGlzLnN0b3JlLnNpdGVtYXBFeGlzdHMoc2l0ZW1hcERhdGEuaWQsIGZ1bmN0aW9uIChzaXRlbWFwRXhpc3RzKSB7XG4gICAgICBpZiAoc2l0ZW1hcC5faWQgIT09IHNpdGVtYXBEYXRhLmlkICYmIHNpdGVtYXBFeGlzdHMpIHtcbiAgICAgICAgdmFyIHZhbGlkYXRvciA9IHRoaXMuZ2V0Rm9ybVZhbGlkYXRvcigpXG4gICAgICAgIHZhbGlkYXRvci51cGRhdGVTdGF0dXMoJ19pZCcsICdJTlZBTElEJywgJ2NhbGxiYWNrJylcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cblx0XHRcdC8vIGNoYW5nZSBkYXRhXG4gICAgICBzaXRlbWFwLnN0YXJ0VXJsID0gc2l0ZW1hcERhdGEuc3RhcnRVcmxcblxuXHRcdFx0Ly8ganVzdCBjaGFuZ2Ugc2l0ZW1hcHMgdXJsXG4gICAgICBpZiAoc2l0ZW1hcERhdGEuaWQgPT09IHNpdGVtYXAuX2lkKSB7XG4gICAgICAgIHRoaXMuc3RvcmUuc2F2ZVNpdGVtYXAoc2l0ZW1hcCwgZnVuY3Rpb24gKHNpdGVtYXApIHtcbiAgICAgICAgICB0aGlzLnNob3dTaXRlbWFwU2VsZWN0b3JMaXN0KClcbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gaWQgY2hhbmdlZC4gd2UgbmVlZCB0byBkZWxldGUgdGhlIG9sZCBvbmUgYW5kIGNyZWF0ZSBhIG5ldyBvbmVcbiAgICAgICAgdmFyIG5ld1NpdGVtYXAgPSBuZXcgU2l0ZW1hcChzaXRlbWFwLCB7JH0pXG4gICAgICAgIHZhciBvbGRTaXRlbWFwID0gc2l0ZW1hcFxuICAgICAgICBuZXdTaXRlbWFwLl9pZCA9IHNpdGVtYXBEYXRhLmlkXG4gICAgICAgIHRoaXMuc3RvcmUuY3JlYXRlU2l0ZW1hcChuZXdTaXRlbWFwLCBmdW5jdGlvbiAobmV3U2l0ZW1hcCkge1xuICAgICAgICAgIHRoaXMuc3RvcmUuZGVsZXRlU2l0ZW1hcChvbGRTaXRlbWFwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwID0gbmV3U2l0ZW1hcFxuICAgICAgICAgICAgdGhpcy5zaG93U2l0ZW1hcFNlbGVjdG9yTGlzdCgpXG4gICAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBDYWxsYmFjayB3aGVuIHNpdGVtYXAgZWRpdCBidXR0b24gaXMgY2xpY2tlZCBpbiBzaXRlbWFwIGdyaWRcblx0ICovXG4gIGVkaXRTaXRlbWFwOiBmdW5jdGlvbiAodHIpIHtcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuJCh0cikuZGF0YSgnc2l0ZW1hcCcpXG4gICAgdGhpcy5fZWRpdFNpdGVtYXAoc2l0ZW1hcClcbiAgfSxcbiAgX2VkaXRTaXRlbWFwOiBmdW5jdGlvbiAoc2l0ZW1hcCkge1xuICAgIHRoaXMuc2V0U3RhdGVFZGl0U2l0ZW1hcChzaXRlbWFwKVxuICAgIHRoaXMuc2V0QWN0aXZlTmF2aWdhdGlvbkJ1dHRvbignc2l0ZW1hcCcpXG5cbiAgICB0aGlzLnNob3dTaXRlbWFwU2VsZWN0b3JMaXN0KClcbiAgfSxcbiAgc2hvd1NpdGVtYXBTZWxlY3Rvckxpc3Q6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNldEFjdGl2ZU5hdmlnYXRpb25CdXR0b24oJ3NpdGVtYXAtc2VsZWN0b3ItbGlzdCcpXG5cbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICB2YXIgcGFyZW50U2VsZWN0b3JzID0gdGhpcy5zdGF0ZS5lZGl0U2l0ZW1hcEJyZWFkY3VtYnNTZWxlY3RvcnNcbiAgICB2YXIgcGFyZW50U2VsZWN0b3JJZCA9IHRoaXMuc3RhdGUuY3VycmVudFBhcmVudFNlbGVjdG9ySWRcblxuICAgIHZhciAkc2VsZWN0b3JMaXN0UGFuZWwgPSBpY2guU2VsZWN0b3JMaXN0KHtcbiAgICAgIHBhcmVudFNlbGVjdG9yczogcGFyZW50U2VsZWN0b3JzXG4gICAgfSlcbiAgICB2YXIgc2VsZWN0b3JzID0gc2l0ZW1hcC5nZXREaXJlY3RDaGlsZFNlbGVjdG9ycyhwYXJlbnRTZWxlY3RvcklkKVxuICAgIHNlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgdmFyICRzZWxlY3RvciA9IGljaC5TZWxlY3Rvckxpc3RJdGVtKHNlbGVjdG9yKVxuICAgICAgJHNlbGVjdG9yLmRhdGEoJ3NlbGVjdG9yJywgc2VsZWN0b3IpXG4gICAgICAkc2VsZWN0b3JMaXN0UGFuZWwuZmluZCgndGJvZHknKS5hcHBlbmQoJHNlbGVjdG9yKVxuICAgIH0pXG4gICAgdGhpcy4kKCcjdmlld3BvcnQnKS5odG1sKCRzZWxlY3Rvckxpc3RQYW5lbClcblxuICAgIHJldHVybiB0cnVlXG4gIH0sIC8qXG4gIHNob3dTaXRlbWFwU2VsZWN0b3JHcmFwaDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2V0QWN0aXZlTmF2aWdhdGlvbkJ1dHRvbignc2l0ZW1hcC1zZWxlY3Rvci1ncmFwaCcpXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgdmFyICRzZWxlY3RvckdyYXBoUGFuZWwgPSBpY2guU2l0ZW1hcFNlbGVjdG9yR3JhcGgoKVxuICAgICQoJyN2aWV3cG9ydCcpLmh0bWwoJHNlbGVjdG9yR3JhcGhQYW5lbClcbiAgICB2YXIgZ3JhcGhEaXYgPSAkKCcjc2VsZWN0b3ItZ3JhcGgnKVswXVxuICAgIHZhciBncmFwaCA9IG5ldyBTZWxlY3RvckdyYXBodjIoc2l0ZW1hcClcbiAgICBncmFwaC5kcmF3KGdyYXBoRGl2LCAkKGRvY3VtZW50KS53aWR0aCgpLCAyMDApXG4gICAgcmV0dXJuIHRydWVcbiAgfSwgKi9cbiAgc2hvd0NoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAodHIpIHtcbiAgICB2YXIgc2VsZWN0b3IgPSB0aGlzLiQodHIpLmRhdGEoJ3NlbGVjdG9yJylcbiAgICB2YXIgcGFyZW50U2VsZWN0b3JzID0gdGhpcy5zdGF0ZS5lZGl0U2l0ZW1hcEJyZWFkY3VtYnNTZWxlY3RvcnNcbiAgICB0aGlzLnN0YXRlLmN1cnJlbnRQYXJlbnRTZWxlY3RvcklkID0gc2VsZWN0b3IuaWRcbiAgICBwYXJlbnRTZWxlY3RvcnMucHVzaChzZWxlY3RvcilcblxuICAgIHRoaXMuc2hvd1NpdGVtYXBTZWxlY3Rvckxpc3QoKVxuICB9LFxuXG4gIHRyZWVOYXZpZ2F0aW9uc2hvd1NpdGVtYXBTZWxlY3Rvckxpc3Q6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgcGFyZW50U2VsZWN0b3JzID0gdGhpcy5zdGF0ZS5lZGl0U2l0ZW1hcEJyZWFkY3VtYnNTZWxlY3RvcnNcbiAgICB2YXIgY29udHJvbGxlciA9IHRoaXNcbiAgICB0aGlzLiQoJyNzZWxlY3Rvci10cmVlIC5icmVhZGNydW1iIGxpIGEnKS5lYWNoKGZ1bmN0aW9uIChpLCBwYXJlbnRTZWxlY3RvckJ1dHRvbikge1xuICAgICAgaWYgKHBhcmVudFNlbGVjdG9yQnV0dG9uID09PSBidXR0b24pIHtcbiAgICAgICAgcGFyZW50U2VsZWN0b3JzLnNwbGljZShpICsgMSlcbiAgICAgICAgY29udHJvbGxlci5zdGF0ZS5jdXJyZW50UGFyZW50U2VsZWN0b3JJZCA9IHBhcmVudFNlbGVjdG9yc1tpXS5pZFxuICAgICAgfVxuICAgIH0pXG4gICAgdGhpcy5zaG93U2l0ZW1hcFNlbGVjdG9yTGlzdCgpXG4gIH0sXG5cbiAgaW5pdFNlbGVjdG9yVmFsaWRhdGlvbjogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJCgnI3ZpZXdwb3J0IGZvcm0nKS5ib290c3RyYXBWYWxpZGF0b3Ioe1xuICAgICAgZmllbGRzOiB7XG4gICAgICAgICdpZCc6IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBub3RFbXB0eToge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnU2l0ZW1hcCBpZCByZXF1aXJlZCBhbmQgY2Fubm90IGJlIGVtcHR5J1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN0cmluZ0xlbmd0aDoge1xuICAgICAgICAgICAgICBtaW46IDMsXG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgc2l0ZW1hcCBpZCBzaG91bGQgYmUgYXRsZWFzdCAzIGNoYXJhY3RlcnMgbG9uZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZWdleHA6IHtcbiAgICAgICAgICAgICAgcmVnZXhwOiAvXlteX10uKiQvLFxuICAgICAgICAgICAgICBtZXNzYWdlOiAnU2VsZWN0b3IgaWQgY2Fubm90IHN0YXJ0IHdpdGggYW4gdW5kZXJzY29yZSBfJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc2VsZWN0b3I6IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBub3RFbXB0eToge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnU2VsZWN0b3IgaXMgcmVxdWlyZWQgYW5kIGNhbm5vdCBiZSBlbXB0eSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHJlZ2V4OiB7XG4gICAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgICAgY2FsbGJhY2s6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ0phdmFTY3JpcHQgZG9lcyBub3Qgc3VwcG9ydCByZWd1bGFyIGV4cHJlc3Npb25zIHRoYXQgY2FuIG1hdGNoIDAgY2hhcmFjdGVycy4nLFxuICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKHZhbHVlLCB2YWxpZGF0b3IpIHtcblx0XHRcdFx0XHRcdFx0XHQvLyBhbGxvdyBubyByZWdleFxuICAgICAgICAgICAgICAgIGlmICghdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIG1hdGNoZXMgPSAnJy5tYXRjaChuZXcgUmVnRXhwKHZhbHVlKSlcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2hlcyAhPT0gbnVsbCAmJiBtYXRjaGVzWzBdID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBjbGlja0VsZW1lbnRTZWxlY3Rvcjoge1xuICAgICAgICAgIHZhbGlkYXRvcnM6IHtcbiAgICAgICAgICAgIG5vdEVtcHR5OiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdDbGljayBzZWxlY3RvciBpcyByZXF1aXJlZCBhbmQgY2Fubm90IGJlIGVtcHR5J1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgdGFibGVIZWFkZXJSb3dTZWxlY3Rvcjoge1xuICAgICAgICAgIHZhbGlkYXRvcnM6IHtcbiAgICAgICAgICAgIG5vdEVtcHR5OiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdIZWFkZXIgcm93IHNlbGVjdG9yIGlzIHJlcXVpcmVkIGFuZCBjYW5ub3QgYmUgZW1wdHknXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB0YWJsZURhdGFSb3dTZWxlY3Rvcjoge1xuICAgICAgICAgIHZhbGlkYXRvcnM6IHtcbiAgICAgICAgICAgIG5vdEVtcHR5OiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdEYXRhIHJvdyBzZWxlY3RvciBpcyByZXF1aXJlZCBhbmQgY2Fubm90IGJlIGVtcHR5J1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBudW1lcmljOiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdEZWxheSBtdXN0IGJlIG51bWVyaWMnXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBwYXJlbnRTZWxlY3RvcnM6IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBub3RFbXB0eToge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnWW91IG11c3QgY2hvb3NlIGF0IGxlYXN0IG9uZSBwYXJlbnQgc2VsZWN0b3InXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2FsbGJhY2s6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ0Nhbm5vdCBoYW5kbGUgcmVjdXJzaXZlIGVsZW1lbnQgc2VsZWN0b3JzJyxcbiAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICh2YWx1ZSwgdmFsaWRhdG9yLCAkZmllbGQpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3JTaXRlbWFwKClcbiAgICAgICAgICAgICAgICByZXR1cm4gIXNpdGVtYXAuc2VsZWN0b3JzLmhhc1JlY3Vyc2l2ZUVsZW1lbnRTZWxlY3RvcnMoKVxuICAgICAgICAgICAgICB9LmJpbmQodGhpcylcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICB9LFxuICBlZGl0U2VsZWN0b3I6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgc2VsZWN0b3IgPSB0aGlzLiQoYnV0dG9uKS5jbG9zZXN0KCd0cicpLmRhdGEoJ3NlbGVjdG9yJylcbiAgICB0aGlzLl9lZGl0U2VsZWN0b3Ioc2VsZWN0b3IpXG4gIH0sXG4gIHVwZGF0ZVNlbGVjdG9yUGFyZW50TGlzdE9uSWRDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZWN0b3IgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yKClcbiAgICB0aGlzLiQoJy5jdXJyZW50bHktZWRpdGVkJykudmFsKHNlbGVjdG9yLmlkKS50ZXh0KHNlbGVjdG9yLmlkKVxuICB9LFxuICBfZWRpdFNlbGVjdG9yOiBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICB2YXIgc2VsZWN0b3JJZHMgPSBzaXRlbWFwLmdldFBvc3NpYmxlUGFyZW50U2VsZWN0b3JJZHMoKVxuXG4gICAgdmFyICRlZGl0U2VsZWN0b3JGb3JtID0gaWNoLlNlbGVjdG9yRWRpdCh7XG4gICAgICBzZWxlY3Rvcjogc2VsZWN0b3IsXG4gICAgICBzZWxlY3Rvcklkczogc2VsZWN0b3JJZHMsXG4gICAgICBzZWxlY3RvclR5cGVzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnU2VsZWN0b3JUZXh0JyxcbiAgICAgICAgICB0aXRsZTogJ1RleHQnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnU2VsZWN0b3JMaW5rJyxcbiAgICAgICAgICB0aXRsZTogJ0xpbmsnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnU2VsZWN0b3JQb3B1cExpbmsnLFxuICAgICAgICAgIHRpdGxlOiAnUG9wdXAgTGluaydcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6ICdTZWxlY3RvckltYWdlJyxcbiAgICAgICAgICB0aXRsZTogJ0ltYWdlJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ1NlbGVjdG9yVGFibGUnLFxuICAgICAgICAgIHRpdGxlOiAnVGFibGUnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnU2VsZWN0b3JFbGVtZW50QXR0cmlidXRlJyxcbiAgICAgICAgICB0aXRsZTogJ0VsZW1lbnQgYXR0cmlidXRlJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ1NlbGVjdG9ySFRNTCcsXG4gICAgICAgICAgdGl0bGU6ICdIVE1MJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ1NlbGVjdG9yRWxlbWVudCcsXG4gICAgICAgICAgdGl0bGU6ICdFbGVtZW50J1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ1NlbGVjdG9yRWxlbWVudFNjcm9sbCcsXG4gICAgICAgICAgdGl0bGU6ICdFbGVtZW50IHNjcm9sbCBkb3duJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ1NlbGVjdG9yRWxlbWVudENsaWNrJyxcbiAgICAgICAgICB0aXRsZTogJ0VsZW1lbnQgY2xpY2snXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnU2VsZWN0b3JHcm91cCcsXG4gICAgICAgICAgdGl0bGU6ICdHcm91cGVkJ1xuICAgICAgICB9XG4gICAgICBdXG4gICAgfSlcbiAgICB0aGlzLiQoJyN2aWV3cG9ydCcpLmh0bWwoJGVkaXRTZWxlY3RvckZvcm0pXG5cdFx0Ly8gbWFyayBpbml0aWFsbHkgb3BlbmVkIHNlbGVjdG9yIGFzIGN1cnJlbnRseSBlZGl0ZWRcbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yICNwYXJlbnRTZWxlY3RvcnMgb3B0aW9uJykuZWFjaChmdW5jdGlvbiAoaSwgZWxlbWVudCkge1xuICAgICAgaWYgKHNlbGYuJChlbGVtZW50KS52YWwoKSA9PT0gc2VsZWN0b3IuaWQpIHtcbiAgICAgICAgc2VsZi4kKGVsZW1lbnQpLmFkZENsYXNzKCdjdXJyZW50bHktZWRpdGVkJylcbiAgICAgIH1cbiAgICB9KVxuXG5cdFx0Ly8gc2V0IGNsaWNrVHlwZVxuICAgIGlmIChzZWxlY3Rvci5jbGlja1R5cGUpIHtcbiAgICAgICRlZGl0U2VsZWN0b3JGb3JtLmZpbmQoJ1tuYW1lPWNsaWNrVHlwZV0nKS52YWwoc2VsZWN0b3IuY2xpY2tUeXBlKVxuICAgIH1cblx0XHQvLyBzZXQgY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGVcbiAgICBpZiAoc2VsZWN0b3IuY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUpIHtcbiAgICAgICRlZGl0U2VsZWN0b3JGb3JtLmZpbmQoJ1tuYW1lPWNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlXScpLnZhbChzZWxlY3Rvci5jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSlcbiAgICB9XG5cblx0XHQvLyBoYW5kbGUgc2VsZWN0cyBzZXBlcmF0ZWx5XG4gICAgJGVkaXRTZWxlY3RvckZvcm0uZmluZCgnW25hbWU9dHlwZV0nKS52YWwoc2VsZWN0b3IudHlwZSlcbiAgICBzZWxlY3Rvci5wYXJlbnRTZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAocGFyZW50U2VsZWN0b3JJZCkge1xuICAgICAgJGVkaXRTZWxlY3RvckZvcm0uZmluZChcIiNwYXJlbnRTZWxlY3RvcnMgW3ZhbHVlPSdcIiArIHBhcmVudFNlbGVjdG9ySWQgKyBcIiddXCIpLmF0dHIoJ3NlbGVjdGVkJywgJ3NlbGVjdGVkJylcbiAgICB9KVxuXG4gICAgdGhpcy5zdGF0ZS5jdXJyZW50U2VsZWN0b3IgPSBzZWxlY3RvclxuICAgIHRoaXMuc2VsZWN0b3JUeXBlQ2hhbmdlZCgpXG4gICAgdGhpcy5pbml0U2VsZWN0b3JWYWxpZGF0aW9uKClcbiAgfSxcbiAgc2VsZWN0b3JUeXBlQ2hhbmdlZDogZnVuY3Rpb24gKCkge1xuICAgIHZhciB0eXBlID0gdGhpcy4kKCcjZWRpdC1zZWxlY3RvciBzZWxlY3RbbmFtZT10eXBlXScpLnZhbCgpXG4gICAgdmFyIGZlYXR1cmVzID0gc2VsZWN0b3JzW3R5cGVdLmdldEZlYXR1cmVzKClcbiAgICB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIC5mZWF0dXJlJykuaGlkZSgpXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgZmVhdHVyZXMuZm9yRWFjaChmdW5jdGlvbiAoZmVhdHVyZSkge1xuICAgICAgc2VsZi4kKCcjZWRpdC1zZWxlY3RvciAuZmVhdHVyZS0nICsgZmVhdHVyZSkuc2hvdygpXG4gICAgfSlcblxuXHRcdC8vIGFkZCB0aGlzIHNlbGVjdG9yIHRvIHBvc3NpYmxlIHBhcmVudCBzZWxlY3RvclxuICAgIHZhciBzZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3IoKVxuICAgIGlmIChzZWxlY3Rvci5jYW5IYXZlQ2hpbGRTZWxlY3RvcnMoKSkge1xuICAgICAgaWYgKHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgI3BhcmVudFNlbGVjdG9ycyAuY3VycmVudGx5LWVkaXRlZCcpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB2YXIgJG9wdGlvbiA9IHRoaXMuJCgnPG9wdGlvbiBjbGFzcz1cImN1cnJlbnRseS1lZGl0ZWRcIj48L29wdGlvbj4nKVxuICAgICAgICAkb3B0aW9uLnRleHQoc2VsZWN0b3IuaWQpLnZhbChzZWxlY3Rvci5pZClcbiAgICAgICAgdGhpcy4kKCcjZWRpdC1zZWxlY3RvciAjcGFyZW50U2VsZWN0b3JzJykuYXBwZW5kKCRvcHRpb24pXG4gICAgICB9XG4gICAgfSBlbHNlIHtcblx0XHQvLyByZW1vdmUgaWYgdHlwZSBkb2Vzbid0IGFsbG93IHRvIGhhdmUgY2hpbGQgc2VsZWN0b3JzXG4gICAgICB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yICNwYXJlbnRTZWxlY3RvcnMgLmN1cnJlbnRseS1lZGl0ZWQnKS5yZW1vdmUoKVxuICAgIH1cbiAgfSxcbiAgc2F2ZVNlbGVjdG9yOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgdmFyIHNlbGVjdG9yID0gdGhpcy5zdGF0ZS5jdXJyZW50U2VsZWN0b3JcbiAgICB2YXIgbmV3U2VsZWN0b3IgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yKClcblxuXHRcdC8vIGNhbmNlbCBzdWJtaXQgaWYgaW52YWxpZCBmb3JtXG4gICAgaWYgKCF0aGlzLmlzVmFsaWRGb3JtKCkpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cblxuXHRcdC8vIGNhbmNlbCBwb3NzaWJsZSBlbGVtZW50IHNlbGVjdGlvblxuICAgIHRoaXMuY29udGVudFNjcmlwdC5yZW1vdmVDdXJyZW50Q29udGVudFNlbGVjdG9yKCkuZG9uZShmdW5jdGlvbiAoKSB7XG4gICAgICBzaXRlbWFwLnVwZGF0ZVNlbGVjdG9yKHNlbGVjdG9yLCBuZXdTZWxlY3RvcilcblxuICAgICAgdGhpcy5zdG9yZS5zYXZlU2l0ZW1hcChzaXRlbWFwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuc2hvd1NpdGVtYXBTZWxlY3Rvckxpc3QoKVxuICAgICAgfS5iaW5kKHRoaXMpKVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcblx0LyoqXG5cdCAqIEdldCBzZWxlY3RvciBmcm9tIHNlbGVjdG9yIGVkaXRpbmcgZm9ybVxuXHQgKi9cbiAgZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaWQgPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPWlkXScpLnZhbCgpXG4gICAgdmFyIHNlbGVjdG9yc1NlbGVjdG9yID0gdGhpcy4kKCcjZWRpdC1zZWxlY3RvciBbbmFtZT1zZWxlY3Rvcl0nKS52YWwoKVxuICAgIHZhciB0YWJsZURhdGFSb3dTZWxlY3RvciA9IHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9dGFibGVEYXRhUm93U2VsZWN0b3JdJykudmFsKClcbiAgICB2YXIgdGFibGVIZWFkZXJSb3dTZWxlY3RvciA9IHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9dGFibGVIZWFkZXJSb3dTZWxlY3Rvcl0nKS52YWwoKVxuICAgIHZhciBjbGlja0VsZW1lbnRTZWxlY3RvciA9IHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9Y2xpY2tFbGVtZW50U2VsZWN0b3JdJykudmFsKClcbiAgICB2YXIgdHlwZSA9IHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9dHlwZV0nKS52YWwoKVxuICAgIHZhciBjbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSA9IHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9Y2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGVdJykudmFsKClcbiAgICB2YXIgY2xpY2tUeXBlID0gdGhpcy4kKCcjZWRpdC1zZWxlY3RvciBbbmFtZT1jbGlja1R5cGVdJykudmFsKClcbiAgICB2YXIgZGlzY2FyZEluaXRpYWxFbGVtZW50cyA9IHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9ZGlzY2FyZEluaXRpYWxFbGVtZW50c10nKS5pcygnOmNoZWNrZWQnKVxuICAgIHZhciBtdWx0aXBsZSA9IHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9bXVsdGlwbGVdJykuaXMoJzpjaGVja2VkJylcbiAgICB2YXIgZG93bmxvYWRJbWFnZSA9IHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9ZG93bmxvYWRJbWFnZV0nKS5pcygnOmNoZWNrZWQnKVxuICAgIHZhciBjbGlja1BvcHVwID0gdGhpcy4kKCcjZWRpdC1zZWxlY3RvciBbbmFtZT1jbGlja1BvcHVwXScpLmlzKCc6Y2hlY2tlZCcpXG4gICAgdmFyIHJlZ2V4ID0gdGhpcy4kKCcjZWRpdC1zZWxlY3RvciBbbmFtZT1yZWdleF0nKS52YWwoKVxuICAgIHZhciBkZWxheSA9IHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9ZGVsYXldJykudmFsKClcbiAgICB2YXIgZXh0cmFjdEF0dHJpYnV0ZSA9IHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9ZXh0cmFjdEF0dHJpYnV0ZV0nKS52YWwoKVxuICAgIHZhciBwYXJlbnRTZWxlY3RvcnMgPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPXBhcmVudFNlbGVjdG9yc10nKS52YWwoKVxuICAgIHZhciBjb2x1bW5zID0gW11cbiAgICB2YXIgJGNvbHVtbkhlYWRlcnMgPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIC5jb2x1bW4taGVhZGVyJylcbiAgICB2YXIgJGNvbHVtbk5hbWVzID0gdGhpcy4kKCcjZWRpdC1zZWxlY3RvciAuY29sdW1uLW5hbWUnKVxuICAgIHZhciAkY29sdW1uRXh0cmFjdHMgPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIC5jb2x1bW4tZXh0cmFjdCcpXG5cbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICAkY29sdW1uSGVhZGVycy5lYWNoKGZ1bmN0aW9uIChpKSB7XG4gICAgICB2YXIgaGVhZGVyID0gc2VsZi4kKCRjb2x1bW5IZWFkZXJzW2ldKS52YWwoKVxuICAgICAgdmFyIG5hbWUgPSBzZWxmLiQoJGNvbHVtbk5hbWVzW2ldKS52YWwoKVxuICAgICAgdmFyIGV4dHJhY3QgPSBzZWxmLiQoJGNvbHVtbkV4dHJhY3RzW2ldKS5pcygnOmNoZWNrZWQnKVxuICAgICAgY29sdW1ucy5wdXNoKHtcbiAgICAgICAgaGVhZGVyOiBoZWFkZXIsXG4gICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgIGV4dHJhY3Q6IGV4dHJhY3RcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIHZhciBuZXdTZWxlY3RvciA9IG5ldyBTZWxlY3Rvcih7XG4gICAgICBpZDogaWQsXG4gICAgICBzZWxlY3Rvcjogc2VsZWN0b3JzU2VsZWN0b3IsXG4gICAgICB0YWJsZUhlYWRlclJvd1NlbGVjdG9yOiB0YWJsZUhlYWRlclJvd1NlbGVjdG9yLFxuICAgICAgdGFibGVEYXRhUm93U2VsZWN0b3I6IHRhYmxlRGF0YVJvd1NlbGVjdG9yLFxuICAgICAgY2xpY2tFbGVtZW50U2VsZWN0b3I6IGNsaWNrRWxlbWVudFNlbGVjdG9yLFxuICAgICAgY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGU6IGNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlLFxuICAgICAgY2xpY2tUeXBlOiBjbGlja1R5cGUsXG4gICAgICBkaXNjYXJkSW5pdGlhbEVsZW1lbnRzOiBkaXNjYXJkSW5pdGlhbEVsZW1lbnRzLFxuICAgICAgdHlwZTogdHlwZSxcbiAgICAgIG11bHRpcGxlOiBtdWx0aXBsZSxcbiAgICAgIGRvd25sb2FkSW1hZ2U6IGRvd25sb2FkSW1hZ2UsXG4gICAgICBjbGlja1BvcHVwOiBjbGlja1BvcHVwLFxuICAgICAgcmVnZXg6IHJlZ2V4LFxuICAgICAgZXh0cmFjdEF0dHJpYnV0ZTogZXh0cmFjdEF0dHJpYnV0ZSxcbiAgICAgIHBhcmVudFNlbGVjdG9yczogcGFyZW50U2VsZWN0b3JzLFxuICAgICAgY29sdW1uczogY29sdW1ucyxcbiAgICAgIGRlbGF5OiBkZWxheVxuICAgIH0sIHtcbiAgICAgICQ6IHRoaXMuJFxuICAgIH0pXG4gICAgcmV0dXJuIG5ld1NlbGVjdG9yXG4gIH0sXG5cdC8qKlxuXHQgKiBAcmV0dXJucyB7U2l0ZW1hcHwqfSBDbG9uZWQgU2l0ZW1hcCB3aXRoIGN1cnJlbnRseSBlZGl0ZWQgc2VsZWN0b3Jcblx0ICovXG4gIGdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yU2l0ZW1hcDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcC5jbG9uZSgpXG4gICAgdmFyIHNlbGVjdG9yID0gc2l0ZW1hcC5nZXRTZWxlY3RvckJ5SWQodGhpcy5zdGF0ZS5jdXJyZW50U2VsZWN0b3IuaWQpXG4gICAgdmFyIG5ld1NlbGVjdG9yID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvcigpXG4gICAgc2l0ZW1hcC51cGRhdGVTZWxlY3RvcihzZWxlY3RvciwgbmV3U2VsZWN0b3IpXG4gICAgcmV0dXJuIHNpdGVtYXBcbiAgfSxcbiAgY2FuY2VsU2VsZWN0b3JFZGl0aW5nOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG5cdFx0Ly8gY2FuY2VsIHBvc3NpYmxlIGVsZW1lbnQgc2VsZWN0aW9uXG4gICAgdGhpcy5jb250ZW50U2NyaXB0LnJlbW92ZUN1cnJlbnRDb250ZW50U2VsZWN0b3IoKS5kb25lKGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuc2hvd1NpdGVtYXBTZWxlY3Rvckxpc3QoKVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcbiAgYWRkU2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcGFyZW50U2VsZWN0b3JJZCA9IHRoaXMuc3RhdGUuY3VycmVudFBhcmVudFNlbGVjdG9ySWRcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcblxuICAgIHZhciBzZWxlY3RvciA9IG5ldyBTZWxlY3Rvcih7XG4gICAgICBwYXJlbnRTZWxlY3RvcnM6IFtwYXJlbnRTZWxlY3RvcklkXSxcbiAgICAgIHR5cGU6ICdTZWxlY3RvclRleHQnLFxuICAgICAgbXVsdGlwbGU6IGZhbHNlXG4gICAgfSwgeyQ6IHRoaXMuJH0pXG5cbiAgICB0aGlzLl9lZGl0U2VsZWN0b3Ioc2VsZWN0b3IsIHNpdGVtYXApXG4gIH0sXG4gIGRlbGV0ZVNlbGVjdG9yOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgdmFyIHNlbGVjdG9yID0gdGhpcy4kKGJ1dHRvbikuY2xvc2VzdCgndHInKS5kYXRhKCdzZWxlY3RvcicpXG4gICAgc2l0ZW1hcC5kZWxldGVTZWxlY3RvcihzZWxlY3RvcilcblxuICAgIHRoaXMuc3RvcmUuc2F2ZVNpdGVtYXAoc2l0ZW1hcCwgZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5zaG93U2l0ZW1hcFNlbGVjdG9yTGlzdCgpXG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuICBkZWxldGVTaXRlbWFwOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLiQoYnV0dG9uKS5jbG9zZXN0KCd0cicpLmRhdGEoJ3NpdGVtYXAnKVxuICAgIHZhciBjb250cm9sbGVyID0gdGhpc1xuICAgIHRoaXMuc3RvcmUuZGVsZXRlU2l0ZW1hcChzaXRlbWFwLCBmdW5jdGlvbiAoKSB7XG4gICAgICBjb250cm9sbGVyLnNob3dTaXRlbWFwcygpXG4gICAgfSlcbiAgfSxcbiAgaW5pdFNjcmFwZVNpdGVtYXBDb25maWdWYWxpZGF0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKCcjdmlld3BvcnQgZm9ybScpLmJvb3RzdHJhcFZhbGlkYXRvcih7XG4gICAgICBmaWVsZHM6IHtcbiAgICAgICAgJ3JlcXVlc3RJbnRlcnZhbCc6IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBub3RFbXB0eToge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnVGhlIHJlcXVlc3QgaW50ZXJ2YWwgaXMgcmVxdWlyZWQgYW5kIGNhbm5vdCBiZSBlbXB0eSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBudW1lcmljOiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgcmVxdWVzdCBpbnRlcnZhbCBtdXN0IGJlIG51bWVyaWMnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2FsbGJhY2s6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSByZXF1ZXN0IGludGVydmFsIG11c3QgYmUgYXRsZWFzdCAyMDAwIG1pbGxpc2Vjb25kcycsXG4gICAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbiAodmFsdWUsIHZhbGlkYXRvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZSA+PSAyMDAwXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgICdwYWdlTG9hZERlbGF5Jzoge1xuICAgICAgICAgIHZhbGlkYXRvcnM6IHtcbiAgICAgICAgICAgIG5vdEVtcHR5OiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgcGFnZSBsb2FkIGRlbGF5IGlzIHJlcXVpcmVkIGFuZCBjYW5ub3QgYmUgZW1wdHknXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbnVtZXJpYzoge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnVGhlIHBhZ2UgbGFvZCBkZWxheSBtdXN0IGJlIG51bWVyaWMnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2FsbGJhY2s6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSBwYWdlIGxvYWQgZGVsYXkgbXVzdCBiZSBhdGxlYXN0IDUwMCBtaWxsaXNlY29uZHMnLFxuICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKHZhbHVlLCB2YWxpZGF0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUgPj0gNTAwXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICB9LFxuICBzaG93U2NyYXBlU2l0ZW1hcENvbmZpZ1BhbmVsOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zZXRBY3RpdmVOYXZpZ2F0aW9uQnV0dG9uKCdzaXRlbWFwLXNjcmFwZScpXG4gICAgdmFyIHNjcmFwZUNvbmZpZ1BhbmVsID0gaWNoLlNpdGVtYXBTY3JhcGVDb25maWcoKVxuICAgIHRoaXMuJCgnI3ZpZXdwb3J0JykuaHRtbChzY3JhcGVDb25maWdQYW5lbClcbiAgICB0aGlzLmluaXRTY3JhcGVTaXRlbWFwQ29uZmlnVmFsaWRhdGlvbigpXG4gICAgcmV0dXJuIHRydWVcbiAgfSxcbiAgc2NyYXBlU2l0ZW1hcDogZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5pc1ZhbGlkRm9ybSgpKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cbiAgICB2YXIgcmVxdWVzdEludGVydmFsID0gdGhpcy4kKCdpbnB1dFtuYW1lPXJlcXVlc3RJbnRlcnZhbF0nKS52YWwoKVxuICAgIHZhciBwYWdlTG9hZERlbGF5ID0gdGhpcy4kKCdpbnB1dFtuYW1lPXBhZ2VMb2FkRGVsYXldJykudmFsKClcblxuICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcFxuICAgIHZhciByZXF1ZXN0ID0ge1xuICAgICAgc2NyYXBlU2l0ZW1hcDogdHJ1ZSxcbiAgICAgIHNpdGVtYXA6IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoc2l0ZW1hcCkpLFxuICAgICAgcmVxdWVzdEludGVydmFsOiByZXF1ZXN0SW50ZXJ2YWwsXG4gICAgICBwYWdlTG9hZERlbGF5OiBwYWdlTG9hZERlbGF5XG4gICAgfVxuXG5cdFx0Ly8gc2hvdyBzaXRlbWFwIHNjcmFwaW5nIHBhbmVsXG4gICAgdGhpcy5nZXRGb3JtVmFsaWRhdG9yKCkuZGVzdHJveSgpXG4gICAgdGhpcy4kKCcuc2NyYXBpbmctaW4tcHJvZ3Jlc3MnKS5yZW1vdmVDbGFzcygnaGlkZScpXG4gICAgdGhpcy4kKCcjc3VibWl0LXNjcmFwZS1zaXRlbWFwJykuY2xvc2VzdCgnLmZvcm0tZ3JvdXAnKS5oaWRlKClcbiAgICB0aGlzLiQoJyNzY3JhcGUtc2l0ZW1hcC1jb25maWcgaW5wdXQnKS5wcm9wKCdkaXNhYmxlZCcsIHRydWUpXG5cbiAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZShyZXF1ZXN0LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgIHRoaXMuYnJvd3NlU2l0ZW1hcERhdGEoKVxuICAgIH0uYmluZCh0aGlzKSlcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgc2l0ZW1hcExpc3RCcm93c2VTaXRlbWFwRGF0YTogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciBzaXRlbWFwID0gdGhpcy4kKGJ1dHRvbikuY2xvc2VzdCgndHInKS5kYXRhKCdzaXRlbWFwJylcbiAgICB0aGlzLnNldFN0YXRlRWRpdFNpdGVtYXAoc2l0ZW1hcClcbiAgICB0aGlzLmJyb3dzZVNpdGVtYXBEYXRhKClcbiAgfSxcbiAgYnJvd3NlU2l0ZW1hcERhdGE6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNldEFjdGl2ZU5hdmlnYXRpb25CdXR0b24oJ3NpdGVtYXAtYnJvd3NlJylcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICB0aGlzLnN0b3JlLmdldFNpdGVtYXBEYXRhKHNpdGVtYXAsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICB2YXIgZGF0YUNvbHVtbnMgPSBzaXRlbWFwLmdldERhdGFDb2x1bW5zKClcblxuICAgICAgdmFyIGRhdGFQYW5lbCA9IGljaC5TaXRlbWFwQnJvd3NlRGF0YSh7XG4gICAgICAgIGNvbHVtbnM6IGRhdGFDb2x1bW5zXG4gICAgICB9KVxuICAgICAgdGhpcy4kKCcjdmlld3BvcnQnKS5odG1sKGRhdGFQYW5lbClcblxuXHRcdFx0Ly8gZGlzcGxheSBkYXRhXG5cdFx0XHQvLyBEb2luZyB0aGlzIHRoZSBsb25nIHdheSBzbyB0aGVyZSBhcmVuJ3QgeHNzIHZ1bG5lcnViaWxpdGVzXG5cdFx0XHQvLyB3aGlsZSB3b3JraW5nIHdpdGggZGF0YSBvciB3aXRoIHRoZSBzZWxlY3RvciB0aXRsZXNcbiAgICAgIHZhciAkdGJvZHkgPSB0aGlzLiQoJyNzaXRlbWFwLWRhdGEgdGJvZHknKVxuICAgICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgICBkYXRhLmZvckVhY2goZnVuY3Rpb24gKHJvdykge1xuICAgICAgICB2YXIgJHRyID0gc2VsZi4kKCc8dHI+PC90cj4nKVxuICAgICAgICBkYXRhQ29sdW1ucy5mb3JFYWNoKGZ1bmN0aW9uIChjb2x1bW4pIHtcbiAgICAgICAgICB2YXIgJHRkID0gc2VsZi4kKCc8dGQ+PC90ZD4nKVxuICAgICAgICAgIHZhciBjZWxsRGF0YSA9IHJvd1tjb2x1bW5dXG4gICAgICAgICAgaWYgKHR5cGVvZiBjZWxsRGF0YSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGNlbGxEYXRhID0gSlNPTi5zdHJpbmdpZnkoY2VsbERhdGEpXG4gICAgICAgICAgfVxuICAgICAgICAgICR0ZC50ZXh0KGNlbGxEYXRhKVxuICAgICAgICAgICR0ci5hcHBlbmQoJHRkKVxuICAgICAgICB9KVxuICAgICAgICAkdGJvZHkuYXBwZW5kKCR0cilcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgc2hvd1NpdGVtYXBFeHBvcnREYXRhQ3N2UGFuZWw6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNldEFjdGl2ZU5hdmlnYXRpb25CdXR0b24oJ3NpdGVtYXAtZXhwb3J0LWRhdGEtY3N2JylcblxuICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcFxuICAgIHZhciBleHBvcnRQYW5lbCA9IGljaC5TaXRlbWFwRXhwb3J0RGF0YUNTVihzaXRlbWFwKVxuICAgIHRoaXMuJCgnI3ZpZXdwb3J0JykuaHRtbChleHBvcnRQYW5lbClcblxuXHRcdC8vIGdlbmVyYXRlIGRhdGFcbiAgICB0aGlzLiQoJy5kb3dubG9hZC1idXR0b24nKS5oaWRlKClcbiAgICB0aGlzLnN0b3JlLmdldFNpdGVtYXBEYXRhKHNpdGVtYXAsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICB2YXIgYmxvYiA9IHNpdGVtYXAuZ2V0RGF0YUV4cG9ydENzdkJsb2IoZGF0YSlcbiAgICAgIHRoaXMuJCgnLmRvd25sb2FkLWJ1dHRvbiBhJykuYXR0cignaHJlZicsIHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpKVxuICAgICAgdGhpcy4kKCcuZG93bmxvYWQtYnV0dG9uIGEnKS5hdHRyKCdkb3dubG9hZCcsIHNpdGVtYXAuX2lkICsgJy5jc3YnKVxuICAgICAgdGhpcy4kKCcuZG93bmxvYWQtYnV0dG9uJykuc2hvdygpXG4gICAgfSlcblxuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgc2VsZWN0U2VsZWN0b3I6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIHZhciBpbnB1dCA9ICQoYnV0dG9uKS5jbG9zZXN0KCcuZm9ybS1ncm91cCcpLmZpbmQoJ2lucHV0LnNlbGVjdG9yLXZhbHVlJylcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3JTaXRlbWFwKClcbiAgICB2YXIgc2VsZWN0b3IgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yKClcbiAgICB2YXIgY3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMgPSB0aGlzLmdldEN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzKClcbiAgICB2YXIgcGFyZW50Q1NTU2VsZWN0b3IgPSBzaXRlbWFwLnNlbGVjdG9ycy5nZXRQYXJlbnRDU1NTZWxlY3RvcldpdGhpbk9uZVBhZ2UoY3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMpXG5cbiAgICB2YXIgZGVmZXJyZWRTZWxlY3RvciA9IHRoaXMuY29udGVudFNjcmlwdC5zZWxlY3RTZWxlY3Rvcih7XG4gICAgICBwYXJlbnRDU1NTZWxlY3RvcjogcGFyZW50Q1NTU2VsZWN0b3IsXG4gICAgICBhbGxvd2VkRWxlbWVudHM6IHNlbGVjdG9yLmdldEl0ZW1DU1NTZWxlY3RvcigpXG4gICAgfSwgeyR9KVxuXG4gICAgZGVmZXJyZWRTZWxlY3Rvci5kb25lKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICQoaW5wdXQpLnZhbChyZXN1bHQuQ1NTU2VsZWN0b3IpXG5cblx0XHRcdC8vIHVwZGF0ZSB2YWxpZGF0aW9uIGZvciBzZWxlY3RvciBmaWVsZFxuICAgICAgdmFyIHZhbGlkYXRvciA9IHRoaXMuZ2V0Rm9ybVZhbGlkYXRvcigpXG4gICAgICB2YWxpZGF0b3IucmV2YWxpZGF0ZUZpZWxkKGlucHV0KVxuXG5cdFx0XHQvLyBAVE9ETyBob3cgY291bGQgdGhpcyBiZSBlbmNhcHN1bGF0ZWQ/XG5cdFx0XHQvLyB1cGRhdGUgaGVhZGVyIHJvdywgZGF0YSByb3cgc2VsZWN0b3JzIGFmdGVyIHNlbGVjdGluZyB0aGUgdGFibGUuIHNlbGVjdG9ycyBhcmUgdXBkYXRlZCBiYXNlZCBvbiB0YWJsZXNcblx0XHRcdC8vIGlubmVyIGh0bWxcbiAgICAgIGlmIChzZWxlY3Rvci50eXBlID09PSAnU2VsZWN0b3JUYWJsZScpIHtcbiAgICAgICAgdGhpcy5nZXRTZWxlY3RvckhUTUwoKS5kb25lKGZ1bmN0aW9uIChodG1sKSB7XG4gICAgICAgICAgdmFyIHRhYmxlSGVhZGVyUm93U2VsZWN0b3IgPSBTZWxlY3RvclRhYmxlLmdldFRhYmxlSGVhZGVyUm93U2VsZWN0b3JGcm9tVGFibGVIVE1MKGh0bWwsIHskfSlcbiAgICAgICAgICB2YXIgdGFibGVEYXRhUm93U2VsZWN0b3IgPSBTZWxlY3RvclRhYmxlLmdldFRhYmxlRGF0YVJvd1NlbGVjdG9yRnJvbVRhYmxlSFRNTChodG1sLCB7JH0pXG4gICAgICAgICAgJCgnaW5wdXRbbmFtZT10YWJsZUhlYWRlclJvd1NlbGVjdG9yXScpLnZhbCh0YWJsZUhlYWRlclJvd1NlbGVjdG9yKVxuICAgICAgICAgICQoJ2lucHV0W25hbWU9dGFibGVEYXRhUm93U2VsZWN0b3JdJykudmFsKHRhYmxlRGF0YVJvd1NlbGVjdG9yKVxuXG4gICAgICAgICAgdmFyIGhlYWRlckNvbHVtbnMgPSBTZWxlY3RvclRhYmxlLmdldFRhYmxlSGVhZGVyQ29sdW1uc0Zyb21IVE1MKHRhYmxlSGVhZGVyUm93U2VsZWN0b3IsIGh0bWwsIHskfSlcbiAgICAgICAgICB0aGlzLnJlbmRlclRhYmxlSGVhZGVyQ29sdW1ucyhoZWFkZXJDb2x1bW5zKVxuICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuXG4gIGdldEN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHBhcmVudFNlbGVjdG9ySWRzID0gdGhpcy5zdGF0ZS5lZGl0U2l0ZW1hcEJyZWFkY3VtYnNTZWxlY3RvcnMubWFwKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgcmV0dXJuIHNlbGVjdG9yLmlkXG4gICAgfSlcblxuICAgIHJldHVybiBwYXJlbnRTZWxlY3Rvcklkc1xuICB9LFxuXG4gIHNlbGVjdFRhYmxlSGVhZGVyUm93U2VsZWN0b3I6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIHZhciBpbnB1dCA9ICQoYnV0dG9uKS5jbG9zZXN0KCcuZm9ybS1ncm91cCcpLmZpbmQoJ2lucHV0LnNlbGVjdG9yLXZhbHVlJylcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3JTaXRlbWFwKClcbiAgICB2YXIgc2VsZWN0b3IgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yKClcbiAgICB2YXIgY3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMgPSB0aGlzLmdldEN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzKClcbiAgICB2YXIgcGFyZW50Q1NTU2VsZWN0b3IgPSBzaXRlbWFwLnNlbGVjdG9ycy5nZXRDU1NTZWxlY3RvcldpdGhpbk9uZVBhZ2Uoc2VsZWN0b3IuaWQsIGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzKVxuXG4gICAgdmFyIGRlZmVycmVkU2VsZWN0b3IgPSB0aGlzLmNvbnRlbnRTY3JpcHQuc2VsZWN0U2VsZWN0b3Ioe1xuICAgICAgcGFyZW50Q1NTU2VsZWN0b3I6IHBhcmVudENTU1NlbGVjdG9yLFxuICAgICAgYWxsb3dlZEVsZW1lbnRzOiAndHInXG4gICAgfSwgeyR9KVxuXG4gICAgZGVmZXJyZWRTZWxlY3Rvci5kb25lKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgIHZhciB0YWJsZUhlYWRlclJvd1NlbGVjdG9yID0gcmVzdWx0LkNTU1NlbGVjdG9yXG4gICAgICAkKGlucHV0KS52YWwodGFibGVIZWFkZXJSb3dTZWxlY3RvcilcblxuICAgICAgdGhpcy5nZXRTZWxlY3RvckhUTUwoKS5kb25lKGZ1bmN0aW9uIChodG1sKSB7XG4gICAgICAgIHZhciBoZWFkZXJDb2x1bW5zID0gU2VsZWN0b3JUYWJsZS5nZXRUYWJsZUhlYWRlckNvbHVtbnNGcm9tSFRNTCh0YWJsZUhlYWRlclJvd1NlbGVjdG9yLCBodG1sLCB7JH0pXG4gICAgICAgIHRoaXMucmVuZGVyVGFibGVIZWFkZXJDb2x1bW5zKGhlYWRlckNvbHVtbnMpXG4gICAgICB9LmJpbmQodGhpcykpXG5cblx0XHRcdC8vIHVwZGF0ZSB2YWxpZGF0aW9uIGZvciBzZWxlY3RvciBmaWVsZFxuICAgICAgdmFyIHZhbGlkYXRvciA9IHRoaXMuZ2V0Rm9ybVZhbGlkYXRvcigpXG4gICAgICB2YWxpZGF0b3IucmV2YWxpZGF0ZUZpZWxkKGlucHV0KVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcblxuICBzZWxlY3RUYWJsZURhdGFSb3dTZWxlY3RvcjogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIGlucHV0ID0gdGhpcy4kKGJ1dHRvbikuY2xvc2VzdCgnLmZvcm0tZ3JvdXAnKS5maW5kKCdpbnB1dC5zZWxlY3Rvci12YWx1ZScpXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yU2l0ZW1hcCgpXG4gICAgdmFyIHNlbGVjdG9yID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvcigpXG4gICAgdmFyIGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzID0gdGhpcy5nZXRDdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcygpXG4gICAgdmFyIHBhcmVudENTU1NlbGVjdG9yID0gc2l0ZW1hcC5zZWxlY3RvcnMuZ2V0Q1NTU2VsZWN0b3JXaXRoaW5PbmVQYWdlKHNlbGVjdG9yLmlkLCBjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcylcblxuICAgIHZhciBkZWZlcnJlZFNlbGVjdG9yID0gdGhpcy5jb250ZW50U2NyaXB0LnNlbGVjdFNlbGVjdG9yKHtcbiAgICAgIHBhcmVudENTU1NlbGVjdG9yOiBwYXJlbnRDU1NTZWxlY3RvcixcbiAgICAgIGFsbG93ZWRFbGVtZW50czogJ3RyJ1xuICAgIH0sIHskfSlcblxuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIGRlZmVycmVkU2VsZWN0b3IuZG9uZShmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICBzZWxmLiQoaW5wdXQpLnZhbChyZXN1bHQuQ1NTU2VsZWN0b3IpXG5cblx0XHRcdC8vIHVwZGF0ZSB2YWxpZGF0aW9uIGZvciBzZWxlY3RvciBmaWVsZFxuICAgICAgdmFyIHZhbGlkYXRvciA9IHRoaXMuZ2V0Rm9ybVZhbGlkYXRvcigpXG4gICAgICB2YWxpZGF0b3IucmV2YWxpZGF0ZUZpZWxkKGlucHV0KVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcblxuXHQvKipcblx0ICogdXBkYXRlIHRhYmxlIHNlbGVjdG9yIGNvbHVtbiBlZGl0aW5nIGZpZWxkc1xuXHQgKi9cbiAgcmVuZGVyVGFibGVIZWFkZXJDb2x1bW5zOiBmdW5jdGlvbiAoaGVhZGVyQ29sdW1ucykge1xuXHRcdC8vIHJlc2V0IHByZXZpb3VzIGNvbHVtbnNcbiAgICB2YXIgJHRib2R5ID0gdGhpcy4kKCcuZmVhdHVyZS1jb2x1bW5zIHRhYmxlIHRib2R5JylcbiAgICAkdGJvZHkuaHRtbCgnJylcbiAgICBoZWFkZXJDb2x1bW5zLmZvckVhY2goZnVuY3Rpb24gKGNvbHVtbikge1xuICAgICAgdmFyICRyb3cgPSBpY2guU2VsZWN0b3JFZGl0VGFibGVDb2x1bW4oY29sdW1uKVxuICAgICAgJHRib2R5LmFwcGVuZCgkcm93KVxuICAgIH0pXG4gIH0sXG5cblx0LyoqXG5cdCAqIFJldHVybnMgSFRNTCB0aGF0IHRoZSBjdXJyZW50IHNlbGVjdG9yIHdvdWxkIHNlbGVjdFxuXHQgKi9cbiAgZ2V0U2VsZWN0b3JIVE1MOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3JTaXRlbWFwKClcbiAgICB2YXIgc2VsZWN0b3IgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yKClcbiAgICB2YXIgY3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMgPSB0aGlzLmdldEN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzKClcbiAgICB2YXIgQ1NTU2VsZWN0b3IgPSBzaXRlbWFwLnNlbGVjdG9ycy5nZXRDU1NTZWxlY3RvcldpdGhpbk9uZVBhZ2Uoc2VsZWN0b3IuaWQsIGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzKVxuICAgIHZhciBkZWZlcnJlZEhUTUwgPSB0aGlzLmNvbnRlbnRTY3JpcHQuZ2V0SFRNTCh7Q1NTU2VsZWN0b3I6IENTU1NlbGVjdG9yfSwgeyR9KVxuXG4gICAgcmV0dXJuIGRlZmVycmVkSFRNTFxuICB9LFxuICBwcmV2aWV3U2VsZWN0b3I6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIGlmICghJChidXR0b24pLmhhc0NsYXNzKCdwcmV2aWV3JykpIHtcbiAgICAgIHZhciBzaXRlbWFwID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvclNpdGVtYXAoKVxuICAgICAgdmFyIHNlbGVjdG9yID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvcigpXG4gICAgICB2YXIgY3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMgPSB0aGlzLmdldEN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzKClcbiAgICAgIHZhciBwYXJlbnRDU1NTZWxlY3RvciA9IHNpdGVtYXAuc2VsZWN0b3JzLmdldFBhcmVudENTU1NlbGVjdG9yV2l0aGluT25lUGFnZShjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcylcbiAgICAgIHZhciBkZWZlcnJlZFNlbGVjdG9yUHJldmlldyA9IHRoaXMuY29udGVudFNjcmlwdC5wcmV2aWV3U2VsZWN0b3Ioe1xuICAgICAgICBwYXJlbnRDU1NTZWxlY3RvcjogcGFyZW50Q1NTU2VsZWN0b3IsXG4gICAgICAgIGVsZW1lbnRDU1NTZWxlY3Rvcjogc2VsZWN0b3Iuc2VsZWN0b3JcbiAgICAgIH0sIHskfSlcblxuICAgICAgZGVmZXJyZWRTZWxlY3RvclByZXZpZXcuZG9uZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICQoYnV0dG9uKS5hZGRDbGFzcygncHJldmlldycpXG4gICAgICB9KVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNvbnRlbnRTY3JpcHQucmVtb3ZlQ3VycmVudENvbnRlbnRTZWxlY3RvcigpXG4gICAgICAkKGJ1dHRvbikucmVtb3ZlQ2xhc3MoJ3ByZXZpZXcnKVxuICAgIH1cbiAgfSxcbiAgcHJldmlld0NsaWNrRWxlbWVudFNlbGVjdG9yOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICBpZiAoISQoYnV0dG9uKS5oYXNDbGFzcygncHJldmlldycpKSB7XG4gICAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICAgIHZhciBzZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3IoKVxuICAgICAgdmFyIGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzID0gdGhpcy5nZXRDdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcygpXG4gICAgICB2YXIgcGFyZW50Q1NTU2VsZWN0b3IgPSBzaXRlbWFwLnNlbGVjdG9ycy5nZXRQYXJlbnRDU1NTZWxlY3RvcldpdGhpbk9uZVBhZ2UoY3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMpXG5cbiAgICAgIHZhciBkZWZlcnJlZFNlbGVjdG9yUHJldmlldyA9IHRoaXMuY29udGVudFNjcmlwdC5wcmV2aWV3U2VsZWN0b3Ioe1xuICAgICAgICBwYXJlbnRDU1NTZWxlY3RvcjogcGFyZW50Q1NTU2VsZWN0b3IsXG4gICAgICAgIGVsZW1lbnRDU1NTZWxlY3Rvcjogc2VsZWN0b3IuY2xpY2tFbGVtZW50U2VsZWN0b3JcbiAgICAgIH0sIHskfSlcblxuICAgICAgZGVmZXJyZWRTZWxlY3RvclByZXZpZXcuZG9uZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICQoYnV0dG9uKS5hZGRDbGFzcygncHJldmlldycpXG4gICAgICB9KVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNvbnRlbnRTY3JpcHQucmVtb3ZlQ3VycmVudENvbnRlbnRTZWxlY3RvcigpXG4gICAgICAkKGJ1dHRvbikucmVtb3ZlQ2xhc3MoJ3ByZXZpZXcnKVxuICAgIH1cbiAgfSxcbiAgcHJldmlld1RhYmxlUm93U2VsZWN0b3I6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIGlmICghJChidXR0b24pLmhhc0NsYXNzKCdwcmV2aWV3JykpIHtcbiAgICAgIHZhciBzaXRlbWFwID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvclNpdGVtYXAoKVxuICAgICAgdmFyIHNlbGVjdG9yID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvcigpXG4gICAgICB2YXIgY3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMgPSB0aGlzLmdldEN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzKClcbiAgICAgIHZhciBwYXJlbnRDU1NTZWxlY3RvciA9IHNpdGVtYXAuc2VsZWN0b3JzLmdldENTU1NlbGVjdG9yV2l0aGluT25lUGFnZShzZWxlY3Rvci5pZCwgY3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMpXG4gICAgICB2YXIgcm93U2VsZWN0b3IgPSAkKGJ1dHRvbikuY2xvc2VzdCgnLmZvcm0tZ3JvdXAnKS5maW5kKCdpbnB1dCcpLnZhbCgpXG5cbiAgICAgIHZhciBkZWZlcnJlZFNlbGVjdG9yUHJldmlldyA9IHRoaXMuY29udGVudFNjcmlwdC5wcmV2aWV3U2VsZWN0b3Ioe1xuICAgICAgICBwYXJlbnRDU1NTZWxlY3RvcjogcGFyZW50Q1NTU2VsZWN0b3IsXG4gICAgICAgIGVsZW1lbnRDU1NTZWxlY3Rvcjogcm93U2VsZWN0b3JcbiAgICAgIH0sIHskfSlcblxuICAgICAgZGVmZXJyZWRTZWxlY3RvclByZXZpZXcuZG9uZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICQoYnV0dG9uKS5hZGRDbGFzcygncHJldmlldycpXG4gICAgICB9KVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNvbnRlbnRTY3JpcHQucmVtb3ZlQ3VycmVudENvbnRlbnRTZWxlY3RvcigpXG4gICAgICAkKGJ1dHRvbikucmVtb3ZlQ2xhc3MoJ3ByZXZpZXcnKVxuICAgIH1cbiAgfSxcbiAgcHJldmlld1NlbGVjdG9yRnJvbVNlbGVjdG9yVHJlZTogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgaWYgKCEkKGJ1dHRvbikuaGFzQ2xhc3MoJ3ByZXZpZXcnKSkge1xuICAgICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgICB2YXIgc2VsZWN0b3IgPSAkKGJ1dHRvbikuY2xvc2VzdCgndHInKS5kYXRhKCdzZWxlY3RvcicpXG4gICAgICB2YXIgY3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMgPSB0aGlzLmdldEN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzKClcbiAgICAgIHZhciBwYXJlbnRDU1NTZWxlY3RvciA9IHNpdGVtYXAuc2VsZWN0b3JzLmdldFBhcmVudENTU1NlbGVjdG9yV2l0aGluT25lUGFnZShjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcylcbiAgICAgIHZhciBkZWZlcnJlZFNlbGVjdG9yUHJldmlldyA9IHRoaXMuY29udGVudFNjcmlwdC5wcmV2aWV3U2VsZWN0b3Ioe1xuICAgICAgICBwYXJlbnRDU1NTZWxlY3RvcjogcGFyZW50Q1NTU2VsZWN0b3IsXG4gICAgICAgIGVsZW1lbnRDU1NTZWxlY3Rvcjogc2VsZWN0b3Iuc2VsZWN0b3JcbiAgICAgIH0sIHskfSlcblxuICAgICAgZGVmZXJyZWRTZWxlY3RvclByZXZpZXcuZG9uZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICQoYnV0dG9uKS5hZGRDbGFzcygncHJldmlldycpXG4gICAgICB9KVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNvbnRlbnRTY3JpcHQucmVtb3ZlQ3VycmVudENvbnRlbnRTZWxlY3RvcigpXG4gICAgICAkKGJ1dHRvbikucmVtb3ZlQ2xhc3MoJ3ByZXZpZXcnKVxuICAgIH1cbiAgfSxcbiAgcHJldmlld1NlbGVjdG9yRGF0YUZyb21TZWxlY3RvclRyZWU6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICB2YXIgc2VsZWN0b3IgPSBzZWxmLiQoYnV0dG9uKS5jbG9zZXN0KCd0cicpLmRhdGEoJ3NlbGVjdG9yJylcbiAgICB0aGlzLnByZXZpZXdTZWxlY3RvckRhdGEoc2l0ZW1hcCwgc2VsZWN0b3IuaWQpXG4gIH0sXG4gIHByZXZpZXdTZWxlY3RvckRhdGFGcm9tU2VsZWN0b3JFZGl0aW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwLmNsb25lKClcbiAgICB2YXIgc2VsZWN0b3IgPSBzaXRlbWFwLmdldFNlbGVjdG9yQnlJZCh0aGlzLnN0YXRlLmN1cnJlbnRTZWxlY3Rvci5pZClcbiAgICB2YXIgbmV3U2VsZWN0b3IgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yKClcbiAgICBzaXRlbWFwLnVwZGF0ZVNlbGVjdG9yKHNlbGVjdG9yLCBuZXdTZWxlY3RvcilcbiAgICB0aGlzLnByZXZpZXdTZWxlY3RvckRhdGEoc2l0ZW1hcCwgbmV3U2VsZWN0b3IuaWQpXG4gIH0sXG5cdC8qKlxuXHQgKiBSZXR1cm5zIGEgbGlzdCBvZiBzZWxlY3RvciBpZHMgdGhhdCB0aGUgdXNlciBoYXMgb3BlbmVkXG5cdCAqIEByZXR1cm5zIHtBcnJheX1cblx0ICovXG4gIGdldFN0YXRlUGFyZW50U2VsZWN0b3JJZHM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcGFyZW50U2VsZWN0b3JJZHMgPSBbXVxuICAgIHRoaXMuc3RhdGUuZWRpdFNpdGVtYXBCcmVhZGN1bWJzU2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICBwYXJlbnRTZWxlY3Rvcklkcy5wdXNoKHNlbGVjdG9yLmlkKVxuICAgIH0pXG4gICAgcmV0dXJuIHBhcmVudFNlbGVjdG9ySWRzXG4gIH0sXG4gIHByZXZpZXdTZWxlY3RvckRhdGE6IGZ1bmN0aW9uIChzaXRlbWFwLCBzZWxlY3RvcklkKSB7XG5cdFx0Ly8gZGF0YSBwcmV2aWV3IHdpbGwgYmUgYmFzZSBvbiBob3cgdGhlIHNlbGVjdG9yIHRyZWUgaXMgb3BlbmVkXG4gICAgdmFyIHBhcmVudFNlbGVjdG9ySWRzID0gdGhpcy5nZXRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzKClcblxuICAgIHZhciBzZWxmID0gdGhpc1xuXG4gICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICBwcmV2aWV3U2VsZWN0b3JEYXRhOiB0cnVlLFxuICAgICAgc2l0ZW1hcDogSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzaXRlbWFwKSksXG4gICAgICBwYXJlbnRTZWxlY3RvcklkczogcGFyZW50U2VsZWN0b3JJZHMsXG4gICAgICBzZWxlY3RvcklkOiBzZWxlY3RvcklkXG4gICAgfVxuICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHJlcXVlc3QsIGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgaWYgKHJlc3BvbnNlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBkYXRhQ29sdW1ucyA9IE9iamVjdC5rZXlzKHJlc3BvbnNlWzBdKVxuXG4gICAgICBjb25zb2xlLmxvZyhkYXRhQ29sdW1ucylcblxuICAgICAgdmFyICRkYXRhUHJldmlld1BhbmVsID0gaWNoLkRhdGFQcmV2aWV3KHtcbiAgICAgICAgY29sdW1uczogZGF0YUNvbHVtbnNcbiAgICAgIH0pXG4gICAgICBzZWxmLiQoJyN2aWV3cG9ydCcpLmFwcGVuZCgkZGF0YVByZXZpZXdQYW5lbClcbiAgICAgICRkYXRhUHJldmlld1BhbmVsLm1vZGFsKCdzaG93Jylcblx0XHRcdC8vIGRpc3BsYXkgZGF0YVxuXHRcdFx0Ly8gRG9pbmcgdGhpcyB0aGUgbG9uZyB3YXkgc28gdGhlcmUgYXJlbid0IHhzcyB2dWxuZXJ1YmlsaXRlc1xuXHRcdFx0Ly8gd2hpbGUgd29ya2luZyB3aXRoIGRhdGEgb3Igd2l0aCB0aGUgc2VsZWN0b3IgdGl0bGVzXG4gICAgICB2YXIgJHRib2R5ID0gc2VsZi4kKCd0Ym9keScsICRkYXRhUHJldmlld1BhbmVsKVxuICAgICAgcmVzcG9uc2UuZm9yRWFjaChmdW5jdGlvbiAocm93KSB7XG4gICAgICAgIHZhciAkdHIgPSBzZWxmLiQoJzx0cj48L3RyPicpXG4gICAgICAgIGRhdGFDb2x1bW5zLmZvckVhY2goZnVuY3Rpb24gKGNvbHVtbikge1xuICAgICAgICAgIHZhciAkdGQgPSBzZWxmLiQoJzx0ZD48L3RkPicpXG4gICAgICAgICAgdmFyIGNlbGxEYXRhID0gcm93W2NvbHVtbl1cbiAgICAgICAgICBpZiAodHlwZW9mIGNlbGxEYXRhID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgY2VsbERhdGEgPSBKU09OLnN0cmluZ2lmeShjZWxsRGF0YSlcbiAgICAgICAgICB9XG4gICAgICAgICAgJHRkLnRleHQoY2VsbERhdGEpXG4gICAgICAgICAgJHRyLmFwcGVuZCgkdGQpXG4gICAgICAgIH0pXG4gICAgICAgICR0Ym9keS5hcHBlbmQoJHRyKVxuICAgICAgfSlcblxuICAgICAgdmFyIHdpbmRvd0hlaWdodCA9IHNlbGYuJCh3aW5kb3cpLmhlaWdodCgpXG5cbiAgICAgIHNlbGYuJCgnLmRhdGEtcHJldmlldy1tb2RhbCAubW9kYWwtYm9keScpLmhlaWdodCh3aW5kb3dIZWlnaHQgLSAxMzApXG5cblx0XHRcdC8vIHJlbW92ZSBtb2RhbCBmcm9tIGRvbSBhZnRlciBpdCBpcyBjbG9zZWRcbiAgICAgICRkYXRhUHJldmlld1BhbmVsLm9uKCdoaWRkZW4uYnMubW9kYWwnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNlbGYuJCh0aGlzKS5yZW1vdmUoKVxuICAgICAgfSlcbiAgICB9KVxuICB9LFxuXHQvKipcblx0ICogQWRkIHN0YXJ0IHVybCB0byBzaXRlbWFwIGNyZWF0aW9uIG9yIGVkaXRpbmcgZm9ybVxuXHQgKiBAcGFyYW0gYnV0dG9uXG5cdCAqL1xuICBhZGRTdGFydFVybDogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIHZhciAkc3RhcnRVcmxJbnB1dEZpZWxkID0gaWNoLlNpdGVtYXBTdGFydFVybEZpZWxkKClcbiAgICBzZWxmLiQoJyN2aWV3cG9ydCAuc3RhcnQtdXJsLWJsb2NrOmxhc3QnKS5hZnRlcigkc3RhcnRVcmxJbnB1dEZpZWxkKVxuICAgIHZhciB2YWxpZGF0b3IgPSB0aGlzLmdldEZvcm1WYWxpZGF0b3IoKVxuICAgIHZhbGlkYXRvci5hZGRGaWVsZCgkc3RhcnRVcmxJbnB1dEZpZWxkLmZpbmQoJ2lucHV0JykpXG4gIH0sXG5cdC8qKlxuXHQgKiBSZW1vdmUgc3RhcnQgdXJsIGZyb20gc2l0ZW1hcCBjcmVhdGlvbiBvciBlZGl0aW5nIGZvcm0uXG5cdCAqIEBwYXJhbSBidXR0b25cblx0ICovXG4gIHJlbW92ZVN0YXJ0VXJsOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdmFyICRibG9jayA9IHNlbGYuJChidXR0b24pLmNsb3Nlc3QoJy5zdGFydC11cmwtYmxvY2snKVxuICAgIGlmIChzZWxmLiQoJyN2aWV3cG9ydCAuc3RhcnQtdXJsLWJsb2NrJykubGVuZ3RoID4gMSkge1xuXHRcdFx0Ly8gcmVtb3ZlIGZyb20gdmFsaWRhdG9yXG4gICAgICB2YXIgdmFsaWRhdG9yID0gdGhpcy5nZXRGb3JtVmFsaWRhdG9yKClcbiAgICAgIHZhbGlkYXRvci5yZW1vdmVGaWVsZCgkYmxvY2suZmluZCgnaW5wdXQnKSlcblxuICAgICAgJGJsb2NrLnJlbW92ZSgpXG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2l0ZW1hcENvbnRyb2xsZXJcbiIsIi8qKlxuICogRWxlbWVudCBzZWxlY3Rvci4gVXNlcyBqUXVlcnkgYXMgYmFzZSBhbmQgYWRkcyBzb21lIG1vcmUgZmVhdHVyZXNcbiAqIEBwYXJhbSBDU1NTZWxlY3RvclxuICogQHBhcmFtIHBhcmVudEVsZW1lbnRcbiAqIEBwYXJhbSBvcHRpb25zXG4gKi9cbnZhciBFbGVtZW50UXVlcnkgPSBmdW5jdGlvbiAoQ1NTU2VsZWN0b3IsIHBhcmVudEVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgQ1NTU2VsZWN0b3IgPSBDU1NTZWxlY3RvciB8fCAnJ1xuICB0aGlzLiQgPSBvcHRpb25zLiRcbnRoaXMuZG9jdW1lbnQgPSBvcHRpb25zLmRvY3VtZW50XG50aGlzLndpbmRvdyA9IG9wdGlvbnMud2luZG93XG4gIGlmICghdGhpcy4kKSB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcganF1ZXJ5IGZvciBFbGVtZW50UXVlcnknKVxuICB2YXIgc2VsZWN0ZWRFbGVtZW50cyA9IFtdXG5cbiAgdmFyIGFkZEVsZW1lbnQgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgIGlmIChzZWxlY3RlZEVsZW1lbnRzLmluZGV4T2YoZWxlbWVudCkgPT09IC0xKSB7XG4gICAgICBzZWxlY3RlZEVsZW1lbnRzLnB1c2goZWxlbWVudClcbiAgICB9XG4gIH1cblxuICB2YXIgc2VsZWN0b3JQYXJ0cyA9IEVsZW1lbnRRdWVyeS5nZXRTZWxlY3RvclBhcnRzKENTU1NlbGVjdG9yKVxuICB2YXIgc2VsZiA9IHRoaXNcbiAgc2VsZWN0b3JQYXJ0cy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuXHRcdC8vIGhhbmRsZSBzcGVjaWFsIGNhc2Ugd2hlbiBwYXJlbnQgaXMgc2VsZWN0ZWRcbiAgICBpZiAoc2VsZWN0b3IgPT09ICdfcGFyZW50XycpIHtcbiAgICAgIHNlbGYuJChwYXJlbnRFbGVtZW50KS5lYWNoKGZ1bmN0aW9uIChpLCBlbGVtZW50KSB7XG4gICAgICAgIGFkZEVsZW1lbnQoZWxlbWVudClcbiAgICAgIH0pXG4gICAgfVx0XHRlbHNlIHtcbiAgICAgIHZhciBlbGVtZW50cyA9IHNlbGYuJChzZWxlY3Rvciwgc2VsZi4kKHBhcmVudEVsZW1lbnQpKVxuICAgICAgZWxlbWVudHMuZWFjaChmdW5jdGlvbiAoaSwgZWxlbWVudCkge1xuICAgICAgICBhZGRFbGVtZW50KGVsZW1lbnQpXG4gICAgICB9KVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gc2VsZWN0ZWRFbGVtZW50c1xufVxuXG5FbGVtZW50UXVlcnkuZ2V0U2VsZWN0b3JQYXJ0cyA9IGZ1bmN0aW9uIChDU1NTZWxlY3Rvcikge1xuICB2YXIgc2VsZWN0b3JzID0gQ1NTU2VsZWN0b3Iuc3BsaXQoLygsfFwiLio/XCJ8Jy4qPyd8XFwoLio/XFwpKS8pXG5cbiAgdmFyIHJlc3VsdFNlbGVjdG9ycyA9IFtdXG4gIHZhciBjdXJyZW50U2VsZWN0b3IgPSAnJ1xuICBzZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICBpZiAoc2VsZWN0b3IgPT09ICcsJykge1xuICAgICAgaWYgKGN1cnJlbnRTZWxlY3Rvci50cmltKCkubGVuZ3RoKSB7XG4gICAgICAgIHJlc3VsdFNlbGVjdG9ycy5wdXNoKGN1cnJlbnRTZWxlY3Rvci50cmltKCkpXG4gICAgICB9XG4gICAgICBjdXJyZW50U2VsZWN0b3IgPSAnJ1xuICAgIH1cdFx0ZWxzZSB7XG4gICAgICBjdXJyZW50U2VsZWN0b3IgKz0gc2VsZWN0b3JcbiAgICB9XG4gIH0pXG4gIGlmIChjdXJyZW50U2VsZWN0b3IudHJpbSgpLmxlbmd0aCkge1xuICAgIHJlc3VsdFNlbGVjdG9ycy5wdXNoKGN1cnJlbnRTZWxlY3Rvci50cmltKCkpXG4gIH1cblxuICByZXR1cm4gcmVzdWx0U2VsZWN0b3JzXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRWxlbWVudFF1ZXJ5XG4iLCJ2YXIgc2VsZWN0b3JzID0gcmVxdWlyZSgnLi9TZWxlY3RvcnMnKVxudmFyIEVsZW1lbnRRdWVyeSA9IHJlcXVpcmUoJy4vRWxlbWVudFF1ZXJ5JylcbnZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxuXG52YXIgU2VsZWN0b3IgPSBmdW5jdGlvbiAoc2VsZWN0b3IsIG9wdGlvbnMpIHtcbiAgdGhpcy4kID0gb3B0aW9ucy4kXG50aGlzLmRvY3VtZW50ID0gb3B0aW9ucy5kb2N1bWVudFxudGhpcy53aW5kb3cgPSBvcHRpb25zLndpbmRvd1xuICBpZiAoIW9wdGlvbnMuJCkgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIGpxdWVyeScpXG5cbiAgdGhpcy51cGRhdGVEYXRhKHNlbGVjdG9yKVxuICB0aGlzLmluaXRUeXBlKClcbn1cblxuU2VsZWN0b3IucHJvdG90eXBlID0ge1xuXG5cdC8qKlxuXHQgKiBJcyB0aGlzIHNlbGVjdG9yIGNvbmZpZ3VyZWQgdG8gcmV0dXJuIG11bHRpcGxlIGl0ZW1zP1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICovXG4gIHdpbGxSZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5jYW5SZXR1cm5NdWx0aXBsZVJlY29yZHMoKSAmJiB0aGlzLm11bHRpcGxlXG4gIH0sXG5cblx0LyoqXG5cdCAqIFVwZGF0ZSBjdXJyZW50IHNlbGVjdG9yIGNvbmZpZ3VyYXRpb25cblx0ICogQHBhcmFtIGRhdGFcblx0ICovXG4gIHVwZGF0ZURhdGE6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdmFyIGFsbG93ZWRLZXlzID0gWydpZCcsICd0eXBlJywgJ3NlbGVjdG9yJywgJ3BhcmVudFNlbGVjdG9ycyddXG4gICAgY29uc29sZS5sb2coJ2RhdGEgdHlwZScsIGRhdGEudHlwZSlcbiAgICBhbGxvd2VkS2V5cyA9IGFsbG93ZWRLZXlzLmNvbmNhdChzZWxlY3RvcnNbZGF0YS50eXBlXS5nZXRGZWF0dXJlcygpKVxuICAgIHZhciBrZXlcblx0XHQvLyB1cGRhdGUgZGF0YVxuICAgIGZvciAoa2V5IGluIGRhdGEpIHtcbiAgICAgIGlmIChhbGxvd2VkS2V5cy5pbmRleE9mKGtleSkgIT09IC0xIHx8IHR5cGVvZiBkYXRhW2tleV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpc1trZXldID0gZGF0YVtrZXldXG4gICAgICB9XG4gICAgfVxuXG5cdFx0Ly8gcmVtb3ZlIHZhbHVlcyB0aGF0IGFyZSBub3QgbmVlZGVkIGZvciB0aGlzIHR5cGUgb2Ygc2VsZWN0b3JcbiAgICBmb3IgKGtleSBpbiB0aGlzKSB7XG4gICAgICBpZiAoYWxsb3dlZEtleXMuaW5kZXhPZihrZXkpID09PSAtMSAmJiB0eXBlb2YgdGhpc1trZXldICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzW2tleV1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cblx0LyoqXG5cdCAqIENTUyBzZWxlY3RvciB3aGljaCB3aWxsIGJlIHVzZWQgZm9yIGVsZW1lbnQgc2VsZWN0aW9uXG5cdCAqIEByZXR1cm5zIHtzdHJpbmd9XG5cdCAqL1xuICBnZXRJdGVtQ1NTU2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gJyonXG4gIH0sXG5cblx0LyoqXG5cdCAqIG92ZXJyaWRlIG9iamVjdHMgbWV0aG9kcyBiYXNlZCBvbiBzZWxldG9yIHR5cGVcblx0ICovXG4gIGluaXRUeXBlOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHNlbGVjdG9yc1t0aGlzLnR5cGVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignU2VsZWN0b3IgdHlwZSBub3QgZGVmaW5lZCAnICsgdGhpcy50eXBlKVxuICAgIH1cblxuXHRcdC8vIG92ZXJyaWRlcyBvYmplY3RzIG1ldGhvZHNcbiAgICBmb3IgKHZhciBpIGluIHNlbGVjdG9yc1t0aGlzLnR5cGVdKSB7XG4gICAgICB0aGlzW2ldID0gc2VsZWN0b3JzW3RoaXMudHlwZV1baV1cbiAgICB9XG4gIH0sXG5cblx0LyoqXG5cdCAqIENoZWNrIHdoZXRoZXIgYSBzZWxlY3RvciBpcyBhIHBhcmVuIHNlbGVjdG9yIG9mIHRoaXMgc2VsZWN0b3Jcblx0ICogQHBhcmFtIHNlbGVjdG9ySWRcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuICBoYXNQYXJlbnRTZWxlY3RvcjogZnVuY3Rpb24gKHNlbGVjdG9ySWQpIHtcbiAgICByZXR1cm4gKHRoaXMucGFyZW50U2VsZWN0b3JzLmluZGV4T2Yoc2VsZWN0b3JJZCkgIT09IC0xKVxuICB9LFxuXG4gIHJlbW92ZVBhcmVudFNlbGVjdG9yOiBmdW5jdGlvbiAoc2VsZWN0b3JJZCkge1xuICAgIHZhciBpbmRleCA9IHRoaXMucGFyZW50U2VsZWN0b3JzLmluZGV4T2Yoc2VsZWN0b3JJZClcbiAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICB0aGlzLnBhcmVudFNlbGVjdG9ycy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgfVxuICB9LFxuXG4gIHJlbmFtZVBhcmVudFNlbGVjdG9yOiBmdW5jdGlvbiAob3JpZ2luYWxJZCwgcmVwbGFjZW1lbnRJZCkge1xuICAgIGlmICh0aGlzLmhhc1BhcmVudFNlbGVjdG9yKG9yaWdpbmFsSWQpKSB7XG4gICAgICB2YXIgcG9zID0gdGhpcy5wYXJlbnRTZWxlY3RvcnMuaW5kZXhPZihvcmlnaW5hbElkKVxuICAgICAgdGhpcy5wYXJlbnRTZWxlY3RvcnMuc3BsaWNlKHBvcywgMSwgcmVwbGFjZW1lbnRJZClcbiAgICB9XG4gIH0sXG5cbiAgZ2V0RGF0YUVsZW1lbnRzOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIGVsZW1lbnRzID0gRWxlbWVudFF1ZXJ5KHRoaXMuc2VsZWN0b3IsIHBhcmVudEVsZW1lbnQsIHskfSlcbiAgICBpZiAodGhpcy5tdWx0aXBsZSkge1xuICAgICAgcmV0dXJuIGVsZW1lbnRzXG4gICAgfSBlbHNlIGlmIChlbGVtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gW2VsZW1lbnRzWzBdXVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gW11cbiAgICB9XG4gIH0sXG5cbiAgZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIHRpbWVvdXQgPSB0aGlzLmRlbGF5IHx8IDBcblxuXHRcdC8vIHRoaXMgd29ya3MgbXVjaCBmYXN0ZXIgYmVjYXVzZSB3aGVuQ2FsbFNlcXVlbnRhbGx5IGlzbid0IHJ1bm5pbmcgbmV4dCBkYXRhIGV4dHJhY3Rpb24gaW1tZWRpYXRlbHlcbiAgICBpZiAodGltZW91dCA9PT0gMCkge1xuICAgICAgdmFyIGRlZmVycmVkRGF0YSA9IHRoaXMuX2dldERhdGEocGFyZW50RWxlbWVudClcbiAgICAgIGRlZmVycmVkRGF0YS5kb25lKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIGQucmVzb2x2ZShkYXRhKVxuICAgICAgfSlcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkZWZlcnJlZERhdGEgPSB0aGlzLl9nZXREYXRhKHBhcmVudEVsZW1lbnQpXG4gICAgICAgIGRlZmVycmVkRGF0YS5kb25lKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgZC5yZXNvbHZlKGRhdGEpXG4gICAgICAgIH0pXG4gICAgICB9LmJpbmQodGhpcyksIHRpbWVvdXQpXG4gICAgfVxuXG4gICAgcmV0dXJuIGQucHJvbWlzZSgpXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvclxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG5cbnZhciBTZWxlY3RvckVsZW1lbnQgPSB7XG5cbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBkZmQgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcbiAgICBkZmQucmVzb2x2ZSh0aGlzLiQubWFrZUFycmF5KGVsZW1lbnRzKSlcblxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW11cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2RlbGF5J11cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yRWxlbWVudFxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgU2VsZWN0b3JFbGVtZW50QXR0cmlidXRlID0ge1xuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcblxuICAgIHZhciByZXN1bHQgPSBbXVxuICAgIHNlbGYuJChlbGVtZW50cykuZWFjaChmdW5jdGlvbiAoaywgZWxlbWVudCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuXG4gICAgICBkYXRhW3RoaXMuaWRdID0gc2VsZi4kKGVsZW1lbnQpLmF0dHIodGhpcy5leHRyYWN0QXR0cmlidXRlKVxuICAgICAgcmVzdWx0LnB1c2goZGF0YSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICBpZiAodGhpcy5tdWx0aXBsZSA9PT0gZmFsc2UgJiYgZWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICBkYXRhW3RoaXMuaWQgKyAnLXNyYyddID0gbnVsbFxuICAgICAgcmVzdWx0LnB1c2goZGF0YSlcbiAgICB9XG4gICAgZGZkLnJlc29sdmUocmVzdWx0KVxuXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbdGhpcy5pZF1cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2V4dHJhY3RBdHRyaWJ1dGUnLCAnZGVsYXknXVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JFbGVtZW50QXR0cmlidXRlXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciBVbmlxdWVFbGVtZW50TGlzdCA9IHJlcXVpcmUoJy4vLi4vVW5pcXVlRWxlbWVudExpc3QnKVxudmFyIEVsZW1lbnRRdWVyeSA9IHJlcXVpcmUoJy4vLi4vRWxlbWVudFF1ZXJ5JylcbnZhciBDc3NTZWxlY3RvciA9IHJlcXVpcmUoJ2Nzcy1zZWxlY3RvcicpLkNzc1NlbGVjdG9yXG52YXIgU2VsZWN0b3JFbGVtZW50Q2xpY2sgPSB7XG5cbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgZ2V0Q2xpY2tFbGVtZW50czogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIHZhciBjbGlja0VsZW1lbnRzID0gRWxlbWVudFF1ZXJ5KHRoaXMuY2xpY2tFbGVtZW50U2VsZWN0b3IsIHBhcmVudEVsZW1lbnQsIHskfSlcbiAgICByZXR1cm4gY2xpY2tFbGVtZW50c1xuICB9LFxuXG5cdC8qKlxuXHQgKiBDaGVjayB3aGV0aGVyIGVsZW1lbnQgaXMgc3RpbGwgcmVhY2hhYmxlIGZyb20gaHRtbC4gVXNlZnVsIHRvIGNoZWNrIHdoZXRoZXIgdGhlIGVsZW1lbnQgaXMgcmVtb3ZlZCBmcm9tIERPTS5cblx0ICogQHBhcmFtIGVsZW1lbnRcblx0ICovXG4gIGlzRWxlbWVudEluSFRNTDogZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICByZXR1cm4gdGhpcy4kKGVsZW1lbnQpLmNsb3Nlc3QoJ2h0bWwnKS5sZW5ndGggIT09IDBcbiAgfSxcblxuICB0cmlnZ2VyQnV0dG9uQ2xpY2s6IGZ1bmN0aW9uIChjbGlja0VsZW1lbnQpIHtcbiAgICB2YXIgZG9jdW1lbnQgPSB0aGlzLmRvY3VtZW50XG4gICAgdmFyIGNzID0gbmV3IENzc1NlbGVjdG9yKHtcbiAgICAgIGVuYWJsZVNtYXJ0VGFibGVTZWxlY3RvcjogZmFsc2UsXG4gICAgICBwYXJlbnQ6IHRoaXMuJCgnYm9keScpWzBdLFxuICAgICAgZW5hYmxlUmVzdWx0U3RyaXBwaW5nOiBmYWxzZVxuICAgIH0pXG4gICAgdmFyIGNzc1NlbGVjdG9yID0gY3MuZ2V0Q3NzU2VsZWN0b3IoW2NsaWNrRWxlbWVudF0pXG5cblx0XHQvLyB0aGlzIGZ1bmN0aW9uIHdpbGwgY2F0Y2ggd2luZG93Lm9wZW4gY2FsbCBhbmQgcGxhY2UgdGhlIHJlcXVlc3RlZCB1cmwgYXMgdGhlIGVsZW1lbnRzIGRhdGEgYXR0cmlidXRlXG4gICAgdmFyIHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpXG4gICAgc2NyaXB0LnR5cGUgPSAndGV4dC9qYXZhc2NyaXB0J1xuICAgIHNjcmlwdC50ZXh0ID0gJycgK1xuXHRcdFx0JyhmdW5jdGlvbigpeyAnICtcblx0XHRcdFwidmFyIGVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnXCIgKyBjc3NTZWxlY3RvciArIFwiJylbMF07IFwiICtcblx0XHRcdCdlbC5jbGljaygpOyAnICtcblx0XHRcdCd9KSgpOydcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHNjcmlwdClcbiAgfSxcblxuICBnZXRDbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZTogZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiAndW5pcXVlVGV4dCdcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGVcbiAgICB9XG4gIH0sXG5cbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICB2YXIgZGVsYXkgPSBwYXJzZUludCh0aGlzLmRlbGF5KSB8fCAwXG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciBmb3VuZEVsZW1lbnRzID0gbmV3IFVuaXF1ZUVsZW1lbnRMaXN0KCd1bmlxdWVUZXh0JywgeyR9KVxuICAgIHZhciBjbGlja0VsZW1lbnRzID0gdGhpcy5nZXRDbGlja0VsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG4gICAgdmFyIGRvbmVDbGlja2luZ0VsZW1lbnRzID0gbmV3IFVuaXF1ZUVsZW1lbnRMaXN0KHRoaXMuZ2V0Q2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUoKSwgeyR9KVxuXG5cdFx0Ly8gYWRkIGVsZW1lbnRzIHRoYXQgYXJlIGF2YWlsYWJsZSBiZWZvcmUgY2xpY2tpbmdcbiAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuICAgIGVsZW1lbnRzLmZvckVhY2goZm91bmRFbGVtZW50cy5wdXNoLmJpbmQoZm91bmRFbGVtZW50cykpXG5cblx0XHQvLyBkaXNjYXJkIGluaXRpYWwgZWxlbWVudHNcbiAgICBpZiAodGhpcy5kaXNjYXJkSW5pdGlhbEVsZW1lbnRzKSB7XG4gICAgICBmb3VuZEVsZW1lbnRzID0gbmV3IFVuaXF1ZUVsZW1lbnRMaXN0KCd1bmlxdWVUZXh0JywgeyR9KVxuICAgIH1cblxuXHRcdC8vIG5vIGVsZW1lbnRzIHRvIGNsaWNrIGF0IHRoZSBiZWdpbm5pbmdcbiAgICBpZiAoY2xpY2tFbGVtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZShmb3VuZEVsZW1lbnRzKVxuICAgICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gICAgfVxuXG5cdFx0Ly8gaW5pdGlhbCBjbGljayBhbmQgd2FpdFxuICAgIHZhciBjdXJyZW50Q2xpY2tFbGVtZW50ID0gY2xpY2tFbGVtZW50c1swXVxuICAgIHRoaXMudHJpZ2dlckJ1dHRvbkNsaWNrKGN1cnJlbnRDbGlja0VsZW1lbnQpXG4gICAgdmFyIG5leHRFbGVtZW50U2VsZWN0aW9uID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKSArIGRlbGF5XG5cblx0XHQvLyBpbmZpbml0ZWx5IHNjcm9sbCBkb3duIGFuZCBmaW5kIGFsbCBpdGVtc1xuICAgIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcblx0XHRcdC8vIGZpbmQgdGhvc2UgY2xpY2sgZWxlbWVudHMgdGhhdCBhcmUgbm90IGluIHRoZSBibGFjayBsaXN0XG4gICAgICB2YXIgYWxsQ2xpY2tFbGVtZW50cyA9IHRoaXMuZ2V0Q2xpY2tFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuICAgICAgY2xpY2tFbGVtZW50cyA9IFtdXG4gICAgICBhbGxDbGlja0VsZW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgaWYgKCFkb25lQ2xpY2tpbmdFbGVtZW50cy5pc0FkZGVkKGVsZW1lbnQpKSB7XG4gICAgICAgICAgY2xpY2tFbGVtZW50cy5wdXNoKGVsZW1lbnQpXG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIHZhciBub3cgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpXG5cdFx0XHQvLyBzbGVlcC4gd2FpdCB3aGVuIHRvIGV4dHJhY3QgbmV4dCBlbGVtZW50c1xuICAgICAgaWYgKG5vdyA8IG5leHRFbGVtZW50U2VsZWN0aW9uKSB7XG5cdFx0XHRcdC8vIGNvbnNvbGUubG9nKFwid2FpdFwiKTtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cblx0XHRcdC8vIGFkZCBuZXdseSBmb3VuZCBlbGVtZW50cyB0byBlbGVtZW50IGZvdW5kRWxlbWVudHMgYXJyYXkuXG4gICAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuICAgICAgdmFyIGFkZGVkQW5FbGVtZW50ID0gZmFsc2VcbiAgICAgIGVsZW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgdmFyIGFkZGVkID0gZm91bmRFbGVtZW50cy5wdXNoKGVsZW1lbnQpXG4gICAgICAgIGlmIChhZGRlZCkge1xuICAgICAgICAgIGFkZGVkQW5FbGVtZW50ID0gdHJ1ZVxuICAgICAgICB9XG4gICAgICB9KVxuXHRcdFx0Ly8gY29uc29sZS5sb2coXCJhZGRlZFwiLCBhZGRlZEFuRWxlbWVudCk7XG5cblx0XHRcdC8vIG5vIG5ldyBlbGVtZW50cyBmb3VuZC4gU3RvcCBjbGlja2luZyB0aGlzIGJ1dHRvblxuICAgICAgaWYgKCFhZGRlZEFuRWxlbWVudCkge1xuICAgICAgICBkb25lQ2xpY2tpbmdFbGVtZW50cy5wdXNoKGN1cnJlbnRDbGlja0VsZW1lbnQpXG4gICAgICB9XG5cblx0XHRcdC8vIGNvbnRpbnVlIGNsaWNraW5nIGFuZCBhZGQgZGVsYXksIGJ1dCBpZiB0aGVyZSBpcyBub3RoaW5nXG5cdFx0XHQvLyBtb3JlIHRvIGNsaWNrIHRoZSBmaW5pc2hcblx0XHRcdC8vIGNvbnNvbGUubG9nKFwidG90YWwgYnV0dG9uc1wiLCBjbGlja0VsZW1lbnRzLmxlbmd0aClcbiAgICAgIGlmIChjbGlja0VsZW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKVxuICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUoZm91bmRFbGVtZW50cylcbiAgICAgIH0gZWxzZSB7XG5cdFx0XHRcdC8vIGNvbnNvbGUubG9nKFwiY2xpY2tcIik7XG4gICAgICAgIGN1cnJlbnRDbGlja0VsZW1lbnQgPSBjbGlja0VsZW1lbnRzWzBdXG5cdFx0XHRcdC8vIGNsaWNrIG9uIGVsZW1lbnRzIG9ubHkgb25jZSBpZiB0aGUgdHlwZSBpcyBjbGlja29uY2VcbiAgICAgICAgaWYgKHRoaXMuY2xpY2tUeXBlID09PSAnY2xpY2tPbmNlJykge1xuICAgICAgICAgIGRvbmVDbGlja2luZ0VsZW1lbnRzLnB1c2goY3VycmVudENsaWNrRWxlbWVudClcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnRyaWdnZXJCdXR0b25DbGljayhjdXJyZW50Q2xpY2tFbGVtZW50KVxuICAgICAgICBuZXh0RWxlbWVudFNlbGVjdGlvbiA9IG5vdyArIGRlbGF5XG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpLCA1MClcblxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFtdXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydtdWx0aXBsZScsICdkZWxheScsICdjbGlja0VsZW1lbnRTZWxlY3RvcicsICdjbGlja1R5cGUnLCAnZGlzY2FyZEluaXRpYWxFbGVtZW50cycsICdjbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSddXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvckVsZW1lbnRDbGlja1xuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgU2VsZWN0b3JFbGVtZW50U2Nyb2xsID0ge1xuXG4gIGNhblJldHVybk11bHRpcGxlUmVjb3JkczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUNoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlTG9jYWxDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuICBzY3JvbGxUb0JvdHRvbTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBkb2N1bWVudCA9IHRoaXMuZG9jdW1lbnRcbiAgICB3aW5kb3cuc2Nyb2xsVG8oMCwgZG9jdW1lbnQuYm9keS5zY3JvbGxIZWlnaHQpXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBkZWxheSA9IHBhcnNlSW50KHRoaXMuZGVsYXkpIHx8IDBcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIGZvdW5kRWxlbWVudHMgPSBbXVxuXG5cdFx0Ly8gaW5pdGlhbGx5IHNjcm9sbCBkb3duIGFuZCB3YWl0XG4gICAgdGhpcy5zY3JvbGxUb0JvdHRvbSgpXG4gICAgdmFyIG5leHRFbGVtZW50U2VsZWN0aW9uID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKSArIGRlbGF5XG5cblx0XHQvLyBpbmZpbml0ZWx5IHNjcm9sbCBkb3duIGFuZCBmaW5kIGFsbCBpdGVtc1xuICAgIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBub3cgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpXG5cdFx0XHQvLyBzbGVlcC4gd2FpdCB3aGVuIHRvIGV4dHJhY3QgbmV4dCBlbGVtZW50c1xuICAgICAgaWYgKG5vdyA8IG5leHRFbGVtZW50U2VsZWN0aW9uKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuXHRcdFx0Ly8gbm8gbmV3IGVsZW1lbnRzIGZvdW5kXG4gICAgICBpZiAoZWxlbWVudHMubGVuZ3RoID09PSBmb3VuZEVsZW1lbnRzLmxlbmd0aCkge1xuICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKVxuICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUodGhpcy4kLm1ha2VBcnJheShlbGVtZW50cykpXG4gICAgICB9IGVsc2Uge1xuXHRcdFx0XHQvLyBjb250aW51ZSBzY3JvbGxpbmcgYW5kIGFkZCBkZWxheVxuICAgICAgICBmb3VuZEVsZW1lbnRzID0gZWxlbWVudHNcbiAgICAgICAgdGhpcy5zY3JvbGxUb0JvdHRvbSgpXG4gICAgICAgIG5leHRFbGVtZW50U2VsZWN0aW9uID0gbm93ICsgZGVsYXlcbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcyksIDUwKVxuXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW11cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2RlbGF5J11cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yRWxlbWVudFNjcm9sbFxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgU2VsZWN0b3JHcm91cCA9IHtcblxuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5IYXZlTG9jYWxDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkNyZWF0ZU5ld0pvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBkZmQgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciBzZWxmID0gdGhpc1xuXHRcdC8vIGNhbm5vdCByZXVzZSB0aGlzLmdldERhdGFFbGVtZW50cyBiZWNhdXNlIGl0IGRlcGVuZHMgb24gKm11bHRpcGxlKiBwcm9wZXJ0eVxuICAgIHZhciBlbGVtZW50cyA9IHNlbGYuJCh0aGlzLnNlbGVjdG9yLCBwYXJlbnRFbGVtZW50KVxuXG4gICAgdmFyIHJlY29yZHMgPSBbXVxuICAgIHNlbGYuJChlbGVtZW50cykuZWFjaChmdW5jdGlvbiAoaywgZWxlbWVudCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuXG4gICAgICBkYXRhW3RoaXMuaWRdID0gc2VsZi4kKGVsZW1lbnQpLnRleHQoKVxuXG4gICAgICBpZiAodGhpcy5leHRyYWN0QXR0cmlidXRlKSB7XG4gICAgICAgIGRhdGFbdGhpcy5pZCArICctJyArIHRoaXMuZXh0cmFjdEF0dHJpYnV0ZV0gPSBzZWxmLiQoZWxlbWVudCkuYXR0cih0aGlzLmV4dHJhY3RBdHRyaWJ1dGUpXG4gICAgICB9XG5cbiAgICAgIHJlY29yZHMucHVzaChkYXRhKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIHZhciByZXN1bHQgPSB7fVxuICAgIHJlc3VsdFt0aGlzLmlkXSA9IHJlY29yZHNcblxuICAgIGRmZC5yZXNvbHZlKFtyZXN1bHRdKVxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW3RoaXMuaWRdXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydkZWxheScsICdleHRyYWN0QXR0cmlidXRlJ11cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yR3JvdXBcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxudmFyIFNlbGVjdG9ySFRNTCA9IHtcblxuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcblxuICAgIHZhciByZXN1bHQgPSBbXVxuICAgIHNlbGYuJChlbGVtZW50cykuZWFjaChmdW5jdGlvbiAoaywgZWxlbWVudCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuICAgICAgdmFyIGh0bWwgPSBzZWxmLiQoZWxlbWVudCkuaHRtbCgpXG5cbiAgICAgIGlmICh0aGlzLnJlZ2V4ICE9PSB1bmRlZmluZWQgJiYgdGhpcy5yZWdleC5sZW5ndGgpIHtcbiAgICAgICAgdmFyIG1hdGNoZXMgPSBodG1sLm1hdGNoKG5ldyBSZWdFeHAodGhpcy5yZWdleCkpXG4gICAgICAgIGlmIChtYXRjaGVzICE9PSBudWxsKSB7XG4gICAgICAgICAgaHRtbCA9IG1hdGNoZXNbMF1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBodG1sID0gbnVsbFxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBkYXRhW3RoaXMuaWRdID0gaHRtbFxuXG4gICAgICByZXN1bHQucHVzaChkYXRhKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIGlmICh0aGlzLm11bHRpcGxlID09PSBmYWxzZSAmJiBlbGVtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHZhciBkYXRhID0ge31cbiAgICAgIGRhdGFbdGhpcy5pZF0gPSBudWxsXG4gICAgICByZXN1bHQucHVzaChkYXRhKVxuICAgIH1cblxuICAgIGRmZC5yZXNvbHZlKHJlc3VsdClcbiAgICByZXR1cm4gZGZkLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFt0aGlzLmlkXVxuICB9LFxuXG4gIGdldEZlYXR1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFsnbXVsdGlwbGUnLCAncmVnZXgnLCAnZGVsYXknXVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JIVE1MXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciB3aGVuQ2FsbFNlcXVlbnRpYWxseSA9IHJlcXVpcmUoJy4uLy4uL2Fzc2V0cy9qcXVlcnkud2hlbmNhbGxzZXF1ZW50aWFsbHknKVxudmFyIEJhc2U2NCA9IHJlcXVpcmUoJy4uLy4uL2Fzc2V0cy9iYXNlNjQnKVxudmFyIFNlbGVjdG9ySW1hZ2UgPSB7XG4gIGNhblJldHVybk11bHRpcGxlUmVjb3JkczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUNoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZGZkID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICAgIHZhciBlbGVtZW50cyA9IHRoaXMuZ2V0RGF0YUVsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG5cbiAgICB2YXIgZGVmZXJyZWREYXRhQ2FsbHMgPSBbXVxuICAgIHRoaXMuJChlbGVtZW50cykuZWFjaChmdW5jdGlvbiAoaSwgZWxlbWVudCkge1xuICAgICAgZGVmZXJyZWREYXRhQ2FsbHMucHVzaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkZWZlcnJlZERhdGEgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgICAgIHZhciBkYXRhID0ge31cbiAgICAgICAgZGF0YVt0aGlzLmlkICsgJy1zcmMnXSA9IGVsZW1lbnQuc3JjXG5cblx0XHRcdFx0Ly8gZG93bmxvYWQgaW1hZ2UgaWYgcmVxdWlyZWRcbiAgICAgICAgaWYgKCF0aGlzLmRvd25sb2FkSW1hZ2UpIHtcbiAgICAgICAgICBkZWZlcnJlZERhdGEucmVzb2x2ZShkYXRhKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBkZWZlcnJlZEltYWdlQmFzZTY0ID0gdGhpcy5kb3dubG9hZEltYWdlQmFzZTY0KGVsZW1lbnQuc3JjKVxuXG4gICAgICAgICAgZGVmZXJyZWRJbWFnZUJhc2U2NC5kb25lKGZ1bmN0aW9uIChpbWFnZVJlc3BvbnNlKSB7XG4gICAgICAgICAgICBkYXRhWydfaW1hZ2VCYXNlNjQtJyArIHRoaXMuaWRdID0gaW1hZ2VSZXNwb25zZS5pbWFnZUJhc2U2NFxuICAgICAgICAgICAgZGF0YVsnX2ltYWdlTWltZVR5cGUtJyArIHRoaXMuaWRdID0gaW1hZ2VSZXNwb25zZS5taW1lVHlwZVxuXG4gICAgICAgICAgICBkZWZlcnJlZERhdGEucmVzb2x2ZShkYXRhKVxuICAgICAgICAgIH0uYmluZCh0aGlzKSkuZmFpbChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHQvLyBmYWlsZWQgdG8gZG93bmxvYWQgaW1hZ2UgY29udGludWUuXG5cdFx0XHRcdFx0XHQvLyBAVE9ETyBoYW5kbGUgZXJycm9yXG4gICAgICAgICAgICBkZWZlcnJlZERhdGEucmVzb2x2ZShkYXRhKVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZGVmZXJyZWREYXRhLnByb21pc2UoKVxuICAgICAgfS5iaW5kKHRoaXMpKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIHdoZW5DYWxsU2VxdWVudGlhbGx5KGRlZmVycmVkRGF0YUNhbGxzKS5kb25lKGZ1bmN0aW9uIChkYXRhUmVzdWx0cykge1xuICAgICAgaWYgKHRoaXMubXVsdGlwbGUgPT09IGZhbHNlICYmIGVsZW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICAgIGRhdGFbdGhpcy5pZCArICctc3JjJ10gPSBudWxsXG4gICAgICAgIGRhdGFSZXN1bHRzLnB1c2goZGF0YSlcbiAgICAgIH1cblxuICAgICAgZGZkLnJlc29sdmUoZGF0YVJlc3VsdHMpXG4gICAgfSlcblxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG4gIH0sXG5cbiAgZG93bmxvYWRGaWxlQXNCbG9iOiBmdW5jdGlvbiAodXJsKSB7XG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAodGhpcy5yZWFkeVN0YXRlID09IDQpIHtcbiAgICAgICAgaWYgKHRoaXMuc3RhdHVzID09IDIwMCkge1xuICAgICAgICAgIHZhciBibG9iID0gdGhpcy5yZXNwb25zZVxuICAgICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZShibG9iKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVqZWN0KHhoci5zdGF0dXNUZXh0KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHhoci5vcGVuKCdHRVQnLCB1cmwpXG4gICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdibG9iJ1xuICAgIHhoci5zZW5kKClcblxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG4gIGRvd25sb2FkSW1hZ2VCYXNlNjQ6IGZ1bmN0aW9uICh1cmwpIHtcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIGRlZmVycmVkRG93bmxvYWQgPSB0aGlzLmRvd25sb2FkRmlsZUFzQmxvYih1cmwpXG4gICAgZGVmZXJyZWREb3dubG9hZC5kb25lKGZ1bmN0aW9uIChibG9iKSB7XG4gICAgICB2YXIgbWltZVR5cGUgPSBibG9iLnR5cGVcbiAgICAgIHZhciBkZWZlcnJlZEJsb2IgPSBCYXNlNjQuYmxvYlRvQmFzZTY0KGJsb2IpXG4gICAgICBkZWZlcnJlZEJsb2IuZG9uZShmdW5jdGlvbiAoaW1hZ2VCYXNlNjQpIHtcbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKHtcbiAgICAgICAgICBtaW1lVHlwZTogbWltZVR5cGUsXG4gICAgICAgICAgaW1hZ2VCYXNlNjQ6IGltYWdlQmFzZTY0XG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0pLmZhaWwoZGVmZXJyZWRSZXNwb25zZS5mYWlsKVxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFt0aGlzLmlkICsgJy1zcmMnXVxuICB9LFxuXG4gIGdldEZlYXR1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFsnbXVsdGlwbGUnLCAnZGVsYXknLCAnZG93bmxvYWRJbWFnZSddXG4gIH0sXG5cbiAgZ2V0SXRlbUNTU1NlbGVjdG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICdpbWcnXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvckltYWdlXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciB3aGVuQ2FsbFNlcXVlbnRpYWxseSA9IHJlcXVpcmUoJy4uLy4uL2Fzc2V0cy9qcXVlcnkud2hlbmNhbGxzZXF1ZW50aWFsbHknKVxuXG52YXIgU2VsZWN0b3JMaW5rID0ge1xuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBlbGVtZW50cyA9IHRoaXMuZ2V0RGF0YUVsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG4gICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICB2YXIgZGZkID0ganF1ZXJ5LkRlZmVycmVkKClcblxuXHRcdC8vIHJldHVybiBlbXB0eSByZWNvcmQgaWYgbm90IG11bHRpcGxlIHR5cGUgYW5kIG5vIGVsZW1lbnRzIGZvdW5kXG4gICAgaWYgKHRoaXMubXVsdGlwbGUgPT09IGZhbHNlICYmIGVsZW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuICAgICAgZGF0YVt0aGlzLmlkXSA9IG51bGxcbiAgICAgIGRmZC5yZXNvbHZlKFtkYXRhXSlcbiAgICAgIHJldHVybiBkZmRcbiAgICB9XG5cblx0XHQvLyBleHRyYWN0IGxpbmtzIG9uZSBieSBvbmVcbiAgICB2YXIgZGVmZXJyZWREYXRhRXh0cmFjdGlvbkNhbGxzID0gW11cbiAgICBzZWxmLiQoZWxlbWVudHMpLmVhY2goZnVuY3Rpb24gKGssIGVsZW1lbnQpIHtcbiAgICAgIGRlZmVycmVkRGF0YUV4dHJhY3Rpb25DYWxscy5wdXNoKGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIHZhciBkZWZlcnJlZERhdGEgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgICAgIHZhciBkYXRhID0ge31cbiAgICAgICAgZGF0YVt0aGlzLmlkXSA9IHNlbGYuJChlbGVtZW50KS50ZXh0KClcbiAgICAgICAgZGF0YS5fZm9sbG93U2VsZWN0b3JJZCA9IHRoaXMuaWRcbiAgICAgICAgZGF0YVt0aGlzLmlkICsgJy1ocmVmJ10gPSBlbGVtZW50LmhyZWZcbiAgICAgICAgZGF0YS5fZm9sbG93ID0gZWxlbWVudC5ocmVmXG4gICAgICAgIGRlZmVycmVkRGF0YS5yZXNvbHZlKGRhdGEpXG5cbiAgICAgICAgcmV0dXJuIGRlZmVycmVkRGF0YVxuICAgICAgfS5iaW5kKHRoaXMsIGVsZW1lbnQpKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIHdoZW5DYWxsU2VxdWVudGlhbGx5KGRlZmVycmVkRGF0YUV4dHJhY3Rpb25DYWxscykuZG9uZShmdW5jdGlvbiAocmVzcG9uc2VzKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW11cbiAgICAgIHJlc3BvbnNlcy5mb3JFYWNoKGZ1bmN0aW9uIChkYXRhUmVzdWx0KSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKGRhdGFSZXN1bHQpXG4gICAgICB9KVxuICAgICAgZGZkLnJlc29sdmUocmVzdWx0KVxuICAgIH0pXG5cbiAgICByZXR1cm4gZGZkLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFt0aGlzLmlkLCB0aGlzLmlkICsgJy1ocmVmJ11cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2RlbGF5J11cbiAgfSxcblxuICBnZXRJdGVtQ1NTU2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gJ2EnXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvckxpbmtcbiIsInZhciB3aGVuQ2FsbFNlcXVlbnRpYWxseSA9IHJlcXVpcmUoJy4uLy4uL2Fzc2V0cy9qcXVlcnkud2hlbmNhbGxzZXF1ZW50aWFsbHknKVxudmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgQ3NzU2VsZWN0b3IgPSByZXF1aXJlKCdjc3Mtc2VsZWN0b3InKS5Dc3NTZWxlY3RvclxudmFyIFNlbGVjdG9yUG9wdXBMaW5rID0ge1xuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcblxuICAgIHZhciBkZmQgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG5cdFx0Ly8gcmV0dXJuIGVtcHR5IHJlY29yZCBpZiBub3QgbXVsdGlwbGUgdHlwZSBhbmQgbm8gZWxlbWVudHMgZm91bmRcbiAgICBpZiAodGhpcy5tdWx0aXBsZSA9PT0gZmFsc2UgJiYgZWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICBkYXRhW3RoaXMuaWRdID0gbnVsbFxuICAgICAgZGZkLnJlc29sdmUoW2RhdGFdKVxuICAgICAgcmV0dXJuIGRmZFxuICAgIH1cblxuXHRcdC8vIGV4dHJhY3QgbGlua3Mgb25lIGJ5IG9uZVxuICAgIHZhciBkZWZlcnJlZERhdGFFeHRyYWN0aW9uQ2FsbHMgPSBbXVxuICAgICQoZWxlbWVudHMpLmVhY2goZnVuY3Rpb24gKGssIGVsZW1lbnQpIHtcbiAgICAgIGRlZmVycmVkRGF0YUV4dHJhY3Rpb25DYWxscy5wdXNoKGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIHZhciBkZWZlcnJlZERhdGEgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgICAgIHZhciBkYXRhID0ge31cbiAgICAgICAgZGF0YVt0aGlzLmlkXSA9ICQoZWxlbWVudCkudGV4dCgpXG4gICAgICAgIGRhdGEuX2ZvbGxvd1NlbGVjdG9ySWQgPSB0aGlzLmlkXG5cbiAgICAgICAgdmFyIGRlZmVycmVkUG9wdXBVUkwgPSB0aGlzLmdldFBvcHVwVVJMKGVsZW1lbnQpXG4gICAgICAgIGRlZmVycmVkUG9wdXBVUkwuZG9uZShmdW5jdGlvbiAodXJsKSB7XG4gICAgICAgICAgZGF0YVt0aGlzLmlkICsgJy1ocmVmJ10gPSB1cmxcbiAgICAgICAgICBkYXRhLl9mb2xsb3cgPSB1cmxcbiAgICAgICAgICBkZWZlcnJlZERhdGEucmVzb2x2ZShkYXRhKVxuICAgICAgICB9LmJpbmQodGhpcykpXG5cbiAgICAgICAgcmV0dXJuIGRlZmVycmVkRGF0YVxuICAgICAgfS5iaW5kKHRoaXMsIGVsZW1lbnQpKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIHdoZW5DYWxsU2VxdWVudGlhbGx5KGRlZmVycmVkRGF0YUV4dHJhY3Rpb25DYWxscykuZG9uZShmdW5jdGlvbiAocmVzcG9uc2VzKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW11cbiAgICAgIHJlc3BvbnNlcy5mb3JFYWNoKGZ1bmN0aW9uIChkYXRhUmVzdWx0KSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKGRhdGFSZXN1bHQpXG4gICAgICB9KVxuICAgICAgZGZkLnJlc29sdmUocmVzdWx0KVxuICAgIH0pXG5cbiAgICByZXR1cm4gZGZkLnByb21pc2UoKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBHZXRzIGFuIHVybCBmcm9tIGEgd2luZG93Lm9wZW4gY2FsbCBieSBtb2NraW5nIHRoZSB3aW5kb3cub3BlbiBmdW5jdGlvblxuXHQgKiBAcGFyYW0gZWxlbWVudFxuXHQgKiBAcmV0dXJucyAkLkRlZmVycmVkKClcblx0ICovXG4gIGdldFBvcHVwVVJMOiBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIGRvY3VtZW50ID0gdGhpcy5kb2N1bWVudFxuICAgIC8vIG92ZXJyaWRlIHdpbmRvdy5vcGVuIGZ1bmN0aW9uLiB3ZSBuZWVkIHRvIGV4ZWN1dGUgdGhpcyBpbiBwYWdlIHNjb3BlLlxuXHRcdC8vIHdlIG5lZWQgdG8ga25vdyBob3cgdG8gZmluZCB0aGlzIGVsZW1lbnQgZnJvbSBwYWdlIHNjb3BlLlxuICAgIHZhciBjcyA9IG5ldyBDc3NTZWxlY3Rvcih7XG4gICAgICBlbmFibGVTbWFydFRhYmxlU2VsZWN0b3I6IGZhbHNlLFxuICAgICAgcGFyZW50OiBkb2N1bWVudC5ib2R5LFxuICAgICAgZW5hYmxlUmVzdWx0U3RyaXBwaW5nOiBmYWxzZVxuICAgIH0pXG4gICAgdmFyIGNzc1NlbGVjdG9yID0gY3MuZ2V0Q3NzU2VsZWN0b3IoW2VsZW1lbnRdKVxuICAgIGNvbnNvbGUubG9nKGNzc1NlbGVjdG9yKVxuICAgIGNvbnNvbGUubG9nKGRvY3VtZW50LmJvZHkucXVlcnlTZWxlY3RvckFsbChjc3NTZWxlY3RvcikpXG5cdFx0Ly8gdGhpcyBmdW5jdGlvbiB3aWxsIGNhdGNoIHdpbmRvdy5vcGVuIGNhbGwgYW5kIHBsYWNlIHRoZSByZXF1ZXN0ZWQgdXJsIGFzIHRoZSBlbGVtZW50cyBkYXRhIGF0dHJpYnV0ZVxuICAgIHZhciBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKVxuICAgIHNjcmlwdC50eXBlID0gJ3RleHQvamF2YXNjcmlwdCdcbiAgICBjb25zb2xlLmxvZyhjc3NTZWxlY3RvcilcbiAgICBjb25zb2xlLmxvZyhkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKGNzc1NlbGVjdG9yKSlcbiAgICBzY3JpcHQudGV4dCA9IGBcblx0XHRcdChmdW5jdGlvbigpe1xuICAgICAgICB2YXIgb3BlbiA9IHdpbmRvdy5vcGVuO1xuICAgICAgICB2YXIgZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcke2Nzc1NlbGVjdG9yfScpWzBdO1xuICAgICAgICB2YXIgb3Blbk5ldyA9IGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgICB2YXIgdXJsID0gYXJndW1lbnRzWzBdOyBcbiAgICAgICAgICBlbC5kYXRhc2V0LndlYlNjcmFwZXJFeHRyYWN0VXJsID0gdXJsOyBcbiAgICAgICAgICB3aW5kb3cub3BlbiA9IG9wZW47IFxuICAgICAgICB9O1xuICAgICAgICB3aW5kb3cub3BlbiA9IG9wZW5OZXc7IFxuICAgICAgICBlbC5jbGljaygpOyBcblx0XHRcdH0pKClgXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzY3JpcHQpXG5cblx0XHQvLyB3YWl0IGZvciB1cmwgdG8gYmUgYXZhaWxhYmxlXG4gICAgdmFyIGRlZmVycmVkVVJMID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgdGltZW91dCA9IE1hdGguYWJzKDUwMDAgLyAzMCkgLy8gNXMgdGltZW91dCB0byBnZW5lcmF0ZSBhbiB1cmwgZm9yIHBvcHVwXG4gICAgdmFyIGludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHVybCA9ICQoZWxlbWVudCkuZGF0YSgnd2ViLXNjcmFwZXItZXh0cmFjdC11cmwnKVxuICAgICAgaWYgKHVybCkge1xuICAgICAgICBkZWZlcnJlZFVSTC5yZXNvbHZlKHVybClcbiAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbClcbiAgICAgICAgc2NyaXB0LnJlbW92ZSgpXG4gICAgICB9XG5cdFx0XHQvLyB0aW1lb3V0IHBvcHVwIG9wZW5pbmdcbiAgICAgIGlmICh0aW1lb3V0LS0gPD0gMCkge1xuICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKVxuICAgICAgICBzY3JpcHQucmVtb3ZlKClcbiAgICAgIH1cbiAgICB9LCAzMClcblxuICAgIHJldHVybiBkZWZlcnJlZFVSTC5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbdGhpcy5pZCwgdGhpcy5pZCArICctaHJlZiddXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydtdWx0aXBsZScsICdkZWxheSddXG4gIH0sXG5cbiAgZ2V0SXRlbUNTU1NlbGVjdG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICcqJ1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JQb3B1cExpbmtcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxuXG52YXIgU2VsZWN0b3JUYWJsZSA9IHtcblxuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgZ2V0VGFibGVIZWFkZXJDb2x1bW5zOiBmdW5jdGlvbiAoJHRhYmxlKSB7XG4gICAgdmFyIGNvbHVtbnMgPSB7fVxuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIGhlYWRlclJvd1NlbGVjdG9yID0gdGhpcy5nZXRUYWJsZUhlYWRlclJvd1NlbGVjdG9yKClcbiAgICB2YXIgJGhlYWRlclJvdyA9ICQoJHRhYmxlKS5maW5kKGhlYWRlclJvd1NlbGVjdG9yKVxuICAgIGlmICgkaGVhZGVyUm93Lmxlbmd0aCA+IDApIHtcbiAgICAgICRoZWFkZXJSb3cuZmluZCgndGQsdGgnKS5lYWNoKGZ1bmN0aW9uIChpKSB7XG4gICAgICAgIHZhciBoZWFkZXIgPSAkKHRoaXMpLnRleHQoKS50cmltKClcbiAgICAgICAgY29sdW1uc1toZWFkZXJdID0ge1xuICAgICAgICAgIGluZGV4OiBpICsgMVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgICByZXR1cm4gY29sdW1uc1xuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZGZkID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgJCA9IHRoaXMuJFxuXG4gICAgdmFyIHRhYmxlcyA9IHRoaXMuZ2V0RGF0YUVsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG5cbiAgICB2YXIgcmVzdWx0ID0gW11cbiAgICAkKHRhYmxlcykuZWFjaChmdW5jdGlvbiAoaywgdGFibGUpIHtcbiAgICAgIHZhciBjb2x1bW5zID0gdGhpcy5nZXRUYWJsZUhlYWRlckNvbHVtbnMoJCh0YWJsZSkpXG5cbiAgICAgIHZhciBkYXRhUm93U2VsZWN0b3IgPSB0aGlzLmdldFRhYmxlRGF0YVJvd1NlbGVjdG9yKClcbiAgICAgICQodGFibGUpLmZpbmQoZGF0YVJvd1NlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uIChpLCByb3cpIHtcbiAgICAgICAgdmFyIGRhdGEgPSB7fVxuICAgICAgICB0aGlzLmNvbHVtbnMuZm9yRWFjaChmdW5jdGlvbiAoY29sdW1uKSB7XG4gICAgICAgICAgaWYgKGNvbHVtbi5leHRyYWN0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICBpZiAoY29sdW1uc1tjb2x1bW4uaGVhZGVyXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIGRhdGFbY29sdW1uLm5hbWVdID0gbnVsbFxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdmFyIHJvd1RleHQgPSAkKHJvdykuZmluZCgnPjpudGgtY2hpbGQoJyArIGNvbHVtbnNbY29sdW1uLmhlYWRlcl0uaW5kZXggKyAnKScpLnRleHQoKS50cmltKClcbiAgICAgICAgICAgICAgZGF0YVtjb2x1bW4ubmFtZV0gPSByb3dUZXh0XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICByZXN1bHQucHVzaChkYXRhKVxuICAgICAgfS5iaW5kKHRoaXMpKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIGRmZC5yZXNvbHZlKHJlc3VsdClcbiAgICByZXR1cm4gZGZkLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGRhdGFDb2x1bW5zID0gW11cbiAgICB0aGlzLmNvbHVtbnMuZm9yRWFjaChmdW5jdGlvbiAoY29sdW1uKSB7XG4gICAgICBpZiAoY29sdW1uLmV4dHJhY3QgPT09IHRydWUpIHtcbiAgICAgICAgZGF0YUNvbHVtbnMucHVzaChjb2x1bW4ubmFtZSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBkYXRhQ29sdW1uc1xuICB9LFxuXG4gIGdldEZlYXR1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFsnbXVsdGlwbGUnLCAnY29sdW1ucycsICdkZWxheScsICd0YWJsZURhdGFSb3dTZWxlY3RvcicsICd0YWJsZUhlYWRlclJvd1NlbGVjdG9yJ11cbiAgfSxcblxuICBnZXRJdGVtQ1NTU2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gJ3RhYmxlJ1xuICB9LFxuXG4gIGdldFRhYmxlSGVhZGVyUm93U2VsZWN0b3JGcm9tVGFibGVIVE1MOiBmdW5jdGlvbiAoaHRtbCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdmFyICQgPSBvcHRpb25zLiQgfHwgdGhpcy4kXG4gICAgdmFyICR0YWJsZSA9ICQoaHRtbClcbiAgICBpZiAoJHRhYmxlLmZpbmQoJ3RoZWFkIHRyOmhhcyh0ZDpub3QoOmVtcHR5KSksIHRoZWFkIHRyOmhhcyh0aDpub3QoOmVtcHR5KSknKS5sZW5ndGgpIHtcbiAgICAgIGlmICgkdGFibGUuZmluZCgndGhlYWQgdHInKS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmV0dXJuICd0aGVhZCB0cidcbiAgICAgIH1cdFx0XHRlbHNlIHtcbiAgICAgICAgdmFyICRyb3dzID0gJHRhYmxlLmZpbmQoJ3RoZWFkIHRyJylcblx0XHRcdFx0Ly8gZmlyc3Qgcm93IHdpdGggZGF0YVxuICAgICAgICB2YXIgcm93SW5kZXggPSAkcm93cy5pbmRleCgkcm93cy5maWx0ZXIoJzpoYXModGQ6bm90KDplbXB0eSkpLDpoYXModGg6bm90KDplbXB0eSkpJylbMF0pXG4gICAgICAgIHJldHVybiAndGhlYWQgdHI6bnRoLW9mLXR5cGUoJyArIChyb3dJbmRleCArIDEpICsgJyknXG4gICAgICB9XG4gICAgfVx0XHRlbHNlIGlmICgkdGFibGUuZmluZCgndHIgdGQ6bm90KDplbXB0eSksIHRyIHRoOm5vdCg6ZW1wdHkpJykubGVuZ3RoKSB7XG4gICAgICB2YXIgJHJvd3MgPSAkdGFibGUuZmluZCgndHInKVxuXHRcdFx0Ly8gZmlyc3Qgcm93IHdpdGggZGF0YVxuICAgICAgdmFyIHJvd0luZGV4ID0gJHJvd3MuaW5kZXgoJHJvd3MuZmlsdGVyKCc6aGFzKHRkOm5vdCg6ZW1wdHkpKSw6aGFzKHRoOm5vdCg6ZW1wdHkpKScpWzBdKVxuICAgICAgcmV0dXJuICd0cjpudGgtb2YtdHlwZSgnICsgKHJvd0luZGV4ICsgMSkgKyAnKSdcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgcmV0dXJuICcnXG4gICAgfVxuICB9LFxuXG4gIGdldFRhYmxlRGF0YVJvd1NlbGVjdG9yRnJvbVRhYmxlSFRNTDogZnVuY3Rpb24gKGh0bWwsIG9wdGlvbnMgPSB7fSkge1xuICAgIHZhciAkID0gb3B0aW9ucy4kIHx8IHRoaXMuJFxuICAgIHZhciAkdGFibGUgPSAkKGh0bWwpXG4gICAgaWYgKCR0YWJsZS5maW5kKCd0aGVhZCB0cjpoYXModGQ6bm90KDplbXB0eSkpLCB0aGVhZCB0cjpoYXModGg6bm90KDplbXB0eSkpJykubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gJ3Rib2R5IHRyJ1xuICAgIH1cdFx0ZWxzZSBpZiAoJHRhYmxlLmZpbmQoJ3RyIHRkOm5vdCg6ZW1wdHkpLCB0ciB0aDpub3QoOmVtcHR5KScpLmxlbmd0aCkge1xuICAgICAgdmFyICRyb3dzID0gJHRhYmxlLmZpbmQoJ3RyJylcblx0XHRcdC8vIGZpcnN0IHJvdyB3aXRoIGRhdGFcbiAgICAgIHZhciByb3dJbmRleCA9ICRyb3dzLmluZGV4KCRyb3dzLmZpbHRlcignOmhhcyh0ZDpub3QoOmVtcHR5KSksOmhhcyh0aDpub3QoOmVtcHR5KSknKVswXSlcbiAgICAgIHJldHVybiAndHI6bnRoLW9mLXR5cGUobisnICsgKHJvd0luZGV4ICsgMikgKyAnKSdcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgcmV0dXJuICcnXG4gICAgfVxuICB9LFxuXG4gIGdldFRhYmxlSGVhZGVyUm93U2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcblx0XHQvLyBoYW5kbGUgbGVnYWN5IHNlbGVjdG9yc1xuICAgIGlmICh0aGlzLnRhYmxlSGVhZGVyUm93U2VsZWN0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuICd0aGVhZCB0cidcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMudGFibGVIZWFkZXJSb3dTZWxlY3RvclxuICAgIH1cbiAgfSxcblxuICBnZXRUYWJsZURhdGFSb3dTZWxlY3RvcjogZnVuY3Rpb24gKCkge1xuXHRcdC8vIGhhbmRsZSBsZWdhY3kgc2VsZWN0b3JzXG4gICAgaWYgKHRoaXMudGFibGVEYXRhUm93U2VsZWN0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuICd0Ym9keSB0cidcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMudGFibGVEYXRhUm93U2VsZWN0b3JcbiAgICB9XG4gIH0sXG5cblx0LyoqXG5cdCAqIEV4dHJhY3QgdGFibGUgaGVhZGVyIGNvbHVtbiBpbmZvIGZyb20gaHRtbFxuXHQgKiBAcGFyYW0gaHRtbFxuXHQgKi9cbiAgZ2V0VGFibGVIZWFkZXJDb2x1bW5zRnJvbUhUTUw6IGZ1bmN0aW9uIChoZWFkZXJSb3dTZWxlY3RvciwgaHRtbCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdmFyICQgPSBvcHRpb25zLiQgfHwgdGhpcy4kXG4gICAgdmFyICR0YWJsZSA9ICQoaHRtbClcbiAgICB2YXIgJGhlYWRlclJvd0NvbHVtbnMgPSAkdGFibGUuZmluZChoZWFkZXJSb3dTZWxlY3RvcikuZmluZCgndGQsdGgnKVxuXG4gICAgdmFyIGNvbHVtbnMgPSBbXVxuXG4gICAgJGhlYWRlclJvd0NvbHVtbnMuZWFjaChmdW5jdGlvbiAoaSwgY29sdW1uRWwpIHtcbiAgICAgIHZhciBoZWFkZXIgPSAkKGNvbHVtbkVsKS50ZXh0KCkudHJpbSgpXG4gICAgICB2YXIgbmFtZSA9IGhlYWRlclxuICAgICAgaWYgKGhlYWRlci5sZW5ndGggIT09IDApIHtcbiAgICAgICAgY29sdW1ucy5wdXNoKHtcbiAgICAgICAgICBoZWFkZXI6IGhlYWRlcixcbiAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgIGV4dHJhY3Q6IHRydWVcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBjb2x1bW5zXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvclRhYmxlXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciBTZWxlY3RvclRleHQgPSB7XG5cbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5IYXZlTG9jYWxDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkNyZWF0ZU5ld0pvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuXG4gICAgdmFyIHJlc3VsdCA9IFtdXG4gICAgJChlbGVtZW50cykuZWFjaChmdW5jdGlvbiAoaywgZWxlbWVudCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuXG5cdFx0XHQvLyByZW1vdmUgc2NyaXB0LCBzdHlsZSB0YWcgY29udGVudHMgZnJvbSB0ZXh0IHJlc3VsdHNcbiAgICAgIHZhciAkZWxlbWVudF9jbG9uZSA9ICQoZWxlbWVudCkuY2xvbmUoKVxuICAgICAgJGVsZW1lbnRfY2xvbmUuZmluZCgnc2NyaXB0LCBzdHlsZScpLnJlbW92ZSgpXG5cdFx0XHQvLyA8YnI+IHJlcGxhY2UgYnIgdGFncyB3aXRoIG5ld2xpbmVzXG4gICAgICAkZWxlbWVudF9jbG9uZS5maW5kKCdicicpLmFmdGVyKCdcXG4nKVxuXG4gICAgICB2YXIgdGV4dCA9ICRlbGVtZW50X2Nsb25lLnRleHQoKVxuICAgICAgaWYgKHRoaXMucmVnZXggIT09IHVuZGVmaW5lZCAmJiB0aGlzLnJlZ2V4Lmxlbmd0aCkge1xuICAgICAgICB2YXIgbWF0Y2hlcyA9IHRleHQubWF0Y2gobmV3IFJlZ0V4cCh0aGlzLnJlZ2V4KSlcbiAgICAgICAgaWYgKG1hdGNoZXMgIT09IG51bGwpIHtcbiAgICAgICAgICB0ZXh0ID0gbWF0Y2hlc1swXVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRleHQgPSBudWxsXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGRhdGFbdGhpcy5pZF0gPSB0ZXh0XG5cbiAgICAgIHJlc3VsdC5wdXNoKGRhdGEpXG4gICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgaWYgKHRoaXMubXVsdGlwbGUgPT09IGZhbHNlICYmIGVsZW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuICAgICAgZGF0YVt0aGlzLmlkXSA9IG51bGxcbiAgICAgIHJlc3VsdC5wdXNoKGRhdGEpXG4gICAgfVxuXG4gICAgZGZkLnJlc29sdmUocmVzdWx0KVxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW3RoaXMuaWRdXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydtdWx0aXBsZScsICdyZWdleCcsICdkZWxheSddXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvclRleHRcbiIsInZhciBTZWxlY3RvciA9IHJlcXVpcmUoJy4vU2VsZWN0b3InKVxuXG52YXIgU2VsZWN0b3JMaXN0ID0gZnVuY3Rpb24gKHNlbGVjdG9ycywgb3B0aW9ucykge1xuICB2YXIgJCA9IG9wdGlvbnMuJFxuICB2YXIgZG9jdW1lbnQgPSBvcHRpb25zLmRvY3VtZW50XG4gIHZhciB3aW5kb3cgPSBvcHRpb25zLndpbmRvd1xuICAvLyBXZSBkb24ndCB3YW50IGVudW1lcmFibGUgcHJvcGVydGllc1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJyQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7cmV0dXJuICR9LFxuICAgIGVudW1lcmFibGU6IGZhbHNlXG4gIH0pXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnd2luZG93Jywge1xuICAgIGdldDogZnVuY3Rpb24gKCkge3JldHVybiB3aW5kb3d9LFxuICAgIGVudW1lcmFibGU6IGZhbHNlXG4gIH0pXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnZG9jdW1lbnQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7cmV0dXJuIGRvY3VtZW50fSxcbiAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICB9KVxuICBpZiAoIW9wdGlvbnMuJCkgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIGpxdWVyeScpXG5cbiAgaWYgKHNlbGVjdG9ycyA9PT0gbnVsbCB8fCBzZWxlY3RvcnMgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVyblxuICB9XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWxlY3RvcnMubGVuZ3RoOyBpKyspIHtcbiAgICB0aGlzLnB1c2goc2VsZWN0b3JzW2ldKVxuICB9XG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUgPSBbXVxuXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgaWYgKCF0aGlzLmhhc1NlbGVjdG9yKHNlbGVjdG9yLmlkKSkge1xuICAgIGlmICghKHNlbGVjdG9yIGluc3RhbmNlb2YgU2VsZWN0b3IpKSB7XG4gICAgICBzZWxlY3RvciA9IG5ldyBTZWxlY3RvcihzZWxlY3RvciwgeyQ6IHRoaXMuJH0pXG4gICAgfVxuICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmNhbGwodGhpcywgc2VsZWN0b3IpXG4gIH1cbn1cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5oYXNTZWxlY3RvciA9IGZ1bmN0aW9uIChzZWxlY3RvcklkKSB7XG4gIGlmIChzZWxlY3RvcklkIGluc3RhbmNlb2YgT2JqZWN0KSB7XG4gICAgc2VsZWN0b3JJZCA9IHNlbGVjdG9ySWQuaWRcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xuICAgIGlmICh0aGlzW2ldLmlkID09PSBzZWxlY3RvcklkKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2Vcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFsbCBzZWxlY3RvcnMgb3IgcmVjdXJzaXZlbHkgZmluZCBhbmQgcmV0dXJuIGFsbCBjaGlsZCBzZWxlY3RvcnMgb2YgYSBwYXJlbnQgc2VsZWN0b3IuXG4gKiBAcGFyYW0gcGFyZW50U2VsZWN0b3JJZFxuICogQHJldHVybnMge0FycmF5fVxuICovXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmdldEFsbFNlbGVjdG9ycyA9IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3RvcklkKSB7XG4gIGlmIChwYXJlbnRTZWxlY3RvcklkID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgdmFyIGdldEFsbENoaWxkU2VsZWN0b3JzID0gZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9ySWQsIHJlc3VsdFNlbGVjdG9ycykge1xuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgIGlmIChzZWxlY3Rvci5oYXNQYXJlbnRTZWxlY3RvcihwYXJlbnRTZWxlY3RvcklkKSkge1xuICAgICAgICBpZiAocmVzdWx0U2VsZWN0b3JzLmluZGV4T2Yoc2VsZWN0b3IpID09PSAtMSkge1xuICAgICAgICAgIHJlc3VsdFNlbGVjdG9ycy5wdXNoKHNlbGVjdG9yKVxuICAgICAgICAgIGdldEFsbENoaWxkU2VsZWN0b3JzKHNlbGVjdG9yLmlkLCByZXN1bHRTZWxlY3RvcnMpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICB9LmJpbmQodGhpcylcblxuICB2YXIgcmVzdWx0U2VsZWN0b3JzID0gW11cbiAgZ2V0QWxsQ2hpbGRTZWxlY3RvcnMocGFyZW50U2VsZWN0b3JJZCwgcmVzdWx0U2VsZWN0b3JzKVxuICByZXR1cm4gcmVzdWx0U2VsZWN0b3JzXG59XG5cbi8qKlxuICogUmV0dXJucyBvbmx5IHNlbGVjdG9ycyB0aGF0IGFyZSBkaXJlY3RseSB1bmRlciBhIHBhcmVudFxuICogQHBhcmFtIHBhcmVudFNlbGVjdG9ySWRcbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqL1xuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5nZXREaXJlY3RDaGlsZFNlbGVjdG9ycyA9IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3RvcklkKSB7XG4gIHZhciByZXN1bHRTZWxlY3RvcnMgPSBuZXcgU2VsZWN0b3JMaXN0KG51bGwsIHskOiB0aGlzLiR9KVxuICB0aGlzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgaWYgKHNlbGVjdG9yLmhhc1BhcmVudFNlbGVjdG9yKHBhcmVudFNlbGVjdG9ySWQpKSB7XG4gICAgICByZXN1bHRTZWxlY3RvcnMucHVzaChzZWxlY3RvcilcbiAgICB9XG4gIH0pXG4gIHJldHVybiByZXN1bHRTZWxlY3RvcnNcbn1cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHJlc3VsdExpc3QgPSBuZXcgU2VsZWN0b3JMaXN0KG51bGwsIHskOiB0aGlzLiR9KVxuICB0aGlzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgcmVzdWx0TGlzdC5wdXNoKHNlbGVjdG9yKVxuICB9KVxuICByZXR1cm4gcmVzdWx0TGlzdFxufVxuXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmZ1bGxDbG9uZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHJlc3VsdExpc3QgPSBuZXcgU2VsZWN0b3JMaXN0KG51bGwsIHskOiB0aGlzLiR9KVxuICB0aGlzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgcmVzdWx0TGlzdC5wdXNoKEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoc2VsZWN0b3IpKSlcbiAgfSlcbiAgcmV0dXJuIHJlc3VsdExpc3Rcbn1cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5jb25jYXQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciByZXN1bHRMaXN0ID0gdGhpcy5jbG9uZSgpXG4gIGZvciAodmFyIGkgaW4gYXJndW1lbnRzKSB7XG4gICAgYXJndW1lbnRzW2ldLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICByZXN1bHRMaXN0LnB1c2goc2VsZWN0b3IpXG4gICAgfSlcbiAgfVxuICByZXR1cm4gcmVzdWx0TGlzdFxufVxuXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmdldFNlbGVjdG9yID0gZnVuY3Rpb24gKHNlbGVjdG9ySWQpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHNlbGVjdG9yID0gdGhpc1tpXVxuICAgIGlmIChzZWxlY3Rvci5pZCA9PT0gc2VsZWN0b3JJZCkge1xuICAgICAgcmV0dXJuIHNlbGVjdG9yXG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogUmV0dXJucyBhbGwgc2VsZWN0b3JzIGlmIHRoaXMgc2VsZWN0b3JzIGluY2x1ZGluZyBhbGwgcGFyZW50IHNlbGVjdG9ycyB3aXRoaW4gdGhpcyBwYWdlXG4gKiBAVE9ETyBub3QgdXNlZCBhbnkgbW9yZS5cbiAqIEBwYXJhbSBzZWxlY3RvcklkXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5nZXRPbmVQYWdlU2VsZWN0b3JzID0gZnVuY3Rpb24gKHNlbGVjdG9ySWQpIHtcbiAgdmFyIHJlc3VsdExpc3QgPSBuZXcgU2VsZWN0b3JMaXN0KG51bGwsIHskOiB0aGlzLiR9KVxuICB2YXIgc2VsZWN0b3IgPSB0aGlzLmdldFNlbGVjdG9yKHNlbGVjdG9ySWQpXG4gIHJlc3VsdExpc3QucHVzaCh0aGlzLmdldFNlbGVjdG9yKHNlbGVjdG9ySWQpKVxuXG5cdC8vIHJlY3Vyc2l2ZWx5IGZpbmQgYWxsIHBhcmVudCBzZWxlY3RvcnMgdGhhdCBjb3VsZCBsZWFkIHRvIHRoZSBwYWdlIHdoZXJlIHNlbGVjdG9ySWQgaXMgdXNlZC5cbiAgdmFyIGZpbmRQYXJlbnRTZWxlY3RvcnMgPSBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICBzZWxlY3Rvci5wYXJlbnRTZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAocGFyZW50U2VsZWN0b3JJZCkge1xuICAgICAgaWYgKHBhcmVudFNlbGVjdG9ySWQgPT09ICdfcm9vdCcpIHJldHVyblxuICAgICAgdmFyIHBhcmVudFNlbGVjdG9yID0gdGhpcy5nZXRTZWxlY3RvcihwYXJlbnRTZWxlY3RvcklkKVxuICAgICAgaWYgKHJlc3VsdExpc3QuaW5kZXhPZihwYXJlbnRTZWxlY3RvcikgIT09IC0xKSByZXR1cm5cbiAgICAgIGlmIChwYXJlbnRTZWxlY3Rvci53aWxsUmV0dXJuRWxlbWVudHMoKSkge1xuICAgICAgICByZXN1bHRMaXN0LnB1c2gocGFyZW50U2VsZWN0b3IpXG4gICAgICAgIGZpbmRQYXJlbnRTZWxlY3RvcnMocGFyZW50U2VsZWN0b3IpXG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LmJpbmQodGhpcylcblxuICBmaW5kUGFyZW50U2VsZWN0b3JzKHNlbGVjdG9yKVxuXG5cdC8vIGFkZCBhbGwgY2hpbGQgc2VsZWN0b3JzXG4gIHJlc3VsdExpc3QgPSByZXN1bHRMaXN0LmNvbmNhdCh0aGlzLmdldFNpbmdsZVBhZ2VBbGxDaGlsZFNlbGVjdG9ycyhzZWxlY3Rvci5pZCkpXG4gIHJldHVybiByZXN1bHRMaXN0XG59XG5cbi8qKlxuICogUmV0dXJucyBhbGwgY2hpbGQgc2VsZWN0b3JzIG9mIGEgc2VsZWN0b3Igd2hpY2ggY2FuIGJlIHVzZWQgd2l0aGluIG9uZSBwYWdlLlxuICogQHBhcmFtIHBhcmVudFNlbGVjdG9ySWRcbiAqL1xuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5nZXRTaW5nbGVQYWdlQWxsQ2hpbGRTZWxlY3RvcnMgPSBmdW5jdGlvbiAocGFyZW50U2VsZWN0b3JJZCkge1xuICB2YXIgcmVzdWx0TGlzdCA9IG5ldyBTZWxlY3Rvckxpc3QobnVsbCwgeyQ6IHRoaXMuJH0pXG4gIHZhciBhZGRDaGlsZFNlbGVjdG9ycyA9IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3Rvcikge1xuICAgIGlmIChwYXJlbnRTZWxlY3Rvci53aWxsUmV0dXJuRWxlbWVudHMoKSkge1xuICAgICAgdmFyIGNoaWxkU2VsZWN0b3JzID0gdGhpcy5nZXREaXJlY3RDaGlsZFNlbGVjdG9ycyhwYXJlbnRTZWxlY3Rvci5pZClcbiAgICAgIGNoaWxkU2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKGNoaWxkU2VsZWN0b3IpIHtcbiAgICAgICAgaWYgKHJlc3VsdExpc3QuaW5kZXhPZihjaGlsZFNlbGVjdG9yKSA9PT0gLTEpIHtcbiAgICAgICAgICByZXN1bHRMaXN0LnB1c2goY2hpbGRTZWxlY3RvcilcbiAgICAgICAgICBhZGRDaGlsZFNlbGVjdG9ycyhjaGlsZFNlbGVjdG9yKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgfS5iaW5kKHRoaXMpXG5cbiAgdmFyIHBhcmVudFNlbGVjdG9yID0gdGhpcy5nZXRTZWxlY3RvcihwYXJlbnRTZWxlY3RvcklkKVxuICBhZGRDaGlsZFNlbGVjdG9ycyhwYXJlbnRTZWxlY3RvcilcbiAgcmV0dXJuIHJlc3VsdExpc3Rcbn1cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS53aWxsUmV0dXJuTXVsdGlwbGVSZWNvcmRzID0gZnVuY3Rpb24gKHNlbGVjdG9ySWQpIHtcblx0Ly8gaGFuZGxlIHJldXFlc3RlZCBzZWxlY3RvclxuICB2YXIgc2VsZWN0b3IgPSB0aGlzLmdldFNlbGVjdG9yKHNlbGVjdG9ySWQpXG4gIGlmIChzZWxlY3Rvci53aWxsUmV0dXJuTXVsdGlwbGVSZWNvcmRzKCkgPT09IHRydWUpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG5cblx0Ly8gaGFuZGxlIGFsbCBpdHMgY2hpbGQgc2VsZWN0b3JzXG4gIHZhciBjaGlsZFNlbGVjdG9ycyA9IHRoaXMuZ2V0QWxsU2VsZWN0b3JzKHNlbGVjdG9ySWQpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRTZWxlY3RvcnMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgc2VsZWN0b3IgPSBjaGlsZFNlbGVjdG9yc1tpXVxuICAgIGlmIChzZWxlY3Rvci53aWxsUmV0dXJuTXVsdGlwbGVSZWNvcmRzKCkgPT09IHRydWUpIHtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlXG59XG5cbi8qKlxuICogV2hlbiBzZXJpYWxpemluZyB0byBKU09OIGNvbnZlcnQgdG8gYW4gYXJyYXlcbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqL1xuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiAoKSB7XG4gIHZhciByZXN1bHQgPSBbXVxuICB0aGlzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgcmVzdWx0LnB1c2goc2VsZWN0b3IpXG4gIH0pXG4gIHJldHVybiByZXN1bHRcbn1cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5nZXRTZWxlY3RvckJ5SWQgPSBmdW5jdGlvbiAoc2VsZWN0b3JJZCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgc2VsZWN0b3IgPSB0aGlzW2ldXG4gICAgaWYgKHNlbGVjdG9yLmlkID09PSBzZWxlY3RvcklkKSB7XG4gICAgICByZXR1cm4gc2VsZWN0b3JcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiByZXR1cm5zIGNzcyBzZWxlY3RvciBmb3IgYSBnaXZlbiBlbGVtZW50LiBjc3Mgc2VsZWN0b3IgaW5jbHVkZXMgYWxsIHBhcmVudCBlbGVtZW50IHNlbGVjdG9yc1xuICogQHBhcmFtIHNlbGVjdG9ySWRcbiAqIEBwYXJhbSBwYXJlbnRTZWxlY3RvcklkcyBhcnJheSBvZiBwYXJlbnQgc2VsZWN0b3IgaWRzIGZyb20gZGV2dG9vbHMgQnJlYWRjdW1iXG4gKiBAcmV0dXJucyBzdHJpbmdcbiAqL1xuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5nZXRDU1NTZWxlY3RvcldpdGhpbk9uZVBhZ2UgPSBmdW5jdGlvbiAoc2VsZWN0b3JJZCwgcGFyZW50U2VsZWN0b3JJZHMpIHtcbiAgdmFyIENTU1NlbGVjdG9yID0gdGhpcy5nZXRTZWxlY3RvcihzZWxlY3RvcklkKS5zZWxlY3RvclxuICB2YXIgcGFyZW50Q1NTU2VsZWN0b3IgPSB0aGlzLmdldFBhcmVudENTU1NlbGVjdG9yV2l0aGluT25lUGFnZShwYXJlbnRTZWxlY3RvcklkcylcbiAgQ1NTU2VsZWN0b3IgPSBwYXJlbnRDU1NTZWxlY3RvciArIENTU1NlbGVjdG9yXG5cbiAgcmV0dXJuIENTU1NlbGVjdG9yXG59XG5cbi8qKlxuICogcmV0dXJucyBjc3Mgc2VsZWN0b3IgZm9yIHBhcmVudCBzZWxlY3RvcnMgdGhhdCBhcmUgd2l0aGluIG9uZSBwYWdlXG4gKiBAcGFyYW0gcGFyZW50U2VsZWN0b3JJZHMgYXJyYXkgb2YgcGFyZW50IHNlbGVjdG9yIGlkcyBmcm9tIGRldnRvb2xzIEJyZWFkY3VtYlxuICogQHJldHVybnMgc3RyaW5nXG4gKi9cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZ2V0UGFyZW50Q1NTU2VsZWN0b3JXaXRoaW5PbmVQYWdlID0gZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9ySWRzKSB7XG4gIHZhciBDU1NTZWxlY3RvciA9ICcnXG5cbiAgZm9yICh2YXIgaSA9IHBhcmVudFNlbGVjdG9ySWRzLmxlbmd0aCAtIDE7IGkgPiAwOyBpLS0pIHtcbiAgICB2YXIgcGFyZW50U2VsZWN0b3JJZCA9IHBhcmVudFNlbGVjdG9ySWRzW2ldXG4gICAgdmFyIHBhcmVudFNlbGVjdG9yID0gdGhpcy5nZXRTZWxlY3RvcihwYXJlbnRTZWxlY3RvcklkKVxuICAgIGlmIChwYXJlbnRTZWxlY3Rvci53aWxsUmV0dXJuRWxlbWVudHMoKSkge1xuICAgICAgQ1NTU2VsZWN0b3IgPSBwYXJlbnRTZWxlY3Rvci5zZWxlY3RvciArICcgJyArIENTU1NlbGVjdG9yXG4gICAgfSBlbHNlIHtcbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIENTU1NlbGVjdG9yXG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuaGFzUmVjdXJzaXZlRWxlbWVudFNlbGVjdG9ycyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIFJlY3Vyc2lvbkZvdW5kID0gZmFsc2VcblxuICB0aGlzLmZvckVhY2goZnVuY3Rpb24gKHRvcFNlbGVjdG9yKSB7XG4gICAgdmFyIHZpc2l0ZWRTZWxlY3RvcnMgPSBbXVxuXG4gICAgdmFyIGNoZWNrUmVjdXJzaW9uID0gZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9yKSB7XG5cdFx0XHQvLyBhbHJlYWR5IHZpc2l0ZWRcbiAgICAgIGlmICh2aXNpdGVkU2VsZWN0b3JzLmluZGV4T2YocGFyZW50U2VsZWN0b3IpICE9PSAtMSkge1xuICAgICAgICBSZWN1cnNpb25Gb3VuZCA9IHRydWVcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIGlmIChwYXJlbnRTZWxlY3Rvci53aWxsUmV0dXJuRWxlbWVudHMoKSkge1xuICAgICAgICB2aXNpdGVkU2VsZWN0b3JzLnB1c2gocGFyZW50U2VsZWN0b3IpXG4gICAgICAgIHZhciBjaGlsZFNlbGVjdG9ycyA9IHRoaXMuZ2V0RGlyZWN0Q2hpbGRTZWxlY3RvcnMocGFyZW50U2VsZWN0b3IuaWQpXG4gICAgICAgIGNoaWxkU2VsZWN0b3JzLmZvckVhY2goY2hlY2tSZWN1cnNpb24pXG4gICAgICAgIHZpc2l0ZWRTZWxlY3RvcnMucG9wKClcbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcylcblxuICAgIGNoZWNrUmVjdXJzaW9uKHRvcFNlbGVjdG9yKVxuICB9LmJpbmQodGhpcykpXG5cbiAgcmV0dXJuIFJlY3Vyc2lvbkZvdW5kXG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JMaXN0XG4iLCJ2YXIgU2VsZWN0b3JFbGVtZW50ID0gcmVxdWlyZSgnLi9TZWxlY3Rvci9TZWxlY3RvckVsZW1lbnQnKVxudmFyIFNlbGVjdG9yRWxlbWVudEF0dHJpYnV0ZSA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JFbGVtZW50QXR0cmlidXRlJylcbnZhciBTZWxlY3RvckVsZW1lbnRDbGljayA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JFbGVtZW50Q2xpY2snKVxudmFyIFNlbGVjdG9yRWxlbWVudFNjcm9sbCA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JFbGVtZW50U2Nyb2xsJylcbnZhciBTZWxlY3Rvckdyb3VwID0gcmVxdWlyZSgnLi9TZWxlY3Rvci9TZWxlY3Rvckdyb3VwJylcbnZhciBTZWxlY3RvckhUTUwgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9ySFRNTCcpXG52YXIgU2VsZWN0b3JJbWFnZSA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JJbWFnZScpXG52YXIgU2VsZWN0b3JMaW5rID0gcmVxdWlyZSgnLi9TZWxlY3Rvci9TZWxlY3RvckxpbmsnKVxudmFyIFNlbGVjdG9yUG9wdXBMaW5rID0gcmVxdWlyZSgnLi9TZWxlY3Rvci9TZWxlY3RvclBvcHVwTGluaycpXG52YXIgU2VsZWN0b3JUYWJsZSA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JUYWJsZScpXG52YXIgU2VsZWN0b3JUZXh0ID0gcmVxdWlyZSgnLi9TZWxlY3Rvci9TZWxlY3RvclRleHQnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgU2VsZWN0b3JFbGVtZW50LFxuICBTZWxlY3RvckVsZW1lbnRBdHRyaWJ1dGUsXG4gIFNlbGVjdG9yRWxlbWVudENsaWNrLFxuICBTZWxlY3RvckVsZW1lbnRTY3JvbGwsXG4gIFNlbGVjdG9yR3JvdXAsXG4gIFNlbGVjdG9ySFRNTCxcbiAgU2VsZWN0b3JJbWFnZSxcbiAgU2VsZWN0b3JMaW5rLFxuICBTZWxlY3RvclBvcHVwTGluayxcbiAgU2VsZWN0b3JUYWJsZSxcbiAgU2VsZWN0b3JUZXh0XG59XG4iLCJ2YXIgU2VsZWN0b3IgPSByZXF1aXJlKCcuL1NlbGVjdG9yJylcbnZhciBTZWxlY3Rvckxpc3QgPSByZXF1aXJlKCcuL1NlbGVjdG9yTGlzdCcpXG52YXIgU2l0ZW1hcCA9IGZ1bmN0aW9uIChzaXRlbWFwT2JqLCBvcHRpb25zKSB7XG4gIHRoaXMuJCA9IG9wdGlvbnMuJFxudGhpcy5kb2N1bWVudCA9IG9wdGlvbnMuZG9jdW1lbnRcbnRoaXMud2luZG93ID0gb3B0aW9ucy53aW5kb3dcbiAgaWYgKCFvcHRpb25zLiQpIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBqcXVlcnknKVxuICB0aGlzLmluaXREYXRhKHNpdGVtYXBPYmopXG59XG5cblNpdGVtYXAucHJvdG90eXBlID0ge1xuXG4gIGluaXREYXRhOiBmdW5jdGlvbiAoc2l0ZW1hcE9iaikge1xuICAgIGNvbnNvbGUubG9nKHRoaXMpXG4gICAgZm9yICh2YXIga2V5IGluIHNpdGVtYXBPYmopIHtcbiAgICAgIGNvbnNvbGUubG9nKGtleSlcbiAgICAgIHRoaXNba2V5XSA9IHNpdGVtYXBPYmpba2V5XVxuICAgIH1cbiAgICBjb25zb2xlLmxvZyh0aGlzKVxuXG4gICAgdmFyIHNlbGVjdG9ycyA9IHRoaXMuc2VsZWN0b3JzXG4gICAgdGhpcy5zZWxlY3RvcnMgPSBuZXcgU2VsZWN0b3JMaXN0KHRoaXMuc2VsZWN0b3JzLCB7JDogdGhpcy4kfSlcbiAgfSxcblxuXHQvKipcblx0ICogUmV0dXJucyBhbGwgc2VsZWN0b3JzIG9yIHJlY3Vyc2l2ZWx5IGZpbmQgYW5kIHJldHVybiBhbGwgY2hpbGQgc2VsZWN0b3JzIG9mIGEgcGFyZW50IHNlbGVjdG9yLlxuXHQgKiBAcGFyYW0gcGFyZW50U2VsZWN0b3JJZFxuXHQgKiBAcmV0dXJucyB7QXJyYXl9XG5cdCAqL1xuICBnZXRBbGxTZWxlY3RvcnM6IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3RvcklkKSB7XG4gICAgcmV0dXJuIHRoaXMuc2VsZWN0b3JzLmdldEFsbFNlbGVjdG9ycyhwYXJlbnRTZWxlY3RvcklkKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIG9ubHkgc2VsZWN0b3JzIHRoYXQgYXJlIGRpcmVjdGx5IHVuZGVyIGEgcGFyZW50XG5cdCAqIEBwYXJhbSBwYXJlbnRTZWxlY3RvcklkXG5cdCAqIEByZXR1cm5zIHtBcnJheX1cblx0ICovXG4gIGdldERpcmVjdENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAocGFyZW50U2VsZWN0b3JJZCkge1xuICAgIHJldHVybiB0aGlzLnNlbGVjdG9ycy5nZXREaXJlY3RDaGlsZFNlbGVjdG9ycyhwYXJlbnRTZWxlY3RvcklkKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIGFsbCBzZWxlY3RvciBpZCBwYXJhbWV0ZXJzXG5cdCAqIEByZXR1cm5zIHtBcnJheX1cblx0ICovXG4gIGdldFNlbGVjdG9ySWRzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGlkcyA9IFsnX3Jvb3QnXVxuICAgIHRoaXMuc2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICBpZHMucHVzaChzZWxlY3Rvci5pZClcbiAgICB9KVxuICAgIHJldHVybiBpZHNcbiAgfSxcblxuXHQvKipcblx0ICogUmV0dXJucyBvbmx5IHNlbGVjdG9yIGlkcyB3aGljaCBjYW4gaGF2ZSBjaGlsZCBzZWxlY3RvcnNcblx0ICogQHJldHVybnMge0FycmF5fVxuXHQgKi9cbiAgZ2V0UG9zc2libGVQYXJlbnRTZWxlY3RvcklkczogZnVuY3Rpb24gKCkge1xuICAgIHZhciBpZHMgPSBbJ19yb290J11cbiAgICB0aGlzLnNlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgaWYgKHNlbGVjdG9yLmNhbkhhdmVDaGlsZFNlbGVjdG9ycygpKSB7XG4gICAgICAgIGlkcy5wdXNoKHNlbGVjdG9yLmlkKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGlkc1xuICB9LFxuXG4gIGdldFN0YXJ0VXJsczogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdGFydFVybHMgPSB0aGlzLnN0YXJ0VXJsXG5cdFx0Ly8gc2luZ2xlIHN0YXJ0IHVybFxuICAgIGlmICh0aGlzLnN0YXJ0VXJsLnB1c2ggPT09IHVuZGVmaW5lZCkge1xuICAgICAgc3RhcnRVcmxzID0gW3N0YXJ0VXJsc11cbiAgICB9XG5cbiAgICB2YXIgdXJscyA9IFtdXG4gICAgc3RhcnRVcmxzLmZvckVhY2goZnVuY3Rpb24gKHN0YXJ0VXJsKSB7XG5cdFx0XHQvLyB6ZXJvIHBhZGRpbmcgaGVscGVyXG4gICAgICB2YXIgbHBhZCA9IGZ1bmN0aW9uIChzdHIsIGxlbmd0aCkge1xuICAgICAgICB3aGlsZSAoc3RyLmxlbmd0aCA8IGxlbmd0aCkgeyBzdHIgPSAnMCcgKyBzdHIgfVxuICAgICAgICByZXR1cm4gc3RyXG4gICAgICB9XG5cbiAgICAgIHZhciByZSA9IC9eKC4qPylcXFsoXFxkKylcXC0oXFxkKykoOihcXGQrKSk/XFxdKC4qKSQvXG4gICAgICB2YXIgbWF0Y2hlcyA9IHN0YXJ0VXJsLm1hdGNoKHJlKVxuICAgICAgaWYgKG1hdGNoZXMpIHtcbiAgICAgICAgdmFyIHN0YXJ0U3RyID0gbWF0Y2hlc1syXVxuICAgICAgICB2YXIgZW5kU3RyID0gbWF0Y2hlc1szXVxuICAgICAgICB2YXIgc3RhcnQgPSBwYXJzZUludChzdGFydFN0cilcbiAgICAgICAgdmFyIGVuZCA9IHBhcnNlSW50KGVuZFN0cilcbiAgICAgICAgdmFyIGluY3JlbWVudGFsID0gMVxuICAgICAgICBjb25zb2xlLmxvZyhtYXRjaGVzWzVdKVxuICAgICAgICBpZiAobWF0Y2hlc1s1XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaW5jcmVtZW50YWwgPSBwYXJzZUludChtYXRjaGVzWzVdKVxuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSBzdGFydDsgaSA8PSBlbmQ7IGkgKz0gaW5jcmVtZW50YWwpIHtcblx0XHRcdFx0XHQvLyB3aXRoIHplcm8gcGFkZGluZ1xuICAgICAgICAgIGlmIChzdGFydFN0ci5sZW5ndGggPT09IGVuZFN0ci5sZW5ndGgpIHtcbiAgICAgICAgICAgIHVybHMucHVzaChtYXRjaGVzWzFdICsgbHBhZChpLnRvU3RyaW5nKCksIHN0YXJ0U3RyLmxlbmd0aCkgKyBtYXRjaGVzWzZdKVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB1cmxzLnB1c2gobWF0Y2hlc1sxXSArIGkgKyBtYXRjaGVzWzZdKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXJsc1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdXJscy5wdXNoKHN0YXJ0VXJsKVxuICAgICAgfVxuICAgIH0pXG5cbiAgICByZXR1cm4gdXJsc1xuICB9LFxuXG4gIHVwZGF0ZVNlbGVjdG9yOiBmdW5jdGlvbiAoc2VsZWN0b3IsIHNlbGVjdG9yRGF0YSkge1xuXHRcdC8vIHNlbGVjdG9yIGlzIHVuZGVmaW5lZCB3aGVuIGNyZWF0aW5nIGEgbmV3IG9uZVxuICAgIGlmIChzZWxlY3RvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBzZWxlY3RvciA9IG5ldyBTZWxlY3RvcihzZWxlY3RvckRhdGEsIHskOiB0aGlzLiR9KVxuICAgIH1cblxuXHRcdC8vIHVwZGF0ZSBjaGlsZCBzZWxlY3RvcnNcbiAgICBpZiAoc2VsZWN0b3IuaWQgIT09IHVuZGVmaW5lZCAmJiBzZWxlY3Rvci5pZCAhPT0gc2VsZWN0b3JEYXRhLmlkKSB7XG4gICAgICB0aGlzLnNlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChjdXJyZW50U2VsZWN0b3IpIHtcbiAgICAgICAgY3VycmVudFNlbGVjdG9yLnJlbmFtZVBhcmVudFNlbGVjdG9yKHNlbGVjdG9yLmlkLCBzZWxlY3RvckRhdGEuaWQpXG4gICAgICB9KVxuXG5cdFx0XHQvLyB1cGRhdGUgY3ljbGljIHNlbGVjdG9yXG4gICAgICB2YXIgcG9zID0gc2VsZWN0b3JEYXRhLnBhcmVudFNlbGVjdG9ycy5pbmRleE9mKHNlbGVjdG9yLmlkKVxuICAgICAgaWYgKHBvcyAhPT0gLTEpIHtcbiAgICAgICAgc2VsZWN0b3JEYXRhLnBhcmVudFNlbGVjdG9ycy5zcGxpY2UocG9zLCAxLCBzZWxlY3RvckRhdGEuaWQpXG4gICAgICB9XG4gICAgfVxuXG4gICAgc2VsZWN0b3IudXBkYXRlRGF0YShzZWxlY3RvckRhdGEpXG5cbiAgICBpZiAodGhpcy5nZXRTZWxlY3RvcklkcygpLmluZGV4T2Yoc2VsZWN0b3IuaWQpID09PSAtMSkge1xuICAgICAgdGhpcy5zZWxlY3RvcnMucHVzaChzZWxlY3RvcilcbiAgICB9XG4gIH0sXG4gIGRlbGV0ZVNlbGVjdG9yOiBmdW5jdGlvbiAoc2VsZWN0b3JUb0RlbGV0ZSkge1xuICAgIHRoaXMuc2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICBpZiAoc2VsZWN0b3IuaGFzUGFyZW50U2VsZWN0b3Ioc2VsZWN0b3JUb0RlbGV0ZS5pZCkpIHtcbiAgICAgICAgc2VsZWN0b3IucmVtb3ZlUGFyZW50U2VsZWN0b3Ioc2VsZWN0b3JUb0RlbGV0ZS5pZClcbiAgICAgICAgaWYgKHNlbGVjdG9yLnBhcmVudFNlbGVjdG9ycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICB0aGlzLmRlbGV0ZVNlbGVjdG9yKHNlbGVjdG9yKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLnNlbGVjdG9ycykge1xuICAgICAgaWYgKHRoaXMuc2VsZWN0b3JzW2ldLmlkID09PSBzZWxlY3RvclRvRGVsZXRlLmlkKSB7XG4gICAgICAgIHRoaXMuc2VsZWN0b3JzLnNwbGljZShpLCAxKVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgZ2V0RGF0YVRhYmxlSWQ6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5faWQucmVwbGFjZSgvXFwuL2csICdfJylcbiAgfSxcbiAgZXhwb3J0U2l0ZW1hcDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzaXRlbWFwT2JqID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzKSlcbiAgICBkZWxldGUgc2l0ZW1hcE9iai5fcmV2XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHNpdGVtYXBPYmopXG4gIH0sXG4gIGltcG9ydFNpdGVtYXA6IGZ1bmN0aW9uIChzaXRlbWFwSlNPTikge1xuICAgIHZhciBzaXRlbWFwT2JqID0gSlNPTi5wYXJzZShzaXRlbWFwSlNPTilcbiAgICB0aGlzLmluaXREYXRhKHNpdGVtYXBPYmopXG4gIH0sXG5cdC8vIHJldHVybiBhIGxpc3Qgb2YgY29sdW1ucyB0aGFuIGNhbiBiZSBleHBvcnRlZFxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHZhciBjb2x1bW5zID0gW11cbiAgICB0aGlzLnNlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgY29sdW1ucyA9IGNvbHVtbnMuY29uY2F0KHNlbGVjdG9yLmdldERhdGFDb2x1bW5zKCkpXG4gICAgfSlcblxuICAgIHJldHVybiBjb2x1bW5zXG4gIH0sXG4gIGdldERhdGFFeHBvcnRDc3ZCbG9iOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHZhciBjb2x1bW5zID0gdGhpcy5nZXREYXRhQ29sdW1ucygpLFxuICAgICAgZGVsaW1pdGVyID0gJywnLFxuICAgICAgbmV3bGluZSA9ICdcXG4nLFxuICAgICAgY3N2RGF0YSA9IFsnXFx1ZmVmZiddIC8vIHV0Zi04IGJvbSBjaGFyXG5cblx0XHQvLyBoZWFkZXJcbiAgICBjc3ZEYXRhLnB1c2goY29sdW1ucy5qb2luKGRlbGltaXRlcikgKyBuZXdsaW5lKVxuXG5cdFx0Ly8gZGF0YVxuICAgIGRhdGEuZm9yRWFjaChmdW5jdGlvbiAocm93KSB7XG4gICAgICB2YXIgcm93RGF0YSA9IFtdXG4gICAgICBjb2x1bW5zLmZvckVhY2goZnVuY3Rpb24gKGNvbHVtbikge1xuICAgICAgICB2YXIgY2VsbERhdGEgPSByb3dbY29sdW1uXVxuICAgICAgICBpZiAoY2VsbERhdGEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNlbGxEYXRhID0gJydcbiAgICAgICAgfVx0XHRcdFx0ZWxzZSBpZiAodHlwZW9mIGNlbGxEYXRhID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgIGNlbGxEYXRhID0gSlNPTi5zdHJpbmdpZnkoY2VsbERhdGEpXG4gICAgICAgIH1cblxuICAgICAgICByb3dEYXRhLnB1c2goJ1wiJyArIGNlbGxEYXRhLnJlcGxhY2UoL1wiL2csICdcIlwiJykudHJpbSgpICsgJ1wiJylcbiAgICAgIH0pXG4gICAgICBjc3ZEYXRhLnB1c2gocm93RGF0YS5qb2luKGRlbGltaXRlcikgKyBuZXdsaW5lKVxuICAgIH0pXG5cbiAgICByZXR1cm4gbmV3IEJsb2IoY3N2RGF0YSwge3R5cGU6ICd0ZXh0L2Nzdid9KVxuICB9LFxuICBnZXRTZWxlY3RvckJ5SWQ6IGZ1bmN0aW9uIChzZWxlY3RvcklkKSB7XG4gICAgcmV0dXJuIHRoaXMuc2VsZWN0b3JzLmdldFNlbGVjdG9yQnlJZChzZWxlY3RvcklkKVxuICB9LFxuXHQvKipcblx0ICogQ3JlYXRlIGZ1bGwgY2xvbmUgb2Ygc2l0ZW1hcFxuXHQgKiBAcmV0dXJucyB7U2l0ZW1hcH1cblx0ICovXG4gIGNsb25lOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICB2YXIgY2xvbmVkSlNPTiA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcykpXG4gICAgdmFyIHNpdGVtYXAgPSBuZXcgU2l0ZW1hcChjbG9uZWRKU09OLCB7JH0pXG4gICAgcmV0dXJuIHNpdGVtYXBcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNpdGVtYXBcbiIsInZhciBTaXRlbWFwID0gcmVxdWlyZSgnLi9TaXRlbWFwJylcblxuLyoqXG4gKiBGcm9tIGRldnRvb2xzIHBhbmVsIHRoZXJlIGlzIG5vIHBvc3NpYmlsaXR5IHRvIGV4ZWN1dGUgWEhSIHJlcXVlc3RzLiBTbyBhbGwgcmVxdWVzdHMgdG8gYSByZW1vdGUgQ291Y2hEYiBtdXN0IGJlXG4gKiBoYW5kbGVkIHRocm91Z2ggQmFja2dyb3VuZCBwYWdlLiBTdG9yZURldnRvb2xzIGlzIGEgc2ltcGx5IGEgcHJveHkgc3RvcmVcbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgU3RvcmVEZXZ0b29scyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIHRoaXMuJCA9IG9wdGlvbnMuJFxudGhpcy5kb2N1bWVudCA9IG9wdGlvbnMuZG9jdW1lbnRcbnRoaXMud2luZG93ID0gb3B0aW9ucy53aW5kb3dcbiAgaWYgKCF0aGlzLiQpIHRocm93IG5ldyBFcnJvcignanF1ZXJ5IHJlcXVpcmVkJylcbn1cblxuU3RvcmVEZXZ0b29scy5wcm90b3R5cGUgPSB7XG4gIGNyZWF0ZVNpdGVtYXA6IGZ1bmN0aW9uIChzaXRlbWFwLCBjYWxsYmFjaykge1xuICAgIHZhciByZXF1ZXN0ID0ge1xuICAgICAgY3JlYXRlU2l0ZW1hcDogdHJ1ZSxcbiAgICAgIHNpdGVtYXA6IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoc2l0ZW1hcCkpXG4gICAgfVxuXG4gICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UocmVxdWVzdCwgZnVuY3Rpb24gKGNhbGxiYWNrRm4sIG9yaWdpbmFsU2l0ZW1hcCwgbmV3U2l0ZW1hcCkge1xuICAgICAgb3JpZ2luYWxTaXRlbWFwLl9yZXYgPSBuZXdTaXRlbWFwLl9yZXZcbiAgICAgIGNhbGxiYWNrRm4ob3JpZ2luYWxTaXRlbWFwKVxuICAgIH0uYmluZCh0aGlzLCBjYWxsYmFjaywgc2l0ZW1hcCkpXG4gIH0sXG4gIHNhdmVTaXRlbWFwOiBmdW5jdGlvbiAoc2l0ZW1hcCwgY2FsbGJhY2spIHtcbiAgICB0aGlzLmNyZWF0ZVNpdGVtYXAoc2l0ZW1hcCwgY2FsbGJhY2spXG4gIH0sXG4gIGRlbGV0ZVNpdGVtYXA6IGZ1bmN0aW9uIChzaXRlbWFwLCBjYWxsYmFjaykge1xuICAgIHZhciByZXF1ZXN0ID0ge1xuICAgICAgZGVsZXRlU2l0ZW1hcDogdHJ1ZSxcbiAgICAgIHNpdGVtYXA6IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoc2l0ZW1hcCkpXG4gICAgfVxuICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHJlcXVlc3QsIGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgY2FsbGJhY2soKVxuICAgIH0pXG4gIH0sXG4gIGdldEFsbFNpdGVtYXBzOiBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIHZhciByZXF1ZXN0ID0ge1xuICAgICAgZ2V0QWxsU2l0ZW1hcHM6IHRydWVcbiAgICB9XG5cbiAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZShyZXF1ZXN0LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgIHZhciBzaXRlbWFwcyA9IFtdXG5cbiAgICAgIGZvciAodmFyIGkgaW4gcmVzcG9uc2UpIHtcbiAgICAgICAgc2l0ZW1hcHMucHVzaChuZXcgU2l0ZW1hcChyZXNwb25zZVtpXSwgeyR9KSlcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKHNpdGVtYXBzKVxuICAgIH0pXG4gIH0sXG4gIGdldFNpdGVtYXBEYXRhOiBmdW5jdGlvbiAoc2l0ZW1hcCwgY2FsbGJhY2spIHtcbiAgICB2YXIgcmVxdWVzdCA9IHtcbiAgICAgIGdldFNpdGVtYXBEYXRhOiB0cnVlLFxuICAgICAgc2l0ZW1hcDogSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzaXRlbWFwKSlcbiAgICB9XG5cbiAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZShyZXF1ZXN0LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKVxuICAgIH0pXG4gIH0sXG4gIHNpdGVtYXBFeGlzdHM6IGZ1bmN0aW9uIChzaXRlbWFwSWQsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICBzaXRlbWFwRXhpc3RzOiB0cnVlLFxuICAgICAgc2l0ZW1hcElkOiBzaXRlbWFwSWRcbiAgICB9XG5cbiAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZShyZXF1ZXN0LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKVxuICAgIH0pXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTdG9yZURldnRvb2xzXG4iLCJ2YXIgQ3NzU2VsZWN0b3IgPSByZXF1aXJlKCdjc3Mtc2VsZWN0b3InKS5Dc3NTZWxlY3RvclxuLy8gVE9ETyBnZXQgcmlkIG9mIGpxdWVyeVxuXG4vKipcbiAqIE9ubHkgRWxlbWVudHMgdW5pcXVlIHdpbGwgYmUgYWRkZWQgdG8gdGhpcyBhcnJheVxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFVuaXF1ZUVsZW1lbnRMaXN0IChjbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSwgb3B0aW9ucykge1xuICB0aGlzLiQgPSBvcHRpb25zLiRcbnRoaXMuZG9jdW1lbnQgPSBvcHRpb25zLmRvY3VtZW50XG50aGlzLndpbmRvdyA9IG9wdGlvbnMud2luZG93XG4gIGlmICghdGhpcy4kKSB0aHJvdyBuZXcgRXJyb3IoJ2pxdWVyeSByZXF1aXJlZCcpXG4gIHRoaXMuY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUgPSBjbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZVxuICB0aGlzLmFkZGVkRWxlbWVudHMgPSB7fVxufVxuXG5VbmlxdWVFbGVtZW50TGlzdC5wcm90b3R5cGUgPSBbXVxuXG5VbmlxdWVFbGVtZW50TGlzdC5wcm90b3R5cGUucHVzaCA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gIHZhciAkID0gdGhpcy4kXG4gIGlmICh0aGlzLmlzQWRkZWQoZWxlbWVudCkpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSBlbHNlIHtcbiAgICB2YXIgZWxlbWVudFVuaXF1ZUlkID0gdGhpcy5nZXRFbGVtZW50VW5pcXVlSWQoZWxlbWVudClcbiAgICB0aGlzLmFkZGVkRWxlbWVudHNbZWxlbWVudFVuaXF1ZUlkXSA9IHRydWVcbiAgICBBcnJheS5wcm90b3R5cGUucHVzaC5jYWxsKHRoaXMsICQoZWxlbWVudCkuY2xvbmUodHJ1ZSlbMF0pXG4gICAgcmV0dXJuIHRydWVcbiAgfVxufVxuXG5VbmlxdWVFbGVtZW50TGlzdC5wcm90b3R5cGUuZ2V0RWxlbWVudFVuaXF1ZUlkID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgdmFyICQgPSB0aGlzLiRcbiAgaWYgKHRoaXMuY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUgPT09ICd1bmlxdWVUZXh0Jykge1xuICAgIHZhciBlbGVtZW50VGV4dCA9ICQoZWxlbWVudCkudGV4dCgpLnRyaW0oKVxuICAgIHJldHVybiBlbGVtZW50VGV4dFxuICB9IGVsc2UgaWYgKHRoaXMuY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUgPT09ICd1bmlxdWVIVE1MVGV4dCcpIHtcbiAgICB2YXIgZWxlbWVudEhUTUwgPSAkKFwiPGRpdiBjbGFzcz0nLXdlYi1zY3JhcGVyLXNob3VsZC1ub3QtYmUtdmlzaWJsZSc+XCIpLmFwcGVuZCgkKGVsZW1lbnQpLmVxKDApLmNsb25lKCkpLmh0bWwoKVxuICAgIHJldHVybiBlbGVtZW50SFRNTFxuICB9IGVsc2UgaWYgKHRoaXMuY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUgPT09ICd1bmlxdWVIVE1MJykge1xuXHRcdC8vIGdldCBlbGVtZW50IHdpdGhvdXQgdGV4dFxuICAgIHZhciAkZWxlbWVudCA9ICQoZWxlbWVudCkuZXEoMCkuY2xvbmUoKVxuXG4gICAgdmFyIHJlbW92ZVRleHQgPSBmdW5jdGlvbiAoJGVsZW1lbnQpIHtcbiAgICAgICRlbGVtZW50LmNvbnRlbnRzKClcblx0XHRcdFx0LmZpbHRlcihmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLm5vZGVUeXBlICE9PSAzKSB7XG4gICAgcmVtb3ZlVGV4dCgkKHRoaXMpKVxuICB9XG4gIHJldHVybiB0aGlzLm5vZGVUeXBlID09IDMgLy8gTm9kZS5URVhUX05PREVcbn0pLnJlbW92ZSgpXG4gICAgfVxuICAgIHJlbW92ZVRleHQoJGVsZW1lbnQpXG5cbiAgICB2YXIgZWxlbWVudEhUTUwgPSAkKFwiPGRpdiBjbGFzcz0nLXdlYi1zY3JhcGVyLXNob3VsZC1ub3QtYmUtdmlzaWJsZSc+XCIpLmFwcGVuZCgkZWxlbWVudCkuaHRtbCgpXG4gICAgcmV0dXJuIGVsZW1lbnRIVE1MXG4gIH0gZWxzZSBpZiAodGhpcy5jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSA9PT0gJ3VuaXF1ZUNTU1NlbGVjdG9yJykge1xuICAgIHZhciBjcyA9IG5ldyBDc3NTZWxlY3Rvcih7XG4gICAgICBlbmFibGVTbWFydFRhYmxlU2VsZWN0b3I6IGZhbHNlLFxuICAgICAgcGFyZW50OiAkKCdib2R5JylbMF0sXG4gICAgICBlbmFibGVSZXN1bHRTdHJpcHBpbmc6IGZhbHNlXG4gICAgfSlcbiAgICB2YXIgQ1NTU2VsZWN0b3IgPSBjcy5nZXRDc3NTZWxlY3RvcihbZWxlbWVudF0pXG4gICAgcmV0dXJuIENTU1NlbGVjdG9yXG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgJ0ludmFsaWQgY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUgJyArIHRoaXMuY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGVcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFVuaXF1ZUVsZW1lbnRMaXN0XG5cblVuaXF1ZUVsZW1lbnRMaXN0LnByb3RvdHlwZS5pc0FkZGVkID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgdmFyIGVsZW1lbnRVbmlxdWVJZCA9IHRoaXMuZ2V0RWxlbWVudFVuaXF1ZUlkKGVsZW1lbnQpXG4gIHZhciBpc0FkZGVkID0gZWxlbWVudFVuaXF1ZUlkIGluIHRoaXMuYWRkZWRFbGVtZW50c1xuICByZXR1cm4gaXNBZGRlZFxufVxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgQmFja2dyb3VuZFNjcmlwdCA9IHJlcXVpcmUoJy4vQmFja2dyb3VuZFNjcmlwdCcpXG4vKipcbiAqIEBwYXJhbSBsb2NhdGlvblx0Y29uZmlndXJlIGZyb20gd2hlcmUgdGhlIGNvbnRlbnQgc2NyaXB0IGlzIGJlaW5nIGFjY2Vzc2VkIChDb250ZW50U2NyaXB0LCBCYWNrZ3JvdW5kUGFnZSwgRGV2VG9vbHMpXG4gKiBAcmV0dXJucyBCYWNrZ3JvdW5kU2NyaXB0XG4gKi9cbnZhciBnZXRCYWNrZ3JvdW5kU2NyaXB0ID0gZnVuY3Rpb24gKGxvY2F0aW9uKSB7XG4gIC8vIEhhbmRsZSBjYWxscyBmcm9tIGRpZmZlcmVudCBwbGFjZXNcbiAgaWYgKGxvY2F0aW9uID09PSAnQmFja2dyb3VuZFNjcmlwdCcpIHtcbiAgICByZXR1cm4gQmFja2dyb3VuZFNjcmlwdFxuICB9IGVsc2UgaWYgKGxvY2F0aW9uID09PSAnRGV2VG9vbHMnIHx8IGxvY2F0aW9uID09PSAnQ29udGVudFNjcmlwdCcpIHtcbiAgICAvLyBpZiBjYWxsZWQgd2l0aGluIGJhY2tncm91bmQgc2NyaXB0IHByb3h5IGNhbGxzIHRvIGNvbnRlbnQgc2NyaXB0XG4gICAgdmFyIGJhY2tncm91bmRTY3JpcHQgPSB7fVxuXG4gICAgT2JqZWN0LmtleXMoQmFja2dyb3VuZFNjcmlwdCkuZm9yRWFjaChmdW5jdGlvbiAoYXR0cikge1xuICAgICAgaWYgKHR5cGVvZiBCYWNrZ3JvdW5kU2NyaXB0W2F0dHJdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGJhY2tncm91bmRTY3JpcHRbYXR0cl0gPSBmdW5jdGlvbiAocmVxdWVzdCkge1xuICAgICAgICAgIHZhciByZXFUb0JhY2tncm91bmRTY3JpcHQgPSB7XG4gICAgICAgICAgICBiYWNrZ3JvdW5kU2NyaXB0Q2FsbDogdHJ1ZSxcbiAgICAgICAgICAgIGZuOiBhdHRyLFxuICAgICAgICAgICAgcmVxdWVzdDogcmVxdWVzdFxuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICAgICAgICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHJlcVRvQmFja2dyb3VuZFNjcmlwdCwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUocmVzcG9uc2UpXG4gICAgICAgICAgfSlcblxuICAgICAgICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJhY2tncm91bmRTY3JpcHRbYXR0cl0gPSBCYWNrZ3JvdW5kU2NyaXB0W2F0dHJdXG4gICAgICB9XG4gICAgfSlcblxuICAgIHJldHVybiBiYWNrZ3JvdW5kU2NyaXB0XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIEJhY2tncm91bmRTY3JpcHQgaW5pdGlhbGl6YXRpb24gLSAnICsgbG9jYXRpb24pXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnZXRCYWNrZ3JvdW5kU2NyaXB0XG4iLCJ2YXIgZ2V0QmFja2dyb3VuZFNjcmlwdCA9IHJlcXVpcmUoJy4vZ2V0QmFja2dyb3VuZFNjcmlwdCcpXG52YXIgQ29udGVudFNjcmlwdCA9IHJlcXVpcmUoJy4vQ29udGVudFNjcmlwdCcpXG4vKipcbiAqXG4gKiBAcGFyYW0gbG9jYXRpb25cdGNvbmZpZ3VyZSBmcm9tIHdoZXJlIHRoZSBjb250ZW50IHNjcmlwdCBpcyBiZWluZyBhY2Nlc3NlZCAoQ29udGVudFNjcmlwdCwgQmFja2dyb3VuZFBhZ2UsIERldlRvb2xzKVxuICogQHBhcmFtIG9wdGlvbnNcbiAqIEByZXR1cm5zIENvbnRlbnRTY3JpcHRcbiAqL1xudmFyIGdldENvbnRlbnRTY3JpcHQgPSBmdW5jdGlvbiAobG9jYXRpb24pIHtcbiAgdmFyIGNvbnRlbnRTY3JpcHRcblxuICAvLyBIYW5kbGUgY2FsbHMgZnJvbSBkaWZmZXJlbnQgcGxhY2VzXG4gIGlmIChsb2NhdGlvbiA9PT0gJ0NvbnRlbnRTY3JpcHQnKSB7XG4gICAgY29udGVudFNjcmlwdCA9IENvbnRlbnRTY3JpcHRcbiAgICBjb250ZW50U2NyaXB0LmJhY2tncm91bmRTY3JpcHQgPSBnZXRCYWNrZ3JvdW5kU2NyaXB0KCdDb250ZW50U2NyaXB0JylcbiAgICByZXR1cm4gY29udGVudFNjcmlwdFxuICB9IGVsc2UgaWYgKGxvY2F0aW9uID09PSAnQmFja2dyb3VuZFNjcmlwdCcgfHwgbG9jYXRpb24gPT09ICdEZXZUb29scycpIHtcbiAgICB2YXIgYmFja2dyb3VuZFNjcmlwdCA9IGdldEJhY2tncm91bmRTY3JpcHQobG9jYXRpb24pXG5cbiAgICAvLyBpZiBjYWxsZWQgd2l0aGluIGJhY2tncm91bmQgc2NyaXB0IHByb3h5IGNhbGxzIHRvIGNvbnRlbnQgc2NyaXB0XG4gICAgY29udGVudFNjcmlwdCA9IHt9XG4gICAgT2JqZWN0LmtleXMoQ29udGVudFNjcmlwdCkuZm9yRWFjaChmdW5jdGlvbiAoYXR0cikge1xuICAgICAgaWYgKHR5cGVvZiBDb250ZW50U2NyaXB0W2F0dHJdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNvbnRlbnRTY3JpcHRbYXR0cl0gPSBmdW5jdGlvbiAocmVxdWVzdCkge1xuICAgICAgICAgIHZhciByZXFUb0NvbnRlbnRTY3JpcHQgPSB7XG4gICAgICAgICAgICBjb250ZW50U2NyaXB0Q2FsbDogdHJ1ZSxcbiAgICAgICAgICAgIGZuOiBhdHRyLFxuICAgICAgICAgICAgcmVxdWVzdDogcmVxdWVzdFxuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBiYWNrZ3JvdW5kU2NyaXB0LmV4ZWN1dGVDb250ZW50U2NyaXB0KHJlcVRvQ29udGVudFNjcmlwdClcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29udGVudFNjcmlwdFthdHRyXSA9IENvbnRlbnRTY3JpcHRbYXR0cl1cbiAgICAgIH1cbiAgICB9KVxuICAgIGNvbnRlbnRTY3JpcHQuYmFja2dyb3VuZFNjcmlwdCA9IGJhY2tncm91bmRTY3JpcHRcbiAgICByZXR1cm4gY29udGVudFNjcmlwdFxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBDb250ZW50U2NyaXB0IGluaXRpYWxpemF0aW9uIC0gJyArIGxvY2F0aW9uKVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0Q29udGVudFNjcmlwdFxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdENzc1NlbGVjdG9yLFxuXHRFbGVtZW50U2VsZWN0b3IsXG5cdEVsZW1lbnRTZWxlY3Rvckxpc3Rcbn1cblxuXG5mdW5jdGlvbiBDc3NTZWxlY3RvciAob3B0aW9ucykge1xuXG5cdHZhciBtZSA9IHRoaXM7XG5cblx0Ly8gZGVmYXVsdHNcblx0dGhpcy5pZ25vcmVkVGFncyA9IFsnZm9udCcsICdiJywgJ2knLCAncyddO1xuXHR0aGlzLnBhcmVudCA9IG9wdGlvbnMuZG9jdW1lbnQgfHwgb3B0aW9ucy5wYXJlbnRcblx0dGhpcy5kb2N1bWVudCA9IG9wdGlvbnMuZG9jdW1lbnQgfHwgb3B0aW9ucy5wYXJlbnQgXG5cdHRoaXMuaWdub3JlZENsYXNzQmFzZSA9IGZhbHNlO1xuXHR0aGlzLmVuYWJsZVJlc3VsdFN0cmlwcGluZyA9IHRydWU7XG5cdHRoaXMuZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yID0gZmFsc2U7XG5cdHRoaXMuaWdub3JlZENsYXNzZXMgPSBbXTtcbiAgICB0aGlzLmFsbG93TXVsdGlwbGVTZWxlY3RvcnMgPSBmYWxzZTtcblx0dGhpcy5xdWVyeSA9IGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuXHRcdHJldHVybiBtZS5wYXJlbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG5cdH07XG5cblx0Ly8gb3ZlcnJpZGVzIGRlZmF1bHRzIHdpdGggb3B0aW9uc1xuXHRmb3IgKHZhciBpIGluIG9wdGlvbnMpIHtcblx0XHR0aGlzW2ldID0gb3B0aW9uc1tpXTtcblx0fVxufTtcblxuLy8gVE9ETyByZWZhY3RvciBlbGVtZW50IHNlbGVjdG9yIGxpc3QgaW50byBhIH4gY2xhc3NcbmZ1bmN0aW9uIEVsZW1lbnRTZWxlY3RvciAoZWxlbWVudCwgaWdub3JlZENsYXNzZXMpIHtcblxuXHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXHR0aGlzLmlzRGlyZWN0Q2hpbGQgPSB0cnVlO1xuXHR0aGlzLnRhZyA9IGVsZW1lbnQubG9jYWxOYW1lO1xuXHR0aGlzLnRhZyA9IHRoaXMudGFnLnJlcGxhY2UoLzovZywgJ1xcXFw6Jyk7XG5cblx0Ly8gbnRoLW9mLWNoaWxkKG4rMSlcblx0dGhpcy5pbmRleG4gPSBudWxsO1xuXHR0aGlzLmluZGV4ID0gMTtcblx0dGhpcy5pZCA9IG51bGw7XG5cdHRoaXMuY2xhc3NlcyA9IG5ldyBBcnJheSgpO1xuXG5cdC8vIGRvIG5vdCBhZGQgYWRkaXRpbmFsIGluZm8gdG8gaHRtbCwgYm9keSB0YWdzLlxuXHQvLyBodG1sOm50aC1vZi10eXBlKDEpIGNhbm5vdCBiZSBzZWxlY3RlZFxuXHRpZih0aGlzLnRhZyA9PT0gJ2h0bWwnIHx8IHRoaXMudGFnID09PSAnSFRNTCdcblx0XHR8fCB0aGlzLnRhZyA9PT0gJ2JvZHknIHx8IHRoaXMudGFnID09PSAnQk9EWScpIHtcblx0XHR0aGlzLmluZGV4ID0gbnVsbDtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRpZiAoZWxlbWVudC5wYXJlbnROb2RlICE9PSB1bmRlZmluZWQpIHtcblx0XHQvLyBudGgtY2hpbGRcblx0XHQvL3RoaXMuaW5kZXggPSBbXS5pbmRleE9mLmNhbGwoZWxlbWVudC5wYXJlbnROb2RlLmNoaWxkcmVuLCBlbGVtZW50KSsxO1xuXG5cdFx0Ly8gbnRoLW9mLXR5cGVcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnQucGFyZW50Tm9kZS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGNoaWxkID0gZWxlbWVudC5wYXJlbnROb2RlLmNoaWxkcmVuW2ldO1xuXHRcdFx0aWYgKGNoaWxkID09PSBlbGVtZW50KSB7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGNoaWxkLnRhZ05hbWUgPT09IGVsZW1lbnQudGFnTmFtZSkge1xuXHRcdFx0XHR0aGlzLmluZGV4Kys7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0aWYgKGVsZW1lbnQuaWQgIT09ICcnKSB7XG5cdFx0aWYgKHR5cGVvZiBlbGVtZW50LmlkID09PSAnc3RyaW5nJykge1xuXHRcdFx0dGhpcy5pZCA9IGVsZW1lbnQuaWQ7XG5cdFx0XHR0aGlzLmlkID0gdGhpcy5pZC5yZXBsYWNlKC86L2csICdcXFxcOicpO1xuXHRcdH1cblx0fVxuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudC5jbGFzc0xpc3QubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgY2NsYXNzID0gZWxlbWVudC5jbGFzc0xpc3RbaV07XG5cdFx0aWYgKGlnbm9yZWRDbGFzc2VzLmluZGV4T2YoY2NsYXNzKSA9PT0gLTEpIHtcblx0XHRcdGNjbGFzcyA9IGNjbGFzcy5yZXBsYWNlKC86L2csICdcXFxcOicpO1xuXHRcdFx0dGhpcy5jbGFzc2VzLnB1c2goY2NsYXNzKTtcblx0XHR9XG5cdH1cbn07XG5cbmZ1bmN0aW9uIEVsZW1lbnRTZWxlY3Rvckxpc3QgKENzc1NlbGVjdG9yKSB7XG5cdHRoaXMuQ3NzU2VsZWN0b3IgPSBDc3NTZWxlY3Rvcjtcbn07XG5cbkVsZW1lbnRTZWxlY3Rvckxpc3QucHJvdG90eXBlID0gbmV3IEFycmF5KCk7XG5cbkVsZW1lbnRTZWxlY3Rvckxpc3QucHJvdG90eXBlLmdldENzc1NlbGVjdG9yID0gZnVuY3Rpb24gKCkge1xuXG5cdHZhciByZXN1bHRTZWxlY3RvcnMgPSBbXTtcblxuXHQvLyBURERcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIHNlbGVjdG9yID0gdGhpc1tpXTtcblxuXHRcdHZhciBpc0ZpcnN0U2VsZWN0b3IgPSBpID09PSB0aGlzLmxlbmd0aC0xO1xuXHRcdHZhciByZXN1bHRTZWxlY3RvciA9IHNlbGVjdG9yLmdldENzc1NlbGVjdG9yKGlzRmlyc3RTZWxlY3Rvcik7XG5cblx0XHRpZiAodGhpcy5Dc3NTZWxlY3Rvci5lbmFibGVTbWFydFRhYmxlU2VsZWN0b3IpIHtcblx0XHRcdGlmIChzZWxlY3Rvci50YWcgPT09ICd0cicpIHtcblx0XHRcdFx0aWYgKHNlbGVjdG9yLmVsZW1lbnQuY2hpbGRyZW4ubGVuZ3RoID09PSAyKSB7XG5cdFx0XHRcdFx0aWYgKHNlbGVjdG9yLmVsZW1lbnQuY2hpbGRyZW5bMF0udGFnTmFtZSA9PT0gJ1REJ1xuXHRcdFx0XHRcdFx0fHwgc2VsZWN0b3IuZWxlbWVudC5jaGlsZHJlblswXS50YWdOYW1lID09PSAnVEgnXG5cdFx0XHRcdFx0XHR8fCBzZWxlY3Rvci5lbGVtZW50LmNoaWxkcmVuWzBdLnRhZ05hbWUgPT09ICdUUicpIHtcblxuXHRcdFx0XHRcdFx0dmFyIHRleHQgPSBzZWxlY3Rvci5lbGVtZW50LmNoaWxkcmVuWzBdLnRleHRDb250ZW50O1xuXHRcdFx0XHRcdFx0dGV4dCA9IHRleHQudHJpbSgpO1xuXG5cdFx0XHRcdFx0XHQvLyBlc2NhcGUgcXVvdGVzXG5cdFx0XHRcdFx0XHR0ZXh0LnJlcGxhY2UoLyhcXFxcKikoJykvZywgZnVuY3Rpb24gKHgpIHtcblx0XHRcdFx0XHRcdFx0dmFyIGwgPSB4Lmxlbmd0aDtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIChsICUgMikgPyB4IDogeC5zdWJzdHJpbmcoMCwgbCAtIDEpICsgXCJcXFxcJ1wiO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRyZXN1bHRTZWxlY3RvciArPSBcIjpjb250YWlucygnXCIgKyB0ZXh0ICsgXCInKVwiO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJlc3VsdFNlbGVjdG9ycy5wdXNoKHJlc3VsdFNlbGVjdG9yKTtcblx0fVxuXG5cdHZhciByZXN1bHRDU1NTZWxlY3RvciA9IHJlc3VsdFNlbGVjdG9ycy5yZXZlcnNlKCkuam9pbignICcpO1xuXHRyZXR1cm4gcmVzdWx0Q1NTU2VsZWN0b3I7XG59O1xuXG5FbGVtZW50U2VsZWN0b3IucHJvdG90eXBlID0ge1xuXG5cdGdldENzc1NlbGVjdG9yOiBmdW5jdGlvbiAoaXNGaXJzdFNlbGVjdG9yKSB7XG5cblx0XHRpZihpc0ZpcnN0U2VsZWN0b3IgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0aXNGaXJzdFNlbGVjdG9yID0gZmFsc2U7XG5cdFx0fVxuXG5cdFx0dmFyIHNlbGVjdG9yID0gdGhpcy50YWc7XG5cdFx0aWYgKHRoaXMuaWQgIT09IG51bGwpIHtcblx0XHRcdHNlbGVjdG9yICs9ICcjJyArIHRoaXMuaWQ7XG5cdFx0fVxuXHRcdGlmICh0aGlzLmNsYXNzZXMubGVuZ3RoKSB7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY2xhc3Nlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRzZWxlY3RvciArPSBcIi5cIiArIHRoaXMuY2xhc3Nlc1tpXTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKHRoaXMuaW5kZXggIT09IG51bGwpIHtcblx0XHRcdHNlbGVjdG9yICs9ICc6bnRoLW9mLXR5cGUoJyArIHRoaXMuaW5kZXggKyAnKSc7XG5cdFx0fVxuXHRcdGlmICh0aGlzLmluZGV4biAhPT0gbnVsbCAmJiB0aGlzLmluZGV4biAhPT0gLTEpIHtcblx0XHRcdHNlbGVjdG9yICs9ICc6bnRoLW9mLXR5cGUobisnICsgdGhpcy5pbmRleG4gKyAnKSc7XG5cdFx0fVxuXHRcdGlmKHRoaXMuaXNEaXJlY3RDaGlsZCAmJiBpc0ZpcnN0U2VsZWN0b3IgPT09IGZhbHNlKSB7XG5cdFx0XHRzZWxlY3RvciA9IFwiPiBcIitzZWxlY3Rvcjtcblx0XHR9XG5cblx0XHRyZXR1cm4gc2VsZWN0b3I7XG5cdH0sXG5cdC8vIG1lcmdlcyB0aGlzIHNlbGVjdG9yIHdpdGggYW5vdGhlciBvbmUuXG5cdG1lcmdlOiBmdW5jdGlvbiAobWVyZ2VTZWxlY3Rvcikge1xuXG5cdFx0aWYgKHRoaXMudGFnICE9PSBtZXJnZVNlbGVjdG9yLnRhZykge1xuXHRcdFx0dGhyb3cgXCJkaWZmZXJlbnQgZWxlbWVudCBzZWxlY3RlZCAodGFnKVwiO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmluZGV4ICE9PSBudWxsKSB7XG5cdFx0XHRpZiAodGhpcy5pbmRleCAhPT0gbWVyZ2VTZWxlY3Rvci5pbmRleCkge1xuXG5cdFx0XHRcdC8vIHVzZSBpbmRleG4gb25seSBmb3IgdHdvIGVsZW1lbnRzXG5cdFx0XHRcdGlmICh0aGlzLmluZGV4biA9PT0gbnVsbCkge1xuXHRcdFx0XHRcdHZhciBpbmRleG4gPSBNYXRoLm1pbihtZXJnZVNlbGVjdG9yLmluZGV4LCB0aGlzLmluZGV4KTtcblx0XHRcdFx0XHRpZiAoaW5kZXhuID4gMSkge1xuXHRcdFx0XHRcdFx0dGhpcy5pbmRleG4gPSBNYXRoLm1pbihtZXJnZVNlbGVjdG9yLmluZGV4LCB0aGlzLmluZGV4KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5pbmRleG4gPSAtMTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHRoaXMuaW5kZXggPSBudWxsO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmKHRoaXMuaXNEaXJlY3RDaGlsZCA9PT0gdHJ1ZSkge1xuXHRcdFx0dGhpcy5pc0RpcmVjdENoaWxkID0gbWVyZ2VTZWxlY3Rvci5pc0RpcmVjdENoaWxkO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmlkICE9PSBudWxsKSB7XG5cdFx0XHRpZiAodGhpcy5pZCAhPT0gbWVyZ2VTZWxlY3Rvci5pZCkge1xuXHRcdFx0XHR0aGlzLmlkID0gbnVsbDtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAodGhpcy5jbGFzc2VzLmxlbmd0aCAhPT0gMCkge1xuXHRcdFx0dmFyIGNsYXNzZXMgPSBuZXcgQXJyYXkoKTtcblxuXHRcdFx0Zm9yICh2YXIgaSBpbiB0aGlzLmNsYXNzZXMpIHtcblx0XHRcdFx0dmFyIGNjbGFzcyA9IHRoaXMuY2xhc3Nlc1tpXTtcblx0XHRcdFx0aWYgKG1lcmdlU2VsZWN0b3IuY2xhc3Nlcy5pbmRleE9mKGNjbGFzcykgIT09IC0xKSB7XG5cdFx0XHRcdFx0Y2xhc3Nlcy5wdXNoKGNjbGFzcyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0dGhpcy5jbGFzc2VzID0gY2xhc3Nlcztcblx0XHR9XG5cdH1cbn07XG5cbkNzc1NlbGVjdG9yLnByb3RvdHlwZSA9IHtcblx0bWVyZ2VFbGVtZW50U2VsZWN0b3JzOiBmdW5jdGlvbiAobmV3U2VsZWNvcnMpIHtcblxuXHRcdGlmIChuZXdTZWxlY29ycy5sZW5ndGggPCAxKSB7XG5cdFx0XHR0aHJvdyBcIk5vIHNlbGVjdG9ycyBzcGVjaWZpZWRcIjtcblx0XHR9XG5cdFx0ZWxzZSBpZiAobmV3U2VsZWNvcnMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRyZXR1cm4gbmV3U2VsZWNvcnNbMF07XG5cdFx0fVxuXG5cdFx0Ly8gY2hlY2sgc2VsZWN0b3IgdG90YWwgY291bnRcblx0XHR2YXIgZWxlbWVudENvdW50SW5TZWxlY3RvciA9IG5ld1NlbGVjb3JzWzBdLmxlbmd0aDtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG5ld1NlbGVjb3JzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgc2VsZWN0b3IgPSBuZXdTZWxlY29yc1tpXTtcblx0XHRcdGlmIChzZWxlY3Rvci5sZW5ndGggIT09IGVsZW1lbnRDb3VudEluU2VsZWN0b3IpIHtcblx0XHRcdFx0dGhyb3cgXCJJbnZhbGlkIGVsZW1lbnQgY291bnQgaW4gc2VsZWN0b3JcIjtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBtZXJnZSBzZWxlY3RvcnNcblx0XHR2YXIgcmVzdWx0aW5nRWxlbWVudHMgPSBuZXdTZWxlY29yc1swXTtcblx0XHRmb3IgKHZhciBpID0gMTsgaSA8IG5ld1NlbGVjb3JzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgbWVyZ2VFbGVtZW50cyA9IG5ld1NlbGVjb3JzW2ldO1xuXG5cdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGVsZW1lbnRDb3VudEluU2VsZWN0b3I7IGorKykge1xuXHRcdFx0XHRyZXN1bHRpbmdFbGVtZW50c1tqXS5tZXJnZShtZXJnZUVsZW1lbnRzW2pdKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdGluZ0VsZW1lbnRzO1xuXHR9LFxuXHRzdHJpcFNlbGVjdG9yOiBmdW5jdGlvbiAoc2VsZWN0b3JzKSB7XG5cblx0XHR2YXIgY3NzU2VsZXRvciA9IHNlbGVjdG9ycy5nZXRDc3NTZWxlY3RvcigpO1xuXHRcdHZhciBiYXNlU2VsZWN0ZWRFbGVtZW50cyA9IHRoaXMucXVlcnkoY3NzU2VsZXRvcik7XG5cblx0XHR2YXIgY29tcGFyZUVsZW1lbnRzID0gZnVuY3Rpb24gKGVsZW1lbnRzKSB7XG5cdFx0XHRpZiAoYmFzZVNlbGVjdGVkRWxlbWVudHMubGVuZ3RoICE9PSBlbGVtZW50cy5sZW5ndGgpIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGJhc2VTZWxlY3RlZEVsZW1lbnRzLmxlbmd0aDsgaisrKSB7XG5cdFx0XHRcdGlmIChbXS5pbmRleE9mLmNhbGwoZWxlbWVudHMsIGJhc2VTZWxlY3RlZEVsZW1lbnRzW2pdKSA9PT0gLTEpIHtcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH07XG5cdFx0Ly8gc3RyaXAgaW5kZXhlc1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZWN0b3JzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgc2VsZWN0b3IgPSBzZWxlY3RvcnNbaV07XG5cdFx0XHRpZiAoc2VsZWN0b3IuaW5kZXggIT09IG51bGwpIHtcblx0XHRcdFx0dmFyIGluZGV4ID0gc2VsZWN0b3IuaW5kZXg7XG5cdFx0XHRcdHNlbGVjdG9yLmluZGV4ID0gbnVsbDtcblx0XHRcdFx0dmFyIGNzc1NlbGV0b3IgPSBzZWxlY3RvcnMuZ2V0Q3NzU2VsZWN0b3IoKTtcblx0XHRcdFx0dmFyIG5ld1NlbGVjdGVkRWxlbWVudHMgPSB0aGlzLnF1ZXJ5KGNzc1NlbGV0b3IpO1xuXHRcdFx0XHQvLyBpZiByZXN1bHRzIGRvZXNuJ3QgbWF0Y2ggdGhlbiB1bmRvIGNoYW5nZXNcblx0XHRcdFx0aWYgKCFjb21wYXJlRWxlbWVudHMobmV3U2VsZWN0ZWRFbGVtZW50cykpIHtcblx0XHRcdFx0XHRzZWxlY3Rvci5pbmRleCA9IGluZGV4O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gc3RyaXAgaXNEaXJlY3RDaGlsZFxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZWN0b3JzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgc2VsZWN0b3IgPSBzZWxlY3RvcnNbaV07XG5cdFx0XHRpZiAoc2VsZWN0b3IuaXNEaXJlY3RDaGlsZCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRzZWxlY3Rvci5pc0RpcmVjdENoaWxkID0gZmFsc2U7XG5cdFx0XHRcdHZhciBjc3NTZWxldG9yID0gc2VsZWN0b3JzLmdldENzc1NlbGVjdG9yKCk7XG5cdFx0XHRcdHZhciBuZXdTZWxlY3RlZEVsZW1lbnRzID0gdGhpcy5xdWVyeShjc3NTZWxldG9yKTtcblx0XHRcdFx0Ly8gaWYgcmVzdWx0cyBkb2Vzbid0IG1hdGNoIHRoZW4gdW5kbyBjaGFuZ2VzXG5cdFx0XHRcdGlmICghY29tcGFyZUVsZW1lbnRzKG5ld1NlbGVjdGVkRWxlbWVudHMpKSB7XG5cdFx0XHRcdFx0c2VsZWN0b3IuaXNEaXJlY3RDaGlsZCA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBzdHJpcCBpZHNcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHNlbGVjdG9ycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHNlbGVjdG9yID0gc2VsZWN0b3JzW2ldO1xuXHRcdFx0aWYgKHNlbGVjdG9yLmlkICE9PSBudWxsKSB7XG5cdFx0XHRcdHZhciBpZCA9IHNlbGVjdG9yLmlkO1xuXHRcdFx0XHRzZWxlY3Rvci5pZCA9IG51bGw7XG5cdFx0XHRcdHZhciBjc3NTZWxldG9yID0gc2VsZWN0b3JzLmdldENzc1NlbGVjdG9yKCk7XG5cdFx0XHRcdHZhciBuZXdTZWxlY3RlZEVsZW1lbnRzID0gdGhpcy5xdWVyeShjc3NTZWxldG9yKTtcblx0XHRcdFx0Ly8gaWYgcmVzdWx0cyBkb2Vzbid0IG1hdGNoIHRoZW4gdW5kbyBjaGFuZ2VzXG5cdFx0XHRcdGlmICghY29tcGFyZUVsZW1lbnRzKG5ld1NlbGVjdGVkRWxlbWVudHMpKSB7XG5cdFx0XHRcdFx0c2VsZWN0b3IuaWQgPSBpZDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIHN0cmlwIGNsYXNzZXNcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHNlbGVjdG9ycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHNlbGVjdG9yID0gc2VsZWN0b3JzW2ldO1xuXHRcdFx0aWYgKHNlbGVjdG9yLmNsYXNzZXMubGVuZ3RoICE9PSAwKSB7XG5cdFx0XHRcdGZvciAodmFyIGogPSBzZWxlY3Rvci5jbGFzc2VzLmxlbmd0aCAtIDE7IGogPiAwOyBqLS0pIHtcblx0XHRcdFx0XHR2YXIgY2NsYXNzID0gc2VsZWN0b3IuY2xhc3Nlc1tqXTtcblx0XHRcdFx0XHRzZWxlY3Rvci5jbGFzc2VzLnNwbGljZShqLCAxKTtcblx0XHRcdFx0XHR2YXIgY3NzU2VsZXRvciA9IHNlbGVjdG9ycy5nZXRDc3NTZWxlY3RvcigpO1xuXHRcdFx0XHRcdHZhciBuZXdTZWxlY3RlZEVsZW1lbnRzID0gdGhpcy5xdWVyeShjc3NTZWxldG9yKTtcblx0XHRcdFx0XHQvLyBpZiByZXN1bHRzIGRvZXNuJ3QgbWF0Y2ggdGhlbiB1bmRvIGNoYW5nZXNcblx0XHRcdFx0XHRpZiAoIWNvbXBhcmVFbGVtZW50cyhuZXdTZWxlY3RlZEVsZW1lbnRzKSkge1xuXHRcdFx0XHRcdFx0c2VsZWN0b3IuY2xhc3Nlcy5zcGxpY2UoaiwgMCwgY2NsYXNzKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBzdHJpcCB0YWdzXG5cdFx0Zm9yICh2YXIgaSA9IHNlbGVjdG9ycy5sZW5ndGggLSAxOyBpID4gMDsgaS0tKSB7XG5cdFx0XHR2YXIgc2VsZWN0b3IgPSBzZWxlY3RvcnNbaV07XG5cdFx0XHRzZWxlY3RvcnMuc3BsaWNlKGksIDEpO1xuXHRcdFx0dmFyIGNzc1NlbGV0b3IgPSBzZWxlY3RvcnMuZ2V0Q3NzU2VsZWN0b3IoKTtcblx0XHRcdHZhciBuZXdTZWxlY3RlZEVsZW1lbnRzID0gdGhpcy5xdWVyeShjc3NTZWxldG9yKTtcblx0XHRcdC8vIGlmIHJlc3VsdHMgZG9lc24ndCBtYXRjaCB0aGVuIHVuZG8gY2hhbmdlc1xuXHRcdFx0aWYgKCFjb21wYXJlRWxlbWVudHMobmV3U2VsZWN0ZWRFbGVtZW50cykpIHtcblx0XHRcdFx0c2VsZWN0b3JzLnNwbGljZShpLCAwLCBzZWxlY3Rvcik7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHNlbGVjdG9ycztcblx0fSxcblx0Z2V0RWxlbWVudFNlbGVjdG9yczogZnVuY3Rpb24gKGVsZW1lbnRzLCB0b3ApIHtcblx0XHR2YXIgZWxlbWVudFNlbGVjdG9ycyA9IFtdO1xuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGVsZW1lbnQgPSBlbGVtZW50c1tpXTtcblx0XHRcdHZhciBlbGVtZW50U2VsZWN0b3IgPSB0aGlzLmdldEVsZW1lbnRTZWxlY3RvcihlbGVtZW50LCB0b3ApO1xuXHRcdFx0ZWxlbWVudFNlbGVjdG9ycy5wdXNoKGVsZW1lbnRTZWxlY3Rvcik7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGVsZW1lbnRTZWxlY3RvcnM7XG5cdH0sXG5cdGdldEVsZW1lbnRTZWxlY3RvcjogZnVuY3Rpb24gKGVsZW1lbnQsIHRvcCkge1xuXG5cdFx0dmFyIGVsZW1lbnRTZWxlY3Rvckxpc3QgPSBuZXcgRWxlbWVudFNlbGVjdG9yTGlzdCh0aGlzKTtcblx0XHR3aGlsZSAodHJ1ZSkge1xuXHRcdFx0aWYgKGVsZW1lbnQgPT09IHRoaXMucGFyZW50KSB7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAoZWxlbWVudCA9PT0gdW5kZWZpbmVkIHx8IGVsZW1lbnQgPT09IHRoaXMuZG9jdW1lbnQpIHtcblx0XHRcdFx0dGhyb3cgJ2VsZW1lbnQgaXMgbm90IGEgY2hpbGQgb2YgdGhlIGdpdmVuIHBhcmVudCc7XG5cdFx0XHR9XG5cdFx0XHRpZiAodGhpcy5pc0lnbm9yZWRUYWcoZWxlbWVudC50YWdOYW1lKSkge1xuXG5cdFx0XHRcdGVsZW1lbnQgPSBlbGVtZW50LnBhcmVudE5vZGU7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRvcCA+IDApIHtcblx0XHRcdFx0dG9wLS07XG5cdFx0XHRcdGVsZW1lbnQgPSBlbGVtZW50LnBhcmVudE5vZGU7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgc2VsZWN0b3IgPSBuZXcgRWxlbWVudFNlbGVjdG9yKGVsZW1lbnQsIHRoaXMuaWdub3JlZENsYXNzZXMpO1xuXHRcdFx0Ly8gZG9jdW1lbnQgZG9lcyBub3QgaGF2ZSBhIHRhZ05hbWVcblx0XHRcdGlmKGVsZW1lbnQucGFyZW50Tm9kZSA9PT0gdGhpcy5kb2N1bWVudCB8fCB0aGlzLmlzSWdub3JlZFRhZyhlbGVtZW50LnBhcmVudE5vZGUudGFnTmFtZSkpIHtcblx0XHRcdFx0c2VsZWN0b3IuaXNEaXJlY3RDaGlsZCA9IGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRlbGVtZW50U2VsZWN0b3JMaXN0LnB1c2goc2VsZWN0b3IpO1xuXHRcdFx0ZWxlbWVudCA9IGVsZW1lbnQucGFyZW50Tm9kZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZWxlbWVudFNlbGVjdG9yTGlzdDtcblx0fSxcblxuICAgIC8qKlxuICAgICAqIENvbXBhcmVzIHdoZXRoZXIgdHdvIGVsZW1lbnRzIGFyZSBzaW1pbGFyLiBTaW1pbGFyIGVsZW1lbnRzIHNob3VsZFxuICAgICAqIGhhdmUgYSBjb21tb24gcGFycmVudCBhbmQgYWxsIHBhcmVudCBlbGVtZW50cyBzaG91bGQgYmUgdGhlIHNhbWUgdHlwZS5cbiAgICAgKiBAcGFyYW0gZWxlbWVudDFcbiAgICAgKiBAcGFyYW0gZWxlbWVudDJcbiAgICAgKi9cbiAgICBjaGVja1NpbWlsYXJFbGVtZW50czogZnVuY3Rpb24oZWxlbWVudDEsIGVsZW1lbnQyKSB7XG5cbiAgICAgICAgd2hpbGUgKHRydWUpIHtcblxuICAgICAgICAgICAgaWYoZWxlbWVudDEudGFnTmFtZSAhPT0gZWxlbWVudDIudGFnTmFtZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKGVsZW1lbnQxID09PSBlbGVtZW50Mikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBzdG9wIGF0IGJvZHkgdGFnXG4gICAgICAgICAgICBpZiAoZWxlbWVudDEgPT09IHVuZGVmaW5lZCB8fCBlbGVtZW50MS50YWdOYW1lID09PSAnYm9keSdcbiAgICAgICAgICAgICAgICB8fCBlbGVtZW50MS50YWdOYW1lID09PSAnQk9EWScpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZWxlbWVudDIgPT09IHVuZGVmaW5lZCB8fCBlbGVtZW50Mi50YWdOYW1lID09PSAnYm9keSdcbiAgICAgICAgICAgICAgICB8fCBlbGVtZW50Mi50YWdOYW1lID09PSAnQk9EWScpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGVsZW1lbnQxID0gZWxlbWVudDEucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIGVsZW1lbnQyID0gZWxlbWVudDIucGFyZW50Tm9kZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHcm91cHMgZWxlbWVudHMgaW50byBncm91cHMgaWYgdGhlIGVtZWxlbnRzIGFyZSBub3Qgc2ltaWxhclxuICAgICAqIEBwYXJhbSBlbGVtZW50c1xuICAgICAqL1xuICAgIGdldEVsZW1lbnRHcm91cHM6IGZ1bmN0aW9uKGVsZW1lbnRzKSB7XG5cbiAgICAgICAgLy8gZmlyc3QgZWxtZW50IGlzIGluIHRoZSBmaXJzdCBncm91cFxuICAgICAgICAvLyBAVE9ETyBtYXliZSBpIGRvbnQgbmVlZCB0aGlzP1xuICAgICAgICB2YXIgZ3JvdXBzID0gW1tlbGVtZW50c1swXV1dO1xuXG4gICAgICAgIGZvcih2YXIgaSA9IDE7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGVsZW1lbnROZXcgPSBlbGVtZW50c1tpXTtcbiAgICAgICAgICAgIHZhciBhZGRlZFRvR3JvdXAgPSBmYWxzZTtcbiAgICAgICAgICAgIGZvcih2YXIgaiA9IDA7IGogPCBncm91cHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgZ3JvdXAgPSBncm91cHNbal07XG4gICAgICAgICAgICAgICAgdmFyIGVsZW1lbnRHcm91cCA9IGdyb3VwWzBdO1xuICAgICAgICAgICAgICAgIGlmKHRoaXMuY2hlY2tTaW1pbGFyRWxlbWVudHMoZWxlbWVudE5ldywgZWxlbWVudEdyb3VwKSkge1xuICAgICAgICAgICAgICAgICAgICBncm91cC5wdXNoKGVsZW1lbnROZXcpO1xuICAgICAgICAgICAgICAgICAgICBhZGRlZFRvR3JvdXAgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGFkZCBuZXcgZ3JvdXBcbiAgICAgICAgICAgIGlmKCFhZGRlZFRvR3JvdXApIHtcbiAgICAgICAgICAgICAgICBncm91cHMucHVzaChbZWxlbWVudE5ld10pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGdyb3VwcztcbiAgICB9LFxuXHRnZXRDc3NTZWxlY3RvcjogZnVuY3Rpb24gKGVsZW1lbnRzLCB0b3ApIHtcblxuXHRcdHRvcCA9IHRvcCB8fCAwO1xuXG5cdFx0dmFyIGVuYWJsZVNtYXJ0VGFibGVTZWxlY3RvciA9IHRoaXMuZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yO1xuXHRcdGlmIChlbGVtZW50cy5sZW5ndGggPiAxKSB7XG5cdFx0XHR0aGlzLmVuYWJsZVNtYXJ0VGFibGVTZWxlY3RvciA9IGZhbHNlO1xuXHRcdH1cblxuICAgICAgICAvLyBncm91cCBlbGVtZW50cyBpbnRvIHNpbWlsYXJpdHkgZ3JvdXBzXG4gICAgICAgIHZhciBlbGVtZW50R3JvdXBzID0gdGhpcy5nZXRFbGVtZW50R3JvdXBzKGVsZW1lbnRzKTtcblxuICAgICAgICB2YXIgcmVzdWx0Q1NTU2VsZWN0b3I7XG5cbiAgICAgICAgaWYodGhpcy5hbGxvd011bHRpcGxlU2VsZWN0b3JzKSB7XG5cbiAgICAgICAgICAgIHZhciBncm91cFNlbGVjdG9ycyA9IFtdO1xuXG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgZWxlbWVudEdyb3Vwcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBncm91cEVsZW1lbnRzID0gZWxlbWVudEdyb3Vwc1tpXTtcblxuICAgICAgICAgICAgICAgIHZhciBlbGVtZW50U2VsZWN0b3JzID0gdGhpcy5nZXRFbGVtZW50U2VsZWN0b3JzKGdyb3VwRWxlbWVudHMsIHRvcCk7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdFNlbGVjdG9yID0gdGhpcy5tZXJnZUVsZW1lbnRTZWxlY3RvcnMoZWxlbWVudFNlbGVjdG9ycyk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZW5hYmxlUmVzdWx0U3RyaXBwaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdFNlbGVjdG9yID0gdGhpcy5zdHJpcFNlbGVjdG9yKHJlc3VsdFNlbGVjdG9yKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBncm91cFNlbGVjdG9ycy5wdXNoKHJlc3VsdFNlbGVjdG9yLmdldENzc1NlbGVjdG9yKCkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXN1bHRDU1NTZWxlY3RvciA9IGdyb3VwU2VsZWN0b3JzLmpvaW4oJywgJyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZihlbGVtZW50R3JvdXBzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgICAgICAgICAgIHRocm93IFwiZm91bmQgbXVsdGlwbGUgZWxlbWVudCBncm91cHMsIGJ1dCBhbGxvd011bHRpcGxlU2VsZWN0b3JzIGRpc2FibGVkXCI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBlbGVtZW50U2VsZWN0b3JzID0gdGhpcy5nZXRFbGVtZW50U2VsZWN0b3JzKGVsZW1lbnRzLCB0b3ApO1xuICAgICAgICAgICAgdmFyIHJlc3VsdFNlbGVjdG9yID0gdGhpcy5tZXJnZUVsZW1lbnRTZWxlY3RvcnMoZWxlbWVudFNlbGVjdG9ycyk7XG4gICAgICAgICAgICBpZiAodGhpcy5lbmFibGVSZXN1bHRTdHJpcHBpbmcpIHtcbiAgICAgICAgICAgICAgICByZXN1bHRTZWxlY3RvciA9IHRoaXMuc3RyaXBTZWxlY3RvcihyZXN1bHRTZWxlY3Rvcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlc3VsdENTU1NlbGVjdG9yID0gcmVzdWx0U2VsZWN0b3IuZ2V0Q3NzU2VsZWN0b3IoKTtcbiAgICAgICAgfVxuXG5cdFx0dGhpcy5lbmFibGVTbWFydFRhYmxlU2VsZWN0b3IgPSBlbmFibGVTbWFydFRhYmxlU2VsZWN0b3I7XG5cblx0XHQvLyBzdHJpcCBkb3duIHNlbGVjdG9yXG5cdFx0cmV0dXJuIHJlc3VsdENTU1NlbGVjdG9yO1xuXHR9LFxuXHRpc0lnbm9yZWRUYWc6IGZ1bmN0aW9uICh0YWcpIHtcblx0XHRyZXR1cm4gdGhpcy5pZ25vcmVkVGFncy5pbmRleE9mKHRhZy50b0xvd2VyQ2FzZSgpKSAhPT0gLTE7XG5cdH1cbn07XG4iLCJcbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9saWIvanF1ZXJ5LWRlZmVycmVkJyk7IiwidmFyIGpRdWVyeSA9IG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vanF1ZXJ5LWNvcmUuanNcIiksXG5cdGNvcmVfcnNwYWNlID0gL1xccysvO1xuLyoqXG4qIGpRdWVyeSBDYWxsYmFja3NcbipcbiogQ29kZSBmcm9tOiBodHRwczovL2dpdGh1Yi5jb20vanF1ZXJ5L2pxdWVyeS9ibG9iL21hc3Rlci9zcmMvY2FsbGJhY2tzLmpzXG4qXG4qL1xuXG5cbi8vIFN0cmluZyB0byBPYmplY3Qgb3B0aW9ucyBmb3JtYXQgY2FjaGVcbnZhciBvcHRpb25zQ2FjaGUgPSB7fTtcblxuLy8gQ29udmVydCBTdHJpbmctZm9ybWF0dGVkIG9wdGlvbnMgaW50byBPYmplY3QtZm9ybWF0dGVkIG9uZXMgYW5kIHN0b3JlIGluIGNhY2hlXG5mdW5jdGlvbiBjcmVhdGVPcHRpb25zKCBvcHRpb25zICkge1xuXHR2YXIgb2JqZWN0ID0gb3B0aW9uc0NhY2hlWyBvcHRpb25zIF0gPSB7fTtcblx0alF1ZXJ5LmVhY2goIG9wdGlvbnMuc3BsaXQoIGNvcmVfcnNwYWNlICksIGZ1bmN0aW9uKCBfLCBmbGFnICkge1xuXHRcdG9iamVjdFsgZmxhZyBdID0gdHJ1ZTtcblx0fSk7XG5cdHJldHVybiBvYmplY3Q7XG59XG5cbi8qXG4gKiBDcmVhdGUgYSBjYWxsYmFjayBsaXN0IHVzaW5nIHRoZSBmb2xsb3dpbmcgcGFyYW1ldGVyczpcbiAqXG4gKlx0b3B0aW9uczogYW4gb3B0aW9uYWwgbGlzdCBvZiBzcGFjZS1zZXBhcmF0ZWQgb3B0aW9ucyB0aGF0IHdpbGwgY2hhbmdlIGhvd1xuICpcdFx0XHR0aGUgY2FsbGJhY2sgbGlzdCBiZWhhdmVzIG9yIGEgbW9yZSB0cmFkaXRpb25hbCBvcHRpb24gb2JqZWN0XG4gKlxuICogQnkgZGVmYXVsdCBhIGNhbGxiYWNrIGxpc3Qgd2lsbCBhY3QgbGlrZSBhbiBldmVudCBjYWxsYmFjayBsaXN0IGFuZCBjYW4gYmVcbiAqIFwiZmlyZWRcIiBtdWx0aXBsZSB0aW1lcy5cbiAqXG4gKiBQb3NzaWJsZSBvcHRpb25zOlxuICpcbiAqXHRvbmNlOlx0XHRcdHdpbGwgZW5zdXJlIHRoZSBjYWxsYmFjayBsaXN0IGNhbiBvbmx5IGJlIGZpcmVkIG9uY2UgKGxpa2UgYSBEZWZlcnJlZClcbiAqXG4gKlx0bWVtb3J5Olx0XHRcdHdpbGwga2VlcCB0cmFjayBvZiBwcmV2aW91cyB2YWx1ZXMgYW5kIHdpbGwgY2FsbCBhbnkgY2FsbGJhY2sgYWRkZWRcbiAqXHRcdFx0XHRcdGFmdGVyIHRoZSBsaXN0IGhhcyBiZWVuIGZpcmVkIHJpZ2h0IGF3YXkgd2l0aCB0aGUgbGF0ZXN0IFwibWVtb3JpemVkXCJcbiAqXHRcdFx0XHRcdHZhbHVlcyAobGlrZSBhIERlZmVycmVkKVxuICpcbiAqXHR1bmlxdWU6XHRcdFx0d2lsbCBlbnN1cmUgYSBjYWxsYmFjayBjYW4gb25seSBiZSBhZGRlZCBvbmNlIChubyBkdXBsaWNhdGUgaW4gdGhlIGxpc3QpXG4gKlxuICpcdHN0b3BPbkZhbHNlOlx0aW50ZXJydXB0IGNhbGxpbmdzIHdoZW4gYSBjYWxsYmFjayByZXR1cm5zIGZhbHNlXG4gKlxuICovXG5qUXVlcnkuQ2FsbGJhY2tzID0gZnVuY3Rpb24oIG9wdGlvbnMgKSB7XG5cblx0Ly8gQ29udmVydCBvcHRpb25zIGZyb20gU3RyaW5nLWZvcm1hdHRlZCB0byBPYmplY3QtZm9ybWF0dGVkIGlmIG5lZWRlZFxuXHQvLyAod2UgY2hlY2sgaW4gY2FjaGUgZmlyc3QpXG5cdG9wdGlvbnMgPSB0eXBlb2Ygb3B0aW9ucyA9PT0gXCJzdHJpbmdcIiA/XG5cdFx0KCBvcHRpb25zQ2FjaGVbIG9wdGlvbnMgXSB8fCBjcmVhdGVPcHRpb25zKCBvcHRpb25zICkgKSA6XG5cdFx0alF1ZXJ5LmV4dGVuZCgge30sIG9wdGlvbnMgKTtcblxuXHR2YXIgLy8gTGFzdCBmaXJlIHZhbHVlIChmb3Igbm9uLWZvcmdldHRhYmxlIGxpc3RzKVxuXHRcdG1lbW9yeSxcblx0XHQvLyBGbGFnIHRvIGtub3cgaWYgbGlzdCB3YXMgYWxyZWFkeSBmaXJlZFxuXHRcdGZpcmVkLFxuXHRcdC8vIEZsYWcgdG8ga25vdyBpZiBsaXN0IGlzIGN1cnJlbnRseSBmaXJpbmdcblx0XHRmaXJpbmcsXG5cdFx0Ly8gRmlyc3QgY2FsbGJhY2sgdG8gZmlyZSAodXNlZCBpbnRlcm5hbGx5IGJ5IGFkZCBhbmQgZmlyZVdpdGgpXG5cdFx0ZmlyaW5nU3RhcnQsXG5cdFx0Ly8gRW5kIG9mIHRoZSBsb29wIHdoZW4gZmlyaW5nXG5cdFx0ZmlyaW5nTGVuZ3RoLFxuXHRcdC8vIEluZGV4IG9mIGN1cnJlbnRseSBmaXJpbmcgY2FsbGJhY2sgKG1vZGlmaWVkIGJ5IHJlbW92ZSBpZiBuZWVkZWQpXG5cdFx0ZmlyaW5nSW5kZXgsXG5cdFx0Ly8gQWN0dWFsIGNhbGxiYWNrIGxpc3Rcblx0XHRsaXN0ID0gW10sXG5cdFx0Ly8gU3RhY2sgb2YgZmlyZSBjYWxscyBmb3IgcmVwZWF0YWJsZSBsaXN0c1xuXHRcdHN0YWNrID0gIW9wdGlvbnMub25jZSAmJiBbXSxcblx0XHQvLyBGaXJlIGNhbGxiYWNrc1xuXHRcdGZpcmUgPSBmdW5jdGlvbiggZGF0YSApIHtcblx0XHRcdG1lbW9yeSA9IG9wdGlvbnMubWVtb3J5ICYmIGRhdGE7XG5cdFx0XHRmaXJlZCA9IHRydWU7XG5cdFx0XHRmaXJpbmdJbmRleCA9IGZpcmluZ1N0YXJ0IHx8IDA7XG5cdFx0XHRmaXJpbmdTdGFydCA9IDA7XG5cdFx0XHRmaXJpbmdMZW5ndGggPSBsaXN0Lmxlbmd0aDtcblx0XHRcdGZpcmluZyA9IHRydWU7XG5cdFx0XHRmb3IgKCA7IGxpc3QgJiYgZmlyaW5nSW5kZXggPCBmaXJpbmdMZW5ndGg7IGZpcmluZ0luZGV4KysgKSB7XG5cdFx0XHRcdGlmICggbGlzdFsgZmlyaW5nSW5kZXggXS5hcHBseSggZGF0YVsgMCBdLCBkYXRhWyAxIF0gKSA9PT0gZmFsc2UgJiYgb3B0aW9ucy5zdG9wT25GYWxzZSApIHtcblx0XHRcdFx0XHRtZW1vcnkgPSBmYWxzZTsgLy8gVG8gcHJldmVudCBmdXJ0aGVyIGNhbGxzIHVzaW5nIGFkZFxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRmaXJpbmcgPSBmYWxzZTtcblx0XHRcdGlmICggbGlzdCApIHtcblx0XHRcdFx0aWYgKCBzdGFjayApIHtcblx0XHRcdFx0XHRpZiAoIHN0YWNrLmxlbmd0aCApIHtcblx0XHRcdFx0XHRcdGZpcmUoIHN0YWNrLnNoaWZ0KCkgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSBpZiAoIG1lbW9yeSApIHtcblx0XHRcdFx0XHRsaXN0ID0gW107XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0c2VsZi5kaXNhYmxlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LFxuXHRcdC8vIEFjdHVhbCBDYWxsYmFja3Mgb2JqZWN0XG5cdFx0c2VsZiA9IHtcblx0XHRcdC8vIEFkZCBhIGNhbGxiYWNrIG9yIGEgY29sbGVjdGlvbiBvZiBjYWxsYmFja3MgdG8gdGhlIGxpc3Rcblx0XHRcdGFkZDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICggbGlzdCApIHtcblx0XHRcdFx0XHQvLyBGaXJzdCwgd2Ugc2F2ZSB0aGUgY3VycmVudCBsZW5ndGhcblx0XHRcdFx0XHR2YXIgc3RhcnQgPSBsaXN0Lmxlbmd0aDtcblx0XHRcdFx0XHQoZnVuY3Rpb24gYWRkKCBhcmdzICkge1xuXHRcdFx0XHRcdFx0alF1ZXJ5LmVhY2goIGFyZ3MsIGZ1bmN0aW9uKCBfLCBhcmcgKSB7XG5cdFx0XHRcdFx0XHRcdHZhciB0eXBlID0galF1ZXJ5LnR5cGUoIGFyZyApO1xuXHRcdFx0XHRcdFx0XHRpZiAoIHR5cGUgPT09IFwiZnVuY3Rpb25cIiApIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoICFvcHRpb25zLnVuaXF1ZSB8fCAhc2VsZi5oYXMoIGFyZyApICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0bGlzdC5wdXNoKCBhcmcgKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoIGFyZyAmJiBhcmcubGVuZ3RoICYmIHR5cGUgIT09IFwic3RyaW5nXCIgKSB7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gSW5zcGVjdCByZWN1cnNpdmVseVxuXHRcdFx0XHRcdFx0XHRcdGFkZCggYXJnICk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH0pKCBhcmd1bWVudHMgKTtcblx0XHRcdFx0XHQvLyBEbyB3ZSBuZWVkIHRvIGFkZCB0aGUgY2FsbGJhY2tzIHRvIHRoZVxuXHRcdFx0XHRcdC8vIGN1cnJlbnQgZmlyaW5nIGJhdGNoP1xuXHRcdFx0XHRcdGlmICggZmlyaW5nICkge1xuXHRcdFx0XHRcdFx0ZmlyaW5nTGVuZ3RoID0gbGlzdC5sZW5ndGg7XG5cdFx0XHRcdFx0Ly8gV2l0aCBtZW1vcnksIGlmIHdlJ3JlIG5vdCBmaXJpbmcgdGhlblxuXHRcdFx0XHRcdC8vIHdlIHNob3VsZCBjYWxsIHJpZ2h0IGF3YXlcblx0XHRcdFx0XHR9IGVsc2UgaWYgKCBtZW1vcnkgKSB7XG5cdFx0XHRcdFx0XHRmaXJpbmdTdGFydCA9IHN0YXJ0O1xuXHRcdFx0XHRcdFx0ZmlyZSggbWVtb3J5ICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fSxcblx0XHRcdC8vIFJlbW92ZSBhIGNhbGxiYWNrIGZyb20gdGhlIGxpc3Rcblx0XHRcdHJlbW92ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICggbGlzdCApIHtcblx0XHRcdFx0XHRqUXVlcnkuZWFjaCggYXJndW1lbnRzLCBmdW5jdGlvbiggXywgYXJnICkge1xuXHRcdFx0XHRcdFx0dmFyIGluZGV4O1xuXHRcdFx0XHRcdFx0d2hpbGUoICggaW5kZXggPSBqUXVlcnkuaW5BcnJheSggYXJnLCBsaXN0LCBpbmRleCApICkgPiAtMSApIHtcblx0XHRcdFx0XHRcdFx0bGlzdC5zcGxpY2UoIGluZGV4LCAxICk7XG5cdFx0XHRcdFx0XHRcdC8vIEhhbmRsZSBmaXJpbmcgaW5kZXhlc1xuXHRcdFx0XHRcdFx0XHRpZiAoIGZpcmluZyApIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoIGluZGV4IDw9IGZpcmluZ0xlbmd0aCApIHtcblx0XHRcdFx0XHRcdFx0XHRcdGZpcmluZ0xlbmd0aC0tO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRpZiAoIGluZGV4IDw9IGZpcmluZ0luZGV4ICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0ZmlyaW5nSW5kZXgtLTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH0sXG5cdFx0XHQvLyBDb250cm9sIGlmIGEgZ2l2ZW4gY2FsbGJhY2sgaXMgaW4gdGhlIGxpc3Rcblx0XHRcdGhhczogZnVuY3Rpb24oIGZuICkge1xuXHRcdFx0XHRyZXR1cm4galF1ZXJ5LmluQXJyYXkoIGZuLCBsaXN0ICkgPiAtMTtcblx0XHRcdH0sXG5cdFx0XHQvLyBSZW1vdmUgYWxsIGNhbGxiYWNrcyBmcm9tIHRoZSBsaXN0XG5cdFx0XHRlbXB0eTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGxpc3QgPSBbXTtcblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gSGF2ZSB0aGUgbGlzdCBkbyBub3RoaW5nIGFueW1vcmVcblx0XHRcdGRpc2FibGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRsaXN0ID0gc3RhY2sgPSBtZW1vcnkgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fSxcblx0XHRcdC8vIElzIGl0IGRpc2FibGVkP1xuXHRcdFx0ZGlzYWJsZWQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gIWxpc3Q7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gTG9jayB0aGUgbGlzdCBpbiBpdHMgY3VycmVudCBzdGF0ZVxuXHRcdFx0bG9jazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHN0YWNrID0gdW5kZWZpbmVkO1xuXHRcdFx0XHRpZiAoICFtZW1vcnkgKSB7XG5cdFx0XHRcdFx0c2VsZi5kaXNhYmxlKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gSXMgaXQgbG9ja2VkP1xuXHRcdFx0bG9ja2VkOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuICFzdGFjaztcblx0XHRcdH0sXG5cdFx0XHQvLyBDYWxsIGFsbCBjYWxsYmFja3Mgd2l0aCB0aGUgZ2l2ZW4gY29udGV4dCBhbmQgYXJndW1lbnRzXG5cdFx0XHRmaXJlV2l0aDogZnVuY3Rpb24oIGNvbnRleHQsIGFyZ3MgKSB7XG5cdFx0XHRcdGFyZ3MgPSBhcmdzIHx8IFtdO1xuXHRcdFx0XHRhcmdzID0gWyBjb250ZXh0LCBhcmdzLnNsaWNlID8gYXJncy5zbGljZSgpIDogYXJncyBdO1xuXHRcdFx0XHRpZiAoIGxpc3QgJiYgKCAhZmlyZWQgfHwgc3RhY2sgKSApIHtcblx0XHRcdFx0XHRpZiAoIGZpcmluZyApIHtcblx0XHRcdFx0XHRcdHN0YWNrLnB1c2goIGFyZ3MgKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0ZmlyZSggYXJncyApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH0sXG5cdFx0XHQvLyBDYWxsIGFsbCB0aGUgY2FsbGJhY2tzIHdpdGggdGhlIGdpdmVuIGFyZ3VtZW50c1xuXHRcdFx0ZmlyZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHNlbGYuZmlyZVdpdGgoIHRoaXMsIGFyZ3VtZW50cyApO1xuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH0sXG5cdFx0XHQvLyBUbyBrbm93IGlmIHRoZSBjYWxsYmFja3MgaGF2ZSBhbHJlYWR5IGJlZW4gY2FsbGVkIGF0IGxlYXN0IG9uY2Vcblx0XHRcdGZpcmVkOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuICEhZmlyZWQ7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRyZXR1cm4gc2VsZjtcbn07XG5cbiIsIi8qKlxuKiBqUXVlcnkgY29yZSBvYmplY3QuXG4qXG4qIFdvcmtlciB3aXRoIGpRdWVyeSBkZWZlcnJlZFxuKlxuKiBDb2RlIGZyb206IGh0dHBzOi8vZ2l0aHViLmNvbS9qcXVlcnkvanF1ZXJ5L2Jsb2IvbWFzdGVyL3NyYy9jb3JlLmpzXG4qXG4qL1xuXG52YXIgalF1ZXJ5ID0gbW9kdWxlLmV4cG9ydHMgPSB7XG5cdHR5cGU6IHR5cGVcblx0LCBpc0FycmF5OiBpc0FycmF5XG5cdCwgaXNGdW5jdGlvbjogaXNGdW5jdGlvblxuXHQsIGlzUGxhaW5PYmplY3Q6IGlzUGxhaW5PYmplY3Rcblx0LCBlYWNoOiBlYWNoXG5cdCwgZXh0ZW5kOiBleHRlbmRcblx0LCBub29wOiBmdW5jdGlvbigpIHt9XG59O1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG52YXIgY2xhc3MydHlwZSA9IHt9O1xuLy8gUG9wdWxhdGUgdGhlIGNsYXNzMnR5cGUgbWFwXG5cIkJvb2xlYW4gTnVtYmVyIFN0cmluZyBGdW5jdGlvbiBBcnJheSBEYXRlIFJlZ0V4cCBPYmplY3RcIi5zcGxpdChcIiBcIikuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG5cdGNsYXNzMnR5cGVbIFwiW29iamVjdCBcIiArIG5hbWUgKyBcIl1cIiBdID0gbmFtZS50b0xvd2VyQ2FzZSgpO1xufSk7XG5cblxuZnVuY3Rpb24gdHlwZSggb2JqICkge1xuXHRyZXR1cm4gb2JqID09IG51bGwgP1xuXHRcdFN0cmluZyggb2JqICkgOlxuXHRcdFx0Y2xhc3MydHlwZVsgdG9TdHJpbmcuY2FsbChvYmopIF0gfHwgXCJvYmplY3RcIjtcbn1cblxuZnVuY3Rpb24gaXNGdW5jdGlvbiggb2JqICkge1xuXHRyZXR1cm4galF1ZXJ5LnR5cGUob2JqKSA9PT0gXCJmdW5jdGlvblwiO1xufVxuXG5mdW5jdGlvbiBpc0FycmF5KCBvYmogKSB7XG5cdHJldHVybiBqUXVlcnkudHlwZShvYmopID09PSBcImFycmF5XCI7XG59XG5cbmZ1bmN0aW9uIGVhY2goIG9iamVjdCwgY2FsbGJhY2ssIGFyZ3MgKSB7XG5cdHZhciBuYW1lLCBpID0gMCxcblx0bGVuZ3RoID0gb2JqZWN0Lmxlbmd0aCxcblx0aXNPYmogPSBsZW5ndGggPT09IHVuZGVmaW5lZCB8fCBpc0Z1bmN0aW9uKCBvYmplY3QgKTtcblxuXHRpZiAoIGFyZ3MgKSB7XG5cdFx0aWYgKCBpc09iaiApIHtcblx0XHRcdGZvciAoIG5hbWUgaW4gb2JqZWN0ICkge1xuXHRcdFx0XHRpZiAoIGNhbGxiYWNrLmFwcGx5KCBvYmplY3RbIG5hbWUgXSwgYXJncyApID09PSBmYWxzZSApIHtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRmb3IgKCA7IGkgPCBsZW5ndGg7ICkge1xuXHRcdFx0XHRpZiAoIGNhbGxiYWNrLmFwcGx5KCBvYmplY3RbIGkrKyBdLCBhcmdzICkgPT09IGZhbHNlICkge1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gQSBzcGVjaWFsLCBmYXN0LCBjYXNlIGZvciB0aGUgbW9zdCBjb21tb24gdXNlIG9mIGVhY2hcblx0fSBlbHNlIHtcblx0XHRpZiAoIGlzT2JqICkge1xuXHRcdFx0Zm9yICggbmFtZSBpbiBvYmplY3QgKSB7XG5cdFx0XHRcdGlmICggY2FsbGJhY2suY2FsbCggb2JqZWN0WyBuYW1lIF0sIG5hbWUsIG9iamVjdFsgbmFtZSBdICkgPT09IGZhbHNlICkge1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdGZvciAoIDsgaSA8IGxlbmd0aDsgKSB7XG5cdFx0XHRcdGlmICggY2FsbGJhY2suY2FsbCggb2JqZWN0WyBpIF0sIGksIG9iamVjdFsgaSsrIF0gKSA9PT0gZmFsc2UgKSB7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gb2JqZWN0O1xufVxuXG5mdW5jdGlvbiBpc1BsYWluT2JqZWN0KCBvYmogKSB7XG5cdC8vIE11c3QgYmUgYW4gT2JqZWN0LlxuXHRpZiAoICFvYmogfHwgalF1ZXJ5LnR5cGUob2JqKSAhPT0gXCJvYmplY3RcIiApIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0cmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGV4dGVuZCgpIHtcblx0dmFyIG9wdGlvbnMsIG5hbWUsIHNyYywgY29weSwgY29weUlzQXJyYXksIGNsb25lLFxuXHR0YXJnZXQgPSBhcmd1bWVudHNbMF0gfHwge30sXG5cdGkgPSAxLFxuXHRsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoLFxuXHRkZWVwID0gZmFsc2U7XG5cblx0Ly8gSGFuZGxlIGEgZGVlcCBjb3B5IHNpdHVhdGlvblxuXHRpZiAoIHR5cGVvZiB0YXJnZXQgPT09IFwiYm9vbGVhblwiICkge1xuXHRcdGRlZXAgPSB0YXJnZXQ7XG5cdFx0dGFyZ2V0ID0gYXJndW1lbnRzWzFdIHx8IHt9O1xuXHRcdC8vIHNraXAgdGhlIGJvb2xlYW4gYW5kIHRoZSB0YXJnZXRcblx0XHRpID0gMjtcblx0fVxuXG5cdC8vIEhhbmRsZSBjYXNlIHdoZW4gdGFyZ2V0IGlzIGEgc3RyaW5nIG9yIHNvbWV0aGluZyAocG9zc2libGUgaW4gZGVlcCBjb3B5KVxuXHRpZiAoIHR5cGVvZiB0YXJnZXQgIT09IFwib2JqZWN0XCIgJiYgIWpRdWVyeS5pc0Z1bmN0aW9uKHRhcmdldCkgKSB7XG5cdFx0dGFyZ2V0ID0ge307XG5cdH1cblxuXHQvLyBleHRlbmQgalF1ZXJ5IGl0c2VsZiBpZiBvbmx5IG9uZSBhcmd1bWVudCBpcyBwYXNzZWRcblx0aWYgKCBsZW5ndGggPT09IGkgKSB7XG5cdFx0dGFyZ2V0ID0gdGhpcztcblx0XHQtLWk7XG5cdH1cblxuXHRmb3IgKCA7IGkgPCBsZW5ndGg7IGkrKyApIHtcblx0XHQvLyBPbmx5IGRlYWwgd2l0aCBub24tbnVsbC91bmRlZmluZWQgdmFsdWVzXG5cdFx0aWYgKCAob3B0aW9ucyA9IGFyZ3VtZW50c1sgaSBdKSAhPSBudWxsICkge1xuXHRcdFx0Ly8gRXh0ZW5kIHRoZSBiYXNlIG9iamVjdFxuXHRcdFx0Zm9yICggbmFtZSBpbiBvcHRpb25zICkge1xuXHRcdFx0XHRzcmMgPSB0YXJnZXRbIG5hbWUgXTtcblx0XHRcdFx0Y29weSA9IG9wdGlvbnNbIG5hbWUgXTtcblxuXHRcdFx0XHQvLyBQcmV2ZW50IG5ldmVyLWVuZGluZyBsb29wXG5cdFx0XHRcdGlmICggdGFyZ2V0ID09PSBjb3B5ICkge1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gUmVjdXJzZSBpZiB3ZSdyZSBtZXJnaW5nIHBsYWluIG9iamVjdHMgb3IgYXJyYXlzXG5cdFx0XHRcdGlmICggZGVlcCAmJiBjb3B5ICYmICggalF1ZXJ5LmlzUGxhaW5PYmplY3QoY29weSkgfHwgKGNvcHlJc0FycmF5ID0galF1ZXJ5LmlzQXJyYXkoY29weSkpICkgKSB7XG5cdFx0XHRcdFx0aWYgKCBjb3B5SXNBcnJheSApIHtcblx0XHRcdFx0XHRcdGNvcHlJc0FycmF5ID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRjbG9uZSA9IHNyYyAmJiBqUXVlcnkuaXNBcnJheShzcmMpID8gc3JjIDogW107XG5cblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y2xvbmUgPSBzcmMgJiYgalF1ZXJ5LmlzUGxhaW5PYmplY3Qoc3JjKSA/IHNyYyA6IHt9O1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIE5ldmVyIG1vdmUgb3JpZ2luYWwgb2JqZWN0cywgY2xvbmUgdGhlbVxuXHRcdFx0XHRcdHRhcmdldFsgbmFtZSBdID0galF1ZXJ5LmV4dGVuZCggZGVlcCwgY2xvbmUsIGNvcHkgKTtcblxuXHRcdFx0XHRcdC8vIERvbid0IGJyaW5nIGluIHVuZGVmaW5lZCB2YWx1ZXNcblx0XHRcdFx0fSBlbHNlIGlmICggY29weSAhPT0gdW5kZWZpbmVkICkge1xuXHRcdFx0XHRcdHRhcmdldFsgbmFtZSBdID0gY29weTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vIFJldHVybiB0aGUgbW9kaWZpZWQgb2JqZWN0XG5cdHJldHVybiB0YXJnZXQ7XG59O1xuXG5cbiIsIlxuLyohXG4qIGpxdWVyeS1kZWZlcnJlZFxuKiBDb3B5cmlnaHQoYykgMjAxMSBIaWRkZW4gPHp6ZGhpZGRlbkBnbWFpbC5jb20+XG4qIE1JVCBMaWNlbnNlZFxuKi9cblxuLyoqXG4qIExpYnJhcnkgdmVyc2lvbi5cbiovXG5cbnZhciBqUXVlcnkgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL2pxdWVyeS1jYWxsYmFja3MuanNcIiksXG5cdGNvcmVfc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG5cbi8qKlxuKiBqUXVlcnkgZGVmZXJyZWRcbipcbiogQ29kZSBmcm9tOiBodHRwczovL2dpdGh1Yi5jb20vanF1ZXJ5L2pxdWVyeS9ibG9iL21hc3Rlci9zcmMvZGVmZXJyZWQuanNcbiogRG9jOiBodHRwOi8vYXBpLmpxdWVyeS5jb20vY2F0ZWdvcnkvZGVmZXJyZWQtb2JqZWN0L1xuKlxuKi9cblxualF1ZXJ5LmV4dGVuZCh7XG5cblx0RGVmZXJyZWQ6IGZ1bmN0aW9uKCBmdW5jICkge1xuXHRcdHZhciB0dXBsZXMgPSBbXG5cdFx0XHRcdC8vIGFjdGlvbiwgYWRkIGxpc3RlbmVyLCBsaXN0ZW5lciBsaXN0LCBmaW5hbCBzdGF0ZVxuXHRcdFx0XHRbIFwicmVzb2x2ZVwiLCBcImRvbmVcIiwgalF1ZXJ5LkNhbGxiYWNrcyhcIm9uY2UgbWVtb3J5XCIpLCBcInJlc29sdmVkXCIgXSxcblx0XHRcdFx0WyBcInJlamVjdFwiLCBcImZhaWxcIiwgalF1ZXJ5LkNhbGxiYWNrcyhcIm9uY2UgbWVtb3J5XCIpLCBcInJlamVjdGVkXCIgXSxcblx0XHRcdFx0WyBcIm5vdGlmeVwiLCBcInByb2dyZXNzXCIsIGpRdWVyeS5DYWxsYmFja3MoXCJtZW1vcnlcIikgXVxuXHRcdFx0XSxcblx0XHRcdHN0YXRlID0gXCJwZW5kaW5nXCIsXG5cdFx0XHRwcm9taXNlID0ge1xuXHRcdFx0XHRzdGF0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHN0YXRlO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRhbHdheXM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGRlZmVycmVkLmRvbmUoIGFyZ3VtZW50cyApLmZhaWwoIGFyZ3VtZW50cyApO1xuXHRcdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHR0aGVuOiBmdW5jdGlvbiggLyogZm5Eb25lLCBmbkZhaWwsIGZuUHJvZ3Jlc3MgKi8gKSB7XG5cdFx0XHRcdFx0dmFyIGZucyA9IGFyZ3VtZW50cztcblx0XHRcdFx0XHRyZXR1cm4galF1ZXJ5LkRlZmVycmVkKGZ1bmN0aW9uKCBuZXdEZWZlciApIHtcblx0XHRcdFx0XHRcdGpRdWVyeS5lYWNoKCB0dXBsZXMsIGZ1bmN0aW9uKCBpLCB0dXBsZSApIHtcblx0XHRcdFx0XHRcdFx0dmFyIGFjdGlvbiA9IHR1cGxlWyAwIF0sXG5cdFx0XHRcdFx0XHRcdFx0Zm4gPSBmbnNbIGkgXTtcblx0XHRcdFx0XHRcdFx0Ly8gZGVmZXJyZWRbIGRvbmUgfCBmYWlsIHwgcHJvZ3Jlc3MgXSBmb3IgZm9yd2FyZGluZyBhY3Rpb25zIHRvIG5ld0RlZmVyXG5cdFx0XHRcdFx0XHRcdGRlZmVycmVkWyB0dXBsZVsxXSBdKCBqUXVlcnkuaXNGdW5jdGlvbiggZm4gKSA/XG5cdFx0XHRcdFx0XHRcdFx0ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR2YXIgcmV0dXJuZWQgPSBmbi5hcHBseSggdGhpcywgYXJndW1lbnRzICk7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoIHJldHVybmVkICYmIGpRdWVyeS5pc0Z1bmN0aW9uKCByZXR1cm5lZC5wcm9taXNlICkgKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJldHVybmVkLnByb21pc2UoKVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdC5kb25lKCBuZXdEZWZlci5yZXNvbHZlIClcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQuZmFpbCggbmV3RGVmZXIucmVqZWN0IClcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQucHJvZ3Jlc3MoIG5ld0RlZmVyLm5vdGlmeSApO1xuXHRcdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0bmV3RGVmZXJbIGFjdGlvbiArIFwiV2l0aFwiIF0oIHRoaXMgPT09IGRlZmVycmVkID8gbmV3RGVmZXIgOiB0aGlzLCBbIHJldHVybmVkIF0gKTtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR9IDpcblx0XHRcdFx0XHRcdFx0XHRuZXdEZWZlclsgYWN0aW9uIF1cblx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0Zm5zID0gbnVsbDtcblx0XHRcdFx0XHR9KS5wcm9taXNlKCk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdC8vIEdldCBhIHByb21pc2UgZm9yIHRoaXMgZGVmZXJyZWRcblx0XHRcdFx0Ly8gSWYgb2JqIGlzIHByb3ZpZGVkLCB0aGUgcHJvbWlzZSBhc3BlY3QgaXMgYWRkZWQgdG8gdGhlIG9iamVjdFxuXHRcdFx0XHRwcm9taXNlOiBmdW5jdGlvbiggb2JqICkge1xuXHRcdFx0XHRcdHJldHVybiBvYmogIT0gbnVsbCA/IGpRdWVyeS5leHRlbmQoIG9iaiwgcHJvbWlzZSApIDogcHJvbWlzZTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGRlZmVycmVkID0ge307XG5cblx0XHQvLyBLZWVwIHBpcGUgZm9yIGJhY2stY29tcGF0XG5cdFx0cHJvbWlzZS5waXBlID0gcHJvbWlzZS50aGVuO1xuXG5cdFx0Ly8gQWRkIGxpc3Qtc3BlY2lmaWMgbWV0aG9kc1xuXHRcdGpRdWVyeS5lYWNoKCB0dXBsZXMsIGZ1bmN0aW9uKCBpLCB0dXBsZSApIHtcblx0XHRcdHZhciBsaXN0ID0gdHVwbGVbIDIgXSxcblx0XHRcdFx0c3RhdGVTdHJpbmcgPSB0dXBsZVsgMyBdO1xuXG5cdFx0XHQvLyBwcm9taXNlWyBkb25lIHwgZmFpbCB8IHByb2dyZXNzIF0gPSBsaXN0LmFkZFxuXHRcdFx0cHJvbWlzZVsgdHVwbGVbMV0gXSA9IGxpc3QuYWRkO1xuXG5cdFx0XHQvLyBIYW5kbGUgc3RhdGVcblx0XHRcdGlmICggc3RhdGVTdHJpbmcgKSB7XG5cdFx0XHRcdGxpc3QuYWRkKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vIHN0YXRlID0gWyByZXNvbHZlZCB8IHJlamVjdGVkIF1cblx0XHRcdFx0XHRzdGF0ZSA9IHN0YXRlU3RyaW5nO1xuXG5cdFx0XHRcdC8vIFsgcmVqZWN0X2xpc3QgfCByZXNvbHZlX2xpc3QgXS5kaXNhYmxlOyBwcm9ncmVzc19saXN0LmxvY2tcblx0XHRcdFx0fSwgdHVwbGVzWyBpIF4gMSBdWyAyIF0uZGlzYWJsZSwgdHVwbGVzWyAyIF1bIDIgXS5sb2NrICk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIGRlZmVycmVkWyByZXNvbHZlIHwgcmVqZWN0IHwgbm90aWZ5IF0gPSBsaXN0LmZpcmVcblx0XHRcdGRlZmVycmVkWyB0dXBsZVswXSBdID0gbGlzdC5maXJlO1xuXHRcdFx0ZGVmZXJyZWRbIHR1cGxlWzBdICsgXCJXaXRoXCIgXSA9IGxpc3QuZmlyZVdpdGg7XG5cdFx0fSk7XG5cblx0XHQvLyBNYWtlIHRoZSBkZWZlcnJlZCBhIHByb21pc2Vcblx0XHRwcm9taXNlLnByb21pc2UoIGRlZmVycmVkICk7XG5cblx0XHQvLyBDYWxsIGdpdmVuIGZ1bmMgaWYgYW55XG5cdFx0aWYgKCBmdW5jICkge1xuXHRcdFx0ZnVuYy5jYWxsKCBkZWZlcnJlZCwgZGVmZXJyZWQgKTtcblx0XHR9XG5cblx0XHQvLyBBbGwgZG9uZSFcblx0XHRyZXR1cm4gZGVmZXJyZWQ7XG5cdH0sXG5cblx0Ly8gRGVmZXJyZWQgaGVscGVyXG5cdHdoZW46IGZ1bmN0aW9uKCBzdWJvcmRpbmF0ZSAvKiAsIC4uLiwgc3Vib3JkaW5hdGVOICovICkge1xuXHRcdHZhciBpID0gMCxcblx0XHRcdHJlc29sdmVWYWx1ZXMgPSBjb3JlX3NsaWNlLmNhbGwoIGFyZ3VtZW50cyApLFxuXHRcdFx0bGVuZ3RoID0gcmVzb2x2ZVZhbHVlcy5sZW5ndGgsXG5cblx0XHRcdC8vIHRoZSBjb3VudCBvZiB1bmNvbXBsZXRlZCBzdWJvcmRpbmF0ZXNcblx0XHRcdHJlbWFpbmluZyA9IGxlbmd0aCAhPT0gMSB8fCAoIHN1Ym9yZGluYXRlICYmIGpRdWVyeS5pc0Z1bmN0aW9uKCBzdWJvcmRpbmF0ZS5wcm9taXNlICkgKSA/IGxlbmd0aCA6IDAsXG5cblx0XHRcdC8vIHRoZSBtYXN0ZXIgRGVmZXJyZWQuIElmIHJlc29sdmVWYWx1ZXMgY29uc2lzdCBvZiBvbmx5IGEgc2luZ2xlIERlZmVycmVkLCBqdXN0IHVzZSB0aGF0LlxuXHRcdFx0ZGVmZXJyZWQgPSByZW1haW5pbmcgPT09IDEgPyBzdWJvcmRpbmF0ZSA6IGpRdWVyeS5EZWZlcnJlZCgpLFxuXG5cdFx0XHQvLyBVcGRhdGUgZnVuY3Rpb24gZm9yIGJvdGggcmVzb2x2ZSBhbmQgcHJvZ3Jlc3MgdmFsdWVzXG5cdFx0XHR1cGRhdGVGdW5jID0gZnVuY3Rpb24oIGksIGNvbnRleHRzLCB2YWx1ZXMgKSB7XG5cdFx0XHRcdHJldHVybiBmdW5jdGlvbiggdmFsdWUgKSB7XG5cdFx0XHRcdFx0Y29udGV4dHNbIGkgXSA9IHRoaXM7XG5cdFx0XHRcdFx0dmFsdWVzWyBpIF0gPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGNvcmVfc2xpY2UuY2FsbCggYXJndW1lbnRzICkgOiB2YWx1ZTtcblx0XHRcdFx0XHRpZiggdmFsdWVzID09PSBwcm9ncmVzc1ZhbHVlcyApIHtcblx0XHRcdFx0XHRcdGRlZmVycmVkLm5vdGlmeVdpdGgoIGNvbnRleHRzLCB2YWx1ZXMgKTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKCAhKCAtLXJlbWFpbmluZyApICkge1xuXHRcdFx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZVdpdGgoIGNvbnRleHRzLCB2YWx1ZXMgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH07XG5cdFx0XHR9LFxuXG5cdFx0XHRwcm9ncmVzc1ZhbHVlcywgcHJvZ3Jlc3NDb250ZXh0cywgcmVzb2x2ZUNvbnRleHRzO1xuXG5cdFx0Ly8gYWRkIGxpc3RlbmVycyB0byBEZWZlcnJlZCBzdWJvcmRpbmF0ZXM7IHRyZWF0IG90aGVycyBhcyByZXNvbHZlZFxuXHRcdGlmICggbGVuZ3RoID4gMSApIHtcblx0XHRcdHByb2dyZXNzVmFsdWVzID0gbmV3IEFycmF5KCBsZW5ndGggKTtcblx0XHRcdHByb2dyZXNzQ29udGV4dHMgPSBuZXcgQXJyYXkoIGxlbmd0aCApO1xuXHRcdFx0cmVzb2x2ZUNvbnRleHRzID0gbmV3IEFycmF5KCBsZW5ndGggKTtcblx0XHRcdGZvciAoIDsgaSA8IGxlbmd0aDsgaSsrICkge1xuXHRcdFx0XHRpZiAoIHJlc29sdmVWYWx1ZXNbIGkgXSAmJiBqUXVlcnkuaXNGdW5jdGlvbiggcmVzb2x2ZVZhbHVlc1sgaSBdLnByb21pc2UgKSApIHtcblx0XHRcdFx0XHRyZXNvbHZlVmFsdWVzWyBpIF0ucHJvbWlzZSgpXG5cdFx0XHRcdFx0XHQuZG9uZSggdXBkYXRlRnVuYyggaSwgcmVzb2x2ZUNvbnRleHRzLCByZXNvbHZlVmFsdWVzICkgKVxuXHRcdFx0XHRcdFx0LmZhaWwoIGRlZmVycmVkLnJlamVjdCApXG5cdFx0XHRcdFx0XHQucHJvZ3Jlc3MoIHVwZGF0ZUZ1bmMoIGksIHByb2dyZXNzQ29udGV4dHMsIHByb2dyZXNzVmFsdWVzICkgKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQtLXJlbWFpbmluZztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIGlmIHdlJ3JlIG5vdCB3YWl0aW5nIG9uIGFueXRoaW5nLCByZXNvbHZlIHRoZSBtYXN0ZXJcblx0XHRpZiAoICFyZW1haW5pbmcgKSB7XG5cdFx0XHRkZWZlcnJlZC5yZXNvbHZlV2l0aCggcmVzb2x2ZUNvbnRleHRzLCByZXNvbHZlVmFsdWVzICk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcblx0fVxufSk7XG4iXX0=
