'use strict';

const { createRepository } = require('../kernel/repository');

const AUTORE = ['autore_id'];

const postazione = createRepository('rete_postazione', [
    'nome', 'ruolo', 'porta', 'chiave_pubblica', 'chiave_privata',
    'impronta', 'attiva', 'indirizzo_archivio'
], { label: 'Postazione', orderBy: 'created_at ASC', systemColumns: AUTORE });

const pari = createRepository('rete_pari', [
    'nome', 'ruolo', 'chiave_pubblica', 'impronta', 'ultimo_indirizzo',
    'ultima_porta', 'ultimo_contatto', 'stato'
], { label: 'Postazione accoppiata', orderBy: 'nome ASC', systemColumns: AUTORE });

const accoppiamenti = createRepository('rete_accoppiamenti', [
    'impronta_codice', 'sale', 'scade_il', 'tentativi', 'consumato', 'pari_id'
], { label: 'Codice di accoppiamento', orderBy: 'created_at DESC', systemColumns: AUTORE });

const coda = createRepository('rete_coda', [
    'destinatario_id', 'tipo', 'contenuto', 'tentativi', 'ultimo_errore', 'stato'
], { label: 'Messaggio in coda', orderBy: 'created_at ASC', systemColumns: AUTORE });

module.exports = { postazione, pari, accoppiamenti, coda };
