const ANTEPRIMA = { lato: 480, qualita: 0.72 };
const VISIONE = { lato: 2200, qualita: 0.84 };
const TIPO = 'image/webp';

export function supportata() {
    return typeof OffscreenCanvas === 'function' && typeof createImageBitmap === 'function';
}

function dimensioniRidotte(larghezza, altezza, latoMassimo) {
    const massimo = Math.max(larghezza, altezza);
    if (massimo <= latoMassimo) return { larghezza, altezza };
    const fattore = latoMassimo / massimo;
    return {
        larghezza: Math.max(Math.round(larghezza * fattore), 1),
        altezza: Math.max(Math.round(altezza * fattore), 1)
    };
}

async function codifica(immagine, latoMassimo, qualita) {
    const misure = dimensioniRidotte(immagine.width, immagine.height, latoMassimo);
    const tela = new OffscreenCanvas(misure.larghezza, misure.altezza);
    const contesto = tela.getContext('2d');
    contesto.imageSmoothingEnabled = true;
    contesto.imageSmoothingQuality = 'high';
    contesto.drawImage(immagine, 0, 0, misure.larghezza, misure.altezza);
    const blob = await tela.convertToBlob({ type: TIPO, quality: qualita });
    return { blob, ...misure };
}

function aBase64(blob) {
    return new Promise((risolvi, rifiuta) => {
        const lettore = new FileReader();
        lettore.onload = () => risolvi(String(lettore.result));
        lettore.onerror = () => rifiuta(new Error('Lettura della derivata non riuscita'));
        lettore.readAsDataURL(blob);
    });
}

export async function generaDerivate(contenuto) {
    if (!supportata()) throw new Error('Questa postazione non sa generare le derivate delle immagini');

    const immagine = await createImageBitmap(contenuto);
    try {
        const [anteprima, visione] = await Promise.all([
            codifica(immagine, ANTEPRIMA.lato, ANTEPRIMA.qualita),
            codifica(immagine, VISIONE.lato, VISIONE.qualita)
        ]);
        const [datiAnteprima, datiVisione] = await Promise.all([
            aBase64(anteprima.blob),
            aBase64(visione.blob)
        ]);
        return {
            anteprima: datiAnteprima,
            visione: datiVisione,
            larghezza: immagine.width,
            altezza: immagine.height,
            peso_anteprima: anteprima.blob.size,
            peso_visione: visione.blob.size
        };
    } finally {
        if (typeof immagine.close === 'function') immagine.close();
    }
}

export function daPorzioni(porzioni, mime) {
    const byte = porzioni.reduce((tutti, porzione) => {
        const binario = atob(porzione);
        const parte = new Uint8Array(binario.length);
        for (let indice = 0; indice < binario.length; indice += 1) {
            parte[indice] = binario.charCodeAt(indice);
        }
        return tutti.concat([parte]);
    }, []);
    return new Blob(byte, { type: mime });
}
