import { el, rimpiazza } from '../../components/dom.js';
import { pannello, bottone, distintivo, scheletro, avviso } from '../../components/layout.js';
import { tabella, azioniRiga } from '../../components/tabella.js';
import { apriModale, conferma } from '../../components/modale.js';
import { costruisciCampi } from '../../components/campi.js';
import { esito, errore, successo } from '../../components/notifica.js';
import { creaFirmaPad } from '../../components/firma_pad.js';
import { call } from '../../kernel/transport.js';
import { can } from '../../security/permissions.js';
import * as fmt from '../../kernel/format.js';
import { elenco, oggetto } from '../shared/vista.js';

const TIPI = [
    { valore: 'consenso', etichetta: 'Consenso informato' },
    { valore: 'piano_cura', etichetta: 'Piano di cura' },
    { valore: 'preventivo', etichetta: 'Preventivo' },
    { valore: 'prescrizione', etichetta: 'Prescrizione' },
    { valore: 'informativa', etichetta: 'Informativa' },
    { valore: 'altro', etichetta: 'Altro documento' }
];

const RUOLI = [
    { valore: 'paziente', etichetta: 'Paziente' },
    { valore: 'tutore', etichetta: 'Genitore o tutore' },
    { valore: 'medico', etichetta: 'Medico' },
    { valore: 'testimone', etichetta: 'Testimone' }
];

export default {
    rendi: async ({ paziente }) => {
        const puoFirmare = await can('firme_sign');
        const contenitore = el('div', { class: 'ds-root' }, scheletro(3));

        const disegna = async () => {
            const [documenti, consensi] = await Promise.all([
                call('firme.listByPaziente', { paziente_id: paziente.id }).then(elenco),
                call('consensi.listByPaziente', { paziente_id: paziente.id })
                    .then(risultato => oggetto(risultato, { modelli: [] }))
            ]);

            const firma = async () => {
                const stato = {
                    tipo_documento: 'consenso',
                    titolo: '',
                    testo: '',
                    firmatario: paziente.minore ? '' : paziente.nominativo,
                    ruolo_firmatario: paziente.minore ? 'tutore' : 'paziente',
                    data_firma: fmt.oggiIso()
                };

                const pad = creaFirmaPad();
                const campi = [
                    { campo: 'tipo_documento', etichetta: 'Tipo di documento', genere: 'selezione', opzioni: TIPI, vuoto: false },
                    { campo: 'titolo', etichetta: 'Titolo del documento', ampio: true },
                    { campo: 'firmatario', etichetta: 'Chi firma *' },
                    { campo: 'ruolo_firmatario', etichetta: 'In qualità di', genere: 'selezione', opzioni: RUOLI, vuoto: false },
                    { campo: 'data_firma', etichetta: 'Data', tipo: 'date' },
                    { campo: 'testo', etichetta: 'Testo integrale sottoscritto *', genere: 'area', righe: 8, ampio: true }
                ];

                const modelli = (consensi.modelli || []).map(modello =>
                    bottone({
                        etichetta: `${modello.titolo} v${modello.versione}`,
                        simbolo: 'content_paste',
                        variante: 'ghost',
                        piccolo: true,
                        onClick: () => {
                            stato.titolo = `${modello.titolo} (v${modello.versione})`;
                            stato.testo = modello.testo;
                            rimpiazza(corpoCampi, costruisciCampi(campi, stato, aggiorna));
                        }
                    }));

                const aggiorna = (campo, valore) => {
                    stato[campo] = valore;
                };

                const corpoCampi = el('div', { class: 'ds-grid ds-grid--form' },
                    costruisciCampi(campi, stato, aggiorna));

                await apriModale({
                    titolo: 'Acquisizione firma',
                    ampia: true,
                    corpo: [
                        modelli.length > 0
                            ? el('div', {}, [
                                el('div', { class: 'ds-field__label' }, 'Precompila da un modello in vigore'),
                                el('div', { class: 'ds-toolbar' }, modelli)
                            ])
                            : null,
                        corpoCampi,
                        el('div', { class: 'ds-field__label' }, 'Firma grafometrica'),
                        pad.nodo
                    ],
                    azioni: [
                        { etichetta: 'Annulla', variante: 'ghost', esito: null },
                        {
                            etichetta: 'Registra firma',
                            simbolo: 'draw',
                            onAzione: async () => {
                                if (pad.vuota()) {
                                    errore('Acquisire la firma prima di registrare il documento');
                                    return false;
                                }
                                const risultato = await call('firme.registra', {
                                    ...stato,
                                    paziente_id: paziente.id,
                                    firma_immagine: pad.immagine()
                                });
                                return esito(risultato, 'Documento firmato e registrato');
                            }
                        }
                    ]
                });
                await disegna();
            };

            const verifica = async riga => {
                const stato = oggetto(await call('firme.verifica', { id: riga.id }), null);
                if (!stato) {
                    errore('Verifica non riuscita');
                    return;
                }
                if (stato.integro) {
                    successo('Documento integro: impronta coincidente con quella registrata alla firma');
                    return;
                }
                errore('Documento alterato dopo la firma: le impronte non coincidono');
            };

            const annulla = async riga => {
                const procedi = await conferma({
                    titolo: 'Annullare il documento firmato?',
                    messaggio: `"${riga.titolo || riga.tipo_documento}" verrà annullato. Il documento resta nel registro come annullato.`,
                    etichettaConferma: 'Annulla documento',
                    distruttiva: true
                });
                if (!procedi) return;
                if (esito(await call('firme.revoca', { id: riga.id }), 'Documento annullato')) await disegna();
            };

            rimpiazza(contenitore, [
                paziente.minore
                    ? avviso({
                        tono: 'warning',
                        simbolo: 'escalator_warning',
                        titolo: 'Paziente minorenne',
                        voci: ['I documenti vanno sottoscritti dal genitore o dal tutore legale.']
                    })
                    : null,
                pannello({
                    titolo: `Documenti sottoscritti · ${documenti.length}`,
                    azioni: puoFirmare
                        ? [bottone({ etichetta: 'Acquisisci firma', simbolo: 'draw', onClick: firma })]
                        : [],
                    flush: true
                }, tabella({
                    colonne: [
                        { titolo: 'Data', rendi: riga => fmt.data(riga.data_firma) },
                        { titolo: 'Tipo', rendi: riga => distintivo(fmt.etichettaStato(riga.tipo_documento), 'info') },
                        { titolo: 'Titolo', campo: 'titolo' },
                        { titolo: 'Firmatario', campo: 'firmatario' },
                        { titolo: 'In qualità di', rendi: riga => fmt.etichettaStato(riga.ruolo_firmatario) },
                        { titolo: 'Metodo', rendi: riga => fmt.etichettaStato(riga.metodo_firma) },
                        {
                            titolo: 'Impronta',
                            rendi: riga => el('code', {}, String(riga.impronta_documento).slice(0, 12))
                        },
                        {
                            titolo: '',
                            rendi: riga => azioniRiga([
                                bottone({
                                    simbolo: 'verified', variante: 'ghost', piccolo: true,
                                    titolo: 'Verifica integrità', onClick: () => verifica(riga)
                                }),
                                puoFirmare ? bottone({
                                    simbolo: 'delete', variante: 'ghost', piccolo: true,
                                    titolo: 'Annulla documento', onClick: () => annulla(riga)
                                }) : null
                            ])
                        }
                    ],
                    righe: documenti,
                    vuotoTitolo: 'Nessun documento firmato',
                    vuotoTesto: 'Acquisisci la firma su consensi informati e piani di cura: il testo sottoscritto viene sigillato con un\'impronta verificabile.',
                    vuotoSimbolo: 'draw'
                }))
            ]);
        };

        await disegna();
        return contenitore;
    }
};
