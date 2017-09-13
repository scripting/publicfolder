# publicFolder

publicFolder is a Node app that runs on your desktop and keeps a single folder in sync with a location on Amazon S3.

This release is the package that's at the core of the app, which will eventually ship in an Electron shell for the Mac. You can run the publicFolder package anywhere that Node runs. 

### How to

You have to configure publicFolder to tell it where you're keeping the local folder and where to store the files in that folder on S3. That's done entirely through a config.json file in the same folder as the publicFolder app. 

You also have to provide credentials in a form that the AWS software, which is part of publicFolder, will recognize. You can create a credentials file, or set up environment variables. Amazon has a page of docs that explains. 

### How it works

It has two systems for detecting differences between the version of the folder on the local computer and the one on S3. 

1. At startup we do a scan of the local folder and compare it with the S3 version of the folder. Any files that have been added locally since we last ran are uploaded. Any files that exist in S3 but not in the local folder are deleted. 

2. Once that scan is complete (it can happen in less than a second) -- we tell Chokidar to watch the folder. It notifies us when any file in the folder is added, modified or deleted. We make the S3 version match the local version when we get such a notification. 

It does not attempt to synchronize the local folder with the S3 version. The master is on the desktop, always. If a file exists in S3 that does not exist on the desktop, the S3 file is removed. It's not a synchronizer as much as it is a publisher. 

### The concept

publicFolder takes care of exactly what's needed for a person to publish without any opinion about the software you use to do the writing or rendering. Another way of looking at it -- it's the perfect complement for a static site generator app. Just point it at a sub-foldre of your public folder, and it takes care of the rest. 

### History, background

Dropbox was quite close to the idea of Public Folder, but once it became popular they pulled back from it. As I understand it, if you created your account after 2012, you didn't have a public folder. I did, because I was an early adopter. They finally turned the feature off on Sept 1, 2017. It was then that I decide it was time to replace it with an open source app that worked exactly the way you'd want it to work for publishing applications. Dropbox's heart was never in publishing. publicFolder is all about publishing. 

Another precursor of publicFolder was upstreaming in Radio UserLand, released in 2002. publicFolder should be a lot more efficient and powerful, but that said, upstreaming was pretty good, and Radio -- through upstreaming -- was one of the pillars of the early blogosphere, and an interesting web product as well. Radio had a CMS built in. This time around I have created that as a separate module. I'm pretty sure any static site generator that runs where Node runs will be compatible with Public Folder. 

### Thanks to

The Chokidar package is at the core of publicFolder. This is the great thing about Node. There's a mature package for something as practical as file change notification. We all get to build on each others' work. 

### Questions, comments?

Please post an issue <a href="https://github.com/scripting/publicfolder/issues">here</a>. 

