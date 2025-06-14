// bot.js
const venom = require('venom-bot');

let clientBot = null;

venom.create({
  session: 'martinBot', // Nombre de sesión
  headless: 'new',

  browserPathExecutable: 'C:\\Users\\LUCIANO PC\\chrome-headless-shell\\win64-137.0.7151.70\\chrome-headless-shell-win64\\chrome-headless-shell.exe'
})
.then(client => {
  console.log('✅ Bot de WhatsApp iniciado');
  clientBot = client;
})
.catch(err => {
  console.error('❌ Error al iniciar Venom-Bot', err);
});

function enviarMensajeWhatsApp(numero, mensaje) {
  if (!clientBot) {
    console.error('Bot aún no está listo');
    return;
  }

  const numeroFormateado = `51${numero}@c.us`; // 51 = Perú
  clientBot
    .sendText(numeroFormateado, mensaje)
    .then(() => {
      console.log('✅ Mensaje enviado a', numero);
    })
    .catch((err) => {
      console.error('❌ Error al enviar mensaje', err);
    });
}

module.exports = { enviarMensajeWhatsApp };
