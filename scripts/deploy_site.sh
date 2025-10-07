#!/bin/bash
set -e

rsync -rav src/assets/website.html root@rocky:/data/stacks/web/websites/tocry.ralsina.me/index.html
rsync -rav src/assets/favicon.ico screenshot.png src/assets/*.css install.sh root@rocky:/data/stacks/web/websites/tocry.ralsina.me/
