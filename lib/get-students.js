module.exports = get_students;

async function get_students(students_folder) {

  const _students ={};
  const students = await db.query(`
    select
    item_id, parent_id, name,
    object_id, object_type, title, context_id, o.package_id
    from cr_items
    join acs_objects o on (object_id = item_id)
    where (parent_id = $(folder_id))
    -- and (object_type = $(object_type))
    `,{object_type:'tapp.student', folder_id:students_folder},{single:false});

  console.log(`found ${students.length} student-folders`)
  students.forEach(student =>{
    _students[student.name] = student;
  });

  return _students;
}
