var selectors = require('./Selectors')
var ElementQuery = require('./ElementQuery')
var jquery = require('jquery-deferred')

var Selector = function (selector, options) {
  var $ = options.$
  var document = options.document
  var window = options.window
  // We don't want enumerable properties
  Object.defineProperty(this, '$', {
    value: $,
    enumerable: false
  })
  Object.defineProperty(this, 'window', {
    value: window,
    enumerable: false
  })
  Object.defineProperty(this, 'document', {
    value: document,
    enumerable: false
  })
  if (!this.$) throw new Error('Missing jquery')
  if (!this.document) throw new Error("Missing document")
  if(!this.window)throw new Error("Missing window")

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
    var allowedKeys = ['window', 'document', 'id', 'type', 'selector', 'parentSelectors']
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
    var document = this.document
    var window = this.window
    var elements = ElementQuery(this.selector, parentElement, {$, document, window})
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
    }	else {
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
