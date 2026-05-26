sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",    
	"sap/ui/model/FilterOperator",
    "sap/m/MessageBox"
], (Controller, Filter, FilterOperator, MessageBox) => {
    "use strict";

    return Controller.extend("sapips.training.g2casestudy.controller.MainView", {
        onInit: function() {
            // cache references to table and filter bar for later use
            this.oTable = this.byId("idTabMainView");
            this.oFilterBar = this.byId("idFBMainView");
        },

        // filterbar search
        onSearch: function() {
            let oFilterGroupItems = this.oFilterBar.getFilterGroupItems();
            let aTableFilters = [];

            // loop through filter group items and create filters based on selected keys or inputs
            oFilterGroupItems.forEach(oFilterGroupItem => {
                let oControl = oFilterGroupItem.getControl();
                let aSelectedKeys = [];

                // controls which use method getValue() to retrieve single value input
                if (oControl instanceof sap.m.Input ||
                    oControl instanceof sap.m.DateRangeSelection) {
                    let sInputValue = oControl.getValue();
                    // check if input is an integer, if so convert to integer before adding to selected keys
                    if (sInputValue) {
                        let sInputValue2 = Number.isInteger(Number(sInputValue)) ? parseInt(sInputValue) : sInputValue;
                        aSelectedKeys.push(sInputValue2); 
                    }
                }
                // controls which use method getSelectedKeys() to retrieve multiple selected keys
                else if (oControl instanceof sap.m.MultiComboBox) {
                    aSelectedKeys = oControl.getSelectedKeys();
                }
                // create filter objects based on control type
                let aFilters = aSelectedKeys.map(sSelectedKey => {
                    // process date range selection
                    if (oControl instanceof sap.m.DateRangeSelection) {
                        let aDateRange = sSelectedKey.split(" - ");
                        if (aDateRange.length === 2 ||
                            // handle cases where user manually enters a single date
                            aDateRange.length === 1) {
                            let dStartDate = new Date(aDateRange[0]);
                            let dEndDate = new Date();
                            if (aDateRange.length === 1) {
                                // if only a single date is entered, set end date to same day to filter for that specific date
                                dEndDate = new Date(aDateRange[0]);
                            }
                            else {
                                dEndDate = new Date(aDateRange[1]);
                            }
                            dEndDate.setHours(23, 59, 59, 999); // set end date to end of the day for inclusive filtering
                            return new Filter({
                                path: oFilterGroupItem.getName(),
                                operator: FilterOperator.BT,
                                value1: dStartDate,
                                value2: dEndDate
                            });
                        }
                    }
                    // process non-range inputs
                    else {
                        // if selected key is integer, use EQ operator, otherwise use Contains for string matching
                        return new Filter({
                            path: oFilterGroupItem.getName(),
                            operator: Number.isInteger(Number(sSelectedKey)) ? FilterOperator.EQ : FilterOperator.Contains,
                            value1: sSelectedKey
                        });
                    }
                });                
                // add filters for current filter group item to overall table filters
                if (aFilters.length > 0) {
                    aTableFilters.push(new Filter({
                        filters: aFilters,
                        and: false
                    }));
                }
            });

            // apply filters to table binding
            this.oTable.getBinding("items").filter(aTableFilters);
        },

        // clear filters from filter bar controls and table binding        
        onClear: function() { 
            let oFilterGroupItems = this.oFilterBar.getFilterGroupItems();
            oFilterGroupItems.forEach(oFilterGroupItem => {
                let oControl = oFilterGroupItem.getControl();
                if (oControl instanceof sap.m.Input || 
                    oControl instanceof sap.m.DateRangeSelection) {
                    oControl.setValue("");
                } else if (oControl instanceof sap.m.MultiComboBox) {
                    oControl.setSelectedKeys([]);
                }
            });
            this.oTable.getBinding("items").filter([]);
        },
        // delete selected items from table with confirmation dialog and validation for non-selection
        onDelete: function(oEvent) { 
            let aSelectedItems = this.oTable.getSelectedItems();
            let oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
            let sMessage = "";

            if (aSelectedItems.length > 0) { 
                sMessage = oResourceBundle.getText("DeleteConfirmation", [aSelectedItems.length]);
                MessageBox.confirm(sMessage, { actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                                               onClose: function(sAction) {
                                                if (sAction === MessageBox.Action.YES) { 
                                                    aSelectedItems.forEach(oItem => { 
                                                        let oContext = oItem.getBindingContext();
                                                        oContext.getModel().remove(oContext.getPath());
                                                    })
                                                }
                                                // if no is selected, do nothing and simply close the dialog
                                               }
                } )
            }
            else {                
                sMessage = oResourceBundle.getText("NoItemsSelected");
                MessageBox.error(sMessage);
            }
        },

        onNavToCreate: function () {
            this.getOwnerComponent().getRouter().navTo("RouteCreate");
        }
    });
});