'use strict';

const clinical = require('./backend/schema/clinical');
const facility = require('./backend/schema/facility');
const organization = require('./backend/schema/organization');
const financial = require('./backend/schema/financial');

const schema = [].concat(clinical, facility, organization, financial).join('\n');

module.exports = [
    {
        version: 1,
        sql: schema
    }
];
