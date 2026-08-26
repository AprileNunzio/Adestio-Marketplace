'use strict';

const { createRepository } = require('../kernel/repository');

const rilevazioniDente = createRepository('odontogramma_storico', [
    'paziente_id', 'numero_dente', 'dentizione', 'stato', 'stato_precedente',
    'superfici', 'materiale', 'mobilita', 'note', 'trattamento_id', 'data_rilevazione'
], {
    label: 'Rilevazione',
    orderBy: 'data_rilevazione DESC, created_at DESC',
    systemColumns: ['autore_id']
});

module.exports = { rilevazioniDente };
