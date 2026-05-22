sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
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
            // to be implemented later
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
