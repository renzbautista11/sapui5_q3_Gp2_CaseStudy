sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function(Controller, Filter, FilterOperator){
    "use strict";

    return Controller.extend("sapips.training.g2casestudy.controller.DetailView", {

        onInit: function () {

            this.getOwnerComponent()
                .getRouter()
                .getRoute("RouteDetailView")
                .attachPatternMatched(this._onObjectMatched, this);

        },

       _onObjectMatched: function(oEvent){

    const sOrderID = decodeURIComponent(
        oEvent.getParameter("arguments").OrderID
    );

    const oTable = this.byId("tblProducts");
    const oModel = this.getOwnerComponent().getModel();

    this.byId("txtOrderID").setText(sOrderID);

    oModel.read("/Orders", {
        filters: [
            new Filter(
                "OrderID",
                FilterOperator.EQ,
                sOrderID
            )
        ],
        success: (oData)=>{

            this.byId("txtOrderID")
                .setText(oData.results[0].OrderID);

            var oDate = new Date(oData.results[0].OrderDate);

            var oDateFormat =
                sap.ui.core.format.DateFormat.getDateInstance({
                    pattern: "dd MMM yyyy"
                });

            this.byId("txtCreatedOn")
                .setText(oDateFormat.format(oDate));

            this.byId("txtReceivingPlant")
                .setText(oData.results[0].ReceivingPlant);

            this.byId("txtDeliveringPlant")
                .setText(oData.results[0].DeliveringPlant);

            this.byId("_IDGenObjectStatus")
                .setText(oData.results[0].Status);
        }
    });

    oTable.bindItems({
        path: "/Order_Details",
        filters: [
            new Filter(
                "OrderID",
                FilterOperator.EQ,
                sOrderID
            )
        ],
        parameters: {
            "$expand": "Order,Products"
        },
        
        template: oTable.getBindingInfo("items").template
    });
    oTable.getBinding("items").attachChange(function () {
    var iCount = oTable.getItems().length;

    oTable.setHeaderText("Product (" + iCount + ")");
    });
},

        onCancel: function(){

            this.getOwnerComponent()
                .getRouter()
                .navTo("RouteMainView");

        },

        onEdit: function(){

            const oContext = this.getView().getBindingContext();

            const orderId = oContext.getPath();

            this.getOwnerComponent()
                .getRouter()
                .navTo("RouteEditPage", {
                    orderId: encodeURIComponent(orderId)
                });


        }
    });
});