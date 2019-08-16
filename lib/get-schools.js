module.exports = get_schools;

async function get_schools(schools_folder) {
  const _schools ={};

  const schools = await db.query(`
    select
      item_id, parent_id, name,
      object_id, object_type, title, context_id, o.package_id
    from cr_items
    join acs_objects o on (object_id = item_id)
    --left join cr_item_rels r on (r.item)
    where (parent_id = $(folder_id))
    -- and (object_type = $(object_type))
  `,{object_type:'tapp.school', folder_id:schools_folder},{single:false});

  console.log(`found ${schools.length} schools`)
  schools.forEach(school =>{
    _schools[school.name] = school;
  });

  return _schools;
}
