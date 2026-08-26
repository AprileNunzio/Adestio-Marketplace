import { call } from '../../kernel/transport.js';
import { generaDerivate, daPorzioni, supportata } from '../../kernel/immagini.js';
import { oggetto, elenco } from '../shared/vista.js';

const BLOCCHI_MASSIMI = 120;

async function scaricaOriginale(id) {
    const porzioni = [];
    let intestazione = null;
    let blocco = 0;

    while (blocco < BLOCCHI_MASSIMI) {
        const risposta = oggetto(await call('allegati.porzione', { id, blocco, variante: 'originale' }), null);
        if (!risposta) throw new Error('Referto non leggibile su questa postazione');
        if (!intestazione) intestazione = risposta;
        porzioni.push(risposta.dati);
        blocco += 1;
        if (blocco >= risposta.blocchi) break;
    }

    return daPorzioni(porzioni, intestazione.mime);
}

export async function generaPer(id) {
    if (!supportata()) return { id, generate: false, motivo: 'Postazione senza supporto alla conversione' };

    try {
        const originale = await scaricaOriginale(id);
        const derivate = await generaDerivate(originale);
        const esito = oggetto(await call('allegati.salvaDerivate', { id, ...derivate }), null);
        return {
            id,
            generate: Boolean(esito),
            peso_originale: originale.size,
            peso_anteprima: derivate.peso_anteprima,
            peso_visione: derivate.peso_visione
        };
    } catch (errore) {
        await call('allegati.salvaDerivate', { id, fallita: true });
        return { id, generate: false, motivo: errore.message };
    }
}

export async function generaArretrati(pazienteId, quanti = 10) {
    const arretrati = elenco(await call('allegati.daDerivare', {
        paziente_id: pazienteId,
        dimensione: quanti
    }));

    const esiti = [];
    for (const voce of arretrati) {
        esiti.push(await generaPer(voce.id));
    }

    return {
        elaborate: esiti.filter(voce => voce.generate).length,
        fallite: esiti.filter(voce => !voce.generate).length,
        risparmio: esiti
            .filter(voce => voce.generate)
            .reduce((somma, voce) => somma + Math.max(voce.peso_originale - voce.peso_visione, 0), 0)
    };
}
