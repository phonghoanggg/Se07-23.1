require("dotenv").config();
import { text } from "body-parser";
import { response } from "express";
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
    if (received_message.quick_reply) {
        let listCategory = []
        switch (received_message.quick_reply.payload) {
            case "NAM":
                listCategory = getCategory("nam")
                chatbotService.sendSlideMes(sender_psid,listCategory,false)
                break;
            case "NU":
                console.log(received_message.quick_reply);
                listCategory = getCategory("nữ")
                chatbotService.sendSlideMes(sender_psid,listCategory,false)
                break;
            default:
                break;
        }
    } else {
        if (received_message.text) {
            let mes = received_message.text
            let data = await handleData(mes, sender_psid)
            return
            response = {
                'text': `${data}`
            }
        } else if (received_message.attachments) {
            response = {
                text:"Hãy gửi tin nhắn văn bản cho tôi."
            }
    
        }
    }
    // Sends the response message
    callSendSenderAction(sender_psid, "mark_seen"); // đánh dấu là xem tin nhắn
    // await chatBotService.sendSlideMes(sender_psid);
    await callSendAPI(sender_psid, response);
}
function getCategory(key) {
    let listCategory = []
    data.forEach(d => {
        if (d.name.toLowerCase() == key.toLowerCase()) {
            listCategory = d
        }
    })
    return listCategory
}
async function handleData(mes,psid) {
    try {
        const response = await client.message(mes)
        if (response) {
           return  handleResponse(response,psid)
        }
    } catch (error) {
        console.log(error);
    }
}
async function handleResponse(response,psid) {
    console.log(response);
    let intents = response.intents
    if (intents.length > 0) {
        let confidence = intents[0].confidence
        let name = intents[0].name
        let entities = response.entities
        if (confidence >= 0.8) {
            switch (name) {
                case 'chao_hoi':
                    let username = await chatbotService.getNameUser(psid)
                    return `Chào ${username}, tôi có thể giúp gì cho bạn`
                case 'hoi':
                    
                    return handleAsk(entities,psid)
                case 'ban_nhieu':
                    return 'hoi san pham ban nhieu'
                        
                default:
                    return 'Bạn có thể nói rõ hơn về sản phẩm mà bạn quan tâm không'        
                    break;
            }
        } else {
            return suggestMes(psid)
        }
        
    } else {
        return suggestMes(psid)
    }
}
async function suggestMes(psid) {
    let mes = 'Bạn có thể nói rõ hơn về sản phẩm mà bạn quan tâm không'
    let mesList = []
    mesList.push(mes)
    data.forEach(d => {
        let m = `Với ${d.name} chúng tôi có: `
        let cateName = ''
        d.categories.forEach(cate => {
            cateName +=  `${cate.name}, `
        })
        m = m + cateName
        mesList.push(m)
    })
    for (let index = 0; index < mesList.length; index++) {
        await callSendAPI(psid, { text: mesList[index]})
    }
}
function handleAsk(entities,psid) {
    console.log(Object.values(entities));
    let dataResponse = {}
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
                dataResponse = d
            }
        })
    } else {
        let response = {
                    text: `Bạn cần mua đồ cho nam hay nữ`,
                    quick_replies: [
                        {
                            content_type: "text",
                            title: "Nam",
                            payload: "NAM"
                        },
                        {
                            content_type: "text",
                            title: "Nữ",
                            payload: "NU"
                        },
                    ],
                };
        return callSendAPI(psid,response)
    }
    if (dataQuery['ten_danh_muc']) {
        let dataCate = []
        let queryCateName = dataQuery['ten_danh_muc']
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/Đ/g, "D")
            .toLowerCase()
        if (queryCateName == 'Quần áo'.toLowerCase()) {
            
            console.log(dataCate);
            return chatbotService.sendSlideMes(psid, dataResponse, false)
        }
        dataResponse.categories.forEach(cate => {
            if (cate.name.toLowerCase().includes(queryCateName)) {

                dataCate = dataCate.concat(cate.categories)
            }
        })
        dataResponse = {
            name: dataQuery['ten_danh_muc'],
            categories: dataCate
        }
    }
    if (dataQuery['color']) {
        let dataColor = []
        dataResponse.forEach(d => {
            if (d.color.includes(dataQuery['color'].toLowerCase())) {
                dataColor.push(d)
            }
        })
        dataResponse = dataColor
        

    }
    console.log(dataResponse);
    console.log(dataQuery);
    if (dataResponse.categories.length > 0) {
        chatbotService.sendSlideMes(psid, dataResponse)
        // callSendAPI(psid,{text:dataResponse.length})
    } else {
        let mes = `Thật buồn khi tôi không thể tìm thấy "${dataResponse.name}" cho bạn`
        callSendAPI(psid,{text:mes})
    }
    // return dataResponse[0].name
}

// Handles messaging_postbacks events
async function handlePostback(sender_psid, received_postback) {
    let response;

    // Get the payload for the postback
    let payload = received_postback.payload;
    let title = received_postback.title
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
        case 'DANH_MUC_NAM':
            getProduct(true,title,sender_psid);
            break;
        case 'DANH_MUC_NU':
            getProduct(false,title,sender_psid);
            break;
        default:
            response = { "text": `oop! I don't know ${payload}` }
    }
    // Send the message to acknowledge the postback
    callSendAPI(sender_psid, response);
}
function getProduct(gt, title,psid) {
    let dataResponse = []
    let sex
    if (gt) {
        sex = 'nam'
    } else {
        sex = 'nữ'
    }
    data.forEach(cate => {
        if(cate.name.toLowerCase() == sex)
            cate.categories.forEach(cate => {
                if (cate.name == title){
                    dataResponse = cate
                }
            })
    })
    chatbotService.sendSlideMes(psid,dataResponse)
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
