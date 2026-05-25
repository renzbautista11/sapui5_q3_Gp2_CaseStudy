/*  Edit Page
    Description: In this page, user should be able to edit an existing Product Order with the 
    associated list of products and amount.
*/

sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageBox",
  "sap/m/MessageToast"
], function (Controller, MessageBox, MessageToast) {
  "use strict";

  return Controller.extend("g2casestudy.controller.EditPage", {
    onInit: function () {
      // Initialization code for EditPage controller
    },

    // Show confirmation when Saving
    onSave: function () {
      MessageBox.confirm("Are you sure you want to Save these changes?", {
        title: "Confirm Save",
        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        emphasizedAction: MessageBox.Action.YES,
        onClose: function (sAction) {
          if (sAction === MessageBox.Action.YES) {
            MessageToast.show("The Order <Order Number> has been updated successfully.");
          }
        }
      });
    },

    // Show confirmation when Deleting
    onDeleteProduct: function () {
      var oTable = this.byId("tableProductsEP");
      var aSelectedContexts = oTable.getSelectedContexts(true);

      // Check if no product is selected
      if (!aSelectedContexts || aSelectedContexts.length === 0) {
        MessageBox.error("Please select an item from the table.");
        return;
      }
      // If item/s is/are selected
      var iCount = aSelectedContexts.length;
      MessageBox.confirm("Are you sure you want to delete "+ iCount + " items(?)", {
        title: "Confirm Delete",
        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        emphasizedAction: MessageBox.Action.NO,
        onClose: function (sAction) {
          if (sAction === MessageBox.Action.YES) {

            var oModel = this.getView().getModel("edit");
            var aItems = oModel.getProperty("/Items") || [];

            // Get the ProductIDs of selected items
            var aSelectedIDs = aSelectedContexts.map(function (oContext) {
              return oContext.getObject().ProductID;
            });

            // Filter out selected items
            var aUpdatedItems = aItems.filter(function (oItem) {
              return aSelectedIDs.indexOf(oItem.ProductID) === -1;
            });

            // Update the model with the remaining items
            oModel.setProperty("/Items", aUpdatedItems);

            // Clear selection in the table
            oTable.removeSelections(true);

            // Show success message
            MessageToast.show("Selected product(s) deleted.");
          }
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

    onAddProduct: function () {
      var oProductsModel = this.getView().getModel("products");

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
              Total: iQuantity * fUnitPrice
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
    }
  });
});