const Selector = require('./../../extension/scripts/Selector')
const utils = require('./../utils')
const assert = require('chai').assert

describe('Selector', function () {
  var $el

  beforeEach(function () {
    console.log(utils)
    document.body.innerHTML = utils.getTestHTML()
    $el = utils.createElementFromHTML("<div id='tests' style='display:none'>aaaaaaaaaaaa</div>")
    document.body.appendChild($el)
  })

  it('should be able to select elements', function () {
    $el.innerHTML = '<a></a>'
    var selector = new Selector({
      selector: 'a',
      type: 'SelectorLink'
    })
    var elements = selector.getDataElements($el)

    assert.deepEqual(elements, Object.values($el.querySelectorAll('a')))
  })

  it('should be able to select parent', function () {
    $el.innerHTML = '<a></a>'
    var selector = new Selector({
      selector: '_parent_',
      type: 'SelectorLink'
    })
    var elements = selector.getDataElements($el)

    assert.deepEqual(elements, [$el])
  })

  it('should be able to select elements with delay', function () {
    var selector = new Selector({
      id: 'a',
      selector: 'a',
      type: 'SelectorText',
      delay: 100
    })
    var dataDeferred = selector.getData($el)

		// add data after data extraction called
    $el.innerHTML = '<a>a</a>'

    return dataDeferred.then(function (data) {
      assert.deepEqual(data, [
        {
          'a': 'a'
        }
      ])
    })
  })
})
