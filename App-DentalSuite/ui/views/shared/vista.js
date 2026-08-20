import { rimpiazza } from '../../components/dom.js';
import { radice, scheletro } from '../../components/layout.js';
import { errore } from '../../components/notifica.js';
import { listOr, dataOr, isOk } from '../../kernel/result.js';

export function creaVista({ accento, carica, disegna }) {
    const contenitore = radice(accento, scheletro(5));
    let dati = null;

    const aggiorna = async () => {
        try {
            dati = await carica();
            rimpiazza(contenitore, disegna(dati, aggiorna));
        } catch (eccezione) {
            errore(eccezione.message);
        }
    };

    return { contenitore, aggiorna, stato: () => dati };
}

export async function montaVista(configurazione) {
    const vista = creaVista(configurazione);
    await vista.aggiorna();
    return vista.contenitore;
}

export function elenco(risultato) {
    return listOr(risultato, []);
}

export function oggetto(risultato, predefinito = {}) {
    return dataOr(risultato, predefinito);
}

export function riuscito(risultato) {
    return isOk(risultato);
}
