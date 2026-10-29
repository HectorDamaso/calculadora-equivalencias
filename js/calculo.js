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

/** El nutriente que más calorías aporta: es por el que se iguala en «Automático». */
export function nutrientePrincipal(alimento) {
  const energia = { proteina: alimento.proteina * 4, hidratos: alimento.hidratos * 4, grasa: alimento.grasa * 9 };
  return NUTRIENTES.reduce((a, b) => (energia[b] > energia[a] ? b : a));
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
export function equivalencias(catalogo, reglas, { de, cantidad, metrica = 'auto', todos = false }) {
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
      return { alimento, gramos, despues, cambio, regla: fija?.regla ?? null, practica: gramos <= PRACTICO, distancia };
    })
    .sort(
      (x, y) =>
        Number(y.practica) - Number(x.practica) ||
        Number(Boolean(y.regla)) - Number(Boolean(x.regla)) ||
        x.distancia - y.distancia,
    );

  return { original, cantidad, nutriente, tipo, antes, alternativas };
}
