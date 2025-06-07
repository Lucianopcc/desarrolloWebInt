const url = 'http://localhost:3000/api/producto/';
const contenedor = document.querySelector('tbody');
let resultados = '';

const modalProducto = new bootstrap.Modal(document.getElementById('modalProducto'));
const formProducto = document.querySelector('form');

const nombre = document.getElementById('nombre');
const descripcion = document.getElementById('descripcion');
const precio = document.getElementById('precio');
const stock = document.getElementById('stock');
const id_proveedor = document.getElementById('id_proveedor');
const imagen = document.getElementById('imagen');
const btnCrear = document.getElementById('btnCrear');

let opcion = '';
let idForm = 0;

// Cargar todos los productos
const cargarProductos = () => {
  fetch(url)
    .then(response => response.json())
    .then(data => mostrar(data))
    .catch(error => console.log(error));
};

// Mostrar productos en tabla
const mostrar = (productos) => {
  resultados = '';
  productos.forEach(producto => {
    resultados += `<tr>
      <td>${producto.id_producto}</td>
      <td>${producto.nombre}</td>
      <td>${producto.descripcion}</td>
      <td>${producto.precio}</td>
      <td>${producto.stock}</td>
      <td>${producto.id_proveedor}</td>
      <td><img src="${producto.imagen}" width="50" height="50"></td>
      <td class="text-center">
        <a class="btnEditar btn btn-primary">Editar</a>
        <a class="btnBorrar btn btn-danger">Borrar</a>
      </td>
    </tr>`;
  });
  contenedor.innerHTML = resultados;
};

// Evento para abrir modal de crear
btnCrear.addEventListener('click', () => {
  console.log('Botón "Agregar producto" clickeado');
  formProducto.reset(); // Limpia todos los campos del formulario
  opcion = 'crear';
  modalProducto.show();
});

// Delegación de eventos
const on = (element, event, selector, handler) => {
  element.addEventListener(event, e => {
    if (e.target.closest(selector)) {
      handler(e);
    }
  });
};

// Eliminar producto
on(document, 'click', '.btnBorrar', e => {
  const fila = e.target.parentNode.parentNode;
  const id = fila.children[0].textContent;

  alertify.confirm("¿Quieres eliminar este producto?",
    function () {
      fetch(url + id, { method: 'DELETE' })
        .then(() => {
          cargarProductos();
          alertify.success('Producto eliminado');
        });
    },
    function () {
      alertify.error('Cancelado');
    }
  );
});

// Editar producto
on(document, 'click', '.btnEditar', e => {
  const fila = e.target.parentNode.parentNode;
  idForm = fila.children[0].textContent;

  nombre.value = fila.children[1].textContent;
  descripcion.value = fila.children[2].textContent;
  precio.value = fila.children[3].textContent;
  stock.value = fila.children[4].textContent;
  id_proveedor.value = fila.children[5].textContent;

  // NOTA: no se puede rellenar un input type="file" con JavaScript.
  // El usuario tendrá que subir otra imagen si quiere reemplazarla.

  opcion = 'editar';
  modalProducto.show();
});

// Crear o editar producto usando FormData
formProducto.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(formProducto);

  try {
    if (opcion === 'crear') {
      const res = await fetch(url, {
        method: 'POST',
        body: formData
      });
      await res.json();
      alertify.success('Producto creado');
    }

    if (opcion === 'editar') {
      const res = await fetch(url + idForm, {
        method: 'POST',
        body: formData
      });
      await res.json();
      alertify.success('Producto actualizado');
    }

    cargarProductos();
    modalProducto.hide();
  } catch (err) {
    console.error(err);
    alertify.error('Error al guardar producto');
  }
});

// Cargar productos al iniciar
cargarProductos();
