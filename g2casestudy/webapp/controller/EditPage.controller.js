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

  var oOrdersModel = new JSONModel();
  oOrdersModel.loadData("localService/mainService/data/Orders.json"); 

  var oDetailsModel = new JSONModel();
  oDetailsModel.loadData("localService/mainService/data/Order_Details.json");

  var that = this;

  Promise.all([
    new Promise(resolve => oOrdersModel.attachRequestCompleted(resolve)),
    new Promise(resolve => oDetailsModel.attachRequestCompleted(resolve)) 
  ]).then(function () {
    var aOrders = oOrdersModel.getData();
    var aDetails = oDetailsModel.getData();
    var aProducts = that.getView().getModel("products").getData();

    var oOrder = aOrders.find(o => String(o.OrderID) === String(sOrderId));

    if (!oOrder) {
      MessageBox.error("Order not found.");
      return;
    }

    var aItems = aDetails
      .filter(d => String(d.OrderID) === String(sOrderId))
      .map(function (d) {

        var oProduct = aProducts.find(p => p.ProductID === d.ProductID) || {};

        var iQuantity = Number(d.Quantity) || 0;
        var fUnitPrice = Number(d.UnitPrice) || 0;

        return {
          ProductID: d.ProductID,
          ProductName: oProduct.ProductName,
          Quantity: iQuantity,
          UnitPrice: fUnitPrice,
          TotalPrice: iQuantity * fUnitPrice
        };
      });

    var sFormattedDate = that.formatODataDate(oOrder.OrderDate);

    that.getView().getModel("edit").setData({
      Order: {
        OrderID: oOrder.OrderID,
        CustomerID: oOrder.CustomerID,
        OrderDate: sFormattedDate,
        Status: oOrder.Status,
        ReceivingPlant: oOrder.ReceivingPlant,
        DeliveringPlant: oOrder.DeliveringPlant
      },
      Items: aItems
    });

  });
},

    // Change format date to DD MMM YYYY
    formatODataDate: function (sODataDate) {
    if (!sODataDate) {
      return "";
    }

    var aMatch = sODataDate.match(/\/Date\((\d+)\)\//);
    if (!aMatch) {
      return "";
    }

    var iTimestamp = parseInt(aMatch[1], 10);
    var oDate = new Date(iTimestamp);

    return oDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
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
            var orderId = this.getView().getModel("edit").getProperty("/Order/OrderID");
            MessageBox.success("The Order " + orderId + " has been updated successfully.");
          }
        }.bind(this)
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
      MessageBox.confirm("Are you sure you want to delete "+ iCount + " item(s)?", {
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
            MessageBox.success("Selected product(s) deleted.");
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

    // Add Product to Order
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
              MessageBox.information("Product is already added.");
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

            MessageBox.success("Product added to the order.");
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