const sharp = require('sharp');

const svgIcon = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'>
  <defs>
    <linearGradient id='bg' x1='0' y1='0' x2='0.3' y2='1'>
      <stop offset='0%' stop-color='#1B2E5A'/>
      <stop offset='100%' stop-color='#0F1D3D'/>
    </linearGradient>
    <linearGradient id='ribbon' x1='0.5' y1='0' x2='0.5' y2='1'>
      <stop offset='0%' stop-color='#FFD54F'/>
      <stop offset='25%' stop-color='#F7941D'/>
      <stop offset='55%' stop-color='#F47B20'/>
      <stop offset='80%' stop-color='#00A3E0'/>
      <stop offset='100%' stop-color='#0077C0'/>
    </linearGradient>
  </defs>
  <rect width='512' height='512' rx='90' fill='url(#bg)'/>
  <!-- Ribbon S grande -->
  <path d='M290 80 C240 80, 150 110, 150 175 C150 240, 250 260, 290 290 C330 320, 370 350, 370 410 C370 470, 290 500, 220 500 C185 500, 150 485, 135 470'
        stroke='url(#ribbon)' stroke-width='58' fill='none' stroke-linecap='round' stroke-linejoin='round'/>
  <!-- Brillo interno -->
  <path d='M290 80 C240 80, 150 110, 150 175 C150 240, 250 260, 290 290 C330 320, 370 350, 370 410 C370 470, 290 500, 220 500 C185 500, 150 485, 135 470'
        stroke='rgba(255,255,255,0.2)' stroke-width='22' fill='none' stroke-linecap='round' stroke-linejoin='round'/>
</svg>`;

Promise.all([
  sharp(Buffer.from(svgIcon)).resize(512, 512).png().toFile('deploy/icons/icon-512.png'),
  sharp(Buffer.from(svgIcon)).resize(192, 192).png().toFile('deploy/icons/icon-192.png')
]).then(() => console.log('Iconos Solix ribbon generados OK'));
