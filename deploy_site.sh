#!/bin/bash
set -e

rsync -rav website.html rocky:/data/stacks/web/websites/tocry.ralsina.me/index.html
rsync -rav src/assets/favicon.ico screenshot.png rocky:/data/stacks/web/websites/tocry.ralsina.me/favicon.ico
