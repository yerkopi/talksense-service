#!/bin/bash

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

source "$DIR/../.env"

git config --global --add safe.directory "$SERVICE_DIR"

sudo systemctl disable "$SERVICE_NAME"
systemctl stop "$SERVICE_NAME"

cp -f "$SERVICE_DIR/$SERVICE_NAME" "/lib/systemd/system/$SERVICE_NAME"

sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
sudo systemctl start "$SERVICE_NAME"
