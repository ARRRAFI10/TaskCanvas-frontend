import type { NormalizedPoint, ShapeType } from "@/lib/types";

/**
 * Shoelace area of a polygon in normalized coordinates. Because x and y are
 * both fractions of the image dimensions, the result is the fraction of the
 * image the polygon covers (0..1); multiply by width*height for pixels².
 */
export function polygonAreaFraction(points: NormalizedPoint[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

function formatAreaFraction(fraction: number, width: number, height: number): string {
  const pixels = Math.round(fraction * width * height);
  return `${(fraction * 100).toFixed(1)}% · ${pixels.toLocaleString()} px²`;
}

/** Human-readable measurement for any shape type. */
export function shapeMetric(
  shape: { shape_type: ShapeType; points: NormalizedPoint[] },
  width: number,
  height: number,
): string {
  switch (shape.shape_type) {
    case "rectangle": {
      const [[x1, y1], [x2, y2]] = shape.points;
      return formatAreaFraction(Math.abs(x2 - x1) * Math.abs(y2 - y1), width, height);
    }
    case "polyline": {
      let length = 0;
      for (let i = 1; i < shape.points.length; i++) {
        const [ax, ay] = shape.points[i - 1];
        const [bx, by] = shape.points[i];
        length += Math.hypot((bx - ax) * width, (by - ay) * height);
      }
      return `${Math.round(length).toLocaleString()} px long`;
    }
    case "point": {
      const [[x, y]] = shape.points;
      return `(${Math.round(x * width)}, ${Math.round(y * height)}) px`;
    }
    default:
      return formatAreaFraction(polygonAreaFraction(shape.points), width, height);
  }
}
