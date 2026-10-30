import { gasto, objetivo, mezclar, propuesta, macros, kcalPasos, kcalCardioDia } from './calorias.js';

const $ = (id) => document.getElementById(id);
const numero = (id) => { const v = $(id).value.trim().replace(',', '.'); return v === '' ? NaN : Number(v); };
const miles = (n) => Math.round(n).toLocaleString('es-ES', { useGrouping: 'always' });
const kg = (n) => n.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const elegido = {};
let tocado = false; // si el usuario ya ha movido el mezclador, no se le pisa

document.querySelectorAll('.chips[data-grupo]').forEach((grupo) => {
  const nombre = grupo.dataset.grupo;
  elegido[nombre] = grupo.querySelector('[aria-pressed="true"]').dataset.valor;
  grupo.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-valor]'); if (!b) return;
    elegido[nombre] = b.dataset.valor;
    grupo.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    if (nombre === 'sexo') tocado = false;
    pintar();
  });
});
$('datos').addEventListener('input', () => { tocado = false; pintar(); });
$('datos').addEventListener('submit', (e) => e.preventDefault());
['recorte', 'masPasos', 'masCardio'].forEach((id) => $(id).addEventListener('input', () => { tocado = true; pintar(); }));
$('propuesta').addEventListener('click', () => { tocado = false; pintar(); });

const tablaMacros = (m) => `
  <dl class="plan-minicut">
    <div><dt>Calorías al día</dt><dd>${miles(m.kcal)}</dd></div>
    <div><dt>Proteína</dt><dd>${miles(m.proteina)} g</dd></div>
    <div><dt>Hidratos</dt><dd>${miles(m.hidratos)} g</dd></div>
    <div><dt>Grasas</dt><dd>${miles(m.grasa)} g</dd></div>
  </dl>`;

const RITMO = {
  nada: ['veredicto-esperar', 'Sin déficit', 'Mueve algún control para crear el déficit.'],
  suave: ['veredicto-pasos', 'Muy suave', 'Perderías menos de lo que busco: sube un poco los pasos o el cardio antes de quitar más comida.'],
  bueno: ['veredicto-mantener', 'Ritmo bueno', 'Entre 300 y 600 g a la semana: pierdes grasa sin pasar hambre y sin perder músculo.'],
  rapido: ['veredicto-pasos', 'Algo rápido', 'Vas por encima de 600 g a la semana. Puedes, pero vigila el hambre y el rendimiento.'],
  minicut: ['veredicto-pasos', 'Esto ya es un minicut', 'Entre 800 y 1.000 kcal de déficit es un minicut: corto (4–8 semanas) y no para todo el mundo. <a href="../minicut/">Haz el test del minicut</a>.'],
  demasiado: ['veredicto-bajar', 'Demasiado', 'Más de 1.000 kcal de déficit al día: el hambre gana y parte de lo que pierdes es músculo. Afloja algún control.'],
};

function pintar() {
  const datos = {
    sexo: elegido.sexo, edad: numero('edad'), peso: numero('peso'), altura: numero('altura'),
    pasos: numero('pasos') || 0, fuerzaMin: (numero('diasFuerza') || 0) * (numero('minFuerza') || 0), cardioMin: numero('cardio') || 0,
  };
  let g;
  try { g = gasto(datos); } catch (e) {
    $('gasto').innerHTML = `<p class="resultado-vacio">${['edad', 'peso', 'altura'].every((k) => Number.isFinite(datos[k])) ? e.message : 'Escribe tu edad, tu peso y tu altura y te calculo cuánto gastas al día.'}</p>`;
    $('bloque-objetivo').hidden = true;
    return;
  }
  $('bloque-objetivo').hidden = false;
  $('gasto').innerHTML = `
    <p class="total-plan"><span class="display">≈ ${miles(Math.round(g.mantenimiento / 10) * 10)}</span> kcal para mantenerte</p>
    <table class="reparto">
      <tbody>
        <tr><th scope="row">Cuerpo</th><td>Metabolismo y digestión</td><td class="reparto-kcal">${miles(g.base)}</td></tr>
        <tr><th scope="row">Pasos</th><td>${miles(datos.pasos)} al día</td><td class="reparto-kcal">${miles(g.extra.pasos)}</td></tr>
        <tr><th scope="row">Fuerza</th><td>${miles(datos.fuerzaMin)} min a la semana</td><td class="reparto-kcal">${miles(g.extra.fuerza)}</td></tr>
        <tr><th scope="row">Cardio</th><td>${miles(datos.cardioMin)} min a la semana</td><td class="reparto-kcal">${miles(g.extra.cardio)}</td></tr>
      </tbody>
    </table>`;

  const enDeficit = elegido.objetivo === 'deficit';
  $('mezclador').hidden = !enDeficit;
  if (!enDeficit) {
    const kcal = objetivo(g.mantenimiento, elegido.objetivo);
    const texto = elegido.objetivo === 'volumen'
      ? 'Un superávit pequeño, de unas 200 kcal: lo justo para darle al cuerpo un motivo para crecer sin ganar grasa de más. Busca subir un 1–2 % de tu peso al mes y súbelo poco a poco, nunca 500 kcal de golpe.'
      : 'Las calorías con las que, haciendo lo que haces ahora, tu peso debería quedarse estable.';
    $('objetivo').innerHTML = `${tablaMacros(macros(kcal, datos.peso))}<p class="resultado-motivo">${texto}</p>`;
    return;
  }

  // Mezclador: rango de pasos y cardio a partir de lo que ya hace.
  const r = $('recorte'), p = $('masPasos'), c = $('masCardio');
  p.min = String(Math.round(datos.pasos / 500) * 500); p.max = String(Math.max(20000, Number(p.min) + 5000));
  c.min = String(Math.round(datos.cardioMin / 10) * 10); c.max = String(Math.max(300, Number(c.min) + 120));
  if (!tocado) {
    const prop = propuesta({ peso: datos.peso, pasosActuales: datos.pasos, cardioActual: datos.cardioMin });
    r.value = prop.recorte; p.value = prop.pasos; c.value = prop.cardio;
  }
  const m = mezclar({
    peso: datos.peso, sexo: datos.sexo, mantenimiento: g.mantenimiento, pasosActuales: datos.pasos, cardioActual: datos.cardioMin,
    recorte: Number(r.value), pasos: Number(p.value), cardio: Number(c.value),
  });
  $('o-recorte').textContent = `−${miles(m.partes.comida)} kcal`;
  $('o-pasos').textContent = `${miles(m.pasos)} pasos · −${miles(m.partes.pasos)} kcal`;
  $('o-cardio').textContent = `${miles(m.cardio)} min · −${miles(m.partes.cardio)} kcal/día`;

  const [clase, titulo, texto] = RITMO[m.ritmo];
  $('objetivo').innerHTML = `
    <div class="veredicto ${clase}"><h2 class="display">${titulo}</h2></div>
    <table class="reparto">
      <tbody>
        <tr><th scope="row">Comida</th><td>Come ${miles(m.comer)} kcal al día</td><td class="reparto-kcal">${m.partes.comida ? `−${miles(m.partes.comida)}` : '—'}</td></tr>
        <tr><th scope="row">Pasos</th><td>${m.pasos > datos.pasos ? `De ${miles(datos.pasos)} a ${miles(m.pasos)} al día` : `Tus ${miles(datos.pasos)} al día`}</td><td class="reparto-kcal">${m.partes.pasos >= 1 ? `−${miles(m.partes.pasos)}` : '—'}</td></tr>
        <tr><th scope="row">Cardio</th><td>${m.cardio > datos.cardioMin ? `${miles(m.cardio - datos.cardioMin)} min más a la semana` : 'Sin cardio extra'}</td><td class="reparto-kcal">${m.partes.cardio >= 1 ? `−${miles(m.partes.cardio)}` : '—'}</td></tr>
      </tbody>
      <tfoot><tr><th scope="row">Total</th><td>Unos ${kg(m.kgSemana)} kg a la semana (${m.pct.toLocaleString('es-ES', { maximumFractionDigits: 2 })} % de tu peso)</td><td class="reparto-kcal">≈ −${miles(Math.round(m.total / 10) * 10)}</td></tr></tfoot>
    </table>
    <p class="resultado-motivo">${texto}</p>
    ${m.pocaComida ? `<p class="aviso-bascula"><strong>Ojo:</strong> comerías menos de ${miles(m.minimo)} kcal. Quita menos comida y pon el déficit con pasos o cardio.</p>` : ''}
    <h3 class="subtitulo">Tus macros</h3>
    ${tablaMacros(macros(m.comer, datos.peso))}
    <p class="resultado-nota">Referencia: 1.000 pasos más son unas ${miles(kcalPasos(datos.peso, 1000))} kcal; 30 minutos de cardio, unas ${miles(kcalCardioDia(datos.peso, 30) * 7)} kcal.</p>`;
}
pintar();
