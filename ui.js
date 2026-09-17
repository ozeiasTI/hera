/**
 * SEI PLUS - UI Manager
 * Gerencia navegação, renderização e interações da interface
 */

class UI {
  constructor() {
    this.currentPage = "home";
    this.currentProcess = null;
    this.currentSubtype = null;
    this.currentEtapa = null;
    this.etapasEmCriacao = [];
    this.visualizacaoEmCriacao = this._getDefaultVisualizacao();
    this.etapaEditandoIndex = null;
    this.isEditingSavedFluxo = false; // Flag para saber se estamos editando um fluxo salvo
    this.selectedProcessos = new Set(); // Conjunto para armazenar processos selecionados

    this.initializeEventListeners();
    this.updateStats();
  }

  initializeEventListeners() {
    document
      .getElementById("btn-download-png")
      .addEventListener("click", () => this.downloadFluxoPNG());
    // Menu
    document.addEventListener("click", (e) => {
      const item = e.target.closest(".menu-item");
      if (!item) return;

      e.preventDefault();

      const page = item.dataset.page;
      if (!page) return;

      console.log("indo para:", page); // debug
      this.goToPage(page);
    });

    // Header
    document
      .getElementById("btn-search")
      .addEventListener("click", () => this.openSearch());
    document
      .getElementById("btn-help")
      .addEventListener("click", () =>
        alert(
          "SEI PLUS v1.0\n\nSistema de gerenciamento de fluxos processuais.\n\nDesenvolvido por: Ozeias Souza e Gustavo Sales",
        ),
      );

    // Home
    document
      .getElementById("btn-novo-fluxo")
      .addEventListener("click", () => this.goToPage("novo"));
    document
      .getElementById("btn-explorar")
      .addEventListener("click", () => this.goToPage("processos"));
    document
      .getElementById("btn-instrucoes")
      .addEventListener("click", () => this.goToPage("instrucoes"));

    // Processos
    document
      .getElementById("filter-processos")
      .addEventListener("input", (e) => this.filterProcessos(e.target.value));
    document
      .getElementById("btn-export-selected")
      .addEventListener("click", () => this.exportSelectedProcessos());
    document
      .getElementById("btn-pdf-selected")
      .addEventListener("click", () => this.generatePDFSelected());

    // Novo Fluxo
    document
      .getElementById("btn-add-etapa")
      .addEventListener("click", () => this.addEtapaCriacao());
    document
      .getElementById("btn-salvar-novo")
      .addEventListener("click", () => this.saveNovoFluxo());
    document
      .getElementById("btn-cancelar-novo")
      .addEventListener("click", () => this.goToPage("home"));
    document
      .getElementById("btn-add-fluxo")
      .addEventListener("click", () => this.goToPage("novo"));

    // Config
    document
      .getElementById("btn-backup")
      .addEventListener("click", () => storage.exportBackup());
    document
      .getElementById("btn-restore")
      .addEventListener("click", () =>
        document.getElementById("file-restore").click(),
      );
    document.getElementById("btn-reset").addEventListener("click", () => {
      if (confirm("Tem certeza? Isso apagará todos os dados!")) {
        storage.resetToDefault();
        alert("Dados resetados para padrão");
        this.goToPage("home");
      }
    });
    document
      .getElementById("btn-import-replace")
      .addEventListener("click", () => this.importData('replace'));
    document
      .getElementById("btn-import-merge")
      .addEventListener("click", () => this.importData('merge'));
    document
      .getElementById("file-restore")
      .addEventListener("change", (e) => this.restoreBackup(e));
    document
      .getElementById("file-import")
      .addEventListener("change", (e) => this.importBackup(e));

    // API Key
    document
      .getElementById("btn-save-api-key")
      .addEventListener("click", () => this.saveApiKey());

    // Criação
    document
      .getElementById("btn-gerar-criacao")
      .addEventListener("click", () => this.gerarCriacaoIA());
    document
      .getElementById("btn-copiar-documento")
      .addEventListener("click", () => this.copiarDocumentoCriacao());

    // Detalhes
    document
      .getElementById("btn-voltar-detalhes")
      .addEventListener("click", () => this.goToPage("processos"));
    document
      .getElementById("btn-view-lista")
      .addEventListener("click", () => this.switchView("lista"));
    document
      .getElementById("btn-view-fluxo")
      .addEventListener("click", () => this.switchView("fluxo"));
    ["mermaid-direction", "mermaid-node-shape", "mermaid-color-default", "mermaid-color-decision", "mermaid-color-start", "mermaid-color-border"].forEach((id) => {
      document.getElementById(id).addEventListener("change", (event) => {
        this.visualizacaoEmCriacao[this._getVisualizacaoField(id)] = event.target.value;
        storage.updateVisualizacao(this.currentProcess, this.currentSubtype, this.visualizacaoEmCriacao);
        this.renderFluxograma();
      });
    });
    document.getElementById("btn-reset-mermaid-style").addEventListener("click", () => {
      this.visualizacaoEmCriacao = this._getDefaultVisualizacao();
      storage.updateVisualizacao(this.currentProcess, this.currentSubtype, this.visualizacaoEmCriacao);
      this._syncVisualizacaoControls();
      this.renderFluxograma();
    });

    // Search Modal
    document
      .getElementById("search-input")
      .addEventListener("input", (e) => this.performSearch(e.target.value));
    document.querySelectorAll(".modal").forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.style.display = "none";
      });
      modal
        .querySelector(".btn-close")
        ?.addEventListener("click", () => (modal.style.display = "none"));
    });
  }

  goToPage(page) {
    document
      .querySelectorAll(".page")
      .forEach((p) => p.classList.remove("active"));

    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) {
      pageEl.classList.add("active");
    }

    document.querySelectorAll(".menu-item").forEach((item) => {
      item.classList.remove("active");
      if (item.dataset.page === page) {
        item.classList.add("active");
      }
    });

    const titles = {
      home: {
        title: "Bem-vindo ao SEI PLUS",
        subtitle: "Gerencie seus fluxos processuais com facilidade",
      },
      processos: {
        title: "Processos",
        subtitle: "Explore todos os fluxos disponíveis",
      },
      novo: {
        title: this.isEditingSavedFluxo ? "Editar Fluxo" : "Criar Novo Fluxo",
        subtitle: "Defina um processo com suas etapas",
      },
      config: {
        title: "Configurações",
        subtitle: "Gerencie seus dados e preferências",
      },
      instrucoes: {
        title: "Instruções",
        subtitle: "Manual do Usuário e Dicas",
      },
      detalhes: {
        title: "Detalhes do Fluxo",
        subtitle: "Visualize as etapas do processo",
      },
    };

    const titleData = titles[page] || titles["home"];
    document.getElementById("page-title").textContent = titleData.title;
    document.getElementById("page-subtitle").textContent = titleData.subtitle;

    this.currentPage = page;

    if (page === "home") {
      this.renderHome();
    } else if (page === "processos") {
      this.renderProcessos();
    } else if (page === "novo") {
      this.renderNovo();
    } else if (page === "autocomplete") {
      this.renderAutocomplete();
    } else if (page === "config") {
      this.renderConfig();
    }
  }

  renderConfig() {
    const config = storage.getConfig();
    document.getElementById("openai-api-key").value = config.openaiApiKey || "";
  }

  saveApiKey() {
    const key = document.getElementById("openai-api-key").value.trim();
    const config = storage.getConfig();
    config.openaiApiKey = key;
    storage.saveConfig(config);
    alert("Chave API salva com sucesso!");
  }

  async gerarCriacaoIA() {
    const input = document.getElementById("criacao-input").value.trim();
    if (!input) {
      alert("Por favor, descreva o que aconteceu.");
      return;
    }

    const config = storage.getConfig();
    if (!config.openaiApiKey) {
      alert("Por favor, configure sua chave API do ChatGPT nas Configurações primeiro.");
      this.goToPage("config");
      return;
    }

    const btn = document.getElementById("btn-gerar-criacao");
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "⌛ Processando...";

    try {
      const data = storage.getAllProcessos();
      const prompt = `
        Você é um assistente especializado no sistema SEI+. 
        O usuário descreveu a seguinte situação: "${input}"
        
        Com base nos processos cadastrados no sistema:
        ${JSON.stringify(data)}
        
        Sua tarefa é:
        1. Identificar qual o fluxo/processo mais adequado para essa situação.
        2. Explicar o que o usuário deve fazer (passo a passo).
        3. Se houver um documento (etapa tipo texto) no fluxo, monte o documento preenchido com base no que o usuário descreveu.
        
        Responda em formato JSON com os seguintes campos:
        {
          "resposta": "Sua explicação detalhada aqui",
          "fluxo_identificado": "Nome do Processo > Subtipo",
          "documento_montado": "O texto do documento preenchido (se aplicável, senão null)"
        }
      `;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.openaiApiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "Você é um assistente útil que responde apenas em JSON." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          throw new Error("Limite de uso da API atingido (Erro 429). Verifique se sua chave tem créditos ativos na OpenAI ou se você não excedeu o limite de requisições.");
        } else if (response.status === 401) {
          throw new Error("Chave API inválida. Verifique a chave inserida nas Configurações.");
        }
        throw new Error(errorData.error?.message || "Erro na chamada da API. Verifique sua conexão e chave.");
      }

      const result = await response.json();
      const content = JSON.parse(result.choices[0].message.content);

      document.getElementById("criacao-resultado").style.display = "block";
      document.getElementById("criacao-resposta-texto").textContent = content.resposta;

      if (content.documento_montado) {
        document.getElementById("criacao-documento-container").style.display = "block";
        document.getElementById("criacao-documento-texto").textContent = content.documento_montado;
      } else {
        document.getElementById("criacao-documento-container").style.display = "none";
      }

    } catch (error) {
      alert("Erro: " + error.message);
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  copiarDocumentoCriacao() {
    const texto = document.getElementById("criacao-documento-texto").textContent;
    navigator.clipboard.writeText(texto).then(() => {
      alert("Documento copiado para a área de transferência!");
    });
  }

  renderHome() {
    const stats = storage.getStats();
    document.getElementById("stat-processos").textContent = stats.processos;
    document.getElementById("stat-etapas").textContent = stats.etapas;
    document.getElementById("stat-tamanho").textContent = stats.tamanho;

    const data = storage.getAllProcessos();
    const grid = document.getElementById("home-processos");
    grid.innerHTML = "";

    if (Object.keys(data).length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🗂️</div>
          <h3>Nenhum fluxo cadastrado</h3>
          <p>Comece criando o primeiro fluxo processual do sistema.</p>
          <button class="btn btn-primary" onclick="ui.goToPage('novo')">Criar Primeiro Fluxo</button>
        </div>
      `;
      return;
    }

    Object.entries(data).forEach(([processo, subtipos]) => {
      const card = document.createElement("div");
      card.className = "processo-card";
      card.innerHTML = `
                <div class="processo-header">
                    <div class="processo-icon">📋</div>
                </div>
                <div class="processo-title">${processo}</div>
                <div class="processo-subtitle">${Object.keys(subtipos).length} subtipos</div>
                <div class="processo-description">Clique para explorar este processo</div>
                <div class="processo-footer">
                    <span class="processo-count">${Object.keys(subtipos).length} subtipos</span>
                </div>
            `;
      card.addEventListener("click", () => this.selectProcess(processo));
      grid.appendChild(card);
    });
  }

  renderProcessos() {
    const data = storage.getAllProcessos();
    const list = document.getElementById("processos-list");
    list.innerHTML = "";

    if (Object.keys(data).length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🗂️</div>
          <h3>Sua biblioteca está vazia</h3>
          <p>Crie um fluxo do zero ou importe um arquivo JSON para começar.</p>
          <button class="btn btn-primary" onclick="ui.goToPage('novo')">Criar Novo Fluxo</button>
        </div>
      `;
      return;
    }

    Object.entries(data).forEach(([processo, subtipos]) => {
      const section = document.createElement("div");
      section.className = "processo-section";
      section.innerHTML = `<h3>${processo}</h3>`;

      const grid = document.createElement("div");
      grid.className = "processos-grid";

      Object.entries(subtipos).forEach(([subtipo, fluxo]) => {
        const card = document.createElement("div");
        card.className = "processo-card";
        card.innerHTML = `
                    <div class="processo-header">
                        <div style="display: flex; align-items: center;">
                            <input type="checkbox" class="processo-checkbox" data-processo="${processo}" data-subtipo="${subtipo}">
                            <div class="processo-icon">📂</div>
                        </div>
                        <div class="processo-actions">
                             <button class="btn-icon-sm" onclick="event.stopPropagation(); ui.editFluxoSalvo('${processo}', '${subtipo}')" title="Editar Fluxo">✏️</button>
                             <button class="btn-icon-sm" onclick="event.stopPropagation(); ui.duplicateFluxo('${processo}', '${subtipo}')" title="Duplicar Fluxo">👯</button>
                             <button class="btn-icon-sm btn-icon-delete" onclick="event.stopPropagation(); ui.deleteFluxo('${processo}', '${subtipo}')" title="Excluir Fluxo">🗑️</button>
                        </div>
                    </div>
                    <div class="processo-title">${subtipo}</div>
                    <div class="processo-description">${fluxo.descricao || "Sem descrição"}</div>
                    <div class="processo-footer">
                        <span class="processo-count">${Object.keys(fluxo.etapas).length} etapas</span>
                        <button class="btn-view">Ver</button>
                    </div>
                `;

        // Event listener para o checkbox
        const checkbox = card.querySelector('.processo-checkbox');
        checkbox.addEventListener('change', (e) => {
          e.stopPropagation();
          this.toggleProcessoSelection(processo, subtipo, e.target.checked);
        });

        // Event listener para o card (exceto quando clicar no checkbox)
        card.addEventListener("click", (e) => {
          if (!e.target.classList.contains('processo-checkbox')) {
            this.selectSubtype(processo, subtipo);
          }
        });

        grid.appendChild(card);
      });

      section.appendChild(grid);
      list.appendChild(section);
    });
  }

  toggleProcessoSelection(processo, subtipo, selected) {
    const key = `${processo}|||${subtipo}`;
    if (selected) {
      this.selectedProcessos.add(key);
    } else {
      this.selectedProcessos.delete(key);
    }
    this.updateSelectedCards();
  }

  updateSelectedCards() {
    // Atualizar visual dos cards selecionados
    document.querySelectorAll('.processo-card').forEach(card => {
      const checkbox = card.querySelector('.processo-checkbox');
      const processo = checkbox.dataset.processo;
      const subtipo = checkbox.dataset.subtipo;
      const key = `${processo}|||${subtipo}`;
      if (this.selectedProcessos.has(key)) {
        card.classList.add('selected');
        checkbox.checked = true;
      } else {
        card.classList.remove('selected');
        checkbox.checked = false;
      }
    });
  }

  exportSelectedProcessos() {
    if (this.selectedProcessos.size === 0) {
      alert('Selecione pelo menos um processo para exportar.');
      return;
    }

    const data = storage.getAllProcessos();
    const selectedData = {};

    this.selectedProcessos.forEach(key => {
      const [processo, subtipo] = key.split('|||');
      if (data[processo] && data[processo][subtipo]) {
        if (!selectedData[processo]) {
          selectedData[processo] = {};
        }
        selectedData[processo][subtipo] = data[processo][subtipo];
      }
    });

    const json = JSON.stringify(selectedData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seiplus_export_${new Date().getTime()}.json`;
    a.click();
  }

  generatePDFSelected() {
    if (this.selectedProcessos.size === 0) {
      alert("Selecione pelo menos um processo para gerar o PDF");
      return;
    }

    const data = storage.getAllProcessos();
    let html = `
      <html>
      <head>
        <title>Relatório de Fluxos SEI PLUS</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.5; }
          .header { text-align: center; border-bottom: 3px solid #0066cc; padding-bottom: 20px; margin-bottom: 40px; }
          .header h1 { color: #0066cc; margin: 0; font-size: 28px; }
          .header p { color: #666; margin: 5px 0 0 0; }
          .fluxo-container { margin-bottom: 60px; page-break-after: always; }
          .fluxo-container:last-child { page-break-after: auto; }
          .fluxo-header { background: #f8f9fa; padding: 20px; border-radius: 12px; border-left: 6px solid #0066cc; margin-bottom: 30px; }
          .fluxo-header h2 { margin: 0; color: #333; font-size: 22px; }
          .fluxo-header p { margin: 10px 0 0 0; color: #555; font-size: 14px; }
          .etapa { margin-bottom: 25px; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden; }
          .etapa-title { background: #f1f5f9; padding: 12px 20px; font-weight: 700; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e0e0e0; }
          .etapa-body { padding: 20px; }
          .etapa-content { background: #fdfdfd; border: 1px solid #eee; padding: 15px; border-radius: 6px; font-family: 'Courier New', monospace; white-space: pre-wrap; font-size: 13px; margin: 10px 0; }
          .etapa-obs { color: #b45309; font-size: 13px; font-style: italic; margin-top: 10px; padding: 10px; background: #fffbeb; border-radius: 6px; }
          .etapa-next { margin-top: 15px; font-size: 13px; font-weight: 700; color: #0066cc; }
          .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Relatório de Fluxos Processuais</h1>
          <p>Sistema SEI PLUS v1.0 • Gerado em ${new Date().toLocaleString('pt-BR')}</p>
        </div>
    `;

    this.selectedProcessos.forEach((key) => {
      const [processo, subtipo] = key.split("|||");
      const fluxoRaw = data[processo]?.[subtipo];
      if (!fluxoRaw) return;

      const fluxo = storage.migrateFluxo(fluxoRaw);
      const etapaKeys = this._getEtapasOrdemGrafo(fluxo);

      html += `
        <div class="fluxo-container">
          <div class="fluxo-header">
            <h2>${processo} > ${subtipo}</h2>
            <p>${fluxo.descricao || 'Sem descrição cadastrada.'}</p>
          </div>
      `;

      etapaKeys.forEach((eKey, index) => {
        const etapa = fluxo.etapas[eKey];
        html += `
          <div class="etapa">
            <div class="etapa-title">
              <span>${index + 1}. ${etapa.nome}</span>
              <span style="font-size: 11px; color: #666; font-weight: 400;">${etapa.tipo.toUpperCase()}</span>
            </div>
            <div class="etapa-body">
              ${etapa.texto ? `<div class="etapa-content">${this._esc(etapa.texto)}</div>` : ''}
              ${etapa.pergunta ? `<p><strong>Pergunta:</strong> ${etapa.pergunta}</p>` : ''}
              ${etapa.obs ? `<div class="etapa-obs">💡 ${etapa.obs}</div>` : ''}
              
              <div class="etapa-next">
                ${etapa.proximo ? `➔ Próximo passo: ${fluxo.etapas[etapa.proximo]?.nome || etapa.proximo}` : ''}
                ${etapa.opcoes ? `➔ Decisões: ${Object.entries(etapa.opcoes).map(([label, target]) => `<br>&nbsp;&nbsp;&nbsp;• ${label} ➔ ${fluxo.etapas[target]?.nome || target}`).join('')}` : ''}
                ${!etapa.proximo && !etapa.opcoes ? '🏁 Fim do Fluxo' : ''}
              </div>
            </div>
          </div>
        `;
      });

      html += `</div>`;
    });

    html += `
        <div class="footer">
          <p>SEI PLUS v1.0 - Desenvolvido por Ozeias Souza e Gustavo Sales</p>
          <p>Este documento é para fins de consulta e padronização processual.</p>
        </div>
        <script>window.onload = () => { window.print(); }</script>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();

    this.selectedProcessos.clear();
    this.renderProcessos();
  }

  selectProcess(processo) {
    this.currentProcess = processo;
    this.currentSubtype = null;
    this.renderProcessos();
    this.goToPage("processos");
  }

  selectSubtype(processo, subtipo) {
    this.currentProcess = processo;
    this.currentSubtype = subtipo;
    const fluxo = storage.getSubtipo(processo, subtipo);
    this.visualizacaoEmCriacao = { ...this._getDefaultVisualizacao(), ...(fluxo.visualizacao || {}) };
    this.currentEtapa = fluxo.inicio;
    this.renderDetalhes();
    this.switchView("lista"); // Resetar para vista de lista ao abrir
    this.goToPage("detalhes");
  }

  switchView(view) {
    document
      .querySelectorAll(".view-container")
      .forEach((c) => c.classList.remove("active"));
    document
      .querySelectorAll(".view-toggle .btn")
      .forEach((b) => b.classList.remove("active"));

    if (view === "lista") {
      document.getElementById("view-lista-container").classList.add("active");
      document.getElementById("btn-view-lista").classList.add("active");
    } else {
      document.getElementById("view-fluxo-container").classList.add("active");
      document.getElementById("btn-view-fluxo").classList.add("active");
      this.renderFluxograma();
    }
  }

  renderFluxograma() {
    const fluxo = storage.getSubtipo(this.currentProcess, this.currentSubtype);
    if (!fluxo) return;

    const container = document.getElementById("mermaid-graph");
    container.removeAttribute("data-processed");

    const visualizacao = { ...this._getDefaultVisualizacao(), ...(fluxo.visualizacao || {}), ...this.visualizacaoEmCriacao };
    this.visualizacaoEmCriacao = visualizacao;
    this._syncVisualizacaoControls();
    let definition = `graph ${visualizacao.direcao}\n`;

    // Estilos
    definition +=
      `classDef default fill:${visualizacao.corEtapa},stroke:${visualizacao.corBorda},stroke-width:1px,color:#333,font-family:Inter;\n`;
    definition +=
      `classDef decisao fill:${visualizacao.corDecisao},stroke:${visualizacao.corBorda},stroke-width:2px;\n`;
    definition +=
      `classDef inicio fill:${visualizacao.corInicio},stroke:${visualizacao.corBorda},stroke-width:2px;\n`;

    const etapas = fluxo.etapas;
    const keys = Object.keys(etapas).sort(
      (a, b) => parseInt(a.split("_")[1]) - parseInt(b.split("_")[1]),
    );

    keys.forEach((key, index) => {
      const etapa = etapas[key];
      const id = key.replace("etapa_", "E");
      const nome = etapa.nome.replace(/"/g, "'");

      // Formato do nó baseado no tipo
      if (etapa.tipo === "decisao" || etapa.tipo === "triagem") {
        definition += `  ${id}{"${nome}"}\n`;
        definition += `  class ${id} decisao\n`;
      } else {
        const shape = { rect: `["${nome}"]`, rounded: `("${nome}")`, stadium: `(["${nome}"])`, hexagon: `{{"${nome}"}}` }[visualizacao.formato] || `["${nome}"]`;
        definition += `  ${id}${shape}\n`;
        if (index === 0) definition += `  class ${id} inicio\n`;
      }

      // Conexões
      if (etapa.tipo === "decisao" || etapa.tipo === "triagem") {
        if (etapa.opcoes) {
          Object.entries(etapa.opcoes).forEach(([label, target]) => {
            if (target) {
              const targetId = target.replace("etapa_", "E");
              definition += `  ${id} -- "${label}" --> ${targetId}\n`;
            }
          });
        }
      } else if (etapa.proximo) {
        const targetId = etapa.proximo.replace("etapa_", "E");
        definition += `  ${id} --> ${targetId}\n`;
      }
    });

    container.textContent = definition;

    // Inicializar/Renderizar Mermaid
    if (window.mermaid) {
      mermaid.initialize({
        startOnLoad: true,
        theme: "default",
        securityLevel: "loose",
      });
      mermaid.init(undefined, container);
    }
  }

  _getDefaultVisualizacao() {
    return {
      direcao: "TD",
      formato: "rect",
      corEtapa: "#f9f9f9",
      corDecisao: "#fff4dd",
      corInicio: "#e6f0ff",
      corBorda: "#333333",
    };
  }

  _getVisualizacaoField(id) {
    return {
      "mermaid-direction": "direcao",
      "mermaid-node-shape": "formato",
      "mermaid-color-default": "corEtapa",
      "mermaid-color-decision": "corDecisao",
      "mermaid-color-start": "corInicio",
      "mermaid-color-border": "corBorda",
    }[id];
  }

  _syncVisualizacaoControls() {
    const fields = {
      "mermaid-direction": "direcao",
      "mermaid-node-shape": "formato",
      "mermaid-color-default": "corEtapa",
      "mermaid-color-decision": "corDecisao",
      "mermaid-color-start": "corInicio",
      "mermaid-color-border": "corBorda",
    };
    Object.entries(fields).forEach(([id, field]) => {
      const control = document.getElementById(id);
      if (control) control.value = this.visualizacaoEmCriacao[field];
    });
  }

  renderDetalhes() {
    const fluxo = storage.getSubtipo(this.currentProcess, this.currentSubtype);

    document.getElementById("detalhes-titulo").textContent =
      this.currentSubtype;
    document.getElementById("detalhes-subtitulo").textContent =
      this.currentProcess;

    const etapasNav = document.getElementById("detalhes-etapas");
    etapasNav.innerHTML = "";

    // Ordenar etapas para navegação consistente
    const etapaKeys = Object.keys(fluxo.etapas).sort((a, b) => {
      const numA = parseInt(a.split("_")[1]);
      const numB = parseInt(b.split("_")[1]);
      return numA - numB;
    });

    etapaKeys.forEach((key) => {
      const etapa = fluxo.etapas[key];
      const btn = document.createElement("button");
      btn.className = `etapa-nav-item ${key === this.currentEtapa ? "active" : ""}`;
      btn.textContent = etapa.nome;
      btn.addEventListener("click", () => {
        this.currentEtapa = key;
        this.renderDetalhes();
      });
      etapasNav.appendChild(btn);
    });

    const etapa = fluxo.etapas[this.currentEtapa];
    const viewer = document.getElementById("etapa-viewer");

    let html = `
            <div class="etapa-header">
                <div class="etapa-icon">${etapa.icone || "📋"}</div>
                <div>
                    <div class="etapa-title">${etapa.nome}</div>
                    <div class="etapa-badge">${this._getTipoLabel(etapa.tipo)}</div>
                </div>
            </div>
        `;

    if (etapa.obs) {
      html += `<div class="etapa-alert info">ℹ️ ${etapa.obs}</div>`;
    }

    if (etapa.tipo === "texto") {
      html += `
                <div class="etapa-content">${etapa.texto}</div>
                <button class="btn btn-primary" onclick="navigator.clipboard.writeText(\`${etapa.texto.replace(/`/g, "\\`")}\`); alert('Copiado!')">
                    📋 Copiar Texto
                </button>
            `;
    } else if (etapa.tipo === "anexo") {
      html += `
                <div class="etapa-alert warning">
                    <div style="font-weight: 600; margin-bottom: 8px;">Anexação de Documento</div>
                    <p style="font-size: 13px;">Nesta etapa, você deve anexar o documento especificado no SEI.</p>
                </div>
            `;
    } else if (etapa.tipo === "decisao") {
      html += `
                <div style="margin: 20px 0;">
                    <p style="font-weight: 600; margin-bottom: 16px; font-size: 16px;">${etapa.pergunta}</p>
                    <div class="decision-buttons">
            `;
      Object.entries(etapa.opcoes).forEach(([opcao, proxima]) => {
        const isYes =
          opcao.toLowerCase() === "sim" ||
          opcao.toLowerCase() === "yes" ||
          opcao.toLowerCase() === "ok";
        html += `
                    <button class="btn-decision ${isYes ? "yes" : "no"}" onclick="ui.selectEtapa('${proxima}')">
                        ${isYes ? "✓" : "✗"} ${opcao}
                    </button>
                `;
      });
      html += `</div></div>`;
    } else if (etapa.tipo === "link") {
      html += `
                <div class="etapa-alert info">
                    <p style="margin-bottom: 12px;">Esta etapa requer acesso a um link externo ou recurso específico.</p>
                    <a href="${etapa.url}" target="_blank" class="btn btn-primary">🌐 Acessar Recurso</a>
                </div>
            `;
    } else if (etapa.tipo === "alerta") {
      html += `
                <div class="etapa-alert ${etapa.nivel || "info"}">
                    <div style="font-weight: 700; font-size: 16px; margin-bottom: 8px;">⚠️ ATENÇÃO</div>
                    <p>${etapa.mensagem}</p>
                </div>
            `;
    } else if (etapa.tipo === "triagem") {
      html += `
                <div style="margin: 20px 0;">
                    <p style="font-weight: 600; margin-bottom: 16px; font-size: 16px;">${etapa.pergunta}</p>
                    <div class="triagem-list">
            `;
      Object.entries(etapa.opcoes).forEach(([opcao, proxima]) => {
        html += `
                    <button class="triagem-item" onclick="ui.selectEtapa('${proxima}')">
                        <span>${opcao}</span>
                        <span>➔</span>
                    </button>
                `;
      });
      html += `</div></div>`;
    } else if (etapa.tipo === "email") {
      html += `
                <div class="etapa-content">${etapa.modelo}</div>
                <button class="btn btn-primary" onclick="navigator.clipboard.writeText(\`${etapa.modelo.replace(/`/g, "\\`")}\`); alert('Modelo copiado!')">
                    📋 Copiar Modelo de E-mail
                </button>
            `;
    } else if (etapa.tipo === "contato") {
      html += `<div class="contatos-list">`;
      if (etapa.contatos && Array.isArray(etapa.contatos)) {
        etapa.contatos.forEach((contato) => {
          html += `
                        <div class="contato-card">
                            <div class="contato-nome">${contato.nome}</div>
                            <div class="contato-info">📧 ${contato.email}</div>
                            <div class="contato-info">📱 ${contato.telefone}</div>
                            ${contato.cargo ? `<div class="contato-info">💼 ${contato.cargo}</div>` : ""}
                            ${contato.departamento ? `<div class="contato-info">🏢 ${contato.departamento}</div>` : ""}
                        </div>
                    `;
        });
      }
      html += `</div>`;
    } else if (etapa.tipo === "reuniao") {
      html += `
                <div class="reuniao-info">
                    <div class="info-row"><span>📅 Data/Hora:</span> <strong>${etapa.dataHora || "A definir"}</strong></div>
                    <div class="info-row"><span>📍 Local:</span> <strong>${etapa.local || "A definir"}</strong></div>
                    <div class="info-row"><span>👥 Participantes:</span> <strong>${etapa.participantes || "A definir"}</strong></div>
                    ${etapa.descricao ? `<div class="info-row"><span>📝 Descrição:</span></div><div class="etapa-content">${etapa.descricao}</div>` : ""}
                </div>
            `;
    } else if (etapa.tipo === "checklist") {
      html += `<div class="checklist-container">`;
      if (etapa.itens && Array.isArray(etapa.itens)) {
        etapa.itens.forEach((item, idx) => {
          html += `
                        <div class="checklist-item">
                            <input type="checkbox" id="check-${idx}" class="checklist-checkbox">
                            <label for="check-${idx}" class="checklist-label">${item}</label>
                        </div>
                    `;
        });
      }
      html += `</div>`;
    }

    if (etapa.proximo && etapa.tipo !== "decisao" && etapa.tipo !== "triagem") {
      html += `
                <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border);">
                    <button class="btn btn-primary" onclick="ui.selectEtapa('${etapa.proximo}')">
                        Próxima Etapa →
                    </button>
                </div>
            `;
    }

    viewer.innerHTML = html;
  }

  _getTipoLabel(tipo) {
    const labels = {
      texto: "📝 Texto / Modelo",
      anexo: "📎 Anexo",
      decisao: "🔀 Decisão",
      link: "🔗 Link Externo",
      alerta: "⚠️ Alerta / Aviso",
      triagem: "🔍 Triagem / Escolha",
      email: "📧 E-mail",
      contato: "👥 Contatos",
      reuniao: "📅 Reunião/Agendamento",
      checklist: "✅ Checklist de Documentos",
    };
    return labels[tipo] || tipo;
  }

  _getEtapasOrdemGrafo(fluxo) {
    if (!fluxo || !fluxo.etapas) return [];
    const keys = Object.keys(fluxo.etapas).sort(
      (a, b) => parseInt(a.split("_")[1]) - parseInt(b.split("_")[1]),
    );
    return keys;
  }

  selectEtapa(etapaKey) {
    if (!etapaKey) return;
    this.currentEtapa = etapaKey;
    this.renderDetalhes();
  }

  // ============================================
  // EDIÇÃO DE FLUXOS SALVOS
  // ============================================

  editFluxoSalvo(processo, subtipo) {
    const fluxo = storage.getSubtipo(processo, subtipo);
    if (!fluxo) return;

    this.isEditingSavedFluxo = true;
    this.currentProcess = processo;
    this.currentSubtype = subtipo;
    this.visualizacaoEmCriacao = { ...this._getDefaultVisualizacao(), ...(fluxo.visualizacao || {}) };

    // Converter o mapa de etapas de volta para array para o editor
    this.etapasEmCriacao = Object.keys(fluxo.etapas)
      .sort((a, b) => parseInt(a.split("_")[1]) - parseInt(b.split("_")[1]))
      .map((key) => {
        const etapa = fluxo.etapas[key];
        return {
          nome: etapa.nome,
          tipo: etapa.tipo,
          ...(etapa.texto && { texto: etapa.texto }),
          ...(etapa.obs && { obs: etapa.obs }),
          ...(etapa.pergunta && { pergunta: etapa.pergunta }),
          ...(etapa.opcoes && { opcoes: etapa.opcoes }),
          ...(etapa.url && { url: etapa.url }),
          ...(etapa.mensagem && { mensagem: etapa.mensagem }),
          ...(etapa.nivel && { nivel: etapa.nivel }),
          ...(etapa.modelo && { modelo: etapa.modelo }),
          ...(etapa.contatos && { contatos: etapa.contatos }),
          ...(etapa.dataHora && { dataHora: etapa.dataHora }),
          ...(etapa.local && { local: etapa.local }),
          ...(etapa.participantes && { participantes: etapa.participantes }),
          ...(etapa.descricao && { descricao: etapa.descricao }),
          ...(etapa.itens && { itens: etapa.itens }),
          proximo: etapa.proximo,
        };
      });

    document.getElementById("form-processo").value = processo;
    document.getElementById("form-subtipo").value = subtipo;
    document.getElementById("form-descricao").value = fluxo.descricao || "";

    this.goToPage("novo");
  }

  deleteFluxo(processo, subtipo) {
    if (confirm(`Tem certeza que deseja excluir o fluxo "${subtipo}"?`)) {
      storage.deleteFluxo(processo, subtipo);
      this.renderProcessos();
      this.updateStats();
    }
  }

  duplicateFluxo(processo, subtipo) {
    const fluxo = storage.getSubtipo(processo, subtipo);
    if (fluxo) {
      const novoSubtipo = `${subtipo} (Cópia)`;
      // Converter o mapa de etapas de volta para o formato de array que addFluxo espera
      const etapasArray = Object.entries(fluxo.etapas).map(([id, etapa]) => ({
        ...etapa
      }));

      storage.addFluxo(processo, novoSubtipo, fluxo.descricao, etapasArray, fluxo.visualizacao);
      alert(`Fluxo "${subtipo}" duplicado como "${novoSubtipo}"`);
      this.renderProcessos();
      this.updateStats();
    }
  }

  // ============================================
  // NOVO FLUXO / EDITOR
  // ============================================

  renderNovo() {
    if (!this.isEditingSavedFluxo) {
      this.visualizacaoEmCriacao = this._getDefaultVisualizacao();
      this.etapasEmCriacao = [
        { nome: "Etapa 1", tipo: "texto", texto: "", obs: "" },
      ];
      this.etapaEditandoIndex = null;
      document.getElementById("form-processo").value = "";
      document.getElementById("form-subtipo").value = "";
      document.getElementById("form-descricao").value = "";
    }

    this._renderFluxoBuilder();
  }

  _renderFluxoBuilder() {
    const container = document.getElementById("etapas-container");
    container.innerHTML = "";

    if (this.etapasEmCriacao.length === 0) {
      container.innerHTML = `
                <div class="etapa-vazia">
                    <p>Nenhuma etapa adicionada. Clique em <strong>+ Adicionar Etapa</strong> para começar.</p>
                </div>
            `;
      return;
    }

    this.etapasEmCriacao.forEach((etapa, index) => {
      const isEditando = this.etapaEditandoIndex === index;
      const item = document.createElement("div");
      item.className = `etapa-item${isEditando ? " etapa-item--editing" : ""}`;

      const tipoLabel = this._getTipoLabel(etapa.tipo);
      const podeExcluir = this.etapasEmCriacao.length > 1;

      item.innerHTML = `
                <div class="etapa-numero">${index + 1}</div>
                <div class="etapa-info">
                    <div class="etapa-nome">${etapa.nome || "(sem nome)"}</div>
                    <div class="etapa-tipo">${tipoLabel}</div>
                </div>
                <div class="etapa-actions">
                    <button class="btn-icon-sm btn-icon-edit" title="Editar etapa" onclick="ui.toggleEditarEtapa(${index})">
                        ${isEditando ? "✖" : "✏️"}
                    </button>
                    ${podeExcluir
          ? `<button class="btn-icon-sm btn-icon-delete" title="Excluir etapa" onclick="ui.confirmarExcluirEtapa(${index})">🗑️</button>`
          : `<button class="btn-icon-sm" title="Não é possível excluir a única etapa" disabled style="opacity:0.35;cursor:not-allowed;">🗑️</button>`
        }
                </div>
            `;

      container.appendChild(item);

      if (isEditando) {
        const editor = this._buildEditorInline(index, etapa);
        container.appendChild(editor);
      }
    });

    // Re-aplicar listeners de autocomplete aos campos do editor
    container
      .querySelectorAll("input.input, textarea.textarea")
      .forEach((el) => {
        this.setupAutocompleteListener(el);
      });
  }

  _buildEditorInline(index, etapa) {
    const wrapper = document.createElement("div");
    wrapper.className = "etapa-editor-inline";

    const camposExtras = this._buildCamposExtras(index, etapa);

    wrapper.innerHTML = `
            <div class="etapa-editor-header">
                <span>Editando etapa ${index + 1}</span>
            </div>

            <div class="form-group">
                <label>Nome da Etapa</label>
                <input type="text" class="input" id="editor-nome-${index}" value="${this._esc(etapa.nome)}" placeholder="Ex: Termo de Abertura" oninput="ui._atualizarCampo(${index}, 'nome', this.value)">
            </div>

            <div class="form-group">
                <label>Tipo da Etapa</label>
                <select class="select" id="editor-tipo-${index}" onchange="ui._mudarTipo(${index}, this.value)">
                    <option value="texto"   ${etapa.tipo === "texto" ? "selected" : ""}>📝 Texto / Modelo</option>
                    <option value="anexo"   ${etapa.tipo === "anexo" ? "selected" : ""}>📎 Anexo de Documento</option>
                    <option value="decisao" ${etapa.tipo === "decisao" ? "selected" : ""}>🔀 Decisão (Sim/Não)</option>
                    <option value="triagem" ${etapa.tipo === "triagem" ? "selected" : ""}>🔍 Triagem (Múltipla Escolha)</option>
                    <option value="link"    ${etapa.tipo === "link" ? "selected" : ""}>🔗 Link Externo</option>
                    <option value="alerta"  ${etapa.tipo === "alerta" ? "selected" : ""}>⚠️ Alerta / Aviso</option>
                    <option value="email"   ${etapa.tipo === "email" ? "selected" : ""}>📧 E-mail</option>
                    <option value="contato" ${etapa.tipo === "contato" ? "selected" : ""}>👥 Contatos</option>
                    <option value="reuniao" ${etapa.tipo === "reuniao" ? "selected" : ""}>📅 Reunião/Agendamento</option>
                    <option value="checklist" ${etapa.tipo === "checklist" ? "selected" : ""}>✅ Checklist de Documentos</option>
                </select>
            </div>

            <div id="editor-campos-extras-${index}">
                ${camposExtras}
            </div>

            <div class="etapa-editor-footer">
                <button class="btn btn-sm btn-primary" onclick="ui.confirmarEdicaoEtapa(${index})">✔ Confirmar</button>
                <button class="btn btn-sm btn-secondary" onclick="ui.cancelarEdicaoEtapa()">Cancelar</button>
            </div>
        `;

    return wrapper;
  }

  _buildCamposExtras(index, etapa) {
    if (etapa.tipo === "texto") {
      return `
                <div class="form-group">
                    <label>Texto / Modelo</label>
                    <textarea class="textarea" id="editor-texto-${index}" placeholder="Digite o texto ou modelo do documento..." oninput="ui._atualizarCampo(${index}, 'texto', this.value)">${this._esc(etapa.texto || "")}</textarea>
                </div>
                <div class="form-group">
                    <label>Observação</label>
                    <input type="text" class="input" id="editor-obs-${index}" value="${this._esc(etapa.obs || "")}" placeholder="Ex: Preencha os campos entre {}" oninput="ui._atualizarCampo(${index}, 'obs', this.value)">
                </div>
                <div class="form-group">
                    <label>Próxima Etapa</label>
                    <select class="select" onchange="ui._atualizarCampo(${index}, 'proximo', this.value)">
                        <option value="">Nenhuma (Fim do Fluxo)</option>
                        ${this._buildEtapasOptions(index, etapa.proximo)}
                    </select>
                </div>
            `;
    } else if (etapa.tipo === "anexo") {
      return `
                <div class="form-group">
                    <label>Observação / Instrução</label>
                    <input type="text" class="input" id="editor-obs-${index}" value="${this._esc(etapa.obs || "")}" placeholder="Ex: Anexe o ofício escaneado" oninput="ui._atualizarCampo(${index}, 'obs', this.value)">
                </div>
                <div class="form-group">
                    <label>Próxima Etapa</label>
                    <select class="select" onchange="ui._atualizarCampo(${index}, 'proximo', this.value)">
                        <option value="">Nenhuma (Fim do Fluxo)</option>
                        ${this._buildEtapasOptions(index, etapa.proximo)}
                    </select>
                </div>
            `;
    } else if (etapa.tipo === "decisao") {
      const opcoesHtml = this._buildOpcoesList(index, etapa.opcoes || {});
      return `
                <div class="form-group">
                    <label>Pergunta da Decisão</label>
                    <input type="text" class="input" id="editor-pergunta-${index}" value="${this._esc(etapa.pergunta || "")}" placeholder="Ex: O documento foi aprovado?" oninput="ui._atualizarCampo(${index}, 'pergunta', this.value)">
                </div>
                <div class="form-group">
                    <label>Opções e Destinos</label>
                    <div id="opcoes-list-${index}" class="opcoes-list">
                        ${opcoesHtml}
                    </div>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="ui._addOpcao(${index})">+ Adicionar Opção</button>
                </div>
            `;
    } else if (etapa.tipo === "triagem") {
      const opcoesHtml = this._buildOpcoesList(index, etapa.opcoes || {});
      return `
                <div class="form-group">
                    <label>Pergunta de Triagem</label>
                    <input type="text" class="input" id="editor-pergunta-${index}" value="${this._esc(etapa.pergunta || "")}" placeholder="Ex: Qual é a prioridade?" oninput="ui._atualizarCampo(${index}, 'pergunta', this.value)">
                </div>
                <div class="form-group">
                    <label>Opções e Destinos</label>
                    <div id="opcoes-list-${index}" class="opcoes-list">
                        ${opcoesHtml}
                    </div>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="ui._addOpcao(${index})">+ Adicionar Opção</button>
                </div>
            `;
    } else if (etapa.tipo === "link") {
      return `
                <div class="form-group">
                    <label>URL do Link</label>
                    <input type="text" class="input" id="editor-url-${index}" value="${this._esc(etapa.url || "")}" placeholder="Ex: https://exemplo.com" oninput="ui._atualizarCampo(${index}, 'url', this.value)">
                </div>
                <div class="form-group">
                    <label>Observação</label>
                    <input type="text" class="input" id="editor-obs-${index}" value="${this._esc(etapa.obs || "")}" placeholder="Ex: Acesse o portal para consulta" oninput="ui._atualizarCampo(${index}, 'obs', this.value)">
                </div>
            `;
    } else if (etapa.tipo === "alerta") {
      return `
                <div class="form-group">
                    <label>Mensagem de Alerta</label>
                    <textarea class="textarea" id="editor-mensagem-${index}" placeholder="Digite a mensagem de aviso..." oninput="ui._atualizarCampo(${index}, 'mensagem', this.value)">${this._esc(etapa.mensagem || "")}</textarea>
                </div>
                <div class="form-group">
                    <label>Nível</label>
                    <select class="select" onchange="ui._atualizarCampo(${index}, 'nivel', this.value)">
                        <option value="info" ${etapa.nivel === "info" ? "selected" : ""}>ℹ️ Informativo (Azul)</option>
                        <option value="warning" ${etapa.nivel === "warning" ? "selected" : ""}>⚠️ Aviso (Amarelo)</option>
                        <option value="danger" ${etapa.nivel === "danger" ? "selected" : ""}>🚫 Crítico (Vermelho)</option>
                    </select>
                </div>
            `;
    } else if (etapa.tipo === "email") {
      return `
                <div class="form-group">
                    <label>Modelo de E-mail</label>
                    <textarea class="textarea" id="editor-modelo-${index}" placeholder="Digite o modelo do e-mail..." oninput="ui._atualizarCampo(${index}, 'modelo', this.value)">${this._esc(etapa.modelo || "")}</textarea>
                </div>
                <div class="form-group">
                    <label>Observação</label>
                    <input type="text" class="input" id="editor-obs-${index}" value="${this._esc(etapa.obs || "")}" placeholder="Ex: Enviar para o setor responsável" oninput="ui._atualizarCampo(${index}, 'obs', this.value)">
                </div>
                <div class="form-group">
                    <label>Próxima Etapa</label>
                    <select class="select" onchange="ui._atualizarCampo(${index}, 'proximo', this.value)">
                        <option value="">Nenhuma (Fim do Fluxo)</option>
                        ${this._buildEtapasOptions(index, etapa.proximo)}
                    </select>
                </div>
            `;
    } else if (etapa.tipo === "contato") {
      const contatosHtml = this._buildContatosList(index, etapa.contatos || []);
      return `
                <div class="form-group">
                    <label>Contatos</label>
                    <div id="contatos-list-${index}" class="contatos-editor">
                        ${contatosHtml}
                    </div>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="ui._addContato(${index})">+ Adicionar Contato</button>
                </div>
                <div class="form-group">
                    <label>Próxima Etapa</label>
                    <select class="select" onchange="ui._atualizarCampo(${index}, 'proximo', this.value)">
                        <option value="">Nenhuma (Fim do Fluxo)</option>
                        ${this._buildEtapasOptions(index, etapa.proximo)}
                    </select>
                </div>
            `;
    } else if (etapa.tipo === "reuniao") {
      return `
                <div class="form-group">
                    <label>Data e Hora</label>
                    <input type="text" class="input" id="editor-dataHora-${index}" value="${this._esc(etapa.dataHora || "")}" placeholder="Ex: 15/03/2025 às 14:00" oninput="ui._atualizarCampo(${index}, 'dataHora', this.value)">
                </div>
                <div class="form-group">
                    <label>Local / Plataforma</label>
                    <input type="text" class="input" id="editor-local-${index}" value="${this._esc(etapa.local || "")}" placeholder="Ex: Sala 101 ou Teams" oninput="ui._atualizarCampo(${index}, 'local', this.value)">
                </div>
                <div class="form-group">
                    <label>Participantes</label>
                    <input type="text" class="input" id="editor-participantes-${index}" value="${this._esc(etapa.participantes || "")}" placeholder="Ex: João, Maria, Carlos" oninput="ui._atualizarCampo(${index}, 'participantes', this.value)">
                </div>
                <div class="form-group">
                    <label>Descrição / Pauta</label>
                    <textarea class="textarea" id="editor-descricao-${index}" placeholder="Descrição da reunião..." oninput="ui._atualizarCampo(${index}, 'descricao', this.value)">${this._esc(etapa.descricao || "")}</textarea>
                </div>
                <div class="form-group">
                    <label>Próxima Etapa</label>
                    <select class="select" onchange="ui._atualizarCampo(${index}, 'proximo', this.value)">
                        <option value="">Nenhuma (Fim do Fluxo)</option>
                        ${this._buildEtapasOptions(index, etapa.proximo)}
                    </select>
                </div>
            `;
    } else if (etapa.tipo === "checklist") {
      const itensHtml = this._buildChecklistItens(index, etapa.itens || []);
      return `
                <div class="form-group">
                    <label>Itens do Checklist</label>
                    <div id="checklist-itens-${index}" class="checklist-editor">
                        ${itensHtml}
                    </div>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="ui._addChecklistItem(${index})">+ Adicionar Item</button>
                </div>
                <div class="form-group">
                    <label>Próxima Etapa</label>
                    <select class="select" onchange="ui._atualizarCampo(${index}, 'proximo', this.value)">
                        <option value="">Nenhuma (Fim do Fluxo)</option>
                        ${this._buildEtapasOptions(index, etapa.proximo)}
                    </select>
                </div>
            `;
    }
    return "";
  }

  _buildEtapasOptions(indexAtual, selecionada) {
    return this.etapasEmCriacao
      .map((e, i) => {
        if (i === indexAtual) return "";
        const key = `etapa_${i}`;
        return `<option value="${key}" ${selecionada === key ? "selected" : ""}>${i + 1}. ${e.nome}</option>`;
      })
      .join("");
  }

  _buildOpcoesList(index, opcoes) {
    return Object.entries(opcoes)
      .map(
        ([opcao, destino], oIdx) => `
            <div class="opcao-item">
                <input type="text" class="input" style="flex:1;" value="${this._esc(opcao)}" placeholder="Nome da opção" onchange="ui._renomearOpcao(${index}, ${oIdx}, this.value)">
                <select class="select" style="flex:1;margin-left:8px;" onchange="ui._vincularOpcao(${index}, ${oIdx}, this.value)">
                    <option value="">Nenhuma (Fim)</option>
                    ${this._buildEtapasOptionsForOpcao(index, destino)}
                </select>
                <button type="button" class="btn-icon-sm btn-icon-delete" onclick="ui._removerOpcao(${index}, ${oIdx})" style="margin-left:8px;">✕</button>
            </div>
        `,
      )
      .join("");
  }

  _buildEtapasOptionsForOpcao(indexAtual, selecionada) {
    return this.etapasEmCriacao
      .map((e, i) => {
        if (i === indexAtual) return "";
        const key = `etapa_${i}`;
        return `<option value="${key}" ${selecionada === key ? "selected" : ""}>${i + 1}. ${e.nome}</option>`;
      })
      .join("");
  }

  _addOpcao(index) {
    if (!this.etapasEmCriacao[index].opcoes)
      this.etapasEmCriacao[index].opcoes = {};
    const novaOpcao = `Opção ${Object.keys(this.etapasEmCriacao[index].opcoes).length + 1}`;
    this.etapasEmCriacao[index].opcoes[novaOpcao] = "";
    this._renderFluxoBuilder();
  }

  _renomearOpcao(index, oIdx, novoNome) {
    const opcoes = this.etapasEmCriacao[index].opcoes;
    const keys = Object.keys(opcoes);
    const oldKey = keys[oIdx];
    if (oldKey && novoNome.trim()) {
      const valor = opcoes[oldKey];
      delete opcoes[oldKey];
      opcoes[novoNome] = valor;
    }
  }

  _vincularOpcao(index, oIdx, destino) {
    const opcoes = this.etapasEmCriacao[index].opcoes;
    const keys = Object.keys(opcoes);
    if (keys[oIdx]) opcoes[keys[oIdx]] = destino;
  }

  _removerOpcao(index, oIdx) {
    const opcoes = this.etapasEmCriacao[index].opcoes;
    const keys = Object.keys(opcoes);
    if (keys[oIdx]) delete opcoes[keys[oIdx]];
    this._renderFluxoBuilder();
  }

  _esc(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  toggleEditarEtapa(index) {
    this.etapaEditandoIndex = this.etapaEditandoIndex === index ? null : index;
    this._renderFluxoBuilder();
  }

  _atualizarCampo(index, campo, valor) {
    if (this.etapasEmCriacao[index]) {
      this.etapasEmCriacao[index][campo] = valor;
    }
  }

  _mudarTipo(index, novoTipo) {
    const etapa = this.etapasEmCriacao[index];
    etapa.tipo = novoTipo;

    // Reset campos
    const fieldsToKeep = ["nome", "tipo"];
    Object.keys(etapa).forEach((key) => {
      if (!fieldsToKeep.includes(key)) delete etapa[key];
    });

    if (novoTipo === "texto") {
      etapa.texto = "";
      etapa.obs = "";
    } else if (novoTipo === "anexo") {
      etapa.obs = "";
    } else if (novoTipo === "decisao" || novoTipo === "triagem") {
      etapa.pergunta = "";
      etapa.opcoes =
        novoTipo === "decisao"
          ? { Sim: "etapa_X", Não: "etapa_Y" }
          : { "Opção 1": "etapa_X" };
    } else if (novoTipo === "link") {
      etapa.url = "";
      etapa.obs = "";
    } else if (novoTipo === "alerta") {
      etapa.mensagem = "";
      etapa.nivel = "info";
    } else if (novoTipo === "email") {
      etapa.modelo = "";
      etapa.obs = "";
    } else if (novoTipo === "contato") {
      etapa.contatos = [];
    } else if (novoTipo === "reuniao") {
      etapa.dataHora = "";
      etapa.local = "";
      etapa.participantes = "";
      etapa.descricao = "";
    } else if (novoTipo === "checklist") {
      etapa.itens = [];
    }

    this._renderFluxoBuilder();
  }

  _buildContatosList(index, contatos) {
    return contatos
      .map(
        (contato, cIdx) => `
            <div class="contato-editor-item">
                <input type="text" class="input" style="flex:1;" value="${this._esc(contato.nome)}" placeholder="Nome" onchange="ui._atualizarContato(${index}, ${cIdx}, 'nome', this.value)">
                <input type="email" class="input" style="flex:1;margin-left:8px;" value="${this._esc(contato.email)}" placeholder="Email" onchange="ui._atualizarContato(${index}, ${cIdx}, 'email', this.value)">
                <input type="tel" class="input" style="flex:1;margin-left:8px;" value="${this._esc(contato.telefone)}" placeholder="Telefone" onchange="ui._atualizarContato(${index}, ${cIdx}, 'telefone', this.value)">
                <button type="button" class="btn-icon-sm btn-icon-delete" onclick="ui._removerContato(${index}, ${cIdx})" style="margin-left:8px;">✕</button>
            </div>
        `,
      )
      .join("");
  }

  _addContato(index) {
    if (!this.etapasEmCriacao[index].contatos)
      this.etapasEmCriacao[index].contatos = [];
    this.etapasEmCriacao[index].contatos.push({
      nome: "",
      email: "",
      telefone: "",
      cargo: "",
      departamento: "",
    });
    this._renderFluxoBuilder();
  }

  _atualizarContato(index, cIdx, campo, valor) {
    if (
      this.etapasEmCriacao[index].contatos &&
      this.etapasEmCriacao[index].contatos[cIdx]
    ) {
      this.etapasEmCriacao[index].contatos[cIdx][campo] = valor;
    }
  }

  _removerContato(index, cIdx) {
    if (this.etapasEmCriacao[index].contatos) {
      this.etapasEmCriacao[index].contatos.splice(cIdx, 1);
      this._renderFluxoBuilder();
    }
  }

  _buildChecklistItens(index, itens) {
    return itens
      .map(
        (item, iIdx) => `
            <div class="checklist-editor-item">
                <input type="text" class="input" value="${this._esc(item)}" placeholder="Item do checklist" onchange="ui._atualizarChecklistItem(${index}, ${iIdx}, this.value)">
                <button type="button" class="btn-icon-sm btn-icon-delete" onclick="ui._removerChecklistItem(${index}, ${iIdx})">✕</button>
            </div>
        `,
      )
      .join("");
  }

  _addChecklistItem(index) {
    if (!this.etapasEmCriacao[index].itens)
      this.etapasEmCriacao[index].itens = [];
    this.etapasEmCriacao[index].itens.push("");
    this._renderFluxoBuilder();
  }

  _atualizarChecklistItem(index, iIdx, valor) {
    if (
      this.etapasEmCriacao[index].itens &&
      this.etapasEmCriacao[index].itens[iIdx] !== undefined
    ) {
      this.etapasEmCriacao[index].itens[iIdx] = valor;
    }
  }

  _removerChecklistItem(index, iIdx) {
    if (this.etapasEmCriacao[index].itens) {
      this.etapasEmCriacao[index].itens.splice(iIdx, 1);
      this._renderFluxoBuilder();
    }
  }

  addAutocompleteItem() {
    const categoria = document
      .getElementById("autocomplete-categoria")
      .value.trim();
    const nome = document.getElementById("autocomplete-nome").value.trim();
    const descricao = document
      .getElementById("autocomplete-descricao")
      .value.trim();

    if (!categoria || !nome || !descricao) {
      alert("Preencha todos os campos");
      return;
    }

    storage.addAutocompleteItem(categoria, nome, descricao);
    alert("Atalho adicionado com sucesso!");
    document.getElementById("autocomplete-categoria").value = "";
    document.getElementById("autocomplete-nome").value = "";
    document.getElementById("autocomplete-descricao").value = "";
    this.renderAutocompleteList();
  }

  toggleFaq(element) {
    element.classList.toggle('active');
    const answer = element.nextElementSibling;
    if (answer) answer.classList.toggle('active');
  }

  renderAutocomplete() {
    this.renderAutocompleteList();
    // Aplicar listener a todos os inputs e textareas relevantes
    document
      .querySelectorAll("input.input, textarea.textarea")
      .forEach((el) => {
        // Não aplicar nos campos de cadastro do próprio autocomplete para evitar recursão infinita ou confusão
        if (
          el.id !== "autocomplete-categoria" &&
          el.id !== "autocomplete-nome" &&
          el.id !== "autocomplete-descricao"
        ) {
          this.setupAutocompleteListener(el);
        }
      });
  }

  renderAutocompleteList() {
    const container = document.getElementById("autocomplete-items-container");
    const data = storage.getAutocompleteData();

    if (Object.keys(data).length === 0) {
      container.innerHTML =
        '<p style="color: var(--text-muted); text-align: center; padding: 20px;">Nenhum atalho cadastrado</p>';
      return;
    }

    let html = "";
    Object.entries(data).forEach(([categoria, items]) => {
      html += `<div class="autocomplete-category"><h4>${categoria}</h4>`;
      items.forEach((item) => {
        html += `
                    <div class="autocomplete-item">
                        <div class="autocomplete-item-content">
                            <div class="autocomplete-item-nome">${item.nome}</div>
                            <div class="autocomplete-item-desc">${item.descricao}</div>
                        </div>
                        <button class="btn-icon-sm btn-icon-delete" onclick="ui.removeAutocompleteItem('${categoria}', '${this._esc(item.nome)}')" style="margin-left: 8px;">✕</button>
                    </div>
                `;
      });
      html += "</div>";
    });
    container.innerHTML = html;
  }

  removeAutocompleteItem(categoria, nome) {
    if (confirm(`Remover o atalho "${nome}"?`)) {
      storage.removeAutocompleteItem(categoria, nome);
      this.renderAutocompleteList();
    }
  }

  setupAutocompleteListener(inputElement) {
    if (inputElement._autocomplete_active) return;
    inputElement._autocomplete_active = true;

    inputElement.addEventListener("keydown", (e) => {
      if (e.key === "\\") {
        e.preventDefault();
        setTimeout(() => {
          this.showAutocompleteMenu(inputElement, "");
        }, 10);
      }
    });

    inputElement.addEventListener("input", (e) => {
      const menu = document.querySelector(".autocomplete-menu");
      if (menu && menu._target === inputElement) {
        const start = inputElement.selectionStart;
        const textBefore = inputElement.value.substring(0, start);
        const lastBackslash = textBefore.lastIndexOf("\\");
        if (lastBackslash !== -1) {
          const query = textBefore.substring(lastBackslash + 1);
          this.showAutocompleteMenu(inputElement, query);
        } else {
          menu.remove();
        }
      }
    });

    // Fechar menu ao clicar fora
    document.addEventListener("click", (e) => {
      const menu = document.querySelector(".autocomplete-menu");
      if (menu && !menu.contains(e.target)) {
        menu.remove();
      }
    });
  }

  showAutocompleteMenu(inputElement, query) {
    const results = query
      ? storage.searchAutocomplete(query)
      : Object.entries(storage.getAutocompleteData()).flatMap(([cat, items]) =>
        items.map((item) => ({
          categoria: cat,
          nome: item.nome,
          descricao: item.descricao,
        })),
      );

    let existingMenu = document.querySelector(".autocomplete-menu");
    if (results.length === 0) {
      if (existingMenu) existingMenu.remove();
      return;
    }

    let menuHtml = "";
    results.forEach((result) => {
      menuHtml += `
                <div class="autocomplete-menu-item" data-value="${this._esc(result.descricao)}">
                    <div class="autocomplete-menu-item-info">
                        <strong>${result.nome}</strong>
                        <small>(${result.categoria})</small>
                    </div>
                    <button class="btn-insert-shortcut" title="Inserir atalho">
                        <i class="fas fa-plus"></i> Inserir
                    </button>
                </div>`;
    });

    if (existingMenu) {
      existingMenu.innerHTML = menuHtml;
      existingMenu._target = inputElement;
      this._attachMenuItemListeners(existingMenu);
    } else {
      const menuEl = document.createElement("div");
      menuEl.className = "autocomplete-menu";
      menuEl.innerHTML = menuHtml;
      menuEl._target = inputElement;

      const rect = inputElement.getBoundingClientRect();
      menuEl.style.position = "fixed";
      menuEl.style.top = `${rect.bottom + window.scrollY}px`;
      menuEl.style.left = `${rect.left + window.scrollX}px`;
      menuEl.style.width = `${rect.width}px`;
      menuEl.style.zIndex = "10000";

      this._attachMenuItemListeners(menuEl);
      document.body.appendChild(menuEl);
    }
  }

  _attachMenuItemListeners(menuEl) {
    menuEl.querySelectorAll(".autocomplete-menu-item").forEach((item) => {
      // Clique no item todo ou no botão de inserir
      item.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const value = item.getAttribute("data-value");
        this.insertAutocomplete(menuEl._target, value);
      });

      const btn = item.querySelector(".btn-insert-shortcut");
      if (btn) {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const value = item.getAttribute("data-value");
          this.insertAutocomplete(menuEl._target, value);
        });
      }
    });
  }

  insertAutocomplete(inputElement, value) {
    if (!inputElement) return;

    const start = inputElement.selectionStart;
    const textBefore = inputElement.value.substring(0, start);
    const lastBackslash = textBefore.lastIndexOf("\\");

    // Se não encontrar a barra invertida, insere na posição atual do cursor
    let before, after;
    if (lastBackslash === -1) {
      before = textBefore;
      after = inputElement.value.substring(start);
    } else {
      before = inputElement.value.substring(0, lastBackslash);
      after = inputElement.value.substring(start);
    }

    inputElement.value = before + value + after;

    // Disparar evento de input para que o sistema perceba a mudança
    inputElement.dispatchEvent(new Event("input", { bubbles: true }));

    inputElement.focus();
    inputElement.setSelectionRange(
      before.length + value.length,
      before.length + value.length,
    );

    const menu = document.querySelector(".autocomplete-menu");
    if (menu) menu.remove();
  }

  openSearch() {
    document.getElementById("search-modal").style.display = "flex";
  }

  performSearch(query) {
    const results = storage.search(query);
    const resultsDiv = document.getElementById("search-results");
    resultsDiv.innerHTML = "";

    if (results.length === 0) {
      resultsDiv.innerHTML =
        '<p style="color: var(--text-muted); text-align: center;">Nenhum resultado encontrado</p>';
      return;
    }

    results.forEach((result) => {
      const div = document.createElement("div");
      div.className = "search-result";
      div.innerHTML = `<strong>${result.subtipo}</strong> (${result.processo})<br><small>${result.descricao}</small>`;
      div.addEventListener("click", () => {
        this.selectSubtype(result.processo, result.subtipo);
        document.getElementById("search-modal").style.display = "none";
      });
      resultsDiv.appendChild(div);
    });
  }

  filterProcessos(query) {
    const q = query.toLowerCase();
    document.querySelectorAll(".processo-section").forEach((section) => {
      const cards = section.querySelectorAll(".processo-card");
      let hasVisible = false;
      cards.forEach((card) => {
        const title = card
          .querySelector(".processo-title")
          .textContent.toLowerCase();
        const desc = card
          .querySelector(".processo-description")
          .textContent.toLowerCase();
        const visible = title.includes(q) || desc.includes(q);
        card.style.display = visible ? "flex" : "none";
        if (visible) hasVisible = true;
      });
      section.style.display = hasVisible ? "block" : "none";
    });
  }

  addEtapaCriacao() {
    this.etapasEmCriacao.push({
      nome: `Etapa ${this.etapasEmCriacao.length + 1}`,
      tipo: "texto",
      texto: "",
      obs: "",
    });
    this._renderFluxoBuilder();
  }

  confirmarEdicaoEtapa(index) {
    this.etapaEditandoIndex = null;
    this._renderFluxoBuilder();
  }

  cancelarEdicaoEtapa() {
    this.etapaEditandoIndex = null;
    this._renderFluxoBuilder();
  }

  confirmarExcluirEtapa(index) {
    if (confirm("Tem certeza que deseja excluir esta etapa?")) {
      this.etapasEmCriacao.splice(index, 1);
      this.etapaEditandoIndex = null;
      this._renderFluxoBuilder();
    }
  }

  saveNovoFluxo() {
    const processo = document.getElementById("form-processo").value.trim();
    const subtipo = document.getElementById("form-subtipo").value.trim();
    const descricao = document.getElementById("form-descricao").value.trim();

    if (!processo || !subtipo) {
      alert("Preencha o nome do processo e subtipo");
      return;
    }

    if (this.etapasEmCriacao.length === 0) {
      alert("Adicione pelo menos uma etapa");
      return;
    }

    storage.addFluxo(processo, subtipo, descricao, this.etapasEmCriacao, this.visualizacaoEmCriacao);
    alert("Fluxo salvo com sucesso!");

    this.isEditingSavedFluxo = false;
    this.etapasEmCriacao = [];
    this.etapaEditandoIndex = null;
    this.updateStats();
    this.goToPage("home");
  }

  restoreBackup(e) {
    const file = e.target.files[0];
    if (!file) return;

    storage
      .importBackup(file)
      .then(() => {
        alert("Backup restaurado com sucesso!");
        this.updateStats();
        this.renderHome();
      })
      .catch((err) => {
        alert("Erro ao restaurar backup: " + err.message);
      });
  }

  updateStats() {
    const stats = storage.getStats();
    document.getElementById("stat-processos").textContent = stats.processos;
    document.getElementById("stat-etapas").textContent = stats.etapas;
    document.getElementById("stat-tamanho").textContent = stats.tamanho;

    const atalhosEl = document.getElementById("stat-atalhos");
    if (atalhosEl) atalhosEl.textContent = stats.atalhos || 0;

    const decisoesEl = document.getElementById("stat-decisoes");
    if (decisoesEl) decisoesEl.textContent = stats.decisoes || 0;
  }
  downloadFluxoPNG() {
    const svgElement = document.querySelector("#mermaid-graph svg");
    if (!svgElement) {
      alert("Fluxograma ainda não foi renderizado!");
      return;
    }

    const width = svgElement.clientWidth;
    const height = svgElement.clientHeight;

    const clone = svgElement.cloneNode(true);
    clone.setAttribute("width", width);
    clone.setAttribute("height", height);

    const svgData = new XMLSerializer().serializeToString(clone);

    // 🔥 Converter para base64 (EVITA TAINTED CANVAS)
    const svgBase64 = btoa(unescape(encodeURIComponent(svgData)));
    const imgSrc = `data:image/svg+xml;base64,${svgBase64}`;

    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");

      // Fundo branco
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      ctx.drawImage(img, 0, 0);

      const png = canvas.toDataURL("image/png");

      const link = document.createElement("a");
      link.download = `fluxograma-${this.currentSubtype || "processo"}.png`;
      link.href = png;
      link.click();
    };

    img.src = imgSrc;
  }

  importData(mode) {
    document.getElementById("file-import").click();
    this.importMode = mode; // Salvar o modo de importação
  }

  async restoreBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      await storage.importBackup(file);
      alert("Backup restaurado com sucesso!");
      this.goToPage("home");
      this.updateStats();
    } catch (error) {
      alert("Erro ao restaurar backup: " + error.message);
    }

    // Limpar o input
    event.target.value = "";
  }

  async importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          const currentData = storage.getAllProcessos();

          let finalData;
          if (this.importMode === 'replace') {
            finalData = importedData;
          } else if (this.importMode === 'merge') {
            finalData = { ...currentData };
            // Mesclar dados: adicionar processos e subtipos que não existem
            Object.entries(importedData).forEach(([processo, subtipos]) => {
              if (!finalData[processo]) {
                finalData[processo] = {};
              }
              Object.entries(subtipos).forEach(([subtipo, fluxo]) => {
                if (!finalData[processo][subtipo]) {
                  finalData[processo][subtipo] = fluxo;
                }
              });
            });
          }

          storage.set(finalData);
          alert(`Dados importados com sucesso no modo "${this.importMode === 'replace' ? 'Substituir Tudo' : 'Adicionar aos Existentes'}"!`);
          this.goToPage("home");
          this.updateStats();
        } catch (error) {
          alert("Erro ao importar dados: " + error.message);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      alert("Erro ao ler arquivo: " + error.message);
    }

    // Limpar o input
    event.target.value = "";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.ui = new UI();
  document.documentElement.classList.remove("dark");
});
