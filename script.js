document.addEventListener('DOMContentLoaded', () => {
    // --- Seletores de Elementos Globais ---
    const selectors = {
        geral: { form: document.getElementById('form-geral'), btnCalc: 'calculate-btn-geral', btnReset: 'reset-btn-geral' },
        pro: { form: document.getElementById('form-pro'), btnCalc: 'calculate-btn-pro', btnReset: 'reset-btn-pro' },
        resultsPanel: document.getElementById('results-panel'),
        errorPanel: document.getElementById('error-panel'),
        breakerResult: document.getElementById('breaker-result'),
        cableResult: document.getElementById('cable-result'),
        justification: document.getElementById('justification'),
        contextTableBody: document.getElementById('context-table-body'),
        resultsFooter: document.getElementById('results-footer')
    };

    // --- Lógica das Abas ---
    document.querySelectorAll('.tab-link').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.querySelectorAll('.tab-link').forEach(link => link.classList.remove('active'));
            const tabName = e.currentTarget.dataset.tab;
            document.getElementById(tabName).classList.add('active');
            e.currentTarget.classList.add('active');
            hidePanels();
        });
    });
    document.querySelector('.tab-link.active').classList.remove('active'); // Remove a classe do HTML inicial
    document.querySelector('.tab-link[data-tab="Geral"]').click(); // Clica na aba Geral para inicializar

    // --- Lógica dos seletores de modo (Potência/Corrente) ---
    function setupLoadTypeToggle(tabPrefix) {
        document.querySelectorAll(`input[name="load_type_${tabPrefix}"]`).forEach(radio => {
            radio.addEventListener('change', (e) => {
                const showPower = e.target.value === 'power';
                document.getElementById(`power-inputs-${tabPrefix}`).style.display = showPower ? 'block' : 'none';
                document.getElementById(`current-inputs-${tabPrefix}`).style.display = showPower ? 'none' : 'block';
            });
        });
    }
    setupLoadTypeToggle('geral');
    setupLoadTypeToggle('pro');

    // --- Funções de UI ---
    function hidePanels() {
        selectors.resultsPanel.style.display = 'none';
        selectors.errorPanel.style.display = 'none';
    }

    function displayError(message) {
        hidePanels();
        selectors.errorPanel.textContent = message;
        selectors.errorPanel.style.display = 'block';
    }

    function displayResults(result) {
        hidePanels();
        const { recommendedBreaker, finalCableSize, designCurrent, finalVoltageDrop, fct, fca, temperature, groupedCircuits, installMethod, finalBaseCapacity, conductor } = result;

        selectors.breakerResult.textContent = `${recommendedBreaker} A`;
        selectors.cableResult.textContent = `${finalCableSize} mm²`;

        const finalCableCapacity = finalBaseCapacity * fct * fca;
        let justificationText = `Corrente de Projeto: ${designCurrent.toFixed(2)}A. Disjuntor de ${recommendedBreaker}A protege o circuito (In ≥ Ib). O cabo de ${conductor} de ${finalCableSize}mm² tem capacidade de ${finalCableCapacity.toFixed(2)}A (Iz) nestas condições, sendo protegido pelo disjuntor (In ≤ Iz). Queda de Tensão: ${finalVoltageDrop.toFixed(2)}%.`;
        selectors.justification.textContent = justificationText;

        const tableBody = selectors.contextTableBody;
        tableBody.innerHTML = '';
        const capacityTable = conductor === 'cobre' ? DADOS.tabelaCapacidadeCabosCobre : DADOS.tabelaCapacidadeCabosAluminio;
        DADOS.cabosComerciais.forEach(size => {
            const baseCapacity = capacityTable[installMethod]?.[size.toString()];
            if (baseCapacity === undefined && conductor === 'aluminio' && size < 16) return;

            const correctedCapacity = baseCapacity ? (baseCapacity * fct * fca).toFixed(2) : 'N/A';
            const row = document.createElement('tr');
            if (size === finalCableSize) row.classList.add('recommended-row');
            row.innerHTML = `<td>${size} mm²</td><td>${correctedCapacity} A</td><td>${size === finalCableSize ? '✅' : ''}</td>`;
            tableBody.appendChild(row);
        });
        
        selectors.resultsFooter.textContent = `*Iz corrigida para ${temperature}°C, ${groupedCircuits} circuito(s), método ${installMethod}.`;
        selectors.resultsPanel.style.display = 'block';
    }

    const getNumericValue = (elementId) => parseFloat(document.getElementById(elementId).value.replace(',', '.')) || 0;

    // --- Motor de Cálculo ---
    function performCalculation(params) {
        const { power, pf, current, length, voltage, circuitType, installMethod, temperature, groupedCircuits, conductor } = params;

        if (length <= 0) return displayError("O comprimento do cabo deve ser maior que zero.");
        
        const resistivity = conductor === 'cobre' ? DADOS.RESISTIVIDADE_COBRE : DADOS.RESISTIVIDADE_ALUMINIO;
        const capacityTable = conductor === 'cobre' ? DADOS.tabelaCapacidadeCabosCobre : DADOS.tabelaCapacidadeCabosAluminio;

        let designCurrent;
        if (power !== undefined) {
          if (power <= 0 || pf <= 0) return displayError("A potência e o fator de potência devem ser maiores que zero.");
          designCurrent = (circuitType === 'mono') ? (power / (voltage * pf)) : (power / (voltage * pf * Math.sqrt(3)));
        } else {
          if (current <= 0) return displayError("A corrente deve ser maior que zero.");
          designCurrent = current;
        }

        const recommendedBreaker = DADOS.disjuntoresComerciais.find(b => b >= designCurrent);
        if (!recommendedBreaker) return displayError("Nenhuma opção de disjuntor suporta a corrente de projeto calculada.");

        const fct = DADOS.fatoresCorrecaoTemp[temperature.toString()] || 1.0;
        const fca = DADOS.fatoresCorrecaoAgrup[groupedCircuits.toString()] || 1.0;

        const cableForBreaker = DADOS.cabosComerciais.find(size => {
            const baseCapacity = capacityTable[installMethod]?.[size.toString()];
            return baseCapacity && (baseCapacity * fct * fca) >= recommendedBreaker;
        });
        if (!cableForBreaker) return displayError(`Nenhum cabo de ${conductor} suporta o disjuntor de ${recommendedBreaker}A com os fatores de correção aplicados.`);
        
        let cableForVoltageDrop = null;
        for (const size of DADOS.cabosComerciais) {
            const voltageDrop = (circuitType === 'mono') ? (200 * resistivity * length * designCurrent) / (size * voltage) : (173.2 * resistivity * length * designCurrent) / (size * voltage);
            if (voltageDrop <= DADOS.QUEDA_TENSAO_MAXIMA) {
                cableForVoltageDrop = size;
                break;
            }
        }
        if (!cableForVoltageDrop) return displayError("Nenhum cabo atende ao critério de queda de tensão. O comprimento pode ser excessivo.");

        const finalCableSize = Math.max(cableForBreaker, cableForVoltageDrop);
        const finalBaseCapacity = capacityTable[installMethod]?.[finalCableSize.toString()];
        if(!finalBaseCapacity) return displayError(`Seção de cabo de ${finalCableSize}mm² não encontrada para o método de instalação selecionado.`);

        const finalVoltageDrop = (circuitType === 'mono') ? (200 * resistivity * length * designCurrent) / (finalCableSize * voltage) : (173.2 * resistivity * length * designCurrent) / (finalCableSize * voltage);
        
        displayResults({ recommendedBreaker, finalCableSize, designCurrent, finalVoltageDrop, fct, fca, temperature, groupedCircuits, installMethod, finalBaseCapacity, conductor });
    }

    // --- Event Listeners ---
    document.getElementById(selectors.geral.btnCalc).addEventListener('click', () => {
        const loadType = document.querySelector('input[name="load_type_geral"]:checked').value;
        const params = {
            voltage: parseInt(document.getElementById('voltage-geral').value),
            circuitType: document.getElementById('circuit-type-geral').value,
            length: getNumericValue('length-geral'),
            installMethod: 'B1', temperature: 30, groupedCircuits: 1, conductor: 'cobre', pf: 0.92, 
        };
        if (loadType === 'power') {
            let power = getNumericValue('power-geral');
            if (document.querySelector('input[name="power_unit_geral"]:checked').value === 'kW') power *= 1000;
            params.power = power;
        } else {
            params.current = getNumericValue('current-geral');
        }
        performCalculation(params);
    });
    document.getElementById(selectors.geral.btnReset).addEventListener('click', () => { selectors.geral.form.reset(); hidePanels(); });

    document.getElementById(selectors.pro.btnCalc).addEventListener('click', () => {
        const loadType = document.querySelector('input[name="load_type_pro"]:checked').value;
        const params = {
            voltage: parseInt(document.getElementById('voltage-pro').value),
            circuitType: document.getElementById('circuit-type-pro').value,
            length: getNumericValue('length-pro'),
            installMethod: document.getElementById('install-method-pro').value,
            temperature: parseInt(document.getElementById('temperature-pro').value),
            groupedCircuits: parseInt(document.getElementById('grouping-pro').value),
            conductor: document.querySelector('input[name="conductor_material"]:checked').value
        };
        if (loadType === 'power') {
            let power = getNumericValue('power-pro');
            if (document.querySelector('input[name="power_unit_pro"]:checked').value === 'kW') power *= 1000;
            params.power = power;
            params.pf = parseFloat(document.getElementById('power-factor-pro').value);
        } else {
            params.current = getNumericValue('current-pro');
        }
        performCalculation(params);
    });
    document.getElementById(selectors.pro.btnReset).addEventListener('click', () => { selectors.pro.form.reset(); hidePanels(); });
});