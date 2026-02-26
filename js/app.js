// ========================================================
// APP.JS - Visitas Técnicas para Paneles Solares
// ========================================================

(function () {
    'use strict';

    let currentStep = 1;
    let photos = [];
    let firmaCtx, firmaCanvas, firmaDibujando = false;

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        setFechaHoraActual();
        initNavigation();
        initSteps();
        initGPS();
        initPhotos();
        initFirma();
        initActions();
        initConfig();
        registerServiceWorker();
    }

    // ========== FECHA/HORA ACTUAL ==========
    function setFechaHoraActual() {
        const now = new Date();
        document.getElementById('fecha').value = now.toISOString().split('T')[0];
        document.getElementById('hora').value = now.toTimeString().slice(0, 5);
    }

    // ========== NAVEGACIÓN / MENÚ ==========
    function initNavigation() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        const btnMenu = document.getElementById('btn-menu');
        const btnClose = document.getElementById('btn-close-menu');

        btnMenu.addEventListener('click', () => {
            sidebar.classList.add('open');
            overlay.classList.add('active');
        });

        function closeSidebar() {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        }

        btnClose.addEventListener('click', closeSidebar);
        overlay.addEventListener('click', closeSidebar);

        document.querySelectorAll('.sidebar nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const action = link.dataset.action;
                document.querySelectorAll('.sidebar nav a').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

                switch (action) {
                    case 'nueva-visita':
                        document.getElementById('view-nueva-visita').classList.add('active');
                        break;
                    case 'historial':
                        document.getElementById('view-historial').classList.add('active');
                        renderHistorial();
                        break;
                    case 'exportar-todo':
                        exportarTodoExcel();
                        break;
                    case 'sync-sheets':
                        sincronizarGoogleSheets();
                        break;
                    case 'configuracion':
                        document.getElementById('view-configuracion').classList.add('active');
                        updateConfigInfo();
                        break;
                }
                closeSidebar();
            });
        });
    }

    // ========== PASOS DEL FORMULARIO ==========
    function initSteps() {
        document.querySelectorAll('.btn-next').forEach(btn => {
            btn.addEventListener('click', () => goToStep(parseInt(btn.dataset.next)));
        });
        document.querySelectorAll('.btn-prev').forEach(btn => {
            btn.addEventListener('click', () => goToStep(parseInt(btn.dataset.prev)));
        });
    }

    function goToStep(step) {
        document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.step-indicator .step').forEach(s => {
            s.classList.remove('active');
            const stepNum = parseInt(s.dataset.step);
            if (stepNum < step) s.classList.add('completed');
            else s.classList.remove('completed');
        });
        document.getElementById('step-' + step).classList.add('active');
        document.querySelector('.step[data-step="' + step + '"]').classList.add('active');
        currentStep = step;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ========== GPS ==========
    function initGPS() {
        document.getElementById('btn-gps').addEventListener('click', () => {
            if (!navigator.geolocation) {
                showToast('GPS no disponible en este dispositivo', 'error');
                return;
            }
            const btn = document.getElementById('btn-gps');
            btn.textContent = '⏳ Obteniendo...';
            btn.disabled = true;

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    document.getElementById('gps-coords').value =
                        pos.coords.latitude.toFixed(6) + ', ' + pos.coords.longitude.toFixed(6);
                    btn.textContent = '📍 Obtener';
                    btn.disabled = false;
                    showToast('Ubicación obtenida ✓', 'success');
                },
                (err) => {
                    showToast('Error GPS: ' + err.message, 'error');
                    btn.textContent = '📍 Obtener';
                    btn.disabled = false;
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    }

    // ========== FOTOS ==========
    function initPhotos() {
        const cameraInput = document.getElementById('camera-input');
        const galleryInput = document.getElementById('gallery-input');

        document.getElementById('btn-take-photo').addEventListener('click', () => cameraInput.click());
        document.getElementById('btn-upload-photo').addEventListener('click', () => galleryInput.click());

        cameraInput.addEventListener('change', handlePhotos);
        galleryInput.addEventListener('change', handlePhotos);
    }

    function handlePhotos(e) {
        const files = e.target.files;
        if (!files.length) return;
        if (photos.length + files.length > 10) {
            showToast('Máximo 10 fotos permitidas', 'error');
            return;
        }
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                compressImage(ev.target.result, 800, 0.7, (compressed) => {
                    photos.push(compressed);
                    renderPhotos();
                });
            };
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    }

    function compressImage(dataUrl, maxWidth, quality, callback) {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let w = img.width, h = img.height;
            if (w > maxWidth) { h = (maxWidth / w) * h; w = maxWidth; }
            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            callback(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = dataUrl;
    }

    function renderPhotos() {
        const gallery = document.getElementById('photo-gallery');
        if (photos.length === 0) {
            gallery.innerHTML = '<div class="photo-placeholder"><span>📷</span><p>Aún no hay fotos</p></div>';
            return;
        }
        gallery.innerHTML = photos.map((photo, i) =>
            '<div class="photo-item">' +
            '<img src="' + photo + '" alt="Foto ' + (i + 1) + '">' +
            '<button class="photo-delete" data-index="' + i + '">✕</button>' +
            '<span class="photo-number">' + (i + 1) + '/' + photos.length + '</span>' +
            '</div>'
        ).join('');

        gallery.querySelectorAll('.photo-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                photos.splice(parseInt(btn.dataset.index), 1);
                renderPhotos();
            });
        });
    }

    // ========== FIRMA DIGITAL ==========
    function initFirma() {
        firmaCanvas = document.getElementById('firma-canvas');
        firmaCtx = firmaCanvas.getContext('2d');

        function resizeCanvas() {
            const container = firmaCanvas.parentElement;
            firmaCanvas.width = container.offsetWidth;
            firmaCanvas.height = 200;
            firmaCtx.strokeStyle = '#333';
            firmaCtx.lineWidth = 2;
            firmaCtx.lineCap = 'round';
            firmaCtx.lineJoin = 'round';
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        firmaCanvas.addEventListener('mousedown', startDraw);
        firmaCanvas.addEventListener('mousemove', draw);
        firmaCanvas.addEventListener('mouseup', stopDraw);
        firmaCanvas.addEventListener('mouseleave', stopDraw);

        firmaCanvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDraw(getTouchPos(e)); });
        firmaCanvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(getTouchPos(e)); });
        firmaCanvas.addEventListener('touchend', stopDraw);

        document.getElementById('btn-limpiar-firma').addEventListener('click', () => {
            firmaCtx.clearRect(0, 0, firmaCanvas.width, firmaCanvas.height);
        });
    }

    function getTouchPos(e) {
        const rect = firmaCanvas.getBoundingClientRect();
        const touch = e.touches[0];
        return { offsetX: touch.clientX - rect.left, offsetY: touch.clientY - rect.top };
    }

    function startDraw(e) {
        firmaDibujando = true;
        firmaCtx.beginPath();
        firmaCtx.moveTo(e.offsetX, e.offsetY);
    }

    function draw(e) {
        if (!firmaDibujando) return;
        firmaCtx.lineTo(e.offsetX, e.offsetY);
        firmaCtx.stroke();
    }

    function stopDraw() { firmaDibujando = false; }

    // ========== RECOLECTAR DATOS ==========
    function recolectarDatos() {
        const data = {
            // Datos del Cliente
            fecha: document.getElementById('fecha').value,
            hora: document.getElementById('hora').value,
            cliente: document.getElementById('empresa').value,
            email: document.getElementById('email-cliente').value,
            telefono: document.getElementById('telefono').value,
            direccion: document.getElementById('direccion').value,
            gps: document.getElementById('gps-coords').value,
            responsableVisita: document.getElementById('responsable-visita').value,
            tipoCliente: document.getElementById('tipo-cliente').value,
            tarifaCFE: document.getElementById('tarifa-cfe').value,
            consumoBimestral: document.getElementById('consumo-bimestral').value,
            pagoBimestral: document.getElementById('pago-bimestral').value,
            motivo: document.getElementById('motivo').value,

            // Checklist
            checklist: {},
            tipoTecho: document.getElementById('tipo-techo').value,
            numeroServicioCFE: document.getElementById('numero-servicio-cfe').value,
            observacionesChecklist: document.getElementById('observaciones-checklist').value,

            // Mediciones
            mediciones: {
                areaLargo: document.getElementById('area-largo').value,
                areaAncho: document.getElementById('area-ancho').value,
                areaUtil: document.getElementById('area-util').value,
                inclinacionTecho: document.getElementById('inclinacion-techo').value,
                azimut: document.getElementById('azimut').value,
                alturaTecho: document.getElementById('altura-techo').value,
                horasSolarPico: document.getElementById('horas-solar-pico').value,
                irradiancia: document.getElementById('irradiancia').value,
                voltajeRed: document.getElementById('voltaje-red').value,
                capacidadInterruptor: document.getElementById('capacidad-interruptor').value,
                calibreAcometida: document.getElementById('calibre-acometida').value,
                panelesEstimados: document.getElementById('paneles-estimados').value,
                potenciaSistema: document.getElementById('potencia-sistema').value,
                generacionEstimada: document.getElementById('generacion-estimada').value
            },
            equipoMedicion: document.getElementById('equipo-medicion').value,
            observacionesMediciones: document.getElementById('observaciones-mediciones').value,

            // Fotos
            fotos: photos.slice(),
            observacionesFotos: document.getElementById('observaciones-fotos').value,

            // Conclusión
            observacionesGenerales: document.getElementById('observaciones-generales').value,
            recomendaciones: document.getElementById('recomendaciones').value,
            viabilidad: document.getElementById('viabilidad').value,
            presupuestoEstimado: document.getElementById('presupuesto-estimado').value,
            roiEstimado: document.getElementById('roi-estimado').value,
            firma: firmaCanvas.toDataURL('image/png'),
            nombreFirmante: document.getElementById('nombre-firmante').value,

            // Metadata
            id: Date.now(),
            creadoEn: new Date().toISOString()
        };

        // Recolectar checklist
        document.querySelectorAll('.checklist-item input[type="radio"]:checked').forEach(radio => {
            data.checklist[radio.name.replace('check-', '')] = radio.value;
        });

        return data;
    }

    // ========== GUARDAR / EXCEL ==========
    function initActions() {
        document.getElementById('btn-guardar').addEventListener('click', guardarVisita);
        document.getElementById('btn-excel').addEventListener('click', descargarExcel);
    }

    function guardarVisita() {
        const data = recolectarDatos();
        if (!data.cliente) {
            showToast('Por favor llena al menos el nombre del cliente', 'error');
            return;
        }
        const visitas = JSON.parse(localStorage.getItem('visitas_solar') || '[]');
        visitas.push(data);
        localStorage.setItem('visitas_solar', JSON.stringify(visitas));
        showToast('✅ Visita guardada correctamente', 'success');
    }

    function descargarExcel() {
        const data = recolectarDatos();
        if (!data.cliente) {
            showToast('Por favor llena al menos el nombre del cliente', 'error');
            return;
        }

        // Hoja 1: Datos del Cliente
        const clienteRows = [
            ['REPORTE DE VISITA TÉCNICA - PANELES SOLARES'],
            [''],
            ['DATOS DEL CLIENTE'],
            ['Campo', 'Valor'],
            ['Fecha', data.fecha],
            ['Hora', data.hora],
            ['Cliente', data.cliente],
            ['Correo', data.email],
            ['Teléfono', data.telefono],
            ['Dirección', data.direccion],
            ['Coordenadas GPS', data.gps],
            ['Asesor', data.responsableVisita],
            ['Tipo de Cliente', data.tipoCliente],
            ['Tarifa CFE', data.tarifaCFE],
            ['No. Servicio CFE', data.numeroServicioCFE],
            ['Consumo Bimestral (kWh)', data.consumoBimestral],
            ['Pago Bimestral ($)', data.pagoBimestral],
            ['Motivo / Interés', data.motivo],
            [''],
            ['CONCLUSIONES'],
            ['Viabilidad', data.viabilidad],
            ['Presupuesto Estimado ($)', data.presupuestoEstimado],
            ['ROI Estimado (años)', data.roiEstimado],
            ['Observaciones', data.observacionesGenerales],
            ['Recomendaciones', data.recomendaciones],
            ['Firmante', data.nombreFirmante]
        ];

        // Hoja 2: Evaluación del Sitio (Checklist)
        const checkLabels = {
            'techo-estado': 'Estado general del techo',
            'carga-techo': 'Capacidad de carga del techo',
            'impermeabilizacion': 'Impermeabilización',
            'orientacion-sur': 'Orientación hacia el sur',
            'sombras': 'Libre de sombras',
            'espacio': 'Espacio disponible suficiente',
            'centro-carga': 'Centro de carga / Tablero principal',
            'medidor': 'Medidor bidireccional',
            'tierra': 'Sistema de tierra física',
            'protecciones': 'Protecciones eléctricas',
            'ruta-cable': 'Ruta de cableado',
            'contrato-cfe': 'Contrato de CFE vigente',
            'acceso-medidor': 'Acceso al medidor de CFE',
            'acceso-techo': 'Acceso al techo',
            'acceso-vehicular': 'Acceso vehicular'
        };
        const checkRows = [
            ['EVALUACIÓN DEL SITIO'], [''],
            ['Elemento', 'Estado']
        ];
        for (const [key, label] of Object.entries(checkLabels)) {
            checkRows.push([label, (data.checklist[key] || 'Sin evaluar').toUpperCase()]);
        }
        checkRows.push([''], ['Tipo de Techo', data.tipoTecho]);
        checkRows.push(['Observaciones', data.observacionesChecklist]);

        // Hoja 3: Mediciones
        const medRows = [
            ['MEDICIONES DEL SITIO'], [''],
            ['Parámetro', 'Valor', 'Unidad'],
            ['Largo del techo', data.mediciones.areaLargo, 'm'],
            ['Ancho del techo', data.mediciones.areaAncho, 'm'],
            ['Área útil disponible', data.mediciones.areaUtil, 'm²'],
            ['Inclinación del techo', data.mediciones.inclinacionTecho, '°'],
            ['Azimut / Orientación', data.mediciones.azimut, '°'],
            ['Altura del techo', data.mediciones.alturaTecho, 'm'],
            ['Horas Solar Pico', data.mediciones.horasSolarPico, 'HSP'],
            ['Irradiancia', data.mediciones.irradiancia, 'kWh/m²/día'],
            ['Voltaje en Red', data.mediciones.voltajeRed, 'V'],
            ['Interruptor Principal', data.mediciones.capacidadInterruptor, 'A'],
            ['Calibre Acometida', data.mediciones.calibreAcometida, ''],
            [''],
            ['PROPUESTA PRELIMINAR'],
            ['Paneles Estimados', data.mediciones.panelesEstimados, 'pzas'],
            ['Potencia del Sistema', data.mediciones.potenciaSistema, 'kWp'],
            ['Generación Estimada', data.mediciones.generacionEstimada, 'kWh/mes'],
            [''],
            ['Equipo de Medición', data.equipoMedicion],
            ['Observaciones', data.observacionesMediciones]
        ];

        // Crear libro
        const wb = XLSX.utils.book_new();

        const ws1 = XLSX.utils.aoa_to_sheet(clienteRows);
        ws1['!cols'] = [{ wch: 28 }, { wch: 50 }];
        XLSX.utils.book_append_sheet(wb, ws1, 'Cliente');

        const ws2 = XLSX.utils.aoa_to_sheet(checkRows);
        ws2['!cols'] = [{ wch: 40 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, ws2, 'Evaluación Sitio');

        const ws3 = XLSX.utils.aoa_to_sheet(medRows);
        ws3['!cols'] = [{ wch: 28 }, { wch: 15 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, ws3, 'Mediciones');

        const fileName = 'Visita_Solar_' + data.cliente.replace(/\s+/g, '_') + '_' + data.fecha + '.xlsx';
        XLSX.writeFile(wb, fileName);
        showToast('📊 Excel descargado: ' + fileName, 'success');
    }

    function exportarTodoExcel() {
        const visitas = JSON.parse(localStorage.getItem('visitas_solar') || '[]');
        if (visitas.length === 0) {
            showToast('No hay visitas guardadas para exportar', 'error');
            return;
        }

        const rows = [
            ['ID', 'Fecha', 'Hora', 'Cliente', 'Email', 'Teléfono', 'Dirección', 'GPS',
                'Asesor', 'Tipo Cliente', 'Tarifa CFE', 'No. Servicio CFE',
                'Consumo Bimestral kWh', 'Pago Bimestral $', 'Tipo Techo',
                'Área Útil m²', 'Inclinación°', 'Azimut°', 'HSP', 'Irradiancia',
                'Voltaje Red V', 'Paneles', 'Potencia kWp', 'Generación kWh/mes',
                'Viabilidad', 'Presupuesto $', 'ROI años',
                'Observaciones', 'Recomendaciones', 'Firmante']
        ];

        visitas.forEach(v => {
            rows.push([
                v.id, v.fecha, v.hora, v.cliente, v.email, v.telefono, v.direccion, v.gps,
                v.responsableVisita, v.tipoCliente, v.tarifaCFE, v.numeroServicioCFE,
                v.consumoBimestral, v.pagoBimestral, v.tipoTecho,
                v.mediciones?.areaUtil, v.mediciones?.inclinacionTecho, v.mediciones?.azimut,
                v.mediciones?.horasSolarPico, v.mediciones?.irradiancia,
                v.mediciones?.voltajeRed, v.mediciones?.panelesEstimados,
                v.mediciones?.potenciaSistema, v.mediciones?.generacionEstimada,
                v.viabilidad, v.presupuestoEstimado, v.roiEstimado,
                v.observacionesGenerales, v.recomendaciones, v.nombreFirmante
            ]);
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Todas las Visitas');
        XLSX.writeFile(wb, 'Historial_Visitas_Solar_' + new Date().toISOString().split('T')[0] + '.xlsx');
        showToast('📊 Excel con todas las visitas descargado', 'success');
    }

    // ========== GOOGLE SHEETS SYNC ==========
    function sincronizarGoogleSheets() {
        const url = localStorage.getItem('sheets-url');
        if (!url) {
            showToast('Configura la URL de Google Sheets primero', 'error');
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById('view-configuracion').classList.add('active');
            return;
        }

        const visitas = JSON.parse(localStorage.getItem('visitas_solar') || '[]');
        if (visitas.length === 0) {
            showToast('No hay visitas para sincronizar', 'error');
            return;
        }

        showToast('☁️ Sincronizando...', '');

        const datosLimpios = visitas.map(v => {
            const copia = Object.assign({}, v);
            delete copia.fotos;
            delete copia.firma;
            if (copia.checklist) {
                for (const [k, val] of Object.entries(copia.checklist)) {
                    copia['check_' + k] = val;
                }
                delete copia.checklist;
            }
            if (copia.mediciones) {
                for (const [k, val] of Object.entries(copia.mediciones)) {
                    copia['med_' + k] = val;
                }
                delete copia.mediciones;
            }
            return copia;
        });

        fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosLimpios)
        })
            .then(() => showToast('✅ Datos enviados a Google Sheets', 'success'))
            .catch(() => showToast('Error al sincronizar', 'error'));
    }

    // ========== HISTORIAL ==========
    function renderHistorial() {
        const visitas = JSON.parse(localStorage.getItem('visitas_solar') || '[]');
        const container = document.getElementById('historial-list');

        if (visitas.length === 0) {
            container.innerHTML = '<p class="empty-state">No hay visitas guardadas</p>';
            return;
        }

        container.innerHTML = visitas.slice().reverse().map(v =>
            '<div class="historial-card">' +
            '  <div class="historial-card-info">' +
            '    <h4>☀️ ' + (v.cliente || 'Sin nombre') + '</h4>' +
            '    <p>📅 ' + v.fecha + ' ' + v.hora + '</p>' +
            '    <p>📍 ' + (v.direccion || 'Sin dirección') + '</p>' +
            (v.mediciones?.potenciaSistema ? '    <p>⚡ ' + v.mediciones.potenciaSistema + ' kWp - ' + (v.mediciones.panelesEstimados || '?') + ' paneles</p>' : '') +
            (v.viabilidad ? '    <span class="estado-badge ' + v.viabilidad + '">' + v.viabilidad.toUpperCase().replace('-', ' ') + '</span>' : '') +
            '  </div>' +
            '  <div class="historial-card-actions">' +
            '    <button class="btn btn-primary btn-small" onclick="window.appExportarVisita(' + v.id + ')">📊</button>' +
            '    <button class="btn btn-danger btn-small" onclick="window.appEliminarVisita(' + v.id + ')">🗑️</button>' +
            '  </div>' +
            '</div>'
        ).join('');
    }

    window.appExportarVisita = function (id) {
        const visitas = JSON.parse(localStorage.getItem('visitas_solar') || '[]');
        const v = visitas.find(x => x.id === id);
        if (!v) return;

        const rows = [
            ['REPORTE - VISITA TÉCNICA PANELES SOLARES'], [''],
            ['Campo', 'Valor'],
            ['Fecha', v.fecha], ['Cliente', v.cliente], ['Dirección', v.direccion],
            ['Tarifa CFE', v.tarifaCFE], ['Consumo Bimestral', v.consumoBimestral + ' kWh'],
            ['Pago Bimestral', '$' + v.pagoBimestral],
            ['Tipo de Techo', v.tipoTecho],
            ['Área Útil', (v.mediciones?.areaUtil || '') + ' m²'],
            ['Paneles', v.mediciones?.panelesEstimados],
            ['Potencia', (v.mediciones?.potenciaSistema || '') + ' kWp'],
            ['Generación Est.', (v.mediciones?.generacionEstimada || '') + ' kWh/mes'],
            ['Viabilidad', v.viabilidad],
            ['Presupuesto', '$' + (v.presupuestoEstimado || '')],
            ['ROI', (v.roiEstimado || '') + ' años'],
            ['Observaciones', v.observacionesGenerales],
            ['Recomendaciones', v.recomendaciones]
        ];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch: 25 }, { wch: 50 }];
        XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
        XLSX.writeFile(wb, 'Visita_Solar_' + (v.cliente || 'reporte').replace(/\s+/g, '_') + '_' + v.fecha + '.xlsx');
    };

    window.appEliminarVisita = function (id) {
        if (!confirm('¿Eliminar esta visita?')) return;
        let visitas = JSON.parse(localStorage.getItem('visitas_solar') || '[]');
        visitas = visitas.filter(x => x.id !== id);
        localStorage.setItem('visitas_solar', JSON.stringify(visitas));
        renderHistorial();
        showToast('Visita eliminada', 'success');
    };

    // ========== CONFIGURACIÓN ==========
    function initConfig() {
        const savedUrl = localStorage.getItem('sheets-url');
        if (savedUrl) document.getElementById('sheets-url').value = savedUrl;

        document.getElementById('btn-guardar-config').addEventListener('click', () => {
            localStorage.setItem('sheets-url', document.getElementById('sheets-url').value);
            showToast('Configuración guardada ✓', 'success');
        });

        document.getElementById('btn-borrar-todo').addEventListener('click', () => {
            if (!confirm('¿Borrar TODOS los datos? Esta acción no se puede deshacer.')) return;
            if (!confirm('¿Estás seguro?')) return;
            localStorage.removeItem('visitas_solar');
            showToast('Todos los datos fueron eliminados', 'success');
            updateConfigInfo();
        });
    }

    function updateConfigInfo() {
        const visitas = JSON.parse(localStorage.getItem('visitas_solar') || '[]');
        document.getElementById('total-visitas').textContent = visitas.length;
    }

    // ========== TOAST ==========
    function showToast(message, type) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'toast show' + (type ? ' ' + type : '');
        setTimeout(() => { toast.className = 'toast'; }, 3000);
    }

    // ========== SERVICE WORKER ==========
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(() => console.log('Service Worker registrado'))
                .catch(err => console.log('SW Error:', err));
        }
    }

})();
