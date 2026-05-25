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
            // Logic to save changes goes here
            MessageToast.show("The Order <Order Number> has been updated successfully.");
          }
        }
      });
    }
  });
});