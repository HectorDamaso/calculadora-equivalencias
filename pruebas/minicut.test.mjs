import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluar } from '../js/minicut.js';

// Candidato ideal: viene de volumen con calorías altas, gana grasa de más, entrena años.
const ideal = {
  sexo: 'hombre', peso: 85, kcal: 3400, vieneDe: 'volumen', grasaDeMas: 'si', kgPerder: 7,
  anosFuerza: '1a3', diasFuerza: 4, relacionComida: 'bien', estresSueno: 'bien', eventos: false, pasos: true,
};
const e = (cambios) => evaluar({ ...ideal, ...cambios });

test('candidato ideal: minicut con su plan', () => {
  const r = e({});
  assert.equal(r.veredicto, 'minicut');
  assert.deepEqual(r.plan.kcal, [2400, 2600]);
  assert.equal(r.plan.proteina, 170);
  assert.ok(Math.abs(r.plan.perder[0] - 6.8) < 1e-9 && Math.abs(r.plan.perder[1] - 8.5) < 1e-9);
  assert.deepEqual(r.plan.semanas, [4, 8]);
});

test('déficit normal: calorías bajas, principiante, ya en déficit, mucho que perder, relación difícil', () => {
  assert.equal(e({ kcal: 2400 }).veredicto, 'deficit'); // 2400 − 800 = 1600 < 1800
  assert.equal(e({ anosFuerza: 'menos1' }).veredicto, 'deficit');
  assert.equal(e({ vieneDe: 'deficit' }).veredicto, 'deficit');
  assert.equal(e({ kgPerder: 15 }).veredicto, 'deficit'); // 17,6 %
  assert.equal(e({ relacionComida: 'dificil' }).veredicto, 'deficit');
  assert.equal(e({ diasFuerza: 2 }).veredicto, 'deficit');
  assert.equal(e({ kcal: 2400, anosFuerza: 'menos1' }).motivos.length, 2);
});

test('si sigue ganando más músculo que grasa, meseta o seguir', () => {
  assert.equal(e({ grasaDeMas: 'no' }).veredicto, 'meseta');
  assert.equal(e({ grasaDeMas: 'no' }).plan, null);
});

test('mal momento: esperar', () => {
  assert.equal(e({ eventos: true }).veredicto, 'esperar');
  assert.equal(e({ estresSueno: 'mal' }).veredicto, 'esperar');
});

test('apto con avisos y suelo de calorías para mujeres', () => {
  const r = e({ sexo: 'mujer', peso: 62, kcal: 2300, kgPerder: 5, estresSueno: 'regular', pasos: false });
  assert.equal(r.veredicto, 'minicut');
  assert.deepEqual(r.plan.kcal, [1400, 1500]); // 2300 − 1000 = 1300 → suelo 1400
  assert.equal(r.motivos.length, 2);
  assert.equal(e({ sexo: 'mujer', peso: 62, kcal: 2100 }).veredicto, 'deficit'); // 1300 < 1400
});

test('pide peso y calorías', () => {
  assert.throws(() => e({ peso: 0 }), /peso/);
  assert.throws(() => e({ kcal: NaN }), /calorías/);
});
