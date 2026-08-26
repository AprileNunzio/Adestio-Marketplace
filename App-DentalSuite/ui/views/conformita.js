import { el, rimpiazza } from '../components/dom.js';
import { radice, intestazione, scheletro, vuoto } from '../components/layout.js';
import { can } from '../security/permissions.js';
import { versione } from '../kernel/moduli.js';

const SCHEDE = [
    {
        id: 'modelli',
        titolo: 'Consensi & Modelli',
        simbolo: 'assignment_turned_in',
        permesso: 'consensi_view',
        modulo: () => import(`./conformita/modelli.js${versione()}`)
    },
    {
        id: 'privacy',
        titolo: 'Diritti degli interessati',
        simbolo: 'gavel',
        permesso: 'privacy_export',
        modulo: () => import(`./conformita/privacy.js${versione()}`)
    },
    {
        id: 'registro',
        titolo: 'Registro accessi',
        simbolo: 'history',
        permesso: 'audit_view',
        modulo: () => import(`./conformita/registro.js${versione()}`)
    }
];

export default {
    rendi: async ({ naviga, indietro }) => {
        const stati = await Promise.all(SCHEDE.map(scheda => can(scheda.permesso)));
        const schede = SCHEDE.map((scheda, indice) => ({ ...scheda, consentita: stati[indice] }));
        const prima = schede.find(scheda => scheda.consentita);

        if (!prima) {
            return radice('conformita', vuoto({
                titolo: 'Area conformità non accessibile',
                testo: 'Servono i permessi di consultazione consensi o del registro accessi.',
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
            rimpiazza(contenuto, scheletro(4));
            const modulo = await schede.find(voce => voce.id === id).modulo();
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

        return radice('conformita', [
            intestazione({
                titolo: 'Conformità & Tracciabilità',
                sottotitolo: 'Consensi versionati e registro immutabile degli accessi ai dati sanitari',
                simbolo: 'gpp_good',
                indietro
            }),
            barra,
            contenuto
        ]);
    }
};
