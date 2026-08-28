import { el, icona } from '../../../components/dom.js';
import * as fmt from '../../../kernel/format.js';
import { matriceRischio } from './anamnesi.js';

const SIMBOLI_ALLERTA = {
    critica: 'e911_emergency',
    attenzione: 'warning',
    nota: 'info'
};

function pastiglia(etichetta, valore) {
    if (!valore) return null;
    return el('span', { class: 'ds-mn__pastiglia' }, [
        el('span', { class: 'ds-mn__pastiglia-eti' }, etichetta),
        el('strong', {}, String(valore))
    ]);
}

function anagraficaEssenziale(paziente) {
    return el('div', { class: 'ds-mn__anagrafica' }, [
        pastiglia('Età', paziente.eta === null ? null : `${paziente.eta}`),
        pastiglia('Nato il', fmt.data(paziente.data_nascita)),
        pastiglia('CF', paziente.codice_fiscale),
        pastiglia('Tel', paziente.recapiti ? paziente.recapiti.telefono : paziente.telefono),
        pastiglia('Gruppo', paziente.gruppo_sanguigno),
        pastiglia('Esenzioni', paziente.amministrativo ? paziente.amministrativo.esenzioni : paziente.esenzioni),
        pastiglia('Emergenza', paziente.contatto_emergenza)
    ].filter(Boolean));
}

function allerteInLinea(dossier, massimo) {
    const voci = (dossier.anamnesi && dossier.anamnesi.allerte) || [];
    if (voci.length === 0) {
        return el('div', { class: 'ds-mn__allerte ds-mn__allerte--sereno' }, [
            icona('verified_user'),
            el('span', {}, 'Nessuna allerta in anamnesi')
        ]);
    }

    const mostrate = voci.slice(0, massimo);
    const residue = voci.length - mostrate.length;

    return el('div', { class: 'ds-mn__allerte' }, [
        ...mostrate.map(voce => el('span', {
            class: 'ds-mn__allerta',
            dataset: { livello: voce.livello },
            title: voce.etichetta
        }, [
            icona(SIMBOLI_ALLERTA[voce.livello] || 'info'),
            el('span', {}, voce.etichetta)
        ])),
        residue > 0 ? el('span', { class: 'ds-mn__allerta ds-mn__allerta--resto' }, `+${residue}`) : null
    ].filter(Boolean));
}

function cronometro(ricevutoIl) {
    const nodo = el('span', { class: 'ds-mn__cronometro' }, '');
    const aggiorna = () => {
        const minuti = Math.max(Math.round((Date.now() - Number(ricevutoIl || Date.now())) / 60000), 0);
        nodo.textContent = minuti < 1 ? 'seduta appena aperta' : `seduta da ${minuti} min`;
    };
    aggiorna();
    const battito = setInterval(aggiorna, 30000);
    if (typeof battito.unref === 'function') battito.unref();
    return nodo;
}

function motivoSeduta(dossier) {
    if (!dossier.seduta) return null;
    const testo = [dossier.seduta.prestazione, dossier.seduta.motivo].filter(Boolean).join(' · ');
    if (!testo) return null;
    return el('span', { class: 'ds-mn__motivo' }, [icona('event_available'), el('span', {}, testo)]);
}

export function intestazionePaziente({ dossier, ricevutoIl, allerteVisibili = 4, onApriScheda }) {
    const paziente = dossier.paziente;
    const rischio = dossier.anamnesi && dossier.anamnesi.rischio;

    return el('header', { class: 'ds-mn__intestazione' }, [
        el('div', { class: 'ds-mn__identita' }, [
            el('div', { class: 'ds-mn__nome-riga' }, [
                el('h1', { class: 'ds-mn__nome', title: paziente.nominativo }, paziente.nominativo),
                paziente.minore ? el('span', { class: 'ds-mn__minore' }, 'Minore') : null,
                onApriScheda
                    ? el('button', {
                        class: 'ds-mn__mini',
                        type: 'button',
                        title: 'Apri la scheda anagrafica completa',
                        onClick: onApriScheda
                    }, icona('badge'))
                    : null
            ].filter(Boolean)),
            anagraficaEssenziale(paziente),
            motivoSeduta(dossier)
        ].filter(Boolean)),
        el('div', { class: 'ds-mn__fianco' }, [
            rischio ? matriceRischio(rischio) : null,
            allerteInLinea(dossier, allerteVisibili),
            cronometro(ricevutoIl)
        ].filter(Boolean))
    ]);
}
