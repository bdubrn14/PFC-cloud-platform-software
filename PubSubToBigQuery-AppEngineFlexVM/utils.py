#!/usr/bin/env python

""" This file contains some utilities used for processing tweet data and writing
data to BigQuery
"""

import collections
import datetime
import time

from apiclient import discovery
import dateutil.parser
import httplib2
from oauth2client.client import GoogleCredentials

SCOPES = ['https://www.googleapis.com/auth/bigquery',
          'https://www.googleapis.com/auth/pubsub']
NUM_RETRIES = 3



def get_credentials():
    """Get the Google credentials needed to access our services."""
    credentials = GoogleCredentials.get_application_default()
    if credentials.create_scoped_required():
            credentials = credentials.create_scoped(SCOPES)
    return credentials


def create_bigquery_client(credentials):
    """Build the bigquery client."""
    http = httplib2.Http()
    credentials.authorize(http)
    return discovery.build('bigquery', 'v2', http=http)


def create_pubsub_client(credentials):
    """Build the pubsub client."""
    http = httplib2.Http()
    credentials.authorize(http)
    return discovery.build('pubsub', 'v1beta2', http=http)


def flatten(lst):
    """Helper function used to massage the raw tweet data."""
    for el in lst:
        if (isinstance(el, collections.Iterable) and
                not isinstance(el, basestring)):
            for sub in flatten(el):
                yield sub
        else:
            yield el


def cleanup(data):
    """Do some data massaging."""
    if isinstance(data, dict):
        newdict = {}
        for k, v in data.items():
            if (k == 'coordinates') and isinstance(v, list):
                # flatten list
                newdict[k] = list(flatten(v))
            elif k == 'created_at' and v:
                newdict[k] = str(dateutil.parser.parse(v))
            # temporarily, ignore some fields not supported by the
            # current BQ schema.
            # TODO: update BigQuery schema
            elif (k == 'video_info' or k == 'scopes' or k == 'withheld_in_countries'
                  or k == 'is_quote_status' or 'source_user_id' in k
                  or 'quoted_status' in k or 'display_text_range' in k or 'extended_tweet' in k):
                pass
            elif v is False:
                newdict[k] = v
            else:
                if k and v:
                    newdict[k] = cleanup(v)
        return newdict
    elif isinstance(data, list):
        newlist = []
        for item in data:
            newdata = cleanup(item)
            if newdata:
                newlist.append(newdata)
        return newlist
    else:
        return data


def bq_data_insert(bigquery, project_id, dataset, table, tweets):
    """Insert a list of tweets into the given BigQuery table."""
    try:
        rowlist = []
        # Generate the data that will be sent to BigQuery
        for item in tweets:
            item_row = {"json": item}
            rowlist.append(item_row)
        body = {"rows": rowlist}
        # Try the insertion.
        response = bigquery.tabledata().insertAll(
                projectId=project_id, datasetId=dataset,
                tableId=table, body=body).execute(num_retries=NUM_RETRIES)
#debugrob: 
        print( "bq streaming response: %s %s" % (datetime.datetime.now(), response))
        return response
        #debugrob TODO: 'invalid field' errors can be detected here.
    except Exception as e:
        print( "Giving up: %s" % e )


