'use strict';

const DERIVATE = `
ALTER TABLE allegati_diagnostici ADD COLUMN impronta TEXT DEFAULT '';
ALTER TABLE allegati_diagnostici ADD COLUMN anteprima_path TEXT DEFAULT '';
ALTER TABLE allegati_diagnostici ADD COLUMN visione_path TEXT DEFAULT '';
ALTER TABLE allegati_diagnostici ADD COLUMN larghezza INTEGER DEFAULT 0;
ALTER TABLE allegati_diagnostici ADD COLUMN altezza INTEGER DEFAULT 0;
ALTER TABLE allegati_diagnostici ADD COLUMN derivate_stato TEXT DEFAULT 'da_generare';
`;

const INDICE = `
CREATE INDEX IF NOT EXISTS idx_allegati_derivate ON allegati_diagnostici(derivate_stato, paziente_id);
`;

module.exports = [DERIVATE, INDICE];
