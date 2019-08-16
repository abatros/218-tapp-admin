module.exports = get_districts;

async function get_districts(districts_folder) {
  const _districts ={};
  const districts = await db.query(`
    select folder_id, label,
      parent_id, name, folder_id,
      object_id, object_type, title, context_id, o.package_id
    from cr_folders
    join cr_items on (item_id = folder_id)
    join acs_objects o on (object_id = folder_id)
    where (parent_id = $(folder_id))
    -- and (object_type = $(object_type))
  `,{object_type:'tapp.district', folder_id:districts_folder},{single:false});



  console.log(`found ${districts.length} districts`)
  districts.forEach(district =>{
    _districts[district.name] = district;
  })
  return _districts;
}
