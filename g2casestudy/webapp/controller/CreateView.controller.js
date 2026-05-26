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
          CreatedOn: new Date(),     // criteria #7 [1](https://myoffice.accenture.com/personal/patricia_m_o_montaos_accenture_com/Documents/Forms/DispForm.aspx?ID=138082&web=1)
          Status: "Created",         // criteria #8 [1](https://myoffice.accenture.com/personal/patricia_m_o_montaos_accenture_com/Documents/Forms/DispForm.aspx?ID=138082&web=1)
          ReceivingPlantCode: "",
          ReceivingPlantName: "",
          DeliveringPlantCode: "",
          DeliveringPlantName: ""
        },
        AvailablePlants: [],
        AvailableProducts: [],
        FilteredProducts: [],
        SelectedProducts: []
      });

      this.getView().setModel(oVm, "vm");

      this._loadPlants();
      this._loadProducts();
    },

    // -----------------------------
    // Navigation
    // -----------------------------
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

    // -----------------------------
    // Load Value Help Data
    // -----------------------------
    _loadProducts: function () {
      var oOData = this.getOwnerComponent().getModel();
      var oVm = this.getView().getModel("vm");

      oOData.read("/Products", {
        success: function (oData) {
          var a = (oData && oData.results) ? oData.results : [];
          oVm.setProperty("/AvailableProducts", a);
          // FilteredProducts will be set once Delivering Plant is chosen
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
          // fallback mock
          oVm.setProperty("/AvailablePlants", [
            { PlantCode: "9101", PlantName: "Singapore" },
            { PlantCode: "9102", PlantName: "Malaysia" },
            { PlantCode: "9103", PlantName: "Philippines" }
          ]);
        }
      });
    },

    // -----------------------------
    // Plant Value Help
    // -----------------------------
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

              // IMPORTANT: Products must be based on Delivering Plant (criteria #3) [1](https://myoffice.accenture.com/personal/patricia_m_o_montaos_accenture_com/Documents/Forms/DispForm.aspx?ID=138082&web=1)
              this._applyProductFilterByDeliveringPlant(sCode);

              // optional: clear currently selected products when delivering plant changes
              oVm.setProperty("/SelectedProducts", []);
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

    // -----------------------------
    // Product Filtering by Delivering Plant
    // -----------------------------
    _applyProductFilterByDeliveringPlant: function (sDeliveringPlantCode) {
      var oVm = this.getView().getModel("vm");
      var aAll = oVm.getProperty("/AvailableProducts") || [];

      // Ensure type-safe comparison (string vs number issue fix)
      var sCode = (sDeliveringPlantCode || "").toString().trim();

      var aFiltered = aAll.filter(function (p) {
        return (p.DeliveringPlantCode || "").toString() === sCode;
      });

      console.log("Selected Plant:", sCode);
      console.log("Filtered Products:", aFiltered);

      oVm.setProperty("/FilteredProducts", aFiltered);

      
console.log("Sample product[0]:", aAll[0]);
console.log("Sample product[0].DeliveringPlantCode:", aAll[0] && aAll[0].DeliveringPlantCode);
    },

    // -----------------------------
    // Add Product (SelectDialog)
    // -----------------------------
    onAddProduct: function () {
      var oVm = this.getView().getModel("vm");
      var oBundle = this.getView().getModel("i18n").getResourceBundle();

      var sDeliveringCode = (oVm.getProperty("/Order/DeliveringPlantCode") || "").trim();
      if (!sDeliveringCode) {
        MessageBox.error(oBundle.getText("msgDeliveringRequired"));
        return;
      }

      // ensure product list is filtered
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
          }
        });

        this.getView().addDependent(this._oProductDialog);

        // IMPORTANT: bind to FilteredProducts (based on delivering plant)
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

    // -----------------------------
    // Quantity change + total calc
    // -----------------------------
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

    // -----------------------------
    // Delete product from list
    // -----------------------------
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
            oTable.removeSelections(true);
          }
        }
      );
    },

    // -----------------------------
    // Cancel with confirmation (criteria #12)
    // -----------------------------
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

    // -----------------------------
    // Save (criteria #6–#8)
    // -----------------------------

    onSave: function () {
      var oVm = this.getView().getModel("vm");
      var oBundle = this.getView().getModel("i18n").getResourceBundle();

      var oOrder = oVm.getProperty("/Order") || {};
      var aSelected = oVm.getProperty("/SelectedProducts") || [];
      var that = this;

      // ✅ VALIDATION
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

      // ✅ CONFIRM SAVE
      MessageBox.confirm(oBundle.getText("msgConfirmSave"), {
        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        onClose: function (oAction) {
          if (oAction !== MessageBox.Action.YES) { return; }

          // ✅ STEP 1: CREATE ORDER
          that._createOrder()
            .then(function (oCreatedOrder) {

              console.log("Created Order Response:", oCreatedOrder);

              var iOrderId = oCreatedOrder.OrderID;

              // ✅ STEP 2: CREATE ORDER DETAILS
              return that._createOrderDetails(iOrderId).then(function () {
                return iOrderId;
              });
            })

            .then(function (iOrderId) {

              // ✅ REFRESH DATA
              var oModel = that.getOwnerComponent().getModel();
              if (oModel) {
                oModel.refresh(true);
              }

              // ✅ FORMAT ORDER NUMBER
              var sFormattedOrderNo = that._formatOrderNumber(iOrderId);

              // ✅ SUCCESS MESSAGE
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

      // Build display strings like main page: "9101 - Singapore"
      var sReceiving = (oOrder.ReceivingPlantCode || "") + " - " + (oOrder.ReceivingPlantName || "");
      var sDelivering = (oOrder.DeliveringPlantCode || "") + " - " + (oOrder.DeliveringPlantName || "");

      // OData metadata field is OrderDate (Edm.DateTime), not CreatedOn
      var dOrderDate = oOrder.CreatedOn || new Date();

      var oPayload = {
        CustomerID: oOrder.CustomerID || "Cust1",       // optional default if required by your metadata
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
        // Map your VM fields to Order_Detail fields (UnitPrice + Quantity + ProductID + OrderID)
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
      // UI display: 012201 style (pad to 6 digits)
      var s = String(vOrderId || "");
      return s.padStart(6, "0");
    },

    onExit: function () {
      if (this._oPlantDialog) { this._oPlantDialog.destroy(); }
      if (this._oProductDialog) { this._oProductDialog.destroy(); }
    }

  });
});