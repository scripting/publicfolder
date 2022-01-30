const shell = require ("electronland").shell; 
const utils = require ("daveutils"); 
const fs = require ("fs");
const electron = require ("electron");

var appPrefs = { 
	watchFolder: undefined,
	s3FolderPath: undefined,
	urlS3Folder: undefined
	};
var flPrefsChanged = false;
const defaultWatchedFolderName = "my public folder";
const urlFileOutline = "http://localhost:1500/localfilesoutline";
const urlLog = "http://localhost:1500/log";
const urlLocalFiles = "http://localhost:1500/localfiles";
const urlS3Files = "http://localhost:1500/s3files";


function dropZoneSetup (idzone, callback) {
	var dropzone = document.getElementById (idzone);
	dropzone.addEventListener ("dragenter", function (e) {
		console.log ("dropZoneSetup: dragenter event");
		e.stopPropagation ();
		e.preventDefault ();
		$("#" + idzone).addClass ("divDropZoneActive");
		}, false);
	dropzone.addEventListener ("dragleave", function (e) {
		console.log ("dropZoneSetup: dragleave event");
		e.stopPropagation ();
		e.preventDefault ();
		$("#" + idzone).removeClass ("divDropZoneActive");
		}, false);
	dropzone.addEventListener ("dragover", function (e) {
		e.stopPropagation ();
		e.preventDefault ();
		}, false);
	dropzone.addEventListener ("drop", function (e) {
		e.stopPropagation ();
		e.preventDefault ();
		console.log ("dropZoneSetup: drop event");
		$("#" + idzone).removeClass ("divDropZoneActive");
		var dt = e.dataTransfer;
		var files = dt.files;
		callback (files);
		}, false);
	}
function dropFileSetup () {
	dropZoneSetup ("idPageBody", function (files) {
		for (var i = 0; i < files.length; i++) {
			var file = files [i];
			console.log ("file.name == " + file.name);
			console.log ("file.size == " + file.size);
			console.log ("file.type == " + file.type);
			console.log ("file.lastModifiedDate == " + file.lastModifiedDate);
			
			fs.readFile (file.path, function (err, filedata) {
				if (err) {
					console.log ("dropFileSetup: err.message == " + err.message);
					}
				else {
					let config = shell.getConfig (); 
					let f = config.watchFolder + file.name;
					fs.writeFile (f, filedata, function (err) {
						if (err) {
							console.log ("dropFileSetup: err.message == " + err.message);
							}
						});
					}
				});
			}
		});
	}
function viewFilesOutline () {
	function readFileOutline (callback) {
		readHttpFile (urlFileOutline, function (data) {
			if (data !== undefined) {
				try {
					let theOutline = JSON.parse (data);
					if (callback !== undefined) {
						callback (theOutline);
						}
					}
				catch (err) {
					}
				}
			});
		}
	readFileOutline (function (theOutline) {
		var htmltext = renderOutlineBrowser (theOutline, false, undefined, undefined, true);
		$("#idOutlineDisplayer").html (htmltext);
		self.setInterval (everySecond, 1000); 
		});
	}
function chooseFolder () {
	shell.chooseFolderDialog (appPrefs.watchFolder, function (theFolder) {
		appPrefs.watchFolder = theFolder;
		shell.openItem (theFolder);
		prefsChanged ();
		});
	}
function openWatchFolder () {
	var config = shell.getConfig ();
	console.log ("openWatchFolder: config == " + jsonStringify (config));
	shell.openItem (config.watchFolder);
	}
function prefsChanged () {
	flPrefsChanged = true;
	}
function sendFoldersToMainThread () {
	let folders = {
		watchFolder: appPrefs.watchFolder,
		s3FolderPath: appPrefs.s3FolderPath,
		urlS3Folder: appPrefs.urlS3Folder
		};
	electron.ipcRenderer.send ("asynch-message", "setPublicfolderConfig", jsonStringify (folders));  
	}
function openSettingsDialog () {
	shell.openSettingsDialog (function (appPrefsFromStorage) {
		for (var x in appPrefsFromStorage) {
			appPrefs [x] = appPrefsFromStorage [x];
			}
		sendFoldersToMainThread ();
		});
	}
function emptyLog () {
	confirmDialog ("Empty the action log?", function () {
		electron.ipcRenderer.send ("asynch-message", "emptyLog");  
		});
	}
function scanFilesNow () {
	electron.ipcRenderer.send ("asynch-message", "scanFilesNow");  
	}
function aboutSystemMenu () {
	alertDialog ("The commands in this menu are placeholders.");
	}

function viewStats (stats) {
	if (getBoolean (stats.flGoodLaunch)) {
		function formatDateTime (d) {
			d = new Date (d);
			return (d.toLocaleDateString () + " at " + d.toLocaleTimeString ());
			}
		$("#idWhenLaunch").text (formatDateTime (stats.whenLaunch));
		$("#idCtUploads").text (stats.ctUploads);
		$("#idCtBytesUploaded").text (utils.gigabyteString (stats.ctBytesUploaded));
		$("#idCtDeletes").text (stats.ctDeletes);
		$("#idFolderSizeLocal").text (utils.gigabyteString (stats.ctBytesInLocalFolder))
		$("#idFolderSizeS3").text (utils.gigabyteString (stats.ctBytesInS3Folder));
		$("#idCtLocalFiles").text (stats.ctFilesInLocalFolder);
		$("#idCtS3Files").text (stats.ctFilesInS3Folder);
		$("#idCurrentThreads").text (stats.ctCurrentThreads);
		$("#idFilesInQueue").text (stats.ctFilesInQueue);
		$("#idStats").css ("display", "block");
		}
	}
function viewLog () {
	var htmltext = "", indentlevel = 0, whenstart = new Date ();
	function add (s) {
		htmltext += filledString ("\t", indentlevel) + s + "\n";
		}
	function getLogFile () {
		var config = shell.getConfig ();
		return (config.userDataFolder + config.publicFolder.logFname);
		}
	function readLog (callback) {
		readHttpFile (urlLog, function (jsontext) {
			if (jsontext === undefined) {
				callback (undefined);
				}
			else {
				try {
					callback (JSON.parse (jsontext));
					}
				catch (err) {
					console.log ("readLog: err.message == " + err.message);
					callback (undefined);
					}
				}
			});
		}
	readLog (function (theLog) {
		if (theLog !== undefined) {
			viewStats (theLog.stats);
			if (theLog.actions.length > 0) {
				function sizestring (size) {
					if (size === undefined) {
						return ("");
						}
					return (utils.gigabyteString (size));
					}
				add ("<table class=\"divLogTable\">"); indentlevel++;
				//header
					add ("<tr>"); indentlevel++;
					add ("<th class=\"tdRight\">When</th>");
					add ("<th>File</th>");
					add ("<th>Action</td>");
					add ("<th class=\"tdRight\">Size</th>");
					add ("<th class=\"tdRight\">Secs</th>");
					add ("</tr>"); indentlevel--;
				for (var i = 0; i < theLog.actions.length; i++) {
					let item = theLog.actions [i], fname = maxLengthString (stringLastField (item.path, "/"), 40);
					add ("<tr>"); indentlevel++;
					add ("<td class=\"tdRight\">" + utils.viewDate (item.when) + "</td>");
					//link
						let link = fname;
						if (item.url !== undefined) {
							link = "<a href=\"" + item.url + "\">" + fname + "</a>";
							}
						add ("<td>" + link + "</td>");
					add ("<td>" + item.action + "</td>");
					add ("<td class=\"tdRight\">" + sizestring (item.size) + "</td>");
					add ("<td class=\"tdRight\">" + item.secs + "</td>");
					add ("</tr>"); indentlevel--;
					}
				add ("</table>"); indentlevel--;
				}
			$("#idLog").html (htmltext);
			}
		});
	}
//uploadingNow display
	let uploadingNow = {
		};
	
	function uploadStart (fileInfo) {
		console.log ("uploadStart: fileInfo == " + jsonStringify (fileInfo));
		uploadingNow [fileInfo.relpath] = new Date ();
		viewStats (fileInfo.stats);
		}
	function uploadDone (fileInfo) {
		console.log ("uploadDone: fileInfo == " + jsonStringify (fileInfo));
		delete uploadingNow [fileInfo.relpath];
		viewStats (fileInfo.stats);
		}
	function viewUploadingNow () {
		
		return; //wired off for now -- 9/16/17 by DW
		
		
		var htmltext = "", indentlevel = 0, ct = 0;
		function add (s) {
			htmltext += filledString ("\t", indentlevel) + s + "\n";
			}
		add ("<table>"); indentlevel++;
		for (var x in uploadingNow) {
			let fname = maxLengthString (stringLastField (x, "/"), 50);
			let secs = secondsSince (uploadingNow [x]).toFixed (2);
			add ("<tr><td>" + fname + "</td><td>" + secs + "</td></tr>");
			ct++;
			}
		add ("</table>"); indentlevel--;
		
		if (ct > 0) {
			htmltext = "<h4>Uploading now..</h4>" + htmltext;
			}
		
		if (htmltext != $("#idUploadingNow").html ()) {
			$("#idUploadingNow").html (htmltext);
			}
		}
function viewMainThreadStats (jsontext) {
	let stats = JSON.parse (jsontext);
	$("#idQueueLength").html (stats.queueLength);
	}
function everyMinute () {
	viewLog ();
	}
function everySecond () {
	initTwitterMenuItems ();
	viewUploadingNow (); //9/15/17 by DW
	if (flPrefsChanged) {
		flPrefsChanged = false;
		shell.setPrefs (appPrefs);
		}
	}
function startup () {
	var options = {
		ipcMessageCallback: function (name, value) {
			console.log ("ipcMessageCallback: name == " + name);
			switch (name) {
				case "viewLog":
					viewLog ();
					viewMainThreadStats (value);
					break;
				case "addToLog": //an item was added to the log, outline needs update
					let logItem = JSON.parse (value);
					console.log ("addToLog: logItem == " + jsonStringify (logItem));
					viewLog ();
					viewFilesOutline ();
					break;
				case "uploadStart": //9/15/17 by DW
					uploadStart (JSON.parse (value));
					break;
				case "uploadDone":  //9/15/17 by DW
					uploadDone (JSON.parse (value));
					break;
				case "viewStats":  //9/16/17 by DW
					viewStats (JSON.parse (value));
					break;
				}
			}
		};
	shell.init (options, function (appPrefsFromStorage) {
		for (var x in appPrefsFromStorage) {
			appPrefs [x] = appPrefsFromStorage [x];
			}
		if (twIsTwitterConnected ()) {
			twGetUserInfo (twGetScreenName (), function (userinfo) {
				console.log ("startup: userinfo == " + jsonStringify (userinfo));
				$("#idUserName").text (userinfo.name);
				});
			}
		viewFilesOutline (); //9/7/17 by DW
		viewLog ();
		dropFileSetup ();
		self.setInterval (everySecond, 1000); 
		utils.runAtTopOfMinute (function () {
			self.setInterval (everyMinute, 60000); 
			everyMinute ();
			});
		});
	}
