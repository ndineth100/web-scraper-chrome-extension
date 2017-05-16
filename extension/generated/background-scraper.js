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
  store = new Store(config)
})

chrome.storage.onChanged.addListener(function () {
  config.loadConfiguration(function () {
    console.log('configuration changed', config)
    store = new Store(config)
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
    var sitemap = new Sitemap(request.sitemap)
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
    })

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
 * @param parentElement
 * @param selector
 */
var ElementQuery = function (CSSSelector, parentElement) {
  CSSSelector = CSSSelector || ''

  var selectedElements = []

  var addElement = function (element) {
    if (selectedElements.indexOf(element) === -1) {
      selectedElements.push(element)
    }
  }

  var selectorParts = ElementQuery.getSelectorParts(CSSSelector)
  selectorParts.forEach(function (selector) {
		// handle special case when parent is selected
    if (selector === '_parent_') {
      $(parentElement).each(function (i, element) {
        addElement(element)
      })
    }		else {
      var elements = $(selector, $(parentElement))
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

var Scraper = function (options) {
  this.queue = options.queue
  this.sitemap = options.sitemap
  this.store = options.store
  this.browser = options.browser
  this.resultWriter = null // db instance for scraped data writing
  this.requestInterval = parseInt(options.requestInterval)
  this.pageLoadDelay = parseInt(options.pageLoadDelay)
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

var Selector = function (selector) {
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
    var elements = ElementQuery(this.selector, parentElement)
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
    dfd.resolve(jQuery.makeArray(elements))

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

    var elements = this.getDataElements(parentElement)

    var result = []
    $(elements).each(function (k, element) {
      var data = {}

      data[this.id] = $(element).attr(this.extractAttribute)
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
    var clickElements = ElementQuery(this.clickElementSelector, parentElement)
    return clickElements
  },

	/**
	 * Check whether element is still reachable from html. Useful to check whether the element is removed from DOM.
	 * @param element
	 */
  isElementInHTML: function (element) {
    return $(element).closest('html').length !== 0
  },

  triggerButtonClick: function (clickElement) {
    var cs = new CssSelector({
      enableSmartTableSelector: false,
      parent: $('body')[0],
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
    var delay = parseInt(this.delay) || 0
    var deferredResponse = jquery.Deferred()
    var foundElements = new UniqueElementList('uniqueText')
    var clickElements = this.getClickElements(parentElement)
    var doneClickingElements = new UniqueElementList(this.getClickElementUniquenessType())

		// add elements that are available before clicking
    var elements = this.getDataElements(parentElement)
    elements.forEach(foundElements.push.bind(foundElements))

		// discard initial elements
    if (this.discardInitialElements) {
      foundElements = new UniqueElementList('uniqueText')
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
        deferredResponse.resolve(jQuery.makeArray(elements))
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

		// cannot reuse this.getDataElements because it depends on *multiple* property
    var elements = $(this.selector, parentElement)

    var records = []
    $(elements).each(function (k, element) {
      var data = {}

      data[this.id] = $(element).text()

      if (this.extractAttribute) {
        data[this.id + '-' + this.extractAttribute] = $(element).attr(this.extractAttribute)
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

    var elements = this.getDataElements(parentElement)

    var result = []
    $(elements).each(function (k, element) {
      var data = {}
      var html = $(element).html()

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
    $(elements).each(function (i, element) {
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

  getTableHeaderRowSelectorFromTableHTML: function (html) {
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

  getTableDataRowSelectorFromTableHTML: function (html) {
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
  getTableHeaderColumnsFromHTML: function (headerRowSelector, html) {
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

var SelectorList = function (selectors) {
  if (selectors === undefined) {
    return
  }

  for (var i = 0; i < selectors.length; i++) {
    this.push(selectors[i])
  }
}

SelectorList.prototype = new Array()

SelectorList.prototype.push = function (selector) {
  if (!this.hasSelector(selector.id)) {
    if (!(selector instanceof Selector)) {
      selector = new Selector(selector)
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
  var resultSelectors = new SelectorList()
  this.forEach(function (selector) {
    if (selector.hasParentSelector(parentSelectorId)) {
      resultSelectors.push(selector)
    }
  })
  return resultSelectors
}

SelectorList.prototype.clone = function () {
  var resultList = new SelectorList()
  this.forEach(function (selector) {
    resultList.push(selector)
  })
  return resultList
}

SelectorList.prototype.fullClone = function () {
  var resultList = new SelectorList()
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
  var resultList = new SelectorList()
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
  var resultList = new SelectorList()
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
var Sitemap = function (sitemapObj) {
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
    this.selectors = new SelectorList(this.selectors)
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
      selector = new Selector(selectorData)
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

var Store = function (config) {
  this.config = config

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
    this.sitemapDb.allDocs({include_docs: true}, function (err, response) {
      var sitemaps = []
      for (var i in response.rows) {
        var sitemap = response.rows[i].doc
        if (!chrome.extension) {
          sitemap = new Sitemap(sitemap)
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
function UniqueElementList (clickElementUniquenessType) {
  this.clickElementUniquenessType = clickElementUniquenessType
  this.addedElements = {}
}

UniqueElementList.prototype = []

UniqueElementList.prototype.push = function (element) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJleHRlbnNpb24vYXNzZXRzL2Jhc2U2NC5qcyIsImV4dGVuc2lvbi9hc3NldHMvanF1ZXJ5LndoZW5jYWxsc2VxdWVudGlhbGx5LmpzIiwiZXh0ZW5zaW9uL2JhY2tncm91bmRfcGFnZS9iYWNrZ3JvdW5kX3NjcmlwdC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL0JhY2tncm91bmRTY3JpcHQuanMiLCJleHRlbnNpb24vc2NyaXB0cy9DaHJvbWVQb3B1cEJyb3dzZXIuanMiLCJleHRlbnNpb24vc2NyaXB0cy9Db25maWcuanMiLCJleHRlbnNpb24vc2NyaXB0cy9FbGVtZW50UXVlcnkuanMiLCJleHRlbnNpb24vc2NyaXB0cy9Kb2IuanMiLCJleHRlbnNpb24vc2NyaXB0cy9RdWV1ZS5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NjcmFwZXIuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9yL1NlbGVjdG9yRWxlbWVudC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9yL1NlbGVjdG9yRWxlbWVudEF0dHJpYnV0ZS5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9yL1NlbGVjdG9yRWxlbWVudENsaWNrLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IvU2VsZWN0b3JFbGVtZW50U2Nyb2xsLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IvU2VsZWN0b3JHcm91cC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9yL1NlbGVjdG9ySFRNTC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9yL1NlbGVjdG9ySW1hZ2UuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckxpbmsuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvclBvcHVwTGluay5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9yL1NlbGVjdG9yVGFibGUuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvclRleHQuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvckxpc3QuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3RvcnMuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TaXRlbWFwLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU3RvcmUuanMiLCJleHRlbnNpb24vc2NyaXB0cy9VbmlxdWVFbGVtZW50TGlzdC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL2dldEJhY2tncm91bmRTY3JpcHQuanMiLCJub2RlX21vZHVsZXMvY3NzLXNlbGVjdG9yL2xpYi9Dc3NTZWxlY3Rvci5qcyIsIm5vZGVfbW9kdWxlcy9qcXVlcnktZGVmZXJyZWQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvanF1ZXJ5LWRlZmVycmVkL2xpYi9qcXVlcnktY2FsbGJhY2tzLmpzIiwibm9kZV9tb2R1bGVzL2pxdWVyeS1kZWZlcnJlZC9saWIvanF1ZXJ5LWNvcmUuanMiLCJub2RlX21vZHVsZXMvanF1ZXJ5LWRlZmVycmVkL2xpYi9qcXVlcnktZGVmZXJyZWQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN2VBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG4vKipcbiAqIEB1cmwgaHR0cDovL2pzcGVyZi5jb20vYmxvYi1iYXNlNjQtY29udmVyc2lvblxuICogQHR5cGUge3tibG9iVG9CYXNlNjQ6IGJsb2JUb0Jhc2U2NCwgYmFzZTY0VG9CbG9iOiBiYXNlNjRUb0Jsb2J9fVxuICovXG52YXIgQmFzZTY0ID0ge1xuXG4gIGJsb2JUb0Jhc2U2NDogZnVuY3Rpb24gKGJsb2IpIHtcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGRhdGFVcmwgPSByZWFkZXIucmVzdWx0XG4gICAgICB2YXIgYmFzZTY0ID0gZGF0YVVybC5zcGxpdCgnLCcpWzFdXG4gICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUoYmFzZTY0KVxuICAgIH1cbiAgICByZWFkZXIucmVhZEFzRGF0YVVSTChibG9iKVxuXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gIH0sXG5cbiAgYmFzZTY0VG9CbG9iOiBmdW5jdGlvbiAoYmFzZTY0LCBtaW1lVHlwZSkge1xuICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgYmluYXJ5ID0gYXRvYihiYXNlNjQpXG4gICAgdmFyIGxlbiA9IGJpbmFyeS5sZW5ndGhcbiAgICB2YXIgYnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKGxlbilcbiAgICB2YXIgdmlldyA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlcilcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB2aWV3W2ldID0gYmluYXJ5LmNoYXJDb2RlQXQoaSlcbiAgICB9XG4gICAgdmFyIGJsb2IgPSBuZXcgQmxvYihbdmlld10sIHt0eXBlOiBtaW1lVHlwZX0pXG4gICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKGJsb2IpXG5cbiAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZS5wcm9taXNlKClcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEJhc2U2NFxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG4vKipcbiAqIEBhdXRob3IgTWFydGlucyBCYWxvZGlzXG4gKlxuICogQW4gYWx0ZXJuYXRpdmUgdmVyc2lvbiBvZiAkLndoZW4gd2hpY2ggY2FuIGJlIHVzZWQgdG8gZXhlY3V0ZSBhc3luY2hyb25vdXNcbiAqIGNhbGxzIHNlcXVlbnRpYWxseSBvbmUgYWZ0ZXIgYW5vdGhlci5cbiAqXG4gKiBAcmV0dXJucyBqcXVlcnlEZWZlcnJlZCgpLnByb21pc2UoKVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHdoZW5DYWxsU2VxdWVudGlhbGx5IChmdW5jdGlvbkNhbGxzKSB7XG4gIHZhciBkZWZlcnJlZFJlc29uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICB2YXIgcmVzdWx0RGF0YSA9IFtdXG5cblx0Ly8gbm90aGluZyB0byBkb1xuICBpZiAoZnVuY3Rpb25DYWxscy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gZGVmZXJyZWRSZXNvbnNlLnJlc29sdmUocmVzdWx0RGF0YSkucHJvbWlzZSgpXG4gIH1cblxuICB2YXIgY3VycmVudERlZmVycmVkID0gZnVuY3Rpb25DYWxscy5zaGlmdCgpKClcblx0Ly8gZXhlY3V0ZSBzeW5jaHJvbm91cyBjYWxscyBzeW5jaHJvbm91c2x5XG4gIHdoaWxlIChjdXJyZW50RGVmZXJyZWQuc3RhdGUoKSA9PT0gJ3Jlc29sdmVkJykge1xuICAgIGN1cnJlbnREZWZlcnJlZC5kb25lKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICByZXN1bHREYXRhLnB1c2goZGF0YSlcbiAgICB9KVxuICAgIGlmIChmdW5jdGlvbkNhbGxzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGRlZmVycmVkUmVzb25zZS5yZXNvbHZlKHJlc3VsdERhdGEpLnByb21pc2UoKVxuICAgIH1cbiAgICBjdXJyZW50RGVmZXJyZWQgPSBmdW5jdGlvbkNhbGxzLnNoaWZ0KCkoKVxuICB9XG5cblx0Ly8gaGFuZGxlIGFzeW5jIGNhbGxzXG4gIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcblx0XHQvLyBoYW5kbGUgbWl4ZWQgc3luYyBjYWxsc1xuICAgIHdoaWxlIChjdXJyZW50RGVmZXJyZWQuc3RhdGUoKSA9PT0gJ3Jlc29sdmVkJykge1xuICAgICAgY3VycmVudERlZmVycmVkLmRvbmUoZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgcmVzdWx0RGF0YS5wdXNoKGRhdGEpXG4gICAgICB9KVxuICAgICAgaWYgKGZ1bmN0aW9uQ2FsbHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpXG4gICAgICAgIGRlZmVycmVkUmVzb25zZS5yZXNvbHZlKHJlc3VsdERhdGEpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjdXJyZW50RGVmZXJyZWQgPSBmdW5jdGlvbkNhbGxzLnNoaWZ0KCkoKVxuICAgIH1cbiAgfSwgMTApXG5cbiAgcmV0dXJuIGRlZmVycmVkUmVzb25zZS5wcm9taXNlKClcbn1cbiIsInZhciBDb25maWcgPSByZXF1aXJlKCcuLi9zY3JpcHRzL0NvbmZpZycpXG52YXIgU3RvcmUgPSByZXF1aXJlKCcuLi9zY3JpcHRzL1N0b3JlJylcbnZhciBTaXRlbWFwID0gcmVxdWlyZSgnLi4vc2NyaXB0cy9TaXRlbWFwJylcbnZhciBRdWV1ZSA9IHJlcXVpcmUoJy4uL3NjcmlwdHMvUXVldWUnKVxudmFyIFNjcmFwZXIgPSByZXF1aXJlKCcuLi9zY3JpcHRzL1NjcmFwZXInKVxudmFyIENocm9tZVBvcHVwQnJvd3NlciA9IHJlcXVpcmUoJy4uL3NjcmlwdHMvQ2hyb21lUG9wdXBCcm93c2VyJylcbnZhciBnZXRCYWNrZ3JvdW5kU2NyaXB0ID0gcmVxdWlyZSgnLi4vc2NyaXB0cy9nZXRCYWNrZ3JvdW5kU2NyaXB0JylcblxudmFyIGNvbmZpZyA9IG5ldyBDb25maWcoKVxudmFyIHN0b3JlXG5jb25maWcubG9hZENvbmZpZ3VyYXRpb24oZnVuY3Rpb24gKCkge1xuICBjb25zb2xlLmxvZygnaW5pdGlhbCBjb25maWd1cmF0aW9uJywgY29uZmlnKVxuICBzdG9yZSA9IG5ldyBTdG9yZShjb25maWcpXG59KVxuXG5jaHJvbWUuc3RvcmFnZS5vbkNoYW5nZWQuYWRkTGlzdGVuZXIoZnVuY3Rpb24gKCkge1xuICBjb25maWcubG9hZENvbmZpZ3VyYXRpb24oZnVuY3Rpb24gKCkge1xuICAgIGNvbnNvbGUubG9nKCdjb25maWd1cmF0aW9uIGNoYW5nZWQnLCBjb25maWcpXG4gICAgc3RvcmUgPSBuZXcgU3RvcmUoY29uZmlnKVxuICB9KVxufSlcblxudmFyIHNlbmRUb0FjdGl2ZVRhYiA9IGZ1bmN0aW9uIChyZXF1ZXN0LCBjYWxsYmFjaykge1xuICBjaHJvbWUudGFicy5xdWVyeSh7XG4gICAgYWN0aXZlOiB0cnVlLFxuICAgIGN1cnJlbnRXaW5kb3c6IHRydWVcbiAgfSwgZnVuY3Rpb24gKHRhYnMpIHtcbiAgICBpZiAodGFicy5sZW5ndGggPCAxKSB7XG4gICAgICB0aGlzLmNvbnNvbGUubG9nKFwiY291bGRuJ3QgZmluZCBhY3RpdmUgdGFiXCIpXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciB0YWIgPSB0YWJzWzBdXG4gICAgICBjaHJvbWUudGFicy5zZW5kTWVzc2FnZSh0YWIuaWQsIHJlcXVlc3QsIGNhbGxiYWNrKVxuICAgIH1cbiAgfSlcbn1cblxuY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKFxuXHRmdW5jdGlvbiAocmVxdWVzdCwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpIHtcbiAgY29uc29sZS5sb2coJ2Nocm9tZS5ydW50aW1lLm9uTWVzc2FnZScsIHJlcXVlc3QpXG5cbiAgaWYgKHJlcXVlc3QuY3JlYXRlU2l0ZW1hcCkge1xuICAgIHN0b3JlLmNyZWF0ZVNpdGVtYXAocmVxdWVzdC5zaXRlbWFwLCBzZW5kUmVzcG9uc2UpXG4gICAgcmV0dXJuIHRydWVcbiAgfSBlbHNlIGlmIChyZXF1ZXN0LnNhdmVTaXRlbWFwKSB7XG4gICAgc3RvcmUuc2F2ZVNpdGVtYXAocmVxdWVzdC5zaXRlbWFwLCBzZW5kUmVzcG9uc2UpXG4gICAgcmV0dXJuIHRydWVcbiAgfSBlbHNlIGlmIChyZXF1ZXN0LmRlbGV0ZVNpdGVtYXApIHtcbiAgICBzdG9yZS5kZWxldGVTaXRlbWFwKHJlcXVlc3Quc2l0ZW1hcCwgc2VuZFJlc3BvbnNlKVxuICAgIHJldHVybiB0cnVlXG4gIH0gZWxzZSBpZiAocmVxdWVzdC5nZXRBbGxTaXRlbWFwcykge1xuICAgIHN0b3JlLmdldEFsbFNpdGVtYXBzKHNlbmRSZXNwb25zZSlcbiAgICByZXR1cm4gdHJ1ZVxuICB9IGVsc2UgaWYgKHJlcXVlc3Quc2l0ZW1hcEV4aXN0cykge1xuICAgIHN0b3JlLnNpdGVtYXBFeGlzdHMocmVxdWVzdC5zaXRlbWFwSWQsIHNlbmRSZXNwb25zZSlcbiAgICByZXR1cm4gdHJ1ZVxuICB9IGVsc2UgaWYgKHJlcXVlc3QuZ2V0U2l0ZW1hcERhdGEpIHtcbiAgICBzdG9yZS5nZXRTaXRlbWFwRGF0YShuZXcgU2l0ZW1hcChyZXF1ZXN0LnNpdGVtYXApLCBzZW5kUmVzcG9uc2UpXG4gICAgcmV0dXJuIHRydWVcbiAgfSBlbHNlIGlmIChyZXF1ZXN0LnNjcmFwZVNpdGVtYXApIHtcbiAgICB2YXIgc2l0ZW1hcCA9IG5ldyBTaXRlbWFwKHJlcXVlc3Quc2l0ZW1hcClcbiAgICB2YXIgcXVldWUgPSBuZXcgUXVldWUoKVxuICAgIHZhciBicm93c2VyID0gbmV3IENocm9tZVBvcHVwQnJvd3Nlcih7XG4gICAgICBwYWdlTG9hZERlbGF5OiByZXF1ZXN0LnBhZ2VMb2FkRGVsYXlcbiAgICB9KVxuXG4gICAgdmFyIHNjcmFwZXIgPSBuZXcgU2NyYXBlcih7XG4gICAgICBxdWV1ZTogcXVldWUsXG4gICAgICBzaXRlbWFwOiBzaXRlbWFwLFxuICAgICAgYnJvd3NlcjogYnJvd3NlcixcbiAgICAgIHN0b3JlOiBzdG9yZSxcbiAgICAgIHJlcXVlc3RJbnRlcnZhbDogcmVxdWVzdC5yZXF1ZXN0SW50ZXJ2YWxcbiAgICB9KVxuXG4gICAgdHJ5IHtcbiAgICAgIHNjcmFwZXIucnVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgYnJvd3Nlci5jbG9zZSgpXG4gICAgICAgIHZhciBub3RpZmljYXRpb24gPSBjaHJvbWUubm90aWZpY2F0aW9ucy5jcmVhdGUoJ3NjcmFwaW5nLWZpbmlzaGVkJywge1xuICAgICAgICAgIHR5cGU6ICdiYXNpYycsXG4gICAgICAgICAgaWNvblVybDogJ2Fzc2V0cy9pbWFnZXMvaWNvbjEyOC5wbmcnLFxuICAgICAgICAgIHRpdGxlOiAnU2NyYXBpbmcgZmluaXNoZWQhJyxcbiAgICAgICAgICBtZXNzYWdlOiAnRmluaXNoZWQgc2NyYXBpbmcgJyArIHNpdGVtYXAuX2lkXG4gICAgICAgIH0sIGZ1bmN0aW9uIChpZCkge1xuXHRcdFx0XHRcdFx0Ly8gbm90aWZpY2F0aW9uIHNob3dlZFxuICAgICAgICB9KVxuICAgICAgICBzZW5kUmVzcG9uc2UoKVxuICAgICAgfSlcbiAgICB9XHRcdFx0Y2F0Y2ggKGUpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdTY3JhcGVyIGV4ZWN1dGlvbiBjYW5jZWxsZWQnLmUpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWVcbiAgfSBlbHNlIGlmIChyZXF1ZXN0LnByZXZpZXdTZWxlY3RvckRhdGEpIHtcbiAgICBjaHJvbWUudGFicy5xdWVyeSh7XG4gICAgICBhY3RpdmU6IHRydWUsXG4gICAgICBjdXJyZW50V2luZG93OiB0cnVlXG4gICAgfSwgZnVuY3Rpb24gKHRhYnMpIHtcbiAgICAgIGlmICh0YWJzLmxlbmd0aCA8IDEpIHtcbiAgICAgICAgdGhpcy5jb25zb2xlLmxvZyhcImNvdWxkbid0IGZpbmQgYWN0aXZlIHRhYlwiKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHRhYiA9IHRhYnNbMF1cbiAgICAgICAgY2hyb21lLnRhYnMuc2VuZE1lc3NhZ2UodGFiLmlkLCByZXF1ZXN0LCBzZW5kUmVzcG9uc2UpXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gdHJ1ZVxuICB9IGVsc2UgaWYgKHJlcXVlc3QuYmFja2dyb3VuZFNjcmlwdENhbGwpIHtcbiAgICB2YXIgYmFja2dyb3VuZFNjcmlwdCA9IGdldEJhY2tncm91bmRTY3JpcHQoJ0JhY2tncm91bmRTY3JpcHQnKVxuICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0gYmFja2dyb3VuZFNjcmlwdFtyZXF1ZXN0LmZuXShyZXF1ZXN0LnJlcXVlc3QpXG4gICAgZGVmZXJyZWRSZXNwb25zZS5kb25lKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgc2VuZFJlc3BvbnNlKHJlc3BvbnNlKVxuICAgIH0pXG5cbiAgICByZXR1cm4gdHJ1ZVxuICB9XG59XG4pXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbi8qKlxuICogQ29udGVudFNjcmlwdCB0aGF0IGNhbiBiZSBjYWxsZWQgZnJvbSBhbnl3aGVyZSB3aXRoaW4gdGhlIGV4dGVuc2lvblxuICovXG52YXIgQmFja2dyb3VuZFNjcmlwdCA9IHtcblxuICBkdW1teTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBqcXVlcnkuRGVmZXJyZWQoKS5yZXNvbHZlKCdkdW1teScpLnByb21pc2UoKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIHRoZSBpZCBvZiB0aGUgdGFiIHRoYXQgaXMgdmlzaWJsZSB0byB1c2VyXG5cdCAqIEByZXR1cm5zIGpxdWVyeS5EZWZlcnJlZCgpIGludGVnZXJcblx0ICovXG4gIGdldEFjdGl2ZVRhYklkOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgY2hyb21lLnRhYnMucXVlcnkoe1xuICAgICAgYWN0aXZlOiB0cnVlLFxuICAgICAgY3VycmVudFdpbmRvdzogdHJ1ZVxuICAgIH0sIGZ1bmN0aW9uICh0YWJzKSB7XG4gICAgICBpZiAodGFicy5sZW5ndGggPCAxKSB7XG5cdFx0XHRcdC8vIEBUT0RPIG11c3QgYmUgcnVubmluZyB3aXRoaW4gcG9wdXAuIG1heWJlIGZpbmQgYW5vdGhlciBhY3RpdmUgd2luZG93P1xuICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlamVjdChcImNvdWxkbid0IGZpbmQgdGhlIGFjdGl2ZSB0YWJcIilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB0YWJJZCA9IHRhYnNbMF0uaWRcbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKHRhYklkKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gIH0sXG5cblx0LyoqXG5cdCAqIEV4ZWN1dGUgYSBmdW5jdGlvbiB3aXRoaW4gdGhlIGFjdGl2ZSB0YWIgd2l0aGluIGNvbnRlbnQgc2NyaXB0XG5cdCAqIEBwYXJhbSByZXF1ZXN0LmZuXHRmdW5jdGlvbiB0byBjYWxsXG5cdCAqIEBwYXJhbSByZXF1ZXN0LnJlcXVlc3RcdHJlcXVlc3QgdGhhdCB3aWxsIGJlIHBhc3NlZCB0byB0aGUgZnVuY3Rpb25cblx0ICovXG4gIGV4ZWN1dGVDb250ZW50U2NyaXB0OiBmdW5jdGlvbiAocmVxdWVzdCkge1xuICAgIHZhciByZXFUb0NvbnRlbnRTY3JpcHQgPSB7XG4gICAgICBjb250ZW50U2NyaXB0Q2FsbDogdHJ1ZSxcbiAgICAgIGZuOiByZXF1ZXN0LmZuLFxuICAgICAgcmVxdWVzdDogcmVxdWVzdC5yZXF1ZXN0XG4gICAgfVxuICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgZGVmZXJyZWRBY3RpdmVUYWJJZCA9IHRoaXMuZ2V0QWN0aXZlVGFiSWQoKVxuICAgIGRlZmVycmVkQWN0aXZlVGFiSWQuZG9uZShmdW5jdGlvbiAodGFiSWQpIHtcbiAgICAgIGNocm9tZS50YWJzLnNlbmRNZXNzYWdlKHRhYklkLCByZXFUb0NvbnRlbnRTY3JpcHQsIGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUocmVzcG9uc2UpXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQmFja2dyb3VuZFNjcmlwdFxuIiwidmFyIENocm9tZVBvcHVwQnJvd3NlciA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIHRoaXMucGFnZUxvYWREZWxheSA9IG9wdGlvbnMucGFnZUxvYWREZWxheVxuXG5cdC8vIEBUT0RPIHNvbWVob3cgaGFuZGxlIHRoZSBjbG9zZWQgd2luZG93XG59XG5cbkNocm9tZVBvcHVwQnJvd3Nlci5wcm90b3R5cGUgPSB7XG5cbiAgX2luaXRQb3B1cFdpbmRvdzogZnVuY3Rpb24gKGNhbGxiYWNrLCBzY29wZSkge1xuICAgIHZhciBicm93c2VyID0gdGhpc1xuICAgIGlmICh0aGlzLndpbmRvdyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeSh0aGlzLndpbmRvdykpXG5cdFx0XHQvLyBjaGVjayBpZiB0YWIgZXhpc3RzXG4gICAgICBjaHJvbWUudGFicy5nZXQodGhpcy50YWIuaWQsIGZ1bmN0aW9uICh0YWIpIHtcbiAgICAgICAgaWYgKCF0YWIpIHtcbiAgICAgICAgICB0aHJvdyAnU2NyYXBpbmcgd2luZG93IGNsb3NlZCdcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgY2FsbGJhY2suY2FsbChzY29wZSlcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNocm9tZS53aW5kb3dzLmNyZWF0ZSh7J3R5cGUnOiAncG9wdXAnLCB3aWR0aDogMTA0MiwgaGVpZ2h0OiA3NjgsIGZvY3VzZWQ6IHRydWUsIHVybDogJ2Nocm9tZTovL25ld3RhYid9LCBmdW5jdGlvbiAod2luZG93KSB7XG4gICAgICBicm93c2VyLndpbmRvdyA9IHdpbmRvd1xuICAgICAgYnJvd3Nlci50YWIgPSB3aW5kb3cudGFic1swXVxuXG4gICAgICBjYWxsYmFjay5jYWxsKHNjb3BlKVxuICAgIH0pXG4gIH0sXG5cbiAgbG9hZFVybDogZnVuY3Rpb24gKHVybCwgY2FsbGJhY2spIHtcbiAgICB2YXIgdGFiID0gdGhpcy50YWJcblxuICAgIHZhciB0YWJMb2FkTGlzdGVuZXIgPSBmdW5jdGlvbiAodGFiSWQsIGNoYW5nZUluZm8sIHRhYikge1xuICAgICAgaWYgKHRhYklkID09PSB0aGlzLnRhYi5pZCkge1xuICAgICAgICBpZiAoY2hhbmdlSW5mby5zdGF0dXMgPT09ICdjb21wbGV0ZScpIHtcblx0XHRcdFx0XHQvLyBAVE9ETyBjaGVjayB1cmwgPyBtYXliZSBpdCB3b3VsZCBiZSBiYWQgYmVjYXVzZSBzb21lIHNpdGVzIG1pZ2h0IHVzZSByZWRpcmVjdHNcblxuXHRcdFx0XHRcdC8vIHJlbW92ZSBldmVudCBsaXN0ZW5lclxuICAgICAgICAgIGNocm9tZS50YWJzLm9uVXBkYXRlZC5yZW1vdmVMaXN0ZW5lcih0YWJMb2FkTGlzdGVuZXIpXG5cblx0XHRcdFx0XHQvLyBjYWxsYmFjayB0YWIgaXMgbG9hZGVkIGFmdGVyIHBhZ2UgbG9hZCBkZWxheVxuICAgICAgICAgIHNldFRpbWVvdXQoY2FsbGJhY2ssIHRoaXMucGFnZUxvYWREZWxheSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKVxuICAgIGNocm9tZS50YWJzLm9uVXBkYXRlZC5hZGRMaXN0ZW5lcih0YWJMb2FkTGlzdGVuZXIpXG5cbiAgICBjaHJvbWUudGFicy51cGRhdGUodGFiLmlkLCB7dXJsOiB1cmx9KVxuICB9LFxuXG4gIGNsb3NlOiBmdW5jdGlvbiAoKSB7XG4gICAgY2hyb21lLndpbmRvd3MucmVtb3ZlKHRoaXMud2luZG93LmlkKVxuICB9LFxuXG4gIGZldGNoRGF0YTogZnVuY3Rpb24gKHVybCwgc2l0ZW1hcCwgcGFyZW50U2VsZWN0b3JJZCwgY2FsbGJhY2ssIHNjb3BlKSB7XG4gICAgdmFyIGJyb3dzZXIgPSB0aGlzXG5cbiAgICB0aGlzLl9pbml0UG9wdXBXaW5kb3coZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHRhYiA9IGJyb3dzZXIudGFiXG4gICAgICBjb25zb2xlLmxvZygnSW5pdCBicm93c2VyIGFwcCcpXG4gICAgICBicm93c2VyLmxvYWRVcmwodXJsLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBtZXNzYWdlID0ge1xuICAgICAgICAgIGV4dHJhY3REYXRhOiB0cnVlLFxuICAgICAgICAgIHNpdGVtYXA6IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoc2l0ZW1hcCkpLFxuICAgICAgICAgIHBhcmVudFNlbGVjdG9ySWQ6IHBhcmVudFNlbGVjdG9ySWRcbiAgICAgICAgfVxuXG4gICAgICAgIGNocm9tZS50YWJzLnNlbmRNZXNzYWdlKHRhYi5pZCwgbWVzc2FnZSwgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnZXh0cmFjdGVkIGRhdGEgZnJvbSB3ZWIgcGFnZScsIGRhdGEpXG4gICAgICAgICAgY2FsbGJhY2suY2FsbChzY29wZSwgZGF0YSlcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSwgdGhpcylcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENocm9tZVBvcHVwQnJvd3NlclxuIiwidmFyIENvbmZpZyA9IGZ1bmN0aW9uICgpIHtcblxufVxuXG5Db25maWcucHJvdG90eXBlID0ge1xuXG4gIHNpdGVtYXBEYjogJzx1c2UgbG9hZENvbmZpZ3VyYXRpb24oKT4nLFxuICBkYXRhRGI6ICc8dXNlIGxvYWRDb25maWd1cmF0aW9uKCk+JyxcblxuICBkZWZhdWx0czoge1xuICAgIHN0b3JhZ2VUeXBlOiAnbG9jYWwnLFxuXHRcdC8vIHRoaXMgaXMgd2hlcmUgc2l0ZW1hcCBkb2N1bWVudHMgYXJlIHN0b3JlZFxuICAgIHNpdGVtYXBEYjogJ3NjcmFwZXItc2l0ZW1hcHMnLFxuXHRcdC8vIHRoaXMgaXMgd2hlcmUgc2NyYXBlZCBkYXRhIGlzIHN0b3JlZC5cblx0XHQvLyBlbXB0eSBmb3IgbG9jYWwgc3RvcmFnZVxuICAgIGRhdGFEYjogJydcbiAgfSxcblxuXHQvKipcblx0ICogTG9hZHMgY29uZmlndXJhdGlvbiBmcm9tIGNocm9tZSBleHRlbnNpb24gc3luYyBzdG9yYWdlXG5cdCAqL1xuICBsb2FkQ29uZmlndXJhdGlvbjogZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgY2hyb21lLnN0b3JhZ2Uuc3luYy5nZXQoWydzaXRlbWFwRGInLCAnZGF0YURiJywgJ3N0b3JhZ2VUeXBlJ10sIGZ1bmN0aW9uIChpdGVtcykge1xuICAgICAgdGhpcy5zdG9yYWdlVHlwZSA9IGl0ZW1zLnN0b3JhZ2VUeXBlIHx8IHRoaXMuZGVmYXVsdHMuc3RvcmFnZVR5cGVcbiAgICAgIGlmICh0aGlzLnN0b3JhZ2VUeXBlID09PSAnbG9jYWwnKSB7XG4gICAgICAgIHRoaXMuc2l0ZW1hcERiID0gdGhpcy5kZWZhdWx0cy5zaXRlbWFwRGJcbiAgICAgICAgdGhpcy5kYXRhRGIgPSB0aGlzLmRlZmF1bHRzLmRhdGFEYlxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5zaXRlbWFwRGIgPSBpdGVtcy5zaXRlbWFwRGIgfHwgdGhpcy5kZWZhdWx0cy5zaXRlbWFwRGJcbiAgICAgICAgdGhpcy5kYXRhRGIgPSBpdGVtcy5kYXRhRGIgfHwgdGhpcy5kZWZhdWx0cy5kYXRhRGJcbiAgICAgIH1cblxuICAgICAgY2FsbGJhY2soKVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcblxuXHQvKipcblx0ICogU2F2ZXMgY29uZmlndXJhdGlvbiB0byBjaHJvbWUgZXh0ZW5zaW9uIHN5bmMgc3RvcmFnZVxuXHQgKiBAcGFyYW0ge3R5cGV9IGl0ZW1zXG5cdCAqIEBwYXJhbSB7dHlwZX0gY2FsbGJhY2tcblx0ICogQHJldHVybnMge3VuZGVmaW5lZH1cblx0ICovXG4gIHVwZGF0ZUNvbmZpZ3VyYXRpb246IGZ1bmN0aW9uIChpdGVtcywgY2FsbGJhY2spIHtcbiAgICBjaHJvbWUuc3RvcmFnZS5zeW5jLnNldChpdGVtcywgY2FsbGJhY2spXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDb25maWdcbiIsIi8qKlxuICogRWxlbWVudCBzZWxlY3Rvci4gVXNlcyBqUXVlcnkgYXMgYmFzZSBhbmQgYWRkcyBzb21lIG1vcmUgZmVhdHVyZXNcbiAqIEBwYXJhbSBwYXJlbnRFbGVtZW50XG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqL1xudmFyIEVsZW1lbnRRdWVyeSA9IGZ1bmN0aW9uIChDU1NTZWxlY3RvciwgcGFyZW50RWxlbWVudCkge1xuICBDU1NTZWxlY3RvciA9IENTU1NlbGVjdG9yIHx8ICcnXG5cbiAgdmFyIHNlbGVjdGVkRWxlbWVudHMgPSBbXVxuXG4gIHZhciBhZGRFbGVtZW50ID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICBpZiAoc2VsZWN0ZWRFbGVtZW50cy5pbmRleE9mKGVsZW1lbnQpID09PSAtMSkge1xuICAgICAgc2VsZWN0ZWRFbGVtZW50cy5wdXNoKGVsZW1lbnQpXG4gICAgfVxuICB9XG5cbiAgdmFyIHNlbGVjdG9yUGFydHMgPSBFbGVtZW50UXVlcnkuZ2V0U2VsZWN0b3JQYXJ0cyhDU1NTZWxlY3RvcilcbiAgc2VsZWN0b3JQYXJ0cy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuXHRcdC8vIGhhbmRsZSBzcGVjaWFsIGNhc2Ugd2hlbiBwYXJlbnQgaXMgc2VsZWN0ZWRcbiAgICBpZiAoc2VsZWN0b3IgPT09ICdfcGFyZW50XycpIHtcbiAgICAgICQocGFyZW50RWxlbWVudCkuZWFjaChmdW5jdGlvbiAoaSwgZWxlbWVudCkge1xuICAgICAgICBhZGRFbGVtZW50KGVsZW1lbnQpXG4gICAgICB9KVxuICAgIH1cdFx0ZWxzZSB7XG4gICAgICB2YXIgZWxlbWVudHMgPSAkKHNlbGVjdG9yLCAkKHBhcmVudEVsZW1lbnQpKVxuICAgICAgZWxlbWVudHMuZWFjaChmdW5jdGlvbiAoaSwgZWxlbWVudCkge1xuICAgICAgICBhZGRFbGVtZW50KGVsZW1lbnQpXG4gICAgICB9KVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gc2VsZWN0ZWRFbGVtZW50c1xufVxuXG5FbGVtZW50UXVlcnkuZ2V0U2VsZWN0b3JQYXJ0cyA9IGZ1bmN0aW9uIChDU1NTZWxlY3Rvcikge1xuICB2YXIgc2VsZWN0b3JzID0gQ1NTU2VsZWN0b3Iuc3BsaXQoLygsfFwiLio/XCJ8Jy4qPyd8XFwoLio/XFwpKS8pXG5cbiAgdmFyIHJlc3VsdFNlbGVjdG9ycyA9IFtdXG4gIHZhciBjdXJyZW50U2VsZWN0b3IgPSAnJ1xuICBzZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICBpZiAoc2VsZWN0b3IgPT09ICcsJykge1xuICAgICAgaWYgKGN1cnJlbnRTZWxlY3Rvci50cmltKCkubGVuZ3RoKSB7XG4gICAgICAgIHJlc3VsdFNlbGVjdG9ycy5wdXNoKGN1cnJlbnRTZWxlY3Rvci50cmltKCkpXG4gICAgICB9XG4gICAgICBjdXJyZW50U2VsZWN0b3IgPSAnJ1xuICAgIH1cdFx0ZWxzZSB7XG4gICAgICBjdXJyZW50U2VsZWN0b3IgKz0gc2VsZWN0b3JcbiAgICB9XG4gIH0pXG4gIGlmIChjdXJyZW50U2VsZWN0b3IudHJpbSgpLmxlbmd0aCkge1xuICAgIHJlc3VsdFNlbGVjdG9ycy5wdXNoKGN1cnJlbnRTZWxlY3Rvci50cmltKCkpXG4gIH1cblxuICByZXR1cm4gcmVzdWx0U2VsZWN0b3JzXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRWxlbWVudFF1ZXJ5XG4iLCJcbnZhciBKb2IgPSBmdW5jdGlvbiAodXJsLCBwYXJlbnRTZWxlY3Rvciwgc2NyYXBlciwgcGFyZW50Sm9iLCBiYXNlRGF0YSkge1xuICBpZiAocGFyZW50Sm9iICE9PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzLnVybCA9IHRoaXMuY29tYmluZVVybHMocGFyZW50Sm9iLnVybCwgdXJsKVxuICB9IGVsc2Uge1xuICAgIHRoaXMudXJsID0gdXJsXG4gIH1cbiAgdGhpcy5wYXJlbnRTZWxlY3RvciA9IHBhcmVudFNlbGVjdG9yXG4gIHRoaXMuc2NyYXBlciA9IHNjcmFwZXJcbiAgdGhpcy5kYXRhSXRlbXMgPSBbXVxuICB0aGlzLmJhc2VEYXRhID0gYmFzZURhdGEgfHwge31cbn1cblxuSm9iLnByb3RvdHlwZSA9IHtcblxuICBjb21iaW5lVXJsczogZnVuY3Rpb24gKHBhcmVudFVybCwgY2hpbGRVcmwpIHtcbiAgICB2YXIgdXJsTWF0Y2hlciA9IG5ldyBSZWdFeHAoJyhodHRwcz86Ly8pPyhbYS16MC05XFxcXC1cXFxcLl0rXFxcXC5bYS16MC05XFxcXC1dKyg6XFxcXGQrKT98XFxcXGR7MSwzfVxcXFwuXFxcXGR7MSwzfVxcXFwuXFxcXGR7MSwzfVxcXFwuXFxcXGR7MSwzfSg6XFxcXGQrKT8pPyhcXFxcL1teXFxcXD9dKlxcXFwvfFxcXFwvKT8oW15cXFxcP10qKT8oXFxcXD8uKik/JywgJ2knKVxuXG4gICAgdmFyIHBhcmVudE1hdGNoZXMgPSBwYXJlbnRVcmwubWF0Y2godXJsTWF0Y2hlcilcbiAgICB2YXIgY2hpbGRNYXRjaGVzID0gY2hpbGRVcmwubWF0Y2godXJsTWF0Y2hlcilcblxuXHRcdC8vIHNwZWNpYWwgY2FzZSBmb3IgdXJscyBsaWtlIHRoaXM6ID9hPTEgIG9yIGxpa2UtdGhpcy9cbiAgICBpZiAoY2hpbGRNYXRjaGVzWzFdID09PSB1bmRlZmluZWQgJiYgY2hpbGRNYXRjaGVzWzJdID09PSB1bmRlZmluZWQgJiYgY2hpbGRNYXRjaGVzWzVdID09PSB1bmRlZmluZWQgJiYgY2hpbGRNYXRjaGVzWzZdID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHZhciB1cmwgPSBwYXJlbnRNYXRjaGVzWzFdICsgcGFyZW50TWF0Y2hlc1syXSArIHBhcmVudE1hdGNoZXNbNV0gKyBwYXJlbnRNYXRjaGVzWzZdICsgY2hpbGRNYXRjaGVzWzddXG4gICAgICByZXR1cm4gdXJsXG4gICAgfVxuXG4gICAgaWYgKGNoaWxkTWF0Y2hlc1sxXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjaGlsZE1hdGNoZXNbMV0gPSBwYXJlbnRNYXRjaGVzWzFdXG4gICAgfVxuICAgIGlmIChjaGlsZE1hdGNoZXNbMl0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgY2hpbGRNYXRjaGVzWzJdID0gcGFyZW50TWF0Y2hlc1syXVxuICAgIH1cbiAgICBpZiAoY2hpbGRNYXRjaGVzWzVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmIChwYXJlbnRNYXRjaGVzWzVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY2hpbGRNYXRjaGVzWzVdID0gJy8nXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjaGlsZE1hdGNoZXNbNV0gPSBwYXJlbnRNYXRjaGVzWzVdXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNoaWxkTWF0Y2hlc1s2XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjaGlsZE1hdGNoZXNbNl0gPSAnJ1xuICAgIH1cbiAgICBpZiAoY2hpbGRNYXRjaGVzWzddID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGNoaWxkTWF0Y2hlc1s3XSA9ICcnXG4gICAgfVxuXG4gICAgcmV0dXJuIGNoaWxkTWF0Y2hlc1sxXSArIGNoaWxkTWF0Y2hlc1syXSArIGNoaWxkTWF0Y2hlc1s1XSArIGNoaWxkTWF0Y2hlc1s2XSArIGNoaWxkTWF0Y2hlc1s3XVxuICB9LFxuXG4gIGV4ZWN1dGU6IGZ1bmN0aW9uIChicm93c2VyLCBjYWxsYmFjaywgc2NvcGUpIHtcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc2NyYXBlci5zaXRlbWFwXG4gICAgdmFyIGpvYiA9IHRoaXNcbiAgICBjb25zb2xlLmxvZygnc3RhcnRpbmcgZmV0Y2hpbmcnKVxuICAgIGJyb3dzZXIuZmV0Y2hEYXRhKHRoaXMudXJsLCBzaXRlbWFwLCB0aGlzLnBhcmVudFNlbGVjdG9yLCBmdW5jdGlvbiAocmVzdWx0cykge1xuICAgICAgY29uc29sZS5sb2coJ2ZpbmlzaGVkIGZldGNoaW5nJylcblx0XHRcdC8vIG1lcmdlIGRhdGEgd2l0aCBkYXRhIGZyb20gaW5pdGlhbGl6YXRpb25cbiAgICAgIGZvciAodmFyIGkgaW4gcmVzdWx0cykge1xuICAgICAgICB2YXIgcmVzdWx0ID0gcmVzdWx0c1tpXVxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdGhpcy5iYXNlRGF0YSkge1xuICAgICAgICAgIGlmICghKGtleSBpbiByZXN1bHQpKSB7XG4gICAgICAgICAgICByZXN1bHRba2V5XSA9IHRoaXMuYmFzZURhdGFba2V5XVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLmRhdGFJdGVtcy5wdXNoKHJlc3VsdClcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKGpvYilcbiAgICB9LmJpbmQodGhpcyksIHRoaXMpXG4gIH0sXG4gIGdldFJlc3VsdHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5kYXRhSXRlbXNcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEpvYlxuIiwiXG52YXIgUXVldWUgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuam9icyA9IFtdXG4gIHRoaXMuc2NyYXBlZFVybHMgPSB7fVxufVxuXG5RdWV1ZS5wcm90b3R5cGUgPSB7XG5cblx0LyoqXG5cdCAqIFJldHVybnMgZmFsc2UgaWYgcGFnZSBpcyBhbHJlYWR5IHNjcmFwZWRcblx0ICogQHBhcmFtIGpvYlxuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICovXG4gIGFkZDogZnVuY3Rpb24gKGpvYikge1xuICAgIGlmICh0aGlzLmNhbkJlQWRkZWQoam9iKSkge1xuICAgICAgdGhpcy5qb2JzLnB1c2goam9iKVxuICAgICAgdGhpcy5fc2V0VXJsU2NyYXBlZChqb2IudXJsKVxuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQmVBZGRlZDogZnVuY3Rpb24gKGpvYikge1xuICAgIGlmICh0aGlzLmlzU2NyYXBlZChqb2IudXJsKSkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG5cdFx0Ly8gcmVqZWN0IGRvY3VtZW50c1xuICAgIGlmIChqb2IudXJsLm1hdGNoKC9cXC4oZG9jfGRvY3h8cGRmfHBwdHxwcHR4fG9kdCkkL2kpICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBnZXRRdWV1ZVNpemU6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5qb2JzLmxlbmd0aFxuICB9LFxuXG4gIGlzU2NyYXBlZDogZnVuY3Rpb24gKHVybCkge1xuICAgIHJldHVybiAodGhpcy5zY3JhcGVkVXJsc1t1cmxdICE9PSB1bmRlZmluZWQpXG4gIH0sXG5cbiAgX3NldFVybFNjcmFwZWQ6IGZ1bmN0aW9uICh1cmwpIHtcbiAgICB0aGlzLnNjcmFwZWRVcmxzW3VybF0gPSB0cnVlXG4gIH0sXG5cbiAgZ2V0TmV4dEpvYjogZnVuY3Rpb24gKCkge1xuXHRcdC8vIEBUT0RPIHRlc3QgdGhpc1xuICAgIGlmICh0aGlzLmdldFF1ZXVlU2l6ZSgpID4gMCkge1xuICAgICAgcmV0dXJuIHRoaXMuam9icy5wb3AoKVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBRdWV1ZVxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgd2hlbkNhbGxTZXF1ZW50aWFsbHkgPSByZXF1aXJlKCcuLi9hc3NldHMvanF1ZXJ5LndoZW5jYWxsc2VxdWVudGlhbGx5JylcbnZhciBCYXNlNjQgPSByZXF1aXJlKCcuLi9hc3NldHMvYmFzZTY0JylcbnZhciBKb2IgPSByZXF1aXJlKCcuL0pvYicpXG5cbnZhciBTY3JhcGVyID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgdGhpcy5xdWV1ZSA9IG9wdGlvbnMucXVldWVcbiAgdGhpcy5zaXRlbWFwID0gb3B0aW9ucy5zaXRlbWFwXG4gIHRoaXMuc3RvcmUgPSBvcHRpb25zLnN0b3JlXG4gIHRoaXMuYnJvd3NlciA9IG9wdGlvbnMuYnJvd3NlclxuICB0aGlzLnJlc3VsdFdyaXRlciA9IG51bGwgLy8gZGIgaW5zdGFuY2UgZm9yIHNjcmFwZWQgZGF0YSB3cml0aW5nXG4gIHRoaXMucmVxdWVzdEludGVydmFsID0gcGFyc2VJbnQob3B0aW9ucy5yZXF1ZXN0SW50ZXJ2YWwpXG4gIHRoaXMucGFnZUxvYWREZWxheSA9IHBhcnNlSW50KG9wdGlvbnMucGFnZUxvYWREZWxheSlcbn1cblxuU2NyYXBlci5wcm90b3R5cGUgPSB7XG5cblx0LyoqXG5cdCAqIFNjcmFwaW5nIGRlbGF5IGJldHdlZW4gdHdvIHBhZ2Ugb3BlbmluZyByZXF1ZXN0c1xuXHQgKi9cbiAgcmVxdWVzdEludGVydmFsOiAyMDAwLFxuICBfdGltZU5leHRTY3JhcGVBdmFpbGFibGU6IDAsXG5cbiAgaW5pdEZpcnN0Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHZhciB1cmxzID0gdGhpcy5zaXRlbWFwLmdldFN0YXJ0VXJscygpXG5cbiAgICB1cmxzLmZvckVhY2goZnVuY3Rpb24gKHVybCkge1xuICAgICAgdmFyIGZpcnN0Sm9iID0gbmV3IEpvYih1cmwsICdfcm9vdCcsIHRoaXMpXG4gICAgICB0aGlzLnF1ZXVlLmFkZChmaXJzdEpvYilcbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG5cbiAgcnVuOiBmdW5jdGlvbiAoZXhlY3V0aW9uQ2FsbGJhY2spIHtcbiAgICB2YXIgc2NyYXBlciA9IHRoaXNcblxuXHRcdC8vIGNhbGxiYWNrIHdoZW4gc2NyYXBpbmcgaXMgZmluaXNoZWRcbiAgICB0aGlzLmV4ZWN1dGlvbkNhbGxiYWNrID0gZXhlY3V0aW9uQ2FsbGJhY2tcblxuICAgIHRoaXMuaW5pdEZpcnN0Sm9icygpXG5cbiAgICB0aGlzLnN0b3JlLmluaXRTaXRlbWFwRGF0YURiKHRoaXMuc2l0ZW1hcC5faWQsIGZ1bmN0aW9uIChyZXN1bHRXcml0ZXIpIHtcbiAgICAgIHNjcmFwZXIucmVzdWx0V3JpdGVyID0gcmVzdWx0V3JpdGVyXG4gICAgICBzY3JhcGVyLl9ydW4oKVxuICAgIH0pXG4gIH0sXG5cbiAgcmVjb3JkQ2FuSGF2ZUNoaWxkSm9iczogZnVuY3Rpb24gKHJlY29yZCkge1xuICAgIGlmIChyZWNvcmQuX2ZvbGxvdyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cbiAgICB2YXIgc2VsZWN0b3JJZCA9IHJlY29yZC5fZm9sbG93U2VsZWN0b3JJZFxuICAgIHZhciBjaGlsZFNlbGVjdG9ycyA9IHRoaXMuc2l0ZW1hcC5nZXREaXJlY3RDaGlsZFNlbGVjdG9ycyhzZWxlY3RvcklkKVxuICAgIGlmIChjaGlsZFNlbGVjdG9ycy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfSxcblxuICBnZXRGaWxlRmlsZW5hbWU6IGZ1bmN0aW9uICh1cmwpIHtcbiAgICB2YXIgcGFydHMgPSB1cmwuc3BsaXQoJy8nKVxuICAgIHZhciBmaWxlbmFtZSA9IHBhcnRzW3BhcnRzLmxlbmd0aCAtIDFdXG4gICAgZmlsZW5hbWUgPSBmaWxlbmFtZS5yZXBsYWNlKC9cXD8vZywgJycpXG4gICAgaWYgKGZpbGVuYW1lLmxlbmd0aCA+IDEzMCkge1xuICAgICAgZmlsZW5hbWUgPSBmaWxlbmFtZS5zdWJzdHIoMCwgMTMwKVxuICAgIH1cbiAgICByZXR1cm4gZmlsZW5hbWVcbiAgfSxcblxuXHQvKipcblx0ICogU2F2ZSBpbWFnZXMgZm9yIHVzZXIgaWYgdGhlIHJlY29yZHMgY29udGFpbnMgdGhlbVxuXHQgKiBAcGFyYW0gcmVjb3JkXG5cdCAqL1xuICBzYXZlSW1hZ2VzOiBmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciBkZWZlcnJlZEltYWdlU3RvcmVDYWxscyA9IFtdXG4gICAgdmFyIHByZWZpeExlbmd0aCA9ICdfaW1hZ2VCYXNlNjQtJy5sZW5ndGhcblxuICAgIGZvciAodmFyIGF0dHIgaW4gcmVjb3JkKSB7XG4gICAgICBpZiAoYXR0ci5zdWJzdHIoMCwgcHJlZml4TGVuZ3RoKSA9PT0gJ19pbWFnZUJhc2U2NC0nKSB7XG4gICAgICAgIHZhciBzZWxlY3RvcklkID0gYXR0ci5zdWJzdHJpbmcocHJlZml4TGVuZ3RoLCBhdHRyLmxlbmd0aClcbiAgICAgICAgZGVmZXJyZWRJbWFnZVN0b3JlQ2FsbHMucHVzaChmdW5jdGlvbiAoc2VsZWN0b3JJZCkge1xuICAgICAgICAgIHZhciBpbWFnZUJhc2U2NCA9IHJlY29yZFsnX2ltYWdlQmFzZTY0LScgKyBzZWxlY3RvcklkXVxuICAgICAgICAgIHZhciBkZWZlcnJlZERvd25sb2FkRG9uZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgICAgICAgICB2YXIgZGVmZXJyZWRCbG9iID0gQmFzZTY0LmJhc2U2NFRvQmxvYihpbWFnZUJhc2U2NCwgcmVjb3JkWydfaW1hZ2VNaW1lVHlwZS0nICsgc2VsZWN0b3JJZF0pXG5cbiAgICAgICAgICBkZWxldGUgcmVjb3JkWydfaW1hZ2VNaW1lVHlwZS0nICsgc2VsZWN0b3JJZF1cbiAgICAgICAgICBkZWxldGUgcmVjb3JkWydfaW1hZ2VCYXNlNjQtJyArIHNlbGVjdG9ySWRdXG5cbiAgICAgICAgICBkZWZlcnJlZEJsb2IuZG9uZShmdW5jdGlvbiAoYmxvYikge1xuICAgICAgICAgICAgdmFyIGRvd25sb2FkVXJsID0gd2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYilcbiAgICAgICAgICAgIHZhciBmaWxlU2F2ZVBhdGggPSB0aGlzLnNpdGVtYXAuX2lkICsgJy8nICsgc2VsZWN0b3JJZCArICcvJyArIHRoaXMuZ2V0RmlsZUZpbGVuYW1lKHJlY29yZFtzZWxlY3RvcklkICsgJy1zcmMnXSlcblxuXHRcdFx0XHRcdFx0Ly8gZG93bmxvYWQgaW1hZ2UgdXNpbmcgY2hyb21lIGFwaVxuICAgICAgICAgICAgdmFyIGRvd25sb2FkUmVxdWVzdCA9IHtcbiAgICAgICAgICAgICAgdXJsOiBkb3dubG9hZFVybCxcbiAgICAgICAgICAgICAgZmlsZW5hbWU6IGZpbGVTYXZlUGF0aFxuICAgICAgICAgICAgfVxuXG5cdFx0XHRcdFx0XHQvLyB3YWl0IGZvciB0aGUgZG93bmxvYWQgdG8gZmluaXNoXG4gICAgICAgICAgICBjaHJvbWUuZG93bmxvYWRzLmRvd25sb2FkKGRvd25sb2FkUmVxdWVzdCwgZnVuY3Rpb24gKGRvd25sb2FkSWQpIHtcbiAgICAgICAgICAgICAgdmFyIGNiRG93bmxvYWRlZCA9IGZ1bmN0aW9uIChkb3dubG9hZEl0ZW0pIHtcbiAgICAgICAgICAgICAgICBpZiAoZG93bmxvYWRJdGVtLmlkID09PSBkb3dubG9hZElkICYmIGRvd25sb2FkSXRlbS5zdGF0ZSkge1xuICAgICAgICAgICAgICAgICAgaWYgKGRvd25sb2FkSXRlbS5zdGF0ZS5jdXJyZW50ID09PSAnY29tcGxldGUnKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkRG93bmxvYWREb25lLnJlc29sdmUoKVxuICAgICAgICAgICAgICAgICAgICBjaHJvbWUuZG93bmxvYWRzLm9uQ2hhbmdlZC5yZW1vdmVMaXN0ZW5lcihjYkRvd25sb2FkZWQpXG4gICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGRvd25sb2FkSXRlbS5zdGF0ZS5jdXJyZW50ID09PSAnaW50ZXJydXB0ZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkRG93bmxvYWREb25lLnJlamVjdCgnZG93bmxvYWQgZmFpbGVkJylcbiAgICAgICAgICAgICAgICAgICAgY2hyb21lLmRvd25sb2Fkcy5vbkNoYW5nZWQucmVtb3ZlTGlzdGVuZXIoY2JEb3dubG9hZGVkKVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGNocm9tZS5kb3dubG9hZHMub25DaGFuZ2VkLmFkZExpc3RlbmVyKGNiRG93bmxvYWRlZClcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgICAgICAgcmV0dXJuIGRlZmVycmVkRG93bmxvYWREb25lLnByb21pc2UoKVxuICAgICAgICB9LmJpbmQodGhpcywgc2VsZWN0b3JJZCkpXG4gICAgICB9XG4gICAgfVxuXG4gICAgd2hlbkNhbGxTZXF1ZW50aWFsbHkoZGVmZXJyZWRJbWFnZVN0b3JlQ2FsbHMpLmRvbmUoZnVuY3Rpb24gKCkge1xuICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKClcbiAgICB9KVxuXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gIH0sXG5cblx0Ly8gQFRPRE8gcmVtb3ZlIHJlY3Vyc2lvbiBhbmQgYWRkIGFuIGl0ZXJhdGl2ZSB3YXkgdG8gcnVuIHRoZXNlIGpvYnMuXG4gIF9ydW46IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgam9iID0gdGhpcy5xdWV1ZS5nZXROZXh0Sm9iKClcbiAgICBpZiAoam9iID09PSBmYWxzZSkge1xuICAgICAgY29uc29sZS5sb2coJ1NjcmFwZXIgZXhlY3V0aW9uIGlzIGZpbmlzaGVkJylcbiAgICAgIHRoaXMuYnJvd3Nlci5jbG9zZSgpXG4gICAgICB0aGlzLmV4ZWN1dGlvbkNhbGxiYWNrKClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBjb25zb2xlLmxvZygnc3RhcnRpbmcgZXhlY3V0ZScpXG4gICAgam9iLmV4ZWN1dGUodGhpcy5icm93c2VyLCBmdW5jdGlvbiAoam9iKSB7XG4gICAgICBjb25zb2xlLmxvZygnZmluaXNoZWQgZXhlY3V0aW5nJylcbiAgICAgIHZhciBzY3JhcGVkUmVjb3JkcyA9IFtdXG4gICAgICB2YXIgZGVmZXJyZWREYXRhbWFuaXB1bGF0aW9ucyA9IFtdXG5cbiAgICAgIHZhciByZWNvcmRzID0gam9iLmdldFJlc3VsdHMoKVxuICAgICAgcmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcblx0XHRcdFx0Ly8gdmFyIHJlY29yZCA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkocmVjKSk7XG5cbiAgICAgICAgZGVmZXJyZWREYXRhbWFuaXB1bGF0aW9ucy5wdXNoKHRoaXMuc2F2ZUltYWdlcy5iaW5kKHRoaXMsIHJlY29yZCkpXG5cblx0XHRcdFx0Ly8gQFRPRE8gcmVmYWN0b3Igam9iIGV4c3RyYWN0aW9uIHRvIGEgc2VwZXJhdGUgbWV0aG9kXG4gICAgICAgIGlmICh0aGlzLnJlY29yZENhbkhhdmVDaGlsZEpvYnMocmVjb3JkKSkge1xuICAgICAgICAgIHZhciBmb2xsb3dTZWxlY3RvcklkID0gcmVjb3JkLl9mb2xsb3dTZWxlY3RvcklkXG4gICAgICAgICAgdmFyIGZvbGxvd1VSTCA9IHJlY29yZFsnX2ZvbGxvdyddXG4gICAgICAgICAgZGVsZXRlIHJlY29yZFsnX2ZvbGxvdyddXG4gICAgICAgICAgZGVsZXRlIHJlY29yZFsnX2ZvbGxvd1NlbGVjdG9ySWQnXVxuICAgICAgICAgIHZhciBuZXdKb2IgPSBuZXcgSm9iKGZvbGxvd1VSTCwgZm9sbG93U2VsZWN0b3JJZCwgdGhpcywgam9iLCByZWNvcmQpXG4gICAgICAgICAgaWYgKHRoaXMucXVldWUuY2FuQmVBZGRlZChuZXdKb2IpKSB7XG4gICAgICAgICAgICB0aGlzLnF1ZXVlLmFkZChuZXdKb2IpXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHN0b3JlIGFscmVhZHkgc2NyYXBlZCBsaW5rc1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0lnbm9yaW5nIG5leHQnKVxuICAgICAgICAgICAgY29uc29sZS5sb2cocmVjb3JkKVxuLy9cdFx0XHRcdFx0XHRzY3JhcGVkUmVjb3Jkcy5wdXNoKHJlY29yZCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChyZWNvcmQuX2ZvbGxvdyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBkZWxldGUgcmVjb3JkWydfZm9sbG93J11cbiAgICAgICAgICAgIGRlbGV0ZSByZWNvcmRbJ19mb2xsb3dTZWxlY3RvcklkJ11cbiAgICAgICAgICB9XG4gICAgICAgICAgc2NyYXBlZFJlY29yZHMucHVzaChyZWNvcmQpXG4gICAgICAgIH1cbiAgICAgIH0uYmluZCh0aGlzKSlcblxuICAgICAgd2hlbkNhbGxTZXF1ZW50aWFsbHkoZGVmZXJyZWREYXRhbWFuaXB1bGF0aW9ucykuZG9uZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMucmVzdWx0V3JpdGVyLndyaXRlRG9jcyhzY3JhcGVkUmVjb3JkcywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciBub3cgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpXG5cdFx0XHRcdFx0Ly8gZGVsYXkgbmV4dCBqb2IgaWYgbmVlZGVkXG4gICAgICAgICAgdGhpcy5fdGltZU5leHRTY3JhcGVBdmFpbGFibGUgPSBub3cgKyB0aGlzLnJlcXVlc3RJbnRlcnZhbFxuICAgICAgICAgIGlmIChub3cgPj0gdGhpcy5fdGltZU5leHRTY3JhcGVBdmFpbGFibGUpIHtcbiAgICAgICAgICAgIHRoaXMuX3J1bigpXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBkZWxheSA9IHRoaXMuX3RpbWVOZXh0U2NyYXBlQXZhaWxhYmxlIC0gbm93XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgdGhpcy5fcnVuKClcbiAgICAgICAgICAgIH0uYmluZCh0aGlzKSwgZGVsYXkpXG4gICAgICAgICAgfVxuICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICB9LmJpbmQodGhpcykpXG4gICAgfS5iaW5kKHRoaXMpKVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2NyYXBlclxuIiwidmFyIHNlbGVjdG9ycyA9IHJlcXVpcmUoJy4vU2VsZWN0b3JzJylcbnZhciBFbGVtZW50UXVlcnkgPSByZXF1aXJlKCcuL0VsZW1lbnRRdWVyeScpXG52YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcblxudmFyIFNlbGVjdG9yID0gZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gIHRoaXMudXBkYXRlRGF0YShzZWxlY3RvcilcbiAgdGhpcy5pbml0VHlwZSgpXG59XG5cblNlbGVjdG9yLnByb3RvdHlwZSA9IHtcblxuXHQvKipcblx0ICogSXMgdGhpcyBzZWxlY3RvciBjb25maWd1cmVkIHRvIHJldHVybiBtdWx0aXBsZSBpdGVtcz9cblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuICB3aWxsUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzKCkgJiYgdGhpcy5tdWx0aXBsZVxuICB9LFxuXG5cdC8qKlxuXHQgKiBVcGRhdGUgY3VycmVudCBzZWxlY3RvciBjb25maWd1cmF0aW9uXG5cdCAqIEBwYXJhbSBkYXRhXG5cdCAqL1xuICB1cGRhdGVEYXRhOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHZhciBhbGxvd2VkS2V5cyA9IFsnaWQnLCAndHlwZScsICdzZWxlY3RvcicsICdwYXJlbnRTZWxlY3RvcnMnXVxuICAgIGNvbnNvbGUubG9nKCdkYXRhIHR5cGUnLCBkYXRhLnR5cGUpXG4gICAgYWxsb3dlZEtleXMgPSBhbGxvd2VkS2V5cy5jb25jYXQoc2VsZWN0b3JzW2RhdGEudHlwZV0uZ2V0RmVhdHVyZXMoKSlcbiAgICB2YXIga2V5XG5cdFx0Ly8gdXBkYXRlIGRhdGFcbiAgICBmb3IgKGtleSBpbiBkYXRhKSB7XG4gICAgICBpZiAoYWxsb3dlZEtleXMuaW5kZXhPZihrZXkpICE9PSAtMSB8fCB0eXBlb2YgZGF0YVtrZXldID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXNba2V5XSA9IGRhdGFba2V5XVxuICAgICAgfVxuICAgIH1cblxuXHRcdC8vIHJlbW92ZSB2YWx1ZXMgdGhhdCBhcmUgbm90IG5lZWRlZCBmb3IgdGhpcyB0eXBlIG9mIHNlbGVjdG9yXG4gICAgZm9yIChrZXkgaW4gdGhpcykge1xuICAgICAgaWYgKGFsbG93ZWRLZXlzLmluZGV4T2Yoa2V5KSA9PT0gLTEgJiYgdHlwZW9mIHRoaXNba2V5XSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBkZWxldGUgdGhpc1trZXldXG4gICAgICB9XG4gICAgfVxuICB9LFxuXG5cdC8qKlxuXHQgKiBDU1Mgc2VsZWN0b3Igd2hpY2ggd2lsbCBiZSB1c2VkIGZvciBlbGVtZW50IHNlbGVjdGlvblxuXHQgKiBAcmV0dXJucyB7c3RyaW5nfVxuXHQgKi9cbiAgZ2V0SXRlbUNTU1NlbGVjdG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICcqJ1xuICB9LFxuXG5cdC8qKlxuXHQgKiBvdmVycmlkZSBvYmplY3RzIG1ldGhvZHMgYmFzZWQgb24gc2VsZXRvciB0eXBlXG5cdCAqL1xuICBpbml0VHlwZTogZnVuY3Rpb24gKCkge1xuICAgIGlmIChzZWxlY3RvcnNbdGhpcy50eXBlXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NlbGVjdG9yIHR5cGUgbm90IGRlZmluZWQgJyArIHRoaXMudHlwZSlcbiAgICB9XG5cblx0XHQvLyBvdmVycmlkZXMgb2JqZWN0cyBtZXRob2RzXG4gICAgZm9yICh2YXIgaSBpbiBzZWxlY3RvcnNbdGhpcy50eXBlXSkge1xuICAgICAgdGhpc1tpXSA9IHNlbGVjdG9yc1t0aGlzLnR5cGVdW2ldXG4gICAgfVxuICB9LFxuXG5cdC8qKlxuXHQgKiBDaGVjayB3aGV0aGVyIGEgc2VsZWN0b3IgaXMgYSBwYXJlbiBzZWxlY3RvciBvZiB0aGlzIHNlbGVjdG9yXG5cdCAqIEBwYXJhbSBzZWxlY3RvcklkXG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHQgKi9cbiAgaGFzUGFyZW50U2VsZWN0b3I6IGZ1bmN0aW9uIChzZWxlY3RvcklkKSB7XG4gICAgcmV0dXJuICh0aGlzLnBhcmVudFNlbGVjdG9ycy5pbmRleE9mKHNlbGVjdG9ySWQpICE9PSAtMSlcbiAgfSxcblxuICByZW1vdmVQYXJlbnRTZWxlY3RvcjogZnVuY3Rpb24gKHNlbGVjdG9ySWQpIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLnBhcmVudFNlbGVjdG9ycy5pbmRleE9mKHNlbGVjdG9ySWQpXG4gICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgdGhpcy5wYXJlbnRTZWxlY3RvcnMuc3BsaWNlKGluZGV4LCAxKVxuICAgIH1cbiAgfSxcblxuICByZW5hbWVQYXJlbnRTZWxlY3RvcjogZnVuY3Rpb24gKG9yaWdpbmFsSWQsIHJlcGxhY2VtZW50SWQpIHtcbiAgICBpZiAodGhpcy5oYXNQYXJlbnRTZWxlY3RvcihvcmlnaW5hbElkKSkge1xuICAgICAgdmFyIHBvcyA9IHRoaXMucGFyZW50U2VsZWN0b3JzLmluZGV4T2Yob3JpZ2luYWxJZClcbiAgICAgIHRoaXMucGFyZW50U2VsZWN0b3JzLnNwbGljZShwb3MsIDEsIHJlcGxhY2VtZW50SWQpXG4gICAgfVxuICB9LFxuXG4gIGdldERhdGFFbGVtZW50czogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZWxlbWVudHMgPSBFbGVtZW50UXVlcnkodGhpcy5zZWxlY3RvciwgcGFyZW50RWxlbWVudClcbiAgICBpZiAodGhpcy5tdWx0aXBsZSkge1xuICAgICAgcmV0dXJuIGVsZW1lbnRzXG4gICAgfSBlbHNlIGlmIChlbGVtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gW2VsZW1lbnRzWzBdXVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gW11cbiAgICB9XG4gIH0sXG5cbiAgZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIHRpbWVvdXQgPSB0aGlzLmRlbGF5IHx8IDBcblxuXHRcdC8vIHRoaXMgd29ya3MgbXVjaCBmYXN0ZXIgYmVjYXVzZSB3aGVuQ2FsbFNlcXVlbnRhbGx5IGlzbid0IHJ1bm5pbmcgbmV4dCBkYXRhIGV4dHJhY3Rpb24gaW1tZWRpYXRlbHlcbiAgICBpZiAodGltZW91dCA9PT0gMCkge1xuICAgICAgdmFyIGRlZmVycmVkRGF0YSA9IHRoaXMuX2dldERhdGEocGFyZW50RWxlbWVudClcbiAgICAgIGRlZmVycmVkRGF0YS5kb25lKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIGQucmVzb2x2ZShkYXRhKVxuICAgICAgfSlcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkZWZlcnJlZERhdGEgPSB0aGlzLl9nZXREYXRhKHBhcmVudEVsZW1lbnQpXG4gICAgICAgIGRlZmVycmVkRGF0YS5kb25lKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgZC5yZXNvbHZlKGRhdGEpXG4gICAgICAgIH0pXG4gICAgICB9LmJpbmQodGhpcyksIHRpbWVvdXQpXG4gICAgfVxuXG4gICAgcmV0dXJuIGQucHJvbWlzZSgpXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvclxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG5cbnZhciBTZWxlY3RvckVsZW1lbnQgPSB7XG5cbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBkZmQgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcbiAgICBkZmQucmVzb2x2ZShqUXVlcnkubWFrZUFycmF5KGVsZW1lbnRzKSlcblxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW11cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2RlbGF5J11cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yRWxlbWVudFxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgU2VsZWN0b3JFbGVtZW50QXR0cmlidXRlID0ge1xuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuXG4gICAgdmFyIHJlc3VsdCA9IFtdXG4gICAgJChlbGVtZW50cykuZWFjaChmdW5jdGlvbiAoaywgZWxlbWVudCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuXG4gICAgICBkYXRhW3RoaXMuaWRdID0gJChlbGVtZW50KS5hdHRyKHRoaXMuZXh0cmFjdEF0dHJpYnV0ZSlcbiAgICAgIHJlc3VsdC5wdXNoKGRhdGEpXG4gICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgaWYgKHRoaXMubXVsdGlwbGUgPT09IGZhbHNlICYmIGVsZW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuICAgICAgZGF0YVt0aGlzLmlkICsgJy1zcmMnXSA9IG51bGxcbiAgICAgIHJlc3VsdC5wdXNoKGRhdGEpXG4gICAgfVxuICAgIGRmZC5yZXNvbHZlKHJlc3VsdClcblxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW3RoaXMuaWRdXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydtdWx0aXBsZScsICdleHRyYWN0QXR0cmlidXRlJywgJ2RlbGF5J11cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yRWxlbWVudEF0dHJpYnV0ZVxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgVW5pcXVlRWxlbWVudExpc3QgPSByZXF1aXJlKCcuLy4uL1VuaXF1ZUVsZW1lbnRMaXN0JylcbnZhciBFbGVtZW50UXVlcnkgPSByZXF1aXJlKCcuLy4uL0VsZW1lbnRRdWVyeScpXG52YXIgQ3NzU2VsZWN0b3IgPSByZXF1aXJlKCdjc3Mtc2VsZWN0b3InKS5Dc3NTZWxlY3RvclxudmFyIFNlbGVjdG9yRWxlbWVudENsaWNrID0ge1xuXG4gIGNhblJldHVybk11bHRpcGxlUmVjb3JkczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUNoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlTG9jYWxDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGdldENsaWNrRWxlbWVudHM6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyIGNsaWNrRWxlbWVudHMgPSBFbGVtZW50UXVlcnkodGhpcy5jbGlja0VsZW1lbnRTZWxlY3RvciwgcGFyZW50RWxlbWVudClcbiAgICByZXR1cm4gY2xpY2tFbGVtZW50c1xuICB9LFxuXG5cdC8qKlxuXHQgKiBDaGVjayB3aGV0aGVyIGVsZW1lbnQgaXMgc3RpbGwgcmVhY2hhYmxlIGZyb20gaHRtbC4gVXNlZnVsIHRvIGNoZWNrIHdoZXRoZXIgdGhlIGVsZW1lbnQgaXMgcmVtb3ZlZCBmcm9tIERPTS5cblx0ICogQHBhcmFtIGVsZW1lbnRcblx0ICovXG4gIGlzRWxlbWVudEluSFRNTDogZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICByZXR1cm4gJChlbGVtZW50KS5jbG9zZXN0KCdodG1sJykubGVuZ3RoICE9PSAwXG4gIH0sXG5cbiAgdHJpZ2dlckJ1dHRvbkNsaWNrOiBmdW5jdGlvbiAoY2xpY2tFbGVtZW50KSB7XG4gICAgdmFyIGNzID0gbmV3IENzc1NlbGVjdG9yKHtcbiAgICAgIGVuYWJsZVNtYXJ0VGFibGVTZWxlY3RvcjogZmFsc2UsXG4gICAgICBwYXJlbnQ6ICQoJ2JvZHknKVswXSxcbiAgICAgIGVuYWJsZVJlc3VsdFN0cmlwcGluZzogZmFsc2VcbiAgICB9KVxuICAgIHZhciBjc3NTZWxlY3RvciA9IGNzLmdldENzc1NlbGVjdG9yKFtjbGlja0VsZW1lbnRdKVxuXG5cdFx0Ly8gdGhpcyBmdW5jdGlvbiB3aWxsIGNhdGNoIHdpbmRvdy5vcGVuIGNhbGwgYW5kIHBsYWNlIHRoZSByZXF1ZXN0ZWQgdXJsIGFzIHRoZSBlbGVtZW50cyBkYXRhIGF0dHJpYnV0ZVxuICAgIHZhciBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKVxuICAgIHNjcmlwdC50eXBlID0gJ3RleHQvamF2YXNjcmlwdCdcbiAgICBzY3JpcHQudGV4dCA9ICcnICtcblx0XHRcdCcoZnVuY3Rpb24oKXsgJyArXG5cdFx0XHRcInZhciBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ1wiICsgY3NzU2VsZWN0b3IgKyBcIicpWzBdOyBcIiArXG5cdFx0XHQnZWwuY2xpY2soKTsgJyArXG5cdFx0XHQnfSkoKTsnXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzY3JpcHQpXG4gIH0sXG5cbiAgZ2V0Q2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGU6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gJ3VuaXF1ZVRleHQnXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLmNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlXG4gICAgfVxuICB9LFxuXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBkZWxheSA9IHBhcnNlSW50KHRoaXMuZGVsYXkpIHx8IDBcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIGZvdW5kRWxlbWVudHMgPSBuZXcgVW5pcXVlRWxlbWVudExpc3QoJ3VuaXF1ZVRleHQnKVxuICAgIHZhciBjbGlja0VsZW1lbnRzID0gdGhpcy5nZXRDbGlja0VsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG4gICAgdmFyIGRvbmVDbGlja2luZ0VsZW1lbnRzID0gbmV3IFVuaXF1ZUVsZW1lbnRMaXN0KHRoaXMuZ2V0Q2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUoKSlcblxuXHRcdC8vIGFkZCBlbGVtZW50cyB0aGF0IGFyZSBhdmFpbGFibGUgYmVmb3JlIGNsaWNraW5nXG4gICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcbiAgICBlbGVtZW50cy5mb3JFYWNoKGZvdW5kRWxlbWVudHMucHVzaC5iaW5kKGZvdW5kRWxlbWVudHMpKVxuXG5cdFx0Ly8gZGlzY2FyZCBpbml0aWFsIGVsZW1lbnRzXG4gICAgaWYgKHRoaXMuZGlzY2FyZEluaXRpYWxFbGVtZW50cykge1xuICAgICAgZm91bmRFbGVtZW50cyA9IG5ldyBVbmlxdWVFbGVtZW50TGlzdCgndW5pcXVlVGV4dCcpXG4gICAgfVxuXG5cdFx0Ly8gbm8gZWxlbWVudHMgdG8gY2xpY2sgYXQgdGhlIGJlZ2lubmluZ1xuICAgIGlmIChjbGlja0VsZW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKGZvdW5kRWxlbWVudHMpXG4gICAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZS5wcm9taXNlKClcbiAgICB9XG5cblx0XHQvLyBpbml0aWFsIGNsaWNrIGFuZCB3YWl0XG4gICAgdmFyIGN1cnJlbnRDbGlja0VsZW1lbnQgPSBjbGlja0VsZW1lbnRzWzBdXG4gICAgdGhpcy50cmlnZ2VyQnV0dG9uQ2xpY2soY3VycmVudENsaWNrRWxlbWVudClcbiAgICB2YXIgbmV4dEVsZW1lbnRTZWxlY3Rpb24gPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpICsgZGVsYXlcblxuXHRcdC8vIGluZmluaXRlbHkgc2Nyb2xsIGRvd24gYW5kIGZpbmQgYWxsIGl0ZW1zXG4gICAgdmFyIGludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuXHRcdFx0Ly8gZmluZCB0aG9zZSBjbGljayBlbGVtZW50cyB0aGF0IGFyZSBub3QgaW4gdGhlIGJsYWNrIGxpc3RcbiAgICAgIHZhciBhbGxDbGlja0VsZW1lbnRzID0gdGhpcy5nZXRDbGlja0VsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG4gICAgICBjbGlja0VsZW1lbnRzID0gW11cbiAgICAgIGFsbENsaWNrRWxlbWVudHMuZm9yRWFjaChmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICBpZiAoIWRvbmVDbGlja2luZ0VsZW1lbnRzLmlzQWRkZWQoZWxlbWVudCkpIHtcbiAgICAgICAgICBjbGlja0VsZW1lbnRzLnB1c2goZWxlbWVudClcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgdmFyIG5vdyA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKClcblx0XHRcdC8vIHNsZWVwLiB3YWl0IHdoZW4gdG8gZXh0cmFjdCBuZXh0IGVsZW1lbnRzXG4gICAgICBpZiAobm93IDwgbmV4dEVsZW1lbnRTZWxlY3Rpb24pIHtcblx0XHRcdFx0Ly8gY29uc29sZS5sb2coXCJ3YWl0XCIpO1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuXHRcdFx0Ly8gYWRkIG5ld2x5IGZvdW5kIGVsZW1lbnRzIHRvIGVsZW1lbnQgZm91bmRFbGVtZW50cyBhcnJheS5cbiAgICAgIHZhciBlbGVtZW50cyA9IHRoaXMuZ2V0RGF0YUVsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG4gICAgICB2YXIgYWRkZWRBbkVsZW1lbnQgPSBmYWxzZVxuICAgICAgZWxlbWVudHMuZm9yRWFjaChmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICB2YXIgYWRkZWQgPSBmb3VuZEVsZW1lbnRzLnB1c2goZWxlbWVudClcbiAgICAgICAgaWYgKGFkZGVkKSB7XG4gICAgICAgICAgYWRkZWRBbkVsZW1lbnQgPSB0cnVlXG4gICAgICAgIH1cbiAgICAgIH0pXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhcImFkZGVkXCIsIGFkZGVkQW5FbGVtZW50KTtcblxuXHRcdFx0Ly8gbm8gbmV3IGVsZW1lbnRzIGZvdW5kLiBTdG9wIGNsaWNraW5nIHRoaXMgYnV0dG9uXG4gICAgICBpZiAoIWFkZGVkQW5FbGVtZW50KSB7XG4gICAgICAgIGRvbmVDbGlja2luZ0VsZW1lbnRzLnB1c2goY3VycmVudENsaWNrRWxlbWVudClcbiAgICAgIH1cblxuXHRcdFx0Ly8gY29udGludWUgY2xpY2tpbmcgYW5kIGFkZCBkZWxheSwgYnV0IGlmIHRoZXJlIGlzIG5vdGhpbmdcblx0XHRcdC8vIG1vcmUgdG8gY2xpY2sgdGhlIGZpbmlzaFxuXHRcdFx0Ly8gY29uc29sZS5sb2coXCJ0b3RhbCBidXR0b25zXCIsIGNsaWNrRWxlbWVudHMubGVuZ3RoKVxuICAgICAgaWYgKGNsaWNrRWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpXG4gICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZShmb3VuZEVsZW1lbnRzKVxuICAgICAgfSBlbHNlIHtcblx0XHRcdFx0Ly8gY29uc29sZS5sb2coXCJjbGlja1wiKTtcbiAgICAgICAgY3VycmVudENsaWNrRWxlbWVudCA9IGNsaWNrRWxlbWVudHNbMF1cblx0XHRcdFx0Ly8gY2xpY2sgb24gZWxlbWVudHMgb25seSBvbmNlIGlmIHRoZSB0eXBlIGlzIGNsaWNrb25jZVxuICAgICAgICBpZiAodGhpcy5jbGlja1R5cGUgPT09ICdjbGlja09uY2UnKSB7XG4gICAgICAgICAgZG9uZUNsaWNraW5nRWxlbWVudHMucHVzaChjdXJyZW50Q2xpY2tFbGVtZW50KVxuICAgICAgICB9XG4gICAgICAgIHRoaXMudHJpZ2dlckJ1dHRvbkNsaWNrKGN1cnJlbnRDbGlja0VsZW1lbnQpXG4gICAgICAgIG5leHRFbGVtZW50U2VsZWN0aW9uID0gbm93ICsgZGVsYXlcbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcyksIDUwKVxuXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW11cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2RlbGF5JywgJ2NsaWNrRWxlbWVudFNlbGVjdG9yJywgJ2NsaWNrVHlwZScsICdkaXNjYXJkSW5pdGlhbEVsZW1lbnRzJywgJ2NsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlJ11cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yRWxlbWVudENsaWNrXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciBTZWxlY3RvckVsZW1lbnRTY3JvbGwgPSB7XG5cbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG4gIHNjcm9sbFRvQm90dG9tOiBmdW5jdGlvbiAoKSB7XG4gICAgd2luZG93LnNjcm9sbFRvKDAsIGRvY3VtZW50LmJvZHkuc2Nyb2xsSGVpZ2h0KVxuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZGVsYXkgPSBwYXJzZUludCh0aGlzLmRlbGF5KSB8fCAwXG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciBmb3VuZEVsZW1lbnRzID0gW11cblxuXHRcdC8vIGluaXRpYWxseSBzY3JvbGwgZG93biBhbmQgd2FpdFxuICAgIHRoaXMuc2Nyb2xsVG9Cb3R0b20oKVxuICAgIHZhciBuZXh0RWxlbWVudFNlbGVjdGlvbiA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCkgKyBkZWxheVxuXG5cdFx0Ly8gaW5maW5pdGVseSBzY3JvbGwgZG93biBhbmQgZmluZCBhbGwgaXRlbXNcbiAgICB2YXIgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgbm93ID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKVxuXHRcdFx0Ly8gc2xlZXAuIHdhaXQgd2hlbiB0byBleHRyYWN0IG5leHQgZWxlbWVudHNcbiAgICAgIGlmIChub3cgPCBuZXh0RWxlbWVudFNlbGVjdGlvbikge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcblx0XHRcdC8vIG5vIG5ldyBlbGVtZW50cyBmb3VuZFxuICAgICAgaWYgKGVsZW1lbnRzLmxlbmd0aCA9PT0gZm91bmRFbGVtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbClcbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKGpRdWVyeS5tYWtlQXJyYXkoZWxlbWVudHMpKVxuICAgICAgfSBlbHNlIHtcblx0XHRcdFx0Ly8gY29udGludWUgc2Nyb2xsaW5nIGFuZCBhZGQgZGVsYXlcbiAgICAgICAgZm91bmRFbGVtZW50cyA9IGVsZW1lbnRzXG4gICAgICAgIHRoaXMuc2Nyb2xsVG9Cb3R0b20oKVxuICAgICAgICBuZXh0RWxlbWVudFNlbGVjdGlvbiA9IG5vdyArIGRlbGF5XG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpLCA1MClcblxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFtdXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydtdWx0aXBsZScsICdkZWxheSddXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvckVsZW1lbnRTY3JvbGxcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxudmFyIFNlbGVjdG9yR3JvdXAgPSB7XG5cbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuSGF2ZUNoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZGZkID0ganF1ZXJ5LkRlZmVycmVkKClcblxuXHRcdC8vIGNhbm5vdCByZXVzZSB0aGlzLmdldERhdGFFbGVtZW50cyBiZWNhdXNlIGl0IGRlcGVuZHMgb24gKm11bHRpcGxlKiBwcm9wZXJ0eVxuICAgIHZhciBlbGVtZW50cyA9ICQodGhpcy5zZWxlY3RvciwgcGFyZW50RWxlbWVudClcblxuICAgIHZhciByZWNvcmRzID0gW11cbiAgICAkKGVsZW1lbnRzKS5lYWNoKGZ1bmN0aW9uIChrLCBlbGVtZW50KSB7XG4gICAgICB2YXIgZGF0YSA9IHt9XG5cbiAgICAgIGRhdGFbdGhpcy5pZF0gPSAkKGVsZW1lbnQpLnRleHQoKVxuXG4gICAgICBpZiAodGhpcy5leHRyYWN0QXR0cmlidXRlKSB7XG4gICAgICAgIGRhdGFbdGhpcy5pZCArICctJyArIHRoaXMuZXh0cmFjdEF0dHJpYnV0ZV0gPSAkKGVsZW1lbnQpLmF0dHIodGhpcy5leHRyYWN0QXR0cmlidXRlKVxuICAgICAgfVxuXG4gICAgICByZWNvcmRzLnB1c2goZGF0YSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICB2YXIgcmVzdWx0ID0ge31cbiAgICByZXN1bHRbdGhpcy5pZF0gPSByZWNvcmRzXG5cbiAgICBkZmQucmVzb2x2ZShbcmVzdWx0XSlcbiAgICByZXR1cm4gZGZkLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFt0aGlzLmlkXVxuICB9LFxuXG4gIGdldEZlYXR1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFsnZGVsYXknLCAnZXh0cmFjdEF0dHJpYnV0ZSddXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3Rvckdyb3VwXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciBTZWxlY3RvckhUTUwgPSB7XG5cbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5IYXZlTG9jYWxDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkNyZWF0ZU5ld0pvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBkZmQgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcblxuICAgIHZhciByZXN1bHQgPSBbXVxuICAgICQoZWxlbWVudHMpLmVhY2goZnVuY3Rpb24gKGssIGVsZW1lbnQpIHtcbiAgICAgIHZhciBkYXRhID0ge31cbiAgICAgIHZhciBodG1sID0gJChlbGVtZW50KS5odG1sKClcblxuICAgICAgaWYgKHRoaXMucmVnZXggIT09IHVuZGVmaW5lZCAmJiB0aGlzLnJlZ2V4Lmxlbmd0aCkge1xuICAgICAgICB2YXIgbWF0Y2hlcyA9IGh0bWwubWF0Y2gobmV3IFJlZ0V4cCh0aGlzLnJlZ2V4KSlcbiAgICAgICAgaWYgKG1hdGNoZXMgIT09IG51bGwpIHtcbiAgICAgICAgICBodG1sID0gbWF0Y2hlc1swXVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGh0bWwgPSBudWxsXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGRhdGFbdGhpcy5pZF0gPSBodG1sXG5cbiAgICAgIHJlc3VsdC5wdXNoKGRhdGEpXG4gICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgaWYgKHRoaXMubXVsdGlwbGUgPT09IGZhbHNlICYmIGVsZW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuICAgICAgZGF0YVt0aGlzLmlkXSA9IG51bGxcbiAgICAgIHJlc3VsdC5wdXNoKGRhdGEpXG4gICAgfVxuXG4gICAgZGZkLnJlc29sdmUocmVzdWx0KVxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW3RoaXMuaWRdXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydtdWx0aXBsZScsICdyZWdleCcsICdkZWxheSddXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvckhUTUxcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxudmFyIHdoZW5DYWxsU2VxdWVudGlhbGx5ID0gcmVxdWlyZSgnLi4vLi4vYXNzZXRzL2pxdWVyeS53aGVuY2FsbHNlcXVlbnRpYWxseScpXG52YXIgQmFzZTY0ID0gcmVxdWlyZSgnLi4vLi4vYXNzZXRzL2Jhc2U2NCcpXG52YXIgU2VsZWN0b3JJbWFnZSA9IHtcbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5IYXZlTG9jYWxDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkNyZWF0ZU5ld0pvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBkZmQgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcblxuICAgIHZhciBkZWZlcnJlZERhdGFDYWxscyA9IFtdXG4gICAgJChlbGVtZW50cykuZWFjaChmdW5jdGlvbiAoaSwgZWxlbWVudCkge1xuICAgICAgZGVmZXJyZWREYXRhQ2FsbHMucHVzaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkZWZlcnJlZERhdGEgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgICAgIHZhciBkYXRhID0ge31cbiAgICAgICAgZGF0YVt0aGlzLmlkICsgJy1zcmMnXSA9IGVsZW1lbnQuc3JjXG5cblx0XHRcdFx0Ly8gZG93bmxvYWQgaW1hZ2UgaWYgcmVxdWlyZWRcbiAgICAgICAgaWYgKCF0aGlzLmRvd25sb2FkSW1hZ2UpIHtcbiAgICAgICAgICBkZWZlcnJlZERhdGEucmVzb2x2ZShkYXRhKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBkZWZlcnJlZEltYWdlQmFzZTY0ID0gdGhpcy5kb3dubG9hZEltYWdlQmFzZTY0KGVsZW1lbnQuc3JjKVxuXG4gICAgICAgICAgZGVmZXJyZWRJbWFnZUJhc2U2NC5kb25lKGZ1bmN0aW9uIChpbWFnZVJlc3BvbnNlKSB7XG4gICAgICAgICAgICBkYXRhWydfaW1hZ2VCYXNlNjQtJyArIHRoaXMuaWRdID0gaW1hZ2VSZXNwb25zZS5pbWFnZUJhc2U2NFxuICAgICAgICAgICAgZGF0YVsnX2ltYWdlTWltZVR5cGUtJyArIHRoaXMuaWRdID0gaW1hZ2VSZXNwb25zZS5taW1lVHlwZVxuXG4gICAgICAgICAgICBkZWZlcnJlZERhdGEucmVzb2x2ZShkYXRhKVxuICAgICAgICAgIH0uYmluZCh0aGlzKSkuZmFpbChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHQvLyBmYWlsZWQgdG8gZG93bmxvYWQgaW1hZ2UgY29udGludWUuXG5cdFx0XHRcdFx0XHQvLyBAVE9ETyBoYW5kbGUgZXJycm9yXG4gICAgICAgICAgICBkZWZlcnJlZERhdGEucmVzb2x2ZShkYXRhKVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZGVmZXJyZWREYXRhLnByb21pc2UoKVxuICAgICAgfS5iaW5kKHRoaXMpKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIHdoZW5DYWxsU2VxdWVudGlhbGx5KGRlZmVycmVkRGF0YUNhbGxzKS5kb25lKGZ1bmN0aW9uIChkYXRhUmVzdWx0cykge1xuICAgICAgaWYgKHRoaXMubXVsdGlwbGUgPT09IGZhbHNlICYmIGVsZW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICAgIGRhdGFbdGhpcy5pZCArICctc3JjJ10gPSBudWxsXG4gICAgICAgIGRhdGFSZXN1bHRzLnB1c2goZGF0YSlcbiAgICAgIH1cblxuICAgICAgZGZkLnJlc29sdmUoZGF0YVJlc3VsdHMpXG4gICAgfSlcblxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG4gIH0sXG5cbiAgZG93bmxvYWRGaWxlQXNCbG9iOiBmdW5jdGlvbiAodXJsKSB7XG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAodGhpcy5yZWFkeVN0YXRlID09IDQpIHtcbiAgICAgICAgaWYgKHRoaXMuc3RhdHVzID09IDIwMCkge1xuICAgICAgICAgIHZhciBibG9iID0gdGhpcy5yZXNwb25zZVxuICAgICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZShibG9iKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVqZWN0KHhoci5zdGF0dXNUZXh0KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHhoci5vcGVuKCdHRVQnLCB1cmwpXG4gICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdibG9iJ1xuICAgIHhoci5zZW5kKClcblxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG4gIGRvd25sb2FkSW1hZ2VCYXNlNjQ6IGZ1bmN0aW9uICh1cmwpIHtcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIGRlZmVycmVkRG93bmxvYWQgPSB0aGlzLmRvd25sb2FkRmlsZUFzQmxvYih1cmwpXG4gICAgZGVmZXJyZWREb3dubG9hZC5kb25lKGZ1bmN0aW9uIChibG9iKSB7XG4gICAgICB2YXIgbWltZVR5cGUgPSBibG9iLnR5cGVcbiAgICAgIHZhciBkZWZlcnJlZEJsb2IgPSBCYXNlNjQuYmxvYlRvQmFzZTY0KGJsb2IpXG4gICAgICBkZWZlcnJlZEJsb2IuZG9uZShmdW5jdGlvbiAoaW1hZ2VCYXNlNjQpIHtcbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKHtcbiAgICAgICAgICBtaW1lVHlwZTogbWltZVR5cGUsXG4gICAgICAgICAgaW1hZ2VCYXNlNjQ6IGltYWdlQmFzZTY0XG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0pLmZhaWwoZGVmZXJyZWRSZXNwb25zZS5mYWlsKVxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFt0aGlzLmlkICsgJy1zcmMnXVxuICB9LFxuXG4gIGdldEZlYXR1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFsnbXVsdGlwbGUnLCAnZGVsYXknLCAnZG93bmxvYWRJbWFnZSddXG4gIH0sXG5cbiAgZ2V0SXRlbUNTU1NlbGVjdG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICdpbWcnXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvckltYWdlXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciB3aGVuQ2FsbFNlcXVlbnRpYWxseSA9IHJlcXVpcmUoJy4uLy4uL2Fzc2V0cy9qcXVlcnkud2hlbmNhbGxzZXF1ZW50aWFsbHknKVxuXG52YXIgU2VsZWN0b3JMaW5rID0ge1xuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBlbGVtZW50cyA9IHRoaXMuZ2V0RGF0YUVsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG5cbiAgICB2YXIgZGZkID0ganF1ZXJ5LkRlZmVycmVkKClcblxuXHRcdC8vIHJldHVybiBlbXB0eSByZWNvcmQgaWYgbm90IG11bHRpcGxlIHR5cGUgYW5kIG5vIGVsZW1lbnRzIGZvdW5kXG4gICAgaWYgKHRoaXMubXVsdGlwbGUgPT09IGZhbHNlICYmIGVsZW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuICAgICAgZGF0YVt0aGlzLmlkXSA9IG51bGxcbiAgICAgIGRmZC5yZXNvbHZlKFtkYXRhXSlcbiAgICAgIHJldHVybiBkZmRcbiAgICB9XG5cblx0XHQvLyBleHRyYWN0IGxpbmtzIG9uZSBieSBvbmVcbiAgICB2YXIgZGVmZXJyZWREYXRhRXh0cmFjdGlvbkNhbGxzID0gW11cbiAgICAkKGVsZW1lbnRzKS5lYWNoKGZ1bmN0aW9uIChrLCBlbGVtZW50KSB7XG4gICAgICBkZWZlcnJlZERhdGFFeHRyYWN0aW9uQ2FsbHMucHVzaChmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICB2YXIgZGVmZXJyZWREYXRhID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICAgICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICAgIGRhdGFbdGhpcy5pZF0gPSAkKGVsZW1lbnQpLnRleHQoKVxuICAgICAgICBkYXRhLl9mb2xsb3dTZWxlY3RvcklkID0gdGhpcy5pZFxuICAgICAgICBkYXRhW3RoaXMuaWQgKyAnLWhyZWYnXSA9IGVsZW1lbnQuaHJlZlxuICAgICAgICBkYXRhLl9mb2xsb3cgPSBlbGVtZW50LmhyZWZcbiAgICAgICAgZGVmZXJyZWREYXRhLnJlc29sdmUoZGF0YSlcblxuICAgICAgICByZXR1cm4gZGVmZXJyZWREYXRhXG4gICAgICB9LmJpbmQodGhpcywgZWxlbWVudCkpXG4gICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgd2hlbkNhbGxTZXF1ZW50aWFsbHkoZGVmZXJyZWREYXRhRXh0cmFjdGlvbkNhbGxzKS5kb25lKGZ1bmN0aW9uIChyZXNwb25zZXMpIHtcbiAgICAgIHZhciByZXN1bHQgPSBbXVxuICAgICAgcmVzcG9uc2VzLmZvckVhY2goZnVuY3Rpb24gKGRhdGFSZXN1bHQpIHtcbiAgICAgICAgcmVzdWx0LnB1c2goZGF0YVJlc3VsdClcbiAgICAgIH0pXG4gICAgICBkZmQucmVzb2x2ZShyZXN1bHQpXG4gICAgfSlcblxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW3RoaXMuaWQsIHRoaXMuaWQgKyAnLWhyZWYnXVxuICB9LFxuXG4gIGdldEZlYXR1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFsnbXVsdGlwbGUnLCAnZGVsYXknXVxuICB9LFxuXG4gIGdldEl0ZW1DU1NTZWxlY3RvcjogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAnYSdcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yTGlua1xuIiwidmFyIHdoZW5DYWxsU2VxdWVudGlhbGx5ID0gcmVxdWlyZSgnLi4vLi4vYXNzZXRzL2pxdWVyeS53aGVuY2FsbHNlcXVlbnRpYWxseScpXG52YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciBDc3NTZWxlY3RvciA9IHJlcXVpcmUoJ2Nzcy1zZWxlY3RvcicpLkNzc1NlbGVjdG9yXG52YXIgU2VsZWN0b3JQb3B1cExpbmsgPSB7XG4gIGNhblJldHVybk11bHRpcGxlUmVjb3JkczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUNoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlTG9jYWxDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkNyZWF0ZU5ld0pvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcblxuICAgIHZhciBkZmQgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG5cdFx0Ly8gcmV0dXJuIGVtcHR5IHJlY29yZCBpZiBub3QgbXVsdGlwbGUgdHlwZSBhbmQgbm8gZWxlbWVudHMgZm91bmRcbiAgICBpZiAodGhpcy5tdWx0aXBsZSA9PT0gZmFsc2UgJiYgZWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICBkYXRhW3RoaXMuaWRdID0gbnVsbFxuICAgICAgZGZkLnJlc29sdmUoW2RhdGFdKVxuICAgICAgcmV0dXJuIGRmZFxuICAgIH1cblxuXHRcdC8vIGV4dHJhY3QgbGlua3Mgb25lIGJ5IG9uZVxuICAgIHZhciBkZWZlcnJlZERhdGFFeHRyYWN0aW9uQ2FsbHMgPSBbXVxuICAgICQoZWxlbWVudHMpLmVhY2goZnVuY3Rpb24gKGssIGVsZW1lbnQpIHtcbiAgICAgIGRlZmVycmVkRGF0YUV4dHJhY3Rpb25DYWxscy5wdXNoKGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIHZhciBkZWZlcnJlZERhdGEgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgICAgIHZhciBkYXRhID0ge31cbiAgICAgICAgZGF0YVt0aGlzLmlkXSA9ICQoZWxlbWVudCkudGV4dCgpXG4gICAgICAgIGRhdGEuX2ZvbGxvd1NlbGVjdG9ySWQgPSB0aGlzLmlkXG5cbiAgICAgICAgdmFyIGRlZmVycmVkUG9wdXBVUkwgPSB0aGlzLmdldFBvcHVwVVJMKGVsZW1lbnQpXG4gICAgICAgIGRlZmVycmVkUG9wdXBVUkwuZG9uZShmdW5jdGlvbiAodXJsKSB7XG4gICAgICAgICAgZGF0YVt0aGlzLmlkICsgJy1ocmVmJ10gPSB1cmxcbiAgICAgICAgICBkYXRhLl9mb2xsb3cgPSB1cmxcbiAgICAgICAgICBkZWZlcnJlZERhdGEucmVzb2x2ZShkYXRhKVxuICAgICAgICB9LmJpbmQodGhpcykpXG5cbiAgICAgICAgcmV0dXJuIGRlZmVycmVkRGF0YVxuICAgICAgfS5iaW5kKHRoaXMsIGVsZW1lbnQpKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIHdoZW5DYWxsU2VxdWVudGlhbGx5KGRlZmVycmVkRGF0YUV4dHJhY3Rpb25DYWxscykuZG9uZShmdW5jdGlvbiAocmVzcG9uc2VzKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW11cbiAgICAgIHJlc3BvbnNlcy5mb3JFYWNoKGZ1bmN0aW9uIChkYXRhUmVzdWx0KSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKGRhdGFSZXN1bHQpXG4gICAgICB9KVxuICAgICAgZGZkLnJlc29sdmUocmVzdWx0KVxuICAgIH0pXG5cbiAgICByZXR1cm4gZGZkLnByb21pc2UoKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBHZXRzIGFuIHVybCBmcm9tIGEgd2luZG93Lm9wZW4gY2FsbCBieSBtb2NraW5nIHRoZSB3aW5kb3cub3BlbiBmdW5jdGlvblxuXHQgKiBAcGFyYW0gZWxlbWVudFxuXHQgKiBAcmV0dXJucyAkLkRlZmVycmVkKClcblx0ICovXG4gIGdldFBvcHVwVVJMOiBmdW5jdGlvbiAoZWxlbWVudCkge1xuXHRcdC8vIG92ZXJyaWRlIHdpbmRvdy5vcGVuIGZ1bmN0aW9uLiB3ZSBuZWVkIHRvIGV4ZWN1dGUgdGhpcyBpbiBwYWdlIHNjb3BlLlxuXHRcdC8vIHdlIG5lZWQgdG8ga25vdyBob3cgdG8gZmluZCB0aGlzIGVsZW1lbnQgZnJvbSBwYWdlIHNjb3BlLlxuICAgIHZhciBjcyA9IG5ldyBDc3NTZWxlY3Rvcih7XG4gICAgICBlbmFibGVTbWFydFRhYmxlU2VsZWN0b3I6IGZhbHNlLFxuICAgICAgcGFyZW50OiBkb2N1bWVudC5ib2R5LFxuICAgICAgZW5hYmxlUmVzdWx0U3RyaXBwaW5nOiBmYWxzZVxuICAgIH0pXG4gICAgdmFyIGNzc1NlbGVjdG9yID0gY3MuZ2V0Q3NzU2VsZWN0b3IoW2VsZW1lbnRdKVxuICAgIGNvbnNvbGUubG9nKGNzc1NlbGVjdG9yKVxuICAgIGNvbnNvbGUubG9nKGRvY3VtZW50LmJvZHkucXVlcnlTZWxlY3RvckFsbChjc3NTZWxlY3RvcikpXG5cdFx0Ly8gdGhpcyBmdW5jdGlvbiB3aWxsIGNhdGNoIHdpbmRvdy5vcGVuIGNhbGwgYW5kIHBsYWNlIHRoZSByZXF1ZXN0ZWQgdXJsIGFzIHRoZSBlbGVtZW50cyBkYXRhIGF0dHJpYnV0ZVxuICAgIHZhciBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKVxuICAgIHNjcmlwdC50eXBlID0gJ3RleHQvamF2YXNjcmlwdCdcbiAgICBjb25zb2xlLmxvZyhjc3NTZWxlY3RvcilcbiAgICBjb25zb2xlLmxvZyhkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKGNzc1NlbGVjdG9yKSlcbiAgICBzY3JpcHQudGV4dCA9IGBcblx0XHRcdChmdW5jdGlvbigpe1xuICAgICAgICB2YXIgb3BlbiA9IHdpbmRvdy5vcGVuO1xuICAgICAgICB2YXIgZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcke2Nzc1NlbGVjdG9yfScpWzBdO1xuICAgICAgICB2YXIgb3Blbk5ldyA9IGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgICB2YXIgdXJsID0gYXJndW1lbnRzWzBdOyBcbiAgICAgICAgICBlbC5kYXRhc2V0LndlYlNjcmFwZXJFeHRyYWN0VXJsID0gdXJsOyBcbiAgICAgICAgICB3aW5kb3cub3BlbiA9IG9wZW47IFxuICAgICAgICB9O1xuICAgICAgICB3aW5kb3cub3BlbiA9IG9wZW5OZXc7IFxuICAgICAgICBlbC5jbGljaygpOyBcblx0XHRcdH0pKClgXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzY3JpcHQpXG5cblx0XHQvLyB3YWl0IGZvciB1cmwgdG8gYmUgYXZhaWxhYmxlXG4gICAgdmFyIGRlZmVycmVkVVJMID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgdGltZW91dCA9IE1hdGguYWJzKDUwMDAgLyAzMCkgLy8gNXMgdGltZW91dCB0byBnZW5lcmF0ZSBhbiB1cmwgZm9yIHBvcHVwXG4gICAgdmFyIGludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHVybCA9ICQoZWxlbWVudCkuZGF0YSgnd2ViLXNjcmFwZXItZXh0cmFjdC11cmwnKVxuICAgICAgaWYgKHVybCkge1xuICAgICAgICBkZWZlcnJlZFVSTC5yZXNvbHZlKHVybClcbiAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbClcbiAgICAgICAgc2NyaXB0LnJlbW92ZSgpXG4gICAgICB9XG5cdFx0XHQvLyB0aW1lb3V0IHBvcHVwIG9wZW5pbmdcbiAgICAgIGlmICh0aW1lb3V0LS0gPD0gMCkge1xuICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKVxuICAgICAgICBzY3JpcHQucmVtb3ZlKClcbiAgICAgIH1cbiAgICB9LCAzMClcblxuICAgIHJldHVybiBkZWZlcnJlZFVSTC5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbdGhpcy5pZCwgdGhpcy5pZCArICctaHJlZiddXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydtdWx0aXBsZScsICdkZWxheSddXG4gIH0sXG5cbiAgZ2V0SXRlbUNTU1NlbGVjdG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICcqJ1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JQb3B1cExpbmtcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxuXG52YXIgU2VsZWN0b3JUYWJsZSA9IHtcblxuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgZ2V0VGFibGVIZWFkZXJDb2x1bW5zOiBmdW5jdGlvbiAoJHRhYmxlKSB7XG4gICAgdmFyIGNvbHVtbnMgPSB7fVxuICAgIHZhciBoZWFkZXJSb3dTZWxlY3RvciA9IHRoaXMuZ2V0VGFibGVIZWFkZXJSb3dTZWxlY3RvcigpXG4gICAgdmFyICRoZWFkZXJSb3cgPSAkKCR0YWJsZSkuZmluZChoZWFkZXJSb3dTZWxlY3RvcilcbiAgICBpZiAoJGhlYWRlclJvdy5sZW5ndGggPiAwKSB7XG4gICAgICAkaGVhZGVyUm93LmZpbmQoJ3RkLHRoJykuZWFjaChmdW5jdGlvbiAoaSkge1xuICAgICAgICB2YXIgaGVhZGVyID0gJCh0aGlzKS50ZXh0KCkudHJpbSgpXG4gICAgICAgIGNvbHVtbnNbaGVhZGVyXSA9IHtcbiAgICAgICAgICBpbmRleDogaSArIDFcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG4gICAgcmV0dXJuIGNvbHVtbnNcbiAgfSxcbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgICB2YXIgdGFibGVzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcblxuICAgIHZhciByZXN1bHQgPSBbXVxuICAgICQodGFibGVzKS5lYWNoKGZ1bmN0aW9uIChrLCB0YWJsZSkge1xuICAgICAgdmFyIGNvbHVtbnMgPSB0aGlzLmdldFRhYmxlSGVhZGVyQ29sdW1ucygkKHRhYmxlKSlcblxuICAgICAgdmFyIGRhdGFSb3dTZWxlY3RvciA9IHRoaXMuZ2V0VGFibGVEYXRhUm93U2VsZWN0b3IoKVxuICAgICAgJCh0YWJsZSkuZmluZChkYXRhUm93U2VsZWN0b3IpLmVhY2goZnVuY3Rpb24gKGksIHJvdykge1xuICAgICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICAgIHRoaXMuY29sdW1ucy5mb3JFYWNoKGZ1bmN0aW9uIChjb2x1bW4pIHtcbiAgICAgICAgICBpZiAoY29sdW1uLmV4dHJhY3QgPT09IHRydWUpIHtcbiAgICAgICAgICAgIGlmIChjb2x1bW5zW2NvbHVtbi5oZWFkZXJdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgZGF0YVtjb2x1bW4ubmFtZV0gPSBudWxsXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB2YXIgcm93VGV4dCA9ICQocm93KS5maW5kKCc+Om50aC1jaGlsZCgnICsgY29sdW1uc1tjb2x1bW4uaGVhZGVyXS5pbmRleCArICcpJykudGV4dCgpLnRyaW0oKVxuICAgICAgICAgICAgICBkYXRhW2NvbHVtbi5uYW1lXSA9IHJvd1RleHRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIHJlc3VsdC5wdXNoKGRhdGEpXG4gICAgICB9LmJpbmQodGhpcykpXG4gICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgZGZkLnJlc29sdmUocmVzdWx0KVxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZGF0YUNvbHVtbnMgPSBbXVxuICAgIHRoaXMuY29sdW1ucy5mb3JFYWNoKGZ1bmN0aW9uIChjb2x1bW4pIHtcbiAgICAgIGlmIChjb2x1bW4uZXh0cmFjdCA9PT0gdHJ1ZSkge1xuICAgICAgICBkYXRhQ29sdW1ucy5wdXNoKGNvbHVtbi5uYW1lKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGRhdGFDb2x1bW5zXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydtdWx0aXBsZScsICdjb2x1bW5zJywgJ2RlbGF5JywgJ3RhYmxlRGF0YVJvd1NlbGVjdG9yJywgJ3RhYmxlSGVhZGVyUm93U2VsZWN0b3InXVxuICB9LFxuXG4gIGdldEl0ZW1DU1NTZWxlY3RvcjogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAndGFibGUnXG4gIH0sXG5cbiAgZ2V0VGFibGVIZWFkZXJSb3dTZWxlY3RvckZyb21UYWJsZUhUTUw6IGZ1bmN0aW9uIChodG1sKSB7XG4gICAgdmFyICR0YWJsZSA9ICQoaHRtbClcbiAgICBpZiAoJHRhYmxlLmZpbmQoJ3RoZWFkIHRyOmhhcyh0ZDpub3QoOmVtcHR5KSksIHRoZWFkIHRyOmhhcyh0aDpub3QoOmVtcHR5KSknKS5sZW5ndGgpIHtcbiAgICAgIGlmICgkdGFibGUuZmluZCgndGhlYWQgdHInKS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmV0dXJuICd0aGVhZCB0cidcbiAgICAgIH1cdFx0XHRlbHNlIHtcbiAgICAgICAgdmFyICRyb3dzID0gJHRhYmxlLmZpbmQoJ3RoZWFkIHRyJylcblx0XHRcdFx0Ly8gZmlyc3Qgcm93IHdpdGggZGF0YVxuICAgICAgICB2YXIgcm93SW5kZXggPSAkcm93cy5pbmRleCgkcm93cy5maWx0ZXIoJzpoYXModGQ6bm90KDplbXB0eSkpLDpoYXModGg6bm90KDplbXB0eSkpJylbMF0pXG4gICAgICAgIHJldHVybiAndGhlYWQgdHI6bnRoLW9mLXR5cGUoJyArIChyb3dJbmRleCArIDEpICsgJyknXG4gICAgICB9XG4gICAgfVx0XHRlbHNlIGlmICgkdGFibGUuZmluZCgndHIgdGQ6bm90KDplbXB0eSksIHRyIHRoOm5vdCg6ZW1wdHkpJykubGVuZ3RoKSB7XG4gICAgICB2YXIgJHJvd3MgPSAkdGFibGUuZmluZCgndHInKVxuXHRcdFx0Ly8gZmlyc3Qgcm93IHdpdGggZGF0YVxuICAgICAgdmFyIHJvd0luZGV4ID0gJHJvd3MuaW5kZXgoJHJvd3MuZmlsdGVyKCc6aGFzKHRkOm5vdCg6ZW1wdHkpKSw6aGFzKHRoOm5vdCg6ZW1wdHkpKScpWzBdKVxuICAgICAgcmV0dXJuICd0cjpudGgtb2YtdHlwZSgnICsgKHJvd0luZGV4ICsgMSkgKyAnKSdcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgcmV0dXJuICcnXG4gICAgfVxuICB9LFxuXG4gIGdldFRhYmxlRGF0YVJvd1NlbGVjdG9yRnJvbVRhYmxlSFRNTDogZnVuY3Rpb24gKGh0bWwpIHtcbiAgICB2YXIgJHRhYmxlID0gJChodG1sKVxuICAgIGlmICgkdGFibGUuZmluZCgndGhlYWQgdHI6aGFzKHRkOm5vdCg6ZW1wdHkpKSwgdGhlYWQgdHI6aGFzKHRoOm5vdCg6ZW1wdHkpKScpLmxlbmd0aCkge1xuICAgICAgcmV0dXJuICd0Ym9keSB0cidcbiAgICB9XHRcdGVsc2UgaWYgKCR0YWJsZS5maW5kKCd0ciB0ZDpub3QoOmVtcHR5KSwgdHIgdGg6bm90KDplbXB0eSknKS5sZW5ndGgpIHtcbiAgICAgIHZhciAkcm93cyA9ICR0YWJsZS5maW5kKCd0cicpXG5cdFx0XHQvLyBmaXJzdCByb3cgd2l0aCBkYXRhXG4gICAgICB2YXIgcm93SW5kZXggPSAkcm93cy5pbmRleCgkcm93cy5maWx0ZXIoJzpoYXModGQ6bm90KDplbXB0eSkpLDpoYXModGg6bm90KDplbXB0eSkpJylbMF0pXG4gICAgICByZXR1cm4gJ3RyOm50aC1vZi10eXBlKG4rJyArIChyb3dJbmRleCArIDIpICsgJyknXG4gICAgfVx0XHRlbHNlIHtcbiAgICAgIHJldHVybiAnJ1xuICAgIH1cbiAgfSxcblxuICBnZXRUYWJsZUhlYWRlclJvd1NlbGVjdG9yOiBmdW5jdGlvbiAoKSB7XG5cdFx0Ly8gaGFuZGxlIGxlZ2FjeSBzZWxlY3RvcnNcbiAgICBpZiAodGhpcy50YWJsZUhlYWRlclJvd1NlbGVjdG9yID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiAndGhlYWQgdHInXG4gICAgfVx0XHRlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLnRhYmxlSGVhZGVyUm93U2VsZWN0b3JcbiAgICB9XG4gIH0sXG5cbiAgZ2V0VGFibGVEYXRhUm93U2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcblx0XHQvLyBoYW5kbGUgbGVnYWN5IHNlbGVjdG9yc1xuICAgIGlmICh0aGlzLnRhYmxlRGF0YVJvd1NlbGVjdG9yID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiAndGJvZHkgdHInXG4gICAgfVx0XHRlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLnRhYmxlRGF0YVJvd1NlbGVjdG9yXG4gICAgfVxuICB9LFxuXG5cdC8qKlxuXHQgKiBFeHRyYWN0IHRhYmxlIGhlYWRlciBjb2x1bW4gaW5mbyBmcm9tIGh0bWxcblx0ICogQHBhcmFtIGh0bWxcblx0ICovXG4gIGdldFRhYmxlSGVhZGVyQ29sdW1uc0Zyb21IVE1MOiBmdW5jdGlvbiAoaGVhZGVyUm93U2VsZWN0b3IsIGh0bWwpIHtcbiAgICB2YXIgJHRhYmxlID0gJChodG1sKVxuICAgIHZhciAkaGVhZGVyUm93Q29sdW1ucyA9ICR0YWJsZS5maW5kKGhlYWRlclJvd1NlbGVjdG9yKS5maW5kKCd0ZCx0aCcpXG5cbiAgICB2YXIgY29sdW1ucyA9IFtdXG5cbiAgICAkaGVhZGVyUm93Q29sdW1ucy5lYWNoKGZ1bmN0aW9uIChpLCBjb2x1bW5FbCkge1xuICAgICAgdmFyIGhlYWRlciA9ICQoY29sdW1uRWwpLnRleHQoKS50cmltKClcbiAgICAgIHZhciBuYW1lID0gaGVhZGVyXG4gICAgICBpZiAoaGVhZGVyLmxlbmd0aCAhPT0gMCkge1xuICAgICAgICBjb2x1bW5zLnB1c2goe1xuICAgICAgICAgIGhlYWRlcjogaGVhZGVyLFxuICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgZXh0cmFjdDogdHJ1ZVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGNvbHVtbnNcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yVGFibGVcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxudmFyIFNlbGVjdG9yVGV4dCA9IHtcblxuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuXG4gICAgdmFyIHJlc3VsdCA9IFtdXG4gICAgJChlbGVtZW50cykuZWFjaChmdW5jdGlvbiAoaywgZWxlbWVudCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuXG5cdFx0XHQvLyByZW1vdmUgc2NyaXB0LCBzdHlsZSB0YWcgY29udGVudHMgZnJvbSB0ZXh0IHJlc3VsdHNcbiAgICAgIHZhciAkZWxlbWVudF9jbG9uZSA9ICQoZWxlbWVudCkuY2xvbmUoKVxuICAgICAgJGVsZW1lbnRfY2xvbmUuZmluZCgnc2NyaXB0LCBzdHlsZScpLnJlbW92ZSgpXG5cdFx0XHQvLyA8YnI+IHJlcGxhY2UgYnIgdGFncyB3aXRoIG5ld2xpbmVzXG4gICAgICAkZWxlbWVudF9jbG9uZS5maW5kKCdicicpLmFmdGVyKCdcXG4nKVxuXG4gICAgICB2YXIgdGV4dCA9ICRlbGVtZW50X2Nsb25lLnRleHQoKVxuICAgICAgaWYgKHRoaXMucmVnZXggIT09IHVuZGVmaW5lZCAmJiB0aGlzLnJlZ2V4Lmxlbmd0aCkge1xuICAgICAgICB2YXIgbWF0Y2hlcyA9IHRleHQubWF0Y2gobmV3IFJlZ0V4cCh0aGlzLnJlZ2V4KSlcbiAgICAgICAgaWYgKG1hdGNoZXMgIT09IG51bGwpIHtcbiAgICAgICAgICB0ZXh0ID0gbWF0Y2hlc1swXVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRleHQgPSBudWxsXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGRhdGFbdGhpcy5pZF0gPSB0ZXh0XG5cbiAgICAgIHJlc3VsdC5wdXNoKGRhdGEpXG4gICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgaWYgKHRoaXMubXVsdGlwbGUgPT09IGZhbHNlICYmIGVsZW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuICAgICAgZGF0YVt0aGlzLmlkXSA9IG51bGxcbiAgICAgIHJlc3VsdC5wdXNoKGRhdGEpXG4gICAgfVxuXG4gICAgZGZkLnJlc29sdmUocmVzdWx0KVxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW3RoaXMuaWRdXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydtdWx0aXBsZScsICdyZWdleCcsICdkZWxheSddXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvclRleHRcbiIsInZhciBTZWxlY3RvciA9IHJlcXVpcmUoJy4vU2VsZWN0b3InKVxuXG52YXIgU2VsZWN0b3JMaXN0ID0gZnVuY3Rpb24gKHNlbGVjdG9ycykge1xuICBpZiAoc2VsZWN0b3JzID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZWN0b3JzLmxlbmd0aDsgaSsrKSB7XG4gICAgdGhpcy5wdXNoKHNlbGVjdG9yc1tpXSlcbiAgfVxufVxuXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlID0gbmV3IEFycmF5KClcblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gIGlmICghdGhpcy5oYXNTZWxlY3RvcihzZWxlY3Rvci5pZCkpIHtcbiAgICBpZiAoIShzZWxlY3RvciBpbnN0YW5jZW9mIFNlbGVjdG9yKSkge1xuICAgICAgc2VsZWN0b3IgPSBuZXcgU2VsZWN0b3Ioc2VsZWN0b3IpXG4gICAgfVxuICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmNhbGwodGhpcywgc2VsZWN0b3IpXG4gIH1cbn1cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5oYXNTZWxlY3RvciA9IGZ1bmN0aW9uIChzZWxlY3RvcklkKSB7XG4gIGlmIChzZWxlY3RvcklkIGluc3RhbmNlb2YgT2JqZWN0KSB7XG4gICAgc2VsZWN0b3JJZCA9IHNlbGVjdG9ySWQuaWRcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xuICAgIGlmICh0aGlzW2ldLmlkID09PSBzZWxlY3RvcklkKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2Vcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFsbCBzZWxlY3RvcnMgb3IgcmVjdXJzaXZlbHkgZmluZCBhbmQgcmV0dXJuIGFsbCBjaGlsZCBzZWxlY3RvcnMgb2YgYSBwYXJlbnQgc2VsZWN0b3IuXG4gKiBAcGFyYW0gcGFyZW50U2VsZWN0b3JJZFxuICogQHJldHVybnMge0FycmF5fVxuICovXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmdldEFsbFNlbGVjdG9ycyA9IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3RvcklkKSB7XG4gIGlmIChwYXJlbnRTZWxlY3RvcklkID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgdmFyIGdldEFsbENoaWxkU2VsZWN0b3JzID0gZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9ySWQsIHJlc3VsdFNlbGVjdG9ycykge1xuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgIGlmIChzZWxlY3Rvci5oYXNQYXJlbnRTZWxlY3RvcihwYXJlbnRTZWxlY3RvcklkKSkge1xuICAgICAgICBpZiAocmVzdWx0U2VsZWN0b3JzLmluZGV4T2Yoc2VsZWN0b3IpID09PSAtMSkge1xuICAgICAgICAgIHJlc3VsdFNlbGVjdG9ycy5wdXNoKHNlbGVjdG9yKVxuICAgICAgICAgIGdldEFsbENoaWxkU2VsZWN0b3JzKHNlbGVjdG9yLmlkLCByZXN1bHRTZWxlY3RvcnMpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICB9LmJpbmQodGhpcylcblxuICB2YXIgcmVzdWx0U2VsZWN0b3JzID0gW11cbiAgZ2V0QWxsQ2hpbGRTZWxlY3RvcnMocGFyZW50U2VsZWN0b3JJZCwgcmVzdWx0U2VsZWN0b3JzKVxuICByZXR1cm4gcmVzdWx0U2VsZWN0b3JzXG59XG5cbi8qKlxuICogUmV0dXJucyBvbmx5IHNlbGVjdG9ycyB0aGF0IGFyZSBkaXJlY3RseSB1bmRlciBhIHBhcmVudFxuICogQHBhcmFtIHBhcmVudFNlbGVjdG9ySWRcbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqL1xuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5nZXREaXJlY3RDaGlsZFNlbGVjdG9ycyA9IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3RvcklkKSB7XG4gIHZhciByZXN1bHRTZWxlY3RvcnMgPSBuZXcgU2VsZWN0b3JMaXN0KClcbiAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgIGlmIChzZWxlY3Rvci5oYXNQYXJlbnRTZWxlY3RvcihwYXJlbnRTZWxlY3RvcklkKSkge1xuICAgICAgcmVzdWx0U2VsZWN0b3JzLnB1c2goc2VsZWN0b3IpXG4gICAgfVxuICB9KVxuICByZXR1cm4gcmVzdWx0U2VsZWN0b3JzXG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciByZXN1bHRMaXN0ID0gbmV3IFNlbGVjdG9yTGlzdCgpXG4gIHRoaXMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICByZXN1bHRMaXN0LnB1c2goc2VsZWN0b3IpXG4gIH0pXG4gIHJldHVybiByZXN1bHRMaXN0XG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZnVsbENsb25lID0gZnVuY3Rpb24gKCkge1xuICB2YXIgcmVzdWx0TGlzdCA9IG5ldyBTZWxlY3Rvckxpc3QoKVxuICB0aGlzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgcmVzdWx0TGlzdC5wdXNoKEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoc2VsZWN0b3IpKSlcbiAgfSlcbiAgcmV0dXJuIHJlc3VsdExpc3Rcbn1cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5jb25jYXQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciByZXN1bHRMaXN0ID0gdGhpcy5jbG9uZSgpXG4gIGZvciAodmFyIGkgaW4gYXJndW1lbnRzKSB7XG4gICAgYXJndW1lbnRzW2ldLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICByZXN1bHRMaXN0LnB1c2goc2VsZWN0b3IpXG4gICAgfSlcbiAgfVxuICByZXR1cm4gcmVzdWx0TGlzdFxufVxuXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmdldFNlbGVjdG9yID0gZnVuY3Rpb24gKHNlbGVjdG9ySWQpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHNlbGVjdG9yID0gdGhpc1tpXVxuICAgIGlmIChzZWxlY3Rvci5pZCA9PT0gc2VsZWN0b3JJZCkge1xuICAgICAgcmV0dXJuIHNlbGVjdG9yXG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogUmV0dXJucyBhbGwgc2VsZWN0b3JzIGlmIHRoaXMgc2VsZWN0b3JzIGluY2x1ZGluZyBhbGwgcGFyZW50IHNlbGVjdG9ycyB3aXRoaW4gdGhpcyBwYWdlXG4gKiBAVE9ETyBub3QgdXNlZCBhbnkgbW9yZS5cbiAqIEBwYXJhbSBzZWxlY3RvcklkXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5nZXRPbmVQYWdlU2VsZWN0b3JzID0gZnVuY3Rpb24gKHNlbGVjdG9ySWQpIHtcbiAgdmFyIHJlc3VsdExpc3QgPSBuZXcgU2VsZWN0b3JMaXN0KClcbiAgdmFyIHNlbGVjdG9yID0gdGhpcy5nZXRTZWxlY3RvcihzZWxlY3RvcklkKVxuICByZXN1bHRMaXN0LnB1c2godGhpcy5nZXRTZWxlY3RvcihzZWxlY3RvcklkKSlcblxuXHQvLyByZWN1cnNpdmVseSBmaW5kIGFsbCBwYXJlbnQgc2VsZWN0b3JzIHRoYXQgY291bGQgbGVhZCB0byB0aGUgcGFnZSB3aGVyZSBzZWxlY3RvcklkIGlzIHVzZWQuXG4gIHZhciBmaW5kUGFyZW50U2VsZWN0b3JzID0gZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgc2VsZWN0b3IucGFyZW50U2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9ySWQpIHtcbiAgICAgIGlmIChwYXJlbnRTZWxlY3RvcklkID09PSAnX3Jvb3QnKSByZXR1cm5cbiAgICAgIHZhciBwYXJlbnRTZWxlY3RvciA9IHRoaXMuZ2V0U2VsZWN0b3IocGFyZW50U2VsZWN0b3JJZClcbiAgICAgIGlmIChyZXN1bHRMaXN0LmluZGV4T2YocGFyZW50U2VsZWN0b3IpICE9PSAtMSkgcmV0dXJuXG4gICAgICBpZiAocGFyZW50U2VsZWN0b3Iud2lsbFJldHVybkVsZW1lbnRzKCkpIHtcbiAgICAgICAgcmVzdWx0TGlzdC5wdXNoKHBhcmVudFNlbGVjdG9yKVxuICAgICAgICBmaW5kUGFyZW50U2VsZWN0b3JzKHBhcmVudFNlbGVjdG9yKVxuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfS5iaW5kKHRoaXMpXG5cbiAgZmluZFBhcmVudFNlbGVjdG9ycyhzZWxlY3RvcilcblxuXHQvLyBhZGQgYWxsIGNoaWxkIHNlbGVjdG9yc1xuICByZXN1bHRMaXN0ID0gcmVzdWx0TGlzdC5jb25jYXQodGhpcy5nZXRTaW5nbGVQYWdlQWxsQ2hpbGRTZWxlY3RvcnMoc2VsZWN0b3IuaWQpKVxuICByZXR1cm4gcmVzdWx0TGlzdFxufVxuXG4vKipcbiAqIFJldHVybnMgYWxsIGNoaWxkIHNlbGVjdG9ycyBvZiBhIHNlbGVjdG9yIHdoaWNoIGNhbiBiZSB1c2VkIHdpdGhpbiBvbmUgcGFnZS5cbiAqIEBwYXJhbSBwYXJlbnRTZWxlY3RvcklkXG4gKi9cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZ2V0U2luZ2xlUGFnZUFsbENoaWxkU2VsZWN0b3JzID0gZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9ySWQpIHtcbiAgdmFyIHJlc3VsdExpc3QgPSBuZXcgU2VsZWN0b3JMaXN0KClcbiAgdmFyIGFkZENoaWxkU2VsZWN0b3JzID0gZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9yKSB7XG4gICAgaWYgKHBhcmVudFNlbGVjdG9yLndpbGxSZXR1cm5FbGVtZW50cygpKSB7XG4gICAgICB2YXIgY2hpbGRTZWxlY3RvcnMgPSB0aGlzLmdldERpcmVjdENoaWxkU2VsZWN0b3JzKHBhcmVudFNlbGVjdG9yLmlkKVxuICAgICAgY2hpbGRTZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAoY2hpbGRTZWxlY3Rvcikge1xuICAgICAgICBpZiAocmVzdWx0TGlzdC5pbmRleE9mKGNoaWxkU2VsZWN0b3IpID09PSAtMSkge1xuICAgICAgICAgIHJlc3VsdExpc3QucHVzaChjaGlsZFNlbGVjdG9yKVxuICAgICAgICAgIGFkZENoaWxkU2VsZWN0b3JzKGNoaWxkU2VsZWN0b3IpXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuICB9LmJpbmQodGhpcylcblxuICB2YXIgcGFyZW50U2VsZWN0b3IgPSB0aGlzLmdldFNlbGVjdG9yKHBhcmVudFNlbGVjdG9ySWQpXG4gIGFkZENoaWxkU2VsZWN0b3JzKHBhcmVudFNlbGVjdG9yKVxuICByZXR1cm4gcmVzdWx0TGlzdFxufVxuXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLndpbGxSZXR1cm5NdWx0aXBsZVJlY29yZHMgPSBmdW5jdGlvbiAoc2VsZWN0b3JJZCkge1xuXHQvLyBoYW5kbGUgcmV1cWVzdGVkIHNlbGVjdG9yXG4gIHZhciBzZWxlY3RvciA9IHRoaXMuZ2V0U2VsZWN0b3Ioc2VsZWN0b3JJZClcbiAgaWYgKHNlbGVjdG9yLndpbGxSZXR1cm5NdWx0aXBsZVJlY29yZHMoKSA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiB0cnVlXG4gIH1cblxuXHQvLyBoYW5kbGUgYWxsIGl0cyBjaGlsZCBzZWxlY3RvcnNcbiAgdmFyIGNoaWxkU2VsZWN0b3JzID0gdGhpcy5nZXRBbGxTZWxlY3RvcnMoc2VsZWN0b3JJZClcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZFNlbGVjdG9ycy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBzZWxlY3RvciA9IGNoaWxkU2VsZWN0b3JzW2ldXG4gICAgaWYgKHNlbGVjdG9yLndpbGxSZXR1cm5NdWx0aXBsZVJlY29yZHMoKSA9PT0gdHJ1ZSkge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmFsc2Vcbn1cblxuLyoqXG4gKiBXaGVuIHNlcmlhbGl6aW5nIHRvIEpTT04gY29udmVydCB0byBhbiBhcnJheVxuICogQHJldHVybnMge0FycmF5fVxuICovXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHJlc3VsdCA9IFtdXG4gIHRoaXMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICByZXN1bHQucHVzaChzZWxlY3RvcilcbiAgfSlcbiAgcmV0dXJuIHJlc3VsdFxufVxuXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmdldFNlbGVjdG9yQnlJZCA9IGZ1bmN0aW9uIChzZWxlY3RvcklkKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBzZWxlY3RvciA9IHRoaXNbaV1cbiAgICBpZiAoc2VsZWN0b3IuaWQgPT09IHNlbGVjdG9ySWQpIHtcbiAgICAgIHJldHVybiBzZWxlY3RvclxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIHJldHVybnMgY3NzIHNlbGVjdG9yIGZvciBhIGdpdmVuIGVsZW1lbnQuIGNzcyBzZWxlY3RvciBpbmNsdWRlcyBhbGwgcGFyZW50IGVsZW1lbnQgc2VsZWN0b3JzXG4gKiBAcGFyYW0gc2VsZWN0b3JJZFxuICogQHBhcmFtIHBhcmVudFNlbGVjdG9ySWRzIGFycmF5IG9mIHBhcmVudCBzZWxlY3RvciBpZHMgZnJvbSBkZXZ0b29scyBCcmVhZGN1bWJcbiAqIEByZXR1cm5zIHN0cmluZ1xuICovXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmdldENTU1NlbGVjdG9yV2l0aGluT25lUGFnZSA9IGZ1bmN0aW9uIChzZWxlY3RvcklkLCBwYXJlbnRTZWxlY3Rvcklkcykge1xuICB2YXIgQ1NTU2VsZWN0b3IgPSB0aGlzLmdldFNlbGVjdG9yKHNlbGVjdG9ySWQpLnNlbGVjdG9yXG4gIHZhciBwYXJlbnRDU1NTZWxlY3RvciA9IHRoaXMuZ2V0UGFyZW50Q1NTU2VsZWN0b3JXaXRoaW5PbmVQYWdlKHBhcmVudFNlbGVjdG9ySWRzKVxuICBDU1NTZWxlY3RvciA9IHBhcmVudENTU1NlbGVjdG9yICsgQ1NTU2VsZWN0b3JcblxuICByZXR1cm4gQ1NTU2VsZWN0b3Jcbn1cblxuLyoqXG4gKiByZXR1cm5zIGNzcyBzZWxlY3RvciBmb3IgcGFyZW50IHNlbGVjdG9ycyB0aGF0IGFyZSB3aXRoaW4gb25lIHBhZ2VcbiAqIEBwYXJhbSBwYXJlbnRTZWxlY3RvcklkcyBhcnJheSBvZiBwYXJlbnQgc2VsZWN0b3IgaWRzIGZyb20gZGV2dG9vbHMgQnJlYWRjdW1iXG4gKiBAcmV0dXJucyBzdHJpbmdcbiAqL1xuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5nZXRQYXJlbnRDU1NTZWxlY3RvcldpdGhpbk9uZVBhZ2UgPSBmdW5jdGlvbiAocGFyZW50U2VsZWN0b3JJZHMpIHtcbiAgdmFyIENTU1NlbGVjdG9yID0gJydcblxuICBmb3IgKHZhciBpID0gcGFyZW50U2VsZWN0b3JJZHMubGVuZ3RoIC0gMTsgaSA+IDA7IGktLSkge1xuICAgIHZhciBwYXJlbnRTZWxlY3RvcklkID0gcGFyZW50U2VsZWN0b3JJZHNbaV1cbiAgICB2YXIgcGFyZW50U2VsZWN0b3IgPSB0aGlzLmdldFNlbGVjdG9yKHBhcmVudFNlbGVjdG9ySWQpXG4gICAgaWYgKHBhcmVudFNlbGVjdG9yLndpbGxSZXR1cm5FbGVtZW50cygpKSB7XG4gICAgICBDU1NTZWxlY3RvciA9IHBhcmVudFNlbGVjdG9yLnNlbGVjdG9yICsgJyAnICsgQ1NTU2VsZWN0b3JcbiAgICB9IGVsc2Uge1xuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gQ1NTU2VsZWN0b3Jcbn1cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5oYXNSZWN1cnNpdmVFbGVtZW50U2VsZWN0b3JzID0gZnVuY3Rpb24gKCkge1xuICB2YXIgUmVjdXJzaW9uRm91bmQgPSBmYWxzZVxuXG4gIHRoaXMuZm9yRWFjaChmdW5jdGlvbiAodG9wU2VsZWN0b3IpIHtcbiAgICB2YXIgdmlzaXRlZFNlbGVjdG9ycyA9IFtdXG5cbiAgICB2YXIgY2hlY2tSZWN1cnNpb24gPSBmdW5jdGlvbiAocGFyZW50U2VsZWN0b3IpIHtcblx0XHRcdC8vIGFscmVhZHkgdmlzaXRlZFxuICAgICAgaWYgKHZpc2l0ZWRTZWxlY3RvcnMuaW5kZXhPZihwYXJlbnRTZWxlY3RvcikgIT09IC0xKSB7XG4gICAgICAgIFJlY3Vyc2lvbkZvdW5kID0gdHJ1ZVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgaWYgKHBhcmVudFNlbGVjdG9yLndpbGxSZXR1cm5FbGVtZW50cygpKSB7XG4gICAgICAgIHZpc2l0ZWRTZWxlY3RvcnMucHVzaChwYXJlbnRTZWxlY3RvcilcbiAgICAgICAgdmFyIGNoaWxkU2VsZWN0b3JzID0gdGhpcy5nZXREaXJlY3RDaGlsZFNlbGVjdG9ycyhwYXJlbnRTZWxlY3Rvci5pZClcbiAgICAgICAgY2hpbGRTZWxlY3RvcnMuZm9yRWFjaChjaGVja1JlY3Vyc2lvbilcbiAgICAgICAgdmlzaXRlZFNlbGVjdG9ycy5wb3AoKVxuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKVxuXG4gICAgY2hlY2tSZWN1cnNpb24odG9wU2VsZWN0b3IpXG4gIH0uYmluZCh0aGlzKSlcblxuICByZXR1cm4gUmVjdXJzaW9uRm91bmRcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3Rvckxpc3RcbiIsInZhciBTZWxlY3RvckVsZW1lbnQgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yRWxlbWVudCcpXG52YXIgU2VsZWN0b3JFbGVtZW50QXR0cmlidXRlID0gcmVxdWlyZSgnLi9TZWxlY3Rvci9TZWxlY3RvckVsZW1lbnRBdHRyaWJ1dGUnKVxudmFyIFNlbGVjdG9yRWxlbWVudENsaWNrID0gcmVxdWlyZSgnLi9TZWxlY3Rvci9TZWxlY3RvckVsZW1lbnRDbGljaycpXG52YXIgU2VsZWN0b3JFbGVtZW50U2Nyb2xsID0gcmVxdWlyZSgnLi9TZWxlY3Rvci9TZWxlY3RvckVsZW1lbnRTY3JvbGwnKVxudmFyIFNlbGVjdG9yR3JvdXAgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yR3JvdXAnKVxudmFyIFNlbGVjdG9ySFRNTCA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JIVE1MJylcbnZhciBTZWxlY3RvckltYWdlID0gcmVxdWlyZSgnLi9TZWxlY3Rvci9TZWxlY3RvckltYWdlJylcbnZhciBTZWxlY3RvckxpbmsgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yTGluaycpXG52YXIgU2VsZWN0b3JQb3B1cExpbmsgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yUG9wdXBMaW5rJylcbnZhciBTZWxlY3RvclRhYmxlID0gcmVxdWlyZSgnLi9TZWxlY3Rvci9TZWxlY3RvclRhYmxlJylcbnZhciBTZWxlY3RvclRleHQgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yVGV4dCcpXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBTZWxlY3RvckVsZW1lbnQsXG4gIFNlbGVjdG9yRWxlbWVudEF0dHJpYnV0ZSxcbiAgU2VsZWN0b3JFbGVtZW50Q2xpY2ssXG4gIFNlbGVjdG9yRWxlbWVudFNjcm9sbCxcbiAgU2VsZWN0b3JHcm91cCxcbiAgU2VsZWN0b3JIVE1MLFxuICBTZWxlY3RvckltYWdlLFxuICBTZWxlY3RvckxpbmssXG4gIFNlbGVjdG9yUG9wdXBMaW5rLFxuICBTZWxlY3RvclRhYmxlLFxuICBTZWxlY3RvclRleHRcbn1cbiIsInZhciBTZWxlY3RvciA9IHJlcXVpcmUoJy4vU2VsZWN0b3InKVxudmFyIFNlbGVjdG9yTGlzdCA9IHJlcXVpcmUoJy4vU2VsZWN0b3JMaXN0JylcbnZhciBTaXRlbWFwID0gZnVuY3Rpb24gKHNpdGVtYXBPYmopIHtcbiAgdGhpcy5pbml0RGF0YShzaXRlbWFwT2JqKVxufVxuXG5TaXRlbWFwLnByb3RvdHlwZSA9IHtcblxuICBpbml0RGF0YTogZnVuY3Rpb24gKHNpdGVtYXBPYmopIHtcbiAgICBjb25zb2xlLmxvZyh0aGlzKVxuICAgIGZvciAodmFyIGtleSBpbiBzaXRlbWFwT2JqKSB7XG4gICAgICBjb25zb2xlLmxvZyhrZXkpXG4gICAgICB0aGlzW2tleV0gPSBzaXRlbWFwT2JqW2tleV1cbiAgICB9XG4gICAgY29uc29sZS5sb2codGhpcylcblxuICAgIHZhciBzZWxlY3RvcnMgPSB0aGlzLnNlbGVjdG9yc1xuICAgIHRoaXMuc2VsZWN0b3JzID0gbmV3IFNlbGVjdG9yTGlzdCh0aGlzLnNlbGVjdG9ycylcbiAgfSxcblxuXHQvKipcblx0ICogUmV0dXJucyBhbGwgc2VsZWN0b3JzIG9yIHJlY3Vyc2l2ZWx5IGZpbmQgYW5kIHJldHVybiBhbGwgY2hpbGQgc2VsZWN0b3JzIG9mIGEgcGFyZW50IHNlbGVjdG9yLlxuXHQgKiBAcGFyYW0gcGFyZW50U2VsZWN0b3JJZFxuXHQgKiBAcmV0dXJucyB7QXJyYXl9XG5cdCAqL1xuICBnZXRBbGxTZWxlY3RvcnM6IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3RvcklkKSB7XG4gICAgcmV0dXJuIHRoaXMuc2VsZWN0b3JzLmdldEFsbFNlbGVjdG9ycyhwYXJlbnRTZWxlY3RvcklkKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIG9ubHkgc2VsZWN0b3JzIHRoYXQgYXJlIGRpcmVjdGx5IHVuZGVyIGEgcGFyZW50XG5cdCAqIEBwYXJhbSBwYXJlbnRTZWxlY3RvcklkXG5cdCAqIEByZXR1cm5zIHtBcnJheX1cblx0ICovXG4gIGdldERpcmVjdENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAocGFyZW50U2VsZWN0b3JJZCkge1xuICAgIHJldHVybiB0aGlzLnNlbGVjdG9ycy5nZXREaXJlY3RDaGlsZFNlbGVjdG9ycyhwYXJlbnRTZWxlY3RvcklkKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIGFsbCBzZWxlY3RvciBpZCBwYXJhbWV0ZXJzXG5cdCAqIEByZXR1cm5zIHtBcnJheX1cblx0ICovXG4gIGdldFNlbGVjdG9ySWRzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGlkcyA9IFsnX3Jvb3QnXVxuICAgIHRoaXMuc2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICBpZHMucHVzaChzZWxlY3Rvci5pZClcbiAgICB9KVxuICAgIHJldHVybiBpZHNcbiAgfSxcblxuXHQvKipcblx0ICogUmV0dXJucyBvbmx5IHNlbGVjdG9yIGlkcyB3aGljaCBjYW4gaGF2ZSBjaGlsZCBzZWxlY3RvcnNcblx0ICogQHJldHVybnMge0FycmF5fVxuXHQgKi9cbiAgZ2V0UG9zc2libGVQYXJlbnRTZWxlY3RvcklkczogZnVuY3Rpb24gKCkge1xuICAgIHZhciBpZHMgPSBbJ19yb290J11cbiAgICB0aGlzLnNlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgaWYgKHNlbGVjdG9yLmNhbkhhdmVDaGlsZFNlbGVjdG9ycygpKSB7XG4gICAgICAgIGlkcy5wdXNoKHNlbGVjdG9yLmlkKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGlkc1xuICB9LFxuXG4gIGdldFN0YXJ0VXJsczogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdGFydFVybHMgPSB0aGlzLnN0YXJ0VXJsXG5cdFx0Ly8gc2luZ2xlIHN0YXJ0IHVybFxuICAgIGlmICh0aGlzLnN0YXJ0VXJsLnB1c2ggPT09IHVuZGVmaW5lZCkge1xuICAgICAgc3RhcnRVcmxzID0gW3N0YXJ0VXJsc11cbiAgICB9XG5cbiAgICB2YXIgdXJscyA9IFtdXG4gICAgc3RhcnRVcmxzLmZvckVhY2goZnVuY3Rpb24gKHN0YXJ0VXJsKSB7XG5cdFx0XHQvLyB6ZXJvIHBhZGRpbmcgaGVscGVyXG4gICAgICB2YXIgbHBhZCA9IGZ1bmN0aW9uIChzdHIsIGxlbmd0aCkge1xuICAgICAgICB3aGlsZSAoc3RyLmxlbmd0aCA8IGxlbmd0aCkgeyBzdHIgPSAnMCcgKyBzdHIgfVxuICAgICAgICByZXR1cm4gc3RyXG4gICAgICB9XG5cbiAgICAgIHZhciByZSA9IC9eKC4qPylcXFsoXFxkKylcXC0oXFxkKykoOihcXGQrKSk/XFxdKC4qKSQvXG4gICAgICB2YXIgbWF0Y2hlcyA9IHN0YXJ0VXJsLm1hdGNoKHJlKVxuICAgICAgaWYgKG1hdGNoZXMpIHtcbiAgICAgICAgdmFyIHN0YXJ0U3RyID0gbWF0Y2hlc1syXVxuICAgICAgICB2YXIgZW5kU3RyID0gbWF0Y2hlc1szXVxuICAgICAgICB2YXIgc3RhcnQgPSBwYXJzZUludChzdGFydFN0cilcbiAgICAgICAgdmFyIGVuZCA9IHBhcnNlSW50KGVuZFN0cilcbiAgICAgICAgdmFyIGluY3JlbWVudGFsID0gMVxuICAgICAgICBjb25zb2xlLmxvZyhtYXRjaGVzWzVdKVxuICAgICAgICBpZiAobWF0Y2hlc1s1XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaW5jcmVtZW50YWwgPSBwYXJzZUludChtYXRjaGVzWzVdKVxuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSBzdGFydDsgaSA8PSBlbmQ7IGkgKz0gaW5jcmVtZW50YWwpIHtcblx0XHRcdFx0XHQvLyB3aXRoIHplcm8gcGFkZGluZ1xuICAgICAgICAgIGlmIChzdGFydFN0ci5sZW5ndGggPT09IGVuZFN0ci5sZW5ndGgpIHtcbiAgICAgICAgICAgIHVybHMucHVzaChtYXRjaGVzWzFdICsgbHBhZChpLnRvU3RyaW5nKCksIHN0YXJ0U3RyLmxlbmd0aCkgKyBtYXRjaGVzWzZdKVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB1cmxzLnB1c2gobWF0Y2hlc1sxXSArIGkgKyBtYXRjaGVzWzZdKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXJsc1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdXJscy5wdXNoKHN0YXJ0VXJsKVxuICAgICAgfVxuICAgIH0pXG5cbiAgICByZXR1cm4gdXJsc1xuICB9LFxuXG4gIHVwZGF0ZVNlbGVjdG9yOiBmdW5jdGlvbiAoc2VsZWN0b3IsIHNlbGVjdG9yRGF0YSkge1xuXHRcdC8vIHNlbGVjdG9yIGlzIHVuZGVmaW5lZCB3aGVuIGNyZWF0aW5nIGEgbmV3IG9uZVxuICAgIGlmIChzZWxlY3RvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBzZWxlY3RvciA9IG5ldyBTZWxlY3RvcihzZWxlY3RvckRhdGEpXG4gICAgfVxuXG5cdFx0Ly8gdXBkYXRlIGNoaWxkIHNlbGVjdG9yc1xuICAgIGlmIChzZWxlY3Rvci5pZCAhPT0gdW5kZWZpbmVkICYmIHNlbGVjdG9yLmlkICE9PSBzZWxlY3RvckRhdGEuaWQpIHtcbiAgICAgIHRoaXMuc2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKGN1cnJlbnRTZWxlY3Rvcikge1xuICAgICAgICBjdXJyZW50U2VsZWN0b3IucmVuYW1lUGFyZW50U2VsZWN0b3Ioc2VsZWN0b3IuaWQsIHNlbGVjdG9yRGF0YS5pZClcbiAgICAgIH0pXG5cblx0XHRcdC8vIHVwZGF0ZSBjeWNsaWMgc2VsZWN0b3JcbiAgICAgIHZhciBwb3MgPSBzZWxlY3RvckRhdGEucGFyZW50U2VsZWN0b3JzLmluZGV4T2Yoc2VsZWN0b3IuaWQpXG4gICAgICBpZiAocG9zICE9PSAtMSkge1xuICAgICAgICBzZWxlY3RvckRhdGEucGFyZW50U2VsZWN0b3JzLnNwbGljZShwb3MsIDEsIHNlbGVjdG9yRGF0YS5pZClcbiAgICAgIH1cbiAgICB9XG5cbiAgICBzZWxlY3Rvci51cGRhdGVEYXRhKHNlbGVjdG9yRGF0YSlcblxuICAgIGlmICh0aGlzLmdldFNlbGVjdG9ySWRzKCkuaW5kZXhPZihzZWxlY3Rvci5pZCkgPT09IC0xKSB7XG4gICAgICB0aGlzLnNlbGVjdG9ycy5wdXNoKHNlbGVjdG9yKVxuICAgIH1cbiAgfSxcbiAgZGVsZXRlU2VsZWN0b3I6IGZ1bmN0aW9uIChzZWxlY3RvclRvRGVsZXRlKSB7XG4gICAgdGhpcy5zZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgIGlmIChzZWxlY3Rvci5oYXNQYXJlbnRTZWxlY3RvcihzZWxlY3RvclRvRGVsZXRlLmlkKSkge1xuICAgICAgICBzZWxlY3Rvci5yZW1vdmVQYXJlbnRTZWxlY3RvcihzZWxlY3RvclRvRGVsZXRlLmlkKVxuICAgICAgICBpZiAoc2VsZWN0b3IucGFyZW50U2VsZWN0b3JzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIHRoaXMuZGVsZXRlU2VsZWN0b3Ioc2VsZWN0b3IpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICBmb3IgKHZhciBpIGluIHRoaXMuc2VsZWN0b3JzKSB7XG4gICAgICBpZiAodGhpcy5zZWxlY3RvcnNbaV0uaWQgPT09IHNlbGVjdG9yVG9EZWxldGUuaWQpIHtcbiAgICAgICAgdGhpcy5zZWxlY3RvcnMuc3BsaWNlKGksIDEpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuICB9LFxuICBnZXREYXRhVGFibGVJZDogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9pZC5yZXBsYWNlKC9cXC4vZywgJ18nKVxuICB9LFxuICBleHBvcnRTaXRlbWFwOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNpdGVtYXBPYmogPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMpKVxuICAgIGRlbGV0ZSBzaXRlbWFwT2JqLl9yZXZcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoc2l0ZW1hcE9iailcbiAgfSxcbiAgaW1wb3J0U2l0ZW1hcDogZnVuY3Rpb24gKHNpdGVtYXBKU09OKSB7XG4gICAgdmFyIHNpdGVtYXBPYmogPSBKU09OLnBhcnNlKHNpdGVtYXBKU09OKVxuICAgIHRoaXMuaW5pdERhdGEoc2l0ZW1hcE9iailcbiAgfSxcblx0Ly8gcmV0dXJuIGEgbGlzdCBvZiBjb2x1bW5zIHRoYW4gY2FuIGJlIGV4cG9ydGVkXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNvbHVtbnMgPSBbXVxuICAgIHRoaXMuc2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICBjb2x1bW5zID0gY29sdW1ucy5jb25jYXQoc2VsZWN0b3IuZ2V0RGF0YUNvbHVtbnMoKSlcbiAgICB9KVxuXG4gICAgcmV0dXJuIGNvbHVtbnNcbiAgfSxcbiAgZ2V0RGF0YUV4cG9ydENzdkJsb2I6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdmFyIGNvbHVtbnMgPSB0aGlzLmdldERhdGFDb2x1bW5zKCksXG4gICAgICBkZWxpbWl0ZXIgPSAnLCcsXG4gICAgICBuZXdsaW5lID0gJ1xcbicsXG4gICAgICBjc3ZEYXRhID0gWydcXHVmZWZmJ10gLy8gdXRmLTggYm9tIGNoYXJcblxuXHRcdC8vIGhlYWRlclxuICAgIGNzdkRhdGEucHVzaChjb2x1bW5zLmpvaW4oZGVsaW1pdGVyKSArIG5ld2xpbmUpXG5cblx0XHQvLyBkYXRhXG4gICAgZGF0YS5mb3JFYWNoKGZ1bmN0aW9uIChyb3cpIHtcbiAgICAgIHZhciByb3dEYXRhID0gW11cbiAgICAgIGNvbHVtbnMuZm9yRWFjaChmdW5jdGlvbiAoY29sdW1uKSB7XG4gICAgICAgIHZhciBjZWxsRGF0YSA9IHJvd1tjb2x1bW5dXG4gICAgICAgIGlmIChjZWxsRGF0YSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY2VsbERhdGEgPSAnJ1xuICAgICAgICB9XHRcdFx0XHRlbHNlIGlmICh0eXBlb2YgY2VsbERhdGEgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgY2VsbERhdGEgPSBKU09OLnN0cmluZ2lmeShjZWxsRGF0YSlcbiAgICAgICAgfVxuXG4gICAgICAgIHJvd0RhdGEucHVzaCgnXCInICsgY2VsbERhdGEucmVwbGFjZSgvXCIvZywgJ1wiXCInKS50cmltKCkgKyAnXCInKVxuICAgICAgfSlcbiAgICAgIGNzdkRhdGEucHVzaChyb3dEYXRhLmpvaW4oZGVsaW1pdGVyKSArIG5ld2xpbmUpXG4gICAgfSlcblxuICAgIHJldHVybiBuZXcgQmxvYihjc3ZEYXRhLCB7dHlwZTogJ3RleHQvY3N2J30pXG4gIH0sXG4gIGdldFNlbGVjdG9yQnlJZDogZnVuY3Rpb24gKHNlbGVjdG9ySWQpIHtcbiAgICByZXR1cm4gdGhpcy5zZWxlY3RvcnMuZ2V0U2VsZWN0b3JCeUlkKHNlbGVjdG9ySWQpXG4gIH0sXG5cdC8qKlxuXHQgKiBDcmVhdGUgZnVsbCBjbG9uZSBvZiBzaXRlbWFwXG5cdCAqIEByZXR1cm5zIHtTaXRlbWFwfVxuXHQgKi9cbiAgY2xvbmU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2xvbmVkSlNPTiA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcykpXG4gICAgdmFyIHNpdGVtYXAgPSBuZXcgU2l0ZW1hcChjbG9uZWRKU09OKVxuICAgIHJldHVybiBzaXRlbWFwXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTaXRlbWFwXG4iLCJ2YXIgU2l0ZW1hcCA9IHJlcXVpcmUoJy4vU2l0ZW1hcCcpXG5cbnZhciBTdG9yZSA9IGZ1bmN0aW9uIChjb25maWcpIHtcbiAgdGhpcy5jb25maWcgPSBjb25maWdcblxuICAgIC8vIGNvbmZpZ3VyZSBjb3VjaGRiXG4gIHRoaXMuc2l0ZW1hcERiID0gbmV3IFBvdWNoREIodGhpcy5jb25maWcuc2l0ZW1hcERiKVxufVxuXG52YXIgU3RvcmVTY3JhcGVSZXN1bHRXcml0ZXIgPSBmdW5jdGlvbiAoZGIpIHtcbiAgdGhpcy5kYiA9IGRiXG59XG5cblN0b3JlU2NyYXBlUmVzdWx0V3JpdGVyLnByb3RvdHlwZSA9IHtcbiAgd3JpdGVEb2NzOiBmdW5jdGlvbiAoZG9jcywgY2FsbGJhY2spIHtcbiAgICBpZiAoZG9jcy5sZW5ndGggPT09IDApIHtcbiAgICAgIGNhbGxiYWNrKClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5kYi5idWxrRG9jcyh7ZG9jczogZG9jc30sIGZ1bmN0aW9uIChlcnIsIHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChlcnIgIT09IG51bGwpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3Igd2hpbGUgcGVyc2lzdGluZyBzY3JhcGVkIGRhdGEgdG8gZGInLCBlcnIpXG4gICAgICAgIH1cbiAgICAgICAgY2FsbGJhY2soKVxuICAgICAgfSlcbiAgICB9XG4gIH1cbn1cblxuU3RvcmUucHJvdG90eXBlID0ge1xuXG4gIHNhbml0aXplU2l0ZW1hcERhdGFEYk5hbWU6IGZ1bmN0aW9uIChkYk5hbWUpIHtcbiAgICByZXR1cm4gJ3NpdGVtYXAtZGF0YS0nICsgZGJOYW1lLnJlcGxhY2UoL1teYS16MC05X1xcJFxcKFxcKVxcK1xcLS9dL2dpLCAnXycpXG4gIH0sXG4gIGdldFNpdGVtYXBEYXRhRGJMb2NhdGlvbjogZnVuY3Rpb24gKHNpdGVtYXBJZCkge1xuICAgIHZhciBkYk5hbWUgPSB0aGlzLnNhbml0aXplU2l0ZW1hcERhdGFEYk5hbWUoc2l0ZW1hcElkKVxuICAgIHJldHVybiB0aGlzLmNvbmZpZy5kYXRhRGIgKyBkYk5hbWVcbiAgfSxcbiAgZ2V0U2l0ZW1hcERhdGFEYjogZnVuY3Rpb24gKHNpdGVtYXBJZCkge1xuICAgIHZhciBkYkxvY2F0aW9uID0gdGhpcy5nZXRTaXRlbWFwRGF0YURiTG9jYXRpb24oc2l0ZW1hcElkKVxuICAgIHJldHVybiBuZXcgUG91Y2hEQihkYkxvY2F0aW9uKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBjcmVhdGVzIG9yIGNsZWFycyBhIHNpdGVtYXAgZGJcblx0ICogQHBhcmFtIHt0eXBlfSBzaXRlbWFwSWRcblx0ICogQHJldHVybnMge3VuZGVmaW5lZH1cblx0ICovXG4gIGluaXRTaXRlbWFwRGF0YURiOiBmdW5jdGlvbiAoc2l0ZW1hcElkLCBjYWxsYmFjaykge1xuICAgIHZhciBkYkxvY2F0aW9uID0gdGhpcy5nZXRTaXRlbWFwRGF0YURiTG9jYXRpb24oc2l0ZW1hcElkKVxuICAgIHZhciBzdG9yZSA9IHRoaXNcblxuICAgIFBvdWNoREIuZGVzdHJveShkYkxvY2F0aW9uLCBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgZGIgPSBzdG9yZS5nZXRTaXRlbWFwRGF0YURiKHNpdGVtYXBJZClcbiAgICAgIHZhciBkYldyaXRlciA9IG5ldyBTdG9yZVNjcmFwZVJlc3VsdFdyaXRlcihkYilcbiAgICAgIGNhbGxiYWNrKGRiV3JpdGVyKVxuICAgIH0pXG4gIH0sXG5cbiAgY3JlYXRlU2l0ZW1hcDogZnVuY3Rpb24gKHNpdGVtYXAsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNpdGVtYXBKc29uID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzaXRlbWFwKSlcblxuICAgIGlmICghc2l0ZW1hcC5faWQpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdjYW5ub3Qgc2F2ZSBzaXRlbWFwIHdpdGhvdXQgYW4gaWQnLCBzaXRlbWFwKVxuICAgIH1cblxuICAgIHRoaXMuc2l0ZW1hcERiLnB1dChzaXRlbWFwSnNvbiwgZnVuY3Rpb24gKHNpdGVtYXAsIGVyciwgcmVzcG9uc2UpIHtcbiAgICAgICAgICAgIC8vIEBUT0RPIGhhbmRsZSBlcnJcbiAgICAgIHNpdGVtYXAuX3JldiA9IHJlc3BvbnNlLnJldlxuICAgICAgY2FsbGJhY2soc2l0ZW1hcClcbiAgICB9LmJpbmQodGhpcywgc2l0ZW1hcCkpXG4gIH0sXG4gIHNhdmVTaXRlbWFwOiBmdW5jdGlvbiAoc2l0ZW1hcCwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gQFRPRE8gcmVtb3ZlXG4gICAgdGhpcy5jcmVhdGVTaXRlbWFwKHNpdGVtYXAsIGNhbGxiYWNrKVxuICB9LFxuICBkZWxldGVTaXRlbWFwOiBmdW5jdGlvbiAoc2l0ZW1hcCwgY2FsbGJhY2spIHtcbiAgICBzaXRlbWFwID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzaXRlbWFwKSlcblxuICAgIHRoaXMuc2l0ZW1hcERiLnJlbW92ZShzaXRlbWFwLCBmdW5jdGlvbiAoZXJyLCByZXNwb25zZSkge1xuICAgICAgICAgICAgLy8gQFRPRE8gaGFuZGxlIGVyclxuXG5cdFx0XHQvLyBkZWxldGUgc2l0ZW1hcCBkYXRhIGRiXG4gICAgICB2YXIgZGJMb2NhdGlvbiA9IHRoaXMuZ2V0U2l0ZW1hcERhdGFEYkxvY2F0aW9uKHNpdGVtYXAuX2lkKVxuICAgICAgUG91Y2hEQi5kZXN0cm95KGRiTG9jYXRpb24sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY2FsbGJhY2soKVxuICAgICAgfSlcbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG4gIGdldEFsbFNpdGVtYXBzOiBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICB0aGlzLnNpdGVtYXBEYi5hbGxEb2NzKHtpbmNsdWRlX2RvY3M6IHRydWV9LCBmdW5jdGlvbiAoZXJyLCByZXNwb25zZSkge1xuICAgICAgdmFyIHNpdGVtYXBzID0gW11cbiAgICAgIGZvciAodmFyIGkgaW4gcmVzcG9uc2Uucm93cykge1xuICAgICAgICB2YXIgc2l0ZW1hcCA9IHJlc3BvbnNlLnJvd3NbaV0uZG9jXG4gICAgICAgIGlmICghY2hyb21lLmV4dGVuc2lvbikge1xuICAgICAgICAgIHNpdGVtYXAgPSBuZXcgU2l0ZW1hcChzaXRlbWFwKVxuICAgICAgICB9XG5cbiAgICAgICAgc2l0ZW1hcHMucHVzaChzaXRlbWFwKVxuICAgICAgfVxuICAgICAgY2FsbGJhY2soc2l0ZW1hcHMpXG4gICAgfSlcbiAgfSxcblxuICBnZXRTaXRlbWFwRGF0YTogZnVuY3Rpb24gKHNpdGVtYXAsIGNhbGxiYWNrKSB7XG4gICAgdmFyIGRiID0gdGhpcy5nZXRTaXRlbWFwRGF0YURiKHNpdGVtYXAuX2lkKVxuICAgIGRiLmFsbERvY3Moe2luY2x1ZGVfZG9jczogdHJ1ZX0sIGZ1bmN0aW9uIChlcnIsIHJlc3BvbnNlKSB7XG4gICAgICB2YXIgcmVzcG9uc2VEYXRhID0gW11cbiAgICAgIGZvciAodmFyIGkgaW4gcmVzcG9uc2Uucm93cykge1xuICAgICAgICB2YXIgZG9jID0gcmVzcG9uc2Uucm93c1tpXS5kb2NcbiAgICAgICAgcmVzcG9uc2VEYXRhLnB1c2goZG9jKVxuICAgICAgfVxuICAgICAgY2FsbGJhY2socmVzcG9uc2VEYXRhKVxuICAgIH0pXG4gIH0sXG5cdC8vIEBUT0RPIG1ha2UgdGhpcyBjYWxsIGxpZ2h0ZXJcbiAgc2l0ZW1hcEV4aXN0czogZnVuY3Rpb24gKHNpdGVtYXBJZCwgY2FsbGJhY2spIHtcbiAgICB0aGlzLmdldEFsbFNpdGVtYXBzKGZ1bmN0aW9uIChzaXRlbWFwcykge1xuICAgICAgdmFyIHNpdGVtYXBGb3VuZCA9IGZhbHNlXG4gICAgICBmb3IgKHZhciBpIGluIHNpdGVtYXBzKSB7XG4gICAgICAgIGlmIChzaXRlbWFwc1tpXS5faWQgPT09IHNpdGVtYXBJZCkge1xuICAgICAgICAgIHNpdGVtYXBGb3VuZCA9IHRydWVcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY2FsbGJhY2soc2l0ZW1hcEZvdW5kKVxuICAgIH0pXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTdG9yZVxuIiwidmFyIENzc1NlbGVjdG9yID0gcmVxdWlyZSgnY3NzLXNlbGVjdG9yJykuQ3NzU2VsZWN0b3Jcbi8vIFRPRE8gZ2V0IHJpZCBvZiBqcXVlcnlcblxuLyoqXG4gKiBPbmx5IEVsZW1lbnRzIHVuaXF1ZSB3aWxsIGJlIGFkZGVkIHRvIHRoaXMgYXJyYXlcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBVbmlxdWVFbGVtZW50TGlzdCAoY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUpIHtcbiAgdGhpcy5jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSA9IGNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlXG4gIHRoaXMuYWRkZWRFbGVtZW50cyA9IHt9XG59XG5cblVuaXF1ZUVsZW1lbnRMaXN0LnByb3RvdHlwZSA9IFtdXG5cblVuaXF1ZUVsZW1lbnRMaXN0LnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgaWYgKHRoaXMuaXNBZGRlZChlbGVtZW50KSkge1xuICAgIHJldHVybiBmYWxzZVxuICB9IGVsc2Uge1xuICAgIHZhciBlbGVtZW50VW5pcXVlSWQgPSB0aGlzLmdldEVsZW1lbnRVbmlxdWVJZChlbGVtZW50KVxuICAgIHRoaXMuYWRkZWRFbGVtZW50c1tlbGVtZW50VW5pcXVlSWRdID0gdHJ1ZVxuICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmNhbGwodGhpcywgJChlbGVtZW50KS5jbG9uZSh0cnVlKVswXSlcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG59XG5cblVuaXF1ZUVsZW1lbnRMaXN0LnByb3RvdHlwZS5nZXRFbGVtZW50VW5pcXVlSWQgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICBpZiAodGhpcy5jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSA9PT0gJ3VuaXF1ZVRleHQnKSB7XG4gICAgdmFyIGVsZW1lbnRUZXh0ID0gJChlbGVtZW50KS50ZXh0KCkudHJpbSgpXG4gICAgcmV0dXJuIGVsZW1lbnRUZXh0XG4gIH0gZWxzZSBpZiAodGhpcy5jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSA9PT0gJ3VuaXF1ZUhUTUxUZXh0Jykge1xuICAgIHZhciBlbGVtZW50SFRNTCA9ICQoXCI8ZGl2IGNsYXNzPSctd2ViLXNjcmFwZXItc2hvdWxkLW5vdC1iZS12aXNpYmxlJz5cIikuYXBwZW5kKCQoZWxlbWVudCkuZXEoMCkuY2xvbmUoKSkuaHRtbCgpXG4gICAgcmV0dXJuIGVsZW1lbnRIVE1MXG4gIH0gZWxzZSBpZiAodGhpcy5jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSA9PT0gJ3VuaXF1ZUhUTUwnKSB7XG5cdFx0Ly8gZ2V0IGVsZW1lbnQgd2l0aG91dCB0ZXh0XG4gICAgdmFyICRlbGVtZW50ID0gJChlbGVtZW50KS5lcSgwKS5jbG9uZSgpXG5cbiAgICB2YXIgcmVtb3ZlVGV4dCA9IGZ1bmN0aW9uICgkZWxlbWVudCkge1xuICAgICAgJGVsZW1lbnQuY29udGVudHMoKVxuXHRcdFx0XHQuZmlsdGVyKGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMubm9kZVR5cGUgIT09IDMpIHtcbiAgICByZW1vdmVUZXh0KCQodGhpcykpXG4gIH1cbiAgcmV0dXJuIHRoaXMubm9kZVR5cGUgPT0gMyAvLyBOb2RlLlRFWFRfTk9ERVxufSkucmVtb3ZlKClcbiAgICB9XG4gICAgcmVtb3ZlVGV4dCgkZWxlbWVudClcblxuICAgIHZhciBlbGVtZW50SFRNTCA9ICQoXCI8ZGl2IGNsYXNzPSctd2ViLXNjcmFwZXItc2hvdWxkLW5vdC1iZS12aXNpYmxlJz5cIikuYXBwZW5kKCRlbGVtZW50KS5odG1sKClcbiAgICByZXR1cm4gZWxlbWVudEhUTUxcbiAgfSBlbHNlIGlmICh0aGlzLmNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlID09PSAndW5pcXVlQ1NTU2VsZWN0b3InKSB7XG4gICAgdmFyIGNzID0gbmV3IENzc1NlbGVjdG9yKHtcbiAgICAgIGVuYWJsZVNtYXJ0VGFibGVTZWxlY3RvcjogZmFsc2UsXG4gICAgICBwYXJlbnQ6ICQoJ2JvZHknKVswXSxcbiAgICAgIGVuYWJsZVJlc3VsdFN0cmlwcGluZzogZmFsc2VcbiAgICB9KVxuICAgIHZhciBDU1NTZWxlY3RvciA9IGNzLmdldENzc1NlbGVjdG9yKFtlbGVtZW50XSlcbiAgICByZXR1cm4gQ1NTU2VsZWN0b3JcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyAnSW52YWxpZCBjbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSAnICsgdGhpcy5jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVW5pcXVlRWxlbWVudExpc3RcblxuVW5pcXVlRWxlbWVudExpc3QucHJvdG90eXBlLmlzQWRkZWQgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICB2YXIgZWxlbWVudFVuaXF1ZUlkID0gdGhpcy5nZXRFbGVtZW50VW5pcXVlSWQoZWxlbWVudClcbiAgdmFyIGlzQWRkZWQgPSBlbGVtZW50VW5pcXVlSWQgaW4gdGhpcy5hZGRlZEVsZW1lbnRzXG4gIHJldHVybiBpc0FkZGVkXG59XG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciBCYWNrZ3JvdW5kU2NyaXB0ID0gcmVxdWlyZSgnLi9CYWNrZ3JvdW5kU2NyaXB0Jylcbi8qKlxuICogQHBhcmFtIGxvY2F0aW9uXHRjb25maWd1cmUgZnJvbSB3aGVyZSB0aGUgY29udGVudCBzY3JpcHQgaXMgYmVpbmcgYWNjZXNzZWQgKENvbnRlbnRTY3JpcHQsIEJhY2tncm91bmRQYWdlLCBEZXZUb29scylcbiAqIEByZXR1cm5zIEJhY2tncm91bmRTY3JpcHRcbiAqL1xudmFyIGdldEJhY2tncm91bmRTY3JpcHQgPSBmdW5jdGlvbiAobG9jYXRpb24pIHtcbiAgLy8gSGFuZGxlIGNhbGxzIGZyb20gZGlmZmVyZW50IHBsYWNlc1xuICBpZiAobG9jYXRpb24gPT09ICdCYWNrZ3JvdW5kU2NyaXB0Jykge1xuICAgIHJldHVybiBCYWNrZ3JvdW5kU2NyaXB0XG4gIH0gZWxzZSBpZiAobG9jYXRpb24gPT09ICdEZXZUb29scycgfHwgbG9jYXRpb24gPT09ICdDb250ZW50U2NyaXB0Jykge1xuICAgIC8vIGlmIGNhbGxlZCB3aXRoaW4gYmFja2dyb3VuZCBzY3JpcHQgcHJveHkgY2FsbHMgdG8gY29udGVudCBzY3JpcHRcbiAgICB2YXIgYmFja2dyb3VuZFNjcmlwdCA9IHt9XG5cbiAgICBPYmplY3Qua2V5cyhCYWNrZ3JvdW5kU2NyaXB0KS5mb3JFYWNoKGZ1bmN0aW9uIChhdHRyKSB7XG4gICAgICBpZiAodHlwZW9mIEJhY2tncm91bmRTY3JpcHRbYXR0cl0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgYmFja2dyb3VuZFNjcmlwdFthdHRyXSA9IGZ1bmN0aW9uIChyZXF1ZXN0KSB7XG4gICAgICAgICAgdmFyIHJlcVRvQmFja2dyb3VuZFNjcmlwdCA9IHtcbiAgICAgICAgICAgIGJhY2tncm91bmRTY3JpcHRDYWxsOiB0cnVlLFxuICAgICAgICAgICAgZm46IGF0dHIsXG4gICAgICAgICAgICByZXF1ZXN0OiByZXF1ZXN0XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgICAgICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UocmVxVG9CYWNrZ3JvdW5kU2NyaXB0LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZShyZXNwb25zZSlcbiAgICAgICAgICB9KVxuXG4gICAgICAgICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2VcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYmFja2dyb3VuZFNjcmlwdFthdHRyXSA9IEJhY2tncm91bmRTY3JpcHRbYXR0cl1cbiAgICAgIH1cbiAgICB9KVxuXG4gICAgcmV0dXJuIGJhY2tncm91bmRTY3JpcHRcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgQmFja2dyb3VuZFNjcmlwdCBpbml0aWFsaXphdGlvbiAtICcgKyBsb2NhdGlvbilcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdldEJhY2tncm91bmRTY3JpcHRcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHRDc3NTZWxlY3Rvcixcblx0RWxlbWVudFNlbGVjdG9yLFxuXHRFbGVtZW50U2VsZWN0b3JMaXN0XG59XG5cblxuZnVuY3Rpb24gQ3NzU2VsZWN0b3IgKG9wdGlvbnMpIHtcblxuXHR2YXIgbWUgPSB0aGlzO1xuXG5cdC8vIGRlZmF1bHRzXG5cdHRoaXMuaWdub3JlZFRhZ3MgPSBbJ2ZvbnQnLCAnYicsICdpJywgJ3MnXTtcblx0dGhpcy5wYXJlbnQgPSBvcHRpb25zLmRvY3VtZW50IHx8IG9wdGlvbnMucGFyZW50XG5cdHRoaXMuZG9jdW1lbnQgPSBvcHRpb25zLmRvY3VtZW50IHx8IG9wdGlvbnMucGFyZW50IFxuXHR0aGlzLmlnbm9yZWRDbGFzc0Jhc2UgPSBmYWxzZTtcblx0dGhpcy5lbmFibGVSZXN1bHRTdHJpcHBpbmcgPSB0cnVlO1xuXHR0aGlzLmVuYWJsZVNtYXJ0VGFibGVTZWxlY3RvciA9IGZhbHNlO1xuXHR0aGlzLmlnbm9yZWRDbGFzc2VzID0gW107XG4gICAgdGhpcy5hbGxvd011bHRpcGxlU2VsZWN0b3JzID0gZmFsc2U7XG5cdHRoaXMucXVlcnkgPSBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcblx0XHRyZXR1cm4gbWUucGFyZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuXHR9O1xuXG5cdC8vIG92ZXJyaWRlcyBkZWZhdWx0cyB3aXRoIG9wdGlvbnNcblx0Zm9yICh2YXIgaSBpbiBvcHRpb25zKSB7XG5cdFx0dGhpc1tpXSA9IG9wdGlvbnNbaV07XG5cdH1cbn07XG5cbi8vIFRPRE8gcmVmYWN0b3IgZWxlbWVudCBzZWxlY3RvciBsaXN0IGludG8gYSB+IGNsYXNzXG5mdW5jdGlvbiBFbGVtZW50U2VsZWN0b3IgKGVsZW1lbnQsIGlnbm9yZWRDbGFzc2VzKSB7XG5cblx0dGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblx0dGhpcy5pc0RpcmVjdENoaWxkID0gdHJ1ZTtcblx0dGhpcy50YWcgPSBlbGVtZW50LmxvY2FsTmFtZTtcblx0dGhpcy50YWcgPSB0aGlzLnRhZy5yZXBsYWNlKC86L2csICdcXFxcOicpO1xuXG5cdC8vIG50aC1vZi1jaGlsZChuKzEpXG5cdHRoaXMuaW5kZXhuID0gbnVsbDtcblx0dGhpcy5pbmRleCA9IDE7XG5cdHRoaXMuaWQgPSBudWxsO1xuXHR0aGlzLmNsYXNzZXMgPSBuZXcgQXJyYXkoKTtcblxuXHQvLyBkbyBub3QgYWRkIGFkZGl0aW5hbCBpbmZvIHRvIGh0bWwsIGJvZHkgdGFncy5cblx0Ly8gaHRtbDpudGgtb2YtdHlwZSgxKSBjYW5ub3QgYmUgc2VsZWN0ZWRcblx0aWYodGhpcy50YWcgPT09ICdodG1sJyB8fCB0aGlzLnRhZyA9PT0gJ0hUTUwnXG5cdFx0fHwgdGhpcy50YWcgPT09ICdib2R5JyB8fCB0aGlzLnRhZyA9PT0gJ0JPRFknKSB7XG5cdFx0dGhpcy5pbmRleCA9IG51bGw7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0aWYgKGVsZW1lbnQucGFyZW50Tm9kZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0Ly8gbnRoLWNoaWxkXG5cdFx0Ly90aGlzLmluZGV4ID0gW10uaW5kZXhPZi5jYWxsKGVsZW1lbnQucGFyZW50Tm9kZS5jaGlsZHJlbiwgZWxlbWVudCkrMTtcblxuXHRcdC8vIG50aC1vZi10eXBlXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50LnBhcmVudE5vZGUuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBjaGlsZCA9IGVsZW1lbnQucGFyZW50Tm9kZS5jaGlsZHJlbltpXTtcblx0XHRcdGlmIChjaGlsZCA9PT0gZWxlbWVudCkge1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHRcdGlmIChjaGlsZC50YWdOYW1lID09PSBlbGVtZW50LnRhZ05hbWUpIHtcblx0XHRcdFx0dGhpcy5pbmRleCsrO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGlmIChlbGVtZW50LmlkICE9PSAnJykge1xuXHRcdGlmICh0eXBlb2YgZWxlbWVudC5pZCA9PT0gJ3N0cmluZycpIHtcblx0XHRcdHRoaXMuaWQgPSBlbGVtZW50LmlkO1xuXHRcdFx0dGhpcy5pZCA9IHRoaXMuaWQucmVwbGFjZSgvOi9nLCAnXFxcXDonKTtcblx0XHR9XG5cdH1cblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnQuY2xhc3NMaXN0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIGNjbGFzcyA9IGVsZW1lbnQuY2xhc3NMaXN0W2ldO1xuXHRcdGlmIChpZ25vcmVkQ2xhc3Nlcy5pbmRleE9mKGNjbGFzcykgPT09IC0xKSB7XG5cdFx0XHRjY2xhc3MgPSBjY2xhc3MucmVwbGFjZSgvOi9nLCAnXFxcXDonKTtcblx0XHRcdHRoaXMuY2xhc3Nlcy5wdXNoKGNjbGFzcyk7XG5cdFx0fVxuXHR9XG59O1xuXG5mdW5jdGlvbiBFbGVtZW50U2VsZWN0b3JMaXN0IChDc3NTZWxlY3Rvcikge1xuXHR0aGlzLkNzc1NlbGVjdG9yID0gQ3NzU2VsZWN0b3I7XG59O1xuXG5FbGVtZW50U2VsZWN0b3JMaXN0LnByb3RvdHlwZSA9IG5ldyBBcnJheSgpO1xuXG5FbGVtZW50U2VsZWN0b3JMaXN0LnByb3RvdHlwZS5nZXRDc3NTZWxlY3RvciA9IGZ1bmN0aW9uICgpIHtcblxuXHR2YXIgcmVzdWx0U2VsZWN0b3JzID0gW107XG5cblx0Ly8gVEREXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBzZWxlY3RvciA9IHRoaXNbaV07XG5cblx0XHR2YXIgaXNGaXJzdFNlbGVjdG9yID0gaSA9PT0gdGhpcy5sZW5ndGgtMTtcblx0XHR2YXIgcmVzdWx0U2VsZWN0b3IgPSBzZWxlY3Rvci5nZXRDc3NTZWxlY3Rvcihpc0ZpcnN0U2VsZWN0b3IpO1xuXG5cdFx0aWYgKHRoaXMuQ3NzU2VsZWN0b3IuZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yKSB7XG5cdFx0XHRpZiAoc2VsZWN0b3IudGFnID09PSAndHInKSB7XG5cdFx0XHRcdGlmIChzZWxlY3Rvci5lbGVtZW50LmNoaWxkcmVuLmxlbmd0aCA9PT0gMikge1xuXHRcdFx0XHRcdGlmIChzZWxlY3Rvci5lbGVtZW50LmNoaWxkcmVuWzBdLnRhZ05hbWUgPT09ICdURCdcblx0XHRcdFx0XHRcdHx8IHNlbGVjdG9yLmVsZW1lbnQuY2hpbGRyZW5bMF0udGFnTmFtZSA9PT0gJ1RIJ1xuXHRcdFx0XHRcdFx0fHwgc2VsZWN0b3IuZWxlbWVudC5jaGlsZHJlblswXS50YWdOYW1lID09PSAnVFInKSB7XG5cblx0XHRcdFx0XHRcdHZhciB0ZXh0ID0gc2VsZWN0b3IuZWxlbWVudC5jaGlsZHJlblswXS50ZXh0Q29udGVudDtcblx0XHRcdFx0XHRcdHRleHQgPSB0ZXh0LnRyaW0oKTtcblxuXHRcdFx0XHRcdFx0Ly8gZXNjYXBlIHF1b3Rlc1xuXHRcdFx0XHRcdFx0dGV4dC5yZXBsYWNlKC8oXFxcXCopKCcpL2csIGZ1bmN0aW9uICh4KSB7XG5cdFx0XHRcdFx0XHRcdHZhciBsID0geC5sZW5ndGg7XG5cdFx0XHRcdFx0XHRcdHJldHVybiAobCAlIDIpID8geCA6IHguc3Vic3RyaW5nKDAsIGwgLSAxKSArIFwiXFxcXCdcIjtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0cmVzdWx0U2VsZWN0b3IgKz0gXCI6Y29udGFpbnMoJ1wiICsgdGV4dCArIFwiJylcIjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXN1bHRTZWxlY3RvcnMucHVzaChyZXN1bHRTZWxlY3Rvcik7XG5cdH1cblxuXHR2YXIgcmVzdWx0Q1NTU2VsZWN0b3IgPSByZXN1bHRTZWxlY3RvcnMucmV2ZXJzZSgpLmpvaW4oJyAnKTtcblx0cmV0dXJuIHJlc3VsdENTU1NlbGVjdG9yO1xufTtcblxuRWxlbWVudFNlbGVjdG9yLnByb3RvdHlwZSA9IHtcblxuXHRnZXRDc3NTZWxlY3RvcjogZnVuY3Rpb24gKGlzRmlyc3RTZWxlY3Rvcikge1xuXG5cdFx0aWYoaXNGaXJzdFNlbGVjdG9yID09PSB1bmRlZmluZWQpIHtcblx0XHRcdGlzRmlyc3RTZWxlY3RvciA9IGZhbHNlO1xuXHRcdH1cblxuXHRcdHZhciBzZWxlY3RvciA9IHRoaXMudGFnO1xuXHRcdGlmICh0aGlzLmlkICE9PSBudWxsKSB7XG5cdFx0XHRzZWxlY3RvciArPSAnIycgKyB0aGlzLmlkO1xuXHRcdH1cblx0XHRpZiAodGhpcy5jbGFzc2VzLmxlbmd0aCkge1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmNsYXNzZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0c2VsZWN0b3IgKz0gXCIuXCIgKyB0aGlzLmNsYXNzZXNbaV07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmICh0aGlzLmluZGV4ICE9PSBudWxsKSB7XG5cdFx0XHRzZWxlY3RvciArPSAnOm50aC1vZi10eXBlKCcgKyB0aGlzLmluZGV4ICsgJyknO1xuXHRcdH1cblx0XHRpZiAodGhpcy5pbmRleG4gIT09IG51bGwgJiYgdGhpcy5pbmRleG4gIT09IC0xKSB7XG5cdFx0XHRzZWxlY3RvciArPSAnOm50aC1vZi10eXBlKG4rJyArIHRoaXMuaW5kZXhuICsgJyknO1xuXHRcdH1cblx0XHRpZih0aGlzLmlzRGlyZWN0Q2hpbGQgJiYgaXNGaXJzdFNlbGVjdG9yID09PSBmYWxzZSkge1xuXHRcdFx0c2VsZWN0b3IgPSBcIj4gXCIrc2VsZWN0b3I7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHNlbGVjdG9yO1xuXHR9LFxuXHQvLyBtZXJnZXMgdGhpcyBzZWxlY3RvciB3aXRoIGFub3RoZXIgb25lLlxuXHRtZXJnZTogZnVuY3Rpb24gKG1lcmdlU2VsZWN0b3IpIHtcblxuXHRcdGlmICh0aGlzLnRhZyAhPT0gbWVyZ2VTZWxlY3Rvci50YWcpIHtcblx0XHRcdHRocm93IFwiZGlmZmVyZW50IGVsZW1lbnQgc2VsZWN0ZWQgKHRhZylcIjtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5pbmRleCAhPT0gbnVsbCkge1xuXHRcdFx0aWYgKHRoaXMuaW5kZXggIT09IG1lcmdlU2VsZWN0b3IuaW5kZXgpIHtcblxuXHRcdFx0XHQvLyB1c2UgaW5kZXhuIG9ubHkgZm9yIHR3byBlbGVtZW50c1xuXHRcdFx0XHRpZiAodGhpcy5pbmRleG4gPT09IG51bGwpIHtcblx0XHRcdFx0XHR2YXIgaW5kZXhuID0gTWF0aC5taW4obWVyZ2VTZWxlY3Rvci5pbmRleCwgdGhpcy5pbmRleCk7XG5cdFx0XHRcdFx0aWYgKGluZGV4biA+IDEpIHtcblx0XHRcdFx0XHRcdHRoaXMuaW5kZXhuID0gTWF0aC5taW4obWVyZ2VTZWxlY3Rvci5pbmRleCwgdGhpcy5pbmRleCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHRoaXMuaW5kZXhuID0gLTE7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR0aGlzLmluZGV4ID0gbnVsbDtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZih0aGlzLmlzRGlyZWN0Q2hpbGQgPT09IHRydWUpIHtcblx0XHRcdHRoaXMuaXNEaXJlY3RDaGlsZCA9IG1lcmdlU2VsZWN0b3IuaXNEaXJlY3RDaGlsZDtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5pZCAhPT0gbnVsbCkge1xuXHRcdFx0aWYgKHRoaXMuaWQgIT09IG1lcmdlU2VsZWN0b3IuaWQpIHtcblx0XHRcdFx0dGhpcy5pZCA9IG51bGw7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2xhc3Nlcy5sZW5ndGggIT09IDApIHtcblx0XHRcdHZhciBjbGFzc2VzID0gbmV3IEFycmF5KCk7XG5cblx0XHRcdGZvciAodmFyIGkgaW4gdGhpcy5jbGFzc2VzKSB7XG5cdFx0XHRcdHZhciBjY2xhc3MgPSB0aGlzLmNsYXNzZXNbaV07XG5cdFx0XHRcdGlmIChtZXJnZVNlbGVjdG9yLmNsYXNzZXMuaW5kZXhPZihjY2xhc3MpICE9PSAtMSkge1xuXHRcdFx0XHRcdGNsYXNzZXMucHVzaChjY2xhc3MpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuY2xhc3NlcyA9IGNsYXNzZXM7XG5cdFx0fVxuXHR9XG59O1xuXG5Dc3NTZWxlY3Rvci5wcm90b3R5cGUgPSB7XG5cdG1lcmdlRWxlbWVudFNlbGVjdG9yczogZnVuY3Rpb24gKG5ld1NlbGVjb3JzKSB7XG5cblx0XHRpZiAobmV3U2VsZWNvcnMubGVuZ3RoIDwgMSkge1xuXHRcdFx0dGhyb3cgXCJObyBzZWxlY3RvcnMgc3BlY2lmaWVkXCI7XG5cdFx0fVxuXHRcdGVsc2UgaWYgKG5ld1NlbGVjb3JzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0cmV0dXJuIG5ld1NlbGVjb3JzWzBdO1xuXHRcdH1cblxuXHRcdC8vIGNoZWNrIHNlbGVjdG9yIHRvdGFsIGNvdW50XG5cdFx0dmFyIGVsZW1lbnRDb3VudEluU2VsZWN0b3IgPSBuZXdTZWxlY29yc1swXS5sZW5ndGg7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBuZXdTZWxlY29ycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHNlbGVjdG9yID0gbmV3U2VsZWNvcnNbaV07XG5cdFx0XHRpZiAoc2VsZWN0b3IubGVuZ3RoICE9PSBlbGVtZW50Q291bnRJblNlbGVjdG9yKSB7XG5cdFx0XHRcdHRocm93IFwiSW52YWxpZCBlbGVtZW50IGNvdW50IGluIHNlbGVjdG9yXCI7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gbWVyZ2Ugc2VsZWN0b3JzXG5cdFx0dmFyIHJlc3VsdGluZ0VsZW1lbnRzID0gbmV3U2VsZWNvcnNbMF07XG5cdFx0Zm9yICh2YXIgaSA9IDE7IGkgPCBuZXdTZWxlY29ycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIG1lcmdlRWxlbWVudHMgPSBuZXdTZWxlY29yc1tpXTtcblxuXHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBlbGVtZW50Q291bnRJblNlbGVjdG9yOyBqKyspIHtcblx0XHRcdFx0cmVzdWx0aW5nRWxlbWVudHNbal0ubWVyZ2UobWVyZ2VFbGVtZW50c1tqXSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHRpbmdFbGVtZW50cztcblx0fSxcblx0c3RyaXBTZWxlY3RvcjogZnVuY3Rpb24gKHNlbGVjdG9ycykge1xuXG5cdFx0dmFyIGNzc1NlbGV0b3IgPSBzZWxlY3RvcnMuZ2V0Q3NzU2VsZWN0b3IoKTtcblx0XHR2YXIgYmFzZVNlbGVjdGVkRWxlbWVudHMgPSB0aGlzLnF1ZXJ5KGNzc1NlbGV0b3IpO1xuXG5cdFx0dmFyIGNvbXBhcmVFbGVtZW50cyA9IGZ1bmN0aW9uIChlbGVtZW50cykge1xuXHRcdFx0aWYgKGJhc2VTZWxlY3RlZEVsZW1lbnRzLmxlbmd0aCAhPT0gZWxlbWVudHMubGVuZ3RoKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBiYXNlU2VsZWN0ZWRFbGVtZW50cy5sZW5ndGg7IGorKykge1xuXHRcdFx0XHRpZiAoW10uaW5kZXhPZi5jYWxsKGVsZW1lbnRzLCBiYXNlU2VsZWN0ZWRFbGVtZW50c1tqXSkgPT09IC0xKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9O1xuXHRcdC8vIHN0cmlwIGluZGV4ZXNcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHNlbGVjdG9ycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHNlbGVjdG9yID0gc2VsZWN0b3JzW2ldO1xuXHRcdFx0aWYgKHNlbGVjdG9yLmluZGV4ICE9PSBudWxsKSB7XG5cdFx0XHRcdHZhciBpbmRleCA9IHNlbGVjdG9yLmluZGV4O1xuXHRcdFx0XHRzZWxlY3Rvci5pbmRleCA9IG51bGw7XG5cdFx0XHRcdHZhciBjc3NTZWxldG9yID0gc2VsZWN0b3JzLmdldENzc1NlbGVjdG9yKCk7XG5cdFx0XHRcdHZhciBuZXdTZWxlY3RlZEVsZW1lbnRzID0gdGhpcy5xdWVyeShjc3NTZWxldG9yKTtcblx0XHRcdFx0Ly8gaWYgcmVzdWx0cyBkb2Vzbid0IG1hdGNoIHRoZW4gdW5kbyBjaGFuZ2VzXG5cdFx0XHRcdGlmICghY29tcGFyZUVsZW1lbnRzKG5ld1NlbGVjdGVkRWxlbWVudHMpKSB7XG5cdFx0XHRcdFx0c2VsZWN0b3IuaW5kZXggPSBpbmRleDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIHN0cmlwIGlzRGlyZWN0Q2hpbGRcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHNlbGVjdG9ycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHNlbGVjdG9yID0gc2VsZWN0b3JzW2ldO1xuXHRcdFx0aWYgKHNlbGVjdG9yLmlzRGlyZWN0Q2hpbGQgPT09IHRydWUpIHtcblx0XHRcdFx0c2VsZWN0b3IuaXNEaXJlY3RDaGlsZCA9IGZhbHNlO1xuXHRcdFx0XHR2YXIgY3NzU2VsZXRvciA9IHNlbGVjdG9ycy5nZXRDc3NTZWxlY3RvcigpO1xuXHRcdFx0XHR2YXIgbmV3U2VsZWN0ZWRFbGVtZW50cyA9IHRoaXMucXVlcnkoY3NzU2VsZXRvcik7XG5cdFx0XHRcdC8vIGlmIHJlc3VsdHMgZG9lc24ndCBtYXRjaCB0aGVuIHVuZG8gY2hhbmdlc1xuXHRcdFx0XHRpZiAoIWNvbXBhcmVFbGVtZW50cyhuZXdTZWxlY3RlZEVsZW1lbnRzKSkge1xuXHRcdFx0XHRcdHNlbGVjdG9yLmlzRGlyZWN0Q2hpbGQgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gc3RyaXAgaWRzXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzZWxlY3RvcnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBzZWxlY3RvciA9IHNlbGVjdG9yc1tpXTtcblx0XHRcdGlmIChzZWxlY3Rvci5pZCAhPT0gbnVsbCkge1xuXHRcdFx0XHR2YXIgaWQgPSBzZWxlY3Rvci5pZDtcblx0XHRcdFx0c2VsZWN0b3IuaWQgPSBudWxsO1xuXHRcdFx0XHR2YXIgY3NzU2VsZXRvciA9IHNlbGVjdG9ycy5nZXRDc3NTZWxlY3RvcigpO1xuXHRcdFx0XHR2YXIgbmV3U2VsZWN0ZWRFbGVtZW50cyA9IHRoaXMucXVlcnkoY3NzU2VsZXRvcik7XG5cdFx0XHRcdC8vIGlmIHJlc3VsdHMgZG9lc24ndCBtYXRjaCB0aGVuIHVuZG8gY2hhbmdlc1xuXHRcdFx0XHRpZiAoIWNvbXBhcmVFbGVtZW50cyhuZXdTZWxlY3RlZEVsZW1lbnRzKSkge1xuXHRcdFx0XHRcdHNlbGVjdG9yLmlkID0gaWQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBzdHJpcCBjbGFzc2VzXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzZWxlY3RvcnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBzZWxlY3RvciA9IHNlbGVjdG9yc1tpXTtcblx0XHRcdGlmIChzZWxlY3Rvci5jbGFzc2VzLmxlbmd0aCAhPT0gMCkge1xuXHRcdFx0XHRmb3IgKHZhciBqID0gc2VsZWN0b3IuY2xhc3Nlcy5sZW5ndGggLSAxOyBqID4gMDsgai0tKSB7XG5cdFx0XHRcdFx0dmFyIGNjbGFzcyA9IHNlbGVjdG9yLmNsYXNzZXNbal07XG5cdFx0XHRcdFx0c2VsZWN0b3IuY2xhc3Nlcy5zcGxpY2UoaiwgMSk7XG5cdFx0XHRcdFx0dmFyIGNzc1NlbGV0b3IgPSBzZWxlY3RvcnMuZ2V0Q3NzU2VsZWN0b3IoKTtcblx0XHRcdFx0XHR2YXIgbmV3U2VsZWN0ZWRFbGVtZW50cyA9IHRoaXMucXVlcnkoY3NzU2VsZXRvcik7XG5cdFx0XHRcdFx0Ly8gaWYgcmVzdWx0cyBkb2Vzbid0IG1hdGNoIHRoZW4gdW5kbyBjaGFuZ2VzXG5cdFx0XHRcdFx0aWYgKCFjb21wYXJlRWxlbWVudHMobmV3U2VsZWN0ZWRFbGVtZW50cykpIHtcblx0XHRcdFx0XHRcdHNlbGVjdG9yLmNsYXNzZXMuc3BsaWNlKGosIDAsIGNjbGFzcyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gc3RyaXAgdGFnc1xuXHRcdGZvciAodmFyIGkgPSBzZWxlY3RvcnMubGVuZ3RoIC0gMTsgaSA+IDA7IGktLSkge1xuXHRcdFx0dmFyIHNlbGVjdG9yID0gc2VsZWN0b3JzW2ldO1xuXHRcdFx0c2VsZWN0b3JzLnNwbGljZShpLCAxKTtcblx0XHRcdHZhciBjc3NTZWxldG9yID0gc2VsZWN0b3JzLmdldENzc1NlbGVjdG9yKCk7XG5cdFx0XHR2YXIgbmV3U2VsZWN0ZWRFbGVtZW50cyA9IHRoaXMucXVlcnkoY3NzU2VsZXRvcik7XG5cdFx0XHQvLyBpZiByZXN1bHRzIGRvZXNuJ3QgbWF0Y2ggdGhlbiB1bmRvIGNoYW5nZXNcblx0XHRcdGlmICghY29tcGFyZUVsZW1lbnRzKG5ld1NlbGVjdGVkRWxlbWVudHMpKSB7XG5cdFx0XHRcdHNlbGVjdG9ycy5zcGxpY2UoaSwgMCwgc2VsZWN0b3IpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBzZWxlY3RvcnM7XG5cdH0sXG5cdGdldEVsZW1lbnRTZWxlY3RvcnM6IGZ1bmN0aW9uIChlbGVtZW50cywgdG9wKSB7XG5cdFx0dmFyIGVsZW1lbnRTZWxlY3RvcnMgPSBbXTtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBlbGVtZW50ID0gZWxlbWVudHNbaV07XG5cdFx0XHR2YXIgZWxlbWVudFNlbGVjdG9yID0gdGhpcy5nZXRFbGVtZW50U2VsZWN0b3IoZWxlbWVudCwgdG9wKTtcblx0XHRcdGVsZW1lbnRTZWxlY3RvcnMucHVzaChlbGVtZW50U2VsZWN0b3IpO1xuXHRcdH1cblxuXHRcdHJldHVybiBlbGVtZW50U2VsZWN0b3JzO1xuXHR9LFxuXHRnZXRFbGVtZW50U2VsZWN0b3I6IGZ1bmN0aW9uIChlbGVtZW50LCB0b3ApIHtcblxuXHRcdHZhciBlbGVtZW50U2VsZWN0b3JMaXN0ID0gbmV3IEVsZW1lbnRTZWxlY3Rvckxpc3QodGhpcyk7XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdGlmIChlbGVtZW50ID09PSB0aGlzLnBhcmVudCkge1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKGVsZW1lbnQgPT09IHVuZGVmaW5lZCB8fCBlbGVtZW50ID09PSB0aGlzLmRvY3VtZW50KSB7XG5cdFx0XHRcdHRocm93ICdlbGVtZW50IGlzIG5vdCBhIGNoaWxkIG9mIHRoZSBnaXZlbiBwYXJlbnQnO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRoaXMuaXNJZ25vcmVkVGFnKGVsZW1lbnQudGFnTmFtZSkpIHtcblxuXHRcdFx0XHRlbGVtZW50ID0gZWxlbWVudC5wYXJlbnROb2RlO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblx0XHRcdGlmICh0b3AgPiAwKSB7XG5cdFx0XHRcdHRvcC0tO1xuXHRcdFx0XHRlbGVtZW50ID0gZWxlbWVudC5wYXJlbnROb2RlO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0dmFyIHNlbGVjdG9yID0gbmV3IEVsZW1lbnRTZWxlY3RvcihlbGVtZW50LCB0aGlzLmlnbm9yZWRDbGFzc2VzKTtcblx0XHRcdC8vIGRvY3VtZW50IGRvZXMgbm90IGhhdmUgYSB0YWdOYW1lXG5cdFx0XHRpZihlbGVtZW50LnBhcmVudE5vZGUgPT09IHRoaXMuZG9jdW1lbnQgfHwgdGhpcy5pc0lnbm9yZWRUYWcoZWxlbWVudC5wYXJlbnROb2RlLnRhZ05hbWUpKSB7XG5cdFx0XHRcdHNlbGVjdG9yLmlzRGlyZWN0Q2hpbGQgPSBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0ZWxlbWVudFNlbGVjdG9yTGlzdC5wdXNoKHNlbGVjdG9yKTtcblx0XHRcdGVsZW1lbnQgPSBlbGVtZW50LnBhcmVudE5vZGU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGVsZW1lbnRTZWxlY3Rvckxpc3Q7XG5cdH0sXG5cbiAgICAvKipcbiAgICAgKiBDb21wYXJlcyB3aGV0aGVyIHR3byBlbGVtZW50cyBhcmUgc2ltaWxhci4gU2ltaWxhciBlbGVtZW50cyBzaG91bGRcbiAgICAgKiBoYXZlIGEgY29tbW9uIHBhcnJlbnQgYW5kIGFsbCBwYXJlbnQgZWxlbWVudHMgc2hvdWxkIGJlIHRoZSBzYW1lIHR5cGUuXG4gICAgICogQHBhcmFtIGVsZW1lbnQxXG4gICAgICogQHBhcmFtIGVsZW1lbnQyXG4gICAgICovXG4gICAgY2hlY2tTaW1pbGFyRWxlbWVudHM6IGZ1bmN0aW9uKGVsZW1lbnQxLCBlbGVtZW50Mikge1xuXG4gICAgICAgIHdoaWxlICh0cnVlKSB7XG5cbiAgICAgICAgICAgIGlmKGVsZW1lbnQxLnRhZ05hbWUgIT09IGVsZW1lbnQyLnRhZ05hbWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZihlbGVtZW50MSA9PT0gZWxlbWVudDIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gc3RvcCBhdCBib2R5IHRhZ1xuICAgICAgICAgICAgaWYgKGVsZW1lbnQxID09PSB1bmRlZmluZWQgfHwgZWxlbWVudDEudGFnTmFtZSA9PT0gJ2JvZHknXG4gICAgICAgICAgICAgICAgfHwgZWxlbWVudDEudGFnTmFtZSA9PT0gJ0JPRFknKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGVsZW1lbnQyID09PSB1bmRlZmluZWQgfHwgZWxlbWVudDIudGFnTmFtZSA9PT0gJ2JvZHknXG4gICAgICAgICAgICAgICAgfHwgZWxlbWVudDIudGFnTmFtZSA9PT0gJ0JPRFknKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBlbGVtZW50MSA9IGVsZW1lbnQxLnBhcmVudE5vZGU7XG4gICAgICAgICAgICBlbGVtZW50MiA9IGVsZW1lbnQyLnBhcmVudE5vZGU7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR3JvdXBzIGVsZW1lbnRzIGludG8gZ3JvdXBzIGlmIHRoZSBlbWVsZW50cyBhcmUgbm90IHNpbWlsYXJcbiAgICAgKiBAcGFyYW0gZWxlbWVudHNcbiAgICAgKi9cbiAgICBnZXRFbGVtZW50R3JvdXBzOiBmdW5jdGlvbihlbGVtZW50cykge1xuXG4gICAgICAgIC8vIGZpcnN0IGVsbWVudCBpcyBpbiB0aGUgZmlyc3QgZ3JvdXBcbiAgICAgICAgLy8gQFRPRE8gbWF5YmUgaSBkb250IG5lZWQgdGhpcz9cbiAgICAgICAgdmFyIGdyb3VwcyA9IFtbZWxlbWVudHNbMF1dXTtcblxuICAgICAgICBmb3IodmFyIGkgPSAxOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBlbGVtZW50TmV3ID0gZWxlbWVudHNbaV07XG4gICAgICAgICAgICB2YXIgYWRkZWRUb0dyb3VwID0gZmFsc2U7XG4gICAgICAgICAgICBmb3IodmFyIGogPSAwOyBqIDwgZ3JvdXBzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGdyb3VwID0gZ3JvdXBzW2pdO1xuICAgICAgICAgICAgICAgIHZhciBlbGVtZW50R3JvdXAgPSBncm91cFswXTtcbiAgICAgICAgICAgICAgICBpZih0aGlzLmNoZWNrU2ltaWxhckVsZW1lbnRzKGVsZW1lbnROZXcsIGVsZW1lbnRHcm91cCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZ3JvdXAucHVzaChlbGVtZW50TmV3KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkZWRUb0dyb3VwID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBhZGQgbmV3IGdyb3VwXG4gICAgICAgICAgICBpZighYWRkZWRUb0dyb3VwKSB7XG4gICAgICAgICAgICAgICAgZ3JvdXBzLnB1c2goW2VsZW1lbnROZXddKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBncm91cHM7XG4gICAgfSxcblx0Z2V0Q3NzU2VsZWN0b3I6IGZ1bmN0aW9uIChlbGVtZW50cywgdG9wKSB7XG5cblx0XHR0b3AgPSB0b3AgfHwgMDtcblxuXHRcdHZhciBlbmFibGVTbWFydFRhYmxlU2VsZWN0b3IgPSB0aGlzLmVuYWJsZVNtYXJ0VGFibGVTZWxlY3Rvcjtcblx0XHRpZiAoZWxlbWVudHMubGVuZ3RoID4gMSkge1xuXHRcdFx0dGhpcy5lbmFibGVTbWFydFRhYmxlU2VsZWN0b3IgPSBmYWxzZTtcblx0XHR9XG5cbiAgICAgICAgLy8gZ3JvdXAgZWxlbWVudHMgaW50byBzaW1pbGFyaXR5IGdyb3Vwc1xuICAgICAgICB2YXIgZWxlbWVudEdyb3VwcyA9IHRoaXMuZ2V0RWxlbWVudEdyb3VwcyhlbGVtZW50cyk7XG5cbiAgICAgICAgdmFyIHJlc3VsdENTU1NlbGVjdG9yO1xuXG4gICAgICAgIGlmKHRoaXMuYWxsb3dNdWx0aXBsZVNlbGVjdG9ycykge1xuXG4gICAgICAgICAgICB2YXIgZ3JvdXBTZWxlY3RvcnMgPSBbXTtcblxuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGVsZW1lbnRHcm91cHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgZ3JvdXBFbGVtZW50cyA9IGVsZW1lbnRHcm91cHNbaV07XG5cbiAgICAgICAgICAgICAgICB2YXIgZWxlbWVudFNlbGVjdG9ycyA9IHRoaXMuZ2V0RWxlbWVudFNlbGVjdG9ycyhncm91cEVsZW1lbnRzLCB0b3ApO1xuICAgICAgICAgICAgICAgIHZhciByZXN1bHRTZWxlY3RvciA9IHRoaXMubWVyZ2VFbGVtZW50U2VsZWN0b3JzKGVsZW1lbnRTZWxlY3RvcnMpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmVuYWJsZVJlc3VsdFN0cmlwcGluZykge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRTZWxlY3RvciA9IHRoaXMuc3RyaXBTZWxlY3RvcihyZXN1bHRTZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZ3JvdXBTZWxlY3RvcnMucHVzaChyZXN1bHRTZWxlY3Rvci5nZXRDc3NTZWxlY3RvcigpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVzdWx0Q1NTU2VsZWN0b3IgPSBncm91cFNlbGVjdG9ycy5qb2luKCcsICcpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYoZWxlbWVudEdyb3Vwcy5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBcImZvdW5kIG11bHRpcGxlIGVsZW1lbnQgZ3JvdXBzLCBidXQgYWxsb3dNdWx0aXBsZVNlbGVjdG9ycyBkaXNhYmxlZFwiO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgZWxlbWVudFNlbGVjdG9ycyA9IHRoaXMuZ2V0RWxlbWVudFNlbGVjdG9ycyhlbGVtZW50cywgdG9wKTtcbiAgICAgICAgICAgIHZhciByZXN1bHRTZWxlY3RvciA9IHRoaXMubWVyZ2VFbGVtZW50U2VsZWN0b3JzKGVsZW1lbnRTZWxlY3RvcnMpO1xuICAgICAgICAgICAgaWYgKHRoaXMuZW5hYmxlUmVzdWx0U3RyaXBwaW5nKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0U2VsZWN0b3IgPSB0aGlzLnN0cmlwU2VsZWN0b3IocmVzdWx0U2VsZWN0b3IpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXN1bHRDU1NTZWxlY3RvciA9IHJlc3VsdFNlbGVjdG9yLmdldENzc1NlbGVjdG9yKCk7XG4gICAgICAgIH1cblxuXHRcdHRoaXMuZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yID0gZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yO1xuXG5cdFx0Ly8gc3RyaXAgZG93biBzZWxlY3RvclxuXHRcdHJldHVybiByZXN1bHRDU1NTZWxlY3Rvcjtcblx0fSxcblx0aXNJZ25vcmVkVGFnOiBmdW5jdGlvbiAodGFnKSB7XG5cdFx0cmV0dXJuIHRoaXMuaWdub3JlZFRhZ3MuaW5kZXhPZih0YWcudG9Mb3dlckNhc2UoKSkgIT09IC0xO1xuXHR9XG59O1xuIiwiXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vbGliL2pxdWVyeS1kZWZlcnJlZCcpOyIsInZhciBqUXVlcnkgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL2pxdWVyeS1jb3JlLmpzXCIpLFxuXHRjb3JlX3JzcGFjZSA9IC9cXHMrLztcbi8qKlxuKiBqUXVlcnkgQ2FsbGJhY2tzXG4qXG4qIENvZGUgZnJvbTogaHR0cHM6Ly9naXRodWIuY29tL2pxdWVyeS9qcXVlcnkvYmxvYi9tYXN0ZXIvc3JjL2NhbGxiYWNrcy5qc1xuKlxuKi9cblxuXG4vLyBTdHJpbmcgdG8gT2JqZWN0IG9wdGlvbnMgZm9ybWF0IGNhY2hlXG52YXIgb3B0aW9uc0NhY2hlID0ge307XG5cbi8vIENvbnZlcnQgU3RyaW5nLWZvcm1hdHRlZCBvcHRpb25zIGludG8gT2JqZWN0LWZvcm1hdHRlZCBvbmVzIGFuZCBzdG9yZSBpbiBjYWNoZVxuZnVuY3Rpb24gY3JlYXRlT3B0aW9ucyggb3B0aW9ucyApIHtcblx0dmFyIG9iamVjdCA9IG9wdGlvbnNDYWNoZVsgb3B0aW9ucyBdID0ge307XG5cdGpRdWVyeS5lYWNoKCBvcHRpb25zLnNwbGl0KCBjb3JlX3JzcGFjZSApLCBmdW5jdGlvbiggXywgZmxhZyApIHtcblx0XHRvYmplY3RbIGZsYWcgXSA9IHRydWU7XG5cdH0pO1xuXHRyZXR1cm4gb2JqZWN0O1xufVxuXG4vKlxuICogQ3JlYXRlIGEgY2FsbGJhY2sgbGlzdCB1c2luZyB0aGUgZm9sbG93aW5nIHBhcmFtZXRlcnM6XG4gKlxuICpcdG9wdGlvbnM6IGFuIG9wdGlvbmFsIGxpc3Qgb2Ygc3BhY2Utc2VwYXJhdGVkIG9wdGlvbnMgdGhhdCB3aWxsIGNoYW5nZSBob3dcbiAqXHRcdFx0dGhlIGNhbGxiYWNrIGxpc3QgYmVoYXZlcyBvciBhIG1vcmUgdHJhZGl0aW9uYWwgb3B0aW9uIG9iamVjdFxuICpcbiAqIEJ5IGRlZmF1bHQgYSBjYWxsYmFjayBsaXN0IHdpbGwgYWN0IGxpa2UgYW4gZXZlbnQgY2FsbGJhY2sgbGlzdCBhbmQgY2FuIGJlXG4gKiBcImZpcmVkXCIgbXVsdGlwbGUgdGltZXMuXG4gKlxuICogUG9zc2libGUgb3B0aW9uczpcbiAqXG4gKlx0b25jZTpcdFx0XHR3aWxsIGVuc3VyZSB0aGUgY2FsbGJhY2sgbGlzdCBjYW4gb25seSBiZSBmaXJlZCBvbmNlIChsaWtlIGEgRGVmZXJyZWQpXG4gKlxuICpcdG1lbW9yeTpcdFx0XHR3aWxsIGtlZXAgdHJhY2sgb2YgcHJldmlvdXMgdmFsdWVzIGFuZCB3aWxsIGNhbGwgYW55IGNhbGxiYWNrIGFkZGVkXG4gKlx0XHRcdFx0XHRhZnRlciB0aGUgbGlzdCBoYXMgYmVlbiBmaXJlZCByaWdodCBhd2F5IHdpdGggdGhlIGxhdGVzdCBcIm1lbW9yaXplZFwiXG4gKlx0XHRcdFx0XHR2YWx1ZXMgKGxpa2UgYSBEZWZlcnJlZClcbiAqXG4gKlx0dW5pcXVlOlx0XHRcdHdpbGwgZW5zdXJlIGEgY2FsbGJhY2sgY2FuIG9ubHkgYmUgYWRkZWQgb25jZSAobm8gZHVwbGljYXRlIGluIHRoZSBsaXN0KVxuICpcbiAqXHRzdG9wT25GYWxzZTpcdGludGVycnVwdCBjYWxsaW5ncyB3aGVuIGEgY2FsbGJhY2sgcmV0dXJucyBmYWxzZVxuICpcbiAqL1xualF1ZXJ5LkNhbGxiYWNrcyA9IGZ1bmN0aW9uKCBvcHRpb25zICkge1xuXG5cdC8vIENvbnZlcnQgb3B0aW9ucyBmcm9tIFN0cmluZy1mb3JtYXR0ZWQgdG8gT2JqZWN0LWZvcm1hdHRlZCBpZiBuZWVkZWRcblx0Ly8gKHdlIGNoZWNrIGluIGNhY2hlIGZpcnN0KVxuXHRvcHRpb25zID0gdHlwZW9mIG9wdGlvbnMgPT09IFwic3RyaW5nXCIgP1xuXHRcdCggb3B0aW9uc0NhY2hlWyBvcHRpb25zIF0gfHwgY3JlYXRlT3B0aW9ucyggb3B0aW9ucyApICkgOlxuXHRcdGpRdWVyeS5leHRlbmQoIHt9LCBvcHRpb25zICk7XG5cblx0dmFyIC8vIExhc3QgZmlyZSB2YWx1ZSAoZm9yIG5vbi1mb3JnZXR0YWJsZSBsaXN0cylcblx0XHRtZW1vcnksXG5cdFx0Ly8gRmxhZyB0byBrbm93IGlmIGxpc3Qgd2FzIGFscmVhZHkgZmlyZWRcblx0XHRmaXJlZCxcblx0XHQvLyBGbGFnIHRvIGtub3cgaWYgbGlzdCBpcyBjdXJyZW50bHkgZmlyaW5nXG5cdFx0ZmlyaW5nLFxuXHRcdC8vIEZpcnN0IGNhbGxiYWNrIHRvIGZpcmUgKHVzZWQgaW50ZXJuYWxseSBieSBhZGQgYW5kIGZpcmVXaXRoKVxuXHRcdGZpcmluZ1N0YXJ0LFxuXHRcdC8vIEVuZCBvZiB0aGUgbG9vcCB3aGVuIGZpcmluZ1xuXHRcdGZpcmluZ0xlbmd0aCxcblx0XHQvLyBJbmRleCBvZiBjdXJyZW50bHkgZmlyaW5nIGNhbGxiYWNrIChtb2RpZmllZCBieSByZW1vdmUgaWYgbmVlZGVkKVxuXHRcdGZpcmluZ0luZGV4LFxuXHRcdC8vIEFjdHVhbCBjYWxsYmFjayBsaXN0XG5cdFx0bGlzdCA9IFtdLFxuXHRcdC8vIFN0YWNrIG9mIGZpcmUgY2FsbHMgZm9yIHJlcGVhdGFibGUgbGlzdHNcblx0XHRzdGFjayA9ICFvcHRpb25zLm9uY2UgJiYgW10sXG5cdFx0Ly8gRmlyZSBjYWxsYmFja3Ncblx0XHRmaXJlID0gZnVuY3Rpb24oIGRhdGEgKSB7XG5cdFx0XHRtZW1vcnkgPSBvcHRpb25zLm1lbW9yeSAmJiBkYXRhO1xuXHRcdFx0ZmlyZWQgPSB0cnVlO1xuXHRcdFx0ZmlyaW5nSW5kZXggPSBmaXJpbmdTdGFydCB8fCAwO1xuXHRcdFx0ZmlyaW5nU3RhcnQgPSAwO1xuXHRcdFx0ZmlyaW5nTGVuZ3RoID0gbGlzdC5sZW5ndGg7XG5cdFx0XHRmaXJpbmcgPSB0cnVlO1xuXHRcdFx0Zm9yICggOyBsaXN0ICYmIGZpcmluZ0luZGV4IDwgZmlyaW5nTGVuZ3RoOyBmaXJpbmdJbmRleCsrICkge1xuXHRcdFx0XHRpZiAoIGxpc3RbIGZpcmluZ0luZGV4IF0uYXBwbHkoIGRhdGFbIDAgXSwgZGF0YVsgMSBdICkgPT09IGZhbHNlICYmIG9wdGlvbnMuc3RvcE9uRmFsc2UgKSB7XG5cdFx0XHRcdFx0bWVtb3J5ID0gZmFsc2U7IC8vIFRvIHByZXZlbnQgZnVydGhlciBjYWxscyB1c2luZyBhZGRcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0ZmlyaW5nID0gZmFsc2U7XG5cdFx0XHRpZiAoIGxpc3QgKSB7XG5cdFx0XHRcdGlmICggc3RhY2sgKSB7XG5cdFx0XHRcdFx0aWYgKCBzdGFjay5sZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRmaXJlKCBzdGFjay5zaGlmdCgpICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2UgaWYgKCBtZW1vcnkgKSB7XG5cdFx0XHRcdFx0bGlzdCA9IFtdO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHNlbGYuZGlzYWJsZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblx0XHQvLyBBY3R1YWwgQ2FsbGJhY2tzIG9iamVjdFxuXHRcdHNlbGYgPSB7XG5cdFx0XHQvLyBBZGQgYSBjYWxsYmFjayBvciBhIGNvbGxlY3Rpb24gb2YgY2FsbGJhY2tzIHRvIHRoZSBsaXN0XG5cdFx0XHRhZGQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAoIGxpc3QgKSB7XG5cdFx0XHRcdFx0Ly8gRmlyc3QsIHdlIHNhdmUgdGhlIGN1cnJlbnQgbGVuZ3RoXG5cdFx0XHRcdFx0dmFyIHN0YXJ0ID0gbGlzdC5sZW5ndGg7XG5cdFx0XHRcdFx0KGZ1bmN0aW9uIGFkZCggYXJncyApIHtcblx0XHRcdFx0XHRcdGpRdWVyeS5lYWNoKCBhcmdzLCBmdW5jdGlvbiggXywgYXJnICkge1xuXHRcdFx0XHRcdFx0XHR2YXIgdHlwZSA9IGpRdWVyeS50eXBlKCBhcmcgKTtcblx0XHRcdFx0XHRcdFx0aWYgKCB0eXBlID09PSBcImZ1bmN0aW9uXCIgKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCAhb3B0aW9ucy51bmlxdWUgfHwgIXNlbGYuaGFzKCBhcmcgKSApIHtcblx0XHRcdFx0XHRcdFx0XHRcdGxpc3QucHVzaCggYXJnICk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKCBhcmcgJiYgYXJnLmxlbmd0aCAmJiB0eXBlICE9PSBcInN0cmluZ1wiICkge1xuXHRcdFx0XHRcdFx0XHRcdC8vIEluc3BlY3QgcmVjdXJzaXZlbHlcblx0XHRcdFx0XHRcdFx0XHRhZGQoIGFyZyApO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9KSggYXJndW1lbnRzICk7XG5cdFx0XHRcdFx0Ly8gRG8gd2UgbmVlZCB0byBhZGQgdGhlIGNhbGxiYWNrcyB0byB0aGVcblx0XHRcdFx0XHQvLyBjdXJyZW50IGZpcmluZyBiYXRjaD9cblx0XHRcdFx0XHRpZiAoIGZpcmluZyApIHtcblx0XHRcdFx0XHRcdGZpcmluZ0xlbmd0aCA9IGxpc3QubGVuZ3RoO1xuXHRcdFx0XHRcdC8vIFdpdGggbWVtb3J5LCBpZiB3ZSdyZSBub3QgZmlyaW5nIHRoZW5cblx0XHRcdFx0XHQvLyB3ZSBzaG91bGQgY2FsbCByaWdodCBhd2F5XG5cdFx0XHRcdFx0fSBlbHNlIGlmICggbWVtb3J5ICkge1xuXHRcdFx0XHRcdFx0ZmlyaW5nU3RhcnQgPSBzdGFydDtcblx0XHRcdFx0XHRcdGZpcmUoIG1lbW9yeSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH0sXG5cdFx0XHQvLyBSZW1vdmUgYSBjYWxsYmFjayBmcm9tIHRoZSBsaXN0XG5cdFx0XHRyZW1vdmU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAoIGxpc3QgKSB7XG5cdFx0XHRcdFx0alF1ZXJ5LmVhY2goIGFyZ3VtZW50cywgZnVuY3Rpb24oIF8sIGFyZyApIHtcblx0XHRcdFx0XHRcdHZhciBpbmRleDtcblx0XHRcdFx0XHRcdHdoaWxlKCAoIGluZGV4ID0galF1ZXJ5LmluQXJyYXkoIGFyZywgbGlzdCwgaW5kZXggKSApID4gLTEgKSB7XG5cdFx0XHRcdFx0XHRcdGxpc3Quc3BsaWNlKCBpbmRleCwgMSApO1xuXHRcdFx0XHRcdFx0XHQvLyBIYW5kbGUgZmlyaW5nIGluZGV4ZXNcblx0XHRcdFx0XHRcdFx0aWYgKCBmaXJpbmcgKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCBpbmRleCA8PSBmaXJpbmdMZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRmaXJpbmdMZW5ndGgtLTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCBpbmRleCA8PSBmaXJpbmdJbmRleCApIHtcblx0XHRcdFx0XHRcdFx0XHRcdGZpcmluZ0luZGV4LS07XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gQ29udHJvbCBpZiBhIGdpdmVuIGNhbGxiYWNrIGlzIGluIHRoZSBsaXN0XG5cdFx0XHRoYXM6IGZ1bmN0aW9uKCBmbiApIHtcblx0XHRcdFx0cmV0dXJuIGpRdWVyeS5pbkFycmF5KCBmbiwgbGlzdCApID4gLTE7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gUmVtb3ZlIGFsbCBjYWxsYmFja3MgZnJvbSB0aGUgbGlzdFxuXHRcdFx0ZW1wdHk6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRsaXN0ID0gW107XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fSxcblx0XHRcdC8vIEhhdmUgdGhlIGxpc3QgZG8gbm90aGluZyBhbnltb3JlXG5cdFx0XHRkaXNhYmxlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0bGlzdCA9IHN0YWNrID0gbWVtb3J5ID0gdW5kZWZpbmVkO1xuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH0sXG5cdFx0XHQvLyBJcyBpdCBkaXNhYmxlZD9cblx0XHRcdGRpc2FibGVkOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuICFsaXN0O1xuXHRcdFx0fSxcblx0XHRcdC8vIExvY2sgdGhlIGxpc3QgaW4gaXRzIGN1cnJlbnQgc3RhdGVcblx0XHRcdGxvY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRzdGFjayA9IHVuZGVmaW5lZDtcblx0XHRcdFx0aWYgKCAhbWVtb3J5ICkge1xuXHRcdFx0XHRcdHNlbGYuZGlzYWJsZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fSxcblx0XHRcdC8vIElzIGl0IGxvY2tlZD9cblx0XHRcdGxvY2tlZDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiAhc3RhY2s7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gQ2FsbCBhbGwgY2FsbGJhY2tzIHdpdGggdGhlIGdpdmVuIGNvbnRleHQgYW5kIGFyZ3VtZW50c1xuXHRcdFx0ZmlyZVdpdGg6IGZ1bmN0aW9uKCBjb250ZXh0LCBhcmdzICkge1xuXHRcdFx0XHRhcmdzID0gYXJncyB8fCBbXTtcblx0XHRcdFx0YXJncyA9IFsgY29udGV4dCwgYXJncy5zbGljZSA/IGFyZ3Muc2xpY2UoKSA6IGFyZ3MgXTtcblx0XHRcdFx0aWYgKCBsaXN0ICYmICggIWZpcmVkIHx8IHN0YWNrICkgKSB7XG5cdFx0XHRcdFx0aWYgKCBmaXJpbmcgKSB7XG5cdFx0XHRcdFx0XHRzdGFjay5wdXNoKCBhcmdzICk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGZpcmUoIGFyZ3MgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gQ2FsbCBhbGwgdGhlIGNhbGxiYWNrcyB3aXRoIHRoZSBnaXZlbiBhcmd1bWVudHNcblx0XHRcdGZpcmU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRzZWxmLmZpcmVXaXRoKCB0aGlzLCBhcmd1bWVudHMgKTtcblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gVG8ga25vdyBpZiB0aGUgY2FsbGJhY2tzIGhhdmUgYWxyZWFkeSBiZWVuIGNhbGxlZCBhdCBsZWFzdCBvbmNlXG5cdFx0XHRmaXJlZDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiAhIWZpcmVkO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0cmV0dXJuIHNlbGY7XG59O1xuXG4iLCIvKipcbiogalF1ZXJ5IGNvcmUgb2JqZWN0LlxuKlxuKiBXb3JrZXIgd2l0aCBqUXVlcnkgZGVmZXJyZWRcbipcbiogQ29kZSBmcm9tOiBodHRwczovL2dpdGh1Yi5jb20vanF1ZXJ5L2pxdWVyeS9ibG9iL21hc3Rlci9zcmMvY29yZS5qc1xuKlxuKi9cblxudmFyIGpRdWVyeSA9IG1vZHVsZS5leHBvcnRzID0ge1xuXHR0eXBlOiB0eXBlXG5cdCwgaXNBcnJheTogaXNBcnJheVxuXHQsIGlzRnVuY3Rpb246IGlzRnVuY3Rpb25cblx0LCBpc1BsYWluT2JqZWN0OiBpc1BsYWluT2JqZWN0XG5cdCwgZWFjaDogZWFjaFxuXHQsIGV4dGVuZDogZXh0ZW5kXG5cdCwgbm9vcDogZnVuY3Rpb24oKSB7fVxufTtcblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxudmFyIGNsYXNzMnR5cGUgPSB7fTtcbi8vIFBvcHVsYXRlIHRoZSBjbGFzczJ0eXBlIG1hcFxuXCJCb29sZWFuIE51bWJlciBTdHJpbmcgRnVuY3Rpb24gQXJyYXkgRGF0ZSBSZWdFeHAgT2JqZWN0XCIuc3BsaXQoXCIgXCIpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuXHRjbGFzczJ0eXBlWyBcIltvYmplY3QgXCIgKyBuYW1lICsgXCJdXCIgXSA9IG5hbWUudG9Mb3dlckNhc2UoKTtcbn0pO1xuXG5cbmZ1bmN0aW9uIHR5cGUoIG9iaiApIHtcblx0cmV0dXJuIG9iaiA9PSBudWxsID9cblx0XHRTdHJpbmcoIG9iaiApIDpcblx0XHRcdGNsYXNzMnR5cGVbIHRvU3RyaW5nLmNhbGwob2JqKSBdIHx8IFwib2JqZWN0XCI7XG59XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oIG9iaiApIHtcblx0cmV0dXJuIGpRdWVyeS50eXBlKG9iaikgPT09IFwiZnVuY3Rpb25cIjtcbn1cblxuZnVuY3Rpb24gaXNBcnJheSggb2JqICkge1xuXHRyZXR1cm4galF1ZXJ5LnR5cGUob2JqKSA9PT0gXCJhcnJheVwiO1xufVxuXG5mdW5jdGlvbiBlYWNoKCBvYmplY3QsIGNhbGxiYWNrLCBhcmdzICkge1xuXHR2YXIgbmFtZSwgaSA9IDAsXG5cdGxlbmd0aCA9IG9iamVjdC5sZW5ndGgsXG5cdGlzT2JqID0gbGVuZ3RoID09PSB1bmRlZmluZWQgfHwgaXNGdW5jdGlvbiggb2JqZWN0ICk7XG5cblx0aWYgKCBhcmdzICkge1xuXHRcdGlmICggaXNPYmogKSB7XG5cdFx0XHRmb3IgKCBuYW1lIGluIG9iamVjdCApIHtcblx0XHRcdFx0aWYgKCBjYWxsYmFjay5hcHBseSggb2JqZWN0WyBuYW1lIF0sIGFyZ3MgKSA9PT0gZmFsc2UgKSB7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0Zm9yICggOyBpIDwgbGVuZ3RoOyApIHtcblx0XHRcdFx0aWYgKCBjYWxsYmFjay5hcHBseSggb2JqZWN0WyBpKysgXSwgYXJncyApID09PSBmYWxzZSApIHtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIEEgc3BlY2lhbCwgZmFzdCwgY2FzZSBmb3IgdGhlIG1vc3QgY29tbW9uIHVzZSBvZiBlYWNoXG5cdH0gZWxzZSB7XG5cdFx0aWYgKCBpc09iaiApIHtcblx0XHRcdGZvciAoIG5hbWUgaW4gb2JqZWN0ICkge1xuXHRcdFx0XHRpZiAoIGNhbGxiYWNrLmNhbGwoIG9iamVjdFsgbmFtZSBdLCBuYW1lLCBvYmplY3RbIG5hbWUgXSApID09PSBmYWxzZSApIHtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRmb3IgKCA7IGkgPCBsZW5ndGg7ICkge1xuXHRcdFx0XHRpZiAoIGNhbGxiYWNrLmNhbGwoIG9iamVjdFsgaSBdLCBpLCBvYmplY3RbIGkrKyBdICkgPT09IGZhbHNlICkge1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIG9iamVjdDtcbn1cblxuZnVuY3Rpb24gaXNQbGFpbk9iamVjdCggb2JqICkge1xuXHQvLyBNdXN0IGJlIGFuIE9iamVjdC5cblx0aWYgKCAhb2JqIHx8IGpRdWVyeS50eXBlKG9iaikgIT09IFwib2JqZWN0XCIgKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cdHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBleHRlbmQoKSB7XG5cdHZhciBvcHRpb25zLCBuYW1lLCBzcmMsIGNvcHksIGNvcHlJc0FycmF5LCBjbG9uZSxcblx0dGFyZ2V0ID0gYXJndW1lbnRzWzBdIHx8IHt9LFxuXHRpID0gMSxcblx0bGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCxcblx0ZGVlcCA9IGZhbHNlO1xuXG5cdC8vIEhhbmRsZSBhIGRlZXAgY29weSBzaXR1YXRpb25cblx0aWYgKCB0eXBlb2YgdGFyZ2V0ID09PSBcImJvb2xlYW5cIiApIHtcblx0XHRkZWVwID0gdGFyZ2V0O1xuXHRcdHRhcmdldCA9IGFyZ3VtZW50c1sxXSB8fCB7fTtcblx0XHQvLyBza2lwIHRoZSBib29sZWFuIGFuZCB0aGUgdGFyZ2V0XG5cdFx0aSA9IDI7XG5cdH1cblxuXHQvLyBIYW5kbGUgY2FzZSB3aGVuIHRhcmdldCBpcyBhIHN0cmluZyBvciBzb21ldGhpbmcgKHBvc3NpYmxlIGluIGRlZXAgY29weSlcblx0aWYgKCB0eXBlb2YgdGFyZ2V0ICE9PSBcIm9iamVjdFwiICYmICFqUXVlcnkuaXNGdW5jdGlvbih0YXJnZXQpICkge1xuXHRcdHRhcmdldCA9IHt9O1xuXHR9XG5cblx0Ly8gZXh0ZW5kIGpRdWVyeSBpdHNlbGYgaWYgb25seSBvbmUgYXJndW1lbnQgaXMgcGFzc2VkXG5cdGlmICggbGVuZ3RoID09PSBpICkge1xuXHRcdHRhcmdldCA9IHRoaXM7XG5cdFx0LS1pO1xuXHR9XG5cblx0Zm9yICggOyBpIDwgbGVuZ3RoOyBpKysgKSB7XG5cdFx0Ly8gT25seSBkZWFsIHdpdGggbm9uLW51bGwvdW5kZWZpbmVkIHZhbHVlc1xuXHRcdGlmICggKG9wdGlvbnMgPSBhcmd1bWVudHNbIGkgXSkgIT0gbnVsbCApIHtcblx0XHRcdC8vIEV4dGVuZCB0aGUgYmFzZSBvYmplY3Rcblx0XHRcdGZvciAoIG5hbWUgaW4gb3B0aW9ucyApIHtcblx0XHRcdFx0c3JjID0gdGFyZ2V0WyBuYW1lIF07XG5cdFx0XHRcdGNvcHkgPSBvcHRpb25zWyBuYW1lIF07XG5cblx0XHRcdFx0Ly8gUHJldmVudCBuZXZlci1lbmRpbmcgbG9vcFxuXHRcdFx0XHRpZiAoIHRhcmdldCA9PT0gY29weSApIHtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFJlY3Vyc2UgaWYgd2UncmUgbWVyZ2luZyBwbGFpbiBvYmplY3RzIG9yIGFycmF5c1xuXHRcdFx0XHRpZiAoIGRlZXAgJiYgY29weSAmJiAoIGpRdWVyeS5pc1BsYWluT2JqZWN0KGNvcHkpIHx8IChjb3B5SXNBcnJheSA9IGpRdWVyeS5pc0FycmF5KGNvcHkpKSApICkge1xuXHRcdFx0XHRcdGlmICggY29weUlzQXJyYXkgKSB7XG5cdFx0XHRcdFx0XHRjb3B5SXNBcnJheSA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0Y2xvbmUgPSBzcmMgJiYgalF1ZXJ5LmlzQXJyYXkoc3JjKSA/IHNyYyA6IFtdO1xuXG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGNsb25lID0gc3JjICYmIGpRdWVyeS5pc1BsYWluT2JqZWN0KHNyYykgPyBzcmMgOiB7fTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBOZXZlciBtb3ZlIG9yaWdpbmFsIG9iamVjdHMsIGNsb25lIHRoZW1cblx0XHRcdFx0XHR0YXJnZXRbIG5hbWUgXSA9IGpRdWVyeS5leHRlbmQoIGRlZXAsIGNsb25lLCBjb3B5ICk7XG5cblx0XHRcdFx0XHQvLyBEb24ndCBicmluZyBpbiB1bmRlZmluZWQgdmFsdWVzXG5cdFx0XHRcdH0gZWxzZSBpZiAoIGNvcHkgIT09IHVuZGVmaW5lZCApIHtcblx0XHRcdFx0XHR0YXJnZXRbIG5hbWUgXSA9IGNvcHk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvLyBSZXR1cm4gdGhlIG1vZGlmaWVkIG9iamVjdFxuXHRyZXR1cm4gdGFyZ2V0O1xufTtcblxuXG4iLCJcbi8qIVxuKiBqcXVlcnktZGVmZXJyZWRcbiogQ29weXJpZ2h0KGMpIDIwMTEgSGlkZGVuIDx6emRoaWRkZW5AZ21haWwuY29tPlxuKiBNSVQgTGljZW5zZWRcbiovXG5cbi8qKlxuKiBMaWJyYXJ5IHZlcnNpb24uXG4qL1xuXG52YXIgalF1ZXJ5ID0gbW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9qcXVlcnktY2FsbGJhY2tzLmpzXCIpLFxuXHRjb3JlX3NsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xuXG4vKipcbiogalF1ZXJ5IGRlZmVycmVkXG4qXG4qIENvZGUgZnJvbTogaHR0cHM6Ly9naXRodWIuY29tL2pxdWVyeS9qcXVlcnkvYmxvYi9tYXN0ZXIvc3JjL2RlZmVycmVkLmpzXG4qIERvYzogaHR0cDovL2FwaS5qcXVlcnkuY29tL2NhdGVnb3J5L2RlZmVycmVkLW9iamVjdC9cbipcbiovXG5cbmpRdWVyeS5leHRlbmQoe1xuXG5cdERlZmVycmVkOiBmdW5jdGlvbiggZnVuYyApIHtcblx0XHR2YXIgdHVwbGVzID0gW1xuXHRcdFx0XHQvLyBhY3Rpb24sIGFkZCBsaXN0ZW5lciwgbGlzdGVuZXIgbGlzdCwgZmluYWwgc3RhdGVcblx0XHRcdFx0WyBcInJlc29sdmVcIiwgXCJkb25lXCIsIGpRdWVyeS5DYWxsYmFja3MoXCJvbmNlIG1lbW9yeVwiKSwgXCJyZXNvbHZlZFwiIF0sXG5cdFx0XHRcdFsgXCJyZWplY3RcIiwgXCJmYWlsXCIsIGpRdWVyeS5DYWxsYmFja3MoXCJvbmNlIG1lbW9yeVwiKSwgXCJyZWplY3RlZFwiIF0sXG5cdFx0XHRcdFsgXCJub3RpZnlcIiwgXCJwcm9ncmVzc1wiLCBqUXVlcnkuQ2FsbGJhY2tzKFwibWVtb3J5XCIpIF1cblx0XHRcdF0sXG5cdFx0XHRzdGF0ZSA9IFwicGVuZGluZ1wiLFxuXHRcdFx0cHJvbWlzZSA9IHtcblx0XHRcdFx0c3RhdGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBzdGF0ZTtcblx0XHRcdFx0fSxcblx0XHRcdFx0YWx3YXlzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRkZWZlcnJlZC5kb25lKCBhcmd1bWVudHMgKS5mYWlsKCBhcmd1bWVudHMgKTtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdFx0fSxcblx0XHRcdFx0dGhlbjogZnVuY3Rpb24oIC8qIGZuRG9uZSwgZm5GYWlsLCBmblByb2dyZXNzICovICkge1xuXHRcdFx0XHRcdHZhciBmbnMgPSBhcmd1bWVudHM7XG5cdFx0XHRcdFx0cmV0dXJuIGpRdWVyeS5EZWZlcnJlZChmdW5jdGlvbiggbmV3RGVmZXIgKSB7XG5cdFx0XHRcdFx0XHRqUXVlcnkuZWFjaCggdHVwbGVzLCBmdW5jdGlvbiggaSwgdHVwbGUgKSB7XG5cdFx0XHRcdFx0XHRcdHZhciBhY3Rpb24gPSB0dXBsZVsgMCBdLFxuXHRcdFx0XHRcdFx0XHRcdGZuID0gZm5zWyBpIF07XG5cdFx0XHRcdFx0XHRcdC8vIGRlZmVycmVkWyBkb25lIHwgZmFpbCB8IHByb2dyZXNzIF0gZm9yIGZvcndhcmRpbmcgYWN0aW9ucyB0byBuZXdEZWZlclxuXHRcdFx0XHRcdFx0XHRkZWZlcnJlZFsgdHVwbGVbMV0gXSggalF1ZXJ5LmlzRnVuY3Rpb24oIGZuICkgP1xuXHRcdFx0XHRcdFx0XHRcdGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0dmFyIHJldHVybmVkID0gZm4uYXBwbHkoIHRoaXMsIGFyZ3VtZW50cyApO1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKCByZXR1cm5lZCAmJiBqUXVlcnkuaXNGdW5jdGlvbiggcmV0dXJuZWQucHJvbWlzZSApICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm5lZC5wcm9taXNlKClcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQuZG9uZSggbmV3RGVmZXIucmVzb2x2ZSApXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0LmZhaWwoIG5ld0RlZmVyLnJlamVjdCApXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0LnByb2dyZXNzKCBuZXdEZWZlci5ub3RpZnkgKTtcblx0XHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdG5ld0RlZmVyWyBhY3Rpb24gKyBcIldpdGhcIiBdKCB0aGlzID09PSBkZWZlcnJlZCA/IG5ld0RlZmVyIDogdGhpcywgWyByZXR1cm5lZCBdICk7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fSA6XG5cdFx0XHRcdFx0XHRcdFx0bmV3RGVmZXJbIGFjdGlvbiBdXG5cdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdGZucyA9IG51bGw7XG5cdFx0XHRcdFx0fSkucHJvbWlzZSgpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHQvLyBHZXQgYSBwcm9taXNlIGZvciB0aGlzIGRlZmVycmVkXG5cdFx0XHRcdC8vIElmIG9iaiBpcyBwcm92aWRlZCwgdGhlIHByb21pc2UgYXNwZWN0IGlzIGFkZGVkIHRvIHRoZSBvYmplY3Rcblx0XHRcdFx0cHJvbWlzZTogZnVuY3Rpb24oIG9iaiApIHtcblx0XHRcdFx0XHRyZXR1cm4gb2JqICE9IG51bGwgPyBqUXVlcnkuZXh0ZW5kKCBvYmosIHByb21pc2UgKSA6IHByb21pc2U7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRkZWZlcnJlZCA9IHt9O1xuXG5cdFx0Ly8gS2VlcCBwaXBlIGZvciBiYWNrLWNvbXBhdFxuXHRcdHByb21pc2UucGlwZSA9IHByb21pc2UudGhlbjtcblxuXHRcdC8vIEFkZCBsaXN0LXNwZWNpZmljIG1ldGhvZHNcblx0XHRqUXVlcnkuZWFjaCggdHVwbGVzLCBmdW5jdGlvbiggaSwgdHVwbGUgKSB7XG5cdFx0XHR2YXIgbGlzdCA9IHR1cGxlWyAyIF0sXG5cdFx0XHRcdHN0YXRlU3RyaW5nID0gdHVwbGVbIDMgXTtcblxuXHRcdFx0Ly8gcHJvbWlzZVsgZG9uZSB8IGZhaWwgfCBwcm9ncmVzcyBdID0gbGlzdC5hZGRcblx0XHRcdHByb21pc2VbIHR1cGxlWzFdIF0gPSBsaXN0LmFkZDtcblxuXHRcdFx0Ly8gSGFuZGxlIHN0YXRlXG5cdFx0XHRpZiAoIHN0YXRlU3RyaW5nICkge1xuXHRcdFx0XHRsaXN0LmFkZChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvLyBzdGF0ZSA9IFsgcmVzb2x2ZWQgfCByZWplY3RlZCBdXG5cdFx0XHRcdFx0c3RhdGUgPSBzdGF0ZVN0cmluZztcblxuXHRcdFx0XHQvLyBbIHJlamVjdF9saXN0IHwgcmVzb2x2ZV9saXN0IF0uZGlzYWJsZTsgcHJvZ3Jlc3NfbGlzdC5sb2NrXG5cdFx0XHRcdH0sIHR1cGxlc1sgaSBeIDEgXVsgMiBdLmRpc2FibGUsIHR1cGxlc1sgMiBdWyAyIF0ubG9jayApO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBkZWZlcnJlZFsgcmVzb2x2ZSB8IHJlamVjdCB8IG5vdGlmeSBdID0gbGlzdC5maXJlXG5cdFx0XHRkZWZlcnJlZFsgdHVwbGVbMF0gXSA9IGxpc3QuZmlyZTtcblx0XHRcdGRlZmVycmVkWyB0dXBsZVswXSArIFwiV2l0aFwiIF0gPSBsaXN0LmZpcmVXaXRoO1xuXHRcdH0pO1xuXG5cdFx0Ly8gTWFrZSB0aGUgZGVmZXJyZWQgYSBwcm9taXNlXG5cdFx0cHJvbWlzZS5wcm9taXNlKCBkZWZlcnJlZCApO1xuXG5cdFx0Ly8gQ2FsbCBnaXZlbiBmdW5jIGlmIGFueVxuXHRcdGlmICggZnVuYyApIHtcblx0XHRcdGZ1bmMuY2FsbCggZGVmZXJyZWQsIGRlZmVycmVkICk7XG5cdFx0fVxuXG5cdFx0Ly8gQWxsIGRvbmUhXG5cdFx0cmV0dXJuIGRlZmVycmVkO1xuXHR9LFxuXG5cdC8vIERlZmVycmVkIGhlbHBlclxuXHR3aGVuOiBmdW5jdGlvbiggc3Vib3JkaW5hdGUgLyogLCAuLi4sIHN1Ym9yZGluYXRlTiAqLyApIHtcblx0XHR2YXIgaSA9IDAsXG5cdFx0XHRyZXNvbHZlVmFsdWVzID0gY29yZV9zbGljZS5jYWxsKCBhcmd1bWVudHMgKSxcblx0XHRcdGxlbmd0aCA9IHJlc29sdmVWYWx1ZXMubGVuZ3RoLFxuXG5cdFx0XHQvLyB0aGUgY291bnQgb2YgdW5jb21wbGV0ZWQgc3Vib3JkaW5hdGVzXG5cdFx0XHRyZW1haW5pbmcgPSBsZW5ndGggIT09IDEgfHwgKCBzdWJvcmRpbmF0ZSAmJiBqUXVlcnkuaXNGdW5jdGlvbiggc3Vib3JkaW5hdGUucHJvbWlzZSApICkgPyBsZW5ndGggOiAwLFxuXG5cdFx0XHQvLyB0aGUgbWFzdGVyIERlZmVycmVkLiBJZiByZXNvbHZlVmFsdWVzIGNvbnNpc3Qgb2Ygb25seSBhIHNpbmdsZSBEZWZlcnJlZCwganVzdCB1c2UgdGhhdC5cblx0XHRcdGRlZmVycmVkID0gcmVtYWluaW5nID09PSAxID8gc3Vib3JkaW5hdGUgOiBqUXVlcnkuRGVmZXJyZWQoKSxcblxuXHRcdFx0Ly8gVXBkYXRlIGZ1bmN0aW9uIGZvciBib3RoIHJlc29sdmUgYW5kIHByb2dyZXNzIHZhbHVlc1xuXHRcdFx0dXBkYXRlRnVuYyA9IGZ1bmN0aW9uKCBpLCBjb250ZXh0cywgdmFsdWVzICkge1xuXHRcdFx0XHRyZXR1cm4gZnVuY3Rpb24oIHZhbHVlICkge1xuXHRcdFx0XHRcdGNvbnRleHRzWyBpIF0gPSB0aGlzO1xuXHRcdFx0XHRcdHZhbHVlc1sgaSBdID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBjb3JlX3NsaWNlLmNhbGwoIGFyZ3VtZW50cyApIDogdmFsdWU7XG5cdFx0XHRcdFx0aWYoIHZhbHVlcyA9PT0gcHJvZ3Jlc3NWYWx1ZXMgKSB7XG5cdFx0XHRcdFx0XHRkZWZlcnJlZC5ub3RpZnlXaXRoKCBjb250ZXh0cywgdmFsdWVzICk7XG5cdFx0XHRcdFx0fSBlbHNlIGlmICggISggLS1yZW1haW5pbmcgKSApIHtcblx0XHRcdFx0XHRcdGRlZmVycmVkLnJlc29sdmVXaXRoKCBjb250ZXh0cywgdmFsdWVzICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXHRcdFx0fSxcblxuXHRcdFx0cHJvZ3Jlc3NWYWx1ZXMsIHByb2dyZXNzQ29udGV4dHMsIHJlc29sdmVDb250ZXh0cztcblxuXHRcdC8vIGFkZCBsaXN0ZW5lcnMgdG8gRGVmZXJyZWQgc3Vib3JkaW5hdGVzOyB0cmVhdCBvdGhlcnMgYXMgcmVzb2x2ZWRcblx0XHRpZiAoIGxlbmd0aCA+IDEgKSB7XG5cdFx0XHRwcm9ncmVzc1ZhbHVlcyA9IG5ldyBBcnJheSggbGVuZ3RoICk7XG5cdFx0XHRwcm9ncmVzc0NvbnRleHRzID0gbmV3IEFycmF5KCBsZW5ndGggKTtcblx0XHRcdHJlc29sdmVDb250ZXh0cyA9IG5ldyBBcnJheSggbGVuZ3RoICk7XG5cdFx0XHRmb3IgKCA7IGkgPCBsZW5ndGg7IGkrKyApIHtcblx0XHRcdFx0aWYgKCByZXNvbHZlVmFsdWVzWyBpIF0gJiYgalF1ZXJ5LmlzRnVuY3Rpb24oIHJlc29sdmVWYWx1ZXNbIGkgXS5wcm9taXNlICkgKSB7XG5cdFx0XHRcdFx0cmVzb2x2ZVZhbHVlc1sgaSBdLnByb21pc2UoKVxuXHRcdFx0XHRcdFx0LmRvbmUoIHVwZGF0ZUZ1bmMoIGksIHJlc29sdmVDb250ZXh0cywgcmVzb2x2ZVZhbHVlcyApIClcblx0XHRcdFx0XHRcdC5mYWlsKCBkZWZlcnJlZC5yZWplY3QgKVxuXHRcdFx0XHRcdFx0LnByb2dyZXNzKCB1cGRhdGVGdW5jKCBpLCBwcm9ncmVzc0NvbnRleHRzLCBwcm9ncmVzc1ZhbHVlcyApICk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0LS1yZW1haW5pbmc7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBpZiB3ZSdyZSBub3Qgd2FpdGluZyBvbiBhbnl0aGluZywgcmVzb2x2ZSB0aGUgbWFzdGVyXG5cdFx0aWYgKCAhcmVtYWluaW5nICkge1xuXHRcdFx0ZGVmZXJyZWQucmVzb2x2ZVdpdGgoIHJlc29sdmVDb250ZXh0cywgcmVzb2x2ZVZhbHVlcyApO1xuXHRcdH1cblxuXHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG5cdH1cbn0pO1xuIl19
