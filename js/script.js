document.addEventListener('DOMContentLoaded', function() {
    const table = document.getElementById('inventory-table');
    const modal = document.getElementById('product-modal');
    const btnAdd = document.getElementById('add-product');
    const btnClose = document.querySelector('.close');
    const form = document.getElementById('product-form');
    const searchInput = document.getElementById('search-input');
    let products = [
        { id: 1, code: 'P001', name: 'Laptop HP', stock: 15 },
        { id: 2, code: 'P002', name: 'Teclado Inalámbrico', stock: 5 },
        { id: 3, code: 'P003', name: 'Mouse Logitech', stock: 20 }
    ];

    // Renderizar tabla
    function renderTable(data = products) {
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';
        data.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${product.code}</td>
                <td>${product.name}</td>
                <td>${product.stock} 
                    ${product.stock <= 10 ? '<i class="fas fa-exclamation-circle stock-warning"></i>' : ''}
                </td>
                <td class="actions">
                    <button class="btn-edit" data-id="${product.id}">Actualizar</button>
                    <button class="btn-delete" data-id="${product.id}">Eliminar</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Buscar productos
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredProducts = products.filter(product => 
            product.code.toLowerCase().includes(searchTerm) || 
            product.name.toLowerCase().includes(searchTerm)
        );
        renderTable(filteredProducts);
    });

    // Resto del código (modal, agregar/editar/eliminar)...
    btnAdd.addEventListener('click', () => {
        document.getElementById('modal-title').textContent = 'Nuevo Producto';
        form.reset();
        document.getElementById('edit-id').value = '';
        modal.style.display = 'block';
    });

    btnClose.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const code = document.getElementById('code').value;
        const name = document.getElementById('name').value;
        const stock = parseInt(document.getElementById('stock').value);

        if (id) {
            // Editar
            const index = products.findIndex(p => p.id == id);
            products[index] = { id: parseInt(id), code, name, stock };
        } else {
            // Agregar
            const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
            products.push({ id: newId, code, name, stock });
        }

        modal.style.display = 'none';
        renderTable();
    });

    table.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-edit')) {
            const id = e.target.getAttribute('data-id');
            const product = products.find(p => p.id == id);
            document.getElementById('modal-title').textContent = 'Editar Producto';
            document.getElementById('edit-id').value = product.id;
            document.getElementById('code').value = product.code;
            document.getElementById('name').value = product.name;
            document.getElementById('stock').value = product.stock;
            modal.style.display = 'block';
        }

        if (e.target.classList.contains('btn-delete')) {
            const id = e.target.getAttribute('data-id');
            products = products.filter(p => p.id != id);
            renderTable();
        }
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    renderTable();
});