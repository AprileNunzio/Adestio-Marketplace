import { el, rimpiazza } from '../../components/dom.js';
import { pannello, bottone, distintivo, statistica, griglia, scheletro } from '../../components/layout.js';
import { tabella, azioniRiga } from '../../components/tabella.js';
import { call } from '../../kernel/transport.js';
import { can } from '../../security/permissions.js';
import * as fmt from '../../kernel/format.js';
import { elenco } from '../shared/vista.js';
import { apriForm } from '../shared/form_modale.js';
import { apriPreventivo } from '../contabilita/preventivo_editor.js';

const TONI_STATO = {
    bozza: 'neutral',
    inviato: 'info',
    accettato: 'success',
    rifiutato: 'danger',
    scaduto: 'warning',
    annullato: 'neutral'
};

export default {
    rendi: async ({ paziente }) => {
        const permessi = {
            preventivi: await can('preventivi_edit'),
            rate: await can('rate_edit'),
            vedeRate: await can('rate_view')
        };
        const contenitore = el('div', { class: 'ds-root' }, scheletro(3));

        const disegna = async () => {
            const [preventivi, piani] = await Promise.all([
                call('preventivi.list', { paziente_id: paziente.id }).then(elenco),
                permessi.vedeRate
                    ? call('rate.listByPaziente', { paziente_id: paziente.id }).then(elenco)
                    : Promise.resolve([])
            ]);

            const accettati = preventivi.filter(riga => riga.stato === 'accettato');
            const valoreAccettato = accettati.reduce((somma, riga) => somma + Number(riga.totale_netto || 0), 0);
            const residuoRate = piani.reduce((somma, piano) => somma + Number(piano.residuo || 0), 0);
            const scadute = piani.reduce((somma, piano) => somma + Number(piano.rate_scadute || 0), 0);

            const creaPiano = async preventivo => {
                await apriForm({
                    titolo: `Piano rateale · preventivo ${preventivo.numero_preventivo}`,
                    sezioni: [{
                        titolo: null,
                        campi: [
                            { campo: 'totale_piano', etichetta: 'Totale da rateizzare (€)', genere: 'numero' },
                            { campo: 'acconto_iniziale', etichetta: 'Acconto iniziale (€)', genere: 'numero' },
                            { campo: 'numero_rate', etichetta: 'Numero di rate', genere: 'numero', passo: '1', minimo: 1 },
                            { campo: 'cadenza_mesi', etichetta: 'Cadenza (mesi)', genere: 'numero', passo: '1', minimo: 1 },
                            { campo: 'prima_scadenza', etichetta: 'Prima scadenza', tipo: 'date' },
                            { campo: 'note', etichetta: 'Note', genere: 'area', ampio: true }
                        ]
                    }],
                    valori: {
                        totale_piano: preventivo.totale_netto,
                        acconto_iniziale: preventivo.acconto_richiesto || 0,
                        numero_rate: 6,
                        cadenza_mesi: 1,
                        prima_scadenza: fmt.oggiIso()
                    },
                    etichettaSalva: 'Genera piano',
                    onSalva: stato => call('rate.creaPiano', {
                        ...stato,
                        paziente_id: paziente.id,
                        preventivo_id: preventivo.id
                    })
                });
                await disegna();
            };

            const saldaRata = async rata => {
                await apriForm({
                    titolo: `Saldo rata ${rata.numero_rata} · ${fmt.euro(rata.importo)}`,
                    sezioni: [{
                        titolo: null,
                        campi: [
                            {
                                campo: 'metodo_pagamento',
                                etichetta: 'Metodo di pagamento',
                                genere: 'selezione',
                                vuoto: false,
                                opzioni: [
                                    { valore: 'contanti', etichetta: 'Contanti' },
                                    { valore: 'bancomat', etichetta: 'Bancomat' },
                                    { valore: 'carta_credito', etichetta: 'Carta di credito' },
                                    { valore: 'bonifico', etichetta: 'Bonifico' },
                                    { valore: 'assegno', etichetta: 'Assegno' }
                                ]
                            },
                            { campo: 'numero_ricevuta', etichetta: 'Numero ricevuta' },
                            { campo: 'data_pagamento', etichetta: 'Data incasso', tipo: 'date' }
                        ]
                    }],
                    valori: { metodo_pagamento: 'contanti', data_pagamento: fmt.oggiIso() },
                    etichettaSalva: 'Registra incasso',
                    onSalva: stato => call('rate.pagaRata', { ...stato, id: rata.id })
                });
                await disegna();
            };

            const rateAperte = piani.flatMap(piano => piano.rate.filter(rata => rata.stato !== 'pagata'));

            rimpiazza(contenitore, [
                griglia('stats', [
                    statistica({ etichetta: 'Preventivi emessi', valore: String(preventivi.length) }),
                    statistica({ etichetta: 'Valore accettato', valore: fmt.euro(valoreAccettato), tono: 'positivo' }),
                    statistica({ etichetta: 'Residuo rateale', valore: fmt.euro(residuoRate) }),
                    statistica({
                        etichetta: 'Rate scadute',
                        valore: String(scadute),
                        tono: scadute > 0 ? 'negativo' : undefined
                    })
                ]),
                pannello({
                    titolo: 'Preventivi e piani di cura',
                    azioni: permessi.preventivi ? [bottone({
                        etichetta: 'Nuovo preventivo',
                        simbolo: 'add',
                        onClick: async () => {
                            await apriPreventivo({ pazienteId: paziente.id });
                            await disegna();
                        }
                    })] : [],
                    flush: true
                }, tabella({
                    colonne: [
                        { titolo: 'Numero', campo: 'numero_preventivo' },
                        { titolo: 'Emissione', rendi: riga => fmt.data(riga.data_emissione) },
                        {
                            titolo: 'Stato',
                            rendi: riga => distintivo(fmt.etichettaStato(riga.stato), TONI_STATO[riga.stato] || 'neutral')
                        },
                        { titolo: 'Totale', numerica: true, rendi: riga => fmt.euro(riga.totale_netto) },
                        {
                            titolo: '',
                            rendi: riga => azioniRiga([
                                permessi.preventivi ? bottone({
                                    simbolo: 'edit', variante: 'ghost', piccolo: true, titolo: 'Apri preventivo',
                                    onClick: async () => {
                                        await apriPreventivo({ pazienteId: paziente.id, preventivoId: riga.id });
                                        await disegna();
                                    }
                                }) : null,
                                permessi.rate && riga.stato === 'accettato' ? bottone({
                                    simbolo: 'event_repeat', variante: 'ghost', piccolo: true,
                                    titolo: 'Genera piano rateale', onClick: () => creaPiano(riga)
                                }) : null
                            ])
                        }
                    ],
                    righe: preventivi,
                    vuotoTitolo: 'Nessun preventivo per questo paziente',
                    vuotoTesto: 'Emetti un preventivo per formalizzare il piano di cura economico.',
                    vuotoSimbolo: 'receipt_long'
                })),
                permessi.vedeRate ? pannello({
                    titolo: `Scadenziario rate aperte · ${fmt.euro(residuoRate)}`,
                    flush: true
                }, tabella({
                    colonne: [
                        { titolo: 'Rata', numerica: true, campo: 'numero_rata' },
                        { titolo: 'Scadenza', rendi: riga => fmt.data(riga.data_scadenza) },
                        { titolo: 'Importo', numerica: true, rendi: riga => fmt.euro(riga.importo) },
                        {
                            titolo: 'Stato',
                            rendi: riga => distintivo(
                                riga.data_scadenza < fmt.oggiIso() ? 'Scaduta' : 'In attesa',
                                riga.data_scadenza < fmt.oggiIso() ? 'danger' : 'warning'
                            )
                        },
                        {
                            titolo: '',
                            rendi: riga => azioniRiga([
                                permessi.rate ? bottone({
                                    etichetta: 'Salda', simbolo: 'payments', piccolo: true,
                                    onClick: () => saldaRata(riga)
                                }) : null
                            ])
                        }
                    ],
                    righe: rateAperte,
                    vuotoTitolo: 'Nessuna rata aperta',
                    vuotoTesto: 'Il paziente non ha piani rateali con scadenze da incassare.',
                    vuotoSimbolo: 'event_available'
                })) : null
            ]);
        };

        await disegna();
        return contenitore;
    }
};
