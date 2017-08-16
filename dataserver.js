'use strict'; // eslint-disable-line strict

const arsenal = require('arsenal');
const werelogs = require('werelogs');
const Memcached = require('memcached');

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
      dataStore: new MemcachedFileStore(
          { dataPath: '/tmp',
            log: logOptions }),
      log: logOptions });

dataServer.setup(err => {
    if (err) {
        logger.error('Error initializing REST data server',
                     { error: err });
        return;
    }

    dataServer.start();
});

console.log('Zenko Memcached Plugin Initialized');