const {_assert, api} = require('219-openacs-api');

module.exports = register_a_contract;

/*
- agency: wecanf
  student_id
  program: math
  parent_signature: 2016-11-23
  start_date: 1970-01-01
  end_date: 1970-01-01
  tags: 0
  initial_credit: 30
  actual_credit: 0
  actual_credit_checked: 1970-01-01
  state: 0
  center: library
  comments: nothing yet.
  assessments:
  - label: Initial
    Blu: 2
    CST: 11
    ELA: 33
    HRG: 44
    date: 2016-11-23
    iSeq: 0
    math: 55
  - label: Mid-term
    Blu: 22
    CST: 22
    ELA: 22
    HRG: 22
    date: November 23, 2016
    iSeq: 1
    math: 33

*/

/*
    This is an unfrequent operation.
    It can be slow.
    - a contract belongs to a district (contract => district)
    - a contract is 1-1 with a workflow
    - (contract) => [programs] ?? 1+
    - (contract) => (student)
    - (contract) => (agency) // service provider, null in early state.

    (district + contract_number) UNIQUE and is the name of the folder.??

    Should the contract be in the district folder ? YES for security-context

    Do we need a sub-folder for the contract, or just a doc/file ?
    If we need special access on some parts of the doc, split and set
    a specific object on that doc.
    i.e: we could have 101-gen, 102-xxx, 103-yyy for each contract
    so, name for each part of contract : xxxx-101-gen (xxxx being the contract-number)
    We could have <contract-number>-777-state, to hold the workflow state.
*/

async function register_a_contract(o) {
  const {app_instance, verbose} = o;
  _assert(app_instance, o, "Missing app_instance")

  const {package_id, app_folder,
    districts_folder, students_folder, agencies_folder, schools_folder,
    _index // yaml_index
    } = app_instance;
  _assert(package_id, o, "Missing package_id")
  _assert(app_folder, o, "Missing app_folder")

  _assert(students_folder, o, "Missing students_folder")

  let {contract_id, district_id, agency_id, student_id, contract_number} = o;
  _assert(contract_number, o, "Missing contract_number");
  _assert(district_id, o, "Missing district_id");
  _assert(student_id, o, "Missing student_id");

  let contract = await api.content_folder__new({
    parent_id: district_id,
    name: contract_number,
    label: contract_number,
    package_id
  })
  .then(folder_id =>{
    return {
      folder_id,
      name: contract_number,
      label: contract_number
    }
  })
  .catch(async err =>{
    if (err.code != 23505) throw err;
    console.log(`register-a-contract@85 err:`,err.detail);
  })

  if (contract) {
    const {folder_id} = contract

    await db.query(`
    update acs_objects
    set object_type = 'tapp.contract'
    where object_id = $(folder_id);
    `, {folder_id}, {single:true});

    await api.content_folder__register_content_type({
      folder_id,
      content_type: 'tapp.contract'
    }).catch(err =>{
      console.log(`err@92:`,err)
      throw err;
    })

  }

return contract;


//  let {district:district_name, agency:agency_name, contract_number, program, student_username} = o;

  /************************************
      CONTRACT-NUMBER
  *************************************/
  contract_number = contract_number || (contract_id)?`S16-${contract_id}`:null;
  _assert(contract_number, o, "Missing contract number")

  /************************************
      district_id  from district_name
      HERE, district_id is from wecanf-2016...... not openacs-cms !!!!!!!
      we need to
  *************************************/

  if (!district_name) {
    _assert(district_id,'','fatal@89')
    district_name = _index[district_id].district_name;
  }
  _assert(district_name, o, "Missing district_name")

  if (!student_username) {
    _assert(student_id,'','fatal@95')
    student_username = _index[student_id].username;
  }
  _assert(student_username, o, "Missing student_name")

  if (!agency_name && agency_id) {
    agency_name = _index[agency_id].agency_name;
  }
//  _assert(agency_name, o, "Missing agency_name")

  /**********************************************************

  districts folders contains one folder for each district.
  and that folder contains all contracts issued from that district
  Where the funds are coming.

  ***********************************************************/

  const district_folder_id = await tapp.get_folder({
    parent_id: districts_folder,
    name: district_name
  })
  .then(folder => (folder.folder_id))

  _assert(district_folder_id,o,'fatal@87')
  _assert(contract_number,o,'fatal@88')


  false && console.log('register-a-contract@124:',{
    district_folder_id, // the folder
    contract_number
  });

  /******************************************

    REGISTER THE CONTRACT-FOLDER

  *******************************************/


  false && console.log('register-a-contract@147:',{
    contract_folder_id,
    district_folder_id, // the folder
    contract_number
  });


  if (!contract_folder_id) {
    const folder = await api.content_folder__get({
      parent_id: district_folder_id,
      name: contract_number
    });
    contract_folder_id = folder.folder_id;
  } else {
    console.log(`added new folder:${contract_folder_id} for ${contract_number}`)
  }
  _assert(contract_folder_id, 'missing contract_folder_id', 'fatal@80');

  false && console.log('register-a-contract@165:',{
    contract_folder_id,
    district_folder_id, // the folder
    contract_number
  });

  await db.query(`
    update acs_objects
    set object_type = 'tapp.contract'
    where (object_id = $(contract_folder_id))
  `,{contract_folder_id},{single:true})




  const doc_name = '101-contract-status';
  const contract_file1 = {
    parent_id: contract_folder_id,
    name: doc_name,
//    locale,
//    creation_date = new Date(),
//    creation_user,
    context_id: contract_folder_id,
//    creation_ip: '127.0.0.1',
    item_subtype: 'tapp.contract',
//    content_type, XXXXXXX client-file ?????????????????????
    title: doc_name,
    description: "bio for the client / protected",
    mime_type: 'text/plain',
    nls_language: 'us_EN',
    text: "never used",
    data: {id:12344}, // ATTENTION JSONB here
//    relation_tag,
//    is_live boolean = true,
//    storage_type = 'TEXT',
    package_id,
//    with_child_rels = true,
    verbose
  }

  let doc_id = await api.content_item__new(contract_file1)

  console.log(`new doc_id =>`,{doc_id})



//  console.log(`found : `,{district_folder}); return;

  /*
  _assert(first_names, o, "Missing student first_names")
  _assert(last_name, o, "Missing student last_name")
  _assert(dob, o, "Missing student dob")
  _assert(city, o, "Missing student city")
  */

//  const { student_id, program, assessments} = o;
  const {
    parent_signature,
    start_date,
    end_date,
    tags,
    initial_credit,
    actual_credit,
    actual_credit_checked, // timestamp
    state,
    center, // location for services
    comments
  } = o;

  // how to avoid multiple (agency + contract_folder)
/***********************************
//  const name = `${district_name}-${contract_number}`
  let contract_id = await db.query(`
    -- get contract-file
    select *
    from cr_items
    where -- (item_id = folder_id) and
    (parent_id = $(parent_id))
    and (name = $(name));
  `,{parent_id: district_folder, name:contract_number},{single:true})
  .then(retv =>{
    return retv && retv.item_id;
  })

  console.log(`(district:${district_folder}, contract:${contract_number})=>`,{contract_id})

return;
  ****************/
return;
// --------------------------------------------------------------------------
  contract_id = await api.content_item__new({
    parent_id: district_folder,
    name: contract_number,
    label: contract_number,
    package_id,
    item_subtype: 'acs_object',
//    context_id: district_folder,
//      content_type: 'content_revision', // MUST BE REGISTERED WITH FOLDER.
//      item_subtype: 'tapp.contract'
  })
  .catch(err =>{
    if (err.code != 23505) throw err;
    console.log(`contract : `, err.detail)
  })

  console.log(`new contract =>`,{contract_id})


return;
// ------------------------------------------------------------------------
  console.log(`register-a-contract@112x: `,{contract_id})
  _assert(contract_id, o, "fatal@144")





  if (!contract_id) {
    console.log(`Contract file <${contract_number}> not found`)

  console.log(`register-a-contract@112: `,{contract_id})
  _assert(contract_id, o, "fatal@147")

  console.log(`register-a-contract@112: `,{contract_id})

  _assert(student_id, o, "fatal@113") // this is a USER_ID.

  const ctype1 = await api.content_item__get_content_type(contract_id);
  console.log(`content_type(contract:${contract_folder})=>${ctype1}`)
  const folder1 = await tapp.xray_item(contract_file)
  console.log(`contract:`,{folder1})

  const ctype2 = await api.content_item__get_content_type(student_id);
  console.log(`content_type(student:${student_id})=>${ctype1}`)
  const folder2 = await tapp.xray_folder(student_id)
  console.log(`student:`,{folder2})


  const rel_id = await api.content_item__relate({
    item_id: contract_folder,
    object_id: student_id
  })
  .catch(err =>{
    console.log(`err.code:${err.code} =>`,err.detail||err)
  })

}

} // register-a-contract
