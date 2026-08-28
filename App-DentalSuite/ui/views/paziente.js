import { el, rimpiazza } from '../components/dom.js';
import { intestazione, bottone, distintivo, vuoto, scheletro } from '../components/layout.js';
import { call } from '../kernel/transport.js';
import { can } from '../security/permissions.js';
import { montaVista, oggetto } from './shared/vista.js';
import { apriForm } from './shared/form_modale.js';
import { SEZIONI_PAZIENTE, PAZIENTE_VUOTO } from './forms/paziente_form.js';
import { SCHEDE } from './paziente/schede.js';

function riepilogo(paziente) {
    return [
        paziente.minore ? distintivo('Paziente minore', 'warning') : null,
        Number(paziente.pacemaker) === 1 ? distintivo('Pacemaker', 'danger') : null,
        Number(paziente.consenso_privacy) === 1
            ? distintivo('Privacy acquisita', 'success')
            : distintivo('Privacy mancante', 'danger'),
        Number(paziente.consenso_promemoria) === 1 ? distintivo('Promemoria attivi', 'info') : null,
        Number(paziente.is_deleted) === 1 ? distintivo('Cartella archiviata', 'neutral') : null
    ].filter(Boolean);
}

async function schedeConsentite() {
    const stati = await Promise.all(SCHEDE.map(scheda => can(scheda.permesso)));
    return SCHEDE.map((scheda, indice) => ({ ...scheda, consentita: stati[indice] }));
}

export default {
    rendi: async ({ parametri, naviga, indietro }) => {
        if (!parametri || !parametri.id) {
            return vuoto({ titolo: 'Cartella non specificata', simbolo: 'person_off' });
        }

        const schede = await schedeConsentite();
        const puoModificare = await can('pazienti_edit');
        const prima = schede.find(scheda => scheda.consentita);
        let attiva = prima ? prima.id : null;

        return montaVista({
            accento: 'pazienti',
            carica: async () => oggetto(await call('pazienti.get', { id: parametri.id }), null),
            disegna: (paziente, aggiorna) => {
                if (!paziente) {
                    return vuoto({ titolo: 'Cartella non trovata', simbolo: 'person_off' });
                }

                const contenuto = el('div', { class: 'ds-root' });

                const mostra = async idScheda => {
                    attiva = idScheda;
                    const scheda = schede.find(voce => voce.id === idScheda);
                    barraSchede.querySelectorAll('.ds-tab').forEach(nodo => {
                        nodo.setAttribute('aria-selected', nodo.dataset.scheda === idScheda ? 'true' : 'false');
                    });
                    if (!scheda) return;
                    rimpiazza(contenuto, scheletro(3));
                    const modulo = await scheda.modulo();
                    const vista = await modulo.default.rendi({ paziente, aggiorna, naviga });
                    rimpiazza(contenuto, vista);
                };

                const barraSchede = el('nav', { class: 'ds-tabs' }, schede.map(scheda => el('button', {
                    class: 'ds-tab',
                    type: 'button',
                    role: 'tab',
                    dataset: { scheda: scheda.id },
                    'aria-selected': scheda.id === attiva ? 'true' : 'false',
                    disabled: !scheda.consentita,
                    title: scheda.consentita ? scheda.titolo : `Richiede il permesso ${scheda.permesso}`,
                    onClick: () => mostra(scheda.id)
                }, [el('span', { class: 'material-symbols-rounded' }, scheda.simbolo), scheda.titolo])));

                if (attiva) mostra(attiva);

                return [
                    intestazione({
                        titolo: paziente.nominativo,
                        sottotitolo: [
                            paziente.codice_fiscale || 'Codice fiscale non registrato',
                            paziente.eta !== null ? `${paziente.eta} anni` : null,
                            paziente.telefono || null
                        ].filter(Boolean).join(' · '),
                        simbolo: 'badge',
                        indietro,
                        azioni: puoModificare ? [bottone({
                            etichetta: 'Modifica anagrafica',
                            simbolo: 'edit',
                            variante: 'ghost',
                            onClick: async () => {
                                await apriForm({
                                    titolo: `Modifica ${paziente.nominativo}`,
                                    sezioni: SEZIONI_PAZIENTE,
                                    valori: { ...PAZIENTE_VUOTO, ...paziente },
                                    ampia: true,
                                    onSalva: stato => call('pazienti.update', { ...stato, id: paziente.id })
                                });
                                await aggiorna();
                            }
                        })] : []
                    }),
                    el('div', { class: 'ds-toolbar' }, riepilogo(paziente)),
                    barraSchede,
                    contenuto
                ];
            }
        });
    }
};
