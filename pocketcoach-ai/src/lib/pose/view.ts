/**
 * Shared view model.
 *
 * The demo motion engine renders the athlete through a fixed 3/4 camera and the
 * landmark stream is what both the skeleton overlay and the measurement modules
 * read. Keeping the projection constants here means a measurement can correctly
 * un-project a landmark back into body-space when it needs the frontal plane
 * (e.g. "is the elbow flaring outside the shoulder line?").
 */

/** camera yaw in degrees — the 3/4 angle coaches film from */
export const VIEW_YAW_DEG = 40;
export const VIEW_SIN = Math.sin((VIEW_YAW_DEG * Math.PI) / 180);
export const VIEW_COS = Math.cos((VIEW_YAW_DEG * Math.PI) / 180);

/** normalised-units-per-metre of the projection */
export const VIEW_SCALE = 0.5;

/** world x of a landmark from its image x and depth */
export function toWorldX(imageX: number, z: number): number {
  return ((imageX - 0.5) / VIEW_SCALE - z * VIEW_SIN) / VIEW_COS;
}
