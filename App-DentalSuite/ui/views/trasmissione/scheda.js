import { el } from '../../components/dom.js';
import { creaArcata } from '../../components/arcata_dentale.js';
import { adattaAlTelaio } from '../../kernel/telaio.js';
import { apriLivello } from './livello.js';
import { apriReperto } from './reperto.js';
import { pannello } from './scheda/pannello.js';
import { intestazionePaziente } from './scheda/intestazione.js';
import { pannelloAnamnesi, contenutoAnamnesiEstesa } from './scheda/anamnesi.js';
import { contenutoAnagrafica } from './scheda/anagrafica.js';
import { pannelloStoria, voceTrattamento } from './scheda/storia.js';
import { pannelloPrescrizioni, vocePrescrizione } from './scheda/prescrizioni.js';
import { pannelloReferti } from './scheda/referti.js';
import { pannelloRilevazioni } from './scheda/rilevazioni.js';
import { galleriaReferti } from './scheda/galleria.js';
import { barraAzioni } from './scheda/azioni.js';

function pannelloOdontogramma(dossier, onDente) {
    return pannello({
        titolo: 'Odontogramma FDI',
        simbolo: 'dentistry',
        chiave: 'odontogramma',
        conteggio: dossier.odontogramma.con_reperto,
        pieno: true
    }, el('div', { class: 'ds-mn__arcata' }, creaArcata({
        denti: dossier.odontogramma.denti,
        stati: dossier.odontogramma.stati,
        selezionato: null,
        interattivo: true,
        onSeleziona: onDente
    })));
}

function creaApprofondimenti(dossier, servitoreInfo) {
    const sottotitolo = dossier.paziente.nominativo;

    return {
        onApriAnagrafica: () => apriLivello({
            titolo: 'Scheda anagrafica completa',
            sottotitolo,
            contenuto: contenutoAnagrafica(dossier)
        }),
        onApriAnamnesi: () => apriLivello({
            titolo: 'Quadro anamnestico completo',
            sottotitolo,
            contenuto: contenutoAnamnesiEstesa(dossier)
        }),
        onApriTrattamenti: () => apriLivello({
            titolo: 'Trattamenti precedenti',
            sottotitolo,
            voci: dossier.trattamenti,
            rendiVoce: voceTrattamento
        }),
        onApriPrescrizioni: () => apriLivello({
            titolo: 'Prescrizioni',
            sottotitolo,
            voci: dossier.prescrizioni,
            rendiVoce: vocePrescrizione
        }),
        onApriReferti: () => {
            if (!dossier.referti || dossier.referti.length === 0) return;
            apriLivello({
                titolo: 'Archivio diagnostico e radiologia',
                sottotitolo: `${sottotitolo} · ${dossier.referti.length} referti`,
                contenuto: galleriaReferti(dossier.referti, servitoreInfo)
            });
        }
    };
}

export function schermoScheda({ istantanea, collegato, onChiudi, onAggiorna, onCambiaPaziente, onEsci, onCambiaPostazione }) {
    const dossier = istantanea.dossier;
    const approfondimenti = creaApprofondimenti(dossier, istantanea.servitore_info);
    const comandi = { onChiudi, onAggiorna, onCambiaPaziente, onEsci, onCambiaPostazione };

    const colonnaSinistra = el('div', { class: 'ds-mn__colonna ds-mn__colonna--sinistra' }, [
        pannelloAnamnesi(dossier, { onApriTutto: approfondimenti.onApriAnamnesi }),
        pannelloRilevazioni(dossier)
    ]);

    const colonnaDestra = el('div', { class: 'ds-mn__colonna ds-mn__colonna--destra' }, [
        pannelloStoria(dossier, { onApriTutto: approfondimenti.onApriTrattamenti }),
        pannelloPrescrizioni(dossier, { onApriTutto: approfondimenti.onApriPrescrizioni }),
        pannelloReferti(dossier, {
            onApriTutto: approfondimenti.onApriReferti,
            servitoreInfo: istantanea.servitore_info
        })
    ]);

    const radice = el('div', {
        class: 'ds-root ds-mn',
        dataset: { accent: 'pazienti', paziente: dossier.paziente.id }
    }, [
        intestazionePaziente({
            dossier,
            ricevutoIl: istantanea.ricevuto_il,
            onApriScheda: approfondimenti.onApriAnagrafica
        }),
        el('div', { class: 'ds-mn__scena' }, [
            colonnaSinistra,
            pannelloOdontogramma(dossier, dente => apriReperto({ dente, dossier, onRegistrato: onAggiorna })),
            colonnaDestra
        ]),
        barraAzioni({ dossier, collegato, comandi, approfondimenti })
    ]);

    adattaAlTelaio(radice);
    return radice;
}
