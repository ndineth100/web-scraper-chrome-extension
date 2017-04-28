var Selector = require('../../../extension/scripts/Selector')
const utils = require('./../../utils')
const assert = require('chai').assert

describe('Group Selector', function () {
  beforeEach(function () {
    document.body.innerHTML = utils.getTestHTML()
  })

  it('should extract text data', function (done) {
    var selector = new Selector({
      id: 'a',
      type: 'SelectorGroup',
      multiple: false,
      selector: 'div'
    })

    var dataDeferred = selector.getData(document.querySelectorAll('#selector-group-text')[0])
    dataDeferred.then(function (data) {
      assert.equal(data.length, 1)
      var expected = [
        {
          a: [
            {
              a: 'a'
            },
            {
              a: 'b'
            }
          ]
        }
      ]
      assert.deepEqual(data, expected)
      done()
    })
  })

  it('should extract link urls', function (done) {
    var selector = new Selector({
      id: 'a',
      type: 'SelectorGroup',
      multiple: false,
      selector: 'a',
      extractAttribute: 'href'
    })
    var dataDeferred = selector.getData(document.querySelectorAll('#selector-group-url')[0])
    dataDeferred.then(function (data) {
      assert.equal(data.length, 1)
      var expected = [
        {
          a: [
            {
              a: 'a',
              'a-href': 'http://aa/'
            },
            {
              a: 'b',
              'a-href': 'http://bb/'
            }
          ]
        }
      ]
      assert.deepEqual(data, expected)
      done()
    })
  })

  it('should return only one data column', function () {
    var selector = new Selector({
      id: 'id',
      type: 'SelectorGroup',
      multiple: true,
      selector: 'div'
    })

    var columns = selector.getDataColumns()
    assert.deepEqual(columns, ['id'])
  })
})
