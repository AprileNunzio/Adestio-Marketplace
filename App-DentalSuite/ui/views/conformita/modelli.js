import { el, rimpiazza } from '../../components/dom.js';
import { pannello, bottone, distintivo, statistica, griglia, avviso } from '../../components/layout.js';
import { tabella, azioniRiga } from '../../components/tabella.js';
import { call } from '../../kernel/transport.js';
import { can } from '../../security/permissions.js';
import * as fmt from '../../kernel/format.js';
import { elenco, oggetto } from '../shared/vista.js';
import { apriForm } from '../shared/form_modale.js';

const AMBITI = [
    { valore: 'sanitario', etichetta: 'Trattamento sanitario' },
    { valore: 'privacy', etichetta: 'Informativa privacy GDPR' },
    { valore: 'promemoria', etichetta: 'Promemoria appuntamenti' },
    { valore: 'marketing', etichetta: 'Comunicazioni commerciali' },
    { valore: 'ricerca', etichetta: 'Finalità di ricerca' },
    { valore: 'immagini', etichetta: 'Uso di immagini cliniche' }
];

const CAMPI = [
    { campo: 'codice', etichetta: 'Codice modello *', aiuto: 'Le nuove versioni condividono lo stesso codice' },
    { campo: 'titolo', etichetta: 'Titolo *' },
    { campo: 'ambito', etichetta: 'Ambito *', genere: 'selezione', opzioni: AMBITI, vuoto: false },
    { campo: 'validita_mesi', etichetta: 'Validità (mesi, 0 = illimitata)', genere: 'numero', passo: '1' },
    { campo: 'obbligatorio', etichetta: 'Obbligatorio per procedere alle cure', genere: 'booleano' },
    { campo: 'testo', etichetta: 'Testo del consenso *', genere: 'area', righe: 10, ampio: true }
];

export default {
    rendi: async ({ naviga }) => {
        const puoGestire = await can('consensi_manage');
        const contenitore = el('div', { class: 'ds-root' });

        const disegna = async () => {
            const [modelli, scoperture] = await Promise.all([
                call('consensi.modelli', { includeArchived: true }).then(elenco),
                call('consensi.scopertureStudio', {}).then(risultato =>
                    oggetto(risultato, { pazienti_scoperti: [], totale: 0, modelli_obbligatori: 0 }))
            ]);

            const inVigore = modelli.filter(riga => Number(riga.in_vigore) === 1);

            const apri = async modello => {
                await apriForm({
                    titolo: modello ? `Nuova versione di ${modello.codice}` : 'Nuovo modello di consenso',
                    sezioni: [{ titolo: null, campi: CAMPI }],
                    valori: modello
                        ? { ...modello }
                        : { ambito: 'sanitario', obbligatorio: 0, validita_mesi: 0, codice: '', titolo: '', testo: '' },
                    ampia: true,
                    etichettaSalva: modello ? 'Salva versione' : 'Crea modello',
                    onSalva: stato => call('consensi.salvaModello', stato)
                });
                await disegna();
            };

            rimpiazza(contenitore, [
                griglia('stats', [
                    statistica({ etichetta: 'Modelli in vigore', valore: String(inVigore.length) }),
                    statistica({ etichetta: 'Di cui obbligatori', valore: String(scoperture.modelli_obbligatori) }),
                    statistica({
                        etichetta: 'Pazienti non in regola',
                        valore: String(scoperture.totale),
                        tono: scoperture.totale > 0 ? 'negativo' : 'positivo'
                    })
                ]),
                scoperture.totale > 0
                    ? avviso({
                        tono: 'danger',
                        simbolo: 'gpp_maybe',
                        titolo: `${scoperture.totale} pazienti senza consenso obbligatorio valido`,
                        voci: ['Nessuna cura dovrebbe essere erogata prima della regolarizzazione.']
                    })
                    : null,
                pannello({
                    titolo: 'Modelli di consenso',
                    azioni: puoGestire ? [bottone({ etichetta: 'Nuovo modello', simbolo: 'add', onClick: () => apri(null) })] : [],
                    flush: true
                }, tabella({
                    colonne: [
                        { titolo: 'Codice', campo: 'codice' },
                        { titolo: 'Titolo', campo: 'titolo' },
                        { titolo: 'Ambito', rendi: riga => distintivo(fmt.etichettaStato(riga.ambito), 'info') },
                        { titolo: 'Versione', numerica: true, rendi: riga => `v${riga.versione}` },
                        {
                            titolo: 'Validità',
                            rendi: riga => (Number(riga.validita_mesi) > 0 ? `${riga.validita_mesi} mesi` : 'illimitata')
                        },
                        {
                            titolo: 'Stato',
                            rendi: riga => (Number(riga.in_vigore) === 1
                                ? distintivo('In vigore', 'success')
                                : distintivo('Superato', 'neutral'))
                        },
                        {
                            titolo: 'Obbligatorio',
                            rendi: riga => (Number(riga.obbligatorio) === 1 ? distintivo('Sì', 'warning') : '—')
                        },
                        {
                            titolo: '',
                            rendi: riga => azioniRiga([
                                puoGestire && Number(riga.in_vigore) === 1 ? bottone({
                                    simbolo: 'edit_note', variante: 'ghost', piccolo: true,
                                    titolo: 'Modifica o versiona', onClick: () => apri(riga)
                                }) : null
                            ])
                        }
                    ],
                    righe: modelli,
                    vuotoTitolo: 'Nessun modello configurato',
                    vuotoTesto: 'Definisci i testi di consenso: informativa privacy, trattamento sanitario, uso delle immagini.',
                    vuotoSimbolo: 'assignment'
                })),
                pannello({ titolo: 'Pazienti da regolarizzare', flush: true }, tabella({
                    colonne: [
                        { titolo: 'Paziente', campo: 'nominativo' },
                        {
                            titolo: 'Consensi mancanti',
                            rendi: riga => el('div', { class: 'ds-toolbar' },
                                riga.mancanti.map(voce => distintivo(`${voce.titolo}: ${voce.motivo}`, 'danger')))
                        },
                        {
                            titolo: '',
                            rendi: riga => azioniRiga([
                                bottone({
                                    simbolo: 'folder_open', variante: 'ghost', piccolo: true, titolo: 'Apri cartella',
                                    onClick: () => naviga('paziente', { id: riga.paziente_id })
                                })
                            ])
                        }
                    ],
                    righe: scoperture.pazienti_scoperti,
                    vuotoTitolo: 'Tutti i pazienti sono in regola',
                    vuotoTesto: 'Nessun paziente attivo risulta privo dei consensi obbligatori in vigore.',
                    vuotoSimbolo: 'verified_user'
                }))
            ]);
        };

        await disegna();
        return contenitore;
    }
};
