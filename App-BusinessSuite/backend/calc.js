'use strict';

// Motore di calcolo condiviso di Adestio Business Suite.
// Formule fiscali italiane: IVA, ritenuta d'acconto, cassa previdenziale,
// split payment, bollo virtuale (auto-trigger regime forfettario), margini.

function round2(n) {
    try {
        return Math.round((Number(n) || 0) * 100) / 100;
    } catch (e) {
        return 0;
    }
}

function recalcVoce(voce) {
    try {
        const quantita = Number(voce.quantita) || 0;
        const prezzoVendita = Number(voce.prezzo_vendita) || 0;
        const prezzoAcquisto = Number(voce.prezzo_acquisto) || 0;
        const speseAccessorie = Number(voce.spese_accessorie) || 0;
        const sconto = Number(voce.sconto_percentuale) || 0;

        const totaleVoce = round2(prezzoVendita * quantita * (1 - sconto / 100));
        const costoVoce = round2((prezzoAcquisto + speseAccessorie) * quantita);
        const margineEuro = round2(totaleVoce - costoVoce);
        const marginePercentuale = totaleVoce > 0 ? round2((margineEuro / totaleVoce) * 100) : 0;

        return {
            totale_voce: totaleVoce,
            costo_voce: costoVoce,
            margine_euro: margineEuro,
            margine_percentuale: marginePercentuale
        };
    } catch (e) {
        return { totale_voce: 0, costo_voce: 0, margine_euro: 0, margine_percentuale: 0 };
    }
}

function recalcAssegnazione(assegnazione, totaleImponibileCorrente) {
    try {
        const tipo = assegnazione.tipo_compenso || 'percentuale';
        let compensoCalcolato = 0;
        if (tipo === 'percentuale') {
            const pct = Number(assegnazione.percentuale_applicata) || 0;
            compensoCalcolato = round2((Number(totaleImponibileCorrente) || 0) * (pct / 100));
        } else {
            compensoCalcolato = round2(Number(assegnazione.compenso_fisso) || 0);
        }
        const prezzoAlClienteEffettivo = Number(assegnazione.prezzo_al_cliente) > 0
            ? round2(Number(assegnazione.prezzo_al_cliente))
            : compensoCalcolato;

        return { compenso_calcolato: compensoCalcolato, prezzo_al_cliente_effettivo: prezzoAlClienteEffettivo };
    } catch (e) {
        return { compenso_calcolato: 0, prezzo_al_cliente_effettivo: 0 };
    }
}

function recalcPreventivo(preventivo, voci = [], assegnazioni = []) {
    try {
        const ivaPct = Number(preventivo.aliquota_iva) || 0;
        const arrotonda = !!preventivo.arrotonda;

        const totaleVociImponibile = voci.reduce((sum, v) => sum + (Number(v.totale_voce) || 0), 0);
        const totaleVociCosto = voci.reduce((sum, v) => sum + (Number(v.costo_voce) || 0), 0);

        const totaleAssegnazioniAlCliente = assegnazioni.reduce(
            (sum, a) => sum + (Number(a.prezzo_al_cliente_effettivo) || 0), 0
        );
        const totaleAssegnazioniCosto = assegnazioni.reduce(
            (sum, a) => sum + (Number(a.compenso_calcolato) || 0), 0
        );

        let totaleImponibile = round2(totaleVociImponibile + totaleAssegnazioniAlCliente);
        let totaleIva = round2(totaleImponibile * (ivaPct / 100));
        let totaleIvato = round2(totaleImponibile + totaleIva);
        const totaleCosto = round2(totaleVociCosto + totaleAssegnazioniCosto);

        if (arrotonda) {
            const totaleIvatoArrotondato = Math.round(totaleIvato);
            totaleIva = ivaPct > -100 ? round2(totaleIvatoArrotondato * (ivaPct / (100 + ivaPct))) : 0;
            totaleImponibile = round2(totaleIvatoArrotondato - totaleIva);
            totaleIvato = totaleIvatoArrotondato;
        }

        const margineEuro = round2(totaleImponibile - totaleCosto);
        const marginePercentuale = totaleImponibile > 0 ? round2((margineEuro / totaleImponibile) * 100) : 0;

        return {
            totale_imponibile: totaleImponibile,
            totale_iva: totaleIva,
            totale_ivato: totaleIvato,
            totale_costo: totaleCosto,
            margine_euro: margineEuro,
            margine_percentuale: marginePercentuale
        };
    } catch (e) {
        return {
            totale_imponibile: 0, totale_iva: 0, totale_ivato: 0,
            totale_costo: 0, margine_euro: 0, margine_percentuale: 0
        };
    }
}

function calcolaRigaFattura(voce, regimeFiscale = 'RF01') {
    try {
        const quantita = Number(voce.quantita) || 0;
        const prezzoUnitario = Number(voce.prezzo_unitario) || 0;
        const sconto = Number(voce.sconto_percentuale) || 0;
        const isForfettario = regimeFiscale !== 'RF01';

        const totaleRiga = round2(prezzoUnitario * quantita * (1 - sconto / 100));
        const aliquotaEffettiva = isForfettario ? 0 : (Number(voce.aliquota_iva) || 0);
        const naturaEffettiva = isForfettario ? 'N2.2' : (voce.natura_iva || '');

        return {
            totale_riga: totaleRiga,
            aliquota_iva_effettiva: aliquotaEffettiva,
            natura_iva_effettiva: naturaEffettiva
        };
    } catch (e) {
        return { totale_riga: 0, aliquota_iva_effettiva: 0, natura_iva_effettiva: '' };
    }
}

function calcolaTasseFattura(fattura, righeCalcolate = []) {
    try {
        const regimeFiscale = fattura.regime_fiscale || 'RF01';
        const isForfettario = regimeFiscale !== 'RF01';

        let totaleImponibile = round2(righeCalcolate.reduce((sum, r) => sum + (Number(r.totale_riga) || 0), 0));

        let cassaPrevidenzialeImporto = 0;
        if (fattura.cassa_previdenziale_attiva) {
            const pct = Number(fattura.cassa_previdenziale_percentuale) || 0;
            cassaPrevidenzialeImporto = round2(totaleImponibile * (pct / 100));
        }

        const baseImponibileConCassa = round2(totaleImponibile + cassaPrevidenzialeImporto);

        let totaleIva = 0;
        if (!isForfettario) {
            const gruppiIva = new Map();
            righeCalcolate.forEach(r => {
                const aliquota = Number(r.aliquota_iva_effettiva) || 0;
                gruppiIva.set(aliquota, (gruppiIva.get(aliquota) || 0) + (Number(r.totale_riga) || 0));
            });
            if (fattura.cassa_previdenziale_attiva && gruppiIva.size > 0) {
                const aliquotaPrincipale = Array.from(gruppiIva.keys())[0];
                gruppiIva.set(aliquotaPrincipale, (gruppiIva.get(aliquotaPrincipale) || 0) + cassaPrevidenzialeImporto);
            }
            gruppiIva.forEach((imponibileGruppo, aliquota) => {
                totaleIva += imponibileGruppo * (aliquota / 100);
            });
            totaleIva = round2(totaleIva);
        }

        let ritenutaAccontoImporto = 0;
        if (fattura.ritenuta_acconto_attiva) {
            const pct = Number(fattura.ritenuta_acconto_percentuale) || 0;
            ritenutaAccontoImporto = round2(totaleImponibile * (pct / 100));
        }

        let importoBollo = 0;
        const bolloAttivo = !!fattura.bollo_virtuale || (isForfettario && totaleImponibile > 77.47);
        if (bolloAttivo) {
            importoBollo = round2(Number(fattura.importo_bollo) || 2);
        }

        const totaleDocumento = round2(
            baseImponibileConCassa + totaleIva + importoBollo - ritenutaAccontoImporto
        );

        return {
            totale_imponibile: totaleImponibile,
            totale_iva: totaleIva,
            totale_documento: totaleDocumento,
            cassa_previdenziale_importo: cassaPrevidenzialeImporto,
            ritenuta_acconto_importo: ritenutaAccontoImporto,
            importo_bollo: importoBollo,
            bollo_virtuale: bolloAttivo ? 1 : 0
        };
    } catch (e) {
        return {
            totale_imponibile: 0, totale_iva: 0, totale_documento: 0,
            cassa_previdenziale_importo: 0, ritenuta_acconto_importo: 0,
            importo_bollo: 0, bollo_virtuale: 0
        };
    }
}

function generatePaymentSchedule(fattura) {
    try {
        const dataEmissione = fattura.data_emissione ? new Date(fattura.data_emissione) : new Date();
        const dataScadenza = new Date(dataEmissione.getTime() + 30 * 24 * 60 * 60 * 1000);
        return [{
            numero_rata: 1,
            totale_rate: 1,
            data_scadenza: dataScadenza.toISOString().slice(0, 10),
            importo_rata: Number(fattura.totale_documento) || 0
        }];
    } catch (e) {
        return [];
    }
}

module.exports = {
    round2,
    recalcVoce,
    recalcAssegnazione,
    recalcPreventivo,
    calcolaRigaFattura,
    calcolaTasseFattura,
    generatePaymentSchedule
};
