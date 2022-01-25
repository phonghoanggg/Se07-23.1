require("dotenv").config();
import request, { get } from "request";
import chatbotService from "../service/chatbotService";
import moment from "moment"
const { GoogleSpreadsheet } = require('google-spreadsheet');

const PRIVATE_KEY = process.env.PRIVATE_KEY.replace(/\\n/g, "\n")
const CLIENT_EMAIL = process.env.CLIENT_EMAIL
const SHEET_ID = process.env.SHEET_ID

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
                     await callSendAPI(psid,{text:`Chào ${username}, tôi có thể giúp tìm bạn tìm gì 8-)`})
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
async function handleAsk(entities,psid) {
    console.log(Object.values(entities));
    let dataSuggest = {}
    let isSuggestPro = true
    let info = ''
    let dataResponse = {}
    let dataQuery = {}
    let entitiesArr = Object.values(entities)
    entitiesArr.forEach(v => {
        if (v[0].confidence >= 0.8) {
            v[0].entities.forEach(en=>{
                if (en.confidence >= 0.8) {
                    dataQuery[en.name] = en.value
                }
            })
            dataQuery[v[0].name] = v[0].value
        }
    })
    if (dataQuery['gioi_tinh']) {
        data.forEach(d => {
            if (d.name.toLowerCase() == dataQuery['gioi_tinh'].toLowerCase()) {
                dataResponse = d
                dataSuggest = dataResponse
            }
        })
        if (Object.keys(dataQuery).length == 1) {
            chatbotService.sendSlideMes(psid, dataResponse, false)
            return
        }
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
        dataSuggest = {name:dataSuggest.name,categories:[...dataResponse.categories]}
        let dataCate = []
        let queryCateName = convertVN(dataQuery['ten_danh_muc'])
        if (queryCateName.includes(convertVN("quần áo"))) {
            
            console.log(dataCate);
            await callSendAPI(psid,{text:`Sản phẩm cho ${dataQuery['gioi_tinh']} có các loại danh mục sau`})
            return chatbotService.sendSlideMes(psid, dataResponse, false)
        }
        dataResponse.categories.forEach(cate => {
            if (convertVN(cate.name).includes(queryCateName)) {
                dataCate = dataCate.concat(cate.categories)
            }
        })
        if (dataCate.length == 0) {
            console.log("data cate length "+dataCate.length);
            isSuggestPro = false
            dataSuggest = { name: dataSuggest.name, categories: [...dataResponse.categories] }
        } else {
            dataSuggest = { name: dataSuggest.name, categories: [...dataCate] }
        }
        dataResponse = {
            name: dataQuery['ten_danh_muc'],
            categories: [...dataCate]
        }
        info = info + `${dataResponse.name}`
    }
    if (dataQuery['color']) {
        let dataColor = []
        dataResponse.categories.forEach(d => {
            console.log(convertVN(d.color.toString())+"  "+(convertVN(dataQuery['color'])));
            if (convertVN(d.color.toString()).includes(convertVN(dataQuery['color']))) {
                dataColor.push(d)
            }
        })
        if (dataColor.length == 0) {
            dataSuggest = {
                name: dataSuggest.name,
                categories: [...dataSuggest.categories]
            }
        } else {
            dataSuggest = { name: dataSuggest.name, categories: [...dataColor] }
        }
        dataResponse = {
            name: dataResponse.name,
            categories: dataColor
        }
        info = `${info} màu ${dataQuery['color']}`
    }
    if (dataQuery['gia_tien']) {
        let dataAmount = []
        let i
        if (dataQuery['loai_gia']) {
            if (convertVN(dataQuery['loai_gia']) == 'tren') {
                i = true
            } else {
                i = false                
            }
        } else {
            i = false
        }
        let gt = dataQuery['gia_tien']
        let t = dataQuery['gia_tien'].replace(/\D/g, '');
        if (convertVN(gt[gt.length - 1]) == 'k' || gt.length <= 3) {
            t = t * 1000
            dataResponse.categories.forEach(e => {
                if (i) {
                    if (e.amount >= t) {
                        dataAmount.push(e)
                    }
                } else
                    if (e.amount <= t) {
                        dataAmount.push(e)
                    }
            })
        } else {
            dataResponse.categories.forEach(e => {
                if (i) {
                    if (e.amount >= t) {
                        dataAmount.push(e)
                    }
                } else
                    if (e.amount <= t) {
                        dataAmount.push(e)
                    }
            })
        }
        dataResponse = {
            name: dataResponse.name,
            categories: dataAmount
        }
        info = `${info} ${dataQuery['loai_gia']} ${gt}`
        console.log(dataQuery['gia_tien']);
    }
    console.log(dataResponse);
    console.log(dataQuery);
    await callSendAPI(psid,{text:`bạn muốn tìm ${info} :D`})
    if (dataResponse.categories.length > 0) {
        await callSendAPI(psid, { text: `Tôi đã tìm được ${dataResponse.categories.length} sản phẩm cho bạn 8|` })
        chatbotService.sendSlideMes(psid, dataResponse)
        // callSendAPI(psid,{text:dataResponse.length})
    } else {
        let mes = `cửa hàng đã hết hoặc không có "${info}" :(`
        await callSendAPI(psid, { text: mes })
        await callSendAPI(psid, { text: `Bạn có thể tham khảo sảm phẩm khác của ${dataSuggest.name} như` })
        await chatbotService.sendSlideMes(psid,dataSuggest,isSuggestPro)
    }
    // return dataResponse[0].name
}
function convertVN(string) {
    return string
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
}

// Handles messaging_postbacks events
async function handlePostback(sender_psid, received_postback) {
    let response;

    // Get the payload for the postback
    let payload = received_postback.payload;
    let title = received_postback.title
    // Set the response based on the postback payload
    switch (payload) {
        case 'RESTART_BOT':
            await chatbotService.handleGetStarted(sender_psid)
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
        if(convertVN(cate.name) == convertVN(cate.name))
            cate.categories.forEach(cate => {
                if (convertVN(cate.name) == convertVN(title)){
                    dataResponse = cate
                }
            })
    })
    console.log(dataResponse);
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
        "whitelisted_domains": [`${process.env.DOMAIN}`,],
        "persistent_menu": [
            {
                "locale": "default",
                "composer_input_disabled": false,
                "call_to_actions": [
                    {
                        "type": "postback",
                        "title": "Khởi động lại bot",
                        "payload": "RESTART_BOT"
                    },
                    {
                        "type": "web_url",
                        "title": "Xem cửa hàng",
                        "url": "https://vi.house3d.com/",
                        "webview_height_ratio": "full"
                    }
                ]
            }
        ]
    
    }

    // Send the HTTP request to the Messenger Platform
    await request({
        "uri": `https://graph.facebook.com/v12.0/me/messenger_profile?access_token=${PAGE_ACCESS_TOKEN}`,
        "qs": { "access_token": PAGE_ACCESS_TOKEN },
        "method": "POST",
        "json": request_body
    }, (err, res, body) => {
        if (!err) {
            console.log('setup user profile succes')
        } else {
            console.error("Unable to setup user profile:" + err);
        }
    });

    return res.send("setup user profile succes");

}
let contact = (req, res) => {
    return res.render('contact.ejs')
}
let contactPost = async (req, res) => {
    let psid = req.params.psid
    let idPro = req.params.id
    let listData = [...data[0].categories, ...data[1].categories]
    let product = {}
    console.log("id "+idPro);
    listData.forEach(data => {
        data.categories.forEach(pro => {
            console.log(pro);
            if (pro.id == idPro) {
               product = pro 
            }
        })
    })
    let body = req.body
    body.psid = psid
    body['pro'] = product 
    body['nameFace'] = await chatbotService.getNameUser(psid)
    console.log(body)
    getGoogleSheet(body)
}

let getGoogleSheet = async (data) => {
    try {

        let currentDate = new Date()

        const format = "HH:mm DD/MM/YYYY"

        let formatedDate = moment(currentDate).format(format)

        const doc = new GoogleSpreadsheet(SHEET_ID);

        await doc.useServiceAccountAuth({
            client_email: CLIENT_EMAIL,
            private_key: PRIVATE_KEY,
        });

        await doc.loadInfo()

        const sheet = doc.sheetsByIndex[0]

        // append rows
        await sheet.addRow(
            {
                "Tên khách hàng": data.name,
                "Địa chỉ": data.address,
                "Số điện thoại khách hàng": data.phone,
                "Tên Faceboook": data.nameFace,
                "Tên sản phẩm": data.pro.name,
                "Size": data.size,
                "Giá": data.pro.amount,
                "Thời gian": formatedDate
            });


    }
    catch (e) {
        console.log(e);
    }
}

module.exports = {
    getHomePage,
    postWebHook,
    getWebHook,
    setupProfile: setupProfile,
    contact,
    contactPost,
};
