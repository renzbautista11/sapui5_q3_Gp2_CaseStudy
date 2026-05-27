sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/m/SelectDialog",
  "sap/m/StandardListItem",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator"
], function (
  Controller,
  JSONModel,
  MessageBox,
  MessageToast,
  SelectDialog,
  StandardListItem,
  Filter,
  FilterOperator,
) {
  "use strict";

  return Controller.extend("sapips.training.g2casestudy.controller.CreateView", {

    onInit: function () {
      const oVm = new JSONModel({
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

    // load value
    _loadProducts: function () {
      const oOData = this.getOwnerComponent().getModel();
      const oVm = this.getView().getModel("vm");

      oOData.read("/Products", {
        success: function (oData) {
          const a = (oData && oData.results) ? oData.results : [];
          oVm.setProperty("/AvailableProducts", a);
        },
        error: function () {
          oVm.setProperty("/AvailableProducts", []);
        }
      });
    },

    _loadPlants: function () {
      const oOData = this.getOwnerComponent().getModel();
      const oVm = this.getView().getModel("vm");

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

      const oBundle = this.getView().getModel("i18n").getResourceBundle();

      if (!this._oPlantDialog) {
        this._oPlantDialog = new SelectDialog({
          title: oBundle.getText("vhPlantTitle"),

          search: function (oEvent) {
            const sValue = oEvent.getParameter("value") || "";
            const oBinding = oEvent.getSource().getBinding("items");

            oBinding.filter(
              sValue ? [new Filter("PlantName", FilterOperator.Contains, sValue)] : []
            );
          },

          confirm: function (oEvent) {
            const oItem = oEvent.getParameter("selectedItem");
            if (!oItem) { return; }

            const oVm = this.getView().getModel("vm");
            const oPlant = oItem.getBindingContext("vm").getObject();

            console.log("Selected Plant Object:", oPlant);

            const sCode = oPlant.PlantCode || "";
            const sName = oPlant.PlantName || "";

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
      const oVm = this.getView().getModel("vm");
      const aAll = oVm.getProperty("/AvailableProducts") || [];

      const sCode = (sDeliveringPlantCode || "").toString().trim();

      const aFiltered = aAll.filter(function (p) {
        return (p.DeliveringPlantCode || "").toString() === sCode;
      });

      oVm.setProperty("/FilteredProducts", aFiltered);

    },

    // add prouct dialog
    onAddProduct: function () {
      const oVm = this.getView().getModel("vm");
      const oBundle = this.getView().getModel("i18n").getResourceBundle();

      const sDeliveringCode = (oVm.getProperty("/Order/DeliveringPlantCode") || "").trim();
      if (!sDeliveringCode) {
        MessageBox.error(oBundle.getText("msgDeliveringRequired"));
        return;
      }

      this._applyProductFilterByDeliveringPlant(sDeliveringCode);

      this._openProductDialog();
    },

    _openProductDialog: function () {
      const oVm = this.getView().getModel("vm");
      const oBundle = this.getView().getModel("i18n").getResourceBundle();
      const that = this;

      if (!this._oProductDialog) {
        this._oProductDialog = new SelectDialog({
          title: oBundle.getText("vhProductTitle"),

          search: function (oEvent) {
            const sValue = oEvent.getParameter("value") || "";
            const oBinding = oEvent.getSource().getBinding("items");

            oBinding.filter(
              sValue ? [new Filter("ProductName", FilterOperator.Contains, sValue)] : []
            );
          },

          confirm: function (oEvent) {
            const oItem = oEvent.getParameter("selectedItem");
            if (!oItem) { return; }

            const oProd = oItem.getBindingContext("vm").getObject();

            const sId = oProd.ProductID || oProd.ID || oProd.ProductId || oProd.ProductName;
            const sName = oProd.ProductName || oProd.Name || "";
            const fPrice = Number(oProd.UnitPrice || oProd.Price || 0);

            const aSelected = oVm.getProperty("/SelectedProducts") || [];

            const bExists = aSelected.some(function (x) { return x.ProductID === sId; });
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
      const oInput = oEvent.getSource();
      const oBundle = this.getView().getModel("i18n").getResourceBundle();

      const sPath = oInput.getBindingContext("vm").getPath(); // /SelectedProducts/0
      const iQty = Number(oEvent.getParameter("value"));

      if (!iQty || iQty <= 0) {
        oInput.setValueState("Error");
        oInput.setValueStateText(oBundle.getText("msgQtyInvalid"));
        return;
      }

      oInput.setValueState("None");

      const oVm = this.getView().getModel("vm");
      const fPrice = Number(oVm.getProperty(sPath + "/Price") || 0);

      oVm.setProperty(sPath + "/Quantity", iQty);
      oVm.setProperty(sPath + "/Total", fPrice * iQty);
    },

    // delete a product from selected products
    onDeleteProduct: function () {
      const oTable = this.byId("idTblProduct");
      const aSelectedItems = oTable.getSelectedItems();
      const oBundle = this.getView().getModel("i18n").getResourceBundle();
      const that = this;

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

            const oVm = that.getView().getModel("vm");
            const aProducts = oVm.getProperty("/SelectedProducts") || [];

            const aIdx = aSelectedItems.map(function (oItem) {
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
      const oBundle = this.getView().getModel("i18n").getResourceBundle();
      const that = this;

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
      const oVm = this.getView().getModel("vm");
      const oBundle = this.getView().getModel("i18n").getResourceBundle();

      const oOrder = oVm.getProperty("/Order") || {};
      const aSelected = oVm.getProperty("/SelectedProducts") || [];
      const that = this;

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

              const iOrderId = oCreatedOrder.OrderID;

              return that._createOrderDetails(iOrderId).then(function () {
                return iOrderId;
              });
            })

            .then(function (iOrderId) {

              const sFormattedOrderNo = that._formatOrderNumber(iOrderId);

              const oComponent = that.getOwnerComponent();
              const oModel = oComponent.getModel();

              const oOrder = oVm.getProperty("/Order");
              const aSelected = oVm.getProperty("/SelectedProducts");

              const oFinalOrderPayload = {
                OrderID: sFormattedOrderNo,
                CustomerID: "Cust1",
                OrderDate: oOrder.CreatedOn || new Date(),
                Status: "Created",
                ReceivingPlant: oOrder.ReceivingPlantCode + " - " + oOrder.ReceivingPlantName,
                DeliveringPlant: oOrder.DeliveringPlantCode + " - " + oOrder.DeliveringPlantName
              };

              const aFinalOrderDetails = aSelected.map(function (p) {
                return {
                  OrderID: sFormattedOrderNo,
                  ProductID: p.ProductID,
                  UnitPrice: p.Price,
                  Quantity: p.Quantity
                };
              });

              const aOrders = oModel.getProperty("/Orders") || [];
              aOrders.push(oFinalOrderPayload);
              oModel.setProperty("/Orders", aOrders);

              const aOrderDetails = oModel.getProperty("/Order_Details") || [];
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
      const oVm = this.getView().getModel("vm");

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

      const oTable = this.byId("idTblProduct");
      if (oTable) {
        oTable.removeSelections(true);
      }
    },

    _createOrder: function () {
      const oVm = this.getView().getModel("vm");
      const oOrder = oVm.getProperty("/Order") || {};
      const oModel = this.getOwnerComponent().getModel();

      const sReceiving = (oOrder.ReceivingPlantCode || "") + " - " + (oOrder.ReceivingPlantName || "");
      const sDelivering = (oOrder.DeliveringPlantCode || "") + " - " + (oOrder.DeliveringPlantName || "");

      const dOrderDate = oOrder.CreatedOn || new Date();

      const oPayload = {
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
      const oVm = this.getView().getModel("vm");
      const oModel = this.getOwnerComponent().getModel();
      const aItems = oVm.getProperty("/SelectedProducts") || [];

      const aPromises = aItems.map(function (p) {
        const oDetailPayload = {
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
      const s = String(vOrderId || "");
      return s.padStart(6, "0");
    },

    formatProductTitle: function (iCount) {
      let oBundle;

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

      const iSafeCount = iCount || 0; // safety fallback
      if (oBundle && oBundle.getText) {
        return oBundle.getText("productSectionTitleWithCount", [iSafeCount]);
      }

      return "Products (" + iSafeCount + ")";
    },
    
    _updateSelectedCount: function () {
      const oVm = this.getView().getModel("vm");
      const aSelected = oVm.getProperty("/SelectedProducts") || [];
      oVm.setProperty("/SelectedCount", aSelected.length);
    },

    onExit: function () {
      if (this._oPlantDialog) { this._oPlantDialog.destroy(); }
      if (this._oProductDialog) { this._oProductDialog.destroy(); }
    }

  });
});