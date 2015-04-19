# ImageSaver
Chrome extension for downloading images
* This extension allows you to save images from your browser in bulk.

# How it works
ImageSaver maintains a list of image urls in background.js, and the user can interact with that list via the
context (right-click) menu, or by using the browser action (the little button at the top right of their browser).

ImageSaver allows a user to:
* Passively scan pages for images to add to the list, filtered by their dimensions.
* Capture images from all open tabs in the current window, filtered by their dimensions.
* Add images to the list from the current tab with the use of a hotkey (default ctrl+shift+s).
* On certain sites, add all images that have thumbnails on the current page.
