// load our local models
const User = require( '../../app/models/user' );
const EnvVar = require( '../../app/models/envvar' );

//debugrob, can I use a non-streaming query?  BQ won't let me update/delete
// the user we insert with the exising code.  
// Try a job / load/import

const BigQuery = require('@google-cloud/bigquery');
const projectId = process.env.PROJECT_ID;
const userDatasetName = process.env.BQ_USER_DATASET;
const userTableName = process.env.BQ_USER_TABLE;
const cmdTableName = process.env.BQ_CMD_TABLE;
const statusTableName = process.env.BQ_STATUS_TABLE;
const dataDatasetName = process.env.BQ_DATA_DATASET;
const valueTableName = process.env.BQ_VALUE_TABLE;
const BQ = BigQuery({ projectId: projectId });

console.log('DB: PROJECT_ID:'+ projectId );
console.log('DB: BQ_USER_DATASET:'+ userDatasetName );
console.log('DB: BQ_USER_TABLE:'+ userTableName );
console.log('DB: BQ_CMD_TABLE:'+ cmdTableName );
console.log('DB: BQ_STATUS_TABLE:'+ statusTableName );
console.log('DB: BQ_DATA_DATASET:'+ dataDatasetName );
console.log('DB: BQ_VALUE_TABLE:'+ valueTableName );


//-----------------------------------------------------------------------------
// Database model class
class DB {
    constructor() {
    }

    //-------------------------------------------------------------------------
    // getDeviceStatus( email, deviceId, messageId, function(err, status) {} )
    static getDeviceStatus( email, deviceId, messageId, callback ) {
        if( typeof email === 'undefined' ) {
            console.log( "DB.getDeviceStatus ERROR: Passed invalid email." );
            return callback( "error", "" );
        }
        if( typeof deviceId === 'undefined' ) {
            console.log( "DB.getDeviceStatus ERROR: Passed invalid deviceId.");
            return callback( "error", "" );
        }
        if( typeof messageId === 'undefined' ) {
            console.log( "DB.getDeviceStatus ERROR: Passed invalid messageId.");
            return callback( "error", "" );
        }

        // Just get the latest status by device and messageId.
        var sql = "SELECT s.status as Message, " +
            " FORMAT_TIMESTAMP( '%c', TIMESTAMP( "+
            "   REGEXP_EXTRACT(s.id, r'(?:[^\~]*\~){1}([^~]*)')), "+
            "    'America/New_York') as Time "+
            " FROM " + userDatasetName + "." + statusTableName + " as s " +
            " WHERE " +
            " REGEXP_EXTRACT(s.id, r'(?:[^\~]*\~){0}([^~]*)') = '" + 
                deviceId + "' " +
            " ORDER BY s.messageId DESC " +
            " LIMIT 1";

// right now it takes many seconds for the status command to go to the device,
// the device to repond, the pub-sub service to insert into the DB...
//            " AND messageId = '" + messageId + "' " +
      
        const options = {
            query: sql,
            timeoutMs: 15000,     // Time out after 15 seconds.
            useLegacySql: false,  // Use standard SQL syntax for queries.
        };

        // This is an ASYNCHRONOUS query, 
        // so you must wait and process the query results inside the 
        // dynamic callback function when it is eventually called.
        BQ.query( options, function( err, rows ) {
            if( err ) {
                console.error('DB.getDeviceStatus ERROR:', err);
                return callback( err, "" );
            }
            if( rows.length == 0 ) {
                return callback( null, "" );
            }
            // We have at least one row 
            const row = rows[0];
            const stat = row.Time + "  " + row.Message;
            return callback( stat, "" );
        });
    }

    //-------------------------------------------------------------------------
    // saveCommand( email, deviceId, type, messageId, senderId, 
    //              commandStr, function(err) {} )
    static saveCommand( email, deviceId, type, messageId, senderId,
                        commandStr, callback ) {

        if( 'string' != typeof(commandStr) || 0 == commandStr.length ) {
            console.log( "Error: invalid commandStr" );
            return callback( "Error: invalid commandStr" );
        }

        var dataset = BQ.dataset( userDatasetName );
        var table = dataset.table( cmdTableName );

        var date = new Date();
        var utc = date.toISOString();
        var key = deviceId + '~' + email + '~' + utc;

        // Make JSON row of data.
        const rows = [{ id: key, 
                        type: type,
                        messageId: messageId,
                        senderId: senderId,
                        message: commandStr }];

        // This is a STREAMING insert, which means that the data can't be 
        // deleted or updated in BQ for 24 hours. OK for a log.
        table.insert( rows ).then( () => {
            // return no error (null).
            return callback( null );
        })
        .catch(err => {
            if (err && err.name === 'PartialFailureError') {
                if (err.errors && err.errors.length > 0) {
                    console.log('saveCommand() Insert errors:');
                    err.errors.forEach(err => console.error(err));
                }
            } else {
                console.error('saveCommand() ERROR:', err);
            }
            return callback( err );
        });
    }

    //-------------------------------------------------------------------------
    // findUserById( email, function(err, user) {} )
    static findUserById( email, callback ) {
        if( typeof email === 'undefined' ) {
            console.log( "DB.findUserById ERROR: Passed invalid email." );
            return callback( null, null );
        }

        // look up this user id (email) in our DB
        var sql = "SELECT id,username,password,openag " +
            "FROM " + userDatasetName + "." + userTableName + 
            " WHERE id = '" + email + "'";
        //console.log( "DB.findUserById: sql='" + sql + "'" );
        const options = {
            query: sql,
            timeoutMs: 15000,     // Time out after 15 seconds.
            useLegacySql: false,  // Use standard SQL syntax for queries.
        };

        // This is an ASYNCHRONOUS query, 
        // so you must wait and process the query results inside the 
        // dynamic callback function when it is eventually called.
        BQ.query( options, function( err, rows ) {
            if( err ) {
                console.error('DB.findUserById ERROR:', err);
                return;
            }
            //rows.forEach(row => console.log(row));

            if( rows.length == 0 ) {
                // User not found, return no error (null) and no User (null).
                console.error('DB.findUserById user \'' + email + 
                    '\' not found.');
                return callback( null, null );
            }

            // We have at least one row that should be the User we searched for.
            const row = rows[0];
            var u = new User();
            u.id       = row.id;
            u.username = row.username;
            u.password = row.password;
            u.openag   = row.openag;
            console.log('DB.findUserById found user \'' + u.id + '\'' );

            return callback( null, u );
        });
    }


    //-------------------------------------------------------------------------
    // getEnvVarData( email, function(err, envvars) {} )
    // If successful, envvars will hold an array of EnvVar.  
    // If error, it's null.
    static getEnvVarData( email, callback ) {
        if( typeof email === 'undefined' ) {
            console.log( "DB.getEnvVarData ERROR: Passed invalid email." );
            return callback( null, null );
        }

//debugrob: later get for userId & deviceId(s)
        // get the most recent env vars 
        var sql = 
     "SELECT "+
     "    REGEXP_EXTRACT(id, r'(?:[^\~]*\~){0}([^~]*)') as Experiment, "+
     "    REGEXP_EXTRACT(id, r'(?:[^\~]*\~){2}([^~]*)') as Treatment, "+
     "    REGEXP_EXTRACT(id, r'(?:[^\~]*\~){3}([^~]*)') as Name, "+
     "    FORMAT_TIMESTAMP( '%c', TIMESTAMP( "+
     "      REGEXP_EXTRACT(id, r'(?:[^\~]*\~){4}([^~]*)')), "+
     "        'America/New_York') as Time, "+
     "    REGEXP_EXTRACT(id, r'(?:[^\~]*\~){5}([^~]*)') as DeviceID, "+
     "    JSON_EXTRACT_SCALAR(values, '$.values[0].value') as Value "+
     "  FROM " + dataDatasetName + "." + valueTableName +
     "  WHERE 'status' != REGEXP_EXTRACT(id, r'(?:[^\~]*\~){3}([^~]*)') "+
     "  ORDER BY REGEXP_EXTRACT(id, r'(?:[^\~]*\~){4}([^~]*)') DESC "+
     "  LIMIT 5 ";

        //console.log( "getEnvVarData EnvVars: sql='" + sql + "'" );
        const options = {
            query: sql,
            timeoutMs: 20000,     // Time out after 20 seconds.
            useLegacySql: false,  // Use standard SQL syntax for queries.
        };

        // This is an ASYNCHRONOUS query, 
        // so you must wait and process the query results inside the 
        // dynamic callback function when it is eventually called.
        BQ.query( options, function( err, rows ) {
            if( err ) {
                console.error('DB ERROR:', err);
                return callback( null, null );
            }
            //rows.forEach(row => console.log(row));

            if( rows.length == 0 ) {
                // no data found!
                //console.log('DB.getEnvVarData no env vars.');
                return callback( null, null );
            }

            // Process the rows (this is 95% faster than rows.forEach() )
            var envVars = new Array();
            for( var i=0; i < rows.length; i++ ) { 
                var e = new EnvVar();
                e.experiment = rows[i].Experiment;
                e.treatment = rows[i].Treatment;
                e.variable = rows[i].Name;
                // not using .DeviceID now 
                // (would have to look up dev name by id)
                e.time = rows[i].Time;
                e.value = rows[i].Value;
                envVars.push( e ); 
                console.log('DB.getEnvVarData EnvVar['+i+'] '+
                    e.time+' '+e.variable+' '+ e.value);
            }

            // return no error (null) and the User we found.
            return callback( null, envVars );
        });
    }

    //-------------------------------------------------------------------------
    // saveUser( user, function(err) {} )
    static saveUser( user, callback ) {

        var dataset = BQ.dataset( userDatasetName );
        var table = dataset.table( userTableName );

        // Make JSON rows of data (only one row/user).
        const rows = [{ id: user.id, 
            username: user.username, 
            password: user.password,
            created: BQ.timestamp(new Date()),
            openag: false }];

//debugrob, find another way - load job.  But save this code in new DB class and name "streamingUserInsert()" with comments below.
        // This is a STREAMING insert, which means that the data can't be 
        // deleted or updated in BQ for 24 hours.  
        table.insert( rows ).then( () => {
            // return no error (null).
            console.log('saved user \''+ user.username + '\'');
            return callback( null );
        })
        .catch(err => {
            if (err && err.name === 'PartialFailureError') {
                if (err.errors && err.errors.length > 0) {
                    console.log('save Insert errors:');
                    err.errors.forEach(err => console.error(err));
                }
            } else {
                console.error('save ERROR:', err);
            }
            return callback( err );
        });

/*debugrob log all the rows of the user table
    table.getRows().then( results => {
        const rows = results[0];
        console.log('Rows:');
        rows.forEach(row => console.log(row));
      })
      .catch(err => {
        console.error('ERROR:', err);
      });
*/

    }
}


//-----------------------------------------------------------------------------
// create the model class for DB and expose it to our app
module.exports = DB;

