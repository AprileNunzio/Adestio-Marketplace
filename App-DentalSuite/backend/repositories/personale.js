'use strict';

const { createRepository } = require('../kernel/repository');

const AUTORE = ['autore_id'];

const orari = createRepository('staff_orari', [
    'staff_id', 'giorno_settimana', 'data_specifica', 'ora_inizio', 'ora_fine',
    'sede_id', 'poltrona_id', 'valido_dal', 'valido_al', 'note'
], { label: 'Turno', orderBy: 'giorno_settimana ASC, ora_inizio ASC', systemColumns: AUTORE });

const assenze = createRepository('staff_assenze', [
    'staff_id', 'tipo', 'data_inizio', 'data_fine', 'giornata_intera', 'ora_inizio',
    'ora_fine', 'stato', 'motivo', 'approvato_da', 'approvato_il', 'note'
], { label: 'Assenza', orderBy: 'data_inizio DESC', systemColumns: AUTORE });

module.exports = { orari, assenze };
