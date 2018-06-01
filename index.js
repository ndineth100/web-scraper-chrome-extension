const Queue = require('./extension/scripts/Queue')
const Sitemap = require('./extension/scripts/Sitemap')
const InMemoryStore = require('./extension/scripts/InMemoryStore')
const Scraper = require('./extension/scripts/Scraper')
const jsdom = require('jsdom')
const jQuery = require('jquery')
const JSDOMBrowser = require('./extension/scripts/JSDOMBrowser')
const ChromeHeadlessBrowser = require('./extension/scripts/ChromeHeadlessBrowser')
/**
 *
 * @param sitemap
 * @param options
 * @param options.type jsdom|headless
 * @param options.pageLoadDelay
 * @param options.delay
 * @return {*}
 */
module.exports = function (sitemap, options) {
  return scrape(sitemap, options)
}

function scrape (sitemapInfo, options = {}) {
  return new Promise(function (resolve, reject) {
    const {JSDOM} = jsdom
    const dom = new JSDOM()
    // sitemap is created twice, once in node another in the browser context.
    // In node we don't actually need these variables. We should probably not provide them
    const fakeWindow = dom.window
    const fakeDocument = window.document
    const fake$ = jQuery(window)
    const q = new Queue()
    const store = new InMemoryStore()
    const sitemap = new Sitemap(sitemapInfo, {$: fake$, document: fakeDocument, window: fakeWindow})

    let BrowserConstructor
    switch (options.type) {
      case 'jsdom':
        BrowserConstructor = JSDOMBrowser
        break
      case 'headless':
        BrowserConstructor = ChromeHeadlessBrowser
        break
      default:
        BrowserConstructor = JSDOMBrowser
    }
    const browser = new BrowserConstructor({
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
