import { el, rimpiazza } from '../../components/dom.js';
import { pannello, bottone, distintivo, avviso, scheletro } from '../../components/layout.js';
import { tabella, azioniRiga } from '../../components/tabella.js';
import { conferma } from '../../components/modale.js';
import { esito } from '../../components/notifica.js';
import { opzioniDa } from '../../components/campi.js';
import { call } from '../../kernel/transport.js';
import { can } from '../../security/permissions.js';
import * as fmt from '../../kernel/format.js';
import { oggetto } from '../shared/vista.js';
import { apriForm } from '../shared/form_modale.js';

const TONI_STATO = { concesso: 'success', revocato: 'danger', scaduto: 'warning' };

const MODALITA = [
    { valore: 'cartaceo', etichetta: 'Modulo cartaceo firmato' },
    { valore: 'firma_digitale', etichetta: 'Firma digitale su tavoletta' },
    { valore: 'verbale_registrato', etichetta: 'Verbale, annotato in cartella' },
    { valore: 'online', etichetta: 'Raccolto online' }
];

export default {
    rendi: async ({ paziente }) => {
        const puoGestire = await can('consensi_manage');
        const contenitore = el('div', { class: 'ds-root' }, scheletro(3));

        const disegna = async () => {
            const dati = oggetto(await call('consensi.listByPaziente', { paziente_id: paziente.id }), null);
            if (!dati) {
                rimpiazza(contenitore, avviso({ tono: 'warning', titolo: 'Consensi non disponibili' }));
                return;
            }

            const raccogli = async () => {
                await apriForm({
                    titolo: 'Raccolta consenso',
                    sezioni: [{
                        titolo: null,
                        campi: [
                            {
                                campo: 'modello_id',
                                etichetta: 'Modello in vigore *',
                                genere: 'selezione',
                                opzioni: opzioniDa(dati.modelli, 'id', voce => `${voce.titolo} · v${voce.versione}`),
                                ampio: true
                            },
                            { campo: 'modalita_raccolta', etichetta: 'Modalità di raccolta', genere: 'selezione', opzioni: MODALITA, vuoto: false },
                            { campo: 'data_concessione', etichetta: 'Data di raccolta', tipo: 'date' },
                            { campo: 'note', etichetta: 'Note', genere: 'area', ampio: true }
                        ]
                    }],
                    valori: { modalita_raccolta: 'cartaceo', data_concessione: fmt.oggiIso(), modello_id: '' },
                    etichettaSalva: 'Registra consenso',
                    onSalva: stato => call('consensi.registra', { ...stato, paziente_id: paziente.id })
                });
                await disegna();
            };

            const revoca = async riga => {
                const procedi = await conferma({
                    titolo: 'Revocare il consenso?',
                    messaggio: `Il consenso "${riga.codice}" verrà revocato. La revoca è registrata e non cancella lo storico.`,
                    etichettaConferma: 'Revoca',
                    distruttiva: true
                });
                if (!procedi) return;
                if (esito(await call('consensi.revoca', { id: riga.id }), 'Consenso revocato')) await disegna();
            };

            const obbligatorieScoperte = dati.scoperture.filter(voce => voce.obbligatorio);

            rimpiazza(contenitore, [
                obbligatorieScoperte.length > 0
                    ? avviso({
                        tono: 'danger',
                        simbolo: 'gpp_maybe',
                        titolo: 'Consensi obbligatori non in regola',
                        voci: obbligatorieScoperte.map(voce => `${voce.titolo} — ${voce.motivo}`)
                    })
                    : avviso({
                        tono: 'info',
                        simbolo: 'verified_user',
                        titolo: 'Consensi in regola',
                        voci: ['Tutti i consensi obbligatori risultano raccolti sulla versione in vigore.']
                    }),
                dati.scoperture.length > obbligatorieScoperte.length
                    ? avviso({
                        tono: 'warning',
                        simbolo: 'info',
                        titolo: 'Consensi facoltativi non raccolti',
                        voci: dati.scoperture.filter(voce => !voce.obbligatorio).map(voce => `${voce.titolo} — ${voce.motivo}`)
                    })
                    : null,
                pannello({
                    titolo: 'Storico dei consensi',
                    azioni: puoGestire && dati.modelli.length > 0
                        ? [bottone({ etichetta: 'Raccogli consenso', simbolo: 'add_task', onClick: raccogli })]
                        : [],
                    flush: true
                }, tabella({
                    colonne: [
                        { titolo: 'Ambito', rendi: riga => distintivo(fmt.etichettaStato(riga.ambito), 'info') },
                        { titolo: 'Modello', campo: 'codice' },
                        { titolo: 'Versione', numerica: true, rendi: riga => `v${riga.versione}` },
                        { titolo: 'Raccolto il', rendi: riga => fmt.data(riga.data_concessione) },
                        { titolo: 'Scadenza', rendi: riga => (riga.data_scadenza ? fmt.data(riga.data_scadenza) : 'senza scadenza') },
                        { titolo: 'Modalità', rendi: riga => fmt.etichettaStato(riga.modalita_raccolta) },
                        {
                            titolo: 'Stato',
                            rendi: riga => distintivo(
                                fmt.etichettaStato(riga.stato_effettivo),
                                TONI_STATO[riga.stato_effettivo] || 'neutral'
                            )
                        },
                        {
                            titolo: '',
                            rendi: riga => azioniRiga([
                                puoGestire && riga.stato_effettivo === 'concesso' ? bottone({
                                    simbolo: 'block', variante: 'ghost', piccolo: true,
                                    titolo: 'Revoca consenso', onClick: () => revoca(riga)
                                }) : null
                            ])
                        }
                    ],
                    righe: dati.raccolti,
                    vuotoTitolo: 'Nessun consenso raccolto',
                    vuotoTesto: 'Registra i consensi al trattamento dei dati e agli atti sanitari prima di procedere con le cure.',
                    vuotoSimbolo: 'assignment_turned_in'
                }))
            ]);
        };

        await disegna();
        return contenitore;
    }
};
