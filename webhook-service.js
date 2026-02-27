const webhookService = {
  checkWebhookMessage: async (req, res) => {
    try {
      console.log("Received webhook message:", JSON.stringify(req.body));
      return true
    } catch (error) {
      console.error("Error processing webhook message:", error);
      return false
    }
  }
}

module.exports = webhookService;