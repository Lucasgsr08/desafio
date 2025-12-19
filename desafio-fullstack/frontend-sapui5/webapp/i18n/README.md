# Aplicação de Tarefas (Todo App) - Frontend SAPUI5

Este projeto é o frontend desenvolvido em SAPUI5 para a aplicação de gerenciamento de tarefas. Ele consome uma API REST para realizar operações de CRUD (Criar, Ler, Atualizar, Deletar) em tarefas.

## 🚀 Funcionalidades

A aplicação oferece as seguintes funcionalidades principais:

- **Listagem de Tarefas**: Visualização de tarefas em lista.
- **Pesquisa**: Barra de busca para filtrar tarefas por título.
- **Paginação**:
  - Navegação entre páginas (Anterior/Próxima).
  - Seletor de quantidade de itens por página (5, 10, 20, 50).
- **Ordenação**: Capacidade de ordenar a lista de tarefas.
- **Gerenciamento de Status**:
  - Alternar o status de uma tarefa entre "Concluída" e "Incompleta".
  - **Regra de Negócio**: O sistema valida se o usuário já possui 5 tarefas incompletas. Caso tente marcar uma 6ª tarefa como incompleta, a operação é bloqueada (validação no backend).
- **Adicionar/Remover**: Botões para criar novas tarefas e excluir tarefas existentes.
- **Detalhes**: Navegação para uma tela de detalhes (`Detail.view.xml`) ao clicar em uma tarefa, exibindo informações completas e status.

## 🛠️ Pré-requisitos

- Node.js (Versão LTS recomendada)
- UI5 CLI (Geralmente instalado via npm)

## 📦 Instalação

1.  Navegue até a pasta do projeto frontend:

    ```bash
    cd frontend-sapui5
    ```

2.  Instale as dependências do projeto:
    ```bash
    npm install
    ```

## ▶️ Como Executar

1.  **Backend**: Certifique-se de que sua API Backend (.NET) esteja rodando na porta `5001` (conforme indicado no rodapé da aplicação `App.view.xml`).

2.  **Frontend**: Inicie o servidor de desenvolvimento:

    ```bash
    npm start
    ```

    Ou, se estiver usando o UI5 CLI diretamente:

    ```bash
    ui5 serve -o index.html
    ```

3.  Acesse a aplicação no navegador em `http://localhost:8080`.

## 📂 Estrutura Principal

- **webapp/view/App.view.xml**: Tela principal contendo a lista, filtros e paginação.
- **webapp/view/Detail.view.xml**: Tela de detalhes da tarefa.
- **webapp/controller/**: Contém a lógica JavaScript (`App.controller.js`, `Detail.controller.js`) para manipular os eventos da tela e chamar a API.
- **webapp/manifest.json**: Configuração de roteamento, modelos e versões do SAPUI5.
- **webapp/i18n/**: Arquivos de tradução (Português, Inglês, etc.).

---

_Desenvolvido com SAPUI5._
