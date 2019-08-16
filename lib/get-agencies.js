module.exports = get_agencies;

async function get_agencies(agencies_folder){
  const _agencies ={};
  const agencies = await db.query(`
    select
      item_id, parent_id, name,
      object_id, object_type, title, context_id, o.package_id
    from cr_items
    join acs_objects o on (object_id = item_id)
    where (parent_id = $(folder_id))
    -- and (object_type = $(object_type))
  `,{object_type:'tapp.agency', folder_id:agencies_folder},{single:false});


  console.log(`found ${agencies.length} agencies`)
  agencies.forEach(agency =>{
    _agencies[agency.name] = agency;
  });


  return _agencies;
}
