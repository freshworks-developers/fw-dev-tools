(function () {
  document.addEventListener("DOMContentLoaded", init);

  function init() {
    app.initialized().then(function (client) {
      loadData(client);
    }).catch(function (err) {
      console.error("Init failed:", err);
    });
  }

  function loadData(client) {
    client.data.get("ticket").then(function (data) {
      var ticket = data.ticket;
      // Call the SMI function
      client.request.invoke("fetchExternalData", { ticket_id: ticket.id })
        .then(function (response) {
          var result = response.response;
          console.info("SMI response:", result);
          // Render result in the sidebar UI
        })
        .catch(function (err) {
          console.error("SMI call failed:", err);
        });
    });
  }
})();
