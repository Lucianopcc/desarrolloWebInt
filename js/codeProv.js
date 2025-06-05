const url = 'http://localhost:3000/api/proveedor/';
const contenedor = document.querySelector('#tablaProveedores tbody');
let resultados = '';

const modalProveedor = new bootstrap.Modal(document.getElementById('modalProveedor'));
const formProveedor = document.querySelector('#formProveedor');

const nombre = document.getElementById('nombre');
const ruc = document.getElementById('ruc');
const telefono = document.getElementById('telefono');
const email = document.getElementById('email');
const btnCrear = document.getElementById('btnCrear');

let opcion = '';
let idForm = 0;

// Cargar todos los proveedores
const cargarProveedores = () => {
  fetch(url)
    .then(response => response.json())
    .then(data => mostrar(data))
    .catch(error => console.log(error));
};

// Mostrar proveedores en tabla
const mostrar = (proveedores) => {
  resultados = '';
  proveedores.forEach(proveedor => {
    resultados += `<tr>
      <td>${proveedor.id_proveedor}</td>
      <td>${proveedor.nombre}</td>
      <td>${proveedor.ruc}</td>
      <td>${proveedor.telefono}</td>
      <td>${proveedor.email}</td>
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
  formProveedor.reset(); // Limpiar campos
  opcion = 'crear';
  modalProveedor.show();
});

// Delegación de eventos
const on = (element, event, selector, handler) => {
  element.addEventListener(event, e => {
    if (e.target.closest(selector)) {
      handler(e);
    }
  });
};

// Eliminar proveedor
on(document, 'click', '.btnBorrar', e => {
  const fila = e.target.closest('tr');
  const id = fila.children[0].textContent;

  alertify.confirm("¿Quieres eliminar este proveedor?",
    function () {
      fetch(url + id, { method: 'DELETE' })
        .then(() => {
          cargarProveedores();
          alertify.success('Proveedor eliminado');
        });
    },
    function () {
      alertify.error('Cancelado');
    }
  );
});

// Editar proveedor
on(document, 'click', '.btnEditar', e => {
  const fila = e.target.closest('tr');
  idForm = fila.children[0].textContent;

  nombre.value = fila.children[1].textContent;
  ruc.value = fila.children[2].textContent;
  telefono.value = fila.children[3].textContent;
  email.value = fila.children[4].textContent;

  opcion = 'editar';
  modalProveedor.show();
});

// Crear o editar proveedor
formProveedor.addEventListener('submit', async (e) => {
  e.preventDefault();

  const datos = {
    nombre: nombre.value,
    ruc: ruc.value,
    telefono: telefono.value,
    email: email.value
  };

  try {
    if (opcion === 'crear') {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      });
      await res.json();
      alertify.success('Proveedor creado');
    }

    if (opcion === 'editar') {
      const res = await fetch(url + idForm, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      });
      await res.json();
      alertify.success('Proveedor actualizado');
    }

    cargarProveedores();
    modalProveedor.hide();
  } catch (err) {
    console.error(err);
    alertify.error('Error al guardar proveedor');
  }
});

// Cargar proveedores al iniciar
cargarProveedores();
