const jsdom = require('jsdom')
const jQuery = require('jquery')
var jqueryDeferred = require('jquery-deferred')

const contentScraper = require('../content_script/content_scraper')
var whenCallSequentially = require('../assets/jquery.whencallsequentially')

var JSDOMBrowser = function (options, moreOptions) {
  this.pageLoadDelay = options.pageLoadDelay
  // Probably unneeded as we will create a new window each time
  var $ = moreOptions.$
  var document = moreOptions.document
  var window = moreOptions.window
  // We don't want enumerable properties
  Object.defineProperty(this, '$', {
    value: $,
    enumerable: false
  })
  Object.defineProperty(this, 'window', {
    value: window,
    enumerable: false
  })
  Object.defineProperty(this, 'document', {
    value: document,
    enumerable: false
  })
  if (!moreOptions.$) throw new Error('Missing jquery')
  if (!moreOptions.window) throw new Error('Missing window')
  if (!moreOptions.document) throw new Error('Missing document')
}

JSDOMBrowser.prototype = {
  loadUrl: function (url, callback) {
    const {JSDOM} = jsdom
    const browser = this
    JSDOM.fromURL(url)
      .then(function (dom) {
        const window = dom.window
        const document = window.document
        const $ = jQuery(dom.window)
        setTimeout(function () {
          callback(null, {$, document, window})
        }, browser.pageLoadDelay)
      }).catch(e => callback(e))
  },
  close: function () {

  },
  saveImages: function (record, namingFunction) {
    var deferredResponse = jqueryDeferred.Deferred()
    var deferredImageStoreCalls = []
    var prefixLength = '_imageBase64-'.length
    for (var attr in record) {
      if (attr.substr(0, prefixLength) === '_imageBase64-') {
        throw new Error('Downloading images is not yet supported')
      }
    }
    whenCallSequentially(deferredImageStoreCalls).done(function () {
      deferredResponse.resolve()
    })

    return deferredResponse.promise()
  },
  fetchData: function (url, sitemap, parentSelectorId, callback, scope) {
    const browser = this
    console.log('Init jsdom browser app')
    browser.loadUrl(url, function (err, {$, document, window}) {
      if (err) {
        return callback(err)
      }

      var message = {
        extractData: true,
        sitemap: JSON.parse(JSON.stringify(sitemap)),
        parentSelectorId: parentSelectorId
      }
      function sendResponse (data) {
        callback.call(scope, null, data)
      }
      contentScraper(message, null, sendResponse, {$, document, window})
    })
  }
}

module.exports = JSDOMBrowser
