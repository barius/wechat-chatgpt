import { WechatyBuilder } from "wechaty";
import QRCode from "qrcode";
import { ChatGPTBot } from "./bot.js";
import fs from "fs";
import readline from "readline";
const chatGPTBot = new ChatGPTBot();

const bot =  WechatyBuilder.build({
  name: "wechat-assistant", // generate xxxx.memory-card.json and save login data for the next login
  puppetOptions: {
    uos: true, // 开启uos协议
  },
  puppet: "wechaty-puppet-wechat",
});
// get a Wechaty instance

const WATERMARK_FILE = "wechat-assistant.wartermark.json";
let watermark = {};
async function load_watermark() {
}
async function save_wartermark() {
}
const PROCESSED_IDS_FILE = "wechat-assistant.processed_ids.txt";
var processed_ids: { [key: string]: number } = {}
async function load_processed_ids() {
  console.log(`Loading processed message ids from file: ${PROCESSED_IDS_FILE} ...`);

  try {
    const fileStream = fs.createReadStream(PROCESSED_IDS_FILE);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    // Note: we use the crlfDelay option to recognize all instances of CR LF
    // ('\r\n') in input.txt as a single line break.

    for await (const line of rl) {
      // Each line in input.txt will be successively available here as `line`.
      // console.log(`Line from file: ${line}`);
      processed_ids[line] = 1;
    }
  } catch (err) {
    console.log('failed to load from processed id file.');
  }

  console.log(`Loaded ${Object.keys(processed_ids).length} message ids.`);
}
async function save_processed_id(message_id: string) {
  try {
    await fs.appendFile(PROCESSED_IDS_FILE, message_id + '\n', 'utf8', (err) => {
      if (err) throw err;
      console.log('The "data to append" was appended to file!');});
  } catch (error) {
    console.log('save file error: ' + error);
  }
  console.log(`Saved 1 message id ${message_id} to file ${PROCESSED_IDS_FILE}.`)
}

async function main() {
  await load_processed_ids();

  await chatGPTBot.startGPTBot();
  bot
    .on("scan", async (qrcode, status) => {
      const url = `https://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`;
      console.log(`Scan QR Code to login: ${status}\n${url}`);
      console.log(
        await QRCode.toString(qrcode, { type: "terminal", small: true })
      );
    })
    .on("login", async (user) => {
      console.log(`User ${user} logged in`);
      chatGPTBot.setBotName(user.name());
    })
    .on("message", async (message) => {
      if (!chatGPTBot.ready) {
        return;
      }
      if (message.text().startsWith("/ping")) {
        await message.say("pong");
        return;
      }
      try {
        if (message.id in processed_ids) {
          console.log(`already processed message: ${message}, id: ${message.id}, time: ${message.date()}, timestamp: ${message.date().getTime()}`)
          return;
        }
        console.log(`Message: ${message}, id: ${message.id}, time: ${message.date()}, timestamp: ${message.date().getTime()}`);
        // if ()
        await chatGPTBot.onMessage(message);
        await save_processed_id(message.id);
      } catch (e) {
        console.error(e);
      }
    });
  try {
    await bot.start();
  } catch (e) {
    console.error(
      `⚠️ Bot start failed, can you log in through wechat on the web?: ${e}`
    );
  }
}
main();
