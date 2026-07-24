import { toast } from '../js/utils.js';
import { heroHtml, campoHtml, leggiCampo } from '../shared/ui_kit.js';
import { callApi } from '../shared/api.js';

const AZIENDA_FIELDS = [
    { key: 'ragione_sociale_azienda', label: 'Ragione Sociale', icon: 'business', required: true, full: true },
    { key: 'piva_azienda', label: 'Partita IVA', icon: 'tag' },
    { key: 'codice_fiscale_azienda', label: 'Codice Fiscale', icon: 'badge' },
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

export async function render(el) {
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
                            <h4 class="ak-section-title">Dati Azienda (Cedente/Prestatore)</h4>
                        </div>
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
    const aziendaBox = el.querySelector('#imp-azienda-fields');
    const fiscaliBox = el.querySelector('#imp-fiscali-fields');
    aziendaBox.innerHTML = AZIENDA_FIELDS.map(f => campoHtml(f, '')).join('');
    fiscaliBox.innerHTML = FISCALI_FIELDS.map(f => campoHtml(f, '')).join('');

    const allFields = [...AZIENDA_FIELDS, ...FISCALI_FIELDS];

    async function load() {
        const res = await callApi('impostazioni:getAll');
        if (!res || !res.success) return;
        allFields.forEach(f => {
            const input = el.querySelector(`#crud-field-${f.key}`);
            if (!input) return;
            const value = res.data[f.key];
            if (f.type === 'checkbox') input.checked = value === 'true' || value === true;
            else input.value = value !== undefined ? value : '';
        });
    }

    el.querySelector('#imp-btn-save').addEventListener('click', async () => {
        try {
            const payload = {};
            allFields.forEach(f => { payload[f.key] = leggiCampo(el, f); });
            const res = await callApi('impostazioni:setMultiple', payload);
            if (!res || !res.success) throw new Error((res && res.error) || 'Salvataggio fallito');
            toast('Impostazioni salvate con successo', 'success');
        } catch (e) {
            toast(e.message || 'Errore durante il salvataggio', 'error');
        }
    });

    await load();
}
