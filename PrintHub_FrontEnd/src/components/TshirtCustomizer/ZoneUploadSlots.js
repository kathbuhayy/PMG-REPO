import React from "react";
import { FaCloudUploadAlt, FaTrash } from "react-icons/fa";

export default function ZoneUploadSlots({
  zones,
  zoneMeta,
  zoneDesigns,
  activeZone,
  uploading,
  uploadError,
  onZoneSelect,
  onUploadClick,
  onClearZone,
}) {
  const getZoneLabel = (id) => {
    const meta = zoneMeta.find((m) => m.id === id);
    return meta ? meta.label : id.replace(/_/g, " ").toUpperCase();
  };

  return (
    <div className="tsc-sidebar-section">
      <h4>Design Print Areas</h4>
      <p className="tsc-upload-hint">Upload an image for each zone.</p>
      
      <div className="tsc-zone-slots">
        {zones.map((zoneId) => {
          const isActive = activeZone === zoneId;
          const hasDesign = Boolean(zoneDesigns[zoneId]?.imageUrl);
          
          return (
            <div
              key={zoneId}
              className={`tsc-zone-slot ${isActive ? "active" : ""} ${
                hasDesign ? "has-design" : ""
              }`}
              onClick={() => onZoneSelect(zoneId)}
            >
              <div className="tsc-zone-slot-header">
                <strong>{getZoneLabel(zoneId)}</strong>
                {hasDesign && (
                  <button
                    type="button"
                    className="tsc-zone-slot-clear"
                    title={`Clear ${getZoneLabel(zoneId)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearZone(zoneId);
                    }}
                  >
                    <FaTrash size={12} />
                  </button>
                )}
              </div>
              
              {!hasDesign ? (
                <button
                  type="button"
                  className="tsc-upload-btn small"
                  disabled={uploading}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUploadClick(zoneId);
                  }}
                >
                  {uploading && isActive ? (
                    <>
                      <span className="tsc-spinner" /> Uploading...
                    </>
                  ) : (
                    <>
                      <FaCloudUploadAlt /> Upload Image
                    </>
                  )}
                </button>
              ) : (
                <div
                  className="tsc-zone-slot-preview"
                  onClick={() => onZoneSelect(zoneId)}
                >
                  <img
                    src={zoneDesigns[zoneId].imageUrl}
                    alt={`${zoneId} design`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {uploadError && <p className="tsc-error">{uploadError}</p>}
    </div>
  );
}
