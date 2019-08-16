#! /usr/bin/env node

const fs = require('fs')
const assert = require('assert');
const yaml = require('js-yaml');
const massive = require('massive');
const monitor = require('pg-monitor');
const XLSX = require('xlsx'); // npm install xlsx

//const { openacs } = require('../211-openacs-drive/openacs-drive-api.js');
const {_assert, api} = require('219-openacs-api');
const tapp = require('220-tapp-api');
//const tapp_register_a_contract = require('./register-a-contract.js');
const register_a_contract = require('./lib/register-a-contract.js');
const register_a_district = require('./lib/register-a-district.js');
const register_an_agency = require('./lib/register-an-agency.js');
const register_a_school = require('./lib/register-a-school.js');
const register_a_student = require('./lib/register-a-student.js');
const register_a_tutor = require('./lib/register-a-tutor.js');

console.log(`
  This is 104-upload-students-xlsx
`);

const argv = require('yargs')
  .alias('v','verbose').count('verbose')
  .alias('i','instance_name')
  .alias('t','xtu')
  .boolean('commit')
  .boolean('drop-districts')
  .boolean('drop-schools')
  .boolean('drop-agencies')
  .boolean('drop-tutors')
  .boolean('drop-students')
  .boolean('drop-contracts')
  .options({
    'pg-monitor': {default:true},
    'limit': {default:99999}, // stop when error, if --no-stop, show error.
}).argv;


let {verbose, xtu,
    instance_name = process.env.tapp_instance_name
  } = argv;
const pg_monitor = (verbose>=2);
const drop_contracts = argv['drop-contracts']
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

var workbook = XLSX.readFile('./data/students.xlsx', {cellDates:true});
//console.log({workbook})
//console.log(`Sheets:`,workbook.Sheets)
//console.log(`SheetNames:`,workbook.SheetNames)
//const sheetName = workbook.SheetNames[0];
//console.log({sheet1})
const aoa = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header:0,cellDates:true})
//console.log({aoa})
var headers = aoa[0], json = aoa.slice(0);
//console.log({headers})

function xnor1(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g,' ').replace(/\s+/g,'-')
}

function xnor1_dot(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g,' ').replace(/\s+/g,'.')
}


let student_Count =0;
for (const row of json) {
  //console.log({row})
  if (!row.Name) break;
  student_Count++;
  //console.log(`row.Name:`,row.Name)
  //console.log(`row['Name']:`,row['Name'])
  const [district_name, student_name] = row.Name.split('|')
  const [last_name, first_names] = student_name.split(',')

  row.school_title = row['School Name'].trim();

  row.student = {
    first_names: first_names.trim(),
    last_name: last_name.trim(),
//    name: xnor1(`${last_name.trim()}-${first_names}-${row.school_label}-${row.GradeLevel}`)
  }
  //row.student.name = xnor1(`${row.student.last_name}-${row.student.first_names}-${row.school_name}-${row.GradeLevel}`)

  if (district_name.startsWith('*')) {
    row.dflag="*"
    row.Name = district_name.substring(1).trim();
  } else {
    row.Name = district_name.substring(0).trim();
  }

  (()=>{
    let [last_name, first_names] = row['Tutor Name'].split(',')
    first_names= first_names.trim(),
    last_name= last_name.trim(),

    row.tutor = {
      first_names,
      last_name,
      name: xnor1_dot(first_names +' '+last_name) // index2.

// name:=email....      name: xnor1(`${last_name.trim()}-${first_names}`)
    }
  })();

  row.StudentStartDate = new Date(row.StudentStartDate).toISOString().substring(0,10);;
  row.StudentEndDate = new Date(row.StudentEndDate).toISOString().substring(0,10);;

  //console.log({row})
};


console.log(`found ${student_Count} rows in students.xlsx`)
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

    /*********************************************************

          CLEANUP

    **********************************************************/

    function purge_districts() {
      // THIS does not remove USERS... only tutors files.
      db.query(`
      delete
      from acs_objects using cr_items
      where parent_id = $(districts_folder)
      and (item_id = object_id);
      `, {districts_folder}, {single:true})

    }


    if (argv['drop-districts']) {
      await tapp.purge_districts()
      console.log('dropped all districts.')
    }



    if (argv['drop-contracts']) {

      await db.query(`
      delete from cr_item_rels where relation_tag = 'tapp.student-contract';

      select * from cr_item_rels where relation_tag = 'tapp.student-contract';

      delete from acs_objects o using cr_items i
      where (o.package_id = 411633)
      and (o.object_type = 'tapp.contract')
      `)

    }


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


    function purge_students() {
      // THIS does not remove USERS... only tutors files.
      db.query(`
      delete
      from acs_objects using cr_items
      where parent_id = $(folder_id)
      --and object_type = 'tapp.tutor'
      and (item_id = object_id);
      `, {folder_id:students_folder}, {single:true})
    }


    if (argv['drop-students']) {
      await purge_students()
      console.log('dropped all students.')
    }



    /***************************************************

    SPEEDUP by loading directories.

    ****************************************************/



    const _tutors = await require('./lib/get-tutors.js')(tutors_folder);
    const _districts = await require('./lib/get-districts.js')(districts_folder);
    const _schools = await require('./lib/get-schools.js')(schools_folder);
    const _agencies = await require('./lib/get-agencies.js')(agencies_folder);
    const _students = await require('./lib/get-students.js')(students_folder);
    const _contracts = await require('./lib/get-contracts.js')(package_id);
    const _users = await require('./lib/get-users.js')();


    Object.assign(app_instance, {_districts});
    Object.assign(app_instance, {_schools});
    Object.assign(app_instance, {_agencies});
    Object.assign(app_instance, {_tutors});
    Object.assign(app_instance, {_students});
    Object.assign(app_instance, {_users});
    //    Object.assign(app_instance, {_index});
    //    Object.assign(app_instance, {yaml_users});


    //await require('./lib/create-object-types.js')();
    await require('./lib/acs-rel-types.js')();

    if (!_agencies['wecanf']) {
      _agencies['wecanf'] = await register_an_agency(Object.assign({
        name: 'wecanf',
        label: 'WeCan Fundation'
      },{app_instance}));
    }


    //console.log(_schools); process.exit(-1)

    // process.exit(-1);

    let nitems =0;
    outerLoop:
    for(const [ix,row] of json.entries()) {
      if (ix >=20) break;
      const {student, tutor, Name:district_label, GradeLevel, school_title} = row
      if (!student) break;
      //console.log({student,tutor,district_name});
      //console.log({student});

      // --- DISTRICT ---------------------------------------------------------

      const district_name = district_label.toLowerCase().replace(/[\.\s]+/g,'.')
      let district = _districts[district_name];
      if (!district) {
        console.log(`*ALERT* district_name "${district_name}" not found in db.:`)
        district = await register_a_district(Object.assign({
          name:district_name,
          label:district_label
        },{app_instance}));
        _districts[district_name] = district
      }
      const {folder_id:district_id} = district;
      _assert(district_id, row, 'fatal@300')

      // --- SCHOOL -----------------------------------------------------------

      const school_name = school_title.toLowerCase().replace(/[\.\s]+/g,'.')
      let school = _schools[school_name];
      if (!school) {
        console.log(`*ALERT* school_name "${school_name}" not found in db.`)
        school = await register_a_school(Object.assign({
          name:school_name,
          title:school_title,
          district_id
        },{app_instance}));
        _schools[school_name] = school;
      }
      const {item_id:school_id} = school;
      _assert(school_id, row, 'fatal@314')

      // --- student ----------------------------------------------------------

      _assert(student.first_names, student, 'fatal@322')
      _assert(student.last_name, student, 'fatal@323')
      const student_name = xnor1_dot(`${student.first_names} ${student.last_name}`)
        +'@'+ xnor1_dot(school_title)
        +'#'+GradeLevel;

      let student_file = _students[student_name];
      //_assert(student_file, student, 'stop@323')
      const {first_names, last_name} = student;
      if (!student_file) {
        console.log(`*ALERT* student-file "${student_name}" not found in db.`)
        student_file = await register_a_student(Object.assign({
          name:student_name,
          school_id,
          /*
          data: {
            first_names,
            last_name,
            grade: GradeLevel
          }*/
        },{app_instance}));
        _students[student_name] = student_file;
      }
      const {item_id:student_id} = student_file;
      _assert(student_id, student_file, 'fatal@350')


      if (true) { // checksum here. // should be a new revision
        await db.query(`
        -- student in 104.
        update cr_revisions
        set data = $(data)
        from cr_items i
        where (latest_revision = revision_id)
        and (i.item_id = $(student_id));
        `, {student_id, data: {
          first_names, last_name, grade:GradeLevel
        }}, {single:true})
      }

      // --- tutor ----------------------------------------------------------

      //console.log({tutor})
      const {name:tutor_name} = tutor;
//      let {item_id:tutor_id} = _tutors[tutor_name] || {item_id:null};

      let tutor_file = _tutors[tutor_name];
      //_assert(student_file, student, 'stop@323')
      if (!tutor_file) {
        console.log(`*ALERT* tutor-file "${tutor_name}" not found in db.`)
        tutor_file = await register_a_tutor(Object.assign({
          name:tutor_name,
          label: `${tutor.first_names} ${tutor.last_name}`,
          data: tutor
        },{app_instance}));

        _tutors[tutor_name] = tutor_file;
      }
      const {folder_id:tutor_id} = tutor_file;
      _assert(tutor_id, tutor_file, 'fatal@409')


      // --- CONTRACT -------------------------------------------------------

      const contract_number = `${district_name}-${16000+ix+1}`;
//      console.log({contract_number})

      let contract = _contracts[contract_number];
      if (!contract) {
        console.log(`*ALERT* contract "${contract_number}" not found in cache.size:${Object.keys(_contracts).length}`)
        const contract1 = {
          contract_number,
          district_id, district_name,
          student_id, student_name,
          //agency_id, agency: 'wecan',
          package_id, app_folder
        };

        contract = await register_a_contract(Object.assign(contract1,{app_instance}))
        .catch(err =>{
          if (err.code != 23505) throw err;
          console.log(`register_a_contract =>`,err.detail)
//          throw err;
        })


        _assert(contract, _contracts, 'fatal@439')
        _assert(contract, contract1, 'fatal@439')
        _contracts[contract_number] = contract;

      }

      const {folder_id:contract_id} = contract;
      _assert(contract_id, contract, 'fatal@443')


      // --- SCHOOL-DISTRICT -------------------------------------------------

      assert(school_id);
      assert(district_id);

      /*
      const school_rels = await db.query(`
      select *
      from acs_rels
      where (object_id_one = $(school_id));
      `, {school_id}, {single:false})

      console.log({school_rels})*/

      await api.acs_rel__new({
        rel_type: 'tapp.school-district',
        object_id_one: school_id,
        object_id_two: district_id,
        package_id
        // context_id ????
      })
      .catch(err =>{
        if (err.code != 23505) throw err;
        console.log(`acs_rel__new =>`,err.detail)
      })

      // --- STUDENT-SCHOOL -------------------------------------------------

      await api.acs_rel__new({
        rel_type: 'tapp.student-school',
        object_id_one: student_id,
        object_id_two: school_id,
        package_id
        // context_id ????
      })
      .catch(err =>{
        if (err.code != 23505) throw err;
        console.log(`acs_rel__new =>`,err.detail)
      })

      // --- STUDENT-CONTRACT -------------------------------------------------

      assert(student_id);
      assert(contract_id);

      await api.acs_rel__new({
        rel_type: 'tapp.student-contract',
        object_id_one: student_id,
        object_id_two: contract_id,
        package_id
        // context_id ????
      })
      .catch(err =>{
        if (err.code != 23505) throw err;
        console.log(`acs_rel__new =>`,err.detail)
      })

      // --- TUTOR-STUDENT -------------------------------------------------

      assert(student_id);
      assert(tutor_id);

      await api.acs_rel__new({
        rel_type: 'tapp.tutor-student',
        object_id_one: tutor_id,
        object_id_two: student_id,
        package_id
        // context_id ????
      })
      .catch(err =>{
        if (err.code != 23505) throw err;
        console.log(`acs_rel__new =>`,err.detail)
      })

//      assert(agency_id);


continue;


continue;


      //const {item_id:school_id} = _schools[_sn2];
      _assert(school_id, _schools[_sn2], 'fatal@388');


      //const {item_id:student_id, name:student_name} = _students[student.name]


      const {item_id:agency_id} = _agencies['wecan'];
      _assert(agency_id, _agencies, 'fatal@497');

      /*************************************************
      each row is a contract (1 contract per student)
      **************************************************/


      /*
            if (_contracts[contract_number]) {
              console.log(`*FOUND* contract ${contract_number} alredy esists in db.`)
            } else {
              console.log(`*ALERT* contract ${contract_number} not found in db.`)
              throw "stop@475"
            }
      */




continue; //88888888888888888888888888888888888

      if (!contract_id) {
        //console.log(_contracts)
        //throw contract_number+" NOT FOUND"

        _assert('district_id package_id app_folder contract_number'.split(/\s+/),contract1);


      }

      /*
      await api.content_item__relate({
        item_id: student_id,
        object_id: contract_id,
        relation_tag: 'tapp.student-contract',
        //order_n: 66666,
        relation_type: 'tapp.student-contract'
      });*/

      _assert(contract_id, row, 'fatal@654')

      await api.content_item__relate({
        item_id: contract_id,
        object_id: student_id, // a file not a user...
        relation_tag: 'tapp.contract-student-rel',
        //order_n: 66666,
        relation_type: 'tapp.contract-student-rel'
      });


      /*******************************************************

        create contract-file for agency (always wecan here)

      ********************************************************/

      let cfile_id = await api.content_item__new({
        name: `101-wecan`,
        parent_id: contract_id,
        title:  `101-wecan`,
        description: 'should be a checksum here.',
        text: 'to create a revision',
        package_id,
        context_id: agency_id,
        item_subtype: 'tapp.contract-agency-file'
      })
      .catch(err =>{
        if (err.code != 23505) throw err;
      })

      if (!cfile_id) {
        // already exists.
        cfile_id = await db.query(`
        select item_id
        from cr_items
        where (name = '101-wecan') and (parent_id = $(contract_id));
        `, {contract_id}, {single:true})
        .then(({item_id}) => item_id)
      }

      _assert(cfile_id, row, 'fatal@691 Unable to locate 101-wecan.')

      await api.content_item__relate({
        item_id: cfile_id,
        object_id: agency_id,
        relation_tag: 'tapp.contract-agency-rel',
        //order_n: 66666,
        relation_type: 'tapp.contract-agency-rel'
      })
      .catch(err =>{
        if (err.code != 23505) throw err;
      });



      /*******************************************************

        create tutor-file and relation w/contract-file

      ********************************************************/
      /*
          _tutors[]
      */


      /*
      if (!_tutors[tutor_key]) {
        console.log({_tutors})
        console.log({tutor_key})
      }*/

      _assert(tutors_folder, row,'fatal@717')


//console.log(_tutors[tutor_name]);
//console.log({_tutors})
//process.exit(-1)

      if (!tutor_id) {
        tutor_id = await api.content_folder__new({
          name: tutor_name+'@wecanf.net',
          parent_id: tutors_folder,
          label: tutor_name+'@wecanf.net',
          description: 'this tutor was not found on xlsx',
  //        text: 'to create a revision',
          package_id,
          context_id: tutors_folder,
          item_subtype: 'tapp.tutor-folder',
          object_type: 'tapp.tutor'
        })
        .catch(err =>{
          if (err.code != 23505) throw err;
        })

//        _assert(tutor_id, row, 'fatal@737')
      }

      if (!tutor_id) {
        // already exists.
        tutor_id = await db.query(`
        select item_id
        from cr_items
        join cr_folders on (folder_id = item_id)
        where (name = $(tutor_name))
        and (parent_id = $(tutors_folder));
        `, {tutor_name: tutor_name+'@wecanf.net', tutors_folder}, {single:true})
        .then(({item_id}) => item_id)
      }

      _assert(tutor_id, row, `fatal@745 Unable to locate tutor: ${tutor_name}`)


      let revision_id = db.query(`
        select latest_revision
        from cr_items
        where (item_id = $(tutor_id))
      `, {tutor_id}, {single:true})
      .then(retv =>{
        return retv.latest_revision;
      })

      if (!revision_id) {
        await api.content_revision__new({
          item_id: tutor_id,
          title: `${first_names} ${last_name}`,
          description: 'from 104',
      //    publish_date,
          mime_type: 'text/plain',
          nls_language: 'english',
          text: `
            this document contains the basic data for the case.
            But maybe we would be better by having documents
            101-Client-Infos
            102-Income-Benefits
            103-Health
            104-Employment-Education
            105-Disabilities
            106-Current-Living-Situation
            107-Services-provided (that should be shared/owned by provider)
            108-Events (use event system instead)
            109-Assessments
            110-Continuum-of-Care.
            It does not seems a good idea to link to a Person....
            `,
          package_id,
          data: row,
          verbose:1
        })
        .then(revision_id =>{
          console.log(`new-revision added =>${revision_id}`)
        })
      }




      await api.content_item__relate({
        item_id: cfile_id,
        object_id: tutor_id,
        relation_tag: 'tapp.contract-tutor-rel',
        //order_n: 66666,
        relation_type: 'tapp.contract-tutor-rel'
      })
      .catch(err =>{
        if (err.code != 23505) throw err;
      });


//process.exit(-1)
continue;
      //console.log({row}); process.exit(-1);
      console.log('Student:',{student})
      await new_student(Object.assign(student,{
        students_folder,
        GradeLevel,
        school_id, school_name,
        package_id
      }));
continue;













      await new_school({ // and relate to district
        district_id,
        name: _sn2,
        title: school_name,
        text: 'initial'
      });



continue;




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

    console.log(`disconnecting...`);
    await pg_disconnect();
    console.log(`disconnected -exit- Ok.`)

    // ==================================================================

    async function new_school(o) {
      const {district_id, name, title, text} = o;

      const school_id = await api.content_item__new({
        parent_id: schools_folder,
        name,
        title,
        package_id,
        text,
        context_id: schools_folder,
        item_subtype: 'tapp.school'
      })
      .catch(async err =>{
        if (err.code != 23505) throw err;
        console.log(`ALERT school@42 : `, err.detail)
        const school_id = await db.query(`
          select item_id from cr_items
          where name = $(name) and parent_id = $(schools_folder)
        `, {name, schools_folder}, {single:true})
        .then(({item_id}) => item_id)
        console.log('@477:',{school_id})
        return school_id;
      })

      /****************************************************

        CREATE LINK WITH DISTRICT

      *****************************************************/

      _assert(school_id, o, 'fatal@487')

      /***********************************************
      await api.content_type__create_type({
        content_type: 'tapp_school_district',
        supertype: 'content_revision',
        pretty_name: 'tapp School-District relation',
        pretty_plural:  'tapp School-District relations'
      })
      .then(retv =>{
        console.log(`api.content_type__create_type =>`,{retv})
      })
      .catch(err =>{
        if (err.code != 23505) throw err;
        console.log(`@499:`,err.detail)
      })
      ***********************************************/

      /*
      await api.acs_rel_type__drop_type({
        rel_type: 'tapp.school-district',             // object_type
        cascade: true
      })*/


//      await api.content_type__unregister_relation_type({
//      });




      _assert(school_id, o, 'fatal@499')

      const ctype1 = await api.content_item__get_content_type(school_id);
      console.log(`content_type(school:${school_id})=>${ctype1}`)
      const folder1 = await tapp.xray_item(school_id)
      console.log(`school:`,{folder1})

      const ctype2 = await api.content_item__get_content_type(district_id);
      console.log(`content_type(district:${district_id})=>${ctype1}`)
      const folder2 = await tapp.xray_folder(district_id)
      console.log(`district:`,{folder2})


      await api.content_item__relate({
        item_id: school_id,
        object_id: district_id,
        relation_tag: 'tapp.school-district',
        //order_n: 66666,
        relation_type: 'tapp.school-district'
      })
    }



  }; // main.

  function show_pg_error(err) {
    console.log(`error code:${err.code} => ${err.detail}`);
    if (!err.detail) console.log(err)
  }

main().catch(console.error)

// -------------------------------------------------------------------------


// ==================================================================

async function new_student(o) {
  const {school_id, school_name, name, first_names, last_name, GradeLevel, students_folder, package_id} = o;

  _assert('school_id name'.split(/\s+/), o)
  const student_id = await api.content_item__new({
    parent_id: students_folder,
    name,
    title: `${first_names} ${last_name} @${school_name}#${GradeLevel}`,
    package_id,
    text: 'bidon:just to have revision',
    context_id: students_folder,
    item_subtype: 'tapp.student'
  })
  .catch(async err =>{
    if (err.code != 23505) throw err;
    console.log(`ALERT new-student@42 : `, err.detail)
    const student_id = await db.query(`
      select item_id from cr_items
      where name = $(name) and parent_id = $(students_folder)
    `, {name, students_folder}, {single:true})
    .then(({item_id}) => item_id)
    console.log('@477:',{student_id})
    return student_id;
  })

  /****************************************************

    CREATE LINK WITH school

  *****************************************************/

  _assert(student_id, o, 'fatal@487')

  const ctype1 = await api.content_item__get_content_type(student_id);
  console.log(`content_type(student:${student_id})=>${ctype1}`)
  const item1 = await tapp.xray_item(student_id)
  console.log(`school:`,{item1})

  const ctype2 = await api.content_item__get_content_type(school_id);
  console.log(`content_type(district:${school_id})=>${ctype1}`)
  const item2 = await tapp.xray_item(school_id)
  console.log(`district:`,{item2})


  await api.content_item__relate({
    item_id: student_id,
    object_id: school_id,
    relation_tag: 'tapp.student-school',
    //order_n: 66666,
    relation_type: 'tapp.student-school'
  })
}
