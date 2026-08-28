import { el, rimpiazza } from '../../components/dom.js';
import { pannello, bottone, distintivo, statistica, griglia, scheletro } from '../../components/layout.js';
import { tabella, azioniRiga } from '../../components/tabella.js';
import { conferma } from '../../components/modale.js';
import { esito } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import { can } from '../../security/permissions.js';
import * as fmt from '../../kernel/format.js';
import { elenco } from '../shared/vista.js';
import { apriTrattamentoEditor } from './trattamento_editor.js';
import { apriIncasso } from '../contabilita/pagamento_form.js';

const STATI = [
    { valore: 'pianificato', etichetta: 'Pianificato', tono: 'info' },
    { valore: 'in_corso', etichetta: 'In corso', tono: 'warning' },
    { valore: 'eseguito', etichetta: 'Eseguito', tono: 'success' },
    { valore: 'annullato', etichetta: 'Annullato', tono: 'neutral' }
];

export default {
    rendi: async ({ paziente }) => {
        const puoModificare = await can('cartella_edit');
        const puoIncassare = await can('incassi_manage') || await can('cartella_edit');
        const contenitore = el('div', { class: 'ds-root' }, scheletro(3));

        const disegna = async () => {
            try {
                const [righe, prestazioni, medici] = await Promise.all([
                    call('trattamenti.listByPaziente', { paziente_id: paziente.id }).then(elenco),
                    call('prestazioni.list', {}).then(elenco),
                    call('staff.list', {}).then(elenco)
                ]);

                const eseguiti = righe.filter(riga => riga.stato === 'eseguito');
                const totale = eseguiti.reduce((somma, riga) => somma + Number(riga.importo || 0), 0);
                const omaggi = righe.filter(riga => Number(riga.importo) === 0).length;
                const pianificato = righe
                    .filter(riga => riga.stato === 'pianificato' || riga.stato === 'in_corso')
                    .reduce((somma, riga) => somma + Number(riga.importo || 0), 0);

                const nomiMedici = new Map(medici.map(medico => [medico.id, medico.nominativo]));

                const apri = async riga => {
                    await apriTrattamentoEditor({
                        trattamento: riga,
                        paziente,
                        prestazioni,
                        staff: medici,
                        onSalva: async stato => {
                            const res = await call(riga ? 'trattamenti.update' : 'trattamenti.add', {
                                ...stato,
                                id: riga ? riga.id : undefined,
                                paziente_id: paziente.id
                            });
                            esito(res, riga ? 'Trattamento aggiornato' : 'Trattamento registrato');
                            await disegna();
                        }
                    });
                };

                const cambiaStatoRapido = async (riga, nuovoStato) => {
                    try {
                        const res = await call('trattamenti.update', {
                            ...riga,
                            stato: nuovoStato
                        });
                        if (esito(res, `Stato aggiornato a ${fmt.etichettaStato(nuovoStato)}`)) {
                            await disegna();
                        }
                    } catch (err) {
                        alert(String(err && err.message ? err.message : err));
                    }
                };

                const impostaOmaggio = async (riga, omaggio) => {
                    try {
                        let importoNuovo = 0;
                        if (!omaggio) {
                            const prest = prestazioni.find(p => p.id === riga.prestazione_id);
                            importoNuovo = prest ? prest.prezzo_paziente : 0;
                        }
                        const res = await call('trattamenti.update', {
                            ...riga,
                            importo: importoNuovo,
                            note: omaggio
                                ? (riga.note ? `${riga.note} (Omaggio)` : 'Trattamento offerto/omaggio')
                                : (riga.note || '').replace('(Omaggio)', '').trim()
                        });
                        if (esito(res, omaggio ? 'Trattamento impostato come Omaggio' : 'Ripristinato prezzo a listino')) {
                            await disegna();
                        }
                    } catch (err) {
                        alert(String(err && err.message ? err.message : err));
                    }
                };

                const incassaRapido = async riga => {
                    try {
                        await apriIncasso({
                            pazienteId: paziente.id,
                            importoPredefinito: riga.importo,
                            titolo: `Incasso prestazione: ${riga.descrizione}`
                        });
                        await disegna();
                    } catch (err) {
                        console.error(err);
                    }
                };

                const elimina = async riga => {
                    const procedi = await conferma({
                        titolo: 'Eliminare il trattamento?',
                        messaggio: `"${riga.descrizione}" verrà rimosso dal diario clinico.`,
                        etichettaConferma: 'Elimina',
                        distruttiva: true
                    });
                    if (!procedi) return;
                    if (esito(await call('trattamenti.remove', { id: riga.id }), 'Trattamento eliminato')) await disegna();
                };

                rimpiazza(contenitore, [
                    griglia('stats', [
                        statistica({ etichetta: 'Trattamenti eseguiti', valore: String(eseguiti.length) }),
                        statistica({ etichetta: 'Valore eseguito', valore: fmt.euro(totale), tono: 'positivo' }),
                        statistica({ etichetta: 'In programma', valore: fmt.euro(pianificato) }),
                        statistica({ etichetta: 'Prestazioni omaggio', valore: String(omaggi), nota: 'Trattamenti regalati / gratuiti' })
                    ]),
                    pannello({
                        titolo: 'Diario clinico trattamenti',
                        azioni: puoModificare
                            ? [bottone({ etichetta: 'Nuovo trattamento', simbolo: 'add', onClick: () => apri(null) })]
                            : [],
                        flush: true
                    }, tabella({
                        colonne: [
                            { titolo: 'Data', rendi: riga => fmt.data(riga.data_trattamento) },
                            {
                                titolo: 'Prestazione & Note',
                                rendi: riga => el('div', {}, [
                                    el('strong', {}, riga.descrizione || '—'),
                                    riga.note ? el('div', { class: 'ds-muted', style: 'font-size: 0.78rem;' }, riga.note) : null,
                                    riga.anestesia ? el('div', { style: 'font-size: 0.74rem; color: var(--ds-accent);' }, `💉 Anestesia: ${riga.anestesia}`) : null
                                ].filter(Boolean))
                            },
                            {
                                titolo: 'Elemento',
                                rendi: riga => riga.dente
                                    ? el('span', {}, [
                                        el('strong', {}, riga.dente),
                                        riga.superfici ? el('small', { class: 'ds-muted' }, ` (${riga.superfici})`) : null
                                    ].filter(Boolean))
                                    : '—'
                            },
                            { titolo: 'Medico', rendi: riga => nomiMedici.get(riga.medico_id) || '—' },
                            {
                                titolo: 'Stato',
                                rendi: riga => {
                                    if (riga.liquidazione_id || !puoModificare) {
                                        return distintivo(fmt.etichettaStato(riga.stato), riga.stato === 'eseguito' ? 'success' : 'neutral');
                                    }
                                    return el('select', {
                                        class: 'ds-select ds-select--sm',
                                        style: 'padding: 2px 6px; font-size: 0.8rem; height: auto; min-width: 110px;',
                                        onChange: evento => cambiaStatoRapido(riga, evento.target.value)
                                    }, STATI.map(s => el('option', {
                                        value: s.valore, selected: s.valore === riga.stato
                                    }, s.etichetta)));
                                }
                            },
                            {
                                titolo: 'Importo & Pagamento',
                                numerica: true,
                                rendi: riga => {
                                    const isZero = Number(riga.importo) === 0;
                                    if (isZero) {
                                        return el('div', { style: 'display:flex;align-items:center;gap:6px;justify-content:flex-end;' }, [
                                            distintivo('🎁 Regalato / Omaggio', 'success'),
                                            puoModificare && !riga.liquidazione_id ? bottone({
                                                simbolo: 'undo',
                                                variante: 'ghost',
                                                piccolo: true,
                                                titolo: 'Ripristina prezzo a listino',
                                                onClick: () => impostaOmaggio(riga, false)
                                            }) : null
                                        ].filter(Boolean));
                                    }
                                    return el('div', { style: 'display:flex;align-items:center;gap:6px;justify-content:flex-end;' }, [
                                        el('strong', {}, fmt.euro(riga.importo)),
                                        puoModificare && !riga.liquidazione_id ? bottone({
                                            simbolo: 'redeem',
                                            variante: 'ghost',
                                            piccolo: true,
                                            titolo: 'Rendi omaggio (0 €)',
                                            onClick: () => impostaOmaggio(riga, true)
                                        }) : null,
                                        puoIncassare ? bottone({
                                            simbolo: 'payments',
                                            variante: 'ghost',
                                            piccolo: true,
                                            titolo: 'Incassa prestazione',
                                            onClick: () => incassaRapido(riga)
                                        }) : null
                                    ].filter(Boolean));
                                }
                            },
                            {
                                titolo: '',
                                rendi: riga => azioniRiga([
                                    riga.liquidazione_id ? distintivo('Liquidato', 'neutral') : null,
                                    puoModificare && !riga.liquidazione_id ? bottone({
                                        simbolo: 'edit', variante: 'ghost', piccolo: true,
                                        titolo: 'Modifica', onClick: () => apri(riga)
                                    }) : null,
                                    puoModificare && !riga.liquidazione_id ? bottone({
                                        simbolo: 'delete', variante: 'ghost', piccolo: true,
                                        titolo: 'Elimina', onClick: () => elimina(riga)
                                    }) : null
                                ])
                            }
                        ],
                        righe,
                        vuotoTitolo: 'Diario clinico vuoto',
                        vuotoTesto: 'Registra il primo trattamento per costruire la storia clinica del paziente.',
                        vuotoSimbolo: 'medical_services'
                    }))
                ]);
            } catch (err) {
                console.error(err);
            }
        };

        await disegna();
        return contenitore;
    }
};
