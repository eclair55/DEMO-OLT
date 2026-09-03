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
  EyeOff,
  Layers3,
  Trash2,
  ChevronDown
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
  const [activeFeatureModule, setActiveFeatureModule] = useState(null);
  const [geoserverLayers, setGeoserverLayers] = useState([]);
  const [activeGeoServerLayers, setActiveGeoServerLayers] = useState([]);
  const [isGeoServerPanelOpen, setIsGeoServerPanelOpen] = useState(false);
  const [isMapToolboxOpen, setIsMapToolboxOpen] = useState(true);
  const [isRedlineDrawing, setIsRedlineDrawing] = useState(false);
  const [redlineVisible, setRedlineVisible] = useState(false);
  const [redlinePolygons, setRedlinePolygons] = useState([]);
  const [redlineContextMenu, setRedlineContextMenu] = useState(null);
  const [redlineFacilityTypes, setRedlineFacilityTypes] = useState(['LCP', 'NAP']);
  const [redlineSelectionResults, setRedlineSelectionResults] = useState([]);
  const [streetNameCategories, setStreetNameCategories] = useState([]);
  const [excludedStreetNameCategories, setExcludedStreetNameCategories] = useState([]);
  const [isStreetCategoryMenuOpen, setIsStreetCategoryMenuOpen] = useState(false);
  const [nearestFacilityResult, setNearestFacilityResult] = useState(null);
  const [restrictToProvince, setRestrictToProvince] = useState(false);
  const [isNearestFacilityLoading, setIsNearestFacilityLoading] = useState(false);

  const [shortestPathMode, setShortestPathMode] = useState(false);
  const [shortestPathStart, setShortestPathStart] = useState(null);
  const [shortestPathEnd, setShortestPathEnd] = useState(null);
  const [maxSnapDistance, setMaxSnapDistance] = useState(100);
  const [isShortestPathLoading, setIsShortestPathLoading] = useState(false);
  const shortestPathSelectionRef = useRef({ start: null, end: null });
  const streetCategoryMenuRef = useRef(null);

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

  // UI state
  const [loadingMsg, setLoadingMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSidePanelVisible, setIsSidePanelVisible] = useState(true);
  const [isLegendVisible, setIsLegendVisible] = useState(true);

  useEffect(() => {
    shortestPathSelectionRef.current = { start: shortestPathStart, end: shortestPathEnd };
  }, [shortestPathStart, shortestPathEnd]);

  useEffect(() => {
    if (!successMsg) return undefined;

    const timer = window.setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [successMsg]);

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (!streetCategoryMenuRef.current?.contains(event.target)) {
        setIsStreetCategoryMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  useEffect(() => {
    const loadGeoServerLayers = async () => {
      try {
        const res = await fetch('/geoserver/rest/workspaces/PPGIS/layers.json');
        if (!res.ok) throw new Error('Failed to load GeoServer layers.');

        const data = await res.json();
        const layerList = Array.isArray(data?.layers?.layer)
          ? data.layers.layer
          : Array.isArray(data?.layers)
            ? data.layers
            : [];

        const normalizedLayers = layerList
          .map((layer) => {
            const name = layer?.name ?? layer?.layer ?? '';
            const title = layer?.title ?? layer?.name ?? name;
            return name ? { name, title } : null;
          })
          .filter(Boolean);

        setGeoserverLayers(normalizedLayers);
      } catch (error) {
        console.warn('Could not fetch GeoServer layers.', error);
      }
    };

    loadGeoServerLayers();
  }, []);

  useEffect(() => {
    const loadStreetNameCategories = async () => {
      try {
        const response = await fetch('/api/street-name-categories');
        if (!response.ok) throw new Error('Failed to load street name categories.');
        const data = await response.json();
        setStreetNameCategories(Array.isArray(data) ? data : []);
      } catch (error) {
        console.warn('Could not load street name categories.', error);
      }
    };

    loadStreetNameCategories();
  }, []);

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
    setActiveFeatureModule(null);
    setIsSidePanelVisible(true);
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
    const normalizedLongitude = Number(longitude);
    const normalizedLatitude = Number(latitude);

    if (!Number.isFinite(normalizedLongitude) || !Number.isFinite(normalizedLatitude)) {
      return;
    }

    setProposedOlt((current) => ({
      ...current,
      Longitude: normalizedLongitude.toFixed(6),
      Latitude: normalizedLatitude.toFixed(6)
    }));
    setProposedOltPin({
      longitude: normalizedLongitude,
      latitude: normalizedLatitude
    });
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
    setSuccessMsg(null);
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
      setProposedOltPin(null);
      setProposedOltPinMode(false);
      setOlts([]);
      await loadOlts();
      setSuccessMsg('Proposed OLT saved successfully.');
      setLoadingMsg('');
    } catch (err) {
      setErrorMsg(err.message || 'Unable to save the proposed OLT.');
    } finally {
      setIsSavingProposedOlt(false);
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
    setActiveFeatureModule(null);
    setIsSidePanelVisible(true);
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

  const handleFeatureModuleToggle = (moduleName) => {
    const nextModule = activeFeatureModule === moduleName ? null : moduleName;
    setActiveFeatureModule(nextModule);
    setIsSidePanelVisible(!nextModule);
  };

  const handleGeoServerLayerToggle = (layerName) => {
    setActiveGeoServerLayers((current) => (
      current.includes(layerName)
        ? current.filter((layer) => layer !== layerName)
        : [...current, layerName]
    ));
    if (!isGeoServerPanelOpen) {
      setIsGeoServerPanelOpen(true);
    }
  };

  const handleRedlineDrawComplete = (polygon) => {
    if (!polygon) return;
    setRedlinePolygons((current) => [...current, polygon]);
    setIsRedlineDrawing(false);
  };

  const toggleRedlineFacilityType = (facilityType) => {
    setRedlineFacilityTypes((current) => (current.includes(facilityType)
      ? current.filter((type) => type !== facilityType)
      : [...current, facilityType]));
  };

  const handleRedlineContextMenu = ({ x, y, geometryWkt }) => {
    setRedlineContextMenu({ x, y, geometryWkt });
  };

  const toggleStreetNameCategory = (value) => {
    setExcludedStreetNameCategories((current) => (
      current.includes(value)
        ? current.filter((category) => category !== value)
        : [...current, value]
    ));
  };

  const handleRedlineSelectionSubmit = async () => {
    if (!redlineContextMenu?.geometryWkt) return;
    if (redlineFacilityTypes.length === 0) {
      setErrorMsg('Select at least one facility type to process.');
      return;
    }

    setLoadingMsg('Selecting ODN records...');
    setErrorMsg(null);

    try {
      const response = await fetch('/api/redline/select-odn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redlineWkt: redlineContextMenu.geometryWkt,
          facilityTypes: redlineFacilityTypes
        })
      });

      if (!response.ok) {
        const message = await response.json().catch(() => ({}));
        throw new Error(message.message || 'Unable to select ODNs within the redline.');
      }

      const data = await response.json();
      const records = Array.isArray(data?.records) ? data.records : [];
      setRedlineSelectionResults(records);
      setSuccessMsg(records.length > 0
        ? `Selected ${records.length} ODN record(s) within the redline.`
        : 'No ODN records matched the selected facility types inside the redline.');

      setActiveFeatureModule(null);
      setIsSidePanelVisible(false);
      setIsGeoServerPanelOpen(false);
      setIsMapToolboxOpen(false);
      setIsRedlineDrawing(false);
      setRedlineContextMenu(null);
    } catch (err) {
      setErrorMsg(err.message || 'Unable to select ODN records within the redline.');
    } finally {
      setLoadingMsg('');
    }
  };

  const handleNearestSelectedFacility = async () => {
    if (redlineSelectionResults.length === 0) return;

    const sourceTableName = redlineSelectionResults[0].TABLE_NAME
      ?? redlineSelectionResults[0].table_name
      ?? '';
    const sourceFacilityIds = redlineSelectionResults
      .map((record) => record.FEATID ?? record.featid)
      .filter((facilityId) => facilityId !== null && facilityId !== undefined && facilityId !== '')
      .map(String);

    if (!sourceTableName || sourceFacilityIds.length === 0) {
      setErrorMsg('The selected ODN records do not contain TABLE_NAME and FEATID values.');
      return;
    }

    setIsNearestFacilityLoading(true);
    setLoadingMsg('Finding nearest homing OLT...');
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response = await fetch('/api/nearest-selected-facility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          SourceLayerId: 243,
          SourceTableName: sourceTableName,
          SourceFacilityIds: sourceFacilityIds,
          DestinationLayerId: 1538,
          DestinationTableName: 'OLT_GEOM',
          RestrictToProvince: restrictToProvince,
          ExcludedStreetNameCategories: excludedStreetNameCategories,
          MaxSourceSnapDistance: 100,
          MaxDestinationSnapDistance: 100
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Unable to find the nearest homing OLT.');
      }

      const results = Array.isArray(data.Results) ? data.Results : (Array.isArray(data.results) ? data.results : []);
      setNearestFacilityResult({ ...data, Results: results });
      setRoutes((current) => [
        ...current.filter((route) => route.__nearestSelectedFacility !== true),
        ...results
          .filter((item) => item.RouteWkt || item.routeWkt)
          .map((item, index) => ({
            WKT: item.RouteWkt ?? item.routeWkt,
            routeNapId: `nearest-selected-facility-${index}`,
            __nearestSelectedFacility: true,
            Status: item.Status ?? item.status ?? 'OK'
          }))
      ]);
      setSuccessMsg(data.Message || `Nearest homing OLT lookup completed for ${results.length} source record(s).`);
    } catch (err) {
      setErrorMsg(err.message || 'Unable to find the nearest homing OLT.');
    } finally {
      setIsNearestFacilityLoading(false);
      setLoadingMsg('');
    }
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

        {/* Success Indicator */}
        {successMsg && (
          <div className="success-banner">
            <span>{successMsg}</span>
            <button className="error-close" onClick={() => setSuccessMsg(null)}>
              ✕
            </button>
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
          activeGeoServerLayers={activeGeoServerLayers}
          redlineVisible={redlineVisible}
          redlinePolygons={redlinePolygons}
          isRedlineDrawing={isRedlineDrawing}
          onRedlineDrawComplete={handleRedlineDrawComplete}
          onRedlineContextMenu={handleRedlineContextMenu}
          onMapCoordinateSelect={handleMapCoordinateSelect}
          onOltClick={handleOltClick}
          onLcpClick={handleLcpClick}
          onNapClick={handleNapClick}
          onProposedOltPinSelect={handleProposedOltPinSelect}
        />

        {redlineContextMenu && (
          <div
            className="redline-context-menu"
            style={{ left: `${redlineContextMenu.x + 18}px`, top: `${redlineContextMenu.y + 18}px` }}
          >
            <div className="redline-context-header">Select facility type</div>
            <div className="redline-context-options">
              {['LCP', 'NAP', 'HYBRID', 'MDU'].map((facilityType) => (
                <label key={facilityType} className="redline-context-option">
                  <input
                    type="checkbox"
                    checked={redlineFacilityTypes.includes(facilityType)}
                    onChange={() => toggleRedlineFacilityType(facilityType)}
                  />
                  <span>{facilityType}</span>
                </label>
              ))}
            </div>
            <div className="redline-context-actions">
              <button type="button" className="redline-context-submit" onClick={handleRedlineSelectionSubmit}>
                Process selected ODN
              </button>
              <button type="button" className="redline-context-close" onClick={() => setRedlineContextMenu(null)}>
                Close
              </button>
            </div>
          </div>
        )}

        {redlineSelectionResults.length > 0 && (
          <div className="redline-results-panel">
            <div className="redline-results-header-wrap">
              <div className="redline-results-header">Selected ODNs</div>
              <button
                type="button"
                className="redline-results-close"
                aria-label="Close selected ODN panel"
                onClick={() => setRedlineSelectionResults([])}
              >
                ✕
              </button>
            </div>
            <ul className="redline-results-list">
              {redlineSelectionResults.map((record, index) => (
                <li key={`${record.ODNC_FACILITY_ID ?? 'facility'}-${record.ODNC_ODN_CONT_ID ?? index}`}>
                  <span>{record.ODNC_CONT_TYPE || 'Unknown'}</span>
                  <span>{record.ODNC_ODN_CONT_ID || record.ODNC_FACILITY_ID || 'N/A'}</span>
                </li>
              ))}
            </ul>

            <div className="redline-results-actions">
              <label className="redline-boundary-option">
                <input
                  type="checkbox"
                  checked={restrictToProvince}
                  onChange={(event) => setRestrictToProvince(event.target.checked)}
                />
                <span>The analysis shall be conducted within the province boundary</span>
              </label>
              <div className="redline-category-dropdown" ref={streetCategoryMenuRef}>
                <button
                  type="button"
                  className="redline-category-trigger"
                  onClick={() => setIsStreetCategoryMenuOpen((open) => !open)}
                  disabled={streetNameCategories.length === 0}
                  aria-expanded={isStreetCategoryMenuOpen}
                  aria-haspopup="listbox"
                >
                  <span>
                    {excludedStreetNameCategories.length > 0
                      ? `${excludedStreetNameCategories.length} street categor${excludedStreetNameCategories.length === 1 ? 'y' : 'ies'} excluded`
                      : 'Avoid street categories'}
                  </span>
                  <ChevronDown size={14} />
                </button>
                {isStreetCategoryMenuOpen && streetNameCategories.length > 0 && (
                  <div className="redline-category-menu" role="listbox" aria-label="Street categories to exclude">
                    {streetNameCategories.map((category, index) => {
                      const value = Number(category.FIELD_VALUES ?? category.field_values);
                      const label = category.FALIAS ?? category.falias ?? value;
                      return (
                        <label key={`${value}-${index}`} className="redline-category-option">
                          <input
                            type="checkbox"
                            checked={excludedStreetNameCategories.includes(value)}
                            onChange={() => toggleStreetNameCategory(value)}
                          />
                          <span>{label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="redline-nearest-olt-button"
                onClick={handleNearestSelectedFacility}
                disabled={isNearestFacilityLoading}
              >
                {isNearestFacilityLoading ? 'Finding nearest OLT...' : 'Nearest Homing OLT'}
              </button>
            </div>
          </div>
        )}

        {nearestFacilityResult && (
          <div className="redline-nearest-results-panel">
            <div className="redline-results-header">Nearest Homing OLT Results</div>
            <div className="redline-nearest-summary">
              <span>{nearestFacilityResult.SuccessfulSourceCount ?? nearestFacilityResult.successfulSourceCount ?? 0} successful</span>
              <span>{nearestFacilityResult.FailedSourceCount ?? nearestFacilityResult.failedSourceCount ?? 0} failed</span>
            </div>
            <ul className="redline-results-list">
              {nearestFacilityResult.Results.map((item, index) => (
                <li key={`${item.SourceFacilityId ?? item.sourceFacilityId ?? index}-${item.DestinationFacilityId ?? item.destinationFacilityId ?? 'none'}`}>
                  <span>{item.SourceFacilityId ?? item.sourceFacilityId ?? 'Source'}</span>
                  <span>{item.DestinationFacilityId ?? item.destinationFacilityId ?? item.Message ?? item.message ?? item.Status ?? item.status ?? 'N/A'}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Legend */}
        <div className={`map-legend ${isLegendVisible ? '' : 'collapsed'}`} hidden>
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

        <button
          type="button"
          className="geoserver-toggle-button"
          onClick={() => setIsGeoServerPanelOpen((open) => !open)}
          aria-label={isGeoServerPanelOpen ? 'Hide GeoServer layers' : 'Show GeoServer layers'}
          title={isGeoServerPanelOpen ? 'Hide GeoServer layers' : 'Show GeoServer layers'}
        >
          <Layers3 size={16} />
          <span>GeoServer</span>
        </button>

        <aside className={`geoserver-layer-panel ${isGeoServerPanelOpen ? 'open' : ''}`}>
          <div className="geoserver-layer-header">
            <strong>GeoServer Layers</strong>
            <button type="button" className="geoserver-close-button" onClick={() => setIsGeoServerPanelOpen(false)}>
              ✕
            </button>
          </div>

          {geoserverLayers.length === 0 ? (
            <div className="geoserver-empty-state">Loading layers...</div>
          ) : (
            <ul className="geoserver-layer-list">
              {geoserverLayers.map((layer) => {
                const isActive = activeGeoServerLayers.includes(layer.name);
                return (
                  <li key={layer.name} className="geoserver-layer-item">
                    <span className="geoserver-layer-name">{layer.title}</span>
                    <button
                      type="button"
                      className={`geoserver-toggle ${isActive ? 'active' : ''}`}
                      aria-pressed={isActive}
                      title={isActive ? 'Hide layer' : 'Show layer'}
                      onClick={() => handleGeoServerLayerToggle(layer.name)}
                    >
                      {isActive ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <div className={`map-toolbox ${isMapToolboxOpen ? 'open' : 'collapsed'}`} aria-label="Map tools">
          {isMapToolboxOpen && (
            <>
              <button
                type="button"
                className="map-tool-button"
                title="Clear redline"
                onClick={() => {
                  setRedlinePolygons([]);
                  setRedlineVisible(true);
                }}
              >
                <Trash2 size={13} />
              </button>
              <button
                type="button"
                className={`map-tool-button redline ${isRedlineDrawing ? 'active' : ''}`}
                title={isRedlineDrawing ? 'Stop redline drawing' : 'Draw redline'}
                onClick={() => {
                  setRedlineVisible(true);
                  setIsRedlineDrawing((value) => !value);
                }}
              >
                RL
              </button>
            </>
          )}

          <button
            type="button"
            className="map-toolbox-toggle"
            title={isMapToolboxOpen ? 'Collapse tools' : 'Expand tools'}
            onClick={() => setIsMapToolboxOpen((value) => !value)}
          >
            {isMapToolboxOpen ? '×' : '+'}
          </button>
        </div>

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

        <div className="feature-module-container">
          <div className="feature-module-tabs">
            <button
              type="button"
              className={`feature-module-tab ${activeFeatureModule === 'shortest-path' ? 'active' : ''}`}
              onClick={() => handleFeatureModuleToggle('shortest-path')}
            >
              Shortest Path
            </button>
            <button
              type="button"
              className={`feature-module-tab ${activeFeatureModule === 'proposed-olt' ? 'active' : ''}`}
              onClick={() => handleFeatureModuleToggle('proposed-olt')}
            >
              Proposed OLT
            </button>
          </div>

          {activeFeatureModule === 'shortest-path' && (
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
          )}

          {activeFeatureModule === 'proposed-olt' && (
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
          )}
        </div>
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
