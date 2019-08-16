#! /usr/bin/env node

const fs = require('fs')
const yaml = require('js-yaml');
const massive = require('massive');
const monitor = require('pg-monitor');
const XLSX = require('xlsx'); // npm install xlsx

//const { openacs } = require('../211-openacs-drive/openacs-drive-api.js');
const {_assert, api} = require('219-openacs-api');
const tapp = require('220-tapp-api');
//const tapp_register_a_contract = require('./register-a-contract.js');
//const tapp_register_a_contract = require('./register-a-contract-v2.js');


console.log(`
  This is 105-upload-tutors-xlsx
`);

const argv = require('yargs')
  .alias('v','verbose').count('verbose')
  .alias('i','instance_name')
  .alias('t','xtu')
  .boolean('commit')
  .boolean('drop-tutors')
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

var workbook = XLSX.readFile('./data/Active-Tutor-10-2015.xlsx', {cellDates:true});
const aoa = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header:0,cellDates:true})
var headers = aoa[0], json = aoa.slice(0);

function xnor1(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g,' ').replace(/\s+/g,'-')
}

let tutors_Count =0;
// pass-1 REFORMAT DATA
for (let [ix,row] of json.entries()) {
  if (!row.Email) break;
  tutors_Count++;
  //console.log(`row.Name:`,row.Name)
  //console.log(`row['Name']:`,row['Name'])

  json[ix] = {
    last_name: row['Last Name'],
    first_names: row['First Name'],
    rate: row['Hr Rate'] ||'',
    rate2: row['Other Rate'] ||'',
    street: row['Street'] ||'',
    city: row['City'] ||'',
    zip: row['Zip'] ||'',
    street: row['Street'] ||'',
    email: row['Email'] ||'',
    home_phone: row['Home Phone'] ||'',
    office_phone: row['Office Phone'] ||'',
    cell_phone: row['Cell Phone'] ||'',
    lang2: row['Second Language'] ||''
  }

//  console.log({row})
};


console.log(`found ${tutors_Count} tutors.`)
//console.log({data})
//console.log({json})

//process.exit(-1)



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


        const _tutors ={};
        await db.query(`
          select
            i.item_id, parent_id, name,
            data->'first_names' as first_names,
            data->'last_name' as last_name,
            object_id, object_type, cr_revisions.title, context_id, o.package_id
          from cr_items i
          join acs_objects o on (object_id = i.item_id)
          join cr_revisions on (revision_id = latest_revision)
          where (parent_id = $(folder_id))
          -- and (object_type = $(object_type))
        `,{object_type:'tapp.tutor', folder_id:tutors_folder},{single:false})
        .then(tutors =>{
          console.log(`found ${tutors.length} tutor-folders`)
          tutors.forEach(tutor =>{
            const {first_names, last_name} = tutor;
            const key = (first_names+' '+last_name).toLowerCase().replace(/\s+/g,'.')
            if (_tutors[key]) throw 'collision@288'
            _tutors[key] = tutor;
          })

          console.log(`_tutors.size:${Object.keys(_tutors).length}`)


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
        _users[email] = {
          user_id, username, email, screen_name, object_type,first_names, last_name
        };
        //console.log({user:_users[username]})
      })
    });

    //Object.assign(app_instance, {_districts});
    //Object.assign(app_instance, {_schools});
    //Object.assign(app_instance, {_agencies});
    Object.assign(app_instance, {_tutors});
    //Object.assign(app_instance, {_students});
    Object.assign(app_instance, {_users});
    //    Object.assign(app_instance, {_index});
    //    Object.assign(app_instance, {yaml_users});


    function purge_tutors() {
      // THIS does not remove USERS... only tutors files.
      db.query(`
      delete
      from acs_objects using cr_items
      where parent_id = $(folder_id)
      --and object_type = 'tapp.tutor'
      and (item_id = object_id);
      `, {folder_id:tutors_folder}, {single:true})

    }


    if (argv['drop-tutors']) {
      await purge_tutors()
      console.log('dropped all tutors.')
    }

//console.log({_tutors}); process.exit(-1)


// =======================================================================


    //console.log(_schools); process.exit(-1)

    let nitems =0;
    outerLoop:
    for(const [ix,row] of json.entries()) {
      //if (ix >10) break;
      nitems = ix+1;
      console.log({row})
      const {
        last_name,
        first_names,
        rate,
        rate2,
        street,
        city,
        zip,
        email,
        home_phone,
        office_phone,
        cell_phone,
        lang2
      } = row

      if (!email) break;
      //console.log({email})

      _assert(email, row,'fatal@716')
      _assert(tutors_folder, row,'fatal@717')


      let {user_id} = _users[email] || {user_id:null}
      console.log({user_id})


      /*********************************************************

        NOW: tutor-folder
        tutor.label = tutor.name := email

      **********************************************************/


      let {tutor_id} = _tutors[email] || {tutor_id:null};


      console.log({tutor_id})
      //console.log(_users[email]); process.exit(-1)


//        console.log(Object.keys(_users).filter(it => it.startsWith('a')))
//        console.log({row})
//        throw 'create tutor-file fatal@297'


      if (!tutor_id) {
        tutor_id = await api.content_folder__new({
          name: email,
          parent_id: tutors_folder,
          label: 'Tutor: '+ email,
          description: 'tutor folder',
  //        text: 'to create a revision',
          package_id,
          context_id: tutors_folder,
          item_subtype: 'tapp.tutor-folder',
          object_type: 'tapp.tutor'
        })

        .catch(err =>{
          if (err.code != 23505) throw err;
        })
      }

      if (!tutor_id) {
        // already exists.
        tutor_id = await db.query(`
        select item_id
        from cr_items
        join cr_folders on (folder_id = item_id)
        where (name = $(email))
        and (parent_id = $(tutors_folder));
        `, {email, tutors_folder}, {single:true})
        .then(retv => retv.item_id)
      }

      _assert(tutor_id, row, `fatal@745 Unable to locate tutor: ${email}`)


      // UPDATE TUTOR FILE : should be a new revision...

      await api.content_revision__new({
        item_id: tutor_id,
        title: `${first_names} ${last_name} -- ${city}`,
        description: 'test : can we add revisions to a folder...',
    //    publish_date,
        mime_type: 'text/plain',
        nls_language: 'english',
        text: `
          this document contains the basic data for a tutor.
          `,
        package_id,
        data: row,
        verbose:1
      })
      .then(revision_id =>{
        console.log(`new-revision added =>${revision_id}`)
      })

    } // each tutor.



    console.log(`disconnecting... after ntimes:${nitems}`);
    await pg_disconnect();
    console.log(`disconnected -exit- Ok.`)

    // ==================================================================



  }; // main.

  function show_pg_error(err) {
    console.log(`error code:${err.code} => ${err.detail}`);
    if (!err.detail) console.log(err)
  }

main().catch(console.error)

// ==================================================================
