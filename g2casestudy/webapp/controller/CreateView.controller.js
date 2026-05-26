sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/m/SelectDialog",
  "sap/m/StandardListItem",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/core/routing/History"
], function (
  Controller,
  JSONModel,
  MessageBox,
  MessageToast,
  SelectDialog,
  StandardListItem,
  Filter,
  FilterOperator,
  History
) {
  "use strict";

  return Controller.extend("sapips.training.g2casestudy.controller.CreateView", {

    onInit: function () {
      var oVm = new JSONModel({
        Order: {
          OrderNumber: "",
          CreatedOn: new Date(),
          Status: "Created",
          ReceivingPlantCode: "",
          ReceivingPlantName: "",
          DeliveringPlantCode: "",
          DeliveringPlantName: ""
        },
        AvailablePlants: [],
        AvailableProducts: [],
        FilteredProducts: [],
        SelectedProducts: [],
        SelectedCount: 0
      });

      this.getView().setModel(oVm, "vm");

      this._loadPlants();
      this._loadProducts();
    },

    // navigation back to main page
    onNavBack: function () {
      var oHistory = History.getInstance();
      var sPreviousHash = oHistory.getPreviousHash();
      var oRouter = this.getOwnerComponent().getRouter();

      if (sPreviousHash !== undefined) {
        window.history.go(-1);
      } else {
        oRouter.navTo("RouteMainView", {}, true);
      }
    },

    // load value
    _loadProducts: function () {
      var oOData = this.getOwnerComponent().getModel();
      var oVm = this.getView().getModel("vm");

      oOData.read("/Products", {
        success: function (oData) {
          var a = (oData && oData.results) ? oData.results : [];
          oVm.setProperty("/AvailableProducts", a);
        },
        error: function () {
          oVm.setProperty("/AvailableProducts", []);
        }
      });
    },

    _loadPlants: function () {
      var oOData = this.getOwnerComponent().getModel();
      var oVm = this.getView().getModel("vm");

      oOData.read("/Plants", {
        success: function (oData) {
          oVm.setProperty("/AvailablePlants", (oData && oData.results) ? oData.results : []);
        },
        error: function () {
          oVm.setProperty("/AvailablePlants", [
            { PlantCode: "9101", PlantName: "Singapore" },
            { PlantCode: "9102", PlantName: "Malaysia" },
            { PlantCode: "9103", PlantName: "Philippines" }
          ]);
        }
      });
    },

    // plant value
    onValueHelpReceivingPlant: function () {
      this._openPlantDialog("ReceivingPlant");
    },

    onValueHelpDeliveringPlant: function () {
      this._openPlantDialog("DeliveringPlant");
    },

    _openPlantDialog: function (sTargetField) {
      this._sPlantTargetField = sTargetField;

      var oBundle = this.getView().getModel("i18n").getResourceBundle();

      if (!this._oPlantDialog) {
        this._oPlantDialog = new SelectDialog({
          title: oBundle.getText("vhPlantTitle"),

          search: function (oEvent) {
            var sValue = oEvent.getParameter("value") || "";
            var oBinding = oEvent.getSource().getBinding("items");

            oBinding.filter(
              sValue ? [new Filter("PlantName", FilterOperator.Contains, sValue)] : []
            );
          },

          confirm: function (oEvent) {
            var oItem = oEvent.getParameter("selectedItem");
            if (!oItem) { return; }

            var oVm = this.getView().getModel("vm");
            var oPlant = oItem.getBindingContext("vm").getObject();

            console.log("Selected Plant Object:", oPlant);

            var sCode = oPlant.PlantCode || "";
            var sName = oPlant.PlantName || "";

            if (this._sPlantTargetField === "ReceivingPlant") {
              oVm.setProperty("/Order/ReceivingPlantCode", sCode);
              oVm.setProperty("/Order/ReceivingPlantName", sName);
            } else {
              oVm.setProperty("/Order/DeliveringPlantCode", sCode);
              oVm.setProperty("/Order/DeliveringPlantName", sName);

              this._applyProductFilterByDeliveringPlant(sCode);

              oVm.setProperty("/SelectedProducts", []);
              oVm.setProperty("/SelectedCount", 0);
            }
          }.bind(this)
        });

        this.getView().addDependent(this._oPlantDialog);

        this._oPlantDialog.bindAggregation("items", {
          path: "vm>/AvailablePlants",
          template: new StandardListItem({
            title: "{vm>PlantName}",
            description: "{vm>PlantCode}"
          })
        });
      }

      this._oPlantDialog.open();
    },

    // product filter based on delivering plant
    _applyProductFilterByDeliveringPlant: function (sDeliveringPlantCode) {
      var oVm = this.getView().getModel("vm");
      var aAll = oVm.getProperty("/AvailableProducts") || [];

      var sCode = (sDeliveringPlantCode || "").toString().trim();

      var aFiltered = aAll.filter(function (p) {
        return (p.DeliveringPlantCode || "").toString() === sCode;
      });

      oVm.setProperty("/FilteredProducts", aFiltered);

    },

    // add prouct dialog
    onAddProduct: function () {
      var oVm = this.getView().getModel("vm");
      var oBundle = this.getView().getModel("i18n").getResourceBundle();

      var sDeliveringCode = (oVm.getProperty("/Order/DeliveringPlantCode") || "").trim();
      if (!sDeliveringCode) {
        MessageBox.error(oBundle.getText("msgDeliveringRequired"));
        return;
      }

      this._applyProductFilterByDeliveringPlant(sDeliveringCode);

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

            oBinding.filter(
              sValue ? [new Filter("ProductName", FilterOperator.Contains, sValue)] : []
            );
          },

          confirm: function (oEvent) {
            var oItem = oEvent.getParameter("selectedItem");
            if (!oItem) { return; }

            var oProd = oItem.getBindingContext("vm").getObject();

            var sId = oProd.ProductID || oProd.ID || oProd.ProductId || oProd.ProductName;
            var sName = oProd.ProductName || oProd.Name || "";
            var fPrice = Number(oProd.UnitPrice || oProd.Price || 0);

            var aSelected = oVm.getProperty("/SelectedProducts") || [];

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
            that._updateSelectedCount();
          }
        });

        this.getView().addDependent(this._oProductDialog);

        this._oProductDialog.bindAggregation("items", {
          path: "vm>/FilteredProducts",
          template: new StandardListItem({
            title: "{vm>ProductName}",
            description: "{vm>ProductID}"
          })
        });
      }

      this._oProductDialog.open();
    },

    // quantity change and total calculation
    onQtyChange: function (oEvent) {
      var oInput = oEvent.getSource();
      var oBundle = this.getView().getModel("i18n").getResourceBundle();

      var sPath = oInput.getBindingContext("vm").getPath(); // /SelectedProducts/0
      var iQty = Number(oEvent.getParameter("value"));

      if (!iQty || iQty <= 0) {
        oInput.setValueState("Error");
        oInput.setValueStateText(oBundle.getText("msgQtyInvalid"));
        return;
      }

      oInput.setValueState("None");

      var oVm = this.getView().getModel("vm");
      var fPrice = Number(oVm.getProperty(sPath + "/Price") || 0);

      oVm.setProperty(sPath + "/Quantity", iQty);
      oVm.setProperty(sPath + "/Total", fPrice * iQty);
    },

    // delete a product from selected products
    onDeleteProduct: function () {
      var oTable = this.byId("idTblProduct");
      var aSelectedItems = oTable.getSelectedItems();
      var oBundle = this.getView().getModel("i18n").getResourceBundle();
      var that = this;

      if (!aSelectedItems || aSelectedItems.length === 0) {
        MessageBox.error(oBundle.getText("msgSelectItem"));
        return;
      }

      MessageBox.confirm(
        oBundle.getText("msgConfirmDelete", [aSelectedItems.length]),
        {
          actions: [MessageBox.Action.YES, MessageBox.Action.NO],
          onClose: function (oAction) {
            if (oAction !== MessageBox.Action.YES) { return; }

            var oVm = that.getView().getModel("vm");
            var aProducts = oVm.getProperty("/SelectedProducts") || [];

            var aIdx = aSelectedItems.map(function (oItem) {
              return parseInt(oItem.getBindingContext("vm").getPath().split("/")[2], 10);
            }).sort(function (a, b) { return b - a; });

            aIdx.forEach(function (i) {
              aProducts.splice(i, 1);
            });

            oVm.setProperty("/SelectedProducts", aProducts);
            that._updateSelectedCount();
            oTable.removeSelections(true);
          }
        }
      );
    },

    // cancel and reset form
    onCancel: function () {
      var oBundle = this.getView().getModel("i18n").getResourceBundle();
      var that = this;

      MessageBox.confirm(oBundle.getText("msgConfirmCancel"), {
        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        onClose: function (oAction) {
          if (oAction === MessageBox.Action.YES) {
            that._resetCreateForm();
            that.getOwnerComponent().getRouter().navTo("RouteMainView");
          }
        }
      });
    },

    // saving the order and order details
    onSave: function () {
      var oVm = this.getView().getModel("vm");
      var oBundle = this.getView().getModel("i18n").getResourceBundle();

      var oOrder = oVm.getProperty("/Order") || {};
      var aSelected = oVm.getProperty("/SelectedProducts") || [];
      var that = this;

      if (!oOrder.ReceivingPlantCode) {
        MessageBox.error(oBundle.getText("msgReceivingRequired"));
        return;
      }

      if (!oOrder.DeliveringPlantCode) {
        MessageBox.error(oBundle.getText("msgDeliveringRequired"));
        return;
      }

      if (!aSelected.length) {
        MessageBox.error(oBundle.getText("msgAtLeastOneProduct"));
        return;
      }

      MessageBox.confirm(oBundle.getText("msgConfirmSave"), {
        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        onClose: function (oAction) {
          if (oAction !== MessageBox.Action.YES) { return; }

          that._createOrder()
            .then(function (oCreatedOrder) {

              console.log("Created Order Response:", oCreatedOrder);

              var iOrderId = oCreatedOrder.OrderID;

              return that._createOrderDetails(iOrderId).then(function () {
                return iOrderId;
              });
            })

            .then(function (iOrderId) {

              var sFormattedOrderNo = that._formatOrderNumber(iOrderId);

              var oComponent = that.getOwnerComponent();
              var oModel = oComponent.getModel();

              var oOrder = oVm.getProperty("/Order");
              var aSelected = oVm.getProperty("/SelectedProducts");

              var oFinalOrderPayload = {
                OrderID: sFormattedOrderNo,
                CustomerID: "Cust1",
                OrderDate: oOrder.CreatedOn || new Date(),
                Status: "Created",
                ReceivingPlant: oOrder.ReceivingPlantCode + " - " + oOrder.ReceivingPlantName,
                DeliveringPlant: oOrder.DeliveringPlantCode + " - " + oOrder.DeliveringPlantName
              };

              var aFinalOrderDetails = aSelected.map(function (p) {
                return {
                  OrderID: sFormattedOrderNo,
                  ProductID: p.ProductID,
                  UnitPrice: p.Price,
                  Quantity: p.Quantity
                };
              });

              var aOrders = oModel.getProperty("/Orders") || [];
              aOrders.push(oFinalOrderPayload);
              oModel.setProperty("/Orders", aOrders);

              var aOrderDetails = oModel.getProperty("/Order_Details") || [];
              aFinalOrderDetails.forEach(function (item) {
                aOrderDetails.push(item);
              });
              oModel.setProperty("/Order_Details", aOrderDetails);

              oModel.refresh(true);

              MessageBox.success(
                oBundle.getText("msgOrderSavedWithNo", [sFormattedOrderNo]),
                {
                  onClose: function () {
                    that._resetCreateForm();
                    that.getOwnerComponent().getRouter().navTo("RouteMainView");
                  }
                }
              );
            })

            .catch(function (err) {
              console.error("Save failed:", err);
              MessageBox.error(oBundle.getText("msgSaveFailed"));
            });

        }
      });
    },

    _generateOrderNumber: function () {
      return "ORD-" + Date.now();
    },

    _resetCreateForm: function () {
      var oVm = this.getView().getModel("vm");

      oVm.setProperty("/Order", {
        OrderNumber: "",
        CreatedOn: new Date(),
        Status: "Created",
        ReceivingPlantCode: "",
        ReceivingPlantName: "",
        DeliveringPlantCode: "",
        DeliveringPlantName: ""
      });

      oVm.setProperty("/SelectedProducts", []);
      oVm.setProperty("/SelectedCount", 0);
      oVm.setProperty("/FilteredProducts", []);

      var oTable = this.byId("idTblProduct");
      if (oTable) {
        oTable.removeSelections(true);
      }
    },

    _createOrder: function () {
      var oVm = this.getView().getModel("vm");
      var oOrder = oVm.getProperty("/Order") || {};
      var oModel = this.getOwnerComponent().getModel();

      var sReceiving = (oOrder.ReceivingPlantCode || "") + " - " + (oOrder.ReceivingPlantName || "");
      var sDelivering = (oOrder.DeliveringPlantCode || "") + " - " + (oOrder.DeliveringPlantName || "");

      var dOrderDate = oOrder.CreatedOn || new Date();

      var oPayload = {
        CustomerID: oOrder.CustomerID || "Cust1", 
        OrderDate: dOrderDate,
        Status: "Created",
        ReceivingPlant: sReceiving,
        DeliveringPlant: sDelivering
      };

      return new Promise(function (resolve, reject) {
        oModel.create("/Orders", oPayload, {
          success: function (oCreated) { resolve(oCreated); },
          error: function (oErr) { reject(oErr); }
        });
      });
    },

    _createOrderDetails: function (iOrderId) {
      var oVm = this.getView().getModel("vm");
      var oModel = this.getOwnerComponent().getModel();
      var aItems = oVm.getProperty("/SelectedProducts") || [];

      var aPromises = aItems.map(function (p) {
        var oDetailPayload = {
          OrderID: iOrderId,
          ProductID: Number(p.ProductID),
          UnitPrice: Number(p.Price),     // from your SelectedProducts
          Quantity: Number(p.Quantity)
        };

        return new Promise(function (resolve, reject) {
          oModel.create("/Order_Details", oDetailPayload, {
            success: function () { resolve(true); },
            error: function (oErr) { reject(oErr); }
          });
        });
      });

      return Promise.all(aPromises);
    },

    _formatOrderNumber: function (vOrderId) {
      var s = String(vOrderId || "");
      return s.padStart(6, "0");
    },

    formatProductTitle: function (iCount) {
      var oBundle;

      try {
        if (this && this.getView && this.getView().getModel("i18n")) {
          oBundle = this.getView().getModel("i18n").getResourceBundle();
        } else if (this && this.getOwnerComponent && this.getOwnerComponent().getModel("i18n")) {
          oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
        } else if (sap && sap.ui && sap.ui.getCore && sap.ui.getCore().getModel("i18n")) {
          oBundle = sap.ui.getCore().getModel("i18n").getResourceBundle();
        }
      } catch (e) {
        oBundle = null;
      }

      var iSafeCount = iCount || 0; // safety fallback
      if (oBundle && oBundle.getText) {
        return oBundle.getText("productSectionTitleWithCount", [iSafeCount]);
      }

      return "Products (" + iSafeCount + ")";
    },
    
    _updateSelectedCount: function () {
      var oVm = this.getView().getModel("vm");
      var aSelected = oVm.getProperty("/SelectedProducts") || [];
      oVm.setProperty("/SelectedCount", aSelected.length);
    },

    onExit: function () {
      if (this._oPlantDialog) { this._oPlantDialog.destroy(); }
      if (this._oProductDialog) { this._oProductDialog.destroy(); }
    }

  });
});