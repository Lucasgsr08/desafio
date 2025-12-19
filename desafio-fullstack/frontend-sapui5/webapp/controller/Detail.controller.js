sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/m/MessageBox", "sap/m/MessageToast"],
  function (Controller, MessageBox, MessageToast) {
    "use strict";

    return Controller.extend("com.todoapp.controller.Detail", {
      onInit: function () {
        console.log("🔍 Detail Controller initialized");
        this._loadTodoDetails();
      },

      _loadTodoDetails: function () {
        var oView = this.getView();
        var oRouter = this.getOwnerComponent().getRouter();
        var oModel =
          oView.getModel("todoModel") || new sap.ui.model.json.JSONModel();

        // Obtém ID do parâmetro da rota
        var sTodoId = this.getOwnerComponent()
          .getRouter()
          .getHashChanger()
          .getHash()
          .split("/")
          .pop();

        if (!sTodoId) {
          MessageBox.error("No todo ID provided");
          oRouter.navTo("home");
          return;
        }

        // Marca como carregando
        oModel.setProperty("/busy", true);

        // Carrega detalhes da API
        fetch(`http://localhost:5001/api/todos/${sTodoId}`)
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
            oView.byId("detailPage").setTitle(`Todo #${todo.id}`);
          })
          .catch((error) => {
            console.error("Error loading todo details:", error);
            oModel.setProperty("/busy", false);
            MessageBox.error(error.message);
            oRouter.navTo("home");
          });
      },

      onNavBack: function () {
        var oRouter = this.getOwnerComponent().getRouter();
        oRouter.navTo("home");
      },

      onRefresh: function () {
        this._loadTodoDetails();
        MessageToast.show("Details refreshed");
      },
    });
  }
);
