const redis = require('redis');
const {promisify} = require('util');

// Create Redis Client
let client = redis.createClient();

client.on('connect', function(){
    console.log('Package Queue Initiated a Connection to Redis...');
});

const llenAsync = promisify(client.llen).bind(client);
const lpopAsync = promisify(client.lpop).bind(client);
const sismemberAsync = promisify(client.sismember).bind(client);
const saddAsync = promisify(client.sadd).bind(client);
const rpushAsync = promisify(client.rpush).bind(client);

module.export = {client, llenAsync, lpopAsync, sismemberAsync, saddAsync, rpushAsync}
