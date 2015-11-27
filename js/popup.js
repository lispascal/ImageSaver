var failedClass = "failed";
var toDownloadClass = "download";



function dispatchToBackgroundScript(message, callback) {
    chrome.runtime.sendMessage(message, callback);
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

function extractURL(url) {
    if(url.search("http") == 0)
        return url;
    else if(url.search("//") == 0)
        return "http://" + extractURL(url.slice(2));
    else
        return url;
}

function download() {
    var message = {};
    message.urls = [];
    $("." + toDownloadClass).each(function(i, element) {
        message.urls.push(element.dataset.origSrc)
    });

    var yes = confirm("number of files downloading: " + message.urls.length);
    if(yes && message.urls.length != 0)
    {
        message.query = "downloadEnclosed";
        dispatchToBackgroundScript(message);
    }
}

function copySaveImagesButton() {
    var message = {};
    message.urls = [];
    $("." + failedClass).each(function(i, element) {
        if ($(element).data("loaded")){
            console.log("w:" + element.naturalWidth);
            console.log("h:" + element.naturalHeight);
            var canvas = $("<canvas/>")[0];
            canvas.width =  element.naturalWidth;
            canvas.height = element.naturalHeight;
            var ctx = canvas.getContext("2d");
            ctx.drawImage(element, 0, 0);
            message.urls.push(canvas.toDataURL());
        }
        // message.urls.push(element.name)
    });

    var yes = confirm("number of files downloading: " + message.urls.length);
    if(yes && message.urls.length != 0)
    {
        message.query = "downloadEnclosed";
        dispatchToBackgroundScript(message);
    }
}

document.addEventListener('click', function (event) {
    if(event.button != 0)
        return;
    var target = event.srcElement;

    if(target.hasAttribute("id")) { // check which button it is
        switch(target.getAttribute("id")) {
            case "downloadButton":
                download();
                break;
            case "copySaveImagesButton":
                copySaveImagesButton();
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
            default:
                break;
        }
    }
});

var $scope = null; 
// receives messages from other scripts.
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    switch(request.query)
    {
        case "downloadEnded":
            if ($scope==null)
                $scope = angular.element(document.body).scope();
            $scope.$apply($scope.downloadEnd(request.url, request.success));
            break;
        default:
            break;
    }
});
