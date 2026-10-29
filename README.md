# Calculadora de equivalencias · Héctor Dámaso

Web para los clientes de coaching: eliges un alimento de tu dieta y una cantidad, y te dice cuánto poner de otro alimento para que no se descuadren los números.

- **736 alimentos** del catálogo de Héctor (el mismo de la app de coaching), con los valores por 100 g.
- **Iguala por** proteína, hidratos, grasas o calorías. En «Automático» usa el nutriente que más calorías aporta al alimento.
- Por defecto propone alimentos del mismo tipo (por ejemplo, proteína por proteína). «Ver todos los alimentos» enseña el resto.
- Cantidades redondeadas para poder pesarlas: de 5 en 5 g, o de 1 en 1 g por debajo de 20 g.
- **Equivalencias fijas de Héctor**, que mandan sobre el cálculo al igualar por hidratos: 100 g de arroz en seco = 400 g de papas en crudo. Están en `js/reglas.js`.

Es una web estática: HTML, CSS y JavaScript, sin servidor, sin base de datos, sin cookies y sin recoger datos. Solo recuerda en el propio navegador el último alimento elegido.

## Estructura

| Ruta | Qué es |
|---|---|
| `index.html`, `estilos.css` | La página y su estilo (marca de Héctor Dámaso). |
| `js/calculo.js` | El cálculo de equivalencias. |
| `js/reglas.js` | Las equivalencias fijas. |
| `js/app.js` | La interfaz. |
| `datos/alimentos.json` | El catálogo que usa la web (generado). |
| `herramientas/` | El catálogo original de la app de coaching y el script que lo convierte. |

## Cambiar alimentos

1. Sustituye `herramientas/catalogo-app-1-1.json` por la versión nueva del catálogo de la app de coaching.
2. Ejecuta `npm run catalogo`. Regenera `datos/alimentos.json`, aplicando las correcciones de categoría del script.
3. Ejecuta `npm test` (sirven Node 22 o posterior).

## Verla en local

```bash
npm run local
```

Abre http://127.0.0.1:4400.

## Publicación

Se publica con GitHub Pages desde la rama `main`, en la carpeta raíz. No hace falta compilar nada.

Las fuentes Anton y Space Grotesk tienen licencia SIL Open Font License.
