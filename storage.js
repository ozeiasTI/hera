/**
 * SEI PLUS - Storage Manager
 * Gerencia dados com localStorage e funcionalidades avançadas
 */

class Storage {
    constructor() {
        this.key = 'seiplus_pro_data';
        this.autocompleteKey = 'seiplus_autocomplete';
        this.configKey = 'seiplus_config';
        this.init();
    }

    init() {
        if (!this.get()) {
            this.set(this.getDefaultData());
        }
    }

    get() {
        const data = localStorage.getItem(this.key);
        return data ? JSON.parse(data) : null;
    }

    set(data) {
        localStorage.setItem(this.key, JSON.stringify(data));
    }

    getDefaultData() {
        return {};
    }

    getAllProcessos() {
        const data = this.get();
        return data || this.getDefaultData();
    }

    getProcesso(nome) {
        const data = this.getAllProcessos();
        return data[nome] || null;
    }

    getSubtipo(processo, subtipo) {
        const data = this.getAllProcessos();
        return data[processo]?.[subtipo] || null;
    }

    updateVisualizacao(processo, subtipo, visualizacao) {
        const data = this.getAllProcessos();
        const fluxo = data[processo]?.[subtipo];
        if (!fluxo) return false;

        fluxo.visualizacao = { ...visualizacao };
        this.set(data);
        return true;
    }

    addFluxo(processo, subtipo, descricao, etapas, visualizacao = null, prazo = '') {
        const data = this.getAllProcessos();

        if (!data[processo]) {
            data[processo] = {};
        }

        const etapasMap = {};
        etapas.forEach((etapa, index) => {
            const proximaEtapa = etapa.proximo || null;

            etapasMap[`etapa_${index}`] = {
                nome: etapa.nome,
                tipo: etapa.tipo,
                icone: this.getIconeForType(etapa.tipo),
                ...(etapa.tipo === 'texto' && { texto: etapa.texto, obs: etapa.obs }),
                ...(etapa.tipo === 'anexo' && { obs: etapa.obs }),
                ...(etapa.tipo === 'decisao' && { pergunta: etapa.pergunta, opcoes: etapa.opcoes }),
                ...(etapa.tipo === 'link' && { url: etapa.url, obs: etapa.obs }),
                ...(etapa.tipo === 'alerta' && { mensagem: etapa.mensagem, nivel: etapa.nivel || 'info' }),
                ...(etapa.tipo === 'triagem' && {
                    descricaoTriagem: etapa.descricaoTriagem,
                    observacoesTriagem: etapa.observacoesTriagem,
                    itensTriagem: etapa.itensTriagem || []
                }),
                ...(etapa.tipo === 'email' && { modelo: etapa.modelo, obs: etapa.obs }),
                ...(etapa.tipo === 'contato' && { contatos: etapa.contatos || [] }),
                ...(etapa.tipo === 'reuniao' && { dataHora: etapa.dataHora, local: etapa.local, participantes: etapa.participantes, descricao: etapa.descricao }),
                ...(etapa.tipo === 'checklist' && { itens: etapa.itens || [] }),
                proximo: proximaEtapa
            };
        });

        data[processo][subtipo] = {
            descricao: descricao,
            prazo,
            inicio: 'etapa_0',
            etapas: etapasMap,
            ...(visualizacao && { visualizacao })
        };

        this.set(data);
    }

    getIconeForType(tipo) {
        const icones = {
            'texto': '📝',
            'anexo': '📎',
            'decisao': '🔀',
            'link': '🔗',
            'alerta': '⚠️',
            'triagem': '🔍',
            'email': '📧',
            'contato': '👥',
            'reuniao': '📅',
            'checklist': '✅'
        };
        return icones[tipo] || '📋';
    }

    deleteFluxo(processo, subtipo) {
        const data = this.getAllProcessos();
        if (data[processo]) {
            delete data[processo][subtipo];
            if (Object.keys(data[processo]).length === 0) {
                delete data[processo];
            }
            this.set(data);
            return true;
        }
        return false;
    }

    exportBackup() {
        const data = this.getAllProcessos();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `seiplus_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importBackup(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (!data || typeof data !== 'object' || Array.isArray(data)) {
                        throw new Error('Estrutura de backup inválida');
                    }
                    this.set(data);
                    resolve(true);
                } catch (error) {
                    reject(new Error('Arquivo inválido'));
                }
            };
            reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
            reader.readAsText(file);
        });
    }

    resetToDefault() {
        this.set(this.getDefaultData());
    }

    getStats() {
        const data = this.getAllProcessos();
        let totalFluxos = 0;
        let totalEtapas = 0;
        let totalDecisoes = 0;

        Object.values(data).forEach(subtipos => {
            Object.values(subtipos).forEach(fluxo => {
                totalFluxos++;
                Object.values(fluxo.etapas).forEach(etapa => {
                    totalEtapas++;
                    if (etapa.tipo === 'decisao') {
                        totalDecisoes++;
                    }
                });
            });
        });

        const autocompleteData = this.getAutocompleteData();
        let totalAtalhos = 0;
        Object.values(autocompleteData).forEach(items => {
            totalAtalhos += items.length;
        });

        const dataSize = (new Blob([JSON.stringify(data)]).size / 1024).toFixed(2);

        return {
            processos: Object.keys(data).length,
            fluxos: totalFluxos,
            etapas: totalEtapas,
            decisoes: totalDecisoes,
            atalhos: totalAtalhos,
            tamanho: `${dataSize}KB`
        };
    }

    search(query) {
        const data = this.getAllProcessos();
        const results = [];
        const q = query.toLowerCase();

        Object.entries(data).forEach(([processo, subtipos]) => {
            Object.entries(subtipos).forEach(([subtipo, fluxo]) => {
                if (processo.toLowerCase().includes(q) || subtipo.toLowerCase().includes(q)) {
                    results.push({
                        processo,
                        subtipo,
                        descricao: fluxo.descricao || ''
                    });
                }
            });
        });

        return results;
    }

    getAutocompleteData() {
        const data = localStorage.getItem(this.autocompleteKey);
        return data ? JSON.parse(data) : {};
    }

    setAutocompleteData(data) {
        localStorage.setItem(this.autocompleteKey, JSON.stringify(data));
    }

    addAutocompleteItem(categoria, nome, descricao) {
        const data = this.getAutocompleteData();
        if (!data[categoria]) data[categoria] = [];
        const existe = data[categoria].some(item => item.nome === nome);
        if (!existe) {
            data[categoria].push({ nome, descricao });
            this.setAutocompleteData(data);
        }
    }

    removeAutocompleteItem(categoria, nome) {
        const data = this.getAutocompleteData();
        if (data[categoria]) {
            data[categoria] = data[categoria].filter(item => item.nome !== nome);
            this.setAutocompleteData(data);
        }
    }

    searchAutocomplete(query) {
        const data = this.getAutocompleteData();
        const results = [];
        const q = query.toLowerCase();
        Object.entries(data).forEach(([categoria, items]) => {
            items.forEach(item => {
                if (item.nome.toLowerCase().includes(q) || item.descricao.toLowerCase().includes(q)) {
                    results.push({ categoria, nome: item.nome, descricao: item.descricao });
                }
            });
        });
        return results;
    }

    getAllAutocompleteCategories() {
        return Object.keys(this.getAutocompleteData());
    }

    getAutocompleteByCategory(categoria) {
        const data = this.getAutocompleteData();
        return data[categoria] || [];
    }

    getConfig() {
        const data = localStorage.getItem(this.configKey);
        return data ? JSON.parse(data) : { openaiApiKey: '' };
    }

    saveConfig(config) {
        localStorage.setItem(this.configKey, JSON.stringify(config));
    }

    migrateFluxo(fluxo) {
        // Função para garantir compatibilidade com diferentes versões do fluxo
        if (!fluxo) return null;

        // Se já tem a estrutura correta, retorna
        if (fluxo.etapas && typeof fluxo.etapas === 'object' && !Array.isArray(fluxo.etapas)) {
            return fluxo;
        }

        // Se etapas é um array, converte para objeto
        if (Array.isArray(fluxo.etapas)) {
            const etapasMap = {};
            fluxo.etapas.forEach((etapa, index) => {
                etapasMap[`etapa_${index}`] = etapa;
            });
            return {
                ...fluxo,
                etapas: etapasMap
            };
        }

        return fluxo;
    }
}

// Instância global
const storage = new Storage();
