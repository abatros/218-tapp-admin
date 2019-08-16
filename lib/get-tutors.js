
module.exports = get_tutors;

async function get_tutors(tutors_folder) {
  const _tutors ={};

  const tutors = await db.query(`
    select
      folder_id,
      i.item_id, parent_id, name,
      data->'first_names' as first_names,
      data->'last_name' as last_name,
      object_id, object_type, cr_revisions.title, context_id, o.package_id
    from cr_items i
    join cr_folders on (folder_id = item_id)
    join acs_objects o on (object_id = i.item_id)
    join cr_revisions on (revision_id = latest_revision)
    where (parent_id = $(folder_id))
    -- and (object_type = $(object_type))
  `,{object_type:'tapp.tutor', folder_id:tutors_folder},{single:false});


  console.log(`found ${tutors.length} tutor-folders`)
  tutors.forEach(tutor =>{
    const {first_names, last_name} = tutor;
    const key = (first_names+' '+last_name).toLowerCase().replace(/\s+/g,'.')
    if (_tutors[key]) throw 'collision@288'
    _tutors[key] = tutor;
  })

  console.log(`_tutors.size:${Object.keys(_tutors).length}`)
  return _tutors;
}
