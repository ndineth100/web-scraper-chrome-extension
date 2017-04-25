const Queue = require('./../../extension/scripts/Queue')
const Job = require('./../../extension/scripts/Job')
const assert = require('chai').assert

describe('Queue', function () {
  var q
  var job

  beforeEach(function () {
    q = new Queue()
    job = new Job('http://test.lv/', {})
  })

  it('should be able to add items to queue', function () {
    q.add(job)
    assert.equal(q.getQueueSize(), 1)
    assert.equal(q.jobs[0].url, 'http://test.lv/')
  })

  it('should be able to mark urls as scraped', function () {
    q.add(job)
    q.getNextJob()
    assert.equal(q.getQueueSize(), 0)

		// try to add this job again
    q.add(job)
    assert.equal(q.getQueueSize(), 0)
  })

  it('should be able to reject documents', function () {
    job = new Job('http://test.lv/test.doc')

    var accepted = q.add(job)
    assert.isFalse(accepted)
  })
})
