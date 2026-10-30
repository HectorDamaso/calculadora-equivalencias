// «Calculadora de calorías»: mantenimiento, objetivo y mezclador del déficit.
// Sin dependencias del navegador: se prueba con node --test.
//
// Fórmulas de la hoja «FORMULAS METABOLISMO» de Héctor (las mismas que la
// calculadora de APP-1-1, shared/nutrition.mjs):
// - Metabolismo basal: media de Mifflin-St Jeor, Tinsley (24,8 × kg), OMS y Eric Helms (22 × kg).
// - Mantenimiento = basal × 1,2 (actividad) × 1,1 (termogénesis) + pasos + entreno + cardio.
// - Pasos: 0,625 kcal por kg cada 1.000 pasos al día.
// - Fuerza: 0,07 kcal × kg × minutos a la semana ÷ 7.
// - Cardio: 0,1 kcal × kg × minutos a la semana ÷ 7.
// - Macros: proteína 2 g/kg, grasa 0,9 g/kg, el resto hidratos.
// Objetivos del método: déficit para perder 300–600 g a la semana; volumen con
// superávit pequeño (subir un 1–2 % al mes); minicut 800–1.000 kcal.

export const ACTIVIDAD = 1.2;
export const TERMOGENESIS = 1.1;
export const KCAL_PASOS = 0.625; // por kg cada 1.000 pasos
export const KCAL_FUERZA = 0.07; // por kg y minuto
export const KCAL_CARDIO = 0.1; // por kg y minuto
export const MACROS = { proteina: 2, grasa: 0.9 }; // g por kg
export const SUPERAVIT = 200; // kcal al día en volumen
export const MINIMO_KCAL = { hombre: 1800, mujer: 1400 };
const KCAL_KG_GRASA = 7700;

const r10 = (n) => Math.round(n / 10) * 10;

function oms(sexo, edad, peso) {
  const tabla = sexo === 'hombre'
    ? [[18, 17.5, 651], [30, 15.3, 679], [60, 11.6, 879], [Infinity, 13.5, 487]]
    : [[18, 12.2, 746], [30, 14.7, 496], [60, 8.7, 829], [Infinity, 10.5, 596]];
  const [, a, b] = tabla.find(([limite]) => edad < limite);
  return a * peso + b;
}

/** Gasto diario. Datos: { sexo, edad, peso, altura, pasos, fuerzaMin, cardioMin } (minutos a la semana). */
export function gasto({ sexo, edad, peso, altura, pasos = 0, fuerzaMin = 0, cardioMin = 0 }) {
  if (!(edad >= 14 && edad <= 100)) throw new Error('Escribe tu edad.');
  if (!(peso >= 30 && peso <= 300)) throw new Error('Escribe tu peso.');
  if (!(altura >= 120 && altura <= 230)) throw new Error('Escribe tu altura en cm.');
  const s = sexo === 'mujer' ? 'mujer' : 'hombre';
  const formulas = [
    10 * peso + 6.25 * altura - 5 * edad + (s === 'hombre' ? 5 : -161), // Mifflin-St Jeor
    24.8 * peso, // Tinsley
    oms(s, edad, peso),
    22 * peso, // Eric Helms
  ];
  const basal = formulas.reduce((a, b) => a + b, 0) / formulas.length;
  const base = basal * ACTIVIDAD * TERMOGENESIS;
  const extra = {
    pasos: kcalPasos(peso, pasos || 0),
    fuerza: (KCAL_FUERZA * peso * (fuerzaMin || 0)) / 7,
    cardio: kcalCardioDia(peso, cardioMin || 0),
  };
  return { basal, base, extra, mantenimiento: base + extra.pasos + extra.fuerza + extra.cardio };
}

export const kcalPasos = (peso, pasos) => KCAL_PASOS * peso * (pasos / 1000);
export const kcalCardioDia = (peso, minutosSemana) => (KCAL_CARDIO * peso * minutosSemana) / 7;

/** Macros para unas calorías: proteína y grasa por kilo, hidratos el resto. */
export function macros(kcal, peso) {
  const proteina = Math.round(MACROS.proteina * peso);
  const grasa = Math.round(MACROS.grasa * peso);
  return { kcal: Math.round(kcal), proteina, grasa, hidratos: Math.max(0, Math.round((kcal - proteina * 4 - grasa * 9) / 4)) };
}

/** Calorías para mantener o para volumen (superávit pequeño). */
export function objetivo(mantenimiento, tipo) {
  if (tipo === 'volumen') return r10(mantenimiento + SUPERAVIT);
  return r10(mantenimiento);
}

/**
 * Mezclador del déficit. Datos: { peso, sexo, mantenimiento, pasosActuales, cardioActual,
 *   recorte (kcal menos de comida), pasos (nuevos pasos al día), cardio (nuevos minutos a la semana) }.
 * Lo que ya haces está dentro del mantenimiento: solo cuenta lo que añades.
 */
export function mezclar({ peso, sexo, mantenimiento, pasosActuales = 0, cardioActual = 0, recorte = 0, pasos, cardio }) {
  const s = sexo === 'mujer' ? 'mujer' : 'hombre';
  const pasosNuevos = Math.max(pasosActuales, pasos ?? pasosActuales);
  const cardioNuevo = Math.max(cardioActual, cardio ?? cardioActual);
  const deComida = Math.max(0, recorte);
  const dePasos = kcalPasos(peso, pasosNuevos - pasosActuales);
  const deCardio = kcalCardioDia(peso, cardioNuevo - cardioActual);
  const total = deComida + dePasos + deCardio;
  const comer = r10(mantenimiento - deComida);
  const kgSemana = (total * 7) / KCAL_KG_GRASA;
  const pct = (kgSemana / peso) * 100;
  // Ritmo según el método: 300–600 g a la semana (≈0,25–0,8 %); 800–1.000 kcal es un minicut.
  let ritmo;
  if (total < 1) ritmo = 'nada';
  else if (pct < 0.25) ritmo = 'suave';
  else if (total >= 800 && total <= 1050) ritmo = 'minicut';
  else if (pct <= 0.8) ritmo = 'bueno';
  else if (total > 1050) ritmo = 'demasiado';
  else ritmo = 'rapido';
  return {
    comer, total, kgSemana, pct, ritmo,
    partes: { comida: deComida, pasos: dePasos, cardio: deCardio },
    pasos: pasosNuevos, cardio: cardioNuevo,
    pocaComida: comer < MINIMO_KCAL[s],
    minimo: MINIMO_KCAL[s],
  };
}

/**
 * Punto de partida del plan según el método: primero moverse, luego quitar comida.
 * Pasos: +2.000 hasta 10.000 como mucho. Cardio que se añade: 2 sesiones de 30 minutos.
 */
export function propuesta({ peso, pasosActuales = 0, objetivoKcal = 500 }) {
  const pasos = pasosActuales < 10000 ? Math.min(10000, Math.ceil((pasosActuales + 2000) / 500) * 500) : pasosActuales;
  const sesiones = 2, minutos = 30;
  const movimiento = kcalPasos(peso, pasos - pasosActuales) + kcalCardioDia(peso, sesiones * minutos);
  const recorte = Math.max(150, Math.round((objetivoKcal - movimiento) / 50) * 50);
  return { pasos, sesiones, minutos, recorte };
}

/** Límites del medidor (kcal de déficit al día) según el peso y el método. */
export function zonas(peso) {
  const porPct = (pct) => ((pct / 100) * peso * KCAL_KG_GRASA) / 7;
  const bueno = porPct(0.25), rapido = Math.min(porPct(0.8), 800);
  return { suave: [0, bueno], bueno: [bueno, rapido], rapido: [rapido, 800], minicut: [800, 1050], demasiado: [1050, 1300] };
}

/** Comparación de lo que come ahora con su mantenimiento. */
export function comparar(mantenimiento, ingesta, peso) {
  if (!(ingesta > 0)) return null;
  const diferencia = ingesta - mantenimiento; // negativo = déficit
  const kgSemana = (diferencia * 7) / KCAL_KG_GRASA;
  const estado = Math.abs(diferencia) < 150 ? 'mantenimiento' : diferencia < 0 ? 'deficit' : 'superavit';
  return { diferencia, kgSemana, estado, pct: (kgSemana / peso) * 100 };
}
