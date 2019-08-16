const {_assert, api} = require('219-openacs-api');

module.exports = create_object_types;

async function create_object_types() {

  await api.acs_object_type__create_type({
    object_type: 'tapp.contract-file',
    pretty_name: 'tapp Contract File',
    pretty_plural: 'tapp Contract Files',
    supertype: 'content_item',
    abstract_p: false
  })
//    .then()
  .catch(err =>{
    if (err.code != 23505) throw err;
    console.log(`object-type tapp.contract-file =>`,err.detail)
  })


  await api.acs_rel_type__create_type({
    rel_type: 'tapp.contract-student-rel',             // object_type
    object_type_one: 'user',      // object_type
    object_type_two: 'content_folder',
    pretty_name: 'tapp-instance Student Contract',
    pretty_plural: 'tapp-instance Student Contracts',
  })
  .then(retv =>{
    //console.log(`api.acs_rel_type__create_type =>`,{retv})
  })
  .catch(err =>{
    if (err.code != 23505) throw err;
    console.log(`api.acs_rel_type__create_type =>`,err.detail)
  })

  await api.acs_object_type__create_type({
    object_type: 'tapp.contract-student-rel',
    pretty_name: 'tapp.contract-student-rel',
    pretty_plural: 'tapp.contract-student-rel',
    supertype: 'acs_object',
    abstract_p: false
  })
  .catch(err =>{
    if (err.code != 23505) throw err;
    console.log(`object-type tapp.contract-student-rel =>`,err.detail)
  })

  await api.acs_object_type__create_type({
    object_type: 'tapp.contract-agency-rel',
    pretty_name: 'tapp.contract-agency-rel',
    pretty_plural: 'tapp.contract-agency-rel',
    supertype: 'acs_object',
    abstract_p: false
  })
  .catch(err =>{
    if (err.code != 23505) throw err;
    console.log(`object-type tapp.contract-agency-rel =>`,err.detail)
  })

  await api.content_type__register_relation_type({
    content_type: 'content_folder',
    target_type: 'content_revision',
    relation_tag: 'tapp.contract-agency-rel'
  })

  await api.acs_object_type__create_type({
    object_type: 'tapp.contract-tutor-rel',
    pretty_name: 'tapp.contract-tutor-rel',
    pretty_plural: 'tapp.contract-tutor-rel',
    supertype: 'acs_object',
    abstract_p: false
  })
  .catch(err =>{
    if (err.code != 23505) throw err;
    console.log(`object-type tapp.contract-student-rel =>`,err.detail)
  })

  await api.content_type__register_relation_type({
    content_type: 'content_folder',
    target_type: 'content_revision',
    relation_tag: 'tapp.contract-tutor-rel'
  })

  await api.content_type__register_relation_type({
    content_type: 'content_folder',
    target_type: 'content_revision',
    relation_tag: 'tapp.contract-student-rel'
  })

  // ----------------------------------------------------------------------

  await api.acs_rel_type__create_type({
    rel_type: 'tapp.student-school',             // object_type
    object_type_one: 'tapp.student', //'tapp.school',      // object_type
    object_type_two: 'tapp.school', //'content_revision', //'tapp.district',
    pretty_name: 'tapp Student-School',
    pretty_plural: 'tapp Student-School',
  })
  .then(retv =>{
    //console.log(`api.acs_rel_type__create_type =>`,{retv})
  })
  .catch(err =>{
    if (err.code != 23505) throw err;
    console.log(`api.acs_rel_type__create_type =>`,err.detail)
  })

  await api.content_type__register_relation_type({
    content_type: 'tapp.student',
    target_type: 'tapp.school',
    relation_tag: 'tapp.student-school'
  })

  // ----------------------------------------------------------------------

}



/********************
await api.acs_rel_type__create_type({
  rel_type: 'tapp.school-district',             // object_type
  object_type_one: 'tapp.school', //'tapp.school',      // object_type
//      role_one,             // acs_rel_role
//      min_n_rels_one =0,
//      max_n_rels_one,
  object_type_two: 'content_revision', //'tapp.district',
//      role_two: 'tapp.tutor', MUST BE IN TABLE acs_rel_roles....
//      min_n_rels_two =0,
//      max_n_rels_two,
//      composable_p = true,

  // acs_object_types
  pretty_name: 'tapp School-District',
  pretty_plural: 'tapp School-District',
//      supertype: ,            // object_type
//      table_name,
//      id_column,
//      package_name,
})
.then(retv =>{
  console.log(`api.acs_rel_type__create_type =>`,{retv})
})
.catch(err =>{
  if (err.code != 23505) throw err;
  console.log(`api.acs_rel_type__create_type =>`,err.detail)
})


await api.content_type__register_relation_type({
  content_type: 'content_revision',
  target_type: 'content_folder',
  relation_tag: 'tapp.school-district'
})
**********************/
