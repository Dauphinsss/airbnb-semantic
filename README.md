# Airbnb Semantic

Buscador semántico de propiedades con **Next.js 16**, **Apache Jena Fuseki** (triplestore SPARQL) y **DeepSeek** (LLM que interpreta el lenguaje natural).

La búsqueda navega una ontología RDF/OWL (jerarquía de clases, amenidades, perfiles de viajero, zonas geográficas), no solo strings.

---

## Requisitos

- [Bun](https://bun.sh) o Node 20+
- **Java 17+** (para correr Fuseki)
- **Apache Jena Fuseki** corriendo en `localhost:3030` con un dataset llamado `airbnb` cargado desde [`ontology/Airbnb.owl`](ontology/Airbnb.owl)
- API key de [DeepSeek](https://platform.deepseek.com/) (opcional — sin ella el buscador hace fallback a texto plano)

---

## Setup

### 1. Levantar Fuseki

Descargar `apache-jena-fuseki` desde [jena.apache.org](https://jena.apache.org/download/), extraer y correr:

```bash
fuseki-server
```

En `http://localhost:3030` crear un dataset llamado `airbnb` y cargar `ontology/Airbnb.owl`.

### 2. Variables de entorno

Crear `.env.local`:

```env
DEEPSEEK_API_KEY=tu_api_key_aqui
FUSEKI_ENDPOINT=http://localhost:3030/airbnb/sparql
```

### 3. Correr la app

```bash
bun install
bun run dev
```

Abre `http://localhost:3000`.

---

## Cómo funciona

```text
Usuario escribe "casa de lujo en santa cruz"
    ↓
DeepSeek extrae filtros estructurados (precio, ciudad, tipo, amenidades)
    ↓
ontology.ts construye una query SPARQL dinámica con FILTER
    ↓
Fuseki devuelve URIs filtradas
    ↓
JS rankea por score (tipo +4, amenidad +3, perfil +2…)
    ↓
Resultados ordenados al frontend
```

La API `GET /api/buscar?q=...`:

1. Llama a **DeepSeek** para parsear la consulta en filtros estructurados (ver [`app/api/buscar/ai.ts`](app/api/buscar/ai.ts)).
2. Ejecuta **SPARQL** contra Fuseki para filtrar precio/capacidad/ciudad (ver [`app/api/buscar/ontology.ts`](app/api/buscar/ontology.ts)).
3. Carga el catálogo completo con 3 queries SPARQL fijas (propiedades + amenidades + perfiles).
4. Cruza las URIs filtradas con el catálogo y aplica scoring en JS.

---

## Ejemplos de búsqueda

| Búsqueda                                      | Qué hace                                                  |
| --------------------------------------------- | --------------------------------------------------------- |
| `casa de lujo en santa cruz`                  | precio≥800, ciudad SCZ                                    |
| `departamento barato para 2 personas`         | precio≤350, capacidad≥2, tipo Apartamento                 |
| `hostel para mochilero`                       | precio≤150, tipo HabitacionCompartida                     |
| `villa con piscina en Cochabamba`             | ciudad CBBA + tipo Villa + amenidad Piscina               |
| `estudiante en sucre`                         | ciudad Sucre + perfil GrupoEstudiantil                    |
| `wifi piscina`                                | scoring por amenidades (sin filtros duros)                |
| *(vacío)*                                     | catálogo completo (62 propiedades)                        |

---

## Troubleshooting

- **`{"error":"SPARQL failed..."}`** → Fuseki no está corriendo o el dataset `airbnb` no está cargado. Verifica con `curl http://localhost:3030/$/ping`.
- **DeepSeek no responde** → la app cae en búsqueda de texto plano (`searchOntology`). Revisa `DEEPSEEK_API_KEY` en `.env.local`.
- **Modificaste la ontología y no ves cambios** → recarga el dataset en Fuseki. La app NO tiene caché, así que los cambios aparecen al instante después.
- **Hot-reload no toma cambios en la API** → reinicia `bun run dev`.

---

## Stack

- **Frontend**: Next.js 16 (App Router) + React 19 + Tailwind v4
- **Backend**: Route handlers de Next.js, sin DB propia
- **Triplestore**: Apache Jena Fuseki (SPARQL 1.1)
- **LLM**: DeepSeek Chat (interpretación de query → filtros JSON)
- **Imágenes**: Unsplash (vía `next/image`, ver `next.config.ts`)
- **Ontología**: OWL/RDF en `ontology/Airbnb.owl`
