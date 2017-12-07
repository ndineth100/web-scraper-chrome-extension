var DataExtractor = require('./../scripts/DataExtractor')
var getContentScript = require('./../scripts/getContentScript')
const debug = require('debug')('web-scraper-headless:content_scraper')
function extensionListener (request, sender, sendResponse, options) {
  var $ = options.$
  var document = options.document
  var window = options.window
  debug('chrome.runtime.onMessage', request)

  if (request.extractData) {
    debug('received data extraction request', request)
    var extractor = new DataExtractor(request, {$, window, document})
    var deferredData = extractor.getData()
    deferredData.done(function (data) {
      debug('dataextractor data', data)
      sendResponse(data)
    })
    return true
  } else if (request.previewSelectorData) {
    debug('received data-preview extraction request', request)
    var extractor = new DataExtractor(request, {$, document, window})
    var deferredData = extractor.getSingleSelectorData(request.parentSelectorIds, request.selectorId)
    deferredData.done(function (data) {
      debug('dataextractor data', data)
      sendResponse(data)
    })
    return true
  }
  // Universal ContentScript communication handler
  else if (request.contentScriptCall) {
    var contentScript = getContentScript('ContentScript')

    debug('received ContentScript request', request)

    var deferredResponse = contentScript[request.fn](request.request, {$, document, window})
    deferredResponse.done(function (response) {
      sendResponse(response)
    })

    return true
  }
}

module.exports = extensionListener
