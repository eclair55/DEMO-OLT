import React, { useState, useEffect, useRef } from 'react';
import MapView from './components/MapView';
import OltNodeModal from './components/OltNodeModal';
import SidePanel from './components/SidePanel';
import ShortestPathPanel from './components/ShortestPathPanel';
import {
  Network,
  ChevronRight,
  RotateCcw,
  AlertTriangle,
  PanelRightClose,
  PanelRightOpen,
  Eye,
  EyeOff
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
  const [routes, setRoutes] = useState([]);
  const [routeStatuses, setRouteStatuses] = useState({});
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [routeVisibility, setRouteVisibility] = useState({});

  const [shortestPathMode, setShortestPathMode] = useState(false);
  const [shortestPathStart, setShortestPathStart] = useState(null);
  const [shortestPathEnd, setShortestPathEnd] = useState(null);
  const [maxSnapDistance, setMaxSnapDistance] = useState(100);
  const [isShortestPathLoading, setIsShortestPathLoading] = useState(false);
  const shortestPathSelectionRef = useRef({ start: null, end: null });

  const blankProposedOlt = {
    CO_ID: '',
    CO_NAME: '',
    CO_OWNER: '',
    SITE_ID: '',
    SITENAME: '',
    TOWER_TYPE: '',
    TECHNOLOGY: '',
    OLT_LOCATION_TYPE: '',
    OLT_NAME: '',
    Longitude: '',
    Latitude: ''
  };

  const [proposedOlt, setProposedOlt] = useState(blankProposedOlt);
  const [isSavingProposedOlt, setIsSavingProposedOlt] = useState(false);
  const [proposedOltPinMode, setProposedOltPinMode] = useState(false);
  const [proposedOltPin, setProposedOltPin] = useState(null);

  useEffect(() => {
    shortestPathSelectionRef.current = { start: shortestPathStart, end: shortestPathEnd };
  }, [shortestPathStart, shortestPathEnd]);

  // UI state
  const [loadingMsg, setLoadingMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSidePanelVisible, setIsSidePanelVisible] = useState(true);
  const [isLegendVisible, setIsLegendVisible] = useState(true);

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
    setRoutes([]);
    setRouteStatuses({});
    setRouteVisibility({});

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
    setRoutes([]);
    setRouteStatuses({});
    setRouteVisibility({});

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
    setRoutes([]);
    setRouteStatuses({});
    setRouteVisibility({});

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
    setRoutes([]);
    setRouteStatuses({});
    setRouteVisibility({});

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

  const handleProposedOltChange = (field, value) => {
    setProposedOlt((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleProposedOltPinSelect = ({ longitude, latitude }) => {
    setProposedOlt((current) => ({
      ...current,
      Longitude: Number(longitude).toFixed(6),
      Latitude: Number(latitude).toFixed(6)
    }));
    setProposedOltPin({ longitude, latitude });
    setProposedOltPinMode(false);
  };

  const handleClearProposedOltPin = () => {
    setProposedOltPin(null);
    setProposedOltPinMode(false);
    setProposedOlt((current) => ({
      ...current,
      Longitude: '',
      Latitude: ''
    }));
  };

  const handleSaveProposedOlt = async (event) => {
    event.preventDefault();

    const oltName = (proposedOlt.OLT_NAME || '').trim();
    if (!oltName) {
      setErrorMsg('OLT_NAME is required before saving the proposed OLT.');
      return;
    }

    const longitude = Number(proposedOlt.Longitude);
    const latitude = Number(proposedOlt.Latitude);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      setErrorMsg('Longitude and latitude are required to create the geometry point.');
      return;
    }

    setIsSavingProposedOlt(true);
    setLoadingMsg('Saving proposed OLT...');
    setErrorMsg(null);

    try {
      const payload = {
        CoId: proposedOlt.CO_ID || null,
        CoName: proposedOlt.CO_NAME || null,
        CoOwner: proposedOlt.CO_OWNER || null,
        SiteId: proposedOlt.SITE_ID || null,
        SiteName: proposedOlt.SITENAME || null,
        TowerType: proposedOlt.TOWER_TYPE || null,
        Technology: proposedOlt.TECHNOLOGY || null,
        OltLocationType: proposedOlt.OLT_LOCATION_TYPE || null,
        OltName: oltName,
        Longitude: longitude,
        Latitude: latitude
      };

      const res = await fetch('/api/proposed-olts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.message || 'Unable to save the proposed OLT.');
      }

      setProposedOlt(blankProposedOlt);
      setLoadingMsg('Proposed OLT saved successfully.');
    } catch (err) {
      setErrorMsg(err.message || 'Unable to save the proposed OLT.');
    } finally {
      setIsSavingProposedOlt(false);
      setLoadingMsg('');
    }
  };

  const clearShortestPathRoute = () => {
    setRoutes((current) => current.filter((route) => route.__shortestPath !== true));
  };

  const resetShortestPathSelection = () => {
    setShortestPathMode(false);
    setShortestPathStart(null);
    setShortestPathEnd(null);
    setIsShortestPathLoading(false);
    setLoadingMsg('');
    clearShortestPathRoute();
  };

  const handleStartShortestPath = () => {
    setShortestPathMode(true);
    setShortestPathStart(null);
    setShortestPathEnd(null);
    setErrorMsg(null);
    setLoadingMsg('');
  };

  const handleClearShortestPathStart = () => {
    setShortestPathStart(null);
  };

  const handleClearShortestPathEnd = () => {
    setShortestPathEnd(null);
  };

  const handleMapCoordinateSelect = ({ x, y }) => {
    if (proposedOltPinMode) {
      handleProposedOltPinSelect({ longitude: x, latitude: y });
      return;
    }

    if (!shortestPathMode) return;

    const nextPoint = { x, y };
    const currentSelection = shortestPathSelectionRef.current;

    if (!currentSelection.start) {
      setShortestPathStart(nextPoint);
      setShortestPathEnd(null);
      setLoadingMsg('');
      return;
    }

    if (!currentSelection.end) {
      setShortestPathEnd(nextPoint);
      setLoadingMsg('');
      return;
    }

    setShortestPathStart(nextPoint);
    setShortestPathEnd(null);
    setLoadingMsg('');
  };

  const handleCalculateShortestPath = async () => {
    if (!shortestPathStart || !shortestPathEnd) return;

    setIsShortestPathLoading(true);
    setLoadingMsg('Calculating shortest path...');
    setErrorMsg(null);

    try {
      const query = new URLSearchParams({
        startX: String(shortestPathStart.x),
        startY: String(shortestPathStart.y),
        endX: String(shortestPathEnd.x),
        endY: String(shortestPathEnd.y),
        maxSnapDistance: String(maxSnapDistance)
      });

      const res = await fetch(`/api/shortest-path?${query}`);
      if (!res.ok) throw new Error('Failed to calculate shortest path.');

      const data = await res.json();
      const routeWkt = data.RouteWkt ?? data.routeWkt;
      if (!routeWkt) throw new Error('The service returned no route geometry.');

      clearShortestPathRoute();
      setRoutes((current) => [
        ...current,
        {
          WKT: routeWkt,
          __shortestPath: true,
          routeNapId: 'shortest-path',
          Status: data.Status ?? 'OK'
        }
      ]);

      setShortestPathMode(false);
      setShortestPathStart(null);
      setShortestPathEnd(null);
      setLoadingMsg('Shortest path loaded.');
    } catch (err) {
      setErrorMsg(err.message || 'Unable to calculate the shortest path.');
    } finally {
      setIsShortestPathLoading(false);
      setLoadingMsg('');
    }
  };

  const getFacilityId = (record) => (
    record.ODNC_FACILITY_ID ?? record.odnc_facility_id ?? record.FACILITY_ID ?? record.facility_id
  );

  const getNapId = (nap) => (
    nap.ODNC_ODN_CONT_ID ?? nap.odnc_odn_cont_id ?? nap.NAP_ID ?? nap.nap_id
  );

  const handleLoadRoutes = async () => {
    const lcp = lcps.find((item) => (
      (item.ODNC_ODN_CONT_ID ?? item.odnc_odn_cont_id) === selectedLcpId
    ));
    const lcpFacilityId = lcp && getFacilityId(lcp);
    const napsWithFacilities = naps
      .map((nap) => ({ nap, napId: getNapId(nap), facilityId: getFacilityId(nap) }))
      .filter((item) => item.napId && item.facilityId && lcpFacilityId);

    if (!lcpFacilityId || napsWithFacilities.length === 0) return;

    setRoutes([]);
    setIsLoadingRoutes(true);
    setRouteStatuses(Object.fromEntries(napsWithFacilities.map(({ napId }) => [napId, 'loading'])));
    setRouteVisibility(Object.fromEntries(napsWithFacilities.map(({ napId }) => [napId, true])));

    await Promise.all(napsWithFacilities.map(async ({ napId, facilityId }) => {
      try {
        const query = new URLSearchParams({
          LCP_FACILITY_ID: String(lcpFacilityId),
          NAP_FACILITY_ID: String(facilityId)
        });
        const res = await fetch(`/api/route?${query}`);
        if (!res.ok) throw new Error('Failed to load cable route.');
        const data = await res.json();
        setRoutes((currentRoutes) => [
          ...currentRoutes,
          ...data.map((route) => ({ ...route, routeNapId: napId }))
        ]);
        setRouteStatuses((currentStatuses) => ({ ...currentStatuses, [napId]: 'loaded' }));
      } catch {
        setRouteStatuses((currentStatuses) => ({ ...currentStatuses, [napId]: 'error' }));
      }
    }));

    setIsLoadingRoutes(false);
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
    setRoutes([]);
    setRouteStatuses({});
    setRouteVisibility({});
    resetShortestPathSelection();
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
          Card #: {selectedSlot !== null ? selectedSlot : 'None'}
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
          routes={routes.filter((route) => route.routeNapId && routeVisibility[route.routeNapId] !== false)}
          srid={srid}
          selectedOltCode={selectedOltCode}
          selectedLcpId={selectedLcpId}
          selectedNapId={selectedNapId}
          shortestPathMode={shortestPathMode}
          shortestPathStart={shortestPathStart}
          shortestPathEnd={shortestPathEnd}
          proposedOltPinMode={proposedOltPinMode}
          proposedOltPin={proposedOltPin}
          onMapCoordinateSelect={handleMapCoordinateSelect}
          onOltClick={handleOltClick}
          onLcpClick={handleLcpClick}
          onNapClick={handleNapClick}
          onProposedOltPinSelect={handleProposedOltPinSelect}
        />

        {/* Legend */}
        <div className={`map-legend ${isLegendVisible ? '' : 'collapsed'}`}>
          <div className="legend-header">
            <div className="legend-title">Map Legend</div>
            <button
              className="legend-toggle"
              type="button"
              onClick={() => setIsLegendVisible((visible) => !visible)}
              aria-label={isLegendVisible ? 'Hide map legend' : 'Show map legend'}
              title={isLegendVisible ? 'Hide map legend' : 'Show map legend'}
            >
              {isLegendVisible ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {isLegendVisible && <div className="legend-items">
            <div className="legend-item">
              <span className="symbol-olt" />
              <span>OLT Location</span>
            </div>
            <div className="legend-item">
              <span className="symbol-lcp" />
              <span>LCP (Point)</span>
            </div>
            <div className="legend-item">
              <span className="symbol-nap symbol-nap-available" />
              <span>NAP utilization 0-49%</span>
            </div>
            <div className="legend-item">
              <span className="symbol-nap symbol-nap-warning" />
              <span>NAP utilization 50-99%</span>
            </div>
            <div className="legend-item">
              <span className="symbol-nap symbol-nap-full" />
              <span>NAP utilization 100%</span>
            </div>
          </div>}
        </div>

        <button
          className={`side-panel-toggle ${isSidePanelVisible ? '' : 'closed'}`}
          type="button"
          onClick={() => setIsSidePanelVisible((visible) => !visible)}
          aria-label={isSidePanelVisible ? 'Hide side panel' : 'Show side panel'}
          title={isSidePanelVisible ? 'Hide side panel' : 'Show side panel'}
        >
          {isSidePanelVisible ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}
        </button>

        <SidePanel
          isVisible={isSidePanelVisible}
          selectedOltCode={selectedOltCode}
          selectedOltNode={selectedOltNode}
          nodes={nodes}
          onSelectNode={handleSelectNode}
          parentSlots={decoratedSlots}
          lcps={lcps}
          naps={naps}
          routeStatuses={routeStatuses}
          isLoadingRoutes={isLoadingRoutes}
          selectedSlot={selectedSlot}
          selectedLcpId={selectedLcpId}
          selectedNapId={selectedNapId}
          onLcpSelect={handleLcpClick}
          onNapSelect={handleNapClick}
          onLoadRoutes={handleLoadRoutes}
          routeVisibility={routeVisibility}
          onToggleRoute={(napId) => setRouteVisibility((current) => ({
            ...current,
            [napId]: current[napId] === false
          }))}
          onZoomToLcp={(lcpId) => mapViewRef.current?.zoomToLcp(lcpId)}
          onZoomToNap={(napId) => mapViewRef.current?.zoomToNap(napId)}
        />

        <ShortestPathPanel
          shortestPathMode={shortestPathMode}
          shortestPathStart={shortestPathStart}
          shortestPathEnd={shortestPathEnd}
          maxSnapDistance={maxSnapDistance}
          isShortestPathLoading={isShortestPathLoading}
          onSetMaxSnapDistance={setMaxSnapDistance}
          onStartShortestPath={handleStartShortestPath}
          onResetShortestPath={resetShortestPathSelection}
          onCalculateShortestPath={handleCalculateShortestPath}
          onClearStart={handleClearShortestPathStart}
          onClearEnd={handleClearShortestPathEnd}
        />

        <form className="proposed-olt-panel" onSubmit={handleSaveProposedOlt}>
          <div className="proposed-olt-header">
            <span>Proposed OLT</span>
          </div>

          <div className="proposed-olt-pin-actions">
            <button
              type="button"
              className="proposed-olt-pin-toggle"
              onClick={() => setProposedOltPinMode((value) => !value)}
            >
              {proposedOltPinMode ? 'Cancel pin drop' : 'Pick location on map'}
            </button>
            {(proposedOltPin || proposedOlt.Longitude || proposedOlt.Latitude) && (
              <button type="button" className="proposed-olt-pin-clear" onClick={handleClearProposedOltPin}>
                Clear pin
              </button>
            )}
          </div>

          <div className="proposed-olt-grid">
            <label>
              <span>CO ID</span>
              <input value={proposedOlt.CO_ID} onChange={(e) => handleProposedOltChange('CO_ID', e.target.value)} />
            </label>
            <label>
              <span>CO Name</span>
              <input value={proposedOlt.CO_NAME} onChange={(e) => handleProposedOltChange('CO_NAME', e.target.value)} />
            </label>
            <label>
              <span>CO Owner</span>
              <input value={proposedOlt.CO_OWNER} onChange={(e) => handleProposedOltChange('CO_OWNER', e.target.value)} />
            </label>
            <label>
              <span>Site ID</span>
              <input value={proposedOlt.SITE_ID} onChange={(e) => handleProposedOltChange('SITE_ID', e.target.value)} />
            </label>
            <label>
              <span>Site Name</span>
              <input value={proposedOlt.SITENAME} onChange={(e) => handleProposedOltChange('SITENAME', e.target.value)} />
            </label>
            <label>
              <span>Tower Type</span>
              <input value={proposedOlt.TOWER_TYPE} onChange={(e) => handleProposedOltChange('TOWER_TYPE', e.target.value)} />
            </label>
            <label>
              <span>Technology</span>
              <input value={proposedOlt.TECHNOLOGY} onChange={(e) => handleProposedOltChange('TECHNOLOGY', e.target.value)} />
            </label>
            <label>
              <span>Location Type</span>
              <input value={proposedOlt.OLT_LOCATION_TYPE} onChange={(e) => handleProposedOltChange('OLT_LOCATION_TYPE', e.target.value)} />
            </label>
            <label className="required">
              <span>OLT Name</span>
              <input value={proposedOlt.OLT_NAME} required onChange={(e) => handleProposedOltChange('OLT_NAME', e.target.value)} />
            </label>
            <label className="required">
              <span>Longitude</span>
              <input
                type="number"
                step="0.000001"
                value={proposedOlt.Longitude}
                readOnly
                required
              />
            </label>
            <label className="required">
              <span>Latitude</span>
              <input
                type="number"
                step="0.000001"
                value={proposedOlt.Latitude}
                readOnly
                required
              />
            </label>
          </div>

          <button type="submit" className="proposed-olt-submit" disabled={isSavingProposedOlt}>
            {isSavingProposedOlt ? 'Saving...' : 'Save proposed OLT'}
          </button>
        </form>
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
