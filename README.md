# Usage
* Download tampermonkey/greasemonkey or whatever the userscript manager is for your browser
* Click on the addon and select new user script
  * Firefox only: When Greasemonkey prompts you to enter information just fill in the fields with anything
* Copy the contents of [otaimproved.js](~/fixme/otaimproved.js) overwriting whatever is in there.
* Make sure it's enabled for the current site, and it should work.


# Notes
This hasn't been tested very thoroughly for large numbers of hidden threads.  If it starts to seem like it doesn't work go to the Debug menu and click the button to clear the hidden threads and refresh the page.  If you find any bugs feel free to open an issue or whatever.


# Roadmap
In no particular order:
* One click report button (as if it even matters)
* One click report&hide (as if it even matters)
* Speedup for auto-hiding threads, and showing hide buttons
* Smart to auto-hide threads e.g. those opened with filenames "IMG_ISO8601...."(ex IMG_20170527_114951.jpg)
* Hide posts (left out because of performance worries)
