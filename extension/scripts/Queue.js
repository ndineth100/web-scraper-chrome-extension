const redis = require('redis');

// Create Redis Client
let client = redis.createClient();

client.on('connect', function(){
    console.log('Package Queue Initiated a Connection to Redis...');
});

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
        console.log('add function canBeAdded true!');
        let status = client.rpush(['queue', JSON.stringify(job)], function(err, reply){
          if(err){
              console.log(`Job : ${job} did not add properly! error: ${err}`)
              return false
          }
          return true
      });
      if(status){
          this._setUrlScraped(job.url)
          console.log('add function returned true')
          return true
      }
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
      return client.llen('queue', function(err, reply){
          if(err){
              console.log(`Getting queue size - error: ${err}`)
              return 0
          }
          else{
              console.log('getQueueSize function returned ' + reply)
              return parseInt(reply)
          }
      });
  },

  isScraped: function (url) {
    return client.sismember(['scrapedUrl', url], function(err, reply){
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
      client.sadd(['scrapedUrl', url], function(err, reply){
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
    console.log('getNextJob started!');
    if (this.getQueueSize() > 0) {
        console.log('getNextJob queue size ok!');
        client.lpop('scrapedUrl', function(err, reply){
            console.log('getNextJob inside lpop!');
            if(err){
                console.log(`scrapedUrl : ${url} did not add properly! error: ${err}`)
                return false
            }
            console.log('getNextJob function returned ' + reply)
            return JSON.parse(reply)
        });
    } else {
      console.log('getNextJob queue size is zero!');
      return false
    }
  }
}

module.exports = Queue
