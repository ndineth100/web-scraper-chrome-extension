const globals = require('./globals')
const jsdom = require('jsdom')
const jQuery = require('jquery')
const Browser = require('./../extension/scripts/JSDOMBrowser')
beforeEach(function () {
  const {JSDOM} = jsdom
  const dom = new JSDOM()
  const $ = jQuery(dom.window)
  const window = dom.window
  const document = window.document
  globals.document = dom.window.document
  globals.window = dom.window
  globals.$ = $
  globals.Browser = Browser
  Browser.prototype.loadUrl = function (url, callback) {
    callback(null, {$, document, window})
  }
})
process.on('unhandledRejection', function (err) {
  console.error(err)
})
