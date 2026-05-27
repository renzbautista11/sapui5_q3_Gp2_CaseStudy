/*  Edit Page
    Description: In this page, user should be able to edit an existing Product Order with the 
    associated list of products and amount.
*/

sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageBox",
  "sap/ui/model/json/JSONModel",
  "sap/m/SelectDialog",
  "sap/m/StandardListItem",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator"
], function (Controller, MessageBox, JSONModel, SelectDialog, StandardListItem, Filter, FilterOperator) {
  "use strict";

  return Controller.extend("sapips.training.g2casestudy.controller.EditPage", {
    onInit: function () {
      // Create model for Edit Page
      var oEditModel = new JSONModel({
        Order: {}, // header info
        Items: []  // line items, initially empty until loaded from Detail page
      });
      this.getView().setModel(oEditModel, "edit");

      // Load Products
      var oProductsModel = new JSONModel();
      oProductsModel.loadData("localService/mainService/data/Products.json");
      this.getView().setModel(oProductsModel, "products");

      var oRouter = this.getOwnerComponent().getRouter();
      oRouter.getRoute("RouteEditPage").attachPatternMatched(this._onObjectMatched, this);
    },

    _onObjectMatched: function (oEvent) {
      var sOrderId = oEvent.getParameter("arguments").orderId;

      // Load Order details
      const oModel = this.getOwnerComponent().getModel();

      this.byId("inputOrderNumberEP").setValue(sOrderId);

      oModel.read("/Orders", {
        filters: [
          new Filter("OrderID", FilterOperator.EQ, sOrderId)
        ],
        success: (oData) => {
          this.byId("inputOrderNumberEP").setValue(oData.results[0].OrderID);

          var oDate = new Date(oData.results[0].OrderDate);
          var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "dd MMM yyyy" });
          this.byId("inputCreatedOnEP").setValue(oDateFormat.format(oDate));

          this.byId("inputReceivingPlantEP").setValue(oData.results[0].ReceivingPlant);
          this.byId("inputDeliveringPlantEP").setValue(oData.results[0].DeliveringPlant);
          this.byId("selectStatusEP").setSelectedKey(oData.results[0].Status);
        }
      });

      const oTable = this.byId("tableProductsEP");
      const oTemplate = this.byId("cliProductsEP").clone();
      oTable.bindItems({
        path: "/Order_Details",
        filters: [
          new Filter("OrderID", FilterOperator.EQ, sOrderId)
        ],
        parameters: { expand: "Products" },
        template: oTemplate
      });


    },

    // Set Product section title with count of products
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

        // Show confirmation when Saving
        onSave: function () {
          MessageBox.confirm("Are you sure you want to Save these changes?", {
            title: "Confirm Save",
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            emphasizedAction: MessageBox.Action.YES,
            onClose: function (sAction) {
              if (sAction === MessageBox.Action.YES) {

                // Get Order Id
                var orderId = this.getView().getModel().getProperty("/Order/OrderID");
                MessageBox.success("The Order " + orderId + " has been updated successfully.", {
                  actions: [MessageBox.Action.OK],
                  onClose: function () {
                    // Navigate back to Detail page
                    window.history.go(-1);
                  }
                });
              }
            }.bind(this)
          });
        },

    // Show confirmation when Deleting
    onDeleteProduct: function () {
      var oTable = this.byId("tableProductsEP");
      var aSelectedContexts = oTable.getSelectedContexts(true);

      if (!aSelectedContexts || aSelectedContexts.length === 0) {
      MessageBox.error("Please select an item from the table.");
      return;
      }

      var iCount = aSelectedContexts.length;
      MessageBox.confirm("Are you sure you want to delete " + iCount + " item(s)?", {
      title: "Confirm Delete",
      actions: [MessageBox.Action.YES, MessageBox.Action.NO],
      emphasizedAction: MessageBox.Action.NO,
      onClose: function (sAction) {
        if (sAction !== MessageBox.Action.YES) {
        return;
        }

        var oODataModel = this.getOwnerComponent().getModel();
        var iToDelete = aSelectedContexts.length;
        var iDone = 0;
        var iFailed = 0;
        var that = this;

        function _checkFinish() {
        if (iDone + iFailed === iToDelete) {
          // Refresh binding to reflect deletions
          var oBinding = oTable.getBinding("items");
          if (oBinding) { oBinding.refresh(); }

          oTable.removeSelections(true);

          if (iFailed === 0) {
          MessageBox.success("Selected product(s) deleted.");
          } else if (iDone === 0) {
          MessageBox.error("Failed to delete selected product(s).");
          } else {
          MessageBox.warning(iDone + " deleted, " + iFailed + " failed.");
          }
        }
        }

        aSelectedContexts.forEach(function (oContext) {
        var sPath = oContext.getPath();
        oODataModel.remove(sPath, {
          success: function () {
          iDone++;
          _checkFinish();
          },
          error: function () {
          iFailed++;
          _checkFinish();
          }
        });
        });
      }.bind(this)
      });
    },

    // Show confirmation when Canceling
    onCancel: function () {
      MessageBox.confirm("Are you sure you want to cancel the changes done in the page?", {
        title: "Confirm Cancel",
        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        emphasizedAction: MessageBox.Action.NO,
        onClose: function (sAction) {
          if (sAction === MessageBox.Action.YES) {
            // Navigate back to Detail page
            window.history.go(-1);
          }
        }
      });
    },

    //------------------------------------------------------------------------
    // Add Product to Order - original from branch development/edit_page_jinky
    //------------------------------------------------------------------------
    onAddProduct: function () {
      // Lazy create dialog (for resuability)
      if (!this._oAddDialog) {
        this._oAddDialog = new SelectDialog({
          title: "Select Product",
          
          // Search
          search: function (oEvent) {
            var sValue = oEvent.getParameter("value") || "";
            var oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter(new Filter("ProductName", FilterOperator.Contains, sValue));
          },

          // When product is selected
          confirm: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (!oSelectedItem) { return; }

            var oProduct = oSelectedItem.getBindingContext("products").getObject();

            var oModel = this.getView().getModel("edit");
            var aItems = oModel.getProperty("/Items") || [];

            // Check if product is already added
            var bExists = aItems.some(function (oItem) {
              return oItem.ProductID === oProduct.ProductID;
            });

            if (bExists) {
              MessageToast.show("Product is already added.");
              return;
            }

            var iQuantity = 1; 
            var fUnitPrice = Number(oProduct.UnitPrice) || 0;

            // Add new product to table
            aItems.push({
              ProductID: oProduct.ProductID,
              ProductName: oProduct.ProductName,
              Quantity: iQuantity,
              UnitPrice: fUnitPrice,
              TotalPrice: iQuantity * fUnitPrice
            });

            oModel.setProperty("/Items", aItems);

            MessageToast.show("Product added to the order.");
          }.bind(this)
        });

        this._oAddDialog.setModel(this.getView().getModel("products"), "products");
        this._oAddDialog.bindAggregation("items", {
          path: "products>/", 
          template: new StandardListItem({
            title: "{products>ProductName}",
            description: "{products>ProductID}"
          })
        });
      }

      this._oAddDialog.open();
    },

    onNavBack: function () {
      // Navigate back to Detail page
      window.history.go(-1);
    }
  });
});