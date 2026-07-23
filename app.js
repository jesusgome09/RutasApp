const CATEGORIAS_CONFIG = {
    "AUTOSERVICIO": { icon: "fa-truck-ramp-box", color: "from-sky-500/20 to-blue-500/10 text-sky-400 border-sky-500/30" },
    "BAR": { icon: "fa-champagne-glasses", color: "from-pink-500/20 to-purple-500/10 text-pink-400 border-pink-500/30" },
    "CAFETERIA": { icon: "fa-mug-saucer", color: "from-amber-600/20 to-orange-500/10 text-amber-300 border-amber-600/30" },
    "COMIDAS RAPIDAS": { icon: "fa-hamburger", color: "from-orange-500/20 to-red-500/10 text-orange-400 border-orange-500/30" },
    "DROGUERIA": { icon: "fa-house-medical", color: "from-red-500/20 to-rose-500/10 text-rose-400 border-red-500/30" },
    "LICOBAR": { icon: "fa-glass-martini-alt", color: "from-pink-500/20 to-purple-500/10 text-pink-400 border-pink-500/30" },
    "LICORERIA": { icon: "fa-wine-bottle", color: "from-purple-500/20 to-indigo-500/10 text-purple-400 border-purple-500/30" },
    "PANADERIA": { icon: "fa-bread-slice", color: "from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30" },
    "RESTAURANTES": { icon: "fa-utensils", color: "from-orange-500/20 to-red-500/10 text-orange-400 border-orange-500/30" },
    "TIENDA": { icon: "fa-shop", color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30" }
};

let estadoRuta = { enProgreso: false, modoLibre: false, categorias: {}, totalesIniciales: {} };
let historialRutas = [];
let vistaActual = "ruta"; 
let categoriaSeleccionadaParaCompletar = null;

document.addEventListener("DOMContentLoaded", () => {
    inicializarDatos();
    registrarServiceWorker();
});

let metaQuincenalCOP = 1000000; // Valor por defecto: $1.000.000 COP

function inicializarDatos() {
    const datosLocales = localStorage.getItem("ruta_actual_premium");
    if (datosLocales) estadoRuta = JSON.parse(datosLocales);

    const datosHistorial = localStorage.getItem("historial_rutas_premium");
    if (datosHistorial) historialRutas = JSON.parse(datosHistorial);

    const metaGuardada = localStorage.getItem("meta_quincenal_premium");
    if (metaGuardada) metaQuincenalCOP = parseInt(metaGuardada, 10);

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
    
    ['ruta', 'historial', 'ganancias'].forEach(t => {
        const btn = document.getElementById(`nav-${t}`);
        if(btn) {
            if(t === tab) {
                btn.classList.remove('text-slate-500', 'hover:text-slate-300');
                btn.classList.add('text-sky-400');
            } else {
                btn.classList.remove('text-sky-400');
                btn.classList.add('text-slate-500', 'hover:text-slate-300');
            }
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
        text.textContent = estadoRuta.modoLibre ? "Modo Libre" : "Activa";
    } else {
        dot.className = "w-2 h-2 rounded-full bg-slate-500";
        text.className = "text-slate-400";
        text.textContent = "Sin Ruta";
    }
}

function obtenerPeriodoCorte(fechaString) {
    const d = new Date(fechaString);
    const dia = d.getDate();
    const mes = d.toLocaleString('es-ES', { month: 'long' });
    const anio = d.getFullYear();

    if (dia <= 5) {
        return `Corte: 20 de Ant. al 05 de ${mes.toUpperCase()} - ${anio}`;
    } else if (dia <= 20) {
        return `Corte: 06 al 20 de ${mes.toUpperCase()} - ${anio}`;
    } else {
        const proximoMes = new Date(d.getFullYear(), d.getMonth() + 1, 1).toLocaleString('es-ES', { month: 'long' });
        return `Corte: 21 al 05 de ${proximoMes.toUpperCase()} - ${anio}`;
    }
}

function renderizarInterfaz() {
    ocultarTodasLasVistas();
    actualizarHeader();

    if (vistaActual === "historial") {
        renderizarHistorial();
        return;
    }
    if (vistaActual === "ganancias") {
        renderizarGanancias();
        return;
    }

    if (!estadoRuta.enProgreso) {
        document.getElementById("view-vacio").classList.remove("hidden");
        return;
    }

    document.getElementById("view-ruta").classList.remove("hidden");
    const contenedorLista = document.getElementById("lista-categorias");
    contenedorLista.innerHTML = "";

    // MODO LIBRE
    if (estadoRuta.modoLibre) {
        const totalPuntosCompletados = Object.values(estadoRuta.categorias).reduce((a, b) => a + b, 0);
        document.getElementById("progreso-porcentaje").textContent = `Modo Libre: ${totalPuntosCompletados} Puntos Registrados`;

        Object.keys(CATEGORIAS_CONFIG).forEach(nombre => {
            const cantidadRealizada = estadoRuta.categorias[nombre] || 0;
            contenedorLista.appendChild(crearTarjetaModoLibre(nombre, cantidadRealizada));
        });
        return;
    }

    // MODO PROGRAMADO (CUOTA FIJA)
    const actuales = Object.values(estadoRuta.categorias).reduce((a, b) => a + b, 0);
    const iniciales = Object.values(estadoRuta.totalesIniciales).reduce((a, b) => a + b, 0) || 1;
    const completadas = iniciales - actuales;
    const porcentaje = Math.round((completadas / iniciales) * 100);
    document.getElementById("progreso-porcentaje").textContent = `${porcentaje}% Completado (${completadas}/${iniciales})`;

    const categoriasConfiguradas = Object.entries(estadoRuta.categorias).filter(([nombre, _]) => {
        return (estadoRuta.totalesIniciales[nombre] || 0) > 0;
    });

    if (porcentaje === 100) {
        contenedorLista.innerHTML = `
            <div class="glass-card rounded-2xl p-6 text-center border border-emerald-500/30 bg-emerald-500/5 my-4">
                <i class="fa-solid fa-circle-check text-4xl text-emerald-400 mb-3 animate-bounce"></i>
                <h3 class="text-lg font-bold text-white mb-1">¡Ruta Completada!</h3>
                <p class="text-xs text-slate-400 mb-4">Ya puedes generar la captura final para tu supervisora abajo.</p>
                <button onclick="archivarRutaManual()" class="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2 px-4 rounded-xl border border-slate-700 active:scale-95 transition-all w-full">
                    Archivar y Limpiar Tablero
                </button>
            </div>
        `;
    } else {
        // Muestra botón de actualizar cuota si hay avance parcial
        if (completadas > 0) {
            const btnActualizar = document.createElement("button");
            btnActualizar.onclick = actualizarCuotaRestante;
            btnActualizar.className = "mb-3 w-full bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold py-2 px-3 rounded-xl border border-sky-500/30 active:scale-95 transition-all text-xs flex items-center justify-center gap-2";
            btnActualizar.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> Liquidar ${completadas} visitas realizadas y reajustar cuota`;
            contenedorLista.appendChild(btnActualizar);
        }

        categoriasConfiguradas.forEach(([nombre, cantidad]) => {
            if (cantidad > 0) {
                contenedorLista.appendChild(crearTarjetaPremium(nombre, cantidad, false));
            }
        });
    }
}

// LÓGICA DE REAJUSTE Y CORTE PARCIAL DE CUOTA
function actualizarCuotaRestante() {
    let puntosAvance = 0;
    let mapaDetallesRealizados = {};

    Object.keys(estadoRuta.totalesIniciales).forEach(cat => {
        const inicial = estadoRuta.totalesIniciales[cat] || 0;
        const faltante = estadoRuta.categorias[cat] || 0;
        const realizado = inicial - faltante;

        if (realizado > 0) {
            mapaDetallesRealizados[cat] = realizado;
            puntosAvance += realizado;
        }
    });

    if (puntosAvance === 0) return;

    if (confirm(`¿Deseas liquidar las ${puntosAvance} visitas realizadas hoy, enviarlas al historial de ganancias y reajustar tu cuota a lo que te falta?`)) {
        // 1. Guardar avance parcial en el historial
        const avanceArchivado = {
            id: Date.now(),
            fecha: new Date().toISOString(),
            detalles: mapaDetallesRealizados,
            totalPuntos: puntosAvance
        };
        historialRutas.unshift(avanceArchivado);
        guardarHistorialInStorage();

        // 2. Reajustar la cuota inicial al saldo pendiente actual
        Object.keys(estadoRuta.categorias).forEach(cat => {
            estadoRuta.totalesIniciales[cat] = estadoRuta.categorias[cat];
        });

        guardarEnStorage();
        renderizarInterfaz();
    }
}

function archivarRutaActual() {
    let mapaDetallesRealizados = {};
    let totalPuntosReales = 0;

    if (estadoRuta.modoLibre) {
        mapaDetallesRealizados = { ...estadoRuta.categorias };
        totalPuntosReales = Object.values(estadoRuta.categorias).reduce((a, b) => a + b, 0);
    } else {
        Object.keys(estadoRuta.totalesIniciales).forEach(cat => {
            const inicial = estadoRuta.totalesIniciales[cat] || 0;
            const faltante = estadoRuta.categorias[cat] || 0;
            const realizado = inicial - faltante;
            if (realizado > 0) {
                mapaDetallesRealizados[cat] = realizado;
                totalPuntosReales += realizado;
            }
        });
    }
    
    if (totalPuntosReales > 0) {
        const nuevaRutaArchivada = {
            id: Date.now(),
            fecha: new Date().toISOString(),
            detalles: mapaDetallesRealizados,
            totalPuntos: totalPuntosReales
        };
        historialRutas.unshift(nuevaRutaArchivada);
        guardarHistorialInStorage();
    }

    estadoRuta = { enProgreso: false, modoLibre: false, categorias: {}, totalesIniciales: {} };
    guardarEnStorage();
    renderizarInterfaz();
}

function crearTarjetaModoLibre(nombre, cantidadRealizada) {
    const config = CATEGORIAS_CONFIG[nombre] || { icon: "fa-location-dot", color: "from-slate-500/20 to-slate-600/10 text-slate-400 border-slate-500/30" };
    const tarjeta = document.createElement("div");
    tarjeta.className = "glass-card rounded-2xl p-3.5 flex items-center justify-between border border-slate-800/60 hover:border-slate-700 active:scale-[0.98] hover:bg-slate-800/40 cursor-pointer transition-all select-none";
    
    tarjeta.onclick = () => abrirConfirmacion(nombre);

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
    pSub.className = "text-[11px] text-emerald-400 font-semibold";
    pSub.textContent = "Toca para registrar +1";
    divTexto.appendChild(pNombre);
    divTexto.appendChild(pSub);
    ladoIzquierdo.appendChild(divIcono);
    ladoIzquierdo.appendChild(divTexto);

    const divContador = document.createElement("div");
    divContador.className = "min-w-[48px] h-9 bg-emerald-500/20 border border-emerald-500/40 rounded-xl flex items-center justify-center text-sm font-extrabold text-emerald-400 px-2 shadow-inner";
    divContador.textContent = cantidadRealizada;

    tarjeta.appendChild(ladoIzquierdo);
    tarjeta.appendChild(divContador);
    return tarjeta;
}

function abrirConfirmacion(categoria) {
    categoriaSeleccionadaParaCompletar = categoria;
    ocultarTodasLasVistas();
    document.getElementById("view-confirmacion").classList.remove("hidden");

    let palabraSingular = categoria.toLowerCase();
    if (palabraSingular.endsWith('s') && palabraSingular !== "comidas rapidas") {
        palabraSingular = palabraSingular.slice(0, -1);
    }

    if (estadoRuta.modoLibre) {
        document.getElementById("confirmacion-texto").textContent = `¿Registrar +1 ${palabraSingular}?`;
    } else {
        document.getElementById("confirmacion-texto").textContent = `¿Completaste 1 ${palabraSingular}?`;
    }

    const contenedorClon = document.getElementById("confirmacion-lista-clon");
    contenedorClon.innerHTML = "";
    
    if (estadoRuta.modoLibre) {
        contenedorClon.appendChild(crearTarjetaModoLibre(categoria, (estadoRuta.categorias[categoria] || 0)));
    } else {
        Object.entries(estadoRuta.categorias).filter(([_, cant]) => cant > 0).forEach(([nombre, cantidad]) => {
            contenedorClon.appendChild(crearTarjetaPremium(nombre, Math.max(0, cantidad), true));
        });
    }
}

function cancelarConfirmacion() {
    categoriaSeleccionadaParaCompletar = null;
    renderizarInterfaz();
}

function confirmarTarea() {
    if (categoriaSeleccionadaParaCompletar) {
        if (estadoRuta.modoLibre) {
            if (!estadoRuta.categorias[categoriaSeleccionadaParaCompletar]) {
                estadoRuta.categorias[categoriaSeleccionadaParaCompletar] = 0;
            }
            estadoRuta.categorias[categoriaSeleccionadaParaCompletar]++;
        } else {
            if (estadoRuta.categorias[categoriaSeleccionadaParaCompletar] > 0) {
                estadoRuta.categorias[categoriaSeleccionadaParaCompletar]--;
            }
        }
        guardarEnStorage();
    }
    categoriaSeleccionadaParaCompletar = null;
    renderizarInterfaz();
}

function iniciarModoLibre() {
    estadoRuta = {
        enProgreso: true,
        modoLibre: true,
        categorias: {},
        totalesIniciales: {}
    };
    guardarEnStorage();
    vistaActual = "ruta";
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

    const grupos = {};
    historialRutas.forEach(ruta => {
        const periodo = obtenerPeriodoCorte(ruta.fecha);
        if (!grupos[periodo]) grupos[periodo] = { rutas: [], sumaPuntos: 0 };
        grupos[periodo].rutas.push(ruta);
        grupos[periodo].sumaPuntos += ruta.totalPuntos;
    });

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
            
            // Tarjeta principal interactiva
            const item = document.createElement("div");
            item.className = "flex flex-col bg-slate-900/40 border border-slate-800/80 rounded-xl overflow-hidden transition-all";
            
            // Fila superior (La que se ve siempre)
            const filaHeader = document.createElement("div");
            filaHeader.className = "flex justify-between items-center p-3 cursor-pointer hover:bg-slate-800/40 active:scale-[0.99] transition-all select-none";
            filaHeader.onclick = () => alternarDetalleHistorial(r.id);
            filaHeader.innerHTML = `
                <div class="flex items-center gap-2">
                    <i class="fa-solid fa-circle-check text-emerald-500"></i>
                    <span class="font-semibold text-slate-200">Recorrido del ${fFormat}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="font-bold text-sky-400">+${r.totalPuntos} pts</span>
                    <i id="chevron-${r.id}" class="fa-solid fa-chevron-down text-slate-500 text-[10px] transition-transform duration-200"></i>
                </div>
            `;
            
            // Fila inferior desplegable (Detalles y botón de imagen)
            const filaDetalle = document.createElement("div");
            filaDetalle.id = `detalle-${r.id}`;
            filaDetalle.className = "hidden bg-slate-950/60 p-3 border-t border-slate-800/60 space-y-3";
            
            let htmlDetallesPuntos = `<div class="space-y-1">`;
            if (r.detalles && Object.keys(r.detalles).length > 0) {
                Object.entries(r.detalles).forEach(([cat, cant]) => {
                    if (cant > 0) {
                        htmlDetallesPuntos += `
                            <div class="flex justify-between text-[11px] text-slate-300">
                                <span class="uppercase font-medium">${cat.toLowerCase()}</span>
                                <span class="font-bold text-emerald-400">${cant}</span>
                            </div>
                        `;
                    }
                });
            } else {
                htmlDetallesPuntos += `<p class="text-[11px] text-slate-500 italic">Puntos consolidados (+${r.totalPuntos} pts)</p>`;
            }
            htmlDetallesPuntos += `</div>`;

            filaDetalle.innerHTML = htmlDetallesPuntos + `
                <button onclick="regenerarReporteHistorial(${r.id})" class="w-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-bold py-2 px-3 rounded-lg border border-emerald-500/30 active:scale-95 transition-all text-[11px] flex items-center justify-center gap-2 mt-2">
                    <i class="fa-brands fa-whatsapp"></i> Generar Imagen de este Recorrido
                </button>
            `;

            item.appendChild(filaHeader);
            item.appendChild(filaDetalle);
            listaItems.appendChild(item);
        });

        bloqueCard.appendChild(listaItems);
        contenedor.appendChild(bloqueCard);
    });
}

// Función para abrir/cerrar el acordeón de detalles
function alternarDetalleHistorial(id) {
    const detalle = document.getElementById(`detalle-${id}`);
    const chevron = document.getElementById(`chevron-${id}`);
    if (detalle) {
        const estaOculto = detalle.classList.contains("hidden");
        if (estaOculto) {
            detalle.classList.remove("hidden");
            if (chevron) chevron.style.transform = "rotate(180deg)";
        } else {
            detalle.classList.add("hidden");
            if (chevron) chevron.style.transform = "rotate(0deg)";
        }
    }
}

function renderizarGanancias() {
    document.getElementById("view-ganancias").classList.remove("hidden");

    // Total acumulado absoluto
    const totalPuntosHistoricos = historialRutas.reduce((acc, r) => acc + r.totalPuntos, 0);
    const totalDineroHistorico = totalPuntosHistoricos * 10000;

    document.getElementById("ganancia-total").textContent = `$${totalDineroHistorico.toLocaleString('es-CO')}`;
    document.getElementById("total-puntos-completados").textContent = `${totalPuntosHistoricos} puntos liquidados en total en la app`;

    // Identificar el nombre del corte actual en curso
    const corteActualNombre = obtenerPeriodoCorte(new Date().toISOString());
    let puntosCorteActual = 0;

    // Agrupar todas las rutas guardadas por su respectivo periodo de corte
    const cortesAgrupados = {};

    historialRutas.forEach(ruta => {
        const nombrePeriodo = obtenerPeriodoCorte(ruta.fecha);
        
        if (!cortesAgrupados[nombrePeriodo]) {
            cortesAgrupados[nombrePeriodo] = 0;
        }
        cortesAgrupados[nombrePeriodo] += ruta.totalPuntos;

        if (nombrePeriodo === corteActualNombre) {
            puntosCorteActual += ruta.totalPuntos;
        }
    });

    // Actualizar el bloque de la Quincena Actual
    const dineroCorteActual = puntosCorteActual * 10000;
    document.getElementById("corte-actual-puntos").textContent = `${puntosCorteActual} pts`;
    document.getElementById("corte-actual-dinero").textContent = `$${dineroCorteActual.toLocaleString('es-CO')}`;

    // Cálculo de la Meta Quincenal
    const porcentajeMeta = Math.min(100, Math.round((dineroCorteActual / metaQuincenalCOP) * 100));
    const dineroFaltante = Math.max(0, metaQuincenalCOP - dineroCorteActual);

    document.getElementById("meta-texto-monto").textContent = `$${dineroCorteActual.toLocaleString('es-CO')} / $${metaQuincenalCOP.toLocaleString('es-CO')}`;
    document.getElementById("meta-porcentaje").textContent = `${porcentajeMeta}%`;
    document.getElementById("meta-barra-fill").style.width = `${porcentajeMeta}%`;

    if (dineroFaltante === 0) {
        document.getElementById("meta-restante-texto").textContent = "🎉 ¡Meta quincenal cumplida con éxito!";
        document.getElementById("meta-restante-texto").className = "text-[11px] text-emerald-400 font-bold text-right";
    } else {
        document.getElementById("meta-restante-texto").textContent = `Faltan $${dineroFaltante.toLocaleString('es-CO')} para cumplir la meta`;
        document.getElementById("meta-restante-texto").className = "text-[11px] text-slate-400 italic text-right";
    }

    // RENDERIZAR HISTORIAL DE GANANCIAS POR CORTES ANTERIORES
    const contenedorGananciasHistorial = document.getElementById("contenedor-historial-ganancias");
    contenedorGananciasHistorial.innerHTML = "";

    const periodosExistentes = Object.keys(cortesAgrupados);

    if (periodosExistentes.length === 0) {
        contenedorGananciasHistorial.innerHTML = `<p class="text-center text-xs text-slate-500 py-4">No hay cortes liquidados aún.</p>`;
        return;
    }

    periodosExistentes.forEach(periodoNombre => {
        const puntosPeriodo = cortesAgrupados[periodoNombre];
        const dineroPeriodo = puntosPeriodo * 10000;
        const esElActual = (periodoNombre === corteActualNombre);

        const cardCorte = document.createElement("div");
        cardCorte.className = `glass-card rounded-xl p-3.5 flex items-center justify-between border ${esElActual ? 'border-sky-500/40 bg-sky-500/5' : 'border-slate-800 bg-slate-900/40'}`;

        cardCorte.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg ${esElActual ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'} flex items-center justify-center text-sm font-bold">
                    <i class="fa-solid ${esElActual ? 'fa-spinner animate-spin' : 'fa-circle-dollar-to-slot'}"></i>
                </div>
                <div>
                    <p class="text-xs font-bold text-slate-200">${periodoNombre}</p>
                    <p class="text-[10px] text-slate-400">${puntosPeriodo} puntos realizados ${esElActual ? '(En progreso)' : '(Cerrado)'}</p>
                </div>
            </div>
            <div class="text-right">
                <p class="text-sm font-black text-emerald-400">$${dineroPeriodo.toLocaleString('es-CO')}</p>
                <span class="text-[9px] uppercase font-extrabold tracking-wider ${esElActual ? 'text-sky-400' : 'text-slate-500'}">${esElActual ? 'Actual' : 'Liquidado'}</span>
            </div>
        `;

        contenedorGananciasHistorial.appendChild(cardCorte);
    });
}

function configurarMetaQuincenal() {
    const nuevaMetaInput = prompt("Ingresa el monto de tu meta financiera para cada corte quincenal (en COP):", metaQuincenalCOP);
    if (nuevaMetaInput !== null) {
        const valorParsed = parseInt(nuevaMetaInput.replace(/\D/g, ''), 10);
        if (valorParsed && valorParsed > 0) {
            metaQuincenalCOP = valorParsed;
            localStorage.setItem("meta_quincenal_premium", metaQuincenalCOP.toString());
            renderizarGanancias();
        } else {
            alert("Por favor ingresa un número válido mayor a cero.");
        }
    }
}

function borrarHistorialCompleto() {
    if(confirm("¿Seguro deseas purgar el historial completo? Se perderán todos tus cortes y balances calculados.")){
        historialRutas = [];
        guardarHistorialInStorage();
        renderizarInterfaz();
    }
}

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
    if(confirm("¿Deseas finalizar la jornada actual? Los puntos que efectivamente registraste se guardarán en tu historial de ganancias.")){
        archivarRutaActual();
    }
}

function archivarRutaManual() {
    if(confirm("¿Deseas archivar este recorrido y guardarlo en el historial quincenal?")){
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

    estadoRuta = { enProgreso: true, modoLibre: false, categorias: nuevasCategorias, totalesIniciales: nuevosTotales };
    guardarEnStorage();
    vistaActual = "ruta";
    renderizarInterfaz();
}

function generarReporteImagen() {
    if (!estadoRuta.enProgreso) {
        alert("No hay ninguna ruta activa para generar un reporte.");
        return;
    }

    const hoy = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    const reporteDiv = document.createElement("div");
    reporteDiv.style.position = "absolute";
    reporteDiv.style.left = "-9999px";
    reporteDiv.style.top = "-9999px";
    reporteDiv.className = "w-[360px] bg-[#0f172a] text-slate-100 p-6 font-sans flex flex-col gap-5 border border-slate-800";
    
    let htmlContenido = `
        <div style="border-bottom: 2px solid rgba(56, 189, 248, 0.2); padding-bottom: 12px; display: table; width: 100%;">
            <div style="display: table-cell; vertical-align: middle;">
                <h2 style="font-size: 16px; font-weight: 900; color: #fff; margin: 0;">RouteTask Pro</h2>
                <p style="font-size: 10px; color: #38bdf8; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">Reporte de Cobertura</p>
            </div>
            <div style="display: table-cell; text-align: right; vertical-align: middle; font-size: 11px; color: #94a3b8; font-weight: 600;">
                ${hoy}
            </div>
        </div>
    `;

    htmlContenido += `
        <div>
            <h3 style="font-size: 12px; font-weight: 800; color: #10b981; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.05em;"><i class="fa-solid fa-circle-check" style="margin-right: 6px;"></i>Puntos Visitados</h3>
            <div style="display: flex; flex-direction: column; gap: 6px;">
    `;
    
    let tieneVisitados = false;

    if (estadoRuta.modoLibre) {
        Object.keys(CATEGORIAS_CONFIG).forEach(cat => {
            const realizado = estadoRuta.categorias[cat] || 0;
            if (realizado > 0) {
                tieneVisitados = true;
                htmlContenido += `
                    <div style="background: rgba(30, 41, 59, 0.4); padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.03); display: table; width: 100%;">
                        <div style="display: table-cell; text-align: left; font-weight: 700; text-transform: uppercase; font-size: 12px; color: #cbd5e1;">${cat}</div>
                        <div style="display: table-cell; text-align: right; font-weight: 900; color: #10b981; font-size: 14px;">${realizado}</div>
                    </div>
                `;
            }
        });
    } else {
        Object.keys(CATEGORIAS_CONFIG).forEach(cat => {
            const inicial = estadoRuta.totalesIniciales[cat] || 0;
            const faltante = estadoRuta.categorias[cat] || 0;
            const visitados = inicial - faltante;
            
            if (visitados > 0) {
                tieneVisitados = true;
                htmlContenido += `
                    <div style="background: rgba(30, 41, 59, 0.4); padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.03); display: table; width: 100%;">
                        <div style="display: table-cell; text-align: left; font-weight: 700; text-transform: uppercase; font-size: 12px; color: #cbd5e1;">${cat}</div>
                        <div style="display: table-cell; text-align: right; font-weight: 900; color: #10b981; font-size: 14px;">${visitados}</div>
                    </div>
                `;
            }
        });
    }

    if (!tieneVisitados) {
        htmlContenido += `<p style="font-size: 11px; color: #64748b; font-style: italic; margin: 4px 0; padding-left: 4px;">Ninguno.</p>`;
    }
    htmlContenido += `</div></div>`;

    if (!estadoRuta.modoLibre) {
        htmlContenido += `
            <div style="margin-top: 2px;">
                <h3 style="font-size: 12px; font-weight: 800; color: #f59e0b; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.05em;"><i class="fa-solid fa-clock" style="margin-right: 6px;"></i>Puntos Restantes</h3>
                <div style="display: flex; flex-direction: column; gap: 6px;">
        `;
        
        let tieneRestantes = false;
        Object.keys(CATEGORIAS_CONFIG).forEach(cat => {
            const faltante = estadoRuta.categorias[cat] || 0;
            if (faltante > 0) {
                tieneRestantes = true;
                htmlContenido += `
                    <div style="background: rgba(30, 41, 59, 0.4); padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.03); display: table; width: 100%;">
                        <div style="display: table-cell; text-align: left; font-weight: 700; text-transform: uppercase; font-size: 12px; color: #cbd5e1;">${cat}</div>
                        <div style="display: table-cell; text-align: right; font-weight: 900; color: #f59e0b; font-size: 14px;">${faltante}</div>
                    </div>
                `;
            }
        });
        if (!tieneRestantes) {
            htmlContenido += `<p style="font-size: 12px; color: #10b981; font-weight: 700; font-style: italic; margin: 4px 0; padding-left: 4px;"><i class="fa-solid fa-star mr-1"></i> ¡Todo cubierto al 100%!</p>`;
        }
        htmlContenido += `</div></div>`;
    }

    htmlContenido += `
        <div style="margin-top: 6px; text-align: center; font-size: 10px; color: #475569; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px; font-weight: 600;">
            Generado automáticamente desde RouteTask Pro
        </div>
    `;

    reporteDiv.innerHTML = htmlContenido;
    document.body.appendChild(reporteDiv);

    html2canvas(reporteDiv, { backgroundColor: "#0f172a", scale: 2 }).then(canvas => {
        const urlImagen = canvas.toDataURL("image/png");
        const enlaceDescarga = document.createElement("a");
        enlaceDescarga.download = `Reporte_Ruta_${hoy.replace(/\//g, '-')}.png`;
        enlaceDescarga.href = urlImagen;
        enlaceDescarga.click();
        document.body.removeChild(reporteDiv);
    }).catch(err => {
        console.error("Error al generar imagen:", err);
        alert("Ocurrió un inconveniente.");
        document.body.removeChild(reporteDiv);
    });
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

function regenerarReporteHistorial(idRuta) {
    const rutaEncontrada = historialRutas.find(r => r.id === idRuta);
    if (!rutaEncontrada) {
        alert("No se encontraron los datos de este recorrido.");
        return;
    }

    const fechaRuta = new Date(rutaEncontrada.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    const reporteDiv = document.createElement("div");
    reporteDiv.style.position = "absolute";
    reporteDiv.style.left = "-9999px";
    reporteDiv.style.top = "-9999px";
    reporteDiv.className = "w-[360px] bg-[#0f172a] text-slate-100 p-6 font-sans flex flex-col gap-5 border border-slate-800";
    
    let htmlContenido = `
        <div style="border-bottom: 2px solid rgba(56, 189, 248, 0.2); padding-bottom: 12px; display: table; width: 100%;">
            <div style="display: table-cell; vertical-align: middle;">
                <h2 style="font-size: 16px; font-weight: 900; color: #fff; margin: 0;">RouteTask Pro</h2>
                <p style="font-size: 10px; color: #38bdf8; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">Reporte de Cobertura</p>
            </div>
            <div style="display: table-cell; text-align: right; vertical-align: middle; font-size: 11px; color: #94a3b8; font-weight: 600;">
                ${fechaRuta}
            </div>
        </div>
    `;

    htmlContenido += `
        <div>
            <h3 style="font-size: 12px; font-weight: 800; color: #10b981; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.05em;"><i class="fa-solid fa-circle-check" style="margin-right: 6px;"></i>Puntos Visitados</h3>
            <div style="display: flex; flex-direction: column; gap: 6px;">
    `;
    
    if (rutaEncontrada.detalles && Object.keys(rutaEncontrada.detalles).length > 0) {
        Object.entries(rutaEncontrada.detalles).forEach(([cat, cant]) => {
            if (cant > 0) {
                htmlContenido += `
                    <div style="background: rgba(30, 41, 59, 0.4); padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.03); display: table; width: 100%;">
                        <div style="display: table-cell; text-align: left; font-weight: 700; text-transform: uppercase; font-size: 12px; color: #cbd5e1;">${cat}</div>
                        <div style="display: table-cell; text-align: right; font-weight: 900; color: #10b981; font-size: 14px;">${cant}</div>
                    </div>
                `;
            }
        });
    } else {
        htmlContenido += `
            <div style="background: rgba(30, 41, 59, 0.4); padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.03); display: table; width: 100%;">
                <div style="display: table-cell; text-align: left; font-weight: 700; text-transform: uppercase; font-size: 12px; color: #cbd5e1;">PUNTOS CONSOLIDADOS</div>
                <div style="display: table-cell; text-align: right; font-weight: 900; color: #10b981; font-size: 14px;">${rutaEncontrada.totalPuntos}</div>
            </div>
        `;
    }

    htmlContenido += `</div></div>`;

    htmlContenido += `
        <div style="margin-top: 6px; text-align: center; font-size: 10px; color: #475569; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px; font-weight: 600;">
            Generado automáticamente desde RouteTask Pro
        </div>
    `;

    reporteDiv.innerHTML = htmlContenido;
    document.body.appendChild(reporteDiv);

    html2canvas(reporteDiv, { backgroundColor: "#0f172a", scale: 2 }).then(canvas => {
        const urlImagen = canvas.toDataURL("image/png");
        const enlaceDescarga = document.createElement("a");
        enlaceDescarga.download = `Reporte_Ruta_${fechaRuta.replace(/\//g, '-')}.png`;
        enlaceDescarga.href = urlImagen;
        enlaceDescarga.click();
        document.body.removeChild(reporteDiv);
    }).catch(err => {
        console.error("Error al generar imagen:", err);
        alert("Ocurrió un inconveniente.");
        document.body.removeChild(reporteDiv);
    });
}
function exportarExcelCSV() {
    if (historialRutas.length === 0) {
        alert("No hay ningún registro en el historial para exportar.");
        return;
    }

    // Encabezados del archivo CSV
    let csvContent = "\uFEFF"; // BOM UTF-8 para que Excel abra los acentos correctamente
    csvContent += "ID Registro;Fecha;Hora;Corte Quincenal;Categorias y Visitas;Total Puntos;Ganancia COP\n";

    historialRutas.forEach(r => {
        const d = new Date(r.fecha);
        const fechaFormat = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const horaFormat = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const corteNombre = obtenerPeriodoCorte(r.fecha);
        
        let desgloseTexto = "";
        if (r.detalles && Object.keys(r.detalles).length > 0) {
            desgloseTexto = Object.entries(r.detalles)
                .filter(([_, cant]) => cant > 0)
                .map(([cat, cant]) => `${cat}: ${cant}`)
                .join(" | ");
        } else {
            desgloseTexto = "Recorrido Consolidado";
        }

        const ganancia = r.totalPuntos * 10000;

        // Fila formateada
        csvContent += `"${r.id}";"${fechaFormat}";"${horaFormat}";"${corteNombre}";"${desgloseTexto}";"${r.totalPuntos}";"$${ganancia.toLocaleString('es-CO')}"\n`;
    });

    // Descargar el archivo generado
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Rutas_RouteTask_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}