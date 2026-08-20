import { formatPatientDemographics } from '../shared/formatters.js';

export function createPatientSearchPicker({ pazienti = [], initialPazienteId = null, onSelect, containerId = 'ds-patient-picker-container' }) {
    try {
        let selectedPaziente = pazienti.find(p => p.id === initialPazienteId) || null;
        let filteredPazienti = pazienti;

        const wrapper = document.createElement('div');
        wrapper.id = containerId;
        wrapper.className = 'ds-picker-wrapper';

        function render() {
            wrapper.innerHTML = `
                <div class="ds-form-field">
                    <label>Paziente Selezionato *</label>
                    <div style="position:relative; width:100%;">
                        <div class="ds-picker-input-wrap">
                            <span class="material-symbols-rounded ds-picker-icon">search</span>
                            <input type="text" id="ds-picker-search-input" class="ds-input ds-picker-input" placeholder="Cerca tra oltre 1.000 pazienti per cognome, nome, CF..." autocomplete="off">
                            ${selectedPaziente ? `<button type="button" class="ds-picker-clear-btn" id="ds-picker-clear"><span class="material-symbols-rounded">close</span></button>` : ''}
                        </div>
                        <div id="ds-picker-dropdown" class="ds-picker-dropdown" style="display:none;"></div>
                    </div>
                    ${selectedPaziente ? `
                        <div class="ds-picker-selected-card">
                            <div style="display:flex; align-items:center; gap:0.6rem;">
                                <span class="material-symbols-rounded" style="color:var(--ds-teal); font-size:1.6rem;">person</span>
                                <div>
                                    <div style="font-weight:800; font-size:0.95rem; color:var(--md-on-surface);">${selectedPaziente.cognome} ${selectedPaziente.nome}</div>
                                    <div style="font-size:0.8rem; color:var(--md-on-surface-variant); font-weight:700;">
                                        ${formatPatientDemographics(selectedPaziente) ? `<span class="ds-badge ds-badge-teal">${formatPatientDemographics(selectedPaziente)}</span> ` : ''}
                                        ${selectedPaziente.codice_fiscale ? `CF: <code>${selectedPaziente.codice_fiscale}</code> • ` : ''}
                                        Tel: ${selectedPaziente.telefono || '-'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ` : '<input type="hidden" name="paziente_id" required value="">'}
                </div>
            `;

            const input = wrapper.querySelector('#ds-picker-search-input');
            const dropdown = wrapper.querySelector('#ds-picker-dropdown');
            const clearBtn = wrapper.querySelector('#ds-picker-clear');

            if (selectedPaziente) {
                input.value = `${selectedPaziente.cognome} ${selectedPaziente.nome}`;
            }

            if (clearBtn) {
                clearBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectedPaziente = null;
                    if (typeof onSelect === 'function') onSelect(null);
                    render();
                    wrapper.querySelector('#ds-picker-search-input').focus();
                });
            }

            input.addEventListener('focus', () => {
                showDropdown('');
            });

            input.addEventListener('input', (e) => {
                showDropdown(e.target.value);
            });

            document.addEventListener('click', (e) => {
                if (!wrapper.contains(e.target)) {
                    if (dropdown) dropdown.style.display = 'none';
                }
            });

            function showDropdown(term = '') {
                const q = String(term).trim().toLowerCase();
                if (!q) {
                    filteredPazienti = pazienti.slice(0, 50);
                } else {
                    filteredPazienti = pazienti.filter(p => {
                        const full = `${p.cognome || ''} ${p.nome || ''} ${p.codice_fiscale || ''} ${p.telefono || ''}`.toLowerCase();
                        return full.includes(q);
                    }).slice(0, 50);
                }

                dropdown.style.display = 'block';
                if (filteredPazienti.length === 0) {
                    dropdown.innerHTML = '<div style="padding:0.8rem; text-align:center; color:var(--md-on-surface-variant); font-size:0.85rem;">Nessun paziente trovato.</div>';
                    return;
                }

                dropdown.innerHTML = filteredPazienti.map(p => {
                    const demo = formatPatientDemographics(p);
                    return `
                        <div class="ds-picker-item" data-id="${p.id}">
                            <div style="font-weight:800; font-size:0.88rem; color:var(--md-on-surface);">${p.cognome} ${p.nome}</div>
                            <div style="font-size:0.76rem; color:var(--md-on-surface-variant); margin-top:0.15rem; display:flex; gap:0.4rem; align-items:center; flex-wrap:wrap;">
                                ${demo ? `<span class="ds-badge ds-badge-teal" style="font-size:0.7rem;">${demo}</span>` : ''}
                                ${p.codice_fiscale ? `<span>CF: ${p.codice_fiscale}</span>` : ''}
                                ${p.telefono ? `<span>Tel: ${p.telefono}</span>` : ''}
                            </div>
                        </div>
                    `;
                }).join('');

                dropdown.querySelectorAll('.ds-picker-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const id = item.dataset.id;
                        selectedPaziente = pazienti.find(p => p.id === id) || null;
                        dropdown.style.display = 'none';
                        if (typeof onSelect === 'function') onSelect(selectedPaziente);
                        render();
                    });
                });
            }
        }

        render();

        return {
            element: wrapper,
            getSelectedPazienteId: () => selectedPaziente ? selectedPaziente.id : null,
            getSelectedPaziente: () => selectedPaziente
        };
    } catch (e) {
        const fallback = document.createElement('div');
        return { element: fallback, getSelectedPazienteId: () => null, getSelectedPaziente: () => null };
    }
}
