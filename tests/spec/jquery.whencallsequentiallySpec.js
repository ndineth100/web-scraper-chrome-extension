var whenCallSequentially = require('../../extension/assets/jquery.whencallsequentially')
var jquery = require('jquery-deferred')
const assert = require('chai').assert

describe('jQuery When call sequentially', function () {
  var syncCall = function () {
    return jquery.Deferred().resolve('sync').promise()
  }

  var asyncCall = function () {
    var d = jquery.Deferred()
    setTimeout(function () {
      d.resolve('async')
    }, 0)
    return d.promise()
  }

  beforeEach(function () {
  })

  it('should return immediately empty array when no calls passed', function () {
    var deferred = whenCallSequentially([])
    assert.equal(deferred.state(), 'resolved')
    var data
    deferred.done(function (res) {
      data = res
    })
    assert.deepEqual(data, [])
  })

  it('should return immediately with data when synchronous call passed', function () {
    var deferred = whenCallSequentially([syncCall])
    assert.deepEqual(deferred.state(), 'resolved')
    var data
    deferred.done(function (res) {
      data = res
    })
    assert.deepEqual(data, ['sync'])
  })

  it('should return immediately with data when multiple synchronous call passed', function () {
    var deferred = whenCallSequentially([syncCall, syncCall, syncCall])
    assert.deepEqual(deferred.state(), 'resolved')
    var data
    deferred.done(function (res) {
      data = res
    })
    assert.deepEqual(data, ['sync', 'sync', 'sync'])
  })

  it('should execute one async job', function (done) {
    var deferred = whenCallSequentially([asyncCall])
    assert.deepEqual(deferred.state(), 'pending')

    deferred.then(function (data) {
      assert.deepEqual(data, ['async'])
      done()
    })
  })

  it('should execute multiple async jobs', function (done) {
    var deferred = whenCallSequentially([asyncCall, asyncCall, asyncCall])
    assert.deepEqual(deferred.state(), 'pending')

    deferred.then(function (res) {
      assert.deepEqual(res, ['async', 'async', 'async'])
      done()
    })
  })

  it('should execute multiple sync and async jobs', function () {
    var deferred = whenCallSequentially([syncCall, syncCall, asyncCall, asyncCall, syncCall, asyncCall])
    assert.deepEqual(deferred.state(), 'pending')

    deferred.done(function (data) {
      assert.deepEqual(data, ['sync', 'sync', 'async', 'async', 'sync', 'async'])
    })
  })

  it('should allow adding jobs to job array from an async job', function () {
    var jobs = []
    var asyncMoreCall = function () {
      var d = jquery.Deferred()
      setTimeout(function () {
        d.resolve('asyncmore')
        jobs.push(asyncCall)
      }, 0)
      return d.promise()
    }
    jobs.push(asyncMoreCall)

    var deferred = whenCallSequentially(jobs)
    assert.deepEqual(deferred.state(), 'pending')

    deferred.then(function (data) {
      assert.deepEqual(data, ['asyncmore', 'async'])
    })
  })

  it('should allow adding jobs to job array from a sync job', function () {
    var jobs = []
    var syncMoreCall = function () {
      var d = jquery.Deferred()
      jobs.push(syncCall)
      d.resolve('syncmore')
      return d.promise()
    }
    jobs.push(syncMoreCall)

    var deferred = whenCallSequentially(jobs)
    deferred.then(function (res) {
      assert.deepEqual(res, ['syncmore', 'sync'])
    })
  })
})
