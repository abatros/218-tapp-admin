const {_assert, api} = require('219-openacs-api');

module.exports = register_an_agency;

/*
    This is an unfrequent operation.
    It can be slow.
*/

async function register_an_agency(o) {
  console.log(`register_an_agency:`,{o})
  const {name, app_instance, xray} = o;
  const {agency_name =name, label} = o;
  _assert(agency_name, o, "Missing agency name")
  _assert(label, o, "Missing agency label")
  _assert(app_instance, o, "Missing app_instance")
  const {package_id, app_folder,
    agencies_folder} = app_instance;
  _assert(package_id, o, "Missing package_id")
  _assert(app_folder, o, "Missing app_folder")
  _assert(agencies_folder, o, "Missing agencies_folder")

  /*
    lookup for an existing agency.
  */

  const _agencies = app_instance._agencies;
  let agency = _agencies && _agencies[agency_name];

  console.log(`register_an_agency1:`,{agency})

  if (!agency) {
    agency = await db.query(`
      select *
      from cr_folders, cr_items
      where (item_id = folder_id)
      and (parent_id = $(parent_id))
      and (name = $(name));
    `,{parent_id:agencies_folder, name: agency_name},{single:true});
  }

  console.log(`register_an_agency2:`,{agency})

  if (!agency) {
    agency = await api.content_folder__new({
      parent_id: agencies_folder,
      name: agency_name,
      label,
      package_id,
      context_id: agencies_folder
    })
    .then(folder_id =>{
      return {folder_id, name:agency_name, label}
    })
    .catch(err =>{
      if (err.code != 23505) throw err;
      console.log(`ALERT agency@42 : `, err.detail)
      throw err;
    })
  }

/*
  await db.query(`
    update cr_items set content_type = 'tapp.contract'
    where (item_id = ${folder_id})
    `, {folder_id},{single:true})

  await db.query(`
    update acs_objects set object_type = 'tapp.contract'
    where (object_id = ${folder_id})
    `, {folder_id},{single:true})
*/

  if (xray) {
    await tapp.xray_folder({folder_id})
  }


  console.log(`register_an_agency:`,{agency})

  return agency

}
