'use strict';

const clinical = require('./backend/schema/clinical');
const facility = require('./backend/schema/facility');
const organization = require('./backend/schema/organization');
const financial = require('./backend/schema/financial');
const audit = require('./backend/schema/audit');
const privacy = require('./backend/schema/privacy');
const storico = require('./backend/schema/storico');
const compensi = require('./backend/schema/compensi');
const indici = require('./backend/schema/indici');
const rete = require('./backend/schema/rete');
const trasmissione = require('./backend/schema/trasmissione');
const personale = require('./backend/schema/personale');
const immagini = require('./backend/schema/immagini');

const nucleo = [].concat(clinical, facility, organization, financial).join('\n');
const tracciabilita = [].concat(audit).join('\n');
const riservatezza = [].concat(privacy).join('\n');
const tracciaClinica = [].concat(storico).join('\n');
const rapportiEconomici = [].concat(compensi).join('\n');
const indiciDiRicerca = [].concat(indici).join('\n');
const reteDiStudio = [].concat(rete).join('\n');
const trasmissioneClinica = [].concat(trasmissione).join('\n');
const turniDelPersonale = [].concat(personale).join('\n');
const derivateImmagini = [].concat(immagini).join('\n');

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
    },
    {
        version: 6,
        sql: indiciDiRicerca
    },
    {
        version: 7,
        sql: reteDiStudio
    },
    {
        version: 8,
        sql: trasmissioneClinica
    },
    {
        version: 9,
        sql: turniDelPersonale
    },
    {
        version: 10,
        sql: derivateImmagini
    }
];
