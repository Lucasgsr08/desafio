sap.ui.define(
  ["sap/ui/model/json/JSONModel", "sap/ui/Device"],
  function (JSONModel, Device) {
    "use strict";

    return {
      // Cria modelo do dispositivo
      createDeviceModel: function () {
        var oModel = new JSONModel(Device);
        oModel.setDefaultBindingMode("OneWay");
        return oModel;
      },

      // Cria modelo para todos
      createTodoModel: function () {
        return new JSONModel({
          busy: false,
          items: [],
          totalCount: 0,
          page: 1,
          pageSize: 10,
          totalPages: 1,
          search: "",
          sortBy: "id",
          sortOrder: "asc",
          selectedTodo: null,
        });
      },

      // Cria modelo vazio para detalhes
      createDetailModel: function () {
        return new JSONModel({
          id: "",
          userId: "",
          title: "",
          completed: false,
          loading: false,
        });
      },
    };
  }
);
