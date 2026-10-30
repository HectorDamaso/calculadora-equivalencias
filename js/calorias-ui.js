import { gasto, objetivo, mezclar, propuesta, macros, kcalPasos, kcalCardioDia, zonas, comparar } from './calorias.js';

const $ = (id) => document.getElementById(id);
const numero = (id) => { const v = $(id).value.trim().replace(',', '.'); return v === '' ? NaN : Number(v); };
const miles = (n) => Math.round(n).toLocaleString('es-ES', { useGrouping: 'always' });
const kg = (n) => n.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const r10 = (n) => Math.round(n / 10) * 10;
const elegido = {};
let plan = null; // { comer, pasos, sesiones, minutos }; null = usar la propuesta
let ultimo = null; // datos del último cálculo, para los botones − y +

document.querySelectorAll('.chips[data-grupo]').forEach((grupo) => {
  const nombre = grupo.dataset.grupo;
  elegido[nombre] = grupo.querySelector('[aria-pressed="true"]').dataset.valor;
  grupo.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-valor]'); if (!b) return;
    elegido[nombre] = b.dataset.valor;
    grupo.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    if (nombre === 'sexo') plan = null;
    pintar();
  });
});
$('datos').addEventListener('input', () => { plan = null; pintar(); });
$('datos').addEventListener('submit', (e) => e.preventDefault());
$('propuesta').addEventListener('click', () => { plan = null; pintar(); });

// Botones − y + del plan.
const LIMITES = { comer: [800, 8000], pasos: [0, 40000], sesiones: [0, 14], minutos: [10, 90] };
$('mezclador').addEventListener('click', (e) => {
  const b = e.target.closest('[data-palanca]'); if (!b || !ultimo) return;
  const k = b.dataset.palanca;
  const [min, max] = LIMITES[k];
  const suelo = k === 'pasos' ? ultimo.pasosActuales : min; // no se baja de lo que ya anda
  plan = { ...ultimo.plan, [k]: Math.min(max, Math.max(suelo, ultimo.plan[k] + Number(b.dataset.delta))) };
  pintar();
});

const tablaMacros = (m) => `
  <dl class="plan-minicut">
    <div><dt>Calorías al día</dt><dd>${miles(m.kcal)}</dd></div>
    <div><dt>Proteína</dt><dd>${miles(m.proteina)} g</dd></div>
    <div><dt>Hidratos</dt><dd>${miles(m.hidratos)} g</dd></div>
    <div><dt>Grasas</dt><dd>${miles(m.grasa)} g</dd></div>
  </dl>`;

const RITMO = {
  nada: ['veredicto-esperar', 'Sin déficit', 'Así no pierdes grasa: come algo menos, anda más o añade cardio.'],
  suave: ['veredicto-pasos', 'Muy suave', 'Perderías menos de lo que busco. Sube primero los pasos o el cardio y, si hace falta, quita un poco más de comida.'],
  bueno: ['veredicto-mantener', 'Ritmo bueno', 'Entre 300 y 600 g a la semana: pierdes grasa sin pasar hambre y sin perder músculo.'],
  rapido: ['veredicto-pasos', 'Algo rápido', 'Vas por encima de 600 g a la semana. Puedes, pero vigila el hambre y el rendimiento.'],
  minicut: ['veredicto-pasos', 'Esto ya es un minicut', 'Entre 800 y 1.000 kcal de déficit es un minicut: corto (4–8 semanas) y no para todo el mundo. <a href="../minicut/">Haz el test del minicut</a>.'],
  demasiado: ['veredicto-bajar', 'Demasiado', 'Más de 1.000 kcal de déficit al día: el hambre gana y parte de lo que pierdes es músculo. Afloja alguna fila.'],
};
const NOMBRE_ZONA = { suave: 'Suave', bueno: 'Ritmo bueno', rapido: 'Rápido', minicut: 'Minicut', demasiado: 'Demasiado' };

// Barra de zonas con el déficit apilado (comida, pasos, cardio) y una marca en el total.
function medidor(m, peso) {
  const z = zonas(peso);
  const tope = z.demasiado[1];
  const pc = (n) => `${Math.min(100, (n / tope) * 100).toFixed(2)}%`;
  const tramos = Object.entries(z).map(([k, [a, b]]) => `<span class="zona zona-${k}" style="left:${pc(a)};width:${pc(b - a)}" title="${NOMBRE_ZONA[k]}"></span>`).join('');
  let x = 0;
  const partes = [['comida', m.partes.comida], ['pasos', m.partes.pasos], ['cardio', m.partes.cardio]]
    .map(([k, v]) => { const s = `<span class="parte parte-${k}" style="left:${pc(x)};width:${pc(v)}"></span>`; x += v; return s; }).join('');
  const verde = `${miles(r10(z.bueno[0]))}–${miles(r10(z.bueno[1]))} kcal`;
  return `
    <div class="medidor-cifra"><span class="display">≈ ${miles(r10(m.total))}</span> kcal de déficit al día <small>· la zona verde es ${verde}</small></div>
    <div class="medidor-barra" role="img" aria-label="Déficit de ${miles(r10(m.total))} kcal: ${NOMBRE_ZONA[m.ritmo] ?? 'sin déficit'}">
      <div class="medidor-zonas">${tramos}</div>
      <div class="medidor-partes">${partes}</div>
      <span class="medidor-marca" style="left:${pc(m.total)}"></span>
    </div>
    <div class="medidor-leyenda">
      <span><i class="parte-comida"></i>Comida ${miles(r10(m.partes.comida))}</span>
      <span><i class="parte-pasos"></i>Pasos ${miles(m.partes.pasos)}</span>
      <span><i class="parte-cardio"></i>Cardio ${miles(m.partes.cardio)}</span>
    </div>`;
}

function pintar() {
  const datos = {
    sexo: elegido.sexo, edad: numero('edad'), peso: numero('peso'), altura: numero('altura'),
    pasos: numero('pasos') || 0, fuerzaMin: (numero('diasFuerza') || 0) * (numero('minFuerza') || 0), cardioMin: numero('cardio') || 0,
  };
  const ingesta = numero('ingesta');
  let g;
  try { g = gasto(datos); } catch (e) {
    $('gasto').innerHTML = `<p class="resultado-vacio">${['edad', 'peso', 'altura'].every((k) => Number.isFinite(datos[k])) ? e.message : 'Escribe tu edad, tu peso y tu altura y te calculo cuánto gastas al día.'}</p>`;
    $('bloque-objetivo').hidden = true;
    ultimo = null;
    return;
  }
  $('bloque-objetivo').hidden = false;
  const mant = r10(g.mantenimiento);

  // Comparación con lo que come ahora.
  const c = comparar(g.mantenimiento, ingesta, datos.peso);
  let comparacion = '';
  if (c) {
    const dif = miles(Math.abs(r10(c.diferencia)));
    const txt = {
      deficit: `Comes ${miles(ingesta)} kcal: unas <strong>${dif} menos</strong> de las que gastas. Ya estás en déficit: perderías unos ${kg(Math.abs(c.kgSemana))} kg a la semana.`,
      superavit: `Comes ${miles(ingesta)} kcal: unas <strong>${dif} más</strong> de las que gastas. Estás en superávit: subirías unos ${kg(c.kgSemana)} kg a la semana.`,
      mantenimiento: `Comes ${miles(ingesta)} kcal: casi lo mismo que gastas. Estás en mantenimiento.`,
    }[c.estado];
    comparacion = `<p class="comparacion comparacion-${c.estado}">${txt} <small>Si tu peso no hace lo que dice esto, la estimación se queda corta o larga: manda tu báscula.</small></p>`;
  }
  $('gasto').innerHTML = `
    <p class="total-plan"><span class="display">≈ ${miles(mant)}</span> kcal para mantenerte</p>
    ${comparacion}
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
    ultimo = null;
    const kcal = objetivo(g.mantenimiento, elegido.objetivo);
    let texto = elegido.objetivo === 'volumen'
      ? 'Un superávit pequeño, de unas 200 kcal: lo justo para darle al cuerpo un motivo para crecer sin ganar grasa de más. Busca subir un 1–2 % de tu peso al mes y súbelo poco a poco, nunca 500 kcal de golpe.'
      : 'Las calorías con las que, haciendo lo que haces ahora, tu peso debería quedarse estable.';
    if (c) {
      const paso = kcal - ingesta;
      texto += Math.abs(paso) < 50 ? ' Ya estás ahí.' : ` Te supone ${paso > 0 ? 'subir' : 'bajar'} unas ${miles(Math.abs(r10(paso)))} kcal desde lo que comes ahora${elegido.objetivo === 'volumen' && paso > 300 ? ', poco a poco' : ''}.`;
    }
    $('objetivo').innerHTML = `${tablaMacros(macros(kcal, datos.peso))}<p class="resultado-motivo">${texto}</p>`;
    return;
  }

  // Plan para perder grasa: propuesta o lo que haya tocado el usuario.
  if (!plan) {
    const p = propuesta({ peso: datos.peso, pasosActuales: datos.pasos });
    // Si ya come menos de lo propuesto, se parte de lo que come: no se le sube la comida.
    const comer = r10(g.mantenimiento - p.recorte);
    plan = { comer: c && ingesta < comer ? r10(ingesta) : comer, pasos: p.pasos, sesiones: p.sesiones, minutos: p.minutos };
  }
  ultimo = { plan, pasosActuales: datos.pasos };
  const extraCardio = plan.sesiones * plan.minutos;
  const m = mezclar({
    peso: datos.peso, sexo: datos.sexo, mantenimiento: g.mantenimiento, pasosActuales: datos.pasos, cardioActual: datos.cardioMin,
    recorte: Math.max(0, g.mantenimiento - plan.comer), pasos: plan.pasos, cardio: datos.cardioMin + extraCardio,
  });

  $('medidor').innerHTML = medidor(m, datos.peso);
  $('v-comer').textContent = `${miles(plan.comer)} kcal`;
  $('t-comer').textContent = `Gastas ${miles(mant)}${c ? ` · ahora comes ${miles(ingesta)}` : ''}`;
  $('k-comer').textContent = m.partes.comida >= 1 ? `−${miles(r10(m.partes.comida))} kcal` : '0 kcal';
  $('v-pasos').textContent = miles(plan.pasos);
  $('t-pasos').textContent = plan.pasos > datos.pasos ? `Ahora ${miles(datos.pasos)} · ${miles(plan.pasos - datos.pasos)} más` : `Los ${miles(datos.pasos)} de ahora`;
  $('k-pasos').textContent = m.partes.pasos >= 1 ? `−${miles(m.partes.pasos)} kcal` : '0 kcal';
  $('v-sesiones').textContent = plan.sesiones;
  $('v-minutos').textContent = `${plan.minutos} min`;
  $('k-cardio').textContent = m.partes.cardio >= 1 ? `−${miles(m.partes.cardio)} kcal` : '0 kcal';

  const [clase, titulo, texto] = RITMO[m.ritmo];
  const cambioComida = c ? plan.comer - ingesta : null;
  $('objetivo').innerHTML = `
    <div class="veredicto ${clase}"><h2 class="display">${titulo}</h2></div>
    <p class="resultado-motivo">${texto} Con este plan perderías unos <strong>${kg(m.kgSemana)} kg a la semana</strong>.</p>
    ${c && Math.abs(cambioComida) >= 50 ? `<p class="resultado-nota">Desde lo que comes ahora, eso es ${cambioComida < 0 ? 'quitar' : 'añadir'} unas ${miles(Math.abs(r10(cambioComida)))} kcal al día.</p>` : ''}
    ${m.pocaComida ? `<p class="aviso-bascula"><strong>Ojo:</strong> comerías menos de ${miles(m.minimo)} kcal. Come algo más y pon el déficit con pasos o cardio.</p>` : ''}
    <h3 class="subtitulo">Tus macros</h3>
    ${tablaMacros(macros(plan.comer, datos.peso))}
    <p class="resultado-nota">Referencia: 1.000 pasos más son unas ${miles(kcalPasos(datos.peso, 1000))} kcal al día; cada sesión de 30 minutos de cardio, unas ${miles(kcalCardioDia(datos.peso, 30) * 7)} kcal (repartidas en la semana).</p>`;
}
pintar();
