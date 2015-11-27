var imageSaverApp = angular.module('imageSaverApp' , []);

imageSaverApp.directive('loadcheck', function() {
    return {
        link: function(scope, element) {
            element.bind("load", function(e) {
                $(element).data("loaded", true);
            });
        }
    };
})

imageSaverApp.controller('imageListCtrl', function($scope) {
    $scope.images = [];
    // Selects all the images
    $scope.selectAll = function () {
        for( var i = 0; i < $scope.images.length; i++)
            $scope.images[i].selectedStatus = true;
    }
    // Unselects all the images
    $scope.unselectAll = function() {
        for( var i = 0; i < $scope.images.length; i++)
            $scope.images[i].selectedStatus = false;
    }
    // Clears the images from the list
    $scope.clearList = function() {
        dispatchToBackgroundScript({"query":"clearList"});
        $scope.images = [];
    }
    // Clears successfully downloaded images from list
    $scope.clearDLed = function (){
        var message = {"query" : "clearEnclosed", "urls" : []};
        $scope.images.forEach(function(ele, idx, arr) {
            if (ele.downloaded) {
                message.urls.push(ele.url)
            }
        });
        // tell bg script to remove enclosed list
        dispatchToBackgroundScript(message);
        
        // set images list to be all the images that weren't downloaded
        // equivalent to removing all downloaded images from list
        $scope.images = $scope.images.filter(function(ele, idx, arr) {
            return !ele.downloaded;
        })
    }
    // Indicates whether a download was successful
    $scope.downloadEnd = function(url, success){
        var which = $scope.images.findIndex(function (ele, ind, arr) {
            return ele.url === url;
        });
        $scope.images[which].downloaded = success;
        $scope.images[which].failed = !success;
    }
    // Captures all images in window above prompted size and adds them to list
    $scope.captureImages = function() {
        dispatchToBackgroundScript({"query" : "captureImages"}, function(response){
            if(response == null || response.urls == null)
                return;
            for(var i = 0; i < response.urls.length; i++) {
                $scope.addImage(response.urls[i], response.urls[i], false);
            }
        });
    }
    // Adds image to the model for the popup page,
    // unless there is already an image with the same url.
    $scope.addImage = function(url, sample, downloadedFlag) {
        var indexOfClone = $scope.images.findIndex(function(ele, ind, arr) {
            return ele.url === url;
        });
        if(indexOfClone !== -1) //if such an element exists
            return;
        // otherwise, create it
        $scope.$apply(function () {
            var urlsplit = url.split('/');
            var ob = {
                "url": url,
                "sample": sample,
                "failed": false,
                "downloaded": downloadedFlag,
                "selectedStatus": false,
                "name": urlsplit[urlsplit.length-1] // last /-separated section of the image url
            };
            $scope.images.push(ob);
        });
    }

    // dispatch to background script asking for the image list
    dispatchToBackgroundScript({"query": "urlList"}, function(response){
        $("#scanningCheckbox").prop("checked", response.scanning);
        $("#cleanDownloadCheckbox").prop("checked", response.cleanDL);
        for(var i = response.samples.length - 1; i >= 0; i--)
            $scope.addImage(response.urls[i], response.samples[i], response.download_status[i]);
        
    });

});