import { el, rimpiazza, icona } from '../../components/dom.js';
import { pannello, bottone, scheletro, vuoto } from '../../components/layout.js';
import { call } from '../../kernel/transport.js';
import { can } from '../../security/permissions.js';
import { oggetto, elenco } from '../shared/vista.js';
import {
    CATEGORIE_PATOLOGIE,
    CATEGORIE_ALLERGIE,
    CATEGORIE_INTOLLERANZE,
    CATEGORIE_STILE_VITA
} from './anamnesi/catalogo.js';
import { creaSelettoreSezioni } from './anamnesi/selettore_sezioni.js';
import { creaQuadroRischi } from './anamnesi/quadro_rischi.js';
import { creaAllerteLiveBanner } from './anamnesi/allerte_live.js';
import { creaSintesiMedica } from './anamnesi/sintesi_medica.js';

function decodificaJson(valore, predefinito = {}) {
    try {
        if (!valore) return predefinito;
        if (typeof valore === 'object') return valore;
        return JSON.parse(valore);
    } catch {
        return predefinito;
    }
}

function sintetizzaElencoTestuale(mappaStrutturata, catalogoCategorie) {
    const etichette = [];
    const idToLabel = new Map();
    catalogoCategorie.forEach(cat => {
        cat.voci.forEach(v => idToLabel.set(v.id, v.etichetta));
    });

    for (const [k, val] of Object.entries(mappaStrutturata || {})) {
        if (val === true || (typeof val === 'object' && val && val.attivo)) {
            const dettagli = typeof val === 'object' && val.dettagli ? ` (${val.dettagli})` : '';
            if (idToLabel.has(k)) {
                etichette.push(`${idToLabel.get(k)}${dettagli}`);
            } else if (k.startsWith('custom_')) {
                const testoCustom = (typeof val === 'object' && val.dettagli) ? val.dettagli : k.replace(/^custom_[^_]+_/, '').replace(/_/g, ' ');
                if (testoCustom) etichette.push(testoCustom);
            }
        }
    }
    return etichette.join(', ');
}

export default {
    rendi: async ({ paziente }) => {
        const puoModificare = await can('anamnesi_edit');
        const contenitore = el('div', { class: 'ds-root' }, scheletro(3));

        const disegna = async () => {
            const [datiAnamnesi, staff] = await Promise.all([
                call('anamnesi.get', { paziente_id: paziente.id }).then(res => oggetto(res, null)),
                call('staff.list', {}).then(elenco)
            ]);

            if (!datiAnamnesi) {
                rimpiazza(contenitore, vuoto({ titolo: 'Anamnesi non disponibile', simbolo: 'clinical_notes' }));
                return;
            }

            const rawScheda = datiAnamnesi.scheda || {};
            const stato = {
                ...rawScheda,
                patologie_strutturate: decodificaJson(rawScheda.patologie_strutturate),
                allergie_strutturate: decodificaJson(rawScheda.allergie_strutturate),
                intolleranze_strutturate: decodificaJson(rawScheda.intolleranze_strutturate),
                stile_vita_strutturato: decodificaJson(rawScheda.stile_vita_strutturato),
                valutazione_rischio: decodificaJson(rawScheda.valutazione_rischio, {
                    asa: (datiAnamnesi.rischio && datiAnamnesi.rischio.asa) ? String(datiAnamnesi.rischio.asa) : '1',
                    rischio_emorragico: (datiAnamnesi.rischio && datiAnamnesi.rischio.rischio_emorragico) || 'basso',
                    rischio_mronj: (datiAnamnesi.rischio && datiAnamnesi.rischio.rischio_mronj) || 'basso',
                    profilassi_antibiotica: Boolean(datiAnamnesi.rischio && datiAnamnesi.rischio.profilassi_antibiotica),
                    tolleranza_vasocostrittore: (datiAnamnesi.rischio && datiAnamnesi.rischio.tolleranza_vasocostrittore) || 'consentito'
                })
            };

            let tabCorrente = 'panoramica';
            let timerSalvataggio = null;

            const badgeStatoSalvataggio = el('div', { class: 'ds-live-save-badge ds-badge ds-badge--success' }, [
                icona('cloud_done'),
                el('span', {}, 'Salvataggio live attivo')
            ]);

            const impostaStatoSalvataggio = (tipo, messaggio) => {
                badgeStatoSalvataggio.className = `ds-live-save-badge ds-badge ds-badge--${tipo}`;
                const iconaNome = tipo === 'info' ? 'sync' : (tipo === 'danger' ? 'cloud_off' : 'cloud_done');
                rimpiazza(badgeStatoSalvataggio, [icona(iconaNome), el('span', {}, messaggio)]);
            };

            const eseguiSalvataggioLive = async () => {
                if (!puoModificare) return;
                try {
                    impostaStatoSalvataggio('info', 'Salvataggio in corso...');

                    const testoAllergieFarmaci = sintetizzaElencoTestuale(stato.allergie_strutturate, CATEGORIE_ALLERGIE.filter(c => c.id === 'farmaci'));
                    const testoAllergieMateriali = sintetizzaElencoTestuale(stato.allergie_strutturate, CATEGORIE_ALLERGIE.filter(c => c.id === 'materiali'));
                    const testoIntolleranze = sintetizzaElencoTestuale(stato.intolleranze_strutturate, CATEGORIE_INTOLLERANZE);

                    const payload = {
                        ...stato,
                        paziente_id: paziente.id,
                        allergie_farmaci: testoAllergieFarmaci || stato.allergie_farmaci || '',
                        allergie_materiali: testoAllergieMateriali || stato.allergie_materiali || '',
                        intolleranze: testoIntolleranze || stato.intolleranze || '',
                        patologie_strutturate: stato.patologie_strutturate,
                        allergie_strutturate: stato.allergie_strutturate,
                        intolleranze_strutturate: stato.intolleranze_strutturate,
                        stile_vita_strutturato: stato.stile_vita_strutturato,
                        valutazione_rischio: stato.valutazione_rischio
                    };

                    const risultato = await call('anamnesi.save', payload);
                    if (risultato && risultato.success !== false) {
                        const orario = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                        impostaStatoSalvataggio('success', `Salvato live (${orario})`);
                    } else {
                        impostaStatoSalvataggio('danger', 'Errore salvataggio');
                    }
                } catch {
                    impostaStatoSalvataggio('danger', 'Errore connessione');
                }
            };

            const programmaSalvataggio = (immediato = false) => {
                if (!puoModificare) return;
                if (timerSalvataggio) clearTimeout(timerSalvataggio);
                if (immediato) {
                    eseguiSalvataggioLive();
                } else {
                    impostaStatoSalvataggio('info', 'Modifiche in corso...');
                    timerSalvataggio = setTimeout(eseguiSalvataggioLive, 400);
                }
            };

            const allerteBanner = creaAllerteLiveBanner({
                patologie: stato.patologie_strutturate,
                allergie: stato.allergie_strutturate,
                intolleranze: stato.intolleranze_strutturate,
                stileVita: stato.stile_vita_strutturato,
                rischio: stato.valutazione_rischio,
                paziente,
                schedaLegacy: stato
            });

            const aggiornaAllerteLive = () => {
                allerteBanner.aggiorna({
                    patologie: stato.patologie_strutturate,
                    allergie: stato.allergie_strutturate,
                    intolleranze: stato.intolleranze_strutturate,
                    stileVita: stato.stile_vita_strutturato,
                    rischio: stato.valutazione_rischio,
                    paziente,
                    schedaLegacy: stato
                });
                aggiornaBadgeTabs();
            };

            const calcolaConteggio = mappa => {
                return Object.values(mappa || {}).filter(v => v === true || (typeof v === 'object' && v && v.attivo)).length;
            };

            const aggiornaBadgeTabs = () => {
                tabBar.querySelectorAll('.ds-anamnesi-tab').forEach(b => {
                    const id = b.dataset.tab;
                    const conf = tabConfig.find(t => t.id === id);
                    if (conf && conf.conta) {
                        const cnt = conf.conta();
                        const oldBadge = b.querySelector('.ds-badge');
                        if (cnt > 0) {
                            if (oldBadge) {
                                oldBadge.textContent = String(cnt);
                            } else {
                                b.appendChild(el('span', { class: 'ds-badge ds-badge--danger' }, String(cnt)));
                            }
                        } else if (oldBadge) {
                            oldBadge.remove();
                        }
                    }
                });
            };

            const renderizzaCorpoTab = () => {
                if (tabCorrente === 'patologie') {
                    return creaSelettoreSezioni({
                        titoloSezione: 'Quadro Patologico Sistemico',
                        descrizioneSezione: 'Seleziona le condizioni cliniche e patologie pregresse/attive dell\'apparato cardiovascolare, respiratorio, osseo, ematologico e metabolico.',
                        simboloSezione: 'cardiology',
                        categorie: CATEGORIE_PATOLOGIE,
                        statoSelezioni: stato.patologie_strutturate,
                        puoModificare,
                        onModifica: nuove => {
                            stato.patologie_strutturate = nuove;
                            aggiornaAllerteLive();
                            programmaSalvataggio(true);
                        }
                    });
                }

                if (tabCorrente === 'allergie') {
                    const bloccoAllergie = creaSelettoreSezioni({
                        titoloSezione: 'Allergie Farmacologiche & Materiali',
                        descrizioneSezione: 'Indica intolleranze a molecole, anestetici, lattice e metalli odontoiatrici.',
                        simboloSezione: 'warning',
                        categorie: CATEGORIE_ALLERGIE,
                        statoSelezioni: stato.allergie_strutturate,
                        puoModificare,
                        onModifica: nuove => {
                            stato.allergie_strutturate = nuove;
                            aggiornaAllerteLive();
                            programmaSalvataggio(true);
                        }
                    });

                    const bloccoIntolleranze = creaSelettoreSezioni({
                        titoloSezione: 'Intolleranze Alimentari & Eccipienti',
                        descrizioneSezione: 'Celiachia, intolleranza al lattosio, favismo e restrizioni dietetiche/farmaceutiche.',
                        simboloSezione: 'no_food',
                        categorie: CATEGORIE_INTOLLERANZE,
                        statoSelezioni: stato.intolleranze_strutturate,
                        puoModificare,
                        onModifica: nuove => {
                            stato.intolleranze_strutturate = nuove;
                            aggiornaAllerteLive();
                            programmaSalvataggio(true);
                        }
                    });

                    return el('div', { style: 'display: flex; flex-direction: column; gap: 1.5rem;' }, [
                        bloccoAllergie,
                        bloccoIntolleranze
                    ]);
                }

                if (tabCorrente === 'stile_vita') {
                    return creaSelettoreSezioni({
                        titoloSezione: 'Stile di Vita, Condizioni Fisiologiche & ATM',
                        descrizioneSezione: 'Abitudini viziate, fumo, bruxismo, stato di gravidanza/allattamento e disturbi dell\'articolazione temporo-mandibolare.',
                        simboloSezione: 'ecg_heart',
                        categorie: CATEGORIE_STILE_VITA,
                        statoSelezioni: stato.stile_vita_strutturato,
                        puoModificare,
                        onModifica: nuove => {
                            stato.stile_vita_strutturato = nuove;
                            aggiornaAllerteLive();
                            programmaSalvataggio(true);
                        }
                    });
                }

                if (tabCorrente === 'rischi') {
                    return creaQuadroRischi({
                        valutazioneRischio: stato.valutazione_rischio,
                        puoModificare,
                        onModifica: nuovoRischio => {
                            stato.valutazione_rischio = nuovoRischio;
                            aggiornaAllerteLive();
                            programmaSalvataggio(true);
                        }
                    });
                }

                if (tabCorrente === 'sintesi') {
                    return creaSintesiMedica({
                        stato,
                        staff,
                        puoModificare,
                        onModifica: nuovoStato => {
                            Object.assign(stato, nuovoStato);
                            programmaSalvataggio(false);
                        }
                    });
                }

                const nPat = calcolaConteggio(stato.patologie_strutturate);
                const nAll = calcolaConteggio(stato.allergie_strutturate);
                const nInt = calcolaConteggio(stato.intolleranze_strutturate);
                const nStile = calcolaConteggio(stato.stile_vita_strutturato);

                const riassuntoCards = el('div', { class: 'ds-grid ds-grid--cards' }, [
                    el('div', { class: 'ds-card', onClick: () => cambiaTab('patologie') }, [
                        el('div', { class: 'ds-card__icon' }, icona('cardiology')),
                        el('div', { class: 'ds-card__title' }, 'Patologie Sistemiche'),
                        el('div', { class: 'ds-card__desc' }, `${nPat} condizioni attive registrate sul quadro patologico.`),
                        el('span', { class: nPat > 0 ? 'ds-badge ds-badge--danger' : 'ds-badge ds-badge--neutral' }, `${nPat} Selezionate`)
                    ]),
                    el('div', { class: 'ds-card', onClick: () => cambiaTab('allergie') }, [
                        el('div', { class: 'ds-card__icon' }, icona('medication')),
                        el('div', { class: 'ds-card__title' }, 'Allergie & Intolleranze'),
                        el('div', { class: 'ds-card__desc' }, `${nAll + nInt} allergie o intolleranze ad eccipienti registrate.`),
                        el('span', { class: (nAll + nInt) > 0 ? 'ds-badge ds-badge--danger' : 'ds-badge ds-badge--neutral' }, `${nAll + nInt} Rilevate`)
                    ]),
                    el('div', { class: 'ds-card', onClick: () => cambiaTab('stile_vita') }, [
                        el('div', { class: 'ds-card__icon' }, icona('ecg_heart')),
                        el('div', { class: 'ds-card__title' }, 'Stile di Vita & ATM'),
                        el('div', { class: 'ds-card__desc' }, `${nStile} abitudini, stati fisiologici o condizioni ATM.`),
                        el('span', { class: nStile > 0 ? 'ds-badge ds-badge--info' : 'ds-badge ds-badge--neutral' }, `${nStile} Registrate`)
                    ]),
                    el('div', { class: 'ds-card', onClick: () => cambiaTab('rischi') }, [
                        el('div', { class: 'ds-card__icon' }, icona('speed')),
                        el('div', { class: 'ds-card__title' }, 'Classificazione ASA & Rischi'),
                        el('div', { class: 'ds-card__desc' }, `Punteggio corrente: ASA ${stato.valutazione_rischio.asa || '1'}`),
                        el('span', { class: 'ds-badge ds-badge--warning' }, `ASA ${stato.valutazione_rischio.asa || '1'}`)
                    ])
                ]);

                return el('div', { style: 'display: flex; flex-direction: column; gap: 1.25rem;' }, [
                    riassuntoCards,
                    creaSintesiMedica({
                        stato,
                        staff,
                        puoModificare,
                        onModifica: n => {
                            Object.assign(stato, n);
                            programmaSalvataggio(false);
                        }
                    })
                ]);
            };

            const areaDinamica = el('div', { class: 'ds-anamnesi-tab-body' }, renderizzaCorpoTab());

            const cambiaTab = nuovaTab => {
                tabCorrente = nuovaTab;
                tabBar.querySelectorAll('.ds-anamnesi-tab').forEach(b => {
                    b.classList.toggle('ds-anamnesi-tab--active', b.dataset.tab === nuovaTab);
                });
                rimpiazza(areaDinamica, renderizzaCorpoTab());
            };

            const tabConfig = [
                { id: 'panoramica', etichetta: 'Panoramica & Dashboard', simbolo: 'dashboard' },
                { id: 'patologie', etichetta: 'Patologie Sistemiche', simbolo: 'cardiology', conta: () => calcolaConteggio(stato.patologie_strutturate) },
                { id: 'allergie', etichetta: 'Allergie & Intolleranze', simbolo: 'science', conta: () => calcolaConteggio(stato.allergie_strutturate) + calcolaConteggio(stato.intolleranze_strutturate) },
                { id: 'stile_vita', etichetta: 'Stile di Vita & ATM', simbolo: 'ecg_heart', conta: () => calcolaConteggio(stato.stile_vita_strutturato) },
                { id: 'rischi', etichetta: 'Matrice Rischi & ASA', simbolo: 'speed' },
                { id: 'sintesi', etichetta: 'Terapie & Note Mediche', simbolo: 'clinical_notes' }
            ];

            const tabBar = el('nav', { class: 'ds-anamnesi-tabs' }, tabConfig.map(t => {
                const conta = t.conta ? t.conta() : 0;
                return el('button', {
                    type: 'button',
                    class: `ds-anamnesi-tab ${t.id === tabCorrente ? 'ds-anamnesi-tab--active' : ''}`,
                    dataset: { tab: t.id },
                    onClick: () => cambiaTab(t.id)
                }, [
                    icona(t.simbolo),
                    el('span', {}, t.etichetta),
                    conta > 0 ? el('span', { class: 'ds-badge ds-badge--danger' }, String(conta)) : null
                ].filter(Boolean));
            }));

            const pannelloPrincipale = pannello({
                titolo: 'Scheda Anamnestica & Cartella Clinica',
                azioni: [
                    badgeStatoSalvataggio,
                    puoModificare ? bottone({
                        etichetta: 'Sincronizza ora',
                        simbolo: 'sync',
                        variante: 'ghost',
                        piccolo: true,
                        onClick: () => eseguiSalvataggioLive()
                    }) : null
                ].filter(Boolean)
            }, el('div', { class: 'ds-anamnesi-root' }, [
                tabBar,
                areaDinamica
            ]));

            rimpiazza(contenitore, [
                allerteBanner.nodo,
                pannelloPrincipale
            ]);
        };

        await disegna();
        return contenitore;
    }
};
