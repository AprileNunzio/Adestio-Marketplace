'use strict';

const RUOLO_RECEPTION = 'segreteria';
const RUOLO_STUDIO = 'riunito';

const POSTI = [
    {
        id: RUOLO_RECEPTION,
        titolo: 'Alla reception',
        spiegazione: 'Qui c\'è l\'archivio dei pazienti. Da questo computer mandi la scheda al monitor dello studio.',
        simbolo: 'desk',
        nome_suggerito: 'Reception'
    },
    {
        id: RUOLO_STUDIO,
        titolo: 'Nello studio, accanto alla poltrona',
        spiegazione: 'Questo monitor mostra la scheda del paziente che la reception ti manda. Il medico la tocca con il dito.',
        simbolo: 'chair',
        nome_suggerito: 'Studio 1'
    }
];

function postoDi(ruolo) {
    return POSTI.find(voce => voce.id === ruolo) || POSTI[0];
}

function nomeDelPosto(ruolo) {
    return ruolo === RUOLO_STUDIO ? 'monitor dello studio' : 'computer della reception';
}

function passoIniziale() {
    return {
        passo: 'scegli_posto',
        titolo: 'Dove si trova questo computer?',
        spiegazione: 'Serve una volta sola. Scegli dove si trova fisicamente questo computer e pensiamo a tutto noi.',
        azione: null,
        pronta: false
    };
}

function passoAccensione(stato) {
    const errore = stato.servizio && stato.servizio.ultimo_errore;
    return {
        passo: 'accendi',
        titolo: 'Il collegamento è spento',
        spiegazione: errore
            ? `Non è riuscito ad avviarsi: ${errore}`
            : 'Nessun altro computer può collegarsi finché resta spento.',
        azione: { etichetta: 'Accendi il collegamento', tipo: 'accendi' },
        pronta: false
    };
}

function passoCollegaAllaReception(stato) {
    const vicini = Number(stato.scoperta && stato.scoperta.vicini) || 0;
    return {
        passo: 'collega',
        titolo: 'Questo monitor non è ancora collegato alla reception',
        spiegazione: vicini > 0
            ? 'Scegli la reception dall\'elenco, poi fatti dire il codice di collegamento e scrivilo.'
            : 'Fatti dire dalla reception il codice di collegamento e l\'indirizzo del computer.',
        azione: { etichetta: 'Collega alla reception', tipo: 'collega' },
        pronta: false
    };
}

function passoMostraCodice() {
    return {
        passo: 'mostra_codice',
        titolo: 'Nessun monitor collegato',
        spiegazione: 'Mostra il codice e scrivilo sul monitor dello studio: si collegano fra loro una volta sola.',
        azione: { etichetta: 'Mostra il codice di collegamento', tipo: 'codice' },
        pronta: false
    };
}

function passoPronto(stato) {
    const collegati = (stato.canali || []).length;
    if (stato.postazione && stato.postazione.ruolo === RUOLO_STUDIO) {
        return {
            passo: 'pronto',
            titolo: 'Tutto pronto',
            spiegazione: 'Questo monitor è collegato alla reception e aspetta la scheda del paziente.',
            azione: { etichetta: 'Apri la schermata del paziente', tipo: 'apri_display' },
            pronta: true
        };
    }
    return {
        passo: 'pronto',
        titolo: 'Tutto pronto',
        spiegazione: collegati === 1
            ? 'Un monitor è collegato: puoi mandargli la scheda di un paziente.'
            : `${collegati} monitor collegati: puoi mandare la scheda di un paziente.`,
        azione: { etichetta: 'Manda una scheda', tipo: 'trasmetti' },
        pronta: true
    };
}

function componi(stato) {
    if (!stato || !stato.postazione) return { ...passoIniziale(), configurata: false };

    const postazione = stato.postazione;
    const configurata = postazione.attiva === true;

    if (!configurata) {
        return { ...passoIniziale(), configurata: false, nome: postazione.nome, posti: POSTI };
    }

    const base = {
        configurata: true,
        nome: postazione.nome,
        ruolo: postazione.ruolo,
        posto: postoDi(postazione.ruolo).titolo,
        collegati: (stato.canali || []).length,
        in_coda: (stato.coda && stato.coda.in_attesa) || 0
    };

    if (postazione.ruolo === RUOLO_STUDIO) {
        if (!stato.cliente || stato.cliente.collegato !== true) {
            return { ...base, ...passoCollegaAllaReception(stato) };
        }
        return { ...base, ...passoPronto(stato) };
    }

    if (!stato.servizio || stato.servizio.attivo !== true) {
        return { ...base, ...passoAccensione(stato) };
    }
    if (base.collegati === 0) {
        return { ...base, ...passoMostraCodice() };
    }
    return { ...base, ...passoPronto(stato) };
}

module.exports = { componi, POSTI, postoDi, nomeDelPosto, RUOLO_RECEPTION, RUOLO_STUDIO };
