#### 7/14/26; 5:17:00 PM by DW

In checkFileAndS3Stats, we only do a scan if there isn't already one running. 

#### 7/26/23; 12:47:01 PM by DW

Add the time to logged messages. 

Eliminate the messages of this form: "The file \"" + x + "\" is not present in the S3 folder."

#### 4/14/23; 11:01:46 AM by DW

Add a call accessible via the HTTP server, scans the folder manually and queues uploads for any files that changed.

