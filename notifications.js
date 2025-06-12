//notificacion

// notifications.js


/*
const pool = require('./dbPool');
const twilioClient = require('./twilioClient');

async function enviarNotificaciones(producto_id) {
  try {
    const [notificaciones] = await pool.query(
      `SELECT n.id, c.telefono, p.nombre
       FROM notificaciones n
       JOIN cliente c ON n.cliente_id = c.id_cliente
       JOIN producto p ON n.producto_id = p.id_producto
       WHERE n.enviado = FALSE AND n.producto_id = ?`,
      [producto_id]
    );

    for (let noti of notificaciones) {
      const mensaje = `¡Hola! El producto "${noti.nombre}" ya está disponible en stock. ¡Puedes comprarlo ahora!`;

      await twilioClient.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM,
        to:   `whatsapp:${noti.telefono}`,
        body: mensaje
      });

      await pool.query(
        'UPDATE notificaciones SET enviado = TRUE WHERE id = ?',
        [noti.id]
      );
    }

    console.log(`Se enviaron ${notificaciones.length} notificaciones.`);
  } catch (err) {
    console.error('Error enviando notificaciones:', err);
  }
}

module.exports = { enviarNotificaciones };

*/