'use strict'; // eslint-disable-line strict

const arsenal = require('arsenal');
const werelogs = require('werelogs');
const fs = require('fs');
const assert = require('assert');
const uuid = require('uuid');
const level = require('level');
const sublevel = require('level-sublevel');
const debug = require('debug')('MetadataFileServer');
const diskusage = require('diskusage');
const Logger = require('werelogs').Logger;
const errors = arsenal.errors;
const constants = arsenal.constants;
const levelNet = arsenal.network.level;
const WGM = require('../arsenal/lib/versioning/WriteGatheringManager');
const WriteCache = require('../arsenal/lib/versioning/WriteCache');
const VRP = require('../arsenal/lib/versioning/VersioningRequestProcessor');
const bucketTools = require('./google_make_bucket');

const ROOT_DB = 'rootDB';
const SYNC_OPTIONS = { sync: true };

const SUBLEVEL_SEP = '::';
const MEMCACHED_LIFETIME = 100000;

const logOptions = {
    "logLevel": "debug",
    "dumpLevel": "error"
};

const logger = new werelogs.Logger('Zenko-Memcached');

const MetadataFileServer = require('arsenal').storage.metadata.MetadataFileServer;

const mdServer = new MetadataFileServer(
{ bindAddress: '0.0.0.0',
port: 9990,
path: '/tmp',
restEnabled: false,
restPort: 9999,
recordLog: { enabled: false, recordLogName: 's3-recordlog' },
versioning: { replicationGroupId: 'RG001' },
log: logOptions });

mdServer.initMetadataService = function () {
	// all metadata operations executed by leveldb go through the
	// /metadata namespace
	const namespace = `${constants.metadataFileNamespace}/metadata`;
	this.logger.info(`creating metadata service at ${namespace}`);
	this.rootDb = sublevel(level(`${this.path}/${ROOT_DB}`));
	const dbService = new levelNet.LevelDbService({
		rootDb: this.rootDb,
		namespace,
		logger: this.logger,
	});
	this.services.push(dbService);

	/* provide an API compatible with MetaData API */
	const metadataAPI = {
		get: (request, logger, callback) => {
			const dbPath = request.db.split(SUBLEVEL_SEP);
			const subDb = dbService.lookupSubLevel(dbPath);
			subDb.get(request.key, (err, data) => {
				if (err && err.notFound) {
					return callback(errors.ObjNotFound);
				}
				return callback(err, data);
			});
		},
		list: (request, logger, callback) => {
			const dbPath = request.db.split(SUBLEVEL_SEP);
			const subDb = dbService.lookupSubLevel(dbPath);
			const stream = subDb.createReadStream(request.params);
			const res = [];
			let done = false;
			stream.on('data', data => res.push(data));
			stream.on('error', err => {
				if (done === false) {
					done = true;
					callback(err);
				}
			});
			stream.on('end', () => {
				if (done === false) {
					done = true;
					callback(null, res);
				}
			});
		},
		batch: (request, logger, callback) => {
			const dbPath = request.db.split(SUBLEVEL_SEP);
			const ops = request.array.map(
				op => Object.assign({}, op, { prefix: dbPath }));
			if (this.recordLog.enabled) {
				this.recordLogService
					.withRequestParams(
						{ logName: this.recordLog.recordLogName })
					.createLogRecordOps(
						ops, (err, logEntries) => {
							debug('ops to batch:', ops);
							debug('log entries:', logEntries);
							return this.rootDb.batch(
								ops.concat(logEntries), SYNC_OPTIONS,
								err => callback(err));
						});
			} else {
				this.rootDb.batch(ops, SYNC_OPTIONS,
								  err => callback(err));
			}
		},
	};

	Object.keys(metadataAPI).forEach(k => {
		metadataAPI[k] = metadataAPI[k].bind(dbService);
	});

	const wgm = new WGM(metadataAPI);
	const writeCache = new WriteCache(wgm);
	const vrp = new VRP(writeCache, wgm, this.versioning);


	dbService.registerAsyncAPI({
		put: (env, key, value, options, cb) => {
			// console.log('metadata put hahahah\n');
			console.log('metadata PUT inside registerAsyncAPI\n', 'key is \n', key, '\n', 'value is \n', value, '\n', 'options is \n', options, '\n', 'cb is \n', cb);
			const dbName = env.subLevel.join(SUBLEVEL_SEP);
			console.log('dbName is:',dbName);
			vrp.put({ db: dbName, key, value, options },
					env.requestLogger, cb);
			//console.log('comparing "',dbName.toString(),'" to ', '"users..bucket"');
			// if (dbName === 'users..bucket'){
			// 	console.log('metadata put, dbname users..bucket, we are here....\n');
			// 	var bucket_name = key.split('.');
			// 	var name = bucket_name[bucket_name.length - 1];
			// 	console.log(name);
			// 	bucketTools(name);
			// }
		},
		del: (env, key, options, cb) => {
			const dbName = env.subLevel.join(SUBLEVEL_SEP);
			vrp.del({ db: dbName, key, options },
					env.requestLogger, cb);
		},
		get: (env, key, options, cb) => {
			// console.log('metadata getttt hahahah\n');
			console.log('metadata GET inside registerAsyncAPI\n', 'key is \n', key,'\n', 'options is \n', options, '\n', 'cb is \n', cb);
			const dbName = env.subLevel.join(SUBLEVEL_SEP);
			console.log('dbName is:',dbName);
			vrp.get({ db: dbName, key, options },
					env.requestLogger, cb);
		},
		getDiskUsage: (env, cb) => diskusage.check(this.path, cb),
	});
	dbService.registerSyncAPI({
		createReadStream:
		(env, options) => env.subDb.createReadStream(options),
		getUUID: () => this.readUUID(),
	});
}


mdServer.startServer();