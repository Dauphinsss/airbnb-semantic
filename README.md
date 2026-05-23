# Airbnb Semantic

Buscador semántico de propiedades con **Next.js 16** sobre una ontología RDF/OWL.

La búsqueda navega la ontología (jerarquía de clases, categorías de amenidad, tipo de viajero, propósito de viaje, ubicación), no solo strings.

---

## Requisitos

- Node 20+ o [Bun](https://bun.sh)
- Ontología disponible en [`ontology/Airbnb.owl`](ontology/Airbnb.owl)

---

## 1. Next.js

```bash
bun install
bun run dev
```

Abre `http://localhost:3000`. La API `GET /api/buscar` lee y parsea directamente `ontology/Airbnb.owl`.

---

## 2. Ejemplos de búsqueda

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

- **`{"propiedades":[]}`** → revisa que [`ontology/Airbnb.owl`](ontology/Airbnb.owl) exista y contenga instancias `owl:NamedIndividual`.
- **Cambiaste el `.owl` y no ves cambios** → guarda el archivo; la API invalida caché cuando cambia la fecha de modificación.
- **Hot-reload no toma cambios en la API** → reinicia `bun run dev`.
