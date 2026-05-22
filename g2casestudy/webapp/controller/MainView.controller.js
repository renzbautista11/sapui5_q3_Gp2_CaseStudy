sap.ui.define([
    "sap/ui/core/mvc/Controller"
], (Controller) => {
    "use strict";

    return Controller.extend("sapips.training.g2casestudy.controller.MainView", {
        onInit() {
        },

        onNavToCreate: function () {
            this.getOwnerComponent().getRouter().navTo("RouteCreate");
        }
    });
});