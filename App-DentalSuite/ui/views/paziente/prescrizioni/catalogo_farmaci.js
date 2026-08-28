import { FARMACI_ANTIBIOTICI_CAT } from './catalogo/antibiotici.js';
import { FARMACI_FANS_CAT } from './catalogo/fans_antidolorifici.js';
import { FARMACI_CORTISONICI_ANTISETTICI_CAT } from './catalogo/cortisonici_antisettici.js';
import { FARMACI_ALTRI_SPECIALISTICI_CAT } from './catalogo/altri_specialistici.js';

export const CATEGORIE_PRONTUARIO = [
    { id: 'tutti', etichetta: 'Tutti i farmaci', simbolo: 'medication' },
    { id: 'antibiotici', etichetta: 'Antibiotici', simbolo: 'vaccines' },
    { id: 'fans_analgesici', etichetta: 'FANS & Analgesici', simbolo: 'healing' },
    { id: 'cortisonici', etichetta: 'Corticosteroidi (Anti-gonfiore)', simbolo: 'local_pharmacy' },
    { id: 'collutori_antisettici', etichetta: 'Collutori & Gel Antisettici', simbolo: 'sanitizer' },
    { id: 'miorilassanti', etichetta: 'Miorilassanti & ATM', simbolo: 'sports_gymnastics' },
    { id: 'antimicotici_antivirali', etichetta: 'Antimicotici & Antivirali', simbolo: 'coronavirus' },
    { id: 'gastroprotettori', etichetta: 'Gastroprotettori', simbolo: 'gastroenterology' },
    { id: 'emostatici_altri', etichetta: 'Emostatici & Altri', simbolo: 'bloodtype' }
];

export const FARMACI_PREDEFINITI = [].concat(
    FARMACI_ANTIBIOTICI_CAT,
    FARMACI_FANS_CAT,
    FARMACI_CORTISONICI_ANTISETTICI_CAT,
    FARMACI_ALTRI_SPECIALISTICI_CAT
);
