


function showImages() {
    dispatchToBackgroundScript({"query": "urlList"}, function(response){
        for(var i = 0; i < response.samples.length; i++)
            addImage(response.urls[i], response.samples[i],
                    response.download_status[i]);
        var scanButton = document.getElementById("scanningButton");
        if(response.scanning == true)
            scanButton.innerHTML = " Scanning: On ";
        else
            scanButton.innerHTML = " Scanning: Off ";
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

function stopDownloads(){
    dispatchToBackgroundScript({"query" : "stopDownloads"});
}

function toggleScanning(){
    dispatchToBackgroundScript({"query" : "toggleScanning"}, function(response){
        if(!response.success)
            return;
        $("#scanningButton").text(function(index, text) {
            return (text.indexOf("On") >= 0) ? " Scanning: Off " : " Scanning: On ";
        });     
    });
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
    // alert("url = " + url);

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

document.addEventListener('mousedown', function (event) {
    if(event.button != 0)
        return;
    var target = event.srcElement;

    // toggle if image should be downloaded
    if(target.hasAttribute("name") && target.tagName.toLowerCase() == "img")
        $(target).toggleClass("download");
    else if(target.hasAttribute("id") && target.getAttribute("id") == "downloadButton")
        download();
    else if(target.hasAttribute("id") && target.getAttribute("id") == "clearListButton")
        clearList();
    else if(target.hasAttribute("id") && target.getAttribute("id") == "stopDownloadsButton")
        stopDownloads();
    else if(target.hasAttribute("id") && target.getAttribute("id") == "scanningButton")
        toggleScanning();
    else if(target.hasAttribute("id") && target.getAttribute("id") == "captureButton")
        captureImages();
    else if(target.hasAttribute("id") && target.getAttribute("id") == "selectAllButton")
    {
        var list = document.body.getElementsByTagName("img");
        for (var i=0; i < list.length; i++)
            list[i].setAttribute("class", "download");
    }
    else if(target.hasAttribute("id") && target.getAttribute("id") == "deSelectAllButton")
    {
        var list = document.body.getElementsByTagName("img");
        for (i in list)
        {
            if(list[i].hasAttribute("class"))
               list[i].removeAttribute("class");
        }
    }
});


// receives messages from other scripts.
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    // console.log("in onmessage");
    switch(request.query)
    {
        case "downloadFinished":
            $("img[src='" + request.url + "']").addClass("downloaded");
            break;
        default:
            break;
    }
});
