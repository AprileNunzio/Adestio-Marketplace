'use strict';

const { createRepository } = require('../kernel/repository');

const prestazioni = createRepository('prestazioni_catalogo', [
    'codice', 'nome', 'categoria', 'branca', 'durata_stimata_minuti', 'prezzo_paziente',
    'tipo_quota_medico', 'valore_quota_medico', 'tipo_quota_segretaria',
    'valore_quota_segretaria', 'costo_materiale_stimato', 'colore_badge', 'attiva', 'note'
], { label: 'Prestazione', orderBy: 'categoria ASC, nome ASC' });

const staff = createRepository('staff', [
    'nome', 'secondo_nome', 'cognome', 'codice_fiscale', 'partita_iva', 'ruolo',
    'specializzazione', 'numero_albo', 'utente_adestio_id', 'percentuale_default',
    'costo_orario', 'ritenuta_acconto_percentuale', 'colore_agenda', 'telefono',
    'email', 'attivo', 'note'
], { label: 'Collaboratore', orderBy: 'cognome ASC, nome ASC' });

const liquidazioni = createRepository('liquidazioni_staff', [
    'staff_id', 'periodo_dal', 'periodo_al', 'totale_competenze', 'ritenuta_acconto',
    'totale_liquidato', 'numero_trattamenti', 'data_liquidazione', 'metodo_pagamento', 'note'
], { label: 'Liquidazione', orderBy: 'periodo_dal DESC', systemColumns: ['autore_id'] });

module.exports = { prestazioni, staff, liquidazioni };
