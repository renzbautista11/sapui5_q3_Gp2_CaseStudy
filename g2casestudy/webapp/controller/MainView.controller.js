sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",    
	"sap/ui/model/FilterOperator"
], (Controller, Filter, FilterOperator) => {
    "use strict";

    return Controller.extend("sapips.training.g2casestudy.controller.MainView", {
        onInit: function() {
            this.oTable = this.byId("idTabMainView");
            this.oFilterBar = this.byId("idFBMainView");
        },
        onSearch: function() {
            let oFilterGroupItems = this.oFilterBar.getFilterGroupItems();
            let aTableFilters = [];

            // Loop through filter group items and create filters based on selected keys or inputs
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

                let aFilters = aSelectedKeys.map(sSelectedKey => {
                    // process date range selection
                    if (oControl instanceof sap.m.DateRangeSelection) {
                        let aDateRange = sSelectedKey.split(" - ");
                        if (aDateRange.length === 2) {
                            let dStartDate = new Date(aDateRange[0]);
                            let dEndDate = new Date(aDateRange[1]);
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
        }
    });
});