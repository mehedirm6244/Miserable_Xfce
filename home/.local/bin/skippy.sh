#!/bin/bash

if pidof skippy-xd ; then
	pkill skippy-xd
else
	skippy-xd
fi