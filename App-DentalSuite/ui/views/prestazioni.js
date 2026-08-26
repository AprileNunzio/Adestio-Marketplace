import { el } from '../components/dom.js';
import { intestazione, pannello, bottone, distintivo, spaziatore, statistica, griglia } from '../components/layout.js';
import { tabella, azioniRiga } from '../components/tabella.js';
import { conferma } from '../components/modale.js';
import { esito } from '../components/notifica.js';
import { call } from '../kernel/transport.js';
import { can } from '../security/permissions.js';
import * as fmt from '../kernel/format.js';
import { montaVista, elenco } from './shared/vista.js';
import { apriForm } from './shared/form_modale.js';
import { SEZIONI_PRESTAZIONE, PRESTAZIONE_VUOTA } from './forms/prestazione_form.js';

function tonoMargine(percentuale) {
    if (percentuale >= 45) return 'success';
    if (percentuale >= 25) return 'warning';
    return 'danger';
}

export default {
    rendi: async ({ indietro }) => {
        const permessi = {
            modifica: await can('prestazioni_edit'),
            elimina: await can('prestazioni_delete')
        };
        let categoria = '';

        return montaVista({
            accento: 'prestazioni',
            carica: async () => elenco(await call('prestazioni.list', {})),
            disegna: (righe, aggiorna) => {
                const categorie = [...new Set(righe.map(riga => riga.categoria).filter(Boolean))].sort();
                const visibili = righe.filter(riga => !categoria || riga.categoria === categoria);

                const apri = async riga => {
                    await apriForm({
                        titolo: riga ? `Modifica ${riga.nome}` : 'Nuova prestazione',
                        sezioni: SEZIONI_PRESTAZIONE,
                        valori: riga ? { ...PRESTAZIONE_VUOTA, ...riga } : { ...PRESTAZIONE_VUOTA },
                        ampia: true,
                        etichettaSalva: riga ? 'Aggiorna' : 'Crea prestazione',
                        onSalva: stato => call(riga ? 'prestazioni.update' : 'prestazioni.create', {
                            ...stato,
                            id: riga ? riga.id : undefined
                        })
                    });
                    await aggiorna();
                };

                const elimina = async riga => {
                    const procedi = await conferma({
                        titolo: 'Eliminare la prestazione?',
                        messaggio: `"${riga.nome}" verrà rimossa dal listino. Le prestazioni già utilizzate in cartella non sono eliminabili.`,
                        etichettaConferma: 'Elimina',
                        distruttiva: true
                    });
                    if (!procedi) return;
                    if (esito(await call('prestazioni.remove', { id: riga.id }), 'Prestazione eliminata')) await aggiorna();
                };

                const prezzoMedio = righe.length > 0
                    ? righe.reduce((somma, riga) => somma + Number(riga.prezzo_paziente || 0), 0) / righe.length
                    : 0;
                const margineMedio = righe.length > 0
                    ? righe.reduce((somma, riga) => somma + Number(riga.marginalita_percentuale || 0), 0) / righe.length
                    : 0;

                const filtro = el('select', {
                    class: 'ds-select',
                    onChange: evento => {
                        categoria = evento.target.value;
                        aggiorna();
                    }
                }, [
                    el('option', { value: '', selected: categoria === '' }, 'Tutte le categorie'),
                    ...categorie.map(voce => el('option', { value: voce, selected: categoria === voce }, voce))
                ]);

                return [
                    intestazione({
                        titolo: 'Listino & Marginalità',
                        sottotitolo: `${righe.length} prestazioni a catalogo · ${categorie.length} categorie cliniche`,
                        simbolo: 'list_alt',
                        indietro,
                        azioni: permessi.modifica
                            ? [bottone({ etichetta: 'Nuova prestazione', simbolo: 'add', onClick: () => apri(null) })]
                            : []
                    }),
                    griglia('stats', [
                        statistica({ etichetta: 'Prestazioni attive', valore: String(righe.filter(r => Number(r.attiva) === 1).length) }),
                        statistica({ etichetta: 'Prezzo medio', valore: fmt.euro(prezzoMedio) }),
                        statistica({
                            etichetta: 'Marginalità media',
                            valore: fmt.percentuale(margineMedio),
                            tono: margineMedio >= 35 ? 'positivo' : 'negativo'
                        })
                    ]),
                    pannello({
                        titolo: 'Nomenclatore clinico',
                        azioni: [filtro, spaziatore(), el('span', { class: 'ds-muted' }, `${visibili.length} voci`)],
                        flush: true
                    }, tabella({
                        colonne: [
                            { titolo: 'Codice', campo: 'codice' },
                            { titolo: 'Prestazione', campo: 'nome' },
                            { titolo: 'Categoria', rendi: riga => riga.categoria ? distintivo(riga.categoria, 'info') : '—' },
                            { titolo: 'Durata', numerica: true, rendi: riga => `${riga.durata_stimata_minuti}′` },
                            { titolo: 'Prezzo', numerica: true, rendi: riga => fmt.euro(riga.prezzo_paziente) },
                            { titolo: 'Quota medico', numerica: true, rendi: riga => fmt.euro(riga.quota_medico_calcolata) },
                            { titolo: 'Materiali', numerica: true, rendi: riga => fmt.euro(riga.costo_materiale_stimato) },
                            { titolo: 'Margine', numerica: true, rendi: riga => fmt.euro(riga.margine_studio) },
                            {
                                titolo: 'Marginalità',
                                numerica: true,
                                rendi: riga => distintivo(
                                    fmt.percentuale(riga.marginalita_percentuale),
                                    tonoMargine(Number(riga.marginalita_percentuale))
                                )
                            },
                            {
                                titolo: '',
                                rendi: riga => azioniRiga([
                                    Number(riga.attiva) === 1 ? null : distintivo('Sospesa', 'neutral'),
                                    permessi.modifica ? bottone({
                                        simbolo: 'edit', variante: 'ghost', piccolo: true,
                                        titolo: 'Modifica', onClick: () => apri(riga)
                                    }) : null,
                                    permessi.elimina ? bottone({
                                        simbolo: 'delete', variante: 'ghost', piccolo: true,
                                        titolo: 'Elimina', onClick: () => elimina(riga)
                                    }) : null
                                ])
                            }
                        ],
                        righe: visibili,
                        vuotoTitolo: 'Listino vuoto',
                        vuotoTesto: 'Configura il nomenclatore delle prestazioni con tariffe e ripartizione dei compensi.',
                        vuotoSimbolo: 'list_alt'
                    }))
                ];
            }
        });
    }
};
