import { call } from '../../kernel/transport.js';
import * as fmt from '../../kernel/format.js';
import { apriForm } from '../shared/form_modale.js';

export const METODI = [
    { valore: 'contanti', etichetta: 'Contanti' },
    { valore: 'bancomat', etichetta: 'Bancomat' },
    { valore: 'carta_credito', etichetta: 'Carta di credito' },
    { valore: 'bonifico', etichetta: 'Bonifico' },
    { valore: 'assegno', etichetta: 'Assegno' },
    { valore: 'finanziamento', etichetta: 'Finanziamento' }
];

export const TIPI_DOCUMENTO = [
    { valore: 'ricevuta', etichetta: 'Ricevuta' },
    { valore: 'fattura', etichetta: 'Fattura' },
    { valore: 'acconto', etichetta: 'Acconto' },
    { valore: 'saldo', etichetta: 'Saldo' }
];

const CAMPI = [
    { campo: 'importo', etichetta: 'Importo (€) *', genere: 'numero' },
    { campo: 'data_pagamento', etichetta: 'Data incasso', tipo: 'date' },
    { campo: 'metodo_pagamento', etichetta: 'Metodo', genere: 'selezione', opzioni: METODI, vuoto: false },
    { campo: 'tipo_documento', etichetta: 'Documento', genere: 'selezione', opzioni: TIPI_DOCUMENTO, vuoto: false },
    { campo: 'numero_documento', etichetta: 'Numero documento' },
    { campo: 'note', etichetta: 'Note', genere: 'area', ampio: true }
];

export function apriIncasso({ pazienteId, preventivoId, titolo }) {
    return apriForm({
        titolo: titolo || 'Registra incasso',
        sezioni: [{ titolo: null, campi: CAMPI }],
        valori: {
            importo: 0,
            data_pagamento: fmt.oggiIso(),
            metodo_pagamento: 'contanti',
            tipo_documento: 'ricevuta'
        },
        etichettaSalva: 'Registra',
        onSalva: stato => call('incassi.registra', {
            ...stato,
            paziente_id: pazienteId,
            preventivo_id: preventivoId || ''
        })
    });
}
