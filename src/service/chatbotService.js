import request from "request";
require("dotenv").config();
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
//tao tin nhan va gui
let sendSlideMes = async (sender_psid, dataList, isDetail = true) => {
    let mesList = []
    let res = {}
    if (isDetail) {
        mesList = showProduct(dataList,sender_psid);
    } else {
        mesList = showDetail(dataList)
    }
    mesList.forEach(async(mes) => {
        res = {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: mes,
                },
            },
        };
        await callSendAPI(sender_psid, res);
    })
    // await callSendAPI(sender_psid, { text: `cai nay gui sau` });
};
let getNameUser =  (sender_psid) => {
    return new Promise((resolve, reject) => {
        request({
                    uri: `https://graph.facebook.com/${sender_psid}?fields=first_name,last_name,profile_pic&access_token=${PAGE_ACCESS_TOKEN}`,
                    method: "GET",
                },(err, res, body) => {
                    console.log(body)
                    if (!err) {
                        body = JSON.parse(body);
                        //tên có dạng first_name:"...", "last_name":"..."
                        // let usename = `${body.last_name} ${body.first_name}`;
                        let usename = `${body.first_name}`;
                        resolve(usename);
                    } else {
                        console.error("Unable to send message:" + err);
                        reject(err);
                    }
                });
    })
    
}
let handleGetStarted = (sender_psid) => {
    return new Promise(async (resolve, reject) => {
        try {
            let username = await getNameUser(sender_psid);
            let response = {"text": `Chào ${username}, rất vui mừng bạn đến với chúng tôi`}
            await callSendAPI(sender_psid, response);
            resolve('done');
        } catch(e) {
            reject(e);
        }
    })
}
let showDetail = (dataList) => {
    let payload = ''
    if (dataList.name.toLowerCase() == "nam") {
        payload = "DANH_MUC_NAM"
    } else {
        payload = "DANH_MUC_NU" 
    }
    let mesList = []
    let mesOnly = []
    dataList.categories.forEach((e, index) => {
        if (mesOnly.length > 7) {
            mesList.push(mesOnly)
            mesOnly = []
        }
        let temp = {
            title: `Ở đây có`,
            buttons: [
                {
                    type: "postback",
                    title: `${e.name}`,
                    payload: payload,
                },
            ],
        }
        mesOnly.push(temp)
    });
    if (mesOnly.length > 0) {
        mesList.push(mesOnly)
    }
    
    return mesList;
}
let showProduct = (dataList,psid) => {
    let mesOnly = []
    let mesList = []
    dataList.categories.forEach((e, index) => {
        if (mesOnly.length >= 6) {
            mesList.push(mesOnly)
            mesOnly = []
        }
        let price = e.amount.toLocaleString('vi-VN', {
            style: 'currency',
            currency: `${e.currency}`
        })
        let temp = {
            title: `${e.name}`,
            subtitle: `Giá: ${price}`,
            // type: "web_url",
            image_url:
                `${e.image}`,
            buttons: [
                {
                    type: "web_url",
                    url: "https://petersfancybrownhats.com",
                    title: "Xem chi tiết",
                },
                {
                    type: "web_url",
                    url: `${process.env.DOMAIN}/${psid}`,
                    title: "Muốn mua",
                    webview_height_ratio: "tall",
                    messenger_extensions: true,
                },
            ],
        }
        mesOnly.push(temp)
    });
    if (mesOnly.length > 0) {
        mesList.push(mesOnly)
    }
    return mesList;
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
                console.log(body);
                console.log(res);
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
    getNameUser,
};