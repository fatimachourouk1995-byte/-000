module.exports.config = {
  name: "اوامر",
  version: "1.0.2",
  hasPermssion: 0,
  credits: "انس",
  description: "قاءمة الاوامر",
  commandCategory: "نضام",
  usages: "[Name module]",
  cooldowns: 5,
  envConfig: {
    autoUnsend: true,
    delayUnsend: 20
  }
};

module.exports.languages = {
  "en": {
    "moduleInfo": "「 %1 」\n%2\n\n❯ Usage: %3\n❯ Category: %4\n❯ Waiting time: %5 seconds(s)\n❯ Permission: %6\n\n» Module code by %7 «",
    "helpList": '[ There are %1 commands on this bot, Use: "%2help nameCommand" to know how to use! ]',
    "user": "User",
    "adminGroup": "Admin group",
    "adminBot": "Admin bot"
  }
};

module.exports.handleEvent = function ({ api, event, getText }) {
  const { commands } = global.client;
  const { threadID, messageID, body } = event;

  if (!body || typeof body !== "string" || body.indexOf("help") != 0) return;
  const splitBody = body.slice(body.indexOf("help")).trim().split(/\s+/);
  if (splitBody.length == 1 || !commands.has(splitBody[1].toLowerCase())) return;

  const threadSetting = global.data.threadData.get(parseInt(threadID)) || {};
  const command = commands.get(splitBody[1].toLowerCase());
  const prefix = (threadSetting.hasOwnProperty("PREFIX")) ? threadSetting.PREFIX : global.config.PREFIX;

  return api.sendMessage(
    getText(
      "moduleInfo",
      command.config.name,
      command.config.description,
      `${prefix}${command.config.name} ${(command.config.usages) ? command.config.usages : ""}`,
      command.config.commandCategory,
      command.config.cooldowns,
      ((command.config.hasPermssion == 0) ? getText("user") : (command.config.hasPermssion == 1) ? getText("adminGroup") : getText("adminBot")),
      command.config.credits
    ),
    threadID,
    messageID
  );
};

module.exports.run = function({ api, event, args, getText }) {
  const { commands } = global.client;
  const { threadID, messageID } = event;
  const command = commands.get((args[0] || "").toLowerCase());
  const threadSetting = global.data.threadData.get(parseInt(threadID)) || {};
  const { autoUnsend, delayUnsend } = global.configModule[this.config.name];
  const prefix = (threadSetting.hasOwnProperty("PREFIX")) ? threadSetting.PREFIX : global.config.PREFIX;

  if (!command) {
    const arrayInfo = [];
    const page = parseInt(args[0]) || 1;
    const numberOfOnePage = 100;

    for (var [name, value] of commands) {
      arrayInfo.push(name);
    }

    arrayInfo.sort((a, b) => a.localeCompare(b));

    const startSlice = numberOfOnePage * page - numberOfOnePage;
    const returnArray = arrayInfo.slice(startSlice, startSlice + numberOfOnePage);

    // تجميع الأوامر حسب الفئة
    const categories = {};
    for (var [name, cmd] of commands) {
      const cat = cmd.config.commandCategory || "undefined";
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(cmd.config.name);
    }

    let msg = `◈ ───『قائمة الاوامر』─── ◈\n\n`;
    let counter = 1;

    for (const cat in categories) {
      msg += `◯ ${cat} :\n`;
      for (const cmdName of categories[cat]) {
        msg += `${counter}👑${cmdName}\n`;
        counter++;
      }
      msg += `———————————————\n`;
    }

    msg += `\n◈ ─────────────── ◈\n`;
    msg += `عدد الاوامر هو: ${arrayInfo.length}\n`;
    msg += `استمتع مع lwsyw\n\n`;
    msg += `داروين 🧡🟠\n`;
    msg += `👑lwsyw𝓑𝓸𝒕👑`;

    return api.sendMessage(msg, threadID, async (error, info) => {
      if (autoUnsend) {
        await new Promise(resolve => setTimeout(resolve, delayUnsend * 1000));
        return api.unsendMessage(info.messageID);
      } else return;
    });
  }

  return api.sendMessage(
    getText(
      "moduleInfo",
      command.config.name,
      command.config.description,
      `${prefix}${command.config.name} ${(command.config.usages) ? command.config.usages : ""}`,
      command.config.commandCategory,
      command.config.cooldowns,
      ((command.config.hasPermssion == 0) ? getText("user") : (command.config.hasPermssion == 1) ? getText("adminGroup") : getText("adminBot")),
      command.config.credits
    ),
    threadID,
    messageID
  );
};
