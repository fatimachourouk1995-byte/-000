module.exports.config = {
  name: "اوامر",
  version: "1.0.2",
  hasPermssion: 0,
  credits: "حمودي سان 🇸🇩",
  description: "قائمة الأوامر كاملة مزخرفة",
  commandCategory: "النظام",
  usages: "[اسم الأمر]",
  cooldowns: 5,
  envConfig: {
    autoUnsend: true,
    delayUnsend: 60
  }
};

module.exports.languages = {
  "en": {
    "moduleInfo": "◈ ───『معلومات الأمر』─── ◈\n\n⑉ الاسم: %1\n⑉ الوصف: %2\n⑉ الاستخدام: %3\n⑉ الفئة: %4\n⑉ الانتظار: %5s\n⑉ الصلاحية: %6\n\n◈ ─────────────── ◈\n.المطور: %7",
    "user": "مستخدم",
    "adminGroup": "ادمن المجموعة",
    "adminBot": "ادمن البوت"
  }
};

module.exports.handleEvent = function ({ api, event, getText }) {
  const { commands } = global.client;
  const { threadID, messageID, body } = event;

  if (!body || typeof body == "cmd" || body.indexOf("help") != 0) return;
  const splitBody = body.slice(body.indexOf("help")).trim().split(/\s+/);
  if (splitBody.length == 1 || !commands.has(splitBody[1].toLowerCase())) return;

  const threadSetting = global.data.threadData.get(parseInt(threadID)) || {};
  const command = commands.get(splitBody[1].toLowerCase());
  const prefix = (threadSetting.hasOwnProperty("PREFIX")) ? threadSetting.PREFIX : global.config.PREFIX;

  return api.sendMessage(
    getText("moduleInfo",
      command.config.name,
      command.config.description,
      `${prefix}${command.config.name} ${(command.config.usages) ? command.config.usages : ""}`,
      command.config.commandCategory,
      command.config.cooldowns,
      ((command.config.hasPermssion == 0) ? getText("user") :
        (command.config.hasPermssion == 1) ? getText("adminGroup") : getText("adminBot")),
      command.config.credits
    ),
    threadID,
    messageID
  );
};

module.exports.run = function ({ api, event, args, getText }) {
  const { commands } = global.client;
  const { threadID, messageID } = event;
  const command = commands.get((args[0] || "").toLowerCase());
  const threadSetting = global.data.threadData.get(parseInt(threadID)) || {};
  const { autoUnsend, delayUnsend } = global.configModule[this.config.name];
  const prefix = (threadSetting.hasOwnProperty("PREFIX")) ? threadSetting.PREFIX : global.config.PREFIX;

  if (!command) {
    // تجميع الأوامر حسب الفئة
    const categoryMap = {};
    for (var [name, cmd] of commands) {
      const cat = (cmd.config && cmd.config.commandCategory) ? cmd.config.commandCategory : "undefined";
      if (!categoryMap[cat]) categoryMap[cat] = [];
      categoryMap[cat].push(name);
    }

    // بناء الرسالة
    let msg = "◈ ───『قائمة الاوامر』─── ◈\n\n";
    let counter = 1;

    for (const cat in categoryMap) {
      categoryMap[cat].sort();
      msg += `◯ ${cat} :\n`;
      for (const name of categoryMap[cat]) {
        msg += `${counter}👑${name}\n`;
        counter++;
      }
      msg += "———————————————\n";
    }

    msg += "\n◈ ─────────────── ◈\n";
    msg += `عدد الاوامر هو: ${counter - 1}\n`;
    msg += "استمتع مع داروين 🧡🟠\n";
    msg += "👑داروين BOT👑";

    return api.sendMessage(msg, threadID, async (error, info) => {
      if (autoUnsend) {
        await new Promise(resolve => setTimeout(resolve, delayUnsend * 1000));
        return api.unsendMessage(info.messageID);
      }
    }, messageID);
  }

  return api.sendMessage(
    getText("moduleInfo",
      command.config.name,
      command.config.description,
      `${prefix}${command.config.name} ${(command.config.usages) ? command.config.usages : ""}`,
      command.config.commandCategory,
      command.config.cooldowns,
      ((command.config.hasPermssion == 0) ? getText("user") :
        (command.config.hasPermssion == 1) ? getText("adminGroup") : getText("adminBot")),
      command.config.credits
    ),
    threadID,
    messageID
  );
};
