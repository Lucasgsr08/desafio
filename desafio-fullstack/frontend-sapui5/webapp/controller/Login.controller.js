sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
  ],
  function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("com.todoapp.controller.Login", {
      onInit: function () {},

      onLiveChange: function () {
        // enable/disable button could be implemented here
      },

      onLogin: function () {
        var oView = this.getView();
        var sUser = oView.byId("username").getValue();
        var sPass = oView.byId("password").getValue();
        var oModel = this.getOwnerComponent().getModel("todoModel");
        if (!oModel) {
          oModel = new JSONModel({});
          this.getOwnerComponent().setModel(oModel, "todoModel");
        }

        if (!sUser || !sPass) {
          MessageToast.show("Informe usuário e senha");
          return;
        }

        fetch("http://localhost:5001/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ username: sUser, password: sPass }),
        })
          .then(function (res) {
            if (res.status === 401) throw new Error("Credenciais inválidas");
            if (!res.ok) throw new Error("Erro na autenticação");
            return res.json();
          })
          .then(
            function (data) {
              // store token in todoModel for automatic inclusion in requests
              // Accept both camelCase and PascalCase properties returned by the API
              var sToken = data.token || data.Token || "";
              var oUser = data.user || data.User || null;
              oModel.setProperty("/authToken", sToken);
              oModel.setProperty("/currentUser", oUser);
              MessageToast.show("Login efetuado");

              // navigate to home
              var oRouter = this.getOwnerComponent().getRouter();
              oRouter.navTo("home", {}, true);
            }.bind(this)
          )
          .catch(function (err) {
            MessageBox.error(err.message || "Falha no login");
          });
      },

      onNavToRegister: function () {
        var oRouter = this.getOwnerComponent().getRouter();
        oRouter.navTo("register", {}, true);
      },
    });
  }
);
