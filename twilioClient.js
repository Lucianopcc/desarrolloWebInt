require('dotenv').config();

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_TOKEN;

const client = require('twilio')(accountSid, authToken);

async function sendWhatsApp(to, message) {
  return client.messages.create({
    from: 'whatsapp:+14155238886', // número sandbox de Twilio
    to: 'whatsapp:+51970760971',          // el número que ya hizo "join"
    body: message,
  });
}



module.exports = { sendWhatsApp };
