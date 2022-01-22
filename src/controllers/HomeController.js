require("dotenv").config();
import { text } from "body-parser";
import request from "request";
import chatbotService from "../service/chatbotService";


const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const TOKEN_WIT = process.env.TOKEN_WIT
const { Wit, log } = require('node-wit');

const data = require("../data/product.json")

const client = new Wit({
  accessToken: TOKEN_WIT,
  logger: new log.Logger(log.DEBUG) // optional
});




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
        let mes = received_message.text
        let data = await handleData(mes)
        response = {
            'text': `${data}`
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
    } 
    // else {
    //     // tin nhắn dạng text bình thường
    //     response = {
    //         text: `You sent the message: "${received_message.text}". Now send me an image!`,
    //         quick_replies: [
    //             {
    //                 content_type: "text",
    //                 title: "Red",
    //                 payload: "COLOR_RED",
    //                 image_url:
    //                     "https://icons.iconarchive.com/icons/binassmax/pry-frente-black-special-2/256/pictures-4-icon.png",
    //             },
    //             {
    //                 content_type: "text",
    //                 title: "Green",
    //                 payload: "COLOR_GREEN",
    //                 image_url: "http://example.com/img/green.png",
    //             },
    //         ],
    //     };
    // }

    // Sends the response message
    callSendSenderAction(sender_psid, "mark_seen"); // đánh dấu là xem tin nhắn
    // await chatBotService.sendSlideMes(sender_psid);
    await callSendAPI(sender_psid, response);
}
async function handleData(mes) {
    try {
        const response = await client.message(mes)
        if (response) {
           return  handleResponse(response)
        }
    } catch (error) {
        console.log(error);
    }
}
function handleResponse(response) {
    console.log(response);
    let intents = response.intents
    if (intents.length > 0) {
        let confidence = intents[0].confidence
        let name = intents[0].name
        let entities = response.entities
        if (confidence >= 0.8) {
            switch (name) {
                case 'chao_hoi':
                    return 'Chào bạn nhé, tôi có thể giúp gì cho bạn'
                    break;
                case 'hoi':
                    return handleAsk(entities)
                case 'ban_nhieu':
                    return 'hoi san pham ban nhieu'
                        
                default:
                    break;
            }
        } else {
            return 'Bạn có thể nói rõ hơn về sản phẩm mà bạn quan tâm không'    
        }
        
    } else {
        return 'Bạn có thể nói rõ hơn về sản phẩm mà bạn quan tâm không'
    }
}
function handleAsk(entities) {
    console.log(Object.values(entities));
    let dataResponse = []
    let dataQuery = {}
    let entitiesArr = Object.values(entities)
    entitiesArr.forEach(v => {
        if (v[0].confidence >= 0.8) {
            dataQuery[v[0].name] = v[0].value
        }
    })
    if (dataQuery['gioi_tinh']) {
        data.forEach(d => {
            if (d.name.toLowerCase() == dataQuery['gioi_tinh'].toLowerCase()) {
                dataResponse = d.categories
            }
        })
    } else {
        data.forEach(d => {
            dataResponse = dataResponse.concat(d.categories)
        })
    }
    if (dataQuery['ten_danh_muc']) {
        let dataCate = []
        dataResponse.forEach(cate => {
            if (cate.name.toLowerCase() == dataQuery['ten_danh_muc'].toLowerCase()) {
                dataCate = dataCate.concat(cate.categories)
            }
        })
        dataResponse = dataCate
    }
    if (dataQuery['color']) {
        let dataColor = []
        dataResponse.forEach(d => {
            if (d.color.includes(dataQuery['color'].toLowerCase())) {
                dataColor.push(d)
            }
        })
        dataResponse = dataColor
        console.log(dataResponse);

    }
    console.log(dataQuery);
    return 
}

// Handles messaging_postbacks events
async function handlePostback(sender_psid, received_postback) {
    let response;

    // Get the payload for the postback
    let payload = received_postback.payload;

    // Set the response based on the postback payload
    switch (payload) {
        case 'Yes':
            response = { "text": "Wow that beauty!" }
            break;
        case 'No':
            response = { "text": "resend your picture" }
            break;
        case 'GET_STARTED':
            await chatbotService.handleGetStarted(sender_psid)
            break;
        default:
            response = { "text": `oop! I don't know ${payload}` }
    }
    // Send the message to acknowledge the postback
    // callSendAPI(sender_psid, response);
}


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
                qs: { access_token: PAGE_ACCESS_TOKEN },
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
        "get_started": { "payload": "GET_STARTED" },
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
    setupProfile: setupProfile,
};
