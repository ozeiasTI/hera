# 🚀 SEI PLUS v1.0

**Sistema Avançado de Gerenciamento de Fluxos Processuais do SEI**

![Status](https://img.shields.io/badge/Status-Ativo-brightgreen)
![Versão](https://img.shields.io/badge/Versão-v1.0-blue)
![Licença](https://img.shields.io/badge/Licença-Livre-green)

---

## 📌 Sobre o Projeto

Este software foi desenvolvido para uma abordagem de projeto de pesquisa intitulada **Desenvolvimento de ferramenta low-code para gestão de fluxos processuais no SEI com foco em soberania digital do IFRO**.

**Criadores:** Ozeias Souza e Gustavo Sales.

O **SEI PLUS** é uma aplicação web desenvolvida para **criar, gerenciar e padronizar fluxos processuais administrativos**, especialmente voltados ao uso com o **SEI (Sistema Eletrônico de Informações)**.

A proposta é simples: permitir que qualquer usuário consiga estruturar processos completos de forma **visual, organizada e sem necessidade de programação**.

---

## 🎯 Objetivos

- Padronizar processos administrativos
- Facilitar a criação de fluxos complexos
- Melhorar a organização institucional
- Permitir compartilhamento de fluxos
- Reduzir erros operacionais

---

## Funcionalidades

### 🧩 Criação de Fluxos

- Interface simples e intuitiva
- Criação de etapas encadeadas e ramificadas
- Prazo geral para o processo
- Reordenação das etapas com atualização automática das conexões

### 🧱 Tipos de Etapas

- 📝 **Texto / Modelo** → documentos e instruções com editor rico
- 📎 **Anexo de Documento** → indicação de arquivo a juntar
- 🔀 **Decisão** → vários caminhos, destinos e cores por opção
- 🔍 **Triagem de Solicitação** → itens de análise, detalhes, obrigatoriedade, observações e avanço
- 🔗 **Link Externo** → acesso a recursos externos
- ⚠️ **Alerta / Aviso** → mensagens com nível de severidade
- 📧 **E-mail** → modelos de comunicação
- 👥 **Contatos** → pessoas e setores relacionados
- 📅 **Reunião / Agendamento** → data, local e participantes
- ✅ **Checklist de Documentos** → conferência de itens

### 📚 Gerenciamento

- Listagem de processos
- Filtro e busca em tempo real
- Organização por tipo e subtipo

### 📊 Visualização

- Modo Lista para execução detalhada
- Modo Fluxograma com Mermaid e cores configuráveis
- Modo Linha do Tempo para leitura sequencial
- Exportação do fluxograma em PNG

### 💾 Dados e Segurança

- Armazenamento via `localStorage`
- Backup completo em JSON
- Restauração de dados
- Importação (mesclar ou substituir)

O arquivo `fluxo-demo-completo.json` contém um exemplo importável com todos os
tipos de etapa, múltiplas conexões, decisões coloridas e triagens.

### 🔄 Compartilhamento

- Exportação de fluxos
- Importação em outros dispositivos
- Integração manual entre usuários

---

## 🛠️ Tecnologias Utilizadas

- HTML5
- CSS3
- JavaScript (Vanilla)
- Mermaid.js (diagramas)
- localStorage (armazenamento local)
