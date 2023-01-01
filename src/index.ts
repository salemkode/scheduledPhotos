import { Bot, Context, NextFunction } from "grammy";
import * as cron from "node-cron";
import * as fs from "fs";
import * as dotenv from "dotenv";
import promptSync from "prompt-sync";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Check if the .env file exists
if (!fs.existsSync(".env")) {
  console.log("Please enter the following environment variables");

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
let chatId = process.env?.CHAT_ID;

type scheduledType = "Photo" | "Video" | "Text";
type schedule = { type: scheduledType; value: string; caption?: string };

function onlyAdmin(ctx: Context, next: NextFunction) {
  if (ctx.chat?.id == process.env?.ADMIN_CHAT_ID) {
    next();
  } else {
    ctx.reply("This bot just work with admin");
  }
}

bot.callbackQuery("add_media", async (ctx) => {
  let media = getReplyMessageScheduled(ctx);
  let chatId = ctx.chat?.id;
  let message = ctx.callbackQuery.message;

  if (media && !!chatId && !!message?.message_id) {
    // Add the image to the list
    await prisma.message.create({
      data: media,
    });

    // Alert user when media was added
    await ctx.reply("Media added to the list.", {
      reply_to_message_id: message?.reply_to_message?.message_id,
    });

    // Remove add media message
    await bot.api.deleteMessage(chatId, message.message_id);
  } else {
    await ctx.reply("Can not add media to the list.");
  }
  await ctx.answerCallbackQuery();
});

function getReplyMessageScheduled(ctx: Context): schedule | undefined {
  let reply_to_message = ctx.callbackQuery?.message?.reply_to_message;
  let photo = reply_to_message?.photo;
  let video = reply_to_message?.video;
  let text = reply_to_message?.text;

  // Add the image to the list
  if (photo) {
    photo.sort((a, b) => b.width - a.width);
    return {
      type: "Photo",
      value: photo[0].file_id,
      caption: reply_to_message?.caption,
    };
  } else if (video) {
    return {
      type: "Video",
      value: video.file_id,
      caption: reply_to_message?.caption,
    };
  } else if (text) {
    return { type: "Text", value: text };
  }
}

async function sendScheduledMedia() {
  let message = await prisma.message.findFirst();
  if (message) {
    switch (message.type) {
      case "Photo":
        await bot.api.sendPhoto(chatId as string, message.value, {
          caption: message.caption || "",
        });
        break;
      case "Video":
        await bot.api.sendVideo(chatId as string, message.value, {
          caption: message.caption || "",
        });
        break;
      case "Text":
        await bot.api.sendMessage(chatId as string, message.value);
        break;
    }

    await prisma.message.delete({
      where: {
        id: message.id,
      },
    });
  }
}

/* cron timer */
const options = {
  scheduled: true,
  timezone: "Asia/Kuwait",
};

// Set up a scheduled task to send the first image in the list every day at 8:00 PM
cron.schedule("0 17,20 * * *", sendScheduledMedia, options);

//
bot.command("status", onlyAdmin, async (ctx) => {
  let length = await prisma.message.count();
  ctx.reply("Schedule media length is : " + length);
});

//
bot.command("start", (ctx) => {
  ctx.reply("Welcome " + ctx.from?.username);
});

// Set up a command to handle images sent by the user
bot.on(["message:photo", "message:video", "message:text"], onlyAdmin, (ctx) => {
  ctx.reply("Do you want to add this photo to the schedule?", {
    reply_to_message_id: ctx.message?.message_id,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Yes", callback_data: "add_media" },
          { text: "No", callback_data: "cancel" },
        ],
      ],
    },
  });
});

// start bot
bot.start();
