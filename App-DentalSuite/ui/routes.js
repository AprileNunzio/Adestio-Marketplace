import { versione } from './kernel/moduli.js';

export const MODULI = [
    {
        id: 'pazienti',
        titolo: 'Pazienti & Cartelle Cliniche',
        descrizione: 'Anagrafica, anamnesi, odontogramma FDI, diario clinico e referti diagnostici',
        simbolo: 'person_search',
        accento: 'pazienti',
        permesso: 'pazienti_view',
        modulo: () => import(`./views/pazienti.js${versione()}`)
    },
    {
        id: 'agenda',
        titolo: 'Agenda Poltrone & Visite',
        descrizione: 'Planning multi-medico per poltrona, con controllo automatico delle sovrapposizioni',
        simbolo: 'calendar_month',
        accento: 'agenda',
        permesso: 'agenda_view',
        modulo: () => import(`./views/agenda.js${versione()}`)
    },
    {
        id: 'struttura',
        titolo: 'Sedi, Sale & Poltrone',
        descrizione: 'Configurazione delle sedi dello studio, degli ambulatori e dei riuniti',
        simbolo: 'domain',
        accento: 'struttura',
        permesso: 'struttura_view',
        modulo: () => import(`./views/struttura.js${versione()}`)
    },
    {
        id: 'prestazioni',
        titolo: 'Listino & Marginalità',
        descrizione: 'Nomenclatore clinico, tariffe, ripartizione compensi e margine per prestazione',
        simbolo: 'list_alt',
        accento: 'prestazioni',
        permesso: 'prestazioni_view',
        modulo: () => import(`./views/prestazioni.js${versione()}`)
    },
    {
        id: 'staff',
        titolo: 'Staff & Compensi',
        descrizione: 'Medici, igienisti, ASO e segreteria con calcolo e liquidazione delle competenze',
        simbolo: 'badge',
        accento: 'staff',
        permesso: 'staff_view',
        modulo: () => import(`./views/staff.js${versione()}`)
    },
    {
        id: 'contabilita',
        titolo: 'Finanze & Contabilità',
        descrizione: 'Preventivi, piani rateali, incassi, prima nota passiva e scadenziario',
        simbolo: 'account_balance_wallet',
        accento: 'contabilita',
        permesso: 'preventivi_view',
        modulo: () => import(`./views/contabilita.js${versione()}`)
    },
    {
        id: 'conformita',
        titolo: 'Conformità & Tracciabilità',
        descrizione: 'Consensi versionati, scoperture di studio e registro immutabile degli accessi',
        simbolo: 'gpp_good',
        accento: 'conformita',
        permesso: 'consensi_view',
        modulo: () => import(`./views/conformita.js${versione()}`)
    },
    {
        id: 'statistiche',
        titolo: 'Statistiche & Direzione',
        descrizione: 'Produzione dello studio, redditività e indicatori riservati alla Direzione Sanitaria',
        simbolo: 'monitoring',
        accento: 'statistiche',
        permesso: 'statistiche_view',
        modulo: () => import(`./views/statistiche.js${versione()}`)
    }
];

export const VISTE_INTERNE = {
    paziente: {
        titolo: 'Cartella Clinica',
        accento: 'pazienti',
        permesso: 'pazienti_view',
        genitore: 'pazienti',
        modulo: () => import(`./views/paziente.js${versione()}`)
    }
};

export function trovaModulo(id) {
    return MODULI.find(modulo => modulo.id === id) || VISTE_INTERNE[id] || null;
}
