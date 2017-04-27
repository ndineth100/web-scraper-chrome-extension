const ElementQuery = require('../../extension/scripts/ElementQuery')
const assert = require('chai').assert

describe('ElementQuery', function () {
  var $el

  beforeEach(function () {
    $el = jQuery('#tests').html('')
    if ($el.length === 0) {
      $el = $("<div id='tests' style='display:none'></div>").appendTo('body')
    }
  })

  it('should be able to select elements', function () {
    $el.append('<a></a><span></span>')

    var selectedElements = ElementQuery('a, span', $el)
    var expectedElements = $('a, span', $el)

    assert.deepEqual(selectedElements.sort(), expectedElements.get().sort())
  })

  it('should be able to select parent', function () {
    $el.append('<a></a><span></span>')

    var selectedElements = ElementQuery('a, span, _parent_', $el)
    var expectedElements = $('a, span', $el)
    expectedElements = expectedElements.add($el)

    assert.deepEqual(selectedElements.sort(), expectedElements.get().sort())
  })

  it('should should not return duplicates', function () {
    $el.append('<a></a><span></span>')

    var selectedElements = ElementQuery('*, a, span, _parent_', $el)
    var expectedElements = $('a, span', $el)
    expectedElements = expectedElements.add($el)

    assert.deepEqual(selectedElements.length, 3)
    assert.deepEqual(selectedElements.sort(), expectedElements.get().sort())
  })

  it('should be able to select parent when parent there are multiple parents', function () {
    $el.append('<span></span><span></span>')

    var selectedElements = ElementQuery('_parent_', $('span', $el))
    var expectedElements = $('span', $el)

    assert.deepEqual(selectedElements.length, 2)
    assert.deepEqual(selectedElements.sort(), expectedElements.get().sort())
  })

  it('should be able to select element with a comma ,', function () {
    $el.append('<span>,</span>')

    var selectedElements = ElementQuery(":contains(',')", $el)
    var expectedElements = $('span', $el)

    assert.deepEqual(selectedElements.length, 1)
    assert.deepEqual(selectedElements.sort(), expectedElements.get().sort())
  })

  it('should preserve spaces', function () {
    var parts = ElementQuery.getSelectorParts('div.well li:nth-of-type(2) a')
    assert.deepEqual(parts, ['div.well li:nth-of-type(2) a'])
  })
})
