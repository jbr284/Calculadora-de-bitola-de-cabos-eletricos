document.addEventListener('DOMContentLoaded', () => {
    
    // --- ESTADO E PERSISTÊNCIA ---
    function loadSavedState() {
        document.querySelectorAll('.save-state').forEach(input => {
            const saved = localStorage.getItem(input.id);
            if (saved) input.value = saved;
        });
    }

    function setupPersistence() {
        document.querySelectorAll('.save-state').forEach(input => {
            input.addEventListener('change', (e) => {
                localStorage.setItem(e.target.id, e.target.value);
            });
        });
    }

    // --- LÓGICA DE UI ---
    document.querySelectorAll('.tab-link').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
            document.getElementById(e.currentTarget.dataset.tab).classList.add('active');
            e.currentTarget.classList.add('active');
            document.getElementById('results-panel').style.display = 'none';
            document.getElementById('error-panel').style.display = 'none';
        });
    });
    document.querySelector('.tab-link[data-tab="Geral"]').click(); 

    // Aviso de Tensão (Pro)
    const voltSelect = document.getElementById('voltage-pro');
    const typeSelect = document.getElementById('circuit-type-pro');
    const warnBox = document.getElementById('voltage-warning');

    function checkVoltageSanity() {
        if (typeSelect.value === 'tri' && voltSelect.value === '127') {
            warnBox.style.display = 'block';
        } else {
            warnBox.style.display = 'none';
        }
    }
    voltSelect.addEventListener('change', checkVoltageSanity);
    typeSelect.addEventListener('change', checkVoltageSanity);

    // Botão de Imprimir
    document.getElementById('btn-print').addEventListener('click', () => {
        document.getElementById('print-date').innerText = new Date().toLocaleDateString();
        window.print();
    });

    // --- MOTOR DE CÁLCULO ---
    
    function displayError(msg) {
        const p = document.getElementById('error-panel');
        p.innerText = msg;
        p.style.display = 'block';
        document.getElementById('results-panel').style.display = 'none';
    }

    function calculate(isPro) {
        document.getElementById('error-panel').style.display = 'none';

        let power, pf, voltage, phases, length, conductor, insulation, method, temp, grouping;

        if (isPro) {
            power = parseFloat(document.getElementById('power-pro').value);
            pf = parseFloat(document.getElementById('power-factor-pro').value);
            voltage = parseInt(document.getElementById('voltage-pro').value);
            phases = document.getElementById('circuit-type-pro').value; 
            length = parseFloat(document.getElementById('length-pro').value);
            conductor = document.getElementById('conductor-material-pro').value;
            insulation = document.getElementById('insulation-pro').value;
            method = document.getElementById('install-method-pro').value;
            temp = document.getElementById('temperature-pro').value;
            grouping = document.getElementById('grouping-pro').value;
        } else {
            // === MODO RÁPIDO (Atualizado) ===
            let rawPower = parseFloat(document.getElementById('power-geral').value);
            const unit = document.querySelector('input[name="power_unit_geral"]:checked').value;
            
            // Conversão de Unidade (kW -> W)
            if (unit === 'kW') {
                power = rawPower * 1000;
            } else {
                power = rawPower;
            }

            voltage = parseInt(document.getElementById('voltage-geral').value);
            phases = document.getElementById('phases-geral').value; // 'mono' ou 'tri'
            length = parseFloat(document.getElementById('length-geral').value);
            
            // Padrões do modo rápido
            pf = 0.95; // Fator de potência médio seguro
            conductor = 'cobre';
            insulation = 'PVC';
            method = 'B1';
            temp = '30';
            grouping = '1';
        }

        // Validações
        if (!power || power <= 0) return displayError("Informe uma potência válida.");
        if (!length || length <= 0) return displayError("Informe a distância.");

        // 1. CÁLCULO DA CORRENTE (Ib)
        let ib = 0;
        // Se for Trifásico (tanto no Pro quanto no Rápido) usa raiz de 3
        if (phases === 'tri') {
            ib = power / (voltage * 1.732 * pf);
        } else {
            // Monofásico ou Bifásico
            ib = power / (voltage * pf);
        }

        // 2. DISJUNTOR (In)
        const inDisjuntor = DADOS.disjuntoresComerciais.find(d => d >= ib);
        if (!inDisjuntor) return displayError(`Corrente calculada (${ib.toFixed(1)}A) muito alta para os disjuntores cadastrados.`);

        // 3. CAPACIDADE DO CABO (Iz)
        let tabelaAlvo;
        if (conductor === 'cobre') {
            tabelaAlvo = (insulation === 'PVC') ? DADOS.tabelaCobrePVC : DADOS.tabelaCobreHEPR;
        } else {
            tabelaAlvo = (insulation === 'PVC') ? DADOS.tabelaAluminioPVC : DADOS.tabelaCobreHEPR; 
        }

        let fct, fca;
        if (insulation === 'PVC') {
            fct = DADOS.fatoresCorrecaoTempPVC[temp] || 1.0;
        } else {
            fct = DADOS.fatoresCorrecaoTempHEPR[temp] || 1.0;
        }
        fca = DADOS.fatoresCorrecaoAgrup[grouping] || 1.0;
        const fatorTotal = fct * fca;

        let caboPorCorrente = null;
        for (let bitola of DADOS.cabosComerciais) {
            let capacidadeBase = tabelaAlvo[method][bitola.toString()];
            if (!capacidadeBase) continue;
            let capacidadeReal = capacidadeBase * fatorTotal;
            if (capacidadeReal >= inDisjuntor) {
                caboPorCorrente = bitola;
                break;
            }
        }
        if (!caboPorCorrente) return displayError("Nenhum cabo suporta esta corrente.");

        // 4. QUEDA DE TENSÃO
        let keyRho = `${conductor}_${insulation}`;
        let rho = DADOS.RESISTIVIDADE[keyRho] || 0.0224;
        let caboFinal = caboPorCorrente;
        let quedaPercent = 0;
        let encontrou = false;

        let indexInicio = DADOS.cabosComerciais.indexOf(caboPorCorrente);
        for (let i = indexInicio; i < DADOS.cabosComerciais.length; i++) {
            let s = DADOS.cabosComerciais[i];
            let k = (phases === 'tri') ? 173.2 : 200; // k=173.2 para trifásico, 200 para mono
            let queda = (k * rho * length * ib) / (s * voltage);
            
            if (queda <= DADOS.QUEDA_TENSAO_MAXIMA) {
                caboFinal = s;
                quedaPercent = queda;
                encontrou = true;
                break;
            }
        }

        if (!encontrou) return displayError("Distância muito longa. Queda de tensão excessiva.");

        // --- RENDERIZA RESULTADOS ---
        document.getElementById('breaker-result').innerText = inDisjuntor + " A";
        document.getElementById('cable-result').innerText = caboFinal + " mm²";
        
        const log = document.getElementById('calculation-log');
        log.innerHTML = `
            <li>Potência: <span>${(power/1000).toFixed(1)} kW</span></li>
            <li>Sistema: <span>${phases === 'tri' ? 'Trifásico' : 'Monofásico'} (${voltage}V)</span></li>
            <li>Corrente (Ib): <span>${ib.toFixed(2)} A</span></li>
            <li>Fator Total (Temp/Agrup): <span>${fatorTotal.toFixed(2)}</span></li>
            <li>Queda de Tensão: <span>${quedaPercent.toFixed(2)}%</span></li>
        `;

        const tbody = document.getElementById('context-table-body');
        tbody.innerHTML = '';
        
        DADOS.cabosComerciais.forEach(bitola => {
            let capBase = tabelaAlvo[method][bitola.toString()];
            if(!capBase) return;
            let capReal = capBase * fatorTotal;
            let status = '';
            let rowClass = '';

            if (bitola === caboFinal) {
                status = '✅ IDEAL';
                rowClass = 'recommended-row';
            } else if (bitola < caboFinal) {
                if (capReal < inDisjuntor) status = '⚠️ Fraco (Corrente)';
                else status = '⚠️ Fraco (Queda Tensão)';
            } else {
                status = '🆗 Superdimensionado';
            }

            if (Math.abs(DADOS.cabosComerciais.indexOf(bitola) - DADOS.cabosComerciais.indexOf(caboFinal)) <= 2 || bitola === caboFinal) {
                tbody.innerHTML += `
                    <tr class="${rowClass}">
                        <td>${bitola} mm²</td>
                        <td>${capReal.toFixed(1)} A</td>
                        <td>${status}</td>
                    </tr>
                `;
            }
        });

        document.getElementById('results-panel').style.display = 'block';
        document.getElementById('results-panel').scrollIntoView({ behavior: 'smooth' });
    }

    document.getElementById('calculate-btn-geral').addEventListener('click', () => calculate(false));
    document.getElementById('calculate-btn-pro').addEventListener('click', () => calculate(true));

    document.getElementById('reset-btn-pro').addEventListener('click', () => {
        document.getElementById('form-pro').reset();
        localStorage.clear();
    });

    loadSavedState();
    setupPersistence();
});
