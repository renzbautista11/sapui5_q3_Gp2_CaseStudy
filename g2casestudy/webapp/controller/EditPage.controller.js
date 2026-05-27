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
  "sap/m/MessageToast",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator"
], function (Controller, MessageBox, JSONModel, SelectDialog, StandardListItem,
  MessageToast, Filter, FilterOperator) {
  "use strict";

  return Controller.extend("sapips.training.g2casestudy.controller.EditPage", {
    onInit: function () {
      /*
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
      
      this.getOwnerComponent().getRouter()
            .getRoute("Edit")
            .attachPatternMatched(this._onObjectMatched, this);

            */
      this.getOwnerComponent().getRouter()
        .getRoute("RouteEditPage")
        .attachPatternMatched(this._onObjectMatched, this);
    },

    _onObjectMatched: function (oEvent) {
      var sOrderId = oEvent.getParameter("arguments").orderId;

      // Load Order details
      const oModel = this.getOwnerComponent().getModel();

      //this.byId("inputOrderNumberEP").setValue(sOrderId);

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
      
      oTable.getBinding("items").attachChange(function () {
      var iCount = oTable.getItems().length;

      oTable.setHeaderText("Product (" + iCount + ")");
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
                //var orderId = this.getView().getModel().getProperty("/Orders/OrderID");
                var orderId = this.byId("inputOrderNumberEP").getValue();
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
       var oModel = this.getView().getModel();

        // Get DeliveringPlantCode of current Order
        var oDeliveringInput = this.byId("inputDeliveringPlantEP");
        var sPlantCode = (oDeliveringInput ? oDeliveringInput.getValue() : "").toString().split("-")[0].trim();

        if (!this._oProductDialog) {
        this._oProductDialog = sap.ui.xmlfragment(
            this.getView().getId(),
            "sapips.training.g2casestudy.fragment.EditPage",
            this
        );
        this.getView().addDependent(this._oProductDialog);
    }
        // Apply filter
        var oFilter = new sap.ui.model.Filter(
            "DeliveringPlantCode",
            sap.ui.model.FilterOperator.EQ,
            sPlantCode
        );

    var oBinding = this._oProductDialog.getBinding("items");
    oBinding.filter([oFilter]);    

    this._oProductDialog.open();
    },
                onQuantityChange: function (oEvent) {

                const oInput = oEvent.getSource();

                const iQty = parseInt(oInput.getValue()) || 0;

                const oContext = oInput.getBindingContext();

                if (!iQty || iQty <= 0) {
                  oInput.setValueState("Error");
                  oInput.setValueStateText("Quantity must be a greater than 0.");
                  return;
                }
                oInput.setValueState("None");

                const iPrice = oContext.getProperty("Price");

                const iTotal = iQty * iPrice;

                oContext.getModel().setProperty(
                    oContext.getPath() + "/Quantity",
                    iQty
                );

                oContext.getModel().setProperty(
                    oContext.getPath() + "/Total",
                    iTotal
                );

            },
            onProductConfirm: function (oEvent) {

              const oSelectedItem = oEvent.getParameter("selectedItem");

              // close dialog if exists
              if (this._oProductDialog) {
               // this._oProductDialog.close();
              }

              if (!oSelectedItem) return;

              const oProduct = oSelectedItem.getBindingContext().getObject();
              const sOrderId = this.byId("inputOrderNumberEP").getValue();
              const fUnitPrice = Number(oProduct.UnitPrice ?? oProduct.Price ?? 0);

              // Check if product already exists in the table
              const oTable = this.byId("tableProductsEP");
              const oBinding = oTable && oTable.getBinding("items");
              if (oBinding) {
              const aContexts = oBinding.getContexts();
              const bExists = aContexts.some(function (oCtx) {
                const sExistingProductId = oCtx.getProperty("ProductID");
                const sExistingOrderId = oCtx.getProperty("OrderID");
                return sExistingProductId === oProduct.ProductID && sExistingOrderId === sOrderId;
              });
              if (bExists) {
                MessageToast.show("The selected product is already exists in this order.");
                return;
              }
              }

              const oNewProduct = {
              OrderID: sOrderId,
              ProductID: oProduct.ProductID,
              Quantity: 1,
              UnitPrice: fUnitPrice,
              Total: fUnitPrice * 1
              };

              // Use OData create to add a new Order_Details entry
              const oODataModel = this.getOwnerComponent().getModel();
              oODataModel.create("/Order_Details", oNewProduct, {
              success: function () {
                // refresh the table binding so the new item appears
                const oTable = this.byId("tableProductsEP");
                const oBinding = oTable && oTable.getBinding("items");
                if (oBinding) { oBinding.refresh(); }
              }.bind(this),
              error: function () {
                MessageBox.error("Failed to add the selected product.");
              }
              });

            },

          onNavBack: function () {
      // Navigate back to Detail page
      window.history.go(-1);
    }
  });
});