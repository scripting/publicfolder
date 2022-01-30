var myProductName = "electronPublicFolder", myVersion = "0.4.10";  

const publicfolder = require ("./lib/publicfolder.js");

const electronland = require ("electronland").main; 
const utils = require ("daveutils");
const fs = require ("fs");
const userhome = require ("userhome");

var myConfig = {
	productname: "electronPublicFolder",
	productnameForDisplay: "Public Folder",
	description: "An Electron shell for the publicfolder package.",
	version: myVersion,
	indexfilename: "index.html",
	flOpenDevToolsAtStart: false,
	mainWindowWidth: 800,
	mainWindowHeight: 800,
	appDirname: __dirname,
	asyncMessageCallback: handleMessageFromBrowser,
	publicFolder: {
		httpPort: 1500,
		flHttpEnabled: true,
		
		logFname: "log.json",
		fileStatsFname: "localfiles.json",
		s3FileStatsFname: "s3files.json",
		queueFname: "queue.json",
		
		addToLogCallback: addToLogCallback,
		uploadStartCallback: uploadStartCallback,
		uploadDoneCallback: uploadDoneCallback,
		viewStatsCallback: viewStatsCallback,
		debugMessageCallback: electronland.debugMessage
		}
	}

function addToLogCallback (theLogItem) {
	electronland.sendIpcToBrowser ("addToLog", utils.jsonStringify (theLogItem)); 
	}
function uploadStartCallback (fileInfo) {
	electronland.sendIpcToBrowser ("uploadStart", utils.jsonStringify (fileInfo)); 
	}
function uploadDoneCallback (fileInfo) {
	electronland.sendIpcToBrowser ("uploadDone", utils.jsonStringify (fileInfo)); 
	}
function viewStatsCallback (stats) {
	electronland.sendIpcToBrowser ("viewStats", utils.jsonStringify (stats)); 
	}
function handleMessageFromBrowser (event, arg1, arg2, arg3) {
	console.log ("handleMessageFromBrowser: " + arg1 + ", arg2 == " + arg2 + ", arg3 == " + arg3);
	switch (arg1) {
		}
	return (false); //indicates that we did not handle the message
	}

electronland.init (myConfig, function () {
	myConfig.publicFolder.userDataFolder = electronland.getConfig ().userDataFolder;
	function checkConfigJson (callback) {
		let f = myConfig.publicFolder.userDataFolder + "config.json";
		console.log ("checkConfigJson: f == " + f);
		fs.readFile (f, function (err, data) {
			function createConfig () {
				let jstruct = {
					watchFolder: userhome () + "/publicFolder/",
					s3Folder: "",
					urlS3Folder: ""
					};
				fs.writeFile (f, utils.jsonStringify (jstruct), function (err) {
					if (err) {
						console.log ("createConfig: err.message == " + err.message);
						}
					else {
						console.log ("createConfig: jstruct == " + utils.jsonStringify (jstruct));
						}
					callback ();
					});
				}
			if (err) {
				console.log ("checkConfigJson: err.message == " + err.message);
				createConfig ();
				}
			else {
				try {
					let jstruct = JSON.parse (data);
					for (var x in jstruct.publicFolder) {
						myConfig.publicFolder [x] = jstruct [x];
						}
					console.log ("checkConfigJson: jstruct == " + utils.jsonStringify (jstruct));
					callback ();
					}
				catch (err) {
					console.log ("checkConfigJson: err.message == " + err.message);
					createConfig ();
					}
				}
			});
		}
	checkConfigJson (function () {
		publicfolder.start (myConfig.publicFolder, function () {
			});
		});
	});
