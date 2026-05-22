sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox"
], function (Controller, MessageBox) {
    "use strict";

    return Controller.extend("sapips.training.g2casestudy.controller.CreateView", {

        onInit: function () {
            var oModel = this.getOwnerComponent().getModel(); // OData model

            var that = this;

            // Read products from backend (mock)
            oModel.read("/Products", {
                success: function (oData) {
                    var oJsonModel = new sap.ui.model.json.JSONModel({
                        Products: oData.results
                    });

                    // Set as view model
                    that.getView().setModel(oJsonModel, "vm");
                }
            });
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteMainView");
        },

        // Value Help (placeholder for now)
        onValueHelpReceivingPlant: function () {
            // to be implemented later
        },

        onValueHelpDeliveringPlant: function () {
            // to be implemented later
        },

        // Product actions (placeholder)
        onAddProduct: function () {
            // to be implemented later
        },

        onDeleteProduct: function () {
            var oTable = this.byId("idTblProduct");
            var aSelectedItems = oTable.getSelectedItems();

            // 1. Validation: no selection
            if (aSelectedItems.length === 0) {
                MessageBox.error("Please select an item from the table.");
                return;
            }

            // 2. Confirmation dialog
            var that = this;

            MessageBox.confirm(
                "Are you sure you want to delete " + aSelectedItems.length + " item(s)?",
                {
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    onClose: function (oAction) {

                        if (oAction === MessageBox.Action.YES) {

                            var oModel = that.getView().getModel("vm");
                            var aProducts = oModel.getProperty("/Products");

                            // 3. Remove selected items
                            aSelectedItems.forEach(function (oItem) {
                                var oContext = oItem.getBindingContext("vm");
                                var iIndex = parseInt(oContext.getPath().split("/")[2]);

                                aProducts.splice(iIndex, 1);
                            });

                            // 4. Refresh model
                            oModel.setProperty("/Products", aProducts);

                            // 5. Clear selection
                            oTable.removeSelections();
                        }
                    }
                }
            );
        },

        // Footer actions
        onSave: function () {
            // to be implemented later
        },

        onCancel: function () {
            this.getOwnerComponent().getRouter().navTo("RouteMainView");
        }

    });
});
