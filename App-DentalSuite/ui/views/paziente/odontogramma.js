import { el, rimpiazza } from '../../components/dom.js';
import { pannello, bottone, scheletro, vuoto } from '../../components/layout.js';
import { apriModale } from '../../components/modale.js';
import { costruisciCampi } from '../../components/campi.js';
import { esito } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import { can } from '../../security/permissions.js';
import { oggetto } from '../shared/vista.js';

const SUPERFICI = [
    { valore: 'M', etichetta: 'Mesiale' },
    { valore: 'D', etichetta: 'Distale' },
    { valore: 'V', etichetta: 'Vestibolare' },
    { valore: 'L', etichetta: 'Linguale / Palatale' },
    { valore: 'O', etichetta: 'Occlusale / Incisale' }
];

function coloreDi(stati, idStato) {
    const trovato = stati.find(stato => stato.id === idStato);
    return trovato ? trovato.colore : '#e2e8f0';
}

function elementoDente(dente, stati, onApri) {
    const corona = el('span', { class: 'ds-dente__corona' });
    corona.style.backgroundColor = coloreDi(stati, dente.stato);
    return el('button', {
        class: 'ds-dente',
        type: 'button',
        dataset: { registrato: dente.registrato ? 'true' : 'false' },
        title: `Dente ${dente.numero_dente} · ${dente.stato}${dente.superfici ? ` (${dente.superfici})` : ''}`,
        onClick: () => onApri(dente)
    }, [corona, el('span', { class: 'ds-dente__num' }, dente.numero_dente)]);
}

function legenda(stati) {
    return el('div', { class: 'ds-legend' }, stati.map(stato => {
        const campione = el('span', { class: 'ds-legend__swatch' });
        campione.style.backgroundColor = stato.colore;
        return el('span', { class: 'ds-legend__item' }, [campione, stato.label]);
    }));
}

export default {
    rendi: async ({ paziente }) => {
        const puoModificare = await can('cartella_edit');
        const contenitore = el('div', { class: 'ds-root' }, scheletro(3));
        let dentizione = 'permanente';

        const disegna = async () => {
            const dati = oggetto(await call('odontogramma.get', {
                paziente_id: paziente.id,
                dentizione
            }), null);
            if (!dati) {
                rimpiazza(contenitore, vuoto({ titolo: 'Odontogramma non disponibile', simbolo: 'dentistry' }));
                return;
            }

            const perNumero = new Map(dati.denti.map(dente => [dente.numero_dente, dente]));

            const apriDente = async dente => {
                if (!puoModificare) return;
                const stato = {
                    stato: dente.stato,
                    superfici: dente.superfici,
                    materiale: dente.materiale,
                    mobilita: dente.mobilita,
                    note: dente.note
                };
                const campi = [
                    {
                        campo: 'stato',
                        etichetta: 'Stato clinico',
                        genere: 'selezione',
                        vuoto: false,
                        opzioni: dati.stati.map(voce => ({ valore: voce.id, etichetta: voce.label }))
                    },
                    {
                        campo: 'superfici',
                        etichetta: 'Superfici interessate',
                        aiuto: 'Sigle separate da virgola',
                        genere: 'selezione',
                        opzioni: SUPERFICI,
                        segnaposto: 'Nessuna'
                    },
                    { campo: 'materiale', etichetta: 'Materiale' },
                    { campo: 'mobilita', etichetta: 'Mobilità' },
                    { campo: 'note', etichetta: 'Note cliniche', genere: 'area', ampio: true }
                ];

                await apriModale({
                    titolo: `Elemento ${dente.numero_dente}`,
                    corpo: el('div', { class: 'ds-grid ds-grid--form' },
                        costruisciCampi(campi, stato, (campo, valore) => {
                            stato[campo] = valore;
                        })),
                    azioni: [
                        { etichetta: 'Annulla', variante: 'ghost', esito: null },
                        {
                            etichetta: 'Registra',
                            simbolo: 'save',
                            onAzione: async () => {
                                const risultato = await call('odontogramma.saveDente', {
                                    ...stato,
                                    paziente_id: paziente.id,
                                    numero_dente: dente.numero_dente
                                });
                                if (!esito(risultato, `Elemento ${dente.numero_dente} aggiornato`)) return false;
                                await disegna();
                                return true;
                            }
                        }
                    ]
                });
            };

            const riga = numeri => el('div', { class: 'ds-arcata__row' },
                numeri.map(numero => elementoDente(perNumero.get(numero), dati.stati, apriDente)));

            const registrati = dati.denti.filter(dente => dente.registrato && dente.stato !== 'sano');

            rimpiazza(contenitore, [
                pannello({
                    titolo: `Odontogramma FDI · dentizione ${dentizione}`,
                    azioni: [
                        bottone({
                            etichetta: dentizione === 'permanente' ? 'Passa a decidua' : 'Passa a permanente',
                            simbolo: 'swap_horiz',
                            variante: 'ghost',
                            piccolo: true,
                            onClick: async () => {
                                dentizione = dentizione === 'permanente' ? 'decidua' : 'permanente';
                                await disegna();
                            }
                        })
                    ]
                }, [
                    el('div', { class: 'ds-arcata' }, [
                        riga(dati.arcate.superiore),
                        el('div', { class: 'ds-muted' }, puoModificare
                            ? 'Clicca un elemento per registrarne lo stato clinico'
                            : 'Consultazione in sola lettura'),
                        riga(dati.arcate.inferiore)
                    ]),
                    legenda(dati.stati)
                ]),
                pannello({ titolo: `Elementi con reperto (${registrati.length})` },
                    registrati.length === 0
                        ? el('p', { class: 'ds-muted' }, 'Nessun elemento con reperto registrato.')
                        : el('div', { class: 'ds-toolbar' }, registrati.map(dente =>
                            el('span', { class: 'ds-badge' },
                                `${dente.numero_dente} · ${dente.stato}${dente.superfici ? ` (${dente.superfici})` : ''}`))))
            ]);
        };

        await disegna();
        return contenitore;
    }
};
