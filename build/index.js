"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const grammy_1 = require("grammy");
const cron = __importStar(require("node-cron"));
const fs = __importStar(require("fs"));
const dotenv = __importStar(require("dotenv"));
const prompt_sync_1 = __importDefault(require("prompt-sync"));
// Check if the .env file exists
if (!fs.existsSync(".env")) {
    console.log("Please enter the following environment variables:");
    // Use the prompt-sync module to prompt the user for the bot token and chat ID
    const prompt = (0, prompt_sync_1.default)();
    const botToken = prompt("Bot token: ");
    const adminId = prompt("admin chat id: ");
    const chatId = prompt("Chat ID: ");
    // Write the environment variables to the .env file
    const envVars = `BOT_TOKEN=${botToken}\nCHAT_ID=${chatId}\nADMIN_CHAT_ID=${adminId}`;
    fs.writeFileSync(".env", envVars);
}
dotenv.config();
const bot = new grammy_1.Bot((_a = process.env) === null || _a === void 0 ? void 0 : _a.BOT_TOKEN);
let scheduledPhotos = []; // Create an empty array to store the scheduled image IDs
function scheduledPhotosPush(imageId) {
    scheduledPhotos.push(imageId);
    fs.writeFileSync("./images.json", JSON.stringify(scheduledPhotos));
}
function scheduledPhotosShift() {
    scheduledPhotos.shift();
    fs.writeFileSync("./images.json", JSON.stringify(scheduledPhotos));
}
function onlyAdmin(ctx, next) {
    var _a, _b;
    if (((_a = ctx.chat) === null || _a === void 0 ? void 0 : _a.id) == ((_b = process.env) === null || _b === void 0 ? void 0 : _b.ADMIN_CHAT_ID)) {
        next();
    }
    else {
        ctx.reply("This bot just work with admin");
    }
}
function handleImage(ctx) {
    var _a, _b;
    let photo = (_a = ctx.message) === null || _a === void 0 ? void 0 : _a.photo;
    if (photo) {
        photo.sort((a, b) => b.width - a.width);
        ctx.replyWithPhoto(photo[0].file_id, {
            reply_to_message_id: (_b = ctx.message) === null || _b === void 0 ? void 0 : _b.message_id,
            caption: "Do you want to add this image to the schedule?",
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "Yes", callback_data: "add_image" },
                        { text: "No", callback_data: "cancel" },
                    ],
                ],
            },
        });
    }
}
bot.callbackQuery("add_image", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c, _d, _e;
    console.log("add image callBackQuery");
    let photo = (_c = (_b = ctx.callbackQuery) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.photo;
    // Add the image to the list
    if (photo) {
        const imageId = photo[photo.length - 1].file_id;
        scheduledPhotosPush(imageId);
        let chatId = (_d = ctx.chat) === null || _d === void 0 ? void 0 : _d.id;
        let message = ctx.callbackQuery.message;
        if (!!chatId && !!(message === null || message === void 0 ? void 0 : message.message_id)) {
            yield ctx.reply("Image added to the list.", {
                reply_to_message_id: (_e = message === null || message === void 0 ? void 0 : message.reply_to_message) === null || _e === void 0 ? void 0 : _e.message_id,
            });
            yield bot.api.deleteMessage(chatId, message.message_id);
            yield ctx.answerCallbackQuery();
        }
    }
}));
bot.callbackQuery("cancel", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    var _f, _g;
    let chatId = (_f = ctx.chat) === null || _f === void 0 ? void 0 : _f.id;
    let message = ctx.callbackQuery.message;
    if (!!chatId && !!(message === null || message === void 0 ? void 0 : message.message_id)) {
        yield ctx.reply("Cancelled.", {
            reply_to_message_id: (_g = message === null || message === void 0 ? void 0 : message.reply_to_message) === null || _g === void 0 ? void 0 : _g.message_id,
        });
        yield bot.api.deleteMessage(chatId, message.message_id);
        yield ctx.answerCallbackQuery();
    }
}));
function sendScheduledPhotos() {
    var _a;
    console.log(scheduledPhotos.length);
    if (scheduledPhotos.length > 0) {
        const imageId = scheduledPhotos[0];
        bot.api.sendPhoto((_a = process.env) === null || _a === void 0 ? void 0 : _a.CHAT_ID, imageId); // Send the image
        scheduledPhotosShift(); // Remove the image from the list
    }
}
// Read the images from the JSON file if it exists
if (fs.existsSync("./images.json")) {
    scheduledPhotos = JSON.parse(fs.readFileSync("./images.json", "utf8"));
}
// Set up a command to handle images sent by the user
bot.on("message:photo", onlyAdmin, handleImage);
// Set up a scheduled task to send the first image in the list every day at 8:00 PM
cron.schedule("* * 20 * * *", sendScheduledPhotos);
// start bot
bot.start();
