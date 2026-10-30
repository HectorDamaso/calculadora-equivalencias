# Calculadora de equivalencias · Héctor Dámaso

Web para los clientes de coaching: eliges un alimento de tu dieta y una cantidad, y te dice cuánto poner de otro alimento para que no se descuadren los números.

- **648 alimentos** del catálogo de Héctor (el mismo de la app de coaching), con los valores por 100 g y los nombres revisados (ver «Cambiar alimentos»).
- **Iguala por** proteína, hidratos, grasas o calorías. En «Automático», un alimento cuenta como proteína si al menos el 30 % de sus calorías es proteína y tiene más proteína que hidratos (salmón, huevo, jamón…); si no, usa el nutriente que más calorías le aporta.
- **Iguala las grasas**: si el cambio deja 3 g de grasa o más de diferencia, cada opción dice cuánto añadir (o quitar del resto del día) de aceite de oliva, aguacate, almendras, nueces, crema de cacahuete o chocolate negro 85 %. La lista está en `js/reglas.js` (`grasasParaCompensar`).
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
2. Ejecuta `npm run catalogo`. Regenera `datos/alimentos.json` aplicando `herramientas/correcciones.mjs`: nombres corregidos y categorías (`renombrar`), alimentos quitados con su motivo (`quitar`) y sinónimos para el buscador (`sinonimos`, p. ej. «patata» encuentra «papas»). Si dos alimentos acaban con el mismo nombre y los mismos valores, se queda uno; si los valores son distintos, el script para y avisa.
3. Ejecuta `npm test` (sirven Node 22 o posterior).

## Verla en local

```bash
npm run local
```

Abre http://127.0.0.1:4400.

## Publicación

Se publica con GitHub Pages desde la rama `main`, en la carpeta raíz. No hace falta compilar nada.

Las fuentes Anton y Space Grotesk tienen licencia SIL Open Font License.
