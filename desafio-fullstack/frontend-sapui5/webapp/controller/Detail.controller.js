sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/m/MessageBox", "sap/m/MessageToast"],
  function (Controller, MessageBox, MessageToast) {
    "use strict";

    return Controller.extend("com.todoapp.controller.Detail", {
      onInit: function () {
        console.log("🔍 Detail Controller initialized");

        // Registra listener para quando a rota for acionada
        var oRouter = this.getOwnerComponent().getRouter();
        oRouter
          .getRoute("detail")
          .attachPatternMatched(this._onRouteMatched, this);

        this._loadTodoDetails();
      },

      _onRouteMatched: function (oEvent) {
        // Callback quando a rota for acionada
        console.log(
          "✅ Rota 'detail' acionada",
          oEvent.getParameter("arguments")
        );
        this._loadTodoDetails();
      },

      _loadTodoDetails: function () {
        var oView = this.getView();
        var oRouter = this.getOwnerComponent().getRouter();
        // Obtém o modelo do componente (criado no Component.js)
        var oModel = this.getOwnerComponent().getModel("todoModel");

        if (!oModel) {
          console.error("❌ Modelo 'todoModel' não encontrado!");
          oModel = new sap.ui.model.json.JSONModel();
          this.getOwnerComponent().setModel(oModel, "todoModel");
        }

        // Obtém ID do parâmetro da rota
        var sTodoId = this.getOwnerComponent()
          .getRouter()
          .getHashChanger()
          .getHash()
          .split("/")
          .pop();

        if (!sTodoId) {
          MessageBox.error("Nenhum ID de tarefa fornecido");
          try {
            // Tenta exibir o target 'home' sem recriar views
            this.getOwnerComponent().getTargets().display("home");
          } catch (e) {
            window.history.back();
          }
          return;
        }

        // Marca como carregando
        oModel.setProperty("/busy", true);

        // Carrega detalhes da API
        var sToken = oModel.getProperty("/authToken");
        var headers = { Accept: "application/json" };
        if (sToken) headers["Authorization"] = "Bearer " + sToken;

        fetch(`http://localhost:5001/api/todos/${sTodoId}`, {
          headers: headers,
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: Todo not found`);
            }
            return response.json();
          })
          .then((todo) => {
            oModel.setProperty("/selectedTodo", todo);
            oModel.setProperty("/busy", false);

            // Atualiza título da página
            oView.byId("detailPage").setTitle(`Tarefa #${todo.id}`);
          })
          .catch((error) => {
            console.error("Erro ao carregar detalhes da tarefa:", error);
            oModel.setProperty("/busy", false);
            MessageBox.error(error.message);
            try {
              this.getOwnerComponent().getTargets().display("home");
            } catch (e) {
              window.history.back();
            }
          });
      },

      onNavBack: function (oEvent) {
        console.log("🔙 Botão de retorno pressionado");
        // Tenta navegar para a primeira página do App (master) para evitar criar views duplicadas
        try {
          var oParent = this.getView().getParent();
          // Sobe na árvore até encontrar o sap.m.App
          while (
            oParent &&
            (!oParent.getMetadata ||
              oParent.getMetadata().getName() !== "sap.m.App")
          ) {
            oParent = oParent.getParent();
          }
          if (
            oParent &&
            oParent.getMetadata &&
            oParent.getMetadata().getName() === "sap.m.App"
          ) {
            var aPages = oParent.getPages();
            if (aPages && aPages.length > 0) {
              oParent.to(aPages[0].getId());
              return;
            }
          }
        } catch (e) {
          console.warn("Erro ao tentar navegar via App control:", e);
        }
        // Fallbacks
        try {
          this.getOwnerComponent().getTargets().display("home");
        } catch (e) {
          window.history.back();
        }
      },

      onRefresh: function () {
        this._loadTodoDetails();
        MessageToast.show("Detalhes atualizados");
      },
    });
  }
);
