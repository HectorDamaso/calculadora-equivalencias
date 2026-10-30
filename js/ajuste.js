// «¿Subo o bajo?»: decide si tocar las calorías siguiendo el método de Héctor.
// Sin dependencias del navegador: se prueba con node --test.
//
// Reglas (sacadas de las revisiones de clientes, temas «Báscula y peso»,
// «Perder grasa despacio», «Volumen y superávit» y «Recomposición corporal»):
// - Si no se cumple el plan, no se tocan las calorías: primero cumplir.
// - Si la semana ha sido rara (estrés, mal sueño, regla, comidas fuera, enfermedad),
//   los pesos no son reales: se espera una semana.
// - Definición: perder entre 300 y 600 g a la semana (aquí, 0,25–0,8 % del peso).
//   Si va más rápido, se sube un poco; si se para, primero más pasos y luego
//   recortar muy poco. Si la cintura baja, se mantiene aunque la báscula no se mueva.
// - Volumen: subir un 1–2 % al mes (0,25–0,5 % a la semana) con superávit pequeño.
// - Recomposición: peso estable y cintura que baja; se exprimen las calorías.
// - Cambios de 100–150 kcal, nunca 500 de golpe.

export const OBJETIVOS = ['definicion', 'volumen', 'recomposicion'];
export const PASOS_MINIMOS = 10000; // por debajo, antes de quitar comida se suben pasos
export const CAMBIO = { min: 100, max: 150 }; // kcal por ajuste
const CINTURA = 0.5; // cm: por debajo, la cintura se considera igual

/** Ritmo de cambio: kg por semana y % del peso por semana, a partir de medias semanales. */
export function ritmo(pesos) {
  const p = pesos.filter((x) => Number.isFinite(x) && x > 0);
  if (p.length < 2) throw new Error('Escribe al menos el peso medio de dos semanas.');
  const semanas = p.length - 1;
  const kg = (p[p.length - 1] - p[0]) / semanas;
  return { kg, porcentaje: (kg / p[0]) * 100, semanas, inicial: p[0], final: p[p.length - 1] };
}

/** Rango de calorías nuevo (redondeado a 10) si se conocen las actuales. */
function nuevas(kcal, signo) {
  if (!Number.isFinite(kcal) || kcal <= 0) return null;
  const r = (n) => Math.round(n / 10) * 10;
  return signo > 0 ? [r(kcal + CAMBIO.min), r(kcal + CAMBIO.max)] : [r(kcal - CAMBIO.max), r(kcal - CAMBIO.min)];
}

/**
 * Datos: { objetivo, pesos: [medias semanales en kg], cinturaInicio?, cinturaFin?,
 *          cumplimiento: 'si' | 'casi' | 'no', semanaRara: boolean, pasos?, kcal? }
 * Devuelve { accion, titulo, motivo, consejo, kcalNuevas, ritmo, cintura }.
 * accion: 'mantener' | 'subir' | 'bajar' | 'pasos' | 'esperar' | 'cumplir'
 */
export function decidir(datos) {
  const { objetivo, pesos, cinturaInicio, cinturaFin, cumplimiento, semanaRara, pasos, kcal } = datos;
  if (!OBJETIVOS.includes(objetivo)) throw new Error('Elige tu objetivo.');
  const r = ritmo(pesos);
  const hayCintura = Number.isFinite(cinturaInicio) && Number.isFinite(cinturaFin) && cinturaInicio > 0 && cinturaFin > 0;
  const dc = hayCintura ? cinturaFin - cinturaInicio : null; // cm (negativo = baja)
  const cintura = dc === null ? 'sin-dato' : dc <= -CINTURA ? 'baja' : dc >= CINTURA ? 'sube' : 'igual';
  const base = { ritmo: r, cintura, cambioCintura: dc, kcalNuevas: null };
  const res = (accion, titulo, motivo, consejo = '', signo = 0) =>
    ({ ...base, accion, titulo, motivo, consejo, kcalNuevas: signo ? nuevas(kcal, signo) : null });

  if (cumplimiento !== 'si') {
    return res('cumplir', 'No toques las calorías',
      objetivo === 'volumen'
        ? 'Si no estás comiendo todo lo pautado, subir calorías es un error: el peso no se mueve porque no llega la comida, no porque falte.'
        : 'Si no estás cumpliendo el plan, los datos no dicen si las calorías funcionan o no.',
      'Cumple el plan al menos dos semanas seguidas y vuelve a mirarlo.');
  }
  if (semanaRara) {
    return res('esperar', 'Espera una semana más',
      'Con estrés, mal descanso, la regla, comidas fuera o enfermedad, la báscula no da pesos reales: hay agua, sal y comida, no grasa.',
      'Sigue igual esta semana y repite el cálculo con una semana normal.');
  }
  if (r.semanas < 2) {
    // Con dos semanas se puede orientar, pero el método pide tendencia.
    base.aviso = 'Con dos semanas es una orientación. Con tres semanas el resultado es más fiable.';
  }

  const pct = r.porcentaje; // % del peso por semana (negativo = pierde)
  const pocosPasos = Number.isFinite(pasos) && pasos > 0 && pasos < PASOS_MINIMOS;

  if (objetivo === 'definicion') {
    if (pct < -0.8) {
      return res('subir', `Sube ${CAMBIO.min}–${CAMBIO.max} kcal`,
        'Estás perdiendo demasiado rápido. A ese ritmo, parte de lo que pierdes es músculo y el hambre acaba ganando.',
        'Súbelas de hidratos y mantén la proteína. Lo que rápido viene, rápido se va.', +1);
    }
    if (pct <= -0.25) {
      return res('mantener', 'Mantén las calorías',
        'Vas al ritmo bueno: entre 300 y 600 g a la semana. Si el peso se mueve con la comida que tienes, no hay por qué pasar hambre.',
        'Sigue igual y vuelve a mirarlo en dos semanas.');
    }
    if (cintura === 'baja') {
      return res('mantener', 'Mantén las calorías',
        'La báscula casi no se mueve, pero la cintura baja: estás perdiendo grasa. El peso es el dato más mentiroso.',
        'Sigue igual. Mira también las fotos: mandan más que el número.');
    }
    if (pocosPasos) {
      return res('pasos', 'Antes de quitar comida, muévete más',
        `Estás parado, pero andas menos de ${PASOS_MINIMOS.toLocaleString('es-ES')} pasos al día. Antes de bajarte comida, prefiero que subas pasos.`,
        'Suma unos 2.000 pasos diarios durante dos semanas y vuelve a mirarlo.');
    }
    return res('bajar', `Baja ${CAMBIO.min}–${CAMBIO.max} kcal`,
      'El peso y la cintura llevan parados aunque cumples y te mueves. Toca un ajuste pequeño, no un recorte drástico.',
      'Quítalas de hidratos o grasas, nunca de la proteína.', -1);
  }

  if (objetivo === 'volumen') {
    if (pct > 0.5) {
      if (cintura === 'sube') {
        return res('bajar', `Baja ${CAMBIO.min}–${CAMBIO.max} kcal`,
          'Estás subiendo de peso demasiado rápido y la cintura también sube: parte de lo que ganas es grasa.',
          'Volumen no es comer sin más. Ajusta y que la subida sea lenta.', -1);
      }
      return res('mantener', 'Mantén y vigila la cintura',
        'Subes algo rápido, pero la cintura no sube. Puede ser comida y agua de las calorías nuevas.',
        'Sigue igual dos semanas. Si la cintura empieza a subir, baja un poco.');
    }
    if (pct >= 0.25) {
      return res('mantener', 'Mantén las calorías',
        'Subes al ritmo bueno, entre un 1 y un 2 % al mes. Así ganas músculo con la mínima grasa.',
        'Sigue igual y dale caña al entreno: es lo que le da al cuerpo un motivo para crecer.');
    }
    return res('subir', `Sube ${CAMBIO.min}–${CAMBIO.max} kcal`,
      'El peso no sube aunque cumples. Un superávit pequeño basta para crecer: con 100–150 kcal más ya le das al cuerpo un motivo.',
      'Súbelas poco a poco, nunca 500 de golpe: el cuerpo tiene que acostumbrarse.', +1);
  }

  // Recomposición
  if (cintura === 'sube' && pct > 0.25) {
    return res('bajar', `Baja unas ${CAMBIO.min} kcal`,
      'Suben el peso y la cintura: estás ganando algo de grasa.', 'Un ajuste pequeño basta.', -1);
  }
  if (pct < -0.5) {
    return res('subir', `Sube ${CAMBIO.min}–${CAMBIO.max} kcal`,
      'Estás perdiendo peso más rápido de lo que pide una recomposición. Corres el riesgo de perder músculo.',
      'Súbelas de hidratos para rendir mejor en el entreno.', +1);
  }
  if (cintura === 'baja' || (cintura === 'igual' && pct > 0)) {
    return res('mantener', 'Mantén las calorías',
      'Es lo ideal en una recomposición: la báscula casi no se mueve, pero el cuerpo cambia. Mientras el físico mejore, exprimimos estas calorías.',
      'Sigue igual y mira las fotos cada dos semanas.');
  }
  if (cintura === 'sin-dato') {
    return res('mantener', 'Mantén y mídete la cintura',
      'En una recomposición la báscula apenas se mueve, así que el peso solo no dice si vas bien. La cintura sí.',
      'Mídete la cintura a la altura del ombligo dos semanas y vuelve a mirarlo.');
  }
  if (pocosPasos) {
    return res('pasos', 'Muévete más antes de tocar la comida',
      `Nada cambia y andas menos de ${PASOS_MINIMOS.toLocaleString('es-ES')} pasos al día. Subir pasos ya cambia la composición corporal.`,
      'Suma unos 2.000 pasos diarios durante dos semanas.');
  }
  return res('bajar', `Baja unas ${CAMBIO.min} kcal`,
    'Ni el peso ni la cintura se mueven aunque cumples y te mueves. Un pequeño déficit hará que la grasa empiece a irse.',
    'Quítalas de hidratos o grasas y mantén la proteína alta.', -1);
}
