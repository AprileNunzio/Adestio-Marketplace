const fs = require('fs');
const path = require('path');

function createFatturaPAXML(invoiceData) {
    try {
        const docNum = invoiceData.numero || 'FT-2026/01';
        const docData = invoiceData.data_fattura || new Date().toISOString().split('T')[0];
        const clientName = invoiceData.cliente_nome || 'Cliente';
        const piva = invoiceData.cliente_piva || '00000000000';
        const sdiCode = invoiceData.cliente_sdi || (invoiceData.is_pa ? 'AAAAAA' : '0000000');
        const imponibile = parseFloat(invoiceData.totale_imponibile) || 0;
        const iva = parseFloat(invoiceData.totale_iva) || 0;
        const totale = parseFloat(invoiceData.totale_fattura) || (imponibile + iva);
        const tipoDoc = invoiceData.tipo_documento || 'TD01';

        const ritenutaXml = invoiceData.ritenuta_acconto > 0 ? `
      <DatiRitenuta>
        <TipoRitenuta>RT02</TipoRitenuta>
        <ImportoRitenuta>${invoiceData.ritenuta_acconto.toFixed(2)}</ImportoRitenuta>
        <AliquotaRitenuta>20.00</AliquotaRitenuta>
        <CausalePagamento>A</CausalePagamento>
      </DatiRitenuta>` : '';

        const cassaXml = invoiceData.cassa_previdenziale > 0 ? `
      <DatiCassaPrevidenziale>
        <TipoCassa>TC03</TipoCassa>
        <AlCassa>4.00</AlCassa>
        <ImportoContributoCassa>${invoiceData.cassa_previdenziale.toFixed(2)}</ImportoContributoCassa>
        <AliquotaIVA>22.00</AliquotaIVA>
      </DatiCassaPrevidenziale>` : '';

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>IT</IdPaese>
        <IdCodice>01234567890</IdCodice>
      </IdTrasmittente>
      <ProgressivoInvio>${docNum.replace(/[^a-zA-Z0-9]/g, '')}</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>${sdiCode}</CodiceDestinatario>
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>01234567890</IdCodice>
        </IdFiscaleIVA>
        <Anagrafica>
          <Denominazione>Adestio Business Suite Enterprise</Denominazione>
        </Anagrafica>
        <RegimeFiscale>RF01</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>Via Roma 100</Indirizzo>
        <CAP>00100</CAP>
        <Comune>Roma</Comune>
        <Provincia>RM</Provincia>
        <Nazione>IT</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>${piva}</IdCodice>
        </IdFiscaleIVA>
        <Anagrafica>
          <Denominazione>${clientName}</Denominazione>
        </Anagrafica>
      </DatiAnagrafici>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>${tipoDoc}</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>${docData}</Data>
        <Numero>${docNum}</Numero>
        ${ritenutaXml}
        ${cassaXml}
        <ImportoTotaleDocumento>${totale.toFixed(2)}</ImportoTotaleDocumento>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
      <DatiRiepilogo>
        <AliquotaIVA>22.00</AliquotaIVA>
        <ImponibileImporto>${imponibile.toFixed(2)}</ImponibileImporto>
        <Imposta>${iva.toFixed(2)}</Imposta>
        <EsigibilitaIVA>${invoiceData.split_payment ? 'S' : 'I'}</EsigibilitaIVA>
      </DatiRiepilogo>
    </DatiBeniServizi>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`;

        return {
            success: true,
            xmlContent: xml,
            fileName: `IT01234567890_${docNum.replace(/[^a-zA-Z0-9]/g, '')}.xml`
        };
    } catch (error) {
        console.error("createFatturaPAXML failure:", error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    createFatturaPAXML
};
