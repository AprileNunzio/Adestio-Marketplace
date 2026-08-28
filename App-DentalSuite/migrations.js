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
const identitaPerNodo = `ALTER TABLE rete_postazione ADD COLUMN nodo TEXT DEFAULT '';`;
const recapitoConsegna = `ALTER TABLE trasmissioni ADD COLUMN indirizzo_consegna TEXT DEFAULT '';`;
const preventivoCampiAvanzati = `
ALTER TABLE preventivi ADD COLUMN metodo_pagamento TEXT DEFAULT '';
ALTER TABLE preventivi ADD COLUMN tipo_rateizzazione TEXT DEFAULT '';
ALTER TABLE preventivi ADD COLUMN numero_rate INTEGER DEFAULT 0;
ALTER TABLE preventivi ADD COLUMN cadenza_mesi INTEGER DEFAULT 1;
ALTER TABLE preventivi ADD COLUMN prima_scadenza TEXT DEFAULT '';
`;
const intolleranzeAnamnesi = `ALTER TABLE anamnesi ADD COLUMN intolleranze TEXT DEFAULT '';`;
const tracciabilitaTrattamenti = `
ALTER TABLE trattamenti_paziente ADD COLUMN anestesia TEXT DEFAULT '';
ALTER TABLE trattamenti_paziente ADD COLUMN lotto_materiali TEXT DEFAULT '';
`;
const anamnesiStrutturata = `
ALTER TABLE anamnesi ADD COLUMN patologie_strutturate TEXT DEFAULT '{}';
ALTER TABLE anamnesi ADD COLUMN allergie_strutturate TEXT DEFAULT '{}';
ALTER TABLE anamnesi ADD COLUMN intolleranze_strutturate TEXT DEFAULT '{}';
ALTER TABLE anamnesi ADD COLUMN valutazione_rischio TEXT DEFAULT '{}';
ALTER TABLE anamnesi ADD COLUMN stile_vita_strutturato TEXT DEFAULT '{}';
ALTER TABLE anamnesi ADD COLUMN farmaci_abituali TEXT DEFAULT '';
ALTER TABLE anamnesi ADD COLUMN data_revisione TEXT DEFAULT '';
ALTER TABLE anamnesi ADD COLUMN medico_revisore_id TEXT DEFAULT '';
`;
const prontuarioStudio = `
CREATE TABLE IF NOT EXISTS prontuario_farmaci_studio (
    id TEXT PRIMARY KEY,
    farmaco TEXT NOT NULL,
    principio_attivo TEXT DEFAULT '',
    categoria TEXT DEFAULT '',
    dosaggio TEXT DEFAULT '',
    posologia TEXT DEFAULT '',
    durata_giorni INTEGER DEFAULT 0,
    note TEXT DEFAULT '',
    autore_id TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_prontuario_farmaco ON prontuario_farmaci_studio(farmaco);
`;

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
    },
    {
        version: 11,
        sql: identitaPerNodo
    },
    {
        version: 12,
        sql: recapitoConsegna
    },
    {
        version: 13,
        sql: preventivoCampiAvanzati
    },
    {
        version: 14,
        sql: intolleranzeAnamnesi
    },
    {
        version: 15,
        sql: tracciabilitaTrattamenti
    },
    {
        version: 16,
        sql: anamnesiStrutturata
    },
    {
        version: 17,
        sql: prontuarioStudio
    }
];
