// Ponte verso il backend dell'app: passa da window.adestioNative.callAppApi,
// l'unico canale generico che il preload.js di Adestio espone per app di
// terze parti (non ci sono canali ipcMain dedicati a questa app).
const APP_ID = 'adestio_business_suite';

export async function callApi(action, payload = {}) {
    try {
        const outer = await window.adestioNative.callAppApi({
            sourceApp: APP_ID,
            targetApp: APP_ID,
            action: `businessSuite:${action}`,
            payload
        });
        if (!outer || !outer.success) {
            return { success: false, error: (outer && outer.error) || 'Errore di comunicazione con il backend' };
        }
        return outer.data;
    } catch (e) {
        return { success: false, error: e.message || 'Errore di comunicazione con il backend' };
    }
}
