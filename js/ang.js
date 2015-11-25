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

    // dispatch to background script asking for the image list
    dispatchToBackgroundScript({"query": "urlList"}, function(response){
        $("#scanningCheckbox").prop("checked", response.scanning);
        $("#cleanDownloadCheckbox").prop("checked", response.cleanDL);
        $scope.$apply(function() {
            for(var i = response.samples.length - 1; i >= 0; i--){
                var urlsplit = response.urls[i].split('/');
                var ob = {
                    "url": response.urls[i],
                    "sample": response.samples[i],
                    "downloadStatus": response.download_status[i],
                    "name": urlsplit[urlsplit.length-1]
                };
                $scope.images.push(ob);
            }
        });
        
    });   

})