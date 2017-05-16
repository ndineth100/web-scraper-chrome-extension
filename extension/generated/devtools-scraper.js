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
  })
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
  getHTML: function (request) {
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
  selectSelector: function (request) {
    var deferredResponse = jquery.Deferred()

    this.removeCurrentContentSelector().done(function () {
      var contentSelector = new ContentSelector({
        parentCSSSelector: request.parentCSSSelector,
        allowedElements: request.allowedElements
      })
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
  previewSelector: function (request) {
    var deferredResponse = jquery.Deferred()
    this.removeCurrentContentSelector().done(function () {
      var contentSelector = new ContentSelector({
        parentCSSSelector: request.parentCSSSelector
      })
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
var ContentSelector = function (options) {
	// deferred response
  this.deferredCSSSelectorResponse = jquery.Deferred()

  this.allowedElements = options.allowedElements
  this.parentCSSSelector = options.parentCSSSelector.trim()
  this.alert = options.alert || function (txt) { alert(txt) }

  if (this.parentCSSSelector) {
    this.parent = $(this.parentCSSSelector)[0]

		//  handle situation when parent selector not found
    if (this.parent === undefined) {
      this.deferredCSSSelectorResponse.reject('parent selector not found')
      this.alert('Parent element not found!')
    }
  }	else {
    this.parent = $('body')[0]
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
        } else if ($('#-selector-toolbar [name=diferentElementSelection]').prop('checked')) {
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
      query: jQuery
    })
  },

  previewSelector: function (elementCSSSelector) {
    if (this.deferredCSSSelectorResponse.state() !== 'rejected') {
      this.highlightParent()
      $(ElementQuery(elementCSSSelector, this.parent)).addClass('-sitemap-select-item-selected')
      this.deferredCSSSelectorResponse.resolve()
    }

    return this.deferredCSSSelectorResponse.promise()
  },

  initGUI: function () {
    this.highlightParent()

		// all elements except toolbar
    this.$allElements = $(this.allowedElements + ':not(#-selector-toolbar):not(#-selector-toolbar *)', this.parent)
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
    $(this.$allElements).bind('mouseover.elementSelector', function (e) {
      var element = e.currentTarget
      this.mouseOverElement = element
      $(element).addClass('-sitemap-select-item-hover')
      return false
    }.bind(this)).bind('mouseout.elementSelector', function (e) {
      var element = e.currentTarget
      this.mouseOverElement = null
      $(element).removeClass('-sitemap-select-item-hover')
      return false
    }.bind(this))
  },

  bindMoveImagesToTop: function () {
    $('body').addClass('-web-scraper-selection-active')

		// do this only when selecting images
    if (this.allowedElements === 'img') {
      $('img').filter(function (i, element) {
        return $(element).css('position') === 'static'
      }).addClass('-web-scraper-img-on-top')
    }
  },

  unbindMoveImagesToTop: function () {
    $('body.-web-scraper-selection-active').removeClass('-web-scraper-selection-active')
    $('img.-web-scraper-img-on-top').removeClass('-web-scraper-img-on-top')
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

      $('#-selector-toolbar .key-button').toggleClass('hide', !focus)
      $('#-selector-toolbar .key-events').toggleClass('hide', focus)
    }, 200)

		// Using up/down arrows user can select elements from top of the
		// selected element
    $(document).bind('keydown.selectionManipulation', function (event) {
			// select child C
      if (event.keyCode === 67) {
        this.animateClickedKey($('#-selector-toolbar .key-button-child'))
        this.selectChild()
      }
			// select parent P
      else if (event.keyCode === 80) {
        this.animateClickedKey($('#-selector-toolbar .key-button-parent'))
        this.selectParent()
      }
			// select element
      else if (event.keyCode === 83) {
        this.animateClickedKey($('#-selector-toolbar .key-button-select'))
        this.selectMouseOverElement()
      }

      this.highlightSelectedElements()
    }.bind(this))
  },

  animateClickedKey: function (element) {
    $(element).removeClass('clicked').removeClass('clicked-animation')
    setTimeout(function () {
      $(element).addClass('clicked')
      setTimeout(function () {
        $(element).addClass('clicked-animation')
      }, 100)
    }, 1)
  },

  highlightSelectedElements: function () {
    try {
      var resultCssSelector = this.getCurrentCSSSelector()

      $('body #-selector-toolbar .selector').text(resultCssSelector)
			// highlight selected elements
      $('.-sitemap-select-item-selected').removeClass('-sitemap-select-item-selected')
      $(ElementQuery(resultCssSelector, this.parent)).addClass('-sitemap-select-item-selected')
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
    $('#-selector-toolbar .popover').attr('style', 'display:block !important;')
  },

  hideMultipleGroupPopup: function () {
    $('#-selector-toolbar .popover').attr('style', '')
  },

  bindMultipleGroupPopupHide: function () {
    $('#-selector-toolbar .popover .close').click(this.hideMultipleGroupPopup.bind(this))
  },

  unbindMultipleGroupPopupHide: function () {
    $('#-selector-toolbar .popover .close').unbind('click')
  },

  bindMultipleGroupCheckbox: function () {
    $('#-selector-toolbar [name=diferentElementSelection]').change(function (e) {
      if ($(e.currentTarget).is(':checked')) {
        this.initCssSelector(true)
      } else {
        this.initCssSelector(false)
      }
    }.bind(this))
  },
  unbindMultipleGroupCheckbox: function () {
    $('#-selector-toolbar .diferentElementSelection').unbind('change')
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
    $('body').append($toolbar)

    $('body #-selector-toolbar .done-selecting-button').click(function () {
      this.selectionFinished()
    }.bind(this))
  },
  highlightParent: function () {
		// do not highlight parent if its the body
    if (!$(this.parent).is('body') && !$(this.parent).is('#webpage')) {
      $(this.parent).addClass('-sitemap-parent')
    }
  },

  unbindElementSelection: function () {
    $(this.$allElements).unbind('click.elementSelector')
		// remove highlighted element classes
    this.unbindElementSelectionHighlight()
  },
  unbindElementSelectionHighlight: function () {
    $('.-sitemap-select-item-selected').removeClass('-sitemap-select-item-selected')
    $('.-sitemap-parent').removeClass('-sitemap-parent')
  },
  unbindElementHighlight: function () {
    $(this.$allElements).unbind('mouseover.elementSelector')
			.unbind('mouseout.elementSelector')
  },
  unbindKeyboardSelectionMaipulatios: function () {
    $(document).unbind('keydown.selectionManipulation')
    clearInterval(this.keyPressFocusInterval)
  },
  removeToolbar: function () {
    $('body #-selector-toolbar a').unbind('click')
    $('#-selector-toolbar').remove()
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
        $(document).on(event, selector, (function (selector, event) {
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
      $.get(this.templateDir + templateId + '.html', cbLoaded.bind(this, templateId))
    }.bind(this))
  },

  init: function () {
    this.loadTemplates(function () {
			// currently viewed objects
      this.clearState()

			// render main viewport
      ich.Viewport().appendTo('body')

			// cancel all form submits
      $('form').bind('submit', function () {
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
    $('.nav .active').removeClass('active')
    $('#' + navigationId + '-nav-button').closest('li').addClass('active')

    if (navigationId.match(/^sitemap-/)) {
      $('#sitemap-nav-button').removeClass('disabled')
      $('#sitemap-nav-button').closest('li').addClass('active')
      $('#navbar-active-sitemap-id').text('(' + this.state.currentSitemap._id + ')')
    }		else {
      $('#sitemap-nav-button').addClass('disabled')
      $('#navbar-active-sitemap-id').text('')
    }

    if (navigationId.match(/^create-sitemap-/)) {
      $('#create-sitemap-nav-button').closest('li').addClass('active')
    }
  },

	/**
	 * Simple info popup for sitemap start url input field
	 */
  initMultipleStartUrlHelper: function () {
    $('#startUrl')
			.popover({
  title: 'Multiple start urls',
  html: true,
  content: 'You can create ranged start urls like this:<br />http://example.com/[1-100].html',
  placement: 'bottom'
})
			.blur(function () {
  $(this).popover('hide')
})
  },

	/**
	 * Returns bootstrapValidator object for current form in viewport
	 */
  getFormValidator: function () {
    var validator = $('#viewport form').data('bootstrapValidator')
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
    $('#viewport form').bootstrapValidator({
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
    $('#viewport').html(sitemapForm)
    this.initMultipleStartUrlHelper()
    this.initSitemapValidation()

    return true
  },

  initImportStiemapValidation: function () {
    $('#viewport form').bootstrapValidator({
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
    $('#viewport').html(sitemapForm)
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
    $('#viewport').html(sitemapExportForm)
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
      $('#viewport').html($sitemapListPanel)
    })
  },

  getSitemapFromMetadataForm: function () {
    var id = $('#viewport form input[name=_id]').val()
    var $startUrlInputs = $('#viewport form .input-start-url')
    var startUrl
    if ($startUrlInputs.length === 1) {
      startUrl = $startUrlInputs.val()
    } else {
      startUrl = []
      $startUrlInputs.each(function (i, element) {
        startUrl.push($(element).val())
      })
    }

    return {
      id: id,
      startUrl: startUrl
    }
  },

  createSitemap: function (form) {
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
        })
        this.store.createSitemap(sitemap, function (sitemap) {
          this._editSitemap(sitemap, ['_root'])
        }.bind(this, sitemap))
      }
    }.bind(this))
  },

  importSitemap: function () {
		// cancel submit if invalid form
    if (!this.isValidForm()) {
      return false
    }

		// load data from form
    var sitemapJSON = $('[name=sitemapJSON]').val()
    var id = $('input[name=_id]').val()
    var sitemap = new Sitemap()
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
    $('#viewport').html($sitemapMetadataForm)
    this.initMultipleStartUrlHelper()
    this.initSitemapValidation()

    return true
  },

  editSitemapMetadataSave: function (button) {
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
        var newSitemap = new Sitemap(sitemap)
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
    var sitemap = $(tr).data('sitemap')
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
    $('#viewport').html($selectorListPanel)

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
    var selector = $(tr).data('selector')
    var parentSelectors = this.state.editSitemapBreadcumbsSelectors
    this.state.currentParentSelectorId = selector.id
    parentSelectors.push(selector)

    this.showSitemapSelectorList()
  },

  treeNavigationshowSitemapSelectorList: function (button) {
    var parentSelectors = this.state.editSitemapBreadcumbsSelectors
    var controller = this
    $('#selector-tree .breadcrumb li a').each(function (i, parentSelectorButton) {
      if (parentSelectorButton === button) {
        parentSelectors.splice(i + 1)
        controller.state.currentParentSelectorId = parentSelectors[i].id
      }
    })
    this.showSitemapSelectorList()
  },

  initSelectorValidation: function () {
    $('#viewport form').bootstrapValidator({
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
    var selector = $(button).closest('tr').data('selector')
    this._editSelector(selector)
  },
  updateSelectorParentListOnIdChange: function () {
    var selector = this.getCurrentlyEditedSelector()
    $('.currently-edited').val(selector.id).text(selector.id)
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
    $('#viewport').html($editSelectorForm)
		// mark initially opened selector as currently edited
    $('#edit-selector #parentSelectors option').each(function (i, element) {
      if ($(element).val() === selector.id) {
        $(element).addClass('currently-edited')
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
    var type = $('#edit-selector select[name=type]').val()
    var features = selectors[type].getFeatures()
    $('#edit-selector .feature').hide()
    features.forEach(function (feature) {
      $('#edit-selector .feature-' + feature).show()
    })

		// add this selector to possible parent selector
    var selector = this.getCurrentlyEditedSelector()
    if (selector.canHaveChildSelectors()) {
      if ($('#edit-selector #parentSelectors .currently-edited').length === 0) {
        var $option = $('<option class="currently-edited"></option>')
        $option.text(selector.id).val(selector.id)
        $('#edit-selector #parentSelectors').append($option)
      }
    } else {
		// remove if type doesn't allow to have child selectors
      $('#edit-selector #parentSelectors .currently-edited').remove()
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
    var id = $('#edit-selector [name=id]').val()
    var selectorsSelector = $('#edit-selector [name=selector]').val()
    var tableDataRowSelector = $('#edit-selector [name=tableDataRowSelector]').val()
    var tableHeaderRowSelector = $('#edit-selector [name=tableHeaderRowSelector]').val()
    var clickElementSelector = $('#edit-selector [name=clickElementSelector]').val()
    var type = $('#edit-selector [name=type]').val()
    var clickElementUniquenessType = $('#edit-selector [name=clickElementUniquenessType]').val()
    var clickType = $('#edit-selector [name=clickType]').val()
    var discardInitialElements = $('#edit-selector [name=discardInitialElements]').is(':checked')
    var multiple = $('#edit-selector [name=multiple]').is(':checked')
    var downloadImage = $('#edit-selector [name=downloadImage]').is(':checked')
    var clickPopup = $('#edit-selector [name=clickPopup]').is(':checked')
    var regex = $('#edit-selector [name=regex]').val()
    var delay = $('#edit-selector [name=delay]').val()
    var extractAttribute = $('#edit-selector [name=extractAttribute]').val()
    var parentSelectors = $('#edit-selector [name=parentSelectors]').val()
    var columns = []
    var $columnHeaders = $('#edit-selector .column-header')
    var $columnNames = $('#edit-selector .column-name')
    var $columnExtracts = $('#edit-selector .column-extract')

    $columnHeaders.each(function (i) {
      var header = $($columnHeaders[i]).val()
      var name = $($columnNames[i]).val()
      var extract = $($columnExtracts[i]).is(':checked')
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
    })

    this._editSelector(selector, sitemap)
  },
  deleteSelector: function (button) {
    var sitemap = this.state.currentSitemap
    var selector = $(button).closest('tr').data('selector')
    sitemap.deleteSelector(selector)

    this.store.saveSitemap(sitemap, function () {
      this.showSitemapSelectorList()
    }.bind(this))
  },
  deleteSitemap: function (button) {
    var sitemap = $(button).closest('tr').data('sitemap')
    var controller = this
    this.store.deleteSitemap(sitemap, function () {
      controller.showSitemaps()
    })
  },
  initScrapeSitemapConfigValidation: function () {
    $('#viewport form').bootstrapValidator({
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
    $('#viewport').html(scrapeConfigPanel)
    this.initScrapeSitemapConfigValidation()
    return true
  },
  scrapeSitemap: function () {
    if (!this.isValidForm()) {
      return false
    }

    var requestInterval = $('input[name=requestInterval]').val()
    var pageLoadDelay = $('input[name=pageLoadDelay]').val()

    var sitemap = this.state.currentSitemap
    var request = {
      scrapeSitemap: true,
      sitemap: JSON.parse(JSON.stringify(sitemap)),
      requestInterval: requestInterval,
      pageLoadDelay: pageLoadDelay
    }

		// show sitemap scraping panel
    this.getFormValidator().destroy()
    $('.scraping-in-progress').removeClass('hide')
    $('#submit-scrape-sitemap').closest('.form-group').hide()
    $('#scrape-sitemap-config input').prop('disabled', true)

    chrome.runtime.sendMessage(request, function (response) {
      this.browseSitemapData()
    }.bind(this))
    return false
  },
  sitemapListBrowseSitemapData: function (button) {
    var sitemap = $(button).closest('tr').data('sitemap')
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
      $('#viewport').html(dataPanel)

			// display data
			// Doing this the long way so there aren't xss vulnerubilites
			// while working with data or with the selector titles
      var $tbody = $('#sitemap-data tbody')
      data.forEach(function (row) {
        var $tr = $('<tr></tr>')
        dataColumns.forEach(function (column) {
          var $td = $('<td></td>')
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
    $('#viewport').html(exportPanel)

		// generate data
    $('.download-button').hide()
    this.store.getSitemapData(sitemap, function (data) {
      var blob = sitemap.getDataExportCsvBlob(data)
      $('.download-button a').attr('href', window.URL.createObjectURL(blob))
      $('.download-button a').attr('download', sitemap._id + '.csv')
      $('.download-button').show()
    })

    return true
  },

  selectSelector: function (button) {
    var input = $(button).closest('.form-group').find('input.selector-value')
    var sitemap = this.getCurrentlyEditedSelectorSitemap()
    var selector = this.getCurrentlyEditedSelector()
    var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds()
    var parentCSSSelector = sitemap.selectors.getParentCSSSelectorWithinOnePage(currentStateParentSelectorIds)

    var deferredSelector = this.contentScript.selectSelector({
      parentCSSSelector: parentCSSSelector,
      allowedElements: selector.getItemCSSSelector()
    })

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
          var tableHeaderRowSelector = SelectorTable.getTableHeaderRowSelectorFromTableHTML(html)
          var tableDataRowSelector = SelectorTable.getTableDataRowSelectorFromTableHTML(html)
          $('input[name=tableHeaderRowSelector]').val(tableHeaderRowSelector)
          $('input[name=tableDataRowSelector]').val(tableDataRowSelector)

          var headerColumns = SelectorTable.getTableHeaderColumnsFromHTML(tableHeaderRowSelector, html)
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
    var input = $(button).closest('.form-group').find('input.selector-value')
    var sitemap = this.getCurrentlyEditedSelectorSitemap()
    var selector = this.getCurrentlyEditedSelector()
    var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds()
    var parentCSSSelector = sitemap.selectors.getCSSSelectorWithinOnePage(selector.id, currentStateParentSelectorIds)

    var deferredSelector = this.contentScript.selectSelector({
      parentCSSSelector: parentCSSSelector,
      allowedElements: 'tr'
    })

    deferredSelector.done(function (result) {
      var tableHeaderRowSelector = result.CSSSelector
      $(input).val(tableHeaderRowSelector)

      this.getSelectorHTML().done(function (html) {
        var headerColumns = SelectorTable.getTableHeaderColumnsFromHTML(tableHeaderRowSelector, html)
        this.renderTableHeaderColumns(headerColumns)
      }.bind(this))

			// update validation for selector field
      var validator = this.getFormValidator()
      validator.revalidateField(input)
    }.bind(this))
  },

  selectTableDataRowSelector: function (button) {
    var input = $(button).closest('.form-group').find('input.selector-value')
    var sitemap = this.getCurrentlyEditedSelectorSitemap()
    var selector = this.getCurrentlyEditedSelector()
    var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds()
    var parentCSSSelector = sitemap.selectors.getCSSSelectorWithinOnePage(selector.id, currentStateParentSelectorIds)

    var deferredSelector = this.contentScript.selectSelector({
      parentCSSSelector: parentCSSSelector,
      allowedElements: 'tr'
    })

    deferredSelector.done(function (result) {
      $(input).val(result.CSSSelector)

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
    var $tbody = $('.feature-columns table tbody')
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
    var sitemap = this.getCurrentlyEditedSelectorSitemap()
    var selector = this.getCurrentlyEditedSelector()
    var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds()
    var CSSSelector = sitemap.selectors.getCSSSelectorWithinOnePage(selector.id, currentStateParentSelectorIds)
    var deferredHTML = this.contentScript.getHTML({CSSSelector: CSSSelector})

    return deferredHTML
  },
  previewSelector: function (button) {
    if (!$(button).hasClass('preview')) {
      var sitemap = this.getCurrentlyEditedSelectorSitemap()
      var selector = this.getCurrentlyEditedSelector()
      var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds()
      var parentCSSSelector = sitemap.selectors.getParentCSSSelectorWithinOnePage(currentStateParentSelectorIds)
      var deferredSelectorPreview = this.contentScript.previewSelector({
        parentCSSSelector: parentCSSSelector,
        elementCSSSelector: selector.selector
      })

      deferredSelectorPreview.done(function () {
        $(button).addClass('preview')
      })
    } else {
      this.contentScript.removeCurrentContentSelector()
      $(button).removeClass('preview')
    }
  },
  previewClickElementSelector: function (button) {
    if (!$(button).hasClass('preview')) {
      var sitemap = this.state.currentSitemap
      var selector = this.getCurrentlyEditedSelector()
      var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds()
      var parentCSSSelector = sitemap.selectors.getParentCSSSelectorWithinOnePage(currentStateParentSelectorIds)

      var deferredSelectorPreview = this.contentScript.previewSelector({
        parentCSSSelector: parentCSSSelector,
        elementCSSSelector: selector.clickElementSelector
      })

      deferredSelectorPreview.done(function () {
        $(button).addClass('preview')
      })
    } else {
      this.contentScript.removeCurrentContentSelector()
      $(button).removeClass('preview')
    }
  },
  previewTableRowSelector: function (button) {
    if (!$(button).hasClass('preview')) {
      var sitemap = this.getCurrentlyEditedSelectorSitemap()
      var selector = this.getCurrentlyEditedSelector()
      var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds()
      var parentCSSSelector = sitemap.selectors.getCSSSelectorWithinOnePage(selector.id, currentStateParentSelectorIds)
      var rowSelector = $(button).closest('.form-group').find('input').val()

      var deferredSelectorPreview = this.contentScript.previewSelector({
        parentCSSSelector: parentCSSSelector,
        elementCSSSelector: rowSelector
      })

      deferredSelectorPreview.done(function () {
        $(button).addClass('preview')
      })
    } else {
      this.contentScript.removeCurrentContentSelector()
      $(button).removeClass('preview')
    }
  },
  previewSelectorFromSelectorTree: function (button) {
    if (!$(button).hasClass('preview')) {
      var sitemap = this.state.currentSitemap
      var selector = $(button).closest('tr').data('selector')
      var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds()
      var parentCSSSelector = sitemap.selectors.getParentCSSSelectorWithinOnePage(currentStateParentSelectorIds)
      var deferredSelectorPreview = this.contentScript.previewSelector({
        parentCSSSelector: parentCSSSelector,
        elementCSSSelector: selector.selector
      })

      deferredSelectorPreview.done(function () {
        $(button).addClass('preview')
      })
    } else {
      this.contentScript.removeCurrentContentSelector()
      $(button).removeClass('preview')
    }
  },
  previewSelectorDataFromSelectorTree: function (button) {
    var sitemap = this.state.currentSitemap
    var selector = $(button).closest('tr').data('selector')
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
      $('#viewport').append($dataPreviewPanel)
      $dataPreviewPanel.modal('show')
			// display data
			// Doing this the long way so there aren't xss vulnerubilites
			// while working with data or with the selector titles
      var $tbody = $('tbody', $dataPreviewPanel)
      response.forEach(function (row) {
        var $tr = $('<tr></tr>')
        dataColumns.forEach(function (column) {
          var $td = $('<td></td>')
          var cellData = row[column]
          if (typeof cellData === 'object') {
            cellData = JSON.stringify(cellData)
          }
          $td.text(cellData)
          $tr.append($td)
        })
        $tbody.append($tr)
      })

      var windowHeight = $(window).height()

      $('.data-preview-modal .modal-body').height(windowHeight - 130)

			// remove modal from dom after it is closed
      $dataPreviewPanel.on('hidden.bs.modal', function () {
        $(this).remove()
      })
    })
  },
	/**
	 * Add start url to sitemap creation or editing form
	 * @param button
	 */
  addStartUrl: function (button) {
    var $startUrlInputField = ich.SitemapStartUrlField()
    $('#viewport .start-url-block:last').after($startUrlInputField)
    var validator = this.getFormValidator()
    validator.addField($startUrlInputField.find('input'))
  },
	/**
	 * Remove start url from sitemap creation or editing form.
	 * @param button
	 */
  removeStartUrl: function (button) {
    var $block = $(button).closest('.start-url-block')
    if ($('#viewport .start-url-block').length > 1) {
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
 * @param parentElement
 * @param selector
 */
var ElementQuery = function (CSSSelector, parentElement) {
  CSSSelector = CSSSelector || ''

  var selectedElements = []

  var addElement = function (element) {
    if (selectedElements.indexOf(element) === -1) {
      selectedElements.push(element)
    }
  }

  var selectorParts = ElementQuery.getSelectorParts(CSSSelector)
  selectorParts.forEach(function (selector) {
		// handle special case when parent is selected
    if (selector === '_parent_') {
      $(parentElement).each(function (i, element) {
        addElement(element)
      })
    }		else {
      var elements = $(selector, $(parentElement))
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

var Selector = function (selector) {
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
    var elements = ElementQuery(this.selector, parentElement)
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
    dfd.resolve(jQuery.makeArray(elements))

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

    var elements = this.getDataElements(parentElement)

    var result = []
    $(elements).each(function (k, element) {
      var data = {}

      data[this.id] = $(element).attr(this.extractAttribute)
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
    var clickElements = ElementQuery(this.clickElementSelector, parentElement)
    return clickElements
  },

	/**
	 * Check whether element is still reachable from html. Useful to check whether the element is removed from DOM.
	 * @param element
	 */
  isElementInHTML: function (element) {
    return $(element).closest('html').length !== 0
  },

  triggerButtonClick: function (clickElement) {
    var cs = new CssSelector({
      enableSmartTableSelector: false,
      parent: $('body')[0],
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
    var delay = parseInt(this.delay) || 0
    var deferredResponse = jquery.Deferred()
    var foundElements = new UniqueElementList('uniqueText')
    var clickElements = this.getClickElements(parentElement)
    var doneClickingElements = new UniqueElementList(this.getClickElementUniquenessType())

		// add elements that are available before clicking
    var elements = this.getDataElements(parentElement)
    elements.forEach(foundElements.push.bind(foundElements))

		// discard initial elements
    if (this.discardInitialElements) {
      foundElements = new UniqueElementList('uniqueText')
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
        deferredResponse.resolve(jQuery.makeArray(elements))
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

		// cannot reuse this.getDataElements because it depends on *multiple* property
    var elements = $(this.selector, parentElement)

    var records = []
    $(elements).each(function (k, element) {
      var data = {}

      data[this.id] = $(element).text()

      if (this.extractAttribute) {
        data[this.id + '-' + this.extractAttribute] = $(element).attr(this.extractAttribute)
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

    var elements = this.getDataElements(parentElement)

    var result = []
    $(elements).each(function (k, element) {
      var data = {}
      var html = $(element).html()

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
    $(elements).each(function (i, element) {
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

  getTableHeaderRowSelectorFromTableHTML: function (html) {
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

  getTableDataRowSelectorFromTableHTML: function (html) {
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
  getTableHeaderColumnsFromHTML: function (headerRowSelector, html) {
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

var SelectorList = function (selectors) {
  if (selectors === undefined) {
    return
  }

  for (var i = 0; i < selectors.length; i++) {
    this.push(selectors[i])
  }
}

SelectorList.prototype = new Array()

SelectorList.prototype.push = function (selector) {
  if (!this.hasSelector(selector.id)) {
    if (!(selector instanceof Selector)) {
      selector = new Selector(selector)
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
  var resultSelectors = new SelectorList()
  this.forEach(function (selector) {
    if (selector.hasParentSelector(parentSelectorId)) {
      resultSelectors.push(selector)
    }
  })
  return resultSelectors
}

SelectorList.prototype.clone = function () {
  var resultList = new SelectorList()
  this.forEach(function (selector) {
    resultList.push(selector)
  })
  return resultList
}

SelectorList.prototype.fullClone = function () {
  var resultList = new SelectorList()
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
  var resultList = new SelectorList()
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
  var resultList = new SelectorList()
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
var Sitemap = function (sitemapObj) {
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
    this.selectors = new SelectorList(this.selectors)
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
      selector = new Selector(selectorData)
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
var StoreDevtools = function () {

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
    var request = {
      getAllSitemaps: true
    }

    chrome.runtime.sendMessage(request, function (response) {
      var sitemaps = []

      for (var i in response) {
        sitemaps.push(new Sitemap(response[i]))
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
function UniqueElementList (clickElementUniquenessType) {
  this.clickElementUniquenessType = clickElementUniquenessType
  this.addedElements = {}
}

UniqueElementList.prototype = []

UniqueElementList.prototype.push = function (element) {
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
 * @param backgroundScript	BackgroundScript client
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJleHRlbnNpb24vYXNzZXRzL2Jhc2U2NC5qcyIsImV4dGVuc2lvbi9hc3NldHMvanF1ZXJ5LndoZW5jYWxsc2VxdWVudGlhbGx5LmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvQXBwLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvQmFja2dyb3VuZFNjcmlwdC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL0NvbnRlbnRTY3JpcHQuanMiLCJleHRlbnNpb24vc2NyaXB0cy9Db250ZW50U2VsZWN0b3IuanMiLCJleHRlbnNpb24vc2NyaXB0cy9Db250cm9sbGVyLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvRWxlbWVudFF1ZXJ5LmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckVsZW1lbnQuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckVsZW1lbnRBdHRyaWJ1dGUuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckVsZW1lbnRDbGljay5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9yL1NlbGVjdG9yRWxlbWVudFNjcm9sbC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9yL1NlbGVjdG9yR3JvdXAuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckhUTUwuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckltYWdlLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IvU2VsZWN0b3JMaW5rLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IvU2VsZWN0b3JQb3B1cExpbmsuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvclRhYmxlLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IvU2VsZWN0b3JUZXh0LmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3JMaXN0LmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3JzLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2l0ZW1hcC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1N0b3JlRGV2dG9vbHMuanMiLCJleHRlbnNpb24vc2NyaXB0cy9VbmlxdWVFbGVtZW50TGlzdC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL2dldEJhY2tncm91bmRTY3JpcHQuanMiLCJleHRlbnNpb24vc2NyaXB0cy9nZXRDb250ZW50U2NyaXB0LmpzIiwibm9kZV9tb2R1bGVzL2Nzcy1zZWxlY3Rvci9saWIvQ3NzU2VsZWN0b3IuanMiLCJub2RlX21vZHVsZXMvanF1ZXJ5LWRlZmVycmVkL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2pxdWVyeS1kZWZlcnJlZC9saWIvanF1ZXJ5LWNhbGxiYWNrcy5qcyIsIm5vZGVfbW9kdWxlcy9qcXVlcnktZGVmZXJyZWQvbGliL2pxdWVyeS1jb3JlLmpzIiwibm9kZV9tb2R1bGVzL2pxdWVyeS1kZWZlcnJlZC9saWIvanF1ZXJ5LWRlZmVycmVkLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzEwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDck5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdlQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxuLyoqXG4gKiBAdXJsIGh0dHA6Ly9qc3BlcmYuY29tL2Jsb2ItYmFzZTY0LWNvbnZlcnNpb25cbiAqIEB0eXBlIHt7YmxvYlRvQmFzZTY0OiBibG9iVG9CYXNlNjQsIGJhc2U2NFRvQmxvYjogYmFzZTY0VG9CbG9ifX1cbiAqL1xudmFyIEJhc2U2NCA9IHtcblxuICBibG9iVG9CYXNlNjQ6IGZ1bmN0aW9uIChibG9iKSB7XG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBkYXRhVXJsID0gcmVhZGVyLnJlc3VsdFxuICAgICAgdmFyIGJhc2U2NCA9IGRhdGFVcmwuc3BsaXQoJywnKVsxXVxuICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKGJhc2U2NClcbiAgICB9XG4gICAgcmVhZGVyLnJlYWRBc0RhdGFVUkwoYmxvYilcblxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG4gIGJhc2U2NFRvQmxvYjogZnVuY3Rpb24gKGJhc2U2NCwgbWltZVR5cGUpIHtcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIGJpbmFyeSA9IGF0b2IoYmFzZTY0KVxuICAgIHZhciBsZW4gPSBiaW5hcnkubGVuZ3RoXG4gICAgdmFyIGJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcihsZW4pXG4gICAgdmFyIHZpZXcgPSBuZXcgVWludDhBcnJheShidWZmZXIpXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgdmlld1tpXSA9IGJpbmFyeS5jaGFyQ29kZUF0KGkpXG4gICAgfVxuICAgIHZhciBibG9iID0gbmV3IEJsb2IoW3ZpZXddLCB7dHlwZTogbWltZVR5cGV9KVxuICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZShibG9iKVxuXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlNjRcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxuLyoqXG4gKiBAYXV0aG9yIE1hcnRpbnMgQmFsb2Rpc1xuICpcbiAqIEFuIGFsdGVybmF0aXZlIHZlcnNpb24gb2YgJC53aGVuIHdoaWNoIGNhbiBiZSB1c2VkIHRvIGV4ZWN1dGUgYXN5bmNocm9ub3VzXG4gKiBjYWxscyBzZXF1ZW50aWFsbHkgb25lIGFmdGVyIGFub3RoZXIuXG4gKlxuICogQHJldHVybnMganF1ZXJ5RGVmZXJyZWQoKS5wcm9taXNlKClcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB3aGVuQ2FsbFNlcXVlbnRpYWxseSAoZnVuY3Rpb25DYWxscykge1xuICB2YXIgZGVmZXJyZWRSZXNvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgdmFyIHJlc3VsdERhdGEgPSBbXVxuXG5cdC8vIG5vdGhpbmcgdG8gZG9cbiAgaWYgKGZ1bmN0aW9uQ2FsbHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIGRlZmVycmVkUmVzb25zZS5yZXNvbHZlKHJlc3VsdERhdGEpLnByb21pc2UoKVxuICB9XG5cbiAgdmFyIGN1cnJlbnREZWZlcnJlZCA9IGZ1bmN0aW9uQ2FsbHMuc2hpZnQoKSgpXG5cdC8vIGV4ZWN1dGUgc3luY2hyb25vdXMgY2FsbHMgc3luY2hyb25vdXNseVxuICB3aGlsZSAoY3VycmVudERlZmVycmVkLnN0YXRlKCkgPT09ICdyZXNvbHZlZCcpIHtcbiAgICBjdXJyZW50RGVmZXJyZWQuZG9uZShmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgcmVzdWx0RGF0YS5wdXNoKGRhdGEpXG4gICAgfSlcbiAgICBpZiAoZnVuY3Rpb25DYWxscy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBkZWZlcnJlZFJlc29uc2UucmVzb2x2ZShyZXN1bHREYXRhKS5wcm9taXNlKClcbiAgICB9XG4gICAgY3VycmVudERlZmVycmVkID0gZnVuY3Rpb25DYWxscy5zaGlmdCgpKClcbiAgfVxuXG5cdC8vIGhhbmRsZSBhc3luYyBjYWxsc1xuICB2YXIgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG5cdFx0Ly8gaGFuZGxlIG1peGVkIHN5bmMgY2FsbHNcbiAgICB3aGlsZSAoY3VycmVudERlZmVycmVkLnN0YXRlKCkgPT09ICdyZXNvbHZlZCcpIHtcbiAgICAgIGN1cnJlbnREZWZlcnJlZC5kb25lKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHJlc3VsdERhdGEucHVzaChkYXRhKVxuICAgICAgfSlcbiAgICAgIGlmIChmdW5jdGlvbkNhbGxzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKVxuICAgICAgICBkZWZlcnJlZFJlc29uc2UucmVzb2x2ZShyZXN1bHREYXRhKVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY3VycmVudERlZmVycmVkID0gZnVuY3Rpb25DYWxscy5zaGlmdCgpKClcbiAgICB9XG4gIH0sIDEwKVxuXG4gIHJldHVybiBkZWZlcnJlZFJlc29uc2UucHJvbWlzZSgpXG59XG4iLCJ2YXIgU3RvcmVEZXZ0b29scyA9IHJlcXVpcmUoJy4vU3RvcmVEZXZ0b29scycpXG52YXIgU2l0ZW1hcENvbnRyb2xsZXIgPSByZXF1aXJlKCcuL0NvbnRyb2xsZXInKVxuXG4kKGZ1bmN0aW9uICgpIHtcblx0Ly8gaW5pdCBib290c3RyYXAgYWxlcnRzXG4gICQoJy5hbGVydCcpLmFsZXJ0KClcblxuICB2YXIgc3RvcmUgPSBuZXcgU3RvcmVEZXZ0b29scygpXG4gIG5ldyBTaXRlbWFwQ29udHJvbGxlcih7XG4gICAgc3RvcmU6IHN0b3JlLFxuICAgIHRlbXBsYXRlRGlyOiAndmlld3MvJ1xuICB9KVxufSlcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxuLyoqXG4gKiBDb250ZW50U2NyaXB0IHRoYXQgY2FuIGJlIGNhbGxlZCBmcm9tIGFueXdoZXJlIHdpdGhpbiB0aGUgZXh0ZW5zaW9uXG4gKi9cbnZhciBCYWNrZ3JvdW5kU2NyaXB0ID0ge1xuXG4gIGR1bW15OiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGpxdWVyeS5EZWZlcnJlZCgpLnJlc29sdmUoJ2R1bW15JykucHJvbWlzZSgpXG4gIH0sXG5cblx0LyoqXG5cdCAqIFJldHVybnMgdGhlIGlkIG9mIHRoZSB0YWIgdGhhdCBpcyB2aXNpYmxlIHRvIHVzZXJcblx0ICogQHJldHVybnMganF1ZXJ5LkRlZmVycmVkKCkgaW50ZWdlclxuXHQgKi9cbiAgZ2V0QWN0aXZlVGFiSWQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgICBjaHJvbWUudGFicy5xdWVyeSh7XG4gICAgICBhY3RpdmU6IHRydWUsXG4gICAgICBjdXJyZW50V2luZG93OiB0cnVlXG4gICAgfSwgZnVuY3Rpb24gKHRhYnMpIHtcbiAgICAgIGlmICh0YWJzLmxlbmd0aCA8IDEpIHtcblx0XHRcdFx0Ly8gQFRPRE8gbXVzdCBiZSBydW5uaW5nIHdpdGhpbiBwb3B1cC4gbWF5YmUgZmluZCBhbm90aGVyIGFjdGl2ZSB3aW5kb3c/XG4gICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVqZWN0KFwiY291bGRuJ3QgZmluZCB0aGUgYWN0aXZlIHRhYlwiKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHRhYklkID0gdGFic1swXS5pZFxuICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUodGFiSWQpXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZS5wcm9taXNlKClcbiAgfSxcblxuXHQvKipcblx0ICogRXhlY3V0ZSBhIGZ1bmN0aW9uIHdpdGhpbiB0aGUgYWN0aXZlIHRhYiB3aXRoaW4gY29udGVudCBzY3JpcHRcblx0ICogQHBhcmFtIHJlcXVlc3QuZm5cdGZ1bmN0aW9uIHRvIGNhbGxcblx0ICogQHBhcmFtIHJlcXVlc3QucmVxdWVzdFx0cmVxdWVzdCB0aGF0IHdpbGwgYmUgcGFzc2VkIHRvIHRoZSBmdW5jdGlvblxuXHQgKi9cbiAgZXhlY3V0ZUNvbnRlbnRTY3JpcHQ6IGZ1bmN0aW9uIChyZXF1ZXN0KSB7XG4gICAgdmFyIHJlcVRvQ29udGVudFNjcmlwdCA9IHtcbiAgICAgIGNvbnRlbnRTY3JpcHRDYWxsOiB0cnVlLFxuICAgICAgZm46IHJlcXVlc3QuZm4sXG4gICAgICByZXF1ZXN0OiByZXF1ZXN0LnJlcXVlc3RcbiAgICB9XG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciBkZWZlcnJlZEFjdGl2ZVRhYklkID0gdGhpcy5nZXRBY3RpdmVUYWJJZCgpXG4gICAgZGVmZXJyZWRBY3RpdmVUYWJJZC5kb25lKGZ1bmN0aW9uICh0YWJJZCkge1xuICAgICAgY2hyb21lLnRhYnMuc2VuZE1lc3NhZ2UodGFiSWQsIHJlcVRvQ29udGVudFNjcmlwdCwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZShyZXNwb25zZSlcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBCYWNrZ3JvdW5kU2NyaXB0XG4iLCJ2YXIgQ29udGVudFNlbGVjdG9yID0gcmVxdWlyZSgnLi9Db250ZW50U2VsZWN0b3InKVxudmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG4vKipcbiAqIENvbnRlbnRTY3JpcHQgdGhhdCBjYW4gYmUgY2FsbGVkIGZyb20gYW55d2hlcmUgd2l0aGluIHRoZSBleHRlbnNpb25cbiAqL1xudmFyIENvbnRlbnRTY3JpcHQgPSB7XG5cblx0LyoqXG5cdCAqIEZldGNoXG5cdCAqIEBwYXJhbSByZXF1ZXN0LkNTU1NlbGVjdG9yXHRjc3Mgc2VsZWN0b3IgYXMgc3RyaW5nXG5cdCAqIEByZXR1cm5zIGpxdWVyeS5EZWZlcnJlZCgpXG5cdCAqL1xuICBnZXRIVE1MOiBmdW5jdGlvbiAocmVxdWVzdCkge1xuICAgIHZhciBkZWZlcnJlZEhUTUwgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciBodG1sID0gJChyZXF1ZXN0LkNTU1NlbGVjdG9yKS5jbG9uZSgpLndyYXAoJzxwPicpLnBhcmVudCgpLmh0bWwoKVxuICAgIGRlZmVycmVkSFRNTC5yZXNvbHZlKGh0bWwpXG4gICAgcmV0dXJuIGRlZmVycmVkSFRNTC5wcm9taXNlKClcbiAgfSxcblxuXHQvKipcblx0ICogUmVtb3ZlcyBjdXJyZW50IGNvbnRlbnQgc2VsZWN0b3IgaWYgaXMgaW4gdXNlIHdpdGhpbiB0aGUgcGFnZVxuXHQgKiBAcmV0dXJucyBqcXVlcnkuRGVmZXJyZWQoKVxuXHQgKi9cbiAgcmVtb3ZlQ3VycmVudENvbnRlbnRTZWxlY3RvcjogZnVuY3Rpb24gKCkge1xuICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgY29udGVudFNlbGVjdG9yID0gd2luZG93LmNzXG4gICAgaWYgKGNvbnRlbnRTZWxlY3RvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUoKVxuICAgIH0gZWxzZSB7XG4gICAgICBjb250ZW50U2VsZWN0b3IucmVtb3ZlR1VJKClcbiAgICAgIHdpbmRvdy5jcyA9IHVuZGVmaW5lZFxuICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKClcbiAgICB9XG5cbiAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZS5wcm9taXNlKClcbiAgfSxcblxuXHQvKipcblx0ICogU2VsZWN0IGVsZW1lbnRzIHdpdGhpbiB0aGUgcGFnZVxuXHQgKiBAcGFyYW0gcmVxdWVzdC5wYXJlbnRDU1NTZWxlY3RvclxuXHQgKiBAcGFyYW0gcmVxdWVzdC5hbGxvd2VkRWxlbWVudHNcblx0ICovXG4gIHNlbGVjdFNlbGVjdG9yOiBmdW5jdGlvbiAocmVxdWVzdCkge1xuICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICAgIHRoaXMucmVtb3ZlQ3VycmVudENvbnRlbnRTZWxlY3RvcigpLmRvbmUoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGNvbnRlbnRTZWxlY3RvciA9IG5ldyBDb250ZW50U2VsZWN0b3Ioe1xuICAgICAgICBwYXJlbnRDU1NTZWxlY3RvcjogcmVxdWVzdC5wYXJlbnRDU1NTZWxlY3RvcixcbiAgICAgICAgYWxsb3dlZEVsZW1lbnRzOiByZXF1ZXN0LmFsbG93ZWRFbGVtZW50c1xuICAgICAgfSlcbiAgICAgIHdpbmRvdy5jcyA9IGNvbnRlbnRTZWxlY3RvclxuXG4gICAgICB2YXIgZGVmZXJyZWRDU1NTZWxlY3RvciA9IGNvbnRlbnRTZWxlY3Rvci5nZXRDU1NTZWxlY3RvcigpXG4gICAgICBkZWZlcnJlZENTU1NlbGVjdG9yLmRvbmUoZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlQ3VycmVudENvbnRlbnRTZWxlY3RvcigpLmRvbmUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZShyZXNwb25zZSlcbiAgICAgICAgICB3aW5kb3cuY3MgPSB1bmRlZmluZWRcbiAgICAgICAgfSlcbiAgICAgIH0uYmluZCh0aGlzKSkuZmFpbChmdW5jdGlvbiAobWVzc2FnZSkge1xuICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlamVjdChtZXNzYWdlKVxuICAgICAgICB3aW5kb3cuY3MgPSB1bmRlZmluZWRcbiAgICAgIH0pXG4gICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gIH0sXG5cblx0LyoqXG5cdCAqIFByZXZpZXcgZWxlbWVudHNcblx0ICogQHBhcmFtIHJlcXVlc3QucGFyZW50Q1NTU2VsZWN0b3Jcblx0ICogQHBhcmFtIHJlcXVlc3QuZWxlbWVudENTU1NlbGVjdG9yXG5cdCAqL1xuICBwcmV2aWV3U2VsZWN0b3I6IGZ1bmN0aW9uIChyZXF1ZXN0KSB7XG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHRoaXMucmVtb3ZlQ3VycmVudENvbnRlbnRTZWxlY3RvcigpLmRvbmUoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGNvbnRlbnRTZWxlY3RvciA9IG5ldyBDb250ZW50U2VsZWN0b3Ioe1xuICAgICAgICBwYXJlbnRDU1NTZWxlY3RvcjogcmVxdWVzdC5wYXJlbnRDU1NTZWxlY3RvclxuICAgICAgfSlcbiAgICAgIHdpbmRvdy5jcyA9IGNvbnRlbnRTZWxlY3RvclxuXG4gICAgICB2YXIgZGVmZXJyZWRTZWxlY3RvclByZXZpZXcgPSBjb250ZW50U2VsZWN0b3IucHJldmlld1NlbGVjdG9yKHJlcXVlc3QuZWxlbWVudENTU1NlbGVjdG9yKVxuICAgICAgZGVmZXJyZWRTZWxlY3RvclByZXZpZXcuZG9uZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZSgpXG4gICAgICB9KS5mYWlsKGZ1bmN0aW9uIChtZXNzYWdlKSB7XG4gICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVqZWN0KG1lc3NhZ2UpXG4gICAgICAgIHdpbmRvdy5jcyA9IHVuZGVmaW5lZFxuICAgICAgfSlcbiAgICB9KVxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50U2NyaXB0XG4iLCJ2YXIgRWxlbWVudFF1ZXJ5ID0gcmVxdWlyZSgnLi9FbGVtZW50UXVlcnknKVxudmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgQ3NzU2VsZWN0b3IgPSByZXF1aXJlKCdjc3Mtc2VsZWN0b3InKS5Dc3NTZWxlY3RvclxuLyoqXG4gKiBAcGFyYW0gb3B0aW9ucy5wYXJlbnRDU1NTZWxlY3Rvclx0RWxlbWVudHMgY2FuIGJlIG9ubHkgc2VsZWN0ZWQgd2l0aGluIHRoaXMgZWxlbWVudFxuICogQHBhcmFtIG9wdGlvbnMuYWxsb3dlZEVsZW1lbnRzXHRFbGVtZW50cyB0aGF0IGNhbiBvbmx5IGJlIHNlbGVjdGVkXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIENvbnRlbnRTZWxlY3RvciA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG5cdC8vIGRlZmVycmVkIHJlc3BvbnNlXG4gIHRoaXMuZGVmZXJyZWRDU1NTZWxlY3RvclJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICB0aGlzLmFsbG93ZWRFbGVtZW50cyA9IG9wdGlvbnMuYWxsb3dlZEVsZW1lbnRzXG4gIHRoaXMucGFyZW50Q1NTU2VsZWN0b3IgPSBvcHRpb25zLnBhcmVudENTU1NlbGVjdG9yLnRyaW0oKVxuICB0aGlzLmFsZXJ0ID0gb3B0aW9ucy5hbGVydCB8fCBmdW5jdGlvbiAodHh0KSB7IGFsZXJ0KHR4dCkgfVxuXG4gIGlmICh0aGlzLnBhcmVudENTU1NlbGVjdG9yKSB7XG4gICAgdGhpcy5wYXJlbnQgPSAkKHRoaXMucGFyZW50Q1NTU2VsZWN0b3IpWzBdXG5cblx0XHQvLyAgaGFuZGxlIHNpdHVhdGlvbiB3aGVuIHBhcmVudCBzZWxlY3RvciBub3QgZm91bmRcbiAgICBpZiAodGhpcy5wYXJlbnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5kZWZlcnJlZENTU1NlbGVjdG9yUmVzcG9uc2UucmVqZWN0KCdwYXJlbnQgc2VsZWN0b3Igbm90IGZvdW5kJylcbiAgICAgIHRoaXMuYWxlcnQoJ1BhcmVudCBlbGVtZW50IG5vdCBmb3VuZCEnKVxuICAgIH1cbiAgfVx0ZWxzZSB7XG4gICAgdGhpcy5wYXJlbnQgPSAkKCdib2R5JylbMF1cbiAgfVxufVxuXG5Db250ZW50U2VsZWN0b3IucHJvdG90eXBlID0ge1xuXG5cdC8qKlxuXHQgKiBnZXQgY3NzIHNlbGVjdG9yIHNlbGVjdGVkIGJ5IHRoZSB1c2VyXG5cdCAqL1xuICBnZXRDU1NTZWxlY3RvcjogZnVuY3Rpb24gKHJlcXVlc3QpIHtcbiAgICBpZiAodGhpcy5kZWZlcnJlZENTU1NlbGVjdG9yUmVzcG9uc2Uuc3RhdGUoKSAhPT0gJ3JlamVjdGVkJykge1xuXHRcdFx0Ly8gZWxlbWVudHMgdGhhdCBhcmUgc2VsZWN0ZWQgYnkgdGhlIHVzZXJcbiAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50cyA9IFtdXG5cdFx0XHQvLyBlbGVtZW50IHNlbGVjdGVkIGZyb20gdG9wXG4gICAgICB0aGlzLnRvcCA9IDBcblxuXHRcdFx0Ly8gaW5pdGlhbGl6ZSBjc3Mgc2VsZWN0b3JcbiAgICAgIHRoaXMuaW5pdENzc1NlbGVjdG9yKGZhbHNlKVxuXG4gICAgICB0aGlzLmluaXRHVUkoKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmRlZmVycmVkQ1NTU2VsZWN0b3JSZXNwb25zZS5wcm9taXNlKClcbiAgfSxcblxuICBnZXRDdXJyZW50Q1NTU2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5zZWxlY3RlZEVsZW1lbnRzICYmIHRoaXMuc2VsZWN0ZWRFbGVtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICB2YXIgY3NzU2VsZWN0b3JcblxuXHRcdFx0Ly8gaGFuZGxlIHNwZWNpYWwgY2FzZSB3aGVuIHBhcmVudCBpcyBzZWxlY3RlZFxuICAgICAgaWYgKHRoaXMuaXNQYXJlbnRTZWxlY3RlZCgpKSB7XG4gICAgICAgIGlmICh0aGlzLnNlbGVjdGVkRWxlbWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgY3NzU2VsZWN0b3IgPSAnX3BhcmVudF8nXG4gICAgICAgIH0gZWxzZSBpZiAoJCgnIy1zZWxlY3Rvci10b29sYmFyIFtuYW1lPWRpZmVyZW50RWxlbWVudFNlbGVjdGlvbl0nKS5wcm9wKCdjaGVja2VkJykpIHtcbiAgICAgICAgICB2YXIgc2VsZWN0ZWRFbGVtZW50cyA9IHRoaXMuc2VsZWN0ZWRFbGVtZW50cy5jbG9uZSgpXG4gICAgICAgICAgc2VsZWN0ZWRFbGVtZW50cy5zcGxpY2Uoc2VsZWN0ZWRFbGVtZW50cy5pbmRleE9mKHRoaXMucGFyZW50KSwgMSlcbiAgICAgICAgICBjc3NTZWxlY3RvciA9ICdfcGFyZW50XywgJyArIHRoaXMuY3NzU2VsZWN0b3IuZ2V0Q3NzU2VsZWN0b3Ioc2VsZWN0ZWRFbGVtZW50cywgdGhpcy50b3ApXG4gICAgICAgIH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gd2lsbCB0cmlnZ2VyIGVycm9yIHdoZXJlIG11bHRpcGxlIHNlbGVjdGlvbnMgYXJlIG5vdCBhbGxvd2VkXG4gICAgICAgICAgY3NzU2VsZWN0b3IgPSB0aGlzLmNzc1NlbGVjdG9yLmdldENzc1NlbGVjdG9yKHRoaXMuc2VsZWN0ZWRFbGVtZW50cywgdGhpcy50b3ApXG4gICAgICAgIH1cbiAgICAgIH1cdFx0XHRlbHNlIHtcbiAgICAgICAgY3NzU2VsZWN0b3IgPSB0aGlzLmNzc1NlbGVjdG9yLmdldENzc1NlbGVjdG9yKHRoaXMuc2VsZWN0ZWRFbGVtZW50cywgdGhpcy50b3ApXG4gICAgICB9XG5cbiAgICAgIHJldHVybiBjc3NTZWxlY3RvclxuICAgIH1cbiAgICByZXR1cm4gJydcbiAgfSxcblxuICBpc1BhcmVudFNlbGVjdGVkOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuc2VsZWN0ZWRFbGVtZW50cy5pbmRleE9mKHRoaXMucGFyZW50KSAhPT0gLTFcbiAgfSxcblxuXHQvKipcblx0ICogaW5pdGlhbGl6ZSBvciByZWNvbmZpZ3VyZSBjc3Mgc2VsZWN0b3IgY2xhc3Ncblx0ICogQHBhcmFtIGFsbG93TXVsdGlwbGVTZWxlY3RvcnNcblx0ICovXG4gIGluaXRDc3NTZWxlY3RvcjogZnVuY3Rpb24gKGFsbG93TXVsdGlwbGVTZWxlY3RvcnMpIHtcbiAgICB0aGlzLmNzc1NlbGVjdG9yID0gbmV3IENzc1NlbGVjdG9yKHtcbiAgICAgIGVuYWJsZVNtYXJ0VGFibGVTZWxlY3RvcjogdHJ1ZSxcbiAgICAgIHBhcmVudDogdGhpcy5wYXJlbnQsXG4gICAgICBhbGxvd011bHRpcGxlU2VsZWN0b3JzOiBhbGxvd011bHRpcGxlU2VsZWN0b3JzLFxuICAgICAgaWdub3JlZENsYXNzZXM6IFtcbiAgICAgICAgJy1zaXRlbWFwLXNlbGVjdC1pdGVtLXNlbGVjdGVkJyxcbiAgICAgICAgJy1zaXRlbWFwLXNlbGVjdC1pdGVtLWhvdmVyJyxcbiAgICAgICAgJy1zaXRlbWFwLXBhcmVudCcsXG4gICAgICAgICctd2ViLXNjcmFwZXItaW1nLW9uLXRvcCcsXG4gICAgICAgICctd2ViLXNjcmFwZXItc2VsZWN0aW9uLWFjdGl2ZSdcbiAgICAgIF0sXG4gICAgICBxdWVyeTogalF1ZXJ5XG4gICAgfSlcbiAgfSxcblxuICBwcmV2aWV3U2VsZWN0b3I6IGZ1bmN0aW9uIChlbGVtZW50Q1NTU2VsZWN0b3IpIHtcbiAgICBpZiAodGhpcy5kZWZlcnJlZENTU1NlbGVjdG9yUmVzcG9uc2Uuc3RhdGUoKSAhPT0gJ3JlamVjdGVkJykge1xuICAgICAgdGhpcy5oaWdobGlnaHRQYXJlbnQoKVxuICAgICAgJChFbGVtZW50UXVlcnkoZWxlbWVudENTU1NlbGVjdG9yLCB0aGlzLnBhcmVudCkpLmFkZENsYXNzKCctc2l0ZW1hcC1zZWxlY3QtaXRlbS1zZWxlY3RlZCcpXG4gICAgICB0aGlzLmRlZmVycmVkQ1NTU2VsZWN0b3JSZXNwb25zZS5yZXNvbHZlKClcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5kZWZlcnJlZENTU1NlbGVjdG9yUmVzcG9uc2UucHJvbWlzZSgpXG4gIH0sXG5cbiAgaW5pdEdVSTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuaGlnaGxpZ2h0UGFyZW50KClcblxuXHRcdC8vIGFsbCBlbGVtZW50cyBleGNlcHQgdG9vbGJhclxuICAgIHRoaXMuJGFsbEVsZW1lbnRzID0gJCh0aGlzLmFsbG93ZWRFbGVtZW50cyArICc6bm90KCMtc2VsZWN0b3ItdG9vbGJhcik6bm90KCMtc2VsZWN0b3ItdG9vbGJhciAqKScsIHRoaXMucGFyZW50KVxuXHRcdC8vIGFsbG93IHNlbGVjdGluZyBwYXJlbnQgYWxzb1xuICAgIGlmICh0aGlzLnBhcmVudCAhPT0gZG9jdW1lbnQuYm9keSkge1xuICAgICAgdGhpcy4kYWxsRWxlbWVudHMucHVzaCh0aGlzLnBhcmVudClcbiAgICB9XG5cbiAgICB0aGlzLmJpbmRFbGVtZW50SGlnaGxpZ2h0KClcbiAgICB0aGlzLmJpbmRFbGVtZW50U2VsZWN0aW9uKClcbiAgICB0aGlzLmJpbmRLZXlib2FyZFNlbGVjdGlvbk1hbmlwdWxhdGlvbnMoKVxuICAgIHRoaXMuYXR0YWNoVG9vbGJhcigpXG4gICAgdGhpcy5iaW5kTXVsdGlwbGVHcm91cENoZWNrYm94KClcbiAgICB0aGlzLmJpbmRNdWx0aXBsZUdyb3VwUG9wdXBIaWRlKClcbiAgICB0aGlzLmJpbmRNb3ZlSW1hZ2VzVG9Ub3AoKVxuICB9LFxuXG4gIGJpbmRFbGVtZW50U2VsZWN0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kYWxsRWxlbWVudHMuYmluZCgnY2xpY2suZWxlbWVudFNlbGVjdG9yJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgIHZhciBlbGVtZW50ID0gZS5jdXJyZW50VGFyZ2V0XG4gICAgICBpZiAodGhpcy5zZWxlY3RlZEVsZW1lbnRzLmluZGV4T2YoZWxlbWVudCkgPT09IC0xKSB7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50cy5wdXNoKGVsZW1lbnQpXG4gICAgICB9XG4gICAgICB0aGlzLmhpZ2hsaWdodFNlbGVjdGVkRWxlbWVudHMoKVxuXG5cdFx0XHQvLyBDYW5jZWwgYWxsIG90aGVyIGV2ZW50c1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBBZGQgdG8gc2VsZWN0IGVsZW1lbnRzIHRoZSBlbGVtZW50IHRoYXQgaXMgdW5kZXIgdGhlIG1vdXNlXG5cdCAqL1xuICBzZWxlY3RNb3VzZU92ZXJFbGVtZW50OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGVsZW1lbnQgPSB0aGlzLm1vdXNlT3ZlckVsZW1lbnRcbiAgICBpZiAoZWxlbWVudCkge1xuICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnRzLnB1c2goZWxlbWVudClcbiAgICAgIHRoaXMuaGlnaGxpZ2h0U2VsZWN0ZWRFbGVtZW50cygpXG4gICAgfVxuICB9LFxuXG4gIGJpbmRFbGVtZW50SGlnaGxpZ2h0OiBmdW5jdGlvbiAoKSB7XG4gICAgJCh0aGlzLiRhbGxFbGVtZW50cykuYmluZCgnbW91c2VvdmVyLmVsZW1lbnRTZWxlY3RvcicsIGZ1bmN0aW9uIChlKSB7XG4gICAgICB2YXIgZWxlbWVudCA9IGUuY3VycmVudFRhcmdldFxuICAgICAgdGhpcy5tb3VzZU92ZXJFbGVtZW50ID0gZWxlbWVudFxuICAgICAgJChlbGVtZW50KS5hZGRDbGFzcygnLXNpdGVtYXAtc2VsZWN0LWl0ZW0taG92ZXInKVxuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfS5iaW5kKHRoaXMpKS5iaW5kKCdtb3VzZW91dC5lbGVtZW50U2VsZWN0b3InLCBmdW5jdGlvbiAoZSkge1xuICAgICAgdmFyIGVsZW1lbnQgPSBlLmN1cnJlbnRUYXJnZXRcbiAgICAgIHRoaXMubW91c2VPdmVyRWxlbWVudCA9IG51bGxcbiAgICAgICQoZWxlbWVudCkucmVtb3ZlQ2xhc3MoJy1zaXRlbWFwLXNlbGVjdC1pdGVtLWhvdmVyJylcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcblxuICBiaW5kTW92ZUltYWdlc1RvVG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgJCgnYm9keScpLmFkZENsYXNzKCctd2ViLXNjcmFwZXItc2VsZWN0aW9uLWFjdGl2ZScpXG5cblx0XHQvLyBkbyB0aGlzIG9ubHkgd2hlbiBzZWxlY3RpbmcgaW1hZ2VzXG4gICAgaWYgKHRoaXMuYWxsb3dlZEVsZW1lbnRzID09PSAnaW1nJykge1xuICAgICAgJCgnaW1nJykuZmlsdGVyKGZ1bmN0aW9uIChpLCBlbGVtZW50KSB7XG4gICAgICAgIHJldHVybiAkKGVsZW1lbnQpLmNzcygncG9zaXRpb24nKSA9PT0gJ3N0YXRpYydcbiAgICAgIH0pLmFkZENsYXNzKCctd2ViLXNjcmFwZXItaW1nLW9uLXRvcCcpXG4gICAgfVxuICB9LFxuXG4gIHVuYmluZE1vdmVJbWFnZXNUb1RvcDogZnVuY3Rpb24gKCkge1xuICAgICQoJ2JvZHkuLXdlYi1zY3JhcGVyLXNlbGVjdGlvbi1hY3RpdmUnKS5yZW1vdmVDbGFzcygnLXdlYi1zY3JhcGVyLXNlbGVjdGlvbi1hY3RpdmUnKVxuICAgICQoJ2ltZy4td2ViLXNjcmFwZXItaW1nLW9uLXRvcCcpLnJlbW92ZUNsYXNzKCctd2ViLXNjcmFwZXItaW1nLW9uLXRvcCcpXG4gIH0sXG5cbiAgc2VsZWN0Q2hpbGQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnRvcC0tXG4gICAgaWYgKHRoaXMudG9wIDwgMCkge1xuICAgICAgdGhpcy50b3AgPSAwXG4gICAgfVxuICB9LFxuICBzZWxlY3RQYXJlbnQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnRvcCsrXG4gIH0sXG5cblx0Ly8gVXNlciB3aXRoIGtleWJvYXJkIGFycm93cyBjYW4gc2VsZWN0IGNoaWxkIG9yIHBhcmV0IGVsZW1lbnRzIG9mIHNlbGVjdGVkIGVsZW1lbnRzLlxuICBiaW5kS2V5Ym9hcmRTZWxlY3Rpb25NYW5pcHVsYXRpb25zOiBmdW5jdGlvbiAoKSB7XG5cdFx0Ly8gY2hlY2sgZm9yIGZvY3VzXG4gICAgdmFyIGxhc3RGb2N1c1N0YXR1c1xuICAgIHRoaXMua2V5UHJlc3NGb2N1c0ludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGZvY3VzID0gZG9jdW1lbnQuaGFzRm9jdXMoKVxuICAgICAgaWYgKGZvY3VzID09PSBsYXN0Rm9jdXNTdGF0dXMpIHJldHVyblxuICAgICAgbGFzdEZvY3VzU3RhdHVzID0gZm9jdXNcblxuICAgICAgJCgnIy1zZWxlY3Rvci10b29sYmFyIC5rZXktYnV0dG9uJykudG9nZ2xlQ2xhc3MoJ2hpZGUnLCAhZm9jdXMpXG4gICAgICAkKCcjLXNlbGVjdG9yLXRvb2xiYXIgLmtleS1ldmVudHMnKS50b2dnbGVDbGFzcygnaGlkZScsIGZvY3VzKVxuICAgIH0sIDIwMClcblxuXHRcdC8vIFVzaW5nIHVwL2Rvd24gYXJyb3dzIHVzZXIgY2FuIHNlbGVjdCBlbGVtZW50cyBmcm9tIHRvcCBvZiB0aGVcblx0XHQvLyBzZWxlY3RlZCBlbGVtZW50XG4gICAgJChkb2N1bWVudCkuYmluZCgna2V5ZG93bi5zZWxlY3Rpb25NYW5pcHVsYXRpb24nLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdC8vIHNlbGVjdCBjaGlsZCBDXG4gICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gNjcpIHtcbiAgICAgICAgdGhpcy5hbmltYXRlQ2xpY2tlZEtleSgkKCcjLXNlbGVjdG9yLXRvb2xiYXIgLmtleS1idXR0b24tY2hpbGQnKSlcbiAgICAgICAgdGhpcy5zZWxlY3RDaGlsZCgpXG4gICAgICB9XG5cdFx0XHQvLyBzZWxlY3QgcGFyZW50IFBcbiAgICAgIGVsc2UgaWYgKGV2ZW50LmtleUNvZGUgPT09IDgwKSB7XG4gICAgICAgIHRoaXMuYW5pbWF0ZUNsaWNrZWRLZXkoJCgnIy1zZWxlY3Rvci10b29sYmFyIC5rZXktYnV0dG9uLXBhcmVudCcpKVxuICAgICAgICB0aGlzLnNlbGVjdFBhcmVudCgpXG4gICAgICB9XG5cdFx0XHQvLyBzZWxlY3QgZWxlbWVudFxuICAgICAgZWxzZSBpZiAoZXZlbnQua2V5Q29kZSA9PT0gODMpIHtcbiAgICAgICAgdGhpcy5hbmltYXRlQ2xpY2tlZEtleSgkKCcjLXNlbGVjdG9yLXRvb2xiYXIgLmtleS1idXR0b24tc2VsZWN0JykpXG4gICAgICAgIHRoaXMuc2VsZWN0TW91c2VPdmVyRWxlbWVudCgpXG4gICAgICB9XG5cbiAgICAgIHRoaXMuaGlnaGxpZ2h0U2VsZWN0ZWRFbGVtZW50cygpXG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuXG4gIGFuaW1hdGVDbGlja2VkS2V5OiBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICQoZWxlbWVudCkucmVtb3ZlQ2xhc3MoJ2NsaWNrZWQnKS5yZW1vdmVDbGFzcygnY2xpY2tlZC1hbmltYXRpb24nKVxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgJChlbGVtZW50KS5hZGRDbGFzcygnY2xpY2tlZCcpXG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJChlbGVtZW50KS5hZGRDbGFzcygnY2xpY2tlZC1hbmltYXRpb24nKVxuICAgICAgfSwgMTAwKVxuICAgIH0sIDEpXG4gIH0sXG5cbiAgaGlnaGxpZ2h0U2VsZWN0ZWRFbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICB2YXIgcmVzdWx0Q3NzU2VsZWN0b3IgPSB0aGlzLmdldEN1cnJlbnRDU1NTZWxlY3RvcigpXG5cbiAgICAgICQoJ2JvZHkgIy1zZWxlY3Rvci10b29sYmFyIC5zZWxlY3RvcicpLnRleHQocmVzdWx0Q3NzU2VsZWN0b3IpXG5cdFx0XHQvLyBoaWdobGlnaHQgc2VsZWN0ZWQgZWxlbWVudHNcbiAgICAgICQoJy4tc2l0ZW1hcC1zZWxlY3QtaXRlbS1zZWxlY3RlZCcpLnJlbW92ZUNsYXNzKCctc2l0ZW1hcC1zZWxlY3QtaXRlbS1zZWxlY3RlZCcpXG4gICAgICAkKEVsZW1lbnRRdWVyeShyZXN1bHRDc3NTZWxlY3RvciwgdGhpcy5wYXJlbnQpKS5hZGRDbGFzcygnLXNpdGVtYXAtc2VsZWN0LWl0ZW0tc2VsZWN0ZWQnKVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgaWYgKGVyciA9PT0gJ2ZvdW5kIG11bHRpcGxlIGVsZW1lbnQgZ3JvdXBzLCBidXQgYWxsb3dNdWx0aXBsZVNlbGVjdG9ycyBkaXNhYmxlZCcpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ211bHRpcGxlIGRpZmZlcmVudCBlbGVtZW50IHNlbGVjdGlvbiBkaXNhYmxlZCcpXG5cbiAgICAgICAgdGhpcy5zaG93TXVsdGlwbGVHcm91cFBvcHVwKClcblx0XHRcdFx0Ly8gcmVtb3ZlIGxhc3QgYWRkZWQgZWxlbWVudFxuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudHMucG9wKClcbiAgICAgICAgdGhpcy5oaWdobGlnaHRTZWxlY3RlZEVsZW1lbnRzKClcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgc2hvd011bHRpcGxlR3JvdXBQb3B1cDogZnVuY3Rpb24gKCkge1xuICAgICQoJyMtc2VsZWN0b3ItdG9vbGJhciAucG9wb3ZlcicpLmF0dHIoJ3N0eWxlJywgJ2Rpc3BsYXk6YmxvY2sgIWltcG9ydGFudDsnKVxuICB9LFxuXG4gIGhpZGVNdWx0aXBsZUdyb3VwUG9wdXA6IGZ1bmN0aW9uICgpIHtcbiAgICAkKCcjLXNlbGVjdG9yLXRvb2xiYXIgLnBvcG92ZXInKS5hdHRyKCdzdHlsZScsICcnKVxuICB9LFxuXG4gIGJpbmRNdWx0aXBsZUdyb3VwUG9wdXBIaWRlOiBmdW5jdGlvbiAoKSB7XG4gICAgJCgnIy1zZWxlY3Rvci10b29sYmFyIC5wb3BvdmVyIC5jbG9zZScpLmNsaWNrKHRoaXMuaGlkZU11bHRpcGxlR3JvdXBQb3B1cC5iaW5kKHRoaXMpKVxuICB9LFxuXG4gIHVuYmluZE11bHRpcGxlR3JvdXBQb3B1cEhpZGU6IGZ1bmN0aW9uICgpIHtcbiAgICAkKCcjLXNlbGVjdG9yLXRvb2xiYXIgLnBvcG92ZXIgLmNsb3NlJykudW5iaW5kKCdjbGljaycpXG4gIH0sXG5cbiAgYmluZE11bHRpcGxlR3JvdXBDaGVja2JveDogZnVuY3Rpb24gKCkge1xuICAgICQoJyMtc2VsZWN0b3ItdG9vbGJhciBbbmFtZT1kaWZlcmVudEVsZW1lbnRTZWxlY3Rpb25dJykuY2hhbmdlKGZ1bmN0aW9uIChlKSB7XG4gICAgICBpZiAoJChlLmN1cnJlbnRUYXJnZXQpLmlzKCc6Y2hlY2tlZCcpKSB7XG4gICAgICAgIHRoaXMuaW5pdENzc1NlbGVjdG9yKHRydWUpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmluaXRDc3NTZWxlY3RvcihmYWxzZSlcbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG4gIHVuYmluZE11bHRpcGxlR3JvdXBDaGVja2JveDogZnVuY3Rpb24gKCkge1xuICAgICQoJyMtc2VsZWN0b3ItdG9vbGJhciAuZGlmZXJlbnRFbGVtZW50U2VsZWN0aW9uJykudW5iaW5kKCdjaGFuZ2UnKVxuICB9LFxuXG4gIGF0dGFjaFRvb2xiYXI6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgJHRvb2xiYXIgPSAnPGRpdiBpZD1cIi1zZWxlY3Rvci10b29sYmFyXCI+JyArXG5cdFx0XHQnPGRpdiBjbGFzcz1cImxpc3QtaXRlbVwiPjxkaXYgY2xhc3M9XCJzZWxlY3Rvci1jb250YWluZXJcIj48ZGl2IGNsYXNzPVwic2VsZWN0b3JcIj48L2Rpdj48L2Rpdj48L2Rpdj4nICtcblx0XHRcdCc8ZGl2IGNsYXNzPVwiaW5wdXQtZ3JvdXAtYWRkb24gbGlzdC1pdGVtXCI+JyArXG5cdFx0XHRcdCc8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgdGl0bGU9XCJFbmFibGUgZGlmZmVyZW50IHR5cGUgZWxlbWVudCBzZWxlY3Rpb25cIiBuYW1lPVwiZGlmZXJlbnRFbGVtZW50U2VsZWN0aW9uXCI+JyArXG5cdFx0XHRcdCc8ZGl2IGNsYXNzPVwicG9wb3ZlciB0b3BcIj4nICtcblx0XHRcdFx0JzxkaXYgY2xhc3M9XCJjbG9zZVwiPsOXPC9kaXY+JyArXG5cdFx0XHRcdCc8ZGl2IGNsYXNzPVwiYXJyb3dcIj48L2Rpdj4nICtcblx0XHRcdFx0JzxkaXYgY2xhc3M9XCJwb3BvdmVyLWNvbnRlbnRcIj4nICtcblx0XHRcdFx0JzxkaXYgY2xhc3M9XCJ0eHRcIj4nICtcblx0XHRcdFx0J0RpZmZlcmVudCB0eXBlIGVsZW1lbnQgc2VsZWN0aW9uIGlzIGRpc2FibGVkLiBJZiB0aGUgZWxlbWVudCAnICtcblx0XHRcdFx0J3lvdSBjbGlja2VkIHNob3VsZCBhbHNvIGJlIGluY2x1ZGVkIHRoZW4gZW5hYmxlIHRoaXMgYW5kICcgK1xuXHRcdFx0XHQnY2xpY2sgb24gdGhlIGVsZW1lbnQgYWdhaW4uIFVzdWFsbHkgdGhpcyBpcyBub3QgbmVlZGVkLicgK1xuXHRcdFx0XHQnPC9kaXY+JyArXG5cdFx0XHRcdCc8L2Rpdj4nICtcblx0XHRcdFx0JzwvZGl2PicgK1xuXHRcdFx0JzwvZGl2PicgK1xuXHRcdFx0JzxkaXYgY2xhc3M9XCJsaXN0LWl0ZW0ga2V5LWV2ZW50c1wiPjxkaXYgdGl0bGU9XCJDbGljayBoZXJlIHRvIGVuYWJsZSBrZXkgcHJlc3MgZXZlbnRzIGZvciBzZWxlY3Rpb25cIj5FbmFibGUga2V5IGV2ZW50czwvZGl2PjwvZGl2PicgK1xuXHRcdFx0JzxkaXYgY2xhc3M9XCJsaXN0LWl0ZW0ga2V5LWJ1dHRvbiBrZXktYnV0dG9uLXNlbGVjdCBoaWRlXCIgdGl0bGU9XCJVc2UgUyBrZXkgdG8gc2VsZWN0IGVsZW1lbnRcIj5TPC9kaXY+JyArXG5cdFx0XHQnPGRpdiBjbGFzcz1cImxpc3QtaXRlbSBrZXktYnV0dG9uIGtleS1idXR0b24tcGFyZW50IGhpZGVcIiB0aXRsZT1cIlVzZSBQIGtleSB0byBzZWxlY3QgcGFyZW50XCI+UDwvZGl2PicgK1xuXHRcdFx0JzxkaXYgY2xhc3M9XCJsaXN0LWl0ZW0ga2V5LWJ1dHRvbiBrZXktYnV0dG9uLWNoaWxkIGhpZGVcIiB0aXRsZT1cIlVzZSBDIGtleSB0byBzZWxlY3QgY2hpbGRcIj5DPC9kaXY+JyArXG5cdFx0XHQnPGRpdiBjbGFzcz1cImxpc3QtaXRlbSBkb25lLXNlbGVjdGluZy1idXR0b25cIj5Eb25lIHNlbGVjdGluZyE8L2Rpdj4nICtcblx0XHRcdCc8L2Rpdj4nXG4gICAgJCgnYm9keScpLmFwcGVuZCgkdG9vbGJhcilcblxuICAgICQoJ2JvZHkgIy1zZWxlY3Rvci10b29sYmFyIC5kb25lLXNlbGVjdGluZy1idXR0b24nKS5jbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLnNlbGVjdGlvbkZpbmlzaGVkKClcbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG4gIGhpZ2hsaWdodFBhcmVudDogZnVuY3Rpb24gKCkge1xuXHRcdC8vIGRvIG5vdCBoaWdobGlnaHQgcGFyZW50IGlmIGl0cyB0aGUgYm9keVxuICAgIGlmICghJCh0aGlzLnBhcmVudCkuaXMoJ2JvZHknKSAmJiAhJCh0aGlzLnBhcmVudCkuaXMoJyN3ZWJwYWdlJykpIHtcbiAgICAgICQodGhpcy5wYXJlbnQpLmFkZENsYXNzKCctc2l0ZW1hcC1wYXJlbnQnKVxuICAgIH1cbiAgfSxcblxuICB1bmJpbmRFbGVtZW50U2VsZWN0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgJCh0aGlzLiRhbGxFbGVtZW50cykudW5iaW5kKCdjbGljay5lbGVtZW50U2VsZWN0b3InKVxuXHRcdC8vIHJlbW92ZSBoaWdobGlnaHRlZCBlbGVtZW50IGNsYXNzZXNcbiAgICB0aGlzLnVuYmluZEVsZW1lbnRTZWxlY3Rpb25IaWdobGlnaHQoKVxuICB9LFxuICB1bmJpbmRFbGVtZW50U2VsZWN0aW9uSGlnaGxpZ2h0OiBmdW5jdGlvbiAoKSB7XG4gICAgJCgnLi1zaXRlbWFwLXNlbGVjdC1pdGVtLXNlbGVjdGVkJykucmVtb3ZlQ2xhc3MoJy1zaXRlbWFwLXNlbGVjdC1pdGVtLXNlbGVjdGVkJylcbiAgICAkKCcuLXNpdGVtYXAtcGFyZW50JykucmVtb3ZlQ2xhc3MoJy1zaXRlbWFwLXBhcmVudCcpXG4gIH0sXG4gIHVuYmluZEVsZW1lbnRIaWdobGlnaHQ6IGZ1bmN0aW9uICgpIHtcbiAgICAkKHRoaXMuJGFsbEVsZW1lbnRzKS51bmJpbmQoJ21vdXNlb3Zlci5lbGVtZW50U2VsZWN0b3InKVxuXHRcdFx0LnVuYmluZCgnbW91c2VvdXQuZWxlbWVudFNlbGVjdG9yJylcbiAgfSxcbiAgdW5iaW5kS2V5Ym9hcmRTZWxlY3Rpb25NYWlwdWxhdGlvczogZnVuY3Rpb24gKCkge1xuICAgICQoZG9jdW1lbnQpLnVuYmluZCgna2V5ZG93bi5zZWxlY3Rpb25NYW5pcHVsYXRpb24nKVxuICAgIGNsZWFySW50ZXJ2YWwodGhpcy5rZXlQcmVzc0ZvY3VzSW50ZXJ2YWwpXG4gIH0sXG4gIHJlbW92ZVRvb2xiYXI6IGZ1bmN0aW9uICgpIHtcbiAgICAkKCdib2R5ICMtc2VsZWN0b3ItdG9vbGJhciBhJykudW5iaW5kKCdjbGljaycpXG4gICAgJCgnIy1zZWxlY3Rvci10b29sYmFyJykucmVtb3ZlKClcbiAgfSxcblxuXHQvKipcblx0ICogUmVtb3ZlIHRvb2xiYXIgYW5kIHVuYmluZCBldmVudHNcblx0ICovXG4gIHJlbW92ZUdVSTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMudW5iaW5kRWxlbWVudFNlbGVjdGlvbigpXG4gICAgdGhpcy51bmJpbmRFbGVtZW50SGlnaGxpZ2h0KClcbiAgICB0aGlzLnVuYmluZEtleWJvYXJkU2VsZWN0aW9uTWFpcHVsYXRpb3MoKVxuICAgIHRoaXMudW5iaW5kTXVsdGlwbGVHcm91cFBvcHVwSGlkZSgpXG4gICAgdGhpcy51bmJpbmRNdWx0aXBsZUdyb3VwQ2hlY2tib3goKVxuICAgIHRoaXMudW5iaW5kTW92ZUltYWdlc1RvVG9wKClcbiAgICB0aGlzLnJlbW92ZVRvb2xiYXIoKVxuICB9LFxuXG4gIHNlbGVjdGlvbkZpbmlzaGVkOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJlc3VsdENzc1NlbGVjdG9yID0gdGhpcy5nZXRDdXJyZW50Q1NTU2VsZWN0b3IoKVxuXG4gICAgdGhpcy5kZWZlcnJlZENTU1NlbGVjdG9yUmVzcG9uc2UucmVzb2x2ZSh7XG4gICAgICBDU1NTZWxlY3RvcjogcmVzdWx0Q3NzU2VsZWN0b3JcbiAgICB9KVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQ29udGVudFNlbGVjdG9yXG4iLCJ2YXIgc2VsZWN0b3JzID0gcmVxdWlyZSgnLi9TZWxlY3RvcnMnKVxudmFyIFNlbGVjdG9yID0gcmVxdWlyZSgnLi9TZWxlY3RvcicpXG52YXIgU2VsZWN0b3JUYWJsZSA9IHNlbGVjdG9ycy5TZWxlY3RvclRhYmxlXG52YXIgU2l0ZW1hcCA9IHJlcXVpcmUoJy4vU2l0ZW1hcCcpXG4vLyB2YXIgU2VsZWN0b3JHcmFwaHYyID0gcmVxdWlyZSgnLi9TZWxlY3RvckdyYXBodjInKVxudmFyIGdldEJhY2tncm91bmRTY3JpcHQgPSByZXF1aXJlKCcuL2dldEJhY2tncm91bmRTY3JpcHQnKVxudmFyIGdldENvbnRlbnRTY3JpcHQgPSByZXF1aXJlKCcuL2dldENvbnRlbnRTY3JpcHQnKVxudmFyIFNpdGVtYXBDb250cm9sbGVyID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgZm9yICh2YXIgaSBpbiBvcHRpb25zKSB7XG4gICAgdGhpc1tpXSA9IG9wdGlvbnNbaV1cbiAgfVxuICB0aGlzLmluaXQoKVxufVxuXG5TaXRlbWFwQ29udHJvbGxlci5wcm90b3R5cGUgPSB7XG5cbiAgYmFja2dyb3VuZFNjcmlwdDogZ2V0QmFja2dyb3VuZFNjcmlwdCgnRGV2VG9vbHMnKSxcbiAgY29udGVudFNjcmlwdDogZ2V0Q29udGVudFNjcmlwdCgnRGV2VG9vbHMnKSxcblxuICBjb250cm9sOiBmdW5jdGlvbiAoY29udHJvbHMpIHtcbiAgICB2YXIgY29udHJvbGxlciA9IHRoaXNcblxuICAgIGZvciAodmFyIHNlbGVjdG9yIGluIGNvbnRyb2xzKSB7XG4gICAgICBmb3IgKHZhciBldmVudCBpbiBjb250cm9sc1tzZWxlY3Rvcl0pIHtcbiAgICAgICAgJChkb2N1bWVudCkub24oZXZlbnQsIHNlbGVjdG9yLCAoZnVuY3Rpb24gKHNlbGVjdG9yLCBldmVudCkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgY29udGludWVCdWJibGluZyA9IGNvbnRyb2xzW3NlbGVjdG9yXVtldmVudF0uY2FsbChjb250cm9sbGVyLCB0aGlzKVxuICAgICAgICAgICAgaWYgKGNvbnRpbnVlQnViYmxpbmcgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KShzZWxlY3RvciwgZXZlbnQpKVxuICAgICAgfVxuICAgIH1cbiAgfSxcblxuXHQvKipcblx0ICogTG9hZHMgdGVtcGxhdGVzIGZvciBJQ2FuSGF6XG5cdCAqL1xuICBsb2FkVGVtcGxhdGVzOiBmdW5jdGlvbiAoY2JBbGxUZW1wbGF0ZXNMb2FkZWQpIHtcbiAgICB2YXIgdGVtcGxhdGVJZHMgPSBbXG4gICAgICAnVmlld3BvcnQnLFxuICAgICAgJ1NpdGVtYXBMaXN0JyxcbiAgICAgICdTaXRlbWFwTGlzdEl0ZW0nLFxuICAgICAgJ1NpdGVtYXBDcmVhdGUnLFxuICAgICAgJ1NpdGVtYXBTdGFydFVybEZpZWxkJyxcbiAgICAgICdTaXRlbWFwSW1wb3J0JyxcbiAgICAgICdTaXRlbWFwRXhwb3J0JyxcbiAgICAgICdTaXRlbWFwQnJvd3NlRGF0YScsXG4gICAgICAnU2l0ZW1hcFNjcmFwZUNvbmZpZycsXG4gICAgICAnU2l0ZW1hcEV4cG9ydERhdGFDU1YnLFxuICAgICAgJ1NpdGVtYXBFZGl0TWV0YWRhdGEnLFxuICAgICAgJ1NlbGVjdG9yTGlzdCcsXG4gICAgICAnU2VsZWN0b3JMaXN0SXRlbScsXG4gICAgICAnU2VsZWN0b3JFZGl0JyxcbiAgICAgICdTZWxlY3RvckVkaXRUYWJsZUNvbHVtbicsXG4gICAgICAvLyAnU2l0ZW1hcFNlbGVjdG9yR3JhcGgnLFxuICAgICAgJ0RhdGFQcmV2aWV3J1xuICAgIF1cbiAgICB2YXIgdGVtcGxhdGVzTG9hZGVkID0gMFxuICAgIHZhciBjYkxvYWRlZCA9IGZ1bmN0aW9uICh0ZW1wbGF0ZUlkLCB0ZW1wbGF0ZSkge1xuICAgICAgdGVtcGxhdGVzTG9hZGVkKytcbiAgICAgIGljaC5hZGRUZW1wbGF0ZSh0ZW1wbGF0ZUlkLCB0ZW1wbGF0ZSlcbiAgICAgIGlmICh0ZW1wbGF0ZXNMb2FkZWQgPT09IHRlbXBsYXRlSWRzLmxlbmd0aCkge1xuICAgICAgICBjYkFsbFRlbXBsYXRlc0xvYWRlZCgpXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGVtcGxhdGVJZHMuZm9yRWFjaChmdW5jdGlvbiAodGVtcGxhdGVJZCkge1xuICAgICAgJC5nZXQodGhpcy50ZW1wbGF0ZURpciArIHRlbXBsYXRlSWQgKyAnLmh0bWwnLCBjYkxvYWRlZC5iaW5kKHRoaXMsIHRlbXBsYXRlSWQpKVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcblxuICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5sb2FkVGVtcGxhdGVzKGZ1bmN0aW9uICgpIHtcblx0XHRcdC8vIGN1cnJlbnRseSB2aWV3ZWQgb2JqZWN0c1xuICAgICAgdGhpcy5jbGVhclN0YXRlKClcblxuXHRcdFx0Ly8gcmVuZGVyIG1haW4gdmlld3BvcnRcbiAgICAgIGljaC5WaWV3cG9ydCgpLmFwcGVuZFRvKCdib2R5JylcblxuXHRcdFx0Ly8gY2FuY2VsIGFsbCBmb3JtIHN1Ym1pdHNcbiAgICAgICQoJ2Zvcm0nKS5iaW5kKCdzdWJtaXQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfSlcblxuICAgICAgdGhpcy5jb250cm9sKHtcbiAgICAgICAgJyNzaXRlbWFwcy1uYXYtYnV0dG9uJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNob3dTaXRlbWFwc1xuICAgICAgICB9LFxuICAgICAgICAnI2NyZWF0ZS1zaXRlbWFwLWNyZWF0ZS1uYXYtYnV0dG9uJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNob3dDcmVhdGVTaXRlbWFwXG4gICAgICAgIH0sXG4gICAgICAgICcjY3JlYXRlLXNpdGVtYXAtaW1wb3J0LW5hdi1idXR0b24nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2hvd0ltcG9ydFNpdGVtYXBQYW5lbFxuICAgICAgICB9LFxuICAgICAgICAnI3NpdGVtYXAtZXhwb3J0LW5hdi1idXR0b24nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2hvd1NpdGVtYXBFeHBvcnRQYW5lbFxuICAgICAgICB9LFxuICAgICAgICAnI3NpdGVtYXAtZXhwb3J0LWRhdGEtY3N2LW5hdi1idXR0b24nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2hvd1NpdGVtYXBFeHBvcnREYXRhQ3N2UGFuZWxcbiAgICAgICAgfSxcbiAgICAgICAgJyNzdWJtaXQtY3JlYXRlLXNpdGVtYXAnOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuY3JlYXRlU2l0ZW1hcFxuICAgICAgICB9LFxuICAgICAgICAnI3N1Ym1pdC1pbXBvcnQtc2l0ZW1hcCc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5pbXBvcnRTaXRlbWFwXG4gICAgICAgIH0sXG4gICAgICAgICcjc2l0ZW1hcC1lZGl0LW1ldGFkYXRhLW5hdi1idXR0b24nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuZWRpdFNpdGVtYXBNZXRhZGF0YVxuICAgICAgICB9LFxuICAgICAgICAnI3NpdGVtYXAtc2VsZWN0b3ItbGlzdC1uYXYtYnV0dG9uJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNob3dTaXRlbWFwU2VsZWN0b3JMaXN0XG4gICAgICAgIH0sIC8qLCAgICAgICAgJyNzaXRlbWFwLXNlbGVjdG9yLWdyYXBoLW5hdi1idXR0b24nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2hvd1NpdGVtYXBTZWxlY3RvckdyYXBoXG4gICAgICAgIH0gKi9cbiAgICAgICAgJyNzaXRlbWFwLWJyb3dzZS1uYXYtYnV0dG9uJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLmJyb3dzZVNpdGVtYXBEYXRhXG4gICAgICAgIH0sXG4gICAgICAgICdidXR0b24jc3VibWl0LWVkaXQtc2l0ZW1hcCc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5lZGl0U2l0ZW1hcE1ldGFkYXRhU2F2ZVxuICAgICAgICB9LFxuICAgICAgICAnI2VkaXQtc2l0ZW1hcC1tZXRhZGF0YS1mb3JtJzoge1xuICAgICAgICAgIHN1Ym1pdDogZnVuY3Rpb24gKCkgeyByZXR1cm4gZmFsc2UgfVxuICAgICAgICB9LFxuICAgICAgICAnI3NpdGVtYXBzIHRyJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLmVkaXRTaXRlbWFwXG4gICAgICAgIH0sXG4gICAgICAgICcjc2l0ZW1hcHMgYnV0dG9uW2FjdGlvbj1kZWxldGUtc2l0ZW1hcF0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuZGVsZXRlU2l0ZW1hcFxuICAgICAgICB9LFxuICAgICAgICAnI3NpdGVtYXAtc2NyYXBlLW5hdi1idXR0b24nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2hvd1NjcmFwZVNpdGVtYXBDb25maWdQYW5lbFxuICAgICAgICB9LFxuICAgICAgICAnI3N1Ym1pdC1zY3JhcGUtc2l0ZW1hcC1mb3JtJzoge1xuICAgICAgICAgIHN1Ym1pdDogZnVuY3Rpb24gKCkgeyByZXR1cm4gZmFsc2UgfVxuICAgICAgICB9LFxuICAgICAgICAnI3N1Ym1pdC1zY3JhcGUtc2l0ZW1hcCc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5zY3JhcGVTaXRlbWFwXG4gICAgICAgIH0sXG4gICAgICAgICcjc2l0ZW1hcHMgYnV0dG9uW2FjdGlvbj1icm93c2Utc2l0ZW1hcC1kYXRhXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5zaXRlbWFwTGlzdEJyb3dzZVNpdGVtYXBEYXRhXG4gICAgICAgIH0sXG4gICAgICAgICcjc2l0ZW1hcHMgYnV0dG9uW2FjdGlvbj1jc3YtZG93bmxvYWQtc2l0ZW1hcC1kYXRhXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5kb3dubG9hZFNpdGVtYXBEYXRhXG4gICAgICAgIH0sXG5cdFx0XHRcdC8vIEBUT0RPIG1vdmUgdG8gdHJcbiAgICAgICAgJyNzZWxlY3Rvci10cmVlIHRib2R5IHRyJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNob3dDaGlsZFNlbGVjdG9yc1xuICAgICAgICB9LFxuICAgICAgICAnI3NlbGVjdG9yLXRyZWUgLmJyZWFkY3J1bWIgYSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy50cmVlTmF2aWdhdGlvbnNob3dTaXRlbWFwU2VsZWN0b3JMaXN0XG4gICAgICAgIH0sXG4gICAgICAgICcjc2VsZWN0b3ItdHJlZSB0ciBidXR0b25bYWN0aW9uPWVkaXQtc2VsZWN0b3JdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLmVkaXRTZWxlY3RvclxuICAgICAgICB9LFxuICAgICAgICAnI2VkaXQtc2VsZWN0b3Igc2VsZWN0W25hbWU9dHlwZV0nOiB7XG4gICAgICAgICAgY2hhbmdlOiB0aGlzLnNlbGVjdG9yVHlwZUNoYW5nZWRcbiAgICAgICAgfSxcbiAgICAgICAgJyNlZGl0LXNlbGVjdG9yIGJ1dHRvblthY3Rpb249c2F2ZS1zZWxlY3Rvcl0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2F2ZVNlbGVjdG9yXG4gICAgICAgIH0sXG4gICAgICAgICcjZWRpdC1zZWxlY3RvciBidXR0b25bYWN0aW9uPWNhbmNlbC1zZWxlY3Rvci1lZGl0aW5nXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5jYW5jZWxTZWxlY3RvckVkaXRpbmdcbiAgICAgICAgfSxcbiAgICAgICAgJyNlZGl0LXNlbGVjdG9yICNzZWxlY3RvcklkJzoge1xuICAgICAgICAgIGtleXVwOiB0aGlzLnVwZGF0ZVNlbGVjdG9yUGFyZW50TGlzdE9uSWRDaGFuZ2VcbiAgICAgICAgfSxcbiAgICAgICAgJyNzZWxlY3Rvci10cmVlIGJ1dHRvblthY3Rpb249YWRkLXNlbGVjdG9yXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5hZGRTZWxlY3RvclxuICAgICAgICB9LFxuICAgICAgICAnI3NlbGVjdG9yLXRyZWUgdHIgYnV0dG9uW2FjdGlvbj1kZWxldGUtc2VsZWN0b3JdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLmRlbGV0ZVNlbGVjdG9yXG4gICAgICAgIH0sXG4gICAgICAgICcjc2VsZWN0b3ItdHJlZSB0ciBidXR0b25bYWN0aW9uPXByZXZpZXctc2VsZWN0b3JdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnByZXZpZXdTZWxlY3RvckZyb21TZWxlY3RvclRyZWVcbiAgICAgICAgfSxcbiAgICAgICAgJyNzZWxlY3Rvci10cmVlIHRyIGJ1dHRvblthY3Rpb249ZGF0YS1wcmV2aWV3LXNlbGVjdG9yXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5wcmV2aWV3U2VsZWN0b3JEYXRhRnJvbVNlbGVjdG9yVHJlZVxuICAgICAgICB9LFxuICAgICAgICAnI2VkaXQtc2VsZWN0b3IgYnV0dG9uW2FjdGlvbj1zZWxlY3Qtc2VsZWN0b3JdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNlbGVjdFNlbGVjdG9yXG4gICAgICAgIH0sXG4gICAgICAgICcjZWRpdC1zZWxlY3RvciBidXR0b25bYWN0aW9uPXNlbGVjdC10YWJsZS1oZWFkZXItcm93LXNlbGVjdG9yXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5zZWxlY3RUYWJsZUhlYWRlclJvd1NlbGVjdG9yXG4gICAgICAgIH0sXG4gICAgICAgICcjZWRpdC1zZWxlY3RvciBidXR0b25bYWN0aW9uPXNlbGVjdC10YWJsZS1kYXRhLXJvdy1zZWxlY3Rvcl0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2VsZWN0VGFibGVEYXRhUm93U2VsZWN0b3JcbiAgICAgICAgfSxcbiAgICAgICAgJyNlZGl0LXNlbGVjdG9yIGJ1dHRvblthY3Rpb249cHJldmlldy1zZWxlY3Rvcl0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMucHJldmlld1NlbGVjdG9yXG4gICAgICAgIH0sXG4gICAgICAgICcjZWRpdC1zZWxlY3RvciBidXR0b25bYWN0aW9uPXByZXZpZXctY2xpY2stZWxlbWVudC1zZWxlY3Rvcl0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMucHJldmlld0NsaWNrRWxlbWVudFNlbGVjdG9yXG4gICAgICAgIH0sXG4gICAgICAgICcjZWRpdC1zZWxlY3RvciBidXR0b25bYWN0aW9uPXByZXZpZXctdGFibGUtcm93LXNlbGVjdG9yXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5wcmV2aWV3VGFibGVSb3dTZWxlY3RvclxuICAgICAgICB9LFxuICAgICAgICAnI2VkaXQtc2VsZWN0b3IgYnV0dG9uW2FjdGlvbj1wcmV2aWV3LXNlbGVjdG9yLWRhdGFdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnByZXZpZXdTZWxlY3RvckRhdGFGcm9tU2VsZWN0b3JFZGl0aW5nXG4gICAgICAgIH0sXG4gICAgICAgICdidXR0b24uYWRkLWV4dHJhLXN0YXJ0LXVybCc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5hZGRTdGFydFVybFxuICAgICAgICB9LFxuICAgICAgICAnYnV0dG9uLnJlbW92ZS1zdGFydC11cmwnOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMucmVtb3ZlU3RhcnRVcmxcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIHRoaXMuc2hvd1NpdGVtYXBzKClcbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG5cbiAgY2xlYXJTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc3RhdGUgPSB7XG5cdFx0XHQvLyBzaXRlbWFwIHRoYXQgaXMgY3VycmVudGx5IG9wZW5cbiAgICAgIGN1cnJlbnRTaXRlbWFwOiBudWxsLFxuXHRcdFx0Ly8gc2VsZWN0b3IgaWRzIHRoYXQgYXJlIHNob3duIGluIHRoZSBuYXZpZ2F0aW9uXG4gICAgICBlZGl0U2l0ZW1hcEJyZWFkY3VtYnNTZWxlY3RvcnM6IG51bGwsXG4gICAgICBjdXJyZW50UGFyZW50U2VsZWN0b3JJZDogbnVsbCxcbiAgICAgIGN1cnJlbnRTZWxlY3RvcjogbnVsbFxuICAgIH1cbiAgfSxcblxuICBzZXRTdGF0ZUVkaXRTaXRlbWFwOiBmdW5jdGlvbiAoc2l0ZW1hcCkge1xuICAgIHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXAgPSBzaXRlbWFwXG4gICAgdGhpcy5zdGF0ZS5lZGl0U2l0ZW1hcEJyZWFkY3VtYnNTZWxlY3RvcnMgPSBbXG5cdFx0XHR7aWQ6ICdfcm9vdCd9XG4gICAgXVxuICAgIHRoaXMuc3RhdGUuY3VycmVudFBhcmVudFNlbGVjdG9ySWQgPSAnX3Jvb3QnXG4gIH0sXG5cbiAgc2V0QWN0aXZlTmF2aWdhdGlvbkJ1dHRvbjogZnVuY3Rpb24gKG5hdmlnYXRpb25JZCkge1xuICAgICQoJy5uYXYgLmFjdGl2ZScpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKVxuICAgICQoJyMnICsgbmF2aWdhdGlvbklkICsgJy1uYXYtYnV0dG9uJykuY2xvc2VzdCgnbGknKS5hZGRDbGFzcygnYWN0aXZlJylcblxuICAgIGlmIChuYXZpZ2F0aW9uSWQubWF0Y2goL15zaXRlbWFwLS8pKSB7XG4gICAgICAkKCcjc2l0ZW1hcC1uYXYtYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJylcbiAgICAgICQoJyNzaXRlbWFwLW5hdi1idXR0b24nKS5jbG9zZXN0KCdsaScpLmFkZENsYXNzKCdhY3RpdmUnKVxuICAgICAgJCgnI25hdmJhci1hY3RpdmUtc2l0ZW1hcC1pZCcpLnRleHQoJygnICsgdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcC5faWQgKyAnKScpXG4gICAgfVx0XHRlbHNlIHtcbiAgICAgICQoJyNzaXRlbWFwLW5hdi1idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgJCgnI25hdmJhci1hY3RpdmUtc2l0ZW1hcC1pZCcpLnRleHQoJycpXG4gICAgfVxuXG4gICAgaWYgKG5hdmlnYXRpb25JZC5tYXRjaCgvXmNyZWF0ZS1zaXRlbWFwLS8pKSB7XG4gICAgICAkKCcjY3JlYXRlLXNpdGVtYXAtbmF2LWJ1dHRvbicpLmNsb3Nlc3QoJ2xpJykuYWRkQ2xhc3MoJ2FjdGl2ZScpXG4gICAgfVxuICB9LFxuXG5cdC8qKlxuXHQgKiBTaW1wbGUgaW5mbyBwb3B1cCBmb3Igc2l0ZW1hcCBzdGFydCB1cmwgaW5wdXQgZmllbGRcblx0ICovXG4gIGluaXRNdWx0aXBsZVN0YXJ0VXJsSGVscGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgJCgnI3N0YXJ0VXJsJylcblx0XHRcdC5wb3BvdmVyKHtcbiAgdGl0bGU6ICdNdWx0aXBsZSBzdGFydCB1cmxzJyxcbiAgaHRtbDogdHJ1ZSxcbiAgY29udGVudDogJ1lvdSBjYW4gY3JlYXRlIHJhbmdlZCBzdGFydCB1cmxzIGxpa2UgdGhpczo8YnIgLz5odHRwOi8vZXhhbXBsZS5jb20vWzEtMTAwXS5odG1sJyxcbiAgcGxhY2VtZW50OiAnYm90dG9tJ1xufSlcblx0XHRcdC5ibHVyKGZ1bmN0aW9uICgpIHtcbiAgJCh0aGlzKS5wb3BvdmVyKCdoaWRlJylcbn0pXG4gIH0sXG5cblx0LyoqXG5cdCAqIFJldHVybnMgYm9vdHN0cmFwVmFsaWRhdG9yIG9iamVjdCBmb3IgY3VycmVudCBmb3JtIGluIHZpZXdwb3J0XG5cdCAqL1xuICBnZXRGb3JtVmFsaWRhdG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHZhbGlkYXRvciA9ICQoJyN2aWV3cG9ydCBmb3JtJykuZGF0YSgnYm9vdHN0cmFwVmFsaWRhdG9yJylcbiAgICByZXR1cm4gdmFsaWRhdG9yXG4gIH0sXG5cblx0LyoqXG5cdCAqIFJldHVybnMgd2hldGhlciBjdXJyZW50IGZvcm0gaW4gdGhlIHZpZXdwb3J0IGlzIHZhbGlkXG5cdCAqIEByZXR1cm5zIHtCb29sZWFufVxuXHQgKi9cbiAgaXNWYWxpZEZvcm06IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdmFsaWRhdG9yID0gdGhpcy5nZXRGb3JtVmFsaWRhdG9yKClcblxuXHRcdC8vIHZhbGlkYXRvci52YWxpZGF0ZSgpO1xuXHRcdC8vIHZhbGlkYXRlIG1ldGhvZCBjYWxscyBzdWJtaXQgd2hpY2ggaXMgbm90IG5lZWRlZCBpbiB0aGlzIGNhc2UuXG4gICAgZm9yICh2YXIgZmllbGQgaW4gdmFsaWRhdG9yLm9wdGlvbnMuZmllbGRzKSB7XG4gICAgICB2YWxpZGF0b3IudmFsaWRhdGVGaWVsZChmaWVsZClcbiAgICB9XG5cbiAgICB2YXIgdmFsaWQgPSB2YWxpZGF0b3IuaXNWYWxpZCgpXG4gICAgcmV0dXJuIHZhbGlkXG4gIH0sXG5cblx0LyoqXG5cdCAqIEFkZCB2YWxpZGF0aW9uIHRvIHNpdGVtYXAgY3JlYXRpb24gb3IgZWRpdGluZyBmb3JtXG5cdCAqL1xuICBpbml0U2l0ZW1hcFZhbGlkYXRpb246IGZ1bmN0aW9uICgpIHtcbiAgICAkKCcjdmlld3BvcnQgZm9ybScpLmJvb3RzdHJhcFZhbGlkYXRvcih7XG4gICAgICBmaWVsZHM6IHtcbiAgICAgICAgJ19pZCc6IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBub3RFbXB0eToge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnVGhlIHNpdGVtYXAgaWQgaXMgcmVxdWlyZWQgYW5kIGNhbm5vdCBiZSBlbXB0eSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdHJpbmdMZW5ndGg6IHtcbiAgICAgICAgICAgICAgbWluOiAzLFxuICAgICAgICAgICAgICBtZXNzYWdlOiAnVGhlIHNpdGVtYXAgaWQgc2hvdWxkIGJlIGF0bGVhc3QgMyBjaGFyYWN0ZXJzIGxvbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVnZXhwOiB7XG4gICAgICAgICAgICAgIHJlZ2V4cDogL15bYS16XVthLXowLTlfJCgpK1xcLS9dKyQvLFxuICAgICAgICAgICAgICBtZXNzYWdlOiAnT25seSBsb3dlcmNhc2UgY2hhcmFjdGVycyAoYS16KSwgZGlnaXRzICgwLTkpLCBvciBhbnkgb2YgdGhlIGNoYXJhY3RlcnMgXywgJCwgKCwgKSwgKywgLSwgYW5kIC8gYXJlIGFsbG93ZWQuIE11c3QgYmVnaW4gd2l0aCBhIGxldHRlci4nXG4gICAgICAgICAgICB9LFxuXHRcdFx0XHRcdFx0Ly8gcGxhY2Vob2xkZXIgZm9yIHNpdGVtYXAgaWQgZXhpc3RhbmNlIHZhbGlkYXRpb25cbiAgICAgICAgICAgIGNhbGxiYWNrOiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdTaXRlbWFwIHdpdGggdGhpcyBpZCBhbHJlYWR5IGV4aXN0cycsXG4gICAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbiAodmFsdWUsIHZhbGlkYXRvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgICdzdGFydFVybFtdJzoge1xuICAgICAgICAgIHZhbGlkYXRvcnM6IHtcbiAgICAgICAgICAgIG5vdEVtcHR5OiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgc3RhcnQgVVJMIGlzIHJlcXVpcmVkIGFuZCBjYW5ub3QgYmUgZW1wdHknXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXJpOiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgc3RhcnQgVVJMIGlzIG5vdCBhIHZhbGlkIFVSTCdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICB9LFxuXG4gIHNob3dDcmVhdGVTaXRlbWFwOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zZXRBY3RpdmVOYXZpZ2F0aW9uQnV0dG9uKCdjcmVhdGUtc2l0ZW1hcC1jcmVhdGUnKVxuICAgIHZhciBzaXRlbWFwRm9ybSA9IGljaC5TaXRlbWFwQ3JlYXRlKClcbiAgICAkKCcjdmlld3BvcnQnKS5odG1sKHNpdGVtYXBGb3JtKVxuICAgIHRoaXMuaW5pdE11bHRpcGxlU3RhcnRVcmxIZWxwZXIoKVxuICAgIHRoaXMuaW5pdFNpdGVtYXBWYWxpZGF0aW9uKClcblxuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgaW5pdEltcG9ydFN0aWVtYXBWYWxpZGF0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgJCgnI3ZpZXdwb3J0IGZvcm0nKS5ib290c3RyYXBWYWxpZGF0b3Ioe1xuICAgICAgZmllbGRzOiB7XG4gICAgICAgICdfaWQnOiB7XG4gICAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgICAgc3RyaW5nTGVuZ3RoOiB7XG4gICAgICAgICAgICAgIG1pbjogMyxcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSBzaXRlbWFwIGlkIHNob3VsZCBiZSBhdGxlYXN0IDMgY2hhcmFjdGVycyBsb25nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJlZ2V4cDoge1xuICAgICAgICAgICAgICByZWdleHA6IC9eW2Etel1bYS16MC05XyQoKStcXC0vXSskLyxcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ09ubHkgbG93ZXJjYXNlIGNoYXJhY3RlcnMgKGEteiksIGRpZ2l0cyAoMC05KSwgb3IgYW55IG9mIHRoZSBjaGFyYWN0ZXJzIF8sICQsICgsICksICssIC0sIGFuZCAvIGFyZSBhbGxvd2VkLiBNdXN0IGJlZ2luIHdpdGggYSBsZXR0ZXIuJ1xuICAgICAgICAgICAgfSxcblx0XHRcdFx0XHRcdC8vIHBsYWNlaG9sZGVyIGZvciBzaXRlbWFwIGlkIGV4aXN0YW5jZSB2YWxpZGF0aW9uXG4gICAgICAgICAgICBjYWxsYmFjazoge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnU2l0ZW1hcCB3aXRoIHRoaXMgaWQgYWxyZWFkeSBleGlzdHMnLFxuICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKHZhbHVlLCB2YWxpZGF0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBzaXRlbWFwSlNPTjoge1xuICAgICAgICAgIHZhbGlkYXRvcnM6IHtcbiAgICAgICAgICAgIG5vdEVtcHR5OiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdTaXRlbWFwIEpTT04gaXMgcmVxdWlyZWQgYW5kIGNhbm5vdCBiZSBlbXB0eSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjYWxsYmFjazoge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnSlNPTiBpcyBub3QgdmFsaWQnLFxuICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKHZhbHVlLCB2YWxpZGF0b3IpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgSlNPTi5wYXJzZSh2YWx1ZSlcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIH0sXG5cbiAgc2hvd0ltcG9ydFNpdGVtYXBQYW5lbDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2V0QWN0aXZlTmF2aWdhdGlvbkJ1dHRvbignY3JlYXRlLXNpdGVtYXAtaW1wb3J0JylcbiAgICB2YXIgc2l0ZW1hcEZvcm0gPSBpY2guU2l0ZW1hcEltcG9ydCgpXG4gICAgJCgnI3ZpZXdwb3J0JykuaHRtbChzaXRlbWFwRm9ybSlcbiAgICB0aGlzLmluaXRJbXBvcnRTdGllbWFwVmFsaWRhdGlvbigpXG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBzaG93U2l0ZW1hcEV4cG9ydFBhbmVsOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zZXRBY3RpdmVOYXZpZ2F0aW9uQnV0dG9uKCdzaXRlbWFwLWV4cG9ydCcpXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgdmFyIHNpdGVtYXBKU09OID0gc2l0ZW1hcC5leHBvcnRTaXRlbWFwKClcbiAgICB2YXIgc2l0ZW1hcEV4cG9ydEZvcm0gPSBpY2guU2l0ZW1hcEV4cG9ydCh7XG4gICAgICBzaXRlbWFwSlNPTjogc2l0ZW1hcEpTT05cbiAgICB9KVxuICAgICQoJyN2aWV3cG9ydCcpLmh0bWwoc2l0ZW1hcEV4cG9ydEZvcm0pXG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBzaG93U2l0ZW1hcHM6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmNsZWFyU3RhdGUoKVxuICAgIHRoaXMuc2V0QWN0aXZlTmF2aWdhdGlvbkJ1dHRvbignc2l0ZW1hcHMnKVxuXG4gICAgdGhpcy5zdG9yZS5nZXRBbGxTaXRlbWFwcyhmdW5jdGlvbiAoc2l0ZW1hcHMpIHtcbiAgICAgICRzaXRlbWFwTGlzdFBhbmVsID0gaWNoLlNpdGVtYXBMaXN0KClcbiAgICAgIHNpdGVtYXBzLmZvckVhY2goZnVuY3Rpb24gKHNpdGVtYXApIHtcbiAgICAgICAgJHNpdGVtYXAgPSBpY2guU2l0ZW1hcExpc3RJdGVtKHNpdGVtYXApXG4gICAgICAgICRzaXRlbWFwLmRhdGEoJ3NpdGVtYXAnLCBzaXRlbWFwKVxuICAgICAgICAkc2l0ZW1hcExpc3RQYW5lbC5maW5kKCd0Ym9keScpLmFwcGVuZCgkc2l0ZW1hcClcbiAgICAgIH0pXG4gICAgICAkKCcjdmlld3BvcnQnKS5odG1sKCRzaXRlbWFwTGlzdFBhbmVsKVxuICAgIH0pXG4gIH0sXG5cbiAgZ2V0U2l0ZW1hcEZyb21NZXRhZGF0YUZvcm06IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaWQgPSAkKCcjdmlld3BvcnQgZm9ybSBpbnB1dFtuYW1lPV9pZF0nKS52YWwoKVxuICAgIHZhciAkc3RhcnRVcmxJbnB1dHMgPSAkKCcjdmlld3BvcnQgZm9ybSAuaW5wdXQtc3RhcnQtdXJsJylcbiAgICB2YXIgc3RhcnRVcmxcbiAgICBpZiAoJHN0YXJ0VXJsSW5wdXRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgc3RhcnRVcmwgPSAkc3RhcnRVcmxJbnB1dHMudmFsKClcbiAgICB9IGVsc2Uge1xuICAgICAgc3RhcnRVcmwgPSBbXVxuICAgICAgJHN0YXJ0VXJsSW5wdXRzLmVhY2goZnVuY3Rpb24gKGksIGVsZW1lbnQpIHtcbiAgICAgICAgc3RhcnRVcmwucHVzaCgkKGVsZW1lbnQpLnZhbCgpKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IGlkLFxuICAgICAgc3RhcnRVcmw6IHN0YXJ0VXJsXG4gICAgfVxuICB9LFxuXG4gIGNyZWF0ZVNpdGVtYXA6IGZ1bmN0aW9uIChmb3JtKSB7XG5cdFx0Ly8gY2FuY2VsIHN1Ym1pdCBpZiBpbnZhbGlkIGZvcm1cbiAgICBpZiAoIXRoaXMuaXNWYWxpZEZvcm0oKSkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG4gICAgdmFyIHNpdGVtYXBEYXRhID0gdGhpcy5nZXRTaXRlbWFwRnJvbU1ldGFkYXRhRm9ybSgpXG5cblx0XHQvLyBjaGVjayB3aGV0aGVyIHNpdGVtYXAgd2l0aCB0aGlzIGlkIGFscmVhZHkgZXhpc3RcbiAgICB0aGlzLnN0b3JlLnNpdGVtYXBFeGlzdHMoc2l0ZW1hcERhdGEuaWQsIGZ1bmN0aW9uIChzaXRlbWFwRXhpc3RzKSB7XG4gICAgICBpZiAoc2l0ZW1hcEV4aXN0cykge1xuICAgICAgICB2YXIgdmFsaWRhdG9yID0gdGhpcy5nZXRGb3JtVmFsaWRhdG9yKClcbiAgICAgICAgdmFsaWRhdG9yLnVwZGF0ZVN0YXR1cygnX2lkJywgJ0lOVkFMSUQnLCAnY2FsbGJhY2snKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHNpdGVtYXAgPSBuZXcgU2l0ZW1hcCh7XG4gICAgICAgICAgX2lkOiBzaXRlbWFwRGF0YS5pZCxcbiAgICAgICAgICBzdGFydFVybDogc2l0ZW1hcERhdGEuc3RhcnRVcmwsXG4gICAgICAgICAgc2VsZWN0b3JzOiBbXVxuICAgICAgICB9KVxuICAgICAgICB0aGlzLnN0b3JlLmNyZWF0ZVNpdGVtYXAoc2l0ZW1hcCwgZnVuY3Rpb24gKHNpdGVtYXApIHtcbiAgICAgICAgICB0aGlzLl9lZGl0U2l0ZW1hcChzaXRlbWFwLCBbJ19yb290J10pXG4gICAgICAgIH0uYmluZCh0aGlzLCBzaXRlbWFwKSlcbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG5cbiAgaW1wb3J0U2l0ZW1hcDogZnVuY3Rpb24gKCkge1xuXHRcdC8vIGNhbmNlbCBzdWJtaXQgaWYgaW52YWxpZCBmb3JtXG4gICAgaWYgKCF0aGlzLmlzVmFsaWRGb3JtKCkpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cblxuXHRcdC8vIGxvYWQgZGF0YSBmcm9tIGZvcm1cbiAgICB2YXIgc2l0ZW1hcEpTT04gPSAkKCdbbmFtZT1zaXRlbWFwSlNPTl0nKS52YWwoKVxuICAgIHZhciBpZCA9ICQoJ2lucHV0W25hbWU9X2lkXScpLnZhbCgpXG4gICAgdmFyIHNpdGVtYXAgPSBuZXcgU2l0ZW1hcCgpXG4gICAgc2l0ZW1hcC5pbXBvcnRTaXRlbWFwKHNpdGVtYXBKU09OKVxuICAgIGlmIChpZC5sZW5ndGgpIHtcbiAgICAgIHNpdGVtYXAuX2lkID0gaWRcbiAgICB9XG5cdFx0Ly8gY2hlY2sgd2hldGhlciBzaXRlbWFwIHdpdGggdGhpcyBpZCBhbHJlYWR5IGV4aXN0XG4gICAgdGhpcy5zdG9yZS5zaXRlbWFwRXhpc3RzKHNpdGVtYXAuX2lkLCBmdW5jdGlvbiAoc2l0ZW1hcEV4aXN0cykge1xuICAgICAgaWYgKHNpdGVtYXBFeGlzdHMpIHtcbiAgICAgICAgdmFyIHZhbGlkYXRvciA9IHRoaXMuZ2V0Rm9ybVZhbGlkYXRvcigpXG4gICAgICAgIHZhbGlkYXRvci51cGRhdGVTdGF0dXMoJ19pZCcsICdJTlZBTElEJywgJ2NhbGxiYWNrJylcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuc3RvcmUuY3JlYXRlU2l0ZW1hcChzaXRlbWFwLCBmdW5jdGlvbiAoc2l0ZW1hcCkge1xuICAgICAgICAgIHRoaXMuX2VkaXRTaXRlbWFwKHNpdGVtYXAsIFsnX3Jvb3QnXSlcbiAgICAgICAgfS5iaW5kKHRoaXMsIHNpdGVtYXApKVxuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcblxuICBlZGl0U2l0ZW1hcE1ldGFkYXRhOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdGhpcy5zZXRBY3RpdmVOYXZpZ2F0aW9uQnV0dG9uKCdzaXRlbWFwLWVkaXQtbWV0YWRhdGEnKVxuXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgdmFyICRzaXRlbWFwTWV0YWRhdGFGb3JtID0gaWNoLlNpdGVtYXBFZGl0TWV0YWRhdGEoc2l0ZW1hcClcbiAgICAkKCcjdmlld3BvcnQnKS5odG1sKCRzaXRlbWFwTWV0YWRhdGFGb3JtKVxuICAgIHRoaXMuaW5pdE11bHRpcGxlU3RhcnRVcmxIZWxwZXIoKVxuICAgIHRoaXMuaW5pdFNpdGVtYXBWYWxpZGF0aW9uKClcblxuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgZWRpdFNpdGVtYXBNZXRhZGF0YVNhdmU6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICB2YXIgc2l0ZW1hcERhdGEgPSB0aGlzLmdldFNpdGVtYXBGcm9tTWV0YWRhdGFGb3JtKClcblxuXHRcdC8vIGNhbmNlbCBzdWJtaXQgaWYgaW52YWxpZCBmb3JtXG4gICAgaWYgKCF0aGlzLmlzVmFsaWRGb3JtKCkpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cblxuXHRcdC8vIGNoZWNrIHdoZXRoZXIgc2l0ZW1hcCB3aXRoIHRoaXMgaWQgYWxyZWFkeSBleGlzdFxuICAgIHRoaXMuc3RvcmUuc2l0ZW1hcEV4aXN0cyhzaXRlbWFwRGF0YS5pZCwgZnVuY3Rpb24gKHNpdGVtYXBFeGlzdHMpIHtcbiAgICAgIGlmIChzaXRlbWFwLl9pZCAhPT0gc2l0ZW1hcERhdGEuaWQgJiYgc2l0ZW1hcEV4aXN0cykge1xuICAgICAgICB2YXIgdmFsaWRhdG9yID0gdGhpcy5nZXRGb3JtVmFsaWRhdG9yKClcbiAgICAgICAgdmFsaWRhdG9yLnVwZGF0ZVN0YXR1cygnX2lkJywgJ0lOVkFMSUQnLCAnY2FsbGJhY2snKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuXHRcdFx0Ly8gY2hhbmdlIGRhdGFcbiAgICAgIHNpdGVtYXAuc3RhcnRVcmwgPSBzaXRlbWFwRGF0YS5zdGFydFVybFxuXG5cdFx0XHQvLyBqdXN0IGNoYW5nZSBzaXRlbWFwcyB1cmxcbiAgICAgIGlmIChzaXRlbWFwRGF0YS5pZCA9PT0gc2l0ZW1hcC5faWQpIHtcbiAgICAgICAgdGhpcy5zdG9yZS5zYXZlU2l0ZW1hcChzaXRlbWFwLCBmdW5jdGlvbiAoc2l0ZW1hcCkge1xuICAgICAgICAgIHRoaXMuc2hvd1NpdGVtYXBTZWxlY3Rvckxpc3QoKVxuICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBpZCBjaGFuZ2VkLiB3ZSBuZWVkIHRvIGRlbGV0ZSB0aGUgb2xkIG9uZSBhbmQgY3JlYXRlIGEgbmV3IG9uZVxuICAgICAgICB2YXIgbmV3U2l0ZW1hcCA9IG5ldyBTaXRlbWFwKHNpdGVtYXApXG4gICAgICAgIHZhciBvbGRTaXRlbWFwID0gc2l0ZW1hcFxuICAgICAgICBuZXdTaXRlbWFwLl9pZCA9IHNpdGVtYXBEYXRhLmlkXG4gICAgICAgIHRoaXMuc3RvcmUuY3JlYXRlU2l0ZW1hcChuZXdTaXRlbWFwLCBmdW5jdGlvbiAobmV3U2l0ZW1hcCkge1xuICAgICAgICAgIHRoaXMuc3RvcmUuZGVsZXRlU2l0ZW1hcChvbGRTaXRlbWFwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwID0gbmV3U2l0ZW1hcFxuICAgICAgICAgICAgdGhpcy5zaG93U2l0ZW1hcFNlbGVjdG9yTGlzdCgpXG4gICAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBDYWxsYmFjayB3aGVuIHNpdGVtYXAgZWRpdCBidXR0b24gaXMgY2xpY2tlZCBpbiBzaXRlbWFwIGdyaWRcblx0ICovXG4gIGVkaXRTaXRlbWFwOiBmdW5jdGlvbiAodHIpIHtcbiAgICB2YXIgc2l0ZW1hcCA9ICQodHIpLmRhdGEoJ3NpdGVtYXAnKVxuICAgIHRoaXMuX2VkaXRTaXRlbWFwKHNpdGVtYXApXG4gIH0sXG4gIF9lZGl0U2l0ZW1hcDogZnVuY3Rpb24gKHNpdGVtYXApIHtcbiAgICB0aGlzLnNldFN0YXRlRWRpdFNpdGVtYXAoc2l0ZW1hcClcbiAgICB0aGlzLnNldEFjdGl2ZU5hdmlnYXRpb25CdXR0b24oJ3NpdGVtYXAnKVxuXG4gICAgdGhpcy5zaG93U2l0ZW1hcFNlbGVjdG9yTGlzdCgpXG4gIH0sXG4gIHNob3dTaXRlbWFwU2VsZWN0b3JMaXN0OiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zZXRBY3RpdmVOYXZpZ2F0aW9uQnV0dG9uKCdzaXRlbWFwLXNlbGVjdG9yLWxpc3QnKVxuXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgdmFyIHBhcmVudFNlbGVjdG9ycyA9IHRoaXMuc3RhdGUuZWRpdFNpdGVtYXBCcmVhZGN1bWJzU2VsZWN0b3JzXG4gICAgdmFyIHBhcmVudFNlbGVjdG9ySWQgPSB0aGlzLnN0YXRlLmN1cnJlbnRQYXJlbnRTZWxlY3RvcklkXG5cbiAgICB2YXIgJHNlbGVjdG9yTGlzdFBhbmVsID0gaWNoLlNlbGVjdG9yTGlzdCh7XG4gICAgICBwYXJlbnRTZWxlY3RvcnM6IHBhcmVudFNlbGVjdG9yc1xuICAgIH0pXG4gICAgdmFyIHNlbGVjdG9ycyA9IHNpdGVtYXAuZ2V0RGlyZWN0Q2hpbGRTZWxlY3RvcnMocGFyZW50U2VsZWN0b3JJZClcbiAgICBzZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgICRzZWxlY3RvciA9IGljaC5TZWxlY3Rvckxpc3RJdGVtKHNlbGVjdG9yKVxuICAgICAgJHNlbGVjdG9yLmRhdGEoJ3NlbGVjdG9yJywgc2VsZWN0b3IpXG4gICAgICAkc2VsZWN0b3JMaXN0UGFuZWwuZmluZCgndGJvZHknKS5hcHBlbmQoJHNlbGVjdG9yKVxuICAgIH0pXG4gICAgJCgnI3ZpZXdwb3J0JykuaHRtbCgkc2VsZWN0b3JMaXN0UGFuZWwpXG5cbiAgICByZXR1cm4gdHJ1ZVxuICB9LCAvKlxuICBzaG93U2l0ZW1hcFNlbGVjdG9yR3JhcGg6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNldEFjdGl2ZU5hdmlnYXRpb25CdXR0b24oJ3NpdGVtYXAtc2VsZWN0b3ItZ3JhcGgnKVxuICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcFxuICAgIHZhciAkc2VsZWN0b3JHcmFwaFBhbmVsID0gaWNoLlNpdGVtYXBTZWxlY3RvckdyYXBoKClcbiAgICAkKCcjdmlld3BvcnQnKS5odG1sKCRzZWxlY3RvckdyYXBoUGFuZWwpXG4gICAgdmFyIGdyYXBoRGl2ID0gJCgnI3NlbGVjdG9yLWdyYXBoJylbMF1cbiAgICB2YXIgZ3JhcGggPSBuZXcgU2VsZWN0b3JHcmFwaHYyKHNpdGVtYXApXG4gICAgZ3JhcGguZHJhdyhncmFwaERpdiwgJChkb2N1bWVudCkud2lkdGgoKSwgMjAwKVxuICAgIHJldHVybiB0cnVlXG4gIH0sICovXG4gIHNob3dDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKHRyKSB7XG4gICAgdmFyIHNlbGVjdG9yID0gJCh0cikuZGF0YSgnc2VsZWN0b3InKVxuICAgIHZhciBwYXJlbnRTZWxlY3RvcnMgPSB0aGlzLnN0YXRlLmVkaXRTaXRlbWFwQnJlYWRjdW1ic1NlbGVjdG9yc1xuICAgIHRoaXMuc3RhdGUuY3VycmVudFBhcmVudFNlbGVjdG9ySWQgPSBzZWxlY3Rvci5pZFxuICAgIHBhcmVudFNlbGVjdG9ycy5wdXNoKHNlbGVjdG9yKVxuXG4gICAgdGhpcy5zaG93U2l0ZW1hcFNlbGVjdG9yTGlzdCgpXG4gIH0sXG5cbiAgdHJlZU5hdmlnYXRpb25zaG93U2l0ZW1hcFNlbGVjdG9yTGlzdDogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciBwYXJlbnRTZWxlY3RvcnMgPSB0aGlzLnN0YXRlLmVkaXRTaXRlbWFwQnJlYWRjdW1ic1NlbGVjdG9yc1xuICAgIHZhciBjb250cm9sbGVyID0gdGhpc1xuICAgICQoJyNzZWxlY3Rvci10cmVlIC5icmVhZGNydW1iIGxpIGEnKS5lYWNoKGZ1bmN0aW9uIChpLCBwYXJlbnRTZWxlY3RvckJ1dHRvbikge1xuICAgICAgaWYgKHBhcmVudFNlbGVjdG9yQnV0dG9uID09PSBidXR0b24pIHtcbiAgICAgICAgcGFyZW50U2VsZWN0b3JzLnNwbGljZShpICsgMSlcbiAgICAgICAgY29udHJvbGxlci5zdGF0ZS5jdXJyZW50UGFyZW50U2VsZWN0b3JJZCA9IHBhcmVudFNlbGVjdG9yc1tpXS5pZFxuICAgICAgfVxuICAgIH0pXG4gICAgdGhpcy5zaG93U2l0ZW1hcFNlbGVjdG9yTGlzdCgpXG4gIH0sXG5cbiAgaW5pdFNlbGVjdG9yVmFsaWRhdGlvbjogZnVuY3Rpb24gKCkge1xuICAgICQoJyN2aWV3cG9ydCBmb3JtJykuYm9vdHN0cmFwVmFsaWRhdG9yKHtcbiAgICAgIGZpZWxkczoge1xuICAgICAgICAnaWQnOiB7XG4gICAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgICAgbm90RW1wdHk6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1NpdGVtYXAgaWQgcmVxdWlyZWQgYW5kIGNhbm5vdCBiZSBlbXB0eSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdHJpbmdMZW5ndGg6IHtcbiAgICAgICAgICAgICAgbWluOiAzLFxuICAgICAgICAgICAgICBtZXNzYWdlOiAnVGhlIHNpdGVtYXAgaWQgc2hvdWxkIGJlIGF0bGVhc3QgMyBjaGFyYWN0ZXJzIGxvbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVnZXhwOiB7XG4gICAgICAgICAgICAgIHJlZ2V4cDogL15bXl9dLiokLyxcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1NlbGVjdG9yIGlkIGNhbm5vdCBzdGFydCB3aXRoIGFuIHVuZGVyc2NvcmUgXydcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHNlbGVjdG9yOiB7XG4gICAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgICAgbm90RW1wdHk6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1NlbGVjdG9yIGlzIHJlcXVpcmVkIGFuZCBjYW5ub3QgYmUgZW1wdHknXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICByZWdleDoge1xuICAgICAgICAgIHZhbGlkYXRvcnM6IHtcbiAgICAgICAgICAgIGNhbGxiYWNrOiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdKYXZhU2NyaXB0IGRvZXMgbm90IHN1cHBvcnQgcmVndWxhciBleHByZXNzaW9ucyB0aGF0IGNhbiBtYXRjaCAwIGNoYXJhY3RlcnMuJyxcbiAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICh2YWx1ZSwgdmFsaWRhdG9yKSB7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gYWxsb3cgbm8gcmVnZXhcbiAgICAgICAgICAgICAgICBpZiAoIXZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBtYXRjaGVzID0gJycubWF0Y2gobmV3IFJlZ0V4cCh2YWx1ZSkpXG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoZXMgIT09IG51bGwgJiYgbWF0Y2hlc1swXSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2xpY2tFbGVtZW50U2VsZWN0b3I6IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBub3RFbXB0eToge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnQ2xpY2sgc2VsZWN0b3IgaXMgcmVxdWlyZWQgYW5kIGNhbm5vdCBiZSBlbXB0eSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHRhYmxlSGVhZGVyUm93U2VsZWN0b3I6IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBub3RFbXB0eToge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnSGVhZGVyIHJvdyBzZWxlY3RvciBpcyByZXF1aXJlZCBhbmQgY2Fubm90IGJlIGVtcHR5J1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgdGFibGVEYXRhUm93U2VsZWN0b3I6IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBub3RFbXB0eToge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnRGF0YSByb3cgc2VsZWN0b3IgaXMgcmVxdWlyZWQgYW5kIGNhbm5vdCBiZSBlbXB0eSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgICAgbnVtZXJpYzoge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnRGVsYXkgbXVzdCBiZSBudW1lcmljJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgcGFyZW50U2VsZWN0b3JzOiB7XG4gICAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgICAgbm90RW1wdHk6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1lvdSBtdXN0IGNob29zZSBhdCBsZWFzdCBvbmUgcGFyZW50IHNlbGVjdG9yJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNhbGxiYWNrOiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdDYW5ub3QgaGFuZGxlIHJlY3Vyc2l2ZSBlbGVtZW50IHNlbGVjdG9ycycsXG4gICAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbiAodmFsdWUsIHZhbGlkYXRvciwgJGZpZWxkKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNpdGVtYXAgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yU2l0ZW1hcCgpXG4gICAgICAgICAgICAgICAgcmV0dXJuICFzaXRlbWFwLnNlbGVjdG9ycy5oYXNSZWN1cnNpdmVFbGVtZW50U2VsZWN0b3JzKClcbiAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgfSxcbiAgZWRpdFNlbGVjdG9yOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyIHNlbGVjdG9yID0gJChidXR0b24pLmNsb3Nlc3QoJ3RyJykuZGF0YSgnc2VsZWN0b3InKVxuICAgIHRoaXMuX2VkaXRTZWxlY3RvcihzZWxlY3RvcilcbiAgfSxcbiAgdXBkYXRlU2VsZWN0b3JQYXJlbnRMaXN0T25JZENoYW5nZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3IoKVxuICAgICQoJy5jdXJyZW50bHktZWRpdGVkJykudmFsKHNlbGVjdG9yLmlkKS50ZXh0KHNlbGVjdG9yLmlkKVxuICB9LFxuICBfZWRpdFNlbGVjdG9yOiBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICB2YXIgc2VsZWN0b3JJZHMgPSBzaXRlbWFwLmdldFBvc3NpYmxlUGFyZW50U2VsZWN0b3JJZHMoKVxuXG4gICAgdmFyICRlZGl0U2VsZWN0b3JGb3JtID0gaWNoLlNlbGVjdG9yRWRpdCh7XG4gICAgICBzZWxlY3Rvcjogc2VsZWN0b3IsXG4gICAgICBzZWxlY3Rvcklkczogc2VsZWN0b3JJZHMsXG4gICAgICBzZWxlY3RvclR5cGVzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnU2VsZWN0b3JUZXh0JyxcbiAgICAgICAgICB0aXRsZTogJ1RleHQnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnU2VsZWN0b3JMaW5rJyxcbiAgICAgICAgICB0aXRsZTogJ0xpbmsnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnU2VsZWN0b3JQb3B1cExpbmsnLFxuICAgICAgICAgIHRpdGxlOiAnUG9wdXAgTGluaydcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6ICdTZWxlY3RvckltYWdlJyxcbiAgICAgICAgICB0aXRsZTogJ0ltYWdlJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ1NlbGVjdG9yVGFibGUnLFxuICAgICAgICAgIHRpdGxlOiAnVGFibGUnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnU2VsZWN0b3JFbGVtZW50QXR0cmlidXRlJyxcbiAgICAgICAgICB0aXRsZTogJ0VsZW1lbnQgYXR0cmlidXRlJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ1NlbGVjdG9ySFRNTCcsXG4gICAgICAgICAgdGl0bGU6ICdIVE1MJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ1NlbGVjdG9yRWxlbWVudCcsXG4gICAgICAgICAgdGl0bGU6ICdFbGVtZW50J1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ1NlbGVjdG9yRWxlbWVudFNjcm9sbCcsXG4gICAgICAgICAgdGl0bGU6ICdFbGVtZW50IHNjcm9sbCBkb3duJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ1NlbGVjdG9yRWxlbWVudENsaWNrJyxcbiAgICAgICAgICB0aXRsZTogJ0VsZW1lbnQgY2xpY2snXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnU2VsZWN0b3JHcm91cCcsXG4gICAgICAgICAgdGl0bGU6ICdHcm91cGVkJ1xuICAgICAgICB9XG4gICAgICBdXG4gICAgfSlcbiAgICAkKCcjdmlld3BvcnQnKS5odG1sKCRlZGl0U2VsZWN0b3JGb3JtKVxuXHRcdC8vIG1hcmsgaW5pdGlhbGx5IG9wZW5lZCBzZWxlY3RvciBhcyBjdXJyZW50bHkgZWRpdGVkXG4gICAgJCgnI2VkaXQtc2VsZWN0b3IgI3BhcmVudFNlbGVjdG9ycyBvcHRpb24nKS5lYWNoKGZ1bmN0aW9uIChpLCBlbGVtZW50KSB7XG4gICAgICBpZiAoJChlbGVtZW50KS52YWwoKSA9PT0gc2VsZWN0b3IuaWQpIHtcbiAgICAgICAgJChlbGVtZW50KS5hZGRDbGFzcygnY3VycmVudGx5LWVkaXRlZCcpXG4gICAgICB9XG4gICAgfSlcblxuXHRcdC8vIHNldCBjbGlja1R5cGVcbiAgICBpZiAoc2VsZWN0b3IuY2xpY2tUeXBlKSB7XG4gICAgICAkZWRpdFNlbGVjdG9yRm9ybS5maW5kKCdbbmFtZT1jbGlja1R5cGVdJykudmFsKHNlbGVjdG9yLmNsaWNrVHlwZSlcbiAgICB9XG5cdFx0Ly8gc2V0IGNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlXG4gICAgaWYgKHNlbGVjdG9yLmNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlKSB7XG4gICAgICAkZWRpdFNlbGVjdG9yRm9ybS5maW5kKCdbbmFtZT1jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZV0nKS52YWwoc2VsZWN0b3IuY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUpXG4gICAgfVxuXG5cdFx0Ly8gaGFuZGxlIHNlbGVjdHMgc2VwZXJhdGVseVxuICAgICRlZGl0U2VsZWN0b3JGb3JtLmZpbmQoJ1tuYW1lPXR5cGVdJykudmFsKHNlbGVjdG9yLnR5cGUpXG4gICAgc2VsZWN0b3IucGFyZW50U2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9ySWQpIHtcbiAgICAgICRlZGl0U2VsZWN0b3JGb3JtLmZpbmQoXCIjcGFyZW50U2VsZWN0b3JzIFt2YWx1ZT0nXCIgKyBwYXJlbnRTZWxlY3RvcklkICsgXCInXVwiKS5hdHRyKCdzZWxlY3RlZCcsICdzZWxlY3RlZCcpXG4gICAgfSlcblxuICAgIHRoaXMuc3RhdGUuY3VycmVudFNlbGVjdG9yID0gc2VsZWN0b3JcbiAgICB0aGlzLnNlbGVjdG9yVHlwZUNoYW5nZWQoKVxuICAgIHRoaXMuaW5pdFNlbGVjdG9yVmFsaWRhdGlvbigpXG4gIH0sXG4gIHNlbGVjdG9yVHlwZUNoYW5nZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdHlwZSA9ICQoJyNlZGl0LXNlbGVjdG9yIHNlbGVjdFtuYW1lPXR5cGVdJykudmFsKClcbiAgICB2YXIgZmVhdHVyZXMgPSBzZWxlY3RvcnNbdHlwZV0uZ2V0RmVhdHVyZXMoKVxuICAgICQoJyNlZGl0LXNlbGVjdG9yIC5mZWF0dXJlJykuaGlkZSgpXG4gICAgZmVhdHVyZXMuZm9yRWFjaChmdW5jdGlvbiAoZmVhdHVyZSkge1xuICAgICAgJCgnI2VkaXQtc2VsZWN0b3IgLmZlYXR1cmUtJyArIGZlYXR1cmUpLnNob3coKVxuICAgIH0pXG5cblx0XHQvLyBhZGQgdGhpcyBzZWxlY3RvciB0byBwb3NzaWJsZSBwYXJlbnQgc2VsZWN0b3JcbiAgICB2YXIgc2VsZWN0b3IgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yKClcbiAgICBpZiAoc2VsZWN0b3IuY2FuSGF2ZUNoaWxkU2VsZWN0b3JzKCkpIHtcbiAgICAgIGlmICgkKCcjZWRpdC1zZWxlY3RvciAjcGFyZW50U2VsZWN0b3JzIC5jdXJyZW50bHktZWRpdGVkJykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHZhciAkb3B0aW9uID0gJCgnPG9wdGlvbiBjbGFzcz1cImN1cnJlbnRseS1lZGl0ZWRcIj48L29wdGlvbj4nKVxuICAgICAgICAkb3B0aW9uLnRleHQoc2VsZWN0b3IuaWQpLnZhbChzZWxlY3Rvci5pZClcbiAgICAgICAgJCgnI2VkaXQtc2VsZWN0b3IgI3BhcmVudFNlbGVjdG9ycycpLmFwcGVuZCgkb3B0aW9uKVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG5cdFx0Ly8gcmVtb3ZlIGlmIHR5cGUgZG9lc24ndCBhbGxvdyB0byBoYXZlIGNoaWxkIHNlbGVjdG9yc1xuICAgICAgJCgnI2VkaXQtc2VsZWN0b3IgI3BhcmVudFNlbGVjdG9ycyAuY3VycmVudGx5LWVkaXRlZCcpLnJlbW92ZSgpXG4gICAgfVxuICB9LFxuICBzYXZlU2VsZWN0b3I6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICB2YXIgc2VsZWN0b3IgPSB0aGlzLnN0YXRlLmN1cnJlbnRTZWxlY3RvclxuICAgIHZhciBuZXdTZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3IoKVxuXG5cdFx0Ly8gY2FuY2VsIHN1Ym1pdCBpZiBpbnZhbGlkIGZvcm1cbiAgICBpZiAoIXRoaXMuaXNWYWxpZEZvcm0oKSkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG5cdFx0Ly8gY2FuY2VsIHBvc3NpYmxlIGVsZW1lbnQgc2VsZWN0aW9uXG4gICAgdGhpcy5jb250ZW50U2NyaXB0LnJlbW92ZUN1cnJlbnRDb250ZW50U2VsZWN0b3IoKS5kb25lKGZ1bmN0aW9uICgpIHtcbiAgICAgIHNpdGVtYXAudXBkYXRlU2VsZWN0b3Ioc2VsZWN0b3IsIG5ld1NlbGVjdG9yKVxuXG4gICAgICB0aGlzLnN0b3JlLnNhdmVTaXRlbWFwKHNpdGVtYXAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5zaG93U2l0ZW1hcFNlbGVjdG9yTGlzdCgpXG4gICAgICB9LmJpbmQodGhpcykpXG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuXHQvKipcblx0ICogR2V0IHNlbGVjdG9yIGZyb20gc2VsZWN0b3IgZWRpdGluZyBmb3JtXG5cdCAqL1xuICBnZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvcjogZnVuY3Rpb24gKCkge1xuICAgIHZhciBpZCA9ICQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPWlkXScpLnZhbCgpXG4gICAgdmFyIHNlbGVjdG9yc1NlbGVjdG9yID0gJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9c2VsZWN0b3JdJykudmFsKClcbiAgICB2YXIgdGFibGVEYXRhUm93U2VsZWN0b3IgPSAkKCcjZWRpdC1zZWxlY3RvciBbbmFtZT10YWJsZURhdGFSb3dTZWxlY3Rvcl0nKS52YWwoKVxuICAgIHZhciB0YWJsZUhlYWRlclJvd1NlbGVjdG9yID0gJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9dGFibGVIZWFkZXJSb3dTZWxlY3Rvcl0nKS52YWwoKVxuICAgIHZhciBjbGlja0VsZW1lbnRTZWxlY3RvciA9ICQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPWNsaWNrRWxlbWVudFNlbGVjdG9yXScpLnZhbCgpXG4gICAgdmFyIHR5cGUgPSAkKCcjZWRpdC1zZWxlY3RvciBbbmFtZT10eXBlXScpLnZhbCgpXG4gICAgdmFyIGNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlID0gJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9Y2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGVdJykudmFsKClcbiAgICB2YXIgY2xpY2tUeXBlID0gJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9Y2xpY2tUeXBlXScpLnZhbCgpXG4gICAgdmFyIGRpc2NhcmRJbml0aWFsRWxlbWVudHMgPSAkKCcjZWRpdC1zZWxlY3RvciBbbmFtZT1kaXNjYXJkSW5pdGlhbEVsZW1lbnRzXScpLmlzKCc6Y2hlY2tlZCcpXG4gICAgdmFyIG11bHRpcGxlID0gJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9bXVsdGlwbGVdJykuaXMoJzpjaGVja2VkJylcbiAgICB2YXIgZG93bmxvYWRJbWFnZSA9ICQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPWRvd25sb2FkSW1hZ2VdJykuaXMoJzpjaGVja2VkJylcbiAgICB2YXIgY2xpY2tQb3B1cCA9ICQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPWNsaWNrUG9wdXBdJykuaXMoJzpjaGVja2VkJylcbiAgICB2YXIgcmVnZXggPSAkKCcjZWRpdC1zZWxlY3RvciBbbmFtZT1yZWdleF0nKS52YWwoKVxuICAgIHZhciBkZWxheSA9ICQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPWRlbGF5XScpLnZhbCgpXG4gICAgdmFyIGV4dHJhY3RBdHRyaWJ1dGUgPSAkKCcjZWRpdC1zZWxlY3RvciBbbmFtZT1leHRyYWN0QXR0cmlidXRlXScpLnZhbCgpXG4gICAgdmFyIHBhcmVudFNlbGVjdG9ycyA9ICQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPXBhcmVudFNlbGVjdG9yc10nKS52YWwoKVxuICAgIHZhciBjb2x1bW5zID0gW11cbiAgICB2YXIgJGNvbHVtbkhlYWRlcnMgPSAkKCcjZWRpdC1zZWxlY3RvciAuY29sdW1uLWhlYWRlcicpXG4gICAgdmFyICRjb2x1bW5OYW1lcyA9ICQoJyNlZGl0LXNlbGVjdG9yIC5jb2x1bW4tbmFtZScpXG4gICAgdmFyICRjb2x1bW5FeHRyYWN0cyA9ICQoJyNlZGl0LXNlbGVjdG9yIC5jb2x1bW4tZXh0cmFjdCcpXG5cbiAgICAkY29sdW1uSGVhZGVycy5lYWNoKGZ1bmN0aW9uIChpKSB7XG4gICAgICB2YXIgaGVhZGVyID0gJCgkY29sdW1uSGVhZGVyc1tpXSkudmFsKClcbiAgICAgIHZhciBuYW1lID0gJCgkY29sdW1uTmFtZXNbaV0pLnZhbCgpXG4gICAgICB2YXIgZXh0cmFjdCA9ICQoJGNvbHVtbkV4dHJhY3RzW2ldKS5pcygnOmNoZWNrZWQnKVxuICAgICAgY29sdW1ucy5wdXNoKHtcbiAgICAgICAgaGVhZGVyOiBoZWFkZXIsXG4gICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgIGV4dHJhY3Q6IGV4dHJhY3RcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIHZhciBuZXdTZWxlY3RvciA9IG5ldyBTZWxlY3Rvcih7XG4gICAgICBpZDogaWQsXG4gICAgICBzZWxlY3Rvcjogc2VsZWN0b3JzU2VsZWN0b3IsXG4gICAgICB0YWJsZUhlYWRlclJvd1NlbGVjdG9yOiB0YWJsZUhlYWRlclJvd1NlbGVjdG9yLFxuICAgICAgdGFibGVEYXRhUm93U2VsZWN0b3I6IHRhYmxlRGF0YVJvd1NlbGVjdG9yLFxuICAgICAgY2xpY2tFbGVtZW50U2VsZWN0b3I6IGNsaWNrRWxlbWVudFNlbGVjdG9yLFxuICAgICAgY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGU6IGNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlLFxuICAgICAgY2xpY2tUeXBlOiBjbGlja1R5cGUsXG4gICAgICBkaXNjYXJkSW5pdGlhbEVsZW1lbnRzOiBkaXNjYXJkSW5pdGlhbEVsZW1lbnRzLFxuICAgICAgdHlwZTogdHlwZSxcbiAgICAgIG11bHRpcGxlOiBtdWx0aXBsZSxcbiAgICAgIGRvd25sb2FkSW1hZ2U6IGRvd25sb2FkSW1hZ2UsXG4gICAgICBjbGlja1BvcHVwOiBjbGlja1BvcHVwLFxuICAgICAgcmVnZXg6IHJlZ2V4LFxuICAgICAgZXh0cmFjdEF0dHJpYnV0ZTogZXh0cmFjdEF0dHJpYnV0ZSxcbiAgICAgIHBhcmVudFNlbGVjdG9yczogcGFyZW50U2VsZWN0b3JzLFxuICAgICAgY29sdW1uczogY29sdW1ucyxcbiAgICAgIGRlbGF5OiBkZWxheVxuICAgIH0pXG4gICAgcmV0dXJuIG5ld1NlbGVjdG9yXG4gIH0sXG5cdC8qKlxuXHQgKiBAcmV0dXJucyB7U2l0ZW1hcHwqfSBDbG9uZWQgU2l0ZW1hcCB3aXRoIGN1cnJlbnRseSBlZGl0ZWQgc2VsZWN0b3Jcblx0ICovXG4gIGdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yU2l0ZW1hcDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcC5jbG9uZSgpXG4gICAgdmFyIHNlbGVjdG9yID0gc2l0ZW1hcC5nZXRTZWxlY3RvckJ5SWQodGhpcy5zdGF0ZS5jdXJyZW50U2VsZWN0b3IuaWQpXG4gICAgdmFyIG5ld1NlbGVjdG9yID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvcigpXG4gICAgc2l0ZW1hcC51cGRhdGVTZWxlY3RvcihzZWxlY3RvciwgbmV3U2VsZWN0b3IpXG4gICAgcmV0dXJuIHNpdGVtYXBcbiAgfSxcbiAgY2FuY2VsU2VsZWN0b3JFZGl0aW5nOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG5cdFx0Ly8gY2FuY2VsIHBvc3NpYmxlIGVsZW1lbnQgc2VsZWN0aW9uXG4gICAgdGhpcy5jb250ZW50U2NyaXB0LnJlbW92ZUN1cnJlbnRDb250ZW50U2VsZWN0b3IoKS5kb25lKGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuc2hvd1NpdGVtYXBTZWxlY3Rvckxpc3QoKVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcbiAgYWRkU2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcGFyZW50U2VsZWN0b3JJZCA9IHRoaXMuc3RhdGUuY3VycmVudFBhcmVudFNlbGVjdG9ySWRcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcblxuICAgIHZhciBzZWxlY3RvciA9IG5ldyBTZWxlY3Rvcih7XG4gICAgICBwYXJlbnRTZWxlY3RvcnM6IFtwYXJlbnRTZWxlY3RvcklkXSxcbiAgICAgIHR5cGU6ICdTZWxlY3RvclRleHQnLFxuICAgICAgbXVsdGlwbGU6IGZhbHNlXG4gICAgfSlcblxuICAgIHRoaXMuX2VkaXRTZWxlY3RvcihzZWxlY3Rvciwgc2l0ZW1hcClcbiAgfSxcbiAgZGVsZXRlU2VsZWN0b3I6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICB2YXIgc2VsZWN0b3IgPSAkKGJ1dHRvbikuY2xvc2VzdCgndHInKS5kYXRhKCdzZWxlY3RvcicpXG4gICAgc2l0ZW1hcC5kZWxldGVTZWxlY3RvcihzZWxlY3RvcilcblxuICAgIHRoaXMuc3RvcmUuc2F2ZVNpdGVtYXAoc2l0ZW1hcCwgZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5zaG93U2l0ZW1hcFNlbGVjdG9yTGlzdCgpXG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuICBkZWxldGVTaXRlbWFwOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyIHNpdGVtYXAgPSAkKGJ1dHRvbikuY2xvc2VzdCgndHInKS5kYXRhKCdzaXRlbWFwJylcbiAgICB2YXIgY29udHJvbGxlciA9IHRoaXNcbiAgICB0aGlzLnN0b3JlLmRlbGV0ZVNpdGVtYXAoc2l0ZW1hcCwgZnVuY3Rpb24gKCkge1xuICAgICAgY29udHJvbGxlci5zaG93U2l0ZW1hcHMoKVxuICAgIH0pXG4gIH0sXG4gIGluaXRTY3JhcGVTaXRlbWFwQ29uZmlnVmFsaWRhdGlvbjogZnVuY3Rpb24gKCkge1xuICAgICQoJyN2aWV3cG9ydCBmb3JtJykuYm9vdHN0cmFwVmFsaWRhdG9yKHtcbiAgICAgIGZpZWxkczoge1xuICAgICAgICAncmVxdWVzdEludGVydmFsJzoge1xuICAgICAgICAgIHZhbGlkYXRvcnM6IHtcbiAgICAgICAgICAgIG5vdEVtcHR5OiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgcmVxdWVzdCBpbnRlcnZhbCBpcyByZXF1aXJlZCBhbmQgY2Fubm90IGJlIGVtcHR5J1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG51bWVyaWM6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSByZXF1ZXN0IGludGVydmFsIG11c3QgYmUgbnVtZXJpYydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjYWxsYmFjazoge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnVGhlIHJlcXVlc3QgaW50ZXJ2YWwgbXVzdCBiZSBhdGxlYXN0IDIwMDAgbWlsbGlzZWNvbmRzJyxcbiAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICh2YWx1ZSwgdmFsaWRhdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlID49IDIwMDBcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgJ3BhZ2VMb2FkRGVsYXknOiB7XG4gICAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgICAgbm90RW1wdHk6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSBwYWdlIGxvYWQgZGVsYXkgaXMgcmVxdWlyZWQgYW5kIGNhbm5vdCBiZSBlbXB0eSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBudW1lcmljOiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgcGFnZSBsYW9kIGRlbGF5IG11c3QgYmUgbnVtZXJpYydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjYWxsYmFjazoge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnVGhlIHBhZ2UgbG9hZCBkZWxheSBtdXN0IGJlIGF0bGVhc3QgNTAwIG1pbGxpc2Vjb25kcycsXG4gICAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbiAodmFsdWUsIHZhbGlkYXRvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZSA+PSA1MDBcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIH0sXG4gIHNob3dTY3JhcGVTaXRlbWFwQ29uZmlnUGFuZWw6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNldEFjdGl2ZU5hdmlnYXRpb25CdXR0b24oJ3NpdGVtYXAtc2NyYXBlJylcbiAgICB2YXIgc2NyYXBlQ29uZmlnUGFuZWwgPSBpY2guU2l0ZW1hcFNjcmFwZUNvbmZpZygpXG4gICAgJCgnI3ZpZXdwb3J0JykuaHRtbChzY3JhcGVDb25maWdQYW5lbClcbiAgICB0aGlzLmluaXRTY3JhcGVTaXRlbWFwQ29uZmlnVmFsaWRhdGlvbigpXG4gICAgcmV0dXJuIHRydWVcbiAgfSxcbiAgc2NyYXBlU2l0ZW1hcDogZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5pc1ZhbGlkRm9ybSgpKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cbiAgICB2YXIgcmVxdWVzdEludGVydmFsID0gJCgnaW5wdXRbbmFtZT1yZXF1ZXN0SW50ZXJ2YWxdJykudmFsKClcbiAgICB2YXIgcGFnZUxvYWREZWxheSA9ICQoJ2lucHV0W25hbWU9cGFnZUxvYWREZWxheV0nKS52YWwoKVxuXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICBzY3JhcGVTaXRlbWFwOiB0cnVlLFxuICAgICAgc2l0ZW1hcDogSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzaXRlbWFwKSksXG4gICAgICByZXF1ZXN0SW50ZXJ2YWw6IHJlcXVlc3RJbnRlcnZhbCxcbiAgICAgIHBhZ2VMb2FkRGVsYXk6IHBhZ2VMb2FkRGVsYXlcbiAgICB9XG5cblx0XHQvLyBzaG93IHNpdGVtYXAgc2NyYXBpbmcgcGFuZWxcbiAgICB0aGlzLmdldEZvcm1WYWxpZGF0b3IoKS5kZXN0cm95KClcbiAgICAkKCcuc2NyYXBpbmctaW4tcHJvZ3Jlc3MnKS5yZW1vdmVDbGFzcygnaGlkZScpXG4gICAgJCgnI3N1Ym1pdC1zY3JhcGUtc2l0ZW1hcCcpLmNsb3Nlc3QoJy5mb3JtLWdyb3VwJykuaGlkZSgpXG4gICAgJCgnI3NjcmFwZS1zaXRlbWFwLWNvbmZpZyBpbnB1dCcpLnByb3AoJ2Rpc2FibGVkJywgdHJ1ZSlcblxuICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHJlcXVlc3QsIGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgdGhpcy5icm93c2VTaXRlbWFwRGF0YSgpXG4gICAgfS5iaW5kKHRoaXMpKVxuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICBzaXRlbWFwTGlzdEJyb3dzZVNpdGVtYXBEYXRhOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyIHNpdGVtYXAgPSAkKGJ1dHRvbikuY2xvc2VzdCgndHInKS5kYXRhKCdzaXRlbWFwJylcbiAgICB0aGlzLnNldFN0YXRlRWRpdFNpdGVtYXAoc2l0ZW1hcClcbiAgICB0aGlzLmJyb3dzZVNpdGVtYXBEYXRhKClcbiAgfSxcbiAgYnJvd3NlU2l0ZW1hcERhdGE6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNldEFjdGl2ZU5hdmlnYXRpb25CdXR0b24oJ3NpdGVtYXAtYnJvd3NlJylcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICB0aGlzLnN0b3JlLmdldFNpdGVtYXBEYXRhKHNpdGVtYXAsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICB2YXIgZGF0YUNvbHVtbnMgPSBzaXRlbWFwLmdldERhdGFDb2x1bW5zKClcblxuICAgICAgdmFyIGRhdGFQYW5lbCA9IGljaC5TaXRlbWFwQnJvd3NlRGF0YSh7XG4gICAgICAgIGNvbHVtbnM6IGRhdGFDb2x1bW5zXG4gICAgICB9KVxuICAgICAgJCgnI3ZpZXdwb3J0JykuaHRtbChkYXRhUGFuZWwpXG5cblx0XHRcdC8vIGRpc3BsYXkgZGF0YVxuXHRcdFx0Ly8gRG9pbmcgdGhpcyB0aGUgbG9uZyB3YXkgc28gdGhlcmUgYXJlbid0IHhzcyB2dWxuZXJ1YmlsaXRlc1xuXHRcdFx0Ly8gd2hpbGUgd29ya2luZyB3aXRoIGRhdGEgb3Igd2l0aCB0aGUgc2VsZWN0b3IgdGl0bGVzXG4gICAgICB2YXIgJHRib2R5ID0gJCgnI3NpdGVtYXAtZGF0YSB0Ym9keScpXG4gICAgICBkYXRhLmZvckVhY2goZnVuY3Rpb24gKHJvdykge1xuICAgICAgICB2YXIgJHRyID0gJCgnPHRyPjwvdHI+JylcbiAgICAgICAgZGF0YUNvbHVtbnMuZm9yRWFjaChmdW5jdGlvbiAoY29sdW1uKSB7XG4gICAgICAgICAgdmFyICR0ZCA9ICQoJzx0ZD48L3RkPicpXG4gICAgICAgICAgdmFyIGNlbGxEYXRhID0gcm93W2NvbHVtbl1cbiAgICAgICAgICBpZiAodHlwZW9mIGNlbGxEYXRhID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgY2VsbERhdGEgPSBKU09OLnN0cmluZ2lmeShjZWxsRGF0YSlcbiAgICAgICAgICB9XG4gICAgICAgICAgJHRkLnRleHQoY2VsbERhdGEpXG4gICAgICAgICAgJHRyLmFwcGVuZCgkdGQpXG4gICAgICAgIH0pXG4gICAgICAgICR0Ym9keS5hcHBlbmQoJHRyKVxuICAgICAgfSlcbiAgICB9KVxuXG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBzaG93U2l0ZW1hcEV4cG9ydERhdGFDc3ZQYW5lbDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2V0QWN0aXZlTmF2aWdhdGlvbkJ1dHRvbignc2l0ZW1hcC1leHBvcnQtZGF0YS1jc3YnKVxuXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgdmFyIGV4cG9ydFBhbmVsID0gaWNoLlNpdGVtYXBFeHBvcnREYXRhQ1NWKHNpdGVtYXApXG4gICAgJCgnI3ZpZXdwb3J0JykuaHRtbChleHBvcnRQYW5lbClcblxuXHRcdC8vIGdlbmVyYXRlIGRhdGFcbiAgICAkKCcuZG93bmxvYWQtYnV0dG9uJykuaGlkZSgpXG4gICAgdGhpcy5zdG9yZS5nZXRTaXRlbWFwRGF0YShzaXRlbWFwLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgdmFyIGJsb2IgPSBzaXRlbWFwLmdldERhdGFFeHBvcnRDc3ZCbG9iKGRhdGEpXG4gICAgICAkKCcuZG93bmxvYWQtYnV0dG9uIGEnKS5hdHRyKCdocmVmJywgd2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYikpXG4gICAgICAkKCcuZG93bmxvYWQtYnV0dG9uIGEnKS5hdHRyKCdkb3dubG9hZCcsIHNpdGVtYXAuX2lkICsgJy5jc3YnKVxuICAgICAgJCgnLmRvd25sb2FkLWJ1dHRvbicpLnNob3coKVxuICAgIH0pXG5cbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIHNlbGVjdFNlbGVjdG9yOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyIGlucHV0ID0gJChidXR0b24pLmNsb3Nlc3QoJy5mb3JtLWdyb3VwJykuZmluZCgnaW5wdXQuc2VsZWN0b3ItdmFsdWUnKVxuICAgIHZhciBzaXRlbWFwID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvclNpdGVtYXAoKVxuICAgIHZhciBzZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3IoKVxuICAgIHZhciBjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcyA9IHRoaXMuZ2V0Q3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMoKVxuICAgIHZhciBwYXJlbnRDU1NTZWxlY3RvciA9IHNpdGVtYXAuc2VsZWN0b3JzLmdldFBhcmVudENTU1NlbGVjdG9yV2l0aGluT25lUGFnZShjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcylcblxuICAgIHZhciBkZWZlcnJlZFNlbGVjdG9yID0gdGhpcy5jb250ZW50U2NyaXB0LnNlbGVjdFNlbGVjdG9yKHtcbiAgICAgIHBhcmVudENTU1NlbGVjdG9yOiBwYXJlbnRDU1NTZWxlY3RvcixcbiAgICAgIGFsbG93ZWRFbGVtZW50czogc2VsZWN0b3IuZ2V0SXRlbUNTU1NlbGVjdG9yKClcbiAgICB9KVxuXG4gICAgZGVmZXJyZWRTZWxlY3Rvci5kb25lKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICQoaW5wdXQpLnZhbChyZXN1bHQuQ1NTU2VsZWN0b3IpXG5cblx0XHRcdC8vIHVwZGF0ZSB2YWxpZGF0aW9uIGZvciBzZWxlY3RvciBmaWVsZFxuICAgICAgdmFyIHZhbGlkYXRvciA9IHRoaXMuZ2V0Rm9ybVZhbGlkYXRvcigpXG4gICAgICB2YWxpZGF0b3IucmV2YWxpZGF0ZUZpZWxkKGlucHV0KVxuXG5cdFx0XHQvLyBAVE9ETyBob3cgY291bGQgdGhpcyBiZSBlbmNhcHN1bGF0ZWQ/XG5cdFx0XHQvLyB1cGRhdGUgaGVhZGVyIHJvdywgZGF0YSByb3cgc2VsZWN0b3JzIGFmdGVyIHNlbGVjdGluZyB0aGUgdGFibGUuIHNlbGVjdG9ycyBhcmUgdXBkYXRlZCBiYXNlZCBvbiB0YWJsZXNcblx0XHRcdC8vIGlubmVyIGh0bWxcbiAgICAgIGlmIChzZWxlY3Rvci50eXBlID09PSAnU2VsZWN0b3JUYWJsZScpIHtcbiAgICAgICAgdGhpcy5nZXRTZWxlY3RvckhUTUwoKS5kb25lKGZ1bmN0aW9uIChodG1sKSB7XG4gICAgICAgICAgdmFyIHRhYmxlSGVhZGVyUm93U2VsZWN0b3IgPSBTZWxlY3RvclRhYmxlLmdldFRhYmxlSGVhZGVyUm93U2VsZWN0b3JGcm9tVGFibGVIVE1MKGh0bWwpXG4gICAgICAgICAgdmFyIHRhYmxlRGF0YVJvd1NlbGVjdG9yID0gU2VsZWN0b3JUYWJsZS5nZXRUYWJsZURhdGFSb3dTZWxlY3RvckZyb21UYWJsZUhUTUwoaHRtbClcbiAgICAgICAgICAkKCdpbnB1dFtuYW1lPXRhYmxlSGVhZGVyUm93U2VsZWN0b3JdJykudmFsKHRhYmxlSGVhZGVyUm93U2VsZWN0b3IpXG4gICAgICAgICAgJCgnaW5wdXRbbmFtZT10YWJsZURhdGFSb3dTZWxlY3Rvcl0nKS52YWwodGFibGVEYXRhUm93U2VsZWN0b3IpXG5cbiAgICAgICAgICB2YXIgaGVhZGVyQ29sdW1ucyA9IFNlbGVjdG9yVGFibGUuZ2V0VGFibGVIZWFkZXJDb2x1bW5zRnJvbUhUTUwodGFibGVIZWFkZXJSb3dTZWxlY3RvciwgaHRtbClcbiAgICAgICAgICB0aGlzLnJlbmRlclRhYmxlSGVhZGVyQ29sdW1ucyhoZWFkZXJDb2x1bW5zKVxuICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuXG4gIGdldEN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHBhcmVudFNlbGVjdG9ySWRzID0gdGhpcy5zdGF0ZS5lZGl0U2l0ZW1hcEJyZWFkY3VtYnNTZWxlY3RvcnMubWFwKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgcmV0dXJuIHNlbGVjdG9yLmlkXG4gICAgfSlcblxuICAgIHJldHVybiBwYXJlbnRTZWxlY3Rvcklkc1xuICB9LFxuXG4gIHNlbGVjdFRhYmxlSGVhZGVyUm93U2VsZWN0b3I6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgaW5wdXQgPSAkKGJ1dHRvbikuY2xvc2VzdCgnLmZvcm0tZ3JvdXAnKS5maW5kKCdpbnB1dC5zZWxlY3Rvci12YWx1ZScpXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yU2l0ZW1hcCgpXG4gICAgdmFyIHNlbGVjdG9yID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvcigpXG4gICAgdmFyIGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzID0gdGhpcy5nZXRDdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcygpXG4gICAgdmFyIHBhcmVudENTU1NlbGVjdG9yID0gc2l0ZW1hcC5zZWxlY3RvcnMuZ2V0Q1NTU2VsZWN0b3JXaXRoaW5PbmVQYWdlKHNlbGVjdG9yLmlkLCBjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcylcblxuICAgIHZhciBkZWZlcnJlZFNlbGVjdG9yID0gdGhpcy5jb250ZW50U2NyaXB0LnNlbGVjdFNlbGVjdG9yKHtcbiAgICAgIHBhcmVudENTU1NlbGVjdG9yOiBwYXJlbnRDU1NTZWxlY3RvcixcbiAgICAgIGFsbG93ZWRFbGVtZW50czogJ3RyJ1xuICAgIH0pXG5cbiAgICBkZWZlcnJlZFNlbGVjdG9yLmRvbmUoZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgdmFyIHRhYmxlSGVhZGVyUm93U2VsZWN0b3IgPSByZXN1bHQuQ1NTU2VsZWN0b3JcbiAgICAgICQoaW5wdXQpLnZhbCh0YWJsZUhlYWRlclJvd1NlbGVjdG9yKVxuXG4gICAgICB0aGlzLmdldFNlbGVjdG9ySFRNTCgpLmRvbmUoZnVuY3Rpb24gKGh0bWwpIHtcbiAgICAgICAgdmFyIGhlYWRlckNvbHVtbnMgPSBTZWxlY3RvclRhYmxlLmdldFRhYmxlSGVhZGVyQ29sdW1uc0Zyb21IVE1MKHRhYmxlSGVhZGVyUm93U2VsZWN0b3IsIGh0bWwpXG4gICAgICAgIHRoaXMucmVuZGVyVGFibGVIZWFkZXJDb2x1bW5zKGhlYWRlckNvbHVtbnMpXG4gICAgICB9LmJpbmQodGhpcykpXG5cblx0XHRcdC8vIHVwZGF0ZSB2YWxpZGF0aW9uIGZvciBzZWxlY3RvciBmaWVsZFxuICAgICAgdmFyIHZhbGlkYXRvciA9IHRoaXMuZ2V0Rm9ybVZhbGlkYXRvcigpXG4gICAgICB2YWxpZGF0b3IucmV2YWxpZGF0ZUZpZWxkKGlucHV0KVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcblxuICBzZWxlY3RUYWJsZURhdGFSb3dTZWxlY3RvcjogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciBpbnB1dCA9ICQoYnV0dG9uKS5jbG9zZXN0KCcuZm9ybS1ncm91cCcpLmZpbmQoJ2lucHV0LnNlbGVjdG9yLXZhbHVlJylcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3JTaXRlbWFwKClcbiAgICB2YXIgc2VsZWN0b3IgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yKClcbiAgICB2YXIgY3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMgPSB0aGlzLmdldEN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzKClcbiAgICB2YXIgcGFyZW50Q1NTU2VsZWN0b3IgPSBzaXRlbWFwLnNlbGVjdG9ycy5nZXRDU1NTZWxlY3RvcldpdGhpbk9uZVBhZ2Uoc2VsZWN0b3IuaWQsIGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzKVxuXG4gICAgdmFyIGRlZmVycmVkU2VsZWN0b3IgPSB0aGlzLmNvbnRlbnRTY3JpcHQuc2VsZWN0U2VsZWN0b3Ioe1xuICAgICAgcGFyZW50Q1NTU2VsZWN0b3I6IHBhcmVudENTU1NlbGVjdG9yLFxuICAgICAgYWxsb3dlZEVsZW1lbnRzOiAndHInXG4gICAgfSlcblxuICAgIGRlZmVycmVkU2VsZWN0b3IuZG9uZShmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAkKGlucHV0KS52YWwocmVzdWx0LkNTU1NlbGVjdG9yKVxuXG5cdFx0XHQvLyB1cGRhdGUgdmFsaWRhdGlvbiBmb3Igc2VsZWN0b3IgZmllbGRcbiAgICAgIHZhciB2YWxpZGF0b3IgPSB0aGlzLmdldEZvcm1WYWxpZGF0b3IoKVxuICAgICAgdmFsaWRhdG9yLnJldmFsaWRhdGVGaWVsZChpbnB1dClcbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG5cblx0LyoqXG5cdCAqIHVwZGF0ZSB0YWJsZSBzZWxlY3RvciBjb2x1bW4gZWRpdGluZyBmaWVsZHNcblx0ICovXG4gIHJlbmRlclRhYmxlSGVhZGVyQ29sdW1uczogZnVuY3Rpb24gKGhlYWRlckNvbHVtbnMpIHtcblx0XHQvLyByZXNldCBwcmV2aW91cyBjb2x1bW5zXG4gICAgdmFyICR0Ym9keSA9ICQoJy5mZWF0dXJlLWNvbHVtbnMgdGFibGUgdGJvZHknKVxuICAgICR0Ym9keS5odG1sKCcnKVxuICAgIGhlYWRlckNvbHVtbnMuZm9yRWFjaChmdW5jdGlvbiAoY29sdW1uKSB7XG4gICAgICB2YXIgJHJvdyA9IGljaC5TZWxlY3RvckVkaXRUYWJsZUNvbHVtbihjb2x1bW4pXG4gICAgICAkdGJvZHkuYXBwZW5kKCRyb3cpXG4gICAgfSlcbiAgfSxcblxuXHQvKipcblx0ICogUmV0dXJucyBIVE1MIHRoYXQgdGhlIGN1cnJlbnQgc2VsZWN0b3Igd291bGQgc2VsZWN0XG5cdCAqL1xuICBnZXRTZWxlY3RvckhUTUw6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3JTaXRlbWFwKClcbiAgICB2YXIgc2VsZWN0b3IgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yKClcbiAgICB2YXIgY3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMgPSB0aGlzLmdldEN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzKClcbiAgICB2YXIgQ1NTU2VsZWN0b3IgPSBzaXRlbWFwLnNlbGVjdG9ycy5nZXRDU1NTZWxlY3RvcldpdGhpbk9uZVBhZ2Uoc2VsZWN0b3IuaWQsIGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzKVxuICAgIHZhciBkZWZlcnJlZEhUTUwgPSB0aGlzLmNvbnRlbnRTY3JpcHQuZ2V0SFRNTCh7Q1NTU2VsZWN0b3I6IENTU1NlbGVjdG9yfSlcblxuICAgIHJldHVybiBkZWZlcnJlZEhUTUxcbiAgfSxcbiAgcHJldmlld1NlbGVjdG9yOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgaWYgKCEkKGJ1dHRvbikuaGFzQ2xhc3MoJ3ByZXZpZXcnKSkge1xuICAgICAgdmFyIHNpdGVtYXAgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yU2l0ZW1hcCgpXG4gICAgICB2YXIgc2VsZWN0b3IgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yKClcbiAgICAgIHZhciBjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcyA9IHRoaXMuZ2V0Q3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMoKVxuICAgICAgdmFyIHBhcmVudENTU1NlbGVjdG9yID0gc2l0ZW1hcC5zZWxlY3RvcnMuZ2V0UGFyZW50Q1NTU2VsZWN0b3JXaXRoaW5PbmVQYWdlKGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzKVxuICAgICAgdmFyIGRlZmVycmVkU2VsZWN0b3JQcmV2aWV3ID0gdGhpcy5jb250ZW50U2NyaXB0LnByZXZpZXdTZWxlY3Rvcih7XG4gICAgICAgIHBhcmVudENTU1NlbGVjdG9yOiBwYXJlbnRDU1NTZWxlY3RvcixcbiAgICAgICAgZWxlbWVudENTU1NlbGVjdG9yOiBzZWxlY3Rvci5zZWxlY3RvclxuICAgICAgfSlcblxuICAgICAgZGVmZXJyZWRTZWxlY3RvclByZXZpZXcuZG9uZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICQoYnV0dG9uKS5hZGRDbGFzcygncHJldmlldycpXG4gICAgICB9KVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNvbnRlbnRTY3JpcHQucmVtb3ZlQ3VycmVudENvbnRlbnRTZWxlY3RvcigpXG4gICAgICAkKGJ1dHRvbikucmVtb3ZlQ2xhc3MoJ3ByZXZpZXcnKVxuICAgIH1cbiAgfSxcbiAgcHJldmlld0NsaWNrRWxlbWVudFNlbGVjdG9yOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgaWYgKCEkKGJ1dHRvbikuaGFzQ2xhc3MoJ3ByZXZpZXcnKSkge1xuICAgICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgICB2YXIgc2VsZWN0b3IgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yKClcbiAgICAgIHZhciBjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcyA9IHRoaXMuZ2V0Q3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMoKVxuICAgICAgdmFyIHBhcmVudENTU1NlbGVjdG9yID0gc2l0ZW1hcC5zZWxlY3RvcnMuZ2V0UGFyZW50Q1NTU2VsZWN0b3JXaXRoaW5PbmVQYWdlKGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzKVxuXG4gICAgICB2YXIgZGVmZXJyZWRTZWxlY3RvclByZXZpZXcgPSB0aGlzLmNvbnRlbnRTY3JpcHQucHJldmlld1NlbGVjdG9yKHtcbiAgICAgICAgcGFyZW50Q1NTU2VsZWN0b3I6IHBhcmVudENTU1NlbGVjdG9yLFxuICAgICAgICBlbGVtZW50Q1NTU2VsZWN0b3I6IHNlbGVjdG9yLmNsaWNrRWxlbWVudFNlbGVjdG9yXG4gICAgICB9KVxuXG4gICAgICBkZWZlcnJlZFNlbGVjdG9yUHJldmlldy5kb25lKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJChidXR0b24pLmFkZENsYXNzKCdwcmV2aWV3JylcbiAgICAgIH0pXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY29udGVudFNjcmlwdC5yZW1vdmVDdXJyZW50Q29udGVudFNlbGVjdG9yKClcbiAgICAgICQoYnV0dG9uKS5yZW1vdmVDbGFzcygncHJldmlldycpXG4gICAgfVxuICB9LFxuICBwcmV2aWV3VGFibGVSb3dTZWxlY3RvcjogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIGlmICghJChidXR0b24pLmhhc0NsYXNzKCdwcmV2aWV3JykpIHtcbiAgICAgIHZhciBzaXRlbWFwID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvclNpdGVtYXAoKVxuICAgICAgdmFyIHNlbGVjdG9yID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvcigpXG4gICAgICB2YXIgY3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMgPSB0aGlzLmdldEN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzKClcbiAgICAgIHZhciBwYXJlbnRDU1NTZWxlY3RvciA9IHNpdGVtYXAuc2VsZWN0b3JzLmdldENTU1NlbGVjdG9yV2l0aGluT25lUGFnZShzZWxlY3Rvci5pZCwgY3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMpXG4gICAgICB2YXIgcm93U2VsZWN0b3IgPSAkKGJ1dHRvbikuY2xvc2VzdCgnLmZvcm0tZ3JvdXAnKS5maW5kKCdpbnB1dCcpLnZhbCgpXG5cbiAgICAgIHZhciBkZWZlcnJlZFNlbGVjdG9yUHJldmlldyA9IHRoaXMuY29udGVudFNjcmlwdC5wcmV2aWV3U2VsZWN0b3Ioe1xuICAgICAgICBwYXJlbnRDU1NTZWxlY3RvcjogcGFyZW50Q1NTU2VsZWN0b3IsXG4gICAgICAgIGVsZW1lbnRDU1NTZWxlY3Rvcjogcm93U2VsZWN0b3JcbiAgICAgIH0pXG5cbiAgICAgIGRlZmVycmVkU2VsZWN0b3JQcmV2aWV3LmRvbmUoZnVuY3Rpb24gKCkge1xuICAgICAgICAkKGJ1dHRvbikuYWRkQ2xhc3MoJ3ByZXZpZXcnKVxuICAgICAgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jb250ZW50U2NyaXB0LnJlbW92ZUN1cnJlbnRDb250ZW50U2VsZWN0b3IoKVxuICAgICAgJChidXR0b24pLnJlbW92ZUNsYXNzKCdwcmV2aWV3JylcbiAgICB9XG4gIH0sXG4gIHByZXZpZXdTZWxlY3RvckZyb21TZWxlY3RvclRyZWU6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICBpZiAoISQoYnV0dG9uKS5oYXNDbGFzcygncHJldmlldycpKSB7XG4gICAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICAgIHZhciBzZWxlY3RvciA9ICQoYnV0dG9uKS5jbG9zZXN0KCd0cicpLmRhdGEoJ3NlbGVjdG9yJylcbiAgICAgIHZhciBjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcyA9IHRoaXMuZ2V0Q3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMoKVxuICAgICAgdmFyIHBhcmVudENTU1NlbGVjdG9yID0gc2l0ZW1hcC5zZWxlY3RvcnMuZ2V0UGFyZW50Q1NTU2VsZWN0b3JXaXRoaW5PbmVQYWdlKGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzKVxuICAgICAgdmFyIGRlZmVycmVkU2VsZWN0b3JQcmV2aWV3ID0gdGhpcy5jb250ZW50U2NyaXB0LnByZXZpZXdTZWxlY3Rvcih7XG4gICAgICAgIHBhcmVudENTU1NlbGVjdG9yOiBwYXJlbnRDU1NTZWxlY3RvcixcbiAgICAgICAgZWxlbWVudENTU1NlbGVjdG9yOiBzZWxlY3Rvci5zZWxlY3RvclxuICAgICAgfSlcblxuICAgICAgZGVmZXJyZWRTZWxlY3RvclByZXZpZXcuZG9uZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICQoYnV0dG9uKS5hZGRDbGFzcygncHJldmlldycpXG4gICAgICB9KVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNvbnRlbnRTY3JpcHQucmVtb3ZlQ3VycmVudENvbnRlbnRTZWxlY3RvcigpXG4gICAgICAkKGJ1dHRvbikucmVtb3ZlQ2xhc3MoJ3ByZXZpZXcnKVxuICAgIH1cbiAgfSxcbiAgcHJldmlld1NlbGVjdG9yRGF0YUZyb21TZWxlY3RvclRyZWU6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICB2YXIgc2VsZWN0b3IgPSAkKGJ1dHRvbikuY2xvc2VzdCgndHInKS5kYXRhKCdzZWxlY3RvcicpXG4gICAgdGhpcy5wcmV2aWV3U2VsZWN0b3JEYXRhKHNpdGVtYXAsIHNlbGVjdG9yLmlkKVxuICB9LFxuICBwcmV2aWV3U2VsZWN0b3JEYXRhRnJvbVNlbGVjdG9yRWRpdGluZzogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcC5jbG9uZSgpXG4gICAgdmFyIHNlbGVjdG9yID0gc2l0ZW1hcC5nZXRTZWxlY3RvckJ5SWQodGhpcy5zdGF0ZS5jdXJyZW50U2VsZWN0b3IuaWQpXG4gICAgdmFyIG5ld1NlbGVjdG9yID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvcigpXG4gICAgc2l0ZW1hcC51cGRhdGVTZWxlY3RvcihzZWxlY3RvciwgbmV3U2VsZWN0b3IpXG4gICAgdGhpcy5wcmV2aWV3U2VsZWN0b3JEYXRhKHNpdGVtYXAsIG5ld1NlbGVjdG9yLmlkKVxuICB9LFxuXHQvKipcblx0ICogUmV0dXJucyBhIGxpc3Qgb2Ygc2VsZWN0b3IgaWRzIHRoYXQgdGhlIHVzZXIgaGFzIG9wZW5lZFxuXHQgKiBAcmV0dXJucyB7QXJyYXl9XG5cdCAqL1xuICBnZXRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHBhcmVudFNlbGVjdG9ySWRzID0gW11cbiAgICB0aGlzLnN0YXRlLmVkaXRTaXRlbWFwQnJlYWRjdW1ic1NlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgcGFyZW50U2VsZWN0b3JJZHMucHVzaChzZWxlY3Rvci5pZClcbiAgICB9KVxuICAgIHJldHVybiBwYXJlbnRTZWxlY3Rvcklkc1xuICB9LFxuICBwcmV2aWV3U2VsZWN0b3JEYXRhOiBmdW5jdGlvbiAoc2l0ZW1hcCwgc2VsZWN0b3JJZCkge1xuXHRcdC8vIGRhdGEgcHJldmlldyB3aWxsIGJlIGJhc2Ugb24gaG93IHRoZSBzZWxlY3RvciB0cmVlIGlzIG9wZW5lZFxuICAgIHZhciBwYXJlbnRTZWxlY3RvcklkcyA9IHRoaXMuZ2V0U3RhdGVQYXJlbnRTZWxlY3RvcklkcygpXG5cbiAgICB2YXIgcmVxdWVzdCA9IHtcbiAgICAgIHByZXZpZXdTZWxlY3RvckRhdGE6IHRydWUsXG4gICAgICBzaXRlbWFwOiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHNpdGVtYXApKSxcbiAgICAgIHBhcmVudFNlbGVjdG9ySWRzOiBwYXJlbnRTZWxlY3RvcklkcyxcbiAgICAgIHNlbGVjdG9ySWQ6IHNlbGVjdG9ySWRcbiAgICB9XG4gICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UocmVxdWVzdCwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICBpZiAocmVzcG9uc2UubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIGRhdGFDb2x1bW5zID0gT2JqZWN0LmtleXMocmVzcG9uc2VbMF0pXG5cbiAgICAgIGNvbnNvbGUubG9nKGRhdGFDb2x1bW5zKVxuXG4gICAgICB2YXIgJGRhdGFQcmV2aWV3UGFuZWwgPSBpY2guRGF0YVByZXZpZXcoe1xuICAgICAgICBjb2x1bW5zOiBkYXRhQ29sdW1uc1xuICAgICAgfSlcbiAgICAgICQoJyN2aWV3cG9ydCcpLmFwcGVuZCgkZGF0YVByZXZpZXdQYW5lbClcbiAgICAgICRkYXRhUHJldmlld1BhbmVsLm1vZGFsKCdzaG93Jylcblx0XHRcdC8vIGRpc3BsYXkgZGF0YVxuXHRcdFx0Ly8gRG9pbmcgdGhpcyB0aGUgbG9uZyB3YXkgc28gdGhlcmUgYXJlbid0IHhzcyB2dWxuZXJ1YmlsaXRlc1xuXHRcdFx0Ly8gd2hpbGUgd29ya2luZyB3aXRoIGRhdGEgb3Igd2l0aCB0aGUgc2VsZWN0b3IgdGl0bGVzXG4gICAgICB2YXIgJHRib2R5ID0gJCgndGJvZHknLCAkZGF0YVByZXZpZXdQYW5lbClcbiAgICAgIHJlc3BvbnNlLmZvckVhY2goZnVuY3Rpb24gKHJvdykge1xuICAgICAgICB2YXIgJHRyID0gJCgnPHRyPjwvdHI+JylcbiAgICAgICAgZGF0YUNvbHVtbnMuZm9yRWFjaChmdW5jdGlvbiAoY29sdW1uKSB7XG4gICAgICAgICAgdmFyICR0ZCA9ICQoJzx0ZD48L3RkPicpXG4gICAgICAgICAgdmFyIGNlbGxEYXRhID0gcm93W2NvbHVtbl1cbiAgICAgICAgICBpZiAodHlwZW9mIGNlbGxEYXRhID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgY2VsbERhdGEgPSBKU09OLnN0cmluZ2lmeShjZWxsRGF0YSlcbiAgICAgICAgICB9XG4gICAgICAgICAgJHRkLnRleHQoY2VsbERhdGEpXG4gICAgICAgICAgJHRyLmFwcGVuZCgkdGQpXG4gICAgICAgIH0pXG4gICAgICAgICR0Ym9keS5hcHBlbmQoJHRyKVxuICAgICAgfSlcblxuICAgICAgdmFyIHdpbmRvd0hlaWdodCA9ICQod2luZG93KS5oZWlnaHQoKVxuXG4gICAgICAkKCcuZGF0YS1wcmV2aWV3LW1vZGFsIC5tb2RhbC1ib2R5JykuaGVpZ2h0KHdpbmRvd0hlaWdodCAtIDEzMClcblxuXHRcdFx0Ly8gcmVtb3ZlIG1vZGFsIGZyb20gZG9tIGFmdGVyIGl0IGlzIGNsb3NlZFxuICAgICAgJGRhdGFQcmV2aWV3UGFuZWwub24oJ2hpZGRlbi5icy5tb2RhbCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJCh0aGlzKS5yZW1vdmUoKVxuICAgICAgfSlcbiAgICB9KVxuICB9LFxuXHQvKipcblx0ICogQWRkIHN0YXJ0IHVybCB0byBzaXRlbWFwIGNyZWF0aW9uIG9yIGVkaXRpbmcgZm9ybVxuXHQgKiBAcGFyYW0gYnV0dG9uXG5cdCAqL1xuICBhZGRTdGFydFVybDogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciAkc3RhcnRVcmxJbnB1dEZpZWxkID0gaWNoLlNpdGVtYXBTdGFydFVybEZpZWxkKClcbiAgICAkKCcjdmlld3BvcnQgLnN0YXJ0LXVybC1ibG9jazpsYXN0JykuYWZ0ZXIoJHN0YXJ0VXJsSW5wdXRGaWVsZClcbiAgICB2YXIgdmFsaWRhdG9yID0gdGhpcy5nZXRGb3JtVmFsaWRhdG9yKClcbiAgICB2YWxpZGF0b3IuYWRkRmllbGQoJHN0YXJ0VXJsSW5wdXRGaWVsZC5maW5kKCdpbnB1dCcpKVxuICB9LFxuXHQvKipcblx0ICogUmVtb3ZlIHN0YXJ0IHVybCBmcm9tIHNpdGVtYXAgY3JlYXRpb24gb3IgZWRpdGluZyBmb3JtLlxuXHQgKiBAcGFyYW0gYnV0dG9uXG5cdCAqL1xuICByZW1vdmVTdGFydFVybDogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciAkYmxvY2sgPSAkKGJ1dHRvbikuY2xvc2VzdCgnLnN0YXJ0LXVybC1ibG9jaycpXG4gICAgaWYgKCQoJyN2aWV3cG9ydCAuc3RhcnQtdXJsLWJsb2NrJykubGVuZ3RoID4gMSkge1xuXHRcdFx0Ly8gcmVtb3ZlIGZyb20gdmFsaWRhdG9yXG4gICAgICB2YXIgdmFsaWRhdG9yID0gdGhpcy5nZXRGb3JtVmFsaWRhdG9yKClcbiAgICAgIHZhbGlkYXRvci5yZW1vdmVGaWVsZCgkYmxvY2suZmluZCgnaW5wdXQnKSlcblxuICAgICAgJGJsb2NrLnJlbW92ZSgpXG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2l0ZW1hcENvbnRyb2xsZXJcbiIsIi8qKlxuICogRWxlbWVudCBzZWxlY3Rvci4gVXNlcyBqUXVlcnkgYXMgYmFzZSBhbmQgYWRkcyBzb21lIG1vcmUgZmVhdHVyZXNcbiAqIEBwYXJhbSBwYXJlbnRFbGVtZW50XG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqL1xudmFyIEVsZW1lbnRRdWVyeSA9IGZ1bmN0aW9uIChDU1NTZWxlY3RvciwgcGFyZW50RWxlbWVudCkge1xuICBDU1NTZWxlY3RvciA9IENTU1NlbGVjdG9yIHx8ICcnXG5cbiAgdmFyIHNlbGVjdGVkRWxlbWVudHMgPSBbXVxuXG4gIHZhciBhZGRFbGVtZW50ID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICBpZiAoc2VsZWN0ZWRFbGVtZW50cy5pbmRleE9mKGVsZW1lbnQpID09PSAtMSkge1xuICAgICAgc2VsZWN0ZWRFbGVtZW50cy5wdXNoKGVsZW1lbnQpXG4gICAgfVxuICB9XG5cbiAgdmFyIHNlbGVjdG9yUGFydHMgPSBFbGVtZW50UXVlcnkuZ2V0U2VsZWN0b3JQYXJ0cyhDU1NTZWxlY3RvcilcbiAgc2VsZWN0b3JQYXJ0cy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuXHRcdC8vIGhhbmRsZSBzcGVjaWFsIGNhc2Ugd2hlbiBwYXJlbnQgaXMgc2VsZWN0ZWRcbiAgICBpZiAoc2VsZWN0b3IgPT09ICdfcGFyZW50XycpIHtcbiAgICAgICQocGFyZW50RWxlbWVudCkuZWFjaChmdW5jdGlvbiAoaSwgZWxlbWVudCkge1xuICAgICAgICBhZGRFbGVtZW50KGVsZW1lbnQpXG4gICAgICB9KVxuICAgIH1cdFx0ZWxzZSB7XG4gICAgICB2YXIgZWxlbWVudHMgPSAkKHNlbGVjdG9yLCAkKHBhcmVudEVsZW1lbnQpKVxuICAgICAgZWxlbWVudHMuZWFjaChmdW5jdGlvbiAoaSwgZWxlbWVudCkge1xuICAgICAgICBhZGRFbGVtZW50KGVsZW1lbnQpXG4gICAgICB9KVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gc2VsZWN0ZWRFbGVtZW50c1xufVxuXG5FbGVtZW50UXVlcnkuZ2V0U2VsZWN0b3JQYXJ0cyA9IGZ1bmN0aW9uIChDU1NTZWxlY3Rvcikge1xuICB2YXIgc2VsZWN0b3JzID0gQ1NTU2VsZWN0b3Iuc3BsaXQoLygsfFwiLio/XCJ8Jy4qPyd8XFwoLio/XFwpKS8pXG5cbiAgdmFyIHJlc3VsdFNlbGVjdG9ycyA9IFtdXG4gIHZhciBjdXJyZW50U2VsZWN0b3IgPSAnJ1xuICBzZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICBpZiAoc2VsZWN0b3IgPT09ICcsJykge1xuICAgICAgaWYgKGN1cnJlbnRTZWxlY3Rvci50cmltKCkubGVuZ3RoKSB7XG4gICAgICAgIHJlc3VsdFNlbGVjdG9ycy5wdXNoKGN1cnJlbnRTZWxlY3Rvci50cmltKCkpXG4gICAgICB9XG4gICAgICBjdXJyZW50U2VsZWN0b3IgPSAnJ1xuICAgIH1cdFx0ZWxzZSB7XG4gICAgICBjdXJyZW50U2VsZWN0b3IgKz0gc2VsZWN0b3JcbiAgICB9XG4gIH0pXG4gIGlmIChjdXJyZW50U2VsZWN0b3IudHJpbSgpLmxlbmd0aCkge1xuICAgIHJlc3VsdFNlbGVjdG9ycy5wdXNoKGN1cnJlbnRTZWxlY3Rvci50cmltKCkpXG4gIH1cblxuICByZXR1cm4gcmVzdWx0U2VsZWN0b3JzXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRWxlbWVudFF1ZXJ5XG4iLCJ2YXIgc2VsZWN0b3JzID0gcmVxdWlyZSgnLi9TZWxlY3RvcnMnKVxudmFyIEVsZW1lbnRRdWVyeSA9IHJlcXVpcmUoJy4vRWxlbWVudFF1ZXJ5JylcbnZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxuXG52YXIgU2VsZWN0b3IgPSBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgdGhpcy51cGRhdGVEYXRhKHNlbGVjdG9yKVxuICB0aGlzLmluaXRUeXBlKClcbn1cblxuU2VsZWN0b3IucHJvdG90eXBlID0ge1xuXG5cdC8qKlxuXHQgKiBJcyB0aGlzIHNlbGVjdG9yIGNvbmZpZ3VyZWQgdG8gcmV0dXJuIG11bHRpcGxlIGl0ZW1zP1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICovXG4gIHdpbGxSZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5jYW5SZXR1cm5NdWx0aXBsZVJlY29yZHMoKSAmJiB0aGlzLm11bHRpcGxlXG4gIH0sXG5cblx0LyoqXG5cdCAqIFVwZGF0ZSBjdXJyZW50IHNlbGVjdG9yIGNvbmZpZ3VyYXRpb25cblx0ICogQHBhcmFtIGRhdGFcblx0ICovXG4gIHVwZGF0ZURhdGE6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdmFyIGFsbG93ZWRLZXlzID0gWydpZCcsICd0eXBlJywgJ3NlbGVjdG9yJywgJ3BhcmVudFNlbGVjdG9ycyddXG4gICAgY29uc29sZS5sb2coJ2RhdGEgdHlwZScsIGRhdGEudHlwZSlcbiAgICBhbGxvd2VkS2V5cyA9IGFsbG93ZWRLZXlzLmNvbmNhdChzZWxlY3RvcnNbZGF0YS50eXBlXS5nZXRGZWF0dXJlcygpKVxuICAgIHZhciBrZXlcblx0XHQvLyB1cGRhdGUgZGF0YVxuICAgIGZvciAoa2V5IGluIGRhdGEpIHtcbiAgICAgIGlmIChhbGxvd2VkS2V5cy5pbmRleE9mKGtleSkgIT09IC0xIHx8IHR5cGVvZiBkYXRhW2tleV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpc1trZXldID0gZGF0YVtrZXldXG4gICAgICB9XG4gICAgfVxuXG5cdFx0Ly8gcmVtb3ZlIHZhbHVlcyB0aGF0IGFyZSBub3QgbmVlZGVkIGZvciB0aGlzIHR5cGUgb2Ygc2VsZWN0b3JcbiAgICBmb3IgKGtleSBpbiB0aGlzKSB7XG4gICAgICBpZiAoYWxsb3dlZEtleXMuaW5kZXhPZihrZXkpID09PSAtMSAmJiB0eXBlb2YgdGhpc1trZXldICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzW2tleV1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cblx0LyoqXG5cdCAqIENTUyBzZWxlY3RvciB3aGljaCB3aWxsIGJlIHVzZWQgZm9yIGVsZW1lbnQgc2VsZWN0aW9uXG5cdCAqIEByZXR1cm5zIHtzdHJpbmd9XG5cdCAqL1xuICBnZXRJdGVtQ1NTU2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gJyonXG4gIH0sXG5cblx0LyoqXG5cdCAqIG92ZXJyaWRlIG9iamVjdHMgbWV0aG9kcyBiYXNlZCBvbiBzZWxldG9yIHR5cGVcblx0ICovXG4gIGluaXRUeXBlOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHNlbGVjdG9yc1t0aGlzLnR5cGVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignU2VsZWN0b3IgdHlwZSBub3QgZGVmaW5lZCAnICsgdGhpcy50eXBlKVxuICAgIH1cblxuXHRcdC8vIG92ZXJyaWRlcyBvYmplY3RzIG1ldGhvZHNcbiAgICBmb3IgKHZhciBpIGluIHNlbGVjdG9yc1t0aGlzLnR5cGVdKSB7XG4gICAgICB0aGlzW2ldID0gc2VsZWN0b3JzW3RoaXMudHlwZV1baV1cbiAgICB9XG4gIH0sXG5cblx0LyoqXG5cdCAqIENoZWNrIHdoZXRoZXIgYSBzZWxlY3RvciBpcyBhIHBhcmVuIHNlbGVjdG9yIG9mIHRoaXMgc2VsZWN0b3Jcblx0ICogQHBhcmFtIHNlbGVjdG9ySWRcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuICBoYXNQYXJlbnRTZWxlY3RvcjogZnVuY3Rpb24gKHNlbGVjdG9ySWQpIHtcbiAgICByZXR1cm4gKHRoaXMucGFyZW50U2VsZWN0b3JzLmluZGV4T2Yoc2VsZWN0b3JJZCkgIT09IC0xKVxuICB9LFxuXG4gIHJlbW92ZVBhcmVudFNlbGVjdG9yOiBmdW5jdGlvbiAoc2VsZWN0b3JJZCkge1xuICAgIHZhciBpbmRleCA9IHRoaXMucGFyZW50U2VsZWN0b3JzLmluZGV4T2Yoc2VsZWN0b3JJZClcbiAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICB0aGlzLnBhcmVudFNlbGVjdG9ycy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgfVxuICB9LFxuXG4gIHJlbmFtZVBhcmVudFNlbGVjdG9yOiBmdW5jdGlvbiAob3JpZ2luYWxJZCwgcmVwbGFjZW1lbnRJZCkge1xuICAgIGlmICh0aGlzLmhhc1BhcmVudFNlbGVjdG9yKG9yaWdpbmFsSWQpKSB7XG4gICAgICB2YXIgcG9zID0gdGhpcy5wYXJlbnRTZWxlY3RvcnMuaW5kZXhPZihvcmlnaW5hbElkKVxuICAgICAgdGhpcy5wYXJlbnRTZWxlY3RvcnMuc3BsaWNlKHBvcywgMSwgcmVwbGFjZW1lbnRJZClcbiAgICB9XG4gIH0sXG5cbiAgZ2V0RGF0YUVsZW1lbnRzOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBlbGVtZW50cyA9IEVsZW1lbnRRdWVyeSh0aGlzLnNlbGVjdG9yLCBwYXJlbnRFbGVtZW50KVxuICAgIGlmICh0aGlzLm11bHRpcGxlKSB7XG4gICAgICByZXR1cm4gZWxlbWVudHNcbiAgICB9IGVsc2UgaWYgKGVsZW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiBbZWxlbWVudHNbMF1dXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBbXVxuICAgIH1cbiAgfSxcblxuICBnZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBkID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgdGltZW91dCA9IHRoaXMuZGVsYXkgfHwgMFxuXG5cdFx0Ly8gdGhpcyB3b3JrcyBtdWNoIGZhc3RlciBiZWNhdXNlIHdoZW5DYWxsU2VxdWVudGFsbHkgaXNuJ3QgcnVubmluZyBuZXh0IGRhdGEgZXh0cmFjdGlvbiBpbW1lZGlhdGVseVxuICAgIGlmICh0aW1lb3V0ID09PSAwKSB7XG4gICAgICB2YXIgZGVmZXJyZWREYXRhID0gdGhpcy5fZ2V0RGF0YShwYXJlbnRFbGVtZW50KVxuICAgICAgZGVmZXJyZWREYXRhLmRvbmUoZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgZC5yZXNvbHZlKGRhdGEpXG4gICAgICB9KVxuICAgIH1cdFx0ZWxzZSB7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRlZmVycmVkRGF0YSA9IHRoaXMuX2dldERhdGEocGFyZW50RWxlbWVudClcbiAgICAgICAgZGVmZXJyZWREYXRhLmRvbmUoZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICBkLnJlc29sdmUoZGF0YSlcbiAgICAgICAgfSlcbiAgICAgIH0uYmluZCh0aGlzKSwgdGltZW91dClcbiAgICB9XG5cbiAgICByZXR1cm4gZC5wcm9taXNlKClcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcblxudmFyIFNlbGVjdG9yRWxlbWVudCA9IHtcblxuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkNyZWF0ZU5ld0pvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuICAgIGRmZC5yZXNvbHZlKGpRdWVyeS5tYWtlQXJyYXkoZWxlbWVudHMpKVxuXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbXVxuICB9LFxuXG4gIGdldEZlYXR1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFsnbXVsdGlwbGUnLCAnZGVsYXknXVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JFbGVtZW50XG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciBTZWxlY3RvckVsZW1lbnRBdHRyaWJ1dGUgPSB7XG4gIGNhblJldHVybk11bHRpcGxlUmVjb3JkczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUNoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZGZkID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICAgIHZhciBlbGVtZW50cyA9IHRoaXMuZ2V0RGF0YUVsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG5cbiAgICB2YXIgcmVzdWx0ID0gW11cbiAgICAkKGVsZW1lbnRzKS5lYWNoKGZ1bmN0aW9uIChrLCBlbGVtZW50KSB7XG4gICAgICB2YXIgZGF0YSA9IHt9XG5cbiAgICAgIGRhdGFbdGhpcy5pZF0gPSAkKGVsZW1lbnQpLmF0dHIodGhpcy5leHRyYWN0QXR0cmlidXRlKVxuICAgICAgcmVzdWx0LnB1c2goZGF0YSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICBpZiAodGhpcy5tdWx0aXBsZSA9PT0gZmFsc2UgJiYgZWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICBkYXRhW3RoaXMuaWQgKyAnLXNyYyddID0gbnVsbFxuICAgICAgcmVzdWx0LnB1c2goZGF0YSlcbiAgICB9XG4gICAgZGZkLnJlc29sdmUocmVzdWx0KVxuXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbdGhpcy5pZF1cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2V4dHJhY3RBdHRyaWJ1dGUnLCAnZGVsYXknXVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JFbGVtZW50QXR0cmlidXRlXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciBVbmlxdWVFbGVtZW50TGlzdCA9IHJlcXVpcmUoJy4vLi4vVW5pcXVlRWxlbWVudExpc3QnKVxudmFyIEVsZW1lbnRRdWVyeSA9IHJlcXVpcmUoJy4vLi4vRWxlbWVudFF1ZXJ5JylcbnZhciBDc3NTZWxlY3RvciA9IHJlcXVpcmUoJ2Nzcy1zZWxlY3RvcicpLkNzc1NlbGVjdG9yXG52YXIgU2VsZWN0b3JFbGVtZW50Q2xpY2sgPSB7XG5cbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgZ2V0Q2xpY2tFbGVtZW50czogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgY2xpY2tFbGVtZW50cyA9IEVsZW1lbnRRdWVyeSh0aGlzLmNsaWNrRWxlbWVudFNlbGVjdG9yLCBwYXJlbnRFbGVtZW50KVxuICAgIHJldHVybiBjbGlja0VsZW1lbnRzXG4gIH0sXG5cblx0LyoqXG5cdCAqIENoZWNrIHdoZXRoZXIgZWxlbWVudCBpcyBzdGlsbCByZWFjaGFibGUgZnJvbSBodG1sLiBVc2VmdWwgdG8gY2hlY2sgd2hldGhlciB0aGUgZWxlbWVudCBpcyByZW1vdmVkIGZyb20gRE9NLlxuXHQgKiBAcGFyYW0gZWxlbWVudFxuXHQgKi9cbiAgaXNFbGVtZW50SW5IVE1MOiBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgIHJldHVybiAkKGVsZW1lbnQpLmNsb3Nlc3QoJ2h0bWwnKS5sZW5ndGggIT09IDBcbiAgfSxcblxuICB0cmlnZ2VyQnV0dG9uQ2xpY2s6IGZ1bmN0aW9uIChjbGlja0VsZW1lbnQpIHtcbiAgICB2YXIgY3MgPSBuZXcgQ3NzU2VsZWN0b3Ioe1xuICAgICAgZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yOiBmYWxzZSxcbiAgICAgIHBhcmVudDogJCgnYm9keScpWzBdLFxuICAgICAgZW5hYmxlUmVzdWx0U3RyaXBwaW5nOiBmYWxzZVxuICAgIH0pXG4gICAgdmFyIGNzc1NlbGVjdG9yID0gY3MuZ2V0Q3NzU2VsZWN0b3IoW2NsaWNrRWxlbWVudF0pXG5cblx0XHQvLyB0aGlzIGZ1bmN0aW9uIHdpbGwgY2F0Y2ggd2luZG93Lm9wZW4gY2FsbCBhbmQgcGxhY2UgdGhlIHJlcXVlc3RlZCB1cmwgYXMgdGhlIGVsZW1lbnRzIGRhdGEgYXR0cmlidXRlXG4gICAgdmFyIHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpXG4gICAgc2NyaXB0LnR5cGUgPSAndGV4dC9qYXZhc2NyaXB0J1xuICAgIHNjcmlwdC50ZXh0ID0gJycgK1xuXHRcdFx0JyhmdW5jdGlvbigpeyAnICtcblx0XHRcdFwidmFyIGVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnXCIgKyBjc3NTZWxlY3RvciArIFwiJylbMF07IFwiICtcblx0XHRcdCdlbC5jbGljaygpOyAnICtcblx0XHRcdCd9KSgpOydcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHNjcmlwdClcbiAgfSxcblxuICBnZXRDbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZTogZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiAndW5pcXVlVGV4dCdcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGVcbiAgICB9XG4gIH0sXG5cbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyIGRlbGF5ID0gcGFyc2VJbnQodGhpcy5kZWxheSkgfHwgMFxuICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgZm91bmRFbGVtZW50cyA9IG5ldyBVbmlxdWVFbGVtZW50TGlzdCgndW5pcXVlVGV4dCcpXG4gICAgdmFyIGNsaWNrRWxlbWVudHMgPSB0aGlzLmdldENsaWNrRWxlbWVudHMocGFyZW50RWxlbWVudClcbiAgICB2YXIgZG9uZUNsaWNraW5nRWxlbWVudHMgPSBuZXcgVW5pcXVlRWxlbWVudExpc3QodGhpcy5nZXRDbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSgpKVxuXG5cdFx0Ly8gYWRkIGVsZW1lbnRzIHRoYXQgYXJlIGF2YWlsYWJsZSBiZWZvcmUgY2xpY2tpbmdcbiAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuICAgIGVsZW1lbnRzLmZvckVhY2goZm91bmRFbGVtZW50cy5wdXNoLmJpbmQoZm91bmRFbGVtZW50cykpXG5cblx0XHQvLyBkaXNjYXJkIGluaXRpYWwgZWxlbWVudHNcbiAgICBpZiAodGhpcy5kaXNjYXJkSW5pdGlhbEVsZW1lbnRzKSB7XG4gICAgICBmb3VuZEVsZW1lbnRzID0gbmV3IFVuaXF1ZUVsZW1lbnRMaXN0KCd1bmlxdWVUZXh0JylcbiAgICB9XG5cblx0XHQvLyBubyBlbGVtZW50cyB0byBjbGljayBhdCB0aGUgYmVnaW5uaW5nXG4gICAgaWYgKGNsaWNrRWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUoZm91bmRFbGVtZW50cylcbiAgICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICAgIH1cblxuXHRcdC8vIGluaXRpYWwgY2xpY2sgYW5kIHdhaXRcbiAgICB2YXIgY3VycmVudENsaWNrRWxlbWVudCA9IGNsaWNrRWxlbWVudHNbMF1cbiAgICB0aGlzLnRyaWdnZXJCdXR0b25DbGljayhjdXJyZW50Q2xpY2tFbGVtZW50KVxuICAgIHZhciBuZXh0RWxlbWVudFNlbGVjdGlvbiA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCkgKyBkZWxheVxuXG5cdFx0Ly8gaW5maW5pdGVseSBzY3JvbGwgZG93biBhbmQgZmluZCBhbGwgaXRlbXNcbiAgICB2YXIgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG5cdFx0XHQvLyBmaW5kIHRob3NlIGNsaWNrIGVsZW1lbnRzIHRoYXQgYXJlIG5vdCBpbiB0aGUgYmxhY2sgbGlzdFxuICAgICAgdmFyIGFsbENsaWNrRWxlbWVudHMgPSB0aGlzLmdldENsaWNrRWxlbWVudHMocGFyZW50RWxlbWVudClcbiAgICAgIGNsaWNrRWxlbWVudHMgPSBbXVxuICAgICAgYWxsQ2xpY2tFbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIGlmICghZG9uZUNsaWNraW5nRWxlbWVudHMuaXNBZGRlZChlbGVtZW50KSkge1xuICAgICAgICAgIGNsaWNrRWxlbWVudHMucHVzaChlbGVtZW50KVxuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICB2YXIgbm93ID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKVxuXHRcdFx0Ly8gc2xlZXAuIHdhaXQgd2hlbiB0byBleHRyYWN0IG5leHQgZWxlbWVudHNcbiAgICAgIGlmIChub3cgPCBuZXh0RWxlbWVudFNlbGVjdGlvbikge1xuXHRcdFx0XHQvLyBjb25zb2xlLmxvZyhcIndhaXRcIik7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG5cdFx0XHQvLyBhZGQgbmV3bHkgZm91bmQgZWxlbWVudHMgdG8gZWxlbWVudCBmb3VuZEVsZW1lbnRzIGFycmF5LlxuICAgICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcbiAgICAgIHZhciBhZGRlZEFuRWxlbWVudCA9IGZhbHNlXG4gICAgICBlbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIHZhciBhZGRlZCA9IGZvdW5kRWxlbWVudHMucHVzaChlbGVtZW50KVxuICAgICAgICBpZiAoYWRkZWQpIHtcbiAgICAgICAgICBhZGRlZEFuRWxlbWVudCA9IHRydWVcbiAgICAgICAgfVxuICAgICAgfSlcblx0XHRcdC8vIGNvbnNvbGUubG9nKFwiYWRkZWRcIiwgYWRkZWRBbkVsZW1lbnQpO1xuXG5cdFx0XHQvLyBubyBuZXcgZWxlbWVudHMgZm91bmQuIFN0b3AgY2xpY2tpbmcgdGhpcyBidXR0b25cbiAgICAgIGlmICghYWRkZWRBbkVsZW1lbnQpIHtcbiAgICAgICAgZG9uZUNsaWNraW5nRWxlbWVudHMucHVzaChjdXJyZW50Q2xpY2tFbGVtZW50KVxuICAgICAgfVxuXG5cdFx0XHQvLyBjb250aW51ZSBjbGlja2luZyBhbmQgYWRkIGRlbGF5LCBidXQgaWYgdGhlcmUgaXMgbm90aGluZ1xuXHRcdFx0Ly8gbW9yZSB0byBjbGljayB0aGUgZmluaXNoXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhcInRvdGFsIGJ1dHRvbnNcIiwgY2xpY2tFbGVtZW50cy5sZW5ndGgpXG4gICAgICBpZiAoY2xpY2tFbGVtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbClcbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKGZvdW5kRWxlbWVudHMpXG4gICAgICB9IGVsc2Uge1xuXHRcdFx0XHQvLyBjb25zb2xlLmxvZyhcImNsaWNrXCIpO1xuICAgICAgICBjdXJyZW50Q2xpY2tFbGVtZW50ID0gY2xpY2tFbGVtZW50c1swXVxuXHRcdFx0XHQvLyBjbGljayBvbiBlbGVtZW50cyBvbmx5IG9uY2UgaWYgdGhlIHR5cGUgaXMgY2xpY2tvbmNlXG4gICAgICAgIGlmICh0aGlzLmNsaWNrVHlwZSA9PT0gJ2NsaWNrT25jZScpIHtcbiAgICAgICAgICBkb25lQ2xpY2tpbmdFbGVtZW50cy5wdXNoKGN1cnJlbnRDbGlja0VsZW1lbnQpXG4gICAgICAgIH1cbiAgICAgICAgdGhpcy50cmlnZ2VyQnV0dG9uQ2xpY2soY3VycmVudENsaWNrRWxlbWVudClcbiAgICAgICAgbmV4dEVsZW1lbnRTZWxlY3Rpb24gPSBub3cgKyBkZWxheVxuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSwgNTApXG5cbiAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZS5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbXVxuICB9LFxuXG4gIGdldEZlYXR1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFsnbXVsdGlwbGUnLCAnZGVsYXknLCAnY2xpY2tFbGVtZW50U2VsZWN0b3InLCAnY2xpY2tUeXBlJywgJ2Rpc2NhcmRJbml0aWFsRWxlbWVudHMnLCAnY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUnXVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JFbGVtZW50Q2xpY2tcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxudmFyIFNlbGVjdG9yRWxlbWVudFNjcm9sbCA9IHtcblxuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkNyZWF0ZU5ld0pvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcbiAgc2Nyb2xsVG9Cb3R0b206IGZ1bmN0aW9uICgpIHtcbiAgICB3aW5kb3cuc2Nyb2xsVG8oMCwgZG9jdW1lbnQuYm9keS5zY3JvbGxIZWlnaHQpXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBkZWxheSA9IHBhcnNlSW50KHRoaXMuZGVsYXkpIHx8IDBcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIGZvdW5kRWxlbWVudHMgPSBbXVxuXG5cdFx0Ly8gaW5pdGlhbGx5IHNjcm9sbCBkb3duIGFuZCB3YWl0XG4gICAgdGhpcy5zY3JvbGxUb0JvdHRvbSgpXG4gICAgdmFyIG5leHRFbGVtZW50U2VsZWN0aW9uID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKSArIGRlbGF5XG5cblx0XHQvLyBpbmZpbml0ZWx5IHNjcm9sbCBkb3duIGFuZCBmaW5kIGFsbCBpdGVtc1xuICAgIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBub3cgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpXG5cdFx0XHQvLyBzbGVlcC4gd2FpdCB3aGVuIHRvIGV4dHJhY3QgbmV4dCBlbGVtZW50c1xuICAgICAgaWYgKG5vdyA8IG5leHRFbGVtZW50U2VsZWN0aW9uKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuXHRcdFx0Ly8gbm8gbmV3IGVsZW1lbnRzIGZvdW5kXG4gICAgICBpZiAoZWxlbWVudHMubGVuZ3RoID09PSBmb3VuZEVsZW1lbnRzLmxlbmd0aCkge1xuICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKVxuICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUoalF1ZXJ5Lm1ha2VBcnJheShlbGVtZW50cykpXG4gICAgICB9IGVsc2Uge1xuXHRcdFx0XHQvLyBjb250aW51ZSBzY3JvbGxpbmcgYW5kIGFkZCBkZWxheVxuICAgICAgICBmb3VuZEVsZW1lbnRzID0gZWxlbWVudHNcbiAgICAgICAgdGhpcy5zY3JvbGxUb0JvdHRvbSgpXG4gICAgICAgIG5leHRFbGVtZW50U2VsZWN0aW9uID0gbm93ICsgZGVsYXlcbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcyksIDUwKVxuXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW11cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2RlbGF5J11cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yRWxlbWVudFNjcm9sbFxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgU2VsZWN0b3JHcm91cCA9IHtcblxuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5IYXZlTG9jYWxDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkNyZWF0ZU5ld0pvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBkZmQgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG5cdFx0Ly8gY2Fubm90IHJldXNlIHRoaXMuZ2V0RGF0YUVsZW1lbnRzIGJlY2F1c2UgaXQgZGVwZW5kcyBvbiAqbXVsdGlwbGUqIHByb3BlcnR5XG4gICAgdmFyIGVsZW1lbnRzID0gJCh0aGlzLnNlbGVjdG9yLCBwYXJlbnRFbGVtZW50KVxuXG4gICAgdmFyIHJlY29yZHMgPSBbXVxuICAgICQoZWxlbWVudHMpLmVhY2goZnVuY3Rpb24gKGssIGVsZW1lbnQpIHtcbiAgICAgIHZhciBkYXRhID0ge31cblxuICAgICAgZGF0YVt0aGlzLmlkXSA9ICQoZWxlbWVudCkudGV4dCgpXG5cbiAgICAgIGlmICh0aGlzLmV4dHJhY3RBdHRyaWJ1dGUpIHtcbiAgICAgICAgZGF0YVt0aGlzLmlkICsgJy0nICsgdGhpcy5leHRyYWN0QXR0cmlidXRlXSA9ICQoZWxlbWVudCkuYXR0cih0aGlzLmV4dHJhY3RBdHRyaWJ1dGUpXG4gICAgICB9XG5cbiAgICAgIHJlY29yZHMucHVzaChkYXRhKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIHZhciByZXN1bHQgPSB7fVxuICAgIHJlc3VsdFt0aGlzLmlkXSA9IHJlY29yZHNcblxuICAgIGRmZC5yZXNvbHZlKFtyZXN1bHRdKVxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW3RoaXMuaWRdXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydkZWxheScsICdleHRyYWN0QXR0cmlidXRlJ11cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yR3JvdXBcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxudmFyIFNlbGVjdG9ySFRNTCA9IHtcblxuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuXG4gICAgdmFyIHJlc3VsdCA9IFtdXG4gICAgJChlbGVtZW50cykuZWFjaChmdW5jdGlvbiAoaywgZWxlbWVudCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuICAgICAgdmFyIGh0bWwgPSAkKGVsZW1lbnQpLmh0bWwoKVxuXG4gICAgICBpZiAodGhpcy5yZWdleCAhPT0gdW5kZWZpbmVkICYmIHRoaXMucmVnZXgubGVuZ3RoKSB7XG4gICAgICAgIHZhciBtYXRjaGVzID0gaHRtbC5tYXRjaChuZXcgUmVnRXhwKHRoaXMucmVnZXgpKVxuICAgICAgICBpZiAobWF0Y2hlcyAhPT0gbnVsbCkge1xuICAgICAgICAgIGh0bWwgPSBtYXRjaGVzWzBdXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaHRtbCA9IG51bGxcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZGF0YVt0aGlzLmlkXSA9IGh0bWxcblxuICAgICAgcmVzdWx0LnB1c2goZGF0YSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICBpZiAodGhpcy5tdWx0aXBsZSA9PT0gZmFsc2UgJiYgZWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICBkYXRhW3RoaXMuaWRdID0gbnVsbFxuICAgICAgcmVzdWx0LnB1c2goZGF0YSlcbiAgICB9XG5cbiAgICBkZmQucmVzb2x2ZShyZXN1bHQpXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbdGhpcy5pZF1cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ3JlZ2V4JywgJ2RlbGF5J11cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9ySFRNTFxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgd2hlbkNhbGxTZXF1ZW50aWFsbHkgPSByZXF1aXJlKCcuLi8uLi9hc3NldHMvanF1ZXJ5LndoZW5jYWxsc2VxdWVudGlhbGx5JylcbnZhciBCYXNlNjQgPSByZXF1aXJlKCcuLi8uLi9hc3NldHMvYmFzZTY0JylcbnZhciBTZWxlY3RvckltYWdlID0ge1xuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuXG4gICAgdmFyIGRlZmVycmVkRGF0YUNhbGxzID0gW11cbiAgICAkKGVsZW1lbnRzKS5lYWNoKGZ1bmN0aW9uIChpLCBlbGVtZW50KSB7XG4gICAgICBkZWZlcnJlZERhdGFDYWxscy5wdXNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRlZmVycmVkRGF0YSA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgICAgICAgdmFyIGRhdGEgPSB7fVxuICAgICAgICBkYXRhW3RoaXMuaWQgKyAnLXNyYyddID0gZWxlbWVudC5zcmNcblxuXHRcdFx0XHQvLyBkb3dubG9hZCBpbWFnZSBpZiByZXF1aXJlZFxuICAgICAgICBpZiAoIXRoaXMuZG93bmxvYWRJbWFnZSkge1xuICAgICAgICAgIGRlZmVycmVkRGF0YS5yZXNvbHZlKGRhdGEpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIGRlZmVycmVkSW1hZ2VCYXNlNjQgPSB0aGlzLmRvd25sb2FkSW1hZ2VCYXNlNjQoZWxlbWVudC5zcmMpXG5cbiAgICAgICAgICBkZWZlcnJlZEltYWdlQmFzZTY0LmRvbmUoZnVuY3Rpb24gKGltYWdlUmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGRhdGFbJ19pbWFnZUJhc2U2NC0nICsgdGhpcy5pZF0gPSBpbWFnZVJlc3BvbnNlLmltYWdlQmFzZTY0XG4gICAgICAgICAgICBkYXRhWydfaW1hZ2VNaW1lVHlwZS0nICsgdGhpcy5pZF0gPSBpbWFnZVJlc3BvbnNlLm1pbWVUeXBlXG5cbiAgICAgICAgICAgIGRlZmVycmVkRGF0YS5yZXNvbHZlKGRhdGEpXG4gICAgICAgICAgfS5iaW5kKHRoaXMpKS5mYWlsKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdC8vIGZhaWxlZCB0byBkb3dubG9hZCBpbWFnZSBjb250aW51ZS5cblx0XHRcdFx0XHRcdC8vIEBUT0RPIGhhbmRsZSBlcnJyb3JcbiAgICAgICAgICAgIGRlZmVycmVkRGF0YS5yZXNvbHZlKGRhdGEpXG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBkZWZlcnJlZERhdGEucHJvbWlzZSgpXG4gICAgICB9LmJpbmQodGhpcykpXG4gICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgd2hlbkNhbGxTZXF1ZW50aWFsbHkoZGVmZXJyZWREYXRhQ2FsbHMpLmRvbmUoZnVuY3Rpb24gKGRhdGFSZXN1bHRzKSB7XG4gICAgICBpZiAodGhpcy5tdWx0aXBsZSA9PT0gZmFsc2UgJiYgZWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHZhciBkYXRhID0ge31cbiAgICAgICAgZGF0YVt0aGlzLmlkICsgJy1zcmMnXSA9IG51bGxcbiAgICAgICAgZGF0YVJlc3VsdHMucHVzaChkYXRhKVxuICAgICAgfVxuXG4gICAgICBkZmQucmVzb2x2ZShkYXRhUmVzdWx0cylcbiAgICB9KVxuXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcbiAgfSxcblxuICBkb3dubG9hZEZpbGVBc0Jsb2I6IGZ1bmN0aW9uICh1cmwpIHtcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG4gICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICh0aGlzLnJlYWR5U3RhdGUgPT0gNCkge1xuICAgICAgICBpZiAodGhpcy5zdGF0dXMgPT0gMjAwKSB7XG4gICAgICAgICAgdmFyIGJsb2IgPSB0aGlzLnJlc3BvbnNlXG4gICAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKGJsb2IpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZWplY3QoeGhyLnN0YXR1c1RleHQpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgeGhyLm9wZW4oJ0dFVCcsIHVybClcbiAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2Jsb2InXG4gICAgeGhyLnNlbmQoKVxuXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gIH0sXG5cbiAgZG93bmxvYWRJbWFnZUJhc2U2NDogZnVuY3Rpb24gKHVybCkge1xuICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgZGVmZXJyZWREb3dubG9hZCA9IHRoaXMuZG93bmxvYWRGaWxlQXNCbG9iKHVybClcbiAgICBkZWZlcnJlZERvd25sb2FkLmRvbmUoZnVuY3Rpb24gKGJsb2IpIHtcbiAgICAgIHZhciBtaW1lVHlwZSA9IGJsb2IudHlwZVxuICAgICAgdmFyIGRlZmVycmVkQmxvYiA9IEJhc2U2NC5ibG9iVG9CYXNlNjQoYmxvYilcbiAgICAgIGRlZmVycmVkQmxvYi5kb25lKGZ1bmN0aW9uIChpbWFnZUJhc2U2NCkge1xuICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUoe1xuICAgICAgICAgIG1pbWVUeXBlOiBtaW1lVHlwZSxcbiAgICAgICAgICBpbWFnZUJhc2U2NDogaW1hZ2VCYXNlNjRcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSkuZmFpbChkZWZlcnJlZFJlc3BvbnNlLmZhaWwpXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW3RoaXMuaWQgKyAnLXNyYyddXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydtdWx0aXBsZScsICdkZWxheScsICdkb3dubG9hZEltYWdlJ11cbiAgfSxcblxuICBnZXRJdGVtQ1NTU2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gJ2ltZydcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9ySW1hZ2VcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxudmFyIHdoZW5DYWxsU2VxdWVudGlhbGx5ID0gcmVxdWlyZSgnLi4vLi4vYXNzZXRzL2pxdWVyeS53aGVuY2FsbHNlcXVlbnRpYWxseScpXG5cbnZhciBTZWxlY3RvckxpbmsgPSB7XG4gIGNhblJldHVybk11bHRpcGxlUmVjb3JkczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUNoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlTG9jYWxDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkNyZWF0ZU5ld0pvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcblxuICAgIHZhciBkZmQgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG5cdFx0Ly8gcmV0dXJuIGVtcHR5IHJlY29yZCBpZiBub3QgbXVsdGlwbGUgdHlwZSBhbmQgbm8gZWxlbWVudHMgZm91bmRcbiAgICBpZiAodGhpcy5tdWx0aXBsZSA9PT0gZmFsc2UgJiYgZWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICBkYXRhW3RoaXMuaWRdID0gbnVsbFxuICAgICAgZGZkLnJlc29sdmUoW2RhdGFdKVxuICAgICAgcmV0dXJuIGRmZFxuICAgIH1cblxuXHRcdC8vIGV4dHJhY3QgbGlua3Mgb25lIGJ5IG9uZVxuICAgIHZhciBkZWZlcnJlZERhdGFFeHRyYWN0aW9uQ2FsbHMgPSBbXVxuICAgICQoZWxlbWVudHMpLmVhY2goZnVuY3Rpb24gKGssIGVsZW1lbnQpIHtcbiAgICAgIGRlZmVycmVkRGF0YUV4dHJhY3Rpb25DYWxscy5wdXNoKGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIHZhciBkZWZlcnJlZERhdGEgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgICAgIHZhciBkYXRhID0ge31cbiAgICAgICAgZGF0YVt0aGlzLmlkXSA9ICQoZWxlbWVudCkudGV4dCgpXG4gICAgICAgIGRhdGEuX2ZvbGxvd1NlbGVjdG9ySWQgPSB0aGlzLmlkXG4gICAgICAgIGRhdGFbdGhpcy5pZCArICctaHJlZiddID0gZWxlbWVudC5ocmVmXG4gICAgICAgIGRhdGEuX2ZvbGxvdyA9IGVsZW1lbnQuaHJlZlxuICAgICAgICBkZWZlcnJlZERhdGEucmVzb2x2ZShkYXRhKVxuXG4gICAgICAgIHJldHVybiBkZWZlcnJlZERhdGFcbiAgICAgIH0uYmluZCh0aGlzLCBlbGVtZW50KSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICB3aGVuQ2FsbFNlcXVlbnRpYWxseShkZWZlcnJlZERhdGFFeHRyYWN0aW9uQ2FsbHMpLmRvbmUoZnVuY3Rpb24gKHJlc3BvbnNlcykge1xuICAgICAgdmFyIHJlc3VsdCA9IFtdXG4gICAgICByZXNwb25zZXMuZm9yRWFjaChmdW5jdGlvbiAoZGF0YVJlc3VsdCkge1xuICAgICAgICByZXN1bHQucHVzaChkYXRhUmVzdWx0KVxuICAgICAgfSlcbiAgICAgIGRmZC5yZXNvbHZlKHJlc3VsdClcbiAgICB9KVxuXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbdGhpcy5pZCwgdGhpcy5pZCArICctaHJlZiddXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydtdWx0aXBsZScsICdkZWxheSddXG4gIH0sXG5cbiAgZ2V0SXRlbUNTU1NlbGVjdG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICdhJ1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JMaW5rXG4iLCJ2YXIgd2hlbkNhbGxTZXF1ZW50aWFsbHkgPSByZXF1aXJlKCcuLi8uLi9hc3NldHMvanF1ZXJ5LndoZW5jYWxsc2VxdWVudGlhbGx5JylcbnZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxudmFyIENzc1NlbGVjdG9yID0gcmVxdWlyZSgnY3NzLXNlbGVjdG9yJykuQ3NzU2VsZWN0b3JcbnZhciBTZWxlY3RvclBvcHVwTGluayA9IHtcbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuXG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cblx0XHQvLyByZXR1cm4gZW1wdHkgcmVjb3JkIGlmIG5vdCBtdWx0aXBsZSB0eXBlIGFuZCBubyBlbGVtZW50cyBmb3VuZFxuICAgIGlmICh0aGlzLm11bHRpcGxlID09PSBmYWxzZSAmJiBlbGVtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHZhciBkYXRhID0ge31cbiAgICAgIGRhdGFbdGhpcy5pZF0gPSBudWxsXG4gICAgICBkZmQucmVzb2x2ZShbZGF0YV0pXG4gICAgICByZXR1cm4gZGZkXG4gICAgfVxuXG5cdFx0Ly8gZXh0cmFjdCBsaW5rcyBvbmUgYnkgb25lXG4gICAgdmFyIGRlZmVycmVkRGF0YUV4dHJhY3Rpb25DYWxscyA9IFtdXG4gICAgJChlbGVtZW50cykuZWFjaChmdW5jdGlvbiAoaywgZWxlbWVudCkge1xuICAgICAgZGVmZXJyZWREYXRhRXh0cmFjdGlvbkNhbGxzLnB1c2goZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgdmFyIGRlZmVycmVkRGF0YSA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgICAgICAgdmFyIGRhdGEgPSB7fVxuICAgICAgICBkYXRhW3RoaXMuaWRdID0gJChlbGVtZW50KS50ZXh0KClcbiAgICAgICAgZGF0YS5fZm9sbG93U2VsZWN0b3JJZCA9IHRoaXMuaWRcblxuICAgICAgICB2YXIgZGVmZXJyZWRQb3B1cFVSTCA9IHRoaXMuZ2V0UG9wdXBVUkwoZWxlbWVudClcbiAgICAgICAgZGVmZXJyZWRQb3B1cFVSTC5kb25lKGZ1bmN0aW9uICh1cmwpIHtcbiAgICAgICAgICBkYXRhW3RoaXMuaWQgKyAnLWhyZWYnXSA9IHVybFxuICAgICAgICAgIGRhdGEuX2ZvbGxvdyA9IHVybFxuICAgICAgICAgIGRlZmVycmVkRGF0YS5yZXNvbHZlKGRhdGEpXG4gICAgICAgIH0uYmluZCh0aGlzKSlcblxuICAgICAgICByZXR1cm4gZGVmZXJyZWREYXRhXG4gICAgICB9LmJpbmQodGhpcywgZWxlbWVudCkpXG4gICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgd2hlbkNhbGxTZXF1ZW50aWFsbHkoZGVmZXJyZWREYXRhRXh0cmFjdGlvbkNhbGxzKS5kb25lKGZ1bmN0aW9uIChyZXNwb25zZXMpIHtcbiAgICAgIHZhciByZXN1bHQgPSBbXVxuICAgICAgcmVzcG9uc2VzLmZvckVhY2goZnVuY3Rpb24gKGRhdGFSZXN1bHQpIHtcbiAgICAgICAgcmVzdWx0LnB1c2goZGF0YVJlc3VsdClcbiAgICAgIH0pXG4gICAgICBkZmQucmVzb2x2ZShyZXN1bHQpXG4gICAgfSlcblxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG4gIH0sXG5cblx0LyoqXG5cdCAqIEdldHMgYW4gdXJsIGZyb20gYSB3aW5kb3cub3BlbiBjYWxsIGJ5IG1vY2tpbmcgdGhlIHdpbmRvdy5vcGVuIGZ1bmN0aW9uXG5cdCAqIEBwYXJhbSBlbGVtZW50XG5cdCAqIEByZXR1cm5zICQuRGVmZXJyZWQoKVxuXHQgKi9cbiAgZ2V0UG9wdXBVUkw6IGZ1bmN0aW9uIChlbGVtZW50KSB7XG5cdFx0Ly8gb3ZlcnJpZGUgd2luZG93Lm9wZW4gZnVuY3Rpb24uIHdlIG5lZWQgdG8gZXhlY3V0ZSB0aGlzIGluIHBhZ2Ugc2NvcGUuXG5cdFx0Ly8gd2UgbmVlZCB0byBrbm93IGhvdyB0byBmaW5kIHRoaXMgZWxlbWVudCBmcm9tIHBhZ2Ugc2NvcGUuXG4gICAgdmFyIGNzID0gbmV3IENzc1NlbGVjdG9yKHtcbiAgICAgIGVuYWJsZVNtYXJ0VGFibGVTZWxlY3RvcjogZmFsc2UsXG4gICAgICBwYXJlbnQ6IGRvY3VtZW50LmJvZHksXG4gICAgICBlbmFibGVSZXN1bHRTdHJpcHBpbmc6IGZhbHNlXG4gICAgfSlcbiAgICB2YXIgY3NzU2VsZWN0b3IgPSBjcy5nZXRDc3NTZWxlY3RvcihbZWxlbWVudF0pXG4gICAgY29uc29sZS5sb2coY3NzU2VsZWN0b3IpXG4gICAgY29uc29sZS5sb2coZG9jdW1lbnQuYm9keS5xdWVyeVNlbGVjdG9yQWxsKGNzc1NlbGVjdG9yKSlcblx0XHQvLyB0aGlzIGZ1bmN0aW9uIHdpbGwgY2F0Y2ggd2luZG93Lm9wZW4gY2FsbCBhbmQgcGxhY2UgdGhlIHJlcXVlc3RlZCB1cmwgYXMgdGhlIGVsZW1lbnRzIGRhdGEgYXR0cmlidXRlXG4gICAgdmFyIHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpXG4gICAgc2NyaXB0LnR5cGUgPSAndGV4dC9qYXZhc2NyaXB0J1xuICAgIGNvbnNvbGUubG9nKGNzc1NlbGVjdG9yKVxuICAgIGNvbnNvbGUubG9nKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoY3NzU2VsZWN0b3IpKVxuICAgIHNjcmlwdC50ZXh0ID0gYFxuXHRcdFx0KGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBvcGVuID0gd2luZG93Lm9wZW47XG4gICAgICAgIHZhciBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJyR7Y3NzU2VsZWN0b3J9JylbMF07XG4gICAgICAgIHZhciBvcGVuTmV3ID0gZnVuY3Rpb24oKSB7IFxuICAgICAgICAgIHZhciB1cmwgPSBhcmd1bWVudHNbMF07IFxuICAgICAgICAgIGVsLmRhdGFzZXQud2ViU2NyYXBlckV4dHJhY3RVcmwgPSB1cmw7IFxuICAgICAgICAgIHdpbmRvdy5vcGVuID0gb3BlbjsgXG4gICAgICAgIH07XG4gICAgICAgIHdpbmRvdy5vcGVuID0gb3Blbk5ldzsgXG4gICAgICAgIGVsLmNsaWNrKCk7IFxuXHRcdFx0fSkoKWBcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHNjcmlwdClcblxuXHRcdC8vIHdhaXQgZm9yIHVybCB0byBiZSBhdmFpbGFibGVcbiAgICB2YXIgZGVmZXJyZWRVUkwgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciB0aW1lb3V0ID0gTWF0aC5hYnMoNTAwMCAvIDMwKSAvLyA1cyB0aW1lb3V0IHRvIGdlbmVyYXRlIGFuIHVybCBmb3IgcG9wdXBcbiAgICB2YXIgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgdXJsID0gJChlbGVtZW50KS5kYXRhKCd3ZWItc2NyYXBlci1leHRyYWN0LXVybCcpXG4gICAgICBpZiAodXJsKSB7XG4gICAgICAgIGRlZmVycmVkVVJMLnJlc29sdmUodXJsKVxuICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKVxuICAgICAgICBzY3JpcHQucmVtb3ZlKClcbiAgICAgIH1cblx0XHRcdC8vIHRpbWVvdXQgcG9wdXAgb3BlbmluZ1xuICAgICAgaWYgKHRpbWVvdXQtLSA8PSAwKSB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpXG4gICAgICAgIHNjcmlwdC5yZW1vdmUoKVxuICAgICAgfVxuICAgIH0sIDMwKVxuXG4gICAgcmV0dXJuIGRlZmVycmVkVVJMLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFt0aGlzLmlkLCB0aGlzLmlkICsgJy1ocmVmJ11cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2RlbGF5J11cbiAgfSxcblxuICBnZXRJdGVtQ1NTU2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gJyonXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvclBvcHVwTGlua1xuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG5cbnZhciBTZWxlY3RvclRhYmxlID0ge1xuXG4gIGNhblJldHVybk11bHRpcGxlUmVjb3JkczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUNoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICBnZXRUYWJsZUhlYWRlckNvbHVtbnM6IGZ1bmN0aW9uICgkdGFibGUpIHtcbiAgICB2YXIgY29sdW1ucyA9IHt9XG4gICAgdmFyIGhlYWRlclJvd1NlbGVjdG9yID0gdGhpcy5nZXRUYWJsZUhlYWRlclJvd1NlbGVjdG9yKClcbiAgICB2YXIgJGhlYWRlclJvdyA9ICQoJHRhYmxlKS5maW5kKGhlYWRlclJvd1NlbGVjdG9yKVxuICAgIGlmICgkaGVhZGVyUm93Lmxlbmd0aCA+IDApIHtcbiAgICAgICRoZWFkZXJSb3cuZmluZCgndGQsdGgnKS5lYWNoKGZ1bmN0aW9uIChpKSB7XG4gICAgICAgIHZhciBoZWFkZXIgPSAkKHRoaXMpLnRleHQoKS50cmltKClcbiAgICAgICAgY29sdW1uc1toZWFkZXJdID0ge1xuICAgICAgICAgIGluZGV4OiBpICsgMVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgICByZXR1cm4gY29sdW1uc1xuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZGZkID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICAgIHZhciB0YWJsZXMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuXG4gICAgdmFyIHJlc3VsdCA9IFtdXG4gICAgJCh0YWJsZXMpLmVhY2goZnVuY3Rpb24gKGssIHRhYmxlKSB7XG4gICAgICB2YXIgY29sdW1ucyA9IHRoaXMuZ2V0VGFibGVIZWFkZXJDb2x1bW5zKCQodGFibGUpKVxuXG4gICAgICB2YXIgZGF0YVJvd1NlbGVjdG9yID0gdGhpcy5nZXRUYWJsZURhdGFSb3dTZWxlY3RvcigpXG4gICAgICAkKHRhYmxlKS5maW5kKGRhdGFSb3dTZWxlY3RvcikuZWFjaChmdW5jdGlvbiAoaSwgcm93KSB7XG4gICAgICAgIHZhciBkYXRhID0ge31cbiAgICAgICAgdGhpcy5jb2x1bW5zLmZvckVhY2goZnVuY3Rpb24gKGNvbHVtbikge1xuICAgICAgICAgIGlmIChjb2x1bW4uZXh0cmFjdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgaWYgKGNvbHVtbnNbY29sdW1uLmhlYWRlcl0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICBkYXRhW2NvbHVtbi5uYW1lXSA9IG51bGxcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHZhciByb3dUZXh0ID0gJChyb3cpLmZpbmQoJz46bnRoLWNoaWxkKCcgKyBjb2x1bW5zW2NvbHVtbi5oZWFkZXJdLmluZGV4ICsgJyknKS50ZXh0KCkudHJpbSgpXG4gICAgICAgICAgICAgIGRhdGFbY29sdW1uLm5hbWVdID0gcm93VGV4dFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgcmVzdWx0LnB1c2goZGF0YSlcbiAgICAgIH0uYmluZCh0aGlzKSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICBkZmQucmVzb2x2ZShyZXN1bHQpXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHZhciBkYXRhQ29sdW1ucyA9IFtdXG4gICAgdGhpcy5jb2x1bW5zLmZvckVhY2goZnVuY3Rpb24gKGNvbHVtbikge1xuICAgICAgaWYgKGNvbHVtbi5leHRyYWN0ID09PSB0cnVlKSB7XG4gICAgICAgIGRhdGFDb2x1bW5zLnB1c2goY29sdW1uLm5hbWUpXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gZGF0YUNvbHVtbnNcbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2NvbHVtbnMnLCAnZGVsYXknLCAndGFibGVEYXRhUm93U2VsZWN0b3InLCAndGFibGVIZWFkZXJSb3dTZWxlY3RvciddXG4gIH0sXG5cbiAgZ2V0SXRlbUNTU1NlbGVjdG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICd0YWJsZSdcbiAgfSxcblxuICBnZXRUYWJsZUhlYWRlclJvd1NlbGVjdG9yRnJvbVRhYmxlSFRNTDogZnVuY3Rpb24gKGh0bWwpIHtcbiAgICB2YXIgJHRhYmxlID0gJChodG1sKVxuICAgIGlmICgkdGFibGUuZmluZCgndGhlYWQgdHI6aGFzKHRkOm5vdCg6ZW1wdHkpKSwgdGhlYWQgdHI6aGFzKHRoOm5vdCg6ZW1wdHkpKScpLmxlbmd0aCkge1xuICAgICAgaWYgKCR0YWJsZS5maW5kKCd0aGVhZCB0cicpLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gJ3RoZWFkIHRyJ1xuICAgICAgfVx0XHRcdGVsc2Uge1xuICAgICAgICB2YXIgJHJvd3MgPSAkdGFibGUuZmluZCgndGhlYWQgdHInKVxuXHRcdFx0XHQvLyBmaXJzdCByb3cgd2l0aCBkYXRhXG4gICAgICAgIHZhciByb3dJbmRleCA9ICRyb3dzLmluZGV4KCRyb3dzLmZpbHRlcignOmhhcyh0ZDpub3QoOmVtcHR5KSksOmhhcyh0aDpub3QoOmVtcHR5KSknKVswXSlcbiAgICAgICAgcmV0dXJuICd0aGVhZCB0cjpudGgtb2YtdHlwZSgnICsgKHJvd0luZGV4ICsgMSkgKyAnKSdcbiAgICAgIH1cbiAgICB9XHRcdGVsc2UgaWYgKCR0YWJsZS5maW5kKCd0ciB0ZDpub3QoOmVtcHR5KSwgdHIgdGg6bm90KDplbXB0eSknKS5sZW5ndGgpIHtcbiAgICAgIHZhciAkcm93cyA9ICR0YWJsZS5maW5kKCd0cicpXG5cdFx0XHQvLyBmaXJzdCByb3cgd2l0aCBkYXRhXG4gICAgICB2YXIgcm93SW5kZXggPSAkcm93cy5pbmRleCgkcm93cy5maWx0ZXIoJzpoYXModGQ6bm90KDplbXB0eSkpLDpoYXModGg6bm90KDplbXB0eSkpJylbMF0pXG4gICAgICByZXR1cm4gJ3RyOm50aC1vZi10eXBlKCcgKyAocm93SW5kZXggKyAxKSArICcpJ1xuICAgIH1cdFx0ZWxzZSB7XG4gICAgICByZXR1cm4gJydcbiAgICB9XG4gIH0sXG5cbiAgZ2V0VGFibGVEYXRhUm93U2VsZWN0b3JGcm9tVGFibGVIVE1MOiBmdW5jdGlvbiAoaHRtbCkge1xuICAgIHZhciAkdGFibGUgPSAkKGh0bWwpXG4gICAgaWYgKCR0YWJsZS5maW5kKCd0aGVhZCB0cjpoYXModGQ6bm90KDplbXB0eSkpLCB0aGVhZCB0cjpoYXModGg6bm90KDplbXB0eSkpJykubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gJ3Rib2R5IHRyJ1xuICAgIH1cdFx0ZWxzZSBpZiAoJHRhYmxlLmZpbmQoJ3RyIHRkOm5vdCg6ZW1wdHkpLCB0ciB0aDpub3QoOmVtcHR5KScpLmxlbmd0aCkge1xuICAgICAgdmFyICRyb3dzID0gJHRhYmxlLmZpbmQoJ3RyJylcblx0XHRcdC8vIGZpcnN0IHJvdyB3aXRoIGRhdGFcbiAgICAgIHZhciByb3dJbmRleCA9ICRyb3dzLmluZGV4KCRyb3dzLmZpbHRlcignOmhhcyh0ZDpub3QoOmVtcHR5KSksOmhhcyh0aDpub3QoOmVtcHR5KSknKVswXSlcbiAgICAgIHJldHVybiAndHI6bnRoLW9mLXR5cGUobisnICsgKHJvd0luZGV4ICsgMikgKyAnKSdcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgcmV0dXJuICcnXG4gICAgfVxuICB9LFxuXG4gIGdldFRhYmxlSGVhZGVyUm93U2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcblx0XHQvLyBoYW5kbGUgbGVnYWN5IHNlbGVjdG9yc1xuICAgIGlmICh0aGlzLnRhYmxlSGVhZGVyUm93U2VsZWN0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuICd0aGVhZCB0cidcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMudGFibGVIZWFkZXJSb3dTZWxlY3RvclxuICAgIH1cbiAgfSxcblxuICBnZXRUYWJsZURhdGFSb3dTZWxlY3RvcjogZnVuY3Rpb24gKCkge1xuXHRcdC8vIGhhbmRsZSBsZWdhY3kgc2VsZWN0b3JzXG4gICAgaWYgKHRoaXMudGFibGVEYXRhUm93U2VsZWN0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuICd0Ym9keSB0cidcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMudGFibGVEYXRhUm93U2VsZWN0b3JcbiAgICB9XG4gIH0sXG5cblx0LyoqXG5cdCAqIEV4dHJhY3QgdGFibGUgaGVhZGVyIGNvbHVtbiBpbmZvIGZyb20gaHRtbFxuXHQgKiBAcGFyYW0gaHRtbFxuXHQgKi9cbiAgZ2V0VGFibGVIZWFkZXJDb2x1bW5zRnJvbUhUTUw6IGZ1bmN0aW9uIChoZWFkZXJSb3dTZWxlY3RvciwgaHRtbCkge1xuICAgIHZhciAkdGFibGUgPSAkKGh0bWwpXG4gICAgdmFyICRoZWFkZXJSb3dDb2x1bW5zID0gJHRhYmxlLmZpbmQoaGVhZGVyUm93U2VsZWN0b3IpLmZpbmQoJ3RkLHRoJylcblxuICAgIHZhciBjb2x1bW5zID0gW11cblxuICAgICRoZWFkZXJSb3dDb2x1bW5zLmVhY2goZnVuY3Rpb24gKGksIGNvbHVtbkVsKSB7XG4gICAgICB2YXIgaGVhZGVyID0gJChjb2x1bW5FbCkudGV4dCgpLnRyaW0oKVxuICAgICAgdmFyIG5hbWUgPSBoZWFkZXJcbiAgICAgIGlmIChoZWFkZXIubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgIGNvbHVtbnMucHVzaCh7XG4gICAgICAgICAgaGVhZGVyOiBoZWFkZXIsXG4gICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICBleHRyYWN0OiB0cnVlXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gY29sdW1uc1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JUYWJsZVxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgU2VsZWN0b3JUZXh0ID0ge1xuXG4gIGNhblJldHVybk11bHRpcGxlUmVjb3JkczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUNoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZGZkID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICAgIHZhciBlbGVtZW50cyA9IHRoaXMuZ2V0RGF0YUVsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG5cbiAgICB2YXIgcmVzdWx0ID0gW11cbiAgICAkKGVsZW1lbnRzKS5lYWNoKGZ1bmN0aW9uIChrLCBlbGVtZW50KSB7XG4gICAgICB2YXIgZGF0YSA9IHt9XG5cblx0XHRcdC8vIHJlbW92ZSBzY3JpcHQsIHN0eWxlIHRhZyBjb250ZW50cyBmcm9tIHRleHQgcmVzdWx0c1xuICAgICAgdmFyICRlbGVtZW50X2Nsb25lID0gJChlbGVtZW50KS5jbG9uZSgpXG4gICAgICAkZWxlbWVudF9jbG9uZS5maW5kKCdzY3JpcHQsIHN0eWxlJykucmVtb3ZlKClcblx0XHRcdC8vIDxicj4gcmVwbGFjZSBiciB0YWdzIHdpdGggbmV3bGluZXNcbiAgICAgICRlbGVtZW50X2Nsb25lLmZpbmQoJ2JyJykuYWZ0ZXIoJ1xcbicpXG5cbiAgICAgIHZhciB0ZXh0ID0gJGVsZW1lbnRfY2xvbmUudGV4dCgpXG4gICAgICBpZiAodGhpcy5yZWdleCAhPT0gdW5kZWZpbmVkICYmIHRoaXMucmVnZXgubGVuZ3RoKSB7XG4gICAgICAgIHZhciBtYXRjaGVzID0gdGV4dC5tYXRjaChuZXcgUmVnRXhwKHRoaXMucmVnZXgpKVxuICAgICAgICBpZiAobWF0Y2hlcyAhPT0gbnVsbCkge1xuICAgICAgICAgIHRleHQgPSBtYXRjaGVzWzBdXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGV4dCA9IG51bGxcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZGF0YVt0aGlzLmlkXSA9IHRleHRcblxuICAgICAgcmVzdWx0LnB1c2goZGF0YSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICBpZiAodGhpcy5tdWx0aXBsZSA9PT0gZmFsc2UgJiYgZWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICBkYXRhW3RoaXMuaWRdID0gbnVsbFxuICAgICAgcmVzdWx0LnB1c2goZGF0YSlcbiAgICB9XG5cbiAgICBkZmQucmVzb2x2ZShyZXN1bHQpXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbdGhpcy5pZF1cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ3JlZ2V4JywgJ2RlbGF5J11cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yVGV4dFxuIiwidmFyIFNlbGVjdG9yID0gcmVxdWlyZSgnLi9TZWxlY3RvcicpXG5cbnZhciBTZWxlY3Rvckxpc3QgPSBmdW5jdGlvbiAoc2VsZWN0b3JzKSB7XG4gIGlmIChzZWxlY3RvcnMgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVyblxuICB9XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWxlY3RvcnMubGVuZ3RoOyBpKyspIHtcbiAgICB0aGlzLnB1c2goc2VsZWN0b3JzW2ldKVxuICB9XG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUgPSBuZXcgQXJyYXkoKVxuXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgaWYgKCF0aGlzLmhhc1NlbGVjdG9yKHNlbGVjdG9yLmlkKSkge1xuICAgIGlmICghKHNlbGVjdG9yIGluc3RhbmNlb2YgU2VsZWN0b3IpKSB7XG4gICAgICBzZWxlY3RvciA9IG5ldyBTZWxlY3RvcihzZWxlY3RvcilcbiAgICB9XG4gICAgQXJyYXkucHJvdG90eXBlLnB1c2guY2FsbCh0aGlzLCBzZWxlY3RvcilcbiAgfVxufVxuXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmhhc1NlbGVjdG9yID0gZnVuY3Rpb24gKHNlbGVjdG9ySWQpIHtcbiAgaWYgKHNlbGVjdG9ySWQgaW5zdGFuY2VvZiBPYmplY3QpIHtcbiAgICBzZWxlY3RvcklkID0gc2VsZWN0b3JJZC5pZFxuICB9XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHRoaXNbaV0uaWQgPT09IHNlbGVjdG9ySWQpIHtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZVxufVxuXG4vKipcbiAqIFJldHVybnMgYWxsIHNlbGVjdG9ycyBvciByZWN1cnNpdmVseSBmaW5kIGFuZCByZXR1cm4gYWxsIGNoaWxkIHNlbGVjdG9ycyBvZiBhIHBhcmVudCBzZWxlY3Rvci5cbiAqIEBwYXJhbSBwYXJlbnRTZWxlY3RvcklkXG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZ2V0QWxsU2VsZWN0b3JzID0gZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9ySWQpIHtcbiAgaWYgKHBhcmVudFNlbGVjdG9ySWQgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICB2YXIgZ2V0QWxsQ2hpbGRTZWxlY3RvcnMgPSBmdW5jdGlvbiAocGFyZW50U2VsZWN0b3JJZCwgcmVzdWx0U2VsZWN0b3JzKSB7XG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgaWYgKHNlbGVjdG9yLmhhc1BhcmVudFNlbGVjdG9yKHBhcmVudFNlbGVjdG9ySWQpKSB7XG4gICAgICAgIGlmIChyZXN1bHRTZWxlY3RvcnMuaW5kZXhPZihzZWxlY3RvcikgPT09IC0xKSB7XG4gICAgICAgICAgcmVzdWx0U2VsZWN0b3JzLnB1c2goc2VsZWN0b3IpXG4gICAgICAgICAgZ2V0QWxsQ2hpbGRTZWxlY3RvcnMoc2VsZWN0b3IuaWQsIHJlc3VsdFNlbGVjdG9ycylcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIH0uYmluZCh0aGlzKVxuXG4gIHZhciByZXN1bHRTZWxlY3RvcnMgPSBbXVxuICBnZXRBbGxDaGlsZFNlbGVjdG9ycyhwYXJlbnRTZWxlY3RvcklkLCByZXN1bHRTZWxlY3RvcnMpXG4gIHJldHVybiByZXN1bHRTZWxlY3RvcnNcbn1cblxuLyoqXG4gKiBSZXR1cm5zIG9ubHkgc2VsZWN0b3JzIHRoYXQgYXJlIGRpcmVjdGx5IHVuZGVyIGEgcGFyZW50XG4gKiBAcGFyYW0gcGFyZW50U2VsZWN0b3JJZFxuICogQHJldHVybnMge0FycmF5fVxuICovXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmdldERpcmVjdENoaWxkU2VsZWN0b3JzID0gZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9ySWQpIHtcbiAgdmFyIHJlc3VsdFNlbGVjdG9ycyA9IG5ldyBTZWxlY3Rvckxpc3QoKVxuICB0aGlzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgaWYgKHNlbGVjdG9yLmhhc1BhcmVudFNlbGVjdG9yKHBhcmVudFNlbGVjdG9ySWQpKSB7XG4gICAgICByZXN1bHRTZWxlY3RvcnMucHVzaChzZWxlY3RvcilcbiAgICB9XG4gIH0pXG4gIHJldHVybiByZXN1bHRTZWxlY3RvcnNcbn1cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHJlc3VsdExpc3QgPSBuZXcgU2VsZWN0b3JMaXN0KClcbiAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgIHJlc3VsdExpc3QucHVzaChzZWxlY3RvcilcbiAgfSlcbiAgcmV0dXJuIHJlc3VsdExpc3Rcbn1cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5mdWxsQ2xvbmUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciByZXN1bHRMaXN0ID0gbmV3IFNlbGVjdG9yTGlzdCgpXG4gIHRoaXMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICByZXN1bHRMaXN0LnB1c2goSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzZWxlY3RvcikpKVxuICB9KVxuICByZXR1cm4gcmVzdWx0TGlzdFxufVxuXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmNvbmNhdCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHJlc3VsdExpc3QgPSB0aGlzLmNsb25lKClcbiAgZm9yICh2YXIgaSBpbiBhcmd1bWVudHMpIHtcbiAgICBhcmd1bWVudHNbaV0uZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgIHJlc3VsdExpc3QucHVzaChzZWxlY3RvcilcbiAgICB9KVxuICB9XG4gIHJldHVybiByZXN1bHRMaXN0XG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZ2V0U2VsZWN0b3IgPSBmdW5jdGlvbiAoc2VsZWN0b3JJZCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgc2VsZWN0b3IgPSB0aGlzW2ldXG4gICAgaWYgKHNlbGVjdG9yLmlkID09PSBzZWxlY3RvcklkKSB7XG4gICAgICByZXR1cm4gc2VsZWN0b3JcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFsbCBzZWxlY3RvcnMgaWYgdGhpcyBzZWxlY3RvcnMgaW5jbHVkaW5nIGFsbCBwYXJlbnQgc2VsZWN0b3JzIHdpdGhpbiB0aGlzIHBhZ2VcbiAqIEBUT0RPIG5vdCB1c2VkIGFueSBtb3JlLlxuICogQHBhcmFtIHNlbGVjdG9ySWRcbiAqIEByZXR1cm5zIHsqfVxuICovXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmdldE9uZVBhZ2VTZWxlY3RvcnMgPSBmdW5jdGlvbiAoc2VsZWN0b3JJZCkge1xuICB2YXIgcmVzdWx0TGlzdCA9IG5ldyBTZWxlY3Rvckxpc3QoKVxuICB2YXIgc2VsZWN0b3IgPSB0aGlzLmdldFNlbGVjdG9yKHNlbGVjdG9ySWQpXG4gIHJlc3VsdExpc3QucHVzaCh0aGlzLmdldFNlbGVjdG9yKHNlbGVjdG9ySWQpKVxuXG5cdC8vIHJlY3Vyc2l2ZWx5IGZpbmQgYWxsIHBhcmVudCBzZWxlY3RvcnMgdGhhdCBjb3VsZCBsZWFkIHRvIHRoZSBwYWdlIHdoZXJlIHNlbGVjdG9ySWQgaXMgdXNlZC5cbiAgdmFyIGZpbmRQYXJlbnRTZWxlY3RvcnMgPSBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICBzZWxlY3Rvci5wYXJlbnRTZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAocGFyZW50U2VsZWN0b3JJZCkge1xuICAgICAgaWYgKHBhcmVudFNlbGVjdG9ySWQgPT09ICdfcm9vdCcpIHJldHVyblxuICAgICAgdmFyIHBhcmVudFNlbGVjdG9yID0gdGhpcy5nZXRTZWxlY3RvcihwYXJlbnRTZWxlY3RvcklkKVxuICAgICAgaWYgKHJlc3VsdExpc3QuaW5kZXhPZihwYXJlbnRTZWxlY3RvcikgIT09IC0xKSByZXR1cm5cbiAgICAgIGlmIChwYXJlbnRTZWxlY3Rvci53aWxsUmV0dXJuRWxlbWVudHMoKSkge1xuICAgICAgICByZXN1bHRMaXN0LnB1c2gocGFyZW50U2VsZWN0b3IpXG4gICAgICAgIGZpbmRQYXJlbnRTZWxlY3RvcnMocGFyZW50U2VsZWN0b3IpXG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LmJpbmQodGhpcylcblxuICBmaW5kUGFyZW50U2VsZWN0b3JzKHNlbGVjdG9yKVxuXG5cdC8vIGFkZCBhbGwgY2hpbGQgc2VsZWN0b3JzXG4gIHJlc3VsdExpc3QgPSByZXN1bHRMaXN0LmNvbmNhdCh0aGlzLmdldFNpbmdsZVBhZ2VBbGxDaGlsZFNlbGVjdG9ycyhzZWxlY3Rvci5pZCkpXG4gIHJldHVybiByZXN1bHRMaXN0XG59XG5cbi8qKlxuICogUmV0dXJucyBhbGwgY2hpbGQgc2VsZWN0b3JzIG9mIGEgc2VsZWN0b3Igd2hpY2ggY2FuIGJlIHVzZWQgd2l0aGluIG9uZSBwYWdlLlxuICogQHBhcmFtIHBhcmVudFNlbGVjdG9ySWRcbiAqL1xuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5nZXRTaW5nbGVQYWdlQWxsQ2hpbGRTZWxlY3RvcnMgPSBmdW5jdGlvbiAocGFyZW50U2VsZWN0b3JJZCkge1xuICB2YXIgcmVzdWx0TGlzdCA9IG5ldyBTZWxlY3Rvckxpc3QoKVxuICB2YXIgYWRkQ2hpbGRTZWxlY3RvcnMgPSBmdW5jdGlvbiAocGFyZW50U2VsZWN0b3IpIHtcbiAgICBpZiAocGFyZW50U2VsZWN0b3Iud2lsbFJldHVybkVsZW1lbnRzKCkpIHtcbiAgICAgIHZhciBjaGlsZFNlbGVjdG9ycyA9IHRoaXMuZ2V0RGlyZWN0Q2hpbGRTZWxlY3RvcnMocGFyZW50U2VsZWN0b3IuaWQpXG4gICAgICBjaGlsZFNlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChjaGlsZFNlbGVjdG9yKSB7XG4gICAgICAgIGlmIChyZXN1bHRMaXN0LmluZGV4T2YoY2hpbGRTZWxlY3RvcikgPT09IC0xKSB7XG4gICAgICAgICAgcmVzdWx0TGlzdC5wdXNoKGNoaWxkU2VsZWN0b3IpXG4gICAgICAgICAgYWRkQ2hpbGRTZWxlY3RvcnMoY2hpbGRTZWxlY3RvcilcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG4gIH0uYmluZCh0aGlzKVxuXG4gIHZhciBwYXJlbnRTZWxlY3RvciA9IHRoaXMuZ2V0U2VsZWN0b3IocGFyZW50U2VsZWN0b3JJZClcbiAgYWRkQ2hpbGRTZWxlY3RvcnMocGFyZW50U2VsZWN0b3IpXG4gIHJldHVybiByZXN1bHRMaXN0XG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUud2lsbFJldHVybk11bHRpcGxlUmVjb3JkcyA9IGZ1bmN0aW9uIChzZWxlY3RvcklkKSB7XG5cdC8vIGhhbmRsZSByZXVxZXN0ZWQgc2VsZWN0b3JcbiAgdmFyIHNlbGVjdG9yID0gdGhpcy5nZXRTZWxlY3RvcihzZWxlY3RvcklkKVxuICBpZiAoc2VsZWN0b3Iud2lsbFJldHVybk11bHRpcGxlUmVjb3JkcygpID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuXG5cdC8vIGhhbmRsZSBhbGwgaXRzIGNoaWxkIHNlbGVjdG9yc1xuICB2YXIgY2hpbGRTZWxlY3RvcnMgPSB0aGlzLmdldEFsbFNlbGVjdG9ycyhzZWxlY3RvcklkKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkU2VsZWN0b3JzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHNlbGVjdG9yID0gY2hpbGRTZWxlY3RvcnNbaV1cbiAgICBpZiAoc2VsZWN0b3Iud2lsbFJldHVybk11bHRpcGxlUmVjb3JkcygpID09PSB0cnVlKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmYWxzZVxufVxuXG4vKipcbiAqIFdoZW4gc2VyaWFsaXppbmcgdG8gSlNPTiBjb252ZXJ0IHRvIGFuIGFycmF5XG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gKCkge1xuICB2YXIgcmVzdWx0ID0gW11cbiAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgIHJlc3VsdC5wdXNoKHNlbGVjdG9yKVxuICB9KVxuICByZXR1cm4gcmVzdWx0XG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZ2V0U2VsZWN0b3JCeUlkID0gZnVuY3Rpb24gKHNlbGVjdG9ySWQpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHNlbGVjdG9yID0gdGhpc1tpXVxuICAgIGlmIChzZWxlY3Rvci5pZCA9PT0gc2VsZWN0b3JJZCkge1xuICAgICAgcmV0dXJuIHNlbGVjdG9yXG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogcmV0dXJucyBjc3Mgc2VsZWN0b3IgZm9yIGEgZ2l2ZW4gZWxlbWVudC4gY3NzIHNlbGVjdG9yIGluY2x1ZGVzIGFsbCBwYXJlbnQgZWxlbWVudCBzZWxlY3RvcnNcbiAqIEBwYXJhbSBzZWxlY3RvcklkXG4gKiBAcGFyYW0gcGFyZW50U2VsZWN0b3JJZHMgYXJyYXkgb2YgcGFyZW50IHNlbGVjdG9yIGlkcyBmcm9tIGRldnRvb2xzIEJyZWFkY3VtYlxuICogQHJldHVybnMgc3RyaW5nXG4gKi9cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZ2V0Q1NTU2VsZWN0b3JXaXRoaW5PbmVQYWdlID0gZnVuY3Rpb24gKHNlbGVjdG9ySWQsIHBhcmVudFNlbGVjdG9ySWRzKSB7XG4gIHZhciBDU1NTZWxlY3RvciA9IHRoaXMuZ2V0U2VsZWN0b3Ioc2VsZWN0b3JJZCkuc2VsZWN0b3JcbiAgdmFyIHBhcmVudENTU1NlbGVjdG9yID0gdGhpcy5nZXRQYXJlbnRDU1NTZWxlY3RvcldpdGhpbk9uZVBhZ2UocGFyZW50U2VsZWN0b3JJZHMpXG4gIENTU1NlbGVjdG9yID0gcGFyZW50Q1NTU2VsZWN0b3IgKyBDU1NTZWxlY3RvclxuXG4gIHJldHVybiBDU1NTZWxlY3RvclxufVxuXG4vKipcbiAqIHJldHVybnMgY3NzIHNlbGVjdG9yIGZvciBwYXJlbnQgc2VsZWN0b3JzIHRoYXQgYXJlIHdpdGhpbiBvbmUgcGFnZVxuICogQHBhcmFtIHBhcmVudFNlbGVjdG9ySWRzIGFycmF5IG9mIHBhcmVudCBzZWxlY3RvciBpZHMgZnJvbSBkZXZ0b29scyBCcmVhZGN1bWJcbiAqIEByZXR1cm5zIHN0cmluZ1xuICovXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmdldFBhcmVudENTU1NlbGVjdG9yV2l0aGluT25lUGFnZSA9IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3Rvcklkcykge1xuICB2YXIgQ1NTU2VsZWN0b3IgPSAnJ1xuXG4gIGZvciAodmFyIGkgPSBwYXJlbnRTZWxlY3Rvcklkcy5sZW5ndGggLSAxOyBpID4gMDsgaS0tKSB7XG4gICAgdmFyIHBhcmVudFNlbGVjdG9ySWQgPSBwYXJlbnRTZWxlY3Rvcklkc1tpXVxuICAgIHZhciBwYXJlbnRTZWxlY3RvciA9IHRoaXMuZ2V0U2VsZWN0b3IocGFyZW50U2VsZWN0b3JJZClcbiAgICBpZiAocGFyZW50U2VsZWN0b3Iud2lsbFJldHVybkVsZW1lbnRzKCkpIHtcbiAgICAgIENTU1NlbGVjdG9yID0gcGFyZW50U2VsZWN0b3Iuc2VsZWN0b3IgKyAnICcgKyBDU1NTZWxlY3RvclxuICAgIH0gZWxzZSB7XG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBDU1NTZWxlY3RvclxufVxuXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmhhc1JlY3Vyc2l2ZUVsZW1lbnRTZWxlY3RvcnMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBSZWN1cnNpb25Gb3VuZCA9IGZhbHNlXG5cbiAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uICh0b3BTZWxlY3Rvcikge1xuICAgIHZhciB2aXNpdGVkU2VsZWN0b3JzID0gW11cblxuICAgIHZhciBjaGVja1JlY3Vyc2lvbiA9IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3Rvcikge1xuXHRcdFx0Ly8gYWxyZWFkeSB2aXNpdGVkXG4gICAgICBpZiAodmlzaXRlZFNlbGVjdG9ycy5pbmRleE9mKHBhcmVudFNlbGVjdG9yKSAhPT0gLTEpIHtcbiAgICAgICAgUmVjdXJzaW9uRm91bmQgPSB0cnVlXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICBpZiAocGFyZW50U2VsZWN0b3Iud2lsbFJldHVybkVsZW1lbnRzKCkpIHtcbiAgICAgICAgdmlzaXRlZFNlbGVjdG9ycy5wdXNoKHBhcmVudFNlbGVjdG9yKVxuICAgICAgICB2YXIgY2hpbGRTZWxlY3RvcnMgPSB0aGlzLmdldERpcmVjdENoaWxkU2VsZWN0b3JzKHBhcmVudFNlbGVjdG9yLmlkKVxuICAgICAgICBjaGlsZFNlbGVjdG9ycy5mb3JFYWNoKGNoZWNrUmVjdXJzaW9uKVxuICAgICAgICB2aXNpdGVkU2VsZWN0b3JzLnBvcCgpXG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpXG5cbiAgICBjaGVja1JlY3Vyc2lvbih0b3BTZWxlY3RvcilcbiAgfS5iaW5kKHRoaXMpKVxuXG4gIHJldHVybiBSZWN1cnNpb25Gb3VuZFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yTGlzdFxuIiwidmFyIFNlbGVjdG9yRWxlbWVudCA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JFbGVtZW50JylcbnZhciBTZWxlY3RvckVsZW1lbnRBdHRyaWJ1dGUgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yRWxlbWVudEF0dHJpYnV0ZScpXG52YXIgU2VsZWN0b3JFbGVtZW50Q2xpY2sgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yRWxlbWVudENsaWNrJylcbnZhciBTZWxlY3RvckVsZW1lbnRTY3JvbGwgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yRWxlbWVudFNjcm9sbCcpXG52YXIgU2VsZWN0b3JHcm91cCA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JHcm91cCcpXG52YXIgU2VsZWN0b3JIVE1MID0gcmVxdWlyZSgnLi9TZWxlY3Rvci9TZWxlY3RvckhUTUwnKVxudmFyIFNlbGVjdG9ySW1hZ2UgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9ySW1hZ2UnKVxudmFyIFNlbGVjdG9yTGluayA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JMaW5rJylcbnZhciBTZWxlY3RvclBvcHVwTGluayA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JQb3B1cExpbmsnKVxudmFyIFNlbGVjdG9yVGFibGUgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yVGFibGUnKVxudmFyIFNlbGVjdG9yVGV4dCA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JUZXh0JylcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIFNlbGVjdG9yRWxlbWVudCxcbiAgU2VsZWN0b3JFbGVtZW50QXR0cmlidXRlLFxuICBTZWxlY3RvckVsZW1lbnRDbGljayxcbiAgU2VsZWN0b3JFbGVtZW50U2Nyb2xsLFxuICBTZWxlY3Rvckdyb3VwLFxuICBTZWxlY3RvckhUTUwsXG4gIFNlbGVjdG9ySW1hZ2UsXG4gIFNlbGVjdG9yTGluayxcbiAgU2VsZWN0b3JQb3B1cExpbmssXG4gIFNlbGVjdG9yVGFibGUsXG4gIFNlbGVjdG9yVGV4dFxufVxuIiwidmFyIFNlbGVjdG9yID0gcmVxdWlyZSgnLi9TZWxlY3RvcicpXG52YXIgU2VsZWN0b3JMaXN0ID0gcmVxdWlyZSgnLi9TZWxlY3Rvckxpc3QnKVxudmFyIFNpdGVtYXAgPSBmdW5jdGlvbiAoc2l0ZW1hcE9iaikge1xuICB0aGlzLmluaXREYXRhKHNpdGVtYXBPYmopXG59XG5cblNpdGVtYXAucHJvdG90eXBlID0ge1xuXG4gIGluaXREYXRhOiBmdW5jdGlvbiAoc2l0ZW1hcE9iaikge1xuICAgIGNvbnNvbGUubG9nKHRoaXMpXG4gICAgZm9yICh2YXIga2V5IGluIHNpdGVtYXBPYmopIHtcbiAgICAgIGNvbnNvbGUubG9nKGtleSlcbiAgICAgIHRoaXNba2V5XSA9IHNpdGVtYXBPYmpba2V5XVxuICAgIH1cbiAgICBjb25zb2xlLmxvZyh0aGlzKVxuXG4gICAgdmFyIHNlbGVjdG9ycyA9IHRoaXMuc2VsZWN0b3JzXG4gICAgdGhpcy5zZWxlY3RvcnMgPSBuZXcgU2VsZWN0b3JMaXN0KHRoaXMuc2VsZWN0b3JzKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIGFsbCBzZWxlY3RvcnMgb3IgcmVjdXJzaXZlbHkgZmluZCBhbmQgcmV0dXJuIGFsbCBjaGlsZCBzZWxlY3RvcnMgb2YgYSBwYXJlbnQgc2VsZWN0b3IuXG5cdCAqIEBwYXJhbSBwYXJlbnRTZWxlY3RvcklkXG5cdCAqIEByZXR1cm5zIHtBcnJheX1cblx0ICovXG4gIGdldEFsbFNlbGVjdG9yczogZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9ySWQpIHtcbiAgICByZXR1cm4gdGhpcy5zZWxlY3RvcnMuZ2V0QWxsU2VsZWN0b3JzKHBhcmVudFNlbGVjdG9ySWQpXG4gIH0sXG5cblx0LyoqXG5cdCAqIFJldHVybnMgb25seSBzZWxlY3RvcnMgdGhhdCBhcmUgZGlyZWN0bHkgdW5kZXIgYSBwYXJlbnRcblx0ICogQHBhcmFtIHBhcmVudFNlbGVjdG9ySWRcblx0ICogQHJldHVybnMge0FycmF5fVxuXHQgKi9cbiAgZ2V0RGlyZWN0Q2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3RvcklkKSB7XG4gICAgcmV0dXJuIHRoaXMuc2VsZWN0b3JzLmdldERpcmVjdENoaWxkU2VsZWN0b3JzKHBhcmVudFNlbGVjdG9ySWQpXG4gIH0sXG5cblx0LyoqXG5cdCAqIFJldHVybnMgYWxsIHNlbGVjdG9yIGlkIHBhcmFtZXRlcnNcblx0ICogQHJldHVybnMge0FycmF5fVxuXHQgKi9cbiAgZ2V0U2VsZWN0b3JJZHM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaWRzID0gWydfcm9vdCddXG4gICAgdGhpcy5zZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgIGlkcy5wdXNoKHNlbGVjdG9yLmlkKVxuICAgIH0pXG4gICAgcmV0dXJuIGlkc1xuICB9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIG9ubHkgc2VsZWN0b3IgaWRzIHdoaWNoIGNhbiBoYXZlIGNoaWxkIHNlbGVjdG9yc1xuXHQgKiBAcmV0dXJucyB7QXJyYXl9XG5cdCAqL1xuICBnZXRQb3NzaWJsZVBhcmVudFNlbGVjdG9ySWRzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGlkcyA9IFsnX3Jvb3QnXVxuICAgIHRoaXMuc2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICBpZiAoc2VsZWN0b3IuY2FuSGF2ZUNoaWxkU2VsZWN0b3JzKCkpIHtcbiAgICAgICAgaWRzLnB1c2goc2VsZWN0b3IuaWQpXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gaWRzXG4gIH0sXG5cbiAgZ2V0U3RhcnRVcmxzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN0YXJ0VXJscyA9IHRoaXMuc3RhcnRVcmxcblx0XHQvLyBzaW5nbGUgc3RhcnQgdXJsXG4gICAgaWYgKHRoaXMuc3RhcnRVcmwucHVzaCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBzdGFydFVybHMgPSBbc3RhcnRVcmxzXVxuICAgIH1cblxuICAgIHZhciB1cmxzID0gW11cbiAgICBzdGFydFVybHMuZm9yRWFjaChmdW5jdGlvbiAoc3RhcnRVcmwpIHtcblx0XHRcdC8vIHplcm8gcGFkZGluZyBoZWxwZXJcbiAgICAgIHZhciBscGFkID0gZnVuY3Rpb24gKHN0ciwgbGVuZ3RoKSB7XG4gICAgICAgIHdoaWxlIChzdHIubGVuZ3RoIDwgbGVuZ3RoKSB7IHN0ciA9ICcwJyArIHN0ciB9XG4gICAgICAgIHJldHVybiBzdHJcbiAgICAgIH1cblxuICAgICAgdmFyIHJlID0gL14oLio/KVxcWyhcXGQrKVxcLShcXGQrKSg6KFxcZCspKT9cXF0oLiopJC9cbiAgICAgIHZhciBtYXRjaGVzID0gc3RhcnRVcmwubWF0Y2gocmUpXG4gICAgICBpZiAobWF0Y2hlcykge1xuICAgICAgICB2YXIgc3RhcnRTdHIgPSBtYXRjaGVzWzJdXG4gICAgICAgIHZhciBlbmRTdHIgPSBtYXRjaGVzWzNdXG4gICAgICAgIHZhciBzdGFydCA9IHBhcnNlSW50KHN0YXJ0U3RyKVxuICAgICAgICB2YXIgZW5kID0gcGFyc2VJbnQoZW5kU3RyKVxuICAgICAgICB2YXIgaW5jcmVtZW50YWwgPSAxXG4gICAgICAgIGNvbnNvbGUubG9nKG1hdGNoZXNbNV0pXG4gICAgICAgIGlmIChtYXRjaGVzWzVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpbmNyZW1lbnRhbCA9IHBhcnNlSW50KG1hdGNoZXNbNV0pXG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDw9IGVuZDsgaSArPSBpbmNyZW1lbnRhbCkge1xuXHRcdFx0XHRcdC8vIHdpdGggemVybyBwYWRkaW5nXG4gICAgICAgICAgaWYgKHN0YXJ0U3RyLmxlbmd0aCA9PT0gZW5kU3RyLmxlbmd0aCkge1xuICAgICAgICAgICAgdXJscy5wdXNoKG1hdGNoZXNbMV0gKyBscGFkKGkudG9TdHJpbmcoKSwgc3RhcnRTdHIubGVuZ3RoKSArIG1hdGNoZXNbNl0pXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHVybHMucHVzaChtYXRjaGVzWzFdICsgaSArIG1hdGNoZXNbNl0pXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1cmxzXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB1cmxzLnB1c2goc3RhcnRVcmwpXG4gICAgICB9XG4gICAgfSlcblxuICAgIHJldHVybiB1cmxzXG4gIH0sXG5cbiAgdXBkYXRlU2VsZWN0b3I6IGZ1bmN0aW9uIChzZWxlY3Rvciwgc2VsZWN0b3JEYXRhKSB7XG5cdFx0Ly8gc2VsZWN0b3IgaXMgdW5kZWZpbmVkIHdoZW4gY3JlYXRpbmcgYSBuZXcgb25lXG4gICAgaWYgKHNlbGVjdG9yID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHNlbGVjdG9yID0gbmV3IFNlbGVjdG9yKHNlbGVjdG9yRGF0YSlcbiAgICB9XG5cblx0XHQvLyB1cGRhdGUgY2hpbGQgc2VsZWN0b3JzXG4gICAgaWYgKHNlbGVjdG9yLmlkICE9PSB1bmRlZmluZWQgJiYgc2VsZWN0b3IuaWQgIT09IHNlbGVjdG9yRGF0YS5pZCkge1xuICAgICAgdGhpcy5zZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAoY3VycmVudFNlbGVjdG9yKSB7XG4gICAgICAgIGN1cnJlbnRTZWxlY3Rvci5yZW5hbWVQYXJlbnRTZWxlY3RvcihzZWxlY3Rvci5pZCwgc2VsZWN0b3JEYXRhLmlkKVxuICAgICAgfSlcblxuXHRcdFx0Ly8gdXBkYXRlIGN5Y2xpYyBzZWxlY3RvclxuICAgICAgdmFyIHBvcyA9IHNlbGVjdG9yRGF0YS5wYXJlbnRTZWxlY3RvcnMuaW5kZXhPZihzZWxlY3Rvci5pZClcbiAgICAgIGlmIChwb3MgIT09IC0xKSB7XG4gICAgICAgIHNlbGVjdG9yRGF0YS5wYXJlbnRTZWxlY3RvcnMuc3BsaWNlKHBvcywgMSwgc2VsZWN0b3JEYXRhLmlkKVxuICAgICAgfVxuICAgIH1cblxuICAgIHNlbGVjdG9yLnVwZGF0ZURhdGEoc2VsZWN0b3JEYXRhKVxuXG4gICAgaWYgKHRoaXMuZ2V0U2VsZWN0b3JJZHMoKS5pbmRleE9mKHNlbGVjdG9yLmlkKSA9PT0gLTEpIHtcbiAgICAgIHRoaXMuc2VsZWN0b3JzLnB1c2goc2VsZWN0b3IpXG4gICAgfVxuICB9LFxuICBkZWxldGVTZWxlY3RvcjogZnVuY3Rpb24gKHNlbGVjdG9yVG9EZWxldGUpIHtcbiAgICB0aGlzLnNlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgaWYgKHNlbGVjdG9yLmhhc1BhcmVudFNlbGVjdG9yKHNlbGVjdG9yVG9EZWxldGUuaWQpKSB7XG4gICAgICAgIHNlbGVjdG9yLnJlbW92ZVBhcmVudFNlbGVjdG9yKHNlbGVjdG9yVG9EZWxldGUuaWQpXG4gICAgICAgIGlmIChzZWxlY3Rvci5wYXJlbnRTZWxlY3RvcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgdGhpcy5kZWxldGVTZWxlY3RvcihzZWxlY3RvcilcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIGZvciAodmFyIGkgaW4gdGhpcy5zZWxlY3RvcnMpIHtcbiAgICAgIGlmICh0aGlzLnNlbGVjdG9yc1tpXS5pZCA9PT0gc2VsZWN0b3JUb0RlbGV0ZS5pZCkge1xuICAgICAgICB0aGlzLnNlbGVjdG9ycy5zcGxpY2UoaSwgMSlcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIGdldERhdGFUYWJsZUlkOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2lkLnJlcGxhY2UoL1xcLi9nLCAnXycpXG4gIH0sXG4gIGV4cG9ydFNpdGVtYXA6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2l0ZW1hcE9iaiA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcykpXG4gICAgZGVsZXRlIHNpdGVtYXBPYmouX3JldlxuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShzaXRlbWFwT2JqKVxuICB9LFxuICBpbXBvcnRTaXRlbWFwOiBmdW5jdGlvbiAoc2l0ZW1hcEpTT04pIHtcbiAgICB2YXIgc2l0ZW1hcE9iaiA9IEpTT04ucGFyc2Uoc2l0ZW1hcEpTT04pXG4gICAgdGhpcy5pbml0RGF0YShzaXRlbWFwT2JqKVxuICB9LFxuXHQvLyByZXR1cm4gYSBsaXN0IG9mIGNvbHVtbnMgdGhhbiBjYW4gYmUgZXhwb3J0ZWRcbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY29sdW1ucyA9IFtdXG4gICAgdGhpcy5zZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgIGNvbHVtbnMgPSBjb2x1bW5zLmNvbmNhdChzZWxlY3Rvci5nZXREYXRhQ29sdW1ucygpKVxuICAgIH0pXG5cbiAgICByZXR1cm4gY29sdW1uc1xuICB9LFxuICBnZXREYXRhRXhwb3J0Q3N2QmxvYjogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICB2YXIgY29sdW1ucyA9IHRoaXMuZ2V0RGF0YUNvbHVtbnMoKSxcbiAgICAgIGRlbGltaXRlciA9ICcsJyxcbiAgICAgIG5ld2xpbmUgPSAnXFxuJyxcbiAgICAgIGNzdkRhdGEgPSBbJ1xcdWZlZmYnXSAvLyB1dGYtOCBib20gY2hhclxuXG5cdFx0Ly8gaGVhZGVyXG4gICAgY3N2RGF0YS5wdXNoKGNvbHVtbnMuam9pbihkZWxpbWl0ZXIpICsgbmV3bGluZSlcblxuXHRcdC8vIGRhdGFcbiAgICBkYXRhLmZvckVhY2goZnVuY3Rpb24gKHJvdykge1xuICAgICAgdmFyIHJvd0RhdGEgPSBbXVxuICAgICAgY29sdW1ucy5mb3JFYWNoKGZ1bmN0aW9uIChjb2x1bW4pIHtcbiAgICAgICAgdmFyIGNlbGxEYXRhID0gcm93W2NvbHVtbl1cbiAgICAgICAgaWYgKGNlbGxEYXRhID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjZWxsRGF0YSA9ICcnXG4gICAgICAgIH1cdFx0XHRcdGVsc2UgaWYgKHR5cGVvZiBjZWxsRGF0YSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICBjZWxsRGF0YSA9IEpTT04uc3RyaW5naWZ5KGNlbGxEYXRhKVxuICAgICAgICB9XG5cbiAgICAgICAgcm93RGF0YS5wdXNoKCdcIicgKyBjZWxsRGF0YS5yZXBsYWNlKC9cIi9nLCAnXCJcIicpLnRyaW0oKSArICdcIicpXG4gICAgICB9KVxuICAgICAgY3N2RGF0YS5wdXNoKHJvd0RhdGEuam9pbihkZWxpbWl0ZXIpICsgbmV3bGluZSlcbiAgICB9KVxuXG4gICAgcmV0dXJuIG5ldyBCbG9iKGNzdkRhdGEsIHt0eXBlOiAndGV4dC9jc3YnfSlcbiAgfSxcbiAgZ2V0U2VsZWN0b3JCeUlkOiBmdW5jdGlvbiAoc2VsZWN0b3JJZCkge1xuICAgIHJldHVybiB0aGlzLnNlbGVjdG9ycy5nZXRTZWxlY3RvckJ5SWQoc2VsZWN0b3JJZClcbiAgfSxcblx0LyoqXG5cdCAqIENyZWF0ZSBmdWxsIGNsb25lIG9mIHNpdGVtYXBcblx0ICogQHJldHVybnMge1NpdGVtYXB9XG5cdCAqL1xuICBjbG9uZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBjbG9uZWRKU09OID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzKSlcbiAgICB2YXIgc2l0ZW1hcCA9IG5ldyBTaXRlbWFwKGNsb25lZEpTT04pXG4gICAgcmV0dXJuIHNpdGVtYXBcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNpdGVtYXBcbiIsInZhciBTaXRlbWFwID0gcmVxdWlyZSgnLi9TaXRlbWFwJylcblxuLyoqXG4gKiBGcm9tIGRldnRvb2xzIHBhbmVsIHRoZXJlIGlzIG5vIHBvc3NpYmlsaXR5IHRvIGV4ZWN1dGUgWEhSIHJlcXVlc3RzLiBTbyBhbGwgcmVxdWVzdHMgdG8gYSByZW1vdGUgQ291Y2hEYiBtdXN0IGJlXG4gKiBoYW5kbGVkIHRocm91Z2ggQmFja2dyb3VuZCBwYWdlLiBTdG9yZURldnRvb2xzIGlzIGEgc2ltcGx5IGEgcHJveHkgc3RvcmVcbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgU3RvcmVEZXZ0b29scyA9IGZ1bmN0aW9uICgpIHtcblxufVxuXG5TdG9yZURldnRvb2xzLnByb3RvdHlwZSA9IHtcbiAgY3JlYXRlU2l0ZW1hcDogZnVuY3Rpb24gKHNpdGVtYXAsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICBjcmVhdGVTaXRlbWFwOiB0cnVlLFxuICAgICAgc2l0ZW1hcDogSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzaXRlbWFwKSlcbiAgICB9XG5cbiAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZShyZXF1ZXN0LCBmdW5jdGlvbiAoY2FsbGJhY2tGbiwgb3JpZ2luYWxTaXRlbWFwLCBuZXdTaXRlbWFwKSB7XG4gICAgICBvcmlnaW5hbFNpdGVtYXAuX3JldiA9IG5ld1NpdGVtYXAuX3JldlxuICAgICAgY2FsbGJhY2tGbihvcmlnaW5hbFNpdGVtYXApXG4gICAgfS5iaW5kKHRoaXMsIGNhbGxiYWNrLCBzaXRlbWFwKSlcbiAgfSxcbiAgc2F2ZVNpdGVtYXA6IGZ1bmN0aW9uIChzaXRlbWFwLCBjYWxsYmFjaykge1xuICAgIHRoaXMuY3JlYXRlU2l0ZW1hcChzaXRlbWFwLCBjYWxsYmFjaylcbiAgfSxcbiAgZGVsZXRlU2l0ZW1hcDogZnVuY3Rpb24gKHNpdGVtYXAsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICBkZWxldGVTaXRlbWFwOiB0cnVlLFxuICAgICAgc2l0ZW1hcDogSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzaXRlbWFwKSlcbiAgICB9XG4gICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UocmVxdWVzdCwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICBjYWxsYmFjaygpXG4gICAgfSlcbiAgfSxcbiAgZ2V0QWxsU2l0ZW1hcHM6IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIHZhciByZXF1ZXN0ID0ge1xuICAgICAgZ2V0QWxsU2l0ZW1hcHM6IHRydWVcbiAgICB9XG5cbiAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZShyZXF1ZXN0LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgIHZhciBzaXRlbWFwcyA9IFtdXG5cbiAgICAgIGZvciAodmFyIGkgaW4gcmVzcG9uc2UpIHtcbiAgICAgICAgc2l0ZW1hcHMucHVzaChuZXcgU2l0ZW1hcChyZXNwb25zZVtpXSkpXG4gICAgICB9XG4gICAgICBjYWxsYmFjayhzaXRlbWFwcylcbiAgICB9KVxuICB9LFxuICBnZXRTaXRlbWFwRGF0YTogZnVuY3Rpb24gKHNpdGVtYXAsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICBnZXRTaXRlbWFwRGF0YTogdHJ1ZSxcbiAgICAgIHNpdGVtYXA6IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoc2l0ZW1hcCkpXG4gICAgfVxuXG4gICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UocmVxdWVzdCwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICBjYWxsYmFjayhyZXNwb25zZSlcbiAgICB9KVxuICB9LFxuICBzaXRlbWFwRXhpc3RzOiBmdW5jdGlvbiAoc2l0ZW1hcElkLCBjYWxsYmFjaykge1xuICAgIHZhciByZXF1ZXN0ID0ge1xuICAgICAgc2l0ZW1hcEV4aXN0czogdHJ1ZSxcbiAgICAgIHNpdGVtYXBJZDogc2l0ZW1hcElkXG4gICAgfVxuXG4gICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UocmVxdWVzdCwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICBjYWxsYmFjayhyZXNwb25zZSlcbiAgICB9KVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU3RvcmVEZXZ0b29sc1xuIiwidmFyIENzc1NlbGVjdG9yID0gcmVxdWlyZSgnY3NzLXNlbGVjdG9yJykuQ3NzU2VsZWN0b3Jcbi8vIFRPRE8gZ2V0IHJpZCBvZiBqcXVlcnlcblxuLyoqXG4gKiBPbmx5IEVsZW1lbnRzIHVuaXF1ZSB3aWxsIGJlIGFkZGVkIHRvIHRoaXMgYXJyYXlcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBVbmlxdWVFbGVtZW50TGlzdCAoY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUpIHtcbiAgdGhpcy5jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSA9IGNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlXG4gIHRoaXMuYWRkZWRFbGVtZW50cyA9IHt9XG59XG5cblVuaXF1ZUVsZW1lbnRMaXN0LnByb3RvdHlwZSA9IFtdXG5cblVuaXF1ZUVsZW1lbnRMaXN0LnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgaWYgKHRoaXMuaXNBZGRlZChlbGVtZW50KSkge1xuICAgIHJldHVybiBmYWxzZVxuICB9IGVsc2Uge1xuICAgIHZhciBlbGVtZW50VW5pcXVlSWQgPSB0aGlzLmdldEVsZW1lbnRVbmlxdWVJZChlbGVtZW50KVxuICAgIHRoaXMuYWRkZWRFbGVtZW50c1tlbGVtZW50VW5pcXVlSWRdID0gdHJ1ZVxuICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmNhbGwodGhpcywgJChlbGVtZW50KS5jbG9uZSh0cnVlKVswXSlcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG59XG5cblVuaXF1ZUVsZW1lbnRMaXN0LnByb3RvdHlwZS5nZXRFbGVtZW50VW5pcXVlSWQgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICBpZiAodGhpcy5jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSA9PT0gJ3VuaXF1ZVRleHQnKSB7XG4gICAgdmFyIGVsZW1lbnRUZXh0ID0gJChlbGVtZW50KS50ZXh0KCkudHJpbSgpXG4gICAgcmV0dXJuIGVsZW1lbnRUZXh0XG4gIH0gZWxzZSBpZiAodGhpcy5jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSA9PT0gJ3VuaXF1ZUhUTUxUZXh0Jykge1xuICAgIHZhciBlbGVtZW50SFRNTCA9ICQoXCI8ZGl2IGNsYXNzPSctd2ViLXNjcmFwZXItc2hvdWxkLW5vdC1iZS12aXNpYmxlJz5cIikuYXBwZW5kKCQoZWxlbWVudCkuZXEoMCkuY2xvbmUoKSkuaHRtbCgpXG4gICAgcmV0dXJuIGVsZW1lbnRIVE1MXG4gIH0gZWxzZSBpZiAodGhpcy5jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSA9PT0gJ3VuaXF1ZUhUTUwnKSB7XG5cdFx0Ly8gZ2V0IGVsZW1lbnQgd2l0aG91dCB0ZXh0XG4gICAgdmFyICRlbGVtZW50ID0gJChlbGVtZW50KS5lcSgwKS5jbG9uZSgpXG5cbiAgICB2YXIgcmVtb3ZlVGV4dCA9IGZ1bmN0aW9uICgkZWxlbWVudCkge1xuICAgICAgJGVsZW1lbnQuY29udGVudHMoKVxuXHRcdFx0XHQuZmlsdGVyKGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMubm9kZVR5cGUgIT09IDMpIHtcbiAgICByZW1vdmVUZXh0KCQodGhpcykpXG4gIH1cbiAgcmV0dXJuIHRoaXMubm9kZVR5cGUgPT0gMyAvLyBOb2RlLlRFWFRfTk9ERVxufSkucmVtb3ZlKClcbiAgICB9XG4gICAgcmVtb3ZlVGV4dCgkZWxlbWVudClcblxuICAgIHZhciBlbGVtZW50SFRNTCA9ICQoXCI8ZGl2IGNsYXNzPSctd2ViLXNjcmFwZXItc2hvdWxkLW5vdC1iZS12aXNpYmxlJz5cIikuYXBwZW5kKCRlbGVtZW50KS5odG1sKClcbiAgICByZXR1cm4gZWxlbWVudEhUTUxcbiAgfSBlbHNlIGlmICh0aGlzLmNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlID09PSAndW5pcXVlQ1NTU2VsZWN0b3InKSB7XG4gICAgdmFyIGNzID0gbmV3IENzc1NlbGVjdG9yKHtcbiAgICAgIGVuYWJsZVNtYXJ0VGFibGVTZWxlY3RvcjogZmFsc2UsXG4gICAgICBwYXJlbnQ6ICQoJ2JvZHknKVswXSxcbiAgICAgIGVuYWJsZVJlc3VsdFN0cmlwcGluZzogZmFsc2VcbiAgICB9KVxuICAgIHZhciBDU1NTZWxlY3RvciA9IGNzLmdldENzc1NlbGVjdG9yKFtlbGVtZW50XSlcbiAgICByZXR1cm4gQ1NTU2VsZWN0b3JcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyAnSW52YWxpZCBjbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSAnICsgdGhpcy5jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVW5pcXVlRWxlbWVudExpc3RcblxuVW5pcXVlRWxlbWVudExpc3QucHJvdG90eXBlLmlzQWRkZWQgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICB2YXIgZWxlbWVudFVuaXF1ZUlkID0gdGhpcy5nZXRFbGVtZW50VW5pcXVlSWQoZWxlbWVudClcbiAgdmFyIGlzQWRkZWQgPSBlbGVtZW50VW5pcXVlSWQgaW4gdGhpcy5hZGRlZEVsZW1lbnRzXG4gIHJldHVybiBpc0FkZGVkXG59XG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciBCYWNrZ3JvdW5kU2NyaXB0ID0gcmVxdWlyZSgnLi9CYWNrZ3JvdW5kU2NyaXB0Jylcbi8qKlxuICogQHBhcmFtIGxvY2F0aW9uXHRjb25maWd1cmUgZnJvbSB3aGVyZSB0aGUgY29udGVudCBzY3JpcHQgaXMgYmVpbmcgYWNjZXNzZWQgKENvbnRlbnRTY3JpcHQsIEJhY2tncm91bmRQYWdlLCBEZXZUb29scylcbiAqIEByZXR1cm5zIEJhY2tncm91bmRTY3JpcHRcbiAqL1xudmFyIGdldEJhY2tncm91bmRTY3JpcHQgPSBmdW5jdGlvbiAobG9jYXRpb24pIHtcbiAgLy8gSGFuZGxlIGNhbGxzIGZyb20gZGlmZmVyZW50IHBsYWNlc1xuICBpZiAobG9jYXRpb24gPT09ICdCYWNrZ3JvdW5kU2NyaXB0Jykge1xuICAgIHJldHVybiBCYWNrZ3JvdW5kU2NyaXB0XG4gIH0gZWxzZSBpZiAobG9jYXRpb24gPT09ICdEZXZUb29scycgfHwgbG9jYXRpb24gPT09ICdDb250ZW50U2NyaXB0Jykge1xuICAgIC8vIGlmIGNhbGxlZCB3aXRoaW4gYmFja2dyb3VuZCBzY3JpcHQgcHJveHkgY2FsbHMgdG8gY29udGVudCBzY3JpcHRcbiAgICB2YXIgYmFja2dyb3VuZFNjcmlwdCA9IHt9XG5cbiAgICBPYmplY3Qua2V5cyhCYWNrZ3JvdW5kU2NyaXB0KS5mb3JFYWNoKGZ1bmN0aW9uIChhdHRyKSB7XG4gICAgICBpZiAodHlwZW9mIEJhY2tncm91bmRTY3JpcHRbYXR0cl0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgYmFja2dyb3VuZFNjcmlwdFthdHRyXSA9IGZ1bmN0aW9uIChyZXF1ZXN0KSB7XG4gICAgICAgICAgdmFyIHJlcVRvQmFja2dyb3VuZFNjcmlwdCA9IHtcbiAgICAgICAgICAgIGJhY2tncm91bmRTY3JpcHRDYWxsOiB0cnVlLFxuICAgICAgICAgICAgZm46IGF0dHIsXG4gICAgICAgICAgICByZXF1ZXN0OiByZXF1ZXN0XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgICAgICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UocmVxVG9CYWNrZ3JvdW5kU2NyaXB0LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZShyZXNwb25zZSlcbiAgICAgICAgICB9KVxuXG4gICAgICAgICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2VcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYmFja2dyb3VuZFNjcmlwdFthdHRyXSA9IEJhY2tncm91bmRTY3JpcHRbYXR0cl1cbiAgICAgIH1cbiAgICB9KVxuXG4gICAgcmV0dXJuIGJhY2tncm91bmRTY3JpcHRcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgQmFja2dyb3VuZFNjcmlwdCBpbml0aWFsaXphdGlvbiAtICcgKyBsb2NhdGlvbilcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdldEJhY2tncm91bmRTY3JpcHRcbiIsInZhciBnZXRCYWNrZ3JvdW5kU2NyaXB0ID0gcmVxdWlyZSgnLi9nZXRCYWNrZ3JvdW5kU2NyaXB0JylcbnZhciBDb250ZW50U2NyaXB0ID0gcmVxdWlyZSgnLi9Db250ZW50U2NyaXB0Jylcbi8qKlxuICpcbiAqIEBwYXJhbSBsb2NhdGlvblx0Y29uZmlndXJlIGZyb20gd2hlcmUgdGhlIGNvbnRlbnQgc2NyaXB0IGlzIGJlaW5nIGFjY2Vzc2VkIChDb250ZW50U2NyaXB0LCBCYWNrZ3JvdW5kUGFnZSwgRGV2VG9vbHMpXG4gKiBAcGFyYW0gYmFja2dyb3VuZFNjcmlwdFx0QmFja2dyb3VuZFNjcmlwdCBjbGllbnRcbiAqIEByZXR1cm5zIENvbnRlbnRTY3JpcHRcbiAqL1xudmFyIGdldENvbnRlbnRTY3JpcHQgPSBmdW5jdGlvbiAobG9jYXRpb24pIHtcbiAgdmFyIGNvbnRlbnRTY3JpcHRcblxuICAvLyBIYW5kbGUgY2FsbHMgZnJvbSBkaWZmZXJlbnQgcGxhY2VzXG4gIGlmIChsb2NhdGlvbiA9PT0gJ0NvbnRlbnRTY3JpcHQnKSB7XG4gICAgY29udGVudFNjcmlwdCA9IENvbnRlbnRTY3JpcHRcbiAgICBjb250ZW50U2NyaXB0LmJhY2tncm91bmRTY3JpcHQgPSBnZXRCYWNrZ3JvdW5kU2NyaXB0KCdDb250ZW50U2NyaXB0JylcbiAgICByZXR1cm4gY29udGVudFNjcmlwdFxuICB9IGVsc2UgaWYgKGxvY2F0aW9uID09PSAnQmFja2dyb3VuZFNjcmlwdCcgfHwgbG9jYXRpb24gPT09ICdEZXZUb29scycpIHtcbiAgICB2YXIgYmFja2dyb3VuZFNjcmlwdCA9IGdldEJhY2tncm91bmRTY3JpcHQobG9jYXRpb24pXG5cbiAgICAvLyBpZiBjYWxsZWQgd2l0aGluIGJhY2tncm91bmQgc2NyaXB0IHByb3h5IGNhbGxzIHRvIGNvbnRlbnQgc2NyaXB0XG4gICAgY29udGVudFNjcmlwdCA9IHt9XG4gICAgT2JqZWN0LmtleXMoQ29udGVudFNjcmlwdCkuZm9yRWFjaChmdW5jdGlvbiAoYXR0cikge1xuICAgICAgaWYgKHR5cGVvZiBDb250ZW50U2NyaXB0W2F0dHJdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNvbnRlbnRTY3JpcHRbYXR0cl0gPSBmdW5jdGlvbiAocmVxdWVzdCkge1xuICAgICAgICAgIHZhciByZXFUb0NvbnRlbnRTY3JpcHQgPSB7XG4gICAgICAgICAgICBjb250ZW50U2NyaXB0Q2FsbDogdHJ1ZSxcbiAgICAgICAgICAgIGZuOiBhdHRyLFxuICAgICAgICAgICAgcmVxdWVzdDogcmVxdWVzdFxuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBiYWNrZ3JvdW5kU2NyaXB0LmV4ZWN1dGVDb250ZW50U2NyaXB0KHJlcVRvQ29udGVudFNjcmlwdClcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29udGVudFNjcmlwdFthdHRyXSA9IENvbnRlbnRTY3JpcHRbYXR0cl1cbiAgICAgIH1cbiAgICB9KVxuICAgIGNvbnRlbnRTY3JpcHQuYmFja2dyb3VuZFNjcmlwdCA9IGJhY2tncm91bmRTY3JpcHRcbiAgICByZXR1cm4gY29udGVudFNjcmlwdFxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBDb250ZW50U2NyaXB0IGluaXRpYWxpemF0aW9uIC0gJyArIGxvY2F0aW9uKVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0Q29udGVudFNjcmlwdFxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdENzc1NlbGVjdG9yLFxuXHRFbGVtZW50U2VsZWN0b3IsXG5cdEVsZW1lbnRTZWxlY3Rvckxpc3Rcbn1cblxuXG5mdW5jdGlvbiBDc3NTZWxlY3RvciAob3B0aW9ucykge1xuXG5cdHZhciBtZSA9IHRoaXM7XG5cblx0Ly8gZGVmYXVsdHNcblx0dGhpcy5pZ25vcmVkVGFncyA9IFsnZm9udCcsICdiJywgJ2knLCAncyddO1xuXHR0aGlzLnBhcmVudCA9IG9wdGlvbnMuZG9jdW1lbnQgfHwgb3B0aW9ucy5wYXJlbnRcblx0dGhpcy5kb2N1bWVudCA9IG9wdGlvbnMuZG9jdW1lbnQgfHwgb3B0aW9ucy5wYXJlbnQgXG5cdHRoaXMuaWdub3JlZENsYXNzQmFzZSA9IGZhbHNlO1xuXHR0aGlzLmVuYWJsZVJlc3VsdFN0cmlwcGluZyA9IHRydWU7XG5cdHRoaXMuZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yID0gZmFsc2U7XG5cdHRoaXMuaWdub3JlZENsYXNzZXMgPSBbXTtcbiAgICB0aGlzLmFsbG93TXVsdGlwbGVTZWxlY3RvcnMgPSBmYWxzZTtcblx0dGhpcy5xdWVyeSA9IGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuXHRcdHJldHVybiBtZS5wYXJlbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG5cdH07XG5cblx0Ly8gb3ZlcnJpZGVzIGRlZmF1bHRzIHdpdGggb3B0aW9uc1xuXHRmb3IgKHZhciBpIGluIG9wdGlvbnMpIHtcblx0XHR0aGlzW2ldID0gb3B0aW9uc1tpXTtcblx0fVxufTtcblxuLy8gVE9ETyByZWZhY3RvciBlbGVtZW50IHNlbGVjdG9yIGxpc3QgaW50byBhIH4gY2xhc3NcbmZ1bmN0aW9uIEVsZW1lbnRTZWxlY3RvciAoZWxlbWVudCwgaWdub3JlZENsYXNzZXMpIHtcblxuXHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXHR0aGlzLmlzRGlyZWN0Q2hpbGQgPSB0cnVlO1xuXHR0aGlzLnRhZyA9IGVsZW1lbnQubG9jYWxOYW1lO1xuXHR0aGlzLnRhZyA9IHRoaXMudGFnLnJlcGxhY2UoLzovZywgJ1xcXFw6Jyk7XG5cblx0Ly8gbnRoLW9mLWNoaWxkKG4rMSlcblx0dGhpcy5pbmRleG4gPSBudWxsO1xuXHR0aGlzLmluZGV4ID0gMTtcblx0dGhpcy5pZCA9IG51bGw7XG5cdHRoaXMuY2xhc3NlcyA9IG5ldyBBcnJheSgpO1xuXG5cdC8vIGRvIG5vdCBhZGQgYWRkaXRpbmFsIGluZm8gdG8gaHRtbCwgYm9keSB0YWdzLlxuXHQvLyBodG1sOm50aC1vZi10eXBlKDEpIGNhbm5vdCBiZSBzZWxlY3RlZFxuXHRpZih0aGlzLnRhZyA9PT0gJ2h0bWwnIHx8IHRoaXMudGFnID09PSAnSFRNTCdcblx0XHR8fCB0aGlzLnRhZyA9PT0gJ2JvZHknIHx8IHRoaXMudGFnID09PSAnQk9EWScpIHtcblx0XHR0aGlzLmluZGV4ID0gbnVsbDtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRpZiAoZWxlbWVudC5wYXJlbnROb2RlICE9PSB1bmRlZmluZWQpIHtcblx0XHQvLyBudGgtY2hpbGRcblx0XHQvL3RoaXMuaW5kZXggPSBbXS5pbmRleE9mLmNhbGwoZWxlbWVudC5wYXJlbnROb2RlLmNoaWxkcmVuLCBlbGVtZW50KSsxO1xuXG5cdFx0Ly8gbnRoLW9mLXR5cGVcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnQucGFyZW50Tm9kZS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGNoaWxkID0gZWxlbWVudC5wYXJlbnROb2RlLmNoaWxkcmVuW2ldO1xuXHRcdFx0aWYgKGNoaWxkID09PSBlbGVtZW50KSB7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGNoaWxkLnRhZ05hbWUgPT09IGVsZW1lbnQudGFnTmFtZSkge1xuXHRcdFx0XHR0aGlzLmluZGV4Kys7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0aWYgKGVsZW1lbnQuaWQgIT09ICcnKSB7XG5cdFx0aWYgKHR5cGVvZiBlbGVtZW50LmlkID09PSAnc3RyaW5nJykge1xuXHRcdFx0dGhpcy5pZCA9IGVsZW1lbnQuaWQ7XG5cdFx0XHR0aGlzLmlkID0gdGhpcy5pZC5yZXBsYWNlKC86L2csICdcXFxcOicpO1xuXHRcdH1cblx0fVxuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudC5jbGFzc0xpc3QubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgY2NsYXNzID0gZWxlbWVudC5jbGFzc0xpc3RbaV07XG5cdFx0aWYgKGlnbm9yZWRDbGFzc2VzLmluZGV4T2YoY2NsYXNzKSA9PT0gLTEpIHtcblx0XHRcdGNjbGFzcyA9IGNjbGFzcy5yZXBsYWNlKC86L2csICdcXFxcOicpO1xuXHRcdFx0dGhpcy5jbGFzc2VzLnB1c2goY2NsYXNzKTtcblx0XHR9XG5cdH1cbn07XG5cbmZ1bmN0aW9uIEVsZW1lbnRTZWxlY3Rvckxpc3QgKENzc1NlbGVjdG9yKSB7XG5cdHRoaXMuQ3NzU2VsZWN0b3IgPSBDc3NTZWxlY3Rvcjtcbn07XG5cbkVsZW1lbnRTZWxlY3Rvckxpc3QucHJvdG90eXBlID0gbmV3IEFycmF5KCk7XG5cbkVsZW1lbnRTZWxlY3Rvckxpc3QucHJvdG90eXBlLmdldENzc1NlbGVjdG9yID0gZnVuY3Rpb24gKCkge1xuXG5cdHZhciByZXN1bHRTZWxlY3RvcnMgPSBbXTtcblxuXHQvLyBURERcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIHNlbGVjdG9yID0gdGhpc1tpXTtcblxuXHRcdHZhciBpc0ZpcnN0U2VsZWN0b3IgPSBpID09PSB0aGlzLmxlbmd0aC0xO1xuXHRcdHZhciByZXN1bHRTZWxlY3RvciA9IHNlbGVjdG9yLmdldENzc1NlbGVjdG9yKGlzRmlyc3RTZWxlY3Rvcik7XG5cblx0XHRpZiAodGhpcy5Dc3NTZWxlY3Rvci5lbmFibGVTbWFydFRhYmxlU2VsZWN0b3IpIHtcblx0XHRcdGlmIChzZWxlY3Rvci50YWcgPT09ICd0cicpIHtcblx0XHRcdFx0aWYgKHNlbGVjdG9yLmVsZW1lbnQuY2hpbGRyZW4ubGVuZ3RoID09PSAyKSB7XG5cdFx0XHRcdFx0aWYgKHNlbGVjdG9yLmVsZW1lbnQuY2hpbGRyZW5bMF0udGFnTmFtZSA9PT0gJ1REJ1xuXHRcdFx0XHRcdFx0fHwgc2VsZWN0b3IuZWxlbWVudC5jaGlsZHJlblswXS50YWdOYW1lID09PSAnVEgnXG5cdFx0XHRcdFx0XHR8fCBzZWxlY3Rvci5lbGVtZW50LmNoaWxkcmVuWzBdLnRhZ05hbWUgPT09ICdUUicpIHtcblxuXHRcdFx0XHRcdFx0dmFyIHRleHQgPSBzZWxlY3Rvci5lbGVtZW50LmNoaWxkcmVuWzBdLnRleHRDb250ZW50O1xuXHRcdFx0XHRcdFx0dGV4dCA9IHRleHQudHJpbSgpO1xuXG5cdFx0XHRcdFx0XHQvLyBlc2NhcGUgcXVvdGVzXG5cdFx0XHRcdFx0XHR0ZXh0LnJlcGxhY2UoLyhcXFxcKikoJykvZywgZnVuY3Rpb24gKHgpIHtcblx0XHRcdFx0XHRcdFx0dmFyIGwgPSB4Lmxlbmd0aDtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIChsICUgMikgPyB4IDogeC5zdWJzdHJpbmcoMCwgbCAtIDEpICsgXCJcXFxcJ1wiO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRyZXN1bHRTZWxlY3RvciArPSBcIjpjb250YWlucygnXCIgKyB0ZXh0ICsgXCInKVwiO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJlc3VsdFNlbGVjdG9ycy5wdXNoKHJlc3VsdFNlbGVjdG9yKTtcblx0fVxuXG5cdHZhciByZXN1bHRDU1NTZWxlY3RvciA9IHJlc3VsdFNlbGVjdG9ycy5yZXZlcnNlKCkuam9pbignICcpO1xuXHRyZXR1cm4gcmVzdWx0Q1NTU2VsZWN0b3I7XG59O1xuXG5FbGVtZW50U2VsZWN0b3IucHJvdG90eXBlID0ge1xuXG5cdGdldENzc1NlbGVjdG9yOiBmdW5jdGlvbiAoaXNGaXJzdFNlbGVjdG9yKSB7XG5cblx0XHRpZihpc0ZpcnN0U2VsZWN0b3IgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0aXNGaXJzdFNlbGVjdG9yID0gZmFsc2U7XG5cdFx0fVxuXG5cdFx0dmFyIHNlbGVjdG9yID0gdGhpcy50YWc7XG5cdFx0aWYgKHRoaXMuaWQgIT09IG51bGwpIHtcblx0XHRcdHNlbGVjdG9yICs9ICcjJyArIHRoaXMuaWQ7XG5cdFx0fVxuXHRcdGlmICh0aGlzLmNsYXNzZXMubGVuZ3RoKSB7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY2xhc3Nlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRzZWxlY3RvciArPSBcIi5cIiArIHRoaXMuY2xhc3Nlc1tpXTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKHRoaXMuaW5kZXggIT09IG51bGwpIHtcblx0XHRcdHNlbGVjdG9yICs9ICc6bnRoLW9mLXR5cGUoJyArIHRoaXMuaW5kZXggKyAnKSc7XG5cdFx0fVxuXHRcdGlmICh0aGlzLmluZGV4biAhPT0gbnVsbCAmJiB0aGlzLmluZGV4biAhPT0gLTEpIHtcblx0XHRcdHNlbGVjdG9yICs9ICc6bnRoLW9mLXR5cGUobisnICsgdGhpcy5pbmRleG4gKyAnKSc7XG5cdFx0fVxuXHRcdGlmKHRoaXMuaXNEaXJlY3RDaGlsZCAmJiBpc0ZpcnN0U2VsZWN0b3IgPT09IGZhbHNlKSB7XG5cdFx0XHRzZWxlY3RvciA9IFwiPiBcIitzZWxlY3Rvcjtcblx0XHR9XG5cblx0XHRyZXR1cm4gc2VsZWN0b3I7XG5cdH0sXG5cdC8vIG1lcmdlcyB0aGlzIHNlbGVjdG9yIHdpdGggYW5vdGhlciBvbmUuXG5cdG1lcmdlOiBmdW5jdGlvbiAobWVyZ2VTZWxlY3Rvcikge1xuXG5cdFx0aWYgKHRoaXMudGFnICE9PSBtZXJnZVNlbGVjdG9yLnRhZykge1xuXHRcdFx0dGhyb3cgXCJkaWZmZXJlbnQgZWxlbWVudCBzZWxlY3RlZCAodGFnKVwiO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmluZGV4ICE9PSBudWxsKSB7XG5cdFx0XHRpZiAodGhpcy5pbmRleCAhPT0gbWVyZ2VTZWxlY3Rvci5pbmRleCkge1xuXG5cdFx0XHRcdC8vIHVzZSBpbmRleG4gb25seSBmb3IgdHdvIGVsZW1lbnRzXG5cdFx0XHRcdGlmICh0aGlzLmluZGV4biA9PT0gbnVsbCkge1xuXHRcdFx0XHRcdHZhciBpbmRleG4gPSBNYXRoLm1pbihtZXJnZVNlbGVjdG9yLmluZGV4LCB0aGlzLmluZGV4KTtcblx0XHRcdFx0XHRpZiAoaW5kZXhuID4gMSkge1xuXHRcdFx0XHRcdFx0dGhpcy5pbmRleG4gPSBNYXRoLm1pbihtZXJnZVNlbGVjdG9yLmluZGV4LCB0aGlzLmluZGV4KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5pbmRleG4gPSAtMTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHRoaXMuaW5kZXggPSBudWxsO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmKHRoaXMuaXNEaXJlY3RDaGlsZCA9PT0gdHJ1ZSkge1xuXHRcdFx0dGhpcy5pc0RpcmVjdENoaWxkID0gbWVyZ2VTZWxlY3Rvci5pc0RpcmVjdENoaWxkO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmlkICE9PSBudWxsKSB7XG5cdFx0XHRpZiAodGhpcy5pZCAhPT0gbWVyZ2VTZWxlY3Rvci5pZCkge1xuXHRcdFx0XHR0aGlzLmlkID0gbnVsbDtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAodGhpcy5jbGFzc2VzLmxlbmd0aCAhPT0gMCkge1xuXHRcdFx0dmFyIGNsYXNzZXMgPSBuZXcgQXJyYXkoKTtcblxuXHRcdFx0Zm9yICh2YXIgaSBpbiB0aGlzLmNsYXNzZXMpIHtcblx0XHRcdFx0dmFyIGNjbGFzcyA9IHRoaXMuY2xhc3Nlc1tpXTtcblx0XHRcdFx0aWYgKG1lcmdlU2VsZWN0b3IuY2xhc3Nlcy5pbmRleE9mKGNjbGFzcykgIT09IC0xKSB7XG5cdFx0XHRcdFx0Y2xhc3Nlcy5wdXNoKGNjbGFzcyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0dGhpcy5jbGFzc2VzID0gY2xhc3Nlcztcblx0XHR9XG5cdH1cbn07XG5cbkNzc1NlbGVjdG9yLnByb3RvdHlwZSA9IHtcblx0bWVyZ2VFbGVtZW50U2VsZWN0b3JzOiBmdW5jdGlvbiAobmV3U2VsZWNvcnMpIHtcblxuXHRcdGlmIChuZXdTZWxlY29ycy5sZW5ndGggPCAxKSB7XG5cdFx0XHR0aHJvdyBcIk5vIHNlbGVjdG9ycyBzcGVjaWZpZWRcIjtcblx0XHR9XG5cdFx0ZWxzZSBpZiAobmV3U2VsZWNvcnMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRyZXR1cm4gbmV3U2VsZWNvcnNbMF07XG5cdFx0fVxuXG5cdFx0Ly8gY2hlY2sgc2VsZWN0b3IgdG90YWwgY291bnRcblx0XHR2YXIgZWxlbWVudENvdW50SW5TZWxlY3RvciA9IG5ld1NlbGVjb3JzWzBdLmxlbmd0aDtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG5ld1NlbGVjb3JzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgc2VsZWN0b3IgPSBuZXdTZWxlY29yc1tpXTtcblx0XHRcdGlmIChzZWxlY3Rvci5sZW5ndGggIT09IGVsZW1lbnRDb3VudEluU2VsZWN0b3IpIHtcblx0XHRcdFx0dGhyb3cgXCJJbnZhbGlkIGVsZW1lbnQgY291bnQgaW4gc2VsZWN0b3JcIjtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBtZXJnZSBzZWxlY3RvcnNcblx0XHR2YXIgcmVzdWx0aW5nRWxlbWVudHMgPSBuZXdTZWxlY29yc1swXTtcblx0XHRmb3IgKHZhciBpID0gMTsgaSA8IG5ld1NlbGVjb3JzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgbWVyZ2VFbGVtZW50cyA9IG5ld1NlbGVjb3JzW2ldO1xuXG5cdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGVsZW1lbnRDb3VudEluU2VsZWN0b3I7IGorKykge1xuXHRcdFx0XHRyZXN1bHRpbmdFbGVtZW50c1tqXS5tZXJnZShtZXJnZUVsZW1lbnRzW2pdKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdGluZ0VsZW1lbnRzO1xuXHR9LFxuXHRzdHJpcFNlbGVjdG9yOiBmdW5jdGlvbiAoc2VsZWN0b3JzKSB7XG5cblx0XHR2YXIgY3NzU2VsZXRvciA9IHNlbGVjdG9ycy5nZXRDc3NTZWxlY3RvcigpO1xuXHRcdHZhciBiYXNlU2VsZWN0ZWRFbGVtZW50cyA9IHRoaXMucXVlcnkoY3NzU2VsZXRvcik7XG5cblx0XHR2YXIgY29tcGFyZUVsZW1lbnRzID0gZnVuY3Rpb24gKGVsZW1lbnRzKSB7XG5cdFx0XHRpZiAoYmFzZVNlbGVjdGVkRWxlbWVudHMubGVuZ3RoICE9PSBlbGVtZW50cy5sZW5ndGgpIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGJhc2VTZWxlY3RlZEVsZW1lbnRzLmxlbmd0aDsgaisrKSB7XG5cdFx0XHRcdGlmIChbXS5pbmRleE9mLmNhbGwoZWxlbWVudHMsIGJhc2VTZWxlY3RlZEVsZW1lbnRzW2pdKSA9PT0gLTEpIHtcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH07XG5cdFx0Ly8gc3RyaXAgaW5kZXhlc1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZWN0b3JzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgc2VsZWN0b3IgPSBzZWxlY3RvcnNbaV07XG5cdFx0XHRpZiAoc2VsZWN0b3IuaW5kZXggIT09IG51bGwpIHtcblx0XHRcdFx0dmFyIGluZGV4ID0gc2VsZWN0b3IuaW5kZXg7XG5cdFx0XHRcdHNlbGVjdG9yLmluZGV4ID0gbnVsbDtcblx0XHRcdFx0dmFyIGNzc1NlbGV0b3IgPSBzZWxlY3RvcnMuZ2V0Q3NzU2VsZWN0b3IoKTtcblx0XHRcdFx0dmFyIG5ld1NlbGVjdGVkRWxlbWVudHMgPSB0aGlzLnF1ZXJ5KGNzc1NlbGV0b3IpO1xuXHRcdFx0XHQvLyBpZiByZXN1bHRzIGRvZXNuJ3QgbWF0Y2ggdGhlbiB1bmRvIGNoYW5nZXNcblx0XHRcdFx0aWYgKCFjb21wYXJlRWxlbWVudHMobmV3U2VsZWN0ZWRFbGVtZW50cykpIHtcblx0XHRcdFx0XHRzZWxlY3Rvci5pbmRleCA9IGluZGV4O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gc3RyaXAgaXNEaXJlY3RDaGlsZFxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZWN0b3JzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgc2VsZWN0b3IgPSBzZWxlY3RvcnNbaV07XG5cdFx0XHRpZiAoc2VsZWN0b3IuaXNEaXJlY3RDaGlsZCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRzZWxlY3Rvci5pc0RpcmVjdENoaWxkID0gZmFsc2U7XG5cdFx0XHRcdHZhciBjc3NTZWxldG9yID0gc2VsZWN0b3JzLmdldENzc1NlbGVjdG9yKCk7XG5cdFx0XHRcdHZhciBuZXdTZWxlY3RlZEVsZW1lbnRzID0gdGhpcy5xdWVyeShjc3NTZWxldG9yKTtcblx0XHRcdFx0Ly8gaWYgcmVzdWx0cyBkb2Vzbid0IG1hdGNoIHRoZW4gdW5kbyBjaGFuZ2VzXG5cdFx0XHRcdGlmICghY29tcGFyZUVsZW1lbnRzKG5ld1NlbGVjdGVkRWxlbWVudHMpKSB7XG5cdFx0XHRcdFx0c2VsZWN0b3IuaXNEaXJlY3RDaGlsZCA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBzdHJpcCBpZHNcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHNlbGVjdG9ycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHNlbGVjdG9yID0gc2VsZWN0b3JzW2ldO1xuXHRcdFx0aWYgKHNlbGVjdG9yLmlkICE9PSBudWxsKSB7XG5cdFx0XHRcdHZhciBpZCA9IHNlbGVjdG9yLmlkO1xuXHRcdFx0XHRzZWxlY3Rvci5pZCA9IG51bGw7XG5cdFx0XHRcdHZhciBjc3NTZWxldG9yID0gc2VsZWN0b3JzLmdldENzc1NlbGVjdG9yKCk7XG5cdFx0XHRcdHZhciBuZXdTZWxlY3RlZEVsZW1lbnRzID0gdGhpcy5xdWVyeShjc3NTZWxldG9yKTtcblx0XHRcdFx0Ly8gaWYgcmVzdWx0cyBkb2Vzbid0IG1hdGNoIHRoZW4gdW5kbyBjaGFuZ2VzXG5cdFx0XHRcdGlmICghY29tcGFyZUVsZW1lbnRzKG5ld1NlbGVjdGVkRWxlbWVudHMpKSB7XG5cdFx0XHRcdFx0c2VsZWN0b3IuaWQgPSBpZDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIHN0cmlwIGNsYXNzZXNcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHNlbGVjdG9ycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHNlbGVjdG9yID0gc2VsZWN0b3JzW2ldO1xuXHRcdFx0aWYgKHNlbGVjdG9yLmNsYXNzZXMubGVuZ3RoICE9PSAwKSB7XG5cdFx0XHRcdGZvciAodmFyIGogPSBzZWxlY3Rvci5jbGFzc2VzLmxlbmd0aCAtIDE7IGogPiAwOyBqLS0pIHtcblx0XHRcdFx0XHR2YXIgY2NsYXNzID0gc2VsZWN0b3IuY2xhc3Nlc1tqXTtcblx0XHRcdFx0XHRzZWxlY3Rvci5jbGFzc2VzLnNwbGljZShqLCAxKTtcblx0XHRcdFx0XHR2YXIgY3NzU2VsZXRvciA9IHNlbGVjdG9ycy5nZXRDc3NTZWxlY3RvcigpO1xuXHRcdFx0XHRcdHZhciBuZXdTZWxlY3RlZEVsZW1lbnRzID0gdGhpcy5xdWVyeShjc3NTZWxldG9yKTtcblx0XHRcdFx0XHQvLyBpZiByZXN1bHRzIGRvZXNuJ3QgbWF0Y2ggdGhlbiB1bmRvIGNoYW5nZXNcblx0XHRcdFx0XHRpZiAoIWNvbXBhcmVFbGVtZW50cyhuZXdTZWxlY3RlZEVsZW1lbnRzKSkge1xuXHRcdFx0XHRcdFx0c2VsZWN0b3IuY2xhc3Nlcy5zcGxpY2UoaiwgMCwgY2NsYXNzKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBzdHJpcCB0YWdzXG5cdFx0Zm9yICh2YXIgaSA9IHNlbGVjdG9ycy5sZW5ndGggLSAxOyBpID4gMDsgaS0tKSB7XG5cdFx0XHR2YXIgc2VsZWN0b3IgPSBzZWxlY3RvcnNbaV07XG5cdFx0XHRzZWxlY3RvcnMuc3BsaWNlKGksIDEpO1xuXHRcdFx0dmFyIGNzc1NlbGV0b3IgPSBzZWxlY3RvcnMuZ2V0Q3NzU2VsZWN0b3IoKTtcblx0XHRcdHZhciBuZXdTZWxlY3RlZEVsZW1lbnRzID0gdGhpcy5xdWVyeShjc3NTZWxldG9yKTtcblx0XHRcdC8vIGlmIHJlc3VsdHMgZG9lc24ndCBtYXRjaCB0aGVuIHVuZG8gY2hhbmdlc1xuXHRcdFx0aWYgKCFjb21wYXJlRWxlbWVudHMobmV3U2VsZWN0ZWRFbGVtZW50cykpIHtcblx0XHRcdFx0c2VsZWN0b3JzLnNwbGljZShpLCAwLCBzZWxlY3Rvcik7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHNlbGVjdG9ycztcblx0fSxcblx0Z2V0RWxlbWVudFNlbGVjdG9yczogZnVuY3Rpb24gKGVsZW1lbnRzLCB0b3ApIHtcblx0XHR2YXIgZWxlbWVudFNlbGVjdG9ycyA9IFtdO1xuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGVsZW1lbnQgPSBlbGVtZW50c1tpXTtcblx0XHRcdHZhciBlbGVtZW50U2VsZWN0b3IgPSB0aGlzLmdldEVsZW1lbnRTZWxlY3RvcihlbGVtZW50LCB0b3ApO1xuXHRcdFx0ZWxlbWVudFNlbGVjdG9ycy5wdXNoKGVsZW1lbnRTZWxlY3Rvcik7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGVsZW1lbnRTZWxlY3RvcnM7XG5cdH0sXG5cdGdldEVsZW1lbnRTZWxlY3RvcjogZnVuY3Rpb24gKGVsZW1lbnQsIHRvcCkge1xuXG5cdFx0dmFyIGVsZW1lbnRTZWxlY3Rvckxpc3QgPSBuZXcgRWxlbWVudFNlbGVjdG9yTGlzdCh0aGlzKTtcblx0XHR3aGlsZSAodHJ1ZSkge1xuXHRcdFx0aWYgKGVsZW1lbnQgPT09IHRoaXMucGFyZW50KSB7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAoZWxlbWVudCA9PT0gdW5kZWZpbmVkIHx8IGVsZW1lbnQgPT09IHRoaXMuZG9jdW1lbnQpIHtcblx0XHRcdFx0dGhyb3cgJ2VsZW1lbnQgaXMgbm90IGEgY2hpbGQgb2YgdGhlIGdpdmVuIHBhcmVudCc7XG5cdFx0XHR9XG5cdFx0XHRpZiAodGhpcy5pc0lnbm9yZWRUYWcoZWxlbWVudC50YWdOYW1lKSkge1xuXG5cdFx0XHRcdGVsZW1lbnQgPSBlbGVtZW50LnBhcmVudE5vZGU7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRvcCA+IDApIHtcblx0XHRcdFx0dG9wLS07XG5cdFx0XHRcdGVsZW1lbnQgPSBlbGVtZW50LnBhcmVudE5vZGU7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgc2VsZWN0b3IgPSBuZXcgRWxlbWVudFNlbGVjdG9yKGVsZW1lbnQsIHRoaXMuaWdub3JlZENsYXNzZXMpO1xuXHRcdFx0Ly8gZG9jdW1lbnQgZG9lcyBub3QgaGF2ZSBhIHRhZ05hbWVcblx0XHRcdGlmKGVsZW1lbnQucGFyZW50Tm9kZSA9PT0gdGhpcy5kb2N1bWVudCB8fCB0aGlzLmlzSWdub3JlZFRhZyhlbGVtZW50LnBhcmVudE5vZGUudGFnTmFtZSkpIHtcblx0XHRcdFx0c2VsZWN0b3IuaXNEaXJlY3RDaGlsZCA9IGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRlbGVtZW50U2VsZWN0b3JMaXN0LnB1c2goc2VsZWN0b3IpO1xuXHRcdFx0ZWxlbWVudCA9IGVsZW1lbnQucGFyZW50Tm9kZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZWxlbWVudFNlbGVjdG9yTGlzdDtcblx0fSxcblxuICAgIC8qKlxuICAgICAqIENvbXBhcmVzIHdoZXRoZXIgdHdvIGVsZW1lbnRzIGFyZSBzaW1pbGFyLiBTaW1pbGFyIGVsZW1lbnRzIHNob3VsZFxuICAgICAqIGhhdmUgYSBjb21tb24gcGFycmVudCBhbmQgYWxsIHBhcmVudCBlbGVtZW50cyBzaG91bGQgYmUgdGhlIHNhbWUgdHlwZS5cbiAgICAgKiBAcGFyYW0gZWxlbWVudDFcbiAgICAgKiBAcGFyYW0gZWxlbWVudDJcbiAgICAgKi9cbiAgICBjaGVja1NpbWlsYXJFbGVtZW50czogZnVuY3Rpb24oZWxlbWVudDEsIGVsZW1lbnQyKSB7XG5cbiAgICAgICAgd2hpbGUgKHRydWUpIHtcblxuICAgICAgICAgICAgaWYoZWxlbWVudDEudGFnTmFtZSAhPT0gZWxlbWVudDIudGFnTmFtZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKGVsZW1lbnQxID09PSBlbGVtZW50Mikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBzdG9wIGF0IGJvZHkgdGFnXG4gICAgICAgICAgICBpZiAoZWxlbWVudDEgPT09IHVuZGVmaW5lZCB8fCBlbGVtZW50MS50YWdOYW1lID09PSAnYm9keSdcbiAgICAgICAgICAgICAgICB8fCBlbGVtZW50MS50YWdOYW1lID09PSAnQk9EWScpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZWxlbWVudDIgPT09IHVuZGVmaW5lZCB8fCBlbGVtZW50Mi50YWdOYW1lID09PSAnYm9keSdcbiAgICAgICAgICAgICAgICB8fCBlbGVtZW50Mi50YWdOYW1lID09PSAnQk9EWScpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGVsZW1lbnQxID0gZWxlbWVudDEucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIGVsZW1lbnQyID0gZWxlbWVudDIucGFyZW50Tm9kZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHcm91cHMgZWxlbWVudHMgaW50byBncm91cHMgaWYgdGhlIGVtZWxlbnRzIGFyZSBub3Qgc2ltaWxhclxuICAgICAqIEBwYXJhbSBlbGVtZW50c1xuICAgICAqL1xuICAgIGdldEVsZW1lbnRHcm91cHM6IGZ1bmN0aW9uKGVsZW1lbnRzKSB7XG5cbiAgICAgICAgLy8gZmlyc3QgZWxtZW50IGlzIGluIHRoZSBmaXJzdCBncm91cFxuICAgICAgICAvLyBAVE9ETyBtYXliZSBpIGRvbnQgbmVlZCB0aGlzP1xuICAgICAgICB2YXIgZ3JvdXBzID0gW1tlbGVtZW50c1swXV1dO1xuXG4gICAgICAgIGZvcih2YXIgaSA9IDE7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGVsZW1lbnROZXcgPSBlbGVtZW50c1tpXTtcbiAgICAgICAgICAgIHZhciBhZGRlZFRvR3JvdXAgPSBmYWxzZTtcbiAgICAgICAgICAgIGZvcih2YXIgaiA9IDA7IGogPCBncm91cHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgZ3JvdXAgPSBncm91cHNbal07XG4gICAgICAgICAgICAgICAgdmFyIGVsZW1lbnRHcm91cCA9IGdyb3VwWzBdO1xuICAgICAgICAgICAgICAgIGlmKHRoaXMuY2hlY2tTaW1pbGFyRWxlbWVudHMoZWxlbWVudE5ldywgZWxlbWVudEdyb3VwKSkge1xuICAgICAgICAgICAgICAgICAgICBncm91cC5wdXNoKGVsZW1lbnROZXcpO1xuICAgICAgICAgICAgICAgICAgICBhZGRlZFRvR3JvdXAgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGFkZCBuZXcgZ3JvdXBcbiAgICAgICAgICAgIGlmKCFhZGRlZFRvR3JvdXApIHtcbiAgICAgICAgICAgICAgICBncm91cHMucHVzaChbZWxlbWVudE5ld10pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGdyb3VwcztcbiAgICB9LFxuXHRnZXRDc3NTZWxlY3RvcjogZnVuY3Rpb24gKGVsZW1lbnRzLCB0b3ApIHtcblxuXHRcdHRvcCA9IHRvcCB8fCAwO1xuXG5cdFx0dmFyIGVuYWJsZVNtYXJ0VGFibGVTZWxlY3RvciA9IHRoaXMuZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yO1xuXHRcdGlmIChlbGVtZW50cy5sZW5ndGggPiAxKSB7XG5cdFx0XHR0aGlzLmVuYWJsZVNtYXJ0VGFibGVTZWxlY3RvciA9IGZhbHNlO1xuXHRcdH1cblxuICAgICAgICAvLyBncm91cCBlbGVtZW50cyBpbnRvIHNpbWlsYXJpdHkgZ3JvdXBzXG4gICAgICAgIHZhciBlbGVtZW50R3JvdXBzID0gdGhpcy5nZXRFbGVtZW50R3JvdXBzKGVsZW1lbnRzKTtcblxuICAgICAgICB2YXIgcmVzdWx0Q1NTU2VsZWN0b3I7XG5cbiAgICAgICAgaWYodGhpcy5hbGxvd011bHRpcGxlU2VsZWN0b3JzKSB7XG5cbiAgICAgICAgICAgIHZhciBncm91cFNlbGVjdG9ycyA9IFtdO1xuXG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgZWxlbWVudEdyb3Vwcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBncm91cEVsZW1lbnRzID0gZWxlbWVudEdyb3Vwc1tpXTtcblxuICAgICAgICAgICAgICAgIHZhciBlbGVtZW50U2VsZWN0b3JzID0gdGhpcy5nZXRFbGVtZW50U2VsZWN0b3JzKGdyb3VwRWxlbWVudHMsIHRvcCk7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdFNlbGVjdG9yID0gdGhpcy5tZXJnZUVsZW1lbnRTZWxlY3RvcnMoZWxlbWVudFNlbGVjdG9ycyk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZW5hYmxlUmVzdWx0U3RyaXBwaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdFNlbGVjdG9yID0gdGhpcy5zdHJpcFNlbGVjdG9yKHJlc3VsdFNlbGVjdG9yKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBncm91cFNlbGVjdG9ycy5wdXNoKHJlc3VsdFNlbGVjdG9yLmdldENzc1NlbGVjdG9yKCkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXN1bHRDU1NTZWxlY3RvciA9IGdyb3VwU2VsZWN0b3JzLmpvaW4oJywgJyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZihlbGVtZW50R3JvdXBzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgICAgICAgICAgIHRocm93IFwiZm91bmQgbXVsdGlwbGUgZWxlbWVudCBncm91cHMsIGJ1dCBhbGxvd011bHRpcGxlU2VsZWN0b3JzIGRpc2FibGVkXCI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBlbGVtZW50U2VsZWN0b3JzID0gdGhpcy5nZXRFbGVtZW50U2VsZWN0b3JzKGVsZW1lbnRzLCB0b3ApO1xuICAgICAgICAgICAgdmFyIHJlc3VsdFNlbGVjdG9yID0gdGhpcy5tZXJnZUVsZW1lbnRTZWxlY3RvcnMoZWxlbWVudFNlbGVjdG9ycyk7XG4gICAgICAgICAgICBpZiAodGhpcy5lbmFibGVSZXN1bHRTdHJpcHBpbmcpIHtcbiAgICAgICAgICAgICAgICByZXN1bHRTZWxlY3RvciA9IHRoaXMuc3RyaXBTZWxlY3RvcihyZXN1bHRTZWxlY3Rvcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlc3VsdENTU1NlbGVjdG9yID0gcmVzdWx0U2VsZWN0b3IuZ2V0Q3NzU2VsZWN0b3IoKTtcbiAgICAgICAgfVxuXG5cdFx0dGhpcy5lbmFibGVTbWFydFRhYmxlU2VsZWN0b3IgPSBlbmFibGVTbWFydFRhYmxlU2VsZWN0b3I7XG5cblx0XHQvLyBzdHJpcCBkb3duIHNlbGVjdG9yXG5cdFx0cmV0dXJuIHJlc3VsdENTU1NlbGVjdG9yO1xuXHR9LFxuXHRpc0lnbm9yZWRUYWc6IGZ1bmN0aW9uICh0YWcpIHtcblx0XHRyZXR1cm4gdGhpcy5pZ25vcmVkVGFncy5pbmRleE9mKHRhZy50b0xvd2VyQ2FzZSgpKSAhPT0gLTE7XG5cdH1cbn07XG4iLCJcbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9saWIvanF1ZXJ5LWRlZmVycmVkJyk7IiwidmFyIGpRdWVyeSA9IG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vanF1ZXJ5LWNvcmUuanNcIiksXG5cdGNvcmVfcnNwYWNlID0gL1xccysvO1xuLyoqXG4qIGpRdWVyeSBDYWxsYmFja3NcbipcbiogQ29kZSBmcm9tOiBodHRwczovL2dpdGh1Yi5jb20vanF1ZXJ5L2pxdWVyeS9ibG9iL21hc3Rlci9zcmMvY2FsbGJhY2tzLmpzXG4qXG4qL1xuXG5cbi8vIFN0cmluZyB0byBPYmplY3Qgb3B0aW9ucyBmb3JtYXQgY2FjaGVcbnZhciBvcHRpb25zQ2FjaGUgPSB7fTtcblxuLy8gQ29udmVydCBTdHJpbmctZm9ybWF0dGVkIG9wdGlvbnMgaW50byBPYmplY3QtZm9ybWF0dGVkIG9uZXMgYW5kIHN0b3JlIGluIGNhY2hlXG5mdW5jdGlvbiBjcmVhdGVPcHRpb25zKCBvcHRpb25zICkge1xuXHR2YXIgb2JqZWN0ID0gb3B0aW9uc0NhY2hlWyBvcHRpb25zIF0gPSB7fTtcblx0alF1ZXJ5LmVhY2goIG9wdGlvbnMuc3BsaXQoIGNvcmVfcnNwYWNlICksIGZ1bmN0aW9uKCBfLCBmbGFnICkge1xuXHRcdG9iamVjdFsgZmxhZyBdID0gdHJ1ZTtcblx0fSk7XG5cdHJldHVybiBvYmplY3Q7XG59XG5cbi8qXG4gKiBDcmVhdGUgYSBjYWxsYmFjayBsaXN0IHVzaW5nIHRoZSBmb2xsb3dpbmcgcGFyYW1ldGVyczpcbiAqXG4gKlx0b3B0aW9uczogYW4gb3B0aW9uYWwgbGlzdCBvZiBzcGFjZS1zZXBhcmF0ZWQgb3B0aW9ucyB0aGF0IHdpbGwgY2hhbmdlIGhvd1xuICpcdFx0XHR0aGUgY2FsbGJhY2sgbGlzdCBiZWhhdmVzIG9yIGEgbW9yZSB0cmFkaXRpb25hbCBvcHRpb24gb2JqZWN0XG4gKlxuICogQnkgZGVmYXVsdCBhIGNhbGxiYWNrIGxpc3Qgd2lsbCBhY3QgbGlrZSBhbiBldmVudCBjYWxsYmFjayBsaXN0IGFuZCBjYW4gYmVcbiAqIFwiZmlyZWRcIiBtdWx0aXBsZSB0aW1lcy5cbiAqXG4gKiBQb3NzaWJsZSBvcHRpb25zOlxuICpcbiAqXHRvbmNlOlx0XHRcdHdpbGwgZW5zdXJlIHRoZSBjYWxsYmFjayBsaXN0IGNhbiBvbmx5IGJlIGZpcmVkIG9uY2UgKGxpa2UgYSBEZWZlcnJlZClcbiAqXG4gKlx0bWVtb3J5Olx0XHRcdHdpbGwga2VlcCB0cmFjayBvZiBwcmV2aW91cyB2YWx1ZXMgYW5kIHdpbGwgY2FsbCBhbnkgY2FsbGJhY2sgYWRkZWRcbiAqXHRcdFx0XHRcdGFmdGVyIHRoZSBsaXN0IGhhcyBiZWVuIGZpcmVkIHJpZ2h0IGF3YXkgd2l0aCB0aGUgbGF0ZXN0IFwibWVtb3JpemVkXCJcbiAqXHRcdFx0XHRcdHZhbHVlcyAobGlrZSBhIERlZmVycmVkKVxuICpcbiAqXHR1bmlxdWU6XHRcdFx0d2lsbCBlbnN1cmUgYSBjYWxsYmFjayBjYW4gb25seSBiZSBhZGRlZCBvbmNlIChubyBkdXBsaWNhdGUgaW4gdGhlIGxpc3QpXG4gKlxuICpcdHN0b3BPbkZhbHNlOlx0aW50ZXJydXB0IGNhbGxpbmdzIHdoZW4gYSBjYWxsYmFjayByZXR1cm5zIGZhbHNlXG4gKlxuICovXG5qUXVlcnkuQ2FsbGJhY2tzID0gZnVuY3Rpb24oIG9wdGlvbnMgKSB7XG5cblx0Ly8gQ29udmVydCBvcHRpb25zIGZyb20gU3RyaW5nLWZvcm1hdHRlZCB0byBPYmplY3QtZm9ybWF0dGVkIGlmIG5lZWRlZFxuXHQvLyAod2UgY2hlY2sgaW4gY2FjaGUgZmlyc3QpXG5cdG9wdGlvbnMgPSB0eXBlb2Ygb3B0aW9ucyA9PT0gXCJzdHJpbmdcIiA/XG5cdFx0KCBvcHRpb25zQ2FjaGVbIG9wdGlvbnMgXSB8fCBjcmVhdGVPcHRpb25zKCBvcHRpb25zICkgKSA6XG5cdFx0alF1ZXJ5LmV4dGVuZCgge30sIG9wdGlvbnMgKTtcblxuXHR2YXIgLy8gTGFzdCBmaXJlIHZhbHVlIChmb3Igbm9uLWZvcmdldHRhYmxlIGxpc3RzKVxuXHRcdG1lbW9yeSxcblx0XHQvLyBGbGFnIHRvIGtub3cgaWYgbGlzdCB3YXMgYWxyZWFkeSBmaXJlZFxuXHRcdGZpcmVkLFxuXHRcdC8vIEZsYWcgdG8ga25vdyBpZiBsaXN0IGlzIGN1cnJlbnRseSBmaXJpbmdcblx0XHRmaXJpbmcsXG5cdFx0Ly8gRmlyc3QgY2FsbGJhY2sgdG8gZmlyZSAodXNlZCBpbnRlcm5hbGx5IGJ5IGFkZCBhbmQgZmlyZVdpdGgpXG5cdFx0ZmlyaW5nU3RhcnQsXG5cdFx0Ly8gRW5kIG9mIHRoZSBsb29wIHdoZW4gZmlyaW5nXG5cdFx0ZmlyaW5nTGVuZ3RoLFxuXHRcdC8vIEluZGV4IG9mIGN1cnJlbnRseSBmaXJpbmcgY2FsbGJhY2sgKG1vZGlmaWVkIGJ5IHJlbW92ZSBpZiBuZWVkZWQpXG5cdFx0ZmlyaW5nSW5kZXgsXG5cdFx0Ly8gQWN0dWFsIGNhbGxiYWNrIGxpc3Rcblx0XHRsaXN0ID0gW10sXG5cdFx0Ly8gU3RhY2sgb2YgZmlyZSBjYWxscyBmb3IgcmVwZWF0YWJsZSBsaXN0c1xuXHRcdHN0YWNrID0gIW9wdGlvbnMub25jZSAmJiBbXSxcblx0XHQvLyBGaXJlIGNhbGxiYWNrc1xuXHRcdGZpcmUgPSBmdW5jdGlvbiggZGF0YSApIHtcblx0XHRcdG1lbW9yeSA9IG9wdGlvbnMubWVtb3J5ICYmIGRhdGE7XG5cdFx0XHRmaXJlZCA9IHRydWU7XG5cdFx0XHRmaXJpbmdJbmRleCA9IGZpcmluZ1N0YXJ0IHx8IDA7XG5cdFx0XHRmaXJpbmdTdGFydCA9IDA7XG5cdFx0XHRmaXJpbmdMZW5ndGggPSBsaXN0Lmxlbmd0aDtcblx0XHRcdGZpcmluZyA9IHRydWU7XG5cdFx0XHRmb3IgKCA7IGxpc3QgJiYgZmlyaW5nSW5kZXggPCBmaXJpbmdMZW5ndGg7IGZpcmluZ0luZGV4KysgKSB7XG5cdFx0XHRcdGlmICggbGlzdFsgZmlyaW5nSW5kZXggXS5hcHBseSggZGF0YVsgMCBdLCBkYXRhWyAxIF0gKSA9PT0gZmFsc2UgJiYgb3B0aW9ucy5zdG9wT25GYWxzZSApIHtcblx0XHRcdFx0XHRtZW1vcnkgPSBmYWxzZTsgLy8gVG8gcHJldmVudCBmdXJ0aGVyIGNhbGxzIHVzaW5nIGFkZFxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRmaXJpbmcgPSBmYWxzZTtcblx0XHRcdGlmICggbGlzdCApIHtcblx0XHRcdFx0aWYgKCBzdGFjayApIHtcblx0XHRcdFx0XHRpZiAoIHN0YWNrLmxlbmd0aCApIHtcblx0XHRcdFx0XHRcdGZpcmUoIHN0YWNrLnNoaWZ0KCkgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSBpZiAoIG1lbW9yeSApIHtcblx0XHRcdFx0XHRsaXN0ID0gW107XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0c2VsZi5kaXNhYmxlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LFxuXHRcdC8vIEFjdHVhbCBDYWxsYmFja3Mgb2JqZWN0XG5cdFx0c2VsZiA9IHtcblx0XHRcdC8vIEFkZCBhIGNhbGxiYWNrIG9yIGEgY29sbGVjdGlvbiBvZiBjYWxsYmFja3MgdG8gdGhlIGxpc3Rcblx0XHRcdGFkZDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICggbGlzdCApIHtcblx0XHRcdFx0XHQvLyBGaXJzdCwgd2Ugc2F2ZSB0aGUgY3VycmVudCBsZW5ndGhcblx0XHRcdFx0XHR2YXIgc3RhcnQgPSBsaXN0Lmxlbmd0aDtcblx0XHRcdFx0XHQoZnVuY3Rpb24gYWRkKCBhcmdzICkge1xuXHRcdFx0XHRcdFx0alF1ZXJ5LmVhY2goIGFyZ3MsIGZ1bmN0aW9uKCBfLCBhcmcgKSB7XG5cdFx0XHRcdFx0XHRcdHZhciB0eXBlID0galF1ZXJ5LnR5cGUoIGFyZyApO1xuXHRcdFx0XHRcdFx0XHRpZiAoIHR5cGUgPT09IFwiZnVuY3Rpb25cIiApIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoICFvcHRpb25zLnVuaXF1ZSB8fCAhc2VsZi5oYXMoIGFyZyApICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0bGlzdC5wdXNoKCBhcmcgKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoIGFyZyAmJiBhcmcubGVuZ3RoICYmIHR5cGUgIT09IFwic3RyaW5nXCIgKSB7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gSW5zcGVjdCByZWN1cnNpdmVseVxuXHRcdFx0XHRcdFx0XHRcdGFkZCggYXJnICk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH0pKCBhcmd1bWVudHMgKTtcblx0XHRcdFx0XHQvLyBEbyB3ZSBuZWVkIHRvIGFkZCB0aGUgY2FsbGJhY2tzIHRvIHRoZVxuXHRcdFx0XHRcdC8vIGN1cnJlbnQgZmlyaW5nIGJhdGNoP1xuXHRcdFx0XHRcdGlmICggZmlyaW5nICkge1xuXHRcdFx0XHRcdFx0ZmlyaW5nTGVuZ3RoID0gbGlzdC5sZW5ndGg7XG5cdFx0XHRcdFx0Ly8gV2l0aCBtZW1vcnksIGlmIHdlJ3JlIG5vdCBmaXJpbmcgdGhlblxuXHRcdFx0XHRcdC8vIHdlIHNob3VsZCBjYWxsIHJpZ2h0IGF3YXlcblx0XHRcdFx0XHR9IGVsc2UgaWYgKCBtZW1vcnkgKSB7XG5cdFx0XHRcdFx0XHRmaXJpbmdTdGFydCA9IHN0YXJ0O1xuXHRcdFx0XHRcdFx0ZmlyZSggbWVtb3J5ICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fSxcblx0XHRcdC8vIFJlbW92ZSBhIGNhbGxiYWNrIGZyb20gdGhlIGxpc3Rcblx0XHRcdHJlbW92ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICggbGlzdCApIHtcblx0XHRcdFx0XHRqUXVlcnkuZWFjaCggYXJndW1lbnRzLCBmdW5jdGlvbiggXywgYXJnICkge1xuXHRcdFx0XHRcdFx0dmFyIGluZGV4O1xuXHRcdFx0XHRcdFx0d2hpbGUoICggaW5kZXggPSBqUXVlcnkuaW5BcnJheSggYXJnLCBsaXN0LCBpbmRleCApICkgPiAtMSApIHtcblx0XHRcdFx0XHRcdFx0bGlzdC5zcGxpY2UoIGluZGV4LCAxICk7XG5cdFx0XHRcdFx0XHRcdC8vIEhhbmRsZSBmaXJpbmcgaW5kZXhlc1xuXHRcdFx0XHRcdFx0XHRpZiAoIGZpcmluZyApIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoIGluZGV4IDw9IGZpcmluZ0xlbmd0aCApIHtcblx0XHRcdFx0XHRcdFx0XHRcdGZpcmluZ0xlbmd0aC0tO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRpZiAoIGluZGV4IDw9IGZpcmluZ0luZGV4ICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0ZmlyaW5nSW5kZXgtLTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH0sXG5cdFx0XHQvLyBDb250cm9sIGlmIGEgZ2l2ZW4gY2FsbGJhY2sgaXMgaW4gdGhlIGxpc3Rcblx0XHRcdGhhczogZnVuY3Rpb24oIGZuICkge1xuXHRcdFx0XHRyZXR1cm4galF1ZXJ5LmluQXJyYXkoIGZuLCBsaXN0ICkgPiAtMTtcblx0XHRcdH0sXG5cdFx0XHQvLyBSZW1vdmUgYWxsIGNhbGxiYWNrcyBmcm9tIHRoZSBsaXN0XG5cdFx0XHRlbXB0eTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGxpc3QgPSBbXTtcblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gSGF2ZSB0aGUgbGlzdCBkbyBub3RoaW5nIGFueW1vcmVcblx0XHRcdGRpc2FibGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRsaXN0ID0gc3RhY2sgPSBtZW1vcnkgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fSxcblx0XHRcdC8vIElzIGl0IGRpc2FibGVkP1xuXHRcdFx0ZGlzYWJsZWQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gIWxpc3Q7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gTG9jayB0aGUgbGlzdCBpbiBpdHMgY3VycmVudCBzdGF0ZVxuXHRcdFx0bG9jazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHN0YWNrID0gdW5kZWZpbmVkO1xuXHRcdFx0XHRpZiAoICFtZW1vcnkgKSB7XG5cdFx0XHRcdFx0c2VsZi5kaXNhYmxlKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gSXMgaXQgbG9ja2VkP1xuXHRcdFx0bG9ja2VkOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuICFzdGFjaztcblx0XHRcdH0sXG5cdFx0XHQvLyBDYWxsIGFsbCBjYWxsYmFja3Mgd2l0aCB0aGUgZ2l2ZW4gY29udGV4dCBhbmQgYXJndW1lbnRzXG5cdFx0XHRmaXJlV2l0aDogZnVuY3Rpb24oIGNvbnRleHQsIGFyZ3MgKSB7XG5cdFx0XHRcdGFyZ3MgPSBhcmdzIHx8IFtdO1xuXHRcdFx0XHRhcmdzID0gWyBjb250ZXh0LCBhcmdzLnNsaWNlID8gYXJncy5zbGljZSgpIDogYXJncyBdO1xuXHRcdFx0XHRpZiAoIGxpc3QgJiYgKCAhZmlyZWQgfHwgc3RhY2sgKSApIHtcblx0XHRcdFx0XHRpZiAoIGZpcmluZyApIHtcblx0XHRcdFx0XHRcdHN0YWNrLnB1c2goIGFyZ3MgKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0ZmlyZSggYXJncyApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH0sXG5cdFx0XHQvLyBDYWxsIGFsbCB0aGUgY2FsbGJhY2tzIHdpdGggdGhlIGdpdmVuIGFyZ3VtZW50c1xuXHRcdFx0ZmlyZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHNlbGYuZmlyZVdpdGgoIHRoaXMsIGFyZ3VtZW50cyApO1xuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH0sXG5cdFx0XHQvLyBUbyBrbm93IGlmIHRoZSBjYWxsYmFja3MgaGF2ZSBhbHJlYWR5IGJlZW4gY2FsbGVkIGF0IGxlYXN0IG9uY2Vcblx0XHRcdGZpcmVkOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuICEhZmlyZWQ7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRyZXR1cm4gc2VsZjtcbn07XG5cbiIsIi8qKlxuKiBqUXVlcnkgY29yZSBvYmplY3QuXG4qXG4qIFdvcmtlciB3aXRoIGpRdWVyeSBkZWZlcnJlZFxuKlxuKiBDb2RlIGZyb206IGh0dHBzOi8vZ2l0aHViLmNvbS9qcXVlcnkvanF1ZXJ5L2Jsb2IvbWFzdGVyL3NyYy9jb3JlLmpzXG4qXG4qL1xuXG52YXIgalF1ZXJ5ID0gbW9kdWxlLmV4cG9ydHMgPSB7XG5cdHR5cGU6IHR5cGVcblx0LCBpc0FycmF5OiBpc0FycmF5XG5cdCwgaXNGdW5jdGlvbjogaXNGdW5jdGlvblxuXHQsIGlzUGxhaW5PYmplY3Q6IGlzUGxhaW5PYmplY3Rcblx0LCBlYWNoOiBlYWNoXG5cdCwgZXh0ZW5kOiBleHRlbmRcblx0LCBub29wOiBmdW5jdGlvbigpIHt9XG59O1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG52YXIgY2xhc3MydHlwZSA9IHt9O1xuLy8gUG9wdWxhdGUgdGhlIGNsYXNzMnR5cGUgbWFwXG5cIkJvb2xlYW4gTnVtYmVyIFN0cmluZyBGdW5jdGlvbiBBcnJheSBEYXRlIFJlZ0V4cCBPYmplY3RcIi5zcGxpdChcIiBcIikuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG5cdGNsYXNzMnR5cGVbIFwiW29iamVjdCBcIiArIG5hbWUgKyBcIl1cIiBdID0gbmFtZS50b0xvd2VyQ2FzZSgpO1xufSk7XG5cblxuZnVuY3Rpb24gdHlwZSggb2JqICkge1xuXHRyZXR1cm4gb2JqID09IG51bGwgP1xuXHRcdFN0cmluZyggb2JqICkgOlxuXHRcdFx0Y2xhc3MydHlwZVsgdG9TdHJpbmcuY2FsbChvYmopIF0gfHwgXCJvYmplY3RcIjtcbn1cblxuZnVuY3Rpb24gaXNGdW5jdGlvbiggb2JqICkge1xuXHRyZXR1cm4galF1ZXJ5LnR5cGUob2JqKSA9PT0gXCJmdW5jdGlvblwiO1xufVxuXG5mdW5jdGlvbiBpc0FycmF5KCBvYmogKSB7XG5cdHJldHVybiBqUXVlcnkudHlwZShvYmopID09PSBcImFycmF5XCI7XG59XG5cbmZ1bmN0aW9uIGVhY2goIG9iamVjdCwgY2FsbGJhY2ssIGFyZ3MgKSB7XG5cdHZhciBuYW1lLCBpID0gMCxcblx0bGVuZ3RoID0gb2JqZWN0Lmxlbmd0aCxcblx0aXNPYmogPSBsZW5ndGggPT09IHVuZGVmaW5lZCB8fCBpc0Z1bmN0aW9uKCBvYmplY3QgKTtcblxuXHRpZiAoIGFyZ3MgKSB7XG5cdFx0aWYgKCBpc09iaiApIHtcblx0XHRcdGZvciAoIG5hbWUgaW4gb2JqZWN0ICkge1xuXHRcdFx0XHRpZiAoIGNhbGxiYWNrLmFwcGx5KCBvYmplY3RbIG5hbWUgXSwgYXJncyApID09PSBmYWxzZSApIHtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRmb3IgKCA7IGkgPCBsZW5ndGg7ICkge1xuXHRcdFx0XHRpZiAoIGNhbGxiYWNrLmFwcGx5KCBvYmplY3RbIGkrKyBdLCBhcmdzICkgPT09IGZhbHNlICkge1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gQSBzcGVjaWFsLCBmYXN0LCBjYXNlIGZvciB0aGUgbW9zdCBjb21tb24gdXNlIG9mIGVhY2hcblx0fSBlbHNlIHtcblx0XHRpZiAoIGlzT2JqICkge1xuXHRcdFx0Zm9yICggbmFtZSBpbiBvYmplY3QgKSB7XG5cdFx0XHRcdGlmICggY2FsbGJhY2suY2FsbCggb2JqZWN0WyBuYW1lIF0sIG5hbWUsIG9iamVjdFsgbmFtZSBdICkgPT09IGZhbHNlICkge1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdGZvciAoIDsgaSA8IGxlbmd0aDsgKSB7XG5cdFx0XHRcdGlmICggY2FsbGJhY2suY2FsbCggb2JqZWN0WyBpIF0sIGksIG9iamVjdFsgaSsrIF0gKSA9PT0gZmFsc2UgKSB7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gb2JqZWN0O1xufVxuXG5mdW5jdGlvbiBpc1BsYWluT2JqZWN0KCBvYmogKSB7XG5cdC8vIE11c3QgYmUgYW4gT2JqZWN0LlxuXHRpZiAoICFvYmogfHwgalF1ZXJ5LnR5cGUob2JqKSAhPT0gXCJvYmplY3RcIiApIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0cmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGV4dGVuZCgpIHtcblx0dmFyIG9wdGlvbnMsIG5hbWUsIHNyYywgY29weSwgY29weUlzQXJyYXksIGNsb25lLFxuXHR0YXJnZXQgPSBhcmd1bWVudHNbMF0gfHwge30sXG5cdGkgPSAxLFxuXHRsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoLFxuXHRkZWVwID0gZmFsc2U7XG5cblx0Ly8gSGFuZGxlIGEgZGVlcCBjb3B5IHNpdHVhdGlvblxuXHRpZiAoIHR5cGVvZiB0YXJnZXQgPT09IFwiYm9vbGVhblwiICkge1xuXHRcdGRlZXAgPSB0YXJnZXQ7XG5cdFx0dGFyZ2V0ID0gYXJndW1lbnRzWzFdIHx8IHt9O1xuXHRcdC8vIHNraXAgdGhlIGJvb2xlYW4gYW5kIHRoZSB0YXJnZXRcblx0XHRpID0gMjtcblx0fVxuXG5cdC8vIEhhbmRsZSBjYXNlIHdoZW4gdGFyZ2V0IGlzIGEgc3RyaW5nIG9yIHNvbWV0aGluZyAocG9zc2libGUgaW4gZGVlcCBjb3B5KVxuXHRpZiAoIHR5cGVvZiB0YXJnZXQgIT09IFwib2JqZWN0XCIgJiYgIWpRdWVyeS5pc0Z1bmN0aW9uKHRhcmdldCkgKSB7XG5cdFx0dGFyZ2V0ID0ge307XG5cdH1cblxuXHQvLyBleHRlbmQgalF1ZXJ5IGl0c2VsZiBpZiBvbmx5IG9uZSBhcmd1bWVudCBpcyBwYXNzZWRcblx0aWYgKCBsZW5ndGggPT09IGkgKSB7XG5cdFx0dGFyZ2V0ID0gdGhpcztcblx0XHQtLWk7XG5cdH1cblxuXHRmb3IgKCA7IGkgPCBsZW5ndGg7IGkrKyApIHtcblx0XHQvLyBPbmx5IGRlYWwgd2l0aCBub24tbnVsbC91bmRlZmluZWQgdmFsdWVzXG5cdFx0aWYgKCAob3B0aW9ucyA9IGFyZ3VtZW50c1sgaSBdKSAhPSBudWxsICkge1xuXHRcdFx0Ly8gRXh0ZW5kIHRoZSBiYXNlIG9iamVjdFxuXHRcdFx0Zm9yICggbmFtZSBpbiBvcHRpb25zICkge1xuXHRcdFx0XHRzcmMgPSB0YXJnZXRbIG5hbWUgXTtcblx0XHRcdFx0Y29weSA9IG9wdGlvbnNbIG5hbWUgXTtcblxuXHRcdFx0XHQvLyBQcmV2ZW50IG5ldmVyLWVuZGluZyBsb29wXG5cdFx0XHRcdGlmICggdGFyZ2V0ID09PSBjb3B5ICkge1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gUmVjdXJzZSBpZiB3ZSdyZSBtZXJnaW5nIHBsYWluIG9iamVjdHMgb3IgYXJyYXlzXG5cdFx0XHRcdGlmICggZGVlcCAmJiBjb3B5ICYmICggalF1ZXJ5LmlzUGxhaW5PYmplY3QoY29weSkgfHwgKGNvcHlJc0FycmF5ID0galF1ZXJ5LmlzQXJyYXkoY29weSkpICkgKSB7XG5cdFx0XHRcdFx0aWYgKCBjb3B5SXNBcnJheSApIHtcblx0XHRcdFx0XHRcdGNvcHlJc0FycmF5ID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRjbG9uZSA9IHNyYyAmJiBqUXVlcnkuaXNBcnJheShzcmMpID8gc3JjIDogW107XG5cblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y2xvbmUgPSBzcmMgJiYgalF1ZXJ5LmlzUGxhaW5PYmplY3Qoc3JjKSA/IHNyYyA6IHt9O1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIE5ldmVyIG1vdmUgb3JpZ2luYWwgb2JqZWN0cywgY2xvbmUgdGhlbVxuXHRcdFx0XHRcdHRhcmdldFsgbmFtZSBdID0galF1ZXJ5LmV4dGVuZCggZGVlcCwgY2xvbmUsIGNvcHkgKTtcblxuXHRcdFx0XHRcdC8vIERvbid0IGJyaW5nIGluIHVuZGVmaW5lZCB2YWx1ZXNcblx0XHRcdFx0fSBlbHNlIGlmICggY29weSAhPT0gdW5kZWZpbmVkICkge1xuXHRcdFx0XHRcdHRhcmdldFsgbmFtZSBdID0gY29weTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vIFJldHVybiB0aGUgbW9kaWZpZWQgb2JqZWN0XG5cdHJldHVybiB0YXJnZXQ7XG59O1xuXG5cbiIsIlxuLyohXG4qIGpxdWVyeS1kZWZlcnJlZFxuKiBDb3B5cmlnaHQoYykgMjAxMSBIaWRkZW4gPHp6ZGhpZGRlbkBnbWFpbC5jb20+XG4qIE1JVCBMaWNlbnNlZFxuKi9cblxuLyoqXG4qIExpYnJhcnkgdmVyc2lvbi5cbiovXG5cbnZhciBqUXVlcnkgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL2pxdWVyeS1jYWxsYmFja3MuanNcIiksXG5cdGNvcmVfc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG5cbi8qKlxuKiBqUXVlcnkgZGVmZXJyZWRcbipcbiogQ29kZSBmcm9tOiBodHRwczovL2dpdGh1Yi5jb20vanF1ZXJ5L2pxdWVyeS9ibG9iL21hc3Rlci9zcmMvZGVmZXJyZWQuanNcbiogRG9jOiBodHRwOi8vYXBpLmpxdWVyeS5jb20vY2F0ZWdvcnkvZGVmZXJyZWQtb2JqZWN0L1xuKlxuKi9cblxualF1ZXJ5LmV4dGVuZCh7XG5cblx0RGVmZXJyZWQ6IGZ1bmN0aW9uKCBmdW5jICkge1xuXHRcdHZhciB0dXBsZXMgPSBbXG5cdFx0XHRcdC8vIGFjdGlvbiwgYWRkIGxpc3RlbmVyLCBsaXN0ZW5lciBsaXN0LCBmaW5hbCBzdGF0ZVxuXHRcdFx0XHRbIFwicmVzb2x2ZVwiLCBcImRvbmVcIiwgalF1ZXJ5LkNhbGxiYWNrcyhcIm9uY2UgbWVtb3J5XCIpLCBcInJlc29sdmVkXCIgXSxcblx0XHRcdFx0WyBcInJlamVjdFwiLCBcImZhaWxcIiwgalF1ZXJ5LkNhbGxiYWNrcyhcIm9uY2UgbWVtb3J5XCIpLCBcInJlamVjdGVkXCIgXSxcblx0XHRcdFx0WyBcIm5vdGlmeVwiLCBcInByb2dyZXNzXCIsIGpRdWVyeS5DYWxsYmFja3MoXCJtZW1vcnlcIikgXVxuXHRcdFx0XSxcblx0XHRcdHN0YXRlID0gXCJwZW5kaW5nXCIsXG5cdFx0XHRwcm9taXNlID0ge1xuXHRcdFx0XHRzdGF0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHN0YXRlO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRhbHdheXM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGRlZmVycmVkLmRvbmUoIGFyZ3VtZW50cyApLmZhaWwoIGFyZ3VtZW50cyApO1xuXHRcdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHR0aGVuOiBmdW5jdGlvbiggLyogZm5Eb25lLCBmbkZhaWwsIGZuUHJvZ3Jlc3MgKi8gKSB7XG5cdFx0XHRcdFx0dmFyIGZucyA9IGFyZ3VtZW50cztcblx0XHRcdFx0XHRyZXR1cm4galF1ZXJ5LkRlZmVycmVkKGZ1bmN0aW9uKCBuZXdEZWZlciApIHtcblx0XHRcdFx0XHRcdGpRdWVyeS5lYWNoKCB0dXBsZXMsIGZ1bmN0aW9uKCBpLCB0dXBsZSApIHtcblx0XHRcdFx0XHRcdFx0dmFyIGFjdGlvbiA9IHR1cGxlWyAwIF0sXG5cdFx0XHRcdFx0XHRcdFx0Zm4gPSBmbnNbIGkgXTtcblx0XHRcdFx0XHRcdFx0Ly8gZGVmZXJyZWRbIGRvbmUgfCBmYWlsIHwgcHJvZ3Jlc3MgXSBmb3IgZm9yd2FyZGluZyBhY3Rpb25zIHRvIG5ld0RlZmVyXG5cdFx0XHRcdFx0XHRcdGRlZmVycmVkWyB0dXBsZVsxXSBdKCBqUXVlcnkuaXNGdW5jdGlvbiggZm4gKSA/XG5cdFx0XHRcdFx0XHRcdFx0ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR2YXIgcmV0dXJuZWQgPSBmbi5hcHBseSggdGhpcywgYXJndW1lbnRzICk7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoIHJldHVybmVkICYmIGpRdWVyeS5pc0Z1bmN0aW9uKCByZXR1cm5lZC5wcm9taXNlICkgKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJldHVybmVkLnByb21pc2UoKVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdC5kb25lKCBuZXdEZWZlci5yZXNvbHZlIClcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQuZmFpbCggbmV3RGVmZXIucmVqZWN0IClcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQucHJvZ3Jlc3MoIG5ld0RlZmVyLm5vdGlmeSApO1xuXHRcdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0bmV3RGVmZXJbIGFjdGlvbiArIFwiV2l0aFwiIF0oIHRoaXMgPT09IGRlZmVycmVkID8gbmV3RGVmZXIgOiB0aGlzLCBbIHJldHVybmVkIF0gKTtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR9IDpcblx0XHRcdFx0XHRcdFx0XHRuZXdEZWZlclsgYWN0aW9uIF1cblx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0Zm5zID0gbnVsbDtcblx0XHRcdFx0XHR9KS5wcm9taXNlKCk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdC8vIEdldCBhIHByb21pc2UgZm9yIHRoaXMgZGVmZXJyZWRcblx0XHRcdFx0Ly8gSWYgb2JqIGlzIHByb3ZpZGVkLCB0aGUgcHJvbWlzZSBhc3BlY3QgaXMgYWRkZWQgdG8gdGhlIG9iamVjdFxuXHRcdFx0XHRwcm9taXNlOiBmdW5jdGlvbiggb2JqICkge1xuXHRcdFx0XHRcdHJldHVybiBvYmogIT0gbnVsbCA/IGpRdWVyeS5leHRlbmQoIG9iaiwgcHJvbWlzZSApIDogcHJvbWlzZTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGRlZmVycmVkID0ge307XG5cblx0XHQvLyBLZWVwIHBpcGUgZm9yIGJhY2stY29tcGF0XG5cdFx0cHJvbWlzZS5waXBlID0gcHJvbWlzZS50aGVuO1xuXG5cdFx0Ly8gQWRkIGxpc3Qtc3BlY2lmaWMgbWV0aG9kc1xuXHRcdGpRdWVyeS5lYWNoKCB0dXBsZXMsIGZ1bmN0aW9uKCBpLCB0dXBsZSApIHtcblx0XHRcdHZhciBsaXN0ID0gdHVwbGVbIDIgXSxcblx0XHRcdFx0c3RhdGVTdHJpbmcgPSB0dXBsZVsgMyBdO1xuXG5cdFx0XHQvLyBwcm9taXNlWyBkb25lIHwgZmFpbCB8IHByb2dyZXNzIF0gPSBsaXN0LmFkZFxuXHRcdFx0cHJvbWlzZVsgdHVwbGVbMV0gXSA9IGxpc3QuYWRkO1xuXG5cdFx0XHQvLyBIYW5kbGUgc3RhdGVcblx0XHRcdGlmICggc3RhdGVTdHJpbmcgKSB7XG5cdFx0XHRcdGxpc3QuYWRkKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vIHN0YXRlID0gWyByZXNvbHZlZCB8IHJlamVjdGVkIF1cblx0XHRcdFx0XHRzdGF0ZSA9IHN0YXRlU3RyaW5nO1xuXG5cdFx0XHRcdC8vIFsgcmVqZWN0X2xpc3QgfCByZXNvbHZlX2xpc3QgXS5kaXNhYmxlOyBwcm9ncmVzc19saXN0LmxvY2tcblx0XHRcdFx0fSwgdHVwbGVzWyBpIF4gMSBdWyAyIF0uZGlzYWJsZSwgdHVwbGVzWyAyIF1bIDIgXS5sb2NrICk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIGRlZmVycmVkWyByZXNvbHZlIHwgcmVqZWN0IHwgbm90aWZ5IF0gPSBsaXN0LmZpcmVcblx0XHRcdGRlZmVycmVkWyB0dXBsZVswXSBdID0gbGlzdC5maXJlO1xuXHRcdFx0ZGVmZXJyZWRbIHR1cGxlWzBdICsgXCJXaXRoXCIgXSA9IGxpc3QuZmlyZVdpdGg7XG5cdFx0fSk7XG5cblx0XHQvLyBNYWtlIHRoZSBkZWZlcnJlZCBhIHByb21pc2Vcblx0XHRwcm9taXNlLnByb21pc2UoIGRlZmVycmVkICk7XG5cblx0XHQvLyBDYWxsIGdpdmVuIGZ1bmMgaWYgYW55XG5cdFx0aWYgKCBmdW5jICkge1xuXHRcdFx0ZnVuYy5jYWxsKCBkZWZlcnJlZCwgZGVmZXJyZWQgKTtcblx0XHR9XG5cblx0XHQvLyBBbGwgZG9uZSFcblx0XHRyZXR1cm4gZGVmZXJyZWQ7XG5cdH0sXG5cblx0Ly8gRGVmZXJyZWQgaGVscGVyXG5cdHdoZW46IGZ1bmN0aW9uKCBzdWJvcmRpbmF0ZSAvKiAsIC4uLiwgc3Vib3JkaW5hdGVOICovICkge1xuXHRcdHZhciBpID0gMCxcblx0XHRcdHJlc29sdmVWYWx1ZXMgPSBjb3JlX3NsaWNlLmNhbGwoIGFyZ3VtZW50cyApLFxuXHRcdFx0bGVuZ3RoID0gcmVzb2x2ZVZhbHVlcy5sZW5ndGgsXG5cblx0XHRcdC8vIHRoZSBjb3VudCBvZiB1bmNvbXBsZXRlZCBzdWJvcmRpbmF0ZXNcblx0XHRcdHJlbWFpbmluZyA9IGxlbmd0aCAhPT0gMSB8fCAoIHN1Ym9yZGluYXRlICYmIGpRdWVyeS5pc0Z1bmN0aW9uKCBzdWJvcmRpbmF0ZS5wcm9taXNlICkgKSA/IGxlbmd0aCA6IDAsXG5cblx0XHRcdC8vIHRoZSBtYXN0ZXIgRGVmZXJyZWQuIElmIHJlc29sdmVWYWx1ZXMgY29uc2lzdCBvZiBvbmx5IGEgc2luZ2xlIERlZmVycmVkLCBqdXN0IHVzZSB0aGF0LlxuXHRcdFx0ZGVmZXJyZWQgPSByZW1haW5pbmcgPT09IDEgPyBzdWJvcmRpbmF0ZSA6IGpRdWVyeS5EZWZlcnJlZCgpLFxuXG5cdFx0XHQvLyBVcGRhdGUgZnVuY3Rpb24gZm9yIGJvdGggcmVzb2x2ZSBhbmQgcHJvZ3Jlc3MgdmFsdWVzXG5cdFx0XHR1cGRhdGVGdW5jID0gZnVuY3Rpb24oIGksIGNvbnRleHRzLCB2YWx1ZXMgKSB7XG5cdFx0XHRcdHJldHVybiBmdW5jdGlvbiggdmFsdWUgKSB7XG5cdFx0XHRcdFx0Y29udGV4dHNbIGkgXSA9IHRoaXM7XG5cdFx0XHRcdFx0dmFsdWVzWyBpIF0gPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGNvcmVfc2xpY2UuY2FsbCggYXJndW1lbnRzICkgOiB2YWx1ZTtcblx0XHRcdFx0XHRpZiggdmFsdWVzID09PSBwcm9ncmVzc1ZhbHVlcyApIHtcblx0XHRcdFx0XHRcdGRlZmVycmVkLm5vdGlmeVdpdGgoIGNvbnRleHRzLCB2YWx1ZXMgKTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKCAhKCAtLXJlbWFpbmluZyApICkge1xuXHRcdFx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZVdpdGgoIGNvbnRleHRzLCB2YWx1ZXMgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH07XG5cdFx0XHR9LFxuXG5cdFx0XHRwcm9ncmVzc1ZhbHVlcywgcHJvZ3Jlc3NDb250ZXh0cywgcmVzb2x2ZUNvbnRleHRzO1xuXG5cdFx0Ly8gYWRkIGxpc3RlbmVycyB0byBEZWZlcnJlZCBzdWJvcmRpbmF0ZXM7IHRyZWF0IG90aGVycyBhcyByZXNvbHZlZFxuXHRcdGlmICggbGVuZ3RoID4gMSApIHtcblx0XHRcdHByb2dyZXNzVmFsdWVzID0gbmV3IEFycmF5KCBsZW5ndGggKTtcblx0XHRcdHByb2dyZXNzQ29udGV4dHMgPSBuZXcgQXJyYXkoIGxlbmd0aCApO1xuXHRcdFx0cmVzb2x2ZUNvbnRleHRzID0gbmV3IEFycmF5KCBsZW5ndGggKTtcblx0XHRcdGZvciAoIDsgaSA8IGxlbmd0aDsgaSsrICkge1xuXHRcdFx0XHRpZiAoIHJlc29sdmVWYWx1ZXNbIGkgXSAmJiBqUXVlcnkuaXNGdW5jdGlvbiggcmVzb2x2ZVZhbHVlc1sgaSBdLnByb21pc2UgKSApIHtcblx0XHRcdFx0XHRyZXNvbHZlVmFsdWVzWyBpIF0ucHJvbWlzZSgpXG5cdFx0XHRcdFx0XHQuZG9uZSggdXBkYXRlRnVuYyggaSwgcmVzb2x2ZUNvbnRleHRzLCByZXNvbHZlVmFsdWVzICkgKVxuXHRcdFx0XHRcdFx0LmZhaWwoIGRlZmVycmVkLnJlamVjdCApXG5cdFx0XHRcdFx0XHQucHJvZ3Jlc3MoIHVwZGF0ZUZ1bmMoIGksIHByb2dyZXNzQ29udGV4dHMsIHByb2dyZXNzVmFsdWVzICkgKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQtLXJlbWFpbmluZztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIGlmIHdlJ3JlIG5vdCB3YWl0aW5nIG9uIGFueXRoaW5nLCByZXNvbHZlIHRoZSBtYXN0ZXJcblx0XHRpZiAoICFyZW1haW5pbmcgKSB7XG5cdFx0XHRkZWZlcnJlZC5yZXNvbHZlV2l0aCggcmVzb2x2ZUNvbnRleHRzLCByZXNvbHZlVmFsdWVzICk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcblx0fVxufSk7XG4iXX0=
