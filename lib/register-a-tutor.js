const {_assert, api} = require('219-openacs-api');

module.exports = register_a_tutor;

/*
    This is an unfrequent operation.
    It can be slow.
*/

async function register_a_tutor(o) {
  const {name, app_instance, xray} = o;
  const {tutor_name =name, label, data} = o;
  _assert(tutor_name, o, "Missing tutor name")
  _assert(label, o, "Missing tutor label")
  _assert(app_instance, o, "Missing app_instance")
  const {package_id, app_folder,
    tutors_folder} = app_instance;
  _assert(package_id, o, "Missing package_id")
  _assert(app_folder, o, "Missing app_folder")
  _assert(tutors_folder, o, "Missing tutors_folder")

  /*
    lookup for an existing tutor.
  */

  const _tutors = app_instance._tutors;
  let tutor = _tutors && _tutors[tutor_name];

  if (!tutor) {
    await api.content_folder__new({
      parent_id: tutors_folder,
      name: tutor_name,
      label,
      package_id,
      context_id: tutors_folder
    })
    .then(folder_id =>{
//      _assert(folder_id, o, 'fatal@38')
      tutor = {
        folder_id,
        name: tutor_name,
        label: label
      }
    })
    .catch(err =>{
      if (err.code != 23505) throw err;
      console.log(`ALERT tutor@42 : `, err.detail)
    })
  }

//console.log(`@51:`,{tutor})

  if (!tutor) {
    // already exists.
    tutor = await db.query(`
      select *
      from cr_folders, cr_items i
      left join cr_revisions on (revision_id = latest_revision)
      where (i.item_id = folder_id)
      and (parent_id = $(parent_id))
      and (name = $(name));
    `,{parent_id:tutors_folder, name: tutor_name},{single:true});
  }


  const {folder_id:tutor_id} = tutor;
  _assert(tutor_id, tutor, 'fatal@53')

  if (o.data) { // check latest_revision checksum
    await api.content_revision__new({
      item_id: tutor_id,
      data
    })
    .catch(err =>{
      if (err.code != 23505) throw err;
      console.log(`api.content_revision__new =>`,err.detail)
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


    if (xray) {
      await tapp.xray_folder({folder_id})
    }

*/



  //const {item_id:tutor_id} = tutor;

  await db.query(`
  update acs_objects
  set object_type = 'tapp.tutor'
  where object_id = $(tutor_id);
  `, {tutor_id}, {single:true});


  return tutor;

}
