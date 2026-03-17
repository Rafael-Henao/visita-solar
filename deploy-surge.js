const { publish } = require('surge');
const path = require('path');

const project = path.join(__dirname, 'deploy');
const domain = 'visita-solar-app.surge.sh';

console.log('Desplegando a:', domain);
console.log('Carpeta:', project);

publish({
  project,
  p: project,
  domain,
  d: domain,
  e: 'a.persa2020@hotmail.com',
  login: 'a.persa2020@hotmail.com',
})(function(err) {
  if (err) {
    console.error('Error:', err.message || err);
  } else {
    console.log('\n¡LISTO! Tu app está en: https://' + domain);
  }
});
