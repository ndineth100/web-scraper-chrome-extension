const assert = require('chai').assert
var getSelectorIds = function (selectors) {
  var ids = []
  selectors.forEach(function (selector) {
    ids.push(selector.id)
  })
  return ids
}

var selectorListSorter = function (a, b) {
  if (a.id === b.id) {
    return 0
  } else if (a.id > b.id) {
    return 1
  } else {
    return -1
  }
}

var selectorMatchers = {
  matchSelectors: async function (actual, expectedIds) {
    expectedIds = expectedIds.sort()
    var actualIds = getSelectorIds(actual).sort()

    assert.deepEqual(actualIds, expectedIds)
  },
  matchSelectorList: async function (actual, expectedSelectors) {
    var actualSelectors = actual
    assert.equal(expectedSelectors.length, actualSelectors.length)
    expectedSelectors.sort(selectorListSorter)
    actualSelectors.sort(selectorListSorter)

    for (const i in expectedSelectors) {
      console.log(expectedSelectors[i], actualSelectors[i].id)
      assert.equal(expectedSelectors[i].id, actualSelectors[i].id)
    }
  },
	// @REFACTOR use match selector list
  matchSelectorTrees: async function (actual, expectedSelectorTrees) {
    var actualSelectorTrees = actual

    assert.equal(actualSelectorTrees.length, expectedSelectorTrees.length)

    for (var i in expectedSelectorTrees) {
      await selectorMatchers.matchSelectors(actualSelectorTrees[i], expectedSelectorTrees[i])
    }
  },
  deferredToEqual: function (actual, expectedData) {
    var deferredData = actual
    return deferredData
      .then(function (d) {
        assert.deepEqual(d, expectedData)
      })
  },
  deferredToFail: async function (actual) {
    var deferredData = actual

    try {
      await deferredData
      return Promise.reject(new Error('Promise not rejected'))
    } catch (e) {

    }
  }
}

module.exports = selectorMatchers
