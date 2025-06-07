const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const body = require('body-parser');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const session = require('express-session');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = 3000;

// Configurar sesiones
app.use(session({
  secret: 'claveSecreta',
  resave: false,
  saveUninitialized: true
}));

// Configurar Cloudinary
cloudinary.config({
  cloud_name: 'dhar5ovav',
  api_key: '256988391459486',
  api_secret: 'vd9fvxPfKvgCBK1wo8VaM-OVlBs'
});

// Configurar multer con Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'productos',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
  }
});
const upload = multer({ storage });

// Configurar EJS
app.set('view engine', 'ejs');
app.set('views', './views');

// Middleware
app.use(express.static('public'));
app.use(body.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'html')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// Configuración MySQL
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'martin1',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Verificación de conexión
pool.getConnection()
  .then(conn => {
    console.log('🔗 Conectado a MySQL');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Error de conexión:', err);
  });

/* ========= REGISTRO ========= */
const bcrypt = require('bcrypt');

app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10); // el 10 es el “coste”

  const sql = 'INSERT INTO Cliente (nombre, email, contraseña) VALUES (?, ?, ?)';
  try {
    await pool.query(sql, [name, email, hashedPassword]);
    res.redirect('/login.html?registro=ok');
  } catch (err) {
    console.error(err);
    res.send('Error: correo duplicado o problema en el registro');
  }
});



/* ========= LOGIN ========= */
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Admin “harcodeado”
  if (email === 'admin@gmail.com' && password === '1234') {
    // Guardamos en sesión
    req.session.user = { id_cliente: 0, nombre: 'Administrador', rol: 'admin' };
    return res.json({ status: 'ok', nombre: 'Administrador', rol: 'admin' });
  }

  const sql = 'SELECT id_cliente, nombre, contraseña FROM Cliente WHERE email = ?';
  try {
    const [results] = await pool.query(sql, [email]);

    if (results.length > 0) {
      const match = await bcrypt.compare(password, results[0].contraseña);
      if (match) {
        req.session.user = {
          id_cliente: results[0].id_cliente,
          nombre: results[0].nombre,
          rol: 'cliente'
        };
        return res.json({ status: 'ok', nombre: results[0].nombre, rol: 'cliente' });
      }
    }
    return res.json({ status: 'fail', message: 'Correo o contraseña incorrectos' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Error del servidor' });
  }
});


/* ========= PÁGINAS ========= */
app.get('/', async (req, res) => {
  try {
    const [productos] = await pool.query('SELECT * FROM producto');
    res.render('index', { productos });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error en la base de datos');
  }
});

app.get('/producto/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const [resultados] = await pool.query('SELECT * FROM producto WHERE id_producto = ?', [id]);
    if (resultados.length === 0) return res.status(404).send('Producto no encontrado');
    res.render('producto', { producto: resultados[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error en la base de datos');
  }
});

/* ========= API CRUD PRODUCTOS ========= */

// Obtener todos los productos
app.get('/api/producto', async (req, res) => {
  try {
    const [result] = await pool.query('SELECT * FROM producto WHERE estado = 1');
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});


// Obtener un producto por ID
app.get('/api/producto/:id', async (req, res) => {
  try {
    const [result] = await pool.query('SELECT * FROM producto WHERE id_producto = ?', [req.params.id]);
    if (result.length === 0) return res.status(404).json({ mensaje: 'Producto no encontrado' });
    res.json(result[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

// Crear producto
app.post('/api/producto', upload.single('imagen'), async (req, res) => {
  const { nombre, descripcion, precio, stock, id_proveedor } = req.body;
  try {
    const imagenUrl = req.file?.path || '';
    const sql = 'INSERT INTO producto (nombre, descripcion, precio, stock, imagen, id_proveedor) VALUES (?, ?, ?, ?, ?, ?)';
    const [result] = await pool.query(sql, [
      nombre, descripcion, parseFloat(precio), parseInt(stock), imagenUrl, parseInt(id_proveedor)
    ]);
    res.json({ mensaje: 'Producto creado', id_producto: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al insertar producto' });
  }
});

// Actualizar producto
app.post('/api/producto/:id', upload.single('imagen'), async (req, res) => {
  const id = req.params.id;
  const { nombre, descripcion, precio, stock, id_proveedor } = req.body;
  const imagen = req.file ? req.file.path : req.body.imagen_actual;


  try {
    const sql = `
      UPDATE producto 
      SET nombre = ?, descripcion = ?, precio = ?, stock = ?, imagen = ?, id_proveedor = ?
      WHERE id_producto = ?
    `;
    const [result] = await pool.query(sql, [
      nombre, descripcion, parseFloat(precio), parseInt(stock), imagen, parseInt(id_proveedor), id
    ]);
    res.json({ mensaje: 'Producto actualizado', result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// Apagar (desactivar) producto en lugar de eliminar
app.delete('/api/producto/:id', async (req, res) => {
  try {
    const sql = 'UPDATE producto SET estado = 0 WHERE id_producto = ?';
    const [result] = await pool.query(sql, [req.params.id]);
    res.json({ mensaje: 'Producto desactivado correctamente', result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al desactivar producto' });
  }
});


/* ========= API CRUD PROVEEDORES ========= */

// Obtener todos
app.get('/api/proveedor', async (req, res) => {
  try {
    const [proveedores] = await pool.query('SELECT * FROM proveedor');
    res.json(proveedores);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener proveedores' });
  }
});

// Obtener uno
app.get('/api/proveedor/:id', async (req, res) => {
  try {
    const [result] = await pool.query('SELECT id_proveedor, nombre, ruc, telefono, email FROM proveedor WHERE id_proveedor = ?', [req.params.id]);
    if (result.length === 0) return res.status(404).json({ mensaje: 'Proveedor no encontrado' });
    res.json(result[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener proveedor' });
  }
});

// Crear proveedor
app.post('/api/proveedor', async (req, res) => {
  const { nombre, ruc, telefono, email } = req.body;
  try {
    const sql = 'INSERT INTO proveedor (nombre, ruc, telefono, email) VALUES (?, ?, ?, ?)';
    const [result] = await pool.query(sql, [nombre, ruc, telefono, email]);
    res.json({ mensaje: 'Proveedor creado', id_proveedor: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear proveedor' });
  }
});

// Actualizar proveedor
app.put('/api/proveedor/:id', async (req, res) => {
  const id = req.params.id;
  const { nombre, ruc, telefono, email } = req.body;
  try {
    const sql = `
      UPDATE proveedor 
      SET nombre = ?, ruc = ?, telefono = ?, email = ?
      WHERE id_proveedor = ?
    `;
    const [result] = await pool.query(sql, [nombre, ruc, telefono, email, id]);
    res.json({ mensaje: 'Proveedor actualizado', result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar proveedor' });
  }
});

// Eliminar proveedor
app.delete('/api/proveedor/:id', async (req, res) => {
  try {
    const sql = 'DELETE FROM proveedor WHERE id_proveedor = ?';
    const [result] = await pool.query(sql, [req.params.id]);
    res.json({ mensaje: 'Proveedor eliminado', result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar proveedor' });
  }
});


// ========== CARRITO DE COMPRAS ==========
// ——————————————
//  CARRITO PERSISTENTE EN BD
// ——————————————

// 1) Middleware para asegurarnos de tener al cliente en sesión
// (ya debe venir de tu login)
function asegurarCliente(req, res, next) {
  if (!req.session.user || !req.session.user.id_cliente) {
    return res.redirect('/login.html');
  }
  next();
}

// 2) Obtener (o crear) carrito activo para el cliente
async function obtenerOCrearCarrito(id_cliente) {
  // Buscamos un carrito existente (podrías filtrar por algún flag "activo")
  const [rows] = await pool.query(
    'SELECT id_carrito FROM carrito WHERE id_cliente = ? ORDER BY fecha DESC LIMIT 1',
    [id_cliente]
  );
  if (rows.length) {
    return rows[0].id_carrito;
  }
  // Si no existe, creamos uno nuevo
  const [insert] = await pool.query(
    'INSERT INTO carrito (id_cliente) VALUES (?)',
    [id_cliente]
  );
  return insert.insertId;
}

// 3) Añadir producto al carrito
app.post(
  '/carrito/agregar',
  asegurarCliente,
  async (req, res) => {
    try {
      const id_cliente = req.session.user.id_cliente;
      const productoId = parseInt(req.body.productoId, 10);
      const cantidad = parseInt(req.body.cantidad, 10) || 1;

      // Validar producto en BD
      const [prodRows] = await pool.query(
        'SELECT precio FROM producto WHERE id_producto = ?',
        [productoId]
      );
      if (!prodRows.length) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      // Obtener o crear carrito
      const id_carrito = await obtenerOCrearCarrito(id_cliente);

      // Revisar si ya existe en Detalle_Carrito
      const [detRows] = await pool.query(
        'SELECT id_detalle_carrito, cantidad FROM detallecarrito WHERE id_carrito = ? AND id_producto = ?',
        [id_carrito, productoId]
      );
      if (detRows.length) {
        // Actualizar cantidad
        await pool.query(
          'UPDATE detallecarrito SET cantidad = cantidad + ? WHERE id_detalle_carrito = ?',
          [cantidad, detRows[0].id_detalle_carrito]
        );
      } else {
        // Insertar nuevo detalle
        await pool.query(
          'INSERT INTO detallecarrito (id_carrito, id_producto, cantidad) VALUES (?, ?, ?)',
          [id_carrito, productoId, cantidad]
        );
      }

      res.json({ mensaje: 'Producto añadido al carrito' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'No se pudo agregar al carrito' });
    }
  }
);

// 4) Mostrar carrito
app.get(
  '/carrito',
  asegurarCliente,
  async (req, res) => {
    try {
      const id_cliente = req.session.user.id_cliente;
      // Obtener carrito activo
      const [cartRows] = await pool.query(
        'SELECT id_carrito FROM Carrito WHERE id_cliente = ? ORDER BY fecha DESC LIMIT 1',
        [id_cliente]
      );
      const id_carrito = cartRows.length ? cartRows[0].id_carrito : null;
      if (!id_carrito) {
        return res.render('carrito', { carrito: [], total: 0 });
      }

      // Unir detalle + producto
      const [items] = await pool.query(
        `SELECT dc.id_detalle_carrito, p.id_producto, p.nombre, p.precio, dc.cantidad
         FROM detallecarrito dc
         JOIN producto p ON dc.id_producto = p.id_producto
         WHERE dc.id_carrito = ?`,
        [id_carrito]
      );

      // Calcular total
      const total = items.reduce((sum, it) => sum + it.precio * it.cantidad, 0);

      res.render('carrito', { carrito: items, total });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error al mostrar carrito');
    }
  }
);

// 5) Eliminar un producto del carrito
app.post(
  '/carrito/eliminar/:id',
  asegurarCliente,
  async (req, res) => {
    try {
      const id_cliente = req.session.user.id_cliente;
      const idProducto = parseInt(req.params.id, 10);

      // Obtener carrito activo
      const [cartRows] = await pool.query(
        'SELECT id_carrito FROM Carrito WHERE id_cliente = ? ORDER BY fecha DESC LIMIT 1',
        [id_cliente]
      );
      if (cartRows.length) {
        await pool.query(
          'DELETE FROM detallecarrito WHERE id_carrito = ? AND id_producto = ?',
          [cartRows[0].id_carrito, idProducto]
        );
      }
      res.redirect('/carrito');
    } catch (err) {
      console.error(err);
      res.status(500).send('Error al eliminar del carrito');
    }
  }
);

// 6) Actualizar cantidad
app.post(
  '/carrito/actualizar/:id',
  asegurarCliente,
  async (req, res) => {
    try {
      const id_cliente = req.session.user.id_cliente;
      const idProducto = parseInt(req.params.id, 10);
      const nuevaCant = parseInt(req.body.cantidad, 10);

      const [cartRows] = await pool.query(
        'SELECT id_carrito FROM Carrito WHERE id_cliente = ? ORDER BY fecha DESC LIMIT 1',
        [id_cliente]
      );
      if (cartRows.length) {
        if (nuevaCant > 0) {
          await pool.query(
            'UPDATE detallecarrito SET cantidad = ? WHERE id_carrito = ? AND id_producto = ?',
            [nuevaCant, cartRows[0].id_carrito, idProducto]
          );
        } else {
          // Si llegan 0, lo borramos
          await pool.query(
            'DELETE FROM detallecarrito WHERE id_carrito = ? AND id_producto = ?',
            [cartRows[0].id_carrito, idProducto]
          );
        }
      }
      res.redirect('/carrito');
    } catch (err) {
      console.error(err);
      res.status(500).send('Error al actualizar carrito');
    }
  }
);



// ——————————————
//  RUTAS DE PAGO PERSISTENTE EN BD
// ——————————————

// 1) Procesar el pago leyendo el carrito desde la BD
app.post(
  '/carrito/pagar',
  asegurarCliente, // middleware que valida req.session.user.id_cliente
  async (req, res) => {
    const id_cliente = req.session.user.id_cliente;

    // Obtener el carrito activo
    const [cartRows] = await pool.query(
      'SELECT id_carrito FROM carrito WHERE id_cliente = ? ORDER BY fecha DESC LIMIT 1',
      [id_cliente]
    );
    if (!cartRows.length) {
      return res.status(400).send('El carrito está vacío');
    }
    const id_carrito = cartRows[0].id_carrito;

    // Leer productos del carrito
    const [items] = await pool.query(
      `SELECT p.id_producto, p.nombre, p.precio, dc.cantidad, p.stock
       FROM detallecarrito dc
       JOIN producto p ON dc.id_producto = p.id_producto
       WHERE dc.id_carrito = ?`,
      [id_carrito]
    );
    if (!items.length) {
      return res.status(400).send('El carrito está vacío');
    }

    // Calcular total
    const total = items
      .reduce((sum, it) => sum + it.precio * it.cantidad, 0)
      .toFixed(2);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 🔍 Validar stock antes de insertar pedido
      for (const it of items) {
        if (it.stock < it.cantidad) {
          throw new Error(`Stock insuficiente para "${it.nombre}". Stock disponible: ${it.stock}`);
        }
      }

      // 1) Insertar en Pedido
      const [pedidoResult] = await conn.query(
        'INSERT INTO Pedido (id_cliente, total) VALUES (?, ?)',
        [id_cliente, total]
      );
      const id_pedido = pedidoResult.insertId;

      // 2) Insertar en Detalle_Pedido y actualizar stock
      const detalleSql = `
        INSERT INTO detallepedido 
          (id_pedido, id_producto, cantidad, precio_unitario)
        VALUES (?, ?, ?, ?)
      `;
      for (const it of items) {
        // Insertar detalle del pedido
        await conn.query(detalleSql, [
          id_pedido,
          it.id_producto,
          it.cantidad,
          it.precio
        ]);

        // Actualizar stock del producto
        await conn.query(
          `UPDATE producto SET stock = stock - ? WHERE id_producto = ?`,
          [it.cantidad, it.id_producto]
        );
      }

      // 3) Vaciar el carrito en la base de datos
      await conn.query(
        'DELETE FROM detallecarrito WHERE id_carrito = ?',
        [id_carrito]
      );

      await conn.commit();

      // Redirigir a confirmación
      res.redirect(`/pedido/${id_pedido}`);
    } catch (err) {
      await conn.rollback();
      console.error(err);
      res.status(500).send('Error al procesar el pago: ' + err.message);
    } finally {
      conn.release();
    }
  }
);


// Página de confirmación de pedido
app.get(
  '/pedido/:id',
  asegurarCliente,
  async (req, res) => {
    const id_pedido = parseInt(req.params.id, 10);
    try {
      // Cabecera
      const [[pedido]] = await pool.query(
        `SELECT p.id_pedido, p.fecha, p.total, c.nombre AS cliente
         FROM Pedido p
         JOIN Cliente c ON p.id_cliente = c.id_cliente
         WHERE p.id_pedido = ?`,
        [id_pedido]
      );
      if (!pedido) return res.status(404).send('Pedido no encontrado');

      // Detalle
      const [detalles] = await pool.query(
        `SELECT dp.id_producto, pr.nombre, dp.cantidad, dp.precio_unitario
         FROM detallepedido dp
         JOIN producto pr ON dp.id_producto = pr.id_producto
         WHERE dp.id_pedido = ?`,
        [id_pedido]
      );

      res.render('confirmacion_pedido', { pedido, detalles });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error al cargar confirmación');
    }
  }
);


/* ========= INICIAR SERVIDOR ========= */
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
