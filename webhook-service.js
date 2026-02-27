const webhookService = {
  checkWebhookMessage: async (req, res) => {
    const groupChatId = -1002721467839
    try {
      console.log("Received webhook message:", JSON.stringify(req.body));
      const { message } = req.body;
      if(!message) {
        console.error("Invalid webhook message: 'message' field is missing");
        return false
      }
      if(message.chat.id !== groupChatId){
        console.error(`Invalid webhook message: chat id ${message.chat.id} does not match expected group chat id ${groupChatId}`);
        return false
      }

      if(typeof message.sticker !== 'undefined') {
        console.log("Received a sticker message, skipping URL validation.");
        return true
      }

      if(typeof message.new_chat_members !== 'undefined'){
        console.log("Received a new chat member message, sending welcome message.");
        for (const member of message.new_chat_members) {
          await webhookService.welcomeNewUser({
            first_name: member.first_name,
          });
        }
        return true
      }

      const validateResult = webhookService.validateMessageUrl(message);
      if(!validateResult.valid){
        // update message text to other content
        const messageFrom = message.from ? `${message.from.first_name || ""} ${message.from.last_name || ""}`.trim() : "Unknown";
        const newText = `Tin nhắn từ ${messageFrom} đã bị xoá do chứa URL không hợp lệ.`;
        console.log("newText", newText);
        console.log("env", process.env.TELEGRAM_BOT_TOKEN);
        // xoá message cũ
        await fetch(`https://api.telegram.org/bot8732120050:AAFM6VxDnc82Y8iSZ4l2p35g7y_5AJ7Viqg/deleteMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: message.chat.id,
            message_id: message.message_id
          })
        });
        // gửi message mới với text đã chỉnh sửa
        await fetch(`https://api.telegram.org/bot8732120050:AAFM6VxDnc82Y8iSZ4l2p35g7y_5AJ7Viqg/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: message.chat.id,
            text: newText,
          })
        });

        console.warn(`Message ${message.message_id} contains invalid URL from domain ${validateResult.domain}. Message text has been updated.`);
      }


      return true
    } catch (error) {
      console.error("Error processing webhook message:", error);
      return false
    }
  },

  welcomeNewUser: async (message) => {
    const messageFrom = message.first_name || 'Unknown';
    const welcomeText = `🎉✨ Chào mừng [${messageFrom}] đến với group của chúng ta! ✨🎉
Rất vui khi có bạn đồng hành và cùng trao đổi trong cộng đồng này 🤝💬
Nếu có điều gì chưa rõ, cứ thoải mái nhắn lên group hoặc liên hệ admin 🛎️ để được hỗ trợ nhanh nhất nhé! 🚀😊`

    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: message.chat.id,
        text: welcomeText,
      })
    });
  },

  validateMessageUrl(message) {
    const whitelistDomains = ['bingx.com','one.exnessonelink.com'];
    const text = message?.text || message?.caption || "";
    const entities = message?.entities || message?.caption_entities || [];

    const urls = new Set();

    // 1️⃣ Lấy từ entities trước (chuẩn nhất)
    for (const entity of entities) {
      if (entity.type === "url") {
        const url = text.substring(entity.offset, entity.offset + entity.length);
        urls.add(url);
      }

      if (entity.type === "text_link" && entity.url) {
        urls.add(entity.url);
      }
    }

    // 2️⃣ Fallback regex nếu Telegram không detect
    const urlRegex =
      /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/gi;

    const matches = text.match(urlRegex);
    if (matches) {
      matches.forEach((u) => urls.add(u));
    }

    if (urls.size === 0) {
      return { valid: true, reason: "no_url" };
    }

    // 3️⃣ Kiểm tra whitelist
    for (const rawUrl of urls) {
      try {
        let formatted = rawUrl;

        // thêm protocol nếu thiếu
        if (!formatted.startsWith("http")) {
          formatted = "http://" + formatted;
        }

        const parsed = new URL(formatted);
        const domain = parsed.hostname.replace(/^www\./, "");

        const allowed = whitelistDomains.some((allowedDomain) =>
          domain === allowedDomain || domain.endsWith("." + allowedDomain)
        );

        if (!allowed) {
          return {
            valid: false,
            domain,
            url: rawUrl,
          };
        }
      } catch (err) {
        // URL parse fail => coi như không hợp lệ
        return {
          valid: false,
          reason: "invalid_format",
          url: rawUrl,
        };
      }
    }

    return { valid: true };
  }
}

module.exports = webhookService;