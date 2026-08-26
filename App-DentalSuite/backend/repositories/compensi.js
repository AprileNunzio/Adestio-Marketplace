'use strict';

const { createRepository } = require('../kernel/repository');

const accordi = createRepository('accordi_compenso', [
    'staff_id', 'ruolo', 'ambito', 'riferimento', 'etichetta',
    'tipo', 'valore', 'valido_dal', 'valido_al', 'attivo', 'note'
], { label: 'Accordo di compenso', orderBy: 'ruolo ASC, ambito DESC', systemColumns: ['autore_id'] });

const mensilita = createRepository('liquidazioni_mensilita', [
    'liquidazione_id', 'staff_id', 'periodo', 'giorni_coperti', 'giorni_mese', 'importo'
], { label: 'Mensilita', orderBy: 'periodo ASC' });

module.exports = { accordi, mensilita };
