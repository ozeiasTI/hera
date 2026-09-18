/**
 * HERA - UI Manager
 * Gerencia navegação, renderização e interações da interface
 */

class UI {
  constructor() {
    this.currentPage = "home";
    this.currentProcess = null;
    this.currentSubtype = null;
    this.currentEtapa = null;
    this.fullscreenMode = false;
    this.zoomLevel = 1;
    this.compareFluxoTarget = null;
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
          "HERA v1.0\n\nSistema de gerenciamento de fluxos processuais.\n\nDesenvolvido por: Ozeias Souza e Gustavo Sales",
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
    document
      .getElementById("btn-view-linha")
      .addEventListener("click", () => this.switchView("linha"));
    document
      .getElementById("btn-view-execucao")
      .addEventListener("click", () => this.switchView("execucao"));
    document
      .getElementById("btn-zoom-in")
      .addEventListener("click", () => this.adjustZoom(0.1));
    document
      .getElementById("btn-zoom-out")
      .addEventListener("click", () => this.adjustZoom(-0.1));
    document
      .getElementById("btn-zoom-reset")
      .addEventListener("click", () => this.resetZoom());
    document
      .getElementById("btn-fullscreen")
      .addEventListener("click", () => this.toggleFullscreen());
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
        title: "Bem-vindo ao HERA",
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
      hera: {
        title: "Sobre o HERA",
        subtitle: "A origem do nome e sua relação com fluxos e processos",
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
    a.download = `hera_export_${new Date().getTime()}.json`;
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
        <title>Relatório de Fluxos HERA</title>
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
          <p>Sistema HERA v1.0 • Gerado em ${new Date().toLocaleString('pt-BR')}</p>
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
                ${etapa.opcoes ? `➔ Decisões: ${Object.entries(etapa.opcoes).map(([label, config]) => { const target = this._getOpcaoDestino(config); return `<br>&nbsp;&nbsp;&nbsp;• ${label} ➔ ${fluxo.etapas[target]?.nome || target}`; }).join('')}` : ''}
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
          <p>HERA v1.0 - Desenvolvido por Ozeias Souza e Gustavo Sales</p>
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
    this.fluxoPrazo = fluxo.prazo || "";
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
    } else if (view === "fluxo") {
      document.getElementById("view-fluxo-container").classList.add("active");
      document.getElementById("btn-view-fluxo").classList.add("active");
      this.renderFluxograma();
    } else if (view === "linha") {
      document.getElementById("view-linha-container").classList.add("active");
      document.getElementById("btn-view-linha").classList.add("active");
      this.renderLinhaDoTempo();
    } else if (view === "execucao") {
      document.getElementById("view-execucao-container").classList.add("active");
      document.getElementById("btn-view-execucao").classList.add("active");
      this.renderExecucao();
    }
  }

  toggleFullscreen() {
    this.fullscreenMode = !this.fullscreenMode;
    document.body.classList.toggle("fullscreen-mode", this.fullscreenMode);

    const btn = document.getElementById("btn-fullscreen");
    if (btn) btn.textContent = this.fullscreenMode ? "✕ Sair tela cheia" : "🖥️ Tela cheia";

    if (this.fullscreenMode) {
      document.addEventListener("keydown", this._handleFullscreenKeydown);
    } else {
      document.removeEventListener("keydown", this._handleFullscreenKeydown);
    }
  }

  _handleFullscreenKeydown = (event) => {
    if (!this.fullscreenMode) return;
    if (event.target && ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) return;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      this.avancarEtapaFullScreen();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      this.voltarEtapaFullScreen();
    }
  };

  avancarEtapaFullScreen() {
    const fluxo = storage.getSubtipo(this.currentProcess, this.currentSubtype);
    if (!fluxo) return;
    const keys = this._getEtapasOrdemGrafo(fluxo);
    const index = keys.indexOf(this.currentEtapa);
    if (index >= 0 && index < keys.length - 1) {
      this.currentEtapa = keys[index + 1];
      this.renderDetalhes();
    }
  }

  voltarEtapaFullScreen() {
    const fluxo = storage.getSubtipo(this.currentProcess, this.currentSubtype);
    if (!fluxo) return;
    const keys = this._getEtapasOrdemGrafo(fluxo);
    const index = keys.indexOf(this.currentEtapa);
    if (index > 0) {
      this.currentEtapa = keys[index - 1];
      this.renderDetalhes();
    }
  }

  renderLinhaDoTempo() {
    const fluxo = storage.getSubtipo(this.currentProcess, this.currentSubtype);
    const container = document.getElementById("linha-do-tempo");
    if (!fluxo || !container) return;

    container.innerHTML = this._getEtapasOrdemGrafo(fluxo).map((key, index) => {
      const etapa = fluxo.etapas[key];
      const destino = etapa.proximo ? fluxo.etapas[etapa.proximo] : null;
      return `
        <article class="timeline-step">
          <div class="timeline-marker">${index + 1}</div>
          <div class="timeline-card">
            <div class="etapa-tipo">${this._getTipoLabel(etapa.tipo)}</div>
            <h3>${this._esc(etapa.nome)}</h3>
            ${etapa.tipo === "texto" && etapa.texto ? `<div class="timeline-text">${this._sanitizarHtml(etapa.texto)}</div>` : ""}
            <button class="btn btn-sm btn-secondary" onclick="ui.selectEtapa('${key}'); ui.switchView('lista')">Abrir etapa</button>
            <div class="timeline-next">${destino ? `Depois: ${this._esc(destino.nome)}` : "Fim do fluxo"}</div>
          </div>
        </article>`;
    }).join("");
  }

  renderExecucao() {
    const fluxo = storage.getSubtipo(this.currentProcess, this.currentSubtype);
    const container = document.getElementById("execucao-board");
    if (!fluxo || !container) return;

    const progresso = this._getExecucaoProgresso();
    const ordem = this._getEtapasOrdemGrafo(fluxo);
    const grupos = {
      todo: [],
      doing: [],
      done: [],
    };

    ordem.forEach((key) => {
      const etapa = fluxo.etapas[key];
      const estado = progresso[key] || "todo";
      grupos[estado].push({
        key,
        nome: etapa.nome,
        tipo: this._getTipoLabel(etapa.tipo),
      });
    });

    const labels = {
      todo: "A Fazer",
      doing: "Em Andamento",
      done: "Concluído",
    };

    const totalEtapas = ordem.length || 1;
    const concluidas = grupos.done.length;
    const percentual = Math.round((concluidas / totalEtapas) * 100);

    const percentualEl = document.getElementById("execucao-percentual");
    const remainingEl = document.getElementById("execucao-remaining");
    const progressFill = document.getElementById("execucao-progress-fill");

    if (percentualEl) percentualEl.textContent = `${percentual}%`;
    if (remainingEl) remainingEl.textContent = `${Math.max(totalEtapas - concluidas, 0)} etapas restantes`;
    if (progressFill) progressFill.style.width = `${percentual}%`;

    container.innerHTML = Object.entries(grupos).map(([estado, etapas]) => `
      <div class="execucao-coluna" data-estado="${estado}">
        <div class="execucao-cabecalho">${labels[estado]}</div>
        <div class="execucao-lista">
          ${etapas.length ? etapas.map((etapa) => `
            <div class="execucao-card" draggable="true" data-etapa-key="${etapa.key}">
              <div class="execucao-card-topo">
                <span class="execucao-tag">${etapa.tipo}</span>
                <button class="execucao-card-btn" data-etapa-key="${etapa.key}" title="Abrir etapa">↗</button>
              </div>
              <strong>${this._esc(etapa.nome)}</strong>
            </div>
          `).join("") : '<div class="execucao-vazia">Sem etapas</div>'}
        </div>
      </div>
    `).join("");

    container.querySelectorAll(".execucao-card").forEach((card) => {
      card.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData("text/plain", card.dataset.etapaKey);
      });
      card.querySelector(".execucao-card-btn").addEventListener("click", () => {
        this.currentEtapa = card.dataset.etapaKey;
        this.renderDetalhes();
        this.switchView("lista");
      });
    });

    container.querySelectorAll(".execucao-coluna").forEach((coluna) => {
      coluna.addEventListener("dragover", (event) => event.preventDefault());
      coluna.addEventListener("drop", (event) => {
        event.preventDefault();
        const etapaKey = event.dataTransfer.getData("text/plain");
        const novoEstado = coluna.dataset.estado;
        if (!etapaKey || !novoEstado) return;
        this._setExecucaoProgresso(etapaKey, novoEstado);
        this.renderExecucao();
      });
    });
  }

  _getExecucaoStorageKey() {
    return `hera_execucao_${this.currentProcess}_${this.currentSubtype}`;
  }

  _getExecucaoProgresso() {
    const storageKey = this._getExecucaoStorageKey();
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "{}") || {};
    } catch (error) {
      return {};
    }
  }

  _setExecucaoProgresso(etapaKey, estado) {
    const progresso = this._getExecucaoProgresso();
    progresso[etapaKey] = estado;
    localStorage.setItem(this._getExecucaoStorageKey(), JSON.stringify(progresso));
  }

  adjustZoom(value) {
    const container = document.getElementById("mermaid-graph");
    if (!container) return;

    this.zoomLevel = Math.min(1.8, Math.max(0.7, Number((this.zoomLevel + value).toFixed(2))));
    container.style.transform = `scale(${this.zoomLevel})`;
    const label = document.getElementById("fluxo-zoom-level");
    if (label) label.textContent = `${Math.round(this.zoomLevel * 100)}%`;
  }

  resetZoom() {
    this.zoomLevel = 1;
    const container = document.getElementById("mermaid-graph");
    if (container) container.style.transform = "scale(1)";
    const label = document.getElementById("fluxo-zoom-level");
    if (label) label.textContent = "100%";
  }

  renderFluxograma() {
    const fluxo = storage.getSubtipo(this.currentProcess, this.currentSubtype);
    if (!fluxo) return;

    const container = document.getElementById("mermaid-graph");
    container.removeAttribute("data-processed");
    this.resetZoom();

    const visualizacao = { ...this._getDefaultVisualizacao(), ...(fluxo.visualizacao || {}), ...this.visualizacaoEmCriacao };
    this.visualizacaoEmCriacao = visualizacao;
    this._syncVisualizacaoControls();
    let definition = `graph ${visualizacao.direcao}\n`;
    let edgeIndex = 0;

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
      if (etapa.tipo === "decisao") {
        definition += `  ${id}{"${nome}"}\n`;
        definition += `  class ${id} decisao\n`;
      } else {
        const shape = { rect: `["${nome}"]`, rounded: `("${nome}")`, stadium: `(["${nome}"])`, hexagon: `{{"${nome}"}}` }[visualizacao.formato] || `["${nome}"]`;
        definition += `  ${id}${shape}\n`;
        if (index === 0) definition += `  class ${id} inicio\n`;
      }

      // Conexões
      if (etapa.tipo === "decisao") {
        if (etapa.opcoes) {
          Object.entries(etapa.opcoes).forEach(([label, opcaoConfig]) => {
            const target = this._getOpcaoDestino(opcaoConfig);
            if (target) {
              const targetId = target.replace("etapa_", "E");
              definition += `  ${id} -- "${label}" --> ${targetId}\n`;
              const cor = this._getOpcaoCor(opcaoConfig);
              if (cor) definition += `  linkStyle ${edgeIndex} stroke:${cor},stroke-width:2px\n`;
              edgeIndex += 1;
            }
          });
        }
      } else if (etapa.proximo) {
        const targetId = etapa.proximo.replace("etapa_", "E");
        definition += `  ${id} --> ${targetId}\n`;
        edgeIndex += 1;
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

    if (fluxo.prazo) {
      html += `<div class="triagem-meta"><strong>Prazo do processo:</strong> ${this._esc(fluxo.prazo)}</div>`;
    }

    if (etapa.tipo === "texto") {
      html += `
                <div class="etapa-content">${this._sanitizarHtml(etapa.texto || "")}</div>
                <button class="btn btn-primary" onclick="ui.copiarTextoEtapa()">
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
      Object.entries(etapa.opcoes || {}).forEach(([opcao, opcaoConfig]) => {
        const proxima = this._getOpcaoDestino(opcaoConfig);
        const cor = this._getOpcaoCor(opcaoConfig);
        const isYes =
          opcao.toLowerCase() === "sim" ||
          opcao.toLowerCase() === "yes" ||
          opcao.toLowerCase() === "ok";
        html += `
                    <button class="btn-decision ${isYes ? "yes" : "no"}" style="background:${cor || ""}" onclick="ui.selectEtapa('${proxima}')">
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
                <div class="triagem-viewer">
                    ${etapa.descricaoTriagem ? `<div class="etapa-content">${this._sanitizarHtml(etapa.descricaoTriagem)}</div>` : ""}
                    <div class="triagem-checklist">
            `;
      (etapa.itensTriagem || []).forEach((item, idx) => {
        const itemData = typeof item === "string" ? { titulo: item } : item;
        html += `
                    <label class="triagem-check-item">
                        <input type="checkbox" class="checklist-checkbox" id="triagem-item-${idx}">
                        <span><strong>${this._esc(itemData.titulo || "Item sem título")}${itemData.obrigatorio ? " *" : ""}</strong>${itemData.detalhes ? `<small>${this._esc(itemData.detalhes)}</small>` : ""}</span>
                    </label>
                `;
      });
      html += `</div>${etapa.observacoesTriagem ? `<div class="etapa-alert info"><strong>Observações:</strong><br>${this._esc(etapa.observacoesTriagem)}</div>` : ""}</div>`;
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

    if (etapa.proximo && etapa.tipo !== "decisao") {
      html += `
                <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border);">
                    <button class="btn btn-primary" onclick="ui.selectEtapa('${etapa.proximo}')">
                        Próxima Etapa →
                    </button>
                </div>
            `;
    }

    if (viewer) viewer.innerHTML = html;
  }

  copiarTextoEtapa() {
    const fluxo = storage.getSubtipo(this.currentProcess, this.currentSubtype);
    const etapa = fluxo?.etapas?.[this.currentEtapa];
    const texto = etapa ? new DOMParser().parseFromString(this._sanitizarHtml(etapa.texto || ""), "text/html").body.textContent : "";
    navigator.clipboard.writeText(texto).then(() => alert("Copiado!"));
  }

  _getTipoLabel(tipo) {
    const labels = {
      texto: "📝 Texto / Modelo",
      anexo: "📎 Anexo",
      decisao: "🔀 Decisão",
      link: "🔗 Link Externo",
      alerta: "⚠️ Alerta / Aviso",
      triagem: "🔍 Triagem de Solicitação",
      email: "📧 E-mail",
      contato: "👥 Contatos",
      reuniao: "📅 Reunião/Agendamento",
      checklist: "✅ Checklist de Documentos",
    };
    return labels[tipo] || tipo;
  }

  _getOpcaoDestino(config) {
    return typeof config === "string" ? config : (config?.destino || "");
  }

  _getOpcaoCor(config) {
    const cor = typeof config === "object" ? config.cor || "" : "";
    return /^#[0-9a-f]{6}$/i.test(cor) ? cor : "";
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
          ...(etapa.descricaoTriagem && { descricaoTriagem: etapa.descricaoTriagem }),
          ...(etapa.observacoesTriagem && { observacoesTriagem: etapa.observacoesTriagem }),
          ...(etapa.itensTriagem && { itensTriagem: etapa.itensTriagem }),
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
    document.getElementById("form-prazo").value = fluxo.prazo || "";

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

      storage.addFluxo(processo, novoSubtipo, fluxo.descricao, etapasArray, fluxo.visualizacao, fluxo.prazo || "");
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
      document.getElementById("form-prazo").value = "";
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
                  <button class="btn-icon-sm" title="Mover etapa para cima" onclick="ui.moverEtapa(${index}, -1)" ${index === 0 ? "disabled" : ""}>↑</button>
                  <button class="btn-icon-sm" title="Mover etapa para baixo" onclick="ui.moverEtapa(${index}, 1)" ${index === this.etapasEmCriacao.length - 1 ? "disabled" : ""}>↓</button>
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
                    <option value="triagem" ${etapa.tipo === "triagem" ? "selected" : ""}>🔍 Triagem de Solicitação</option>
                    <option value="link"    ${etapa.tipo === "link" ? "selected" : ""}>🔗 Link Externo</option>
                    <option value="alerta"  ${etapa.tipo === "alerta" ? "selected" : ""}>⚠️ Alerta / Aviso</option>
                    <option value="email"   ${etapa.tipo === "email" ? "selected" : ""}>📧 E-mail</option>
                    <option value="contato" ${etapa.tipo === "contato" ? "selected" : ""}>👥 Contatos</option>
                    <option value="reuniao" ${etapa.tipo === "reuniao" ? "selected" : ""}>📅 Reunião/Agendamento</option>
                    <option value="checklist" ${etapa.tipo === "checklist" ? "selected" : ""}>✅ Checklist de Documentos</option>
                </select>
            </div>

            <div id="editor-campos-extras-${index}">
              ${this._buildEtapaAnteriorControl(index)}
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
                    <div class="rich-toolbar" role="toolbar">
                      <button type="button" class="btn-icon-sm" title="Negrito" onclick="ui.formatarTexto('bold', ${index})"><strong>B</strong></button>
                      <button type="button" class="btn-icon-sm" title="Itálico" onclick="ui.formatarTexto('italic', ${index})"><em>I</em></button>
                      <button type="button" class="btn-icon-sm" title="Sublinhado" onclick="ui.formatarTexto('underline', ${index})"><u>U</u></button>
                      <button type="button" class="btn-icon-sm" title="Tachado" onclick="ui.formatarTexto('strikeThrough', ${index})"><s>S</s></button>
                      <button type="button" class="btn-icon-sm" title="Aumentar texto" onclick="ui.formatarTexto('increaseFontSize', ${index})">A+</button>
                      <button type="button" class="btn-icon-sm" title="Diminuir texto" onclick="ui.formatarTexto('decreaseFontSize', ${index})">A-</button>
                      <button type="button" class="btn-icon-sm" title="Centralizar" onclick="ui.formatarTexto('justifyCenter', ${index})">≡</button>
                      <input type="color" title="Cor do texto" onchange="ui.formatarTexto('foreColor', ${index}, this.value)" value="#222222">
                    </div>
                    <div class="rich-editor" id="editor-texto-${index}" contenteditable="true" data-placeholder="Digite o texto ou modelo do documento..." oninput="ui._atualizarCampo(${index}, 'texto', this.innerHTML)">${this._sanitizarHtml(etapa.texto || "")}</div>
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
      const itensHtml = this._buildTriagemItens(index, etapa.itensTriagem || []);
      return `
                <div class="form-group">
            <label>O que deve ser analisado</label>
            <textarea class="textarea" id="editor-descricao-triagem-${index}" placeholder="Ex: Conferir os dados do ofício de visita, público e logística..." oninput="ui._atualizarCampo(${index}, 'descricaoTriagem', this.value)">${this._esc(etapa.descricaoTriagem || "")}</textarea>
                </div>
                <div class="form-group">
            <label>Itens da triagem</label>
            <div id="triagem-itens-${index}" class="triagem-editor-list">
              ${itensHtml}
                    </div>
            <button type="button" class="btn btn-sm btn-secondary" onclick="ui._addTriagemItem(${index})">+ Adicionar item de análise</button>
          </div>
          <div class="form-group">
            <label>Observações e critérios</label>
            <textarea class="textarea" placeholder="Registre critérios, cuidados ou informações que não são itens..." oninput="ui._atualizarCampo(${index}, 'observacoesTriagem', this.value)">${this._esc(etapa.observacoesTriagem || "")}</textarea>
          </div>
          <div class="form-group">
            <label>Próxima Etapa</label>
            <select class="select" onchange="ui._atualizarCampo(${index}, 'proximo', this.value)">
              <option value="">Nenhuma (Fim do Fluxo)</option>
              ${this._buildEtapasOptions(index, etapa.proximo)}
            </select>
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

  _buildEtapaAnteriorControl(indexAtual) {
    const anterior = this.etapasEmCriacao.findIndex((etapa, index) => index !== indexAtual && etapa.proximo === `etapa_${indexAtual}`);
    return `
      <div class="form-group">
        <label>Etapa anterior (quem chega até esta etapa)</label>
        <select class="select" onchange="ui._vincularAnterior(${indexAtual}, this.value)">
          <option value="">Nenhuma (início ou ligação manual)</option>
          ${this._buildEtapasOptions(indexAtual, anterior >= 0 ? `etapa_${anterior}` : "")}
        </select>
      </div>`;
  }

  _buildTriagemItens(index, itens) {
    return itens.map((item, itemIndex) => {
      const itemData = typeof item === "string" ? { titulo: item, detalhes: "", obrigatorio: false } : item;
      return `
        <div class="triagem-editor-item">
          <input class="input" value="${this._esc(itemData.titulo || "")}" placeholder="Ex: Data pretendida da visita" oninput="ui._atualizarTriagemItem(${index}, ${itemIndex}, 'titulo', this.value)">
          <input class="input" value="${this._esc(itemData.detalhes || "")}" placeholder="Detalhes ou evidência esperada" oninput="ui._atualizarTriagemItem(${index}, ${itemIndex}, 'detalhes', this.value)">
          <label class="triagem-required"><input type="checkbox" ${itemData.obrigatorio ? "checked" : ""} onchange="ui._atualizarTriagemItem(${index}, ${itemIndex}, 'obrigatorio', this.checked)"> Obrigatório</label>
          <button type="button" class="btn-icon-sm btn-icon-delete" onclick="ui._removerTriagemItem(${index}, ${itemIndex})" title="Remover item">✕</button>
        </div>`;
    }).join("");
  }

  _addTriagemItem(index) {
    if (!this.etapasEmCriacao[index].itensTriagem) this.etapasEmCriacao[index].itensTriagem = [];
    this.etapasEmCriacao[index].itensTriagem.push({ titulo: "", detalhes: "", obrigatorio: false });
    this._renderFluxoBuilder();
  }

  _atualizarTriagemItem(index, itemIndex, campo, valor) {
    const itens = this.etapasEmCriacao[index]?.itensTriagem;
    if (!itens || !itens[itemIndex]) return;
    if (typeof itens[itemIndex] === "string") itens[itemIndex] = { titulo: itens[itemIndex], detalhes: "", obrigatorio: false };
    itens[itemIndex][campo] = valor;
  }

  _removerTriagemItem(index, itemIndex) {
    this.etapasEmCriacao[index]?.itensTriagem?.splice(itemIndex, 1);
    this._renderFluxoBuilder();
  }

  _vincularAnterior(indexAtual, origem) {
    this.etapasEmCriacao.forEach((etapa, index) => {
      if (etapa.proximo === `etapa_${indexAtual}`) etapa.proximo = null;
      if (origem && `etapa_${index}` === origem && etapa.tipo !== "decisao") {
        etapa.proximo = `etapa_${indexAtual}`;
      }
    });
    this._renderFluxoBuilder();
  }

  _buildOpcoesList(index, opcoes) {
    return Object.entries(opcoes)
      .map(
        ([opcao, config], oIdx) => {
          const destino = this._getOpcaoDestino(config);
          const cor = this._getOpcaoCor(config) || "#dc3545";
          return `
            <div class="opcao-item">
                <input type="text" class="input" style="flex:1;" value="${this._esc(opcao)}" placeholder="Nome da opção" onchange="ui._renomearOpcao(${index}, ${oIdx}, this.value)">
                <select class="select" style="flex:1;margin-left:8px;" onchange="ui._vincularOpcao(${index}, ${oIdx}, this.value)">
                    <option value="">Nenhuma (Fim)</option>
                    ${this._buildEtapasOptionsForOpcao(index, destino)}
                </select>
                <input type="color" class="opcao-cor" value="${this._esc(cor)}" title="Cor desta opção" onchange="ui._colorirOpcao(${index}, ${oIdx}, this.value)">
                <button type="button" class="btn-icon-sm btn-icon-delete" onclick="ui._removerOpcao(${index}, ${oIdx})" style="margin-left:8px;">✕</button>
            </div>
        `;
        },
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
    if (keys[oIdx]) {
      const atual = opcoes[keys[oIdx]];
      opcoes[keys[oIdx]] = { destino, cor: this._getOpcaoCor(atual) || "#dc3545" };
    }
  }

  _colorirOpcao(index, oIdx, cor) {
    const opcoes = this.etapasEmCriacao[index].opcoes;
    const keys = Object.keys(opcoes);
    if (!keys[oIdx]) return;
    const atual = opcoes[keys[oIdx]];
    opcoes[keys[oIdx]] = { destino: this._getOpcaoDestino(atual), cor };
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

  _sanitizarHtml(html) {
    const template = document.createElement("template");
    template.innerHTML = String(html || "");
    template.content.querySelectorAll("script, style, iframe, object, embed").forEach((node) => node.remove());
    template.content.querySelectorAll("*").forEach((node) => {
      [...node.attributes].forEach((attribute) => {
        if (attribute.name.startsWith("on") || (attribute.name === "style" && !/^color\s*:\s*#[0-9a-f]{3,8}\s*;?$/i.test(attribute.value))) {
          node.removeAttribute(attribute.name);
        }
      });
    });
    return template.innerHTML;
  }

  formatarTexto(comando, index, valor) {
    const editor = document.getElementById(`editor-texto-${index}`);
    if (!editor) return;
    editor.focus();
    if (comando === "increaseFontSize" || comando === "decreaseFontSize") {
      document.execCommand("fontSize", false, comando === "increaseFontSize" ? "5" : "2");
    } else {
      document.execCommand(comando, false, valor);
    }
    this._atualizarCampo(index, "texto", editor.innerHTML);
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
    } else if (novoTipo === "decisao") {
      etapa.pergunta = "";
      etapa.opcoes = {
        Sim: { destino: "etapa_X", cor: "#198754" },
        Não: { destino: "etapa_Y", cor: "#dc3545" },
      };
    } else if (novoTipo === "triagem") {
      etapa.descricaoTriagem = "";
      etapa.observacoesTriagem = "";
      etapa.itensTriagem = [];
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

  moverEtapa(index, direcao) {
    const destino = index + direcao;
    if (destino < 0 || destino >= this.etapasEmCriacao.length) return;

    const etapaAnterior = this.etapasEmCriacao[index];
    const etapaDestino = this.etapasEmCriacao[destino];
    const remapear = (referencia) => {
      if (!referencia) return referencia;
      const numero = Number(referencia.replace("etapa_", ""));
      if (numero === index) return `etapa_${destino}`;
      if (numero === destino) return `etapa_${index}`;
      return referencia;
    };

    [this.etapasEmCriacao[index], this.etapasEmCriacao[destino]] = [etapaDestino, etapaAnterior];
    this.etapasEmCriacao.forEach((etapa) => {
      etapa.proximo = remapear(etapa.proximo);
      if (etapa.opcoes) {
        Object.keys(etapa.opcoes).forEach((chave) => {
          const opcao = etapa.opcoes[chave];
          if (typeof opcao === "object") opcao.destino = remapear(opcao.destino);
          else etapa.opcoes[chave] = remapear(opcao);
        });
      }
    });
    this.etapaEditandoIndex = null;
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
    this.fluxoPrazo = document.getElementById("form-prazo").value.trim();

    if (!processo || !subtipo) {
      alert("Preencha o nome do processo e subtipo");
      return;
    }

    if (this.etapasEmCriacao.length === 0) {
      alert("Adicione pelo menos uma etapa");
      return;
    }

    storage.addFluxo(processo, subtipo, descricao, this.etapasEmCriacao, this.visualizacaoEmCriacao, this.fluxoPrazo || "");
    alert("Fluxo salvo com sucesso!");

    this.isEditingSavedFluxo = false;
    this.etapasEmCriacao = [];
    this.etapaEditandoIndex = null;
    this.updateStats();
    this.goToPage("home");
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
