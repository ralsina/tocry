#!/bin/bash
if command -v ameba >/dev/null 2>&1; then
	ameba
else
	echo "ameba not installed, skipping lint"
fi
