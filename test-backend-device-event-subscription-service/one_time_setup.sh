#!/bin/bash

# Set up the python 3 virtual env. 

# Deactivate any current python virtual environment we may be running
if ! [ -z "${VIRTUAL_ENV}" ] ; then
    deactivate
fi

#sudo pip install --upgrade pip
#sudo pip install --upgrade virtualenv
virtualenv --python python3 pubsub_env
source pubsub_env/bin/activate
pip install --upgrade google-cloud-pubsub
deactivate
