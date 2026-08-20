import { formatPatientDemographics } from '../shared/formatters.js';

export function createPatientSearchPicker(targetOrOptions = {}, maybeOptions = {}) {
    try {
        let options = {};
        let mountTarget = null;
        if (targetOrOptions instanceof HTMLElement) {
            mountTarget = targetOrOptions;
            options = maybeOptions || {};
        } else {
            options = targetOrOptions || {};
        }

        const {
            pazienti = [],
            initialPazienteId = null,
            initialPatientId = null,
            onSelect,
            containerId = 'ds-patient-picker-container',
            label = 'Paziente Selezionato *'
        } = options;

        const initialId = initialPazienteId || initialPatientId;
        let selectedPaziente = pazienti.find(p => p.id === initialId) || null;
        let filteredPazienti = pazienti;

        const wrapper = document.createElement('div');
        wrapper.id = containerId;
        wrapper.className = 'ds-form-field ds-picker-wrapper';
        wrapper.style.gridColumn = '1 / -1';

        function render() {
            wrapper.innerHTML = `
                <label>${label}</label>
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
        }

        function showDropdown(query = '') {
            const dropdown = wrapper.querySelector('#ds-picker-dropdown');
            if (!dropdown) return;

            const q = query.trim().toLowerCase();
            if (!q) {
                filteredPazienti = pazienti.slice(0, 15);
            } else {
                const tokens = q.split(/\s+/).filter(Boolean);
                filteredPazienti = pazienti.filter(p => {
                    const full = `${p.cognome || ''} ${p.nome || ''} ${p.nome || ''} ${p.cognome || ''} ${p.codice_fiscale || ''} ${p.telefono || ''}`.toLowerCase();
                    return tokens.every(t => full.includes(t));
                }).slice(0, 25);
            }

            if (filteredPazienti.length === 0) {
                dropdown.innerHTML = `<div style="padding:0.8rem; text-align:center; color:var(--md-on-surface-variant); font-size:0.85rem;">Nessun paziente trovato con questi filtri</div>`;
                dropdown.style.display = 'block';
                return;
            }

            dropdown.innerHTML = filteredPazienti.map(p => {
                const demo = formatPatientDemographics(p);
                return `
                    <div class="ds-picker-item" data-id="${p.id}">
                        <div style="font-weight:700; font-size:0.9rem; color:var(--md-on-surface);">${p.cognome} ${p.nome}</div>
                        <div style="font-size:0.75rem; color:var(--md-on-surface-variant);">
                            ${demo ? `<span>${demo}</span> • ` : ''}
                            ${p.codice_fiscale ? `<span>CF: ${p.codice_fiscale}</span> • ` : ''}
                            <span>Tel: ${p.telefono || '-'}</span>
                        </div>
                    </div>
                `;
            }).join('');

            dropdown.querySelectorAll('.ds-picker-item').forEach(item => {
                item.addEventListener('click', () => {
                    const id = item.dataset.id;
                    selectedPaziente = pazienti.find(p => p.id === id) || null;
                    if (typeof onSelect === 'function') onSelect(selectedPaziente);
                    render();
                });
            });

            dropdown.style.display = 'block';
        }

        render();

        if (mountTarget) {
            mountTarget.innerHTML = '';
            mountTarget.appendChild(wrapper);
        }

        return {
            element: wrapper,
            getSelectedPaziente: () => selectedPaziente,
            getSelectedPazienteId: () => (selectedPaziente ? selectedPaziente.id : null),
            setPaziente: (paz) => {
                selectedPaziente = paz;
                render();
            }
        };
    } catch (e) {
        return {
            element: document.createElement('div'),
            getSelectedPaziente: () => null,
            getSelectedPazienteId: () => null,
            setPaziente: () => {}
        };
    }
}
