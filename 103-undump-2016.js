#! /usr/bin/env node

const fs = require('fs')
const yaml = require('js-yaml');
const massive = require('massive');
const monitor = require('pg-monitor');

//const { openacs } = require('../211-openacs-drive/openacs-drive-api.js');
const {_assert, api} = require('219-openacs-api');
const tapp = require('220-tapp-api');
const tapp_register_a_contract = require('./register-a-contract.js');

console.log(`
  This is 102-undump-wecanf-2016
`);

const argv = require('yargs')
  .alias('v','verbose').count('verbose')
  .alias('i','instance_name')
  .alias('t','xtu')
  .boolean('commit')
  .options({
    'pg-monitor': {default:true},
    'limit': {default:99999}, // stop when error, if --no-stop, show error.
}).argv;


let {verbose, xtu,
    instance_name = process.env.tapp_instance_name
  } = argv;
const pg_monitor = (verbose>=2);

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
  const yaml_data = yaml.safeLoad(fs.readFileSync(yaml_fn, 'utf8'));
  console.log(`> yaml data ${yaml_data.length} records.`)

  /********************************************************************
    BUILD THE LOCAL_INDEX.
  *********************************************************************/
  const _index ={}, yaml_users={};
  const _otypes = new Set();

//  yaml_data.forEach((it,j) =>{
  for (const [j,it] of yaml_data.entries()) {
    if (it.otype.startsWith('-')) continue;
    _otypes.add(it.otype);
    switch(it.otype) {
      // some collisions...
      case 'district': _index[it.district_id] = it; break;
      case 'school': _index[it.school_id] = it; break;
      case 'agency': _index[it.agency_id] = it; break;
//      case 'user::user': break;
//      case 'user::student': _index[user_id] = it; break;
//      case 'student': _index[it.student_id] = it; break;
//      case 'user::tutor': _index[user_id] = it; break;
//      case 'tutor': _index[it.tutor_id] = it; break;
      case 'contract':  _index[it.contract_id] = it; break;
      // WE NEED username.
      case 'user':
        _index[it.user_id] = it; // !!!!!!!!!!!!!!!!!!!!!!!!!!
      case 'user::student':
      case 'user::tutor':
      yaml_users[it.user_id] = yaml_users[it.user_id] || {};
      Object.assign(yaml_users[it.user_id],it);
      break;

      /*
      case 'student':
      case 'tutor':
      case 'exit':
      case 'list-contracts':
      case 'list-districts':
        break;
      default:
        console.log({it})
        throw `@${j} Invalid otype:(${it.optype})`.toString();
      */
    }
  }; // for-loop


  console.log(`otypes:`,Array.from(_otypes));

  async function exit() {
    //console.log(`stopped at ${nitems}:${yaml_data.length}`)
    console.log(`disconnecting...`);
    await pg_disconnect();
    console.log(`disconnected -exit- Ok.`)
  }

  async function main() {

    await pg_connect({
      pg_monitor
    });

    const app_instance = await tapp.open_tapp_instance({instance_name:'tapp-2019'})

    // ========================================
    _assert(app_instance, '@87', "Missing app_instance")
    const {package_id, app_folder, app_group} = app_instance;
    _assert(package_id, '@89', "Missing package_id")
    _assert(app_folder, '@90', "Missing app_folder")
    _assert(app_group, '@91', "Missing app_group")
    // ========================================

    console.log({app_instance})
    const {districts_folder,
      schools_folder,
      agencies_folder,
      tutors_folder,
      students_folder
    } = app_instance;

    _assert(districts_folder,'@94','Missing districts')
    _assert(schools_folder,'@95','Missing schools')
    _assert(agencies_folder,'@96','Missing agencies')
    _assert(tutors_folder,'@97','Missing tutors')
    _assert(students_folder,'@98','Missing students')

    /***************************************************

    SPEEDUP by loading directories.

    ****************************************************/

    const _districts ={};
    await db.query(`
      select folder_id, label,
        parent_id, name, folder_id,
        object_id, object_type, title, context_id, o.package_id
      from cr_folders
      join cr_items on (item_id = folder_id)
      join acs_objects o on (object_id = folder_id)
      where (parent_id = $(folder_id))
      -- and (object_type = $(object_type))
    `,{object_type:'tapp.district', folder_id:districts_folder},{single:false})
    .then(districts =>{
      console.log(`found ${districts.length} districts`)
      districts.forEach(district =>{
        _districts[district.name] = district;
      })
    });

    const _schools ={};
    await db.query(`
      select
        item_id, parent_id, name,
        object_id, object_type, title, context_id, o.package_id
      from cr_items
      join acs_objects o on (object_id = item_id)
      where (parent_id = $(folder_id))
      -- and (object_type = $(object_type))
    `,{object_type:'tapp.school', folder_id:schools_folder},{single:false})
    .then(schools =>{
      console.log(`found ${schools.length} schools`)
      schools.forEach(school =>{
        _schools[school.name] = school;
      })
    });

    const _agencies ={};
    await db.query(`
      select
        item_id, parent_id, name,
        object_id, object_type, title, context_id, o.package_id
      from cr_items
      join acs_objects o on (object_id = item_id)
      where (parent_id = $(folder_id))
      -- and (object_type = $(object_type))
    `,{object_type:'tapp.agency', folder_id:agencies_folder},{single:false})
    .then(agencies =>{
      console.log(`found ${agencies.length} agencies`)
      agencies.forEach(agency =>{
        _agencies[agency.name] = agency;
      })
    });

    const _students ={};
    await db.query(`
      select
        item_id, parent_id, name,
        object_id, object_type, title, context_id, o.package_id
      from cr_items
      join acs_objects o on (object_id = item_id)
      where (parent_id = $(folder_id))
      -- and (object_type = $(object_type))
    `,{object_type:'tapp.student', folder_id:students_folder},{single:false})
    .then(students =>{
      console.log(`found ${students.length} student-folders`)
      students.forEach(student =>{
        _students[student.name] = student;
      })
    });


    const _tutors ={};
    await db.query(`
      select
        item_id, parent_id, name,
        object_id, object_type, title, context_id, o.package_id
      from cr_items
      join acs_objects o on (object_id = item_id)
      where (parent_id = $(folder_id))
      -- and (object_type = $(object_type))
    `,{object_type:'tapp.tutor', folder_id:tutors_folder},{single:false})
    .then(tutors =>{
      console.log(`found ${tutors.length} tutor-folders`)
      tutors.forEach(tutor =>{
        _tutors[tutor.name] = tutor;
      })
    });



    const _users ={};
    await db.query(`
      select
        user_id, username, email, screen_name, first_names, last_name
      from acs_users_all
    `,{object_type:'tapp.agency', folder_id:agencies_folder},{single:false})
    .then(users =>{
      console.log(`found ${users.length} users`)
      users.forEach(user =>{
        const {user_id, username, email, screen_name, object_type,
          first_names, last_name} = user;
        _users[username] = {
          user_id, username, email, screen_name, object_type,first_names, last_name
        };
        //console.log({user:_users[username]})
      })
    });



    Object.assign(app_instance, {_districts});
    Object.assign(app_instance, {_schools});
    Object.assign(app_instance, {_agencies});
    Object.assign(app_instance, {_tutors});
    Object.assign(app_instance, {_students});
    Object.assign(app_instance, {_users});
    Object.assign(app_instance, {_index});
    Object.assign(app_instance, {yaml_users});

    async function create_rel_type_student_contract() {

      await api.acs_rel_type__create_type({
        rel_type: 'tapp.student-contract',             // object_type
        object_type_one: 'user',      // object_type
  //      role_one,             // acs_rel_role
  //      min_n_rels_one =0,
  //      max_n_rels_one,
        object_type_two: 'content_folder',
  //      role_two: 'tapp.tutor', MUST BE IN TABLE acs_rel_roles....
  //      min_n_rels_two =0,
  //      max_n_rels_two,
  //      composable_p = true,

        // acs_object_types
        pretty_name: 'tapp-instance Student Contract',
        pretty_plural: 'tapp-instance Student Contracts',
  //      supertype: ,            // object_type
  //      table_name,
  //      id_column,
  //      package_name,
      })
      .then(retv =>{
        console.log(`api.acs_rel_type__create_type =>`,{retv})
      })
      .catch(err =>{
        if (err.code != 23505) throw err;
        console.log(`api.acs_rel_type__create_type =>`,err.detail)
      })
  //    process.exit(-1);
    }


    await create_rel_type_student_contract();


    let nitems =0;
    outerLoop:
    for(const record of yaml_data) {
      const {otype, object_type} = record;
      let {opCode=otype} = record;
      if (opCode.startsWith('-')) continue;

      opCode = `${otype}${(object_type)?'::'+object_type:''}`;
//      const h1 = `--${ix+1}:${wecan_data.length} [${otype2}]`;

      nitems +=1;
      Object.assign(record,{app_instance,xtu});
      console.log(`--${nitems}:${yaml_data.length}--\t[${opCode}]`)
      switch(opCode) {
        case 'contract': await tapp_register_a_contract(record);
        //console.log(`stop@298`); process.exit(-1);
        break;
      }
continue;
      switch(opCode) {
        case 'exit': break outerLoop;
        case 'district': await tapp.register_a_district(record); break;
        case 'school': await tapp.register_a_school(record); break;
        case 'agency': await tapp.register_an_agency(record); break;
        case 'user::user': console.log(`\t user::user ignored.`); break;
        case 'user::student':
        case 'student':
          await tapp.register_a_student(record); break;
        case 'user::tutor':
        case 'tutor':
          await tapp.register_a_tutor(record); break;
        case 'contract': await tapp.register_a_contract(record); break;
        case 'list-contracts': await tapp.list_contracts(record); break;
        case 'list-districts': await tapp.list_districts(record); break;
        case 'drop-districts-all': await tapp.drop_districts_all(record); break;

        case 'test': await tapp.test(record); break;


        /*
        case 'acs-object-type': await api.acs_object_type__create_type(record); break;
        case 'acs-rel-type': await api.acs_rel_type__create_type(record); break;
        case 'database': await db_open(record); break;
        case 'exit': break outerLoop;
        case 'list-agencies': await trip.list_agencies(record); break;
        case 'list-districts': await trip.list_districts(record); break;
        case 'list-schools': await trip.list_schools(record); break;
        case 'list-folders': await trip.list_folders(record); break;
        case 'list-organizations': await trip.list_organizations(record); break;
        case 'list-programs': await trip.list_programs(record); break;
        case 'list-users': await trip.list_users(record); break;
//        case 'list-clients': await trip.list_clients(record); break;
        case 'list-students': await trip.list_students(record); break;
        case 'list-tutors': await trip.list_tutors(record); break;
        case 'organization': await trip.organization(record); break;
        case 'drop-tapp-instance': await trip.drop_tapp_instance(record); break;
        case 'drop-district': await trip.drop_a_district(record); break;
        case 'drop-school': await trip.drop_a_school(record); break;
        case 'drop-agency': await trip.drop_an_agency(record); break;
        case 'drop-folder': await trip.drop_a_folder(record); break;
        case 'drop-student': await trip.drop_a_student(record); break;
        case 'program': await trip.program(record); break;
        case 'purge-folders': await trip.purge_folders(record); break;
        case 'purge-app-folder': await trip.purge_app_folder(record); break;
        case 'purge-groups': await trip.purge_groups(record); break;
        case 'purge-organizations': await trip.purge_organizations(record); break;
        case 'purge-programs': await trip.purge_programs(record); break;

        case 'repair-instance': await trip.repair_instance(record); break;
        case 'reset-instance': await trip.reset_instance(record); break;
        case 'xray-instance': await trip.xray_instance(record); break;
        case 'xray-folder': await trip.xray_folder(record); break;


        case 'user': await trip.user(record); break;


        case 'dump-wecan-2016': await trip.dump_wecan_2016(record); break;
        case 'open-connection': await trip.open_connection(Object.assign(record,{verbose, pg_monitor})); break;
        case 'open-tapp-instance':
          app_instance = await trip.open_tapp_instance(record);
          _assert(app_instance,'','fatal@158')
          _assert(app_instance.app_folder,'','fatal@162')
          _assert(app_instance.districts_folder,{app_instance},'fatal@163')
          break;
        */
        default:
          if (opCode.startsWith('-')) continue outerLoop;
          console.log(`
            Invalid object_type (${opCode}) found in yaml.
          `,{record})
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
