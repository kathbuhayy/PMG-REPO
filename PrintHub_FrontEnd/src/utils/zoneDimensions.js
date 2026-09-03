// src/utils/zoneDimensions.js  (new file)
/**
 * Single source of truth for each zone's real pixel dimensions, as
 * measured against SudoMock's actual print-area photo (see the earlier
 * "Edit Areas" measurements: front 487x815, back 225x480). Every
 * surface that renders a zone - the interactive Fabric editor, the
 * flattened image sent to SudoMock/Printful, and (see note below) the
 * 3D GLB texture - should use these same numbers, so a layer's x/y/w/h
 * percentage means the same physical thing everywhere.
 */
export const ZONE_DIMENSIONS = {
  front: { width: 487, height: 815 },
  back: { width: 225, height: 480 },
  wrap: { width: 800, height: 340 },
};

export function getZoneDimensions(zoneId) {
  return ZONE_DIMENSIONS[zoneId] || { width: 500, height: 500 };
}