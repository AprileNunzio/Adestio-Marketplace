import { el } from '../../components/dom.js';
import { pannello, statistica, griglia, avviso, spaziatore } from '../../components/layout.js';
import { barreOrizzontali } from '../../components/barre.js';
import { flussoMensile, distribuzione } from '../../components/grafici.js';
import { call } from '../../kernel/transport.js';
import { can } from '../../security/permissions.js';
import * as fmt from '../../kernel/format.js';
import { montaVista, oggetto } from '../shared/vista.js';

function inizioAnno() {
    return `${new Date().getFullYear()}-01-01`;
}

function tono(valore) {
    return Number(valore) >= 0 ? 'positivo' : 'negativo';
}

function indicatoriDiCassa(cassa) {
    return griglia('stats', [
        statistica({
            etichetta: 'Entrate del periodo',
            valore: fmt.euro(cassa.totale_incassi),
            nota: `${cassa.movimenti_incasso} incassi registrati`,
            tono: 'positivo'
        }),
        statistica({
            etichetta: 'Uscite del periodo',
            valore: fmt.euro(cassa.totale_spese),
            nota: `${cassa.movimenti_spesa} movimenti in prima nota`,
            tono: 'negativo'
        }),
        statistica({
            etichetta: 'Saldo di cassa',
            valore: fmt.euro(cassa.saldo_cassa),
            tono: tono(cassa.saldo_cassa)
        }),
        statistica({
            etichetta: 'Insoluto rateale',
            valore: fmt.euro(cassa.importo_aperto),
            nota: `${cassa.rate_scadute} rate scadute su ${cassa.rate_aperte} aperte`,
            tono: cassa.rate_scadute > 0 ? 'negativo' : undefined
        })
    ]);
}

function indicatoriDiMargine(economia) {
    return griglia('stats', [
        statistica({ etichetta: 'Compensi allo staff', valore: fmt.euro(economia.compensi_staff), tono: 'negativo' }),
        statistica({ etichetta: 'Costo materiali', valore: fmt.euro(economia.costo_materiali), tono: 'negativo' }),
        statistica({
            etichetta: 'Margine netto',
            valore: fmt.euro(economia.margine_netto),
            tono: tono(economia.margine_netto)
        }),
        statistica({
            etichetta: 'Marginalità',
            valore: fmt.percentuale(economia.marginalita_percentuale),
            tono: tono(economia.marginalita_percentuale)
        })
    ]);
}

export default {
    rendi: async ({ naviga }) => {
        const permessi = {
            cassa: await can('incassi_view'),
            direzione: await can('direzione_economics')
        };
        const filtro = { dal: inizioAnno(), al: fmt.oggiIso() };

        return montaVista({
            accento: 'contabilita',
            carica: async () => {
                const [cassa, economia, scadenziario] = await Promise.all([
                    permessi.cassa
                        ? call('statistiche.cassa', filtro).then(risultato => oggetto(risultato, null))
                        : Promise.resolve(null),
                    permessi.direzione
                        ? call('statistiche.economia', filtro).then(risultato => oggetto(risultato, null))
                        : Promise.resolve(null),
                    call('rate.scadenziario', {}).then(risultato => oggetto(risultato, { righe: [] }))
                ]);
                return { cassa, economia, scadenziario };
            },
            disegna: ({ cassa, economia, scadenziario }, aggiorna) => {
                const campoDal = el('input', {
                    class: 'ds-input', type: 'date', value: filtro.dal,
                    onChange: evento => { filtro.dal = evento.target.value; aggiorna(); }
                });
                const campoAl = el('input', {
                    class: 'ds-input', type: 'date', value: filtro.al,
                    onChange: evento => { filtro.al = evento.target.value; aggiorna(); }
                });

                if (!cassa) {
                    return avviso({
                        tono: 'warning',
                        simbolo: 'lock',
                        titolo: 'Cruscotto non disponibile',
                        voci: ['Il cruscotto richiede il permesso di consultazione degli incassi.']
                    });
                }

                const flusso = (economia && economia.flusso_mensile) || cassa.flusso_mensile;
                const scadute = (scadenziario.righe || []).filter(riga => riga.scaduta).slice(0, 6);

                return [
                    el('div', { class: 'ds-toolbar' }, [
                        el('span', { class: 'ds-muted' }, `Periodo ${fmt.data(filtro.dal)} — ${fmt.data(filtro.al)}`),
                        spaziatore(),
                        campoDal,
                        campoAl
                    ]),
                    indicatoriDiCassa(cassa),
                    pannello({ titolo: 'Entrate e uscite mese per mese' },
                        flussoMensile({ voci: flusso, formatta: fmt.euro })),
                    griglia('cards', [
                        pannello({ titolo: 'Uscite per categoria' },
                            distribuzione({
                                voci: cassa.spese_per_categoria.map(voce => ({
                                    ...voce,
                                    etichetta: fmt.etichettaStato(voce.etichetta)
                                })),
                                formatta: fmt.euro,
                                titoloVuoto: 'Nessuna spesa registrata nel periodo'
                            })),
                        pannello({ titolo: 'Entrate per metodo di pagamento' },
                            distribuzione({
                                voci: cassa.incassi_per_metodo.map(voce => ({
                                    ...voce,
                                    etichetta: fmt.etichettaStato(voce.etichetta)
                                })),
                                formatta: fmt.euro,
                                titoloVuoto: 'Nessun incasso registrato nel periodo'
                            }))
                    ]),
                    permessi.direzione && economia ? indicatoriDiMargine(economia) : null,
                    permessi.direzione && economia ? pannello({
                        titolo: 'Uscite per collaboratore'
                    }, barreOrizzontali(economia.compensi_per_collaboratore, fmt.euro)) : null,
                    scadute.length > 0 ? avviso({
                        tono: 'danger',
                        simbolo: 'event_busy',
                        titolo: `${scadute.length} rate scadute da recuperare`,
                        voci: scadute.map(riga =>
                            `${riga.paziente_nome || 'Paziente'} · ${fmt.euro(riga.importo)} scaduta il ${fmt.data(riga.data_scadenza)}`)
                    }) : null,
                    el('div', { class: 'ds-toolbar' }, [
                        el('button', {
                            class: 'ds-btn ds-btn--ghost',
                            type: 'button',
                            onClick: () => naviga('statistiche')
                        }, 'Apri le statistiche di produzione')
                    ])
                ].filter(Boolean);
            }
        });
    }
};
