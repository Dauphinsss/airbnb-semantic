# Airbnb Semantic

Buscador semántico de propiedades con **Next.js 16** + **Apache Jena Fuseki** sobre una ontología RDF/OWL.

La búsqueda navega la ontología (jerarquía de clases, categorías de amenidad, tipo de viajero, propósito de viaje, ubicación), no solo strings.

---

## Requisitos

- Node 20+ o [Bun](https://bun.sh)
- Java 17+
- [Apache Jena Fuseki 6.1.0](https://dlcdn.apache.org/jena/binaries/apache-jena-fuseki-6.1.0.zip) — descarga y descomprime

---

## 1. Fuseki

Desde la carpeta de Fuseki descomprimido:

```bash
# Windows
fuseki-server.bat

# Linux / macOS
./fuseki-server
```

Abre `http://localhost:3030` y:

1. `Manage datasets` → `Add new dataset` → nombre `airbnb`, tipo `Persistent` → `Create`.
2. Entra al dataset → pestaña `add data` → sube [`ontology/bd.ttl`](ontology/bd.ttl) → `upload now`.

Endpoint resultante: `http://localhost:3030/airbnb/sparql` (ya hardcodeado en [`app/api/buscar/route.ts`](app/api/buscar/route.ts)).

---

## 2. Next.js

```bash
bun install
bun run dev
```

Abre `http://localhost:3000`.

---

## 3. Ejemplos de búsqueda

| Búsqueda       | Encuentra                                                              |
| -------------- | ---------------------------------------------------------------------- |
| `wifi`         | Propiedades con `:Wifi`                                                |
| `conectividad` | Mismas, vía `:categoriaAmenidad` (inferencia)                          |
| `familia`      | Perfiles con `:tipoViajero "Familia"`                                  |
| `vacacional`   | Propósito `:tipoPropositoViaje "Vacacional"`                           |
| `villa`        | Instancias de `:Villa` (`rdfs:subClassOf*`)                            |
| `la paz`       | Propiedades con `:ciudad "La Paz"`                                     |
| *(vacío)*      | Todo el catálogo                                                       |

---

## Troubleshooting

- **`{"propiedades":[]}`** → el TTL no se cargó. Vuelve a Fuseki → `add data`.
- **`ECONNREFUSED`** → Fuseki no está corriendo o el dataset no se llama `airbnb`.
- **Hot-reload no toma cambios en la API** → reinicia `bun run dev`.
