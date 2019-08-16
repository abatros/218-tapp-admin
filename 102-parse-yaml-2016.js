#! /usr/bin/env node

const fs = require('fs')
const yaml = require('js-yaml');
const hash = require('object-hash');

//const { openacs } = require('../211-openacs-drive/openacs-drive-api.js');
const {_assert, openacs_cms, openacs_api:api, pg_connect, pg_disconnect} = require('219-openacs-api');
const {tapp} = require('./lib');


console.log(`
  This is 888-TRIP (for tapp)
`);

const argv = require('yargs')
  .alias('v','verbose').count('verbose')
  .alias('i','instance_name')
  .boolean('commit')
  .options({
    'pg-monitor': {default:true},
    'limit': {default:99999}, // stop when error, if --no-stop, show error.
  }).argv;


  let {verbose,
    instance_name = process.env.tapp_instance_name
  } = argv;
  const pg_monitor = (verbose>0);

  if (!instance_name) {
    console.log(`
      Missing instance_name.
      use option (-) or
      export tapp_instance_name=<instance-name>

      `)
    process.exit(-1)
  } else {
    console.log(`# Using instance <${instance_name}>`)
  }



  /**********************
      yaml input file
  ***********************/

  const yaml_fn = argv._[0] || './dump-wecan-2016.yaml';
  if (!yaml_fn) {
    console.log(`
      missing yaml-file
      `)
    process.exit(-1)
  }
  const wecan_data = yaml.safeLoad(fs.readFileSync(yaml_fn, 'utf8'));
  console.log(`> yaml data ${wecan_data.length} records.`)

 function userName_from(first_names,last_name,user_id) {
    return `${first_names}-${last_name}-${user_id}`.toLowerCase().replace(/\s+/g,'-');
  }

  async function db_open(conn) {
    conn = conn||{};
    const {
      host = process.env.PGHOST,
      port = process.env.PGPORT || 5432,
      database = process.env.PGDATABASE,
      user = process.env.PGUSER || 'postgres',
      password = process.env.PGPASSWORD,
      pg_monitor = false
    } = conn;
    conn = {
      host, port, database, user, password, pg_monitor
    }
    verbose && console.log({conn})
    console.log(`db_open connecting...`);
    const {db} = await pg_connect(conn);
    console.log(`connected.`);
    return db;
  }


  main()
  .then(async () =>{
    console.log(`disconnecting...`);
    await pg_disconnect();
    console.log(`disconnected -exit- Ok.`)
  })
  .catch(console.error)


async function main() {

  const db = await db_open({
    host: 'ultimheat.com',
    database: 'openacs-cms',
    verbose,
    pg_monitor
  }); // postgres

  const app_instance = await tapp.get_tapp_instance({
    instance_name: 'tapp-2019',
    verbose
  })
  console.log({app_instance})
  return;


  const tutors = db.query(`
    select *
    from cr_folders, cr_items
    where (item_id = folder_id)
    and (parent_id = $())
  `, {tutors_folder}< {single:false})


  for (const [ix, row] of wecan_data.entries()) {
    const {otype, opCode, object_type} = row;
//    const h1 = `--${ix+1}:${wecan_data.length} [${otype||opCode}]`;

    const otype2 = `${otype}${(object_type)?'::'+object_type:''}`;
    const h1 = `--${ix+1}:${wecan_data.length} [${otype2}]`;

    switch(otype2) {
      case 'district':
      const {district_id, district_name:label, email} = row;
      const new_district = {name, label}; // a folder
      const checksum = hash(new_district, {algorithm: 'md5', encoding: 'base64'})
      const _district = api.content_folder_get({parent_id, name})
      break;

      case 'school': {
        const {school_id, school_name} = row;
        break;
      }

      case 'contract': {
        const {contract_id, district_id, agency_id, student_id} = row;
    //    console.log(`${h1}:${contract_id} [d]:${district_id} [a]:${agency_id} [s]:${student_id}`)
        break;
      }

      case 'user::user': { // AN ADMIN
        const {user_id, first_names, last_name, email, object_type} = row;
        const username = userName_from(first_names, last_name, user_id);
        _users[username] = row;
//        console.log(`--${ix+1}:${wecan_data.length} [user:${object_type}:${user_id} {${first_names} ${last_name}} <${email}>`)
        break;
      }


      case 'user::student': {
        const {user_id, first_names, last_name, email, object_type} = row;
        const username = userName_from(first_names, last_name, user_id);
        _users[username] = row;
      //  console.log(`--${ix+1}:${wecan_data.length} [user:${object_type}]:${user_id} (${username}) "${first_names} ${last_name}}" <${email}>`)
        break;
      }

      case 'user::tutor': {
        const {user_id, first_names, last_name, email, object_type} = row;
        const username = userName_from(first_names, last_name, user_id);
        _users[username] = row;
//        console.log(`--${ix+1}:${wecan_data.length} [user:${object_type}:${user_id} {${first_names} ${last_name}} <${email}>`)
        break;
      }

      case 'tutor': {
        const {tutor_id, first_names, last_name, zipcode, city} = row;
        const username = userName_from(first_names, last_name, tutor_id);
        _assert(_users[username], row, "USERNAME NOT FOUND")
//        console.log(`${h1}:${tutor_id} {${first_names} ${last_name}} [zip]:${zipcode} [city]:${city}`)
        break;
      }

      case 'student': {
        const {student_id, first_names, last_name, school_id} = row;
        const username = userName_from(first_names, last_name, student_id);
        _assert(_users[username], row, "USERNAME NOT FOUND")
//        console.log(`${h1}:${student_id} {${first_names} ${last_name}} [school_id]:${school_id}`)
        break;
      }


      default:
      console.log('UNKNOWN: ',h1)
      console.log({row})
    }
  }
}

// ---------------------------------------------------------------------------

function validate() {
  /*********************************************************

      PHASE 1 : VALIDATION

  **********************************************************/

  const _users={};

  for (const [ix, row] of wecan_data.entries()) {
    const {otype, opCode, object_type} = row;
//    const h1 = `--${ix+1}:${wecan_data.length} [${otype||opCode}]`;

    const otype2 = `${otype}${(object_type)?'::'+object_type:''}`;
    const h1 = `--${ix+1}:${wecan_data.length} [${otype2}]`;

    switch(otype2) {
      case 'district':
      const {district_id, district_name} = row;
      console.log(`${h1}:${district_id} ${district_name}`)
      break;

      case 'school':
      const {school_id, school_name} = row;
      console.log(`${h1}:${school_id} ${school_name}`)
      break;

      case 'contract': {
        const {contract_id, district_id, agency_id, student_id} = row;
        console.log(`${h1}:${contract_id} [d]:${district_id} [a]:${agency_id} [s]:${student_id}`)
        break;
      }

      case 'user::student': {
        const {user_id, first_names, last_name, email, object_type} = row;
        const username = userName_from(first_names, last_name, user_id);
        _users[username] = row;
        console.log(`--${ix+1}:${wecan_data.length} [user:${object_type}]:${user_id} (${username}) "${first_names} ${last_name}}" <${email}>`)
        break;
      }

      case 'user::tutor': {
        const {user_id, first_names, last_name, email, object_type} = row;
        const username = userName_from(first_names, last_name, user_id);
        _users[username] = row;
        console.log(`--${ix+1}:${wecan_data.length} [user:${object_type}:${user_id} {${first_names} ${last_name}} <${email}>`)
        break;
      }

      case 'tutor': {
        const {tutor_id, first_names, last_name, zipcode, city} = row;
        const username = userName_from(first_names, last_name, tutor_id);
        _assert(_users[username], row, "USERNAME NOT FOUND")
        console.log(`${h1}:${tutor_id} {${first_names} ${last_name}} [zip]:${zipcode} [city]:${city}`)
        break;
      }

      case 'student': {
        const {student_id, first_names, last_name, school_id} = row;
        const username = userName_from(first_names, last_name, student_id);
        _assert(_users[username], row, "USERNAME NOT FOUND")
        console.log(`${h1}:${student_id} {${first_names} ${last_name}} [school_id]:${school_id}`)
        break;
      }

      default:
      console.log('UNKNOWN: ',h1)
      console.log({row})
    }
  }
};
