import { el, rimpiazza, icona } from '../../components/dom.js';
import { pannello, bottone, distintivo, spaziatore, vuoto, avviso, statistica, griglia } from '../../components/layout.js';
import { tabella, azioniRiga } from '../../components/tabella.js';
import { esito, errore } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import * as fmt from '../../kernel/format.js';
import { oggetto, pagina, elenco } from '../shared/vista.js';
import { selettorePaziente } from '../shared/selettore_paziente.js';

const TONI_STATO = {
    aperta: 'success',
    chiusa: 'neutral',
    fallita: 'danger'
};

export function consoleTrasmissione({ pazienteIniziale, naviga, onIndietro }) {
    const contenitore = el('div', { class: 'ds-trasmetti-console' });
    let inviatoIniziale = false;
    let postazioniSelezionate = new Set();
    let pazienteSelezionatoId = pazienteIniziale || null;
    let pazienteSelezionatoDati = null;
    let intervalloAggiornamento = null;

    const caricaPaziente = async (id) => {
        if (!id) {
            pazienteSelezionatoDati = null;
            return;
        }
        const dati = await call('pazienti.read', { id });
        if (dati && (dati.data || dati.id)) {
            pazienteSelezionatoDati = dati.data || dati;
        }
    };

    const disegna = async () => {
        const [statoPostazioni, storico] = await Promise.all([
            call('trasmissioni.postazioni', {}).then(risultato => oggetto(risultato, { collegate: [], rete: null })),
            call('trasmissioni.elenco', { dimensione: 15 }).then(pagina)
        ]);

        const collegate = statoPostazioni.collegate || [];

        if (postazioniSelezionate.size === 0 && collegate.length === 1) {
            postazioniSelezionate.add(collegate[0].sessione_id);
        }

        if (pazienteSelezionatoId && !pazienteSelezionatoDati) {
            await caricaPaziente(pazienteSelezionatoId);
        }

        const aperte = storico.righe.filter(riga => riga.stato === 'aperta');

        const eseguiInvio = async () => {
            if (!pazienteSelezionatoId) {
                errore('Seleziona prima un paziente da trasmettere');
                return;
            }
            if (postazioniSelezionate.size === 0) {
                errore('Seleziona almeno un monitor online di destinazione');
                return;
            }

            const sessioni = Array.from(postazioniSelezionate);
            const risposta = await call('trasmissioni.invia', {
                paziente_id: pazienteSelezionatoId,
                sessione_ids: sessioni
            });

            if (esito(risposta, 'Cartella clinica trasmessa con successo')) {
                await disegna();
            }
        };

        const chiudi = async riga => {
            if (!esito(await call('trasmissioni.chiudi', { id: riga.id }), 'Scheda chiusa')) return;
            await disegna();
        };

        const selettoreSchermi = () => {
            if (collegate.length === 0) {
                return vuoto({
                    titolo: 'Nessun monitor online rilevato',
                    testo: 'Apri DentalSuite sulla postazione del medico e seleziona "Ricevi" per renderla visibile qui.',
                    simbolo: 'desktop_windows'
                });
            }

            return el('div', { class: 'ds-schermi-grid' }, collegate.map(voce => {
                const selezionato = postazioniSelezionate.has(voce.sessione_id);
                return el('button', {
                    class: `ds-schermo-card ${selezionato ? 'ds-schermo-card--selezionato' : ''} ${voce.in_seduta ? 'ds-schermo-card--in-seduta' : ''}`,
                    type: 'button',
                    onClick: () => {
                        if (postazioniSelezionate.has(voce.sessione_id)) {
                            postazioniSelezionate.delete(voce.sessione_id);
                        } else {
                            postazioniSelezionate.add(voce.sessione_id);
                        }
                        disegna();
                    }
                }, [
                    el('div', { class: 'ds-schermo-card__testa' }, [
                        el('div', { class: 'ds-schermo-card__icona' }, icona('monitor')),
                        el('div', { class: 'ds-schermo-card__check' }, [
                            icona(selezionato ? 'check_circle' : 'radio_button_unchecked')
                        ])
                    ]),
                    el('div', { class: 'ds-schermo-card__titolo' }, voce.nome || 'Monitor dello studio'),
                    el('div', { class: 'ds-schermo-card__indirizzo' }, voce.indirizzo || 'Rete locale'),
                    el('div', { class: 'ds-schermo-card__stato' }, [
                        el('span', { class: `ds-schermo-card__spia ${voce.in_seduta ? 'ds-schermo-card__spia--seduta' : 'ds-schermo-card__spia--online'}` }),
                        voce.in_seduta ? `In seduta: ${voce.paziente_nome || 'Paziente'}` : 'Pronto a ricevere'
                    ])
                ]);
            }));
        };

        const pannelloSelezionePaziente = () => {
            return el('div', { class: 'ds-trasmetti-paziente-wrap' }, [
                pazienteSelezionatoDati
                    ? el('div', { class: 'ds-paziente-selezionato-card' }, [
                        el('div', { class: 'ds-paziente-selezionato-card__info' }, [
                            el('div', { class: 'ds-paziente-selezionato-card__avatar' }, icona('person')),
                            el('div', {}, [
                                el('div', { class: 'ds-paziente-selezionato-card__nome' },
                                    `${pazienteSelezionatoDati.cognome} ${pazienteSelezionatoDati.nome}`
                                ),
                                el('div', { class: 'ds-paziente-selezionato-card__meta' }, [
                                    pazienteSelezionatoDati.codice_fiscale ? `CF: ${pazienteSelezionatoDati.codice_fiscale}` : '',
                                    pazienteSelezionatoDati.data_nascita ? `Nascita: ${fmt.data(pazienteSelezionatoDati.data_nascita)}` : ''
                                ].filter(Boolean).join(' · '))
                            ])
                        ]),
                        el('button', {
                            class: 'ds-btn ds-btn--ghost ds-btn--piccolo',
                            type: 'button',
                            onClick: async () => {
                                const scelto = await selettorePaziente();
                                if (scelto) {
                                    pazienteSelezionatoId = scelto;
                                    await caricaPaziente(scelto);
                                    disegna();
                                }
                            }
                        }, [icona('swap_horiz'), 'Cambia Paziente'])
                    ])
                    : el('div', { class: 'ds-paziente-non-selezionato' }, [
                        el('p', { class: 'ds-muted' }, 'Nessun paziente selezionato.'),
                        el('button', {
                            class: 'ds-btn ds-btn--secondary ds-btn--tocco',
                            type: 'button',
                            onClick: async () => {
                                const scelto = await selettorePaziente();
                                if (scelto) {
                                    pazienteSelezionatoId = scelto;
                                    await caricaPaziente(scelto);
                                    disegna();
                                }
                            }
                        }, [icona('search'), 'Seleziona Paziente dalla Rubrica'])
                    ])
            ]);
        };

        rimpiazza(contenitore, [
            el('div', { class: 'ds-trasmetti-header' }, [
                onIndietro
                    ? el('button', {
                        class: 'ds-btn ds-btn--ghost ds-btn--piccolo',
                        type: 'button',
                        onClick: () => {
                            if (intervalloAggiornamento) clearInterval(intervalloAggiornamento);
                            onIndietro();
                        }
                    }, [icona('arrow_back'), 'Torna alla scelta'])
                    : null
            ].filter(Boolean)),

            griglia('stats', [
                statistica({ etichetta: 'Monitor online', valore: String(collegate.length), tono: collegate.length > 0 ? 'positivo' : undefined }),
                statistica({ etichetta: 'Sedute attive adesso', valore: String(aperte.length), tono: aperte.length > 0 ? 'positivo' : undefined }),
                statistica({ etichetta: 'Monitor selezionati', valore: String(postazioniSelezionate.size) })
            ]),

            pannello({
                titolo: '1. Seleziona i monitor online di destinazione',
                azioni: [
                    spaziatore(),
                    bottone({
                        etichetta: 'Aggiorna schermi',
                        simbolo: 'refresh',
                        variante: 'ghost',
                        onClick: disegna
                    })
                ]
            }, selettoreSchermi()),

            pannello({
                titolo: '2. Seleziona la cartella clinica del paziente'
            }, pannelloSelezionePaziente()),

            el('div', { class: 'ds-trasmetti-invio-barra' }, [
                el('button', {
                    class: 'ds-btn ds-btn--primary ds-btn--tocco ds-trasmetti-btn-invia',
                    type: 'button',
                    disabled: !pazienteSelezionatoId || postazioniSelezionate.size === 0,
                    onClick: eseguiInvio
                }, [
                    icona('send'),
                    `Invia Cartella Clinica a ${postazioniSelezionate.size} Monitor`
                ])
            ]),

            pannello({ titolo: 'Sedute cliniche in corso', flush: true }, tabella({
                colonne: [
                    { titolo: 'Quando', rendi: riga => fmt.dataOra(riga.aperta_il) },
                    { titolo: 'Paziente', campo: 'paziente_nome' },
                    { titolo: 'Monitor', campo: 'postazione_nome' },
                    {
                        titolo: 'Stato',
                        rendi: riga => distintivo(fmt.etichettaStato(riga.stato), TONI_STATO[riga.stato] || 'neutral')
                    },
                    {
                        titolo: '',
                        rendi: riga => azioniRiga([
                            riga.paziente_id ? bottone({
                                simbolo: 'person', variante: 'ghost', piccolo: true, titolo: 'Apri cartella',
                                onClick: () => naviga('paziente', { id: riga.paziente_id })
                            }) : null,
                            riga.stato === 'aperta' ? bottone({
                                simbolo: 'logout', variante: 'ghost', piccolo: true, titolo: 'Chiudi la scheda sul monitor',
                                onClick: () => chiudi(riga)
                            }) : null
                        ])
                    }
                ],
                righe: storico.righe,
                vuotoTitolo: 'Nessuna seduta attiva al momento',
                vuotoTesto: 'Quando trasmetti una cartella a un monitor dello studio, la seduta attiva compare qui.',
                vuotoSimbolo: 'cast'
            }))
        ]);

        if (pazienteIniziale && !inviatoIniziale && collegate.length > 0) {
            inviatoIniziale = true;
            postazioniSelezionate.add(collegate[0].sessione_id);
            await eseguiInvio();
        }
    };

    disegna();
    intervalloAggiornamento = setInterval(() => {
        if (contenitore.isConnected) {
            disegna();
        } else {
            clearInterval(intervalloAggiornamento);
        }
    }, 15000);

    return contenitore;
}
