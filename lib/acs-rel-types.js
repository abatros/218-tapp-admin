const {_assert, api} = require('219-openacs-api');

module.exports = create_object_types;

async function create_object_types() {

  /*
  await api.acs_rel_type__drop_type({
    rel_type: 'tapp.school-district',             // object_type
    cascade:false
  })*/
  await api.acs_rel_type__create_type({
    rel_type: 'tapp.school-district',             // object_type
    object_type_one: 'tapp.school',      // object_type
    object_type_two: 'tapp.district',
    pretty_name: 'school-district',
    pretty_plural: 'school-district',
  })
  .catch(err =>{
    if (err.code != 23505) throw err;
    console.log(`api.acs_rel_type__create_type =>`,err.detail)
  })

  await api.acs_rel_type__create_type({
    rel_type: 'tapp.student-school',             // object_type
    object_type_one: 'tapp.student',      // object_type
    object_type_two: 'tapp.school',
    pretty_name: 'student-school',
    pretty_plural: 'student-school',
  })
  .catch(err =>{
    if (err.code != 23505) throw err;
    console.log(`api.acs_rel_type__create_type =>`,err.detail)
  })


  await api.acs_rel_type__create_type({
    rel_type: 'tapp.student-contract',             // object_type
    object_type_one: 'tapp.student',      // object_type
    object_type_two: 'tapp.contract',
    pretty_name: 'student-contract',
    pretty_plural: 'student-contract',
  })
  .catch(err =>{
    if (err.code != 23505) throw err;
    console.log(`api.acs_rel_type__create_type =>`,err.detail)
  })

  await api.acs_rel_type__create_type({
    rel_type: 'tapp.tutor-student',             // object_type
    object_type_one: 'tapp.tutor',      // object_type
    object_type_two: 'tapp.student',
    pretty_name: 'tutor-student',
    pretty_plural: 'tutor-student',
  })
  .catch(err =>{
    if (err.code != 23505) throw err;
    console.log(`api.acs_rel_type__create_type =>`,err.detail)
  })


  await api.acs_rel_type__create_type({
    rel_type: 'tapp.contract-agency',             // object_type
    object_type_one: 'tapp.contract',      // object_type
    object_type_two: 'tapp.agency',
    pretty_name: 'contract-agency',
    pretty_plural: 'contract-agency',
  })
  .catch(err =>{
    if (err.code != 23505) throw err;
    console.log(`api.acs_rel_type__create_type =>`,err.detail)
  })


}
