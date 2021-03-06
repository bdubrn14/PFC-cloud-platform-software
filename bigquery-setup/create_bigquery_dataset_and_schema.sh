#!/bin/bash

if [[ -z "${TOP_DIR}" ]]; then
  echo "ERROR: gcloud_env.bash has not been sourced."
  exit 1
fi
source $TOP_DIR/bigquery-setup/bq_env.bash

#------------------------------------------------------------------------------
# Create all (data) datasets.
DSCOUNT=${#DATASETS[@]}
let DSCOUNT-=1
for N in `seq 0 $DSCOUNT`; do
  DS=${DATASETS[ $N ]}
  DESC=${DATASET_DESCS[ $N ]}
  mk_dataset $DS "$DESC"
  if [ $? -eq 1 ]; then
    echo "Exiting script."
    exit 1
  fi

  # Create all DATA tables for the DATA dataset. (diff tables for webui)
  TCOUNT=${#DATA_TABLES[@]}
  let TCOUNT-=1
  for T in `seq 0 $TCOUNT`; do
    TBL=${DATA_TABLES[ $T ]}
    DESC=${DATA_TABLE_DESCS[ $T ]}
    mk_schema $DS $TBL "$DESC" 
    if [ $? -eq 1 ]; then
      echo "Exiting script."
      exit 1
    fi
  done
done

#------------------------------------------------------------------------------
# Create the webui dataset. (it has different tables than the others)
mk_dataset $WEBUI_DS "$WEBUI_DS_DESC"
if [ $? -eq 1 ]; then
  echo "Exiting script."
  exit 1
fi

# Create all webui tables in this dataset.
TCOUNT=${#UI_TABLES[@]}
let TCOUNT-=1
for T in `seq 0 $TCOUNT`; do
  TBL=${UI_TABLES[ $T ]}
  DESC=${UI_TABLE_DESCS[ $T ]}
  mk_schema $WEBUI_DS $TBL "$DESC" 
  if [ $? -eq 1 ]; then
    echo "Exiting script."
    exit 1
  fi
done

