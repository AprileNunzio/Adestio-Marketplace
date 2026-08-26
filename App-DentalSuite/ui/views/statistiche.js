import { el } from '../components/dom.js';
import { intestazione, pannello, statistica, griglia, spaziatore, avviso } from '../components/layout.js';
import { barreOrizzontali } from '../components/barre.js';
import { call } from '../kernel/transport.js';
import { can } from '../security/permissions.js';
import * as fmt from '../kernel/format.js';
import { montaVista, oggetto, elenco } from './shared/vista.js';

function inizioAnno() {
    return `${new Date().getFullYear()}-01-01`;
}

function tonoMargine(valore) {
    return Number(valore) >= 0 ? 'positivo' : 'negativo';
}

export default {
    rendi: async ({ indietro }) => {
        const vedeEconomia = await can('direzione_economics');
        const filtro = { dal: inizioAnno(), al: fmt.oggiIso() };

        return montaVista({
            accento: 'statistiche',
            carica: async () => {
                const [produzione, perMedico, perBranca, economia] = await Promise.all([
                    call('statistiche.produzione', filtro).then(risultato => oggetto(risultato, null)),
                    call('statistiche.perMedico', filtro).then(elenco),
                    call('statistiche.perBranca', filtro).then(elenco),
                    vedeEconomia
                        ? call('statistiche.economia', filtro).then(risultato => oggetto(risultato, null))
                        : Promise.resolve(null)
                ]);
                return { produzione, perMedico, perBranca, economia };
            },
            disegna: ({ produzione, perMedico, perBranca, economia }, aggiorna) => {
                const campoDal = el('input', {
                    class: 'ds-input', type: 'date', value: filtro.dal,
                    onChange: evento => { filtro.dal = evento.target.value; aggiorna(); }
                });
                const campoAl = el('input', {
                    class: 'ds-input', type: 'date', value: filtro.al,
                    onChange: evento => { filtro.al = evento.target.value; aggiorna(); }
                });

                const blocchi = [
                    intestazione({
                        titolo: 'Statistiche & Direzione',
                        sottotitolo: `Periodo ${fmt.data(filtro.dal)} — ${fmt.data(filtro.al)}`,
                        simbolo: 'monitoring',
                        indietro,
                        azioni: [campoDal, campoAl]
                    })
                ];

                if (produzione) {
                    blocchi.push(griglia('stats', [
                        statistica({ etichetta: 'Pazienti in carico', valore: String(produzione.pazienti_attivi) }),
                        statistica({
                            etichetta: 'Produzione eseguita',
                            valore: fmt.euro(produzione.valore_eseguito),
                            nota: `${produzione.trattamenti_eseguiti} trattamenti`,
                            tono: 'positivo'
                        }),
                        statistica({
                            etichetta: 'Valore medio trattamento',
                            valore: fmt.euro(produzione.valore_medio_trattamento)
                        }),
                        statistica({
                            etichetta: 'In programma',
                            valore: fmt.euro(produzione.valore_pianificato - produzione.valore_eseguito)
                        }),
                        statistica({
                            etichetta: 'Crediti da incassare',
                            valore: fmt.euro(produzione.crediti_da_riscuotere || 0),
                            nota: `${produzione.pazienti_a_debito || 0} pazienti a debito`,
                            tono: (produzione.crediti_da_riscuotere || 0) > 0 ? 'negativo' : 'positivo'
                        }),
                        statistica({
                            etichetta: 'Tasso di assenza',
                            valore: fmt.percentuale(produzione.tasso_assenza),
                            nota: `${produzione.appuntamenti_conclusi} visite concluse`,
                            tono: Number(produzione.tasso_assenza) > 15 ? 'negativo' : undefined
                        })
                    ]));

                    blocchi.push(pannello({ titolo: 'Produzione per mese' },
                        barreOrizzontali(produzione.per_mese.map(voce => ({
                            etichetta: fmt.mese(voce.etichetta),
                            totale: voce.totale
                        })), fmt.euro)));
                }

                blocchi.push(el('div', { class: 'ds-grid ds-grid--cards' }, [
                    pannello({ titolo: 'Produzione per medico' }, barreOrizzontali(perMedico, fmt.euro)),
                    pannello({ titolo: 'Produzione per branca clinica' }, barreOrizzontali(perBranca, fmt.euro))
                ]));

                if (!vedeEconomia) {
                    blocchi.push(avviso({
                        tono: 'info',
                        simbolo: 'lock',
                        titolo: 'Analisi economica riservata',
                        voci: [
                            'Margini, redditività ed esposizione creditizia sono accessibili solo con il permesso "direzione_economics", riservato alla Direzione Sanitaria.'
                        ]
                    }));
                    return blocchi;
                }

                if (economia) {
                    blocchi.push(pannello({
                        titolo: 'Direzione Sanitaria · conto economico dello studio',
                        azioni: [spaziatore()]
                    }, [
                        griglia('stats', [
                            statistica({ etichetta: 'Incassato', valore: fmt.euro(economia.totale_incassi), tono: 'positivo' }),
                            statistica({ etichetta: 'Spese', valore: fmt.euro(economia.totale_spese), tono: 'negativo' }),
                            statistica({ etichetta: 'Compensi staff', valore: fmt.euro(economia.compensi_staff) }),
                            statistica({ etichetta: 'Materiali', valore: fmt.euro(economia.costo_materiali) }),
                            statistica({
                                etichetta: 'Margine netto',
                                valore: fmt.euro(economia.margine_netto),
                                nota: fmt.percentuale(economia.marginalita_percentuale),
                                tono: tonoMargine(economia.margine_netto)
                            })
                        ]),
                        griglia('stats', [
                            statistica({
                                etichetta: 'Crediti verso Pazienti (Da incassare)',
                                valore: fmt.euro(economia.crediti_da_riscuotere || 0),
                                nota: `${economia.pazienti_a_debito || 0} pazienti a debito`,
                                tono: (economia.crediti_da_riscuotere || 0) > 0 ? 'negativo' : 'positivo'
                            }),
                            statistica({
                                etichetta: 'Anticipi (Credito Pazienti)',
                                valore: fmt.euro(economia.anticipi_pazienti || 0),
                                nota: `${economia.pazienti_a_credito || 0} pazienti a credito`,
                                tono: 'positivo'
                            }),
                            statistica({
                                etichetta: 'Credito rateale aperto',
                                valore: fmt.euro(economia.importo_aperto),
                                nota: `${economia.rate_aperte} rate aperte`
                            }),
                            statistica({
                                etichetta: 'Rate scadute',
                                valore: fmt.euro(economia.importo_scaduto),
                                nota: `${economia.rate_scadute} rate insolute`,
                                tono: Number(economia.importo_scaduto) > 0 ? 'negativo' : undefined
                            })
                        ])
                    ]));

                    blocchi.push(el('div', { class: 'ds-grid ds-grid--cards' }, [
                        pannello({ titolo: 'Incassi per mese' },
                            barreOrizzontali(economia.incassi_per_mese.map(voce => ({
                                etichetta: fmt.mese(voce.etichetta),
                                totale: voce.totale
                            })), fmt.euro)),
                        pannello({ titolo: 'Spese per categoria' },
                            barreOrizzontali(economia.spese_per_categoria.map(voce => ({
                                etichetta: fmt.etichettaStato(voce.etichetta),
                                totale: voce.totale
                            })), fmt.euro)),
                        pannello({ titolo: 'Incassi per metodo di pagamento' },
                            barreOrizzontali(economia.incassi_per_metodo.map(voce => ({
                                etichetta: fmt.etichettaStato(voce.etichetta),
                                totale: voce.totale
                            })), fmt.euro))
                    ]));
                }

                return blocchi;
            }
        });
    }
};
