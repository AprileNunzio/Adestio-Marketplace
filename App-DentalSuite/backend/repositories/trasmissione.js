'use strict';

const { createRepository } = require('../kernel/repository');

const AUTORE = ['autore_id'];

const trasmissioni = createRepository('trasmissioni', [
    'paziente_id', 'pari_id', 'sessione_id', 'postazione_nome', 'impronta_postazione',
    'stato', 'aperta_il', 'chiusa_il', 'impronta_dossier', 'motivo_chiusura', 'indirizzo_consegna'
], { label: 'Trasmissione', orderBy: 'created_at DESC', systemColumns: AUTORE });

const attiRicevuti = createRepository('atti_ricevuti', [
    'trasmissione_id', 'atto_id', 'tipo', 'paziente_id', 'impronta_postazione',
    'contenuto', 'esito', 'messaggio', 'applicato_il'
], { label: 'Atto ricevuto', orderBy: 'created_at DESC', systemColumns: AUTORE });

module.exports = { trasmissioni, attiRicevuti };
