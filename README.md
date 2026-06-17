# Airbnb Semantic

Buscador semantico de alojamientos construido con **Next.js 16**, **Apache Jena Fuseki** y una ontologia **OWL/RDF** enriquecida con enlaces a **DBpedia**. Las consultas en lenguaje natural se interpretan con **DeepSeek** y se traducen a filtros estructurados que se ejecutan via SPARQL.

La app soporta tres idiomas, cada uno en su propia ruta:

- Espanol: `http://localhost:3000/es`
- Ingles: `http://localhost:3000/en`
- Frances: `http://localhost:3000/fr`

---

## Quickstart (de cero a corriendo)

> Necesitas tener instalados: **Node 20+** (o [Bun](https://bun.sh)), **Java 17+** y **Apache Jena Fuseki 6+**.

### 1. Clonar e instalar dependencias

```bash
git clone <url-del-repo>
cd airbnb-semantic
bun install      # o: npm install
```

### 2. Crear el archivo de variables de entorno

Crea un archivo `.env.local` en la raiz del proyecto con este contenido:

```env
# Clave de la API de DeepSeek (https://platform.deepseek.com/)
# Sin ella la app igual funciona, pero la busqueda cae a modo simple por texto.
DEEPSEEK_API_KEY=tu_clave_de_deepseek

# Endpoint SPARQL de Fuseki (este es el valor por defecto, puedes omitirlo)
FUSEKI_ENDPOINT=http://localhost:3030/airbnb/sparql
```

> `.env.local` esta en `.gitignore`, asi que tu clave nunca se sube al repo.

### 3. Levantar Fuseki y cargar la ontologia

Apache Jena Fuseki es un programa **aparte** (no viene dentro de este repo). Descargalo desde
[jena.apache.org/download](https://jena.apache.org/download/) y arrancalo:

```powershell
# Windows (desde la carpeta donde descargaste Fuseki)
.\fuseki-server.bat
```

```bash
# macOS / Linux
./fuseki-server
```

Fuseki abre su panel en `http://localhost:3030`. Ahi:

1. Crea un dataset llamado **`airbnb`** (tipo *persistent* o *in-memory*).
2. Carga el archivo `ontology/Airbnb.owl` en ese dataset.

Tambien puedes cargar la ontologia por linea de comandos (con Fuseki ya corriendo):

```powershell
# Windows PowerShell
Invoke-WebRequest -UseBasicParsing `
  -Uri "http://localhost:3030/airbnb/data?default" `
  -Method Put -ContentType "application/rdf+xml" `
  -InFile "ontology/Airbnb.owl"
```

```bash
# macOS / Linux
curl -X PUT -H "Content-Type: application/rdf+xml" \
  --data-binary @ontology/Airbnb.owl \
  "http://localhost:3030/airbnb/data?default"
```

El endpoint SPARQL debe quedar accesible en:

```text
http://localhost:3030/airbnb/sparql
```

### 4. Correr la app

```bash
bun run dev      # o: npm run dev
```

Abre cualquiera de las rutas por idioma:

- `http://localhost:3000/es`
- `http://localhost:3000/en`
- `http://localhost:3000/fr`

---

## Que incluye

- Ontologia principal en `ontology/Airbnb.owl`
- Labels y descripciones multilingues con `rdfs:label` y `rdfs:comment` (`es` / `en` / `fr`)
- Enlaces a DBpedia con `owl:sameAs` y `owl:equivalentClass`
- Consultas SPARQL sobre Fuseki con fallback por idioma
- Interpretacion de consultas en lenguaje natural con DeepSeek
- Modo de busqueda **online** que consulta DBpedia, Wikidata y LinkedGeoData en vivo
- Imagenes remotas desde Unsplash ya embebidas en la ontologia

## Requisitos

- [Bun](https://bun.sh) o Node 20+
- Java 17+
- Apache Jena Fuseki 6+
- (Opcional pero recomendado) Una clave de DeepSeek en `DEEPSEEK_API_KEY`

## Variables de entorno

| Variable           | Obligatoria | Descripcion                                                                 |
| ------------------ | :---------: | --------------------------------------------------------------------------- |
| `DEEPSEEK_API_KEY` |     No*     | Clave de la API de DeepSeek. Sin ella la busqueda cae a modo simple por texto. |
| `FUSEKI_ENDPOINT`  |     No      | Endpoint SPARQL de Fuseki. Por defecto `http://localhost:3030/airbnb/sparql`. |

\* No es obligatoria para que arranque la app, pero sin ella se pierde la interpretacion semantica de las consultas.

## Estructura clave

- `ontology/Airbnb.owl`: ontologia fuente
- `scripts/enrich-ontology.mjs`: regenera labels y comments `es` / `en` / `fr`
- `app/api/buscar/ontology.ts`: consultas SPARQL y carga del catalogo desde Fuseki
- `app/api/buscar/ai.ts`: interpretacion de la consulta con DeepSeek
- `app/api/buscar/online.ts`: busqueda online contra DBpedia / Wikidata / LinkedGeoData
- `app/api/buscar/route.ts`: handler de la API que orquesta todo
- `app/[lang]/home-client.tsx`: UI localizada
- `lib/i18n.ts`: diccionarios y locales soportados

## Regenerar enriquecimiento multilingue

Si modificas datos visibles de la ontologia y quieres reconstruir las etiquetas traducidas:

```bash
node scripts/enrich-ontology.mjs
```

Despues de eso, **vuelve a cargar** `ontology/Airbnb.owl` en Fuseki (paso 3 del Quickstart).

## Como funciona

```text
Usuario escribe una consulta en es/en/fr
    ↓
DeepSeek la convierte en filtros estructurados (ciudad, tipo, amenidades, precio, etc.)
    ↓
La API consulta Fuseki con SPARQL usando esos filtros
    ↓
Fuseki devuelve resultados localizados segun el idioma activo
    ↓
La app aplica ranking y renderiza cards traducidas
```

Si no hay clave de DeepSeek o la llamada falla, la API hace un **fallback** a busqueda
simple por texto contra la ontologia, asi que la app nunca se queda sin responder.

## Integracion con DBpedia

Por defecto la integracion **no** consulta DBpedia en vivo en cada busqueda. En cambio, la
ontologia se enriquece localmente con:

- `owl:equivalentClass` para clases como `Apartamento`, `Casa` y `Villa`
- `owl:sameAs` para entidades como `Wifi`, `Piscina`, `La Paz`, `Cochabamba` o `Sucre`
- `rdfs:label` y `rdfs:comment` multilingues reutilizables por Fuseki

Esto hace la demo mas estable, mas rapida y mas defendible academicamente.

> El modo **online** (`online.ts`) si consulta DBpedia, Wikidata y LinkedGeoData en vivo,
> pensado para demostrar la federacion de fuentes externas.

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

- **`SPARQL failed...`**: Fuseki no esta levantado, o el dataset `airbnb` no tiene cargado `ontology/Airbnb.owl`. Verifica que `http://localhost:3030/airbnb/sparql` responda.
- **La UI abre pero no hay resultados**: revisa que el dataset se haya recargado despues del ultimo cambio en la ontologia.
- **Cambios en labels o comments no aparecen**: vuelve a ejecutar `node scripts/enrich-ontology.mjs` y sube otra vez el `.owl` a Fuseki.
- **La busqueda no entiende el lenguaje natural**: probablemente falta `DEEPSEEK_API_KEY` o la llamada fallo; la app cae a modo fallback (texto simple).
- **Error de conexion a Fuseki**: confirma que Java este instalado (`java -version`) y que el dataset se llame exactamente `airbnb`.

## Estado actual del stack

- **Frontend**: Next.js 16 + React 19 + Tailwind v4
- **Backend**: Route handlers de Next.js
- **Triplestore**: Apache Jena Fuseki
- **Ontologia**: OWL/RDF
- **Enriquecimiento**: DBpedia + labels `es` / `en` / `fr`
- **Procesamiento de consultas**: DeepSeek orientado a filtros estructurados
- **Fuentes online**: DBpedia, Wikidata, LinkedGeoData
- **Imagenes**: Unsplash
