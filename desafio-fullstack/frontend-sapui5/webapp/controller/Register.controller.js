sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/m/MessageToast", "sap/m/MessageBox"],
  function (Controller, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("com.todoapp.controller.Register", {
      onInit: function () {
        console.log("📝 Register Controller initialized");
      },

      onLiveChange: function () {
        // Could implement password strength indicator here
      },

      onRegister: function () {
        var oView = this.getView();
        var sUser = oView.byId("newUsername").getValue();
        var sPass = oView.byId("newPassword").getValue();
        var sConfirm = oView.byId("confirmPassword").getValue();

        if (!sUser || !sPass || !sConfirm) {
          MessageToast.show("Preencha todos os campos");
          return;
        }

        if (sPass !== sConfirm) {
          MessageBox.error("As senhas não correspondem");
          return;
        }

        if (sPass.length < 3) {
          MessageBox.error("A senha deve ter pelo menos 3 caracteres");
          return;
        }

        // Call register endpoint
        fetch("http://localhost:5001/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ username: sUser, password: sPass }),
        })
          .then(function (res) {
            if (res.status === 400) {
              return res.json().then(function (data) {
                throw new Error(data.error || "Erro ao registrar");
              });
            }
            if (!res.ok) throw new Error("Erro no registro");
            return res.json();
          })
          .then(
            function (data) {
              MessageBox.success(
                "Conta criada com sucesso! Faça login agora.",
                {
                  onClose: function () {
                    var oRouter = this.getOwnerComponent().getRouter();
                    oRouter.navTo("login", {}, true);
                  }.bind(this),
                }
              );
            }.bind(this)
          )
          .catch(function (err) {
            MessageBox.error(err.message || "Falha ao criar conta");
          });
      },

      onNavToLogin: function () {
        var oRouter = this.getOwnerComponent().getRouter();
        oRouter.navTo("login", {}, true);
      },

      onNavBack: function () {
        var oRouter = this.getOwnerComponent().getRouter();
        oRouter.navTo("login", {}, true);
      },
    });
  }
);
