import { el } from '../../components/dom.js';
import { apriModale } from '../../components/modale.js';
import { costruisciCampi } from '../../components/campi.js';
import { errore } from '../../components/notifica.js';

export function sezioneCampi(titolo, campi, stato, onCambio) {
    return el('div', {}, [
        titolo ? el('div', { class: 'ds-field__label' }, titolo) : null,
        el('div', { class: 'ds-grid ds-grid--form' }, costruisciCampi(campi, stato, onCambio))
    ]);
}

export async function apriForm({ titolo, sezioni, valori = {}, ampia = false, etichettaSalva = 'Salva', onSalva }) {
    const stato = { ...valori };
    const onCambio = (campo, valore) => {
        stato[campo] = valore;
    };

    const corpo = sezioni.map(sezione => sezioneCampi(sezione.titolo, sezione.campi, stato, onCambio));

    const esito = await apriModale({
        titolo,
        corpo,
        ampia,
        azioni: [
            { etichetta: 'Annulla', variante: 'ghost', esito: null },
            {
                etichetta: etichettaSalva,
                simbolo: 'save',
                onAzione: async () => {
                    const risultato = await onSalva(stato);
                    if (!risultato || risultato.success !== true) {
                        errore((risultato && risultato.error) || 'Salvataggio non riuscito');
                        return false;
                    }
                    return risultato;
                }
            }
        ]
    });

    return esito === null ? null : stato;
}
