const redis = require("async-redis")
const {promisify} = require('util')

// Create Redis Client
let client = redis.createClient();

const sismemberAsync = promisify(client.sismember).bind(client);
const llenAsync = promisify(client.llen).bind(client);
const saddAsync = promisify(client.sadd).bind(client);
const lpopAsync = promisify(client.lpop).bind(client);

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

  getQueueSize: async function () {
      const res = await llenAsync(['queue'], function(err, reply){
          if(err){
              console.log(`Getting queue size - error: ${err}`)
              return 0
          }
          else{
              console.log('getQueueSize function returned ' + reply)
              return parseInt(reply)
          }
      });
      console.log(res);
      return res;
  },

  isScraped: async function (url) {
        const res = await sismemberAsync(['scrapedUrl', url], function(err, reply){
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
        console.log(res);
        return res;
  },

  _setUrlScraped: async function (url) {
      await saddAsync(['scrapedUrl', url], function(err, reply){
          if(err){
              console.log(`scrapedUrl : ${url} did not add properly! error: ${err}`)
          }
          if(!reply){
              console.log(`scrapedUrl : ${url} Already added!`)
          }
      });
      console.log('_setUrlScraped function returned true')
  },

  getNextJob: async function () {
		// @TODO test this

    console.log(`getNextJob started! queue size: ${this.getQueueSize()}`);
    if (this.getQueueSize() > 0) {
        console.log('getNextJob queue size ok!')
            const res = await lpopAsync('scrapedUrl', function(err, reply){
                console.log('getNextJob inside lpop!')
                if(err){
                    console.log(`scrapedUrl : ${url} did not add properly! error: ${err}`)
                    return false
                }
                console.log('getNextJob function returned ' + reply)
                return JSON.parse(reply)
            })
            console.log(res)
            return res

    } else {
      console.log('getNextJob queue size is zero!');
      return false
    }
  }
}

module.exports = Queue
