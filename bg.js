
var urls = [];
var sample_urls = [];
var urls_downloaded = [];

chrome.downloads.onDeterminingFilename.addListener(function(item, suggest) {
    // for this chrome extension, so fix the file extension
    if(item.byExtensionId != null && item.byExtensionId == chrome.runtime.id)
    {
        var filename = "Image Saver/" + item.filename;

        var ext = "";
        switch(item.mime){ // fix mime types
            case "image/png":
                ext = ".png";
                break;
            case "image/jpeg":
            case "image/jpg":
                ext = ".jpg";
                break;
            case "image/gif":
                ext = ".gif";
                break;
            default:
                break;
        }
        if(ext.length != 0) // if one of the above, replace extension.
            filename = filename.substring(0, filename.lastIndexOf(".")) + ext;
        suggest({"filename": filename, conflictAction: "uniquify"});
    }
    else
        suggest(); // not for this extension, so ignore it
});

// should be used when wishing to push to the lists stored in this script.
function listPush(url, sampUrl)
{
    if(url == null || urls.indexOf(url) != -1 || url.length === 0) // avoid duplicates and nulls
        return;
    if(sampUrl == null)
        sampUrl = url;
    urls.push(url);
    sample_urls.push(sampUrl);
    urls_downloaded.push(false);
}

// called by some of the context menu options.
function addToList(info, tab) {
    var url;
    var type;
    if(info.menuItemId == con1) // image
    {
        url = info.srcUrl;
        listPush(url);
    }
    else if(info.menuItemId == con2) // link
    {
        url = info.linkUrl;
        listPush(url);
    }
}

function addFromThumbnails(info, tab) {
    // console.log(info);

    // send message to content script
    chrome.tabs.sendMessage(tab.id, 
            {"pageUrl": info.pageUrl,
            "query": "imagesOfThumbnails"},
            function(response) {
        if(response == null || response.arr == null)
            return;
        for(var i = 0; i < response.arr.length; i++)
        {
            listPush(response.arr[i], response.sampArr[i]);
        }
    });
}



// Tries to display the list in an alert to the user.
// alert has limits on what it can display, however.
function viewList(info, tab) {
    var aler = "";
    for(var i=0; i<urls.length; i++)
        aler = aler + "\n" + urls[i];

    alert(aler);
}


var scanningFlag = false;
var scanningSize = 0;
// toggles the scanning feature. Scanning is performed in content.js in load() if scanningFlag is set to <true>.
function toggleScanning() {
    if(scanningFlag)
        scanningFlag = false;
    else
    {
        scanningSize = prompt("min size of images in px?");
        if(scanningSize != null && scanningSize >= 0)
            scanningFlag = !scanningFlag;
        else // if failed, indicate so
            return false;
    }
    return true;
}

// returns an array of all urls of images above a size
// in current window, after adding them to the url list
function captureImages(callback) {
    var captureSize = prompt("min size of images in px?");
    var img = {};
    img.urls = [];
    if(captureSize != null && captureSize >= 0)
    {
        withTabsInCurrentWindow(function(tabArray) {
            var recvd = 0;
            for(var i = 0; i < tabArray.length; i++)
            {
                chrome.tabs.sendMessage(tabArray[i].id,
                        {"query": "urlsOfPageImagesGivenSize", "dimension": captureSize },
                        function(response) {
                    recvd++;

                    if(response != null && response.arr != null && response.arr.length != 0)
                    {
                        for(var i = 0; i < response.arr.length; i++)
                        {
                            listPush(response.arr[i]);
                            img.urls.push(response.arr[i]);
                        }
                    }
                    // console.log(recvd + "/" + tabArray.length);

                    if(recvd == tabArray.length) // finished processing all tabs
                    {
                        // console.log(callback);
                        // console.log(img);
                        callback(img);
                    }
                });
            }
        });
    }
}


// add all to list
function addEnclosed(these_urls) {
    for(var i = 0; i < these_urls.length; i++)
        listPush(these_urls[i]);
}


// used to keep track of downloading items. All items on this are canceled if stop downloads button is hit
var dlItems = [];

// downloads the list stored in this script.
function downloadList(info, tab) {
    stopDownloadsFlag = false;
    dlItems.length = 0;
    downloadHelper(urls, 0);
}

// same as above, but with the parameter as the list.
function downloadEnclosed(these_urls) {
    stopDownloadsFlag = false;
    dlItems.length = 0;
    downloadHelper(these_urls, 0);
}


// Boolean flag that lets user stop downloads (communicates to inside the callback in downloadHelper)
var stopDownloadsFlag = false;

function stopDownloads() {
    stopDownloadsFlag = true;
    for(var i = dlItems.length-1 ; i >= 0 ; i-- )
    {
        if(dlItems[i].state != "complete")
            chrome.downloads.cancel(dlItems[i]);
    }
}


// recursive helper. Downloads til the end, but does 1 at a time. Uses dlItems array to help if downloads
// need to be canceled.
function downloadHelper(dlist, filesDownloaded) {
    if(filesDownloaded == dlist.length)
        return;
    else
    {
        var dlurl = dlist[filesDownloaded];

        chrome.downloads.download({"url": dlurl,
                conflictAction : "uniquify"},
            function (dId) {
                if(stopDownloadsFlag)
                    chrome.downloads.cancel(dId);
                else
                {

                    if(dId == undefined) // if download fails, don't add to list of "successfully downloaded"
                    {
                        // maybe keep track of these, so we can download from <img>-made blobs
                        console.log("download failed: " + dlurl);
                    }
                    else
                    {
                        dlItems.push(dId);
                    }
                    downloadHelper(dlist, filesDownloaded+1)
                }
            }
        );
    }
}

chrome.downloads.onChanged.addListener(function (downloadDelta) {
    var id = downloadDelta.id;
    if (downloadDelta.state != null)
    {
        if(downloadDelta.state.current == "interrupted") {
            // send this back, so client can download via image copy?
        } else if(downloadDelta.state.current == "complete") {
            chrome.downloads.search({"id" : id}, function(itemArray) { // get download url
                if(itemArray.length == 1) {
                    var url = itemArray[0].url;
                    var index = urls.indexOf(url);
                    urls_downloaded[index] = true; // update own record of download

                    // tell Popup that that download finished.
                    chrome.runtime.sendMessage({"query" : "downloadFinished",
                            "url": url}); 
                }
            });
        }

    }
});



function clearList() {
    urls = [];
    sample_urls = [];
    urls_downloaded = [];
}

function inCurrentTab(callback) {
    chrome.tabs.query( {"active":true, "currentWindow":true}, function(tabArr){
        var tab = tabArr[0];
        callback(tabArr[0]);
    });
}

function withTabsInCurrentWindow(callback) {
    chrome.tabs.query( {"currentWindow":true}, function(tabArr){
        callback(tabArr);
    });
}


// receives messages from other scripts.
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        switch(request.query)
        {
            case "urlList":
                sendResponse({ "urls" : urls, 
                        "samples" : sample_urls, 
                        "download_status" : urls_downloaded,
                        "scanning" : scanningFlag});
                break;
            case "clearList":
                clearList();
                break;
            case "stopDownloads":
                stopDownloads();
                break;
            case "scanningFlag":
                sendResponse({ "scanning" : scanningFlag, "scanSize" : scanningSize });
                break;
            case "downloadEnclosed":
                if(request.urls != null)
                    downloadEnclosed(request.urls);
                break;
            case "addEnclosed":
                addEnclosed(request.arr);
                break;
            case "toggleScanning":
                sendResponse({ "success" : toggleScanning() });
                break;
            case "captureImages":
                captureImages(sendResponse);
                return true;
                break;
            default:
                break;
        }
    }
);


// listens for hotkeys
chrome.commands.onCommand.addListener(function (command) {
    if (command == 'saveImage') {
        inCurrentTab(function(tab){
            chrome.tabs.sendMessage(tab.id, {"query": "urlsOfPageImages"},
                                        function(response) {
                if(response == null || response.arr == null)
                    alert("response is null. Try again on an http(s) page.\nIf this is an http(s) page, try refreshing the extension.");
                else
                {
                    for(var i = 0; i < response.arr.length; i++)
                    {
                        listPush(response.arr[i]);
                    }
                }
            });
        });
    }        
});
      



var con1 = chrome.contextMenus.create({"title": "add image to list",
                                    "contexts": ["image"],
                                    "onclick": addToList });

var con2 = chrome.contextMenus.create({"title": "add link to list", "contexts":["link"],
                                   "onclick": addToList });

var con3 = chrome.contextMenus.create({"title": "view list", "contexts":["all"],
                                    "onclick": viewList})

var con4 = chrome.contextMenus.create({"title": "download all", "contexts":["all"],
                                    "onclick": downloadList})

var con5 = chrome.contextMenus.create({"title": "add all imgs from similar thumbnails", "contexts":["link"],
                                   "onclick": addFromThumbnails });

var con6 = chrome.contextMenus.create({"title": "clear list", "contexts":["all"],
                                   "onclick": clearList });

var con7 = chrome.contextMenus.create({"title": "Toggle Active Scanning", "contexts":["all"],
                                   "onclick": toggleScanning });


