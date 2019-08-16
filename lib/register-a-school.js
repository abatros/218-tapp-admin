const {_assert, api} = require('219-openacs-api');

module.exports = register_a_school;

/*
    This is an unfrequent operation.
    It can be slow.
*/

async function register_a_school(o) {
  const {name, title, district_id, app_instance, verbose} = o;

  _assert(title, o, "Missing school.title.")

  let {school_name =name} = o;
  school_name = school_name || title.toLowerCase().replace(/\s+/g,'.')

  _assert(app_instance, o, "Missing app_instance.")
  const {package_id, app_folder,
    schools_folder, districts_folder
    } = app_instance;
  _assert(package_id, o, "Missing package_id.")
  _assert(app_folder, o, "Missing app_folder.")
  _assert(schools_folder, o, "Missing schools_folder.")


  /*
    FIRST lookup on district
    and create a relation... TODO
    create a relation if district_id exists.

  if (!district_id && district_name) {
    district_id = await db.query(`
      select *
      from cr_folders, cr_items
      where (item_id = folder_id)
      and (parent_id = $(parent_id))
      and (name = $(name));
    `,{name:district_name, parent_id:districts_folder},{single:true})
    .then(retv =>{
      return retv && retv.folder_id;
    })
  }
  */

  /*
    lookup for an existsing school.
  */
  const _schools = app_instance._schools;
  let school = _schools && _schools[school_name];

  if (!school) {
    school = await db.query(`
      select i.item_id, name, title, description, data
      from cr_items i
      left join cr_revisions on (revision_id = latest_revision)
      where (parent_id = $(schools_folder))
      and (name = $(school_name));
    `, {schools_folder, school_name}, {single:true});
  }

  if (!school) {
    school = await api.content_item__new({
      parent_id: schools_folder,
      name: school_name,
      title,
      description: 'something to create a first revision.',
      package_id,
      context_id: schools_folder,
      item_subtype: 'tapp.school'
    })
    .then(item_id =>{
      return {
        item_id,
        name: school_name,
        title
      }
    })
    .catch(err =>{
      if (err.code != 23505) throw err;
      console.log(`ALERT school@42 : `, err.detail)
      throw err;
    })
  }

  const {item_id:school_id} = school;

  await db.query(`
  update acs_objects
  set object_type = 'tapp.school'
  where object_id = $(school_id);
  `, {school_id}, {single:true});


  return school;
}
