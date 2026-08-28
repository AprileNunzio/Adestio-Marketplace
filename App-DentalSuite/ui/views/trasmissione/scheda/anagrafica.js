import { el } from '../../../components/dom.js';
import { coppia, blocchetto } from './pannello.js';
import * as fmt from '../../../kernel/format.js';

function gruppo(titolo, voci) {
    const presenti = voci.filter(Boolean);
    if (presenti.length === 0) return null;
    return el('div', { class: 'ds-mn__gruppo-anagrafico' }, [
        el('span', { class: 'ds-mn__sezione-eti' }, titolo),
        el('div', { class: 'ds-mn__coppie' }, presenti)
    ]);
}

function identificativi(paziente) {
    return gruppo('Identità', [
        coppia('Nato il', fmt.data(paziente.data_nascita)),
        coppia('Luogo', paziente.luogo_nascita),
        coppia('Età', paziente.eta === null ? '' : `${paziente.eta} anni`),
        coppia('Sesso', paziente.sesso),
        coppia('Codice fiscale', paziente.codice_fiscale),
        coppia('Gruppo sanguigno', paziente.gruppo_sanguigno)
    ]);
}

function contatti(paziente) {
    return gruppo('Recapiti', [
        coppia('Telefono', paziente.recapiti.telefono),
        coppia('Email', paziente.recapiti.email),
        coppia('Residenza', paziente.recapiti.residenza),
        coppia('Canale preferito', paziente.recapiti.canale_preferito)
    ]);
}

function riferimentiSanitari(paziente) {
    return gruppo('Riferimenti sanitari', [
        coppia('Medico curante', paziente.medico_curante_scheda.nome),
        coppia('Telefono curante', paziente.medico_curante_scheda.telefono),
        coppia('Esenzioni', paziente.amministrativo.esenzioni),
        paziente.pacemaker ? coppia('Pacemaker', 'Portatore') : null
    ]);
}

function contattoEmergenza(paziente) {
    if (!paziente.emergenza.presente) return null;
    return gruppo('Contatto di emergenza', [
        coppia('Nominativo', paziente.emergenza.nome),
        coppia('Parentela', paziente.emergenza.parentela),
        coppia('Telefono', paziente.emergenza.telefono)
    ]);
}

function amministrativi(paziente) {
    return gruppo('Amministrativo', [
        coppia('Assicurazione', paziente.amministrativo.assicurazione),
        coppia('Numero polizza', paziente.amministrativo.numero_polizza),
        coppia('Professione', paziente.amministrativo.professione),
        coppia('Stato civile', paziente.amministrativo.stato_civile)
    ]);
}

function consensi(paziente, dossier) {
    const bloccanti = (dossier.consensi && dossier.consensi.bloccanti) || [];
    return gruppo('Consensi', [
        coppia('Privacy', paziente.privacy.consenso_privacy ? 'Prestato' : 'Non prestato'),
        coppia('Data consenso', fmt.data(paziente.privacy.data_consenso_privacy)),
        coppia('Promemoria', paziente.privacy.consenso_promemoria ? 'Autorizzati' : 'Non autorizzati'),
        bloccanti.length > 0 ? coppia('Scoperture bloccanti', String(bloccanti.length)) : null
    ]);
}

export function contenutoAnagrafica(dossier) {
    const paziente = dossier.paziente;
    return el('div', { class: 'ds-mn__estesa' }, [
        identificativi(paziente),
        contattoEmergenza(paziente),
        contatti(paziente),
        riferimentiSanitari(paziente),
        amministrativi(paziente),
        consensi(paziente, dossier),
        blocchetto('Note sul paziente', paziente.note)
    ].filter(Boolean));
}
