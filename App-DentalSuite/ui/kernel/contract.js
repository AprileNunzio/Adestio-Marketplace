const CONTRACT_URL = new URL('../../core/contract.json', import.meta.url);

let snapshot = null;
let inFlight = null;

async function fetchContract() {
    const response = await fetch(CONTRACT_URL);
    if (!response.ok) {
        throw new Error(`Contratto applicativo non caricabile (HTTP ${response.status})`);
    }
    const parsed = await response.json();
    if (!parsed || !parsed.actions || !parsed.ipcNamespace) {
        throw new Error('Contratto applicativo malformato');
    }
    return parsed;
}

export async function loadContract() {
    if (snapshot) return snapshot;
    if (!inFlight) {
        inFlight = fetchContract()
            .then(parsed => {
                snapshot = parsed;
                return parsed;
            })
            .catch(error => {
                inFlight = null;
                throw error;
            });
    }
    return inFlight;
}

export async function actionSpec(actionId) {
    const contract = await loadContract();
    return contract.actions[actionId] || null;
}

export async function channelFor(actionId) {
    const contract = await loadContract();
    return `${contract.ipcNamespace}:${actionId}`;
}

export async function appId() {
    const contract = await loadContract();
    return contract.appId;
}
