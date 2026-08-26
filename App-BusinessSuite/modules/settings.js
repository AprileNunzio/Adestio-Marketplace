import { toast, Router } from '../js/utils.js';
import { heroHtml, campoHtml, leggiCampo } from '../shared/ui_kit.js';
import { callApi } from '../shared/api.js';

// Ragione Sociale / P.IVA / Codice Fiscale sono l'identita' fiscale della STESSA
// azienda gia' configurata in Adestio > Amministratore > Dati Azienda: mostrarli
// qui come campi editabili avrebbe creato una seconda copia destinata ad andare
// fuori sincro alla prima modifica fatta in Amministrazione. Sono quindi sempre
// sola-lettura (il backend li ignora comunque se arrivassero in setMultiple).
const IDENTITA_FIELDS = [
    { key: 'ragione_sociale_azienda', label: 'Ragione Sociale', icon: 'business', full: true, readonly: true },
    { key: 'piva_azienda', label: 'Partita IVA', icon: 'tag', readonly: true },
    { key: 'codice_fiscale_azienda', label: 'Codice Fiscale', icon: 'badge', readonly: true }
];

// Questi restano editabili qui: la Fattura Elettronica richiede indirizzo, CAP,
// città e provincia come campi separati, mentre in Adestio l'indirizzo della
// sede legale è un unico campo libero non strutturato — non scindibile in modo
// affidabile, quindi non viene precompilato automaticamente.
const AZIENDA_FIELDS = [
    { key: 'indirizzo_azienda', label: 'Indirizzo', icon: 'location_on', full: true },
    { key: 'citta_azienda', label: 'Città', icon: 'location_city' },
    { key: 'cap_azienda', label: 'CAP', icon: 'markunread_mailbox' },
    { key: 'provincia_azienda', label: 'Provincia', icon: 'map', hint: 'Sigla, es. RM' }
];

const FISCALI_FIELDS = [
    { key: 'iva_default', label: 'Aliquota IVA di default (%)', icon: 'percent', type: 'number' },
    { key: 'margine_default', label: 'Margine di default (%)', icon: 'trending_up', type: 'number', hint: 'Usato per suggerire il prezzo di vendita in catalogo' },
    { key: 'termini_pagamento_default', label: 'Termini di pagamento di default', icon: 'schedule', full: true },
    { key: 'ritenuta_percentuale_default', label: 'Ritenuta d\'acconto di default (%)', icon: 'percent', type: 'number' },
    { key: 'cassa_previdenziale_percentuale_default', label: 'Cassa previdenziale di default (%)', icon: 'percent', type: 'number' },
    { key: 'arrotonda_preventivi', label: 'Arrotonda i totali dei preventivi all\'euro', type: 'checkbox', hint: 'Il totale IVATO viene arrotondato e imponibile/IVA ricalcolati di conseguenza' }
];

async function canAccessAmministrazione() {
    try {
        const userId = sessionStorage.getItem('currentUserId');
        if (!userId || !window.electronAPI || !window.electronAPI.rbac) return false;
        const perms = await window.electronAPI.rbac.getEffectiveUserPermissions(userId);
        if (!Array.isArray(perms)) return false;
        return perms.includes('*') || perms.some(p => p.startsWith('amministratore:'));
    } catch (e) {
        return false;
    }
}

export async function render(el) {
    const canManageAzienda = await canAccessAmministrazione();

    el.innerHTML = `
        <div class="fade-in-up ak-root">
            ${heroHtml({
                title: 'Impostazioni', subtitle: 'Dati azienda e parametri fiscali di default', icon: 'settings', tone: 'blue',
                actionsHtml: `<button id="imp-btn-save" class="ak-hero-btn"><span class="material-symbols-rounded">save</span>Salva</button>`
            })}
            <div class="ak-panel">
                <div class="ak-panel-body">
                    <div class="ak-section">
                        <div class="ak-section-head">
                            <div class="ak-section-icon"><span class="material-symbols-rounded">apartment</span></div>
                            <h4 class="ak-section-title">Identità Fiscale (Cedente/Prestatore)</h4>
                        </div>
                        <p style="font-size:0.85rem;color:var(--md-on-surface-variant);margin:-0.4rem 0 1rem;">
                            Gestita in Adestio &gt; Amministratore &gt; Dati Azienda: qui viene solo mostrata, per evitare una seconda copia che rischierebbe di disallinearsi.
                        </p>
                        <div class="ak-form-grid" id="imp-identita-fields"></div>
                        ${canManageAzienda ? `
                        <button id="imp-btn-goto-admin" class="btn btn-secondary" style="margin-top:1rem;display:inline-flex;align-items:center;gap:0.5rem;">
                            <span class="material-symbols-rounded">open_in_new</span> Modifica in Amministrazione
                        </button>` : ''}
                    </div>
                    <div class="ak-section">
                        <div class="ak-section-head">
                            <div class="ak-section-icon"><span class="material-symbols-rounded">location_on</span></div>
                            <h4 class="ak-section-title">Indirizzo per Fattura Elettronica</h4>
                        </div>
                        <p style="font-size:0.85rem;color:var(--md-on-surface-variant);margin:-0.4rem 0 1rem;">
                            Richiesto come campi separati dallo schema FatturaPA.
                        </p>
                        <div class="ak-form-grid" id="imp-azienda-fields"></div>
                    </div>
                    <div class="ak-section">
                        <div class="ak-section-head">
                            <div class="ak-section-icon"><span class="material-symbols-rounded">calculate</span></div>
                            <h4 class="ak-section-title">Parametri Fiscali di Default</h4>
                        </div>
                        <div class="ak-form-grid" id="imp-fiscali-fields"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    const identitaBox = el.querySelector('#imp-identita-fields');
    const aziendaBox = el.querySelector('#imp-azienda-fields');
    const fiscaliBox = el.querySelector('#imp-fiscali-fields');
    identitaBox.innerHTML = IDENTITA_FIELDS.map(f => campoHtml(f, '')).join('');
    aziendaBox.innerHTML = AZIENDA_FIELDS.map(f => campoHtml(f, '')).join('');
    fiscaliBox.innerHTML = FISCALI_FIELDS.map(f => campoHtml(f, '')).join('');

    // I campi identita' sono mostrati ma mai inviati al salvataggio: sola lettura.
    const editableFields = [...AZIENDA_FIELDS, ...FISCALI_FIELDS];

    async function load() {
        const res = await callApi('impostazioni:getAll');
        if (!res || !res.success) return;
        [...IDENTITA_FIELDS, ...editableFields].forEach(f => {
            const input = el.querySelector(`#crud-field-${f.key}`);
            if (!input) return;
            const value = res.data[f.key];
            if (f.type === 'checkbox') input.checked = value === 'true' || value === true;
            else input.value = value !== undefined ? value : '';
        });
    }

    const gotoAdminBtn = el.querySelector('#imp-btn-goto-admin');
    if (gotoAdminBtn) {
        gotoAdminBtn.addEventListener('click', () => {
            Router.navigate('app_container', { appId: 'amministratore', subAppId: 'dati_azienda' });
        });
    }

    el.querySelector('#imp-btn-save').addEventListener('click', async () => {
        try {
            const payload = {};
            editableFields.forEach(f => { payload[f.key] = leggiCampo(el, f); });
            const res = await callApi('impostazioni:setMultiple', payload);
            if (!res || !res.success) throw new Error((res && res.error) || 'Salvataggio fallito');
            toast('Impostazioni salvate con successo', 'success');
        } catch (e) {
            toast(e.message || 'Errore durante il salvataggio', 'error');
        }
    });

    await load();
}
