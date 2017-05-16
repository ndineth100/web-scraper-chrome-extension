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

},{"jquery-deferred":28}],2:[function(require,module,exports){
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

},{"jquery-deferred":28}],3:[function(require,module,exports){
var DataExtractor = require('./../scripts/DataExtractor')
var getContentScript = require('./../scripts/getContentScript')

function extensionListener (request, sender, sendResponse) {
  console.log('chrome.runtime.onMessage', request)

  if (request.extractData) {
    console.log('received data extraction request', request)
    var extractor = new DataExtractor(request)
    var deferredData = extractor.getData()
    deferredData.done(function (data) {
      console.log('dataextractor data', data)
      sendResponse(data)
    })
    return true
  } else if (request.previewSelectorData) {
    console.log('received data-preview extraction request', request)
    var extractor = new DataExtractor(request)
    var deferredData = extractor.getSingleSelectorData(request.parentSelectorIds, request.selectorId)
    deferredData.done(function (data) {
      console.log('dataextractor data', data)
      sendResponse(data)
    })
    return true
  }
  // Universal ContentScript communication handler
  else if (request.contentScriptCall) {
    var contentScript = getContentScript('ContentScript')

    console.log('received ContentScript request', request)

    var deferredResponse = contentScript[request.fn](request.request)
    deferredResponse.done(function (response) {
      sendResponse(response)
    })

    return true
  }
}

module.exports = extensionListener

},{"./../scripts/DataExtractor":7,"./../scripts/getContentScript":26}],4:[function(require,module,exports){
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

},{"jquery-deferred":28}],5:[function(require,module,exports){
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

},{"./ContentSelector":6,"jquery-deferred":28}],6:[function(require,module,exports){
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

},{"./ElementQuery":8,"css-selector":27,"jquery-deferred":28}],7:[function(require,module,exports){
var SelectorList = require('./SelectorList')
var Sitemap = require('./Sitemap')
var whenCallSequentially = require('../assets/jquery.whencallsequentially')
var jquery = require('jquery-deferred')

var DataExtractor = function (options) {
  if (options.sitemap instanceof Sitemap) {
    this.sitemap = options.sitemap
  } else {
    this.sitemap = new Sitemap(options.sitemap)
  }

  this.parentSelectorId = options.parentSelectorId
  this.parentElement = options.parentElement || $('html')[0]
}

DataExtractor.prototype = {

	/**
	 * Returns a list of independent selector lists. follow=true splits selectors in trees.
	 * Two side by side type=multiple selectors split trees.
	 */
  findSelectorTrees: function () {
    return this._findSelectorTrees(this.parentSelectorId, new SelectorList())
  },

	/**
	 * the selector cannot return multiple records and it also cannot create new jobs. Also all of its child selectors
	 * must have the same features
	 * @param selector
	 * @returns {boolean}
	 */
  selectorIsCommonToAllTrees: function (selector) {
		// selectors which return mutiple items cannot be common to all
		// selectors
    if (selector.willReturnMultipleRecords()) {
      return false
    }

		// Link selectors which will follow to a new page also cannot be common
		// to all selectors
    if (selector.canCreateNewJobs() &&
			this.sitemap.getDirectChildSelectors(selector.id).length > 0) {
      return false
    }

		// also all child selectors must have the same features
    var childSelectors = this.sitemap.getAllSelectors(selector.id)
    for (var i in childSelectors) {
      var childSelector = childSelectors[i]
      if (!this.selectorIsCommonToAllTrees(childSelector)) {
        return false
      }
    }
    return true
  },

  getSelectorsCommonToAllTrees: function (parentSelectorId) {
    var commonSelectors = []
    var childSelectors = this.sitemap.getDirectChildSelectors(parentSelectorId)

    childSelectors.forEach(function (childSelector) {
      if (this.selectorIsCommonToAllTrees(childSelector)) {
        commonSelectors.push(childSelector)
				// also add all child selectors which. Child selectors were also checked

        var selectorChildSelectors = this.sitemap.getAllSelectors(childSelector.id)
        selectorChildSelectors.forEach(function (selector) {
          if (commonSelectors.indexOf(selector) === -1) {
            commonSelectors.push(selector)
          }
        })
      }
    }.bind(this))

    return commonSelectors
  },

  _findSelectorTrees: function (parentSelectorId, commonSelectorsFromParent) {
    var commonSelectors = commonSelectorsFromParent.concat(this.getSelectorsCommonToAllTrees(parentSelectorId))

		// find selectors that will be making a selector tree
    var selectorTrees = []
    var childSelectors = this.sitemap.getDirectChildSelectors(parentSelectorId)
    childSelectors.forEach(function (selector) {
      if (!this.selectorIsCommonToAllTrees(selector)) {
				// this selector will be making a new selector tree. But this selector might contain some child
				// selectors that are making more trees so here should be a some kind of seperation for that
        if (!selector.canHaveLocalChildSelectors()) {
          var selectorTree = commonSelectors.concat([selector])
          selectorTrees.push(selectorTree)
        } else {
					// find selector tree within this selector
          var commonSelectorsFromParent = commonSelectors.concat([selector])
          var childSelectorTrees = this._findSelectorTrees(selector.id, commonSelectorsFromParent)
          selectorTrees = selectorTrees.concat(childSelectorTrees)
        }
      }
    }.bind(this))

		// it there were not any selectors that make a separate tree then all common selectors make up a single selector tree
    if (selectorTrees.length === 0) {
      return [commonSelectors]
    } else {
      return selectorTrees
    }
  },

  getSelectorTreeCommonData: function (selectors, parentSelectorId, parentElement) {
    var childSelectors = selectors.getDirectChildSelectors(parentSelectorId)
    var deferredDataCalls = []
    childSelectors.forEach(function (selector) {
      if (!selectors.willReturnMultipleRecords(selector.id)) {
        deferredDataCalls.push(this.getSelectorCommonData.bind(this, selectors, selector, parentElement))
      }
    }.bind(this))

    var deferredResponse = jquery.Deferred()
    whenCallSequentially(deferredDataCalls).done(function (responses) {
      var commonData = {}
      responses.forEach(function (data) {
        commonData = Object.merge(commonData, data)
      })
      deferredResponse.resolve(commonData)
    })

    return deferredResponse
  },

  getSelectorCommonData: function (selectors, selector, parentElement) {
    var d = jquery.Deferred()
    var deferredData = selector.getData(parentElement)
    deferredData.done(function (data) {
      if (selector.willReturnElements()) {
        var newParentElement = data[0]
        var deferredChildCommonData = this.getSelectorTreeCommonData(selectors, selector.id, newParentElement)
        deferredChildCommonData.done(function (data) {
          d.resolve(data)
        })
      }			else {
        d.resolve(data[0])
      }
    }.bind(this))

    return d
  },

	/**
	 * Returns all data records for a selector that can return multiple records
	 */
  getMultiSelectorData: function (selectors, selector, parentElement, commonData) {
    var deferredResponse = jquery.Deferred()
    var deferredData
		// if the selector is not an Element selector then its fetched data is the result.
    if (!selector.willReturnElements()) {
      deferredData = selector.getData(parentElement)
      deferredData.done(function (selectorData) {
        var newCommonData = Object.clone(commonData, true)
        var resultData = []

        selectorData.forEach(function (record) {
          Object.merge(record, newCommonData, true)
          resultData.push(record)
        })

        deferredResponse.resolve(resultData)
      })
    }

		// handle situation when this selector is an elementSelector
    deferredData = selector.getData(parentElement)
    deferredData.done(function (selectorData) {
      var deferredDataCalls = []

      selectorData.forEach(function (element) {
        var newCommonData = Object.clone(commonData, true)
        var childRecordDeferredCall = this.getSelectorTreeData.bind(this, selectors, selector.id, element, newCommonData)
        deferredDataCalls.push(childRecordDeferredCall)
      }.bind(this))

      whenCallSequentially(deferredDataCalls).done(function (responses) {
        var resultData = []
        responses.forEach(function (childRecordList) {
          childRecordList.forEach(function (childRecord) {
            var rec = {}
            Object.merge(rec, childRecord, true)
            resultData.push(rec)
          })
        })
        deferredResponse.resolve(resultData)
      })
    }.bind(this))

    return deferredResponse
  },

  getSelectorTreeData: function (selectors, parentSelectorId, parentElement, commonData) {
    var childSelectors = selectors.getDirectChildSelectors(parentSelectorId)
    var childCommonDataDeferred = this.getSelectorTreeCommonData(selectors, parentSelectorId, parentElement)
    var deferredResponse = jquery.Deferred()

    childCommonDataDeferred.done(function (childCommonData) {
      commonData = Object.merge(commonData, childCommonData)

      var dataDeferredCalls = []

      childSelectors.forEach(function (selector) {
        if (selectors.willReturnMultipleRecords(selector.id)) {
          var newCommonData = Object.clone(commonData, true)
          var dataDeferredCall = this.getMultiSelectorData.bind(this, selectors, selector, parentElement, newCommonData)
          dataDeferredCalls.push(dataDeferredCall)
        }
      }.bind(this))

			// merge all data records together
      whenCallSequentially(dataDeferredCalls).done(function (responses) {
        var resultData = []
        responses.forEach(function (childRecords) {
          childRecords.forEach(function (childRecord) {
            var rec = {}
            Object.merge(rec, childRecord, true)
            resultData.push(rec)
          })
        })

        if (resultData.length === 0) {
					// If there are no multi record groups then return common data.
					// In a case where common data is empty return nothing.
          if (Object.keys(commonData).length === 0) {
            deferredResponse.resolve([])
          } else {
            deferredResponse.resolve([commonData])
          }
        }				else {
          deferredResponse.resolve(resultData)
        }
      })
    }.bind(this))

    return deferredResponse
  },

  getData: function () {
    var selectorTrees = this.findSelectorTrees()
    var dataDeferredCalls = []

    selectorTrees.forEach(function (selectorTree) {
      var deferredTreeDataCall = this.getSelectorTreeData.bind(this, selectorTree, this.parentSelectorId, this.parentElement, {})
      dataDeferredCalls.push(deferredTreeDataCall)
    }.bind(this))

    var responseDeferred = jquery.Deferred()
    whenCallSequentially(dataDeferredCalls).done(function (responses) {
      var results = []
      responses.forEach(function (dataResults) {
        results = results.concat(dataResults)
      })
      responseDeferred.resolve(results)
    })
    return responseDeferred
  },

  getSingleSelectorData: function (parentSelectorIds, selectorId) {
		// to fetch only single selectors data we will create a sitemap that only contains this selector, his
		// parents and all child selectors
    var sitemap = this.sitemap
    var selector = this.sitemap.selectors.getSelector(selectorId)
    var childSelectors = sitemap.selectors.getAllSelectors(selectorId)
    var parentSelectors = []
    var i
    var id
    var parentSelector
    for (i = parentSelectorIds.length - 1; i >= 0; i--) {
      id = parentSelectorIds[i]
      if (id === '_root') break
      parentSelector = this.sitemap.selectors.getSelector(id)
      parentSelectors.push(parentSelector)
    }

		// merge all needed selectors together
    var selectors = parentSelectors.concat(childSelectors)
    selectors.push(selector)
    sitemap.selectors = new SelectorList(selectors)

    var parentSelectorId
		// find the parent that leaded to the page where required selector is being used
    for (i = parentSelectorIds.length - 1; i >= 0; i--) {
      id = parentSelectorIds[i]
      if (id === '_root') {
        parentSelectorId = id
        break
      }
      parentSelector = this.sitemap.selectors.getSelector(parentSelectorIds[i])
      if (!parentSelector.willReturnElements()) {
        parentSelectorId = id
        break
      }
    }
    this.parentSelectorId = parentSelectorId

    return this.getData()
  }
}

module.exports = DataExtractor

},{"../assets/jquery.whencallsequentially":2,"./SelectorList":21,"./Sitemap":23,"jquery-deferred":28}],8:[function(require,module,exports){
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

},{"./ElementQuery":8,"./Selectors":22,"jquery-deferred":28}],10:[function(require,module,exports){
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

},{"jquery-deferred":28}],11:[function(require,module,exports){
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

},{"jquery-deferred":28}],12:[function(require,module,exports){
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

},{"./../ElementQuery":8,"./../UniqueElementList":24,"css-selector":27,"jquery-deferred":28}],13:[function(require,module,exports){
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

},{"jquery-deferred":28}],14:[function(require,module,exports){
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

},{"jquery-deferred":28}],15:[function(require,module,exports){
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

},{"jquery-deferred":28}],16:[function(require,module,exports){
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

},{"../../assets/base64":1,"../../assets/jquery.whencallsequentially":2,"jquery-deferred":28}],17:[function(require,module,exports){
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

},{"../../assets/jquery.whencallsequentially":2,"jquery-deferred":28}],18:[function(require,module,exports){
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

},{"../../assets/jquery.whencallsequentially":2,"css-selector":27,"jquery-deferred":28}],19:[function(require,module,exports){
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

},{"jquery-deferred":28}],20:[function(require,module,exports){
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

},{"jquery-deferred":28}],21:[function(require,module,exports){
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

},{"css-selector":27}],25:[function(require,module,exports){
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

},{"./BackgroundScript":4,"jquery-deferred":28}],26:[function(require,module,exports){
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

},{"./ContentScript":5,"./getBackgroundScript":25}],27:[function(require,module,exports){
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

},{}],28:[function(require,module,exports){

module.exports = require('./lib/jquery-deferred');
},{"./lib/jquery-deferred":31}],29:[function(require,module,exports){
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


},{"./jquery-core.js":30}],30:[function(require,module,exports){
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



},{}],31:[function(require,module,exports){

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

},{"./jquery-callbacks.js":29}]},{},[3])(3)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJleHRlbnNpb24vYXNzZXRzL2Jhc2U2NC5qcyIsImV4dGVuc2lvbi9hc3NldHMvanF1ZXJ5LndoZW5jYWxsc2VxdWVudGlhbGx5LmpzIiwiZXh0ZW5zaW9uL2NvbnRlbnRfc2NyaXB0L2NvbnRlbnRfc2NyYXBlci5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL0JhY2tncm91bmRTY3JpcHQuanMiLCJleHRlbnNpb24vc2NyaXB0cy9Db250ZW50U2NyaXB0LmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvQ29udGVudFNlbGVjdG9yLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvRGF0YUV4dHJhY3Rvci5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL0VsZW1lbnRRdWVyeS5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9yLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IvU2VsZWN0b3JFbGVtZW50LmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IvU2VsZWN0b3JFbGVtZW50QXR0cmlidXRlLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IvU2VsZWN0b3JFbGVtZW50Q2xpY2suanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckVsZW1lbnRTY3JvbGwuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3Rvckdyb3VwLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IvU2VsZWN0b3JIVE1MLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IvU2VsZWN0b3JJbWFnZS5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9yL1NlbGVjdG9yTGluay5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9yL1NlbGVjdG9yUG9wdXBMaW5rLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IvU2VsZWN0b3JUYWJsZS5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9yL1NlbGVjdG9yVGV4dC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9yTGlzdC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9ycy5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NpdGVtYXAuanMiLCJleHRlbnNpb24vc2NyaXB0cy9VbmlxdWVFbGVtZW50TGlzdC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL2dldEJhY2tncm91bmRTY3JpcHQuanMiLCJleHRlbnNpb24vc2NyaXB0cy9nZXRDb250ZW50U2NyaXB0LmpzIiwibm9kZV9tb2R1bGVzL2Nzcy1zZWxlY3Rvci9saWIvQ3NzU2VsZWN0b3IuanMiLCJub2RlX21vZHVsZXMvanF1ZXJ5LWRlZmVycmVkL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2pxdWVyeS1kZWZlcnJlZC9saWIvanF1ZXJ5LWNhbGxiYWNrcy5qcyIsIm5vZGVfbW9kdWxlcy9qcXVlcnktZGVmZXJyZWQvbGliL2pxdWVyeS1jb3JlLmpzIiwibm9kZV9tb2R1bGVzL2pxdWVyeS1kZWZlcnJlZC9saWIvanF1ZXJ5LWRlZmVycmVkLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdlQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxuLyoqXG4gKiBAdXJsIGh0dHA6Ly9qc3BlcmYuY29tL2Jsb2ItYmFzZTY0LWNvbnZlcnNpb25cbiAqIEB0eXBlIHt7YmxvYlRvQmFzZTY0OiBibG9iVG9CYXNlNjQsIGJhc2U2NFRvQmxvYjogYmFzZTY0VG9CbG9ifX1cbiAqL1xudmFyIEJhc2U2NCA9IHtcblxuICBibG9iVG9CYXNlNjQ6IGZ1bmN0aW9uIChibG9iKSB7XG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBkYXRhVXJsID0gcmVhZGVyLnJlc3VsdFxuICAgICAgdmFyIGJhc2U2NCA9IGRhdGFVcmwuc3BsaXQoJywnKVsxXVxuICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKGJhc2U2NClcbiAgICB9XG4gICAgcmVhZGVyLnJlYWRBc0RhdGFVUkwoYmxvYilcblxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG4gIGJhc2U2NFRvQmxvYjogZnVuY3Rpb24gKGJhc2U2NCwgbWltZVR5cGUpIHtcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIGJpbmFyeSA9IGF0b2IoYmFzZTY0KVxuICAgIHZhciBsZW4gPSBiaW5hcnkubGVuZ3RoXG4gICAgdmFyIGJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcihsZW4pXG4gICAgdmFyIHZpZXcgPSBuZXcgVWludDhBcnJheShidWZmZXIpXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgdmlld1tpXSA9IGJpbmFyeS5jaGFyQ29kZUF0KGkpXG4gICAgfVxuICAgIHZhciBibG9iID0gbmV3IEJsb2IoW3ZpZXddLCB7dHlwZTogbWltZVR5cGV9KVxuICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZShibG9iKVxuXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlNjRcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxuLyoqXG4gKiBAYXV0aG9yIE1hcnRpbnMgQmFsb2Rpc1xuICpcbiAqIEFuIGFsdGVybmF0aXZlIHZlcnNpb24gb2YgJC53aGVuIHdoaWNoIGNhbiBiZSB1c2VkIHRvIGV4ZWN1dGUgYXN5bmNocm9ub3VzXG4gKiBjYWxscyBzZXF1ZW50aWFsbHkgb25lIGFmdGVyIGFub3RoZXIuXG4gKlxuICogQHJldHVybnMganF1ZXJ5RGVmZXJyZWQoKS5wcm9taXNlKClcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB3aGVuQ2FsbFNlcXVlbnRpYWxseSAoZnVuY3Rpb25DYWxscykge1xuICB2YXIgZGVmZXJyZWRSZXNvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgdmFyIHJlc3VsdERhdGEgPSBbXVxuXG5cdC8vIG5vdGhpbmcgdG8gZG9cbiAgaWYgKGZ1bmN0aW9uQ2FsbHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIGRlZmVycmVkUmVzb25zZS5yZXNvbHZlKHJlc3VsdERhdGEpLnByb21pc2UoKVxuICB9XG5cbiAgdmFyIGN1cnJlbnREZWZlcnJlZCA9IGZ1bmN0aW9uQ2FsbHMuc2hpZnQoKSgpXG5cdC8vIGV4ZWN1dGUgc3luY2hyb25vdXMgY2FsbHMgc3luY2hyb25vdXNseVxuICB3aGlsZSAoY3VycmVudERlZmVycmVkLnN0YXRlKCkgPT09ICdyZXNvbHZlZCcpIHtcbiAgICBjdXJyZW50RGVmZXJyZWQuZG9uZShmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgcmVzdWx0RGF0YS5wdXNoKGRhdGEpXG4gICAgfSlcbiAgICBpZiAoZnVuY3Rpb25DYWxscy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBkZWZlcnJlZFJlc29uc2UucmVzb2x2ZShyZXN1bHREYXRhKS5wcm9taXNlKClcbiAgICB9XG4gICAgY3VycmVudERlZmVycmVkID0gZnVuY3Rpb25DYWxscy5zaGlmdCgpKClcbiAgfVxuXG5cdC8vIGhhbmRsZSBhc3luYyBjYWxsc1xuICB2YXIgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG5cdFx0Ly8gaGFuZGxlIG1peGVkIHN5bmMgY2FsbHNcbiAgICB3aGlsZSAoY3VycmVudERlZmVycmVkLnN0YXRlKCkgPT09ICdyZXNvbHZlZCcpIHtcbiAgICAgIGN1cnJlbnREZWZlcnJlZC5kb25lKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHJlc3VsdERhdGEucHVzaChkYXRhKVxuICAgICAgfSlcbiAgICAgIGlmIChmdW5jdGlvbkNhbGxzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKVxuICAgICAgICBkZWZlcnJlZFJlc29uc2UucmVzb2x2ZShyZXN1bHREYXRhKVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY3VycmVudERlZmVycmVkID0gZnVuY3Rpb25DYWxscy5zaGlmdCgpKClcbiAgICB9XG4gIH0sIDEwKVxuXG4gIHJldHVybiBkZWZlcnJlZFJlc29uc2UucHJvbWlzZSgpXG59XG4iLCJ2YXIgRGF0YUV4dHJhY3RvciA9IHJlcXVpcmUoJy4vLi4vc2NyaXB0cy9EYXRhRXh0cmFjdG9yJylcbnZhciBnZXRDb250ZW50U2NyaXB0ID0gcmVxdWlyZSgnLi8uLi9zY3JpcHRzL2dldENvbnRlbnRTY3JpcHQnKVxuXG5mdW5jdGlvbiBleHRlbnNpb25MaXN0ZW5lciAocmVxdWVzdCwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpIHtcbiAgY29uc29sZS5sb2coJ2Nocm9tZS5ydW50aW1lLm9uTWVzc2FnZScsIHJlcXVlc3QpXG5cbiAgaWYgKHJlcXVlc3QuZXh0cmFjdERhdGEpIHtcbiAgICBjb25zb2xlLmxvZygncmVjZWl2ZWQgZGF0YSBleHRyYWN0aW9uIHJlcXVlc3QnLCByZXF1ZXN0KVxuICAgIHZhciBleHRyYWN0b3IgPSBuZXcgRGF0YUV4dHJhY3RvcihyZXF1ZXN0KVxuICAgIHZhciBkZWZlcnJlZERhdGEgPSBleHRyYWN0b3IuZ2V0RGF0YSgpXG4gICAgZGVmZXJyZWREYXRhLmRvbmUoZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdkYXRhZXh0cmFjdG9yIGRhdGEnLCBkYXRhKVxuICAgICAgc2VuZFJlc3BvbnNlKGRhdGEpXG4gICAgfSlcbiAgICByZXR1cm4gdHJ1ZVxuICB9IGVsc2UgaWYgKHJlcXVlc3QucHJldmlld1NlbGVjdG9yRGF0YSkge1xuICAgIGNvbnNvbGUubG9nKCdyZWNlaXZlZCBkYXRhLXByZXZpZXcgZXh0cmFjdGlvbiByZXF1ZXN0JywgcmVxdWVzdClcbiAgICB2YXIgZXh0cmFjdG9yID0gbmV3IERhdGFFeHRyYWN0b3IocmVxdWVzdClcbiAgICB2YXIgZGVmZXJyZWREYXRhID0gZXh0cmFjdG9yLmdldFNpbmdsZVNlbGVjdG9yRGF0YShyZXF1ZXN0LnBhcmVudFNlbGVjdG9ySWRzLCByZXF1ZXN0LnNlbGVjdG9ySWQpXG4gICAgZGVmZXJyZWREYXRhLmRvbmUoZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdkYXRhZXh0cmFjdG9yIGRhdGEnLCBkYXRhKVxuICAgICAgc2VuZFJlc3BvbnNlKGRhdGEpXG4gICAgfSlcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIC8vIFVuaXZlcnNhbCBDb250ZW50U2NyaXB0IGNvbW11bmljYXRpb24gaGFuZGxlclxuICBlbHNlIGlmIChyZXF1ZXN0LmNvbnRlbnRTY3JpcHRDYWxsKSB7XG4gICAgdmFyIGNvbnRlbnRTY3JpcHQgPSBnZXRDb250ZW50U2NyaXB0KCdDb250ZW50U2NyaXB0JylcblxuICAgIGNvbnNvbGUubG9nKCdyZWNlaXZlZCBDb250ZW50U2NyaXB0IHJlcXVlc3QnLCByZXF1ZXN0KVxuXG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBjb250ZW50U2NyaXB0W3JlcXVlc3QuZm5dKHJlcXVlc3QucmVxdWVzdClcbiAgICBkZWZlcnJlZFJlc3BvbnNlLmRvbmUoZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICBzZW5kUmVzcG9uc2UocmVzcG9uc2UpXG4gICAgfSlcblxuICAgIHJldHVybiB0cnVlXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBleHRlbnNpb25MaXN0ZW5lclxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG4vKipcbiAqIENvbnRlbnRTY3JpcHQgdGhhdCBjYW4gYmUgY2FsbGVkIGZyb20gYW55d2hlcmUgd2l0aGluIHRoZSBleHRlbnNpb25cbiAqL1xudmFyIEJhY2tncm91bmRTY3JpcHQgPSB7XG5cbiAgZHVtbXk6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ganF1ZXJ5LkRlZmVycmVkKCkucmVzb2x2ZSgnZHVtbXknKS5wcm9taXNlKClcbiAgfSxcblxuXHQvKipcblx0ICogUmV0dXJucyB0aGUgaWQgb2YgdGhlIHRhYiB0aGF0IGlzIHZpc2libGUgdG8gdXNlclxuXHQgKiBAcmV0dXJucyBqcXVlcnkuRGVmZXJyZWQoKSBpbnRlZ2VyXG5cdCAqL1xuICBnZXRBY3RpdmVUYWJJZDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICAgIGNocm9tZS50YWJzLnF1ZXJ5KHtcbiAgICAgIGFjdGl2ZTogdHJ1ZSxcbiAgICAgIGN1cnJlbnRXaW5kb3c6IHRydWVcbiAgICB9LCBmdW5jdGlvbiAodGFicykge1xuICAgICAgaWYgKHRhYnMubGVuZ3RoIDwgMSkge1xuXHRcdFx0XHQvLyBAVE9ETyBtdXN0IGJlIHJ1bm5pbmcgd2l0aGluIHBvcHVwLiBtYXliZSBmaW5kIGFub3RoZXIgYWN0aXZlIHdpbmRvdz9cbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZWplY3QoXCJjb3VsZG4ndCBmaW5kIHRoZSBhY3RpdmUgdGFiXCIpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgdGFiSWQgPSB0YWJzWzBdLmlkXG4gICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZSh0YWJJZClcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBFeGVjdXRlIGEgZnVuY3Rpb24gd2l0aGluIHRoZSBhY3RpdmUgdGFiIHdpdGhpbiBjb250ZW50IHNjcmlwdFxuXHQgKiBAcGFyYW0gcmVxdWVzdC5mblx0ZnVuY3Rpb24gdG8gY2FsbFxuXHQgKiBAcGFyYW0gcmVxdWVzdC5yZXF1ZXN0XHRyZXF1ZXN0IHRoYXQgd2lsbCBiZSBwYXNzZWQgdG8gdGhlIGZ1bmN0aW9uXG5cdCAqL1xuICBleGVjdXRlQ29udGVudFNjcmlwdDogZnVuY3Rpb24gKHJlcXVlc3QpIHtcbiAgICB2YXIgcmVxVG9Db250ZW50U2NyaXB0ID0ge1xuICAgICAgY29udGVudFNjcmlwdENhbGw6IHRydWUsXG4gICAgICBmbjogcmVxdWVzdC5mbixcbiAgICAgIHJlcXVlc3Q6IHJlcXVlc3QucmVxdWVzdFxuICAgIH1cbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIGRlZmVycmVkQWN0aXZlVGFiSWQgPSB0aGlzLmdldEFjdGl2ZVRhYklkKClcbiAgICBkZWZlcnJlZEFjdGl2ZVRhYklkLmRvbmUoZnVuY3Rpb24gKHRhYklkKSB7XG4gICAgICBjaHJvbWUudGFicy5zZW5kTWVzc2FnZSh0YWJJZCwgcmVxVG9Db250ZW50U2NyaXB0LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKHJlc3BvbnNlKVxuICAgICAgfSlcbiAgICB9KVxuXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2VcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tncm91bmRTY3JpcHRcbiIsInZhciBDb250ZW50U2VsZWN0b3IgPSByZXF1aXJlKCcuL0NvbnRlbnRTZWxlY3RvcicpXG52YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbi8qKlxuICogQ29udGVudFNjcmlwdCB0aGF0IGNhbiBiZSBjYWxsZWQgZnJvbSBhbnl3aGVyZSB3aXRoaW4gdGhlIGV4dGVuc2lvblxuICovXG52YXIgQ29udGVudFNjcmlwdCA9IHtcblxuXHQvKipcblx0ICogRmV0Y2hcblx0ICogQHBhcmFtIHJlcXVlc3QuQ1NTU2VsZWN0b3JcdGNzcyBzZWxlY3RvciBhcyBzdHJpbmdcblx0ICogQHJldHVybnMganF1ZXJ5LkRlZmVycmVkKClcblx0ICovXG4gIGdldEhUTUw6IGZ1bmN0aW9uIChyZXF1ZXN0KSB7XG4gICAgdmFyIGRlZmVycmVkSFRNTCA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIGh0bWwgPSAkKHJlcXVlc3QuQ1NTU2VsZWN0b3IpLmNsb25lKCkud3JhcCgnPHA+JykucGFyZW50KCkuaHRtbCgpXG4gICAgZGVmZXJyZWRIVE1MLnJlc29sdmUoaHRtbClcbiAgICByZXR1cm4gZGVmZXJyZWRIVE1MLnByb21pc2UoKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBSZW1vdmVzIGN1cnJlbnQgY29udGVudCBzZWxlY3RvciBpZiBpcyBpbiB1c2Ugd2l0aGluIHRoZSBwYWdlXG5cdCAqIEByZXR1cm5zIGpxdWVyeS5EZWZlcnJlZCgpXG5cdCAqL1xuICByZW1vdmVDdXJyZW50Q29udGVudFNlbGVjdG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciBjb250ZW50U2VsZWN0b3IgPSB3aW5kb3cuY3NcbiAgICBpZiAoY29udGVudFNlbGVjdG9yID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZSgpXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnRlbnRTZWxlY3Rvci5yZW1vdmVHVUkoKVxuICAgICAgd2luZG93LmNzID0gdW5kZWZpbmVkXG4gICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUoKVxuICAgIH1cblxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBTZWxlY3QgZWxlbWVudHMgd2l0aGluIHRoZSBwYWdlXG5cdCAqIEBwYXJhbSByZXF1ZXN0LnBhcmVudENTU1NlbGVjdG9yXG5cdCAqIEBwYXJhbSByZXF1ZXN0LmFsbG93ZWRFbGVtZW50c1xuXHQgKi9cbiAgc2VsZWN0U2VsZWN0b3I6IGZ1bmN0aW9uIChyZXF1ZXN0KSB7XG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgdGhpcy5yZW1vdmVDdXJyZW50Q29udGVudFNlbGVjdG9yKCkuZG9uZShmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgY29udGVudFNlbGVjdG9yID0gbmV3IENvbnRlbnRTZWxlY3Rvcih7XG4gICAgICAgIHBhcmVudENTU1NlbGVjdG9yOiByZXF1ZXN0LnBhcmVudENTU1NlbGVjdG9yLFxuICAgICAgICBhbGxvd2VkRWxlbWVudHM6IHJlcXVlc3QuYWxsb3dlZEVsZW1lbnRzXG4gICAgICB9KVxuICAgICAgd2luZG93LmNzID0gY29udGVudFNlbGVjdG9yXG5cbiAgICAgIHZhciBkZWZlcnJlZENTU1NlbGVjdG9yID0gY29udGVudFNlbGVjdG9yLmdldENTU1NlbGVjdG9yKClcbiAgICAgIGRlZmVycmVkQ1NTU2VsZWN0b3IuZG9uZShmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgdGhpcy5yZW1vdmVDdXJyZW50Q29udGVudFNlbGVjdG9yKCkuZG9uZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKHJlc3BvbnNlKVxuICAgICAgICAgIHdpbmRvdy5jcyA9IHVuZGVmaW5lZFxuICAgICAgICB9KVxuICAgICAgfS5iaW5kKHRoaXMpKS5mYWlsKGZ1bmN0aW9uIChtZXNzYWdlKSB7XG4gICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVqZWN0KG1lc3NhZ2UpXG4gICAgICAgIHdpbmRvdy5jcyA9IHVuZGVmaW5lZFxuICAgICAgfSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZS5wcm9taXNlKClcbiAgfSxcblxuXHQvKipcblx0ICogUHJldmlldyBlbGVtZW50c1xuXHQgKiBAcGFyYW0gcmVxdWVzdC5wYXJlbnRDU1NTZWxlY3RvclxuXHQgKiBAcGFyYW0gcmVxdWVzdC5lbGVtZW50Q1NTU2VsZWN0b3Jcblx0ICovXG4gIHByZXZpZXdTZWxlY3RvcjogZnVuY3Rpb24gKHJlcXVlc3QpIHtcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdGhpcy5yZW1vdmVDdXJyZW50Q29udGVudFNlbGVjdG9yKCkuZG9uZShmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgY29udGVudFNlbGVjdG9yID0gbmV3IENvbnRlbnRTZWxlY3Rvcih7XG4gICAgICAgIHBhcmVudENTU1NlbGVjdG9yOiByZXF1ZXN0LnBhcmVudENTU1NlbGVjdG9yXG4gICAgICB9KVxuICAgICAgd2luZG93LmNzID0gY29udGVudFNlbGVjdG9yXG5cbiAgICAgIHZhciBkZWZlcnJlZFNlbGVjdG9yUHJldmlldyA9IGNvbnRlbnRTZWxlY3Rvci5wcmV2aWV3U2VsZWN0b3IocmVxdWVzdC5lbGVtZW50Q1NTU2VsZWN0b3IpXG4gICAgICBkZWZlcnJlZFNlbGVjdG9yUHJldmlldy5kb25lKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKClcbiAgICAgIH0pLmZhaWwoZnVuY3Rpb24gKG1lc3NhZ2UpIHtcbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZWplY3QobWVzc2FnZSlcbiAgICAgICAgd2luZG93LmNzID0gdW5kZWZpbmVkXG4gICAgICB9KVxuICAgIH0pXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2VcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnRTY3JpcHRcbiIsInZhciBFbGVtZW50UXVlcnkgPSByZXF1aXJlKCcuL0VsZW1lbnRRdWVyeScpXG52YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciBDc3NTZWxlY3RvciA9IHJlcXVpcmUoJ2Nzcy1zZWxlY3RvcicpLkNzc1NlbGVjdG9yXG4vKipcbiAqIEBwYXJhbSBvcHRpb25zLnBhcmVudENTU1NlbGVjdG9yXHRFbGVtZW50cyBjYW4gYmUgb25seSBzZWxlY3RlZCB3aXRoaW4gdGhpcyBlbGVtZW50XG4gKiBAcGFyYW0gb3B0aW9ucy5hbGxvd2VkRWxlbWVudHNcdEVsZW1lbnRzIHRoYXQgY2FuIG9ubHkgYmUgc2VsZWN0ZWRcbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgQ29udGVudFNlbGVjdG9yID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcblx0Ly8gZGVmZXJyZWQgcmVzcG9uc2VcbiAgdGhpcy5kZWZlcnJlZENTU1NlbGVjdG9yUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gIHRoaXMuYWxsb3dlZEVsZW1lbnRzID0gb3B0aW9ucy5hbGxvd2VkRWxlbWVudHNcbiAgdGhpcy5wYXJlbnRDU1NTZWxlY3RvciA9IG9wdGlvbnMucGFyZW50Q1NTU2VsZWN0b3IudHJpbSgpXG4gIHRoaXMuYWxlcnQgPSBvcHRpb25zLmFsZXJ0IHx8IGZ1bmN0aW9uICh0eHQpIHsgYWxlcnQodHh0KSB9XG5cbiAgaWYgKHRoaXMucGFyZW50Q1NTU2VsZWN0b3IpIHtcbiAgICB0aGlzLnBhcmVudCA9ICQodGhpcy5wYXJlbnRDU1NTZWxlY3RvcilbMF1cblxuXHRcdC8vICBoYW5kbGUgc2l0dWF0aW9uIHdoZW4gcGFyZW50IHNlbGVjdG9yIG5vdCBmb3VuZFxuICAgIGlmICh0aGlzLnBhcmVudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLmRlZmVycmVkQ1NTU2VsZWN0b3JSZXNwb25zZS5yZWplY3QoJ3BhcmVudCBzZWxlY3RvciBub3QgZm91bmQnKVxuICAgICAgdGhpcy5hbGVydCgnUGFyZW50IGVsZW1lbnQgbm90IGZvdW5kIScpXG4gICAgfVxuICB9XHRlbHNlIHtcbiAgICB0aGlzLnBhcmVudCA9ICQoJ2JvZHknKVswXVxuICB9XG59XG5cbkNvbnRlbnRTZWxlY3Rvci5wcm90b3R5cGUgPSB7XG5cblx0LyoqXG5cdCAqIGdldCBjc3Mgc2VsZWN0b3Igc2VsZWN0ZWQgYnkgdGhlIHVzZXJcblx0ICovXG4gIGdldENTU1NlbGVjdG9yOiBmdW5jdGlvbiAocmVxdWVzdCkge1xuICAgIGlmICh0aGlzLmRlZmVycmVkQ1NTU2VsZWN0b3JSZXNwb25zZS5zdGF0ZSgpICE9PSAncmVqZWN0ZWQnKSB7XG5cdFx0XHQvLyBlbGVtZW50cyB0aGF0IGFyZSBzZWxlY3RlZCBieSB0aGUgdXNlclxuICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnRzID0gW11cblx0XHRcdC8vIGVsZW1lbnQgc2VsZWN0ZWQgZnJvbSB0b3BcbiAgICAgIHRoaXMudG9wID0gMFxuXG5cdFx0XHQvLyBpbml0aWFsaXplIGNzcyBzZWxlY3RvclxuICAgICAgdGhpcy5pbml0Q3NzU2VsZWN0b3IoZmFsc2UpXG5cbiAgICAgIHRoaXMuaW5pdEdVSSgpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZGVmZXJyZWRDU1NTZWxlY3RvclJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG4gIGdldEN1cnJlbnRDU1NTZWxlY3RvcjogZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLnNlbGVjdGVkRWxlbWVudHMgJiYgdGhpcy5zZWxlY3RlZEVsZW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgIHZhciBjc3NTZWxlY3RvclxuXG5cdFx0XHQvLyBoYW5kbGUgc3BlY2lhbCBjYXNlIHdoZW4gcGFyZW50IGlzIHNlbGVjdGVkXG4gICAgICBpZiAodGhpcy5pc1BhcmVudFNlbGVjdGVkKCkpIHtcbiAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWRFbGVtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICBjc3NTZWxlY3RvciA9ICdfcGFyZW50XydcbiAgICAgICAgfSBlbHNlIGlmICgkKCcjLXNlbGVjdG9yLXRvb2xiYXIgW25hbWU9ZGlmZXJlbnRFbGVtZW50U2VsZWN0aW9uXScpLnByb3AoJ2NoZWNrZWQnKSkge1xuICAgICAgICAgIHZhciBzZWxlY3RlZEVsZW1lbnRzID0gdGhpcy5zZWxlY3RlZEVsZW1lbnRzLmNsb25lKClcbiAgICAgICAgICBzZWxlY3RlZEVsZW1lbnRzLnNwbGljZShzZWxlY3RlZEVsZW1lbnRzLmluZGV4T2YodGhpcy5wYXJlbnQpLCAxKVxuICAgICAgICAgIGNzc1NlbGVjdG9yID0gJ19wYXJlbnRfLCAnICsgdGhpcy5jc3NTZWxlY3Rvci5nZXRDc3NTZWxlY3RvcihzZWxlY3RlZEVsZW1lbnRzLCB0aGlzLnRvcClcbiAgICAgICAgfSBlbHNlIHtcblx0XHRcdFx0XHQvLyB3aWxsIHRyaWdnZXIgZXJyb3Igd2hlcmUgbXVsdGlwbGUgc2VsZWN0aW9ucyBhcmUgbm90IGFsbG93ZWRcbiAgICAgICAgICBjc3NTZWxlY3RvciA9IHRoaXMuY3NzU2VsZWN0b3IuZ2V0Q3NzU2VsZWN0b3IodGhpcy5zZWxlY3RlZEVsZW1lbnRzLCB0aGlzLnRvcClcbiAgICAgICAgfVxuICAgICAgfVx0XHRcdGVsc2Uge1xuICAgICAgICBjc3NTZWxlY3RvciA9IHRoaXMuY3NzU2VsZWN0b3IuZ2V0Q3NzU2VsZWN0b3IodGhpcy5zZWxlY3RlZEVsZW1lbnRzLCB0aGlzLnRvcClcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGNzc1NlbGVjdG9yXG4gICAgfVxuICAgIHJldHVybiAnJ1xuICB9LFxuXG4gIGlzUGFyZW50U2VsZWN0ZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5zZWxlY3RlZEVsZW1lbnRzLmluZGV4T2YodGhpcy5wYXJlbnQpICE9PSAtMVxuICB9LFxuXG5cdC8qKlxuXHQgKiBpbml0aWFsaXplIG9yIHJlY29uZmlndXJlIGNzcyBzZWxlY3RvciBjbGFzc1xuXHQgKiBAcGFyYW0gYWxsb3dNdWx0aXBsZVNlbGVjdG9yc1xuXHQgKi9cbiAgaW5pdENzc1NlbGVjdG9yOiBmdW5jdGlvbiAoYWxsb3dNdWx0aXBsZVNlbGVjdG9ycykge1xuICAgIHRoaXMuY3NzU2VsZWN0b3IgPSBuZXcgQ3NzU2VsZWN0b3Ioe1xuICAgICAgZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yOiB0cnVlLFxuICAgICAgcGFyZW50OiB0aGlzLnBhcmVudCxcbiAgICAgIGFsbG93TXVsdGlwbGVTZWxlY3RvcnM6IGFsbG93TXVsdGlwbGVTZWxlY3RvcnMsXG4gICAgICBpZ25vcmVkQ2xhc3NlczogW1xuICAgICAgICAnLXNpdGVtYXAtc2VsZWN0LWl0ZW0tc2VsZWN0ZWQnLFxuICAgICAgICAnLXNpdGVtYXAtc2VsZWN0LWl0ZW0taG92ZXInLFxuICAgICAgICAnLXNpdGVtYXAtcGFyZW50JyxcbiAgICAgICAgJy13ZWItc2NyYXBlci1pbWctb24tdG9wJyxcbiAgICAgICAgJy13ZWItc2NyYXBlci1zZWxlY3Rpb24tYWN0aXZlJ1xuICAgICAgXSxcbiAgICAgIHF1ZXJ5OiBqUXVlcnlcbiAgICB9KVxuICB9LFxuXG4gIHByZXZpZXdTZWxlY3RvcjogZnVuY3Rpb24gKGVsZW1lbnRDU1NTZWxlY3Rvcikge1xuICAgIGlmICh0aGlzLmRlZmVycmVkQ1NTU2VsZWN0b3JSZXNwb25zZS5zdGF0ZSgpICE9PSAncmVqZWN0ZWQnKSB7XG4gICAgICB0aGlzLmhpZ2hsaWdodFBhcmVudCgpXG4gICAgICAkKEVsZW1lbnRRdWVyeShlbGVtZW50Q1NTU2VsZWN0b3IsIHRoaXMucGFyZW50KSkuYWRkQ2xhc3MoJy1zaXRlbWFwLXNlbGVjdC1pdGVtLXNlbGVjdGVkJylcbiAgICAgIHRoaXMuZGVmZXJyZWRDU1NTZWxlY3RvclJlc3BvbnNlLnJlc29sdmUoKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmRlZmVycmVkQ1NTU2VsZWN0b3JSZXNwb25zZS5wcm9taXNlKClcbiAgfSxcblxuICBpbml0R1VJOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5oaWdobGlnaHRQYXJlbnQoKVxuXG5cdFx0Ly8gYWxsIGVsZW1lbnRzIGV4Y2VwdCB0b29sYmFyXG4gICAgdGhpcy4kYWxsRWxlbWVudHMgPSAkKHRoaXMuYWxsb3dlZEVsZW1lbnRzICsgJzpub3QoIy1zZWxlY3Rvci10b29sYmFyKTpub3QoIy1zZWxlY3Rvci10b29sYmFyICopJywgdGhpcy5wYXJlbnQpXG5cdFx0Ly8gYWxsb3cgc2VsZWN0aW5nIHBhcmVudCBhbHNvXG4gICAgaWYgKHRoaXMucGFyZW50ICE9PSBkb2N1bWVudC5ib2R5KSB7XG4gICAgICB0aGlzLiRhbGxFbGVtZW50cy5wdXNoKHRoaXMucGFyZW50KVxuICAgIH1cblxuICAgIHRoaXMuYmluZEVsZW1lbnRIaWdobGlnaHQoKVxuICAgIHRoaXMuYmluZEVsZW1lbnRTZWxlY3Rpb24oKVxuICAgIHRoaXMuYmluZEtleWJvYXJkU2VsZWN0aW9uTWFuaXB1bGF0aW9ucygpXG4gICAgdGhpcy5hdHRhY2hUb29sYmFyKClcbiAgICB0aGlzLmJpbmRNdWx0aXBsZUdyb3VwQ2hlY2tib3goKVxuICAgIHRoaXMuYmluZE11bHRpcGxlR3JvdXBQb3B1cEhpZGUoKVxuICAgIHRoaXMuYmluZE1vdmVJbWFnZXNUb1RvcCgpXG4gIH0sXG5cbiAgYmluZEVsZW1lbnRTZWxlY3Rpb246IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiRhbGxFbGVtZW50cy5iaW5kKCdjbGljay5lbGVtZW50U2VsZWN0b3InLCBmdW5jdGlvbiAoZSkge1xuICAgICAgdmFyIGVsZW1lbnQgPSBlLmN1cnJlbnRUYXJnZXRcbiAgICAgIGlmICh0aGlzLnNlbGVjdGVkRWxlbWVudHMuaW5kZXhPZihlbGVtZW50KSA9PT0gLTEpIHtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnRzLnB1c2goZWxlbWVudClcbiAgICAgIH1cbiAgICAgIHRoaXMuaGlnaGxpZ2h0U2VsZWN0ZWRFbGVtZW50cygpXG5cblx0XHRcdC8vIENhbmNlbCBhbGwgb3RoZXIgZXZlbnRzXG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG5cblx0LyoqXG5cdCAqIEFkZCB0byBzZWxlY3QgZWxlbWVudHMgdGhlIGVsZW1lbnQgdGhhdCBpcyB1bmRlciB0aGUgbW91c2Vcblx0ICovXG4gIHNlbGVjdE1vdXNlT3ZlckVsZW1lbnQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZWxlbWVudCA9IHRoaXMubW91c2VPdmVyRWxlbWVudFxuICAgIGlmIChlbGVtZW50KSB7XG4gICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudHMucHVzaChlbGVtZW50KVxuICAgICAgdGhpcy5oaWdobGlnaHRTZWxlY3RlZEVsZW1lbnRzKClcbiAgICB9XG4gIH0sXG5cbiAgYmluZEVsZW1lbnRIaWdobGlnaHQ6IGZ1bmN0aW9uICgpIHtcbiAgICAkKHRoaXMuJGFsbEVsZW1lbnRzKS5iaW5kKCdtb3VzZW92ZXIuZWxlbWVudFNlbGVjdG9yJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgIHZhciBlbGVtZW50ID0gZS5jdXJyZW50VGFyZ2V0XG4gICAgICB0aGlzLm1vdXNlT3ZlckVsZW1lbnQgPSBlbGVtZW50XG4gICAgICAkKGVsZW1lbnQpLmFkZENsYXNzKCctc2l0ZW1hcC1zZWxlY3QtaXRlbS1ob3ZlcicpXG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9LmJpbmQodGhpcykpLmJpbmQoJ21vdXNlb3V0LmVsZW1lbnRTZWxlY3RvcicsIGZ1bmN0aW9uIChlKSB7XG4gICAgICB2YXIgZWxlbWVudCA9IGUuY3VycmVudFRhcmdldFxuICAgICAgdGhpcy5tb3VzZU92ZXJFbGVtZW50ID0gbnVsbFxuICAgICAgJChlbGVtZW50KS5yZW1vdmVDbGFzcygnLXNpdGVtYXAtc2VsZWN0LWl0ZW0taG92ZXInKVxuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuXG4gIGJpbmRNb3ZlSW1hZ2VzVG9Ub3A6IGZ1bmN0aW9uICgpIHtcbiAgICAkKCdib2R5JykuYWRkQ2xhc3MoJy13ZWItc2NyYXBlci1zZWxlY3Rpb24tYWN0aXZlJylcblxuXHRcdC8vIGRvIHRoaXMgb25seSB3aGVuIHNlbGVjdGluZyBpbWFnZXNcbiAgICBpZiAodGhpcy5hbGxvd2VkRWxlbWVudHMgPT09ICdpbWcnKSB7XG4gICAgICAkKCdpbWcnKS5maWx0ZXIoZnVuY3Rpb24gKGksIGVsZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuICQoZWxlbWVudCkuY3NzKCdwb3NpdGlvbicpID09PSAnc3RhdGljJ1xuICAgICAgfSkuYWRkQ2xhc3MoJy13ZWItc2NyYXBlci1pbWctb24tdG9wJylcbiAgICB9XG4gIH0sXG5cbiAgdW5iaW5kTW92ZUltYWdlc1RvVG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgJCgnYm9keS4td2ViLXNjcmFwZXItc2VsZWN0aW9uLWFjdGl2ZScpLnJlbW92ZUNsYXNzKCctd2ViLXNjcmFwZXItc2VsZWN0aW9uLWFjdGl2ZScpXG4gICAgJCgnaW1nLi13ZWItc2NyYXBlci1pbWctb24tdG9wJykucmVtb3ZlQ2xhc3MoJy13ZWItc2NyYXBlci1pbWctb24tdG9wJylcbiAgfSxcblxuICBzZWxlY3RDaGlsZDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMudG9wLS1cbiAgICBpZiAodGhpcy50b3AgPCAwKSB7XG4gICAgICB0aGlzLnRvcCA9IDBcbiAgICB9XG4gIH0sXG4gIHNlbGVjdFBhcmVudDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMudG9wKytcbiAgfSxcblxuXHQvLyBVc2VyIHdpdGgga2V5Ym9hcmQgYXJyb3dzIGNhbiBzZWxlY3QgY2hpbGQgb3IgcGFyZXQgZWxlbWVudHMgb2Ygc2VsZWN0ZWQgZWxlbWVudHMuXG4gIGJpbmRLZXlib2FyZFNlbGVjdGlvbk1hbmlwdWxhdGlvbnM6IGZ1bmN0aW9uICgpIHtcblx0XHQvLyBjaGVjayBmb3IgZm9jdXNcbiAgICB2YXIgbGFzdEZvY3VzU3RhdHVzXG4gICAgdGhpcy5rZXlQcmVzc0ZvY3VzSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgZm9jdXMgPSBkb2N1bWVudC5oYXNGb2N1cygpXG4gICAgICBpZiAoZm9jdXMgPT09IGxhc3RGb2N1c1N0YXR1cykgcmV0dXJuXG4gICAgICBsYXN0Rm9jdXNTdGF0dXMgPSBmb2N1c1xuXG4gICAgICAkKCcjLXNlbGVjdG9yLXRvb2xiYXIgLmtleS1idXR0b24nKS50b2dnbGVDbGFzcygnaGlkZScsICFmb2N1cylcbiAgICAgICQoJyMtc2VsZWN0b3ItdG9vbGJhciAua2V5LWV2ZW50cycpLnRvZ2dsZUNsYXNzKCdoaWRlJywgZm9jdXMpXG4gICAgfSwgMjAwKVxuXG5cdFx0Ly8gVXNpbmcgdXAvZG93biBhcnJvd3MgdXNlciBjYW4gc2VsZWN0IGVsZW1lbnRzIGZyb20gdG9wIG9mIHRoZVxuXHRcdC8vIHNlbGVjdGVkIGVsZW1lbnRcbiAgICAkKGRvY3VtZW50KS5iaW5kKCdrZXlkb3duLnNlbGVjdGlvbk1hbmlwdWxhdGlvbicsIGZ1bmN0aW9uIChldmVudCkge1xuXHRcdFx0Ly8gc2VsZWN0IGNoaWxkIENcbiAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSA2Nykge1xuICAgICAgICB0aGlzLmFuaW1hdGVDbGlja2VkS2V5KCQoJyMtc2VsZWN0b3ItdG9vbGJhciAua2V5LWJ1dHRvbi1jaGlsZCcpKVxuICAgICAgICB0aGlzLnNlbGVjdENoaWxkKClcbiAgICAgIH1cblx0XHRcdC8vIHNlbGVjdCBwYXJlbnQgUFxuICAgICAgZWxzZSBpZiAoZXZlbnQua2V5Q29kZSA9PT0gODApIHtcbiAgICAgICAgdGhpcy5hbmltYXRlQ2xpY2tlZEtleSgkKCcjLXNlbGVjdG9yLXRvb2xiYXIgLmtleS1idXR0b24tcGFyZW50JykpXG4gICAgICAgIHRoaXMuc2VsZWN0UGFyZW50KClcbiAgICAgIH1cblx0XHRcdC8vIHNlbGVjdCBlbGVtZW50XG4gICAgICBlbHNlIGlmIChldmVudC5rZXlDb2RlID09PSA4Mykge1xuICAgICAgICB0aGlzLmFuaW1hdGVDbGlja2VkS2V5KCQoJyMtc2VsZWN0b3ItdG9vbGJhciAua2V5LWJ1dHRvbi1zZWxlY3QnKSlcbiAgICAgICAgdGhpcy5zZWxlY3RNb3VzZU92ZXJFbGVtZW50KClcbiAgICAgIH1cblxuICAgICAgdGhpcy5oaWdobGlnaHRTZWxlY3RlZEVsZW1lbnRzKClcbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG5cbiAgYW5pbWF0ZUNsaWNrZWRLZXk6IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgJChlbGVtZW50KS5yZW1vdmVDbGFzcygnY2xpY2tlZCcpLnJlbW92ZUNsYXNzKCdjbGlja2VkLWFuaW1hdGlvbicpXG4gICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAkKGVsZW1lbnQpLmFkZENsYXNzKCdjbGlja2VkJylcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAkKGVsZW1lbnQpLmFkZENsYXNzKCdjbGlja2VkLWFuaW1hdGlvbicpXG4gICAgICB9LCAxMDApXG4gICAgfSwgMSlcbiAgfSxcblxuICBoaWdobGlnaHRTZWxlY3RlZEVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgIHZhciByZXN1bHRDc3NTZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudENTU1NlbGVjdG9yKClcblxuICAgICAgJCgnYm9keSAjLXNlbGVjdG9yLXRvb2xiYXIgLnNlbGVjdG9yJykudGV4dChyZXN1bHRDc3NTZWxlY3Rvcilcblx0XHRcdC8vIGhpZ2hsaWdodCBzZWxlY3RlZCBlbGVtZW50c1xuICAgICAgJCgnLi1zaXRlbWFwLXNlbGVjdC1pdGVtLXNlbGVjdGVkJykucmVtb3ZlQ2xhc3MoJy1zaXRlbWFwLXNlbGVjdC1pdGVtLXNlbGVjdGVkJylcbiAgICAgICQoRWxlbWVudFF1ZXJ5KHJlc3VsdENzc1NlbGVjdG9yLCB0aGlzLnBhcmVudCkpLmFkZENsYXNzKCctc2l0ZW1hcC1zZWxlY3QtaXRlbS1zZWxlY3RlZCcpXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAoZXJyID09PSAnZm91bmQgbXVsdGlwbGUgZWxlbWVudCBncm91cHMsIGJ1dCBhbGxvd011bHRpcGxlU2VsZWN0b3JzIGRpc2FibGVkJykge1xuICAgICAgICBjb25zb2xlLmxvZygnbXVsdGlwbGUgZGlmZmVyZW50IGVsZW1lbnQgc2VsZWN0aW9uIGRpc2FibGVkJylcblxuICAgICAgICB0aGlzLnNob3dNdWx0aXBsZUdyb3VwUG9wdXAoKVxuXHRcdFx0XHQvLyByZW1vdmUgbGFzdCBhZGRlZCBlbGVtZW50XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50cy5wb3AoKVxuICAgICAgICB0aGlzLmhpZ2hsaWdodFNlbGVjdGVkRWxlbWVudHMoKVxuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBzaG93TXVsdGlwbGVHcm91cFBvcHVwOiBmdW5jdGlvbiAoKSB7XG4gICAgJCgnIy1zZWxlY3Rvci10b29sYmFyIC5wb3BvdmVyJykuYXR0cignc3R5bGUnLCAnZGlzcGxheTpibG9jayAhaW1wb3J0YW50OycpXG4gIH0sXG5cbiAgaGlkZU11bHRpcGxlR3JvdXBQb3B1cDogZnVuY3Rpb24gKCkge1xuICAgICQoJyMtc2VsZWN0b3ItdG9vbGJhciAucG9wb3ZlcicpLmF0dHIoJ3N0eWxlJywgJycpXG4gIH0sXG5cbiAgYmluZE11bHRpcGxlR3JvdXBQb3B1cEhpZGU6IGZ1bmN0aW9uICgpIHtcbiAgICAkKCcjLXNlbGVjdG9yLXRvb2xiYXIgLnBvcG92ZXIgLmNsb3NlJykuY2xpY2sodGhpcy5oaWRlTXVsdGlwbGVHcm91cFBvcHVwLmJpbmQodGhpcykpXG4gIH0sXG5cbiAgdW5iaW5kTXVsdGlwbGVHcm91cFBvcHVwSGlkZTogZnVuY3Rpb24gKCkge1xuICAgICQoJyMtc2VsZWN0b3ItdG9vbGJhciAucG9wb3ZlciAuY2xvc2UnKS51bmJpbmQoJ2NsaWNrJylcbiAgfSxcblxuICBiaW5kTXVsdGlwbGVHcm91cENoZWNrYm94OiBmdW5jdGlvbiAoKSB7XG4gICAgJCgnIy1zZWxlY3Rvci10b29sYmFyIFtuYW1lPWRpZmVyZW50RWxlbWVudFNlbGVjdGlvbl0nKS5jaGFuZ2UoZnVuY3Rpb24gKGUpIHtcbiAgICAgIGlmICgkKGUuY3VycmVudFRhcmdldCkuaXMoJzpjaGVja2VkJykpIHtcbiAgICAgICAgdGhpcy5pbml0Q3NzU2VsZWN0b3IodHJ1ZSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuaW5pdENzc1NlbGVjdG9yKGZhbHNlKVxuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcbiAgdW5iaW5kTXVsdGlwbGVHcm91cENoZWNrYm94OiBmdW5jdGlvbiAoKSB7XG4gICAgJCgnIy1zZWxlY3Rvci10b29sYmFyIC5kaWZlcmVudEVsZW1lbnRTZWxlY3Rpb24nKS51bmJpbmQoJ2NoYW5nZScpXG4gIH0sXG5cbiAgYXR0YWNoVG9vbGJhcjogZnVuY3Rpb24gKCkge1xuICAgIHZhciAkdG9vbGJhciA9ICc8ZGl2IGlkPVwiLXNlbGVjdG9yLXRvb2xiYXJcIj4nICtcblx0XHRcdCc8ZGl2IGNsYXNzPVwibGlzdC1pdGVtXCI+PGRpdiBjbGFzcz1cInNlbGVjdG9yLWNvbnRhaW5lclwiPjxkaXYgY2xhc3M9XCJzZWxlY3RvclwiPjwvZGl2PjwvZGl2PjwvZGl2PicgK1xuXHRcdFx0JzxkaXYgY2xhc3M9XCJpbnB1dC1ncm91cC1hZGRvbiBsaXN0LWl0ZW1cIj4nICtcblx0XHRcdFx0JzxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiB0aXRsZT1cIkVuYWJsZSBkaWZmZXJlbnQgdHlwZSBlbGVtZW50IHNlbGVjdGlvblwiIG5hbWU9XCJkaWZlcmVudEVsZW1lbnRTZWxlY3Rpb25cIj4nICtcblx0XHRcdFx0JzxkaXYgY2xhc3M9XCJwb3BvdmVyIHRvcFwiPicgK1xuXHRcdFx0XHQnPGRpdiBjbGFzcz1cImNsb3NlXCI+w5c8L2Rpdj4nICtcblx0XHRcdFx0JzxkaXYgY2xhc3M9XCJhcnJvd1wiPjwvZGl2PicgK1xuXHRcdFx0XHQnPGRpdiBjbGFzcz1cInBvcG92ZXItY29udGVudFwiPicgK1xuXHRcdFx0XHQnPGRpdiBjbGFzcz1cInR4dFwiPicgK1xuXHRcdFx0XHQnRGlmZmVyZW50IHR5cGUgZWxlbWVudCBzZWxlY3Rpb24gaXMgZGlzYWJsZWQuIElmIHRoZSBlbGVtZW50ICcgK1xuXHRcdFx0XHQneW91IGNsaWNrZWQgc2hvdWxkIGFsc28gYmUgaW5jbHVkZWQgdGhlbiBlbmFibGUgdGhpcyBhbmQgJyArXG5cdFx0XHRcdCdjbGljayBvbiB0aGUgZWxlbWVudCBhZ2Fpbi4gVXN1YWxseSB0aGlzIGlzIG5vdCBuZWVkZWQuJyArXG5cdFx0XHRcdCc8L2Rpdj4nICtcblx0XHRcdFx0JzwvZGl2PicgK1xuXHRcdFx0XHQnPC9kaXY+JyArXG5cdFx0XHQnPC9kaXY+JyArXG5cdFx0XHQnPGRpdiBjbGFzcz1cImxpc3QtaXRlbSBrZXktZXZlbnRzXCI+PGRpdiB0aXRsZT1cIkNsaWNrIGhlcmUgdG8gZW5hYmxlIGtleSBwcmVzcyBldmVudHMgZm9yIHNlbGVjdGlvblwiPkVuYWJsZSBrZXkgZXZlbnRzPC9kaXY+PC9kaXY+JyArXG5cdFx0XHQnPGRpdiBjbGFzcz1cImxpc3QtaXRlbSBrZXktYnV0dG9uIGtleS1idXR0b24tc2VsZWN0IGhpZGVcIiB0aXRsZT1cIlVzZSBTIGtleSB0byBzZWxlY3QgZWxlbWVudFwiPlM8L2Rpdj4nICtcblx0XHRcdCc8ZGl2IGNsYXNzPVwibGlzdC1pdGVtIGtleS1idXR0b24ga2V5LWJ1dHRvbi1wYXJlbnQgaGlkZVwiIHRpdGxlPVwiVXNlIFAga2V5IHRvIHNlbGVjdCBwYXJlbnRcIj5QPC9kaXY+JyArXG5cdFx0XHQnPGRpdiBjbGFzcz1cImxpc3QtaXRlbSBrZXktYnV0dG9uIGtleS1idXR0b24tY2hpbGQgaGlkZVwiIHRpdGxlPVwiVXNlIEMga2V5IHRvIHNlbGVjdCBjaGlsZFwiPkM8L2Rpdj4nICtcblx0XHRcdCc8ZGl2IGNsYXNzPVwibGlzdC1pdGVtIGRvbmUtc2VsZWN0aW5nLWJ1dHRvblwiPkRvbmUgc2VsZWN0aW5nITwvZGl2PicgK1xuXHRcdFx0JzwvZGl2PidcbiAgICAkKCdib2R5JykuYXBwZW5kKCR0b29sYmFyKVxuXG4gICAgJCgnYm9keSAjLXNlbGVjdG9yLXRvb2xiYXIgLmRvbmUtc2VsZWN0aW5nLWJ1dHRvbicpLmNsaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuc2VsZWN0aW9uRmluaXNoZWQoKVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcbiAgaGlnaGxpZ2h0UGFyZW50OiBmdW5jdGlvbiAoKSB7XG5cdFx0Ly8gZG8gbm90IGhpZ2hsaWdodCBwYXJlbnQgaWYgaXRzIHRoZSBib2R5XG4gICAgaWYgKCEkKHRoaXMucGFyZW50KS5pcygnYm9keScpICYmICEkKHRoaXMucGFyZW50KS5pcygnI3dlYnBhZ2UnKSkge1xuICAgICAgJCh0aGlzLnBhcmVudCkuYWRkQ2xhc3MoJy1zaXRlbWFwLXBhcmVudCcpXG4gICAgfVxuICB9LFxuXG4gIHVuYmluZEVsZW1lbnRTZWxlY3Rpb246IGZ1bmN0aW9uICgpIHtcbiAgICAkKHRoaXMuJGFsbEVsZW1lbnRzKS51bmJpbmQoJ2NsaWNrLmVsZW1lbnRTZWxlY3RvcicpXG5cdFx0Ly8gcmVtb3ZlIGhpZ2hsaWdodGVkIGVsZW1lbnQgY2xhc3Nlc1xuICAgIHRoaXMudW5iaW5kRWxlbWVudFNlbGVjdGlvbkhpZ2hsaWdodCgpXG4gIH0sXG4gIHVuYmluZEVsZW1lbnRTZWxlY3Rpb25IaWdobGlnaHQ6IGZ1bmN0aW9uICgpIHtcbiAgICAkKCcuLXNpdGVtYXAtc2VsZWN0LWl0ZW0tc2VsZWN0ZWQnKS5yZW1vdmVDbGFzcygnLXNpdGVtYXAtc2VsZWN0LWl0ZW0tc2VsZWN0ZWQnKVxuICAgICQoJy4tc2l0ZW1hcC1wYXJlbnQnKS5yZW1vdmVDbGFzcygnLXNpdGVtYXAtcGFyZW50JylcbiAgfSxcbiAgdW5iaW5kRWxlbWVudEhpZ2hsaWdodDogZnVuY3Rpb24gKCkge1xuICAgICQodGhpcy4kYWxsRWxlbWVudHMpLnVuYmluZCgnbW91c2VvdmVyLmVsZW1lbnRTZWxlY3RvcicpXG5cdFx0XHQudW5iaW5kKCdtb3VzZW91dC5lbGVtZW50U2VsZWN0b3InKVxuICB9LFxuICB1bmJpbmRLZXlib2FyZFNlbGVjdGlvbk1haXB1bGF0aW9zOiBmdW5jdGlvbiAoKSB7XG4gICAgJChkb2N1bWVudCkudW5iaW5kKCdrZXlkb3duLnNlbGVjdGlvbk1hbmlwdWxhdGlvbicpXG4gICAgY2xlYXJJbnRlcnZhbCh0aGlzLmtleVByZXNzRm9jdXNJbnRlcnZhbClcbiAgfSxcbiAgcmVtb3ZlVG9vbGJhcjogZnVuY3Rpb24gKCkge1xuICAgICQoJ2JvZHkgIy1zZWxlY3Rvci10b29sYmFyIGEnKS51bmJpbmQoJ2NsaWNrJylcbiAgICAkKCcjLXNlbGVjdG9yLXRvb2xiYXInKS5yZW1vdmUoKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBSZW1vdmUgdG9vbGJhciBhbmQgdW5iaW5kIGV2ZW50c1xuXHQgKi9cbiAgcmVtb3ZlR1VJOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy51bmJpbmRFbGVtZW50U2VsZWN0aW9uKClcbiAgICB0aGlzLnVuYmluZEVsZW1lbnRIaWdobGlnaHQoKVxuICAgIHRoaXMudW5iaW5kS2V5Ym9hcmRTZWxlY3Rpb25NYWlwdWxhdGlvcygpXG4gICAgdGhpcy51bmJpbmRNdWx0aXBsZUdyb3VwUG9wdXBIaWRlKClcbiAgICB0aGlzLnVuYmluZE11bHRpcGxlR3JvdXBDaGVja2JveCgpXG4gICAgdGhpcy51bmJpbmRNb3ZlSW1hZ2VzVG9Ub3AoKVxuICAgIHRoaXMucmVtb3ZlVG9vbGJhcigpXG4gIH0sXG5cbiAgc2VsZWN0aW9uRmluaXNoZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcmVzdWx0Q3NzU2VsZWN0b3IgPSB0aGlzLmdldEN1cnJlbnRDU1NTZWxlY3RvcigpXG5cbiAgICB0aGlzLmRlZmVycmVkQ1NTU2VsZWN0b3JSZXNwb25zZS5yZXNvbHZlKHtcbiAgICAgIENTU1NlbGVjdG9yOiByZXN1bHRDc3NTZWxlY3RvclxuICAgIH0pXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50U2VsZWN0b3JcbiIsInZhciBTZWxlY3Rvckxpc3QgPSByZXF1aXJlKCcuL1NlbGVjdG9yTGlzdCcpXG52YXIgU2l0ZW1hcCA9IHJlcXVpcmUoJy4vU2l0ZW1hcCcpXG52YXIgd2hlbkNhbGxTZXF1ZW50aWFsbHkgPSByZXF1aXJlKCcuLi9hc3NldHMvanF1ZXJ5LndoZW5jYWxsc2VxdWVudGlhbGx5JylcbnZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxuXG52YXIgRGF0YUV4dHJhY3RvciA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIGlmIChvcHRpb25zLnNpdGVtYXAgaW5zdGFuY2VvZiBTaXRlbWFwKSB7XG4gICAgdGhpcy5zaXRlbWFwID0gb3B0aW9ucy5zaXRlbWFwXG4gIH0gZWxzZSB7XG4gICAgdGhpcy5zaXRlbWFwID0gbmV3IFNpdGVtYXAob3B0aW9ucy5zaXRlbWFwKVxuICB9XG5cbiAgdGhpcy5wYXJlbnRTZWxlY3RvcklkID0gb3B0aW9ucy5wYXJlbnRTZWxlY3RvcklkXG4gIHRoaXMucGFyZW50RWxlbWVudCA9IG9wdGlvbnMucGFyZW50RWxlbWVudCB8fCAkKCdodG1sJylbMF1cbn1cblxuRGF0YUV4dHJhY3Rvci5wcm90b3R5cGUgPSB7XG5cblx0LyoqXG5cdCAqIFJldHVybnMgYSBsaXN0IG9mIGluZGVwZW5kZW50IHNlbGVjdG9yIGxpc3RzLiBmb2xsb3c9dHJ1ZSBzcGxpdHMgc2VsZWN0b3JzIGluIHRyZWVzLlxuXHQgKiBUd28gc2lkZSBieSBzaWRlIHR5cGU9bXVsdGlwbGUgc2VsZWN0b3JzIHNwbGl0IHRyZWVzLlxuXHQgKi9cbiAgZmluZFNlbGVjdG9yVHJlZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fZmluZFNlbGVjdG9yVHJlZXModGhpcy5wYXJlbnRTZWxlY3RvcklkLCBuZXcgU2VsZWN0b3JMaXN0KCkpXG4gIH0sXG5cblx0LyoqXG5cdCAqIHRoZSBzZWxlY3RvciBjYW5ub3QgcmV0dXJuIG11bHRpcGxlIHJlY29yZHMgYW5kIGl0IGFsc28gY2Fubm90IGNyZWF0ZSBuZXcgam9icy4gQWxzbyBhbGwgb2YgaXRzIGNoaWxkIHNlbGVjdG9yc1xuXHQgKiBtdXN0IGhhdmUgdGhlIHNhbWUgZmVhdHVyZXNcblx0ICogQHBhcmFtIHNlbGVjdG9yXG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHQgKi9cbiAgc2VsZWN0b3JJc0NvbW1vblRvQWxsVHJlZXM6IGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuXHRcdC8vIHNlbGVjdG9ycyB3aGljaCByZXR1cm4gbXV0aXBsZSBpdGVtcyBjYW5ub3QgYmUgY29tbW9uIHRvIGFsbFxuXHRcdC8vIHNlbGVjdG9yc1xuICAgIGlmIChzZWxlY3Rvci53aWxsUmV0dXJuTXVsdGlwbGVSZWNvcmRzKCkpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cblxuXHRcdC8vIExpbmsgc2VsZWN0b3JzIHdoaWNoIHdpbGwgZm9sbG93IHRvIGEgbmV3IHBhZ2UgYWxzbyBjYW5ub3QgYmUgY29tbW9uXG5cdFx0Ly8gdG8gYWxsIHNlbGVjdG9yc1xuICAgIGlmIChzZWxlY3Rvci5jYW5DcmVhdGVOZXdKb2JzKCkgJiZcblx0XHRcdHRoaXMuc2l0ZW1hcC5nZXREaXJlY3RDaGlsZFNlbGVjdG9ycyhzZWxlY3Rvci5pZCkubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG5cdFx0Ly8gYWxzbyBhbGwgY2hpbGQgc2VsZWN0b3JzIG11c3QgaGF2ZSB0aGUgc2FtZSBmZWF0dXJlc1xuICAgIHZhciBjaGlsZFNlbGVjdG9ycyA9IHRoaXMuc2l0ZW1hcC5nZXRBbGxTZWxlY3RvcnMoc2VsZWN0b3IuaWQpXG4gICAgZm9yICh2YXIgaSBpbiBjaGlsZFNlbGVjdG9ycykge1xuICAgICAgdmFyIGNoaWxkU2VsZWN0b3IgPSBjaGlsZFNlbGVjdG9yc1tpXVxuICAgICAgaWYgKCF0aGlzLnNlbGVjdG9ySXNDb21tb25Ub0FsbFRyZWVzKGNoaWxkU2VsZWN0b3IpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGdldFNlbGVjdG9yc0NvbW1vblRvQWxsVHJlZXM6IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3RvcklkKSB7XG4gICAgdmFyIGNvbW1vblNlbGVjdG9ycyA9IFtdXG4gICAgdmFyIGNoaWxkU2VsZWN0b3JzID0gdGhpcy5zaXRlbWFwLmdldERpcmVjdENoaWxkU2VsZWN0b3JzKHBhcmVudFNlbGVjdG9ySWQpXG5cbiAgICBjaGlsZFNlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChjaGlsZFNlbGVjdG9yKSB7XG4gICAgICBpZiAodGhpcy5zZWxlY3RvcklzQ29tbW9uVG9BbGxUcmVlcyhjaGlsZFNlbGVjdG9yKSkge1xuICAgICAgICBjb21tb25TZWxlY3RvcnMucHVzaChjaGlsZFNlbGVjdG9yKVxuXHRcdFx0XHQvLyBhbHNvIGFkZCBhbGwgY2hpbGQgc2VsZWN0b3JzIHdoaWNoLiBDaGlsZCBzZWxlY3RvcnMgd2VyZSBhbHNvIGNoZWNrZWRcblxuICAgICAgICB2YXIgc2VsZWN0b3JDaGlsZFNlbGVjdG9ycyA9IHRoaXMuc2l0ZW1hcC5nZXRBbGxTZWxlY3RvcnMoY2hpbGRTZWxlY3Rvci5pZClcbiAgICAgICAgc2VsZWN0b3JDaGlsZFNlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgICAgIGlmIChjb21tb25TZWxlY3RvcnMuaW5kZXhPZihzZWxlY3RvcikgPT09IC0xKSB7XG4gICAgICAgICAgICBjb21tb25TZWxlY3RvcnMucHVzaChzZWxlY3RvcilcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgcmV0dXJuIGNvbW1vblNlbGVjdG9yc1xuICB9LFxuXG4gIF9maW5kU2VsZWN0b3JUcmVlczogZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9ySWQsIGNvbW1vblNlbGVjdG9yc0Zyb21QYXJlbnQpIHtcbiAgICB2YXIgY29tbW9uU2VsZWN0b3JzID0gY29tbW9uU2VsZWN0b3JzRnJvbVBhcmVudC5jb25jYXQodGhpcy5nZXRTZWxlY3RvcnNDb21tb25Ub0FsbFRyZWVzKHBhcmVudFNlbGVjdG9ySWQpKVxuXG5cdFx0Ly8gZmluZCBzZWxlY3RvcnMgdGhhdCB3aWxsIGJlIG1ha2luZyBhIHNlbGVjdG9yIHRyZWVcbiAgICB2YXIgc2VsZWN0b3JUcmVlcyA9IFtdXG4gICAgdmFyIGNoaWxkU2VsZWN0b3JzID0gdGhpcy5zaXRlbWFwLmdldERpcmVjdENoaWxkU2VsZWN0b3JzKHBhcmVudFNlbGVjdG9ySWQpXG4gICAgY2hpbGRTZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgIGlmICghdGhpcy5zZWxlY3RvcklzQ29tbW9uVG9BbGxUcmVlcyhzZWxlY3RvcikpIHtcblx0XHRcdFx0Ly8gdGhpcyBzZWxlY3RvciB3aWxsIGJlIG1ha2luZyBhIG5ldyBzZWxlY3RvciB0cmVlLiBCdXQgdGhpcyBzZWxlY3RvciBtaWdodCBjb250YWluIHNvbWUgY2hpbGRcblx0XHRcdFx0Ly8gc2VsZWN0b3JzIHRoYXQgYXJlIG1ha2luZyBtb3JlIHRyZWVzIHNvIGhlcmUgc2hvdWxkIGJlIGEgc29tZSBraW5kIG9mIHNlcGVyYXRpb24gZm9yIHRoYXRcbiAgICAgICAgaWYgKCFzZWxlY3Rvci5jYW5IYXZlTG9jYWxDaGlsZFNlbGVjdG9ycygpKSB7XG4gICAgICAgICAgdmFyIHNlbGVjdG9yVHJlZSA9IGNvbW1vblNlbGVjdG9ycy5jb25jYXQoW3NlbGVjdG9yXSlcbiAgICAgICAgICBzZWxlY3RvclRyZWVzLnB1c2goc2VsZWN0b3JUcmVlKVxuICAgICAgICB9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIGZpbmQgc2VsZWN0b3IgdHJlZSB3aXRoaW4gdGhpcyBzZWxlY3RvclxuICAgICAgICAgIHZhciBjb21tb25TZWxlY3RvcnNGcm9tUGFyZW50ID0gY29tbW9uU2VsZWN0b3JzLmNvbmNhdChbc2VsZWN0b3JdKVxuICAgICAgICAgIHZhciBjaGlsZFNlbGVjdG9yVHJlZXMgPSB0aGlzLl9maW5kU2VsZWN0b3JUcmVlcyhzZWxlY3Rvci5pZCwgY29tbW9uU2VsZWN0b3JzRnJvbVBhcmVudClcbiAgICAgICAgICBzZWxlY3RvclRyZWVzID0gc2VsZWN0b3JUcmVlcy5jb25jYXQoY2hpbGRTZWxlY3RvclRyZWVzKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKVxuXG5cdFx0Ly8gaXQgdGhlcmUgd2VyZSBub3QgYW55IHNlbGVjdG9ycyB0aGF0IG1ha2UgYSBzZXBhcmF0ZSB0cmVlIHRoZW4gYWxsIGNvbW1vbiBzZWxlY3RvcnMgbWFrZSB1cCBhIHNpbmdsZSBzZWxlY3RvciB0cmVlXG4gICAgaWYgKHNlbGVjdG9yVHJlZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gW2NvbW1vblNlbGVjdG9yc11cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHNlbGVjdG9yVHJlZXNcbiAgICB9XG4gIH0sXG5cbiAgZ2V0U2VsZWN0b3JUcmVlQ29tbW9uRGF0YTogZnVuY3Rpb24gKHNlbGVjdG9ycywgcGFyZW50U2VsZWN0b3JJZCwgcGFyZW50RWxlbWVudCkge1xuICAgIHZhciBjaGlsZFNlbGVjdG9ycyA9IHNlbGVjdG9ycy5nZXREaXJlY3RDaGlsZFNlbGVjdG9ycyhwYXJlbnRTZWxlY3RvcklkKVxuICAgIHZhciBkZWZlcnJlZERhdGFDYWxscyA9IFtdXG4gICAgY2hpbGRTZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgIGlmICghc2VsZWN0b3JzLndpbGxSZXR1cm5NdWx0aXBsZVJlY29yZHMoc2VsZWN0b3IuaWQpKSB7XG4gICAgICAgIGRlZmVycmVkRGF0YUNhbGxzLnB1c2godGhpcy5nZXRTZWxlY3RvckNvbW1vbkRhdGEuYmluZCh0aGlzLCBzZWxlY3RvcnMsIHNlbGVjdG9yLCBwYXJlbnRFbGVtZW50KSlcbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgd2hlbkNhbGxTZXF1ZW50aWFsbHkoZGVmZXJyZWREYXRhQ2FsbHMpLmRvbmUoZnVuY3Rpb24gKHJlc3BvbnNlcykge1xuICAgICAgdmFyIGNvbW1vbkRhdGEgPSB7fVxuICAgICAgcmVzcG9uc2VzLmZvckVhY2goZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgY29tbW9uRGF0YSA9IE9iamVjdC5tZXJnZShjb21tb25EYXRhLCBkYXRhKVxuICAgICAgfSlcbiAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZShjb21tb25EYXRhKVxuICAgIH0pXG5cbiAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZVxuICB9LFxuXG4gIGdldFNlbGVjdG9yQ29tbW9uRGF0YTogZnVuY3Rpb24gKHNlbGVjdG9ycywgc2VsZWN0b3IsIHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIGRlZmVycmVkRGF0YSA9IHNlbGVjdG9yLmdldERhdGEocGFyZW50RWxlbWVudClcbiAgICBkZWZlcnJlZERhdGEuZG9uZShmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgaWYgKHNlbGVjdG9yLndpbGxSZXR1cm5FbGVtZW50cygpKSB7XG4gICAgICAgIHZhciBuZXdQYXJlbnRFbGVtZW50ID0gZGF0YVswXVxuICAgICAgICB2YXIgZGVmZXJyZWRDaGlsZENvbW1vbkRhdGEgPSB0aGlzLmdldFNlbGVjdG9yVHJlZUNvbW1vbkRhdGEoc2VsZWN0b3JzLCBzZWxlY3Rvci5pZCwgbmV3UGFyZW50RWxlbWVudClcbiAgICAgICAgZGVmZXJyZWRDaGlsZENvbW1vbkRhdGEuZG9uZShmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgIGQucmVzb2x2ZShkYXRhKVxuICAgICAgICB9KVxuICAgICAgfVx0XHRcdGVsc2Uge1xuICAgICAgICBkLnJlc29sdmUoZGF0YVswXSlcbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICByZXR1cm4gZFxuICB9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIGFsbCBkYXRhIHJlY29yZHMgZm9yIGEgc2VsZWN0b3IgdGhhdCBjYW4gcmV0dXJuIG11bHRpcGxlIHJlY29yZHNcblx0ICovXG4gIGdldE11bHRpU2VsZWN0b3JEYXRhOiBmdW5jdGlvbiAoc2VsZWN0b3JzLCBzZWxlY3RvciwgcGFyZW50RWxlbWVudCwgY29tbW9uRGF0YSkge1xuICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgZGVmZXJyZWREYXRhXG5cdFx0Ly8gaWYgdGhlIHNlbGVjdG9yIGlzIG5vdCBhbiBFbGVtZW50IHNlbGVjdG9yIHRoZW4gaXRzIGZldGNoZWQgZGF0YSBpcyB0aGUgcmVzdWx0LlxuICAgIGlmICghc2VsZWN0b3Iud2lsbFJldHVybkVsZW1lbnRzKCkpIHtcbiAgICAgIGRlZmVycmVkRGF0YSA9IHNlbGVjdG9yLmdldERhdGEocGFyZW50RWxlbWVudClcbiAgICAgIGRlZmVycmVkRGF0YS5kb25lKGZ1bmN0aW9uIChzZWxlY3RvckRhdGEpIHtcbiAgICAgICAgdmFyIG5ld0NvbW1vbkRhdGEgPSBPYmplY3QuY2xvbmUoY29tbW9uRGF0YSwgdHJ1ZSlcbiAgICAgICAgdmFyIHJlc3VsdERhdGEgPSBbXVxuXG4gICAgICAgIHNlbGVjdG9yRGF0YS5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgICBPYmplY3QubWVyZ2UocmVjb3JkLCBuZXdDb21tb25EYXRhLCB0cnVlKVxuICAgICAgICAgIHJlc3VsdERhdGEucHVzaChyZWNvcmQpXG4gICAgICAgIH0pXG5cbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKHJlc3VsdERhdGEpXG4gICAgICB9KVxuICAgIH1cblxuXHRcdC8vIGhhbmRsZSBzaXR1YXRpb24gd2hlbiB0aGlzIHNlbGVjdG9yIGlzIGFuIGVsZW1lbnRTZWxlY3RvclxuICAgIGRlZmVycmVkRGF0YSA9IHNlbGVjdG9yLmdldERhdGEocGFyZW50RWxlbWVudClcbiAgICBkZWZlcnJlZERhdGEuZG9uZShmdW5jdGlvbiAoc2VsZWN0b3JEYXRhKSB7XG4gICAgICB2YXIgZGVmZXJyZWREYXRhQ2FsbHMgPSBbXVxuXG4gICAgICBzZWxlY3RvckRhdGEuZm9yRWFjaChmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICB2YXIgbmV3Q29tbW9uRGF0YSA9IE9iamVjdC5jbG9uZShjb21tb25EYXRhLCB0cnVlKVxuICAgICAgICB2YXIgY2hpbGRSZWNvcmREZWZlcnJlZENhbGwgPSB0aGlzLmdldFNlbGVjdG9yVHJlZURhdGEuYmluZCh0aGlzLCBzZWxlY3RvcnMsIHNlbGVjdG9yLmlkLCBlbGVtZW50LCBuZXdDb21tb25EYXRhKVxuICAgICAgICBkZWZlcnJlZERhdGFDYWxscy5wdXNoKGNoaWxkUmVjb3JkRGVmZXJyZWRDYWxsKVxuICAgICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgICB3aGVuQ2FsbFNlcXVlbnRpYWxseShkZWZlcnJlZERhdGFDYWxscykuZG9uZShmdW5jdGlvbiAocmVzcG9uc2VzKSB7XG4gICAgICAgIHZhciByZXN1bHREYXRhID0gW11cbiAgICAgICAgcmVzcG9uc2VzLmZvckVhY2goZnVuY3Rpb24gKGNoaWxkUmVjb3JkTGlzdCkge1xuICAgICAgICAgIGNoaWxkUmVjb3JkTGlzdC5mb3JFYWNoKGZ1bmN0aW9uIChjaGlsZFJlY29yZCkge1xuICAgICAgICAgICAgdmFyIHJlYyA9IHt9XG4gICAgICAgICAgICBPYmplY3QubWVyZ2UocmVjLCBjaGlsZFJlY29yZCwgdHJ1ZSlcbiAgICAgICAgICAgIHJlc3VsdERhdGEucHVzaChyZWMpXG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKHJlc3VsdERhdGEpXG4gICAgICB9KVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlXG4gIH0sXG5cbiAgZ2V0U2VsZWN0b3JUcmVlRGF0YTogZnVuY3Rpb24gKHNlbGVjdG9ycywgcGFyZW50U2VsZWN0b3JJZCwgcGFyZW50RWxlbWVudCwgY29tbW9uRGF0YSkge1xuICAgIHZhciBjaGlsZFNlbGVjdG9ycyA9IHNlbGVjdG9ycy5nZXREaXJlY3RDaGlsZFNlbGVjdG9ycyhwYXJlbnRTZWxlY3RvcklkKVxuICAgIHZhciBjaGlsZENvbW1vbkRhdGFEZWZlcnJlZCA9IHRoaXMuZ2V0U2VsZWN0b3JUcmVlQ29tbW9uRGF0YShzZWxlY3RvcnMsIHBhcmVudFNlbGVjdG9ySWQsIHBhcmVudEVsZW1lbnQpXG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgY2hpbGRDb21tb25EYXRhRGVmZXJyZWQuZG9uZShmdW5jdGlvbiAoY2hpbGRDb21tb25EYXRhKSB7XG4gICAgICBjb21tb25EYXRhID0gT2JqZWN0Lm1lcmdlKGNvbW1vbkRhdGEsIGNoaWxkQ29tbW9uRGF0YSlcblxuICAgICAgdmFyIGRhdGFEZWZlcnJlZENhbGxzID0gW11cblxuICAgICAgY2hpbGRTZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgICAgaWYgKHNlbGVjdG9ycy53aWxsUmV0dXJuTXVsdGlwbGVSZWNvcmRzKHNlbGVjdG9yLmlkKSkge1xuICAgICAgICAgIHZhciBuZXdDb21tb25EYXRhID0gT2JqZWN0LmNsb25lKGNvbW1vbkRhdGEsIHRydWUpXG4gICAgICAgICAgdmFyIGRhdGFEZWZlcnJlZENhbGwgPSB0aGlzLmdldE11bHRpU2VsZWN0b3JEYXRhLmJpbmQodGhpcywgc2VsZWN0b3JzLCBzZWxlY3RvciwgcGFyZW50RWxlbWVudCwgbmV3Q29tbW9uRGF0YSlcbiAgICAgICAgICBkYXRhRGVmZXJyZWRDYWxscy5wdXNoKGRhdGFEZWZlcnJlZENhbGwpXG4gICAgICAgIH1cbiAgICAgIH0uYmluZCh0aGlzKSlcblxuXHRcdFx0Ly8gbWVyZ2UgYWxsIGRhdGEgcmVjb3JkcyB0b2dldGhlclxuICAgICAgd2hlbkNhbGxTZXF1ZW50aWFsbHkoZGF0YURlZmVycmVkQ2FsbHMpLmRvbmUoZnVuY3Rpb24gKHJlc3BvbnNlcykge1xuICAgICAgICB2YXIgcmVzdWx0RGF0YSA9IFtdXG4gICAgICAgIHJlc3BvbnNlcy5mb3JFYWNoKGZ1bmN0aW9uIChjaGlsZFJlY29yZHMpIHtcbiAgICAgICAgICBjaGlsZFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAoY2hpbGRSZWNvcmQpIHtcbiAgICAgICAgICAgIHZhciByZWMgPSB7fVxuICAgICAgICAgICAgT2JqZWN0Lm1lcmdlKHJlYywgY2hpbGRSZWNvcmQsIHRydWUpXG4gICAgICAgICAgICByZXN1bHREYXRhLnB1c2gocmVjKVxuICAgICAgICAgIH0pXG4gICAgICAgIH0pXG5cbiAgICAgICAgaWYgKHJlc3VsdERhdGEubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdFx0Ly8gSWYgdGhlcmUgYXJlIG5vIG11bHRpIHJlY29yZCBncm91cHMgdGhlbiByZXR1cm4gY29tbW9uIGRhdGEuXG5cdFx0XHRcdFx0Ly8gSW4gYSBjYXNlIHdoZXJlIGNvbW1vbiBkYXRhIGlzIGVtcHR5IHJldHVybiBub3RoaW5nLlxuICAgICAgICAgIGlmIChPYmplY3Qua2V5cyhjb21tb25EYXRhKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZShbXSlcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKFtjb21tb25EYXRhXSlcbiAgICAgICAgICB9XG4gICAgICAgIH1cdFx0XHRcdGVsc2Uge1xuICAgICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZShyZXN1bHREYXRhKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlXG4gIH0sXG5cbiAgZ2V0RGF0YTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxlY3RvclRyZWVzID0gdGhpcy5maW5kU2VsZWN0b3JUcmVlcygpXG4gICAgdmFyIGRhdGFEZWZlcnJlZENhbGxzID0gW11cblxuICAgIHNlbGVjdG9yVHJlZXMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3JUcmVlKSB7XG4gICAgICB2YXIgZGVmZXJyZWRUcmVlRGF0YUNhbGwgPSB0aGlzLmdldFNlbGVjdG9yVHJlZURhdGEuYmluZCh0aGlzLCBzZWxlY3RvclRyZWUsIHRoaXMucGFyZW50U2VsZWN0b3JJZCwgdGhpcy5wYXJlbnRFbGVtZW50LCB7fSlcbiAgICAgIGRhdGFEZWZlcnJlZENhbGxzLnB1c2goZGVmZXJyZWRUcmVlRGF0YUNhbGwpXG4gICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgdmFyIHJlc3BvbnNlRGVmZXJyZWQgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHdoZW5DYWxsU2VxdWVudGlhbGx5KGRhdGFEZWZlcnJlZENhbGxzKS5kb25lKGZ1bmN0aW9uIChyZXNwb25zZXMpIHtcbiAgICAgIHZhciByZXN1bHRzID0gW11cbiAgICAgIHJlc3BvbnNlcy5mb3JFYWNoKGZ1bmN0aW9uIChkYXRhUmVzdWx0cykge1xuICAgICAgICByZXN1bHRzID0gcmVzdWx0cy5jb25jYXQoZGF0YVJlc3VsdHMpXG4gICAgICB9KVxuICAgICAgcmVzcG9uc2VEZWZlcnJlZC5yZXNvbHZlKHJlc3VsdHMpXG4gICAgfSlcbiAgICByZXR1cm4gcmVzcG9uc2VEZWZlcnJlZFxuICB9LFxuXG4gIGdldFNpbmdsZVNlbGVjdG9yRGF0YTogZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9ySWRzLCBzZWxlY3RvcklkKSB7XG5cdFx0Ly8gdG8gZmV0Y2ggb25seSBzaW5nbGUgc2VsZWN0b3JzIGRhdGEgd2Ugd2lsbCBjcmVhdGUgYSBzaXRlbWFwIHRoYXQgb25seSBjb250YWlucyB0aGlzIHNlbGVjdG9yLCBoaXNcblx0XHQvLyBwYXJlbnRzIGFuZCBhbGwgY2hpbGQgc2VsZWN0b3JzXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnNpdGVtYXBcbiAgICB2YXIgc2VsZWN0b3IgPSB0aGlzLnNpdGVtYXAuc2VsZWN0b3JzLmdldFNlbGVjdG9yKHNlbGVjdG9ySWQpXG4gICAgdmFyIGNoaWxkU2VsZWN0b3JzID0gc2l0ZW1hcC5zZWxlY3RvcnMuZ2V0QWxsU2VsZWN0b3JzKHNlbGVjdG9ySWQpXG4gICAgdmFyIHBhcmVudFNlbGVjdG9ycyA9IFtdXG4gICAgdmFyIGlcbiAgICB2YXIgaWRcbiAgICB2YXIgcGFyZW50U2VsZWN0b3JcbiAgICBmb3IgKGkgPSBwYXJlbnRTZWxlY3Rvcklkcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgaWQgPSBwYXJlbnRTZWxlY3Rvcklkc1tpXVxuICAgICAgaWYgKGlkID09PSAnX3Jvb3QnKSBicmVha1xuICAgICAgcGFyZW50U2VsZWN0b3IgPSB0aGlzLnNpdGVtYXAuc2VsZWN0b3JzLmdldFNlbGVjdG9yKGlkKVxuICAgICAgcGFyZW50U2VsZWN0b3JzLnB1c2gocGFyZW50U2VsZWN0b3IpXG4gICAgfVxuXG5cdFx0Ly8gbWVyZ2UgYWxsIG5lZWRlZCBzZWxlY3RvcnMgdG9nZXRoZXJcbiAgICB2YXIgc2VsZWN0b3JzID0gcGFyZW50U2VsZWN0b3JzLmNvbmNhdChjaGlsZFNlbGVjdG9ycylcbiAgICBzZWxlY3RvcnMucHVzaChzZWxlY3RvcilcbiAgICBzaXRlbWFwLnNlbGVjdG9ycyA9IG5ldyBTZWxlY3Rvckxpc3Qoc2VsZWN0b3JzKVxuXG4gICAgdmFyIHBhcmVudFNlbGVjdG9ySWRcblx0XHQvLyBmaW5kIHRoZSBwYXJlbnQgdGhhdCBsZWFkZWQgdG8gdGhlIHBhZ2Ugd2hlcmUgcmVxdWlyZWQgc2VsZWN0b3IgaXMgYmVpbmcgdXNlZFxuICAgIGZvciAoaSA9IHBhcmVudFNlbGVjdG9ySWRzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICBpZCA9IHBhcmVudFNlbGVjdG9ySWRzW2ldXG4gICAgICBpZiAoaWQgPT09ICdfcm9vdCcpIHtcbiAgICAgICAgcGFyZW50U2VsZWN0b3JJZCA9IGlkXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBwYXJlbnRTZWxlY3RvciA9IHRoaXMuc2l0ZW1hcC5zZWxlY3RvcnMuZ2V0U2VsZWN0b3IocGFyZW50U2VsZWN0b3JJZHNbaV0pXG4gICAgICBpZiAoIXBhcmVudFNlbGVjdG9yLndpbGxSZXR1cm5FbGVtZW50cygpKSB7XG4gICAgICAgIHBhcmVudFNlbGVjdG9ySWQgPSBpZFxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnBhcmVudFNlbGVjdG9ySWQgPSBwYXJlbnRTZWxlY3RvcklkXG5cbiAgICByZXR1cm4gdGhpcy5nZXREYXRhKClcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IERhdGFFeHRyYWN0b3JcbiIsIi8qKlxuICogRWxlbWVudCBzZWxlY3Rvci4gVXNlcyBqUXVlcnkgYXMgYmFzZSBhbmQgYWRkcyBzb21lIG1vcmUgZmVhdHVyZXNcbiAqIEBwYXJhbSBwYXJlbnRFbGVtZW50XG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqL1xudmFyIEVsZW1lbnRRdWVyeSA9IGZ1bmN0aW9uIChDU1NTZWxlY3RvciwgcGFyZW50RWxlbWVudCkge1xuICBDU1NTZWxlY3RvciA9IENTU1NlbGVjdG9yIHx8ICcnXG5cbiAgdmFyIHNlbGVjdGVkRWxlbWVudHMgPSBbXVxuXG4gIHZhciBhZGRFbGVtZW50ID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICBpZiAoc2VsZWN0ZWRFbGVtZW50cy5pbmRleE9mKGVsZW1lbnQpID09PSAtMSkge1xuICAgICAgc2VsZWN0ZWRFbGVtZW50cy5wdXNoKGVsZW1lbnQpXG4gICAgfVxuICB9XG5cbiAgdmFyIHNlbGVjdG9yUGFydHMgPSBFbGVtZW50UXVlcnkuZ2V0U2VsZWN0b3JQYXJ0cyhDU1NTZWxlY3RvcilcbiAgc2VsZWN0b3JQYXJ0cy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuXHRcdC8vIGhhbmRsZSBzcGVjaWFsIGNhc2Ugd2hlbiBwYXJlbnQgaXMgc2VsZWN0ZWRcbiAgICBpZiAoc2VsZWN0b3IgPT09ICdfcGFyZW50XycpIHtcbiAgICAgICQocGFyZW50RWxlbWVudCkuZWFjaChmdW5jdGlvbiAoaSwgZWxlbWVudCkge1xuICAgICAgICBhZGRFbGVtZW50KGVsZW1lbnQpXG4gICAgICB9KVxuICAgIH1cdFx0ZWxzZSB7XG4gICAgICB2YXIgZWxlbWVudHMgPSAkKHNlbGVjdG9yLCAkKHBhcmVudEVsZW1lbnQpKVxuICAgICAgZWxlbWVudHMuZWFjaChmdW5jdGlvbiAoaSwgZWxlbWVudCkge1xuICAgICAgICBhZGRFbGVtZW50KGVsZW1lbnQpXG4gICAgICB9KVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gc2VsZWN0ZWRFbGVtZW50c1xufVxuXG5FbGVtZW50UXVlcnkuZ2V0U2VsZWN0b3JQYXJ0cyA9IGZ1bmN0aW9uIChDU1NTZWxlY3Rvcikge1xuICB2YXIgc2VsZWN0b3JzID0gQ1NTU2VsZWN0b3Iuc3BsaXQoLygsfFwiLio/XCJ8Jy4qPyd8XFwoLio/XFwpKS8pXG5cbiAgdmFyIHJlc3VsdFNlbGVjdG9ycyA9IFtdXG4gIHZhciBjdXJyZW50U2VsZWN0b3IgPSAnJ1xuICBzZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICBpZiAoc2VsZWN0b3IgPT09ICcsJykge1xuICAgICAgaWYgKGN1cnJlbnRTZWxlY3Rvci50cmltKCkubGVuZ3RoKSB7XG4gICAgICAgIHJlc3VsdFNlbGVjdG9ycy5wdXNoKGN1cnJlbnRTZWxlY3Rvci50cmltKCkpXG4gICAgICB9XG4gICAgICBjdXJyZW50U2VsZWN0b3IgPSAnJ1xuICAgIH1cdFx0ZWxzZSB7XG4gICAgICBjdXJyZW50U2VsZWN0b3IgKz0gc2VsZWN0b3JcbiAgICB9XG4gIH0pXG4gIGlmIChjdXJyZW50U2VsZWN0b3IudHJpbSgpLmxlbmd0aCkge1xuICAgIHJlc3VsdFNlbGVjdG9ycy5wdXNoKGN1cnJlbnRTZWxlY3Rvci50cmltKCkpXG4gIH1cblxuICByZXR1cm4gcmVzdWx0U2VsZWN0b3JzXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRWxlbWVudFF1ZXJ5XG4iLCJ2YXIgc2VsZWN0b3JzID0gcmVxdWlyZSgnLi9TZWxlY3RvcnMnKVxudmFyIEVsZW1lbnRRdWVyeSA9IHJlcXVpcmUoJy4vRWxlbWVudFF1ZXJ5JylcbnZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxuXG52YXIgU2VsZWN0b3IgPSBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgdGhpcy51cGRhdGVEYXRhKHNlbGVjdG9yKVxuICB0aGlzLmluaXRUeXBlKClcbn1cblxuU2VsZWN0b3IucHJvdG90eXBlID0ge1xuXG5cdC8qKlxuXHQgKiBJcyB0aGlzIHNlbGVjdG9yIGNvbmZpZ3VyZWQgdG8gcmV0dXJuIG11bHRpcGxlIGl0ZW1zP1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICovXG4gIHdpbGxSZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5jYW5SZXR1cm5NdWx0aXBsZVJlY29yZHMoKSAmJiB0aGlzLm11bHRpcGxlXG4gIH0sXG5cblx0LyoqXG5cdCAqIFVwZGF0ZSBjdXJyZW50IHNlbGVjdG9yIGNvbmZpZ3VyYXRpb25cblx0ICogQHBhcmFtIGRhdGFcblx0ICovXG4gIHVwZGF0ZURhdGE6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdmFyIGFsbG93ZWRLZXlzID0gWydpZCcsICd0eXBlJywgJ3NlbGVjdG9yJywgJ3BhcmVudFNlbGVjdG9ycyddXG4gICAgY29uc29sZS5sb2coJ2RhdGEgdHlwZScsIGRhdGEudHlwZSlcbiAgICBhbGxvd2VkS2V5cyA9IGFsbG93ZWRLZXlzLmNvbmNhdChzZWxlY3RvcnNbZGF0YS50eXBlXS5nZXRGZWF0dXJlcygpKVxuICAgIHZhciBrZXlcblx0XHQvLyB1cGRhdGUgZGF0YVxuICAgIGZvciAoa2V5IGluIGRhdGEpIHtcbiAgICAgIGlmIChhbGxvd2VkS2V5cy5pbmRleE9mKGtleSkgIT09IC0xIHx8IHR5cGVvZiBkYXRhW2tleV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpc1trZXldID0gZGF0YVtrZXldXG4gICAgICB9XG4gICAgfVxuXG5cdFx0Ly8gcmVtb3ZlIHZhbHVlcyB0aGF0IGFyZSBub3QgbmVlZGVkIGZvciB0aGlzIHR5cGUgb2Ygc2VsZWN0b3JcbiAgICBmb3IgKGtleSBpbiB0aGlzKSB7XG4gICAgICBpZiAoYWxsb3dlZEtleXMuaW5kZXhPZihrZXkpID09PSAtMSAmJiB0eXBlb2YgdGhpc1trZXldICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzW2tleV1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cblx0LyoqXG5cdCAqIENTUyBzZWxlY3RvciB3aGljaCB3aWxsIGJlIHVzZWQgZm9yIGVsZW1lbnQgc2VsZWN0aW9uXG5cdCAqIEByZXR1cm5zIHtzdHJpbmd9XG5cdCAqL1xuICBnZXRJdGVtQ1NTU2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gJyonXG4gIH0sXG5cblx0LyoqXG5cdCAqIG92ZXJyaWRlIG9iamVjdHMgbWV0aG9kcyBiYXNlZCBvbiBzZWxldG9yIHR5cGVcblx0ICovXG4gIGluaXRUeXBlOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHNlbGVjdG9yc1t0aGlzLnR5cGVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignU2VsZWN0b3IgdHlwZSBub3QgZGVmaW5lZCAnICsgdGhpcy50eXBlKVxuICAgIH1cblxuXHRcdC8vIG92ZXJyaWRlcyBvYmplY3RzIG1ldGhvZHNcbiAgICBmb3IgKHZhciBpIGluIHNlbGVjdG9yc1t0aGlzLnR5cGVdKSB7XG4gICAgICB0aGlzW2ldID0gc2VsZWN0b3JzW3RoaXMudHlwZV1baV1cbiAgICB9XG4gIH0sXG5cblx0LyoqXG5cdCAqIENoZWNrIHdoZXRoZXIgYSBzZWxlY3RvciBpcyBhIHBhcmVuIHNlbGVjdG9yIG9mIHRoaXMgc2VsZWN0b3Jcblx0ICogQHBhcmFtIHNlbGVjdG9ySWRcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuICBoYXNQYXJlbnRTZWxlY3RvcjogZnVuY3Rpb24gKHNlbGVjdG9ySWQpIHtcbiAgICByZXR1cm4gKHRoaXMucGFyZW50U2VsZWN0b3JzLmluZGV4T2Yoc2VsZWN0b3JJZCkgIT09IC0xKVxuICB9LFxuXG4gIHJlbW92ZVBhcmVudFNlbGVjdG9yOiBmdW5jdGlvbiAoc2VsZWN0b3JJZCkge1xuICAgIHZhciBpbmRleCA9IHRoaXMucGFyZW50U2VsZWN0b3JzLmluZGV4T2Yoc2VsZWN0b3JJZClcbiAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICB0aGlzLnBhcmVudFNlbGVjdG9ycy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgfVxuICB9LFxuXG4gIHJlbmFtZVBhcmVudFNlbGVjdG9yOiBmdW5jdGlvbiAob3JpZ2luYWxJZCwgcmVwbGFjZW1lbnRJZCkge1xuICAgIGlmICh0aGlzLmhhc1BhcmVudFNlbGVjdG9yKG9yaWdpbmFsSWQpKSB7XG4gICAgICB2YXIgcG9zID0gdGhpcy5wYXJlbnRTZWxlY3RvcnMuaW5kZXhPZihvcmlnaW5hbElkKVxuICAgICAgdGhpcy5wYXJlbnRTZWxlY3RvcnMuc3BsaWNlKHBvcywgMSwgcmVwbGFjZW1lbnRJZClcbiAgICB9XG4gIH0sXG5cbiAgZ2V0RGF0YUVsZW1lbnRzOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBlbGVtZW50cyA9IEVsZW1lbnRRdWVyeSh0aGlzLnNlbGVjdG9yLCBwYXJlbnRFbGVtZW50KVxuICAgIGlmICh0aGlzLm11bHRpcGxlKSB7XG4gICAgICByZXR1cm4gZWxlbWVudHNcbiAgICB9IGVsc2UgaWYgKGVsZW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiBbZWxlbWVudHNbMF1dXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBbXVxuICAgIH1cbiAgfSxcblxuICBnZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBkID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgdGltZW91dCA9IHRoaXMuZGVsYXkgfHwgMFxuXG5cdFx0Ly8gdGhpcyB3b3JrcyBtdWNoIGZhc3RlciBiZWNhdXNlIHdoZW5DYWxsU2VxdWVudGFsbHkgaXNuJ3QgcnVubmluZyBuZXh0IGRhdGEgZXh0cmFjdGlvbiBpbW1lZGlhdGVseVxuICAgIGlmICh0aW1lb3V0ID09PSAwKSB7XG4gICAgICB2YXIgZGVmZXJyZWREYXRhID0gdGhpcy5fZ2V0RGF0YShwYXJlbnRFbGVtZW50KVxuICAgICAgZGVmZXJyZWREYXRhLmRvbmUoZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgZC5yZXNvbHZlKGRhdGEpXG4gICAgICB9KVxuICAgIH1cdFx0ZWxzZSB7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRlZmVycmVkRGF0YSA9IHRoaXMuX2dldERhdGEocGFyZW50RWxlbWVudClcbiAgICAgICAgZGVmZXJyZWREYXRhLmRvbmUoZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICBkLnJlc29sdmUoZGF0YSlcbiAgICAgICAgfSlcbiAgICAgIH0uYmluZCh0aGlzKSwgdGltZW91dClcbiAgICB9XG5cbiAgICByZXR1cm4gZC5wcm9taXNlKClcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcblxudmFyIFNlbGVjdG9yRWxlbWVudCA9IHtcblxuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkNyZWF0ZU5ld0pvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuICAgIGRmZC5yZXNvbHZlKGpRdWVyeS5tYWtlQXJyYXkoZWxlbWVudHMpKVxuXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbXVxuICB9LFxuXG4gIGdldEZlYXR1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFsnbXVsdGlwbGUnLCAnZGVsYXknXVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JFbGVtZW50XG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciBTZWxlY3RvckVsZW1lbnRBdHRyaWJ1dGUgPSB7XG4gIGNhblJldHVybk11bHRpcGxlUmVjb3JkczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUNoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZGZkID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICAgIHZhciBlbGVtZW50cyA9IHRoaXMuZ2V0RGF0YUVsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG5cbiAgICB2YXIgcmVzdWx0ID0gW11cbiAgICAkKGVsZW1lbnRzKS5lYWNoKGZ1bmN0aW9uIChrLCBlbGVtZW50KSB7XG4gICAgICB2YXIgZGF0YSA9IHt9XG5cbiAgICAgIGRhdGFbdGhpcy5pZF0gPSAkKGVsZW1lbnQpLmF0dHIodGhpcy5leHRyYWN0QXR0cmlidXRlKVxuICAgICAgcmVzdWx0LnB1c2goZGF0YSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICBpZiAodGhpcy5tdWx0aXBsZSA9PT0gZmFsc2UgJiYgZWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICBkYXRhW3RoaXMuaWQgKyAnLXNyYyddID0gbnVsbFxuICAgICAgcmVzdWx0LnB1c2goZGF0YSlcbiAgICB9XG4gICAgZGZkLnJlc29sdmUocmVzdWx0KVxuXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbdGhpcy5pZF1cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2V4dHJhY3RBdHRyaWJ1dGUnLCAnZGVsYXknXVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JFbGVtZW50QXR0cmlidXRlXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciBVbmlxdWVFbGVtZW50TGlzdCA9IHJlcXVpcmUoJy4vLi4vVW5pcXVlRWxlbWVudExpc3QnKVxudmFyIEVsZW1lbnRRdWVyeSA9IHJlcXVpcmUoJy4vLi4vRWxlbWVudFF1ZXJ5JylcbnZhciBDc3NTZWxlY3RvciA9IHJlcXVpcmUoJ2Nzcy1zZWxlY3RvcicpLkNzc1NlbGVjdG9yXG52YXIgU2VsZWN0b3JFbGVtZW50Q2xpY2sgPSB7XG5cbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgZ2V0Q2xpY2tFbGVtZW50czogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgY2xpY2tFbGVtZW50cyA9IEVsZW1lbnRRdWVyeSh0aGlzLmNsaWNrRWxlbWVudFNlbGVjdG9yLCBwYXJlbnRFbGVtZW50KVxuICAgIHJldHVybiBjbGlja0VsZW1lbnRzXG4gIH0sXG5cblx0LyoqXG5cdCAqIENoZWNrIHdoZXRoZXIgZWxlbWVudCBpcyBzdGlsbCByZWFjaGFibGUgZnJvbSBodG1sLiBVc2VmdWwgdG8gY2hlY2sgd2hldGhlciB0aGUgZWxlbWVudCBpcyByZW1vdmVkIGZyb20gRE9NLlxuXHQgKiBAcGFyYW0gZWxlbWVudFxuXHQgKi9cbiAgaXNFbGVtZW50SW5IVE1MOiBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgIHJldHVybiAkKGVsZW1lbnQpLmNsb3Nlc3QoJ2h0bWwnKS5sZW5ndGggIT09IDBcbiAgfSxcblxuICB0cmlnZ2VyQnV0dG9uQ2xpY2s6IGZ1bmN0aW9uIChjbGlja0VsZW1lbnQpIHtcbiAgICB2YXIgY3MgPSBuZXcgQ3NzU2VsZWN0b3Ioe1xuICAgICAgZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yOiBmYWxzZSxcbiAgICAgIHBhcmVudDogJCgnYm9keScpWzBdLFxuICAgICAgZW5hYmxlUmVzdWx0U3RyaXBwaW5nOiBmYWxzZVxuICAgIH0pXG4gICAgdmFyIGNzc1NlbGVjdG9yID0gY3MuZ2V0Q3NzU2VsZWN0b3IoW2NsaWNrRWxlbWVudF0pXG5cblx0XHQvLyB0aGlzIGZ1bmN0aW9uIHdpbGwgY2F0Y2ggd2luZG93Lm9wZW4gY2FsbCBhbmQgcGxhY2UgdGhlIHJlcXVlc3RlZCB1cmwgYXMgdGhlIGVsZW1lbnRzIGRhdGEgYXR0cmlidXRlXG4gICAgdmFyIHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpXG4gICAgc2NyaXB0LnR5cGUgPSAndGV4dC9qYXZhc2NyaXB0J1xuICAgIHNjcmlwdC50ZXh0ID0gJycgK1xuXHRcdFx0JyhmdW5jdGlvbigpeyAnICtcblx0XHRcdFwidmFyIGVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnXCIgKyBjc3NTZWxlY3RvciArIFwiJylbMF07IFwiICtcblx0XHRcdCdlbC5jbGljaygpOyAnICtcblx0XHRcdCd9KSgpOydcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHNjcmlwdClcbiAgfSxcblxuICBnZXRDbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZTogZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiAndW5pcXVlVGV4dCdcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGVcbiAgICB9XG4gIH0sXG5cbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyIGRlbGF5ID0gcGFyc2VJbnQodGhpcy5kZWxheSkgfHwgMFxuICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgZm91bmRFbGVtZW50cyA9IG5ldyBVbmlxdWVFbGVtZW50TGlzdCgndW5pcXVlVGV4dCcpXG4gICAgdmFyIGNsaWNrRWxlbWVudHMgPSB0aGlzLmdldENsaWNrRWxlbWVudHMocGFyZW50RWxlbWVudClcbiAgICB2YXIgZG9uZUNsaWNraW5nRWxlbWVudHMgPSBuZXcgVW5pcXVlRWxlbWVudExpc3QodGhpcy5nZXRDbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSgpKVxuXG5cdFx0Ly8gYWRkIGVsZW1lbnRzIHRoYXQgYXJlIGF2YWlsYWJsZSBiZWZvcmUgY2xpY2tpbmdcbiAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuICAgIGVsZW1lbnRzLmZvckVhY2goZm91bmRFbGVtZW50cy5wdXNoLmJpbmQoZm91bmRFbGVtZW50cykpXG5cblx0XHQvLyBkaXNjYXJkIGluaXRpYWwgZWxlbWVudHNcbiAgICBpZiAodGhpcy5kaXNjYXJkSW5pdGlhbEVsZW1lbnRzKSB7XG4gICAgICBmb3VuZEVsZW1lbnRzID0gbmV3IFVuaXF1ZUVsZW1lbnRMaXN0KCd1bmlxdWVUZXh0JylcbiAgICB9XG5cblx0XHQvLyBubyBlbGVtZW50cyB0byBjbGljayBhdCB0aGUgYmVnaW5uaW5nXG4gICAgaWYgKGNsaWNrRWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUoZm91bmRFbGVtZW50cylcbiAgICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICAgIH1cblxuXHRcdC8vIGluaXRpYWwgY2xpY2sgYW5kIHdhaXRcbiAgICB2YXIgY3VycmVudENsaWNrRWxlbWVudCA9IGNsaWNrRWxlbWVudHNbMF1cbiAgICB0aGlzLnRyaWdnZXJCdXR0b25DbGljayhjdXJyZW50Q2xpY2tFbGVtZW50KVxuICAgIHZhciBuZXh0RWxlbWVudFNlbGVjdGlvbiA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCkgKyBkZWxheVxuXG5cdFx0Ly8gaW5maW5pdGVseSBzY3JvbGwgZG93biBhbmQgZmluZCBhbGwgaXRlbXNcbiAgICB2YXIgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG5cdFx0XHQvLyBmaW5kIHRob3NlIGNsaWNrIGVsZW1lbnRzIHRoYXQgYXJlIG5vdCBpbiB0aGUgYmxhY2sgbGlzdFxuICAgICAgdmFyIGFsbENsaWNrRWxlbWVudHMgPSB0aGlzLmdldENsaWNrRWxlbWVudHMocGFyZW50RWxlbWVudClcbiAgICAgIGNsaWNrRWxlbWVudHMgPSBbXVxuICAgICAgYWxsQ2xpY2tFbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIGlmICghZG9uZUNsaWNraW5nRWxlbWVudHMuaXNBZGRlZChlbGVtZW50KSkge1xuICAgICAgICAgIGNsaWNrRWxlbWVudHMucHVzaChlbGVtZW50KVxuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICB2YXIgbm93ID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKVxuXHRcdFx0Ly8gc2xlZXAuIHdhaXQgd2hlbiB0byBleHRyYWN0IG5leHQgZWxlbWVudHNcbiAgICAgIGlmIChub3cgPCBuZXh0RWxlbWVudFNlbGVjdGlvbikge1xuXHRcdFx0XHQvLyBjb25zb2xlLmxvZyhcIndhaXRcIik7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG5cdFx0XHQvLyBhZGQgbmV3bHkgZm91bmQgZWxlbWVudHMgdG8gZWxlbWVudCBmb3VuZEVsZW1lbnRzIGFycmF5LlxuICAgICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcbiAgICAgIHZhciBhZGRlZEFuRWxlbWVudCA9IGZhbHNlXG4gICAgICBlbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIHZhciBhZGRlZCA9IGZvdW5kRWxlbWVudHMucHVzaChlbGVtZW50KVxuICAgICAgICBpZiAoYWRkZWQpIHtcbiAgICAgICAgICBhZGRlZEFuRWxlbWVudCA9IHRydWVcbiAgICAgICAgfVxuICAgICAgfSlcblx0XHRcdC8vIGNvbnNvbGUubG9nKFwiYWRkZWRcIiwgYWRkZWRBbkVsZW1lbnQpO1xuXG5cdFx0XHQvLyBubyBuZXcgZWxlbWVudHMgZm91bmQuIFN0b3AgY2xpY2tpbmcgdGhpcyBidXR0b25cbiAgICAgIGlmICghYWRkZWRBbkVsZW1lbnQpIHtcbiAgICAgICAgZG9uZUNsaWNraW5nRWxlbWVudHMucHVzaChjdXJyZW50Q2xpY2tFbGVtZW50KVxuICAgICAgfVxuXG5cdFx0XHQvLyBjb250aW51ZSBjbGlja2luZyBhbmQgYWRkIGRlbGF5LCBidXQgaWYgdGhlcmUgaXMgbm90aGluZ1xuXHRcdFx0Ly8gbW9yZSB0byBjbGljayB0aGUgZmluaXNoXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhcInRvdGFsIGJ1dHRvbnNcIiwgY2xpY2tFbGVtZW50cy5sZW5ndGgpXG4gICAgICBpZiAoY2xpY2tFbGVtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbClcbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKGZvdW5kRWxlbWVudHMpXG4gICAgICB9IGVsc2Uge1xuXHRcdFx0XHQvLyBjb25zb2xlLmxvZyhcImNsaWNrXCIpO1xuICAgICAgICBjdXJyZW50Q2xpY2tFbGVtZW50ID0gY2xpY2tFbGVtZW50c1swXVxuXHRcdFx0XHQvLyBjbGljayBvbiBlbGVtZW50cyBvbmx5IG9uY2UgaWYgdGhlIHR5cGUgaXMgY2xpY2tvbmNlXG4gICAgICAgIGlmICh0aGlzLmNsaWNrVHlwZSA9PT0gJ2NsaWNrT25jZScpIHtcbiAgICAgICAgICBkb25lQ2xpY2tpbmdFbGVtZW50cy5wdXNoKGN1cnJlbnRDbGlja0VsZW1lbnQpXG4gICAgICAgIH1cbiAgICAgICAgdGhpcy50cmlnZ2VyQnV0dG9uQ2xpY2soY3VycmVudENsaWNrRWxlbWVudClcbiAgICAgICAgbmV4dEVsZW1lbnRTZWxlY3Rpb24gPSBub3cgKyBkZWxheVxuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSwgNTApXG5cbiAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZS5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbXVxuICB9LFxuXG4gIGdldEZlYXR1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFsnbXVsdGlwbGUnLCAnZGVsYXknLCAnY2xpY2tFbGVtZW50U2VsZWN0b3InLCAnY2xpY2tUeXBlJywgJ2Rpc2NhcmRJbml0aWFsRWxlbWVudHMnLCAnY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUnXVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JFbGVtZW50Q2xpY2tcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxudmFyIFNlbGVjdG9yRWxlbWVudFNjcm9sbCA9IHtcblxuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkNyZWF0ZU5ld0pvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcbiAgc2Nyb2xsVG9Cb3R0b206IGZ1bmN0aW9uICgpIHtcbiAgICB3aW5kb3cuc2Nyb2xsVG8oMCwgZG9jdW1lbnQuYm9keS5zY3JvbGxIZWlnaHQpXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBkZWxheSA9IHBhcnNlSW50KHRoaXMuZGVsYXkpIHx8IDBcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIGZvdW5kRWxlbWVudHMgPSBbXVxuXG5cdFx0Ly8gaW5pdGlhbGx5IHNjcm9sbCBkb3duIGFuZCB3YWl0XG4gICAgdGhpcy5zY3JvbGxUb0JvdHRvbSgpXG4gICAgdmFyIG5leHRFbGVtZW50U2VsZWN0aW9uID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKSArIGRlbGF5XG5cblx0XHQvLyBpbmZpbml0ZWx5IHNjcm9sbCBkb3duIGFuZCBmaW5kIGFsbCBpdGVtc1xuICAgIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBub3cgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpXG5cdFx0XHQvLyBzbGVlcC4gd2FpdCB3aGVuIHRvIGV4dHJhY3QgbmV4dCBlbGVtZW50c1xuICAgICAgaWYgKG5vdyA8IG5leHRFbGVtZW50U2VsZWN0aW9uKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuXHRcdFx0Ly8gbm8gbmV3IGVsZW1lbnRzIGZvdW5kXG4gICAgICBpZiAoZWxlbWVudHMubGVuZ3RoID09PSBmb3VuZEVsZW1lbnRzLmxlbmd0aCkge1xuICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKVxuICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUoalF1ZXJ5Lm1ha2VBcnJheShlbGVtZW50cykpXG4gICAgICB9IGVsc2Uge1xuXHRcdFx0XHQvLyBjb250aW51ZSBzY3JvbGxpbmcgYW5kIGFkZCBkZWxheVxuICAgICAgICBmb3VuZEVsZW1lbnRzID0gZWxlbWVudHNcbiAgICAgICAgdGhpcy5zY3JvbGxUb0JvdHRvbSgpXG4gICAgICAgIG5leHRFbGVtZW50U2VsZWN0aW9uID0gbm93ICsgZGVsYXlcbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcyksIDUwKVxuXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW11cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2RlbGF5J11cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yRWxlbWVudFNjcm9sbFxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgU2VsZWN0b3JHcm91cCA9IHtcblxuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5IYXZlTG9jYWxDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkNyZWF0ZU5ld0pvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBkZmQgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG5cdFx0Ly8gY2Fubm90IHJldXNlIHRoaXMuZ2V0RGF0YUVsZW1lbnRzIGJlY2F1c2UgaXQgZGVwZW5kcyBvbiAqbXVsdGlwbGUqIHByb3BlcnR5XG4gICAgdmFyIGVsZW1lbnRzID0gJCh0aGlzLnNlbGVjdG9yLCBwYXJlbnRFbGVtZW50KVxuXG4gICAgdmFyIHJlY29yZHMgPSBbXVxuICAgICQoZWxlbWVudHMpLmVhY2goZnVuY3Rpb24gKGssIGVsZW1lbnQpIHtcbiAgICAgIHZhciBkYXRhID0ge31cblxuICAgICAgZGF0YVt0aGlzLmlkXSA9ICQoZWxlbWVudCkudGV4dCgpXG5cbiAgICAgIGlmICh0aGlzLmV4dHJhY3RBdHRyaWJ1dGUpIHtcbiAgICAgICAgZGF0YVt0aGlzLmlkICsgJy0nICsgdGhpcy5leHRyYWN0QXR0cmlidXRlXSA9ICQoZWxlbWVudCkuYXR0cih0aGlzLmV4dHJhY3RBdHRyaWJ1dGUpXG4gICAgICB9XG5cbiAgICAgIHJlY29yZHMucHVzaChkYXRhKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIHZhciByZXN1bHQgPSB7fVxuICAgIHJlc3VsdFt0aGlzLmlkXSA9IHJlY29yZHNcblxuICAgIGRmZC5yZXNvbHZlKFtyZXN1bHRdKVxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW3RoaXMuaWRdXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydkZWxheScsICdleHRyYWN0QXR0cmlidXRlJ11cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yR3JvdXBcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxudmFyIFNlbGVjdG9ySFRNTCA9IHtcblxuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuXG4gICAgdmFyIHJlc3VsdCA9IFtdXG4gICAgJChlbGVtZW50cykuZWFjaChmdW5jdGlvbiAoaywgZWxlbWVudCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuICAgICAgdmFyIGh0bWwgPSAkKGVsZW1lbnQpLmh0bWwoKVxuXG4gICAgICBpZiAodGhpcy5yZWdleCAhPT0gdW5kZWZpbmVkICYmIHRoaXMucmVnZXgubGVuZ3RoKSB7XG4gICAgICAgIHZhciBtYXRjaGVzID0gaHRtbC5tYXRjaChuZXcgUmVnRXhwKHRoaXMucmVnZXgpKVxuICAgICAgICBpZiAobWF0Y2hlcyAhPT0gbnVsbCkge1xuICAgICAgICAgIGh0bWwgPSBtYXRjaGVzWzBdXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaHRtbCA9IG51bGxcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZGF0YVt0aGlzLmlkXSA9IGh0bWxcblxuICAgICAgcmVzdWx0LnB1c2goZGF0YSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICBpZiAodGhpcy5tdWx0aXBsZSA9PT0gZmFsc2UgJiYgZWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICBkYXRhW3RoaXMuaWRdID0gbnVsbFxuICAgICAgcmVzdWx0LnB1c2goZGF0YSlcbiAgICB9XG5cbiAgICBkZmQucmVzb2x2ZShyZXN1bHQpXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbdGhpcy5pZF1cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ3JlZ2V4JywgJ2RlbGF5J11cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9ySFRNTFxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgd2hlbkNhbGxTZXF1ZW50aWFsbHkgPSByZXF1aXJlKCcuLi8uLi9hc3NldHMvanF1ZXJ5LndoZW5jYWxsc2VxdWVudGlhbGx5JylcbnZhciBCYXNlNjQgPSByZXF1aXJlKCcuLi8uLi9hc3NldHMvYmFzZTY0JylcbnZhciBTZWxlY3RvckltYWdlID0ge1xuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuXG4gICAgdmFyIGRlZmVycmVkRGF0YUNhbGxzID0gW11cbiAgICAkKGVsZW1lbnRzKS5lYWNoKGZ1bmN0aW9uIChpLCBlbGVtZW50KSB7XG4gICAgICBkZWZlcnJlZERhdGFDYWxscy5wdXNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRlZmVycmVkRGF0YSA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgICAgICAgdmFyIGRhdGEgPSB7fVxuICAgICAgICBkYXRhW3RoaXMuaWQgKyAnLXNyYyddID0gZWxlbWVudC5zcmNcblxuXHRcdFx0XHQvLyBkb3dubG9hZCBpbWFnZSBpZiByZXF1aXJlZFxuICAgICAgICBpZiAoIXRoaXMuZG93bmxvYWRJbWFnZSkge1xuICAgICAgICAgIGRlZmVycmVkRGF0YS5yZXNvbHZlKGRhdGEpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIGRlZmVycmVkSW1hZ2VCYXNlNjQgPSB0aGlzLmRvd25sb2FkSW1hZ2VCYXNlNjQoZWxlbWVudC5zcmMpXG5cbiAgICAgICAgICBkZWZlcnJlZEltYWdlQmFzZTY0LmRvbmUoZnVuY3Rpb24gKGltYWdlUmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGRhdGFbJ19pbWFnZUJhc2U2NC0nICsgdGhpcy5pZF0gPSBpbWFnZVJlc3BvbnNlLmltYWdlQmFzZTY0XG4gICAgICAgICAgICBkYXRhWydfaW1hZ2VNaW1lVHlwZS0nICsgdGhpcy5pZF0gPSBpbWFnZVJlc3BvbnNlLm1pbWVUeXBlXG5cbiAgICAgICAgICAgIGRlZmVycmVkRGF0YS5yZXNvbHZlKGRhdGEpXG4gICAgICAgICAgfS5iaW5kKHRoaXMpKS5mYWlsKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdC8vIGZhaWxlZCB0byBkb3dubG9hZCBpbWFnZSBjb250aW51ZS5cblx0XHRcdFx0XHRcdC8vIEBUT0RPIGhhbmRsZSBlcnJyb3JcbiAgICAgICAgICAgIGRlZmVycmVkRGF0YS5yZXNvbHZlKGRhdGEpXG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBkZWZlcnJlZERhdGEucHJvbWlzZSgpXG4gICAgICB9LmJpbmQodGhpcykpXG4gICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgd2hlbkNhbGxTZXF1ZW50aWFsbHkoZGVmZXJyZWREYXRhQ2FsbHMpLmRvbmUoZnVuY3Rpb24gKGRhdGFSZXN1bHRzKSB7XG4gICAgICBpZiAodGhpcy5tdWx0aXBsZSA9PT0gZmFsc2UgJiYgZWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHZhciBkYXRhID0ge31cbiAgICAgICAgZGF0YVt0aGlzLmlkICsgJy1zcmMnXSA9IG51bGxcbiAgICAgICAgZGF0YVJlc3VsdHMucHVzaChkYXRhKVxuICAgICAgfVxuXG4gICAgICBkZmQucmVzb2x2ZShkYXRhUmVzdWx0cylcbiAgICB9KVxuXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcbiAgfSxcblxuICBkb3dubG9hZEZpbGVBc0Jsb2I6IGZ1bmN0aW9uICh1cmwpIHtcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG4gICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICh0aGlzLnJlYWR5U3RhdGUgPT0gNCkge1xuICAgICAgICBpZiAodGhpcy5zdGF0dXMgPT0gMjAwKSB7XG4gICAgICAgICAgdmFyIGJsb2IgPSB0aGlzLnJlc3BvbnNlXG4gICAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKGJsb2IpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZWplY3QoeGhyLnN0YXR1c1RleHQpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgeGhyLm9wZW4oJ0dFVCcsIHVybClcbiAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2Jsb2InXG4gICAgeGhyLnNlbmQoKVxuXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gIH0sXG5cbiAgZG93bmxvYWRJbWFnZUJhc2U2NDogZnVuY3Rpb24gKHVybCkge1xuICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgZGVmZXJyZWREb3dubG9hZCA9IHRoaXMuZG93bmxvYWRGaWxlQXNCbG9iKHVybClcbiAgICBkZWZlcnJlZERvd25sb2FkLmRvbmUoZnVuY3Rpb24gKGJsb2IpIHtcbiAgICAgIHZhciBtaW1lVHlwZSA9IGJsb2IudHlwZVxuICAgICAgdmFyIGRlZmVycmVkQmxvYiA9IEJhc2U2NC5ibG9iVG9CYXNlNjQoYmxvYilcbiAgICAgIGRlZmVycmVkQmxvYi5kb25lKGZ1bmN0aW9uIChpbWFnZUJhc2U2NCkge1xuICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUoe1xuICAgICAgICAgIG1pbWVUeXBlOiBtaW1lVHlwZSxcbiAgICAgICAgICBpbWFnZUJhc2U2NDogaW1hZ2VCYXNlNjRcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSkuZmFpbChkZWZlcnJlZFJlc3BvbnNlLmZhaWwpXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW3RoaXMuaWQgKyAnLXNyYyddXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydtdWx0aXBsZScsICdkZWxheScsICdkb3dubG9hZEltYWdlJ11cbiAgfSxcblxuICBnZXRJdGVtQ1NTU2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gJ2ltZydcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9ySW1hZ2VcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxudmFyIHdoZW5DYWxsU2VxdWVudGlhbGx5ID0gcmVxdWlyZSgnLi4vLi4vYXNzZXRzL2pxdWVyeS53aGVuY2FsbHNlcXVlbnRpYWxseScpXG5cbnZhciBTZWxlY3RvckxpbmsgPSB7XG4gIGNhblJldHVybk11bHRpcGxlUmVjb3JkczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUNoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlTG9jYWxDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkNyZWF0ZU5ld0pvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcblxuICAgIHZhciBkZmQgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG5cdFx0Ly8gcmV0dXJuIGVtcHR5IHJlY29yZCBpZiBub3QgbXVsdGlwbGUgdHlwZSBhbmQgbm8gZWxlbWVudHMgZm91bmRcbiAgICBpZiAodGhpcy5tdWx0aXBsZSA9PT0gZmFsc2UgJiYgZWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICBkYXRhW3RoaXMuaWRdID0gbnVsbFxuICAgICAgZGZkLnJlc29sdmUoW2RhdGFdKVxuICAgICAgcmV0dXJuIGRmZFxuICAgIH1cblxuXHRcdC8vIGV4dHJhY3QgbGlua3Mgb25lIGJ5IG9uZVxuICAgIHZhciBkZWZlcnJlZERhdGFFeHRyYWN0aW9uQ2FsbHMgPSBbXVxuICAgICQoZWxlbWVudHMpLmVhY2goZnVuY3Rpb24gKGssIGVsZW1lbnQpIHtcbiAgICAgIGRlZmVycmVkRGF0YUV4dHJhY3Rpb25DYWxscy5wdXNoKGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIHZhciBkZWZlcnJlZERhdGEgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgICAgIHZhciBkYXRhID0ge31cbiAgICAgICAgZGF0YVt0aGlzLmlkXSA9ICQoZWxlbWVudCkudGV4dCgpXG4gICAgICAgIGRhdGEuX2ZvbGxvd1NlbGVjdG9ySWQgPSB0aGlzLmlkXG4gICAgICAgIGRhdGFbdGhpcy5pZCArICctaHJlZiddID0gZWxlbWVudC5ocmVmXG4gICAgICAgIGRhdGEuX2ZvbGxvdyA9IGVsZW1lbnQuaHJlZlxuICAgICAgICBkZWZlcnJlZERhdGEucmVzb2x2ZShkYXRhKVxuXG4gICAgICAgIHJldHVybiBkZWZlcnJlZERhdGFcbiAgICAgIH0uYmluZCh0aGlzLCBlbGVtZW50KSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICB3aGVuQ2FsbFNlcXVlbnRpYWxseShkZWZlcnJlZERhdGFFeHRyYWN0aW9uQ2FsbHMpLmRvbmUoZnVuY3Rpb24gKHJlc3BvbnNlcykge1xuICAgICAgdmFyIHJlc3VsdCA9IFtdXG4gICAgICByZXNwb25zZXMuZm9yRWFjaChmdW5jdGlvbiAoZGF0YVJlc3VsdCkge1xuICAgICAgICByZXN1bHQucHVzaChkYXRhUmVzdWx0KVxuICAgICAgfSlcbiAgICAgIGRmZC5yZXNvbHZlKHJlc3VsdClcbiAgICB9KVxuXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbdGhpcy5pZCwgdGhpcy5pZCArICctaHJlZiddXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydtdWx0aXBsZScsICdkZWxheSddXG4gIH0sXG5cbiAgZ2V0SXRlbUNTU1NlbGVjdG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICdhJ1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JMaW5rXG4iLCJ2YXIgd2hlbkNhbGxTZXF1ZW50aWFsbHkgPSByZXF1aXJlKCcuLi8uLi9hc3NldHMvanF1ZXJ5LndoZW5jYWxsc2VxdWVudGlhbGx5JylcbnZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxudmFyIENzc1NlbGVjdG9yID0gcmVxdWlyZSgnY3NzLXNlbGVjdG9yJykuQ3NzU2VsZWN0b3JcbnZhciBTZWxlY3RvclBvcHVwTGluayA9IHtcbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuXG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cblx0XHQvLyByZXR1cm4gZW1wdHkgcmVjb3JkIGlmIG5vdCBtdWx0aXBsZSB0eXBlIGFuZCBubyBlbGVtZW50cyBmb3VuZFxuICAgIGlmICh0aGlzLm11bHRpcGxlID09PSBmYWxzZSAmJiBlbGVtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHZhciBkYXRhID0ge31cbiAgICAgIGRhdGFbdGhpcy5pZF0gPSBudWxsXG4gICAgICBkZmQucmVzb2x2ZShbZGF0YV0pXG4gICAgICByZXR1cm4gZGZkXG4gICAgfVxuXG5cdFx0Ly8gZXh0cmFjdCBsaW5rcyBvbmUgYnkgb25lXG4gICAgdmFyIGRlZmVycmVkRGF0YUV4dHJhY3Rpb25DYWxscyA9IFtdXG4gICAgJChlbGVtZW50cykuZWFjaChmdW5jdGlvbiAoaywgZWxlbWVudCkge1xuICAgICAgZGVmZXJyZWREYXRhRXh0cmFjdGlvbkNhbGxzLnB1c2goZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgdmFyIGRlZmVycmVkRGF0YSA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgICAgICAgdmFyIGRhdGEgPSB7fVxuICAgICAgICBkYXRhW3RoaXMuaWRdID0gJChlbGVtZW50KS50ZXh0KClcbiAgICAgICAgZGF0YS5fZm9sbG93U2VsZWN0b3JJZCA9IHRoaXMuaWRcblxuICAgICAgICB2YXIgZGVmZXJyZWRQb3B1cFVSTCA9IHRoaXMuZ2V0UG9wdXBVUkwoZWxlbWVudClcbiAgICAgICAgZGVmZXJyZWRQb3B1cFVSTC5kb25lKGZ1bmN0aW9uICh1cmwpIHtcbiAgICAgICAgICBkYXRhW3RoaXMuaWQgKyAnLWhyZWYnXSA9IHVybFxuICAgICAgICAgIGRhdGEuX2ZvbGxvdyA9IHVybFxuICAgICAgICAgIGRlZmVycmVkRGF0YS5yZXNvbHZlKGRhdGEpXG4gICAgICAgIH0uYmluZCh0aGlzKSlcblxuICAgICAgICByZXR1cm4gZGVmZXJyZWREYXRhXG4gICAgICB9LmJpbmQodGhpcywgZWxlbWVudCkpXG4gICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgd2hlbkNhbGxTZXF1ZW50aWFsbHkoZGVmZXJyZWREYXRhRXh0cmFjdGlvbkNhbGxzKS5kb25lKGZ1bmN0aW9uIChyZXNwb25zZXMpIHtcbiAgICAgIHZhciByZXN1bHQgPSBbXVxuICAgICAgcmVzcG9uc2VzLmZvckVhY2goZnVuY3Rpb24gKGRhdGFSZXN1bHQpIHtcbiAgICAgICAgcmVzdWx0LnB1c2goZGF0YVJlc3VsdClcbiAgICAgIH0pXG4gICAgICBkZmQucmVzb2x2ZShyZXN1bHQpXG4gICAgfSlcblxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG4gIH0sXG5cblx0LyoqXG5cdCAqIEdldHMgYW4gdXJsIGZyb20gYSB3aW5kb3cub3BlbiBjYWxsIGJ5IG1vY2tpbmcgdGhlIHdpbmRvdy5vcGVuIGZ1bmN0aW9uXG5cdCAqIEBwYXJhbSBlbGVtZW50XG5cdCAqIEByZXR1cm5zICQuRGVmZXJyZWQoKVxuXHQgKi9cbiAgZ2V0UG9wdXBVUkw6IGZ1bmN0aW9uIChlbGVtZW50KSB7XG5cdFx0Ly8gb3ZlcnJpZGUgd2luZG93Lm9wZW4gZnVuY3Rpb24uIHdlIG5lZWQgdG8gZXhlY3V0ZSB0aGlzIGluIHBhZ2Ugc2NvcGUuXG5cdFx0Ly8gd2UgbmVlZCB0byBrbm93IGhvdyB0byBmaW5kIHRoaXMgZWxlbWVudCBmcm9tIHBhZ2Ugc2NvcGUuXG4gICAgdmFyIGNzID0gbmV3IENzc1NlbGVjdG9yKHtcbiAgICAgIGVuYWJsZVNtYXJ0VGFibGVTZWxlY3RvcjogZmFsc2UsXG4gICAgICBwYXJlbnQ6IGRvY3VtZW50LmJvZHksXG4gICAgICBlbmFibGVSZXN1bHRTdHJpcHBpbmc6IGZhbHNlXG4gICAgfSlcbiAgICB2YXIgY3NzU2VsZWN0b3IgPSBjcy5nZXRDc3NTZWxlY3RvcihbZWxlbWVudF0pXG4gICAgY29uc29sZS5sb2coY3NzU2VsZWN0b3IpXG4gICAgY29uc29sZS5sb2coZG9jdW1lbnQuYm9keS5xdWVyeVNlbGVjdG9yQWxsKGNzc1NlbGVjdG9yKSlcblx0XHQvLyB0aGlzIGZ1bmN0aW9uIHdpbGwgY2F0Y2ggd2luZG93Lm9wZW4gY2FsbCBhbmQgcGxhY2UgdGhlIHJlcXVlc3RlZCB1cmwgYXMgdGhlIGVsZW1lbnRzIGRhdGEgYXR0cmlidXRlXG4gICAgdmFyIHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpXG4gICAgc2NyaXB0LnR5cGUgPSAndGV4dC9qYXZhc2NyaXB0J1xuICAgIGNvbnNvbGUubG9nKGNzc1NlbGVjdG9yKVxuICAgIGNvbnNvbGUubG9nKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoY3NzU2VsZWN0b3IpKVxuICAgIHNjcmlwdC50ZXh0ID0gYFxuXHRcdFx0KGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBvcGVuID0gd2luZG93Lm9wZW47XG4gICAgICAgIHZhciBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJyR7Y3NzU2VsZWN0b3J9JylbMF07XG4gICAgICAgIHZhciBvcGVuTmV3ID0gZnVuY3Rpb24oKSB7IFxuICAgICAgICAgIHZhciB1cmwgPSBhcmd1bWVudHNbMF07IFxuICAgICAgICAgIGVsLmRhdGFzZXQud2ViU2NyYXBlckV4dHJhY3RVcmwgPSB1cmw7IFxuICAgICAgICAgIHdpbmRvdy5vcGVuID0gb3BlbjsgXG4gICAgICAgIH07XG4gICAgICAgIHdpbmRvdy5vcGVuID0gb3Blbk5ldzsgXG4gICAgICAgIGVsLmNsaWNrKCk7IFxuXHRcdFx0fSkoKWBcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHNjcmlwdClcblxuXHRcdC8vIHdhaXQgZm9yIHVybCB0byBiZSBhdmFpbGFibGVcbiAgICB2YXIgZGVmZXJyZWRVUkwgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciB0aW1lb3V0ID0gTWF0aC5hYnMoNTAwMCAvIDMwKSAvLyA1cyB0aW1lb3V0IHRvIGdlbmVyYXRlIGFuIHVybCBmb3IgcG9wdXBcbiAgICB2YXIgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgdXJsID0gJChlbGVtZW50KS5kYXRhKCd3ZWItc2NyYXBlci1leHRyYWN0LXVybCcpXG4gICAgICBpZiAodXJsKSB7XG4gICAgICAgIGRlZmVycmVkVVJMLnJlc29sdmUodXJsKVxuICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKVxuICAgICAgICBzY3JpcHQucmVtb3ZlKClcbiAgICAgIH1cblx0XHRcdC8vIHRpbWVvdXQgcG9wdXAgb3BlbmluZ1xuICAgICAgaWYgKHRpbWVvdXQtLSA8PSAwKSB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpXG4gICAgICAgIHNjcmlwdC5yZW1vdmUoKVxuICAgICAgfVxuICAgIH0sIDMwKVxuXG4gICAgcmV0dXJuIGRlZmVycmVkVVJMLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFt0aGlzLmlkLCB0aGlzLmlkICsgJy1ocmVmJ11cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2RlbGF5J11cbiAgfSxcblxuICBnZXRJdGVtQ1NTU2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gJyonXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvclBvcHVwTGlua1xuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG5cbnZhciBTZWxlY3RvclRhYmxlID0ge1xuXG4gIGNhblJldHVybk11bHRpcGxlUmVjb3JkczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUNoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICBnZXRUYWJsZUhlYWRlckNvbHVtbnM6IGZ1bmN0aW9uICgkdGFibGUpIHtcbiAgICB2YXIgY29sdW1ucyA9IHt9XG4gICAgdmFyIGhlYWRlclJvd1NlbGVjdG9yID0gdGhpcy5nZXRUYWJsZUhlYWRlclJvd1NlbGVjdG9yKClcbiAgICB2YXIgJGhlYWRlclJvdyA9ICQoJHRhYmxlKS5maW5kKGhlYWRlclJvd1NlbGVjdG9yKVxuICAgIGlmICgkaGVhZGVyUm93Lmxlbmd0aCA+IDApIHtcbiAgICAgICRoZWFkZXJSb3cuZmluZCgndGQsdGgnKS5lYWNoKGZ1bmN0aW9uIChpKSB7XG4gICAgICAgIHZhciBoZWFkZXIgPSAkKHRoaXMpLnRleHQoKS50cmltKClcbiAgICAgICAgY29sdW1uc1toZWFkZXJdID0ge1xuICAgICAgICAgIGluZGV4OiBpICsgMVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgICByZXR1cm4gY29sdW1uc1xuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZGZkID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICAgIHZhciB0YWJsZXMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuXG4gICAgdmFyIHJlc3VsdCA9IFtdXG4gICAgJCh0YWJsZXMpLmVhY2goZnVuY3Rpb24gKGssIHRhYmxlKSB7XG4gICAgICB2YXIgY29sdW1ucyA9IHRoaXMuZ2V0VGFibGVIZWFkZXJDb2x1bW5zKCQodGFibGUpKVxuXG4gICAgICB2YXIgZGF0YVJvd1NlbGVjdG9yID0gdGhpcy5nZXRUYWJsZURhdGFSb3dTZWxlY3RvcigpXG4gICAgICAkKHRhYmxlKS5maW5kKGRhdGFSb3dTZWxlY3RvcikuZWFjaChmdW5jdGlvbiAoaSwgcm93KSB7XG4gICAgICAgIHZhciBkYXRhID0ge31cbiAgICAgICAgdGhpcy5jb2x1bW5zLmZvckVhY2goZnVuY3Rpb24gKGNvbHVtbikge1xuICAgICAgICAgIGlmIChjb2x1bW4uZXh0cmFjdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgaWYgKGNvbHVtbnNbY29sdW1uLmhlYWRlcl0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICBkYXRhW2NvbHVtbi5uYW1lXSA9IG51bGxcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHZhciByb3dUZXh0ID0gJChyb3cpLmZpbmQoJz46bnRoLWNoaWxkKCcgKyBjb2x1bW5zW2NvbHVtbi5oZWFkZXJdLmluZGV4ICsgJyknKS50ZXh0KCkudHJpbSgpXG4gICAgICAgICAgICAgIGRhdGFbY29sdW1uLm5hbWVdID0gcm93VGV4dFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgcmVzdWx0LnB1c2goZGF0YSlcbiAgICAgIH0uYmluZCh0aGlzKSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICBkZmQucmVzb2x2ZShyZXN1bHQpXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHZhciBkYXRhQ29sdW1ucyA9IFtdXG4gICAgdGhpcy5jb2x1bW5zLmZvckVhY2goZnVuY3Rpb24gKGNvbHVtbikge1xuICAgICAgaWYgKGNvbHVtbi5leHRyYWN0ID09PSB0cnVlKSB7XG4gICAgICAgIGRhdGFDb2x1bW5zLnB1c2goY29sdW1uLm5hbWUpXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gZGF0YUNvbHVtbnNcbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2NvbHVtbnMnLCAnZGVsYXknLCAndGFibGVEYXRhUm93U2VsZWN0b3InLCAndGFibGVIZWFkZXJSb3dTZWxlY3RvciddXG4gIH0sXG5cbiAgZ2V0SXRlbUNTU1NlbGVjdG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICd0YWJsZSdcbiAgfSxcblxuICBnZXRUYWJsZUhlYWRlclJvd1NlbGVjdG9yRnJvbVRhYmxlSFRNTDogZnVuY3Rpb24gKGh0bWwpIHtcbiAgICB2YXIgJHRhYmxlID0gJChodG1sKVxuICAgIGlmICgkdGFibGUuZmluZCgndGhlYWQgdHI6aGFzKHRkOm5vdCg6ZW1wdHkpKSwgdGhlYWQgdHI6aGFzKHRoOm5vdCg6ZW1wdHkpKScpLmxlbmd0aCkge1xuICAgICAgaWYgKCR0YWJsZS5maW5kKCd0aGVhZCB0cicpLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gJ3RoZWFkIHRyJ1xuICAgICAgfVx0XHRcdGVsc2Uge1xuICAgICAgICB2YXIgJHJvd3MgPSAkdGFibGUuZmluZCgndGhlYWQgdHInKVxuXHRcdFx0XHQvLyBmaXJzdCByb3cgd2l0aCBkYXRhXG4gICAgICAgIHZhciByb3dJbmRleCA9ICRyb3dzLmluZGV4KCRyb3dzLmZpbHRlcignOmhhcyh0ZDpub3QoOmVtcHR5KSksOmhhcyh0aDpub3QoOmVtcHR5KSknKVswXSlcbiAgICAgICAgcmV0dXJuICd0aGVhZCB0cjpudGgtb2YtdHlwZSgnICsgKHJvd0luZGV4ICsgMSkgKyAnKSdcbiAgICAgIH1cbiAgICB9XHRcdGVsc2UgaWYgKCR0YWJsZS5maW5kKCd0ciB0ZDpub3QoOmVtcHR5KSwgdHIgdGg6bm90KDplbXB0eSknKS5sZW5ndGgpIHtcbiAgICAgIHZhciAkcm93cyA9ICR0YWJsZS5maW5kKCd0cicpXG5cdFx0XHQvLyBmaXJzdCByb3cgd2l0aCBkYXRhXG4gICAgICB2YXIgcm93SW5kZXggPSAkcm93cy5pbmRleCgkcm93cy5maWx0ZXIoJzpoYXModGQ6bm90KDplbXB0eSkpLDpoYXModGg6bm90KDplbXB0eSkpJylbMF0pXG4gICAgICByZXR1cm4gJ3RyOm50aC1vZi10eXBlKCcgKyAocm93SW5kZXggKyAxKSArICcpJ1xuICAgIH1cdFx0ZWxzZSB7XG4gICAgICByZXR1cm4gJydcbiAgICB9XG4gIH0sXG5cbiAgZ2V0VGFibGVEYXRhUm93U2VsZWN0b3JGcm9tVGFibGVIVE1MOiBmdW5jdGlvbiAoaHRtbCkge1xuICAgIHZhciAkdGFibGUgPSAkKGh0bWwpXG4gICAgaWYgKCR0YWJsZS5maW5kKCd0aGVhZCB0cjpoYXModGQ6bm90KDplbXB0eSkpLCB0aGVhZCB0cjpoYXModGg6bm90KDplbXB0eSkpJykubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gJ3Rib2R5IHRyJ1xuICAgIH1cdFx0ZWxzZSBpZiAoJHRhYmxlLmZpbmQoJ3RyIHRkOm5vdCg6ZW1wdHkpLCB0ciB0aDpub3QoOmVtcHR5KScpLmxlbmd0aCkge1xuICAgICAgdmFyICRyb3dzID0gJHRhYmxlLmZpbmQoJ3RyJylcblx0XHRcdC8vIGZpcnN0IHJvdyB3aXRoIGRhdGFcbiAgICAgIHZhciByb3dJbmRleCA9ICRyb3dzLmluZGV4KCRyb3dzLmZpbHRlcignOmhhcyh0ZDpub3QoOmVtcHR5KSksOmhhcyh0aDpub3QoOmVtcHR5KSknKVswXSlcbiAgICAgIHJldHVybiAndHI6bnRoLW9mLXR5cGUobisnICsgKHJvd0luZGV4ICsgMikgKyAnKSdcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgcmV0dXJuICcnXG4gICAgfVxuICB9LFxuXG4gIGdldFRhYmxlSGVhZGVyUm93U2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcblx0XHQvLyBoYW5kbGUgbGVnYWN5IHNlbGVjdG9yc1xuICAgIGlmICh0aGlzLnRhYmxlSGVhZGVyUm93U2VsZWN0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuICd0aGVhZCB0cidcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMudGFibGVIZWFkZXJSb3dTZWxlY3RvclxuICAgIH1cbiAgfSxcblxuICBnZXRUYWJsZURhdGFSb3dTZWxlY3RvcjogZnVuY3Rpb24gKCkge1xuXHRcdC8vIGhhbmRsZSBsZWdhY3kgc2VsZWN0b3JzXG4gICAgaWYgKHRoaXMudGFibGVEYXRhUm93U2VsZWN0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuICd0Ym9keSB0cidcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMudGFibGVEYXRhUm93U2VsZWN0b3JcbiAgICB9XG4gIH0sXG5cblx0LyoqXG5cdCAqIEV4dHJhY3QgdGFibGUgaGVhZGVyIGNvbHVtbiBpbmZvIGZyb20gaHRtbFxuXHQgKiBAcGFyYW0gaHRtbFxuXHQgKi9cbiAgZ2V0VGFibGVIZWFkZXJDb2x1bW5zRnJvbUhUTUw6IGZ1bmN0aW9uIChoZWFkZXJSb3dTZWxlY3RvciwgaHRtbCkge1xuICAgIHZhciAkdGFibGUgPSAkKGh0bWwpXG4gICAgdmFyICRoZWFkZXJSb3dDb2x1bW5zID0gJHRhYmxlLmZpbmQoaGVhZGVyUm93U2VsZWN0b3IpLmZpbmQoJ3RkLHRoJylcblxuICAgIHZhciBjb2x1bW5zID0gW11cblxuICAgICRoZWFkZXJSb3dDb2x1bW5zLmVhY2goZnVuY3Rpb24gKGksIGNvbHVtbkVsKSB7XG4gICAgICB2YXIgaGVhZGVyID0gJChjb2x1bW5FbCkudGV4dCgpLnRyaW0oKVxuICAgICAgdmFyIG5hbWUgPSBoZWFkZXJcbiAgICAgIGlmIChoZWFkZXIubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgIGNvbHVtbnMucHVzaCh7XG4gICAgICAgICAgaGVhZGVyOiBoZWFkZXIsXG4gICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICBleHRyYWN0OiB0cnVlXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gY29sdW1uc1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JUYWJsZVxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgU2VsZWN0b3JUZXh0ID0ge1xuXG4gIGNhblJldHVybk11bHRpcGxlUmVjb3JkczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUNoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZGZkID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICAgIHZhciBlbGVtZW50cyA9IHRoaXMuZ2V0RGF0YUVsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG5cbiAgICB2YXIgcmVzdWx0ID0gW11cbiAgICAkKGVsZW1lbnRzKS5lYWNoKGZ1bmN0aW9uIChrLCBlbGVtZW50KSB7XG4gICAgICB2YXIgZGF0YSA9IHt9XG5cblx0XHRcdC8vIHJlbW92ZSBzY3JpcHQsIHN0eWxlIHRhZyBjb250ZW50cyBmcm9tIHRleHQgcmVzdWx0c1xuICAgICAgdmFyICRlbGVtZW50X2Nsb25lID0gJChlbGVtZW50KS5jbG9uZSgpXG4gICAgICAkZWxlbWVudF9jbG9uZS5maW5kKCdzY3JpcHQsIHN0eWxlJykucmVtb3ZlKClcblx0XHRcdC8vIDxicj4gcmVwbGFjZSBiciB0YWdzIHdpdGggbmV3bGluZXNcbiAgICAgICRlbGVtZW50X2Nsb25lLmZpbmQoJ2JyJykuYWZ0ZXIoJ1xcbicpXG5cbiAgICAgIHZhciB0ZXh0ID0gJGVsZW1lbnRfY2xvbmUudGV4dCgpXG4gICAgICBpZiAodGhpcy5yZWdleCAhPT0gdW5kZWZpbmVkICYmIHRoaXMucmVnZXgubGVuZ3RoKSB7XG4gICAgICAgIHZhciBtYXRjaGVzID0gdGV4dC5tYXRjaChuZXcgUmVnRXhwKHRoaXMucmVnZXgpKVxuICAgICAgICBpZiAobWF0Y2hlcyAhPT0gbnVsbCkge1xuICAgICAgICAgIHRleHQgPSBtYXRjaGVzWzBdXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGV4dCA9IG51bGxcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZGF0YVt0aGlzLmlkXSA9IHRleHRcblxuICAgICAgcmVzdWx0LnB1c2goZGF0YSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICBpZiAodGhpcy5tdWx0aXBsZSA9PT0gZmFsc2UgJiYgZWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICBkYXRhW3RoaXMuaWRdID0gbnVsbFxuICAgICAgcmVzdWx0LnB1c2goZGF0YSlcbiAgICB9XG5cbiAgICBkZmQucmVzb2x2ZShyZXN1bHQpXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbdGhpcy5pZF1cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ3JlZ2V4JywgJ2RlbGF5J11cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yVGV4dFxuIiwidmFyIFNlbGVjdG9yID0gcmVxdWlyZSgnLi9TZWxlY3RvcicpXG5cbnZhciBTZWxlY3Rvckxpc3QgPSBmdW5jdGlvbiAoc2VsZWN0b3JzKSB7XG4gIGlmIChzZWxlY3RvcnMgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVyblxuICB9XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWxlY3RvcnMubGVuZ3RoOyBpKyspIHtcbiAgICB0aGlzLnB1c2goc2VsZWN0b3JzW2ldKVxuICB9XG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUgPSBuZXcgQXJyYXkoKVxuXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgaWYgKCF0aGlzLmhhc1NlbGVjdG9yKHNlbGVjdG9yLmlkKSkge1xuICAgIGlmICghKHNlbGVjdG9yIGluc3RhbmNlb2YgU2VsZWN0b3IpKSB7XG4gICAgICBzZWxlY3RvciA9IG5ldyBTZWxlY3RvcihzZWxlY3RvcilcbiAgICB9XG4gICAgQXJyYXkucHJvdG90eXBlLnB1c2guY2FsbCh0aGlzLCBzZWxlY3RvcilcbiAgfVxufVxuXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmhhc1NlbGVjdG9yID0gZnVuY3Rpb24gKHNlbGVjdG9ySWQpIHtcbiAgaWYgKHNlbGVjdG9ySWQgaW5zdGFuY2VvZiBPYmplY3QpIHtcbiAgICBzZWxlY3RvcklkID0gc2VsZWN0b3JJZC5pZFxuICB9XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHRoaXNbaV0uaWQgPT09IHNlbGVjdG9ySWQpIHtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZVxufVxuXG4vKipcbiAqIFJldHVybnMgYWxsIHNlbGVjdG9ycyBvciByZWN1cnNpdmVseSBmaW5kIGFuZCByZXR1cm4gYWxsIGNoaWxkIHNlbGVjdG9ycyBvZiBhIHBhcmVudCBzZWxlY3Rvci5cbiAqIEBwYXJhbSBwYXJlbnRTZWxlY3RvcklkXG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZ2V0QWxsU2VsZWN0b3JzID0gZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9ySWQpIHtcbiAgaWYgKHBhcmVudFNlbGVjdG9ySWQgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICB2YXIgZ2V0QWxsQ2hpbGRTZWxlY3RvcnMgPSBmdW5jdGlvbiAocGFyZW50U2VsZWN0b3JJZCwgcmVzdWx0U2VsZWN0b3JzKSB7XG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgaWYgKHNlbGVjdG9yLmhhc1BhcmVudFNlbGVjdG9yKHBhcmVudFNlbGVjdG9ySWQpKSB7XG4gICAgICAgIGlmIChyZXN1bHRTZWxlY3RvcnMuaW5kZXhPZihzZWxlY3RvcikgPT09IC0xKSB7XG4gICAgICAgICAgcmVzdWx0U2VsZWN0b3JzLnB1c2goc2VsZWN0b3IpXG4gICAgICAgICAgZ2V0QWxsQ2hpbGRTZWxlY3RvcnMoc2VsZWN0b3IuaWQsIHJlc3VsdFNlbGVjdG9ycylcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIH0uYmluZCh0aGlzKVxuXG4gIHZhciByZXN1bHRTZWxlY3RvcnMgPSBbXVxuICBnZXRBbGxDaGlsZFNlbGVjdG9ycyhwYXJlbnRTZWxlY3RvcklkLCByZXN1bHRTZWxlY3RvcnMpXG4gIHJldHVybiByZXN1bHRTZWxlY3RvcnNcbn1cblxuLyoqXG4gKiBSZXR1cm5zIG9ubHkgc2VsZWN0b3JzIHRoYXQgYXJlIGRpcmVjdGx5IHVuZGVyIGEgcGFyZW50XG4gKiBAcGFyYW0gcGFyZW50U2VsZWN0b3JJZFxuICogQHJldHVybnMge0FycmF5fVxuICovXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmdldERpcmVjdENoaWxkU2VsZWN0b3JzID0gZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9ySWQpIHtcbiAgdmFyIHJlc3VsdFNlbGVjdG9ycyA9IG5ldyBTZWxlY3Rvckxpc3QoKVxuICB0aGlzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgaWYgKHNlbGVjdG9yLmhhc1BhcmVudFNlbGVjdG9yKHBhcmVudFNlbGVjdG9ySWQpKSB7XG4gICAgICByZXN1bHRTZWxlY3RvcnMucHVzaChzZWxlY3RvcilcbiAgICB9XG4gIH0pXG4gIHJldHVybiByZXN1bHRTZWxlY3RvcnNcbn1cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHJlc3VsdExpc3QgPSBuZXcgU2VsZWN0b3JMaXN0KClcbiAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgIHJlc3VsdExpc3QucHVzaChzZWxlY3RvcilcbiAgfSlcbiAgcmV0dXJuIHJlc3VsdExpc3Rcbn1cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5mdWxsQ2xvbmUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciByZXN1bHRMaXN0ID0gbmV3IFNlbGVjdG9yTGlzdCgpXG4gIHRoaXMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICByZXN1bHRMaXN0LnB1c2goSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzZWxlY3RvcikpKVxuICB9KVxuICByZXR1cm4gcmVzdWx0TGlzdFxufVxuXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmNvbmNhdCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHJlc3VsdExpc3QgPSB0aGlzLmNsb25lKClcbiAgZm9yICh2YXIgaSBpbiBhcmd1bWVudHMpIHtcbiAgICBhcmd1bWVudHNbaV0uZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgIHJlc3VsdExpc3QucHVzaChzZWxlY3RvcilcbiAgICB9KVxuICB9XG4gIHJldHVybiByZXN1bHRMaXN0XG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZ2V0U2VsZWN0b3IgPSBmdW5jdGlvbiAoc2VsZWN0b3JJZCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgc2VsZWN0b3IgPSB0aGlzW2ldXG4gICAgaWYgKHNlbGVjdG9yLmlkID09PSBzZWxlY3RvcklkKSB7XG4gICAgICByZXR1cm4gc2VsZWN0b3JcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFsbCBzZWxlY3RvcnMgaWYgdGhpcyBzZWxlY3RvcnMgaW5jbHVkaW5nIGFsbCBwYXJlbnQgc2VsZWN0b3JzIHdpdGhpbiB0aGlzIHBhZ2VcbiAqIEBUT0RPIG5vdCB1c2VkIGFueSBtb3JlLlxuICogQHBhcmFtIHNlbGVjdG9ySWRcbiAqIEByZXR1cm5zIHsqfVxuICovXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmdldE9uZVBhZ2VTZWxlY3RvcnMgPSBmdW5jdGlvbiAoc2VsZWN0b3JJZCkge1xuICB2YXIgcmVzdWx0TGlzdCA9IG5ldyBTZWxlY3Rvckxpc3QoKVxuICB2YXIgc2VsZWN0b3IgPSB0aGlzLmdldFNlbGVjdG9yKHNlbGVjdG9ySWQpXG4gIHJlc3VsdExpc3QucHVzaCh0aGlzLmdldFNlbGVjdG9yKHNlbGVjdG9ySWQpKVxuXG5cdC8vIHJlY3Vyc2l2ZWx5IGZpbmQgYWxsIHBhcmVudCBzZWxlY3RvcnMgdGhhdCBjb3VsZCBsZWFkIHRvIHRoZSBwYWdlIHdoZXJlIHNlbGVjdG9ySWQgaXMgdXNlZC5cbiAgdmFyIGZpbmRQYXJlbnRTZWxlY3RvcnMgPSBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICBzZWxlY3Rvci5wYXJlbnRTZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAocGFyZW50U2VsZWN0b3JJZCkge1xuICAgICAgaWYgKHBhcmVudFNlbGVjdG9ySWQgPT09ICdfcm9vdCcpIHJldHVyblxuICAgICAgdmFyIHBhcmVudFNlbGVjdG9yID0gdGhpcy5nZXRTZWxlY3RvcihwYXJlbnRTZWxlY3RvcklkKVxuICAgICAgaWYgKHJlc3VsdExpc3QuaW5kZXhPZihwYXJlbnRTZWxlY3RvcikgIT09IC0xKSByZXR1cm5cbiAgICAgIGlmIChwYXJlbnRTZWxlY3Rvci53aWxsUmV0dXJuRWxlbWVudHMoKSkge1xuICAgICAgICByZXN1bHRMaXN0LnB1c2gocGFyZW50U2VsZWN0b3IpXG4gICAgICAgIGZpbmRQYXJlbnRTZWxlY3RvcnMocGFyZW50U2VsZWN0b3IpXG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LmJpbmQodGhpcylcblxuICBmaW5kUGFyZW50U2VsZWN0b3JzKHNlbGVjdG9yKVxuXG5cdC8vIGFkZCBhbGwgY2hpbGQgc2VsZWN0b3JzXG4gIHJlc3VsdExpc3QgPSByZXN1bHRMaXN0LmNvbmNhdCh0aGlzLmdldFNpbmdsZVBhZ2VBbGxDaGlsZFNlbGVjdG9ycyhzZWxlY3Rvci5pZCkpXG4gIHJldHVybiByZXN1bHRMaXN0XG59XG5cbi8qKlxuICogUmV0dXJucyBhbGwgY2hpbGQgc2VsZWN0b3JzIG9mIGEgc2VsZWN0b3Igd2hpY2ggY2FuIGJlIHVzZWQgd2l0aGluIG9uZSBwYWdlLlxuICogQHBhcmFtIHBhcmVudFNlbGVjdG9ySWRcbiAqL1xuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5nZXRTaW5nbGVQYWdlQWxsQ2hpbGRTZWxlY3RvcnMgPSBmdW5jdGlvbiAocGFyZW50U2VsZWN0b3JJZCkge1xuICB2YXIgcmVzdWx0TGlzdCA9IG5ldyBTZWxlY3Rvckxpc3QoKVxuICB2YXIgYWRkQ2hpbGRTZWxlY3RvcnMgPSBmdW5jdGlvbiAocGFyZW50U2VsZWN0b3IpIHtcbiAgICBpZiAocGFyZW50U2VsZWN0b3Iud2lsbFJldHVybkVsZW1lbnRzKCkpIHtcbiAgICAgIHZhciBjaGlsZFNlbGVjdG9ycyA9IHRoaXMuZ2V0RGlyZWN0Q2hpbGRTZWxlY3RvcnMocGFyZW50U2VsZWN0b3IuaWQpXG4gICAgICBjaGlsZFNlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChjaGlsZFNlbGVjdG9yKSB7XG4gICAgICAgIGlmIChyZXN1bHRMaXN0LmluZGV4T2YoY2hpbGRTZWxlY3RvcikgPT09IC0xKSB7XG4gICAgICAgICAgcmVzdWx0TGlzdC5wdXNoKGNoaWxkU2VsZWN0b3IpXG4gICAgICAgICAgYWRkQ2hpbGRTZWxlY3RvcnMoY2hpbGRTZWxlY3RvcilcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG4gIH0uYmluZCh0aGlzKVxuXG4gIHZhciBwYXJlbnRTZWxlY3RvciA9IHRoaXMuZ2V0U2VsZWN0b3IocGFyZW50U2VsZWN0b3JJZClcbiAgYWRkQ2hpbGRTZWxlY3RvcnMocGFyZW50U2VsZWN0b3IpXG4gIHJldHVybiByZXN1bHRMaXN0XG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUud2lsbFJldHVybk11bHRpcGxlUmVjb3JkcyA9IGZ1bmN0aW9uIChzZWxlY3RvcklkKSB7XG5cdC8vIGhhbmRsZSByZXVxZXN0ZWQgc2VsZWN0b3JcbiAgdmFyIHNlbGVjdG9yID0gdGhpcy5nZXRTZWxlY3RvcihzZWxlY3RvcklkKVxuICBpZiAoc2VsZWN0b3Iud2lsbFJldHVybk11bHRpcGxlUmVjb3JkcygpID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuXG5cdC8vIGhhbmRsZSBhbGwgaXRzIGNoaWxkIHNlbGVjdG9yc1xuICB2YXIgY2hpbGRTZWxlY3RvcnMgPSB0aGlzLmdldEFsbFNlbGVjdG9ycyhzZWxlY3RvcklkKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkU2VsZWN0b3JzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHNlbGVjdG9yID0gY2hpbGRTZWxlY3RvcnNbaV1cbiAgICBpZiAoc2VsZWN0b3Iud2lsbFJldHVybk11bHRpcGxlUmVjb3JkcygpID09PSB0cnVlKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmYWxzZVxufVxuXG4vKipcbiAqIFdoZW4gc2VyaWFsaXppbmcgdG8gSlNPTiBjb252ZXJ0IHRvIGFuIGFycmF5XG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gKCkge1xuICB2YXIgcmVzdWx0ID0gW11cbiAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgIHJlc3VsdC5wdXNoKHNlbGVjdG9yKVxuICB9KVxuICByZXR1cm4gcmVzdWx0XG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZ2V0U2VsZWN0b3JCeUlkID0gZnVuY3Rpb24gKHNlbGVjdG9ySWQpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHNlbGVjdG9yID0gdGhpc1tpXVxuICAgIGlmIChzZWxlY3Rvci5pZCA9PT0gc2VsZWN0b3JJZCkge1xuICAgICAgcmV0dXJuIHNlbGVjdG9yXG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogcmV0dXJucyBjc3Mgc2VsZWN0b3IgZm9yIGEgZ2l2ZW4gZWxlbWVudC4gY3NzIHNlbGVjdG9yIGluY2x1ZGVzIGFsbCBwYXJlbnQgZWxlbWVudCBzZWxlY3RvcnNcbiAqIEBwYXJhbSBzZWxlY3RvcklkXG4gKiBAcGFyYW0gcGFyZW50U2VsZWN0b3JJZHMgYXJyYXkgb2YgcGFyZW50IHNlbGVjdG9yIGlkcyBmcm9tIGRldnRvb2xzIEJyZWFkY3VtYlxuICogQHJldHVybnMgc3RyaW5nXG4gKi9cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZ2V0Q1NTU2VsZWN0b3JXaXRoaW5PbmVQYWdlID0gZnVuY3Rpb24gKHNlbGVjdG9ySWQsIHBhcmVudFNlbGVjdG9ySWRzKSB7XG4gIHZhciBDU1NTZWxlY3RvciA9IHRoaXMuZ2V0U2VsZWN0b3Ioc2VsZWN0b3JJZCkuc2VsZWN0b3JcbiAgdmFyIHBhcmVudENTU1NlbGVjdG9yID0gdGhpcy5nZXRQYXJlbnRDU1NTZWxlY3RvcldpdGhpbk9uZVBhZ2UocGFyZW50U2VsZWN0b3JJZHMpXG4gIENTU1NlbGVjdG9yID0gcGFyZW50Q1NTU2VsZWN0b3IgKyBDU1NTZWxlY3RvclxuXG4gIHJldHVybiBDU1NTZWxlY3RvclxufVxuXG4vKipcbiAqIHJldHVybnMgY3NzIHNlbGVjdG9yIGZvciBwYXJlbnQgc2VsZWN0b3JzIHRoYXQgYXJlIHdpdGhpbiBvbmUgcGFnZVxuICogQHBhcmFtIHBhcmVudFNlbGVjdG9ySWRzIGFycmF5IG9mIHBhcmVudCBzZWxlY3RvciBpZHMgZnJvbSBkZXZ0b29scyBCcmVhZGN1bWJcbiAqIEByZXR1cm5zIHN0cmluZ1xuICovXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmdldFBhcmVudENTU1NlbGVjdG9yV2l0aGluT25lUGFnZSA9IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3Rvcklkcykge1xuICB2YXIgQ1NTU2VsZWN0b3IgPSAnJ1xuXG4gIGZvciAodmFyIGkgPSBwYXJlbnRTZWxlY3Rvcklkcy5sZW5ndGggLSAxOyBpID4gMDsgaS0tKSB7XG4gICAgdmFyIHBhcmVudFNlbGVjdG9ySWQgPSBwYXJlbnRTZWxlY3Rvcklkc1tpXVxuICAgIHZhciBwYXJlbnRTZWxlY3RvciA9IHRoaXMuZ2V0U2VsZWN0b3IocGFyZW50U2VsZWN0b3JJZClcbiAgICBpZiAocGFyZW50U2VsZWN0b3Iud2lsbFJldHVybkVsZW1lbnRzKCkpIHtcbiAgICAgIENTU1NlbGVjdG9yID0gcGFyZW50U2VsZWN0b3Iuc2VsZWN0b3IgKyAnICcgKyBDU1NTZWxlY3RvclxuICAgIH0gZWxzZSB7XG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBDU1NTZWxlY3RvclxufVxuXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmhhc1JlY3Vyc2l2ZUVsZW1lbnRTZWxlY3RvcnMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBSZWN1cnNpb25Gb3VuZCA9IGZhbHNlXG5cbiAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uICh0b3BTZWxlY3Rvcikge1xuICAgIHZhciB2aXNpdGVkU2VsZWN0b3JzID0gW11cblxuICAgIHZhciBjaGVja1JlY3Vyc2lvbiA9IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3Rvcikge1xuXHRcdFx0Ly8gYWxyZWFkeSB2aXNpdGVkXG4gICAgICBpZiAodmlzaXRlZFNlbGVjdG9ycy5pbmRleE9mKHBhcmVudFNlbGVjdG9yKSAhPT0gLTEpIHtcbiAgICAgICAgUmVjdXJzaW9uRm91bmQgPSB0cnVlXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICBpZiAocGFyZW50U2VsZWN0b3Iud2lsbFJldHVybkVsZW1lbnRzKCkpIHtcbiAgICAgICAgdmlzaXRlZFNlbGVjdG9ycy5wdXNoKHBhcmVudFNlbGVjdG9yKVxuICAgICAgICB2YXIgY2hpbGRTZWxlY3RvcnMgPSB0aGlzLmdldERpcmVjdENoaWxkU2VsZWN0b3JzKHBhcmVudFNlbGVjdG9yLmlkKVxuICAgICAgICBjaGlsZFNlbGVjdG9ycy5mb3JFYWNoKGNoZWNrUmVjdXJzaW9uKVxuICAgICAgICB2aXNpdGVkU2VsZWN0b3JzLnBvcCgpXG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpXG5cbiAgICBjaGVja1JlY3Vyc2lvbih0b3BTZWxlY3RvcilcbiAgfS5iaW5kKHRoaXMpKVxuXG4gIHJldHVybiBSZWN1cnNpb25Gb3VuZFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yTGlzdFxuIiwidmFyIFNlbGVjdG9yRWxlbWVudCA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JFbGVtZW50JylcbnZhciBTZWxlY3RvckVsZW1lbnRBdHRyaWJ1dGUgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yRWxlbWVudEF0dHJpYnV0ZScpXG52YXIgU2VsZWN0b3JFbGVtZW50Q2xpY2sgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yRWxlbWVudENsaWNrJylcbnZhciBTZWxlY3RvckVsZW1lbnRTY3JvbGwgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yRWxlbWVudFNjcm9sbCcpXG52YXIgU2VsZWN0b3JHcm91cCA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JHcm91cCcpXG52YXIgU2VsZWN0b3JIVE1MID0gcmVxdWlyZSgnLi9TZWxlY3Rvci9TZWxlY3RvckhUTUwnKVxudmFyIFNlbGVjdG9ySW1hZ2UgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9ySW1hZ2UnKVxudmFyIFNlbGVjdG9yTGluayA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JMaW5rJylcbnZhciBTZWxlY3RvclBvcHVwTGluayA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JQb3B1cExpbmsnKVxudmFyIFNlbGVjdG9yVGFibGUgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yVGFibGUnKVxudmFyIFNlbGVjdG9yVGV4dCA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JUZXh0JylcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIFNlbGVjdG9yRWxlbWVudCxcbiAgU2VsZWN0b3JFbGVtZW50QXR0cmlidXRlLFxuICBTZWxlY3RvckVsZW1lbnRDbGljayxcbiAgU2VsZWN0b3JFbGVtZW50U2Nyb2xsLFxuICBTZWxlY3Rvckdyb3VwLFxuICBTZWxlY3RvckhUTUwsXG4gIFNlbGVjdG9ySW1hZ2UsXG4gIFNlbGVjdG9yTGluayxcbiAgU2VsZWN0b3JQb3B1cExpbmssXG4gIFNlbGVjdG9yVGFibGUsXG4gIFNlbGVjdG9yVGV4dFxufVxuIiwidmFyIFNlbGVjdG9yID0gcmVxdWlyZSgnLi9TZWxlY3RvcicpXG52YXIgU2VsZWN0b3JMaXN0ID0gcmVxdWlyZSgnLi9TZWxlY3Rvckxpc3QnKVxudmFyIFNpdGVtYXAgPSBmdW5jdGlvbiAoc2l0ZW1hcE9iaikge1xuICB0aGlzLmluaXREYXRhKHNpdGVtYXBPYmopXG59XG5cblNpdGVtYXAucHJvdG90eXBlID0ge1xuXG4gIGluaXREYXRhOiBmdW5jdGlvbiAoc2l0ZW1hcE9iaikge1xuICAgIGNvbnNvbGUubG9nKHRoaXMpXG4gICAgZm9yICh2YXIga2V5IGluIHNpdGVtYXBPYmopIHtcbiAgICAgIGNvbnNvbGUubG9nKGtleSlcbiAgICAgIHRoaXNba2V5XSA9IHNpdGVtYXBPYmpba2V5XVxuICAgIH1cbiAgICBjb25zb2xlLmxvZyh0aGlzKVxuXG4gICAgdmFyIHNlbGVjdG9ycyA9IHRoaXMuc2VsZWN0b3JzXG4gICAgdGhpcy5zZWxlY3RvcnMgPSBuZXcgU2VsZWN0b3JMaXN0KHRoaXMuc2VsZWN0b3JzKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIGFsbCBzZWxlY3RvcnMgb3IgcmVjdXJzaXZlbHkgZmluZCBhbmQgcmV0dXJuIGFsbCBjaGlsZCBzZWxlY3RvcnMgb2YgYSBwYXJlbnQgc2VsZWN0b3IuXG5cdCAqIEBwYXJhbSBwYXJlbnRTZWxlY3RvcklkXG5cdCAqIEByZXR1cm5zIHtBcnJheX1cblx0ICovXG4gIGdldEFsbFNlbGVjdG9yczogZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9ySWQpIHtcbiAgICByZXR1cm4gdGhpcy5zZWxlY3RvcnMuZ2V0QWxsU2VsZWN0b3JzKHBhcmVudFNlbGVjdG9ySWQpXG4gIH0sXG5cblx0LyoqXG5cdCAqIFJldHVybnMgb25seSBzZWxlY3RvcnMgdGhhdCBhcmUgZGlyZWN0bHkgdW5kZXIgYSBwYXJlbnRcblx0ICogQHBhcmFtIHBhcmVudFNlbGVjdG9ySWRcblx0ICogQHJldHVybnMge0FycmF5fVxuXHQgKi9cbiAgZ2V0RGlyZWN0Q2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3RvcklkKSB7XG4gICAgcmV0dXJuIHRoaXMuc2VsZWN0b3JzLmdldERpcmVjdENoaWxkU2VsZWN0b3JzKHBhcmVudFNlbGVjdG9ySWQpXG4gIH0sXG5cblx0LyoqXG5cdCAqIFJldHVybnMgYWxsIHNlbGVjdG9yIGlkIHBhcmFtZXRlcnNcblx0ICogQHJldHVybnMge0FycmF5fVxuXHQgKi9cbiAgZ2V0U2VsZWN0b3JJZHM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaWRzID0gWydfcm9vdCddXG4gICAgdGhpcy5zZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgIGlkcy5wdXNoKHNlbGVjdG9yLmlkKVxuICAgIH0pXG4gICAgcmV0dXJuIGlkc1xuICB9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIG9ubHkgc2VsZWN0b3IgaWRzIHdoaWNoIGNhbiBoYXZlIGNoaWxkIHNlbGVjdG9yc1xuXHQgKiBAcmV0dXJucyB7QXJyYXl9XG5cdCAqL1xuICBnZXRQb3NzaWJsZVBhcmVudFNlbGVjdG9ySWRzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGlkcyA9IFsnX3Jvb3QnXVxuICAgIHRoaXMuc2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICBpZiAoc2VsZWN0b3IuY2FuSGF2ZUNoaWxkU2VsZWN0b3JzKCkpIHtcbiAgICAgICAgaWRzLnB1c2goc2VsZWN0b3IuaWQpXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gaWRzXG4gIH0sXG5cbiAgZ2V0U3RhcnRVcmxzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN0YXJ0VXJscyA9IHRoaXMuc3RhcnRVcmxcblx0XHQvLyBzaW5nbGUgc3RhcnQgdXJsXG4gICAgaWYgKHRoaXMuc3RhcnRVcmwucHVzaCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBzdGFydFVybHMgPSBbc3RhcnRVcmxzXVxuICAgIH1cblxuICAgIHZhciB1cmxzID0gW11cbiAgICBzdGFydFVybHMuZm9yRWFjaChmdW5jdGlvbiAoc3RhcnRVcmwpIHtcblx0XHRcdC8vIHplcm8gcGFkZGluZyBoZWxwZXJcbiAgICAgIHZhciBscGFkID0gZnVuY3Rpb24gKHN0ciwgbGVuZ3RoKSB7XG4gICAgICAgIHdoaWxlIChzdHIubGVuZ3RoIDwgbGVuZ3RoKSB7IHN0ciA9ICcwJyArIHN0ciB9XG4gICAgICAgIHJldHVybiBzdHJcbiAgICAgIH1cblxuICAgICAgdmFyIHJlID0gL14oLio/KVxcWyhcXGQrKVxcLShcXGQrKSg6KFxcZCspKT9cXF0oLiopJC9cbiAgICAgIHZhciBtYXRjaGVzID0gc3RhcnRVcmwubWF0Y2gocmUpXG4gICAgICBpZiAobWF0Y2hlcykge1xuICAgICAgICB2YXIgc3RhcnRTdHIgPSBtYXRjaGVzWzJdXG4gICAgICAgIHZhciBlbmRTdHIgPSBtYXRjaGVzWzNdXG4gICAgICAgIHZhciBzdGFydCA9IHBhcnNlSW50KHN0YXJ0U3RyKVxuICAgICAgICB2YXIgZW5kID0gcGFyc2VJbnQoZW5kU3RyKVxuICAgICAgICB2YXIgaW5jcmVtZW50YWwgPSAxXG4gICAgICAgIGNvbnNvbGUubG9nKG1hdGNoZXNbNV0pXG4gICAgICAgIGlmIChtYXRjaGVzWzVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpbmNyZW1lbnRhbCA9IHBhcnNlSW50KG1hdGNoZXNbNV0pXG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDw9IGVuZDsgaSArPSBpbmNyZW1lbnRhbCkge1xuXHRcdFx0XHRcdC8vIHdpdGggemVybyBwYWRkaW5nXG4gICAgICAgICAgaWYgKHN0YXJ0U3RyLmxlbmd0aCA9PT0gZW5kU3RyLmxlbmd0aCkge1xuICAgICAgICAgICAgdXJscy5wdXNoKG1hdGNoZXNbMV0gKyBscGFkKGkudG9TdHJpbmcoKSwgc3RhcnRTdHIubGVuZ3RoKSArIG1hdGNoZXNbNl0pXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHVybHMucHVzaChtYXRjaGVzWzFdICsgaSArIG1hdGNoZXNbNl0pXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1cmxzXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB1cmxzLnB1c2goc3RhcnRVcmwpXG4gICAgICB9XG4gICAgfSlcblxuICAgIHJldHVybiB1cmxzXG4gIH0sXG5cbiAgdXBkYXRlU2VsZWN0b3I6IGZ1bmN0aW9uIChzZWxlY3Rvciwgc2VsZWN0b3JEYXRhKSB7XG5cdFx0Ly8gc2VsZWN0b3IgaXMgdW5kZWZpbmVkIHdoZW4gY3JlYXRpbmcgYSBuZXcgb25lXG4gICAgaWYgKHNlbGVjdG9yID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHNlbGVjdG9yID0gbmV3IFNlbGVjdG9yKHNlbGVjdG9yRGF0YSlcbiAgICB9XG5cblx0XHQvLyB1cGRhdGUgY2hpbGQgc2VsZWN0b3JzXG4gICAgaWYgKHNlbGVjdG9yLmlkICE9PSB1bmRlZmluZWQgJiYgc2VsZWN0b3IuaWQgIT09IHNlbGVjdG9yRGF0YS5pZCkge1xuICAgICAgdGhpcy5zZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAoY3VycmVudFNlbGVjdG9yKSB7XG4gICAgICAgIGN1cnJlbnRTZWxlY3Rvci5yZW5hbWVQYXJlbnRTZWxlY3RvcihzZWxlY3Rvci5pZCwgc2VsZWN0b3JEYXRhLmlkKVxuICAgICAgfSlcblxuXHRcdFx0Ly8gdXBkYXRlIGN5Y2xpYyBzZWxlY3RvclxuICAgICAgdmFyIHBvcyA9IHNlbGVjdG9yRGF0YS5wYXJlbnRTZWxlY3RvcnMuaW5kZXhPZihzZWxlY3Rvci5pZClcbiAgICAgIGlmIChwb3MgIT09IC0xKSB7XG4gICAgICAgIHNlbGVjdG9yRGF0YS5wYXJlbnRTZWxlY3RvcnMuc3BsaWNlKHBvcywgMSwgc2VsZWN0b3JEYXRhLmlkKVxuICAgICAgfVxuICAgIH1cblxuICAgIHNlbGVjdG9yLnVwZGF0ZURhdGEoc2VsZWN0b3JEYXRhKVxuXG4gICAgaWYgKHRoaXMuZ2V0U2VsZWN0b3JJZHMoKS5pbmRleE9mKHNlbGVjdG9yLmlkKSA9PT0gLTEpIHtcbiAgICAgIHRoaXMuc2VsZWN0b3JzLnB1c2goc2VsZWN0b3IpXG4gICAgfVxuICB9LFxuICBkZWxldGVTZWxlY3RvcjogZnVuY3Rpb24gKHNlbGVjdG9yVG9EZWxldGUpIHtcbiAgICB0aGlzLnNlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgaWYgKHNlbGVjdG9yLmhhc1BhcmVudFNlbGVjdG9yKHNlbGVjdG9yVG9EZWxldGUuaWQpKSB7XG4gICAgICAgIHNlbGVjdG9yLnJlbW92ZVBhcmVudFNlbGVjdG9yKHNlbGVjdG9yVG9EZWxldGUuaWQpXG4gICAgICAgIGlmIChzZWxlY3Rvci5wYXJlbnRTZWxlY3RvcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgdGhpcy5kZWxldGVTZWxlY3RvcihzZWxlY3RvcilcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIGZvciAodmFyIGkgaW4gdGhpcy5zZWxlY3RvcnMpIHtcbiAgICAgIGlmICh0aGlzLnNlbGVjdG9yc1tpXS5pZCA9PT0gc2VsZWN0b3JUb0RlbGV0ZS5pZCkge1xuICAgICAgICB0aGlzLnNlbGVjdG9ycy5zcGxpY2UoaSwgMSlcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIGdldERhdGFUYWJsZUlkOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2lkLnJlcGxhY2UoL1xcLi9nLCAnXycpXG4gIH0sXG4gIGV4cG9ydFNpdGVtYXA6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2l0ZW1hcE9iaiA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcykpXG4gICAgZGVsZXRlIHNpdGVtYXBPYmouX3JldlxuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShzaXRlbWFwT2JqKVxuICB9LFxuICBpbXBvcnRTaXRlbWFwOiBmdW5jdGlvbiAoc2l0ZW1hcEpTT04pIHtcbiAgICB2YXIgc2l0ZW1hcE9iaiA9IEpTT04ucGFyc2Uoc2l0ZW1hcEpTT04pXG4gICAgdGhpcy5pbml0RGF0YShzaXRlbWFwT2JqKVxuICB9LFxuXHQvLyByZXR1cm4gYSBsaXN0IG9mIGNvbHVtbnMgdGhhbiBjYW4gYmUgZXhwb3J0ZWRcbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY29sdW1ucyA9IFtdXG4gICAgdGhpcy5zZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgIGNvbHVtbnMgPSBjb2x1bW5zLmNvbmNhdChzZWxlY3Rvci5nZXREYXRhQ29sdW1ucygpKVxuICAgIH0pXG5cbiAgICByZXR1cm4gY29sdW1uc1xuICB9LFxuICBnZXREYXRhRXhwb3J0Q3N2QmxvYjogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICB2YXIgY29sdW1ucyA9IHRoaXMuZ2V0RGF0YUNvbHVtbnMoKSxcbiAgICAgIGRlbGltaXRlciA9ICcsJyxcbiAgICAgIG5ld2xpbmUgPSAnXFxuJyxcbiAgICAgIGNzdkRhdGEgPSBbJ1xcdWZlZmYnXSAvLyB1dGYtOCBib20gY2hhclxuXG5cdFx0Ly8gaGVhZGVyXG4gICAgY3N2RGF0YS5wdXNoKGNvbHVtbnMuam9pbihkZWxpbWl0ZXIpICsgbmV3bGluZSlcblxuXHRcdC8vIGRhdGFcbiAgICBkYXRhLmZvckVhY2goZnVuY3Rpb24gKHJvdykge1xuICAgICAgdmFyIHJvd0RhdGEgPSBbXVxuICAgICAgY29sdW1ucy5mb3JFYWNoKGZ1bmN0aW9uIChjb2x1bW4pIHtcbiAgICAgICAgdmFyIGNlbGxEYXRhID0gcm93W2NvbHVtbl1cbiAgICAgICAgaWYgKGNlbGxEYXRhID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjZWxsRGF0YSA9ICcnXG4gICAgICAgIH1cdFx0XHRcdGVsc2UgaWYgKHR5cGVvZiBjZWxsRGF0YSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICBjZWxsRGF0YSA9IEpTT04uc3RyaW5naWZ5KGNlbGxEYXRhKVxuICAgICAgICB9XG5cbiAgICAgICAgcm93RGF0YS5wdXNoKCdcIicgKyBjZWxsRGF0YS5yZXBsYWNlKC9cIi9nLCAnXCJcIicpLnRyaW0oKSArICdcIicpXG4gICAgICB9KVxuICAgICAgY3N2RGF0YS5wdXNoKHJvd0RhdGEuam9pbihkZWxpbWl0ZXIpICsgbmV3bGluZSlcbiAgICB9KVxuXG4gICAgcmV0dXJuIG5ldyBCbG9iKGNzdkRhdGEsIHt0eXBlOiAndGV4dC9jc3YnfSlcbiAgfSxcbiAgZ2V0U2VsZWN0b3JCeUlkOiBmdW5jdGlvbiAoc2VsZWN0b3JJZCkge1xuICAgIHJldHVybiB0aGlzLnNlbGVjdG9ycy5nZXRTZWxlY3RvckJ5SWQoc2VsZWN0b3JJZClcbiAgfSxcblx0LyoqXG5cdCAqIENyZWF0ZSBmdWxsIGNsb25lIG9mIHNpdGVtYXBcblx0ICogQHJldHVybnMge1NpdGVtYXB9XG5cdCAqL1xuICBjbG9uZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBjbG9uZWRKU09OID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzKSlcbiAgICB2YXIgc2l0ZW1hcCA9IG5ldyBTaXRlbWFwKGNsb25lZEpTT04pXG4gICAgcmV0dXJuIHNpdGVtYXBcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNpdGVtYXBcbiIsInZhciBDc3NTZWxlY3RvciA9IHJlcXVpcmUoJ2Nzcy1zZWxlY3RvcicpLkNzc1NlbGVjdG9yXG4vLyBUT0RPIGdldCByaWQgb2YganF1ZXJ5XG5cbi8qKlxuICogT25seSBFbGVtZW50cyB1bmlxdWUgd2lsbCBiZSBhZGRlZCB0byB0aGlzIGFycmF5XG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gVW5pcXVlRWxlbWVudExpc3QgKGNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlKSB7XG4gIHRoaXMuY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUgPSBjbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZVxuICB0aGlzLmFkZGVkRWxlbWVudHMgPSB7fVxufVxuXG5VbmlxdWVFbGVtZW50TGlzdC5wcm90b3R5cGUgPSBbXVxuXG5VbmlxdWVFbGVtZW50TGlzdC5wcm90b3R5cGUucHVzaCA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gIGlmICh0aGlzLmlzQWRkZWQoZWxlbWVudCkpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSBlbHNlIHtcbiAgICB2YXIgZWxlbWVudFVuaXF1ZUlkID0gdGhpcy5nZXRFbGVtZW50VW5pcXVlSWQoZWxlbWVudClcbiAgICB0aGlzLmFkZGVkRWxlbWVudHNbZWxlbWVudFVuaXF1ZUlkXSA9IHRydWVcbiAgICBBcnJheS5wcm90b3R5cGUucHVzaC5jYWxsKHRoaXMsICQoZWxlbWVudCkuY2xvbmUodHJ1ZSlbMF0pXG4gICAgcmV0dXJuIHRydWVcbiAgfVxufVxuXG5VbmlxdWVFbGVtZW50TGlzdC5wcm90b3R5cGUuZ2V0RWxlbWVudFVuaXF1ZUlkID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgaWYgKHRoaXMuY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUgPT09ICd1bmlxdWVUZXh0Jykge1xuICAgIHZhciBlbGVtZW50VGV4dCA9ICQoZWxlbWVudCkudGV4dCgpLnRyaW0oKVxuICAgIHJldHVybiBlbGVtZW50VGV4dFxuICB9IGVsc2UgaWYgKHRoaXMuY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUgPT09ICd1bmlxdWVIVE1MVGV4dCcpIHtcbiAgICB2YXIgZWxlbWVudEhUTUwgPSAkKFwiPGRpdiBjbGFzcz0nLXdlYi1zY3JhcGVyLXNob3VsZC1ub3QtYmUtdmlzaWJsZSc+XCIpLmFwcGVuZCgkKGVsZW1lbnQpLmVxKDApLmNsb25lKCkpLmh0bWwoKVxuICAgIHJldHVybiBlbGVtZW50SFRNTFxuICB9IGVsc2UgaWYgKHRoaXMuY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUgPT09ICd1bmlxdWVIVE1MJykge1xuXHRcdC8vIGdldCBlbGVtZW50IHdpdGhvdXQgdGV4dFxuICAgIHZhciAkZWxlbWVudCA9ICQoZWxlbWVudCkuZXEoMCkuY2xvbmUoKVxuXG4gICAgdmFyIHJlbW92ZVRleHQgPSBmdW5jdGlvbiAoJGVsZW1lbnQpIHtcbiAgICAgICRlbGVtZW50LmNvbnRlbnRzKClcblx0XHRcdFx0LmZpbHRlcihmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLm5vZGVUeXBlICE9PSAzKSB7XG4gICAgcmVtb3ZlVGV4dCgkKHRoaXMpKVxuICB9XG4gIHJldHVybiB0aGlzLm5vZGVUeXBlID09IDMgLy8gTm9kZS5URVhUX05PREVcbn0pLnJlbW92ZSgpXG4gICAgfVxuICAgIHJlbW92ZVRleHQoJGVsZW1lbnQpXG5cbiAgICB2YXIgZWxlbWVudEhUTUwgPSAkKFwiPGRpdiBjbGFzcz0nLXdlYi1zY3JhcGVyLXNob3VsZC1ub3QtYmUtdmlzaWJsZSc+XCIpLmFwcGVuZCgkZWxlbWVudCkuaHRtbCgpXG4gICAgcmV0dXJuIGVsZW1lbnRIVE1MXG4gIH0gZWxzZSBpZiAodGhpcy5jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSA9PT0gJ3VuaXF1ZUNTU1NlbGVjdG9yJykge1xuICAgIHZhciBjcyA9IG5ldyBDc3NTZWxlY3Rvcih7XG4gICAgICBlbmFibGVTbWFydFRhYmxlU2VsZWN0b3I6IGZhbHNlLFxuICAgICAgcGFyZW50OiAkKCdib2R5JylbMF0sXG4gICAgICBlbmFibGVSZXN1bHRTdHJpcHBpbmc6IGZhbHNlXG4gICAgfSlcbiAgICB2YXIgQ1NTU2VsZWN0b3IgPSBjcy5nZXRDc3NTZWxlY3RvcihbZWxlbWVudF0pXG4gICAgcmV0dXJuIENTU1NlbGVjdG9yXG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgJ0ludmFsaWQgY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUgJyArIHRoaXMuY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGVcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFVuaXF1ZUVsZW1lbnRMaXN0XG5cblVuaXF1ZUVsZW1lbnRMaXN0LnByb3RvdHlwZS5pc0FkZGVkID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgdmFyIGVsZW1lbnRVbmlxdWVJZCA9IHRoaXMuZ2V0RWxlbWVudFVuaXF1ZUlkKGVsZW1lbnQpXG4gIHZhciBpc0FkZGVkID0gZWxlbWVudFVuaXF1ZUlkIGluIHRoaXMuYWRkZWRFbGVtZW50c1xuICByZXR1cm4gaXNBZGRlZFxufVxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgQmFja2dyb3VuZFNjcmlwdCA9IHJlcXVpcmUoJy4vQmFja2dyb3VuZFNjcmlwdCcpXG4vKipcbiAqIEBwYXJhbSBsb2NhdGlvblx0Y29uZmlndXJlIGZyb20gd2hlcmUgdGhlIGNvbnRlbnQgc2NyaXB0IGlzIGJlaW5nIGFjY2Vzc2VkIChDb250ZW50U2NyaXB0LCBCYWNrZ3JvdW5kUGFnZSwgRGV2VG9vbHMpXG4gKiBAcmV0dXJucyBCYWNrZ3JvdW5kU2NyaXB0XG4gKi9cbnZhciBnZXRCYWNrZ3JvdW5kU2NyaXB0ID0gZnVuY3Rpb24gKGxvY2F0aW9uKSB7XG4gIC8vIEhhbmRsZSBjYWxscyBmcm9tIGRpZmZlcmVudCBwbGFjZXNcbiAgaWYgKGxvY2F0aW9uID09PSAnQmFja2dyb3VuZFNjcmlwdCcpIHtcbiAgICByZXR1cm4gQmFja2dyb3VuZFNjcmlwdFxuICB9IGVsc2UgaWYgKGxvY2F0aW9uID09PSAnRGV2VG9vbHMnIHx8IGxvY2F0aW9uID09PSAnQ29udGVudFNjcmlwdCcpIHtcbiAgICAvLyBpZiBjYWxsZWQgd2l0aGluIGJhY2tncm91bmQgc2NyaXB0IHByb3h5IGNhbGxzIHRvIGNvbnRlbnQgc2NyaXB0XG4gICAgdmFyIGJhY2tncm91bmRTY3JpcHQgPSB7fVxuXG4gICAgT2JqZWN0LmtleXMoQmFja2dyb3VuZFNjcmlwdCkuZm9yRWFjaChmdW5jdGlvbiAoYXR0cikge1xuICAgICAgaWYgKHR5cGVvZiBCYWNrZ3JvdW5kU2NyaXB0W2F0dHJdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGJhY2tncm91bmRTY3JpcHRbYXR0cl0gPSBmdW5jdGlvbiAocmVxdWVzdCkge1xuICAgICAgICAgIHZhciByZXFUb0JhY2tncm91bmRTY3JpcHQgPSB7XG4gICAgICAgICAgICBiYWNrZ3JvdW5kU2NyaXB0Q2FsbDogdHJ1ZSxcbiAgICAgICAgICAgIGZuOiBhdHRyLFxuICAgICAgICAgICAgcmVxdWVzdDogcmVxdWVzdFxuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICAgICAgICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHJlcVRvQmFja2dyb3VuZFNjcmlwdCwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUocmVzcG9uc2UpXG4gICAgICAgICAgfSlcblxuICAgICAgICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJhY2tncm91bmRTY3JpcHRbYXR0cl0gPSBCYWNrZ3JvdW5kU2NyaXB0W2F0dHJdXG4gICAgICB9XG4gICAgfSlcblxuICAgIHJldHVybiBiYWNrZ3JvdW5kU2NyaXB0XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIEJhY2tncm91bmRTY3JpcHQgaW5pdGlhbGl6YXRpb24gLSAnICsgbG9jYXRpb24pXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnZXRCYWNrZ3JvdW5kU2NyaXB0XG4iLCJ2YXIgZ2V0QmFja2dyb3VuZFNjcmlwdCA9IHJlcXVpcmUoJy4vZ2V0QmFja2dyb3VuZFNjcmlwdCcpXG52YXIgQ29udGVudFNjcmlwdCA9IHJlcXVpcmUoJy4vQ29udGVudFNjcmlwdCcpXG4vKipcbiAqXG4gKiBAcGFyYW0gbG9jYXRpb25cdGNvbmZpZ3VyZSBmcm9tIHdoZXJlIHRoZSBjb250ZW50IHNjcmlwdCBpcyBiZWluZyBhY2Nlc3NlZCAoQ29udGVudFNjcmlwdCwgQmFja2dyb3VuZFBhZ2UsIERldlRvb2xzKVxuICogQHBhcmFtIGJhY2tncm91bmRTY3JpcHRcdEJhY2tncm91bmRTY3JpcHQgY2xpZW50XG4gKiBAcmV0dXJucyBDb250ZW50U2NyaXB0XG4gKi9cbnZhciBnZXRDb250ZW50U2NyaXB0ID0gZnVuY3Rpb24gKGxvY2F0aW9uKSB7XG4gIHZhciBjb250ZW50U2NyaXB0XG5cbiAgLy8gSGFuZGxlIGNhbGxzIGZyb20gZGlmZmVyZW50IHBsYWNlc1xuICBpZiAobG9jYXRpb24gPT09ICdDb250ZW50U2NyaXB0Jykge1xuICAgIGNvbnRlbnRTY3JpcHQgPSBDb250ZW50U2NyaXB0XG4gICAgY29udGVudFNjcmlwdC5iYWNrZ3JvdW5kU2NyaXB0ID0gZ2V0QmFja2dyb3VuZFNjcmlwdCgnQ29udGVudFNjcmlwdCcpXG4gICAgcmV0dXJuIGNvbnRlbnRTY3JpcHRcbiAgfSBlbHNlIGlmIChsb2NhdGlvbiA9PT0gJ0JhY2tncm91bmRTY3JpcHQnIHx8IGxvY2F0aW9uID09PSAnRGV2VG9vbHMnKSB7XG4gICAgdmFyIGJhY2tncm91bmRTY3JpcHQgPSBnZXRCYWNrZ3JvdW5kU2NyaXB0KGxvY2F0aW9uKVxuXG4gICAgLy8gaWYgY2FsbGVkIHdpdGhpbiBiYWNrZ3JvdW5kIHNjcmlwdCBwcm94eSBjYWxscyB0byBjb250ZW50IHNjcmlwdFxuICAgIGNvbnRlbnRTY3JpcHQgPSB7fVxuICAgIE9iamVjdC5rZXlzKENvbnRlbnRTY3JpcHQpLmZvckVhY2goZnVuY3Rpb24gKGF0dHIpIHtcbiAgICAgIGlmICh0eXBlb2YgQ29udGVudFNjcmlwdFthdHRyXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBjb250ZW50U2NyaXB0W2F0dHJdID0gZnVuY3Rpb24gKHJlcXVlc3QpIHtcbiAgICAgICAgICB2YXIgcmVxVG9Db250ZW50U2NyaXB0ID0ge1xuICAgICAgICAgICAgY29udGVudFNjcmlwdENhbGw6IHRydWUsXG4gICAgICAgICAgICBmbjogYXR0cixcbiAgICAgICAgICAgIHJlcXVlc3Q6IHJlcXVlc3RcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gYmFja2dyb3VuZFNjcmlwdC5leGVjdXRlQ29udGVudFNjcmlwdChyZXFUb0NvbnRlbnRTY3JpcHQpXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnRlbnRTY3JpcHRbYXR0cl0gPSBDb250ZW50U2NyaXB0W2F0dHJdXG4gICAgICB9XG4gICAgfSlcbiAgICBjb250ZW50U2NyaXB0LmJhY2tncm91bmRTY3JpcHQgPSBiYWNrZ3JvdW5kU2NyaXB0XG4gICAgcmV0dXJuIGNvbnRlbnRTY3JpcHRcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgQ29udGVudFNjcmlwdCBpbml0aWFsaXphdGlvbiAtICcgKyBsb2NhdGlvbilcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdldENvbnRlbnRTY3JpcHRcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHRDc3NTZWxlY3Rvcixcblx0RWxlbWVudFNlbGVjdG9yLFxuXHRFbGVtZW50U2VsZWN0b3JMaXN0XG59XG5cblxuZnVuY3Rpb24gQ3NzU2VsZWN0b3IgKG9wdGlvbnMpIHtcblxuXHR2YXIgbWUgPSB0aGlzO1xuXG5cdC8vIGRlZmF1bHRzXG5cdHRoaXMuaWdub3JlZFRhZ3MgPSBbJ2ZvbnQnLCAnYicsICdpJywgJ3MnXTtcblx0dGhpcy5wYXJlbnQgPSBvcHRpb25zLmRvY3VtZW50IHx8IG9wdGlvbnMucGFyZW50XG5cdHRoaXMuZG9jdW1lbnQgPSBvcHRpb25zLmRvY3VtZW50IHx8IG9wdGlvbnMucGFyZW50IFxuXHR0aGlzLmlnbm9yZWRDbGFzc0Jhc2UgPSBmYWxzZTtcblx0dGhpcy5lbmFibGVSZXN1bHRTdHJpcHBpbmcgPSB0cnVlO1xuXHR0aGlzLmVuYWJsZVNtYXJ0VGFibGVTZWxlY3RvciA9IGZhbHNlO1xuXHR0aGlzLmlnbm9yZWRDbGFzc2VzID0gW107XG4gICAgdGhpcy5hbGxvd011bHRpcGxlU2VsZWN0b3JzID0gZmFsc2U7XG5cdHRoaXMucXVlcnkgPSBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcblx0XHRyZXR1cm4gbWUucGFyZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuXHR9O1xuXG5cdC8vIG92ZXJyaWRlcyBkZWZhdWx0cyB3aXRoIG9wdGlvbnNcblx0Zm9yICh2YXIgaSBpbiBvcHRpb25zKSB7XG5cdFx0dGhpc1tpXSA9IG9wdGlvbnNbaV07XG5cdH1cbn07XG5cbi8vIFRPRE8gcmVmYWN0b3IgZWxlbWVudCBzZWxlY3RvciBsaXN0IGludG8gYSB+IGNsYXNzXG5mdW5jdGlvbiBFbGVtZW50U2VsZWN0b3IgKGVsZW1lbnQsIGlnbm9yZWRDbGFzc2VzKSB7XG5cblx0dGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblx0dGhpcy5pc0RpcmVjdENoaWxkID0gdHJ1ZTtcblx0dGhpcy50YWcgPSBlbGVtZW50LmxvY2FsTmFtZTtcblx0dGhpcy50YWcgPSB0aGlzLnRhZy5yZXBsYWNlKC86L2csICdcXFxcOicpO1xuXG5cdC8vIG50aC1vZi1jaGlsZChuKzEpXG5cdHRoaXMuaW5kZXhuID0gbnVsbDtcblx0dGhpcy5pbmRleCA9IDE7XG5cdHRoaXMuaWQgPSBudWxsO1xuXHR0aGlzLmNsYXNzZXMgPSBuZXcgQXJyYXkoKTtcblxuXHQvLyBkbyBub3QgYWRkIGFkZGl0aW5hbCBpbmZvIHRvIGh0bWwsIGJvZHkgdGFncy5cblx0Ly8gaHRtbDpudGgtb2YtdHlwZSgxKSBjYW5ub3QgYmUgc2VsZWN0ZWRcblx0aWYodGhpcy50YWcgPT09ICdodG1sJyB8fCB0aGlzLnRhZyA9PT0gJ0hUTUwnXG5cdFx0fHwgdGhpcy50YWcgPT09ICdib2R5JyB8fCB0aGlzLnRhZyA9PT0gJ0JPRFknKSB7XG5cdFx0dGhpcy5pbmRleCA9IG51bGw7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0aWYgKGVsZW1lbnQucGFyZW50Tm9kZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0Ly8gbnRoLWNoaWxkXG5cdFx0Ly90aGlzLmluZGV4ID0gW10uaW5kZXhPZi5jYWxsKGVsZW1lbnQucGFyZW50Tm9kZS5jaGlsZHJlbiwgZWxlbWVudCkrMTtcblxuXHRcdC8vIG50aC1vZi10eXBlXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50LnBhcmVudE5vZGUuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBjaGlsZCA9IGVsZW1lbnQucGFyZW50Tm9kZS5jaGlsZHJlbltpXTtcblx0XHRcdGlmIChjaGlsZCA9PT0gZWxlbWVudCkge1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHRcdGlmIChjaGlsZC50YWdOYW1lID09PSBlbGVtZW50LnRhZ05hbWUpIHtcblx0XHRcdFx0dGhpcy5pbmRleCsrO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGlmIChlbGVtZW50LmlkICE9PSAnJykge1xuXHRcdGlmICh0eXBlb2YgZWxlbWVudC5pZCA9PT0gJ3N0cmluZycpIHtcblx0XHRcdHRoaXMuaWQgPSBlbGVtZW50LmlkO1xuXHRcdFx0dGhpcy5pZCA9IHRoaXMuaWQucmVwbGFjZSgvOi9nLCAnXFxcXDonKTtcblx0XHR9XG5cdH1cblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnQuY2xhc3NMaXN0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIGNjbGFzcyA9IGVsZW1lbnQuY2xhc3NMaXN0W2ldO1xuXHRcdGlmIChpZ25vcmVkQ2xhc3Nlcy5pbmRleE9mKGNjbGFzcykgPT09IC0xKSB7XG5cdFx0XHRjY2xhc3MgPSBjY2xhc3MucmVwbGFjZSgvOi9nLCAnXFxcXDonKTtcblx0XHRcdHRoaXMuY2xhc3Nlcy5wdXNoKGNjbGFzcyk7XG5cdFx0fVxuXHR9XG59O1xuXG5mdW5jdGlvbiBFbGVtZW50U2VsZWN0b3JMaXN0IChDc3NTZWxlY3Rvcikge1xuXHR0aGlzLkNzc1NlbGVjdG9yID0gQ3NzU2VsZWN0b3I7XG59O1xuXG5FbGVtZW50U2VsZWN0b3JMaXN0LnByb3RvdHlwZSA9IG5ldyBBcnJheSgpO1xuXG5FbGVtZW50U2VsZWN0b3JMaXN0LnByb3RvdHlwZS5nZXRDc3NTZWxlY3RvciA9IGZ1bmN0aW9uICgpIHtcblxuXHR2YXIgcmVzdWx0U2VsZWN0b3JzID0gW107XG5cblx0Ly8gVEREXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBzZWxlY3RvciA9IHRoaXNbaV07XG5cblx0XHR2YXIgaXNGaXJzdFNlbGVjdG9yID0gaSA9PT0gdGhpcy5sZW5ndGgtMTtcblx0XHR2YXIgcmVzdWx0U2VsZWN0b3IgPSBzZWxlY3Rvci5nZXRDc3NTZWxlY3Rvcihpc0ZpcnN0U2VsZWN0b3IpO1xuXG5cdFx0aWYgKHRoaXMuQ3NzU2VsZWN0b3IuZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yKSB7XG5cdFx0XHRpZiAoc2VsZWN0b3IudGFnID09PSAndHInKSB7XG5cdFx0XHRcdGlmIChzZWxlY3Rvci5lbGVtZW50LmNoaWxkcmVuLmxlbmd0aCA9PT0gMikge1xuXHRcdFx0XHRcdGlmIChzZWxlY3Rvci5lbGVtZW50LmNoaWxkcmVuWzBdLnRhZ05hbWUgPT09ICdURCdcblx0XHRcdFx0XHRcdHx8IHNlbGVjdG9yLmVsZW1lbnQuY2hpbGRyZW5bMF0udGFnTmFtZSA9PT0gJ1RIJ1xuXHRcdFx0XHRcdFx0fHwgc2VsZWN0b3IuZWxlbWVudC5jaGlsZHJlblswXS50YWdOYW1lID09PSAnVFInKSB7XG5cblx0XHRcdFx0XHRcdHZhciB0ZXh0ID0gc2VsZWN0b3IuZWxlbWVudC5jaGlsZHJlblswXS50ZXh0Q29udGVudDtcblx0XHRcdFx0XHRcdHRleHQgPSB0ZXh0LnRyaW0oKTtcblxuXHRcdFx0XHRcdFx0Ly8gZXNjYXBlIHF1b3Rlc1xuXHRcdFx0XHRcdFx0dGV4dC5yZXBsYWNlKC8oXFxcXCopKCcpL2csIGZ1bmN0aW9uICh4KSB7XG5cdFx0XHRcdFx0XHRcdHZhciBsID0geC5sZW5ndGg7XG5cdFx0XHRcdFx0XHRcdHJldHVybiAobCAlIDIpID8geCA6IHguc3Vic3RyaW5nKDAsIGwgLSAxKSArIFwiXFxcXCdcIjtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0cmVzdWx0U2VsZWN0b3IgKz0gXCI6Y29udGFpbnMoJ1wiICsgdGV4dCArIFwiJylcIjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXN1bHRTZWxlY3RvcnMucHVzaChyZXN1bHRTZWxlY3Rvcik7XG5cdH1cblxuXHR2YXIgcmVzdWx0Q1NTU2VsZWN0b3IgPSByZXN1bHRTZWxlY3RvcnMucmV2ZXJzZSgpLmpvaW4oJyAnKTtcblx0cmV0dXJuIHJlc3VsdENTU1NlbGVjdG9yO1xufTtcblxuRWxlbWVudFNlbGVjdG9yLnByb3RvdHlwZSA9IHtcblxuXHRnZXRDc3NTZWxlY3RvcjogZnVuY3Rpb24gKGlzRmlyc3RTZWxlY3Rvcikge1xuXG5cdFx0aWYoaXNGaXJzdFNlbGVjdG9yID09PSB1bmRlZmluZWQpIHtcblx0XHRcdGlzRmlyc3RTZWxlY3RvciA9IGZhbHNlO1xuXHRcdH1cblxuXHRcdHZhciBzZWxlY3RvciA9IHRoaXMudGFnO1xuXHRcdGlmICh0aGlzLmlkICE9PSBudWxsKSB7XG5cdFx0XHRzZWxlY3RvciArPSAnIycgKyB0aGlzLmlkO1xuXHRcdH1cblx0XHRpZiAodGhpcy5jbGFzc2VzLmxlbmd0aCkge1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmNsYXNzZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0c2VsZWN0b3IgKz0gXCIuXCIgKyB0aGlzLmNsYXNzZXNbaV07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmICh0aGlzLmluZGV4ICE9PSBudWxsKSB7XG5cdFx0XHRzZWxlY3RvciArPSAnOm50aC1vZi10eXBlKCcgKyB0aGlzLmluZGV4ICsgJyknO1xuXHRcdH1cblx0XHRpZiAodGhpcy5pbmRleG4gIT09IG51bGwgJiYgdGhpcy5pbmRleG4gIT09IC0xKSB7XG5cdFx0XHRzZWxlY3RvciArPSAnOm50aC1vZi10eXBlKG4rJyArIHRoaXMuaW5kZXhuICsgJyknO1xuXHRcdH1cblx0XHRpZih0aGlzLmlzRGlyZWN0Q2hpbGQgJiYgaXNGaXJzdFNlbGVjdG9yID09PSBmYWxzZSkge1xuXHRcdFx0c2VsZWN0b3IgPSBcIj4gXCIrc2VsZWN0b3I7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHNlbGVjdG9yO1xuXHR9LFxuXHQvLyBtZXJnZXMgdGhpcyBzZWxlY3RvciB3aXRoIGFub3RoZXIgb25lLlxuXHRtZXJnZTogZnVuY3Rpb24gKG1lcmdlU2VsZWN0b3IpIHtcblxuXHRcdGlmICh0aGlzLnRhZyAhPT0gbWVyZ2VTZWxlY3Rvci50YWcpIHtcblx0XHRcdHRocm93IFwiZGlmZmVyZW50IGVsZW1lbnQgc2VsZWN0ZWQgKHRhZylcIjtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5pbmRleCAhPT0gbnVsbCkge1xuXHRcdFx0aWYgKHRoaXMuaW5kZXggIT09IG1lcmdlU2VsZWN0b3IuaW5kZXgpIHtcblxuXHRcdFx0XHQvLyB1c2UgaW5kZXhuIG9ubHkgZm9yIHR3byBlbGVtZW50c1xuXHRcdFx0XHRpZiAodGhpcy5pbmRleG4gPT09IG51bGwpIHtcblx0XHRcdFx0XHR2YXIgaW5kZXhuID0gTWF0aC5taW4obWVyZ2VTZWxlY3Rvci5pbmRleCwgdGhpcy5pbmRleCk7XG5cdFx0XHRcdFx0aWYgKGluZGV4biA+IDEpIHtcblx0XHRcdFx0XHRcdHRoaXMuaW5kZXhuID0gTWF0aC5taW4obWVyZ2VTZWxlY3Rvci5pbmRleCwgdGhpcy5pbmRleCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHRoaXMuaW5kZXhuID0gLTE7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR0aGlzLmluZGV4ID0gbnVsbDtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZih0aGlzLmlzRGlyZWN0Q2hpbGQgPT09IHRydWUpIHtcblx0XHRcdHRoaXMuaXNEaXJlY3RDaGlsZCA9IG1lcmdlU2VsZWN0b3IuaXNEaXJlY3RDaGlsZDtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5pZCAhPT0gbnVsbCkge1xuXHRcdFx0aWYgKHRoaXMuaWQgIT09IG1lcmdlU2VsZWN0b3IuaWQpIHtcblx0XHRcdFx0dGhpcy5pZCA9IG51bGw7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2xhc3Nlcy5sZW5ndGggIT09IDApIHtcblx0XHRcdHZhciBjbGFzc2VzID0gbmV3IEFycmF5KCk7XG5cblx0XHRcdGZvciAodmFyIGkgaW4gdGhpcy5jbGFzc2VzKSB7XG5cdFx0XHRcdHZhciBjY2xhc3MgPSB0aGlzLmNsYXNzZXNbaV07XG5cdFx0XHRcdGlmIChtZXJnZVNlbGVjdG9yLmNsYXNzZXMuaW5kZXhPZihjY2xhc3MpICE9PSAtMSkge1xuXHRcdFx0XHRcdGNsYXNzZXMucHVzaChjY2xhc3MpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuY2xhc3NlcyA9IGNsYXNzZXM7XG5cdFx0fVxuXHR9XG59O1xuXG5Dc3NTZWxlY3Rvci5wcm90b3R5cGUgPSB7XG5cdG1lcmdlRWxlbWVudFNlbGVjdG9yczogZnVuY3Rpb24gKG5ld1NlbGVjb3JzKSB7XG5cblx0XHRpZiAobmV3U2VsZWNvcnMubGVuZ3RoIDwgMSkge1xuXHRcdFx0dGhyb3cgXCJObyBzZWxlY3RvcnMgc3BlY2lmaWVkXCI7XG5cdFx0fVxuXHRcdGVsc2UgaWYgKG5ld1NlbGVjb3JzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0cmV0dXJuIG5ld1NlbGVjb3JzWzBdO1xuXHRcdH1cblxuXHRcdC8vIGNoZWNrIHNlbGVjdG9yIHRvdGFsIGNvdW50XG5cdFx0dmFyIGVsZW1lbnRDb3VudEluU2VsZWN0b3IgPSBuZXdTZWxlY29yc1swXS5sZW5ndGg7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBuZXdTZWxlY29ycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHNlbGVjdG9yID0gbmV3U2VsZWNvcnNbaV07XG5cdFx0XHRpZiAoc2VsZWN0b3IubGVuZ3RoICE9PSBlbGVtZW50Q291bnRJblNlbGVjdG9yKSB7XG5cdFx0XHRcdHRocm93IFwiSW52YWxpZCBlbGVtZW50IGNvdW50IGluIHNlbGVjdG9yXCI7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gbWVyZ2Ugc2VsZWN0b3JzXG5cdFx0dmFyIHJlc3VsdGluZ0VsZW1lbnRzID0gbmV3U2VsZWNvcnNbMF07XG5cdFx0Zm9yICh2YXIgaSA9IDE7IGkgPCBuZXdTZWxlY29ycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIG1lcmdlRWxlbWVudHMgPSBuZXdTZWxlY29yc1tpXTtcblxuXHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBlbGVtZW50Q291bnRJblNlbGVjdG9yOyBqKyspIHtcblx0XHRcdFx0cmVzdWx0aW5nRWxlbWVudHNbal0ubWVyZ2UobWVyZ2VFbGVtZW50c1tqXSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHRpbmdFbGVtZW50cztcblx0fSxcblx0c3RyaXBTZWxlY3RvcjogZnVuY3Rpb24gKHNlbGVjdG9ycykge1xuXG5cdFx0dmFyIGNzc1NlbGV0b3IgPSBzZWxlY3RvcnMuZ2V0Q3NzU2VsZWN0b3IoKTtcblx0XHR2YXIgYmFzZVNlbGVjdGVkRWxlbWVudHMgPSB0aGlzLnF1ZXJ5KGNzc1NlbGV0b3IpO1xuXG5cdFx0dmFyIGNvbXBhcmVFbGVtZW50cyA9IGZ1bmN0aW9uIChlbGVtZW50cykge1xuXHRcdFx0aWYgKGJhc2VTZWxlY3RlZEVsZW1lbnRzLmxlbmd0aCAhPT0gZWxlbWVudHMubGVuZ3RoKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBiYXNlU2VsZWN0ZWRFbGVtZW50cy5sZW5ndGg7IGorKykge1xuXHRcdFx0XHRpZiAoW10uaW5kZXhPZi5jYWxsKGVsZW1lbnRzLCBiYXNlU2VsZWN0ZWRFbGVtZW50c1tqXSkgPT09IC0xKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9O1xuXHRcdC8vIHN0cmlwIGluZGV4ZXNcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHNlbGVjdG9ycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHNlbGVjdG9yID0gc2VsZWN0b3JzW2ldO1xuXHRcdFx0aWYgKHNlbGVjdG9yLmluZGV4ICE9PSBudWxsKSB7XG5cdFx0XHRcdHZhciBpbmRleCA9IHNlbGVjdG9yLmluZGV4O1xuXHRcdFx0XHRzZWxlY3Rvci5pbmRleCA9IG51bGw7XG5cdFx0XHRcdHZhciBjc3NTZWxldG9yID0gc2VsZWN0b3JzLmdldENzc1NlbGVjdG9yKCk7XG5cdFx0XHRcdHZhciBuZXdTZWxlY3RlZEVsZW1lbnRzID0gdGhpcy5xdWVyeShjc3NTZWxldG9yKTtcblx0XHRcdFx0Ly8gaWYgcmVzdWx0cyBkb2Vzbid0IG1hdGNoIHRoZW4gdW5kbyBjaGFuZ2VzXG5cdFx0XHRcdGlmICghY29tcGFyZUVsZW1lbnRzKG5ld1NlbGVjdGVkRWxlbWVudHMpKSB7XG5cdFx0XHRcdFx0c2VsZWN0b3IuaW5kZXggPSBpbmRleDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIHN0cmlwIGlzRGlyZWN0Q2hpbGRcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHNlbGVjdG9ycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHNlbGVjdG9yID0gc2VsZWN0b3JzW2ldO1xuXHRcdFx0aWYgKHNlbGVjdG9yLmlzRGlyZWN0Q2hpbGQgPT09IHRydWUpIHtcblx0XHRcdFx0c2VsZWN0b3IuaXNEaXJlY3RDaGlsZCA9IGZhbHNlO1xuXHRcdFx0XHR2YXIgY3NzU2VsZXRvciA9IHNlbGVjdG9ycy5nZXRDc3NTZWxlY3RvcigpO1xuXHRcdFx0XHR2YXIgbmV3U2VsZWN0ZWRFbGVtZW50cyA9IHRoaXMucXVlcnkoY3NzU2VsZXRvcik7XG5cdFx0XHRcdC8vIGlmIHJlc3VsdHMgZG9lc24ndCBtYXRjaCB0aGVuIHVuZG8gY2hhbmdlc1xuXHRcdFx0XHRpZiAoIWNvbXBhcmVFbGVtZW50cyhuZXdTZWxlY3RlZEVsZW1lbnRzKSkge1xuXHRcdFx0XHRcdHNlbGVjdG9yLmlzRGlyZWN0Q2hpbGQgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gc3RyaXAgaWRzXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzZWxlY3RvcnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBzZWxlY3RvciA9IHNlbGVjdG9yc1tpXTtcblx0XHRcdGlmIChzZWxlY3Rvci5pZCAhPT0gbnVsbCkge1xuXHRcdFx0XHR2YXIgaWQgPSBzZWxlY3Rvci5pZDtcblx0XHRcdFx0c2VsZWN0b3IuaWQgPSBudWxsO1xuXHRcdFx0XHR2YXIgY3NzU2VsZXRvciA9IHNlbGVjdG9ycy5nZXRDc3NTZWxlY3RvcigpO1xuXHRcdFx0XHR2YXIgbmV3U2VsZWN0ZWRFbGVtZW50cyA9IHRoaXMucXVlcnkoY3NzU2VsZXRvcik7XG5cdFx0XHRcdC8vIGlmIHJlc3VsdHMgZG9lc24ndCBtYXRjaCB0aGVuIHVuZG8gY2hhbmdlc1xuXHRcdFx0XHRpZiAoIWNvbXBhcmVFbGVtZW50cyhuZXdTZWxlY3RlZEVsZW1lbnRzKSkge1xuXHRcdFx0XHRcdHNlbGVjdG9yLmlkID0gaWQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBzdHJpcCBjbGFzc2VzXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzZWxlY3RvcnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBzZWxlY3RvciA9IHNlbGVjdG9yc1tpXTtcblx0XHRcdGlmIChzZWxlY3Rvci5jbGFzc2VzLmxlbmd0aCAhPT0gMCkge1xuXHRcdFx0XHRmb3IgKHZhciBqID0gc2VsZWN0b3IuY2xhc3Nlcy5sZW5ndGggLSAxOyBqID4gMDsgai0tKSB7XG5cdFx0XHRcdFx0dmFyIGNjbGFzcyA9IHNlbGVjdG9yLmNsYXNzZXNbal07XG5cdFx0XHRcdFx0c2VsZWN0b3IuY2xhc3Nlcy5zcGxpY2UoaiwgMSk7XG5cdFx0XHRcdFx0dmFyIGNzc1NlbGV0b3IgPSBzZWxlY3RvcnMuZ2V0Q3NzU2VsZWN0b3IoKTtcblx0XHRcdFx0XHR2YXIgbmV3U2VsZWN0ZWRFbGVtZW50cyA9IHRoaXMucXVlcnkoY3NzU2VsZXRvcik7XG5cdFx0XHRcdFx0Ly8gaWYgcmVzdWx0cyBkb2Vzbid0IG1hdGNoIHRoZW4gdW5kbyBjaGFuZ2VzXG5cdFx0XHRcdFx0aWYgKCFjb21wYXJlRWxlbWVudHMobmV3U2VsZWN0ZWRFbGVtZW50cykpIHtcblx0XHRcdFx0XHRcdHNlbGVjdG9yLmNsYXNzZXMuc3BsaWNlKGosIDAsIGNjbGFzcyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gc3RyaXAgdGFnc1xuXHRcdGZvciAodmFyIGkgPSBzZWxlY3RvcnMubGVuZ3RoIC0gMTsgaSA+IDA7IGktLSkge1xuXHRcdFx0dmFyIHNlbGVjdG9yID0gc2VsZWN0b3JzW2ldO1xuXHRcdFx0c2VsZWN0b3JzLnNwbGljZShpLCAxKTtcblx0XHRcdHZhciBjc3NTZWxldG9yID0gc2VsZWN0b3JzLmdldENzc1NlbGVjdG9yKCk7XG5cdFx0XHR2YXIgbmV3U2VsZWN0ZWRFbGVtZW50cyA9IHRoaXMucXVlcnkoY3NzU2VsZXRvcik7XG5cdFx0XHQvLyBpZiByZXN1bHRzIGRvZXNuJ3QgbWF0Y2ggdGhlbiB1bmRvIGNoYW5nZXNcblx0XHRcdGlmICghY29tcGFyZUVsZW1lbnRzKG5ld1NlbGVjdGVkRWxlbWVudHMpKSB7XG5cdFx0XHRcdHNlbGVjdG9ycy5zcGxpY2UoaSwgMCwgc2VsZWN0b3IpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBzZWxlY3RvcnM7XG5cdH0sXG5cdGdldEVsZW1lbnRTZWxlY3RvcnM6IGZ1bmN0aW9uIChlbGVtZW50cywgdG9wKSB7XG5cdFx0dmFyIGVsZW1lbnRTZWxlY3RvcnMgPSBbXTtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBlbGVtZW50ID0gZWxlbWVudHNbaV07XG5cdFx0XHR2YXIgZWxlbWVudFNlbGVjdG9yID0gdGhpcy5nZXRFbGVtZW50U2VsZWN0b3IoZWxlbWVudCwgdG9wKTtcblx0XHRcdGVsZW1lbnRTZWxlY3RvcnMucHVzaChlbGVtZW50U2VsZWN0b3IpO1xuXHRcdH1cblxuXHRcdHJldHVybiBlbGVtZW50U2VsZWN0b3JzO1xuXHR9LFxuXHRnZXRFbGVtZW50U2VsZWN0b3I6IGZ1bmN0aW9uIChlbGVtZW50LCB0b3ApIHtcblxuXHRcdHZhciBlbGVtZW50U2VsZWN0b3JMaXN0ID0gbmV3IEVsZW1lbnRTZWxlY3Rvckxpc3QodGhpcyk7XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdGlmIChlbGVtZW50ID09PSB0aGlzLnBhcmVudCkge1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKGVsZW1lbnQgPT09IHVuZGVmaW5lZCB8fCBlbGVtZW50ID09PSB0aGlzLmRvY3VtZW50KSB7XG5cdFx0XHRcdHRocm93ICdlbGVtZW50IGlzIG5vdCBhIGNoaWxkIG9mIHRoZSBnaXZlbiBwYXJlbnQnO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRoaXMuaXNJZ25vcmVkVGFnKGVsZW1lbnQudGFnTmFtZSkpIHtcblxuXHRcdFx0XHRlbGVtZW50ID0gZWxlbWVudC5wYXJlbnROb2RlO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblx0XHRcdGlmICh0b3AgPiAwKSB7XG5cdFx0XHRcdHRvcC0tO1xuXHRcdFx0XHRlbGVtZW50ID0gZWxlbWVudC5wYXJlbnROb2RlO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0dmFyIHNlbGVjdG9yID0gbmV3IEVsZW1lbnRTZWxlY3RvcihlbGVtZW50LCB0aGlzLmlnbm9yZWRDbGFzc2VzKTtcblx0XHRcdC8vIGRvY3VtZW50IGRvZXMgbm90IGhhdmUgYSB0YWdOYW1lXG5cdFx0XHRpZihlbGVtZW50LnBhcmVudE5vZGUgPT09IHRoaXMuZG9jdW1lbnQgfHwgdGhpcy5pc0lnbm9yZWRUYWcoZWxlbWVudC5wYXJlbnROb2RlLnRhZ05hbWUpKSB7XG5cdFx0XHRcdHNlbGVjdG9yLmlzRGlyZWN0Q2hpbGQgPSBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0ZWxlbWVudFNlbGVjdG9yTGlzdC5wdXNoKHNlbGVjdG9yKTtcblx0XHRcdGVsZW1lbnQgPSBlbGVtZW50LnBhcmVudE5vZGU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGVsZW1lbnRTZWxlY3Rvckxpc3Q7XG5cdH0sXG5cbiAgICAvKipcbiAgICAgKiBDb21wYXJlcyB3aGV0aGVyIHR3byBlbGVtZW50cyBhcmUgc2ltaWxhci4gU2ltaWxhciBlbGVtZW50cyBzaG91bGRcbiAgICAgKiBoYXZlIGEgY29tbW9uIHBhcnJlbnQgYW5kIGFsbCBwYXJlbnQgZWxlbWVudHMgc2hvdWxkIGJlIHRoZSBzYW1lIHR5cGUuXG4gICAgICogQHBhcmFtIGVsZW1lbnQxXG4gICAgICogQHBhcmFtIGVsZW1lbnQyXG4gICAgICovXG4gICAgY2hlY2tTaW1pbGFyRWxlbWVudHM6IGZ1bmN0aW9uKGVsZW1lbnQxLCBlbGVtZW50Mikge1xuXG4gICAgICAgIHdoaWxlICh0cnVlKSB7XG5cbiAgICAgICAgICAgIGlmKGVsZW1lbnQxLnRhZ05hbWUgIT09IGVsZW1lbnQyLnRhZ05hbWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZihlbGVtZW50MSA9PT0gZWxlbWVudDIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gc3RvcCBhdCBib2R5IHRhZ1xuICAgICAgICAgICAgaWYgKGVsZW1lbnQxID09PSB1bmRlZmluZWQgfHwgZWxlbWVudDEudGFnTmFtZSA9PT0gJ2JvZHknXG4gICAgICAgICAgICAgICAgfHwgZWxlbWVudDEudGFnTmFtZSA9PT0gJ0JPRFknKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGVsZW1lbnQyID09PSB1bmRlZmluZWQgfHwgZWxlbWVudDIudGFnTmFtZSA9PT0gJ2JvZHknXG4gICAgICAgICAgICAgICAgfHwgZWxlbWVudDIudGFnTmFtZSA9PT0gJ0JPRFknKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBlbGVtZW50MSA9IGVsZW1lbnQxLnBhcmVudE5vZGU7XG4gICAgICAgICAgICBlbGVtZW50MiA9IGVsZW1lbnQyLnBhcmVudE5vZGU7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR3JvdXBzIGVsZW1lbnRzIGludG8gZ3JvdXBzIGlmIHRoZSBlbWVsZW50cyBhcmUgbm90IHNpbWlsYXJcbiAgICAgKiBAcGFyYW0gZWxlbWVudHNcbiAgICAgKi9cbiAgICBnZXRFbGVtZW50R3JvdXBzOiBmdW5jdGlvbihlbGVtZW50cykge1xuXG4gICAgICAgIC8vIGZpcnN0IGVsbWVudCBpcyBpbiB0aGUgZmlyc3QgZ3JvdXBcbiAgICAgICAgLy8gQFRPRE8gbWF5YmUgaSBkb250IG5lZWQgdGhpcz9cbiAgICAgICAgdmFyIGdyb3VwcyA9IFtbZWxlbWVudHNbMF1dXTtcblxuICAgICAgICBmb3IodmFyIGkgPSAxOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBlbGVtZW50TmV3ID0gZWxlbWVudHNbaV07XG4gICAgICAgICAgICB2YXIgYWRkZWRUb0dyb3VwID0gZmFsc2U7XG4gICAgICAgICAgICBmb3IodmFyIGogPSAwOyBqIDwgZ3JvdXBzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGdyb3VwID0gZ3JvdXBzW2pdO1xuICAgICAgICAgICAgICAgIHZhciBlbGVtZW50R3JvdXAgPSBncm91cFswXTtcbiAgICAgICAgICAgICAgICBpZih0aGlzLmNoZWNrU2ltaWxhckVsZW1lbnRzKGVsZW1lbnROZXcsIGVsZW1lbnRHcm91cCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZ3JvdXAucHVzaChlbGVtZW50TmV3KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkZWRUb0dyb3VwID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBhZGQgbmV3IGdyb3VwXG4gICAgICAgICAgICBpZighYWRkZWRUb0dyb3VwKSB7XG4gICAgICAgICAgICAgICAgZ3JvdXBzLnB1c2goW2VsZW1lbnROZXddKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBncm91cHM7XG4gICAgfSxcblx0Z2V0Q3NzU2VsZWN0b3I6IGZ1bmN0aW9uIChlbGVtZW50cywgdG9wKSB7XG5cblx0XHR0b3AgPSB0b3AgfHwgMDtcblxuXHRcdHZhciBlbmFibGVTbWFydFRhYmxlU2VsZWN0b3IgPSB0aGlzLmVuYWJsZVNtYXJ0VGFibGVTZWxlY3Rvcjtcblx0XHRpZiAoZWxlbWVudHMubGVuZ3RoID4gMSkge1xuXHRcdFx0dGhpcy5lbmFibGVTbWFydFRhYmxlU2VsZWN0b3IgPSBmYWxzZTtcblx0XHR9XG5cbiAgICAgICAgLy8gZ3JvdXAgZWxlbWVudHMgaW50byBzaW1pbGFyaXR5IGdyb3Vwc1xuICAgICAgICB2YXIgZWxlbWVudEdyb3VwcyA9IHRoaXMuZ2V0RWxlbWVudEdyb3VwcyhlbGVtZW50cyk7XG5cbiAgICAgICAgdmFyIHJlc3VsdENTU1NlbGVjdG9yO1xuXG4gICAgICAgIGlmKHRoaXMuYWxsb3dNdWx0aXBsZVNlbGVjdG9ycykge1xuXG4gICAgICAgICAgICB2YXIgZ3JvdXBTZWxlY3RvcnMgPSBbXTtcblxuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGVsZW1lbnRHcm91cHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgZ3JvdXBFbGVtZW50cyA9IGVsZW1lbnRHcm91cHNbaV07XG5cbiAgICAgICAgICAgICAgICB2YXIgZWxlbWVudFNlbGVjdG9ycyA9IHRoaXMuZ2V0RWxlbWVudFNlbGVjdG9ycyhncm91cEVsZW1lbnRzLCB0b3ApO1xuICAgICAgICAgICAgICAgIHZhciByZXN1bHRTZWxlY3RvciA9IHRoaXMubWVyZ2VFbGVtZW50U2VsZWN0b3JzKGVsZW1lbnRTZWxlY3RvcnMpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmVuYWJsZVJlc3VsdFN0cmlwcGluZykge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRTZWxlY3RvciA9IHRoaXMuc3RyaXBTZWxlY3RvcihyZXN1bHRTZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZ3JvdXBTZWxlY3RvcnMucHVzaChyZXN1bHRTZWxlY3Rvci5nZXRDc3NTZWxlY3RvcigpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVzdWx0Q1NTU2VsZWN0b3IgPSBncm91cFNlbGVjdG9ycy5qb2luKCcsICcpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYoZWxlbWVudEdyb3Vwcy5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBcImZvdW5kIG11bHRpcGxlIGVsZW1lbnQgZ3JvdXBzLCBidXQgYWxsb3dNdWx0aXBsZVNlbGVjdG9ycyBkaXNhYmxlZFwiO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgZWxlbWVudFNlbGVjdG9ycyA9IHRoaXMuZ2V0RWxlbWVudFNlbGVjdG9ycyhlbGVtZW50cywgdG9wKTtcbiAgICAgICAgICAgIHZhciByZXN1bHRTZWxlY3RvciA9IHRoaXMubWVyZ2VFbGVtZW50U2VsZWN0b3JzKGVsZW1lbnRTZWxlY3RvcnMpO1xuICAgICAgICAgICAgaWYgKHRoaXMuZW5hYmxlUmVzdWx0U3RyaXBwaW5nKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0U2VsZWN0b3IgPSB0aGlzLnN0cmlwU2VsZWN0b3IocmVzdWx0U2VsZWN0b3IpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXN1bHRDU1NTZWxlY3RvciA9IHJlc3VsdFNlbGVjdG9yLmdldENzc1NlbGVjdG9yKCk7XG4gICAgICAgIH1cblxuXHRcdHRoaXMuZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yID0gZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yO1xuXG5cdFx0Ly8gc3RyaXAgZG93biBzZWxlY3RvclxuXHRcdHJldHVybiByZXN1bHRDU1NTZWxlY3Rvcjtcblx0fSxcblx0aXNJZ25vcmVkVGFnOiBmdW5jdGlvbiAodGFnKSB7XG5cdFx0cmV0dXJuIHRoaXMuaWdub3JlZFRhZ3MuaW5kZXhPZih0YWcudG9Mb3dlckNhc2UoKSkgIT09IC0xO1xuXHR9XG59O1xuIiwiXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vbGliL2pxdWVyeS1kZWZlcnJlZCcpOyIsInZhciBqUXVlcnkgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL2pxdWVyeS1jb3JlLmpzXCIpLFxuXHRjb3JlX3JzcGFjZSA9IC9cXHMrLztcbi8qKlxuKiBqUXVlcnkgQ2FsbGJhY2tzXG4qXG4qIENvZGUgZnJvbTogaHR0cHM6Ly9naXRodWIuY29tL2pxdWVyeS9qcXVlcnkvYmxvYi9tYXN0ZXIvc3JjL2NhbGxiYWNrcy5qc1xuKlxuKi9cblxuXG4vLyBTdHJpbmcgdG8gT2JqZWN0IG9wdGlvbnMgZm9ybWF0IGNhY2hlXG52YXIgb3B0aW9uc0NhY2hlID0ge307XG5cbi8vIENvbnZlcnQgU3RyaW5nLWZvcm1hdHRlZCBvcHRpb25zIGludG8gT2JqZWN0LWZvcm1hdHRlZCBvbmVzIGFuZCBzdG9yZSBpbiBjYWNoZVxuZnVuY3Rpb24gY3JlYXRlT3B0aW9ucyggb3B0aW9ucyApIHtcblx0dmFyIG9iamVjdCA9IG9wdGlvbnNDYWNoZVsgb3B0aW9ucyBdID0ge307XG5cdGpRdWVyeS5lYWNoKCBvcHRpb25zLnNwbGl0KCBjb3JlX3JzcGFjZSApLCBmdW5jdGlvbiggXywgZmxhZyApIHtcblx0XHRvYmplY3RbIGZsYWcgXSA9IHRydWU7XG5cdH0pO1xuXHRyZXR1cm4gb2JqZWN0O1xufVxuXG4vKlxuICogQ3JlYXRlIGEgY2FsbGJhY2sgbGlzdCB1c2luZyB0aGUgZm9sbG93aW5nIHBhcmFtZXRlcnM6XG4gKlxuICpcdG9wdGlvbnM6IGFuIG9wdGlvbmFsIGxpc3Qgb2Ygc3BhY2Utc2VwYXJhdGVkIG9wdGlvbnMgdGhhdCB3aWxsIGNoYW5nZSBob3dcbiAqXHRcdFx0dGhlIGNhbGxiYWNrIGxpc3QgYmVoYXZlcyBvciBhIG1vcmUgdHJhZGl0aW9uYWwgb3B0aW9uIG9iamVjdFxuICpcbiAqIEJ5IGRlZmF1bHQgYSBjYWxsYmFjayBsaXN0IHdpbGwgYWN0IGxpa2UgYW4gZXZlbnQgY2FsbGJhY2sgbGlzdCBhbmQgY2FuIGJlXG4gKiBcImZpcmVkXCIgbXVsdGlwbGUgdGltZXMuXG4gKlxuICogUG9zc2libGUgb3B0aW9uczpcbiAqXG4gKlx0b25jZTpcdFx0XHR3aWxsIGVuc3VyZSB0aGUgY2FsbGJhY2sgbGlzdCBjYW4gb25seSBiZSBmaXJlZCBvbmNlIChsaWtlIGEgRGVmZXJyZWQpXG4gKlxuICpcdG1lbW9yeTpcdFx0XHR3aWxsIGtlZXAgdHJhY2sgb2YgcHJldmlvdXMgdmFsdWVzIGFuZCB3aWxsIGNhbGwgYW55IGNhbGxiYWNrIGFkZGVkXG4gKlx0XHRcdFx0XHRhZnRlciB0aGUgbGlzdCBoYXMgYmVlbiBmaXJlZCByaWdodCBhd2F5IHdpdGggdGhlIGxhdGVzdCBcIm1lbW9yaXplZFwiXG4gKlx0XHRcdFx0XHR2YWx1ZXMgKGxpa2UgYSBEZWZlcnJlZClcbiAqXG4gKlx0dW5pcXVlOlx0XHRcdHdpbGwgZW5zdXJlIGEgY2FsbGJhY2sgY2FuIG9ubHkgYmUgYWRkZWQgb25jZSAobm8gZHVwbGljYXRlIGluIHRoZSBsaXN0KVxuICpcbiAqXHRzdG9wT25GYWxzZTpcdGludGVycnVwdCBjYWxsaW5ncyB3aGVuIGEgY2FsbGJhY2sgcmV0dXJucyBmYWxzZVxuICpcbiAqL1xualF1ZXJ5LkNhbGxiYWNrcyA9IGZ1bmN0aW9uKCBvcHRpb25zICkge1xuXG5cdC8vIENvbnZlcnQgb3B0aW9ucyBmcm9tIFN0cmluZy1mb3JtYXR0ZWQgdG8gT2JqZWN0LWZvcm1hdHRlZCBpZiBuZWVkZWRcblx0Ly8gKHdlIGNoZWNrIGluIGNhY2hlIGZpcnN0KVxuXHRvcHRpb25zID0gdHlwZW9mIG9wdGlvbnMgPT09IFwic3RyaW5nXCIgP1xuXHRcdCggb3B0aW9uc0NhY2hlWyBvcHRpb25zIF0gfHwgY3JlYXRlT3B0aW9ucyggb3B0aW9ucyApICkgOlxuXHRcdGpRdWVyeS5leHRlbmQoIHt9LCBvcHRpb25zICk7XG5cblx0dmFyIC8vIExhc3QgZmlyZSB2YWx1ZSAoZm9yIG5vbi1mb3JnZXR0YWJsZSBsaXN0cylcblx0XHRtZW1vcnksXG5cdFx0Ly8gRmxhZyB0byBrbm93IGlmIGxpc3Qgd2FzIGFscmVhZHkgZmlyZWRcblx0XHRmaXJlZCxcblx0XHQvLyBGbGFnIHRvIGtub3cgaWYgbGlzdCBpcyBjdXJyZW50bHkgZmlyaW5nXG5cdFx0ZmlyaW5nLFxuXHRcdC8vIEZpcnN0IGNhbGxiYWNrIHRvIGZpcmUgKHVzZWQgaW50ZXJuYWxseSBieSBhZGQgYW5kIGZpcmVXaXRoKVxuXHRcdGZpcmluZ1N0YXJ0LFxuXHRcdC8vIEVuZCBvZiB0aGUgbG9vcCB3aGVuIGZpcmluZ1xuXHRcdGZpcmluZ0xlbmd0aCxcblx0XHQvLyBJbmRleCBvZiBjdXJyZW50bHkgZmlyaW5nIGNhbGxiYWNrIChtb2RpZmllZCBieSByZW1vdmUgaWYgbmVlZGVkKVxuXHRcdGZpcmluZ0luZGV4LFxuXHRcdC8vIEFjdHVhbCBjYWxsYmFjayBsaXN0XG5cdFx0bGlzdCA9IFtdLFxuXHRcdC8vIFN0YWNrIG9mIGZpcmUgY2FsbHMgZm9yIHJlcGVhdGFibGUgbGlzdHNcblx0XHRzdGFjayA9ICFvcHRpb25zLm9uY2UgJiYgW10sXG5cdFx0Ly8gRmlyZSBjYWxsYmFja3Ncblx0XHRmaXJlID0gZnVuY3Rpb24oIGRhdGEgKSB7XG5cdFx0XHRtZW1vcnkgPSBvcHRpb25zLm1lbW9yeSAmJiBkYXRhO1xuXHRcdFx0ZmlyZWQgPSB0cnVlO1xuXHRcdFx0ZmlyaW5nSW5kZXggPSBmaXJpbmdTdGFydCB8fCAwO1xuXHRcdFx0ZmlyaW5nU3RhcnQgPSAwO1xuXHRcdFx0ZmlyaW5nTGVuZ3RoID0gbGlzdC5sZW5ndGg7XG5cdFx0XHRmaXJpbmcgPSB0cnVlO1xuXHRcdFx0Zm9yICggOyBsaXN0ICYmIGZpcmluZ0luZGV4IDwgZmlyaW5nTGVuZ3RoOyBmaXJpbmdJbmRleCsrICkge1xuXHRcdFx0XHRpZiAoIGxpc3RbIGZpcmluZ0luZGV4IF0uYXBwbHkoIGRhdGFbIDAgXSwgZGF0YVsgMSBdICkgPT09IGZhbHNlICYmIG9wdGlvbnMuc3RvcE9uRmFsc2UgKSB7XG5cdFx0XHRcdFx0bWVtb3J5ID0gZmFsc2U7IC8vIFRvIHByZXZlbnQgZnVydGhlciBjYWxscyB1c2luZyBhZGRcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0ZmlyaW5nID0gZmFsc2U7XG5cdFx0XHRpZiAoIGxpc3QgKSB7XG5cdFx0XHRcdGlmICggc3RhY2sgKSB7XG5cdFx0XHRcdFx0aWYgKCBzdGFjay5sZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRmaXJlKCBzdGFjay5zaGlmdCgpICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2UgaWYgKCBtZW1vcnkgKSB7XG5cdFx0XHRcdFx0bGlzdCA9IFtdO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHNlbGYuZGlzYWJsZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblx0XHQvLyBBY3R1YWwgQ2FsbGJhY2tzIG9iamVjdFxuXHRcdHNlbGYgPSB7XG5cdFx0XHQvLyBBZGQgYSBjYWxsYmFjayBvciBhIGNvbGxlY3Rpb24gb2YgY2FsbGJhY2tzIHRvIHRoZSBsaXN0XG5cdFx0XHRhZGQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAoIGxpc3QgKSB7XG5cdFx0XHRcdFx0Ly8gRmlyc3QsIHdlIHNhdmUgdGhlIGN1cnJlbnQgbGVuZ3RoXG5cdFx0XHRcdFx0dmFyIHN0YXJ0ID0gbGlzdC5sZW5ndGg7XG5cdFx0XHRcdFx0KGZ1bmN0aW9uIGFkZCggYXJncyApIHtcblx0XHRcdFx0XHRcdGpRdWVyeS5lYWNoKCBhcmdzLCBmdW5jdGlvbiggXywgYXJnICkge1xuXHRcdFx0XHRcdFx0XHR2YXIgdHlwZSA9IGpRdWVyeS50eXBlKCBhcmcgKTtcblx0XHRcdFx0XHRcdFx0aWYgKCB0eXBlID09PSBcImZ1bmN0aW9uXCIgKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCAhb3B0aW9ucy51bmlxdWUgfHwgIXNlbGYuaGFzKCBhcmcgKSApIHtcblx0XHRcdFx0XHRcdFx0XHRcdGxpc3QucHVzaCggYXJnICk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKCBhcmcgJiYgYXJnLmxlbmd0aCAmJiB0eXBlICE9PSBcInN0cmluZ1wiICkge1xuXHRcdFx0XHRcdFx0XHRcdC8vIEluc3BlY3QgcmVjdXJzaXZlbHlcblx0XHRcdFx0XHRcdFx0XHRhZGQoIGFyZyApO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9KSggYXJndW1lbnRzICk7XG5cdFx0XHRcdFx0Ly8gRG8gd2UgbmVlZCB0byBhZGQgdGhlIGNhbGxiYWNrcyB0byB0aGVcblx0XHRcdFx0XHQvLyBjdXJyZW50IGZpcmluZyBiYXRjaD9cblx0XHRcdFx0XHRpZiAoIGZpcmluZyApIHtcblx0XHRcdFx0XHRcdGZpcmluZ0xlbmd0aCA9IGxpc3QubGVuZ3RoO1xuXHRcdFx0XHRcdC8vIFdpdGggbWVtb3J5LCBpZiB3ZSdyZSBub3QgZmlyaW5nIHRoZW5cblx0XHRcdFx0XHQvLyB3ZSBzaG91bGQgY2FsbCByaWdodCBhd2F5XG5cdFx0XHRcdFx0fSBlbHNlIGlmICggbWVtb3J5ICkge1xuXHRcdFx0XHRcdFx0ZmlyaW5nU3RhcnQgPSBzdGFydDtcblx0XHRcdFx0XHRcdGZpcmUoIG1lbW9yeSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH0sXG5cdFx0XHQvLyBSZW1vdmUgYSBjYWxsYmFjayBmcm9tIHRoZSBsaXN0XG5cdFx0XHRyZW1vdmU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAoIGxpc3QgKSB7XG5cdFx0XHRcdFx0alF1ZXJ5LmVhY2goIGFyZ3VtZW50cywgZnVuY3Rpb24oIF8sIGFyZyApIHtcblx0XHRcdFx0XHRcdHZhciBpbmRleDtcblx0XHRcdFx0XHRcdHdoaWxlKCAoIGluZGV4ID0galF1ZXJ5LmluQXJyYXkoIGFyZywgbGlzdCwgaW5kZXggKSApID4gLTEgKSB7XG5cdFx0XHRcdFx0XHRcdGxpc3Quc3BsaWNlKCBpbmRleCwgMSApO1xuXHRcdFx0XHRcdFx0XHQvLyBIYW5kbGUgZmlyaW5nIGluZGV4ZXNcblx0XHRcdFx0XHRcdFx0aWYgKCBmaXJpbmcgKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCBpbmRleCA8PSBmaXJpbmdMZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRmaXJpbmdMZW5ndGgtLTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCBpbmRleCA8PSBmaXJpbmdJbmRleCApIHtcblx0XHRcdFx0XHRcdFx0XHRcdGZpcmluZ0luZGV4LS07XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gQ29udHJvbCBpZiBhIGdpdmVuIGNhbGxiYWNrIGlzIGluIHRoZSBsaXN0XG5cdFx0XHRoYXM6IGZ1bmN0aW9uKCBmbiApIHtcblx0XHRcdFx0cmV0dXJuIGpRdWVyeS5pbkFycmF5KCBmbiwgbGlzdCApID4gLTE7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gUmVtb3ZlIGFsbCBjYWxsYmFja3MgZnJvbSB0aGUgbGlzdFxuXHRcdFx0ZW1wdHk6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRsaXN0ID0gW107XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fSxcblx0XHRcdC8vIEhhdmUgdGhlIGxpc3QgZG8gbm90aGluZyBhbnltb3JlXG5cdFx0XHRkaXNhYmxlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0bGlzdCA9IHN0YWNrID0gbWVtb3J5ID0gdW5kZWZpbmVkO1xuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH0sXG5cdFx0XHQvLyBJcyBpdCBkaXNhYmxlZD9cblx0XHRcdGRpc2FibGVkOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuICFsaXN0O1xuXHRcdFx0fSxcblx0XHRcdC8vIExvY2sgdGhlIGxpc3QgaW4gaXRzIGN1cnJlbnQgc3RhdGVcblx0XHRcdGxvY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRzdGFjayA9IHVuZGVmaW5lZDtcblx0XHRcdFx0aWYgKCAhbWVtb3J5ICkge1xuXHRcdFx0XHRcdHNlbGYuZGlzYWJsZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fSxcblx0XHRcdC8vIElzIGl0IGxvY2tlZD9cblx0XHRcdGxvY2tlZDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiAhc3RhY2s7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gQ2FsbCBhbGwgY2FsbGJhY2tzIHdpdGggdGhlIGdpdmVuIGNvbnRleHQgYW5kIGFyZ3VtZW50c1xuXHRcdFx0ZmlyZVdpdGg6IGZ1bmN0aW9uKCBjb250ZXh0LCBhcmdzICkge1xuXHRcdFx0XHRhcmdzID0gYXJncyB8fCBbXTtcblx0XHRcdFx0YXJncyA9IFsgY29udGV4dCwgYXJncy5zbGljZSA/IGFyZ3Muc2xpY2UoKSA6IGFyZ3MgXTtcblx0XHRcdFx0aWYgKCBsaXN0ICYmICggIWZpcmVkIHx8IHN0YWNrICkgKSB7XG5cdFx0XHRcdFx0aWYgKCBmaXJpbmcgKSB7XG5cdFx0XHRcdFx0XHRzdGFjay5wdXNoKCBhcmdzICk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGZpcmUoIGFyZ3MgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gQ2FsbCBhbGwgdGhlIGNhbGxiYWNrcyB3aXRoIHRoZSBnaXZlbiBhcmd1bWVudHNcblx0XHRcdGZpcmU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRzZWxmLmZpcmVXaXRoKCB0aGlzLCBhcmd1bWVudHMgKTtcblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gVG8ga25vdyBpZiB0aGUgY2FsbGJhY2tzIGhhdmUgYWxyZWFkeSBiZWVuIGNhbGxlZCBhdCBsZWFzdCBvbmNlXG5cdFx0XHRmaXJlZDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiAhIWZpcmVkO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0cmV0dXJuIHNlbGY7XG59O1xuXG4iLCIvKipcbiogalF1ZXJ5IGNvcmUgb2JqZWN0LlxuKlxuKiBXb3JrZXIgd2l0aCBqUXVlcnkgZGVmZXJyZWRcbipcbiogQ29kZSBmcm9tOiBodHRwczovL2dpdGh1Yi5jb20vanF1ZXJ5L2pxdWVyeS9ibG9iL21hc3Rlci9zcmMvY29yZS5qc1xuKlxuKi9cblxudmFyIGpRdWVyeSA9IG1vZHVsZS5leHBvcnRzID0ge1xuXHR0eXBlOiB0eXBlXG5cdCwgaXNBcnJheTogaXNBcnJheVxuXHQsIGlzRnVuY3Rpb246IGlzRnVuY3Rpb25cblx0LCBpc1BsYWluT2JqZWN0OiBpc1BsYWluT2JqZWN0XG5cdCwgZWFjaDogZWFjaFxuXHQsIGV4dGVuZDogZXh0ZW5kXG5cdCwgbm9vcDogZnVuY3Rpb24oKSB7fVxufTtcblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxudmFyIGNsYXNzMnR5cGUgPSB7fTtcbi8vIFBvcHVsYXRlIHRoZSBjbGFzczJ0eXBlIG1hcFxuXCJCb29sZWFuIE51bWJlciBTdHJpbmcgRnVuY3Rpb24gQXJyYXkgRGF0ZSBSZWdFeHAgT2JqZWN0XCIuc3BsaXQoXCIgXCIpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuXHRjbGFzczJ0eXBlWyBcIltvYmplY3QgXCIgKyBuYW1lICsgXCJdXCIgXSA9IG5hbWUudG9Mb3dlckNhc2UoKTtcbn0pO1xuXG5cbmZ1bmN0aW9uIHR5cGUoIG9iaiApIHtcblx0cmV0dXJuIG9iaiA9PSBudWxsID9cblx0XHRTdHJpbmcoIG9iaiApIDpcblx0XHRcdGNsYXNzMnR5cGVbIHRvU3RyaW5nLmNhbGwob2JqKSBdIHx8IFwib2JqZWN0XCI7XG59XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oIG9iaiApIHtcblx0cmV0dXJuIGpRdWVyeS50eXBlKG9iaikgPT09IFwiZnVuY3Rpb25cIjtcbn1cblxuZnVuY3Rpb24gaXNBcnJheSggb2JqICkge1xuXHRyZXR1cm4galF1ZXJ5LnR5cGUob2JqKSA9PT0gXCJhcnJheVwiO1xufVxuXG5mdW5jdGlvbiBlYWNoKCBvYmplY3QsIGNhbGxiYWNrLCBhcmdzICkge1xuXHR2YXIgbmFtZSwgaSA9IDAsXG5cdGxlbmd0aCA9IG9iamVjdC5sZW5ndGgsXG5cdGlzT2JqID0gbGVuZ3RoID09PSB1bmRlZmluZWQgfHwgaXNGdW5jdGlvbiggb2JqZWN0ICk7XG5cblx0aWYgKCBhcmdzICkge1xuXHRcdGlmICggaXNPYmogKSB7XG5cdFx0XHRmb3IgKCBuYW1lIGluIG9iamVjdCApIHtcblx0XHRcdFx0aWYgKCBjYWxsYmFjay5hcHBseSggb2JqZWN0WyBuYW1lIF0sIGFyZ3MgKSA9PT0gZmFsc2UgKSB7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0Zm9yICggOyBpIDwgbGVuZ3RoOyApIHtcblx0XHRcdFx0aWYgKCBjYWxsYmFjay5hcHBseSggb2JqZWN0WyBpKysgXSwgYXJncyApID09PSBmYWxzZSApIHtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIEEgc3BlY2lhbCwgZmFzdCwgY2FzZSBmb3IgdGhlIG1vc3QgY29tbW9uIHVzZSBvZiBlYWNoXG5cdH0gZWxzZSB7XG5cdFx0aWYgKCBpc09iaiApIHtcblx0XHRcdGZvciAoIG5hbWUgaW4gb2JqZWN0ICkge1xuXHRcdFx0XHRpZiAoIGNhbGxiYWNrLmNhbGwoIG9iamVjdFsgbmFtZSBdLCBuYW1lLCBvYmplY3RbIG5hbWUgXSApID09PSBmYWxzZSApIHtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRmb3IgKCA7IGkgPCBsZW5ndGg7ICkge1xuXHRcdFx0XHRpZiAoIGNhbGxiYWNrLmNhbGwoIG9iamVjdFsgaSBdLCBpLCBvYmplY3RbIGkrKyBdICkgPT09IGZhbHNlICkge1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIG9iamVjdDtcbn1cblxuZnVuY3Rpb24gaXNQbGFpbk9iamVjdCggb2JqICkge1xuXHQvLyBNdXN0IGJlIGFuIE9iamVjdC5cblx0aWYgKCAhb2JqIHx8IGpRdWVyeS50eXBlKG9iaikgIT09IFwib2JqZWN0XCIgKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cdHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBleHRlbmQoKSB7XG5cdHZhciBvcHRpb25zLCBuYW1lLCBzcmMsIGNvcHksIGNvcHlJc0FycmF5LCBjbG9uZSxcblx0dGFyZ2V0ID0gYXJndW1lbnRzWzBdIHx8IHt9LFxuXHRpID0gMSxcblx0bGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCxcblx0ZGVlcCA9IGZhbHNlO1xuXG5cdC8vIEhhbmRsZSBhIGRlZXAgY29weSBzaXR1YXRpb25cblx0aWYgKCB0eXBlb2YgdGFyZ2V0ID09PSBcImJvb2xlYW5cIiApIHtcblx0XHRkZWVwID0gdGFyZ2V0O1xuXHRcdHRhcmdldCA9IGFyZ3VtZW50c1sxXSB8fCB7fTtcblx0XHQvLyBza2lwIHRoZSBib29sZWFuIGFuZCB0aGUgdGFyZ2V0XG5cdFx0aSA9IDI7XG5cdH1cblxuXHQvLyBIYW5kbGUgY2FzZSB3aGVuIHRhcmdldCBpcyBhIHN0cmluZyBvciBzb21ldGhpbmcgKHBvc3NpYmxlIGluIGRlZXAgY29weSlcblx0aWYgKCB0eXBlb2YgdGFyZ2V0ICE9PSBcIm9iamVjdFwiICYmICFqUXVlcnkuaXNGdW5jdGlvbih0YXJnZXQpICkge1xuXHRcdHRhcmdldCA9IHt9O1xuXHR9XG5cblx0Ly8gZXh0ZW5kIGpRdWVyeSBpdHNlbGYgaWYgb25seSBvbmUgYXJndW1lbnQgaXMgcGFzc2VkXG5cdGlmICggbGVuZ3RoID09PSBpICkge1xuXHRcdHRhcmdldCA9IHRoaXM7XG5cdFx0LS1pO1xuXHR9XG5cblx0Zm9yICggOyBpIDwgbGVuZ3RoOyBpKysgKSB7XG5cdFx0Ly8gT25seSBkZWFsIHdpdGggbm9uLW51bGwvdW5kZWZpbmVkIHZhbHVlc1xuXHRcdGlmICggKG9wdGlvbnMgPSBhcmd1bWVudHNbIGkgXSkgIT0gbnVsbCApIHtcblx0XHRcdC8vIEV4dGVuZCB0aGUgYmFzZSBvYmplY3Rcblx0XHRcdGZvciAoIG5hbWUgaW4gb3B0aW9ucyApIHtcblx0XHRcdFx0c3JjID0gdGFyZ2V0WyBuYW1lIF07XG5cdFx0XHRcdGNvcHkgPSBvcHRpb25zWyBuYW1lIF07XG5cblx0XHRcdFx0Ly8gUHJldmVudCBuZXZlci1lbmRpbmcgbG9vcFxuXHRcdFx0XHRpZiAoIHRhcmdldCA9PT0gY29weSApIHtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFJlY3Vyc2UgaWYgd2UncmUgbWVyZ2luZyBwbGFpbiBvYmplY3RzIG9yIGFycmF5c1xuXHRcdFx0XHRpZiAoIGRlZXAgJiYgY29weSAmJiAoIGpRdWVyeS5pc1BsYWluT2JqZWN0KGNvcHkpIHx8IChjb3B5SXNBcnJheSA9IGpRdWVyeS5pc0FycmF5KGNvcHkpKSApICkge1xuXHRcdFx0XHRcdGlmICggY29weUlzQXJyYXkgKSB7XG5cdFx0XHRcdFx0XHRjb3B5SXNBcnJheSA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0Y2xvbmUgPSBzcmMgJiYgalF1ZXJ5LmlzQXJyYXkoc3JjKSA/IHNyYyA6IFtdO1xuXG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGNsb25lID0gc3JjICYmIGpRdWVyeS5pc1BsYWluT2JqZWN0KHNyYykgPyBzcmMgOiB7fTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBOZXZlciBtb3ZlIG9yaWdpbmFsIG9iamVjdHMsIGNsb25lIHRoZW1cblx0XHRcdFx0XHR0YXJnZXRbIG5hbWUgXSA9IGpRdWVyeS5leHRlbmQoIGRlZXAsIGNsb25lLCBjb3B5ICk7XG5cblx0XHRcdFx0XHQvLyBEb24ndCBicmluZyBpbiB1bmRlZmluZWQgdmFsdWVzXG5cdFx0XHRcdH0gZWxzZSBpZiAoIGNvcHkgIT09IHVuZGVmaW5lZCApIHtcblx0XHRcdFx0XHR0YXJnZXRbIG5hbWUgXSA9IGNvcHk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvLyBSZXR1cm4gdGhlIG1vZGlmaWVkIG9iamVjdFxuXHRyZXR1cm4gdGFyZ2V0O1xufTtcblxuXG4iLCJcbi8qIVxuKiBqcXVlcnktZGVmZXJyZWRcbiogQ29weXJpZ2h0KGMpIDIwMTEgSGlkZGVuIDx6emRoaWRkZW5AZ21haWwuY29tPlxuKiBNSVQgTGljZW5zZWRcbiovXG5cbi8qKlxuKiBMaWJyYXJ5IHZlcnNpb24uXG4qL1xuXG52YXIgalF1ZXJ5ID0gbW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9qcXVlcnktY2FsbGJhY2tzLmpzXCIpLFxuXHRjb3JlX3NsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xuXG4vKipcbiogalF1ZXJ5IGRlZmVycmVkXG4qXG4qIENvZGUgZnJvbTogaHR0cHM6Ly9naXRodWIuY29tL2pxdWVyeS9qcXVlcnkvYmxvYi9tYXN0ZXIvc3JjL2RlZmVycmVkLmpzXG4qIERvYzogaHR0cDovL2FwaS5qcXVlcnkuY29tL2NhdGVnb3J5L2RlZmVycmVkLW9iamVjdC9cbipcbiovXG5cbmpRdWVyeS5leHRlbmQoe1xuXG5cdERlZmVycmVkOiBmdW5jdGlvbiggZnVuYyApIHtcblx0XHR2YXIgdHVwbGVzID0gW1xuXHRcdFx0XHQvLyBhY3Rpb24sIGFkZCBsaXN0ZW5lciwgbGlzdGVuZXIgbGlzdCwgZmluYWwgc3RhdGVcblx0XHRcdFx0WyBcInJlc29sdmVcIiwgXCJkb25lXCIsIGpRdWVyeS5DYWxsYmFja3MoXCJvbmNlIG1lbW9yeVwiKSwgXCJyZXNvbHZlZFwiIF0sXG5cdFx0XHRcdFsgXCJyZWplY3RcIiwgXCJmYWlsXCIsIGpRdWVyeS5DYWxsYmFja3MoXCJvbmNlIG1lbW9yeVwiKSwgXCJyZWplY3RlZFwiIF0sXG5cdFx0XHRcdFsgXCJub3RpZnlcIiwgXCJwcm9ncmVzc1wiLCBqUXVlcnkuQ2FsbGJhY2tzKFwibWVtb3J5XCIpIF1cblx0XHRcdF0sXG5cdFx0XHRzdGF0ZSA9IFwicGVuZGluZ1wiLFxuXHRcdFx0cHJvbWlzZSA9IHtcblx0XHRcdFx0c3RhdGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBzdGF0ZTtcblx0XHRcdFx0fSxcblx0XHRcdFx0YWx3YXlzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRkZWZlcnJlZC5kb25lKCBhcmd1bWVudHMgKS5mYWlsKCBhcmd1bWVudHMgKTtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdFx0fSxcblx0XHRcdFx0dGhlbjogZnVuY3Rpb24oIC8qIGZuRG9uZSwgZm5GYWlsLCBmblByb2dyZXNzICovICkge1xuXHRcdFx0XHRcdHZhciBmbnMgPSBhcmd1bWVudHM7XG5cdFx0XHRcdFx0cmV0dXJuIGpRdWVyeS5EZWZlcnJlZChmdW5jdGlvbiggbmV3RGVmZXIgKSB7XG5cdFx0XHRcdFx0XHRqUXVlcnkuZWFjaCggdHVwbGVzLCBmdW5jdGlvbiggaSwgdHVwbGUgKSB7XG5cdFx0XHRcdFx0XHRcdHZhciBhY3Rpb24gPSB0dXBsZVsgMCBdLFxuXHRcdFx0XHRcdFx0XHRcdGZuID0gZm5zWyBpIF07XG5cdFx0XHRcdFx0XHRcdC8vIGRlZmVycmVkWyBkb25lIHwgZmFpbCB8IHByb2dyZXNzIF0gZm9yIGZvcndhcmRpbmcgYWN0aW9ucyB0byBuZXdEZWZlclxuXHRcdFx0XHRcdFx0XHRkZWZlcnJlZFsgdHVwbGVbMV0gXSggalF1ZXJ5LmlzRnVuY3Rpb24oIGZuICkgP1xuXHRcdFx0XHRcdFx0XHRcdGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0dmFyIHJldHVybmVkID0gZm4uYXBwbHkoIHRoaXMsIGFyZ3VtZW50cyApO1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKCByZXR1cm5lZCAmJiBqUXVlcnkuaXNGdW5jdGlvbiggcmV0dXJuZWQucHJvbWlzZSApICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm5lZC5wcm9taXNlKClcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQuZG9uZSggbmV3RGVmZXIucmVzb2x2ZSApXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0LmZhaWwoIG5ld0RlZmVyLnJlamVjdCApXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0LnByb2dyZXNzKCBuZXdEZWZlci5ub3RpZnkgKTtcblx0XHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdG5ld0RlZmVyWyBhY3Rpb24gKyBcIldpdGhcIiBdKCB0aGlzID09PSBkZWZlcnJlZCA/IG5ld0RlZmVyIDogdGhpcywgWyByZXR1cm5lZCBdICk7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fSA6XG5cdFx0XHRcdFx0XHRcdFx0bmV3RGVmZXJbIGFjdGlvbiBdXG5cdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdGZucyA9IG51bGw7XG5cdFx0XHRcdFx0fSkucHJvbWlzZSgpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHQvLyBHZXQgYSBwcm9taXNlIGZvciB0aGlzIGRlZmVycmVkXG5cdFx0XHRcdC8vIElmIG9iaiBpcyBwcm92aWRlZCwgdGhlIHByb21pc2UgYXNwZWN0IGlzIGFkZGVkIHRvIHRoZSBvYmplY3Rcblx0XHRcdFx0cHJvbWlzZTogZnVuY3Rpb24oIG9iaiApIHtcblx0XHRcdFx0XHRyZXR1cm4gb2JqICE9IG51bGwgPyBqUXVlcnkuZXh0ZW5kKCBvYmosIHByb21pc2UgKSA6IHByb21pc2U7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRkZWZlcnJlZCA9IHt9O1xuXG5cdFx0Ly8gS2VlcCBwaXBlIGZvciBiYWNrLWNvbXBhdFxuXHRcdHByb21pc2UucGlwZSA9IHByb21pc2UudGhlbjtcblxuXHRcdC8vIEFkZCBsaXN0LXNwZWNpZmljIG1ldGhvZHNcblx0XHRqUXVlcnkuZWFjaCggdHVwbGVzLCBmdW5jdGlvbiggaSwgdHVwbGUgKSB7XG5cdFx0XHR2YXIgbGlzdCA9IHR1cGxlWyAyIF0sXG5cdFx0XHRcdHN0YXRlU3RyaW5nID0gdHVwbGVbIDMgXTtcblxuXHRcdFx0Ly8gcHJvbWlzZVsgZG9uZSB8IGZhaWwgfCBwcm9ncmVzcyBdID0gbGlzdC5hZGRcblx0XHRcdHByb21pc2VbIHR1cGxlWzFdIF0gPSBsaXN0LmFkZDtcblxuXHRcdFx0Ly8gSGFuZGxlIHN0YXRlXG5cdFx0XHRpZiAoIHN0YXRlU3RyaW5nICkge1xuXHRcdFx0XHRsaXN0LmFkZChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvLyBzdGF0ZSA9IFsgcmVzb2x2ZWQgfCByZWplY3RlZCBdXG5cdFx0XHRcdFx0c3RhdGUgPSBzdGF0ZVN0cmluZztcblxuXHRcdFx0XHQvLyBbIHJlamVjdF9saXN0IHwgcmVzb2x2ZV9saXN0IF0uZGlzYWJsZTsgcHJvZ3Jlc3NfbGlzdC5sb2NrXG5cdFx0XHRcdH0sIHR1cGxlc1sgaSBeIDEgXVsgMiBdLmRpc2FibGUsIHR1cGxlc1sgMiBdWyAyIF0ubG9jayApO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBkZWZlcnJlZFsgcmVzb2x2ZSB8IHJlamVjdCB8IG5vdGlmeSBdID0gbGlzdC5maXJlXG5cdFx0XHRkZWZlcnJlZFsgdHVwbGVbMF0gXSA9IGxpc3QuZmlyZTtcblx0XHRcdGRlZmVycmVkWyB0dXBsZVswXSArIFwiV2l0aFwiIF0gPSBsaXN0LmZpcmVXaXRoO1xuXHRcdH0pO1xuXG5cdFx0Ly8gTWFrZSB0aGUgZGVmZXJyZWQgYSBwcm9taXNlXG5cdFx0cHJvbWlzZS5wcm9taXNlKCBkZWZlcnJlZCApO1xuXG5cdFx0Ly8gQ2FsbCBnaXZlbiBmdW5jIGlmIGFueVxuXHRcdGlmICggZnVuYyApIHtcblx0XHRcdGZ1bmMuY2FsbCggZGVmZXJyZWQsIGRlZmVycmVkICk7XG5cdFx0fVxuXG5cdFx0Ly8gQWxsIGRvbmUhXG5cdFx0cmV0dXJuIGRlZmVycmVkO1xuXHR9LFxuXG5cdC8vIERlZmVycmVkIGhlbHBlclxuXHR3aGVuOiBmdW5jdGlvbiggc3Vib3JkaW5hdGUgLyogLCAuLi4sIHN1Ym9yZGluYXRlTiAqLyApIHtcblx0XHR2YXIgaSA9IDAsXG5cdFx0XHRyZXNvbHZlVmFsdWVzID0gY29yZV9zbGljZS5jYWxsKCBhcmd1bWVudHMgKSxcblx0XHRcdGxlbmd0aCA9IHJlc29sdmVWYWx1ZXMubGVuZ3RoLFxuXG5cdFx0XHQvLyB0aGUgY291bnQgb2YgdW5jb21wbGV0ZWQgc3Vib3JkaW5hdGVzXG5cdFx0XHRyZW1haW5pbmcgPSBsZW5ndGggIT09IDEgfHwgKCBzdWJvcmRpbmF0ZSAmJiBqUXVlcnkuaXNGdW5jdGlvbiggc3Vib3JkaW5hdGUucHJvbWlzZSApICkgPyBsZW5ndGggOiAwLFxuXG5cdFx0XHQvLyB0aGUgbWFzdGVyIERlZmVycmVkLiBJZiByZXNvbHZlVmFsdWVzIGNvbnNpc3Qgb2Ygb25seSBhIHNpbmdsZSBEZWZlcnJlZCwganVzdCB1c2UgdGhhdC5cblx0XHRcdGRlZmVycmVkID0gcmVtYWluaW5nID09PSAxID8gc3Vib3JkaW5hdGUgOiBqUXVlcnkuRGVmZXJyZWQoKSxcblxuXHRcdFx0Ly8gVXBkYXRlIGZ1bmN0aW9uIGZvciBib3RoIHJlc29sdmUgYW5kIHByb2dyZXNzIHZhbHVlc1xuXHRcdFx0dXBkYXRlRnVuYyA9IGZ1bmN0aW9uKCBpLCBjb250ZXh0cywgdmFsdWVzICkge1xuXHRcdFx0XHRyZXR1cm4gZnVuY3Rpb24oIHZhbHVlICkge1xuXHRcdFx0XHRcdGNvbnRleHRzWyBpIF0gPSB0aGlzO1xuXHRcdFx0XHRcdHZhbHVlc1sgaSBdID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBjb3JlX3NsaWNlLmNhbGwoIGFyZ3VtZW50cyApIDogdmFsdWU7XG5cdFx0XHRcdFx0aWYoIHZhbHVlcyA9PT0gcHJvZ3Jlc3NWYWx1ZXMgKSB7XG5cdFx0XHRcdFx0XHRkZWZlcnJlZC5ub3RpZnlXaXRoKCBjb250ZXh0cywgdmFsdWVzICk7XG5cdFx0XHRcdFx0fSBlbHNlIGlmICggISggLS1yZW1haW5pbmcgKSApIHtcblx0XHRcdFx0XHRcdGRlZmVycmVkLnJlc29sdmVXaXRoKCBjb250ZXh0cywgdmFsdWVzICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXHRcdFx0fSxcblxuXHRcdFx0cHJvZ3Jlc3NWYWx1ZXMsIHByb2dyZXNzQ29udGV4dHMsIHJlc29sdmVDb250ZXh0cztcblxuXHRcdC8vIGFkZCBsaXN0ZW5lcnMgdG8gRGVmZXJyZWQgc3Vib3JkaW5hdGVzOyB0cmVhdCBvdGhlcnMgYXMgcmVzb2x2ZWRcblx0XHRpZiAoIGxlbmd0aCA+IDEgKSB7XG5cdFx0XHRwcm9ncmVzc1ZhbHVlcyA9IG5ldyBBcnJheSggbGVuZ3RoICk7XG5cdFx0XHRwcm9ncmVzc0NvbnRleHRzID0gbmV3IEFycmF5KCBsZW5ndGggKTtcblx0XHRcdHJlc29sdmVDb250ZXh0cyA9IG5ldyBBcnJheSggbGVuZ3RoICk7XG5cdFx0XHRmb3IgKCA7IGkgPCBsZW5ndGg7IGkrKyApIHtcblx0XHRcdFx0aWYgKCByZXNvbHZlVmFsdWVzWyBpIF0gJiYgalF1ZXJ5LmlzRnVuY3Rpb24oIHJlc29sdmVWYWx1ZXNbIGkgXS5wcm9taXNlICkgKSB7XG5cdFx0XHRcdFx0cmVzb2x2ZVZhbHVlc1sgaSBdLnByb21pc2UoKVxuXHRcdFx0XHRcdFx0LmRvbmUoIHVwZGF0ZUZ1bmMoIGksIHJlc29sdmVDb250ZXh0cywgcmVzb2x2ZVZhbHVlcyApIClcblx0XHRcdFx0XHRcdC5mYWlsKCBkZWZlcnJlZC5yZWplY3QgKVxuXHRcdFx0XHRcdFx0LnByb2dyZXNzKCB1cGRhdGVGdW5jKCBpLCBwcm9ncmVzc0NvbnRleHRzLCBwcm9ncmVzc1ZhbHVlcyApICk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0LS1yZW1haW5pbmc7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBpZiB3ZSdyZSBub3Qgd2FpdGluZyBvbiBhbnl0aGluZywgcmVzb2x2ZSB0aGUgbWFzdGVyXG5cdFx0aWYgKCAhcmVtYWluaW5nICkge1xuXHRcdFx0ZGVmZXJyZWQucmVzb2x2ZVdpdGgoIHJlc29sdmVDb250ZXh0cywgcmVzb2x2ZVZhbHVlcyApO1xuXHRcdH1cblxuXHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG5cdH1cbn0pO1xuIl19
