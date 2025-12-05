import * as turf from "@turf/turf";

export function convertToPolygon(
  geometry: GeoJSON.Geometry,
  type: "barrier" | "segment" | "zone"
): GeoJSON.Polygon {
  switch (type) {
    case "barrier":
      // Point → Cercle de 30m
      if (geometry.type !== "Point") {
        throw new Error("Barrier doit être un Point");
      }
      const point = turf.point(geometry.coordinates as [number, number]);
      const circle = turf.circle(point, 0.03, { units: "kilometers" });
      return circle.geometry as GeoJSON.Polygon;

    case "segment":
      // LineString → Buffer de 15m
      if (geometry.type !== "LineString") {
        throw new Error("Segment doit être une LineString");
      }
      const line = turf.lineString(
        geometry.coordinates as Array<[number, number]>
      );
      const buffered = turf.buffer(line, 0.015, { units: "kilometers" });
      return buffered!.geometry as GeoJSON.Polygon;

    case "zone":
      // Polygon → Direct (vérifier qu'il est fermé)
      if (geometry.type !== "Polygon") {
        throw new Error("Zone doit être un Polygon");
      }
      // Vérifier que le polygon est fermé
      const coords = geometry.coordinates[0];
      const first = coords[0];
      const last = coords[coords.length - 1];

      if (first[0] !== last[0] || first[1] !== last[1]) {
        // Fermer le polygon
        return {
          type: "Polygon",
          coordinates: [[...coords, first]],
        };
      }

      return geometry as GeoJSON.Polygon;

    default:
      throw new Error(`Type inconnu: ${type}`);
  }
}
