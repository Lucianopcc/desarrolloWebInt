const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const body = require('body-parser');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const session = require('express-session');
const puppeteer = require('puppeteer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { enviarNotificaciones } = require('./notifications');
const ejs = require('ejs'); // <-- ESTA LÍNEA ES OBLIGATORIA si usas ejs.renderFile



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
    req.session.user = { id_cliente: 0, nombre: 'Administrador', rol: 'admin', telefono: '51987654321' }; // <-- Añade el teléfono si aplica
    return res.json({ status: 'ok', nombre: 'Administrador', rol: 'admin' });
}

  const sql = 'SELECT id_cliente, nombre, contraseña, telefono FROM Cliente WHERE email = ?'; // <-- ¡Añade 'telefono' a la selección!
try {
    const [results] = await pool.query(sql, [email]);

    if (results.length > 0) {
        const match = await bcrypt.compare(password, results[0].contraseña);
        if (match) {
            req.session.user = {
                id_cliente: results[0].id_cliente,
                nombre: results[0].nombre,
                rol: 'cliente',
                telefono: results[0].telefono // <-- ¡Añade el teléfono aquí!
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
//los mas vendidos
app.get('/', async (req, res) => {
  try {
    const [masVendidos] = await pool.query(`
      SELECT p.id_producto, p.nombre, p.imagen, p.precio, p.stock, SUM(dp.cantidad) AS total_vendidos
      FROM detallepedido dp
      JOIN producto p ON dp.id_producto = p.id_producto
      GROUP BY p.id_producto
      ORDER BY total_vendidos DESC
      LIMIT 4;
    `);

    res.render('index', {
      productos: masVendidos
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar los productos más vendidos');
  }
});

app.get('/producto/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const [resultados] = await pool.query('SELECT * FROM producto WHERE id_producto = ?', [id]);
    if (resultados.length === 0) return res.status(404).send('no encontrado');

    const producto = resultados[0];

    // --- INICIO: Código NUEVO para manejar el objeto 'cliente' ---
    let cliente = null; // Inicializamos cliente como null

    // IMPORTANTE: Necesitas decidir cómo obtener los datos del cliente.
    // La forma más común es si el usuario ha iniciado sesión.
    // Si usas un sistema de autenticación basado en sesiones (como Passport.js),
    // los datos del usuario suelen estar disponibles en `req.user` después de un inicio de sesión exitoso.
    // Adapta esta parte según cómo esté configurada tu autenticación.

    // Ejemplo si tienes un usuario autenticado a través de Passport.js o similar,
    // y asumiendo que `req.user` contiene `id_cliente` y `telefono`.
    if (req.isAuthenticated && req.isAuthenticated()) { // O una verificación personalizada como `req.session.userId`
      // Aquí, idealmente, deberías obtener los datos completos del cliente de tu base de datos
      // usando el ID del usuario logueado (por ejemplo, `req.user.id`).
      // Por simplicidad, asumiremos que `req.user` ya tiene `id_cliente` y `telefono`.
      cliente = {
        id_cliente: req.user.id_cliente, // Asegúrate de que req.user tenga esta propiedad
        telefono: req.user.telefono      // Asegúrate de que req.user tenga esta propiedad
      };
    } else {
      // Si ningún usuario ha iniciado sesión, o sus datos no están directamente disponibles,
      // proporciona un objeto cliente por defecto/vacío para evitar errores de EJS.
      // Ten en cuenta que el formulario de notificación podría no funcionar correctamente
      // si `id_cliente` es nulo.
      cliente = {
        id_cliente: null,
        telefono: 'No registrado (requiere iniciar sesión)' // Mensaje para el usuario
      };
      // También podrías considerar redirigir a los usuarios no autenticados a una página de inicio de sesión
      // si las notificaciones solo son para usuarios logueados:
      // return res.redirect('/login');
    }
    // --- FIN: Código NUEVO para manejar el objeto 'cliente' ---

    // Pasa tanto 'producto' como 'cliente' a la plantilla EJS
    res.render('producto', { producto: producto, cliente: cliente });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error en la base de datos');
  }
});


// LUMINARIA (id_categoria = 1)
app.get('/luminarias', async (req, res) => {
  try {
    const [productos] = await pool.query(
      'SELECT * FROM producto WHERE id_categoria = 1 AND estado = 1'
    );
    res.render('luminarias', { productos });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar Luminaria');
  }
});

// PISOS (id_categoria = 2)
app.get('/pisos', async (req, res) => {
  try {
    const [productos] = await pool.query(
      'SELECT * FROM producto WHERE id_categoria = 2 AND estado = 1'
    );
    res.render('pisos', { productos });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar Pisos');
  }
});

// TECHOS (id_categoria = 3)
app.get('/techos', async (req, res) => {
  try {
    const [productos] = await pool.query(
      'SELECT * FROM producto WHERE id_categoria = 3 AND estado = 1'
    );
    res.render('techos', { productos });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar Techos');
  }
});

// FERRETERÍA (id_categoria = 4)
app.get('/ferreteria', async (req, res) => {
  try {
    const [productos] = await pool.query(
      'SELECT * FROM producto WHERE id_categoria = 4 AND estado = 1'
    );
    res.render('ferreteria', { productos });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar Ferretería');
  }
});



/* ========= API CRUD PRODUCTOS ========= */

// Obtener todos los productos
app.get('/api/producto', async (req, res) => {
  try {
    const [result] = await pool.query(`
  SELECT 
  p.id_producto,
  p.nombre,
  p.descripcion,
  p.precio,
  p.stock,
  p.id_categoria,  -- <-- AÑADE ESTA LÍNEA
  c.nombre AS nombre_categoria,
  p.id_proveedor,
  p.imagen
FROM producto p
JOIN categoria c ON p.id_categoria = c.id_categoria
WHERE p.estado = 1

`);

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
  const { nombre, descripcion, precio, stock, id_proveedor, id_categoria } = req.body;

  try {
    const imagenUrl = req.file?.path || '';
    const sql = 'INSERT INTO producto (nombre, descripcion, precio, stock, imagen, id_proveedor, id_categoria) VALUES (?, ?, ?, ?, ?, ?, ?)';

    const [result] = await pool.query(sql, [
      nombre, descripcion, parseFloat(precio), parseInt(stock), imagenUrl, parseInt(id_proveedor), parseInt(id_categoria)

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
  const { nombre, descripcion, precio, stock, id_proveedor, id_categoria, imagen_actual } = req.body;
  const imagen = req.file ? req.file.path : imagen_actual;

  try {
    // 1. Leer stock actual
    const [rows] = await pool.query(
      'SELECT stock FROM producto WHERE id_producto = ?',
      [id]
    );
    const oldStock = rows.length ? rows[0].stock : 0;
    const newStock = parseInt(stock, 10);

    // 2. Actualizar producto
    await pool.query(
      `UPDATE producto
       SET nombre = ?, descripcion = ?, precio = ?, stock = ?, imagen = ?, id_proveedor = ?, id_categoria = ?
       WHERE id_producto = ?`,
      [
        nombre,
        descripcion,
        parseFloat(precio),
        newStock,
        imagen,
        parseInt(id_proveedor, 10),
        parseInt(id_categoria, 10),
        id
      ]
    );

    // 3. Disparar notificaciones si subió de 0 a >0
    if (oldStock === 0 && newStock > 0) {
      console.log(`Stock pasó de 0 a ${newStock} para producto ${id}, enviando notificaciones…`);
      await enviarNotificaciones(id);
    }

    res.json({ mensaje: 'Producto actualizado correctamente' });
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

//obtener categoria
app.get('/api/categorias', async (req, res) => {
  try {
    const [categorias] = await pool.query(
      'SELECT id_categoria, nombre AS nombre_categoria FROM categoria'
    );
    res.json(categorias);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener las categorías' });
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
// ——————————————
//  RUTAS DE PAGO PERSISTENTE EN BD
// ——————————————

app.post(
  '/carrito/pagar',
  asegurarCliente, // middleware que valida req.session.user.id_cliente
  async (req, res) => {
    const id_cliente = req.session.user.id_cliente;
    const { metodo_entrega, metodo_pago } = req.body;

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

      // Validar stock
      for (const it of items) {
        if (it.stock < it.cantidad) {
          throw new Error(`Stock insuficiente para "${it.nombre}". Stock disponible: ${it.stock}`);
        }
      }

      // Insertar pedido
      const [pedidoResult] = await conn.query(
        'INSERT INTO Pedido (id_cliente, total) VALUES (?, ?)',
        [id_cliente, total]
      );
      const id_pedido = pedidoResult.insertId;

      // Insertar detalle pedido y actualizar stock
      const detalleSql = `
        INSERT INTO detallepedido 
          (id_pedido, id_producto, cantidad, precio_unitario)
        VALUES (?, ?, ?, ?)
      `;
      for (const it of items) {
        await conn.query(detalleSql, [
          id_pedido,
          it.id_producto,
          it.cantidad,
          it.precio
        ]);

        await conn.query(
          `UPDATE producto SET stock = stock - ? WHERE id_producto = ?`,
          [it.cantidad, it.id_producto]
        );
      }

      // Vaciar carrito
      await conn.query(
        'DELETE FROM detallecarrito WHERE id_carrito = ?',
        [id_carrito]
      );

      await conn.commit();

      // Redirigir a la confirmación del pedido
      return res.redirect(
        `/pedido/${id_pedido}` +
        `?metodo_entrega=${metodo_entrega}` +
        `&metodo_pago=${encodeURIComponent(metodo_pago)}`
      );

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
      // Cabecera del pedido
      const [[pedido]] = await pool.query(
        `SELECT p.id_pedido, p.fecha, p.total, p.metodo_entrega, c.nombre AS cliente
         FROM Pedido p
         JOIN Cliente c ON p.id_cliente = c.id_cliente
         WHERE p.id_pedido = ?`,
        [id_pedido]
      );

      if (!pedido) return res.status(404).send('Pedido no encontrado');

      // Detalles del pedido
      const [detalles] = await pool.query(
        `SELECT dp.cantidad, dp.precio_unitario, pr.nombre
         FROM detallepedido dp
         JOIN producto pr ON dp.id_producto = pr.id_producto
         WHERE dp.id_pedido = ?`,
        [id_pedido]
      );

      // Leer método de entrega y pago desde query params
      const metodo_entrega = req.query.metodo_entrega || '';
      const metodo_pago = req.query.metodo_pago || '';

      // Renderizar la vista
      res.render('confirmacion_pedido', {
        pedido,
        detalles,
        metodo_entrega,
        metodo_pago
      });

    } catch (err) {
      console.error(err);
      res.status(500).send('Error al obtener detalles del pedido');
    }
  }
);

//pdf 

// Generar PDF del pedido
app.get('/pedido/:id/comprobante', async (req, res) => {
  const id_pedido = parseInt(req.params.id, 10);

  try {
    // Obtener datos del pedido
    const [[pedido]] = await pool.query(
      `SELECT p.id_pedido, p.fecha, p.total, p.metodo_entrega, c.nombre AS cliente
       FROM Pedido p
       JOIN Cliente c ON p.id_cliente = c.id_cliente
       WHERE p.id_pedido = ?`,
      [id_pedido]
    );

    if (!pedido) return res.status(404).send('Pedido no encontrado');

    // Obtener detalles del pedido
    const [detalles] = await pool.query(
      `SELECT dp.cantidad, dp.precio_unitario, pr.nombre
       FROM detallepedido dp
       JOIN producto pr ON dp.id_producto = pr.id_producto
       WHERE dp.id_pedido = ?`,
      [id_pedido]
    );

    // Puedes obtener esto de la DB también si quieres
    const metodo_entrega = pedido.metodo_entrega || 'recojo';
    const metodo_pago = req.query.metodo_pago || 'no especificado';

    // Renderizar HTML con EJS
    const html = await ejs.renderFile(path.join(__dirname, 'views', 'confirmacion-pdf.ejs'), {
      pedido,
      metodo_entrega,
      metodo_pago,
      detalles
    });

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({ format: 'A4' });

    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=pedido_${id_pedido}.pdf`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al generar el comprobante en PDF');
  }
});




/* ========= INICIAR SERVIDOR ========= */
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
