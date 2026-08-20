import { el, rimpiazza } from './components/dom.js';
import { radice, intestazione, vuoto, scheletro } from './components/layout.js';
import { errore } from './components/notifica.js';
import { can, isUnresolved, unresolvedReason, invalidate } from './security/permissions.js';
import { MODULI, trovaModulo } from './routes.js';
import { rendiHub } from './views/hub.js';

function schermoErrore(messaggio, riprova) {
    return radice('pazienti', [
        intestazione({ titolo: 'DentalSuite', simbolo: 'dentistry' }),
        vuoto({
            titolo: 'Impossibile aprire la sezione',
            testo: messaggio,
            simbolo: 'error',
            azione: riprova
                ? el('button', { class: 'ds-btn', type: 'button', onClick: riprova }, 'Riprova')
                : null
        })
    ]);
}

function schermoNegato(modulo, indietro) {
    return radice(modulo.accento || 'pazienti', [
        intestazione({
            titolo: modulo.titolo,
            sottotitolo: 'Sezione protetta dal controllo accessi dello studio',
            simbolo: 'lock',
            indietro
        }),
        vuoto({
            titolo: 'Permessi insufficienti',
            testo: `L'accesso richiede il permesso "${modulo.permesso}". Richiedilo a un amministratore da Adestio → Amministratore → Controllo Accessi.`,
            simbolo: 'shield_lock'
        })
    ]);
}

export function creaShell(contenitore) {
    let corrente = null;

    const naviga = async (destinazione, parametri = {}) => {
        corrente = { destinazione, parametri };
        if (destinazione === 'hub') {
            await apriHub();
            return;
        }
        await apriModulo(destinazione, parametri);
    };

    const apriHub = async () => {
        rimpiazza(contenitore, radice('pazienti', scheletro(3)));
        const stati = await Promise.all(MODULI.map(modulo => can(modulo.permesso)));
        const nonRisolto = await isUnresolved();
        const motivo = await unresolvedReason();
        rimpiazza(contenitore, rendiHub({
            moduli: MODULI.map((modulo, indice) => ({ ...modulo, consentito: stati[indice] })),
            avvisoAccessi: nonRisolto ? motivo : null,
            onApri: id => naviga(id)
        }));
    };

    const apriModulo = async (id, parametri) => {
        const modulo = trovaModulo(id);
        if (!modulo) {
            rimpiazza(contenitore, schermoErrore(`Sezione sconosciuta: ${id}`, () => naviga('hub')));
            return;
        }

        const indietro = () => naviga(modulo.genitore || 'hub');
        if (!(await can(modulo.permesso))) {
            rimpiazza(contenitore, schermoNegato(modulo, indietro));
            return;
        }

        rimpiazza(contenitore, radice(modulo.accento, scheletro(5)));
        try {
            const caricato = await modulo.modulo();
            const rendi = caricato.default && typeof caricato.default.rendi === 'function'
                ? caricato.default.rendi
                : null;
            if (!rendi) throw new Error('Vista non conforme al contratto di rendering');
            const vista = await rendi({ parametri, naviga, indietro });
            rimpiazza(contenitore, vista);
        } catch (eccezione) {
            errore(eccezione.message);
            rimpiazza(contenitore, schermoErrore(eccezione.message, () => naviga(id, parametri)));
        }
    };

    const ricarica = () => {
        invalidate();
        return corrente ? naviga(corrente.destinazione, corrente.parametri) : naviga('hub');
    };

    return { naviga, ricarica };
}
