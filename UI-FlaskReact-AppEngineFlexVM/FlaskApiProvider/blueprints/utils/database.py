# All common database code.  For BigQuery and Datastore.

import ast
from google.cloud import bigquery

# Eventually we won't query BigQuery because it is so slow.  
# Perhaps someday we will use it again for a research console that 
# uses a lot of historical data.
# This should be the only place we use queries.
from queries import queries

from .env_variables import bigquery_client
from .datastore import get_one, get_by_key

# keys for datastore DeviceData entity
DS_device_data_KEY = 'DeviceData'
DS_device_uuid_KEY = 'device_uuid'
DS_co2_KEY = 'air_carbon_dioxide_ppm'
DS_rh_KEY = 'air_humidity_percent'
DS_temp_misspelled_KEY = 'air_temperature_celcius'
DS_temp_KEY = 'air_temperature_celsius' 
DS_led_KEY = 'light_spectrum_nm_percent'
# for fermentabot
DS_top_h2o_temp_KEY = 'top_tray_temperature_celsius' 
DS_middle_h2o_temp_KEY = 'middle_tray_temperature_celsius' 
DS_bottom_h2o_temp_KEY = 'bottom_tray_temperature_celsius' 
# TODO: write getter funcs for the 4 below (currently not used)
DS_led_dist_KEY = 'light_illumination_distance_cm'
DS_led_intensity_KEY = 'light_intensity_watts'
DS_boot_KEY = 'boot'
DS_status_KEY = 'status'  


# NOTE: The XX_from_BQ() methods are only used if there is no data found
# in the Datastore.   Eventually we will phase out the BQ functions (slow).


# ------------------------------------------------------------------------------
# Get the historical CO2 values for this device.  
# Returns a list.
def get_co2_history_from_BQ(device_uuid):
    if device_uuid is None or device_uuid is 'None':
        return []
    job_config = bigquery.QueryJobConfig()
    job_config.use_legacy_sql = False

    query_str = queries.formatQuery(
        queries.fetch_co2_results_history, device_uuid)

    query_job = bigquery_client.query(query_str, job_config=job_config)
    query_result = query_job.result()
    results = []
    for row in list(query_result):
        values_json = (ast.literal_eval(row[1]))
        if "values" in values_json:
            values = values_json["values"]
            results.append({'value': values[0]['value'],
                            'time': row.eastern_time})
    return results


# ------------------------------------------------------------------------------
# Generic function to return a float value from BQ for the given query.
# Returns a float or None.
def get_current_float_value_from_BQ(query, device_uuid):
    if device_uuid is None or device_uuid is 'None':
        return None
    # Use a NEW QueryJobConfig for each query, or you will get  this error: 
    # google.api_core.exceptions.BadRequest: 
    # 400 Cannot explicitly modify anonymous table
    job_config = bigquery.QueryJobConfig()
    job_config.use_legacy_sql = False
    query_str = queries.formatQuery(query, device_uuid)
    query_job = bigquery_client.query(query_str, job_config=job_config)
    query_result = query_job.result()
    for row in list(query_result):
        values_json = (ast.literal_eval(row[1]))
        if "values" in values_json:
            values = values_json["values"]
            return "{0:.2f}".format(float(values[0]['value']))
    return None  # no data


# ------------------------------------------------------------------------------
# Get a list of the led panel historical values.
# Returns a list.
def get_led_panel_history_from_BQ(device_uuid):
    if device_uuid is None or device_uuid is 'None':
        return []
    job_config = bigquery.QueryJobConfig()
    job_config.use_legacy_sql = False
    query_str = queries.formatQuery(
        queries.fetch_led_panel_history, device_uuid)
    query_job = bigquery_client.query(query_str, job_config=job_config)
    query_result = query_job.result()
    result_json = []
    for row in list(query_result):
        values_json = ast.literal_eval(row[1])
        if "values" in values_json:
            values = values_json["values"]
            if len(values) > 0:
                led_json = values[0]['value']
                result_json.append(led_json)
    return result_json


# ------------------------------------------------------------------------------
# Get device data status
def get_device_data_from_DS(device_uuid):
    if device_uuid is None or device_uuid is 'None':
        return None

    device_data = get_by_key(DS_device_data_KEY, device_uuid)
    if device_data is None:
        return None


    air_temperature_celcius = device_data.get("air_temperature_celcius", [{}])[0].get("value", '')
    status = device_data.get("status", [None])[0]

    result_json = {
        "timestamp": status.get("timestamp", ""),
        "percent_complete": status.get("recipe_percent_complete_string", ""),
        "time_elapsed": status.get("recipe_time_elapsed_string", ""),
        "device_status": status.get("status", ""),
        "air_temp": air_temperature_celcius
    }
    return result_json


# ------------------------------------------------------------------------------
# Get a dict with two arrays of the temp and humidity historical values.
# Returns a dict.
def get_temp_and_humidity_history_from_BQ(device_uuid):
    humidity_array = []
    temp_array = []
    result_json = {
        'RH': humidity_array,
        'temp': temp_array
    }
    if device_uuid is None or device_uuid is 'None':
        return result_json

    job_config = bigquery.QueryJobConfig()
    job_config.use_legacy_sql = False
    query_str = queries.formatQuery(
        queries.fetch_temp_results_history, device_uuid)
    query_job = bigquery_client.query(query_str, job_config=job_config)
    query_result = query_job.result()
    for row in list(query_result):
        rvalues = row[2]  # can't use row.values
        values_json = (ast.literal_eval(rvalues))

        if 'air_temperature_celcius' == row.var and 'values' in values_json:
            values = values_json["values"]
            result_json["temp"].append(
                {'value': values[0]['value'], 'time': row.eastern_time})

        if 'air_humidity_percent' == row.var and 'values' in values_json:
            values = values_json["values"]
            result_json["RH"].append(
                {'value': values[0]['value'], 'time': row.eastern_time})
    return result_json


# ------------------------------------------------------------------------------
def _bytes_to_string(bs):
    if isinstance(bs, bytes):
        bs = bs.decode('utf-8')
    return bs


# ------------------------------------------------------------------------------
# Get the historical CO2 values for this device.  
# Returns a list.
def get_co2_history(device_uuid):
    if device_uuid is None or device_uuid is 'None':
        return []

    # First, try to get the data from the datastore...
    device_data = get_by_key(DS_device_data_KEY, device_uuid)
    if device_data is None or DS_co2_KEY not in device_data:
        # If we didn't find any data in the DS, look in BQ...
        return get_co2_history_from_BQ(device_uuid)

    # process the vars list from the DS into the same format as BQ
    results = []
    valuesList = device_data[DS_co2_KEY]
    for val in valuesList:
        ts = _bytes_to_string(val['timestamp'])
        value = _bytes_to_string(val['value'])
        results.append({'value': value, 'time': ts})
    return results



# ------------------------------------------------------------------------------
# Get a list of the led panel historical values.
# Returns a list.
def get_led_panel_history(device_uuid):
    if device_uuid is None or device_uuid is 'None':
        return []

    # First, try to get the data from the datastore...
    device_data = get_by_key(DS_device_data_KEY, device_uuid)
    if device_data is None or DS_led_KEY not in device_data:
        # If we didn't find any data in the DS, look in BQ...
        return get_led_panel_history_from_BQ(device_uuid)

    # process the vars list from the DS into the same format as BQ
    results = []
    valuesList = device_data[DS_led_KEY]
    for val in valuesList:
        led_json = _bytes_to_string(val['value'])
        results.append(led_json)
    return results


# ------------------------------------------------------------------------------
# Get a dict with two arrays of the temp and humidity historical values.
# Returns a dict.
def get_temp_and_humidity_history(device_uuid):
    humidity_array = []
    temp_array = []
    top_h20_temp_array = []
    middle_h20_temp_array = []
    bottom_h20_temp_array = []
    result_json = {
        'RH': humidity_array,
        'temp': temp_array,
        'top_h2o_temp': top_h20_temp_array,
        'middle_h2o_temp': middle_h20_temp_array,
        'bottom_h2o_temp': bottom_h20_temp_array,
    }
    if device_uuid is None or device_uuid is 'None':
        return result_json

    # First, try to get the data from the datastore...
    device_data = get_by_key(DS_device_data_KEY, device_uuid)
    if device_data is None or \
            ((DS_temp_KEY not in device_data or \
              DS_temp_misspelled_KEY not in device_data) and \
             DS_rh_KEY not in device_data):
        # If we didn't find any data in the DS, look in BQ...
        return get_temp_and_humidity_history_from_BQ(device_uuid)

    # process the vars list from the DS into the same format as BQ

    # Get temp values
    if DS_temp_KEY in device_data:
        valuesList = device_data[DS_temp_KEY]
        for val in valuesList:
            ts = _bytes_to_string(val['timestamp'])
            value = _bytes_to_string(val['value'])
            result_json["temp"].append({'value': value, 'time': ts})
    elif DS_temp_misspelled_KEY in device_data:
        valuesList = device_data[DS_temp_misspelled_KEY]
        for val in valuesList:
            ts = _bytes_to_string(val['timestamp'])
            value = _bytes_to_string(val['value'])
            result_json["temp"].append({'value': value, 'time': ts})

    # Get RH values
    if DS_rh_KEY in device_data:
        valuesList = device_data[DS_rh_KEY]
        for val in valuesList:
            ts = _bytes_to_string(val['timestamp'])
            value = _bytes_to_string(val['value'])
            result_json["RH"].append({'value': value, 'time': ts})

    # Get the 3 water temp values if they exist
    if DS_top_h2o_temp_KEY in device_data:
        valuesList = device_data[DS_top_h2o_temp_KEY]
        for val in valuesList:
            ts = _bytes_to_string(val['timestamp'])
            value = _bytes_to_string(val['value'])
            result_json["top_h2o_temp"].append({'value': value, 'time': ts})

    if DS_middle_h2o_temp_KEY in device_data:
        valuesList = device_data[DS_middle_h2o_temp_KEY]
        for val in valuesList:
            ts = _bytes_to_string(val['timestamp'])
            value = _bytes_to_string(val['value'])
            result_json["middle_h2o_temp"].append({'value': value, 'time': ts})

    if DS_bottom_h2o_temp_KEY in device_data:
        valuesList = device_data[DS_bottom_h2o_temp_KEY]
        for val in valuesList:
            ts = _bytes_to_string(val['timestamp'])
            value = _bytes_to_string(val['value'])
            result_json["bottom_h2o_temp"].append({'value': value, 'time': ts})

    return result_json


# ------------------------------------------------------------------------------
# Generic function to return a float value from DeviceData[key]
def get_current_float_value_from_DS(key, device_uuid):
    if device_uuid is None or device_uuid is 'None':
        return None

    device_data = get_by_key(DS_device_data_KEY, device_uuid)
    if device_data is None or key not in device_data:
        return None

    # process the vars list from the DS into the same format as BQ
    result = None
    valuesList = device_data[key]
    val = valuesList[0]  # the first item in the list is most recent
    result = "{0:.2f}".format(float(val['value']))
    return result


# ------------------------------------------------------------------------------
# Get the current CO2 value for this device.  
# Returns a float or None.
def get_current_CO2_value(device_uuid):
    # First: look in the Datastore Device data dict...
    result = get_current_float_value_from_DS(DS_co2_KEY, device_uuid)
    if result is not None:
        return result

    # Second: do a big (slow) query
    return get_current_float_value_from_BQ(
        queries.fetch_current_co2_value, device_uuid)


# ------------------------------------------------------------------------------
# Get the current air temp value for this device.
# Returns a float or None.
def get_current_temp_value(device_uuid):
    # First: look in the Datastore Device data dict...
    result = get_current_float_value_from_DS(DS_temp_KEY, device_uuid)
    if result is not None:
        return result

    # Also look for the old misspelled name
    result = get_current_float_value_from_DS(DS_temp_misspelled_KEY, device_uuid)
    if result is not None:
        return result

    # Second: do a big (slow) query
    return get_current_float_value_from_BQ(
        queries.fetch_current_temperature_value, device_uuid)

# ------------------------------------------------------------------------------
# Get the current top H2O temp value for this device (Fermentabot).
# Returns a float or None.
def get_current_top_h2o_temp_value(device_uuid):
    return get_current_float_value_from_DS(DS_top_h2o_temp_KEY, device_uuid)

def get_current_middle_h2o_temp_value(device_uuid):
    return get_current_float_value_from_DS(DS_middle_h2o_temp_KEY, device_uuid)

def get_current_bottom_h2o_temp_value(device_uuid):
    return get_current_float_value_from_DS(DS_bottom_h2o_temp_KEY, device_uuid)


# ------------------------------------------------------------------------------
# Get the current RH value for this device.
# Returns a float or None.
def get_current_RH_value(device_uuid):
    # First: look in the Datastore Device data dict...
    result = get_current_float_value_from_DS(DS_rh_KEY, device_uuid)
    if result is not None:
        return result

    # Second: do a big (slow) query
    return get_current_float_value_from_BQ(
        queries.fetch_current_RH_value, device_uuid)
