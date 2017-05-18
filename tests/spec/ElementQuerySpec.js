const ElementQuery = require('../../extension/scripts/ElementQuery')
const assert = require('chai').assert
const utils = require('./../utils')
const globals = require('../globals')

describe('ElementQuery', function () {
  var $el
  let $
  let document
  let window
  beforeEach(function () {
    $ = globals.$
    document = globals.document
    window = globals.window

    document.body.innerHTML = utils.getTestHTML()
    $el = utils.createElementFromHTML("<div id='tests' style='display:none'></div>", document)
    document.body.appendChild($el)
  })

  it('should be able to select elements', function () {
    $el.innerHTML = '<a></a><span></span>'

    var selectedElements = ElementQuery('a, span', $el, {$, document, window})
    var expectedElements = Array.from($el.querySelectorAll('a, span'))

    assert.deepEqual(selectedElements.sort(), expectedElements)
  })

  it('should be able to select parent', function () {
    $el.innerHTML = '<a></a><span></span>'

    var selectedElements = ElementQuery('a, span, _parent_', $el, {$, document, window})
    var expectedElements = Array.from($el.querySelectorAll('a, span'))
    expectedElements.push($el)

    assert.deepEqual(selectedElements.sort(), expectedElements.sort())
  })

  it('should should not return duplicates', function () {
    $el.innerHTML = '<a></a><span></span>'

    var selectedElements = ElementQuery('*, a, span, _parent_', $el, {$, document, window})
    var expectedElements = Array.from($el.querySelectorAll('a, span'))
    expectedElements.push($el)

    assert.deepEqual(selectedElements.length, 3)
    assert.deepEqual(selectedElements.sort(), expectedElements.sort())
  })

  it('should be able to select parent when parent there are multiple parents', function () {
    $el.innerHTML = '<span></span><span></span>'

    var selectedElements = ElementQuery('_parent_', $el.querySelectorAll('span'), {$, document, window})
    var expectedElements = Array.from($el.querySelectorAll('span'))

    assert.deepEqual(selectedElements.length, 2)
    assert.deepEqual(selectedElements.sort(), expectedElements)
  })

  it('should be able to select element with a comma ,', function () {
    $el.innerHTML = '<span>,</span>'

    var selectedElements = ElementQuery(":contains(',')", $el, {$, document, window})
    var expectedElements = Array.from($el.querySelectorAll('span'))

    assert.deepEqual(selectedElements.length, 1)
    assert.deepEqual(selectedElements.sort(), expectedElements.sort())
  })

  it('should preserve spaces', function () {
    var parts = ElementQuery.getSelectorParts('div.well li:nth-of-type(2) a')
    assert.deepEqual(parts, ['div.well li:nth-of-type(2) a'])
  })
})
