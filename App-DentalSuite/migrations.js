'use strict';

const clinical = require('./backend/schema/clinical');
const facility = require('./backend/schema/facility');
const organization = require('./backend/schema/organization');
const financial = require('./backend/schema/financial');
const audit = require('./backend/schema/audit');
const privacy = require('./backend/schema/privacy');
const storico = require('./backend/schema/storico');
const compensi = require('./backend/schema/compensi');

const nucleo = [].concat(clinical, facility, organization, financial).join('\n');
const tracciabilita = [].concat(audit).join('\n');
const riservatezza = [].concat(privacy).join('\n');
const tracciaClinica = [].concat(storico).join('\n');
const rapportiEconomici = [].concat(compensi).join('\n');

module.exports = [
    {
        version: 1,
        sql: nucleo
    },
    {
        version: 2,
        sql: tracciabilita
    },
    {
        version: 3,
        sql: riservatezza
    },
    {
        version: 4,
        sql: tracciaClinica
    },
    {
        version: 5,
        sql: rapportiEconomici
    }
];
