FROM php:8.4-apache

# Instala a extensão para conectar PHP ao MySQL
RUN docker-php-ext-install pdo_mysql
RUN printf 'upload_max_filesize=5M\npost_max_size=6M\n' > /usr/local/etc/php/conf.d/uploads.ini
RUN mkdir -p /var/www/assets/style /var/www/assets/js /var/www/assets/img \
    && chown -R www-data:www-data /var/www/assets

ENV SERVER_ICONS_DIR=/var/www/assets/img

COPY apache-assets.conf /etc/apache2/conf-available/assets.conf

# Habilita o mod_rewrite do Apache
RUN a2enmod rewrite proxy proxy_http proxy_wstunnel && a2enconf assets

# Define a pasta onde ficarão os arquivos PHP
WORKDIR /var/www/html

# Permite que o Apache utilize arquivos .htaccess
RUN sed -i '/<Directory \/var\/www\/>/,/<\/Directory>/ s/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf