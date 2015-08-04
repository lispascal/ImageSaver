


function showImages() {
    dispatchToBackgroundScript({"query": "urlList"}, function(response){
        $("#scanningCheckbox").prop("checked", response.scanning);
        $("#cleanDownloadCheckbox").prop("checked", response.cleanDL);

        for(var i = 0; i < response.samples.length; i++)
            addImage(response.urls[i], response.samples[i],
                    response.download_status[i]);


    });   
}

function addImage(url, sampUrl, dlStatus) {
    $("<img/>", {
        "src": extractURL(sampUrl),
        "name": extractURL(url),
        "class": (dlStatus ? "downloaded" : "" )
    }).appendTo(document.body);
}


function dispatchToBackgroundScript(message, callback) {
    chrome.runtime.sendMessage(message, callback);
}

function clearList(){
    dispatchToBackgroundScript({"query":"clearList"});
    var imgs = document.body.getElementsByTagName("img");
    for(var i = imgs.length-1 ; i >= 0; i--)
        imgs[i].parentNode.removeChild(imgs[i]);
}

function clearDownloaded(){
    var message = {"query" : "clearEnclosed", "urls" : []}
    var $dled = $(".downloaded");
    $dled.each(function (idx, ele) {
        message.urls.push(ele.name);
    });
    $dled.remove();

    dispatchToBackgroundScript(message);
}

function stopDownloads(){
    dispatchToBackgroundScript({"query" : "stopDownloads"});
}

function toggleScanning(){
    dispatchToBackgroundScript({"query" : "toggleScanning"}, function(response){
        $("#scanningCheckbox").prop("checked", response.result);
    });
}

function toggleCleanDownload(){
    dispatchToBackgroundScript({"query" : "toggleCleanDownload"});
}

function captureImages(){
    dispatchToBackgroundScript({"query" : "captureImages"}, function(response){
        // console.log("recvd:" + JSON.stringify(response));
        if(response == null || response.urls == null)
            return;
        // console.log(JSON.stringify(response.urls));
        for(var i = 0; i < response.urls.length; i++) {
            addImage(response.urls[i], response.urls[i], false);
        }
    });
}

function extractURL(url) {
    if(url.search("http") == 0)
        return url;
    else if(url.search("//") == 0)
        return "http://" + extractURL(url.slice(2));
    else
        return url;
}





// can be improved to do only a few downloads at a time, resulting in less network failures probably.
function download() {
    var message = {};
    message.urls = [];
    $(".download").each(function(i, element) {
        message.urls.push(element.name)
    });

    var yes = confirm("number of files downloading: " + message.urls.length);
    if(yes && message.urls.length != 0)
    {
        message.query = "downloadEnclosed";
        dispatchToBackgroundScript(message);
    }
}



document.addEventListener('DOMContentLoaded', function () {
    showImages();
});


document.addEventListener('click', function (event) {
    if(event.button != 0)
        return;
    var target = event.srcElement;

    // toggle if image should be downloaded
    if(target.hasAttribute("name") && target.tagName.toLowerCase() == "img")
        $(target).toggleClass("download");
    else if(target.hasAttribute("id")) { // check which button it is
        switch(target.getAttribute("id")) {
            case "downloadButton":
                download();
                break;
            case "clearListButton":
                clearList();
                break;
            case "clearDownloadedButton":
                clearDownloaded();
                break;
            case "stopDownloadsButton":
                stopDownloads();
                break;
            case "scanningCheckbox":
                toggleScanning();
                break;
            case "cleanDownloadCheckbox":
                toggleCleanDownload();
                break;
            case "captureButton":
                captureImages();
                break;
            case "selectAllButton":
                var list = document.body.getElementsByTagName("img");
                for (var i=0; i < list.length; i++)
                    list[i].setAttribute("class", "download");
                break;
            case "deSelectAllButton":
                var list = document.body.getElementsByTagName("img");
                for (i in list)
                {
                    if(list[i].hasAttribute("class"))
                       list[i].removeAttribute("class");
                }
                break;
            default:
                break;
        }
    }
});


// receives messages from other scripts.
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    switch(request.query)
    {
        case "downloadFinished":
            $("img[name='" + request.url + "']").addClass("downloaded");
            break;
        default:
            break;
    }
});
