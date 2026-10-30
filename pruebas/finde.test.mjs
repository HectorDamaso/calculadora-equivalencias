import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encajar, PLATOS } from '../js/finde.js';

test('los platos tienen ids únicos y calorías válidas', () => {
  assert.equal(new Set(PLATOS.map((p) => p.id)).size, PLATOS.length);
  for (const p of PLATOS) assert.ok(p.kcal > 0, p.nombre);
});

test('suma lo que se toma y resta la comida normal', () => {
  const r = encajar({ objetivo: 'definicion', cantidades: { pizza: 1, cana: 3 }, comidaNormal: 700 });
  assert.equal(r.total, 1300);
  assert.equal(r.exceso, 600);
  assert.equal(r.retraso, 2); // 600 / 400
});

test('el retraso usa el déficit si se conoce y solo cuenta en definición', () => {
  const c = { 'hamburguesa-patatas': 1, postre: 1, copa: 2 }; // 1940
  assert.equal(encajar({ objetivo: 'definicion', cantidades: c, comidaNormal: 700, deficit: 300 }).retraso, 4);
  assert.equal(encajar({ objetivo: 'volumen', cantidades: c }).retraso, 0);
});

test('si no supera la comida normal no hay exceso', () => {
  const r = encajar({ objetivo: 'definicion', cantidades: { sushi: 1 }, comidaNormal: 700 });
  assert.equal(r.exceso, 0);
  assert.equal(r.retraso, 0);
});

test('porcentaje de la semana y frecuencia de comidas fuera', () => {
  const r = encajar({ objetivo: 'definicion', cantidades: { pizza: 1 }, comidaNormal: 650, kcalDia: 2000, comidasFuera: 3 });
  assert.ok(Math.abs(r.semana - 2.5) < 1e-9); // 350 / 14000
  assert.equal(r.frecuencia, 'ojo');
  assert.equal(encajar({ objetivo: 'mantener', cantidades: { pizza: 1 }, comidasFuera: 1 }).frecuencia, 'bien');
  assert.equal(encajar({ objetivo: 'mantener', cantidades: { pizza: 1 }, comidasFuera: 6 }).frecuencia, 'mucho');
});

test('trucos según lo que se toma, y error si no se elige nada', () => {
  assert.ok(encajar({ objetivo: 'definicion', cantidades: { cana: 5 } }).trucos.some((t) => /0,0/.test(t)));
  assert.throws(() => encajar({ objetivo: 'definicion', cantidades: {} }), /Elige/);
});
