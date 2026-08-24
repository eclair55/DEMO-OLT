import React from 'react';
import { Network, Cpu, Layers, HardDrive, Radio, LocateFixed, Eye } from 'lucide-react';

export default function SidePanel({
  selectedOltCode,
  selectedOltNode,
  parentSlots,
  lcps,
  naps,
  selectedSlot,
  selectedLcpId,
  selectedNapId,
  onLcpSelect,
  onZoomToLcp,
  onZoomToNap,
  onNapSelect
}) {
  return (
    <aside className="side-panel">
      {/* Selected OLT Section */}
      <div className="panel-section">
        <div className="panel-section-title">
          <Network size={16} color="#2563eb" />
          <span>Selected OLT</span>
        </div>
        {selectedOltCode ? (
          <div className="info-grid">
            <span className="info-label">OLT Code:</span>
            <span className="info-value">{selectedOltCode}</span>
          </div>
        ) : (
          <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Click an OLT marker on the map to begin network traversal.
          </p>
        )}
      </div>

      {/* Selected OLT Node Section */}
      {selectedOltNode && (
        <div className="panel-section">
          <div className="panel-section-title">
            <Cpu size={16} color="#d97706" />
            <span>OLT Node</span>
          </div>
          <div className="info-grid">
            <span className="info-label">Node ID:</span>
            <span className="info-value">{selectedOltNode}</span>
          </div>
        </div>
      )}

      {/* Parent Slots Section */}
      {parentSlots && parentSlots.length > 0 && (
        <div className="panel-section">
          <div className="panel-section-title">
            <Layers size={16} color="#0284c7" />
            <span>Available Parent Slots</span>
          </div>
          <div className="slots-list">
            {parentSlots.map((slot, idx) => {
              const slotNum = slot.SLOT_NUMBER ?? slot.slot_number ?? slot.COLUMN_VALUE ?? slot.column_value ?? (idx + 1);
              const slotName = slot.SLOT_NAME || `Slot ${slotNum}`;
              const isSelected = selectedSlot === slotNum;

              return (
                <React.Fragment key={idx}>
                  <div
                    className={`slot-card ${isSelected ? 'active' : ''}`}
                    onClick={() => slot.onSelect(slotNum)}
                  >
                    <span className="slot-title">{slotName}</span>
                    <span className="slot-badge">{isSelected ? 'Open' : 'Select'}</span>
                  </div>

                  {isSelected && (
                    <div className="tree-branch lcp-branch">
                      {lcps.length > 0 ? lcps.map((lcp, lcpIdx) => {
                        const lcpId = lcp.ODNC_ODN_CONT_ID ?? lcp.odnc_odn_cont_id ?? `LCP ${lcpIdx + 1}`;
                        const isLcpSelected = selectedLcpId === lcpId;

                        return (
                          <React.Fragment key={lcpId}>
                            <div className={`tree-item lcp-item ${isLcpSelected ? 'active' : ''}`}>
                              <button className="tree-select" onClick={() => onLcpSelect(lcpId)}>
                                <HardDrive size={14} />
                                <span>{lcpId}</span>
                              </button>
                              <button
                                className="icon-btn"
                                title={`Zoom to ${lcpId}`}
                                aria-label={`Zoom to ${lcpId}`}
                                onClick={() => onZoomToLcp(lcpId)}
                              >
                                <LocateFixed size={14} />
                              </button>
                            </div>

                            {isLcpSelected && (
                              <div className="tree-branch nap-branch">
                                {naps.length > 0 ? naps.map((nap, napIdx) => {
                                  const napId = nap.ODNC_ODN_CONT_ID ?? nap.odnc_odn_cont_id ?? nap.NAP_ID ?? nap.nap_id ?? `NAP ${napIdx + 1}`;
                                  const isNapSelected = selectedNapId === napId;
                                  return (
                                    <div className={`tree-item nap-item ${isNapSelected ? 'active' : ''}`} key={napId}>
                                      <button className="tree-select" onClick={() => onNapSelect(napId)}>
                                        <Radio size={13} />
                                        <span>{napId}</span>
                                      </button>
                                      <button
                                        className="icon-btn"
                                        title={`Zoom to ${napId}`}
                                        aria-label={`Zoom to ${napId}`}
                                        onClick={() => onZoomToNap(napId)}
                                      >
                                        <LocateFixed size={13} />
                                      </button>
                                    </div>
                                  );
                                }) : (
                                  <span className="tree-empty"><Eye size={13} /> No connected NAPs</span>
                                )}
                              </div>
                            )}
                          </React.Fragment>
                        );
                      }) : (
                        <span className="tree-empty">No LCPs found for this slot</span>
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

    </aside>
  );
}
