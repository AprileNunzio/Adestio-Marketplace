'use strict';

const { createRepository } = require('../kernel/repository');

const sedi = createRepository('sedi_studio', [
    'nome', 'codice', 'indirizzo', 'citta', 'cap', 'provincia',
    'telefono', 'email', 'direttore_sanitario', 'is_principale'
], { label: 'Sede', orderBy: 'is_principale DESC, nome ASC' });

const sale = createRepository('sale_studio', [
    'sede_id', 'nome', 'tipo_sala', 'piano', 'codice_stanza', 'dotazioni', 'colore'
], { label: 'Sala', orderBy: 'nome ASC' });

const poltrone = createRepository('poltrone_studio', [
    'sede_id', 'sala_id', 'nome', 'codice_unita', 'marca_modello', 'matricola',
    'medico_default_id', 'assistente_default_id', 'colore_agenda', 'stato', 'note'
], { label: 'Poltrona', orderBy: 'nome ASC' });

const appuntamenti = createRepository('appuntamenti', [
    'paziente_id', 'medico_id', 'assistente_id', 'poltrona_id', 'sede_id',
    'prestazione_id', 'data_ora_inizio', 'durata_minuti', 'motivo_visita',
    'stato', 'colore_calendario', 'promemoria_inviato', 'note'
], { label: 'Appuntamento', orderBy: 'data_ora_inizio ASC', systemColumns: ['autore_id'] });

module.exports = { sedi, sale, poltrone, appuntamenti };
