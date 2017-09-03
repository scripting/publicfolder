var myProductName = "publicFolder", myVersion = "0.4.0";   

const chokidar = require ("chokidar");
const utils = require ("daveutils");
const s3 = require ("daves3");
const fs = require ("fs");
const zlib = require ("zlib");
const AWS = require ("aws-sdk");
const filesystem = require ("./lib/filesystem.js");

let config = {
	watchFolder: "watch/",
	s3FolderPath: undefined,
	urlS3Folder: undefined,
	logFname: "stats/log.json",
	fileStatsFname: "stats/localfiles.json",
	s3FileStatsFname: "stats/s3files.json",
	queueFname: "stats/queue.json",
	flWriteQueue: true,
	maxLogLength: 500,
	maxConcurrentThreads: 25,
	minSizeForBlockUpload: 1024 * 1024 * 5 //5MB
	};
const fnameConfig = "config.json";

function dateGreater (d1, d2) {
	return (new Date (d1) > new Date (d2));
	}
function s3UploadBigFile (f, s3path, type, acl, callback) {
	console.log ("s3UploadBigFile: f == " + f);
	
	let theStream = fs.createReadStream (f);
	let splitpath = s3.splitPath (s3path);
	
	if (acl === undefined) {
		acl = "public-read";
		}
	
	let myParams = {
		Bucket: splitpath.Bucket,
		Key: splitpath.Key,
		ContentType: type, 
		ACL: acl
		};
	
	let s3obj = new AWS.S3 ({params: myParams});
	s3obj.upload ({Body: theStream}, function (err, data) {
		if (err) {
			console.log ("s3UploadBigFile: err.message == " + err.message);
			if (callback !== undefined) {
				callback (undefined);
				}
			}
		else {
			console.log ("s3UploadBigFile: data.Location == " + data.Location);
			if (callback !== undefined) {
				callback (data);
				}
			}
		});
	}
function readConfig (f, config, callback) {
	console.log ("readConfig: f == " + f); 
	utils.sureFilePath (f, function () {
		fs.readFile (f, function (err, data) {
			if (!err) {
				try {
					var jstruct = JSON.parse (data.toString ());
					for (var x in jstruct) {
						config [x] = jstruct [x];
						}
					}
				catch (err) {
					console.log ("readConfig: err == " + err.message);
					}
				}
			if (callback !== undefined) {
				callback ();
				}
			});
		});
	}
function okToUpload (f) {
	let fname = utils.stringLastField (f, "/");
	if (utils.beginsWith (fname, ".")) { //invisible files are not uploaded
		return (false);
		}
	return (true);
	}

//log file
	var watchLog = {
		stats: {
			ctLogSaves: 0,
			whenLastLogSave: new Date (0),
			ctUploads: 0,
			whenLastUpload: new Date (0),
			ctBytesUploaded: 0,
			ctDeletes: 0,
			whenLastDelete: new Date (0),
			},
		actions: new Array ()
		}
	var flLogChanged = false;
	function writeLog (callback) {
		watchLog.stats.ctLogSaves++;
		watchLog.stats.whenLastLogSave = new Date ();
		utils.sureFilePath (config.logFname, function () {
			fs.writeFile (config.logFname, utils.jsonStringify (watchLog), function (err) {
				if (callback !== undefined) {
					callback ();
					}
				});
			});
		}
	function readLog (callback) {
		utils.sureFilePath (config.logFname, function () {
			fs.readFile (config.logFname, function (err, data) {
				if (err) {
					writeLog ();
					callback ();
					}
				else {
					try {
						var jstruct = JSON.parse (data);
						watchLog = jstruct;
						callback ();
						}
					catch (err) {
						console.log ("readLog: err.messaage == " + err.messaage);
						callback ();
						}
					}
				});
			});
		}
	function addToLog (action, s3path, url, whenstart, size) {
		watchLog.actions.unshift ({
			action: action, 
			path: s3path,
			url: url,
			size: size,
			secs: utils.secondsSince (whenstart),
			when: whenstart
			});
		while (watchLog.actions.length > config.maxLogLength) {
			watchLog.actions.pop ();
			}
		switch (action) {
			case "upload":
				watchLog.stats.ctUploads++;
				watchLog.stats.whenLastUpload = whenstart;
				watchLog.stats.ctBytesUploaded += size;
				break;
			case "delete":
				watchLog.stats.ctDeletes++;
				watchLog.stats.whenLastDelete = whenstart;
				break;
			}
		flLogChanged = true;
		}
	function emptyLog () {
		watchLog.actions = new Array ();
		writeLog ();
		}
//the queue
	let queue = new Array (), ctConcurrentThreads = 0, flQueueChanged = false;
	let uploadingNow = new Object (); //helps us keep from uploading a file twice
	
	function addToQueue (operation, path) {
		let fladd = true;
		if ((operation == "upload") && uploadingNow [path]) { //we're currently uploading the file
			fladd = false;
			}
		else {
			for (var i = 0; i < queue.length; i++) {
				if ((queue [i].op == operation) && (queue [i].what == path)) { //the exact operation is already queued
					fladd = false; 
					}
				}
			}
		if (fladd) {
			queue.push ({
				op: operation,
				what: path
				});
			flQueueChanged = true;
			}
		}
	function processQueue () {
		while ((queue.length > 0) && (ctConcurrentThreads < config.maxConcurrentThreads)) {
			let next = queue.shift ();
			flQueueChanged = true;
			function uploadFile (localpath, s3path, url) {
				function fileStillCopying (stats) {
					return (false);
					}
				if (uploadingNow [localpath] === undefined) {
					let stats = fs.statSync (localpath);
					if (fileStillCopying (stats)) { 
						console.log ("uploadFile: putting \"" + localpath + "\" back on the queue.");
						queue.push (next);
						flQueueChanged = true;
						}
					else {
						uploadingNow [localpath] = true;
						let ext = utils.stringLastField (localpath, ".");
						let type = utils.httpExt2MIME (ext), whenstart = new Date ();
						if (stats.size <= config.minSizeForBlockUpload) {
							fs.readFile (localpath, function (err, filedata) {
								if (err) {
									console.log ("error reading \"" + f + "\" == " + err.message);
									}
								else {
									s3.newObject (s3path, filedata, type, "public-read", function (err) {
										delete uploadingNow [localpath];
										if (err) {
											console.log ("uploadFile: s3path == " + s3path + ", err.message == " + err.message);
											}
										else {
											console.log ("uploadFile: s3path == " + s3path + ", " + utils.secondsSince (whenstart) + " secs.");
											addToLog ("upload", s3path, url, whenstart, filedata.length);
											}
										});
									}
								});
							}
						else {
							s3UploadBigFile (localpath, s3path, type, "public-read", function (data) {
								delete uploadingNow [localpath];
								if (data !== undefined) {
									console.log ("s3UploadBigFile returned == " + JSON.stringify (data, undefined, 4)); 
									addToLog ("upload", s3path, url, whenstart, stats.size);
									}
								});
							}
						}
					}
				}
			function deleteFile (s3path) {
				let whenstart = new Date ();
				s3.deleteObject (s3path, function (err) {
					addToLog ("delete", s3path, undefined, whenstart, undefined);
					});
				}
			let localpath = config.watchFolder + next.what;
			let s3path = config.s3FolderPath + next.what;
			let url = config.urlS3Folder + next.what;
			switch (next.op) {
				case "upload":
					uploadFile (localpath, s3path, url);
					break;
				case "delete":
					deleteFile (s3path);
					break;
				default: 
					break;
				}
			}
		}
	function writeQueue (callback) {
		utils.sureFilePath (config.queueFname, function () {
			fs.writeFile (config.queueFname, utils.jsonStringify (queue), function (err) {
				if (callback !== undefined) {
					callback ();
					}
				});
			});
		}
//chokidar
	function startChokidar () {
		function getS3Path (f) {
			let relpath = utils.stringDelete (f, 1, config.watchFolder.length);
			let s3path = config.s3FolderPath + relpath;
			return (s3path)
			}
		let watcher = chokidar.watch (config.watchFolder, {
			ignoreInitial: true,
			awaitWriteFinish: true
			});
		watcher.on ("all", function (event, f) {
			let relpath = utils.stringDelete (f, 1, config.watchFolder.length), whenstart = new Date ();
			switch (event) {
				case "add":
				case "change":
					if (okToUpload (f)) {
						addToQueue ("upload", relpath);
						}
					break;
				case "unlink": {
					addToQueue ("delete", relpath);
					break;
					}
				}
			});
		}
//non-chokidar scanning
	var s3FileStats, localFileStats;
	
	function getS3FileStats (s3path, callback) {
		if (s3path !== undefined) {
			let whenstart = new Date ();
			let splitpath = s3.splitPath (s3path);
			s3FileStats = {};
			s3.listObjects (s3path, function (obj) {
				if (obj.flLastObject !== undefined) {
					utils.sureFilePath (config.s3FileStatsFname, function () {
						fs.writeFile (config.s3FileStatsFname, utils.jsonStringify (s3FileStats), function (err) {
							if (callback !== undefined) {
								callback ();
								}
							});
						});
					}
				else {
					let key = utils.stringDelete (obj.Key, 1, splitpath.Key.length);
					s3FileStats [key] = {
						modified: new Date (obj.LastModified), 
						};
					}
				});
			}
		}
	function getLocalFilestats (watchFolder, callback) {
		if (watchFolder !== undefined) {
			function forEachFile (f) {
				if (okToUpload (f)) {
					let stats = fs.statSync (f);
					localFileStats [utils.stringDelete (f, 1, watchFolder.length)] = {
						accessed: stats.atime, //when the data was last read
						modified: stats.mtime, //when one of the stats was changed
						changed: stats.ctime, //this is the important one
						created: stats.birthtime
						};
					}
				}
			localFileStats = {};
			filesystem.recursivelyVisitFiles (watchFolder, forEachFile, function () {
				utils.sureFilePath (config.fileStatsFname, function () {
					fs.writeFile (config.fileStatsFname, utils.jsonStringify (localFileStats), function (err) {
						if (callback !== undefined) {
							callback ();
							}
						});
					});
				});
			}
		}
	function checkFileAndS3Stats () {
		if (queue.length == 0) {
			getLocalFilestats (config.watchFolder, function () {
				getS3FileStats (config.s3FolderPath, function () {
					for (var x in localFileStats) {
						if (s3FileStats [x] === undefined) {
							if (okToUpload (x)) {
								console.log ("The file \"" + x + "\" is not present in the S3 folder.");
								addToQueue ("upload", x);
								}
							}
						else {
							if (dateGreater (localFileStats [x].modified, s3FileStats [x].modified)) {
								console.log ("The local file \"" + x + "\" has been modified.");
								addToQueue ("upload", x);
								}
							}
						}
					for (var x in s3FileStats) {
						if (localFileStats [x] === undefined) {
							addToQueue ("delete", x);
							}
						}
					});
				});
			}
		}

function everySecond () {
	processQueue ();
	if (flLogChanged) {
		flLogChanged = false;
		writeLog ();
		}
	if (flQueueChanged) {
		if  (config.flWriteQueue) {
			writeQueue ();
			}
		flQueueChanged = false;
		}
	}

console.log ("\n\n" + myProductName + " v" + myVersion + "\n\n");
readConfig (fnameConfig, config, function () {
	console.log ("config == " + utils.jsonStringify (config));
	readLog (function () {
		utils.sureFolder (config.watchFolder, function () {
			});
		});
	startChokidar ();
	checkFileAndS3Stats (); //do this once at startup
	setInterval (everySecond, 1000); 
	});



