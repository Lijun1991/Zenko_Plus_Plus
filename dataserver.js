'use strict'; // eslint-disable-line strict

const arsenal = require('arsenal');
const werelogs = require('werelogs');
const Memcached = require('memcached');
var storage = require('@google-cloud/storage');
const { config } = require('../s3/lib/Config.js');

const SUBLEVEL_SEP = '::';
const MEMCACHED_LIFETIME = 100000;

const logOptions = {
    "logLevel": "debug",
    "dumpLevel": "error"
};

const logger = new werelogs.Logger('Zenko-Memcached');

class MemcachedFileStore extends arsenal.storage.data.file.DataFileStore {
    constructor(dataConfig, logApi) {
	super(dataConfig, logApi);
	console.log('filestore constructor');
    }

    setup(callback) {
    console.log('data setup');
	callback(null);
    }

    put(dataStream, size, log, callback) {
    console.log('data put');
    console.log(dataStream);
    console.log(size);
    console.log(log);
    }

    // var gcs = storage({
    //     projectId: 'grape-spaceship-123',
    //     keyFilename: '/path/to/keyfile.json'
    //   });
      
    //   // Create a new bucket.
    //   gcs.createBucket('my-new-bucket', function(err, bucket) {
    //     if (!err) {
    //       // "my-new-bucket" was successfully created.
    //     }
    //   });
      
    //   // Reference an existing bucket.
    //   var bucket = gcs.bucket('my-existing-bucket');
      
    //   // Upload a local file to a new file to be created in your bucket.
    //   bucket.upload('/photos/zoo/zebra.jpg', function(err, file) {
    //     if (!err) {
    //       // "zebra.jpg" is now in your bucket.
    //     }
    //   });
      
    //   // Download a file from your bucket.
    //   bucket.file('giraffe.jpg').download({
    //     destination: '/photos/zoo/giraffe.jpg'
    //   }, function(err) {});
      

    stat(key, log, callback) {
	console.log('data stat');
    }

    get(key, byteRange, log, callback) {
	console.log('data get');
    }

    delete(key, log, callback) {
	console.log('data delete');
    }

    getDiskUsage(callback) {
	console.log('data getDiskUsage');
    }
}



const dataServer = new arsenal.network.rest.RESTServer(
    { bindAddress: '0.0.0.0',
      port: 9991,
      dataStore: new arsenal.storage.data.file.DataFileStore(
        { dataPath: config.dataDaemon.dataPath,
          log: config.log }),
    log: config.log });

dataServer.setup(err => {
    if (err) {
        logger.error('Error initializing REST data server',
                     { error: err });
        return;
    }

    dataServer.start();
});

console.log('Zenko Memcached Plugin Initialized');