import { el, rimpiazza } from '../components/dom.js';
import { radice, intestazione, scheletro, vuoto } from '../components/layout.js';
import { can } from '../security/permissions.js';
import { versione } from '../kernel/moduli.js';

const SCHEDE = [
    { id: 'cruscotto', titolo: 'Cruscotto', simbolo: 'dashboard', permesso: 'incassi_view', modulo: () => import(`./contabilita/cruscotto.js${versione()}`) },
    { id: 'preventivi', titolo: 'Preventivi', simbolo: 'receipt_long', permesso: 'preventivi_view', modulo: () => import(`./contabilita/preventivi.js${versione()}`) },
    { id: 'incassi', titolo: 'Incassi', simbolo: 'payments', permesso: 'incassi_view', modulo: () => import(`./contabilita/incassi.js${versione()}`) },
    { id: 'spese', titolo: 'Prima nota passiva', simbolo: 'shopping_cart', permesso: 'spese_view', modulo: () => import(`./contabilita/spese.js${versione()}`) },
    { id: 'scadenziario', titolo: 'Scadenziario rate', simbolo: 'event_repeat', permesso: 'rate_view', modulo: () => import(`./contabilita/scadenziario.js${versione()}`) }
];

export default {
    rendi: async ({ naviga, indietro }) => {
        const stati = await Promise.all(SCHEDE.map(scheda => can(scheda.permesso)));
        const schede = SCHEDE.map((scheda, indice) => ({ ...scheda, consentita: stati[indice] }));
        const prima = schede.find(scheda => scheda.consentita);

        if (!prima) {
            return radice('contabilita', vuoto({
                titolo: 'Nessuna area contabile accessibile',
                testo: 'Richiedi a un amministratore i permessi di consultazione su preventivi, incassi, spese o scadenziario.',
                simbolo: 'lock'
            }));
        }

        const contenuto = el('div', {});
        let attiva = prima.id;

        const mostra = async id => {
            attiva = id;
            barra.querySelectorAll('.ds-tab').forEach(nodo => {
                nodo.setAttribute('aria-selected', nodo.dataset.scheda === id ? 'true' : 'false');
            });
            const scheda = schede.find(voce => voce.id === id);
            rimpiazza(contenuto, scheletro(4));
            const modulo = await scheda.modulo();
            rimpiazza(contenuto, await modulo.default.rendi({ naviga }));
        };

        const barra = el('nav', { class: 'ds-tabs' }, schede.map(scheda => el('button', {
            class: 'ds-tab',
            type: 'button',
            dataset: { scheda: scheda.id },
            'aria-selected': scheda.id === attiva ? 'true' : 'false',
            disabled: !scheda.consentita,
            title: scheda.consentita ? scheda.titolo : `Richiede il permesso ${scheda.permesso}`,
            onClick: () => mostra(scheda.id)
        }, [el('span', { class: 'material-symbols-rounded' }, scheda.simbolo), scheda.titolo])));

        mostra(attiva);

        return radice('contabilita', [
            intestazione({
                titolo: 'Finanze & Contabilità',
                sottotitolo: 'Preventivi, incassi, prima nota passiva e scadenziario rateale dello studio',
                simbolo: 'account_balance_wallet',
                indietro
            }),
            barra,
            contenuto
        ]);
    }
};
