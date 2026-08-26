import { el, icona } from '../../components/dom.js';
import { creaArcata } from '../../components/arcata_dentale.js';
import * as fmt from '../../kernel/format.js';
import { intestazionePaziente } from './intestazione.js';
import {
    pannello,
    pannelloStoria,
    pannelloPrescrizioni,
    pannelloReferti,
    pannelloRilevazioni
} from './pannelli.js';
import { apriLivello } from './livello.js';
import { apriReperto } from './reperto.js';
import { adattaAlTelaio } from '../../kernel/telaio.js';

function voceTrattamento(voce) {
    return el('li', { class: 'ds-mn__riga' }, [
        el('time', { class: 'ds-mn__quando' }, fmt.data(voce.data)),
        el('span', { class: 'ds-mn__titolo' }, `${voce.dente ? `${voce.dente} · ` : ''}${voce.descrizione}`),
        el('span', { class: 'ds-mn__coda' }, `${fmt.etichettaStato(voce.stato)} · ${fmt.euro(voce.importo)}`)
    ]);
}

function vocePrescrizione(voce) {
    return el('li', { class: 'ds-mn__riga' }, [
        el('time', { class: 'ds-mn__quando' }, fmt.data(voce.data)),
        el('span', { class: 'ds-mn__titolo' }, `${voce.farmaco} ${voce.dosaggio}`.trim()),
        el('span', { class: 'ds-mn__coda' }, [voce.posologia, voce.durata_giorni ? `${voce.durata_giorni} gg` : '']
            .filter(Boolean).join(' · '))
    ]);
}

function voceReferto(voce) {
    return el('li', { class: 'ds-mn__riga' }, [
        el('time', { class: 'ds-mn__quando' }, fmt.data(voce.data)),
        el('span', { class: 'ds-mn__titolo' }, voce.titolo),
        el('span', { class: 'ds-mn__coda' }, voce.tipo || '')
    ]);
}

function azione({ simbolo, etichetta, onClick, tono, disabilitato = false }) {
    return el('button', {
        class: 'ds-mn__azione',
        type: 'button',
        disabled: disabilitato,
        dataset: tono ? { tono } : {},
        onClick
    }, [
        icona(simbolo),
        el('span', { class: 'ds-mn__azione-eti' }, etichetta)
    ]);
}

function barraAzioni({ dossier, collegato, onChiudi, onAggiorna, onCambiaPaziente, onEsci, onCambiaPostazione, approfondimenti }) {
    return el('footer', { class: 'ds-mn__barra' }, [
        el('div', { class: 'ds-mn__azioni' }, [
            azione({
                simbolo: 'medical_services',
                etichetta: 'Trattamenti',
                disabilitato: dossier.trattamenti.length === 0,
                onClick: approfondimenti.onApriTrattamenti
            }),
            azione({
                simbolo: 'prescriptions',
                etichetta: 'Prescrizioni',
                disabilitato: dossier.prescrizioni.length === 0,
                onClick: approfondimenti.onApriPrescrizioni
            }),
            azione({
                simbolo: 'imagesmode',
                etichetta: 'Referti',
                disabilitato: dossier.referti.length === 0,
                onClick: approfondimenti.onApriReferti
            }),
            azione({ simbolo: 'refresh', etichetta: 'Aggiorna', onClick: onAggiorna }),
            onCambiaPaziente
                ? azione({ simbolo: 'switch_account', etichetta: 'Cambia paziente', onClick: onCambiaPaziente })
                : null,
            azione({ simbolo: 'logout', etichetta: 'Chiudi seduta', tono: 'pericolo', onClick: onChiudi }),
            onCambiaPostazione
                ? azione({ simbolo: 'tune', etichetta: 'Postazione', onClick: onCambiaPostazione })
                : null,
            onEsci ? azione({ simbolo: 'arrow_back', etichetta: 'Esci', onClick: onEsci }) : null
        ].filter(Boolean)),
        el('div', { class: 'ds-mn__collegamento', dataset: { collegato: collegato ? 'true' : 'false' } }, [
            el('span', { class: 'ds-mn__spia' }),
            el('span', {}, collegato ? 'Collegato alla segreteria' : 'Canale interrotto: gli atti restano in coda')
        ])
    ]);
}

function pannelloOdontogramma(dossier, onDente) {
    const arcata = creaArcata({
        denti: dossier.odontogramma.denti,
        stati: dossier.odontogramma.stati,
        selezionato: null,
        interattivo: true,
        onSeleziona: onDente
    });

    return pannello({
        titolo: 'Odontogramma FDI',
        simbolo: 'dentistry',
        chiave: 'odontogramma',
        conteggio: dossier.odontogramma.con_reperto,
        pieno: true
    }, el('div', { class: 'ds-mn__arcata' }, arcata));
}

export function schermoScheda({ istantanea, collegato, onChiudi, onAggiorna, onCambiaPaziente, onEsci, onCambiaPostazione }) {
    const dossier = istantanea.dossier;

    const apriDente = dente => apriReperto({ dente, dossier, onRegistrato: onAggiorna });

    const approfondimenti = {
        onApriTrattamenti: () => apriLivello({
            titolo: 'Trattamenti precedenti',
            sottotitolo: dossier.paziente.nominativo,
            voci: dossier.trattamenti,
            rendiVoce: voceTrattamento
        }),
        onApriPrescrizioni: () => apriLivello({
            titolo: 'Prescrizioni',
            sottotitolo: dossier.paziente.nominativo,
            voci: dossier.prescrizioni,
            rendiVoce: vocePrescrizione
        }),
        onApriReferti: () => apriLivello({
            titolo: 'Archivio diagnostico',
            sottotitolo: dossier.paziente.nominativo,
            voci: dossier.referti,
            rendiVoce: voceReferto
        })
    };

    const colonnaSinistra = el('div', { class: 'ds-mn__colonna ds-mn__colonna--sinistra' }, [
        pannelloRilevazioni(dossier)
    ]);

    const colonnaDestra = el('div', { class: 'ds-mn__colonna ds-mn__colonna--destra' }, [
        pannelloStoria(dossier, { onApriTutto: approfondimenti.onApriTrattamenti }),
        pannelloPrescrizioni(dossier, { onApriTutto: approfondimenti.onApriPrescrizioni }),
        pannelloReferti(dossier, { onApriTutto: approfondimenti.onApriReferti })
    ]);

    const radice = el('div', {
        class: 'ds-root ds-mn',
        dataset: { accent: 'pazienti', paziente: dossier.paziente.id }
    }, [
        intestazionePaziente({ dossier, ricevutoIl: istantanea.ricevuto_il }),
        el('div', { class: 'ds-mn__scena' }, [
            colonnaSinistra,
            pannelloOdontogramma(dossier, apriDente),
            colonnaDestra
        ]),
        barraAzioni({ dossier, collegato, onChiudi, onAggiorna, onCambiaPaziente, onEsci, onCambiaPostazione, approfondimenti })
    ]);

    adattaAlTelaio(radice);
    return radice;
}
