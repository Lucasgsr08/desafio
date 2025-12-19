sap.ui.define(
  [
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "sap/ui/model/json/JSONModel",
    "com/todoapp/model/models",
  ],
  function (UIComponent, Device, JSONModel, models) {
    "use strict";

    return UIComponent.extend("com.todoapp.Component", {
      // Metadados - link para o manifesto
      metadata: {
        manifest: "json",
      },

      // Inicialização do componente
      init: function () {
        // 1. Chama o init do pai
        UIComponent.prototype.init.apply(this, arguments);

        // 2. Cria modelo do dispositivo
        var oDeviceModel = new JSONModel(Device);
        oDeviceModel.setDefaultBindingMode("OneWay");
        this.setModel(oDeviceModel, "device");

        // 3. Cria modelo vazio para todos
        var oTodoModel = new JSONModel({
          busy: false, // Controla busy indicator
          items: [], // Lista de todos
          totalCount: 0, // Total de itens
          page: 1, // Página atual
          pageSize: 10, // Itens por página
          totalPages: 1, // Total de páginas
          search: "", // Termo de busca
          sortBy: "id", // Campo para ordenar
          sortOrder: "asc", // Direção da ordenação
        });
        this.setModel(oTodoModel, "todoModel");

        // 4. Inicializa o roteador (protegido para evitar inicialização dupla)
        try {
          if (this.getRouter && !this._routerInitialized) {
            this.getRouter().initialize();
            this._routerInitialized = true;
          }
        } catch (e) {
          // Não falhar em ambiente de dev; log e continuar
          /* eslint-disable no-console */
          console.warn("Router init warning:", e);
        }

        console.log("✅ Componente TodoApp inicializado");
      },

      // Destruição do componente
      destroy: function () {
        UIComponent.prototype.destroy.apply(this, arguments);
      },

      // Retorna classe de densidade baseada no dispositivo
      getContentDensityClass: function () {
        return Device.support.touch ? "sapUiSizeCozy" : "sapUiSizeCompact";
      },
    });
  }
);
