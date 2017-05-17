const ChromePopupBrowser = require('../../extension/scripts/ChromePopupBrowser')
const Sitemap = require('../../extension/scripts/Sitemap')
const assert = require('chai').assert
const utils = require('./../utils')
const globals = require('../globals')
describe('Chrome popup browser', function () {
  let $
let document
let window
  beforeEach(function () {
    $ = globals.$
document = globals.document
window = globals.window

    window.chromeAPI.reset()
    document.body.innerHTML = utils.getTestHTML()
  })

  it('should init a popup window', function () {
    var browser = new ChromePopupBrowser({
      pageLoadDelay: 500
    })
    browser._initPopupWindow(function () {
    })
    assert.deepEqual(browser.tab, {id: 0})
  })

  it('should load a page', function (done) {
    var browser = new ChromePopupBrowser({
      pageLoadDelay: 500
    })
    browser._initPopupWindow(function () {
    })
    browser.loadUrl('http://example,com/', function () {
      done()
    })
  })

  it('should sendMessage to popup contentscript when data extraction is needed', function (done) {
    var sitemap = new Sitemap({
      selectors: [
        {
          id: 'a',
          selector: '#browserTest',
          type: 'SelectorText',
          multiple: false,
          parentSelectors: ['_root']
        }
      ]
    }, {$, document, window})

    var browser = new ChromePopupBrowser({
      pageLoadDelay: 500
    })
    browser._initPopupWindow(function () {
    })
    browser.fetchData('http://example,com/', sitemap, '_root', function (data) {
      assert.deepEqual(data, [
        {
          'a': 'a'
        }
      ])
      done()
    })
  })
})
