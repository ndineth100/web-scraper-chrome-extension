const Queue = require('./extension/scripts/Queue')
const Sitemap = require('./extension/scripts/Sitemap')
const InMemoryStore = require('./extension/scripts/InMemoryStore')
const Scraper = require('./extension/scripts/Scraper')
const jsdom = require('jsdom')
const jQuery = require('jquery')
const Browser = require('./extension/scripts/JSDOMBrowser')
const ChromeHeadlessBrowser = require('./extension/scripts/ChromeHeadlessBrowser')

module.exports = function (sitemap, options) {
  const type = options.type || 'jsdom'
  if (type !== 'jsdom') throw new Error('Not implemented')
  return scrapeJSDOM(sitemap, options)
}

function scrapeJSDOM (sitemapInfo, options = {}) {
  return new Promise(function (resolve, reject) {
    const {JSDOM} = jsdom
    const dom = new JSDOM()
    const window = dom.window
    const document = window.document
    const $ = jQuery(window)
    const q = new Queue()
    const store = new InMemoryStore()
    const sitemap = new Sitemap(sitemapInfo, {$, document, window})
    const browser = new Browser({
      pageLoadDelay: options.pageLoadDelay || 2000
    })
    const s = new Scraper({
      queue: q,
      sitemap,
      browser,
      store,
      delay: options.delay || 500
    }, {})
    s.run(function () {
      // TODO there should be some error handling here
      resolve(store.data)
    })
  })
}
