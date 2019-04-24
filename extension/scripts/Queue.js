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
        let status = client.rpush(['queue', JSON.stringify(job)], function(err, reply){
          if(err){
              console.log(`Job : ${job} did not add properly! error: ${err}`)
              return false
          }
          if(!reply){
              console.log(`Job : ${job} Already added!`)
              return false
          }
      });
      if(!status){
          return false;
      }else{
          this._setUrlScraped(job.url)
          console.log('add function returned true');
          return true
      }
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
    console.log('canBeAdded function returned true');
    return true
  },

  getQueueSize: function () {
      return client.llen('queue', function(err, reply){
          if(err){
              console.log(`Getting queue size - error: ${err}`)
              return 0
          }
          else{
              console.log('getQueueSize function returned ' + reply);
              return parseInt(reply)
          }
      });
      console.log('getQueueSize check!');
  },

  isScraped: function (url) {
    return client.sismember(['scrapedUrl', url], function(err, reply){
        if(err){
            console.log(`scrapedUrl : ${url} did not add properly! error: ${err}`)
            return false
        }
        if(reply){
            console.log('isScraped function returned true');
            return true;
        }
        else{
            console.log('isScraped function returned false');
            return false;
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
      console.log('_setUrlScraped function returned true');
  },

  getNextJob: function () {
		// @TODO test this
    if (this.getQueueSize() > 0) {
        return client.lpop('scrapedUrl', function(err, reply){
            if(err){
                console.log(`scrapedUrl : ${url} did not add properly! error: ${err}`)
                return false
            }
            console.log('getNextJob function returned '+reply);
            return JSON.parse(reply)
        });
    } else {
      return false
    }
  }
}

module.exports = Queue
