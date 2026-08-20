'use strict';

const clinical = require('./backend/schema/clinical');
const facility = require('./backend/schema/facility');
const organization = require('./backend/schema/organization');
const financial = require('./backend/schema/financial');
const audit = require('./backend/schema/audit');

const nucleo = [].concat(clinical, facility, organization, financial).join('\n');
const tracciabilita = [].concat(audit).join('\n');

module.exports = [
    {
        version: 1,
        sql: nucleo
    },
    {
        version: 2,
        sql: tracciabilita
    }
];
