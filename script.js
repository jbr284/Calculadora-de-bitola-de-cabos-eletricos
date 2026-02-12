document.addEventListener('DOMContentLoaded', () => {
    
    const CONVERSAO_POTENCIA = {
        'W': 1, 'kW': 1000, 'cv': 735.5, 'hp': 745.7
    };

    // --- CONFIGURAÇÃO DOS TIPOS DE CIRCUITO ---
    const CIRCUIT_TYPES = {
        'motor': {
            fp: 0.85,
            desc: "Motores Elétricos, Bombas, Compressores, Máquinas. (FP: 0.85 | Cabo PP)",
            usePP: true,
            styleClass: 'hint-motor'
        },
        'resistivo': {
            fp: 1.0,
            desc: "Chuveiros, Fornos, Aquecedores, AirFryer. (FP: 1.0 | Cabo Flexível)",
            usePP: false, // Pode usar PP, mas o padrão fixo é flexível
            styleClass: 'hint-resistivo'
        },
        'geral': {
            fp: 0.95,
            desc: "Tomadas comuns, Eletrodomésticos, Secador, TV. (FP: 0.95 | Cabo Flexível)",
            usePP: false,
            styleClass: 'hint-geral'
        },
        'eletronico': {
            fp: 0.90,
            desc: "Computadores, Servidores, LED, Automação. (FP: 0.90 | Cabo Flexível)",
            usePP: false,
            styleClass: 'hint-eletronico'
        }
    };

    // --- INTERATIVIDADE DO SELECT INTELIGENTE ---
    const typeSelect = document.getElementById('circuit-type-geral');
    const hintBox = document.getElementById('circuit-hint');

    typeSelect.addEventListener('change', () => {
        const type = typeSelect.value;
        const config = CIRCUIT_TYPES[type];
        
        hintBox.innerText = "💡 " + config.desc;
        
        // Remove classes antigas e adiciona a nova para cor
        hintBox.classList.remove('hint-motor', 'hint-resistivo', 'hint-geral', 'hint-eletronico');
        hintBox.classList.add(config.styleClass);
    });

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

    // --- UI ---
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

    // Aviso de Tensão
    const voltSelect = document.getElementById('voltage-pro');
    const typeSelectPro = document.getElementById('circuit-type-pro');
    const warnBox = document.getElementById('voltage-warning');

    function checkVoltageSanity() {
        if (typeSelectPro.value === 'tri' && voltSelect.value === '127') {
            warnBox.style.display = 'block';
        } else {
            warnBox.style.display = 'none';
        }
    }
    voltSelect.addEventListener('change', checkVoltageSanity);
    typeSelectPro.addEventListener('change', checkVoltageSanity);

    document.getElementById('btn-print').addEventListener('click', () => {
        document.getElementById('print-date').innerText = new Date().toLocaleDateString();
        window.print();
    });

    // --- CÁLCULO ---
    function displayError(msg) {
        const p = document.getElementById('error-panel');
        p.innerText = msg;
        p.style.display = 'block';
        document.getElementById('results-panel').style.display = 'none';
    }

    function calculate(isPro) {
        document.getElementById('error-panel').style.display = 'none';

        let rawPower, unit, powerInWatts, pf, voltage, phases, length, conductor, insulation, method, temp, grouping;
        let cableTypeName = "Cabo Flexível (750V)"; // Padrão

        if (isPro) {
            // Entradas Pro
            rawPower = parseFloat(document.getElementById('power-pro').value);
            unit = document.getElementById('power-unit-pro').value;
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
            // Entradas Geral (Inteligente)
            const circuitType = document.getElementById('circuit-type-geral').value;
            const config = CIRCUIT_TYPES[circuitType];

            rawPower = parseFloat(document.getElementById('power-geral').value);
            unit = document.getElementById('power-unit-geral').value;
            voltage = parseInt(document.getElementById('voltage-geral').value);
            phases = document.getElementById('phases-geral').value;
            length = parseFloat(document.getElementById('length-geral').value);
            
            // Padrões Automáticos
            pf = config.fp; 
            conductor = 'cobre';
            insulation = 'PVC';
            method = 'B1'; // Eletroduto embutido (padrão seguro)
            temp = '30';
            grouping = '1';

            // Lógica do Cabo PP
            if (config.usePP) {
                let vias = 3; // Padrão Mono/Bifásico (F+N+T ou F+F+T)
                if (phases === 'tri') vias = 4; // Trifásico (3F+T)
                cableTypeName = `Cabo PP ${vias} Vias`;
            }
        }

        // Validação
        if (!rawPower || rawPower <= 0) return displayError("Informe uma potência válida.");
        if (!length || length <= 0) return displayError("Informe a distância.");

        powerInWatts = rawPower * (CONVERSAO_POTENCIA[unit] || 1);

        // 1. CORRENTE (Ib)
        let ib = 0;
        if (phases === 'tri') {
            ib = powerInWatts / (voltage * 1.732 * pf);
        } else {
            ib = powerInWatts / (voltage * pf);
        }

        // 2. DISJUNTOR (In)
        const inDisjuntor = DADOS.disjuntoresComerciais.find(d => d >= ib);
        if (!inDisjuntor) return displayError(`Corrente (${ib.toFixed(1)}A) muito alta.`);

        // 3. CAPACIDADE DO CABO (Iz)
        let tabelaAlvo = (conductor === 'cobre') 
            ? ((insulation === 'PVC') ? DADOS.tabelaCobrePVC : DADOS.tabelaCobreHEPR)
            : ((insulation === 'PVC') ? DADOS.tabelaAluminioPVC : DADOS.tabelaCobreHEPR); 

        let fct = (insulation === 'PVC') ? (DADOS.fatoresCorrecaoTempPVC[temp] || 1.0) : (DADOS.fatoresCorrecaoTempHEPR[temp] || 1.0);
        let fca = DADOS.fatoresCorrecaoAgrup[grouping] || 1.0;
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
            let k = (phases === 'tri') ? 173.2 : 200; 
            let queda = (k * rho * length * ib) / (s * voltage);
            
            if (queda <= DADOS.QUEDA_TENSAO_MAXIMA) {
                caboFinal = s;
                quedaPercent = queda;
                encontrou = true;
                break;
            }
        }

        if (!encontrou) return displayError("Queda de tensão excessiva.");

        // --- EXIBIÇÃO ---
        document.getElementById('breaker-result').innerText = inDisjuntor + " A";
        document.getElementById('cable-result').innerText = caboFinal + " mm²";
        
        // Exibe o tipo de cabo calculado (PP ou Flexível)
        const cableDetailDiv = document.getElementById('cable-type-detail');
        if (isPro) {
            cableDetailDiv.innerText = `${conductor === 'cobre' ? 'Cobre' : 'Alumínio'} - ${insulation}`;
        } else {
            cableDetailDiv.innerText = cableTypeName;
        }
        
        const log = document.getElementById('calculation-log');
        log.innerHTML = `
            <li>Carga: <span>${rawPower} ${unit}</span></li>
            <li>Corrente (Ib): <span>${ib.toFixed(2)} A</span></li>
            <li>Fator Potência: <span>${pf}</span></li>
            <li>Disjuntor: <span>${inDisjuntor} A</span></li>
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
