sap.ui.define([

    
], function () {
  "use strict";

  return {

    formatDate: function (sDate) {
      if (sDate) {
        var oDate = new Date(sDate);
        // format to "DD MM YYYY"
        return oDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      return sDate;
    }

  };

});