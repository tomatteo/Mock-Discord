FROM php:8.4-apache

# Instala a extensão para conectar PHP ao MySQL
RUN docker-php-ext-install pdo_mysql
RUN mkdir -p /var/www/html/img && chown www-data:www-data /var/www/html/img

# Habilita o mod_rewrite do Apache
RUN a2enmod rewrite

# Define a pasta onde ficarão os arquivos PHP
WORKDIR /var/www/html

# Permite que o Apache utilize arquivos .htaccess
RUN sed -i '/<Directory \/var\/www\/>/,/<\/Directory>/ s/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf