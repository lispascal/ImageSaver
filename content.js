
// holds last targetted element
var tar = null;
document.addEventListener("mousedown", function(event){
    if(event.button == 2 || event.button == 0)
        tar = event.srcElement;
}, true);

// window.onload = load();
$(document).ready(function() {
    load();
});

function load(){
    dispatchToBackgroundScript({"query": "scanningFlag"}, function(response){
        if(response.scanning) // then create list of all images, and send to list.
        {
            var size = response.scanSize;
            var message = {};

            message.query = "addEnclosed";
            
            message.arr = [];
            $("img").each(function (i, obj){
                if(obj.height >= size && obj.width >= size)
                    message.arr.push(obj);
            });

            if(message.arr.length == 0) // don't send a blank list.
                return;
            dispatchToBackgroundScript(message);
        }
    });
}

function dispatchToBackgroundScript(message, callback) {
    chrome.runtime.sendMessage(message, callback);
}



/** Adds all images thumbnailed on this site to the list.
 *
 * Useful on specific websites: imgur, deviantArt, 4chan, more to come
 */
function getImagesOfThumbnails(request) {
    var list;

    var urlList = {};
    urlList.arr = [];
    urlList.sampArr = [];

    if(request.pageUrl.indexOf("http://imgur.com/") == 0){
        // imgur sidebar.
        if(tar.getAttribute("class").indexOf("nav-link") >= 0)
        {
            list = document.getElementsByClassName("nav-link");
            for(var i = 0; i < list.length; i++)
            {
                var id = list[i].dataset.hash;
                var isAlbum = id.length <= 6; // this is a hack. ablums are usually 5 characters, images 7
                if(isAlbum)
                    continue;
                var url = "http://i.imgur.com/" + id + ".jpg";
                var sampUrl = "http://i.imgur.com/" + id + "b.jpg";

                urlList.arr.push(url);
                urlList.sampArr.push(sampUrl);
            }
        }
        else // imgur main
        {
            list = document.getElementsByClassName("post");
            if(list != null && list.length >= 0)
            {
                for(var i = 0; i < list.length; i++)
                {
                    var id = list[i].id;
                    var isAlbum = list[i].querySelector(".post-info").innerHTML.indexOf("album") > 0;
                    if(isAlbum)
                        continue;
                    var isAnimated = list[i].querySelector(".post-info").innerHTML.indexOf("animated") > 0;
                    var urlEnd = isAnimated ? ".gif" : ".jpg";
                    var url = "http://i.imgur.com/" + id + urlEnd;

                    var sampUrl = list[i].querySelector("img").src;

                    urlList.arr.push(url);
                    urlList.sampArr.push(sampUrl);
                }
            }
        }
    }
    else if(request.pageUrl.indexOf("deviantart.com/") >= 0){
        list = document.getElementsByClassName("thumb");
        for(var i = 0; i < list.length; i++)
        {
            var url = list[i].dataset.superImg;
            var sampUrl = list[i].querySelector("img").src;

            urlList.arr.push(url);
            urlList.sampArr.push(sampUrl);
        }
    }
    else if(request.pageUrl.indexOf("4chan.org") >= 0) {
        $(".fileThumb").each(function(index, obj){
            urlList.arr.push(obj.href);
            urlList.sampArr.push($(obj).children("img").eq(0).prop("src"));
        });
    }
    else
    {

    }
    return urlList;
}


// Grabs the only image on page if only one. Otherwise, grabs all images above a prompted size.
function getUrlsOfPageImages() {    
    var list = document.body.getElementsByTagName("img");

    if(list.length > 1) 
    {
        var size = prompt("Minimum size of images (in px) to add to list:");
        if(size != null)
            return getUrlsOfPageImagesGivenSize(size, true);
    }
    else if(list.length == 1)
    {
        var response = {};
        response.arr = [];

        for(var i = 0; i < list.length; i++)
        {
            list[i].style.border = "2px solid red";
            response.arr.push(list[i].src);
        }

        return response;
    }
    // if they canceled on prompt, or 0 images
    return null;
}

// Grabs the only image on page if only one. Otherwise, grabs all images above a prompted size.
function getUrlsOfPageImagesGivenSize(dim, markRed) {
    var response = {};
    response.arr = [];
    
    var list = document.body.getElementsByTagName("img");
    for(var i = 0; i < list.length; i++)
    {
        if (list[i].height >= dim && list[i].width >= dim)
        {
            if(markRed)
                list[i].style.border = "2px solid red";
            response.arr.push(list[i].src);
        }
    }
    
    return response;
}

//receives messages from other scripts.
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        // console.log(request);
        if(request.query == "imagesOfThumbnails") // from bg.js
            sendResponse(getImagesOfThumbnails(request));
        else if(request.query === "urlsOfPageImages") // from bg.js
            sendResponse(getUrlsOfPageImages());
        else if(request.query === "urlsOfPageImagesGivenSize") // from bg.js
            sendResponse(getUrlsOfPageImagesGivenSize(request.dimension, false));

    }
);
