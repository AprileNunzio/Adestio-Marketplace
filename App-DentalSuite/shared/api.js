const APP_ID = 'adestio_dental_suite';

export async function callApi(action, payload = {}) {
    try {
        if (!window.adestioNative || typeof window.adestioNative.callAppApi !== 'function') {
            return { success: false, error: 'Bridge IPC di Adestio non disponibile' };
        }
        const outer = await window.adestioNative.callAppApi({
            sourceApp: APP_ID,
            targetApp: APP_ID,
            action: `dentalSuite:${action}`,
            payload
        });
        if (!outer || !outer.success) {
            return { success: false, error: (outer && outer.error) || 'Errore di comunicazione' };
        }
        return outer.data;
    } catch (e) {
        return { success: false, error: e.message || 'Eccezione nella chiamata API' };
    }
}
