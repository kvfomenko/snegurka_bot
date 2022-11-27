const TelegramBot = require('node-telegram-bot-api');
const util = require('./modules/util');
const vCard = require('vcard-parser');
const http = require('http');
const url = require('url');
const path = require("path");
const fs = require("fs");
const battery = require("battery");


let app_state = require('./modules/app_state');

const conf = util.includeConfig('../app_conf.json');

let bot;

let send_contact_option = {
    "parse_mode": "Markdown",
    "reply_markup": {
        "one_time_keyboard": true,
        "keyboard": [[{
            text: "Отправить мой номер",
            request_contact: true
        }], ["Отмена"]]
    }
};

async function add_subscriber(msg) {
    console.log('in add_subscriber: ' + JSON.stringify(msg));

    if (!app_state.state.subscribers[msg.chat.id]) {
        app_state.state.subscribers[msg.chat.id] = {
            phone_number: msg.contact.phone_number,
            first_name: msg.from.first_name,
            subscribe_time: util.getFormattedDateTime()
        };
    } else {
        app_state.state.subscribers[msg.chat.id].phone_number = msg.contact.phone_number;
    }

    if (!app_state.state.wishes[msg.contact.phone_number]) {
        app_state.state.wishes[msg.contact.phone_number] = [];
    }
    await app_state.save();
}

async function add_wish(msg) {
    console.log('in add_wish: ' + JSON.stringify(msg));

    if (app_state.state.subscribers[msg.chat.id].phone_number) {
        if (!app_state.state.wishes[app_state.state.subscribers[msg.chat.id].phone_number]) {
            app_state.state.wishes[app_state.state.subscribers[msg.chat.id].phone_number] = [];
        }
        app_state.state.wishes[app_state.state.subscribers[msg.chat.id].phone_number].push(msg.text.substring(1).trim());
        await app_state.save();
    } else {
        await bot.sendMessage(msg.chat.id, 'Вы не авторизовались, авторизуйтесь нажав на кнопку "Отправить мой номер"', send_contact_option);
    }
}

async function del_wish(msg) {
    console.log('in del_wish: ' + JSON.stringify(msg));

    if (app_state.state.subscribers[msg.chat.id].phone_number) {
        if (!app_state.state.wishes[app_state.state.subscribers[msg.chat.id].phone_number]) {
            app_state.state.wishes[app_state.state.subscribers[msg.chat.id].phone_number] = [];
        }
        app_state.state.wishes[app_state.state.subscribers[msg.chat.id].phone_number].push(msg.text.substring(1).trim());
        await app_state.save();
    } else {
        await bot.sendMessage(msg.chat.id, 'Вы не авторизовались, авторизуйтесь нажав на кнопку "Отправить мой номер"', send_contact_option);
    }
}

async function del_wish_all(msg) {
    console.log('in del_wish_all: ' + JSON.stringify(msg));

    if (app_state.state.subscribers[msg.chat.id].phone_number) {
        app_state.state.wishes[app_state.state.subscribers[msg.chat.id].phone_number] = [];
        await app_state.save();
    } else {
        await bot.sendMessage(msg.chat.id, 'Вы не авторизовались, авторизуйтесь нажав на кнопку "Отправить мой номер"', send_contact_option);
    }
}

async function list(msg) {
    console.log('in list: ' + JSON.stringify(msg));

    if (app_state.state && app_state.state.subscribers[msg.chat.id] && app_state.state.subscribers[msg.chat.id].phone_number) {
        if (!app_state.state.wishes[app_state.state.subscribers[msg.chat.id].phone_number]) {
            app_state.state.wishes[app_state.state.subscribers[msg.chat.id].phone_number] = [];
        }

        let wishes = '';
        for (let i=0; i < app_state.state.wishes[app_state.state.subscribers[msg.chat.id].phone_number].length; i++) {
            wishes = wishes + (i+1) + ' ' + app_state.state.wishes[app_state.state.subscribers[msg.chat.id].phone_number][i] + '\n';
        }

        await bot.sendMessage(msg.chat.id, 'Мой список желаний: \n' + wishes);
    } else {
        await bot.sendMessage(msg.chat.id, 'Вы не авторизовались, авторизуйтесь нажав на кнопку "Отправить мой номер"', send_contact_option);
    }
}




/*
http.createServer(function (req, res) {
    var url_parsed = url.parse(req.url, true);
    var uri = url_parsed.pathname;
    console.log('uri:', uri);

    if (url_parsed.pathname.indexOf('/public/') === 0) {
        // all static requests here

        let filename = path.join(process.cwd(), uri);
        console.log('filename:', filename);
        if (!fs.existsSync(filename)) {
            res.setHeader("Content-Type", "text/plain");
            res.write("404 Not Found\n");
            res.end();
            return;
        }

        fs.readFile(filename, "binary", function(err, file) {
            if (err) {
                res.setHeader("Content-Type", "text/plain");
                res.write(err + "\n");
                res.end();
                return;
            }
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.write(file, "binary");
            res.end();
            return;
        });
        return;

    }

    if (url_parsed.query.battery_state === 'true') {
        sendMessageToAll('Питание ДТЭК восстановлено')
            .then(r => null)
            .catch(err => null);

    } else if (url_parsed.query.battery_state === 'false') {
        sendMessageToAll('Питание ДТЭК отключено')
            .then(r => null)
            .catch(err => null);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Headers', 'User-Agent, Accept-Language, Content-Type, Content-Length, Connection, Date, Set-Cookie');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Origin', '*');
    let apiData = {success: true};
    res.end(JSON.stringify(apiData));


}).listen(conf.battery_state_port);
console.log('Battery main-service listening for on http://localhost:' + conf.battery_state_port);
*/

async function start_bot() {
    bot = new TelegramBot(conf.bot.token, {polling: conf.bot.polling});
    console.log('bot ' + conf.bot.name + ' started...');
    let rows;

    bot.on('message', async (msg) => {
        console.log('msg ' + JSON.stringify(msg));
        if (msg.chat.type === 'private' || (msg.text && msg.text.indexOf('@'+conf.bot.name) >= 0)) {
            //console.log('on message(' + msg.text + ') ' + JSON.stringify(msg));

            if (/^\+/.test(msg.text)) {
                console.log('added ' + msg.chat.id + ' owner:' + msg.from.first_name + ' wish:' + msg.text);
                await add_wish(msg);
                //await bot.sendMessage(msg.chat.id, app_state.state.cache_data.last_by_day, {parse_mode: 'HTML'});

            } else if (/^--/.test(msg.text)) {
                console.log('removed all ' + msg.chat.id + ' owner:' + msg.from.first_name + ' wish:' + msg.text);
                await del_wish_all(msg);

            } else if (/^-/.test(msg.text)) {
                console.log('removed ' + msg.chat.id + ' owner:' + msg.from.first_name + ' wish:' + msg.text);
                await del_wish(msg);

            } else if (/^\/list/.test(msg.text)) {
                console.log('list ' + msg.chat.id + ' owner:' + msg.from.first_name);
                await list(msg);

            } else if (/\/start/.test(msg.text)) {
                console.log('start ' + msg.chat.id + ' ' + msg.from.first_name);
                await bot.sendMessage(msg.chat.id, 'Для авторизации сообщите нам свой номер телефона', send_contact_option);

            } else if (/^\/help/.test(msg.text)) {
                await bot.sendMessage(msg.chat.id, conf.help_answer);

            } else {
                //console.log('unknown command from ' + msg.from.first_name + ': ' + msg.text);
            }
        }

    });

    bot.on('contact', async (msg) => {
        if (msg.contact.user_id === msg.from.id) {
            console.log('current user contact received ' + msg.contact.first_name + ' ' + msg.contact.phone_number);
            await add_subscriber(msg);
            await bot.sendMessage(msg.chat.id, `${msg.contact.first_name}, Вы успешно авторизовались. Теперь вы можете отправить мне свои пожелания (+автомобиль/-автомобиль) или узнать пожелания ваших контактов, для этого просто отправьте мне любой контакт`);
        } else {
            console.log('VCARD contact received ' + msg.contact.phone_number);
            let card = vCard.parse(msg.contact.vcard);
            for (let i=0; i<card.tel.length; i++) {
                if (card.tel[i].value.substring(0,1) === '+') {
                    card.tel[i].value = card.tel[i].value.substring(1);
                }
                console.log('VCARD tel ' + (i+1) + ': ' + card.tel[i].value);
                if (app_state.state.wishes[card.tel[i].value] &&
                    app_state.state.wishes[card.tel[i].value].length > 0) {
                    let wishes = '';
                    console.log('WISHES COUNT ' + app_state.state.wishes[card.tel[i].value].length);

                    for (let j=0; j < app_state.state.wishes[card.tel[i].value].length; j++) {
                        wishes = wishes + (j+1) + ' ' + app_state.state.wishes[card.tel[i].value][j] + '\n';
                        //console.log('iii ' + j);
                    }
                    await bot.sendMessage(msg.chat.id, 'Пожелания по номеру ' + card.tel[i].value + ':\n' + wishes);
                } else {
                    await bot.sendMessage(msg.chat.id, 'Пожелания по номеру ' + card.tel[i].value + ' отсутствуют');
                }
            }
        }

    });

}

async function sendMessageToAll(text) {
    console.log('in sendMessageToAll: ' + JSON.stringify(text));

    await bot.sendMessage('313404677', text);
    //for (let chat_id in app_state.state.subscribers) {
    //    await bot.sendMessage(chat_id, text);
    //}
}

var prev_level, prev_charging;

async function refresh_battery_state() {
    const {level,charging} = await battery();
    console.log('refresh_battery_state ', charging, level)
    if (prev_charging !== charging) {
        if (charging) {
            await sendMessageToAll('Питание ДТЭК восстановлено')
            console.log('Питание ДТЭК восстановлено')
        } else {
            await sendMessageToAll('Питание ДТЭК отключено')
            console.log('Питание ДТЭК отключено')
        }
        prev_charging = charging;
        prev_level = level;
    }
}

async function start_battery_monitor(){
    const {level,charging} = await battery();
    prev_charging = charging;
    prev_level = level;
    setInterval(refresh_battery_state, 1000);
}

async function init() {
    await app_state.init();
    if (!app_state.state.wishes) {
        app_state.state.wishes = []
    }

    await start_bot();
    await start_battery_monitor();

}

init();


