import { el, rimpiazza } from '../../components/dom.js';
import { pannello, bottone, distintivo, statistica, griglia, spaziatore } from '../../components/layout.js';
import { tabella, azioniRiga } from '../../components/tabella.js';
import { conferma } from '../../components/modale.js';
import { esito } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import { can } from '../../security/permissions.js';
import * as fmt from '../../kernel/format.js';
import { oggetto } from '../shared/vista.js';
import { selettorePaziente } from '../shared/selettore_paziente.js';
import { apriIncasso } from './pagamento_form.js';

function inizioAnno() {
    return `${new Date().getFullYear()}-01-01`;
}

export default {
    rendi: async ({ naviga }) => {
        const puoRegistrare = await can('incassi_edit');
        const contenitore = el('div', { class: 'ds-root' });
        const filtro = { dal: inizioAnno(), al: fmt.oggiIso() };

        const disegna = async () => {
            const dati = oggetto(await call('incassi.list', filtro), { righe: [], totale: 0 });
            const righe = dati.righe || [];

            const registra = async () => {
                const pazienteId = await selettorePaziente();
                if (!pazienteId) return;
                await apriIncasso({ pazienteId });
                await disegna();
            };

            const storna = async riga => {
                const procedi = await conferma({
                    titolo: 'Stornare l\'incasso?',
                    messaggio: `${fmt.euro(riga.importo)} del ${fmt.data(riga.data_pagamento)} verranno stornati dalla contabilità.`,
                    etichettaConferma: 'Storna',
                    distruttiva: true
                });
                if (!procedi) return;
                if (esito(await call('incassi.remove', { id: riga.id }), 'Incasso stornato')) await disegna();
            };

            const perMetodo = righe.reduce((mappa, riga) => {
                mappa[riga.metodo_pagamento] = (mappa[riga.metodo_pagamento] || 0) + Number(riga.importo || 0);
                return mappa;
            }, {});

            const campoDal = el('input', {
                class: 'ds-input', type: 'date', value: filtro.dal,
                onChange: evento => { filtro.dal = evento.target.value; disegna(); }
            });
            const campoAl = el('input', {
                class: 'ds-input', type: 'date', value: filtro.al,
                onChange: evento => { filtro.al = evento.target.value; disegna(); }
            });

            rimpiazza(contenitore, [
                griglia('stats', [
                    statistica({ etichetta: 'Totale incassato', valore: fmt.euro(dati.totale), tono: 'positivo' }),
                    statistica({ etichetta: 'Movimenti', valore: String(righe.length) }),
                    ...Object.entries(perMetodo).slice(0, 2).map(([metodo, importo]) =>
                        statistica({ etichetta: fmt.etichettaStato(metodo), valore: fmt.euro(importo) }))
                ]),
                pannello({
                    titolo: 'Registro incassi',
                    azioni: [
                        campoDal, campoAl, spaziatore(),
                        puoRegistrare ? bottone({ etichetta: 'Registra incasso', simbolo: 'add', onClick: registra }) : null
                    ].filter(Boolean),
                    flush: true
                }, tabella({
                    colonne: [
                        { titolo: 'Data', rendi: riga => fmt.data(riga.data_pagamento) },
                        { titolo: 'Paziente', campo: 'paziente_nome' },
                        { titolo: 'Documento', rendi: riga => `${fmt.etichettaStato(riga.tipo_documento)} ${riga.numero_documento || ''}`.trim() },
                        { titolo: 'Metodo', rendi: riga => distintivo(fmt.etichettaStato(riga.metodo_pagamento), 'info') },
                        { titolo: 'Importo', numerica: true, rendi: riga => fmt.euro(riga.importo) },
                        {
                            titolo: '',
                            rendi: riga => azioniRiga([
                                riga.paziente_id ? bottone({
                                    simbolo: 'person', variante: 'ghost', piccolo: true, titolo: 'Apri cartella',
                                    onClick: () => naviga('paziente', { id: riga.paziente_id })
                                }) : null,
                                puoRegistrare ? bottone({
                                    simbolo: 'undo', variante: 'ghost', piccolo: true, titolo: 'Storna incasso',
                                    onClick: () => storna(riga)
                                }) : null
                            ])
                        }
                    ],
                    righe,
                    vuotoTitolo: 'Nessun incasso nel periodo',
                    vuotoTesto: 'Amplia l\'intervallo di date o registra il primo pagamento ricevuto.',
                    vuotoSimbolo: 'payments'
                }))
            ]);
        };

        await disegna();
        return contenitore;
    }
};
