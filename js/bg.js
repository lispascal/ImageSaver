
var urls = [];
var sample_urls = [];
var urls_downloaded = [];


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
}

function addFromThumbnails(info, tab) {
    // console.log(info);

    // send message to content script
    chrome.tabs.sendMessage(tab.id, 
            {"pageUrl": info.pageUrl,
            "query": "imagesOfThumbnails",
            "tabId": tab.id},
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

var cleanDownloadFlag = false;
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
            scanningFlag = true;
    }
    return scanningFlag;
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
                var tabId = tabArray[i].id;
                chrome.tabs.sendMessage(tabId,
                        {"query": "urlsOfPageImagesGivenSize", "dimension": captureSize, "tabId": tabId },
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
        var state = downloadDelta.state.current;
        if(state == "complete" || state == "interrupted") {
            var isSuccessful = (state == "complete" ? true : false);
            chrome.downloads.search({"id" : id}, function(itemArray) { // get download url
                if(itemArray.length == 1) { // sanity
                    var url = itemArray[0].url;
                    var index = urls.indexOf(url);
                    urls_downloaded[index] = isSuccessful; // update own record of download

                    // tell Popup that that download finished.
                    chrome.runtime.sendMessage({"query" : "downloadEnded",
                            "success" : isSuccessful,
                            "url": url}); 

                    // inserted here because it needs to be done AFTER the item is looked at for url
                    if(cleanDownloadFlag)
                        chrome.downloads.erase({"id" : id});
                }
            });
        }

    }
});

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


function clearList() {
    urls = [];
    sample_urls = [];
    urls_downloaded = [];
}

// add all to list
function clearEnclosed(these_urls) {
    for(var i = 0; i < these_urls.length; i++)
    {
        var index = urls.indexOf(these_urls[i]);
        urls.splice(index, 1);
        sample_urls.splice(index, 1);
        urls_downloaded.splice(index, 1);
    }
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
                        "scanning" : scanningFlag,
                        "cleanDL" : cleanDownloadFlag});
                break;
            case "clearList":
                clearList();
                break;
            case "clearEnclosed":
                clearEnclosed(request.urls);
                break;
            case "stopDownloads":
                stopDownloads();
                break;
            case "scanningFlagAndTabId":
                sendResponse({ "scanning" : scanningFlag, "scanSize" : scanningSize, "tabId": sender.tab.id });
                break;
            case "downloadEnclosed":
                if(request.urls != null)
                    downloadEnclosed(request.urls);
                break;
            case "addEnclosed":
                addEnclosed(request.arr);
                break;
            case "toggleScanning":
                sendResponse({ "result" : toggleScanning() });
                break;
            case "toggleCleanDownload":
                cleanDownloadFlag = !cleanDownloadFlag;
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
    switch(command){
        case 'saveImage':
            inCurrentTab(function(tab){
                chrome.tabs.sendMessage(tab.id, {"query": "urlsOfPageImages", "tabId": tab.id},
                                            function(response) {
                    if(response.error === "NoImageError")
                        console.log("No images detected on page.")
                    else if(response.error === "PromptCanceledError")
                        console.log("saveImage command's dimension prompt was canceled");
                    else { // if no errors, a list of image(s) was served
                        for(var i = 0; i < response.arr.length; i++)
                            listPush(response.arr[i]);
                    }
                });
            });
            break;
        case 'viewBiggestImage':
            inCurrentTab(function(tab){
                chrome.tabs.sendMessage(tab.id, {"query": "viewBiggestImage", "tabId":tab.id});
            });
            break;
        default:
            break;
    }        
});
      



var con1 = chrome.contextMenus.create({"title": "add image to list",
                                    "contexts": ["image"],
                                    "onclick": addToList });

var con2 = chrome.contextMenus.create({"title": "add all imgs from similar thumbnails", "contexts":["link"],
                                   "onclick": addFromThumbnails });
