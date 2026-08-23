import React from 'react';
import { Network, Cpu, Layers, HardDrive, Radio } from 'lucide-react';

export default function SidePanel({
  selectedOltCode,
  selectedOltNode,
  parentSlots,
  selectedSlot,
  selectedLcpId,
  napsCount
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
              const slotNum = slot.SLOT_NUMBER ?? slot.slot_number ?? (idx + 1);
              const slotName = slot.SLOT_NAME || `Slot ${slotNum}`;
              const isSelected = selectedSlot === slotNum;

              return (
                <div
                  key={idx}
                  className={`slot-card ${isSelected ? 'active' : ''}`}
                  onClick={() => slot.onSelect(slotNum)}
                >
                  <span className="slot-title">{slotName}</span>
                  <span className="slot-badge">Select</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected LCP Section */}
      {selectedLcpId && (
        <div className="panel-section">
          <div className="panel-section-title">
            <HardDrive size={16} color="#059669" />
            <span>Selected LCP</span>
          </div>
          <div className="info-grid">
            <span className="info-label">LCP ID:</span>
            <span className="info-value">{selectedLcpId}</span>
          </div>
        </div>
      )}

      {/* Connected NAPs Section */}
      {napsCount > 0 && (
        <div className="panel-section">
          <div className="panel-section-title">
            <Radio size={16} color="#dc2626" />
            <span>Connected NAPs</span>
          </div>
          <div className="info-grid">
            <span className="info-label">Total NAPs:</span>
            <span className="info-value">{napsCount}</span>
          </div>
        </div>
      )}
    </aside>
  );
}
