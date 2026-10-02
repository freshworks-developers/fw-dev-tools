exports = {
  onTicketCreateHandler: async function(args) {
    var ticket = args.data.ticket;
    console.info("Ticket created: #" + ticket.id + " — " + ticket.subject);
    renderData();
  },

  fetchExternalData: async function(args) {
    try {
      var ticketId = args.ticket_id;
      // Example: fetch ticket details or external data here
      // var response = await $request.invokeTemplate("externalApiCall", {
      //   context: { ticket_id: ticketId }
      // });
      return renderData(null, { ticket_id: ticketId, status: "ok" });
    } catch (err) {
      return renderData({ status: 500, message: err.message }, null);
    }
  },

  onAppInstallHandler: function() {
    console.info("App installed.");
    renderData();
  },

  onAppUninstallHandler: function() {
    console.info("App uninstalled.");
    renderData();
  }
};
