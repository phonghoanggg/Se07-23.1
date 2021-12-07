import request from "request";
require("dotenv").config();
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
//tao tin nhan va gui
let sendSlideMes = async (sender_psid) => {
    let mes = showProduct();
    await callSendAPI(sender_psid, mes);
    await callSendAPI(sender_psid, { text: `cai nay gui sau` });
};
let handleGetStarted = (sender_psid) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = {text: "Hey guys, wealcom go to the restaurant FFF"}
            await callSendAPI(sender_psid, response);
            resolve('done');
        } catch(e) {
            reject(e);
        }
    })
}
let showProduct = () => {
    let res = {
        attachment: {
            type: "template",
            payload: {
                template_type: "generic",
                elements: [
                    {
                        title: "Welcome!",
                        image_url:
                            "https://petersfancybrownhats.com/company_image.png",
                        subtitle: "We have the right hat for everyone.",
                        // type: "web_url",
                        image_url:
                            "https://petersfancybrownhats.com/view?item=103",
                        // messenger_extensions: false,
                        // webview_height_ratio: "tall",
                        // fallback_url: "https://petersfancybrownhats.com/",

                        buttons: [
                            {
                                type: "web_url",
                                url: "https://petersfancybrownhats.com",
                                title: "View Website",
                            },
                            {
                                type: "postback",
                                title: "Start Chatting",
                                payload: "DEVELOPER_DEFINED_PAYLOAD",
                            },
                        ],
                    },
                    {
                        title: "Welcome!",
                        image_url:
                            "https://petersfancybrownhats.com/company_image.png",
                        subtitle: "We have the right hat for everyone.",
                        image_url:
                            "https://petersfancybrownhats.com/view?item=103",

                        buttons: [
                            {
                                type: "web_url",
                                url: "https://petersfancybrownhats.com",
                                title: "View Website",
                            },
                            {
                                type: "postback",
                                title: "Start Chatting",
                                payload: "DEVELOPER_DEFINED_PAYLOAD",
                            },
                        ],
                    },
                    {
                        title: "Welcome!",
                        image_url:
                            "https://petersfancybrownhats.com/company_image.png",
                        subtitle: "We have the right hat for everyone.",
                        // type: "web_url",
                        image_url:
                            "https://petersfancybrownhats.com/view?item=103",
                        // messenger_extensions: false,
                        // webview_height_ratio: "tall",
                        // fallback_url: "https://petersfancybrownhats.com/",

                        buttons: [
                            {
                                type: "web_url",
                                url: "https://petersfancybrownhats.com",
                                title: "View Website",
                            },
                            {
                                type: "postback",
                                title: "Start Chatting",
                                payload: "DEVELOPER_DEFINED_PAYLOAD",
                            },
                        ],
                    },
                ],
            },
        },
    };
    return res;
};

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
    // Construct the message body
    let request_body = {
        recipient: {
            id: sender_psid,
        },

        message: response,
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
module.exports = {
    handleGetStarted:handleGetStarted,
    sendSlideMes,
};
