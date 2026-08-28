import { el, rimpiazza } from '../../components/dom.js';
import { intestazione, pannello, griglia, statistica, distintivo, bottone, vuoto } from '../../components/layout.js';
import { tabella, azioniRiga } from '../../components/tabella.js';
import { esito, errore } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import * as fmt from '../../kernel/format.js';
import { oggetto } from '../shared/vista.js';
import { selettorePaziente } from '../shared/selettore_paziente.js';
import { apriDiagnosticaRete } from './diagnostica_modal.js';
import { schedaMonitor } from './scheda_monitor.js';

const TONI_STATO = {
    aperta: 'info',
    chiusa: 'neutral',
    fallita: 'danger'
};

export function consoleTrasmissione({ pazienteIniziale, postazione, naviga, onIndietro }) {
    const contenitore = el('div', { class: 'ds-root' });
    let intervalloAggiornamento = null;
    let inAggiornamento = false;
    let mutazioneInCorso = false;
    let ultimoStatoPostazioni = [];
    let filtroData = fmt.oggiIso();
    let filtroPoltrona = '';
    let filtroStato = '';

    const nodoStatistiche = el('div', {});
    const nodoSchermi = el('div', {});
    const nodoTabella = el('div', {});

    const invocaChiusura = async (parametri, messaggio) => {
        if (mutazioneInCorso) return;
        mutazioneInCorso = true;
        try {
            const risposta = await call('trasmissioni.chiudi', parametri);
            if (esito(risposta, messaggio)) {
                mutazioneInCorso = false;
                await aggiornaDati(true);
                return;
            }
        } catch (e) {
            errore(e.message || 'Errore nella chiusura della seduta');
        } finally {
            mutazioneInCorso = false;
        }
    };

    const chiudi = riga => invocaChiusura({ id: riga.id }, 'Scheda chiusa sul monitor');

    const chiudiPostazione = voce => invocaChiusura({
        id: voce.trasmissione_id || undefined,
        sessione_id: voce.sessione_id,
        impronta: voce.impronta,
        ip: voce.ip,
        porta: voce.porta,
        indirizzo: voce.indirizzo
    }, `Seduta chiusa su ${voce.nome || 'Monitor'}`);

    const trasmettiAPostazione = async (postazioneBersaglio) => {
        try {
            const sceltoId = pazienteIniziale || await selettorePaziente();
            if (!sceltoId) return;

            const risposta = await call('trasmissioni.invia', {
                paziente_id: sceltoId,
                sessione_ids: [postazioneBersaglio.sessione_id]
            });

            if (esito(risposta, `Cartella trasmessa con successo a ${postazioneBersaglio.nome || 'Monitor'}`)) {
                pazienteIniziale = null;
                await aggiornaDati(true);
            }
        } catch (e) {
            errore(e.message || 'Errore durante la trasmissione');
        }
    };

    const renderStatistiche = (collegate, righe) => {
        try {
            const inSeduta = collegate.filter(v => v.in_seduta).length;
            const pronte = collegate.length - inSeduta;
            const aperteOggi = righe.filter(r => r.stato === 'aperta').length;

            rimpiazza(nodoStatistiche, griglia('stats', [
                statistica({
                    etichetta: 'Monitor online',
                    valore: String(collegate.length),
                    nota: 'Postazioni pronte a ricevere'
                }),
                statistica({
                    etichetta: 'In seduta live',
                    valore: String(inSeduta),
                    tono: inSeduta > 0 ? 'positivo' : undefined,
                    nota: `${pronte} libere nello studio`
                }),
                statistica({
                    etichetta: 'Schede aperte',
                    valore: String(aperteOggi),
                    nota: 'Trasmissioni attive'
                }),
                statistica({
                    etichetta: 'Storico trasmissioni',
                    valore: String(righe.length),
                    nota: 'Voci filtrate'
                })
            ]));
        } catch (_) {}
    };

    const renderSchermi = (collegate) => {
        try {
            if (collegate.length === 0) {
                rimpiazza(nodoSchermi, vuoto({
                    titolo: 'Nessun monitor rilevato in rete',
                    testo: 'Apri DentalSuite su qualsiasi altro computer dello studio e clicca su "Ricevi (Monitor del Medico)".',
                    simbolo: 'desktop_windows',
                    azione: el('div', { class: 'ds-toolbar' }, [
                        bottone({
                            etichetta: 'Scansiona Rete LAN',
                            simbolo: 'refresh',
                            variante: 'primario',
                            onClick: () => aggiornaDati(true)
                        }),
                        bottone({
                            etichetta: 'Diagnostica Rete',
                            simbolo: 'radar',
                            variante: 'ghost',
                            onClick: apriDiagnosticaRete
                        })
                    ])
                }));
                return;
            }

            const cards = collegate.map(voce => schedaMonitor({
                voce,
                onInvia: trasmettiAPostazione,
                onChiudi: chiudiPostazione
            }));

            rimpiazza(nodoSchermi, griglia('cards', cards));
        } catch (_) {}
    };

    const renderTabellaStorico = (righe) => {
        try {
            const inputData = el('input', {
                class: 'ds-input ds-input--sm',
                type: 'date',
                value: filtroData,
                style: 'max-width: 140px;',
                onChange: evento => {
                    filtroData = evento.target.value;
                    aggiornaDati(false);
                }
            });

            const btnOggi = bottone({
                etichetta: 'Oggi',
                variante: filtroData === fmt.oggiIso() ? 'primario' : 'ghost',
                piccolo: true,
                onClick: () => {
                    filtroData = fmt.oggiIso();
                    inputData.value = filtroData;
                    aggiornaDati(false);
                }
            });

            const btnTutte = bottone({
                etichetta: 'Tutte le date',
                variante: !filtroData ? 'primario' : 'ghost',
                piccolo: true,
                onClick: () => {
                    filtroData = '';
                    inputData.value = '';
                    aggiornaDati(false);
                }
            });

            const inputPoltrona = el('input', {
                class: 'ds-input ds-input--sm',
                type: 'text',
                placeholder: 'Filtra poltrona...',
                value: filtroPoltrona,
                style: 'max-width: 150px;',
                onInput: evento => {
                    filtroPoltrona = evento.target.value;
                    aggiornaDati(false);
                }
            });

            const selectStato = el('select', {
                class: 'ds-select ds-select--sm',
                style: 'max-width: 140px;',
                onChange: evento => {
                    filtroStato = evento.target.value;
                    aggiornaDati(false);
                }
            }, [
                el('option', { value: '', selected: filtroStato === '' }, 'Tutti gli stati'),
                el('option', { value: 'aperta', selected: filtroStato === 'aperta' }, 'Solo Aperte'),
                el('option', { value: 'chiusa', selected: filtroStato === 'chiusa' }, 'Solo Chiuse')
            ]);

            const barraFiltri = el('div', { class: 'ds-toolbar' }, [
                inputData,
                btnOggi,
                btnTutte,
                inputPoltrona,
                selectStato
            ]);

            rimpiazza(nodoTabella, pannello({
                titolo: 'Sedute cliniche & Storico trasmissioni',
                azioni: [barraFiltri],
                flush: true
            }, tabella({
                colonne: [
                    { titolo: 'Orario', rendi: riga => fmt.dataOra(riga.aperta_il) },
                    { titolo: 'Paziente', campo: 'paziente_nome' },
                    { titolo: 'Monitor Destinazione', campo: 'postazione_nome' },
                    {
                        titolo: 'Stato',
                        rendi: riga => distintivo(fmt.etichettaStato(riga.stato), TONI_STATO[riga.stato] || 'neutral')
                    },
                    {
                        titolo: '',
                        rendi: riga => azioniRiga([
                            riga.stato === 'aperta' ? bottone({
                                etichetta: 'Chiudi scheda',
                                simbolo: 'stop_circle',
                                variante: 'ghost',
                                piccolo: true,
                                onClick: () => chiudi(riga)
                            }) : null
                        ])
                    }
                ],
                righe,
                vuotoTitolo: 'Nessuna trasmissione trovata',
                vuotoTesto: 'Non ci sono trasmissioni per i filtri selezionati.',
                vuotoSimbolo: 'cast'
            })));
        } catch (_) {}
    };

    const aggiornaDati = async (forzaScansione = false) => {
        if (mutazioneInCorso) return;
        if (inAggiornamento && !forzaScansione) return;
        inAggiornamento = true;
        try {
            const [postazioniDati, trasmissioniDati] = await Promise.all([
                call('trasmissioni.postazioni', { forza: forzaScansione }).then(r => oggetto(r, { collegate: [] })),
                call('trasmissioni.elenco', {
                    data: filtroData || undefined,
                    poltrona: filtroPoltrona || undefined,
                    stato: filtroStato || undefined
                }).then(r => oggetto(r, { righe: [] }))
            ]);

            ultimoStatoPostazioni = postazioniDati.collegate || [];
            const righe = trasmissioniDati.righe || [];
            renderStatistiche(ultimoStatoPostazioni, righe);
            renderSchermi(ultimoStatoPostazioni);
            renderTabellaStorico(righe);
        } catch (e) {
            console.error(e);
        } finally {
            inAggiornamento = false;
        }
    };

    rimpiazza(contenitore, [
        intestazione({
            titolo: 'Console Trasmissione Clinica',
            sottotitolo: 'Invia in tempo reale la cartella clinica ai monitor medici dello studio',
            simbolo: 'cast_connected',
            indietro: onIndietro,
            azioni: [
                bottone({
                    etichetta: 'Aggiorna Rete',
                    simbolo: 'refresh',
                    variante: 'ghost',
                    onClick: () => aggiornaDati(true)
                }),
                bottone({
                    etichetta: 'Diagnostica Rete',
                    simbolo: 'radar',
                    variante: 'ghost',
                    onClick: apriDiagnosticaRete
                })
            ]
        }),
        nodoStatistiche,
        pannello({
            titolo: 'Monitor & Poltrone Online nello Studio',
            azioni: [
                bottone({
                    etichetta: 'Scansiona LAN',
                    simbolo: 'search',
                    variante: 'ghost',
                    piccolo: true,
                    onClick: () => aggiornaDati(true)
                })
            ]
        }, nodoSchermi),
        nodoTabella
    ]);

    aggiornaDati(true);
    intervalloAggiornamento = setInterval(() => {
        if (!contenitore.isConnected) {
            cleanup();
            return;
        }
        aggiornaDati(false);
    }, 2000);

    const cleanup = () => {
        if (intervalloAggiornamento) {
            clearInterval(intervalloAggiornamento);
            intervalloAggiornamento = null;
        }
    };

    window.addEventListener('beforeunload', cleanup);
    return contenitore;
}
