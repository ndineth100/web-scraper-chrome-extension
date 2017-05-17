var DataExtractor = require('./../scripts/DataExtractor')
var getContentScript = require('./../scripts/getContentScript')

function extensionListener (request, sender, sendResponse, options) {
  var $ = options.$
  var document = options.document
  var window = options.window
  console.log('chrome.runtime.onMessage', request)

  if (request.extractData) {
    console.log('received data extraction request', request)
    var extractor = new DataExtractor(request, {$})
    var deferredData = extractor.getData()
    deferredData.done(function (data) {
      console.log('dataextractor data', data)
      sendResponse(data)
    })
    return true
  } else if (request.previewSelectorData) {
    console.log('received data-preview extraction request', request)
    var extractor = new DataExtractor(request, {$, document, window})
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

    var deferredResponse = contentScript[request.fn](request.request, {$, document, window})
    deferredResponse.done(function (response) {
      sendResponse(response)
    })

    return true
  }
}

module.exports = extensionListener
