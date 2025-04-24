const ViberBot = require('viber-bot').Bot;
const { Message } = require('viber-bot');

class ViberService {
    constructor() {
        this.bot = new ViberBot({
            authToken: process.env.VIBER_AUTH_TOKEN,
            name: "Business Card Auth",
            avatar: "https://raw.githubusercontent.com/devrelv/drop/master/151-icon.png"
        });

        this.verificationCodes = new Map();

        // Set up bot event handlers
        this.bot.on(ViberBot.Events.SUBSCRIBED, response => {
            response.send(new Message.Text(
                `Welcome to Business Card Auth! Your Viber ID is: ${response.userProfile.id}`
            ));
        });

        this.bot.on(ViberBot.Events.MESSAGE_RECEIVED, (message, response) => {
            response.send(new Message.Text(
                "I'm a verification bot. You'll receive verification codes when you try to log in."
            ));
        });
    }

    getBot() {
        return this.bot;
    }

    generateVerificationCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async sendVerificationCode(phoneNumber) {
        try {
            const code = this.generateVerificationCode();
            
            // Store the code with expiration
            this.verificationCodes.set(phoneNumber, {
                code,
                timestamp: Date.now()
            });

            // Send message via Viber
            await this.bot.sendMessage(
                { id: phoneNumber },
                new Message.Text(`Your verification code is: ${code}\nThis code will expire in 5 minutes.`)
            );

            // Delete code after 5 minutes
            setTimeout(() => {
                this.verificationCodes.delete(phoneNumber);
            }, 5 * 60 * 1000);

            return true;
        } catch (error) {
            console.error('Error sending Viber message:', error);
            return false;
        }
    }

    verifyCode(phoneNumber, code) {
        const stored = this.verificationCodes.get(phoneNumber);
        if (!stored) return false;

        // Check if code is expired (5 minutes)
        if (Date.now() - stored.timestamp > 5 * 60 * 1000) {
            this.verificationCodes.delete(phoneNumber);
            return false;
        }

        if (stored.code === code) {
            this.verificationCodes.delete(phoneNumber);
            return true;
        }

        return false;
    }
}

module.exports = new ViberService(); 