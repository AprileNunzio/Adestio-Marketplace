import { renderCrudSubapp } from '../shared/crud_kit.js';
import { callApi } from '../shared/api.js';

const FIELDS = [
    { key: 'tipo', label: 'Tipo Cliente', icon: 'category', type: 'select', required: true, default: 'b2b',
      options: [{ value: 'b2b', label: 'Azienda (B2B)' }, { value: 'b2c', label: 'Privato (B2C)' }, { value: 'pa', label: 'Pubblica Amministrazione' }] },
    { key: 'ragione_sociale', label: 'Ragione Sociale / Nome e Cognome', icon: 'business', required: true, full: true },
    { key: 'piva', label: 'Partita IVA', icon: 'tag' },
    { key: 'codice_fiscale', label: 'Codice Fiscale', icon: 'badge' },
    { key: 'email', label: 'Email', icon: 'mail', type: 'email' },
    { key: 'pec', label: 'PEC', icon: 'forward_to_inbox' },
    { key: 'codice_destinatario', label: 'Codice Destinatario SDI', icon: 'alternate_email', hint: '7 caratteri, o 0000000 per PEC' },
    { key: 'telefono', label: 'Telefono', icon: 'call' },
    { key: 'indirizzo', label: 'Indirizzo', icon: 'location_on', full: true },
    { key: 'citta', label: 'Città', icon: 'location_city' },
    { key: 'cap', label: 'CAP', icon: 'markunread_mailbox' },
    { key: 'provincia', label: 'Provincia', icon: 'map' },
    { key: 'nazione', label: 'Nazione', icon: 'public', default: 'Italia' },
    { key: 'iban', label: 'IBAN', icon: 'account_balance' },
    { key: 'condizioni_pagamento', label: 'Condizioni di Pagamento', icon: 'schedule', full: true },
    { key: 'note', label: 'Note', icon: 'notes', type: 'textarea', full: true }
];

const TIPO_LABEL = { b2b: 'Azienda', b2c: 'Privato', pa: 'Pubblica Amministrazione' };

const api = {
    getAll: (args) => callApi('clienti:getAll', args),
    create: (args) => callApi('clienti:create', args),
    update: (args) => callApi('clienti:update', args),
    remove: (args) => callApi('clienti:remove', args)
};

export function render(el) {
    renderCrudSubapp(el, {
        title: 'Anagrafica Clienti',
        subtitle: 'Clienti B2B, B2C e Pubblica Amministrazione',
        icon: 'group',
        tone: 'blue',
        api,
        fields: FIELDS,
        newLabel: 'Nuovo Cliente',
        emptyLabel: 'Nessun cliente registrato. Aggiungine uno per iniziare a creare preventivi.',
        cardTitle: (r) => r.ragione_sociale || `${r.nome || ''} ${r.cognome || ''}`.trim(),
        cardSubtitle: (r) => r.piva || r.codice_fiscale || r.email || '',
        cardMeta: (r) => r.citta ? `${r.citta}${r.provincia ? ' (' + r.provincia + ')' : ''}` : '',
        cardBadge: (r) => TIPO_LABEL[r.tipo] || null,
        instructions: {
            intro: 'Registra qui i clienti a cui potrai intestare preventivi, fatture e DDT.',
            steps: [
                'Scegli il tipo (Azienda, Privato o Pubblica Amministrazione).',
                'Compila almeno Ragione Sociale/Nome e i dati fiscali (P.IVA o Codice Fiscale).',
                'Per la fatturazione elettronica inserisci PEC o Codice Destinatario SDI.'
            ]
        }
    });
}
