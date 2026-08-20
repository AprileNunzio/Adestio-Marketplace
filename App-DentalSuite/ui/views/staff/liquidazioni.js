import { el, rimpiazza } from '../../components/dom.js';
import { pannello, bottone, statistica, griglia, spaziatore, vuoto } from '../../components/layout.js';
import { tabella } from '../../components/tabella.js';
import { apriModale } from '../../components/modale.js';
import { esito } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import * as fmt from '../../kernel/format.js';
import { elenco, oggetto } from '../shared/vista.js';

function inizioMeseCorrente() {
    const adesso = new Date();
    return fmt.isoDa(new Date(adesso.getFullYear(), adesso.getMonth(), 1));
}

function fineMeseCorrente() {
    const adesso = new Date();
    return fmt.isoDa(new Date(adesso.getFullYear(), adesso.getMonth() + 1, 0));
}

function riepilogoBozza(bozza) {
    return [
        griglia('stats', [
            statistica({ etichetta: 'Trattamenti', valore: String(bozza.numero_trattamenti) }),
            statistica({ etichetta: 'Competenze lorde', valore: fmt.euro(bozza.totale_competenze) }),
            statistica({ etichetta: 'Ritenuta d\'acconto', valore: fmt.euro(bozza.ritenuta_acconto) }),
            statistica({ etichetta: 'Netto da liquidare', valore: fmt.euro(bozza.totale_liquidato), tono: 'positivo' })
        ]),
        tabella({
            colonne: [
                { titolo: 'Data', rendi: riga => fmt.data(riga.data_trattamento) },
                { titolo: 'Prestazione', campo: 'descrizione' },
                { titolo: 'Ruolo', rendi: riga => fmt.etichettaStato(riga.ruolo) },
                { titolo: 'Importo', numerica: true, rendi: riga => fmt.euro(riga.importo) },
                { titolo: 'Quota', numerica: true, rendi: riga => fmt.euro(riga.quota) }
            ],
            righe: bozza.dettaglio,
            vuotoTitolo: 'Nessun trattamento liquidabile nel periodo',
            vuotoTesto: 'Solo i trattamenti in stato "eseguito" e non ancora liquidati concorrono al calcolo.',
            vuotoSimbolo: 'payments'
        })
    ];
}

export async function rendiLiquidazioni({ collaboratori, permessi }) {
    const contenitore = el('div', { class: 'ds-root' });
    const filtro = {
        staff_id: collaboratori[0] ? collaboratori[0].id : '',
        periodo_dal: inizioMeseCorrente(),
        periodo_al: fineMeseCorrente()
    };

    if (collaboratori.length === 0) {
        return vuoto({
            titolo: 'Nessun collaboratore attivo',
            testo: 'Registra i collaboratori prima di calcolare le liquidazioni.',
            simbolo: 'payments'
        });
    }

    const disegna = async () => {
        const [storico, bozza] = await Promise.all([
            call('compensi.listLiquidazioni', { staff_id: filtro.staff_id }).then(elenco),
            call('compensi.calcola', filtro).then(risultato => oggetto(risultato, null))
        ]);

        const campoStaff = el('select', {
            class: 'ds-select',
            onChange: evento => {
                filtro.staff_id = evento.target.value;
                disegna();
            }
        }, collaboratori.map(voce => el('option', {
            value: voce.id,
            selected: voce.id === filtro.staff_id
        }, voce.nominativo)));

        const campoDal = el('input', {
            class: 'ds-input', type: 'date', value: filtro.periodo_dal,
            onChange: evento => { filtro.periodo_dal = evento.target.value; disegna(); }
        });

        const campoAl = el('input', {
            class: 'ds-input', type: 'date', value: filtro.periodo_al,
            onChange: evento => { filtro.periodo_al = evento.target.value; disegna(); }
        });

        const liquida = async () => {
            const conferma = await apriModale({
                titolo: 'Emettere la liquidazione?',
                corpo: el('div', {}, [
                    el('p', {}, `${bozza.collaboratore} · periodo ${fmt.data(filtro.periodo_dal)} — ${fmt.data(filtro.periodo_al)}`),
                    el('p', { class: 'ds-muted' },
                        `${bozza.numero_trattamenti} trattamenti verranno marcati come liquidati e non saranno più modificabili.`),
                    el('p', {}, el('strong', {}, `Netto: ${fmt.euro(bozza.totale_liquidato)}`))
                ]),
                azioni: [
                    { etichetta: 'Annulla', variante: 'ghost', esito: false },
                    { etichetta: 'Emetti liquidazione', simbolo: 'payments', esito: true }
                ]
            });
            if (conferma !== true) return;
            const risultato = await call('compensi.liquida', filtro);
            if (esito(risultato, 'Liquidazione emessa')) await disegna();
        };

        rimpiazza(contenitore, [
            pannello({
                titolo: 'Calcolo competenze',
                azioni: [
                    campoStaff, campoDal, campoAl, spaziatore(),
                    permessi.liquida && bozza && bozza.numero_trattamenti > 0
                        ? bottone({ etichetta: 'Emetti liquidazione', simbolo: 'payments', onClick: liquida })
                        : null
                ].filter(Boolean)
            }, bozza ? riepilogoBozza(bozza) : el('p', { class: 'ds-muted' }, 'Calcolo non disponibile.')),
            pannello({ titolo: 'Storico liquidazioni', flush: true }, tabella({
                colonne: [
                    { titolo: 'Periodo', rendi: riga => `${fmt.data(riga.periodo_dal)} — ${fmt.data(riga.periodo_al)}` },
                    { titolo: 'Emessa il', rendi: riga => fmt.data(riga.data_liquidazione) },
                    { titolo: 'Trattamenti', numerica: true, campo: 'numero_trattamenti' },
                    { titolo: 'Competenze', numerica: true, rendi: riga => fmt.euro(riga.totale_competenze) },
                    { titolo: 'Ritenuta', numerica: true, rendi: riga => fmt.euro(riga.ritenuta_acconto) },
                    { titolo: 'Netto', numerica: true, rendi: riga => fmt.euro(riga.totale_liquidato) },
                    { titolo: 'Pagamento', rendi: riga => fmt.etichettaStato(riga.metodo_pagamento) }
                ],
                righe: storico,
                vuotoTitolo: 'Nessuna liquidazione emessa',
                vuotoTesto: 'Lo storico dei compensi liquidati al collaboratore comparirà qui.',
                vuotoSimbolo: 'receipt'
            }))
        ]);
    };

    await disegna();
    return contenitore;
}
