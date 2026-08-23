import React from 'react';
import { X } from 'lucide-react';

export default function OltNodeModal({ oltCode, nodes, onSelectNode, onClose }) {
  if (!nodes || nodes.length === 0) return null;

  // Extract keys dynamically from first item
  const sample = nodes[0];
  const columns = Object.keys(sample);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">OLT: {oltCode} - Connected OLT Nodes</div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: '0.85rem', fontSize: '0.875rem', color: '#64748b' }}>
            Select an OLT Node to explore its connected Parent Slots:
          </p>
          <table className="modal-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col}>{col.replace('_', ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nodes.map((node, idx) => {
                // Find node identifier dynamically
                const nodeVal = node.OLT_NODE || node.olt_node || Object.values(node)[0];
                return (
                  <tr key={idx} onClick={() => onSelectNode(nodeVal, node)}>
                    {columns.map((col) => (
                      <td key={col}>{node[col]?.toString() ?? '-'}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
