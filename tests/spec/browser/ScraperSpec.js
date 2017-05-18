const Queue = require('./../../../extension/scripts/Queue')
const assert = require('chai').assert

const ChromePopupBrowser = require('./../../../extension/scripts/ChromePopupBrowser')
const Sitemap = require('./../../../extension/scripts/Sitemap')
const FakeStore = require('./../../FakeStore')
const Scraper = require('./../../../extension/scripts/Scraper')
const utils = require('./../../utils')
const globals = require('../../globals')

describe('Scraper', function () {
  var q, store, $el
  let $
  let document
  let window
  let Browser

  beforeEach(function () {
    $ = globals.$
    document = globals.document
    window = globals.window
    Browser = globals.Browser

    q = new Queue()
    store = new FakeStore()
    document.body.innerHTML = utils.getTestHTML()
  })
  afterEach(function () {
    while (document.body.firstChild) document.body.removeChild(document.body.firstChild)
  })

  it('should store images', function (done) {
    var record = {
      '_imageBase64-test': 'test',
      '_imageMimeType-test': 'test',
      'test-src': 'http://images/image.png'
    }

    var browser = new Browser({
      pageLoadDelay: 500
    }, {$, document, window})

    var sitemap = new Sitemap({
      id: 'test'
    }, {$, document, window})

    var scraper = new Scraper({
      sitemap: sitemap,
      browser: browser
    }, {$, document, window})

    var deferredSave = scraper.saveImages(record)
    var downloadAPICalled = false
    chrome.downloads.onChanged.addListener(function () {
      downloadAPICalled = true
    })
    assert.equal(downloadAPICalled, false)

    deferredSave.then(function () {
      assert.equal(record['_imageBase64-test'], undefined)
      assert.equal(record['_imageMimeType-test'], undefined)
      assert.equal(downloadAPICalled, true)
      done()
    })
      .then(null, function (e) {
        done(e)
      })
  })
})
