#!/bin/bash

# Set up the python 3 virtual env. 

# Deactivate any current python virtual environment we may be running
if ! [ -z "${VIRTUAL_ENV}" ] ; then
    deactivate
fi

#sudo pip install --upgrade pip
#sudo pip install --upgrade virtualenv

rm -fr pyenv
python3.6 -m venv pyenv
source pyenv/bin/activate

pip install --upgrade google-cloud-pubsub
pip install --upgrade google-cloud-bigquery
pip install --upgrade google-cloud-datastore
pip install --upgrade google-cloud-storage

deactivate

