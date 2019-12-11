require('dotenv').config();

const {
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID_LOG,
  DB_BASE_URL,
  DB_TOKEN,
} = process.env;

const fetch = require('node-fetch');
const Slimbot = require('slimbot');

const slimbot = new Slimbot(TELEGRAM_BOT_TOKEN);

require('tools-for-instagram');


/**
 * An interface to external data storage to keep.
 *
 * If 'key' is equal to `get`, so 'rawValue' can be:
 * - `*` to get all data on storage service.
 * If 'key' is equal to `text`, so 'rawValue' can be:
 * - any string that could match with some pattern on storage service.
 *
 * @param {string} key
 * @param {string} rawValue
 */
const accessStorage = (key, rawValue) => {
  const url = `${DB_BASE_URL}/?${key}=${encodeURIComponent(rawValue)}`;
  return fetch(url, {
    headers: {
      Authorization: DB_TOKEN,
    },
  }).then(res => res.json())
    .then((data) => {
      if (data.error) { 
        data.message = data.details;
        throw data;
      }
      return data;
    });
};


(async function __start__() {
  let ig = null;
  try {
    ig = await login();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }

  const botReceiveMessage = async (message) => {
    if (message.from.is_bot) return; // do nothing
    if (message.text === '/start') {
      return slimbot.sendMessage(message.chat.id, 'opa!');
    }

    if (message.from.id != TELEGRAM_CHAT_ID_LOG) {
      await slimbot.forwardMessage(TELEGRAM_CHAT_ID_LOG, message.from.id, message.message_id);
    }

    const text = message.text.toLowerCase();
    const chatId = message.chat.id;
    const opts = {
      reply_to_message_id: message.message_id,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    };

    let msgMetadata;
    try {
      msgMetadata = await accessStorage('text', text);
    } catch (err) {
      console.log(err)
      if (err.code === 400) {
        return slimbot.sendMessage(chatId, `*[error]* \`${err.message}\``, opts);
      }
      return; // do nothing
    }

    if (!msgMetadata) return; // do nothing

    const msgReply = (msgMetadata.text || '').trim();
    if (!msgReply) {
      return slimbot.sendMessage(chatId, '_nenhuma mensagem a ser enviada :(_', opts);
    }

    const targetUsername = msgMetadata.username;
    const targetUserId = msgMetadata.pk || (await ig.user.getIdByUsername(targetUsername)).toString();
    if (!targetUserId) {
      return slimbot.sendMessage(chatId, '_nenhum usuário alvo >:(_', opts);
    }

    try {
      const { ok, result: botMsg } = await slimbot.sendMessage(chatId, '`Tentando enviar a DM associada pro insta associado...`', opts);
      if (!ok) {
        throw Error(result);
      }

      await replyDirectMessage(ig, { userId: targetUserId }, msgReply);
      return slimbot.editMessageText(chatId, botMsg.message_id, `*DM enviada pra https://instagram.com/${targetUsername}*`, opts);
    } catch (err) {
      console.error(err);
      return slimbot.sendMessage(chatId, `erro: \`${err.message}\``, opts);
    }
  };

  slimbot.on('message', botReceiveMessage);

  return slimbot.startPolling();
})();

