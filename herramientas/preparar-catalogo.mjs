// Convierte el catálogo de APP-1-1 (herramientas/catalogo-app-1-1.json) en
// datos/alimentos.json, el que usa la calculadora. Uso: node herramientas/preparar-catalogo.mjs
import {readFileSync,writeFileSync} from 'node:fs';
const origen=JSON.parse(readFileSync(new URL('./catalogo-app-1-1.json',import.meta.url),'utf8'));
const nombres={'CEREALES Y TUBERCULOS':'Cereales y tubérculos','CARNES':'Carnes','PESCADOS Y MARISCOS':'Pescados y mariscos','HUEVOS':'Huevos','FIAMBRES':'Fiambres','LACTEOS':'Lácteos y bebidas','LEGUMBRES':'Legumbres','FRUTAS':'Frutas','VERDURAS':'Verduras','GRASAS Y FRUTOS SECOS':'Grasas y frutos secos','SALSAS Y OTROS':'Salsas y otros','SUPLEMENTOS':'HSN y suplementos'};
// Correcciones de categoría (los de «Otros» y una bebida catalogada como cereal).
const recolocar={'Arroz basmati (en seco)':'CEREALES Y TUBERCULOS','Pan integral':'CEREALES Y TUBERCULOS','Pasta (en seco)':'CEREALES Y TUBERCULOS','Tortitas de arroz (Hacendado)':'CEREALES Y TUBERCULOS','Atún al natural':'PESCADOS Y MARISCOS','Merluza':'PESCADOS Y MARISCOS','Salmón':'PESCADOS Y MARISCOS','Huevo entero':'HUEVOS','Arroz Carrefour BIO':'LACTEOS'};
const renombrar={'Papas (versión 1)':'Papas en crudo'};
const quitar=new Set(['Papas (versión 2)']); // igual que la versión 1
const slug=t=>t.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const usados=new Set();
const alimentos=origen.filter(a=>!quitar.has(a.name)).map(a=>{
 const nombre=(renombrar[a.name]??a.name).replace(/\s+/g,' ').trim();
 const cat=recolocar[a.name]??a.category;
 if(!nombres[cat])throw Error('Categoría sin nombre: '+cat+' ('+a.name+')');
 let id=slug(nombre),n=2;while(usados.has(id))id=slug(nombre)+'-'+n++;usados.add(id);
 for(const k of ['kcal','protein','carbs','fat'])if(typeof a[k]!=='number'||!(a[k]>=0))throw Error('Valor no válido en '+a.name);
 return {id,nombre,categoria:nombres[cat],kcal:a.kcal,proteina:a.protein,hidratos:a.carbs,grasa:a.fat};
}).sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
writeFileSync(new URL('../datos/alimentos.json',import.meta.url),JSON.stringify({fuente:'Catálogo de alimentos de Héctor Dámaso (APP-1-1), valores por 100 g',alimentos},null,1)+'\n');
console.log(alimentos.length+' alimentos');
