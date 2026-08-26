'use strict';

const { createRepository } = require('../kernel/repository');

const AUTORE = ['autore_id'];

const modelliConsenso = createRepository('consensi_modelli', [
    'codice', 'versione', 'titolo', 'ambito', 'testo',
    'obbligatorio', 'validita_mesi', 'in_vigore'
], { label: 'Modello di consenso', orderBy: 'ambito ASC, codice ASC, versione DESC', systemColumns: AUTORE });

const consensiPaziente = createRepository('consensi_paziente', [
    'paziente_id', 'modello_id', 'codice', 'versione', 'ambito', 'stato',
    'data_concessione', 'data_revoca', 'data_scadenza', 'modalita_raccolta',
    'impronta_testo', 'note'
], { label: 'Consenso', orderBy: 'data_concessione DESC', systemColumns: AUTORE });

module.exports = { modelliConsenso, consensiPaziente };
