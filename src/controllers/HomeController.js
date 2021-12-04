require("dotenv").config();
import request from "request";
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

let getHomePage = (req, res) => {
    return res.render("homepage.ejs");
};
let getWebHook = (req, res) => {
    // Your verify token. Should be a random string.
    let VERIFY_TOKEN = process.env.VERIFY_TOKEN;

    // Parse the query params
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];

    // Checks if a token and mode is in the query string of the request
    if (mode && token) {
        // Checks the mode and token sent is correct
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            // Responds with the challenge token from the request
            console.log("WEBHOOK_VERIFIED");
            res.status(200).send(challenge);
        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
};
let postWebHook = (req, res) => {
    let body = req.body;

    // Checks this is an event from a page subscription
    if (body.object === "page") {
        // Iterates over each entry - there may be multiple if batched
        body.entry.forEach(function (entry) {
            // Gets the body of the webhook event
            let webhook_event = entry.messaging[0];
            console.log(webhook_event);

            // Get the sender PSID
            let sender_psid = webhook_event.sender.id;
            console.log("Sender PSID: " + sender_psid);

            // Check if the event is a message or postback and
            // pass the event to the appropriate handler function
            if (webhook_event.message) {
                handleMessage(sender_psid, webhook_event.message);
            } else if (webhook_event.postback) {
                handlePostback(sender_psid, webhook_event.postback);
            }
        });

        // Returns a '200 OK' response to all requests
        res.status(200).send("EVENT_RECEIVED");
    } else {
        // Returns a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }
};

// Handles messages events
async function handleMessage(sender_psid, received_message) {
    let response;

    // Check if the message contains text
    if (received_message.text) {
        // nếu có câu trả lời nhanh
        response = {
            "text": `You sent the message: "${received_message.text}". Now send me an image!`
        }
    } else if (received_message.attachments) {
        // Get the URL of the message attachment
        let attachment_url = received_message.attachments[0].payload.url;
        response = {
          "attachment": {
            "type": "template",
            "payload": {
              "template_type": "generic",
              "elements": [{
                "title": "Có phải mày vừa gửi bức ảnh này không baee?",
                "subtitle": "Nhấn để chọn đi nào baee.",
                "image_url": attachment_url,
                "buttons": [
                  {
                    "type": "postback",
                    "title": "Có ạ",
                    "payload": "yes",
                  },
                  {
                    "type": "postback",
                    "title": "Không ạ",
                    "payload": "no",
                  }
                ],
              }]
            }
          }
        }
        
        if (received_message.quick_reply) {
            if (received_message.quick_reply.payload == "COLOR_RED") {
                response = {
                    text: "ban chon mau do",
                };
            } else {
                response = {
                    text: "ban chon mau xanh",
                };
            }
        } else {
            // tin nhắn dạng text bình thường
            response = {
                text: `You sent the message: "${received_message.text}". Now send me an image!`,
                quick_replies: [
                    {
                        content_type: "text",
                        title: "Red",
                        payload: "COLOR_RED",
                        image_url:
                            "https://icons.iconarchive.com/icons/binassmax/pry-frente-black-special-2/256/pictures-4-icon.png",
                    },
                    {
                        content_type: "text",
                        title: "Green",
                        payload: "COLOR_GREEN",
                        image_url: "http://example.com/img/green.png",
                    },
                ],
            };
        }
    }

    // Sends the response message
    callSendSenderAction(sender_psid, "mark_seen"); // đánh dấu là xem tin nhắn
    //khong ho tro nua    // await callSendSenderAction(sender_psid, "typing_on"); // đang nhập tin nhắn
    // await chatBotService.sendSlideMes(sender_psid);
    await callSendAPI(sender_psid, response);
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
    let response;
  
    // Get the payload for the postback
    let payload = received_postback.payload;
  
    // Set the response based on the postback payload
    if (payload === 'yes') {
      response = { "text": "Wow that beauty!" }
    } else if (payload === 'no') {
      response = { "text": "resend your picture" }
    } else if(payload === "GET_STARTED") {
      response = {"text": "Hello guys.Welcome to the restaurant FFF" }
    }
    // Send the message to acknowledge the postback
    callSendAPI(sender_psid, response);
}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
    // Construct the message body
    let request_body = {
        "recipient": {
            "id": sender_psid
        },
        "message": response
    }

    // Send the HTTP request to the Messenger Platform
    let res = new Promise((t, f) => {
        request(
            {
                uri: "https://graph.facebook.com/v2.6/me/messages",
                qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
                method: "POST",
                json: request_body,
            },
            (err, res, body) => {
                if (!err) {
                    console.log("message sent!");
                    t();
                } else {
                    console.error("Unable to send message:" + err);
                }
            }
        );
    });
    return res;
}
function callSendSenderAction(sender_psid, action) {
    // Construct the message body
    let request_body = {
        recipient: {
            id: sender_psid,
        },
        sender_action: action,
    };

    // Send the HTTP request to the Messenger Platform
    let res = new Promise((t, f) => {
        request(
            {
                uri: "https://graph.facebook.com/v2.6/me/messages",
                qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
                method: "POST",
                json: request_body,
            },
            (err, res, body) => {
                if (!err) {
                    console.log("message sent!");
                    t();
                } else {
                    console.error("Unable to send message:" + err);
                }
            }
        );
    });
    return res;
}
let setupProfile = async (req, res) => {
    // call profile fb api
    // Construct the message body
    let request_body = {
      "get_started": {  "payload": "GET_STARTED" },
      "whitelisted_domains": ["http://localhost:8080/"]
  }
  
  // Send the HTTP request to the Messenger Platform
  await request({
      "uri": `https://graph.facebook.com/v12.0/me/messenger_profile?access_token=${PAGE_ACCESS_TOKEN}`,
      "qs": { "access_token": PAGE_ACCESS_TOKEN },
      "method": "POST",
      "json": request_body
  }, (err, res, body) => {
    console.log(body)
      if (!err) {
          console.log('setup user profile succes')
      } else {
          console.error("Unable to setup user profile:" + err);
      }
  });
  
  return res.send("setup user profile succes");
  
}
module.exports = {
    getHomePage,
    postWebHook,
    getWebHook,
    setupProfile:setupProfile,
};
