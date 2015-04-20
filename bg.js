
var urls = [];
var sample_urls = [];

// should be used when wishing to push to the lists stored in this script.
function listPush(url, sampUrl)
{
    if(url == null || urls.indexOf(url) != -1) // avoid duplicates and nulls
        return;
    if(sampUrl == null)
        sampUrl = url;
    urls.push(url);
    sample_urls.push(sampUrl);
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
    console.log(info);

    // send message to content script
    chrome.tabs.sendMessage(tab.id, 
            {"pageUrl": info.pageUrl,
            "query": "urlsOfParentClass"},
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


// used to keep track of downloading items. All items on this are canceled if stop downloads button is hit
var dlItems = [];



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
                    console.log(recvd + "/" + tabArray.length);

                    if(recvd == tabArray.length) // finished processing all tabs
                    {
                        console.log(callback);
                        console.log(img);
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
        chrome.downloads.download({"url": dlurl, conflictAction : "uniquify"}, function dl(dId) {
            if(stopDownloadsFlag)
            {
                chrome.downloads.cancel(dId);
            } 
            else
            {
                dlItems.push(dId);
                downloadHelper(dlist, filesDownloaded+1)
            }
        });
    }
}


function clearList() {
    urls = [];
    sample_urls = [];
}

function inCurrentTab(callback) {
    chrome.tabs.query( {"active":true, "currentWindow":true}, function(tabArr){
        var tab = tabArr[0];
        callback(tab);
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
                sendResponse({ "urls" : urls, "samples" : sample_urls, "scanning" : scanningFlag});
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
                sendResponse({ "scanning" : toggleScanning() });
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
chrome.commands.onCommand.addListener(function(command) {
    if(command == 'saveImage')
    {
        inCurrentTab(function(tab){
            chrome.tabs.sendMessage(tab.id, {"query": "urlsOfPageImages"},
                                        function(response) {

//                alert("recvd: " + response.src);
                if(response == null || response.arr == null)
                    alert("response is null. Try again on an http(s) page");
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


