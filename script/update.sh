#!/bin/bash

git pull
git stash
git stash clear
npm install -f
