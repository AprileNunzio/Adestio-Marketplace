import { renderCrudSubapp } from '../shared/crud_kit.js';
import { callApi } from '../shared/api.js';

const FIELDS = [
    { key: 'ragione_sociale', label: 'Ragione Sociale', icon: 'business', required: true, full: true },
    { key: 'piva', label: 'Partita IVA', icon: 'tag' },
    { key: 'codice_fiscale', label: 'Codice Fiscale', icon: 'badge' },
    { key: 'email', label: 'Email', icon: 'mail', type: 'email' },
    { key: 'telefono', label: 'Telefono', icon: 'call' },
    { key: 'indirizzo', label: 'Indirizzo', icon: 'location_on', full: true },
    { key: 'citta', label: 'Città', icon: 'location_city' },
    { key: 'cap', label: 'CAP', icon: 'markunread_mailbox' },
    { key: 'provincia', label: 'Provincia', icon: 'map' },
    { key: 'iban', label: 'IBAN', icon: 'account_balance' },
    { key: 'note', label: 'Note', icon: 'notes', type: 'textarea', full: true }
];

const api = {
    getAll: (args) => callApi('fornitori:getAll', args),
    create: (args) => callApi('fornitori:create', args),
    update: (args) => callApi('fornitori:update', args),
    remove: (args) => callApi('fornitori:remove', args)
};

export function render(el) {
    renderCrudSubapp(el, {
        title: 'Fornitori',
        subtitle: 'Anagrafica dei tuoi fornitori',
        icon: 'local_shipping',
        tone: 'orange',
        api,
        fields: FIELDS,
        newLabel: 'Nuovo Fornitore',
        emptyLabel: 'Nessun fornitore registrato.',
        cardTitle: (r) => r.ragione_sociale,
        cardSubtitle: (r) => r.piva || r.email || '',
        cardMeta: (r) => r.citta ? `${r.citta}${r.provincia ? ' (' + r.provincia + ')' : ''}` : ''
    });
}
