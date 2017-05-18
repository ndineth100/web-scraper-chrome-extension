const globals = require('./globals')
const jsdom = require('jsdom')
const jQuery = require('jquery')
beforeEach(function () {
  const {JSDOM} = jsdom
  const dom = new JSDOM()
  const $ = jQuery(dom.window)
  globals.window = dom.window
  globals.document = dom.window.document
  globals.$ = $
})
process.on('unhandledRejection', function (err) {
  console.error(err)
})
