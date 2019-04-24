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
    if (this.canBeAdded(job)) {
        client.rpush("queue", job, function(err, reply){
          if(err){
              console.log(`Job : ${job} did not add properly! error: ${err}`)
              return false
          }
          if(reply){
              this._setUrlScraped(job.url)
          }else{
              console.log(`Job : ${job} Already added!`)
              return false
          }
      });
      return true
    }
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
    return true
  },

  getQueueSize: function () {
      client.llen("queue", function(err, reply){
          if(err){
              console.log(`Getting queue size - error: ${err}`)
              return 0
          }
          else{
              return reply
          }
      });
  },

  isScraped: function (url) {
    client.sismember("scrapedUrl", url, function(err, reply){
        if(err){
            console.log(`scrapedUrl : ${url} did not add properly! error: ${err}`)
            return false
        }
        return reply
    });
  },

  _setUrlScraped: function (url) {
      client.sadd("scrapedUrl", url, function(err, reply){
          if(err){
              console.log(`scrapedUrl : ${url} did not add properly! error: ${err}`)
          }
          if(!reply){
              console.log(`scrapedUrl : ${url} Already added!`)
          }
      });
  },

  getNextJob: function () {
		// @TODO test this
    if (this.getQueueSize() > 0) {
        client.lpop("scrapedUrl", function(err, reply){
            if(err){
                console.log(`scrapedUrl : ${url} did not add properly! error: ${err}`)
                return false
            }
            return reply
        });
    } else {
      return false
    }
  }
}

module.exports = Queue
