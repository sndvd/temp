#!/bin/bash
cd /home/team/shared/craig-grammar-studio
rm -rf dist
npx vite build 2>&1
echo "BUILD COMPLETE"
grep '<title>' dist/index.html
grep 'Grammer' dist/index.html | head -3
ls dist/images/painting-*.jpg | wc -l