const https = require('https');
const express = require('express');
const selfsigned = require('selfsigned');
const path = require('path');
const os = require('os');

// Generar certificado autofirmado
const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfsigned.generate(attrs, {
  keySize: 2048,
  days: 365,
  algorithm: 'sha256'
});

const app = express();

// Servir archivos estáticos
app.use(express.static(path.join(__dirname), {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache');
  }
}));

// Crear servidor HTTPS
const server = https.createServer(
  { key: pems.private, cert: pems.cert },
  app
);

const PORT = 8443;
server.listen(PORT, '0.0.0.0', () => {
  // Obtener IPs de red
  const nets = os.networkInterfaces();
  console.log('\n========================================');
  console.log('  SERVIDOR HTTPS INICIADO');
  console.log('========================================');
  console.log(`\n  Local:   https://localhost:${PORT}`);
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`  Red:     https://${net.address}:${PORT}`);
      }
    }
  }
  console.log('\n  INSTRUCCIONES PARA TU CELULAR:');
  console.log('  1. Conecta tu celular a la MISMA red WiFi');
  console.log('  2. Abre Chrome en tu celular');
  console.log('  3. Entra a la URL "Red" de arriba');
  console.log('  4. Chrome mostrara advertencia de seguridad');
  console.log('     -> Toca "Configuracion avanzada"');
  console.log('     -> Toca "Continuar al sitio"');
  console.log('  5. Una vez cargada la pagina, Chrome');
  console.log('     mostrara opcion "Instalar app"');
  console.log('========================================\n');
});
