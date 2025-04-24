const ViberBot = require('viber-bot').Bot;
const BotEvents = require('viber-bot').Events;
const TextMessage = require('viber-bot').Message.Text;

const bot = new ViberBot({
    authToken: process.env.VIBER_AUTH_TOKEN,
    name: "Business Card Auth",
    avatar: "https://raw.githubusercontent.com/devrelv/drop/master/151-icon.png"
});

// Store verification codes temporarily
const verificationCodes = new Map();

const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendVerificationCode = async (viberUserId, code) => {
    try {
        await bot.sendMessage({ id: viberUserId }, new TextMessage(
            `Your verification code is: ${code}\nThis code will expire in 5 minutes.`
        ));
        return true;
    } catch (error) {
        console.error('Error sending Viber message:', error);
        return false;
    }
};

const storeVerificationCode = (userId, code) => {
    verificationCodes.set(userId, {
        code,
        timestamp: Date.now()
    });

    // Delete code after 5 minutes
    setTimeout(() => {
        verificationCodes.delete(userId);
    }, 5 * 60 * 1000);
};

const verifyCode = (userId, code) => {
    const stored = verificationCodes.get(userId);
    if (!stored) return false;

    // Check if code is expired (5 minutes)
    if (Date.now() - stored.timestamp > 5 * 60 * 1000) {
        verificationCodes.delete(userId);
        return false;
    }

    if (stored.code === code) {
        verificationCodes.delete(userId);
        return true;
    }

    return false;
};

// Bot event handlers
bot.on(BotEvents.SUBSCRIBED, response => {
    response.send(new TextMessage(
        `Welcome to Business Card Auth! Your Viber ID is: ${response.userProfile.id}`
    ));
});

bot.on(BotEvents.MESSAGE_RECEIVED, (message, response) => {
    response.send(new TextMessage(
        "I'm a verification bot. You'll receive verification codes when you try to log in."
    ));
});

module.exports = {
    bot,
    generateVerificationCode,
    sendVerificationCode,
    storeVerificationCode,
    verifyCode
}; 