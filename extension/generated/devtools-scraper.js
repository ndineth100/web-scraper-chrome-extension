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
var SitemapController = function (options, moreOptions) {
  this.$ = moreOptions.$
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJleHRlbnNpb24vYXNzZXRzL2Jhc2U2NC5qcyIsImV4dGVuc2lvbi9hc3NldHMvanF1ZXJ5LndoZW5jYWxsc2VxdWVudGlhbGx5LmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvQXBwLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvQmFja2dyb3VuZFNjcmlwdC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL0NvbnRlbnRTY3JpcHQuanMiLCJleHRlbnNpb24vc2NyaXB0cy9Db250ZW50U2VsZWN0b3IuanMiLCJleHRlbnNpb24vc2NyaXB0cy9Db250cm9sbGVyLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvRWxlbWVudFF1ZXJ5LmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckVsZW1lbnQuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckVsZW1lbnRBdHRyaWJ1dGUuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckVsZW1lbnRDbGljay5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9yL1NlbGVjdG9yRWxlbWVudFNjcm9sbC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9yL1NlbGVjdG9yR3JvdXAuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckhUTUwuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckltYWdlLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IvU2VsZWN0b3JMaW5rLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IvU2VsZWN0b3JQb3B1cExpbmsuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvclRhYmxlLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IvU2VsZWN0b3JUZXh0LmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3JMaXN0LmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3JzLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2l0ZW1hcC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1N0b3JlRGV2dG9vbHMuanMiLCJleHRlbnNpb24vc2NyaXB0cy9VbmlxdWVFbGVtZW50TGlzdC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL2dldEJhY2tncm91bmRTY3JpcHQuanMiLCJleHRlbnNpb24vc2NyaXB0cy9nZXRDb250ZW50U2NyaXB0LmpzIiwibm9kZV9tb2R1bGVzL2Nzcy1zZWxlY3Rvci9saWIvQ3NzU2VsZWN0b3IuanMiLCJub2RlX21vZHVsZXMvanF1ZXJ5LWRlZmVycmVkL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2pxdWVyeS1kZWZlcnJlZC9saWIvanF1ZXJ5LWNhbGxiYWNrcy5qcyIsIm5vZGVfbW9kdWxlcy9qcXVlcnktZGVmZXJyZWQvbGliL2pxdWVyeS1jb3JlLmpzIiwibm9kZV9tb2R1bGVzL2pxdWVyeS1kZWZlcnJlZC9saWIvanF1ZXJ5LWRlZmVycmVkLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcFhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuMkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9IQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3ZUE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbi8qKlxuICogQHVybCBodHRwOi8vanNwZXJmLmNvbS9ibG9iLWJhc2U2NC1jb252ZXJzaW9uXG4gKiBAdHlwZSB7e2Jsb2JUb0Jhc2U2NDogYmxvYlRvQmFzZTY0LCBiYXNlNjRUb0Jsb2I6IGJhc2U2NFRvQmxvYn19XG4gKi9cbnZhciBCYXNlNjQgPSB7XG5cbiAgYmxvYlRvQmFzZTY0OiBmdW5jdGlvbiAoYmxvYikge1xuICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgZGF0YVVybCA9IHJlYWRlci5yZXN1bHRcbiAgICAgIHZhciBiYXNlNjQgPSBkYXRhVXJsLnNwbGl0KCcsJylbMV1cbiAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZShiYXNlNjQpXG4gICAgfVxuICAgIHJlYWRlci5yZWFkQXNEYXRhVVJMKGJsb2IpXG5cbiAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZS5wcm9taXNlKClcbiAgfSxcblxuICBiYXNlNjRUb0Jsb2I6IGZ1bmN0aW9uIChiYXNlNjQsIG1pbWVUeXBlKSB7XG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciBiaW5hcnkgPSBhdG9iKGJhc2U2NClcbiAgICB2YXIgbGVuID0gYmluYXJ5Lmxlbmd0aFxuICAgIHZhciBidWZmZXIgPSBuZXcgQXJyYXlCdWZmZXIobGVuKVxuICAgIHZhciB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyKVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHZpZXdbaV0gPSBiaW5hcnkuY2hhckNvZGVBdChpKVxuICAgIH1cbiAgICB2YXIgYmxvYiA9IG5ldyBCbG9iKFt2aWV3XSwge3R5cGU6IG1pbWVUeXBlfSlcbiAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUoYmxvYilcblxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQmFzZTY0XG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbi8qKlxuICogQGF1dGhvciBNYXJ0aW5zIEJhbG9kaXNcbiAqXG4gKiBBbiBhbHRlcm5hdGl2ZSB2ZXJzaW9uIG9mICQud2hlbiB3aGljaCBjYW4gYmUgdXNlZCB0byBleGVjdXRlIGFzeW5jaHJvbm91c1xuICogY2FsbHMgc2VxdWVudGlhbGx5IG9uZSBhZnRlciBhbm90aGVyLlxuICpcbiAqIEByZXR1cm5zIGpxdWVyeURlZmVycmVkKCkucHJvbWlzZSgpXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gd2hlbkNhbGxTZXF1ZW50aWFsbHkgKGZ1bmN0aW9uQ2FsbHMpIHtcbiAgdmFyIGRlZmVycmVkUmVzb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gIHZhciByZXN1bHREYXRhID0gW11cblxuXHQvLyBub3RoaW5nIHRvIGRvXG4gIGlmIChmdW5jdGlvbkNhbGxzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBkZWZlcnJlZFJlc29uc2UucmVzb2x2ZShyZXN1bHREYXRhKS5wcm9taXNlKClcbiAgfVxuXG4gIHZhciBjdXJyZW50RGVmZXJyZWQgPSBmdW5jdGlvbkNhbGxzLnNoaWZ0KCkoKVxuXHQvLyBleGVjdXRlIHN5bmNocm9ub3VzIGNhbGxzIHN5bmNocm9ub3VzbHlcbiAgd2hpbGUgKGN1cnJlbnREZWZlcnJlZC5zdGF0ZSgpID09PSAncmVzb2x2ZWQnKSB7XG4gICAgY3VycmVudERlZmVycmVkLmRvbmUoZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgIHJlc3VsdERhdGEucHVzaChkYXRhKVxuICAgIH0pXG4gICAgaWYgKGZ1bmN0aW9uQ2FsbHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gZGVmZXJyZWRSZXNvbnNlLnJlc29sdmUocmVzdWx0RGF0YSkucHJvbWlzZSgpXG4gICAgfVxuICAgIGN1cnJlbnREZWZlcnJlZCA9IGZ1bmN0aW9uQ2FsbHMuc2hpZnQoKSgpXG4gIH1cblxuXHQvLyBoYW5kbGUgYXN5bmMgY2FsbHNcbiAgdmFyIGludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuXHRcdC8vIGhhbmRsZSBtaXhlZCBzeW5jIGNhbGxzXG4gICAgd2hpbGUgKGN1cnJlbnREZWZlcnJlZC5zdGF0ZSgpID09PSAncmVzb2x2ZWQnKSB7XG4gICAgICBjdXJyZW50RGVmZXJyZWQuZG9uZShmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICByZXN1bHREYXRhLnB1c2goZGF0YSlcbiAgICAgIH0pXG4gICAgICBpZiAoZnVuY3Rpb25DYWxscy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbClcbiAgICAgICAgZGVmZXJyZWRSZXNvbnNlLnJlc29sdmUocmVzdWx0RGF0YSlcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGN1cnJlbnREZWZlcnJlZCA9IGZ1bmN0aW9uQ2FsbHMuc2hpZnQoKSgpXG4gICAgfVxuICB9LCAxMClcblxuICByZXR1cm4gZGVmZXJyZWRSZXNvbnNlLnByb21pc2UoKVxufVxuIiwidmFyIFN0b3JlRGV2dG9vbHMgPSByZXF1aXJlKCcuL1N0b3JlRGV2dG9vbHMnKVxudmFyIFNpdGVtYXBDb250cm9sbGVyID0gcmVxdWlyZSgnLi9Db250cm9sbGVyJylcblxuJChmdW5jdGlvbiAoKSB7XG5cdC8vIGluaXQgYm9vdHN0cmFwIGFsZXJ0c1xuICAkKCcuYWxlcnQnKS5hbGVydCgpXG5cbiAgdmFyIHN0b3JlID0gbmV3IFN0b3JlRGV2dG9vbHMoeyR9KVxuICBuZXcgU2l0ZW1hcENvbnRyb2xsZXIoe1xuICAgIHN0b3JlOiBzdG9yZSxcbiAgICB0ZW1wbGF0ZURpcjogJ3ZpZXdzLydcbiAgfSwgeyR9KVxufSlcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxuLyoqXG4gKiBDb250ZW50U2NyaXB0IHRoYXQgY2FuIGJlIGNhbGxlZCBmcm9tIGFueXdoZXJlIHdpdGhpbiB0aGUgZXh0ZW5zaW9uXG4gKi9cbnZhciBCYWNrZ3JvdW5kU2NyaXB0ID0ge1xuXG4gIGR1bW15OiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGpxdWVyeS5EZWZlcnJlZCgpLnJlc29sdmUoJ2R1bW15JykucHJvbWlzZSgpXG4gIH0sXG5cblx0LyoqXG5cdCAqIFJldHVybnMgdGhlIGlkIG9mIHRoZSB0YWIgdGhhdCBpcyB2aXNpYmxlIHRvIHVzZXJcblx0ICogQHJldHVybnMganF1ZXJ5LkRlZmVycmVkKCkgaW50ZWdlclxuXHQgKi9cbiAgZ2V0QWN0aXZlVGFiSWQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgICBjaHJvbWUudGFicy5xdWVyeSh7XG4gICAgICBhY3RpdmU6IHRydWUsXG4gICAgICBjdXJyZW50V2luZG93OiB0cnVlXG4gICAgfSwgZnVuY3Rpb24gKHRhYnMpIHtcbiAgICAgIGlmICh0YWJzLmxlbmd0aCA8IDEpIHtcblx0XHRcdFx0Ly8gQFRPRE8gbXVzdCBiZSBydW5uaW5nIHdpdGhpbiBwb3B1cC4gbWF5YmUgZmluZCBhbm90aGVyIGFjdGl2ZSB3aW5kb3c/XG4gICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVqZWN0KFwiY291bGRuJ3QgZmluZCB0aGUgYWN0aXZlIHRhYlwiKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHRhYklkID0gdGFic1swXS5pZFxuICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUodGFiSWQpXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZS5wcm9taXNlKClcbiAgfSxcblxuXHQvKipcblx0ICogRXhlY3V0ZSBhIGZ1bmN0aW9uIHdpdGhpbiB0aGUgYWN0aXZlIHRhYiB3aXRoaW4gY29udGVudCBzY3JpcHRcblx0ICogQHBhcmFtIHJlcXVlc3QuZm5cdGZ1bmN0aW9uIHRvIGNhbGxcblx0ICogQHBhcmFtIHJlcXVlc3QucmVxdWVzdFx0cmVxdWVzdCB0aGF0IHdpbGwgYmUgcGFzc2VkIHRvIHRoZSBmdW5jdGlvblxuXHQgKi9cbiAgZXhlY3V0ZUNvbnRlbnRTY3JpcHQ6IGZ1bmN0aW9uIChyZXF1ZXN0KSB7XG4gICAgdmFyIHJlcVRvQ29udGVudFNjcmlwdCA9IHtcbiAgICAgIGNvbnRlbnRTY3JpcHRDYWxsOiB0cnVlLFxuICAgICAgZm46IHJlcXVlc3QuZm4sXG4gICAgICByZXF1ZXN0OiByZXF1ZXN0LnJlcXVlc3RcbiAgICB9XG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciBkZWZlcnJlZEFjdGl2ZVRhYklkID0gdGhpcy5nZXRBY3RpdmVUYWJJZCgpXG4gICAgZGVmZXJyZWRBY3RpdmVUYWJJZC5kb25lKGZ1bmN0aW9uICh0YWJJZCkge1xuICAgICAgY2hyb21lLnRhYnMuc2VuZE1lc3NhZ2UodGFiSWQsIHJlcVRvQ29udGVudFNjcmlwdCwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZShyZXNwb25zZSlcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBCYWNrZ3JvdW5kU2NyaXB0XG4iLCJ2YXIgQ29udGVudFNlbGVjdG9yID0gcmVxdWlyZSgnLi9Db250ZW50U2VsZWN0b3InKVxudmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG4vKipcbiAqIENvbnRlbnRTY3JpcHQgdGhhdCBjYW4gYmUgY2FsbGVkIGZyb20gYW55d2hlcmUgd2l0aGluIHRoZSBleHRlbnNpb25cbiAqL1xudmFyIENvbnRlbnRTY3JpcHQgPSB7XG5cblx0LyoqXG5cdCAqIEZldGNoXG5cdCAqIEBwYXJhbSByZXF1ZXN0LkNTU1NlbGVjdG9yXHRjc3Mgc2VsZWN0b3IgYXMgc3RyaW5nXG5cdCAqIEByZXR1cm5zIGpxdWVyeS5EZWZlcnJlZCgpXG5cdCAqL1xuICBnZXRIVE1MOiBmdW5jdGlvbiAocmVxdWVzdCwgb3B0aW9ucykge1xuICAgIHZhciAkID0gb3B0aW9ucy4kXG4gICAgdmFyIGRlZmVycmVkSFRNTCA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIGh0bWwgPSAkKHJlcXVlc3QuQ1NTU2VsZWN0b3IpLmNsb25lKCkud3JhcCgnPHA+JykucGFyZW50KCkuaHRtbCgpXG4gICAgZGVmZXJyZWRIVE1MLnJlc29sdmUoaHRtbClcbiAgICByZXR1cm4gZGVmZXJyZWRIVE1MLnByb21pc2UoKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBSZW1vdmVzIGN1cnJlbnQgY29udGVudCBzZWxlY3RvciBpZiBpcyBpbiB1c2Ugd2l0aGluIHRoZSBwYWdlXG5cdCAqIEByZXR1cm5zIGpxdWVyeS5EZWZlcnJlZCgpXG5cdCAqL1xuICByZW1vdmVDdXJyZW50Q29udGVudFNlbGVjdG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciBjb250ZW50U2VsZWN0b3IgPSB3aW5kb3cuY3NcbiAgICBpZiAoY29udGVudFNlbGVjdG9yID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZSgpXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnRlbnRTZWxlY3Rvci5yZW1vdmVHVUkoKVxuICAgICAgd2luZG93LmNzID0gdW5kZWZpbmVkXG4gICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUoKVxuICAgIH1cblxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBTZWxlY3QgZWxlbWVudHMgd2l0aGluIHRoZSBwYWdlXG5cdCAqIEBwYXJhbSByZXF1ZXN0LnBhcmVudENTU1NlbGVjdG9yXG5cdCAqIEBwYXJhbSByZXF1ZXN0LmFsbG93ZWRFbGVtZW50c1xuXHQgKi9cbiAgc2VsZWN0U2VsZWN0b3I6IGZ1bmN0aW9uIChyZXF1ZXN0LCBvcHRpb25zKSB7XG4gICAgdmFyICQgPSBvcHRpb25zLiRcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgICB0aGlzLnJlbW92ZUN1cnJlbnRDb250ZW50U2VsZWN0b3IoKS5kb25lKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBjb250ZW50U2VsZWN0b3IgPSBuZXcgQ29udGVudFNlbGVjdG9yKHtcbiAgICAgICAgcGFyZW50Q1NTU2VsZWN0b3I6IHJlcXVlc3QucGFyZW50Q1NTU2VsZWN0b3IsXG4gICAgICAgIGFsbG93ZWRFbGVtZW50czogcmVxdWVzdC5hbGxvd2VkRWxlbWVudHNcbiAgICAgIH0sIHskfSlcbiAgICAgIHdpbmRvdy5jcyA9IGNvbnRlbnRTZWxlY3RvclxuXG4gICAgICB2YXIgZGVmZXJyZWRDU1NTZWxlY3RvciA9IGNvbnRlbnRTZWxlY3Rvci5nZXRDU1NTZWxlY3RvcigpXG4gICAgICBkZWZlcnJlZENTU1NlbGVjdG9yLmRvbmUoZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlQ3VycmVudENvbnRlbnRTZWxlY3RvcigpLmRvbmUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZShyZXNwb25zZSlcbiAgICAgICAgICB3aW5kb3cuY3MgPSB1bmRlZmluZWRcbiAgICAgICAgfSlcbiAgICAgIH0uYmluZCh0aGlzKSkuZmFpbChmdW5jdGlvbiAobWVzc2FnZSkge1xuICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlamVjdChtZXNzYWdlKVxuICAgICAgICB3aW5kb3cuY3MgPSB1bmRlZmluZWRcbiAgICAgIH0pXG4gICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gIH0sXG5cblx0LyoqXG5cdCAqIFByZXZpZXcgZWxlbWVudHNcblx0ICogQHBhcmFtIHJlcXVlc3QucGFyZW50Q1NTU2VsZWN0b3Jcblx0ICogQHBhcmFtIHJlcXVlc3QuZWxlbWVudENTU1NlbGVjdG9yXG5cdCAqL1xuICBwcmV2aWV3U2VsZWN0b3I6IGZ1bmN0aW9uIChyZXF1ZXN0LCBvcHRpb25zKSB7XG4gICAgdmFyICQgPSBvcHRpb25zLiRcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdGhpcy5yZW1vdmVDdXJyZW50Q29udGVudFNlbGVjdG9yKCkuZG9uZShmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgY29udGVudFNlbGVjdG9yID0gbmV3IENvbnRlbnRTZWxlY3Rvcih7XG4gICAgICAgIHBhcmVudENTU1NlbGVjdG9yOiByZXF1ZXN0LnBhcmVudENTU1NlbGVjdG9yXG4gICAgICB9LCB7JH0pXG4gICAgICB3aW5kb3cuY3MgPSBjb250ZW50U2VsZWN0b3JcblxuICAgICAgdmFyIGRlZmVycmVkU2VsZWN0b3JQcmV2aWV3ID0gY29udGVudFNlbGVjdG9yLnByZXZpZXdTZWxlY3RvcihyZXF1ZXN0LmVsZW1lbnRDU1NTZWxlY3RvcilcbiAgICAgIGRlZmVycmVkU2VsZWN0b3JQcmV2aWV3LmRvbmUoZnVuY3Rpb24gKCkge1xuICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUoKVxuICAgICAgfSkuZmFpbChmdW5jdGlvbiAobWVzc2FnZSkge1xuICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlamVjdChtZXNzYWdlKVxuICAgICAgICB3aW5kb3cuY3MgPSB1bmRlZmluZWRcbiAgICAgIH0pXG4gICAgfSlcbiAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQ29udGVudFNjcmlwdFxuIiwidmFyIEVsZW1lbnRRdWVyeSA9IHJlcXVpcmUoJy4vRWxlbWVudFF1ZXJ5JylcbnZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxudmFyIENzc1NlbGVjdG9yID0gcmVxdWlyZSgnY3NzLXNlbGVjdG9yJykuQ3NzU2VsZWN0b3Jcbi8qKlxuICogQHBhcmFtIG9wdGlvbnMucGFyZW50Q1NTU2VsZWN0b3JcdEVsZW1lbnRzIGNhbiBiZSBvbmx5IHNlbGVjdGVkIHdpdGhpbiB0aGlzIGVsZW1lbnRcbiAqIEBwYXJhbSBvcHRpb25zLmFsbG93ZWRFbGVtZW50c1x0RWxlbWVudHMgdGhhdCBjYW4gb25seSBiZSBzZWxlY3RlZFxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBDb250ZW50U2VsZWN0b3IgPSBmdW5jdGlvbiAob3B0aW9ucywgbW9yZU9wdGlvbnMpIHtcblx0Ly8gZGVmZXJyZWQgcmVzcG9uc2VcbiAgdGhpcy5kZWZlcnJlZENTU1NlbGVjdG9yUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gIHRoaXMuYWxsb3dlZEVsZW1lbnRzID0gb3B0aW9ucy5hbGxvd2VkRWxlbWVudHNcbiAgdGhpcy5wYXJlbnRDU1NTZWxlY3RvciA9IG9wdGlvbnMucGFyZW50Q1NTU2VsZWN0b3IudHJpbSgpXG4gIHRoaXMuYWxlcnQgPSBvcHRpb25zLmFsZXJ0IHx8IGZ1bmN0aW9uICh0eHQpIHsgYWxlcnQodHh0KSB9XG5cbiAgdGhpcy4kID0gbW9yZU9wdGlvbnMuJFxuICBpZiAoIXRoaXMuJCkgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIGpxdWVyeSBpbiBjb250ZW50IHNlbGVjdG9yJylcbiAgaWYgKHRoaXMucGFyZW50Q1NTU2VsZWN0b3IpIHtcbiAgICB0aGlzLnBhcmVudCA9IHRoaXMuJCh0aGlzLnBhcmVudENTU1NlbGVjdG9yKVswXVxuXG5cdFx0Ly8gIGhhbmRsZSBzaXR1YXRpb24gd2hlbiBwYXJlbnQgc2VsZWN0b3Igbm90IGZvdW5kXG4gICAgaWYgKHRoaXMucGFyZW50ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuZGVmZXJyZWRDU1NTZWxlY3RvclJlc3BvbnNlLnJlamVjdCgncGFyZW50IHNlbGVjdG9yIG5vdCBmb3VuZCcpXG4gICAgICB0aGlzLmFsZXJ0KCdQYXJlbnQgZWxlbWVudCBub3QgZm91bmQhJylcbiAgICB9XG4gIH1cdGVsc2Uge1xuICAgIHRoaXMucGFyZW50ID0gdGhpcy4kKCdib2R5JylbMF1cbiAgfVxufVxuXG5Db250ZW50U2VsZWN0b3IucHJvdG90eXBlID0ge1xuXG5cdC8qKlxuXHQgKiBnZXQgY3NzIHNlbGVjdG9yIHNlbGVjdGVkIGJ5IHRoZSB1c2VyXG5cdCAqL1xuICBnZXRDU1NTZWxlY3RvcjogZnVuY3Rpb24gKHJlcXVlc3QpIHtcbiAgICBpZiAodGhpcy5kZWZlcnJlZENTU1NlbGVjdG9yUmVzcG9uc2Uuc3RhdGUoKSAhPT0gJ3JlamVjdGVkJykge1xuXHRcdFx0Ly8gZWxlbWVudHMgdGhhdCBhcmUgc2VsZWN0ZWQgYnkgdGhlIHVzZXJcbiAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50cyA9IFtdXG5cdFx0XHQvLyBlbGVtZW50IHNlbGVjdGVkIGZyb20gdG9wXG4gICAgICB0aGlzLnRvcCA9IDBcblxuXHRcdFx0Ly8gaW5pdGlhbGl6ZSBjc3Mgc2VsZWN0b3JcbiAgICAgIHRoaXMuaW5pdENzc1NlbGVjdG9yKGZhbHNlKVxuXG4gICAgICB0aGlzLmluaXRHVUkoKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmRlZmVycmVkQ1NTU2VsZWN0b3JSZXNwb25zZS5wcm9taXNlKClcbiAgfSxcblxuICBnZXRDdXJyZW50Q1NTU2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5zZWxlY3RlZEVsZW1lbnRzICYmIHRoaXMuc2VsZWN0ZWRFbGVtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICB2YXIgY3NzU2VsZWN0b3JcblxuXHRcdFx0Ly8gaGFuZGxlIHNwZWNpYWwgY2FzZSB3aGVuIHBhcmVudCBpcyBzZWxlY3RlZFxuICAgICAgaWYgKHRoaXMuaXNQYXJlbnRTZWxlY3RlZCgpKSB7XG4gICAgICAgIGlmICh0aGlzLnNlbGVjdGVkRWxlbWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgY3NzU2VsZWN0b3IgPSAnX3BhcmVudF8nXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy4kKCcjLXNlbGVjdG9yLXRvb2xiYXIgW25hbWU9ZGlmZXJlbnRFbGVtZW50U2VsZWN0aW9uXScpLnByb3AoJ2NoZWNrZWQnKSkge1xuICAgICAgICAgIHZhciBzZWxlY3RlZEVsZW1lbnRzID0gdGhpcy5zZWxlY3RlZEVsZW1lbnRzLmNsb25lKClcbiAgICAgICAgICBzZWxlY3RlZEVsZW1lbnRzLnNwbGljZShzZWxlY3RlZEVsZW1lbnRzLmluZGV4T2YodGhpcy5wYXJlbnQpLCAxKVxuICAgICAgICAgIGNzc1NlbGVjdG9yID0gJ19wYXJlbnRfLCAnICsgdGhpcy5jc3NTZWxlY3Rvci5nZXRDc3NTZWxlY3RvcihzZWxlY3RlZEVsZW1lbnRzLCB0aGlzLnRvcClcbiAgICAgICAgfSBlbHNlIHtcblx0XHRcdFx0XHQvLyB3aWxsIHRyaWdnZXIgZXJyb3Igd2hlcmUgbXVsdGlwbGUgc2VsZWN0aW9ucyBhcmUgbm90IGFsbG93ZWRcbiAgICAgICAgICBjc3NTZWxlY3RvciA9IHRoaXMuY3NzU2VsZWN0b3IuZ2V0Q3NzU2VsZWN0b3IodGhpcy5zZWxlY3RlZEVsZW1lbnRzLCB0aGlzLnRvcClcbiAgICAgICAgfVxuICAgICAgfVx0XHRcdGVsc2Uge1xuICAgICAgICBjc3NTZWxlY3RvciA9IHRoaXMuY3NzU2VsZWN0b3IuZ2V0Q3NzU2VsZWN0b3IodGhpcy5zZWxlY3RlZEVsZW1lbnRzLCB0aGlzLnRvcClcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGNzc1NlbGVjdG9yXG4gICAgfVxuICAgIHJldHVybiAnJ1xuICB9LFxuXG4gIGlzUGFyZW50U2VsZWN0ZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5zZWxlY3RlZEVsZW1lbnRzLmluZGV4T2YodGhpcy5wYXJlbnQpICE9PSAtMVxuICB9LFxuXG5cdC8qKlxuXHQgKiBpbml0aWFsaXplIG9yIHJlY29uZmlndXJlIGNzcyBzZWxlY3RvciBjbGFzc1xuXHQgKiBAcGFyYW0gYWxsb3dNdWx0aXBsZVNlbGVjdG9yc1xuXHQgKi9cbiAgaW5pdENzc1NlbGVjdG9yOiBmdW5jdGlvbiAoYWxsb3dNdWx0aXBsZVNlbGVjdG9ycykge1xuICAgIHRoaXMuY3NzU2VsZWN0b3IgPSBuZXcgQ3NzU2VsZWN0b3Ioe1xuICAgICAgZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yOiB0cnVlLFxuICAgICAgcGFyZW50OiB0aGlzLnBhcmVudCxcbiAgICAgIGFsbG93TXVsdGlwbGVTZWxlY3RvcnM6IGFsbG93TXVsdGlwbGVTZWxlY3RvcnMsXG4gICAgICBpZ25vcmVkQ2xhc3NlczogW1xuICAgICAgICAnLXNpdGVtYXAtc2VsZWN0LWl0ZW0tc2VsZWN0ZWQnLFxuICAgICAgICAnLXNpdGVtYXAtc2VsZWN0LWl0ZW0taG92ZXInLFxuICAgICAgICAnLXNpdGVtYXAtcGFyZW50JyxcbiAgICAgICAgJy13ZWItc2NyYXBlci1pbWctb24tdG9wJyxcbiAgICAgICAgJy13ZWItc2NyYXBlci1zZWxlY3Rpb24tYWN0aXZlJ1xuICAgICAgXSxcbiAgICAgIHF1ZXJ5OiB0aGlzLiRcbiAgICB9KVxuICB9LFxuXG4gIHByZXZpZXdTZWxlY3RvcjogZnVuY3Rpb24gKGVsZW1lbnRDU1NTZWxlY3Rvcikge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgaWYgKHRoaXMuZGVmZXJyZWRDU1NTZWxlY3RvclJlc3BvbnNlLnN0YXRlKCkgIT09ICdyZWplY3RlZCcpIHtcbiAgICAgIHRoaXMuaGlnaGxpZ2h0UGFyZW50KClcbiAgICAgICQoRWxlbWVudFF1ZXJ5KGVsZW1lbnRDU1NTZWxlY3RvciwgdGhpcy5wYXJlbnQsIHskfSkpLmFkZENsYXNzKCctc2l0ZW1hcC1zZWxlY3QtaXRlbS1zZWxlY3RlZCcpXG4gICAgICB0aGlzLmRlZmVycmVkQ1NTU2VsZWN0b3JSZXNwb25zZS5yZXNvbHZlKClcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5kZWZlcnJlZENTU1NlbGVjdG9yUmVzcG9uc2UucHJvbWlzZSgpXG4gIH0sXG5cbiAgaW5pdEdVSTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuaGlnaGxpZ2h0UGFyZW50KClcblxuXHRcdC8vIGFsbCBlbGVtZW50cyBleGNlcHQgdG9vbGJhclxuICAgIHRoaXMuJGFsbEVsZW1lbnRzID0gdGhpcy4kKHRoaXMuYWxsb3dlZEVsZW1lbnRzICsgJzpub3QoIy1zZWxlY3Rvci10b29sYmFyKTpub3QoIy1zZWxlY3Rvci10b29sYmFyICopJywgdGhpcy5wYXJlbnQpXG5cdFx0Ly8gYWxsb3cgc2VsZWN0aW5nIHBhcmVudCBhbHNvXG4gICAgaWYgKHRoaXMucGFyZW50ICE9PSBkb2N1bWVudC5ib2R5KSB7XG4gICAgICB0aGlzLiRhbGxFbGVtZW50cy5wdXNoKHRoaXMucGFyZW50KVxuICAgIH1cblxuICAgIHRoaXMuYmluZEVsZW1lbnRIaWdobGlnaHQoKVxuICAgIHRoaXMuYmluZEVsZW1lbnRTZWxlY3Rpb24oKVxuICAgIHRoaXMuYmluZEtleWJvYXJkU2VsZWN0aW9uTWFuaXB1bGF0aW9ucygpXG4gICAgdGhpcy5hdHRhY2hUb29sYmFyKClcbiAgICB0aGlzLmJpbmRNdWx0aXBsZUdyb3VwQ2hlY2tib3goKVxuICAgIHRoaXMuYmluZE11bHRpcGxlR3JvdXBQb3B1cEhpZGUoKVxuICAgIHRoaXMuYmluZE1vdmVJbWFnZXNUb1RvcCgpXG4gIH0sXG5cbiAgYmluZEVsZW1lbnRTZWxlY3Rpb246IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiRhbGxFbGVtZW50cy5iaW5kKCdjbGljay5lbGVtZW50U2VsZWN0b3InLCBmdW5jdGlvbiAoZSkge1xuICAgICAgdmFyIGVsZW1lbnQgPSBlLmN1cnJlbnRUYXJnZXRcbiAgICAgIGlmICh0aGlzLnNlbGVjdGVkRWxlbWVudHMuaW5kZXhPZihlbGVtZW50KSA9PT0gLTEpIHtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnRzLnB1c2goZWxlbWVudClcbiAgICAgIH1cbiAgICAgIHRoaXMuaGlnaGxpZ2h0U2VsZWN0ZWRFbGVtZW50cygpXG5cblx0XHRcdC8vIENhbmNlbCBhbGwgb3RoZXIgZXZlbnRzXG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG5cblx0LyoqXG5cdCAqIEFkZCB0byBzZWxlY3QgZWxlbWVudHMgdGhlIGVsZW1lbnQgdGhhdCBpcyB1bmRlciB0aGUgbW91c2Vcblx0ICovXG4gIHNlbGVjdE1vdXNlT3ZlckVsZW1lbnQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZWxlbWVudCA9IHRoaXMubW91c2VPdmVyRWxlbWVudFxuICAgIGlmIChlbGVtZW50KSB7XG4gICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudHMucHVzaChlbGVtZW50KVxuICAgICAgdGhpcy5oaWdobGlnaHRTZWxlY3RlZEVsZW1lbnRzKClcbiAgICB9XG4gIH0sXG5cbiAgYmluZEVsZW1lbnRIaWdobGlnaHQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQodGhpcy4kYWxsRWxlbWVudHMpLmJpbmQoJ21vdXNlb3Zlci5lbGVtZW50U2VsZWN0b3InLCBmdW5jdGlvbiAoZSkge1xuICAgICAgdmFyIGVsZW1lbnQgPSBlLmN1cnJlbnRUYXJnZXRcbiAgICAgIHRoaXMubW91c2VPdmVyRWxlbWVudCA9IGVsZW1lbnRcbiAgICAgIHRoaXMuJChlbGVtZW50KS5hZGRDbGFzcygnLXNpdGVtYXAtc2VsZWN0LWl0ZW0taG92ZXInKVxuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfS5iaW5kKHRoaXMpKS5iaW5kKCdtb3VzZW91dC5lbGVtZW50U2VsZWN0b3InLCBmdW5jdGlvbiAoZSkge1xuICAgICAgdmFyIGVsZW1lbnQgPSBlLmN1cnJlbnRUYXJnZXRcbiAgICAgIHRoaXMubW91c2VPdmVyRWxlbWVudCA9IG51bGxcbiAgICAgIHRoaXMuJChlbGVtZW50KS5yZW1vdmVDbGFzcygnLXNpdGVtYXAtc2VsZWN0LWl0ZW0taG92ZXInKVxuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuXG4gIGJpbmRNb3ZlSW1hZ2VzVG9Ub3A6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoJ2JvZHknKS5hZGRDbGFzcygnLXdlYi1zY3JhcGVyLXNlbGVjdGlvbi1hY3RpdmUnKVxuXG5cdFx0Ly8gZG8gdGhpcyBvbmx5IHdoZW4gc2VsZWN0aW5nIGltYWdlc1xuICAgIGlmICh0aGlzLmFsbG93ZWRFbGVtZW50cyA9PT0gJ2ltZycpIHtcbiAgICAgIHRoaXMuJCgnaW1nJykuZmlsdGVyKGZ1bmN0aW9uIChpLCBlbGVtZW50KSB7XG4gICAgICAgIHJldHVybiB0aGlzLiQoZWxlbWVudCkuY3NzKCdwb3NpdGlvbicpID09PSAnc3RhdGljJ1xuICAgICAgfSkuYWRkQ2xhc3MoJy13ZWItc2NyYXBlci1pbWctb24tdG9wJylcbiAgICB9XG4gIH0sXG5cbiAgdW5iaW5kTW92ZUltYWdlc1RvVG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKCdib2R5Li13ZWItc2NyYXBlci1zZWxlY3Rpb24tYWN0aXZlJykucmVtb3ZlQ2xhc3MoJy13ZWItc2NyYXBlci1zZWxlY3Rpb24tYWN0aXZlJylcbiAgICB0aGlzLiQoJ2ltZy4td2ViLXNjcmFwZXItaW1nLW9uLXRvcCcpLnJlbW92ZUNsYXNzKCctd2ViLXNjcmFwZXItaW1nLW9uLXRvcCcpXG4gIH0sXG5cbiAgc2VsZWN0Q2hpbGQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnRvcC0tXG4gICAgaWYgKHRoaXMudG9wIDwgMCkge1xuICAgICAgdGhpcy50b3AgPSAwXG4gICAgfVxuICB9LFxuICBzZWxlY3RQYXJlbnQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnRvcCsrXG4gIH0sXG5cblx0Ly8gVXNlciB3aXRoIGtleWJvYXJkIGFycm93cyBjYW4gc2VsZWN0IGNoaWxkIG9yIHBhcmV0IGVsZW1lbnRzIG9mIHNlbGVjdGVkIGVsZW1lbnRzLlxuICBiaW5kS2V5Ym9hcmRTZWxlY3Rpb25NYW5pcHVsYXRpb25zOiBmdW5jdGlvbiAoKSB7XG5cdFx0Ly8gY2hlY2sgZm9yIGZvY3VzXG4gICAgdmFyIGxhc3RGb2N1c1N0YXR1c1xuICAgIHRoaXMua2V5UHJlc3NGb2N1c0ludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGZvY3VzID0gZG9jdW1lbnQuaGFzRm9jdXMoKVxuICAgICAgaWYgKGZvY3VzID09PSBsYXN0Rm9jdXNTdGF0dXMpIHJldHVyblxuICAgICAgbGFzdEZvY3VzU3RhdHVzID0gZm9jdXNcblxuICAgICAgdGhpcy4kKCcjLXNlbGVjdG9yLXRvb2xiYXIgLmtleS1idXR0b24nKS50b2dnbGVDbGFzcygnaGlkZScsICFmb2N1cylcbiAgICAgIHRoaXMuJCgnIy1zZWxlY3Rvci10b29sYmFyIC5rZXktZXZlbnRzJykudG9nZ2xlQ2xhc3MoJ2hpZGUnLCBmb2N1cylcbiAgICB9LCAyMDApXG5cblx0XHQvLyBVc2luZyB1cC9kb3duIGFycm93cyB1c2VyIGNhbiBzZWxlY3QgZWxlbWVudHMgZnJvbSB0b3Agb2YgdGhlXG5cdFx0Ly8gc2VsZWN0ZWQgZWxlbWVudFxuICAgIHRoaXMuJChkb2N1bWVudCkuYmluZCgna2V5ZG93bi5zZWxlY3Rpb25NYW5pcHVsYXRpb24nLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdC8vIHNlbGVjdCBjaGlsZCBDXG4gICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gNjcpIHtcbiAgICAgICAgdGhpcy5hbmltYXRlQ2xpY2tlZEtleSh0aGlzLiQoJyMtc2VsZWN0b3ItdG9vbGJhciAua2V5LWJ1dHRvbi1jaGlsZCcpKVxuICAgICAgICB0aGlzLnNlbGVjdENoaWxkKClcbiAgICAgIH1cblx0XHRcdC8vIHNlbGVjdCBwYXJlbnQgUFxuICAgICAgZWxzZSBpZiAoZXZlbnQua2V5Q29kZSA9PT0gODApIHtcbiAgICAgICAgdGhpcy5hbmltYXRlQ2xpY2tlZEtleSh0aGlzLiQoJyMtc2VsZWN0b3ItdG9vbGJhciAua2V5LWJ1dHRvbi1wYXJlbnQnKSlcbiAgICAgICAgdGhpcy5zZWxlY3RQYXJlbnQoKVxuICAgICAgfVxuXHRcdFx0Ly8gc2VsZWN0IGVsZW1lbnRcbiAgICAgIGVsc2UgaWYgKGV2ZW50LmtleUNvZGUgPT09IDgzKSB7XG4gICAgICAgIHRoaXMuYW5pbWF0ZUNsaWNrZWRLZXkodGhpcy4kKCcjLXNlbGVjdG9yLXRvb2xiYXIgLmtleS1idXR0b24tc2VsZWN0JykpXG4gICAgICAgIHRoaXMuc2VsZWN0TW91c2VPdmVyRWxlbWVudCgpXG4gICAgICB9XG5cbiAgICAgIHRoaXMuaGlnaGxpZ2h0U2VsZWN0ZWRFbGVtZW50cygpXG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuXG4gIGFuaW1hdGVDbGlja2VkS2V5OiBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgIHRoaXMuJChlbGVtZW50KS5yZW1vdmVDbGFzcygnY2xpY2tlZCcpLnJlbW92ZUNsYXNzKCdjbGlja2VkLWFuaW1hdGlvbicpXG4gICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLiQoZWxlbWVudCkuYWRkQ2xhc3MoJ2NsaWNrZWQnKVxuICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuJChlbGVtZW50KS5hZGRDbGFzcygnY2xpY2tlZC1hbmltYXRpb24nKVxuICAgICAgfSwgMTAwKVxuICAgIH0sIDEpXG4gIH0sXG5cbiAgaGlnaGxpZ2h0U2VsZWN0ZWRFbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdHJ5IHtcbiAgICAgIHZhciByZXN1bHRDc3NTZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudENTU1NlbGVjdG9yKClcblxuICAgICAgJCgnYm9keSAjLXNlbGVjdG9yLXRvb2xiYXIgLnNlbGVjdG9yJykudGV4dChyZXN1bHRDc3NTZWxlY3Rvcilcblx0XHRcdC8vIGhpZ2hsaWdodCBzZWxlY3RlZCBlbGVtZW50c1xuICAgICAgJCgnLi1zaXRlbWFwLXNlbGVjdC1pdGVtLXNlbGVjdGVkJykucmVtb3ZlQ2xhc3MoJy1zaXRlbWFwLXNlbGVjdC1pdGVtLXNlbGVjdGVkJylcbiAgICAgICQoRWxlbWVudFF1ZXJ5KHJlc3VsdENzc1NlbGVjdG9yLCB0aGlzLnBhcmVudCwgeyR9KSkuYWRkQ2xhc3MoJy1zaXRlbWFwLXNlbGVjdC1pdGVtLXNlbGVjdGVkJylcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGlmIChlcnIgPT09ICdmb3VuZCBtdWx0aXBsZSBlbGVtZW50IGdyb3VwcywgYnV0IGFsbG93TXVsdGlwbGVTZWxlY3RvcnMgZGlzYWJsZWQnKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdtdWx0aXBsZSBkaWZmZXJlbnQgZWxlbWVudCBzZWxlY3Rpb24gZGlzYWJsZWQnKVxuXG4gICAgICAgIHRoaXMuc2hvd011bHRpcGxlR3JvdXBQb3B1cCgpXG5cdFx0XHRcdC8vIHJlbW92ZSBsYXN0IGFkZGVkIGVsZW1lbnRcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnRzLnBvcCgpXG4gICAgICAgIHRoaXMuaGlnaGxpZ2h0U2VsZWN0ZWRFbGVtZW50cygpXG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIHNob3dNdWx0aXBsZUdyb3VwUG9wdXA6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoJyMtc2VsZWN0b3ItdG9vbGJhciAucG9wb3ZlcicpLmF0dHIoJ3N0eWxlJywgJ2Rpc3BsYXk6YmxvY2sgIWltcG9ydGFudDsnKVxuICB9LFxuXG4gIGhpZGVNdWx0aXBsZUdyb3VwUG9wdXA6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoJyMtc2VsZWN0b3ItdG9vbGJhciAucG9wb3ZlcicpLmF0dHIoJ3N0eWxlJywgJycpXG4gIH0sXG5cbiAgYmluZE11bHRpcGxlR3JvdXBQb3B1cEhpZGU6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoJyMtc2VsZWN0b3ItdG9vbGJhciAucG9wb3ZlciAuY2xvc2UnKS5jbGljayh0aGlzLmhpZGVNdWx0aXBsZUdyb3VwUG9wdXAuYmluZCh0aGlzKSlcbiAgfSxcblxuICB1bmJpbmRNdWx0aXBsZUdyb3VwUG9wdXBIaWRlOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKCcjLXNlbGVjdG9yLXRvb2xiYXIgLnBvcG92ZXIgLmNsb3NlJykudW5iaW5kKCdjbGljaycpXG4gIH0sXG5cbiAgYmluZE11bHRpcGxlR3JvdXBDaGVja2JveDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJCgnIy1zZWxlY3Rvci10b29sYmFyIFtuYW1lPWRpZmVyZW50RWxlbWVudFNlbGVjdGlvbl0nKS5jaGFuZ2UoZnVuY3Rpb24gKGUpIHtcbiAgICAgIGlmICh0aGlzLiQoZS5jdXJyZW50VGFyZ2V0KS5pcygnOmNoZWNrZWQnKSkge1xuICAgICAgICB0aGlzLmluaXRDc3NTZWxlY3Rvcih0cnVlKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5pbml0Q3NzU2VsZWN0b3IoZmFsc2UpXG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuICB1bmJpbmRNdWx0aXBsZUdyb3VwQ2hlY2tib3g6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoJyMtc2VsZWN0b3ItdG9vbGJhciAuZGlmZXJlbnRFbGVtZW50U2VsZWN0aW9uJykudW5iaW5kKCdjaGFuZ2UnKVxuICB9LFxuXG4gIGF0dGFjaFRvb2xiYXI6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgJHRvb2xiYXIgPSAnPGRpdiBpZD1cIi1zZWxlY3Rvci10b29sYmFyXCI+JyArXG5cdFx0XHQnPGRpdiBjbGFzcz1cImxpc3QtaXRlbVwiPjxkaXYgY2xhc3M9XCJzZWxlY3Rvci1jb250YWluZXJcIj48ZGl2IGNsYXNzPVwic2VsZWN0b3JcIj48L2Rpdj48L2Rpdj48L2Rpdj4nICtcblx0XHRcdCc8ZGl2IGNsYXNzPVwiaW5wdXQtZ3JvdXAtYWRkb24gbGlzdC1pdGVtXCI+JyArXG5cdFx0XHRcdCc8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgdGl0bGU9XCJFbmFibGUgZGlmZmVyZW50IHR5cGUgZWxlbWVudCBzZWxlY3Rpb25cIiBuYW1lPVwiZGlmZXJlbnRFbGVtZW50U2VsZWN0aW9uXCI+JyArXG5cdFx0XHRcdCc8ZGl2IGNsYXNzPVwicG9wb3ZlciB0b3BcIj4nICtcblx0XHRcdFx0JzxkaXYgY2xhc3M9XCJjbG9zZVwiPsOXPC9kaXY+JyArXG5cdFx0XHRcdCc8ZGl2IGNsYXNzPVwiYXJyb3dcIj48L2Rpdj4nICtcblx0XHRcdFx0JzxkaXYgY2xhc3M9XCJwb3BvdmVyLWNvbnRlbnRcIj4nICtcblx0XHRcdFx0JzxkaXYgY2xhc3M9XCJ0eHRcIj4nICtcblx0XHRcdFx0J0RpZmZlcmVudCB0eXBlIGVsZW1lbnQgc2VsZWN0aW9uIGlzIGRpc2FibGVkLiBJZiB0aGUgZWxlbWVudCAnICtcblx0XHRcdFx0J3lvdSBjbGlja2VkIHNob3VsZCBhbHNvIGJlIGluY2x1ZGVkIHRoZW4gZW5hYmxlIHRoaXMgYW5kICcgK1xuXHRcdFx0XHQnY2xpY2sgb24gdGhlIGVsZW1lbnQgYWdhaW4uIFVzdWFsbHkgdGhpcyBpcyBub3QgbmVlZGVkLicgK1xuXHRcdFx0XHQnPC9kaXY+JyArXG5cdFx0XHRcdCc8L2Rpdj4nICtcblx0XHRcdFx0JzwvZGl2PicgK1xuXHRcdFx0JzwvZGl2PicgK1xuXHRcdFx0JzxkaXYgY2xhc3M9XCJsaXN0LWl0ZW0ga2V5LWV2ZW50c1wiPjxkaXYgdGl0bGU9XCJDbGljayBoZXJlIHRvIGVuYWJsZSBrZXkgcHJlc3MgZXZlbnRzIGZvciBzZWxlY3Rpb25cIj5FbmFibGUga2V5IGV2ZW50czwvZGl2PjwvZGl2PicgK1xuXHRcdFx0JzxkaXYgY2xhc3M9XCJsaXN0LWl0ZW0ga2V5LWJ1dHRvbiBrZXktYnV0dG9uLXNlbGVjdCBoaWRlXCIgdGl0bGU9XCJVc2UgUyBrZXkgdG8gc2VsZWN0IGVsZW1lbnRcIj5TPC9kaXY+JyArXG5cdFx0XHQnPGRpdiBjbGFzcz1cImxpc3QtaXRlbSBrZXktYnV0dG9uIGtleS1idXR0b24tcGFyZW50IGhpZGVcIiB0aXRsZT1cIlVzZSBQIGtleSB0byBzZWxlY3QgcGFyZW50XCI+UDwvZGl2PicgK1xuXHRcdFx0JzxkaXYgY2xhc3M9XCJsaXN0LWl0ZW0ga2V5LWJ1dHRvbiBrZXktYnV0dG9uLWNoaWxkIGhpZGVcIiB0aXRsZT1cIlVzZSBDIGtleSB0byBzZWxlY3QgY2hpbGRcIj5DPC9kaXY+JyArXG5cdFx0XHQnPGRpdiBjbGFzcz1cImxpc3QtaXRlbSBkb25lLXNlbGVjdGluZy1idXR0b25cIj5Eb25lIHNlbGVjdGluZyE8L2Rpdj4nICtcblx0XHRcdCc8L2Rpdj4nXG4gICAgdGhpcy4kKCdib2R5JykuYXBwZW5kKCR0b29sYmFyKVxuXG4gICAgdGhpcy4kKCdib2R5ICMtc2VsZWN0b3ItdG9vbGJhciAuZG9uZS1zZWxlY3RpbmctYnV0dG9uJykuY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5zZWxlY3Rpb25GaW5pc2hlZCgpXG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuICBoaWdobGlnaHRQYXJlbnQ6IGZ1bmN0aW9uICgpIHtcblx0XHQvLyBkbyBub3QgaGlnaGxpZ2h0IHBhcmVudCBpZiBpdHMgdGhlIGJvZHlcbiAgICBpZiAoIXRoaXMuJCh0aGlzLnBhcmVudCkuaXMoJ2JvZHknKSAmJiAhdGhpcy4kKHRoaXMucGFyZW50KS5pcygnI3dlYnBhZ2UnKSkge1xuICAgICAgdGhpcy4kKHRoaXMucGFyZW50KS5hZGRDbGFzcygnLXNpdGVtYXAtcGFyZW50JylcbiAgICB9XG4gIH0sXG5cbiAgdW5iaW5kRWxlbWVudFNlbGVjdGlvbjogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJCh0aGlzLiRhbGxFbGVtZW50cykudW5iaW5kKCdjbGljay5lbGVtZW50U2VsZWN0b3InKVxuXHRcdC8vIHJlbW92ZSBoaWdobGlnaHRlZCBlbGVtZW50IGNsYXNzZXNcbiAgICB0aGlzLnVuYmluZEVsZW1lbnRTZWxlY3Rpb25IaWdobGlnaHQoKVxuICB9LFxuICB1bmJpbmRFbGVtZW50U2VsZWN0aW9uSGlnaGxpZ2h0OiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKCcuLXNpdGVtYXAtc2VsZWN0LWl0ZW0tc2VsZWN0ZWQnKS5yZW1vdmVDbGFzcygnLXNpdGVtYXAtc2VsZWN0LWl0ZW0tc2VsZWN0ZWQnKVxuICAgIHRoaXMuJCgnLi1zaXRlbWFwLXBhcmVudCcpLnJlbW92ZUNsYXNzKCctc2l0ZW1hcC1wYXJlbnQnKVxuICB9LFxuICB1bmJpbmRFbGVtZW50SGlnaGxpZ2h0OiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKHRoaXMuJGFsbEVsZW1lbnRzKS51bmJpbmQoJ21vdXNlb3Zlci5lbGVtZW50U2VsZWN0b3InKVxuXHRcdFx0LnVuYmluZCgnbW91c2VvdXQuZWxlbWVudFNlbGVjdG9yJylcbiAgfSxcbiAgdW5iaW5kS2V5Ym9hcmRTZWxlY3Rpb25NYWlwdWxhdGlvczogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJChkb2N1bWVudCkudW5iaW5kKCdrZXlkb3duLnNlbGVjdGlvbk1hbmlwdWxhdGlvbicpXG4gICAgY2xlYXJJbnRlcnZhbCh0aGlzLmtleVByZXNzRm9jdXNJbnRlcnZhbClcbiAgfSxcbiAgcmVtb3ZlVG9vbGJhcjogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJCgnYm9keSAjLXNlbGVjdG9yLXRvb2xiYXIgYScpLnVuYmluZCgnY2xpY2snKVxuICAgIHRoaXMuJCgnIy1zZWxlY3Rvci10b29sYmFyJykucmVtb3ZlKClcbiAgfSxcblxuXHQvKipcblx0ICogUmVtb3ZlIHRvb2xiYXIgYW5kIHVuYmluZCBldmVudHNcblx0ICovXG4gIHJlbW92ZUdVSTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMudW5iaW5kRWxlbWVudFNlbGVjdGlvbigpXG4gICAgdGhpcy51bmJpbmRFbGVtZW50SGlnaGxpZ2h0KClcbiAgICB0aGlzLnVuYmluZEtleWJvYXJkU2VsZWN0aW9uTWFpcHVsYXRpb3MoKVxuICAgIHRoaXMudW5iaW5kTXVsdGlwbGVHcm91cFBvcHVwSGlkZSgpXG4gICAgdGhpcy51bmJpbmRNdWx0aXBsZUdyb3VwQ2hlY2tib3goKVxuICAgIHRoaXMudW5iaW5kTW92ZUltYWdlc1RvVG9wKClcbiAgICB0aGlzLnJlbW92ZVRvb2xiYXIoKVxuICB9LFxuXG4gIHNlbGVjdGlvbkZpbmlzaGVkOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJlc3VsdENzc1NlbGVjdG9yID0gdGhpcy5nZXRDdXJyZW50Q1NTU2VsZWN0b3IoKVxuXG4gICAgdGhpcy5kZWZlcnJlZENTU1NlbGVjdG9yUmVzcG9uc2UucmVzb2x2ZSh7XG4gICAgICBDU1NTZWxlY3RvcjogcmVzdWx0Q3NzU2VsZWN0b3JcbiAgICB9KVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQ29udGVudFNlbGVjdG9yXG4iLCJ2YXIgc2VsZWN0b3JzID0gcmVxdWlyZSgnLi9TZWxlY3RvcnMnKVxudmFyIFNlbGVjdG9yID0gcmVxdWlyZSgnLi9TZWxlY3RvcicpXG52YXIgU2VsZWN0b3JUYWJsZSA9IHNlbGVjdG9ycy5TZWxlY3RvclRhYmxlXG52YXIgU2l0ZW1hcCA9IHJlcXVpcmUoJy4vU2l0ZW1hcCcpXG4vLyB2YXIgU2VsZWN0b3JHcmFwaHYyID0gcmVxdWlyZSgnLi9TZWxlY3RvckdyYXBodjInKVxudmFyIGdldEJhY2tncm91bmRTY3JpcHQgPSByZXF1aXJlKCcuL2dldEJhY2tncm91bmRTY3JpcHQnKVxudmFyIGdldENvbnRlbnRTY3JpcHQgPSByZXF1aXJlKCcuL2dldENvbnRlbnRTY3JpcHQnKVxudmFyIFNpdGVtYXBDb250cm9sbGVyID0gZnVuY3Rpb24gKG9wdGlvbnMsIG1vcmVPcHRpb25zKSB7XG4gIHRoaXMuJCA9IG1vcmVPcHRpb25zLiRcbiAgaWYgKCF0aGlzLiQpIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBqcXVlcnkgaW4gQ29udHJvbGxlcicpXG4gIGZvciAodmFyIGkgaW4gb3B0aW9ucykge1xuICAgIHRoaXNbaV0gPSBvcHRpb25zW2ldXG4gIH1cbiAgdGhpcy5pbml0KClcbn1cblxuU2l0ZW1hcENvbnRyb2xsZXIucHJvdG90eXBlID0ge1xuXG4gIGJhY2tncm91bmRTY3JpcHQ6IGdldEJhY2tncm91bmRTY3JpcHQoJ0RldlRvb2xzJyksXG4gIGNvbnRlbnRTY3JpcHQ6IGdldENvbnRlbnRTY3JpcHQoJ0RldlRvb2xzJyksXG5cbiAgY29udHJvbDogZnVuY3Rpb24gKGNvbnRyb2xzKSB7XG4gICAgdmFyIGNvbnRyb2xsZXIgPSB0aGlzXG5cbiAgICBmb3IgKHZhciBzZWxlY3RvciBpbiBjb250cm9scykge1xuICAgICAgZm9yICh2YXIgZXZlbnQgaW4gY29udHJvbHNbc2VsZWN0b3JdKSB7XG4gICAgICAgIHRoaXMuJChkb2N1bWVudCkub24oZXZlbnQsIHNlbGVjdG9yLCAoZnVuY3Rpb24gKHNlbGVjdG9yLCBldmVudCkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgY29udGludWVCdWJibGluZyA9IGNvbnRyb2xzW3NlbGVjdG9yXVtldmVudF0uY2FsbChjb250cm9sbGVyLCB0aGlzKVxuICAgICAgICAgICAgaWYgKGNvbnRpbnVlQnViYmxpbmcgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KShzZWxlY3RvciwgZXZlbnQpKVxuICAgICAgfVxuICAgIH1cbiAgfSxcblxuXHQvKipcblx0ICogTG9hZHMgdGVtcGxhdGVzIGZvciBJQ2FuSGF6XG5cdCAqL1xuICBsb2FkVGVtcGxhdGVzOiBmdW5jdGlvbiAoY2JBbGxUZW1wbGF0ZXNMb2FkZWQpIHtcbiAgICB2YXIgdGVtcGxhdGVJZHMgPSBbXG4gICAgICAnVmlld3BvcnQnLFxuICAgICAgJ1NpdGVtYXBMaXN0JyxcbiAgICAgICdTaXRlbWFwTGlzdEl0ZW0nLFxuICAgICAgJ1NpdGVtYXBDcmVhdGUnLFxuICAgICAgJ1NpdGVtYXBTdGFydFVybEZpZWxkJyxcbiAgICAgICdTaXRlbWFwSW1wb3J0JyxcbiAgICAgICdTaXRlbWFwRXhwb3J0JyxcbiAgICAgICdTaXRlbWFwQnJvd3NlRGF0YScsXG4gICAgICAnU2l0ZW1hcFNjcmFwZUNvbmZpZycsXG4gICAgICAnU2l0ZW1hcEV4cG9ydERhdGFDU1YnLFxuICAgICAgJ1NpdGVtYXBFZGl0TWV0YWRhdGEnLFxuICAgICAgJ1NlbGVjdG9yTGlzdCcsXG4gICAgICAnU2VsZWN0b3JMaXN0SXRlbScsXG4gICAgICAnU2VsZWN0b3JFZGl0JyxcbiAgICAgICdTZWxlY3RvckVkaXRUYWJsZUNvbHVtbicsXG4gICAgICAvLyAnU2l0ZW1hcFNlbGVjdG9yR3JhcGgnLFxuICAgICAgJ0RhdGFQcmV2aWV3J1xuICAgIF1cbiAgICB2YXIgdGVtcGxhdGVzTG9hZGVkID0gMFxuICAgIHZhciBjYkxvYWRlZCA9IGZ1bmN0aW9uICh0ZW1wbGF0ZUlkLCB0ZW1wbGF0ZSkge1xuICAgICAgdGVtcGxhdGVzTG9hZGVkKytcbiAgICAgIGljaC5hZGRUZW1wbGF0ZSh0ZW1wbGF0ZUlkLCB0ZW1wbGF0ZSlcbiAgICAgIGlmICh0ZW1wbGF0ZXNMb2FkZWQgPT09IHRlbXBsYXRlSWRzLmxlbmd0aCkge1xuICAgICAgICBjYkFsbFRlbXBsYXRlc0xvYWRlZCgpXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGVtcGxhdGVJZHMuZm9yRWFjaChmdW5jdGlvbiAodGVtcGxhdGVJZCkge1xuICAgICAgdGhpcy4kLmdldCh0aGlzLnRlbXBsYXRlRGlyICsgdGVtcGxhdGVJZCArICcuaHRtbCcsIGNiTG9hZGVkLmJpbmQodGhpcywgdGVtcGxhdGVJZCkpXG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuXG4gIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmxvYWRUZW1wbGF0ZXMoZnVuY3Rpb24gKCkge1xuXHRcdFx0Ly8gY3VycmVudGx5IHZpZXdlZCBvYmplY3RzXG4gICAgICB0aGlzLmNsZWFyU3RhdGUoKVxuXG5cdFx0XHQvLyByZW5kZXIgbWFpbiB2aWV3cG9ydFxuICAgICAgaWNoLlZpZXdwb3J0KCkuYXBwZW5kVG8oJ2JvZHknKVxuXG5cdFx0XHQvLyBjYW5jZWwgYWxsIGZvcm0gc3VibWl0c1xuICAgICAgdGhpcy4kKCdmb3JtJykuYmluZCgnc3VibWl0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH0pXG5cbiAgICAgIHRoaXMuY29udHJvbCh7XG4gICAgICAgICcjc2l0ZW1hcHMtbmF2LWJ1dHRvbic6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5zaG93U2l0ZW1hcHNcbiAgICAgICAgfSxcbiAgICAgICAgJyNjcmVhdGUtc2l0ZW1hcC1jcmVhdGUtbmF2LWJ1dHRvbic6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5zaG93Q3JlYXRlU2l0ZW1hcFxuICAgICAgICB9LFxuICAgICAgICAnI2NyZWF0ZS1zaXRlbWFwLWltcG9ydC1uYXYtYnV0dG9uJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNob3dJbXBvcnRTaXRlbWFwUGFuZWxcbiAgICAgICAgfSxcbiAgICAgICAgJyNzaXRlbWFwLWV4cG9ydC1uYXYtYnV0dG9uJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNob3dTaXRlbWFwRXhwb3J0UGFuZWxcbiAgICAgICAgfSxcbiAgICAgICAgJyNzaXRlbWFwLWV4cG9ydC1kYXRhLWNzdi1uYXYtYnV0dG9uJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNob3dTaXRlbWFwRXhwb3J0RGF0YUNzdlBhbmVsXG4gICAgICAgIH0sXG4gICAgICAgICcjc3VibWl0LWNyZWF0ZS1zaXRlbWFwJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLmNyZWF0ZVNpdGVtYXBcbiAgICAgICAgfSxcbiAgICAgICAgJyNzdWJtaXQtaW1wb3J0LXNpdGVtYXAnOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuaW1wb3J0U2l0ZW1hcFxuICAgICAgICB9LFxuICAgICAgICAnI3NpdGVtYXAtZWRpdC1tZXRhZGF0YS1uYXYtYnV0dG9uJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLmVkaXRTaXRlbWFwTWV0YWRhdGFcbiAgICAgICAgfSxcbiAgICAgICAgJyNzaXRlbWFwLXNlbGVjdG9yLWxpc3QtbmF2LWJ1dHRvbic6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5zaG93U2l0ZW1hcFNlbGVjdG9yTGlzdFxuICAgICAgICB9LCAvKiwgICAgICAgICcjc2l0ZW1hcC1zZWxlY3Rvci1ncmFwaC1uYXYtYnV0dG9uJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNob3dTaXRlbWFwU2VsZWN0b3JHcmFwaFxuICAgICAgICB9ICovXG4gICAgICAgICcjc2l0ZW1hcC1icm93c2UtbmF2LWJ1dHRvbic6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5icm93c2VTaXRlbWFwRGF0YVxuICAgICAgICB9LFxuICAgICAgICAnYnV0dG9uI3N1Ym1pdC1lZGl0LXNpdGVtYXAnOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuZWRpdFNpdGVtYXBNZXRhZGF0YVNhdmVcbiAgICAgICAgfSxcbiAgICAgICAgJyNlZGl0LXNpdGVtYXAtbWV0YWRhdGEtZm9ybSc6IHtcbiAgICAgICAgICBzdWJtaXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGZhbHNlIH1cbiAgICAgICAgfSxcbiAgICAgICAgJyNzaXRlbWFwcyB0cic6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5lZGl0U2l0ZW1hcFxuICAgICAgICB9LFxuICAgICAgICAnI3NpdGVtYXBzIGJ1dHRvblthY3Rpb249ZGVsZXRlLXNpdGVtYXBdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLmRlbGV0ZVNpdGVtYXBcbiAgICAgICAgfSxcbiAgICAgICAgJyNzaXRlbWFwLXNjcmFwZS1uYXYtYnV0dG9uJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNob3dTY3JhcGVTaXRlbWFwQ29uZmlnUGFuZWxcbiAgICAgICAgfSxcbiAgICAgICAgJyNzdWJtaXQtc2NyYXBlLXNpdGVtYXAtZm9ybSc6IHtcbiAgICAgICAgICBzdWJtaXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGZhbHNlIH1cbiAgICAgICAgfSxcbiAgICAgICAgJyNzdWJtaXQtc2NyYXBlLXNpdGVtYXAnOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2NyYXBlU2l0ZW1hcFxuICAgICAgICB9LFxuICAgICAgICAnI3NpdGVtYXBzIGJ1dHRvblthY3Rpb249YnJvd3NlLXNpdGVtYXAtZGF0YV0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2l0ZW1hcExpc3RCcm93c2VTaXRlbWFwRGF0YVxuICAgICAgICB9LFxuICAgICAgICAnI3NpdGVtYXBzIGJ1dHRvblthY3Rpb249Y3N2LWRvd25sb2FkLXNpdGVtYXAtZGF0YV0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuZG93bmxvYWRTaXRlbWFwRGF0YVxuICAgICAgICB9LFxuXHRcdFx0XHQvLyBAVE9ETyBtb3ZlIHRvIHRyXG4gICAgICAgICcjc2VsZWN0b3ItdHJlZSB0Ym9keSB0cic6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5zaG93Q2hpbGRTZWxlY3RvcnNcbiAgICAgICAgfSxcbiAgICAgICAgJyNzZWxlY3Rvci10cmVlIC5icmVhZGNydW1iIGEnOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMudHJlZU5hdmlnYXRpb25zaG93U2l0ZW1hcFNlbGVjdG9yTGlzdFxuICAgICAgICB9LFxuICAgICAgICAnI3NlbGVjdG9yLXRyZWUgdHIgYnV0dG9uW2FjdGlvbj1lZGl0LXNlbGVjdG9yXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5lZGl0U2VsZWN0b3JcbiAgICAgICAgfSxcbiAgICAgICAgJyNlZGl0LXNlbGVjdG9yIHNlbGVjdFtuYW1lPXR5cGVdJzoge1xuICAgICAgICAgIGNoYW5nZTogdGhpcy5zZWxlY3RvclR5cGVDaGFuZ2VkXG4gICAgICAgIH0sXG4gICAgICAgICcjZWRpdC1zZWxlY3RvciBidXR0b25bYWN0aW9uPXNhdmUtc2VsZWN0b3JdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNhdmVTZWxlY3RvclxuICAgICAgICB9LFxuICAgICAgICAnI2VkaXQtc2VsZWN0b3IgYnV0dG9uW2FjdGlvbj1jYW5jZWwtc2VsZWN0b3ItZWRpdGluZ10nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuY2FuY2VsU2VsZWN0b3JFZGl0aW5nXG4gICAgICAgIH0sXG4gICAgICAgICcjZWRpdC1zZWxlY3RvciAjc2VsZWN0b3JJZCc6IHtcbiAgICAgICAgICBrZXl1cDogdGhpcy51cGRhdGVTZWxlY3RvclBhcmVudExpc3RPbklkQ2hhbmdlXG4gICAgICAgIH0sXG4gICAgICAgICcjc2VsZWN0b3ItdHJlZSBidXR0b25bYWN0aW9uPWFkZC1zZWxlY3Rvcl0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuYWRkU2VsZWN0b3JcbiAgICAgICAgfSxcbiAgICAgICAgJyNzZWxlY3Rvci10cmVlIHRyIGJ1dHRvblthY3Rpb249ZGVsZXRlLXNlbGVjdG9yXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5kZWxldGVTZWxlY3RvclxuICAgICAgICB9LFxuICAgICAgICAnI3NlbGVjdG9yLXRyZWUgdHIgYnV0dG9uW2FjdGlvbj1wcmV2aWV3LXNlbGVjdG9yXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5wcmV2aWV3U2VsZWN0b3JGcm9tU2VsZWN0b3JUcmVlXG4gICAgICAgIH0sXG4gICAgICAgICcjc2VsZWN0b3ItdHJlZSB0ciBidXR0b25bYWN0aW9uPWRhdGEtcHJldmlldy1zZWxlY3Rvcl0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMucHJldmlld1NlbGVjdG9yRGF0YUZyb21TZWxlY3RvclRyZWVcbiAgICAgICAgfSxcbiAgICAgICAgJyNlZGl0LXNlbGVjdG9yIGJ1dHRvblthY3Rpb249c2VsZWN0LXNlbGVjdG9yXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5zZWxlY3RTZWxlY3RvclxuICAgICAgICB9LFxuICAgICAgICAnI2VkaXQtc2VsZWN0b3IgYnV0dG9uW2FjdGlvbj1zZWxlY3QtdGFibGUtaGVhZGVyLXJvdy1zZWxlY3Rvcl0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2VsZWN0VGFibGVIZWFkZXJSb3dTZWxlY3RvclxuICAgICAgICB9LFxuICAgICAgICAnI2VkaXQtc2VsZWN0b3IgYnV0dG9uW2FjdGlvbj1zZWxlY3QtdGFibGUtZGF0YS1yb3ctc2VsZWN0b3JdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNlbGVjdFRhYmxlRGF0YVJvd1NlbGVjdG9yXG4gICAgICAgIH0sXG4gICAgICAgICcjZWRpdC1zZWxlY3RvciBidXR0b25bYWN0aW9uPXByZXZpZXctc2VsZWN0b3JdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnByZXZpZXdTZWxlY3RvclxuICAgICAgICB9LFxuICAgICAgICAnI2VkaXQtc2VsZWN0b3IgYnV0dG9uW2FjdGlvbj1wcmV2aWV3LWNsaWNrLWVsZW1lbnQtc2VsZWN0b3JdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnByZXZpZXdDbGlja0VsZW1lbnRTZWxlY3RvclxuICAgICAgICB9LFxuICAgICAgICAnI2VkaXQtc2VsZWN0b3IgYnV0dG9uW2FjdGlvbj1wcmV2aWV3LXRhYmxlLXJvdy1zZWxlY3Rvcl0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMucHJldmlld1RhYmxlUm93U2VsZWN0b3JcbiAgICAgICAgfSxcbiAgICAgICAgJyNlZGl0LXNlbGVjdG9yIGJ1dHRvblthY3Rpb249cHJldmlldy1zZWxlY3Rvci1kYXRhXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5wcmV2aWV3U2VsZWN0b3JEYXRhRnJvbVNlbGVjdG9yRWRpdGluZ1xuICAgICAgICB9LFxuICAgICAgICAnYnV0dG9uLmFkZC1leHRyYS1zdGFydC11cmwnOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuYWRkU3RhcnRVcmxcbiAgICAgICAgfSxcbiAgICAgICAgJ2J1dHRvbi5yZW1vdmUtc3RhcnQtdXJsJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnJlbW92ZVN0YXJ0VXJsXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICB0aGlzLnNob3dTaXRlbWFwcygpXG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuXG4gIGNsZWFyU3RhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnN0YXRlID0ge1xuXHRcdFx0Ly8gc2l0ZW1hcCB0aGF0IGlzIGN1cnJlbnRseSBvcGVuXG4gICAgICBjdXJyZW50U2l0ZW1hcDogbnVsbCxcblx0XHRcdC8vIHNlbGVjdG9yIGlkcyB0aGF0IGFyZSBzaG93biBpbiB0aGUgbmF2aWdhdGlvblxuICAgICAgZWRpdFNpdGVtYXBCcmVhZGN1bWJzU2VsZWN0b3JzOiBudWxsLFxuICAgICAgY3VycmVudFBhcmVudFNlbGVjdG9ySWQ6IG51bGwsXG4gICAgICBjdXJyZW50U2VsZWN0b3I6IG51bGxcbiAgICB9XG4gIH0sXG5cbiAgc2V0U3RhdGVFZGl0U2l0ZW1hcDogZnVuY3Rpb24gKHNpdGVtYXApIHtcbiAgICB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwID0gc2l0ZW1hcFxuICAgIHRoaXMuc3RhdGUuZWRpdFNpdGVtYXBCcmVhZGN1bWJzU2VsZWN0b3JzID0gW1xuXHRcdFx0e2lkOiAnX3Jvb3QnfVxuICAgIF1cbiAgICB0aGlzLnN0YXRlLmN1cnJlbnRQYXJlbnRTZWxlY3RvcklkID0gJ19yb290J1xuICB9LFxuXG4gIHNldEFjdGl2ZU5hdmlnYXRpb25CdXR0b246IGZ1bmN0aW9uIChuYXZpZ2F0aW9uSWQpIHtcbiAgICB0aGlzLiQoJy5uYXYgLmFjdGl2ZScpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKVxuICAgIHRoaXMuJCgnIycgKyBuYXZpZ2F0aW9uSWQgKyAnLW5hdi1idXR0b24nKS5jbG9zZXN0KCdsaScpLmFkZENsYXNzKCdhY3RpdmUnKVxuXG4gICAgaWYgKG5hdmlnYXRpb25JZC5tYXRjaCgvXnNpdGVtYXAtLykpIHtcbiAgICAgIHRoaXMuJCgnI3NpdGVtYXAtbmF2LWJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpXG4gICAgICB0aGlzLiQoJyNzaXRlbWFwLW5hdi1idXR0b24nKS5jbG9zZXN0KCdsaScpLmFkZENsYXNzKCdhY3RpdmUnKVxuICAgICAgdGhpcy4kKCcjbmF2YmFyLWFjdGl2ZS1zaXRlbWFwLWlkJykudGV4dCgnKCcgKyB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwLl9pZCArICcpJylcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgdGhpcy4kKCcjc2l0ZW1hcC1uYXYtYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJylcbiAgICAgIHRoaXMuJCgnI25hdmJhci1hY3RpdmUtc2l0ZW1hcC1pZCcpLnRleHQoJycpXG4gICAgfVxuXG4gICAgaWYgKG5hdmlnYXRpb25JZC5tYXRjaCgvXmNyZWF0ZS1zaXRlbWFwLS8pKSB7XG4gICAgICB0aGlzLiQoJyNjcmVhdGUtc2l0ZW1hcC1uYXYtYnV0dG9uJykuY2xvc2VzdCgnbGknKS5hZGRDbGFzcygnYWN0aXZlJylcbiAgICB9XG4gIH0sXG5cblx0LyoqXG5cdCAqIFNpbXBsZSBpbmZvIHBvcHVwIGZvciBzaXRlbWFwIHN0YXJ0IHVybCBpbnB1dCBmaWVsZFxuXHQgKi9cbiAgaW5pdE11bHRpcGxlU3RhcnRVcmxIZWxwZXI6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoJyNzdGFydFVybCcpXG5cdFx0XHQucG9wb3Zlcih7XG4gIHRpdGxlOiAnTXVsdGlwbGUgc3RhcnQgdXJscycsXG4gIGh0bWw6IHRydWUsXG4gIGNvbnRlbnQ6ICdZb3UgY2FuIGNyZWF0ZSByYW5nZWQgc3RhcnQgdXJscyBsaWtlIHRoaXM6PGJyIC8+aHR0cDovL2V4YW1wbGUuY29tL1sxLTEwMF0uaHRtbCcsXG4gIHBsYWNlbWVudDogJ2JvdHRvbSdcbn0pXG5cdFx0XHQuYmx1cihmdW5jdGlvbiAoKSB7XG4gIHRoaXMuJCh0aGlzKS5wb3BvdmVyKCdoaWRlJylcbn0pXG4gIH0sXG5cblx0LyoqXG5cdCAqIFJldHVybnMgYm9vdHN0cmFwVmFsaWRhdG9yIG9iamVjdCBmb3IgY3VycmVudCBmb3JtIGluIHZpZXdwb3J0XG5cdCAqL1xuICBnZXRGb3JtVmFsaWRhdG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHZhbGlkYXRvciA9IHRoaXMuJCgnI3ZpZXdwb3J0IGZvcm0nKS5kYXRhKCdib290c3RyYXBWYWxpZGF0b3InKVxuICAgIHJldHVybiB2YWxpZGF0b3JcbiAgfSxcblxuXHQvKipcblx0ICogUmV0dXJucyB3aGV0aGVyIGN1cnJlbnQgZm9ybSBpbiB0aGUgdmlld3BvcnQgaXMgdmFsaWRcblx0ICogQHJldHVybnMge0Jvb2xlYW59XG5cdCAqL1xuICBpc1ZhbGlkRm9ybTogZnVuY3Rpb24gKCkge1xuICAgIHZhciB2YWxpZGF0b3IgPSB0aGlzLmdldEZvcm1WYWxpZGF0b3IoKVxuXG5cdFx0Ly8gdmFsaWRhdG9yLnZhbGlkYXRlKCk7XG5cdFx0Ly8gdmFsaWRhdGUgbWV0aG9kIGNhbGxzIHN1Ym1pdCB3aGljaCBpcyBub3QgbmVlZGVkIGluIHRoaXMgY2FzZS5cbiAgICBmb3IgKHZhciBmaWVsZCBpbiB2YWxpZGF0b3Iub3B0aW9ucy5maWVsZHMpIHtcbiAgICAgIHZhbGlkYXRvci52YWxpZGF0ZUZpZWxkKGZpZWxkKVxuICAgIH1cblxuICAgIHZhciB2YWxpZCA9IHZhbGlkYXRvci5pc1ZhbGlkKClcbiAgICByZXR1cm4gdmFsaWRcbiAgfSxcblxuXHQvKipcblx0ICogQWRkIHZhbGlkYXRpb24gdG8gc2l0ZW1hcCBjcmVhdGlvbiBvciBlZGl0aW5nIGZvcm1cblx0ICovXG4gIGluaXRTaXRlbWFwVmFsaWRhdGlvbjogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJCgnI3ZpZXdwb3J0IGZvcm0nKS5ib290c3RyYXBWYWxpZGF0b3Ioe1xuICAgICAgZmllbGRzOiB7XG4gICAgICAgICdfaWQnOiB7XG4gICAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgICAgbm90RW1wdHk6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSBzaXRlbWFwIGlkIGlzIHJlcXVpcmVkIGFuZCBjYW5ub3QgYmUgZW1wdHknXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3RyaW5nTGVuZ3RoOiB7XG4gICAgICAgICAgICAgIG1pbjogMyxcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSBzaXRlbWFwIGlkIHNob3VsZCBiZSBhdGxlYXN0IDMgY2hhcmFjdGVycyBsb25nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJlZ2V4cDoge1xuICAgICAgICAgICAgICByZWdleHA6IC9eW2Etel1bYS16MC05XyQoKStcXC0vXSskLyxcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ09ubHkgbG93ZXJjYXNlIGNoYXJhY3RlcnMgKGEteiksIGRpZ2l0cyAoMC05KSwgb3IgYW55IG9mIHRoZSBjaGFyYWN0ZXJzIF8sICQsICgsICksICssIC0sIGFuZCAvIGFyZSBhbGxvd2VkLiBNdXN0IGJlZ2luIHdpdGggYSBsZXR0ZXIuJ1xuICAgICAgICAgICAgfSxcblx0XHRcdFx0XHRcdC8vIHBsYWNlaG9sZGVyIGZvciBzaXRlbWFwIGlkIGV4aXN0YW5jZSB2YWxpZGF0aW9uXG4gICAgICAgICAgICBjYWxsYmFjazoge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnU2l0ZW1hcCB3aXRoIHRoaXMgaWQgYWxyZWFkeSBleGlzdHMnLFxuICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKHZhbHVlLCB2YWxpZGF0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAnc3RhcnRVcmxbXSc6IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBub3RFbXB0eToge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnVGhlIHN0YXJ0IFVSTCBpcyByZXF1aXJlZCBhbmQgY2Fubm90IGJlIGVtcHR5J1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVyaToge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnVGhlIHN0YXJ0IFVSTCBpcyBub3QgYSB2YWxpZCBVUkwnXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgfSxcblxuICBzaG93Q3JlYXRlU2l0ZW1hcDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2V0QWN0aXZlTmF2aWdhdGlvbkJ1dHRvbignY3JlYXRlLXNpdGVtYXAtY3JlYXRlJylcbiAgICB2YXIgc2l0ZW1hcEZvcm0gPSBpY2guU2l0ZW1hcENyZWF0ZSgpXG4gICAgdGhpcy4kKCcjdmlld3BvcnQnKS5odG1sKHNpdGVtYXBGb3JtKVxuICAgIHRoaXMuaW5pdE11bHRpcGxlU3RhcnRVcmxIZWxwZXIoKVxuICAgIHRoaXMuaW5pdFNpdGVtYXBWYWxpZGF0aW9uKClcblxuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgaW5pdEltcG9ydFN0aWVtYXBWYWxpZGF0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKCcjdmlld3BvcnQgZm9ybScpLmJvb3RzdHJhcFZhbGlkYXRvcih7XG4gICAgICBmaWVsZHM6IHtcbiAgICAgICAgJ19pZCc6IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBzdHJpbmdMZW5ndGg6IHtcbiAgICAgICAgICAgICAgbWluOiAzLFxuICAgICAgICAgICAgICBtZXNzYWdlOiAnVGhlIHNpdGVtYXAgaWQgc2hvdWxkIGJlIGF0bGVhc3QgMyBjaGFyYWN0ZXJzIGxvbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVnZXhwOiB7XG4gICAgICAgICAgICAgIHJlZ2V4cDogL15bYS16XVthLXowLTlfJCgpK1xcLS9dKyQvLFxuICAgICAgICAgICAgICBtZXNzYWdlOiAnT25seSBsb3dlcmNhc2UgY2hhcmFjdGVycyAoYS16KSwgZGlnaXRzICgwLTkpLCBvciBhbnkgb2YgdGhlIGNoYXJhY3RlcnMgXywgJCwgKCwgKSwgKywgLSwgYW5kIC8gYXJlIGFsbG93ZWQuIE11c3QgYmVnaW4gd2l0aCBhIGxldHRlci4nXG4gICAgICAgICAgICB9LFxuXHRcdFx0XHRcdFx0Ly8gcGxhY2Vob2xkZXIgZm9yIHNpdGVtYXAgaWQgZXhpc3RhbmNlIHZhbGlkYXRpb25cbiAgICAgICAgICAgIGNhbGxiYWNrOiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdTaXRlbWFwIHdpdGggdGhpcyBpZCBhbHJlYWR5IGV4aXN0cycsXG4gICAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbiAodmFsdWUsIHZhbGlkYXRvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHNpdGVtYXBKU09OOiB7XG4gICAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgICAgbm90RW1wdHk6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1NpdGVtYXAgSlNPTiBpcyByZXF1aXJlZCBhbmQgY2Fubm90IGJlIGVtcHR5J1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNhbGxiYWNrOiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdKU09OIGlzIG5vdCB2YWxpZCcsXG4gICAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbiAodmFsdWUsIHZhbGlkYXRvcikge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICBKU09OLnBhcnNlKHZhbHVlKVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgfSxcblxuICBzaG93SW1wb3J0U2l0ZW1hcFBhbmVsOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zZXRBY3RpdmVOYXZpZ2F0aW9uQnV0dG9uKCdjcmVhdGUtc2l0ZW1hcC1pbXBvcnQnKVxuICAgIHZhciBzaXRlbWFwRm9ybSA9IGljaC5TaXRlbWFwSW1wb3J0KClcbiAgICB0aGlzLiQoJyN2aWV3cG9ydCcpLmh0bWwoc2l0ZW1hcEZvcm0pXG4gICAgdGhpcy5pbml0SW1wb3J0U3RpZW1hcFZhbGlkYXRpb24oKVxuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgc2hvd1NpdGVtYXBFeHBvcnRQYW5lbDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2V0QWN0aXZlTmF2aWdhdGlvbkJ1dHRvbignc2l0ZW1hcC1leHBvcnQnKVxuICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcFxuICAgIHZhciBzaXRlbWFwSlNPTiA9IHNpdGVtYXAuZXhwb3J0U2l0ZW1hcCgpXG4gICAgdmFyIHNpdGVtYXBFeHBvcnRGb3JtID0gaWNoLlNpdGVtYXBFeHBvcnQoe1xuICAgICAgc2l0ZW1hcEpTT046IHNpdGVtYXBKU09OXG4gICAgfSlcbiAgICB0aGlzLiQoJyN2aWV3cG9ydCcpLmh0bWwoc2l0ZW1hcEV4cG9ydEZvcm0pXG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBzaG93U2l0ZW1hcHM6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmNsZWFyU3RhdGUoKVxuICAgIHRoaXMuc2V0QWN0aXZlTmF2aWdhdGlvbkJ1dHRvbignc2l0ZW1hcHMnKVxuXG4gICAgdGhpcy5zdG9yZS5nZXRBbGxTaXRlbWFwcyhmdW5jdGlvbiAoc2l0ZW1hcHMpIHtcbiAgICAgIHZhciAkc2l0ZW1hcExpc3RQYW5lbCA9IGljaC5TaXRlbWFwTGlzdCgpXG4gICAgICBzaXRlbWFwcy5mb3JFYWNoKGZ1bmN0aW9uIChzaXRlbWFwKSB7XG4gICAgICAgIHZhciAkc2l0ZW1hcCA9IGljaC5TaXRlbWFwTGlzdEl0ZW0oc2l0ZW1hcClcbiAgICAgICAgJHNpdGVtYXAuZGF0YSgnc2l0ZW1hcCcsIHNpdGVtYXApXG4gICAgICAgICRzaXRlbWFwTGlzdFBhbmVsLmZpbmQoJ3Rib2R5JykuYXBwZW5kKCRzaXRlbWFwKVxuICAgICAgfSlcbiAgICAgIHRoaXMuJCgnI3ZpZXdwb3J0JykuaHRtbCgkc2l0ZW1hcExpc3RQYW5lbClcbiAgICB9KVxuICB9LFxuXG4gIGdldFNpdGVtYXBGcm9tTWV0YWRhdGFGb3JtOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGlkID0gdGhpcy4kKCcjdmlld3BvcnQgZm9ybSBpbnB1dFtuYW1lPV9pZF0nKS52YWwoKVxuICAgIHZhciAkc3RhcnRVcmxJbnB1dHMgPSB0aGlzLiQoJyN2aWV3cG9ydCBmb3JtIC5pbnB1dC1zdGFydC11cmwnKVxuICAgIHZhciBzdGFydFVybFxuICAgIGlmICgkc3RhcnRVcmxJbnB1dHMubGVuZ3RoID09PSAxKSB7XG4gICAgICBzdGFydFVybCA9ICRzdGFydFVybElucHV0cy52YWwoKVxuICAgIH0gZWxzZSB7XG4gICAgICBzdGFydFVybCA9IFtdXG4gICAgICAkc3RhcnRVcmxJbnB1dHMuZWFjaChmdW5jdGlvbiAoaSwgZWxlbWVudCkge1xuICAgICAgICBzdGFydFVybC5wdXNoKHRoaXMuJChlbGVtZW50KS52YWwoKSlcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiBpZCxcbiAgICAgIHN0YXJ0VXJsOiBzdGFydFVybFxuICAgIH1cbiAgfSxcblxuICBjcmVhdGVTaXRlbWFwOiBmdW5jdGlvbiAoZm9ybSkge1xuICAgIHZhciAkID0gdGhpcy4kXG5cdFx0Ly8gY2FuY2VsIHN1Ym1pdCBpZiBpbnZhbGlkIGZvcm1cbiAgICBpZiAoIXRoaXMuaXNWYWxpZEZvcm0oKSkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG4gICAgdmFyIHNpdGVtYXBEYXRhID0gdGhpcy5nZXRTaXRlbWFwRnJvbU1ldGFkYXRhRm9ybSgpXG5cblx0XHQvLyBjaGVjayB3aGV0aGVyIHNpdGVtYXAgd2l0aCB0aGlzIGlkIGFscmVhZHkgZXhpc3RcbiAgICB0aGlzLnN0b3JlLnNpdGVtYXBFeGlzdHMoc2l0ZW1hcERhdGEuaWQsIGZ1bmN0aW9uIChzaXRlbWFwRXhpc3RzKSB7XG4gICAgICBpZiAoc2l0ZW1hcEV4aXN0cykge1xuICAgICAgICB2YXIgdmFsaWRhdG9yID0gdGhpcy5nZXRGb3JtVmFsaWRhdG9yKClcbiAgICAgICAgdmFsaWRhdG9yLnVwZGF0ZVN0YXR1cygnX2lkJywgJ0lOVkFMSUQnLCAnY2FsbGJhY2snKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHNpdGVtYXAgPSBuZXcgU2l0ZW1hcCh7XG4gICAgICAgICAgX2lkOiBzaXRlbWFwRGF0YS5pZCxcbiAgICAgICAgICBzdGFydFVybDogc2l0ZW1hcERhdGEuc3RhcnRVcmwsXG4gICAgICAgICAgc2VsZWN0b3JzOiBbXVxuICAgICAgICB9LCB7JH0pXG4gICAgICAgIHRoaXMuc3RvcmUuY3JlYXRlU2l0ZW1hcChzaXRlbWFwLCBmdW5jdGlvbiAoc2l0ZW1hcCkge1xuICAgICAgICAgIHRoaXMuX2VkaXRTaXRlbWFwKHNpdGVtYXAsIFsnX3Jvb3QnXSlcbiAgICAgICAgfS5iaW5kKHRoaXMsIHNpdGVtYXApKVxuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcblxuICBpbXBvcnRTaXRlbWFwOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcblx0XHQvLyBjYW5jZWwgc3VibWl0IGlmIGludmFsaWQgZm9ybVxuICAgIGlmICghdGhpcy5pc1ZhbGlkRm9ybSgpKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cblx0XHQvLyBsb2FkIGRhdGEgZnJvbSBmb3JtXG4gICAgdmFyIHNpdGVtYXBKU09OID0gdGhpcy4kKCdbbmFtZT1zaXRlbWFwSlNPTl0nKS52YWwoKVxuICAgIHZhciBpZCA9IHRoaXMuJCgnaW5wdXRbbmFtZT1faWRdJykudmFsKClcbiAgICB2YXIgc2l0ZW1hcCA9IG5ldyBTaXRlbWFwKG51bGwsIHskfSlcbiAgICBzaXRlbWFwLmltcG9ydFNpdGVtYXAoc2l0ZW1hcEpTT04pXG4gICAgaWYgKGlkLmxlbmd0aCkge1xuICAgICAgc2l0ZW1hcC5faWQgPSBpZFxuICAgIH1cblx0XHQvLyBjaGVjayB3aGV0aGVyIHNpdGVtYXAgd2l0aCB0aGlzIGlkIGFscmVhZHkgZXhpc3RcbiAgICB0aGlzLnN0b3JlLnNpdGVtYXBFeGlzdHMoc2l0ZW1hcC5faWQsIGZ1bmN0aW9uIChzaXRlbWFwRXhpc3RzKSB7XG4gICAgICBpZiAoc2l0ZW1hcEV4aXN0cykge1xuICAgICAgICB2YXIgdmFsaWRhdG9yID0gdGhpcy5nZXRGb3JtVmFsaWRhdG9yKClcbiAgICAgICAgdmFsaWRhdG9yLnVwZGF0ZVN0YXR1cygnX2lkJywgJ0lOVkFMSUQnLCAnY2FsbGJhY2snKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5zdG9yZS5jcmVhdGVTaXRlbWFwKHNpdGVtYXAsIGZ1bmN0aW9uIChzaXRlbWFwKSB7XG4gICAgICAgICAgdGhpcy5fZWRpdFNpdGVtYXAoc2l0ZW1hcCwgWydfcm9vdCddKVxuICAgICAgICB9LmJpbmQodGhpcywgc2l0ZW1hcCkpXG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuXG4gIGVkaXRTaXRlbWFwTWV0YWRhdGE6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB0aGlzLnNldEFjdGl2ZU5hdmlnYXRpb25CdXR0b24oJ3NpdGVtYXAtZWRpdC1tZXRhZGF0YScpXG5cbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICB2YXIgJHNpdGVtYXBNZXRhZGF0YUZvcm0gPSBpY2guU2l0ZW1hcEVkaXRNZXRhZGF0YShzaXRlbWFwKVxuICAgIHRoaXMuJCgnI3ZpZXdwb3J0JykuaHRtbCgkc2l0ZW1hcE1ldGFkYXRhRm9ybSlcbiAgICB0aGlzLmluaXRNdWx0aXBsZVN0YXJ0VXJsSGVscGVyKClcbiAgICB0aGlzLmluaXRTaXRlbWFwVmFsaWRhdGlvbigpXG5cbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGVkaXRTaXRlbWFwTWV0YWRhdGFTYXZlOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICB2YXIgc2l0ZW1hcERhdGEgPSB0aGlzLmdldFNpdGVtYXBGcm9tTWV0YWRhdGFGb3JtKClcblxuXHRcdC8vIGNhbmNlbCBzdWJtaXQgaWYgaW52YWxpZCBmb3JtXG4gICAgaWYgKCF0aGlzLmlzVmFsaWRGb3JtKCkpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cblxuXHRcdC8vIGNoZWNrIHdoZXRoZXIgc2l0ZW1hcCB3aXRoIHRoaXMgaWQgYWxyZWFkeSBleGlzdFxuICAgIHRoaXMuc3RvcmUuc2l0ZW1hcEV4aXN0cyhzaXRlbWFwRGF0YS5pZCwgZnVuY3Rpb24gKHNpdGVtYXBFeGlzdHMpIHtcbiAgICAgIGlmIChzaXRlbWFwLl9pZCAhPT0gc2l0ZW1hcERhdGEuaWQgJiYgc2l0ZW1hcEV4aXN0cykge1xuICAgICAgICB2YXIgdmFsaWRhdG9yID0gdGhpcy5nZXRGb3JtVmFsaWRhdG9yKClcbiAgICAgICAgdmFsaWRhdG9yLnVwZGF0ZVN0YXR1cygnX2lkJywgJ0lOVkFMSUQnLCAnY2FsbGJhY2snKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuXHRcdFx0Ly8gY2hhbmdlIGRhdGFcbiAgICAgIHNpdGVtYXAuc3RhcnRVcmwgPSBzaXRlbWFwRGF0YS5zdGFydFVybFxuXG5cdFx0XHQvLyBqdXN0IGNoYW5nZSBzaXRlbWFwcyB1cmxcbiAgICAgIGlmIChzaXRlbWFwRGF0YS5pZCA9PT0gc2l0ZW1hcC5faWQpIHtcbiAgICAgICAgdGhpcy5zdG9yZS5zYXZlU2l0ZW1hcChzaXRlbWFwLCBmdW5jdGlvbiAoc2l0ZW1hcCkge1xuICAgICAgICAgIHRoaXMuc2hvd1NpdGVtYXBTZWxlY3Rvckxpc3QoKVxuICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBpZCBjaGFuZ2VkLiB3ZSBuZWVkIHRvIGRlbGV0ZSB0aGUgb2xkIG9uZSBhbmQgY3JlYXRlIGEgbmV3IG9uZVxuICAgICAgICB2YXIgbmV3U2l0ZW1hcCA9IG5ldyBTaXRlbWFwKHNpdGVtYXAsIHskfSlcbiAgICAgICAgdmFyIG9sZFNpdGVtYXAgPSBzaXRlbWFwXG4gICAgICAgIG5ld1NpdGVtYXAuX2lkID0gc2l0ZW1hcERhdGEuaWRcbiAgICAgICAgdGhpcy5zdG9yZS5jcmVhdGVTaXRlbWFwKG5ld1NpdGVtYXAsIGZ1bmN0aW9uIChuZXdTaXRlbWFwKSB7XG4gICAgICAgICAgdGhpcy5zdG9yZS5kZWxldGVTaXRlbWFwKG9sZFNpdGVtYXAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXAgPSBuZXdTaXRlbWFwXG4gICAgICAgICAgICB0aGlzLnNob3dTaXRlbWFwU2VsZWN0b3JMaXN0KClcbiAgICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG5cblx0LyoqXG5cdCAqIENhbGxiYWNrIHdoZW4gc2l0ZW1hcCBlZGl0IGJ1dHRvbiBpcyBjbGlja2VkIGluIHNpdGVtYXAgZ3JpZFxuXHQgKi9cbiAgZWRpdFNpdGVtYXA6IGZ1bmN0aW9uICh0cikge1xuICAgIHZhciBzaXRlbWFwID0gdGhpcy4kKHRyKS5kYXRhKCdzaXRlbWFwJylcbiAgICB0aGlzLl9lZGl0U2l0ZW1hcChzaXRlbWFwKVxuICB9LFxuICBfZWRpdFNpdGVtYXA6IGZ1bmN0aW9uIChzaXRlbWFwKSB7XG4gICAgdGhpcy5zZXRTdGF0ZUVkaXRTaXRlbWFwKHNpdGVtYXApXG4gICAgdGhpcy5zZXRBY3RpdmVOYXZpZ2F0aW9uQnV0dG9uKCdzaXRlbWFwJylcblxuICAgIHRoaXMuc2hvd1NpdGVtYXBTZWxlY3Rvckxpc3QoKVxuICB9LFxuICBzaG93U2l0ZW1hcFNlbGVjdG9yTGlzdDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2V0QWN0aXZlTmF2aWdhdGlvbkJ1dHRvbignc2l0ZW1hcC1zZWxlY3Rvci1saXN0JylcblxuICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcFxuICAgIHZhciBwYXJlbnRTZWxlY3RvcnMgPSB0aGlzLnN0YXRlLmVkaXRTaXRlbWFwQnJlYWRjdW1ic1NlbGVjdG9yc1xuICAgIHZhciBwYXJlbnRTZWxlY3RvcklkID0gdGhpcy5zdGF0ZS5jdXJyZW50UGFyZW50U2VsZWN0b3JJZFxuXG4gICAgdmFyICRzZWxlY3Rvckxpc3RQYW5lbCA9IGljaC5TZWxlY3Rvckxpc3Qoe1xuICAgICAgcGFyZW50U2VsZWN0b3JzOiBwYXJlbnRTZWxlY3RvcnNcbiAgICB9KVxuICAgIHZhciBzZWxlY3RvcnMgPSBzaXRlbWFwLmdldERpcmVjdENoaWxkU2VsZWN0b3JzKHBhcmVudFNlbGVjdG9ySWQpXG4gICAgc2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICB2YXIgJHNlbGVjdG9yID0gaWNoLlNlbGVjdG9yTGlzdEl0ZW0oc2VsZWN0b3IpXG4gICAgICAkc2VsZWN0b3IuZGF0YSgnc2VsZWN0b3InLCBzZWxlY3RvcilcbiAgICAgICRzZWxlY3Rvckxpc3RQYW5lbC5maW5kKCd0Ym9keScpLmFwcGVuZCgkc2VsZWN0b3IpXG4gICAgfSlcbiAgICB0aGlzLiQoJyN2aWV3cG9ydCcpLmh0bWwoJHNlbGVjdG9yTGlzdFBhbmVsKVxuXG4gICAgcmV0dXJuIHRydWVcbiAgfSwgLypcbiAgc2hvd1NpdGVtYXBTZWxlY3RvckdyYXBoOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zZXRBY3RpdmVOYXZpZ2F0aW9uQnV0dG9uKCdzaXRlbWFwLXNlbGVjdG9yLWdyYXBoJylcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICB2YXIgJHNlbGVjdG9yR3JhcGhQYW5lbCA9IGljaC5TaXRlbWFwU2VsZWN0b3JHcmFwaCgpXG4gICAgJCgnI3ZpZXdwb3J0JykuaHRtbCgkc2VsZWN0b3JHcmFwaFBhbmVsKVxuICAgIHZhciBncmFwaERpdiA9ICQoJyNzZWxlY3Rvci1ncmFwaCcpWzBdXG4gICAgdmFyIGdyYXBoID0gbmV3IFNlbGVjdG9yR3JhcGh2MihzaXRlbWFwKVxuICAgIGdyYXBoLmRyYXcoZ3JhcGhEaXYsICQoZG9jdW1lbnQpLndpZHRoKCksIDIwMClcbiAgICByZXR1cm4gdHJ1ZVxuICB9LCAqL1xuICBzaG93Q2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICh0cikge1xuICAgIHZhciBzZWxlY3RvciA9IHRoaXMuJCh0cikuZGF0YSgnc2VsZWN0b3InKVxuICAgIHZhciBwYXJlbnRTZWxlY3RvcnMgPSB0aGlzLnN0YXRlLmVkaXRTaXRlbWFwQnJlYWRjdW1ic1NlbGVjdG9yc1xuICAgIHRoaXMuc3RhdGUuY3VycmVudFBhcmVudFNlbGVjdG9ySWQgPSBzZWxlY3Rvci5pZFxuICAgIHBhcmVudFNlbGVjdG9ycy5wdXNoKHNlbGVjdG9yKVxuXG4gICAgdGhpcy5zaG93U2l0ZW1hcFNlbGVjdG9yTGlzdCgpXG4gIH0sXG5cbiAgdHJlZU5hdmlnYXRpb25zaG93U2l0ZW1hcFNlbGVjdG9yTGlzdDogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciBwYXJlbnRTZWxlY3RvcnMgPSB0aGlzLnN0YXRlLmVkaXRTaXRlbWFwQnJlYWRjdW1ic1NlbGVjdG9yc1xuICAgIHZhciBjb250cm9sbGVyID0gdGhpc1xuICAgIHRoaXMuJCgnI3NlbGVjdG9yLXRyZWUgLmJyZWFkY3J1bWIgbGkgYScpLmVhY2goZnVuY3Rpb24gKGksIHBhcmVudFNlbGVjdG9yQnV0dG9uKSB7XG4gICAgICBpZiAocGFyZW50U2VsZWN0b3JCdXR0b24gPT09IGJ1dHRvbikge1xuICAgICAgICBwYXJlbnRTZWxlY3RvcnMuc3BsaWNlKGkgKyAxKVxuICAgICAgICBjb250cm9sbGVyLnN0YXRlLmN1cnJlbnRQYXJlbnRTZWxlY3RvcklkID0gcGFyZW50U2VsZWN0b3JzW2ldLmlkXG4gICAgICB9XG4gICAgfSlcbiAgICB0aGlzLnNob3dTaXRlbWFwU2VsZWN0b3JMaXN0KClcbiAgfSxcblxuICBpbml0U2VsZWN0b3JWYWxpZGF0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKCcjdmlld3BvcnQgZm9ybScpLmJvb3RzdHJhcFZhbGlkYXRvcih7XG4gICAgICBmaWVsZHM6IHtcbiAgICAgICAgJ2lkJzoge1xuICAgICAgICAgIHZhbGlkYXRvcnM6IHtcbiAgICAgICAgICAgIG5vdEVtcHR5OiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdTaXRlbWFwIGlkIHJlcXVpcmVkIGFuZCBjYW5ub3QgYmUgZW1wdHknXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3RyaW5nTGVuZ3RoOiB7XG4gICAgICAgICAgICAgIG1pbjogMyxcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSBzaXRlbWFwIGlkIHNob3VsZCBiZSBhdGxlYXN0IDMgY2hhcmFjdGVycyBsb25nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJlZ2V4cDoge1xuICAgICAgICAgICAgICByZWdleHA6IC9eW15fXS4qJC8sXG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdTZWxlY3RvciBpZCBjYW5ub3Qgc3RhcnQgd2l0aCBhbiB1bmRlcnNjb3JlIF8nXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBzZWxlY3Rvcjoge1xuICAgICAgICAgIHZhbGlkYXRvcnM6IHtcbiAgICAgICAgICAgIG5vdEVtcHR5OiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdTZWxlY3RvciBpcyByZXF1aXJlZCBhbmQgY2Fubm90IGJlIGVtcHR5J1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgcmVnZXg6IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBjYWxsYmFjazoge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnSmF2YVNjcmlwdCBkb2VzIG5vdCBzdXBwb3J0IHJlZ3VsYXIgZXhwcmVzc2lvbnMgdGhhdCBjYW4gbWF0Y2ggMCBjaGFyYWN0ZXJzLicsXG4gICAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbiAodmFsdWUsIHZhbGlkYXRvcikge1xuXHRcdFx0XHRcdFx0XHRcdC8vIGFsbG93IG5vIHJlZ2V4XG4gICAgICAgICAgICAgICAgaWYgKCF2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgbWF0Y2hlcyA9ICcnLm1hdGNoKG5ldyBSZWdFeHAodmFsdWUpKVxuICAgICAgICAgICAgICAgIGlmIChtYXRjaGVzICE9PSBudWxsICYmIG1hdGNoZXNbMF0gPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGNsaWNrRWxlbWVudFNlbGVjdG9yOiB7XG4gICAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgICAgbm90RW1wdHk6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ0NsaWNrIHNlbGVjdG9yIGlzIHJlcXVpcmVkIGFuZCBjYW5ub3QgYmUgZW1wdHknXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB0YWJsZUhlYWRlclJvd1NlbGVjdG9yOiB7XG4gICAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgICAgbm90RW1wdHk6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ0hlYWRlciByb3cgc2VsZWN0b3IgaXMgcmVxdWlyZWQgYW5kIGNhbm5vdCBiZSBlbXB0eSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHRhYmxlRGF0YVJvd1NlbGVjdG9yOiB7XG4gICAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgICAgbm90RW1wdHk6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ0RhdGEgcm93IHNlbGVjdG9yIGlzIHJlcXVpcmVkIGFuZCBjYW5ub3QgYmUgZW1wdHknXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBkZWxheToge1xuICAgICAgICAgIHZhbGlkYXRvcnM6IHtcbiAgICAgICAgICAgIG51bWVyaWM6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ0RlbGF5IG11c3QgYmUgbnVtZXJpYydcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHBhcmVudFNlbGVjdG9yczoge1xuICAgICAgICAgIHZhbGlkYXRvcnM6IHtcbiAgICAgICAgICAgIG5vdEVtcHR5OiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdZb3UgbXVzdCBjaG9vc2UgYXQgbGVhc3Qgb25lIHBhcmVudCBzZWxlY3RvcidcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjYWxsYmFjazoge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnQ2Fubm90IGhhbmRsZSByZWN1cnNpdmUgZWxlbWVudCBzZWxlY3RvcnMnLFxuICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKHZhbHVlLCB2YWxpZGF0b3IsICRmaWVsZCkge1xuICAgICAgICAgICAgICAgIHZhciBzaXRlbWFwID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvclNpdGVtYXAoKVxuICAgICAgICAgICAgICAgIHJldHVybiAhc2l0ZW1hcC5zZWxlY3RvcnMuaGFzUmVjdXJzaXZlRWxlbWVudFNlbGVjdG9ycygpXG4gICAgICAgICAgICAgIH0uYmluZCh0aGlzKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIH0sXG4gIGVkaXRTZWxlY3RvcjogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciBzZWxlY3RvciA9IHRoaXMuJChidXR0b24pLmNsb3Nlc3QoJ3RyJykuZGF0YSgnc2VsZWN0b3InKVxuICAgIHRoaXMuX2VkaXRTZWxlY3RvcihzZWxlY3RvcilcbiAgfSxcbiAgdXBkYXRlU2VsZWN0b3JQYXJlbnRMaXN0T25JZENoYW5nZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3IoKVxuICAgIHRoaXMuJCgnLmN1cnJlbnRseS1lZGl0ZWQnKS52YWwoc2VsZWN0b3IuaWQpLnRleHQoc2VsZWN0b3IuaWQpXG4gIH0sXG4gIF9lZGl0U2VsZWN0b3I6IGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcFxuICAgIHZhciBzZWxlY3RvcklkcyA9IHNpdGVtYXAuZ2V0UG9zc2libGVQYXJlbnRTZWxlY3RvcklkcygpXG5cbiAgICB2YXIgJGVkaXRTZWxlY3RvckZvcm0gPSBpY2guU2VsZWN0b3JFZGl0KHtcbiAgICAgIHNlbGVjdG9yOiBzZWxlY3RvcixcbiAgICAgIHNlbGVjdG9ySWRzOiBzZWxlY3RvcklkcyxcbiAgICAgIHNlbGVjdG9yVHlwZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6ICdTZWxlY3RvclRleHQnLFxuICAgICAgICAgIHRpdGxlOiAnVGV4dCdcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6ICdTZWxlY3RvckxpbmsnLFxuICAgICAgICAgIHRpdGxlOiAnTGluaydcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6ICdTZWxlY3RvclBvcHVwTGluaycsXG4gICAgICAgICAgdGl0bGU6ICdQb3B1cCBMaW5rJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ1NlbGVjdG9ySW1hZ2UnLFxuICAgICAgICAgIHRpdGxlOiAnSW1hZ2UnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnU2VsZWN0b3JUYWJsZScsXG4gICAgICAgICAgdGl0bGU6ICdUYWJsZSdcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6ICdTZWxlY3RvckVsZW1lbnRBdHRyaWJ1dGUnLFxuICAgICAgICAgIHRpdGxlOiAnRWxlbWVudCBhdHRyaWJ1dGUnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnU2VsZWN0b3JIVE1MJyxcbiAgICAgICAgICB0aXRsZTogJ0hUTUwnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnU2VsZWN0b3JFbGVtZW50JyxcbiAgICAgICAgICB0aXRsZTogJ0VsZW1lbnQnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnU2VsZWN0b3JFbGVtZW50U2Nyb2xsJyxcbiAgICAgICAgICB0aXRsZTogJ0VsZW1lbnQgc2Nyb2xsIGRvd24nXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnU2VsZWN0b3JFbGVtZW50Q2xpY2snLFxuICAgICAgICAgIHRpdGxlOiAnRWxlbWVudCBjbGljaydcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6ICdTZWxlY3Rvckdyb3VwJyxcbiAgICAgICAgICB0aXRsZTogJ0dyb3VwZWQnXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9KVxuICAgIHRoaXMuJCgnI3ZpZXdwb3J0JykuaHRtbCgkZWRpdFNlbGVjdG9yRm9ybSlcblx0XHQvLyBtYXJrIGluaXRpYWxseSBvcGVuZWQgc2VsZWN0b3IgYXMgY3VycmVudGx5IGVkaXRlZFxuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgI3BhcmVudFNlbGVjdG9ycyBvcHRpb24nKS5lYWNoKGZ1bmN0aW9uIChpLCBlbGVtZW50KSB7XG4gICAgICBpZiAoc2VsZi4kKGVsZW1lbnQpLnZhbCgpID09PSBzZWxlY3Rvci5pZCkge1xuICAgICAgICBzZWxmLiQoZWxlbWVudCkuYWRkQ2xhc3MoJ2N1cnJlbnRseS1lZGl0ZWQnKVxuICAgICAgfVxuICAgIH0pXG5cblx0XHQvLyBzZXQgY2xpY2tUeXBlXG4gICAgaWYgKHNlbGVjdG9yLmNsaWNrVHlwZSkge1xuICAgICAgJGVkaXRTZWxlY3RvckZvcm0uZmluZCgnW25hbWU9Y2xpY2tUeXBlXScpLnZhbChzZWxlY3Rvci5jbGlja1R5cGUpXG4gICAgfVxuXHRcdC8vIHNldCBjbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZVxuICAgIGlmIChzZWxlY3Rvci5jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSkge1xuICAgICAgJGVkaXRTZWxlY3RvckZvcm0uZmluZCgnW25hbWU9Y2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGVdJykudmFsKHNlbGVjdG9yLmNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlKVxuICAgIH1cblxuXHRcdC8vIGhhbmRsZSBzZWxlY3RzIHNlcGVyYXRlbHlcbiAgICAkZWRpdFNlbGVjdG9yRm9ybS5maW5kKCdbbmFtZT10eXBlXScpLnZhbChzZWxlY3Rvci50eXBlKVxuICAgIHNlbGVjdG9yLnBhcmVudFNlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChwYXJlbnRTZWxlY3RvcklkKSB7XG4gICAgICAkZWRpdFNlbGVjdG9yRm9ybS5maW5kKFwiI3BhcmVudFNlbGVjdG9ycyBbdmFsdWU9J1wiICsgcGFyZW50U2VsZWN0b3JJZCArIFwiJ11cIikuYXR0cignc2VsZWN0ZWQnLCAnc2VsZWN0ZWQnKVxuICAgIH0pXG5cbiAgICB0aGlzLnN0YXRlLmN1cnJlbnRTZWxlY3RvciA9IHNlbGVjdG9yXG4gICAgdGhpcy5zZWxlY3RvclR5cGVDaGFuZ2VkKClcbiAgICB0aGlzLmluaXRTZWxlY3RvclZhbGlkYXRpb24oKVxuICB9LFxuICBzZWxlY3RvclR5cGVDaGFuZ2VkOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHR5cGUgPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIHNlbGVjdFtuYW1lPXR5cGVdJykudmFsKClcbiAgICB2YXIgZmVhdHVyZXMgPSBzZWxlY3RvcnNbdHlwZV0uZ2V0RmVhdHVyZXMoKVxuICAgIHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgLmZlYXR1cmUnKS5oaWRlKClcbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICBmZWF0dXJlcy5mb3JFYWNoKGZ1bmN0aW9uIChmZWF0dXJlKSB7XG4gICAgICBzZWxmLiQoJyNlZGl0LXNlbGVjdG9yIC5mZWF0dXJlLScgKyBmZWF0dXJlKS5zaG93KClcbiAgICB9KVxuXG5cdFx0Ly8gYWRkIHRoaXMgc2VsZWN0b3IgdG8gcG9zc2libGUgcGFyZW50IHNlbGVjdG9yXG4gICAgdmFyIHNlbGVjdG9yID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvcigpXG4gICAgaWYgKHNlbGVjdG9yLmNhbkhhdmVDaGlsZFNlbGVjdG9ycygpKSB7XG4gICAgICBpZiAodGhpcy4kKCcjZWRpdC1zZWxlY3RvciAjcGFyZW50U2VsZWN0b3JzIC5jdXJyZW50bHktZWRpdGVkJykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHZhciAkb3B0aW9uID0gdGhpcy4kKCc8b3B0aW9uIGNsYXNzPVwiY3VycmVudGx5LWVkaXRlZFwiPjwvb3B0aW9uPicpXG4gICAgICAgICRvcHRpb24udGV4dChzZWxlY3Rvci5pZCkudmFsKHNlbGVjdG9yLmlkKVxuICAgICAgICB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yICNwYXJlbnRTZWxlY3RvcnMnKS5hcHBlbmQoJG9wdGlvbilcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuXHRcdC8vIHJlbW92ZSBpZiB0eXBlIGRvZXNuJ3QgYWxsb3cgdG8gaGF2ZSBjaGlsZCBzZWxlY3RvcnNcbiAgICAgIHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgI3BhcmVudFNlbGVjdG9ycyAuY3VycmVudGx5LWVkaXRlZCcpLnJlbW92ZSgpXG4gICAgfVxuICB9LFxuICBzYXZlU2VsZWN0b3I6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICB2YXIgc2VsZWN0b3IgPSB0aGlzLnN0YXRlLmN1cnJlbnRTZWxlY3RvclxuICAgIHZhciBuZXdTZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3IoKVxuXG5cdFx0Ly8gY2FuY2VsIHN1Ym1pdCBpZiBpbnZhbGlkIGZvcm1cbiAgICBpZiAoIXRoaXMuaXNWYWxpZEZvcm0oKSkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG5cdFx0Ly8gY2FuY2VsIHBvc3NpYmxlIGVsZW1lbnQgc2VsZWN0aW9uXG4gICAgdGhpcy5jb250ZW50U2NyaXB0LnJlbW92ZUN1cnJlbnRDb250ZW50U2VsZWN0b3IoKS5kb25lKGZ1bmN0aW9uICgpIHtcbiAgICAgIHNpdGVtYXAudXBkYXRlU2VsZWN0b3Ioc2VsZWN0b3IsIG5ld1NlbGVjdG9yKVxuXG4gICAgICB0aGlzLnN0b3JlLnNhdmVTaXRlbWFwKHNpdGVtYXAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5zaG93U2l0ZW1hcFNlbGVjdG9yTGlzdCgpXG4gICAgICB9LmJpbmQodGhpcykpXG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuXHQvKipcblx0ICogR2V0IHNlbGVjdG9yIGZyb20gc2VsZWN0b3IgZWRpdGluZyBmb3JtXG5cdCAqL1xuICBnZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvcjogZnVuY3Rpb24gKCkge1xuICAgIHZhciBpZCA9IHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9aWRdJykudmFsKClcbiAgICB2YXIgc2VsZWN0b3JzU2VsZWN0b3IgPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPXNlbGVjdG9yXScpLnZhbCgpXG4gICAgdmFyIHRhYmxlRGF0YVJvd1NlbGVjdG9yID0gdGhpcy4kKCcjZWRpdC1zZWxlY3RvciBbbmFtZT10YWJsZURhdGFSb3dTZWxlY3Rvcl0nKS52YWwoKVxuICAgIHZhciB0YWJsZUhlYWRlclJvd1NlbGVjdG9yID0gdGhpcy4kKCcjZWRpdC1zZWxlY3RvciBbbmFtZT10YWJsZUhlYWRlclJvd1NlbGVjdG9yXScpLnZhbCgpXG4gICAgdmFyIGNsaWNrRWxlbWVudFNlbGVjdG9yID0gdGhpcy4kKCcjZWRpdC1zZWxlY3RvciBbbmFtZT1jbGlja0VsZW1lbnRTZWxlY3Rvcl0nKS52YWwoKVxuICAgIHZhciB0eXBlID0gdGhpcy4kKCcjZWRpdC1zZWxlY3RvciBbbmFtZT10eXBlXScpLnZhbCgpXG4gICAgdmFyIGNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlID0gdGhpcy4kKCcjZWRpdC1zZWxlY3RvciBbbmFtZT1jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZV0nKS52YWwoKVxuICAgIHZhciBjbGlja1R5cGUgPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPWNsaWNrVHlwZV0nKS52YWwoKVxuICAgIHZhciBkaXNjYXJkSW5pdGlhbEVsZW1lbnRzID0gdGhpcy4kKCcjZWRpdC1zZWxlY3RvciBbbmFtZT1kaXNjYXJkSW5pdGlhbEVsZW1lbnRzXScpLmlzKCc6Y2hlY2tlZCcpXG4gICAgdmFyIG11bHRpcGxlID0gdGhpcy4kKCcjZWRpdC1zZWxlY3RvciBbbmFtZT1tdWx0aXBsZV0nKS5pcygnOmNoZWNrZWQnKVxuICAgIHZhciBkb3dubG9hZEltYWdlID0gdGhpcy4kKCcjZWRpdC1zZWxlY3RvciBbbmFtZT1kb3dubG9hZEltYWdlXScpLmlzKCc6Y2hlY2tlZCcpXG4gICAgdmFyIGNsaWNrUG9wdXAgPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPWNsaWNrUG9wdXBdJykuaXMoJzpjaGVja2VkJylcbiAgICB2YXIgcmVnZXggPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPXJlZ2V4XScpLnZhbCgpXG4gICAgdmFyIGRlbGF5ID0gdGhpcy4kKCcjZWRpdC1zZWxlY3RvciBbbmFtZT1kZWxheV0nKS52YWwoKVxuICAgIHZhciBleHRyYWN0QXR0cmlidXRlID0gdGhpcy4kKCcjZWRpdC1zZWxlY3RvciBbbmFtZT1leHRyYWN0QXR0cmlidXRlXScpLnZhbCgpXG4gICAgdmFyIHBhcmVudFNlbGVjdG9ycyA9IHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9cGFyZW50U2VsZWN0b3JzXScpLnZhbCgpXG4gICAgdmFyIGNvbHVtbnMgPSBbXVxuICAgIHZhciAkY29sdW1uSGVhZGVycyA9IHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgLmNvbHVtbi1oZWFkZXInKVxuICAgIHZhciAkY29sdW1uTmFtZXMgPSB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIC5jb2x1bW4tbmFtZScpXG4gICAgdmFyICRjb2x1bW5FeHRyYWN0cyA9IHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgLmNvbHVtbi1leHRyYWN0JylcblxuICAgIHZhciBzZWxmID0gdGhpc1xuICAgICRjb2x1bW5IZWFkZXJzLmVhY2goZnVuY3Rpb24gKGkpIHtcbiAgICAgIHZhciBoZWFkZXIgPSBzZWxmLiQoJGNvbHVtbkhlYWRlcnNbaV0pLnZhbCgpXG4gICAgICB2YXIgbmFtZSA9IHNlbGYuJCgkY29sdW1uTmFtZXNbaV0pLnZhbCgpXG4gICAgICB2YXIgZXh0cmFjdCA9IHNlbGYuJCgkY29sdW1uRXh0cmFjdHNbaV0pLmlzKCc6Y2hlY2tlZCcpXG4gICAgICBjb2x1bW5zLnB1c2goe1xuICAgICAgICBoZWFkZXI6IGhlYWRlcixcbiAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgZXh0cmFjdDogZXh0cmFjdFxuICAgICAgfSlcbiAgICB9KVxuXG4gICAgdmFyIG5ld1NlbGVjdG9yID0gbmV3IFNlbGVjdG9yKHtcbiAgICAgIGlkOiBpZCxcbiAgICAgIHNlbGVjdG9yOiBzZWxlY3RvcnNTZWxlY3RvcixcbiAgICAgIHRhYmxlSGVhZGVyUm93U2VsZWN0b3I6IHRhYmxlSGVhZGVyUm93U2VsZWN0b3IsXG4gICAgICB0YWJsZURhdGFSb3dTZWxlY3RvcjogdGFibGVEYXRhUm93U2VsZWN0b3IsXG4gICAgICBjbGlja0VsZW1lbnRTZWxlY3RvcjogY2xpY2tFbGVtZW50U2VsZWN0b3IsXG4gICAgICBjbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZTogY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUsXG4gICAgICBjbGlja1R5cGU6IGNsaWNrVHlwZSxcbiAgICAgIGRpc2NhcmRJbml0aWFsRWxlbWVudHM6IGRpc2NhcmRJbml0aWFsRWxlbWVudHMsXG4gICAgICB0eXBlOiB0eXBlLFxuICAgICAgbXVsdGlwbGU6IG11bHRpcGxlLFxuICAgICAgZG93bmxvYWRJbWFnZTogZG93bmxvYWRJbWFnZSxcbiAgICAgIGNsaWNrUG9wdXA6IGNsaWNrUG9wdXAsXG4gICAgICByZWdleDogcmVnZXgsXG4gICAgICBleHRyYWN0QXR0cmlidXRlOiBleHRyYWN0QXR0cmlidXRlLFxuICAgICAgcGFyZW50U2VsZWN0b3JzOiBwYXJlbnRTZWxlY3RvcnMsXG4gICAgICBjb2x1bW5zOiBjb2x1bW5zLFxuICAgICAgZGVsYXk6IGRlbGF5XG4gICAgfSwge1xuICAgICAgJDogdGhpcy4kXG4gICAgfSlcbiAgICByZXR1cm4gbmV3U2VsZWN0b3JcbiAgfSxcblx0LyoqXG5cdCAqIEByZXR1cm5zIHtTaXRlbWFwfCp9IENsb25lZCBTaXRlbWFwIHdpdGggY3VycmVudGx5IGVkaXRlZCBzZWxlY3RvclxuXHQgKi9cbiAgZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3JTaXRlbWFwOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwLmNsb25lKClcbiAgICB2YXIgc2VsZWN0b3IgPSBzaXRlbWFwLmdldFNlbGVjdG9yQnlJZCh0aGlzLnN0YXRlLmN1cnJlbnRTZWxlY3Rvci5pZClcbiAgICB2YXIgbmV3U2VsZWN0b3IgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yKClcbiAgICBzaXRlbWFwLnVwZGF0ZVNlbGVjdG9yKHNlbGVjdG9yLCBuZXdTZWxlY3RvcilcbiAgICByZXR1cm4gc2l0ZW1hcFxuICB9LFxuICBjYW5jZWxTZWxlY3RvckVkaXRpbmc6IGZ1bmN0aW9uIChidXR0b24pIHtcblx0XHQvLyBjYW5jZWwgcG9zc2libGUgZWxlbWVudCBzZWxlY3Rpb25cbiAgICB0aGlzLmNvbnRlbnRTY3JpcHQucmVtb3ZlQ3VycmVudENvbnRlbnRTZWxlY3RvcigpLmRvbmUoZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5zaG93U2l0ZW1hcFNlbGVjdG9yTGlzdCgpXG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuICBhZGRTZWxlY3RvcjogZnVuY3Rpb24gKCkge1xuICAgIHZhciBwYXJlbnRTZWxlY3RvcklkID0gdGhpcy5zdGF0ZS5jdXJyZW50UGFyZW50U2VsZWN0b3JJZFxuICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcFxuXG4gICAgdmFyIHNlbGVjdG9yID0gbmV3IFNlbGVjdG9yKHtcbiAgICAgIHBhcmVudFNlbGVjdG9yczogW3BhcmVudFNlbGVjdG9ySWRdLFxuICAgICAgdHlwZTogJ1NlbGVjdG9yVGV4dCcsXG4gICAgICBtdWx0aXBsZTogZmFsc2VcbiAgICB9LCB7JDogdGhpcy4kfSlcblxuICAgIHRoaXMuX2VkaXRTZWxlY3RvcihzZWxlY3Rvciwgc2l0ZW1hcClcbiAgfSxcbiAgZGVsZXRlU2VsZWN0b3I6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICB2YXIgc2VsZWN0b3IgPSB0aGlzLiQoYnV0dG9uKS5jbG9zZXN0KCd0cicpLmRhdGEoJ3NlbGVjdG9yJylcbiAgICBzaXRlbWFwLmRlbGV0ZVNlbGVjdG9yKHNlbGVjdG9yKVxuXG4gICAgdGhpcy5zdG9yZS5zYXZlU2l0ZW1hcChzaXRlbWFwLCBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLnNob3dTaXRlbWFwU2VsZWN0b3JMaXN0KClcbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG4gIGRlbGV0ZVNpdGVtYXA6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuJChidXR0b24pLmNsb3Nlc3QoJ3RyJykuZGF0YSgnc2l0ZW1hcCcpXG4gICAgdmFyIGNvbnRyb2xsZXIgPSB0aGlzXG4gICAgdGhpcy5zdG9yZS5kZWxldGVTaXRlbWFwKHNpdGVtYXAsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGNvbnRyb2xsZXIuc2hvd1NpdGVtYXBzKClcbiAgICB9KVxuICB9LFxuICBpbml0U2NyYXBlU2l0ZW1hcENvbmZpZ1ZhbGlkYXRpb246IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoJyN2aWV3cG9ydCBmb3JtJykuYm9vdHN0cmFwVmFsaWRhdG9yKHtcbiAgICAgIGZpZWxkczoge1xuICAgICAgICAncmVxdWVzdEludGVydmFsJzoge1xuICAgICAgICAgIHZhbGlkYXRvcnM6IHtcbiAgICAgICAgICAgIG5vdEVtcHR5OiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgcmVxdWVzdCBpbnRlcnZhbCBpcyByZXF1aXJlZCBhbmQgY2Fubm90IGJlIGVtcHR5J1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG51bWVyaWM6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSByZXF1ZXN0IGludGVydmFsIG11c3QgYmUgbnVtZXJpYydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjYWxsYmFjazoge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnVGhlIHJlcXVlc3QgaW50ZXJ2YWwgbXVzdCBiZSBhdGxlYXN0IDIwMDAgbWlsbGlzZWNvbmRzJyxcbiAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICh2YWx1ZSwgdmFsaWRhdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlID49IDIwMDBcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgJ3BhZ2VMb2FkRGVsYXknOiB7XG4gICAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgICAgbm90RW1wdHk6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSBwYWdlIGxvYWQgZGVsYXkgaXMgcmVxdWlyZWQgYW5kIGNhbm5vdCBiZSBlbXB0eSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBudW1lcmljOiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgcGFnZSBsYW9kIGRlbGF5IG11c3QgYmUgbnVtZXJpYydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjYWxsYmFjazoge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnVGhlIHBhZ2UgbG9hZCBkZWxheSBtdXN0IGJlIGF0bGVhc3QgNTAwIG1pbGxpc2Vjb25kcycsXG4gICAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbiAodmFsdWUsIHZhbGlkYXRvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZSA+PSA1MDBcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIH0sXG4gIHNob3dTY3JhcGVTaXRlbWFwQ29uZmlnUGFuZWw6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNldEFjdGl2ZU5hdmlnYXRpb25CdXR0b24oJ3NpdGVtYXAtc2NyYXBlJylcbiAgICB2YXIgc2NyYXBlQ29uZmlnUGFuZWwgPSBpY2guU2l0ZW1hcFNjcmFwZUNvbmZpZygpXG4gICAgdGhpcy4kKCcjdmlld3BvcnQnKS5odG1sKHNjcmFwZUNvbmZpZ1BhbmVsKVxuICAgIHRoaXMuaW5pdFNjcmFwZVNpdGVtYXBDb25maWdWYWxpZGF0aW9uKClcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuICBzY3JhcGVTaXRlbWFwOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmlzVmFsaWRGb3JtKCkpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cblxuICAgIHZhciByZXF1ZXN0SW50ZXJ2YWwgPSB0aGlzLiQoJ2lucHV0W25hbWU9cmVxdWVzdEludGVydmFsXScpLnZhbCgpXG4gICAgdmFyIHBhZ2VMb2FkRGVsYXkgPSB0aGlzLiQoJ2lucHV0W25hbWU9cGFnZUxvYWREZWxheV0nKS52YWwoKVxuXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICBzY3JhcGVTaXRlbWFwOiB0cnVlLFxuICAgICAgc2l0ZW1hcDogSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzaXRlbWFwKSksXG4gICAgICByZXF1ZXN0SW50ZXJ2YWw6IHJlcXVlc3RJbnRlcnZhbCxcbiAgICAgIHBhZ2VMb2FkRGVsYXk6IHBhZ2VMb2FkRGVsYXlcbiAgICB9XG5cblx0XHQvLyBzaG93IHNpdGVtYXAgc2NyYXBpbmcgcGFuZWxcbiAgICB0aGlzLmdldEZvcm1WYWxpZGF0b3IoKS5kZXN0cm95KClcbiAgICB0aGlzLiQoJy5zY3JhcGluZy1pbi1wcm9ncmVzcycpLnJlbW92ZUNsYXNzKCdoaWRlJylcbiAgICB0aGlzLiQoJyNzdWJtaXQtc2NyYXBlLXNpdGVtYXAnKS5jbG9zZXN0KCcuZm9ybS1ncm91cCcpLmhpZGUoKVxuICAgIHRoaXMuJCgnI3NjcmFwZS1zaXRlbWFwLWNvbmZpZyBpbnB1dCcpLnByb3AoJ2Rpc2FibGVkJywgdHJ1ZSlcblxuICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHJlcXVlc3QsIGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgdGhpcy5icm93c2VTaXRlbWFwRGF0YSgpXG4gICAgfS5iaW5kKHRoaXMpKVxuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICBzaXRlbWFwTGlzdEJyb3dzZVNpdGVtYXBEYXRhOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLiQoYnV0dG9uKS5jbG9zZXN0KCd0cicpLmRhdGEoJ3NpdGVtYXAnKVxuICAgIHRoaXMuc2V0U3RhdGVFZGl0U2l0ZW1hcChzaXRlbWFwKVxuICAgIHRoaXMuYnJvd3NlU2l0ZW1hcERhdGEoKVxuICB9LFxuICBicm93c2VTaXRlbWFwRGF0YTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2V0QWN0aXZlTmF2aWdhdGlvbkJ1dHRvbignc2l0ZW1hcC1icm93c2UnKVxuICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcFxuICAgIHRoaXMuc3RvcmUuZ2V0U2l0ZW1hcERhdGEoc2l0ZW1hcCwgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgIHZhciBkYXRhQ29sdW1ucyA9IHNpdGVtYXAuZ2V0RGF0YUNvbHVtbnMoKVxuXG4gICAgICB2YXIgZGF0YVBhbmVsID0gaWNoLlNpdGVtYXBCcm93c2VEYXRhKHtcbiAgICAgICAgY29sdW1uczogZGF0YUNvbHVtbnNcbiAgICAgIH0pXG4gICAgICB0aGlzLiQoJyN2aWV3cG9ydCcpLmh0bWwoZGF0YVBhbmVsKVxuXG5cdFx0XHQvLyBkaXNwbGF5IGRhdGFcblx0XHRcdC8vIERvaW5nIHRoaXMgdGhlIGxvbmcgd2F5IHNvIHRoZXJlIGFyZW4ndCB4c3MgdnVsbmVydWJpbGl0ZXNcblx0XHRcdC8vIHdoaWxlIHdvcmtpbmcgd2l0aCBkYXRhIG9yIHdpdGggdGhlIHNlbGVjdG9yIHRpdGxlc1xuICAgICAgdmFyICR0Ym9keSA9IHRoaXMuJCgnI3NpdGVtYXAtZGF0YSB0Ym9keScpXG4gICAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICAgIGRhdGEuZm9yRWFjaChmdW5jdGlvbiAocm93KSB7XG4gICAgICAgIHZhciAkdHIgPSBzZWxmLiQoJzx0cj48L3RyPicpXG4gICAgICAgIGRhdGFDb2x1bW5zLmZvckVhY2goZnVuY3Rpb24gKGNvbHVtbikge1xuICAgICAgICAgIHZhciAkdGQgPSBzZWxmLiQoJzx0ZD48L3RkPicpXG4gICAgICAgICAgdmFyIGNlbGxEYXRhID0gcm93W2NvbHVtbl1cbiAgICAgICAgICBpZiAodHlwZW9mIGNlbGxEYXRhID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgY2VsbERhdGEgPSBKU09OLnN0cmluZ2lmeShjZWxsRGF0YSlcbiAgICAgICAgICB9XG4gICAgICAgICAgJHRkLnRleHQoY2VsbERhdGEpXG4gICAgICAgICAgJHRyLmFwcGVuZCgkdGQpXG4gICAgICAgIH0pXG4gICAgICAgICR0Ym9keS5hcHBlbmQoJHRyKVxuICAgICAgfSlcbiAgICB9KVxuXG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBzaG93U2l0ZW1hcEV4cG9ydERhdGFDc3ZQYW5lbDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2V0QWN0aXZlTmF2aWdhdGlvbkJ1dHRvbignc2l0ZW1hcC1leHBvcnQtZGF0YS1jc3YnKVxuXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgdmFyIGV4cG9ydFBhbmVsID0gaWNoLlNpdGVtYXBFeHBvcnREYXRhQ1NWKHNpdGVtYXApXG4gICAgdGhpcy4kKCcjdmlld3BvcnQnKS5odG1sKGV4cG9ydFBhbmVsKVxuXG5cdFx0Ly8gZ2VuZXJhdGUgZGF0YVxuICAgIHRoaXMuJCgnLmRvd25sb2FkLWJ1dHRvbicpLmhpZGUoKVxuICAgIHRoaXMuc3RvcmUuZ2V0U2l0ZW1hcERhdGEoc2l0ZW1hcCwgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgIHZhciBibG9iID0gc2l0ZW1hcC5nZXREYXRhRXhwb3J0Q3N2QmxvYihkYXRhKVxuICAgICAgdGhpcy4kKCcuZG93bmxvYWQtYnV0dG9uIGEnKS5hdHRyKCdocmVmJywgd2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYikpXG4gICAgICB0aGlzLiQoJy5kb3dubG9hZC1idXR0b24gYScpLmF0dHIoJ2Rvd25sb2FkJywgc2l0ZW1hcC5faWQgKyAnLmNzdicpXG4gICAgICB0aGlzLiQoJy5kb3dubG9hZC1idXR0b24nKS5zaG93KClcbiAgICB9KVxuXG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBzZWxlY3RTZWxlY3RvcjogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIGlucHV0ID0gJChidXR0b24pLmNsb3Nlc3QoJy5mb3JtLWdyb3VwJykuZmluZCgnaW5wdXQuc2VsZWN0b3ItdmFsdWUnKVxuICAgIHZhciBzaXRlbWFwID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvclNpdGVtYXAoKVxuICAgIHZhciBzZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3IoKVxuICAgIHZhciBjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcyA9IHRoaXMuZ2V0Q3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMoKVxuICAgIHZhciBwYXJlbnRDU1NTZWxlY3RvciA9IHNpdGVtYXAuc2VsZWN0b3JzLmdldFBhcmVudENTU1NlbGVjdG9yV2l0aGluT25lUGFnZShjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcylcblxuICAgIHZhciBkZWZlcnJlZFNlbGVjdG9yID0gdGhpcy5jb250ZW50U2NyaXB0LnNlbGVjdFNlbGVjdG9yKHtcbiAgICAgIHBhcmVudENTU1NlbGVjdG9yOiBwYXJlbnRDU1NTZWxlY3RvcixcbiAgICAgIGFsbG93ZWRFbGVtZW50czogc2VsZWN0b3IuZ2V0SXRlbUNTU1NlbGVjdG9yKClcbiAgICB9LCB7JH0pXG5cbiAgICBkZWZlcnJlZFNlbGVjdG9yLmRvbmUoZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgJChpbnB1dCkudmFsKHJlc3VsdC5DU1NTZWxlY3RvcilcblxuXHRcdFx0Ly8gdXBkYXRlIHZhbGlkYXRpb24gZm9yIHNlbGVjdG9yIGZpZWxkXG4gICAgICB2YXIgdmFsaWRhdG9yID0gdGhpcy5nZXRGb3JtVmFsaWRhdG9yKClcbiAgICAgIHZhbGlkYXRvci5yZXZhbGlkYXRlRmllbGQoaW5wdXQpXG5cblx0XHRcdC8vIEBUT0RPIGhvdyBjb3VsZCB0aGlzIGJlIGVuY2Fwc3VsYXRlZD9cblx0XHRcdC8vIHVwZGF0ZSBoZWFkZXIgcm93LCBkYXRhIHJvdyBzZWxlY3RvcnMgYWZ0ZXIgc2VsZWN0aW5nIHRoZSB0YWJsZS4gc2VsZWN0b3JzIGFyZSB1cGRhdGVkIGJhc2VkIG9uIHRhYmxlc1xuXHRcdFx0Ly8gaW5uZXIgaHRtbFxuICAgICAgaWYgKHNlbGVjdG9yLnR5cGUgPT09ICdTZWxlY3RvclRhYmxlJykge1xuICAgICAgICB0aGlzLmdldFNlbGVjdG9ySFRNTCgpLmRvbmUoZnVuY3Rpb24gKGh0bWwpIHtcbiAgICAgICAgICB2YXIgdGFibGVIZWFkZXJSb3dTZWxlY3RvciA9IFNlbGVjdG9yVGFibGUuZ2V0VGFibGVIZWFkZXJSb3dTZWxlY3RvckZyb21UYWJsZUhUTUwoaHRtbCwgeyR9KVxuICAgICAgICAgIHZhciB0YWJsZURhdGFSb3dTZWxlY3RvciA9IFNlbGVjdG9yVGFibGUuZ2V0VGFibGVEYXRhUm93U2VsZWN0b3JGcm9tVGFibGVIVE1MKGh0bWwsIHskfSlcbiAgICAgICAgICAkKCdpbnB1dFtuYW1lPXRhYmxlSGVhZGVyUm93U2VsZWN0b3JdJykudmFsKHRhYmxlSGVhZGVyUm93U2VsZWN0b3IpXG4gICAgICAgICAgJCgnaW5wdXRbbmFtZT10YWJsZURhdGFSb3dTZWxlY3Rvcl0nKS52YWwodGFibGVEYXRhUm93U2VsZWN0b3IpXG5cbiAgICAgICAgICB2YXIgaGVhZGVyQ29sdW1ucyA9IFNlbGVjdG9yVGFibGUuZ2V0VGFibGVIZWFkZXJDb2x1bW5zRnJvbUhUTUwodGFibGVIZWFkZXJSb3dTZWxlY3RvciwgaHRtbCwgeyR9KVxuICAgICAgICAgIHRoaXMucmVuZGVyVGFibGVIZWFkZXJDb2x1bW5zKGhlYWRlckNvbHVtbnMpXG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG5cbiAgZ2V0Q3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcGFyZW50U2VsZWN0b3JJZHMgPSB0aGlzLnN0YXRlLmVkaXRTaXRlbWFwQnJlYWRjdW1ic1NlbGVjdG9ycy5tYXAoZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICByZXR1cm4gc2VsZWN0b3IuaWRcbiAgICB9KVxuXG4gICAgcmV0dXJuIHBhcmVudFNlbGVjdG9ySWRzXG4gIH0sXG5cbiAgc2VsZWN0VGFibGVIZWFkZXJSb3dTZWxlY3RvcjogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIGlucHV0ID0gJChidXR0b24pLmNsb3Nlc3QoJy5mb3JtLWdyb3VwJykuZmluZCgnaW5wdXQuc2VsZWN0b3ItdmFsdWUnKVxuICAgIHZhciBzaXRlbWFwID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvclNpdGVtYXAoKVxuICAgIHZhciBzZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3IoKVxuICAgIHZhciBjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcyA9IHRoaXMuZ2V0Q3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMoKVxuICAgIHZhciBwYXJlbnRDU1NTZWxlY3RvciA9IHNpdGVtYXAuc2VsZWN0b3JzLmdldENTU1NlbGVjdG9yV2l0aGluT25lUGFnZShzZWxlY3Rvci5pZCwgY3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMpXG5cbiAgICB2YXIgZGVmZXJyZWRTZWxlY3RvciA9IHRoaXMuY29udGVudFNjcmlwdC5zZWxlY3RTZWxlY3Rvcih7XG4gICAgICBwYXJlbnRDU1NTZWxlY3RvcjogcGFyZW50Q1NTU2VsZWN0b3IsXG4gICAgICBhbGxvd2VkRWxlbWVudHM6ICd0cidcbiAgICB9LCB7JH0pXG5cbiAgICBkZWZlcnJlZFNlbGVjdG9yLmRvbmUoZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgdmFyIHRhYmxlSGVhZGVyUm93U2VsZWN0b3IgPSByZXN1bHQuQ1NTU2VsZWN0b3JcbiAgICAgICQoaW5wdXQpLnZhbCh0YWJsZUhlYWRlclJvd1NlbGVjdG9yKVxuXG4gICAgICB0aGlzLmdldFNlbGVjdG9ySFRNTCgpLmRvbmUoZnVuY3Rpb24gKGh0bWwpIHtcbiAgICAgICAgdmFyIGhlYWRlckNvbHVtbnMgPSBTZWxlY3RvclRhYmxlLmdldFRhYmxlSGVhZGVyQ29sdW1uc0Zyb21IVE1MKHRhYmxlSGVhZGVyUm93U2VsZWN0b3IsIGh0bWwsIHskfSlcbiAgICAgICAgdGhpcy5yZW5kZXJUYWJsZUhlYWRlckNvbHVtbnMoaGVhZGVyQ29sdW1ucylcbiAgICAgIH0uYmluZCh0aGlzKSlcblxuXHRcdFx0Ly8gdXBkYXRlIHZhbGlkYXRpb24gZm9yIHNlbGVjdG9yIGZpZWxkXG4gICAgICB2YXIgdmFsaWRhdG9yID0gdGhpcy5nZXRGb3JtVmFsaWRhdG9yKClcbiAgICAgIHZhbGlkYXRvci5yZXZhbGlkYXRlRmllbGQoaW5wdXQpXG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuXG4gIHNlbGVjdFRhYmxlRGF0YVJvd1NlbGVjdG9yOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICB2YXIgaW5wdXQgPSB0aGlzLiQoYnV0dG9uKS5jbG9zZXN0KCcuZm9ybS1ncm91cCcpLmZpbmQoJ2lucHV0LnNlbGVjdG9yLXZhbHVlJylcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3JTaXRlbWFwKClcbiAgICB2YXIgc2VsZWN0b3IgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yKClcbiAgICB2YXIgY3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMgPSB0aGlzLmdldEN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzKClcbiAgICB2YXIgcGFyZW50Q1NTU2VsZWN0b3IgPSBzaXRlbWFwLnNlbGVjdG9ycy5nZXRDU1NTZWxlY3RvcldpdGhpbk9uZVBhZ2Uoc2VsZWN0b3IuaWQsIGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzKVxuXG4gICAgdmFyIGRlZmVycmVkU2VsZWN0b3IgPSB0aGlzLmNvbnRlbnRTY3JpcHQuc2VsZWN0U2VsZWN0b3Ioe1xuICAgICAgcGFyZW50Q1NTU2VsZWN0b3I6IHBhcmVudENTU1NlbGVjdG9yLFxuICAgICAgYWxsb3dlZEVsZW1lbnRzOiAndHInXG4gICAgfSwgeyR9KVxuXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgZGVmZXJyZWRTZWxlY3Rvci5kb25lKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgIHNlbGYuJChpbnB1dCkudmFsKHJlc3VsdC5DU1NTZWxlY3RvcilcblxuXHRcdFx0Ly8gdXBkYXRlIHZhbGlkYXRpb24gZm9yIHNlbGVjdG9yIGZpZWxkXG4gICAgICB2YXIgdmFsaWRhdG9yID0gdGhpcy5nZXRGb3JtVmFsaWRhdG9yKClcbiAgICAgIHZhbGlkYXRvci5yZXZhbGlkYXRlRmllbGQoaW5wdXQpXG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuXG5cdC8qKlxuXHQgKiB1cGRhdGUgdGFibGUgc2VsZWN0b3IgY29sdW1uIGVkaXRpbmcgZmllbGRzXG5cdCAqL1xuICByZW5kZXJUYWJsZUhlYWRlckNvbHVtbnM6IGZ1bmN0aW9uIChoZWFkZXJDb2x1bW5zKSB7XG5cdFx0Ly8gcmVzZXQgcHJldmlvdXMgY29sdW1uc1xuICAgIHZhciAkdGJvZHkgPSB0aGlzLiQoJy5mZWF0dXJlLWNvbHVtbnMgdGFibGUgdGJvZHknKVxuICAgICR0Ym9keS5odG1sKCcnKVxuICAgIGhlYWRlckNvbHVtbnMuZm9yRWFjaChmdW5jdGlvbiAoY29sdW1uKSB7XG4gICAgICB2YXIgJHJvdyA9IGljaC5TZWxlY3RvckVkaXRUYWJsZUNvbHVtbihjb2x1bW4pXG4gICAgICAkdGJvZHkuYXBwZW5kKCRyb3cpXG4gICAgfSlcbiAgfSxcblxuXHQvKipcblx0ICogUmV0dXJucyBIVE1MIHRoYXQgdGhlIGN1cnJlbnQgc2VsZWN0b3Igd291bGQgc2VsZWN0XG5cdCAqL1xuICBnZXRTZWxlY3RvckhUTUw6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIHZhciBzaXRlbWFwID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvclNpdGVtYXAoKVxuICAgIHZhciBzZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3IoKVxuICAgIHZhciBjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcyA9IHRoaXMuZ2V0Q3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMoKVxuICAgIHZhciBDU1NTZWxlY3RvciA9IHNpdGVtYXAuc2VsZWN0b3JzLmdldENTU1NlbGVjdG9yV2l0aGluT25lUGFnZShzZWxlY3Rvci5pZCwgY3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMpXG4gICAgdmFyIGRlZmVycmVkSFRNTCA9IHRoaXMuY29udGVudFNjcmlwdC5nZXRIVE1MKHtDU1NTZWxlY3RvcjogQ1NTU2VsZWN0b3J9LCB7JH0pXG5cbiAgICByZXR1cm4gZGVmZXJyZWRIVE1MXG4gIH0sXG4gIHByZXZpZXdTZWxlY3RvcjogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgaWYgKCEkKGJ1dHRvbikuaGFzQ2xhc3MoJ3ByZXZpZXcnKSkge1xuICAgICAgdmFyIHNpdGVtYXAgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yU2l0ZW1hcCgpXG4gICAgICB2YXIgc2VsZWN0b3IgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yKClcbiAgICAgIHZhciBjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcyA9IHRoaXMuZ2V0Q3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMoKVxuICAgICAgdmFyIHBhcmVudENTU1NlbGVjdG9yID0gc2l0ZW1hcC5zZWxlY3RvcnMuZ2V0UGFyZW50Q1NTU2VsZWN0b3JXaXRoaW5PbmVQYWdlKGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzKVxuICAgICAgdmFyIGRlZmVycmVkU2VsZWN0b3JQcmV2aWV3ID0gdGhpcy5jb250ZW50U2NyaXB0LnByZXZpZXdTZWxlY3Rvcih7XG4gICAgICAgIHBhcmVudENTU1NlbGVjdG9yOiBwYXJlbnRDU1NTZWxlY3RvcixcbiAgICAgICAgZWxlbWVudENTU1NlbGVjdG9yOiBzZWxlY3Rvci5zZWxlY3RvclxuICAgICAgfSwgeyR9KVxuXG4gICAgICBkZWZlcnJlZFNlbGVjdG9yUHJldmlldy5kb25lKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJChidXR0b24pLmFkZENsYXNzKCdwcmV2aWV3JylcbiAgICAgIH0pXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY29udGVudFNjcmlwdC5yZW1vdmVDdXJyZW50Q29udGVudFNlbGVjdG9yKClcbiAgICAgICQoYnV0dG9uKS5yZW1vdmVDbGFzcygncHJldmlldycpXG4gICAgfVxuICB9LFxuICBwcmV2aWV3Q2xpY2tFbGVtZW50U2VsZWN0b3I6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIGlmICghJChidXR0b24pLmhhc0NsYXNzKCdwcmV2aWV3JykpIHtcbiAgICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcFxuICAgICAgdmFyIHNlbGVjdG9yID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvcigpXG4gICAgICB2YXIgY3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMgPSB0aGlzLmdldEN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzKClcbiAgICAgIHZhciBwYXJlbnRDU1NTZWxlY3RvciA9IHNpdGVtYXAuc2VsZWN0b3JzLmdldFBhcmVudENTU1NlbGVjdG9yV2l0aGluT25lUGFnZShjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcylcblxuICAgICAgdmFyIGRlZmVycmVkU2VsZWN0b3JQcmV2aWV3ID0gdGhpcy5jb250ZW50U2NyaXB0LnByZXZpZXdTZWxlY3Rvcih7XG4gICAgICAgIHBhcmVudENTU1NlbGVjdG9yOiBwYXJlbnRDU1NTZWxlY3RvcixcbiAgICAgICAgZWxlbWVudENTU1NlbGVjdG9yOiBzZWxlY3Rvci5jbGlja0VsZW1lbnRTZWxlY3RvclxuICAgICAgfSwgeyR9KVxuXG4gICAgICBkZWZlcnJlZFNlbGVjdG9yUHJldmlldy5kb25lKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJChidXR0b24pLmFkZENsYXNzKCdwcmV2aWV3JylcbiAgICAgIH0pXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY29udGVudFNjcmlwdC5yZW1vdmVDdXJyZW50Q29udGVudFNlbGVjdG9yKClcbiAgICAgICQoYnV0dG9uKS5yZW1vdmVDbGFzcygncHJldmlldycpXG4gICAgfVxuICB9LFxuICBwcmV2aWV3VGFibGVSb3dTZWxlY3RvcjogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgaWYgKCEkKGJ1dHRvbikuaGFzQ2xhc3MoJ3ByZXZpZXcnKSkge1xuICAgICAgdmFyIHNpdGVtYXAgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yU2l0ZW1hcCgpXG4gICAgICB2YXIgc2VsZWN0b3IgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yKClcbiAgICAgIHZhciBjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcyA9IHRoaXMuZ2V0Q3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMoKVxuICAgICAgdmFyIHBhcmVudENTU1NlbGVjdG9yID0gc2l0ZW1hcC5zZWxlY3RvcnMuZ2V0Q1NTU2VsZWN0b3JXaXRoaW5PbmVQYWdlKHNlbGVjdG9yLmlkLCBjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcylcbiAgICAgIHZhciByb3dTZWxlY3RvciA9ICQoYnV0dG9uKS5jbG9zZXN0KCcuZm9ybS1ncm91cCcpLmZpbmQoJ2lucHV0JykudmFsKClcblxuICAgICAgdmFyIGRlZmVycmVkU2VsZWN0b3JQcmV2aWV3ID0gdGhpcy5jb250ZW50U2NyaXB0LnByZXZpZXdTZWxlY3Rvcih7XG4gICAgICAgIHBhcmVudENTU1NlbGVjdG9yOiBwYXJlbnRDU1NTZWxlY3RvcixcbiAgICAgICAgZWxlbWVudENTU1NlbGVjdG9yOiByb3dTZWxlY3RvclxuICAgICAgfSwgeyR9KVxuXG4gICAgICBkZWZlcnJlZFNlbGVjdG9yUHJldmlldy5kb25lKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJChidXR0b24pLmFkZENsYXNzKCdwcmV2aWV3JylcbiAgICAgIH0pXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY29udGVudFNjcmlwdC5yZW1vdmVDdXJyZW50Q29udGVudFNlbGVjdG9yKClcbiAgICAgICQoYnV0dG9uKS5yZW1vdmVDbGFzcygncHJldmlldycpXG4gICAgfVxuICB9LFxuICBwcmV2aWV3U2VsZWN0b3JGcm9tU2VsZWN0b3JUcmVlOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICBpZiAoISQoYnV0dG9uKS5oYXNDbGFzcygncHJldmlldycpKSB7XG4gICAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICAgIHZhciBzZWxlY3RvciA9ICQoYnV0dG9uKS5jbG9zZXN0KCd0cicpLmRhdGEoJ3NlbGVjdG9yJylcbiAgICAgIHZhciBjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcyA9IHRoaXMuZ2V0Q3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMoKVxuICAgICAgdmFyIHBhcmVudENTU1NlbGVjdG9yID0gc2l0ZW1hcC5zZWxlY3RvcnMuZ2V0UGFyZW50Q1NTU2VsZWN0b3JXaXRoaW5PbmVQYWdlKGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzKVxuICAgICAgdmFyIGRlZmVycmVkU2VsZWN0b3JQcmV2aWV3ID0gdGhpcy5jb250ZW50U2NyaXB0LnByZXZpZXdTZWxlY3Rvcih7XG4gICAgICAgIHBhcmVudENTU1NlbGVjdG9yOiBwYXJlbnRDU1NTZWxlY3RvcixcbiAgICAgICAgZWxlbWVudENTU1NlbGVjdG9yOiBzZWxlY3Rvci5zZWxlY3RvclxuICAgICAgfSwgeyR9KVxuXG4gICAgICBkZWZlcnJlZFNlbGVjdG9yUHJldmlldy5kb25lKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJChidXR0b24pLmFkZENsYXNzKCdwcmV2aWV3JylcbiAgICAgIH0pXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY29udGVudFNjcmlwdC5yZW1vdmVDdXJyZW50Q29udGVudFNlbGVjdG9yKClcbiAgICAgICQoYnV0dG9uKS5yZW1vdmVDbGFzcygncHJldmlldycpXG4gICAgfVxuICB9LFxuICBwcmV2aWV3U2VsZWN0b3JEYXRhRnJvbVNlbGVjdG9yVHJlZTogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcFxuICAgIHZhciBzZWxlY3RvciA9IHNlbGYuJChidXR0b24pLmNsb3Nlc3QoJ3RyJykuZGF0YSgnc2VsZWN0b3InKVxuICAgIHRoaXMucHJldmlld1NlbGVjdG9yRGF0YShzaXRlbWFwLCBzZWxlY3Rvci5pZClcbiAgfSxcbiAgcHJldmlld1NlbGVjdG9yRGF0YUZyb21TZWxlY3RvckVkaXRpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXAuY2xvbmUoKVxuICAgIHZhciBzZWxlY3RvciA9IHNpdGVtYXAuZ2V0U2VsZWN0b3JCeUlkKHRoaXMuc3RhdGUuY3VycmVudFNlbGVjdG9yLmlkKVxuICAgIHZhciBuZXdTZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3IoKVxuICAgIHNpdGVtYXAudXBkYXRlU2VsZWN0b3Ioc2VsZWN0b3IsIG5ld1NlbGVjdG9yKVxuICAgIHRoaXMucHJldmlld1NlbGVjdG9yRGF0YShzaXRlbWFwLCBuZXdTZWxlY3Rvci5pZClcbiAgfSxcblx0LyoqXG5cdCAqIFJldHVybnMgYSBsaXN0IG9mIHNlbGVjdG9yIGlkcyB0aGF0IHRoZSB1c2VyIGhhcyBvcGVuZWRcblx0ICogQHJldHVybnMge0FycmF5fVxuXHQgKi9cbiAgZ2V0U3RhdGVQYXJlbnRTZWxlY3RvcklkczogZnVuY3Rpb24gKCkge1xuICAgIHZhciBwYXJlbnRTZWxlY3RvcklkcyA9IFtdXG4gICAgdGhpcy5zdGF0ZS5lZGl0U2l0ZW1hcEJyZWFkY3VtYnNTZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgIHBhcmVudFNlbGVjdG9ySWRzLnB1c2goc2VsZWN0b3IuaWQpXG4gICAgfSlcbiAgICByZXR1cm4gcGFyZW50U2VsZWN0b3JJZHNcbiAgfSxcbiAgcHJldmlld1NlbGVjdG9yRGF0YTogZnVuY3Rpb24gKHNpdGVtYXAsIHNlbGVjdG9ySWQpIHtcblx0XHQvLyBkYXRhIHByZXZpZXcgd2lsbCBiZSBiYXNlIG9uIGhvdyB0aGUgc2VsZWN0b3IgdHJlZSBpcyBvcGVuZWRcbiAgICB2YXIgcGFyZW50U2VsZWN0b3JJZHMgPSB0aGlzLmdldFN0YXRlUGFyZW50U2VsZWN0b3JJZHMoKVxuXG4gICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICB2YXIgcmVxdWVzdCA9IHtcbiAgICAgIHByZXZpZXdTZWxlY3RvckRhdGE6IHRydWUsXG4gICAgICBzaXRlbWFwOiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHNpdGVtYXApKSxcbiAgICAgIHBhcmVudFNlbGVjdG9ySWRzOiBwYXJlbnRTZWxlY3RvcklkcyxcbiAgICAgIHNlbGVjdG9ySWQ6IHNlbGVjdG9ySWRcbiAgICB9XG4gICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UocmVxdWVzdCwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICBpZiAocmVzcG9uc2UubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIGRhdGFDb2x1bW5zID0gT2JqZWN0LmtleXMocmVzcG9uc2VbMF0pXG5cbiAgICAgIGNvbnNvbGUubG9nKGRhdGFDb2x1bW5zKVxuXG4gICAgICB2YXIgJGRhdGFQcmV2aWV3UGFuZWwgPSBpY2guRGF0YVByZXZpZXcoe1xuICAgICAgICBjb2x1bW5zOiBkYXRhQ29sdW1uc1xuICAgICAgfSlcbiAgICAgIHNlbGYuJCgnI3ZpZXdwb3J0JykuYXBwZW5kKCRkYXRhUHJldmlld1BhbmVsKVxuICAgICAgJGRhdGFQcmV2aWV3UGFuZWwubW9kYWwoJ3Nob3cnKVxuXHRcdFx0Ly8gZGlzcGxheSBkYXRhXG5cdFx0XHQvLyBEb2luZyB0aGlzIHRoZSBsb25nIHdheSBzbyB0aGVyZSBhcmVuJ3QgeHNzIHZ1bG5lcnViaWxpdGVzXG5cdFx0XHQvLyB3aGlsZSB3b3JraW5nIHdpdGggZGF0YSBvciB3aXRoIHRoZSBzZWxlY3RvciB0aXRsZXNcbiAgICAgIHZhciAkdGJvZHkgPSBzZWxmLiQoJ3Rib2R5JywgJGRhdGFQcmV2aWV3UGFuZWwpXG4gICAgICByZXNwb25zZS5mb3JFYWNoKGZ1bmN0aW9uIChyb3cpIHtcbiAgICAgICAgdmFyICR0ciA9IHNlbGYuJCgnPHRyPjwvdHI+JylcbiAgICAgICAgZGF0YUNvbHVtbnMuZm9yRWFjaChmdW5jdGlvbiAoY29sdW1uKSB7XG4gICAgICAgICAgdmFyICR0ZCA9IHNlbGYuJCgnPHRkPjwvdGQ+JylcbiAgICAgICAgICB2YXIgY2VsbERhdGEgPSByb3dbY29sdW1uXVxuICAgICAgICAgIGlmICh0eXBlb2YgY2VsbERhdGEgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBjZWxsRGF0YSA9IEpTT04uc3RyaW5naWZ5KGNlbGxEYXRhKVxuICAgICAgICAgIH1cbiAgICAgICAgICAkdGQudGV4dChjZWxsRGF0YSlcbiAgICAgICAgICAkdHIuYXBwZW5kKCR0ZClcbiAgICAgICAgfSlcbiAgICAgICAgJHRib2R5LmFwcGVuZCgkdHIpXG4gICAgICB9KVxuXG4gICAgICB2YXIgd2luZG93SGVpZ2h0ID0gc2VsZi4kKHdpbmRvdykuaGVpZ2h0KClcblxuICAgICAgc2VsZi4kKCcuZGF0YS1wcmV2aWV3LW1vZGFsIC5tb2RhbC1ib2R5JykuaGVpZ2h0KHdpbmRvd0hlaWdodCAtIDEzMClcblxuXHRcdFx0Ly8gcmVtb3ZlIG1vZGFsIGZyb20gZG9tIGFmdGVyIGl0IGlzIGNsb3NlZFxuICAgICAgJGRhdGFQcmV2aWV3UGFuZWwub24oJ2hpZGRlbi5icy5tb2RhbCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2VsZi4kKHRoaXMpLnJlbW92ZSgpXG4gICAgICB9KVxuICAgIH0pXG4gIH0sXG5cdC8qKlxuXHQgKiBBZGQgc3RhcnQgdXJsIHRvIHNpdGVtYXAgY3JlYXRpb24gb3IgZWRpdGluZyBmb3JtXG5cdCAqIEBwYXJhbSBidXR0b25cblx0ICovXG4gIGFkZFN0YXJ0VXJsOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdmFyICRzdGFydFVybElucHV0RmllbGQgPSBpY2guU2l0ZW1hcFN0YXJ0VXJsRmllbGQoKVxuICAgIHNlbGYuJCgnI3ZpZXdwb3J0IC5zdGFydC11cmwtYmxvY2s6bGFzdCcpLmFmdGVyKCRzdGFydFVybElucHV0RmllbGQpXG4gICAgdmFyIHZhbGlkYXRvciA9IHRoaXMuZ2V0Rm9ybVZhbGlkYXRvcigpXG4gICAgdmFsaWRhdG9yLmFkZEZpZWxkKCRzdGFydFVybElucHV0RmllbGQuZmluZCgnaW5wdXQnKSlcbiAgfSxcblx0LyoqXG5cdCAqIFJlbW92ZSBzdGFydCB1cmwgZnJvbSBzaXRlbWFwIGNyZWF0aW9uIG9yIGVkaXRpbmcgZm9ybS5cblx0ICogQHBhcmFtIGJ1dHRvblxuXHQgKi9cbiAgcmVtb3ZlU3RhcnRVcmw6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICB2YXIgJGJsb2NrID0gc2VsZi4kKGJ1dHRvbikuY2xvc2VzdCgnLnN0YXJ0LXVybC1ibG9jaycpXG4gICAgaWYgKHNlbGYuJCgnI3ZpZXdwb3J0IC5zdGFydC11cmwtYmxvY2snKS5sZW5ndGggPiAxKSB7XG5cdFx0XHQvLyByZW1vdmUgZnJvbSB2YWxpZGF0b3JcbiAgICAgIHZhciB2YWxpZGF0b3IgPSB0aGlzLmdldEZvcm1WYWxpZGF0b3IoKVxuICAgICAgdmFsaWRhdG9yLnJlbW92ZUZpZWxkKCRibG9jay5maW5kKCdpbnB1dCcpKVxuXG4gICAgICAkYmxvY2sucmVtb3ZlKClcbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTaXRlbWFwQ29udHJvbGxlclxuIiwiLyoqXG4gKiBFbGVtZW50IHNlbGVjdG9yLiBVc2VzIGpRdWVyeSBhcyBiYXNlIGFuZCBhZGRzIHNvbWUgbW9yZSBmZWF0dXJlc1xuICogQHBhcmFtIENTU1NlbGVjdG9yXG4gKiBAcGFyYW0gcGFyZW50RWxlbWVudFxuICogQHBhcmFtIG9wdGlvbnNcbiAqL1xudmFyIEVsZW1lbnRRdWVyeSA9IGZ1bmN0aW9uIChDU1NTZWxlY3RvciwgcGFyZW50RWxlbWVudCwgb3B0aW9ucykge1xuICBDU1NTZWxlY3RvciA9IENTU1NlbGVjdG9yIHx8ICcnXG4gIHRoaXMuJCA9IG9wdGlvbnMuJFxuICBpZiAoIXRoaXMuJCkgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIGpxdWVyeSBmb3IgRWxlbWVudFF1ZXJ5JylcbiAgdmFyIHNlbGVjdGVkRWxlbWVudHMgPSBbXVxuXG4gIHZhciBhZGRFbGVtZW50ID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICBpZiAoc2VsZWN0ZWRFbGVtZW50cy5pbmRleE9mKGVsZW1lbnQpID09PSAtMSkge1xuICAgICAgc2VsZWN0ZWRFbGVtZW50cy5wdXNoKGVsZW1lbnQpXG4gICAgfVxuICB9XG5cbiAgdmFyIHNlbGVjdG9yUGFydHMgPSBFbGVtZW50UXVlcnkuZ2V0U2VsZWN0b3JQYXJ0cyhDU1NTZWxlY3RvcilcbiAgdmFyIHNlbGYgPSB0aGlzXG4gIHNlbGVjdG9yUGFydHMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcblx0XHQvLyBoYW5kbGUgc3BlY2lhbCBjYXNlIHdoZW4gcGFyZW50IGlzIHNlbGVjdGVkXG4gICAgaWYgKHNlbGVjdG9yID09PSAnX3BhcmVudF8nKSB7XG4gICAgICBzZWxmLiQocGFyZW50RWxlbWVudCkuZWFjaChmdW5jdGlvbiAoaSwgZWxlbWVudCkge1xuICAgICAgICBhZGRFbGVtZW50KGVsZW1lbnQpXG4gICAgICB9KVxuICAgIH1cdFx0ZWxzZSB7XG4gICAgICB2YXIgZWxlbWVudHMgPSBzZWxmLiQoc2VsZWN0b3IsIHNlbGYuJChwYXJlbnRFbGVtZW50KSlcbiAgICAgIGVsZW1lbnRzLmVhY2goZnVuY3Rpb24gKGksIGVsZW1lbnQpIHtcbiAgICAgICAgYWRkRWxlbWVudChlbGVtZW50KVxuICAgICAgfSlcbiAgICB9XG4gIH0pXG5cbiAgcmV0dXJuIHNlbGVjdGVkRWxlbWVudHNcbn1cblxuRWxlbWVudFF1ZXJ5LmdldFNlbGVjdG9yUGFydHMgPSBmdW5jdGlvbiAoQ1NTU2VsZWN0b3IpIHtcbiAgdmFyIHNlbGVjdG9ycyA9IENTU1NlbGVjdG9yLnNwbGl0KC8oLHxcIi4qP1wifCcuKj8nfFxcKC4qP1xcKSkvKVxuXG4gIHZhciByZXN1bHRTZWxlY3RvcnMgPSBbXVxuICB2YXIgY3VycmVudFNlbGVjdG9yID0gJydcbiAgc2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgaWYgKHNlbGVjdG9yID09PSAnLCcpIHtcbiAgICAgIGlmIChjdXJyZW50U2VsZWN0b3IudHJpbSgpLmxlbmd0aCkge1xuICAgICAgICByZXN1bHRTZWxlY3RvcnMucHVzaChjdXJyZW50U2VsZWN0b3IudHJpbSgpKVxuICAgICAgfVxuICAgICAgY3VycmVudFNlbGVjdG9yID0gJydcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgY3VycmVudFNlbGVjdG9yICs9IHNlbGVjdG9yXG4gICAgfVxuICB9KVxuICBpZiAoY3VycmVudFNlbGVjdG9yLnRyaW0oKS5sZW5ndGgpIHtcbiAgICByZXN1bHRTZWxlY3RvcnMucHVzaChjdXJyZW50U2VsZWN0b3IudHJpbSgpKVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdFNlbGVjdG9yc1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEVsZW1lbnRRdWVyeVxuIiwidmFyIHNlbGVjdG9ycyA9IHJlcXVpcmUoJy4vU2VsZWN0b3JzJylcbnZhciBFbGVtZW50UXVlcnkgPSByZXF1aXJlKCcuL0VsZW1lbnRRdWVyeScpXG52YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcblxudmFyIFNlbGVjdG9yID0gZnVuY3Rpb24gKHNlbGVjdG9yLCBvcHRpb25zKSB7XG4gIHRoaXMuJCA9IG9wdGlvbnMuJFxuICBpZiAoIW9wdGlvbnMuJCkgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIGpxdWVyeScpXG5cbiAgdGhpcy51cGRhdGVEYXRhKHNlbGVjdG9yKVxuICB0aGlzLmluaXRUeXBlKClcbn1cblxuU2VsZWN0b3IucHJvdG90eXBlID0ge1xuXG5cdC8qKlxuXHQgKiBJcyB0aGlzIHNlbGVjdG9yIGNvbmZpZ3VyZWQgdG8gcmV0dXJuIG11bHRpcGxlIGl0ZW1zP1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICovXG4gIHdpbGxSZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5jYW5SZXR1cm5NdWx0aXBsZVJlY29yZHMoKSAmJiB0aGlzLm11bHRpcGxlXG4gIH0sXG5cblx0LyoqXG5cdCAqIFVwZGF0ZSBjdXJyZW50IHNlbGVjdG9yIGNvbmZpZ3VyYXRpb25cblx0ICogQHBhcmFtIGRhdGFcblx0ICovXG4gIHVwZGF0ZURhdGE6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdmFyIGFsbG93ZWRLZXlzID0gWydpZCcsICd0eXBlJywgJ3NlbGVjdG9yJywgJ3BhcmVudFNlbGVjdG9ycyddXG4gICAgY29uc29sZS5sb2coJ2RhdGEgdHlwZScsIGRhdGEudHlwZSlcbiAgICBhbGxvd2VkS2V5cyA9IGFsbG93ZWRLZXlzLmNvbmNhdChzZWxlY3RvcnNbZGF0YS50eXBlXS5nZXRGZWF0dXJlcygpKVxuICAgIHZhciBrZXlcblx0XHQvLyB1cGRhdGUgZGF0YVxuICAgIGZvciAoa2V5IGluIGRhdGEpIHtcbiAgICAgIGlmIChhbGxvd2VkS2V5cy5pbmRleE9mKGtleSkgIT09IC0xIHx8IHR5cGVvZiBkYXRhW2tleV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpc1trZXldID0gZGF0YVtrZXldXG4gICAgICB9XG4gICAgfVxuXG5cdFx0Ly8gcmVtb3ZlIHZhbHVlcyB0aGF0IGFyZSBub3QgbmVlZGVkIGZvciB0aGlzIHR5cGUgb2Ygc2VsZWN0b3JcbiAgICBmb3IgKGtleSBpbiB0aGlzKSB7XG4gICAgICBpZiAoYWxsb3dlZEtleXMuaW5kZXhPZihrZXkpID09PSAtMSAmJiB0eXBlb2YgdGhpc1trZXldICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzW2tleV1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cblx0LyoqXG5cdCAqIENTUyBzZWxlY3RvciB3aGljaCB3aWxsIGJlIHVzZWQgZm9yIGVsZW1lbnQgc2VsZWN0aW9uXG5cdCAqIEByZXR1cm5zIHtzdHJpbmd9XG5cdCAqL1xuICBnZXRJdGVtQ1NTU2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gJyonXG4gIH0sXG5cblx0LyoqXG5cdCAqIG92ZXJyaWRlIG9iamVjdHMgbWV0aG9kcyBiYXNlZCBvbiBzZWxldG9yIHR5cGVcblx0ICovXG4gIGluaXRUeXBlOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHNlbGVjdG9yc1t0aGlzLnR5cGVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignU2VsZWN0b3IgdHlwZSBub3QgZGVmaW5lZCAnICsgdGhpcy50eXBlKVxuICAgIH1cblxuXHRcdC8vIG92ZXJyaWRlcyBvYmplY3RzIG1ldGhvZHNcbiAgICBmb3IgKHZhciBpIGluIHNlbGVjdG9yc1t0aGlzLnR5cGVdKSB7XG4gICAgICB0aGlzW2ldID0gc2VsZWN0b3JzW3RoaXMudHlwZV1baV1cbiAgICB9XG4gIH0sXG5cblx0LyoqXG5cdCAqIENoZWNrIHdoZXRoZXIgYSBzZWxlY3RvciBpcyBhIHBhcmVuIHNlbGVjdG9yIG9mIHRoaXMgc2VsZWN0b3Jcblx0ICogQHBhcmFtIHNlbGVjdG9ySWRcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuICBoYXNQYXJlbnRTZWxlY3RvcjogZnVuY3Rpb24gKHNlbGVjdG9ySWQpIHtcbiAgICByZXR1cm4gKHRoaXMucGFyZW50U2VsZWN0b3JzLmluZGV4T2Yoc2VsZWN0b3JJZCkgIT09IC0xKVxuICB9LFxuXG4gIHJlbW92ZVBhcmVudFNlbGVjdG9yOiBmdW5jdGlvbiAoc2VsZWN0b3JJZCkge1xuICAgIHZhciBpbmRleCA9IHRoaXMucGFyZW50U2VsZWN0b3JzLmluZGV4T2Yoc2VsZWN0b3JJZClcbiAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICB0aGlzLnBhcmVudFNlbGVjdG9ycy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgfVxuICB9LFxuXG4gIHJlbmFtZVBhcmVudFNlbGVjdG9yOiBmdW5jdGlvbiAob3JpZ2luYWxJZCwgcmVwbGFjZW1lbnRJZCkge1xuICAgIGlmICh0aGlzLmhhc1BhcmVudFNlbGVjdG9yKG9yaWdpbmFsSWQpKSB7XG4gICAgICB2YXIgcG9zID0gdGhpcy5wYXJlbnRTZWxlY3RvcnMuaW5kZXhPZihvcmlnaW5hbElkKVxuICAgICAgdGhpcy5wYXJlbnRTZWxlY3RvcnMuc3BsaWNlKHBvcywgMSwgcmVwbGFjZW1lbnRJZClcbiAgICB9XG4gIH0sXG5cbiAgZ2V0RGF0YUVsZW1lbnRzOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIGVsZW1lbnRzID0gRWxlbWVudFF1ZXJ5KHRoaXMuc2VsZWN0b3IsIHBhcmVudEVsZW1lbnQsIHskfSlcbiAgICBpZiAodGhpcy5tdWx0aXBsZSkge1xuICAgICAgcmV0dXJuIGVsZW1lbnRzXG4gICAgfSBlbHNlIGlmIChlbGVtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gW2VsZW1lbnRzWzBdXVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gW11cbiAgICB9XG4gIH0sXG5cbiAgZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIHRpbWVvdXQgPSB0aGlzLmRlbGF5IHx8IDBcblxuXHRcdC8vIHRoaXMgd29ya3MgbXVjaCBmYXN0ZXIgYmVjYXVzZSB3aGVuQ2FsbFNlcXVlbnRhbGx5IGlzbid0IHJ1bm5pbmcgbmV4dCBkYXRhIGV4dHJhY3Rpb24gaW1tZWRpYXRlbHlcbiAgICBpZiAodGltZW91dCA9PT0gMCkge1xuICAgICAgdmFyIGRlZmVycmVkRGF0YSA9IHRoaXMuX2dldERhdGEocGFyZW50RWxlbWVudClcbiAgICAgIGRlZmVycmVkRGF0YS5kb25lKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIGQucmVzb2x2ZShkYXRhKVxuICAgICAgfSlcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkZWZlcnJlZERhdGEgPSB0aGlzLl9nZXREYXRhKHBhcmVudEVsZW1lbnQpXG4gICAgICAgIGRlZmVycmVkRGF0YS5kb25lKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgZC5yZXNvbHZlKGRhdGEpXG4gICAgICAgIH0pXG4gICAgICB9LmJpbmQodGhpcyksIHRpbWVvdXQpXG4gICAgfVxuXG4gICAgcmV0dXJuIGQucHJvbWlzZSgpXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvclxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG5cbnZhciBTZWxlY3RvckVsZW1lbnQgPSB7XG5cbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBkZmQgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcbiAgICBkZmQucmVzb2x2ZSh0aGlzLiQubWFrZUFycmF5KGVsZW1lbnRzKSlcblxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW11cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2RlbGF5J11cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yRWxlbWVudFxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgU2VsZWN0b3JFbGVtZW50QXR0cmlidXRlID0ge1xuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcblxuICAgIHZhciByZXN1bHQgPSBbXVxuICAgIHNlbGYuJChlbGVtZW50cykuZWFjaChmdW5jdGlvbiAoaywgZWxlbWVudCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuXG4gICAgICBkYXRhW3RoaXMuaWRdID0gc2VsZi4kKGVsZW1lbnQpLmF0dHIodGhpcy5leHRyYWN0QXR0cmlidXRlKVxuICAgICAgcmVzdWx0LnB1c2goZGF0YSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICBpZiAodGhpcy5tdWx0aXBsZSA9PT0gZmFsc2UgJiYgZWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICBkYXRhW3RoaXMuaWQgKyAnLXNyYyddID0gbnVsbFxuICAgICAgcmVzdWx0LnB1c2goZGF0YSlcbiAgICB9XG4gICAgZGZkLnJlc29sdmUocmVzdWx0KVxuXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbdGhpcy5pZF1cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2V4dHJhY3RBdHRyaWJ1dGUnLCAnZGVsYXknXVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JFbGVtZW50QXR0cmlidXRlXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciBVbmlxdWVFbGVtZW50TGlzdCA9IHJlcXVpcmUoJy4vLi4vVW5pcXVlRWxlbWVudExpc3QnKVxudmFyIEVsZW1lbnRRdWVyeSA9IHJlcXVpcmUoJy4vLi4vRWxlbWVudFF1ZXJ5JylcbnZhciBDc3NTZWxlY3RvciA9IHJlcXVpcmUoJ2Nzcy1zZWxlY3RvcicpLkNzc1NlbGVjdG9yXG52YXIgU2VsZWN0b3JFbGVtZW50Q2xpY2sgPSB7XG5cbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgZ2V0Q2xpY2tFbGVtZW50czogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIHZhciBjbGlja0VsZW1lbnRzID0gRWxlbWVudFF1ZXJ5KHRoaXMuY2xpY2tFbGVtZW50U2VsZWN0b3IsIHBhcmVudEVsZW1lbnQsIHskfSlcbiAgICByZXR1cm4gY2xpY2tFbGVtZW50c1xuICB9LFxuXG5cdC8qKlxuXHQgKiBDaGVjayB3aGV0aGVyIGVsZW1lbnQgaXMgc3RpbGwgcmVhY2hhYmxlIGZyb20gaHRtbC4gVXNlZnVsIHRvIGNoZWNrIHdoZXRoZXIgdGhlIGVsZW1lbnQgaXMgcmVtb3ZlZCBmcm9tIERPTS5cblx0ICogQHBhcmFtIGVsZW1lbnRcblx0ICovXG4gIGlzRWxlbWVudEluSFRNTDogZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICByZXR1cm4gdGhpcy4kKGVsZW1lbnQpLmNsb3Nlc3QoJ2h0bWwnKS5sZW5ndGggIT09IDBcbiAgfSxcblxuICB0cmlnZ2VyQnV0dG9uQ2xpY2s6IGZ1bmN0aW9uIChjbGlja0VsZW1lbnQpIHtcbiAgICB2YXIgY3MgPSBuZXcgQ3NzU2VsZWN0b3Ioe1xuICAgICAgZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yOiBmYWxzZSxcbiAgICAgIHBhcmVudDogdGhpcy4kKCdib2R5JylbMF0sXG4gICAgICBlbmFibGVSZXN1bHRTdHJpcHBpbmc6IGZhbHNlXG4gICAgfSlcbiAgICB2YXIgY3NzU2VsZWN0b3IgPSBjcy5nZXRDc3NTZWxlY3RvcihbY2xpY2tFbGVtZW50XSlcblxuXHRcdC8vIHRoaXMgZnVuY3Rpb24gd2lsbCBjYXRjaCB3aW5kb3cub3BlbiBjYWxsIGFuZCBwbGFjZSB0aGUgcmVxdWVzdGVkIHVybCBhcyB0aGUgZWxlbWVudHMgZGF0YSBhdHRyaWJ1dGVcbiAgICB2YXIgc2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0JylcbiAgICBzY3JpcHQudHlwZSA9ICd0ZXh0L2phdmFzY3JpcHQnXG4gICAgc2NyaXB0LnRleHQgPSAnJyArXG5cdFx0XHQnKGZ1bmN0aW9uKCl7ICcgK1xuXHRcdFx0XCJ2YXIgZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdcIiArIGNzc1NlbGVjdG9yICsgXCInKVswXTsgXCIgK1xuXHRcdFx0J2VsLmNsaWNrKCk7ICcgK1xuXHRcdFx0J30pKCk7J1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoc2NyaXB0KVxuICB9LFxuXG4gIGdldENsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuICd1bmlxdWVUZXh0J1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZVxuICAgIH1cbiAgfSxcblxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIHZhciBkZWxheSA9IHBhcnNlSW50KHRoaXMuZGVsYXkpIHx8IDBcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIGZvdW5kRWxlbWVudHMgPSBuZXcgVW5pcXVlRWxlbWVudExpc3QoJ3VuaXF1ZVRleHQnLCB7JH0pXG4gICAgdmFyIGNsaWNrRWxlbWVudHMgPSB0aGlzLmdldENsaWNrRWxlbWVudHMocGFyZW50RWxlbWVudClcbiAgICB2YXIgZG9uZUNsaWNraW5nRWxlbWVudHMgPSBuZXcgVW5pcXVlRWxlbWVudExpc3QodGhpcy5nZXRDbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSgpLCB7JH0pXG5cblx0XHQvLyBhZGQgZWxlbWVudHMgdGhhdCBhcmUgYXZhaWxhYmxlIGJlZm9yZSBjbGlja2luZ1xuICAgIHZhciBlbGVtZW50cyA9IHRoaXMuZ2V0RGF0YUVsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG4gICAgZWxlbWVudHMuZm9yRWFjaChmb3VuZEVsZW1lbnRzLnB1c2guYmluZChmb3VuZEVsZW1lbnRzKSlcblxuXHRcdC8vIGRpc2NhcmQgaW5pdGlhbCBlbGVtZW50c1xuICAgIGlmICh0aGlzLmRpc2NhcmRJbml0aWFsRWxlbWVudHMpIHtcbiAgICAgIGZvdW5kRWxlbWVudHMgPSBuZXcgVW5pcXVlRWxlbWVudExpc3QoJ3VuaXF1ZVRleHQnLCB7JH0pXG4gICAgfVxuXG5cdFx0Ly8gbm8gZWxlbWVudHMgdG8gY2xpY2sgYXQgdGhlIGJlZ2lubmluZ1xuICAgIGlmIChjbGlja0VsZW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKGZvdW5kRWxlbWVudHMpXG4gICAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZS5wcm9taXNlKClcbiAgICB9XG5cblx0XHQvLyBpbml0aWFsIGNsaWNrIGFuZCB3YWl0XG4gICAgdmFyIGN1cnJlbnRDbGlja0VsZW1lbnQgPSBjbGlja0VsZW1lbnRzWzBdXG4gICAgdGhpcy50cmlnZ2VyQnV0dG9uQ2xpY2soY3VycmVudENsaWNrRWxlbWVudClcbiAgICB2YXIgbmV4dEVsZW1lbnRTZWxlY3Rpb24gPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpICsgZGVsYXlcblxuXHRcdC8vIGluZmluaXRlbHkgc2Nyb2xsIGRvd24gYW5kIGZpbmQgYWxsIGl0ZW1zXG4gICAgdmFyIGludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuXHRcdFx0Ly8gZmluZCB0aG9zZSBjbGljayBlbGVtZW50cyB0aGF0IGFyZSBub3QgaW4gdGhlIGJsYWNrIGxpc3RcbiAgICAgIHZhciBhbGxDbGlja0VsZW1lbnRzID0gdGhpcy5nZXRDbGlja0VsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG4gICAgICBjbGlja0VsZW1lbnRzID0gW11cbiAgICAgIGFsbENsaWNrRWxlbWVudHMuZm9yRWFjaChmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICBpZiAoIWRvbmVDbGlja2luZ0VsZW1lbnRzLmlzQWRkZWQoZWxlbWVudCkpIHtcbiAgICAgICAgICBjbGlja0VsZW1lbnRzLnB1c2goZWxlbWVudClcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgdmFyIG5vdyA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKClcblx0XHRcdC8vIHNsZWVwLiB3YWl0IHdoZW4gdG8gZXh0cmFjdCBuZXh0IGVsZW1lbnRzXG4gICAgICBpZiAobm93IDwgbmV4dEVsZW1lbnRTZWxlY3Rpb24pIHtcblx0XHRcdFx0Ly8gY29uc29sZS5sb2coXCJ3YWl0XCIpO1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuXHRcdFx0Ly8gYWRkIG5ld2x5IGZvdW5kIGVsZW1lbnRzIHRvIGVsZW1lbnQgZm91bmRFbGVtZW50cyBhcnJheS5cbiAgICAgIHZhciBlbGVtZW50cyA9IHRoaXMuZ2V0RGF0YUVsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG4gICAgICB2YXIgYWRkZWRBbkVsZW1lbnQgPSBmYWxzZVxuICAgICAgZWxlbWVudHMuZm9yRWFjaChmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICB2YXIgYWRkZWQgPSBmb3VuZEVsZW1lbnRzLnB1c2goZWxlbWVudClcbiAgICAgICAgaWYgKGFkZGVkKSB7XG4gICAgICAgICAgYWRkZWRBbkVsZW1lbnQgPSB0cnVlXG4gICAgICAgIH1cbiAgICAgIH0pXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhcImFkZGVkXCIsIGFkZGVkQW5FbGVtZW50KTtcblxuXHRcdFx0Ly8gbm8gbmV3IGVsZW1lbnRzIGZvdW5kLiBTdG9wIGNsaWNraW5nIHRoaXMgYnV0dG9uXG4gICAgICBpZiAoIWFkZGVkQW5FbGVtZW50KSB7XG4gICAgICAgIGRvbmVDbGlja2luZ0VsZW1lbnRzLnB1c2goY3VycmVudENsaWNrRWxlbWVudClcbiAgICAgIH1cblxuXHRcdFx0Ly8gY29udGludWUgY2xpY2tpbmcgYW5kIGFkZCBkZWxheSwgYnV0IGlmIHRoZXJlIGlzIG5vdGhpbmdcblx0XHRcdC8vIG1vcmUgdG8gY2xpY2sgdGhlIGZpbmlzaFxuXHRcdFx0Ly8gY29uc29sZS5sb2coXCJ0b3RhbCBidXR0b25zXCIsIGNsaWNrRWxlbWVudHMubGVuZ3RoKVxuICAgICAgaWYgKGNsaWNrRWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpXG4gICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZShmb3VuZEVsZW1lbnRzKVxuICAgICAgfSBlbHNlIHtcblx0XHRcdFx0Ly8gY29uc29sZS5sb2coXCJjbGlja1wiKTtcbiAgICAgICAgY3VycmVudENsaWNrRWxlbWVudCA9IGNsaWNrRWxlbWVudHNbMF1cblx0XHRcdFx0Ly8gY2xpY2sgb24gZWxlbWVudHMgb25seSBvbmNlIGlmIHRoZSB0eXBlIGlzIGNsaWNrb25jZVxuICAgICAgICBpZiAodGhpcy5jbGlja1R5cGUgPT09ICdjbGlja09uY2UnKSB7XG4gICAgICAgICAgZG9uZUNsaWNraW5nRWxlbWVudHMucHVzaChjdXJyZW50Q2xpY2tFbGVtZW50KVxuICAgICAgICB9XG4gICAgICAgIHRoaXMudHJpZ2dlckJ1dHRvbkNsaWNrKGN1cnJlbnRDbGlja0VsZW1lbnQpXG4gICAgICAgIG5leHRFbGVtZW50U2VsZWN0aW9uID0gbm93ICsgZGVsYXlcbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcyksIDUwKVxuXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW11cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2RlbGF5JywgJ2NsaWNrRWxlbWVudFNlbGVjdG9yJywgJ2NsaWNrVHlwZScsICdkaXNjYXJkSW5pdGlhbEVsZW1lbnRzJywgJ2NsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlJ11cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yRWxlbWVudENsaWNrXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciBTZWxlY3RvckVsZW1lbnRTY3JvbGwgPSB7XG5cbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG4gIHNjcm9sbFRvQm90dG9tOiBmdW5jdGlvbiAoKSB7XG4gICAgd2luZG93LnNjcm9sbFRvKDAsIGRvY3VtZW50LmJvZHkuc2Nyb2xsSGVpZ2h0KVxuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZGVsYXkgPSBwYXJzZUludCh0aGlzLmRlbGF5KSB8fCAwXG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciBmb3VuZEVsZW1lbnRzID0gW11cblxuXHRcdC8vIGluaXRpYWxseSBzY3JvbGwgZG93biBhbmQgd2FpdFxuICAgIHRoaXMuc2Nyb2xsVG9Cb3R0b20oKVxuICAgIHZhciBuZXh0RWxlbWVudFNlbGVjdGlvbiA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCkgKyBkZWxheVxuXG5cdFx0Ly8gaW5maW5pdGVseSBzY3JvbGwgZG93biBhbmQgZmluZCBhbGwgaXRlbXNcbiAgICB2YXIgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgbm93ID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKVxuXHRcdFx0Ly8gc2xlZXAuIHdhaXQgd2hlbiB0byBleHRyYWN0IG5leHQgZWxlbWVudHNcbiAgICAgIGlmIChub3cgPCBuZXh0RWxlbWVudFNlbGVjdGlvbikge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcblx0XHRcdC8vIG5vIG5ldyBlbGVtZW50cyBmb3VuZFxuICAgICAgaWYgKGVsZW1lbnRzLmxlbmd0aCA9PT0gZm91bmRFbGVtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbClcbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKHRoaXMuJC5tYWtlQXJyYXkoZWxlbWVudHMpKVxuICAgICAgfSBlbHNlIHtcblx0XHRcdFx0Ly8gY29udGludWUgc2Nyb2xsaW5nIGFuZCBhZGQgZGVsYXlcbiAgICAgICAgZm91bmRFbGVtZW50cyA9IGVsZW1lbnRzXG4gICAgICAgIHRoaXMuc2Nyb2xsVG9Cb3R0b20oKVxuICAgICAgICBuZXh0RWxlbWVudFNlbGVjdGlvbiA9IG5vdyArIGRlbGF5XG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpLCA1MClcblxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFtdXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydtdWx0aXBsZScsICdkZWxheSddXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvckVsZW1lbnRTY3JvbGxcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxudmFyIFNlbGVjdG9yR3JvdXAgPSB7XG5cbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuSGF2ZUNoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZGZkID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgc2VsZiA9IHRoaXNcblx0XHQvLyBjYW5ub3QgcmV1c2UgdGhpcy5nZXREYXRhRWxlbWVudHMgYmVjYXVzZSBpdCBkZXBlbmRzIG9uICptdWx0aXBsZSogcHJvcGVydHlcbiAgICB2YXIgZWxlbWVudHMgPSBzZWxmLiQodGhpcy5zZWxlY3RvciwgcGFyZW50RWxlbWVudClcblxuICAgIHZhciByZWNvcmRzID0gW11cbiAgICBzZWxmLiQoZWxlbWVudHMpLmVhY2goZnVuY3Rpb24gKGssIGVsZW1lbnQpIHtcbiAgICAgIHZhciBkYXRhID0ge31cblxuICAgICAgZGF0YVt0aGlzLmlkXSA9IHNlbGYuJChlbGVtZW50KS50ZXh0KClcblxuICAgICAgaWYgKHRoaXMuZXh0cmFjdEF0dHJpYnV0ZSkge1xuICAgICAgICBkYXRhW3RoaXMuaWQgKyAnLScgKyB0aGlzLmV4dHJhY3RBdHRyaWJ1dGVdID0gc2VsZi4kKGVsZW1lbnQpLmF0dHIodGhpcy5leHRyYWN0QXR0cmlidXRlKVxuICAgICAgfVxuXG4gICAgICByZWNvcmRzLnB1c2goZGF0YSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICB2YXIgcmVzdWx0ID0ge31cbiAgICByZXN1bHRbdGhpcy5pZF0gPSByZWNvcmRzXG5cbiAgICBkZmQucmVzb2x2ZShbcmVzdWx0XSlcbiAgICByZXR1cm4gZGZkLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFt0aGlzLmlkXVxuICB9LFxuXG4gIGdldEZlYXR1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFsnZGVsYXknLCAnZXh0cmFjdEF0dHJpYnV0ZSddXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3Rvckdyb3VwXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciBTZWxlY3RvckhUTUwgPSB7XG5cbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5IYXZlTG9jYWxDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkNyZWF0ZU5ld0pvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBkZmQgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIHZhciBlbGVtZW50cyA9IHRoaXMuZ2V0RGF0YUVsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG5cbiAgICB2YXIgcmVzdWx0ID0gW11cbiAgICBzZWxmLiQoZWxlbWVudHMpLmVhY2goZnVuY3Rpb24gKGssIGVsZW1lbnQpIHtcbiAgICAgIHZhciBkYXRhID0ge31cbiAgICAgIHZhciBodG1sID0gc2VsZi4kKGVsZW1lbnQpLmh0bWwoKVxuXG4gICAgICBpZiAodGhpcy5yZWdleCAhPT0gdW5kZWZpbmVkICYmIHRoaXMucmVnZXgubGVuZ3RoKSB7XG4gICAgICAgIHZhciBtYXRjaGVzID0gaHRtbC5tYXRjaChuZXcgUmVnRXhwKHRoaXMucmVnZXgpKVxuICAgICAgICBpZiAobWF0Y2hlcyAhPT0gbnVsbCkge1xuICAgICAgICAgIGh0bWwgPSBtYXRjaGVzWzBdXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaHRtbCA9IG51bGxcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZGF0YVt0aGlzLmlkXSA9IGh0bWxcblxuICAgICAgcmVzdWx0LnB1c2goZGF0YSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICBpZiAodGhpcy5tdWx0aXBsZSA9PT0gZmFsc2UgJiYgZWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICBkYXRhW3RoaXMuaWRdID0gbnVsbFxuICAgICAgcmVzdWx0LnB1c2goZGF0YSlcbiAgICB9XG5cbiAgICBkZmQucmVzb2x2ZShyZXN1bHQpXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbdGhpcy5pZF1cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ3JlZ2V4JywgJ2RlbGF5J11cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9ySFRNTFxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgd2hlbkNhbGxTZXF1ZW50aWFsbHkgPSByZXF1aXJlKCcuLi8uLi9hc3NldHMvanF1ZXJ5LndoZW5jYWxsc2VxdWVudGlhbGx5JylcbnZhciBCYXNlNjQgPSByZXF1aXJlKCcuLi8uLi9hc3NldHMvYmFzZTY0JylcbnZhciBTZWxlY3RvckltYWdlID0ge1xuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuXG4gICAgdmFyIGRlZmVycmVkRGF0YUNhbGxzID0gW11cbiAgICB0aGlzLiQoZWxlbWVudHMpLmVhY2goZnVuY3Rpb24gKGksIGVsZW1lbnQpIHtcbiAgICAgIGRlZmVycmVkRGF0YUNhbGxzLnB1c2goZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZGVmZXJyZWREYXRhID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICAgICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICAgIGRhdGFbdGhpcy5pZCArICctc3JjJ10gPSBlbGVtZW50LnNyY1xuXG5cdFx0XHRcdC8vIGRvd25sb2FkIGltYWdlIGlmIHJlcXVpcmVkXG4gICAgICAgIGlmICghdGhpcy5kb3dubG9hZEltYWdlKSB7XG4gICAgICAgICAgZGVmZXJyZWREYXRhLnJlc29sdmUoZGF0YSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgZGVmZXJyZWRJbWFnZUJhc2U2NCA9IHRoaXMuZG93bmxvYWRJbWFnZUJhc2U2NChlbGVtZW50LnNyYylcblxuICAgICAgICAgIGRlZmVycmVkSW1hZ2VCYXNlNjQuZG9uZShmdW5jdGlvbiAoaW1hZ2VSZXNwb25zZSkge1xuICAgICAgICAgICAgZGF0YVsnX2ltYWdlQmFzZTY0LScgKyB0aGlzLmlkXSA9IGltYWdlUmVzcG9uc2UuaW1hZ2VCYXNlNjRcbiAgICAgICAgICAgIGRhdGFbJ19pbWFnZU1pbWVUeXBlLScgKyB0aGlzLmlkXSA9IGltYWdlUmVzcG9uc2UubWltZVR5cGVcblxuICAgICAgICAgICAgZGVmZXJyZWREYXRhLnJlc29sdmUoZGF0YSlcbiAgICAgICAgICB9LmJpbmQodGhpcykpLmZhaWwoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0Ly8gZmFpbGVkIHRvIGRvd25sb2FkIGltYWdlIGNvbnRpbnVlLlxuXHRcdFx0XHRcdFx0Ly8gQFRPRE8gaGFuZGxlIGVycnJvclxuICAgICAgICAgICAgZGVmZXJyZWREYXRhLnJlc29sdmUoZGF0YSlcbiAgICAgICAgICB9KVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGRlZmVycmVkRGF0YS5wcm9taXNlKClcbiAgICAgIH0uYmluZCh0aGlzKSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICB3aGVuQ2FsbFNlcXVlbnRpYWxseShkZWZlcnJlZERhdGFDYWxscykuZG9uZShmdW5jdGlvbiAoZGF0YVJlc3VsdHMpIHtcbiAgICAgIGlmICh0aGlzLm11bHRpcGxlID09PSBmYWxzZSAmJiBlbGVtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdmFyIGRhdGEgPSB7fVxuICAgICAgICBkYXRhW3RoaXMuaWQgKyAnLXNyYyddID0gbnVsbFxuICAgICAgICBkYXRhUmVzdWx0cy5wdXNoKGRhdGEpXG4gICAgICB9XG5cbiAgICAgIGRmZC5yZXNvbHZlKGRhdGFSZXN1bHRzKVxuICAgIH0pXG5cbiAgICByZXR1cm4gZGZkLnByb21pc2UoKVxuICB9LFxuXG4gIGRvd25sb2FkRmlsZUFzQmxvYjogZnVuY3Rpb24gKHVybCkge1xuICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KClcbiAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHRoaXMucmVhZHlTdGF0ZSA9PSA0KSB7XG4gICAgICAgIGlmICh0aGlzLnN0YXR1cyA9PSAyMDApIHtcbiAgICAgICAgICB2YXIgYmxvYiA9IHRoaXMucmVzcG9uc2VcbiAgICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUoYmxvYilcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlamVjdCh4aHIuc3RhdHVzVGV4dClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICB4aHIub3BlbignR0VUJywgdXJsKVxuICAgIHhoci5yZXNwb25zZVR5cGUgPSAnYmxvYidcbiAgICB4aHIuc2VuZCgpXG5cbiAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZS5wcm9taXNlKClcbiAgfSxcblxuICBkb3dubG9hZEltYWdlQmFzZTY0OiBmdW5jdGlvbiAodXJsKSB7XG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciBkZWZlcnJlZERvd25sb2FkID0gdGhpcy5kb3dubG9hZEZpbGVBc0Jsb2IodXJsKVxuICAgIGRlZmVycmVkRG93bmxvYWQuZG9uZShmdW5jdGlvbiAoYmxvYikge1xuICAgICAgdmFyIG1pbWVUeXBlID0gYmxvYi50eXBlXG4gICAgICB2YXIgZGVmZXJyZWRCbG9iID0gQmFzZTY0LmJsb2JUb0Jhc2U2NChibG9iKVxuICAgICAgZGVmZXJyZWRCbG9iLmRvbmUoZnVuY3Rpb24gKGltYWdlQmFzZTY0KSB7XG4gICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZSh7XG4gICAgICAgICAgbWltZVR5cGU6IG1pbWVUeXBlLFxuICAgICAgICAgIGltYWdlQmFzZTY0OiBpbWFnZUJhc2U2NFxuICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9KS5mYWlsKGRlZmVycmVkUmVzcG9uc2UuZmFpbClcbiAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZS5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbdGhpcy5pZCArICctc3JjJ11cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2RlbGF5JywgJ2Rvd25sb2FkSW1hZ2UnXVxuICB9LFxuXG4gIGdldEl0ZW1DU1NTZWxlY3RvcjogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAnaW1nJ1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JJbWFnZVxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgd2hlbkNhbGxTZXF1ZW50aWFsbHkgPSByZXF1aXJlKCcuLi8uLi9hc3NldHMvanF1ZXJ5LndoZW5jYWxsc2VxdWVudGlhbGx5JylcblxudmFyIFNlbGVjdG9yTGluayA9IHtcbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuICAgIHZhciBzZWxmID0gdGhpc1xuXG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cblx0XHQvLyByZXR1cm4gZW1wdHkgcmVjb3JkIGlmIG5vdCBtdWx0aXBsZSB0eXBlIGFuZCBubyBlbGVtZW50cyBmb3VuZFxuICAgIGlmICh0aGlzLm11bHRpcGxlID09PSBmYWxzZSAmJiBlbGVtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHZhciBkYXRhID0ge31cbiAgICAgIGRhdGFbdGhpcy5pZF0gPSBudWxsXG4gICAgICBkZmQucmVzb2x2ZShbZGF0YV0pXG4gICAgICByZXR1cm4gZGZkXG4gICAgfVxuXG5cdFx0Ly8gZXh0cmFjdCBsaW5rcyBvbmUgYnkgb25lXG4gICAgdmFyIGRlZmVycmVkRGF0YUV4dHJhY3Rpb25DYWxscyA9IFtdXG4gICAgc2VsZi4kKGVsZW1lbnRzKS5lYWNoKGZ1bmN0aW9uIChrLCBlbGVtZW50KSB7XG4gICAgICBkZWZlcnJlZERhdGFFeHRyYWN0aW9uQ2FsbHMucHVzaChmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICB2YXIgZGVmZXJyZWREYXRhID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICAgICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICAgIGRhdGFbdGhpcy5pZF0gPSBzZWxmLiQoZWxlbWVudCkudGV4dCgpXG4gICAgICAgIGRhdGEuX2ZvbGxvd1NlbGVjdG9ySWQgPSB0aGlzLmlkXG4gICAgICAgIGRhdGFbdGhpcy5pZCArICctaHJlZiddID0gZWxlbWVudC5ocmVmXG4gICAgICAgIGRhdGEuX2ZvbGxvdyA9IGVsZW1lbnQuaHJlZlxuICAgICAgICBkZWZlcnJlZERhdGEucmVzb2x2ZShkYXRhKVxuXG4gICAgICAgIHJldHVybiBkZWZlcnJlZERhdGFcbiAgICAgIH0uYmluZCh0aGlzLCBlbGVtZW50KSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICB3aGVuQ2FsbFNlcXVlbnRpYWxseShkZWZlcnJlZERhdGFFeHRyYWN0aW9uQ2FsbHMpLmRvbmUoZnVuY3Rpb24gKHJlc3BvbnNlcykge1xuICAgICAgdmFyIHJlc3VsdCA9IFtdXG4gICAgICByZXNwb25zZXMuZm9yRWFjaChmdW5jdGlvbiAoZGF0YVJlc3VsdCkge1xuICAgICAgICByZXN1bHQucHVzaChkYXRhUmVzdWx0KVxuICAgICAgfSlcbiAgICAgIGRmZC5yZXNvbHZlKHJlc3VsdClcbiAgICB9KVxuXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbdGhpcy5pZCwgdGhpcy5pZCArICctaHJlZiddXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydtdWx0aXBsZScsICdkZWxheSddXG4gIH0sXG5cbiAgZ2V0SXRlbUNTU1NlbGVjdG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICdhJ1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JMaW5rXG4iLCJ2YXIgd2hlbkNhbGxTZXF1ZW50aWFsbHkgPSByZXF1aXJlKCcuLi8uLi9hc3NldHMvanF1ZXJ5LndoZW5jYWxsc2VxdWVudGlhbGx5JylcbnZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxudmFyIENzc1NlbGVjdG9yID0gcmVxdWlyZSgnY3NzLXNlbGVjdG9yJykuQ3NzU2VsZWN0b3JcbnZhciBTZWxlY3RvclBvcHVwTGluayA9IHtcbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIHZhciBlbGVtZW50cyA9IHRoaXMuZ2V0RGF0YUVsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG5cbiAgICB2YXIgZGZkID0ganF1ZXJ5LkRlZmVycmVkKClcblxuXHRcdC8vIHJldHVybiBlbXB0eSByZWNvcmQgaWYgbm90IG11bHRpcGxlIHR5cGUgYW5kIG5vIGVsZW1lbnRzIGZvdW5kXG4gICAgaWYgKHRoaXMubXVsdGlwbGUgPT09IGZhbHNlICYmIGVsZW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuICAgICAgZGF0YVt0aGlzLmlkXSA9IG51bGxcbiAgICAgIGRmZC5yZXNvbHZlKFtkYXRhXSlcbiAgICAgIHJldHVybiBkZmRcbiAgICB9XG5cblx0XHQvLyBleHRyYWN0IGxpbmtzIG9uZSBieSBvbmVcbiAgICB2YXIgZGVmZXJyZWREYXRhRXh0cmFjdGlvbkNhbGxzID0gW11cbiAgICAkKGVsZW1lbnRzKS5lYWNoKGZ1bmN0aW9uIChrLCBlbGVtZW50KSB7XG4gICAgICBkZWZlcnJlZERhdGFFeHRyYWN0aW9uQ2FsbHMucHVzaChmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICB2YXIgZGVmZXJyZWREYXRhID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICAgICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICAgIGRhdGFbdGhpcy5pZF0gPSAkKGVsZW1lbnQpLnRleHQoKVxuICAgICAgICBkYXRhLl9mb2xsb3dTZWxlY3RvcklkID0gdGhpcy5pZFxuXG4gICAgICAgIHZhciBkZWZlcnJlZFBvcHVwVVJMID0gdGhpcy5nZXRQb3B1cFVSTChlbGVtZW50KVxuICAgICAgICBkZWZlcnJlZFBvcHVwVVJMLmRvbmUoZnVuY3Rpb24gKHVybCkge1xuICAgICAgICAgIGRhdGFbdGhpcy5pZCArICctaHJlZiddID0gdXJsXG4gICAgICAgICAgZGF0YS5fZm9sbG93ID0gdXJsXG4gICAgICAgICAgZGVmZXJyZWREYXRhLnJlc29sdmUoZGF0YSlcbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgICAgIHJldHVybiBkZWZlcnJlZERhdGFcbiAgICAgIH0uYmluZCh0aGlzLCBlbGVtZW50KSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICB3aGVuQ2FsbFNlcXVlbnRpYWxseShkZWZlcnJlZERhdGFFeHRyYWN0aW9uQ2FsbHMpLmRvbmUoZnVuY3Rpb24gKHJlc3BvbnNlcykge1xuICAgICAgdmFyIHJlc3VsdCA9IFtdXG4gICAgICByZXNwb25zZXMuZm9yRWFjaChmdW5jdGlvbiAoZGF0YVJlc3VsdCkge1xuICAgICAgICByZXN1bHQucHVzaChkYXRhUmVzdWx0KVxuICAgICAgfSlcbiAgICAgIGRmZC5yZXNvbHZlKHJlc3VsdClcbiAgICB9KVxuXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcbiAgfSxcblxuXHQvKipcblx0ICogR2V0cyBhbiB1cmwgZnJvbSBhIHdpbmRvdy5vcGVuIGNhbGwgYnkgbW9ja2luZyB0aGUgd2luZG93Lm9wZW4gZnVuY3Rpb25cblx0ICogQHBhcmFtIGVsZW1lbnRcblx0ICogQHJldHVybnMgJC5EZWZlcnJlZCgpXG5cdCAqL1xuICBnZXRQb3B1cFVSTDogZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIC8vIG92ZXJyaWRlIHdpbmRvdy5vcGVuIGZ1bmN0aW9uLiB3ZSBuZWVkIHRvIGV4ZWN1dGUgdGhpcyBpbiBwYWdlIHNjb3BlLlxuXHRcdC8vIHdlIG5lZWQgdG8ga25vdyBob3cgdG8gZmluZCB0aGlzIGVsZW1lbnQgZnJvbSBwYWdlIHNjb3BlLlxuICAgIHZhciBjcyA9IG5ldyBDc3NTZWxlY3Rvcih7XG4gICAgICBlbmFibGVTbWFydFRhYmxlU2VsZWN0b3I6IGZhbHNlLFxuICAgICAgcGFyZW50OiBkb2N1bWVudC5ib2R5LFxuICAgICAgZW5hYmxlUmVzdWx0U3RyaXBwaW5nOiBmYWxzZVxuICAgIH0pXG4gICAgdmFyIGNzc1NlbGVjdG9yID0gY3MuZ2V0Q3NzU2VsZWN0b3IoW2VsZW1lbnRdKVxuICAgIGNvbnNvbGUubG9nKGNzc1NlbGVjdG9yKVxuICAgIGNvbnNvbGUubG9nKGRvY3VtZW50LmJvZHkucXVlcnlTZWxlY3RvckFsbChjc3NTZWxlY3RvcikpXG5cdFx0Ly8gdGhpcyBmdW5jdGlvbiB3aWxsIGNhdGNoIHdpbmRvdy5vcGVuIGNhbGwgYW5kIHBsYWNlIHRoZSByZXF1ZXN0ZWQgdXJsIGFzIHRoZSBlbGVtZW50cyBkYXRhIGF0dHJpYnV0ZVxuICAgIHZhciBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKVxuICAgIHNjcmlwdC50eXBlID0gJ3RleHQvamF2YXNjcmlwdCdcbiAgICBjb25zb2xlLmxvZyhjc3NTZWxlY3RvcilcbiAgICBjb25zb2xlLmxvZyhkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKGNzc1NlbGVjdG9yKSlcbiAgICBzY3JpcHQudGV4dCA9IGBcblx0XHRcdChmdW5jdGlvbigpe1xuICAgICAgICB2YXIgb3BlbiA9IHdpbmRvdy5vcGVuO1xuICAgICAgICB2YXIgZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcke2Nzc1NlbGVjdG9yfScpWzBdO1xuICAgICAgICB2YXIgb3Blbk5ldyA9IGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgICB2YXIgdXJsID0gYXJndW1lbnRzWzBdOyBcbiAgICAgICAgICBlbC5kYXRhc2V0LndlYlNjcmFwZXJFeHRyYWN0VXJsID0gdXJsOyBcbiAgICAgICAgICB3aW5kb3cub3BlbiA9IG9wZW47IFxuICAgICAgICB9O1xuICAgICAgICB3aW5kb3cub3BlbiA9IG9wZW5OZXc7IFxuICAgICAgICBlbC5jbGljaygpOyBcblx0XHRcdH0pKClgXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzY3JpcHQpXG5cblx0XHQvLyB3YWl0IGZvciB1cmwgdG8gYmUgYXZhaWxhYmxlXG4gICAgdmFyIGRlZmVycmVkVVJMID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgdGltZW91dCA9IE1hdGguYWJzKDUwMDAgLyAzMCkgLy8gNXMgdGltZW91dCB0byBnZW5lcmF0ZSBhbiB1cmwgZm9yIHBvcHVwXG4gICAgdmFyIGludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHVybCA9ICQoZWxlbWVudCkuZGF0YSgnd2ViLXNjcmFwZXItZXh0cmFjdC11cmwnKVxuICAgICAgaWYgKHVybCkge1xuICAgICAgICBkZWZlcnJlZFVSTC5yZXNvbHZlKHVybClcbiAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbClcbiAgICAgICAgc2NyaXB0LnJlbW92ZSgpXG4gICAgICB9XG5cdFx0XHQvLyB0aW1lb3V0IHBvcHVwIG9wZW5pbmdcbiAgICAgIGlmICh0aW1lb3V0LS0gPD0gMCkge1xuICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKVxuICAgICAgICBzY3JpcHQucmVtb3ZlKClcbiAgICAgIH1cbiAgICB9LCAzMClcblxuICAgIHJldHVybiBkZWZlcnJlZFVSTC5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbdGhpcy5pZCwgdGhpcy5pZCArICctaHJlZiddXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydtdWx0aXBsZScsICdkZWxheSddXG4gIH0sXG5cbiAgZ2V0SXRlbUNTU1NlbGVjdG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICcqJ1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JQb3B1cExpbmtcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxuXG52YXIgU2VsZWN0b3JUYWJsZSA9IHtcblxuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgZ2V0VGFibGVIZWFkZXJDb2x1bW5zOiBmdW5jdGlvbiAoJHRhYmxlKSB7XG4gICAgdmFyIGNvbHVtbnMgPSB7fVxuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIGhlYWRlclJvd1NlbGVjdG9yID0gdGhpcy5nZXRUYWJsZUhlYWRlclJvd1NlbGVjdG9yKClcbiAgICB2YXIgJGhlYWRlclJvdyA9ICQoJHRhYmxlKS5maW5kKGhlYWRlclJvd1NlbGVjdG9yKVxuICAgIGlmICgkaGVhZGVyUm93Lmxlbmd0aCA+IDApIHtcbiAgICAgICRoZWFkZXJSb3cuZmluZCgndGQsdGgnKS5lYWNoKGZ1bmN0aW9uIChpKSB7XG4gICAgICAgIHZhciBoZWFkZXIgPSAkKHRoaXMpLnRleHQoKS50cmltKClcbiAgICAgICAgY29sdW1uc1toZWFkZXJdID0ge1xuICAgICAgICAgIGluZGV4OiBpICsgMVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgICByZXR1cm4gY29sdW1uc1xuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZGZkID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgJCA9IHRoaXMuJFxuXG4gICAgdmFyIHRhYmxlcyA9IHRoaXMuZ2V0RGF0YUVsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG5cbiAgICB2YXIgcmVzdWx0ID0gW11cbiAgICAkKHRhYmxlcykuZWFjaChmdW5jdGlvbiAoaywgdGFibGUpIHtcbiAgICAgIHZhciBjb2x1bW5zID0gdGhpcy5nZXRUYWJsZUhlYWRlckNvbHVtbnMoJCh0YWJsZSkpXG5cbiAgICAgIHZhciBkYXRhUm93U2VsZWN0b3IgPSB0aGlzLmdldFRhYmxlRGF0YVJvd1NlbGVjdG9yKClcbiAgICAgICQodGFibGUpLmZpbmQoZGF0YVJvd1NlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uIChpLCByb3cpIHtcbiAgICAgICAgdmFyIGRhdGEgPSB7fVxuICAgICAgICB0aGlzLmNvbHVtbnMuZm9yRWFjaChmdW5jdGlvbiAoY29sdW1uKSB7XG4gICAgICAgICAgaWYgKGNvbHVtbi5leHRyYWN0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICBpZiAoY29sdW1uc1tjb2x1bW4uaGVhZGVyXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIGRhdGFbY29sdW1uLm5hbWVdID0gbnVsbFxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdmFyIHJvd1RleHQgPSAkKHJvdykuZmluZCgnPjpudGgtY2hpbGQoJyArIGNvbHVtbnNbY29sdW1uLmhlYWRlcl0uaW5kZXggKyAnKScpLnRleHQoKS50cmltKClcbiAgICAgICAgICAgICAgZGF0YVtjb2x1bW4ubmFtZV0gPSByb3dUZXh0XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICByZXN1bHQucHVzaChkYXRhKVxuICAgICAgfS5iaW5kKHRoaXMpKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIGRmZC5yZXNvbHZlKHJlc3VsdClcbiAgICByZXR1cm4gZGZkLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGRhdGFDb2x1bW5zID0gW11cbiAgICB0aGlzLmNvbHVtbnMuZm9yRWFjaChmdW5jdGlvbiAoY29sdW1uKSB7XG4gICAgICBpZiAoY29sdW1uLmV4dHJhY3QgPT09IHRydWUpIHtcbiAgICAgICAgZGF0YUNvbHVtbnMucHVzaChjb2x1bW4ubmFtZSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBkYXRhQ29sdW1uc1xuICB9LFxuXG4gIGdldEZlYXR1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFsnbXVsdGlwbGUnLCAnY29sdW1ucycsICdkZWxheScsICd0YWJsZURhdGFSb3dTZWxlY3RvcicsICd0YWJsZUhlYWRlclJvd1NlbGVjdG9yJ11cbiAgfSxcblxuICBnZXRJdGVtQ1NTU2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gJ3RhYmxlJ1xuICB9LFxuXG4gIGdldFRhYmxlSGVhZGVyUm93U2VsZWN0b3JGcm9tVGFibGVIVE1MOiBmdW5jdGlvbiAoaHRtbCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdmFyICQgPSBvcHRpb25zLiQgfHwgdGhpcy4kXG4gICAgdmFyICR0YWJsZSA9ICQoaHRtbClcbiAgICBpZiAoJHRhYmxlLmZpbmQoJ3RoZWFkIHRyOmhhcyh0ZDpub3QoOmVtcHR5KSksIHRoZWFkIHRyOmhhcyh0aDpub3QoOmVtcHR5KSknKS5sZW5ndGgpIHtcbiAgICAgIGlmICgkdGFibGUuZmluZCgndGhlYWQgdHInKS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmV0dXJuICd0aGVhZCB0cidcbiAgICAgIH1cdFx0XHRlbHNlIHtcbiAgICAgICAgdmFyICRyb3dzID0gJHRhYmxlLmZpbmQoJ3RoZWFkIHRyJylcblx0XHRcdFx0Ly8gZmlyc3Qgcm93IHdpdGggZGF0YVxuICAgICAgICB2YXIgcm93SW5kZXggPSAkcm93cy5pbmRleCgkcm93cy5maWx0ZXIoJzpoYXModGQ6bm90KDplbXB0eSkpLDpoYXModGg6bm90KDplbXB0eSkpJylbMF0pXG4gICAgICAgIHJldHVybiAndGhlYWQgdHI6bnRoLW9mLXR5cGUoJyArIChyb3dJbmRleCArIDEpICsgJyknXG4gICAgICB9XG4gICAgfVx0XHRlbHNlIGlmICgkdGFibGUuZmluZCgndHIgdGQ6bm90KDplbXB0eSksIHRyIHRoOm5vdCg6ZW1wdHkpJykubGVuZ3RoKSB7XG4gICAgICB2YXIgJHJvd3MgPSAkdGFibGUuZmluZCgndHInKVxuXHRcdFx0Ly8gZmlyc3Qgcm93IHdpdGggZGF0YVxuICAgICAgdmFyIHJvd0luZGV4ID0gJHJvd3MuaW5kZXgoJHJvd3MuZmlsdGVyKCc6aGFzKHRkOm5vdCg6ZW1wdHkpKSw6aGFzKHRoOm5vdCg6ZW1wdHkpKScpWzBdKVxuICAgICAgcmV0dXJuICd0cjpudGgtb2YtdHlwZSgnICsgKHJvd0luZGV4ICsgMSkgKyAnKSdcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgcmV0dXJuICcnXG4gICAgfVxuICB9LFxuXG4gIGdldFRhYmxlRGF0YVJvd1NlbGVjdG9yRnJvbVRhYmxlSFRNTDogZnVuY3Rpb24gKGh0bWwsIG9wdGlvbnMgPSB7fSkge1xuICAgIHZhciAkID0gb3B0aW9ucy4kIHx8IHRoaXMuJFxuICAgIHZhciAkdGFibGUgPSAkKGh0bWwpXG4gICAgaWYgKCR0YWJsZS5maW5kKCd0aGVhZCB0cjpoYXModGQ6bm90KDplbXB0eSkpLCB0aGVhZCB0cjpoYXModGg6bm90KDplbXB0eSkpJykubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gJ3Rib2R5IHRyJ1xuICAgIH1cdFx0ZWxzZSBpZiAoJHRhYmxlLmZpbmQoJ3RyIHRkOm5vdCg6ZW1wdHkpLCB0ciB0aDpub3QoOmVtcHR5KScpLmxlbmd0aCkge1xuICAgICAgdmFyICRyb3dzID0gJHRhYmxlLmZpbmQoJ3RyJylcblx0XHRcdC8vIGZpcnN0IHJvdyB3aXRoIGRhdGFcbiAgICAgIHZhciByb3dJbmRleCA9ICRyb3dzLmluZGV4KCRyb3dzLmZpbHRlcignOmhhcyh0ZDpub3QoOmVtcHR5KSksOmhhcyh0aDpub3QoOmVtcHR5KSknKVswXSlcbiAgICAgIHJldHVybiAndHI6bnRoLW9mLXR5cGUobisnICsgKHJvd0luZGV4ICsgMikgKyAnKSdcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgcmV0dXJuICcnXG4gICAgfVxuICB9LFxuXG4gIGdldFRhYmxlSGVhZGVyUm93U2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcblx0XHQvLyBoYW5kbGUgbGVnYWN5IHNlbGVjdG9yc1xuICAgIGlmICh0aGlzLnRhYmxlSGVhZGVyUm93U2VsZWN0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuICd0aGVhZCB0cidcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMudGFibGVIZWFkZXJSb3dTZWxlY3RvclxuICAgIH1cbiAgfSxcblxuICBnZXRUYWJsZURhdGFSb3dTZWxlY3RvcjogZnVuY3Rpb24gKCkge1xuXHRcdC8vIGhhbmRsZSBsZWdhY3kgc2VsZWN0b3JzXG4gICAgaWYgKHRoaXMudGFibGVEYXRhUm93U2VsZWN0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuICd0Ym9keSB0cidcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMudGFibGVEYXRhUm93U2VsZWN0b3JcbiAgICB9XG4gIH0sXG5cblx0LyoqXG5cdCAqIEV4dHJhY3QgdGFibGUgaGVhZGVyIGNvbHVtbiBpbmZvIGZyb20gaHRtbFxuXHQgKiBAcGFyYW0gaHRtbFxuXHQgKi9cbiAgZ2V0VGFibGVIZWFkZXJDb2x1bW5zRnJvbUhUTUw6IGZ1bmN0aW9uIChoZWFkZXJSb3dTZWxlY3RvciwgaHRtbCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdmFyICQgPSBvcHRpb25zLiQgfHwgdGhpcy4kXG4gICAgdmFyICR0YWJsZSA9ICQoaHRtbClcbiAgICB2YXIgJGhlYWRlclJvd0NvbHVtbnMgPSAkdGFibGUuZmluZChoZWFkZXJSb3dTZWxlY3RvcikuZmluZCgndGQsdGgnKVxuXG4gICAgdmFyIGNvbHVtbnMgPSBbXVxuXG4gICAgJGhlYWRlclJvd0NvbHVtbnMuZWFjaChmdW5jdGlvbiAoaSwgY29sdW1uRWwpIHtcbiAgICAgIHZhciBoZWFkZXIgPSAkKGNvbHVtbkVsKS50ZXh0KCkudHJpbSgpXG4gICAgICB2YXIgbmFtZSA9IGhlYWRlclxuICAgICAgaWYgKGhlYWRlci5sZW5ndGggIT09IDApIHtcbiAgICAgICAgY29sdW1ucy5wdXNoKHtcbiAgICAgICAgICBoZWFkZXI6IGhlYWRlcixcbiAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgIGV4dHJhY3Q6IHRydWVcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBjb2x1bW5zXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvclRhYmxlXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciBTZWxlY3RvclRleHQgPSB7XG5cbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5IYXZlTG9jYWxDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkNyZWF0ZU5ld0pvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuXG4gICAgdmFyIHJlc3VsdCA9IFtdXG4gICAgJChlbGVtZW50cykuZWFjaChmdW5jdGlvbiAoaywgZWxlbWVudCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuXG5cdFx0XHQvLyByZW1vdmUgc2NyaXB0LCBzdHlsZSB0YWcgY29udGVudHMgZnJvbSB0ZXh0IHJlc3VsdHNcbiAgICAgIHZhciAkZWxlbWVudF9jbG9uZSA9ICQoZWxlbWVudCkuY2xvbmUoKVxuICAgICAgJGVsZW1lbnRfY2xvbmUuZmluZCgnc2NyaXB0LCBzdHlsZScpLnJlbW92ZSgpXG5cdFx0XHQvLyA8YnI+IHJlcGxhY2UgYnIgdGFncyB3aXRoIG5ld2xpbmVzXG4gICAgICAkZWxlbWVudF9jbG9uZS5maW5kKCdicicpLmFmdGVyKCdcXG4nKVxuXG4gICAgICB2YXIgdGV4dCA9ICRlbGVtZW50X2Nsb25lLnRleHQoKVxuICAgICAgaWYgKHRoaXMucmVnZXggIT09IHVuZGVmaW5lZCAmJiB0aGlzLnJlZ2V4Lmxlbmd0aCkge1xuICAgICAgICB2YXIgbWF0Y2hlcyA9IHRleHQubWF0Y2gobmV3IFJlZ0V4cCh0aGlzLnJlZ2V4KSlcbiAgICAgICAgaWYgKG1hdGNoZXMgIT09IG51bGwpIHtcbiAgICAgICAgICB0ZXh0ID0gbWF0Y2hlc1swXVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRleHQgPSBudWxsXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGRhdGFbdGhpcy5pZF0gPSB0ZXh0XG5cbiAgICAgIHJlc3VsdC5wdXNoKGRhdGEpXG4gICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgaWYgKHRoaXMubXVsdGlwbGUgPT09IGZhbHNlICYmIGVsZW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuICAgICAgZGF0YVt0aGlzLmlkXSA9IG51bGxcbiAgICAgIHJlc3VsdC5wdXNoKGRhdGEpXG4gICAgfVxuXG4gICAgZGZkLnJlc29sdmUocmVzdWx0KVxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW3RoaXMuaWRdXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydtdWx0aXBsZScsICdyZWdleCcsICdkZWxheSddXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvclRleHRcbiIsInZhciBTZWxlY3RvciA9IHJlcXVpcmUoJy4vU2VsZWN0b3InKVxuXG52YXIgU2VsZWN0b3JMaXN0ID0gZnVuY3Rpb24gKHNlbGVjdG9ycywgb3B0aW9ucykge1xuICB0aGlzLiQgPSBvcHRpb25zLiRcbiAgaWYgKCFvcHRpb25zLiQpIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBqcXVlcnknKVxuXG4gIGlmIChzZWxlY3RvcnMgPT09IG51bGwgfHwgc2VsZWN0b3JzID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZWN0b3JzLmxlbmd0aDsgaSsrKSB7XG4gICAgdGhpcy5wdXNoKHNlbGVjdG9yc1tpXSlcbiAgfVxufVxuXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlID0gW11cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gIGlmICghdGhpcy5oYXNTZWxlY3RvcihzZWxlY3Rvci5pZCkpIHtcbiAgICBpZiAoIShzZWxlY3RvciBpbnN0YW5jZW9mIFNlbGVjdG9yKSkge1xuICAgICAgc2VsZWN0b3IgPSBuZXcgU2VsZWN0b3Ioc2VsZWN0b3IsIHskOiB0aGlzLiR9KVxuICAgIH1cbiAgICBBcnJheS5wcm90b3R5cGUucHVzaC5jYWxsKHRoaXMsIHNlbGVjdG9yKVxuICB9XG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuaGFzU2VsZWN0b3IgPSBmdW5jdGlvbiAoc2VsZWN0b3JJZCkge1xuICBpZiAoc2VsZWN0b3JJZCBpbnN0YW5jZW9mIE9iamVjdCkge1xuICAgIHNlbGVjdG9ySWQgPSBzZWxlY3RvcklkLmlkXG4gIH1cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAodGhpc1tpXS5pZCA9PT0gc2VsZWN0b3JJZCkge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59XG5cbi8qKlxuICogUmV0dXJucyBhbGwgc2VsZWN0b3JzIG9yIHJlY3Vyc2l2ZWx5IGZpbmQgYW5kIHJldHVybiBhbGwgY2hpbGQgc2VsZWN0b3JzIG9mIGEgcGFyZW50IHNlbGVjdG9yLlxuICogQHBhcmFtIHBhcmVudFNlbGVjdG9ySWRcbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqL1xuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5nZXRBbGxTZWxlY3RvcnMgPSBmdW5jdGlvbiAocGFyZW50U2VsZWN0b3JJZCkge1xuICBpZiAocGFyZW50U2VsZWN0b3JJZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHZhciBnZXRBbGxDaGlsZFNlbGVjdG9ycyA9IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3RvcklkLCByZXN1bHRTZWxlY3RvcnMpIHtcbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICBpZiAoc2VsZWN0b3IuaGFzUGFyZW50U2VsZWN0b3IocGFyZW50U2VsZWN0b3JJZCkpIHtcbiAgICAgICAgaWYgKHJlc3VsdFNlbGVjdG9ycy5pbmRleE9mKHNlbGVjdG9yKSA9PT0gLTEpIHtcbiAgICAgICAgICByZXN1bHRTZWxlY3RvcnMucHVzaChzZWxlY3RvcilcbiAgICAgICAgICBnZXRBbGxDaGlsZFNlbGVjdG9ycyhzZWxlY3Rvci5pZCwgcmVzdWx0U2VsZWN0b3JzKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgfS5iaW5kKHRoaXMpXG5cbiAgdmFyIHJlc3VsdFNlbGVjdG9ycyA9IFtdXG4gIGdldEFsbENoaWxkU2VsZWN0b3JzKHBhcmVudFNlbGVjdG9ySWQsIHJlc3VsdFNlbGVjdG9ycylcbiAgcmV0dXJuIHJlc3VsdFNlbGVjdG9yc1xufVxuXG4vKipcbiAqIFJldHVybnMgb25seSBzZWxlY3RvcnMgdGhhdCBhcmUgZGlyZWN0bHkgdW5kZXIgYSBwYXJlbnRcbiAqIEBwYXJhbSBwYXJlbnRTZWxlY3RvcklkXG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZ2V0RGlyZWN0Q2hpbGRTZWxlY3RvcnMgPSBmdW5jdGlvbiAocGFyZW50U2VsZWN0b3JJZCkge1xuICB2YXIgcmVzdWx0U2VsZWN0b3JzID0gbmV3IFNlbGVjdG9yTGlzdChudWxsLCB7JDogdGhpcy4kfSlcbiAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgIGlmIChzZWxlY3Rvci5oYXNQYXJlbnRTZWxlY3RvcihwYXJlbnRTZWxlY3RvcklkKSkge1xuICAgICAgcmVzdWx0U2VsZWN0b3JzLnB1c2goc2VsZWN0b3IpXG4gICAgfVxuICB9KVxuICByZXR1cm4gcmVzdWx0U2VsZWN0b3JzXG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciByZXN1bHRMaXN0ID0gbmV3IFNlbGVjdG9yTGlzdChudWxsLCB7JDogdGhpcy4kfSlcbiAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgIHJlc3VsdExpc3QucHVzaChzZWxlY3RvcilcbiAgfSlcbiAgcmV0dXJuIHJlc3VsdExpc3Rcbn1cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5mdWxsQ2xvbmUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciByZXN1bHRMaXN0ID0gbmV3IFNlbGVjdG9yTGlzdChudWxsLCB7JDogdGhpcy4kfSlcbiAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgIHJlc3VsdExpc3QucHVzaChKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHNlbGVjdG9yKSkpXG4gIH0pXG4gIHJldHVybiByZXN1bHRMaXN0XG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuY29uY2F0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgcmVzdWx0TGlzdCA9IHRoaXMuY2xvbmUoKVxuICBmb3IgKHZhciBpIGluIGFyZ3VtZW50cykge1xuICAgIGFyZ3VtZW50c1tpXS5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgcmVzdWx0TGlzdC5wdXNoKHNlbGVjdG9yKVxuICAgIH0pXG4gIH1cbiAgcmV0dXJuIHJlc3VsdExpc3Rcbn1cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5nZXRTZWxlY3RvciA9IGZ1bmN0aW9uIChzZWxlY3RvcklkKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBzZWxlY3RvciA9IHRoaXNbaV1cbiAgICBpZiAoc2VsZWN0b3IuaWQgPT09IHNlbGVjdG9ySWQpIHtcbiAgICAgIHJldHVybiBzZWxlY3RvclxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFJldHVybnMgYWxsIHNlbGVjdG9ycyBpZiB0aGlzIHNlbGVjdG9ycyBpbmNsdWRpbmcgYWxsIHBhcmVudCBzZWxlY3RvcnMgd2l0aGluIHRoaXMgcGFnZVxuICogQFRPRE8gbm90IHVzZWQgYW55IG1vcmUuXG4gKiBAcGFyYW0gc2VsZWN0b3JJZFxuICogQHJldHVybnMgeyp9XG4gKi9cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZ2V0T25lUGFnZVNlbGVjdG9ycyA9IGZ1bmN0aW9uIChzZWxlY3RvcklkKSB7XG4gIHZhciByZXN1bHRMaXN0ID0gbmV3IFNlbGVjdG9yTGlzdChudWxsLCB7JDogdGhpcy4kfSlcbiAgdmFyIHNlbGVjdG9yID0gdGhpcy5nZXRTZWxlY3RvcihzZWxlY3RvcklkKVxuICByZXN1bHRMaXN0LnB1c2godGhpcy5nZXRTZWxlY3RvcihzZWxlY3RvcklkKSlcblxuXHQvLyByZWN1cnNpdmVseSBmaW5kIGFsbCBwYXJlbnQgc2VsZWN0b3JzIHRoYXQgY291bGQgbGVhZCB0byB0aGUgcGFnZSB3aGVyZSBzZWxlY3RvcklkIGlzIHVzZWQuXG4gIHZhciBmaW5kUGFyZW50U2VsZWN0b3JzID0gZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgc2VsZWN0b3IucGFyZW50U2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9ySWQpIHtcbiAgICAgIGlmIChwYXJlbnRTZWxlY3RvcklkID09PSAnX3Jvb3QnKSByZXR1cm5cbiAgICAgIHZhciBwYXJlbnRTZWxlY3RvciA9IHRoaXMuZ2V0U2VsZWN0b3IocGFyZW50U2VsZWN0b3JJZClcbiAgICAgIGlmIChyZXN1bHRMaXN0LmluZGV4T2YocGFyZW50U2VsZWN0b3IpICE9PSAtMSkgcmV0dXJuXG4gICAgICBpZiAocGFyZW50U2VsZWN0b3Iud2lsbFJldHVybkVsZW1lbnRzKCkpIHtcbiAgICAgICAgcmVzdWx0TGlzdC5wdXNoKHBhcmVudFNlbGVjdG9yKVxuICAgICAgICBmaW5kUGFyZW50U2VsZWN0b3JzKHBhcmVudFNlbGVjdG9yKVxuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfS5iaW5kKHRoaXMpXG5cbiAgZmluZFBhcmVudFNlbGVjdG9ycyhzZWxlY3RvcilcblxuXHQvLyBhZGQgYWxsIGNoaWxkIHNlbGVjdG9yc1xuICByZXN1bHRMaXN0ID0gcmVzdWx0TGlzdC5jb25jYXQodGhpcy5nZXRTaW5nbGVQYWdlQWxsQ2hpbGRTZWxlY3RvcnMoc2VsZWN0b3IuaWQpKVxuICByZXR1cm4gcmVzdWx0TGlzdFxufVxuXG4vKipcbiAqIFJldHVybnMgYWxsIGNoaWxkIHNlbGVjdG9ycyBvZiBhIHNlbGVjdG9yIHdoaWNoIGNhbiBiZSB1c2VkIHdpdGhpbiBvbmUgcGFnZS5cbiAqIEBwYXJhbSBwYXJlbnRTZWxlY3RvcklkXG4gKi9cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZ2V0U2luZ2xlUGFnZUFsbENoaWxkU2VsZWN0b3JzID0gZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9ySWQpIHtcbiAgdmFyIHJlc3VsdExpc3QgPSBuZXcgU2VsZWN0b3JMaXN0KG51bGwsIHskOiB0aGlzLiR9KVxuICB2YXIgYWRkQ2hpbGRTZWxlY3RvcnMgPSBmdW5jdGlvbiAocGFyZW50U2VsZWN0b3IpIHtcbiAgICBpZiAocGFyZW50U2VsZWN0b3Iud2lsbFJldHVybkVsZW1lbnRzKCkpIHtcbiAgICAgIHZhciBjaGlsZFNlbGVjdG9ycyA9IHRoaXMuZ2V0RGlyZWN0Q2hpbGRTZWxlY3RvcnMocGFyZW50U2VsZWN0b3IuaWQpXG4gICAgICBjaGlsZFNlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChjaGlsZFNlbGVjdG9yKSB7XG4gICAgICAgIGlmIChyZXN1bHRMaXN0LmluZGV4T2YoY2hpbGRTZWxlY3RvcikgPT09IC0xKSB7XG4gICAgICAgICAgcmVzdWx0TGlzdC5wdXNoKGNoaWxkU2VsZWN0b3IpXG4gICAgICAgICAgYWRkQ2hpbGRTZWxlY3RvcnMoY2hpbGRTZWxlY3RvcilcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG4gIH0uYmluZCh0aGlzKVxuXG4gIHZhciBwYXJlbnRTZWxlY3RvciA9IHRoaXMuZ2V0U2VsZWN0b3IocGFyZW50U2VsZWN0b3JJZClcbiAgYWRkQ2hpbGRTZWxlY3RvcnMocGFyZW50U2VsZWN0b3IpXG4gIHJldHVybiByZXN1bHRMaXN0XG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUud2lsbFJldHVybk11bHRpcGxlUmVjb3JkcyA9IGZ1bmN0aW9uIChzZWxlY3RvcklkKSB7XG5cdC8vIGhhbmRsZSByZXVxZXN0ZWQgc2VsZWN0b3JcbiAgdmFyIHNlbGVjdG9yID0gdGhpcy5nZXRTZWxlY3RvcihzZWxlY3RvcklkKVxuICBpZiAoc2VsZWN0b3Iud2lsbFJldHVybk11bHRpcGxlUmVjb3JkcygpID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuXG5cdC8vIGhhbmRsZSBhbGwgaXRzIGNoaWxkIHNlbGVjdG9yc1xuICB2YXIgY2hpbGRTZWxlY3RvcnMgPSB0aGlzLmdldEFsbFNlbGVjdG9ycyhzZWxlY3RvcklkKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkU2VsZWN0b3JzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHNlbGVjdG9yID0gY2hpbGRTZWxlY3RvcnNbaV1cbiAgICBpZiAoc2VsZWN0b3Iud2lsbFJldHVybk11bHRpcGxlUmVjb3JkcygpID09PSB0cnVlKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmYWxzZVxufVxuXG4vKipcbiAqIFdoZW4gc2VyaWFsaXppbmcgdG8gSlNPTiBjb252ZXJ0IHRvIGFuIGFycmF5XG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gKCkge1xuICB2YXIgcmVzdWx0ID0gW11cbiAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgIHJlc3VsdC5wdXNoKHNlbGVjdG9yKVxuICB9KVxuICByZXR1cm4gcmVzdWx0XG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZ2V0U2VsZWN0b3JCeUlkID0gZnVuY3Rpb24gKHNlbGVjdG9ySWQpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHNlbGVjdG9yID0gdGhpc1tpXVxuICAgIGlmIChzZWxlY3Rvci5pZCA9PT0gc2VsZWN0b3JJZCkge1xuICAgICAgcmV0dXJuIHNlbGVjdG9yXG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogcmV0dXJucyBjc3Mgc2VsZWN0b3IgZm9yIGEgZ2l2ZW4gZWxlbWVudC4gY3NzIHNlbGVjdG9yIGluY2x1ZGVzIGFsbCBwYXJlbnQgZWxlbWVudCBzZWxlY3RvcnNcbiAqIEBwYXJhbSBzZWxlY3RvcklkXG4gKiBAcGFyYW0gcGFyZW50U2VsZWN0b3JJZHMgYXJyYXkgb2YgcGFyZW50IHNlbGVjdG9yIGlkcyBmcm9tIGRldnRvb2xzIEJyZWFkY3VtYlxuICogQHJldHVybnMgc3RyaW5nXG4gKi9cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZ2V0Q1NTU2VsZWN0b3JXaXRoaW5PbmVQYWdlID0gZnVuY3Rpb24gKHNlbGVjdG9ySWQsIHBhcmVudFNlbGVjdG9ySWRzKSB7XG4gIHZhciBDU1NTZWxlY3RvciA9IHRoaXMuZ2V0U2VsZWN0b3Ioc2VsZWN0b3JJZCkuc2VsZWN0b3JcbiAgdmFyIHBhcmVudENTU1NlbGVjdG9yID0gdGhpcy5nZXRQYXJlbnRDU1NTZWxlY3RvcldpdGhpbk9uZVBhZ2UocGFyZW50U2VsZWN0b3JJZHMpXG4gIENTU1NlbGVjdG9yID0gcGFyZW50Q1NTU2VsZWN0b3IgKyBDU1NTZWxlY3RvclxuXG4gIHJldHVybiBDU1NTZWxlY3RvclxufVxuXG4vKipcbiAqIHJldHVybnMgY3NzIHNlbGVjdG9yIGZvciBwYXJlbnQgc2VsZWN0b3JzIHRoYXQgYXJlIHdpdGhpbiBvbmUgcGFnZVxuICogQHBhcmFtIHBhcmVudFNlbGVjdG9ySWRzIGFycmF5IG9mIHBhcmVudCBzZWxlY3RvciBpZHMgZnJvbSBkZXZ0b29scyBCcmVhZGN1bWJcbiAqIEByZXR1cm5zIHN0cmluZ1xuICovXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmdldFBhcmVudENTU1NlbGVjdG9yV2l0aGluT25lUGFnZSA9IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3Rvcklkcykge1xuICB2YXIgQ1NTU2VsZWN0b3IgPSAnJ1xuXG4gIGZvciAodmFyIGkgPSBwYXJlbnRTZWxlY3Rvcklkcy5sZW5ndGggLSAxOyBpID4gMDsgaS0tKSB7XG4gICAgdmFyIHBhcmVudFNlbGVjdG9ySWQgPSBwYXJlbnRTZWxlY3Rvcklkc1tpXVxuICAgIHZhciBwYXJlbnRTZWxlY3RvciA9IHRoaXMuZ2V0U2VsZWN0b3IocGFyZW50U2VsZWN0b3JJZClcbiAgICBpZiAocGFyZW50U2VsZWN0b3Iud2lsbFJldHVybkVsZW1lbnRzKCkpIHtcbiAgICAgIENTU1NlbGVjdG9yID0gcGFyZW50U2VsZWN0b3Iuc2VsZWN0b3IgKyAnICcgKyBDU1NTZWxlY3RvclxuICAgIH0gZWxzZSB7XG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBDU1NTZWxlY3RvclxufVxuXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmhhc1JlY3Vyc2l2ZUVsZW1lbnRTZWxlY3RvcnMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBSZWN1cnNpb25Gb3VuZCA9IGZhbHNlXG5cbiAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uICh0b3BTZWxlY3Rvcikge1xuICAgIHZhciB2aXNpdGVkU2VsZWN0b3JzID0gW11cblxuICAgIHZhciBjaGVja1JlY3Vyc2lvbiA9IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3Rvcikge1xuXHRcdFx0Ly8gYWxyZWFkeSB2aXNpdGVkXG4gICAgICBpZiAodmlzaXRlZFNlbGVjdG9ycy5pbmRleE9mKHBhcmVudFNlbGVjdG9yKSAhPT0gLTEpIHtcbiAgICAgICAgUmVjdXJzaW9uRm91bmQgPSB0cnVlXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICBpZiAocGFyZW50U2VsZWN0b3Iud2lsbFJldHVybkVsZW1lbnRzKCkpIHtcbiAgICAgICAgdmlzaXRlZFNlbGVjdG9ycy5wdXNoKHBhcmVudFNlbGVjdG9yKVxuICAgICAgICB2YXIgY2hpbGRTZWxlY3RvcnMgPSB0aGlzLmdldERpcmVjdENoaWxkU2VsZWN0b3JzKHBhcmVudFNlbGVjdG9yLmlkKVxuICAgICAgICBjaGlsZFNlbGVjdG9ycy5mb3JFYWNoKGNoZWNrUmVjdXJzaW9uKVxuICAgICAgICB2aXNpdGVkU2VsZWN0b3JzLnBvcCgpXG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpXG5cbiAgICBjaGVja1JlY3Vyc2lvbih0b3BTZWxlY3RvcilcbiAgfS5iaW5kKHRoaXMpKVxuXG4gIHJldHVybiBSZWN1cnNpb25Gb3VuZFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yTGlzdFxuIiwidmFyIFNlbGVjdG9yRWxlbWVudCA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JFbGVtZW50JylcbnZhciBTZWxlY3RvckVsZW1lbnRBdHRyaWJ1dGUgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yRWxlbWVudEF0dHJpYnV0ZScpXG52YXIgU2VsZWN0b3JFbGVtZW50Q2xpY2sgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yRWxlbWVudENsaWNrJylcbnZhciBTZWxlY3RvckVsZW1lbnRTY3JvbGwgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yRWxlbWVudFNjcm9sbCcpXG52YXIgU2VsZWN0b3JHcm91cCA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JHcm91cCcpXG52YXIgU2VsZWN0b3JIVE1MID0gcmVxdWlyZSgnLi9TZWxlY3Rvci9TZWxlY3RvckhUTUwnKVxudmFyIFNlbGVjdG9ySW1hZ2UgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9ySW1hZ2UnKVxudmFyIFNlbGVjdG9yTGluayA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JMaW5rJylcbnZhciBTZWxlY3RvclBvcHVwTGluayA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JQb3B1cExpbmsnKVxudmFyIFNlbGVjdG9yVGFibGUgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yVGFibGUnKVxudmFyIFNlbGVjdG9yVGV4dCA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JUZXh0JylcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIFNlbGVjdG9yRWxlbWVudCxcbiAgU2VsZWN0b3JFbGVtZW50QXR0cmlidXRlLFxuICBTZWxlY3RvckVsZW1lbnRDbGljayxcbiAgU2VsZWN0b3JFbGVtZW50U2Nyb2xsLFxuICBTZWxlY3Rvckdyb3VwLFxuICBTZWxlY3RvckhUTUwsXG4gIFNlbGVjdG9ySW1hZ2UsXG4gIFNlbGVjdG9yTGluayxcbiAgU2VsZWN0b3JQb3B1cExpbmssXG4gIFNlbGVjdG9yVGFibGUsXG4gIFNlbGVjdG9yVGV4dFxufVxuIiwidmFyIFNlbGVjdG9yID0gcmVxdWlyZSgnLi9TZWxlY3RvcicpXG52YXIgU2VsZWN0b3JMaXN0ID0gcmVxdWlyZSgnLi9TZWxlY3Rvckxpc3QnKVxudmFyIFNpdGVtYXAgPSBmdW5jdGlvbiAoc2l0ZW1hcE9iaiwgb3B0aW9ucykge1xuICB0aGlzLiQgPSBvcHRpb25zLiRcbiAgaWYgKCFvcHRpb25zLiQpIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBqcXVlcnknKVxuICB0aGlzLmluaXREYXRhKHNpdGVtYXBPYmopXG59XG5cblNpdGVtYXAucHJvdG90eXBlID0ge1xuXG4gIGluaXREYXRhOiBmdW5jdGlvbiAoc2l0ZW1hcE9iaikge1xuICAgIGNvbnNvbGUubG9nKHRoaXMpXG4gICAgZm9yICh2YXIga2V5IGluIHNpdGVtYXBPYmopIHtcbiAgICAgIGNvbnNvbGUubG9nKGtleSlcbiAgICAgIHRoaXNba2V5XSA9IHNpdGVtYXBPYmpba2V5XVxuICAgIH1cbiAgICBjb25zb2xlLmxvZyh0aGlzKVxuXG4gICAgdmFyIHNlbGVjdG9ycyA9IHRoaXMuc2VsZWN0b3JzXG4gICAgdGhpcy5zZWxlY3RvcnMgPSBuZXcgU2VsZWN0b3JMaXN0KHRoaXMuc2VsZWN0b3JzLCB7JDogdGhpcy4kfSlcbiAgfSxcblxuXHQvKipcblx0ICogUmV0dXJucyBhbGwgc2VsZWN0b3JzIG9yIHJlY3Vyc2l2ZWx5IGZpbmQgYW5kIHJldHVybiBhbGwgY2hpbGQgc2VsZWN0b3JzIG9mIGEgcGFyZW50IHNlbGVjdG9yLlxuXHQgKiBAcGFyYW0gcGFyZW50U2VsZWN0b3JJZFxuXHQgKiBAcmV0dXJucyB7QXJyYXl9XG5cdCAqL1xuICBnZXRBbGxTZWxlY3RvcnM6IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3RvcklkKSB7XG4gICAgcmV0dXJuIHRoaXMuc2VsZWN0b3JzLmdldEFsbFNlbGVjdG9ycyhwYXJlbnRTZWxlY3RvcklkKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIG9ubHkgc2VsZWN0b3JzIHRoYXQgYXJlIGRpcmVjdGx5IHVuZGVyIGEgcGFyZW50XG5cdCAqIEBwYXJhbSBwYXJlbnRTZWxlY3RvcklkXG5cdCAqIEByZXR1cm5zIHtBcnJheX1cblx0ICovXG4gIGdldERpcmVjdENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAocGFyZW50U2VsZWN0b3JJZCkge1xuICAgIHJldHVybiB0aGlzLnNlbGVjdG9ycy5nZXREaXJlY3RDaGlsZFNlbGVjdG9ycyhwYXJlbnRTZWxlY3RvcklkKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIGFsbCBzZWxlY3RvciBpZCBwYXJhbWV0ZXJzXG5cdCAqIEByZXR1cm5zIHtBcnJheX1cblx0ICovXG4gIGdldFNlbGVjdG9ySWRzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGlkcyA9IFsnX3Jvb3QnXVxuICAgIHRoaXMuc2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICBpZHMucHVzaChzZWxlY3Rvci5pZClcbiAgICB9KVxuICAgIHJldHVybiBpZHNcbiAgfSxcblxuXHQvKipcblx0ICogUmV0dXJucyBvbmx5IHNlbGVjdG9yIGlkcyB3aGljaCBjYW4gaGF2ZSBjaGlsZCBzZWxlY3RvcnNcblx0ICogQHJldHVybnMge0FycmF5fVxuXHQgKi9cbiAgZ2V0UG9zc2libGVQYXJlbnRTZWxlY3RvcklkczogZnVuY3Rpb24gKCkge1xuICAgIHZhciBpZHMgPSBbJ19yb290J11cbiAgICB0aGlzLnNlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgaWYgKHNlbGVjdG9yLmNhbkhhdmVDaGlsZFNlbGVjdG9ycygpKSB7XG4gICAgICAgIGlkcy5wdXNoKHNlbGVjdG9yLmlkKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGlkc1xuICB9LFxuXG4gIGdldFN0YXJ0VXJsczogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdGFydFVybHMgPSB0aGlzLnN0YXJ0VXJsXG5cdFx0Ly8gc2luZ2xlIHN0YXJ0IHVybFxuICAgIGlmICh0aGlzLnN0YXJ0VXJsLnB1c2ggPT09IHVuZGVmaW5lZCkge1xuICAgICAgc3RhcnRVcmxzID0gW3N0YXJ0VXJsc11cbiAgICB9XG5cbiAgICB2YXIgdXJscyA9IFtdXG4gICAgc3RhcnRVcmxzLmZvckVhY2goZnVuY3Rpb24gKHN0YXJ0VXJsKSB7XG5cdFx0XHQvLyB6ZXJvIHBhZGRpbmcgaGVscGVyXG4gICAgICB2YXIgbHBhZCA9IGZ1bmN0aW9uIChzdHIsIGxlbmd0aCkge1xuICAgICAgICB3aGlsZSAoc3RyLmxlbmd0aCA8IGxlbmd0aCkgeyBzdHIgPSAnMCcgKyBzdHIgfVxuICAgICAgICByZXR1cm4gc3RyXG4gICAgICB9XG5cbiAgICAgIHZhciByZSA9IC9eKC4qPylcXFsoXFxkKylcXC0oXFxkKykoOihcXGQrKSk/XFxdKC4qKSQvXG4gICAgICB2YXIgbWF0Y2hlcyA9IHN0YXJ0VXJsLm1hdGNoKHJlKVxuICAgICAgaWYgKG1hdGNoZXMpIHtcbiAgICAgICAgdmFyIHN0YXJ0U3RyID0gbWF0Y2hlc1syXVxuICAgICAgICB2YXIgZW5kU3RyID0gbWF0Y2hlc1szXVxuICAgICAgICB2YXIgc3RhcnQgPSBwYXJzZUludChzdGFydFN0cilcbiAgICAgICAgdmFyIGVuZCA9IHBhcnNlSW50KGVuZFN0cilcbiAgICAgICAgdmFyIGluY3JlbWVudGFsID0gMVxuICAgICAgICBjb25zb2xlLmxvZyhtYXRjaGVzWzVdKVxuICAgICAgICBpZiAobWF0Y2hlc1s1XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaW5jcmVtZW50YWwgPSBwYXJzZUludChtYXRjaGVzWzVdKVxuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSBzdGFydDsgaSA8PSBlbmQ7IGkgKz0gaW5jcmVtZW50YWwpIHtcblx0XHRcdFx0XHQvLyB3aXRoIHplcm8gcGFkZGluZ1xuICAgICAgICAgIGlmIChzdGFydFN0ci5sZW5ndGggPT09IGVuZFN0ci5sZW5ndGgpIHtcbiAgICAgICAgICAgIHVybHMucHVzaChtYXRjaGVzWzFdICsgbHBhZChpLnRvU3RyaW5nKCksIHN0YXJ0U3RyLmxlbmd0aCkgKyBtYXRjaGVzWzZdKVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB1cmxzLnB1c2gobWF0Y2hlc1sxXSArIGkgKyBtYXRjaGVzWzZdKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXJsc1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdXJscy5wdXNoKHN0YXJ0VXJsKVxuICAgICAgfVxuICAgIH0pXG5cbiAgICByZXR1cm4gdXJsc1xuICB9LFxuXG4gIHVwZGF0ZVNlbGVjdG9yOiBmdW5jdGlvbiAoc2VsZWN0b3IsIHNlbGVjdG9yRGF0YSkge1xuXHRcdC8vIHNlbGVjdG9yIGlzIHVuZGVmaW5lZCB3aGVuIGNyZWF0aW5nIGEgbmV3IG9uZVxuICAgIGlmIChzZWxlY3RvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBzZWxlY3RvciA9IG5ldyBTZWxlY3RvcihzZWxlY3RvckRhdGEsIHskOiB0aGlzLiR9KVxuICAgIH1cblxuXHRcdC8vIHVwZGF0ZSBjaGlsZCBzZWxlY3RvcnNcbiAgICBpZiAoc2VsZWN0b3IuaWQgIT09IHVuZGVmaW5lZCAmJiBzZWxlY3Rvci5pZCAhPT0gc2VsZWN0b3JEYXRhLmlkKSB7XG4gICAgICB0aGlzLnNlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChjdXJyZW50U2VsZWN0b3IpIHtcbiAgICAgICAgY3VycmVudFNlbGVjdG9yLnJlbmFtZVBhcmVudFNlbGVjdG9yKHNlbGVjdG9yLmlkLCBzZWxlY3RvckRhdGEuaWQpXG4gICAgICB9KVxuXG5cdFx0XHQvLyB1cGRhdGUgY3ljbGljIHNlbGVjdG9yXG4gICAgICB2YXIgcG9zID0gc2VsZWN0b3JEYXRhLnBhcmVudFNlbGVjdG9ycy5pbmRleE9mKHNlbGVjdG9yLmlkKVxuICAgICAgaWYgKHBvcyAhPT0gLTEpIHtcbiAgICAgICAgc2VsZWN0b3JEYXRhLnBhcmVudFNlbGVjdG9ycy5zcGxpY2UocG9zLCAxLCBzZWxlY3RvckRhdGEuaWQpXG4gICAgICB9XG4gICAgfVxuXG4gICAgc2VsZWN0b3IudXBkYXRlRGF0YShzZWxlY3RvckRhdGEpXG5cbiAgICBpZiAodGhpcy5nZXRTZWxlY3RvcklkcygpLmluZGV4T2Yoc2VsZWN0b3IuaWQpID09PSAtMSkge1xuICAgICAgdGhpcy5zZWxlY3RvcnMucHVzaChzZWxlY3RvcilcbiAgICB9XG4gIH0sXG4gIGRlbGV0ZVNlbGVjdG9yOiBmdW5jdGlvbiAoc2VsZWN0b3JUb0RlbGV0ZSkge1xuICAgIHRoaXMuc2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICBpZiAoc2VsZWN0b3IuaGFzUGFyZW50U2VsZWN0b3Ioc2VsZWN0b3JUb0RlbGV0ZS5pZCkpIHtcbiAgICAgICAgc2VsZWN0b3IucmVtb3ZlUGFyZW50U2VsZWN0b3Ioc2VsZWN0b3JUb0RlbGV0ZS5pZClcbiAgICAgICAgaWYgKHNlbGVjdG9yLnBhcmVudFNlbGVjdG9ycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICB0aGlzLmRlbGV0ZVNlbGVjdG9yKHNlbGVjdG9yKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLnNlbGVjdG9ycykge1xuICAgICAgaWYgKHRoaXMuc2VsZWN0b3JzW2ldLmlkID09PSBzZWxlY3RvclRvRGVsZXRlLmlkKSB7XG4gICAgICAgIHRoaXMuc2VsZWN0b3JzLnNwbGljZShpLCAxKVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgZ2V0RGF0YVRhYmxlSWQ6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5faWQucmVwbGFjZSgvXFwuL2csICdfJylcbiAgfSxcbiAgZXhwb3J0U2l0ZW1hcDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzaXRlbWFwT2JqID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzKSlcbiAgICBkZWxldGUgc2l0ZW1hcE9iai5fcmV2XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHNpdGVtYXBPYmopXG4gIH0sXG4gIGltcG9ydFNpdGVtYXA6IGZ1bmN0aW9uIChzaXRlbWFwSlNPTikge1xuICAgIHZhciBzaXRlbWFwT2JqID0gSlNPTi5wYXJzZShzaXRlbWFwSlNPTilcbiAgICB0aGlzLmluaXREYXRhKHNpdGVtYXBPYmopXG4gIH0sXG5cdC8vIHJldHVybiBhIGxpc3Qgb2YgY29sdW1ucyB0aGFuIGNhbiBiZSBleHBvcnRlZFxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHZhciBjb2x1bW5zID0gW11cbiAgICB0aGlzLnNlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgY29sdW1ucyA9IGNvbHVtbnMuY29uY2F0KHNlbGVjdG9yLmdldERhdGFDb2x1bW5zKCkpXG4gICAgfSlcblxuICAgIHJldHVybiBjb2x1bW5zXG4gIH0sXG4gIGdldERhdGFFeHBvcnRDc3ZCbG9iOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHZhciBjb2x1bW5zID0gdGhpcy5nZXREYXRhQ29sdW1ucygpLFxuICAgICAgZGVsaW1pdGVyID0gJywnLFxuICAgICAgbmV3bGluZSA9ICdcXG4nLFxuICAgICAgY3N2RGF0YSA9IFsnXFx1ZmVmZiddIC8vIHV0Zi04IGJvbSBjaGFyXG5cblx0XHQvLyBoZWFkZXJcbiAgICBjc3ZEYXRhLnB1c2goY29sdW1ucy5qb2luKGRlbGltaXRlcikgKyBuZXdsaW5lKVxuXG5cdFx0Ly8gZGF0YVxuICAgIGRhdGEuZm9yRWFjaChmdW5jdGlvbiAocm93KSB7XG4gICAgICB2YXIgcm93RGF0YSA9IFtdXG4gICAgICBjb2x1bW5zLmZvckVhY2goZnVuY3Rpb24gKGNvbHVtbikge1xuICAgICAgICB2YXIgY2VsbERhdGEgPSByb3dbY29sdW1uXVxuICAgICAgICBpZiAoY2VsbERhdGEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNlbGxEYXRhID0gJydcbiAgICAgICAgfVx0XHRcdFx0ZWxzZSBpZiAodHlwZW9mIGNlbGxEYXRhID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgIGNlbGxEYXRhID0gSlNPTi5zdHJpbmdpZnkoY2VsbERhdGEpXG4gICAgICAgIH1cblxuICAgICAgICByb3dEYXRhLnB1c2goJ1wiJyArIGNlbGxEYXRhLnJlcGxhY2UoL1wiL2csICdcIlwiJykudHJpbSgpICsgJ1wiJylcbiAgICAgIH0pXG4gICAgICBjc3ZEYXRhLnB1c2gocm93RGF0YS5qb2luKGRlbGltaXRlcikgKyBuZXdsaW5lKVxuICAgIH0pXG5cbiAgICByZXR1cm4gbmV3IEJsb2IoY3N2RGF0YSwge3R5cGU6ICd0ZXh0L2Nzdid9KVxuICB9LFxuICBnZXRTZWxlY3RvckJ5SWQ6IGZ1bmN0aW9uIChzZWxlY3RvcklkKSB7XG4gICAgcmV0dXJuIHRoaXMuc2VsZWN0b3JzLmdldFNlbGVjdG9yQnlJZChzZWxlY3RvcklkKVxuICB9LFxuXHQvKipcblx0ICogQ3JlYXRlIGZ1bGwgY2xvbmUgb2Ygc2l0ZW1hcFxuXHQgKiBAcmV0dXJucyB7U2l0ZW1hcH1cblx0ICovXG4gIGNsb25lOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICB2YXIgY2xvbmVkSlNPTiA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcykpXG4gICAgdmFyIHNpdGVtYXAgPSBuZXcgU2l0ZW1hcChjbG9uZWRKU09OLCB7JH0pXG4gICAgcmV0dXJuIHNpdGVtYXBcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNpdGVtYXBcbiIsInZhciBTaXRlbWFwID0gcmVxdWlyZSgnLi9TaXRlbWFwJylcblxuLyoqXG4gKiBGcm9tIGRldnRvb2xzIHBhbmVsIHRoZXJlIGlzIG5vIHBvc3NpYmlsaXR5IHRvIGV4ZWN1dGUgWEhSIHJlcXVlc3RzLiBTbyBhbGwgcmVxdWVzdHMgdG8gYSByZW1vdGUgQ291Y2hEYiBtdXN0IGJlXG4gKiBoYW5kbGVkIHRocm91Z2ggQmFja2dyb3VuZCBwYWdlLiBTdG9yZURldnRvb2xzIGlzIGEgc2ltcGx5IGEgcHJveHkgc3RvcmVcbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgU3RvcmVEZXZ0b29scyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIHRoaXMuJCA9IG9wdGlvbnMuJFxuICBpZiAoIXRoaXMuJCkgdGhyb3cgbmV3IEVycm9yKCdqcXVlcnkgcmVxdWlyZWQnKVxufVxuXG5TdG9yZURldnRvb2xzLnByb3RvdHlwZSA9IHtcbiAgY3JlYXRlU2l0ZW1hcDogZnVuY3Rpb24gKHNpdGVtYXAsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICBjcmVhdGVTaXRlbWFwOiB0cnVlLFxuICAgICAgc2l0ZW1hcDogSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzaXRlbWFwKSlcbiAgICB9XG5cbiAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZShyZXF1ZXN0LCBmdW5jdGlvbiAoY2FsbGJhY2tGbiwgb3JpZ2luYWxTaXRlbWFwLCBuZXdTaXRlbWFwKSB7XG4gICAgICBvcmlnaW5hbFNpdGVtYXAuX3JldiA9IG5ld1NpdGVtYXAuX3JldlxuICAgICAgY2FsbGJhY2tGbihvcmlnaW5hbFNpdGVtYXApXG4gICAgfS5iaW5kKHRoaXMsIGNhbGxiYWNrLCBzaXRlbWFwKSlcbiAgfSxcbiAgc2F2ZVNpdGVtYXA6IGZ1bmN0aW9uIChzaXRlbWFwLCBjYWxsYmFjaykge1xuICAgIHRoaXMuY3JlYXRlU2l0ZW1hcChzaXRlbWFwLCBjYWxsYmFjaylcbiAgfSxcbiAgZGVsZXRlU2l0ZW1hcDogZnVuY3Rpb24gKHNpdGVtYXAsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICBkZWxldGVTaXRlbWFwOiB0cnVlLFxuICAgICAgc2l0ZW1hcDogSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzaXRlbWFwKSlcbiAgICB9XG4gICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UocmVxdWVzdCwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICBjYWxsYmFjaygpXG4gICAgfSlcbiAgfSxcbiAgZ2V0QWxsU2l0ZW1hcHM6IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICBnZXRBbGxTaXRlbWFwczogdHJ1ZVxuICAgIH1cblxuICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHJlcXVlc3QsIGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgdmFyIHNpdGVtYXBzID0gW11cblxuICAgICAgZm9yICh2YXIgaSBpbiByZXNwb25zZSkge1xuICAgICAgICBzaXRlbWFwcy5wdXNoKG5ldyBTaXRlbWFwKHJlc3BvbnNlW2ldLCB7JH0pKVxuICAgICAgfVxuICAgICAgY2FsbGJhY2soc2l0ZW1hcHMpXG4gICAgfSlcbiAgfSxcbiAgZ2V0U2l0ZW1hcERhdGE6IGZ1bmN0aW9uIChzaXRlbWFwLCBjYWxsYmFjaykge1xuICAgIHZhciByZXF1ZXN0ID0ge1xuICAgICAgZ2V0U2l0ZW1hcERhdGE6IHRydWUsXG4gICAgICBzaXRlbWFwOiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHNpdGVtYXApKVxuICAgIH1cblxuICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHJlcXVlc3QsIGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgY2FsbGJhY2socmVzcG9uc2UpXG4gICAgfSlcbiAgfSxcbiAgc2l0ZW1hcEV4aXN0czogZnVuY3Rpb24gKHNpdGVtYXBJZCwgY2FsbGJhY2spIHtcbiAgICB2YXIgcmVxdWVzdCA9IHtcbiAgICAgIHNpdGVtYXBFeGlzdHM6IHRydWUsXG4gICAgICBzaXRlbWFwSWQ6IHNpdGVtYXBJZFxuICAgIH1cblxuICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHJlcXVlc3QsIGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgY2FsbGJhY2socmVzcG9uc2UpXG4gICAgfSlcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFN0b3JlRGV2dG9vbHNcbiIsInZhciBDc3NTZWxlY3RvciA9IHJlcXVpcmUoJ2Nzcy1zZWxlY3RvcicpLkNzc1NlbGVjdG9yXG4vLyBUT0RPIGdldCByaWQgb2YganF1ZXJ5XG5cbi8qKlxuICogT25seSBFbGVtZW50cyB1bmlxdWUgd2lsbCBiZSBhZGRlZCB0byB0aGlzIGFycmF5XG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gVW5pcXVlRWxlbWVudExpc3QgKGNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlLCBvcHRpb25zKSB7XG4gIHRoaXMuJCA9IG9wdGlvbnMuJFxuICBpZiAoIXRoaXMuJCkgdGhyb3cgbmV3IEVycm9yKCdqcXVlcnkgcmVxdWlyZWQnKVxuICB0aGlzLmNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlID0gY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGVcbiAgdGhpcy5hZGRlZEVsZW1lbnRzID0ge31cbn1cblxuVW5pcXVlRWxlbWVudExpc3QucHJvdG90eXBlID0gW11cblxuVW5pcXVlRWxlbWVudExpc3QucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICB2YXIgJCA9IHRoaXMuJFxuICBpZiAodGhpcy5pc0FkZGVkKGVsZW1lbnQpKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0gZWxzZSB7XG4gICAgdmFyIGVsZW1lbnRVbmlxdWVJZCA9IHRoaXMuZ2V0RWxlbWVudFVuaXF1ZUlkKGVsZW1lbnQpXG4gICAgdGhpcy5hZGRlZEVsZW1lbnRzW2VsZW1lbnRVbmlxdWVJZF0gPSB0cnVlXG4gICAgQXJyYXkucHJvdG90eXBlLnB1c2guY2FsbCh0aGlzLCAkKGVsZW1lbnQpLmNsb25lKHRydWUpWzBdKVxuICAgIHJldHVybiB0cnVlXG4gIH1cbn1cblxuVW5pcXVlRWxlbWVudExpc3QucHJvdG90eXBlLmdldEVsZW1lbnRVbmlxdWVJZCA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gIHZhciAkID0gdGhpcy4kXG4gIGlmICh0aGlzLmNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlID09PSAndW5pcXVlVGV4dCcpIHtcbiAgICB2YXIgZWxlbWVudFRleHQgPSAkKGVsZW1lbnQpLnRleHQoKS50cmltKClcbiAgICByZXR1cm4gZWxlbWVudFRleHRcbiAgfSBlbHNlIGlmICh0aGlzLmNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlID09PSAndW5pcXVlSFRNTFRleHQnKSB7XG4gICAgdmFyIGVsZW1lbnRIVE1MID0gJChcIjxkaXYgY2xhc3M9Jy13ZWItc2NyYXBlci1zaG91bGQtbm90LWJlLXZpc2libGUnPlwiKS5hcHBlbmQoJChlbGVtZW50KS5lcSgwKS5jbG9uZSgpKS5odG1sKClcbiAgICByZXR1cm4gZWxlbWVudEhUTUxcbiAgfSBlbHNlIGlmICh0aGlzLmNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlID09PSAndW5pcXVlSFRNTCcpIHtcblx0XHQvLyBnZXQgZWxlbWVudCB3aXRob3V0IHRleHRcbiAgICB2YXIgJGVsZW1lbnQgPSAkKGVsZW1lbnQpLmVxKDApLmNsb25lKClcblxuICAgIHZhciByZW1vdmVUZXh0ID0gZnVuY3Rpb24gKCRlbGVtZW50KSB7XG4gICAgICAkZWxlbWVudC5jb250ZW50cygpXG5cdFx0XHRcdC5maWx0ZXIoZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5ub2RlVHlwZSAhPT0gMykge1xuICAgIHJlbW92ZVRleHQoJCh0aGlzKSlcbiAgfVxuICByZXR1cm4gdGhpcy5ub2RlVHlwZSA9PSAzIC8vIE5vZGUuVEVYVF9OT0RFXG59KS5yZW1vdmUoKVxuICAgIH1cbiAgICByZW1vdmVUZXh0KCRlbGVtZW50KVxuXG4gICAgdmFyIGVsZW1lbnRIVE1MID0gJChcIjxkaXYgY2xhc3M9Jy13ZWItc2NyYXBlci1zaG91bGQtbm90LWJlLXZpc2libGUnPlwiKS5hcHBlbmQoJGVsZW1lbnQpLmh0bWwoKVxuICAgIHJldHVybiBlbGVtZW50SFRNTFxuICB9IGVsc2UgaWYgKHRoaXMuY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUgPT09ICd1bmlxdWVDU1NTZWxlY3RvcicpIHtcbiAgICB2YXIgY3MgPSBuZXcgQ3NzU2VsZWN0b3Ioe1xuICAgICAgZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yOiBmYWxzZSxcbiAgICAgIHBhcmVudDogJCgnYm9keScpWzBdLFxuICAgICAgZW5hYmxlUmVzdWx0U3RyaXBwaW5nOiBmYWxzZVxuICAgIH0pXG4gICAgdmFyIENTU1NlbGVjdG9yID0gY3MuZ2V0Q3NzU2VsZWN0b3IoW2VsZW1lbnRdKVxuICAgIHJldHVybiBDU1NTZWxlY3RvclxuICB9IGVsc2Uge1xuICAgIHRocm93ICdJbnZhbGlkIGNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlICcgKyB0aGlzLmNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBVbmlxdWVFbGVtZW50TGlzdFxuXG5VbmlxdWVFbGVtZW50TGlzdC5wcm90b3R5cGUuaXNBZGRlZCA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gIHZhciBlbGVtZW50VW5pcXVlSWQgPSB0aGlzLmdldEVsZW1lbnRVbmlxdWVJZChlbGVtZW50KVxuICB2YXIgaXNBZGRlZCA9IGVsZW1lbnRVbmlxdWVJZCBpbiB0aGlzLmFkZGVkRWxlbWVudHNcbiAgcmV0dXJuIGlzQWRkZWRcbn1cbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxudmFyIEJhY2tncm91bmRTY3JpcHQgPSByZXF1aXJlKCcuL0JhY2tncm91bmRTY3JpcHQnKVxuLyoqXG4gKiBAcGFyYW0gbG9jYXRpb25cdGNvbmZpZ3VyZSBmcm9tIHdoZXJlIHRoZSBjb250ZW50IHNjcmlwdCBpcyBiZWluZyBhY2Nlc3NlZCAoQ29udGVudFNjcmlwdCwgQmFja2dyb3VuZFBhZ2UsIERldlRvb2xzKVxuICogQHJldHVybnMgQmFja2dyb3VuZFNjcmlwdFxuICovXG52YXIgZ2V0QmFja2dyb3VuZFNjcmlwdCA9IGZ1bmN0aW9uIChsb2NhdGlvbikge1xuICAvLyBIYW5kbGUgY2FsbHMgZnJvbSBkaWZmZXJlbnQgcGxhY2VzXG4gIGlmIChsb2NhdGlvbiA9PT0gJ0JhY2tncm91bmRTY3JpcHQnKSB7XG4gICAgcmV0dXJuIEJhY2tncm91bmRTY3JpcHRcbiAgfSBlbHNlIGlmIChsb2NhdGlvbiA9PT0gJ0RldlRvb2xzJyB8fCBsb2NhdGlvbiA9PT0gJ0NvbnRlbnRTY3JpcHQnKSB7XG4gICAgLy8gaWYgY2FsbGVkIHdpdGhpbiBiYWNrZ3JvdW5kIHNjcmlwdCBwcm94eSBjYWxscyB0byBjb250ZW50IHNjcmlwdFxuICAgIHZhciBiYWNrZ3JvdW5kU2NyaXB0ID0ge31cblxuICAgIE9iamVjdC5rZXlzKEJhY2tncm91bmRTY3JpcHQpLmZvckVhY2goZnVuY3Rpb24gKGF0dHIpIHtcbiAgICAgIGlmICh0eXBlb2YgQmFja2dyb3VuZFNjcmlwdFthdHRyXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBiYWNrZ3JvdW5kU2NyaXB0W2F0dHJdID0gZnVuY3Rpb24gKHJlcXVlc3QpIHtcbiAgICAgICAgICB2YXIgcmVxVG9CYWNrZ3JvdW5kU2NyaXB0ID0ge1xuICAgICAgICAgICAgYmFja2dyb3VuZFNjcmlwdENhbGw6IHRydWUsXG4gICAgICAgICAgICBmbjogYXR0cixcbiAgICAgICAgICAgIHJlcXVlc3Q6IHJlcXVlc3RcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZShyZXFUb0JhY2tncm91bmRTY3JpcHQsIGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKHJlc3BvbnNlKVxuICAgICAgICAgIH0pXG5cbiAgICAgICAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBiYWNrZ3JvdW5kU2NyaXB0W2F0dHJdID0gQmFja2dyb3VuZFNjcmlwdFthdHRyXVxuICAgICAgfVxuICAgIH0pXG5cbiAgICByZXR1cm4gYmFja2dyb3VuZFNjcmlwdFxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBCYWNrZ3JvdW5kU2NyaXB0IGluaXRpYWxpemF0aW9uIC0gJyArIGxvY2F0aW9uKVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0QmFja2dyb3VuZFNjcmlwdFxuIiwidmFyIGdldEJhY2tncm91bmRTY3JpcHQgPSByZXF1aXJlKCcuL2dldEJhY2tncm91bmRTY3JpcHQnKVxudmFyIENvbnRlbnRTY3JpcHQgPSByZXF1aXJlKCcuL0NvbnRlbnRTY3JpcHQnKVxuLyoqXG4gKlxuICogQHBhcmFtIGxvY2F0aW9uXHRjb25maWd1cmUgZnJvbSB3aGVyZSB0aGUgY29udGVudCBzY3JpcHQgaXMgYmVpbmcgYWNjZXNzZWQgKENvbnRlbnRTY3JpcHQsIEJhY2tncm91bmRQYWdlLCBEZXZUb29scylcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiBAcmV0dXJucyBDb250ZW50U2NyaXB0XG4gKi9cbnZhciBnZXRDb250ZW50U2NyaXB0ID0gZnVuY3Rpb24gKGxvY2F0aW9uKSB7XG4gIHZhciBjb250ZW50U2NyaXB0XG5cbiAgLy8gSGFuZGxlIGNhbGxzIGZyb20gZGlmZmVyZW50IHBsYWNlc1xuICBpZiAobG9jYXRpb24gPT09ICdDb250ZW50U2NyaXB0Jykge1xuICAgIGNvbnRlbnRTY3JpcHQgPSBDb250ZW50U2NyaXB0XG4gICAgY29udGVudFNjcmlwdC5iYWNrZ3JvdW5kU2NyaXB0ID0gZ2V0QmFja2dyb3VuZFNjcmlwdCgnQ29udGVudFNjcmlwdCcpXG4gICAgcmV0dXJuIGNvbnRlbnRTY3JpcHRcbiAgfSBlbHNlIGlmIChsb2NhdGlvbiA9PT0gJ0JhY2tncm91bmRTY3JpcHQnIHx8IGxvY2F0aW9uID09PSAnRGV2VG9vbHMnKSB7XG4gICAgdmFyIGJhY2tncm91bmRTY3JpcHQgPSBnZXRCYWNrZ3JvdW5kU2NyaXB0KGxvY2F0aW9uKVxuXG4gICAgLy8gaWYgY2FsbGVkIHdpdGhpbiBiYWNrZ3JvdW5kIHNjcmlwdCBwcm94eSBjYWxscyB0byBjb250ZW50IHNjcmlwdFxuICAgIGNvbnRlbnRTY3JpcHQgPSB7fVxuICAgIE9iamVjdC5rZXlzKENvbnRlbnRTY3JpcHQpLmZvckVhY2goZnVuY3Rpb24gKGF0dHIpIHtcbiAgICAgIGlmICh0eXBlb2YgQ29udGVudFNjcmlwdFthdHRyXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBjb250ZW50U2NyaXB0W2F0dHJdID0gZnVuY3Rpb24gKHJlcXVlc3QpIHtcbiAgICAgICAgICB2YXIgcmVxVG9Db250ZW50U2NyaXB0ID0ge1xuICAgICAgICAgICAgY29udGVudFNjcmlwdENhbGw6IHRydWUsXG4gICAgICAgICAgICBmbjogYXR0cixcbiAgICAgICAgICAgIHJlcXVlc3Q6IHJlcXVlc3RcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gYmFja2dyb3VuZFNjcmlwdC5leGVjdXRlQ29udGVudFNjcmlwdChyZXFUb0NvbnRlbnRTY3JpcHQpXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnRlbnRTY3JpcHRbYXR0cl0gPSBDb250ZW50U2NyaXB0W2F0dHJdXG4gICAgICB9XG4gICAgfSlcbiAgICBjb250ZW50U2NyaXB0LmJhY2tncm91bmRTY3JpcHQgPSBiYWNrZ3JvdW5kU2NyaXB0XG4gICAgcmV0dXJuIGNvbnRlbnRTY3JpcHRcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgQ29udGVudFNjcmlwdCBpbml0aWFsaXphdGlvbiAtICcgKyBsb2NhdGlvbilcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdldENvbnRlbnRTY3JpcHRcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHRDc3NTZWxlY3Rvcixcblx0RWxlbWVudFNlbGVjdG9yLFxuXHRFbGVtZW50U2VsZWN0b3JMaXN0XG59XG5cblxuZnVuY3Rpb24gQ3NzU2VsZWN0b3IgKG9wdGlvbnMpIHtcblxuXHR2YXIgbWUgPSB0aGlzO1xuXG5cdC8vIGRlZmF1bHRzXG5cdHRoaXMuaWdub3JlZFRhZ3MgPSBbJ2ZvbnQnLCAnYicsICdpJywgJ3MnXTtcblx0dGhpcy5wYXJlbnQgPSBvcHRpb25zLmRvY3VtZW50IHx8IG9wdGlvbnMucGFyZW50XG5cdHRoaXMuZG9jdW1lbnQgPSBvcHRpb25zLmRvY3VtZW50IHx8IG9wdGlvbnMucGFyZW50IFxuXHR0aGlzLmlnbm9yZWRDbGFzc0Jhc2UgPSBmYWxzZTtcblx0dGhpcy5lbmFibGVSZXN1bHRTdHJpcHBpbmcgPSB0cnVlO1xuXHR0aGlzLmVuYWJsZVNtYXJ0VGFibGVTZWxlY3RvciA9IGZhbHNlO1xuXHR0aGlzLmlnbm9yZWRDbGFzc2VzID0gW107XG4gICAgdGhpcy5hbGxvd011bHRpcGxlU2VsZWN0b3JzID0gZmFsc2U7XG5cdHRoaXMucXVlcnkgPSBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcblx0XHRyZXR1cm4gbWUucGFyZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuXHR9O1xuXG5cdC8vIG92ZXJyaWRlcyBkZWZhdWx0cyB3aXRoIG9wdGlvbnNcblx0Zm9yICh2YXIgaSBpbiBvcHRpb25zKSB7XG5cdFx0dGhpc1tpXSA9IG9wdGlvbnNbaV07XG5cdH1cbn07XG5cbi8vIFRPRE8gcmVmYWN0b3IgZWxlbWVudCBzZWxlY3RvciBsaXN0IGludG8gYSB+IGNsYXNzXG5mdW5jdGlvbiBFbGVtZW50U2VsZWN0b3IgKGVsZW1lbnQsIGlnbm9yZWRDbGFzc2VzKSB7XG5cblx0dGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblx0dGhpcy5pc0RpcmVjdENoaWxkID0gdHJ1ZTtcblx0dGhpcy50YWcgPSBlbGVtZW50LmxvY2FsTmFtZTtcblx0dGhpcy50YWcgPSB0aGlzLnRhZy5yZXBsYWNlKC86L2csICdcXFxcOicpO1xuXG5cdC8vIG50aC1vZi1jaGlsZChuKzEpXG5cdHRoaXMuaW5kZXhuID0gbnVsbDtcblx0dGhpcy5pbmRleCA9IDE7XG5cdHRoaXMuaWQgPSBudWxsO1xuXHR0aGlzLmNsYXNzZXMgPSBuZXcgQXJyYXkoKTtcblxuXHQvLyBkbyBub3QgYWRkIGFkZGl0aW5hbCBpbmZvIHRvIGh0bWwsIGJvZHkgdGFncy5cblx0Ly8gaHRtbDpudGgtb2YtdHlwZSgxKSBjYW5ub3QgYmUgc2VsZWN0ZWRcblx0aWYodGhpcy50YWcgPT09ICdodG1sJyB8fCB0aGlzLnRhZyA9PT0gJ0hUTUwnXG5cdFx0fHwgdGhpcy50YWcgPT09ICdib2R5JyB8fCB0aGlzLnRhZyA9PT0gJ0JPRFknKSB7XG5cdFx0dGhpcy5pbmRleCA9IG51bGw7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0aWYgKGVsZW1lbnQucGFyZW50Tm9kZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0Ly8gbnRoLWNoaWxkXG5cdFx0Ly90aGlzLmluZGV4ID0gW10uaW5kZXhPZi5jYWxsKGVsZW1lbnQucGFyZW50Tm9kZS5jaGlsZHJlbiwgZWxlbWVudCkrMTtcblxuXHRcdC8vIG50aC1vZi10eXBlXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50LnBhcmVudE5vZGUuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBjaGlsZCA9IGVsZW1lbnQucGFyZW50Tm9kZS5jaGlsZHJlbltpXTtcblx0XHRcdGlmIChjaGlsZCA9PT0gZWxlbWVudCkge1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHRcdGlmIChjaGlsZC50YWdOYW1lID09PSBlbGVtZW50LnRhZ05hbWUpIHtcblx0XHRcdFx0dGhpcy5pbmRleCsrO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGlmIChlbGVtZW50LmlkICE9PSAnJykge1xuXHRcdGlmICh0eXBlb2YgZWxlbWVudC5pZCA9PT0gJ3N0cmluZycpIHtcblx0XHRcdHRoaXMuaWQgPSBlbGVtZW50LmlkO1xuXHRcdFx0dGhpcy5pZCA9IHRoaXMuaWQucmVwbGFjZSgvOi9nLCAnXFxcXDonKTtcblx0XHR9XG5cdH1cblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnQuY2xhc3NMaXN0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIGNjbGFzcyA9IGVsZW1lbnQuY2xhc3NMaXN0W2ldO1xuXHRcdGlmIChpZ25vcmVkQ2xhc3Nlcy5pbmRleE9mKGNjbGFzcykgPT09IC0xKSB7XG5cdFx0XHRjY2xhc3MgPSBjY2xhc3MucmVwbGFjZSgvOi9nLCAnXFxcXDonKTtcblx0XHRcdHRoaXMuY2xhc3Nlcy5wdXNoKGNjbGFzcyk7XG5cdFx0fVxuXHR9XG59O1xuXG5mdW5jdGlvbiBFbGVtZW50U2VsZWN0b3JMaXN0IChDc3NTZWxlY3Rvcikge1xuXHR0aGlzLkNzc1NlbGVjdG9yID0gQ3NzU2VsZWN0b3I7XG59O1xuXG5FbGVtZW50U2VsZWN0b3JMaXN0LnByb3RvdHlwZSA9IG5ldyBBcnJheSgpO1xuXG5FbGVtZW50U2VsZWN0b3JMaXN0LnByb3RvdHlwZS5nZXRDc3NTZWxlY3RvciA9IGZ1bmN0aW9uICgpIHtcblxuXHR2YXIgcmVzdWx0U2VsZWN0b3JzID0gW107XG5cblx0Ly8gVEREXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBzZWxlY3RvciA9IHRoaXNbaV07XG5cblx0XHR2YXIgaXNGaXJzdFNlbGVjdG9yID0gaSA9PT0gdGhpcy5sZW5ndGgtMTtcblx0XHR2YXIgcmVzdWx0U2VsZWN0b3IgPSBzZWxlY3Rvci5nZXRDc3NTZWxlY3Rvcihpc0ZpcnN0U2VsZWN0b3IpO1xuXG5cdFx0aWYgKHRoaXMuQ3NzU2VsZWN0b3IuZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yKSB7XG5cdFx0XHRpZiAoc2VsZWN0b3IudGFnID09PSAndHInKSB7XG5cdFx0XHRcdGlmIChzZWxlY3Rvci5lbGVtZW50LmNoaWxkcmVuLmxlbmd0aCA9PT0gMikge1xuXHRcdFx0XHRcdGlmIChzZWxlY3Rvci5lbGVtZW50LmNoaWxkcmVuWzBdLnRhZ05hbWUgPT09ICdURCdcblx0XHRcdFx0XHRcdHx8IHNlbGVjdG9yLmVsZW1lbnQuY2hpbGRyZW5bMF0udGFnTmFtZSA9PT0gJ1RIJ1xuXHRcdFx0XHRcdFx0fHwgc2VsZWN0b3IuZWxlbWVudC5jaGlsZHJlblswXS50YWdOYW1lID09PSAnVFInKSB7XG5cblx0XHRcdFx0XHRcdHZhciB0ZXh0ID0gc2VsZWN0b3IuZWxlbWVudC5jaGlsZHJlblswXS50ZXh0Q29udGVudDtcblx0XHRcdFx0XHRcdHRleHQgPSB0ZXh0LnRyaW0oKTtcblxuXHRcdFx0XHRcdFx0Ly8gZXNjYXBlIHF1b3Rlc1xuXHRcdFx0XHRcdFx0dGV4dC5yZXBsYWNlKC8oXFxcXCopKCcpL2csIGZ1bmN0aW9uICh4KSB7XG5cdFx0XHRcdFx0XHRcdHZhciBsID0geC5sZW5ndGg7XG5cdFx0XHRcdFx0XHRcdHJldHVybiAobCAlIDIpID8geCA6IHguc3Vic3RyaW5nKDAsIGwgLSAxKSArIFwiXFxcXCdcIjtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0cmVzdWx0U2VsZWN0b3IgKz0gXCI6Y29udGFpbnMoJ1wiICsgdGV4dCArIFwiJylcIjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXN1bHRTZWxlY3RvcnMucHVzaChyZXN1bHRTZWxlY3Rvcik7XG5cdH1cblxuXHR2YXIgcmVzdWx0Q1NTU2VsZWN0b3IgPSByZXN1bHRTZWxlY3RvcnMucmV2ZXJzZSgpLmpvaW4oJyAnKTtcblx0cmV0dXJuIHJlc3VsdENTU1NlbGVjdG9yO1xufTtcblxuRWxlbWVudFNlbGVjdG9yLnByb3RvdHlwZSA9IHtcblxuXHRnZXRDc3NTZWxlY3RvcjogZnVuY3Rpb24gKGlzRmlyc3RTZWxlY3Rvcikge1xuXG5cdFx0aWYoaXNGaXJzdFNlbGVjdG9yID09PSB1bmRlZmluZWQpIHtcblx0XHRcdGlzRmlyc3RTZWxlY3RvciA9IGZhbHNlO1xuXHRcdH1cblxuXHRcdHZhciBzZWxlY3RvciA9IHRoaXMudGFnO1xuXHRcdGlmICh0aGlzLmlkICE9PSBudWxsKSB7XG5cdFx0XHRzZWxlY3RvciArPSAnIycgKyB0aGlzLmlkO1xuXHRcdH1cblx0XHRpZiAodGhpcy5jbGFzc2VzLmxlbmd0aCkge1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmNsYXNzZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0c2VsZWN0b3IgKz0gXCIuXCIgKyB0aGlzLmNsYXNzZXNbaV07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmICh0aGlzLmluZGV4ICE9PSBudWxsKSB7XG5cdFx0XHRzZWxlY3RvciArPSAnOm50aC1vZi10eXBlKCcgKyB0aGlzLmluZGV4ICsgJyknO1xuXHRcdH1cblx0XHRpZiAodGhpcy5pbmRleG4gIT09IG51bGwgJiYgdGhpcy5pbmRleG4gIT09IC0xKSB7XG5cdFx0XHRzZWxlY3RvciArPSAnOm50aC1vZi10eXBlKG4rJyArIHRoaXMuaW5kZXhuICsgJyknO1xuXHRcdH1cblx0XHRpZih0aGlzLmlzRGlyZWN0Q2hpbGQgJiYgaXNGaXJzdFNlbGVjdG9yID09PSBmYWxzZSkge1xuXHRcdFx0c2VsZWN0b3IgPSBcIj4gXCIrc2VsZWN0b3I7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHNlbGVjdG9yO1xuXHR9LFxuXHQvLyBtZXJnZXMgdGhpcyBzZWxlY3RvciB3aXRoIGFub3RoZXIgb25lLlxuXHRtZXJnZTogZnVuY3Rpb24gKG1lcmdlU2VsZWN0b3IpIHtcblxuXHRcdGlmICh0aGlzLnRhZyAhPT0gbWVyZ2VTZWxlY3Rvci50YWcpIHtcblx0XHRcdHRocm93IFwiZGlmZmVyZW50IGVsZW1lbnQgc2VsZWN0ZWQgKHRhZylcIjtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5pbmRleCAhPT0gbnVsbCkge1xuXHRcdFx0aWYgKHRoaXMuaW5kZXggIT09IG1lcmdlU2VsZWN0b3IuaW5kZXgpIHtcblxuXHRcdFx0XHQvLyB1c2UgaW5kZXhuIG9ubHkgZm9yIHR3byBlbGVtZW50c1xuXHRcdFx0XHRpZiAodGhpcy5pbmRleG4gPT09IG51bGwpIHtcblx0XHRcdFx0XHR2YXIgaW5kZXhuID0gTWF0aC5taW4obWVyZ2VTZWxlY3Rvci5pbmRleCwgdGhpcy5pbmRleCk7XG5cdFx0XHRcdFx0aWYgKGluZGV4biA+IDEpIHtcblx0XHRcdFx0XHRcdHRoaXMuaW5kZXhuID0gTWF0aC5taW4obWVyZ2VTZWxlY3Rvci5pbmRleCwgdGhpcy5pbmRleCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHRoaXMuaW5kZXhuID0gLTE7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR0aGlzLmluZGV4ID0gbnVsbDtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZih0aGlzLmlzRGlyZWN0Q2hpbGQgPT09IHRydWUpIHtcblx0XHRcdHRoaXMuaXNEaXJlY3RDaGlsZCA9IG1lcmdlU2VsZWN0b3IuaXNEaXJlY3RDaGlsZDtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5pZCAhPT0gbnVsbCkge1xuXHRcdFx0aWYgKHRoaXMuaWQgIT09IG1lcmdlU2VsZWN0b3IuaWQpIHtcblx0XHRcdFx0dGhpcy5pZCA9IG51bGw7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2xhc3Nlcy5sZW5ndGggIT09IDApIHtcblx0XHRcdHZhciBjbGFzc2VzID0gbmV3IEFycmF5KCk7XG5cblx0XHRcdGZvciAodmFyIGkgaW4gdGhpcy5jbGFzc2VzKSB7XG5cdFx0XHRcdHZhciBjY2xhc3MgPSB0aGlzLmNsYXNzZXNbaV07XG5cdFx0XHRcdGlmIChtZXJnZVNlbGVjdG9yLmNsYXNzZXMuaW5kZXhPZihjY2xhc3MpICE9PSAtMSkge1xuXHRcdFx0XHRcdGNsYXNzZXMucHVzaChjY2xhc3MpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuY2xhc3NlcyA9IGNsYXNzZXM7XG5cdFx0fVxuXHR9XG59O1xuXG5Dc3NTZWxlY3Rvci5wcm90b3R5cGUgPSB7XG5cdG1lcmdlRWxlbWVudFNlbGVjdG9yczogZnVuY3Rpb24gKG5ld1NlbGVjb3JzKSB7XG5cblx0XHRpZiAobmV3U2VsZWNvcnMubGVuZ3RoIDwgMSkge1xuXHRcdFx0dGhyb3cgXCJObyBzZWxlY3RvcnMgc3BlY2lmaWVkXCI7XG5cdFx0fVxuXHRcdGVsc2UgaWYgKG5ld1NlbGVjb3JzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0cmV0dXJuIG5ld1NlbGVjb3JzWzBdO1xuXHRcdH1cblxuXHRcdC8vIGNoZWNrIHNlbGVjdG9yIHRvdGFsIGNvdW50XG5cdFx0dmFyIGVsZW1lbnRDb3VudEluU2VsZWN0b3IgPSBuZXdTZWxlY29yc1swXS5sZW5ndGg7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBuZXdTZWxlY29ycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHNlbGVjdG9yID0gbmV3U2VsZWNvcnNbaV07XG5cdFx0XHRpZiAoc2VsZWN0b3IubGVuZ3RoICE9PSBlbGVtZW50Q291bnRJblNlbGVjdG9yKSB7XG5cdFx0XHRcdHRocm93IFwiSW52YWxpZCBlbGVtZW50IGNvdW50IGluIHNlbGVjdG9yXCI7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gbWVyZ2Ugc2VsZWN0b3JzXG5cdFx0dmFyIHJlc3VsdGluZ0VsZW1lbnRzID0gbmV3U2VsZWNvcnNbMF07XG5cdFx0Zm9yICh2YXIgaSA9IDE7IGkgPCBuZXdTZWxlY29ycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIG1lcmdlRWxlbWVudHMgPSBuZXdTZWxlY29yc1tpXTtcblxuXHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBlbGVtZW50Q291bnRJblNlbGVjdG9yOyBqKyspIHtcblx0XHRcdFx0cmVzdWx0aW5nRWxlbWVudHNbal0ubWVyZ2UobWVyZ2VFbGVtZW50c1tqXSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHRpbmdFbGVtZW50cztcblx0fSxcblx0c3RyaXBTZWxlY3RvcjogZnVuY3Rpb24gKHNlbGVjdG9ycykge1xuXG5cdFx0dmFyIGNzc1NlbGV0b3IgPSBzZWxlY3RvcnMuZ2V0Q3NzU2VsZWN0b3IoKTtcblx0XHR2YXIgYmFzZVNlbGVjdGVkRWxlbWVudHMgPSB0aGlzLnF1ZXJ5KGNzc1NlbGV0b3IpO1xuXG5cdFx0dmFyIGNvbXBhcmVFbGVtZW50cyA9IGZ1bmN0aW9uIChlbGVtZW50cykge1xuXHRcdFx0aWYgKGJhc2VTZWxlY3RlZEVsZW1lbnRzLmxlbmd0aCAhPT0gZWxlbWVudHMubGVuZ3RoKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBiYXNlU2VsZWN0ZWRFbGVtZW50cy5sZW5ndGg7IGorKykge1xuXHRcdFx0XHRpZiAoW10uaW5kZXhPZi5jYWxsKGVsZW1lbnRzLCBiYXNlU2VsZWN0ZWRFbGVtZW50c1tqXSkgPT09IC0xKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9O1xuXHRcdC8vIHN0cmlwIGluZGV4ZXNcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHNlbGVjdG9ycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHNlbGVjdG9yID0gc2VsZWN0b3JzW2ldO1xuXHRcdFx0aWYgKHNlbGVjdG9yLmluZGV4ICE9PSBudWxsKSB7XG5cdFx0XHRcdHZhciBpbmRleCA9IHNlbGVjdG9yLmluZGV4O1xuXHRcdFx0XHRzZWxlY3Rvci5pbmRleCA9IG51bGw7XG5cdFx0XHRcdHZhciBjc3NTZWxldG9yID0gc2VsZWN0b3JzLmdldENzc1NlbGVjdG9yKCk7XG5cdFx0XHRcdHZhciBuZXdTZWxlY3RlZEVsZW1lbnRzID0gdGhpcy5xdWVyeShjc3NTZWxldG9yKTtcblx0XHRcdFx0Ly8gaWYgcmVzdWx0cyBkb2Vzbid0IG1hdGNoIHRoZW4gdW5kbyBjaGFuZ2VzXG5cdFx0XHRcdGlmICghY29tcGFyZUVsZW1lbnRzKG5ld1NlbGVjdGVkRWxlbWVudHMpKSB7XG5cdFx0XHRcdFx0c2VsZWN0b3IuaW5kZXggPSBpbmRleDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIHN0cmlwIGlzRGlyZWN0Q2hpbGRcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHNlbGVjdG9ycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHNlbGVjdG9yID0gc2VsZWN0b3JzW2ldO1xuXHRcdFx0aWYgKHNlbGVjdG9yLmlzRGlyZWN0Q2hpbGQgPT09IHRydWUpIHtcblx0XHRcdFx0c2VsZWN0b3IuaXNEaXJlY3RDaGlsZCA9IGZhbHNlO1xuXHRcdFx0XHR2YXIgY3NzU2VsZXRvciA9IHNlbGVjdG9ycy5nZXRDc3NTZWxlY3RvcigpO1xuXHRcdFx0XHR2YXIgbmV3U2VsZWN0ZWRFbGVtZW50cyA9IHRoaXMucXVlcnkoY3NzU2VsZXRvcik7XG5cdFx0XHRcdC8vIGlmIHJlc3VsdHMgZG9lc24ndCBtYXRjaCB0aGVuIHVuZG8gY2hhbmdlc1xuXHRcdFx0XHRpZiAoIWNvbXBhcmVFbGVtZW50cyhuZXdTZWxlY3RlZEVsZW1lbnRzKSkge1xuXHRcdFx0XHRcdHNlbGVjdG9yLmlzRGlyZWN0Q2hpbGQgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gc3RyaXAgaWRzXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzZWxlY3RvcnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBzZWxlY3RvciA9IHNlbGVjdG9yc1tpXTtcblx0XHRcdGlmIChzZWxlY3Rvci5pZCAhPT0gbnVsbCkge1xuXHRcdFx0XHR2YXIgaWQgPSBzZWxlY3Rvci5pZDtcblx0XHRcdFx0c2VsZWN0b3IuaWQgPSBudWxsO1xuXHRcdFx0XHR2YXIgY3NzU2VsZXRvciA9IHNlbGVjdG9ycy5nZXRDc3NTZWxlY3RvcigpO1xuXHRcdFx0XHR2YXIgbmV3U2VsZWN0ZWRFbGVtZW50cyA9IHRoaXMucXVlcnkoY3NzU2VsZXRvcik7XG5cdFx0XHRcdC8vIGlmIHJlc3VsdHMgZG9lc24ndCBtYXRjaCB0aGVuIHVuZG8gY2hhbmdlc1xuXHRcdFx0XHRpZiAoIWNvbXBhcmVFbGVtZW50cyhuZXdTZWxlY3RlZEVsZW1lbnRzKSkge1xuXHRcdFx0XHRcdHNlbGVjdG9yLmlkID0gaWQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBzdHJpcCBjbGFzc2VzXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzZWxlY3RvcnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBzZWxlY3RvciA9IHNlbGVjdG9yc1tpXTtcblx0XHRcdGlmIChzZWxlY3Rvci5jbGFzc2VzLmxlbmd0aCAhPT0gMCkge1xuXHRcdFx0XHRmb3IgKHZhciBqID0gc2VsZWN0b3IuY2xhc3Nlcy5sZW5ndGggLSAxOyBqID4gMDsgai0tKSB7XG5cdFx0XHRcdFx0dmFyIGNjbGFzcyA9IHNlbGVjdG9yLmNsYXNzZXNbal07XG5cdFx0XHRcdFx0c2VsZWN0b3IuY2xhc3Nlcy5zcGxpY2UoaiwgMSk7XG5cdFx0XHRcdFx0dmFyIGNzc1NlbGV0b3IgPSBzZWxlY3RvcnMuZ2V0Q3NzU2VsZWN0b3IoKTtcblx0XHRcdFx0XHR2YXIgbmV3U2VsZWN0ZWRFbGVtZW50cyA9IHRoaXMucXVlcnkoY3NzU2VsZXRvcik7XG5cdFx0XHRcdFx0Ly8gaWYgcmVzdWx0cyBkb2Vzbid0IG1hdGNoIHRoZW4gdW5kbyBjaGFuZ2VzXG5cdFx0XHRcdFx0aWYgKCFjb21wYXJlRWxlbWVudHMobmV3U2VsZWN0ZWRFbGVtZW50cykpIHtcblx0XHRcdFx0XHRcdHNlbGVjdG9yLmNsYXNzZXMuc3BsaWNlKGosIDAsIGNjbGFzcyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gc3RyaXAgdGFnc1xuXHRcdGZvciAodmFyIGkgPSBzZWxlY3RvcnMubGVuZ3RoIC0gMTsgaSA+IDA7IGktLSkge1xuXHRcdFx0dmFyIHNlbGVjdG9yID0gc2VsZWN0b3JzW2ldO1xuXHRcdFx0c2VsZWN0b3JzLnNwbGljZShpLCAxKTtcblx0XHRcdHZhciBjc3NTZWxldG9yID0gc2VsZWN0b3JzLmdldENzc1NlbGVjdG9yKCk7XG5cdFx0XHR2YXIgbmV3U2VsZWN0ZWRFbGVtZW50cyA9IHRoaXMucXVlcnkoY3NzU2VsZXRvcik7XG5cdFx0XHQvLyBpZiByZXN1bHRzIGRvZXNuJ3QgbWF0Y2ggdGhlbiB1bmRvIGNoYW5nZXNcblx0XHRcdGlmICghY29tcGFyZUVsZW1lbnRzKG5ld1NlbGVjdGVkRWxlbWVudHMpKSB7XG5cdFx0XHRcdHNlbGVjdG9ycy5zcGxpY2UoaSwgMCwgc2VsZWN0b3IpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBzZWxlY3RvcnM7XG5cdH0sXG5cdGdldEVsZW1lbnRTZWxlY3RvcnM6IGZ1bmN0aW9uIChlbGVtZW50cywgdG9wKSB7XG5cdFx0dmFyIGVsZW1lbnRTZWxlY3RvcnMgPSBbXTtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBlbGVtZW50ID0gZWxlbWVudHNbaV07XG5cdFx0XHR2YXIgZWxlbWVudFNlbGVjdG9yID0gdGhpcy5nZXRFbGVtZW50U2VsZWN0b3IoZWxlbWVudCwgdG9wKTtcblx0XHRcdGVsZW1lbnRTZWxlY3RvcnMucHVzaChlbGVtZW50U2VsZWN0b3IpO1xuXHRcdH1cblxuXHRcdHJldHVybiBlbGVtZW50U2VsZWN0b3JzO1xuXHR9LFxuXHRnZXRFbGVtZW50U2VsZWN0b3I6IGZ1bmN0aW9uIChlbGVtZW50LCB0b3ApIHtcblxuXHRcdHZhciBlbGVtZW50U2VsZWN0b3JMaXN0ID0gbmV3IEVsZW1lbnRTZWxlY3Rvckxpc3QodGhpcyk7XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdGlmIChlbGVtZW50ID09PSB0aGlzLnBhcmVudCkge1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKGVsZW1lbnQgPT09IHVuZGVmaW5lZCB8fCBlbGVtZW50ID09PSB0aGlzLmRvY3VtZW50KSB7XG5cdFx0XHRcdHRocm93ICdlbGVtZW50IGlzIG5vdCBhIGNoaWxkIG9mIHRoZSBnaXZlbiBwYXJlbnQnO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRoaXMuaXNJZ25vcmVkVGFnKGVsZW1lbnQudGFnTmFtZSkpIHtcblxuXHRcdFx0XHRlbGVtZW50ID0gZWxlbWVudC5wYXJlbnROb2RlO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblx0XHRcdGlmICh0b3AgPiAwKSB7XG5cdFx0XHRcdHRvcC0tO1xuXHRcdFx0XHRlbGVtZW50ID0gZWxlbWVudC5wYXJlbnROb2RlO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0dmFyIHNlbGVjdG9yID0gbmV3IEVsZW1lbnRTZWxlY3RvcihlbGVtZW50LCB0aGlzLmlnbm9yZWRDbGFzc2VzKTtcblx0XHRcdC8vIGRvY3VtZW50IGRvZXMgbm90IGhhdmUgYSB0YWdOYW1lXG5cdFx0XHRpZihlbGVtZW50LnBhcmVudE5vZGUgPT09IHRoaXMuZG9jdW1lbnQgfHwgdGhpcy5pc0lnbm9yZWRUYWcoZWxlbWVudC5wYXJlbnROb2RlLnRhZ05hbWUpKSB7XG5cdFx0XHRcdHNlbGVjdG9yLmlzRGlyZWN0Q2hpbGQgPSBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0ZWxlbWVudFNlbGVjdG9yTGlzdC5wdXNoKHNlbGVjdG9yKTtcblx0XHRcdGVsZW1lbnQgPSBlbGVtZW50LnBhcmVudE5vZGU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGVsZW1lbnRTZWxlY3Rvckxpc3Q7XG5cdH0sXG5cbiAgICAvKipcbiAgICAgKiBDb21wYXJlcyB3aGV0aGVyIHR3byBlbGVtZW50cyBhcmUgc2ltaWxhci4gU2ltaWxhciBlbGVtZW50cyBzaG91bGRcbiAgICAgKiBoYXZlIGEgY29tbW9uIHBhcnJlbnQgYW5kIGFsbCBwYXJlbnQgZWxlbWVudHMgc2hvdWxkIGJlIHRoZSBzYW1lIHR5cGUuXG4gICAgICogQHBhcmFtIGVsZW1lbnQxXG4gICAgICogQHBhcmFtIGVsZW1lbnQyXG4gICAgICovXG4gICAgY2hlY2tTaW1pbGFyRWxlbWVudHM6IGZ1bmN0aW9uKGVsZW1lbnQxLCBlbGVtZW50Mikge1xuXG4gICAgICAgIHdoaWxlICh0cnVlKSB7XG5cbiAgICAgICAgICAgIGlmKGVsZW1lbnQxLnRhZ05hbWUgIT09IGVsZW1lbnQyLnRhZ05hbWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZihlbGVtZW50MSA9PT0gZWxlbWVudDIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gc3RvcCBhdCBib2R5IHRhZ1xuICAgICAgICAgICAgaWYgKGVsZW1lbnQxID09PSB1bmRlZmluZWQgfHwgZWxlbWVudDEudGFnTmFtZSA9PT0gJ2JvZHknXG4gICAgICAgICAgICAgICAgfHwgZWxlbWVudDEudGFnTmFtZSA9PT0gJ0JPRFknKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGVsZW1lbnQyID09PSB1bmRlZmluZWQgfHwgZWxlbWVudDIudGFnTmFtZSA9PT0gJ2JvZHknXG4gICAgICAgICAgICAgICAgfHwgZWxlbWVudDIudGFnTmFtZSA9PT0gJ0JPRFknKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBlbGVtZW50MSA9IGVsZW1lbnQxLnBhcmVudE5vZGU7XG4gICAgICAgICAgICBlbGVtZW50MiA9IGVsZW1lbnQyLnBhcmVudE5vZGU7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR3JvdXBzIGVsZW1lbnRzIGludG8gZ3JvdXBzIGlmIHRoZSBlbWVsZW50cyBhcmUgbm90IHNpbWlsYXJcbiAgICAgKiBAcGFyYW0gZWxlbWVudHNcbiAgICAgKi9cbiAgICBnZXRFbGVtZW50R3JvdXBzOiBmdW5jdGlvbihlbGVtZW50cykge1xuXG4gICAgICAgIC8vIGZpcnN0IGVsbWVudCBpcyBpbiB0aGUgZmlyc3QgZ3JvdXBcbiAgICAgICAgLy8gQFRPRE8gbWF5YmUgaSBkb250IG5lZWQgdGhpcz9cbiAgICAgICAgdmFyIGdyb3VwcyA9IFtbZWxlbWVudHNbMF1dXTtcblxuICAgICAgICBmb3IodmFyIGkgPSAxOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBlbGVtZW50TmV3ID0gZWxlbWVudHNbaV07XG4gICAgICAgICAgICB2YXIgYWRkZWRUb0dyb3VwID0gZmFsc2U7XG4gICAgICAgICAgICBmb3IodmFyIGogPSAwOyBqIDwgZ3JvdXBzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGdyb3VwID0gZ3JvdXBzW2pdO1xuICAgICAgICAgICAgICAgIHZhciBlbGVtZW50R3JvdXAgPSBncm91cFswXTtcbiAgICAgICAgICAgICAgICBpZih0aGlzLmNoZWNrU2ltaWxhckVsZW1lbnRzKGVsZW1lbnROZXcsIGVsZW1lbnRHcm91cCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZ3JvdXAucHVzaChlbGVtZW50TmV3KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkZWRUb0dyb3VwID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBhZGQgbmV3IGdyb3VwXG4gICAgICAgICAgICBpZighYWRkZWRUb0dyb3VwKSB7XG4gICAgICAgICAgICAgICAgZ3JvdXBzLnB1c2goW2VsZW1lbnROZXddKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBncm91cHM7XG4gICAgfSxcblx0Z2V0Q3NzU2VsZWN0b3I6IGZ1bmN0aW9uIChlbGVtZW50cywgdG9wKSB7XG5cblx0XHR0b3AgPSB0b3AgfHwgMDtcblxuXHRcdHZhciBlbmFibGVTbWFydFRhYmxlU2VsZWN0b3IgPSB0aGlzLmVuYWJsZVNtYXJ0VGFibGVTZWxlY3Rvcjtcblx0XHRpZiAoZWxlbWVudHMubGVuZ3RoID4gMSkge1xuXHRcdFx0dGhpcy5lbmFibGVTbWFydFRhYmxlU2VsZWN0b3IgPSBmYWxzZTtcblx0XHR9XG5cbiAgICAgICAgLy8gZ3JvdXAgZWxlbWVudHMgaW50byBzaW1pbGFyaXR5IGdyb3Vwc1xuICAgICAgICB2YXIgZWxlbWVudEdyb3VwcyA9IHRoaXMuZ2V0RWxlbWVudEdyb3VwcyhlbGVtZW50cyk7XG5cbiAgICAgICAgdmFyIHJlc3VsdENTU1NlbGVjdG9yO1xuXG4gICAgICAgIGlmKHRoaXMuYWxsb3dNdWx0aXBsZVNlbGVjdG9ycykge1xuXG4gICAgICAgICAgICB2YXIgZ3JvdXBTZWxlY3RvcnMgPSBbXTtcblxuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGVsZW1lbnRHcm91cHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgZ3JvdXBFbGVtZW50cyA9IGVsZW1lbnRHcm91cHNbaV07XG5cbiAgICAgICAgICAgICAgICB2YXIgZWxlbWVudFNlbGVjdG9ycyA9IHRoaXMuZ2V0RWxlbWVudFNlbGVjdG9ycyhncm91cEVsZW1lbnRzLCB0b3ApO1xuICAgICAgICAgICAgICAgIHZhciByZXN1bHRTZWxlY3RvciA9IHRoaXMubWVyZ2VFbGVtZW50U2VsZWN0b3JzKGVsZW1lbnRTZWxlY3RvcnMpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmVuYWJsZVJlc3VsdFN0cmlwcGluZykge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRTZWxlY3RvciA9IHRoaXMuc3RyaXBTZWxlY3RvcihyZXN1bHRTZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZ3JvdXBTZWxlY3RvcnMucHVzaChyZXN1bHRTZWxlY3Rvci5nZXRDc3NTZWxlY3RvcigpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVzdWx0Q1NTU2VsZWN0b3IgPSBncm91cFNlbGVjdG9ycy5qb2luKCcsICcpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYoZWxlbWVudEdyb3Vwcy5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBcImZvdW5kIG11bHRpcGxlIGVsZW1lbnQgZ3JvdXBzLCBidXQgYWxsb3dNdWx0aXBsZVNlbGVjdG9ycyBkaXNhYmxlZFwiO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgZWxlbWVudFNlbGVjdG9ycyA9IHRoaXMuZ2V0RWxlbWVudFNlbGVjdG9ycyhlbGVtZW50cywgdG9wKTtcbiAgICAgICAgICAgIHZhciByZXN1bHRTZWxlY3RvciA9IHRoaXMubWVyZ2VFbGVtZW50U2VsZWN0b3JzKGVsZW1lbnRTZWxlY3RvcnMpO1xuICAgICAgICAgICAgaWYgKHRoaXMuZW5hYmxlUmVzdWx0U3RyaXBwaW5nKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0U2VsZWN0b3IgPSB0aGlzLnN0cmlwU2VsZWN0b3IocmVzdWx0U2VsZWN0b3IpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXN1bHRDU1NTZWxlY3RvciA9IHJlc3VsdFNlbGVjdG9yLmdldENzc1NlbGVjdG9yKCk7XG4gICAgICAgIH1cblxuXHRcdHRoaXMuZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yID0gZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yO1xuXG5cdFx0Ly8gc3RyaXAgZG93biBzZWxlY3RvclxuXHRcdHJldHVybiByZXN1bHRDU1NTZWxlY3Rvcjtcblx0fSxcblx0aXNJZ25vcmVkVGFnOiBmdW5jdGlvbiAodGFnKSB7XG5cdFx0cmV0dXJuIHRoaXMuaWdub3JlZFRhZ3MuaW5kZXhPZih0YWcudG9Mb3dlckNhc2UoKSkgIT09IC0xO1xuXHR9XG59O1xuIiwiXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vbGliL2pxdWVyeS1kZWZlcnJlZCcpOyIsInZhciBqUXVlcnkgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL2pxdWVyeS1jb3JlLmpzXCIpLFxuXHRjb3JlX3JzcGFjZSA9IC9cXHMrLztcbi8qKlxuKiBqUXVlcnkgQ2FsbGJhY2tzXG4qXG4qIENvZGUgZnJvbTogaHR0cHM6Ly9naXRodWIuY29tL2pxdWVyeS9qcXVlcnkvYmxvYi9tYXN0ZXIvc3JjL2NhbGxiYWNrcy5qc1xuKlxuKi9cblxuXG4vLyBTdHJpbmcgdG8gT2JqZWN0IG9wdGlvbnMgZm9ybWF0IGNhY2hlXG52YXIgb3B0aW9uc0NhY2hlID0ge307XG5cbi8vIENvbnZlcnQgU3RyaW5nLWZvcm1hdHRlZCBvcHRpb25zIGludG8gT2JqZWN0LWZvcm1hdHRlZCBvbmVzIGFuZCBzdG9yZSBpbiBjYWNoZVxuZnVuY3Rpb24gY3JlYXRlT3B0aW9ucyggb3B0aW9ucyApIHtcblx0dmFyIG9iamVjdCA9IG9wdGlvbnNDYWNoZVsgb3B0aW9ucyBdID0ge307XG5cdGpRdWVyeS5lYWNoKCBvcHRpb25zLnNwbGl0KCBjb3JlX3JzcGFjZSApLCBmdW5jdGlvbiggXywgZmxhZyApIHtcblx0XHRvYmplY3RbIGZsYWcgXSA9IHRydWU7XG5cdH0pO1xuXHRyZXR1cm4gb2JqZWN0O1xufVxuXG4vKlxuICogQ3JlYXRlIGEgY2FsbGJhY2sgbGlzdCB1c2luZyB0aGUgZm9sbG93aW5nIHBhcmFtZXRlcnM6XG4gKlxuICpcdG9wdGlvbnM6IGFuIG9wdGlvbmFsIGxpc3Qgb2Ygc3BhY2Utc2VwYXJhdGVkIG9wdGlvbnMgdGhhdCB3aWxsIGNoYW5nZSBob3dcbiAqXHRcdFx0dGhlIGNhbGxiYWNrIGxpc3QgYmVoYXZlcyBvciBhIG1vcmUgdHJhZGl0aW9uYWwgb3B0aW9uIG9iamVjdFxuICpcbiAqIEJ5IGRlZmF1bHQgYSBjYWxsYmFjayBsaXN0IHdpbGwgYWN0IGxpa2UgYW4gZXZlbnQgY2FsbGJhY2sgbGlzdCBhbmQgY2FuIGJlXG4gKiBcImZpcmVkXCIgbXVsdGlwbGUgdGltZXMuXG4gKlxuICogUG9zc2libGUgb3B0aW9uczpcbiAqXG4gKlx0b25jZTpcdFx0XHR3aWxsIGVuc3VyZSB0aGUgY2FsbGJhY2sgbGlzdCBjYW4gb25seSBiZSBmaXJlZCBvbmNlIChsaWtlIGEgRGVmZXJyZWQpXG4gKlxuICpcdG1lbW9yeTpcdFx0XHR3aWxsIGtlZXAgdHJhY2sgb2YgcHJldmlvdXMgdmFsdWVzIGFuZCB3aWxsIGNhbGwgYW55IGNhbGxiYWNrIGFkZGVkXG4gKlx0XHRcdFx0XHRhZnRlciB0aGUgbGlzdCBoYXMgYmVlbiBmaXJlZCByaWdodCBhd2F5IHdpdGggdGhlIGxhdGVzdCBcIm1lbW9yaXplZFwiXG4gKlx0XHRcdFx0XHR2YWx1ZXMgKGxpa2UgYSBEZWZlcnJlZClcbiAqXG4gKlx0dW5pcXVlOlx0XHRcdHdpbGwgZW5zdXJlIGEgY2FsbGJhY2sgY2FuIG9ubHkgYmUgYWRkZWQgb25jZSAobm8gZHVwbGljYXRlIGluIHRoZSBsaXN0KVxuICpcbiAqXHRzdG9wT25GYWxzZTpcdGludGVycnVwdCBjYWxsaW5ncyB3aGVuIGEgY2FsbGJhY2sgcmV0dXJucyBmYWxzZVxuICpcbiAqL1xualF1ZXJ5LkNhbGxiYWNrcyA9IGZ1bmN0aW9uKCBvcHRpb25zICkge1xuXG5cdC8vIENvbnZlcnQgb3B0aW9ucyBmcm9tIFN0cmluZy1mb3JtYXR0ZWQgdG8gT2JqZWN0LWZvcm1hdHRlZCBpZiBuZWVkZWRcblx0Ly8gKHdlIGNoZWNrIGluIGNhY2hlIGZpcnN0KVxuXHRvcHRpb25zID0gdHlwZW9mIG9wdGlvbnMgPT09IFwic3RyaW5nXCIgP1xuXHRcdCggb3B0aW9uc0NhY2hlWyBvcHRpb25zIF0gfHwgY3JlYXRlT3B0aW9ucyggb3B0aW9ucyApICkgOlxuXHRcdGpRdWVyeS5leHRlbmQoIHt9LCBvcHRpb25zICk7XG5cblx0dmFyIC8vIExhc3QgZmlyZSB2YWx1ZSAoZm9yIG5vbi1mb3JnZXR0YWJsZSBsaXN0cylcblx0XHRtZW1vcnksXG5cdFx0Ly8gRmxhZyB0byBrbm93IGlmIGxpc3Qgd2FzIGFscmVhZHkgZmlyZWRcblx0XHRmaXJlZCxcblx0XHQvLyBGbGFnIHRvIGtub3cgaWYgbGlzdCBpcyBjdXJyZW50bHkgZmlyaW5nXG5cdFx0ZmlyaW5nLFxuXHRcdC8vIEZpcnN0IGNhbGxiYWNrIHRvIGZpcmUgKHVzZWQgaW50ZXJuYWxseSBieSBhZGQgYW5kIGZpcmVXaXRoKVxuXHRcdGZpcmluZ1N0YXJ0LFxuXHRcdC8vIEVuZCBvZiB0aGUgbG9vcCB3aGVuIGZpcmluZ1xuXHRcdGZpcmluZ0xlbmd0aCxcblx0XHQvLyBJbmRleCBvZiBjdXJyZW50bHkgZmlyaW5nIGNhbGxiYWNrIChtb2RpZmllZCBieSByZW1vdmUgaWYgbmVlZGVkKVxuXHRcdGZpcmluZ0luZGV4LFxuXHRcdC8vIEFjdHVhbCBjYWxsYmFjayBsaXN0XG5cdFx0bGlzdCA9IFtdLFxuXHRcdC8vIFN0YWNrIG9mIGZpcmUgY2FsbHMgZm9yIHJlcGVhdGFibGUgbGlzdHNcblx0XHRzdGFjayA9ICFvcHRpb25zLm9uY2UgJiYgW10sXG5cdFx0Ly8gRmlyZSBjYWxsYmFja3Ncblx0XHRmaXJlID0gZnVuY3Rpb24oIGRhdGEgKSB7XG5cdFx0XHRtZW1vcnkgPSBvcHRpb25zLm1lbW9yeSAmJiBkYXRhO1xuXHRcdFx0ZmlyZWQgPSB0cnVlO1xuXHRcdFx0ZmlyaW5nSW5kZXggPSBmaXJpbmdTdGFydCB8fCAwO1xuXHRcdFx0ZmlyaW5nU3RhcnQgPSAwO1xuXHRcdFx0ZmlyaW5nTGVuZ3RoID0gbGlzdC5sZW5ndGg7XG5cdFx0XHRmaXJpbmcgPSB0cnVlO1xuXHRcdFx0Zm9yICggOyBsaXN0ICYmIGZpcmluZ0luZGV4IDwgZmlyaW5nTGVuZ3RoOyBmaXJpbmdJbmRleCsrICkge1xuXHRcdFx0XHRpZiAoIGxpc3RbIGZpcmluZ0luZGV4IF0uYXBwbHkoIGRhdGFbIDAgXSwgZGF0YVsgMSBdICkgPT09IGZhbHNlICYmIG9wdGlvbnMuc3RvcE9uRmFsc2UgKSB7XG5cdFx0XHRcdFx0bWVtb3J5ID0gZmFsc2U7IC8vIFRvIHByZXZlbnQgZnVydGhlciBjYWxscyB1c2luZyBhZGRcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0ZmlyaW5nID0gZmFsc2U7XG5cdFx0XHRpZiAoIGxpc3QgKSB7XG5cdFx0XHRcdGlmICggc3RhY2sgKSB7XG5cdFx0XHRcdFx0aWYgKCBzdGFjay5sZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRmaXJlKCBzdGFjay5zaGlmdCgpICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2UgaWYgKCBtZW1vcnkgKSB7XG5cdFx0XHRcdFx0bGlzdCA9IFtdO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHNlbGYuZGlzYWJsZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblx0XHQvLyBBY3R1YWwgQ2FsbGJhY2tzIG9iamVjdFxuXHRcdHNlbGYgPSB7XG5cdFx0XHQvLyBBZGQgYSBjYWxsYmFjayBvciBhIGNvbGxlY3Rpb24gb2YgY2FsbGJhY2tzIHRvIHRoZSBsaXN0XG5cdFx0XHRhZGQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAoIGxpc3QgKSB7XG5cdFx0XHRcdFx0Ly8gRmlyc3QsIHdlIHNhdmUgdGhlIGN1cnJlbnQgbGVuZ3RoXG5cdFx0XHRcdFx0dmFyIHN0YXJ0ID0gbGlzdC5sZW5ndGg7XG5cdFx0XHRcdFx0KGZ1bmN0aW9uIGFkZCggYXJncyApIHtcblx0XHRcdFx0XHRcdGpRdWVyeS5lYWNoKCBhcmdzLCBmdW5jdGlvbiggXywgYXJnICkge1xuXHRcdFx0XHRcdFx0XHR2YXIgdHlwZSA9IGpRdWVyeS50eXBlKCBhcmcgKTtcblx0XHRcdFx0XHRcdFx0aWYgKCB0eXBlID09PSBcImZ1bmN0aW9uXCIgKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCAhb3B0aW9ucy51bmlxdWUgfHwgIXNlbGYuaGFzKCBhcmcgKSApIHtcblx0XHRcdFx0XHRcdFx0XHRcdGxpc3QucHVzaCggYXJnICk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKCBhcmcgJiYgYXJnLmxlbmd0aCAmJiB0eXBlICE9PSBcInN0cmluZ1wiICkge1xuXHRcdFx0XHRcdFx0XHRcdC8vIEluc3BlY3QgcmVjdXJzaXZlbHlcblx0XHRcdFx0XHRcdFx0XHRhZGQoIGFyZyApO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9KSggYXJndW1lbnRzICk7XG5cdFx0XHRcdFx0Ly8gRG8gd2UgbmVlZCB0byBhZGQgdGhlIGNhbGxiYWNrcyB0byB0aGVcblx0XHRcdFx0XHQvLyBjdXJyZW50IGZpcmluZyBiYXRjaD9cblx0XHRcdFx0XHRpZiAoIGZpcmluZyApIHtcblx0XHRcdFx0XHRcdGZpcmluZ0xlbmd0aCA9IGxpc3QubGVuZ3RoO1xuXHRcdFx0XHRcdC8vIFdpdGggbWVtb3J5LCBpZiB3ZSdyZSBub3QgZmlyaW5nIHRoZW5cblx0XHRcdFx0XHQvLyB3ZSBzaG91bGQgY2FsbCByaWdodCBhd2F5XG5cdFx0XHRcdFx0fSBlbHNlIGlmICggbWVtb3J5ICkge1xuXHRcdFx0XHRcdFx0ZmlyaW5nU3RhcnQgPSBzdGFydDtcblx0XHRcdFx0XHRcdGZpcmUoIG1lbW9yeSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH0sXG5cdFx0XHQvLyBSZW1vdmUgYSBjYWxsYmFjayBmcm9tIHRoZSBsaXN0XG5cdFx0XHRyZW1vdmU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAoIGxpc3QgKSB7XG5cdFx0XHRcdFx0alF1ZXJ5LmVhY2goIGFyZ3VtZW50cywgZnVuY3Rpb24oIF8sIGFyZyApIHtcblx0XHRcdFx0XHRcdHZhciBpbmRleDtcblx0XHRcdFx0XHRcdHdoaWxlKCAoIGluZGV4ID0galF1ZXJ5LmluQXJyYXkoIGFyZywgbGlzdCwgaW5kZXggKSApID4gLTEgKSB7XG5cdFx0XHRcdFx0XHRcdGxpc3Quc3BsaWNlKCBpbmRleCwgMSApO1xuXHRcdFx0XHRcdFx0XHQvLyBIYW5kbGUgZmlyaW5nIGluZGV4ZXNcblx0XHRcdFx0XHRcdFx0aWYgKCBmaXJpbmcgKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCBpbmRleCA8PSBmaXJpbmdMZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRmaXJpbmdMZW5ndGgtLTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCBpbmRleCA8PSBmaXJpbmdJbmRleCApIHtcblx0XHRcdFx0XHRcdFx0XHRcdGZpcmluZ0luZGV4LS07XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gQ29udHJvbCBpZiBhIGdpdmVuIGNhbGxiYWNrIGlzIGluIHRoZSBsaXN0XG5cdFx0XHRoYXM6IGZ1bmN0aW9uKCBmbiApIHtcblx0XHRcdFx0cmV0dXJuIGpRdWVyeS5pbkFycmF5KCBmbiwgbGlzdCApID4gLTE7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gUmVtb3ZlIGFsbCBjYWxsYmFja3MgZnJvbSB0aGUgbGlzdFxuXHRcdFx0ZW1wdHk6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRsaXN0ID0gW107XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fSxcblx0XHRcdC8vIEhhdmUgdGhlIGxpc3QgZG8gbm90aGluZyBhbnltb3JlXG5cdFx0XHRkaXNhYmxlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0bGlzdCA9IHN0YWNrID0gbWVtb3J5ID0gdW5kZWZpbmVkO1xuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH0sXG5cdFx0XHQvLyBJcyBpdCBkaXNhYmxlZD9cblx0XHRcdGRpc2FibGVkOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuICFsaXN0O1xuXHRcdFx0fSxcblx0XHRcdC8vIExvY2sgdGhlIGxpc3QgaW4gaXRzIGN1cnJlbnQgc3RhdGVcblx0XHRcdGxvY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRzdGFjayA9IHVuZGVmaW5lZDtcblx0XHRcdFx0aWYgKCAhbWVtb3J5ICkge1xuXHRcdFx0XHRcdHNlbGYuZGlzYWJsZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fSxcblx0XHRcdC8vIElzIGl0IGxvY2tlZD9cblx0XHRcdGxvY2tlZDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiAhc3RhY2s7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gQ2FsbCBhbGwgY2FsbGJhY2tzIHdpdGggdGhlIGdpdmVuIGNvbnRleHQgYW5kIGFyZ3VtZW50c1xuXHRcdFx0ZmlyZVdpdGg6IGZ1bmN0aW9uKCBjb250ZXh0LCBhcmdzICkge1xuXHRcdFx0XHRhcmdzID0gYXJncyB8fCBbXTtcblx0XHRcdFx0YXJncyA9IFsgY29udGV4dCwgYXJncy5zbGljZSA/IGFyZ3Muc2xpY2UoKSA6IGFyZ3MgXTtcblx0XHRcdFx0aWYgKCBsaXN0ICYmICggIWZpcmVkIHx8IHN0YWNrICkgKSB7XG5cdFx0XHRcdFx0aWYgKCBmaXJpbmcgKSB7XG5cdFx0XHRcdFx0XHRzdGFjay5wdXNoKCBhcmdzICk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGZpcmUoIGFyZ3MgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gQ2FsbCBhbGwgdGhlIGNhbGxiYWNrcyB3aXRoIHRoZSBnaXZlbiBhcmd1bWVudHNcblx0XHRcdGZpcmU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRzZWxmLmZpcmVXaXRoKCB0aGlzLCBhcmd1bWVudHMgKTtcblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gVG8ga25vdyBpZiB0aGUgY2FsbGJhY2tzIGhhdmUgYWxyZWFkeSBiZWVuIGNhbGxlZCBhdCBsZWFzdCBvbmNlXG5cdFx0XHRmaXJlZDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiAhIWZpcmVkO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0cmV0dXJuIHNlbGY7XG59O1xuXG4iLCIvKipcbiogalF1ZXJ5IGNvcmUgb2JqZWN0LlxuKlxuKiBXb3JrZXIgd2l0aCBqUXVlcnkgZGVmZXJyZWRcbipcbiogQ29kZSBmcm9tOiBodHRwczovL2dpdGh1Yi5jb20vanF1ZXJ5L2pxdWVyeS9ibG9iL21hc3Rlci9zcmMvY29yZS5qc1xuKlxuKi9cblxudmFyIGpRdWVyeSA9IG1vZHVsZS5leHBvcnRzID0ge1xuXHR0eXBlOiB0eXBlXG5cdCwgaXNBcnJheTogaXNBcnJheVxuXHQsIGlzRnVuY3Rpb246IGlzRnVuY3Rpb25cblx0LCBpc1BsYWluT2JqZWN0OiBpc1BsYWluT2JqZWN0XG5cdCwgZWFjaDogZWFjaFxuXHQsIGV4dGVuZDogZXh0ZW5kXG5cdCwgbm9vcDogZnVuY3Rpb24oKSB7fVxufTtcblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxudmFyIGNsYXNzMnR5cGUgPSB7fTtcbi8vIFBvcHVsYXRlIHRoZSBjbGFzczJ0eXBlIG1hcFxuXCJCb29sZWFuIE51bWJlciBTdHJpbmcgRnVuY3Rpb24gQXJyYXkgRGF0ZSBSZWdFeHAgT2JqZWN0XCIuc3BsaXQoXCIgXCIpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuXHRjbGFzczJ0eXBlWyBcIltvYmplY3QgXCIgKyBuYW1lICsgXCJdXCIgXSA9IG5hbWUudG9Mb3dlckNhc2UoKTtcbn0pO1xuXG5cbmZ1bmN0aW9uIHR5cGUoIG9iaiApIHtcblx0cmV0dXJuIG9iaiA9PSBudWxsID9cblx0XHRTdHJpbmcoIG9iaiApIDpcblx0XHRcdGNsYXNzMnR5cGVbIHRvU3RyaW5nLmNhbGwob2JqKSBdIHx8IFwib2JqZWN0XCI7XG59XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oIG9iaiApIHtcblx0cmV0dXJuIGpRdWVyeS50eXBlKG9iaikgPT09IFwiZnVuY3Rpb25cIjtcbn1cblxuZnVuY3Rpb24gaXNBcnJheSggb2JqICkge1xuXHRyZXR1cm4galF1ZXJ5LnR5cGUob2JqKSA9PT0gXCJhcnJheVwiO1xufVxuXG5mdW5jdGlvbiBlYWNoKCBvYmplY3QsIGNhbGxiYWNrLCBhcmdzICkge1xuXHR2YXIgbmFtZSwgaSA9IDAsXG5cdGxlbmd0aCA9IG9iamVjdC5sZW5ndGgsXG5cdGlzT2JqID0gbGVuZ3RoID09PSB1bmRlZmluZWQgfHwgaXNGdW5jdGlvbiggb2JqZWN0ICk7XG5cblx0aWYgKCBhcmdzICkge1xuXHRcdGlmICggaXNPYmogKSB7XG5cdFx0XHRmb3IgKCBuYW1lIGluIG9iamVjdCApIHtcblx0XHRcdFx0aWYgKCBjYWxsYmFjay5hcHBseSggb2JqZWN0WyBuYW1lIF0sIGFyZ3MgKSA9PT0gZmFsc2UgKSB7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0Zm9yICggOyBpIDwgbGVuZ3RoOyApIHtcblx0XHRcdFx0aWYgKCBjYWxsYmFjay5hcHBseSggb2JqZWN0WyBpKysgXSwgYXJncyApID09PSBmYWxzZSApIHtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIEEgc3BlY2lhbCwgZmFzdCwgY2FzZSBmb3IgdGhlIG1vc3QgY29tbW9uIHVzZSBvZiBlYWNoXG5cdH0gZWxzZSB7XG5cdFx0aWYgKCBpc09iaiApIHtcblx0XHRcdGZvciAoIG5hbWUgaW4gb2JqZWN0ICkge1xuXHRcdFx0XHRpZiAoIGNhbGxiYWNrLmNhbGwoIG9iamVjdFsgbmFtZSBdLCBuYW1lLCBvYmplY3RbIG5hbWUgXSApID09PSBmYWxzZSApIHtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRmb3IgKCA7IGkgPCBsZW5ndGg7ICkge1xuXHRcdFx0XHRpZiAoIGNhbGxiYWNrLmNhbGwoIG9iamVjdFsgaSBdLCBpLCBvYmplY3RbIGkrKyBdICkgPT09IGZhbHNlICkge1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIG9iamVjdDtcbn1cblxuZnVuY3Rpb24gaXNQbGFpbk9iamVjdCggb2JqICkge1xuXHQvLyBNdXN0IGJlIGFuIE9iamVjdC5cblx0aWYgKCAhb2JqIHx8IGpRdWVyeS50eXBlKG9iaikgIT09IFwib2JqZWN0XCIgKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cdHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBleHRlbmQoKSB7XG5cdHZhciBvcHRpb25zLCBuYW1lLCBzcmMsIGNvcHksIGNvcHlJc0FycmF5LCBjbG9uZSxcblx0dGFyZ2V0ID0gYXJndW1lbnRzWzBdIHx8IHt9LFxuXHRpID0gMSxcblx0bGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCxcblx0ZGVlcCA9IGZhbHNlO1xuXG5cdC8vIEhhbmRsZSBhIGRlZXAgY29weSBzaXR1YXRpb25cblx0aWYgKCB0eXBlb2YgdGFyZ2V0ID09PSBcImJvb2xlYW5cIiApIHtcblx0XHRkZWVwID0gdGFyZ2V0O1xuXHRcdHRhcmdldCA9IGFyZ3VtZW50c1sxXSB8fCB7fTtcblx0XHQvLyBza2lwIHRoZSBib29sZWFuIGFuZCB0aGUgdGFyZ2V0XG5cdFx0aSA9IDI7XG5cdH1cblxuXHQvLyBIYW5kbGUgY2FzZSB3aGVuIHRhcmdldCBpcyBhIHN0cmluZyBvciBzb21ldGhpbmcgKHBvc3NpYmxlIGluIGRlZXAgY29weSlcblx0aWYgKCB0eXBlb2YgdGFyZ2V0ICE9PSBcIm9iamVjdFwiICYmICFqUXVlcnkuaXNGdW5jdGlvbih0YXJnZXQpICkge1xuXHRcdHRhcmdldCA9IHt9O1xuXHR9XG5cblx0Ly8gZXh0ZW5kIGpRdWVyeSBpdHNlbGYgaWYgb25seSBvbmUgYXJndW1lbnQgaXMgcGFzc2VkXG5cdGlmICggbGVuZ3RoID09PSBpICkge1xuXHRcdHRhcmdldCA9IHRoaXM7XG5cdFx0LS1pO1xuXHR9XG5cblx0Zm9yICggOyBpIDwgbGVuZ3RoOyBpKysgKSB7XG5cdFx0Ly8gT25seSBkZWFsIHdpdGggbm9uLW51bGwvdW5kZWZpbmVkIHZhbHVlc1xuXHRcdGlmICggKG9wdGlvbnMgPSBhcmd1bWVudHNbIGkgXSkgIT0gbnVsbCApIHtcblx0XHRcdC8vIEV4dGVuZCB0aGUgYmFzZSBvYmplY3Rcblx0XHRcdGZvciAoIG5hbWUgaW4gb3B0aW9ucyApIHtcblx0XHRcdFx0c3JjID0gdGFyZ2V0WyBuYW1lIF07XG5cdFx0XHRcdGNvcHkgPSBvcHRpb25zWyBuYW1lIF07XG5cblx0XHRcdFx0Ly8gUHJldmVudCBuZXZlci1lbmRpbmcgbG9vcFxuXHRcdFx0XHRpZiAoIHRhcmdldCA9PT0gY29weSApIHtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFJlY3Vyc2UgaWYgd2UncmUgbWVyZ2luZyBwbGFpbiBvYmplY3RzIG9yIGFycmF5c1xuXHRcdFx0XHRpZiAoIGRlZXAgJiYgY29weSAmJiAoIGpRdWVyeS5pc1BsYWluT2JqZWN0KGNvcHkpIHx8IChjb3B5SXNBcnJheSA9IGpRdWVyeS5pc0FycmF5KGNvcHkpKSApICkge1xuXHRcdFx0XHRcdGlmICggY29weUlzQXJyYXkgKSB7XG5cdFx0XHRcdFx0XHRjb3B5SXNBcnJheSA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0Y2xvbmUgPSBzcmMgJiYgalF1ZXJ5LmlzQXJyYXkoc3JjKSA/IHNyYyA6IFtdO1xuXG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGNsb25lID0gc3JjICYmIGpRdWVyeS5pc1BsYWluT2JqZWN0KHNyYykgPyBzcmMgOiB7fTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBOZXZlciBtb3ZlIG9yaWdpbmFsIG9iamVjdHMsIGNsb25lIHRoZW1cblx0XHRcdFx0XHR0YXJnZXRbIG5hbWUgXSA9IGpRdWVyeS5leHRlbmQoIGRlZXAsIGNsb25lLCBjb3B5ICk7XG5cblx0XHRcdFx0XHQvLyBEb24ndCBicmluZyBpbiB1bmRlZmluZWQgdmFsdWVzXG5cdFx0XHRcdH0gZWxzZSBpZiAoIGNvcHkgIT09IHVuZGVmaW5lZCApIHtcblx0XHRcdFx0XHR0YXJnZXRbIG5hbWUgXSA9IGNvcHk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvLyBSZXR1cm4gdGhlIG1vZGlmaWVkIG9iamVjdFxuXHRyZXR1cm4gdGFyZ2V0O1xufTtcblxuXG4iLCJcbi8qIVxuKiBqcXVlcnktZGVmZXJyZWRcbiogQ29weXJpZ2h0KGMpIDIwMTEgSGlkZGVuIDx6emRoaWRkZW5AZ21haWwuY29tPlxuKiBNSVQgTGljZW5zZWRcbiovXG5cbi8qKlxuKiBMaWJyYXJ5IHZlcnNpb24uXG4qL1xuXG52YXIgalF1ZXJ5ID0gbW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9qcXVlcnktY2FsbGJhY2tzLmpzXCIpLFxuXHRjb3JlX3NsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xuXG4vKipcbiogalF1ZXJ5IGRlZmVycmVkXG4qXG4qIENvZGUgZnJvbTogaHR0cHM6Ly9naXRodWIuY29tL2pxdWVyeS9qcXVlcnkvYmxvYi9tYXN0ZXIvc3JjL2RlZmVycmVkLmpzXG4qIERvYzogaHR0cDovL2FwaS5qcXVlcnkuY29tL2NhdGVnb3J5L2RlZmVycmVkLW9iamVjdC9cbipcbiovXG5cbmpRdWVyeS5leHRlbmQoe1xuXG5cdERlZmVycmVkOiBmdW5jdGlvbiggZnVuYyApIHtcblx0XHR2YXIgdHVwbGVzID0gW1xuXHRcdFx0XHQvLyBhY3Rpb24sIGFkZCBsaXN0ZW5lciwgbGlzdGVuZXIgbGlzdCwgZmluYWwgc3RhdGVcblx0XHRcdFx0WyBcInJlc29sdmVcIiwgXCJkb25lXCIsIGpRdWVyeS5DYWxsYmFja3MoXCJvbmNlIG1lbW9yeVwiKSwgXCJyZXNvbHZlZFwiIF0sXG5cdFx0XHRcdFsgXCJyZWplY3RcIiwgXCJmYWlsXCIsIGpRdWVyeS5DYWxsYmFja3MoXCJvbmNlIG1lbW9yeVwiKSwgXCJyZWplY3RlZFwiIF0sXG5cdFx0XHRcdFsgXCJub3RpZnlcIiwgXCJwcm9ncmVzc1wiLCBqUXVlcnkuQ2FsbGJhY2tzKFwibWVtb3J5XCIpIF1cblx0XHRcdF0sXG5cdFx0XHRzdGF0ZSA9IFwicGVuZGluZ1wiLFxuXHRcdFx0cHJvbWlzZSA9IHtcblx0XHRcdFx0c3RhdGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBzdGF0ZTtcblx0XHRcdFx0fSxcblx0XHRcdFx0YWx3YXlzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRkZWZlcnJlZC5kb25lKCBhcmd1bWVudHMgKS5mYWlsKCBhcmd1bWVudHMgKTtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdFx0fSxcblx0XHRcdFx0dGhlbjogZnVuY3Rpb24oIC8qIGZuRG9uZSwgZm5GYWlsLCBmblByb2dyZXNzICovICkge1xuXHRcdFx0XHRcdHZhciBmbnMgPSBhcmd1bWVudHM7XG5cdFx0XHRcdFx0cmV0dXJuIGpRdWVyeS5EZWZlcnJlZChmdW5jdGlvbiggbmV3RGVmZXIgKSB7XG5cdFx0XHRcdFx0XHRqUXVlcnkuZWFjaCggdHVwbGVzLCBmdW5jdGlvbiggaSwgdHVwbGUgKSB7XG5cdFx0XHRcdFx0XHRcdHZhciBhY3Rpb24gPSB0dXBsZVsgMCBdLFxuXHRcdFx0XHRcdFx0XHRcdGZuID0gZm5zWyBpIF07XG5cdFx0XHRcdFx0XHRcdC8vIGRlZmVycmVkWyBkb25lIHwgZmFpbCB8IHByb2dyZXNzIF0gZm9yIGZvcndhcmRpbmcgYWN0aW9ucyB0byBuZXdEZWZlclxuXHRcdFx0XHRcdFx0XHRkZWZlcnJlZFsgdHVwbGVbMV0gXSggalF1ZXJ5LmlzRnVuY3Rpb24oIGZuICkgP1xuXHRcdFx0XHRcdFx0XHRcdGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0dmFyIHJldHVybmVkID0gZm4uYXBwbHkoIHRoaXMsIGFyZ3VtZW50cyApO1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKCByZXR1cm5lZCAmJiBqUXVlcnkuaXNGdW5jdGlvbiggcmV0dXJuZWQucHJvbWlzZSApICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm5lZC5wcm9taXNlKClcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQuZG9uZSggbmV3RGVmZXIucmVzb2x2ZSApXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0LmZhaWwoIG5ld0RlZmVyLnJlamVjdCApXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0LnByb2dyZXNzKCBuZXdEZWZlci5ub3RpZnkgKTtcblx0XHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdG5ld0RlZmVyWyBhY3Rpb24gKyBcIldpdGhcIiBdKCB0aGlzID09PSBkZWZlcnJlZCA/IG5ld0RlZmVyIDogdGhpcywgWyByZXR1cm5lZCBdICk7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fSA6XG5cdFx0XHRcdFx0XHRcdFx0bmV3RGVmZXJbIGFjdGlvbiBdXG5cdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdGZucyA9IG51bGw7XG5cdFx0XHRcdFx0fSkucHJvbWlzZSgpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHQvLyBHZXQgYSBwcm9taXNlIGZvciB0aGlzIGRlZmVycmVkXG5cdFx0XHRcdC8vIElmIG9iaiBpcyBwcm92aWRlZCwgdGhlIHByb21pc2UgYXNwZWN0IGlzIGFkZGVkIHRvIHRoZSBvYmplY3Rcblx0XHRcdFx0cHJvbWlzZTogZnVuY3Rpb24oIG9iaiApIHtcblx0XHRcdFx0XHRyZXR1cm4gb2JqICE9IG51bGwgPyBqUXVlcnkuZXh0ZW5kKCBvYmosIHByb21pc2UgKSA6IHByb21pc2U7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRkZWZlcnJlZCA9IHt9O1xuXG5cdFx0Ly8gS2VlcCBwaXBlIGZvciBiYWNrLWNvbXBhdFxuXHRcdHByb21pc2UucGlwZSA9IHByb21pc2UudGhlbjtcblxuXHRcdC8vIEFkZCBsaXN0LXNwZWNpZmljIG1ldGhvZHNcblx0XHRqUXVlcnkuZWFjaCggdHVwbGVzLCBmdW5jdGlvbiggaSwgdHVwbGUgKSB7XG5cdFx0XHR2YXIgbGlzdCA9IHR1cGxlWyAyIF0sXG5cdFx0XHRcdHN0YXRlU3RyaW5nID0gdHVwbGVbIDMgXTtcblxuXHRcdFx0Ly8gcHJvbWlzZVsgZG9uZSB8IGZhaWwgfCBwcm9ncmVzcyBdID0gbGlzdC5hZGRcblx0XHRcdHByb21pc2VbIHR1cGxlWzFdIF0gPSBsaXN0LmFkZDtcblxuXHRcdFx0Ly8gSGFuZGxlIHN0YXRlXG5cdFx0XHRpZiAoIHN0YXRlU3RyaW5nICkge1xuXHRcdFx0XHRsaXN0LmFkZChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvLyBzdGF0ZSA9IFsgcmVzb2x2ZWQgfCByZWplY3RlZCBdXG5cdFx0XHRcdFx0c3RhdGUgPSBzdGF0ZVN0cmluZztcblxuXHRcdFx0XHQvLyBbIHJlamVjdF9saXN0IHwgcmVzb2x2ZV9saXN0IF0uZGlzYWJsZTsgcHJvZ3Jlc3NfbGlzdC5sb2NrXG5cdFx0XHRcdH0sIHR1cGxlc1sgaSBeIDEgXVsgMiBdLmRpc2FibGUsIHR1cGxlc1sgMiBdWyAyIF0ubG9jayApO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBkZWZlcnJlZFsgcmVzb2x2ZSB8IHJlamVjdCB8IG5vdGlmeSBdID0gbGlzdC5maXJlXG5cdFx0XHRkZWZlcnJlZFsgdHVwbGVbMF0gXSA9IGxpc3QuZmlyZTtcblx0XHRcdGRlZmVycmVkWyB0dXBsZVswXSArIFwiV2l0aFwiIF0gPSBsaXN0LmZpcmVXaXRoO1xuXHRcdH0pO1xuXG5cdFx0Ly8gTWFrZSB0aGUgZGVmZXJyZWQgYSBwcm9taXNlXG5cdFx0cHJvbWlzZS5wcm9taXNlKCBkZWZlcnJlZCApO1xuXG5cdFx0Ly8gQ2FsbCBnaXZlbiBmdW5jIGlmIGFueVxuXHRcdGlmICggZnVuYyApIHtcblx0XHRcdGZ1bmMuY2FsbCggZGVmZXJyZWQsIGRlZmVycmVkICk7XG5cdFx0fVxuXG5cdFx0Ly8gQWxsIGRvbmUhXG5cdFx0cmV0dXJuIGRlZmVycmVkO1xuXHR9LFxuXG5cdC8vIERlZmVycmVkIGhlbHBlclxuXHR3aGVuOiBmdW5jdGlvbiggc3Vib3JkaW5hdGUgLyogLCAuLi4sIHN1Ym9yZGluYXRlTiAqLyApIHtcblx0XHR2YXIgaSA9IDAsXG5cdFx0XHRyZXNvbHZlVmFsdWVzID0gY29yZV9zbGljZS5jYWxsKCBhcmd1bWVudHMgKSxcblx0XHRcdGxlbmd0aCA9IHJlc29sdmVWYWx1ZXMubGVuZ3RoLFxuXG5cdFx0XHQvLyB0aGUgY291bnQgb2YgdW5jb21wbGV0ZWQgc3Vib3JkaW5hdGVzXG5cdFx0XHRyZW1haW5pbmcgPSBsZW5ndGggIT09IDEgfHwgKCBzdWJvcmRpbmF0ZSAmJiBqUXVlcnkuaXNGdW5jdGlvbiggc3Vib3JkaW5hdGUucHJvbWlzZSApICkgPyBsZW5ndGggOiAwLFxuXG5cdFx0XHQvLyB0aGUgbWFzdGVyIERlZmVycmVkLiBJZiByZXNvbHZlVmFsdWVzIGNvbnNpc3Qgb2Ygb25seSBhIHNpbmdsZSBEZWZlcnJlZCwganVzdCB1c2UgdGhhdC5cblx0XHRcdGRlZmVycmVkID0gcmVtYWluaW5nID09PSAxID8gc3Vib3JkaW5hdGUgOiBqUXVlcnkuRGVmZXJyZWQoKSxcblxuXHRcdFx0Ly8gVXBkYXRlIGZ1bmN0aW9uIGZvciBib3RoIHJlc29sdmUgYW5kIHByb2dyZXNzIHZhbHVlc1xuXHRcdFx0dXBkYXRlRnVuYyA9IGZ1bmN0aW9uKCBpLCBjb250ZXh0cywgdmFsdWVzICkge1xuXHRcdFx0XHRyZXR1cm4gZnVuY3Rpb24oIHZhbHVlICkge1xuXHRcdFx0XHRcdGNvbnRleHRzWyBpIF0gPSB0aGlzO1xuXHRcdFx0XHRcdHZhbHVlc1sgaSBdID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBjb3JlX3NsaWNlLmNhbGwoIGFyZ3VtZW50cyApIDogdmFsdWU7XG5cdFx0XHRcdFx0aWYoIHZhbHVlcyA9PT0gcHJvZ3Jlc3NWYWx1ZXMgKSB7XG5cdFx0XHRcdFx0XHRkZWZlcnJlZC5ub3RpZnlXaXRoKCBjb250ZXh0cywgdmFsdWVzICk7XG5cdFx0XHRcdFx0fSBlbHNlIGlmICggISggLS1yZW1haW5pbmcgKSApIHtcblx0XHRcdFx0XHRcdGRlZmVycmVkLnJlc29sdmVXaXRoKCBjb250ZXh0cywgdmFsdWVzICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXHRcdFx0fSxcblxuXHRcdFx0cHJvZ3Jlc3NWYWx1ZXMsIHByb2dyZXNzQ29udGV4dHMsIHJlc29sdmVDb250ZXh0cztcblxuXHRcdC8vIGFkZCBsaXN0ZW5lcnMgdG8gRGVmZXJyZWQgc3Vib3JkaW5hdGVzOyB0cmVhdCBvdGhlcnMgYXMgcmVzb2x2ZWRcblx0XHRpZiAoIGxlbmd0aCA+IDEgKSB7XG5cdFx0XHRwcm9ncmVzc1ZhbHVlcyA9IG5ldyBBcnJheSggbGVuZ3RoICk7XG5cdFx0XHRwcm9ncmVzc0NvbnRleHRzID0gbmV3IEFycmF5KCBsZW5ndGggKTtcblx0XHRcdHJlc29sdmVDb250ZXh0cyA9IG5ldyBBcnJheSggbGVuZ3RoICk7XG5cdFx0XHRmb3IgKCA7IGkgPCBsZW5ndGg7IGkrKyApIHtcblx0XHRcdFx0aWYgKCByZXNvbHZlVmFsdWVzWyBpIF0gJiYgalF1ZXJ5LmlzRnVuY3Rpb24oIHJlc29sdmVWYWx1ZXNbIGkgXS5wcm9taXNlICkgKSB7XG5cdFx0XHRcdFx0cmVzb2x2ZVZhbHVlc1sgaSBdLnByb21pc2UoKVxuXHRcdFx0XHRcdFx0LmRvbmUoIHVwZGF0ZUZ1bmMoIGksIHJlc29sdmVDb250ZXh0cywgcmVzb2x2ZVZhbHVlcyApIClcblx0XHRcdFx0XHRcdC5mYWlsKCBkZWZlcnJlZC5yZWplY3QgKVxuXHRcdFx0XHRcdFx0LnByb2dyZXNzKCB1cGRhdGVGdW5jKCBpLCBwcm9ncmVzc0NvbnRleHRzLCBwcm9ncmVzc1ZhbHVlcyApICk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0LS1yZW1haW5pbmc7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBpZiB3ZSdyZSBub3Qgd2FpdGluZyBvbiBhbnl0aGluZywgcmVzb2x2ZSB0aGUgbWFzdGVyXG5cdFx0aWYgKCAhcmVtYWluaW5nICkge1xuXHRcdFx0ZGVmZXJyZWQucmVzb2x2ZVdpdGgoIHJlc29sdmVDb250ZXh0cywgcmVzb2x2ZVZhbHVlcyApO1xuXHRcdH1cblxuXHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG5cdH1cbn0pO1xuIl19
