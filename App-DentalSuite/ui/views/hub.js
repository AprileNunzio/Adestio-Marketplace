import { radice, intestazione, griglia, scheda, avviso } from '../components/layout.js';

export function rendiHub({ moduli, avvisoAccessi, onApri }) {
    const consentiti = moduli.filter(modulo => modulo.consentito).length;

    return radice('pazienti', [
        intestazione({
            titolo: 'DentalSuite',
            sottotitolo: `Gestionale clinico ed economico dello studio odontoiatrico · ${consentiti} di ${moduli.length} sezioni accessibili`,
            simbolo: 'dentistry'
        }),
        avvisoAccessi
            ? avviso({
                tono: 'warning',
                simbolo: 'shield_question',
                titolo: 'Permessi non verificabili',
                voci: [
                    avvisoAccessi,
                    'Per sicurezza tutte le sezioni restano bloccate finché il controllo accessi non è disponibile.'
                ]
            })
            : null,
        griglia('cards', moduli.map(modulo => scheda({
            titolo: modulo.titolo,
            descrizione: modulo.descrizione,
            simbolo: modulo.simbolo,
            disabilitata: !modulo.consentito,
            onApri: () => onApri(modulo.id)
        })))
    ]);
}
