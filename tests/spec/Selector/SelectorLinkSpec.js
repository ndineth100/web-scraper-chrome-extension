var Selector = require('../../../extension/scripts/Selector')
const utils = require('./../../utils')
const assert = require('chai').assert
const globals = require('../../globals')

describe('Link Selector', function () {
  var $el
  let $
  beforeEach(function () {
    $ = globals.$
    document.body.innerHTML = utils.getTestHTML()
    $el = utils.createElementFromHTML("<div id='tests' style='display:none'></div>")
    document.body.appendChild($el)
  })

  it('should extract single link', function (done) {
    var selector = new Selector({
      id: 'a',
      type: 'SelectorLink',
      multiple: false,
      selector: 'a'
    }, {$})

    var dataDeferred = selector.getData(document.querySelectorAll('#selector-follow')[0])
    dataDeferred.then(function (data) {
      var expected = [
        {
          a: 'a',
          'a-href': 'http://example.com/a',
          _follow: 'http://example.com/a',
          _followSelectorId: 'a'
        }
      ]
      assert.deepEqual(data, expected)
      done()
    })
  })

  it('should extract multiple links', function (done) {
    var selector = new Selector({
      id: 'a',
      type: 'SelectorLink',
      multiple: true,
      selector: 'a'
    }, {$})
    var dataDeferred = selector.getData(document.querySelectorAll('#selector-follow')[0])
    dataDeferred.then(function (data) {
      var expected = [
        {
          a: 'a',
          'a-href': 'http://example.com/a',
          _follow: 'http://example.com/a',
          _followSelectorId: 'a'
        },
        {
          a: 'b',
          'a-href': 'http://example.com/b',
          _follow: 'http://example.com/b',
          _followSelectorId: 'a'
        }
      ]
      assert.deepEqual(data, expected)
      done()
    })
  })

  it('should return data and url columns', function () {
    var selector = new Selector({
      id: 'id',
      type: 'SelectorLink',
      multiple: true,
      selector: 'div'
    }, {$})

    var columns = selector.getDataColumns()
    assert.deepEqual(columns, ['id', 'id-href'])
  })

  it('should return empty array when no links are found', function (done) {
    var selector = new Selector({
      id: 'a',
      type: 'SelectorLink',
      multiple: true,
      selector: 'a'
    }, {$})
    var dataDeferred = selector.getData(document.querySelectorAll('#not-exist')[0])
    dataDeferred.then(function (data) {
      var expected = []
      assert.deepEqual(data, expected)
      done()
    })
  })
})
