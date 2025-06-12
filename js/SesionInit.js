
  document.addEventListener('DOMContentLoaded', () => {
    // ====== Código de menú de usuario simplificado (solo nombre) ======
    const nombre = localStorage.getItem('nombreUsuario');
    const saludoUsuario = document.getElementById('saludo-usuario');

    if (nombre) {
      saludoUsuario.innerHTML = `
        <div id="menu-usuario" style="position: relative;">
          <img id="icono-usuario" class="boton-superior" src="../img/usuario2.png" alt="Usuario" style="width: 30px; cursor: pointer;">
          <div id="dropdown-menu" class="oculto" style="
            position: absolute;
            top: 40px;
            right: 0;
            background-color: #fff;
            border: 1px solid #ccc;
            border-radius: 5px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            padding: 10px;
            z-index: 1000;
            min-width: 200px;
          ">
            <p id="nombre-menu" style="margin: 0 0 5px 0;"><strong>Hola, ${nombre}</strong></p>
            <button id="cerrar-sesion" style="
              padding: 6px 12px;
              background-color: #800080;
              color: #fff;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              width: 100%;
            ">Cerrar sesión</button>
          </div>
        </div>
      `;

      const iconoUsuario = document.getElementById('icono-usuario');
      const dropdown = document.getElementById('dropdown-menu');

      iconoUsuario.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('oculto');
      });

      document.getElementById('cerrar-sesion').addEventListener('click', () => {
        localStorage.removeItem('nombreUsuario');
        window.location.href = '/login.html';
      });

      document.addEventListener('click', (event) => {
        const menuUsuario = document.getElementById('menu-usuario');
        if (!menuUsuario.contains(event.target)) {
          dropdown.classList.add('oculto');
        }
      });

    } else {
      saludoUsuario.innerHTML = `
        <a href="/login.html">
          <img class="boton-superior" src="../img/usuario.png" alt="Usuario" style="width: 30px;">
        </a>
      `;
    }

    // ====== Código para manejar el formulario de login sin email ======
    const formLogin = document.getElementById('form-login'); // form con id="form-login"
    if (formLogin) {
      formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const usuario = formLogin.querySelector('input[name="usuario"]').value;
        const password = formLogin.querySelector('input[name="password"]').value;

        fetch('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario, password })
        })
        .then(res => res.json())
        .then(data => {
          if (data.status === 'ok') {
            localStorage.setItem('nombreUsuario', data.nombre); // Asumiendo que el backend responde con nombre
            window.location.href = '/'; // redirige al inicio
          } else {
            alert('Usuario o contraseña incorrectos');
          }
        })
        .catch(err => {
          console.error('Error en el login:', err);
          alert('Error en el servidor. Intenta más tarde.');
        });
      });
    }
  });

