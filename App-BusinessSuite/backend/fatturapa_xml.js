'use strict';

// Generatore XML FatturaPA (struttura conforme allo schema ufficiale, generata via
// template string: nessuna dipendenza xml necessaria per uno schema cosi' rigido).
// Nota: la validita' strutturale non implica la validita' contro il servizio SdI reale,
// che richiede accreditamento e progressivo di trasmissione ufficiale.

const { db } = require('./db_utils');

function esc(v) {
    return String(v === undefined || v === null ? '' : v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function getImpostazioni() {
    const rows = db().query('SELECT key_name, key_value FROM impostazioni_business_suite');
    const map = {};
    rows.forEach(r => { map[r.key_name] = r.key_value; });
    return map;
}

function buildFatturaPAXml(fattura, voci) {
    const cfg = getImpostazioni();
    const progressivoInvio = String(fattura.progressivo || 1).padStart(5, '0');
    const codiceDestinatario = fattura.cliente_codice_destinatario || '0000000';

    const righeXml = voci.map((v, idx) => `
        <DettaglioLinee>
            <NumeroLinea>${idx + 1}</NumeroLinea>
            <Descrizione>${esc(v.descrizione)}</Descrizione>
            <Quantita>${Number(v.quantita || 0).toFixed(2)}</Quantita>
            <UnitaMisura>${esc(v.unita_misura || 'PZ')}</UnitaMisura>
            <PrezzoUnitario>${Number(v.prezzo_unitario || 0).toFixed(2)}</PrezzoUnitario>
            <PrezzoTotale>${Number(v.totale_riga || 0).toFixed(2)}</PrezzoTotale>
            <AliquotaIVA>${Number(v.aliquota_iva || 0).toFixed(2)}</AliquotaIVA>
            ${v.natura_iva ? `<Natura>${esc(v.natura_iva)}</Natura>` : ''}
        </DettaglioLinee>`).join('');

    const gruppiIva = new Map();
    voci.forEach(v => {
        const key = `${v.aliquota_iva || 0}|${v.natura_iva || ''}`;
        const cur = gruppiIva.get(key) || { aliquota: v.aliquota_iva || 0, natura: v.natura_iva || '', imponibile: 0 };
        cur.imponibile += Number(v.totale_riga || 0);
        gruppiIva.set(key, cur);
    });
    const riepilogoXml = Array.from(gruppiIva.values()).map(g => `
        <DatiRiepilogo>
            <AliquotaIVA>${Number(g.aliquota).toFixed(2)}</AliquotaIVA>
            ${g.natura ? `<Natura>${esc(g.natura)}</Natura>` : ''}
            <ImponibileImporto>${g.imponibile.toFixed(2)}</ImponibileImporto>
            <Imposta>${(g.imponibile * (Number(g.aliquota) / 100)).toFixed(2)}</Imposta>
        </DatiRiepilogo>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" versione="FPR12">
    <FatturaElettronicaHeader>
        <DatiTrasmissione>
            <IdTrasmittente>
                <IdPaese>IT</IdPaese>
                <IdCodice>${esc(cfg.piva_azienda || '')}</IdCodice>
            </IdTrasmittente>
            <ProgressivoInvio>${progressivoInvio}</ProgressivoInvio>
            <FormatoTrasmissione>FPR12</FormatoTrasmissione>
            <CodiceDestinatario>${esc(codiceDestinatario)}</CodiceDestinatario>
        </DatiTrasmissione>
        <CedentePrestatore>
            <DatiAnagrafici>
                <IdFiscaleIVA>
                    <IdPaese>IT</IdPaese>
                    <IdCodice>${esc(cfg.piva_azienda || '')}</IdCodice>
                </IdFiscaleIVA>
                <CodiceFiscale>${esc(cfg.codice_fiscale_azienda || cfg.piva_azienda || '')}</CodiceFiscale>
                <Anagrafica>
                    <Denominazione>${esc(cfg.ragione_sociale_azienda || '')}</Denominazione>
                </Anagrafica>
                <RegimeFiscale>${esc(fattura.regime_fiscale || 'RF01')}</RegimeFiscale>
            </DatiAnagrafici>
            <Sede>
                <Indirizzo>${esc(cfg.indirizzo_azienda || '')}</Indirizzo>
                <CAP>${esc(cfg.cap_azienda || '')}</CAP>
                <Comune>${esc(cfg.citta_azienda || '')}</Comune>
                <Provincia>${esc(cfg.provincia_azienda || '')}</Provincia>
                <Nazione>IT</Nazione>
            </Sede>
        </CedentePrestatore>
        <CessionarioCommittente>
            <DatiAnagrafici>
                ${fattura.cliente_piva ? `<IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>${esc(fattura.cliente_piva)}</IdCodice></IdFiscaleIVA>` : ''}
                ${fattura.cliente_codice_fiscale ? `<CodiceFiscale>${esc(fattura.cliente_codice_fiscale)}</CodiceFiscale>` : ''}
                <Anagrafica>
                    <Denominazione>${esc(fattura.cliente_ragione_sociale)}</Denominazione>
                </Anagrafica>
            </DatiAnagrafici>
            <Sede>
                <Indirizzo>${esc(fattura.cliente_indirizzo || '')}</Indirizzo>
                <CAP>${esc(fattura.cliente_cap || '')}</CAP>
                <Comune>${esc(fattura.cliente_citta || '')}</Comune>
                <Provincia>${esc(fattura.cliente_provincia || '')}</Provincia>
                <Nazione>IT</Nazione>
            </Sede>
        </CessionarioCommittente>
    </FatturaElettronicaHeader>
    <FatturaElettronicaBody>
        <DatiGenerali>
            <DatiGeneraliDocumento>
                <TipoDocumento>${esc(fattura.tipo_documento || 'TD01')}</TipoDocumento>
                <Divisa>EUR</Divisa>
                <Data>${esc(fattura.data_emissione || '')}</Data>
                <Numero>${esc(fattura.numero || '')}</Numero>
                ${fattura.bollo_virtuale ? `<DatiBollo><BolloVirtuale>SI</BolloVirtuale><ImportoBollo>${Number(fattura.importo_bollo || 2).toFixed(2)}</ImportoBollo></DatiBollo>` : ''}
                ${fattura.cassa_previdenziale_attiva ? `<DatiCassaPrevidenziale><AlCassa>${Number(fattura.cassa_previdenziale_percentuale || 0).toFixed(2)}</AlCassa><ImportoContributoCassa>${Number(fattura.cassa_previdenziale_importo || 0).toFixed(2)}</ImportoContributoCassa></DatiCassaPrevidenziale>` : ''}
                ${fattura.ritenuta_acconto_attiva ? `<DatiRitenuta><TipoRitenuta>RT01</TipoRitenuta><ImportoRitenuta>${Number(fattura.ritenuta_acconto_importo || 0).toFixed(2)}</ImportoRitenuta><AliquotaRitenuta>${Number(fattura.ritenuta_acconto_percentuale || 0).toFixed(2)}</AliquotaRitenuta><CausalePagamento>A</CausalePagamento></DatiRitenuta>` : ''}
                <ImportoTotaleDocumento>${Number(fattura.totale_documento || 0).toFixed(2)}</ImportoTotaleDocumento>
                ${fattura.codice_cig ? `<DatiCIG>${esc(fattura.codice_cig)}</DatiCIG>` : ''}
                ${fattura.codice_cup ? `<DatiCUP>${esc(fattura.codice_cup)}</DatiCUP>` : ''}
            </DatiGeneraliDocumento>
        </DatiGenerali>
        <DatiBeniServizi>
            ${righeXml}
            ${riepilogoXml}
        </DatiBeniServizi>
        <DatiPagamento>
            <CondizioniPagamento>TP02</CondizioniPagamento>
            <DettaglioPagamento>
                <ModalitaPagamento>${esc(fattura.modalita_pagamento || 'MP05')}</ModalitaPagamento>
                <ImportoPagamento>${Number(fattura.totale_documento || 0).toFixed(2)}</ImportoPagamento>
            </DettaglioPagamento>
        </DatiPagamento>
    </FatturaElettronicaBody>
</p:FatturaElettronica>`;
}

async function exportFatturaPA(event, args = {}) {
    try {
        const { id } = args;
        if (!id) return { success: false, error: 'ID fattura mancante' };
        const rows = db().query('SELECT * FROM fatture WHERE id = ?', [id]);
        if (rows.length === 0) return { success: false, error: 'Fattura non trovata' };
        const voci = db().query('SELECT * FROM voci_fatture WHERE fattura_id = ? AND is_deleted = 0 ORDER BY ordine ASC', [id]);
        const xml = buildFatturaPAXml(rows[0], voci);
        const fileName = `IT${(getImpostazioni().piva_azienda || 'XXXXXXXXXXX')}_${String(rows[0].progressivo || 1).padStart(5, '0')}.xml`;
        return { success: true, data: { xml, fileName } };
    } catch (e) {
        console.error('[BusinessSuite:fatturapa] exportFatturaPA error:', e.message);
        return { success: false, error: e.message };
    }
}

module.exports = { exportFatturaPA, buildFatturaPAXml };
