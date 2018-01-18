var ContentSelector = require('./ContentSelector')
var jquery = require('jquery-deferred')
const debug = require('debug')('web-scraper-headless:content-script')

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
    debug('Send html', html)
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
      }, {$, document, window})
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
      }, {$, document, window})
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
