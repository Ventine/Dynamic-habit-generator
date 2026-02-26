# Usamos una imagen muy ligera de Nginx basada en Alpine Linux
FROM nginx:alpine

# Etiqueta opcional para identificar al autor
LABEL maintainer="Master Developer"

# Copiamos todos los archivos de tu proyecto a la carpeta pública de Nginx
COPY . /usr/share/nginx/html

# Exponemos el puerto 80, que es el estándar para tráfico web
EXPOSE 80

# Arrancamos el servidor Nginx
CMD ["nginx", "-g", "daemon off;"]