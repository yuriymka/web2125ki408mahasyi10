FROM node:16

# Install PHP and required extensions
RUN apt-get update && apt-get install -y \
    php-cli \
    php-fpm \
    php-json \
    php-common \
    php-mysql \
    php-zip \
    php-gd \
    php-mbstring \
    php-curl \
    php-xml \
    php-bcmath \
    composer \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node.js dependencies
COPY package*.json ./
RUN npm install

# Install PHP dependencies
COPY composer.json composer.lock ./
RUN composer install

# Copy application files
COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"] 