import { el, icona } from '../../components/dom.js';
import * as fmt from '../../kernel/format.js';

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

function allerteInLinea(dossier, massimo) {
    const voci = dossier.anamnesi.allerte || [];
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

export function intestazionePaziente({ dossier, ricevutoIl, allerteVisibili = 4 }) {
    const paziente = dossier.paziente;

    const cronometro = el('span', { class: 'ds-mn__cronometro' }, '');
    const aggiornaCronometro = () => {
        const minuti = Math.max(Math.round((Date.now() - Number(ricevutoIl || Date.now())) / 60000), 0);
        cronometro.textContent = minuti < 1 ? 'seduta appena aperta' : `seduta da ${minuti} min`;
    };
    aggiornaCronometro();
    const battito = setInterval(aggiornaCronometro, 30000);
    if (typeof battito.unref === 'function') battito.unref();

    const anagrafica = el('div', { class: 'ds-mn__anagrafica' }, [
        pastiglia('Età', paziente.eta === null ? null : `${paziente.eta}`),
        pastiglia('Nato il', fmt.data(paziente.data_nascita)),
        pastiglia('CF', paziente.codice_fiscale),
        pastiglia('Tel', paziente.telefono),
        pastiglia('Gruppo', paziente.gruppo_sanguigno),
        pastiglia('Esenzioni', paziente.esenzioni),
        pastiglia('Emergenza', paziente.contatto_emergenza)
    ].filter(Boolean));

    return el('header', { class: 'ds-mn__intestazione' }, [
        el('div', { class: 'ds-mn__identita' }, [
            el('h1', { class: 'ds-mn__nome', title: paziente.nominativo }, paziente.nominativo),
            anagrafica
        ]),
        el('div', { class: 'ds-mn__fianco' }, [
            allerteInLinea(dossier, allerteVisibili),
            cronometro
        ])
    ]);
}
