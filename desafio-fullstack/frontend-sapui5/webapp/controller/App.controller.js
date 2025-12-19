sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/Dialog",
    "sap/m/Input",
    "sap/m/Button",
    "sap/m/Select",
    "sap/ui/core/Item",
    "sap/m/RadioButtonGroup",
    "sap/m/RadioButton",
    "sap/m/VBox",
    "sap/m/Label",
  ],
  function (
    Controller,
    JSONModel,
    MessageBox,
    MessageToast,
    Dialog,
    Input,
    Button,
    Select,
    CoreItem,
    RadioButtonGroup,
    RadioButton,
    VBox,
    Label
  ) {
    "use strict";

    return Controller.extend("com.todoapp.controller.App", {
      /********************************************
       * INITIALIZATION
       ********************************************/
      onInit: function () {
        console.log("🎯 App Controller initialized");
        var oModel = this._getTodoModel();
        // If not authenticated, redirect to login
        var sToken = oModel.getProperty("/authToken");
        if (!sToken) {
          this.getOwnerComponent().getRouter().navTo("login", {}, true);
          // attach route matched so after login navigating back to home triggers load
          this.getOwnerComponent()
            .getRouter()
            .getRoute("home")
            .attachMatched(this._onRouteHome, this);
          return;
        }
        // attach route matched for home route
        this.getOwnerComponent()
          .getRouter()
          .getRoute("home")
          .attachMatched(this._onRouteHome, this);
        this._loadTodos(); // Carrega dados iniciais
      },

      _onRouteHome: function () {
        var oModel = this._getTodoModel();
        var sToken = oModel.getProperty("/authToken");
        if (sToken) {
          this._loadTodos();
        }
      },

      /********************************************
       * DATA LOADING METHODS
       ********************************************/
      // Retorna o modelo compartilhado todoModel, criando se necessário
      _getTodoModel: function () {
        var oModel =
          this.getView().getModel("todoModel") ||
          this.getOwnerComponent().getModel("todoModel");
        if (!oModel) {
          oModel = new JSONModel({
            busy: false,
            items: [],
            totalCount: 0,
            page: 1,
            pageSize: 10,
            totalPages: 1,
            search: "",
            sortBy: "id",
            sortOrder: "asc",
            authToken: "",
            currentUser: null,
          });
          this.getOwnerComponent().setModel(oModel, "todoModel");
        }
        return oModel;
      },
      // Carrega todos da API
      _loadTodos: function () {
        var oModel = this._getTodoModel();
        oModel.setProperty("/busy", true); // Ativa busy indicator

        var sUrl = "http://localhost:5001/api/todos";
        var oParams = this._getQueryParams();

        // Adiciona parâmetros de query à URL
        if (Object.keys(oParams).length > 0) {
          sUrl += "?" + new URLSearchParams(oParams).toString();
        }

        // Faz requisição à API
        var headers = { Accept: "application/json" };
        var sToken = oModel.getProperty("/authToken");
        if (sToken) headers["Authorization"] = "Bearer " + sToken;

        fetch(sUrl, { headers: headers })
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
              MessageToast.show(`✅ ${data.items.length} tarefas carregadas`);
            }
          })
          .catch((error) => {
            console.error("❌ Erro ao carregar tarefas:", error);
            oModel.setProperty("/busy", false);
            MessageBox.error("Falha ao carregar tarefas: " + error.message);
          });
      },

      // Constrói parâmetros de query
      _getQueryParams: function () {
        var oModel = this._getTodoModel();
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
        var oModel = this._getTodoModel();

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
        var oModel = this._getTodoModel();
        var sToken = oModel.getProperty("/authToken");
        var oCurrentUser = oModel.getProperty("/currentUser");

        // Valida autenticação
        if (!sToken || !oCurrentUser) {
          MessageBox.error("Você precisa estar logado para alterar o status da tarefa.");
          this._loadTodos();
          return;
        }

        // Valida propriedade da tarefa
        if (oItem.userId !== oCurrentUser.id) {
          MessageBox.error("Você não pode alterar tarefas de outro usuário.");
          this._loadTodos();
          return;
        }

        var headers = {
          "Content-Type": "application/json",
          Accept: "application/json",
        };
        if (sToken) headers["Authorization"] = "Bearer " + sToken;

        fetch(`http://localhost:5001/api/todos/${oItem.id}`, {
          method: "PUT",
          headers: headers,
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
              `✅ Tarefa "${updatedTodo.title}" marcada como ${
                bCompleted ? "concluída" : "incompleta"
              }`
            );
            this._loadTodos(); // Recarrega lista
          })
          .catch((error) => {
            console.error("❌ Erro ao atualizar tarefa:", error);
            MessageBox.error(
              error.message || "Falha ao atualizar o status da tarefa",
              {
                title: "Erro na Atualização",
              }
            );
            this._loadTodos(); // Recarrega para reverter estado da UI
          });
      },

      onAddTodo: function () {
        var oView = this.getView();
        var oModel = this._getTodoModel();
        var sToken = oModel.getProperty("/authToken");

        var oInput = new Input({ placeholder: "Título da tarefa" });

        var oDialog = new Dialog({
          title: "Adicionar Tarefa",
          content: [oInput],
          beginButton: new Button({
            text: "Criar",
            press: function () {
              var sTitle = oInput.getValue();
              if (!sTitle || sTitle.trim() === "") {
                MessageToast.show("Informe um título válido");
                return;
              }

              oModel.setProperty("/busy", true);

              var headers = {
                "Content-Type": "application/json",
                Accept: "application/json",
              };
              if (sToken) headers["Authorization"] = "Bearer " + sToken;

              fetch("http://localhost:5001/api/todos", {
                method: "POST",
                headers: headers,
                body: JSON.stringify({ title: sTitle, completed: false }),
              })
                .then(function (response) {
                  // Read text first to avoid JSON parse errors on empty bodies
                  return response.text().then(function (text) {
                    if (!response.ok) {
                      var data = null;
                      try {
                        data = text ? JSON.parse(text) : null;
                      } catch (e) {
                        data = null;
                      }
                      throw new Error(
                        (data && data.error) ||
                          response.statusText ||
                          text ||
                          "Erro"
                      );
                    }
                    return text ? JSON.parse(text) : null;
                  });
                })
                .then(
                  function (created) {
                    MessageToast.show(
                      "✅ Tarefa criada: " + (created?.title || "")
                    );
                    oDialog.close();
                    oModel.setProperty("/busy", false);
                    this._loadTodos();
                  }.bind(this)
                )
                .catch(function (err) {
                  oModel.setProperty("/busy", false);
                  MessageBox.error(
                    "Falha ao criar tarefa: " + (err.message || err)
                  );
                });
            }.bind(this),
          }),
          endButton: new Button({
            text: "Cancelar",
            press: function () {
              oDialog.close();
            },
          }),
          afterClose: function () {
            oDialog.destroy();
          },
        });

        oDialog.open();
      },

      onRemoveTodo: function () {
        var oList = this.getView().byId("todoList");
        var oSelected = oList.getSelectedItem();
        var oModel = this._getTodoModel();
        var sToken = oModel.getProperty("/authToken");

        if (!oSelected) {
          // Nenhuma tarefa selecionada na lista: abrir diálogo para escolher
          var aItems = oModel.getProperty("/items") || [];
          if (!aItems || aItems.length === 0) {
            MessageToast.show("Nenhuma tarefa disponível para remover");
            return;
          }

          var oSelect = new Select({ width: "100%" });
          aItems.forEach(function (t) {
            oSelect.addItem(
              new CoreItem({ key: t.id, text: (t.title || "(sem título)") + " (ID:" + t.id + ")" })
            );
          });

          var oDialog = new Dialog({
            title: "Selecionar tarefa para remoção",
            content: [oSelect],
            beginButton: new Button({
              text: "Remover",
              press: function () {
                var sKey = oSelect.getSelectedKey();
                if (!sKey) {
                  MessageToast.show("Selecione uma tarefa");
                  return;
                }
                oDialog.close();
                // Chama a remoção usando o id selecionado
                this._confirmAndRemoveById(parseInt(sKey, 10));
              }.bind(this),
            }),
            endButton: new Button({ text: "Cancelar", press: function () { oDialog.close(); } }),
            afterClose: function () { oDialog.destroy(); },
          });

          oDialog.open();
          return;
        }

        var oItem = oSelected.getBindingContext("todoModel").getObject();
        var iId = oItem.id;

        MessageBox.confirm("Confirma remoção da tarefa: " + oItem.title + "?", {
          title: "Remover Tarefa",
          onClose: function (sAction) {
            if (sAction === MessageBox.Action.OK) {
              var headers = { Accept: "application/json" };
              if (sToken) headers["Authorization"] = "Bearer " + sToken;

              oModel.setProperty("/busy", true);

              fetch("http://localhost:5001/api/todos/" + iId, {
                method: "DELETE",
                headers: headers,
              })
                .then(
                  function (response) {
                    if (response.status === 404) {
                      throw new Error("Tarefa não encontrada");
                    }
                    if (!response.ok) throw new Error("Erro ao remover tarefa");
                    MessageToast.show("✅ Tarefa removida");
                    this._loadTodos();
                  }.bind(this)
                )
                .catch(function (err) {
                  MessageBox.error(
                    "Falha ao remover tarefa: " + (err.message || err)
                  );
                })
                .finally(function () {
                  oModel.setProperty("/busy", false);
                });
            }
          }.bind(this),
        });
      },

      onToggleSelectedStatus: function () {
        var oList = this.getView().byId("todoList");
        var oSelected = oList.getSelectedItem();
        var oModel = this._getTodoModel();

        if (!oSelected) {
          MessageToast.show("Selecione uma tarefa para definir o status");
          return;
        }

        var oItem = oSelected.getBindingContext("todoModel").getObject();
        var iId = oItem.id;

        // Abrir diálogo para escolher status
        var oRadioGroup = new RadioButtonGroup({
          buttons: [
            new RadioButton({ text: "Completa", selected: oItem.completed }),
            new RadioButton({ text: "Incompleta", selected: !oItem.completed }),
          ],
        });

        var oDialog = new Dialog({
          title: `Definir status: ${oItem.title}`,
          content: [
            new VBox({
              items: [
                new Label({ text: "Escolha o novo status:" }),
                oRadioGroup,
              ],
            }),
          ],
          beginButton: new Button({
            text: "Atualizar",
            press: function () {
              var iSelectedIndex = oRadioGroup.getSelectedIndex();
              var bNewCompleted = iSelectedIndex === 0; // 0 = Completa, 1 = Incompleta

              oDialog.close();
              this._updateTodoStatus(iId, bNewCompleted);
            }.bind(this),
          }),
          endButton: new Button({
            text: "Cancelar",
            press: function () {
              oDialog.close();
            },
          }),
          afterClose: function () {
            oDialog.destroy();
          },
        });

        oDialog.open();
      },

      // Helper: atualiza o status da tarefa via API
      _updateTodoStatus: function (iTodoId, bNewCompleted) {
        var oModel = this._getTodoModel();
        var sToken = oModel.getProperty("/authToken");
        var headers = {
          "Content-Type": "application/json",
          Accept: "application/json",
        };
        if (sToken) headers["Authorization"] = "Bearer " + sToken;

        oModel.setProperty("/busy", true);

        fetch("http://localhost:5001/api/todos/" + iTodoId, {
          method: "PUT",
          headers: headers,
          body: JSON.stringify({ completed: bNewCompleted }),
        })
          .then((response) => {
            if (response.status === 400) {
              return response.json().then((data) => {
                throw new Error(data.error || "Limite de tarefas incompletas atingido");
              });
            }
            if (!response.ok) throw new Error("Erro ao atualizar tarefa");
            return response.json();
          })
          .then((updated) => {
            MessageToast.show(
              `✅ Tarefa "${updated.title}" marcada como ${
                updated.completed ? "concluída" : "incompleta"
              }`
            );
            this._loadTodos();
            // Volta para a página principal após sucesso
            setTimeout(function () {
              this.getOwnerComponent().getRouter().navTo("home", {}, true);
            }.bind(this), 500);
          })
          .catch((err) => {
            MessageBox.error("Falha ao atualizar tarefa: " + (err.message || err));
            this._loadTodos();
          })
          .finally(() => {
            oModel.setProperty("/busy", false);
          });
      },

      // Helper: confirma e remove por id (usado pelo diálogo de seleção)
      _confirmAndRemoveById: function (iId) {
        var oModel = this._getTodoModel();
        var sToken = oModel.getProperty("/authToken");

        MessageBox.confirm("Confirma remoção da tarefa id: " + iId + "?", {
          title: "Remover Tarefa",
          onClose: function (sAction) {
            if (sAction === MessageBox.Action.OK) {
              var headers = { Accept: "application/json" };
              if (sToken) headers["Authorization"] = "Bearer " + sToken;

              oModel.setProperty("/busy", true);

              fetch("http://localhost:5001/api/todos/" + iId, {
                method: "DELETE",
                headers: headers,
              })
                .then(
                  function (response) {
                    if (response.status === 404) {
                      throw new Error("Tarefa não encontrada");
                    }
                    if (!response.ok) throw new Error("Erro ao remover tarefa");
                    MessageToast.show("✅ Tarefa removida");
                    this._loadTodos();
                  }.bind(this)
                )
                .catch(function (err) {
                  MessageBox.error(
                    "Falha ao remover tarefa: " + (err.message || err)
                  );
                })
                .finally(function () {
                  oModel.setProperty("/busy", false);
                });
            }
          }.bind(this),
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

        MessageToast.show(`Ordenado por ${sNewSort} (${sNewOrder})`);
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
        MessageToast.show(`Exibindo ${iPageSize} itens por página`);
        this._loadTodos();
      },

      /********************************************
       * SYNC OPERATION
       ********************************************/
      onSync: function () {
        var oModel = this.getView().getModel("todoModel");
        oModel.setProperty("/busy", true);

        MessageBox.confirm(
          "Isto sincronizará tarefas da API externa. Continuar?",
          {
            title: "Sincronizar Tarefas",
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
        var sTokenSync = this._getTodoModel().getProperty("/authToken");
        var headersSync = { Accept: "application/json" };
        if (sTokenSync) headersSync["Authorization"] = "Bearer " + sTokenSync;

        fetch("http://localhost:5001/api/todos/sync", {
          method: "POST",
          headers: headersSync,
        })
          .then((response) => response.json())
          .then((data) => {
            this.getView().getModel("todoModel").setProperty("/busy", false);
            MessageBox.information(
              data.message || "Sincronização concluída com sucesso",
              { title: "Resultado da Sincronização" }
            );
            this._loadTodos(); // Recarrega com novos dados
          })
          .catch((error) => {
            this.getView().getModel("todoModel").setProperty("/busy", false);
            MessageBox.error(
              "Falha na sincronização: " +
                (error.message || "Erro desconhecido"),
              { title: "Erro na Sincronização" }
            );
          });
      },
    });
  }
);
