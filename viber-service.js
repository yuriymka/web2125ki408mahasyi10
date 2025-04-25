const ViberBot = require('viber-bot').Bot;
const { Events, Message } = require('viber-bot');

class ViberService {
    constructor() {
        this.enabled = false;
        this.bot = null;
        this.verificationCodes = new Map();

        const authToken = process.env.VIBER_AUTH_TOKEN;
        
        if (!authToken) {
            console.warn('VIBER_AUTH_TOKEN is not set. Viber service will run in mock mode.');
            return;
        }

        try {
            this.bot = new ViberBot({
                authToken: authToken,
                name: "Business Card Auth",
                avatar: "https://raw.githubusercontent.com/devrelv/drop/master/151-icon.png"
            });

            this.enabled = true;
            console.log('Viber bot initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Viber bot:', error);
        }
    }

    isEnabled() {
        return this.enabled;
    }

    async sendVerificationCode(phoneNumber) {
        if (!this.enabled) {
            console.log('Viber service is disabled. Returning mock success.');
            return true;
        }

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

    verifyCode(phoneNumber, code) {
        if (!this.enabled) {
            console.log('Viber service is disabled. Returning mock success.');
            return true;
        }

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

    generateVerificationCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    getBot() {
        return this.bot;
    }
}

module.exports = new ViberService(); 