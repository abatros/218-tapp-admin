#! /usr/bin/env node

const fs = require('fs')
const yaml = require('js-yaml');

const { openacs } = require('../211-openacs-drive/openacs-drive-api.js');
const {_assert, openacs_cms, openacs_api:api, tapp} = require('./lib/index');


console.log(`
  This is 888-TRIP
`);

const argv = require('yargs')
  .alias('v','verbose').count('verbose')
  .alias('d','database_name')
  .alias('i','instance_name')
  .boolean('commit')
  .options({
    'pg-monitor': {default:true},
    'limit': {default:99999}, // stop when error, if --no-stop, show error.
  }).argv;


  let {verbose,
    database_name = process.env.PGDATABASE,
    instance_name = process.env.openacs_instance_name
  } = argv;
  const pg_monitor = (verbose>0);

  if (!database_name) {
    console.log(`
      Missing database_name.
      use option (-) or
      export PGDATABASE=<db-name>
      `)
    process.exit(-1)
  } else {
    console.log(`# Using pg-database <${database_name}>`)
  }

/*
  if (!instance_name) {
    console.log(`
      Missing instance_name.
      use option (-) or
      export instance_name=<instance-name>
      `)
    process.exit(-1)
  } else {
    console.log(`# Using instance <${instance_name}>`)
  }
*/
