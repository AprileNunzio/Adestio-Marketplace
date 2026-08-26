import { el, rimpiazza } from '../../components/dom.js';
import { pannello, bottone, distintivo, statistica, griglia } from '../../components/layout.js';
import { tabella, azioniRiga } from '../../components/tabella.js';
import { call } from '../../kernel/transport.js';
import { can } from '../../security/permissions.js';
import * as fmt from '../../kernel/format.js';
import { oggetto } from '../shared/vista.js';
import { apriForm } from '../shared/form_modale.js';

const METODI = [
    { valore: 'contanti', etichetta: 'Contanti' },
    { valore: 'bancomat', etichetta: 'Bancomat' },
    { valore: 'carta_credito', etichetta: 'Carta di credito' },
    { valore: 'bonifico', etichetta: 'Bonifico' },
    { valore: 'assegno', etichetta: 'Assegno' }
];

export default {
    rendi: async ({ naviga }) => {
        const puoIncassare = await can('rate_edit');
        const contenitore = el('div', { class: 'ds-root' });
        let soloScadute = false;

        const disegna = async () => {
            const dati = oggetto(await call('rate.scadenziario', {}), {
                righe: [], totale_aperto: 0, totale_scaduto: 0
            });
            const righe = (dati.righe || []).filter(riga => !soloScadute || riga.scaduta);

            const salda = async rata => {
                await apriForm({
                    titolo: `Incasso rata ${rata.numero_rata} · ${fmt.euro(rata.importo)}`,
                    sezioni: [{
                        titolo: null,
                        campi: [
                            { campo: 'metodo_pagamento', etichetta: 'Metodo', genere: 'selezione', opzioni: METODI, vuoto: false },
                            { campo: 'numero_ricevuta', etichetta: 'Numero ricevuta' },
                            { campo: 'data_pagamento', etichetta: 'Data incasso', tipo: 'date' }
                        ]
                    }],
                    valori: { metodo_pagamento: 'contanti', data_pagamento: fmt.oggiIso() },
                    etichettaSalva: 'Registra incasso',
                    onSalva: stato => call('rate.pagaRata', { ...stato, id: rata.id })
                });
                await disegna();
            };

            rimpiazza(contenitore, [
                griglia('stats', [
                    statistica({ etichetta: 'Credito aperto', valore: fmt.euro(dati.totale_aperto) }),
                    statistica({
                        etichetta: 'Di cui scaduto',
                        valore: fmt.euro(dati.totale_scaduto),
                        tono: Number(dati.totale_scaduto) > 0 ? 'negativo' : undefined
                    }),
                    statistica({ etichetta: 'Rate aperte', valore: String((dati.righe || []).length) }),
                    statistica({
                        etichetta: 'Rate scadute',
                        valore: String((dati.righe || []).filter(riga => riga.scaduta).length)
                    })
                ]),
                pannello({
                    titolo: 'Scadenziario rateale',
                    azioni: [
                        el('label', { class: 'ds-check' }, [
                            el('input', {
                                type: 'checkbox',
                                checked: soloScadute,
                                onChange: evento => {
                                    soloScadute = evento.target.checked;
                                    disegna();
                                }
                            }),
                            el('span', {}, 'Solo scadute')
                        ])
                    ],
                    flush: true
                }, tabella({
                    colonne: [
                        { titolo: 'Scadenza', rendi: riga => fmt.data(riga.data_scadenza) },
                        { titolo: 'Paziente', campo: 'paziente_nome' },
                        { titolo: 'Rata', numerica: true, campo: 'numero_rata' },
                        { titolo: 'Importo', numerica: true, rendi: riga => fmt.euro(riga.importo) },
                        {
                            titolo: 'Stato',
                            rendi: riga => distintivo(riga.scaduta ? 'Scaduta' : 'In attesa', riga.scaduta ? 'danger' : 'warning')
                        },
                        {
                            titolo: '',
                            rendi: riga => azioniRiga([
                                bottone({
                                    simbolo: 'person', variante: 'ghost', piccolo: true, titolo: 'Apri cartella',
                                    onClick: () => naviga('paziente', { id: riga.paziente_id })
                                }),
                                puoIncassare ? bottone({
                                    etichetta: 'Salda', simbolo: 'payments', piccolo: true,
                                    onClick: () => salda(riga)
                                }) : null
                            ])
                        }
                    ],
                    righe,
                    vuotoTitolo: soloScadute ? 'Nessuna rata scaduta' : 'Nessuna rata aperta',
                    vuotoTesto: 'Lo scadenziario mostra tutte le rate non ancora incassate dei piani attivi.',
                    vuotoSimbolo: 'event_available'
                }))
            ]);
        };

        await disegna();
        return contenitore;
    }
};
