const globals = require('./globals')
const $ = require('jquery')
const ChromePopupBrowser = require('../extension/scripts/ChromePopupBrowser')
beforeEach(function () {
  globals.window = window
  globals.document = document
  globals.$ = $
  globals.Browser = ChromePopupBrowser
  window.chromeAPI.reset()

  window.addEventListener('unhandledrejection', function (err, promise) {
    console.error('Unhandled error', err.reason)
  })
})
