const {_assert, api} = require('219-openacs-api');

module.exports = async (app_instance)=>{
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

  return {
    _users,
    _tutors,
    _students,
    _agencies,
    _schools,
    _districts
  }

}
