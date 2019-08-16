#! /usr/bin/env node

const fs = require('fs')
const yaml = require('js-yaml');
const massive = require('massive');
const monitor = require('pg-monitor');

//const { openacs } = require('../211-openacs-drive/openacs-drive-api.js');
const {_assert, api} = require('219-openacs-api');
const tapp = require('220-tapp-api');


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


  /**********************
      yaml input file
  ***********************/

  const yaml_fn = argv._[0] || './data/trip.yaml';
  if (!yaml_fn) {
    console.log(`
      missing yaml-file
      `)
    process.exit(-1)
  }
  const yaml_data = yaml.safeLoad(fs.readFileSync(yaml_fn, 'utf8'));
  console.log(`> yaml data ${yaml_data.length} records.`)

  const conn__ = {
      host: process.env.PGHOST || 'ultimheat.com',
      port: process.env.PGPORT || 5432,
      database: process.env.PGDATABASE || 'openacs-cms',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD,
      pg_monitor: false
  };

  async function pg_connect (conn) {
      conn = Object.assign(conn__, conn)
      _assert(conn.password, conn, 'Missing password');
      /*global*/ db = await massive(conn)
      .catch(err =>{
        console.log(`FATAL @47`);
        console.log(conn);
        throw err;
      });
      if (!db) throw 'Unable to connect.'
      if (conn.pg_monitor) {
        monitor.attach(db.driverConfig);
        console.log(`pg-monitor attached-Ok.`);
      }

    //  return {db};
  }

    //connect(); // immediately. so other modules using this will have correct value {db}
    //exports.db = db;

  async function pg_disconnect () {
      await db.pgp.end();
  }


  async function main() {
    await pg_connect({
      pg_monitor
    });


    let app_instance;
    let nitems =0;
    outerLoop:
    for(const record of yaml_data) {
      const {otype, skip} = record;
      let {opCode=otype} = record;
      nitems +=1;
      if (skip) continue;
      Object.assign(record,{app_instance});
      console.log(`--${nitems}--[${opCode}]`)
      switch(opCode) {
        case 'acs-object-type': await api.acs_object_type__create_type(record); break;
        case 'acs-rel-type': await api.acs_rel_type__create_type(record); break;
        case 'database': await db_open(record); break;
        case 'exit': break outerLoop;
        case 'list-agencies': await tapp.list_agencies(record); break;
        case 'list-districts': await tapp.list_districts(record); break;
        case 'list-schools': await tapp.list_schools(record); break;
        case 'list-folders': await tapp.list_folders(record); break;
        case 'list-organizations': await tapp.list_organizations(record); break;
        case 'list-programs': await tapp.list_programs(record); break;
        case 'list-users': await tapp.list_users(record); break;
//        case 'list-clients': await tapp.list_clients(record); break;
        case 'list-students': await tapp.list_students(record); break;
        case 'list-tutors': await tapp.list_tutors(record); break;
        case 'list-contracts': await tapp.list_contracts(record); break;
        case 'organization': await tapp.organization(record); break;
        case 'drop-tapp-instance': await tapp.drop_tapp_instance(record); break;
        case 'drop-district': await tapp.drop_a_district(record); break;
        case 'drop-school': await tapp.drop_a_school(record); break;
        case 'drop-agency': await tapp.drop_an_agency(record); break;
        case 'drop-folder': await tapp.drop_a_folder(record); break;
        case 'drop-student': await tapp.drop_a_student(record); break;
        case 'program': await tapp.program(record); break;
        case 'purge-folders': await tapp.purge_folders(record); break;
        case 'purge-app-folder': await tapp.purge_app_folder(record); break;
        case 'purge-groups': await tapp.purge_groups(record); break;
        case 'purge-organizations': await tapp.purge_organizations(record); break;
        case 'purge-programs': await tapp.purge_programs(record); break;

        case 'repair-instance': await tapp.repair_instance(record); break;
        case 'reset-instance': await tapp.reset_instance(record); break;
        case 'xray-instance': await tapp.xray_instance(record); break;
        case 'xray-folder': await tapp.xray_folder(record); break;


        case 'user': await tapp.user(record); break;

        case 'district': await tapp.register_a_district(record); break;
        case 'school': await tapp.register_a_school(record); break;
        case 'agency': await tapp.register_an_agency(record); break;
        case 'tutor': await tapp.register_a_tutor(record); break;
        case 'student': await tapp.register_a_student(record); break;

        case 'dump-wecan-2016': await tapp.dump_wecan_2016(record); break;
        case 'open-connection': await tapp.open_connection(Object.assign(record,{verbose, pg_monitor})); break;
        case 'test': await tapp.test(record); break;
        case 'open-tapp-instance':
          app_instance = await tapp.open_tapp_instance(record);
          _assert(app_instance,'','fatal@158')
          _assert(app_instance.app_folder,'','fatal@162')
          _assert(app_instance.districts_folder,{app_instance},'fatal@163')
          console.log(`loading directories...`)
          const {_districts, _schools, _agencies, _tutors, _students, _users,
            _index} = await require('./load_directories')(app_instance);
          console.log(`loading directories done.`)
          Object.assign(app_instance, {_districts});
          Object.assign(app_instance, {_schools});
          Object.assign(app_instance, {_agencies});
          Object.assign(app_instance, {_tutors});
          Object.assign(app_instance, {_students});
          Object.assign(app_instance, {_users});
          Object.assign(app_instance, {_index});
          break;

        default:
          if (opCode.startsWith('-')) continue outerLoop;
          console.log(`
            Invalid object_type (${opCode}) found in yaml.
          `)
          throw 'STOP@61'
      }
    }

    console.log(`stopped at ${nitems}:${yaml_data.length}`)
    console.log(`disconnecting...`);
    await pg_disconnect();
    console.log(`disconnected -exit- Ok.`)
  }; // main.

  function show_pg_error(err) {
    console.log(`error code:${err.code} => ${err.detail}`);
    if (!err.detail) console.log(err)
  }

main().catch(console.error)
