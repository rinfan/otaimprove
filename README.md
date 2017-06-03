# Usage
Lookup how to install a user script for your browser, some good resources :
* https://openuserjs.org/about/Userscript-Beginners-HOWTO

After you have installed the userscript manager addon for your browser click the install button at :
* https://openuserjs.org/scripts/rinfan/otaimprove


# Notes
This hasn't been tested very thoroughly for large numbers of hidden threads(or at all).  If it starts to seem like it doesn't work go to the Debug menu and click the button to clear the hidden threads and refresh the page.  If you find any bugs feel free to open an issue or let me know.


# Roadmap
In no particular order:
* One click report button (as if it even matters)
* One click report&hide (as if it even matters)
* Speedup for auto-hiding threads, and showing hide buttons
* Smart to auto-hide threads e.g. those opened with filenames "IMG_ISO8601...."(ex IMG_20170527_114951.jpg)
* Hide posts (left out because of performance worries)
* See if Infinite scroll is possible (not sure how possible this is)
* Fix back navigation requiring refresh
* Es6 import/exports instead of node shit. Was mildly more complicated and I don't know how to minify it and use it w/ jasmine-karma so I pushed it off.
