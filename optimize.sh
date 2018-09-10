#!/bin/sh

set -e

idx="index.html"
stl="style.css"
fs="fs.js"
js="main.js"
min="main.min.js"
lrgfiles="$idx $stl $fs $js"
minfiles="$idx $stl $fs $min"

uglifyjs $js --warn --compress 'pure_funcs="rot2,kd,length"' | uglifyjs --mangle --output=$min

echo "Initial size: $(cat $lrgfiles | wc -c) bytes  ($js)"
echo "Minified size:$(cat $minfiles | wc -c) bytes  ($min)"
echo "Gzipped size: $(gzip -c $minfiles | wc -c) bytes"