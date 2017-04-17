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
