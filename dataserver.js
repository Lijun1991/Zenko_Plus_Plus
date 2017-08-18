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
var sleep = require('sleep');
const async = require('async');

const SUBLEVEL_SEP = '::';
const MEMCACHED_LIFETIME = 100000;
const FOLDER_HASH = 3511;
//const bucket = 'hashtable-cyil';
const bucket = 'cyildiri-db';

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
        console.log('data put');
        const key = crypto.pseudoRandomBytes(20).toString('hex');
        const filePath = this.getFilePath(key);

        // console.log("bucket is : ", bucket);
        // console.log("filePath is : ", filePath);

        var wstream = fs.createWriteStream('/tmp/' + filePath);
        dataStream.pipe(wstream);
        dataStream.close;

        // console.log('start sleep');

        sleep.sleep(1);
        
        // console.log('end sleep');

        gToolkit.uploadFile(bucket, '/tmp/' + filePath);
        // console.log('\n\n\nyaya, i did it\n\n\n');

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
        const filePath = this.getFilePath(key);
        const tempPath = '/tmp/stat' + filePath;
        
        gToolkit.downloadFile(bucket, filePath, tempPath)
        //sleep.sleep(10);
        log.debug('stat file', { key, tempPath });
        fs.stat(tempPath, (err, stat) => {
            if (err) {
                if (err.code === 'ENOENT') {

                    log.error('error on \'stat\' of file');
                    return callback(errors.ObjNotFound);
                }
                log.error('error on \'stat\' of file',
                          { key, tempPath, error: err });
                return callback(errors.InternalError.customizeDescription(
                    `filesystem error: stat() returned ${err.code}`));
            }
            const info = { objectSize: stat.size };
            return callback(null, info);
        });
    }

    // sendFileToS3(error, filepath, getCallback){
    //     const readStreamOptions = {
    //         flags: 'r',
    //         encoding: null,
    //         fd: null,
    //         autoClose: true,
    //     };
    //     if (byteRange) {
    //         readStreamOptions.start = byteRange[0];
    //         readStreamOptions.end = byteRange[1];
    //     }
    //     log.debug('opening readStream to get data',
    //               { method: 'get', key, tempPath, byteRange });
    //     const cbOnce = jsutil.once(getCallback);
    //     const rs = fs.createReadStream(tempPath, readStreamOptions)
    //             .on('error', err => {
    //                 if (err.code === 'ENOENT') {
    //                     return cbOnce(errors.ObjNotFound);
    //                 }
    //                 log.error('error retrieving file',
    //                         { method: 'get', key, tempPath,
    //                             error: err });
    //                 return cbOnce(
    //                     errors.InternalError.customizeDescription(
    //                         `filesystem read error: ${err.code}`));
    //             })
    //             .on('open', () => { cbOnce(null, rs); });
    // }

    get(key, byteRange, log, callback) {
        console.log('data get');
        const filePath = this.getFilePath(key);
        const tempPath = '/tmp/dl' + filePath;


        async.waterfall([(next) =>
            {
                gToolkit.downloadFile(bucket, filePath, tempPath, next)
            }
        ], function (err, result) {
            // result now equals 'done'
            const readStreamOptions = {
                flags: 'r',
                encoding: null,
                fd: null,
                autoClose: true,
            };
            if (byteRange) {
                readStreamOptions.start = byteRange[0];
                readStreamOptions.end = byteRange[1];
            }
            log.debug('opening readStream to get data',
                      { method: 'get', key, tempPath, byteRange });
            const cbOnce = jsutil.once(callback);
            const rs = fs.createReadStream(tempPath, readStreamOptions)
                    .on('error', err => {
                        if (err.code === 'ENOENT') {
                            return cbOnce(errors.ObjNotFound);
                        }
                        log.error('error retrieving file',
                                { method: 'get', key, tempPath,
                                    error: err });
                        return cbOnce(
                            errors.InternalError.customizeDescription(
                                `filesystem read error: ${err.code}`));
                    })
                    .on('open', () => { cbOnce(null, rs); });
        });

        // sleep.sleep(10);
        // const readStreamOptions = {
        //     flags: 'r',
        //     encoding: null,
        //     fd: null,
        //     autoClose: true,
        // };
        // if (byteRange) {
        //     readStreamOptions.start = byteRange[0];
        //     readStreamOptions.end = byteRange[1];
        // }
        // log.debug('opening readStream to get data',
        //           { method: 'get', key, tempPath, byteRange });
        // const cbOnce = jsutil.once(callback);
        // const rs = fs.createReadStream(tempPath, readStreamOptions)
        //         .on('error', err => {
        //             if (err.code === 'ENOENT') {
        //                 return cbOnce(errors.ObjNotFound);
        //             }
        //             log.error('error retrieving file',
        //                     { method: 'get', key, tempPath,
        //                         error: err });
        //             return cbOnce(
        //                 errors.InternalError.customizeDescription(
        //                     `filesystem read error: ${err.code}`));
        //         })
        //         .on('open', () => { cbOnce(null, rs); });
    }

    delete(key, log, callback) {
	    console.log('data delete');
        const filePath = this.getFilePath(key);
        gToolkit.deleteFile(bucket, filePath);

        // console.log('\n\n\n  yaya, i deleted the thing\n\n\n');
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