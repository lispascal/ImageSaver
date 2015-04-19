


function showImages() {
    dispatchToBackgroundScript({"query": "urlList"}, function(response){
        for(var i in response.samples)
        {
            var img = new Image();
            img.src = extractURL(response.samples[i]);
            img.setAttribute("name", response.urls[i] );
            img.setAttribute("id", i);
            document.body.appendChild(img);
        }
        var scanButton = document.getElementById("scanningButton");
        if(response.scanning == true)
            scanButton.innerHTML = " Scanning: On ";
        else
            scanButton.innerHTML = " Scanning: Off ";
    });   
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
        if(!response.scanning)
            return;
        var scanButton = document.getElementById("scanningButton");
        if(scanButton.innerHTML.indexOf("On") >= 0)
            scanButton.innerHTML = " Scanning: Off ";
        else
            scanButton.innerHTML = " Scanning: On ";        
    });
}

function captureImages(){
    dispatchToBackgroundScript({"query" : "captureImages"}, function(response){
        // console.log("recvd:" + JSON.stringify(response));
        console.log("recvd message:")
        if(response == null || response.urls == null)
            return;
        console.log(JSON.stringify(response.urls));
        for(var i = 0; i < response.urls.length; i++) {
            var img = new Image();
            console.log(response.urls[i]);
            img.src = response.urls[i];
            img.setAttribute("name", response.urls[i] );
            // img.setAttribute("id", i);
            document.body.appendChild(img);
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
	var arr = document.body.getElementsByClassName("download");
	for(var i=0; i < arr.length; i++)
		message.urls.push(arr[i].name);
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
    {
        //foo(target.getAttribute("name"));
        if(!target.hasAttribute("class"))
            target.setAttribute("class", "download");
        else
            target.removeAttribute("class");
    }   
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
        for (i in list)
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


