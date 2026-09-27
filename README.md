# Marketa Backend — Pagos en cripto (USDT)

Backend que activa suscripciones automáticamente cuando el usuario paga en USDT, usando NOWPayments para verificar la transacción en la blockchain por ti.

## Pasos para ponerlo a funcionar

### 1. Crea tu cuenta en NOWPayments
Ve a https://nowpayments.io, crea una cuenta gratis, y en el panel copia tu API Key, configura tu wallet de pago, y define un IPN Secret (una clave que tú inventas).

### 2. Instala dependencias
cd marketa-backend
npm install

### 3. Configura las variables de entorno
cp .env.example .env
Edita .env y pon tu API key real y tu IPN secret.

### 4. Despliega en Render.com
Conecta tu repo de GitHub, elige "Web Service", y listo. Una vez desplegado, actualiza PUBLIC_URL con tu URL real.

## Sobre retirar el dinero a Cuba
NOWPayments te permite dejar
