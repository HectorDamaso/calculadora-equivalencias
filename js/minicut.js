// «¿Me viene bien un minicut?»: filtro y plan siguiendo el criterio de Héctor.
// Sin dependencias del navegador: se prueba con node --test.
//
// Criterio (revisiones de clientes en el vault: Nathan García, Nano Santana,
// Jorge Díaz, Víctor Méndez, José Carlos, Hugo Martín…):
// - Un minicut es una definición corta y agresiva: 800–1.000 kcal menos al día,
//   buscando perder un 8–10 % del peso en unas 4–8 semanas (nunca alargarlo meses).
// - Sirve cuando en el volumen se pasa el «punto dulce» y se gana más grasa que
//   músculo, para volver a ese punto y seguir creciendo.
// - Tiene que partir de calorías altas: si comes poco, no hay de dónde recortar.
// - Si se puede, mejor una meseta (mantener el peso unas semanas) que un minicut:
//   el tiempo en déficit es tiempo que no ganas músculo.
// - Durante: entreno a máxima intensidad, unos 12.000–15.000 pasos, cardio si hace
//   falta, tubérculos, verduras, legumbres y proteína magra.

export const DEFICIT = { min: 800, max: 1000 };
export const PERDIDA = { min: 8, max: 10 }; // % del peso
export const SEMANAS = { min: 4, max: 8 };
// Calorías mínimas durante el minicut (criterio de seguridad de la herramienta).
export const MINIMO_KCAL = { hombre: 1800, mujer: 1400 };

/**
 * Datos: { sexo: 'hombre'|'mujer', peso, kcal, vieneDe: 'volumen'|'mantenimiento'|'deficit',
 *   grasaDeMas: 'si'|'no' (¿ganas más grasa que músculo?), kgPerder, anosFuerza: 'menos1'|'1a3'|'mas3',
 *   diasFuerza, relacionComida: 'bien'|'dificil', estresSueno: 'bien'|'regular'|'mal',
 *   eventos: boolean (vacaciones, bodas… en las próximas 8 semanas), pasos: boolean (¿puede andar 12.000+?) }
 * Devuelve { veredicto, titulo, motivos: [texto], plan | null }.
 * veredicto: 'minicut' | 'deficit' | 'meseta' | 'esperar'
 */
export function evaluar(d) {
  if (!(d.peso > 0)) throw new Error('Escribe tu peso.');
  if (!(d.kcal > 0)) throw new Error('Escribe las calorías que comes ahora.');
  const sexo = d.sexo === 'mujer' ? 'mujer' : 'hombre';
  const pctPerder = d.kgPerder > 0 ? (d.kgPerder / d.peso) * 100 : null;
  const tras = d.kcal - DEFICIT.min; // calorías con el recorte más suave
  const motivos = [];
  const sale = (veredicto, titulo) => ({ veredicto, titulo, motivos, plan: veredicto === 'minicut' ? plan(d, sexo) : null });

  // 1. Cosas que piden un déficit normal (o nada de déficit).
  if (d.relacionComida === 'dificil') motivos.push('Si la comida te genera ansiedad o atracones, un recorte tan agresivo lo empeora. Un déficit suave, con margen, es lo que te va a funcionar.');
  if (d.vieneDe === 'deficit') motivos.push('Ya vienes de estar en déficit. Un minicut se hace saliendo de un volumen, con calorías altas, no encadenado a otra dieta.');
  if (d.anosFuerza === 'menos1') motivos.push('Llevas menos de un año entrenando fuerza: todavía puedes perder grasa y ganar músculo a la vez con un déficit normal. No necesitas apretar tanto.');
  if (Number.isFinite(d.diasFuerza) && d.diasFuerza < 3) motivos.push('Con menos de 3 días de fuerza a la semana, un recorte tan grande se come tu músculo. El entreno es lo que lo protege.');
  if (pctPerder !== null && pctPerder > 12) motivos.push(`Quieres perder ${fmt(d.kgPerder)} kg, un ${fmt(pctPerder)} % de tu peso. Un minicut es para un 8–10 %: para más, un déficit normal y sin prisa.`);
  if (tras < MINIMO_KCAL[sexo]) motivos.push(`Comes ${entero(d.kcal)} kcal. Quitando 800 te quedarías en ${entero(tras)}, por debajo de lo razonable. El minicut tiene que partir de calorías altas.`);
  if (motivos.length) return sale('deficit', 'Mejor un déficit normal');

  // 2. Puede que no haga falta: si no está ganando grasa de más, meseta o seguir.
  if (d.vieneDe === 'volumen' && d.grasaDeMas === 'no') {
    motivos.push('Si sigues ganando más músculo que grasa, no te hace falta parar. El tiempo en déficit es tiempo que no ganas músculo.');
    motivos.push('Si te ves algo tapado, prueba antes una meseta: mantener el peso unas semanas para que el cuerpo se asiente.');
    return sale('meseta', 'No te hace falta: sigue o haz una meseta');
  }

  // 3. Momento malo: mejor esperar.
  if (d.estresSueno === 'mal') motivos.push('Con mucho estrés o durmiendo mal, un recorte agresivo te hunde el entreno y el hambre se dispara. Arregla eso primero.');
  if (d.eventos) motivos.push('Tienes vacaciones o eventos en las próximas semanas. Un minicut tiene que ser seguido y corto: si se corta a la mitad, se alarga y pierde el sentido.');
  if (motivos.length) return sale('esperar', 'Ahora no: espera a un buen momento');

  // 4. Apto.
  if (d.vieneDe === 'mantenimiento') motivos.push('Partes de mantenimiento con calorías altas: puedes hacerlo, pero que sea corto y con el entreno a tope.');
  if (d.estresSueno === 'regular') motivos.push('Vigila el sueño y el estrés: son lo primero que se resiente en un recorte así.');
  if (d.pasos === false && d.cardio === false) motivos.push('Sin subir pasos ni hacer cardio, todo el déficit sale de la comida y vas a pasar más hambre. Aunque sean 20 minutos de cardio después de entrenar, ayudan.');
  else if (d.pasos === false) motivos.push('Como te cuesta subir pasos, el cardio tendrá más peso: unas 5 sesiones cortas a la semana.');
  return sale('minicut', 'Puedes hacer el minicut');
}

export const RECORTE_MINIMO_FORZADO = 500; // kcal: con menos margen, no es un minicut
export const SEMANAS_FORZADO = { min: 4, max: 6 };

/**
 * Minicut aunque el test no lo recomiende. Se ofrece salvo si la comida genera
 * ansiedad o atracones, o si las calorías no dejan margen para recortar.
 * Devuelve { permitido, motivo } o { permitido, plan, avisos }.
 */
export function minicutForzado(d) {
  const sexo = d.sexo === 'mujer' ? 'mujer' : 'hombre';
  if (d.relacionComida === 'dificil') {
    return { permitido: false, motivo: 'Con ansiedad o atracones no te voy a dar un minicut, aunque lo pidas: un recorte así lo empeora. Escríbeme y buscamos la forma de que pierdas grasa sin pasarlo mal.' };
  }
  if (!(d.kcal - MINIMO_KCAL[sexo] >= RECORTE_MINIMO_FORZADO)) {
    return { permitido: false, motivo: `Con ${entero(d.kcal)} kcal no hay de dónde recortar sin bajar de ${entero(MINIMO_KCAL[sexo])}. Un minicut con tan poco margen no es un minicut: es pasar hambre.` };
  }
  const base = plan(d, sexo);
  const avisos = ['Lo haces bajo tu responsabilidad: el test te recomienda otra cosa por los motivos de arriba.'];
  avisos.push(`Como no es tu momento ideal, que sea más corto: ${SEMANAS_FORZADO.min}–${SEMANAS_FORZADO.max} semanas como mucho, y después vuelve a mantenimiento.`);
  if (d.vieneDe === 'deficit') avisos.push('Vienes de estar en déficit: si el rendimiento cae o el hambre se dispara en las primeras dos semanas, para y pasa a mantenimiento.');
  if (d.anosFuerza === 'menos1') avisos.push('Llevas poco entrenando: no bajes las cargas ni un kilo. Es lo único que va a proteger tu músculo.');
  if (Number.isFinite(d.diasFuerza) && d.diasFuerza < 3) avisos.push('Sube a 3 días de fuerza como mínimo mientras dure.');
  const pct = d.kgPerder > 0 ? (d.kgPerder / d.peso) * 100 : null;
  if (pct !== null && pct > 12) avisos.push(`El minicut te quitará unos ${base.perder[0].toLocaleString('es-ES', { maximumFractionDigits: 1 })}–${base.perder[1].toLocaleString('es-ES', { maximumFractionDigits: 1 })} kg. El resto, con un déficit normal después de una pausa en mantenimiento.`);
  if (d.estresSueno === 'mal') avisos.push('Con estrés alto o mal descanso, el hambre y el cansancio van a ser mayores. Prioriza dormir.');
  if (d.eventos) avisos.push('Si en mitad del minicut tienes vacaciones o un evento, termínalo antes o empiézalo después: cortarlo a la mitad lo alarga.');
  if (d.vieneDe === 'volumen' && d.grasaDeMas === 'no') avisos.push('Sigues ganando más músculo que grasa: estás cortando un volumen que aún funcionaba.');
  return { permitido: true, plan: { ...base, semanas: [SEMANAS_FORZADO.min, SEMANAS_FORZADO.max] }, avisos };
}

const entero = (n) => Math.round(n).toLocaleString('es-ES');
const fmt = (n) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 });
const r10 = (n) => Math.round(n / 10) * 10;

// El déficit no sale solo de la comida: antes de quitar comida, moverse más.
export const DEFICIT_OBJETIVO = 900; // kcal al día, en medio de 800–1.000
export const RECORTE_COMIDA = { min: 300, max: 1000 }; // la comida siempre baja algo, nunca más de 1.000
export const PASOS = { meta: 12000, tope: 15000, sumaSiYaLlega: 2000, porDefecto: 8000 };
export const CARDIO = { minutos: 30, sesiones: 3, sesionesSinPasos: 5 };
// Gasto de la hoja de Héctor (igual que la calculadora de calorías y APP-1-1):
// 0,625 kcal por kg cada 1.000 pasos; cardio 0,1 kcal por kg y minuto.
const KCAL_1000_PASOS_KG = 0.625;
const KCAL_HORA_CARDIO_KG = 6;

/** Reparte el déficit del día entre pasos, cardio y comida. */
export function repartoDeficit({ peso, kcal, pasosActuales, masPasos = true, cardio = true }, sexo = 'hombre') {
  const actuales = pasosActuales > 0 ? Math.round(pasosActuales / 500) * 500 : PASOS.porDefecto;
  let meta = actuales;
  if (masPasos) meta = actuales < PASOS.meta ? PASOS.meta : Math.min(PASOS.tope, actuales + PASOS.sumaSiYaLlega);
  meta = Math.max(meta, actuales);
  const kcalPasos = ((meta - actuales) / 1000) * KCAL_1000_PASOS_KG * peso;

  const sesiones = cardio ? (masPasos ? CARDIO.sesiones : CARDIO.sesionesSinPasos) : 0;
  const kcalSesion = (CARDIO.minutos / 60) * KCAL_HORA_CARDIO_KG * peso;
  const kcalCardioDia = (sesiones * kcalSesion) / 7;

  const actividad = kcalPasos + kcalCardioDia;
  let recorte = Math.min(RECORTE_COMIDA.max, Math.max(RECORTE_COMIDA.min, r10(DEFICIT_OBJETIVO - actividad)));
  let comer = r10(kcal - recorte);
  if (comer < MINIMO_KCAL[sexo]) { comer = MINIMO_KCAL[sexo]; recorte = Math.max(0, kcal - comer); }
  const total = recorte + actividad;
  return {
    comer, recorte,
    pasos: { actuales, meta, kcal: kcalPasos },
    cardio: { sesiones, minutos: CARDIO.minutos, kcalSesion, kcalDia: kcalCardioDia },
    total,
    kgSemana: (total * 7) / 7700, // 1 kg de grasa ≈ 7.700 kcal
  };
}

function plan(d, sexo) {
  const proteina = Math.round(d.peso * 2 / 5) * 5; // ~2 g por kg
  const reparto = repartoDeficit({ peso: d.peso, kcal: d.kcal, pasosActuales: d.pasosActuales, masPasos: d.pasos !== false, cardio: d.cardio !== false }, sexo);
  return {
    ...reparto,
    perder: [d.peso * PERDIDA.min / 100, d.peso * PERDIDA.max / 100],
    pesoFinal: [d.peso * (1 - PERDIDA.max / 100), d.peso * (1 - PERDIDA.min / 100)],
    semanas: [SEMANAS.min, SEMANAS.max],
    proteina,
  };
}
