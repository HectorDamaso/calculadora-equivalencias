import { decidir } from './ajuste.js';

const $ = (id) => document.getElementById(id);
const numero = (id) => { const v = $(id).value.trim().replace(',', '.'); return v === '' ? NaN : Number(v); };
const fmt = (n, d = 1) => n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const conSigno = (n, d = 1) => (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n), d);
const elegido = {};

// Botones de opción (objetivo y cumplimiento).
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

function pintar() {
  const caja = $('resultado');
  const pesos = ['peso1', 'peso2', 'peso3'].map(numero).filter((x) => Number.isFinite(x));
  if (pesos.length < 2) {
    caja.innerHTML = '<p class="resultado-vacio">Escribe el peso medio de al menos dos semanas (la pasada y esta) y te digo qué haría.</p>';
    return;
  }
  let r;
  try {
    r = decidir({
      objetivo: elegido.objetivo, pesos, cumplimiento: elegido.cumplimiento, semanaRara: $('rara').checked,
      cinturaInicio: numero('cintura1'), cinturaFin: numero('cintura2'), pasos: numero('pasos'), kcal: numero('kcal'),
    });
  } catch (e) { caja.innerHTML = `<p class="aviso">${e.message}</p>`; return; }

  const { ritmo } = r;
  const datos = [
    `Peso: ${Math.abs(ritmo.kg) >= 1 ? `${conSigno(ritmo.kg)} kg` : `${conSigno(Math.round(ritmo.kg * 1000), 0)} g`} por semana (${conSigno(ritmo.porcentaje, 2)} %)`,
    r.cambioCintura === null ? 'Cintura: sin dato' : `Cintura: ${conSigno(r.cambioCintura)} cm`,
  ];
  const kcal = r.kcalNuevas
    ? `<p class="resultado-kcal">Pasa de ${numero('kcal').toLocaleString('es-ES')} a <strong>${r.kcalNuevas.map((n) => n.toLocaleString('es-ES')).join('–')} kcal</strong> al día.</p>`
    : '';
  const calculadora = r.accion === 'subir' || r.accion === 'bajar'
    ? `<p class="resultado-nota">Para ${r.accion === 'subir' ? 'añadirlas' : 'quitarlas'} sin descuadrar nada, <a href="../">usa la calculadora de equivalencias</a>. Como referencia, 100–150 kcal son unos 30–40 g de arroz en seco o 10–15 g de aceite.</p>`
    : '';
  caja.innerHTML = `
    <div class="veredicto veredicto-${r.accion}">
      <h2 class="display">${r.titulo}</h2>
    </div>
    ${kcal}
    <p class="resultado-motivo">${r.motivo}</p>
    ${r.consejo ? `<p class="resultado-consejo"><strong>Qué hacer:</strong> ${r.consejo}</p>` : ''}
    ${calculadora}
    <ul class="resultado-datos">${datos.map((d) => `<li>${d}</li>`).join('')}</ul>
    ${r.aviso ? `<p class="resultado-nota">${r.aviso}</p>` : ''}`;
}
pintar();
