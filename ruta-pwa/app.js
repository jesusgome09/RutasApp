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

let estadoRuta = {
    enProgreso: false,
    categorias: {},
    totalesIniciales: {}
};

let categoriaSeleccionadaParaCompletar = null;

document.addEventListener("DOMContentLoaded", () => {
    inicializarDatos();
    registrarServiceWorker();
});

function inicializarDatos() {
    const datosLocales = localStorage.getItem("ruta_actual_premium");
    if (datosLocales) {
        estadoRuta = JSON.parse(datosLocales);
    } else {
        estadoRuta = { enProgreso: false, categorias: {}, totalesIniciales: {} };
    }
    renderizarInterfaz();
}

function guardarEnStorage() {
    localStorage.setItem("ruta_actual_premium", JSON.stringify(estadoRuta));
}

function ocultarTodasLasVistas() {
    document.getElementById("view-ruta").classList.add("hidden");
    document.getElementById("view-confirmacion").classList.add("hidden");
    document.getElementById("view-vacio").classList.add("hidden");
    document.getElementById("view-crear").classList.add("hidden");
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

function calcularProgreso() {
    if (!estadoRuta.enProgreso) return;
    const actuales = Object.values(estadoRuta.categorias).reduce((a, b) => a + b, 0);
    const iniciales = Object.values(estadoRuta.totalesIniciales).reduce((a, b) => a + b, 0) || 1;
    
    const completadas = iniciales - actuales;
    const porcentaje = Math.round((completadas / iniciales) * 100);
    document.getElementById("progreso-porcentaje").textContent = `${porcentaje}% Completado (${completadas}/${iniciales})`;
}

function renderizarInterfaz() {
    ocultarTodasLasVistas();
    actualizarHeader();

    if (!estadoRuta.enProgreso) {
        document.getElementById("view-vacio").classList.remove("hidden");
        return;
    }

    const categoriasActivas = Object.entries(estadoRuta.categorias).filter(([_, cant]) => cant > 0);

    if (categoriasActivas.length === 0) {
        estadoRuta.enProgreso = false;
        guardarEnStorage();
        actualizarHeader();
        document.getElementById("view-vacio").classList.remove("hidden");
        return;
    }

    document.getElementById("view-ruta").classList.remove("hidden");
    calcularProgreso();
    
    const contenedorLista = document.getElementById("lista-categorias");
    contenedorLista.innerHTML = "";

    categoriasActivas.forEach(([nombre, cantidad]) => {
        contenedorLista.appendChild(crearTarjetaPremium(nombre, cantidad, false));
    });
}

function crearTarjetaPremium(nombre, cantidad, esModoConfirmacion = false) {
    const config = CATEGORIAS_CONFIG[nombre] || { icon: "fa-location-dot", color: "from-slate-500/20 to-slate-600/10 text-slate-400 border-slate-500/30" };
    
    const tarjeta = document.createElement("div");
    tarjeta.className = `glass-card rounded-2xl p-3.5 flex items-center justify-between border border-slate-800/60 transition-all duration-200 select-none ${esModoConfirmacion ? '' : 'hover:border-slate-700 active:scale-[0.98] hover:bg-slate-800/40 cursor-pointer'}`;
    
    if (!esModoConfirmacion) {
        tarjeta.onclick = () => abrirConfirmacion(nombre);
    }

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
    categoriaSeleccionadaParaCompletar = categoria;
    ocultarTodasLasVistas();
    document.getElementById("view-confirmacion").classList.remove("hidden");

    let palabraSingular = categoria.toLowerCase().replace(/as$/, 'a').replace(/es$/, '').replace(/ia$/, 'ia');
    document.getElementById("confirmacion-texto").textContent = `¿Completaste 1 ${palabraSingular}?`;

    const contenedorClon = document.getElementById("confirmacion-lista-clon");
    contenedorClon.innerHTML = "";
    
    Object.entries(estadoRuta.categorias).filter(([_, cant]) => cant > 0).forEach(([nombre, cantidad]) => {
        contenedorClon.appendChild(crearTarjetaPremium(nombre, Math.max(0, cantidad), true));
    });
}

function cancelarConfirmacion() {
    categoriaSeleccionadaParaCompletar = null;
    renderizarInterfaz();
}

function confirmarTarea() {
    if (categoriaSeleccionadaParaCompletar && estadoRuta.categorias[categoriaSeleccionadaParaCompletar] > 0) {
        estadoRuta.categorias[categoriaSeleccionadaParaCompletar]--;
        guardarEnStorage();
    }
    categoriaSeleccionadaParaCompletar = null;
    renderizarInterfaz();
}

function irACrearRuta() {
    ocultarTodasLasVistas();
    document.getElementById("view-crear").classList.remove("hidden");

    const contenedorFormulario = document.getElementById("formulario-categorias");
    contenedorFormulario.innerHTML = "";

    const datosLocales = localStorage.getItem("ruta_actual_premium");
    const rutaPrevia = datosLocales ? JSON.parse(datosLocales) : null;

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
        
        let valorInicial = 0;
        if (rutaPrevia && rutaPrevia.categorias && rutaPrevia.categorias[nombre] !== undefined) {
            valorInicial = rutaPrevia.categorias[nombre];
        } else if (nombre === "PANADERIAS") {
            valorInicial = 5; // Valores por defecto estéticos de tus maquetas
        } else if (nombre === "TIENDAS") {
            valorInicial = 2;
        } else if (nombre === "DROGUERIA") {
            valorInicial = 1;
        }

        inputCant.value = valorInicial;
        inputCant.id = `input-cat-${nombre}`;
        inputCant.className = "w-14 h-9 glass-input text-center text-sm font-bold text-white rounded-lg focus:outline-none transition-all";

        inputCant.addEventListener("keypress", (e) => {
            if (e.key === "-" || e.key === "." || e.key === ",") e.preventDefault();
        });

        fila.appendChild(ladoIzquierdo);
        fila.appendChild(inputCant);
        contenedorFormulario.appendChild(fila);
    });

    const btnCancelarCrear = document.getElementById("btn-cancelar-crear");
    if (rutaPrevia && Object.values(rutaPrevia.totalesIniciales).reduce((a,b)=>a+b, 0) > 0) {
        btnCancelarCrear.style.display = "block";
    } else {
        btnCancelarCrear.style.display = "none";
    }
}

function cancelarCreacion() {
    inicializarDatos();
}

function forzarFinRuta() {
    if(confirm("¿Seguro que deseas cancelar por completo el recorrido actual? Los datos guardados de esta ruta se reiniciarán.")){
        estadoRuta = { enProgreso: false, categorias: {}, totalesIniciales: {} };
        guardarEnStorage();
        renderizarInterfaz();
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
        alert("Por favor, asigna una cuota mayor a cero en algún establecimiento.");
        return;
    }

    estadoRuta = {
        enProgreso: true,
        categorias: nuevasCategorias,
        totalesIniciales: nuevosTotales
    };

    guardarEnStorage();
    renderizarInterfaz();
}

function registrarServiceWorker() {
    if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("sw.js")
                .then(reg => console.log("PWA Premium cargada en espacio:", reg.scope))
                .catch(err => console.error("Error cargando worker offline:", err));
        });
    }
}