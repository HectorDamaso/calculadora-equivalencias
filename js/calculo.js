// Lógica de la calculadora. Sin dependencias del navegador: se prueba con node --test.

export const NUTRIENTES = ['proteina', 'hidratos', 'grasa'];
export const MAXIMO = 2000; // gramos que se pueden escribir
const PRACTICO = 1000; // por encima, la cantidad no es razonable para una comida

/** Nutrientes de una cantidad en gramos. */
export function porcion(alimento, gramos) {
  const f = gramos / 100;
  return {
    kcal: alimento.kcal * f,
    proteina: alimento.proteina * f,
    hidratos: alimento.hidratos * f,
    grasa: alimento.grasa * f,
  };
}

/**
 * El tipo de alimento: es el nutriente por el que se iguala en «Automático».
 * Si al menos el 30 % de sus calorías es proteína y tiene más proteína que hidratos,
 * cuenta como proteína (salmón, huevo, jamón serrano…), aunque la grasa aporte más
 * calorías. Si no, manda el nutriente que más calorías aporta.
 */
export function nutrientePrincipal(alimento) {
  const energia = { proteina: alimento.proteina * 4, hidratos: alimento.hidratos * 4, grasa: alimento.grasa * 9 };
  const total = energia.proteina + energia.hidratos + energia.grasa;
  if (total > 0 && energia.proteina >= 0.3 * total && alimento.proteina >= alimento.hidratos) return 'proteina';
  return NUTRIENTES.reduce((a, b) => (energia[b] > energia[a] ? b : a));
}

export const MINIMO_COMPENSAR = 3; // g de grasa: por debajo no merece la pena compensar

/**
 * Cómo igualar las grasas cuando un cambio deja `diferencia` g de grasa de más o de menos.
 * diferencia < 0 → faltan grasas: gramos que añadir de cada grasa.
 * diferencia > 0 → sobran grasas: gramos que quitar de esa grasa en el resto del día.
 * Devuelve null si la diferencia es pequeña.
 */
export function compensarGrasas(catalogo, ids, diferencia) {
  if (!Number.isFinite(diferencia) || Math.abs(diferencia) < MINIMO_COMPENSAR) return null;
  const grasa = Math.abs(diferencia);
  const opciones = ids
    .map((id) => catalogo.find((a) => a.id === id))
    .filter((a) => a && a.grasa > 0)
    .map((alimento) => {
      const gramos = redondear((grasa * 100) / alimento.grasa);
      return { alimento, gramos, aporta: porcion(alimento, gramos) };
    });
  return opciones.length ? { falta: diferencia < 0, grasa, opciones } : null;
}

/** Cantidades que se pueden pesar: de 1 en 1 g por debajo de 20 g; si no, de 5 en 5 g. */
export function redondear(gramos) {
  return gramos < 20 ? Math.max(1, Math.round(gramos)) : Math.round(gramos / 5) * 5;
}

/** Regla fija entre dos alimentos, en cualquiera de los dos sentidos. */
export function reglaEntre(reglas, de, a) {
  for (const regla of reglas) {
    if (regla.a.includes(de) && regla.b.includes(a)) return { regla, factor: regla.factor };
    if (regla.b.includes(de) && regla.a.includes(a)) return { regla, factor: 1 / regla.factor };
  }
  return null;
}

/**
 * Alternativas a `cantidad` gramos del alimento `de`.
 * metrica: 'auto' | 'proteina' | 'hidratos' | 'grasa' | 'kcal'.
 * todos: false → solo alimentos del mismo tipo (mismo nutriente principal).
 */
export function equivalencias(catalogo, reglas, { de, cantidad, metrica = 'auto', todos = false, grasas = [] }) {
  const original = catalogo.find((a) => a.id === de);
  if (!original) throw new Error('Elige un alimento de la lista.');
  if (!Number.isFinite(cantidad) || cantidad <= 0 || cantidad > MAXIMO) {
    throw new Error(`Indica una cantidad entre 1 y ${MAXIMO} g.`);
  }
  const tipo = nutrientePrincipal(original);
  const nutriente = metrica === 'auto' ? tipo : metrica;
  const antes = porcion(original, cantidad);
  if (antes[nutriente] <= 0) throw new Error('Este alimento no aporta el nutriente elegido.');

  const alternativas = catalogo
    .filter((a) => a.id !== de && a[nutriente] > 0 && (todos || nutrientePrincipal(a) === tipo))
    .map((alimento) => {
      const fija = nutriente === 'hidratos' ? reglaEntre(reglas, de, alimento.id) : null;
      const gramos = fija
        ? Math.round((cantidad * fija.factor) / 10) * 10
        : redondear((antes[nutriente] * 100) / alimento[nutriente]);
      const despues = porcion(alimento, gramos);
      const cambio = {
        kcal: despues.kcal - antes.kcal,
        proteina: despues.proteina - antes.proteina,
        hidratos: despues.hidratos - antes.hidratos,
        grasa: despues.grasa - antes.grasa,
      };
      // Cuánto se parecen el resto de nutrientes (más bajo = más parecido).
      const distancia =
        Math.abs(cambio.proteina) / 10 + Math.abs(cambio.hidratos) / 20 + Math.abs(cambio.grasa) / 5;
      // Si se iguala por grasas, no hace falta compensarlas.
      const compensar = nutriente === 'grasa' ? null : compensarGrasas(catalogo, grasas, cambio.grasa);
      return { alimento, gramos, despues, cambio, compensar, regla: fija?.regla ?? null, practica: gramos <= PRACTICO, distancia };
    })
    .sort(
      (x, y) =>
        Number(y.practica) - Number(x.practica) ||
        Number(Boolean(y.regla)) - Number(Boolean(x.regla)) ||
        x.distancia - y.distancia,
    );

  return { original, cantidad, nutriente, tipo, antes, alternativas };
}
