// ========================================================
// APP.JS - Visitas Técnicas para Paneles Solares
// ========================================================

(function () {
    'use strict';

    let currentStep = 1;
    let photos = [];
    let techoPhotos = [];
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
        // Mostrar/ocultar horas de respaldo según el checkbox de baterías
        const chkBaterias = document.getElementById('requiere-baterias');
        const horasRespaldoGroup = document.getElementById('horas-respaldo-group');
        if (chkBaterias && horasRespaldoGroup) {
            chkBaterias.addEventListener('change', function() {
                horasRespaldoGroup.style.display = this.checked ? '' : 'none';
            });
        }
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
        // Click directo en los indicadores de paso
        document.querySelectorAll('.step-indicator .step').forEach(step => {
            step.addEventListener('click', () => {
                goToStep(parseInt(step.dataset.step));
            });
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

    // ========== GPS + ANÁLISIS SOLAR ==========
    function initGPS() {
        // Botón GPS básico del paso 1
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
        // Botón Análisis Solar completo (Paso 2)
        const btnSolar = document.getElementById('btn-solar-analysis');
        if (btnSolar) {
            btnSolar.addEventListener('click', runSolarAnalysis);
        }

        // Botón abrir Google Maps
        const btnGmaps = document.getElementById('btn-open-gmaps');
        if (btnGmaps) {
            btnGmaps.addEventListener('click', () => {
                const coords = document.getElementById('gps-coords').value;
                if (coords) {
                    window.open('https://www.google.com/maps/@' + coords.replace(' ', '') + ',18z/data=!3m1!1e1', '_blank');
                }
            });
        }
    }

    function runSolarAnalysis() {
        if (!navigator.geolocation) {
            showToast('GPS no disponible', 'error');
            return;
        }
        const btn = document.getElementById('btn-solar-analysis');
        btn.innerHTML = '⏳ Analizando posición solar...';
        btn.classList.add('loading');

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const acc = pos.coords.accuracy;
                const alt = pos.coords.altitude;

                // Guardar coords en paso 1 también
                document.getElementById('gps-coords').value = lat.toFixed(6) + ', ' + lng.toFixed(6);

                // Mostrar mapa satelital
                showSatelliteMap(lat, lng);

                // Mostrar datos GPS
                showGPSData(lat, lng, acc, alt);

                // Calcular y mostrar trayectoria solar
                showSunTrajectory(lat, lng);

                btn.innerHTML = '✅ Análisis completado — Toca para actualizar';
                btn.classList.remove('loading');
                showToast('Análisis solar completo ✓', 'success');
            },
            (err) => {
                showToast('Error GPS: ' + err.message, 'error');
                btn.innerHTML = '🛰️ Obtener Análisis Solar';
                btn.classList.remove('loading');
            },
            { enableHighAccuracy: true, timeout: 15000 }
        );
    }

    function showSatelliteMap(lat, lng) {
        const container = document.getElementById('solar-map-container');
        const iframe = document.getElementById('map-iframe');
        // Usar OpenStreetMap embed (gratuito, sin API key)
        iframe.src = 'https://www.openstreetmap.org/export/embed.html?bbox=' +
            (lng - 0.003) + ',' + (lat - 0.002) + ',' + (lng + 0.003) + ',' + (lat + 0.002) +
            '&layer=mapnik&marker=' + lat + ',' + lng;
        container.style.display = 'block';
    }

    function showGPSData(lat, lng, accuracy, altitude) {
        const section = document.getElementById('solar-gps-data');
        document.getElementById('solar-lat').textContent = 'Lat: ' + lat.toFixed(6) + '°';
        document.getElementById('solar-lng').textContent = 'Lng: ' + lng.toFixed(6) + '°';
        document.getElementById('solar-accuracy').textContent = '± ' + (accuracy ? accuracy.toFixed(0) : '--') + ' m';
        document.getElementById('solar-altitude').textContent = altitude ? altitude.toFixed(0) + ' m.s.n.m.' : 'No disponible';
        section.style.display = 'grid';
    }

    // ========== CÁLCULOS SOLARES (SunCalc) ==========
    // Algoritmos basados en NOAA Solar Calculator
    function calcSunPosition(date, lat, lng) {
        const rad = Math.PI / 180;
        const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
        const B = (360 / 365) * (dayOfYear - 81) * rad;

        // Ecuación del tiempo (minutos)
        const EoT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

        // Declinación solar
        const decl = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * rad);
        const declRad = decl * rad;
        const latRad = lat * rad;

        // Hora solar
        const solarNoonMin = 720 - 4 * lng - EoT;
        const tzOffset = -date.getTimezoneOffset();
        const solarNoon = solarNoonMin + tzOffset;

        // Ángulo horario del amanecer/atardecer
        const cosHA = (Math.sin(-0.833 * rad) - Math.sin(latRad) * Math.sin(declRad)) /
                       (Math.cos(latRad) * Math.cos(declRad));

        let sunrise, sunset, daylight;
        if (cosHA > 1 || cosHA < -1) {
            // Sol no sale o no se pone
            sunrise = null; sunset = null; daylight = cosHA < -1 ? 24 : 0;
        } else {
            const HA = Math.acos(cosHA) / rad;
            const riseMin = solarNoon - HA * 4;
            const setMin = solarNoon + HA * 4;
            sunrise = riseMin;
            sunset = setMin;
            daylight = (setMin - riseMin) / 60;
        }

        // Elevación solar máxima (al mediodía solar)
        const maxElevation = 90 - Math.abs(lat - decl);

        // Azimut del amanecer y atardecer
        const cosAzSunrise = (Math.sin(declRad) - Math.sin(latRad) * Math.sin(-0.833 * rad)) /
                              (Math.cos(latRad) * Math.cos(-0.833 * rad));
        const azSunrise = Math.acos(Math.max(-1, Math.min(1, cosAzSunrise))) / rad;
        const azSunset = 360 - azSunrise;

        // Posición actual del sol
        const nowMin = date.getHours() * 60 + date.getMinutes() + tzOffset - (solarNoonMin - 720 + tzOffset);
        const hourAngle = nowMin / 4; // grados
        const hourAngleRad = hourAngle * rad;
        const sinElev = Math.sin(latRad) * Math.sin(declRad) +
                         Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourAngleRad);
        const currentElevation = Math.asin(Math.max(-1, Math.min(1, sinElev))) / rad;

        const cosAz = (Math.sin(declRad) - Math.sin(latRad) * sinElev) /
                       (Math.cos(latRad) * Math.cos(Math.asin(sinElev)));
        let currentAzimuth = Math.acos(Math.max(-1, Math.min(1, cosAz))) / rad;
        if (hourAngle > 0) currentAzimuth = 360 - currentAzimuth;

        return {
            sunrise, sunset, solarNoon, daylight,
            maxElevation, decl,
            azSunrise, azSunset,
            currentElevation, currentAzimuth
        };
    }

    function minToTime(minutes) {
        if (minutes == null) return '--:--';
        const h = Math.floor(minutes / 60) % 24;
        const m = Math.round(minutes % 60);
        return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    }

    function showSunTrajectory(lat, lng) {
        const now = new Date();
        const sun = calcSunPosition(now, lat, lng);
        const section = document.getElementById('solar-sun-data');

        // Tiempos
        document.getElementById('sun-rise-time').textContent = minToTime(sun.sunrise);
        document.getElementById('sun-set-time').textContent = minToTime(sun.sunset);
        document.getElementById('sun-noon-time').textContent = minToTime(sun.solarNoon);

        // Azimuts y elevación
        document.getElementById('sun-rise-azimuth').textContent = 'Azimut: ' + sun.azSunrise.toFixed(1) + '°';
        document.getElementById('sun-set-azimuth').textContent = 'Azimut: ' + sun.azSunset.toFixed(1) + '°';
        document.getElementById('sun-noon-elevation').textContent = 'Elevación máx: ' + sun.maxElevation.toFixed(1) + '°';

        // Extras
        document.getElementById('sun-daylight').textContent = sun.daylight.toFixed(1) + ' horas';

        // Orientación óptima (para hemisferio correspondiente)
        const hemisphere = lat >= 0 ? 'Sur (180°)' : 'Norte (0°)';
        document.getElementById('sun-optimal-orientation').textContent = hemisphere;

        // Inclinación óptima ≈ latitud
        document.getElementById('sun-optimal-tilt').textContent = Math.abs(lat).toFixed(0) + '°';

        // Posición actual
        if (sun.currentElevation > 0) {
            document.getElementById('sun-current-pos').textContent =
                'Az: ' + sun.currentAzimuth.toFixed(0) + '° | Elev: ' + sun.currentElevation.toFixed(1) + '°';
        } else {
            document.getElementById('sun-current-pos').textContent = 'Bajo el horizonte 🌙';
        }

        section.style.display = 'block';

        // Dibujar brújula solar
        drawSolarCompass(sun, lat);
    }

    function drawSolarCompass(sun, lat) {
        const canvas = document.getElementById('solar-compass');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        const cx = w / 2, cy = h / 2, r = (w / 2) - 30;

        ctx.clearRect(0, 0, w, h);

        // Fondo circular
        const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r + 20);
        bgGrad.addColorStop(0, '#E8F0FE');
        bgGrad.addColorStop(1, '#C5D5F0');
        ctx.beginPath();
        ctx.arc(cx, cy, r + 20, 0, Math.PI * 2);
        ctx.fillStyle = bgGrad;
        ctx.fill();

        // Círculos de elevación
        for (let elev = 30; elev <= 90; elev += 30) {
            const eR = r * (1 - elev / 90);
            ctx.beginPath();
            ctx.arc(cx, cy, eR, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(27,46,90,0.15)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = 'rgba(27,46,90,0.35)';
            ctx.font = '9px sans-serif';
            ctx.fillText(elev + '°', cx + 3, cy - eR + 11);
        }

        // Puntos cardinales
        const cardinals = [
            { label: 'N', angle: 0, color: '#E53935' },
            { label: 'E', angle: 90, color: '#1B2E5A' },
            { label: 'S', angle: 180, color: '#1B2E5A' },
            { label: 'O', angle: 270, color: '#1B2E5A' }
        ];
        const rad = Math.PI / 180;
        cardinals.forEach(c => {
            const a = (c.angle - 90) * rad;
            const x = cx + (r + 14) * Math.cos(a);
            const y = cy + (r + 14) * Math.sin(a);
            ctx.fillStyle = c.color;
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(c.label, x, y);
        });

        // Trayectoria del sol (arco de amanecer a atardecer)
        if (sun.sunrise != null && sun.sunset != null) {
            ctx.beginPath();
            ctx.strokeStyle = '#F7941D';
            ctx.lineWidth = 3;
            ctx.setLineDash([]);

            const steps = 60;
            const riseMin = sun.sunrise;
            const setMin = sun.sunset;
            for (let i = 0; i <= steps; i++) {
                const t = riseMin + (setMin - riseMin) * (i / steps);
                const nowDate = new Date();
                const fakeDate = new Date(nowDate);
                const tzOff = -nowDate.getTimezoneOffset();
                // Calcular ángulo horario para este momento
                const minutesFromNoon = t - sun.solarNoon;
                const ha = minutesFromNoon / 4 * rad;
                const latRad = lat * rad;
                const declRad = sun.decl * rad;
                const sinE = Math.sin(latRad) * Math.sin(declRad) + Math.cos(latRad) * Math.cos(declRad) * Math.cos(ha);
                const elev = Math.asin(Math.max(-1, Math.min(1, sinE))) / rad;
                const cosAz = (Math.sin(declRad) - Math.sin(latRad) * sinE) / (Math.cos(latRad) * Math.cos(Math.asin(sinE)));
                let az = Math.acos(Math.max(-1, Math.min(1, cosAz))) / rad;
                if (minutesFromNoon > 0) az = 360 - az;

                const pr = r * (1 - Math.max(0, elev) / 90);
                const pa = (az - 90) * rad;
                const px = cx + pr * Math.cos(pa);
                const py = cy + pr * Math.sin(pa);

                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();

            // Punto de amanecer 🌅
            const rAz = (sun.azSunrise - 90) * rad;
            ctx.beginPath();
            ctx.arc(cx + r * Math.cos(rAz), cy + r * Math.sin(rAz), 6, 0, Math.PI * 2);
            ctx.fillStyle = '#FFB74D';
            ctx.fill();
            ctx.strokeStyle = '#E65100'; ctx.lineWidth = 1.5; ctx.stroke();

            // Punto de atardecer 🌇
            const sAz = (sun.azSunset - 90) * rad;
            ctx.beginPath();
            ctx.arc(cx + r * Math.cos(sAz), cy + r * Math.sin(sAz), 6, 0, Math.PI * 2);
            ctx.fillStyle = '#E65100';
            ctx.fill();
            ctx.strokeStyle = '#BF360C'; ctx.lineWidth = 1.5; ctx.stroke();

            // Sol actual (si está sobre horizonte)
            if (sun.currentElevation > 0) {
                const cR = r * (1 - sun.currentElevation / 90);
                const cA = (sun.currentAzimuth - 90) * rad;
                const sx = cx + cR * Math.cos(cA);
                const sy = cy + cR * Math.sin(cA);

                // Resplandor
                const sunGlow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 14);
                sunGlow.addColorStop(0, 'rgba(247,148,29,0.8)');
                sunGlow.addColorStop(1, 'rgba(247,148,29,0)');
                ctx.beginPath();
                ctx.arc(sx, sy, 14, 0, Math.PI * 2);
                ctx.fillStyle = sunGlow;
                ctx.fill();

                // Sol
                ctx.beginPath();
                ctx.arc(sx, sy, 7, 0, Math.PI * 2);
                ctx.fillStyle = '#F7941D';
                ctx.fill();
                ctx.strokeStyle = '#FF6F00'; ctx.lineWidth = 2; ctx.stroke();
            }
        }

        // Línea norte (roja)
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx, cy - r);
        ctx.strokeStyle = 'rgba(229,57,53,0.3)';
        ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // ========== FOTOS ==========
    function initPhotos() {
        const cameraInput = document.getElementById('camera-input');
        const galleryInput = document.getElementById('gallery-input');

        document.getElementById('btn-take-photo').addEventListener('click', () => cameraInput.click());
        document.getElementById('btn-upload-photo').addEventListener('click', () => galleryInput.click());

        cameraInput.addEventListener('change', handlePhotos);
        galleryInput.addEventListener('change', handlePhotos);

        initDynamicAreas();
    }

    // Áreas dinámicas disponibles
    function initDynamicAreas() {
        const container = document.getElementById('areas-container');
        const btnAdd = document.getElementById('btn-add-area');
        if (!container || !btnAdd) return;

        btnAdd.addEventListener('click', () => {
            const current = container.querySelectorAll('.area-item').length;
            const index = current + 1;
            const div = document.createElement('div');
            div.className = 'area-item';
            div.dataset.index = String(index);
            div.innerHTML = `
                <div class="form-group">
                    <label for="area-${index}-descripcion">Descripción del área</label>
                    <input type="text" id="area-${index}-descripcion" placeholder="Ej: Techo bodega / parqueadero">
                </div>
                <div class="form-group">
                    <label for="area-${index}-largo">Largo del techo (m)</label>
                    <input type="number" id="area-${index}-largo" step="0.1" placeholder="12.0">
                </div>
                <div class="form-group">
                    <label for="area-${index}-ancho">Ancho del techo (m)</label>
                    <input type="number" id="area-${index}-ancho" step="0.1" placeholder="8.0">
                </div>
                <div class="form-group">
                    <label for="area-${index}-util">Área útil disponible (m²)</label>
                    <input type="number" id="area-${index}-util" step="0.1" placeholder="80.0">
                </div>
                <div class="form-group">
                    <label for="area-${index}-fotos">📸 Fotos del área</label>
                    <input type="file" id="area-${index}-fotos" accept="image/*" multiple>
                </div>
                <button type="button" class="btn btn-small btn-danger btn-remove-area">Quitar esta área</button>
                <hr style="margin:0.8rem 0; border:none; border-top:1px dashed var(--border);">
            `;
            container.appendChild(div);

            const btnRemove = div.querySelector('.btn-remove-area');
            if (btnRemove) {
                btnRemove.addEventListener('click', () => {
                    container.removeChild(div);
                });
            }
        });
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

    // ========== FOTOS DEL TECHO ==========
    function initTechoPhotos() {
        const techoCamera = document.getElementById('techo-camera-input');
        const techoGallery = document.getElementById('techo-gallery-input');
        
        const btnCamera = document.getElementById('btn-techo-camara');
        const btnGallery = document.getElementById('btn-techo-galeria');
        
        if (btnCamera) btnCamera.addEventListener('click', () => techoCamera.click());
        if (btnGallery) btnGallery.addEventListener('click', () => techoGallery.click());
        
        if (techoCamera) techoCamera.addEventListener('change', handleTechoPhotos);
        if (techoGallery) techoGallery.addEventListener('change', handleTechoPhotos);
    }

    function handleTechoPhotos(e) {
        const files = e.target.files;
        if (!files.length) return;
        if (techoPhotos.length + files.length > 5) {
            showToast('Máximo 5 fotos del techo permitidas', 'error');
            return;
        }
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                compressImage(ev.target.result, 800, 0.7, (compressed) => {
                    techoPhotos.push(compressed);
                    renderTechoPhotos();
                });
            };
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    }

    function renderTechoPhotos() {
        const gallery = document.getElementById('techo-gallery');
        if (!gallery) return;
        
        if (techoPhotos.length === 0) {
            gallery.innerHTML = '<div class="photo-placeholder"><span>🏠</span><p>Sin fotos del techo</p></div>';
            return;
        }
        gallery.innerHTML = techoPhotos.map((photo, i) =>
            '<div class="photo-item">' +
            '<img src="' + photo + '" alt="Techo ' + (i + 1) + '">' +
            '<button class="photo-delete" data-index="' + i + '">✕</button>' +
            '<span class="photo-number">' + (i + 1) + '/' + techoPhotos.length + '</span>' +
            '</div>'
        ).join('');

        gallery.querySelectorAll('.photo-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                techoPhotos.splice(parseInt(btn.dataset.index), 1);
                renderTechoPhotos();
            });
        });
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
        if (!firmaCanvas) return;
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

    // ========== ACCIONES (GUARDAR / EXCEL) ==========
    function initActions() {
        const btnGuardar = document.getElementById('btn-guardar');
        const btnExcel = document.getElementById('btn-excel');

        if (btnGuardar) {
            btnGuardar.addEventListener('click', () => {
                const data = recolectarDatos();
                const visitas = JSON.parse(localStorage.getItem('visitas_solar') || '[]');
                visitas.push(data);
                localStorage.setItem('visitas_solar', JSON.stringify(visitas));
                showToast('Visita guardada ✓', 'success');
                updateConfigInfo();
            });
        }

        if (btnExcel) {
            btnExcel.addEventListener('click', () => {
                const data = recolectarDatos();
                generarExcel(data);
            });
        }
    }

    function generarExcel(data) {
        // --- NUEVA IMPLEMENTACIÓN SOLO CON EXCELJS ---
        const workbook = new ExcelJS.Workbook();
        // Hoja 1: Cliente
        const ws1 = workbook.addWorksheet('Cliente');
        ws1.addRow(['DATOS DEL CLIENTE']);
        ws1.addRow(['Campo', 'Valor']);
        ws1.addRow(['Fecha', data.fecha]);
        ws1.addRow(['Hora', data.hora]);
        ws1.addRow(['Cliente', data.cliente]);
        ws1.addRow(['Correo', data.email]);
        ws1.addRow(['Teléfono', data.telefono]);
        ws1.addRow(['Dirección', data.direccion]);
        ws1.addRow(['Coordenadas GPS', data.gps]);
        ws1.addRow(['Asesor', data.responsableVisita]);
        ws1.addRow(['Tipo de Cliente', data.tipoCliente]);
        ws1.addRow(['Tarifa CFE', data.tarifaCFE]);
        ws1.addRow(['Kilovatios Contratados (kW)', data.kilovatiosContratados]);
        ws1.addRow(['¿Requiere Baterías?', data.requiereBaterias ? 'Sí' : 'No']);
        ws1.addRow(['Horas de Respaldo', data.requiereBaterias ? data.horasRespaldo : '']);
        ws1.addRow(['Consumo Bimestral (kWh)', data.consumoBimestral]);
        ws1.addRow(['Pago Bimestral (COP)', data.pagoBimestral]);
        ws1.addRow(['Motivo / Interés', data.motivo]);
        ws1.addRow(['']);
        ws1.addRow(['CONCLUSIONES']);
        ws1.addRow(['Viabilidad', data.viabilidad]);
        ws1.addRow(['Observaciones', data.observacionesGenerales]);
        ws1.addRow(['Recomendaciones', data.recomendaciones]);
        ws1.columns = [{ width: 28 }, { width: 50 }];

        // Hoja 2: Evaluación del Sitio
        const ws2 = workbook.addWorksheet('Evaluación Sitio');
        ws2.addRow(['EVALUACIÓN DEL SITIO']);
        ws2.addRow(['']);
        ws2.addRow(['Elemento', 'Estado']);
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
            'contrato-proveedor': 'Contrato vigente con el proveedor',
            'acceso-medidor': 'Acceso al medidor de energía',
            'andamio': 'Requiere andamio',
            'acceso-techo': 'Acceso al techo',
            'acceso-vehicular': 'Acceso vehicular'
        };
        for (const [key, label] of Object.entries(checkLabels)) {
            ws2.addRow([label, (data.checklist?.[key] || 'Sin evaluar').toUpperCase()]);
        }
        ws2.addRow(['']);
        ws2.addRow(['Tipo de Techo', data.tipoTecho]);
        ws2.addRow(['Observaciones', data.observacionesChecklist]);
        ws2.columns = [{ width: 40 }, { width: 15 }];

        // Hoja 3: Mediciones
        const ws3 = workbook.addWorksheet('Mediciones');
        ws3.addRow(['MEDICIONES DEL SITIO']);
        ws3.addRow(['']);
        ws3.addRow(['Parámetro', 'Valor', 'Unidad']);
        ws3.addRow(['Largo del techo', data.mediciones?.areaLargo, 'm']);
        ws3.addRow(['Ancho del techo', data.mediciones?.areaAncho, 'm']);
        ws3.addRow(['Área útil disponible', data.mediciones?.areaUtil, 'm²']);
        ws3.addRow(['Inclinación del techo', data.mediciones?.inclinacionTecho, '°']);
        ws3.addRow(['Azimut / Orientación', data.mediciones?.azimut, '°']);
        ws3.addRow(['Altura del techo', data.mediciones?.alturaTecho, 'm']);
        ws3.addRow(['Horas Solar Pico', data.mediciones?.horasSolarPico, 'HSP']);
        ws3.addRow(['Irradiancia', data.mediciones?.irradiancia, 'kWh/m²/día']);
        ws3.addRow(['Voltaje en Red', data.mediciones?.voltajeRed, 'V']);
        ws3.addRow(['Interruptor Principal', data.mediciones?.capacidadInterruptor, 'A']);
        ws3.addRow(['Calibre Acometida', data.mediciones?.calibreAcometida, '']);
        ws3.addRow(['']);
        ws3.addRow(['Distancia tablero → paneles', data.distanciaTableroPaneles, 'm']);
        ws3.addRow(['Potencia transformador', data.transformadorPotencia, 'kVA']);
        ws3.addRow(['Equipo de Medición', data.equipoMedicion]);
        ws3.addRow(['Observaciones', data.observacionesMediciones]);
        ws3.columns = [{ width: 28 }, { width: 15 }, { width: 12 }];

        // Guardar archivo
        const fileName = 'Visita_Solar_' + (data.cliente || 'cliente').replace(/\s+/g, '_') + '_' + data.fecha + '.xlsx';
        workbook.xlsx.writeBuffer().then(buffer => {
            saveAs(new Blob([buffer]), fileName);
            showToast('📊 Excel descargado: ' + fileName, 'success');
        });
    }
    // ========== RECOLECTAR DATOS ==========
    function recolectarDatos() {
        const requiereBaterias = document.getElementById('requiere-baterias')?.checked || false;
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
            kilovatiosContratados: document.getElementById('kilovatios-contratados').value,
            requiereBaterias,
            horasRespaldo: requiereBaterias ? document.getElementById('horas-respaldo')?.value : '',
            consumoBimestral: document.getElementById('consumo-bimestral').value,
            pagoBimestral: document.getElementById('pago-bimestral').value,
            motivo: document.getElementById('motivo').value,

            // Checklist
            checklist: {},
            tipoTecho: document.getElementById('tipo-techo').value,
            observacionesChecklist: document.getElementById('observaciones-checklist').value,
            distanciaTableroPaneles: document.getElementById('distancia-tablero-paneles')?.value || '',
            transformadorPotencia: document.getElementById('transformador-potencia')?.value || '',
            // Mediciones
            mediciones: {
                inclinacionTecho: document.getElementById('inclinacion-techo').value,
                azimut: document.getElementById('azimut').value,
                alturaTecho: document.getElementById('altura-techo').value,
                horasSolarPico: document.getElementById('horas-solar-pico').value,
                irradiancia: document.getElementById('irradiancia').value,
                voltajeRed: document.getElementById('voltaje-red').value,
                capacidadInterruptor: document.getElementById('capacidad-interruptor').value,
                calibreAcometida: document.getElementById('calibre-acometida').value
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
            // Metadata
            id: Date.now(),
            creadoEn: new Date().toISOString()
        };

        // Checklist radios
        document.querySelectorAll('input[type="radio"][name^="check-"]:checked').forEach(r => {
            data.checklist[r.name.replace('check-', '')] = r.value;
        });

        // Áreas disponibles dinámicas
        data.areas = [];
        const areasContainer = document.getElementById('areas-container');
        if (areasContainer) {
            areasContainer.querySelectorAll('.area-item').forEach(div => {
                const index = div.dataset.index;
                if (!index) return;
                const largo = document.getElementById(`area-${index}-largo`)?.value || '';
                const ancho = document.getElementById(`area-${index}-ancho`)?.value || '';
                const util = document.getElementById(`area-${index}-util`)?.value || '';
                const desc = document.getElementById(`area-${index}-descripcion`)?.value || '';
                data.areas.push({
                    descripcion: desc,
                    largo,
                    ancho,
                    areaUtil: util
                });
            });
        }

        // Para compatibilidad con Excel/historial, tomar Área 1 como principal
        const area1 = data.areas[0] || {};
        data.mediciones.areaLargo = area1.largo || '';
        data.mediciones.areaAncho = area1.ancho || '';
        data.mediciones.areaUtil = area1.areaUtil || '';

        return data;
    }

    function exportarTodoExcel() {
        const visitas = JSON.parse(localStorage.getItem('visitas_solar') || '[]');
        if (visitas.length === 0) {
            showToast('No hay visitas guardadas para exportar', 'error');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Todas las Visitas');
        ws.addRow(['ID', 'Fecha', 'Hora', 'Cliente', 'Email', 'Teléfono', 'Dirección', 'GPS',
            'Asesor', 'Tipo Cliente', 'Tarifa CFE', 'kW Contratados',
            'Requiere Baterías', 'Horas Respaldo',
            'Consumo Bimestral kWh', 'Pago Bimestral COP',
            'Tipo Techo',
            'Distancia tablero-paneles (m)', 'Potencia transformador (kVA)',
            'Área Útil m²', 'Inclinación°', 'Azimut°', 'HSP', 'Irradiancia',
            'Voltaje Red V',
            'Viabilidad',
            'Observaciones', 'Recomendaciones']);

        visitas.forEach(v => {
            ws.addRow([
                v.id, v.fecha, v.hora, v.cliente, v.email, v.telefono, v.direccion, v.gps,
                v.responsableVisita, v.tipoCliente, v.tarifaCFE, v.kilovatiosContratados,
                v.requiereBaterias ? 'Sí' : 'No', v.requiereBaterias ? v.horasRespaldo : '',
                v.consumoBimestral, v.pagoBimestral,
                v.tipoTecho,
                v.distanciaTableroPaneles, v.transformadorPotencia,
                v.mediciones?.areaUtil, v.mediciones?.inclinacionTecho, v.mediciones?.azimut,
                v.mediciones?.horasSolarPico, v.mediciones?.irradiancia,
                v.mediciones?.voltajeRed,
                v.viabilidad,
                v.observacionesGenerales, v.recomendaciones
            ]);
        });
        ws.columns = [
            { width: 10 }, { width: 10 }, { width: 8 }, { width: 18 }, { width: 18 }, { width: 14 }, { width: 18 }, { width: 18 },
            { width: 14 }, { width: 12 }, { width: 10 }, { width: 10 }, { width: 8 }, { width: 10 }, { width: 12 }, { width: 14 },
            { width: 12 }, { width: 18 }, { width: 14 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 },
            { width: 10 }, { width: 12 }, { width: 18 }, { width: 18 }
        ];
        const fileName = 'Historial_Visitas_Solar_' + new Date().toISOString().split('T')[0] + '.xlsx';
        workbook.xlsx.writeBuffer().then(buffer => {
            saveAs(new Blob([buffer]), fileName);
            showToast('📊 Excel con todas las visitas descargado', 'success');
        });
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

        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Reporte');
        ws.addRow(['REPORTE - VISITA TÉCNICA PANELES SOLARES']);
        ws.addRow(['']);
        ws.addRow(['Campo', 'Valor']);
        ws.addRow(['Fecha', v.fecha]);
        ws.addRow(['Cliente', v.cliente]);
        ws.addRow(['Dirección', v.direccion]);
        ws.addRow(['Tarifa CFE', v.tarifaCFE]);
        ws.addRow(['Consumo Bimestral', v.consumoBimestral + ' kWh']);
        ws.addRow(['Pago Bimestral', '$' + v.pagoBimestral]);
        ws.addRow(['Tipo de Techo', v.tipoTecho]);
        ws.addRow(['Área Útil', (v.mediciones?.areaUtil || '') + ' m²']);
        ws.addRow(['Paneles', v.mediciones?.panelesEstimados]);
        ws.addRow(['Potencia', (v.mediciones?.potenciaSistema || '') + ' kWp']);
        ws.addRow(['Generación Est.', (v.mediciones?.generacionEstimada || '') + ' kWh/mes']);
        ws.addRow(['Viabilidad', v.viabilidad]);
        ws.addRow(['Presupuesto', '$' + (v.presupuestoEstimado || '')]);
        ws.addRow(['ROI', (v.roiEstimado || '') + ' años']);
        ws.addRow(['Observaciones', v.observacionesGenerales]);
        ws.addRow(['Recomendaciones', v.recomendaciones]);
        ws.columns = [{ width: 25 }, { width: 50 }];
        const fileName = 'Visita_Solar_' + (v.cliente || 'reporte').replace(/\s+/g, '_') + '_' + v.fecha + '.xlsx';
        workbook.xlsx.writeBuffer().then(buffer => {
            saveAs(new Blob([buffer]), fileName);
        });
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
