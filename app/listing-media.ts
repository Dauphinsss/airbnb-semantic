export type ListingMedia = {
  alt: string;
  src: string;
  width: number;
  height: number;
};

type PropertyLike = {
  ciudad?: string;
  nombre?: string;
  tipo?: string;
  uri?: string;
  zona?: string;
};

const PHOTO_WIDTH = 1200;
const PHOTO_HEIGHT = 800;

const LABEL_BY_TYPE = {
  apartamento: "Departamento",
  casa: "Casa",
  habitacion: "Habitacion",
  villa: "Villa",
} as const;

function normalizeType(tipo: string | undefined): keyof typeof LABEL_BY_TYPE {
  const value = (tipo ?? "").toLowerCase();
  if (value.includes("villa")) return "villa";
  if (value.includes("casa")) return "casa";
  if (value.includes("habitacion")) return "habitacion";
  return "apartamento";
}

function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function mediaForProperty(
  property: PropertyLike,
  position = 0,
): ListingMedia {
  const mediaType = normalizeType(property.tipo);
  const label = [property.tipo, property.zona, property.ciudad]
    .filter(Boolean)
    .join(" en ");
  const seed = hashString(`${property.uri ?? property.nombre ?? mediaType}-${position}`);
  const photoSeed = `airbnb-${mediaType}-${position}-${seed}`;

  return {
    src: `https://picsum.photos/seed/${photoSeed}/${PHOTO_WIDTH}/${PHOTO_HEIGHT}`,
    width: PHOTO_WIDTH,
    height: PHOTO_HEIGHT,
    alt: label ? `Foto referencial de ${label}` : `Foto referencial de ${LABEL_BY_TYPE[mediaType]}`,
  };
}
