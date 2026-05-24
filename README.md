# Airbnb Semantic

Buscador semantico de alojamientos construido con **Next.js 16**, **Apache Jena Fuseki** y una ontologia **OWL/RDF** enriquecida con enlaces a **DBpedia**.

La app ya soporta tres idiomas:

- `es`
- `en`
- `fr`

Las rutas publicas son `/<lang>`:

- `http://localhost:3000/es`
- `http://localhost:3000/en`
- `http://localhost:3000/fr`

## Que incluye

- Ontologia principal en `ontology/Airbnb.owl`
- Labels y descripciones multilingues con `rdfs:label` y `rdfs:comment`
- Enlaces a DBpedia con `owl:sameAs` y `owl:equivalentClass`
- Consultas SPARQL sobre Fuseki con fallback por idioma
- Procesamiento lingüístico de consultas en lenguaje natural
- Imagenes remotas desde Unsplash ya embebidas en la ontologia

## Requisitos

- [Bun](https://bun.sh) o Node 20+
- Java 17+
- Apache Jena Fuseki 6+
- Configuración del módulo de procesamiento lingüístico en `.env` o `.env.local`

## Variables de entorno

```env
MODULE_ACCESS_KEY=tu_clave_de_acceso
FUSEKI_ENDPOINT=http://localhost:3030/airbnb/sparql
```

Sin la configuración del módulo de procesamiento lingüístico, la app sigue funcionando, pero cae a búsqueda simple por texto.

## Estructura clave

- `ontology/Airbnb.owl`: ontologia fuente
- `scripts/enrich-ontology.mjs`: regenera labels y comments `es/en/fr`
- `app/api/buscar/ontology.ts`: consultas SPARQL y carga del catalogo
- `app/api/buscar/`: procesamiento lingüístico de consulta por idioma
- `app/[lang]/home-client.tsx`: UI localizada
- `lib/i18n.ts`: diccionarios y locales soportados

## Levantar Fuseki

Si usas la instalacion local del repo hermano o tu carpeta externa de Fuseki:

```powershell
.\fuseki-server.bat
```

El dataset esperado es `airbnb`.

El endpoint SPARQL debe quedar en:

```text
http://localhost:3030/airbnb/sparql
```

## Cargar la ontologia en Fuseki

Cada vez que cambies `ontology/Airbnb.owl`, vuelve a subirla al dataset:

```powershell
Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:3030/airbnb/data?default" -Method Put -ContentType "application/rdf+xml" -InFile "ontology/Airbnb.owl"
```

## Regenerar enriquecimiento multilingue

Si modificas datos visibles de la ontologia y quieres reconstruir las etiquetas traducidas:

```bash
node scripts/enrich-ontology.mjs
```

Despues de eso, vuelve a cargar `ontology/Airbnb.owl` en Fuseki.

## Correr la app

```bash
bun install
bun run dev
```

Abre una de estas rutas:

- `http://localhost:3000/es`
- `http://localhost:3000/en`
- `http://localhost:3000/fr`

## Como funciona

```text
Usuario escribe una consulta en es/en/fr
    ↓
El módulo de procesamiento lingüístico la convierte en filtros estructurados
    ↓
La API consulta Fuseki con SPARQL
    ↓
Fuseki devuelve resultados localizados segun el idioma activo
    ↓
La app aplica ranking y renderiza cards traducidas
```

## Integracion con DBpedia

La integracion no se hace consultando DBpedia en vivo en cada busqueda.

En cambio, la ontologia se enriquece localmente con:

- `owl:equivalentClass` para clases como `Apartamento`, `Casa` y `Villa`
- `owl:sameAs` para entidades como `Wifi`, `Piscina`, `La Paz`, `Cochabamba` o `Sucre`
- `rdfs:label` y `rdfs:comment` multilingues reutilizables por Fuseki

Esto hace la demo mas estable, mas rapida y mas defendible academicamente.

## Ejemplos de busqueda

### Espanol

- `departamento con piscina en santa cruz`
- `villa para familia en sucre`
- `wifi y cocina en cochabamba`

### Ingles

- `apartment with pool in santa cruz`
- `private room for students in sucre`
- `family house in cochabamba`

### Frances

- `appartement avec piscine a santa cruz`
- `chambre privee pour etudiants a sucre`
- `maison familiale a cochabamba`

## Troubleshooting

- `SPARQL failed...`: Fuseki no esta levantado o el dataset `airbnb` no tiene cargado `ontology/Airbnb.owl`
- la UI abre pero no hay resultados: revisa que el dataset se haya recargado despues del ultimo cambio en la ontologia
- cambios en labels o comments no aparecen: vuelve a ejecutar `node scripts/enrich-ontology.mjs` y sube otra vez el `OWL`
- el módulo de procesamiento lingüístico no responde: la búsqueda cae a modo fallback

## Estado actual del stack

- Frontend: Next.js 16 + React 19 + Tailwind v4
- Backend: Route handlers de Next.js
- Triplestore: Apache Jena Fuseki
- Ontologia: OWL/RDF
- Enriquecimiento: DBpedia + labels `es/en/fr`
- Procesamiento de consultas: módulo lingüístico orientado a filtros estructurados
- Imagenes: Unsplash
