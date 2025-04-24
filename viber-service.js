const ViberBot = require('viber-bot').Bot;
const { Events, Message } = require('viber-bot');

class ViberService {
    constructor() {
        this.bot = new ViberBot({
            authToken: process.env.VIBER_AUTH_TOKEN,
            name: "Business Card Auth",
            avatar: "https://raw.githubusercontent.com/devrelv/drop/master/151-icon.png"
        });

        // Initialize verification codes storage
        this.verificationCodes = new Map();

        // Set up basic event handlers
        this.bot.on(Events.SUBSCRIBED, this.handleSubscribed.bind(this));
        this.bot.on(Events.MESSAGE_RECEIVED, this.handleMessage.bind(this));
        this.bot.on(Events.ERROR, this.handleError.bind(this));
    }

    handleSubscribed(response) {
        try {
            response.send(new Message.Text(
                'Welcome! You can now receive verification codes for login.'
            ));
        } catch (error) {
            console.error('Error in handleSubscribed:', error);
        }
    }

    handleMessage(message, response) {
        try {
            response.send(new Message.Text(
                'This is an authentication bot. You will receive verification codes when logging in.'
            ));
        } catch (error) {
            console.error('Error in handleMessage:', error);
        }
    }

    handleError(error) {
        console.error('Viber Bot Error:', error);
    }

    async sendVerificationCode(phoneNumber) {
        try {
            const code = this.generateVerificationCode();
            
            this.verificationCodes.set(phoneNumber, {
                code,
                timestamp: Date.now()
            });

            await this.bot.sendMessage(
                { id: phoneNumber },
                new Message.Text(`Your verification code is: ${code}\nValid for 5 minutes.`)
            );

            setTimeout(() => {
                this.verificationCodes.delete(phoneNumber);
            }, 5 * 60 * 1000);

            return true;
        } catch (error) {
            console.error('Error sending verification code:', error);
            return false;
        }
    }

    generateVerificationCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    verifyCode(phoneNumber, code) {
        const stored = this.verificationCodes.get(phoneNumber);
        if (!stored) return false;

        if (Date.now() - stored.timestamp > 5 * 60 * 1000) {
            this.verificationCodes.delete(phoneNumber);
            return false;
        }

        const isValid = stored.code === code;
        if (isValid) {
            this.verificationCodes.delete(phoneNumber);
        }
        return isValid;
    }

    getBot() {
        return this.bot;
    }
}

// Create and export a single instance
const viberService = new ViberService();
module.exports = viberService; 