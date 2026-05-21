const fs   = require("fs");
const path = require("path");
const axios = require("axios");

module.exports.config = {
  name: "مدير",
  version: "1.0.0",
  hasPermssion: 2,
  credits: "داروين 🧡🟠",
  description: "مدير الأوامر الذكي — إنشاء وتعديل وإدارة كاملة",
  commandCategory: "المطور",
  usages: "مدير | مدير [قائمة/اقرأ/اكتب/عدل/احذف/أضف/ملف/صحح]",
  cooldowns: 0
};

const DEV_IDS   = ["61563738496733", "100081948980908"];
const CMDS_PATH = path.join(__dirname);
const ROOT_PATH = path.join(__dirname, "..", "..");
const EVNT_PATH = path.join(__dirname, "..", "events");
const SELF      = "مدير";

const BOT_FILES = {
  "config"        : path.join(ROOT_PATH, "config.json"),
  "index"         : path.join(ROOT_PATH, "index.js"),
  "main"          : path.join(ROOT_PATH, "main.js"),
  "listen"        : path.join(ROOT_PATH, "includes", "listen.js"),
  "handlecommand" : path.join(ROOT_PATH, "includes", "handle", "handleCommand.js"),
  "handleevent"   : path.join(ROOT_PATH, "includes", "handle", "handleEvent.js"),
  "handlereply"   : path.join(ROOT_PATH, "includes", "handle", "handleReply.js"),
};

function isAdmin(id) {
  if (DEV_IDS.includes(String(id))) return true;
  return ((global.config && global.config.ADMINBOT) || []).includes(String(id));
}

function listJS() {
  try { return fs.readdirSync(CMDS_PATH).filter(f => f.endsWith(".js")).sort(); }
  catch(e) { return []; }
}

function readSafe(fp, limit = 4000) {
  try {
    const c = fs.readFileSync(fp, "utf8");
    return c.length > limit ? c.slice(0, limit) + "\n\n…[مقطوع]" : c;
  } catch(e) { return null; }
}

function hotReload(fp) {
  try {
    delete require.cache[require.resolve(fp)];
    const mod = require(fp);
    if (mod.config && mod.config.name && global.client && global.client.commands) {
      global.client.commands.set(mod.config.name, mod);
      global.client.commands.set(mod.config.name.toLowerCase(), mod);
      return `⚡ تم تحميل "${mod.config.name}" فوراً ✅`;
    }
    return "⚠️ تم الحفظ — أعد التشغيل لتفعيله.";
  } catch(e) {
    return `⚠️ فيه خطأ في الكود:\n${e.message}`;
  }
}

const COMMANDS_DIR = path.join(__dirname);
const PROTECTED = ["مدير", "help", "اوامر"];

function resolveCmdPath(name) {
  const n = name.endsWith(".js") ? name : name + ".js";
  const fp = path.join(CMDS_PATH, n);
  return fs.existsSync(fp) ? fp : null;
}

function resolveBotFile(name) {
  const lower = name.toLowerCase().replace(/\.js$/, "");
  if (BOT_FILES[lower]) return { path: BOT_FILES[lower], type: "bot" };
  const cmdPath = path.join(COMMANDS_DIR, name.endsWith(".js") ? name : name + ".js");
  if (fs.existsSync(cmdPath)) return { path: cmdPath, type: "cmd" };
  return null;
}

function readFile(fp) {
  try { return fs.readFileSync(fp, "utf8"); } catch(e) { return null; }
}

function cleanCode(code) {
  return code.replace(/```(javascript|js)?/gi, "").replace(/```/g, "").trim();
}

function extractCommandInfo(code) {
  const nameMatch   = code.match(/name\s*:\s*["']([^"']+)["']/);
  const descMatch   = code.match(/description\s*:\s*["']([^"']+)["']/);
  const permMatch   = code.match(/hasPermssion\s*:\s*(\d+)/);
  const credMatch   = code.match(/credits\s*:\s*["']([^"']+)["']/);
  const catMatch    = code.match(/commandCategory\s*:\s*["']([^"']+)["']/);
  return {
    name:        nameMatch  ? nameMatch[1]  : "غير معروف",
    description: descMatch  ? descMatch[1]  : "",
    permission:  permMatch  ? permMatch[1]  : "0",
    credits:     credMatch  ? credMatch[1]  : "داروين 🧡🟠",
    category:    catMatch   ? catMatch[1]   : "عام",
  };
}

function buildCommandCard(info, prefix = "-", title = "✅ تم") {
  const permLabels = { "0": "🟢 الجميع", "1": "🟡 مشرف", "2": "🔴 مطور" };
  return (
    `◈ ───『${title}』─── ◈\n\n` +
    `⑉ الاسم    ➤  ${prefix}${info.name}\n` +
    `⑉ الوصف    ➤  ${info.description || "—"}\n` +
    `⑉ الفئة    ➤  ${info.category}\n` +
    `⑉ الصلاحية ➤  ${permLabels[info.permission] || info.permission}\n` +
    `⑉ المطور   ➤  ${info.credits}\n\n` +
    `◈ ─────────────── ◈`
  );
}

async function askGroq(messages, model = "llama-3.3-70b-versatile") {
  try {
    const groqKey = process.env.GROQ_API_KEY || (global.config && global.config.GROQ_API_KEY);
    if (!groqKey) throw new Error("no groq key");
    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      { model, messages, temperature: 0.3, max_tokens: 4096 },
      { headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" }, timeout: 40000 }
    );
    return res.data?.choices?.[0]?.message?.content || null;
  } catch(e) {
    return askAI(messages[messages.length - 1]?.content || "");
  }
}

async function fixFile(name, fp, content) {
  const messages = [
    {
      role: "system",
      content: `أنت خبير في إصلاح ملفات JavaScript لبوت فيسبوك ماسنجر.\nأعد الرد بهذا الشكل الحرفي:\n---تقرير---\n[اكتب الأخطاء المكتشفة أو "لا توجد أخطاء"]\n---كود مصحح---\n[الكود الكامل المصحح]`
    },
    {
      role: "user",
      content: `الملف: ${name}\n\nالكود:\n\`\`\`js\n${content}\n\`\`\``
    }
  ];
  return askGroq(messages, "llama-3.3-70b-versatile");
}

async function askAI(prompt) {
  try {
    const res = await axios.get("https://api.paxsenix.biz.id/ai/gpt4o", {
      params: { text: prompt },
      timeout: 40000
    });
    return (res.data && (res.data.message || res.data.result || res.data.text || res.data.reply)) || null;
  } catch(e) {
    try {
      const res2 = await axios.get("https://api.popcat.xyz/chatbot", {
        params: { msg: prompt, uid: "darwin_bot" },
        timeout: 20000
      });
      return (res2.data && res2.data.response) || null;
    } catch(e2) { return null; }
  }
}

const MENU =
`◈ ───『 lwsyw BOT 』─── ◈

◯ مدير الأوامر :
———————————————
⑉ مدير قائمة
   ↳ عرض كل الأوامر

⑉ مدير اقرأ [اسم]
   ↳ عرض كود أمر موجود

⑉ مدير اكتب [اسم] [وصف]
   ↳ إنشاء أمر جديد بالذكاء

⑉ مدير عدل [اسم] [الطلب]
   ↳ تعديل أمر موجود بالذكاء

⑉ مدير احذف [اسم]
   ↳ حذف أمر

⑉ مدير أضف [اسم]
   ↳ أرسل كودك وسيتم حفظه مباشرة

———————————————
◯ ملفات البوت :
———————————————
⑉ مدير ملف [اسم]
   ↳ قراءة ملف (config/index/main...)

⑉ مدير صحح [اسم]
   ↳ الذكاء يفحص الملف ويصحح الأخطاء

———————————————
◯ الملفات المتاحة :
⑉ config  ⑉ index  ⑉ main
⑉ listen  ⑉ handlecommand
⑉ handleevent  ⑉ handlereply

◈ ─────────────── ◈
استمتع مع داروين 🧡🟠
👑lwsyw BOT👑`;

// ══════════════════════════════════════════════════════
module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  if (!isAdmin(senderID)) return api.sendMessage("🚫 حصري للمطور فقط.", threadID, messageID);

  const sub = (args[0] || "").trim();
  if (!sub) return api.sendMessage(MENU, threadID, messageID);

  // ── قائمة ──────────────────────────────────────────
  if (sub === "قائمة") {
    const files = listJS();

    // تجميع حسب الفئة
    const categoryMap = {};
    for (const f of files) {
      try {
        const fp = path.join(CMDS_PATH, f);
        const mod = require(fp);
        const cat = (mod.config && mod.config.commandCategory) ? mod.config.commandCategory : "undefined";
        if (!categoryMap[cat]) categoryMap[cat] = [];
        categoryMap[cat].push(f.replace(".js", ""));
      } catch(e) {
        if (!categoryMap["undefined"]) categoryMap["undefined"] = [];
        categoryMap["undefined"].push(f.replace(".js", ""));
      }
    }

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
    msg += "👑lwsyw BOT👑";

    return api.sendMessage(msg, threadID, messageID);
  }

  // ── اقرأ [اسم] ────────────────────────────────────
  if (sub === "اقرأ") {
    const name = (args[1] || "").trim();
    if (!name) return api.sendMessage("❗ مثال: مدير اقرأ ابتايم", threadID, messageID);
    const resolved = resolveBotFile(name) || { path: resolveCmdPath(name), type: "cmd" };
    if (!resolved.path || !fs.existsSync(resolved.path)) return api.sendMessage(`❌ الملف "${name}" غير موجود.`, threadID, messageID);
    const content = readFile(resolved.path);
    if (!content) return api.sendMessage(`❌ تعذّر قراءة الملف.`, threadID, messageID);
    const preview = content.length > 2000 ? content.substring(0, 2000) + "\n...[مقتطع - الملف أكبر]" : content;
    return api.sendMessage(
      `◈ ───『 📁 محتوى الملف 』─── ◈\n\n` +
      `⑉ الملف: ${name}\n⑉ الحجم: ${content.length} حرف\n` +
      `———————————————\n\n${preview}\n\n` +
      `———————————————\n💬 رد على هذه الرسالة لتعديل أو تصحيح هذا الملف.\n\n◈ ─────────────── ◈`,
      threadID, (err, info) => {
        if (!err && info) {
          global.client.handleReply.push({
            type: "مدير_عدل",
            name: SELF,
            author: senderID,
            messageID: info.messageID,
            senderID,
            targetFile: name,
            targetPath: resolved.path,
            context: `عرض محتوى الملف: ${name}`,
          });
        }
      }, messageID
    );
  }

  // ── اكتب [اسم] [وصف] ──────────────────────────────
  if (sub === "اكتب") {
    const name = (args[1] || "").trim();
    const desc = args.slice(2).join(" ").trim();
    if (!name || !desc) return api.sendMessage("❗ مثال: مدير اكتب سلام يرد بتحية جميلة", threadID, messageID);

    api.sendMessage("🤖 الذكاء يكتب الكود...", threadID, async (err, loadMsg) => {
      const prompt =
`اكتب أمر JavaScript لبوت فيسبوك ماسنجر باسم "${name}".
الوصف: ${desc}
استخدم هذا الهيكل الصحيح فقط:
module.exports.config = { name: "${name}", version: "1.0.0", hasPermssion: 0, credits: "داروين 🧡🟠", description: "${desc}", commandCategory: "عام", usages: "${name}", cooldowns: 3 };
module.exports.run = async function ({ api, event, args }) { const { threadID, messageID } = event; /* كود الأمر */ };
أعط الكود فقط بدون شرح.`;

      const code = await askAI(prompt);
      if (!err) api.unsendMessage(loadMsg.messageID);

      if (!code) {
        return api.sendMessage("❌ فشل الاتصال بالذكاء الاصطناعي، حاول مرة أخرى.", threadID, messageID);
      }

      const clean = code.replace(/```(javascript|js)?/gi, "").replace(/```/g, "").trim();
      return api.sendMessage(
        `◈ ───『 🤖 كود تم بالذكاء 』─── ◈\n\n${clean}\n\n◈ ─────────────── ◈\n✅ رد بـ "حفظ" لحفظه، أو أرسل كودك المعدّل.`,
        threadID,
        (e2, info) => {
          if (!e2) global.client.handleReply.push({
            name: SELF, author: senderID,
            messageID: info.messageID,
            type: "save_new", cmdName: name, generatedCode: clean
          });
        },
        messageID
      );
    });
    return;
  }

  // ── عدل [اسم] [الطلب] ─────────────────────────────
  if (sub === "عدل") {
    const name    = (args[1] || "").trim();
    const request = args.slice(2).join(" ").trim();
    if (!name || !request) return api.sendMessage("❗ مثال: مدير عدل ابتايم أضف وقت التشغيل بالساعات", threadID, messageID);
    const fp = resolveCmdPath(name);
    if (!fp) return api.sendMessage(`❌ الأمر "${name}" غير موجود.`, threadID, messageID);

    const currentCode = readSafe(fp, 3000);
    api.sendMessage("🤖 الذكاء يعدّل الكود...", threadID, async (err, loadMsg) => {
      const prompt =
`هذا كود أمر بوت فيسبوك ماسنجر:
${currentCode}

الطلب: ${request}
عدّل الكود حسب الطلب واعطني الكود الكامل المعدّل فقط بدون شرح.`;

      const code = await askAI(prompt);
      if (!err) api.unsendMessage(loadMsg.messageID);

      if (!code) return api.sendMessage("❌ فشل الاتصال بالذكاء، حاول مرة أخرى.", threadID, messageID);

      const clean = code.replace(/```(javascript|js)?/gi, "").replace(/```/g, "").trim();
      return api.sendMessage(
        `◈ ───『 ✏️ كود معدّل بالذكاء 』─── ◈\n\n${clean}\n\n◈ ─────────────── ◈\n✅ رد بـ "حفظ" لحفظه، أو أرسل كودك المعدّل.`,
        threadID,
        (e2, info) => {
          if (!e2) global.client.handleReply.push({
            name: SELF, author: senderID,
            messageID: info.messageID,
            type: "save_edit", cmdName: name, fp, generatedCode: clean
          });
        },
        messageID
      );
    });
    return;
  }

  // ── احذف [اسم] ────────────────────────────────────
  if (sub === "احذف") {
    const name = (args[1] || "").trim();
    if (!name) return api.sendMessage("❗ مثال: مدير احذف ابتايم", threadID, messageID);
    const fp = resolveCmdPath(name);
    if (!fp) return api.sendMessage(`❌ الأمر "${name}" غير موجود.`, threadID, messageID);
    return api.sendMessage(
      `◈ ───『 🗑️ تأكيد الحذف 』─── ◈\n\n⑉ الأمر: ${name}.js\n\n———————————————\nرد بـ "نعم" للتأكيد أو "لا" للإلغاء.\n\n◈ ─────────────── ◈`,
      threadID,
      (err, info) => {
        if (!err) global.client.handleReply.push({
          name: SELF, author: senderID,
          messageID: info.messageID, type: "confirm_delete", fp, cmdName: name
        });
      },
      messageID
    );
  }

  // ── أضف [اسم] ← أرسل كود كرد ─────────────────────
  if (sub === "أضف" || sub === "اضف") {
    const second = (args[1] || "").trim().toLowerCase();

    if (second === "كود") {
      const forceName = args[2]?.trim() || null;
      return api.sendMessage(
        `◈ ───『 📥 إضافة كود 』─── ◈\n\n` +
        `${forceName ? `⑉ سيتم الحفظ باسم: ${forceName}.js\n\n` : `⚠️ لم تحدد اسماً — سيتم استخراج الاسم من الكود تلقائياً.\n\n`}` +
        `📤 أرسل الكود الآن كرد على هذه الرسالة:\n\n◈ ─────────────── ◈`,
        threadID, (err, info) => {
          if (!err && info) {
            global.client.handleReply.push({
              type: "مدير_أضف_كود",
              name: SELF,
              author: senderID,
              messageID: info.messageID,
              senderID,
              forceName,
            });
          }
        }, messageID
      );
    }

    const name = second;
    if (!name) return api.sendMessage("❗ مثال: مدير أضف سلام ثم أرسل الكود كرد\nأو: مدير أضف كود [الاسم]", threadID, messageID);
    return api.sendMessage(
      `◈ ───『 📝 إضافة كود يدوي 』─── ◈\n\n⑉ الأمر: ${name}.js\n\n⬆️ أرسل الكود كاملاً كـرد على هذه الرسالة.\n⚡ سيُحفظ ويُحمّل فوراً.\n\n◈ ─────────────── ◈`,
      threadID,
      (err, info) => {
        if (!err) global.client.handleReply.push({
          name: SELF, author: senderID,
          messageID: info.messageID, type: "write_code", cmdName: name
        });
      },
      messageID
    );
  }

  // ── ملف [اسم] ─────────────────────────────────────
  if (sub === "ملف") {
    const target = (args[1] || "").trim().toLowerCase();
    if (!target) {
      return api.sendMessage(
        `◈ ───『 📁 الملفات المتاحة 』─── ◈\n\n` +
        Object.keys(BOT_FILES).map(k => `⑉ ${k}`).join("\n") +
        `\n\n———————————————\nاستخدام: مدير ملف config\n\n◈ ─────────────── ◈`,
        threadID, messageID
      );
    }
    const fp = BOT_FILES[target] || resolveCmdPath(target);
    if (!fp || !fs.existsSync(fp)) return api.sendMessage(`❌ الملف "${target}" غير موجود.`, threadID, messageID);
    const code = readSafe(fp, 3500);
    return api.sendMessage(
      `◈ ───『 📁 ${target} 』─── ◈\n\n${code}\n\n◈ ─────────────── ◈`,
      threadID, messageID
    );
  }

  // ── صحح [اسم] ─────────────────────────────────────
  if (sub === "صحح") {
    const name = (args[1] || "").trim();
    if (!name) return api.sendMessage("❗ مثال: مدير صحح ابتايم", threadID, messageID);
    const fp = BOT_FILES[name.toLowerCase()] || resolveCmdPath(name);
    if (!fp || !fs.existsSync(fp)) return api.sendMessage(`❌ الملف "${name}" غير موجود.`, threadID, messageID);

    const code = readSafe(fp, 3000);
    api.sendMessage("🔍 الذكاء يفحص الأخطاء...", threadID, async (err, loadMsg) => {
      const prompt =
`افحص هذا الكود JavaScript وصحح الأخطاء فيه:
${code}
أعطني الكود المصحح كاملاً فقط بدون شرح.`;

      const fixed = await askAI(prompt);
      if (!err) api.unsendMessage(loadMsg.messageID);

      if (!fixed) return api.sendMessage("❌ فشل الاتصال بالذكاء، حاول مرة أخرى.", threadID, messageID);

      const cleanFixed = fixed.replace(/```(javascript|js)?/gi, "").replace(/```/g, "").trim();
      return api.sendMessage(
        `◈ ───『 🔧 كود مصحح بالذكاء 』─── ◈\n\n${cleanFixed}\n\n◈ ─────────────── ◈\n✅ رد بـ "حفظ" لحفظ التصحيح، أو "لا" للإلغاء.`,
        threadID,
        (e2, info) => {
          if (!e2) global.client.handleReply.push({
            name: SELF, author: senderID,
            messageID: info.messageID,
            type: "save_fix", fp, cmdName: name, generatedCode: cleanFixed
          });
        },
        messageID
      );
    });
    return;
  }

  return api.sendMessage(`❓ غير معروف: "${sub}"\nاكتب مدير للقائمة.`, threadID, messageID);
};

// ══════════════════════════════════════════════════════
// handleReply
// ══════════════════════════════════════════════════════
module.exports.handleReply = async function ({ api, event, handleReply }) {
  const { threadID, messageID, senderID, body } = event;
  if (!isAdmin(senderID)) return;
  if (String(senderID) !== String(handleReply.author)) return;

  const input = body.trim();

  // ── حفظ أمر جديد (من اكتب) ──────────────────────
  if (handleReply.type === "save_new") {
    const { cmdName, generatedCode } = handleReply;
    const code = input.toLowerCase() === "حفظ" ? generatedCode : input;
    const fp   = path.join(CMDS_PATH, `${cmdName}.js`);
    try {
      fs.writeFileSync(fp, code, "utf8");
      const msg = hotReload(fp);
      return api.sendMessage(
        `◈ ───『 ✅ تم الإنشاء 』─── ◈\n\n⑉ ${cmdName}.js\n${msg}\n\n◈ ─────────────── ◈`,
        threadID, messageID
      );
    } catch(e) { return api.sendMessage(`❌ فشل: ${e.message}`, threadID, messageID); }
  }

  // ── حفظ تعديل (من عدل) ───────────────────────────
  if (handleReply.type === "save_edit") {
    const { cmdName, fp, generatedCode } = handleReply;
    const code = input.toLowerCase() === "حفظ" ? generatedCode : input;
    try {
      fs.writeFileSync(fp, code, "utf8");
      const msg = hotReload(fp);
      return api.sendMessage(
        `◈ ───『 ✅ تم التعديل 』─── ◈\n\n⑉ ${cmdName}.js\n${msg}\n\n◈ ─────────────── ◈`,
        threadID, messageID
      );
    } catch(e) { return api.sendMessage(`❌ فشل: ${e.message}`, threadID, messageID); }
  }

  // ── حفظ تصحيح (من صحح) ───────────────────────────
  if (handleReply.type === "save_fix") {
    const { fp, cmdName, generatedCode } = handleReply;
    if (input !== "حفظ") return api.sendMessage("❌ تم إلغاء التصحيح.", threadID, messageID);
    try {
      fs.writeFileSync(fp, generatedCode, "utf8");
      const msg = hotReload(fp);
      return api.sendMessage(
        `◈ ───『 ✅ تم التصحيح 』─── ◈\n\n⑉ ${cmdName}\n${msg}\n\n◈ ─────────────── ◈`,
        threadID, messageID
      );
    } catch(e) { return api.sendMessage(`❌ فشل: ${e.message}`, threadID, messageID); }
  }

  // ── كتابة كود يدوي (من أضف) ──────────────────────
  if (handleReply.type === "write_code") {
    const { cmdName } = handleReply;
    const fp = path.join(CMDS_PATH, `${cmdName}.js`);
    try {
      fs.writeFileSync(fp, input, "utf8");
      const msg = hotReload(fp);
      return api.sendMessage(
        `◈ ───『 ✅ تم الحفظ 』─── ◈\n\n⑉ ${cmdName}.js\n${msg}\n\n◈ ─────────────── ◈`,
        threadID, messageID
      );
    } catch(e) { return api.sendMessage(`❌ فشل: ${e.message}`, threadID, messageID); }
  }

  // ── تأكيد حذف ────────────────────────────────────
  if (handleReply.type === "confirm_delete") {
    const { fp, cmdName } = handleReply;
    if (input !== "نعم") return api.sendMessage("❌ تم إلغاء الحذف.", threadID, messageID);
    try {
      fs.unlinkSync(fp);
      try {
        delete require.cache[require.resolve(fp)];
        global.client.commands && global.client.commands.delete(cmdName);
        global.client.commands && global.client.commands.delete(cmdName.toLowerCase());
      } catch(e) {}
      return api.sendMessage(
        `◈ ───『 🗑️ تم الحذف 』─── ◈\n\n⑉ ${cmdName}.js تم حذفه بنجاح\n\n◈ ─────────────── ◈`,
        threadID, messageID
      );
    } catch(e) { return api.sendMessage(`❌ فشل الحذف: ${e.message}`, threadID, messageID); }
  }

  // ── إضافة كود يدوياً (مدير_أضف_كود) ─────────────
  if (handleReply.type === "مدير_أضف_كود") {
    let code = (event.body || "").trim();
    if (!code) return api.sendMessage("❌ لم ترسل أي كود.", threadID, messageID);
    code = cleanCode(code);
    const info = extractCommandInfo(code);
    const cmdName = handleReply.forceName || info.name;

    if (!cmdName || cmdName === "غير معروف")
      return api.sendMessage(`❌ تعذّر استخراج الاسم.\nاستخدم: مدير أضف كود [الاسم]`, threadID, messageID);

    if (PROTECTED.includes(cmdName))
      return api.sendMessage(`⛔ الاسم "${cmdName}" محمي ولا يمكن الكتابة فوقه.`, threadID, messageID);

    const filePath = path.join(COMMANDS_DIR, `${cmdName}.js`);
    const isNew = !fs.existsSync(filePath);
    try {
      fs.writeFileSync(filePath, code, "utf8");
    } catch(e) {
      return api.sendMessage(`❌ فشل الحفظ: ${e.message}`, threadID, messageID);
    }
    const loadMsg = hotReload(filePath);
    api.setMessageReaction("✅", messageID, () => {}, true);

    let msg = buildCommandCard(info, global.config?.PREFIX || "-", isNew ? "✅ تم إضافة الأمر" : "♻️ تم تحديث الأمر");
    msg += `\n———————————————\n${loadMsg}\n💬 رد لأي تعديل لاحق.`;

    return api.sendMessage(msg, threadID, (err, sentInfo) => {
      if (!err && sentInfo) {
        global.client.handleReply.push({
          type: "مدير_عدل",
          name: SELF,
          author: senderID,
          messageID: sentInfo.messageID,
          senderID,
          targetFile: `${cmdName}.js`,
          targetPath: filePath,
          context: `إضافة يدوية للأمر "${cmdName}"`,
        });
      }
    }, messageID);
  }

  // ── تعديل ملف بالذكاء (مدير_عدل) ────────────────
  if (handleReply.type === "مدير_عدل") {
    const { targetFile, targetPath, context } = handleReply;
    const request = (event.body || "").trim();
    if (!request) return;

    const currentCode = readFile(targetPath);
    if (!currentCode) return api.sendMessage(`❌ فشل قراءة "${targetFile}".`, threadID, messageID);

    api.setMessageReaction("⏳", messageID, () => {}, true);
    const waitInfo = await new Promise(r => api.sendMessage(`⏳ جاري تعديل "${targetFile}"...`, threadID, (e, i) => r(i)));

    try {
      const messages = [
        {
          role: "system",
          content: `أنت خبير في تعديل ملفات بوت فيسبوك ماسنجر.\nالسياق: ${context}\nأعد الكود الكامل بعد التعديل فقط بدون أي شرح.`
        },
        {
          role: "user",
          content: `الملف: ${targetFile}\n\nالكود الحالي:\n\`\`\`js\n${currentCode}\n\`\`\`\n\nالطلب: ${request}`
        }
      ];

      let newCode = await askGroq(messages, "llama-3.3-70b-versatile");
      if (!newCode) throw new Error("لم يتم استلام كود من الذكاء الاصطناعي.");
      newCode = cleanCode(newCode);

      fs.writeFileSync(targetPath, newCode, "utf8");
      if (waitInfo) api.unsendMessage(waitInfo.messageID);
      api.setMessageReaction("✅", messageID, () => {}, true);

      const isCmd = targetPath.endsWith(".js") && targetPath.includes("commands");
      let replyMsg = isCmd
        ? buildCommandCard(extractCommandInfo(newCode), global.config?.PREFIX || "-", "✅ تم تعديل الأمر")
        : `◈ ───『 ✅ تم تعديل الملف 』─── ◈\n\n⑉ "${targetFile}" تم بنجاح.\n\n◈ ─────────────── ◈`;
      if (isCmd) { const lr = hotReload(targetPath); replyMsg += `\n———————————————\n${lr}`; }
      replyMsg += `\n\n💬 رد لأي تعديل آخر.`;

      return api.sendMessage(replyMsg, threadID, (err, info) => {
        if (!err && info) {
          global.client.handleReply.push({
            type: "مدير_عدل",
            name: SELF,
            author: senderID,
            messageID: info.messageID,
            senderID,
            targetFile,
            targetPath,
            context: `تعديل: ${request}`,
          });
        }
      }, messageID);
    } catch (e) {
      if (waitInfo) api.unsendMessage(waitInfo.messageID);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(`❌ خطأ في التعديل:\n${e.message}`, threadID, messageID);
    }
  }
};
