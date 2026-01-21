const axios = require("axios");

function generateUUIDv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (char) {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

class metaai {
  constructor() {
    this.conversationId = generateUUIDv4();
    this.token = null;
    this.lsdToken = null;
    this.cookies = null;
    this.baseHeaders = {
      accept: "*/*",
      "accept-encoding": "gzip, deflate",
      "accept-language": "en-US",
      referer: "",
      "sec-ch-ua":
        '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    };
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async fetchCookies() {
    const response = await axios.get("https://www.meta.ai/", {
      headers: this.baseHeaders,
    });
    const html = response.data;

    this.cookies = {
      jsDatr: this.extract(html, "_js_datr"),
      csrfToken: this.extract(html, "abra_csrf"),
      datr: this.extract(html, "datr"),
    };
    this.lsdToken = this.extract(html, null, '"LSD",[],{"token":"', '"}');
  }

  async fetchToken(birthDate = "1990-01-01") {
    const payload = {
      lsd: this.lsdToken,
      fb_api_caller_class: "RelayModern",
      fb_api_req_friendly_name: "useAbraAcceptTOSForTempUserMutation",
      variables: JSON.stringify({
        dob: birthDate,
        icebreaker_type: "TEXT_V2",
        __relay_internal__pv__WebPixelRatiorelayprovider: 1,
      }),
      doc_id: "8631373360323878",
    };

    const headers = {
      ...this.baseHeaders,
      "x-fb-friendly-name": "useAbraAcceptTOSForTempUserMutation",
      "x-fb-lsd": this.lsdToken || "",
      "x-asbd-id": "129477",
      "alt-used": "www.meta.ai",
      "sec-fetch-site": "same-origin",
      cookie: this.formatCookies(),
    };

    const response = await axios.post(
      "https://www.meta.ai/api/graphql",
      new URLSearchParams(payload).toString(),
      { headers }
    );

    const text = response.data;
    let jsonString;
    if (typeof text === "string") {
      [jsonString] = text.split(/(?=\{"label":)/);
    } else {
      jsonString = JSON.stringify(text);
    }

    const json = typeof text === "object" ? text : JSON.parse(jsonString);

    this.token =
      json?.data?.xab_abra_accept_terms_of_service?.new_temp_user_auth
        ?.access_token;
  }

  async scrape(message) {
    if (!this.cookies) {
      await this.fetchCookies();
    }
    if (!this.token) {
      await this.fetchToken();
    }

    await this.delay(500);

    const headers = {
      ...this.baseHeaders,
      "content-type": "application/x-www-form-urlencoded",
      cookie: this.formatCookies(),
      origin: "https://www.meta.ai",
      referer: "https://www.meta.ai/",
      "x-asbd-id": "129477",
      "x-fb-friendly-name": "useAbraSendMessageMutation",
    };

    const body = new URLSearchParams({
      access_token: this.token || "",
      fb_api_caller_class: "RelayModern",
      fb_api_req_friendly_name: "useAbraSendMessageMutation",
      variables: JSON.stringify({
        message: { sensitive_string_value: message },
        externalConversationId: this.conversationId,
        offlineThreadingId: this.generateID(),
        suggestedPromptIndex: null,
        flashPreviewInput: null,
        promptPrefix: null,
        entrypoint: "ABRA__CHAT__TEXT",
        icebreaker_type: "TEXT_V2",
        __relay_internal__pv__AbraDebugDevOnlyrelayprovider: false,
        __relay_internal__pv__WebPixelRatiorelayprovider: 1,
      }),
      server_timestamps: "true",
      doc_id: "8544224345667255",
    });

    const response = await axios.post(
      "https://graph.meta.ai/graphql?locale=user",
      body.toString(),
      { headers }
    );
    return await this.waitStream(response.data);
  }

  async waitStream(responseText) {
    if (typeof responseText !== "string") {
      responseText = JSON.stringify(responseText);
    }

    const lines = responseText.split("\n");
    let finalMessage = "";
    let lastLength = 0;

    for (const line of lines) {
      try {
        const json = JSON.parse(line);
        const botMessage = json?.data?.node?.bot_response_message || {};

        if (this.isValidResponse(botMessage)) {
          const snippet = botMessage.snippet;
          const currentLength = snippet.length;
          if (currentLength > lastLength) {
            finalMessage += snippet.substring(lastLength);
            lastLength = currentLength;
          }
        }
      } catch {
        // ignore bad json
      }
    }
    return finalMessage;
  }

  isValidResponse(botMessage) {
    return (
      botMessage.streaming_state === "OVERALL_DONE" ||
      botMessage.streaming_state === "STREAMING"
    );
  }

  extract(text, key, startStr = null, endStr = '",') {
    startStr = startStr || (key ? `${key}":{"value":"` : "");
    let start = text.indexOf(startStr);
    if (start >= 0) {
      start += startStr.length;
      const end = text.indexOf(endStr, start);
      if (end >= 0) return text.substring(start, end);
    }
    return null;
  }

  formatCookies() {
    if (!this.cookies) return "";
    return Object.entries(this.cookies)
      .filter(([, v]) => v !== null)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  generateID() {
    const now = Date.now();
    const rand = Math.floor(Math.random() * 4294967295);
    const binary = ("0000000000000000000000" + rand.toString(2)).slice(-22);
    const full = now.toString(2) + binary;
    return this.binaryToDecimal(full);
  }

  binaryToDecimal(binary) {
    let result = "";
    let currentBinary = binary;
    while (currentBinary !== "0" && currentBinary !== "") {
      let carry = 0;
      let next = "";
      for (let i = 0; i < currentBinary.length; i++) {
        carry = 2 * carry + parseInt(currentBinary[i], 10);
        if (carry >= 10) {
          next += "1";
          carry -= 10;
        } else {
          next += "0";
        }
      }
      result = carry.toString() + result;
      currentBinary = next.replace(/^0+/, "");
    }
    return result || "0";
  }
}

// ===== Hydro-style wrapper =====

const client = new metaai();

module.exports = {
  name: "MetaAIChat",
  desc: "Proxy simple chat to Meta AI (unofficial, temp user)",
  category: "AI",
  params: ["text"],

  async run(req, res) {
    try {
      const { text } = req.query;
      if (!text) {
        return res.status(400).json({
          status: false,
          error: 'Parameter "text" wajib diisi',
        });
      }

      const reply = await client.scrape(text);

      return res.status(200).json({
        status: true,
        conversationId: client.conversationId,
        prompt: text,
        reply,
      });
    } catch (err) {
      return res.status(500).json({
        status: false,
        error: err.message || String(err),
      });
    }
  },
};
