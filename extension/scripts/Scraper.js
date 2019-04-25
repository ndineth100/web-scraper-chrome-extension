var whenCallSequentially = require('../assets/jquery.whencallsequentially')
var Job = require('./Job')
const debug = require('debug')('web-scraper-headless:scraper')
var Scraper = function (options, moreOptions) {
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
      this.queue.add(firstJob).then(function(result){
          console.log('new job added : '+JSON.stringify(result));
      }).catch(function(err){
        console.log("Error occured in : this.queue.add(firstJob)! Err: "+JSON.stringify(err))
      })
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
    var browser = this.browser
    return browser.saveImages(record, namingFunction.bind(this))

    function namingFunction (selectorId) { return this.sitemap._id + '/' + selectorId + '/' + this.getFileFilename(record[selectorId + '-src']) }
  },

	// @TODO remove recursion and add an iterative way to run these jobs.
  _run: function () {
    let browser = this.browser
    let _this = this
    this.queue.getNextJob().then(function(job){
      if (job === false) {
        console.log('_run : job == false')
        debug('Scraper execution is finished')
        browser.close()
        _this.executionCallback()
        return
      }
      console.log('_run : job == true')

      console.log(JSON.stringify(browser))
      debug('starting execute')
      job.execute(browser, function (err, job) {
        if (err) {
          // jobs don't seem to return anything
          console.log('_run : error in job')
          return console.error('Error in job', err)
        }
        console.log('_run : inside execute');
        debug('finished executing')
        var scrapedRecords = []
        var deferredDatamanipulations = []

        var records = job.getResults()

        records.forEach(function (record) {
          // var record = JSON.parse(JSON.stringify(rec));

          deferredDatamanipulations.push(_this.saveImages.bind(_this, record))

          // @TODO refactor job exstraction to a seperate method
          if (_this.recordCanHaveChildJobs(record)) {
              console.log('record can have chlid jobs : '+JSON.stringify(record));
              var followSelectorId = record._followSelectorId
              var followURL = record['_follow']
              delete record['_follow']
              delete record['_followSelectorId']
              var newJob = new Job(followURL, followSelectorId, _this, job, record)
              _this.queue.canBeAdded(newJob).then(function(result){
                  if (result) {
                    _this.queue.add(newJob).then(function(result){
                        console.log('new job added : '+JSON.stringify(newJob));
                    }).catch(function(err){
                      console.log("Error occured in : _this.queue.canBeAdded! Err: "+JSON.stringify(err))
                    })
                  } else {
                    // store already scraped links
                    debug('Ignoring next')
                    console.log('ignoring record : '+JSON.stringify(record));
                    debug(record)
              //						scrapedRecords.push(record);
                }
              }).catch(function(err){
                console.log("Error occured in : _this.queue.canBeAdded! Err: "+JSON.stringify(err))
              })
          } else {
                console.log('record can not have chlid jobs : '+JSON.stringify(record));
                if (record._follow !== undefined) {
                  console.log('record _follow is not undefined : '+JSON.stringify(record._follow));
                  delete record['_follow']
                  delete record['_followSelectorId']
                }
                scrapedRecords.push(record)
                console.log(record)
          }
        }.bind(_this))

        whenCallSequentially(deferredDatamanipulations).done(function () {
          _this.resultWriter.writeDocs(scrapedRecords, function () {
            var now = (new Date()).getTime()
            // delay next job if needed
            this._timeNextScrapeAvailable = now + _this.requestInterval
            if (now >= _this._timeNextScrapeAvailable) {
              _this._run()
            } else {
              var delay = _this._timeNextScrapeAvailable - now
              setTimeout(function () {
                _this._run()
              }.bind(_this), delay)
            }
          }.bind(_this))
        }.bind(_this))
      }.bind(_this))
    }).catch(function(err){
      console.log("Error occured in : _run function! Err: "+JSON.stringify(err))
    })
  }
}

module.exports = Scraper
