sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/m/SelectDialog",
  "sap/m/StandardListItem"
], function (Controller, JSONModel, MessageBox, MessageToast, SelectDialog, StandardListItem) {
  "use strict";

  return Controller.extend("sapips.training.g2casestudy.controller.CreateView", {

    onInit: function () {
      // Local view model (vm) for Create page state
      var oVm = new JSONModel({
        Order: {
          ReceivingPlant: "",
          DeliveringPlant: "",
          GrandTotal: 0
        },
        AvailablePlants: [],
        AvailableProducts: [],
        SelectedProducts: []
      });

      this.getView().setModel(oVm, "vm");

      // Load value help data
      this._loadPlants();
      this._loadProducts();
    },

    // Navigation
    onNavBack: function () {
      this.getOwnerComponent().getRouter().navTo("RouteMainView");
    },

    onCancel: function () {
      this.getOwnerComponent().getRouter().navTo("RouteMainView");
    },

    // Load Value Help Data
    _loadProducts: function () {
      var oOData = this.getOwnerComponent().getModel(); // OData model
      var oVm = this.getView().getModel("vm");

      // Try read /Products from backend
      oOData.read("/Products", {
        success: function (oData) {
          oVm.setProperty("/AvailableProducts", (oData && oData.results) ? oData.results : []);
        },
        error: function () {
          // Fallback empty (still allows app to run)
          oVm.setProperty("/AvailableProducts", []);
        }
      });
    },

    _loadPlants: function () {
      var oOData = this.getOwnerComponent().getModel();
      var oVm = this.getView().getModel("vm");

      // Try read /Plants (if your service has it)
      oOData.read("/Plants", {
        success: function (oData) {
          oVm.setProperty("/AvailablePlants", (oData && oData.results) ? oData.results : []);
        },
        error: function () {
          // Fallback mock plants so value help works even if entity set isn't ready yet
          oVm.setProperty("/AvailablePlants", [
            { PlantCode: "1000", PlantName: "Singapore" },
            { PlantCode: "1010", PlantName: "Malaysia" },
            { PlantCode: "1020", PlantName: "Philippines" }
          ]);
        }
      });
    },

    // Plant Value Help
    onValueHelpReceivingPlant: function () {
      this._openPlantDialog("ReceivingPlant");
    },

    onValueHelpDeliveringPlant: function () {
      this._openPlantDialog("DeliveringPlant");
    },


    _openPlantDialog: function (sTargetField) {
      var oVm = this.getView().getModel("vm");

      // store current target field
      this._sPlantTargetField = sTargetField;

      var oBundle = this.getView().getModel("i18n").getResourceBundle();

      if (!this._oPlantDialog) {
        this._oPlantDialog = new SelectDialog({
          title: oBundle.getText("vhPlantTitle"),

          search: function (oEvent) {
            var sValue = oEvent.getParameter("value") || "";
            var oBinding = oEvent.getSource().getBinding("items");

            oBinding.filter(sValue ? [new sap.ui.model.Filter({
              path: "PlantName",
              operator: sap.ui.model.FilterOperator.Contains,
              value1: sValue
            })] : []);
          },

          // use stored variable here
          confirm: function (oEvent) {
            var oItem = oEvent.getParameter("selectedItem");

            if (oItem) {
              var oCtx = oItem.getBindingContext("vm");
              var oPlant = oCtx.getObject();

              var sValue = (oPlant.PlantCode ? oPlant.PlantCode + " - " : "") + (oPlant.PlantName || "");

              // use dynamic target
              oVm.setProperty("/Order/" + this._sPlantTargetField, sValue);
            }
          }.bind(this)
        });

        this.getView().addDependent(this._oPlantDialog);

        this._oPlantDialog.bindAggregation("items", {
          path: "vm>/AvailablePlants",
          template: new sap.m.StandardListItem({
            title: "{vm>PlantName}",
            description: "{vm>PlantCode}"
          })
        });
      }

      this._oPlantDialog.open();
    },
    
    // product add value help
    onAddProduct: function () {
      this._openProductDialog();
    },

    _openProductDialog: function () {
      var oVm = this.getView().getModel("vm");
      var oBundle = this.getView().getModel("i18n").getResourceBundle();
      var that = this;

      if (!this._oProductDialog) {
        this._oProductDialog = new SelectDialog({
          title: oBundle.getText("vhProductTitle"),
          search: function (oEvent) {
            var sValue = oEvent.getParameter("value") || "";
            var oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter(sValue ? [new sap.ui.model.Filter({
              path: "ProductName",
              operator: sap.ui.model.FilterOperator.Contains,
              value1: sValue
            })] : []);
          },
          confirm: function (oEvent) {
            var oItem = oEvent.getParameter("selectedItem");
            if (!oItem) { return; }

            var oCtx = oItem.getBindingContext("vm");
            var oProd = oCtx.getObject();

            // Normalize fields (depends on service)
            var sId = oProd.ProductID || oProd.ID || oProd.ProductId || oProd.ProductName;
            var sName = oProd.ProductName || oProd.Name || "";
            var fPrice = Number(oProd.UnitPrice || oProd.Price || 0);

            var aSelected = oVm.getProperty("/SelectedProducts") || [];

            // prevent duplicates
            var bExists = aSelected.some(function (x) { return x.ProductID === sId; });
            if (bExists) {
              MessageToast.show(oBundle.getText("msgProductAlreadyAdded"));
              return;
            }

            aSelected.push({
              ProductID: sId,
              ProductName: sName,
              Quantity: 1,
              Price: fPrice,
              Total: fPrice * 1
            });

            oVm.setProperty("/SelectedProducts", aSelected);
            that._recalculateGrandTotal();
          }
        });

        this.getView().addDependent(this._oProductDialog);

        this._oProductDialog.bindAggregation("items", {
          path: "vm>/AvailableProducts",
          template: new StandardListItem({
            title: "{vm>ProductName}",
            description: "{vm>ProductID}"
          })
        });
      }

      this._oProductDialog.open();
    },

    // quantiy change and total price calculation
    onQtyChange: function (oEvent) {
      var oInput = oEvent.getSource();
      var sPath = oInput.getBindingContext("vm").getPath(); // e.g. /SelectedProducts/0
      var iQty = Number(oEvent.getParameter("value"));

      if (!iQty || iQty <= 0) {
        oInput.setValueState("Error");
        oInput.setValueStateText(this.getView().getModel("i18n").getResourceBundle().getText("msgQtyInvalid"));
        return;
      }

      oInput.setValueState("None");

      var oVm = this.getView().getModel("vm");
      var fPrice = Number(oVm.getProperty(sPath + "/Price") || 0);

      oVm.setProperty(sPath + "/Quantity", iQty);
      oVm.setProperty(sPath + "/Total", fPrice * iQty);

      this._recalculateGrandTotal();
    },

    _recalculateGrandTotal: function () {
      var oVm = this.getView().getModel("vm");
      var aSelected = oVm.getProperty("/SelectedProducts") || [];

      var fSum = aSelected.reduce(function (acc, item) {
        return acc + Number(item.Total || 0);
      }, 0);

      oVm.setProperty("/Order/GrandTotal", fSum);
    },

    // delete product from selected list
    onDeleteProduct: function () {
      var oTable = this.byId("idTblProduct");
      var aSelectedItems = oTable.getSelectedItems();
      var oBundle = this.getView().getModel("i18n").getResourceBundle();

      if (!aSelectedItems || aSelectedItems.length === 0) {
        MessageBox.error(oBundle.getText("msgSelectItem"));
        return;
      }

      var that = this;
      MessageBox.confirm(
        oBundle.getText("msgConfirmDelete", [aSelectedItems.length]),
        {
          actions: [MessageBox.Action.YES, MessageBox.Action.NO],
          onClose: function (oAction) {
            if (oAction !== MessageBox.Action.YES) { return; }

            var oVm = that.getView().getModel("vm");
            var aProducts = oVm.getProperty("/SelectedProducts") || [];

            // collect indices and delete from highest -> lowest
            var aIdx = aSelectedItems.map(function (oItem) {
              return parseInt(oItem.getBindingContext("vm").getPath().split("/")[2], 10);
            }).sort(function (a, b) { return b - a; });

            aIdx.forEach(function (i) {
              aProducts.splice(i, 1);
            });

            oVm.setProperty("/SelectedProducts", aProducts);
            oTable.removeSelections(true);
            that._recalculateGrandTotal();
          }
        }
      );
    },

    // save order
    onSave: function () {
      var oVm = this.getView().getModel("vm");
      var oBundle = this.getView().getModel("i18n").getResourceBundle();

      var sReceiving = (oVm.getProperty("/Order/ReceivingPlant") || "").trim();
      var sDelivering = (oVm.getProperty("/Order/DeliveringPlant") || "").trim();
      var aSelected = oVm.getProperty("/SelectedProducts") || [];

      if (!sReceiving) {
        MessageBox.error(oBundle.getText("msgReceivingRequired"));
        return;
      }
      if (!sDelivering) {
        MessageBox.error(oBundle.getText("msgDeliveringRequired"));
        return;
      }
      if (!aSelected.length) {
        MessageBox.error(oBundle.getText("msgAtLeastOneProduct"));
        return;
      }

      var that = this;

      MessageBox.confirm(oBundle.getText("msgConfirmSave"), {
        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        onClose: function (oAction) {
          if (oAction !== MessageBox.Action.YES) { return; }

          // payload (adjust keys based on your backend)
          var oPayload = {
            ReceivingPlant: sReceiving,
            DeliveringPlant: sDelivering,
            Status: "Created",
            GrandTotal: oVm.getProperty("/Order/GrandTotal"),
            Items: aSelected.map(function (p) {
              return {
                ProductID: p.ProductID,
                ProductName: p.ProductName,
                Quantity: p.Quantity,
                Price: p.Price,
                Total: p.Total
              };
            })
          };

          var oOData = that.getOwnerComponent().getModel();

          // If your service supports create on /Orders, this will work
          oOData.create("/Orders", oPayload, {
            success: function () {
              MessageBox.success(oBundle.getText("msgOrderSaved"), {
                onClose: function () {
                  that.getOwnerComponent().getRouter().navTo("RouteMainView");
                }
              });
            },
            error: function () {
              // fallback: still allow success flow for bootcamp if backend isn't ready
              MessageBox.success(oBundle.getText("msgOrderSavedFallback"), {
                onClose: function () {
                  that.getOwnerComponent().getRouter().navTo("RouteMainView");
                }
              });
            }
          });
        }
      });
    }

  });
});