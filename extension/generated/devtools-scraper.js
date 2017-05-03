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

  var store = new StoreDevtools()
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
var SitemapController = function (options) {
  this.$ = options.$
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
      $sitemapListPanel = ich.SitemapList()
      sitemaps.forEach(function (sitemap) {
        $sitemap = ich.SitemapListItem(sitemap)
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
      $selector = ich.SelectorListItem(selector)
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
  this.$ = options.$
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
    var clonedJSON = JSON.parse(JSON.stringify(this))
    var sitemap = new Sitemap(clonedJSON)
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJleHRlbnNpb24vYXNzZXRzL2Jhc2U2NC5qcyIsImV4dGVuc2lvbi9hc3NldHMvanF1ZXJ5LndoZW5jYWxsc2VxdWVudGlhbGx5LmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvQXBwLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvQmFja2dyb3VuZFNjcmlwdC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL0NvbnRlbnRTY3JpcHQuanMiLCJleHRlbnNpb24vc2NyaXB0cy9Db250ZW50U2VsZWN0b3IuanMiLCJleHRlbnNpb24vc2NyaXB0cy9Db250cm9sbGVyLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvRWxlbWVudFF1ZXJ5LmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckVsZW1lbnQuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckVsZW1lbnRBdHRyaWJ1dGUuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckVsZW1lbnRDbGljay5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9yL1NlbGVjdG9yRWxlbWVudFNjcm9sbC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9yL1NlbGVjdG9yR3JvdXAuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckhUTUwuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckltYWdlLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IvU2VsZWN0b3JMaW5rLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IvU2VsZWN0b3JQb3B1cExpbmsuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvclRhYmxlLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IvU2VsZWN0b3JUZXh0LmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3JMaXN0LmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3JzLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2l0ZW1hcC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1N0b3JlRGV2dG9vbHMuanMiLCJleHRlbnNpb24vc2NyaXB0cy9VbmlxdWVFbGVtZW50TGlzdC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL2dldEJhY2tncm91bmRTY3JpcHQuanMiLCJleHRlbnNpb24vc2NyaXB0cy9nZXRDb250ZW50U2NyaXB0LmpzIiwibm9kZV9tb2R1bGVzL2Nzcy1zZWxlY3Rvci9saWIvQ3NzU2VsZWN0b3IuanMiLCJub2RlX21vZHVsZXMvanF1ZXJ5LWRlZmVycmVkL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2pxdWVyeS1kZWZlcnJlZC9saWIvanF1ZXJ5LWNhbGxiYWNrcy5qcyIsIm5vZGVfbW9kdWxlcy9qcXVlcnktZGVmZXJyZWQvbGliL2pxdWVyeS1jb3JlLmpzIiwibm9kZV9tb2R1bGVzL2pxdWVyeS1kZWZlcnJlZC9saWIvanF1ZXJ5LWRlZmVycmVkLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcFhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuMkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9IQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN2VBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG4vKipcbiAqIEB1cmwgaHR0cDovL2pzcGVyZi5jb20vYmxvYi1iYXNlNjQtY29udmVyc2lvblxuICogQHR5cGUge3tibG9iVG9CYXNlNjQ6IGJsb2JUb0Jhc2U2NCwgYmFzZTY0VG9CbG9iOiBiYXNlNjRUb0Jsb2J9fVxuICovXG52YXIgQmFzZTY0ID0ge1xuXG4gIGJsb2JUb0Jhc2U2NDogZnVuY3Rpb24gKGJsb2IpIHtcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGRhdGFVcmwgPSByZWFkZXIucmVzdWx0XG4gICAgICB2YXIgYmFzZTY0ID0gZGF0YVVybC5zcGxpdCgnLCcpWzFdXG4gICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUoYmFzZTY0KVxuICAgIH1cbiAgICByZWFkZXIucmVhZEFzRGF0YVVSTChibG9iKVxuXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gIH0sXG5cbiAgYmFzZTY0VG9CbG9iOiBmdW5jdGlvbiAoYmFzZTY0LCBtaW1lVHlwZSkge1xuICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgYmluYXJ5ID0gYXRvYihiYXNlNjQpXG4gICAgdmFyIGxlbiA9IGJpbmFyeS5sZW5ndGhcbiAgICB2YXIgYnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKGxlbilcbiAgICB2YXIgdmlldyA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlcilcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB2aWV3W2ldID0gYmluYXJ5LmNoYXJDb2RlQXQoaSlcbiAgICB9XG4gICAgdmFyIGJsb2IgPSBuZXcgQmxvYihbdmlld10sIHt0eXBlOiBtaW1lVHlwZX0pXG4gICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKGJsb2IpXG5cbiAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZS5wcm9taXNlKClcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEJhc2U2NFxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG4vKipcbiAqIEBhdXRob3IgTWFydGlucyBCYWxvZGlzXG4gKlxuICogQW4gYWx0ZXJuYXRpdmUgdmVyc2lvbiBvZiAkLndoZW4gd2hpY2ggY2FuIGJlIHVzZWQgdG8gZXhlY3V0ZSBhc3luY2hyb25vdXNcbiAqIGNhbGxzIHNlcXVlbnRpYWxseSBvbmUgYWZ0ZXIgYW5vdGhlci5cbiAqXG4gKiBAcmV0dXJucyBqcXVlcnlEZWZlcnJlZCgpLnByb21pc2UoKVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHdoZW5DYWxsU2VxdWVudGlhbGx5IChmdW5jdGlvbkNhbGxzKSB7XG4gIHZhciBkZWZlcnJlZFJlc29uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICB2YXIgcmVzdWx0RGF0YSA9IFtdXG5cblx0Ly8gbm90aGluZyB0byBkb1xuICBpZiAoZnVuY3Rpb25DYWxscy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gZGVmZXJyZWRSZXNvbnNlLnJlc29sdmUocmVzdWx0RGF0YSkucHJvbWlzZSgpXG4gIH1cblxuICB2YXIgY3VycmVudERlZmVycmVkID0gZnVuY3Rpb25DYWxscy5zaGlmdCgpKClcblx0Ly8gZXhlY3V0ZSBzeW5jaHJvbm91cyBjYWxscyBzeW5jaHJvbm91c2x5XG4gIHdoaWxlIChjdXJyZW50RGVmZXJyZWQuc3RhdGUoKSA9PT0gJ3Jlc29sdmVkJykge1xuICAgIGN1cnJlbnREZWZlcnJlZC5kb25lKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICByZXN1bHREYXRhLnB1c2goZGF0YSlcbiAgICB9KVxuICAgIGlmIChmdW5jdGlvbkNhbGxzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGRlZmVycmVkUmVzb25zZS5yZXNvbHZlKHJlc3VsdERhdGEpLnByb21pc2UoKVxuICAgIH1cbiAgICBjdXJyZW50RGVmZXJyZWQgPSBmdW5jdGlvbkNhbGxzLnNoaWZ0KCkoKVxuICB9XG5cblx0Ly8gaGFuZGxlIGFzeW5jIGNhbGxzXG4gIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcblx0XHQvLyBoYW5kbGUgbWl4ZWQgc3luYyBjYWxsc1xuICAgIHdoaWxlIChjdXJyZW50RGVmZXJyZWQuc3RhdGUoKSA9PT0gJ3Jlc29sdmVkJykge1xuICAgICAgY3VycmVudERlZmVycmVkLmRvbmUoZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgcmVzdWx0RGF0YS5wdXNoKGRhdGEpXG4gICAgICB9KVxuICAgICAgaWYgKGZ1bmN0aW9uQ2FsbHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpXG4gICAgICAgIGRlZmVycmVkUmVzb25zZS5yZXNvbHZlKHJlc3VsdERhdGEpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjdXJyZW50RGVmZXJyZWQgPSBmdW5jdGlvbkNhbGxzLnNoaWZ0KCkoKVxuICAgIH1cbiAgfSwgMTApXG5cbiAgcmV0dXJuIGRlZmVycmVkUmVzb25zZS5wcm9taXNlKClcbn1cbiIsInZhciBTdG9yZURldnRvb2xzID0gcmVxdWlyZSgnLi9TdG9yZURldnRvb2xzJylcbnZhciBTaXRlbWFwQ29udHJvbGxlciA9IHJlcXVpcmUoJy4vQ29udHJvbGxlcicpXG5cbiQoZnVuY3Rpb24gKCkge1xuXHQvLyBpbml0IGJvb3RzdHJhcCBhbGVydHNcbiAgJCgnLmFsZXJ0JykuYWxlcnQoKVxuXG4gIHZhciBzdG9yZSA9IG5ldyBTdG9yZURldnRvb2xzKClcbiAgbmV3IFNpdGVtYXBDb250cm9sbGVyKHtcbiAgICBzdG9yZTogc3RvcmUsXG4gICAgdGVtcGxhdGVEaXI6ICd2aWV3cy8nXG4gIH0sIHskfSlcbn0pXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbi8qKlxuICogQ29udGVudFNjcmlwdCB0aGF0IGNhbiBiZSBjYWxsZWQgZnJvbSBhbnl3aGVyZSB3aXRoaW4gdGhlIGV4dGVuc2lvblxuICovXG52YXIgQmFja2dyb3VuZFNjcmlwdCA9IHtcblxuICBkdW1teTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBqcXVlcnkuRGVmZXJyZWQoKS5yZXNvbHZlKCdkdW1teScpLnByb21pc2UoKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIHRoZSBpZCBvZiB0aGUgdGFiIHRoYXQgaXMgdmlzaWJsZSB0byB1c2VyXG5cdCAqIEByZXR1cm5zIGpxdWVyeS5EZWZlcnJlZCgpIGludGVnZXJcblx0ICovXG4gIGdldEFjdGl2ZVRhYklkOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgY2hyb21lLnRhYnMucXVlcnkoe1xuICAgICAgYWN0aXZlOiB0cnVlLFxuICAgICAgY3VycmVudFdpbmRvdzogdHJ1ZVxuICAgIH0sIGZ1bmN0aW9uICh0YWJzKSB7XG4gICAgICBpZiAodGFicy5sZW5ndGggPCAxKSB7XG5cdFx0XHRcdC8vIEBUT0RPIG11c3QgYmUgcnVubmluZyB3aXRoaW4gcG9wdXAuIG1heWJlIGZpbmQgYW5vdGhlciBhY3RpdmUgd2luZG93P1xuICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlamVjdChcImNvdWxkbid0IGZpbmQgdGhlIGFjdGl2ZSB0YWJcIilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB0YWJJZCA9IHRhYnNbMF0uaWRcbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKHRhYklkKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gIH0sXG5cblx0LyoqXG5cdCAqIEV4ZWN1dGUgYSBmdW5jdGlvbiB3aXRoaW4gdGhlIGFjdGl2ZSB0YWIgd2l0aGluIGNvbnRlbnQgc2NyaXB0XG5cdCAqIEBwYXJhbSByZXF1ZXN0LmZuXHRmdW5jdGlvbiB0byBjYWxsXG5cdCAqIEBwYXJhbSByZXF1ZXN0LnJlcXVlc3RcdHJlcXVlc3QgdGhhdCB3aWxsIGJlIHBhc3NlZCB0byB0aGUgZnVuY3Rpb25cblx0ICovXG4gIGV4ZWN1dGVDb250ZW50U2NyaXB0OiBmdW5jdGlvbiAocmVxdWVzdCkge1xuICAgIHZhciByZXFUb0NvbnRlbnRTY3JpcHQgPSB7XG4gICAgICBjb250ZW50U2NyaXB0Q2FsbDogdHJ1ZSxcbiAgICAgIGZuOiByZXF1ZXN0LmZuLFxuICAgICAgcmVxdWVzdDogcmVxdWVzdC5yZXF1ZXN0XG4gICAgfVxuICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgZGVmZXJyZWRBY3RpdmVUYWJJZCA9IHRoaXMuZ2V0QWN0aXZlVGFiSWQoKVxuICAgIGRlZmVycmVkQWN0aXZlVGFiSWQuZG9uZShmdW5jdGlvbiAodGFiSWQpIHtcbiAgICAgIGNocm9tZS50YWJzLnNlbmRNZXNzYWdlKHRhYklkLCByZXFUb0NvbnRlbnRTY3JpcHQsIGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUocmVzcG9uc2UpXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQmFja2dyb3VuZFNjcmlwdFxuIiwidmFyIENvbnRlbnRTZWxlY3RvciA9IHJlcXVpcmUoJy4vQ29udGVudFNlbGVjdG9yJylcbnZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxuLyoqXG4gKiBDb250ZW50U2NyaXB0IHRoYXQgY2FuIGJlIGNhbGxlZCBmcm9tIGFueXdoZXJlIHdpdGhpbiB0aGUgZXh0ZW5zaW9uXG4gKi9cbnZhciBDb250ZW50U2NyaXB0ID0ge1xuXG5cdC8qKlxuXHQgKiBGZXRjaFxuXHQgKiBAcGFyYW0gcmVxdWVzdC5DU1NTZWxlY3Rvclx0Y3NzIHNlbGVjdG9yIGFzIHN0cmluZ1xuXHQgKiBAcmV0dXJucyBqcXVlcnkuRGVmZXJyZWQoKVxuXHQgKi9cbiAgZ2V0SFRNTDogZnVuY3Rpb24gKHJlcXVlc3QsIG9wdGlvbnMpIHtcbiAgICB2YXIgJCA9IG9wdGlvbnMuJFxuICAgIHZhciBkZWZlcnJlZEhUTUwgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciBodG1sID0gJChyZXF1ZXN0LkNTU1NlbGVjdG9yKS5jbG9uZSgpLndyYXAoJzxwPicpLnBhcmVudCgpLmh0bWwoKVxuICAgIGRlZmVycmVkSFRNTC5yZXNvbHZlKGh0bWwpXG4gICAgcmV0dXJuIGRlZmVycmVkSFRNTC5wcm9taXNlKClcbiAgfSxcblxuXHQvKipcblx0ICogUmVtb3ZlcyBjdXJyZW50IGNvbnRlbnQgc2VsZWN0b3IgaWYgaXMgaW4gdXNlIHdpdGhpbiB0aGUgcGFnZVxuXHQgKiBAcmV0dXJucyBqcXVlcnkuRGVmZXJyZWQoKVxuXHQgKi9cbiAgcmVtb3ZlQ3VycmVudENvbnRlbnRTZWxlY3RvcjogZnVuY3Rpb24gKCkge1xuICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgY29udGVudFNlbGVjdG9yID0gd2luZG93LmNzXG4gICAgaWYgKGNvbnRlbnRTZWxlY3RvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUoKVxuICAgIH0gZWxzZSB7XG4gICAgICBjb250ZW50U2VsZWN0b3IucmVtb3ZlR1VJKClcbiAgICAgIHdpbmRvdy5jcyA9IHVuZGVmaW5lZFxuICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKClcbiAgICB9XG5cbiAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZS5wcm9taXNlKClcbiAgfSxcblxuXHQvKipcblx0ICogU2VsZWN0IGVsZW1lbnRzIHdpdGhpbiB0aGUgcGFnZVxuXHQgKiBAcGFyYW0gcmVxdWVzdC5wYXJlbnRDU1NTZWxlY3RvclxuXHQgKiBAcGFyYW0gcmVxdWVzdC5hbGxvd2VkRWxlbWVudHNcblx0ICovXG4gIHNlbGVjdFNlbGVjdG9yOiBmdW5jdGlvbiAocmVxdWVzdCwgb3B0aW9ucykge1xuICAgIHZhciAkID0gb3B0aW9ucy4kXG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgdGhpcy5yZW1vdmVDdXJyZW50Q29udGVudFNlbGVjdG9yKCkuZG9uZShmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgY29udGVudFNlbGVjdG9yID0gbmV3IENvbnRlbnRTZWxlY3Rvcih7XG4gICAgICAgIHBhcmVudENTU1NlbGVjdG9yOiByZXF1ZXN0LnBhcmVudENTU1NlbGVjdG9yLFxuICAgICAgICBhbGxvd2VkRWxlbWVudHM6IHJlcXVlc3QuYWxsb3dlZEVsZW1lbnRzXG4gICAgICB9LCB7JH0pXG4gICAgICB3aW5kb3cuY3MgPSBjb250ZW50U2VsZWN0b3JcblxuICAgICAgdmFyIGRlZmVycmVkQ1NTU2VsZWN0b3IgPSBjb250ZW50U2VsZWN0b3IuZ2V0Q1NTU2VsZWN0b3IoKVxuICAgICAgZGVmZXJyZWRDU1NTZWxlY3Rvci5kb25lKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICB0aGlzLnJlbW92ZUN1cnJlbnRDb250ZW50U2VsZWN0b3IoKS5kb25lKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUocmVzcG9uc2UpXG4gICAgICAgICAgd2luZG93LmNzID0gdW5kZWZpbmVkXG4gICAgICAgIH0pXG4gICAgICB9LmJpbmQodGhpcykpLmZhaWwoZnVuY3Rpb24gKG1lc3NhZ2UpIHtcbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZWplY3QobWVzc2FnZSlcbiAgICAgICAgd2luZG93LmNzID0gdW5kZWZpbmVkXG4gICAgICB9KVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBQcmV2aWV3IGVsZW1lbnRzXG5cdCAqIEBwYXJhbSByZXF1ZXN0LnBhcmVudENTU1NlbGVjdG9yXG5cdCAqIEBwYXJhbSByZXF1ZXN0LmVsZW1lbnRDU1NTZWxlY3RvclxuXHQgKi9cbiAgcHJldmlld1NlbGVjdG9yOiBmdW5jdGlvbiAocmVxdWVzdCwgb3B0aW9ucykge1xuICAgIHZhciAkID0gb3B0aW9ucy4kXG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHRoaXMucmVtb3ZlQ3VycmVudENvbnRlbnRTZWxlY3RvcigpLmRvbmUoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGNvbnRlbnRTZWxlY3RvciA9IG5ldyBDb250ZW50U2VsZWN0b3Ioe1xuICAgICAgICBwYXJlbnRDU1NTZWxlY3RvcjogcmVxdWVzdC5wYXJlbnRDU1NTZWxlY3RvclxuICAgICAgfSwgeyR9KVxuICAgICAgd2luZG93LmNzID0gY29udGVudFNlbGVjdG9yXG5cbiAgICAgIHZhciBkZWZlcnJlZFNlbGVjdG9yUHJldmlldyA9IGNvbnRlbnRTZWxlY3Rvci5wcmV2aWV3U2VsZWN0b3IocmVxdWVzdC5lbGVtZW50Q1NTU2VsZWN0b3IpXG4gICAgICBkZWZlcnJlZFNlbGVjdG9yUHJldmlldy5kb25lKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKClcbiAgICAgIH0pLmZhaWwoZnVuY3Rpb24gKG1lc3NhZ2UpIHtcbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZWplY3QobWVzc2FnZSlcbiAgICAgICAgd2luZG93LmNzID0gdW5kZWZpbmVkXG4gICAgICB9KVxuICAgIH0pXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2VcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnRTY3JpcHRcbiIsInZhciBFbGVtZW50UXVlcnkgPSByZXF1aXJlKCcuL0VsZW1lbnRRdWVyeScpXG52YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciBDc3NTZWxlY3RvciA9IHJlcXVpcmUoJ2Nzcy1zZWxlY3RvcicpLkNzc1NlbGVjdG9yXG4vKipcbiAqIEBwYXJhbSBvcHRpb25zLnBhcmVudENTU1NlbGVjdG9yXHRFbGVtZW50cyBjYW4gYmUgb25seSBzZWxlY3RlZCB3aXRoaW4gdGhpcyBlbGVtZW50XG4gKiBAcGFyYW0gb3B0aW9ucy5hbGxvd2VkRWxlbWVudHNcdEVsZW1lbnRzIHRoYXQgY2FuIG9ubHkgYmUgc2VsZWN0ZWRcbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgQ29udGVudFNlbGVjdG9yID0gZnVuY3Rpb24gKG9wdGlvbnMsIG1vcmVPcHRpb25zKSB7XG5cdC8vIGRlZmVycmVkIHJlc3BvbnNlXG4gIHRoaXMuZGVmZXJyZWRDU1NTZWxlY3RvclJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICB0aGlzLmFsbG93ZWRFbGVtZW50cyA9IG9wdGlvbnMuYWxsb3dlZEVsZW1lbnRzXG4gIHRoaXMucGFyZW50Q1NTU2VsZWN0b3IgPSBvcHRpb25zLnBhcmVudENTU1NlbGVjdG9yLnRyaW0oKVxuICB0aGlzLmFsZXJ0ID0gb3B0aW9ucy5hbGVydCB8fCBmdW5jdGlvbiAodHh0KSB7IGFsZXJ0KHR4dCkgfVxuXG4gIHRoaXMuJCA9IG1vcmVPcHRpb25zLiRcbiAgaWYgKCF0aGlzLiQpIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBqcXVlcnkgaW4gY29udGVudCBzZWxlY3RvcicpXG4gIGlmICh0aGlzLnBhcmVudENTU1NlbGVjdG9yKSB7XG4gICAgdGhpcy5wYXJlbnQgPSB0aGlzLiQodGhpcy5wYXJlbnRDU1NTZWxlY3RvcilbMF1cblxuXHRcdC8vICBoYW5kbGUgc2l0dWF0aW9uIHdoZW4gcGFyZW50IHNlbGVjdG9yIG5vdCBmb3VuZFxuICAgIGlmICh0aGlzLnBhcmVudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLmRlZmVycmVkQ1NTU2VsZWN0b3JSZXNwb25zZS5yZWplY3QoJ3BhcmVudCBzZWxlY3RvciBub3QgZm91bmQnKVxuICAgICAgdGhpcy5hbGVydCgnUGFyZW50IGVsZW1lbnQgbm90IGZvdW5kIScpXG4gICAgfVxuICB9XHRlbHNlIHtcbiAgICB0aGlzLnBhcmVudCA9IHRoaXMuJCgnYm9keScpWzBdXG4gIH1cbn1cblxuQ29udGVudFNlbGVjdG9yLnByb3RvdHlwZSA9IHtcblxuXHQvKipcblx0ICogZ2V0IGNzcyBzZWxlY3RvciBzZWxlY3RlZCBieSB0aGUgdXNlclxuXHQgKi9cbiAgZ2V0Q1NTU2VsZWN0b3I6IGZ1bmN0aW9uIChyZXF1ZXN0KSB7XG4gICAgaWYgKHRoaXMuZGVmZXJyZWRDU1NTZWxlY3RvclJlc3BvbnNlLnN0YXRlKCkgIT09ICdyZWplY3RlZCcpIHtcblx0XHRcdC8vIGVsZW1lbnRzIHRoYXQgYXJlIHNlbGVjdGVkIGJ5IHRoZSB1c2VyXG4gICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudHMgPSBbXVxuXHRcdFx0Ly8gZWxlbWVudCBzZWxlY3RlZCBmcm9tIHRvcFxuICAgICAgdGhpcy50b3AgPSAwXG5cblx0XHRcdC8vIGluaXRpYWxpemUgY3NzIHNlbGVjdG9yXG4gICAgICB0aGlzLmluaXRDc3NTZWxlY3RvcihmYWxzZSlcblxuICAgICAgdGhpcy5pbml0R1VJKClcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5kZWZlcnJlZENTU1NlbGVjdG9yUmVzcG9uc2UucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0Q3VycmVudENTU1NlbGVjdG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuc2VsZWN0ZWRFbGVtZW50cyAmJiB0aGlzLnNlbGVjdGVkRWxlbWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgdmFyIGNzc1NlbGVjdG9yXG5cblx0XHRcdC8vIGhhbmRsZSBzcGVjaWFsIGNhc2Ugd2hlbiBwYXJlbnQgaXMgc2VsZWN0ZWRcbiAgICAgIGlmICh0aGlzLmlzUGFyZW50U2VsZWN0ZWQoKSkge1xuICAgICAgICBpZiAodGhpcy5zZWxlY3RlZEVsZW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgIGNzc1NlbGVjdG9yID0gJ19wYXJlbnRfJ1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuJCgnIy1zZWxlY3Rvci10b29sYmFyIFtuYW1lPWRpZmVyZW50RWxlbWVudFNlbGVjdGlvbl0nKS5wcm9wKCdjaGVja2VkJykpIHtcbiAgICAgICAgICB2YXIgc2VsZWN0ZWRFbGVtZW50cyA9IHRoaXMuc2VsZWN0ZWRFbGVtZW50cy5jbG9uZSgpXG4gICAgICAgICAgc2VsZWN0ZWRFbGVtZW50cy5zcGxpY2Uoc2VsZWN0ZWRFbGVtZW50cy5pbmRleE9mKHRoaXMucGFyZW50KSwgMSlcbiAgICAgICAgICBjc3NTZWxlY3RvciA9ICdfcGFyZW50XywgJyArIHRoaXMuY3NzU2VsZWN0b3IuZ2V0Q3NzU2VsZWN0b3Ioc2VsZWN0ZWRFbGVtZW50cywgdGhpcy50b3ApXG4gICAgICAgIH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gd2lsbCB0cmlnZ2VyIGVycm9yIHdoZXJlIG11bHRpcGxlIHNlbGVjdGlvbnMgYXJlIG5vdCBhbGxvd2VkXG4gICAgICAgICAgY3NzU2VsZWN0b3IgPSB0aGlzLmNzc1NlbGVjdG9yLmdldENzc1NlbGVjdG9yKHRoaXMuc2VsZWN0ZWRFbGVtZW50cywgdGhpcy50b3ApXG4gICAgICAgIH1cbiAgICAgIH1cdFx0XHRlbHNlIHtcbiAgICAgICAgY3NzU2VsZWN0b3IgPSB0aGlzLmNzc1NlbGVjdG9yLmdldENzc1NlbGVjdG9yKHRoaXMuc2VsZWN0ZWRFbGVtZW50cywgdGhpcy50b3ApXG4gICAgICB9XG5cbiAgICAgIHJldHVybiBjc3NTZWxlY3RvclxuICAgIH1cbiAgICByZXR1cm4gJydcbiAgfSxcblxuICBpc1BhcmVudFNlbGVjdGVkOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuc2VsZWN0ZWRFbGVtZW50cy5pbmRleE9mKHRoaXMucGFyZW50KSAhPT0gLTFcbiAgfSxcblxuXHQvKipcblx0ICogaW5pdGlhbGl6ZSBvciByZWNvbmZpZ3VyZSBjc3Mgc2VsZWN0b3IgY2xhc3Ncblx0ICogQHBhcmFtIGFsbG93TXVsdGlwbGVTZWxlY3RvcnNcblx0ICovXG4gIGluaXRDc3NTZWxlY3RvcjogZnVuY3Rpb24gKGFsbG93TXVsdGlwbGVTZWxlY3RvcnMpIHtcbiAgICB0aGlzLmNzc1NlbGVjdG9yID0gbmV3IENzc1NlbGVjdG9yKHtcbiAgICAgIGVuYWJsZVNtYXJ0VGFibGVTZWxlY3RvcjogdHJ1ZSxcbiAgICAgIHBhcmVudDogdGhpcy5wYXJlbnQsXG4gICAgICBhbGxvd011bHRpcGxlU2VsZWN0b3JzOiBhbGxvd011bHRpcGxlU2VsZWN0b3JzLFxuICAgICAgaWdub3JlZENsYXNzZXM6IFtcbiAgICAgICAgJy1zaXRlbWFwLXNlbGVjdC1pdGVtLXNlbGVjdGVkJyxcbiAgICAgICAgJy1zaXRlbWFwLXNlbGVjdC1pdGVtLWhvdmVyJyxcbiAgICAgICAgJy1zaXRlbWFwLXBhcmVudCcsXG4gICAgICAgICctd2ViLXNjcmFwZXItaW1nLW9uLXRvcCcsXG4gICAgICAgICctd2ViLXNjcmFwZXItc2VsZWN0aW9uLWFjdGl2ZSdcbiAgICAgIF0sXG4gICAgICBxdWVyeTogdGhpcy4kXG4gICAgfSlcbiAgfSxcblxuICBwcmV2aWV3U2VsZWN0b3I6IGZ1bmN0aW9uIChlbGVtZW50Q1NTU2VsZWN0b3IpIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIGlmICh0aGlzLmRlZmVycmVkQ1NTU2VsZWN0b3JSZXNwb25zZS5zdGF0ZSgpICE9PSAncmVqZWN0ZWQnKSB7XG4gICAgICB0aGlzLmhpZ2hsaWdodFBhcmVudCgpXG4gICAgICAkKEVsZW1lbnRRdWVyeShlbGVtZW50Q1NTU2VsZWN0b3IsIHRoaXMucGFyZW50LCB7JH0pKS5hZGRDbGFzcygnLXNpdGVtYXAtc2VsZWN0LWl0ZW0tc2VsZWN0ZWQnKVxuICAgICAgdGhpcy5kZWZlcnJlZENTU1NlbGVjdG9yUmVzcG9uc2UucmVzb2x2ZSgpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZGVmZXJyZWRDU1NTZWxlY3RvclJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG4gIGluaXRHVUk6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmhpZ2hsaWdodFBhcmVudCgpXG5cblx0XHQvLyBhbGwgZWxlbWVudHMgZXhjZXB0IHRvb2xiYXJcbiAgICB0aGlzLiRhbGxFbGVtZW50cyA9IHRoaXMuJCh0aGlzLmFsbG93ZWRFbGVtZW50cyArICc6bm90KCMtc2VsZWN0b3ItdG9vbGJhcik6bm90KCMtc2VsZWN0b3ItdG9vbGJhciAqKScsIHRoaXMucGFyZW50KVxuXHRcdC8vIGFsbG93IHNlbGVjdGluZyBwYXJlbnQgYWxzb1xuICAgIGlmICh0aGlzLnBhcmVudCAhPT0gZG9jdW1lbnQuYm9keSkge1xuICAgICAgdGhpcy4kYWxsRWxlbWVudHMucHVzaCh0aGlzLnBhcmVudClcbiAgICB9XG5cbiAgICB0aGlzLmJpbmRFbGVtZW50SGlnaGxpZ2h0KClcbiAgICB0aGlzLmJpbmRFbGVtZW50U2VsZWN0aW9uKClcbiAgICB0aGlzLmJpbmRLZXlib2FyZFNlbGVjdGlvbk1hbmlwdWxhdGlvbnMoKVxuICAgIHRoaXMuYXR0YWNoVG9vbGJhcigpXG4gICAgdGhpcy5iaW5kTXVsdGlwbGVHcm91cENoZWNrYm94KClcbiAgICB0aGlzLmJpbmRNdWx0aXBsZUdyb3VwUG9wdXBIaWRlKClcbiAgICB0aGlzLmJpbmRNb3ZlSW1hZ2VzVG9Ub3AoKVxuICB9LFxuXG4gIGJpbmRFbGVtZW50U2VsZWN0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kYWxsRWxlbWVudHMuYmluZCgnY2xpY2suZWxlbWVudFNlbGVjdG9yJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgIHZhciBlbGVtZW50ID0gZS5jdXJyZW50VGFyZ2V0XG4gICAgICBpZiAodGhpcy5zZWxlY3RlZEVsZW1lbnRzLmluZGV4T2YoZWxlbWVudCkgPT09IC0xKSB7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50cy5wdXNoKGVsZW1lbnQpXG4gICAgICB9XG4gICAgICB0aGlzLmhpZ2hsaWdodFNlbGVjdGVkRWxlbWVudHMoKVxuXG5cdFx0XHQvLyBDYW5jZWwgYWxsIG90aGVyIGV2ZW50c1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBBZGQgdG8gc2VsZWN0IGVsZW1lbnRzIHRoZSBlbGVtZW50IHRoYXQgaXMgdW5kZXIgdGhlIG1vdXNlXG5cdCAqL1xuICBzZWxlY3RNb3VzZU92ZXJFbGVtZW50OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGVsZW1lbnQgPSB0aGlzLm1vdXNlT3ZlckVsZW1lbnRcbiAgICBpZiAoZWxlbWVudCkge1xuICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnRzLnB1c2goZWxlbWVudClcbiAgICAgIHRoaXMuaGlnaGxpZ2h0U2VsZWN0ZWRFbGVtZW50cygpXG4gICAgfVxuICB9LFxuXG4gIGJpbmRFbGVtZW50SGlnaGxpZ2h0OiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKHRoaXMuJGFsbEVsZW1lbnRzKS5iaW5kKCdtb3VzZW92ZXIuZWxlbWVudFNlbGVjdG9yJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgIHZhciBlbGVtZW50ID0gZS5jdXJyZW50VGFyZ2V0XG4gICAgICB0aGlzLm1vdXNlT3ZlckVsZW1lbnQgPSBlbGVtZW50XG4gICAgICB0aGlzLiQoZWxlbWVudCkuYWRkQ2xhc3MoJy1zaXRlbWFwLXNlbGVjdC1pdGVtLWhvdmVyJylcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH0uYmluZCh0aGlzKSkuYmluZCgnbW91c2VvdXQuZWxlbWVudFNlbGVjdG9yJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgIHZhciBlbGVtZW50ID0gZS5jdXJyZW50VGFyZ2V0XG4gICAgICB0aGlzLm1vdXNlT3ZlckVsZW1lbnQgPSBudWxsXG4gICAgICB0aGlzLiQoZWxlbWVudCkucmVtb3ZlQ2xhc3MoJy1zaXRlbWFwLXNlbGVjdC1pdGVtLWhvdmVyJylcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcblxuICBiaW5kTW92ZUltYWdlc1RvVG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKCdib2R5JykuYWRkQ2xhc3MoJy13ZWItc2NyYXBlci1zZWxlY3Rpb24tYWN0aXZlJylcblxuXHRcdC8vIGRvIHRoaXMgb25seSB3aGVuIHNlbGVjdGluZyBpbWFnZXNcbiAgICBpZiAodGhpcy5hbGxvd2VkRWxlbWVudHMgPT09ICdpbWcnKSB7XG4gICAgICB0aGlzLiQoJ2ltZycpLmZpbHRlcihmdW5jdGlvbiAoaSwgZWxlbWVudCkge1xuICAgICAgICByZXR1cm4gdGhpcy4kKGVsZW1lbnQpLmNzcygncG9zaXRpb24nKSA9PT0gJ3N0YXRpYydcbiAgICAgIH0pLmFkZENsYXNzKCctd2ViLXNjcmFwZXItaW1nLW9uLXRvcCcpXG4gICAgfVxuICB9LFxuXG4gIHVuYmluZE1vdmVJbWFnZXNUb1RvcDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJCgnYm9keS4td2ViLXNjcmFwZXItc2VsZWN0aW9uLWFjdGl2ZScpLnJlbW92ZUNsYXNzKCctd2ViLXNjcmFwZXItc2VsZWN0aW9uLWFjdGl2ZScpXG4gICAgdGhpcy4kKCdpbWcuLXdlYi1zY3JhcGVyLWltZy1vbi10b3AnKS5yZW1vdmVDbGFzcygnLXdlYi1zY3JhcGVyLWltZy1vbi10b3AnKVxuICB9LFxuXG4gIHNlbGVjdENoaWxkOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy50b3AtLVxuICAgIGlmICh0aGlzLnRvcCA8IDApIHtcbiAgICAgIHRoaXMudG9wID0gMFxuICAgIH1cbiAgfSxcbiAgc2VsZWN0UGFyZW50OiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy50b3ArK1xuICB9LFxuXG5cdC8vIFVzZXIgd2l0aCBrZXlib2FyZCBhcnJvd3MgY2FuIHNlbGVjdCBjaGlsZCBvciBwYXJldCBlbGVtZW50cyBvZiBzZWxlY3RlZCBlbGVtZW50cy5cbiAgYmluZEtleWJvYXJkU2VsZWN0aW9uTWFuaXB1bGF0aW9uczogZnVuY3Rpb24gKCkge1xuXHRcdC8vIGNoZWNrIGZvciBmb2N1c1xuICAgIHZhciBsYXN0Rm9jdXNTdGF0dXNcbiAgICB0aGlzLmtleVByZXNzRm9jdXNJbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBmb2N1cyA9IGRvY3VtZW50Lmhhc0ZvY3VzKClcbiAgICAgIGlmIChmb2N1cyA9PT0gbGFzdEZvY3VzU3RhdHVzKSByZXR1cm5cbiAgICAgIGxhc3RGb2N1c1N0YXR1cyA9IGZvY3VzXG5cbiAgICAgIHRoaXMuJCgnIy1zZWxlY3Rvci10b29sYmFyIC5rZXktYnV0dG9uJykudG9nZ2xlQ2xhc3MoJ2hpZGUnLCAhZm9jdXMpXG4gICAgICB0aGlzLiQoJyMtc2VsZWN0b3ItdG9vbGJhciAua2V5LWV2ZW50cycpLnRvZ2dsZUNsYXNzKCdoaWRlJywgZm9jdXMpXG4gICAgfSwgMjAwKVxuXG5cdFx0Ly8gVXNpbmcgdXAvZG93biBhcnJvd3MgdXNlciBjYW4gc2VsZWN0IGVsZW1lbnRzIGZyb20gdG9wIG9mIHRoZVxuXHRcdC8vIHNlbGVjdGVkIGVsZW1lbnRcbiAgICB0aGlzLiQoZG9jdW1lbnQpLmJpbmQoJ2tleWRvd24uc2VsZWN0aW9uTWFuaXB1bGF0aW9uJywgZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHQvLyBzZWxlY3QgY2hpbGQgQ1xuICAgICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDY3KSB7XG4gICAgICAgIHRoaXMuYW5pbWF0ZUNsaWNrZWRLZXkodGhpcy4kKCcjLXNlbGVjdG9yLXRvb2xiYXIgLmtleS1idXR0b24tY2hpbGQnKSlcbiAgICAgICAgdGhpcy5zZWxlY3RDaGlsZCgpXG4gICAgICB9XG5cdFx0XHQvLyBzZWxlY3QgcGFyZW50IFBcbiAgICAgIGVsc2UgaWYgKGV2ZW50LmtleUNvZGUgPT09IDgwKSB7XG4gICAgICAgIHRoaXMuYW5pbWF0ZUNsaWNrZWRLZXkodGhpcy4kKCcjLXNlbGVjdG9yLXRvb2xiYXIgLmtleS1idXR0b24tcGFyZW50JykpXG4gICAgICAgIHRoaXMuc2VsZWN0UGFyZW50KClcbiAgICAgIH1cblx0XHRcdC8vIHNlbGVjdCBlbGVtZW50XG4gICAgICBlbHNlIGlmIChldmVudC5rZXlDb2RlID09PSA4Mykge1xuICAgICAgICB0aGlzLmFuaW1hdGVDbGlja2VkS2V5KHRoaXMuJCgnIy1zZWxlY3Rvci10b29sYmFyIC5rZXktYnV0dG9uLXNlbGVjdCcpKVxuICAgICAgICB0aGlzLnNlbGVjdE1vdXNlT3ZlckVsZW1lbnQoKVxuICAgICAgfVxuXG4gICAgICB0aGlzLmhpZ2hsaWdodFNlbGVjdGVkRWxlbWVudHMoKVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcblxuICBhbmltYXRlQ2xpY2tlZEtleTogZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICB0aGlzLiQoZWxlbWVudCkucmVtb3ZlQ2xhc3MoJ2NsaWNrZWQnKS5yZW1vdmVDbGFzcygnY2xpY2tlZC1hbmltYXRpb24nKVxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy4kKGVsZW1lbnQpLmFkZENsYXNzKCdjbGlja2VkJylcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLiQoZWxlbWVudCkuYWRkQ2xhc3MoJ2NsaWNrZWQtYW5pbWF0aW9uJylcbiAgICAgIH0sIDEwMClcbiAgICB9LCAxKVxuICB9LFxuXG4gIGhpZ2hsaWdodFNlbGVjdGVkRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIHRyeSB7XG4gICAgICB2YXIgcmVzdWx0Q3NzU2VsZWN0b3IgPSB0aGlzLmdldEN1cnJlbnRDU1NTZWxlY3RvcigpXG5cbiAgICAgICQoJ2JvZHkgIy1zZWxlY3Rvci10b29sYmFyIC5zZWxlY3RvcicpLnRleHQocmVzdWx0Q3NzU2VsZWN0b3IpXG5cdFx0XHQvLyBoaWdobGlnaHQgc2VsZWN0ZWQgZWxlbWVudHNcbiAgICAgICQoJy4tc2l0ZW1hcC1zZWxlY3QtaXRlbS1zZWxlY3RlZCcpLnJlbW92ZUNsYXNzKCctc2l0ZW1hcC1zZWxlY3QtaXRlbS1zZWxlY3RlZCcpXG4gICAgICAkKEVsZW1lbnRRdWVyeShyZXN1bHRDc3NTZWxlY3RvciwgdGhpcy5wYXJlbnQsIHskfSkpLmFkZENsYXNzKCctc2l0ZW1hcC1zZWxlY3QtaXRlbS1zZWxlY3RlZCcpXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAoZXJyID09PSAnZm91bmQgbXVsdGlwbGUgZWxlbWVudCBncm91cHMsIGJ1dCBhbGxvd011bHRpcGxlU2VsZWN0b3JzIGRpc2FibGVkJykge1xuICAgICAgICBjb25zb2xlLmxvZygnbXVsdGlwbGUgZGlmZmVyZW50IGVsZW1lbnQgc2VsZWN0aW9uIGRpc2FibGVkJylcblxuICAgICAgICB0aGlzLnNob3dNdWx0aXBsZUdyb3VwUG9wdXAoKVxuXHRcdFx0XHQvLyByZW1vdmUgbGFzdCBhZGRlZCBlbGVtZW50XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50cy5wb3AoKVxuICAgICAgICB0aGlzLmhpZ2hsaWdodFNlbGVjdGVkRWxlbWVudHMoKVxuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBzaG93TXVsdGlwbGVHcm91cFBvcHVwOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKCcjLXNlbGVjdG9yLXRvb2xiYXIgLnBvcG92ZXInKS5hdHRyKCdzdHlsZScsICdkaXNwbGF5OmJsb2NrICFpbXBvcnRhbnQ7JylcbiAgfSxcblxuICBoaWRlTXVsdGlwbGVHcm91cFBvcHVwOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKCcjLXNlbGVjdG9yLXRvb2xiYXIgLnBvcG92ZXInKS5hdHRyKCdzdHlsZScsICcnKVxuICB9LFxuXG4gIGJpbmRNdWx0aXBsZUdyb3VwUG9wdXBIaWRlOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKCcjLXNlbGVjdG9yLXRvb2xiYXIgLnBvcG92ZXIgLmNsb3NlJykuY2xpY2sodGhpcy5oaWRlTXVsdGlwbGVHcm91cFBvcHVwLmJpbmQodGhpcykpXG4gIH0sXG5cbiAgdW5iaW5kTXVsdGlwbGVHcm91cFBvcHVwSGlkZTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJCgnIy1zZWxlY3Rvci10b29sYmFyIC5wb3BvdmVyIC5jbG9zZScpLnVuYmluZCgnY2xpY2snKVxuICB9LFxuXG4gIGJpbmRNdWx0aXBsZUdyb3VwQ2hlY2tib3g6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoJyMtc2VsZWN0b3ItdG9vbGJhciBbbmFtZT1kaWZlcmVudEVsZW1lbnRTZWxlY3Rpb25dJykuY2hhbmdlKGZ1bmN0aW9uIChlKSB7XG4gICAgICBpZiAodGhpcy4kKGUuY3VycmVudFRhcmdldCkuaXMoJzpjaGVja2VkJykpIHtcbiAgICAgICAgdGhpcy5pbml0Q3NzU2VsZWN0b3IodHJ1ZSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuaW5pdENzc1NlbGVjdG9yKGZhbHNlKVxuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcbiAgdW5iaW5kTXVsdGlwbGVHcm91cENoZWNrYm94OiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKCcjLXNlbGVjdG9yLXRvb2xiYXIgLmRpZmVyZW50RWxlbWVudFNlbGVjdGlvbicpLnVuYmluZCgnY2hhbmdlJylcbiAgfSxcblxuICBhdHRhY2hUb29sYmFyOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyICR0b29sYmFyID0gJzxkaXYgaWQ9XCItc2VsZWN0b3ItdG9vbGJhclwiPicgK1xuXHRcdFx0JzxkaXYgY2xhc3M9XCJsaXN0LWl0ZW1cIj48ZGl2IGNsYXNzPVwic2VsZWN0b3ItY29udGFpbmVyXCI+PGRpdiBjbGFzcz1cInNlbGVjdG9yXCI+PC9kaXY+PC9kaXY+PC9kaXY+JyArXG5cdFx0XHQnPGRpdiBjbGFzcz1cImlucHV0LWdyb3VwLWFkZG9uIGxpc3QtaXRlbVwiPicgK1xuXHRcdFx0XHQnPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIHRpdGxlPVwiRW5hYmxlIGRpZmZlcmVudCB0eXBlIGVsZW1lbnQgc2VsZWN0aW9uXCIgbmFtZT1cImRpZmVyZW50RWxlbWVudFNlbGVjdGlvblwiPicgK1xuXHRcdFx0XHQnPGRpdiBjbGFzcz1cInBvcG92ZXIgdG9wXCI+JyArXG5cdFx0XHRcdCc8ZGl2IGNsYXNzPVwiY2xvc2VcIj7DlzwvZGl2PicgK1xuXHRcdFx0XHQnPGRpdiBjbGFzcz1cImFycm93XCI+PC9kaXY+JyArXG5cdFx0XHRcdCc8ZGl2IGNsYXNzPVwicG9wb3Zlci1jb250ZW50XCI+JyArXG5cdFx0XHRcdCc8ZGl2IGNsYXNzPVwidHh0XCI+JyArXG5cdFx0XHRcdCdEaWZmZXJlbnQgdHlwZSBlbGVtZW50IHNlbGVjdGlvbiBpcyBkaXNhYmxlZC4gSWYgdGhlIGVsZW1lbnQgJyArXG5cdFx0XHRcdCd5b3UgY2xpY2tlZCBzaG91bGQgYWxzbyBiZSBpbmNsdWRlZCB0aGVuIGVuYWJsZSB0aGlzIGFuZCAnICtcblx0XHRcdFx0J2NsaWNrIG9uIHRoZSBlbGVtZW50IGFnYWluLiBVc3VhbGx5IHRoaXMgaXMgbm90IG5lZWRlZC4nICtcblx0XHRcdFx0JzwvZGl2PicgK1xuXHRcdFx0XHQnPC9kaXY+JyArXG5cdFx0XHRcdCc8L2Rpdj4nICtcblx0XHRcdCc8L2Rpdj4nICtcblx0XHRcdCc8ZGl2IGNsYXNzPVwibGlzdC1pdGVtIGtleS1ldmVudHNcIj48ZGl2IHRpdGxlPVwiQ2xpY2sgaGVyZSB0byBlbmFibGUga2V5IHByZXNzIGV2ZW50cyBmb3Igc2VsZWN0aW9uXCI+RW5hYmxlIGtleSBldmVudHM8L2Rpdj48L2Rpdj4nICtcblx0XHRcdCc8ZGl2IGNsYXNzPVwibGlzdC1pdGVtIGtleS1idXR0b24ga2V5LWJ1dHRvbi1zZWxlY3QgaGlkZVwiIHRpdGxlPVwiVXNlIFMga2V5IHRvIHNlbGVjdCBlbGVtZW50XCI+UzwvZGl2PicgK1xuXHRcdFx0JzxkaXYgY2xhc3M9XCJsaXN0LWl0ZW0ga2V5LWJ1dHRvbiBrZXktYnV0dG9uLXBhcmVudCBoaWRlXCIgdGl0bGU9XCJVc2UgUCBrZXkgdG8gc2VsZWN0IHBhcmVudFwiPlA8L2Rpdj4nICtcblx0XHRcdCc8ZGl2IGNsYXNzPVwibGlzdC1pdGVtIGtleS1idXR0b24ga2V5LWJ1dHRvbi1jaGlsZCBoaWRlXCIgdGl0bGU9XCJVc2UgQyBrZXkgdG8gc2VsZWN0IGNoaWxkXCI+QzwvZGl2PicgK1xuXHRcdFx0JzxkaXYgY2xhc3M9XCJsaXN0LWl0ZW0gZG9uZS1zZWxlY3RpbmctYnV0dG9uXCI+RG9uZSBzZWxlY3RpbmchPC9kaXY+JyArXG5cdFx0XHQnPC9kaXY+J1xuICAgIHRoaXMuJCgnYm9keScpLmFwcGVuZCgkdG9vbGJhcilcblxuICAgIHRoaXMuJCgnYm9keSAjLXNlbGVjdG9yLXRvb2xiYXIgLmRvbmUtc2VsZWN0aW5nLWJ1dHRvbicpLmNsaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuc2VsZWN0aW9uRmluaXNoZWQoKVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcbiAgaGlnaGxpZ2h0UGFyZW50OiBmdW5jdGlvbiAoKSB7XG5cdFx0Ly8gZG8gbm90IGhpZ2hsaWdodCBwYXJlbnQgaWYgaXRzIHRoZSBib2R5XG4gICAgaWYgKCF0aGlzLiQodGhpcy5wYXJlbnQpLmlzKCdib2R5JykgJiYgIXRoaXMuJCh0aGlzLnBhcmVudCkuaXMoJyN3ZWJwYWdlJykpIHtcbiAgICAgIHRoaXMuJCh0aGlzLnBhcmVudCkuYWRkQ2xhc3MoJy1zaXRlbWFwLXBhcmVudCcpXG4gICAgfVxuICB9LFxuXG4gIHVuYmluZEVsZW1lbnRTZWxlY3Rpb246IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQodGhpcy4kYWxsRWxlbWVudHMpLnVuYmluZCgnY2xpY2suZWxlbWVudFNlbGVjdG9yJylcblx0XHQvLyByZW1vdmUgaGlnaGxpZ2h0ZWQgZWxlbWVudCBjbGFzc2VzXG4gICAgdGhpcy51bmJpbmRFbGVtZW50U2VsZWN0aW9uSGlnaGxpZ2h0KClcbiAgfSxcbiAgdW5iaW5kRWxlbWVudFNlbGVjdGlvbkhpZ2hsaWdodDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJCgnLi1zaXRlbWFwLXNlbGVjdC1pdGVtLXNlbGVjdGVkJykucmVtb3ZlQ2xhc3MoJy1zaXRlbWFwLXNlbGVjdC1pdGVtLXNlbGVjdGVkJylcbiAgICB0aGlzLiQoJy4tc2l0ZW1hcC1wYXJlbnQnKS5yZW1vdmVDbGFzcygnLXNpdGVtYXAtcGFyZW50JylcbiAgfSxcbiAgdW5iaW5kRWxlbWVudEhpZ2hsaWdodDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJCh0aGlzLiRhbGxFbGVtZW50cykudW5iaW5kKCdtb3VzZW92ZXIuZWxlbWVudFNlbGVjdG9yJylcblx0XHRcdC51bmJpbmQoJ21vdXNlb3V0LmVsZW1lbnRTZWxlY3RvcicpXG4gIH0sXG4gIHVuYmluZEtleWJvYXJkU2VsZWN0aW9uTWFpcHVsYXRpb3M6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoZG9jdW1lbnQpLnVuYmluZCgna2V5ZG93bi5zZWxlY3Rpb25NYW5pcHVsYXRpb24nKVxuICAgIGNsZWFySW50ZXJ2YWwodGhpcy5rZXlQcmVzc0ZvY3VzSW50ZXJ2YWwpXG4gIH0sXG4gIHJlbW92ZVRvb2xiYXI6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoJ2JvZHkgIy1zZWxlY3Rvci10b29sYmFyIGEnKS51bmJpbmQoJ2NsaWNrJylcbiAgICB0aGlzLiQoJyMtc2VsZWN0b3ItdG9vbGJhcicpLnJlbW92ZSgpXG4gIH0sXG5cblx0LyoqXG5cdCAqIFJlbW92ZSB0b29sYmFyIGFuZCB1bmJpbmQgZXZlbnRzXG5cdCAqL1xuICByZW1vdmVHVUk6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnVuYmluZEVsZW1lbnRTZWxlY3Rpb24oKVxuICAgIHRoaXMudW5iaW5kRWxlbWVudEhpZ2hsaWdodCgpXG4gICAgdGhpcy51bmJpbmRLZXlib2FyZFNlbGVjdGlvbk1haXB1bGF0aW9zKClcbiAgICB0aGlzLnVuYmluZE11bHRpcGxlR3JvdXBQb3B1cEhpZGUoKVxuICAgIHRoaXMudW5iaW5kTXVsdGlwbGVHcm91cENoZWNrYm94KClcbiAgICB0aGlzLnVuYmluZE1vdmVJbWFnZXNUb1RvcCgpXG4gICAgdGhpcy5yZW1vdmVUb29sYmFyKClcbiAgfSxcblxuICBzZWxlY3Rpb25GaW5pc2hlZDogZnVuY3Rpb24gKCkge1xuICAgIHZhciByZXN1bHRDc3NTZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudENTU1NlbGVjdG9yKClcblxuICAgIHRoaXMuZGVmZXJyZWRDU1NTZWxlY3RvclJlc3BvbnNlLnJlc29sdmUoe1xuICAgICAgQ1NTU2VsZWN0b3I6IHJlc3VsdENzc1NlbGVjdG9yXG4gICAgfSlcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnRTZWxlY3RvclxuIiwidmFyIHNlbGVjdG9ycyA9IHJlcXVpcmUoJy4vU2VsZWN0b3JzJylcbnZhciBTZWxlY3RvciA9IHJlcXVpcmUoJy4vU2VsZWN0b3InKVxudmFyIFNlbGVjdG9yVGFibGUgPSBzZWxlY3RvcnMuU2VsZWN0b3JUYWJsZVxudmFyIFNpdGVtYXAgPSByZXF1aXJlKCcuL1NpdGVtYXAnKVxuLy8gdmFyIFNlbGVjdG9yR3JhcGh2MiA9IHJlcXVpcmUoJy4vU2VsZWN0b3JHcmFwaHYyJylcbnZhciBnZXRCYWNrZ3JvdW5kU2NyaXB0ID0gcmVxdWlyZSgnLi9nZXRCYWNrZ3JvdW5kU2NyaXB0JylcbnZhciBnZXRDb250ZW50U2NyaXB0ID0gcmVxdWlyZSgnLi9nZXRDb250ZW50U2NyaXB0JylcbnZhciBTaXRlbWFwQ29udHJvbGxlciA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIHRoaXMuJCA9IG9wdGlvbnMuJFxuICBpZiAoIXRoaXMuJCkgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIGpxdWVyeSBpbiBDb250cm9sbGVyJylcbiAgZm9yICh2YXIgaSBpbiBvcHRpb25zKSB7XG4gICAgdGhpc1tpXSA9IG9wdGlvbnNbaV1cbiAgfVxuICB0aGlzLmluaXQoKVxufVxuXG5TaXRlbWFwQ29udHJvbGxlci5wcm90b3R5cGUgPSB7XG5cbiAgYmFja2dyb3VuZFNjcmlwdDogZ2V0QmFja2dyb3VuZFNjcmlwdCgnRGV2VG9vbHMnKSxcbiAgY29udGVudFNjcmlwdDogZ2V0Q29udGVudFNjcmlwdCgnRGV2VG9vbHMnKSxcblxuICBjb250cm9sOiBmdW5jdGlvbiAoY29udHJvbHMpIHtcbiAgICB2YXIgY29udHJvbGxlciA9IHRoaXNcblxuICAgIGZvciAodmFyIHNlbGVjdG9yIGluIGNvbnRyb2xzKSB7XG4gICAgICBmb3IgKHZhciBldmVudCBpbiBjb250cm9sc1tzZWxlY3Rvcl0pIHtcbiAgICAgICAgdGhpcy4kKGRvY3VtZW50KS5vbihldmVudCwgc2VsZWN0b3IsIChmdW5jdGlvbiAoc2VsZWN0b3IsIGV2ZW50KSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBjb250aW51ZUJ1YmJsaW5nID0gY29udHJvbHNbc2VsZWN0b3JdW2V2ZW50XS5jYWxsKGNvbnRyb2xsZXIsIHRoaXMpXG4gICAgICAgICAgICBpZiAoY29udGludWVCdWJibGluZyAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pKHNlbGVjdG9yLCBldmVudCkpXG4gICAgICB9XG4gICAgfVxuICB9LFxuXG5cdC8qKlxuXHQgKiBMb2FkcyB0ZW1wbGF0ZXMgZm9yIElDYW5IYXpcblx0ICovXG4gIGxvYWRUZW1wbGF0ZXM6IGZ1bmN0aW9uIChjYkFsbFRlbXBsYXRlc0xvYWRlZCkge1xuICAgIHZhciB0ZW1wbGF0ZUlkcyA9IFtcbiAgICAgICdWaWV3cG9ydCcsXG4gICAgICAnU2l0ZW1hcExpc3QnLFxuICAgICAgJ1NpdGVtYXBMaXN0SXRlbScsXG4gICAgICAnU2l0ZW1hcENyZWF0ZScsXG4gICAgICAnU2l0ZW1hcFN0YXJ0VXJsRmllbGQnLFxuICAgICAgJ1NpdGVtYXBJbXBvcnQnLFxuICAgICAgJ1NpdGVtYXBFeHBvcnQnLFxuICAgICAgJ1NpdGVtYXBCcm93c2VEYXRhJyxcbiAgICAgICdTaXRlbWFwU2NyYXBlQ29uZmlnJyxcbiAgICAgICdTaXRlbWFwRXhwb3J0RGF0YUNTVicsXG4gICAgICAnU2l0ZW1hcEVkaXRNZXRhZGF0YScsXG4gICAgICAnU2VsZWN0b3JMaXN0JyxcbiAgICAgICdTZWxlY3Rvckxpc3RJdGVtJyxcbiAgICAgICdTZWxlY3RvckVkaXQnLFxuICAgICAgJ1NlbGVjdG9yRWRpdFRhYmxlQ29sdW1uJyxcbiAgICAgIC8vICdTaXRlbWFwU2VsZWN0b3JHcmFwaCcsXG4gICAgICAnRGF0YVByZXZpZXcnXG4gICAgXVxuICAgIHZhciB0ZW1wbGF0ZXNMb2FkZWQgPSAwXG4gICAgdmFyIGNiTG9hZGVkID0gZnVuY3Rpb24gKHRlbXBsYXRlSWQsIHRlbXBsYXRlKSB7XG4gICAgICB0ZW1wbGF0ZXNMb2FkZWQrK1xuICAgICAgaWNoLmFkZFRlbXBsYXRlKHRlbXBsYXRlSWQsIHRlbXBsYXRlKVxuICAgICAgaWYgKHRlbXBsYXRlc0xvYWRlZCA9PT0gdGVtcGxhdGVJZHMubGVuZ3RoKSB7XG4gICAgICAgIGNiQWxsVGVtcGxhdGVzTG9hZGVkKClcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0ZW1wbGF0ZUlkcy5mb3JFYWNoKGZ1bmN0aW9uICh0ZW1wbGF0ZUlkKSB7XG4gICAgICB0aGlzLiQuZ2V0KHRoaXMudGVtcGxhdGVEaXIgKyB0ZW1wbGF0ZUlkICsgJy5odG1sJywgY2JMb2FkZWQuYmluZCh0aGlzLCB0ZW1wbGF0ZUlkKSlcbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG5cbiAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMubG9hZFRlbXBsYXRlcyhmdW5jdGlvbiAoKSB7XG5cdFx0XHQvLyBjdXJyZW50bHkgdmlld2VkIG9iamVjdHNcbiAgICAgIHRoaXMuY2xlYXJTdGF0ZSgpXG5cblx0XHRcdC8vIHJlbmRlciBtYWluIHZpZXdwb3J0XG4gICAgICBpY2guVmlld3BvcnQoKS5hcHBlbmRUbygnYm9keScpXG5cblx0XHRcdC8vIGNhbmNlbCBhbGwgZm9ybSBzdWJtaXRzXG4gICAgICB0aGlzLiQoJ2Zvcm0nKS5iaW5kKCdzdWJtaXQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfSlcblxuICAgICAgdGhpcy5jb250cm9sKHtcbiAgICAgICAgJyNzaXRlbWFwcy1uYXYtYnV0dG9uJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNob3dTaXRlbWFwc1xuICAgICAgICB9LFxuICAgICAgICAnI2NyZWF0ZS1zaXRlbWFwLWNyZWF0ZS1uYXYtYnV0dG9uJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNob3dDcmVhdGVTaXRlbWFwXG4gICAgICAgIH0sXG4gICAgICAgICcjY3JlYXRlLXNpdGVtYXAtaW1wb3J0LW5hdi1idXR0b24nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2hvd0ltcG9ydFNpdGVtYXBQYW5lbFxuICAgICAgICB9LFxuICAgICAgICAnI3NpdGVtYXAtZXhwb3J0LW5hdi1idXR0b24nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2hvd1NpdGVtYXBFeHBvcnRQYW5lbFxuICAgICAgICB9LFxuICAgICAgICAnI3NpdGVtYXAtZXhwb3J0LWRhdGEtY3N2LW5hdi1idXR0b24nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2hvd1NpdGVtYXBFeHBvcnREYXRhQ3N2UGFuZWxcbiAgICAgICAgfSxcbiAgICAgICAgJyNzdWJtaXQtY3JlYXRlLXNpdGVtYXAnOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuY3JlYXRlU2l0ZW1hcFxuICAgICAgICB9LFxuICAgICAgICAnI3N1Ym1pdC1pbXBvcnQtc2l0ZW1hcCc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5pbXBvcnRTaXRlbWFwXG4gICAgICAgIH0sXG4gICAgICAgICcjc2l0ZW1hcC1lZGl0LW1ldGFkYXRhLW5hdi1idXR0b24nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuZWRpdFNpdGVtYXBNZXRhZGF0YVxuICAgICAgICB9LFxuICAgICAgICAnI3NpdGVtYXAtc2VsZWN0b3ItbGlzdC1uYXYtYnV0dG9uJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNob3dTaXRlbWFwU2VsZWN0b3JMaXN0XG4gICAgICAgIH0sIC8qLCAgICAgICAgJyNzaXRlbWFwLXNlbGVjdG9yLWdyYXBoLW5hdi1idXR0b24nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2hvd1NpdGVtYXBTZWxlY3RvckdyYXBoXG4gICAgICAgIH0gKi9cbiAgICAgICAgJyNzaXRlbWFwLWJyb3dzZS1uYXYtYnV0dG9uJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLmJyb3dzZVNpdGVtYXBEYXRhXG4gICAgICAgIH0sXG4gICAgICAgICdidXR0b24jc3VibWl0LWVkaXQtc2l0ZW1hcCc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5lZGl0U2l0ZW1hcE1ldGFkYXRhU2F2ZVxuICAgICAgICB9LFxuICAgICAgICAnI2VkaXQtc2l0ZW1hcC1tZXRhZGF0YS1mb3JtJzoge1xuICAgICAgICAgIHN1Ym1pdDogZnVuY3Rpb24gKCkgeyByZXR1cm4gZmFsc2UgfVxuICAgICAgICB9LFxuICAgICAgICAnI3NpdGVtYXBzIHRyJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLmVkaXRTaXRlbWFwXG4gICAgICAgIH0sXG4gICAgICAgICcjc2l0ZW1hcHMgYnV0dG9uW2FjdGlvbj1kZWxldGUtc2l0ZW1hcF0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuZGVsZXRlU2l0ZW1hcFxuICAgICAgICB9LFxuICAgICAgICAnI3NpdGVtYXAtc2NyYXBlLW5hdi1idXR0b24nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2hvd1NjcmFwZVNpdGVtYXBDb25maWdQYW5lbFxuICAgICAgICB9LFxuICAgICAgICAnI3N1Ym1pdC1zY3JhcGUtc2l0ZW1hcC1mb3JtJzoge1xuICAgICAgICAgIHN1Ym1pdDogZnVuY3Rpb24gKCkgeyByZXR1cm4gZmFsc2UgfVxuICAgICAgICB9LFxuICAgICAgICAnI3N1Ym1pdC1zY3JhcGUtc2l0ZW1hcCc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5zY3JhcGVTaXRlbWFwXG4gICAgICAgIH0sXG4gICAgICAgICcjc2l0ZW1hcHMgYnV0dG9uW2FjdGlvbj1icm93c2Utc2l0ZW1hcC1kYXRhXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5zaXRlbWFwTGlzdEJyb3dzZVNpdGVtYXBEYXRhXG4gICAgICAgIH0sXG4gICAgICAgICcjc2l0ZW1hcHMgYnV0dG9uW2FjdGlvbj1jc3YtZG93bmxvYWQtc2l0ZW1hcC1kYXRhXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5kb3dubG9hZFNpdGVtYXBEYXRhXG4gICAgICAgIH0sXG5cdFx0XHRcdC8vIEBUT0RPIG1vdmUgdG8gdHJcbiAgICAgICAgJyNzZWxlY3Rvci10cmVlIHRib2R5IHRyJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNob3dDaGlsZFNlbGVjdG9yc1xuICAgICAgICB9LFxuICAgICAgICAnI3NlbGVjdG9yLXRyZWUgLmJyZWFkY3J1bWIgYSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy50cmVlTmF2aWdhdGlvbnNob3dTaXRlbWFwU2VsZWN0b3JMaXN0XG4gICAgICAgIH0sXG4gICAgICAgICcjc2VsZWN0b3ItdHJlZSB0ciBidXR0b25bYWN0aW9uPWVkaXQtc2VsZWN0b3JdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLmVkaXRTZWxlY3RvclxuICAgICAgICB9LFxuICAgICAgICAnI2VkaXQtc2VsZWN0b3Igc2VsZWN0W25hbWU9dHlwZV0nOiB7XG4gICAgICAgICAgY2hhbmdlOiB0aGlzLnNlbGVjdG9yVHlwZUNoYW5nZWRcbiAgICAgICAgfSxcbiAgICAgICAgJyNlZGl0LXNlbGVjdG9yIGJ1dHRvblthY3Rpb249c2F2ZS1zZWxlY3Rvcl0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2F2ZVNlbGVjdG9yXG4gICAgICAgIH0sXG4gICAgICAgICcjZWRpdC1zZWxlY3RvciBidXR0b25bYWN0aW9uPWNhbmNlbC1zZWxlY3Rvci1lZGl0aW5nXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5jYW5jZWxTZWxlY3RvckVkaXRpbmdcbiAgICAgICAgfSxcbiAgICAgICAgJyNlZGl0LXNlbGVjdG9yICNzZWxlY3RvcklkJzoge1xuICAgICAgICAgIGtleXVwOiB0aGlzLnVwZGF0ZVNlbGVjdG9yUGFyZW50TGlzdE9uSWRDaGFuZ2VcbiAgICAgICAgfSxcbiAgICAgICAgJyNzZWxlY3Rvci10cmVlIGJ1dHRvblthY3Rpb249YWRkLXNlbGVjdG9yXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5hZGRTZWxlY3RvclxuICAgICAgICB9LFxuICAgICAgICAnI3NlbGVjdG9yLXRyZWUgdHIgYnV0dG9uW2FjdGlvbj1kZWxldGUtc2VsZWN0b3JdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLmRlbGV0ZVNlbGVjdG9yXG4gICAgICAgIH0sXG4gICAgICAgICcjc2VsZWN0b3ItdHJlZSB0ciBidXR0b25bYWN0aW9uPXByZXZpZXctc2VsZWN0b3JdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnByZXZpZXdTZWxlY3RvckZyb21TZWxlY3RvclRyZWVcbiAgICAgICAgfSxcbiAgICAgICAgJyNzZWxlY3Rvci10cmVlIHRyIGJ1dHRvblthY3Rpb249ZGF0YS1wcmV2aWV3LXNlbGVjdG9yXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5wcmV2aWV3U2VsZWN0b3JEYXRhRnJvbVNlbGVjdG9yVHJlZVxuICAgICAgICB9LFxuICAgICAgICAnI2VkaXQtc2VsZWN0b3IgYnV0dG9uW2FjdGlvbj1zZWxlY3Qtc2VsZWN0b3JdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNlbGVjdFNlbGVjdG9yXG4gICAgICAgIH0sXG4gICAgICAgICcjZWRpdC1zZWxlY3RvciBidXR0b25bYWN0aW9uPXNlbGVjdC10YWJsZS1oZWFkZXItcm93LXNlbGVjdG9yXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5zZWxlY3RUYWJsZUhlYWRlclJvd1NlbGVjdG9yXG4gICAgICAgIH0sXG4gICAgICAgICcjZWRpdC1zZWxlY3RvciBidXR0b25bYWN0aW9uPXNlbGVjdC10YWJsZS1kYXRhLXJvdy1zZWxlY3Rvcl0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2VsZWN0VGFibGVEYXRhUm93U2VsZWN0b3JcbiAgICAgICAgfSxcbiAgICAgICAgJyNlZGl0LXNlbGVjdG9yIGJ1dHRvblthY3Rpb249cHJldmlldy1zZWxlY3Rvcl0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMucHJldmlld1NlbGVjdG9yXG4gICAgICAgIH0sXG4gICAgICAgICcjZWRpdC1zZWxlY3RvciBidXR0b25bYWN0aW9uPXByZXZpZXctY2xpY2stZWxlbWVudC1zZWxlY3Rvcl0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMucHJldmlld0NsaWNrRWxlbWVudFNlbGVjdG9yXG4gICAgICAgIH0sXG4gICAgICAgICcjZWRpdC1zZWxlY3RvciBidXR0b25bYWN0aW9uPXByZXZpZXctdGFibGUtcm93LXNlbGVjdG9yXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5wcmV2aWV3VGFibGVSb3dTZWxlY3RvclxuICAgICAgICB9LFxuICAgICAgICAnI2VkaXQtc2VsZWN0b3IgYnV0dG9uW2FjdGlvbj1wcmV2aWV3LXNlbGVjdG9yLWRhdGFdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnByZXZpZXdTZWxlY3RvckRhdGFGcm9tU2VsZWN0b3JFZGl0aW5nXG4gICAgICAgIH0sXG4gICAgICAgICdidXR0b24uYWRkLWV4dHJhLXN0YXJ0LXVybCc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5hZGRTdGFydFVybFxuICAgICAgICB9LFxuICAgICAgICAnYnV0dG9uLnJlbW92ZS1zdGFydC11cmwnOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMucmVtb3ZlU3RhcnRVcmxcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIHRoaXMuc2hvd1NpdGVtYXBzKClcbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG5cbiAgY2xlYXJTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc3RhdGUgPSB7XG5cdFx0XHQvLyBzaXRlbWFwIHRoYXQgaXMgY3VycmVudGx5IG9wZW5cbiAgICAgIGN1cnJlbnRTaXRlbWFwOiBudWxsLFxuXHRcdFx0Ly8gc2VsZWN0b3IgaWRzIHRoYXQgYXJlIHNob3duIGluIHRoZSBuYXZpZ2F0aW9uXG4gICAgICBlZGl0U2l0ZW1hcEJyZWFkY3VtYnNTZWxlY3RvcnM6IG51bGwsXG4gICAgICBjdXJyZW50UGFyZW50U2VsZWN0b3JJZDogbnVsbCxcbiAgICAgIGN1cnJlbnRTZWxlY3RvcjogbnVsbFxuICAgIH1cbiAgfSxcblxuICBzZXRTdGF0ZUVkaXRTaXRlbWFwOiBmdW5jdGlvbiAoc2l0ZW1hcCkge1xuICAgIHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXAgPSBzaXRlbWFwXG4gICAgdGhpcy5zdGF0ZS5lZGl0U2l0ZW1hcEJyZWFkY3VtYnNTZWxlY3RvcnMgPSBbXG5cdFx0XHR7aWQ6ICdfcm9vdCd9XG4gICAgXVxuICAgIHRoaXMuc3RhdGUuY3VycmVudFBhcmVudFNlbGVjdG9ySWQgPSAnX3Jvb3QnXG4gIH0sXG5cbiAgc2V0QWN0aXZlTmF2aWdhdGlvbkJ1dHRvbjogZnVuY3Rpb24gKG5hdmlnYXRpb25JZCkge1xuICAgIHRoaXMuJCgnLm5hdiAuYWN0aXZlJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpXG4gICAgdGhpcy4kKCcjJyArIG5hdmlnYXRpb25JZCArICctbmF2LWJ1dHRvbicpLmNsb3Nlc3QoJ2xpJykuYWRkQ2xhc3MoJ2FjdGl2ZScpXG5cbiAgICBpZiAobmF2aWdhdGlvbklkLm1hdGNoKC9ec2l0ZW1hcC0vKSkge1xuICAgICAgdGhpcy4kKCcjc2l0ZW1hcC1uYXYtYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJylcbiAgICAgIHRoaXMuJCgnI3NpdGVtYXAtbmF2LWJ1dHRvbicpLmNsb3Nlc3QoJ2xpJykuYWRkQ2xhc3MoJ2FjdGl2ZScpXG4gICAgICB0aGlzLiQoJyNuYXZiYXItYWN0aXZlLXNpdGVtYXAtaWQnKS50ZXh0KCcoJyArIHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXAuX2lkICsgJyknKVxuICAgIH1cdFx0ZWxzZSB7XG4gICAgICB0aGlzLiQoJyNzaXRlbWFwLW5hdi1idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgdGhpcy4kKCcjbmF2YmFyLWFjdGl2ZS1zaXRlbWFwLWlkJykudGV4dCgnJylcbiAgICB9XG5cbiAgICBpZiAobmF2aWdhdGlvbklkLm1hdGNoKC9eY3JlYXRlLXNpdGVtYXAtLykpIHtcbiAgICAgIHRoaXMuJCgnI2NyZWF0ZS1zaXRlbWFwLW5hdi1idXR0b24nKS5jbG9zZXN0KCdsaScpLmFkZENsYXNzKCdhY3RpdmUnKVxuICAgIH1cbiAgfSxcblxuXHQvKipcblx0ICogU2ltcGxlIGluZm8gcG9wdXAgZm9yIHNpdGVtYXAgc3RhcnQgdXJsIGlucHV0IGZpZWxkXG5cdCAqL1xuICBpbml0TXVsdGlwbGVTdGFydFVybEhlbHBlcjogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJCgnI3N0YXJ0VXJsJylcblx0XHRcdC5wb3BvdmVyKHtcbiAgdGl0bGU6ICdNdWx0aXBsZSBzdGFydCB1cmxzJyxcbiAgaHRtbDogdHJ1ZSxcbiAgY29udGVudDogJ1lvdSBjYW4gY3JlYXRlIHJhbmdlZCBzdGFydCB1cmxzIGxpa2UgdGhpczo8YnIgLz5odHRwOi8vZXhhbXBsZS5jb20vWzEtMTAwXS5odG1sJyxcbiAgcGxhY2VtZW50OiAnYm90dG9tJ1xufSlcblx0XHRcdC5ibHVyKGZ1bmN0aW9uICgpIHtcbiAgdGhpcy4kKHRoaXMpLnBvcG92ZXIoJ2hpZGUnKVxufSlcbiAgfSxcblxuXHQvKipcblx0ICogUmV0dXJucyBib290c3RyYXBWYWxpZGF0b3Igb2JqZWN0IGZvciBjdXJyZW50IGZvcm0gaW4gdmlld3BvcnRcblx0ICovXG4gIGdldEZvcm1WYWxpZGF0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdmFsaWRhdG9yID0gdGhpcy4kKCcjdmlld3BvcnQgZm9ybScpLmRhdGEoJ2Jvb3RzdHJhcFZhbGlkYXRvcicpXG4gICAgcmV0dXJuIHZhbGlkYXRvclxuICB9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIHdoZXRoZXIgY3VycmVudCBmb3JtIGluIHRoZSB2aWV3cG9ydCBpcyB2YWxpZFxuXHQgKiBAcmV0dXJucyB7Qm9vbGVhbn1cblx0ICovXG4gIGlzVmFsaWRGb3JtOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHZhbGlkYXRvciA9IHRoaXMuZ2V0Rm9ybVZhbGlkYXRvcigpXG5cblx0XHQvLyB2YWxpZGF0b3IudmFsaWRhdGUoKTtcblx0XHQvLyB2YWxpZGF0ZSBtZXRob2QgY2FsbHMgc3VibWl0IHdoaWNoIGlzIG5vdCBuZWVkZWQgaW4gdGhpcyBjYXNlLlxuICAgIGZvciAodmFyIGZpZWxkIGluIHZhbGlkYXRvci5vcHRpb25zLmZpZWxkcykge1xuICAgICAgdmFsaWRhdG9yLnZhbGlkYXRlRmllbGQoZmllbGQpXG4gICAgfVxuXG4gICAgdmFyIHZhbGlkID0gdmFsaWRhdG9yLmlzVmFsaWQoKVxuICAgIHJldHVybiB2YWxpZFxuICB9LFxuXG5cdC8qKlxuXHQgKiBBZGQgdmFsaWRhdGlvbiB0byBzaXRlbWFwIGNyZWF0aW9uIG9yIGVkaXRpbmcgZm9ybVxuXHQgKi9cbiAgaW5pdFNpdGVtYXBWYWxpZGF0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKCcjdmlld3BvcnQgZm9ybScpLmJvb3RzdHJhcFZhbGlkYXRvcih7XG4gICAgICBmaWVsZHM6IHtcbiAgICAgICAgJ19pZCc6IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBub3RFbXB0eToge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnVGhlIHNpdGVtYXAgaWQgaXMgcmVxdWlyZWQgYW5kIGNhbm5vdCBiZSBlbXB0eSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdHJpbmdMZW5ndGg6IHtcbiAgICAgICAgICAgICAgbWluOiAzLFxuICAgICAgICAgICAgICBtZXNzYWdlOiAnVGhlIHNpdGVtYXAgaWQgc2hvdWxkIGJlIGF0bGVhc3QgMyBjaGFyYWN0ZXJzIGxvbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVnZXhwOiB7XG4gICAgICAgICAgICAgIHJlZ2V4cDogL15bYS16XVthLXowLTlfJCgpK1xcLS9dKyQvLFxuICAgICAgICAgICAgICBtZXNzYWdlOiAnT25seSBsb3dlcmNhc2UgY2hhcmFjdGVycyAoYS16KSwgZGlnaXRzICgwLTkpLCBvciBhbnkgb2YgdGhlIGNoYXJhY3RlcnMgXywgJCwgKCwgKSwgKywgLSwgYW5kIC8gYXJlIGFsbG93ZWQuIE11c3QgYmVnaW4gd2l0aCBhIGxldHRlci4nXG4gICAgICAgICAgICB9LFxuXHRcdFx0XHRcdFx0Ly8gcGxhY2Vob2xkZXIgZm9yIHNpdGVtYXAgaWQgZXhpc3RhbmNlIHZhbGlkYXRpb25cbiAgICAgICAgICAgIGNhbGxiYWNrOiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdTaXRlbWFwIHdpdGggdGhpcyBpZCBhbHJlYWR5IGV4aXN0cycsXG4gICAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbiAodmFsdWUsIHZhbGlkYXRvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgICdzdGFydFVybFtdJzoge1xuICAgICAgICAgIHZhbGlkYXRvcnM6IHtcbiAgICAgICAgICAgIG5vdEVtcHR5OiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgc3RhcnQgVVJMIGlzIHJlcXVpcmVkIGFuZCBjYW5ub3QgYmUgZW1wdHknXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXJpOiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgc3RhcnQgVVJMIGlzIG5vdCBhIHZhbGlkIFVSTCdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICB9LFxuXG4gIHNob3dDcmVhdGVTaXRlbWFwOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zZXRBY3RpdmVOYXZpZ2F0aW9uQnV0dG9uKCdjcmVhdGUtc2l0ZW1hcC1jcmVhdGUnKVxuICAgIHZhciBzaXRlbWFwRm9ybSA9IGljaC5TaXRlbWFwQ3JlYXRlKClcbiAgICB0aGlzLiQoJyN2aWV3cG9ydCcpLmh0bWwoc2l0ZW1hcEZvcm0pXG4gICAgdGhpcy5pbml0TXVsdGlwbGVTdGFydFVybEhlbHBlcigpXG4gICAgdGhpcy5pbml0U2l0ZW1hcFZhbGlkYXRpb24oKVxuXG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBpbml0SW1wb3J0U3RpZW1hcFZhbGlkYXRpb246IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoJyN2aWV3cG9ydCBmb3JtJykuYm9vdHN0cmFwVmFsaWRhdG9yKHtcbiAgICAgIGZpZWxkczoge1xuICAgICAgICAnX2lkJzoge1xuICAgICAgICAgIHZhbGlkYXRvcnM6IHtcbiAgICAgICAgICAgIHN0cmluZ0xlbmd0aDoge1xuICAgICAgICAgICAgICBtaW46IDMsXG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgc2l0ZW1hcCBpZCBzaG91bGQgYmUgYXRsZWFzdCAzIGNoYXJhY3RlcnMgbG9uZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZWdleHA6IHtcbiAgICAgICAgICAgICAgcmVnZXhwOiAvXlthLXpdW2EtejAtOV8kKCkrXFwtL10rJC8sXG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdPbmx5IGxvd2VyY2FzZSBjaGFyYWN0ZXJzIChhLXopLCBkaWdpdHMgKDAtOSksIG9yIGFueSBvZiB0aGUgY2hhcmFjdGVycyBfLCAkLCAoLCApLCArLCAtLCBhbmQgLyBhcmUgYWxsb3dlZC4gTXVzdCBiZWdpbiB3aXRoIGEgbGV0dGVyLidcbiAgICAgICAgICAgIH0sXG5cdFx0XHRcdFx0XHQvLyBwbGFjZWhvbGRlciBmb3Igc2l0ZW1hcCBpZCBleGlzdGFuY2UgdmFsaWRhdGlvblxuICAgICAgICAgICAgY2FsbGJhY2s6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1NpdGVtYXAgd2l0aCB0aGlzIGlkIGFscmVhZHkgZXhpc3RzJyxcbiAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICh2YWx1ZSwgdmFsaWRhdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc2l0ZW1hcEpTT046IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBub3RFbXB0eToge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnU2l0ZW1hcCBKU09OIGlzIHJlcXVpcmVkIGFuZCBjYW5ub3QgYmUgZW1wdHknXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2FsbGJhY2s6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ0pTT04gaXMgbm90IHZhbGlkJyxcbiAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICh2YWx1ZSwgdmFsaWRhdG9yKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgIEpTT04ucGFyc2UodmFsdWUpXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICB9LFxuXG4gIHNob3dJbXBvcnRTaXRlbWFwUGFuZWw6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNldEFjdGl2ZU5hdmlnYXRpb25CdXR0b24oJ2NyZWF0ZS1zaXRlbWFwLWltcG9ydCcpXG4gICAgdmFyIHNpdGVtYXBGb3JtID0gaWNoLlNpdGVtYXBJbXBvcnQoKVxuICAgIHRoaXMuJCgnI3ZpZXdwb3J0JykuaHRtbChzaXRlbWFwRm9ybSlcbiAgICB0aGlzLmluaXRJbXBvcnRTdGllbWFwVmFsaWRhdGlvbigpXG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBzaG93U2l0ZW1hcEV4cG9ydFBhbmVsOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zZXRBY3RpdmVOYXZpZ2F0aW9uQnV0dG9uKCdzaXRlbWFwLWV4cG9ydCcpXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgdmFyIHNpdGVtYXBKU09OID0gc2l0ZW1hcC5leHBvcnRTaXRlbWFwKClcbiAgICB2YXIgc2l0ZW1hcEV4cG9ydEZvcm0gPSBpY2guU2l0ZW1hcEV4cG9ydCh7XG4gICAgICBzaXRlbWFwSlNPTjogc2l0ZW1hcEpTT05cbiAgICB9KVxuICAgIHRoaXMuJCgnI3ZpZXdwb3J0JykuaHRtbChzaXRlbWFwRXhwb3J0Rm9ybSlcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIHNob3dTaXRlbWFwczogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuY2xlYXJTdGF0ZSgpXG4gICAgdGhpcy5zZXRBY3RpdmVOYXZpZ2F0aW9uQnV0dG9uKCdzaXRlbWFwcycpXG5cbiAgICB0aGlzLnN0b3JlLmdldEFsbFNpdGVtYXBzKGZ1bmN0aW9uIChzaXRlbWFwcykge1xuICAgICAgJHNpdGVtYXBMaXN0UGFuZWwgPSBpY2guU2l0ZW1hcExpc3QoKVxuICAgICAgc2l0ZW1hcHMuZm9yRWFjaChmdW5jdGlvbiAoc2l0ZW1hcCkge1xuICAgICAgICAkc2l0ZW1hcCA9IGljaC5TaXRlbWFwTGlzdEl0ZW0oc2l0ZW1hcClcbiAgICAgICAgJHNpdGVtYXAuZGF0YSgnc2l0ZW1hcCcsIHNpdGVtYXApXG4gICAgICAgICRzaXRlbWFwTGlzdFBhbmVsLmZpbmQoJ3Rib2R5JykuYXBwZW5kKCRzaXRlbWFwKVxuICAgICAgfSlcbiAgICAgIHRoaXMuJCgnI3ZpZXdwb3J0JykuaHRtbCgkc2l0ZW1hcExpc3RQYW5lbClcbiAgICB9KVxuICB9LFxuXG4gIGdldFNpdGVtYXBGcm9tTWV0YWRhdGFGb3JtOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGlkID0gdGhpcy4kKCcjdmlld3BvcnQgZm9ybSBpbnB1dFtuYW1lPV9pZF0nKS52YWwoKVxuICAgIHZhciAkc3RhcnRVcmxJbnB1dHMgPSB0aGlzLiQoJyN2aWV3cG9ydCBmb3JtIC5pbnB1dC1zdGFydC11cmwnKVxuICAgIHZhciBzdGFydFVybFxuICAgIGlmICgkc3RhcnRVcmxJbnB1dHMubGVuZ3RoID09PSAxKSB7XG4gICAgICBzdGFydFVybCA9ICRzdGFydFVybElucHV0cy52YWwoKVxuICAgIH0gZWxzZSB7XG4gICAgICBzdGFydFVybCA9IFtdXG4gICAgICAkc3RhcnRVcmxJbnB1dHMuZWFjaChmdW5jdGlvbiAoaSwgZWxlbWVudCkge1xuICAgICAgICBzdGFydFVybC5wdXNoKHRoaXMuJChlbGVtZW50KS52YWwoKSlcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiBpZCxcbiAgICAgIHN0YXJ0VXJsOiBzdGFydFVybFxuICAgIH1cbiAgfSxcblxuICBjcmVhdGVTaXRlbWFwOiBmdW5jdGlvbiAoZm9ybSkge1xuICAgIHZhciAkID0gdGhpcy4kXG5cdFx0Ly8gY2FuY2VsIHN1Ym1pdCBpZiBpbnZhbGlkIGZvcm1cbiAgICBpZiAoIXRoaXMuaXNWYWxpZEZvcm0oKSkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG4gICAgdmFyIHNpdGVtYXBEYXRhID0gdGhpcy5nZXRTaXRlbWFwRnJvbU1ldGFkYXRhRm9ybSgpXG5cblx0XHQvLyBjaGVjayB3aGV0aGVyIHNpdGVtYXAgd2l0aCB0aGlzIGlkIGFscmVhZHkgZXhpc3RcbiAgICB0aGlzLnN0b3JlLnNpdGVtYXBFeGlzdHMoc2l0ZW1hcERhdGEuaWQsIGZ1bmN0aW9uIChzaXRlbWFwRXhpc3RzKSB7XG4gICAgICBpZiAoc2l0ZW1hcEV4aXN0cykge1xuICAgICAgICB2YXIgdmFsaWRhdG9yID0gdGhpcy5nZXRGb3JtVmFsaWRhdG9yKClcbiAgICAgICAgdmFsaWRhdG9yLnVwZGF0ZVN0YXR1cygnX2lkJywgJ0lOVkFMSUQnLCAnY2FsbGJhY2snKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHNpdGVtYXAgPSBuZXcgU2l0ZW1hcCh7XG4gICAgICAgICAgX2lkOiBzaXRlbWFwRGF0YS5pZCxcbiAgICAgICAgICBzdGFydFVybDogc2l0ZW1hcERhdGEuc3RhcnRVcmwsXG4gICAgICAgICAgc2VsZWN0b3JzOiBbXVxuICAgICAgICB9LCB7JH0pXG4gICAgICAgIHRoaXMuc3RvcmUuY3JlYXRlU2l0ZW1hcChzaXRlbWFwLCBmdW5jdGlvbiAoc2l0ZW1hcCkge1xuICAgICAgICAgIHRoaXMuX2VkaXRTaXRlbWFwKHNpdGVtYXAsIFsnX3Jvb3QnXSlcbiAgICAgICAgfS5iaW5kKHRoaXMsIHNpdGVtYXApKVxuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcblxuICBpbXBvcnRTaXRlbWFwOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcblx0XHQvLyBjYW5jZWwgc3VibWl0IGlmIGludmFsaWQgZm9ybVxuICAgIGlmICghdGhpcy5pc1ZhbGlkRm9ybSgpKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cblx0XHQvLyBsb2FkIGRhdGEgZnJvbSBmb3JtXG4gICAgdmFyIHNpdGVtYXBKU09OID0gdGhpcy4kKCdbbmFtZT1zaXRlbWFwSlNPTl0nKS52YWwoKVxuICAgIHZhciBpZCA9IHRoaXMuJCgnaW5wdXRbbmFtZT1faWRdJykudmFsKClcbiAgICB2YXIgc2l0ZW1hcCA9IG5ldyBTaXRlbWFwKG51bGwsIHskfSlcbiAgICBzaXRlbWFwLmltcG9ydFNpdGVtYXAoc2l0ZW1hcEpTT04pXG4gICAgaWYgKGlkLmxlbmd0aCkge1xuICAgICAgc2l0ZW1hcC5faWQgPSBpZFxuICAgIH1cblx0XHQvLyBjaGVjayB3aGV0aGVyIHNpdGVtYXAgd2l0aCB0aGlzIGlkIGFscmVhZHkgZXhpc3RcbiAgICB0aGlzLnN0b3JlLnNpdGVtYXBFeGlzdHMoc2l0ZW1hcC5faWQsIGZ1bmN0aW9uIChzaXRlbWFwRXhpc3RzKSB7XG4gICAgICBpZiAoc2l0ZW1hcEV4aXN0cykge1xuICAgICAgICB2YXIgdmFsaWRhdG9yID0gdGhpcy5nZXRGb3JtVmFsaWRhdG9yKClcbiAgICAgICAgdmFsaWRhdG9yLnVwZGF0ZVN0YXR1cygnX2lkJywgJ0lOVkFMSUQnLCAnY2FsbGJhY2snKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5zdG9yZS5jcmVhdGVTaXRlbWFwKHNpdGVtYXAsIGZ1bmN0aW9uIChzaXRlbWFwKSB7XG4gICAgICAgICAgdGhpcy5fZWRpdFNpdGVtYXAoc2l0ZW1hcCwgWydfcm9vdCddKVxuICAgICAgICB9LmJpbmQodGhpcywgc2l0ZW1hcCkpXG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuXG4gIGVkaXRTaXRlbWFwTWV0YWRhdGE6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB0aGlzLnNldEFjdGl2ZU5hdmlnYXRpb25CdXR0b24oJ3NpdGVtYXAtZWRpdC1tZXRhZGF0YScpXG5cbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICB2YXIgJHNpdGVtYXBNZXRhZGF0YUZvcm0gPSBpY2guU2l0ZW1hcEVkaXRNZXRhZGF0YShzaXRlbWFwKVxuICAgIHRoaXMuJCgnI3ZpZXdwb3J0JykuaHRtbCgkc2l0ZW1hcE1ldGFkYXRhRm9ybSlcbiAgICB0aGlzLmluaXRNdWx0aXBsZVN0YXJ0VXJsSGVscGVyKClcbiAgICB0aGlzLmluaXRTaXRlbWFwVmFsaWRhdGlvbigpXG5cbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGVkaXRTaXRlbWFwTWV0YWRhdGFTYXZlOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICB2YXIgc2l0ZW1hcERhdGEgPSB0aGlzLmdldFNpdGVtYXBGcm9tTWV0YWRhdGFGb3JtKClcblxuXHRcdC8vIGNhbmNlbCBzdWJtaXQgaWYgaW52YWxpZCBmb3JtXG4gICAgaWYgKCF0aGlzLmlzVmFsaWRGb3JtKCkpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cblxuXHRcdC8vIGNoZWNrIHdoZXRoZXIgc2l0ZW1hcCB3aXRoIHRoaXMgaWQgYWxyZWFkeSBleGlzdFxuICAgIHRoaXMuc3RvcmUuc2l0ZW1hcEV4aXN0cyhzaXRlbWFwRGF0YS5pZCwgZnVuY3Rpb24gKHNpdGVtYXBFeGlzdHMpIHtcbiAgICAgIGlmIChzaXRlbWFwLl9pZCAhPT0gc2l0ZW1hcERhdGEuaWQgJiYgc2l0ZW1hcEV4aXN0cykge1xuICAgICAgICB2YXIgdmFsaWRhdG9yID0gdGhpcy5nZXRGb3JtVmFsaWRhdG9yKClcbiAgICAgICAgdmFsaWRhdG9yLnVwZGF0ZVN0YXR1cygnX2lkJywgJ0lOVkFMSUQnLCAnY2FsbGJhY2snKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuXHRcdFx0Ly8gY2hhbmdlIGRhdGFcbiAgICAgIHNpdGVtYXAuc3RhcnRVcmwgPSBzaXRlbWFwRGF0YS5zdGFydFVybFxuXG5cdFx0XHQvLyBqdXN0IGNoYW5nZSBzaXRlbWFwcyB1cmxcbiAgICAgIGlmIChzaXRlbWFwRGF0YS5pZCA9PT0gc2l0ZW1hcC5faWQpIHtcbiAgICAgICAgdGhpcy5zdG9yZS5zYXZlU2l0ZW1hcChzaXRlbWFwLCBmdW5jdGlvbiAoc2l0ZW1hcCkge1xuICAgICAgICAgIHRoaXMuc2hvd1NpdGVtYXBTZWxlY3Rvckxpc3QoKVxuICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBpZCBjaGFuZ2VkLiB3ZSBuZWVkIHRvIGRlbGV0ZSB0aGUgb2xkIG9uZSBhbmQgY3JlYXRlIGEgbmV3IG9uZVxuICAgICAgICB2YXIgbmV3U2l0ZW1hcCA9IG5ldyBTaXRlbWFwKHNpdGVtYXAsIHskfSlcbiAgICAgICAgdmFyIG9sZFNpdGVtYXAgPSBzaXRlbWFwXG4gICAgICAgIG5ld1NpdGVtYXAuX2lkID0gc2l0ZW1hcERhdGEuaWRcbiAgICAgICAgdGhpcy5zdG9yZS5jcmVhdGVTaXRlbWFwKG5ld1NpdGVtYXAsIGZ1bmN0aW9uIChuZXdTaXRlbWFwKSB7XG4gICAgICAgICAgdGhpcy5zdG9yZS5kZWxldGVTaXRlbWFwKG9sZFNpdGVtYXAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXAgPSBuZXdTaXRlbWFwXG4gICAgICAgICAgICB0aGlzLnNob3dTaXRlbWFwU2VsZWN0b3JMaXN0KClcbiAgICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG5cblx0LyoqXG5cdCAqIENhbGxiYWNrIHdoZW4gc2l0ZW1hcCBlZGl0IGJ1dHRvbiBpcyBjbGlja2VkIGluIHNpdGVtYXAgZ3JpZFxuXHQgKi9cbiAgZWRpdFNpdGVtYXA6IGZ1bmN0aW9uICh0cikge1xuICAgIHZhciBzaXRlbWFwID0gdGhpcy4kKHRyKS5kYXRhKCdzaXRlbWFwJylcbiAgICB0aGlzLl9lZGl0U2l0ZW1hcChzaXRlbWFwKVxuICB9LFxuICBfZWRpdFNpdGVtYXA6IGZ1bmN0aW9uIChzaXRlbWFwKSB7XG4gICAgdGhpcy5zZXRTdGF0ZUVkaXRTaXRlbWFwKHNpdGVtYXApXG4gICAgdGhpcy5zZXRBY3RpdmVOYXZpZ2F0aW9uQnV0dG9uKCdzaXRlbWFwJylcblxuICAgIHRoaXMuc2hvd1NpdGVtYXBTZWxlY3Rvckxpc3QoKVxuICB9LFxuICBzaG93U2l0ZW1hcFNlbGVjdG9yTGlzdDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2V0QWN0aXZlTmF2aWdhdGlvbkJ1dHRvbignc2l0ZW1hcC1zZWxlY3Rvci1saXN0JylcblxuICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcFxuICAgIHZhciBwYXJlbnRTZWxlY3RvcnMgPSB0aGlzLnN0YXRlLmVkaXRTaXRlbWFwQnJlYWRjdW1ic1NlbGVjdG9yc1xuICAgIHZhciBwYXJlbnRTZWxlY3RvcklkID0gdGhpcy5zdGF0ZS5jdXJyZW50UGFyZW50U2VsZWN0b3JJZFxuXG4gICAgdmFyICRzZWxlY3Rvckxpc3RQYW5lbCA9IGljaC5TZWxlY3Rvckxpc3Qoe1xuICAgICAgcGFyZW50U2VsZWN0b3JzOiBwYXJlbnRTZWxlY3RvcnNcbiAgICB9KVxuICAgIHZhciBzZWxlY3RvcnMgPSBzaXRlbWFwLmdldERpcmVjdENoaWxkU2VsZWN0b3JzKHBhcmVudFNlbGVjdG9ySWQpXG4gICAgc2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICAkc2VsZWN0b3IgPSBpY2guU2VsZWN0b3JMaXN0SXRlbShzZWxlY3RvcilcbiAgICAgICRzZWxlY3Rvci5kYXRhKCdzZWxlY3RvcicsIHNlbGVjdG9yKVxuICAgICAgJHNlbGVjdG9yTGlzdFBhbmVsLmZpbmQoJ3Rib2R5JykuYXBwZW5kKCRzZWxlY3RvcilcbiAgICB9KVxuICAgIHRoaXMuJCgnI3ZpZXdwb3J0JykuaHRtbCgkc2VsZWN0b3JMaXN0UGFuZWwpXG5cbiAgICByZXR1cm4gdHJ1ZVxuICB9LCAvKlxuICBzaG93U2l0ZW1hcFNlbGVjdG9yR3JhcGg6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNldEFjdGl2ZU5hdmlnYXRpb25CdXR0b24oJ3NpdGVtYXAtc2VsZWN0b3ItZ3JhcGgnKVxuICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcFxuICAgIHZhciAkc2VsZWN0b3JHcmFwaFBhbmVsID0gaWNoLlNpdGVtYXBTZWxlY3RvckdyYXBoKClcbiAgICAkKCcjdmlld3BvcnQnKS5odG1sKCRzZWxlY3RvckdyYXBoUGFuZWwpXG4gICAgdmFyIGdyYXBoRGl2ID0gJCgnI3NlbGVjdG9yLWdyYXBoJylbMF1cbiAgICB2YXIgZ3JhcGggPSBuZXcgU2VsZWN0b3JHcmFwaHYyKHNpdGVtYXApXG4gICAgZ3JhcGguZHJhdyhncmFwaERpdiwgJChkb2N1bWVudCkud2lkdGgoKSwgMjAwKVxuICAgIHJldHVybiB0cnVlXG4gIH0sICovXG4gIHNob3dDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKHRyKSB7XG4gICAgdmFyIHNlbGVjdG9yID0gdGhpcy4kKHRyKS5kYXRhKCdzZWxlY3RvcicpXG4gICAgdmFyIHBhcmVudFNlbGVjdG9ycyA9IHRoaXMuc3RhdGUuZWRpdFNpdGVtYXBCcmVhZGN1bWJzU2VsZWN0b3JzXG4gICAgdGhpcy5zdGF0ZS5jdXJyZW50UGFyZW50U2VsZWN0b3JJZCA9IHNlbGVjdG9yLmlkXG4gICAgcGFyZW50U2VsZWN0b3JzLnB1c2goc2VsZWN0b3IpXG5cbiAgICB0aGlzLnNob3dTaXRlbWFwU2VsZWN0b3JMaXN0KClcbiAgfSxcblxuICB0cmVlTmF2aWdhdGlvbnNob3dTaXRlbWFwU2VsZWN0b3JMaXN0OiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyIHBhcmVudFNlbGVjdG9ycyA9IHRoaXMuc3RhdGUuZWRpdFNpdGVtYXBCcmVhZGN1bWJzU2VsZWN0b3JzXG4gICAgdmFyIGNvbnRyb2xsZXIgPSB0aGlzXG4gICAgdGhpcy4kKCcjc2VsZWN0b3ItdHJlZSAuYnJlYWRjcnVtYiBsaSBhJykuZWFjaChmdW5jdGlvbiAoaSwgcGFyZW50U2VsZWN0b3JCdXR0b24pIHtcbiAgICAgIGlmIChwYXJlbnRTZWxlY3RvckJ1dHRvbiA9PT0gYnV0dG9uKSB7XG4gICAgICAgIHBhcmVudFNlbGVjdG9ycy5zcGxpY2UoaSArIDEpXG4gICAgICAgIGNvbnRyb2xsZXIuc3RhdGUuY3VycmVudFBhcmVudFNlbGVjdG9ySWQgPSBwYXJlbnRTZWxlY3RvcnNbaV0uaWRcbiAgICAgIH1cbiAgICB9KVxuICAgIHRoaXMuc2hvd1NpdGVtYXBTZWxlY3Rvckxpc3QoKVxuICB9LFxuXG4gIGluaXRTZWxlY3RvclZhbGlkYXRpb246IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoJyN2aWV3cG9ydCBmb3JtJykuYm9vdHN0cmFwVmFsaWRhdG9yKHtcbiAgICAgIGZpZWxkczoge1xuICAgICAgICAnaWQnOiB7XG4gICAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgICAgbm90RW1wdHk6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1NpdGVtYXAgaWQgcmVxdWlyZWQgYW5kIGNhbm5vdCBiZSBlbXB0eSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdHJpbmdMZW5ndGg6IHtcbiAgICAgICAgICAgICAgbWluOiAzLFxuICAgICAgICAgICAgICBtZXNzYWdlOiAnVGhlIHNpdGVtYXAgaWQgc2hvdWxkIGJlIGF0bGVhc3QgMyBjaGFyYWN0ZXJzIGxvbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVnZXhwOiB7XG4gICAgICAgICAgICAgIHJlZ2V4cDogL15bXl9dLiokLyxcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1NlbGVjdG9yIGlkIGNhbm5vdCBzdGFydCB3aXRoIGFuIHVuZGVyc2NvcmUgXydcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHNlbGVjdG9yOiB7XG4gICAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgICAgbm90RW1wdHk6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1NlbGVjdG9yIGlzIHJlcXVpcmVkIGFuZCBjYW5ub3QgYmUgZW1wdHknXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICByZWdleDoge1xuICAgICAgICAgIHZhbGlkYXRvcnM6IHtcbiAgICAgICAgICAgIGNhbGxiYWNrOiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdKYXZhU2NyaXB0IGRvZXMgbm90IHN1cHBvcnQgcmVndWxhciBleHByZXNzaW9ucyB0aGF0IGNhbiBtYXRjaCAwIGNoYXJhY3RlcnMuJyxcbiAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICh2YWx1ZSwgdmFsaWRhdG9yKSB7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gYWxsb3cgbm8gcmVnZXhcbiAgICAgICAgICAgICAgICBpZiAoIXZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBtYXRjaGVzID0gJycubWF0Y2gobmV3IFJlZ0V4cCh2YWx1ZSkpXG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoZXMgIT09IG51bGwgJiYgbWF0Y2hlc1swXSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2xpY2tFbGVtZW50U2VsZWN0b3I6IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBub3RFbXB0eToge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnQ2xpY2sgc2VsZWN0b3IgaXMgcmVxdWlyZWQgYW5kIGNhbm5vdCBiZSBlbXB0eSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHRhYmxlSGVhZGVyUm93U2VsZWN0b3I6IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBub3RFbXB0eToge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnSGVhZGVyIHJvdyBzZWxlY3RvciBpcyByZXF1aXJlZCBhbmQgY2Fubm90IGJlIGVtcHR5J1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgdGFibGVEYXRhUm93U2VsZWN0b3I6IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBub3RFbXB0eToge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnRGF0YSByb3cgc2VsZWN0b3IgaXMgcmVxdWlyZWQgYW5kIGNhbm5vdCBiZSBlbXB0eSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgICAgbnVtZXJpYzoge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnRGVsYXkgbXVzdCBiZSBudW1lcmljJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgcGFyZW50U2VsZWN0b3JzOiB7XG4gICAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgICAgbm90RW1wdHk6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1lvdSBtdXN0IGNob29zZSBhdCBsZWFzdCBvbmUgcGFyZW50IHNlbGVjdG9yJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNhbGxiYWNrOiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdDYW5ub3QgaGFuZGxlIHJlY3Vyc2l2ZSBlbGVtZW50IHNlbGVjdG9ycycsXG4gICAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbiAodmFsdWUsIHZhbGlkYXRvciwgJGZpZWxkKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNpdGVtYXAgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yU2l0ZW1hcCgpXG4gICAgICAgICAgICAgICAgcmV0dXJuICFzaXRlbWFwLnNlbGVjdG9ycy5oYXNSZWN1cnNpdmVFbGVtZW50U2VsZWN0b3JzKClcbiAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgfSxcbiAgZWRpdFNlbGVjdG9yOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyIHNlbGVjdG9yID0gdGhpcy4kKGJ1dHRvbikuY2xvc2VzdCgndHInKS5kYXRhKCdzZWxlY3RvcicpXG4gICAgdGhpcy5fZWRpdFNlbGVjdG9yKHNlbGVjdG9yKVxuICB9LFxuICB1cGRhdGVTZWxlY3RvclBhcmVudExpc3RPbklkQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGVjdG9yID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvcigpXG4gICAgdGhpcy4kKCcuY3VycmVudGx5LWVkaXRlZCcpLnZhbChzZWxlY3Rvci5pZCkudGV4dChzZWxlY3Rvci5pZClcbiAgfSxcbiAgX2VkaXRTZWxlY3RvcjogZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgdmFyIHNlbGVjdG9ySWRzID0gc2l0ZW1hcC5nZXRQb3NzaWJsZVBhcmVudFNlbGVjdG9ySWRzKClcblxuICAgIHZhciAkZWRpdFNlbGVjdG9yRm9ybSA9IGljaC5TZWxlY3RvckVkaXQoe1xuICAgICAgc2VsZWN0b3I6IHNlbGVjdG9yLFxuICAgICAgc2VsZWN0b3JJZHM6IHNlbGVjdG9ySWRzLFxuICAgICAgc2VsZWN0b3JUeXBlczogW1xuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ1NlbGVjdG9yVGV4dCcsXG4gICAgICAgICAgdGl0bGU6ICdUZXh0J1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ1NlbGVjdG9yTGluaycsXG4gICAgICAgICAgdGl0bGU6ICdMaW5rJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ1NlbGVjdG9yUG9wdXBMaW5rJyxcbiAgICAgICAgICB0aXRsZTogJ1BvcHVwIExpbmsnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnU2VsZWN0b3JJbWFnZScsXG4gICAgICAgICAgdGl0bGU6ICdJbWFnZSdcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6ICdTZWxlY3RvclRhYmxlJyxcbiAgICAgICAgICB0aXRsZTogJ1RhYmxlJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ1NlbGVjdG9yRWxlbWVudEF0dHJpYnV0ZScsXG4gICAgICAgICAgdGl0bGU6ICdFbGVtZW50IGF0dHJpYnV0ZSdcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6ICdTZWxlY3RvckhUTUwnLFxuICAgICAgICAgIHRpdGxlOiAnSFRNTCdcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6ICdTZWxlY3RvckVsZW1lbnQnLFxuICAgICAgICAgIHRpdGxlOiAnRWxlbWVudCdcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6ICdTZWxlY3RvckVsZW1lbnRTY3JvbGwnLFxuICAgICAgICAgIHRpdGxlOiAnRWxlbWVudCBzY3JvbGwgZG93bidcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6ICdTZWxlY3RvckVsZW1lbnRDbGljaycsXG4gICAgICAgICAgdGl0bGU6ICdFbGVtZW50IGNsaWNrJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ1NlbGVjdG9yR3JvdXAnLFxuICAgICAgICAgIHRpdGxlOiAnR3JvdXBlZCdcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0pXG4gICAgdGhpcy4kKCcjdmlld3BvcnQnKS5odG1sKCRlZGl0U2VsZWN0b3JGb3JtKVxuXHRcdC8vIG1hcmsgaW5pdGlhbGx5IG9wZW5lZCBzZWxlY3RvciBhcyBjdXJyZW50bHkgZWRpdGVkXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdGhpcy4kKCcjZWRpdC1zZWxlY3RvciAjcGFyZW50U2VsZWN0b3JzIG9wdGlvbicpLmVhY2goZnVuY3Rpb24gKGksIGVsZW1lbnQpIHtcbiAgICAgIGlmIChzZWxmLiQoZWxlbWVudCkudmFsKCkgPT09IHNlbGVjdG9yLmlkKSB7XG4gICAgICAgIHNlbGYuJChlbGVtZW50KS5hZGRDbGFzcygnY3VycmVudGx5LWVkaXRlZCcpXG4gICAgICB9XG4gICAgfSlcblxuXHRcdC8vIHNldCBjbGlja1R5cGVcbiAgICBpZiAoc2VsZWN0b3IuY2xpY2tUeXBlKSB7XG4gICAgICAkZWRpdFNlbGVjdG9yRm9ybS5maW5kKCdbbmFtZT1jbGlja1R5cGVdJykudmFsKHNlbGVjdG9yLmNsaWNrVHlwZSlcbiAgICB9XG5cdFx0Ly8gc2V0IGNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlXG4gICAgaWYgKHNlbGVjdG9yLmNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlKSB7XG4gICAgICAkZWRpdFNlbGVjdG9yRm9ybS5maW5kKCdbbmFtZT1jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZV0nKS52YWwoc2VsZWN0b3IuY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUpXG4gICAgfVxuXG5cdFx0Ly8gaGFuZGxlIHNlbGVjdHMgc2VwZXJhdGVseVxuICAgICRlZGl0U2VsZWN0b3JGb3JtLmZpbmQoJ1tuYW1lPXR5cGVdJykudmFsKHNlbGVjdG9yLnR5cGUpXG4gICAgc2VsZWN0b3IucGFyZW50U2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9ySWQpIHtcbiAgICAgICRlZGl0U2VsZWN0b3JGb3JtLmZpbmQoXCIjcGFyZW50U2VsZWN0b3JzIFt2YWx1ZT0nXCIgKyBwYXJlbnRTZWxlY3RvcklkICsgXCInXVwiKS5hdHRyKCdzZWxlY3RlZCcsICdzZWxlY3RlZCcpXG4gICAgfSlcblxuICAgIHRoaXMuc3RhdGUuY3VycmVudFNlbGVjdG9yID0gc2VsZWN0b3JcbiAgICB0aGlzLnNlbGVjdG9yVHlwZUNoYW5nZWQoKVxuICAgIHRoaXMuaW5pdFNlbGVjdG9yVmFsaWRhdGlvbigpXG4gIH0sXG4gIHNlbGVjdG9yVHlwZUNoYW5nZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdHlwZSA9IHRoaXMuJCgnI2VkaXQtc2VsZWN0b3Igc2VsZWN0W25hbWU9dHlwZV0nKS52YWwoKVxuICAgIHZhciBmZWF0dXJlcyA9IHNlbGVjdG9yc1t0eXBlXS5nZXRGZWF0dXJlcygpXG4gICAgdGhpcy4kKCcjZWRpdC1zZWxlY3RvciAuZmVhdHVyZScpLmhpZGUoKVxuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIGZlYXR1cmVzLmZvckVhY2goZnVuY3Rpb24gKGZlYXR1cmUpIHtcbiAgICAgIHNlbGYuJCgnI2VkaXQtc2VsZWN0b3IgLmZlYXR1cmUtJyArIGZlYXR1cmUpLnNob3coKVxuICAgIH0pXG5cblx0XHQvLyBhZGQgdGhpcyBzZWxlY3RvciB0byBwb3NzaWJsZSBwYXJlbnQgc2VsZWN0b3JcbiAgICB2YXIgc2VsZWN0b3IgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yKClcbiAgICBpZiAoc2VsZWN0b3IuY2FuSGF2ZUNoaWxkU2VsZWN0b3JzKCkpIHtcbiAgICAgIGlmICh0aGlzLiQoJyNlZGl0LXNlbGVjdG9yICNwYXJlbnRTZWxlY3RvcnMgLmN1cnJlbnRseS1lZGl0ZWQnKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdmFyICRvcHRpb24gPSB0aGlzLiQoJzxvcHRpb24gY2xhc3M9XCJjdXJyZW50bHktZWRpdGVkXCI+PC9vcHRpb24+JylcbiAgICAgICAgJG9wdGlvbi50ZXh0KHNlbGVjdG9yLmlkKS52YWwoc2VsZWN0b3IuaWQpXG4gICAgICAgIHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgI3BhcmVudFNlbGVjdG9ycycpLmFwcGVuZCgkb3B0aW9uKVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG5cdFx0Ly8gcmVtb3ZlIGlmIHR5cGUgZG9lc24ndCBhbGxvdyB0byBoYXZlIGNoaWxkIHNlbGVjdG9yc1xuICAgICAgdGhpcy4kKCcjZWRpdC1zZWxlY3RvciAjcGFyZW50U2VsZWN0b3JzIC5jdXJyZW50bHktZWRpdGVkJykucmVtb3ZlKClcbiAgICB9XG4gIH0sXG4gIHNhdmVTZWxlY3RvcjogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcFxuICAgIHZhciBzZWxlY3RvciA9IHRoaXMuc3RhdGUuY3VycmVudFNlbGVjdG9yXG4gICAgdmFyIG5ld1NlbGVjdG9yID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvcigpXG5cblx0XHQvLyBjYW5jZWwgc3VibWl0IGlmIGludmFsaWQgZm9ybVxuICAgIGlmICghdGhpcy5pc1ZhbGlkRm9ybSgpKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cblx0XHQvLyBjYW5jZWwgcG9zc2libGUgZWxlbWVudCBzZWxlY3Rpb25cbiAgICB0aGlzLmNvbnRlbnRTY3JpcHQucmVtb3ZlQ3VycmVudENvbnRlbnRTZWxlY3RvcigpLmRvbmUoZnVuY3Rpb24gKCkge1xuICAgICAgc2l0ZW1hcC51cGRhdGVTZWxlY3RvcihzZWxlY3RvciwgbmV3U2VsZWN0b3IpXG5cbiAgICAgIHRoaXMuc3RvcmUuc2F2ZVNpdGVtYXAoc2l0ZW1hcCwgZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnNob3dTaXRlbWFwU2VsZWN0b3JMaXN0KClcbiAgICAgIH0uYmluZCh0aGlzKSlcbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG5cdC8qKlxuXHQgKiBHZXQgc2VsZWN0b3IgZnJvbSBzZWxlY3RvciBlZGl0aW5nIGZvcm1cblx0ICovXG4gIGdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGlkID0gdGhpcy4kKCcjZWRpdC1zZWxlY3RvciBbbmFtZT1pZF0nKS52YWwoKVxuICAgIHZhciBzZWxlY3RvcnNTZWxlY3RvciA9IHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9c2VsZWN0b3JdJykudmFsKClcbiAgICB2YXIgdGFibGVEYXRhUm93U2VsZWN0b3IgPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPXRhYmxlRGF0YVJvd1NlbGVjdG9yXScpLnZhbCgpXG4gICAgdmFyIHRhYmxlSGVhZGVyUm93U2VsZWN0b3IgPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPXRhYmxlSGVhZGVyUm93U2VsZWN0b3JdJykudmFsKClcbiAgICB2YXIgY2xpY2tFbGVtZW50U2VsZWN0b3IgPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPWNsaWNrRWxlbWVudFNlbGVjdG9yXScpLnZhbCgpXG4gICAgdmFyIHR5cGUgPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPXR5cGVdJykudmFsKClcbiAgICB2YXIgY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUgPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPWNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlXScpLnZhbCgpXG4gICAgdmFyIGNsaWNrVHlwZSA9IHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9Y2xpY2tUeXBlXScpLnZhbCgpXG4gICAgdmFyIGRpc2NhcmRJbml0aWFsRWxlbWVudHMgPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPWRpc2NhcmRJbml0aWFsRWxlbWVudHNdJykuaXMoJzpjaGVja2VkJylcbiAgICB2YXIgbXVsdGlwbGUgPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPW11bHRpcGxlXScpLmlzKCc6Y2hlY2tlZCcpXG4gICAgdmFyIGRvd25sb2FkSW1hZ2UgPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPWRvd25sb2FkSW1hZ2VdJykuaXMoJzpjaGVja2VkJylcbiAgICB2YXIgY2xpY2tQb3B1cCA9IHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9Y2xpY2tQb3B1cF0nKS5pcygnOmNoZWNrZWQnKVxuICAgIHZhciByZWdleCA9IHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9cmVnZXhdJykudmFsKClcbiAgICB2YXIgZGVsYXkgPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPWRlbGF5XScpLnZhbCgpXG4gICAgdmFyIGV4dHJhY3RBdHRyaWJ1dGUgPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPWV4dHJhY3RBdHRyaWJ1dGVdJykudmFsKClcbiAgICB2YXIgcGFyZW50U2VsZWN0b3JzID0gdGhpcy4kKCcjZWRpdC1zZWxlY3RvciBbbmFtZT1wYXJlbnRTZWxlY3RvcnNdJykudmFsKClcbiAgICB2YXIgY29sdW1ucyA9IFtdXG4gICAgdmFyICRjb2x1bW5IZWFkZXJzID0gdGhpcy4kKCcjZWRpdC1zZWxlY3RvciAuY29sdW1uLWhlYWRlcicpXG4gICAgdmFyICRjb2x1bW5OYW1lcyA9IHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgLmNvbHVtbi1uYW1lJylcbiAgICB2YXIgJGNvbHVtbkV4dHJhY3RzID0gdGhpcy4kKCcjZWRpdC1zZWxlY3RvciAuY29sdW1uLWV4dHJhY3QnKVxuXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgJGNvbHVtbkhlYWRlcnMuZWFjaChmdW5jdGlvbiAoaSkge1xuICAgICAgdmFyIGhlYWRlciA9IHNlbGYuJCgkY29sdW1uSGVhZGVyc1tpXSkudmFsKClcbiAgICAgIHZhciBuYW1lID0gc2VsZi4kKCRjb2x1bW5OYW1lc1tpXSkudmFsKClcbiAgICAgIHZhciBleHRyYWN0ID0gc2VsZi4kKCRjb2x1bW5FeHRyYWN0c1tpXSkuaXMoJzpjaGVja2VkJylcbiAgICAgIGNvbHVtbnMucHVzaCh7XG4gICAgICAgIGhlYWRlcjogaGVhZGVyLFxuICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICBleHRyYWN0OiBleHRyYWN0XG4gICAgICB9KVxuICAgIH0pXG5cbiAgICB2YXIgbmV3U2VsZWN0b3IgPSBuZXcgU2VsZWN0b3Ioe1xuICAgICAgaWQ6IGlkLFxuICAgICAgc2VsZWN0b3I6IHNlbGVjdG9yc1NlbGVjdG9yLFxuICAgICAgdGFibGVIZWFkZXJSb3dTZWxlY3RvcjogdGFibGVIZWFkZXJSb3dTZWxlY3RvcixcbiAgICAgIHRhYmxlRGF0YVJvd1NlbGVjdG9yOiB0YWJsZURhdGFSb3dTZWxlY3RvcixcbiAgICAgIGNsaWNrRWxlbWVudFNlbGVjdG9yOiBjbGlja0VsZW1lbnRTZWxlY3RvcixcbiAgICAgIGNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlOiBjbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSxcbiAgICAgIGNsaWNrVHlwZTogY2xpY2tUeXBlLFxuICAgICAgZGlzY2FyZEluaXRpYWxFbGVtZW50czogZGlzY2FyZEluaXRpYWxFbGVtZW50cyxcbiAgICAgIHR5cGU6IHR5cGUsXG4gICAgICBtdWx0aXBsZTogbXVsdGlwbGUsXG4gICAgICBkb3dubG9hZEltYWdlOiBkb3dubG9hZEltYWdlLFxuICAgICAgY2xpY2tQb3B1cDogY2xpY2tQb3B1cCxcbiAgICAgIHJlZ2V4OiByZWdleCxcbiAgICAgIGV4dHJhY3RBdHRyaWJ1dGU6IGV4dHJhY3RBdHRyaWJ1dGUsXG4gICAgICBwYXJlbnRTZWxlY3RvcnM6IHBhcmVudFNlbGVjdG9ycyxcbiAgICAgIGNvbHVtbnM6IGNvbHVtbnMsXG4gICAgICBkZWxheTogZGVsYXlcbiAgICB9LCB7XG4gICAgICAkOiB0aGlzLiRcbiAgICB9KVxuICAgIHJldHVybiBuZXdTZWxlY3RvclxuICB9LFxuXHQvKipcblx0ICogQHJldHVybnMge1NpdGVtYXB8Kn0gQ2xvbmVkIFNpdGVtYXAgd2l0aCBjdXJyZW50bHkgZWRpdGVkIHNlbGVjdG9yXG5cdCAqL1xuICBnZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvclNpdGVtYXA6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXAuY2xvbmUoKVxuICAgIHZhciBzZWxlY3RvciA9IHNpdGVtYXAuZ2V0U2VsZWN0b3JCeUlkKHRoaXMuc3RhdGUuY3VycmVudFNlbGVjdG9yLmlkKVxuICAgIHZhciBuZXdTZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3IoKVxuICAgIHNpdGVtYXAudXBkYXRlU2VsZWN0b3Ioc2VsZWN0b3IsIG5ld1NlbGVjdG9yKVxuICAgIHJldHVybiBzaXRlbWFwXG4gIH0sXG4gIGNhbmNlbFNlbGVjdG9yRWRpdGluZzogZnVuY3Rpb24gKGJ1dHRvbikge1xuXHRcdC8vIGNhbmNlbCBwb3NzaWJsZSBlbGVtZW50IHNlbGVjdGlvblxuICAgIHRoaXMuY29udGVudFNjcmlwdC5yZW1vdmVDdXJyZW50Q29udGVudFNlbGVjdG9yKCkuZG9uZShmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLnNob3dTaXRlbWFwU2VsZWN0b3JMaXN0KClcbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG4gIGFkZFNlbGVjdG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHBhcmVudFNlbGVjdG9ySWQgPSB0aGlzLnN0YXRlLmN1cnJlbnRQYXJlbnRTZWxlY3RvcklkXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG5cbiAgICB2YXIgc2VsZWN0b3IgPSBuZXcgU2VsZWN0b3Ioe1xuICAgICAgcGFyZW50U2VsZWN0b3JzOiBbcGFyZW50U2VsZWN0b3JJZF0sXG4gICAgICB0eXBlOiAnU2VsZWN0b3JUZXh0JyxcbiAgICAgIG11bHRpcGxlOiBmYWxzZVxuICAgIH0sIHskOiB0aGlzLiR9KVxuXG4gICAgdGhpcy5fZWRpdFNlbGVjdG9yKHNlbGVjdG9yLCBzaXRlbWFwKVxuICB9LFxuICBkZWxldGVTZWxlY3RvcjogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcFxuICAgIHZhciBzZWxlY3RvciA9IHRoaXMuJChidXR0b24pLmNsb3Nlc3QoJ3RyJykuZGF0YSgnc2VsZWN0b3InKVxuICAgIHNpdGVtYXAuZGVsZXRlU2VsZWN0b3Ioc2VsZWN0b3IpXG5cbiAgICB0aGlzLnN0b3JlLnNhdmVTaXRlbWFwKHNpdGVtYXAsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuc2hvd1NpdGVtYXBTZWxlY3Rvckxpc3QoKVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcbiAgZGVsZXRlU2l0ZW1hcDogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciBzaXRlbWFwID0gdGhpcy4kKGJ1dHRvbikuY2xvc2VzdCgndHInKS5kYXRhKCdzaXRlbWFwJylcbiAgICB2YXIgY29udHJvbGxlciA9IHRoaXNcbiAgICB0aGlzLnN0b3JlLmRlbGV0ZVNpdGVtYXAoc2l0ZW1hcCwgZnVuY3Rpb24gKCkge1xuICAgICAgY29udHJvbGxlci5zaG93U2l0ZW1hcHMoKVxuICAgIH0pXG4gIH0sXG4gIGluaXRTY3JhcGVTaXRlbWFwQ29uZmlnVmFsaWRhdGlvbjogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJCgnI3ZpZXdwb3J0IGZvcm0nKS5ib290c3RyYXBWYWxpZGF0b3Ioe1xuICAgICAgZmllbGRzOiB7XG4gICAgICAgICdyZXF1ZXN0SW50ZXJ2YWwnOiB7XG4gICAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgICAgbm90RW1wdHk6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSByZXF1ZXN0IGludGVydmFsIGlzIHJlcXVpcmVkIGFuZCBjYW5ub3QgYmUgZW1wdHknXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbnVtZXJpYzoge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnVGhlIHJlcXVlc3QgaW50ZXJ2YWwgbXVzdCBiZSBudW1lcmljJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNhbGxiYWNrOiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgcmVxdWVzdCBpbnRlcnZhbCBtdXN0IGJlIGF0bGVhc3QgMjAwMCBtaWxsaXNlY29uZHMnLFxuICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKHZhbHVlLCB2YWxpZGF0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUgPj0gMjAwMFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAncGFnZUxvYWREZWxheSc6IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBub3RFbXB0eToge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnVGhlIHBhZ2UgbG9hZCBkZWxheSBpcyByZXF1aXJlZCBhbmQgY2Fubm90IGJlIGVtcHR5J1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG51bWVyaWM6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSBwYWdlIGxhb2QgZGVsYXkgbXVzdCBiZSBudW1lcmljJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNhbGxiYWNrOiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgcGFnZSBsb2FkIGRlbGF5IG11c3QgYmUgYXRsZWFzdCA1MDAgbWlsbGlzZWNvbmRzJyxcbiAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICh2YWx1ZSwgdmFsaWRhdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlID49IDUwMFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgfSxcbiAgc2hvd1NjcmFwZVNpdGVtYXBDb25maWdQYW5lbDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2V0QWN0aXZlTmF2aWdhdGlvbkJ1dHRvbignc2l0ZW1hcC1zY3JhcGUnKVxuICAgIHZhciBzY3JhcGVDb25maWdQYW5lbCA9IGljaC5TaXRlbWFwU2NyYXBlQ29uZmlnKClcbiAgICB0aGlzLiQoJyN2aWV3cG9ydCcpLmh0bWwoc2NyYXBlQ29uZmlnUGFuZWwpXG4gICAgdGhpcy5pbml0U2NyYXBlU2l0ZW1hcENvbmZpZ1ZhbGlkYXRpb24oKVxuICAgIHJldHVybiB0cnVlXG4gIH0sXG4gIHNjcmFwZVNpdGVtYXA6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuaXNWYWxpZEZvcm0oKSkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG4gICAgdmFyIHJlcXVlc3RJbnRlcnZhbCA9IHRoaXMuJCgnaW5wdXRbbmFtZT1yZXF1ZXN0SW50ZXJ2YWxdJykudmFsKClcbiAgICB2YXIgcGFnZUxvYWREZWxheSA9IHRoaXMuJCgnaW5wdXRbbmFtZT1wYWdlTG9hZERlbGF5XScpLnZhbCgpXG5cbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICB2YXIgcmVxdWVzdCA9IHtcbiAgICAgIHNjcmFwZVNpdGVtYXA6IHRydWUsXG4gICAgICBzaXRlbWFwOiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHNpdGVtYXApKSxcbiAgICAgIHJlcXVlc3RJbnRlcnZhbDogcmVxdWVzdEludGVydmFsLFxuICAgICAgcGFnZUxvYWREZWxheTogcGFnZUxvYWREZWxheVxuICAgIH1cblxuXHRcdC8vIHNob3cgc2l0ZW1hcCBzY3JhcGluZyBwYW5lbFxuICAgIHRoaXMuZ2V0Rm9ybVZhbGlkYXRvcigpLmRlc3Ryb3koKVxuICAgIHRoaXMuJCgnLnNjcmFwaW5nLWluLXByb2dyZXNzJykucmVtb3ZlQ2xhc3MoJ2hpZGUnKVxuICAgIHRoaXMuJCgnI3N1Ym1pdC1zY3JhcGUtc2l0ZW1hcCcpLmNsb3Nlc3QoJy5mb3JtLWdyb3VwJykuaGlkZSgpXG4gICAgdGhpcy4kKCcjc2NyYXBlLXNpdGVtYXAtY29uZmlnIGlucHV0JykucHJvcCgnZGlzYWJsZWQnLCB0cnVlKVxuXG4gICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UocmVxdWVzdCwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICB0aGlzLmJyb3dzZVNpdGVtYXBEYXRhKClcbiAgICB9LmJpbmQodGhpcykpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHNpdGVtYXBMaXN0QnJvd3NlU2l0ZW1hcERhdGE6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuJChidXR0b24pLmNsb3Nlc3QoJ3RyJykuZGF0YSgnc2l0ZW1hcCcpXG4gICAgdGhpcy5zZXRTdGF0ZUVkaXRTaXRlbWFwKHNpdGVtYXApXG4gICAgdGhpcy5icm93c2VTaXRlbWFwRGF0YSgpXG4gIH0sXG4gIGJyb3dzZVNpdGVtYXBEYXRhOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zZXRBY3RpdmVOYXZpZ2F0aW9uQnV0dG9uKCdzaXRlbWFwLWJyb3dzZScpXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgdGhpcy5zdG9yZS5nZXRTaXRlbWFwRGF0YShzaXRlbWFwLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgdmFyIGRhdGFDb2x1bW5zID0gc2l0ZW1hcC5nZXREYXRhQ29sdW1ucygpXG5cbiAgICAgIHZhciBkYXRhUGFuZWwgPSBpY2guU2l0ZW1hcEJyb3dzZURhdGEoe1xuICAgICAgICBjb2x1bW5zOiBkYXRhQ29sdW1uc1xuICAgICAgfSlcbiAgICAgIHRoaXMuJCgnI3ZpZXdwb3J0JykuaHRtbChkYXRhUGFuZWwpXG5cblx0XHRcdC8vIGRpc3BsYXkgZGF0YVxuXHRcdFx0Ly8gRG9pbmcgdGhpcyB0aGUgbG9uZyB3YXkgc28gdGhlcmUgYXJlbid0IHhzcyB2dWxuZXJ1YmlsaXRlc1xuXHRcdFx0Ly8gd2hpbGUgd29ya2luZyB3aXRoIGRhdGEgb3Igd2l0aCB0aGUgc2VsZWN0b3IgdGl0bGVzXG4gICAgICB2YXIgJHRib2R5ID0gdGhpcy4kKCcjc2l0ZW1hcC1kYXRhIHRib2R5JylcbiAgICAgIHZhciBzZWxmID0gdGhpc1xuICAgICAgZGF0YS5mb3JFYWNoKGZ1bmN0aW9uIChyb3cpIHtcbiAgICAgICAgdmFyICR0ciA9IHNlbGYuJCgnPHRyPjwvdHI+JylcbiAgICAgICAgZGF0YUNvbHVtbnMuZm9yRWFjaChmdW5jdGlvbiAoY29sdW1uKSB7XG4gICAgICAgICAgdmFyICR0ZCA9IHNlbGYuJCgnPHRkPjwvdGQ+JylcbiAgICAgICAgICB2YXIgY2VsbERhdGEgPSByb3dbY29sdW1uXVxuICAgICAgICAgIGlmICh0eXBlb2YgY2VsbERhdGEgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBjZWxsRGF0YSA9IEpTT04uc3RyaW5naWZ5KGNlbGxEYXRhKVxuICAgICAgICAgIH1cbiAgICAgICAgICAkdGQudGV4dChjZWxsRGF0YSlcbiAgICAgICAgICAkdHIuYXBwZW5kKCR0ZClcbiAgICAgICAgfSlcbiAgICAgICAgJHRib2R5LmFwcGVuZCgkdHIpXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIHNob3dTaXRlbWFwRXhwb3J0RGF0YUNzdlBhbmVsOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zZXRBY3RpdmVOYXZpZ2F0aW9uQnV0dG9uKCdzaXRlbWFwLWV4cG9ydC1kYXRhLWNzdicpXG5cbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICB2YXIgZXhwb3J0UGFuZWwgPSBpY2guU2l0ZW1hcEV4cG9ydERhdGFDU1Yoc2l0ZW1hcClcbiAgICB0aGlzLiQoJyN2aWV3cG9ydCcpLmh0bWwoZXhwb3J0UGFuZWwpXG5cblx0XHQvLyBnZW5lcmF0ZSBkYXRhXG4gICAgdGhpcy4kKCcuZG93bmxvYWQtYnV0dG9uJykuaGlkZSgpXG4gICAgdGhpcy5zdG9yZS5nZXRTaXRlbWFwRGF0YShzaXRlbWFwLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgdmFyIGJsb2IgPSBzaXRlbWFwLmdldERhdGFFeHBvcnRDc3ZCbG9iKGRhdGEpXG4gICAgICB0aGlzLiQoJy5kb3dubG9hZC1idXR0b24gYScpLmF0dHIoJ2hyZWYnLCB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKSlcbiAgICAgIHRoaXMuJCgnLmRvd25sb2FkLWJ1dHRvbiBhJykuYXR0cignZG93bmxvYWQnLCBzaXRlbWFwLl9pZCArICcuY3N2JylcbiAgICAgIHRoaXMuJCgnLmRvd25sb2FkLWJ1dHRvbicpLnNob3coKVxuICAgIH0pXG5cbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIHNlbGVjdFNlbGVjdG9yOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICB2YXIgaW5wdXQgPSAkKGJ1dHRvbikuY2xvc2VzdCgnLmZvcm0tZ3JvdXAnKS5maW5kKCdpbnB1dC5zZWxlY3Rvci12YWx1ZScpXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yU2l0ZW1hcCgpXG4gICAgdmFyIHNlbGVjdG9yID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvcigpXG4gICAgdmFyIGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzID0gdGhpcy5nZXRDdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcygpXG4gICAgdmFyIHBhcmVudENTU1NlbGVjdG9yID0gc2l0ZW1hcC5zZWxlY3RvcnMuZ2V0UGFyZW50Q1NTU2VsZWN0b3JXaXRoaW5PbmVQYWdlKGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzKVxuXG4gICAgdmFyIGRlZmVycmVkU2VsZWN0b3IgPSB0aGlzLmNvbnRlbnRTY3JpcHQuc2VsZWN0U2VsZWN0b3Ioe1xuICAgICAgcGFyZW50Q1NTU2VsZWN0b3I6IHBhcmVudENTU1NlbGVjdG9yLFxuICAgICAgYWxsb3dlZEVsZW1lbnRzOiBzZWxlY3Rvci5nZXRJdGVtQ1NTU2VsZWN0b3IoKVxuICAgIH0sIHskfSlcblxuICAgIGRlZmVycmVkU2VsZWN0b3IuZG9uZShmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAkKGlucHV0KS52YWwocmVzdWx0LkNTU1NlbGVjdG9yKVxuXG5cdFx0XHQvLyB1cGRhdGUgdmFsaWRhdGlvbiBmb3Igc2VsZWN0b3IgZmllbGRcbiAgICAgIHZhciB2YWxpZGF0b3IgPSB0aGlzLmdldEZvcm1WYWxpZGF0b3IoKVxuICAgICAgdmFsaWRhdG9yLnJldmFsaWRhdGVGaWVsZChpbnB1dClcblxuXHRcdFx0Ly8gQFRPRE8gaG93IGNvdWxkIHRoaXMgYmUgZW5jYXBzdWxhdGVkP1xuXHRcdFx0Ly8gdXBkYXRlIGhlYWRlciByb3csIGRhdGEgcm93IHNlbGVjdG9ycyBhZnRlciBzZWxlY3RpbmcgdGhlIHRhYmxlLiBzZWxlY3RvcnMgYXJlIHVwZGF0ZWQgYmFzZWQgb24gdGFibGVzXG5cdFx0XHQvLyBpbm5lciBodG1sXG4gICAgICBpZiAoc2VsZWN0b3IudHlwZSA9PT0gJ1NlbGVjdG9yVGFibGUnKSB7XG4gICAgICAgIHRoaXMuZ2V0U2VsZWN0b3JIVE1MKCkuZG9uZShmdW5jdGlvbiAoaHRtbCkge1xuICAgICAgICAgIHZhciB0YWJsZUhlYWRlclJvd1NlbGVjdG9yID0gU2VsZWN0b3JUYWJsZS5nZXRUYWJsZUhlYWRlclJvd1NlbGVjdG9yRnJvbVRhYmxlSFRNTChodG1sLCB7JH0pXG4gICAgICAgICAgdmFyIHRhYmxlRGF0YVJvd1NlbGVjdG9yID0gU2VsZWN0b3JUYWJsZS5nZXRUYWJsZURhdGFSb3dTZWxlY3RvckZyb21UYWJsZUhUTUwoaHRtbCwgeyR9KVxuICAgICAgICAgICQoJ2lucHV0W25hbWU9dGFibGVIZWFkZXJSb3dTZWxlY3Rvcl0nKS52YWwodGFibGVIZWFkZXJSb3dTZWxlY3RvcilcbiAgICAgICAgICAkKCdpbnB1dFtuYW1lPXRhYmxlRGF0YVJvd1NlbGVjdG9yXScpLnZhbCh0YWJsZURhdGFSb3dTZWxlY3RvcilcblxuICAgICAgICAgIHZhciBoZWFkZXJDb2x1bW5zID0gU2VsZWN0b3JUYWJsZS5nZXRUYWJsZUhlYWRlckNvbHVtbnNGcm9tSFRNTCh0YWJsZUhlYWRlclJvd1NlbGVjdG9yLCBodG1sLCB7JH0pXG4gICAgICAgICAgdGhpcy5yZW5kZXJUYWJsZUhlYWRlckNvbHVtbnMoaGVhZGVyQ29sdW1ucylcbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcblxuICBnZXRDdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkczogZnVuY3Rpb24gKCkge1xuICAgIHZhciBwYXJlbnRTZWxlY3RvcklkcyA9IHRoaXMuc3RhdGUuZWRpdFNpdGVtYXBCcmVhZGN1bWJzU2VsZWN0b3JzLm1hcChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgIHJldHVybiBzZWxlY3Rvci5pZFxuICAgIH0pXG5cbiAgICByZXR1cm4gcGFyZW50U2VsZWN0b3JJZHNcbiAgfSxcblxuICBzZWxlY3RUYWJsZUhlYWRlclJvd1NlbGVjdG9yOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICB2YXIgaW5wdXQgPSAkKGJ1dHRvbikuY2xvc2VzdCgnLmZvcm0tZ3JvdXAnKS5maW5kKCdpbnB1dC5zZWxlY3Rvci12YWx1ZScpXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yU2l0ZW1hcCgpXG4gICAgdmFyIHNlbGVjdG9yID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvcigpXG4gICAgdmFyIGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzID0gdGhpcy5nZXRDdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcygpXG4gICAgdmFyIHBhcmVudENTU1NlbGVjdG9yID0gc2l0ZW1hcC5zZWxlY3RvcnMuZ2V0Q1NTU2VsZWN0b3JXaXRoaW5PbmVQYWdlKHNlbGVjdG9yLmlkLCBjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcylcblxuICAgIHZhciBkZWZlcnJlZFNlbGVjdG9yID0gdGhpcy5jb250ZW50U2NyaXB0LnNlbGVjdFNlbGVjdG9yKHtcbiAgICAgIHBhcmVudENTU1NlbGVjdG9yOiBwYXJlbnRDU1NTZWxlY3RvcixcbiAgICAgIGFsbG93ZWRFbGVtZW50czogJ3RyJ1xuICAgIH0sIHskfSlcblxuICAgIGRlZmVycmVkU2VsZWN0b3IuZG9uZShmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICB2YXIgdGFibGVIZWFkZXJSb3dTZWxlY3RvciA9IHJlc3VsdC5DU1NTZWxlY3RvclxuICAgICAgJChpbnB1dCkudmFsKHRhYmxlSGVhZGVyUm93U2VsZWN0b3IpXG5cbiAgICAgIHRoaXMuZ2V0U2VsZWN0b3JIVE1MKCkuZG9uZShmdW5jdGlvbiAoaHRtbCkge1xuICAgICAgICB2YXIgaGVhZGVyQ29sdW1ucyA9IFNlbGVjdG9yVGFibGUuZ2V0VGFibGVIZWFkZXJDb2x1bW5zRnJvbUhUTUwodGFibGVIZWFkZXJSb3dTZWxlY3RvciwgaHRtbCwgeyR9KVxuICAgICAgICB0aGlzLnJlbmRlclRhYmxlSGVhZGVyQ29sdW1ucyhoZWFkZXJDb2x1bW5zKVxuICAgICAgfS5iaW5kKHRoaXMpKVxuXG5cdFx0XHQvLyB1cGRhdGUgdmFsaWRhdGlvbiBmb3Igc2VsZWN0b3IgZmllbGRcbiAgICAgIHZhciB2YWxpZGF0b3IgPSB0aGlzLmdldEZvcm1WYWxpZGF0b3IoKVxuICAgICAgdmFsaWRhdG9yLnJldmFsaWRhdGVGaWVsZChpbnB1dClcbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG5cbiAgc2VsZWN0VGFibGVEYXRhUm93U2VsZWN0b3I6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIHZhciBpbnB1dCA9IHRoaXMuJChidXR0b24pLmNsb3Nlc3QoJy5mb3JtLWdyb3VwJykuZmluZCgnaW5wdXQuc2VsZWN0b3ItdmFsdWUnKVxuICAgIHZhciBzaXRlbWFwID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvclNpdGVtYXAoKVxuICAgIHZhciBzZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3IoKVxuICAgIHZhciBjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcyA9IHRoaXMuZ2V0Q3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMoKVxuICAgIHZhciBwYXJlbnRDU1NTZWxlY3RvciA9IHNpdGVtYXAuc2VsZWN0b3JzLmdldENTU1NlbGVjdG9yV2l0aGluT25lUGFnZShzZWxlY3Rvci5pZCwgY3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMpXG5cbiAgICB2YXIgZGVmZXJyZWRTZWxlY3RvciA9IHRoaXMuY29udGVudFNjcmlwdC5zZWxlY3RTZWxlY3Rvcih7XG4gICAgICBwYXJlbnRDU1NTZWxlY3RvcjogcGFyZW50Q1NTU2VsZWN0b3IsXG4gICAgICBhbGxvd2VkRWxlbWVudHM6ICd0cidcbiAgICB9LCB7JH0pXG5cbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICBkZWZlcnJlZFNlbGVjdG9yLmRvbmUoZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgc2VsZi4kKGlucHV0KS52YWwocmVzdWx0LkNTU1NlbGVjdG9yKVxuXG5cdFx0XHQvLyB1cGRhdGUgdmFsaWRhdGlvbiBmb3Igc2VsZWN0b3IgZmllbGRcbiAgICAgIHZhciB2YWxpZGF0b3IgPSB0aGlzLmdldEZvcm1WYWxpZGF0b3IoKVxuICAgICAgdmFsaWRhdG9yLnJldmFsaWRhdGVGaWVsZChpbnB1dClcbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG5cblx0LyoqXG5cdCAqIHVwZGF0ZSB0YWJsZSBzZWxlY3RvciBjb2x1bW4gZWRpdGluZyBmaWVsZHNcblx0ICovXG4gIHJlbmRlclRhYmxlSGVhZGVyQ29sdW1uczogZnVuY3Rpb24gKGhlYWRlckNvbHVtbnMpIHtcblx0XHQvLyByZXNldCBwcmV2aW91cyBjb2x1bW5zXG4gICAgdmFyICR0Ym9keSA9IHRoaXMuJCgnLmZlYXR1cmUtY29sdW1ucyB0YWJsZSB0Ym9keScpXG4gICAgJHRib2R5Lmh0bWwoJycpXG4gICAgaGVhZGVyQ29sdW1ucy5mb3JFYWNoKGZ1bmN0aW9uIChjb2x1bW4pIHtcbiAgICAgIHZhciAkcm93ID0gaWNoLlNlbGVjdG9yRWRpdFRhYmxlQ29sdW1uKGNvbHVtbilcbiAgICAgICR0Ym9keS5hcHBlbmQoJHJvdylcbiAgICB9KVxuICB9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIEhUTUwgdGhhdCB0aGUgY3VycmVudCBzZWxlY3RvciB3b3VsZCBzZWxlY3Rcblx0ICovXG4gIGdldFNlbGVjdG9ySFRNTDogZnVuY3Rpb24gKCkge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yU2l0ZW1hcCgpXG4gICAgdmFyIHNlbGVjdG9yID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvcigpXG4gICAgdmFyIGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzID0gdGhpcy5nZXRDdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcygpXG4gICAgdmFyIENTU1NlbGVjdG9yID0gc2l0ZW1hcC5zZWxlY3RvcnMuZ2V0Q1NTU2VsZWN0b3JXaXRoaW5PbmVQYWdlKHNlbGVjdG9yLmlkLCBjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcylcbiAgICB2YXIgZGVmZXJyZWRIVE1MID0gdGhpcy5jb250ZW50U2NyaXB0LmdldEhUTUwoe0NTU1NlbGVjdG9yOiBDU1NTZWxlY3Rvcn0sIHskfSlcblxuICAgIHJldHVybiBkZWZlcnJlZEhUTUxcbiAgfSxcbiAgcHJldmlld1NlbGVjdG9yOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICBpZiAoISQoYnV0dG9uKS5oYXNDbGFzcygncHJldmlldycpKSB7XG4gICAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3JTaXRlbWFwKClcbiAgICAgIHZhciBzZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3IoKVxuICAgICAgdmFyIGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzID0gdGhpcy5nZXRDdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcygpXG4gICAgICB2YXIgcGFyZW50Q1NTU2VsZWN0b3IgPSBzaXRlbWFwLnNlbGVjdG9ycy5nZXRQYXJlbnRDU1NTZWxlY3RvcldpdGhpbk9uZVBhZ2UoY3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMpXG4gICAgICB2YXIgZGVmZXJyZWRTZWxlY3RvclByZXZpZXcgPSB0aGlzLmNvbnRlbnRTY3JpcHQucHJldmlld1NlbGVjdG9yKHtcbiAgICAgICAgcGFyZW50Q1NTU2VsZWN0b3I6IHBhcmVudENTU1NlbGVjdG9yLFxuICAgICAgICBlbGVtZW50Q1NTU2VsZWN0b3I6IHNlbGVjdG9yLnNlbGVjdG9yXG4gICAgICB9LCB7JH0pXG5cbiAgICAgIGRlZmVycmVkU2VsZWN0b3JQcmV2aWV3LmRvbmUoZnVuY3Rpb24gKCkge1xuICAgICAgICAkKGJ1dHRvbikuYWRkQ2xhc3MoJ3ByZXZpZXcnKVxuICAgICAgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jb250ZW50U2NyaXB0LnJlbW92ZUN1cnJlbnRDb250ZW50U2VsZWN0b3IoKVxuICAgICAgJChidXR0b24pLnJlbW92ZUNsYXNzKCdwcmV2aWV3JylcbiAgICB9XG4gIH0sXG4gIHByZXZpZXdDbGlja0VsZW1lbnRTZWxlY3RvcjogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgaWYgKCEkKGJ1dHRvbikuaGFzQ2xhc3MoJ3ByZXZpZXcnKSkge1xuICAgICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgICB2YXIgc2VsZWN0b3IgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yKClcbiAgICAgIHZhciBjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcyA9IHRoaXMuZ2V0Q3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMoKVxuICAgICAgdmFyIHBhcmVudENTU1NlbGVjdG9yID0gc2l0ZW1hcC5zZWxlY3RvcnMuZ2V0UGFyZW50Q1NTU2VsZWN0b3JXaXRoaW5PbmVQYWdlKGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzKVxuXG4gICAgICB2YXIgZGVmZXJyZWRTZWxlY3RvclByZXZpZXcgPSB0aGlzLmNvbnRlbnRTY3JpcHQucHJldmlld1NlbGVjdG9yKHtcbiAgICAgICAgcGFyZW50Q1NTU2VsZWN0b3I6IHBhcmVudENTU1NlbGVjdG9yLFxuICAgICAgICBlbGVtZW50Q1NTU2VsZWN0b3I6IHNlbGVjdG9yLmNsaWNrRWxlbWVudFNlbGVjdG9yXG4gICAgICB9LCB7JH0pXG5cbiAgICAgIGRlZmVycmVkU2VsZWN0b3JQcmV2aWV3LmRvbmUoZnVuY3Rpb24gKCkge1xuICAgICAgICAkKGJ1dHRvbikuYWRkQ2xhc3MoJ3ByZXZpZXcnKVxuICAgICAgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jb250ZW50U2NyaXB0LnJlbW92ZUN1cnJlbnRDb250ZW50U2VsZWN0b3IoKVxuICAgICAgJChidXR0b24pLnJlbW92ZUNsYXNzKCdwcmV2aWV3JylcbiAgICB9XG4gIH0sXG4gIHByZXZpZXdUYWJsZVJvd1NlbGVjdG9yOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICBpZiAoISQoYnV0dG9uKS5oYXNDbGFzcygncHJldmlldycpKSB7XG4gICAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3JTaXRlbWFwKClcbiAgICAgIHZhciBzZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3IoKVxuICAgICAgdmFyIGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzID0gdGhpcy5nZXRDdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcygpXG4gICAgICB2YXIgcGFyZW50Q1NTU2VsZWN0b3IgPSBzaXRlbWFwLnNlbGVjdG9ycy5nZXRDU1NTZWxlY3RvcldpdGhpbk9uZVBhZ2Uoc2VsZWN0b3IuaWQsIGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzKVxuICAgICAgdmFyIHJvd1NlbGVjdG9yID0gJChidXR0b24pLmNsb3Nlc3QoJy5mb3JtLWdyb3VwJykuZmluZCgnaW5wdXQnKS52YWwoKVxuXG4gICAgICB2YXIgZGVmZXJyZWRTZWxlY3RvclByZXZpZXcgPSB0aGlzLmNvbnRlbnRTY3JpcHQucHJldmlld1NlbGVjdG9yKHtcbiAgICAgICAgcGFyZW50Q1NTU2VsZWN0b3I6IHBhcmVudENTU1NlbGVjdG9yLFxuICAgICAgICBlbGVtZW50Q1NTU2VsZWN0b3I6IHJvd1NlbGVjdG9yXG4gICAgICB9LCB7JH0pXG5cbiAgICAgIGRlZmVycmVkU2VsZWN0b3JQcmV2aWV3LmRvbmUoZnVuY3Rpb24gKCkge1xuICAgICAgICAkKGJ1dHRvbikuYWRkQ2xhc3MoJ3ByZXZpZXcnKVxuICAgICAgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jb250ZW50U2NyaXB0LnJlbW92ZUN1cnJlbnRDb250ZW50U2VsZWN0b3IoKVxuICAgICAgJChidXR0b24pLnJlbW92ZUNsYXNzKCdwcmV2aWV3JylcbiAgICB9XG4gIH0sXG4gIHByZXZpZXdTZWxlY3RvckZyb21TZWxlY3RvclRyZWU6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIGlmICghJChidXR0b24pLmhhc0NsYXNzKCdwcmV2aWV3JykpIHtcbiAgICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcFxuICAgICAgdmFyIHNlbGVjdG9yID0gJChidXR0b24pLmNsb3Nlc3QoJ3RyJykuZGF0YSgnc2VsZWN0b3InKVxuICAgICAgdmFyIGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzID0gdGhpcy5nZXRDdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcygpXG4gICAgICB2YXIgcGFyZW50Q1NTU2VsZWN0b3IgPSBzaXRlbWFwLnNlbGVjdG9ycy5nZXRQYXJlbnRDU1NTZWxlY3RvcldpdGhpbk9uZVBhZ2UoY3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMpXG4gICAgICB2YXIgZGVmZXJyZWRTZWxlY3RvclByZXZpZXcgPSB0aGlzLmNvbnRlbnRTY3JpcHQucHJldmlld1NlbGVjdG9yKHtcbiAgICAgICAgcGFyZW50Q1NTU2VsZWN0b3I6IHBhcmVudENTU1NlbGVjdG9yLFxuICAgICAgICBlbGVtZW50Q1NTU2VsZWN0b3I6IHNlbGVjdG9yLnNlbGVjdG9yXG4gICAgICB9LCB7JH0pXG5cbiAgICAgIGRlZmVycmVkU2VsZWN0b3JQcmV2aWV3LmRvbmUoZnVuY3Rpb24gKCkge1xuICAgICAgICAkKGJ1dHRvbikuYWRkQ2xhc3MoJ3ByZXZpZXcnKVxuICAgICAgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jb250ZW50U2NyaXB0LnJlbW92ZUN1cnJlbnRDb250ZW50U2VsZWN0b3IoKVxuICAgICAgJChidXR0b24pLnJlbW92ZUNsYXNzKCdwcmV2aWV3JylcbiAgICB9XG4gIH0sXG4gIHByZXZpZXdTZWxlY3RvckRhdGFGcm9tU2VsZWN0b3JUcmVlOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgdmFyIHNlbGVjdG9yID0gc2VsZi4kKGJ1dHRvbikuY2xvc2VzdCgndHInKS5kYXRhKCdzZWxlY3RvcicpXG4gICAgdGhpcy5wcmV2aWV3U2VsZWN0b3JEYXRhKHNpdGVtYXAsIHNlbGVjdG9yLmlkKVxuICB9LFxuICBwcmV2aWV3U2VsZWN0b3JEYXRhRnJvbVNlbGVjdG9yRWRpdGluZzogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcC5jbG9uZSgpXG4gICAgdmFyIHNlbGVjdG9yID0gc2l0ZW1hcC5nZXRTZWxlY3RvckJ5SWQodGhpcy5zdGF0ZS5jdXJyZW50U2VsZWN0b3IuaWQpXG4gICAgdmFyIG5ld1NlbGVjdG9yID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvcigpXG4gICAgc2l0ZW1hcC51cGRhdGVTZWxlY3RvcihzZWxlY3RvciwgbmV3U2VsZWN0b3IpXG4gICAgdGhpcy5wcmV2aWV3U2VsZWN0b3JEYXRhKHNpdGVtYXAsIG5ld1NlbGVjdG9yLmlkKVxuICB9LFxuXHQvKipcblx0ICogUmV0dXJucyBhIGxpc3Qgb2Ygc2VsZWN0b3IgaWRzIHRoYXQgdGhlIHVzZXIgaGFzIG9wZW5lZFxuXHQgKiBAcmV0dXJucyB7QXJyYXl9XG5cdCAqL1xuICBnZXRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHBhcmVudFNlbGVjdG9ySWRzID0gW11cbiAgICB0aGlzLnN0YXRlLmVkaXRTaXRlbWFwQnJlYWRjdW1ic1NlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgcGFyZW50U2VsZWN0b3JJZHMucHVzaChzZWxlY3Rvci5pZClcbiAgICB9KVxuICAgIHJldHVybiBwYXJlbnRTZWxlY3Rvcklkc1xuICB9LFxuICBwcmV2aWV3U2VsZWN0b3JEYXRhOiBmdW5jdGlvbiAoc2l0ZW1hcCwgc2VsZWN0b3JJZCkge1xuXHRcdC8vIGRhdGEgcHJldmlldyB3aWxsIGJlIGJhc2Ugb24gaG93IHRoZSBzZWxlY3RvciB0cmVlIGlzIG9wZW5lZFxuICAgIHZhciBwYXJlbnRTZWxlY3RvcklkcyA9IHRoaXMuZ2V0U3RhdGVQYXJlbnRTZWxlY3RvcklkcygpXG5cbiAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgIHZhciByZXF1ZXN0ID0ge1xuICAgICAgcHJldmlld1NlbGVjdG9yRGF0YTogdHJ1ZSxcbiAgICAgIHNpdGVtYXA6IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoc2l0ZW1hcCkpLFxuICAgICAgcGFyZW50U2VsZWN0b3JJZHM6IHBhcmVudFNlbGVjdG9ySWRzLFxuICAgICAgc2VsZWN0b3JJZDogc2VsZWN0b3JJZFxuICAgIH1cbiAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZShyZXF1ZXN0LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgIGlmIChyZXNwb25zZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgZGF0YUNvbHVtbnMgPSBPYmplY3Qua2V5cyhyZXNwb25zZVswXSlcblxuICAgICAgY29uc29sZS5sb2coZGF0YUNvbHVtbnMpXG5cbiAgICAgIHZhciAkZGF0YVByZXZpZXdQYW5lbCA9IGljaC5EYXRhUHJldmlldyh7XG4gICAgICAgIGNvbHVtbnM6IGRhdGFDb2x1bW5zXG4gICAgICB9KVxuICAgICAgc2VsZi4kKCcjdmlld3BvcnQnKS5hcHBlbmQoJGRhdGFQcmV2aWV3UGFuZWwpXG4gICAgICAkZGF0YVByZXZpZXdQYW5lbC5tb2RhbCgnc2hvdycpXG5cdFx0XHQvLyBkaXNwbGF5IGRhdGFcblx0XHRcdC8vIERvaW5nIHRoaXMgdGhlIGxvbmcgd2F5IHNvIHRoZXJlIGFyZW4ndCB4c3MgdnVsbmVydWJpbGl0ZXNcblx0XHRcdC8vIHdoaWxlIHdvcmtpbmcgd2l0aCBkYXRhIG9yIHdpdGggdGhlIHNlbGVjdG9yIHRpdGxlc1xuICAgICAgdmFyICR0Ym9keSA9IHNlbGYuJCgndGJvZHknLCAkZGF0YVByZXZpZXdQYW5lbClcbiAgICAgIHJlc3BvbnNlLmZvckVhY2goZnVuY3Rpb24gKHJvdykge1xuICAgICAgICB2YXIgJHRyID0gc2VsZi4kKCc8dHI+PC90cj4nKVxuICAgICAgICBkYXRhQ29sdW1ucy5mb3JFYWNoKGZ1bmN0aW9uIChjb2x1bW4pIHtcbiAgICAgICAgICB2YXIgJHRkID0gc2VsZi4kKCc8dGQ+PC90ZD4nKVxuICAgICAgICAgIHZhciBjZWxsRGF0YSA9IHJvd1tjb2x1bW5dXG4gICAgICAgICAgaWYgKHR5cGVvZiBjZWxsRGF0YSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGNlbGxEYXRhID0gSlNPTi5zdHJpbmdpZnkoY2VsbERhdGEpXG4gICAgICAgICAgfVxuICAgICAgICAgICR0ZC50ZXh0KGNlbGxEYXRhKVxuICAgICAgICAgICR0ci5hcHBlbmQoJHRkKVxuICAgICAgICB9KVxuICAgICAgICAkdGJvZHkuYXBwZW5kKCR0cilcbiAgICAgIH0pXG5cbiAgICAgIHZhciB3aW5kb3dIZWlnaHQgPSBzZWxmLiQod2luZG93KS5oZWlnaHQoKVxuXG4gICAgICBzZWxmLiQoJy5kYXRhLXByZXZpZXctbW9kYWwgLm1vZGFsLWJvZHknKS5oZWlnaHQod2luZG93SGVpZ2h0IC0gMTMwKVxuXG5cdFx0XHQvLyByZW1vdmUgbW9kYWwgZnJvbSBkb20gYWZ0ZXIgaXQgaXMgY2xvc2VkXG4gICAgICAkZGF0YVByZXZpZXdQYW5lbC5vbignaGlkZGVuLmJzLm1vZGFsJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxmLiQodGhpcykucmVtb3ZlKClcbiAgICAgIH0pXG4gICAgfSlcbiAgfSxcblx0LyoqXG5cdCAqIEFkZCBzdGFydCB1cmwgdG8gc2l0ZW1hcCBjcmVhdGlvbiBvciBlZGl0aW5nIGZvcm1cblx0ICogQHBhcmFtIGJ1dHRvblxuXHQgKi9cbiAgYWRkU3RhcnRVcmw6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICB2YXIgJHN0YXJ0VXJsSW5wdXRGaWVsZCA9IGljaC5TaXRlbWFwU3RhcnRVcmxGaWVsZCgpXG4gICAgc2VsZi4kKCcjdmlld3BvcnQgLnN0YXJ0LXVybC1ibG9jazpsYXN0JykuYWZ0ZXIoJHN0YXJ0VXJsSW5wdXRGaWVsZClcbiAgICB2YXIgdmFsaWRhdG9yID0gdGhpcy5nZXRGb3JtVmFsaWRhdG9yKClcbiAgICB2YWxpZGF0b3IuYWRkRmllbGQoJHN0YXJ0VXJsSW5wdXRGaWVsZC5maW5kKCdpbnB1dCcpKVxuICB9LFxuXHQvKipcblx0ICogUmVtb3ZlIHN0YXJ0IHVybCBmcm9tIHNpdGVtYXAgY3JlYXRpb24gb3IgZWRpdGluZyBmb3JtLlxuXHQgKiBAcGFyYW0gYnV0dG9uXG5cdCAqL1xuICByZW1vdmVTdGFydFVybDogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIHZhciAkYmxvY2sgPSBzZWxmLiQoYnV0dG9uKS5jbG9zZXN0KCcuc3RhcnQtdXJsLWJsb2NrJylcbiAgICBpZiAoc2VsZi4kKCcjdmlld3BvcnQgLnN0YXJ0LXVybC1ibG9jaycpLmxlbmd0aCA+IDEpIHtcblx0XHRcdC8vIHJlbW92ZSBmcm9tIHZhbGlkYXRvclxuICAgICAgdmFyIHZhbGlkYXRvciA9IHRoaXMuZ2V0Rm9ybVZhbGlkYXRvcigpXG4gICAgICB2YWxpZGF0b3IucmVtb3ZlRmllbGQoJGJsb2NrLmZpbmQoJ2lucHV0JykpXG5cbiAgICAgICRibG9jay5yZW1vdmUoKVxuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNpdGVtYXBDb250cm9sbGVyXG4iLCIvKipcbiAqIEVsZW1lbnQgc2VsZWN0b3IuIFVzZXMgalF1ZXJ5IGFzIGJhc2UgYW5kIGFkZHMgc29tZSBtb3JlIGZlYXR1cmVzXG4gKiBAcGFyYW0gQ1NTU2VsZWN0b3JcbiAqIEBwYXJhbSBwYXJlbnRFbGVtZW50XG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG52YXIgRWxlbWVudFF1ZXJ5ID0gZnVuY3Rpb24gKENTU1NlbGVjdG9yLCBwYXJlbnRFbGVtZW50LCBvcHRpb25zKSB7XG4gIENTU1NlbGVjdG9yID0gQ1NTU2VsZWN0b3IgfHwgJydcbiAgdGhpcy4kID0gb3B0aW9ucy4kXG4gIGlmICghdGhpcy4kKSB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcganF1ZXJ5IGZvciBFbGVtZW50UXVlcnknKVxuICB2YXIgc2VsZWN0ZWRFbGVtZW50cyA9IFtdXG5cbiAgdmFyIGFkZEVsZW1lbnQgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgIGlmIChzZWxlY3RlZEVsZW1lbnRzLmluZGV4T2YoZWxlbWVudCkgPT09IC0xKSB7XG4gICAgICBzZWxlY3RlZEVsZW1lbnRzLnB1c2goZWxlbWVudClcbiAgICB9XG4gIH1cblxuICB2YXIgc2VsZWN0b3JQYXJ0cyA9IEVsZW1lbnRRdWVyeS5nZXRTZWxlY3RvclBhcnRzKENTU1NlbGVjdG9yKVxuICB2YXIgc2VsZiA9IHRoaXNcbiAgc2VsZWN0b3JQYXJ0cy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuXHRcdC8vIGhhbmRsZSBzcGVjaWFsIGNhc2Ugd2hlbiBwYXJlbnQgaXMgc2VsZWN0ZWRcbiAgICBpZiAoc2VsZWN0b3IgPT09ICdfcGFyZW50XycpIHtcbiAgICAgIHNlbGYuJChwYXJlbnRFbGVtZW50KS5lYWNoKGZ1bmN0aW9uIChpLCBlbGVtZW50KSB7XG4gICAgICAgIGFkZEVsZW1lbnQoZWxlbWVudClcbiAgICAgIH0pXG4gICAgfVx0XHRlbHNlIHtcbiAgICAgIHZhciBlbGVtZW50cyA9IHNlbGYuJChzZWxlY3Rvciwgc2VsZi4kKHBhcmVudEVsZW1lbnQpKVxuICAgICAgZWxlbWVudHMuZWFjaChmdW5jdGlvbiAoaSwgZWxlbWVudCkge1xuICAgICAgICBhZGRFbGVtZW50KGVsZW1lbnQpXG4gICAgICB9KVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gc2VsZWN0ZWRFbGVtZW50c1xufVxuXG5FbGVtZW50UXVlcnkuZ2V0U2VsZWN0b3JQYXJ0cyA9IGZ1bmN0aW9uIChDU1NTZWxlY3Rvcikge1xuICB2YXIgc2VsZWN0b3JzID0gQ1NTU2VsZWN0b3Iuc3BsaXQoLygsfFwiLio/XCJ8Jy4qPyd8XFwoLio/XFwpKS8pXG5cbiAgdmFyIHJlc3VsdFNlbGVjdG9ycyA9IFtdXG4gIHZhciBjdXJyZW50U2VsZWN0b3IgPSAnJ1xuICBzZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICBpZiAoc2VsZWN0b3IgPT09ICcsJykge1xuICAgICAgaWYgKGN1cnJlbnRTZWxlY3Rvci50cmltKCkubGVuZ3RoKSB7XG4gICAgICAgIHJlc3VsdFNlbGVjdG9ycy5wdXNoKGN1cnJlbnRTZWxlY3Rvci50cmltKCkpXG4gICAgICB9XG4gICAgICBjdXJyZW50U2VsZWN0b3IgPSAnJ1xuICAgIH1cdFx0ZWxzZSB7XG4gICAgICBjdXJyZW50U2VsZWN0b3IgKz0gc2VsZWN0b3JcbiAgICB9XG4gIH0pXG4gIGlmIChjdXJyZW50U2VsZWN0b3IudHJpbSgpLmxlbmd0aCkge1xuICAgIHJlc3VsdFNlbGVjdG9ycy5wdXNoKGN1cnJlbnRTZWxlY3Rvci50cmltKCkpXG4gIH1cblxuICByZXR1cm4gcmVzdWx0U2VsZWN0b3JzXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRWxlbWVudFF1ZXJ5XG4iLCJ2YXIgc2VsZWN0b3JzID0gcmVxdWlyZSgnLi9TZWxlY3RvcnMnKVxudmFyIEVsZW1lbnRRdWVyeSA9IHJlcXVpcmUoJy4vRWxlbWVudFF1ZXJ5JylcbnZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxuXG52YXIgU2VsZWN0b3IgPSBmdW5jdGlvbiAoc2VsZWN0b3IsIG9wdGlvbnMpIHtcbiAgdGhpcy4kID0gb3B0aW9ucy4kXG4gIGlmICghb3B0aW9ucy4kKSB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcganF1ZXJ5JylcblxuICB0aGlzLnVwZGF0ZURhdGEoc2VsZWN0b3IpXG4gIHRoaXMuaW5pdFR5cGUoKVxufVxuXG5TZWxlY3Rvci5wcm90b3R5cGUgPSB7XG5cblx0LyoqXG5cdCAqIElzIHRoaXMgc2VsZWN0b3IgY29uZmlndXJlZCB0byByZXR1cm4gbXVsdGlwbGUgaXRlbXM/XG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHQgKi9cbiAgd2lsbFJldHVybk11bHRpcGxlUmVjb3JkczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmNhblJldHVybk11bHRpcGxlUmVjb3JkcygpICYmIHRoaXMubXVsdGlwbGVcbiAgfSxcblxuXHQvKipcblx0ICogVXBkYXRlIGN1cnJlbnQgc2VsZWN0b3IgY29uZmlndXJhdGlvblxuXHQgKiBAcGFyYW0gZGF0YVxuXHQgKi9cbiAgdXBkYXRlRGF0YTogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICB2YXIgYWxsb3dlZEtleXMgPSBbJ2lkJywgJ3R5cGUnLCAnc2VsZWN0b3InLCAncGFyZW50U2VsZWN0b3JzJ11cbiAgICBjb25zb2xlLmxvZygnZGF0YSB0eXBlJywgZGF0YS50eXBlKVxuICAgIGFsbG93ZWRLZXlzID0gYWxsb3dlZEtleXMuY29uY2F0KHNlbGVjdG9yc1tkYXRhLnR5cGVdLmdldEZlYXR1cmVzKCkpXG4gICAgdmFyIGtleVxuXHRcdC8vIHVwZGF0ZSBkYXRhXG4gICAgZm9yIChrZXkgaW4gZGF0YSkge1xuICAgICAgaWYgKGFsbG93ZWRLZXlzLmluZGV4T2Yoa2V5KSAhPT0gLTEgfHwgdHlwZW9mIGRhdGFba2V5XSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzW2tleV0gPSBkYXRhW2tleV1cbiAgICAgIH1cbiAgICB9XG5cblx0XHQvLyByZW1vdmUgdmFsdWVzIHRoYXQgYXJlIG5vdCBuZWVkZWQgZm9yIHRoaXMgdHlwZSBvZiBzZWxlY3RvclxuICAgIGZvciAoa2V5IGluIHRoaXMpIHtcbiAgICAgIGlmIChhbGxvd2VkS2V5cy5pbmRleE9mKGtleSkgPT09IC0xICYmIHR5cGVvZiB0aGlzW2tleV0gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgZGVsZXRlIHRoaXNba2V5XVxuICAgICAgfVxuICAgIH1cbiAgfSxcblxuXHQvKipcblx0ICogQ1NTIHNlbGVjdG9yIHdoaWNoIHdpbGwgYmUgdXNlZCBmb3IgZWxlbWVudCBzZWxlY3Rpb25cblx0ICogQHJldHVybnMge3N0cmluZ31cblx0ICovXG4gIGdldEl0ZW1DU1NTZWxlY3RvcjogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAnKidcbiAgfSxcblxuXHQvKipcblx0ICogb3ZlcnJpZGUgb2JqZWN0cyBtZXRob2RzIGJhc2VkIG9uIHNlbGV0b3IgdHlwZVxuXHQgKi9cbiAgaW5pdFR5cGU6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoc2VsZWN0b3JzW3RoaXMudHlwZV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdTZWxlY3RvciB0eXBlIG5vdCBkZWZpbmVkICcgKyB0aGlzLnR5cGUpXG4gICAgfVxuXG5cdFx0Ly8gb3ZlcnJpZGVzIG9iamVjdHMgbWV0aG9kc1xuICAgIGZvciAodmFyIGkgaW4gc2VsZWN0b3JzW3RoaXMudHlwZV0pIHtcbiAgICAgIHRoaXNbaV0gPSBzZWxlY3RvcnNbdGhpcy50eXBlXVtpXVxuICAgIH1cbiAgfSxcblxuXHQvKipcblx0ICogQ2hlY2sgd2hldGhlciBhIHNlbGVjdG9yIGlzIGEgcGFyZW4gc2VsZWN0b3Igb2YgdGhpcyBzZWxlY3RvclxuXHQgKiBAcGFyYW0gc2VsZWN0b3JJZFxuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICovXG4gIGhhc1BhcmVudFNlbGVjdG9yOiBmdW5jdGlvbiAoc2VsZWN0b3JJZCkge1xuICAgIHJldHVybiAodGhpcy5wYXJlbnRTZWxlY3RvcnMuaW5kZXhPZihzZWxlY3RvcklkKSAhPT0gLTEpXG4gIH0sXG5cbiAgcmVtb3ZlUGFyZW50U2VsZWN0b3I6IGZ1bmN0aW9uIChzZWxlY3RvcklkKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5wYXJlbnRTZWxlY3RvcnMuaW5kZXhPZihzZWxlY3RvcklkKVxuICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgIHRoaXMucGFyZW50U2VsZWN0b3JzLnNwbGljZShpbmRleCwgMSlcbiAgICB9XG4gIH0sXG5cbiAgcmVuYW1lUGFyZW50U2VsZWN0b3I6IGZ1bmN0aW9uIChvcmlnaW5hbElkLCByZXBsYWNlbWVudElkKSB7XG4gICAgaWYgKHRoaXMuaGFzUGFyZW50U2VsZWN0b3Iob3JpZ2luYWxJZCkpIHtcbiAgICAgIHZhciBwb3MgPSB0aGlzLnBhcmVudFNlbGVjdG9ycy5pbmRleE9mKG9yaWdpbmFsSWQpXG4gICAgICB0aGlzLnBhcmVudFNlbGVjdG9ycy5zcGxpY2UocG9zLCAxLCByZXBsYWNlbWVudElkKVxuICAgIH1cbiAgfSxcblxuICBnZXREYXRhRWxlbWVudHM6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICB2YXIgZWxlbWVudHMgPSBFbGVtZW50UXVlcnkodGhpcy5zZWxlY3RvciwgcGFyZW50RWxlbWVudCwgeyR9KVxuICAgIGlmICh0aGlzLm11bHRpcGxlKSB7XG4gICAgICByZXR1cm4gZWxlbWVudHNcbiAgICB9IGVsc2UgaWYgKGVsZW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiBbZWxlbWVudHNbMF1dXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBbXVxuICAgIH1cbiAgfSxcblxuICBnZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBkID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgdGltZW91dCA9IHRoaXMuZGVsYXkgfHwgMFxuXG5cdFx0Ly8gdGhpcyB3b3JrcyBtdWNoIGZhc3RlciBiZWNhdXNlIHdoZW5DYWxsU2VxdWVudGFsbHkgaXNuJ3QgcnVubmluZyBuZXh0IGRhdGEgZXh0cmFjdGlvbiBpbW1lZGlhdGVseVxuICAgIGlmICh0aW1lb3V0ID09PSAwKSB7XG4gICAgICB2YXIgZGVmZXJyZWREYXRhID0gdGhpcy5fZ2V0RGF0YShwYXJlbnRFbGVtZW50KVxuICAgICAgZGVmZXJyZWREYXRhLmRvbmUoZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgZC5yZXNvbHZlKGRhdGEpXG4gICAgICB9KVxuICAgIH1cdFx0ZWxzZSB7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRlZmVycmVkRGF0YSA9IHRoaXMuX2dldERhdGEocGFyZW50RWxlbWVudClcbiAgICAgICAgZGVmZXJyZWREYXRhLmRvbmUoZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICBkLnJlc29sdmUoZGF0YSlcbiAgICAgICAgfSlcbiAgICAgIH0uYmluZCh0aGlzKSwgdGltZW91dClcbiAgICB9XG5cbiAgICByZXR1cm4gZC5wcm9taXNlKClcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcblxudmFyIFNlbGVjdG9yRWxlbWVudCA9IHtcblxuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkNyZWF0ZU5ld0pvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuICAgIGRmZC5yZXNvbHZlKHRoaXMuJC5tYWtlQXJyYXkoZWxlbWVudHMpKVxuXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbXVxuICB9LFxuXG4gIGdldEZlYXR1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFsnbXVsdGlwbGUnLCAnZGVsYXknXVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JFbGVtZW50XG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciBTZWxlY3RvckVsZW1lbnRBdHRyaWJ1dGUgPSB7XG4gIGNhblJldHVybk11bHRpcGxlUmVjb3JkczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUNoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZGZkID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuXG4gICAgdmFyIHJlc3VsdCA9IFtdXG4gICAgc2VsZi4kKGVsZW1lbnRzKS5lYWNoKGZ1bmN0aW9uIChrLCBlbGVtZW50KSB7XG4gICAgICB2YXIgZGF0YSA9IHt9XG5cbiAgICAgIGRhdGFbdGhpcy5pZF0gPSBzZWxmLiQoZWxlbWVudCkuYXR0cih0aGlzLmV4dHJhY3RBdHRyaWJ1dGUpXG4gICAgICByZXN1bHQucHVzaChkYXRhKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIGlmICh0aGlzLm11bHRpcGxlID09PSBmYWxzZSAmJiBlbGVtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHZhciBkYXRhID0ge31cbiAgICAgIGRhdGFbdGhpcy5pZCArICctc3JjJ10gPSBudWxsXG4gICAgICByZXN1bHQucHVzaChkYXRhKVxuICAgIH1cbiAgICBkZmQucmVzb2x2ZShyZXN1bHQpXG5cbiAgICByZXR1cm4gZGZkLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFt0aGlzLmlkXVxuICB9LFxuXG4gIGdldEZlYXR1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFsnbXVsdGlwbGUnLCAnZXh0cmFjdEF0dHJpYnV0ZScsICdkZWxheSddXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvckVsZW1lbnRBdHRyaWJ1dGVcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxudmFyIFVuaXF1ZUVsZW1lbnRMaXN0ID0gcmVxdWlyZSgnLi8uLi9VbmlxdWVFbGVtZW50TGlzdCcpXG52YXIgRWxlbWVudFF1ZXJ5ID0gcmVxdWlyZSgnLi8uLi9FbGVtZW50UXVlcnknKVxudmFyIENzc1NlbGVjdG9yID0gcmVxdWlyZSgnY3NzLXNlbGVjdG9yJykuQ3NzU2VsZWN0b3JcbnZhciBTZWxlY3RvckVsZW1lbnRDbGljayA9IHtcblxuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkNyZWF0ZU5ld0pvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBnZXRDbGlja0VsZW1lbnRzOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIGNsaWNrRWxlbWVudHMgPSBFbGVtZW50UXVlcnkodGhpcy5jbGlja0VsZW1lbnRTZWxlY3RvciwgcGFyZW50RWxlbWVudCwgeyR9KVxuICAgIHJldHVybiBjbGlja0VsZW1lbnRzXG4gIH0sXG5cblx0LyoqXG5cdCAqIENoZWNrIHdoZXRoZXIgZWxlbWVudCBpcyBzdGlsbCByZWFjaGFibGUgZnJvbSBodG1sLiBVc2VmdWwgdG8gY2hlY2sgd2hldGhlciB0aGUgZWxlbWVudCBpcyByZW1vdmVkIGZyb20gRE9NLlxuXHQgKiBAcGFyYW0gZWxlbWVudFxuXHQgKi9cbiAgaXNFbGVtZW50SW5IVE1MOiBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgIHJldHVybiB0aGlzLiQoZWxlbWVudCkuY2xvc2VzdCgnaHRtbCcpLmxlbmd0aCAhPT0gMFxuICB9LFxuXG4gIHRyaWdnZXJCdXR0b25DbGljazogZnVuY3Rpb24gKGNsaWNrRWxlbWVudCkge1xuICAgIHZhciBjcyA9IG5ldyBDc3NTZWxlY3Rvcih7XG4gICAgICBlbmFibGVTbWFydFRhYmxlU2VsZWN0b3I6IGZhbHNlLFxuICAgICAgcGFyZW50OiB0aGlzLiQoJ2JvZHknKVswXSxcbiAgICAgIGVuYWJsZVJlc3VsdFN0cmlwcGluZzogZmFsc2VcbiAgICB9KVxuICAgIHZhciBjc3NTZWxlY3RvciA9IGNzLmdldENzc1NlbGVjdG9yKFtjbGlja0VsZW1lbnRdKVxuXG5cdFx0Ly8gdGhpcyBmdW5jdGlvbiB3aWxsIGNhdGNoIHdpbmRvdy5vcGVuIGNhbGwgYW5kIHBsYWNlIHRoZSByZXF1ZXN0ZWQgdXJsIGFzIHRoZSBlbGVtZW50cyBkYXRhIGF0dHJpYnV0ZVxuICAgIHZhciBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKVxuICAgIHNjcmlwdC50eXBlID0gJ3RleHQvamF2YXNjcmlwdCdcbiAgICBzY3JpcHQudGV4dCA9ICcnICtcblx0XHRcdCcoZnVuY3Rpb24oKXsgJyArXG5cdFx0XHRcInZhciBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ1wiICsgY3NzU2VsZWN0b3IgKyBcIicpWzBdOyBcIiArXG5cdFx0XHQnZWwuY2xpY2soKTsgJyArXG5cdFx0XHQnfSkoKTsnXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzY3JpcHQpXG4gIH0sXG5cbiAgZ2V0Q2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGU6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gJ3VuaXF1ZVRleHQnXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLmNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlXG4gICAgfVxuICB9LFxuXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIGRlbGF5ID0gcGFyc2VJbnQodGhpcy5kZWxheSkgfHwgMFxuICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgZm91bmRFbGVtZW50cyA9IG5ldyBVbmlxdWVFbGVtZW50TGlzdCgndW5pcXVlVGV4dCcsIHskfSlcbiAgICB2YXIgY2xpY2tFbGVtZW50cyA9IHRoaXMuZ2V0Q2xpY2tFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuICAgIHZhciBkb25lQ2xpY2tpbmdFbGVtZW50cyA9IG5ldyBVbmlxdWVFbGVtZW50TGlzdCh0aGlzLmdldENsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlKCksIHskfSlcblxuXHRcdC8vIGFkZCBlbGVtZW50cyB0aGF0IGFyZSBhdmFpbGFibGUgYmVmb3JlIGNsaWNraW5nXG4gICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcbiAgICBlbGVtZW50cy5mb3JFYWNoKGZvdW5kRWxlbWVudHMucHVzaC5iaW5kKGZvdW5kRWxlbWVudHMpKVxuXG5cdFx0Ly8gZGlzY2FyZCBpbml0aWFsIGVsZW1lbnRzXG4gICAgaWYgKHRoaXMuZGlzY2FyZEluaXRpYWxFbGVtZW50cykge1xuICAgICAgZm91bmRFbGVtZW50cyA9IG5ldyBVbmlxdWVFbGVtZW50TGlzdCgndW5pcXVlVGV4dCcsIHskfSlcbiAgICB9XG5cblx0XHQvLyBubyBlbGVtZW50cyB0byBjbGljayBhdCB0aGUgYmVnaW5uaW5nXG4gICAgaWYgKGNsaWNrRWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUoZm91bmRFbGVtZW50cylcbiAgICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICAgIH1cblxuXHRcdC8vIGluaXRpYWwgY2xpY2sgYW5kIHdhaXRcbiAgICB2YXIgY3VycmVudENsaWNrRWxlbWVudCA9IGNsaWNrRWxlbWVudHNbMF1cbiAgICB0aGlzLnRyaWdnZXJCdXR0b25DbGljayhjdXJyZW50Q2xpY2tFbGVtZW50KVxuICAgIHZhciBuZXh0RWxlbWVudFNlbGVjdGlvbiA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCkgKyBkZWxheVxuXG5cdFx0Ly8gaW5maW5pdGVseSBzY3JvbGwgZG93biBhbmQgZmluZCBhbGwgaXRlbXNcbiAgICB2YXIgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG5cdFx0XHQvLyBmaW5kIHRob3NlIGNsaWNrIGVsZW1lbnRzIHRoYXQgYXJlIG5vdCBpbiB0aGUgYmxhY2sgbGlzdFxuICAgICAgdmFyIGFsbENsaWNrRWxlbWVudHMgPSB0aGlzLmdldENsaWNrRWxlbWVudHMocGFyZW50RWxlbWVudClcbiAgICAgIGNsaWNrRWxlbWVudHMgPSBbXVxuICAgICAgYWxsQ2xpY2tFbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIGlmICghZG9uZUNsaWNraW5nRWxlbWVudHMuaXNBZGRlZChlbGVtZW50KSkge1xuICAgICAgICAgIGNsaWNrRWxlbWVudHMucHVzaChlbGVtZW50KVxuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICB2YXIgbm93ID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKVxuXHRcdFx0Ly8gc2xlZXAuIHdhaXQgd2hlbiB0byBleHRyYWN0IG5leHQgZWxlbWVudHNcbiAgICAgIGlmIChub3cgPCBuZXh0RWxlbWVudFNlbGVjdGlvbikge1xuXHRcdFx0XHQvLyBjb25zb2xlLmxvZyhcIndhaXRcIik7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG5cdFx0XHQvLyBhZGQgbmV3bHkgZm91bmQgZWxlbWVudHMgdG8gZWxlbWVudCBmb3VuZEVsZW1lbnRzIGFycmF5LlxuICAgICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcbiAgICAgIHZhciBhZGRlZEFuRWxlbWVudCA9IGZhbHNlXG4gICAgICBlbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIHZhciBhZGRlZCA9IGZvdW5kRWxlbWVudHMucHVzaChlbGVtZW50KVxuICAgICAgICBpZiAoYWRkZWQpIHtcbiAgICAgICAgICBhZGRlZEFuRWxlbWVudCA9IHRydWVcbiAgICAgICAgfVxuICAgICAgfSlcblx0XHRcdC8vIGNvbnNvbGUubG9nKFwiYWRkZWRcIiwgYWRkZWRBbkVsZW1lbnQpO1xuXG5cdFx0XHQvLyBubyBuZXcgZWxlbWVudHMgZm91bmQuIFN0b3AgY2xpY2tpbmcgdGhpcyBidXR0b25cbiAgICAgIGlmICghYWRkZWRBbkVsZW1lbnQpIHtcbiAgICAgICAgZG9uZUNsaWNraW5nRWxlbWVudHMucHVzaChjdXJyZW50Q2xpY2tFbGVtZW50KVxuICAgICAgfVxuXG5cdFx0XHQvLyBjb250aW51ZSBjbGlja2luZyBhbmQgYWRkIGRlbGF5LCBidXQgaWYgdGhlcmUgaXMgbm90aGluZ1xuXHRcdFx0Ly8gbW9yZSB0byBjbGljayB0aGUgZmluaXNoXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhcInRvdGFsIGJ1dHRvbnNcIiwgY2xpY2tFbGVtZW50cy5sZW5ndGgpXG4gICAgICBpZiAoY2xpY2tFbGVtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbClcbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKGZvdW5kRWxlbWVudHMpXG4gICAgICB9IGVsc2Uge1xuXHRcdFx0XHQvLyBjb25zb2xlLmxvZyhcImNsaWNrXCIpO1xuICAgICAgICBjdXJyZW50Q2xpY2tFbGVtZW50ID0gY2xpY2tFbGVtZW50c1swXVxuXHRcdFx0XHQvLyBjbGljayBvbiBlbGVtZW50cyBvbmx5IG9uY2UgaWYgdGhlIHR5cGUgaXMgY2xpY2tvbmNlXG4gICAgICAgIGlmICh0aGlzLmNsaWNrVHlwZSA9PT0gJ2NsaWNrT25jZScpIHtcbiAgICAgICAgICBkb25lQ2xpY2tpbmdFbGVtZW50cy5wdXNoKGN1cnJlbnRDbGlja0VsZW1lbnQpXG4gICAgICAgIH1cbiAgICAgICAgdGhpcy50cmlnZ2VyQnV0dG9uQ2xpY2soY3VycmVudENsaWNrRWxlbWVudClcbiAgICAgICAgbmV4dEVsZW1lbnRTZWxlY3Rpb24gPSBub3cgKyBkZWxheVxuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSwgNTApXG5cbiAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZS5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbXVxuICB9LFxuXG4gIGdldEZlYXR1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFsnbXVsdGlwbGUnLCAnZGVsYXknLCAnY2xpY2tFbGVtZW50U2VsZWN0b3InLCAnY2xpY2tUeXBlJywgJ2Rpc2NhcmRJbml0aWFsRWxlbWVudHMnLCAnY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUnXVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JFbGVtZW50Q2xpY2tcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxudmFyIFNlbGVjdG9yRWxlbWVudFNjcm9sbCA9IHtcblxuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkNyZWF0ZU5ld0pvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcbiAgc2Nyb2xsVG9Cb3R0b206IGZ1bmN0aW9uICgpIHtcbiAgICB3aW5kb3cuc2Nyb2xsVG8oMCwgZG9jdW1lbnQuYm9keS5zY3JvbGxIZWlnaHQpXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBkZWxheSA9IHBhcnNlSW50KHRoaXMuZGVsYXkpIHx8IDBcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIGZvdW5kRWxlbWVudHMgPSBbXVxuXG5cdFx0Ly8gaW5pdGlhbGx5IHNjcm9sbCBkb3duIGFuZCB3YWl0XG4gICAgdGhpcy5zY3JvbGxUb0JvdHRvbSgpXG4gICAgdmFyIG5leHRFbGVtZW50U2VsZWN0aW9uID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKSArIGRlbGF5XG5cblx0XHQvLyBpbmZpbml0ZWx5IHNjcm9sbCBkb3duIGFuZCBmaW5kIGFsbCBpdGVtc1xuICAgIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBub3cgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpXG5cdFx0XHQvLyBzbGVlcC4gd2FpdCB3aGVuIHRvIGV4dHJhY3QgbmV4dCBlbGVtZW50c1xuICAgICAgaWYgKG5vdyA8IG5leHRFbGVtZW50U2VsZWN0aW9uKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuXHRcdFx0Ly8gbm8gbmV3IGVsZW1lbnRzIGZvdW5kXG4gICAgICBpZiAoZWxlbWVudHMubGVuZ3RoID09PSBmb3VuZEVsZW1lbnRzLmxlbmd0aCkge1xuICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKVxuICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUodGhpcy4kLm1ha2VBcnJheShlbGVtZW50cykpXG4gICAgICB9IGVsc2Uge1xuXHRcdFx0XHQvLyBjb250aW51ZSBzY3JvbGxpbmcgYW5kIGFkZCBkZWxheVxuICAgICAgICBmb3VuZEVsZW1lbnRzID0gZWxlbWVudHNcbiAgICAgICAgdGhpcy5zY3JvbGxUb0JvdHRvbSgpXG4gICAgICAgIG5leHRFbGVtZW50U2VsZWN0aW9uID0gbm93ICsgZGVsYXlcbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcyksIDUwKVxuXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW11cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2RlbGF5J11cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yRWxlbWVudFNjcm9sbFxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgU2VsZWN0b3JHcm91cCA9IHtcblxuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5IYXZlTG9jYWxDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkNyZWF0ZU5ld0pvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBkZmQgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciBzZWxmID0gdGhpc1xuXHRcdC8vIGNhbm5vdCByZXVzZSB0aGlzLmdldERhdGFFbGVtZW50cyBiZWNhdXNlIGl0IGRlcGVuZHMgb24gKm11bHRpcGxlKiBwcm9wZXJ0eVxuICAgIHZhciBlbGVtZW50cyA9IHNlbGYuJCh0aGlzLnNlbGVjdG9yLCBwYXJlbnRFbGVtZW50KVxuXG4gICAgdmFyIHJlY29yZHMgPSBbXVxuICAgIHNlbGYuJChlbGVtZW50cykuZWFjaChmdW5jdGlvbiAoaywgZWxlbWVudCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuXG4gICAgICBkYXRhW3RoaXMuaWRdID0gc2VsZi4kKGVsZW1lbnQpLnRleHQoKVxuXG4gICAgICBpZiAodGhpcy5leHRyYWN0QXR0cmlidXRlKSB7XG4gICAgICAgIGRhdGFbdGhpcy5pZCArICctJyArIHRoaXMuZXh0cmFjdEF0dHJpYnV0ZV0gPSBzZWxmLiQoZWxlbWVudCkuYXR0cih0aGlzLmV4dHJhY3RBdHRyaWJ1dGUpXG4gICAgICB9XG5cbiAgICAgIHJlY29yZHMucHVzaChkYXRhKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIHZhciByZXN1bHQgPSB7fVxuICAgIHJlc3VsdFt0aGlzLmlkXSA9IHJlY29yZHNcblxuICAgIGRmZC5yZXNvbHZlKFtyZXN1bHRdKVxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW3RoaXMuaWRdXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydkZWxheScsICdleHRyYWN0QXR0cmlidXRlJ11cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yR3JvdXBcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxudmFyIFNlbGVjdG9ySFRNTCA9IHtcblxuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcblxuICAgIHZhciByZXN1bHQgPSBbXVxuICAgIHNlbGYuJChlbGVtZW50cykuZWFjaChmdW5jdGlvbiAoaywgZWxlbWVudCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuICAgICAgdmFyIGh0bWwgPSBzZWxmLiQoZWxlbWVudCkuaHRtbCgpXG5cbiAgICAgIGlmICh0aGlzLnJlZ2V4ICE9PSB1bmRlZmluZWQgJiYgdGhpcy5yZWdleC5sZW5ndGgpIHtcbiAgICAgICAgdmFyIG1hdGNoZXMgPSBodG1sLm1hdGNoKG5ldyBSZWdFeHAodGhpcy5yZWdleCkpXG4gICAgICAgIGlmIChtYXRjaGVzICE9PSBudWxsKSB7XG4gICAgICAgICAgaHRtbCA9IG1hdGNoZXNbMF1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBodG1sID0gbnVsbFxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBkYXRhW3RoaXMuaWRdID0gaHRtbFxuXG4gICAgICByZXN1bHQucHVzaChkYXRhKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIGlmICh0aGlzLm11bHRpcGxlID09PSBmYWxzZSAmJiBlbGVtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHZhciBkYXRhID0ge31cbiAgICAgIGRhdGFbdGhpcy5pZF0gPSBudWxsXG4gICAgICByZXN1bHQucHVzaChkYXRhKVxuICAgIH1cblxuICAgIGRmZC5yZXNvbHZlKHJlc3VsdClcbiAgICByZXR1cm4gZGZkLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFt0aGlzLmlkXVxuICB9LFxuXG4gIGdldEZlYXR1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFsnbXVsdGlwbGUnLCAncmVnZXgnLCAnZGVsYXknXVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JIVE1MXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciB3aGVuQ2FsbFNlcXVlbnRpYWxseSA9IHJlcXVpcmUoJy4uLy4uL2Fzc2V0cy9qcXVlcnkud2hlbmNhbGxzZXF1ZW50aWFsbHknKVxudmFyIEJhc2U2NCA9IHJlcXVpcmUoJy4uLy4uL2Fzc2V0cy9iYXNlNjQnKVxudmFyIFNlbGVjdG9ySW1hZ2UgPSB7XG4gIGNhblJldHVybk11bHRpcGxlUmVjb3JkczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUNoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZGZkID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICAgIHZhciBlbGVtZW50cyA9IHRoaXMuZ2V0RGF0YUVsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG5cbiAgICB2YXIgZGVmZXJyZWREYXRhQ2FsbHMgPSBbXVxuICAgIHRoaXMuJChlbGVtZW50cykuZWFjaChmdW5jdGlvbiAoaSwgZWxlbWVudCkge1xuICAgICAgZGVmZXJyZWREYXRhQ2FsbHMucHVzaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkZWZlcnJlZERhdGEgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgICAgIHZhciBkYXRhID0ge31cbiAgICAgICAgZGF0YVt0aGlzLmlkICsgJy1zcmMnXSA9IGVsZW1lbnQuc3JjXG5cblx0XHRcdFx0Ly8gZG93bmxvYWQgaW1hZ2UgaWYgcmVxdWlyZWRcbiAgICAgICAgaWYgKCF0aGlzLmRvd25sb2FkSW1hZ2UpIHtcbiAgICAgICAgICBkZWZlcnJlZERhdGEucmVzb2x2ZShkYXRhKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBkZWZlcnJlZEltYWdlQmFzZTY0ID0gdGhpcy5kb3dubG9hZEltYWdlQmFzZTY0KGVsZW1lbnQuc3JjKVxuXG4gICAgICAgICAgZGVmZXJyZWRJbWFnZUJhc2U2NC5kb25lKGZ1bmN0aW9uIChpbWFnZVJlc3BvbnNlKSB7XG4gICAgICAgICAgICBkYXRhWydfaW1hZ2VCYXNlNjQtJyArIHRoaXMuaWRdID0gaW1hZ2VSZXNwb25zZS5pbWFnZUJhc2U2NFxuICAgICAgICAgICAgZGF0YVsnX2ltYWdlTWltZVR5cGUtJyArIHRoaXMuaWRdID0gaW1hZ2VSZXNwb25zZS5taW1lVHlwZVxuXG4gICAgICAgICAgICBkZWZlcnJlZERhdGEucmVzb2x2ZShkYXRhKVxuICAgICAgICAgIH0uYmluZCh0aGlzKSkuZmFpbChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHQvLyBmYWlsZWQgdG8gZG93bmxvYWQgaW1hZ2UgY29udGludWUuXG5cdFx0XHRcdFx0XHQvLyBAVE9ETyBoYW5kbGUgZXJycm9yXG4gICAgICAgICAgICBkZWZlcnJlZERhdGEucmVzb2x2ZShkYXRhKVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZGVmZXJyZWREYXRhLnByb21pc2UoKVxuICAgICAgfS5iaW5kKHRoaXMpKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIHdoZW5DYWxsU2VxdWVudGlhbGx5KGRlZmVycmVkRGF0YUNhbGxzKS5kb25lKGZ1bmN0aW9uIChkYXRhUmVzdWx0cykge1xuICAgICAgaWYgKHRoaXMubXVsdGlwbGUgPT09IGZhbHNlICYmIGVsZW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICAgIGRhdGFbdGhpcy5pZCArICctc3JjJ10gPSBudWxsXG4gICAgICAgIGRhdGFSZXN1bHRzLnB1c2goZGF0YSlcbiAgICAgIH1cblxuICAgICAgZGZkLnJlc29sdmUoZGF0YVJlc3VsdHMpXG4gICAgfSlcblxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG4gIH0sXG5cbiAgZG93bmxvYWRGaWxlQXNCbG9iOiBmdW5jdGlvbiAodXJsKSB7XG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAodGhpcy5yZWFkeVN0YXRlID09IDQpIHtcbiAgICAgICAgaWYgKHRoaXMuc3RhdHVzID09IDIwMCkge1xuICAgICAgICAgIHZhciBibG9iID0gdGhpcy5yZXNwb25zZVxuICAgICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZShibG9iKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVqZWN0KHhoci5zdGF0dXNUZXh0KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHhoci5vcGVuKCdHRVQnLCB1cmwpXG4gICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdibG9iJ1xuICAgIHhoci5zZW5kKClcblxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG4gIGRvd25sb2FkSW1hZ2VCYXNlNjQ6IGZ1bmN0aW9uICh1cmwpIHtcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIGRlZmVycmVkRG93bmxvYWQgPSB0aGlzLmRvd25sb2FkRmlsZUFzQmxvYih1cmwpXG4gICAgZGVmZXJyZWREb3dubG9hZC5kb25lKGZ1bmN0aW9uIChibG9iKSB7XG4gICAgICB2YXIgbWltZVR5cGUgPSBibG9iLnR5cGVcbiAgICAgIHZhciBkZWZlcnJlZEJsb2IgPSBCYXNlNjQuYmxvYlRvQmFzZTY0KGJsb2IpXG4gICAgICBkZWZlcnJlZEJsb2IuZG9uZShmdW5jdGlvbiAoaW1hZ2VCYXNlNjQpIHtcbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKHtcbiAgICAgICAgICBtaW1lVHlwZTogbWltZVR5cGUsXG4gICAgICAgICAgaW1hZ2VCYXNlNjQ6IGltYWdlQmFzZTY0XG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0pLmZhaWwoZGVmZXJyZWRSZXNwb25zZS5mYWlsKVxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFt0aGlzLmlkICsgJy1zcmMnXVxuICB9LFxuXG4gIGdldEZlYXR1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFsnbXVsdGlwbGUnLCAnZGVsYXknLCAnZG93bmxvYWRJbWFnZSddXG4gIH0sXG5cbiAgZ2V0SXRlbUNTU1NlbGVjdG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICdpbWcnXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvckltYWdlXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciB3aGVuQ2FsbFNlcXVlbnRpYWxseSA9IHJlcXVpcmUoJy4uLy4uL2Fzc2V0cy9qcXVlcnkud2hlbmNhbGxzZXF1ZW50aWFsbHknKVxuXG52YXIgU2VsZWN0b3JMaW5rID0ge1xuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBlbGVtZW50cyA9IHRoaXMuZ2V0RGF0YUVsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG4gICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICB2YXIgZGZkID0ganF1ZXJ5LkRlZmVycmVkKClcblxuXHRcdC8vIHJldHVybiBlbXB0eSByZWNvcmQgaWYgbm90IG11bHRpcGxlIHR5cGUgYW5kIG5vIGVsZW1lbnRzIGZvdW5kXG4gICAgaWYgKHRoaXMubXVsdGlwbGUgPT09IGZhbHNlICYmIGVsZW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuICAgICAgZGF0YVt0aGlzLmlkXSA9IG51bGxcbiAgICAgIGRmZC5yZXNvbHZlKFtkYXRhXSlcbiAgICAgIHJldHVybiBkZmRcbiAgICB9XG5cblx0XHQvLyBleHRyYWN0IGxpbmtzIG9uZSBieSBvbmVcbiAgICB2YXIgZGVmZXJyZWREYXRhRXh0cmFjdGlvbkNhbGxzID0gW11cbiAgICBzZWxmLiQoZWxlbWVudHMpLmVhY2goZnVuY3Rpb24gKGssIGVsZW1lbnQpIHtcbiAgICAgIGRlZmVycmVkRGF0YUV4dHJhY3Rpb25DYWxscy5wdXNoKGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIHZhciBkZWZlcnJlZERhdGEgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgICAgIHZhciBkYXRhID0ge31cbiAgICAgICAgZGF0YVt0aGlzLmlkXSA9IHNlbGYuJChlbGVtZW50KS50ZXh0KClcbiAgICAgICAgZGF0YS5fZm9sbG93U2VsZWN0b3JJZCA9IHRoaXMuaWRcbiAgICAgICAgZGF0YVt0aGlzLmlkICsgJy1ocmVmJ10gPSBlbGVtZW50LmhyZWZcbiAgICAgICAgZGF0YS5fZm9sbG93ID0gZWxlbWVudC5ocmVmXG4gICAgICAgIGRlZmVycmVkRGF0YS5yZXNvbHZlKGRhdGEpXG5cbiAgICAgICAgcmV0dXJuIGRlZmVycmVkRGF0YVxuICAgICAgfS5iaW5kKHRoaXMsIGVsZW1lbnQpKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIHdoZW5DYWxsU2VxdWVudGlhbGx5KGRlZmVycmVkRGF0YUV4dHJhY3Rpb25DYWxscykuZG9uZShmdW5jdGlvbiAocmVzcG9uc2VzKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW11cbiAgICAgIHJlc3BvbnNlcy5mb3JFYWNoKGZ1bmN0aW9uIChkYXRhUmVzdWx0KSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKGRhdGFSZXN1bHQpXG4gICAgICB9KVxuICAgICAgZGZkLnJlc29sdmUocmVzdWx0KVxuICAgIH0pXG5cbiAgICByZXR1cm4gZGZkLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFt0aGlzLmlkLCB0aGlzLmlkICsgJy1ocmVmJ11cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2RlbGF5J11cbiAgfSxcblxuICBnZXRJdGVtQ1NTU2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gJ2EnXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvckxpbmtcbiIsInZhciB3aGVuQ2FsbFNlcXVlbnRpYWxseSA9IHJlcXVpcmUoJy4uLy4uL2Fzc2V0cy9qcXVlcnkud2hlbmNhbGxzZXF1ZW50aWFsbHknKVxudmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgQ3NzU2VsZWN0b3IgPSByZXF1aXJlKCdjc3Mtc2VsZWN0b3InKS5Dc3NTZWxlY3RvclxudmFyIFNlbGVjdG9yUG9wdXBMaW5rID0ge1xuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcblxuICAgIHZhciBkZmQgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG5cdFx0Ly8gcmV0dXJuIGVtcHR5IHJlY29yZCBpZiBub3QgbXVsdGlwbGUgdHlwZSBhbmQgbm8gZWxlbWVudHMgZm91bmRcbiAgICBpZiAodGhpcy5tdWx0aXBsZSA9PT0gZmFsc2UgJiYgZWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICBkYXRhW3RoaXMuaWRdID0gbnVsbFxuICAgICAgZGZkLnJlc29sdmUoW2RhdGFdKVxuICAgICAgcmV0dXJuIGRmZFxuICAgIH1cblxuXHRcdC8vIGV4dHJhY3QgbGlua3Mgb25lIGJ5IG9uZVxuICAgIHZhciBkZWZlcnJlZERhdGFFeHRyYWN0aW9uQ2FsbHMgPSBbXVxuICAgICQoZWxlbWVudHMpLmVhY2goZnVuY3Rpb24gKGssIGVsZW1lbnQpIHtcbiAgICAgIGRlZmVycmVkRGF0YUV4dHJhY3Rpb25DYWxscy5wdXNoKGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIHZhciBkZWZlcnJlZERhdGEgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgICAgIHZhciBkYXRhID0ge31cbiAgICAgICAgZGF0YVt0aGlzLmlkXSA9ICQoZWxlbWVudCkudGV4dCgpXG4gICAgICAgIGRhdGEuX2ZvbGxvd1NlbGVjdG9ySWQgPSB0aGlzLmlkXG5cbiAgICAgICAgdmFyIGRlZmVycmVkUG9wdXBVUkwgPSB0aGlzLmdldFBvcHVwVVJMKGVsZW1lbnQpXG4gICAgICAgIGRlZmVycmVkUG9wdXBVUkwuZG9uZShmdW5jdGlvbiAodXJsKSB7XG4gICAgICAgICAgZGF0YVt0aGlzLmlkICsgJy1ocmVmJ10gPSB1cmxcbiAgICAgICAgICBkYXRhLl9mb2xsb3cgPSB1cmxcbiAgICAgICAgICBkZWZlcnJlZERhdGEucmVzb2x2ZShkYXRhKVxuICAgICAgICB9LmJpbmQodGhpcykpXG5cbiAgICAgICAgcmV0dXJuIGRlZmVycmVkRGF0YVxuICAgICAgfS5iaW5kKHRoaXMsIGVsZW1lbnQpKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIHdoZW5DYWxsU2VxdWVudGlhbGx5KGRlZmVycmVkRGF0YUV4dHJhY3Rpb25DYWxscykuZG9uZShmdW5jdGlvbiAocmVzcG9uc2VzKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW11cbiAgICAgIHJlc3BvbnNlcy5mb3JFYWNoKGZ1bmN0aW9uIChkYXRhUmVzdWx0KSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKGRhdGFSZXN1bHQpXG4gICAgICB9KVxuICAgICAgZGZkLnJlc29sdmUocmVzdWx0KVxuICAgIH0pXG5cbiAgICByZXR1cm4gZGZkLnByb21pc2UoKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBHZXRzIGFuIHVybCBmcm9tIGEgd2luZG93Lm9wZW4gY2FsbCBieSBtb2NraW5nIHRoZSB3aW5kb3cub3BlbiBmdW5jdGlvblxuXHQgKiBAcGFyYW0gZWxlbWVudFxuXHQgKiBAcmV0dXJucyAkLkRlZmVycmVkKClcblx0ICovXG4gIGdldFBvcHVwVVJMOiBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgLy8gb3ZlcnJpZGUgd2luZG93Lm9wZW4gZnVuY3Rpb24uIHdlIG5lZWQgdG8gZXhlY3V0ZSB0aGlzIGluIHBhZ2Ugc2NvcGUuXG5cdFx0Ly8gd2UgbmVlZCB0byBrbm93IGhvdyB0byBmaW5kIHRoaXMgZWxlbWVudCBmcm9tIHBhZ2Ugc2NvcGUuXG4gICAgdmFyIGNzID0gbmV3IENzc1NlbGVjdG9yKHtcbiAgICAgIGVuYWJsZVNtYXJ0VGFibGVTZWxlY3RvcjogZmFsc2UsXG4gICAgICBwYXJlbnQ6IGRvY3VtZW50LmJvZHksXG4gICAgICBlbmFibGVSZXN1bHRTdHJpcHBpbmc6IGZhbHNlXG4gICAgfSlcbiAgICB2YXIgY3NzU2VsZWN0b3IgPSBjcy5nZXRDc3NTZWxlY3RvcihbZWxlbWVudF0pXG4gICAgY29uc29sZS5sb2coY3NzU2VsZWN0b3IpXG4gICAgY29uc29sZS5sb2coZG9jdW1lbnQuYm9keS5xdWVyeVNlbGVjdG9yQWxsKGNzc1NlbGVjdG9yKSlcblx0XHQvLyB0aGlzIGZ1bmN0aW9uIHdpbGwgY2F0Y2ggd2luZG93Lm9wZW4gY2FsbCBhbmQgcGxhY2UgdGhlIHJlcXVlc3RlZCB1cmwgYXMgdGhlIGVsZW1lbnRzIGRhdGEgYXR0cmlidXRlXG4gICAgdmFyIHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpXG4gICAgc2NyaXB0LnR5cGUgPSAndGV4dC9qYXZhc2NyaXB0J1xuICAgIGNvbnNvbGUubG9nKGNzc1NlbGVjdG9yKVxuICAgIGNvbnNvbGUubG9nKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoY3NzU2VsZWN0b3IpKVxuICAgIHNjcmlwdC50ZXh0ID0gYFxuXHRcdFx0KGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBvcGVuID0gd2luZG93Lm9wZW47XG4gICAgICAgIHZhciBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJyR7Y3NzU2VsZWN0b3J9JylbMF07XG4gICAgICAgIHZhciBvcGVuTmV3ID0gZnVuY3Rpb24oKSB7IFxuICAgICAgICAgIHZhciB1cmwgPSBhcmd1bWVudHNbMF07IFxuICAgICAgICAgIGVsLmRhdGFzZXQud2ViU2NyYXBlckV4dHJhY3RVcmwgPSB1cmw7IFxuICAgICAgICAgIHdpbmRvdy5vcGVuID0gb3BlbjsgXG4gICAgICAgIH07XG4gICAgICAgIHdpbmRvdy5vcGVuID0gb3Blbk5ldzsgXG4gICAgICAgIGVsLmNsaWNrKCk7IFxuXHRcdFx0fSkoKWBcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHNjcmlwdClcblxuXHRcdC8vIHdhaXQgZm9yIHVybCB0byBiZSBhdmFpbGFibGVcbiAgICB2YXIgZGVmZXJyZWRVUkwgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciB0aW1lb3V0ID0gTWF0aC5hYnMoNTAwMCAvIDMwKSAvLyA1cyB0aW1lb3V0IHRvIGdlbmVyYXRlIGFuIHVybCBmb3IgcG9wdXBcbiAgICB2YXIgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgdXJsID0gJChlbGVtZW50KS5kYXRhKCd3ZWItc2NyYXBlci1leHRyYWN0LXVybCcpXG4gICAgICBpZiAodXJsKSB7XG4gICAgICAgIGRlZmVycmVkVVJMLnJlc29sdmUodXJsKVxuICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKVxuICAgICAgICBzY3JpcHQucmVtb3ZlKClcbiAgICAgIH1cblx0XHRcdC8vIHRpbWVvdXQgcG9wdXAgb3BlbmluZ1xuICAgICAgaWYgKHRpbWVvdXQtLSA8PSAwKSB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpXG4gICAgICAgIHNjcmlwdC5yZW1vdmUoKVxuICAgICAgfVxuICAgIH0sIDMwKVxuXG4gICAgcmV0dXJuIGRlZmVycmVkVVJMLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFt0aGlzLmlkLCB0aGlzLmlkICsgJy1ocmVmJ11cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2RlbGF5J11cbiAgfSxcblxuICBnZXRJdGVtQ1NTU2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gJyonXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvclBvcHVwTGlua1xuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG5cbnZhciBTZWxlY3RvclRhYmxlID0ge1xuXG4gIGNhblJldHVybk11bHRpcGxlUmVjb3JkczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUNoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICBnZXRUYWJsZUhlYWRlckNvbHVtbnM6IGZ1bmN0aW9uICgkdGFibGUpIHtcbiAgICB2YXIgY29sdW1ucyA9IHt9XG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICB2YXIgaGVhZGVyUm93U2VsZWN0b3IgPSB0aGlzLmdldFRhYmxlSGVhZGVyUm93U2VsZWN0b3IoKVxuICAgIHZhciAkaGVhZGVyUm93ID0gJCgkdGFibGUpLmZpbmQoaGVhZGVyUm93U2VsZWN0b3IpXG4gICAgaWYgKCRoZWFkZXJSb3cubGVuZ3RoID4gMCkge1xuICAgICAgJGhlYWRlclJvdy5maW5kKCd0ZCx0aCcpLmVhY2goZnVuY3Rpb24gKGkpIHtcbiAgICAgICAgdmFyIGhlYWRlciA9ICQodGhpcykudGV4dCgpLnRyaW0oKVxuICAgICAgICBjb2x1bW5zW2hlYWRlcl0gPSB7XG4gICAgICAgICAgaW5kZXg6IGkgKyAxXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuICAgIHJldHVybiBjb2x1bW5zXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBkZmQgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciAkID0gdGhpcy4kXG5cbiAgICB2YXIgdGFibGVzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcblxuICAgIHZhciByZXN1bHQgPSBbXVxuICAgICQodGFibGVzKS5lYWNoKGZ1bmN0aW9uIChrLCB0YWJsZSkge1xuICAgICAgdmFyIGNvbHVtbnMgPSB0aGlzLmdldFRhYmxlSGVhZGVyQ29sdW1ucygkKHRhYmxlKSlcblxuICAgICAgdmFyIGRhdGFSb3dTZWxlY3RvciA9IHRoaXMuZ2V0VGFibGVEYXRhUm93U2VsZWN0b3IoKVxuICAgICAgJCh0YWJsZSkuZmluZChkYXRhUm93U2VsZWN0b3IpLmVhY2goZnVuY3Rpb24gKGksIHJvdykge1xuICAgICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICAgIHRoaXMuY29sdW1ucy5mb3JFYWNoKGZ1bmN0aW9uIChjb2x1bW4pIHtcbiAgICAgICAgICBpZiAoY29sdW1uLmV4dHJhY3QgPT09IHRydWUpIHtcbiAgICAgICAgICAgIGlmIChjb2x1bW5zW2NvbHVtbi5oZWFkZXJdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgZGF0YVtjb2x1bW4ubmFtZV0gPSBudWxsXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB2YXIgcm93VGV4dCA9ICQocm93KS5maW5kKCc+Om50aC1jaGlsZCgnICsgY29sdW1uc1tjb2x1bW4uaGVhZGVyXS5pbmRleCArICcpJykudGV4dCgpLnRyaW0oKVxuICAgICAgICAgICAgICBkYXRhW2NvbHVtbi5uYW1lXSA9IHJvd1RleHRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIHJlc3VsdC5wdXNoKGRhdGEpXG4gICAgICB9LmJpbmQodGhpcykpXG4gICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgZGZkLnJlc29sdmUocmVzdWx0KVxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZGF0YUNvbHVtbnMgPSBbXVxuICAgIHRoaXMuY29sdW1ucy5mb3JFYWNoKGZ1bmN0aW9uIChjb2x1bW4pIHtcbiAgICAgIGlmIChjb2x1bW4uZXh0cmFjdCA9PT0gdHJ1ZSkge1xuICAgICAgICBkYXRhQ29sdW1ucy5wdXNoKGNvbHVtbi5uYW1lKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGRhdGFDb2x1bW5zXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydtdWx0aXBsZScsICdjb2x1bW5zJywgJ2RlbGF5JywgJ3RhYmxlRGF0YVJvd1NlbGVjdG9yJywgJ3RhYmxlSGVhZGVyUm93U2VsZWN0b3InXVxuICB9LFxuXG4gIGdldEl0ZW1DU1NTZWxlY3RvcjogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAndGFibGUnXG4gIH0sXG5cbiAgZ2V0VGFibGVIZWFkZXJSb3dTZWxlY3RvckZyb21UYWJsZUhUTUw6IGZ1bmN0aW9uIChodG1sLCBvcHRpb25zID0ge30pIHtcbiAgICB2YXIgJCA9IG9wdGlvbnMuJCB8fCB0aGlzLiRcbiAgICB2YXIgJHRhYmxlID0gJChodG1sKVxuICAgIGlmICgkdGFibGUuZmluZCgndGhlYWQgdHI6aGFzKHRkOm5vdCg6ZW1wdHkpKSwgdGhlYWQgdHI6aGFzKHRoOm5vdCg6ZW1wdHkpKScpLmxlbmd0aCkge1xuICAgICAgaWYgKCR0YWJsZS5maW5kKCd0aGVhZCB0cicpLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gJ3RoZWFkIHRyJ1xuICAgICAgfVx0XHRcdGVsc2Uge1xuICAgICAgICB2YXIgJHJvd3MgPSAkdGFibGUuZmluZCgndGhlYWQgdHInKVxuXHRcdFx0XHQvLyBmaXJzdCByb3cgd2l0aCBkYXRhXG4gICAgICAgIHZhciByb3dJbmRleCA9ICRyb3dzLmluZGV4KCRyb3dzLmZpbHRlcignOmhhcyh0ZDpub3QoOmVtcHR5KSksOmhhcyh0aDpub3QoOmVtcHR5KSknKVswXSlcbiAgICAgICAgcmV0dXJuICd0aGVhZCB0cjpudGgtb2YtdHlwZSgnICsgKHJvd0luZGV4ICsgMSkgKyAnKSdcbiAgICAgIH1cbiAgICB9XHRcdGVsc2UgaWYgKCR0YWJsZS5maW5kKCd0ciB0ZDpub3QoOmVtcHR5KSwgdHIgdGg6bm90KDplbXB0eSknKS5sZW5ndGgpIHtcbiAgICAgIHZhciAkcm93cyA9ICR0YWJsZS5maW5kKCd0cicpXG5cdFx0XHQvLyBmaXJzdCByb3cgd2l0aCBkYXRhXG4gICAgICB2YXIgcm93SW5kZXggPSAkcm93cy5pbmRleCgkcm93cy5maWx0ZXIoJzpoYXModGQ6bm90KDplbXB0eSkpLDpoYXModGg6bm90KDplbXB0eSkpJylbMF0pXG4gICAgICByZXR1cm4gJ3RyOm50aC1vZi10eXBlKCcgKyAocm93SW5kZXggKyAxKSArICcpJ1xuICAgIH1cdFx0ZWxzZSB7XG4gICAgICByZXR1cm4gJydcbiAgICB9XG4gIH0sXG5cbiAgZ2V0VGFibGVEYXRhUm93U2VsZWN0b3JGcm9tVGFibGVIVE1MOiBmdW5jdGlvbiAoaHRtbCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdmFyICQgPSBvcHRpb25zLiQgfHwgdGhpcy4kXG4gICAgdmFyICR0YWJsZSA9ICQoaHRtbClcbiAgICBpZiAoJHRhYmxlLmZpbmQoJ3RoZWFkIHRyOmhhcyh0ZDpub3QoOmVtcHR5KSksIHRoZWFkIHRyOmhhcyh0aDpub3QoOmVtcHR5KSknKS5sZW5ndGgpIHtcbiAgICAgIHJldHVybiAndGJvZHkgdHInXG4gICAgfVx0XHRlbHNlIGlmICgkdGFibGUuZmluZCgndHIgdGQ6bm90KDplbXB0eSksIHRyIHRoOm5vdCg6ZW1wdHkpJykubGVuZ3RoKSB7XG4gICAgICB2YXIgJHJvd3MgPSAkdGFibGUuZmluZCgndHInKVxuXHRcdFx0Ly8gZmlyc3Qgcm93IHdpdGggZGF0YVxuICAgICAgdmFyIHJvd0luZGV4ID0gJHJvd3MuaW5kZXgoJHJvd3MuZmlsdGVyKCc6aGFzKHRkOm5vdCg6ZW1wdHkpKSw6aGFzKHRoOm5vdCg6ZW1wdHkpKScpWzBdKVxuICAgICAgcmV0dXJuICd0cjpudGgtb2YtdHlwZShuKycgKyAocm93SW5kZXggKyAyKSArICcpJ1xuICAgIH1cdFx0ZWxzZSB7XG4gICAgICByZXR1cm4gJydcbiAgICB9XG4gIH0sXG5cbiAgZ2V0VGFibGVIZWFkZXJSb3dTZWxlY3RvcjogZnVuY3Rpb24gKCkge1xuXHRcdC8vIGhhbmRsZSBsZWdhY3kgc2VsZWN0b3JzXG4gICAgaWYgKHRoaXMudGFibGVIZWFkZXJSb3dTZWxlY3RvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gJ3RoZWFkIHRyJ1xuICAgIH1cdFx0ZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy50YWJsZUhlYWRlclJvd1NlbGVjdG9yXG4gICAgfVxuICB9LFxuXG4gIGdldFRhYmxlRGF0YVJvd1NlbGVjdG9yOiBmdW5jdGlvbiAoKSB7XG5cdFx0Ly8gaGFuZGxlIGxlZ2FjeSBzZWxlY3RvcnNcbiAgICBpZiAodGhpcy50YWJsZURhdGFSb3dTZWxlY3RvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gJ3Rib2R5IHRyJ1xuICAgIH1cdFx0ZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy50YWJsZURhdGFSb3dTZWxlY3RvclxuICAgIH1cbiAgfSxcblxuXHQvKipcblx0ICogRXh0cmFjdCB0YWJsZSBoZWFkZXIgY29sdW1uIGluZm8gZnJvbSBodG1sXG5cdCAqIEBwYXJhbSBodG1sXG5cdCAqL1xuICBnZXRUYWJsZUhlYWRlckNvbHVtbnNGcm9tSFRNTDogZnVuY3Rpb24gKGhlYWRlclJvd1NlbGVjdG9yLCBodG1sLCBvcHRpb25zID0ge30pIHtcbiAgICB2YXIgJCA9IG9wdGlvbnMuJCB8fCB0aGlzLiRcbiAgICB2YXIgJHRhYmxlID0gJChodG1sKVxuICAgIHZhciAkaGVhZGVyUm93Q29sdW1ucyA9ICR0YWJsZS5maW5kKGhlYWRlclJvd1NlbGVjdG9yKS5maW5kKCd0ZCx0aCcpXG5cbiAgICB2YXIgY29sdW1ucyA9IFtdXG5cbiAgICAkaGVhZGVyUm93Q29sdW1ucy5lYWNoKGZ1bmN0aW9uIChpLCBjb2x1bW5FbCkge1xuICAgICAgdmFyIGhlYWRlciA9ICQoY29sdW1uRWwpLnRleHQoKS50cmltKClcbiAgICAgIHZhciBuYW1lID0gaGVhZGVyXG4gICAgICBpZiAoaGVhZGVyLmxlbmd0aCAhPT0gMCkge1xuICAgICAgICBjb2x1bW5zLnB1c2goe1xuICAgICAgICAgIGhlYWRlcjogaGVhZGVyLFxuICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgZXh0cmFjdDogdHJ1ZVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGNvbHVtbnNcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yVGFibGVcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxudmFyIFNlbGVjdG9yVGV4dCA9IHtcblxuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICB2YXIgZGZkID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICAgIHZhciBlbGVtZW50cyA9IHRoaXMuZ2V0RGF0YUVsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG5cbiAgICB2YXIgcmVzdWx0ID0gW11cbiAgICAkKGVsZW1lbnRzKS5lYWNoKGZ1bmN0aW9uIChrLCBlbGVtZW50KSB7XG4gICAgICB2YXIgZGF0YSA9IHt9XG5cblx0XHRcdC8vIHJlbW92ZSBzY3JpcHQsIHN0eWxlIHRhZyBjb250ZW50cyBmcm9tIHRleHQgcmVzdWx0c1xuICAgICAgdmFyICRlbGVtZW50X2Nsb25lID0gJChlbGVtZW50KS5jbG9uZSgpXG4gICAgICAkZWxlbWVudF9jbG9uZS5maW5kKCdzY3JpcHQsIHN0eWxlJykucmVtb3ZlKClcblx0XHRcdC8vIDxicj4gcmVwbGFjZSBiciB0YWdzIHdpdGggbmV3bGluZXNcbiAgICAgICRlbGVtZW50X2Nsb25lLmZpbmQoJ2JyJykuYWZ0ZXIoJ1xcbicpXG5cbiAgICAgIHZhciB0ZXh0ID0gJGVsZW1lbnRfY2xvbmUudGV4dCgpXG4gICAgICBpZiAodGhpcy5yZWdleCAhPT0gdW5kZWZpbmVkICYmIHRoaXMucmVnZXgubGVuZ3RoKSB7XG4gICAgICAgIHZhciBtYXRjaGVzID0gdGV4dC5tYXRjaChuZXcgUmVnRXhwKHRoaXMucmVnZXgpKVxuICAgICAgICBpZiAobWF0Y2hlcyAhPT0gbnVsbCkge1xuICAgICAgICAgIHRleHQgPSBtYXRjaGVzWzBdXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGV4dCA9IG51bGxcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZGF0YVt0aGlzLmlkXSA9IHRleHRcblxuICAgICAgcmVzdWx0LnB1c2goZGF0YSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICBpZiAodGhpcy5tdWx0aXBsZSA9PT0gZmFsc2UgJiYgZWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICBkYXRhW3RoaXMuaWRdID0gbnVsbFxuICAgICAgcmVzdWx0LnB1c2goZGF0YSlcbiAgICB9XG5cbiAgICBkZmQucmVzb2x2ZShyZXN1bHQpXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbdGhpcy5pZF1cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ3JlZ2V4JywgJ2RlbGF5J11cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yVGV4dFxuIiwidmFyIFNlbGVjdG9yID0gcmVxdWlyZSgnLi9TZWxlY3RvcicpXG5cbnZhciBTZWxlY3Rvckxpc3QgPSBmdW5jdGlvbiAoc2VsZWN0b3JzLCBvcHRpb25zKSB7XG4gIHRoaXMuJCA9IG9wdGlvbnMuJFxuICBpZiAoIW9wdGlvbnMuJCkgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIGpxdWVyeScpXG5cbiAgaWYgKHNlbGVjdG9ycyA9PT0gbnVsbCB8fCBzZWxlY3RvcnMgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVyblxuICB9XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWxlY3RvcnMubGVuZ3RoOyBpKyspIHtcbiAgICB0aGlzLnB1c2goc2VsZWN0b3JzW2ldKVxuICB9XG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUgPSBbXVxuXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgaWYgKCF0aGlzLmhhc1NlbGVjdG9yKHNlbGVjdG9yLmlkKSkge1xuICAgIGlmICghKHNlbGVjdG9yIGluc3RhbmNlb2YgU2VsZWN0b3IpKSB7XG4gICAgICBzZWxlY3RvciA9IG5ldyBTZWxlY3RvcihzZWxlY3RvciwgeyQ6IHRoaXMuJH0pXG4gICAgfVxuICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmNhbGwodGhpcywgc2VsZWN0b3IpXG4gIH1cbn1cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5oYXNTZWxlY3RvciA9IGZ1bmN0aW9uIChzZWxlY3RvcklkKSB7XG4gIGlmIChzZWxlY3RvcklkIGluc3RhbmNlb2YgT2JqZWN0KSB7XG4gICAgc2VsZWN0b3JJZCA9IHNlbGVjdG9ySWQuaWRcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xuICAgIGlmICh0aGlzW2ldLmlkID09PSBzZWxlY3RvcklkKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2Vcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFsbCBzZWxlY3RvcnMgb3IgcmVjdXJzaXZlbHkgZmluZCBhbmQgcmV0dXJuIGFsbCBjaGlsZCBzZWxlY3RvcnMgb2YgYSBwYXJlbnQgc2VsZWN0b3IuXG4gKiBAcGFyYW0gcGFyZW50U2VsZWN0b3JJZFxuICogQHJldHVybnMge0FycmF5fVxuICovXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmdldEFsbFNlbGVjdG9ycyA9IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3RvcklkKSB7XG4gIGlmIChwYXJlbnRTZWxlY3RvcklkID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgdmFyIGdldEFsbENoaWxkU2VsZWN0b3JzID0gZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9ySWQsIHJlc3VsdFNlbGVjdG9ycykge1xuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgIGlmIChzZWxlY3Rvci5oYXNQYXJlbnRTZWxlY3RvcihwYXJlbnRTZWxlY3RvcklkKSkge1xuICAgICAgICBpZiAocmVzdWx0U2VsZWN0b3JzLmluZGV4T2Yoc2VsZWN0b3IpID09PSAtMSkge1xuICAgICAgICAgIHJlc3VsdFNlbGVjdG9ycy5wdXNoKHNlbGVjdG9yKVxuICAgICAgICAgIGdldEFsbENoaWxkU2VsZWN0b3JzKHNlbGVjdG9yLmlkLCByZXN1bHRTZWxlY3RvcnMpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICB9LmJpbmQodGhpcylcblxuICB2YXIgcmVzdWx0U2VsZWN0b3JzID0gW11cbiAgZ2V0QWxsQ2hpbGRTZWxlY3RvcnMocGFyZW50U2VsZWN0b3JJZCwgcmVzdWx0U2VsZWN0b3JzKVxuICByZXR1cm4gcmVzdWx0U2VsZWN0b3JzXG59XG5cbi8qKlxuICogUmV0dXJucyBvbmx5IHNlbGVjdG9ycyB0aGF0IGFyZSBkaXJlY3RseSB1bmRlciBhIHBhcmVudFxuICogQHBhcmFtIHBhcmVudFNlbGVjdG9ySWRcbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqL1xuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5nZXREaXJlY3RDaGlsZFNlbGVjdG9ycyA9IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3RvcklkKSB7XG4gIHZhciByZXN1bHRTZWxlY3RvcnMgPSBuZXcgU2VsZWN0b3JMaXN0KG51bGwsIHskOiB0aGlzLiR9KVxuICB0aGlzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgaWYgKHNlbGVjdG9yLmhhc1BhcmVudFNlbGVjdG9yKHBhcmVudFNlbGVjdG9ySWQpKSB7XG4gICAgICByZXN1bHRTZWxlY3RvcnMucHVzaChzZWxlY3RvcilcbiAgICB9XG4gIH0pXG4gIHJldHVybiByZXN1bHRTZWxlY3RvcnNcbn1cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHJlc3VsdExpc3QgPSBuZXcgU2VsZWN0b3JMaXN0KG51bGwsIHskOiB0aGlzLiR9KVxuICB0aGlzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgcmVzdWx0TGlzdC5wdXNoKHNlbGVjdG9yKVxuICB9KVxuICByZXR1cm4gcmVzdWx0TGlzdFxufVxuXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmZ1bGxDbG9uZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHJlc3VsdExpc3QgPSBuZXcgU2VsZWN0b3JMaXN0KG51bGwsIHskOiB0aGlzLiR9KVxuICB0aGlzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgcmVzdWx0TGlzdC5wdXNoKEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoc2VsZWN0b3IpKSlcbiAgfSlcbiAgcmV0dXJuIHJlc3VsdExpc3Rcbn1cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5jb25jYXQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciByZXN1bHRMaXN0ID0gdGhpcy5jbG9uZSgpXG4gIGZvciAodmFyIGkgaW4gYXJndW1lbnRzKSB7XG4gICAgYXJndW1lbnRzW2ldLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICByZXN1bHRMaXN0LnB1c2goc2VsZWN0b3IpXG4gICAgfSlcbiAgfVxuICByZXR1cm4gcmVzdWx0TGlzdFxufVxuXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmdldFNlbGVjdG9yID0gZnVuY3Rpb24gKHNlbGVjdG9ySWQpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHNlbGVjdG9yID0gdGhpc1tpXVxuICAgIGlmIChzZWxlY3Rvci5pZCA9PT0gc2VsZWN0b3JJZCkge1xuICAgICAgcmV0dXJuIHNlbGVjdG9yXG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogUmV0dXJucyBhbGwgc2VsZWN0b3JzIGlmIHRoaXMgc2VsZWN0b3JzIGluY2x1ZGluZyBhbGwgcGFyZW50IHNlbGVjdG9ycyB3aXRoaW4gdGhpcyBwYWdlXG4gKiBAVE9ETyBub3QgdXNlZCBhbnkgbW9yZS5cbiAqIEBwYXJhbSBzZWxlY3RvcklkXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5nZXRPbmVQYWdlU2VsZWN0b3JzID0gZnVuY3Rpb24gKHNlbGVjdG9ySWQpIHtcbiAgdmFyIHJlc3VsdExpc3QgPSBuZXcgU2VsZWN0b3JMaXN0KG51bGwsIHskOiB0aGlzLiR9KVxuICB2YXIgc2VsZWN0b3IgPSB0aGlzLmdldFNlbGVjdG9yKHNlbGVjdG9ySWQpXG4gIHJlc3VsdExpc3QucHVzaCh0aGlzLmdldFNlbGVjdG9yKHNlbGVjdG9ySWQpKVxuXG5cdC8vIHJlY3Vyc2l2ZWx5IGZpbmQgYWxsIHBhcmVudCBzZWxlY3RvcnMgdGhhdCBjb3VsZCBsZWFkIHRvIHRoZSBwYWdlIHdoZXJlIHNlbGVjdG9ySWQgaXMgdXNlZC5cbiAgdmFyIGZpbmRQYXJlbnRTZWxlY3RvcnMgPSBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICBzZWxlY3Rvci5wYXJlbnRTZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAocGFyZW50U2VsZWN0b3JJZCkge1xuICAgICAgaWYgKHBhcmVudFNlbGVjdG9ySWQgPT09ICdfcm9vdCcpIHJldHVyblxuICAgICAgdmFyIHBhcmVudFNlbGVjdG9yID0gdGhpcy5nZXRTZWxlY3RvcihwYXJlbnRTZWxlY3RvcklkKVxuICAgICAgaWYgKHJlc3VsdExpc3QuaW5kZXhPZihwYXJlbnRTZWxlY3RvcikgIT09IC0xKSByZXR1cm5cbiAgICAgIGlmIChwYXJlbnRTZWxlY3Rvci53aWxsUmV0dXJuRWxlbWVudHMoKSkge1xuICAgICAgICByZXN1bHRMaXN0LnB1c2gocGFyZW50U2VsZWN0b3IpXG4gICAgICAgIGZpbmRQYXJlbnRTZWxlY3RvcnMocGFyZW50U2VsZWN0b3IpXG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LmJpbmQodGhpcylcblxuICBmaW5kUGFyZW50U2VsZWN0b3JzKHNlbGVjdG9yKVxuXG5cdC8vIGFkZCBhbGwgY2hpbGQgc2VsZWN0b3JzXG4gIHJlc3VsdExpc3QgPSByZXN1bHRMaXN0LmNvbmNhdCh0aGlzLmdldFNpbmdsZVBhZ2VBbGxDaGlsZFNlbGVjdG9ycyhzZWxlY3Rvci5pZCkpXG4gIHJldHVybiByZXN1bHRMaXN0XG59XG5cbi8qKlxuICogUmV0dXJucyBhbGwgY2hpbGQgc2VsZWN0b3JzIG9mIGEgc2VsZWN0b3Igd2hpY2ggY2FuIGJlIHVzZWQgd2l0aGluIG9uZSBwYWdlLlxuICogQHBhcmFtIHBhcmVudFNlbGVjdG9ySWRcbiAqL1xuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5nZXRTaW5nbGVQYWdlQWxsQ2hpbGRTZWxlY3RvcnMgPSBmdW5jdGlvbiAocGFyZW50U2VsZWN0b3JJZCkge1xuICB2YXIgcmVzdWx0TGlzdCA9IG5ldyBTZWxlY3Rvckxpc3QobnVsbCwgeyQ6IHRoaXMuJH0pXG4gIHZhciBhZGRDaGlsZFNlbGVjdG9ycyA9IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3Rvcikge1xuICAgIGlmIChwYXJlbnRTZWxlY3Rvci53aWxsUmV0dXJuRWxlbWVudHMoKSkge1xuICAgICAgdmFyIGNoaWxkU2VsZWN0b3JzID0gdGhpcy5nZXREaXJlY3RDaGlsZFNlbGVjdG9ycyhwYXJlbnRTZWxlY3Rvci5pZClcbiAgICAgIGNoaWxkU2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKGNoaWxkU2VsZWN0b3IpIHtcbiAgICAgICAgaWYgKHJlc3VsdExpc3QuaW5kZXhPZihjaGlsZFNlbGVjdG9yKSA9PT0gLTEpIHtcbiAgICAgICAgICByZXN1bHRMaXN0LnB1c2goY2hpbGRTZWxlY3RvcilcbiAgICAgICAgICBhZGRDaGlsZFNlbGVjdG9ycyhjaGlsZFNlbGVjdG9yKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgfS5iaW5kKHRoaXMpXG5cbiAgdmFyIHBhcmVudFNlbGVjdG9yID0gdGhpcy5nZXRTZWxlY3RvcihwYXJlbnRTZWxlY3RvcklkKVxuICBhZGRDaGlsZFNlbGVjdG9ycyhwYXJlbnRTZWxlY3RvcilcbiAgcmV0dXJuIHJlc3VsdExpc3Rcbn1cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS53aWxsUmV0dXJuTXVsdGlwbGVSZWNvcmRzID0gZnVuY3Rpb24gKHNlbGVjdG9ySWQpIHtcblx0Ly8gaGFuZGxlIHJldXFlc3RlZCBzZWxlY3RvclxuICB2YXIgc2VsZWN0b3IgPSB0aGlzLmdldFNlbGVjdG9yKHNlbGVjdG9ySWQpXG4gIGlmIChzZWxlY3Rvci53aWxsUmV0dXJuTXVsdGlwbGVSZWNvcmRzKCkgPT09IHRydWUpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG5cblx0Ly8gaGFuZGxlIGFsbCBpdHMgY2hpbGQgc2VsZWN0b3JzXG4gIHZhciBjaGlsZFNlbGVjdG9ycyA9IHRoaXMuZ2V0QWxsU2VsZWN0b3JzKHNlbGVjdG9ySWQpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRTZWxlY3RvcnMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgc2VsZWN0b3IgPSBjaGlsZFNlbGVjdG9yc1tpXVxuICAgIGlmIChzZWxlY3Rvci53aWxsUmV0dXJuTXVsdGlwbGVSZWNvcmRzKCkgPT09IHRydWUpIHtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlXG59XG5cbi8qKlxuICogV2hlbiBzZXJpYWxpemluZyB0byBKU09OIGNvbnZlcnQgdG8gYW4gYXJyYXlcbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqL1xuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiAoKSB7XG4gIHZhciByZXN1bHQgPSBbXVxuICB0aGlzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgcmVzdWx0LnB1c2goc2VsZWN0b3IpXG4gIH0pXG4gIHJldHVybiByZXN1bHRcbn1cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5nZXRTZWxlY3RvckJ5SWQgPSBmdW5jdGlvbiAoc2VsZWN0b3JJZCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgc2VsZWN0b3IgPSB0aGlzW2ldXG4gICAgaWYgKHNlbGVjdG9yLmlkID09PSBzZWxlY3RvcklkKSB7XG4gICAgICByZXR1cm4gc2VsZWN0b3JcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiByZXR1cm5zIGNzcyBzZWxlY3RvciBmb3IgYSBnaXZlbiBlbGVtZW50LiBjc3Mgc2VsZWN0b3IgaW5jbHVkZXMgYWxsIHBhcmVudCBlbGVtZW50IHNlbGVjdG9yc1xuICogQHBhcmFtIHNlbGVjdG9ySWRcbiAqIEBwYXJhbSBwYXJlbnRTZWxlY3RvcklkcyBhcnJheSBvZiBwYXJlbnQgc2VsZWN0b3IgaWRzIGZyb20gZGV2dG9vbHMgQnJlYWRjdW1iXG4gKiBAcmV0dXJucyBzdHJpbmdcbiAqL1xuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5nZXRDU1NTZWxlY3RvcldpdGhpbk9uZVBhZ2UgPSBmdW5jdGlvbiAoc2VsZWN0b3JJZCwgcGFyZW50U2VsZWN0b3JJZHMpIHtcbiAgdmFyIENTU1NlbGVjdG9yID0gdGhpcy5nZXRTZWxlY3RvcihzZWxlY3RvcklkKS5zZWxlY3RvclxuICB2YXIgcGFyZW50Q1NTU2VsZWN0b3IgPSB0aGlzLmdldFBhcmVudENTU1NlbGVjdG9yV2l0aGluT25lUGFnZShwYXJlbnRTZWxlY3RvcklkcylcbiAgQ1NTU2VsZWN0b3IgPSBwYXJlbnRDU1NTZWxlY3RvciArIENTU1NlbGVjdG9yXG5cbiAgcmV0dXJuIENTU1NlbGVjdG9yXG59XG5cbi8qKlxuICogcmV0dXJucyBjc3Mgc2VsZWN0b3IgZm9yIHBhcmVudCBzZWxlY3RvcnMgdGhhdCBhcmUgd2l0aGluIG9uZSBwYWdlXG4gKiBAcGFyYW0gcGFyZW50U2VsZWN0b3JJZHMgYXJyYXkgb2YgcGFyZW50IHNlbGVjdG9yIGlkcyBmcm9tIGRldnRvb2xzIEJyZWFkY3VtYlxuICogQHJldHVybnMgc3RyaW5nXG4gKi9cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZ2V0UGFyZW50Q1NTU2VsZWN0b3JXaXRoaW5PbmVQYWdlID0gZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9ySWRzKSB7XG4gIHZhciBDU1NTZWxlY3RvciA9ICcnXG5cbiAgZm9yICh2YXIgaSA9IHBhcmVudFNlbGVjdG9ySWRzLmxlbmd0aCAtIDE7IGkgPiAwOyBpLS0pIHtcbiAgICB2YXIgcGFyZW50U2VsZWN0b3JJZCA9IHBhcmVudFNlbGVjdG9ySWRzW2ldXG4gICAgdmFyIHBhcmVudFNlbGVjdG9yID0gdGhpcy5nZXRTZWxlY3RvcihwYXJlbnRTZWxlY3RvcklkKVxuICAgIGlmIChwYXJlbnRTZWxlY3Rvci53aWxsUmV0dXJuRWxlbWVudHMoKSkge1xuICAgICAgQ1NTU2VsZWN0b3IgPSBwYXJlbnRTZWxlY3Rvci5zZWxlY3RvciArICcgJyArIENTU1NlbGVjdG9yXG4gICAgfSBlbHNlIHtcbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIENTU1NlbGVjdG9yXG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuaGFzUmVjdXJzaXZlRWxlbWVudFNlbGVjdG9ycyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIFJlY3Vyc2lvbkZvdW5kID0gZmFsc2VcblxuICB0aGlzLmZvckVhY2goZnVuY3Rpb24gKHRvcFNlbGVjdG9yKSB7XG4gICAgdmFyIHZpc2l0ZWRTZWxlY3RvcnMgPSBbXVxuXG4gICAgdmFyIGNoZWNrUmVjdXJzaW9uID0gZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9yKSB7XG5cdFx0XHQvLyBhbHJlYWR5IHZpc2l0ZWRcbiAgICAgIGlmICh2aXNpdGVkU2VsZWN0b3JzLmluZGV4T2YocGFyZW50U2VsZWN0b3IpICE9PSAtMSkge1xuICAgICAgICBSZWN1cnNpb25Gb3VuZCA9IHRydWVcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIGlmIChwYXJlbnRTZWxlY3Rvci53aWxsUmV0dXJuRWxlbWVudHMoKSkge1xuICAgICAgICB2aXNpdGVkU2VsZWN0b3JzLnB1c2gocGFyZW50U2VsZWN0b3IpXG4gICAgICAgIHZhciBjaGlsZFNlbGVjdG9ycyA9IHRoaXMuZ2V0RGlyZWN0Q2hpbGRTZWxlY3RvcnMocGFyZW50U2VsZWN0b3IuaWQpXG4gICAgICAgIGNoaWxkU2VsZWN0b3JzLmZvckVhY2goY2hlY2tSZWN1cnNpb24pXG4gICAgICAgIHZpc2l0ZWRTZWxlY3RvcnMucG9wKClcbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcylcblxuICAgIGNoZWNrUmVjdXJzaW9uKHRvcFNlbGVjdG9yKVxuICB9LmJpbmQodGhpcykpXG5cbiAgcmV0dXJuIFJlY3Vyc2lvbkZvdW5kXG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JMaXN0XG4iLCJ2YXIgU2VsZWN0b3JFbGVtZW50ID0gcmVxdWlyZSgnLi9TZWxlY3Rvci9TZWxlY3RvckVsZW1lbnQnKVxudmFyIFNlbGVjdG9yRWxlbWVudEF0dHJpYnV0ZSA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JFbGVtZW50QXR0cmlidXRlJylcbnZhciBTZWxlY3RvckVsZW1lbnRDbGljayA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JFbGVtZW50Q2xpY2snKVxudmFyIFNlbGVjdG9yRWxlbWVudFNjcm9sbCA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JFbGVtZW50U2Nyb2xsJylcbnZhciBTZWxlY3Rvckdyb3VwID0gcmVxdWlyZSgnLi9TZWxlY3Rvci9TZWxlY3Rvckdyb3VwJylcbnZhciBTZWxlY3RvckhUTUwgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9ySFRNTCcpXG52YXIgU2VsZWN0b3JJbWFnZSA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JJbWFnZScpXG52YXIgU2VsZWN0b3JMaW5rID0gcmVxdWlyZSgnLi9TZWxlY3Rvci9TZWxlY3RvckxpbmsnKVxudmFyIFNlbGVjdG9yUG9wdXBMaW5rID0gcmVxdWlyZSgnLi9TZWxlY3Rvci9TZWxlY3RvclBvcHVwTGluaycpXG52YXIgU2VsZWN0b3JUYWJsZSA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JUYWJsZScpXG52YXIgU2VsZWN0b3JUZXh0ID0gcmVxdWlyZSgnLi9TZWxlY3Rvci9TZWxlY3RvclRleHQnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgU2VsZWN0b3JFbGVtZW50LFxuICBTZWxlY3RvckVsZW1lbnRBdHRyaWJ1dGUsXG4gIFNlbGVjdG9yRWxlbWVudENsaWNrLFxuICBTZWxlY3RvckVsZW1lbnRTY3JvbGwsXG4gIFNlbGVjdG9yR3JvdXAsXG4gIFNlbGVjdG9ySFRNTCxcbiAgU2VsZWN0b3JJbWFnZSxcbiAgU2VsZWN0b3JMaW5rLFxuICBTZWxlY3RvclBvcHVwTGluayxcbiAgU2VsZWN0b3JUYWJsZSxcbiAgU2VsZWN0b3JUZXh0XG59XG4iLCJ2YXIgU2VsZWN0b3IgPSByZXF1aXJlKCcuL1NlbGVjdG9yJylcbnZhciBTZWxlY3Rvckxpc3QgPSByZXF1aXJlKCcuL1NlbGVjdG9yTGlzdCcpXG52YXIgU2l0ZW1hcCA9IGZ1bmN0aW9uIChzaXRlbWFwT2JqLCBvcHRpb25zKSB7XG4gIHRoaXMuJCA9IG9wdGlvbnMuJFxuICBpZiAoIW9wdGlvbnMuJCkgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIGpxdWVyeScpXG4gIHRoaXMuaW5pdERhdGEoc2l0ZW1hcE9iailcbn1cblxuU2l0ZW1hcC5wcm90b3R5cGUgPSB7XG5cbiAgaW5pdERhdGE6IGZ1bmN0aW9uIChzaXRlbWFwT2JqKSB7XG4gICAgY29uc29sZS5sb2codGhpcylcbiAgICBmb3IgKHZhciBrZXkgaW4gc2l0ZW1hcE9iaikge1xuICAgICAgY29uc29sZS5sb2coa2V5KVxuICAgICAgdGhpc1trZXldID0gc2l0ZW1hcE9ialtrZXldXG4gICAgfVxuICAgIGNvbnNvbGUubG9nKHRoaXMpXG5cbiAgICB2YXIgc2VsZWN0b3JzID0gdGhpcy5zZWxlY3RvcnNcbiAgICB0aGlzLnNlbGVjdG9ycyA9IG5ldyBTZWxlY3Rvckxpc3QodGhpcy5zZWxlY3RvcnMsIHskOiB0aGlzLiR9KVxuICB9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIGFsbCBzZWxlY3RvcnMgb3IgcmVjdXJzaXZlbHkgZmluZCBhbmQgcmV0dXJuIGFsbCBjaGlsZCBzZWxlY3RvcnMgb2YgYSBwYXJlbnQgc2VsZWN0b3IuXG5cdCAqIEBwYXJhbSBwYXJlbnRTZWxlY3RvcklkXG5cdCAqIEByZXR1cm5zIHtBcnJheX1cblx0ICovXG4gIGdldEFsbFNlbGVjdG9yczogZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9ySWQpIHtcbiAgICByZXR1cm4gdGhpcy5zZWxlY3RvcnMuZ2V0QWxsU2VsZWN0b3JzKHBhcmVudFNlbGVjdG9ySWQpXG4gIH0sXG5cblx0LyoqXG5cdCAqIFJldHVybnMgb25seSBzZWxlY3RvcnMgdGhhdCBhcmUgZGlyZWN0bHkgdW5kZXIgYSBwYXJlbnRcblx0ICogQHBhcmFtIHBhcmVudFNlbGVjdG9ySWRcblx0ICogQHJldHVybnMge0FycmF5fVxuXHQgKi9cbiAgZ2V0RGlyZWN0Q2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3RvcklkKSB7XG4gICAgcmV0dXJuIHRoaXMuc2VsZWN0b3JzLmdldERpcmVjdENoaWxkU2VsZWN0b3JzKHBhcmVudFNlbGVjdG9ySWQpXG4gIH0sXG5cblx0LyoqXG5cdCAqIFJldHVybnMgYWxsIHNlbGVjdG9yIGlkIHBhcmFtZXRlcnNcblx0ICogQHJldHVybnMge0FycmF5fVxuXHQgKi9cbiAgZ2V0U2VsZWN0b3JJZHM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaWRzID0gWydfcm9vdCddXG4gICAgdGhpcy5zZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgIGlkcy5wdXNoKHNlbGVjdG9yLmlkKVxuICAgIH0pXG4gICAgcmV0dXJuIGlkc1xuICB9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIG9ubHkgc2VsZWN0b3IgaWRzIHdoaWNoIGNhbiBoYXZlIGNoaWxkIHNlbGVjdG9yc1xuXHQgKiBAcmV0dXJucyB7QXJyYXl9XG5cdCAqL1xuICBnZXRQb3NzaWJsZVBhcmVudFNlbGVjdG9ySWRzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGlkcyA9IFsnX3Jvb3QnXVxuICAgIHRoaXMuc2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICBpZiAoc2VsZWN0b3IuY2FuSGF2ZUNoaWxkU2VsZWN0b3JzKCkpIHtcbiAgICAgICAgaWRzLnB1c2goc2VsZWN0b3IuaWQpXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gaWRzXG4gIH0sXG5cbiAgZ2V0U3RhcnRVcmxzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN0YXJ0VXJscyA9IHRoaXMuc3RhcnRVcmxcblx0XHQvLyBzaW5nbGUgc3RhcnQgdXJsXG4gICAgaWYgKHRoaXMuc3RhcnRVcmwucHVzaCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBzdGFydFVybHMgPSBbc3RhcnRVcmxzXVxuICAgIH1cblxuICAgIHZhciB1cmxzID0gW11cbiAgICBzdGFydFVybHMuZm9yRWFjaChmdW5jdGlvbiAoc3RhcnRVcmwpIHtcblx0XHRcdC8vIHplcm8gcGFkZGluZyBoZWxwZXJcbiAgICAgIHZhciBscGFkID0gZnVuY3Rpb24gKHN0ciwgbGVuZ3RoKSB7XG4gICAgICAgIHdoaWxlIChzdHIubGVuZ3RoIDwgbGVuZ3RoKSB7IHN0ciA9ICcwJyArIHN0ciB9XG4gICAgICAgIHJldHVybiBzdHJcbiAgICAgIH1cblxuICAgICAgdmFyIHJlID0gL14oLio/KVxcWyhcXGQrKVxcLShcXGQrKSg6KFxcZCspKT9cXF0oLiopJC9cbiAgICAgIHZhciBtYXRjaGVzID0gc3RhcnRVcmwubWF0Y2gocmUpXG4gICAgICBpZiAobWF0Y2hlcykge1xuICAgICAgICB2YXIgc3RhcnRTdHIgPSBtYXRjaGVzWzJdXG4gICAgICAgIHZhciBlbmRTdHIgPSBtYXRjaGVzWzNdXG4gICAgICAgIHZhciBzdGFydCA9IHBhcnNlSW50KHN0YXJ0U3RyKVxuICAgICAgICB2YXIgZW5kID0gcGFyc2VJbnQoZW5kU3RyKVxuICAgICAgICB2YXIgaW5jcmVtZW50YWwgPSAxXG4gICAgICAgIGNvbnNvbGUubG9nKG1hdGNoZXNbNV0pXG4gICAgICAgIGlmIChtYXRjaGVzWzVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpbmNyZW1lbnRhbCA9IHBhcnNlSW50KG1hdGNoZXNbNV0pXG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDw9IGVuZDsgaSArPSBpbmNyZW1lbnRhbCkge1xuXHRcdFx0XHRcdC8vIHdpdGggemVybyBwYWRkaW5nXG4gICAgICAgICAgaWYgKHN0YXJ0U3RyLmxlbmd0aCA9PT0gZW5kU3RyLmxlbmd0aCkge1xuICAgICAgICAgICAgdXJscy5wdXNoKG1hdGNoZXNbMV0gKyBscGFkKGkudG9TdHJpbmcoKSwgc3RhcnRTdHIubGVuZ3RoKSArIG1hdGNoZXNbNl0pXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHVybHMucHVzaChtYXRjaGVzWzFdICsgaSArIG1hdGNoZXNbNl0pXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1cmxzXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB1cmxzLnB1c2goc3RhcnRVcmwpXG4gICAgICB9XG4gICAgfSlcblxuICAgIHJldHVybiB1cmxzXG4gIH0sXG5cbiAgdXBkYXRlU2VsZWN0b3I6IGZ1bmN0aW9uIChzZWxlY3Rvciwgc2VsZWN0b3JEYXRhKSB7XG5cdFx0Ly8gc2VsZWN0b3IgaXMgdW5kZWZpbmVkIHdoZW4gY3JlYXRpbmcgYSBuZXcgb25lXG4gICAgaWYgKHNlbGVjdG9yID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHNlbGVjdG9yID0gbmV3IFNlbGVjdG9yKHNlbGVjdG9yRGF0YSwgeyQ6IHRoaXMuJH0pXG4gICAgfVxuXG5cdFx0Ly8gdXBkYXRlIGNoaWxkIHNlbGVjdG9yc1xuICAgIGlmIChzZWxlY3Rvci5pZCAhPT0gdW5kZWZpbmVkICYmIHNlbGVjdG9yLmlkICE9PSBzZWxlY3RvckRhdGEuaWQpIHtcbiAgICAgIHRoaXMuc2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKGN1cnJlbnRTZWxlY3Rvcikge1xuICAgICAgICBjdXJyZW50U2VsZWN0b3IucmVuYW1lUGFyZW50U2VsZWN0b3Ioc2VsZWN0b3IuaWQsIHNlbGVjdG9yRGF0YS5pZClcbiAgICAgIH0pXG5cblx0XHRcdC8vIHVwZGF0ZSBjeWNsaWMgc2VsZWN0b3JcbiAgICAgIHZhciBwb3MgPSBzZWxlY3RvckRhdGEucGFyZW50U2VsZWN0b3JzLmluZGV4T2Yoc2VsZWN0b3IuaWQpXG4gICAgICBpZiAocG9zICE9PSAtMSkge1xuICAgICAgICBzZWxlY3RvckRhdGEucGFyZW50U2VsZWN0b3JzLnNwbGljZShwb3MsIDEsIHNlbGVjdG9yRGF0YS5pZClcbiAgICAgIH1cbiAgICB9XG5cbiAgICBzZWxlY3Rvci51cGRhdGVEYXRhKHNlbGVjdG9yRGF0YSlcblxuICAgIGlmICh0aGlzLmdldFNlbGVjdG9ySWRzKCkuaW5kZXhPZihzZWxlY3Rvci5pZCkgPT09IC0xKSB7XG4gICAgICB0aGlzLnNlbGVjdG9ycy5wdXNoKHNlbGVjdG9yKVxuICAgIH1cbiAgfSxcbiAgZGVsZXRlU2VsZWN0b3I6IGZ1bmN0aW9uIChzZWxlY3RvclRvRGVsZXRlKSB7XG4gICAgdGhpcy5zZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgIGlmIChzZWxlY3Rvci5oYXNQYXJlbnRTZWxlY3RvcihzZWxlY3RvclRvRGVsZXRlLmlkKSkge1xuICAgICAgICBzZWxlY3Rvci5yZW1vdmVQYXJlbnRTZWxlY3RvcihzZWxlY3RvclRvRGVsZXRlLmlkKVxuICAgICAgICBpZiAoc2VsZWN0b3IucGFyZW50U2VsZWN0b3JzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIHRoaXMuZGVsZXRlU2VsZWN0b3Ioc2VsZWN0b3IpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICBmb3IgKHZhciBpIGluIHRoaXMuc2VsZWN0b3JzKSB7XG4gICAgICBpZiAodGhpcy5zZWxlY3RvcnNbaV0uaWQgPT09IHNlbGVjdG9yVG9EZWxldGUuaWQpIHtcbiAgICAgICAgdGhpcy5zZWxlY3RvcnMuc3BsaWNlKGksIDEpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuICB9LFxuICBnZXREYXRhVGFibGVJZDogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9pZC5yZXBsYWNlKC9cXC4vZywgJ18nKVxuICB9LFxuICBleHBvcnRTaXRlbWFwOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNpdGVtYXBPYmogPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMpKVxuICAgIGRlbGV0ZSBzaXRlbWFwT2JqLl9yZXZcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoc2l0ZW1hcE9iailcbiAgfSxcbiAgaW1wb3J0U2l0ZW1hcDogZnVuY3Rpb24gKHNpdGVtYXBKU09OKSB7XG4gICAgdmFyIHNpdGVtYXBPYmogPSBKU09OLnBhcnNlKHNpdGVtYXBKU09OKVxuICAgIHRoaXMuaW5pdERhdGEoc2l0ZW1hcE9iailcbiAgfSxcblx0Ly8gcmV0dXJuIGEgbGlzdCBvZiBjb2x1bW5zIHRoYW4gY2FuIGJlIGV4cG9ydGVkXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNvbHVtbnMgPSBbXVxuICAgIHRoaXMuc2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICBjb2x1bW5zID0gY29sdW1ucy5jb25jYXQoc2VsZWN0b3IuZ2V0RGF0YUNvbHVtbnMoKSlcbiAgICB9KVxuXG4gICAgcmV0dXJuIGNvbHVtbnNcbiAgfSxcbiAgZ2V0RGF0YUV4cG9ydENzdkJsb2I6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdmFyIGNvbHVtbnMgPSB0aGlzLmdldERhdGFDb2x1bW5zKCksXG4gICAgICBkZWxpbWl0ZXIgPSAnLCcsXG4gICAgICBuZXdsaW5lID0gJ1xcbicsXG4gICAgICBjc3ZEYXRhID0gWydcXHVmZWZmJ10gLy8gdXRmLTggYm9tIGNoYXJcblxuXHRcdC8vIGhlYWRlclxuICAgIGNzdkRhdGEucHVzaChjb2x1bW5zLmpvaW4oZGVsaW1pdGVyKSArIG5ld2xpbmUpXG5cblx0XHQvLyBkYXRhXG4gICAgZGF0YS5mb3JFYWNoKGZ1bmN0aW9uIChyb3cpIHtcbiAgICAgIHZhciByb3dEYXRhID0gW11cbiAgICAgIGNvbHVtbnMuZm9yRWFjaChmdW5jdGlvbiAoY29sdW1uKSB7XG4gICAgICAgIHZhciBjZWxsRGF0YSA9IHJvd1tjb2x1bW5dXG4gICAgICAgIGlmIChjZWxsRGF0YSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY2VsbERhdGEgPSAnJ1xuICAgICAgICB9XHRcdFx0XHRlbHNlIGlmICh0eXBlb2YgY2VsbERhdGEgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgY2VsbERhdGEgPSBKU09OLnN0cmluZ2lmeShjZWxsRGF0YSlcbiAgICAgICAgfVxuXG4gICAgICAgIHJvd0RhdGEucHVzaCgnXCInICsgY2VsbERhdGEucmVwbGFjZSgvXCIvZywgJ1wiXCInKS50cmltKCkgKyAnXCInKVxuICAgICAgfSlcbiAgICAgIGNzdkRhdGEucHVzaChyb3dEYXRhLmpvaW4oZGVsaW1pdGVyKSArIG5ld2xpbmUpXG4gICAgfSlcblxuICAgIHJldHVybiBuZXcgQmxvYihjc3ZEYXRhLCB7dHlwZTogJ3RleHQvY3N2J30pXG4gIH0sXG4gIGdldFNlbGVjdG9yQnlJZDogZnVuY3Rpb24gKHNlbGVjdG9ySWQpIHtcbiAgICByZXR1cm4gdGhpcy5zZWxlY3RvcnMuZ2V0U2VsZWN0b3JCeUlkKHNlbGVjdG9ySWQpXG4gIH0sXG5cdC8qKlxuXHQgKiBDcmVhdGUgZnVsbCBjbG9uZSBvZiBzaXRlbWFwXG5cdCAqIEByZXR1cm5zIHtTaXRlbWFwfVxuXHQgKi9cbiAgY2xvbmU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2xvbmVkSlNPTiA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcykpXG4gICAgdmFyIHNpdGVtYXAgPSBuZXcgU2l0ZW1hcChjbG9uZWRKU09OKVxuICAgIHJldHVybiBzaXRlbWFwXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTaXRlbWFwXG4iLCJ2YXIgU2l0ZW1hcCA9IHJlcXVpcmUoJy4vU2l0ZW1hcCcpXG5cbi8qKlxuICogRnJvbSBkZXZ0b29scyBwYW5lbCB0aGVyZSBpcyBubyBwb3NzaWJpbGl0eSB0byBleGVjdXRlIFhIUiByZXF1ZXN0cy4gU28gYWxsIHJlcXVlc3RzIHRvIGEgcmVtb3RlIENvdWNoRGIgbXVzdCBiZVxuICogaGFuZGxlZCB0aHJvdWdoIEJhY2tncm91bmQgcGFnZS4gU3RvcmVEZXZ0b29scyBpcyBhIHNpbXBseSBhIHByb3h5IHN0b3JlXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIFN0b3JlRGV2dG9vbHMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICB0aGlzLiQgPSBvcHRpb25zLiRcbiAgaWYgKCF0aGlzLiQpIHRocm93IG5ldyBFcnJvcignanF1ZXJ5IHJlcXVpcmVkJylcbn1cblxuU3RvcmVEZXZ0b29scy5wcm90b3R5cGUgPSB7XG4gIGNyZWF0ZVNpdGVtYXA6IGZ1bmN0aW9uIChzaXRlbWFwLCBjYWxsYmFjaykge1xuICAgIHZhciByZXF1ZXN0ID0ge1xuICAgICAgY3JlYXRlU2l0ZW1hcDogdHJ1ZSxcbiAgICAgIHNpdGVtYXA6IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoc2l0ZW1hcCkpXG4gICAgfVxuXG4gICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UocmVxdWVzdCwgZnVuY3Rpb24gKGNhbGxiYWNrRm4sIG9yaWdpbmFsU2l0ZW1hcCwgbmV3U2l0ZW1hcCkge1xuICAgICAgb3JpZ2luYWxTaXRlbWFwLl9yZXYgPSBuZXdTaXRlbWFwLl9yZXZcbiAgICAgIGNhbGxiYWNrRm4ob3JpZ2luYWxTaXRlbWFwKVxuICAgIH0uYmluZCh0aGlzLCBjYWxsYmFjaywgc2l0ZW1hcCkpXG4gIH0sXG4gIHNhdmVTaXRlbWFwOiBmdW5jdGlvbiAoc2l0ZW1hcCwgY2FsbGJhY2spIHtcbiAgICB0aGlzLmNyZWF0ZVNpdGVtYXAoc2l0ZW1hcCwgY2FsbGJhY2spXG4gIH0sXG4gIGRlbGV0ZVNpdGVtYXA6IGZ1bmN0aW9uIChzaXRlbWFwLCBjYWxsYmFjaykge1xuICAgIHZhciByZXF1ZXN0ID0ge1xuICAgICAgZGVsZXRlU2l0ZW1hcDogdHJ1ZSxcbiAgICAgIHNpdGVtYXA6IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoc2l0ZW1hcCkpXG4gICAgfVxuICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHJlcXVlc3QsIGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgY2FsbGJhY2soKVxuICAgIH0pXG4gIH0sXG4gIGdldEFsbFNpdGVtYXBzOiBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIHZhciByZXF1ZXN0ID0ge1xuICAgICAgZ2V0QWxsU2l0ZW1hcHM6IHRydWVcbiAgICB9XG5cbiAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZShyZXF1ZXN0LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgIHZhciBzaXRlbWFwcyA9IFtdXG5cbiAgICAgIGZvciAodmFyIGkgaW4gcmVzcG9uc2UpIHtcbiAgICAgICAgc2l0ZW1hcHMucHVzaChuZXcgU2l0ZW1hcChyZXNwb25zZVtpXSwgeyR9KSlcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKHNpdGVtYXBzKVxuICAgIH0pXG4gIH0sXG4gIGdldFNpdGVtYXBEYXRhOiBmdW5jdGlvbiAoc2l0ZW1hcCwgY2FsbGJhY2spIHtcbiAgICB2YXIgcmVxdWVzdCA9IHtcbiAgICAgIGdldFNpdGVtYXBEYXRhOiB0cnVlLFxuICAgICAgc2l0ZW1hcDogSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzaXRlbWFwKSlcbiAgICB9XG5cbiAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZShyZXF1ZXN0LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKVxuICAgIH0pXG4gIH0sXG4gIHNpdGVtYXBFeGlzdHM6IGZ1bmN0aW9uIChzaXRlbWFwSWQsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICBzaXRlbWFwRXhpc3RzOiB0cnVlLFxuICAgICAgc2l0ZW1hcElkOiBzaXRlbWFwSWRcbiAgICB9XG5cbiAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZShyZXF1ZXN0LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKVxuICAgIH0pXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTdG9yZURldnRvb2xzXG4iLCJ2YXIgQ3NzU2VsZWN0b3IgPSByZXF1aXJlKCdjc3Mtc2VsZWN0b3InKS5Dc3NTZWxlY3RvclxuLy8gVE9ETyBnZXQgcmlkIG9mIGpxdWVyeVxuXG4vKipcbiAqIE9ubHkgRWxlbWVudHMgdW5pcXVlIHdpbGwgYmUgYWRkZWQgdG8gdGhpcyBhcnJheVxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFVuaXF1ZUVsZW1lbnRMaXN0IChjbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSwgb3B0aW9ucykge1xuICB0aGlzLiQgPSBvcHRpb25zLiRcbiAgaWYgKCF0aGlzLiQpIHRocm93IG5ldyBFcnJvcignanF1ZXJ5IHJlcXVpcmVkJylcbiAgdGhpcy5jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSA9IGNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlXG4gIHRoaXMuYWRkZWRFbGVtZW50cyA9IHt9XG59XG5cblVuaXF1ZUVsZW1lbnRMaXN0LnByb3RvdHlwZSA9IFtdXG5cblVuaXF1ZUVsZW1lbnRMaXN0LnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgdmFyICQgPSB0aGlzLiRcbiAgaWYgKHRoaXMuaXNBZGRlZChlbGVtZW50KSkge1xuICAgIHJldHVybiBmYWxzZVxuICB9IGVsc2Uge1xuICAgIHZhciBlbGVtZW50VW5pcXVlSWQgPSB0aGlzLmdldEVsZW1lbnRVbmlxdWVJZChlbGVtZW50KVxuICAgIHRoaXMuYWRkZWRFbGVtZW50c1tlbGVtZW50VW5pcXVlSWRdID0gdHJ1ZVxuICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmNhbGwodGhpcywgJChlbGVtZW50KS5jbG9uZSh0cnVlKVswXSlcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG59XG5cblVuaXF1ZUVsZW1lbnRMaXN0LnByb3RvdHlwZS5nZXRFbGVtZW50VW5pcXVlSWQgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICB2YXIgJCA9IHRoaXMuJFxuICBpZiAodGhpcy5jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSA9PT0gJ3VuaXF1ZVRleHQnKSB7XG4gICAgdmFyIGVsZW1lbnRUZXh0ID0gJChlbGVtZW50KS50ZXh0KCkudHJpbSgpXG4gICAgcmV0dXJuIGVsZW1lbnRUZXh0XG4gIH0gZWxzZSBpZiAodGhpcy5jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSA9PT0gJ3VuaXF1ZUhUTUxUZXh0Jykge1xuICAgIHZhciBlbGVtZW50SFRNTCA9ICQoXCI8ZGl2IGNsYXNzPSctd2ViLXNjcmFwZXItc2hvdWxkLW5vdC1iZS12aXNpYmxlJz5cIikuYXBwZW5kKCQoZWxlbWVudCkuZXEoMCkuY2xvbmUoKSkuaHRtbCgpXG4gICAgcmV0dXJuIGVsZW1lbnRIVE1MXG4gIH0gZWxzZSBpZiAodGhpcy5jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSA9PT0gJ3VuaXF1ZUhUTUwnKSB7XG5cdFx0Ly8gZ2V0IGVsZW1lbnQgd2l0aG91dCB0ZXh0XG4gICAgdmFyICRlbGVtZW50ID0gJChlbGVtZW50KS5lcSgwKS5jbG9uZSgpXG5cbiAgICB2YXIgcmVtb3ZlVGV4dCA9IGZ1bmN0aW9uICgkZWxlbWVudCkge1xuICAgICAgJGVsZW1lbnQuY29udGVudHMoKVxuXHRcdFx0XHQuZmlsdGVyKGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMubm9kZVR5cGUgIT09IDMpIHtcbiAgICByZW1vdmVUZXh0KCQodGhpcykpXG4gIH1cbiAgcmV0dXJuIHRoaXMubm9kZVR5cGUgPT0gMyAvLyBOb2RlLlRFWFRfTk9ERVxufSkucmVtb3ZlKClcbiAgICB9XG4gICAgcmVtb3ZlVGV4dCgkZWxlbWVudClcblxuICAgIHZhciBlbGVtZW50SFRNTCA9ICQoXCI8ZGl2IGNsYXNzPSctd2ViLXNjcmFwZXItc2hvdWxkLW5vdC1iZS12aXNpYmxlJz5cIikuYXBwZW5kKCRlbGVtZW50KS5odG1sKClcbiAgICByZXR1cm4gZWxlbWVudEhUTUxcbiAgfSBlbHNlIGlmICh0aGlzLmNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlID09PSAndW5pcXVlQ1NTU2VsZWN0b3InKSB7XG4gICAgdmFyIGNzID0gbmV3IENzc1NlbGVjdG9yKHtcbiAgICAgIGVuYWJsZVNtYXJ0VGFibGVTZWxlY3RvcjogZmFsc2UsXG4gICAgICBwYXJlbnQ6ICQoJ2JvZHknKVswXSxcbiAgICAgIGVuYWJsZVJlc3VsdFN0cmlwcGluZzogZmFsc2VcbiAgICB9KVxuICAgIHZhciBDU1NTZWxlY3RvciA9IGNzLmdldENzc1NlbGVjdG9yKFtlbGVtZW50XSlcbiAgICByZXR1cm4gQ1NTU2VsZWN0b3JcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyAnSW52YWxpZCBjbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSAnICsgdGhpcy5jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVW5pcXVlRWxlbWVudExpc3RcblxuVW5pcXVlRWxlbWVudExpc3QucHJvdG90eXBlLmlzQWRkZWQgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICB2YXIgZWxlbWVudFVuaXF1ZUlkID0gdGhpcy5nZXRFbGVtZW50VW5pcXVlSWQoZWxlbWVudClcbiAgdmFyIGlzQWRkZWQgPSBlbGVtZW50VW5pcXVlSWQgaW4gdGhpcy5hZGRlZEVsZW1lbnRzXG4gIHJldHVybiBpc0FkZGVkXG59XG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciBCYWNrZ3JvdW5kU2NyaXB0ID0gcmVxdWlyZSgnLi9CYWNrZ3JvdW5kU2NyaXB0Jylcbi8qKlxuICogQHBhcmFtIGxvY2F0aW9uXHRjb25maWd1cmUgZnJvbSB3aGVyZSB0aGUgY29udGVudCBzY3JpcHQgaXMgYmVpbmcgYWNjZXNzZWQgKENvbnRlbnRTY3JpcHQsIEJhY2tncm91bmRQYWdlLCBEZXZUb29scylcbiAqIEByZXR1cm5zIEJhY2tncm91bmRTY3JpcHRcbiAqL1xudmFyIGdldEJhY2tncm91bmRTY3JpcHQgPSBmdW5jdGlvbiAobG9jYXRpb24pIHtcbiAgLy8gSGFuZGxlIGNhbGxzIGZyb20gZGlmZmVyZW50IHBsYWNlc1xuICBpZiAobG9jYXRpb24gPT09ICdCYWNrZ3JvdW5kU2NyaXB0Jykge1xuICAgIHJldHVybiBCYWNrZ3JvdW5kU2NyaXB0XG4gIH0gZWxzZSBpZiAobG9jYXRpb24gPT09ICdEZXZUb29scycgfHwgbG9jYXRpb24gPT09ICdDb250ZW50U2NyaXB0Jykge1xuICAgIC8vIGlmIGNhbGxlZCB3aXRoaW4gYmFja2dyb3VuZCBzY3JpcHQgcHJveHkgY2FsbHMgdG8gY29udGVudCBzY3JpcHRcbiAgICB2YXIgYmFja2dyb3VuZFNjcmlwdCA9IHt9XG5cbiAgICBPYmplY3Qua2V5cyhCYWNrZ3JvdW5kU2NyaXB0KS5mb3JFYWNoKGZ1bmN0aW9uIChhdHRyKSB7XG4gICAgICBpZiAodHlwZW9mIEJhY2tncm91bmRTY3JpcHRbYXR0cl0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgYmFja2dyb3VuZFNjcmlwdFthdHRyXSA9IGZ1bmN0aW9uIChyZXF1ZXN0KSB7XG4gICAgICAgICAgdmFyIHJlcVRvQmFja2dyb3VuZFNjcmlwdCA9IHtcbiAgICAgICAgICAgIGJhY2tncm91bmRTY3JpcHRDYWxsOiB0cnVlLFxuICAgICAgICAgICAgZm46IGF0dHIsXG4gICAgICAgICAgICByZXF1ZXN0OiByZXF1ZXN0XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgICAgICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UocmVxVG9CYWNrZ3JvdW5kU2NyaXB0LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZShyZXNwb25zZSlcbiAgICAgICAgICB9KVxuXG4gICAgICAgICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2VcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYmFja2dyb3VuZFNjcmlwdFthdHRyXSA9IEJhY2tncm91bmRTY3JpcHRbYXR0cl1cbiAgICAgIH1cbiAgICB9KVxuXG4gICAgcmV0dXJuIGJhY2tncm91bmRTY3JpcHRcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgQmFja2dyb3VuZFNjcmlwdCBpbml0aWFsaXphdGlvbiAtICcgKyBsb2NhdGlvbilcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdldEJhY2tncm91bmRTY3JpcHRcbiIsInZhciBnZXRCYWNrZ3JvdW5kU2NyaXB0ID0gcmVxdWlyZSgnLi9nZXRCYWNrZ3JvdW5kU2NyaXB0JylcbnZhciBDb250ZW50U2NyaXB0ID0gcmVxdWlyZSgnLi9Db250ZW50U2NyaXB0Jylcbi8qKlxuICpcbiAqIEBwYXJhbSBsb2NhdGlvblx0Y29uZmlndXJlIGZyb20gd2hlcmUgdGhlIGNvbnRlbnQgc2NyaXB0IGlzIGJlaW5nIGFjY2Vzc2VkIChDb250ZW50U2NyaXB0LCBCYWNrZ3JvdW5kUGFnZSwgRGV2VG9vbHMpXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogQHJldHVybnMgQ29udGVudFNjcmlwdFxuICovXG52YXIgZ2V0Q29udGVudFNjcmlwdCA9IGZ1bmN0aW9uIChsb2NhdGlvbikge1xuICB2YXIgY29udGVudFNjcmlwdFxuXG4gIC8vIEhhbmRsZSBjYWxscyBmcm9tIGRpZmZlcmVudCBwbGFjZXNcbiAgaWYgKGxvY2F0aW9uID09PSAnQ29udGVudFNjcmlwdCcpIHtcbiAgICBjb250ZW50U2NyaXB0ID0gQ29udGVudFNjcmlwdFxuICAgIGNvbnRlbnRTY3JpcHQuYmFja2dyb3VuZFNjcmlwdCA9IGdldEJhY2tncm91bmRTY3JpcHQoJ0NvbnRlbnRTY3JpcHQnKVxuICAgIHJldHVybiBjb250ZW50U2NyaXB0XG4gIH0gZWxzZSBpZiAobG9jYXRpb24gPT09ICdCYWNrZ3JvdW5kU2NyaXB0JyB8fCBsb2NhdGlvbiA9PT0gJ0RldlRvb2xzJykge1xuICAgIHZhciBiYWNrZ3JvdW5kU2NyaXB0ID0gZ2V0QmFja2dyb3VuZFNjcmlwdChsb2NhdGlvbilcblxuICAgIC8vIGlmIGNhbGxlZCB3aXRoaW4gYmFja2dyb3VuZCBzY3JpcHQgcHJveHkgY2FsbHMgdG8gY29udGVudCBzY3JpcHRcbiAgICBjb250ZW50U2NyaXB0ID0ge31cbiAgICBPYmplY3Qua2V5cyhDb250ZW50U2NyaXB0KS5mb3JFYWNoKGZ1bmN0aW9uIChhdHRyKSB7XG4gICAgICBpZiAodHlwZW9mIENvbnRlbnRTY3JpcHRbYXR0cl0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgY29udGVudFNjcmlwdFthdHRyXSA9IGZ1bmN0aW9uIChyZXF1ZXN0KSB7XG4gICAgICAgICAgdmFyIHJlcVRvQ29udGVudFNjcmlwdCA9IHtcbiAgICAgICAgICAgIGNvbnRlbnRTY3JpcHRDYWxsOiB0cnVlLFxuICAgICAgICAgICAgZm46IGF0dHIsXG4gICAgICAgICAgICByZXF1ZXN0OiByZXF1ZXN0XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIGJhY2tncm91bmRTY3JpcHQuZXhlY3V0ZUNvbnRlbnRTY3JpcHQocmVxVG9Db250ZW50U2NyaXB0KVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb250ZW50U2NyaXB0W2F0dHJdID0gQ29udGVudFNjcmlwdFthdHRyXVxuICAgICAgfVxuICAgIH0pXG4gICAgY29udGVudFNjcmlwdC5iYWNrZ3JvdW5kU2NyaXB0ID0gYmFja2dyb3VuZFNjcmlwdFxuICAgIHJldHVybiBjb250ZW50U2NyaXB0XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIENvbnRlbnRTY3JpcHQgaW5pdGlhbGl6YXRpb24gLSAnICsgbG9jYXRpb24pXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnZXRDb250ZW50U2NyaXB0XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0Q3NzU2VsZWN0b3IsXG5cdEVsZW1lbnRTZWxlY3Rvcixcblx0RWxlbWVudFNlbGVjdG9yTGlzdFxufVxuXG5cbmZ1bmN0aW9uIENzc1NlbGVjdG9yIChvcHRpb25zKSB7XG5cblx0dmFyIG1lID0gdGhpcztcblxuXHQvLyBkZWZhdWx0c1xuXHR0aGlzLmlnbm9yZWRUYWdzID0gWydmb250JywgJ2InLCAnaScsICdzJ107XG5cdHRoaXMucGFyZW50ID0gb3B0aW9ucy5kb2N1bWVudCB8fCBvcHRpb25zLnBhcmVudFxuXHR0aGlzLmRvY3VtZW50ID0gb3B0aW9ucy5kb2N1bWVudCB8fCBvcHRpb25zLnBhcmVudCBcblx0dGhpcy5pZ25vcmVkQ2xhc3NCYXNlID0gZmFsc2U7XG5cdHRoaXMuZW5hYmxlUmVzdWx0U3RyaXBwaW5nID0gdHJ1ZTtcblx0dGhpcy5lbmFibGVTbWFydFRhYmxlU2VsZWN0b3IgPSBmYWxzZTtcblx0dGhpcy5pZ25vcmVkQ2xhc3NlcyA9IFtdO1xuICAgIHRoaXMuYWxsb3dNdWx0aXBsZVNlbGVjdG9ycyA9IGZhbHNlO1xuXHR0aGlzLnF1ZXJ5ID0gZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG5cdFx0cmV0dXJuIG1lLnBhcmVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcblx0fTtcblxuXHQvLyBvdmVycmlkZXMgZGVmYXVsdHMgd2l0aCBvcHRpb25zXG5cdGZvciAodmFyIGkgaW4gb3B0aW9ucykge1xuXHRcdHRoaXNbaV0gPSBvcHRpb25zW2ldO1xuXHR9XG59O1xuXG4vLyBUT0RPIHJlZmFjdG9yIGVsZW1lbnQgc2VsZWN0b3IgbGlzdCBpbnRvIGEgfiBjbGFzc1xuZnVuY3Rpb24gRWxlbWVudFNlbGVjdG9yIChlbGVtZW50LCBpZ25vcmVkQ2xhc3Nlcykge1xuXG5cdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cdHRoaXMuaXNEaXJlY3RDaGlsZCA9IHRydWU7XG5cdHRoaXMudGFnID0gZWxlbWVudC5sb2NhbE5hbWU7XG5cdHRoaXMudGFnID0gdGhpcy50YWcucmVwbGFjZSgvOi9nLCAnXFxcXDonKTtcblxuXHQvLyBudGgtb2YtY2hpbGQobisxKVxuXHR0aGlzLmluZGV4biA9IG51bGw7XG5cdHRoaXMuaW5kZXggPSAxO1xuXHR0aGlzLmlkID0gbnVsbDtcblx0dGhpcy5jbGFzc2VzID0gbmV3IEFycmF5KCk7XG5cblx0Ly8gZG8gbm90IGFkZCBhZGRpdGluYWwgaW5mbyB0byBodG1sLCBib2R5IHRhZ3MuXG5cdC8vIGh0bWw6bnRoLW9mLXR5cGUoMSkgY2Fubm90IGJlIHNlbGVjdGVkXG5cdGlmKHRoaXMudGFnID09PSAnaHRtbCcgfHwgdGhpcy50YWcgPT09ICdIVE1MJ1xuXHRcdHx8IHRoaXMudGFnID09PSAnYm9keScgfHwgdGhpcy50YWcgPT09ICdCT0RZJykge1xuXHRcdHRoaXMuaW5kZXggPSBudWxsO1xuXHRcdHJldHVybjtcblx0fVxuXG5cdGlmIChlbGVtZW50LnBhcmVudE5vZGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdC8vIG50aC1jaGlsZFxuXHRcdC8vdGhpcy5pbmRleCA9IFtdLmluZGV4T2YuY2FsbChlbGVtZW50LnBhcmVudE5vZGUuY2hpbGRyZW4sIGVsZW1lbnQpKzE7XG5cblx0XHQvLyBudGgtb2YtdHlwZVxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudC5wYXJlbnROb2RlLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgY2hpbGQgPSBlbGVtZW50LnBhcmVudE5vZGUuY2hpbGRyZW5baV07XG5cdFx0XHRpZiAoY2hpbGQgPT09IGVsZW1lbnQpIHtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0XHRpZiAoY2hpbGQudGFnTmFtZSA9PT0gZWxlbWVudC50YWdOYW1lKSB7XG5cdFx0XHRcdHRoaXMuaW5kZXgrKztcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRpZiAoZWxlbWVudC5pZCAhPT0gJycpIHtcblx0XHRpZiAodHlwZW9mIGVsZW1lbnQuaWQgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHR0aGlzLmlkID0gZWxlbWVudC5pZDtcblx0XHRcdHRoaXMuaWQgPSB0aGlzLmlkLnJlcGxhY2UoLzovZywgJ1xcXFw6Jyk7XG5cdFx0fVxuXHR9XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50LmNsYXNzTGlzdC5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBjY2xhc3MgPSBlbGVtZW50LmNsYXNzTGlzdFtpXTtcblx0XHRpZiAoaWdub3JlZENsYXNzZXMuaW5kZXhPZihjY2xhc3MpID09PSAtMSkge1xuXHRcdFx0Y2NsYXNzID0gY2NsYXNzLnJlcGxhY2UoLzovZywgJ1xcXFw6Jyk7XG5cdFx0XHR0aGlzLmNsYXNzZXMucHVzaChjY2xhc3MpO1xuXHRcdH1cblx0fVxufTtcblxuZnVuY3Rpb24gRWxlbWVudFNlbGVjdG9yTGlzdCAoQ3NzU2VsZWN0b3IpIHtcblx0dGhpcy5Dc3NTZWxlY3RvciA9IENzc1NlbGVjdG9yO1xufTtcblxuRWxlbWVudFNlbGVjdG9yTGlzdC5wcm90b3R5cGUgPSBuZXcgQXJyYXkoKTtcblxuRWxlbWVudFNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZ2V0Q3NzU2VsZWN0b3IgPSBmdW5jdGlvbiAoKSB7XG5cblx0dmFyIHJlc3VsdFNlbGVjdG9ycyA9IFtdO1xuXG5cdC8vIFRERFxuXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgc2VsZWN0b3IgPSB0aGlzW2ldO1xuXG5cdFx0dmFyIGlzRmlyc3RTZWxlY3RvciA9IGkgPT09IHRoaXMubGVuZ3RoLTE7XG5cdFx0dmFyIHJlc3VsdFNlbGVjdG9yID0gc2VsZWN0b3IuZ2V0Q3NzU2VsZWN0b3IoaXNGaXJzdFNlbGVjdG9yKTtcblxuXHRcdGlmICh0aGlzLkNzc1NlbGVjdG9yLmVuYWJsZVNtYXJ0VGFibGVTZWxlY3Rvcikge1xuXHRcdFx0aWYgKHNlbGVjdG9yLnRhZyA9PT0gJ3RyJykge1xuXHRcdFx0XHRpZiAoc2VsZWN0b3IuZWxlbWVudC5jaGlsZHJlbi5sZW5ndGggPT09IDIpIHtcblx0XHRcdFx0XHRpZiAoc2VsZWN0b3IuZWxlbWVudC5jaGlsZHJlblswXS50YWdOYW1lID09PSAnVEQnXG5cdFx0XHRcdFx0XHR8fCBzZWxlY3Rvci5lbGVtZW50LmNoaWxkcmVuWzBdLnRhZ05hbWUgPT09ICdUSCdcblx0XHRcdFx0XHRcdHx8IHNlbGVjdG9yLmVsZW1lbnQuY2hpbGRyZW5bMF0udGFnTmFtZSA9PT0gJ1RSJykge1xuXG5cdFx0XHRcdFx0XHR2YXIgdGV4dCA9IHNlbGVjdG9yLmVsZW1lbnQuY2hpbGRyZW5bMF0udGV4dENvbnRlbnQ7XG5cdFx0XHRcdFx0XHR0ZXh0ID0gdGV4dC50cmltKCk7XG5cblx0XHRcdFx0XHRcdC8vIGVzY2FwZSBxdW90ZXNcblx0XHRcdFx0XHRcdHRleHQucmVwbGFjZSgvKFxcXFwqKSgnKS9nLCBmdW5jdGlvbiAoeCkge1xuXHRcdFx0XHRcdFx0XHR2YXIgbCA9IHgubGVuZ3RoO1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gKGwgJSAyKSA/IHggOiB4LnN1YnN0cmluZygwLCBsIC0gMSkgKyBcIlxcXFwnXCI7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdHJlc3VsdFNlbGVjdG9yICs9IFwiOmNvbnRhaW5zKCdcIiArIHRleHQgKyBcIicpXCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmVzdWx0U2VsZWN0b3JzLnB1c2gocmVzdWx0U2VsZWN0b3IpO1xuXHR9XG5cblx0dmFyIHJlc3VsdENTU1NlbGVjdG9yID0gcmVzdWx0U2VsZWN0b3JzLnJldmVyc2UoKS5qb2luKCcgJyk7XG5cdHJldHVybiByZXN1bHRDU1NTZWxlY3Rvcjtcbn07XG5cbkVsZW1lbnRTZWxlY3Rvci5wcm90b3R5cGUgPSB7XG5cblx0Z2V0Q3NzU2VsZWN0b3I6IGZ1bmN0aW9uIChpc0ZpcnN0U2VsZWN0b3IpIHtcblxuXHRcdGlmKGlzRmlyc3RTZWxlY3RvciA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRpc0ZpcnN0U2VsZWN0b3IgPSBmYWxzZTtcblx0XHR9XG5cblx0XHR2YXIgc2VsZWN0b3IgPSB0aGlzLnRhZztcblx0XHRpZiAodGhpcy5pZCAhPT0gbnVsbCkge1xuXHRcdFx0c2VsZWN0b3IgKz0gJyMnICsgdGhpcy5pZDtcblx0XHR9XG5cdFx0aWYgKHRoaXMuY2xhc3Nlcy5sZW5ndGgpIHtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jbGFzc2VzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdHNlbGVjdG9yICs9IFwiLlwiICsgdGhpcy5jbGFzc2VzW2ldO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAodGhpcy5pbmRleCAhPT0gbnVsbCkge1xuXHRcdFx0c2VsZWN0b3IgKz0gJzpudGgtb2YtdHlwZSgnICsgdGhpcy5pbmRleCArICcpJztcblx0XHR9XG5cdFx0aWYgKHRoaXMuaW5kZXhuICE9PSBudWxsICYmIHRoaXMuaW5kZXhuICE9PSAtMSkge1xuXHRcdFx0c2VsZWN0b3IgKz0gJzpudGgtb2YtdHlwZShuKycgKyB0aGlzLmluZGV4biArICcpJztcblx0XHR9XG5cdFx0aWYodGhpcy5pc0RpcmVjdENoaWxkICYmIGlzRmlyc3RTZWxlY3RvciA9PT0gZmFsc2UpIHtcblx0XHRcdHNlbGVjdG9yID0gXCI+IFwiK3NlbGVjdG9yO1xuXHRcdH1cblxuXHRcdHJldHVybiBzZWxlY3Rvcjtcblx0fSxcblx0Ly8gbWVyZ2VzIHRoaXMgc2VsZWN0b3Igd2l0aCBhbm90aGVyIG9uZS5cblx0bWVyZ2U6IGZ1bmN0aW9uIChtZXJnZVNlbGVjdG9yKSB7XG5cblx0XHRpZiAodGhpcy50YWcgIT09IG1lcmdlU2VsZWN0b3IudGFnKSB7XG5cdFx0XHR0aHJvdyBcImRpZmZlcmVudCBlbGVtZW50IHNlbGVjdGVkICh0YWcpXCI7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuaW5kZXggIT09IG51bGwpIHtcblx0XHRcdGlmICh0aGlzLmluZGV4ICE9PSBtZXJnZVNlbGVjdG9yLmluZGV4KSB7XG5cblx0XHRcdFx0Ly8gdXNlIGluZGV4biBvbmx5IGZvciB0d28gZWxlbWVudHNcblx0XHRcdFx0aWYgKHRoaXMuaW5kZXhuID09PSBudWxsKSB7XG5cdFx0XHRcdFx0dmFyIGluZGV4biA9IE1hdGgubWluKG1lcmdlU2VsZWN0b3IuaW5kZXgsIHRoaXMuaW5kZXgpO1xuXHRcdFx0XHRcdGlmIChpbmRleG4gPiAxKSB7XG5cdFx0XHRcdFx0XHR0aGlzLmluZGV4biA9IE1hdGgubWluKG1lcmdlU2VsZWN0b3IuaW5kZXgsIHRoaXMuaW5kZXgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHR0aGlzLmluZGV4biA9IC0xO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dGhpcy5pbmRleCA9IG51bGw7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYodGhpcy5pc0RpcmVjdENoaWxkID09PSB0cnVlKSB7XG5cdFx0XHR0aGlzLmlzRGlyZWN0Q2hpbGQgPSBtZXJnZVNlbGVjdG9yLmlzRGlyZWN0Q2hpbGQ7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuaWQgIT09IG51bGwpIHtcblx0XHRcdGlmICh0aGlzLmlkICE9PSBtZXJnZVNlbGVjdG9yLmlkKSB7XG5cdFx0XHRcdHRoaXMuaWQgPSBudWxsO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNsYXNzZXMubGVuZ3RoICE9PSAwKSB7XG5cdFx0XHR2YXIgY2xhc3NlcyA9IG5ldyBBcnJheSgpO1xuXG5cdFx0XHRmb3IgKHZhciBpIGluIHRoaXMuY2xhc3Nlcykge1xuXHRcdFx0XHR2YXIgY2NsYXNzID0gdGhpcy5jbGFzc2VzW2ldO1xuXHRcdFx0XHRpZiAobWVyZ2VTZWxlY3Rvci5jbGFzc2VzLmluZGV4T2YoY2NsYXNzKSAhPT0gLTEpIHtcblx0XHRcdFx0XHRjbGFzc2VzLnB1c2goY2NsYXNzKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmNsYXNzZXMgPSBjbGFzc2VzO1xuXHRcdH1cblx0fVxufTtcblxuQ3NzU2VsZWN0b3IucHJvdG90eXBlID0ge1xuXHRtZXJnZUVsZW1lbnRTZWxlY3RvcnM6IGZ1bmN0aW9uIChuZXdTZWxlY29ycykge1xuXG5cdFx0aWYgKG5ld1NlbGVjb3JzLmxlbmd0aCA8IDEpIHtcblx0XHRcdHRocm93IFwiTm8gc2VsZWN0b3JzIHNwZWNpZmllZFwiO1xuXHRcdH1cblx0XHRlbHNlIGlmIChuZXdTZWxlY29ycy5sZW5ndGggPT09IDEpIHtcblx0XHRcdHJldHVybiBuZXdTZWxlY29yc1swXTtcblx0XHR9XG5cblx0XHQvLyBjaGVjayBzZWxlY3RvciB0b3RhbCBjb3VudFxuXHRcdHZhciBlbGVtZW50Q291bnRJblNlbGVjdG9yID0gbmV3U2VsZWNvcnNbMF0ubGVuZ3RoO1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbmV3U2VsZWNvcnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBzZWxlY3RvciA9IG5ld1NlbGVjb3JzW2ldO1xuXHRcdFx0aWYgKHNlbGVjdG9yLmxlbmd0aCAhPT0gZWxlbWVudENvdW50SW5TZWxlY3Rvcikge1xuXHRcdFx0XHR0aHJvdyBcIkludmFsaWQgZWxlbWVudCBjb3VudCBpbiBzZWxlY3RvclwiO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIG1lcmdlIHNlbGVjdG9yc1xuXHRcdHZhciByZXN1bHRpbmdFbGVtZW50cyA9IG5ld1NlbGVjb3JzWzBdO1xuXHRcdGZvciAodmFyIGkgPSAxOyBpIDwgbmV3U2VsZWNvcnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBtZXJnZUVsZW1lbnRzID0gbmV3U2VsZWNvcnNbaV07XG5cblx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgZWxlbWVudENvdW50SW5TZWxlY3RvcjsgaisrKSB7XG5cdFx0XHRcdHJlc3VsdGluZ0VsZW1lbnRzW2pdLm1lcmdlKG1lcmdlRWxlbWVudHNbal0pO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gcmVzdWx0aW5nRWxlbWVudHM7XG5cdH0sXG5cdHN0cmlwU2VsZWN0b3I6IGZ1bmN0aW9uIChzZWxlY3RvcnMpIHtcblxuXHRcdHZhciBjc3NTZWxldG9yID0gc2VsZWN0b3JzLmdldENzc1NlbGVjdG9yKCk7XG5cdFx0dmFyIGJhc2VTZWxlY3RlZEVsZW1lbnRzID0gdGhpcy5xdWVyeShjc3NTZWxldG9yKTtcblxuXHRcdHZhciBjb21wYXJlRWxlbWVudHMgPSBmdW5jdGlvbiAoZWxlbWVudHMpIHtcblx0XHRcdGlmIChiYXNlU2VsZWN0ZWRFbGVtZW50cy5sZW5ndGggIT09IGVsZW1lbnRzLmxlbmd0aCkge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgYmFzZVNlbGVjdGVkRWxlbWVudHMubGVuZ3RoOyBqKyspIHtcblx0XHRcdFx0aWYgKFtdLmluZGV4T2YuY2FsbChlbGVtZW50cywgYmFzZVNlbGVjdGVkRWxlbWVudHNbal0pID09PSAtMSkge1xuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fTtcblx0XHQvLyBzdHJpcCBpbmRleGVzXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzZWxlY3RvcnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBzZWxlY3RvciA9IHNlbGVjdG9yc1tpXTtcblx0XHRcdGlmIChzZWxlY3Rvci5pbmRleCAhPT0gbnVsbCkge1xuXHRcdFx0XHR2YXIgaW5kZXggPSBzZWxlY3Rvci5pbmRleDtcblx0XHRcdFx0c2VsZWN0b3IuaW5kZXggPSBudWxsO1xuXHRcdFx0XHR2YXIgY3NzU2VsZXRvciA9IHNlbGVjdG9ycy5nZXRDc3NTZWxlY3RvcigpO1xuXHRcdFx0XHR2YXIgbmV3U2VsZWN0ZWRFbGVtZW50cyA9IHRoaXMucXVlcnkoY3NzU2VsZXRvcik7XG5cdFx0XHRcdC8vIGlmIHJlc3VsdHMgZG9lc24ndCBtYXRjaCB0aGVuIHVuZG8gY2hhbmdlc1xuXHRcdFx0XHRpZiAoIWNvbXBhcmVFbGVtZW50cyhuZXdTZWxlY3RlZEVsZW1lbnRzKSkge1xuXHRcdFx0XHRcdHNlbGVjdG9yLmluZGV4ID0gaW5kZXg7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBzdHJpcCBpc0RpcmVjdENoaWxkXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzZWxlY3RvcnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBzZWxlY3RvciA9IHNlbGVjdG9yc1tpXTtcblx0XHRcdGlmIChzZWxlY3Rvci5pc0RpcmVjdENoaWxkID09PSB0cnVlKSB7XG5cdFx0XHRcdHNlbGVjdG9yLmlzRGlyZWN0Q2hpbGQgPSBmYWxzZTtcblx0XHRcdFx0dmFyIGNzc1NlbGV0b3IgPSBzZWxlY3RvcnMuZ2V0Q3NzU2VsZWN0b3IoKTtcblx0XHRcdFx0dmFyIG5ld1NlbGVjdGVkRWxlbWVudHMgPSB0aGlzLnF1ZXJ5KGNzc1NlbGV0b3IpO1xuXHRcdFx0XHQvLyBpZiByZXN1bHRzIGRvZXNuJ3QgbWF0Y2ggdGhlbiB1bmRvIGNoYW5nZXNcblx0XHRcdFx0aWYgKCFjb21wYXJlRWxlbWVudHMobmV3U2VsZWN0ZWRFbGVtZW50cykpIHtcblx0XHRcdFx0XHRzZWxlY3Rvci5pc0RpcmVjdENoaWxkID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIHN0cmlwIGlkc1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZWN0b3JzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgc2VsZWN0b3IgPSBzZWxlY3RvcnNbaV07XG5cdFx0XHRpZiAoc2VsZWN0b3IuaWQgIT09IG51bGwpIHtcblx0XHRcdFx0dmFyIGlkID0gc2VsZWN0b3IuaWQ7XG5cdFx0XHRcdHNlbGVjdG9yLmlkID0gbnVsbDtcblx0XHRcdFx0dmFyIGNzc1NlbGV0b3IgPSBzZWxlY3RvcnMuZ2V0Q3NzU2VsZWN0b3IoKTtcblx0XHRcdFx0dmFyIG5ld1NlbGVjdGVkRWxlbWVudHMgPSB0aGlzLnF1ZXJ5KGNzc1NlbGV0b3IpO1xuXHRcdFx0XHQvLyBpZiByZXN1bHRzIGRvZXNuJ3QgbWF0Y2ggdGhlbiB1bmRvIGNoYW5nZXNcblx0XHRcdFx0aWYgKCFjb21wYXJlRWxlbWVudHMobmV3U2VsZWN0ZWRFbGVtZW50cykpIHtcblx0XHRcdFx0XHRzZWxlY3Rvci5pZCA9IGlkO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gc3RyaXAgY2xhc3Nlc1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZWN0b3JzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgc2VsZWN0b3IgPSBzZWxlY3RvcnNbaV07XG5cdFx0XHRpZiAoc2VsZWN0b3IuY2xhc3Nlcy5sZW5ndGggIT09IDApIHtcblx0XHRcdFx0Zm9yICh2YXIgaiA9IHNlbGVjdG9yLmNsYXNzZXMubGVuZ3RoIC0gMTsgaiA+IDA7IGotLSkge1xuXHRcdFx0XHRcdHZhciBjY2xhc3MgPSBzZWxlY3Rvci5jbGFzc2VzW2pdO1xuXHRcdFx0XHRcdHNlbGVjdG9yLmNsYXNzZXMuc3BsaWNlKGosIDEpO1xuXHRcdFx0XHRcdHZhciBjc3NTZWxldG9yID0gc2VsZWN0b3JzLmdldENzc1NlbGVjdG9yKCk7XG5cdFx0XHRcdFx0dmFyIG5ld1NlbGVjdGVkRWxlbWVudHMgPSB0aGlzLnF1ZXJ5KGNzc1NlbGV0b3IpO1xuXHRcdFx0XHRcdC8vIGlmIHJlc3VsdHMgZG9lc24ndCBtYXRjaCB0aGVuIHVuZG8gY2hhbmdlc1xuXHRcdFx0XHRcdGlmICghY29tcGFyZUVsZW1lbnRzKG5ld1NlbGVjdGVkRWxlbWVudHMpKSB7XG5cdFx0XHRcdFx0XHRzZWxlY3Rvci5jbGFzc2VzLnNwbGljZShqLCAwLCBjY2xhc3MpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIHN0cmlwIHRhZ3Ncblx0XHRmb3IgKHZhciBpID0gc2VsZWN0b3JzLmxlbmd0aCAtIDE7IGkgPiAwOyBpLS0pIHtcblx0XHRcdHZhciBzZWxlY3RvciA9IHNlbGVjdG9yc1tpXTtcblx0XHRcdHNlbGVjdG9ycy5zcGxpY2UoaSwgMSk7XG5cdFx0XHR2YXIgY3NzU2VsZXRvciA9IHNlbGVjdG9ycy5nZXRDc3NTZWxlY3RvcigpO1xuXHRcdFx0dmFyIG5ld1NlbGVjdGVkRWxlbWVudHMgPSB0aGlzLnF1ZXJ5KGNzc1NlbGV0b3IpO1xuXHRcdFx0Ly8gaWYgcmVzdWx0cyBkb2Vzbid0IG1hdGNoIHRoZW4gdW5kbyBjaGFuZ2VzXG5cdFx0XHRpZiAoIWNvbXBhcmVFbGVtZW50cyhuZXdTZWxlY3RlZEVsZW1lbnRzKSkge1xuXHRcdFx0XHRzZWxlY3RvcnMuc3BsaWNlKGksIDAsIHNlbGVjdG9yKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gc2VsZWN0b3JzO1xuXHR9LFxuXHRnZXRFbGVtZW50U2VsZWN0b3JzOiBmdW5jdGlvbiAoZWxlbWVudHMsIHRvcCkge1xuXHRcdHZhciBlbGVtZW50U2VsZWN0b3JzID0gW107XG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgZWxlbWVudCA9IGVsZW1lbnRzW2ldO1xuXHRcdFx0dmFyIGVsZW1lbnRTZWxlY3RvciA9IHRoaXMuZ2V0RWxlbWVudFNlbGVjdG9yKGVsZW1lbnQsIHRvcCk7XG5cdFx0XHRlbGVtZW50U2VsZWN0b3JzLnB1c2goZWxlbWVudFNlbGVjdG9yKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZWxlbWVudFNlbGVjdG9ycztcblx0fSxcblx0Z2V0RWxlbWVudFNlbGVjdG9yOiBmdW5jdGlvbiAoZWxlbWVudCwgdG9wKSB7XG5cblx0XHR2YXIgZWxlbWVudFNlbGVjdG9yTGlzdCA9IG5ldyBFbGVtZW50U2VsZWN0b3JMaXN0KHRoaXMpO1xuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHRpZiAoZWxlbWVudCA9PT0gdGhpcy5wYXJlbnQpIHtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChlbGVtZW50ID09PSB1bmRlZmluZWQgfHwgZWxlbWVudCA9PT0gdGhpcy5kb2N1bWVudCkge1xuXHRcdFx0XHR0aHJvdyAnZWxlbWVudCBpcyBub3QgYSBjaGlsZCBvZiB0aGUgZ2l2ZW4gcGFyZW50Jztcblx0XHRcdH1cblx0XHRcdGlmICh0aGlzLmlzSWdub3JlZFRhZyhlbGVtZW50LnRhZ05hbWUpKSB7XG5cblx0XHRcdFx0ZWxlbWVudCA9IGVsZW1lbnQucGFyZW50Tm9kZTtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cdFx0XHRpZiAodG9wID4gMCkge1xuXHRcdFx0XHR0b3AtLTtcblx0XHRcdFx0ZWxlbWVudCA9IGVsZW1lbnQucGFyZW50Tm9kZTtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBzZWxlY3RvciA9IG5ldyBFbGVtZW50U2VsZWN0b3IoZWxlbWVudCwgdGhpcy5pZ25vcmVkQ2xhc3Nlcyk7XG5cdFx0XHQvLyBkb2N1bWVudCBkb2VzIG5vdCBoYXZlIGEgdGFnTmFtZVxuXHRcdFx0aWYoZWxlbWVudC5wYXJlbnROb2RlID09PSB0aGlzLmRvY3VtZW50IHx8IHRoaXMuaXNJZ25vcmVkVGFnKGVsZW1lbnQucGFyZW50Tm9kZS50YWdOYW1lKSkge1xuXHRcdFx0XHRzZWxlY3Rvci5pc0RpcmVjdENoaWxkID0gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdGVsZW1lbnRTZWxlY3Rvckxpc3QucHVzaChzZWxlY3Rvcik7XG5cdFx0XHRlbGVtZW50ID0gZWxlbWVudC5wYXJlbnROb2RlO1xuXHRcdH1cblxuXHRcdHJldHVybiBlbGVtZW50U2VsZWN0b3JMaXN0O1xuXHR9LFxuXG4gICAgLyoqXG4gICAgICogQ29tcGFyZXMgd2hldGhlciB0d28gZWxlbWVudHMgYXJlIHNpbWlsYXIuIFNpbWlsYXIgZWxlbWVudHMgc2hvdWxkXG4gICAgICogaGF2ZSBhIGNvbW1vbiBwYXJyZW50IGFuZCBhbGwgcGFyZW50IGVsZW1lbnRzIHNob3VsZCBiZSB0aGUgc2FtZSB0eXBlLlxuICAgICAqIEBwYXJhbSBlbGVtZW50MVxuICAgICAqIEBwYXJhbSBlbGVtZW50MlxuICAgICAqL1xuICAgIGNoZWNrU2ltaWxhckVsZW1lbnRzOiBmdW5jdGlvbihlbGVtZW50MSwgZWxlbWVudDIpIHtcblxuICAgICAgICB3aGlsZSAodHJ1ZSkge1xuXG4gICAgICAgICAgICBpZihlbGVtZW50MS50YWdOYW1lICE9PSBlbGVtZW50Mi50YWdOYW1lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYoZWxlbWVudDEgPT09IGVsZW1lbnQyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHN0b3AgYXQgYm9keSB0YWdcbiAgICAgICAgICAgIGlmIChlbGVtZW50MSA9PT0gdW5kZWZpbmVkIHx8IGVsZW1lbnQxLnRhZ05hbWUgPT09ICdib2R5J1xuICAgICAgICAgICAgICAgIHx8IGVsZW1lbnQxLnRhZ05hbWUgPT09ICdCT0RZJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChlbGVtZW50MiA9PT0gdW5kZWZpbmVkIHx8IGVsZW1lbnQyLnRhZ05hbWUgPT09ICdib2R5J1xuICAgICAgICAgICAgICAgIHx8IGVsZW1lbnQyLnRhZ05hbWUgPT09ICdCT0RZJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZWxlbWVudDEgPSBlbGVtZW50MS5wYXJlbnROb2RlO1xuICAgICAgICAgICAgZWxlbWVudDIgPSBlbGVtZW50Mi5wYXJlbnROb2RlO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdyb3VwcyBlbGVtZW50cyBpbnRvIGdyb3VwcyBpZiB0aGUgZW1lbGVudHMgYXJlIG5vdCBzaW1pbGFyXG4gICAgICogQHBhcmFtIGVsZW1lbnRzXG4gICAgICovXG4gICAgZ2V0RWxlbWVudEdyb3VwczogZnVuY3Rpb24oZWxlbWVudHMpIHtcblxuICAgICAgICAvLyBmaXJzdCBlbG1lbnQgaXMgaW4gdGhlIGZpcnN0IGdyb3VwXG4gICAgICAgIC8vIEBUT0RPIG1heWJlIGkgZG9udCBuZWVkIHRoaXM/XG4gICAgICAgIHZhciBncm91cHMgPSBbW2VsZW1lbnRzWzBdXV07XG5cbiAgICAgICAgZm9yKHZhciBpID0gMTsgaSA8IGVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgZWxlbWVudE5ldyA9IGVsZW1lbnRzW2ldO1xuICAgICAgICAgICAgdmFyIGFkZGVkVG9Hcm91cCA9IGZhbHNlO1xuICAgICAgICAgICAgZm9yKHZhciBqID0gMDsgaiA8IGdyb3Vwcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHZhciBncm91cCA9IGdyb3Vwc1tqXTtcbiAgICAgICAgICAgICAgICB2YXIgZWxlbWVudEdyb3VwID0gZ3JvdXBbMF07XG4gICAgICAgICAgICAgICAgaWYodGhpcy5jaGVja1NpbWlsYXJFbGVtZW50cyhlbGVtZW50TmV3LCBlbGVtZW50R3JvdXApKSB7XG4gICAgICAgICAgICAgICAgICAgIGdyb3VwLnB1c2goZWxlbWVudE5ldyk7XG4gICAgICAgICAgICAgICAgICAgIGFkZGVkVG9Hcm91cCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gYWRkIG5ldyBncm91cFxuICAgICAgICAgICAgaWYoIWFkZGVkVG9Hcm91cCkge1xuICAgICAgICAgICAgICAgIGdyb3Vwcy5wdXNoKFtlbGVtZW50TmV3XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZ3JvdXBzO1xuICAgIH0sXG5cdGdldENzc1NlbGVjdG9yOiBmdW5jdGlvbiAoZWxlbWVudHMsIHRvcCkge1xuXG5cdFx0dG9wID0gdG9wIHx8IDA7XG5cblx0XHR2YXIgZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yID0gdGhpcy5lbmFibGVTbWFydFRhYmxlU2VsZWN0b3I7XG5cdFx0aWYgKGVsZW1lbnRzLmxlbmd0aCA+IDEpIHtcblx0XHRcdHRoaXMuZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yID0gZmFsc2U7XG5cdFx0fVxuXG4gICAgICAgIC8vIGdyb3VwIGVsZW1lbnRzIGludG8gc2ltaWxhcml0eSBncm91cHNcbiAgICAgICAgdmFyIGVsZW1lbnRHcm91cHMgPSB0aGlzLmdldEVsZW1lbnRHcm91cHMoZWxlbWVudHMpO1xuXG4gICAgICAgIHZhciByZXN1bHRDU1NTZWxlY3RvcjtcblxuICAgICAgICBpZih0aGlzLmFsbG93TXVsdGlwbGVTZWxlY3RvcnMpIHtcblxuICAgICAgICAgICAgdmFyIGdyb3VwU2VsZWN0b3JzID0gW107XG5cbiAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBlbGVtZW50R3JvdXBzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGdyb3VwRWxlbWVudHMgPSBlbGVtZW50R3JvdXBzW2ldO1xuXG4gICAgICAgICAgICAgICAgdmFyIGVsZW1lbnRTZWxlY3RvcnMgPSB0aGlzLmdldEVsZW1lbnRTZWxlY3RvcnMoZ3JvdXBFbGVtZW50cywgdG9wKTtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0U2VsZWN0b3IgPSB0aGlzLm1lcmdlRWxlbWVudFNlbGVjdG9ycyhlbGVtZW50U2VsZWN0b3JzKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5lbmFibGVSZXN1bHRTdHJpcHBpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0U2VsZWN0b3IgPSB0aGlzLnN0cmlwU2VsZWN0b3IocmVzdWx0U2VsZWN0b3IpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGdyb3VwU2VsZWN0b3JzLnB1c2gocmVzdWx0U2VsZWN0b3IuZ2V0Q3NzU2VsZWN0b3IoKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlc3VsdENTU1NlbGVjdG9yID0gZ3JvdXBTZWxlY3RvcnMuam9pbignLCAnKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmKGVsZW1lbnRHcm91cHMubGVuZ3RoICE9PSAxKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgXCJmb3VuZCBtdWx0aXBsZSBlbGVtZW50IGdyb3VwcywgYnV0IGFsbG93TXVsdGlwbGVTZWxlY3RvcnMgZGlzYWJsZWRcIjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGVsZW1lbnRTZWxlY3RvcnMgPSB0aGlzLmdldEVsZW1lbnRTZWxlY3RvcnMoZWxlbWVudHMsIHRvcCk7XG4gICAgICAgICAgICB2YXIgcmVzdWx0U2VsZWN0b3IgPSB0aGlzLm1lcmdlRWxlbWVudFNlbGVjdG9ycyhlbGVtZW50U2VsZWN0b3JzKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmVuYWJsZVJlc3VsdFN0cmlwcGluZykge1xuICAgICAgICAgICAgICAgIHJlc3VsdFNlbGVjdG9yID0gdGhpcy5zdHJpcFNlbGVjdG9yKHJlc3VsdFNlbGVjdG9yKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVzdWx0Q1NTU2VsZWN0b3IgPSByZXN1bHRTZWxlY3Rvci5nZXRDc3NTZWxlY3RvcigpO1xuICAgICAgICB9XG5cblx0XHR0aGlzLmVuYWJsZVNtYXJ0VGFibGVTZWxlY3RvciA9IGVuYWJsZVNtYXJ0VGFibGVTZWxlY3RvcjtcblxuXHRcdC8vIHN0cmlwIGRvd24gc2VsZWN0b3Jcblx0XHRyZXR1cm4gcmVzdWx0Q1NTU2VsZWN0b3I7XG5cdH0sXG5cdGlzSWdub3JlZFRhZzogZnVuY3Rpb24gKHRhZykge1xuXHRcdHJldHVybiB0aGlzLmlnbm9yZWRUYWdzLmluZGV4T2YodGFnLnRvTG93ZXJDYXNlKCkpICE9PSAtMTtcblx0fVxufTtcbiIsIlxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2xpYi9qcXVlcnktZGVmZXJyZWQnKTsiLCJ2YXIgalF1ZXJ5ID0gbW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9qcXVlcnktY29yZS5qc1wiKSxcblx0Y29yZV9yc3BhY2UgPSAvXFxzKy87XG4vKipcbiogalF1ZXJ5IENhbGxiYWNrc1xuKlxuKiBDb2RlIGZyb206IGh0dHBzOi8vZ2l0aHViLmNvbS9qcXVlcnkvanF1ZXJ5L2Jsb2IvbWFzdGVyL3NyYy9jYWxsYmFja3MuanNcbipcbiovXG5cblxuLy8gU3RyaW5nIHRvIE9iamVjdCBvcHRpb25zIGZvcm1hdCBjYWNoZVxudmFyIG9wdGlvbnNDYWNoZSA9IHt9O1xuXG4vLyBDb252ZXJ0IFN0cmluZy1mb3JtYXR0ZWQgb3B0aW9ucyBpbnRvIE9iamVjdC1mb3JtYXR0ZWQgb25lcyBhbmQgc3RvcmUgaW4gY2FjaGVcbmZ1bmN0aW9uIGNyZWF0ZU9wdGlvbnMoIG9wdGlvbnMgKSB7XG5cdHZhciBvYmplY3QgPSBvcHRpb25zQ2FjaGVbIG9wdGlvbnMgXSA9IHt9O1xuXHRqUXVlcnkuZWFjaCggb3B0aW9ucy5zcGxpdCggY29yZV9yc3BhY2UgKSwgZnVuY3Rpb24oIF8sIGZsYWcgKSB7XG5cdFx0b2JqZWN0WyBmbGFnIF0gPSB0cnVlO1xuXHR9KTtcblx0cmV0dXJuIG9iamVjdDtcbn1cblxuLypcbiAqIENyZWF0ZSBhIGNhbGxiYWNrIGxpc3QgdXNpbmcgdGhlIGZvbGxvd2luZyBwYXJhbWV0ZXJzOlxuICpcbiAqXHRvcHRpb25zOiBhbiBvcHRpb25hbCBsaXN0IG9mIHNwYWNlLXNlcGFyYXRlZCBvcHRpb25zIHRoYXQgd2lsbCBjaGFuZ2UgaG93XG4gKlx0XHRcdHRoZSBjYWxsYmFjayBsaXN0IGJlaGF2ZXMgb3IgYSBtb3JlIHRyYWRpdGlvbmFsIG9wdGlvbiBvYmplY3RcbiAqXG4gKiBCeSBkZWZhdWx0IGEgY2FsbGJhY2sgbGlzdCB3aWxsIGFjdCBsaWtlIGFuIGV2ZW50IGNhbGxiYWNrIGxpc3QgYW5kIGNhbiBiZVxuICogXCJmaXJlZFwiIG11bHRpcGxlIHRpbWVzLlxuICpcbiAqIFBvc3NpYmxlIG9wdGlvbnM6XG4gKlxuICpcdG9uY2U6XHRcdFx0d2lsbCBlbnN1cmUgdGhlIGNhbGxiYWNrIGxpc3QgY2FuIG9ubHkgYmUgZmlyZWQgb25jZSAobGlrZSBhIERlZmVycmVkKVxuICpcbiAqXHRtZW1vcnk6XHRcdFx0d2lsbCBrZWVwIHRyYWNrIG9mIHByZXZpb3VzIHZhbHVlcyBhbmQgd2lsbCBjYWxsIGFueSBjYWxsYmFjayBhZGRlZFxuICpcdFx0XHRcdFx0YWZ0ZXIgdGhlIGxpc3QgaGFzIGJlZW4gZmlyZWQgcmlnaHQgYXdheSB3aXRoIHRoZSBsYXRlc3QgXCJtZW1vcml6ZWRcIlxuICpcdFx0XHRcdFx0dmFsdWVzIChsaWtlIGEgRGVmZXJyZWQpXG4gKlxuICpcdHVuaXF1ZTpcdFx0XHR3aWxsIGVuc3VyZSBhIGNhbGxiYWNrIGNhbiBvbmx5IGJlIGFkZGVkIG9uY2UgKG5vIGR1cGxpY2F0ZSBpbiB0aGUgbGlzdClcbiAqXG4gKlx0c3RvcE9uRmFsc2U6XHRpbnRlcnJ1cHQgY2FsbGluZ3Mgd2hlbiBhIGNhbGxiYWNrIHJldHVybnMgZmFsc2VcbiAqXG4gKi9cbmpRdWVyeS5DYWxsYmFja3MgPSBmdW5jdGlvbiggb3B0aW9ucyApIHtcblxuXHQvLyBDb252ZXJ0IG9wdGlvbnMgZnJvbSBTdHJpbmctZm9ybWF0dGVkIHRvIE9iamVjdC1mb3JtYXR0ZWQgaWYgbmVlZGVkXG5cdC8vICh3ZSBjaGVjayBpbiBjYWNoZSBmaXJzdClcblx0b3B0aW9ucyA9IHR5cGVvZiBvcHRpb25zID09PSBcInN0cmluZ1wiID9cblx0XHQoIG9wdGlvbnNDYWNoZVsgb3B0aW9ucyBdIHx8IGNyZWF0ZU9wdGlvbnMoIG9wdGlvbnMgKSApIDpcblx0XHRqUXVlcnkuZXh0ZW5kKCB7fSwgb3B0aW9ucyApO1xuXG5cdHZhciAvLyBMYXN0IGZpcmUgdmFsdWUgKGZvciBub24tZm9yZ2V0dGFibGUgbGlzdHMpXG5cdFx0bWVtb3J5LFxuXHRcdC8vIEZsYWcgdG8ga25vdyBpZiBsaXN0IHdhcyBhbHJlYWR5IGZpcmVkXG5cdFx0ZmlyZWQsXG5cdFx0Ly8gRmxhZyB0byBrbm93IGlmIGxpc3QgaXMgY3VycmVudGx5IGZpcmluZ1xuXHRcdGZpcmluZyxcblx0XHQvLyBGaXJzdCBjYWxsYmFjayB0byBmaXJlICh1c2VkIGludGVybmFsbHkgYnkgYWRkIGFuZCBmaXJlV2l0aClcblx0XHRmaXJpbmdTdGFydCxcblx0XHQvLyBFbmQgb2YgdGhlIGxvb3Agd2hlbiBmaXJpbmdcblx0XHRmaXJpbmdMZW5ndGgsXG5cdFx0Ly8gSW5kZXggb2YgY3VycmVudGx5IGZpcmluZyBjYWxsYmFjayAobW9kaWZpZWQgYnkgcmVtb3ZlIGlmIG5lZWRlZClcblx0XHRmaXJpbmdJbmRleCxcblx0XHQvLyBBY3R1YWwgY2FsbGJhY2sgbGlzdFxuXHRcdGxpc3QgPSBbXSxcblx0XHQvLyBTdGFjayBvZiBmaXJlIGNhbGxzIGZvciByZXBlYXRhYmxlIGxpc3RzXG5cdFx0c3RhY2sgPSAhb3B0aW9ucy5vbmNlICYmIFtdLFxuXHRcdC8vIEZpcmUgY2FsbGJhY2tzXG5cdFx0ZmlyZSA9IGZ1bmN0aW9uKCBkYXRhICkge1xuXHRcdFx0bWVtb3J5ID0gb3B0aW9ucy5tZW1vcnkgJiYgZGF0YTtcblx0XHRcdGZpcmVkID0gdHJ1ZTtcblx0XHRcdGZpcmluZ0luZGV4ID0gZmlyaW5nU3RhcnQgfHwgMDtcblx0XHRcdGZpcmluZ1N0YXJ0ID0gMDtcblx0XHRcdGZpcmluZ0xlbmd0aCA9IGxpc3QubGVuZ3RoO1xuXHRcdFx0ZmlyaW5nID0gdHJ1ZTtcblx0XHRcdGZvciAoIDsgbGlzdCAmJiBmaXJpbmdJbmRleCA8IGZpcmluZ0xlbmd0aDsgZmlyaW5nSW5kZXgrKyApIHtcblx0XHRcdFx0aWYgKCBsaXN0WyBmaXJpbmdJbmRleCBdLmFwcGx5KCBkYXRhWyAwIF0sIGRhdGFbIDEgXSApID09PSBmYWxzZSAmJiBvcHRpb25zLnN0b3BPbkZhbHNlICkge1xuXHRcdFx0XHRcdG1lbW9yeSA9IGZhbHNlOyAvLyBUbyBwcmV2ZW50IGZ1cnRoZXIgY2FsbHMgdXNpbmcgYWRkXG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGZpcmluZyA9IGZhbHNlO1xuXHRcdFx0aWYgKCBsaXN0ICkge1xuXHRcdFx0XHRpZiAoIHN0YWNrICkge1xuXHRcdFx0XHRcdGlmICggc3RhY2subGVuZ3RoICkge1xuXHRcdFx0XHRcdFx0ZmlyZSggc3RhY2suc2hpZnQoKSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIGlmICggbWVtb3J5ICkge1xuXHRcdFx0XHRcdGxpc3QgPSBbXTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRzZWxmLmRpc2FibGUoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cdFx0Ly8gQWN0dWFsIENhbGxiYWNrcyBvYmplY3Rcblx0XHRzZWxmID0ge1xuXHRcdFx0Ly8gQWRkIGEgY2FsbGJhY2sgb3IgYSBjb2xsZWN0aW9uIG9mIGNhbGxiYWNrcyB0byB0aGUgbGlzdFxuXHRcdFx0YWRkOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKCBsaXN0ICkge1xuXHRcdFx0XHRcdC8vIEZpcnN0LCB3ZSBzYXZlIHRoZSBjdXJyZW50IGxlbmd0aFxuXHRcdFx0XHRcdHZhciBzdGFydCA9IGxpc3QubGVuZ3RoO1xuXHRcdFx0XHRcdChmdW5jdGlvbiBhZGQoIGFyZ3MgKSB7XG5cdFx0XHRcdFx0XHRqUXVlcnkuZWFjaCggYXJncywgZnVuY3Rpb24oIF8sIGFyZyApIHtcblx0XHRcdFx0XHRcdFx0dmFyIHR5cGUgPSBqUXVlcnkudHlwZSggYXJnICk7XG5cdFx0XHRcdFx0XHRcdGlmICggdHlwZSA9PT0gXCJmdW5jdGlvblwiICkge1xuXHRcdFx0XHRcdFx0XHRcdGlmICggIW9wdGlvbnMudW5pcXVlIHx8ICFzZWxmLmhhcyggYXJnICkgKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRsaXN0LnB1c2goIGFyZyApO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmICggYXJnICYmIGFyZy5sZW5ndGggJiYgdHlwZSAhPT0gXCJzdHJpbmdcIiApIHtcblx0XHRcdFx0XHRcdFx0XHQvLyBJbnNwZWN0IHJlY3Vyc2l2ZWx5XG5cdFx0XHRcdFx0XHRcdFx0YWRkKCBhcmcgKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSkoIGFyZ3VtZW50cyApO1xuXHRcdFx0XHRcdC8vIERvIHdlIG5lZWQgdG8gYWRkIHRoZSBjYWxsYmFja3MgdG8gdGhlXG5cdFx0XHRcdFx0Ly8gY3VycmVudCBmaXJpbmcgYmF0Y2g/XG5cdFx0XHRcdFx0aWYgKCBmaXJpbmcgKSB7XG5cdFx0XHRcdFx0XHRmaXJpbmdMZW5ndGggPSBsaXN0Lmxlbmd0aDtcblx0XHRcdFx0XHQvLyBXaXRoIG1lbW9yeSwgaWYgd2UncmUgbm90IGZpcmluZyB0aGVuXG5cdFx0XHRcdFx0Ly8gd2Ugc2hvdWxkIGNhbGwgcmlnaHQgYXdheVxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoIG1lbW9yeSApIHtcblx0XHRcdFx0XHRcdGZpcmluZ1N0YXJ0ID0gc3RhcnQ7XG5cdFx0XHRcdFx0XHRmaXJlKCBtZW1vcnkgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gUmVtb3ZlIGEgY2FsbGJhY2sgZnJvbSB0aGUgbGlzdFxuXHRcdFx0cmVtb3ZlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKCBsaXN0ICkge1xuXHRcdFx0XHRcdGpRdWVyeS5lYWNoKCBhcmd1bWVudHMsIGZ1bmN0aW9uKCBfLCBhcmcgKSB7XG5cdFx0XHRcdFx0XHR2YXIgaW5kZXg7XG5cdFx0XHRcdFx0XHR3aGlsZSggKCBpbmRleCA9IGpRdWVyeS5pbkFycmF5KCBhcmcsIGxpc3QsIGluZGV4ICkgKSA+IC0xICkge1xuXHRcdFx0XHRcdFx0XHRsaXN0LnNwbGljZSggaW5kZXgsIDEgKTtcblx0XHRcdFx0XHRcdFx0Ly8gSGFuZGxlIGZpcmluZyBpbmRleGVzXG5cdFx0XHRcdFx0XHRcdGlmICggZmlyaW5nICkge1xuXHRcdFx0XHRcdFx0XHRcdGlmICggaW5kZXggPD0gZmlyaW5nTGVuZ3RoICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0ZmlyaW5nTGVuZ3RoLS07XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdGlmICggaW5kZXggPD0gZmlyaW5nSW5kZXggKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRmaXJpbmdJbmRleC0tO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fSxcblx0XHRcdC8vIENvbnRyb2wgaWYgYSBnaXZlbiBjYWxsYmFjayBpcyBpbiB0aGUgbGlzdFxuXHRcdFx0aGFzOiBmdW5jdGlvbiggZm4gKSB7XG5cdFx0XHRcdHJldHVybiBqUXVlcnkuaW5BcnJheSggZm4sIGxpc3QgKSA+IC0xO1xuXHRcdFx0fSxcblx0XHRcdC8vIFJlbW92ZSBhbGwgY2FsbGJhY2tzIGZyb20gdGhlIGxpc3Rcblx0XHRcdGVtcHR5OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0bGlzdCA9IFtdO1xuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH0sXG5cdFx0XHQvLyBIYXZlIHRoZSBsaXN0IGRvIG5vdGhpbmcgYW55bW9yZVxuXHRcdFx0ZGlzYWJsZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGxpc3QgPSBzdGFjayA9IG1lbW9yeSA9IHVuZGVmaW5lZDtcblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gSXMgaXQgZGlzYWJsZWQ/XG5cdFx0XHRkaXNhYmxlZDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiAhbGlzdDtcblx0XHRcdH0sXG5cdFx0XHQvLyBMb2NrIHRoZSBsaXN0IGluIGl0cyBjdXJyZW50IHN0YXRlXG5cdFx0XHRsb2NrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0c3RhY2sgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdGlmICggIW1lbW9yeSApIHtcblx0XHRcdFx0XHRzZWxmLmRpc2FibGUoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH0sXG5cdFx0XHQvLyBJcyBpdCBsb2NrZWQ/XG5cdFx0XHRsb2NrZWQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gIXN0YWNrO1xuXHRcdFx0fSxcblx0XHRcdC8vIENhbGwgYWxsIGNhbGxiYWNrcyB3aXRoIHRoZSBnaXZlbiBjb250ZXh0IGFuZCBhcmd1bWVudHNcblx0XHRcdGZpcmVXaXRoOiBmdW5jdGlvbiggY29udGV4dCwgYXJncyApIHtcblx0XHRcdFx0YXJncyA9IGFyZ3MgfHwgW107XG5cdFx0XHRcdGFyZ3MgPSBbIGNvbnRleHQsIGFyZ3Muc2xpY2UgPyBhcmdzLnNsaWNlKCkgOiBhcmdzIF07XG5cdFx0XHRcdGlmICggbGlzdCAmJiAoICFmaXJlZCB8fCBzdGFjayApICkge1xuXHRcdFx0XHRcdGlmICggZmlyaW5nICkge1xuXHRcdFx0XHRcdFx0c3RhY2sucHVzaCggYXJncyApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRmaXJlKCBhcmdzICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fSxcblx0XHRcdC8vIENhbGwgYWxsIHRoZSBjYWxsYmFja3Mgd2l0aCB0aGUgZ2l2ZW4gYXJndW1lbnRzXG5cdFx0XHRmaXJlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0c2VsZi5maXJlV2l0aCggdGhpcywgYXJndW1lbnRzICk7XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fSxcblx0XHRcdC8vIFRvIGtub3cgaWYgdGhlIGNhbGxiYWNrcyBoYXZlIGFscmVhZHkgYmVlbiBjYWxsZWQgYXQgbGVhc3Qgb25jZVxuXHRcdFx0ZmlyZWQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gISFmaXJlZDtcblx0XHRcdH1cblx0XHR9O1xuXG5cdHJldHVybiBzZWxmO1xufTtcblxuIiwiLyoqXG4qIGpRdWVyeSBjb3JlIG9iamVjdC5cbipcbiogV29ya2VyIHdpdGggalF1ZXJ5IGRlZmVycmVkXG4qXG4qIENvZGUgZnJvbTogaHR0cHM6Ly9naXRodWIuY29tL2pxdWVyeS9qcXVlcnkvYmxvYi9tYXN0ZXIvc3JjL2NvcmUuanNcbipcbiovXG5cbnZhciBqUXVlcnkgPSBtb2R1bGUuZXhwb3J0cyA9IHtcblx0dHlwZTogdHlwZVxuXHQsIGlzQXJyYXk6IGlzQXJyYXlcblx0LCBpc0Z1bmN0aW9uOiBpc0Z1bmN0aW9uXG5cdCwgaXNQbGFpbk9iamVjdDogaXNQbGFpbk9iamVjdFxuXHQsIGVhY2g6IGVhY2hcblx0LCBleHRlbmQ6IGV4dGVuZFxuXHQsIG5vb3A6IGZ1bmN0aW9uKCkge31cbn07XG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbnZhciBjbGFzczJ0eXBlID0ge307XG4vLyBQb3B1bGF0ZSB0aGUgY2xhc3MydHlwZSBtYXBcblwiQm9vbGVhbiBOdW1iZXIgU3RyaW5nIEZ1bmN0aW9uIEFycmF5IERhdGUgUmVnRXhwIE9iamVjdFwiLnNwbGl0KFwiIFwiKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcblx0Y2xhc3MydHlwZVsgXCJbb2JqZWN0IFwiICsgbmFtZSArIFwiXVwiIF0gPSBuYW1lLnRvTG93ZXJDYXNlKCk7XG59KTtcblxuXG5mdW5jdGlvbiB0eXBlKCBvYmogKSB7XG5cdHJldHVybiBvYmogPT0gbnVsbCA/XG5cdFx0U3RyaW5nKCBvYmogKSA6XG5cdFx0XHRjbGFzczJ0eXBlWyB0b1N0cmluZy5jYWxsKG9iaikgXSB8fCBcIm9iamVjdFwiO1xufVxuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKCBvYmogKSB7XG5cdHJldHVybiBqUXVlcnkudHlwZShvYmopID09PSBcImZ1bmN0aW9uXCI7XG59XG5cbmZ1bmN0aW9uIGlzQXJyYXkoIG9iaiApIHtcblx0cmV0dXJuIGpRdWVyeS50eXBlKG9iaikgPT09IFwiYXJyYXlcIjtcbn1cblxuZnVuY3Rpb24gZWFjaCggb2JqZWN0LCBjYWxsYmFjaywgYXJncyApIHtcblx0dmFyIG5hbWUsIGkgPSAwLFxuXHRsZW5ndGggPSBvYmplY3QubGVuZ3RoLFxuXHRpc09iaiA9IGxlbmd0aCA9PT0gdW5kZWZpbmVkIHx8IGlzRnVuY3Rpb24oIG9iamVjdCApO1xuXG5cdGlmICggYXJncyApIHtcblx0XHRpZiAoIGlzT2JqICkge1xuXHRcdFx0Zm9yICggbmFtZSBpbiBvYmplY3QgKSB7XG5cdFx0XHRcdGlmICggY2FsbGJhY2suYXBwbHkoIG9iamVjdFsgbmFtZSBdLCBhcmdzICkgPT09IGZhbHNlICkge1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdGZvciAoIDsgaSA8IGxlbmd0aDsgKSB7XG5cdFx0XHRcdGlmICggY2FsbGJhY2suYXBwbHkoIG9iamVjdFsgaSsrIF0sIGFyZ3MgKSA9PT0gZmFsc2UgKSB7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBBIHNwZWNpYWwsIGZhc3QsIGNhc2UgZm9yIHRoZSBtb3N0IGNvbW1vbiB1c2Ugb2YgZWFjaFxuXHR9IGVsc2Uge1xuXHRcdGlmICggaXNPYmogKSB7XG5cdFx0XHRmb3IgKCBuYW1lIGluIG9iamVjdCApIHtcblx0XHRcdFx0aWYgKCBjYWxsYmFjay5jYWxsKCBvYmplY3RbIG5hbWUgXSwgbmFtZSwgb2JqZWN0WyBuYW1lIF0gKSA9PT0gZmFsc2UgKSB7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0Zm9yICggOyBpIDwgbGVuZ3RoOyApIHtcblx0XHRcdFx0aWYgKCBjYWxsYmFjay5jYWxsKCBvYmplY3RbIGkgXSwgaSwgb2JqZWN0WyBpKysgXSApID09PSBmYWxzZSApIHtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBvYmplY3Q7XG59XG5cbmZ1bmN0aW9uIGlzUGxhaW5PYmplY3QoIG9iaiApIHtcblx0Ly8gTXVzdCBiZSBhbiBPYmplY3QuXG5cdGlmICggIW9iaiB8fCBqUXVlcnkudHlwZShvYmopICE9PSBcIm9iamVjdFwiICkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXHRyZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gZXh0ZW5kKCkge1xuXHR2YXIgb3B0aW9ucywgbmFtZSwgc3JjLCBjb3B5LCBjb3B5SXNBcnJheSwgY2xvbmUsXG5cdHRhcmdldCA9IGFyZ3VtZW50c1swXSB8fCB7fSxcblx0aSA9IDEsXG5cdGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGgsXG5cdGRlZXAgPSBmYWxzZTtcblxuXHQvLyBIYW5kbGUgYSBkZWVwIGNvcHkgc2l0dWF0aW9uXG5cdGlmICggdHlwZW9mIHRhcmdldCA9PT0gXCJib29sZWFuXCIgKSB7XG5cdFx0ZGVlcCA9IHRhcmdldDtcblx0XHR0YXJnZXQgPSBhcmd1bWVudHNbMV0gfHwge307XG5cdFx0Ly8gc2tpcCB0aGUgYm9vbGVhbiBhbmQgdGhlIHRhcmdldFxuXHRcdGkgPSAyO1xuXHR9XG5cblx0Ly8gSGFuZGxlIGNhc2Ugd2hlbiB0YXJnZXQgaXMgYSBzdHJpbmcgb3Igc29tZXRoaW5nIChwb3NzaWJsZSBpbiBkZWVwIGNvcHkpXG5cdGlmICggdHlwZW9mIHRhcmdldCAhPT0gXCJvYmplY3RcIiAmJiAhalF1ZXJ5LmlzRnVuY3Rpb24odGFyZ2V0KSApIHtcblx0XHR0YXJnZXQgPSB7fTtcblx0fVxuXG5cdC8vIGV4dGVuZCBqUXVlcnkgaXRzZWxmIGlmIG9ubHkgb25lIGFyZ3VtZW50IGlzIHBhc3NlZFxuXHRpZiAoIGxlbmd0aCA9PT0gaSApIHtcblx0XHR0YXJnZXQgPSB0aGlzO1xuXHRcdC0taTtcblx0fVxuXG5cdGZvciAoIDsgaSA8IGxlbmd0aDsgaSsrICkge1xuXHRcdC8vIE9ubHkgZGVhbCB3aXRoIG5vbi1udWxsL3VuZGVmaW5lZCB2YWx1ZXNcblx0XHRpZiAoIChvcHRpb25zID0gYXJndW1lbnRzWyBpIF0pICE9IG51bGwgKSB7XG5cdFx0XHQvLyBFeHRlbmQgdGhlIGJhc2Ugb2JqZWN0XG5cdFx0XHRmb3IgKCBuYW1lIGluIG9wdGlvbnMgKSB7XG5cdFx0XHRcdHNyYyA9IHRhcmdldFsgbmFtZSBdO1xuXHRcdFx0XHRjb3B5ID0gb3B0aW9uc1sgbmFtZSBdO1xuXG5cdFx0XHRcdC8vIFByZXZlbnQgbmV2ZXItZW5kaW5nIGxvb3Bcblx0XHRcdFx0aWYgKCB0YXJnZXQgPT09IGNvcHkgKSB7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBSZWN1cnNlIGlmIHdlJ3JlIG1lcmdpbmcgcGxhaW4gb2JqZWN0cyBvciBhcnJheXNcblx0XHRcdFx0aWYgKCBkZWVwICYmIGNvcHkgJiYgKCBqUXVlcnkuaXNQbGFpbk9iamVjdChjb3B5KSB8fCAoY29weUlzQXJyYXkgPSBqUXVlcnkuaXNBcnJheShjb3B5KSkgKSApIHtcblx0XHRcdFx0XHRpZiAoIGNvcHlJc0FycmF5ICkge1xuXHRcdFx0XHRcdFx0Y29weUlzQXJyYXkgPSBmYWxzZTtcblx0XHRcdFx0XHRcdGNsb25lID0gc3JjICYmIGpRdWVyeS5pc0FycmF5KHNyYykgPyBzcmMgOiBbXTtcblxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRjbG9uZSA9IHNyYyAmJiBqUXVlcnkuaXNQbGFpbk9iamVjdChzcmMpID8gc3JjIDoge307XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gTmV2ZXIgbW92ZSBvcmlnaW5hbCBvYmplY3RzLCBjbG9uZSB0aGVtXG5cdFx0XHRcdFx0dGFyZ2V0WyBuYW1lIF0gPSBqUXVlcnkuZXh0ZW5kKCBkZWVwLCBjbG9uZSwgY29weSApO1xuXG5cdFx0XHRcdFx0Ly8gRG9uJ3QgYnJpbmcgaW4gdW5kZWZpbmVkIHZhbHVlc1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBjb3B5ICE9PSB1bmRlZmluZWQgKSB7XG5cdFx0XHRcdFx0dGFyZ2V0WyBuYW1lIF0gPSBjb3B5O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Ly8gUmV0dXJuIHRoZSBtb2RpZmllZCBvYmplY3Rcblx0cmV0dXJuIHRhcmdldDtcbn07XG5cblxuIiwiXG4vKiFcbioganF1ZXJ5LWRlZmVycmVkXG4qIENvcHlyaWdodChjKSAyMDExIEhpZGRlbiA8enpkaGlkZGVuQGdtYWlsLmNvbT5cbiogTUlUIExpY2Vuc2VkXG4qL1xuXG4vKipcbiogTGlicmFyeSB2ZXJzaW9uLlxuKi9cblxudmFyIGpRdWVyeSA9IG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vanF1ZXJ5LWNhbGxiYWNrcy5qc1wiKSxcblx0Y29yZV9zbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcblxuLyoqXG4qIGpRdWVyeSBkZWZlcnJlZFxuKlxuKiBDb2RlIGZyb206IGh0dHBzOi8vZ2l0aHViLmNvbS9qcXVlcnkvanF1ZXJ5L2Jsb2IvbWFzdGVyL3NyYy9kZWZlcnJlZC5qc1xuKiBEb2M6IGh0dHA6Ly9hcGkuanF1ZXJ5LmNvbS9jYXRlZ29yeS9kZWZlcnJlZC1vYmplY3QvXG4qXG4qL1xuXG5qUXVlcnkuZXh0ZW5kKHtcblxuXHREZWZlcnJlZDogZnVuY3Rpb24oIGZ1bmMgKSB7XG5cdFx0dmFyIHR1cGxlcyA9IFtcblx0XHRcdFx0Ly8gYWN0aW9uLCBhZGQgbGlzdGVuZXIsIGxpc3RlbmVyIGxpc3QsIGZpbmFsIHN0YXRlXG5cdFx0XHRcdFsgXCJyZXNvbHZlXCIsIFwiZG9uZVwiLCBqUXVlcnkuQ2FsbGJhY2tzKFwib25jZSBtZW1vcnlcIiksIFwicmVzb2x2ZWRcIiBdLFxuXHRcdFx0XHRbIFwicmVqZWN0XCIsIFwiZmFpbFwiLCBqUXVlcnkuQ2FsbGJhY2tzKFwib25jZSBtZW1vcnlcIiksIFwicmVqZWN0ZWRcIiBdLFxuXHRcdFx0XHRbIFwibm90aWZ5XCIsIFwicHJvZ3Jlc3NcIiwgalF1ZXJ5LkNhbGxiYWNrcyhcIm1lbW9yeVwiKSBdXG5cdFx0XHRdLFxuXHRcdFx0c3RhdGUgPSBcInBlbmRpbmdcIixcblx0XHRcdHByb21pc2UgPSB7XG5cdFx0XHRcdHN0YXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gc3RhdGU7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGFsd2F5czogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0ZGVmZXJyZWQuZG9uZSggYXJndW1lbnRzICkuZmFpbCggYXJndW1lbnRzICk7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHRoZW46IGZ1bmN0aW9uKCAvKiBmbkRvbmUsIGZuRmFpbCwgZm5Qcm9ncmVzcyAqLyApIHtcblx0XHRcdFx0XHR2YXIgZm5zID0gYXJndW1lbnRzO1xuXHRcdFx0XHRcdHJldHVybiBqUXVlcnkuRGVmZXJyZWQoZnVuY3Rpb24oIG5ld0RlZmVyICkge1xuXHRcdFx0XHRcdFx0alF1ZXJ5LmVhY2goIHR1cGxlcywgZnVuY3Rpb24oIGksIHR1cGxlICkge1xuXHRcdFx0XHRcdFx0XHR2YXIgYWN0aW9uID0gdHVwbGVbIDAgXSxcblx0XHRcdFx0XHRcdFx0XHRmbiA9IGZuc1sgaSBdO1xuXHRcdFx0XHRcdFx0XHQvLyBkZWZlcnJlZFsgZG9uZSB8IGZhaWwgfCBwcm9ncmVzcyBdIGZvciBmb3J3YXJkaW5nIGFjdGlvbnMgdG8gbmV3RGVmZXJcblx0XHRcdFx0XHRcdFx0ZGVmZXJyZWRbIHR1cGxlWzFdIF0oIGpRdWVyeS5pc0Z1bmN0aW9uKCBmbiApID9cblx0XHRcdFx0XHRcdFx0XHRmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHZhciByZXR1cm5lZCA9IGZuLmFwcGx5KCB0aGlzLCBhcmd1bWVudHMgKTtcblx0XHRcdFx0XHRcdFx0XHRcdGlmICggcmV0dXJuZWQgJiYgalF1ZXJ5LmlzRnVuY3Rpb24oIHJldHVybmVkLnByb21pc2UgKSApIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuZWQucHJvbWlzZSgpXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0LmRvbmUoIG5ld0RlZmVyLnJlc29sdmUgKVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdC5mYWlsKCBuZXdEZWZlci5yZWplY3QgKVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdC5wcm9ncmVzcyggbmV3RGVmZXIubm90aWZ5ICk7XG5cdFx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRuZXdEZWZlclsgYWN0aW9uICsgXCJXaXRoXCIgXSggdGhpcyA9PT0gZGVmZXJyZWQgPyBuZXdEZWZlciA6IHRoaXMsIFsgcmV0dXJuZWQgXSApO1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH0gOlxuXHRcdFx0XHRcdFx0XHRcdG5ld0RlZmVyWyBhY3Rpb24gXVxuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRmbnMgPSBudWxsO1xuXHRcdFx0XHRcdH0pLnByb21pc2UoKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0Ly8gR2V0IGEgcHJvbWlzZSBmb3IgdGhpcyBkZWZlcnJlZFxuXHRcdFx0XHQvLyBJZiBvYmogaXMgcHJvdmlkZWQsIHRoZSBwcm9taXNlIGFzcGVjdCBpcyBhZGRlZCB0byB0aGUgb2JqZWN0XG5cdFx0XHRcdHByb21pc2U6IGZ1bmN0aW9uKCBvYmogKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG9iaiAhPSBudWxsID8galF1ZXJ5LmV4dGVuZCggb2JqLCBwcm9taXNlICkgOiBwcm9taXNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZGVmZXJyZWQgPSB7fTtcblxuXHRcdC8vIEtlZXAgcGlwZSBmb3IgYmFjay1jb21wYXRcblx0XHRwcm9taXNlLnBpcGUgPSBwcm9taXNlLnRoZW47XG5cblx0XHQvLyBBZGQgbGlzdC1zcGVjaWZpYyBtZXRob2RzXG5cdFx0alF1ZXJ5LmVhY2goIHR1cGxlcywgZnVuY3Rpb24oIGksIHR1cGxlICkge1xuXHRcdFx0dmFyIGxpc3QgPSB0dXBsZVsgMiBdLFxuXHRcdFx0XHRzdGF0ZVN0cmluZyA9IHR1cGxlWyAzIF07XG5cblx0XHRcdC8vIHByb21pc2VbIGRvbmUgfCBmYWlsIHwgcHJvZ3Jlc3MgXSA9IGxpc3QuYWRkXG5cdFx0XHRwcm9taXNlWyB0dXBsZVsxXSBdID0gbGlzdC5hZGQ7XG5cblx0XHRcdC8vIEhhbmRsZSBzdGF0ZVxuXHRcdFx0aWYgKCBzdGF0ZVN0cmluZyApIHtcblx0XHRcdFx0bGlzdC5hZGQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Ly8gc3RhdGUgPSBbIHJlc29sdmVkIHwgcmVqZWN0ZWQgXVxuXHRcdFx0XHRcdHN0YXRlID0gc3RhdGVTdHJpbmc7XG5cblx0XHRcdFx0Ly8gWyByZWplY3RfbGlzdCB8IHJlc29sdmVfbGlzdCBdLmRpc2FibGU7IHByb2dyZXNzX2xpc3QubG9ja1xuXHRcdFx0XHR9LCB0dXBsZXNbIGkgXiAxIF1bIDIgXS5kaXNhYmxlLCB0dXBsZXNbIDIgXVsgMiBdLmxvY2sgKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gZGVmZXJyZWRbIHJlc29sdmUgfCByZWplY3QgfCBub3RpZnkgXSA9IGxpc3QuZmlyZVxuXHRcdFx0ZGVmZXJyZWRbIHR1cGxlWzBdIF0gPSBsaXN0LmZpcmU7XG5cdFx0XHRkZWZlcnJlZFsgdHVwbGVbMF0gKyBcIldpdGhcIiBdID0gbGlzdC5maXJlV2l0aDtcblx0XHR9KTtcblxuXHRcdC8vIE1ha2UgdGhlIGRlZmVycmVkIGEgcHJvbWlzZVxuXHRcdHByb21pc2UucHJvbWlzZSggZGVmZXJyZWQgKTtcblxuXHRcdC8vIENhbGwgZ2l2ZW4gZnVuYyBpZiBhbnlcblx0XHRpZiAoIGZ1bmMgKSB7XG5cdFx0XHRmdW5jLmNhbGwoIGRlZmVycmVkLCBkZWZlcnJlZCApO1xuXHRcdH1cblxuXHRcdC8vIEFsbCBkb25lIVxuXHRcdHJldHVybiBkZWZlcnJlZDtcblx0fSxcblxuXHQvLyBEZWZlcnJlZCBoZWxwZXJcblx0d2hlbjogZnVuY3Rpb24oIHN1Ym9yZGluYXRlIC8qICwgLi4uLCBzdWJvcmRpbmF0ZU4gKi8gKSB7XG5cdFx0dmFyIGkgPSAwLFxuXHRcdFx0cmVzb2x2ZVZhbHVlcyA9IGNvcmVfc2xpY2UuY2FsbCggYXJndW1lbnRzICksXG5cdFx0XHRsZW5ndGggPSByZXNvbHZlVmFsdWVzLmxlbmd0aCxcblxuXHRcdFx0Ly8gdGhlIGNvdW50IG9mIHVuY29tcGxldGVkIHN1Ym9yZGluYXRlc1xuXHRcdFx0cmVtYWluaW5nID0gbGVuZ3RoICE9PSAxIHx8ICggc3Vib3JkaW5hdGUgJiYgalF1ZXJ5LmlzRnVuY3Rpb24oIHN1Ym9yZGluYXRlLnByb21pc2UgKSApID8gbGVuZ3RoIDogMCxcblxuXHRcdFx0Ly8gdGhlIG1hc3RlciBEZWZlcnJlZC4gSWYgcmVzb2x2ZVZhbHVlcyBjb25zaXN0IG9mIG9ubHkgYSBzaW5nbGUgRGVmZXJyZWQsIGp1c3QgdXNlIHRoYXQuXG5cdFx0XHRkZWZlcnJlZCA9IHJlbWFpbmluZyA9PT0gMSA/IHN1Ym9yZGluYXRlIDogalF1ZXJ5LkRlZmVycmVkKCksXG5cblx0XHRcdC8vIFVwZGF0ZSBmdW5jdGlvbiBmb3IgYm90aCByZXNvbHZlIGFuZCBwcm9ncmVzcyB2YWx1ZXNcblx0XHRcdHVwZGF0ZUZ1bmMgPSBmdW5jdGlvbiggaSwgY29udGV4dHMsIHZhbHVlcyApIHtcblx0XHRcdFx0cmV0dXJuIGZ1bmN0aW9uKCB2YWx1ZSApIHtcblx0XHRcdFx0XHRjb250ZXh0c1sgaSBdID0gdGhpcztcblx0XHRcdFx0XHR2YWx1ZXNbIGkgXSA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gY29yZV9zbGljZS5jYWxsKCBhcmd1bWVudHMgKSA6IHZhbHVlO1xuXHRcdFx0XHRcdGlmKCB2YWx1ZXMgPT09IHByb2dyZXNzVmFsdWVzICkge1xuXHRcdFx0XHRcdFx0ZGVmZXJyZWQubm90aWZ5V2l0aCggY29udGV4dHMsIHZhbHVlcyApO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoICEoIC0tcmVtYWluaW5nICkgKSB7XG5cdFx0XHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlV2l0aCggY29udGV4dHMsIHZhbHVlcyApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblx0XHRcdH0sXG5cblx0XHRcdHByb2dyZXNzVmFsdWVzLCBwcm9ncmVzc0NvbnRleHRzLCByZXNvbHZlQ29udGV4dHM7XG5cblx0XHQvLyBhZGQgbGlzdGVuZXJzIHRvIERlZmVycmVkIHN1Ym9yZGluYXRlczsgdHJlYXQgb3RoZXJzIGFzIHJlc29sdmVkXG5cdFx0aWYgKCBsZW5ndGggPiAxICkge1xuXHRcdFx0cHJvZ3Jlc3NWYWx1ZXMgPSBuZXcgQXJyYXkoIGxlbmd0aCApO1xuXHRcdFx0cHJvZ3Jlc3NDb250ZXh0cyA9IG5ldyBBcnJheSggbGVuZ3RoICk7XG5cdFx0XHRyZXNvbHZlQ29udGV4dHMgPSBuZXcgQXJyYXkoIGxlbmd0aCApO1xuXHRcdFx0Zm9yICggOyBpIDwgbGVuZ3RoOyBpKysgKSB7XG5cdFx0XHRcdGlmICggcmVzb2x2ZVZhbHVlc1sgaSBdICYmIGpRdWVyeS5pc0Z1bmN0aW9uKCByZXNvbHZlVmFsdWVzWyBpIF0ucHJvbWlzZSApICkge1xuXHRcdFx0XHRcdHJlc29sdmVWYWx1ZXNbIGkgXS5wcm9taXNlKClcblx0XHRcdFx0XHRcdC5kb25lKCB1cGRhdGVGdW5jKCBpLCByZXNvbHZlQ29udGV4dHMsIHJlc29sdmVWYWx1ZXMgKSApXG5cdFx0XHRcdFx0XHQuZmFpbCggZGVmZXJyZWQucmVqZWN0IClcblx0XHRcdFx0XHRcdC5wcm9ncmVzcyggdXBkYXRlRnVuYyggaSwgcHJvZ3Jlc3NDb250ZXh0cywgcHJvZ3Jlc3NWYWx1ZXMgKSApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC0tcmVtYWluaW5nO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gaWYgd2UncmUgbm90IHdhaXRpbmcgb24gYW55dGhpbmcsIHJlc29sdmUgdGhlIG1hc3RlclxuXHRcdGlmICggIXJlbWFpbmluZyApIHtcblx0XHRcdGRlZmVycmVkLnJlc29sdmVXaXRoKCByZXNvbHZlQ29udGV4dHMsIHJlc29sdmVWYWx1ZXMgKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuXHR9XG59KTtcbiJdfQ==
