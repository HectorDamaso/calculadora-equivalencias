import { evaluar, minicutForzado } from './minicut.js';

const $ = (id) => document.getElementById(id);
const numero = (id) => { const v = $(id).value.trim().replace(',', '.'); return v === '' ? NaN : Number(v); };
const entero = (n) => Math.round(n).toLocaleString('es-ES');
const kg = (n) => n.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const elegido = {};
let forzar = false; // «Aun así, quiero hacer el minicut»

const tablaPlan = (p) => `
  <dl class="plan-minicut">
    <div><dt>Calorías al día</dt><dd>${p.kcal[0] === p.kcal[1] ? entero(p.kcal[0]) : `${entero(p.kcal[0])}–${entero(p.kcal[1])}`}</dd></div>
    <div><dt>Proteína al día</dt><dd>${entero(p.proteina)} g</dd></div>
    <div><dt>Perder en total</dt><dd>${kg(p.perder[0])}–${kg(p.perder[1])} kg</dd></div>
    <div><dt>Duración</dt><dd>${p.semanas[0]}–${p.semanas[1]} semanas</dd></div>
  </dl>
  <p class="resultado-nota">Terminarías sobre ${kg(p.pesoFinal[0])}–${kg(p.pesoFinal[1])} kg. <a href="#guia">Sigue la guía paso a paso ↓</a></p>`;

$('resultado').addEventListener('click', (e) => {
  if (e.target.closest('#forzar')) { forzar = !forzar; pintar(); }
});

document.querySelectorAll('.chips[data-grupo]').forEach((grupo) => {
  const nombre = grupo.dataset.grupo;
  elegido[nombre] = grupo.querySelector('[aria-pressed="true"]').dataset.valor;
  grupo.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-valor]'); if (!b) return;
    elegido[nombre] = b.dataset.valor;
    grupo.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    pintar();
  });
});
$('datos').addEventListener('input', pintar);
$('datos').addEventListener('submit', (e) => e.preventDefault());

const CLASE = { minicut: 'veredicto-mantener', deficit: 'veredicto-pasos', meseta: 'veredicto-esperar', esperar: 'veredicto-esperar' };

function pintar() {
  // La pregunta de la grasa solo tiene sentido si vienes de un volumen.
  $('campo-grasa').hidden = elegido.vieneDe !== 'volumen';
  const caja = $('resultado');
  if (!(numero('peso') > 0) || !(numero('kcal') > 0)) {
    caja.innerHTML = '<p class="resultado-vacio">Escribe tu peso y las calorías que comes ahora, contesta las preguntas y te digo si el minicut es para ti.</p>';
    return;
  }
  const r = evaluar({
    sexo: elegido.sexo, peso: numero('peso'), kcal: numero('kcal'), vieneDe: elegido.vieneDe,
    grasaDeMas: elegido.grasaDeMas, kgPerder: numero('kgPerder'), anosFuerza: elegido.anosFuerza,
    diasFuerza: numero('diasFuerza'), relacionComida: elegido.relacionComida, estresSueno: elegido.estresSueno,
    eventos: $('eventos').checked, pasos: elegido.pasos === 'si',
  });
  const motivos = r.motivos.length ? `<ul class="pautas">${r.motivos.map((m) => `<li>${m}</li>`).join('')}</ul>` : '';
  let extra = '';
  if (r.plan) {
    extra = tablaPlan(r.plan);
  } else if (r.veredicto === 'deficit' && elegido.vieneDe === 'deficit') {
    extra = '<p class="resultado-consejo"><strong>Qué hacer:</strong> sigue con tu déficit sin apretarlo más. Busca perder entre 300 y 600 g a la semana y ajusta cada dos semanas con <a href="../subo-o-bajo/">¿Subo o bajo calorías?</a></p>';
  } else if (r.veredicto === 'deficit') {
    extra ='<p class="resultado-consejo"><strong>Qué hacer:</strong> quita unas 300–500 kcal a lo que comes, busca perder entre 300 y 600 g a la semana y ajusta cada dos semanas con <a href="../subo-o-bajo/">¿Subo o bajo calorías?</a></p>';
  } else if (r.veredicto === 'meseta') {
    extra = '<p class="resultado-consejo"><strong>Qué hacer:</strong> sigue sumando si el entreno tira. Si te ves tapado, mantén el peso 3–4 semanas con las mismas calorías y vuelve a hacer el test.</p>';
  } else {
    extra = '<p class="resultado-consejo"><strong>Qué hacer:</strong> sigue con tu plan y vuelve a hacer el test cuando tengas 8 semanas tranquilas por delante.</p>';
  }
  // Si el test no lo recomienda, se puede pedir igualmente (salvo casos de riesgo).
  let forzado = '';
  if (!r.plan) {
    const f = minicutForzado({
      sexo: elegido.sexo, peso: numero('peso'), kcal: numero('kcal'), vieneDe: elegido.vieneDe, grasaDeMas: elegido.grasaDeMas,
      kgPerder: numero('kgPerder'), anosFuerza: elegido.anosFuerza, diasFuerza: numero('diasFuerza'),
      relacionComida: elegido.relacionComida, estresSueno: elegido.estresSueno, eventos: $('eventos').checked,
    });
    if (!f.permitido) {
      forzado = `<div class="forzado"><p class="forzado-titulo">¿Y si quiero hacerlo igualmente?</p><p>${f.motivo}</p></div>`;
    } else if (!forzar) {
      forzado = '<button id="forzar" type="button" class="button button-secondary">Aun así, quiero hacer el minicut</button>';
    } else {
      forzado = `
        <div class="forzado">
          <p class="forzado-titulo">Tu minicut, bajo tu responsabilidad</p>
          ${tablaPlan(f.plan)}
          <ul class="pautas">${f.avisos.map((a) => `<li>${a}</li>`).join('')}</ul>
          <button id="forzar" type="button" class="enlace-boton">Mejor sigo la recomendación</button>
        </div>`;
    }
  }
  caja.innerHTML = `
    <div class="veredicto ${CLASE[r.veredicto]}"><h2 class="display">${r.titulo}</h2></div>
    ${motivos}
    ${extra}
    ${forzado}`;
}
pintar();
