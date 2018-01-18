/**
 * Element selector. Uses jQuery as base and adds some more features
 * @param CSSSelector
 * @param parentElement
 * @param options
 */
var ElementQuery = function (CSSSelector, parentElement, options) {
  CSSSelector = CSSSelector || ''
  this.$ = options.$
  this.document = options.document
  this.window = options.window
  if (!this.$) throw new Error('Missing jquery for ElementQuery')
  if (!this.document) throw new Error("Missing document")
  if(!this.window)throw new Error("Missing window")
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
    } else {
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
