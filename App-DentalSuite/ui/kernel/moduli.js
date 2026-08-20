let suffisso = '';

export function impostaVersione(valore) {
    const pulito = String(valore || '').replace(/[^\w.-]/g, '');
    suffisso = pulito ? `?v=${pulito}` : '';
    return suffisso;
}

export function versione() {
    return suffisso;
}

export function versioneDa(urlModulo) {
    try {
        const query = new URL(urlModulo).searchParams.get('v');
        return impostaVersione(query || Date.now());
    } catch (e) {
        return impostaVersione(Date.now());
    }
}
