import { el, rimpiazza } from '../../components/dom.js';
import { pannello, bottone, distintivo, statistica, griglia, spaziatore, avviso } from '../../components/layout.js';
import { tabella } from '../../components/tabella.js';
import { barreOrizzontali } from '../../components/barre.js';
import { errore, successo } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import * as fmt from '../../kernel/format.js';
import { oggetto } from '../shared/vista.js';

const TONI_ESITO = { consentito: 'success', negato: 'danger', fallito: 'warning' };
const PAGINA = 50;

function inizioMese() {
    const adesso = new Date();
    return fmt.isoDa(new Date(adesso.getFullYear(), adesso.getMonth(), 1));
}

export default {
    rendi: async () => {
        const contenitore = el('div', { class: 'ds-root' });
        const filtro = { dal: inizioMese(), al: fmt.oggiIso(), esito: '', scarto: 0 };

        const parametri = () => ({
            dal: fmt.inizioGiornata(filtro.dal),
            al: fmt.fineGiornata(filtro.al),
            esito: filtro.esito || undefined
        });

        const disegna = async () => {
            const [registro, sintesi] = await Promise.all([
                call('audit.list', { ...parametri(), limite: PAGINA, scarto: filtro.scarto })
                    .then(risultato => oggetto(risultato, { righe: [], totale: 0 })),
                call('audit.riepilogo', parametri())
                    .then(risultato => oggetto(risultato, { per_esito: [], per_entita: [], per_attore: [], accessi_negati: [] }))
            ]);

            const conteggio = chiave => {
                const voce = sintesi.per_esito.find(riga => riga.etichetta === chiave);
                return voce ? voce.totale : 0;
            };

            const verifica = async () => {
                const stato = oggetto(await call('audit.verificaIntegrita', {}), null);
                if (!stato) {
                    errore('Verifica non riuscita');
                    return;
                }
                if (stato.integra) {
                    successo(`Catena integra su ${stato.righe_verificate} registrazioni`);
                    return;
                }
                errore(`${stato.anomalie.length} anomalie di integrità rilevate nel registro`);
            };

            const campoDal = el('input', {
                class: 'ds-input', type: 'date', value: filtro.dal,
                onChange: evento => { filtro.dal = evento.target.value; filtro.scarto = 0; disegna(); }
            });
            const campoAl = el('input', {
                class: 'ds-input', type: 'date', value: filtro.al,
                onChange: evento => { filtro.al = evento.target.value; filtro.scarto = 0; disegna(); }
            });
            const campoEsito = el('select', {
                class: 'ds-select',
                onChange: evento => { filtro.esito = evento.target.value; filtro.scarto = 0; disegna(); }
            }, [
                el('option', { value: '', selected: filtro.esito === '' }, 'Tutti gli esiti'),
                ...Object.keys(TONI_ESITO).map(voce =>
                    el('option', { value: voce, selected: filtro.esito === voce }, fmt.etichettaStato(voce)))
            ]);

            const ultimo = filtro.scarto + PAGINA >= registro.totale;

            rimpiazza(contenitore, [
                griglia('stats', [
                    statistica({ etichetta: 'Registrazioni nel periodo', valore: fmt.numero(registro.totale) }),
                    statistica({ etichetta: 'Operazioni consentite', valore: fmt.numero(conteggio('consentito')), tono: 'positivo' }),
                    statistica({
                        etichetta: 'Accessi negati',
                        valore: fmt.numero(conteggio('negato')),
                        tono: conteggio('negato') > 0 ? 'negativo' : undefined
                    }),
                    statistica({ etichetta: 'Operazioni fallite', valore: fmt.numero(conteggio('fallito')) })
                ]),
                sintesi.accessi_negati.length > 0
                    ? avviso({
                        tono: 'warning',
                        simbolo: 'gpp_bad',
                        titolo: 'Tentativi di accesso non autorizzato nel periodo',
                        voci: sintesi.accessi_negati.map(voce =>
                            `${voce.azione} — permesso "${voce.permesso}" — ${voce.totale} tentativi`)
                    })
                    : null,
                el('div', { class: 'ds-grid ds-grid--cards' }, [
                    pannello({ titolo: 'Operazioni per area' },
                        barreOrizzontali(sintesi.per_entita.map(voce => ({
                            etichetta: fmt.etichettaStato(voce.etichetta),
                            totale: voce.totale
                        })), fmt.numero)),
                    pannello({ titolo: 'Operazioni per operatore' },
                        barreOrizzontali(sintesi.per_attore, fmt.numero))
                ]),
                pannello({
                    titolo: 'Registro delle operazioni',
                    azioni: [
                        campoDal, campoAl, campoEsito,
                        spaziatore(),
                        bottone({
                            etichetta: 'Verifica integrità',
                            simbolo: 'verified',
                            variante: 'ghost',
                            piccolo: true,
                            onClick: verifica
                        })
                    ],
                    flush: true
                }, [
                    tabella({
                        colonne: [
                            { titolo: '#', numerica: true, campo: 'sequenza' },
                            { titolo: 'Istante', rendi: riga => fmt.dataOra(riga.created_at) },
                            { titolo: 'Operatore', rendi: riga => riga.attore_id || 'non identificato' },
                            { titolo: 'Azione', rendi: riga => el('code', {}, riga.azione) },
                            { titolo: 'Permesso', rendi: riga => riga.permesso },
                            { titolo: 'Paziente', rendi: riga => riga.paziente_id },
                            {
                                titolo: 'Esito',
                                rendi: riga => distintivo(fmt.etichettaStato(riga.esito), TONI_ESITO[riga.esito] || 'neutral')
                            },
                            { titolo: 'Durata', numerica: true, rendi: riga => `${riga.durata_ms} ms` }
                        ],
                        righe: registro.righe,
                        vuotoTitolo: 'Nessuna operazione nel periodo',
                        vuotoTesto: 'Il registro traccia ogni lettura e ogni scrittura sui dati sanitari.',
                        vuotoSimbolo: 'history'
                    }),
                    el('div', { class: 'ds-panel__head' }, [
                        el('span', { class: 'ds-muted' },
                            `${filtro.scarto + 1}–${Math.min(filtro.scarto + PAGINA, registro.totale)} di ${fmt.numero(registro.totale)}`),
                        spaziatore(),
                        bottone({
                            simbolo: 'chevron_left', variante: 'ghost', piccolo: true, titolo: 'Pagina precedente',
                            disabilitato: filtro.scarto === 0,
                            onClick: () => { filtro.scarto = Math.max(0, filtro.scarto - PAGINA); disegna(); }
                        }),
                        bottone({
                            simbolo: 'chevron_right', variante: 'ghost', piccolo: true, titolo: 'Pagina successiva',
                            disabilitato: ultimo,
                            onClick: () => { filtro.scarto += PAGINA; disegna(); }
                        })
                    ])
                ])
            ]);
        };

        await disegna();
        return contenitore;
    }
};
