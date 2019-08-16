-- delete from acs_objects where (object_id = 417244);

select * from cr_item_rels
where (related_object_id = 417244);


--delete from acs_objects where (object_id = 427336);

select * from cr_item_rels
where (related_object_id = 427336);

delete from cr_item_rels where (relation_tag = 'tapp.student-school');
delete from cr_item_rels where (relation_tag = 'tapp.school-district');
 
select * from acs_objects where (object_id = 427336);

--delete from acs_objects where (object_type = 'tapp.school');


select * from parties where party_id = 377383;

select * from acs_objects where (object_id = 377383);
select * from cr_item_rels where (item_id = 377383);

select * from acs_objects 
--join cr_items on (item_id = object_id)
where (object_type = 'tapp.school') order by object_id desc;

/*
delete from acs_objects
using cr_items
where (object_type = 'tapp.school') and (item_id = object_id);
*/


delete from parties
using acs_objects
where (object_type = 'tapp.school') and (party_id = object_id);


delete from groups
using acs_objects
where (object_type = 'tapp.school') and (group_id = object_id);

delete from acs_objects
where (object_type = 'tapp.school');

--delete from acs_objects where (object_type = 'tapp.district');

select * from acs_objects 
--join cr_folders on (folder_id = object_id)
where (object_type = 'tapp.district') order by title;

select * from acs_objects 
join cr_folders on (folder_id = object_id)
--where (object_type = 'tapp.district') 
where (object_type != 'tapp.tutor')
and (object_type != 'tapp.contract')
order by folder_id desc --limit 20;
;

select * from acs_objects 
join cr_items on (item_id = object_id)
where (object_type = 'tapp.district') order by title;

delete from groups
using acs_objects
where (object_type = 'tapp.district') and (group_id = object_id);

delete from parties
using acs_objects
where (object_type = 'tapp.district') and (party_id = object_id);

delete from acs_objects
where (object_type = 'tapp.district');


select * from cr_item_rels where (related_object_id = 435806);
select * from cr_item_rels where (item_id = 435806);
select * from cr_item_rels where (rel_id = 435806);
--delete from acs_objects where object_type = 'tapp.contract'

delete from cr_item_rels where (relation_tag = 'tapp.contract-student-rel');
delete from acs_objects where (object_type = 'tapp.contract-student-rel');
select * from acs_objects where (object_id = 435806);

delete from acs_objects where object_type = 'tapp.contract';

--select * from acs_objects where object_type like 'tapp%';
select * from cr_item_rels where relation_tag like 'tapp%';
select * from acs_rels where rel_type like 'tapp%';

select acs_rels.*, o1.title, o2.title
from acs_rels
join acs_objects o1 on (o1.object_id = object_id_one)
join acs_objects o2 on (o2.object_id = object_id_two)
where rel_type like 'tapp.%';

select * from acs_objects where object_id = 427194;
delete from acs_objects where object_id = 427194;

select * from acs_objects where object_id = 424271;

select * from acs_objects 
join cr_items on (item_id = object_id)
where object_type = 'tapp.student';

delete from acs_objects 
using cr_items
where (object_type = 'tapp.tutor') and (item_id = object_id);


--select * from acs_objects where object_type like 'tapp.%';

delete from acs_objects where (object_type = 'tapp.student-contract');
delete from acs_objects where (object_type like 'tapp.contract%');
delete from acs_objects where (object_type = 'tapp.agency');
delete from acs_objects where (object_type = 'tapp.student');


select * from acs_objects 
--join cr_folders on (folder_id = object_id)
--where (object_type = 'tapp.district') 
where (object_type like 'tapp.%')
and (object_type not like 'tapp.registered%')
--order by folder_id desc --limit 20;
;


select * from acs_objects
where object_id >=411633
and package_id = 411633;

select * from cr_folders
--join acs_objects on (object_id = folder_id)
--join cr_items on (item_id = folder_id)
where cr_folders.package_id = 411633
order by folder_id;

delete from acs_objects
where acs_objects.package_id = 411633
and object_id > 412379;


select * from cr_items where parent_id = 411634;

select * from cr_items where parent_id = 412378; -- tutors
select * from cr_items where parent_id = 412379; -- students
select * from cr_items where parent_id = 412375; -- districts
select * from cr_items where parent_id = 412376; -- schools
select * from cr_items where parent_id = 412377; -- agencies



select * from acs_users_all where first_names like 'Uzo%';

