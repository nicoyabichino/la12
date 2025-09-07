const API_URL = '/api/jugadores';
const VALIDAR_URL = '/api/validar-clave';

const socket = io();

async function fetchAndRenderJugadores() {
    try {
        const response = await fetch(API_URL);
        const jugadores = await response.json();
        
        jugadores.sort((a, b) => {
            if (a.puntos > b.puntos) {
                return -1;
            }
            if (a.puntos < b.puntos) {
                return 1;
            }
            if (a.asistencias > b.asistencias) {
                return -1;
            }
            if (a.asistencias < b.asistencias) {
                return 1;
            }
            return 0;
        });

        const tablaCuerpo = document.getElementById('tabla-cuerpo');
        tablaCuerpo.innerHTML = '';

        jugadores.forEach(jugador => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${jugador.nombre}</td>
                <td contenteditable="true" data-id="${jugador.id}" data-campo="puntos">${jugador.puntos}</td>
                <td contenteditable="true" data-id="${jugador.id}" data-campo="asistencias">${jugador.asistencias}</td>
            `;
            tablaCuerpo.appendChild(fila);
        });

        agregarEventosDeEdicion();

    } catch (error) {
        console.error('Error al obtener o renderizar los datos:', error);
    }
}

function agregarEventosDeEdicion() {
    const celdasEditables = document.querySelectorAll('[contenteditable="true"]');
    const passwordInput = document.getElementById('password');

    celdasEditables.forEach(celda => {
        celda.addEventListener('focus', (e) => {
            e.target.dataset.valorOriginal = e.target.textContent;
        });

        celda.addEventListener('blur', async (e) => {
            const id = e.target.dataset.id;
            const campo = e.target.dataset.campo;
            let valor = e.target.textContent;
            const valorOriginal = e.target.dataset.valorOriginal;

            if (valor.toString() === valorOriginal) {
                return;
            }

            const password = passwordInput.value;
            if (!password) {
                alert('Debes ingresar la clave para modificar los datos.');
                e.target.textContent = valorOriginal;
                return;
            }

            if (campo === 'puntos' || campo === 'asistencias') {
                valor = parseInt(valor, 10);
                if (isNaN(valor)) {
                    alert('Por favor, ingresa un número válido para puntos y asistencias.');
                    e.target.textContent = valorOriginal;
                    return;
                }
            }
            
            const data = { [campo]: valor, password: password };
            
            try {
                const response = await fetch(`${API_URL}/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    fetchAndRenderJugadores(); 
                } else {
                    const error = await response.json();
                    alert('Error al actualizar: ' + error.error);
                    e.target.textContent = valorOriginal;
                }
            } catch (error) {
                console.error('Error de red al actualizar:', error);
                alert('Ocurrió un error al comunicarse con el servidor.');
                e.target.textContent = valorOriginal;
            }
        });

        celda.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); 
                e.target.blur();    
            }
        });
    });
}

// Nueva función para validar la clave con el botón
async function validarClave() {
    const passwordInput = document.getElementById('password');
    const password = passwordInput.value;

    if (!password) {
        alert('Por favor, ingresa una clave.');
        return;
    }

    try {
        const response = await fetch(VALIDAR_URL, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (data.esValida) {
            alert('¡Bienvenido Dios de la tabla!');
        } else {
            alert('Clave incorrecta Papi! jajode!.');
            passwordInput.value = '';
        }
    } catch (error) {
        console.error('Error de red:', error);
        alert('Ocurrió un error al validar la clave.');
    }
}

// Escuchar el evento 'actualizacion' del servidor para re-renderizar la tabla
socket.on('actualizacion', () => {
    fetchAndRenderJugadores();
});

// Llamar a la función principal al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderJugadores();
    const validarBtn = document.getElementById('validar-btn');
    if (validarBtn) {
        validarBtn.addEventListener('click', validarClave);
    }
});
