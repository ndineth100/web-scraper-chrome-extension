const assert = require('chai').assert
const selectorMatchers = require('../Matchers')
const SelectorList = require('../../extension/scripts/SelectorList')
const Sitemap = require('../../extension/scripts/Sitemap')
const DataExtractor = require('../../extension/scripts/DataExtractor')
const utils = require('./../utils')
const globals = require('../globals')
describe('DataExtractor', function () {
  let $
let document
  beforeEach(function () {
    $ = globals.$
document = globals.document

    document.body.innerHTML = utils.getTestHTML()
  })

  it('should be able to tell whether a selector will be common to all selector tree groups (one selector single)', function () {
    beforeEach(function () {
      document.body.innerHTML = utils.getTestHTML()
    })

    var selectors = new SelectorList([
      {
        id: 'a',
        type: 'SelectorText',
        multiple: false,
        parentSelectors: ['_root']
      }
    ], {$})

    var sitemap = new Sitemap({
      selectors: selectors
    }, {$})

    var extractor = new DataExtractor({
      sitemap: sitemap,
      parentSelectorId: '_root'
    }, {$})

    assert.isTrue(extractor.selectorIsCommonToAllTrees(selectors[0]))
  })

  it('should be able to tell whether a selector will be common to all selector tree groups (one selector multiple)', function () {
    var selectors = new SelectorList([
      {
        id: 'a',
        type: 'SelectorText',
        multiple: true,
        parentSelectors: ['_root']
      }
    ], {$})

    var sitemap = new Sitemap({
      selectors: selectors
    }, {$})

    var extractor = new DataExtractor({
      sitemap: sitemap,
      parentSelectorId: '_root'
    }, {$})

    assert.isFalse(extractor.selectorIsCommonToAllTrees(selectors[0]))
  })

  it("Link selector with child selectors shouldn't be common to all trees", function () {
    var selectors = new SelectorList([
      {
        id: 'a',
        type: 'SelectorLink',
        multiple: false,
        parentSelectors: ['_root']
      },
      {
        id: 'b',
        type: 'SelectorText',
        multiple: false,
        parentSelectors: ['a']
      }
    ], {$})

    var sitemap = new Sitemap({
      selectors: selectors
    }, {$})

    var extractor = new DataExtractor({
      sitemap: sitemap,
      parentSelectorId: '_root'
    }, {$})

    var isCommon = extractor.selectorIsCommonToAllTrees(selectors[0])

    assert.isFalse(isCommon)
  })

  it('should be able to tell whether a selector will be common to all selector tree groups (tree of single page selectors)', function () {
    var selectors = new SelectorList([
      {
        id: 'a',
        type: 'SelectorElement',
        multiple: false,
        parentSelectors: ['_root']
      },
      {
        id: 'b',
        type: 'SelectorText',
        multiple: false,
        parentSelectors: ['a']
      }
    ], {$})

    var sitemap = new Sitemap({
      selectors: selectors
    }, {$})
    var extractor = new DataExtractor({
      sitemap: sitemap,
      parentSelectorId: '_root'
    }, {$})

    assert.isTrue(extractor.selectorIsCommonToAllTrees(selectors[0]))
  })

  it('should be able to tell whether a selector will be common to all selector tree groups (tree of single+multiple page selectors)', function () {
    var selectors = new SelectorList([
      {
        id: 'a',
        type: 'SelectorElement',
        multiple: false,
        parentSelectors: ['_root']
      },
      {
        id: 'b',
        type: 'SelectorText',
        multiple: true,
        parentSelectors: ['a']
      }
    ], {$})

    var sitemap = new Sitemap({
      selectors: selectors
    }, {$})
    var extractor = new DataExtractor({
      sitemap: sitemap,
      parentSelectorId: '_root'
    }, {$})

    assert.isFalse(extractor.selectorIsCommonToAllTrees(selectors[0]))
  })

  it('should be able to find selectors common to all selector trees', async function () {
    var expectedSelectors = [
      {
        id: 'a',
        type: 'SelectorElement',
        multiple: false,
        parentSelectors: ['_root']
      },
      {
        id: 'b',
        type: 'SelectorText',
        multiple: false,
        parentSelectors: ['a']
      },
      {
        id: 'c',
        type: 'SelectorText',
        multiple: false,
        parentSelectors: ['_root']
      }
    ]

    var selectors = expectedSelectors.concat([
      {
        id: 'd',
        type: 'SelectorText',
        multiple: true,
        parentSelectors: ['_root']
      },
      {
        id: 'e',
        type: 'SelectorElement',
        multiple: false,
        parentSelectors: ['_root']
      },
      {
        id: 'f',
        type: 'SelectorText',
        multiple: true,
        parentSelectors: ['e']
      }
    ])

    var sitemap = new Sitemap({
      selectors: selectors
    }, {$})
    var extractor = new DataExtractor({
      sitemap: sitemap,
      parentSelectorId: '_root'
    }, {$})

    await selectorMatchers.matchSelectorList(extractor.getSelectorsCommonToAllTrees('_root'), expectedSelectors)
  })

  it('should be able to find selector tree with single item', async function () {
    var selectors = [
      {
        id: 'a',
        multiple: false,
        type: 'SelectorText',
        parentSelectors: ['_root']
      }
    ]
    var sitemap = new Sitemap({
      selectors: selectors
    }, {$})

    var extractor = new DataExtractor({
      parentSelectorId: '_root',
      sitemap: sitemap
    }, {$})
    var expected = [
			['a']
    ]
    var result = extractor.findSelectorTrees()
    await selectorMatchers.matchSelectorTrees(result, expected)
  })

  it('should be able to find selector tree with a LinkSelector', async function () {
    var selectors = [
      {
        id: 'simple-data',
        multiple: true,
        type: 'SelectorLink',
        parentSelectors: ['_root']
      },
      {
        id: 'text',
        multiple: false,
        type: 'SelectorText',
        parentSelectors: ['simple-data']
      }
    ]

    var sitemap = new Sitemap({
      selectors: selectors
    }, {$})

    var extractor = new DataExtractor({
      parentSelectorId: '_root',
      sitemap: sitemap
    }, {$})

    var expected = [
			['simple-data']
    ]
    var result = extractor.findSelectorTrees()
    await selectorMatchers.matchSelectorTrees(result, expected)
  })

  it('should be able to find selector tree with multiple and follow elements', async function () {
    var selectors = [
      {
        id: 'parent',
        multiple: false,
        type: 'SelectorElement',
        parentSelectors: ['_root']
      },
      {
        id: 'child',
        multiple: true,
        type: 'SelectorLink',
        parentSelectors: ['parent']
      }
    ]

    var sitemap = new Sitemap({
      selectors: selectors
    }, {$})

    var extractor = new DataExtractor({
      parentSelectorId: '_root',
      sitemap: sitemap
    }, {$})
    var expected = [
			['parent', 'child']
    ]
    var result = extractor.findSelectorTrees()
    await selectorMatchers.matchSelectorTrees(result, expected)
  })

  it('should be able to find selector tree without multiple or follow elements', async function () {
    var selectors = [
      {
        id: 'parent',
        multiple: false,
        type: 'SelectorElement',
        parentSelectors: ['_root']
      },
      {
        id: 'parent2',
        multiple: false,
        type: 'SelectorElement',
        parentSelectors: ['_root']
      },
      {
        id: 'child',
        multiple: false,
        type: 'SelectorText',
        parentSelectors: ['parent']
      }
    ]

    var sitemap = new Sitemap({
      selectors: selectors
    }, {$})

    var extractor = new DataExtractor({
      parentSelectorId: '_root',
      sitemap: sitemap
    }, {$})
    var expected = [
			['parent', 'parent2', 'child']
    ]
    var result = extractor.findSelectorTrees()
    await selectorMatchers.matchSelectorTrees(result, expected)
  })

  it('should be able to find multiple link trees', async function () {
    var selectors = [
      {
        id: 'common',
        multiple: false,
        type: 'SelectorElement',
        parentSelectors: ['_root']
      },
      {
        id: 'parent1',
        multiple: false,
        type: 'SelectorElement',
        parentSelectors: ['_root']
      },
      {
        id: 'parent2',
        multiple: false,
        type: 'SelectorElement',
        parentSelectors: ['_root']
      },
      {
        id: 'follow1',
        multiple: true,
        type: 'SelectorLink',
        parentSelectors: ['parent1']
      },
      {
        id: 'follow11',
        multiple: true,
        type: 'SelectorLink',
        parentSelectors: ['parent1']
      },
      {
        id: 'follow2',
        multiple: true,
        type: 'SelectorLink',
        parentSelectors: ['parent2']
      },
      {
        id: 'follow3',
        multiple: true,
        type: 'SelectorLink',
        parentSelectors: ['_root']
      }
    ]

    var sitemap = new Sitemap({
      selectors: selectors
    }, {$})

    var extractor = new DataExtractor({
      parentSelectorId: '_root',
      sitemap: sitemap
    }, {$})
    var expected = [
			['common', 'parent1', 'follow1'],
			['common', 'parent1', 'follow11'],
			['common', 'parent2', 'follow2'],
			['common', 'follow3']
    ]
    var result = extractor.findSelectorTrees()
    await selectorMatchers.matchSelectorTrees(result, expected)
  })

  it('should be able to find multiple type=multiple trees', async function () {
    var selectors = [
      {
        id: 'common',
        multiple: false,
        type: 'SelectorElement',
        parentSelectors: ['_root']
      },
      {
        id: 'parent1',
        multiple: false,
        type: 'SelectorElement',
        parentSelectors: ['_root']
      },
      {
        id: 'parent2',
        multiple: false,
        type: 'SelectorElement',
        parentSelectors: ['_root']
      },
      {
        id: 'common1',
        multiple: false,
        type: 'SelectorText',
        parentSelectors: ['parent1']
      },
      {
        id: 'multiple1',
        multiple: true,
        type: 'SelectorText',
        parentSelectors: ['parent1']
      },
      {
        id: 'multiple11',
        multiple: true,
        type: 'SelectorText',
        parentSelectors: ['parent1']
      },
      {
        id: 'multiple2',
        multiple: true,
        type: 'SelectorText',
        parentSelectors: ['parent2']
      },
      {
        id: 'multiple3',
        multiple: true,
        type: 'SelectorText',
        parentSelectors: ['_root']
      }
    ]

    var sitemap = new Sitemap({
      selectors: selectors
    }, {$})

    var extractor = new DataExtractor({
      parentSelectorId: '_root',
      sitemap: sitemap
    }, {$})
    var expected = [
			['common', 'common1', 'parent1', 'multiple1'],
			['common', 'common1', 'parent1', 'multiple11'],
			['common', 'parent2', 'multiple2'],
			['common', 'multiple3']
    ]
    var result = extractor.findSelectorTrees()
    await selectorMatchers.matchSelectorTrees(result, expected)
  })

  it('should be able to find chained type=multiple trees', async function () {
    var selectors = [
      {
        id: 'div',
        selector: 'div',
        type: 'SelectorElement',
        multiple: false,
        parentSelectors: ['_root']
      },
      {
        id: 'table',
        selector: 'table',
        type: 'SelectorElement',
        multiple: true,
        parentSelectors: ['div']
      },
      {
        id: 'tr',
        selector: 'tr',
        type: 'SelectorElement',
        multiple: true,
        parentSelectors: ['table']
      },
      {
        id: 'td',
        selector: 'td',
        type: 'SelectorText',
        multiple: false,
        parentSelectors: ['tr']
      }
    ]

    var sitemap = new Sitemap({
      selectors: selectors
    }, {$})

    var extractor = new DataExtractor({
      parentSelectorId: '_root',
      sitemap: sitemap
    }, {$})
    var expected = [
			['div', 'table', 'tr', 'td']
    ]
    var result = extractor.findSelectorTrees()
    await selectorMatchers.matchSelectorTrees(result, expected)
  })

  it('should be able to extract text data', function () {
    var parentElement = document.querySelector('#dataextract-get-data')

    var sitemap = new Sitemap({
      selectors: [
        {
          id: 'a',
          selector: 'a',
          type: 'SelectorText',
          multiple: false,
          parentSelectors: ['_root']
        }
      ]
    }, {$})

    var extractor = new DataExtractor({
      parentElement: parentElement,
      parentSelectorId: '_root',
      sitemap: sitemap
    }, {$})

    var deferred = extractor.getData()

    deferred.then(function (data) {
      var expected = [
        {
          'a': 'a'
        }
      ]
      assert.deepEqual(data, expected)
    })
  })

  // We are not setting the title so it fails
  it.skip('should be able to extract text data from head title', function () {
    var sitemap = new Sitemap({
      selectors: [
        {
          id: 'title',
          selector: 'head title',
          type: 'SelectorText',
          multiple: false,
          parentSelectors: ['_root']
        }
      ]
    }, {$})

    var extractor = new DataExtractor({
      parentSelectorId: '_root',
      sitemap: sitemap
    }, {$})

    var deferred = extractor.getData()

    deferred
      .then(function (data) {
        var expected = [
          {
            'title': 'Jasmine Spec Runner'
          }
        ]
        assert.deepEqual(expected, data)
      })
  })

  it('should be able to extract text data within an element', function () {
    var parentElement = document.querySelector('#dataextract-get-element-text')

    var sitemap = new Sitemap({
      selectors: [
        {
          id: 'e',
          selector: 'div',
          type: 'SelectorElement',
          multiple: false,
          parentSelectors: ['_root']
        },
        {
          id: 'a',
          selector: 'a',
          type: 'SelectorText',
          multiple: false,
          parentSelectors: ['e']
        }
      ]
    }, {$})

    var extractor = new DataExtractor({
      parentElement: parentElement,
      parentSelectorId: '_root',
      sitemap: sitemap
    }, {$})

    var deferred = extractor.getData()

    deferred.then(function (data) {
      var expected = [
        {
          'a': 'a'
        }
      ]
      assert.deepEqual(expected, data)
    })
  })

	// @TODO tests with link selectors

  it('should be able to extract multiple text results', function () {
    var parentElement = $('#dataextract-get-data')
    var sitemap = new Sitemap({
      selectors: [
        {
          id: 'a',
          selector: 'a',
          type: 'SelectorText',
          multiple: true,
          parentSelectors: ['_root']
        }
      ]
    }, {$})

    var extractor = new DataExtractor({
      parentElement: parentElement,
      parentSelectorId: '_root',
      sitemap: sitemap
    }, {$})

    var deferred = extractor.getData()
    deferred.then(function (data) {
      var expected = [
        {
          'a': 'a'
        },
        {
          'a': 'b'
        }
      ]
      assert.deepEqual(expected, data)
    }, {$})
  })

  it('should be able to extract multiple text results with common data', function () {
    var parentElement = document.querySelector('#dataextract-get-data')
    var sitemap = new Sitemap({
      selectors: [
        {
          id: 'a',
          selector: 'a',
          type: 'SelectorText',
          multiple: true,
          parentSelectors: ['_root']
        },
        {
          id: 'c',
          selector: '.common',
          type: 'SelectorText',
          multiple: false,
          parentSelectors: ['_root']
        }
      ]
    }, {$})

    var extractor = new DataExtractor({
      parentElement: parentElement,
      parentSelectorId: '_root',
      sitemap: sitemap
    }, {$})

    var deferred = extractor.getData()

    deferred.then(function (data) {
      var expected = [
        {
          'a': 'a',
          'c': 'c'
        },
        {
          'a': 'b',
          'c': 'c'
        }
      ]
      assert.deepEqual(expected, data)
    })
  })

  it('should be able to extract multiple text results within elements', function () {
    var parentElement = document.querySelector('#dataextract-get-element-text')
    var sitemap = new Sitemap({
      selectors: [
        {
          id: 'div',
          selector: 'div',
          type: 'SelectorElement',
          multiple: true,
          parentSelectors: ['_root']
        },
        {
          id: 'a',
          selector: 'a',
          type: 'SelectorText',
          multiple: false,
          parentSelectors: ['div']
        }
      ]
    }, {$})

    var extractor = new DataExtractor({
      parentElement: parentElement,
      parentSelectorId: '_root',
      sitemap: sitemap
    }, {$})

    var deferred = extractor.getData()

    deferred.then(function (data) {
      var expected = [
        {
          'a': 'a'
        },
        {
          'a': 'b'
        }
      ]
      assert.deepEqual(expected, data)
    })
  })

  it('should be able to extract multiple text records within single element', function () {
    var parentElement = document.querySelector('#dataextract-get-element-text')
    var sitemap = new Sitemap({
      selectors: [
        {
          id: 'div',
          selector: 'div',
          type: 'SelectorElement',
          multiple: false,
          parentSelectors: ['_root']
        },
        {
          id: 'a',
          selector: 'a',
          type: 'SelectorText',
          multiple: true,
          parentSelectors: ['div']
        }
      ]
    }, {$})

    var extractor = new DataExtractor({
      parentElement: parentElement,
      parentSelectorId: '_root',
      sitemap: sitemap
    }, {$})

    var deferred = extractor.getData()

    deferred.done(function (data) {
      var expected = [
        {
          'a': 'a'
        }
      ]
      assert.deepEqual(expected, data)
    })
  })

  it('should be able to get data from chained multiple element selectors', function () {
    var parentElement = document.querySelector('#dataextract-get-data-multiple-selectors')

    var sitemap = new Sitemap({
      selectors: [
        {
          id: 'div',
          selector: 'div',
          type: 'SelectorElement',
          multiple: false,
          parentSelectors: ['_root']
        },
        {
          id: 'table',
          selector: 'table',
          type: 'SelectorElement',
          multiple: true,
          parentSelectors: ['div']
        },
        {
          id: 'tr',
          selector: 'tr',
          type: 'SelectorElement',
          multiple: true,
          parentSelectors: ['table']
        },
        {
          id: 'td',
          selector: 'td',
          type: 'SelectorText',
          multiple: false,
          parentSelectors: ['tr']
        }
      ]
    }, {$})

    var extractor = new DataExtractor({
      parentElement: parentElement,
      parentSelectorId: '_root',
      sitemap: sitemap
    }, {$})

    var deferred = extractor.getData()

    deferred.then(function (data) {
      var expected = [
        {
          td: 'result1'
        },
        {
          td: 'result2'
        },
        {
          td: 'result3'
        },
        {
          td: 'result4'
        }
      ]
      assert.deepEqual(expected, data)
    })
  })

  it('should be able to return empty results from single selectors', function () {
    var parentElement = document.querySelector('#dataextract-get-data-multiple-selectors')

    var sitemap = new Sitemap({
      selectors: [
        {
          id: 'span',
          selector: 'span.non',
          type: 'SelectorText',
          multiple: false,
          parentSelectors: ['_root']
        }
      ]
    }, {$})

    var extractor = new DataExtractor({
      parentElement: parentElement,
      parentSelectorId: '_root',
      sitemap: sitemap
    }, {$})

    var deferred = extractor.getData()

    deferred.then(function (data) {
      var expected = [
        {
          'span': null
        }
      ]
      assert.deepEqual(expected, data)
    })
  })

  it('should be able to return empty results from type=multiple selectors', function () {
    var parentElement = $('#dataextract-get-data-multiple-selectors')

    var sitemap = new Sitemap({
      selectors: [
        {
          id: 'span',
          selector: 'span.non',
          type: 'SelectorText',
          multiple: true,
          parentSelectors: ['_root']
        }
      ]
    }, {$})

    var extractor = new DataExtractor({
      parentElement: parentElement,
      parentSelectorId: '_root',
      sitemap: sitemap
    }, {$})

    var deferred = extractor.getData()

    deferred.then(function (data) {
      var expected = []
      assert.deepEqual(expected, data)
    })
  })

  it('should return one selector tree for this sitemap', function () {
    var sitemap = new Sitemap({
      'selectors': [
        {
          'parentSelectors': [
            '_root',
            'mirror-page'
          ],
          'type': 'SelectorElement',
          'multiple': true,
          'follow': false,
          'id': 'mirror-row',
          'selector': 'table#cter tr:nth-of-type(n+3)'
        },
        {
          'parentSelectors': [
            'mirror-row'
          ],
          'type': 'SelectorText',
          'multiple': false,
          'follow': false,
          'id': 'region',
          'selector': 'td:nth-of-type(1)'
        },
        {
          'parentSelectors': [
            'mirror-row'
          ],
          'type': 'SelectorText',
          'multiple': false,
          'follow': false,
          'id': 'state',
          'selector': 'td:nth-of-type(2)'
        },
        {
          'parentSelectors': [
            'mirror-row'
          ],
          'type': 'SelectorText',
          'multiple': false,
          'follow': false,
          'id': 'organization',
          'selector': 'td:nth-of-type(3)'
        },
        {
          'parentSelectors': [
            'mirror-row'
          ],
          'type': 'SelectorText',
          'multiple': false,
          'follow': false,
          'id': 'versions',
          'selector': 'td:nth-of-type(4)'
        },
        {
          'parentSelectors': [
            'mirror-row'
          ],
          'type': 'SelectorText',
          'multiple': false,
          'follow': false,
          'id': 'architectures',
          'selector': 'td:nth-of-type(5)'
        },
        {
          'parentSelectors': [
            'mirror-row'
          ],
          'type': 'SelectorText',
          'multiple': false,
          'follow': false,
          'id': 'Direct DVD Download',
          'selector': 'td:nth-of-type(6)'
        },
        {
          'parentSelectors': [
            'mirror-row'
          ],
          'type': 'SelectorLink',
          'multiple': false,
          'follow': false,
          'id': 'url-http',
          'selector': 'td:nth-of-type(7) a'
        },
        {
          'parentSelectors': [
            'mirror-row'
          ],
          'type': 'SelectorLink',
          'multiple': false,
          'follow': false,
          'id': 'url-ftp',
          'selector': 'td:nth-of-type(8) a'
        },
        {
          'parentSelectors': [
            'mirror-row'
          ],
          'type': 'SelectorLink',
          'multiple': false,
          'follow': false,
          'id': 'url-rsync',
          'selector': 'td:nth-of-type(9) a'
        }
      ],
      'startUrl': 'http://www.centos.org/modules/tinycontent/index.php?id=30',
      '_id': 'centos-mirrors2'
    }, {$})

    var extractor = new DataExtractor({
      parentSelectorId: '_root',
      sitemap: sitemap
    }, {$})

    var result = extractor.findSelectorTrees()
    assert.equal(result.length, 1)
  })

  it('should test getSelectorCommonData with one selector', function () {
    var parentElement = document.querySelector('#dataextract-get-data')

    var sitemap = new Sitemap({
      selectors: [
        {
          id: 'a',
          selector: 'a',
          type: 'SelectorText',
          multiple: false,
          parentSelectors: ['_root']
        }
      ]
    }, {$})

    var extractor = new DataExtractor({
      parentElement: parentElement,
      parentSelectorId: '_root',
      sitemap: sitemap
    }, {$})

    var deferred = extractor.getSelectorCommonData(sitemap.selectors, sitemap.selectors[0], parentElement)

    deferred.then(function (data) {
      var expected = {
        'a': 'a'
      }
      assert.deepEqual(expected, data)
    })
  })

  it('should test getSelectorTreeCommonData with one selector', function () {
    var parentElement = document.querySelector('#dataextract-get-data')

    var sitemap = new Sitemap({
      selectors: [
        {
          id: 'a',
          selector: 'a',
          type: 'SelectorText',
          multiple: false,
          parentSelectors: ['_root']
        }
      ]
    }, {$})

    var extractor = new DataExtractor({
      parentElement: parentElement,
      parentSelectorId: '_root',
      sitemap: sitemap
    }, {$})

    var deferred = extractor.getSelectorTreeCommonData(sitemap.selectors, '_root', parentElement)

    deferred.then(function (data) {
      var expected = {
        'a': 'a'
      }
      assert.deepEqual(expected, data)
    })
  })

  it('should test getSelectorTreeCommonData with multiple selectors', function () {
    var parentElement = document.querySelector('#dataextract-multiple-elements')

    var sitemap = new Sitemap({
      selectors: [
        {
          id: 'parent1',
          selector: 'div',
          type: 'SelectorElement',
          multiple: false,
          parentSelectors: ['_root']
        },
        {
          id: 'parent2',
          selector: 'div',
          type: 'SelectorElement',
          multiple: false,
          parentSelectors: ['parent1']
        },
        {
          id: 'a',
          selector: 'a',
          type: 'SelectorText',
          multiple: false,
          parentSelectors: ['parent2']
        }
      ]
    }, {$})

    var extractor = new DataExtractor({
      parentElement: parentElement,
      parentSelectorId: '_root',
      sitemap: sitemap
    }, {$})

    var deferred = extractor.getSelectorTreeCommonData(sitemap.selectors, '_root', parentElement)

    deferred.then(function (data) {
      var expected = {
        'a': 'a'
      }
      assert.deepEqual(expected, data)
    })
  })
})
