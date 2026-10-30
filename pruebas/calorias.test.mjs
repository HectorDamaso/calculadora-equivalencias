import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gasto, objetivo, mezclar, propuesta, macros, kcalPasos, kcalCardioDia } from '../js/calorias.js';

const hector = { sexo: 'hombre', edad: 32, peso: 85, altura: 178, pasos: 8000, fuerzaMin: 240, cardioMin: 0 };

test('gasto con las fórmulas de la hoja de Héctor', () => {
  const g = gasto(hector);
  // Basal: media de Mifflin (1.807,5), Tinsley (2.108), OMS 30–60 (1.865) y Helms (1.870).
  assert.ok(Math.abs(g.basal - (1807.5 + 2108 + 1865 + 1870) / 4) < 1e-9);
  assert.ok(Math.abs(g.base - g.basal * 1.2 * 1.1) < 1e-9);
  assert.equal(g.extra.pasos, 0.625 * 85 * 8);
  assert.ok(Math.abs(g.extra.fuerza - (0.07 * 85 * 240) / 7) < 1e-9);
  assert.equal(g.extra.cardio, 0);
  assert.throws(() => gasto({ ...hector, altura: NaN }), /altura/);
});

test('pasos y cardio: 0,625 kcal/kg cada 1.000 pasos y 0,1 kcal/kg/min', () => {
  assert.equal(kcalPasos(80, 1000), 50);
  assert.equal(kcalCardioDia(70, 70), 70); // 0,1 × 70 × 70 ÷ 7
});

test('macros: 2 g/kg de proteína, 0,9 g/kg de grasa y el resto hidratos', () => {
  assert.deepEqual(macros(2500, 80), { kcal: 2500, proteina: 160, grasa: 72, hidratos: 303 });
});

test('volumen con superávit pequeño; mantenimiento redondeado', () => {
  assert.equal(objetivo(2843, 'volumen'), 3040);
  assert.equal(objetivo(2843, 'mantener'), 2840);
});

test('mezclador: suma comida, pasos y cardio añadidos y juzga el ritmo', () => {
  const m = mezclar({ peso: 85, sexo: 'hombre', mantenimiento: 3000, pasosActuales: 8000, cardioActual: 0, recorte: 300, pasos: 10000, cardio: 70 });
  assert.equal(m.comer, 2700);
  assert.ok(Math.abs(m.partes.pasos - 106.25) < 1e-9);
  assert.ok(Math.abs(m.partes.cardio - 85) < 1e-9);
  assert.equal(m.ritmo, 'bueno');
  assert.equal(mezclar({ peso: 85, mantenimiento: 3000, recorte: 900 }).ritmo, 'minicut');
  assert.equal(mezclar({ peso: 85, mantenimiento: 3000, recorte: 1000, pasosActuales: 8000, pasos: 16000 }).ritmo, 'demasiado');
  assert.equal(mezclar({ peso: 85, mantenimiento: 3000, recorte: 100 }).ritmo, 'suave');
  // Lo que ya hacías no cuenta como déficit.
  assert.equal(mezclar({ peso: 85, mantenimiento: 3000, pasosActuales: 12000, pasos: 8000 }).partes.pasos, 0);
  assert.equal(mezclar({ peso: 70, sexo: 'mujer', mantenimiento: 1900, recorte: 600 }).pocaComida, true);
});

test('propuesta: primero moverse y luego quitar comida', () => {
  const p = propuesta({ peso: 85, pasosActuales: 8000, cardioActual: 0 });
  assert.deepEqual(p, { pasos: 10000, cardio: 60, recorte: 300 });
  assert.equal(propuesta({ peso: 85, pasosActuales: 14000, cardioActual: 120 }).recorte, 500);
});
