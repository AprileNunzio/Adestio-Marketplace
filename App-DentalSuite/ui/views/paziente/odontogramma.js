import { el, rimpiazza } from '../../components/dom.js';
import { pannello, bottone, distintivo, scheletro, vuoto, coppie, spaziatore } from '../../components/layout.js';
import { creaArcata } from '../../components/arcata_dentale.js';
import { esito } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import { can } from '../../security/permissions.js';
import * as fmt from '../../kernel/format.js';
import { oggetto, elenco } from '../shared/vista.js';
import { pannelloRilevazioni } from './rilevazioni.js';

function pastiglia(colore) {
    const nodo = el('span', { class: 'ds-scelta__pastiglia' });
    nodo.style.backgroundColor = colore;
    return nodo;
}

function selettoreStato(stati, scelto, onScegli) {
    return el('div', { class: 'ds-scelta' }, stati.map(stato => el('button', {
        class: 'ds-scelta__voce',
        type: 'button',
        'aria-pressed': String(stato.id === scelto),
        onClick: () => onScegli(stato.id)
    }, [pastiglia(stato.colore), stato.label])));
}

function selettoreSuperfici(superfici, scelte, onCambia) {
    const attive = new Set(String(scelte || '').split(',').filter(Boolean));
    return el('div', { class: 'ds-superfici' }, superfici.map(sigla => el('button', {
        class: 'ds-superfici__voce',
        type: 'button',
        title: sigla,
        'aria-pressed': String(attive.has(sigla)),
        onClick: () => {
            if (attive.has(sigla)) attive.delete(sigla);
            else attive.add(sigla);
            onCambia([...attive].join(','));
        }
    }, sigla)));
}

export default {
    rendi: async ({ paziente }) => {
        const puoModificare = await can('cartella_edit');
        const contenitore = el('div', { class: 'ds-root' }, scheletro(4));

        let dentizione = 'permanente';
        let selezionato = null;
        let filtroDente = null;
        let bozza = null;

        const disegna = async () => {
            const [mappa, storia] = await Promise.all([
                call('odontogramma.get', { paziente_id: paziente.id, dentizione })
                    .then(risultato => oggetto(risultato, null)),
                call('odontogramma.storico', {
                    paziente_id: paziente.id,
                    numero_dente: filtroDente || undefined
                }).then(elenco)
            ]);

            if (!mappa) {
                rimpiazza(contenitore, vuoto({ titolo: 'Odontogramma non disponibile', simbolo: 'dentistry' }));
                return;
            }

            const dente = selezionato
                ? mappa.denti.find(voce => voce.numero_dente === selezionato)
                : null;

            if (dente && (!bozza || bozza.numero_dente !== dente.numero_dente)) {
                bozza = {
                    numero_dente: dente.numero_dente,
                    stato: dente.stato,
                    superfici: dente.superfici,
                    materiale: dente.materiale,
                    mobilita: dente.mobilita,
                    note: '',
                    data_rilevazione: fmt.oggiIso()
                };
            }

            const arcata = creaArcata({
                denti: mappa.denti,
                stati: mappa.stati,
                selezionato,
                interattivo: true,
                onSeleziona: voce => {
                    selezionato = voce.numero_dente;
                    filtroDente = voce.numero_dente;
                    bozza = null;
                    disegna();
                }
            });

            const registra = async () => {
                const risultato = await call('odontogramma.saveDente', {
                    ...bozza,
                    paziente_id: paziente.id,
                    numero_dente: dente.numero_dente
                });
                if (!esito(risultato, `Rilevazione registrata sull'elemento ${dente.numero_dente}`)) return;
                bozza = null;
                await disegna();
            };

            const campo = (etichetta, chiave, tipo) => el('label', { class: 'ds-field' }, [
                el('span', { class: 'ds-field__label' }, etichetta),
                el('input', {
                    class: 'ds-input',
                    type: tipo || 'text',
                    value: bozza ? bozza[chiave] : '',
                    disabled: !puoModificare,
                    onInput: evento => { bozza[chiave] = evento.target.value; }
                })
            ]);

            const dettaglio = dente
                ? pannello({
                    titolo: `${dente.numero_dente} · ${dente.nome}`,
                    azioni: [
                        distintivo(dente.arcata === 'superiore' ? 'Arcata superiore' : 'Arcata inferiore', 'info'),
                        distintivo(dente.lato === 'destra' ? 'Emiarcata destra' : 'Emiarcata sinistra', 'neutral')
                    ]
                }, [
                    coppie([
                        { etichetta: 'Stato attuale', valore: (mappa.stati.find(s => s.id === dente.stato) || {}).label },
                        { etichetta: 'Ultima rilevazione', valore: dente.data_rilevazione ? fmt.data(dente.data_rilevazione) : 'mai registrata' }
                    ]),
                    el('div', { class: 'ds-field__label' }, 'Nuovo reperto'),
                    selettoreStato(mappa.stati, bozza.stato, valore => {
                        bozza.stato = valore;
                        disegna();
                    }),
                    el('div', { class: 'ds-field__label' }, 'Superfici interessate'),
                    selettoreSuperfici(mappa.superfici, bozza.superfici, valore => {
                        bozza.superfici = valore;
                        disegna();
                    }),
                    el('div', { class: 'ds-grid ds-grid--form' }, [
                        campo('Data della rilevazione', 'data_rilevazione', 'date'),
                        campo('Materiale', 'materiale'),
                        campo('Mobilità', 'mobilita'),
                        campo('Note cliniche', 'note')
                    ]),
                    el('div', { class: 'ds-toolbar' }, [
                        spaziatore(),
                        bottone({
                            etichetta: 'Registra rilevazione',
                            simbolo: 'add_task',
                            disabilitato: !puoModificare,
                            onClick: registra
                        })
                    ])
                ])
                : pannello({ titolo: 'Nessun elemento selezionato' }, vuoto({
                    titolo: 'Tocca un dente sull\'arcata',
                    testo: 'Seleziona un elemento per consultarne lo stato e registrare un nuovo reperto datato.',
                    simbolo: 'touch_app'
                }));

            const conReperto = mappa.denti.filter(voce => voce.registrato && voce.stato !== 'sano');

            rimpiazza(contenitore, [
                pannello({
                    titolo: `Odontogramma FDI · dentizione ${dentizione}`,
                    azioni: [
                        distintivo(`${conReperto.length} elementi con reperto`, conReperto.length > 0 ? 'warning' : 'success'),
                        spaziatore(),
                        bottone({
                            etichetta: dentizione === 'permanente' ? 'Dentizione decidua' : 'Dentizione permanente',
                            simbolo: 'swap_horiz',
                            variante: 'ghost',
                            piccolo: true,
                            onClick: () => {
                                dentizione = dentizione === 'permanente' ? 'decidua' : 'permanente';
                                selezionato = null;
                                filtroDente = null;
                                bozza = null;
                                disegna();
                            }
                        })
                    ]
                }, el('div', { class: 'ds-odonto' }, [arcata, dettaglio])),
                pannelloRilevazioni({
                    righe: storia,
                    stati: mappa.stati,
                    superfici: mappa.superfici,
                    filtroDente,
                    puoModificare,
                    onFiltro: numero => {
                        filtroDente = numero;
                        if (numero) selezionato = numero;
                        bozza = null;
                        disegna();
                    },
                    onAggiornato: disegna
                })
            ]);
        };

        await disegna();
        return contenitore;
    }
};
