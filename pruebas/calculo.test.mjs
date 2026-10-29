import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { equivalencias, nutrientePrincipal, redondear, reglaEntre } from '../js/calculo.js';
import { reglas } from '../js/reglas.js';

const { alimentos } = JSON.parse(readFileSync(new URL('../datos/alimentos.json', import.meta.url), 'utf8'));
const buscar = (r, id) => r.alternativas.find((x) => x.alimento.id === id);

test('el catálogo tiene ids únicos y valores válidos', () => {
  assert.ok(alimentos.length > 700);
  assert.equal(new Set(alimentos.map((a) => a.id)).size, alimentos.length);
  for (const a of alimentos) for (const k of ['kcal', 'proteina', 'hidratos', 'grasa']) assert.ok(a[k] >= 0, a.nombre);
});

test('todos los alimentos de las reglas existen en el catálogo', () => {
  const ids = new Set(alimentos.map((a) => a.id));
  for (const r of reglas) for (const id of [...r.a, ...r.b]) assert.ok(ids.has(id), id);
});

test('regla fija: 100 g de arroz = 400 g de papas, y 50 g = 200 g', () => {
  for (const [arroz, papas] of [[50, 200], [100, 400], [75, 300], [180, 720]]) {
    const x = buscar(equivalencias(alimentos, reglas, { de: 'arroz-blanco-en-crudo', cantidad: arroz }), 'papas-en-crudo');
    assert.equal(x.gramos, papas); assert.ok(x.regla);
  }
  const vuelta = buscar(equivalencias(alimentos, reglas, { de: 'papas-en-crudo', cantidad: 400 }), 'arroz-basmati-crudo');
  assert.equal(vuelta.gramos, 100);
});

test('la regla va primero en la lista y solo manda al igualar por hidratos', () => {
  const r = equivalencias(alimentos, reglas, { de: 'arroz-blanco-en-crudo', cantidad: 100 });
  assert.equal(r.nutriente, 'hidratos');
  assert.equal(r.alternativas[0].alimento.id, 'papas-en-crudo');
  const porKcal = buscar(equivalencias(alimentos, reglas, { de: 'arroz-blanco-en-crudo', cantidad: 100, metrica: 'kcal' }), 'papas-en-crudo');
  assert.equal(porKcal.regla, null);
  assert.equal(reglaEntre(reglas, 'arroz-blanco-en-crudo', 'macarrones'), null);
});

test('sin regla, iguala el nutriente con cantidades redondeadas', () => {
  const r = equivalencias(alimentos, reglas, { de: 'arroz-blanco-en-crudo', cantidad: 100 });
  const pasta = buscar(r, 'macarrones');
  assert.equal(pasta.gramos % 5, 0);
  assert.ok(Math.abs(pasta.despues.hidratos - r.antes.hidratos) <= 72 * 5 / 100);
});

test('«Automático» usa el nutriente que más calorías aporta', () => {
  const porNombre = (n) => alimentos.find((a) => a.nombre === n);
  assert.equal(nutrientePrincipal(porNombre('Merluza')), 'proteina');
  assert.equal(nutrientePrincipal(porNombre('Copos de avena')), 'hidratos');
  assert.equal(nutrientePrincipal(porNombre('Salmón')), 'grasa');
});

test('por defecto solo salen alimentos del mismo tipo; con «todos», el resto', () => {
  const r = equivalencias(alimentos, reglas, { de: 'merluza', cantidad: 150 });
  assert.ok(r.alternativas.every((x) => nutrientePrincipal(x.alimento) === 'proteina'));
  const todos = equivalencias(alimentos, reglas, { de: 'merluza', cantidad: 150, todos: true });
  assert.ok(todos.alternativas.length > r.alternativas.length);
});

test('redondeo práctico', () => {
  assert.equal(redondear(12.4), 12); assert.equal(redondear(0.2), 1); assert.equal(redondear(87), 85); assert.equal(redondear(88), 90);
});

test('rechaza cantidades no válidas y nutrientes que no aporta', () => {
  for (const cantidad of [0, -5, NaN, Infinity, 2001]) assert.throws(() => equivalencias(alimentos, reglas, { de: 'merluza', cantidad }));
  assert.throws(() => equivalencias(alimentos, reglas, { de: 'merluza', cantidad: 100, metrica: 'hidratos' }), /no aporta/);
  assert.throws(() => equivalencias(alimentos, reglas, { de: 'no-existe', cantidad: 100 }), /Elige/);
});

test('las cantidades enormes se marcan como poco prácticas y van al final', () => {
  const r = equivalencias(alimentos, reglas, { de: 'arroz-blanco-en-crudo', cantidad: 180, todos: true });
  const i = r.alternativas.findIndex((x) => !x.practica);
  if (i >= 0) assert.ok(r.alternativas.slice(i).every((x) => !x.practica));
});
