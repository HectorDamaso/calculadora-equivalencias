// Convierte el catálogo de APP-1-1 (herramientas/catalogo-app-1-1.json) en
// datos/alimentos.json, el que usa la calculadora. Uso: node herramientas/preparar-catalogo.mjs
// Las correcciones de nombres, categorías y alimentos quitados están en correcciones.mjs.
import { readFileSync, writeFileSync } from 'node:fs';
import { renombrar, quitar, sinonimos } from './correcciones.mjs';

const origen = JSON.parse(readFileSync(new URL('./catalogo-app-1-1.json', import.meta.url), 'utf8'));
const nombres = {
  'CEREALES Y TUBERCULOS': 'Cereales y tubérculos', CARNES: 'Carnes', 'PESCADOS Y MARISCOS': 'Pescados y mariscos',
  HUEVOS: 'Huevos', FIAMBRES: 'Fiambres', LACTEOS: 'Lácteos y bebidas', LEGUMBRES: 'Legumbres', FRUTAS: 'Frutas',
  VERDURAS: 'Verduras', 'GRASAS Y FRUTOS SECOS': 'Grasas y frutos secos', 'SALSAS Y OTROS': 'Salsas y otros',
  SUPLEMENTOS: 'HSN y suplementos',
};
// Los que en el catálogo original están en «Otros».
const sinCategoria = {
  'Arroz basmati (en seco)': 'Cereales y tubérculos', 'Pan integral': 'Cereales y tubérculos',
  'Pasta (en seco)': 'Cereales y tubérculos', 'Tortitas de arroz (Hacendado)': 'Cereales y tubérculos',
  'Atún al natural': 'Pescados y mariscos', 'Merluza': 'Pescados y mariscos', 'Salmón': 'Pescados y mariscos',
  'Huevo entero': 'Huevos',
};
const especial = { 'Papas (versión 1)': 'Papas en crudo' };
const categorias = new Set(Object.values(nombres));
const limpio = (t) => t.replace(/\s+/g, ' ').trim();
const slug = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Cada corrección tiene que apuntar a un alimento que existe (evita erratas).
const originales = new Set(origen.map((a) => limpio(a.name)));
for (const n of [...Object.keys(renombrar), ...Object.keys(quitar)]) {
  if (!originales.has(n)) throw Error('La corrección no encuentra el alimento: ' + n);
}

const porNombre = new Map();
let repetidos = 0;
for (const a of origen) {
  const original = limpio(a.name);
  if (quitar[original]) continue;
  for (const k of ['kcal', 'protein', 'carbs', 'fat']) if (typeof a[k] !== 'number' || !(a[k] >= 0)) throw Error('Valor no válido en ' + original);
  const cambio = renombrar[original] ?? especial[original];
  const [nombreNuevo, categoriaNueva] = Array.isArray(cambio) ? cambio : [cambio];
  const nombre = limpio(nombreNuevo ?? original);
  const categoria = categoriaNueva ?? sinCategoria[original] ?? nombres[a.category];
  if (!categorias.has(categoria)) throw Error('Categoría sin nombre: ' + a.category + ' (' + original + ')');
  const alimento = { nombre, categoria, kcal: a.kcal, proteina: a.protein, hidratos: a.carbs, grasa: a.fat };
  // Dos con el mismo nombre: si los valores son iguales se queda uno; si no, hay que corregirlo.
  const previo = porNombre.get(nombre);
  if (previo) {
    if (!['kcal', 'proteina', 'hidratos', 'grasa'].every((k) => previo[k] === alimento[k])) {
      throw Error(`Dos alimentos se llamarían «${nombre}» con valores distintos (${original}): corrígelo en correcciones.mjs`);
    }
    repetidos++;
    continue;
  }
  porNombre.set(nombre, alimento);
}

const alimentos = [...porNombre.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map((a) => {
  const extra = [...new Set(sinonimos.filter(([re]) => re.test(a.nombre)).map(([, palabras]) => palabras))].join(' ');
  return { id: slug(a.nombre), ...a, ...(extra ? { buscar: extra } : {}) };
});
if (new Set(alimentos.map((a) => a.id)).size !== alimentos.length) throw Error('Hay dos alimentos con el mismo id');

writeFileSync(new URL('../datos/alimentos.json', import.meta.url),
  JSON.stringify({ fuente: 'Catálogo de alimentos de Héctor Dámaso (APP-1-1), valores por 100 g', alimentos }, null, 1) + '\n');
console.log(`${alimentos.length} alimentos (${Object.keys(quitar).length} quitados, ${repetidos} repetidos unidos)`);
