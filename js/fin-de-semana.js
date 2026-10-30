import { encajar, PLATOS } from './finde.js';

const $ = (id) => document.getElementById(id);
const entero = (n) => Math.round(n).toLocaleString('es-ES');
const numero = (id) => { const v = $(id).value.trim(); return v === '' ? NaN : Number(v); };
const cantidades = {};
let objetivo = 'definicion';
// La barra del total (solo en móvil) se esconde cuando el resultado ya está a la vista.
let visible = false;
function actualizarBarra() {
  const r = $('resultado').getBoundingClientRect();
  visible = r.top < innerHeight - 80 && r.bottom > 0;
  $('barra').hidden = visible || !Object.values(cantidades).some((n) => n > 0);
}
addEventListener('scroll', actualizarBarra, { passive: true });
addEventListener('resize', actualizarBarra);

// Lista de platos con botones − y +.
$('platos').innerHTML = PLATOS.map((p) => `
  <li>
    <span class="plato-nombre">${p.nombre}<small>≈ ${entero(p.kcal)} kcal</small></span>
    <span class="contador-fila">
      <button type="button" class="paso" data-plato="${p.id}" data-delta="-1" aria-label="Quitar ${p.nombre}">−</button>
      <output id="n-${p.id}" class="contador-num" aria-live="polite">0</output>
      <button type="button" class="paso" data-plato="${p.id}" data-delta="1" aria-label="Añadir ${p.nombre}">+</button>
    </span>
  </li>`).join('');

$('datos').addEventListener('click', (e) => {
  const opcion = e.target.closest('.chips button[data-valor]');
  if (opcion) {
    objetivo = opcion.dataset.valor;
    opcion.parentElement.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === opcion)));
    return pintar();
  }
  const paso = e.target.closest('.paso'); if (!paso) return;
  const delta = Number(paso.dataset.delta);
  if (paso.dataset.plato) {
    const id = paso.dataset.plato;
    cantidades[id] = Math.min(20, Math.max(0, (cantidades[id] ?? 0) + delta));
    $(`n-${id}`).textContent = cantidades[id];
    paso.closest('li').classList.toggle('elegido-plato', cantidades[id] > 0);
  } else {
    const campo = $(paso.dataset.objetivo);
    campo.value = Math.min(21, Math.max(1, (Number(campo.value) || 1) + delta));
  }
  pintar();
});
$('datos').addEventListener('input', pintar);
$('datos').addEventListener('submit', (e) => e.preventDefault());

const PAUTAS = [
  '<strong>No compenses.</strong> Ni te saltes comidas antes ni recortes los días siguientes. En la siguiente comida, vuelves a tu plan y punto.',
  '<strong>Asegura la proteína</strong> ese día: en el resto de comidas y, si puedes, en el plato que pidas.',
  '<strong>Muévete ese día.</strong> Un paseo largo o tus pasos de siempre ayudan más que pasar hambre.',
  '<strong>Disfruta sin culpa.</strong> Lo que cuenta es lo que haces la mayor parte del tiempo, no una cena.',
];
const FRECUENCIA = {
  bien: ['frecuencia-bien', 'Vas bien de comidas fuera esta semana: esto es el 10 % que te puedes permitir.'],
  ojo: ['frecuencia-ojo', 'Esta semana ya llevas varias comidas fuera. No pasa nada, pero irás más lento: intenta que el resto sean de tu plan.'],
  mucho: ['frecuencia-mucho', 'Son muchas comidas fuera para una semana. Una sola no importa; el problema es que se convierta en costumbre.'],
};

function pintar() {
  const caja = $('resultado');
  let r;
  try {
    r = encajar({ objetivo, cantidades, comidaNormal: numero('normal'), kcalDia: numero('kcal'), comidasFuera: numero('fuera') });
  } catch {
    caja.innerHTML = '<p class="resultado-vacio">Pulsa + en lo que vas a tomar y te digo cómo encajarlo.</p>';
    actualizarBarra();
    return;
  }
  $('barra-texto').textContent = `≈ ${entero(r.total)} kcal`;
  actualizarBarra();
  const titulo = r.exceso === 0
    ? 'Entra en tu plan'
    : objetivo === 'definicion'
      ? `Como mucho, te retrasa ${r.retraso === 1 ? '1 día' : `${r.retraso} días`}`
      : 'Entra sin problema';
  const explicacion = r.exceso === 0
    ? 'Es más o menos lo que comerías en casa. Disfruta.'
    : objetivo === 'definicion'
      ? `Son unas ${entero(r.exceso)} kcal más que tu comida normal. Con un déficit de unas ${entero(r.deficitDia)} kcal al día, es lo que tardas en recuperarlo siguiendo tu plan, sin hacer nada especial.`
      : `Son unas ${entero(r.exceso)} kcal más que tu comida normal. ${objetivo === 'volumen' ? 'En volumen esto no cambia nada' : 'Manteniendo, esto no cambia nada'} si el resto de la semana sigues tu plan.`;
  const semana = r.semana !== null && r.exceso > 0 ? `<p class="resultado-nota">Es un ${r.semana.toLocaleString('es-ES', { maximumFractionDigits: 1 })} % de lo que comes en toda la semana.</p>` : '';
  const [clase, textoFrecuencia] = FRECUENCIA[r.frecuencia];
  caja.innerHTML = `
    <p class="total-plan"><span class="display">≈ ${entero(r.total)}</span> kcal en total</p>
    <div class="veredicto ${r.exceso === 0 || objetivo !== 'definicion' ? 'veredicto-mantener' : r.retraso <= 3 ? 'veredicto-mantener' : 'veredicto-pasos'}">
      <h2 class="display">${titulo}</h2>
    </div>
    <p class="resultado-motivo">${explicacion}</p>
    ${semana}
    <p class="aviso-bascula"><strong>Mañana la báscula subirá.</strong> Puede marcar 0,5–1,5 kg más: es comida, sal y agua, no grasa. En 2–3 días vuelve a su sitio.</p>
    <h3 class="subtitulo">Lo que haría yo</h3>
    <ul class="pautas">${PAUTAS.map((p) => `<li>${p}</li>`).join('')}</ul>
    ${r.trucos.length ? `<h3 class="subtitulo">Si quieres que sume menos</h3><ul class="pautas trucos">${r.trucos.map((t) => `<li>${t}</li>`).join('')}</ul>` : ''}
    <p class="frecuencia ${clase}">${textoFrecuencia}</p>`;
}
pintar();
