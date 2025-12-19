sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
  ],
  function (Controller, JSONModel, MessageBox, MessageToast) {
    "use strict";

    return Controller.extend("com.todoapp.controller.App", {
      /********************************************
       * INITIALIZATION
       ********************************************/
      onInit: function () {
        console.log("🎯 App Controller initialized");
        this._loadTodos(); // Carrega dados iniciais
      },

      /********************************************
       * DATA LOADING METHODS
       ********************************************/
      // Carrega todos da API
      _loadTodos: function () {
        var oModel = this.getView().getModel("todoModel");
        oModel.setProperty("/busy", true); // Ativa busy indicator

        var sUrl = "http://localhost:5001/api/todos";
        var oParams = this._getQueryParams();

        // Adiciona parâmetros de query à URL
        if (Object.keys(oParams).length > 0) {
          sUrl += "?" + new URLSearchParams(oParams).toString();
        }

        // Faz requisição à API
        fetch(sUrl)
          .then((response) => {
            if (!response.ok) {
              throw new Error(
                `HTTP ${response.status}: ${response.statusText}`
              );
            }
            return response.json();
          })
          .then((data) => {
            // Atualiza modelo com dados recebidos
            oModel.setProperty("/items", data.items || []);
            oModel.setProperty("/totalCount", data.totalCount || 0);
            oModel.setProperty("/totalPages", data.totalPages || 1);
            oModel.setProperty("/busy", false);

            // Feedback para o usuário
            if (data.items && data.items.length > 0) {
              MessageToast.show(`✅ Loaded ${data.items.length} todos`);
            }
          })
          .catch((error) => {
            console.error("❌ Error loading todos:", error);
            oModel.setProperty("/busy", false);
            MessageBox.error("Failed to load todos: " + error.message);
          });
      },

      // Constrói parâmetros de query
      _getQueryParams: function () {
        var oModel = this.getView().getModel("todoModel");
        return {
          page: oModel.getProperty("/page"),
          pageSize: oModel.getProperty("/pageSize"),
          title: oModel.getProperty("/search") || "",
          sort: oModel.getProperty("/sortBy") || "id",
          order: oModel.getProperty("/sortOrder") || "asc",
        };
      },

      /********************************************
       * SEARCH & FILTER HANDLERS
       ********************************************/
      onSearch: function (oEvent) {
        var sQuery = oEvent.getSource().getValue();
        var oModel = this.getView().getModel("todoModel");

        oModel.setProperty("/search", sQuery);
        oModel.setProperty("/page", 1); // Volta para primeira página
        this._loadTodos();
      },

      onLiveSearch: function (oEvent) {
        // Debounce para evitar muitas requisições
        clearTimeout(this._searchTimeout);
        this._searchTimeout = setTimeout(
          function () {
            this.onSearch(oEvent);
          }.bind(this),
          500
        ); // Aguarda 500ms após última digitação
      },

      /********************************************
       * TODO OPERATIONS
       ********************************************/
      onToggleComplete: function (oEvent) {
        var oItem = oEvent
          .getSource()
          .getBindingContext("todoModel")
          .getObject();
        var bCompleted = oEvent.getParameter("selected");

        console.log(
          `🔄 Toggling todo ${oItem.id} to ${
            bCompleted ? "completed" : "incomplete"
          }`
        );

        // Requisição PUT para atualizar status
        fetch(`http://localhost:5001/api/todos/${oItem.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ completed: bCompleted }),
        })
          .then((response) => {
            if (response.status === 400) {
              // Regra de negócio violada (5 tarefas incompletas)
              return response.json().then((data) => {
                throw new Error(
                  data.error || "Cannot mark as incomplete - limit reached"
                );
              });
            }
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
          })
          .then((updatedTodo) => {
            MessageToast.show(
              `✅ Task "${updatedTodo.title}" marked as ${
                bCompleted ? "completed" : "incomplete"
              }`
            );
            this._loadTodos(); // Recarrega lista
          })
          .catch((error) => {
            console.error("❌ Error updating todo:", error);
            MessageBox.error(error.message || "Failed to update task status", {
              title: "Update Error",
            });
            this._loadTodos(); // Recarrega para reverter estado da UI
          });
      },

      /********************************************
       * SYNC OPERATION
       ********************************************/
      onSync: function () {
        var oModel = this.getView().getModel("todoModel");
        oModel.setProperty("/busy", true);

        MessageBox.confirm(
          "This will sync todos from external API. Continue?",
          {
            title: "Sync Todos",
            onClose: function (sAction) {
              if (sAction === MessageBox.Action.OK) {
                this._performSync();
              } else {
                oModel.setProperty("/busy", false);
              }
            }.bind(this),
          }
        );
      },

      _performSync: function () {
        fetch("http://localhost:5001/api/todos/sync", {
          method: "POST",
          headers: { Accept: "application/json" },
        })
          .then((response) => response.json())
          .then((data) => {
            this.getView().getModel("todoModel").setProperty("/busy", false);
            MessageBox.information(
              data.message || "Sync completed successfully",
              { title: "Sync Result" }
            );
            this._loadTodos(); // Recarrega com novos dados
          })
          .catch((error) => {
            this.getView().getModel("todoModel").setProperty("/busy", false);
            MessageBox.error(
              "Sync failed: " + (error.message || "Unknown error"),
              { title: "Sync Error" }
            );
          });
      },

      /********************************************
       * NAVIGATION
       ********************************************/
      onViewDetails: function (oEvent) {
        var oItem;
        if (oEvent.getSource().data) {
          // Clicou no título ou botão
          oItem = oEvent.getSource().getBindingContext("todoModel").getObject();
        } else {
          // Clicou no item da lista
          oItem = oEvent
            .getParameter("listItem")
            .getBindingContext("todoModel")
            .getObject();
        }

        var oRouter = this.getOwnerComponent().getRouter();
        oRouter.navTo("detail", {
          id: oItem.id.toString(),
        });
      },

      onSelectionChange: function (oEvent) {
        var oSelectedItem = oEvent.getParameter("listItem");
        if (oSelectedItem) {
          var oItem = oSelectedItem.getBindingContext("todoModel").getObject();
          console.log("📝 Selected todo:", oItem);
        }
      },

      /********************************************
       * SORTING
       ********************************************/
      onSort: function () {
        var oModel = this.getView().getModel("todoModel");
        var sCurrentSort = oModel.getProperty("/sortBy") || "id";
        var sCurrentOrder = oModel.getProperty("/sortOrder") || "asc";

        // Alterna entre título e ID
        var sNewSort = sCurrentSort === "title" ? "id" : "title";
        // Inverte a ordem
        var sNewOrder = sCurrentOrder === "asc" ? "desc" : "asc";

        oModel.setProperty("/sortBy", sNewSort);
        oModel.setProperty("/sortOrder", sNewOrder);

        MessageToast.show(`Sorting by ${sNewSort} (${sNewOrder})`);
        this._loadTodos();
      },

      /********************************************
       * PAGINATION
       ********************************************/
      onPreviousPage: function () {
        var oModel = this.getView().getModel("todoModel");
        var iCurrentPage = oModel.getProperty("/page");

        if (iCurrentPage > 1) {
          oModel.setProperty("/page", iCurrentPage - 1);
          this._loadTodos();
        }
      },

      onNextPage: function () {
        var oModel = this.getView().getModel("todoModel");
        var iCurrentPage = oModel.getProperty("/page");
        var iTotalPages = oModel.getProperty("/totalPages");

        if (iCurrentPage < iTotalPages) {
          oModel.setProperty("/page", iCurrentPage + 1);
          this._loadTodos();
        }
      },

      onPageSizeChange: function (oEvent) {
        var iPageSize = oEvent.getParameter("selectedItem").getKey();
        var oModel = this.getView().getModel("todoModel");

        oModel.setProperty("/pageSize", parseInt(iPageSize));
        oModel.setProperty("/page", 1); // Volta para primeira página
        MessageToast.show(`Showing ${iPageSize} items per page`);
        this._loadTodos();
      },
    });
  }
);
