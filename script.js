document.addEventListener('DOMContentLoaded', () => {
    
    // --- ESTADO E PERSISTÊNCIA ---
    // Carrega dados salvos quando abre o app
    function loadSavedState() {
        document.querySelectorAll('.save-state').forEach(input => {
            const saved = localStorage.getItem(input.id);
            if (saved) input.value = saved;
        });
    }

    // Salva dados sempre que o usuário muda algo
    function setupPersistence() {
        document.querySelectorAll('.save-state').forEach(input => {
            input.addEventListener('change', (e) => {
                localStorage.setItem(e.target.id, e.target.value);
            });
        });
    }

    // --- LÓGICA DE UI ---
    // Alternar abas
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
    document.querySelector('.tab-link[data-tab="Geral"]').click(); // Abre na Geral por padrão

    // Validação de Tensão Trifásica
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

        // Coleta de dados
        let power, pf, voltage, phases, length, conductor, insulation, method, temp, grouping;

        if (isPro) {
            power = parseFloat(document.getElementById('power-pro').value);
            pf = parseFloat(document.getElementById('power-factor-pro').value);
            voltage = parseInt(document.getElementById('voltage-pro').value);
            phases = document.getElementById('circuit-type-pro').value; // mono, bifasico, tri
            length = parseFloat(document.getElementById('length-pro').value);
            conductor = document.getElementById('conductor-material-pro').value;
            insulation = document.getElementById('insulation-pro').value;
            method = document.getElementById('install-method-pro').value;
            temp = document.getElementById('temperature-pro').value;
            grouping = document.getElementById('grouping-pro').value;
        } else {
            // Modo Geral Simplificado
            const type = document.querySelector('input[name="load_type_geral"]:checked').value;
            voltage = parseInt(document.getElementById('voltage-geral').value);
            phases = 'mono'; // Assume monofásico/bifásico simples
            length = parseFloat(document.getElementById('length-geral').value);
            conductor = 'cobre';
            insulation = 'PVC';
            method = 'B1';
            temp = '30';
            grouping = '1';
            
            if (type === 'power') {
                power = parseFloat(document.getElementById('power-geral').value);
                pf = 0.95; // Padrão resistivo/misto
            } else {
                // Se digitou corrente direto
                let currentInput = parseFloat(document.getElementById('current-geral').value);
                if (!currentInput) return displayError("Digite a corrente.");
                power = currentInput * voltage; // Conversão fictícia para usar a lógica unificada
                pf = 1.0;
            }
        }

        // Validações Básicas
        if (!power || power <= 0) return displayError("Informe uma potência válida.");
        if (!length || length <= 0) return displayError("Informe a distância.");

        // 1. CÁLCULO DA CORRENTE DE PROJETO (Ib)
        let ib = 0;
        // Raiz de 3 = 1.732
        if (phases === 'tri') {
            ib = power / (voltage * 1.732 * pf);
        } else {
            // Monofásico ou Bifásico (Carga entre fases 220V é tratada como mono no calculo de corrente Ib = P/U)
            ib = power / (voltage * pf);
        }

        // 2. DEFINIÇÃO DO DISJUNTOR (In)
        // O disjuntor deve ser maior que Ib
        const inDisjuntor = DADOS.disjuntoresComerciais.find(d => d >= ib);
        if (!inDisjuntor) return displayError(`Corrente calculada (${ib.toFixed(1)}A) é muito alta para os disjuntores cadastrados.`);

        // 3. CAPACIDADE DO CABO (Iz)
        // Seleciona a tabela correta baseada no material e isolação
        let tabelaAlvo;
        if (conductor === 'cobre') {
            tabelaAlvo = (insulation === 'PVC') ? DADOS.tabelaCobrePVC : DADOS.tabelaCobreHEPR;
        } else {
            tabelaAlvo = (insulation === 'PVC') ? DADOS.tabelaAluminioPVC : DADOS.tabelaCobreHEPR; // Fallback ou adicionar tabela AlumHEPR se quiser
        }

        // Fatores de Correção
        let fct, fca;
        if (insulation === 'PVC') {
            fct = DADOS.fatoresCorrecaoTempPVC[temp] || 1.0;
        } else {
            fct = DADOS.fatoresCorrecaoTempHEPR[temp] || 1.0;
        }
        fca = DADOS.fatoresCorrecaoAgrup[grouping] || 1.0;

        const fatorTotal = fct * fca;

        // Procura cabo que aguente o DISJUNTOR (Critério: Iz_corrigida >= In)
        // Iz_corrigida = Iz_tabela * Fatores
        
        let caboPorCorrente = null;
        let capacidadeTabelaCorrente = 0;

        for (let bitola of DADOS.cabosComerciais) {
            let capacidadeBase = tabelaAlvo[method][bitola.toString()];
            if (!capacidadeBase) continue;

            let capacidadeReal = capacidadeBase * fatorTotal;
            if (capacidadeReal >= inDisjuntor) {
                caboPorCorrente = bitola;
                capacidadeTabelaCorrente = capacidadeBase;
                break;
            }
        }

        if (!caboPorCorrente) return displayError("Nenhum cabo suporta esta corrente nessas condições de instalação.");

        // 4. CÁLCULO DA QUEDA DE TENSÃO
        // Resistividade dinâmica (cabo quente)
        let keyRho = `${conductor}_${insulation}`;
        let rho = DADOS.RESISTIVIDADE[keyRho] || 0.0224;

        let caboFinal = caboPorCorrente;
        let quedaPercent = 0;
        let encontrou = false;

        // Itera a partir do cabo definido pela corrente para ver se atende queda de tensão
        let indexInicio = DADOS.cabosComerciais.indexOf(caboPorCorrente);
        
        for (let i = indexInicio; i < DADOS.cabosComerciais.length; i++) {
            let s = DADOS.cabosComerciais[i];
            
            // Fórmula: dU% = (k * rho * L * I) / (S * V) * 100
            // k = 200 (mono/bifasico) ou 173.2 (trifasico)
            let k = (phases === 'tri') ? 173.2 : 200;
            
            let queda = (k * rho * length * ib) / (s * voltage);
            
            if (queda <= DADOS.QUEDA_TENSAO_MAXIMA) {
                caboFinal = s;
                quedaPercent = queda;
                encontrou = true;
                break;
            }
        }

        if (!encontrou) return displayError("Distância muito longa. Queda de tensão excessiva mesmo com cabos grossos.");

        // --- RENDERIZA RESULTADOS ---
        document.getElementById('breaker-result').innerText = inDisjuntor + " A";
        document.getElementById('cable-result').innerText = caboFinal + " mm²";
        
        // Log técnico
        const log = document.getElementById('calculation-log');
        log.innerHTML = `
            <li>Corrente de Projeto (Ib): <span>${ib.toFixed(2)} A</span></li>
            <li>Fator Temp (${temp}°C): <span>${fct.toFixed(2)}</span></li>
            <li>Fator Agrupamento (${grouping} circ): <span>${fca.toFixed(2)}</span></li>
            <li>Fator Total: <span>${fatorTotal.toFixed(2)}</span></li>
            <li>Critério Queda de Tensão (${length}m): <span>${quedaPercent.toFixed(2)}%</span></li>
        `;

        // Tabela Contexto
        const tbody = document.getElementById('context-table-body');
        tbody.innerHTML = '';
        
        // Mostra 2 bitolas abaixo e 3 acima da escolhida para contexto
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

            // Só desenha se estiver perto da escolha (para não ficar tabela gigante)
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
        // Scroll suave até o resultado
        document.getElementById('results-panel').scrollIntoView({ behavior: 'smooth' });
    }

    // Eventos de clique
    document.getElementById('calculate-btn-geral').addEventListener('click', () => calculate(false));
    document.getElementById('calculate-btn-pro').addEventListener('click', () => calculate(true));

    document.getElementById('reset-btn-pro').addEventListener('click', () => {
        document.getElementById('form-pro').reset();
        localStorage.clear(); // Limpa dados salvos
    });

    // Inicialização
    loadSavedState();
    setupPersistence();
});
