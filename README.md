# publicFolder

<a href="http://publicfolder.io">publicFolder</a> is a Node app that runs on your desktop and keeps an <a href="https://en.wikipedia.org/wiki/Amazon_S3">Amazon S3</a> location in sync with a folder on a local disk.

This release is the <a href="https://www.npmjs.com/package/publicfolder">package</a> that's at the core of the app, which will eventually ship in an Electron shell for the Mac. 

You can run the publicFolder package today, anywhere Node runs using a small shell app, which is <a href="https://github.com/scripting/publicfolder/tree/master/examples/helloworld">provided</a>.  

### Who this is for

We will have a simple-to-use shell soon, but for right now, this package is for experienced Node developers. I'm looking for <a href="https://en.wikipedia.org/wiki/Linus%27s_Law">help</a> validating the software, to be sure it works, before building too much on top of it. I see this as essential system software, something we have to be confident in.

### Two locations

You need two places, one local and one on S3.

1. The watchFolder, on your local system, is where you create and update files to be published.

2. The s3Folder mirrors what's in the watchFolder. Very important: This location should be empty when you start. Any files there that are not present in the watchFolder will be deleted when publicFolder starts. 

3. There's no requirement that the S3 location be publicly accessible. You could use publicFolder to manage a private location on S3. 

### How to

1. <a href="https://github.com/scripting/publicfolder/archive/master.zip">Download</a> the folder. 

2. Open the <i>examples</i> sub-folder and move its <i>helloworld</i> sub-folder where you keep Node stuff. You can delete the rest of the files.

3. Edit config.json, replacing the example values with the path to the local folder (watchFolder) and where to store the files on S3 (s3Folder). 

4. If the destination on S3 truly is public also set urlS3Folder to point to the folder on the web. This will be used in logging and error messages. If it's a private location, set it to the empty string.

5. You also have to provide credentials in a form that the AWS software, which is part of publicFolder, will recognize. You can create a credentials file, or set up environment variables. Amazon has a <a href="https://aws.amazon.com/blogs/security/a-new-and-standardized-way-to-manage-credentials-in-the-aws-sdks/">docs</a> that explain. 

6. At the command line, install the dependencies using `npm install` and then run the app.

### How it works

publicFolder has two systems for detecting differences between the version of the folder on the local computer and the one on S3. 

1. At startup, and once a minute, we do a scan of the local folder and compare it with the S3 version. Any files that have been added locally since we last ran are uploaded. Any files that exist in S3 but not in the local folder are deleted. 

2. Once that scan is complete (it can happen in less than a second) -- we tell <a href="https://github.com/paulmillr/chokidar">Chokidar</a> to watch the folder. It notifies us when any file in the folder is added, modified or deleted. We make the S3 version match the local version when we get such a notification. 

3. It does not attempt to synchronize the local folder with the S3 location. It is not a replacement for Dropbox. The master is on the desktop, always. If a file exists in S3 that does not exist on the desktop, the S3 file is removed. It's a publisher, not a synchronizer. 

4. For relatively small files, 5MB or smaller, it uploads using a single file read. For larger files, it streams the content of the files to S3. 

5. There's a built-in HTTP server which ships turned off. It's there primarily so the Electron app can get information about what's going on in the main thread to report to the user. You can turn it on by setting config.flHttpEnabled to true.

### History, background

publicFolder takes care of exactly what's needed for a person to publish. It's the perfect complement for a static site generator, of which there are many. Just point it at a sub-folder of your watchFolder, and it takes care of the rest. 

Dropbox was quite close to the idea of publicFolder, but when it became popular they pulled back. As I understand , if you created your account after 2012, you didn't have a public folder. I did, because I was an early adopter. They finally turned the feature off on Sept 1, 2017. It was then that I decided it was time for a reliable and complete open source app that worked exactly the way you'd want it to work for publishing. Dropbox's heart was never in publishing. publicFolder is all about publishing. 

Another precursor of publicFolder was upstreaming in Radio UserLand, released in 2002. publicFolder should be a lot more efficient and powerful, but that said, upstreaming was pretty good, and Radio -- through upstreaming -- was one of the pillars of the early blogosphere. 

### Thanks to

<a href="https://github.com/paulmillr/chokidar">Chokidar</a> is at the core of publicFolder. This is the great thing about Node. There's a mature package for something as practical as file change notification. We all get to build on each others' work. 

S3 is a great storage system, it's fast, reliable, inexpensive. Like Dropbox, I wish they had done this project, and made creating a new storage location on S3 as easy as creating a Twitter account (an example, or GMail or Facebook). It's totally possible. 

### Updates

#### v0.4.19 -- 9/16/17 by DW

Stats gathering, three new callbacks. 

### Questions, comments?

Please post an issue <a href="https://github.com/scripting/publicfolder/issues">here</a>. 

Dave Winer, September 2017

