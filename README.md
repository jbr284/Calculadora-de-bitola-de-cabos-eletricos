# Calculadora de Circuitos Elétricos (NBR 5410)

Uma ferramenta web Progressiva (PWA) para dimensionamento de circuitos elétricos de baixa tensão, baseada nos critérios da norma ABNT NBR 5410. A aplicação auxilia engenheiros, técnicos, eletricistas e estudantes a determinar a seção de cabo e o disjuntor de proteção adequados para diferentes tipos de cargas e métodos de instalação.

**[Link para a Aplicação Online](https://SEU-USUARIO.github.io/SEU-REPOSITORIO/)** 👈 (Substitua este link após hospedar)

---

##  STATUS DO PROJETO

**⚠️ AVISO IMPORTANTE:** Esta aplicação é um **protótipo funcional avançado**, ideal para fins educacionais e estudos de caso. A lógica de cálculo implementada segue os princípios da NBR 5410, mas a base de dados interna (capacidade de corrente, fatores de correção) é uma **amostra representativa e incompleta**.

**NÃO UTILIZE ESTA FERRAMENTA PARA PROJETOS ELÉTRICOS REAIS SEM ANTES:**
1.  Validar todos os cálculos com um profissional qualificado.
2.  Preencher completamente as tabelas de dados no código-fonte com os valores da norma ABNT NBR 5410 oficial e atualizada.

---

## ✨ Funcionalidades

A calculadora foi projetada para ser flexível e precisa, com uma interface clara e organizada em dois modos de uso:

### Modo Geral (Cálculo Rápido)
- Ideal para dimensionar a ligação de um único equipamento a um ponto existente.
- Formulário simplificado, pedindo apenas as informações essenciais.
- Entradas: Potência (W ou kW), Tensão, Tipo de Circuito e Comprimento do Cabo.

### Modo Profissional (Projeto de Circuito)
- Ideal para projetar um circuito completo desde o quadro de distribuição.
- Formulário detalhado, incluindo:
  - **Seleção de Modo:** Entrada de dados por Potência ou Corrente.
  - **Fator de Potência:** Lista de seleção com valores típicos para diferentes tipos de carga.
  - **Variáveis da Instalação:** Comprimento do cabo, método de instalação, temperatura ambiente e número de circuitos agrupados.
- **Cálculo Preciso:** A lógica considera os **Fatores de Correção de Temperatura (FCT)** e **Agrupamento (FCA)**.

### Resultados
- **Recomendação Dupla:** Sugestão do **Disjuntor de Proteção (In)** e da **Seção do Cabo (mm²)**.
- **Justificativa Técnica:** Exibição da corrente de projeto, queda de tensão e a validação da regra de coordenação (`Ib ≤ In ≤ Iz`).
- **Tabela de Contexto:** Mostra a seção recomendada em comparação com outras seções comerciais.

### Recursos Adicionais
- **PWA (Progressive Web App):** A aplicação é instalável em dispositivos móveis e desktops e funciona offline.
- **Design Responsivo:** A interface se adapta para uma excelente experiência em celulares, tablets e computadores.

---

## 🛠️ Tecnologias Utilizadas

Este projeto foi construído do zero, com foco em performance e simplicidade, utilizando:

- **HTML5**
- **CSS3 (Vanilla)**
- **JavaScript (ES6+)**
- **Manifest V3 e Service Worker** para a funcionalidade PWA

---

## 🚀 Como Executar Localmente

Para testar ou desenvolver o projeto na sua máquina, siga os passos:

1.  **Clone o repositório:**
    ```bash
    git clone [https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git](https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git)
    ```
2.  **Navegue até a pasta do projeto:**
    ```bash
    cd SEU-REPOSITORIO
    ```
3.  **Inicie um servidor local:**
    O Service Worker do PWA exige que a aplicação seja servida via HTTP/HTTPS. Abrir o arquivo `index.html` diretamente no navegador não funcionará. A forma mais fácil é usar um servidor simples. Se você tem o Node.js instalado:
    ```bash
    npx http-server
    ```
    Em seguida, abra o endereço `http://localhost:8080` no seu navegador.

---

## 📈 Próximos Passos (Melhorias Futuras)

O projeto tem uma base sólida, mas pode ser expandido com:

- [ ] **Completar a Base de Dados da Norma:** Preencher todas as tabelas de `Iz` e Fatores de Correção da NBR 5410.
- [ ] **Adicionar Mais Opções:** Incluir opção para condutores de Alumínio e tipos de isolação (EPR/XLPE 90°C).
- [ ] **Verificação de Curto-Circuito:** Implementar o cálculo de capacidade de curto-circuito do cabo.
- [ ] **Salvar/Exportar Projetos:** Permitir que o usuário salve os resultados ou os exporte em um formato de relatório.

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

Criado por JBRosa
