sap.ui.define([

    
], function () {
  "use strict";

  return {
    // format to "DD MM YYYY"
    formatDate: function (sDate) {
      if (sDate) {
        var oDate = new Date(sDate);
        return oDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      return sDate;
    },

    // return object status state based on status value
    getStatusState: function (status) {
      switch (status) {
        case "Created":
          return "None";
          break;
        case "Released":
          return "Warning";
          break;
        case "Partially Completed":
          return "Information";
          break;
        case "Delivered":
          return "Success";
          break;
      }
      
    }

  };

});