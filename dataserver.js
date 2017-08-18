'use strict'; // eslint-disable-line strict

const arsenal = require('arsenal');
const werelogs = require('werelogs');
const Memcached = require('memcached');
var storage = require('@google-cloud/storage');
const { config } = require('../s3/lib/Config.js');
const fs = require('fs');
const gToolkit = require('./storage/files.js');
const crypto = require('crypto');
const bucketTools = require('./google_make_bucket');
const jsutil = arsenal.jsutil;

const SUBLEVEL_SEP = '::';
const MEMCACHED_LIFETIME = 100000;
const FOLDER_HASH = 3511;

const logOptions = {
    "logLevel": "debug",
    "dumpLevel": "error"
};

const logger = new werelogs.Logger('Zenko-Memcached');

function stringHash(str) {
    let hash = 5381;
    let i = str.length;

    while (i) {
        hash = hash * 33 ^ str.charCodeAt(--i);
    }

    /* JavaScript does bitwise operations (like XOR, above) on
     * 32-bit signed integers. Since we want the results to be
     * always positive, convert the signed int to an unsigned by
     * doing an unsigned bitshift.
     */
    return hash >>> 0;
}

class GoogleFileStore extends arsenal.storage.data.file.DataFileStore {
    constructor(dataConfig, logApi) {
	super(dataConfig, logApi);
	console.log('data --- filestore constructor');
    }

    setup(callback) {
    console.log('data setup');
	callback(null);
    }

    getFilePath(key) {
        const hash = stringHash(key);
        const folderHashPath = ((hash % FOLDER_HASH)).toString();
        return `${folderHashPath}-${key}`;
    }
        // // console.log('data --- data put');
        // // console.log('data --- dataStream is:\n', dataStream);
        // // console.log('data --- size is:\n', size);
        // // console.log('data --- log is:\n',log);
        //  });
        //  log.debug('starting to write data', { method: 'put', key, filePath });
        //  console.log(filePath);      
    put(dataStream, size, log, callback) {
        const key = crypto.pseudoRandomBytes(20).toString('hex');
        const filePath = this.getFilePath(key);

        const bucket = 'hashtable-cyil';

        console.log("bucket is : ", bucket);
        console.log("filePath is : ", filePath);

        var wstream = fs.createWriteStream('/tmp/' + filePath);
        dataStream.pipe(wstream);
        dataStream.close;

        gToolkit.uploadFile(bucket, '/tmp/' + filePath);
        console.log('\n\n\nyaya, i did it\n\n\n');

        const cbOnce = jsutil.once(callback);

        function ok() {
            log.debug('finished writing data',
                        { method: 'put', key, filePath });
            return cbOnce(null, key);
        }

        return ok();
    }
    stat(key, log, callback) {
	    console.log('data stat');
    }

    get(key, byteRange, log, callback) {
        console.log('data get');
    }

    delete(key, log, callback) {
	    console.log('data delete');
        const filePath = this.getFilePath(key);
        const bucket = 'hashtable-cyil';
        gToolkit.deleteFile(bucket, filePath);

        console.log('\n\n\n  yaya, i deleted the thing\n\n\n');
        return callback();
    }

    getDiskUsage(callback) {
	    console.log('data getDiskUsage');
    }
}



const dataServer = new arsenal.network.rest.RESTServer(
    { bindAddress: '0.0.0.0',
      port: 9991,
      dataStore: new GoogleFileStore(
        { dataPath: '/tmp',
          log: logOptions }),
        log: logOptions });

    //   new arsenal.storage.data.file.DataFileStore(
    //     { dataPath: config.dataDaemon.dataPath,
    //       log: config.log }),
    //     log: config.log });



dataServer.setup(err => {
    if (err) {
        logger.error('Error initializing REST data server',
                     { error: err });
        return;
    }

    dataServer.start();
});

console.log('Zenko Memcached Plugin Initialized');