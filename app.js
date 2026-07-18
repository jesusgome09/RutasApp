const CATEGORIAS_CONFIG = {
    "AUTOSERVICIO": { icon: "fa-truck-ramp-box", color: "from-sky-500/20 to-blue-500/10 text-sky-400 border-sky-500/30" },
    "CAFETERIA": { icon: "fa-mug-saucer", color: "from-amber-600/20 to-orange-500/10 text-amber-300 border-amber-600/30" },
    "COMIDAS RAPIDAS": { icon: "fa-hamburger", color: "from-orange-500/20 to-red-500/10 text-orange-400 border-orange-500/30" },
    "DROGUERIA": { icon: "fa-house-medical", color: "from-red-500/20 to-rose-500/10 text-rose-400 border-red-500/30" },
    "LICOBAR": { icon: "fa-glass-martini-alt", color: "from-pink-500/20 to-purple-500/10 text-pink-400 border-pink-500/30" },
    "LICORERIA": { icon: "fa-wine-bottle", color: "from-purple-500/20 to-indigo-500/10 text-purple-400 border-purple-500/30" },
    "PANADERIA": { icon: "fa-bread-slice", color: "from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30" },
    "RESTAURANTES": { icon: "fa-utensils", color: "from-orange-500/20 to-red-500/10 text-orange-400 border-orange-500/30" },
    "TIENDA": { icon: "fa-shop", color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30" }
};

let estadoRuta = { enProgreso: false, categorias: {}, totalesIniciales: {} };
let historialRutas = [];
let vistaActual = "ruta"; // Control del menú inferior: ruta, historial, ganancias
let categoriaSeleccionadaParaCompletar = null;

document.addEventListener("DOMContentLoaded", () => {
    inicializarDatos();
    registrarServiceWorker();
});

function inicializarDatos() {
    const datosLocales = localStorage.getItem("ruta_actual_premium");
    if (datosLocales) estadoRuta = JSON.parse(datosLocales);

    const datosHistorial = localStorage.getItem("historial_rutas_premium");
    if (datosHistorial) historialRutas = JSON.parse(datosHistorial);

    renderizarInterfaz();
}

function guardarEnStorage() {
    localStorage.setItem("ruta_actual_premium", JSON.stringify(estadoRuta));
}

function guardarHistorialInStorage() {
    localStorage.setItem("historial_rutas_premium", JSON.stringify(historialRutas));
}

function cambiarTab(tab) {
    vistaActual = tab;
    
    // Cambiar estilos de los botones del menú
    ['ruta', 'historial', 'ganancias'].forEach(t => {
        const btn = document.getElementById(`nav-${t}`);
        if(t === tab) {
            btn.classList.remove('text-slate-500', 'hover:text-slate-300');
            btn.classList.add('text-sky-400');
        } else {
            btn.classList.remove('text-sky-400');
            btn.classList.add('text-slate-500', 'hover:text-slate-300');
        }
    });

    renderizarInterfaz();
}

function ocultarTodasLasVistas() {
    document.getElementById("view-ruta").classList.add("hidden");
    document.getElementById("view-confirmacion").classList.add("hidden");
    document.getElementById("view-vacio").classList.add("hidden");
    document.getElementById("view-crear").classList.add("hidden");
    document.getElementById("view-historial").classList.add("hidden");
    document.getElementById("view-ganancias").classList.add("hidden");
}

function actualizarHeader() {
    const dot = document.getElementById("status-dot");
    const text = document.getElementById("status-text");
    if (estadoRuta.enProgreso) {
        dot.className = "w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]";
        text.className = "text-emerald-400 font-semibold";
        text.textContent = "Activa";
    } else {
        dot.className = "w-2 h-2 rounded-full bg-slate-500";
        text.className = "text-slate-400";
        text.textContent = "Sin Ruta";
    }
}

// Función encargada de agrupar por los cortes de los días 5 y 20 a las 11:59:59 PM
function obtenerPeriodoCorte(fechaString) {
    const d = new Date(fechaString);
    const dia = d.getDate();
    const mes = d.toLocaleString('es-ES', { month: 'long' });
    const anio = d.getFullYear();

    // Corte 1: Del 20 del mes pasado a las 00:00 al día 5 de este mes a las 23:59
    // Corte 2: Del día 6 de este mes a las 00:00 al día 20 de este mes a las 23:59
    if (dia <= 5) {
        return `Corte: 20 de Ant. al 05 de ${mes.toUpperCase()} - ${anio}`;
    } else if (dia <= 20) {
        return `Corte: 06 al 20 de ${mes.toUpperCase()} - ${anio}`;
    } else {
        // Entra en el bloque del mes siguiente
        const proximoMes = new Date(d.getFullYear(), d.getMonth() + 1, 1).toLocaleString('es-ES', { month: 'long' });
        return `Corte: 21 al 05 de ${proximoMes.toUpperCase()} - ${anio}`;
    }
}

function renderizarInterfaz() {
    ocultarTodasLasVistas();
    actualizarHeader();

    // Renderizado según la pestaña activa del menú
    if (vistaActual === "historial") {
        renderizarHistorial();
        return;
    }
    if (vistaActual === "ganancias") {
        renderizarGanancias();
        return;
    }

    // Flujo normal de la pestaña "Ruta"
    if (!estadoRuta.enProgreso) {
        document.getElementById("view-vacio").classList.remove("hidden");
        return;
    }

    const categoriasActivas = Object.entries(estadoRuta.categorias).filter(([_, cant]) => cant > 0);

    if (categoriasActivas.length === 0) {
        // SE COMPLETÓ LA RUTA AUTOMÁTICAMENTE
        archivarRutaActual(); 
        return;
    }

    document.getElementById("view-ruta").classList.remove("hidden");
    
    // Calcular barra e indicador superior
    const actuales = Object.values(estadoRuta.categorias).reduce((a, b) => a + b, 0);
    const iniciales = Object.values(estadoRuta.totalesIniciales).reduce((a, b) => a + b, 0) || 1;
    const completadas = iniciales - actuales;
    const porcentaje = Math.round((completadas / iniciales) * 100);
    document.getElementById("progreso-porcentaje").textContent = `${porcentaje}% Completado (${completadas}/${iniciales})`;
    
    const contenedorLista = document.getElementById("lista-categorias");
    contenedorLista.innerHTML = "";

    categoriasActivas.forEach(([nombre, cantidad]) => {
        contenedorLista.appendChild(crearTarjetaPremium(nombre, cantidad, false));
    });
}

function archivarRutaActual() {
    // Sumamos todos los puntos que configuró inicialmente
    const totalPuntosRuta = Object.values(estadoRuta.totalesIniciales).reduce((a, b) => a + b, 0);
    
    if (totalPuntosRuta > 0) {
        const nuevaRutaArchivada = {
            id: Date.now(),
            fecha: new Date().toISOString(),
            detalles: { ...estadoRuta.totalesIniciales },
            totalPuntos: totalPuntosRuta
        };
        historialRutas.unshift(nuevaRutaArchivada); // Lo pone de primero
        guardarHistorialInStorage();
    }

    estadoRuta = { enProgreso: false, categorias: {}, totalesIniciales: {} };
    guardarEnStorage();
    renderizarInterfaz();
}

function renderizarHistorial() {
    document.getElementById("view-historial").classList.remove("hidden");
    const contenedor = document.getElementById("contenedor-cortes");
    contenedor.innerHTML = "";

    if (historialRutas.length === 0) {
        contenedor.innerHTML = `<p class="text-center text-sm text-slate-500 py-10">No hay registros guardados en el historial.</p>`;
        return;
    }

    // Agrupar rutas en sus respectivos bloques de corte quincenal
    const grupos = {};
    historialRutas.forEach(ruta => {
        const periodo = obtenerPeriodoCorte(ruta.fecha);
        if (!grupos[periodo]) grupos[periodo] = { rutas: [], sumaPuntos: 0 };
        grupos[periodo].rutas.push(ruta);
        grupos[periodo].sumaPuntos += ruta.totalPuntos;
    });

    // Pintar los bloques estructurados
    Object.entries(grupos).forEach(([nombreCorte, datos]) => {
        const bloqueCard = document.createElement("div");
        bloqueCard.className = "glass-card rounded-2xl p-4 border border-slate-800 space-y-3";
        
        const headerCorte = document.createElement("div");
        headerCorte.className = "flex justify-between items-center border-b border-slate-700/50 pb-2";
        headerCorte.innerHTML = `
            <span class="text-xs font-bold text-sky-400 tracking-wide"><i class="fa-solid fa-calendar-days mr-1.5"></i>${nombreCorte}</span>
            <span class="bg-sky-500/10 text-sky-300 font-extrabold text-xs px-2.5 py-1 rounded-lg border border-sky-500/20">${datos.sumaPuntos} Puntos Totales</span>
        `;
        bloqueCard.appendChild(headerCorte);

        const listaItems = document.createElement("div");
        listaItems.className = "space-y-2 pt-1 text-xs text-slate-400";
        
        datos.rutas.forEach(r => {
            const fFormat = new Date(r.fecha).toLocaleDateString('es-ES', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'});
            const item = document.createElement("div");
            item.className = "flex justify-between items-center bg-slate-900/40 p-2 rounded-lg";
            item.innerHTML = `<span><i class="fa-solid fa-circle-check text-emerald-500/60 mr-2"></i>Ruta del ${fFormat}</span><span class="font-semibold text-slate-200">+${r.totalPuntos} pts</span>`;
            listaItems.appendChild(item);
        });

        bloqueCard.appendChild(listaItems);
        contenedor.appendChild(bloqueCard);
    });
}

function renderizarGanancias() {
    document.getElementById("view-ganancias").classList.remove("hidden");

    // Calcular totales globales absolutos históricos
    const totalPuntosHistoricos = historialRutas.reduce((acc, r) => acc + r.totalPuntos, 0);
    const totalDineroHistorico = totalPuntosHistoricos * 10000;

    document.getElementById("ganancia-total").textContent = `$${totalDineroHistorico.toLocaleString('es-CO')}`;
    document.getElementById("total-puntos-completados").textContent = `${totalPuntosHistoricos} puntos liquidados en total en la app`;

    // Calcular el corte actual en progreso dinámicamente
    const corteActualNombre = obtenerPeriodoCorte(new Date().toISOString());
    let puntosCorteActual = 0;

    historialRutas.forEach(ruta => {
        if (obtenerPeriodoCorte(ruta.fecha) === corteActualNombre) {
            puntosCorteActual += ruta.totalPuntos;
        }
    });

    document.getElementById("corte-actual-puntos").textContent = `${puntosCorteActual} pts`;
    document.getElementById("corte-actual-dinero").textContent = `$${(puntosCorteActual * 10000).toLocaleString('es-CO')}`;
}

function borrarHistorialCOMPLETO() {
    if(confirm("¿Seguro deseas purgar el historial completo? Se perderán todos tus cortes y balances calculados.")){
        historialRutas = [];
        guardarHistorialInStorage();
        renderInterfaz();
    }
}

// CÓDIGO CLÁSICO DE TARJETAS PREMIUM DE CATEGORÍAS
function crearTarjetaPremium(nombre, cantidad, esModoConfirmacion = false) {
    const config = CATEGORIAS_CONFIG[nombre] || { icon: "fa-location-dot", color: "from-slate-500/20 to-slate-600/10 text-slate-400 border-slate-500/30" };
    const tarjeta = document.createElement("div");
    tarjeta.className = `glass-card rounded-2xl p-3.5 flex items-center justify-between border border-slate-800/60 transition-all duration-200 select-none ${esModoConfirmacion ? '' : 'hover:border-slate-700 active:scale-[0.98] hover:bg-slate-800/40 cursor-pointer'}`;
    
    if (!esModoConfirmacion) tarjeta.onclick = () => abrirConfirmacion(nombre);

    const ladoIzquierdo = document.createElement("div");
    ladoIzquierdo.className = "flex items-center gap-3.5";

    const divIcono = document.createElement("div");
    divIcono.className = `w-11 h-11 rounded-xl bg-gradient-to-br ${config.color} border flex items-center justify-center text-lg shadow-inner`;
    const icono = document.createElement("i");
    icono.className = `fa-solid ${config.icon}`;
    divIcono.appendChild(icono);

    const divTexto = document.createElement("div");
    const pNombre = document.createElement("p");
    pNombre.className = "text-sm font-bold text-slate-200 tracking-wide uppercase";
    pNombre.textContent = nombre.toLowerCase();
    const pSub = document.createElement("p");
    pSub.className = "text-[11px] text-slate-500";
    pSub.textContent = "Establecimiento";
    divTexto.appendChild(pNombre);
    divTexto.appendChild(pSub);
    ladoIzquierdo.appendChild(divIcono);
    ladoIzquierdo.appendChild(divTexto);

    const divContador = document.createElement("div");
    if (esModoConfirmacion && nombre === categoriaSeleccionadaParaCompletar && (cantidad - 1) === 0) {
        divContador.className = "min-w-[48px] h-9 bg-rose-500/20 border border-rose-500/40 rounded-xl flex items-center justify-center text-sm font-extrabold text-rose-400 px-2";
        divContador.textContent = "0";
    } else {
        divContador.className = "min-w-[48px] h-9 bg-slate-900/80 border border-slate-700/60 rounded-xl flex items-center justify-center text-sm font-extrabold text-sky-400 px-2 shadow-inner";
        divContador.textContent = cantidad;
    }

    tarjeta.appendChild(ladoIzquierdo);
    tarjeta.appendChild(divContador);
    return tarjeta;
}

function abrirConfirmacion(categoria) {
    categoriaSeleccionadaParaCompletar = category = categoria;
    ocultarTodasLasVistas();
    document.getElementById("view-confirmacion").classList.remove("hidden");

    let palabraSingular = categoria.toLowerCase();
    if (palabraSingular.endsWith('s') && palabraSingular !== "comidas rapidas") {
        palabraSingular = palabraSingular.slice(0, -1);
    }
    document.getElementById("confirmacion-texto").textContent = `¿Completaste 1 ${palabraSingular}?`;

    const contenedorClon = document.getElementById("confirmacion-lista-clon");
    contenedorClon.innerHTML = "";
    Object.entries(estadoRuta.categorias).filter(([_, cant]) => cant > 0).forEach(([nombre, cantidad]) => {
        contenedorClon.appendChild(crearTarjetaPremium(nombre, Math.max(0, cantidad), true));
    });
}

function cancelarConfirmacion() {
    categoriaSeleccionadaParaCompletar = null;
    renderizerInterfaz();
}

function confirmarTarea() {
    if (categoriaSeleccionadaParaCompletar && estadoRuta.categorias[categoriaSeleccionadaParaCompletar] > 0) {
        estadoRuta.categorias[categoriaSeleccionadaParaCompletar]--;
        guardarEnStorage();
    }
    categoriaSeleccionadaParaCompletar = null;
    renderizerInterfaz();
}

function irACrearRuta() {
    ocultarTodasLasVistas();
    document.getElementById("view-crear").classList.remove("hidden");

    const contenedorFormulario = document.getElementById("formulario-categorias");
    contenedorFormulario.innerHTML = "";

    Object.keys(CATEGORIAS_CONFIG).forEach(nombre => {
        const config = CATEGORIAS_CONFIG[nombre];
        const fila = document.createElement("div");
        fila.className = "glass-card rounded-xl p-3 flex items-center justify-between border border-slate-800/40";

        const ladoIzquierdo = document.createElement("div");
        ladoIzquierdo.className = "flex items-center gap-3";

        const divIcono = document.createElement("div");
        divIcono.className = `w-9 h-9 rounded-lg bg-gradient-to-br ${config.color} border flex items-center justify-center text-sm`;
        const icono = document.createElement("i");
        icono.className = `fa-solid ${config.icon}`;
        divIcono.appendChild(icono);

        const spanNombre = document.createElement("span");
        spanNombre.className = "text-sm font-semibold text-slate-300 uppercase tracking-wide";
        spanNombre.textContent = nombre.toLowerCase();

        ladoIzquierdo.appendChild(divIcono);
        ladoIzquierdo.appendChild(spanNombre);

        const inputCant = document.createElement("input");
        inputCant.type = "number";
        inputCant.inputMode = "numeric";
        inputCant.pattern = "[0-9]*";
        inputCant.min = "0";
        inputCant.value = 0;
        inputCant.id = `input-cat-${nombre}`;
        inputCant.className = "w-14 h-9 glass-input text-center text-sm font-bold text-white rounded-lg focus:outline-none transition-all";

        inputCant.addEventListener("keypress", (e) => {
            if (e.key === "-" || e.key === "." || e.key === ",") e.preventDefault();
        });

        fila.appendChild(ladoIzquierdo);
        fila.appendChild(inputCant);
        contenedorFormulario.appendChild(fila);
    });

    document.getElementById("btn-cancelar-crear").style.display = "block";
}

function cancelarCreacion() {
    vistaActual = "ruta";
    inicializarDatos();
}

function forzarFinRuta() {
    if(confirm("¿Seguro deseas finalizar el recorrido actual? Los puntos validados se registrarán en tu historial quincenal.")){
        archivarRutaActual();
    }
}

function guardarNuevaRuta() {
    const nuevasCategorias = {};
    const nuevosTotales = {};
    let tieneTareas = false;

    Object.keys(CATEGORIAS_CONFIG).forEach(nombre => {
        const input = document.getElementById(`input-cat-${nombre}`);
        const valor = parseInt(input.value, 10) || 0;
        nuevasCategorias[nombre] = valor >= 0 ? valor : 0;
        nuevosTotales[nombre] = valor >= 0 ? valor : 0;
        if (valor > 0) tieneTareas = true;
    });

    if (!tieneTareas) {
        alert("Por favor, asigna una cuota mayor a cero.");
        return;
    }

    estadoRuta = { enProgreso: true, categorias: nuevasCategorias, totalesIniciales: nuevosTotales };
    guardarEnStorage();
    vistaActual = "ruta";
    renderizerInterfaz();
}

function registrarServiceWorker() {
    if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("sw.js")
                .then(reg => console.log("PWA cargada:", reg.scope))
                .catch(err => console.error("Error worker:", err));
        });
    }
}