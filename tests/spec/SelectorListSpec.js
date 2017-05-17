const SelectorList = require('./../../extension/scripts/SelectorList')
const Selector = require('./../../extension/scripts/Selector')
const selectorMatchers = require('../Matchers')
const assert = require('chai').assert
const globals = require('./../globals')
describe('SelectorList', function () {
  let $
let document
  beforeEach(function () {
    $ = globals.$
document = globals.document

  })
  it('should init selectors', function () {
    var selectors = [
      {
        id: 'a',
        type: 'SelectorText',
        multiple: false,
        parentSelectors: ['_root']
      }
    ]

    var selectorList = new SelectorList(selectors, {$})

    assert.isTrue(selectorList[0] instanceof Selector)
  })

  it('should be able to create a selector list', function () {
    var selectors = [
      {
        id: 'a',
        type: 'SelectorText',
        multiple: false,
        parentSelectors: ['_root']
      }
    ]

    var selectorList = new SelectorList(selectors, {$})

    assert.deepEqual(selectorList[0], new Selector(selectors[0], {$}))
  })

  it('should ignore repeating selectors', function () {
    var selectors = [
      {
        id: 'a',
        type: 'SelectorText'
      },
      {
        id: 'a',
        type: 'SelectorText'
      }
    ]

    var selectorList = new SelectorList(selectors, {$})

    assert.equal(selectorList.length, 1)
    assert.deepEqual(selectorList[0], new Selector(selectors[0], {$}))
    assert.deepEqual(selectorList[0], new Selector(selectors[1], {$}))
  })

  it('should be able to return all of its selectors', async function () {
    var selectors = [
      {
        id: 'a',
        type: 'SelectorText'
      },
      {
        id: 'b',
        type: 'SelectorText'
      }
    ]

    var selectorList = new SelectorList(selectors, {$})

    var foundSelectors = selectorList.getAllSelectors()
    await selectorMatchers.matchSelectorList(foundSelectors, selectors)
  })

  it('should be able to return all child selectors of a parent selector', async function () {
    var expectedSelectors = [
      {
        id: 'a',
        type: 'SelectorElement',
        parentSelectors: ['_root', 'c']
      },
      {
        id: 'b',
        type: 'SelectorElement',
        parentSelectors: ['a']
      },
      {
        id: 'c',
        type: 'SelectorElement',
        parentSelectors: ['b']
      }
    ]
    var selectors = expectedSelectors.concat([
      {
        id: 'd',
        type: 'SelectorElement',
        parentSelectors: ['_root']
      }
    ])

    var selectorList = new SelectorList(selectors, {$})

    var foundSelectors = selectorList.getAllSelectors('a')
    await selectorMatchers.matchSelectorList(foundSelectors, expectedSelectors)
  })

  it('should be able to return direct child selectors of a parent selector', async function () {
    var expectedSelectors = [
      {
        id: 'b',
        type: 'SelectorElement',
        parentSelectors: ['a']
      },
      {
        id: 'c',
        type: 'SelectorElement',
        parentSelectors: ['a']
      }
    ]
    var selectors = expectedSelectors.concat([
      {
        id: 'a',
        type: 'SelectorElement',
        parentSelectors: ['_root', 'c']
      },
      {
        id: 'd',
        type: 'SelectorElement',
        parentSelectors: ['_root']
      }
    ])

    var selectorList = new SelectorList(selectors, {$})

    var foundSelectors = selectorList.getDirectChildSelectors('a')
    await selectorMatchers.matchSelectorList(foundSelectors, expectedSelectors)
  })

  it('should be able to clone itself', function () {
    var selectorList = new SelectorList([
      {
        id: 'a',
        type: 'SelectorText'
      }
    ], {$})
    var resultList = selectorList.clone()
    selectorList.pop()
    assert.equal(selectorList.length, 0)
    assert.equal(resultList.length, 1)
  })

  it('should be able to execute concat', function () {
    var selectorList = new SelectorList([
      {
        id: 'a',
        type: 'SelectorText'
      }
    ], {$})

    var newList = selectorList.concat([
      {
        id: 'b',
        type: 'SelectorText'
      }
    ])

    assert.equal(newList.length, 2)
  })

  it('should be able to tell whether selector or its child selectors will return multiple items', function () {
    var selectorList = new SelectorList([
      {
        id: 'a',
        type: 'SelectorElement',
        multiple: false,
        parentSelectors: ['_root']
      },
      {
        id: 'b',
        type: 'SelectorElement',
        multiple: true,
        parentSelectors: ['a']
      },
      {
        id: 'c',
        type: 'SelectorText',
        multiple: true,
        parentSelectors: ['b']
      }
    ], {$})

    assert.isTrue(selectorList.willReturnMultipleRecords('a'))
  })

  it('should be able to tell whether selector or its child selectors will NOT return multiple items', function () {
    var selectorList = new SelectorList([
      {
        id: 'a',
        type: 'SelectorElement',
        multiple: false,
        parentSelectors: ['_root']
      },
      {
        id: 'b',
        type: 'SelectorElement',
        multiple: false,
        parentSelectors: ['a']
      },
      {
        id: 'c',
        type: 'SelectorText',
        multiple: false,
        parentSelectors: ['b']
      }
    ], {$})

    assert.isFalse(selectorList.willReturnMultipleRecords('a'))
  })

  it('should serialize as JSON array', function () {
    var selectorList = new SelectorList([
      {
        id: 'a',
        type: 'SelectorElement',
        multiple: false,
        parentSelectors: ['_root']
      }
    ], {$})
    var selectorListJSON = JSON.stringify(selectorList)

    assert.equal(selectorListJSON, '[{"id":"a","type":"SelectorElement","multiple":false,"parentSelectors":["_root"]}]')
  })

  it('should allow to create list from JSON unserialized selectorList', function () {
    var selectorList = new SelectorList([
      {
        id: 'a',
        type: 'SelectorElement',
        multiple: false,
        parentSelectors: ['_root']
      }
    ], {$})
    var selectorListNew = new SelectorList(JSON.parse(JSON.stringify(selectorList)), {$})

    assert.deepEqual(selectorListNew, selectorList)
  })

  it('should select child selectors within one page', async function () {
    var expectedSelectorList = new SelectorList([
      {
        id: 'child1',
        type: 'SelectorText',
        multiple: false,
        parentSelectors: ['parent2']
      },
      {
        id: 'child2',
        type: 'SelectorText',
        multiple: false,
        parentSelectors: ['parent2']
      },
      {
        id: 'child3',
        type: 'SelectorElement',
        multiple: false,
        parentSelectors: ['parent2']
      },
      {
        id: 'child4',
        type: 'SelectorElement',
        multiple: false,
        parentSelectors: ['child3']
      },
      {
        id: 'child5',
        type: 'SelectorText',
        multiple: false,
        parentSelectors: ['child4']
      },
      {
        id: 'SelectorLink',
        type: 'SelectorLink',
        multiple: false,
        parentSelectors: ['parent2']
      }
    ], {$})

    var selectorList = expectedSelectorList.concat([
      {
        id: 'parent2',
        type: 'SelectorElement',
        multiple: true,
        parentSelectors: ['_root']
      },
      {
        id: 'ignoredText',
        type: 'SelectorText',
        multiple: false,
        parentSelectors: ['SelectorLink']
      },
      {
        id: 'ignoredText2',
        type: 'SelectorText',
        multiple: false,
        parentSelectors: ['SelectorLink']
      },
      {
        id: 'ignoredParent',
        type: 'SelectorText',
        multiple: false,
        parentSelectors: ['_root']
      },
      {
        id: 'ignoredParent2',
        type: 'SelectorText',
        multiple: false,
        parentSelectors: ['parent1']
      }
    ])

    var pageChildSelectors = selectorList.getSinglePageAllChildSelectors('parent2')
    await selectorMatchers.matchSelectorList(pageChildSelectors, expectedSelectorList)
  })

  it('should extract all child selectors and parent within one page', async function () {
    var expectedSelectorList = new SelectorList([
      {
        id: 'parent1',
        type: 'SelectorElement',
        multiple: true,
        parentSelectors: ['_root']
      },
      {
        id: 'parent2',
        type: 'SelectorElement',
        multiple: false,
        parentSelectors: ['parent1']
      },
      {
        id: 'child1',
        type: 'SelectorText',
        multiple: false,
        parentSelectors: ['parent2']
      },
      {
        id: 'child2',
        type: 'SelectorText',
        multiple: false,
        parentSelectors: ['parent2']
      },
      {
        id: 'child3',
        type: 'SelectorElement',
        multiple: false,
        parentSelectors: ['parent2']
      },
      {
        id: 'child4',
        type: 'SelectorElement',
        multiple: false,
        parentSelectors: ['child3']
      },
      {
        id: 'child5',
        type: 'SelectorText',
        multiple: false,
        parentSelectors: ['child4']
      },
      {
        id: 'SelectorLink',
        type: 'SelectorLink',
        multiple: false,
        parentSelectors: ['parent2']
      }
    ], {$})

    var selectorList = expectedSelectorList.concat([
      {
        id: 'ignoredText',
        type: 'SelectorText',
        multiple: false,
        parentSelectors: ['SelectorLink']
      },
      {
        id: 'ignoredText2',
        type: 'SelectorText',
        multiple: false,
        parentSelectors: ['SelectorLink']
      },
      {
        id: 'ignoredParent',
        type: 'SelectorText',
        multiple: false,
        parentSelectors: ['_root']
      },
      {
        id: 'ignoredParent2',
        type: 'SelectorText',
        multiple: false,
        parentSelectors: ['parent1']
      }
    ])

    var pageSelectors = selectorList.getOnePageSelectors('parent2')
    await selectorMatchers.matchSelectorList(pageSelectors, expectedSelectorList)
  })

  it('should extract css selector within one page for a selector with no parent selectors', function () {
    var selectorList = new SelectorList([
      {
        id: 'div',
        type: 'SelectorText',
        selector: 'div'
      }
    ], {$})

    var CSSSelector = selectorList.getCSSSelectorWithinOnePage('div', ['_root'])
    assert.equal(CSSSelector, 'div')
  })

  it('should extract css selector within one page for a selector with parent element selector', function () {
    var selectorList = new SelectorList([
      {
        id: 'parent1',
        type: 'SelectorElement',
        selector: 'div.parent'
      },
      {
        id: 'div',
        type: 'SelectorText',
        selector: 'div'
      }
    ], {$})

    var CSSSelector = selectorList.getCSSSelectorWithinOnePage('div', ['_root', 'parent1'])
    assert.equal(CSSSelector, 'div.parent div')
  })

  it('should extract css selector within one page from a list of parent selectors', function () {
    var selectorList = new SelectorList([
      {
        id: 'parent2',
        type: 'SelectorElement',
        selector: 'div.parent2'
      },
      {
        id: 'parent1',
        type: 'SelectorElement',
        selector: 'div.parent'
      },
      {
        id: 'div',
        type: 'SelectorText',
        selector: 'div'
      }
    ], {$})

    var CSSSelector = selectorList.getParentCSSSelectorWithinOnePage(['_root', 'parent2', 'parent1'])
    assert.equal(CSSSelector, 'div.parent2 div.parent ')
  })

  it('should extract css selector within one page for a selector with parent element selectors', function () {
    var selectorList = new SelectorList([
      {
        id: 'parent2',
        type: 'SelectorElement',
        selector: 'div.parent2'
      },
      {
        id: 'parent1',
        type: 'SelectorElement',
        selector: 'div.parent'
      },
      {
        id: 'div',
        type: 'SelectorText',
        selector: 'div'
      }
    ], {$})

    var CSSSelector = selectorList.getCSSSelectorWithinOnePage('div', ['_root', 'parent2', 'parent1'])
    assert.equal(CSSSelector, 'div.parent2 div.parent div')
  })

  it('should extract css selector within one page for a selector with parent non element selectors', function () {
    var selectorList = new SelectorList([
      {
        id: 'parent2',
        type: 'SelectorLink',
        selector: 'div.parent2'
      },
      {
        id: 'parent1',
        type: 'SelectorElement',
        selector: 'div.parent'
      },
      {
        id: 'div',
        type: 'SelectorText',
        selector: 'div'
      }
    ], {$})

    var CSSSelector = selectorList.getCSSSelectorWithinOnePage('div', ['_root', 'parent2', 'parent1'])
    assert.equal(CSSSelector, 'div.parent div')
  })

  it('should return false when no recursion found', function () {
    var selectorList = new SelectorList([
      {
        id: 'parent1',
        type: 'SelectorElement',
        selector: 'div.parent',
        parentSelectors: ['_root']
      },
      {
        id: 'parent2',
        type: 'SelectorElement',
        selector: 'div.parent2',
        parentSelectors: ['parent1']
      },
      {
        id: 'div',
        type: 'SelectorElement',
        selector: 'div',
        parentSelectors: ['parent2']
      }
    ], {$})

    var recursionFound = selectorList.hasRecursiveElementSelectors()
    assert.isFalse(recursionFound)
  })

  it('should return true when recursion found', function () {
    var selectorList = new SelectorList([
      {
        id: 'parent1',
        type: 'SelectorElement',
        selector: 'div.parent',
        parentSelectors: ['div']
      },
      {
        id: 'parent2',
        type: 'SelectorElement',
        selector: 'div.parent2',
        parentSelectors: ['parent1']
      },
      {
        id: 'div',
        type: 'SelectorElement',
        selector: 'div',
        parentSelectors: ['parent2']
      }
    ], {$})

    var recursionFound = selectorList.hasRecursiveElementSelectors()
    assert.isTrue(recursionFound)
  })

  it('should return false when recursion only made of link selectors', function () {
    var selectorList = new SelectorList([
      {
        id: 'link',
        type: 'SelectorLink',
        selector: 'div.parent',
        parentSelectors: ['link', '_root']
      },
      {
        id: 'parent',
        type: 'SelectorElement',
        selector: 'div.parent2',
        parentSelectors: ['link']
      },
      {
        id: 'div',
        type: 'SelectorElement',
        selector: 'div',
        parentSelectors: ['parent', 'link']
      }
    ], {$})

    var recursionFound = selectorList.hasRecursiveElementSelectors()
    assert.isFalse(recursionFound)
  })
})
