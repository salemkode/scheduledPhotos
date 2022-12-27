import { Bot, Context, NextFunction } from "grammy";
import * as cron from "node-cron";
import * as fs from "fs";
import * as dotenv from "dotenv";
import promptSync from "prompt-sync";

// Check if the .env file exists
if (!fs.existsSync(".env")) {
  console.log("Please enter the following environment variables:");

  // Use the prompt-sync module to prompt the user for the bot token and chat ID
  const prompt = promptSync();
  const botToken = prompt("Bot token: ");
  const adminId = prompt("admin chat id: ");
  const chatId = prompt("Chat ID: ");

  // Write the environment variables to the .env file
  const envVars = `BOT_TOKEN=${botToken}\nCHAT_ID=${chatId}\nADMIN_CHAT_ID=${adminId}`;
  fs.writeFileSync(".env", envVars);
}

dotenv.config();
const bot = new Bot(process.env?.BOT_TOKEN as string);

let scheduledPhotos: string[] = []; // Create an empty array to store the scheduled image IDs

function scheduledPhotosPush(imageId: string) {
  scheduledPhotos.push(imageId);
  fs.writeFileSync("./images.json", JSON.stringify(scheduledPhotos));
}

function scheduledPhotosShift() {
  scheduledPhotos.shift();
  fs.writeFileSync("./images.json", JSON.stringify(scheduledPhotos));
}

function onlyAdmin(ctx: Context, next: NextFunction) {
  if (ctx.chat?.id == process.env?.ADMIN_CHAT_ID) {
    next();
  } else {
    ctx.reply("This bot just work with admin");
  }
}

function handleImage(ctx: Context) {
  let photo = ctx.message?.photo;

  if (photo) {
    photo.sort((a, b) => b.width - a.width);

    ctx.replyWithPhoto(photo[0].file_id, {
      reply_to_message_id: ctx.message?.message_id,
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

bot.callbackQuery("add_image", async (ctx) => {
  console.log("add image callBackQuery");
  let photo = ctx.callbackQuery?.message?.photo;

  // Add the image to the list
  if (photo) {
    const imageId = photo[photo.length - 1].file_id;
    scheduledPhotosPush(imageId);

    let chatId = ctx.chat?.id;
    let message = ctx.callbackQuery.message;
    if (!!chatId && !!message?.message_id) {
      await ctx.reply("Image added to the list.", {
        reply_to_message_id: message?.reply_to_message?.message_id,
      });
      await bot.api.deleteMessage(chatId, message.message_id);
      await ctx.answerCallbackQuery();
    }
  }
});

bot.callbackQuery("cancel", async (ctx) => {
  let chatId = ctx.chat?.id;
  let message = ctx.callbackQuery.message;
  if (!!chatId && !!message?.message_id) {
    await ctx.reply("Cancelled.", {
      reply_to_message_id: message?.reply_to_message?.message_id,
    });
    await bot.api.deleteMessage(chatId, message.message_id);
    await ctx.answerCallbackQuery();
  }
});

function sendScheduledPhotos() {
  console.log(scheduledPhotos.length);
  if (scheduledPhotos.length > 0) {
    const imageId = scheduledPhotos[0];
    bot.api.sendPhoto(process.env?.CHAT_ID as string, imageId); // Send the image
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

// 
bot.command("work", ctx => {
  ctx.reply("The bot is work")
})

// start bot
bot.start();
