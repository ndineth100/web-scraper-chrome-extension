const Selector = require('../../../extension/scripts/Selector')
const SelectorTable = require('../../../extension/scripts/Selector/SelectorTable')
const utils = require('./../../utils')
const assert = require('chai').assert

describe('Table Selector', function () {
  var $el
  beforeEach(function () {
    document.body.innerHTML = utils.getTestHTML()
    $el = utils.createElementFromHTML("<div id='tests' style='display:none'></div>")
    document.body.appendChild($el)
  })

  it('should extract table header columns', function () {
    var selector = new Selector({
      id: 'a',
      type: 'SelectorTable',
      multiple: false,
      selector: 'table',
      columns: [
        {
          header: 'a',
          name: 'a_renamed',
          extract: true
        }
      ]
    })

    const columns = selector.getTableHeaderColumns(document.querySelectorAll('#selector-table-single-table-single-row table')[0])
    const expected = {
      a: {
        index: 1
      }
    }
    assert.deepEqual(columns, expected)
  })

  it('should extract single text record from one table', function (done) {
    var selector = new Selector({
      id: 'a',
      type: 'SelectorTable',
      multiple: false,
      selector: 'table',
      columns: [
        {
          header: 'a',
          name: 'a_renamed',
          extract: true
        }
      ]
    })

    var dataDeferred = selector.getData(document.querySelectorAll('#selector-table-single-table-single-row')[0])
    dataDeferred.then(function (data) {
      var expected = [
        {
          a_renamed: 'abc'
        }
      ]
      assert.deepEqual(data, expected)
      done()
    })
  })

  it('should extract multiple text records from one table', function (done) {
    var selector = new Selector({
      id: 'a',
      type: 'SelectorTable',
      multiple: false,
      selector: 'table',
      columns: [
        {
          header: 'a',
          name: 'a_renamed',
          extract: true
        },
        {
          header: 'b',
          name: 'b_renamed',
          extract: true
        }
      ]
    })
    var dataDeferred = selector.getData(document.querySelectorAll('#selector-table-single-table-multiple-rows')[0])
    dataDeferred.then(function (data) {
      var expected = [
        {
          a_renamed: 'aaa',
          b_renamed: 'bbb'
        },
        {
          a_renamed: 'ccc',
          b_renamed: 'ddd'
        }
      ]
      assert.deepEqual(data, expected)
      done()
    })
  })

  it('should only extract records from columns which are marked as extract', function (done) {
    var selector = new Selector({
      id: 'a',
      type: 'SelectorTable',
      multiple: false,
      selector: 'table',
      columns: [
        {
          header: 'a',
          name: 'a_renamed',
          extract: true
        },
        {
          header: 'b',
          name: 'b_renamed',
          extract: false
        }
      ]
    })
    var dataDeferred = selector.getData(document.querySelectorAll('#selector-table-single-table-multiple-rows')[0])
    dataDeferred.then(function (data) {
      var expected = [
        {
          a_renamed: 'aaa'
        },
        {
          a_renamed: 'ccc'
        }
      ]
      assert.deepEqual(data, expected)
      done()
    })
  })

  it('should return data columns based on its configuration', function () {
    var selector = new Selector({
      id: 'a',
      type: 'SelectorTable',
      multiple: false,
      selector: 'table',
      columns: [
        {
          header: 'a',
          name: 'a_renamed',
          extract: true
        },
        {
          header: 'b',
          name: 'b_renamed',
          extract: true
        },
        {
          header: 'c',
          name: 'c_renamed',
          extract: false
        }
      ]
    })

    var columns = selector.getDataColumns()
    assert.deepEqual(columns, ['a_renamed', 'b_renamed'])
  })

  it('should return thead tr as table header selector for legacy table selectors', function () {
    var selector = new Selector({
      type: 'SelectorTable'
    })

    var headerSelector = selector.getTableHeaderRowSelector()

    assert.equal(headerSelector, 'thead tr')
  })

  it('should return tbody tr as table row selector for legacy table selectors', function () {
    var selector = new Selector({
      type: 'SelectorTable'
    })

    var headerSelector = selector.getTableDataRowSelector()

    assert.equal(headerSelector, 'tbody tr')
  })

  it('should return thead tr while selecting tableHeaderRow when single row available within thead', function () {
    var html = '<table><thead><tr><td>asd</td></tr></thead></table>'
    var tableHeaderRowSelector = SelectorTable.getTableHeaderRowSelectorFromTableHTML(html)
    assert.equal(tableHeaderRowSelector, 'thead tr')
  })

  it('should return thead tr:nth-of-type while selecting tableHeaderRow when multiple rows available within thead', function () {
    var html

    html = '<table><thead><tr><td>asd</td></tr><tr><td>asd</td></tr></thead></table>'
    var tableHeaderRowSelector = SelectorTable.getTableHeaderRowSelectorFromTableHTML(html)
    assert.equal(tableHeaderRowSelector, 'thead tr:nth-of-type(1)')

    html = '<table><thead><tr><td></td></tr><tr><td>asd</td></tr></thead></table>'
    tableHeaderRowSelector = SelectorTable.getTableHeaderRowSelectorFromTableHTML(html)
    assert.equal(tableHeaderRowSelector, 'thead tr:nth-of-type(2)')

    html = '<table><thead><tr><td>asd</td></tr><tr><th>asd</th></tr></thead></table>'
    tableHeaderRowSelector = SelectorTable.getTableHeaderRowSelectorFromTableHTML(html)
    assert.equal(tableHeaderRowSelector, 'thead tr:nth-of-type(1)')

    html = '<table><thead><tr><td></td></tr><tr><th>asd</th></tr></thead></table>'
    tableHeaderRowSelector = SelectorTable.getTableHeaderRowSelectorFromTableHTML(html)
    assert.equal(tableHeaderRowSelector, 'thead tr:nth-of-type(2)')
  })

  it('should return empty string while selecting tableHeaderRow when no rows with data available', function () {
    var html = '<table><thead><tr><td></td></tr></thead><tr><td></td></tr></table>'
    var tableHeaderRowSelector = SelectorTable.getTableHeaderRowSelectorFromTableHTML(html)
    assert.equal(tableHeaderRowSelector, '')
  })

  it('should return tbody tr while selecting tableDataRow when thead is available', function () {
    var html = '<table><thead><tr><td>asd</td></tr></thead></table>'
    var tableDataRowSelector = SelectorTable.getTableDataRowSelectorFromTableHTML(html)
    assert.equal(tableDataRowSelector, 'tbody tr')
  })

  it('should return tr:nth-of-type while selecting tableDataRow when thead is not available', function () {
    var html

    html = '<table><tr><td>asd</td></tr><tr><td>asd</td></tr></table>'
    var tableDataRowSelector = SelectorTable.getTableDataRowSelectorFromTableHTML(html)
    assert.equal(tableDataRowSelector, 'tr:nth-of-type(n+2)')

    html = '<table><tr><td></td></tr><tr><td>asd</td></tr><</table>'
    tableDataRowSelector = SelectorTable.getTableDataRowSelectorFromTableHTML(html)
    assert.equal(tableDataRowSelector, 'tr:nth-of-type(n+3)')

    html = '<table><tr><td>asd</td></tr><tr><th>asd</th></tr></table>'
    tableDataRowSelector = SelectorTable.getTableDataRowSelectorFromTableHTML(html)
    assert.equal(tableDataRowSelector, 'tr:nth-of-type(n+2)')

    html = '<table><tr><td></td></tr><tr><th>asd</th></tr></table>'
    tableDataRowSelector = SelectorTable.getTableDataRowSelectorFromTableHTML(html)
    assert.equal(tableDataRowSelector, 'tr:nth-of-type(n+3)')
  })

  it('should return empty string when selecting tableDataRow with no data rows', function () {
    var html = '<table><thead><tr><td></td></tr></thead><tr><td></td></tr></table>'
    var tableDataRowSelector = SelectorTable.getTableDataRowSelectorFromTableHTML(html)
    assert.equal(tableDataRowSelector, '')
  })

  it('should get heder columns from html', function () {
    var html = '<table><thead><tr><td>a</td><td>b</td></tr></thead></table>'
    var tableHeaderSelector = 'thead tr'
    var headerColumns = SelectorTable.getTableHeaderColumnsFromHTML(tableHeaderSelector, html)

    assert.deepEqual(headerColumns, [{ header: 'a', name: 'a', extract: true }, { header: 'b', name: 'b', extract: true }])
  })

  it('should ignore empty columns when getting table header columns', function () {
    var html = '<table><thead><tr><td>a</td><td> </td></tr></thead></table>'
    var tableHeaderSelector = 'thead tr'
    var headerColumns = SelectorTable.getTableHeaderColumnsFromHTML(tableHeaderSelector, html)

    assert.deepEqual(headerColumns, [{ header: 'a', name: 'a', extract: true }])
  })

  it('should extract data using specified header row', function (done) {
    var html = '<table>' +
			'<thead>' +
				'<tr><td>a</td><td>b</td></tr>' +
				'<tr><td>c</td><td>d</td></tr>' +
			'</thead>' +
			'<tbody>' +
				'<tr><td>e</td><td>f</td></tr>' +
			'</tbody>' +
			'</table>'

    $el.innerHTML = html

    var selector = new Selector({

      id: 'a',
      type: 'SelectorTable',
      multiple: false,
      selector: 'table',
      tableHeaderRowSelector: 'thead tr:nth-of-type(2)',
      tableDataRowSelector: 'tbody tr',
      columns: [
        {
          header: 'c',
          name: 'c',
          extract: true
        },
        {
          header: 'd',
          name: 'd',
          extract: true
        }
      ]
    })

    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      var expected = [{c: 'e', d: 'f'}]
      assert.deepEqual(data, expected)
      done()
    })
  })

  it('should extract data from specified data rows', function (done) {
    var html = '<table>' +
			'<thead>' +
			'<tr><td>a</td><td>b</td></tr>' +
			'<tr><td>c</td><td>d</td></tr>' +
			'</thead>' +
			'<tbody>' +
			'<tr><td>e</td><td>f</td></tr>' +
			'<tr><td>g</td><td>h</td></tr>' +
			'</tbody>' +
			'</table>'

    $el.innerHTML = html

    var selector = new Selector({

      id: 'a',
      type: 'SelectorTable',
      multiple: false,
      selector: 'table',
      tableHeaderRowSelector: 'thead tr:nth-of-type(2)',
      tableDataRowSelector: 'tbody tr:nth-of-type(2)',
      columns: [
        {
          header: 'c',
          name: 'c',
          extract: true
        },
        {
          header: 'd',
          name: 'd',
          extract: true
        }
      ]
    })
    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      var expected = [{c: 'g', d: 'h'}]
      assert.deepEqual(data, expected)
      done()
    })
  })

  it('should extract data from th data rows', function (done) {
    var html = '<table>' +
			'<thead>' +
			'<tr><td>a</td><td>b</td></tr>' +
			'<tr><td>c</td><td>d</td></tr>' +
			'</thead>' +
			'<tbody>' +
			'<tr><th>e</th><th>f</th></tr>' +
			'<tr><th>g</th><th>h</th></tr>' +
			'</tbody>' +
			'</table>'

    $el.innerHTML = html

    var selector = new Selector({

      id: 'a',
      type: 'SelectorTable',
      multiple: false,
      selector: 'table',
      tableHeaderRowSelector: 'thead tr:nth-of-type(2)',
      tableDataRowSelector: 'tbody tr:nth-of-type(2)',
      columns: [
        {
          header: 'c',
          name: 'c',
          extract: true
        },
        {
          header: 'd',
          name: 'd',
          extract: true
        }
      ]
    })
    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      var expected = [{c: 'g', d: 'h'}]
      assert.deepEqual(data, expected)
      done()
    })
  })

  it('should extract data only from td,th elements', function (done) {
    var html = '<table>' +
			'<thead>' +
			'<tr><td>a</td><td>b</td></tr>' +
			'</thead>' +
			'<tbody>' +
			'<tr><th>e</th><th><a>f</a></th></tr>' +
			'</tbody>' +
			'</table>'

    $el.innerHTML = html

    var selector = new Selector({

      id: 'a',
      type: 'SelectorTable',
      multiple: false,
      selector: 'table',
      tableHeaderRowSelector: 'thead tr',
      tableDataRowSelector: 'tbody tr',
      columns: [
        {
          header: 'a',
          name: 'a',
          extract: true
        },
        {
          header: 'b',
          name: 'b',
          extract: true
        }
      ]
    })

    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      var expected = [{a: 'e', b: 'f'}]
      assert.deepEqual(data, expected)
      done()
    })
  })
})
