//const {_assert, xnor1} = require('./utils.js')
//const {api} = require('219-openacs-api');

const {_assert, api} = require('219-openacs-api');


module.exports = register_a_student;

/*
    This is an unfrequent operation.
    It can be slow.
    Student may not have email, but they need dob
*/

async function register_a_student(o) {
//  register_as_user(o)
  return await register_student_folder(o)
}



async function register_as_user(o) {
  const {first_names, last_name, email, id, student_id, password, salt, dob, city, ssid, user_id, verbose, xst} = o;
  const {contracts} = o;
  let {username, screen_name} = o;
  const {school:school_name, app_instance} = o;
  let {school_id} = o;

  _assert(first_names, o, "Missing student first_names")
  _assert(last_name, o, "Missing student last_name")
//  _assert(dob, o, "Missing student dob")
//  _assert(city, o, "Missing student city")
  _assert(app_instance, o, "Missing app_instance")

  const {package_id, app_folder, app_group,
    students_folder, agencies_folder, schools_folder
    } = app_instance;
  _assert(package_id, o, "Missing package_id")
  _assert(app_folder, o, "Missing app_folder")
  _assert(app_group, o, "Missing app_group")
  _assert(students_folder, o, "Missing students_folder")



  /*

    FIRST lookup on users and register if needed.
    create the username if not given.

  */
  username = username
    || email
    || screen_name
    || ((user_id)?xnor1(`${first_names}-${last_name}-${user_id}`):null)
    || ((ssid)?xnor1(`${first_names}-${last_name}-${ssid}`):null)
    || ((dob)?xnor1(`${first_names}-${last_name}-${dob}`):null)
    || ((city)?xnor1(`${first_names}-${last_name}-${city}`):null)


  const _users = app_instance._users;
  let user = _users && _users[username];

  if (user) {
    console.log(`found user in cache: (${username})=>${user_id}`,{user})
  } else {
    console.log(`username:(${username}) not registered`)
  }

  if (!user && username) {
    username =''+username;
    user = await db.query(`
      select * from acs_users_all
      where (username = $(username))
    `,{username},{single:true})
  }

  if (!user && email) {
    email = ''+email;
    user = await db.query(`
      select * from acs_users_all
      where (email = $(email))
    `,{email},{single:true})
  }

  if (!user && screen_name) {
    screen_name = ''+screen_name
    user = await db.query(`
      select * from acs_users_all
      where (screen_name = $(screen_name))
    `,{screen_name},{single:true})
  }

  if (!user && (user_id||ssid||dob||city)) {
//    username = xnor1(`${first_names}-${last_name}-${user_id}`)
    user = await db.query(`
      select * from acs_users_all
      where (username = $(username))
    `,{username},{single:true})
  }

  if (!user && user_id) {
//    username = xnor1(`${first_names}-${last_name}-${user_id}`)
    user = await db.query(`
      select * from acs_users_all
      where (username = $(username))
    `,{username},{single:true})
  }


  if (!user) {
    // user really not found.

    const _user_data = {
      username,
      email,
//      url,
      first_names,
      last_name,
      password,
      salt,
      screen_name
    };

    const user_id = await api.acs__add_user(_user_data)
    .catch(err =>{
      console.log({_user_data})
      if (err.code != 23505) throw err;
      console.log({user_data});
      console.log({o});
      console.log(`alert student : `, err.detail)
    })
    user = Object.assign(_user_data, {user_id});
  }

  _assert(user, o, `Unable to get a user@124`);
  _assert(user.user_id, o, `Unable to get a user_id@125`);

  // enroll in app_group as tapp.registered_student

  _assert(user.user_id, user, "fatal@116 missing user_id")

  await enroll_as_registered_student();

  /*
    NEXT lookup on students-folder
  */

  if (!school_id && school_name) {
    school_id = await db.query(`
      select *
      from cr_folders, cr_items
      where (item_id = folder_id)
      and (parent_id = $(parent_id))
      and (name = $(name));
    `,{name:school_name, parent_id:schools_folder},{single:true})
    .then(retv =>{
      return retv && retv.folder_id;
    })
  }

  /*
    lookup for an existsing student-folder.
    The folder.name MUST BE the USER_ID
    because it will not change.
  */

//  const {user_id} = user;
//  _assert(name, user, "Missing username")
  _assert(user, o, `Unable to get a user`);

  /*****************************************************

  file name is username

  ******************************************************/
  const {username:student_name} = user;
  //_assert(username == student_name, user, student_name);



  /******************************************
  const name = ''+user_id;

  let folder = await db.query(`
    select *
    from cr_folders, cr_items
    where (item_id = folder_id)
    and (parent_id = $(parent_id))
    and (name = $(name));
  `,{parent_id:students_folder, name},{single:true})

  if (!folder) {
    const item_id = await api.content_folder__new({
      parent_id: students_folder,
      name,
      label: `${first_names} ${last_name} ${dob} ${city}`,
      package_id,
      context_id: students_folder
    })
    .catch(err =>{
      if (err.code != 23505) throw err;
      console.log(`ALERT student@42 : `, err.detail)
    })
  }
  ******************************/

  /*******************************************************************

  IS THERE SOME CONTRACTS

  ********************************************************************/

  if (contracts) {
    for (const contract of contracts) {
      console.log(`register a contract district:${contract.district} user/student:${user_id} :\n`)
continue;
      await tapp.register_a_contract(Object.assign(contract,{
        student_id:user_id,
        app_instance,
        verbose,
      }))
    }
  }

// ---------------------------------------------------------------------------
function enroll_as_registered_student() {
  api.membership_rel__new({
    rel_type: 'tapp.registered-student',
    object_id_one: app_group,
    object_id_two: user.user_id
  })
  .then(rel_id =>{
    xst && console.log(`${h1}@124 new membership tapp.student registered`)
  })
  .catch(err =>{
    if (err.code != 23505) throw err;
    xst && console.log(`${h1}@124 membership tap.student was already registered :`, err.detail)
  })
}

} // register-user


async function register_student_folder(o) {
  const {name, app_instance, verbose} = o;
  const {student_name = name} = o;

  _assert(student_name, o, "Missing student_name.")
  _assert(app_instance, o, "Missing app_instance.")

  const {package_id, app_folder,
    schools_folder, districts_folder, students_folder,
    _students
    } = app_instance;
  _assert(package_id, o, "Missing package_id.")
  _assert(app_folder, o, "Missing app_folder.")
  _assert(schools_folder, o, "Missing schools_folder.")

  let student = _students && _students[student_name];

  if (!student) {
    console.log(`student-file (${student_name}) not in cache`)
    student = await db.query(`
    select *
    from cr_items
    -- join acs_objects on (object_id = i.item_id)
    left join cr_revisions on (revision_id = latest_revision)
    where (name = $(student_name))
    and (parent_id = $(students_folder));
    `, {student_name, package_id, students_folder}, {single:true})
  }

  console.log({student})

  if (!student) {
    console.log(`student-file (${student_name}) not found => create-file`)
    student = await api.content_item__new({
      parent_id: students_folder,
      name: student_name,
      label: student_name,
      description:'something-to-set in cr_revision',
      text:'text-something-to-set in cr_revision',
      package_id,
      context_id: students_folder,
      item_subtype: 'tapp.student'
    })
    .then(item_id =>{
      return {
        item_id,
        name: student_name
      }
    })
    .catch(err =>{
      if (err.code != 23505) throw err;
      console.log(`ALERT student@42 : `, err.detail)
      throw err;
    })
  }


  const {item_id:student_id} = student;

  await db.query(`
  update acs_objects
  set object_type = 'tapp.student'
  where object_id = $(student_id);
  `, {student_id}, {single:true});

  return student;

}
