#!/bin/bash

systemctl daemon-reload
git pull
git stash
git stash clear
npm install -f
