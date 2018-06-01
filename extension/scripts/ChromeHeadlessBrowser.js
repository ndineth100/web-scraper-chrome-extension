const puppeteer = require('puppeteer')
const jQuery = require('jquery')
const url = require('url')
const contentScraper = require('../content_script/content_scraper')
const debug = require('debug')('web-scraper-headless:chrome-headless-browser')
const {ExecutionContext} = require('puppeteer/lib/ExecutionContext')
const {FrameManager} = require('puppeteer/lib/FrameManager')
const contentSraperBundler = require('../content_script/contentScraperHeadlessBundler')
class ChromeHeadlessBrowser {
  constructor (options) {
    this.pageLoadDelay = options.pageLoadDelay
    // constructors cannot handle asynchronous
    this.browserPromise = puppeteer.launch({
      headless: true
    })
    this.pagePromise = this.browserPromise.then(function (browser) {
      return browser.newPage()
    })
  }
  async loadUrl (url) {
    debug('Loading url', url)
    const page = await this.pagePromise
    await page.goto(url, {waitUntil: 'networkidle2'})
  }
  async close () {
    try {
      const browser = await this.browserPromise
      await browser.close()
    } catch (e) {
      console.error(e)
    }
  }
  saveImages (record, namingFunction) {

  }
  async fetchData (url, sitemap, parentSelectorId, callback, scope) {
    try {
      const page = await this.pagePromise
      await this.loadUrl(url)

      const mainFrame = page.mainFrame()

      // Maybe we don't need a context each time?
      const isolatedWorldInfo = await page._client.send('Page.createIsolatedWorld', {frameId: mainFrame._id, worldName: 'web-scraper-headless'})
      const executionContextId = isolatedWorldInfo.executionContextId
      const JsHandleFactory = page._frameManager.createJSHandle.bind(page._frameManager, executionContextId)

      const executionContext = new ExecutionContext(page._client, {id: executionContextId}, JsHandleFactory)

      const bundle = await contentSraperBundler.getBundle()
      await executionContext.evaluate(bundle)
      const message = {
        extractData: true,
        sitemap: JSON.parse(JSON.stringify(sitemap)),
        parentSelectorId: parentSelectorId
      }

      const data = await executionContext.evaluate(function (message) {
        return new Promise(function (resolve, reject) {
          window.webScraper(message, null, function (data) {
            resolve(data)
          })
        })
      }, message)
      console.log(data)
      callback.call(scope, null, data)
    } catch (e) {
      return callback(e)
    }
  }
}

module.exports = ChromeHeadlessBrowser
