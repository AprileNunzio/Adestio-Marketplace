'use strict';

const RICERCA = `
CREATE INDEX IF NOT EXISTS idx_pazienti_nominativo ON pazienti(is_deleted, cognome, nome);
CREATE INDEX IF NOT EXISTS idx_pazienti_telefono ON pazienti(telefono);
`;

const PRODUZIONE = `
CREATE INDEX IF NOT EXISTS idx_trattamenti_stato_data ON trattamenti_paziente(stato, data_trattamento);
CREATE INDEX IF NOT EXISTS idx_trattamenti_segretaria ON trattamenti_paziente(segretaria_id, stato);
CREATE INDEX IF NOT EXISTS idx_trattamenti_prestazione ON trattamenti_paziente(prestazione_id);
`;

const CASSA = `
CREATE INDEX IF NOT EXISTS idx_incassi_paziente_data ON pagamenti_incassi(paziente_id, data_pagamento);
CREATE INDEX IF NOT EXISTS idx_incassi_preventivo ON pagamenti_incassi(preventivo_id);
CREATE INDEX IF NOT EXISTS idx_spese_categoria_data ON spese_studio(categoria, data_spesa);
CREATE INDEX IF NOT EXISTS idx_rate_paziente ON rate_scadenziario(paziente_id, data_scadenza);
`;

module.exports = [RICERCA, PRODUZIONE, CASSA];
