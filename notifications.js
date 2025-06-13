

// notifications.js
const { sendWhatsApp } = require('./twilioClient');


async function enviarNotificaciones(id_producto, pool) {
  const [pendientes] = await pool.query(
    `SELECT n.id_notificacion, c.telefono
     FROM notificaciones n
     JOIN cliente c ON n.id_cliente = c.id_cliente
     WHERE n.id_producto = ? AND n.enviado = FALSE`,
    [id_producto]
  );

  for (const row of pendientes) {
    try {
      await sendWhatsApp(
        row.telefono,
        `¡Buenas noticias! El producto #${id_producto} ya está nuevamente en stock. Visítanos para comprarlo.`
      );
      await pool.query(
        `UPDATE notificaciones SET enviado = TRUE WHERE id_notificacion = ?`,
        [row.id_notificacion]
      );
    } catch (err) {
      console.error(`Error notificando a ${row.telefono}:`, err);
    }
  }
}

module.exports = { enviarNotificaciones };
