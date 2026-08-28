import { el, rimpiazza } from '../../components/dom.js';
import { radice } from '../../components/layout.js';
import { assicuraFoglio } from '../../kernel/stili.js';
import { eroe } from './eroe.js';
import { fasciaGaranzie, schedaSpecifiche } from './garanzie.js';
import { diagrammaFlusso } from './diagramma.js';
import { bloccoLocale, bloccoCifratura, bloccoResponsabilita } from './sicurezza.js';
import { bloccoApplicazione } from './applicazione.js';
import { bloccoAutore, bloccoContatti } from './autore.js';
import { attivaRivelazione } from './animazione.js';

export default {
    rendi: async () => {
        assicuraFoglio('informazioni');
        assicuraFoglio('informazioni_schede');

        const contenitore = radice('conformita');
        contenitore.classList.add('ds-info');

        rimpiazza(contenitore, [
            eroe(),
            fasciaGaranzie(),
            diagrammaFlusso(),
            el('div', { class: 'ds-info__griglia' }, [
                bloccoLocale(),
                bloccoCifratura(),
                schedaSpecifiche(),
                bloccoApplicazione()
            ]),
            bloccoResponsabilita(),
            el('div', { class: 'ds-info__griglia' }, [
                bloccoAutore(),
                bloccoContatti()
            ])
        ]);

        attivaRivelazione(contenitore);
        return contenitore;
    }
};
