const url = require('url')
const jquery = require('jquery-deferred')
const debug = require('debug')('web-scraper-headless:selector-goog-map-id')

var SelectorGoogMapID = {

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
  getMapID: function ($container) {
    const $ = this.$
    const mapSelector = this.getMapsSelector()
    const mUrl = $($container).find(mapSelector).attr('src')
    if (!mUrl) {
      debug('Goog map url was undefined')
      return ''
    }
    const mQuery = url.parse(mUrl, true).query
    const pb = mQuery ? mQuery.pb : null
    if (!pb) {
      debug('Pb in query was undefined in url', url)
      return ''
    }
    const match = pb.match(/0x[0-9a-f]{15,16}:0x[0-9a-f]{15,16}/)
    if (!match) {
      debug('Could not find fid in pb', pb)
      return ''
    }
    return match[0]
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred()
    var $ = this.$

    // easier to select divs containing the iframe
    var containers = this.getDataElements(parentElement)
    const result = []
    var selector = this
    $(containers).each(function (k, container) {
      const mapId = selector.getMapID($(container))
      result.push({FTID: mapId})
    })

    dfd.resolve(result)
    return dfd.promise()
  },

  getDataColumns: function () {
    return ['FTID'] // TODO CID
  },

  getFeatures: function () {
    return ['googType', 'mapsSelectorFromDiv']
  },

  getItemCSSSelector: function () {
    // We get the container
    return '*'
  },

  getMapsSelectorFromDivHTML: function (html, options = {}) {
    const $ = options.$ || this.$
    const div = $(html)
    const defaultSelector = 'iframe[src*="google.com/maps/embed"]'
    if (div.find(defaultSelector).length) {
      return defaultSelector
    }
    return ''
  },

  getMapsSelector: function () {
    if (this.mapsSelectorFromDiv === undefined) {
      return 'iframe[src*="google.com/maps/embed"]'
    } else {
      return this.mapsSelectorFromDiv
    }
  }
}

module.exports = SelectorGoogMapID
