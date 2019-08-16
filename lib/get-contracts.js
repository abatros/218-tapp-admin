module.exports = get_contracts;

async function get_contracts(package_id) {
  const _contracts ={};

  const contracts = await db.query(`
  select
  -- ci.item_id,
  ci.name as contract_number,
  --ci.content_type,
  di.item_id as district_id,
  -- di.name as district_name,
  -- di.parent_id as district_parent,
  -- o.object_type
  folder_id, label

  from cr_items ci
  join cr_folders  on (folder_id = item_id)
  join acs_objects o on (o.object_id = ci.item_id)
  join cr_items di on (di.item_id = ci.parent_id)
  where (object_type = 'tapp.contract')
  and (o.package_id = $(package_id));
  `,
  {package_id},{single:false});


  contracts.forEach(c1 =>{
    const {folder_id, contract_number, label, district_id} = c1;
      // name == label ...
    _contracts[contract_number] = c1;
  });

  return _contracts;
}
