import { el, icona } from '../../../components/dom.js';

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

export function barraAzioni({ dossier, collegato, comandi, approfondimenti }) {
    const voci = [
        azione({
            simbolo: 'badge',
            etichetta: 'Scheda paziente',
            onClick: approfondimenti.onApriAnagrafica
        }),
        azione({
            simbolo: 'clinical_notes',
            etichetta: 'Anamnesi',
            disabilitato: !dossier.anamnesi.compilata,
            onClick: approfondimenti.onApriAnamnesi
        }),
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
        azione({ simbolo: 'refresh', etichetta: 'Aggiorna', onClick: comandi.onAggiorna }),
        comandi.onCambiaPaziente
            ? azione({ simbolo: 'switch_account', etichetta: 'Cambia paziente', onClick: comandi.onCambiaPaziente })
            : null,
        azione({ simbolo: 'logout', etichetta: 'Chiudi seduta', tono: 'pericolo', onClick: comandi.onChiudi }),
        comandi.onCambiaPostazione
            ? azione({ simbolo: 'tune', etichetta: 'Postazione', onClick: comandi.onCambiaPostazione })
            : null,
        comandi.onEsci ? azione({ simbolo: 'arrow_back', etichetta: 'Esci', onClick: comandi.onEsci }) : null
    ].filter(Boolean);

    return el('footer', { class: 'ds-mn__barra' }, [
        el('div', { class: 'ds-mn__azioni' }, voci),
        el('div', { class: 'ds-mn__collegamento', dataset: { collegato: collegato ? 'true' : 'false' } }, [
            el('span', { class: 'ds-mn__spia' }),
            el('span', {}, collegato ? 'Collegato alla segreteria' : 'Canale interrotto: gli atti restano in coda')
        ])
    ]);
}
