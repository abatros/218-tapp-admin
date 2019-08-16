module.exports = get_users;

async function get_users() {
  const _users ={};

  const users = await db.query(`
    select
      user_id, username, email, screen_name, first_names, last_name
    from acs_users_all
  `,{},{single:false});


  console.log(`found ${users.length} users`)
  users.forEach(user =>{
    const {user_id, username, email, screen_name, object_type,
      first_names, last_name} = user;
    _users[username] = {
      user_id, username, email, screen_name, object_type,first_names, last_name
    };
      //console.log({user:_users[username]})
  });

  return _users;

}
