import { equivalencias, MAXIMO } from './calculo.js';
import { reglas, grasasParaCompensar } from './reglas.js';

const $ = (id) => document.getElementById(id);
const nombres = { proteina: 'Proteína', hidratos: 'Hidratos', grasa: 'Grasas', kcal: 'Calorías' };
const POR_PAGINA = 30;
const entero = (n) => (Math.round(n) || 0).toLocaleString('es-ES'); // sin «-0»
const conSigno = (n) => (Math.round(n) > 0 ? '+' : '') + entero(n);
const normal = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Preferencias del visitante (solo en su navegador; si no se puede guardar, no pasa nada).
const guardado = (() => { try { return JSON.parse(localStorage.getItem('calculadora') || '{}'); } catch { return {}; } })();
const guardar = () => { try { localStorage.setItem('calculadora', JSON.stringify({ de: estado.de, cantidad: estado.cantidad })); } catch { /* sin almacenamiento */ } };

const { alimentos } = await (await fetch('datos/alimentos.json')).json();
const porId = new Map(alimentos.map((a) => [a.id, a]));
// Texto en el que se busca: el nombre y los sinónimos (p. ej. «patata» para «papas»).
const textoBusqueda = new Map(alimentos.map((a) => [a.id, normal(`${a.nombre} ${a.buscar ?? ''}`)]));
const encaja = (a, palabras) => palabras.every((p) => textoBusqueda.get(a.id).includes(p));
const estado = {
  de: porId.has(guardado.de) ? guardado.de : 'arroz-blanco-en-crudo',
  cantidad: Number(guardado.cantidad) > 0 ? String(guardado.cantidad) : '100',
  metrica: 'auto', todos: false, texto: '', categoria: '', mostrar: POR_PAGINA,
};

/* ---------- Buscador de alimento ---------- */
const buscar = $('buscar-alimento'), desplegable = $('lista-alimentos');
let resultados = [], activo = -1;

function coincidencias(texto) {
  const q = normal(texto.trim());
  if (!q) return alimentos.slice(0, 50);
  const palabras = q.split(/\s+/);
  return alimentos
    .filter((a) => encaja(a, palabras))
    .map((a) => ({ a, n: normal(a.nombre) }))
    .sort((x, y) => Number(y.n.startsWith(q)) - Number(x.n.startsWith(q)) || x.n.length - y.n.length)
    .slice(0, 50).map(({ a }) => a);
}
function abrir(texto) {
  resultados = coincidencias(texto); activo = resultados.length ? 0 : -1;
  desplegable.innerHTML = resultados.length
    ? resultados.map((a, i) => `<li id="op-${i}" role="option" aria-selected="${i === activo}" data-id="${a.id}">${escapar(a.nombre)}<span>${escapar(a.categoria)}</span></li>`).join('')
    : '<li class="vacio" role="option" aria-disabled="true">No hay ningún alimento con ese nombre.</li>';
  desplegable.hidden = false; buscar.setAttribute('aria-expanded', 'true');
  buscar.setAttribute('aria-activedescendant', activo >= 0 ? `op-${activo}` : '');
}
function cerrar() { desplegable.hidden = true; buscar.setAttribute('aria-expanded', 'false'); buscar.removeAttribute('aria-activedescendant'); }
function marcar(i) {
  activo = i;
  desplegable.querySelectorAll('li[data-id]').forEach((li, j) => li.setAttribute('aria-selected', String(j === i)));
  const li = $(`op-${i}`); if (li) { li.scrollIntoView({ block: 'nearest' }); buscar.setAttribute('aria-activedescendant', li.id); }
}
function elegir(id) {
  estado.de = id; estado.mostrar = POR_PAGINA; buscar.value = ''; cerrar(); guardar(); pintar();
}
buscar.addEventListener('focus', () => abrir(buscar.value));
buscar.addEventListener('input', () => abrir(buscar.value));
buscar.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); if (desplegable.hidden) abrir(buscar.value); else if (resultados.length) marcar(Math.min(activo + 1, resultados.length - 1)); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); if (resultados.length) marcar(Math.max(activo - 1, 0)); }
  else if (e.key === 'Enter') { if (!desplegable.hidden && resultados[activo]) { e.preventDefault(); elegir(resultados[activo].id); } }
  else if (e.key === 'Escape') { cerrar(); }
});
desplegable.addEventListener('mousedown', (e) => e.preventDefault()); // no pierde el foco al tocar
desplegable.addEventListener('click', (e) => { const li = e.target.closest('li[data-id]'); if (li) elegir(li.dataset.id); });
document.addEventListener('click', (e) => { if (!e.target.closest('.combobox')) cerrar(); });

/* ---------- Resto de controles ---------- */
const cantidad = $('cantidad');
cantidad.max = String(MAXIMO); cantidad.value = estado.cantidad;
cantidad.addEventListener('input', () => { estado.cantidad = cantidad.value; estado.mostrar = POR_PAGINA; guardar(); pintar(); });
$('metricas').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-metrica]'); if (!b) return;
  estado.metrica = b.dataset.metrica; estado.mostrar = POR_PAGINA;
  $('metricas').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  pintar();
});
$('todos').addEventListener('change', (e) => { estado.todos = e.target.checked; estado.mostrar = POR_PAGINA; pintar(); });
$('filtro-texto').addEventListener('input', (e) => { estado.texto = e.target.value; estado.mostrar = POR_PAGINA; pintar(); });
$('filtro-categoria').addEventListener('change', (e) => { estado.categoria = e.target.value; estado.mostrar = POR_PAGINA; pintar(); });
$('mas').addEventListener('click', () => { estado.mostrar += POR_PAGINA; pintar(); });

function escapar(t) { return String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
const cambio = (n, uno) => `${uno} ${conSigno(n)}`;
const enMinuscula = (t) => t.charAt(0).toLowerCase() + t.slice(1);

// Desplegable con las grasas para igualar el cambio.
function compensacion(c) {
  const titulo = c.falta ? `Te faltan ${entero(c.grasa)} g de grasa` : `Te sobran ${entero(c.grasa)} g de grasa`;
  const instruccion = c.falta ? 'Para que quede igual, añade una de estas:' : 'Para que quede igual, quita del resto del día una de estas:';
  const opciones = c.opciones.map(({ alimento, gramos, aporta }) => {
    const extra = [['proteína', aporta.proteina], ['hidratos', aporta.hidratos]].filter(([, g]) => Math.round(g) >= 2)
      .map(([n, g]) => `${entero(g)} g de ${n}`).join(' y ');
    const nota = extra ? ` <span>(también ${c.falta ? 'suma' : 'resta'} ${extra})</span>` : '';
    return `<li><strong>${c.falta ? '+' : '−'} ${entero(gramos)} g</strong> de ${escapar(enMinuscula(alimento.nombre))}${nota}</li>`;
  }).join('');
  return `<details class="compensar${c.falta ? '' : ' sobra'}"><summary>${titulo} · cómo igualarlo</summary><p>${instruccion}</p><ul>${opciones}</ul></details>`;
}

function pintar() {
  const original = porId.get(estado.de);
  $('elegido').innerHTML = `Elegido: <strong>${escapar(original.nombre)}</strong> · ${escapar(original.categoria)}`;
  let r = null;
  try {
    if (estado.cantidad.trim() === '') throw new Error('Escribe la cantidad en gramos.');
    r = equivalencias(alimentos, reglas, { de: estado.de, cantidad: Number(estado.cantidad), metrica: estado.metrica, todos: estado.todos, grasas: grasasParaCompensar });
    $('error').textContent = '';
  } catch (e) { $('error').textContent = e.message; }

  const resumen = $('resumen');
  if (!r) { resumen.innerHTML = ''; $('lista').innerHTML = ''; $('contador').textContent = ''; $('mas').hidden = true; $('titulo-alternativas').textContent = 'Tus alternativas'; return; }
  resumen.innerHTML = ['kcal', 'proteina', 'hidratos', 'grasa'].map((k) =>
    `<div class="${k === r.nutriente ? 'destacado' : ''}"><dt>${nombres[k]}</dt><dd>${entero(r.antes[k])}<small>${k === 'kcal' ? 'kcal' : 'g'}</small></dd></div>`).join('');
  $('titulo-alternativas').textContent = `Alternativas por ${nombres[r.nutriente].toLowerCase()}`;

  // Categorías presentes en estas alternativas.
  const categorias = [...new Set(r.alternativas.map((x) => x.alimento.categoria))].sort((a, b) => a.localeCompare(b, 'es'));
  if (estado.categoria && !categorias.includes(estado.categoria)) estado.categoria = '';
  $('filtro-categoria').innerHTML = `<option value="">Todas las categorías</option>` +
    categorias.map((c) => `<option value="${escapar(c)}" ${c === estado.categoria ? 'selected' : ''}>${escapar(c)}</option>`).join('');

  const q = normal(estado.texto.trim());
  const filtradas = r.alternativas.filter((x) => (!estado.categoria || x.alimento.categoria === estado.categoria) && (!q || encaja(x.alimento, q.split(/\s+/))));
  $('contador').textContent = filtradas.length === 1 ? '1 alternativa' : `${entero(filtradas.length)} alternativas${filtradas.length ? ', las más parecidas primero' : ''}`;
  $('lista').innerHTML = filtradas.slice(0, estado.mostrar).map((x) => `
    <li class="opcion${x.regla ? ' regla' : ''}${x.practica ? '' : ' poco-practica'}">
      <div class="opcion-fila">
        <div><p class="opcion-nombre">${escapar(x.alimento.nombre)}</p><p class="opcion-categoria">${escapar(x.alimento.categoria)}</p></div>
        <span class="opcion-cantidad">≈ ${entero(x.gramos)} g</span>
      </div>
      <p class="opcion-datos">≈ ${entero(x.despues.kcal)} kcal · P ${entero(x.despues.proteina)} · H ${entero(x.despues.hidratos)} · G ${entero(x.despues.grasa)} g</p>
      <p class="opcion-cambio">Cambio: ${cambio(x.cambio.kcal, 'kcal')} · ${cambio(x.cambio.proteina, 'P')} · ${cambio(x.cambio.hidratos, 'H')} · ${cambio(x.cambio.grasa, 'G')} g</p>
      ${x.compensar && x.practica ? compensacion(x.compensar) : ''}
      ${x.regla ? `<p class="opcion-regla">Equivalencia fija del programa: ${escapar(x.regla.texto)}.</p>` : ''}
      ${x.practica ? '' : '<p class="opcion-nota">Haría falta demasiada cantidad: no es un buen cambio.</p>'}
    </li>`).join('');
  $('mas').hidden = filtradas.length <= estado.mostrar;
}
pintar();
