/**
 * Valide qu'une closure ne dépasse pas la taille maximale autorisée
 */

const MAX_CLOSURE_AREA_M2 = 50000; // 50,000 m²

/**
 * Calcule l'aire d'un polygon en mètres carrés
 * Utilise la formule de Shoelace + projection approximative
 */
export function calculatePolygonArea(coordinates: number[][]): number {
  if (!coordinates || coordinates.length < 3) return 0;

  // Conversion approximative deg -> mètres (à la latitude moyenne)
  const avgLat =
    coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length;
  const metersPerDegreeLat = 111320; // Constant
  const metersPerDegreeLng = 111320 * Math.cos((avgLat * Math.PI) / 180);

  // Formule de Shoelace
  let area = 0;
  for (let i = 0; i < coordinates.length; i++) {
    const j = (i + 1) % coordinates.length;
    const xi = coordinates[i][0] * metersPerDegreeLng;
    const yi = coordinates[i][1] * metersPerDegreeLat;
    const xj = coordinates[j][0] * metersPerDegreeLng;
    const yj = coordinates[j][1] * metersPerDegreeLat;
    area += xi * yj - xj * yi;
  }

  return Math.abs(area / 2);
}

/**
 * Valide qu'un polygon GeoJSON ne dépasse pas la taille max
 */
export function validateClosureSize(polygon: GeoJSON.Polygon): {
  valid: boolean;
  area: number;
  maxArea: number;
  message?: string;
} {
  const coords = polygon.coordinates[0];
  const area = calculatePolygonArea(coords);

  if (area > MAX_CLOSURE_AREA_M2) {
    return {
      valid: false,
      area: Math.round(area),
      maxArea: MAX_CLOSURE_AREA_M2,
      message: `Zone trop grande (${formatArea(
        area
      )}). Maximum autorisé: ${formatArea(MAX_CLOSURE_AREA_M2)}.`,
    };
  }

  return {
    valid: true,
    area: Math.round(area),
    maxArea: MAX_CLOSURE_AREA_M2,
  };
}

/**
 * Formate une aire en m² ou km²
 */
export function formatArea(areaM2: number): string {
  if (areaM2 < 10000) {
    return `${Math.round(areaM2).toLocaleString()} m²`;
  }
  return `${(areaM2 / 1000000).toFixed(2)} km²`;
}
