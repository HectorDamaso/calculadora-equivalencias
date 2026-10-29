// Equivalencias fijas de Héctor. Mandan sobre el cálculo por macros cuando se
// iguala por hidratos. Para añadir una regla: los alimentos del lado A, los del
// lado B y cuántos gramos de B equivalen a 1 g de A.
export const reglas = [
  {
    texto: '100 g de arroz en seco = 400 g de papas en crudo',
    a: [
      'arroz-blanco-en-crudo',
      'arroz-basmati-crudo',
      'arroz-basmati-en-seco',
      'arroz-basmati-aromatico-hacendado',
      'arroz-basmati-carrefour-bio',
    ],
    b: ['papas-en-crudo'],
    factor: 4,
  },
];
