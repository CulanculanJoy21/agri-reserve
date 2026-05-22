# Step 1: Use a Node image to compile the Vite assets
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Step 2: Use an official Composer image to handle PHP dependencies safely
FROM composer:2 AS vendor-builder
WORKDIR /app
COPY composer*.json ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --ignore-platform-reqs

# Copy the rest of the application files and optimize autoloading
COPY . .
RUN composer install --no-dev --optimize-autoloader --ignore-platform-reqs

# Step 3: Build the final production runtime container
FROM php:8.3-apache
RUN docker-php-ext-install pdo pdo_mysql

# Enable Apache mod_rewrite for Laravel routing
RUN a2enmod rewrite
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf

WORKDIR /var/www/html

# Copy core files
COPY . .

# Inject the completed vendor folder from Step 2 and the Vite assets from Step 1
COPY --from=vendor-builder /app/vendor ./vendor
COPY --from=frontend-builder /app/public/build ./public/build

# Ensure proper Laravel storage & cache ownership
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

EXPOSE 80

# Run migrations automatically on startup before booting Apache
CMD php artisan migrate --force && apache2-foreground