const ViberBot = require('viber-bot').Bot;
const { Events, Message } = require('viber-bot');

class ViberService {
    constructor() {
        const authToken = process.env.VIBER_AUTH_TOKEN;
        
        if (!authToken) {
            console.error('VIBER_AUTH_TOKEN is not set in environment variables');
            throw new Error('Viber authentication token is required');
        }

        try {
            this.bot = new ViberBot({
                authToken: authToken,
                name: "Business Card Auth",
                avatar: "https://raw.githubusercontent.com/devrelv/drop/master/151-icon.png"
            });

            // Initialize verification codes storage
            this.verificationCodes = new Map();

            // Set up basic event handlers
            this.bot.on(Events.SUBSCRIBED, this.handleSubscribed.bind(this));
            this.bot.on(Events.MESSAGE_RECEIVED, this.handleMessage.bind(this));
            this.bot.on(Events.ERROR, this.handleError.bind(this));

            console.log('Viber bot initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Viber bot:', error);
            throw error;
        }
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
        if (!this.bot) {
            console.error('Viber bot not initialized');
            return false;
        }

        try {
            console.log(`Attempting to send verification code to ${phoneNumber}`);
            const code = this.generateVerificationCode();
            
            this.verificationCodes.set(phoneNumber, {
                code,
                timestamp: Date.now()
            });

            await this.bot.sendMessage(
                { id: phoneNumber },
                new Message.Text(`Your verification code is: ${code}\nValid for 5 minutes.`)
            );

            console.log(`Verification code sent successfully to ${phoneNumber}`);

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
        if (!stored) {
            console.log(`No verification code found for ${phoneNumber}`);
            return false;
        }

        if (Date.now() - stored.timestamp > 5 * 60 * 1000) {
            console.log(`Verification code expired for ${phoneNumber}`);
            this.verificationCodes.delete(phoneNumber);
            return false;
        }

        const isValid = stored.code === code;
        if (isValid) {
            console.log(`Valid verification code for ${phoneNumber}`);
            this.verificationCodes.delete(phoneNumber);
        } else {
            console.log(`Invalid verification code for ${phoneNumber}`);
        }
        return isValid;
    }

    getBot() {
        return this.bot;
    }
}

// Create and export a single instance
let viberService = null;
try {
    viberService = new ViberService();
} catch (error) {
    console.error('Failed to create ViberService:', error);
    // Create a mock service for development/testing
    if (process.env.NODE_ENV !== 'production') {
        console.log('Creating mock Viber service for development');
        viberService = {
            sendVerificationCode: async () => true,
            verifyCode: () => true,
            getBot: () => null
        };
    }
}

module.exports = viberService; 