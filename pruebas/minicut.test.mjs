import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluar, minicutForzado, repartoDeficit } from '../js/minicut.js';

// Candidato ideal: viene de volumen con calorías altas, gana grasa de más, entrena años.
const ideal = {
  sexo: 'hombre', peso: 85, kcal: 3400, vieneDe: 'volumen', grasaDeMas: 'si', kgPerder: 7,
  anosFuerza: '1a3', diasFuerza: 4, relacionComida: 'bien', estresSueno: 'bien', eventos: false,
  pasosActuales: 8000, pasos: true, cardio: true,
};
const e = (cambios) => evaluar({ ...ideal, ...cambios });

test('candidato ideal: minicut con su plan', () => {
  const r = e({});
  assert.equal(r.veredicto, 'minicut');
  assert.equal(r.plan.comer, 2780); // 620 menos: el resto sale de pasos y cardio
  assert.equal(r.plan.pasos.meta, 12000);
  assert.equal(r.plan.cardio.sesiones, 3);
  assert.ok(Math.abs(r.plan.total - 900) < 10);
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
  const r = e({ sexo: 'mujer', peso: 62, kcal: 2300, kgPerder: 5, estresSueno: 'regular', pasos: false, cardio: false });
  assert.equal(r.veredicto, 'minicut');
  assert.equal(r.plan.comer, 1400); // 2300 − 900 = 1400: todo de la comida, sin bajar del suelo
  assert.equal(r.motivos.length, 2);
  assert.equal(e({ sexo: 'mujer', peso: 62, kcal: 2100 }).veredicto, 'deficit'); // 1300 < 1400
});

test('pide peso y calorías', () => {
  assert.throws(() => e({ peso: 0 }), /peso/);
  assert.throws(() => e({ kcal: NaN }), /calorías/);
});

test('minicut forzado: se ofrece con avisos y más corto', () => {
  const f = minicutForzado({ ...ideal, anosFuerza: 'menos1', eventos: true });
  assert.equal(f.permitido, true);
  assert.deepEqual(f.plan.semanas, [4, 6]);
  assert.equal(f.plan.comer, 2780);
  assert.ok(f.avisos.some((a) => /cargas/.test(a)) && f.avisos.some((a) => /vacaciones/.test(a)));
});

test('minicut forzado: nunca con ansiedad o atracones ni sin margen de calorías', () => {
  assert.equal(minicutForzado({ ...ideal, relacionComida: 'dificil' }).permitido, false);
  assert.equal(minicutForzado({ ...ideal, kcal: 2200 }).permitido, false); // 2200 − 1800 = 400 < 500
  const justo = minicutForzado({ ...ideal, kcal: 2400 }); // margen 600: se permite, sin bajar de 1800
  assert.equal(justo.permitido, true);
  assert.equal(justo.plan.comer, 1800);
});

test('reparto del déficit: primero moverse, la comida siempre baja algo', () => {
  const base = { peso: 85, kcal: 3400, pasosActuales: 8000 };
  const conTodo = repartoDeficit({ ...base, masPasos: true, cardio: true });
  const soloComida = repartoDeficit({ ...base, masPasos: false, cardio: false });
  assert.ok(conTodo.comer > soloComida.comer, 'moverse deja comer más');
  assert.equal(soloComida.recorte, 900);
  assert.equal(repartoDeficit({ ...base, masPasos: false, cardio: true }).cardio.sesiones, 5);
  // Si ya anda mucho, suma 2.000 pasos con tope de 15.000.
  assert.equal(repartoDeficit({ ...base, pasosActuales: 14000 }).pasos.meta, 15000);
  // Con muchísima actividad, la comida baja al menos 300.
  assert.ok(repartoDeficit({ peso: 120, kcal: 4000, pasosActuales: 3000 }).recorte >= 300);
});
