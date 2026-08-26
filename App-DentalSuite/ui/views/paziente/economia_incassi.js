import { pannello, bottone, distintivo } from '../../components/layout.js';
import { tabella, azioniRiga } from '../../components/tabella.js';
import { conferma } from '../../components/modale.js';
import { esito } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import * as fmt from '../../kernel/format.js';
import { apriIncasso } from '../contabilita/pagamento_form.js';

async function storna(riga, onAggiornato) {
    const procedi = await conferma({
        titolo: 'Stornare l\'incasso?',
        messaggio: `${fmt.euro(riga.importo)} del ${fmt.data(riga.data_pagamento)} verranno stornati dalla contabilità del paziente.`,
        etichettaConferma: 'Storna',
        distruttiva: true
    });
    if (!procedi) return;
    if (esito(await call('incassi.remove', { id: riga.id }), 'Incasso stornato')) await onAggiornato();
}

export function pannelloIncassi({ righe, totale, pazienteId, puoRegistrare, onAggiornato }) {
    return pannello({
        titolo: `Incassi registrati · ${fmt.euro(totale)}`,
        azioni: puoRegistrare ? [bottone({
            etichetta: 'Registra incasso',
            simbolo: 'payments',
            onClick: async () => {
                await apriIncasso({ pazienteId });
                await onAggiornato();
            }
        })] : [],
        flush: true
    }, tabella({
        colonne: [
            { titolo: 'Data', rendi: riga => fmt.data(riga.data_pagamento) },
            {
                titolo: 'Documento',
                rendi: riga => `${fmt.etichettaStato(riga.tipo_documento)} ${riga.numero_documento || ''}`.trim()
            },
            {
                titolo: 'Metodo',
                rendi: riga => distintivo(fmt.etichettaStato(riga.metodo_pagamento), 'info')
            },
            { titolo: 'Riferimento', rendi: riga => (riga.rata_id ? 'Rata di piano' : riga.note || '—') },
            { titolo: 'Importo', numerica: true, rendi: riga => fmt.euro(riga.importo) },
            {
                titolo: '',
                rendi: riga => azioniRiga([
                    puoRegistrare ? bottone({
                        simbolo: 'undo', variante: 'ghost', piccolo: true, titolo: 'Storna incasso',
                        onClick: () => storna(riga, onAggiornato)
                    }) : null
                ])
            }
        ],
        righe,
        vuotoTitolo: 'Nessun incasso registrato',
        vuotoTesto: 'Qui compaiono tutti i pagamenti ricevuti dal paziente, sia i saldi delle rate sia gli incassi registrati in contabilità.',
        vuotoSimbolo: 'payments'
    }));
}
