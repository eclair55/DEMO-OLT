import React, { useState, useEffect, useRef } from 'react';
import MapView from './components/MapView';
import OltNodeModal from './components/OltNodeModal';
import SidePanel from './components/SidePanel';
import {
  Network,
  ChevronRight,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';

export default function App() {
  const mapViewRef = useRef(null);
  // Config state
  const [srid, setSrid] = useState('32651');

  // Network Selection States
  const [olts, setOlts] = useState([]);
  const [selectedOltCode, setSelectedOltCode] = useState(null);

  const [nodes, setNodes] = useState([]);
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [selectedOltNode, setSelectedOltNode] = useState(null);

  const [parentSlots, setParentSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [lcps, setLcps] = useState([]);
  const [selectedLcpId, setSelectedLcpId] = useState(null);

  const [naps, setNaps] = useState([]);
  const [selectedNapId, setSelectedNapId] = useState(null);

  // UI state
  const [loadingMsg, setLoadingMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  // Expose global test hook for reliable Playwright testing
  useEffect(() => {
    window.__TEST_SELECT_OLT__ = (oltCode) => handleOltClick(oltCode);
    window.__TEST_SELECT_LCP__ = (lcpId) => handleLcpClick(lcpId);
  }, [olts, lcps]);

  // 1. Load SRID Config & OLT Locations on application load
  useEffect(() => {
    fetchConfig();
    loadOlts();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        if (data.srid) setSrid(data.srid);
      }
    } catch (err) {
      console.warn('Could not load config, using default SRID 32651', err);
    }
  };

  const loadOlts = async () => {
    setLoadingMsg('Loading OLT locations...');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/olts');
      if (!res.ok) throw new Error('Failed to load OLT records.');
      const data = await res.json();
      setOlts(data);
    } catch (err) {
      setErrorMsg('Unable to load OLT locations. Please check database connection or try again.');
    } finally {
      setLoadingMsg('');
    }
  };

  // 2. Click OLT -> Load OLT Nodes -> Open Modal
  const handleOltClick = async (oltCode) => {
    setSelectedOltCode(oltCode);
    // Reset lower hierarchy
    setNodes([]);
    setSelectedOltNode(null);
    setParentSlots([]);
    setSelectedSlot(null);
    setLcps([]);
    setSelectedLcpId(null);
    setNaps([]);
    setSelectedNapId(null);

    setLoadingMsg(`Loading OLT Nodes for ${oltCode}...`);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/olts/${encodeURIComponent(oltCode)}/nodes`);
      if (!res.ok) throw new Error('Failed to load OLT Nodes.');
      const data = await res.json();
      setNodes(data);
      setIsNodeModalOpen(true);
    } catch (err) {
      setErrorMsg(`Unable to load OLT Nodes for ${oltCode}.`);
    } finally {
      setLoadingMsg('');
    }
  };

  // 3. Select OLT Node -> Load Parent Slots
  const handleSelectNode = async (oltNode) => {
    setSelectedOltNode(oltNode);
    setIsNodeModalOpen(false);

    // Reset lower hierarchy
    setParentSlots([]);
    setSelectedSlot(null);
    setLcps([]);
    setSelectedLcpId(null);
    setNaps([]);
    setSelectedNapId(null);

    setLoadingMsg(`Loading Parent Slots for ${oltNode}...`);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/olt-nodes/${encodeURIComponent(oltNode)}/parent-slots`);
      if (!res.ok) throw new Error('Failed to load Parent Slots.');
      const data = await res.json();
      setParentSlots(data);
    } catch (err) {
      setErrorMsg(`Unable to load Parent Slots for ${oltNode}.`);
    } finally {
      setLoadingMsg('');
    }
  };

  // 4. Select Parent Slot -> Load LCP on Map
  const handleSelectSlot = async (slotNumber) => {
    setSelectedSlot(slotNumber);
    setLcps([]);
    setSelectedLcpId(null);
    setNaps([]);
    setSelectedNapId(null);

    setLoadingMsg(`Loading LCPs for ${selectedOltNode} (Slot ${slotNumber})...`);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/olt-nodes/${encodeURIComponent(selectedOltNode)}/parent-slots/${slotNumber}/lcp`
      );
      if (!res.ok) throw new Error('Failed to load LCP.');
      const data = await res.json();
      setLcps(data);
    } catch (err) {
      setErrorMsg(`Unable to load LCP for ${selectedOltNode} slot ${slotNumber}.`);
    } finally {
      setLoadingMsg('');
    }
  };

  // 5. Click LCP -> Load Connected NAPs on Map
  const handleLcpClick = async (odnContId) => {
    setSelectedLcpId(odnContId);
    setNaps([]);
    setSelectedNapId(null);

    setLoadingMsg(`Loading connected NAPs for LCP ${odnContId}...`);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/lcp/${encodeURIComponent(odnContId)}/naps`);
      if (!res.ok) throw new Error('Failed to load NAPs.');
      const data = await res.json();
      setNaps(data);
    } catch (err) {
      setErrorMsg(`Unable to load NAPs for LCP ${odnContId}.`);
    } finally {
      setLoadingMsg('');
    }
  };

  const handleNapClick = (napId) => {
    setSelectedNapId(napId);
    mapViewRef.current?.zoomToNap(napId);
  };

  // Reset entire selection hierarchy
  const handleReset = () => {
    setSelectedOltCode(null);
    setNodes([]);
    setIsNodeModalOpen(false);
    setSelectedOltNode(null);
    setParentSlots([]);
    setSelectedSlot(null);
    setLcps([]);
    setSelectedLcpId(null);
    setNaps([]);
    setSelectedNapId(null);
    setErrorMsg(null);
  };

  // Map slots with click callback
  const decoratedSlots = parentSlots.map((slot) => ({
    ...slot,
    onSelect: handleSelectSlot
  }));

  return (
    <>
      {/* Header */}
      <header className="app-header">
        <div className="brand">
          <Network className="brand-icon" />
          <span className="brand-title">OLT Network Explorer</span>
          <span className="brand-subtitle">
            Select an OLT and progressively explore its connected OLT Nodes, Parent Slots, LCPs, and NAPs.
          </span>
        </div>
      </header>

      {/* Dynamic Breadcrumb Hierarchy Bar */}
      <div className="breadcrumb-bar">
        <span className="breadcrumb-label">Network Path:</span>
        <span className={`breadcrumb-item ${selectedOltCode ? 'active' : ''}`}>
          OLT: {selectedOltCode || 'None'}
        </span>
        <ChevronRight size={14} className="breadcrumb-separator" />
        <span className={`breadcrumb-item ${selectedOltNode ? 'active' : ''}`}>
          Node: {selectedOltNode || 'None'}
        </span>
        <ChevronRight size={14} className="breadcrumb-separator" />
        <span className={`breadcrumb-item ${selectedSlot ? 'active' : ''}`}>
          Slot: {selectedSlot !== null ? selectedSlot : 'None'}
        </span>
        <ChevronRight size={14} className="breadcrumb-separator" />
        <span className={`breadcrumb-item ${selectedLcpId ? 'active' : ''}`}>
          LCP: {selectedLcpId || 'None'}
        </span>

        {selectedOltCode && (
          <button className="reset-btn" onClick={handleReset}>
            <RotateCcw size={13} /> Reset View
          </button>
        )}
      </div>

      {/* Main Content */}
      <main className="main-content">
        {/* Loading Indicator */}
        {loadingMsg && (
          <div className="loading-banner">
            <div className="spinner" />
            <span>{loadingMsg}</span>
          </div>
        )}

        {/* Error Indicator */}
        {errorMsg && (
          <div className="error-banner">
            <AlertTriangle size={18} />
            <span>{errorMsg}</span>
            <button className="error-close" onClick={() => setErrorMsg(null)}>
              ✕
            </button>
          </div>
        )}

        {/* Map View */}
        <MapView
          ref={mapViewRef}
          olts={olts}
          lcps={lcps}
          naps={naps}
          srid={srid}
          selectedOltCode={selectedOltCode}
          selectedLcpId={selectedLcpId}
          selectedNapId={selectedNapId}
          onOltClick={handleOltClick}
          onLcpClick={handleLcpClick}
          onNapClick={handleNapClick}
        />

        {/* Legend */}
        <div className="map-legend">
          <div className="legend-title">Map Legend</div>
          <div className="legend-items">
            <div className="legend-item">
              <span className="symbol-olt" />
              <span>OLT Location</span>
            </div>
            <div className="legend-item">
              <span className="symbol-node" />
              <span>OLT Node</span>
            </div>
            <div className="legend-item">
              <span className="symbol-lcp" />
              <span>LCP (Container)</span>
            </div>
            <div className="legend-item">
              <span className="symbol-nap" />
              <span>NAP (Access Point)</span>
            </div>
          </div>
        </div>

        {/* Side Information Panel */}
        <SidePanel
          selectedOltCode={selectedOltCode}
          selectedOltNode={selectedOltNode}
          parentSlots={decoratedSlots}
          lcps={lcps}
          naps={naps}
          selectedSlot={selectedSlot}
          selectedLcpId={selectedLcpId}
          selectedNapId={selectedNapId}
          onLcpSelect={handleLcpClick}
          onNapSelect={handleNapClick}
          onZoomToLcp={(lcpId) => mapViewRef.current?.zoomToLcp(lcpId)}
          onZoomToNap={(napId) => mapViewRef.current?.zoomToNap(napId)}
        />
      </main>

      {/* OLT Node Modal */}
      {isNodeModalOpen && (
        <OltNodeModal
          oltCode={selectedOltCode}
          nodes={nodes}
          onSelectNode={handleSelectNode}
          onClose={() => setIsNodeModalOpen(false)}
        />
      )}
    </>
  );
}
