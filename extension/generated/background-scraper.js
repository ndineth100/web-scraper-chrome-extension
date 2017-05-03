(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.backgroundScraper = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var jquery = require('jquery-deferred')
/**
 * @url http://jsperf.com/blob-base64-conversion
 * @type {{blobToBase64: blobToBase64, base64ToBlob: base64ToBlob}}
 */
var Base64 = {

  blobToBase64: function (blob) {
    var deferredResponse = jquery.Deferred()
    var reader = new FileReader()
    reader.onload = function () {
      var dataUrl = reader.result
      var base64 = dataUrl.split(',')[1]
      deferredResponse.resolve(base64)
    }
    reader.readAsDataURL(blob)

    return deferredResponse.promise()
  },

  base64ToBlob: function (base64, mimeType) {
    var deferredResponse = jquery.Deferred()
    var binary = atob(base64)
    var len = binary.length
    var buffer = new ArrayBuffer(len)
    var view = new Uint8Array(buffer)
    for (var i = 0; i < len; i++) {
      view[i] = binary.charCodeAt(i)
    }
    var blob = new Blob([view], {type: mimeType})
    deferredResponse.resolve(blob)

    return deferredResponse.promise()
  }
}

module.exports = Base64

},{"jquery-deferred":30}],2:[function(require,module,exports){
var jquery = require('jquery-deferred')
/**
 * @author Martins Balodis
 *
 * An alternative version of $.when which can be used to execute asynchronous
 * calls sequentially one after another.
 *
 * @returns jqueryDeferred().promise()
 */
module.exports = function whenCallSequentially (functionCalls) {
  var deferredResonse = jquery.Deferred()
  var resultData = []

	// nothing to do
  if (functionCalls.length === 0) {
    return deferredResonse.resolve(resultData).promise()
  }

  var currentDeferred = functionCalls.shift()()
	// execute synchronous calls synchronously
  while (currentDeferred.state() === 'resolved') {
    currentDeferred.done(function (data) {
      resultData.push(data)
    })
    if (functionCalls.length === 0) {
      return deferredResonse.resolve(resultData).promise()
    }
    currentDeferred = functionCalls.shift()()
  }

	// handle async calls
  var interval = setInterval(function () {
		// handle mixed sync calls
    while (currentDeferred.state() === 'resolved') {
      currentDeferred.done(function (data) {
        resultData.push(data)
      })
      if (functionCalls.length === 0) {
        clearInterval(interval)
        deferredResonse.resolve(resultData)
        break
      }
      currentDeferred = functionCalls.shift()()
    }
  }, 10)

  return deferredResonse.promise()
}

},{"jquery-deferred":30}],3:[function(require,module,exports){
var Config = require('../scripts/Config')
var Store = require('../scripts/Store')
var Sitemap = require('../scripts/Sitemap')
var Queue = require('../scripts/Queue')
var Scraper = require('../scripts/Scraper')
var ChromePopupBrowser = require('../scripts/ChromePopupBrowser')
var getBackgroundScript = require('../scripts/getBackgroundScript')

var config = new Config()
var store
config.loadConfiguration(function () {
  console.log('initial configuration', config)
  store = new Store(config, {$})
})

chrome.storage.onChanged.addListener(function () {
  config.loadConfiguration(function () {
    console.log('configuration changed', config)
    store = new Store(config, {$})
  })
})

var sendToActiveTab = function (request, callback) {
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, function (tabs) {
    if (tabs.length < 1) {
      this.console.log("couldn't find active tab")
    } else {
      var tab = tabs[0]
      chrome.tabs.sendMessage(tab.id, request, callback)
    }
  })
}

chrome.runtime.onMessage.addListener(
	function (request, sender, sendResponse) {
  console.log('chrome.runtime.onMessage', request)

  if (request.createSitemap) {
    store.createSitemap(request.sitemap, sendResponse)
    return true
  } else if (request.saveSitemap) {
    store.saveSitemap(request.sitemap, sendResponse)
    return true
  } else if (request.deleteSitemap) {
    store.deleteSitemap(request.sitemap, sendResponse)
    return true
  } else if (request.getAllSitemaps) {
    store.getAllSitemaps(sendResponse)
    return true
  } else if (request.sitemapExists) {
    store.sitemapExists(request.sitemapId, sendResponse)
    return true
  } else if (request.getSitemapData) {
    store.getSitemapData(new Sitemap(request.sitemap), sendResponse)
    return true
  } else if (request.scrapeSitemap) {
    var sitemap = new Sitemap(request.sitemap, {$})
    var queue = new Queue()
    var browser = new ChromePopupBrowser({
      pageLoadDelay: request.pageLoadDelay
    })

    var scraper = new Scraper({
      queue: queue,
      sitemap: sitemap,
      browser: browser,
      store: store,
      requestInterval: request.requestInterval
    }, {$})

    try {
      scraper.run(function () {
        browser.close()
        var notification = chrome.notifications.create('scraping-finished', {
          type: 'basic',
          iconUrl: 'assets/images/icon128.png',
          title: 'Scraping finished!',
          message: 'Finished scraping ' + sitemap._id
        }, function (id) {
						// notification showed
        })
        sendResponse()
      })
    }			catch (e) {
      console.log('Scraper execution cancelled'.e)
    }

    return true
  } else if (request.previewSelectorData) {
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, function (tabs) {
      if (tabs.length < 1) {
        this.console.log("couldn't find active tab")
      } else {
        var tab = tabs[0]
        chrome.tabs.sendMessage(tab.id, request, sendResponse)
      }
    })
    return true
  } else if (request.backgroundScriptCall) {
    var backgroundScript = getBackgroundScript('BackgroundScript')
    var deferredResponse = backgroundScript[request.fn](request.request)
    deferredResponse.done(function (response) {
      sendResponse(response)
    })

    return true
  }
}
)

},{"../scripts/ChromePopupBrowser":5,"../scripts/Config":6,"../scripts/Queue":9,"../scripts/Scraper":10,"../scripts/Sitemap":25,"../scripts/Store":26,"../scripts/getBackgroundScript":28}],4:[function(require,module,exports){
var jquery = require('jquery-deferred')
/**
 * ContentScript that can be called from anywhere within the extension
 */
var BackgroundScript = {

  dummy: function () {
    return jquery.Deferred().resolve('dummy').promise()
  },

	/**
	 * Returns the id of the tab that is visible to user
	 * @returns jquery.Deferred() integer
	 */
  getActiveTabId: function () {
    var deferredResponse = jquery.Deferred()

    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, function (tabs) {
      if (tabs.length < 1) {
				// @TODO must be running within popup. maybe find another active window?
        deferredResponse.reject("couldn't find the active tab")
      } else {
        var tabId = tabs[0].id
        deferredResponse.resolve(tabId)
      }
    })
    return deferredResponse.promise()
  },

	/**
	 * Execute a function within the active tab within content script
	 * @param request.fn	function to call
	 * @param request.request	request that will be passed to the function
	 */
  executeContentScript: function (request) {
    var reqToContentScript = {
      contentScriptCall: true,
      fn: request.fn,
      request: request.request
    }
    var deferredResponse = jquery.Deferred()
    var deferredActiveTabId = this.getActiveTabId()
    deferredActiveTabId.done(function (tabId) {
      chrome.tabs.sendMessage(tabId, reqToContentScript, function (response) {
        deferredResponse.resolve(response)
      })
    })

    return deferredResponse
  }
}

module.exports = BackgroundScript

},{"jquery-deferred":30}],5:[function(require,module,exports){
var ChromePopupBrowser = function (options) {
  this.pageLoadDelay = options.pageLoadDelay

	// @TODO somehow handle the closed window
}

ChromePopupBrowser.prototype = {

  _initPopupWindow: function (callback, scope) {
    var browser = this
    if (this.window !== undefined) {
      console.log(JSON.stringify(this.window))
			// check if tab exists
      chrome.tabs.get(this.tab.id, function (tab) {
        if (!tab) {
          throw 'Scraping window closed'
        }
      })

      callback.call(scope)
      return
    }

    chrome.windows.create({'type': 'popup', width: 1042, height: 768, focused: true, url: 'chrome://newtab'}, function (window) {
      browser.window = window
      browser.tab = window.tabs[0]

      callback.call(scope)
    })
  },

  loadUrl: function (url, callback) {
    var tab = this.tab

    var tabLoadListener = function (tabId, changeInfo, tab) {
      if (tabId === this.tab.id) {
        if (changeInfo.status === 'complete') {
					// @TODO check url ? maybe it would be bad because some sites might use redirects

					// remove event listener
          chrome.tabs.onUpdated.removeListener(tabLoadListener)

					// callback tab is loaded after page load delay
          setTimeout(callback, this.pageLoadDelay)
        }
      }
    }.bind(this)
    chrome.tabs.onUpdated.addListener(tabLoadListener)

    chrome.tabs.update(tab.id, {url: url})
  },

  close: function () {
    chrome.windows.remove(this.window.id)
  },

  fetchData: function (url, sitemap, parentSelectorId, callback, scope) {
    var browser = this

    this._initPopupWindow(function () {
      var tab = browser.tab
      console.log('Init browser app')
      browser.loadUrl(url, function () {
        var message = {
          extractData: true,
          sitemap: JSON.parse(JSON.stringify(sitemap)),
          parentSelectorId: parentSelectorId
        }

        chrome.tabs.sendMessage(tab.id, message, function (data) {
          console.log('extracted data from web page', data)
          callback.call(scope, data)
        })
      })
    }, this)
  }
}

module.exports = ChromePopupBrowser

},{}],6:[function(require,module,exports){
var Config = function () {

}

Config.prototype = {

  sitemapDb: '<use loadConfiguration()>',
  dataDb: '<use loadConfiguration()>',

  defaults: {
    storageType: 'local',
		// this is where sitemap documents are stored
    sitemapDb: 'scraper-sitemaps',
		// this is where scraped data is stored.
		// empty for local storage
    dataDb: ''
  },

	/**
	 * Loads configuration from chrome extension sync storage
	 */
  loadConfiguration: function (callback) {
    chrome.storage.sync.get(['sitemapDb', 'dataDb', 'storageType'], function (items) {
      this.storageType = items.storageType || this.defaults.storageType
      if (this.storageType === 'local') {
        this.sitemapDb = this.defaults.sitemapDb
        this.dataDb = this.defaults.dataDb
      } else {
        this.sitemapDb = items.sitemapDb || this.defaults.sitemapDb
        this.dataDb = items.dataDb || this.defaults.dataDb
      }

      callback()
    }.bind(this))
  },

	/**
	 * Saves configuration to chrome extension sync storage
	 * @param {type} items
	 * @param {type} callback
	 * @returns {undefined}
	 */
  updateConfiguration: function (items, callback) {
    chrome.storage.sync.set(items, callback)
  }
}

module.exports = Config

},{}],7:[function(require,module,exports){
/**
 * Element selector. Uses jQuery as base and adds some more features
 * @param CSSSelector
 * @param parentElement
 * @param options
 */
var ElementQuery = function (CSSSelector, parentElement, options) {
  CSSSelector = CSSSelector || ''
  this.$ = options.$
  if (!this.$) throw new Error('Missing jquery for ElementQuery')
  var selectedElements = []

  var addElement = function (element) {
    if (selectedElements.indexOf(element) === -1) {
      selectedElements.push(element)
    }
  }

  var selectorParts = ElementQuery.getSelectorParts(CSSSelector)
  var self = this
  selectorParts.forEach(function (selector) {
		// handle special case when parent is selected
    if (selector === '_parent_') {
      self.$(parentElement).each(function (i, element) {
        addElement(element)
      })
    }		else {
      var elements = self.$(selector, self.$(parentElement))
      elements.each(function (i, element) {
        addElement(element)
      })
    }
  })

  return selectedElements
}

ElementQuery.getSelectorParts = function (CSSSelector) {
  var selectors = CSSSelector.split(/(,|".*?"|'.*?'|\(.*?\))/)

  var resultSelectors = []
  var currentSelector = ''
  selectors.forEach(function (selector) {
    if (selector === ',') {
      if (currentSelector.trim().length) {
        resultSelectors.push(currentSelector.trim())
      }
      currentSelector = ''
    }		else {
      currentSelector += selector
    }
  })
  if (currentSelector.trim().length) {
    resultSelectors.push(currentSelector.trim())
  }

  return resultSelectors
}

module.exports = ElementQuery

},{}],8:[function(require,module,exports){

var Job = function (url, parentSelector, scraper, parentJob, baseData) {
  if (parentJob !== undefined) {
    this.url = this.combineUrls(parentJob.url, url)
  } else {
    this.url = url
  }
  this.parentSelector = parentSelector
  this.scraper = scraper
  this.dataItems = []
  this.baseData = baseData || {}
}

Job.prototype = {

  combineUrls: function (parentUrl, childUrl) {
    var urlMatcher = new RegExp('(https?://)?([a-z0-9\\-\\.]+\\.[a-z0-9\\-]+(:\\d+)?|\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}(:\\d+)?)?(\\/[^\\?]*\\/|\\/)?([^\\?]*)?(\\?.*)?', 'i')

    var parentMatches = parentUrl.match(urlMatcher)
    var childMatches = childUrl.match(urlMatcher)

		// special case for urls like this: ?a=1  or like-this/
    if (childMatches[1] === undefined && childMatches[2] === undefined && childMatches[5] === undefined && childMatches[6] === undefined) {
      var url = parentMatches[1] + parentMatches[2] + parentMatches[5] + parentMatches[6] + childMatches[7]
      return url
    }

    if (childMatches[1] === undefined) {
      childMatches[1] = parentMatches[1]
    }
    if (childMatches[2] === undefined) {
      childMatches[2] = parentMatches[2]
    }
    if (childMatches[5] === undefined) {
      if (parentMatches[5] === undefined) {
        childMatches[5] = '/'
      } else {
        childMatches[5] = parentMatches[5]
      }
    }

    if (childMatches[6] === undefined) {
      childMatches[6] = ''
    }
    if (childMatches[7] === undefined) {
      childMatches[7] = ''
    }

    return childMatches[1] + childMatches[2] + childMatches[5] + childMatches[6] + childMatches[7]
  },

  execute: function (browser, callback, scope) {
    var sitemap = this.scraper.sitemap
    var job = this
    console.log('starting fetching')
    browser.fetchData(this.url, sitemap, this.parentSelector, function (results) {
      console.log('finished fetching')
			// merge data with data from initialization
      for (var i in results) {
        var result = results[i]
        for (var key in this.baseData) {
          if (!(key in result)) {
            result[key] = this.baseData[key]
          }
        }
        this.dataItems.push(result)
      }
      callback(job)
    }.bind(this), this)
  },
  getResults: function () {
    return this.dataItems
  }
}

module.exports = Job

},{}],9:[function(require,module,exports){

var Queue = function () {
  this.jobs = []
  this.scrapedUrls = {}
}

Queue.prototype = {

	/**
	 * Returns false if page is already scraped
	 * @param job
	 * @returns {boolean}
	 */
  add: function (job) {
    if (this.canBeAdded(job)) {
      this.jobs.push(job)
      this._setUrlScraped(job.url)
      return true
    }
    return false
  },

  canBeAdded: function (job) {
    if (this.isScraped(job.url)) {
      return false
    }

		// reject documents
    if (job.url.match(/\.(doc|docx|pdf|ppt|pptx|odt)$/i) !== null) {
      return false
    }
    return true
  },

  getQueueSize: function () {
    return this.jobs.length
  },

  isScraped: function (url) {
    return (this.scrapedUrls[url] !== undefined)
  },

  _setUrlScraped: function (url) {
    this.scrapedUrls[url] = true
  },

  getNextJob: function () {
		// @TODO test this
    if (this.getQueueSize() > 0) {
      return this.jobs.pop()
    } else {
      return false
    }
  }
}

module.exports = Queue

},{}],10:[function(require,module,exports){
var jquery = require('jquery-deferred')
var whenCallSequentially = require('../assets/jquery.whencallsequentially')
var Base64 = require('../assets/base64')
var Job = require('./Job')

var Scraper = function (options, moreOptions) {
  this.queue = options.queue
  this.sitemap = options.sitemap
  this.store = options.store
  this.browser = options.browser
  this.resultWriter = null // db instance for scraped data writing
  this.requestInterval = parseInt(options.requestInterval)
  this.pageLoadDelay = parseInt(options.pageLoadDelay)
  this.$ = moreOptions.$
  if (!moreOptions.$) throw new Error('Missing jquery')
}

Scraper.prototype = {

	/**
	 * Scraping delay between two page opening requests
	 */
  requestInterval: 2000,
  _timeNextScrapeAvailable: 0,

  initFirstJobs: function () {
    var urls = this.sitemap.getStartUrls()

    urls.forEach(function (url) {
      var firstJob = new Job(url, '_root', this)
      this.queue.add(firstJob)
    }.bind(this))
  },

  run: function (executionCallback) {
    var scraper = this

		// callback when scraping is finished
    this.executionCallback = executionCallback

    this.initFirstJobs()

    this.store.initSitemapDataDb(this.sitemap._id, function (resultWriter) {
      scraper.resultWriter = resultWriter
      scraper._run()
    })
  },

  recordCanHaveChildJobs: function (record) {
    if (record._follow === undefined) {
      return false
    }

    var selectorId = record._followSelectorId
    var childSelectors = this.sitemap.getDirectChildSelectors(selectorId)
    if (childSelectors.length === 0) {
      return false
    } else {
      return true
    }
  },

  getFileFilename: function (url) {
    var parts = url.split('/')
    var filename = parts[parts.length - 1]
    filename = filename.replace(/\?/g, '')
    if (filename.length > 130) {
      filename = filename.substr(0, 130)
    }
    return filename
  },

	/**
	 * Save images for user if the records contains them
	 * @param record
	 */
  saveImages: function (record) {
    var deferredResponse = jquery.Deferred()
    var deferredImageStoreCalls = []
    var prefixLength = '_imageBase64-'.length

    for (var attr in record) {
      if (attr.substr(0, prefixLength) === '_imageBase64-') {
        var selectorId = attr.substring(prefixLength, attr.length)
        deferredImageStoreCalls.push(function (selectorId) {
          var imageBase64 = record['_imageBase64-' + selectorId]
          var deferredDownloadDone = jquery.Deferred()

          var deferredBlob = Base64.base64ToBlob(imageBase64, record['_imageMimeType-' + selectorId])

          delete record['_imageMimeType-' + selectorId]
          delete record['_imageBase64-' + selectorId]

          deferredBlob.done(function (blob) {
            var downloadUrl = window.URL.createObjectURL(blob)
            var fileSavePath = this.sitemap._id + '/' + selectorId + '/' + this.getFileFilename(record[selectorId + '-src'])

						// download image using chrome api
            var downloadRequest = {
              url: downloadUrl,
              filename: fileSavePath
            }

						// wait for the download to finish
            chrome.downloads.download(downloadRequest, function (downloadId) {
              var cbDownloaded = function (downloadItem) {
                if (downloadItem.id === downloadId && downloadItem.state) {
                  if (downloadItem.state.current === 'complete') {
                    deferredDownloadDone.resolve()
                    chrome.downloads.onChanged.removeListener(cbDownloaded)
                  } else if (downloadItem.state.current === 'interrupted') {
                    deferredDownloadDone.reject('download failed')
                    chrome.downloads.onChanged.removeListener(cbDownloaded)
                  }
                }
              }

              chrome.downloads.onChanged.addListener(cbDownloaded)
            })
          }.bind(this))

          return deferredDownloadDone.promise()
        }.bind(this, selectorId))
      }
    }

    whenCallSequentially(deferredImageStoreCalls).done(function () {
      deferredResponse.resolve()
    })

    return deferredResponse.promise()
  },

	// @TODO remove recursion and add an iterative way to run these jobs.
  _run: function () {
    var job = this.queue.getNextJob()
    if (job === false) {
      console.log('Scraper execution is finished')
      this.browser.close()
      this.executionCallback()
      return
    }
    console.log('starting execute')
    job.execute(this.browser, function (job) {
      console.log('finished executing')
      var scrapedRecords = []
      var deferredDatamanipulations = []

      var records = job.getResults()
      records.forEach(function (record) {
				// var record = JSON.parse(JSON.stringify(rec));

        deferredDatamanipulations.push(this.saveImages.bind(this, record))

				// @TODO refactor job exstraction to a seperate method
        if (this.recordCanHaveChildJobs(record)) {
          var followSelectorId = record._followSelectorId
          var followURL = record['_follow']
          delete record['_follow']
          delete record['_followSelectorId']
          var newJob = new Job(followURL, followSelectorId, this, job, record)
          if (this.queue.canBeAdded(newJob)) {
            this.queue.add(newJob)
          } else {
            // store already scraped links
            console.log('Ignoring next')
            console.log(record)
//						scrapedRecords.push(record);
          }
        } else {
          if (record._follow !== undefined) {
            delete record['_follow']
            delete record['_followSelectorId']
          }
          scrapedRecords.push(record)
        }
      }.bind(this))

      whenCallSequentially(deferredDatamanipulations).done(function () {
        this.resultWriter.writeDocs(scrapedRecords, function () {
          var now = (new Date()).getTime()
					// delay next job if needed
          this._timeNextScrapeAvailable = now + this.requestInterval
          if (now >= this._timeNextScrapeAvailable) {
            this._run()
          } else {
            var delay = this._timeNextScrapeAvailable - now
            setTimeout(function () {
              this._run()
            }.bind(this), delay)
          }
        }.bind(this))
      }.bind(this))
    }.bind(this))
  }
}

module.exports = Scraper

},{"../assets/base64":1,"../assets/jquery.whencallsequentially":2,"./Job":8,"jquery-deferred":30}],11:[function(require,module,exports){
var selectors = require('./Selectors')
var ElementQuery = require('./ElementQuery')
var jquery = require('jquery-deferred')

var Selector = function (selector, options) {
  this.$ = options.$
  if (!options.$) throw new Error('Missing jquery')

  this.updateData(selector)
  this.initType()
}

Selector.prototype = {

	/**
	 * Is this selector configured to return multiple items?
	 * @returns {boolean}
	 */
  willReturnMultipleRecords: function () {
    return this.canReturnMultipleRecords() && this.multiple
  },

	/**
	 * Update current selector configuration
	 * @param data
	 */
  updateData: function (data) {
    var allowedKeys = ['id', 'type', 'selector', 'parentSelectors']
    console.log('data type', data.type)
    allowedKeys = allowedKeys.concat(selectors[data.type].getFeatures())
    var key
		// update data
    for (key in data) {
      if (allowedKeys.indexOf(key) !== -1 || typeof data[key] === 'function') {
        this[key] = data[key]
      }
    }

		// remove values that are not needed for this type of selector
    for (key in this) {
      if (allowedKeys.indexOf(key) === -1 && typeof this[key] !== 'function') {
        delete this[key]
      }
    }
  },

	/**
	 * CSS selector which will be used for element selection
	 * @returns {string}
	 */
  getItemCSSSelector: function () {
    return '*'
  },

	/**
	 * override objects methods based on seletor type
	 */
  initType: function () {
    if (selectors[this.type] === undefined) {
      throw new Error('Selector type not defined ' + this.type)
    }

		// overrides objects methods
    for (var i in selectors[this.type]) {
      this[i] = selectors[this.type][i]
    }
  },

	/**
	 * Check whether a selector is a paren selector of this selector
	 * @param selectorId
	 * @returns {boolean}
	 */
  hasParentSelector: function (selectorId) {
    return (this.parentSelectors.indexOf(selectorId) !== -1)
  },

  removeParentSelector: function (selectorId) {
    var index = this.parentSelectors.indexOf(selectorId)
    if (index !== -1) {
      this.parentSelectors.splice(index, 1)
    }
  },

  renameParentSelector: function (originalId, replacementId) {
    if (this.hasParentSelector(originalId)) {
      var pos = this.parentSelectors.indexOf(originalId)
      this.parentSelectors.splice(pos, 1, replacementId)
    }
  },

  getDataElements: function (parentElement) {
    var $ = this.$
    var elements = ElementQuery(this.selector, parentElement, {$})
    if (this.multiple) {
      return elements
    } else if (elements.length > 0) {
      return [elements[0]]
    } else {
      return []
    }
  },

  getData: function (parentElement) {
    var d = jquery.Deferred()
    var timeout = this.delay || 0

		// this works much faster because whenCallSequentally isn't running next data extraction immediately
    if (timeout === 0) {
      var deferredData = this._getData(parentElement)
      deferredData.done(function (data) {
        d.resolve(data)
      })
    }		else {
      setTimeout(function () {
        var deferredData = this._getData(parentElement)
        deferredData.done(function (data) {
          d.resolve(data)
        })
      }.bind(this), timeout)
    }

    return d.promise()
  }
}

module.exports = Selector

},{"./ElementQuery":7,"./Selectors":24,"jquery-deferred":30}],12:[function(require,module,exports){
var jquery = require('jquery-deferred')

var SelectorElement = {

  canReturnMultipleRecords: function () {
    return true
  },

  canHaveChildSelectors: function () {
    return true
  },

  canHaveLocalChildSelectors: function () {
    return true
  },

  canCreateNewJobs: function () {
    return false
  },
  willReturnElements: function () {
    return true
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred()

    var elements = this.getDataElements(parentElement)
    dfd.resolve(this.$.makeArray(elements))

    return dfd.promise()
  },

  getDataColumns: function () {
    return []
  },

  getFeatures: function () {
    return ['multiple', 'delay']
  }
}

module.exports = SelectorElement

},{"jquery-deferred":30}],13:[function(require,module,exports){
var jquery = require('jquery-deferred')
var SelectorElementAttribute = {
  canReturnMultipleRecords: function () {
    return true
  },

  canHaveChildSelectors: function () {
    return false
  },

  canHaveLocalChildSelectors: function () {
    return false
  },

  canCreateNewJobs: function () {
    return false
  },
  willReturnElements: function () {
    return false
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred()
    var self = this
    var elements = this.getDataElements(parentElement)

    var result = []
    self.$(elements).each(function (k, element) {
      var data = {}

      data[this.id] = self.$(element).attr(this.extractAttribute)
      result.push(data)
    }.bind(this))

    if (this.multiple === false && elements.length === 0) {
      var data = {}
      data[this.id + '-src'] = null
      result.push(data)
    }
    dfd.resolve(result)

    return dfd.promise()
  },

  getDataColumns: function () {
    return [this.id]
  },

  getFeatures: function () {
    return ['multiple', 'extractAttribute', 'delay']
  }
}

module.exports = SelectorElementAttribute

},{"jquery-deferred":30}],14:[function(require,module,exports){
var jquery = require('jquery-deferred')
var UniqueElementList = require('./../UniqueElementList')
var ElementQuery = require('./../ElementQuery')
var CssSelector = require('css-selector').CssSelector
var SelectorElementClick = {

  canReturnMultipleRecords: function () {
    return true
  },

  canHaveChildSelectors: function () {
    return true
  },

  canHaveLocalChildSelectors: function () {
    return true
  },

  canCreateNewJobs: function () {
    return false
  },
  willReturnElements: function () {
    return true
  },

  getClickElements: function (parentElement) {
    var $ = this.$
    var clickElements = ElementQuery(this.clickElementSelector, parentElement, {$})
    return clickElements
  },

	/**
	 * Check whether element is still reachable from html. Useful to check whether the element is removed from DOM.
	 * @param element
	 */
  isElementInHTML: function (element) {
    return this.$(element).closest('html').length !== 0
  },

  triggerButtonClick: function (clickElement) {
    var cs = new CssSelector({
      enableSmartTableSelector: false,
      parent: this.$('body')[0],
      enableResultStripping: false
    })
    var cssSelector = cs.getCssSelector([clickElement])

		// this function will catch window.open call and place the requested url as the elements data attribute
    var script = document.createElement('script')
    script.type = 'text/javascript'
    script.text = '' +
			'(function(){ ' +
			"var el = document.querySelectorAll('" + cssSelector + "')[0]; " +
			'el.click(); ' +
			'})();'
    document.body.appendChild(script)
  },

  getClickElementUniquenessType: function () {
    if (this.clickElementUniquenessType === undefined) {
      return 'uniqueText'
    } else {
      return this.clickElementUniquenessType
    }
  },

  _getData: function (parentElement) {
    var $ = this.$
    var delay = parseInt(this.delay) || 0
    var deferredResponse = jquery.Deferred()
    var foundElements = new UniqueElementList('uniqueText', {$})
    var clickElements = this.getClickElements(parentElement)
    var doneClickingElements = new UniqueElementList(this.getClickElementUniquenessType(), {$})

		// add elements that are available before clicking
    var elements = this.getDataElements(parentElement)
    elements.forEach(foundElements.push.bind(foundElements))

		// discard initial elements
    if (this.discardInitialElements) {
      foundElements = new UniqueElementList('uniqueText', {$})
    }

		// no elements to click at the beginning
    if (clickElements.length === 0) {
      deferredResponse.resolve(foundElements)
      return deferredResponse.promise()
    }

		// initial click and wait
    var currentClickElement = clickElements[0]
    this.triggerButtonClick(currentClickElement)
    var nextElementSelection = (new Date()).getTime() + delay

		// infinitely scroll down and find all items
    var interval = setInterval(function () {
			// find those click elements that are not in the black list
      var allClickElements = this.getClickElements(parentElement)
      clickElements = []
      allClickElements.forEach(function (element) {
        if (!doneClickingElements.isAdded(element)) {
          clickElements.push(element)
        }
      })

      var now = (new Date()).getTime()
			// sleep. wait when to extract next elements
      if (now < nextElementSelection) {
				// console.log("wait");
        return
      }

			// add newly found elements to element foundElements array.
      var elements = this.getDataElements(parentElement)
      var addedAnElement = false
      elements.forEach(function (element) {
        var added = foundElements.push(element)
        if (added) {
          addedAnElement = true
        }
      })
			// console.log("added", addedAnElement);

			// no new elements found. Stop clicking this button
      if (!addedAnElement) {
        doneClickingElements.push(currentClickElement)
      }

			// continue clicking and add delay, but if there is nothing
			// more to click the finish
			// console.log("total buttons", clickElements.length)
      if (clickElements.length === 0) {
        clearInterval(interval)
        deferredResponse.resolve(foundElements)
      } else {
				// console.log("click");
        currentClickElement = clickElements[0]
				// click on elements only once if the type is clickonce
        if (this.clickType === 'clickOnce') {
          doneClickingElements.push(currentClickElement)
        }
        this.triggerButtonClick(currentClickElement)
        nextElementSelection = now + delay
      }
    }.bind(this), 50)

    return deferredResponse.promise()
  },

  getDataColumns: function () {
    return []
  },

  getFeatures: function () {
    return ['multiple', 'delay', 'clickElementSelector', 'clickType', 'discardInitialElements', 'clickElementUniquenessType']
  }
}

module.exports = SelectorElementClick

},{"./../ElementQuery":7,"./../UniqueElementList":27,"css-selector":29,"jquery-deferred":30}],15:[function(require,module,exports){
var jquery = require('jquery-deferred')
var SelectorElementScroll = {

  canReturnMultipleRecords: function () {
    return true
  },

  canHaveChildSelectors: function () {
    return true
  },

  canHaveLocalChildSelectors: function () {
    return true
  },

  canCreateNewJobs: function () {
    return false
  },
  willReturnElements: function () {
    return true
  },
  scrollToBottom: function () {
    window.scrollTo(0, document.body.scrollHeight)
  },
  _getData: function (parentElement) {
    var delay = parseInt(this.delay) || 0
    var deferredResponse = jquery.Deferred()
    var foundElements = []

		// initially scroll down and wait
    this.scrollToBottom()
    var nextElementSelection = (new Date()).getTime() + delay

		// infinitely scroll down and find all items
    var interval = setInterval(function () {
      var now = (new Date()).getTime()
			// sleep. wait when to extract next elements
      if (now < nextElementSelection) {
        return
      }

      var elements = this.getDataElements(parentElement)
			// no new elements found
      if (elements.length === foundElements.length) {
        clearInterval(interval)
        deferredResponse.resolve(this.$.makeArray(elements))
      } else {
				// continue scrolling and add delay
        foundElements = elements
        this.scrollToBottom()
        nextElementSelection = now + delay
      }
    }.bind(this), 50)

    return deferredResponse.promise()
  },

  getDataColumns: function () {
    return []
  },

  getFeatures: function () {
    return ['multiple', 'delay']
  }
}

module.exports = SelectorElementScroll

},{"jquery-deferred":30}],16:[function(require,module,exports){
var jquery = require('jquery-deferred')
var SelectorGroup = {

  canReturnMultipleRecords: function () {
    return false
  },

  canHaveChildSelectors: function () {
    return false
  },

  canHaveLocalChildSelectors: function () {
    return false
  },

  canCreateNewJobs: function () {
    return false
  },
  willReturnElements: function () {
    return false
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred()
    var self = this
		// cannot reuse this.getDataElements because it depends on *multiple* property
    var elements = self.$(this.selector, parentElement)

    var records = []
    self.$(elements).each(function (k, element) {
      var data = {}

      data[this.id] = self.$(element).text()

      if (this.extractAttribute) {
        data[this.id + '-' + this.extractAttribute] = self.$(element).attr(this.extractAttribute)
      }

      records.push(data)
    }.bind(this))

    var result = {}
    result[this.id] = records

    dfd.resolve([result])
    return dfd.promise()
  },

  getDataColumns: function () {
    return [this.id]
  },

  getFeatures: function () {
    return ['delay', 'extractAttribute']
  }
}

module.exports = SelectorGroup

},{"jquery-deferred":30}],17:[function(require,module,exports){
var jquery = require('jquery-deferred')
var SelectorHTML = {

  canReturnMultipleRecords: function () {
    return true
  },

  canHaveChildSelectors: function () {
    return false
  },

  canHaveLocalChildSelectors: function () {
    return false
  },

  canCreateNewJobs: function () {
    return false
  },
  willReturnElements: function () {
    return false
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred()
    var self = this
    var elements = this.getDataElements(parentElement)

    var result = []
    self.$(elements).each(function (k, element) {
      var data = {}
      var html = self.$(element).html()

      if (this.regex !== undefined && this.regex.length) {
        var matches = html.match(new RegExp(this.regex))
        if (matches !== null) {
          html = matches[0]
        } else {
          html = null
        }
      }
      data[this.id] = html

      result.push(data)
    }.bind(this))

    if (this.multiple === false && elements.length === 0) {
      var data = {}
      data[this.id] = null
      result.push(data)
    }

    dfd.resolve(result)
    return dfd.promise()
  },

  getDataColumns: function () {
    return [this.id]
  },

  getFeatures: function () {
    return ['multiple', 'regex', 'delay']
  }
}

module.exports = SelectorHTML

},{"jquery-deferred":30}],18:[function(require,module,exports){
var jquery = require('jquery-deferred')
var whenCallSequentially = require('../../assets/jquery.whencallsequentially')
var Base64 = require('../../assets/base64')
var SelectorImage = {
  canReturnMultipleRecords: function () {
    return true
  },

  canHaveChildSelectors: function () {
    return false
  },

  canHaveLocalChildSelectors: function () {
    return false
  },

  canCreateNewJobs: function () {
    return false
  },
  willReturnElements: function () {
    return false
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred()

    var elements = this.getDataElements(parentElement)

    var deferredDataCalls = []
    this.$(elements).each(function (i, element) {
      deferredDataCalls.push(function () {
        var deferredData = jquery.Deferred()

        var data = {}
        data[this.id + '-src'] = element.src

				// download image if required
        if (!this.downloadImage) {
          deferredData.resolve(data)
        } else {
          var deferredImageBase64 = this.downloadImageBase64(element.src)

          deferredImageBase64.done(function (imageResponse) {
            data['_imageBase64-' + this.id] = imageResponse.imageBase64
            data['_imageMimeType-' + this.id] = imageResponse.mimeType

            deferredData.resolve(data)
          }.bind(this)).fail(function () {
						// failed to download image continue.
						// @TODO handle errror
            deferredData.resolve(data)
          })
        }

        return deferredData.promise()
      }.bind(this))
    }.bind(this))

    whenCallSequentially(deferredDataCalls).done(function (dataResults) {
      if (this.multiple === false && elements.length === 0) {
        var data = {}
        data[this.id + '-src'] = null
        dataResults.push(data)
      }

      dfd.resolve(dataResults)
    })

    return dfd.promise()
  },

  downloadFileAsBlob: function (url) {
    var deferredResponse = jquery.Deferred()
    var xhr = new XMLHttpRequest()
    xhr.onreadystatechange = function () {
      if (this.readyState == 4) {
        if (this.status == 200) {
          var blob = this.response
          deferredResponse.resolve(blob)
        } else {
          deferredResponse.reject(xhr.statusText)
        }
      }
    }
    xhr.open('GET', url)
    xhr.responseType = 'blob'
    xhr.send()

    return deferredResponse.promise()
  },

  downloadImageBase64: function (url) {
    var deferredResponse = jquery.Deferred()
    var deferredDownload = this.downloadFileAsBlob(url)
    deferredDownload.done(function (blob) {
      var mimeType = blob.type
      var deferredBlob = Base64.blobToBase64(blob)
      deferredBlob.done(function (imageBase64) {
        deferredResponse.resolve({
          mimeType: mimeType,
          imageBase64: imageBase64
        })
      })
    }).fail(deferredResponse.fail)
    return deferredResponse.promise()
  },

  getDataColumns: function () {
    return [this.id + '-src']
  },

  getFeatures: function () {
    return ['multiple', 'delay', 'downloadImage']
  },

  getItemCSSSelector: function () {
    return 'img'
  }
}

module.exports = SelectorImage

},{"../../assets/base64":1,"../../assets/jquery.whencallsequentially":2,"jquery-deferred":30}],19:[function(require,module,exports){
var jquery = require('jquery-deferred')
var whenCallSequentially = require('../../assets/jquery.whencallsequentially')

var SelectorLink = {
  canReturnMultipleRecords: function () {
    return true
  },

  canHaveChildSelectors: function () {
    return true
  },

  canHaveLocalChildSelectors: function () {
    return false
  },

  canCreateNewJobs: function () {
    return true
  },
  willReturnElements: function () {
    return false
  },
  _getData: function (parentElement) {
    var elements = this.getDataElements(parentElement)
    var self = this

    var dfd = jquery.Deferred()

		// return empty record if not multiple type and no elements found
    if (this.multiple === false && elements.length === 0) {
      var data = {}
      data[this.id] = null
      dfd.resolve([data])
      return dfd
    }

		// extract links one by one
    var deferredDataExtractionCalls = []
    self.$(elements).each(function (k, element) {
      deferredDataExtractionCalls.push(function (element) {
        var deferredData = jquery.Deferred()

        var data = {}
        data[this.id] = self.$(element).text()
        data._followSelectorId = this.id
        data[this.id + '-href'] = element.href
        data._follow = element.href
        deferredData.resolve(data)

        return deferredData
      }.bind(this, element))
    }.bind(this))

    whenCallSequentially(deferredDataExtractionCalls).done(function (responses) {
      var result = []
      responses.forEach(function (dataResult) {
        result.push(dataResult)
      })
      dfd.resolve(result)
    })

    return dfd.promise()
  },

  getDataColumns: function () {
    return [this.id, this.id + '-href']
  },

  getFeatures: function () {
    return ['multiple', 'delay']
  },

  getItemCSSSelector: function () {
    return 'a'
  }
}

module.exports = SelectorLink

},{"../../assets/jquery.whencallsequentially":2,"jquery-deferred":30}],20:[function(require,module,exports){
var whenCallSequentially = require('../../assets/jquery.whencallsequentially')
var jquery = require('jquery-deferred')
var CssSelector = require('css-selector').CssSelector
var SelectorPopupLink = {
  canReturnMultipleRecords: function () {
    return true
  },

  canHaveChildSelectors: function () {
    return true
  },

  canHaveLocalChildSelectors: function () {
    return false
  },

  canCreateNewJobs: function () {
    return true
  },
  willReturnElements: function () {
    return false
  },
  _getData: function (parentElement) {
    var $ = this.$
    var elements = this.getDataElements(parentElement)

    var dfd = jquery.Deferred()

		// return empty record if not multiple type and no elements found
    if (this.multiple === false && elements.length === 0) {
      var data = {}
      data[this.id] = null
      dfd.resolve([data])
      return dfd
    }

		// extract links one by one
    var deferredDataExtractionCalls = []
    $(elements).each(function (k, element) {
      deferredDataExtractionCalls.push(function (element) {
        var deferredData = jquery.Deferred()

        var data = {}
        data[this.id] = $(element).text()
        data._followSelectorId = this.id

        var deferredPopupURL = this.getPopupURL(element)
        deferredPopupURL.done(function (url) {
          data[this.id + '-href'] = url
          data._follow = url
          deferredData.resolve(data)
        }.bind(this))

        return deferredData
      }.bind(this, element))
    }.bind(this))

    whenCallSequentially(deferredDataExtractionCalls).done(function (responses) {
      var result = []
      responses.forEach(function (dataResult) {
        result.push(dataResult)
      })
      dfd.resolve(result)
    })

    return dfd.promise()
  },

	/**
	 * Gets an url from a window.open call by mocking the window.open function
	 * @param element
	 * @returns $.Deferred()
	 */
  getPopupURL: function (element) {
    var $ = this.$
    // override window.open function. we need to execute this in page scope.
		// we need to know how to find this element from page scope.
    var cs = new CssSelector({
      enableSmartTableSelector: false,
      parent: document.body,
      enableResultStripping: false
    })
    var cssSelector = cs.getCssSelector([element])
    console.log(cssSelector)
    console.log(document.body.querySelectorAll(cssSelector))
		// this function will catch window.open call and place the requested url as the elements data attribute
    var script = document.createElement('script')
    script.type = 'text/javascript'
    console.log(cssSelector)
    console.log(document.querySelectorAll(cssSelector))
    script.text = `
			(function(){
        var open = window.open;
        var el = document.querySelectorAll('${cssSelector}')[0];
        var openNew = function() { 
          var url = arguments[0]; 
          el.dataset.webScraperExtractUrl = url; 
          window.open = open; 
        };
        window.open = openNew; 
        el.click(); 
			})()`
    document.body.appendChild(script)

		// wait for url to be available
    var deferredURL = jquery.Deferred()
    var timeout = Math.abs(5000 / 30) // 5s timeout to generate an url for popup
    var interval = setInterval(function () {
      var url = $(element).data('web-scraper-extract-url')
      if (url) {
        deferredURL.resolve(url)
        clearInterval(interval)
        script.remove()
      }
			// timeout popup opening
      if (timeout-- <= 0) {
        clearInterval(interval)
        script.remove()
      }
    }, 30)

    return deferredURL.promise()
  },

  getDataColumns: function () {
    return [this.id, this.id + '-href']
  },

  getFeatures: function () {
    return ['multiple', 'delay']
  },

  getItemCSSSelector: function () {
    return '*'
  }
}

module.exports = SelectorPopupLink

},{"../../assets/jquery.whencallsequentially":2,"css-selector":29,"jquery-deferred":30}],21:[function(require,module,exports){
var jquery = require('jquery-deferred')

var SelectorTable = {

  canReturnMultipleRecords: function () {
    return true
  },

  canHaveChildSelectors: function () {
    return false
  },

  canHaveLocalChildSelectors: function () {
    return false
  },

  canCreateNewJobs: function () {
    return false
  },
  willReturnElements: function () {
    return false
  },
  getTableHeaderColumns: function ($table) {
    var columns = {}
    var $ = this.$
    var headerRowSelector = this.getTableHeaderRowSelector()
    var $headerRow = $($table).find(headerRowSelector)
    if ($headerRow.length > 0) {
      $headerRow.find('td,th').each(function (i) {
        var header = $(this).text().trim()
        columns[header] = {
          index: i + 1
        }
      })
    }
    return columns
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred()
    var $ = this.$

    var tables = this.getDataElements(parentElement)

    var result = []
    $(tables).each(function (k, table) {
      var columns = this.getTableHeaderColumns($(table))

      var dataRowSelector = this.getTableDataRowSelector()
      $(table).find(dataRowSelector).each(function (i, row) {
        var data = {}
        this.columns.forEach(function (column) {
          if (column.extract === true) {
            if (columns[column.header] === undefined) {
              data[column.name] = null
            } else {
              var rowText = $(row).find('>:nth-child(' + columns[column.header].index + ')').text().trim()
              data[column.name] = rowText
            }
          }
        })
        result.push(data)
      }.bind(this))
    }.bind(this))

    dfd.resolve(result)
    return dfd.promise()
  },

  getDataColumns: function () {
    var dataColumns = []
    this.columns.forEach(function (column) {
      if (column.extract === true) {
        dataColumns.push(column.name)
      }
    })
    return dataColumns
  },

  getFeatures: function () {
    return ['multiple', 'columns', 'delay', 'tableDataRowSelector', 'tableHeaderRowSelector']
  },

  getItemCSSSelector: function () {
    return 'table'
  },

  getTableHeaderRowSelectorFromTableHTML: function (html, options = {}) {
    var $ = options.$ || this.$
    var $table = $(html)
    if ($table.find('thead tr:has(td:not(:empty)), thead tr:has(th:not(:empty))').length) {
      if ($table.find('thead tr').length === 1) {
        return 'thead tr'
      }			else {
        var $rows = $table.find('thead tr')
				// first row with data
        var rowIndex = $rows.index($rows.filter(':has(td:not(:empty)),:has(th:not(:empty))')[0])
        return 'thead tr:nth-of-type(' + (rowIndex + 1) + ')'
      }
    }		else if ($table.find('tr td:not(:empty), tr th:not(:empty)').length) {
      var $rows = $table.find('tr')
			// first row with data
      var rowIndex = $rows.index($rows.filter(':has(td:not(:empty)),:has(th:not(:empty))')[0])
      return 'tr:nth-of-type(' + (rowIndex + 1) + ')'
    }		else {
      return ''
    }
  },

  getTableDataRowSelectorFromTableHTML: function (html, options = {}) {
    var $ = options.$ || this.$
    var $table = $(html)
    if ($table.find('thead tr:has(td:not(:empty)), thead tr:has(th:not(:empty))').length) {
      return 'tbody tr'
    }		else if ($table.find('tr td:not(:empty), tr th:not(:empty)').length) {
      var $rows = $table.find('tr')
			// first row with data
      var rowIndex = $rows.index($rows.filter(':has(td:not(:empty)),:has(th:not(:empty))')[0])
      return 'tr:nth-of-type(n+' + (rowIndex + 2) + ')'
    }		else {
      return ''
    }
  },

  getTableHeaderRowSelector: function () {
		// handle legacy selectors
    if (this.tableHeaderRowSelector === undefined) {
      return 'thead tr'
    }		else {
      return this.tableHeaderRowSelector
    }
  },

  getTableDataRowSelector: function () {
		// handle legacy selectors
    if (this.tableDataRowSelector === undefined) {
      return 'tbody tr'
    }		else {
      return this.tableDataRowSelector
    }
  },

	/**
	 * Extract table header column info from html
	 * @param html
	 */
  getTableHeaderColumnsFromHTML: function (headerRowSelector, html, options = {}) {
    var $ = options.$ || this.$
    var $table = $(html)
    var $headerRowColumns = $table.find(headerRowSelector).find('td,th')

    var columns = []

    $headerRowColumns.each(function (i, columnEl) {
      var header = $(columnEl).text().trim()
      var name = header
      if (header.length !== 0) {
        columns.push({
          header: header,
          name: name,
          extract: true
        })
      }
    })
    return columns
  }
}

module.exports = SelectorTable

},{"jquery-deferred":30}],22:[function(require,module,exports){
var jquery = require('jquery-deferred')
var SelectorText = {

  canReturnMultipleRecords: function () {
    return true
  },

  canHaveChildSelectors: function () {
    return false
  },

  canHaveLocalChildSelectors: function () {
    return false
  },

  canCreateNewJobs: function () {
    return false
  },
  willReturnElements: function () {
    return false
  },
  _getData: function (parentElement) {
    var $ = this.$
    var dfd = jquery.Deferred()

    var elements = this.getDataElements(parentElement)

    var result = []
    $(elements).each(function (k, element) {
      var data = {}

			// remove script, style tag contents from text results
      var $element_clone = $(element).clone()
      $element_clone.find('script, style').remove()
			// <br> replace br tags with newlines
      $element_clone.find('br').after('\n')

      var text = $element_clone.text()
      if (this.regex !== undefined && this.regex.length) {
        var matches = text.match(new RegExp(this.regex))
        if (matches !== null) {
          text = matches[0]
        } else {
          text = null
        }
      }
      data[this.id] = text

      result.push(data)
    }.bind(this))

    if (this.multiple === false && elements.length === 0) {
      var data = {}
      data[this.id] = null
      result.push(data)
    }

    dfd.resolve(result)
    return dfd.promise()
  },

  getDataColumns: function () {
    return [this.id]
  },

  getFeatures: function () {
    return ['multiple', 'regex', 'delay']
  }
}

module.exports = SelectorText

},{"jquery-deferred":30}],23:[function(require,module,exports){
var Selector = require('./Selector')

var SelectorList = function (selectors, options) {
  this.$ = options.$
  if (!options.$) throw new Error('Missing jquery')

  if (selectors === null || selectors === undefined) {
    return
  }

  for (var i = 0; i < selectors.length; i++) {
    this.push(selectors[i])
  }
}

SelectorList.prototype = []

SelectorList.prototype.push = function (selector) {
  if (!this.hasSelector(selector.id)) {
    if (!(selector instanceof Selector)) {
      selector = new Selector(selector, {$: this.$})
    }
    Array.prototype.push.call(this, selector)
  }
}

SelectorList.prototype.hasSelector = function (selectorId) {
  if (selectorId instanceof Object) {
    selectorId = selectorId.id
  }

  for (var i = 0; i < this.length; i++) {
    if (this[i].id === selectorId) {
      return true
    }
  }
  return false
}

/**
 * Returns all selectors or recursively find and return all child selectors of a parent selector.
 * @param parentSelectorId
 * @returns {Array}
 */
SelectorList.prototype.getAllSelectors = function (parentSelectorId) {
  if (parentSelectorId === undefined) {
    return this
  }

  var getAllChildSelectors = function (parentSelectorId, resultSelectors) {
    this.forEach(function (selector) {
      if (selector.hasParentSelector(parentSelectorId)) {
        if (resultSelectors.indexOf(selector) === -1) {
          resultSelectors.push(selector)
          getAllChildSelectors(selector.id, resultSelectors)
        }
      }
    })
  }.bind(this)

  var resultSelectors = []
  getAllChildSelectors(parentSelectorId, resultSelectors)
  return resultSelectors
}

/**
 * Returns only selectors that are directly under a parent
 * @param parentSelectorId
 * @returns {Array}
 */
SelectorList.prototype.getDirectChildSelectors = function (parentSelectorId) {
  var resultSelectors = new SelectorList(null, {$: this.$})
  this.forEach(function (selector) {
    if (selector.hasParentSelector(parentSelectorId)) {
      resultSelectors.push(selector)
    }
  })
  return resultSelectors
}

SelectorList.prototype.clone = function () {
  var resultList = new SelectorList(null, {$: this.$})
  this.forEach(function (selector) {
    resultList.push(selector)
  })
  return resultList
}

SelectorList.prototype.fullClone = function () {
  var resultList = new SelectorList(null, {$: this.$})
  this.forEach(function (selector) {
    resultList.push(JSON.parse(JSON.stringify(selector)))
  })
  return resultList
}

SelectorList.prototype.concat = function () {
  var resultList = this.clone()
  for (var i in arguments) {
    arguments[i].forEach(function (selector) {
      resultList.push(selector)
    })
  }
  return resultList
}

SelectorList.prototype.getSelector = function (selectorId) {
  for (var i = 0; i < this.length; i++) {
    var selector = this[i]
    if (selector.id === selectorId) {
      return selector
    }
  }
}

/**
 * Returns all selectors if this selectors including all parent selectors within this page
 * @TODO not used any more.
 * @param selectorId
 * @returns {*}
 */
SelectorList.prototype.getOnePageSelectors = function (selectorId) {
  var resultList = new SelectorList(null, {$: this.$})
  var selector = this.getSelector(selectorId)
  resultList.push(this.getSelector(selectorId))

	// recursively find all parent selectors that could lead to the page where selectorId is used.
  var findParentSelectors = function (selector) {
    selector.parentSelectors.forEach(function (parentSelectorId) {
      if (parentSelectorId === '_root') return
      var parentSelector = this.getSelector(parentSelectorId)
      if (resultList.indexOf(parentSelector) !== -1) return
      if (parentSelector.willReturnElements()) {
        resultList.push(parentSelector)
        findParentSelectors(parentSelector)
      }
    }.bind(this))
  }.bind(this)

  findParentSelectors(selector)

	// add all child selectors
  resultList = resultList.concat(this.getSinglePageAllChildSelectors(selector.id))
  return resultList
}

/**
 * Returns all child selectors of a selector which can be used within one page.
 * @param parentSelectorId
 */
SelectorList.prototype.getSinglePageAllChildSelectors = function (parentSelectorId) {
  var resultList = new SelectorList(null, {$: this.$})
  var addChildSelectors = function (parentSelector) {
    if (parentSelector.willReturnElements()) {
      var childSelectors = this.getDirectChildSelectors(parentSelector.id)
      childSelectors.forEach(function (childSelector) {
        if (resultList.indexOf(childSelector) === -1) {
          resultList.push(childSelector)
          addChildSelectors(childSelector)
        }
      })
    }
  }.bind(this)

  var parentSelector = this.getSelector(parentSelectorId)
  addChildSelectors(parentSelector)
  return resultList
}

SelectorList.prototype.willReturnMultipleRecords = function (selectorId) {
	// handle reuqested selector
  var selector = this.getSelector(selectorId)
  if (selector.willReturnMultipleRecords() === true) {
    return true
  }

	// handle all its child selectors
  var childSelectors = this.getAllSelectors(selectorId)
  for (var i = 0; i < childSelectors.length; i++) {
    var selector = childSelectors[i]
    if (selector.willReturnMultipleRecords() === true) {
      return true
    }
  }

  return false
}

/**
 * When serializing to JSON convert to an array
 * @returns {Array}
 */
SelectorList.prototype.toJSON = function () {
  var result = []
  this.forEach(function (selector) {
    result.push(selector)
  })
  return result
}

SelectorList.prototype.getSelectorById = function (selectorId) {
  for (var i = 0; i < this.length; i++) {
    var selector = this[i]
    if (selector.id === selectorId) {
      return selector
    }
  }
}

/**
 * returns css selector for a given element. css selector includes all parent element selectors
 * @param selectorId
 * @param parentSelectorIds array of parent selector ids from devtools Breadcumb
 * @returns string
 */
SelectorList.prototype.getCSSSelectorWithinOnePage = function (selectorId, parentSelectorIds) {
  var CSSSelector = this.getSelector(selectorId).selector
  var parentCSSSelector = this.getParentCSSSelectorWithinOnePage(parentSelectorIds)
  CSSSelector = parentCSSSelector + CSSSelector

  return CSSSelector
}

/**
 * returns css selector for parent selectors that are within one page
 * @param parentSelectorIds array of parent selector ids from devtools Breadcumb
 * @returns string
 */
SelectorList.prototype.getParentCSSSelectorWithinOnePage = function (parentSelectorIds) {
  var CSSSelector = ''

  for (var i = parentSelectorIds.length - 1; i > 0; i--) {
    var parentSelectorId = parentSelectorIds[i]
    var parentSelector = this.getSelector(parentSelectorId)
    if (parentSelector.willReturnElements()) {
      CSSSelector = parentSelector.selector + ' ' + CSSSelector
    } else {
      break
    }
  }

  return CSSSelector
}

SelectorList.prototype.hasRecursiveElementSelectors = function () {
  var RecursionFound = false

  this.forEach(function (topSelector) {
    var visitedSelectors = []

    var checkRecursion = function (parentSelector) {
			// already visited
      if (visitedSelectors.indexOf(parentSelector) !== -1) {
        RecursionFound = true
        return
      }

      if (parentSelector.willReturnElements()) {
        visitedSelectors.push(parentSelector)
        var childSelectors = this.getDirectChildSelectors(parentSelector.id)
        childSelectors.forEach(checkRecursion)
        visitedSelectors.pop()
      }
    }.bind(this)

    checkRecursion(topSelector)
  }.bind(this))

  return RecursionFound
}

module.exports = SelectorList

},{"./Selector":11}],24:[function(require,module,exports){
var SelectorElement = require('./Selector/SelectorElement')
var SelectorElementAttribute = require('./Selector/SelectorElementAttribute')
var SelectorElementClick = require('./Selector/SelectorElementClick')
var SelectorElementScroll = require('./Selector/SelectorElementScroll')
var SelectorGroup = require('./Selector/SelectorGroup')
var SelectorHTML = require('./Selector/SelectorHTML')
var SelectorImage = require('./Selector/SelectorImage')
var SelectorLink = require('./Selector/SelectorLink')
var SelectorPopupLink = require('./Selector/SelectorPopupLink')
var SelectorTable = require('./Selector/SelectorTable')
var SelectorText = require('./Selector/SelectorText')

module.exports = {
  SelectorElement,
  SelectorElementAttribute,
  SelectorElementClick,
  SelectorElementScroll,
  SelectorGroup,
  SelectorHTML,
  SelectorImage,
  SelectorLink,
  SelectorPopupLink,
  SelectorTable,
  SelectorText
}

},{"./Selector/SelectorElement":12,"./Selector/SelectorElementAttribute":13,"./Selector/SelectorElementClick":14,"./Selector/SelectorElementScroll":15,"./Selector/SelectorGroup":16,"./Selector/SelectorHTML":17,"./Selector/SelectorImage":18,"./Selector/SelectorLink":19,"./Selector/SelectorPopupLink":20,"./Selector/SelectorTable":21,"./Selector/SelectorText":22}],25:[function(require,module,exports){
var Selector = require('./Selector')
var SelectorList = require('./SelectorList')
var Sitemap = function (sitemapObj, options) {
  this.$ = options.$
  if (!options.$) throw new Error('Missing jquery')
  this.initData(sitemapObj)
}

Sitemap.prototype = {

  initData: function (sitemapObj) {
    console.log(this)
    for (var key in sitemapObj) {
      console.log(key)
      this[key] = sitemapObj[key]
    }
    console.log(this)

    var selectors = this.selectors
    this.selectors = new SelectorList(this.selectors, {$: this.$})
  },

	/**
	 * Returns all selectors or recursively find and return all child selectors of a parent selector.
	 * @param parentSelectorId
	 * @returns {Array}
	 */
  getAllSelectors: function (parentSelectorId) {
    return this.selectors.getAllSelectors(parentSelectorId)
  },

	/**
	 * Returns only selectors that are directly under a parent
	 * @param parentSelectorId
	 * @returns {Array}
	 */
  getDirectChildSelectors: function (parentSelectorId) {
    return this.selectors.getDirectChildSelectors(parentSelectorId)
  },

	/**
	 * Returns all selector id parameters
	 * @returns {Array}
	 */
  getSelectorIds: function () {
    var ids = ['_root']
    this.selectors.forEach(function (selector) {
      ids.push(selector.id)
    })
    return ids
  },

	/**
	 * Returns only selector ids which can have child selectors
	 * @returns {Array}
	 */
  getPossibleParentSelectorIds: function () {
    var ids = ['_root']
    this.selectors.forEach(function (selector) {
      if (selector.canHaveChildSelectors()) {
        ids.push(selector.id)
      }
    })
    return ids
  },

  getStartUrls: function () {
    var startUrls = this.startUrl
		// single start url
    if (this.startUrl.push === undefined) {
      startUrls = [startUrls]
    }

    var urls = []
    startUrls.forEach(function (startUrl) {
			// zero padding helper
      var lpad = function (str, length) {
        while (str.length < length) { str = '0' + str }
        return str
      }

      var re = /^(.*?)\[(\d+)\-(\d+)(:(\d+))?\](.*)$/
      var matches = startUrl.match(re)
      if (matches) {
        var startStr = matches[2]
        var endStr = matches[3]
        var start = parseInt(startStr)
        var end = parseInt(endStr)
        var incremental = 1
        console.log(matches[5])
        if (matches[5] !== undefined) {
          incremental = parseInt(matches[5])
        }
        for (var i = start; i <= end; i += incremental) {
					// with zero padding
          if (startStr.length === endStr.length) {
            urls.push(matches[1] + lpad(i.toString(), startStr.length) + matches[6])
          } else {
            urls.push(matches[1] + i + matches[6])
          }
        }
        return urls
      } else {
        urls.push(startUrl)
      }
    })

    return urls
  },

  updateSelector: function (selector, selectorData) {
		// selector is undefined when creating a new one
    if (selector === undefined) {
      selector = new Selector(selectorData, {$: this.$})
    }

		// update child selectors
    if (selector.id !== undefined && selector.id !== selectorData.id) {
      this.selectors.forEach(function (currentSelector) {
        currentSelector.renameParentSelector(selector.id, selectorData.id)
      })

			// update cyclic selector
      var pos = selectorData.parentSelectors.indexOf(selector.id)
      if (pos !== -1) {
        selectorData.parentSelectors.splice(pos, 1, selectorData.id)
      }
    }

    selector.updateData(selectorData)

    if (this.getSelectorIds().indexOf(selector.id) === -1) {
      this.selectors.push(selector)
    }
  },
  deleteSelector: function (selectorToDelete) {
    this.selectors.forEach(function (selector) {
      if (selector.hasParentSelector(selectorToDelete.id)) {
        selector.removeParentSelector(selectorToDelete.id)
        if (selector.parentSelectors.length === 0) {
          this.deleteSelector(selector)
        }
      }
    }.bind(this))

    for (var i in this.selectors) {
      if (this.selectors[i].id === selectorToDelete.id) {
        this.selectors.splice(i, 1)
        break
      }
    }
  },
  getDataTableId: function () {
    return this._id.replace(/\./g, '_')
  },
  exportSitemap: function () {
    var sitemapObj = JSON.parse(JSON.stringify(this))
    delete sitemapObj._rev
    return JSON.stringify(sitemapObj)
  },
  importSitemap: function (sitemapJSON) {
    var sitemapObj = JSON.parse(sitemapJSON)
    this.initData(sitemapObj)
  },
	// return a list of columns than can be exported
  getDataColumns: function () {
    var columns = []
    this.selectors.forEach(function (selector) {
      columns = columns.concat(selector.getDataColumns())
    })

    return columns
  },
  getDataExportCsvBlob: function (data) {
    var columns = this.getDataColumns(),
      delimiter = ',',
      newline = '\n',
      csvData = ['\ufeff'] // utf-8 bom char

		// header
    csvData.push(columns.join(delimiter) + newline)

		// data
    data.forEach(function (row) {
      var rowData = []
      columns.forEach(function (column) {
        var cellData = row[column]
        if (cellData === undefined) {
          cellData = ''
        }				else if (typeof cellData === 'object') {
          cellData = JSON.stringify(cellData)
        }

        rowData.push('"' + cellData.replace(/"/g, '""').trim() + '"')
      })
      csvData.push(rowData.join(delimiter) + newline)
    })

    return new Blob(csvData, {type: 'text/csv'})
  },
  getSelectorById: function (selectorId) {
    return this.selectors.getSelectorById(selectorId)
  },
	/**
	 * Create full clone of sitemap
	 * @returns {Sitemap}
	 */
  clone: function () {
    var clonedJSON = JSON.parse(JSON.stringify(this))
    var sitemap = new Sitemap(clonedJSON)
    return sitemap
  }
}

module.exports = Sitemap

},{"./Selector":11,"./SelectorList":23}],26:[function(require,module,exports){
var Sitemap = require('./Sitemap')

var Store = function (config, options) {
  this.config = config
  this.$ = options.$
  if (!this.$) throw new Error('jquery required')
    // configure couchdb
  this.sitemapDb = new PouchDB(this.config.sitemapDb)
}

var StoreScrapeResultWriter = function (db) {
  this.db = db
}

StoreScrapeResultWriter.prototype = {
  writeDocs: function (docs, callback) {
    if (docs.length === 0) {
      callback()
    } else {
      this.db.bulkDocs({docs: docs}, function (err, response) {
        if (err !== null) {
          console.log('Error while persisting scraped data to db', err)
        }
        callback()
      })
    }
  }
}

Store.prototype = {

  sanitizeSitemapDataDbName: function (dbName) {
    return 'sitemap-data-' + dbName.replace(/[^a-z0-9_\$\(\)\+\-/]/gi, '_')
  },
  getSitemapDataDbLocation: function (sitemapId) {
    var dbName = this.sanitizeSitemapDataDbName(sitemapId)
    return this.config.dataDb + dbName
  },
  getSitemapDataDb: function (sitemapId) {
    var dbLocation = this.getSitemapDataDbLocation(sitemapId)
    return new PouchDB(dbLocation)
  },

	/**
	 * creates or clears a sitemap db
	 * @param {type} sitemapId
	 * @returns {undefined}
	 */
  initSitemapDataDb: function (sitemapId, callback) {
    var dbLocation = this.getSitemapDataDbLocation(sitemapId)
    var store = this

    PouchDB.destroy(dbLocation, function () {
      var db = store.getSitemapDataDb(sitemapId)
      var dbWriter = new StoreScrapeResultWriter(db)
      callback(dbWriter)
    })
  },

  createSitemap: function (sitemap, callback) {
    var sitemapJson = JSON.parse(JSON.stringify(sitemap))

    if (!sitemap._id) {
      console.log('cannot save sitemap without an id', sitemap)
    }

    this.sitemapDb.put(sitemapJson, function (sitemap, err, response) {
            // @TODO handle err
      sitemap._rev = response.rev
      callback(sitemap)
    }.bind(this, sitemap))
  },
  saveSitemap: function (sitemap, callback) {
        // @TODO remove
    this.createSitemap(sitemap, callback)
  },
  deleteSitemap: function (sitemap, callback) {
    sitemap = JSON.parse(JSON.stringify(sitemap))

    this.sitemapDb.remove(sitemap, function (err, response) {
            // @TODO handle err

			// delete sitemap data db
      var dbLocation = this.getSitemapDataDbLocation(sitemap._id)
      PouchDB.destroy(dbLocation, function () {
        callback()
      })
    }.bind(this))
  },
  getAllSitemaps: function (callback) {
    var $ = this.$
    this.sitemapDb.allDocs({include_docs: true}, function (err, response) {
      var sitemaps = []
      for (var i in response.rows) {
        var sitemap = response.rows[i].doc
        if (!chrome.extension) {
          sitemap = new Sitemap(sitemap, {$})
        }

        sitemaps.push(sitemap)
      }
      callback(sitemaps)
    })
  },

  getSitemapData: function (sitemap, callback) {
    var db = this.getSitemapDataDb(sitemap._id)
    db.allDocs({include_docs: true}, function (err, response) {
      var responseData = []
      for (var i in response.rows) {
        var doc = response.rows[i].doc
        responseData.push(doc)
      }
      callback(responseData)
    })
  },
	// @TODO make this call lighter
  sitemapExists: function (sitemapId, callback) {
    this.getAllSitemaps(function (sitemaps) {
      var sitemapFound = false
      for (var i in sitemaps) {
        if (sitemaps[i]._id === sitemapId) {
          sitemapFound = true
        }
      }
      callback(sitemapFound)
    })
  }
}

module.exports = Store

},{"./Sitemap":25}],27:[function(require,module,exports){
var CssSelector = require('css-selector').CssSelector
// TODO get rid of jquery

/**
 * Only Elements unique will be added to this array
 * @constructor
 */
function UniqueElementList (clickElementUniquenessType, options) {
  this.$ = options.$
  if (!this.$) throw new Error('jquery required')
  this.clickElementUniquenessType = clickElementUniquenessType
  this.addedElements = {}
}

UniqueElementList.prototype = []

UniqueElementList.prototype.push = function (element) {
  var $ = this.$
  if (this.isAdded(element)) {
    return false
  } else {
    var elementUniqueId = this.getElementUniqueId(element)
    this.addedElements[elementUniqueId] = true
    Array.prototype.push.call(this, $(element).clone(true)[0])
    return true
  }
}

UniqueElementList.prototype.getElementUniqueId = function (element) {
  var $ = this.$
  if (this.clickElementUniquenessType === 'uniqueText') {
    var elementText = $(element).text().trim()
    return elementText
  } else if (this.clickElementUniquenessType === 'uniqueHTMLText') {
    var elementHTML = $("<div class='-web-scraper-should-not-be-visible'>").append($(element).eq(0).clone()).html()
    return elementHTML
  } else if (this.clickElementUniquenessType === 'uniqueHTML') {
		// get element without text
    var $element = $(element).eq(0).clone()

    var removeText = function ($element) {
      $element.contents()
				.filter(function () {
  if (this.nodeType !== 3) {
    removeText($(this))
  }
  return this.nodeType == 3 // Node.TEXT_NODE
}).remove()
    }
    removeText($element)

    var elementHTML = $("<div class='-web-scraper-should-not-be-visible'>").append($element).html()
    return elementHTML
  } else if (this.clickElementUniquenessType === 'uniqueCSSSelector') {
    var cs = new CssSelector({
      enableSmartTableSelector: false,
      parent: $('body')[0],
      enableResultStripping: false
    })
    var CSSSelector = cs.getCssSelector([element])
    return CSSSelector
  } else {
    throw 'Invalid clickElementUniquenessType ' + this.clickElementUniquenessType
  }
}

module.exports = UniqueElementList

UniqueElementList.prototype.isAdded = function (element) {
  var elementUniqueId = this.getElementUniqueId(element)
  var isAdded = elementUniqueId in this.addedElements
  return isAdded
}

},{"css-selector":29}],28:[function(require,module,exports){
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

},{"./BackgroundScript":4,"jquery-deferred":30}],29:[function(require,module,exports){
module.exports = {
	CssSelector,
	ElementSelector,
	ElementSelectorList
}


function CssSelector (options) {

	var me = this;

	// defaults
	this.ignoredTags = ['font', 'b', 'i', 's'];
	this.parent = options.document || options.parent
	this.document = options.document || options.parent 
	this.ignoredClassBase = false;
	this.enableResultStripping = true;
	this.enableSmartTableSelector = false;
	this.ignoredClasses = [];
    this.allowMultipleSelectors = false;
	this.query = function (selector) {
		return me.parent.querySelectorAll(selector);
	};

	// overrides defaults with options
	for (var i in options) {
		this[i] = options[i];
	}
};

// TODO refactor element selector list into a ~ class
function ElementSelector (element, ignoredClasses) {

	this.element = element;
	this.isDirectChild = true;
	this.tag = element.localName;
	this.tag = this.tag.replace(/:/g, '\\:');

	// nth-of-child(n+1)
	this.indexn = null;
	this.index = 1;
	this.id = null;
	this.classes = new Array();

	// do not add additinal info to html, body tags.
	// html:nth-of-type(1) cannot be selected
	if(this.tag === 'html' || this.tag === 'HTML'
		|| this.tag === 'body' || this.tag === 'BODY') {
		this.index = null;
		return;
	}

	if (element.parentNode !== undefined) {
		// nth-child
		//this.index = [].indexOf.call(element.parentNode.children, element)+1;

		// nth-of-type
		for (var i = 0; i < element.parentNode.children.length; i++) {
			var child = element.parentNode.children[i];
			if (child === element) {
				break;
			}
			if (child.tagName === element.tagName) {
				this.index++;
			}
		}
	}

	if (element.id !== '') {
		if (typeof element.id === 'string') {
			this.id = element.id;
			this.id = this.id.replace(/:/g, '\\:');
		}
	}

	for (var i = 0; i < element.classList.length; i++) {
		var cclass = element.classList[i];
		if (ignoredClasses.indexOf(cclass) === -1) {
			cclass = cclass.replace(/:/g, '\\:');
			this.classes.push(cclass);
		}
	}
};

function ElementSelectorList (CssSelector) {
	this.CssSelector = CssSelector;
};

ElementSelectorList.prototype = new Array();

ElementSelectorList.prototype.getCssSelector = function () {

	var resultSelectors = [];

	// TDD
	for (var i = 0; i < this.length; i++) {
		var selector = this[i];

		var isFirstSelector = i === this.length-1;
		var resultSelector = selector.getCssSelector(isFirstSelector);

		if (this.CssSelector.enableSmartTableSelector) {
			if (selector.tag === 'tr') {
				if (selector.element.children.length === 2) {
					if (selector.element.children[0].tagName === 'TD'
						|| selector.element.children[0].tagName === 'TH'
						|| selector.element.children[0].tagName === 'TR') {

						var text = selector.element.children[0].textContent;
						text = text.trim();

						// escape quotes
						text.replace(/(\\*)(')/g, function (x) {
							var l = x.length;
							return (l % 2) ? x : x.substring(0, l - 1) + "\\'";
						});
						resultSelector += ":contains('" + text + "')";
					}
				}
			}
		}

		resultSelectors.push(resultSelector);
	}

	var resultCSSSelector = resultSelectors.reverse().join(' ');
	return resultCSSSelector;
};

ElementSelector.prototype = {

	getCssSelector: function (isFirstSelector) {

		if(isFirstSelector === undefined) {
			isFirstSelector = false;
		}

		var selector = this.tag;
		if (this.id !== null) {
			selector += '#' + this.id;
		}
		if (this.classes.length) {
			for (var i = 0; i < this.classes.length; i++) {
				selector += "." + this.classes[i];
			}
		}
		if (this.index !== null) {
			selector += ':nth-of-type(' + this.index + ')';
		}
		if (this.indexn !== null && this.indexn !== -1) {
			selector += ':nth-of-type(n+' + this.indexn + ')';
		}
		if(this.isDirectChild && isFirstSelector === false) {
			selector = "> "+selector;
		}

		return selector;
	},
	// merges this selector with another one.
	merge: function (mergeSelector) {

		if (this.tag !== mergeSelector.tag) {
			throw "different element selected (tag)";
		}

		if (this.index !== null) {
			if (this.index !== mergeSelector.index) {

				// use indexn only for two elements
				if (this.indexn === null) {
					var indexn = Math.min(mergeSelector.index, this.index);
					if (indexn > 1) {
						this.indexn = Math.min(mergeSelector.index, this.index);
					}
				}
				else {
					this.indexn = -1;
				}

				this.index = null;
			}
		}

		if(this.isDirectChild === true) {
			this.isDirectChild = mergeSelector.isDirectChild;
		}

		if (this.id !== null) {
			if (this.id !== mergeSelector.id) {
				this.id = null;
			}
		}

		if (this.classes.length !== 0) {
			var classes = new Array();

			for (var i in this.classes) {
				var cclass = this.classes[i];
				if (mergeSelector.classes.indexOf(cclass) !== -1) {
					classes.push(cclass);
				}
			}

			this.classes = classes;
		}
	}
};

CssSelector.prototype = {
	mergeElementSelectors: function (newSelecors) {

		if (newSelecors.length < 1) {
			throw "No selectors specified";
		}
		else if (newSelecors.length === 1) {
			return newSelecors[0];
		}

		// check selector total count
		var elementCountInSelector = newSelecors[0].length;
		for (var i = 0; i < newSelecors.length; i++) {
			var selector = newSelecors[i];
			if (selector.length !== elementCountInSelector) {
				throw "Invalid element count in selector";
			}
		}

		// merge selectors
		var resultingElements = newSelecors[0];
		for (var i = 1; i < newSelecors.length; i++) {
			var mergeElements = newSelecors[i];

			for (var j = 0; j < elementCountInSelector; j++) {
				resultingElements[j].merge(mergeElements[j]);
			}
		}
		return resultingElements;
	},
	stripSelector: function (selectors) {

		var cssSeletor = selectors.getCssSelector();
		var baseSelectedElements = this.query(cssSeletor);

		var compareElements = function (elements) {
			if (baseSelectedElements.length !== elements.length) {
				return false;
			}

			for (var j = 0; j < baseSelectedElements.length; j++) {
				if ([].indexOf.call(elements, baseSelectedElements[j]) === -1) {
					return false;
				}
			}
			return true;
		};
		// strip indexes
		for (var i = 0; i < selectors.length; i++) {
			var selector = selectors[i];
			if (selector.index !== null) {
				var index = selector.index;
				selector.index = null;
				var cssSeletor = selectors.getCssSelector();
				var newSelectedElements = this.query(cssSeletor);
				// if results doesn't match then undo changes
				if (!compareElements(newSelectedElements)) {
					selector.index = index;
				}
			}
		}

		// strip isDirectChild
		for (var i = 0; i < selectors.length; i++) {
			var selector = selectors[i];
			if (selector.isDirectChild === true) {
				selector.isDirectChild = false;
				var cssSeletor = selectors.getCssSelector();
				var newSelectedElements = this.query(cssSeletor);
				// if results doesn't match then undo changes
				if (!compareElements(newSelectedElements)) {
					selector.isDirectChild = true;
				}
			}
		}

		// strip ids
		for (var i = 0; i < selectors.length; i++) {
			var selector = selectors[i];
			if (selector.id !== null) {
				var id = selector.id;
				selector.id = null;
				var cssSeletor = selectors.getCssSelector();
				var newSelectedElements = this.query(cssSeletor);
				// if results doesn't match then undo changes
				if (!compareElements(newSelectedElements)) {
					selector.id = id;
				}
			}
		}

		// strip classes
		for (var i = 0; i < selectors.length; i++) {
			var selector = selectors[i];
			if (selector.classes.length !== 0) {
				for (var j = selector.classes.length - 1; j > 0; j--) {
					var cclass = selector.classes[j];
					selector.classes.splice(j, 1);
					var cssSeletor = selectors.getCssSelector();
					var newSelectedElements = this.query(cssSeletor);
					// if results doesn't match then undo changes
					if (!compareElements(newSelectedElements)) {
						selector.classes.splice(j, 0, cclass);
					}
				}
			}
		}

		// strip tags
		for (var i = selectors.length - 1; i > 0; i--) {
			var selector = selectors[i];
			selectors.splice(i, 1);
			var cssSeletor = selectors.getCssSelector();
			var newSelectedElements = this.query(cssSeletor);
			// if results doesn't match then undo changes
			if (!compareElements(newSelectedElements)) {
				selectors.splice(i, 0, selector);
			}
		}

		return selectors;
	},
	getElementSelectors: function (elements, top) {
		var elementSelectors = [];

		for (var i = 0; i < elements.length; i++) {
			var element = elements[i];
			var elementSelector = this.getElementSelector(element, top);
			elementSelectors.push(elementSelector);
		}

		return elementSelectors;
	},
	getElementSelector: function (element, top) {

		var elementSelectorList = new ElementSelectorList(this);
		while (true) {
			if (element === this.parent) {
				break;
			}
			else if (element === undefined || element === this.document) {
				throw 'element is not a child of the given parent';
			}
			if (this.isIgnoredTag(element.tagName)) {

				element = element.parentNode;
				continue;
			}
			if (top > 0) {
				top--;
				element = element.parentNode;
				continue;
			}

			var selector = new ElementSelector(element, this.ignoredClasses);
			// document does not have a tagName
			if(element.parentNode === this.document || this.isIgnoredTag(element.parentNode.tagName)) {
				selector.isDirectChild = false;
			}

			elementSelectorList.push(selector);
			element = element.parentNode;
		}

		return elementSelectorList;
	},

    /**
     * Compares whether two elements are similar. Similar elements should
     * have a common parrent and all parent elements should be the same type.
     * @param element1
     * @param element2
     */
    checkSimilarElements: function(element1, element2) {

        while (true) {

            if(element1.tagName !== element2.tagName) {
                return false;
            }
            if(element1 === element2) {
                return true;
            }

            // stop at body tag
            if (element1 === undefined || element1.tagName === 'body'
                || element1.tagName === 'BODY') {
                return false;
            }
            if (element2 === undefined || element2.tagName === 'body'
                || element2.tagName === 'BODY') {
                return false;
            }

            element1 = element1.parentNode;
            element2 = element2.parentNode;
        }
    },

    /**
     * Groups elements into groups if the emelents are not similar
     * @param elements
     */
    getElementGroups: function(elements) {

        // first elment is in the first group
        // @TODO maybe i dont need this?
        var groups = [[elements[0]]];

        for(var i = 1; i < elements.length; i++) {
            var elementNew = elements[i];
            var addedToGroup = false;
            for(var j = 0; j < groups.length; j++) {
                var group = groups[j];
                var elementGroup = group[0];
                if(this.checkSimilarElements(elementNew, elementGroup)) {
                    group.push(elementNew);
                    addedToGroup = true;
                    break;
                }
            }

            // add new group
            if(!addedToGroup) {
                groups.push([elementNew]);
            }
        }

        return groups;
    },
	getCssSelector: function (elements, top) {

		top = top || 0;

		var enableSmartTableSelector = this.enableSmartTableSelector;
		if (elements.length > 1) {
			this.enableSmartTableSelector = false;
		}

        // group elements into similarity groups
        var elementGroups = this.getElementGroups(elements);

        var resultCSSSelector;

        if(this.allowMultipleSelectors) {

            var groupSelectors = [];

            for(var i = 0; i < elementGroups.length; i++) {
                var groupElements = elementGroups[i];

                var elementSelectors = this.getElementSelectors(groupElements, top);
                var resultSelector = this.mergeElementSelectors(elementSelectors);
                if (this.enableResultStripping) {
                    resultSelector = this.stripSelector(resultSelector);
                }

                groupSelectors.push(resultSelector.getCssSelector());
            }

            resultCSSSelector = groupSelectors.join(', ');
        }
        else {
            if(elementGroups.length !== 1) {
                throw "found multiple element groups, but allowMultipleSelectors disabled";
            }

            var elementSelectors = this.getElementSelectors(elements, top);
            var resultSelector = this.mergeElementSelectors(elementSelectors);
            if (this.enableResultStripping) {
                resultSelector = this.stripSelector(resultSelector);
            }

            resultCSSSelector = resultSelector.getCssSelector();
        }

		this.enableSmartTableSelector = enableSmartTableSelector;

		// strip down selector
		return resultCSSSelector;
	},
	isIgnoredTag: function (tag) {
		return this.ignoredTags.indexOf(tag.toLowerCase()) !== -1;
	}
};

},{}],30:[function(require,module,exports){

module.exports = require('./lib/jquery-deferred');
},{"./lib/jquery-deferred":33}],31:[function(require,module,exports){
var jQuery = module.exports = require("./jquery-core.js"),
	core_rspace = /\s+/;
/**
* jQuery Callbacks
*
* Code from: https://github.com/jquery/jquery/blob/master/src/callbacks.js
*
*/


// String to Object options format cache
var optionsCache = {};

// Convert String-formatted options into Object-formatted ones and store in cache
function createOptions( options ) {
	var object = optionsCache[ options ] = {};
	jQuery.each( options.split( core_rspace ), function( _, flag ) {
		object[ flag ] = true;
	});
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	options = typeof options === "string" ?
		( optionsCache[ options ] || createOptions( options ) ) :
		jQuery.extend( {}, options );

	var // Last fire value (for non-forgettable lists)
		memory,
		// Flag to know if list was already fired
		fired,
		// Flag to know if list is currently firing
		firing,
		// First callback to fire (used internally by add and fireWith)
		firingStart,
		// End of the loop when firing
		firingLength,
		// Index of currently firing callback (modified by remove if needed)
		firingIndex,
		// Actual callback list
		list = [],
		// Stack of fire calls for repeatable lists
		stack = !options.once && [],
		// Fire callbacks
		fire = function( data ) {
			memory = options.memory && data;
			fired = true;
			firingIndex = firingStart || 0;
			firingStart = 0;
			firingLength = list.length;
			firing = true;
			for ( ; list && firingIndex < firingLength; firingIndex++ ) {
				if ( list[ firingIndex ].apply( data[ 0 ], data[ 1 ] ) === false && options.stopOnFalse ) {
					memory = false; // To prevent further calls using add
					break;
				}
			}
			firing = false;
			if ( list ) {
				if ( stack ) {
					if ( stack.length ) {
						fire( stack.shift() );
					}
				} else if ( memory ) {
					list = [];
				} else {
					self.disable();
				}
			}
		},
		// Actual Callbacks object
		self = {
			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {
					// First, we save the current length
					var start = list.length;
					(function add( args ) {
						jQuery.each( args, function( _, arg ) {
							var type = jQuery.type( arg );
							if ( type === "function" ) {
								if ( !options.unique || !self.has( arg ) ) {
									list.push( arg );
								}
							} else if ( arg && arg.length && type !== "string" ) {
								// Inspect recursively
								add( arg );
							}
						});
					})( arguments );
					// Do we need to add the callbacks to the
					// current firing batch?
					if ( firing ) {
						firingLength = list.length;
					// With memory, if we're not firing then
					// we should call right away
					} else if ( memory ) {
						firingStart = start;
						fire( memory );
					}
				}
				return this;
			},
			// Remove a callback from the list
			remove: function() {
				if ( list ) {
					jQuery.each( arguments, function( _, arg ) {
						var index;
						while( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
							list.splice( index, 1 );
							// Handle firing indexes
							if ( firing ) {
								if ( index <= firingLength ) {
									firingLength--;
								}
								if ( index <= firingIndex ) {
									firingIndex--;
								}
							}
						}
					});
				}
				return this;
			},
			// Control if a given callback is in the list
			has: function( fn ) {
				return jQuery.inArray( fn, list ) > -1;
			},
			// Remove all callbacks from the list
			empty: function() {
				list = [];
				return this;
			},
			// Have the list do nothing anymore
			disable: function() {
				list = stack = memory = undefined;
				return this;
			},
			// Is it disabled?
			disabled: function() {
				return !list;
			},
			// Lock the list in its current state
			lock: function() {
				stack = undefined;
				if ( !memory ) {
					self.disable();
				}
				return this;
			},
			// Is it locked?
			locked: function() {
				return !stack;
			},
			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				args = args || [];
				args = [ context, args.slice ? args.slice() : args ];
				if ( list && ( !fired || stack ) ) {
					if ( firing ) {
						stack.push( args );
					} else {
						fire( args );
					}
				}
				return this;
			},
			// Call all the callbacks with the given arguments
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},
			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};


},{"./jquery-core.js":32}],32:[function(require,module,exports){
/**
* jQuery core object.
*
* Worker with jQuery deferred
*
* Code from: https://github.com/jquery/jquery/blob/master/src/core.js
*
*/

var jQuery = module.exports = {
	type: type
	, isArray: isArray
	, isFunction: isFunction
	, isPlainObject: isPlainObject
	, each: each
	, extend: extend
	, noop: function() {}
};

var toString = Object.prototype.toString;

var class2type = {};
// Populate the class2type map
"Boolean Number String Function Array Date RegExp Object".split(" ").forEach(function(name) {
	class2type[ "[object " + name + "]" ] = name.toLowerCase();
});


function type( obj ) {
	return obj == null ?
		String( obj ) :
			class2type[ toString.call(obj) ] || "object";
}

function isFunction( obj ) {
	return jQuery.type(obj) === "function";
}

function isArray( obj ) {
	return jQuery.type(obj) === "array";
}

function each( object, callback, args ) {
	var name, i = 0,
	length = object.length,
	isObj = length === undefined || isFunction( object );

	if ( args ) {
		if ( isObj ) {
			for ( name in object ) {
				if ( callback.apply( object[ name ], args ) === false ) {
					break;
				}
			}
		} else {
			for ( ; i < length; ) {
				if ( callback.apply( object[ i++ ], args ) === false ) {
					break;
				}
			}
		}

		// A special, fast, case for the most common use of each
	} else {
		if ( isObj ) {
			for ( name in object ) {
				if ( callback.call( object[ name ], name, object[ name ] ) === false ) {
					break;
				}
			}
		} else {
			for ( ; i < length; ) {
				if ( callback.call( object[ i ], i, object[ i++ ] ) === false ) {
					break;
				}
			}
		}
	}

	return object;
}

function isPlainObject( obj ) {
	// Must be an Object.
	if ( !obj || jQuery.type(obj) !== "object" ) {
		return false;
	}
	return true;
}

function extend() {
	var options, name, src, copy, copyIsArray, clone,
	target = arguments[0] || {},
	i = 1,
	length = arguments.length,
	deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !jQuery.isFunction(target) ) {
		target = {};
	}

	// extend jQuery itself if only one argument is passed
	if ( length === i ) {
		target = this;
		--i;
	}

	for ( ; i < length; i++ ) {
		// Only deal with non-null/undefined values
		if ( (options = arguments[ i ]) != null ) {
			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// Prevent never-ending loop
				if ( target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)) ) ) {
					if ( copyIsArray ) {
						copyIsArray = false;
						clone = src && jQuery.isArray(src) ? src : [];

					} else {
						clone = src && jQuery.isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[ name ] = jQuery.extend( deep, clone, copy );

					// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};



},{}],33:[function(require,module,exports){

/*!
* jquery-deferred
* Copyright(c) 2011 Hidden <zzdhidden@gmail.com>
* MIT Licensed
*/

/**
* Library version.
*/

var jQuery = module.exports = require("./jquery-callbacks.js"),
	core_slice = Array.prototype.slice;

/**
* jQuery deferred
*
* Code from: https://github.com/jquery/jquery/blob/master/src/deferred.js
* Doc: http://api.jquery.com/category/deferred-object/
*
*/

jQuery.extend({

	Deferred: function( func ) {
		var tuples = [
				// action, add listener, listener list, final state
				[ "resolve", "done", jQuery.Callbacks("once memory"), "resolved" ],
				[ "reject", "fail", jQuery.Callbacks("once memory"), "rejected" ],
				[ "notify", "progress", jQuery.Callbacks("memory") ]
			],
			state = "pending",
			promise = {
				state: function() {
					return state;
				},
				always: function() {
					deferred.done( arguments ).fail( arguments );
					return this;
				},
				then: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;
					return jQuery.Deferred(function( newDefer ) {
						jQuery.each( tuples, function( i, tuple ) {
							var action = tuple[ 0 ],
								fn = fns[ i ];
							// deferred[ done | fail | progress ] for forwarding actions to newDefer
							deferred[ tuple[1] ]( jQuery.isFunction( fn ) ?
								function() {
									var returned = fn.apply( this, arguments );
									if ( returned && jQuery.isFunction( returned.promise ) ) {
										returned.promise()
											.done( newDefer.resolve )
											.fail( newDefer.reject )
											.progress( newDefer.notify );
									} else {
										newDefer[ action + "With" ]( this === deferred ? newDefer : this, [ returned ] );
									}
								} :
								newDefer[ action ]
							);
						});
						fns = null;
					}).promise();
				},
				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					return obj != null ? jQuery.extend( obj, promise ) : promise;
				}
			},
			deferred = {};

		// Keep pipe for back-compat
		promise.pipe = promise.then;

		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 3 ];

			// promise[ done | fail | progress ] = list.add
			promise[ tuple[1] ] = list.add;

			// Handle state
			if ( stateString ) {
				list.add(function() {
					// state = [ resolved | rejected ]
					state = stateString;

				// [ reject_list | resolve_list ].disable; progress_list.lock
				}, tuples[ i ^ 1 ][ 2 ].disable, tuples[ 2 ][ 2 ].lock );
			}

			// deferred[ resolve | reject | notify ] = list.fire
			deferred[ tuple[0] ] = list.fire;
			deferred[ tuple[0] + "With" ] = list.fireWith;
		});

		// Make the deferred a promise
		promise.promise( deferred );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	},

	// Deferred helper
	when: function( subordinate /* , ..., subordinateN */ ) {
		var i = 0,
			resolveValues = core_slice.call( arguments ),
			length = resolveValues.length,

			// the count of uncompleted subordinates
			remaining = length !== 1 || ( subordinate && jQuery.isFunction( subordinate.promise ) ) ? length : 0,

			// the master Deferred. If resolveValues consist of only a single Deferred, just use that.
			deferred = remaining === 1 ? subordinate : jQuery.Deferred(),

			// Update function for both resolve and progress values
			updateFunc = function( i, contexts, values ) {
				return function( value ) {
					contexts[ i ] = this;
					values[ i ] = arguments.length > 1 ? core_slice.call( arguments ) : value;
					if( values === progressValues ) {
						deferred.notifyWith( contexts, values );
					} else if ( !( --remaining ) ) {
						deferred.resolveWith( contexts, values );
					}
				};
			},

			progressValues, progressContexts, resolveContexts;

		// add listeners to Deferred subordinates; treat others as resolved
		if ( length > 1 ) {
			progressValues = new Array( length );
			progressContexts = new Array( length );
			resolveContexts = new Array( length );
			for ( ; i < length; i++ ) {
				if ( resolveValues[ i ] && jQuery.isFunction( resolveValues[ i ].promise ) ) {
					resolveValues[ i ].promise()
						.done( updateFunc( i, resolveContexts, resolveValues ) )
						.fail( deferred.reject )
						.progress( updateFunc( i, progressContexts, progressValues ) );
				} else {
					--remaining;
				}
			}
		}

		// if we're not waiting on anything, resolve the master
		if ( !remaining ) {
			deferred.resolveWith( resolveContexts, resolveValues );
		}

		return deferred.promise();
	}
});

},{"./jquery-callbacks.js":31}]},{},[3])(3)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJleHRlbnNpb24vYXNzZXRzL2Jhc2U2NC5qcyIsImV4dGVuc2lvbi9hc3NldHMvanF1ZXJ5LndoZW5jYWxsc2VxdWVudGlhbGx5LmpzIiwiZXh0ZW5zaW9uL2JhY2tncm91bmRfcGFnZS9iYWNrZ3JvdW5kX3NjcmlwdC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL0JhY2tncm91bmRTY3JpcHQuanMiLCJleHRlbnNpb24vc2NyaXB0cy9DaHJvbWVQb3B1cEJyb3dzZXIuanMiLCJleHRlbnNpb24vc2NyaXB0cy9Db25maWcuanMiLCJleHRlbnNpb24vc2NyaXB0cy9FbGVtZW50UXVlcnkuanMiLCJleHRlbnNpb24vc2NyaXB0cy9Kb2IuanMiLCJleHRlbnNpb24vc2NyaXB0cy9RdWV1ZS5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NjcmFwZXIuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9yL1NlbGVjdG9yRWxlbWVudC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9yL1NlbGVjdG9yRWxlbWVudEF0dHJpYnV0ZS5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9yL1NlbGVjdG9yRWxlbWVudENsaWNrLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IvU2VsZWN0b3JFbGVtZW50U2Nyb2xsLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IvU2VsZWN0b3JHcm91cC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9yL1NlbGVjdG9ySFRNTC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9yL1NlbGVjdG9ySW1hZ2UuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckxpbmsuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvclBvcHVwTGluay5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9yL1NlbGVjdG9yVGFibGUuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvclRleHQuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvckxpc3QuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3RvcnMuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TaXRlbWFwLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU3RvcmUuanMiLCJleHRlbnNpb24vc2NyaXB0cy9VbmlxdWVFbGVtZW50TGlzdC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL2dldEJhY2tncm91bmRTY3JpcHQuanMiLCJub2RlX21vZHVsZXMvY3NzLXNlbGVjdG9yL2xpYi9Dc3NTZWxlY3Rvci5qcyIsIm5vZGVfbW9kdWxlcy9qcXVlcnktZGVmZXJyZWQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvanF1ZXJ5LWRlZmVycmVkL2xpYi9qcXVlcnktY2FsbGJhY2tzLmpzIiwibm9kZV9tb2R1bGVzL2pxdWVyeS1kZWZlcnJlZC9saWIvanF1ZXJ5LWNvcmUuanMiLCJub2RlX21vZHVsZXMvanF1ZXJ5LWRlZmVycmVkL2xpYi9qcXVlcnktZGVmZXJyZWQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdk5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3ZUE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbi8qKlxuICogQHVybCBodHRwOi8vanNwZXJmLmNvbS9ibG9iLWJhc2U2NC1jb252ZXJzaW9uXG4gKiBAdHlwZSB7e2Jsb2JUb0Jhc2U2NDogYmxvYlRvQmFzZTY0LCBiYXNlNjRUb0Jsb2I6IGJhc2U2NFRvQmxvYn19XG4gKi9cbnZhciBCYXNlNjQgPSB7XG5cbiAgYmxvYlRvQmFzZTY0OiBmdW5jdGlvbiAoYmxvYikge1xuICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgZGF0YVVybCA9IHJlYWRlci5yZXN1bHRcbiAgICAgIHZhciBiYXNlNjQgPSBkYXRhVXJsLnNwbGl0KCcsJylbMV1cbiAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZShiYXNlNjQpXG4gICAgfVxuICAgIHJlYWRlci5yZWFkQXNEYXRhVVJMKGJsb2IpXG5cbiAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZS5wcm9taXNlKClcbiAgfSxcblxuICBiYXNlNjRUb0Jsb2I6IGZ1bmN0aW9uIChiYXNlNjQsIG1pbWVUeXBlKSB7XG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciBiaW5hcnkgPSBhdG9iKGJhc2U2NClcbiAgICB2YXIgbGVuID0gYmluYXJ5Lmxlbmd0aFxuICAgIHZhciBidWZmZXIgPSBuZXcgQXJyYXlCdWZmZXIobGVuKVxuICAgIHZhciB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyKVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHZpZXdbaV0gPSBiaW5hcnkuY2hhckNvZGVBdChpKVxuICAgIH1cbiAgICB2YXIgYmxvYiA9IG5ldyBCbG9iKFt2aWV3XSwge3R5cGU6IG1pbWVUeXBlfSlcbiAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUoYmxvYilcblxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQmFzZTY0XG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbi8qKlxuICogQGF1dGhvciBNYXJ0aW5zIEJhbG9kaXNcbiAqXG4gKiBBbiBhbHRlcm5hdGl2ZSB2ZXJzaW9uIG9mICQud2hlbiB3aGljaCBjYW4gYmUgdXNlZCB0byBleGVjdXRlIGFzeW5jaHJvbm91c1xuICogY2FsbHMgc2VxdWVudGlhbGx5IG9uZSBhZnRlciBhbm90aGVyLlxuICpcbiAqIEByZXR1cm5zIGpxdWVyeURlZmVycmVkKCkucHJvbWlzZSgpXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gd2hlbkNhbGxTZXF1ZW50aWFsbHkgKGZ1bmN0aW9uQ2FsbHMpIHtcbiAgdmFyIGRlZmVycmVkUmVzb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gIHZhciByZXN1bHREYXRhID0gW11cblxuXHQvLyBub3RoaW5nIHRvIGRvXG4gIGlmIChmdW5jdGlvbkNhbGxzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBkZWZlcnJlZFJlc29uc2UucmVzb2x2ZShyZXN1bHREYXRhKS5wcm9taXNlKClcbiAgfVxuXG4gIHZhciBjdXJyZW50RGVmZXJyZWQgPSBmdW5jdGlvbkNhbGxzLnNoaWZ0KCkoKVxuXHQvLyBleGVjdXRlIHN5bmNocm9ub3VzIGNhbGxzIHN5bmNocm9ub3VzbHlcbiAgd2hpbGUgKGN1cnJlbnREZWZlcnJlZC5zdGF0ZSgpID09PSAncmVzb2x2ZWQnKSB7XG4gICAgY3VycmVudERlZmVycmVkLmRvbmUoZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgIHJlc3VsdERhdGEucHVzaChkYXRhKVxuICAgIH0pXG4gICAgaWYgKGZ1bmN0aW9uQ2FsbHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gZGVmZXJyZWRSZXNvbnNlLnJlc29sdmUocmVzdWx0RGF0YSkucHJvbWlzZSgpXG4gICAgfVxuICAgIGN1cnJlbnREZWZlcnJlZCA9IGZ1bmN0aW9uQ2FsbHMuc2hpZnQoKSgpXG4gIH1cblxuXHQvLyBoYW5kbGUgYXN5bmMgY2FsbHNcbiAgdmFyIGludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuXHRcdC8vIGhhbmRsZSBtaXhlZCBzeW5jIGNhbGxzXG4gICAgd2hpbGUgKGN1cnJlbnREZWZlcnJlZC5zdGF0ZSgpID09PSAncmVzb2x2ZWQnKSB7XG4gICAgICBjdXJyZW50RGVmZXJyZWQuZG9uZShmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICByZXN1bHREYXRhLnB1c2goZGF0YSlcbiAgICAgIH0pXG4gICAgICBpZiAoZnVuY3Rpb25DYWxscy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbClcbiAgICAgICAgZGVmZXJyZWRSZXNvbnNlLnJlc29sdmUocmVzdWx0RGF0YSlcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGN1cnJlbnREZWZlcnJlZCA9IGZ1bmN0aW9uQ2FsbHMuc2hpZnQoKSgpXG4gICAgfVxuICB9LCAxMClcblxuICByZXR1cm4gZGVmZXJyZWRSZXNvbnNlLnByb21pc2UoKVxufVxuIiwidmFyIENvbmZpZyA9IHJlcXVpcmUoJy4uL3NjcmlwdHMvQ29uZmlnJylcbnZhciBTdG9yZSA9IHJlcXVpcmUoJy4uL3NjcmlwdHMvU3RvcmUnKVxudmFyIFNpdGVtYXAgPSByZXF1aXJlKCcuLi9zY3JpcHRzL1NpdGVtYXAnKVxudmFyIFF1ZXVlID0gcmVxdWlyZSgnLi4vc2NyaXB0cy9RdWV1ZScpXG52YXIgU2NyYXBlciA9IHJlcXVpcmUoJy4uL3NjcmlwdHMvU2NyYXBlcicpXG52YXIgQ2hyb21lUG9wdXBCcm93c2VyID0gcmVxdWlyZSgnLi4vc2NyaXB0cy9DaHJvbWVQb3B1cEJyb3dzZXInKVxudmFyIGdldEJhY2tncm91bmRTY3JpcHQgPSByZXF1aXJlKCcuLi9zY3JpcHRzL2dldEJhY2tncm91bmRTY3JpcHQnKVxuXG52YXIgY29uZmlnID0gbmV3IENvbmZpZygpXG52YXIgc3RvcmVcbmNvbmZpZy5sb2FkQ29uZmlndXJhdGlvbihmdW5jdGlvbiAoKSB7XG4gIGNvbnNvbGUubG9nKCdpbml0aWFsIGNvbmZpZ3VyYXRpb24nLCBjb25maWcpXG4gIHN0b3JlID0gbmV3IFN0b3JlKGNvbmZpZywgeyR9KVxufSlcblxuY2hyb21lLnN0b3JhZ2Uub25DaGFuZ2VkLmFkZExpc3RlbmVyKGZ1bmN0aW9uICgpIHtcbiAgY29uZmlnLmxvYWRDb25maWd1cmF0aW9uKGZ1bmN0aW9uICgpIHtcbiAgICBjb25zb2xlLmxvZygnY29uZmlndXJhdGlvbiBjaGFuZ2VkJywgY29uZmlnKVxuICAgIHN0b3JlID0gbmV3IFN0b3JlKGNvbmZpZywgeyR9KVxuICB9KVxufSlcblxudmFyIHNlbmRUb0FjdGl2ZVRhYiA9IGZ1bmN0aW9uIChyZXF1ZXN0LCBjYWxsYmFjaykge1xuICBjaHJvbWUudGFicy5xdWVyeSh7XG4gICAgYWN0aXZlOiB0cnVlLFxuICAgIGN1cnJlbnRXaW5kb3c6IHRydWVcbiAgfSwgZnVuY3Rpb24gKHRhYnMpIHtcbiAgICBpZiAodGFicy5sZW5ndGggPCAxKSB7XG4gICAgICB0aGlzLmNvbnNvbGUubG9nKFwiY291bGRuJ3QgZmluZCBhY3RpdmUgdGFiXCIpXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciB0YWIgPSB0YWJzWzBdXG4gICAgICBjaHJvbWUudGFicy5zZW5kTWVzc2FnZSh0YWIuaWQsIHJlcXVlc3QsIGNhbGxiYWNrKVxuICAgIH1cbiAgfSlcbn1cblxuY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKFxuXHRmdW5jdGlvbiAocmVxdWVzdCwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpIHtcbiAgY29uc29sZS5sb2coJ2Nocm9tZS5ydW50aW1lLm9uTWVzc2FnZScsIHJlcXVlc3QpXG5cbiAgaWYgKHJlcXVlc3QuY3JlYXRlU2l0ZW1hcCkge1xuICAgIHN0b3JlLmNyZWF0ZVNpdGVtYXAocmVxdWVzdC5zaXRlbWFwLCBzZW5kUmVzcG9uc2UpXG4gICAgcmV0dXJuIHRydWVcbiAgfSBlbHNlIGlmIChyZXF1ZXN0LnNhdmVTaXRlbWFwKSB7XG4gICAgc3RvcmUuc2F2ZVNpdGVtYXAocmVxdWVzdC5zaXRlbWFwLCBzZW5kUmVzcG9uc2UpXG4gICAgcmV0dXJuIHRydWVcbiAgfSBlbHNlIGlmIChyZXF1ZXN0LmRlbGV0ZVNpdGVtYXApIHtcbiAgICBzdG9yZS5kZWxldGVTaXRlbWFwKHJlcXVlc3Quc2l0ZW1hcCwgc2VuZFJlc3BvbnNlKVxuICAgIHJldHVybiB0cnVlXG4gIH0gZWxzZSBpZiAocmVxdWVzdC5nZXRBbGxTaXRlbWFwcykge1xuICAgIHN0b3JlLmdldEFsbFNpdGVtYXBzKHNlbmRSZXNwb25zZSlcbiAgICByZXR1cm4gdHJ1ZVxuICB9IGVsc2UgaWYgKHJlcXVlc3Quc2l0ZW1hcEV4aXN0cykge1xuICAgIHN0b3JlLnNpdGVtYXBFeGlzdHMocmVxdWVzdC5zaXRlbWFwSWQsIHNlbmRSZXNwb25zZSlcbiAgICByZXR1cm4gdHJ1ZVxuICB9IGVsc2UgaWYgKHJlcXVlc3QuZ2V0U2l0ZW1hcERhdGEpIHtcbiAgICBzdG9yZS5nZXRTaXRlbWFwRGF0YShuZXcgU2l0ZW1hcChyZXF1ZXN0LnNpdGVtYXApLCBzZW5kUmVzcG9uc2UpXG4gICAgcmV0dXJuIHRydWVcbiAgfSBlbHNlIGlmIChyZXF1ZXN0LnNjcmFwZVNpdGVtYXApIHtcbiAgICB2YXIgc2l0ZW1hcCA9IG5ldyBTaXRlbWFwKHJlcXVlc3Quc2l0ZW1hcCwgeyR9KVxuICAgIHZhciBxdWV1ZSA9IG5ldyBRdWV1ZSgpXG4gICAgdmFyIGJyb3dzZXIgPSBuZXcgQ2hyb21lUG9wdXBCcm93c2VyKHtcbiAgICAgIHBhZ2VMb2FkRGVsYXk6IHJlcXVlc3QucGFnZUxvYWREZWxheVxuICAgIH0pXG5cbiAgICB2YXIgc2NyYXBlciA9IG5ldyBTY3JhcGVyKHtcbiAgICAgIHF1ZXVlOiBxdWV1ZSxcbiAgICAgIHNpdGVtYXA6IHNpdGVtYXAsXG4gICAgICBicm93c2VyOiBicm93c2VyLFxuICAgICAgc3RvcmU6IHN0b3JlLFxuICAgICAgcmVxdWVzdEludGVydmFsOiByZXF1ZXN0LnJlcXVlc3RJbnRlcnZhbFxuICAgIH0sIHskfSlcblxuICAgIHRyeSB7XG4gICAgICBzY3JhcGVyLnJ1bihmdW5jdGlvbiAoKSB7XG4gICAgICAgIGJyb3dzZXIuY2xvc2UoKVxuICAgICAgICB2YXIgbm90aWZpY2F0aW9uID0gY2hyb21lLm5vdGlmaWNhdGlvbnMuY3JlYXRlKCdzY3JhcGluZy1maW5pc2hlZCcsIHtcbiAgICAgICAgICB0eXBlOiAnYmFzaWMnLFxuICAgICAgICAgIGljb25Vcmw6ICdhc3NldHMvaW1hZ2VzL2ljb24xMjgucG5nJyxcbiAgICAgICAgICB0aXRsZTogJ1NjcmFwaW5nIGZpbmlzaGVkIScsXG4gICAgICAgICAgbWVzc2FnZTogJ0ZpbmlzaGVkIHNjcmFwaW5nICcgKyBzaXRlbWFwLl9pZFxuICAgICAgICB9LCBmdW5jdGlvbiAoaWQpIHtcblx0XHRcdFx0XHRcdC8vIG5vdGlmaWNhdGlvbiBzaG93ZWRcbiAgICAgICAgfSlcbiAgICAgICAgc2VuZFJlc3BvbnNlKClcbiAgICAgIH0pXG4gICAgfVx0XHRcdGNhdGNoIChlKSB7XG4gICAgICBjb25zb2xlLmxvZygnU2NyYXBlciBleGVjdXRpb24gY2FuY2VsbGVkJy5lKVxuICAgIH1cblxuICAgIHJldHVybiB0cnVlXG4gIH0gZWxzZSBpZiAocmVxdWVzdC5wcmV2aWV3U2VsZWN0b3JEYXRhKSB7XG4gICAgY2hyb21lLnRhYnMucXVlcnkoe1xuICAgICAgYWN0aXZlOiB0cnVlLFxuICAgICAgY3VycmVudFdpbmRvdzogdHJ1ZVxuICAgIH0sIGZ1bmN0aW9uICh0YWJzKSB7XG4gICAgICBpZiAodGFicy5sZW5ndGggPCAxKSB7XG4gICAgICAgIHRoaXMuY29uc29sZS5sb2coXCJjb3VsZG4ndCBmaW5kIGFjdGl2ZSB0YWJcIilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB0YWIgPSB0YWJzWzBdXG4gICAgICAgIGNocm9tZS50YWJzLnNlbmRNZXNzYWdlKHRhYi5pZCwgcmVxdWVzdCwgc2VuZFJlc3BvbnNlKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIHRydWVcbiAgfSBlbHNlIGlmIChyZXF1ZXN0LmJhY2tncm91bmRTY3JpcHRDYWxsKSB7XG4gICAgdmFyIGJhY2tncm91bmRTY3JpcHQgPSBnZXRCYWNrZ3JvdW5kU2NyaXB0KCdCYWNrZ3JvdW5kU2NyaXB0JylcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGJhY2tncm91bmRTY3JpcHRbcmVxdWVzdC5mbl0ocmVxdWVzdC5yZXF1ZXN0KVxuICAgIGRlZmVycmVkUmVzcG9uc2UuZG9uZShmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgIHNlbmRSZXNwb25zZShyZXNwb25zZSlcbiAgICB9KVxuXG4gICAgcmV0dXJuIHRydWVcbiAgfVxufVxuKVxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG4vKipcbiAqIENvbnRlbnRTY3JpcHQgdGhhdCBjYW4gYmUgY2FsbGVkIGZyb20gYW55d2hlcmUgd2l0aGluIHRoZSBleHRlbnNpb25cbiAqL1xudmFyIEJhY2tncm91bmRTY3JpcHQgPSB7XG5cbiAgZHVtbXk6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ganF1ZXJ5LkRlZmVycmVkKCkucmVzb2x2ZSgnZHVtbXknKS5wcm9taXNlKClcbiAgfSxcblxuXHQvKipcblx0ICogUmV0dXJucyB0aGUgaWQgb2YgdGhlIHRhYiB0aGF0IGlzIHZpc2libGUgdG8gdXNlclxuXHQgKiBAcmV0dXJucyBqcXVlcnkuRGVmZXJyZWQoKSBpbnRlZ2VyXG5cdCAqL1xuICBnZXRBY3RpdmVUYWJJZDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICAgIGNocm9tZS50YWJzLnF1ZXJ5KHtcbiAgICAgIGFjdGl2ZTogdHJ1ZSxcbiAgICAgIGN1cnJlbnRXaW5kb3c6IHRydWVcbiAgICB9LCBmdW5jdGlvbiAodGFicykge1xuICAgICAgaWYgKHRhYnMubGVuZ3RoIDwgMSkge1xuXHRcdFx0XHQvLyBAVE9ETyBtdXN0IGJlIHJ1bm5pbmcgd2l0aGluIHBvcHVwLiBtYXliZSBmaW5kIGFub3RoZXIgYWN0aXZlIHdpbmRvdz9cbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZWplY3QoXCJjb3VsZG4ndCBmaW5kIHRoZSBhY3RpdmUgdGFiXCIpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgdGFiSWQgPSB0YWJzWzBdLmlkXG4gICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZSh0YWJJZClcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBFeGVjdXRlIGEgZnVuY3Rpb24gd2l0aGluIHRoZSBhY3RpdmUgdGFiIHdpdGhpbiBjb250ZW50IHNjcmlwdFxuXHQgKiBAcGFyYW0gcmVxdWVzdC5mblx0ZnVuY3Rpb24gdG8gY2FsbFxuXHQgKiBAcGFyYW0gcmVxdWVzdC5yZXF1ZXN0XHRyZXF1ZXN0IHRoYXQgd2lsbCBiZSBwYXNzZWQgdG8gdGhlIGZ1bmN0aW9uXG5cdCAqL1xuICBleGVjdXRlQ29udGVudFNjcmlwdDogZnVuY3Rpb24gKHJlcXVlc3QpIHtcbiAgICB2YXIgcmVxVG9Db250ZW50U2NyaXB0ID0ge1xuICAgICAgY29udGVudFNjcmlwdENhbGw6IHRydWUsXG4gICAgICBmbjogcmVxdWVzdC5mbixcbiAgICAgIHJlcXVlc3Q6IHJlcXVlc3QucmVxdWVzdFxuICAgIH1cbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIGRlZmVycmVkQWN0aXZlVGFiSWQgPSB0aGlzLmdldEFjdGl2ZVRhYklkKClcbiAgICBkZWZlcnJlZEFjdGl2ZVRhYklkLmRvbmUoZnVuY3Rpb24gKHRhYklkKSB7XG4gICAgICBjaHJvbWUudGFicy5zZW5kTWVzc2FnZSh0YWJJZCwgcmVxVG9Db250ZW50U2NyaXB0LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKHJlc3BvbnNlKVxuICAgICAgfSlcbiAgICB9KVxuXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2VcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tncm91bmRTY3JpcHRcbiIsInZhciBDaHJvbWVQb3B1cEJyb3dzZXIgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICB0aGlzLnBhZ2VMb2FkRGVsYXkgPSBvcHRpb25zLnBhZ2VMb2FkRGVsYXlcblxuXHQvLyBAVE9ETyBzb21laG93IGhhbmRsZSB0aGUgY2xvc2VkIHdpbmRvd1xufVxuXG5DaHJvbWVQb3B1cEJyb3dzZXIucHJvdG90eXBlID0ge1xuXG4gIF9pbml0UG9wdXBXaW5kb3c6IGZ1bmN0aW9uIChjYWxsYmFjaywgc2NvcGUpIHtcbiAgICB2YXIgYnJvd3NlciA9IHRoaXNcbiAgICBpZiAodGhpcy53aW5kb3cgIT09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkodGhpcy53aW5kb3cpKVxuXHRcdFx0Ly8gY2hlY2sgaWYgdGFiIGV4aXN0c1xuICAgICAgY2hyb21lLnRhYnMuZ2V0KHRoaXMudGFiLmlkLCBmdW5jdGlvbiAodGFiKSB7XG4gICAgICAgIGlmICghdGFiKSB7XG4gICAgICAgICAgdGhyb3cgJ1NjcmFwaW5nIHdpbmRvdyBjbG9zZWQnXG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIGNhbGxiYWNrLmNhbGwoc2NvcGUpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjaHJvbWUud2luZG93cy5jcmVhdGUoeyd0eXBlJzogJ3BvcHVwJywgd2lkdGg6IDEwNDIsIGhlaWdodDogNzY4LCBmb2N1c2VkOiB0cnVlLCB1cmw6ICdjaHJvbWU6Ly9uZXd0YWInfSwgZnVuY3Rpb24gKHdpbmRvdykge1xuICAgICAgYnJvd3Nlci53aW5kb3cgPSB3aW5kb3dcbiAgICAgIGJyb3dzZXIudGFiID0gd2luZG93LnRhYnNbMF1cblxuICAgICAgY2FsbGJhY2suY2FsbChzY29wZSlcbiAgICB9KVxuICB9LFxuXG4gIGxvYWRVcmw6IGZ1bmN0aW9uICh1cmwsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHRhYiA9IHRoaXMudGFiXG5cbiAgICB2YXIgdGFiTG9hZExpc3RlbmVyID0gZnVuY3Rpb24gKHRhYklkLCBjaGFuZ2VJbmZvLCB0YWIpIHtcbiAgICAgIGlmICh0YWJJZCA9PT0gdGhpcy50YWIuaWQpIHtcbiAgICAgICAgaWYgKGNoYW5nZUluZm8uc3RhdHVzID09PSAnY29tcGxldGUnKSB7XG5cdFx0XHRcdFx0Ly8gQFRPRE8gY2hlY2sgdXJsID8gbWF5YmUgaXQgd291bGQgYmUgYmFkIGJlY2F1c2Ugc29tZSBzaXRlcyBtaWdodCB1c2UgcmVkaXJlY3RzXG5cblx0XHRcdFx0XHQvLyByZW1vdmUgZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgICBjaHJvbWUudGFicy5vblVwZGF0ZWQucmVtb3ZlTGlzdGVuZXIodGFiTG9hZExpc3RlbmVyKVxuXG5cdFx0XHRcdFx0Ly8gY2FsbGJhY2sgdGFiIGlzIGxvYWRlZCBhZnRlciBwYWdlIGxvYWQgZGVsYXlcbiAgICAgICAgICBzZXRUaW1lb3V0KGNhbGxiYWNrLCB0aGlzLnBhZ2VMb2FkRGVsYXkpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcylcbiAgICBjaHJvbWUudGFicy5vblVwZGF0ZWQuYWRkTGlzdGVuZXIodGFiTG9hZExpc3RlbmVyKVxuXG4gICAgY2hyb21lLnRhYnMudXBkYXRlKHRhYi5pZCwge3VybDogdXJsfSlcbiAgfSxcblxuICBjbG9zZTogZnVuY3Rpb24gKCkge1xuICAgIGNocm9tZS53aW5kb3dzLnJlbW92ZSh0aGlzLndpbmRvdy5pZClcbiAgfSxcblxuICBmZXRjaERhdGE6IGZ1bmN0aW9uICh1cmwsIHNpdGVtYXAsIHBhcmVudFNlbGVjdG9ySWQsIGNhbGxiYWNrLCBzY29wZSkge1xuICAgIHZhciBicm93c2VyID0gdGhpc1xuXG4gICAgdGhpcy5faW5pdFBvcHVwV2luZG93KGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciB0YWIgPSBicm93c2VyLnRhYlxuICAgICAgY29uc29sZS5sb2coJ0luaXQgYnJvd3NlciBhcHAnKVxuICAgICAgYnJvd3Nlci5sb2FkVXJsKHVybCwgZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbWVzc2FnZSA9IHtcbiAgICAgICAgICBleHRyYWN0RGF0YTogdHJ1ZSxcbiAgICAgICAgICBzaXRlbWFwOiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHNpdGVtYXApKSxcbiAgICAgICAgICBwYXJlbnRTZWxlY3RvcklkOiBwYXJlbnRTZWxlY3RvcklkXG4gICAgICAgIH1cblxuICAgICAgICBjaHJvbWUudGFicy5zZW5kTWVzc2FnZSh0YWIuaWQsIG1lc3NhZ2UsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ2V4dHJhY3RlZCBkYXRhIGZyb20gd2ViIHBhZ2UnLCBkYXRhKVxuICAgICAgICAgIGNhbGxiYWNrLmNhbGwoc2NvcGUsIGRhdGEpXG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0sIHRoaXMpXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDaHJvbWVQb3B1cEJyb3dzZXJcbiIsInZhciBDb25maWcgPSBmdW5jdGlvbiAoKSB7XG5cbn1cblxuQ29uZmlnLnByb3RvdHlwZSA9IHtcblxuICBzaXRlbWFwRGI6ICc8dXNlIGxvYWRDb25maWd1cmF0aW9uKCk+JyxcbiAgZGF0YURiOiAnPHVzZSBsb2FkQ29uZmlndXJhdGlvbigpPicsXG5cbiAgZGVmYXVsdHM6IHtcbiAgICBzdG9yYWdlVHlwZTogJ2xvY2FsJyxcblx0XHQvLyB0aGlzIGlzIHdoZXJlIHNpdGVtYXAgZG9jdW1lbnRzIGFyZSBzdG9yZWRcbiAgICBzaXRlbWFwRGI6ICdzY3JhcGVyLXNpdGVtYXBzJyxcblx0XHQvLyB0aGlzIGlzIHdoZXJlIHNjcmFwZWQgZGF0YSBpcyBzdG9yZWQuXG5cdFx0Ly8gZW1wdHkgZm9yIGxvY2FsIHN0b3JhZ2VcbiAgICBkYXRhRGI6ICcnXG4gIH0sXG5cblx0LyoqXG5cdCAqIExvYWRzIGNvbmZpZ3VyYXRpb24gZnJvbSBjaHJvbWUgZXh0ZW5zaW9uIHN5bmMgc3RvcmFnZVxuXHQgKi9cbiAgbG9hZENvbmZpZ3VyYXRpb246IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIGNocm9tZS5zdG9yYWdlLnN5bmMuZ2V0KFsnc2l0ZW1hcERiJywgJ2RhdGFEYicsICdzdG9yYWdlVHlwZSddLCBmdW5jdGlvbiAoaXRlbXMpIHtcbiAgICAgIHRoaXMuc3RvcmFnZVR5cGUgPSBpdGVtcy5zdG9yYWdlVHlwZSB8fCB0aGlzLmRlZmF1bHRzLnN0b3JhZ2VUeXBlXG4gICAgICBpZiAodGhpcy5zdG9yYWdlVHlwZSA9PT0gJ2xvY2FsJykge1xuICAgICAgICB0aGlzLnNpdGVtYXBEYiA9IHRoaXMuZGVmYXVsdHMuc2l0ZW1hcERiXG4gICAgICAgIHRoaXMuZGF0YURiID0gdGhpcy5kZWZhdWx0cy5kYXRhRGJcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuc2l0ZW1hcERiID0gaXRlbXMuc2l0ZW1hcERiIHx8IHRoaXMuZGVmYXVsdHMuc2l0ZW1hcERiXG4gICAgICAgIHRoaXMuZGF0YURiID0gaXRlbXMuZGF0YURiIHx8IHRoaXMuZGVmYXVsdHMuZGF0YURiXG4gICAgICB9XG5cbiAgICAgIGNhbGxiYWNrKClcbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG5cblx0LyoqXG5cdCAqIFNhdmVzIGNvbmZpZ3VyYXRpb24gdG8gY2hyb21lIGV4dGVuc2lvbiBzeW5jIHN0b3JhZ2Vcblx0ICogQHBhcmFtIHt0eXBlfSBpdGVtc1xuXHQgKiBAcGFyYW0ge3R5cGV9IGNhbGxiYWNrXG5cdCAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG5cdCAqL1xuICB1cGRhdGVDb25maWd1cmF0aW9uOiBmdW5jdGlvbiAoaXRlbXMsIGNhbGxiYWNrKSB7XG4gICAgY2hyb21lLnN0b3JhZ2Uuc3luYy5zZXQoaXRlbXMsIGNhbGxiYWNrKVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQ29uZmlnXG4iLCIvKipcbiAqIEVsZW1lbnQgc2VsZWN0b3IuIFVzZXMgalF1ZXJ5IGFzIGJhc2UgYW5kIGFkZHMgc29tZSBtb3JlIGZlYXR1cmVzXG4gKiBAcGFyYW0gQ1NTU2VsZWN0b3JcbiAqIEBwYXJhbSBwYXJlbnRFbGVtZW50XG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG52YXIgRWxlbWVudFF1ZXJ5ID0gZnVuY3Rpb24gKENTU1NlbGVjdG9yLCBwYXJlbnRFbGVtZW50LCBvcHRpb25zKSB7XG4gIENTU1NlbGVjdG9yID0gQ1NTU2VsZWN0b3IgfHwgJydcbiAgdGhpcy4kID0gb3B0aW9ucy4kXG4gIGlmICghdGhpcy4kKSB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcganF1ZXJ5IGZvciBFbGVtZW50UXVlcnknKVxuICB2YXIgc2VsZWN0ZWRFbGVtZW50cyA9IFtdXG5cbiAgdmFyIGFkZEVsZW1lbnQgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgIGlmIChzZWxlY3RlZEVsZW1lbnRzLmluZGV4T2YoZWxlbWVudCkgPT09IC0xKSB7XG4gICAgICBzZWxlY3RlZEVsZW1lbnRzLnB1c2goZWxlbWVudClcbiAgICB9XG4gIH1cblxuICB2YXIgc2VsZWN0b3JQYXJ0cyA9IEVsZW1lbnRRdWVyeS5nZXRTZWxlY3RvclBhcnRzKENTU1NlbGVjdG9yKVxuICB2YXIgc2VsZiA9IHRoaXNcbiAgc2VsZWN0b3JQYXJ0cy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuXHRcdC8vIGhhbmRsZSBzcGVjaWFsIGNhc2Ugd2hlbiBwYXJlbnQgaXMgc2VsZWN0ZWRcbiAgICBpZiAoc2VsZWN0b3IgPT09ICdfcGFyZW50XycpIHtcbiAgICAgIHNlbGYuJChwYXJlbnRFbGVtZW50KS5lYWNoKGZ1bmN0aW9uIChpLCBlbGVtZW50KSB7XG4gICAgICAgIGFkZEVsZW1lbnQoZWxlbWVudClcbiAgICAgIH0pXG4gICAgfVx0XHRlbHNlIHtcbiAgICAgIHZhciBlbGVtZW50cyA9IHNlbGYuJChzZWxlY3Rvciwgc2VsZi4kKHBhcmVudEVsZW1lbnQpKVxuICAgICAgZWxlbWVudHMuZWFjaChmdW5jdGlvbiAoaSwgZWxlbWVudCkge1xuICAgICAgICBhZGRFbGVtZW50KGVsZW1lbnQpXG4gICAgICB9KVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gc2VsZWN0ZWRFbGVtZW50c1xufVxuXG5FbGVtZW50UXVlcnkuZ2V0U2VsZWN0b3JQYXJ0cyA9IGZ1bmN0aW9uIChDU1NTZWxlY3Rvcikge1xuICB2YXIgc2VsZWN0b3JzID0gQ1NTU2VsZWN0b3Iuc3BsaXQoLygsfFwiLio/XCJ8Jy4qPyd8XFwoLio/XFwpKS8pXG5cbiAgdmFyIHJlc3VsdFNlbGVjdG9ycyA9IFtdXG4gIHZhciBjdXJyZW50U2VsZWN0b3IgPSAnJ1xuICBzZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICBpZiAoc2VsZWN0b3IgPT09ICcsJykge1xuICAgICAgaWYgKGN1cnJlbnRTZWxlY3Rvci50cmltKCkubGVuZ3RoKSB7XG4gICAgICAgIHJlc3VsdFNlbGVjdG9ycy5wdXNoKGN1cnJlbnRTZWxlY3Rvci50cmltKCkpXG4gICAgICB9XG4gICAgICBjdXJyZW50U2VsZWN0b3IgPSAnJ1xuICAgIH1cdFx0ZWxzZSB7XG4gICAgICBjdXJyZW50U2VsZWN0b3IgKz0gc2VsZWN0b3JcbiAgICB9XG4gIH0pXG4gIGlmIChjdXJyZW50U2VsZWN0b3IudHJpbSgpLmxlbmd0aCkge1xuICAgIHJlc3VsdFNlbGVjdG9ycy5wdXNoKGN1cnJlbnRTZWxlY3Rvci50cmltKCkpXG4gIH1cblxuICByZXR1cm4gcmVzdWx0U2VsZWN0b3JzXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRWxlbWVudFF1ZXJ5XG4iLCJcbnZhciBKb2IgPSBmdW5jdGlvbiAodXJsLCBwYXJlbnRTZWxlY3Rvciwgc2NyYXBlciwgcGFyZW50Sm9iLCBiYXNlRGF0YSkge1xuICBpZiAocGFyZW50Sm9iICE9PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzLnVybCA9IHRoaXMuY29tYmluZVVybHMocGFyZW50Sm9iLnVybCwgdXJsKVxuICB9IGVsc2Uge1xuICAgIHRoaXMudXJsID0gdXJsXG4gIH1cbiAgdGhpcy5wYXJlbnRTZWxlY3RvciA9IHBhcmVudFNlbGVjdG9yXG4gIHRoaXMuc2NyYXBlciA9IHNjcmFwZXJcbiAgdGhpcy5kYXRhSXRlbXMgPSBbXVxuICB0aGlzLmJhc2VEYXRhID0gYmFzZURhdGEgfHwge31cbn1cblxuSm9iLnByb3RvdHlwZSA9IHtcblxuICBjb21iaW5lVXJsczogZnVuY3Rpb24gKHBhcmVudFVybCwgY2hpbGRVcmwpIHtcbiAgICB2YXIgdXJsTWF0Y2hlciA9IG5ldyBSZWdFeHAoJyhodHRwcz86Ly8pPyhbYS16MC05XFxcXC1cXFxcLl0rXFxcXC5bYS16MC05XFxcXC1dKyg6XFxcXGQrKT98XFxcXGR7MSwzfVxcXFwuXFxcXGR7MSwzfVxcXFwuXFxcXGR7MSwzfVxcXFwuXFxcXGR7MSwzfSg6XFxcXGQrKT8pPyhcXFxcL1teXFxcXD9dKlxcXFwvfFxcXFwvKT8oW15cXFxcP10qKT8oXFxcXD8uKik/JywgJ2knKVxuXG4gICAgdmFyIHBhcmVudE1hdGNoZXMgPSBwYXJlbnRVcmwubWF0Y2godXJsTWF0Y2hlcilcbiAgICB2YXIgY2hpbGRNYXRjaGVzID0gY2hpbGRVcmwubWF0Y2godXJsTWF0Y2hlcilcblxuXHRcdC8vIHNwZWNpYWwgY2FzZSBmb3IgdXJscyBsaWtlIHRoaXM6ID9hPTEgIG9yIGxpa2UtdGhpcy9cbiAgICBpZiAoY2hpbGRNYXRjaGVzWzFdID09PSB1bmRlZmluZWQgJiYgY2hpbGRNYXRjaGVzWzJdID09PSB1bmRlZmluZWQgJiYgY2hpbGRNYXRjaGVzWzVdID09PSB1bmRlZmluZWQgJiYgY2hpbGRNYXRjaGVzWzZdID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHZhciB1cmwgPSBwYXJlbnRNYXRjaGVzWzFdICsgcGFyZW50TWF0Y2hlc1syXSArIHBhcmVudE1hdGNoZXNbNV0gKyBwYXJlbnRNYXRjaGVzWzZdICsgY2hpbGRNYXRjaGVzWzddXG4gICAgICByZXR1cm4gdXJsXG4gICAgfVxuXG4gICAgaWYgKGNoaWxkTWF0Y2hlc1sxXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjaGlsZE1hdGNoZXNbMV0gPSBwYXJlbnRNYXRjaGVzWzFdXG4gICAgfVxuICAgIGlmIChjaGlsZE1hdGNoZXNbMl0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgY2hpbGRNYXRjaGVzWzJdID0gcGFyZW50TWF0Y2hlc1syXVxuICAgIH1cbiAgICBpZiAoY2hpbGRNYXRjaGVzWzVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmIChwYXJlbnRNYXRjaGVzWzVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY2hpbGRNYXRjaGVzWzVdID0gJy8nXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjaGlsZE1hdGNoZXNbNV0gPSBwYXJlbnRNYXRjaGVzWzVdXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNoaWxkTWF0Y2hlc1s2XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjaGlsZE1hdGNoZXNbNl0gPSAnJ1xuICAgIH1cbiAgICBpZiAoY2hpbGRNYXRjaGVzWzddID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGNoaWxkTWF0Y2hlc1s3XSA9ICcnXG4gICAgfVxuXG4gICAgcmV0dXJuIGNoaWxkTWF0Y2hlc1sxXSArIGNoaWxkTWF0Y2hlc1syXSArIGNoaWxkTWF0Y2hlc1s1XSArIGNoaWxkTWF0Y2hlc1s2XSArIGNoaWxkTWF0Y2hlc1s3XVxuICB9LFxuXG4gIGV4ZWN1dGU6IGZ1bmN0aW9uIChicm93c2VyLCBjYWxsYmFjaywgc2NvcGUpIHtcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc2NyYXBlci5zaXRlbWFwXG4gICAgdmFyIGpvYiA9IHRoaXNcbiAgICBjb25zb2xlLmxvZygnc3RhcnRpbmcgZmV0Y2hpbmcnKVxuICAgIGJyb3dzZXIuZmV0Y2hEYXRhKHRoaXMudXJsLCBzaXRlbWFwLCB0aGlzLnBhcmVudFNlbGVjdG9yLCBmdW5jdGlvbiAocmVzdWx0cykge1xuICAgICAgY29uc29sZS5sb2coJ2ZpbmlzaGVkIGZldGNoaW5nJylcblx0XHRcdC8vIG1lcmdlIGRhdGEgd2l0aCBkYXRhIGZyb20gaW5pdGlhbGl6YXRpb25cbiAgICAgIGZvciAodmFyIGkgaW4gcmVzdWx0cykge1xuICAgICAgICB2YXIgcmVzdWx0ID0gcmVzdWx0c1tpXVxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdGhpcy5iYXNlRGF0YSkge1xuICAgICAgICAgIGlmICghKGtleSBpbiByZXN1bHQpKSB7XG4gICAgICAgICAgICByZXN1bHRba2V5XSA9IHRoaXMuYmFzZURhdGFba2V5XVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLmRhdGFJdGVtcy5wdXNoKHJlc3VsdClcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKGpvYilcbiAgICB9LmJpbmQodGhpcyksIHRoaXMpXG4gIH0sXG4gIGdldFJlc3VsdHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5kYXRhSXRlbXNcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEpvYlxuIiwiXG52YXIgUXVldWUgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuam9icyA9IFtdXG4gIHRoaXMuc2NyYXBlZFVybHMgPSB7fVxufVxuXG5RdWV1ZS5wcm90b3R5cGUgPSB7XG5cblx0LyoqXG5cdCAqIFJldHVybnMgZmFsc2UgaWYgcGFnZSBpcyBhbHJlYWR5IHNjcmFwZWRcblx0ICogQHBhcmFtIGpvYlxuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICovXG4gIGFkZDogZnVuY3Rpb24gKGpvYikge1xuICAgIGlmICh0aGlzLmNhbkJlQWRkZWQoam9iKSkge1xuICAgICAgdGhpcy5qb2JzLnB1c2goam9iKVxuICAgICAgdGhpcy5fc2V0VXJsU2NyYXBlZChqb2IudXJsKVxuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQmVBZGRlZDogZnVuY3Rpb24gKGpvYikge1xuICAgIGlmICh0aGlzLmlzU2NyYXBlZChqb2IudXJsKSkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG5cdFx0Ly8gcmVqZWN0IGRvY3VtZW50c1xuICAgIGlmIChqb2IudXJsLm1hdGNoKC9cXC4oZG9jfGRvY3h8cGRmfHBwdHxwcHR4fG9kdCkkL2kpICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBnZXRRdWV1ZVNpemU6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5qb2JzLmxlbmd0aFxuICB9LFxuXG4gIGlzU2NyYXBlZDogZnVuY3Rpb24gKHVybCkge1xuICAgIHJldHVybiAodGhpcy5zY3JhcGVkVXJsc1t1cmxdICE9PSB1bmRlZmluZWQpXG4gIH0sXG5cbiAgX3NldFVybFNjcmFwZWQ6IGZ1bmN0aW9uICh1cmwpIHtcbiAgICB0aGlzLnNjcmFwZWRVcmxzW3VybF0gPSB0cnVlXG4gIH0sXG5cbiAgZ2V0TmV4dEpvYjogZnVuY3Rpb24gKCkge1xuXHRcdC8vIEBUT0RPIHRlc3QgdGhpc1xuICAgIGlmICh0aGlzLmdldFF1ZXVlU2l6ZSgpID4gMCkge1xuICAgICAgcmV0dXJuIHRoaXMuam9icy5wb3AoKVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBRdWV1ZVxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgd2hlbkNhbGxTZXF1ZW50aWFsbHkgPSByZXF1aXJlKCcuLi9hc3NldHMvanF1ZXJ5LndoZW5jYWxsc2VxdWVudGlhbGx5JylcbnZhciBCYXNlNjQgPSByZXF1aXJlKCcuLi9hc3NldHMvYmFzZTY0JylcbnZhciBKb2IgPSByZXF1aXJlKCcuL0pvYicpXG5cbnZhciBTY3JhcGVyID0gZnVuY3Rpb24gKG9wdGlvbnMsIG1vcmVPcHRpb25zKSB7XG4gIHRoaXMucXVldWUgPSBvcHRpb25zLnF1ZXVlXG4gIHRoaXMuc2l0ZW1hcCA9IG9wdGlvbnMuc2l0ZW1hcFxuICB0aGlzLnN0b3JlID0gb3B0aW9ucy5zdG9yZVxuICB0aGlzLmJyb3dzZXIgPSBvcHRpb25zLmJyb3dzZXJcbiAgdGhpcy5yZXN1bHRXcml0ZXIgPSBudWxsIC8vIGRiIGluc3RhbmNlIGZvciBzY3JhcGVkIGRhdGEgd3JpdGluZ1xuICB0aGlzLnJlcXVlc3RJbnRlcnZhbCA9IHBhcnNlSW50KG9wdGlvbnMucmVxdWVzdEludGVydmFsKVxuICB0aGlzLnBhZ2VMb2FkRGVsYXkgPSBwYXJzZUludChvcHRpb25zLnBhZ2VMb2FkRGVsYXkpXG4gIHRoaXMuJCA9IG1vcmVPcHRpb25zLiRcbiAgaWYgKCFtb3JlT3B0aW9ucy4kKSB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcganF1ZXJ5Jylcbn1cblxuU2NyYXBlci5wcm90b3R5cGUgPSB7XG5cblx0LyoqXG5cdCAqIFNjcmFwaW5nIGRlbGF5IGJldHdlZW4gdHdvIHBhZ2Ugb3BlbmluZyByZXF1ZXN0c1xuXHQgKi9cbiAgcmVxdWVzdEludGVydmFsOiAyMDAwLFxuICBfdGltZU5leHRTY3JhcGVBdmFpbGFibGU6IDAsXG5cbiAgaW5pdEZpcnN0Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHZhciB1cmxzID0gdGhpcy5zaXRlbWFwLmdldFN0YXJ0VXJscygpXG5cbiAgICB1cmxzLmZvckVhY2goZnVuY3Rpb24gKHVybCkge1xuICAgICAgdmFyIGZpcnN0Sm9iID0gbmV3IEpvYih1cmwsICdfcm9vdCcsIHRoaXMpXG4gICAgICB0aGlzLnF1ZXVlLmFkZChmaXJzdEpvYilcbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG5cbiAgcnVuOiBmdW5jdGlvbiAoZXhlY3V0aW9uQ2FsbGJhY2spIHtcbiAgICB2YXIgc2NyYXBlciA9IHRoaXNcblxuXHRcdC8vIGNhbGxiYWNrIHdoZW4gc2NyYXBpbmcgaXMgZmluaXNoZWRcbiAgICB0aGlzLmV4ZWN1dGlvbkNhbGxiYWNrID0gZXhlY3V0aW9uQ2FsbGJhY2tcblxuICAgIHRoaXMuaW5pdEZpcnN0Sm9icygpXG5cbiAgICB0aGlzLnN0b3JlLmluaXRTaXRlbWFwRGF0YURiKHRoaXMuc2l0ZW1hcC5faWQsIGZ1bmN0aW9uIChyZXN1bHRXcml0ZXIpIHtcbiAgICAgIHNjcmFwZXIucmVzdWx0V3JpdGVyID0gcmVzdWx0V3JpdGVyXG4gICAgICBzY3JhcGVyLl9ydW4oKVxuICAgIH0pXG4gIH0sXG5cbiAgcmVjb3JkQ2FuSGF2ZUNoaWxkSm9iczogZnVuY3Rpb24gKHJlY29yZCkge1xuICAgIGlmIChyZWNvcmQuX2ZvbGxvdyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cbiAgICB2YXIgc2VsZWN0b3JJZCA9IHJlY29yZC5fZm9sbG93U2VsZWN0b3JJZFxuICAgIHZhciBjaGlsZFNlbGVjdG9ycyA9IHRoaXMuc2l0ZW1hcC5nZXREaXJlY3RDaGlsZFNlbGVjdG9ycyhzZWxlY3RvcklkKVxuICAgIGlmIChjaGlsZFNlbGVjdG9ycy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfSxcblxuICBnZXRGaWxlRmlsZW5hbWU6IGZ1bmN0aW9uICh1cmwpIHtcbiAgICB2YXIgcGFydHMgPSB1cmwuc3BsaXQoJy8nKVxuICAgIHZhciBmaWxlbmFtZSA9IHBhcnRzW3BhcnRzLmxlbmd0aCAtIDFdXG4gICAgZmlsZW5hbWUgPSBmaWxlbmFtZS5yZXBsYWNlKC9cXD8vZywgJycpXG4gICAgaWYgKGZpbGVuYW1lLmxlbmd0aCA+IDEzMCkge1xuICAgICAgZmlsZW5hbWUgPSBmaWxlbmFtZS5zdWJzdHIoMCwgMTMwKVxuICAgIH1cbiAgICByZXR1cm4gZmlsZW5hbWVcbiAgfSxcblxuXHQvKipcblx0ICogU2F2ZSBpbWFnZXMgZm9yIHVzZXIgaWYgdGhlIHJlY29yZHMgY29udGFpbnMgdGhlbVxuXHQgKiBAcGFyYW0gcmVjb3JkXG5cdCAqL1xuICBzYXZlSW1hZ2VzOiBmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciBkZWZlcnJlZEltYWdlU3RvcmVDYWxscyA9IFtdXG4gICAgdmFyIHByZWZpeExlbmd0aCA9ICdfaW1hZ2VCYXNlNjQtJy5sZW5ndGhcblxuICAgIGZvciAodmFyIGF0dHIgaW4gcmVjb3JkKSB7XG4gICAgICBpZiAoYXR0ci5zdWJzdHIoMCwgcHJlZml4TGVuZ3RoKSA9PT0gJ19pbWFnZUJhc2U2NC0nKSB7XG4gICAgICAgIHZhciBzZWxlY3RvcklkID0gYXR0ci5zdWJzdHJpbmcocHJlZml4TGVuZ3RoLCBhdHRyLmxlbmd0aClcbiAgICAgICAgZGVmZXJyZWRJbWFnZVN0b3JlQ2FsbHMucHVzaChmdW5jdGlvbiAoc2VsZWN0b3JJZCkge1xuICAgICAgICAgIHZhciBpbWFnZUJhc2U2NCA9IHJlY29yZFsnX2ltYWdlQmFzZTY0LScgKyBzZWxlY3RvcklkXVxuICAgICAgICAgIHZhciBkZWZlcnJlZERvd25sb2FkRG9uZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgICAgICAgICB2YXIgZGVmZXJyZWRCbG9iID0gQmFzZTY0LmJhc2U2NFRvQmxvYihpbWFnZUJhc2U2NCwgcmVjb3JkWydfaW1hZ2VNaW1lVHlwZS0nICsgc2VsZWN0b3JJZF0pXG5cbiAgICAgICAgICBkZWxldGUgcmVjb3JkWydfaW1hZ2VNaW1lVHlwZS0nICsgc2VsZWN0b3JJZF1cbiAgICAgICAgICBkZWxldGUgcmVjb3JkWydfaW1hZ2VCYXNlNjQtJyArIHNlbGVjdG9ySWRdXG5cbiAgICAgICAgICBkZWZlcnJlZEJsb2IuZG9uZShmdW5jdGlvbiAoYmxvYikge1xuICAgICAgICAgICAgdmFyIGRvd25sb2FkVXJsID0gd2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYilcbiAgICAgICAgICAgIHZhciBmaWxlU2F2ZVBhdGggPSB0aGlzLnNpdGVtYXAuX2lkICsgJy8nICsgc2VsZWN0b3JJZCArICcvJyArIHRoaXMuZ2V0RmlsZUZpbGVuYW1lKHJlY29yZFtzZWxlY3RvcklkICsgJy1zcmMnXSlcblxuXHRcdFx0XHRcdFx0Ly8gZG93bmxvYWQgaW1hZ2UgdXNpbmcgY2hyb21lIGFwaVxuICAgICAgICAgICAgdmFyIGRvd25sb2FkUmVxdWVzdCA9IHtcbiAgICAgICAgICAgICAgdXJsOiBkb3dubG9hZFVybCxcbiAgICAgICAgICAgICAgZmlsZW5hbWU6IGZpbGVTYXZlUGF0aFxuICAgICAgICAgICAgfVxuXG5cdFx0XHRcdFx0XHQvLyB3YWl0IGZvciB0aGUgZG93bmxvYWQgdG8gZmluaXNoXG4gICAgICAgICAgICBjaHJvbWUuZG93bmxvYWRzLmRvd25sb2FkKGRvd25sb2FkUmVxdWVzdCwgZnVuY3Rpb24gKGRvd25sb2FkSWQpIHtcbiAgICAgICAgICAgICAgdmFyIGNiRG93bmxvYWRlZCA9IGZ1bmN0aW9uIChkb3dubG9hZEl0ZW0pIHtcbiAgICAgICAgICAgICAgICBpZiAoZG93bmxvYWRJdGVtLmlkID09PSBkb3dubG9hZElkICYmIGRvd25sb2FkSXRlbS5zdGF0ZSkge1xuICAgICAgICAgICAgICAgICAgaWYgKGRvd25sb2FkSXRlbS5zdGF0ZS5jdXJyZW50ID09PSAnY29tcGxldGUnKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkRG93bmxvYWREb25lLnJlc29sdmUoKVxuICAgICAgICAgICAgICAgICAgICBjaHJvbWUuZG93bmxvYWRzLm9uQ2hhbmdlZC5yZW1vdmVMaXN0ZW5lcihjYkRvd25sb2FkZWQpXG4gICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGRvd25sb2FkSXRlbS5zdGF0ZS5jdXJyZW50ID09PSAnaW50ZXJydXB0ZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkRG93bmxvYWREb25lLnJlamVjdCgnZG93bmxvYWQgZmFpbGVkJylcbiAgICAgICAgICAgICAgICAgICAgY2hyb21lLmRvd25sb2Fkcy5vbkNoYW5nZWQucmVtb3ZlTGlzdGVuZXIoY2JEb3dubG9hZGVkKVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGNocm9tZS5kb3dubG9hZHMub25DaGFuZ2VkLmFkZExpc3RlbmVyKGNiRG93bmxvYWRlZClcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgICAgICAgcmV0dXJuIGRlZmVycmVkRG93bmxvYWREb25lLnByb21pc2UoKVxuICAgICAgICB9LmJpbmQodGhpcywgc2VsZWN0b3JJZCkpXG4gICAgICB9XG4gICAgfVxuXG4gICAgd2hlbkNhbGxTZXF1ZW50aWFsbHkoZGVmZXJyZWRJbWFnZVN0b3JlQ2FsbHMpLmRvbmUoZnVuY3Rpb24gKCkge1xuICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKClcbiAgICB9KVxuXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gIH0sXG5cblx0Ly8gQFRPRE8gcmVtb3ZlIHJlY3Vyc2lvbiBhbmQgYWRkIGFuIGl0ZXJhdGl2ZSB3YXkgdG8gcnVuIHRoZXNlIGpvYnMuXG4gIF9ydW46IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgam9iID0gdGhpcy5xdWV1ZS5nZXROZXh0Sm9iKClcbiAgICBpZiAoam9iID09PSBmYWxzZSkge1xuICAgICAgY29uc29sZS5sb2coJ1NjcmFwZXIgZXhlY3V0aW9uIGlzIGZpbmlzaGVkJylcbiAgICAgIHRoaXMuYnJvd3Nlci5jbG9zZSgpXG4gICAgICB0aGlzLmV4ZWN1dGlvbkNhbGxiYWNrKClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBjb25zb2xlLmxvZygnc3RhcnRpbmcgZXhlY3V0ZScpXG4gICAgam9iLmV4ZWN1dGUodGhpcy5icm93c2VyLCBmdW5jdGlvbiAoam9iKSB7XG4gICAgICBjb25zb2xlLmxvZygnZmluaXNoZWQgZXhlY3V0aW5nJylcbiAgICAgIHZhciBzY3JhcGVkUmVjb3JkcyA9IFtdXG4gICAgICB2YXIgZGVmZXJyZWREYXRhbWFuaXB1bGF0aW9ucyA9IFtdXG5cbiAgICAgIHZhciByZWNvcmRzID0gam9iLmdldFJlc3VsdHMoKVxuICAgICAgcmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcblx0XHRcdFx0Ly8gdmFyIHJlY29yZCA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkocmVjKSk7XG5cbiAgICAgICAgZGVmZXJyZWREYXRhbWFuaXB1bGF0aW9ucy5wdXNoKHRoaXMuc2F2ZUltYWdlcy5iaW5kKHRoaXMsIHJlY29yZCkpXG5cblx0XHRcdFx0Ly8gQFRPRE8gcmVmYWN0b3Igam9iIGV4c3RyYWN0aW9uIHRvIGEgc2VwZXJhdGUgbWV0aG9kXG4gICAgICAgIGlmICh0aGlzLnJlY29yZENhbkhhdmVDaGlsZEpvYnMocmVjb3JkKSkge1xuICAgICAgICAgIHZhciBmb2xsb3dTZWxlY3RvcklkID0gcmVjb3JkLl9mb2xsb3dTZWxlY3RvcklkXG4gICAgICAgICAgdmFyIGZvbGxvd1VSTCA9IHJlY29yZFsnX2ZvbGxvdyddXG4gICAgICAgICAgZGVsZXRlIHJlY29yZFsnX2ZvbGxvdyddXG4gICAgICAgICAgZGVsZXRlIHJlY29yZFsnX2ZvbGxvd1NlbGVjdG9ySWQnXVxuICAgICAgICAgIHZhciBuZXdKb2IgPSBuZXcgSm9iKGZvbGxvd1VSTCwgZm9sbG93U2VsZWN0b3JJZCwgdGhpcywgam9iLCByZWNvcmQpXG4gICAgICAgICAgaWYgKHRoaXMucXVldWUuY2FuQmVBZGRlZChuZXdKb2IpKSB7XG4gICAgICAgICAgICB0aGlzLnF1ZXVlLmFkZChuZXdKb2IpXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHN0b3JlIGFscmVhZHkgc2NyYXBlZCBsaW5rc1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0lnbm9yaW5nIG5leHQnKVxuICAgICAgICAgICAgY29uc29sZS5sb2cocmVjb3JkKVxuLy9cdFx0XHRcdFx0XHRzY3JhcGVkUmVjb3Jkcy5wdXNoKHJlY29yZCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChyZWNvcmQuX2ZvbGxvdyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBkZWxldGUgcmVjb3JkWydfZm9sbG93J11cbiAgICAgICAgICAgIGRlbGV0ZSByZWNvcmRbJ19mb2xsb3dTZWxlY3RvcklkJ11cbiAgICAgICAgICB9XG4gICAgICAgICAgc2NyYXBlZFJlY29yZHMucHVzaChyZWNvcmQpXG4gICAgICAgIH1cbiAgICAgIH0uYmluZCh0aGlzKSlcblxuICAgICAgd2hlbkNhbGxTZXF1ZW50aWFsbHkoZGVmZXJyZWREYXRhbWFuaXB1bGF0aW9ucykuZG9uZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMucmVzdWx0V3JpdGVyLndyaXRlRG9jcyhzY3JhcGVkUmVjb3JkcywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciBub3cgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpXG5cdFx0XHRcdFx0Ly8gZGVsYXkgbmV4dCBqb2IgaWYgbmVlZGVkXG4gICAgICAgICAgdGhpcy5fdGltZU5leHRTY3JhcGVBdmFpbGFibGUgPSBub3cgKyB0aGlzLnJlcXVlc3RJbnRlcnZhbFxuICAgICAgICAgIGlmIChub3cgPj0gdGhpcy5fdGltZU5leHRTY3JhcGVBdmFpbGFibGUpIHtcbiAgICAgICAgICAgIHRoaXMuX3J1bigpXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBkZWxheSA9IHRoaXMuX3RpbWVOZXh0U2NyYXBlQXZhaWxhYmxlIC0gbm93XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgdGhpcy5fcnVuKClcbiAgICAgICAgICAgIH0uYmluZCh0aGlzKSwgZGVsYXkpXG4gICAgICAgICAgfVxuICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICB9LmJpbmQodGhpcykpXG4gICAgfS5iaW5kKHRoaXMpKVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2NyYXBlclxuIiwidmFyIHNlbGVjdG9ycyA9IHJlcXVpcmUoJy4vU2VsZWN0b3JzJylcbnZhciBFbGVtZW50UXVlcnkgPSByZXF1aXJlKCcuL0VsZW1lbnRRdWVyeScpXG52YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcblxudmFyIFNlbGVjdG9yID0gZnVuY3Rpb24gKHNlbGVjdG9yLCBvcHRpb25zKSB7XG4gIHRoaXMuJCA9IG9wdGlvbnMuJFxuICBpZiAoIW9wdGlvbnMuJCkgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIGpxdWVyeScpXG5cbiAgdGhpcy51cGRhdGVEYXRhKHNlbGVjdG9yKVxuICB0aGlzLmluaXRUeXBlKClcbn1cblxuU2VsZWN0b3IucHJvdG90eXBlID0ge1xuXG5cdC8qKlxuXHQgKiBJcyB0aGlzIHNlbGVjdG9yIGNvbmZpZ3VyZWQgdG8gcmV0dXJuIG11bHRpcGxlIGl0ZW1zP1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICovXG4gIHdpbGxSZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5jYW5SZXR1cm5NdWx0aXBsZVJlY29yZHMoKSAmJiB0aGlzLm11bHRpcGxlXG4gIH0sXG5cblx0LyoqXG5cdCAqIFVwZGF0ZSBjdXJyZW50IHNlbGVjdG9yIGNvbmZpZ3VyYXRpb25cblx0ICogQHBhcmFtIGRhdGFcblx0ICovXG4gIHVwZGF0ZURhdGE6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdmFyIGFsbG93ZWRLZXlzID0gWydpZCcsICd0eXBlJywgJ3NlbGVjdG9yJywgJ3BhcmVudFNlbGVjdG9ycyddXG4gICAgY29uc29sZS5sb2coJ2RhdGEgdHlwZScsIGRhdGEudHlwZSlcbiAgICBhbGxvd2VkS2V5cyA9IGFsbG93ZWRLZXlzLmNvbmNhdChzZWxlY3RvcnNbZGF0YS50eXBlXS5nZXRGZWF0dXJlcygpKVxuICAgIHZhciBrZXlcblx0XHQvLyB1cGRhdGUgZGF0YVxuICAgIGZvciAoa2V5IGluIGRhdGEpIHtcbiAgICAgIGlmIChhbGxvd2VkS2V5cy5pbmRleE9mKGtleSkgIT09IC0xIHx8IHR5cGVvZiBkYXRhW2tleV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpc1trZXldID0gZGF0YVtrZXldXG4gICAgICB9XG4gICAgfVxuXG5cdFx0Ly8gcmVtb3ZlIHZhbHVlcyB0aGF0IGFyZSBub3QgbmVlZGVkIGZvciB0aGlzIHR5cGUgb2Ygc2VsZWN0b3JcbiAgICBmb3IgKGtleSBpbiB0aGlzKSB7XG4gICAgICBpZiAoYWxsb3dlZEtleXMuaW5kZXhPZihrZXkpID09PSAtMSAmJiB0eXBlb2YgdGhpc1trZXldICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzW2tleV1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cblx0LyoqXG5cdCAqIENTUyBzZWxlY3RvciB3aGljaCB3aWxsIGJlIHVzZWQgZm9yIGVsZW1lbnQgc2VsZWN0aW9uXG5cdCAqIEByZXR1cm5zIHtzdHJpbmd9XG5cdCAqL1xuICBnZXRJdGVtQ1NTU2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gJyonXG4gIH0sXG5cblx0LyoqXG5cdCAqIG92ZXJyaWRlIG9iamVjdHMgbWV0aG9kcyBiYXNlZCBvbiBzZWxldG9yIHR5cGVcblx0ICovXG4gIGluaXRUeXBlOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHNlbGVjdG9yc1t0aGlzLnR5cGVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignU2VsZWN0b3IgdHlwZSBub3QgZGVmaW5lZCAnICsgdGhpcy50eXBlKVxuICAgIH1cblxuXHRcdC8vIG92ZXJyaWRlcyBvYmplY3RzIG1ldGhvZHNcbiAgICBmb3IgKHZhciBpIGluIHNlbGVjdG9yc1t0aGlzLnR5cGVdKSB7XG4gICAgICB0aGlzW2ldID0gc2VsZWN0b3JzW3RoaXMudHlwZV1baV1cbiAgICB9XG4gIH0sXG5cblx0LyoqXG5cdCAqIENoZWNrIHdoZXRoZXIgYSBzZWxlY3RvciBpcyBhIHBhcmVuIHNlbGVjdG9yIG9mIHRoaXMgc2VsZWN0b3Jcblx0ICogQHBhcmFtIHNlbGVjdG9ySWRcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuICBoYXNQYXJlbnRTZWxlY3RvcjogZnVuY3Rpb24gKHNlbGVjdG9ySWQpIHtcbiAgICByZXR1cm4gKHRoaXMucGFyZW50U2VsZWN0b3JzLmluZGV4T2Yoc2VsZWN0b3JJZCkgIT09IC0xKVxuICB9LFxuXG4gIHJlbW92ZVBhcmVudFNlbGVjdG9yOiBmdW5jdGlvbiAoc2VsZWN0b3JJZCkge1xuICAgIHZhciBpbmRleCA9IHRoaXMucGFyZW50U2VsZWN0b3JzLmluZGV4T2Yoc2VsZWN0b3JJZClcbiAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICB0aGlzLnBhcmVudFNlbGVjdG9ycy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgfVxuICB9LFxuXG4gIHJlbmFtZVBhcmVudFNlbGVjdG9yOiBmdW5jdGlvbiAob3JpZ2luYWxJZCwgcmVwbGFjZW1lbnRJZCkge1xuICAgIGlmICh0aGlzLmhhc1BhcmVudFNlbGVjdG9yKG9yaWdpbmFsSWQpKSB7XG4gICAgICB2YXIgcG9zID0gdGhpcy5wYXJlbnRTZWxlY3RvcnMuaW5kZXhPZihvcmlnaW5hbElkKVxuICAgICAgdGhpcy5wYXJlbnRTZWxlY3RvcnMuc3BsaWNlKHBvcywgMSwgcmVwbGFjZW1lbnRJZClcbiAgICB9XG4gIH0sXG5cbiAgZ2V0RGF0YUVsZW1lbnRzOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIGVsZW1lbnRzID0gRWxlbWVudFF1ZXJ5KHRoaXMuc2VsZWN0b3IsIHBhcmVudEVsZW1lbnQsIHskfSlcbiAgICBpZiAodGhpcy5tdWx0aXBsZSkge1xuICAgICAgcmV0dXJuIGVsZW1lbnRzXG4gICAgfSBlbHNlIGlmIChlbGVtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gW2VsZW1lbnRzWzBdXVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gW11cbiAgICB9XG4gIH0sXG5cbiAgZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIHRpbWVvdXQgPSB0aGlzLmRlbGF5IHx8IDBcblxuXHRcdC8vIHRoaXMgd29ya3MgbXVjaCBmYXN0ZXIgYmVjYXVzZSB3aGVuQ2FsbFNlcXVlbnRhbGx5IGlzbid0IHJ1bm5pbmcgbmV4dCBkYXRhIGV4dHJhY3Rpb24gaW1tZWRpYXRlbHlcbiAgICBpZiAodGltZW91dCA9PT0gMCkge1xuICAgICAgdmFyIGRlZmVycmVkRGF0YSA9IHRoaXMuX2dldERhdGEocGFyZW50RWxlbWVudClcbiAgICAgIGRlZmVycmVkRGF0YS5kb25lKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIGQucmVzb2x2ZShkYXRhKVxuICAgICAgfSlcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkZWZlcnJlZERhdGEgPSB0aGlzLl9nZXREYXRhKHBhcmVudEVsZW1lbnQpXG4gICAgICAgIGRlZmVycmVkRGF0YS5kb25lKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgZC5yZXNvbHZlKGRhdGEpXG4gICAgICAgIH0pXG4gICAgICB9LmJpbmQodGhpcyksIHRpbWVvdXQpXG4gICAgfVxuXG4gICAgcmV0dXJuIGQucHJvbWlzZSgpXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvclxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG5cbnZhciBTZWxlY3RvckVsZW1lbnQgPSB7XG5cbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBkZmQgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcbiAgICBkZmQucmVzb2x2ZSh0aGlzLiQubWFrZUFycmF5KGVsZW1lbnRzKSlcblxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW11cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2RlbGF5J11cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yRWxlbWVudFxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgU2VsZWN0b3JFbGVtZW50QXR0cmlidXRlID0ge1xuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcblxuICAgIHZhciByZXN1bHQgPSBbXVxuICAgIHNlbGYuJChlbGVtZW50cykuZWFjaChmdW5jdGlvbiAoaywgZWxlbWVudCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuXG4gICAgICBkYXRhW3RoaXMuaWRdID0gc2VsZi4kKGVsZW1lbnQpLmF0dHIodGhpcy5leHRyYWN0QXR0cmlidXRlKVxuICAgICAgcmVzdWx0LnB1c2goZGF0YSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICBpZiAodGhpcy5tdWx0aXBsZSA9PT0gZmFsc2UgJiYgZWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICBkYXRhW3RoaXMuaWQgKyAnLXNyYyddID0gbnVsbFxuICAgICAgcmVzdWx0LnB1c2goZGF0YSlcbiAgICB9XG4gICAgZGZkLnJlc29sdmUocmVzdWx0KVxuXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbdGhpcy5pZF1cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2V4dHJhY3RBdHRyaWJ1dGUnLCAnZGVsYXknXVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JFbGVtZW50QXR0cmlidXRlXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciBVbmlxdWVFbGVtZW50TGlzdCA9IHJlcXVpcmUoJy4vLi4vVW5pcXVlRWxlbWVudExpc3QnKVxudmFyIEVsZW1lbnRRdWVyeSA9IHJlcXVpcmUoJy4vLi4vRWxlbWVudFF1ZXJ5JylcbnZhciBDc3NTZWxlY3RvciA9IHJlcXVpcmUoJ2Nzcy1zZWxlY3RvcicpLkNzc1NlbGVjdG9yXG52YXIgU2VsZWN0b3JFbGVtZW50Q2xpY2sgPSB7XG5cbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgZ2V0Q2xpY2tFbGVtZW50czogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIHZhciBjbGlja0VsZW1lbnRzID0gRWxlbWVudFF1ZXJ5KHRoaXMuY2xpY2tFbGVtZW50U2VsZWN0b3IsIHBhcmVudEVsZW1lbnQsIHskfSlcbiAgICByZXR1cm4gY2xpY2tFbGVtZW50c1xuICB9LFxuXG5cdC8qKlxuXHQgKiBDaGVjayB3aGV0aGVyIGVsZW1lbnQgaXMgc3RpbGwgcmVhY2hhYmxlIGZyb20gaHRtbC4gVXNlZnVsIHRvIGNoZWNrIHdoZXRoZXIgdGhlIGVsZW1lbnQgaXMgcmVtb3ZlZCBmcm9tIERPTS5cblx0ICogQHBhcmFtIGVsZW1lbnRcblx0ICovXG4gIGlzRWxlbWVudEluSFRNTDogZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICByZXR1cm4gdGhpcy4kKGVsZW1lbnQpLmNsb3Nlc3QoJ2h0bWwnKS5sZW5ndGggIT09IDBcbiAgfSxcblxuICB0cmlnZ2VyQnV0dG9uQ2xpY2s6IGZ1bmN0aW9uIChjbGlja0VsZW1lbnQpIHtcbiAgICB2YXIgY3MgPSBuZXcgQ3NzU2VsZWN0b3Ioe1xuICAgICAgZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yOiBmYWxzZSxcbiAgICAgIHBhcmVudDogdGhpcy4kKCdib2R5JylbMF0sXG4gICAgICBlbmFibGVSZXN1bHRTdHJpcHBpbmc6IGZhbHNlXG4gICAgfSlcbiAgICB2YXIgY3NzU2VsZWN0b3IgPSBjcy5nZXRDc3NTZWxlY3RvcihbY2xpY2tFbGVtZW50XSlcblxuXHRcdC8vIHRoaXMgZnVuY3Rpb24gd2lsbCBjYXRjaCB3aW5kb3cub3BlbiBjYWxsIGFuZCBwbGFjZSB0aGUgcmVxdWVzdGVkIHVybCBhcyB0aGUgZWxlbWVudHMgZGF0YSBhdHRyaWJ1dGVcbiAgICB2YXIgc2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0JylcbiAgICBzY3JpcHQudHlwZSA9ICd0ZXh0L2phdmFzY3JpcHQnXG4gICAgc2NyaXB0LnRleHQgPSAnJyArXG5cdFx0XHQnKGZ1bmN0aW9uKCl7ICcgK1xuXHRcdFx0XCJ2YXIgZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdcIiArIGNzc1NlbGVjdG9yICsgXCInKVswXTsgXCIgK1xuXHRcdFx0J2VsLmNsaWNrKCk7ICcgK1xuXHRcdFx0J30pKCk7J1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoc2NyaXB0KVxuICB9LFxuXG4gIGdldENsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuICd1bmlxdWVUZXh0J1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZVxuICAgIH1cbiAgfSxcblxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIHZhciBkZWxheSA9IHBhcnNlSW50KHRoaXMuZGVsYXkpIHx8IDBcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIGZvdW5kRWxlbWVudHMgPSBuZXcgVW5pcXVlRWxlbWVudExpc3QoJ3VuaXF1ZVRleHQnLCB7JH0pXG4gICAgdmFyIGNsaWNrRWxlbWVudHMgPSB0aGlzLmdldENsaWNrRWxlbWVudHMocGFyZW50RWxlbWVudClcbiAgICB2YXIgZG9uZUNsaWNraW5nRWxlbWVudHMgPSBuZXcgVW5pcXVlRWxlbWVudExpc3QodGhpcy5nZXRDbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSgpLCB7JH0pXG5cblx0XHQvLyBhZGQgZWxlbWVudHMgdGhhdCBhcmUgYXZhaWxhYmxlIGJlZm9yZSBjbGlja2luZ1xuICAgIHZhciBlbGVtZW50cyA9IHRoaXMuZ2V0RGF0YUVsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG4gICAgZWxlbWVudHMuZm9yRWFjaChmb3VuZEVsZW1lbnRzLnB1c2guYmluZChmb3VuZEVsZW1lbnRzKSlcblxuXHRcdC8vIGRpc2NhcmQgaW5pdGlhbCBlbGVtZW50c1xuICAgIGlmICh0aGlzLmRpc2NhcmRJbml0aWFsRWxlbWVudHMpIHtcbiAgICAgIGZvdW5kRWxlbWVudHMgPSBuZXcgVW5pcXVlRWxlbWVudExpc3QoJ3VuaXF1ZVRleHQnLCB7JH0pXG4gICAgfVxuXG5cdFx0Ly8gbm8gZWxlbWVudHMgdG8gY2xpY2sgYXQgdGhlIGJlZ2lubmluZ1xuICAgIGlmIChjbGlja0VsZW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKGZvdW5kRWxlbWVudHMpXG4gICAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZS5wcm9taXNlKClcbiAgICB9XG5cblx0XHQvLyBpbml0aWFsIGNsaWNrIGFuZCB3YWl0XG4gICAgdmFyIGN1cnJlbnRDbGlja0VsZW1lbnQgPSBjbGlja0VsZW1lbnRzWzBdXG4gICAgdGhpcy50cmlnZ2VyQnV0dG9uQ2xpY2soY3VycmVudENsaWNrRWxlbWVudClcbiAgICB2YXIgbmV4dEVsZW1lbnRTZWxlY3Rpb24gPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpICsgZGVsYXlcblxuXHRcdC8vIGluZmluaXRlbHkgc2Nyb2xsIGRvd24gYW5kIGZpbmQgYWxsIGl0ZW1zXG4gICAgdmFyIGludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuXHRcdFx0Ly8gZmluZCB0aG9zZSBjbGljayBlbGVtZW50cyB0aGF0IGFyZSBub3QgaW4gdGhlIGJsYWNrIGxpc3RcbiAgICAgIHZhciBhbGxDbGlja0VsZW1lbnRzID0gdGhpcy5nZXRDbGlja0VsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG4gICAgICBjbGlja0VsZW1lbnRzID0gW11cbiAgICAgIGFsbENsaWNrRWxlbWVudHMuZm9yRWFjaChmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICBpZiAoIWRvbmVDbGlja2luZ0VsZW1lbnRzLmlzQWRkZWQoZWxlbWVudCkpIHtcbiAgICAgICAgICBjbGlja0VsZW1lbnRzLnB1c2goZWxlbWVudClcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgdmFyIG5vdyA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKClcblx0XHRcdC8vIHNsZWVwLiB3YWl0IHdoZW4gdG8gZXh0cmFjdCBuZXh0IGVsZW1lbnRzXG4gICAgICBpZiAobm93IDwgbmV4dEVsZW1lbnRTZWxlY3Rpb24pIHtcblx0XHRcdFx0Ly8gY29uc29sZS5sb2coXCJ3YWl0XCIpO1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuXHRcdFx0Ly8gYWRkIG5ld2x5IGZvdW5kIGVsZW1lbnRzIHRvIGVsZW1lbnQgZm91bmRFbGVtZW50cyBhcnJheS5cbiAgICAgIHZhciBlbGVtZW50cyA9IHRoaXMuZ2V0RGF0YUVsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG4gICAgICB2YXIgYWRkZWRBbkVsZW1lbnQgPSBmYWxzZVxuICAgICAgZWxlbWVudHMuZm9yRWFjaChmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICB2YXIgYWRkZWQgPSBmb3VuZEVsZW1lbnRzLnB1c2goZWxlbWVudClcbiAgICAgICAgaWYgKGFkZGVkKSB7XG4gICAgICAgICAgYWRkZWRBbkVsZW1lbnQgPSB0cnVlXG4gICAgICAgIH1cbiAgICAgIH0pXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhcImFkZGVkXCIsIGFkZGVkQW5FbGVtZW50KTtcblxuXHRcdFx0Ly8gbm8gbmV3IGVsZW1lbnRzIGZvdW5kLiBTdG9wIGNsaWNraW5nIHRoaXMgYnV0dG9uXG4gICAgICBpZiAoIWFkZGVkQW5FbGVtZW50KSB7XG4gICAgICAgIGRvbmVDbGlja2luZ0VsZW1lbnRzLnB1c2goY3VycmVudENsaWNrRWxlbWVudClcbiAgICAgIH1cblxuXHRcdFx0Ly8gY29udGludWUgY2xpY2tpbmcgYW5kIGFkZCBkZWxheSwgYnV0IGlmIHRoZXJlIGlzIG5vdGhpbmdcblx0XHRcdC8vIG1vcmUgdG8gY2xpY2sgdGhlIGZpbmlzaFxuXHRcdFx0Ly8gY29uc29sZS5sb2coXCJ0b3RhbCBidXR0b25zXCIsIGNsaWNrRWxlbWVudHMubGVuZ3RoKVxuICAgICAgaWYgKGNsaWNrRWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpXG4gICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZShmb3VuZEVsZW1lbnRzKVxuICAgICAgfSBlbHNlIHtcblx0XHRcdFx0Ly8gY29uc29sZS5sb2coXCJjbGlja1wiKTtcbiAgICAgICAgY3VycmVudENsaWNrRWxlbWVudCA9IGNsaWNrRWxlbWVudHNbMF1cblx0XHRcdFx0Ly8gY2xpY2sgb24gZWxlbWVudHMgb25seSBvbmNlIGlmIHRoZSB0eXBlIGlzIGNsaWNrb25jZVxuICAgICAgICBpZiAodGhpcy5jbGlja1R5cGUgPT09ICdjbGlja09uY2UnKSB7XG4gICAgICAgICAgZG9uZUNsaWNraW5nRWxlbWVudHMucHVzaChjdXJyZW50Q2xpY2tFbGVtZW50KVxuICAgICAgICB9XG4gICAgICAgIHRoaXMudHJpZ2dlckJ1dHRvbkNsaWNrKGN1cnJlbnRDbGlja0VsZW1lbnQpXG4gICAgICAgIG5leHRFbGVtZW50U2VsZWN0aW9uID0gbm93ICsgZGVsYXlcbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcyksIDUwKVxuXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW11cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2RlbGF5JywgJ2NsaWNrRWxlbWVudFNlbGVjdG9yJywgJ2NsaWNrVHlwZScsICdkaXNjYXJkSW5pdGlhbEVsZW1lbnRzJywgJ2NsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlJ11cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yRWxlbWVudENsaWNrXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciBTZWxlY3RvckVsZW1lbnRTY3JvbGwgPSB7XG5cbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG4gIHNjcm9sbFRvQm90dG9tOiBmdW5jdGlvbiAoKSB7XG4gICAgd2luZG93LnNjcm9sbFRvKDAsIGRvY3VtZW50LmJvZHkuc2Nyb2xsSGVpZ2h0KVxuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZGVsYXkgPSBwYXJzZUludCh0aGlzLmRlbGF5KSB8fCAwXG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciBmb3VuZEVsZW1lbnRzID0gW11cblxuXHRcdC8vIGluaXRpYWxseSBzY3JvbGwgZG93biBhbmQgd2FpdFxuICAgIHRoaXMuc2Nyb2xsVG9Cb3R0b20oKVxuICAgIHZhciBuZXh0RWxlbWVudFNlbGVjdGlvbiA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCkgKyBkZWxheVxuXG5cdFx0Ly8gaW5maW5pdGVseSBzY3JvbGwgZG93biBhbmQgZmluZCBhbGwgaXRlbXNcbiAgICB2YXIgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgbm93ID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKVxuXHRcdFx0Ly8gc2xlZXAuIHdhaXQgd2hlbiB0byBleHRyYWN0IG5leHQgZWxlbWVudHNcbiAgICAgIGlmIChub3cgPCBuZXh0RWxlbWVudFNlbGVjdGlvbikge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcblx0XHRcdC8vIG5vIG5ldyBlbGVtZW50cyBmb3VuZFxuICAgICAgaWYgKGVsZW1lbnRzLmxlbmd0aCA9PT0gZm91bmRFbGVtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbClcbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKHRoaXMuJC5tYWtlQXJyYXkoZWxlbWVudHMpKVxuICAgICAgfSBlbHNlIHtcblx0XHRcdFx0Ly8gY29udGludWUgc2Nyb2xsaW5nIGFuZCBhZGQgZGVsYXlcbiAgICAgICAgZm91bmRFbGVtZW50cyA9IGVsZW1lbnRzXG4gICAgICAgIHRoaXMuc2Nyb2xsVG9Cb3R0b20oKVxuICAgICAgICBuZXh0RWxlbWVudFNlbGVjdGlvbiA9IG5vdyArIGRlbGF5XG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpLCA1MClcblxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFtdXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydtdWx0aXBsZScsICdkZWxheSddXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvckVsZW1lbnRTY3JvbGxcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxudmFyIFNlbGVjdG9yR3JvdXAgPSB7XG5cbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuSGF2ZUNoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZGZkID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgc2VsZiA9IHRoaXNcblx0XHQvLyBjYW5ub3QgcmV1c2UgdGhpcy5nZXREYXRhRWxlbWVudHMgYmVjYXVzZSBpdCBkZXBlbmRzIG9uICptdWx0aXBsZSogcHJvcGVydHlcbiAgICB2YXIgZWxlbWVudHMgPSBzZWxmLiQodGhpcy5zZWxlY3RvciwgcGFyZW50RWxlbWVudClcblxuICAgIHZhciByZWNvcmRzID0gW11cbiAgICBzZWxmLiQoZWxlbWVudHMpLmVhY2goZnVuY3Rpb24gKGssIGVsZW1lbnQpIHtcbiAgICAgIHZhciBkYXRhID0ge31cblxuICAgICAgZGF0YVt0aGlzLmlkXSA9IHNlbGYuJChlbGVtZW50KS50ZXh0KClcblxuICAgICAgaWYgKHRoaXMuZXh0cmFjdEF0dHJpYnV0ZSkge1xuICAgICAgICBkYXRhW3RoaXMuaWQgKyAnLScgKyB0aGlzLmV4dHJhY3RBdHRyaWJ1dGVdID0gc2VsZi4kKGVsZW1lbnQpLmF0dHIodGhpcy5leHRyYWN0QXR0cmlidXRlKVxuICAgICAgfVxuXG4gICAgICByZWNvcmRzLnB1c2goZGF0YSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICB2YXIgcmVzdWx0ID0ge31cbiAgICByZXN1bHRbdGhpcy5pZF0gPSByZWNvcmRzXG5cbiAgICBkZmQucmVzb2x2ZShbcmVzdWx0XSlcbiAgICByZXR1cm4gZGZkLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFt0aGlzLmlkXVxuICB9LFxuXG4gIGdldEZlYXR1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFsnZGVsYXknLCAnZXh0cmFjdEF0dHJpYnV0ZSddXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3Rvckdyb3VwXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciBTZWxlY3RvckhUTUwgPSB7XG5cbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5IYXZlTG9jYWxDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkNyZWF0ZU5ld0pvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBkZmQgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIHZhciBlbGVtZW50cyA9IHRoaXMuZ2V0RGF0YUVsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG5cbiAgICB2YXIgcmVzdWx0ID0gW11cbiAgICBzZWxmLiQoZWxlbWVudHMpLmVhY2goZnVuY3Rpb24gKGssIGVsZW1lbnQpIHtcbiAgICAgIHZhciBkYXRhID0ge31cbiAgICAgIHZhciBodG1sID0gc2VsZi4kKGVsZW1lbnQpLmh0bWwoKVxuXG4gICAgICBpZiAodGhpcy5yZWdleCAhPT0gdW5kZWZpbmVkICYmIHRoaXMucmVnZXgubGVuZ3RoKSB7XG4gICAgICAgIHZhciBtYXRjaGVzID0gaHRtbC5tYXRjaChuZXcgUmVnRXhwKHRoaXMucmVnZXgpKVxuICAgICAgICBpZiAobWF0Y2hlcyAhPT0gbnVsbCkge1xuICAgICAgICAgIGh0bWwgPSBtYXRjaGVzWzBdXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaHRtbCA9IG51bGxcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZGF0YVt0aGlzLmlkXSA9IGh0bWxcblxuICAgICAgcmVzdWx0LnB1c2goZGF0YSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICBpZiAodGhpcy5tdWx0aXBsZSA9PT0gZmFsc2UgJiYgZWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICBkYXRhW3RoaXMuaWRdID0gbnVsbFxuICAgICAgcmVzdWx0LnB1c2goZGF0YSlcbiAgICB9XG5cbiAgICBkZmQucmVzb2x2ZShyZXN1bHQpXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbdGhpcy5pZF1cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ3JlZ2V4JywgJ2RlbGF5J11cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9ySFRNTFxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgd2hlbkNhbGxTZXF1ZW50aWFsbHkgPSByZXF1aXJlKCcuLi8uLi9hc3NldHMvanF1ZXJ5LndoZW5jYWxsc2VxdWVudGlhbGx5JylcbnZhciBCYXNlNjQgPSByZXF1aXJlKCcuLi8uLi9hc3NldHMvYmFzZTY0JylcbnZhciBTZWxlY3RvckltYWdlID0ge1xuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuXG4gICAgdmFyIGRlZmVycmVkRGF0YUNhbGxzID0gW11cbiAgICB0aGlzLiQoZWxlbWVudHMpLmVhY2goZnVuY3Rpb24gKGksIGVsZW1lbnQpIHtcbiAgICAgIGRlZmVycmVkRGF0YUNhbGxzLnB1c2goZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZGVmZXJyZWREYXRhID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICAgICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICAgIGRhdGFbdGhpcy5pZCArICctc3JjJ10gPSBlbGVtZW50LnNyY1xuXG5cdFx0XHRcdC8vIGRvd25sb2FkIGltYWdlIGlmIHJlcXVpcmVkXG4gICAgICAgIGlmICghdGhpcy5kb3dubG9hZEltYWdlKSB7XG4gICAgICAgICAgZGVmZXJyZWREYXRhLnJlc29sdmUoZGF0YSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgZGVmZXJyZWRJbWFnZUJhc2U2NCA9IHRoaXMuZG93bmxvYWRJbWFnZUJhc2U2NChlbGVtZW50LnNyYylcblxuICAgICAgICAgIGRlZmVycmVkSW1hZ2VCYXNlNjQuZG9uZShmdW5jdGlvbiAoaW1hZ2VSZXNwb25zZSkge1xuICAgICAgICAgICAgZGF0YVsnX2ltYWdlQmFzZTY0LScgKyB0aGlzLmlkXSA9IGltYWdlUmVzcG9uc2UuaW1hZ2VCYXNlNjRcbiAgICAgICAgICAgIGRhdGFbJ19pbWFnZU1pbWVUeXBlLScgKyB0aGlzLmlkXSA9IGltYWdlUmVzcG9uc2UubWltZVR5cGVcblxuICAgICAgICAgICAgZGVmZXJyZWREYXRhLnJlc29sdmUoZGF0YSlcbiAgICAgICAgICB9LmJpbmQodGhpcykpLmZhaWwoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0Ly8gZmFpbGVkIHRvIGRvd25sb2FkIGltYWdlIGNvbnRpbnVlLlxuXHRcdFx0XHRcdFx0Ly8gQFRPRE8gaGFuZGxlIGVycnJvclxuICAgICAgICAgICAgZGVmZXJyZWREYXRhLnJlc29sdmUoZGF0YSlcbiAgICAgICAgICB9KVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGRlZmVycmVkRGF0YS5wcm9taXNlKClcbiAgICAgIH0uYmluZCh0aGlzKSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICB3aGVuQ2FsbFNlcXVlbnRpYWxseShkZWZlcnJlZERhdGFDYWxscykuZG9uZShmdW5jdGlvbiAoZGF0YVJlc3VsdHMpIHtcbiAgICAgIGlmICh0aGlzLm11bHRpcGxlID09PSBmYWxzZSAmJiBlbGVtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdmFyIGRhdGEgPSB7fVxuICAgICAgICBkYXRhW3RoaXMuaWQgKyAnLXNyYyddID0gbnVsbFxuICAgICAgICBkYXRhUmVzdWx0cy5wdXNoKGRhdGEpXG4gICAgICB9XG5cbiAgICAgIGRmZC5yZXNvbHZlKGRhdGFSZXN1bHRzKVxuICAgIH0pXG5cbiAgICByZXR1cm4gZGZkLnByb21pc2UoKVxuICB9LFxuXG4gIGRvd25sb2FkRmlsZUFzQmxvYjogZnVuY3Rpb24gKHVybCkge1xuICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KClcbiAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHRoaXMucmVhZHlTdGF0ZSA9PSA0KSB7XG4gICAgICAgIGlmICh0aGlzLnN0YXR1cyA9PSAyMDApIHtcbiAgICAgICAgICB2YXIgYmxvYiA9IHRoaXMucmVzcG9uc2VcbiAgICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUoYmxvYilcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlamVjdCh4aHIuc3RhdHVzVGV4dClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICB4aHIub3BlbignR0VUJywgdXJsKVxuICAgIHhoci5yZXNwb25zZVR5cGUgPSAnYmxvYidcbiAgICB4aHIuc2VuZCgpXG5cbiAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZS5wcm9taXNlKClcbiAgfSxcblxuICBkb3dubG9hZEltYWdlQmFzZTY0OiBmdW5jdGlvbiAodXJsKSB7XG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciBkZWZlcnJlZERvd25sb2FkID0gdGhpcy5kb3dubG9hZEZpbGVBc0Jsb2IodXJsKVxuICAgIGRlZmVycmVkRG93bmxvYWQuZG9uZShmdW5jdGlvbiAoYmxvYikge1xuICAgICAgdmFyIG1pbWVUeXBlID0gYmxvYi50eXBlXG4gICAgICB2YXIgZGVmZXJyZWRCbG9iID0gQmFzZTY0LmJsb2JUb0Jhc2U2NChibG9iKVxuICAgICAgZGVmZXJyZWRCbG9iLmRvbmUoZnVuY3Rpb24gKGltYWdlQmFzZTY0KSB7XG4gICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZSh7XG4gICAgICAgICAgbWltZVR5cGU6IG1pbWVUeXBlLFxuICAgICAgICAgIGltYWdlQmFzZTY0OiBpbWFnZUJhc2U2NFxuICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9KS5mYWlsKGRlZmVycmVkUmVzcG9uc2UuZmFpbClcbiAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZS5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbdGhpcy5pZCArICctc3JjJ11cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2RlbGF5JywgJ2Rvd25sb2FkSW1hZ2UnXVxuICB9LFxuXG4gIGdldEl0ZW1DU1NTZWxlY3RvcjogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAnaW1nJ1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JJbWFnZVxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgd2hlbkNhbGxTZXF1ZW50aWFsbHkgPSByZXF1aXJlKCcuLi8uLi9hc3NldHMvanF1ZXJ5LndoZW5jYWxsc2VxdWVudGlhbGx5JylcblxudmFyIFNlbGVjdG9yTGluayA9IHtcbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuICAgIHZhciBzZWxmID0gdGhpc1xuXG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cblx0XHQvLyByZXR1cm4gZW1wdHkgcmVjb3JkIGlmIG5vdCBtdWx0aXBsZSB0eXBlIGFuZCBubyBlbGVtZW50cyBmb3VuZFxuICAgIGlmICh0aGlzLm11bHRpcGxlID09PSBmYWxzZSAmJiBlbGVtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHZhciBkYXRhID0ge31cbiAgICAgIGRhdGFbdGhpcy5pZF0gPSBudWxsXG4gICAgICBkZmQucmVzb2x2ZShbZGF0YV0pXG4gICAgICByZXR1cm4gZGZkXG4gICAgfVxuXG5cdFx0Ly8gZXh0cmFjdCBsaW5rcyBvbmUgYnkgb25lXG4gICAgdmFyIGRlZmVycmVkRGF0YUV4dHJhY3Rpb25DYWxscyA9IFtdXG4gICAgc2VsZi4kKGVsZW1lbnRzKS5lYWNoKGZ1bmN0aW9uIChrLCBlbGVtZW50KSB7XG4gICAgICBkZWZlcnJlZERhdGFFeHRyYWN0aW9uQ2FsbHMucHVzaChmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICB2YXIgZGVmZXJyZWREYXRhID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICAgICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICAgIGRhdGFbdGhpcy5pZF0gPSBzZWxmLiQoZWxlbWVudCkudGV4dCgpXG4gICAgICAgIGRhdGEuX2ZvbGxvd1NlbGVjdG9ySWQgPSB0aGlzLmlkXG4gICAgICAgIGRhdGFbdGhpcy5pZCArICctaHJlZiddID0gZWxlbWVudC5ocmVmXG4gICAgICAgIGRhdGEuX2ZvbGxvdyA9IGVsZW1lbnQuaHJlZlxuICAgICAgICBkZWZlcnJlZERhdGEucmVzb2x2ZShkYXRhKVxuXG4gICAgICAgIHJldHVybiBkZWZlcnJlZERhdGFcbiAgICAgIH0uYmluZCh0aGlzLCBlbGVtZW50KSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICB3aGVuQ2FsbFNlcXVlbnRpYWxseShkZWZlcnJlZERhdGFFeHRyYWN0aW9uQ2FsbHMpLmRvbmUoZnVuY3Rpb24gKHJlc3BvbnNlcykge1xuICAgICAgdmFyIHJlc3VsdCA9IFtdXG4gICAgICByZXNwb25zZXMuZm9yRWFjaChmdW5jdGlvbiAoZGF0YVJlc3VsdCkge1xuICAgICAgICByZXN1bHQucHVzaChkYXRhUmVzdWx0KVxuICAgICAgfSlcbiAgICAgIGRmZC5yZXNvbHZlKHJlc3VsdClcbiAgICB9KVxuXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbdGhpcy5pZCwgdGhpcy5pZCArICctaHJlZiddXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydtdWx0aXBsZScsICdkZWxheSddXG4gIH0sXG5cbiAgZ2V0SXRlbUNTU1NlbGVjdG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICdhJ1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JMaW5rXG4iLCJ2YXIgd2hlbkNhbGxTZXF1ZW50aWFsbHkgPSByZXF1aXJlKCcuLi8uLi9hc3NldHMvanF1ZXJ5LndoZW5jYWxsc2VxdWVudGlhbGx5JylcbnZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxudmFyIENzc1NlbGVjdG9yID0gcmVxdWlyZSgnY3NzLXNlbGVjdG9yJykuQ3NzU2VsZWN0b3JcbnZhciBTZWxlY3RvclBvcHVwTGluayA9IHtcbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIHZhciBlbGVtZW50cyA9IHRoaXMuZ2V0RGF0YUVsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG5cbiAgICB2YXIgZGZkID0ganF1ZXJ5LkRlZmVycmVkKClcblxuXHRcdC8vIHJldHVybiBlbXB0eSByZWNvcmQgaWYgbm90IG11bHRpcGxlIHR5cGUgYW5kIG5vIGVsZW1lbnRzIGZvdW5kXG4gICAgaWYgKHRoaXMubXVsdGlwbGUgPT09IGZhbHNlICYmIGVsZW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuICAgICAgZGF0YVt0aGlzLmlkXSA9IG51bGxcbiAgICAgIGRmZC5yZXNvbHZlKFtkYXRhXSlcbiAgICAgIHJldHVybiBkZmRcbiAgICB9XG5cblx0XHQvLyBleHRyYWN0IGxpbmtzIG9uZSBieSBvbmVcbiAgICB2YXIgZGVmZXJyZWREYXRhRXh0cmFjdGlvbkNhbGxzID0gW11cbiAgICAkKGVsZW1lbnRzKS5lYWNoKGZ1bmN0aW9uIChrLCBlbGVtZW50KSB7XG4gICAgICBkZWZlcnJlZERhdGFFeHRyYWN0aW9uQ2FsbHMucHVzaChmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICB2YXIgZGVmZXJyZWREYXRhID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICAgICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICAgIGRhdGFbdGhpcy5pZF0gPSAkKGVsZW1lbnQpLnRleHQoKVxuICAgICAgICBkYXRhLl9mb2xsb3dTZWxlY3RvcklkID0gdGhpcy5pZFxuXG4gICAgICAgIHZhciBkZWZlcnJlZFBvcHVwVVJMID0gdGhpcy5nZXRQb3B1cFVSTChlbGVtZW50KVxuICAgICAgICBkZWZlcnJlZFBvcHVwVVJMLmRvbmUoZnVuY3Rpb24gKHVybCkge1xuICAgICAgICAgIGRhdGFbdGhpcy5pZCArICctaHJlZiddID0gdXJsXG4gICAgICAgICAgZGF0YS5fZm9sbG93ID0gdXJsXG4gICAgICAgICAgZGVmZXJyZWREYXRhLnJlc29sdmUoZGF0YSlcbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgICAgIHJldHVybiBkZWZlcnJlZERhdGFcbiAgICAgIH0uYmluZCh0aGlzLCBlbGVtZW50KSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICB3aGVuQ2FsbFNlcXVlbnRpYWxseShkZWZlcnJlZERhdGFFeHRyYWN0aW9uQ2FsbHMpLmRvbmUoZnVuY3Rpb24gKHJlc3BvbnNlcykge1xuICAgICAgdmFyIHJlc3VsdCA9IFtdXG4gICAgICByZXNwb25zZXMuZm9yRWFjaChmdW5jdGlvbiAoZGF0YVJlc3VsdCkge1xuICAgICAgICByZXN1bHQucHVzaChkYXRhUmVzdWx0KVxuICAgICAgfSlcbiAgICAgIGRmZC5yZXNvbHZlKHJlc3VsdClcbiAgICB9KVxuXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcbiAgfSxcblxuXHQvKipcblx0ICogR2V0cyBhbiB1cmwgZnJvbSBhIHdpbmRvdy5vcGVuIGNhbGwgYnkgbW9ja2luZyB0aGUgd2luZG93Lm9wZW4gZnVuY3Rpb25cblx0ICogQHBhcmFtIGVsZW1lbnRcblx0ICogQHJldHVybnMgJC5EZWZlcnJlZCgpXG5cdCAqL1xuICBnZXRQb3B1cFVSTDogZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIC8vIG92ZXJyaWRlIHdpbmRvdy5vcGVuIGZ1bmN0aW9uLiB3ZSBuZWVkIHRvIGV4ZWN1dGUgdGhpcyBpbiBwYWdlIHNjb3BlLlxuXHRcdC8vIHdlIG5lZWQgdG8ga25vdyBob3cgdG8gZmluZCB0aGlzIGVsZW1lbnQgZnJvbSBwYWdlIHNjb3BlLlxuICAgIHZhciBjcyA9IG5ldyBDc3NTZWxlY3Rvcih7XG4gICAgICBlbmFibGVTbWFydFRhYmxlU2VsZWN0b3I6IGZhbHNlLFxuICAgICAgcGFyZW50OiBkb2N1bWVudC5ib2R5LFxuICAgICAgZW5hYmxlUmVzdWx0U3RyaXBwaW5nOiBmYWxzZVxuICAgIH0pXG4gICAgdmFyIGNzc1NlbGVjdG9yID0gY3MuZ2V0Q3NzU2VsZWN0b3IoW2VsZW1lbnRdKVxuICAgIGNvbnNvbGUubG9nKGNzc1NlbGVjdG9yKVxuICAgIGNvbnNvbGUubG9nKGRvY3VtZW50LmJvZHkucXVlcnlTZWxlY3RvckFsbChjc3NTZWxlY3RvcikpXG5cdFx0Ly8gdGhpcyBmdW5jdGlvbiB3aWxsIGNhdGNoIHdpbmRvdy5vcGVuIGNhbGwgYW5kIHBsYWNlIHRoZSByZXF1ZXN0ZWQgdXJsIGFzIHRoZSBlbGVtZW50cyBkYXRhIGF0dHJpYnV0ZVxuICAgIHZhciBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKVxuICAgIHNjcmlwdC50eXBlID0gJ3RleHQvamF2YXNjcmlwdCdcbiAgICBjb25zb2xlLmxvZyhjc3NTZWxlY3RvcilcbiAgICBjb25zb2xlLmxvZyhkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKGNzc1NlbGVjdG9yKSlcbiAgICBzY3JpcHQudGV4dCA9IGBcblx0XHRcdChmdW5jdGlvbigpe1xuICAgICAgICB2YXIgb3BlbiA9IHdpbmRvdy5vcGVuO1xuICAgICAgICB2YXIgZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcke2Nzc1NlbGVjdG9yfScpWzBdO1xuICAgICAgICB2YXIgb3Blbk5ldyA9IGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgICB2YXIgdXJsID0gYXJndW1lbnRzWzBdOyBcbiAgICAgICAgICBlbC5kYXRhc2V0LndlYlNjcmFwZXJFeHRyYWN0VXJsID0gdXJsOyBcbiAgICAgICAgICB3aW5kb3cub3BlbiA9IG9wZW47IFxuICAgICAgICB9O1xuICAgICAgICB3aW5kb3cub3BlbiA9IG9wZW5OZXc7IFxuICAgICAgICBlbC5jbGljaygpOyBcblx0XHRcdH0pKClgXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzY3JpcHQpXG5cblx0XHQvLyB3YWl0IGZvciB1cmwgdG8gYmUgYXZhaWxhYmxlXG4gICAgdmFyIGRlZmVycmVkVVJMID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgdGltZW91dCA9IE1hdGguYWJzKDUwMDAgLyAzMCkgLy8gNXMgdGltZW91dCB0byBnZW5lcmF0ZSBhbiB1cmwgZm9yIHBvcHVwXG4gICAgdmFyIGludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHVybCA9ICQoZWxlbWVudCkuZGF0YSgnd2ViLXNjcmFwZXItZXh0cmFjdC11cmwnKVxuICAgICAgaWYgKHVybCkge1xuICAgICAgICBkZWZlcnJlZFVSTC5yZXNvbHZlKHVybClcbiAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbClcbiAgICAgICAgc2NyaXB0LnJlbW92ZSgpXG4gICAgICB9XG5cdFx0XHQvLyB0aW1lb3V0IHBvcHVwIG9wZW5pbmdcbiAgICAgIGlmICh0aW1lb3V0LS0gPD0gMCkge1xuICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKVxuICAgICAgICBzY3JpcHQucmVtb3ZlKClcbiAgICAgIH1cbiAgICB9LCAzMClcblxuICAgIHJldHVybiBkZWZlcnJlZFVSTC5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbdGhpcy5pZCwgdGhpcy5pZCArICctaHJlZiddXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydtdWx0aXBsZScsICdkZWxheSddXG4gIH0sXG5cbiAgZ2V0SXRlbUNTU1NlbGVjdG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICcqJ1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JQb3B1cExpbmtcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxuXG52YXIgU2VsZWN0b3JUYWJsZSA9IHtcblxuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgZ2V0VGFibGVIZWFkZXJDb2x1bW5zOiBmdW5jdGlvbiAoJHRhYmxlKSB7XG4gICAgdmFyIGNvbHVtbnMgPSB7fVxuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIGhlYWRlclJvd1NlbGVjdG9yID0gdGhpcy5nZXRUYWJsZUhlYWRlclJvd1NlbGVjdG9yKClcbiAgICB2YXIgJGhlYWRlclJvdyA9ICQoJHRhYmxlKS5maW5kKGhlYWRlclJvd1NlbGVjdG9yKVxuICAgIGlmICgkaGVhZGVyUm93Lmxlbmd0aCA+IDApIHtcbiAgICAgICRoZWFkZXJSb3cuZmluZCgndGQsdGgnKS5lYWNoKGZ1bmN0aW9uIChpKSB7XG4gICAgICAgIHZhciBoZWFkZXIgPSAkKHRoaXMpLnRleHQoKS50cmltKClcbiAgICAgICAgY29sdW1uc1toZWFkZXJdID0ge1xuICAgICAgICAgIGluZGV4OiBpICsgMVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgICByZXR1cm4gY29sdW1uc1xuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZGZkID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgJCA9IHRoaXMuJFxuXG4gICAgdmFyIHRhYmxlcyA9IHRoaXMuZ2V0RGF0YUVsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG5cbiAgICB2YXIgcmVzdWx0ID0gW11cbiAgICAkKHRhYmxlcykuZWFjaChmdW5jdGlvbiAoaywgdGFibGUpIHtcbiAgICAgIHZhciBjb2x1bW5zID0gdGhpcy5nZXRUYWJsZUhlYWRlckNvbHVtbnMoJCh0YWJsZSkpXG5cbiAgICAgIHZhciBkYXRhUm93U2VsZWN0b3IgPSB0aGlzLmdldFRhYmxlRGF0YVJvd1NlbGVjdG9yKClcbiAgICAgICQodGFibGUpLmZpbmQoZGF0YVJvd1NlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uIChpLCByb3cpIHtcbiAgICAgICAgdmFyIGRhdGEgPSB7fVxuICAgICAgICB0aGlzLmNvbHVtbnMuZm9yRWFjaChmdW5jdGlvbiAoY29sdW1uKSB7XG4gICAgICAgICAgaWYgKGNvbHVtbi5leHRyYWN0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICBpZiAoY29sdW1uc1tjb2x1bW4uaGVhZGVyXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIGRhdGFbY29sdW1uLm5hbWVdID0gbnVsbFxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdmFyIHJvd1RleHQgPSAkKHJvdykuZmluZCgnPjpudGgtY2hpbGQoJyArIGNvbHVtbnNbY29sdW1uLmhlYWRlcl0uaW5kZXggKyAnKScpLnRleHQoKS50cmltKClcbiAgICAgICAgICAgICAgZGF0YVtjb2x1bW4ubmFtZV0gPSByb3dUZXh0XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICByZXN1bHQucHVzaChkYXRhKVxuICAgICAgfS5iaW5kKHRoaXMpKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIGRmZC5yZXNvbHZlKHJlc3VsdClcbiAgICByZXR1cm4gZGZkLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGRhdGFDb2x1bW5zID0gW11cbiAgICB0aGlzLmNvbHVtbnMuZm9yRWFjaChmdW5jdGlvbiAoY29sdW1uKSB7XG4gICAgICBpZiAoY29sdW1uLmV4dHJhY3QgPT09IHRydWUpIHtcbiAgICAgICAgZGF0YUNvbHVtbnMucHVzaChjb2x1bW4ubmFtZSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBkYXRhQ29sdW1uc1xuICB9LFxuXG4gIGdldEZlYXR1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFsnbXVsdGlwbGUnLCAnY29sdW1ucycsICdkZWxheScsICd0YWJsZURhdGFSb3dTZWxlY3RvcicsICd0YWJsZUhlYWRlclJvd1NlbGVjdG9yJ11cbiAgfSxcblxuICBnZXRJdGVtQ1NTU2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gJ3RhYmxlJ1xuICB9LFxuXG4gIGdldFRhYmxlSGVhZGVyUm93U2VsZWN0b3JGcm9tVGFibGVIVE1MOiBmdW5jdGlvbiAoaHRtbCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdmFyICQgPSBvcHRpb25zLiQgfHwgdGhpcy4kXG4gICAgdmFyICR0YWJsZSA9ICQoaHRtbClcbiAgICBpZiAoJHRhYmxlLmZpbmQoJ3RoZWFkIHRyOmhhcyh0ZDpub3QoOmVtcHR5KSksIHRoZWFkIHRyOmhhcyh0aDpub3QoOmVtcHR5KSknKS5sZW5ndGgpIHtcbiAgICAgIGlmICgkdGFibGUuZmluZCgndGhlYWQgdHInKS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmV0dXJuICd0aGVhZCB0cidcbiAgICAgIH1cdFx0XHRlbHNlIHtcbiAgICAgICAgdmFyICRyb3dzID0gJHRhYmxlLmZpbmQoJ3RoZWFkIHRyJylcblx0XHRcdFx0Ly8gZmlyc3Qgcm93IHdpdGggZGF0YVxuICAgICAgICB2YXIgcm93SW5kZXggPSAkcm93cy5pbmRleCgkcm93cy5maWx0ZXIoJzpoYXModGQ6bm90KDplbXB0eSkpLDpoYXModGg6bm90KDplbXB0eSkpJylbMF0pXG4gICAgICAgIHJldHVybiAndGhlYWQgdHI6bnRoLW9mLXR5cGUoJyArIChyb3dJbmRleCArIDEpICsgJyknXG4gICAgICB9XG4gICAgfVx0XHRlbHNlIGlmICgkdGFibGUuZmluZCgndHIgdGQ6bm90KDplbXB0eSksIHRyIHRoOm5vdCg6ZW1wdHkpJykubGVuZ3RoKSB7XG4gICAgICB2YXIgJHJvd3MgPSAkdGFibGUuZmluZCgndHInKVxuXHRcdFx0Ly8gZmlyc3Qgcm93IHdpdGggZGF0YVxuICAgICAgdmFyIHJvd0luZGV4ID0gJHJvd3MuaW5kZXgoJHJvd3MuZmlsdGVyKCc6aGFzKHRkOm5vdCg6ZW1wdHkpKSw6aGFzKHRoOm5vdCg6ZW1wdHkpKScpWzBdKVxuICAgICAgcmV0dXJuICd0cjpudGgtb2YtdHlwZSgnICsgKHJvd0luZGV4ICsgMSkgKyAnKSdcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgcmV0dXJuICcnXG4gICAgfVxuICB9LFxuXG4gIGdldFRhYmxlRGF0YVJvd1NlbGVjdG9yRnJvbVRhYmxlSFRNTDogZnVuY3Rpb24gKGh0bWwsIG9wdGlvbnMgPSB7fSkge1xuICAgIHZhciAkID0gb3B0aW9ucy4kIHx8IHRoaXMuJFxuICAgIHZhciAkdGFibGUgPSAkKGh0bWwpXG4gICAgaWYgKCR0YWJsZS5maW5kKCd0aGVhZCB0cjpoYXModGQ6bm90KDplbXB0eSkpLCB0aGVhZCB0cjpoYXModGg6bm90KDplbXB0eSkpJykubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gJ3Rib2R5IHRyJ1xuICAgIH1cdFx0ZWxzZSBpZiAoJHRhYmxlLmZpbmQoJ3RyIHRkOm5vdCg6ZW1wdHkpLCB0ciB0aDpub3QoOmVtcHR5KScpLmxlbmd0aCkge1xuICAgICAgdmFyICRyb3dzID0gJHRhYmxlLmZpbmQoJ3RyJylcblx0XHRcdC8vIGZpcnN0IHJvdyB3aXRoIGRhdGFcbiAgICAgIHZhciByb3dJbmRleCA9ICRyb3dzLmluZGV4KCRyb3dzLmZpbHRlcignOmhhcyh0ZDpub3QoOmVtcHR5KSksOmhhcyh0aDpub3QoOmVtcHR5KSknKVswXSlcbiAgICAgIHJldHVybiAndHI6bnRoLW9mLXR5cGUobisnICsgKHJvd0luZGV4ICsgMikgKyAnKSdcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgcmV0dXJuICcnXG4gICAgfVxuICB9LFxuXG4gIGdldFRhYmxlSGVhZGVyUm93U2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcblx0XHQvLyBoYW5kbGUgbGVnYWN5IHNlbGVjdG9yc1xuICAgIGlmICh0aGlzLnRhYmxlSGVhZGVyUm93U2VsZWN0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuICd0aGVhZCB0cidcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMudGFibGVIZWFkZXJSb3dTZWxlY3RvclxuICAgIH1cbiAgfSxcblxuICBnZXRUYWJsZURhdGFSb3dTZWxlY3RvcjogZnVuY3Rpb24gKCkge1xuXHRcdC8vIGhhbmRsZSBsZWdhY3kgc2VsZWN0b3JzXG4gICAgaWYgKHRoaXMudGFibGVEYXRhUm93U2VsZWN0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuICd0Ym9keSB0cidcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMudGFibGVEYXRhUm93U2VsZWN0b3JcbiAgICB9XG4gIH0sXG5cblx0LyoqXG5cdCAqIEV4dHJhY3QgdGFibGUgaGVhZGVyIGNvbHVtbiBpbmZvIGZyb20gaHRtbFxuXHQgKiBAcGFyYW0gaHRtbFxuXHQgKi9cbiAgZ2V0VGFibGVIZWFkZXJDb2x1bW5zRnJvbUhUTUw6IGZ1bmN0aW9uIChoZWFkZXJSb3dTZWxlY3RvciwgaHRtbCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdmFyICQgPSBvcHRpb25zLiQgfHwgdGhpcy4kXG4gICAgdmFyICR0YWJsZSA9ICQoaHRtbClcbiAgICB2YXIgJGhlYWRlclJvd0NvbHVtbnMgPSAkdGFibGUuZmluZChoZWFkZXJSb3dTZWxlY3RvcikuZmluZCgndGQsdGgnKVxuXG4gICAgdmFyIGNvbHVtbnMgPSBbXVxuXG4gICAgJGhlYWRlclJvd0NvbHVtbnMuZWFjaChmdW5jdGlvbiAoaSwgY29sdW1uRWwpIHtcbiAgICAgIHZhciBoZWFkZXIgPSAkKGNvbHVtbkVsKS50ZXh0KCkudHJpbSgpXG4gICAgICB2YXIgbmFtZSA9IGhlYWRlclxuICAgICAgaWYgKGhlYWRlci5sZW5ndGggIT09IDApIHtcbiAgICAgICAgY29sdW1ucy5wdXNoKHtcbiAgICAgICAgICBoZWFkZXI6IGhlYWRlcixcbiAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgIGV4dHJhY3Q6IHRydWVcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBjb2x1bW5zXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvclRhYmxlXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciBTZWxlY3RvclRleHQgPSB7XG5cbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5IYXZlTG9jYWxDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkNyZWF0ZU5ld0pvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuXG4gICAgdmFyIHJlc3VsdCA9IFtdXG4gICAgJChlbGVtZW50cykuZWFjaChmdW5jdGlvbiAoaywgZWxlbWVudCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuXG5cdFx0XHQvLyByZW1vdmUgc2NyaXB0LCBzdHlsZSB0YWcgY29udGVudHMgZnJvbSB0ZXh0IHJlc3VsdHNcbiAgICAgIHZhciAkZWxlbWVudF9jbG9uZSA9ICQoZWxlbWVudCkuY2xvbmUoKVxuICAgICAgJGVsZW1lbnRfY2xvbmUuZmluZCgnc2NyaXB0LCBzdHlsZScpLnJlbW92ZSgpXG5cdFx0XHQvLyA8YnI+IHJlcGxhY2UgYnIgdGFncyB3aXRoIG5ld2xpbmVzXG4gICAgICAkZWxlbWVudF9jbG9uZS5maW5kKCdicicpLmFmdGVyKCdcXG4nKVxuXG4gICAgICB2YXIgdGV4dCA9ICRlbGVtZW50X2Nsb25lLnRleHQoKVxuICAgICAgaWYgKHRoaXMucmVnZXggIT09IHVuZGVmaW5lZCAmJiB0aGlzLnJlZ2V4Lmxlbmd0aCkge1xuICAgICAgICB2YXIgbWF0Y2hlcyA9IHRleHQubWF0Y2gobmV3IFJlZ0V4cCh0aGlzLnJlZ2V4KSlcbiAgICAgICAgaWYgKG1hdGNoZXMgIT09IG51bGwpIHtcbiAgICAgICAgICB0ZXh0ID0gbWF0Y2hlc1swXVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRleHQgPSBudWxsXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGRhdGFbdGhpcy5pZF0gPSB0ZXh0XG5cbiAgICAgIHJlc3VsdC5wdXNoKGRhdGEpXG4gICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgaWYgKHRoaXMubXVsdGlwbGUgPT09IGZhbHNlICYmIGVsZW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuICAgICAgZGF0YVt0aGlzLmlkXSA9IG51bGxcbiAgICAgIHJlc3VsdC5wdXNoKGRhdGEpXG4gICAgfVxuXG4gICAgZGZkLnJlc29sdmUocmVzdWx0KVxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW3RoaXMuaWRdXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydtdWx0aXBsZScsICdyZWdleCcsICdkZWxheSddXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvclRleHRcbiIsInZhciBTZWxlY3RvciA9IHJlcXVpcmUoJy4vU2VsZWN0b3InKVxuXG52YXIgU2VsZWN0b3JMaXN0ID0gZnVuY3Rpb24gKHNlbGVjdG9ycywgb3B0aW9ucykge1xuICB0aGlzLiQgPSBvcHRpb25zLiRcbiAgaWYgKCFvcHRpb25zLiQpIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBqcXVlcnknKVxuXG4gIGlmIChzZWxlY3RvcnMgPT09IG51bGwgfHwgc2VsZWN0b3JzID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZWN0b3JzLmxlbmd0aDsgaSsrKSB7XG4gICAgdGhpcy5wdXNoKHNlbGVjdG9yc1tpXSlcbiAgfVxufVxuXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlID0gW11cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gIGlmICghdGhpcy5oYXNTZWxlY3RvcihzZWxlY3Rvci5pZCkpIHtcbiAgICBpZiAoIShzZWxlY3RvciBpbnN0YW5jZW9mIFNlbGVjdG9yKSkge1xuICAgICAgc2VsZWN0b3IgPSBuZXcgU2VsZWN0b3Ioc2VsZWN0b3IsIHskOiB0aGlzLiR9KVxuICAgIH1cbiAgICBBcnJheS5wcm90b3R5cGUucHVzaC5jYWxsKHRoaXMsIHNlbGVjdG9yKVxuICB9XG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuaGFzU2VsZWN0b3IgPSBmdW5jdGlvbiAoc2VsZWN0b3JJZCkge1xuICBpZiAoc2VsZWN0b3JJZCBpbnN0YW5jZW9mIE9iamVjdCkge1xuICAgIHNlbGVjdG9ySWQgPSBzZWxlY3RvcklkLmlkXG4gIH1cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAodGhpc1tpXS5pZCA9PT0gc2VsZWN0b3JJZCkge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59XG5cbi8qKlxuICogUmV0dXJucyBhbGwgc2VsZWN0b3JzIG9yIHJlY3Vyc2l2ZWx5IGZpbmQgYW5kIHJldHVybiBhbGwgY2hpbGQgc2VsZWN0b3JzIG9mIGEgcGFyZW50IHNlbGVjdG9yLlxuICogQHBhcmFtIHBhcmVudFNlbGVjdG9ySWRcbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqL1xuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5nZXRBbGxTZWxlY3RvcnMgPSBmdW5jdGlvbiAocGFyZW50U2VsZWN0b3JJZCkge1xuICBpZiAocGFyZW50U2VsZWN0b3JJZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHZhciBnZXRBbGxDaGlsZFNlbGVjdG9ycyA9IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3RvcklkLCByZXN1bHRTZWxlY3RvcnMpIHtcbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICBpZiAoc2VsZWN0b3IuaGFzUGFyZW50U2VsZWN0b3IocGFyZW50U2VsZWN0b3JJZCkpIHtcbiAgICAgICAgaWYgKHJlc3VsdFNlbGVjdG9ycy5pbmRleE9mKHNlbGVjdG9yKSA9PT0gLTEpIHtcbiAgICAgICAgICByZXN1bHRTZWxlY3RvcnMucHVzaChzZWxlY3RvcilcbiAgICAgICAgICBnZXRBbGxDaGlsZFNlbGVjdG9ycyhzZWxlY3Rvci5pZCwgcmVzdWx0U2VsZWN0b3JzKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgfS5iaW5kKHRoaXMpXG5cbiAgdmFyIHJlc3VsdFNlbGVjdG9ycyA9IFtdXG4gIGdldEFsbENoaWxkU2VsZWN0b3JzKHBhcmVudFNlbGVjdG9ySWQsIHJlc3VsdFNlbGVjdG9ycylcbiAgcmV0dXJuIHJlc3VsdFNlbGVjdG9yc1xufVxuXG4vKipcbiAqIFJldHVybnMgb25seSBzZWxlY3RvcnMgdGhhdCBhcmUgZGlyZWN0bHkgdW5kZXIgYSBwYXJlbnRcbiAqIEBwYXJhbSBwYXJlbnRTZWxlY3RvcklkXG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZ2V0RGlyZWN0Q2hpbGRTZWxlY3RvcnMgPSBmdW5jdGlvbiAocGFyZW50U2VsZWN0b3JJZCkge1xuICB2YXIgcmVzdWx0U2VsZWN0b3JzID0gbmV3IFNlbGVjdG9yTGlzdChudWxsLCB7JDogdGhpcy4kfSlcbiAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgIGlmIChzZWxlY3Rvci5oYXNQYXJlbnRTZWxlY3RvcihwYXJlbnRTZWxlY3RvcklkKSkge1xuICAgICAgcmVzdWx0U2VsZWN0b3JzLnB1c2goc2VsZWN0b3IpXG4gICAgfVxuICB9KVxuICByZXR1cm4gcmVzdWx0U2VsZWN0b3JzXG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciByZXN1bHRMaXN0ID0gbmV3IFNlbGVjdG9yTGlzdChudWxsLCB7JDogdGhpcy4kfSlcbiAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgIHJlc3VsdExpc3QucHVzaChzZWxlY3RvcilcbiAgfSlcbiAgcmV0dXJuIHJlc3VsdExpc3Rcbn1cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5mdWxsQ2xvbmUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciByZXN1bHRMaXN0ID0gbmV3IFNlbGVjdG9yTGlzdChudWxsLCB7JDogdGhpcy4kfSlcbiAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgIHJlc3VsdExpc3QucHVzaChKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHNlbGVjdG9yKSkpXG4gIH0pXG4gIHJldHVybiByZXN1bHRMaXN0XG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuY29uY2F0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgcmVzdWx0TGlzdCA9IHRoaXMuY2xvbmUoKVxuICBmb3IgKHZhciBpIGluIGFyZ3VtZW50cykge1xuICAgIGFyZ3VtZW50c1tpXS5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgcmVzdWx0TGlzdC5wdXNoKHNlbGVjdG9yKVxuICAgIH0pXG4gIH1cbiAgcmV0dXJuIHJlc3VsdExpc3Rcbn1cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5nZXRTZWxlY3RvciA9IGZ1bmN0aW9uIChzZWxlY3RvcklkKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBzZWxlY3RvciA9IHRoaXNbaV1cbiAgICBpZiAoc2VsZWN0b3IuaWQgPT09IHNlbGVjdG9ySWQpIHtcbiAgICAgIHJldHVybiBzZWxlY3RvclxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFJldHVybnMgYWxsIHNlbGVjdG9ycyBpZiB0aGlzIHNlbGVjdG9ycyBpbmNsdWRpbmcgYWxsIHBhcmVudCBzZWxlY3RvcnMgd2l0aGluIHRoaXMgcGFnZVxuICogQFRPRE8gbm90IHVzZWQgYW55IG1vcmUuXG4gKiBAcGFyYW0gc2VsZWN0b3JJZFxuICogQHJldHVybnMgeyp9XG4gKi9cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZ2V0T25lUGFnZVNlbGVjdG9ycyA9IGZ1bmN0aW9uIChzZWxlY3RvcklkKSB7XG4gIHZhciByZXN1bHRMaXN0ID0gbmV3IFNlbGVjdG9yTGlzdChudWxsLCB7JDogdGhpcy4kfSlcbiAgdmFyIHNlbGVjdG9yID0gdGhpcy5nZXRTZWxlY3RvcihzZWxlY3RvcklkKVxuICByZXN1bHRMaXN0LnB1c2godGhpcy5nZXRTZWxlY3RvcihzZWxlY3RvcklkKSlcblxuXHQvLyByZWN1cnNpdmVseSBmaW5kIGFsbCBwYXJlbnQgc2VsZWN0b3JzIHRoYXQgY291bGQgbGVhZCB0byB0aGUgcGFnZSB3aGVyZSBzZWxlY3RvcklkIGlzIHVzZWQuXG4gIHZhciBmaW5kUGFyZW50U2VsZWN0b3JzID0gZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgc2VsZWN0b3IucGFyZW50U2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9ySWQpIHtcbiAgICAgIGlmIChwYXJlbnRTZWxlY3RvcklkID09PSAnX3Jvb3QnKSByZXR1cm5cbiAgICAgIHZhciBwYXJlbnRTZWxlY3RvciA9IHRoaXMuZ2V0U2VsZWN0b3IocGFyZW50U2VsZWN0b3JJZClcbiAgICAgIGlmIChyZXN1bHRMaXN0LmluZGV4T2YocGFyZW50U2VsZWN0b3IpICE9PSAtMSkgcmV0dXJuXG4gICAgICBpZiAocGFyZW50U2VsZWN0b3Iud2lsbFJldHVybkVsZW1lbnRzKCkpIHtcbiAgICAgICAgcmVzdWx0TGlzdC5wdXNoKHBhcmVudFNlbGVjdG9yKVxuICAgICAgICBmaW5kUGFyZW50U2VsZWN0b3JzKHBhcmVudFNlbGVjdG9yKVxuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfS5iaW5kKHRoaXMpXG5cbiAgZmluZFBhcmVudFNlbGVjdG9ycyhzZWxlY3RvcilcblxuXHQvLyBhZGQgYWxsIGNoaWxkIHNlbGVjdG9yc1xuICByZXN1bHRMaXN0ID0gcmVzdWx0TGlzdC5jb25jYXQodGhpcy5nZXRTaW5nbGVQYWdlQWxsQ2hpbGRTZWxlY3RvcnMoc2VsZWN0b3IuaWQpKVxuICByZXR1cm4gcmVzdWx0TGlzdFxufVxuXG4vKipcbiAqIFJldHVybnMgYWxsIGNoaWxkIHNlbGVjdG9ycyBvZiBhIHNlbGVjdG9yIHdoaWNoIGNhbiBiZSB1c2VkIHdpdGhpbiBvbmUgcGFnZS5cbiAqIEBwYXJhbSBwYXJlbnRTZWxlY3RvcklkXG4gKi9cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZ2V0U2luZ2xlUGFnZUFsbENoaWxkU2VsZWN0b3JzID0gZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9ySWQpIHtcbiAgdmFyIHJlc3VsdExpc3QgPSBuZXcgU2VsZWN0b3JMaXN0KG51bGwsIHskOiB0aGlzLiR9KVxuICB2YXIgYWRkQ2hpbGRTZWxlY3RvcnMgPSBmdW5jdGlvbiAocGFyZW50U2VsZWN0b3IpIHtcbiAgICBpZiAocGFyZW50U2VsZWN0b3Iud2lsbFJldHVybkVsZW1lbnRzKCkpIHtcbiAgICAgIHZhciBjaGlsZFNlbGVjdG9ycyA9IHRoaXMuZ2V0RGlyZWN0Q2hpbGRTZWxlY3RvcnMocGFyZW50U2VsZWN0b3IuaWQpXG4gICAgICBjaGlsZFNlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChjaGlsZFNlbGVjdG9yKSB7XG4gICAgICAgIGlmIChyZXN1bHRMaXN0LmluZGV4T2YoY2hpbGRTZWxlY3RvcikgPT09IC0xKSB7XG4gICAgICAgICAgcmVzdWx0TGlzdC5wdXNoKGNoaWxkU2VsZWN0b3IpXG4gICAgICAgICAgYWRkQ2hpbGRTZWxlY3RvcnMoY2hpbGRTZWxlY3RvcilcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG4gIH0uYmluZCh0aGlzKVxuXG4gIHZhciBwYXJlbnRTZWxlY3RvciA9IHRoaXMuZ2V0U2VsZWN0b3IocGFyZW50U2VsZWN0b3JJZClcbiAgYWRkQ2hpbGRTZWxlY3RvcnMocGFyZW50U2VsZWN0b3IpXG4gIHJldHVybiByZXN1bHRMaXN0XG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUud2lsbFJldHVybk11bHRpcGxlUmVjb3JkcyA9IGZ1bmN0aW9uIChzZWxlY3RvcklkKSB7XG5cdC8vIGhhbmRsZSByZXVxZXN0ZWQgc2VsZWN0b3JcbiAgdmFyIHNlbGVjdG9yID0gdGhpcy5nZXRTZWxlY3RvcihzZWxlY3RvcklkKVxuICBpZiAoc2VsZWN0b3Iud2lsbFJldHVybk11bHRpcGxlUmVjb3JkcygpID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuXG5cdC8vIGhhbmRsZSBhbGwgaXRzIGNoaWxkIHNlbGVjdG9yc1xuICB2YXIgY2hpbGRTZWxlY3RvcnMgPSB0aGlzLmdldEFsbFNlbGVjdG9ycyhzZWxlY3RvcklkKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkU2VsZWN0b3JzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHNlbGVjdG9yID0gY2hpbGRTZWxlY3RvcnNbaV1cbiAgICBpZiAoc2VsZWN0b3Iud2lsbFJldHVybk11bHRpcGxlUmVjb3JkcygpID09PSB0cnVlKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmYWxzZVxufVxuXG4vKipcbiAqIFdoZW4gc2VyaWFsaXppbmcgdG8gSlNPTiBjb252ZXJ0IHRvIGFuIGFycmF5XG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gKCkge1xuICB2YXIgcmVzdWx0ID0gW11cbiAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgIHJlc3VsdC5wdXNoKHNlbGVjdG9yKVxuICB9KVxuICByZXR1cm4gcmVzdWx0XG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZ2V0U2VsZWN0b3JCeUlkID0gZnVuY3Rpb24gKHNlbGVjdG9ySWQpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHNlbGVjdG9yID0gdGhpc1tpXVxuICAgIGlmIChzZWxlY3Rvci5pZCA9PT0gc2VsZWN0b3JJZCkge1xuICAgICAgcmV0dXJuIHNlbGVjdG9yXG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogcmV0dXJucyBjc3Mgc2VsZWN0b3IgZm9yIGEgZ2l2ZW4gZWxlbWVudC4gY3NzIHNlbGVjdG9yIGluY2x1ZGVzIGFsbCBwYXJlbnQgZWxlbWVudCBzZWxlY3RvcnNcbiAqIEBwYXJhbSBzZWxlY3RvcklkXG4gKiBAcGFyYW0gcGFyZW50U2VsZWN0b3JJZHMgYXJyYXkgb2YgcGFyZW50IHNlbGVjdG9yIGlkcyBmcm9tIGRldnRvb2xzIEJyZWFkY3VtYlxuICogQHJldHVybnMgc3RyaW5nXG4gKi9cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZ2V0Q1NTU2VsZWN0b3JXaXRoaW5PbmVQYWdlID0gZnVuY3Rpb24gKHNlbGVjdG9ySWQsIHBhcmVudFNlbGVjdG9ySWRzKSB7XG4gIHZhciBDU1NTZWxlY3RvciA9IHRoaXMuZ2V0U2VsZWN0b3Ioc2VsZWN0b3JJZCkuc2VsZWN0b3JcbiAgdmFyIHBhcmVudENTU1NlbGVjdG9yID0gdGhpcy5nZXRQYXJlbnRDU1NTZWxlY3RvcldpdGhpbk9uZVBhZ2UocGFyZW50U2VsZWN0b3JJZHMpXG4gIENTU1NlbGVjdG9yID0gcGFyZW50Q1NTU2VsZWN0b3IgKyBDU1NTZWxlY3RvclxuXG4gIHJldHVybiBDU1NTZWxlY3RvclxufVxuXG4vKipcbiAqIHJldHVybnMgY3NzIHNlbGVjdG9yIGZvciBwYXJlbnQgc2VsZWN0b3JzIHRoYXQgYXJlIHdpdGhpbiBvbmUgcGFnZVxuICogQHBhcmFtIHBhcmVudFNlbGVjdG9ySWRzIGFycmF5IG9mIHBhcmVudCBzZWxlY3RvciBpZHMgZnJvbSBkZXZ0b29scyBCcmVhZGN1bWJcbiAqIEByZXR1cm5zIHN0cmluZ1xuICovXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmdldFBhcmVudENTU1NlbGVjdG9yV2l0aGluT25lUGFnZSA9IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3Rvcklkcykge1xuICB2YXIgQ1NTU2VsZWN0b3IgPSAnJ1xuXG4gIGZvciAodmFyIGkgPSBwYXJlbnRTZWxlY3Rvcklkcy5sZW5ndGggLSAxOyBpID4gMDsgaS0tKSB7XG4gICAgdmFyIHBhcmVudFNlbGVjdG9ySWQgPSBwYXJlbnRTZWxlY3Rvcklkc1tpXVxuICAgIHZhciBwYXJlbnRTZWxlY3RvciA9IHRoaXMuZ2V0U2VsZWN0b3IocGFyZW50U2VsZWN0b3JJZClcbiAgICBpZiAocGFyZW50U2VsZWN0b3Iud2lsbFJldHVybkVsZW1lbnRzKCkpIHtcbiAgICAgIENTU1NlbGVjdG9yID0gcGFyZW50U2VsZWN0b3Iuc2VsZWN0b3IgKyAnICcgKyBDU1NTZWxlY3RvclxuICAgIH0gZWxzZSB7XG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBDU1NTZWxlY3RvclxufVxuXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmhhc1JlY3Vyc2l2ZUVsZW1lbnRTZWxlY3RvcnMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBSZWN1cnNpb25Gb3VuZCA9IGZhbHNlXG5cbiAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uICh0b3BTZWxlY3Rvcikge1xuICAgIHZhciB2aXNpdGVkU2VsZWN0b3JzID0gW11cblxuICAgIHZhciBjaGVja1JlY3Vyc2lvbiA9IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3Rvcikge1xuXHRcdFx0Ly8gYWxyZWFkeSB2aXNpdGVkXG4gICAgICBpZiAodmlzaXRlZFNlbGVjdG9ycy5pbmRleE9mKHBhcmVudFNlbGVjdG9yKSAhPT0gLTEpIHtcbiAgICAgICAgUmVjdXJzaW9uRm91bmQgPSB0cnVlXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICBpZiAocGFyZW50U2VsZWN0b3Iud2lsbFJldHVybkVsZW1lbnRzKCkpIHtcbiAgICAgICAgdmlzaXRlZFNlbGVjdG9ycy5wdXNoKHBhcmVudFNlbGVjdG9yKVxuICAgICAgICB2YXIgY2hpbGRTZWxlY3RvcnMgPSB0aGlzLmdldERpcmVjdENoaWxkU2VsZWN0b3JzKHBhcmVudFNlbGVjdG9yLmlkKVxuICAgICAgICBjaGlsZFNlbGVjdG9ycy5mb3JFYWNoKGNoZWNrUmVjdXJzaW9uKVxuICAgICAgICB2aXNpdGVkU2VsZWN0b3JzLnBvcCgpXG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpXG5cbiAgICBjaGVja1JlY3Vyc2lvbih0b3BTZWxlY3RvcilcbiAgfS5iaW5kKHRoaXMpKVxuXG4gIHJldHVybiBSZWN1cnNpb25Gb3VuZFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yTGlzdFxuIiwidmFyIFNlbGVjdG9yRWxlbWVudCA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JFbGVtZW50JylcbnZhciBTZWxlY3RvckVsZW1lbnRBdHRyaWJ1dGUgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yRWxlbWVudEF0dHJpYnV0ZScpXG52YXIgU2VsZWN0b3JFbGVtZW50Q2xpY2sgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yRWxlbWVudENsaWNrJylcbnZhciBTZWxlY3RvckVsZW1lbnRTY3JvbGwgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yRWxlbWVudFNjcm9sbCcpXG52YXIgU2VsZWN0b3JHcm91cCA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JHcm91cCcpXG52YXIgU2VsZWN0b3JIVE1MID0gcmVxdWlyZSgnLi9TZWxlY3Rvci9TZWxlY3RvckhUTUwnKVxudmFyIFNlbGVjdG9ySW1hZ2UgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9ySW1hZ2UnKVxudmFyIFNlbGVjdG9yTGluayA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JMaW5rJylcbnZhciBTZWxlY3RvclBvcHVwTGluayA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JQb3B1cExpbmsnKVxudmFyIFNlbGVjdG9yVGFibGUgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yVGFibGUnKVxudmFyIFNlbGVjdG9yVGV4dCA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JUZXh0JylcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIFNlbGVjdG9yRWxlbWVudCxcbiAgU2VsZWN0b3JFbGVtZW50QXR0cmlidXRlLFxuICBTZWxlY3RvckVsZW1lbnRDbGljayxcbiAgU2VsZWN0b3JFbGVtZW50U2Nyb2xsLFxuICBTZWxlY3Rvckdyb3VwLFxuICBTZWxlY3RvckhUTUwsXG4gIFNlbGVjdG9ySW1hZ2UsXG4gIFNlbGVjdG9yTGluayxcbiAgU2VsZWN0b3JQb3B1cExpbmssXG4gIFNlbGVjdG9yVGFibGUsXG4gIFNlbGVjdG9yVGV4dFxufVxuIiwidmFyIFNlbGVjdG9yID0gcmVxdWlyZSgnLi9TZWxlY3RvcicpXG52YXIgU2VsZWN0b3JMaXN0ID0gcmVxdWlyZSgnLi9TZWxlY3Rvckxpc3QnKVxudmFyIFNpdGVtYXAgPSBmdW5jdGlvbiAoc2l0ZW1hcE9iaiwgb3B0aW9ucykge1xuICB0aGlzLiQgPSBvcHRpb25zLiRcbiAgaWYgKCFvcHRpb25zLiQpIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBqcXVlcnknKVxuICB0aGlzLmluaXREYXRhKHNpdGVtYXBPYmopXG59XG5cblNpdGVtYXAucHJvdG90eXBlID0ge1xuXG4gIGluaXREYXRhOiBmdW5jdGlvbiAoc2l0ZW1hcE9iaikge1xuICAgIGNvbnNvbGUubG9nKHRoaXMpXG4gICAgZm9yICh2YXIga2V5IGluIHNpdGVtYXBPYmopIHtcbiAgICAgIGNvbnNvbGUubG9nKGtleSlcbiAgICAgIHRoaXNba2V5XSA9IHNpdGVtYXBPYmpba2V5XVxuICAgIH1cbiAgICBjb25zb2xlLmxvZyh0aGlzKVxuXG4gICAgdmFyIHNlbGVjdG9ycyA9IHRoaXMuc2VsZWN0b3JzXG4gICAgdGhpcy5zZWxlY3RvcnMgPSBuZXcgU2VsZWN0b3JMaXN0KHRoaXMuc2VsZWN0b3JzLCB7JDogdGhpcy4kfSlcbiAgfSxcblxuXHQvKipcblx0ICogUmV0dXJucyBhbGwgc2VsZWN0b3JzIG9yIHJlY3Vyc2l2ZWx5IGZpbmQgYW5kIHJldHVybiBhbGwgY2hpbGQgc2VsZWN0b3JzIG9mIGEgcGFyZW50IHNlbGVjdG9yLlxuXHQgKiBAcGFyYW0gcGFyZW50U2VsZWN0b3JJZFxuXHQgKiBAcmV0dXJucyB7QXJyYXl9XG5cdCAqL1xuICBnZXRBbGxTZWxlY3RvcnM6IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3RvcklkKSB7XG4gICAgcmV0dXJuIHRoaXMuc2VsZWN0b3JzLmdldEFsbFNlbGVjdG9ycyhwYXJlbnRTZWxlY3RvcklkKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIG9ubHkgc2VsZWN0b3JzIHRoYXQgYXJlIGRpcmVjdGx5IHVuZGVyIGEgcGFyZW50XG5cdCAqIEBwYXJhbSBwYXJlbnRTZWxlY3RvcklkXG5cdCAqIEByZXR1cm5zIHtBcnJheX1cblx0ICovXG4gIGdldERpcmVjdENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAocGFyZW50U2VsZWN0b3JJZCkge1xuICAgIHJldHVybiB0aGlzLnNlbGVjdG9ycy5nZXREaXJlY3RDaGlsZFNlbGVjdG9ycyhwYXJlbnRTZWxlY3RvcklkKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIGFsbCBzZWxlY3RvciBpZCBwYXJhbWV0ZXJzXG5cdCAqIEByZXR1cm5zIHtBcnJheX1cblx0ICovXG4gIGdldFNlbGVjdG9ySWRzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGlkcyA9IFsnX3Jvb3QnXVxuICAgIHRoaXMuc2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICBpZHMucHVzaChzZWxlY3Rvci5pZClcbiAgICB9KVxuICAgIHJldHVybiBpZHNcbiAgfSxcblxuXHQvKipcblx0ICogUmV0dXJucyBvbmx5IHNlbGVjdG9yIGlkcyB3aGljaCBjYW4gaGF2ZSBjaGlsZCBzZWxlY3RvcnNcblx0ICogQHJldHVybnMge0FycmF5fVxuXHQgKi9cbiAgZ2V0UG9zc2libGVQYXJlbnRTZWxlY3RvcklkczogZnVuY3Rpb24gKCkge1xuICAgIHZhciBpZHMgPSBbJ19yb290J11cbiAgICB0aGlzLnNlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgaWYgKHNlbGVjdG9yLmNhbkhhdmVDaGlsZFNlbGVjdG9ycygpKSB7XG4gICAgICAgIGlkcy5wdXNoKHNlbGVjdG9yLmlkKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGlkc1xuICB9LFxuXG4gIGdldFN0YXJ0VXJsczogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdGFydFVybHMgPSB0aGlzLnN0YXJ0VXJsXG5cdFx0Ly8gc2luZ2xlIHN0YXJ0IHVybFxuICAgIGlmICh0aGlzLnN0YXJ0VXJsLnB1c2ggPT09IHVuZGVmaW5lZCkge1xuICAgICAgc3RhcnRVcmxzID0gW3N0YXJ0VXJsc11cbiAgICB9XG5cbiAgICB2YXIgdXJscyA9IFtdXG4gICAgc3RhcnRVcmxzLmZvckVhY2goZnVuY3Rpb24gKHN0YXJ0VXJsKSB7XG5cdFx0XHQvLyB6ZXJvIHBhZGRpbmcgaGVscGVyXG4gICAgICB2YXIgbHBhZCA9IGZ1bmN0aW9uIChzdHIsIGxlbmd0aCkge1xuICAgICAgICB3aGlsZSAoc3RyLmxlbmd0aCA8IGxlbmd0aCkgeyBzdHIgPSAnMCcgKyBzdHIgfVxuICAgICAgICByZXR1cm4gc3RyXG4gICAgICB9XG5cbiAgICAgIHZhciByZSA9IC9eKC4qPylcXFsoXFxkKylcXC0oXFxkKykoOihcXGQrKSk/XFxdKC4qKSQvXG4gICAgICB2YXIgbWF0Y2hlcyA9IHN0YXJ0VXJsLm1hdGNoKHJlKVxuICAgICAgaWYgKG1hdGNoZXMpIHtcbiAgICAgICAgdmFyIHN0YXJ0U3RyID0gbWF0Y2hlc1syXVxuICAgICAgICB2YXIgZW5kU3RyID0gbWF0Y2hlc1szXVxuICAgICAgICB2YXIgc3RhcnQgPSBwYXJzZUludChzdGFydFN0cilcbiAgICAgICAgdmFyIGVuZCA9IHBhcnNlSW50KGVuZFN0cilcbiAgICAgICAgdmFyIGluY3JlbWVudGFsID0gMVxuICAgICAgICBjb25zb2xlLmxvZyhtYXRjaGVzWzVdKVxuICAgICAgICBpZiAobWF0Y2hlc1s1XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaW5jcmVtZW50YWwgPSBwYXJzZUludChtYXRjaGVzWzVdKVxuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSBzdGFydDsgaSA8PSBlbmQ7IGkgKz0gaW5jcmVtZW50YWwpIHtcblx0XHRcdFx0XHQvLyB3aXRoIHplcm8gcGFkZGluZ1xuICAgICAgICAgIGlmIChzdGFydFN0ci5sZW5ndGggPT09IGVuZFN0ci5sZW5ndGgpIHtcbiAgICAgICAgICAgIHVybHMucHVzaChtYXRjaGVzWzFdICsgbHBhZChpLnRvU3RyaW5nKCksIHN0YXJ0U3RyLmxlbmd0aCkgKyBtYXRjaGVzWzZdKVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB1cmxzLnB1c2gobWF0Y2hlc1sxXSArIGkgKyBtYXRjaGVzWzZdKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXJsc1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdXJscy5wdXNoKHN0YXJ0VXJsKVxuICAgICAgfVxuICAgIH0pXG5cbiAgICByZXR1cm4gdXJsc1xuICB9LFxuXG4gIHVwZGF0ZVNlbGVjdG9yOiBmdW5jdGlvbiAoc2VsZWN0b3IsIHNlbGVjdG9yRGF0YSkge1xuXHRcdC8vIHNlbGVjdG9yIGlzIHVuZGVmaW5lZCB3aGVuIGNyZWF0aW5nIGEgbmV3IG9uZVxuICAgIGlmIChzZWxlY3RvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBzZWxlY3RvciA9IG5ldyBTZWxlY3RvcihzZWxlY3RvckRhdGEsIHskOiB0aGlzLiR9KVxuICAgIH1cblxuXHRcdC8vIHVwZGF0ZSBjaGlsZCBzZWxlY3RvcnNcbiAgICBpZiAoc2VsZWN0b3IuaWQgIT09IHVuZGVmaW5lZCAmJiBzZWxlY3Rvci5pZCAhPT0gc2VsZWN0b3JEYXRhLmlkKSB7XG4gICAgICB0aGlzLnNlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChjdXJyZW50U2VsZWN0b3IpIHtcbiAgICAgICAgY3VycmVudFNlbGVjdG9yLnJlbmFtZVBhcmVudFNlbGVjdG9yKHNlbGVjdG9yLmlkLCBzZWxlY3RvckRhdGEuaWQpXG4gICAgICB9KVxuXG5cdFx0XHQvLyB1cGRhdGUgY3ljbGljIHNlbGVjdG9yXG4gICAgICB2YXIgcG9zID0gc2VsZWN0b3JEYXRhLnBhcmVudFNlbGVjdG9ycy5pbmRleE9mKHNlbGVjdG9yLmlkKVxuICAgICAgaWYgKHBvcyAhPT0gLTEpIHtcbiAgICAgICAgc2VsZWN0b3JEYXRhLnBhcmVudFNlbGVjdG9ycy5zcGxpY2UocG9zLCAxLCBzZWxlY3RvckRhdGEuaWQpXG4gICAgICB9XG4gICAgfVxuXG4gICAgc2VsZWN0b3IudXBkYXRlRGF0YShzZWxlY3RvckRhdGEpXG5cbiAgICBpZiAodGhpcy5nZXRTZWxlY3RvcklkcygpLmluZGV4T2Yoc2VsZWN0b3IuaWQpID09PSAtMSkge1xuICAgICAgdGhpcy5zZWxlY3RvcnMucHVzaChzZWxlY3RvcilcbiAgICB9XG4gIH0sXG4gIGRlbGV0ZVNlbGVjdG9yOiBmdW5jdGlvbiAoc2VsZWN0b3JUb0RlbGV0ZSkge1xuICAgIHRoaXMuc2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICBpZiAoc2VsZWN0b3IuaGFzUGFyZW50U2VsZWN0b3Ioc2VsZWN0b3JUb0RlbGV0ZS5pZCkpIHtcbiAgICAgICAgc2VsZWN0b3IucmVtb3ZlUGFyZW50U2VsZWN0b3Ioc2VsZWN0b3JUb0RlbGV0ZS5pZClcbiAgICAgICAgaWYgKHNlbGVjdG9yLnBhcmVudFNlbGVjdG9ycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICB0aGlzLmRlbGV0ZVNlbGVjdG9yKHNlbGVjdG9yKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLnNlbGVjdG9ycykge1xuICAgICAgaWYgKHRoaXMuc2VsZWN0b3JzW2ldLmlkID09PSBzZWxlY3RvclRvRGVsZXRlLmlkKSB7XG4gICAgICAgIHRoaXMuc2VsZWN0b3JzLnNwbGljZShpLCAxKVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgZ2V0RGF0YVRhYmxlSWQ6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5faWQucmVwbGFjZSgvXFwuL2csICdfJylcbiAgfSxcbiAgZXhwb3J0U2l0ZW1hcDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzaXRlbWFwT2JqID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzKSlcbiAgICBkZWxldGUgc2l0ZW1hcE9iai5fcmV2XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHNpdGVtYXBPYmopXG4gIH0sXG4gIGltcG9ydFNpdGVtYXA6IGZ1bmN0aW9uIChzaXRlbWFwSlNPTikge1xuICAgIHZhciBzaXRlbWFwT2JqID0gSlNPTi5wYXJzZShzaXRlbWFwSlNPTilcbiAgICB0aGlzLmluaXREYXRhKHNpdGVtYXBPYmopXG4gIH0sXG5cdC8vIHJldHVybiBhIGxpc3Qgb2YgY29sdW1ucyB0aGFuIGNhbiBiZSBleHBvcnRlZFxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHZhciBjb2x1bW5zID0gW11cbiAgICB0aGlzLnNlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgY29sdW1ucyA9IGNvbHVtbnMuY29uY2F0KHNlbGVjdG9yLmdldERhdGFDb2x1bW5zKCkpXG4gICAgfSlcblxuICAgIHJldHVybiBjb2x1bW5zXG4gIH0sXG4gIGdldERhdGFFeHBvcnRDc3ZCbG9iOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHZhciBjb2x1bW5zID0gdGhpcy5nZXREYXRhQ29sdW1ucygpLFxuICAgICAgZGVsaW1pdGVyID0gJywnLFxuICAgICAgbmV3bGluZSA9ICdcXG4nLFxuICAgICAgY3N2RGF0YSA9IFsnXFx1ZmVmZiddIC8vIHV0Zi04IGJvbSBjaGFyXG5cblx0XHQvLyBoZWFkZXJcbiAgICBjc3ZEYXRhLnB1c2goY29sdW1ucy5qb2luKGRlbGltaXRlcikgKyBuZXdsaW5lKVxuXG5cdFx0Ly8gZGF0YVxuICAgIGRhdGEuZm9yRWFjaChmdW5jdGlvbiAocm93KSB7XG4gICAgICB2YXIgcm93RGF0YSA9IFtdXG4gICAgICBjb2x1bW5zLmZvckVhY2goZnVuY3Rpb24gKGNvbHVtbikge1xuICAgICAgICB2YXIgY2VsbERhdGEgPSByb3dbY29sdW1uXVxuICAgICAgICBpZiAoY2VsbERhdGEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNlbGxEYXRhID0gJydcbiAgICAgICAgfVx0XHRcdFx0ZWxzZSBpZiAodHlwZW9mIGNlbGxEYXRhID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgIGNlbGxEYXRhID0gSlNPTi5zdHJpbmdpZnkoY2VsbERhdGEpXG4gICAgICAgIH1cblxuICAgICAgICByb3dEYXRhLnB1c2goJ1wiJyArIGNlbGxEYXRhLnJlcGxhY2UoL1wiL2csICdcIlwiJykudHJpbSgpICsgJ1wiJylcbiAgICAgIH0pXG4gICAgICBjc3ZEYXRhLnB1c2gocm93RGF0YS5qb2luKGRlbGltaXRlcikgKyBuZXdsaW5lKVxuICAgIH0pXG5cbiAgICByZXR1cm4gbmV3IEJsb2IoY3N2RGF0YSwge3R5cGU6ICd0ZXh0L2Nzdid9KVxuICB9LFxuICBnZXRTZWxlY3RvckJ5SWQ6IGZ1bmN0aW9uIChzZWxlY3RvcklkKSB7XG4gICAgcmV0dXJuIHRoaXMuc2VsZWN0b3JzLmdldFNlbGVjdG9yQnlJZChzZWxlY3RvcklkKVxuICB9LFxuXHQvKipcblx0ICogQ3JlYXRlIGZ1bGwgY2xvbmUgb2Ygc2l0ZW1hcFxuXHQgKiBAcmV0dXJucyB7U2l0ZW1hcH1cblx0ICovXG4gIGNsb25lOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNsb25lZEpTT04gPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMpKVxuICAgIHZhciBzaXRlbWFwID0gbmV3IFNpdGVtYXAoY2xvbmVkSlNPTilcbiAgICByZXR1cm4gc2l0ZW1hcFxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2l0ZW1hcFxuIiwidmFyIFNpdGVtYXAgPSByZXF1aXJlKCcuL1NpdGVtYXAnKVxuXG52YXIgU3RvcmUgPSBmdW5jdGlvbiAoY29uZmlnLCBvcHRpb25zKSB7XG4gIHRoaXMuY29uZmlnID0gY29uZmlnXG4gIHRoaXMuJCA9IG9wdGlvbnMuJFxuICBpZiAoIXRoaXMuJCkgdGhyb3cgbmV3IEVycm9yKCdqcXVlcnkgcmVxdWlyZWQnKVxuICAgIC8vIGNvbmZpZ3VyZSBjb3VjaGRiXG4gIHRoaXMuc2l0ZW1hcERiID0gbmV3IFBvdWNoREIodGhpcy5jb25maWcuc2l0ZW1hcERiKVxufVxuXG52YXIgU3RvcmVTY3JhcGVSZXN1bHRXcml0ZXIgPSBmdW5jdGlvbiAoZGIpIHtcbiAgdGhpcy5kYiA9IGRiXG59XG5cblN0b3JlU2NyYXBlUmVzdWx0V3JpdGVyLnByb3RvdHlwZSA9IHtcbiAgd3JpdGVEb2NzOiBmdW5jdGlvbiAoZG9jcywgY2FsbGJhY2spIHtcbiAgICBpZiAoZG9jcy5sZW5ndGggPT09IDApIHtcbiAgICAgIGNhbGxiYWNrKClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5kYi5idWxrRG9jcyh7ZG9jczogZG9jc30sIGZ1bmN0aW9uIChlcnIsIHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChlcnIgIT09IG51bGwpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3Igd2hpbGUgcGVyc2lzdGluZyBzY3JhcGVkIGRhdGEgdG8gZGInLCBlcnIpXG4gICAgICAgIH1cbiAgICAgICAgY2FsbGJhY2soKVxuICAgICAgfSlcbiAgICB9XG4gIH1cbn1cblxuU3RvcmUucHJvdG90eXBlID0ge1xuXG4gIHNhbml0aXplU2l0ZW1hcERhdGFEYk5hbWU6IGZ1bmN0aW9uIChkYk5hbWUpIHtcbiAgICByZXR1cm4gJ3NpdGVtYXAtZGF0YS0nICsgZGJOYW1lLnJlcGxhY2UoL1teYS16MC05X1xcJFxcKFxcKVxcK1xcLS9dL2dpLCAnXycpXG4gIH0sXG4gIGdldFNpdGVtYXBEYXRhRGJMb2NhdGlvbjogZnVuY3Rpb24gKHNpdGVtYXBJZCkge1xuICAgIHZhciBkYk5hbWUgPSB0aGlzLnNhbml0aXplU2l0ZW1hcERhdGFEYk5hbWUoc2l0ZW1hcElkKVxuICAgIHJldHVybiB0aGlzLmNvbmZpZy5kYXRhRGIgKyBkYk5hbWVcbiAgfSxcbiAgZ2V0U2l0ZW1hcERhdGFEYjogZnVuY3Rpb24gKHNpdGVtYXBJZCkge1xuICAgIHZhciBkYkxvY2F0aW9uID0gdGhpcy5nZXRTaXRlbWFwRGF0YURiTG9jYXRpb24oc2l0ZW1hcElkKVxuICAgIHJldHVybiBuZXcgUG91Y2hEQihkYkxvY2F0aW9uKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBjcmVhdGVzIG9yIGNsZWFycyBhIHNpdGVtYXAgZGJcblx0ICogQHBhcmFtIHt0eXBlfSBzaXRlbWFwSWRcblx0ICogQHJldHVybnMge3VuZGVmaW5lZH1cblx0ICovXG4gIGluaXRTaXRlbWFwRGF0YURiOiBmdW5jdGlvbiAoc2l0ZW1hcElkLCBjYWxsYmFjaykge1xuICAgIHZhciBkYkxvY2F0aW9uID0gdGhpcy5nZXRTaXRlbWFwRGF0YURiTG9jYXRpb24oc2l0ZW1hcElkKVxuICAgIHZhciBzdG9yZSA9IHRoaXNcblxuICAgIFBvdWNoREIuZGVzdHJveShkYkxvY2F0aW9uLCBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgZGIgPSBzdG9yZS5nZXRTaXRlbWFwRGF0YURiKHNpdGVtYXBJZClcbiAgICAgIHZhciBkYldyaXRlciA9IG5ldyBTdG9yZVNjcmFwZVJlc3VsdFdyaXRlcihkYilcbiAgICAgIGNhbGxiYWNrKGRiV3JpdGVyKVxuICAgIH0pXG4gIH0sXG5cbiAgY3JlYXRlU2l0ZW1hcDogZnVuY3Rpb24gKHNpdGVtYXAsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNpdGVtYXBKc29uID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzaXRlbWFwKSlcblxuICAgIGlmICghc2l0ZW1hcC5faWQpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdjYW5ub3Qgc2F2ZSBzaXRlbWFwIHdpdGhvdXQgYW4gaWQnLCBzaXRlbWFwKVxuICAgIH1cblxuICAgIHRoaXMuc2l0ZW1hcERiLnB1dChzaXRlbWFwSnNvbiwgZnVuY3Rpb24gKHNpdGVtYXAsIGVyciwgcmVzcG9uc2UpIHtcbiAgICAgICAgICAgIC8vIEBUT0RPIGhhbmRsZSBlcnJcbiAgICAgIHNpdGVtYXAuX3JldiA9IHJlc3BvbnNlLnJldlxuICAgICAgY2FsbGJhY2soc2l0ZW1hcClcbiAgICB9LmJpbmQodGhpcywgc2l0ZW1hcCkpXG4gIH0sXG4gIHNhdmVTaXRlbWFwOiBmdW5jdGlvbiAoc2l0ZW1hcCwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gQFRPRE8gcmVtb3ZlXG4gICAgdGhpcy5jcmVhdGVTaXRlbWFwKHNpdGVtYXAsIGNhbGxiYWNrKVxuICB9LFxuICBkZWxldGVTaXRlbWFwOiBmdW5jdGlvbiAoc2l0ZW1hcCwgY2FsbGJhY2spIHtcbiAgICBzaXRlbWFwID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzaXRlbWFwKSlcblxuICAgIHRoaXMuc2l0ZW1hcERiLnJlbW92ZShzaXRlbWFwLCBmdW5jdGlvbiAoZXJyLCByZXNwb25zZSkge1xuICAgICAgICAgICAgLy8gQFRPRE8gaGFuZGxlIGVyclxuXG5cdFx0XHQvLyBkZWxldGUgc2l0ZW1hcCBkYXRhIGRiXG4gICAgICB2YXIgZGJMb2NhdGlvbiA9IHRoaXMuZ2V0U2l0ZW1hcERhdGFEYkxvY2F0aW9uKHNpdGVtYXAuX2lkKVxuICAgICAgUG91Y2hEQi5kZXN0cm95KGRiTG9jYXRpb24sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY2FsbGJhY2soKVxuICAgICAgfSlcbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG4gIGdldEFsbFNpdGVtYXBzOiBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIHRoaXMuc2l0ZW1hcERiLmFsbERvY3Moe2luY2x1ZGVfZG9jczogdHJ1ZX0sIGZ1bmN0aW9uIChlcnIsIHJlc3BvbnNlKSB7XG4gICAgICB2YXIgc2l0ZW1hcHMgPSBbXVxuICAgICAgZm9yICh2YXIgaSBpbiByZXNwb25zZS5yb3dzKSB7XG4gICAgICAgIHZhciBzaXRlbWFwID0gcmVzcG9uc2Uucm93c1tpXS5kb2NcbiAgICAgICAgaWYgKCFjaHJvbWUuZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgc2l0ZW1hcCA9IG5ldyBTaXRlbWFwKHNpdGVtYXAsIHskfSlcbiAgICAgICAgfVxuXG4gICAgICAgIHNpdGVtYXBzLnB1c2goc2l0ZW1hcClcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKHNpdGVtYXBzKVxuICAgIH0pXG4gIH0sXG5cbiAgZ2V0U2l0ZW1hcERhdGE6IGZ1bmN0aW9uIChzaXRlbWFwLCBjYWxsYmFjaykge1xuICAgIHZhciBkYiA9IHRoaXMuZ2V0U2l0ZW1hcERhdGFEYihzaXRlbWFwLl9pZClcbiAgICBkYi5hbGxEb2NzKHtpbmNsdWRlX2RvY3M6IHRydWV9LCBmdW5jdGlvbiAoZXJyLCByZXNwb25zZSkge1xuICAgICAgdmFyIHJlc3BvbnNlRGF0YSA9IFtdXG4gICAgICBmb3IgKHZhciBpIGluIHJlc3BvbnNlLnJvd3MpIHtcbiAgICAgICAgdmFyIGRvYyA9IHJlc3BvbnNlLnJvd3NbaV0uZG9jXG4gICAgICAgIHJlc3BvbnNlRGF0YS5wdXNoKGRvYylcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKHJlc3BvbnNlRGF0YSlcbiAgICB9KVxuICB9LFxuXHQvLyBAVE9ETyBtYWtlIHRoaXMgY2FsbCBsaWdodGVyXG4gIHNpdGVtYXBFeGlzdHM6IGZ1bmN0aW9uIChzaXRlbWFwSWQsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5nZXRBbGxTaXRlbWFwcyhmdW5jdGlvbiAoc2l0ZW1hcHMpIHtcbiAgICAgIHZhciBzaXRlbWFwRm91bmQgPSBmYWxzZVxuICAgICAgZm9yICh2YXIgaSBpbiBzaXRlbWFwcykge1xuICAgICAgICBpZiAoc2l0ZW1hcHNbaV0uX2lkID09PSBzaXRlbWFwSWQpIHtcbiAgICAgICAgICBzaXRlbWFwRm91bmQgPSB0cnVlXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKHNpdGVtYXBGb3VuZClcbiAgICB9KVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU3RvcmVcbiIsInZhciBDc3NTZWxlY3RvciA9IHJlcXVpcmUoJ2Nzcy1zZWxlY3RvcicpLkNzc1NlbGVjdG9yXG4vLyBUT0RPIGdldCByaWQgb2YganF1ZXJ5XG5cbi8qKlxuICogT25seSBFbGVtZW50cyB1bmlxdWUgd2lsbCBiZSBhZGRlZCB0byB0aGlzIGFycmF5XG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gVW5pcXVlRWxlbWVudExpc3QgKGNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlLCBvcHRpb25zKSB7XG4gIHRoaXMuJCA9IG9wdGlvbnMuJFxuICBpZiAoIXRoaXMuJCkgdGhyb3cgbmV3IEVycm9yKCdqcXVlcnkgcmVxdWlyZWQnKVxuICB0aGlzLmNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlID0gY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGVcbiAgdGhpcy5hZGRlZEVsZW1lbnRzID0ge31cbn1cblxuVW5pcXVlRWxlbWVudExpc3QucHJvdG90eXBlID0gW11cblxuVW5pcXVlRWxlbWVudExpc3QucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICB2YXIgJCA9IHRoaXMuJFxuICBpZiAodGhpcy5pc0FkZGVkKGVsZW1lbnQpKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0gZWxzZSB7XG4gICAgdmFyIGVsZW1lbnRVbmlxdWVJZCA9IHRoaXMuZ2V0RWxlbWVudFVuaXF1ZUlkKGVsZW1lbnQpXG4gICAgdGhpcy5hZGRlZEVsZW1lbnRzW2VsZW1lbnRVbmlxdWVJZF0gPSB0cnVlXG4gICAgQXJyYXkucHJvdG90eXBlLnB1c2guY2FsbCh0aGlzLCAkKGVsZW1lbnQpLmNsb25lKHRydWUpWzBdKVxuICAgIHJldHVybiB0cnVlXG4gIH1cbn1cblxuVW5pcXVlRWxlbWVudExpc3QucHJvdG90eXBlLmdldEVsZW1lbnRVbmlxdWVJZCA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gIHZhciAkID0gdGhpcy4kXG4gIGlmICh0aGlzLmNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlID09PSAndW5pcXVlVGV4dCcpIHtcbiAgICB2YXIgZWxlbWVudFRleHQgPSAkKGVsZW1lbnQpLnRleHQoKS50cmltKClcbiAgICByZXR1cm4gZWxlbWVudFRleHRcbiAgfSBlbHNlIGlmICh0aGlzLmNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlID09PSAndW5pcXVlSFRNTFRleHQnKSB7XG4gICAgdmFyIGVsZW1lbnRIVE1MID0gJChcIjxkaXYgY2xhc3M9Jy13ZWItc2NyYXBlci1zaG91bGQtbm90LWJlLXZpc2libGUnPlwiKS5hcHBlbmQoJChlbGVtZW50KS5lcSgwKS5jbG9uZSgpKS5odG1sKClcbiAgICByZXR1cm4gZWxlbWVudEhUTUxcbiAgfSBlbHNlIGlmICh0aGlzLmNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlID09PSAndW5pcXVlSFRNTCcpIHtcblx0XHQvLyBnZXQgZWxlbWVudCB3aXRob3V0IHRleHRcbiAgICB2YXIgJGVsZW1lbnQgPSAkKGVsZW1lbnQpLmVxKDApLmNsb25lKClcblxuICAgIHZhciByZW1vdmVUZXh0ID0gZnVuY3Rpb24gKCRlbGVtZW50KSB7XG4gICAgICAkZWxlbWVudC5jb250ZW50cygpXG5cdFx0XHRcdC5maWx0ZXIoZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5ub2RlVHlwZSAhPT0gMykge1xuICAgIHJlbW92ZVRleHQoJCh0aGlzKSlcbiAgfVxuICByZXR1cm4gdGhpcy5ub2RlVHlwZSA9PSAzIC8vIE5vZGUuVEVYVF9OT0RFXG59KS5yZW1vdmUoKVxuICAgIH1cbiAgICByZW1vdmVUZXh0KCRlbGVtZW50KVxuXG4gICAgdmFyIGVsZW1lbnRIVE1MID0gJChcIjxkaXYgY2xhc3M9Jy13ZWItc2NyYXBlci1zaG91bGQtbm90LWJlLXZpc2libGUnPlwiKS5hcHBlbmQoJGVsZW1lbnQpLmh0bWwoKVxuICAgIHJldHVybiBlbGVtZW50SFRNTFxuICB9IGVsc2UgaWYgKHRoaXMuY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUgPT09ICd1bmlxdWVDU1NTZWxlY3RvcicpIHtcbiAgICB2YXIgY3MgPSBuZXcgQ3NzU2VsZWN0b3Ioe1xuICAgICAgZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yOiBmYWxzZSxcbiAgICAgIHBhcmVudDogJCgnYm9keScpWzBdLFxuICAgICAgZW5hYmxlUmVzdWx0U3RyaXBwaW5nOiBmYWxzZVxuICAgIH0pXG4gICAgdmFyIENTU1NlbGVjdG9yID0gY3MuZ2V0Q3NzU2VsZWN0b3IoW2VsZW1lbnRdKVxuICAgIHJldHVybiBDU1NTZWxlY3RvclxuICB9IGVsc2Uge1xuICAgIHRocm93ICdJbnZhbGlkIGNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlICcgKyB0aGlzLmNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBVbmlxdWVFbGVtZW50TGlzdFxuXG5VbmlxdWVFbGVtZW50TGlzdC5wcm90b3R5cGUuaXNBZGRlZCA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gIHZhciBlbGVtZW50VW5pcXVlSWQgPSB0aGlzLmdldEVsZW1lbnRVbmlxdWVJZChlbGVtZW50KVxuICB2YXIgaXNBZGRlZCA9IGVsZW1lbnRVbmlxdWVJZCBpbiB0aGlzLmFkZGVkRWxlbWVudHNcbiAgcmV0dXJuIGlzQWRkZWRcbn1cbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxudmFyIEJhY2tncm91bmRTY3JpcHQgPSByZXF1aXJlKCcuL0JhY2tncm91bmRTY3JpcHQnKVxuLyoqXG4gKiBAcGFyYW0gbG9jYXRpb25cdGNvbmZpZ3VyZSBmcm9tIHdoZXJlIHRoZSBjb250ZW50IHNjcmlwdCBpcyBiZWluZyBhY2Nlc3NlZCAoQ29udGVudFNjcmlwdCwgQmFja2dyb3VuZFBhZ2UsIERldlRvb2xzKVxuICogQHJldHVybnMgQmFja2dyb3VuZFNjcmlwdFxuICovXG52YXIgZ2V0QmFja2dyb3VuZFNjcmlwdCA9IGZ1bmN0aW9uIChsb2NhdGlvbikge1xuICAvLyBIYW5kbGUgY2FsbHMgZnJvbSBkaWZmZXJlbnQgcGxhY2VzXG4gIGlmIChsb2NhdGlvbiA9PT0gJ0JhY2tncm91bmRTY3JpcHQnKSB7XG4gICAgcmV0dXJuIEJhY2tncm91bmRTY3JpcHRcbiAgfSBlbHNlIGlmIChsb2NhdGlvbiA9PT0gJ0RldlRvb2xzJyB8fCBsb2NhdGlvbiA9PT0gJ0NvbnRlbnRTY3JpcHQnKSB7XG4gICAgLy8gaWYgY2FsbGVkIHdpdGhpbiBiYWNrZ3JvdW5kIHNjcmlwdCBwcm94eSBjYWxscyB0byBjb250ZW50IHNjcmlwdFxuICAgIHZhciBiYWNrZ3JvdW5kU2NyaXB0ID0ge31cblxuICAgIE9iamVjdC5rZXlzKEJhY2tncm91bmRTY3JpcHQpLmZvckVhY2goZnVuY3Rpb24gKGF0dHIpIHtcbiAgICAgIGlmICh0eXBlb2YgQmFja2dyb3VuZFNjcmlwdFthdHRyXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBiYWNrZ3JvdW5kU2NyaXB0W2F0dHJdID0gZnVuY3Rpb24gKHJlcXVlc3QpIHtcbiAgICAgICAgICB2YXIgcmVxVG9CYWNrZ3JvdW5kU2NyaXB0ID0ge1xuICAgICAgICAgICAgYmFja2dyb3VuZFNjcmlwdENhbGw6IHRydWUsXG4gICAgICAgICAgICBmbjogYXR0cixcbiAgICAgICAgICAgIHJlcXVlc3Q6IHJlcXVlc3RcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZShyZXFUb0JhY2tncm91bmRTY3JpcHQsIGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKHJlc3BvbnNlKVxuICAgICAgICAgIH0pXG5cbiAgICAgICAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBiYWNrZ3JvdW5kU2NyaXB0W2F0dHJdID0gQmFja2dyb3VuZFNjcmlwdFthdHRyXVxuICAgICAgfVxuICAgIH0pXG5cbiAgICByZXR1cm4gYmFja2dyb3VuZFNjcmlwdFxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBCYWNrZ3JvdW5kU2NyaXB0IGluaXRpYWxpemF0aW9uIC0gJyArIGxvY2F0aW9uKVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0QmFja2dyb3VuZFNjcmlwdFxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdENzc1NlbGVjdG9yLFxuXHRFbGVtZW50U2VsZWN0b3IsXG5cdEVsZW1lbnRTZWxlY3Rvckxpc3Rcbn1cblxuXG5mdW5jdGlvbiBDc3NTZWxlY3RvciAob3B0aW9ucykge1xuXG5cdHZhciBtZSA9IHRoaXM7XG5cblx0Ly8gZGVmYXVsdHNcblx0dGhpcy5pZ25vcmVkVGFncyA9IFsnZm9udCcsICdiJywgJ2knLCAncyddO1xuXHR0aGlzLnBhcmVudCA9IG9wdGlvbnMuZG9jdW1lbnQgfHwgb3B0aW9ucy5wYXJlbnRcblx0dGhpcy5kb2N1bWVudCA9IG9wdGlvbnMuZG9jdW1lbnQgfHwgb3B0aW9ucy5wYXJlbnQgXG5cdHRoaXMuaWdub3JlZENsYXNzQmFzZSA9IGZhbHNlO1xuXHR0aGlzLmVuYWJsZVJlc3VsdFN0cmlwcGluZyA9IHRydWU7XG5cdHRoaXMuZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yID0gZmFsc2U7XG5cdHRoaXMuaWdub3JlZENsYXNzZXMgPSBbXTtcbiAgICB0aGlzLmFsbG93TXVsdGlwbGVTZWxlY3RvcnMgPSBmYWxzZTtcblx0dGhpcy5xdWVyeSA9IGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuXHRcdHJldHVybiBtZS5wYXJlbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG5cdH07XG5cblx0Ly8gb3ZlcnJpZGVzIGRlZmF1bHRzIHdpdGggb3B0aW9uc1xuXHRmb3IgKHZhciBpIGluIG9wdGlvbnMpIHtcblx0XHR0aGlzW2ldID0gb3B0aW9uc1tpXTtcblx0fVxufTtcblxuLy8gVE9ETyByZWZhY3RvciBlbGVtZW50IHNlbGVjdG9yIGxpc3QgaW50byBhIH4gY2xhc3NcbmZ1bmN0aW9uIEVsZW1lbnRTZWxlY3RvciAoZWxlbWVudCwgaWdub3JlZENsYXNzZXMpIHtcblxuXHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXHR0aGlzLmlzRGlyZWN0Q2hpbGQgPSB0cnVlO1xuXHR0aGlzLnRhZyA9IGVsZW1lbnQubG9jYWxOYW1lO1xuXHR0aGlzLnRhZyA9IHRoaXMudGFnLnJlcGxhY2UoLzovZywgJ1xcXFw6Jyk7XG5cblx0Ly8gbnRoLW9mLWNoaWxkKG4rMSlcblx0dGhpcy5pbmRleG4gPSBudWxsO1xuXHR0aGlzLmluZGV4ID0gMTtcblx0dGhpcy5pZCA9IG51bGw7XG5cdHRoaXMuY2xhc3NlcyA9IG5ldyBBcnJheSgpO1xuXG5cdC8vIGRvIG5vdCBhZGQgYWRkaXRpbmFsIGluZm8gdG8gaHRtbCwgYm9keSB0YWdzLlxuXHQvLyBodG1sOm50aC1vZi10eXBlKDEpIGNhbm5vdCBiZSBzZWxlY3RlZFxuXHRpZih0aGlzLnRhZyA9PT0gJ2h0bWwnIHx8IHRoaXMudGFnID09PSAnSFRNTCdcblx0XHR8fCB0aGlzLnRhZyA9PT0gJ2JvZHknIHx8IHRoaXMudGFnID09PSAnQk9EWScpIHtcblx0XHR0aGlzLmluZGV4ID0gbnVsbDtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRpZiAoZWxlbWVudC5wYXJlbnROb2RlICE9PSB1bmRlZmluZWQpIHtcblx0XHQvLyBudGgtY2hpbGRcblx0XHQvL3RoaXMuaW5kZXggPSBbXS5pbmRleE9mLmNhbGwoZWxlbWVudC5wYXJlbnROb2RlLmNoaWxkcmVuLCBlbGVtZW50KSsxO1xuXG5cdFx0Ly8gbnRoLW9mLXR5cGVcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnQucGFyZW50Tm9kZS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGNoaWxkID0gZWxlbWVudC5wYXJlbnROb2RlLmNoaWxkcmVuW2ldO1xuXHRcdFx0aWYgKGNoaWxkID09PSBlbGVtZW50KSB7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGNoaWxkLnRhZ05hbWUgPT09IGVsZW1lbnQudGFnTmFtZSkge1xuXHRcdFx0XHR0aGlzLmluZGV4Kys7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0aWYgKGVsZW1lbnQuaWQgIT09ICcnKSB7XG5cdFx0aWYgKHR5cGVvZiBlbGVtZW50LmlkID09PSAnc3RyaW5nJykge1xuXHRcdFx0dGhpcy5pZCA9IGVsZW1lbnQuaWQ7XG5cdFx0XHR0aGlzLmlkID0gdGhpcy5pZC5yZXBsYWNlKC86L2csICdcXFxcOicpO1xuXHRcdH1cblx0fVxuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudC5jbGFzc0xpc3QubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgY2NsYXNzID0gZWxlbWVudC5jbGFzc0xpc3RbaV07XG5cdFx0aWYgKGlnbm9yZWRDbGFzc2VzLmluZGV4T2YoY2NsYXNzKSA9PT0gLTEpIHtcblx0XHRcdGNjbGFzcyA9IGNjbGFzcy5yZXBsYWNlKC86L2csICdcXFxcOicpO1xuXHRcdFx0dGhpcy5jbGFzc2VzLnB1c2goY2NsYXNzKTtcblx0XHR9XG5cdH1cbn07XG5cbmZ1bmN0aW9uIEVsZW1lbnRTZWxlY3Rvckxpc3QgKENzc1NlbGVjdG9yKSB7XG5cdHRoaXMuQ3NzU2VsZWN0b3IgPSBDc3NTZWxlY3Rvcjtcbn07XG5cbkVsZW1lbnRTZWxlY3Rvckxpc3QucHJvdG90eXBlID0gbmV3IEFycmF5KCk7XG5cbkVsZW1lbnRTZWxlY3Rvckxpc3QucHJvdG90eXBlLmdldENzc1NlbGVjdG9yID0gZnVuY3Rpb24gKCkge1xuXG5cdHZhciByZXN1bHRTZWxlY3RvcnMgPSBbXTtcblxuXHQvLyBURERcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIHNlbGVjdG9yID0gdGhpc1tpXTtcblxuXHRcdHZhciBpc0ZpcnN0U2VsZWN0b3IgPSBpID09PSB0aGlzLmxlbmd0aC0xO1xuXHRcdHZhciByZXN1bHRTZWxlY3RvciA9IHNlbGVjdG9yLmdldENzc1NlbGVjdG9yKGlzRmlyc3RTZWxlY3Rvcik7XG5cblx0XHRpZiAodGhpcy5Dc3NTZWxlY3Rvci5lbmFibGVTbWFydFRhYmxlU2VsZWN0b3IpIHtcblx0XHRcdGlmIChzZWxlY3Rvci50YWcgPT09ICd0cicpIHtcblx0XHRcdFx0aWYgKHNlbGVjdG9yLmVsZW1lbnQuY2hpbGRyZW4ubGVuZ3RoID09PSAyKSB7XG5cdFx0XHRcdFx0aWYgKHNlbGVjdG9yLmVsZW1lbnQuY2hpbGRyZW5bMF0udGFnTmFtZSA9PT0gJ1REJ1xuXHRcdFx0XHRcdFx0fHwgc2VsZWN0b3IuZWxlbWVudC5jaGlsZHJlblswXS50YWdOYW1lID09PSAnVEgnXG5cdFx0XHRcdFx0XHR8fCBzZWxlY3Rvci5lbGVtZW50LmNoaWxkcmVuWzBdLnRhZ05hbWUgPT09ICdUUicpIHtcblxuXHRcdFx0XHRcdFx0dmFyIHRleHQgPSBzZWxlY3Rvci5lbGVtZW50LmNoaWxkcmVuWzBdLnRleHRDb250ZW50O1xuXHRcdFx0XHRcdFx0dGV4dCA9IHRleHQudHJpbSgpO1xuXG5cdFx0XHRcdFx0XHQvLyBlc2NhcGUgcXVvdGVzXG5cdFx0XHRcdFx0XHR0ZXh0LnJlcGxhY2UoLyhcXFxcKikoJykvZywgZnVuY3Rpb24gKHgpIHtcblx0XHRcdFx0XHRcdFx0dmFyIGwgPSB4Lmxlbmd0aDtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIChsICUgMikgPyB4IDogeC5zdWJzdHJpbmcoMCwgbCAtIDEpICsgXCJcXFxcJ1wiO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRyZXN1bHRTZWxlY3RvciArPSBcIjpjb250YWlucygnXCIgKyB0ZXh0ICsgXCInKVwiO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJlc3VsdFNlbGVjdG9ycy5wdXNoKHJlc3VsdFNlbGVjdG9yKTtcblx0fVxuXG5cdHZhciByZXN1bHRDU1NTZWxlY3RvciA9IHJlc3VsdFNlbGVjdG9ycy5yZXZlcnNlKCkuam9pbignICcpO1xuXHRyZXR1cm4gcmVzdWx0Q1NTU2VsZWN0b3I7XG59O1xuXG5FbGVtZW50U2VsZWN0b3IucHJvdG90eXBlID0ge1xuXG5cdGdldENzc1NlbGVjdG9yOiBmdW5jdGlvbiAoaXNGaXJzdFNlbGVjdG9yKSB7XG5cblx0XHRpZihpc0ZpcnN0U2VsZWN0b3IgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0aXNGaXJzdFNlbGVjdG9yID0gZmFsc2U7XG5cdFx0fVxuXG5cdFx0dmFyIHNlbGVjdG9yID0gdGhpcy50YWc7XG5cdFx0aWYgKHRoaXMuaWQgIT09IG51bGwpIHtcblx0XHRcdHNlbGVjdG9yICs9ICcjJyArIHRoaXMuaWQ7XG5cdFx0fVxuXHRcdGlmICh0aGlzLmNsYXNzZXMubGVuZ3RoKSB7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY2xhc3Nlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRzZWxlY3RvciArPSBcIi5cIiArIHRoaXMuY2xhc3Nlc1tpXTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKHRoaXMuaW5kZXggIT09IG51bGwpIHtcblx0XHRcdHNlbGVjdG9yICs9ICc6bnRoLW9mLXR5cGUoJyArIHRoaXMuaW5kZXggKyAnKSc7XG5cdFx0fVxuXHRcdGlmICh0aGlzLmluZGV4biAhPT0gbnVsbCAmJiB0aGlzLmluZGV4biAhPT0gLTEpIHtcblx0XHRcdHNlbGVjdG9yICs9ICc6bnRoLW9mLXR5cGUobisnICsgdGhpcy5pbmRleG4gKyAnKSc7XG5cdFx0fVxuXHRcdGlmKHRoaXMuaXNEaXJlY3RDaGlsZCAmJiBpc0ZpcnN0U2VsZWN0b3IgPT09IGZhbHNlKSB7XG5cdFx0XHRzZWxlY3RvciA9IFwiPiBcIitzZWxlY3Rvcjtcblx0XHR9XG5cblx0XHRyZXR1cm4gc2VsZWN0b3I7XG5cdH0sXG5cdC8vIG1lcmdlcyB0aGlzIHNlbGVjdG9yIHdpdGggYW5vdGhlciBvbmUuXG5cdG1lcmdlOiBmdW5jdGlvbiAobWVyZ2VTZWxlY3Rvcikge1xuXG5cdFx0aWYgKHRoaXMudGFnICE9PSBtZXJnZVNlbGVjdG9yLnRhZykge1xuXHRcdFx0dGhyb3cgXCJkaWZmZXJlbnQgZWxlbWVudCBzZWxlY3RlZCAodGFnKVwiO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmluZGV4ICE9PSBudWxsKSB7XG5cdFx0XHRpZiAodGhpcy5pbmRleCAhPT0gbWVyZ2VTZWxlY3Rvci5pbmRleCkge1xuXG5cdFx0XHRcdC8vIHVzZSBpbmRleG4gb25seSBmb3IgdHdvIGVsZW1lbnRzXG5cdFx0XHRcdGlmICh0aGlzLmluZGV4biA9PT0gbnVsbCkge1xuXHRcdFx0XHRcdHZhciBpbmRleG4gPSBNYXRoLm1pbihtZXJnZVNlbGVjdG9yLmluZGV4LCB0aGlzLmluZGV4KTtcblx0XHRcdFx0XHRpZiAoaW5kZXhuID4gMSkge1xuXHRcdFx0XHRcdFx0dGhpcy5pbmRleG4gPSBNYXRoLm1pbihtZXJnZVNlbGVjdG9yLmluZGV4LCB0aGlzLmluZGV4KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5pbmRleG4gPSAtMTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHRoaXMuaW5kZXggPSBudWxsO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmKHRoaXMuaXNEaXJlY3RDaGlsZCA9PT0gdHJ1ZSkge1xuXHRcdFx0dGhpcy5pc0RpcmVjdENoaWxkID0gbWVyZ2VTZWxlY3Rvci5pc0RpcmVjdENoaWxkO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmlkICE9PSBudWxsKSB7XG5cdFx0XHRpZiAodGhpcy5pZCAhPT0gbWVyZ2VTZWxlY3Rvci5pZCkge1xuXHRcdFx0XHR0aGlzLmlkID0gbnVsbDtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAodGhpcy5jbGFzc2VzLmxlbmd0aCAhPT0gMCkge1xuXHRcdFx0dmFyIGNsYXNzZXMgPSBuZXcgQXJyYXkoKTtcblxuXHRcdFx0Zm9yICh2YXIgaSBpbiB0aGlzLmNsYXNzZXMpIHtcblx0XHRcdFx0dmFyIGNjbGFzcyA9IHRoaXMuY2xhc3Nlc1tpXTtcblx0XHRcdFx0aWYgKG1lcmdlU2VsZWN0b3IuY2xhc3Nlcy5pbmRleE9mKGNjbGFzcykgIT09IC0xKSB7XG5cdFx0XHRcdFx0Y2xhc3Nlcy5wdXNoKGNjbGFzcyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0dGhpcy5jbGFzc2VzID0gY2xhc3Nlcztcblx0XHR9XG5cdH1cbn07XG5cbkNzc1NlbGVjdG9yLnByb3RvdHlwZSA9IHtcblx0bWVyZ2VFbGVtZW50U2VsZWN0b3JzOiBmdW5jdGlvbiAobmV3U2VsZWNvcnMpIHtcblxuXHRcdGlmIChuZXdTZWxlY29ycy5sZW5ndGggPCAxKSB7XG5cdFx0XHR0aHJvdyBcIk5vIHNlbGVjdG9ycyBzcGVjaWZpZWRcIjtcblx0XHR9XG5cdFx0ZWxzZSBpZiAobmV3U2VsZWNvcnMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRyZXR1cm4gbmV3U2VsZWNvcnNbMF07XG5cdFx0fVxuXG5cdFx0Ly8gY2hlY2sgc2VsZWN0b3IgdG90YWwgY291bnRcblx0XHR2YXIgZWxlbWVudENvdW50SW5TZWxlY3RvciA9IG5ld1NlbGVjb3JzWzBdLmxlbmd0aDtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG5ld1NlbGVjb3JzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgc2VsZWN0b3IgPSBuZXdTZWxlY29yc1tpXTtcblx0XHRcdGlmIChzZWxlY3Rvci5sZW5ndGggIT09IGVsZW1lbnRDb3VudEluU2VsZWN0b3IpIHtcblx0XHRcdFx0dGhyb3cgXCJJbnZhbGlkIGVsZW1lbnQgY291bnQgaW4gc2VsZWN0b3JcIjtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBtZXJnZSBzZWxlY3RvcnNcblx0XHR2YXIgcmVzdWx0aW5nRWxlbWVudHMgPSBuZXdTZWxlY29yc1swXTtcblx0XHRmb3IgKHZhciBpID0gMTsgaSA8IG5ld1NlbGVjb3JzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgbWVyZ2VFbGVtZW50cyA9IG5ld1NlbGVjb3JzW2ldO1xuXG5cdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGVsZW1lbnRDb3VudEluU2VsZWN0b3I7IGorKykge1xuXHRcdFx0XHRyZXN1bHRpbmdFbGVtZW50c1tqXS5tZXJnZShtZXJnZUVsZW1lbnRzW2pdKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdGluZ0VsZW1lbnRzO1xuXHR9LFxuXHRzdHJpcFNlbGVjdG9yOiBmdW5jdGlvbiAoc2VsZWN0b3JzKSB7XG5cblx0XHR2YXIgY3NzU2VsZXRvciA9IHNlbGVjdG9ycy5nZXRDc3NTZWxlY3RvcigpO1xuXHRcdHZhciBiYXNlU2VsZWN0ZWRFbGVtZW50cyA9IHRoaXMucXVlcnkoY3NzU2VsZXRvcik7XG5cblx0XHR2YXIgY29tcGFyZUVsZW1lbnRzID0gZnVuY3Rpb24gKGVsZW1lbnRzKSB7XG5cdFx0XHRpZiAoYmFzZVNlbGVjdGVkRWxlbWVudHMubGVuZ3RoICE9PSBlbGVtZW50cy5sZW5ndGgpIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGJhc2VTZWxlY3RlZEVsZW1lbnRzLmxlbmd0aDsgaisrKSB7XG5cdFx0XHRcdGlmIChbXS5pbmRleE9mLmNhbGwoZWxlbWVudHMsIGJhc2VTZWxlY3RlZEVsZW1lbnRzW2pdKSA9PT0gLTEpIHtcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH07XG5cdFx0Ly8gc3RyaXAgaW5kZXhlc1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZWN0b3JzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgc2VsZWN0b3IgPSBzZWxlY3RvcnNbaV07XG5cdFx0XHRpZiAoc2VsZWN0b3IuaW5kZXggIT09IG51bGwpIHtcblx0XHRcdFx0dmFyIGluZGV4ID0gc2VsZWN0b3IuaW5kZXg7XG5cdFx0XHRcdHNlbGVjdG9yLmluZGV4ID0gbnVsbDtcblx0XHRcdFx0dmFyIGNzc1NlbGV0b3IgPSBzZWxlY3RvcnMuZ2V0Q3NzU2VsZWN0b3IoKTtcblx0XHRcdFx0dmFyIG5ld1NlbGVjdGVkRWxlbWVudHMgPSB0aGlzLnF1ZXJ5KGNzc1NlbGV0b3IpO1xuXHRcdFx0XHQvLyBpZiByZXN1bHRzIGRvZXNuJ3QgbWF0Y2ggdGhlbiB1bmRvIGNoYW5nZXNcblx0XHRcdFx0aWYgKCFjb21wYXJlRWxlbWVudHMobmV3U2VsZWN0ZWRFbGVtZW50cykpIHtcblx0XHRcdFx0XHRzZWxlY3Rvci5pbmRleCA9IGluZGV4O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gc3RyaXAgaXNEaXJlY3RDaGlsZFxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZWN0b3JzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgc2VsZWN0b3IgPSBzZWxlY3RvcnNbaV07XG5cdFx0XHRpZiAoc2VsZWN0b3IuaXNEaXJlY3RDaGlsZCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRzZWxlY3Rvci5pc0RpcmVjdENoaWxkID0gZmFsc2U7XG5cdFx0XHRcdHZhciBjc3NTZWxldG9yID0gc2VsZWN0b3JzLmdldENzc1NlbGVjdG9yKCk7XG5cdFx0XHRcdHZhciBuZXdTZWxlY3RlZEVsZW1lbnRzID0gdGhpcy5xdWVyeShjc3NTZWxldG9yKTtcblx0XHRcdFx0Ly8gaWYgcmVzdWx0cyBkb2Vzbid0IG1hdGNoIHRoZW4gdW5kbyBjaGFuZ2VzXG5cdFx0XHRcdGlmICghY29tcGFyZUVsZW1lbnRzKG5ld1NlbGVjdGVkRWxlbWVudHMpKSB7XG5cdFx0XHRcdFx0c2VsZWN0b3IuaXNEaXJlY3RDaGlsZCA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBzdHJpcCBpZHNcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHNlbGVjdG9ycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHNlbGVjdG9yID0gc2VsZWN0b3JzW2ldO1xuXHRcdFx0aWYgKHNlbGVjdG9yLmlkICE9PSBudWxsKSB7XG5cdFx0XHRcdHZhciBpZCA9IHNlbGVjdG9yLmlkO1xuXHRcdFx0XHRzZWxlY3Rvci5pZCA9IG51bGw7XG5cdFx0XHRcdHZhciBjc3NTZWxldG9yID0gc2VsZWN0b3JzLmdldENzc1NlbGVjdG9yKCk7XG5cdFx0XHRcdHZhciBuZXdTZWxlY3RlZEVsZW1lbnRzID0gdGhpcy5xdWVyeShjc3NTZWxldG9yKTtcblx0XHRcdFx0Ly8gaWYgcmVzdWx0cyBkb2Vzbid0IG1hdGNoIHRoZW4gdW5kbyBjaGFuZ2VzXG5cdFx0XHRcdGlmICghY29tcGFyZUVsZW1lbnRzKG5ld1NlbGVjdGVkRWxlbWVudHMpKSB7XG5cdFx0XHRcdFx0c2VsZWN0b3IuaWQgPSBpZDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIHN0cmlwIGNsYXNzZXNcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHNlbGVjdG9ycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHNlbGVjdG9yID0gc2VsZWN0b3JzW2ldO1xuXHRcdFx0aWYgKHNlbGVjdG9yLmNsYXNzZXMubGVuZ3RoICE9PSAwKSB7XG5cdFx0XHRcdGZvciAodmFyIGogPSBzZWxlY3Rvci5jbGFzc2VzLmxlbmd0aCAtIDE7IGogPiAwOyBqLS0pIHtcblx0XHRcdFx0XHR2YXIgY2NsYXNzID0gc2VsZWN0b3IuY2xhc3Nlc1tqXTtcblx0XHRcdFx0XHRzZWxlY3Rvci5jbGFzc2VzLnNwbGljZShqLCAxKTtcblx0XHRcdFx0XHR2YXIgY3NzU2VsZXRvciA9IHNlbGVjdG9ycy5nZXRDc3NTZWxlY3RvcigpO1xuXHRcdFx0XHRcdHZhciBuZXdTZWxlY3RlZEVsZW1lbnRzID0gdGhpcy5xdWVyeShjc3NTZWxldG9yKTtcblx0XHRcdFx0XHQvLyBpZiByZXN1bHRzIGRvZXNuJ3QgbWF0Y2ggdGhlbiB1bmRvIGNoYW5nZXNcblx0XHRcdFx0XHRpZiAoIWNvbXBhcmVFbGVtZW50cyhuZXdTZWxlY3RlZEVsZW1lbnRzKSkge1xuXHRcdFx0XHRcdFx0c2VsZWN0b3IuY2xhc3Nlcy5zcGxpY2UoaiwgMCwgY2NsYXNzKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBzdHJpcCB0YWdzXG5cdFx0Zm9yICh2YXIgaSA9IHNlbGVjdG9ycy5sZW5ndGggLSAxOyBpID4gMDsgaS0tKSB7XG5cdFx0XHR2YXIgc2VsZWN0b3IgPSBzZWxlY3RvcnNbaV07XG5cdFx0XHRzZWxlY3RvcnMuc3BsaWNlKGksIDEpO1xuXHRcdFx0dmFyIGNzc1NlbGV0b3IgPSBzZWxlY3RvcnMuZ2V0Q3NzU2VsZWN0b3IoKTtcblx0XHRcdHZhciBuZXdTZWxlY3RlZEVsZW1lbnRzID0gdGhpcy5xdWVyeShjc3NTZWxldG9yKTtcblx0XHRcdC8vIGlmIHJlc3VsdHMgZG9lc24ndCBtYXRjaCB0aGVuIHVuZG8gY2hhbmdlc1xuXHRcdFx0aWYgKCFjb21wYXJlRWxlbWVudHMobmV3U2VsZWN0ZWRFbGVtZW50cykpIHtcblx0XHRcdFx0c2VsZWN0b3JzLnNwbGljZShpLCAwLCBzZWxlY3Rvcik7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHNlbGVjdG9ycztcblx0fSxcblx0Z2V0RWxlbWVudFNlbGVjdG9yczogZnVuY3Rpb24gKGVsZW1lbnRzLCB0b3ApIHtcblx0XHR2YXIgZWxlbWVudFNlbGVjdG9ycyA9IFtdO1xuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGVsZW1lbnQgPSBlbGVtZW50c1tpXTtcblx0XHRcdHZhciBlbGVtZW50U2VsZWN0b3IgPSB0aGlzLmdldEVsZW1lbnRTZWxlY3RvcihlbGVtZW50LCB0b3ApO1xuXHRcdFx0ZWxlbWVudFNlbGVjdG9ycy5wdXNoKGVsZW1lbnRTZWxlY3Rvcik7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGVsZW1lbnRTZWxlY3RvcnM7XG5cdH0sXG5cdGdldEVsZW1lbnRTZWxlY3RvcjogZnVuY3Rpb24gKGVsZW1lbnQsIHRvcCkge1xuXG5cdFx0dmFyIGVsZW1lbnRTZWxlY3Rvckxpc3QgPSBuZXcgRWxlbWVudFNlbGVjdG9yTGlzdCh0aGlzKTtcblx0XHR3aGlsZSAodHJ1ZSkge1xuXHRcdFx0aWYgKGVsZW1lbnQgPT09IHRoaXMucGFyZW50KSB7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAoZWxlbWVudCA9PT0gdW5kZWZpbmVkIHx8IGVsZW1lbnQgPT09IHRoaXMuZG9jdW1lbnQpIHtcblx0XHRcdFx0dGhyb3cgJ2VsZW1lbnQgaXMgbm90IGEgY2hpbGQgb2YgdGhlIGdpdmVuIHBhcmVudCc7XG5cdFx0XHR9XG5cdFx0XHRpZiAodGhpcy5pc0lnbm9yZWRUYWcoZWxlbWVudC50YWdOYW1lKSkge1xuXG5cdFx0XHRcdGVsZW1lbnQgPSBlbGVtZW50LnBhcmVudE5vZGU7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRvcCA+IDApIHtcblx0XHRcdFx0dG9wLS07XG5cdFx0XHRcdGVsZW1lbnQgPSBlbGVtZW50LnBhcmVudE5vZGU7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgc2VsZWN0b3IgPSBuZXcgRWxlbWVudFNlbGVjdG9yKGVsZW1lbnQsIHRoaXMuaWdub3JlZENsYXNzZXMpO1xuXHRcdFx0Ly8gZG9jdW1lbnQgZG9lcyBub3QgaGF2ZSBhIHRhZ05hbWVcblx0XHRcdGlmKGVsZW1lbnQucGFyZW50Tm9kZSA9PT0gdGhpcy5kb2N1bWVudCB8fCB0aGlzLmlzSWdub3JlZFRhZyhlbGVtZW50LnBhcmVudE5vZGUudGFnTmFtZSkpIHtcblx0XHRcdFx0c2VsZWN0b3IuaXNEaXJlY3RDaGlsZCA9IGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRlbGVtZW50U2VsZWN0b3JMaXN0LnB1c2goc2VsZWN0b3IpO1xuXHRcdFx0ZWxlbWVudCA9IGVsZW1lbnQucGFyZW50Tm9kZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZWxlbWVudFNlbGVjdG9yTGlzdDtcblx0fSxcblxuICAgIC8qKlxuICAgICAqIENvbXBhcmVzIHdoZXRoZXIgdHdvIGVsZW1lbnRzIGFyZSBzaW1pbGFyLiBTaW1pbGFyIGVsZW1lbnRzIHNob3VsZFxuICAgICAqIGhhdmUgYSBjb21tb24gcGFycmVudCBhbmQgYWxsIHBhcmVudCBlbGVtZW50cyBzaG91bGQgYmUgdGhlIHNhbWUgdHlwZS5cbiAgICAgKiBAcGFyYW0gZWxlbWVudDFcbiAgICAgKiBAcGFyYW0gZWxlbWVudDJcbiAgICAgKi9cbiAgICBjaGVja1NpbWlsYXJFbGVtZW50czogZnVuY3Rpb24oZWxlbWVudDEsIGVsZW1lbnQyKSB7XG5cbiAgICAgICAgd2hpbGUgKHRydWUpIHtcblxuICAgICAgICAgICAgaWYoZWxlbWVudDEudGFnTmFtZSAhPT0gZWxlbWVudDIudGFnTmFtZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKGVsZW1lbnQxID09PSBlbGVtZW50Mikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBzdG9wIGF0IGJvZHkgdGFnXG4gICAgICAgICAgICBpZiAoZWxlbWVudDEgPT09IHVuZGVmaW5lZCB8fCBlbGVtZW50MS50YWdOYW1lID09PSAnYm9keSdcbiAgICAgICAgICAgICAgICB8fCBlbGVtZW50MS50YWdOYW1lID09PSAnQk9EWScpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZWxlbWVudDIgPT09IHVuZGVmaW5lZCB8fCBlbGVtZW50Mi50YWdOYW1lID09PSAnYm9keSdcbiAgICAgICAgICAgICAgICB8fCBlbGVtZW50Mi50YWdOYW1lID09PSAnQk9EWScpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGVsZW1lbnQxID0gZWxlbWVudDEucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIGVsZW1lbnQyID0gZWxlbWVudDIucGFyZW50Tm9kZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHcm91cHMgZWxlbWVudHMgaW50byBncm91cHMgaWYgdGhlIGVtZWxlbnRzIGFyZSBub3Qgc2ltaWxhclxuICAgICAqIEBwYXJhbSBlbGVtZW50c1xuICAgICAqL1xuICAgIGdldEVsZW1lbnRHcm91cHM6IGZ1bmN0aW9uKGVsZW1lbnRzKSB7XG5cbiAgICAgICAgLy8gZmlyc3QgZWxtZW50IGlzIGluIHRoZSBmaXJzdCBncm91cFxuICAgICAgICAvLyBAVE9ETyBtYXliZSBpIGRvbnQgbmVlZCB0aGlzP1xuICAgICAgICB2YXIgZ3JvdXBzID0gW1tlbGVtZW50c1swXV1dO1xuXG4gICAgICAgIGZvcih2YXIgaSA9IDE7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGVsZW1lbnROZXcgPSBlbGVtZW50c1tpXTtcbiAgICAgICAgICAgIHZhciBhZGRlZFRvR3JvdXAgPSBmYWxzZTtcbiAgICAgICAgICAgIGZvcih2YXIgaiA9IDA7IGogPCBncm91cHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgZ3JvdXAgPSBncm91cHNbal07XG4gICAgICAgICAgICAgICAgdmFyIGVsZW1lbnRHcm91cCA9IGdyb3VwWzBdO1xuICAgICAgICAgICAgICAgIGlmKHRoaXMuY2hlY2tTaW1pbGFyRWxlbWVudHMoZWxlbWVudE5ldywgZWxlbWVudEdyb3VwKSkge1xuICAgICAgICAgICAgICAgICAgICBncm91cC5wdXNoKGVsZW1lbnROZXcpO1xuICAgICAgICAgICAgICAgICAgICBhZGRlZFRvR3JvdXAgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGFkZCBuZXcgZ3JvdXBcbiAgICAgICAgICAgIGlmKCFhZGRlZFRvR3JvdXApIHtcbiAgICAgICAgICAgICAgICBncm91cHMucHVzaChbZWxlbWVudE5ld10pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGdyb3VwcztcbiAgICB9LFxuXHRnZXRDc3NTZWxlY3RvcjogZnVuY3Rpb24gKGVsZW1lbnRzLCB0b3ApIHtcblxuXHRcdHRvcCA9IHRvcCB8fCAwO1xuXG5cdFx0dmFyIGVuYWJsZVNtYXJ0VGFibGVTZWxlY3RvciA9IHRoaXMuZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yO1xuXHRcdGlmIChlbGVtZW50cy5sZW5ndGggPiAxKSB7XG5cdFx0XHR0aGlzLmVuYWJsZVNtYXJ0VGFibGVTZWxlY3RvciA9IGZhbHNlO1xuXHRcdH1cblxuICAgICAgICAvLyBncm91cCBlbGVtZW50cyBpbnRvIHNpbWlsYXJpdHkgZ3JvdXBzXG4gICAgICAgIHZhciBlbGVtZW50R3JvdXBzID0gdGhpcy5nZXRFbGVtZW50R3JvdXBzKGVsZW1lbnRzKTtcblxuICAgICAgICB2YXIgcmVzdWx0Q1NTU2VsZWN0b3I7XG5cbiAgICAgICAgaWYodGhpcy5hbGxvd011bHRpcGxlU2VsZWN0b3JzKSB7XG5cbiAgICAgICAgICAgIHZhciBncm91cFNlbGVjdG9ycyA9IFtdO1xuXG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgZWxlbWVudEdyb3Vwcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBncm91cEVsZW1lbnRzID0gZWxlbWVudEdyb3Vwc1tpXTtcblxuICAgICAgICAgICAgICAgIHZhciBlbGVtZW50U2VsZWN0b3JzID0gdGhpcy5nZXRFbGVtZW50U2VsZWN0b3JzKGdyb3VwRWxlbWVudHMsIHRvcCk7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdFNlbGVjdG9yID0gdGhpcy5tZXJnZUVsZW1lbnRTZWxlY3RvcnMoZWxlbWVudFNlbGVjdG9ycyk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZW5hYmxlUmVzdWx0U3RyaXBwaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdFNlbGVjdG9yID0gdGhpcy5zdHJpcFNlbGVjdG9yKHJlc3VsdFNlbGVjdG9yKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBncm91cFNlbGVjdG9ycy5wdXNoKHJlc3VsdFNlbGVjdG9yLmdldENzc1NlbGVjdG9yKCkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXN1bHRDU1NTZWxlY3RvciA9IGdyb3VwU2VsZWN0b3JzLmpvaW4oJywgJyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZihlbGVtZW50R3JvdXBzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgICAgICAgICAgIHRocm93IFwiZm91bmQgbXVsdGlwbGUgZWxlbWVudCBncm91cHMsIGJ1dCBhbGxvd011bHRpcGxlU2VsZWN0b3JzIGRpc2FibGVkXCI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBlbGVtZW50U2VsZWN0b3JzID0gdGhpcy5nZXRFbGVtZW50U2VsZWN0b3JzKGVsZW1lbnRzLCB0b3ApO1xuICAgICAgICAgICAgdmFyIHJlc3VsdFNlbGVjdG9yID0gdGhpcy5tZXJnZUVsZW1lbnRTZWxlY3RvcnMoZWxlbWVudFNlbGVjdG9ycyk7XG4gICAgICAgICAgICBpZiAodGhpcy5lbmFibGVSZXN1bHRTdHJpcHBpbmcpIHtcbiAgICAgICAgICAgICAgICByZXN1bHRTZWxlY3RvciA9IHRoaXMuc3RyaXBTZWxlY3RvcihyZXN1bHRTZWxlY3Rvcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlc3VsdENTU1NlbGVjdG9yID0gcmVzdWx0U2VsZWN0b3IuZ2V0Q3NzU2VsZWN0b3IoKTtcbiAgICAgICAgfVxuXG5cdFx0dGhpcy5lbmFibGVTbWFydFRhYmxlU2VsZWN0b3IgPSBlbmFibGVTbWFydFRhYmxlU2VsZWN0b3I7XG5cblx0XHQvLyBzdHJpcCBkb3duIHNlbGVjdG9yXG5cdFx0cmV0dXJuIHJlc3VsdENTU1NlbGVjdG9yO1xuXHR9LFxuXHRpc0lnbm9yZWRUYWc6IGZ1bmN0aW9uICh0YWcpIHtcblx0XHRyZXR1cm4gdGhpcy5pZ25vcmVkVGFncy5pbmRleE9mKHRhZy50b0xvd2VyQ2FzZSgpKSAhPT0gLTE7XG5cdH1cbn07XG4iLCJcbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9saWIvanF1ZXJ5LWRlZmVycmVkJyk7IiwidmFyIGpRdWVyeSA9IG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vanF1ZXJ5LWNvcmUuanNcIiksXG5cdGNvcmVfcnNwYWNlID0gL1xccysvO1xuLyoqXG4qIGpRdWVyeSBDYWxsYmFja3NcbipcbiogQ29kZSBmcm9tOiBodHRwczovL2dpdGh1Yi5jb20vanF1ZXJ5L2pxdWVyeS9ibG9iL21hc3Rlci9zcmMvY2FsbGJhY2tzLmpzXG4qXG4qL1xuXG5cbi8vIFN0cmluZyB0byBPYmplY3Qgb3B0aW9ucyBmb3JtYXQgY2FjaGVcbnZhciBvcHRpb25zQ2FjaGUgPSB7fTtcblxuLy8gQ29udmVydCBTdHJpbmctZm9ybWF0dGVkIG9wdGlvbnMgaW50byBPYmplY3QtZm9ybWF0dGVkIG9uZXMgYW5kIHN0b3JlIGluIGNhY2hlXG5mdW5jdGlvbiBjcmVhdGVPcHRpb25zKCBvcHRpb25zICkge1xuXHR2YXIgb2JqZWN0ID0gb3B0aW9uc0NhY2hlWyBvcHRpb25zIF0gPSB7fTtcblx0alF1ZXJ5LmVhY2goIG9wdGlvbnMuc3BsaXQoIGNvcmVfcnNwYWNlICksIGZ1bmN0aW9uKCBfLCBmbGFnICkge1xuXHRcdG9iamVjdFsgZmxhZyBdID0gdHJ1ZTtcblx0fSk7XG5cdHJldHVybiBvYmplY3Q7XG59XG5cbi8qXG4gKiBDcmVhdGUgYSBjYWxsYmFjayBsaXN0IHVzaW5nIHRoZSBmb2xsb3dpbmcgcGFyYW1ldGVyczpcbiAqXG4gKlx0b3B0aW9uczogYW4gb3B0aW9uYWwgbGlzdCBvZiBzcGFjZS1zZXBhcmF0ZWQgb3B0aW9ucyB0aGF0IHdpbGwgY2hhbmdlIGhvd1xuICpcdFx0XHR0aGUgY2FsbGJhY2sgbGlzdCBiZWhhdmVzIG9yIGEgbW9yZSB0cmFkaXRpb25hbCBvcHRpb24gb2JqZWN0XG4gKlxuICogQnkgZGVmYXVsdCBhIGNhbGxiYWNrIGxpc3Qgd2lsbCBhY3QgbGlrZSBhbiBldmVudCBjYWxsYmFjayBsaXN0IGFuZCBjYW4gYmVcbiAqIFwiZmlyZWRcIiBtdWx0aXBsZSB0aW1lcy5cbiAqXG4gKiBQb3NzaWJsZSBvcHRpb25zOlxuICpcbiAqXHRvbmNlOlx0XHRcdHdpbGwgZW5zdXJlIHRoZSBjYWxsYmFjayBsaXN0IGNhbiBvbmx5IGJlIGZpcmVkIG9uY2UgKGxpa2UgYSBEZWZlcnJlZClcbiAqXG4gKlx0bWVtb3J5Olx0XHRcdHdpbGwga2VlcCB0cmFjayBvZiBwcmV2aW91cyB2YWx1ZXMgYW5kIHdpbGwgY2FsbCBhbnkgY2FsbGJhY2sgYWRkZWRcbiAqXHRcdFx0XHRcdGFmdGVyIHRoZSBsaXN0IGhhcyBiZWVuIGZpcmVkIHJpZ2h0IGF3YXkgd2l0aCB0aGUgbGF0ZXN0IFwibWVtb3JpemVkXCJcbiAqXHRcdFx0XHRcdHZhbHVlcyAobGlrZSBhIERlZmVycmVkKVxuICpcbiAqXHR1bmlxdWU6XHRcdFx0d2lsbCBlbnN1cmUgYSBjYWxsYmFjayBjYW4gb25seSBiZSBhZGRlZCBvbmNlIChubyBkdXBsaWNhdGUgaW4gdGhlIGxpc3QpXG4gKlxuICpcdHN0b3BPbkZhbHNlOlx0aW50ZXJydXB0IGNhbGxpbmdzIHdoZW4gYSBjYWxsYmFjayByZXR1cm5zIGZhbHNlXG4gKlxuICovXG5qUXVlcnkuQ2FsbGJhY2tzID0gZnVuY3Rpb24oIG9wdGlvbnMgKSB7XG5cblx0Ly8gQ29udmVydCBvcHRpb25zIGZyb20gU3RyaW5nLWZvcm1hdHRlZCB0byBPYmplY3QtZm9ybWF0dGVkIGlmIG5lZWRlZFxuXHQvLyAod2UgY2hlY2sgaW4gY2FjaGUgZmlyc3QpXG5cdG9wdGlvbnMgPSB0eXBlb2Ygb3B0aW9ucyA9PT0gXCJzdHJpbmdcIiA/XG5cdFx0KCBvcHRpb25zQ2FjaGVbIG9wdGlvbnMgXSB8fCBjcmVhdGVPcHRpb25zKCBvcHRpb25zICkgKSA6XG5cdFx0alF1ZXJ5LmV4dGVuZCgge30sIG9wdGlvbnMgKTtcblxuXHR2YXIgLy8gTGFzdCBmaXJlIHZhbHVlIChmb3Igbm9uLWZvcmdldHRhYmxlIGxpc3RzKVxuXHRcdG1lbW9yeSxcblx0XHQvLyBGbGFnIHRvIGtub3cgaWYgbGlzdCB3YXMgYWxyZWFkeSBmaXJlZFxuXHRcdGZpcmVkLFxuXHRcdC8vIEZsYWcgdG8ga25vdyBpZiBsaXN0IGlzIGN1cnJlbnRseSBmaXJpbmdcblx0XHRmaXJpbmcsXG5cdFx0Ly8gRmlyc3QgY2FsbGJhY2sgdG8gZmlyZSAodXNlZCBpbnRlcm5hbGx5IGJ5IGFkZCBhbmQgZmlyZVdpdGgpXG5cdFx0ZmlyaW5nU3RhcnQsXG5cdFx0Ly8gRW5kIG9mIHRoZSBsb29wIHdoZW4gZmlyaW5nXG5cdFx0ZmlyaW5nTGVuZ3RoLFxuXHRcdC8vIEluZGV4IG9mIGN1cnJlbnRseSBmaXJpbmcgY2FsbGJhY2sgKG1vZGlmaWVkIGJ5IHJlbW92ZSBpZiBuZWVkZWQpXG5cdFx0ZmlyaW5nSW5kZXgsXG5cdFx0Ly8gQWN0dWFsIGNhbGxiYWNrIGxpc3Rcblx0XHRsaXN0ID0gW10sXG5cdFx0Ly8gU3RhY2sgb2YgZmlyZSBjYWxscyBmb3IgcmVwZWF0YWJsZSBsaXN0c1xuXHRcdHN0YWNrID0gIW9wdGlvbnMub25jZSAmJiBbXSxcblx0XHQvLyBGaXJlIGNhbGxiYWNrc1xuXHRcdGZpcmUgPSBmdW5jdGlvbiggZGF0YSApIHtcblx0XHRcdG1lbW9yeSA9IG9wdGlvbnMubWVtb3J5ICYmIGRhdGE7XG5cdFx0XHRmaXJlZCA9IHRydWU7XG5cdFx0XHRmaXJpbmdJbmRleCA9IGZpcmluZ1N0YXJ0IHx8IDA7XG5cdFx0XHRmaXJpbmdTdGFydCA9IDA7XG5cdFx0XHRmaXJpbmdMZW5ndGggPSBsaXN0Lmxlbmd0aDtcblx0XHRcdGZpcmluZyA9IHRydWU7XG5cdFx0XHRmb3IgKCA7IGxpc3QgJiYgZmlyaW5nSW5kZXggPCBmaXJpbmdMZW5ndGg7IGZpcmluZ0luZGV4KysgKSB7XG5cdFx0XHRcdGlmICggbGlzdFsgZmlyaW5nSW5kZXggXS5hcHBseSggZGF0YVsgMCBdLCBkYXRhWyAxIF0gKSA9PT0gZmFsc2UgJiYgb3B0aW9ucy5zdG9wT25GYWxzZSApIHtcblx0XHRcdFx0XHRtZW1vcnkgPSBmYWxzZTsgLy8gVG8gcHJldmVudCBmdXJ0aGVyIGNhbGxzIHVzaW5nIGFkZFxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRmaXJpbmcgPSBmYWxzZTtcblx0XHRcdGlmICggbGlzdCApIHtcblx0XHRcdFx0aWYgKCBzdGFjayApIHtcblx0XHRcdFx0XHRpZiAoIHN0YWNrLmxlbmd0aCApIHtcblx0XHRcdFx0XHRcdGZpcmUoIHN0YWNrLnNoaWZ0KCkgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSBpZiAoIG1lbW9yeSApIHtcblx0XHRcdFx0XHRsaXN0ID0gW107XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0c2VsZi5kaXNhYmxlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LFxuXHRcdC8vIEFjdHVhbCBDYWxsYmFja3Mgb2JqZWN0XG5cdFx0c2VsZiA9IHtcblx0XHRcdC8vIEFkZCBhIGNhbGxiYWNrIG9yIGEgY29sbGVjdGlvbiBvZiBjYWxsYmFja3MgdG8gdGhlIGxpc3Rcblx0XHRcdGFkZDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICggbGlzdCApIHtcblx0XHRcdFx0XHQvLyBGaXJzdCwgd2Ugc2F2ZSB0aGUgY3VycmVudCBsZW5ndGhcblx0XHRcdFx0XHR2YXIgc3RhcnQgPSBsaXN0Lmxlbmd0aDtcblx0XHRcdFx0XHQoZnVuY3Rpb24gYWRkKCBhcmdzICkge1xuXHRcdFx0XHRcdFx0alF1ZXJ5LmVhY2goIGFyZ3MsIGZ1bmN0aW9uKCBfLCBhcmcgKSB7XG5cdFx0XHRcdFx0XHRcdHZhciB0eXBlID0galF1ZXJ5LnR5cGUoIGFyZyApO1xuXHRcdFx0XHRcdFx0XHRpZiAoIHR5cGUgPT09IFwiZnVuY3Rpb25cIiApIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoICFvcHRpb25zLnVuaXF1ZSB8fCAhc2VsZi5oYXMoIGFyZyApICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0bGlzdC5wdXNoKCBhcmcgKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoIGFyZyAmJiBhcmcubGVuZ3RoICYmIHR5cGUgIT09IFwic3RyaW5nXCIgKSB7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gSW5zcGVjdCByZWN1cnNpdmVseVxuXHRcdFx0XHRcdFx0XHRcdGFkZCggYXJnICk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH0pKCBhcmd1bWVudHMgKTtcblx0XHRcdFx0XHQvLyBEbyB3ZSBuZWVkIHRvIGFkZCB0aGUgY2FsbGJhY2tzIHRvIHRoZVxuXHRcdFx0XHRcdC8vIGN1cnJlbnQgZmlyaW5nIGJhdGNoP1xuXHRcdFx0XHRcdGlmICggZmlyaW5nICkge1xuXHRcdFx0XHRcdFx0ZmlyaW5nTGVuZ3RoID0gbGlzdC5sZW5ndGg7XG5cdFx0XHRcdFx0Ly8gV2l0aCBtZW1vcnksIGlmIHdlJ3JlIG5vdCBmaXJpbmcgdGhlblxuXHRcdFx0XHRcdC8vIHdlIHNob3VsZCBjYWxsIHJpZ2h0IGF3YXlcblx0XHRcdFx0XHR9IGVsc2UgaWYgKCBtZW1vcnkgKSB7XG5cdFx0XHRcdFx0XHRmaXJpbmdTdGFydCA9IHN0YXJ0O1xuXHRcdFx0XHRcdFx0ZmlyZSggbWVtb3J5ICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fSxcblx0XHRcdC8vIFJlbW92ZSBhIGNhbGxiYWNrIGZyb20gdGhlIGxpc3Rcblx0XHRcdHJlbW92ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICggbGlzdCApIHtcblx0XHRcdFx0XHRqUXVlcnkuZWFjaCggYXJndW1lbnRzLCBmdW5jdGlvbiggXywgYXJnICkge1xuXHRcdFx0XHRcdFx0dmFyIGluZGV4O1xuXHRcdFx0XHRcdFx0d2hpbGUoICggaW5kZXggPSBqUXVlcnkuaW5BcnJheSggYXJnLCBsaXN0LCBpbmRleCApICkgPiAtMSApIHtcblx0XHRcdFx0XHRcdFx0bGlzdC5zcGxpY2UoIGluZGV4LCAxICk7XG5cdFx0XHRcdFx0XHRcdC8vIEhhbmRsZSBmaXJpbmcgaW5kZXhlc1xuXHRcdFx0XHRcdFx0XHRpZiAoIGZpcmluZyApIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoIGluZGV4IDw9IGZpcmluZ0xlbmd0aCApIHtcblx0XHRcdFx0XHRcdFx0XHRcdGZpcmluZ0xlbmd0aC0tO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRpZiAoIGluZGV4IDw9IGZpcmluZ0luZGV4ICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0ZmlyaW5nSW5kZXgtLTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH0sXG5cdFx0XHQvLyBDb250cm9sIGlmIGEgZ2l2ZW4gY2FsbGJhY2sgaXMgaW4gdGhlIGxpc3Rcblx0XHRcdGhhczogZnVuY3Rpb24oIGZuICkge1xuXHRcdFx0XHRyZXR1cm4galF1ZXJ5LmluQXJyYXkoIGZuLCBsaXN0ICkgPiAtMTtcblx0XHRcdH0sXG5cdFx0XHQvLyBSZW1vdmUgYWxsIGNhbGxiYWNrcyBmcm9tIHRoZSBsaXN0XG5cdFx0XHRlbXB0eTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGxpc3QgPSBbXTtcblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gSGF2ZSB0aGUgbGlzdCBkbyBub3RoaW5nIGFueW1vcmVcblx0XHRcdGRpc2FibGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRsaXN0ID0gc3RhY2sgPSBtZW1vcnkgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fSxcblx0XHRcdC8vIElzIGl0IGRpc2FibGVkP1xuXHRcdFx0ZGlzYWJsZWQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gIWxpc3Q7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gTG9jayB0aGUgbGlzdCBpbiBpdHMgY3VycmVudCBzdGF0ZVxuXHRcdFx0bG9jazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHN0YWNrID0gdW5kZWZpbmVkO1xuXHRcdFx0XHRpZiAoICFtZW1vcnkgKSB7XG5cdFx0XHRcdFx0c2VsZi5kaXNhYmxlKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gSXMgaXQgbG9ja2VkP1xuXHRcdFx0bG9ja2VkOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuICFzdGFjaztcblx0XHRcdH0sXG5cdFx0XHQvLyBDYWxsIGFsbCBjYWxsYmFja3Mgd2l0aCB0aGUgZ2l2ZW4gY29udGV4dCBhbmQgYXJndW1lbnRzXG5cdFx0XHRmaXJlV2l0aDogZnVuY3Rpb24oIGNvbnRleHQsIGFyZ3MgKSB7XG5cdFx0XHRcdGFyZ3MgPSBhcmdzIHx8IFtdO1xuXHRcdFx0XHRhcmdzID0gWyBjb250ZXh0LCBhcmdzLnNsaWNlID8gYXJncy5zbGljZSgpIDogYXJncyBdO1xuXHRcdFx0XHRpZiAoIGxpc3QgJiYgKCAhZmlyZWQgfHwgc3RhY2sgKSApIHtcblx0XHRcdFx0XHRpZiAoIGZpcmluZyApIHtcblx0XHRcdFx0XHRcdHN0YWNrLnB1c2goIGFyZ3MgKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0ZmlyZSggYXJncyApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH0sXG5cdFx0XHQvLyBDYWxsIGFsbCB0aGUgY2FsbGJhY2tzIHdpdGggdGhlIGdpdmVuIGFyZ3VtZW50c1xuXHRcdFx0ZmlyZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHNlbGYuZmlyZVdpdGgoIHRoaXMsIGFyZ3VtZW50cyApO1xuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH0sXG5cdFx0XHQvLyBUbyBrbm93IGlmIHRoZSBjYWxsYmFja3MgaGF2ZSBhbHJlYWR5IGJlZW4gY2FsbGVkIGF0IGxlYXN0IG9uY2Vcblx0XHRcdGZpcmVkOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuICEhZmlyZWQ7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRyZXR1cm4gc2VsZjtcbn07XG5cbiIsIi8qKlxuKiBqUXVlcnkgY29yZSBvYmplY3QuXG4qXG4qIFdvcmtlciB3aXRoIGpRdWVyeSBkZWZlcnJlZFxuKlxuKiBDb2RlIGZyb206IGh0dHBzOi8vZ2l0aHViLmNvbS9qcXVlcnkvanF1ZXJ5L2Jsb2IvbWFzdGVyL3NyYy9jb3JlLmpzXG4qXG4qL1xuXG52YXIgalF1ZXJ5ID0gbW9kdWxlLmV4cG9ydHMgPSB7XG5cdHR5cGU6IHR5cGVcblx0LCBpc0FycmF5OiBpc0FycmF5XG5cdCwgaXNGdW5jdGlvbjogaXNGdW5jdGlvblxuXHQsIGlzUGxhaW5PYmplY3Q6IGlzUGxhaW5PYmplY3Rcblx0LCBlYWNoOiBlYWNoXG5cdCwgZXh0ZW5kOiBleHRlbmRcblx0LCBub29wOiBmdW5jdGlvbigpIHt9XG59O1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG52YXIgY2xhc3MydHlwZSA9IHt9O1xuLy8gUG9wdWxhdGUgdGhlIGNsYXNzMnR5cGUgbWFwXG5cIkJvb2xlYW4gTnVtYmVyIFN0cmluZyBGdW5jdGlvbiBBcnJheSBEYXRlIFJlZ0V4cCBPYmplY3RcIi5zcGxpdChcIiBcIikuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG5cdGNsYXNzMnR5cGVbIFwiW29iamVjdCBcIiArIG5hbWUgKyBcIl1cIiBdID0gbmFtZS50b0xvd2VyQ2FzZSgpO1xufSk7XG5cblxuZnVuY3Rpb24gdHlwZSggb2JqICkge1xuXHRyZXR1cm4gb2JqID09IG51bGwgP1xuXHRcdFN0cmluZyggb2JqICkgOlxuXHRcdFx0Y2xhc3MydHlwZVsgdG9TdHJpbmcuY2FsbChvYmopIF0gfHwgXCJvYmplY3RcIjtcbn1cblxuZnVuY3Rpb24gaXNGdW5jdGlvbiggb2JqICkge1xuXHRyZXR1cm4galF1ZXJ5LnR5cGUob2JqKSA9PT0gXCJmdW5jdGlvblwiO1xufVxuXG5mdW5jdGlvbiBpc0FycmF5KCBvYmogKSB7XG5cdHJldHVybiBqUXVlcnkudHlwZShvYmopID09PSBcImFycmF5XCI7XG59XG5cbmZ1bmN0aW9uIGVhY2goIG9iamVjdCwgY2FsbGJhY2ssIGFyZ3MgKSB7XG5cdHZhciBuYW1lLCBpID0gMCxcblx0bGVuZ3RoID0gb2JqZWN0Lmxlbmd0aCxcblx0aXNPYmogPSBsZW5ndGggPT09IHVuZGVmaW5lZCB8fCBpc0Z1bmN0aW9uKCBvYmplY3QgKTtcblxuXHRpZiAoIGFyZ3MgKSB7XG5cdFx0aWYgKCBpc09iaiApIHtcblx0XHRcdGZvciAoIG5hbWUgaW4gb2JqZWN0ICkge1xuXHRcdFx0XHRpZiAoIGNhbGxiYWNrLmFwcGx5KCBvYmplY3RbIG5hbWUgXSwgYXJncyApID09PSBmYWxzZSApIHtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRmb3IgKCA7IGkgPCBsZW5ndGg7ICkge1xuXHRcdFx0XHRpZiAoIGNhbGxiYWNrLmFwcGx5KCBvYmplY3RbIGkrKyBdLCBhcmdzICkgPT09IGZhbHNlICkge1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gQSBzcGVjaWFsLCBmYXN0LCBjYXNlIGZvciB0aGUgbW9zdCBjb21tb24gdXNlIG9mIGVhY2hcblx0fSBlbHNlIHtcblx0XHRpZiAoIGlzT2JqICkge1xuXHRcdFx0Zm9yICggbmFtZSBpbiBvYmplY3QgKSB7XG5cdFx0XHRcdGlmICggY2FsbGJhY2suY2FsbCggb2JqZWN0WyBuYW1lIF0sIG5hbWUsIG9iamVjdFsgbmFtZSBdICkgPT09IGZhbHNlICkge1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdGZvciAoIDsgaSA8IGxlbmd0aDsgKSB7XG5cdFx0XHRcdGlmICggY2FsbGJhY2suY2FsbCggb2JqZWN0WyBpIF0sIGksIG9iamVjdFsgaSsrIF0gKSA9PT0gZmFsc2UgKSB7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gb2JqZWN0O1xufVxuXG5mdW5jdGlvbiBpc1BsYWluT2JqZWN0KCBvYmogKSB7XG5cdC8vIE11c3QgYmUgYW4gT2JqZWN0LlxuXHRpZiAoICFvYmogfHwgalF1ZXJ5LnR5cGUob2JqKSAhPT0gXCJvYmplY3RcIiApIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0cmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGV4dGVuZCgpIHtcblx0dmFyIG9wdGlvbnMsIG5hbWUsIHNyYywgY29weSwgY29weUlzQXJyYXksIGNsb25lLFxuXHR0YXJnZXQgPSBhcmd1bWVudHNbMF0gfHwge30sXG5cdGkgPSAxLFxuXHRsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoLFxuXHRkZWVwID0gZmFsc2U7XG5cblx0Ly8gSGFuZGxlIGEgZGVlcCBjb3B5IHNpdHVhdGlvblxuXHRpZiAoIHR5cGVvZiB0YXJnZXQgPT09IFwiYm9vbGVhblwiICkge1xuXHRcdGRlZXAgPSB0YXJnZXQ7XG5cdFx0dGFyZ2V0ID0gYXJndW1lbnRzWzFdIHx8IHt9O1xuXHRcdC8vIHNraXAgdGhlIGJvb2xlYW4gYW5kIHRoZSB0YXJnZXRcblx0XHRpID0gMjtcblx0fVxuXG5cdC8vIEhhbmRsZSBjYXNlIHdoZW4gdGFyZ2V0IGlzIGEgc3RyaW5nIG9yIHNvbWV0aGluZyAocG9zc2libGUgaW4gZGVlcCBjb3B5KVxuXHRpZiAoIHR5cGVvZiB0YXJnZXQgIT09IFwib2JqZWN0XCIgJiYgIWpRdWVyeS5pc0Z1bmN0aW9uKHRhcmdldCkgKSB7XG5cdFx0dGFyZ2V0ID0ge307XG5cdH1cblxuXHQvLyBleHRlbmQgalF1ZXJ5IGl0c2VsZiBpZiBvbmx5IG9uZSBhcmd1bWVudCBpcyBwYXNzZWRcblx0aWYgKCBsZW5ndGggPT09IGkgKSB7XG5cdFx0dGFyZ2V0ID0gdGhpcztcblx0XHQtLWk7XG5cdH1cblxuXHRmb3IgKCA7IGkgPCBsZW5ndGg7IGkrKyApIHtcblx0XHQvLyBPbmx5IGRlYWwgd2l0aCBub24tbnVsbC91bmRlZmluZWQgdmFsdWVzXG5cdFx0aWYgKCAob3B0aW9ucyA9IGFyZ3VtZW50c1sgaSBdKSAhPSBudWxsICkge1xuXHRcdFx0Ly8gRXh0ZW5kIHRoZSBiYXNlIG9iamVjdFxuXHRcdFx0Zm9yICggbmFtZSBpbiBvcHRpb25zICkge1xuXHRcdFx0XHRzcmMgPSB0YXJnZXRbIG5hbWUgXTtcblx0XHRcdFx0Y29weSA9IG9wdGlvbnNbIG5hbWUgXTtcblxuXHRcdFx0XHQvLyBQcmV2ZW50IG5ldmVyLWVuZGluZyBsb29wXG5cdFx0XHRcdGlmICggdGFyZ2V0ID09PSBjb3B5ICkge1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gUmVjdXJzZSBpZiB3ZSdyZSBtZXJnaW5nIHBsYWluIG9iamVjdHMgb3IgYXJyYXlzXG5cdFx0XHRcdGlmICggZGVlcCAmJiBjb3B5ICYmICggalF1ZXJ5LmlzUGxhaW5PYmplY3QoY29weSkgfHwgKGNvcHlJc0FycmF5ID0galF1ZXJ5LmlzQXJyYXkoY29weSkpICkgKSB7XG5cdFx0XHRcdFx0aWYgKCBjb3B5SXNBcnJheSApIHtcblx0XHRcdFx0XHRcdGNvcHlJc0FycmF5ID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRjbG9uZSA9IHNyYyAmJiBqUXVlcnkuaXNBcnJheShzcmMpID8gc3JjIDogW107XG5cblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y2xvbmUgPSBzcmMgJiYgalF1ZXJ5LmlzUGxhaW5PYmplY3Qoc3JjKSA/IHNyYyA6IHt9O1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIE5ldmVyIG1vdmUgb3JpZ2luYWwgb2JqZWN0cywgY2xvbmUgdGhlbVxuXHRcdFx0XHRcdHRhcmdldFsgbmFtZSBdID0galF1ZXJ5LmV4dGVuZCggZGVlcCwgY2xvbmUsIGNvcHkgKTtcblxuXHRcdFx0XHRcdC8vIERvbid0IGJyaW5nIGluIHVuZGVmaW5lZCB2YWx1ZXNcblx0XHRcdFx0fSBlbHNlIGlmICggY29weSAhPT0gdW5kZWZpbmVkICkge1xuXHRcdFx0XHRcdHRhcmdldFsgbmFtZSBdID0gY29weTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vIFJldHVybiB0aGUgbW9kaWZpZWQgb2JqZWN0XG5cdHJldHVybiB0YXJnZXQ7XG59O1xuXG5cbiIsIlxuLyohXG4qIGpxdWVyeS1kZWZlcnJlZFxuKiBDb3B5cmlnaHQoYykgMjAxMSBIaWRkZW4gPHp6ZGhpZGRlbkBnbWFpbC5jb20+XG4qIE1JVCBMaWNlbnNlZFxuKi9cblxuLyoqXG4qIExpYnJhcnkgdmVyc2lvbi5cbiovXG5cbnZhciBqUXVlcnkgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL2pxdWVyeS1jYWxsYmFja3MuanNcIiksXG5cdGNvcmVfc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG5cbi8qKlxuKiBqUXVlcnkgZGVmZXJyZWRcbipcbiogQ29kZSBmcm9tOiBodHRwczovL2dpdGh1Yi5jb20vanF1ZXJ5L2pxdWVyeS9ibG9iL21hc3Rlci9zcmMvZGVmZXJyZWQuanNcbiogRG9jOiBodHRwOi8vYXBpLmpxdWVyeS5jb20vY2F0ZWdvcnkvZGVmZXJyZWQtb2JqZWN0L1xuKlxuKi9cblxualF1ZXJ5LmV4dGVuZCh7XG5cblx0RGVmZXJyZWQ6IGZ1bmN0aW9uKCBmdW5jICkge1xuXHRcdHZhciB0dXBsZXMgPSBbXG5cdFx0XHRcdC8vIGFjdGlvbiwgYWRkIGxpc3RlbmVyLCBsaXN0ZW5lciBsaXN0LCBmaW5hbCBzdGF0ZVxuXHRcdFx0XHRbIFwicmVzb2x2ZVwiLCBcImRvbmVcIiwgalF1ZXJ5LkNhbGxiYWNrcyhcIm9uY2UgbWVtb3J5XCIpLCBcInJlc29sdmVkXCIgXSxcblx0XHRcdFx0WyBcInJlamVjdFwiLCBcImZhaWxcIiwgalF1ZXJ5LkNhbGxiYWNrcyhcIm9uY2UgbWVtb3J5XCIpLCBcInJlamVjdGVkXCIgXSxcblx0XHRcdFx0WyBcIm5vdGlmeVwiLCBcInByb2dyZXNzXCIsIGpRdWVyeS5DYWxsYmFja3MoXCJtZW1vcnlcIikgXVxuXHRcdFx0XSxcblx0XHRcdHN0YXRlID0gXCJwZW5kaW5nXCIsXG5cdFx0XHRwcm9taXNlID0ge1xuXHRcdFx0XHRzdGF0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHN0YXRlO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRhbHdheXM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGRlZmVycmVkLmRvbmUoIGFyZ3VtZW50cyApLmZhaWwoIGFyZ3VtZW50cyApO1xuXHRcdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHR0aGVuOiBmdW5jdGlvbiggLyogZm5Eb25lLCBmbkZhaWwsIGZuUHJvZ3Jlc3MgKi8gKSB7XG5cdFx0XHRcdFx0dmFyIGZucyA9IGFyZ3VtZW50cztcblx0XHRcdFx0XHRyZXR1cm4galF1ZXJ5LkRlZmVycmVkKGZ1bmN0aW9uKCBuZXdEZWZlciApIHtcblx0XHRcdFx0XHRcdGpRdWVyeS5lYWNoKCB0dXBsZXMsIGZ1bmN0aW9uKCBpLCB0dXBsZSApIHtcblx0XHRcdFx0XHRcdFx0dmFyIGFjdGlvbiA9IHR1cGxlWyAwIF0sXG5cdFx0XHRcdFx0XHRcdFx0Zm4gPSBmbnNbIGkgXTtcblx0XHRcdFx0XHRcdFx0Ly8gZGVmZXJyZWRbIGRvbmUgfCBmYWlsIHwgcHJvZ3Jlc3MgXSBmb3IgZm9yd2FyZGluZyBhY3Rpb25zIHRvIG5ld0RlZmVyXG5cdFx0XHRcdFx0XHRcdGRlZmVycmVkWyB0dXBsZVsxXSBdKCBqUXVlcnkuaXNGdW5jdGlvbiggZm4gKSA/XG5cdFx0XHRcdFx0XHRcdFx0ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR2YXIgcmV0dXJuZWQgPSBmbi5hcHBseSggdGhpcywgYXJndW1lbnRzICk7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoIHJldHVybmVkICYmIGpRdWVyeS5pc0Z1bmN0aW9uKCByZXR1cm5lZC5wcm9taXNlICkgKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJldHVybmVkLnByb21pc2UoKVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdC5kb25lKCBuZXdEZWZlci5yZXNvbHZlIClcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQuZmFpbCggbmV3RGVmZXIucmVqZWN0IClcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQucHJvZ3Jlc3MoIG5ld0RlZmVyLm5vdGlmeSApO1xuXHRcdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0bmV3RGVmZXJbIGFjdGlvbiArIFwiV2l0aFwiIF0oIHRoaXMgPT09IGRlZmVycmVkID8gbmV3RGVmZXIgOiB0aGlzLCBbIHJldHVybmVkIF0gKTtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR9IDpcblx0XHRcdFx0XHRcdFx0XHRuZXdEZWZlclsgYWN0aW9uIF1cblx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0Zm5zID0gbnVsbDtcblx0XHRcdFx0XHR9KS5wcm9taXNlKCk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdC8vIEdldCBhIHByb21pc2UgZm9yIHRoaXMgZGVmZXJyZWRcblx0XHRcdFx0Ly8gSWYgb2JqIGlzIHByb3ZpZGVkLCB0aGUgcHJvbWlzZSBhc3BlY3QgaXMgYWRkZWQgdG8gdGhlIG9iamVjdFxuXHRcdFx0XHRwcm9taXNlOiBmdW5jdGlvbiggb2JqICkge1xuXHRcdFx0XHRcdHJldHVybiBvYmogIT0gbnVsbCA/IGpRdWVyeS5leHRlbmQoIG9iaiwgcHJvbWlzZSApIDogcHJvbWlzZTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGRlZmVycmVkID0ge307XG5cblx0XHQvLyBLZWVwIHBpcGUgZm9yIGJhY2stY29tcGF0XG5cdFx0cHJvbWlzZS5waXBlID0gcHJvbWlzZS50aGVuO1xuXG5cdFx0Ly8gQWRkIGxpc3Qtc3BlY2lmaWMgbWV0aG9kc1xuXHRcdGpRdWVyeS5lYWNoKCB0dXBsZXMsIGZ1bmN0aW9uKCBpLCB0dXBsZSApIHtcblx0XHRcdHZhciBsaXN0ID0gdHVwbGVbIDIgXSxcblx0XHRcdFx0c3RhdGVTdHJpbmcgPSB0dXBsZVsgMyBdO1xuXG5cdFx0XHQvLyBwcm9taXNlWyBkb25lIHwgZmFpbCB8IHByb2dyZXNzIF0gPSBsaXN0LmFkZFxuXHRcdFx0cHJvbWlzZVsgdHVwbGVbMV0gXSA9IGxpc3QuYWRkO1xuXG5cdFx0XHQvLyBIYW5kbGUgc3RhdGVcblx0XHRcdGlmICggc3RhdGVTdHJpbmcgKSB7XG5cdFx0XHRcdGxpc3QuYWRkKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vIHN0YXRlID0gWyByZXNvbHZlZCB8IHJlamVjdGVkIF1cblx0XHRcdFx0XHRzdGF0ZSA9IHN0YXRlU3RyaW5nO1xuXG5cdFx0XHRcdC8vIFsgcmVqZWN0X2xpc3QgfCByZXNvbHZlX2xpc3QgXS5kaXNhYmxlOyBwcm9ncmVzc19saXN0LmxvY2tcblx0XHRcdFx0fSwgdHVwbGVzWyBpIF4gMSBdWyAyIF0uZGlzYWJsZSwgdHVwbGVzWyAyIF1bIDIgXS5sb2NrICk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIGRlZmVycmVkWyByZXNvbHZlIHwgcmVqZWN0IHwgbm90aWZ5IF0gPSBsaXN0LmZpcmVcblx0XHRcdGRlZmVycmVkWyB0dXBsZVswXSBdID0gbGlzdC5maXJlO1xuXHRcdFx0ZGVmZXJyZWRbIHR1cGxlWzBdICsgXCJXaXRoXCIgXSA9IGxpc3QuZmlyZVdpdGg7XG5cdFx0fSk7XG5cblx0XHQvLyBNYWtlIHRoZSBkZWZlcnJlZCBhIHByb21pc2Vcblx0XHRwcm9taXNlLnByb21pc2UoIGRlZmVycmVkICk7XG5cblx0XHQvLyBDYWxsIGdpdmVuIGZ1bmMgaWYgYW55XG5cdFx0aWYgKCBmdW5jICkge1xuXHRcdFx0ZnVuYy5jYWxsKCBkZWZlcnJlZCwgZGVmZXJyZWQgKTtcblx0XHR9XG5cblx0XHQvLyBBbGwgZG9uZSFcblx0XHRyZXR1cm4gZGVmZXJyZWQ7XG5cdH0sXG5cblx0Ly8gRGVmZXJyZWQgaGVscGVyXG5cdHdoZW46IGZ1bmN0aW9uKCBzdWJvcmRpbmF0ZSAvKiAsIC4uLiwgc3Vib3JkaW5hdGVOICovICkge1xuXHRcdHZhciBpID0gMCxcblx0XHRcdHJlc29sdmVWYWx1ZXMgPSBjb3JlX3NsaWNlLmNhbGwoIGFyZ3VtZW50cyApLFxuXHRcdFx0bGVuZ3RoID0gcmVzb2x2ZVZhbHVlcy5sZW5ndGgsXG5cblx0XHRcdC8vIHRoZSBjb3VudCBvZiB1bmNvbXBsZXRlZCBzdWJvcmRpbmF0ZXNcblx0XHRcdHJlbWFpbmluZyA9IGxlbmd0aCAhPT0gMSB8fCAoIHN1Ym9yZGluYXRlICYmIGpRdWVyeS5pc0Z1bmN0aW9uKCBzdWJvcmRpbmF0ZS5wcm9taXNlICkgKSA/IGxlbmd0aCA6IDAsXG5cblx0XHRcdC8vIHRoZSBtYXN0ZXIgRGVmZXJyZWQuIElmIHJlc29sdmVWYWx1ZXMgY29uc2lzdCBvZiBvbmx5IGEgc2luZ2xlIERlZmVycmVkLCBqdXN0IHVzZSB0aGF0LlxuXHRcdFx0ZGVmZXJyZWQgPSByZW1haW5pbmcgPT09IDEgPyBzdWJvcmRpbmF0ZSA6IGpRdWVyeS5EZWZlcnJlZCgpLFxuXG5cdFx0XHQvLyBVcGRhdGUgZnVuY3Rpb24gZm9yIGJvdGggcmVzb2x2ZSBhbmQgcHJvZ3Jlc3MgdmFsdWVzXG5cdFx0XHR1cGRhdGVGdW5jID0gZnVuY3Rpb24oIGksIGNvbnRleHRzLCB2YWx1ZXMgKSB7XG5cdFx0XHRcdHJldHVybiBmdW5jdGlvbiggdmFsdWUgKSB7XG5cdFx0XHRcdFx0Y29udGV4dHNbIGkgXSA9IHRoaXM7XG5cdFx0XHRcdFx0dmFsdWVzWyBpIF0gPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGNvcmVfc2xpY2UuY2FsbCggYXJndW1lbnRzICkgOiB2YWx1ZTtcblx0XHRcdFx0XHRpZiggdmFsdWVzID09PSBwcm9ncmVzc1ZhbHVlcyApIHtcblx0XHRcdFx0XHRcdGRlZmVycmVkLm5vdGlmeVdpdGgoIGNvbnRleHRzLCB2YWx1ZXMgKTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKCAhKCAtLXJlbWFpbmluZyApICkge1xuXHRcdFx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZVdpdGgoIGNvbnRleHRzLCB2YWx1ZXMgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH07XG5cdFx0XHR9LFxuXG5cdFx0XHRwcm9ncmVzc1ZhbHVlcywgcHJvZ3Jlc3NDb250ZXh0cywgcmVzb2x2ZUNvbnRleHRzO1xuXG5cdFx0Ly8gYWRkIGxpc3RlbmVycyB0byBEZWZlcnJlZCBzdWJvcmRpbmF0ZXM7IHRyZWF0IG90aGVycyBhcyByZXNvbHZlZFxuXHRcdGlmICggbGVuZ3RoID4gMSApIHtcblx0XHRcdHByb2dyZXNzVmFsdWVzID0gbmV3IEFycmF5KCBsZW5ndGggKTtcblx0XHRcdHByb2dyZXNzQ29udGV4dHMgPSBuZXcgQXJyYXkoIGxlbmd0aCApO1xuXHRcdFx0cmVzb2x2ZUNvbnRleHRzID0gbmV3IEFycmF5KCBsZW5ndGggKTtcblx0XHRcdGZvciAoIDsgaSA8IGxlbmd0aDsgaSsrICkge1xuXHRcdFx0XHRpZiAoIHJlc29sdmVWYWx1ZXNbIGkgXSAmJiBqUXVlcnkuaXNGdW5jdGlvbiggcmVzb2x2ZVZhbHVlc1sgaSBdLnByb21pc2UgKSApIHtcblx0XHRcdFx0XHRyZXNvbHZlVmFsdWVzWyBpIF0ucHJvbWlzZSgpXG5cdFx0XHRcdFx0XHQuZG9uZSggdXBkYXRlRnVuYyggaSwgcmVzb2x2ZUNvbnRleHRzLCByZXNvbHZlVmFsdWVzICkgKVxuXHRcdFx0XHRcdFx0LmZhaWwoIGRlZmVycmVkLnJlamVjdCApXG5cdFx0XHRcdFx0XHQucHJvZ3Jlc3MoIHVwZGF0ZUZ1bmMoIGksIHByb2dyZXNzQ29udGV4dHMsIHByb2dyZXNzVmFsdWVzICkgKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQtLXJlbWFpbmluZztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIGlmIHdlJ3JlIG5vdCB3YWl0aW5nIG9uIGFueXRoaW5nLCByZXNvbHZlIHRoZSBtYXN0ZXJcblx0XHRpZiAoICFyZW1haW5pbmcgKSB7XG5cdFx0XHRkZWZlcnJlZC5yZXNvbHZlV2l0aCggcmVzb2x2ZUNvbnRleHRzLCByZXNvbHZlVmFsdWVzICk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcblx0fVxufSk7XG4iXX0=
