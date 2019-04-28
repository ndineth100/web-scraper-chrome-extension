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
    q.add(job).then(function(){
        q.getQueueSize().then(function (size){
            assert.equal(size, 1)
        })
    })

    //assert.equal(q.jobs[0].url, 'http://test.lv/')
  })

  it('should be able to mark urls as scraped', async function () {
    await q.add(job)
    await q.getNextJob()
    await q.getQueueSize(function(size){
      assert.equal(size, 0)
    })


		// try to add this job again
    await q.add(job)
    await q.getQueueSize(function(size){
      assert.equal(size, 0)
    })
  })

  it('should be able to reject documents', function () {
    job = new Job('http://test.lv/test.doc')

    q.add(job).then(function(result){
      assert.isFalse(result)
    })

  })
})
