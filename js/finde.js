// «Modo fin de semana»: encajar una comida fuera siguiendo el método de Héctor.
// Sin dependencias del navegador: se prueba con node --test.
//
// Método (tema «Fin de semana y vida social» del vault):
// - Las comidas fuera caben en el plan: lo que cuenta es lo que haces la mayor parte
//   del tiempo (80/20 o 90/10). Sin alimentos prohibidos.
// - No se compensa: ni saltarse comidas ni recortar los días siguientes. Se vuelve
//   al plan en la siguiente comida.
// - El cuerpo funciona por semanas: una comida fuera como mucho retrasa unos días.
// - La subida de la báscula al día siguiente es comida, sal y agua, no grasa.
// - Asegurar la proteína ese día. El problema es que se convierta en costumbre.

// Calorías aproximadas por unidad. Son estimaciones de raciones típicas de restaurante.
export const PLATOS = [
  { id: 'pizza', nombre: 'Pizza entera', kcal: 1000, grupo: 'comida' },
  { id: 'hamburguesa-patatas', nombre: 'Hamburguesa con papas fritas', kcal: 1100, grupo: 'comida' },
  { id: 'hamburguesa', nombre: 'Hamburguesa sola', kcal: 650, grupo: 'comida' },
  { id: 'kebab', nombre: 'Kebab o dürüm', kcal: 750, grupo: 'comida' },
  { id: 'sushi', nombre: 'Sushi (12 piezas)', kcal: 550, grupo: 'comida' },
  { id: 'pasta', nombre: 'Plato de pasta', kcal: 800, grupo: 'comida' },
  { id: 'carne', nombre: 'Carne con papas fritas', kcal: 900, grupo: 'comida' },
  { id: 'tapa', nombre: 'Tapa o ración (tu parte)', kcal: 350, grupo: 'comida' },
  { id: 'papas', nombre: 'Ración de papas fritas', kcal: 400, grupo: 'comida' },
  { id: 'pan', nombre: 'Pan del restaurante', kcal: 250, grupo: 'comida' },
  { id: 'postre', nombre: 'Postre', kcal: 400, grupo: 'postre' },
  { id: 'helado', nombre: 'Helado', kcal: 250, grupo: 'postre' },
  { id: 'cana', nombre: 'Caña de cerveza', kcal: 100, grupo: 'bebida', alcohol: true },
  { id: 'tercio', nombre: 'Tercio o botellín', kcal: 140, grupo: 'bebida', alcohol: true },
  { id: 'vino', nombre: 'Copa de vino', kcal: 120, grupo: 'bebida', alcohol: true },
  { id: 'copa', nombre: 'Copa o cubata', kcal: 220, grupo: 'bebida', alcohol: true },
  { id: 'chupito', nombre: 'Chupito', kcal: 70, grupo: 'bebida', alcohol: true },
  { id: 'refresco', nombre: 'Refresco con azúcar', kcal: 140, grupo: 'bebida' },
];

export const DEFICIT_TIPICO = 400; // kcal al día en definición, si no se sabe
export const COMIDA_NORMAL = 700; // kcal de la comida del plan que se sustituye, por defecto

/**
 * Datos: { objetivo: 'definicion' | 'volumen' | 'mantener', cantidades: { id: n },
 *          comidaNormal?, kcalDia?, deficit?, comidasFuera? (en la semana, contando esta) }
 */
export function encajar({ objetivo, cantidades, comidaNormal = COMIDA_NORMAL, kcalDia, deficit, comidasFuera = 1 }) {
  const lineas = PLATOS
    .filter((p) => (cantidades[p.id] ?? 0) > 0)
    .map((p) => ({ ...p, cantidad: cantidades[p.id], total: p.kcal * cantidades[p.id] }));
  if (!lineas.length) throw new Error('Elige lo que vas a tomar.');
  const total = lineas.reduce((s, l) => s + l.total, 0);
  const normal = Number.isFinite(comidaNormal) && comidaNormal >= 0 ? comidaNormal : COMIDA_NORMAL;
  const exceso = Math.max(0, total - normal);

  const semana = Number.isFinite(kcalDia) && kcalDia > 0 ? (exceso / (kcalDia * 7)) * 100 : null;
  const deficitDia = Number.isFinite(deficit) && deficit > 0 ? deficit : DEFICIT_TIPICO;
  const retraso = objetivo === 'definicion' ? Math.max(exceso > 0 ? 1 : 0, Math.round(exceso / deficitDia)) : 0;

  const n = Number.isFinite(comidasFuera) && comidasFuera > 0 ? Math.round(comidasFuera) : 1;
  // Unas 28 comidas a la semana: 90/10 ≈ 2–3 fuera; 80/20 ≈ 5–6.
  const frecuencia = n <= 2 ? 'bien' : n <= 4 ? 'ojo' : 'mucho';

  const bebidas = lineas.filter((l) => l.alcohol).reduce((s, l) => s + l.cantidad, 0);
  const trucos = [];
  if (bebidas >= 4) trucos.push('Intercala alguna cerveza 0,0 o agua entre copa y copa: el alcohol es lo que más rápido suma y lo que antes se va de las manos.');
  if ((cantidades.pizza ?? 0) >= 1) trucos.push('Si sois varios, compartir pizzas y añadir una ensalada al centro llena igual y suma menos.');
  if ((cantidades['hamburguesa-patatas'] ?? 0) + (cantidades.carne ?? 0) >= 1) trucos.push('Pide que te cambien las papas fritas por ensalada o verduras, o compártelas.');
  if ((cantidades.postre ?? 0) + (cantidades.helado ?? 0) >= 1) trucos.push('El postre, si es compartido, se disfruta igual.');
  if ((cantidades.pan ?? 0) >= 1) trucos.push('El pan del principio es lo más fácil de dejar: guarda el hueco para lo que de verdad te apetece.');

  return { lineas, total, normal, exceso, semana, retraso, deficitDia, comidasFuera: n, frecuencia, trucos };
}
