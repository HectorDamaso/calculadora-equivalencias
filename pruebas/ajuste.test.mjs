import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decidir, ritmo } from '../js/ajuste.js';

const base = { cumplimiento: 'si', semanaRara: false, pasos: 11000 };
const d = (extra) => decidir({ ...base, ...extra });

test('ritmo semanal a partir de medias', () => {
  const r = ritmo([80, 79.6, 79.2]);
  assert.ok(Math.abs(r.kg + 0.4) < 1e-9);
  assert.equal(r.semanas, 2);
  assert.throws(() => ritmo([80]), /dos semanas/);
});

test('si no cumple el plan o la semana es rara, no se toca nada', () => {
  assert.equal(d({ objetivo: 'definicion', pesos: [80, 80], cumplimiento: 'casi' }).accion, 'cumplir');
  assert.match(d({ objetivo: 'volumen', pesos: [70, 70], cumplimiento: 'no' }).motivo, /subir calorías es un error/);
  assert.equal(d({ objetivo: 'definicion', pesos: [80, 80], semanaRara: true }).accion, 'esperar');
});

test('definición: ritmo bueno se mantiene, muy rápido se sube', () => {
  assert.equal(d({ objetivo: 'definicion', pesos: [80, 79.6, 79.2] }).accion, 'mantener'); // −400 g
  const rapido = d({ objetivo: 'definicion', pesos: [80, 79, 78], kcal: 2200 }); // −1 kg
  assert.equal(rapido.accion, 'subir');
  assert.deepEqual(rapido.kcalNuevas, [2300, 2350]);
});

test('definición parada: si baja la cintura se mantiene; si no, pasos y luego recorte', () => {
  assert.equal(d({ objetivo: 'definicion', pesos: [80, 80, 79.9], cinturaInicio: 90, cinturaFin: 89 }).accion, 'mantener');
  assert.equal(d({ objetivo: 'definicion', pesos: [80, 80, 80], pasos: 6000 }).accion, 'pasos');
  const recorte = d({ objetivo: 'definicion', pesos: [80, 80, 80], kcal: 2200 });
  assert.equal(recorte.accion, 'bajar');
  assert.deepEqual(recorte.kcalNuevas, [2050, 2100]);
});

test('volumen: sube al ritmo bueno se mantiene; parado se sube; rápido con cintura se baja', () => {
  assert.equal(d({ objetivo: 'volumen', pesos: [70, 70.2, 70.4] }).accion, 'mantener'); // ~0,29 %/sem
  assert.equal(d({ objetivo: 'volumen', pesos: [70, 70, 70] }).accion, 'subir');
  assert.equal(d({ objetivo: 'volumen', pesos: [70, 70.5, 71], cinturaInicio: 80, cinturaFin: 81.5 }).accion, 'bajar');
  assert.equal(d({ objetivo: 'volumen', pesos: [70, 70.5, 71] }).accion, 'mantener');
});

test('recomposición: peso estable y cintura que baja se mantiene', () => {
  assert.equal(d({ objetivo: 'recomposicion', pesos: [75, 75.1, 75], cinturaInicio: 85, cinturaFin: 84 }).accion, 'mantener');
  assert.equal(d({ objetivo: 'recomposicion', pesos: [75, 75, 75] }).titulo, 'Mantén y mídete la cintura');
  assert.equal(d({ objetivo: 'recomposicion', pesos: [75, 75, 75], cinturaInicio: 85, cinturaFin: 85, kcal: 2400 }).accion, 'bajar');
  assert.equal(d({ objetivo: 'recomposicion', pesos: [75, 74.4, 73.8] }).accion, 'subir');
});
