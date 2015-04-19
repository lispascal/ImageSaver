var tar = null;

document.addEventListener("mousedown", function(event){
	if(event.button == 2 || event.button == 0)
		tar = event.srcElement;
}, true);

window.onload = load();

function load(){
	dispatchToBackgroundScript({"query": "scanningFlag"}, function(response){
		if(response.scanning) // then create list of all images, and send to list.
		{
			var size = response.scanSize;
			var list = document.getElementsByTagName("img");
			var message = {};

			message.query = "addEnclosed";
			
			message.arr = [];
			for(var i = 0; i < list.length; i++)
			{
				if (list[i].height >= size && list[i].width >= size)
					message.arr.push(list[i].src);
			}

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
 * Useful on certain websites. Requirement: the element 
 * that was right-clicked is a thumbnail that:
 * A) links to the full sized image, and
 * B) sits inside some element that has a class shared by all such thumbnails.
 *
 * If both of the above are true, then this function will return all images
 * from those links in an object, with the thumbnails as "samples"
 */
function getUrlsOfParentClass() {
	var cl = tar.parentElement.getAttribute("class");
	var list = document.getElementsByClassName(cl);
	
	var urlList = {};

	urlList.arr = [];
	urlList.sampArr = [];
	for(var i = 0; i < list.length; i++)
	{
		urlList.arr[i] = list[i].href;
		urlList.sampArr[i] = list[i].getElementsByTagName("img")[0].getAttribute("src");
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
		if(request.query == "urlsOfParentClass") // from bg.js
			sendResponse(getUrlsOfParentClass());
		else if(request.query === "urlsOfPageImages") // from bg.js
			sendResponse(getUrlsOfPageImages());
		else if(request.query === "urlsOfPageImagesGivenSize") // from bg.js
			sendResponse(getUrlsOfPageImagesGivenSize(request.dimension, false));

	}
);
