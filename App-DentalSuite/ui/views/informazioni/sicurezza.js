import { el, icona } from '../../components/dom.js';

const LOCALE = [
    ['home_storage', 'L\'archivio è sul tuo computer', 'Cartelle, anamnesi, radiografie e documenti restano nei file dello studio. Non esiste un nostro server che li riceve.'],
    ['cloud_off', 'Nessun account, nessuna nuvola', 'Non devi registrarti da nessuna parte. L\'applicazione non invia i dati dei pazienti a servizi esterni, né miei né di terzi.'],
    ['analytics', 'Nessuna statistica di utilizzo', 'Non raccolgo telemetria e non traccio cosa fai nel programma.'],
    ['lan', 'La rete si ferma allo studio', 'Le postazioni si parlano fra loro sulla rete locale. Il traffico clinico non esce dal router dello studio.']
];

const CIFRATURA = [
    ['enhanced_encryption', 'Archivio cifrato sul disco', 'Il database dello studio è salvato cifrato con AES-256-GCM da Adestio. La chiave nasce dal codice di rete tramite scrypt ed è custodita dal sistema operativo, legata al tuo utente Windows: copiare il file su un altro computer non basta per leggerlo.'],
    ['lock', 'Cartella cifrata da postazione a postazione', 'Quando la segreteria manda la scheda al monitor del medico, il contenuto viaggia cifrato con AES-256-GCM. La chiave è usa e getta: vale per quella singola trasmissione e viene distrutta subito dopo.'],
    ['draw', 'Ogni richiesta è firmata', 'Le postazioni si scambiano messaggi firmati con chiavi Ed25519. Un messaggio alterato in transito, o riproposto una seconda volta, viene rifiutato.'],
    ['visibility_off', 'Il nome del paziente non gira in rete', 'Quando i computer si cercano fra loro, si dicono solo se la poltrona è libera o occupata. Nome, codice fiscale e dati clinici non compaiono in quello scambio.'],
    ['fingerprint', 'Registro accessi a prova di ritocco', 'Ogni accesso ai dati clinici finisce in un registro concatenato con impronte SHA-256: se qualcuno modifica o cancella una riga a posteriori, la catena si spezza e si vede.']
];

const STUDIO = [
    'Custodisci il codice di rete dello studio: è la radice della chiave di cifratura, e chi lo conosce può aprire gli archivi.',
    'Tieni un backup dell\'archivio in un posto diverso dal computer che lo ospita: il backup resta cifrato.',
    'Usa una password di Windows per ogni persona e non lasciare la sessione aperta su un PC incustodito.',
    'Cifrare anche il disco con BitLocker aggiunge una seconda barriera oltre a quella di Adestio.',
    'Ricorda che il titolare del trattamento dei dati resta lo studio: questo programma è uno strumento, non un adempimento.'
];

function voceElenco([simbolo, titolo, testo]) {
    return el('li', { class: 'ds-info__capacita-voce' }, [
        el('span', { class: 'ds-info__capacita-icona' }, icona(simbolo)),
        el('div', {}, [
            el('strong', {}, titolo),
            el('span', { class: 'ds-info__capacita-testo' }, testo)
        ])
    ]);
}

export function bloccoLocale() {
    return el('section', { class: 'ds-info__scheda', dataset: { rivela: 'true' } }, [
        el('header', { class: 'ds-info__testa' }, [
            icona('lock'),
            el('h2', {}, 'I dati non escono dallo studio')
        ]),
        el('p', { class: 'ds-info__testo' },
            'DentalSuite non è un servizio online: è un programma che gira sui computer dello studio. '
            + 'Non c\'è un portale dove finiscono le cartelle dei tuoi pazienti, perché non c\'è nessun posto '
            + 'dove mandarle.'
        ),
        el('ul', { class: 'ds-info__capacita' }, LOCALE.map(voceElenco)),
        el('p', { class: 'ds-info__minuto' },
            'L\'unica cosa che passa da internet è l\'aggiornamento del programma, che si scarica da nunziotech.it. '
            + 'In quel pacchetto c\'è solo il software: nessun dato dei tuoi pazienti viene mai inviato.'
        )
    ]);
}

export function bloccoCifratura() {
    return el('section', { class: 'ds-info__scheda', dataset: { rivela: 'true' } }, [
        el('header', { class: 'ds-info__testa' }, [
            icona('shield_lock'),
            el('h2', {}, 'Come sono protetti i dati')
        ]),
        el('ul', { class: 'ds-info__capacita' }, CIFRATURA.map(voceElenco)),
        el('p', { class: 'ds-info__minuto' },
            'La scheda sparisce da sola dal monitor del medico quando la segreteria chiude la seduta '
            + 'o dopo un periodo di inattività, così non resta la cartella di un paziente a schermo in una stanza vuota.'
        )
    ]);
}

export function bloccoResponsabilita() {
    return el('section', { class: 'ds-info__scheda ds-info__scheda--avviso', dataset: { rivela: 'true' } }, [
        el('header', { class: 'ds-info__testa' }, [
            icona('info'),
            el('h2', {}, 'Quello che resta a carico tuo')
        ]),
        el('p', { class: 'ds-info__testo' },
            'Preferisco dirti anche dove finisce la protezione del programma, invece di lasciartelo scoprire dopo. '
            + 'L\'archivio è cifrato, ma nessuna cifratura protegge da una chiave lasciata in giro.'
        ),
        el('ul', { class: 'ds-info__responsabilita' }, STUDIO.map(testo => el('li', {}, [
            icona('chevron_right'),
            el('span', {}, testo)
        ])))
    ]);
}
