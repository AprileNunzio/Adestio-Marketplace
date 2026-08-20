'use strict';

const { createRepository } = require('../kernel/repository');

const AUTORE = ['autore_id'];

const preventivi = createRepository('preventivi', [
    'paziente_id', 'medico_id', 'numero_preventivo', 'data_emissione', 'data_scadenza',
    'stato', 'totale_lordo', 'sconto_percentuale', 'totale_netto', 'acconto_richiesto', 'note'
], { label: 'Preventivo', orderBy: 'data_emissione DESC', systemColumns: AUTORE });

const righePreventivo = createRepository('preventivi_righe', [
    'preventivo_id', 'prestazione_id', 'descrizione', 'dente', 'quantita',
    'prezzo_unitario', 'sconto_percentuale', 'totale_riga', 'ordine'
], { label: 'Riga preventivo', orderBy: 'ordine ASC' });

const incassi = createRepository('pagamenti_incassi', [
    'paziente_id', 'preventivo_id', 'rata_id', 'numero_documento', 'tipo_documento',
    'metodo_pagamento', 'importo', 'data_pagamento', 'note'
], { label: 'Incasso', orderBy: 'data_pagamento DESC', systemColumns: AUTORE });

const spese = createRepository('spese_studio', [
    'categoria', 'descrizione', 'fornitore', 'numero_fattura', 'importo',
    'data_spesa', 'metodo_pagamento', 'ricorrente', 'allegato_path', 'note'
], { label: 'Spesa', orderBy: 'data_spesa DESC', systemColumns: AUTORE });

const pianiRateali = createRepository('piani_rateali', [
    'paziente_id', 'preventivo_id', 'totale_piano', 'acconto_iniziale',
    'numero_rate', 'stato', 'note'
], { label: 'Piano rateale', orderBy: 'created_at DESC', systemColumns: AUTORE });

const rate = createRepository('rate_scadenziario', [
    'piano_id', 'paziente_id', 'numero_rata', 'importo', 'data_scadenza',
    'data_pagamento', 'stato', 'metodo_pagamento', 'numero_ricevuta', 'note'
], { label: 'Rata', orderBy: 'data_scadenza ASC' });

const notifiche = createRepository('log_notifiche', [
    'paziente_id', 'appuntamento_id', 'tipo_canale', 'destinatario',
    'messaggio', 'stato_esito', 'data_invio'
], { label: 'Notifica', orderBy: 'data_invio DESC', systemColumns: AUTORE });

module.exports = { preventivi, righePreventivo, incassi, spese, pianiRateali, rate, notifiche };
