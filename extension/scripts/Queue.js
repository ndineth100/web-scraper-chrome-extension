const redis = require('redis');

const {promisify} = require('util');


// Create Redis Client
let client = redis.createClient();

client.on('connect', function(){
    console.log('Package Queue Initiated a Connection to Redis...');
});

const llenAsync = promisify(client.llen).bind(client);

var Queue = function () {

}

Queue.prototype = {

	/**
	 * Returns false if page is already scraped
	 * @param job
	 * @returns {boolean}
	 */
  add: function (job) {
    console.log('add function started!');
    if (this.canBeAdded(job)) {
        console.log('add function canBeAdded true!')
        console.log('job: '+JSON.stringify(job))
        client.rpush('queue', JSON.stringify(job))
        this._setUrlScraped(job.url)
        console.log('add function returned true')
        return true
      }
    console.log('add function return false!');
    return false
  },

  canBeAdded: function (job) {
    if (this.isScraped(job.url)) {
      return false
    }

		// reject documents
    if (job.url.match(/\.(doc|docx|pdf|ppt|pptx|odt)$/i) !== null) {
      return false
    }
    console.log('canBeAdded function returned true')
    return true
  },

  getQueueSize: function () {
      return llenAsync('queue').then(function(res) {
          console.log(res)
          return new Promise(function(resolve, reject) {
              resolve(res)
          })
      });
      //client.llen('queue', (err, reply) =>
      //{
      //    if(err){
      //        console.log(`Getting queue size - error: ${err}`)
      //        return 0
      //    }
      //    else{
      //        console.log('getQueueSize function returned ' + reply)
      //        return parseInt(reply)
      //    }
      //});
  },

  isScraped: function (url) {
    return client.sismember(['scrapedUrl', JSON.stringify(url)], function(err, reply){
        if(err){
            console.log(`scrapedUrl : ${url} did not add properly! error: ${err}`)
            return false
        }
        if(parseInt(reply) == 1){
            console.log('isScraped function returned true')
            return true
        }
        else{
            console.log('isScraped function returned false')
            return false
        }
    });
  },

  _setUrlScraped: function (url) {
      client.sadd(['scrapedUrl', JSON.stringify(url)], function(err, reply){
          if(err){
              console.log(`scrapedUrl : ${url} did not add properly! error: ${err}`)
          }
          if(!reply){
              console.log(`scrapedUrl : ${url} Already added!`)
          }
      });
      console.log('_setUrlScraped function returned true')
  },

  getNextJob: function () {
		// @TODO test this
      this.getQueueSize().then(function(result) {
          console.log('getNextJob queue size ok!');
          client.lpop('scrapedUrl', function(err, reply){
              console.log('getNextJob inside lpop!')
              if(err){
                  console.log(`scrapedUrl : ${reply} did not add properly! error: ${err}`)
                  return false
              }
              console.log('getNextJob function returned ' + reply)
              return JSON.parse(reply)
          })
      })
      //else {
      //    console.log('getNextJob queue size is zero!');
      //    return false
      //}
  }
}

module.exports = Queue
