import { el, rimpiazza } from '../../components/dom.js';
import { pannello, bottone, distintivo, statistica, griglia, scheletro, vuoto } from '../../components/layout.js';
import { tabella, azioniRiga } from '../../components/tabella.js';
import { call } from '../../kernel/transport.js';
import { can } from '../../security/permissions.js';
import * as fmt from '../../kernel/format.js';
import { elenco, oggetto } from '../shared/vista.js';
import { apriForm } from '../shared/form_modale.js';
import { apriPreventivo } from '../contabilita/preventivo_editor.js';
import { pannelloIncassi } from './economia_incassi.js';

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
            vedeRate: await can('rate_view'),
            vedeIncassi: await can('incassi_view'),
            registraIncassi: await can('incassi_edit')
        };
        const contenitore = el('div', { class: 'ds-root' }, scheletro(3));

        const disegna = async () => {
            const [preventivi, piani, situazione] = await Promise.all([
                call('preventivi.list', { paziente_id: paziente.id }).then(elenco),
                permessi.vedeRate
                    ? call('rate.listByPaziente', { paziente_id: paziente.id }).then(elenco)
                    : Promise.resolve([]),
                call('economia.paziente', { paziente_id: paziente.id })
                    .then(risultato => oggetto(risultato, null))
            ]);

            if (!situazione) {
                rimpiazza(contenitore, vuoto({
                    titolo: 'Piano economico non consultabile',
                    testo: 'Serve il permesso di consultazione dei preventivi per vedere la situazione economica del paziente.',
                    simbolo: 'lock'
                }));
                return;
            }

            const residuoRate = piani.reduce((somma, piano) => somma + Number(piano.residuo || 0), 0);
            const scadute = piani.reduce((somma, piano) => somma + Number(piano.rate_scadute || 0), 0);
            const cassa = { righe: situazione.incassi || [], totale: situazione.incassato };

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
                    statistica({
                        etichetta: 'Prestazioni eseguite',
                        valore: fmt.euro(situazione.eseguito),
                        nota: `${situazione.prestazioni_eseguite} prestazioni a carico del paziente`
                    }),
                    statistica({
                        etichetta: 'Incassato',
                        valore: fmt.euro(situazione.incassato),
                        nota: `${situazione.movimenti_incasso} movimenti registrati`,
                        tono: 'positivo'
                    }),
                    statistica({
                        etichetta: situazione.etichetta_saldo,
                        valore: situazione.in_pari ? '—' : fmt.euro(situazione.valore_saldo),
                        nota: situazione.credito > 0 ? 'incassato in eccesso rispetto alle prestazioni eseguite' : '',
                        tono: situazione.a_debito > 0 ? 'negativo' : 'positivo'
                    }),
                    situazione.preventivato > 0
                        ? statistica({
                            etichetta: 'Preventivi accettati',
                            valore: fmt.euro(situazione.preventivato),
                            nota: `${situazione.preventivi_accettati} piani di cura accettati`
                        })
                        : null,
                    residuoRate > 0 || scadute > 0
                        ? statistica({
                            etichetta: 'Residuo rateale',
                            valore: fmt.euro(residuoRate),
                            nota: scadute > 0 ? `${scadute} rate scadute` : '',
                            tono: scadute > 0 ? 'negativo' : undefined
                        })
                        : null
                ].filter(Boolean)),
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
                            titolo: 'Pagamento & Rate',
                            rendi: riga => {
                                if (riga.numero_rate > 1) {
                                    return distintivo(`${riga.numero_rate} rate`, 'info');
                                }
                                if (riga.metodo_pagamento) {
                                    return el('span', { class: 'ds-muted', style: 'font-size: 0.82rem;' }, fmt.etichettaStato(riga.metodo_pagamento));
                                }
                                return el('span', { class: 'ds-muted' }, '—');
                            }
                        },
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
                permessi.vedeIncassi ? pannelloIncassi({
                    righe: cassa.righe,
                    totale: situazione.incassato,
                    pazienteId: paziente.id,
                    puoRegistrare: permessi.registraIncassi,
                    onAggiornato: disegna
                }) : null,
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
