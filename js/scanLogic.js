// Lógica de escaneo y generación de Excel
// Se ejecuta en el navegador del cliente

// Configurar almacenamiento en localStorage para guardar las fotos
// Cada foto se guarda con una estructura específica que incluye:
// - section: sección correspondiente
// - imgData: datos de la imagen base64

// Función para guardar foto en localStorage
function savePhotoToStorage(photosSection, imageData, filename) {
    const photos = JSON.parse(localStorage.getItem('photosBySection') || '{}');
    if (!photos[photosSection]) {
        photos[photosSection] = [];
    }
    photos[photosSection].push({
        data: imageData,
        filename: filename
    });
    localStorage.setItem('photosBySection', JSON.stringify(photos));
    console.log(`Foto guardada en sección: ${photosSection}`);
}

// Función para exportar a Excel con todas las fotos agrupadas por sección
function exportToExcel(photosSection, filename) {
    // Obtener todas las fotos del localStorage
    const photos = JSON.parse(localStorage.getItem('photosBySection') || '{}');
    
    // Crear estructura de datos para Excel
    const excelData = {
        sheet1: {
            headers: ['Sección', 'Fecha', 'Archivo', 'Tipo'],
            data: []
        }
    };
    
    // Agregar fotos de cada sección al Excel
    for (const section in photos) {
        const sectionPhotos = photos[section];
        const date = new Date().toLocaleDateString();
        
        sectionPhotos.forEach(photo => {
            excelData.sheet1.data.push({
                Sección: section,
                Fecha: date,
                Archivo: photo.filename,
                Tipo: 'FOTO'
            });
        });
    }
    
    // Descargar el Excel
    downloadExcel(excelData, filename);
    
    // Limpiar las fotos guardadas
    localStorage.removeItem('photosBySection');
}

// Función para descargar Excel
function downloadExcel(excelData, filename) {
    // Usar librería SheetJS para generar Excel
    // Nota: Esta función necesita la librería xlsx importada
    // Si no está disponible, se puede usar una alternativa simple
    console.log('Generando Excel...');
    console.log('Datos:', excelData);
    
    // Crear URL de descarga
    // Esto requiere una implementación adicional con SheetJS
    // Para ahora, mostramos la estructura de datos
    console.log('Estructura de datos lista para exportar');
    
    // Nota: La exportación real requiere SheetJS
    // Implementaremos una versión básica usando Blob y CSV
    const csv = 'Sección,Fecha,Archivo,Tipo\n';
    excelData.sheet1.data.forEach(row => {
        csv += `${row.Sección},${row.Fecha},${row.Arquivo},${row.Tipo}\n`;
    });
    
    // Crear Blob y descargar
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Función auxiliar para convertir imagen a base64
function convertImageToBase64(imageElement) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = imageElement.naturalWidth;
        canvas.height = imageElement.naturalHeight;
        ctx.drawImage(imageElement, 0, 0);
        
        canvas.toBlob((blob) => {
            if (blob) {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            } else {
                reject(new Error('Error al convertir imagen'));
            }
        }, 'image/jpeg', 0.8);
    });
}

// Exportar la función de conversión para uso externo
window.convertImageToBase64 = convertImageToBase64;