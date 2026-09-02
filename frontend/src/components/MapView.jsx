import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import Feature from 'ol/Feature';
import Overlay from 'ol/Overlay';
import TileWMS from 'ol/source/TileWMS';
import { Draw } from 'ol/interaction';
import WKT from 'ol/format/WKT';
import { Point, Polygon } from 'ol/geom';
import { getCenter } from 'ol/extent';
import { transform } from 'ol/proj';
import { Style, Circle, Fill, Stroke, Text, RegularShape } from 'ol/style';
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';

const MapView = forwardRef(function MapView({
  olts,
  lcps,
  naps,
  routes,
  srid,
  selectedOltCode,
  selectedLcpId,
  selectedNapId,
  shortestPathMode,
  shortestPathStart,
  shortestPathEnd,
  proposedOltPinMode,
  proposedOltPin,
  activeGeoServerLayers,
  redlineVisible,
  redlinePolygons,
  isRedlineDrawing,
  onRedlineDrawComplete,
  onMapCoordinateSelect,
  onOltClick,
  onLcpClick,
  onNapClick,
  onProposedOltPinSelect
}, ref) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(11);
  const oltSourceRef = useRef(new VectorSource());
  const lcpSourceRef = useRef(new VectorSource());
  const napSourceRef = useRef(new VectorSource());
  const routeSourceRef = useRef(new VectorSource());
  const shortestPathSourceRef = useRef(new VectorSource());
  const proposedOltPinSourceRef = useRef(new VectorSource());
  const redlineSourceRef = useRef(new VectorSource());
  const geoServerLayerRefs = useRef([]);
  const drawInteractionRef = useRef(null);
  const overlayRef = useRef(null);
  const popupElementRef = useRef(null);
  const shortestPathModeRef = useRef(shortestPathMode);
  const proposedOltPinModeRef = useRef(proposedOltPinMode);
  const onMapCoordinateSelectRef = useRef(onMapCoordinateSelect);
  const onProposedOltPinSelectRef = useRef(onProposedOltPinSelect);

  useEffect(() => {
    shortestPathModeRef.current = shortestPathMode;
  }, [shortestPathMode]);

  useEffect(() => {
    proposedOltPinModeRef.current = proposedOltPinMode;
  }, [proposedOltPinMode]);

  useEffect(() => {
    onMapCoordinateSelectRef.current = onMapCoordinateSelect;
  }, [onMapCoordinateSelect]);

  useEffect(() => {
    onProposedOltPinSelectRef.current = onProposedOltPinSelect;
  }, [onProposedOltPinSelect]);

  const zoomToFeature = (source, property, value, maxZoom) => {
    const feature = source.getFeatures().find((item) => item.get(property) === value);
    if (!feature || !mapInstanceRef.current) return;

    mapInstanceRef.current.getView().fit(feature.getGeometry().getExtent(), {
      padding: [120, 120, 120, 120],
      maxZoom,
      duration: 600
    });
  };

  useImperativeHandle(ref, () => ({
    zoomToLcp: (lcpId) => zoomToFeature(lcpSourceRef.current, 'ODNC_ODN_CONT_ID', lcpId, 16),
    zoomToNap: (napId) => {
      const feature = napSourceRef.current.getFeatures().find(
        (item) => item.get('ODNC_ODN_CONT_ID') === napId || item.get('NAP_ID') === napId
      );
      if (!feature || !mapInstanceRef.current) return;

      mapInstanceRef.current.getView().animate({
        center: getCenter(feature.getGeometry().getExtent()),
        zoom: 17,
        duration: 600
      });
    }
  }));

  // Register SRID projection dynamically
  useEffect(() => {
    if (srid && srid !== '4326' && srid !== '3857') {
      try {
        if (srid === '32651') {
          proj4.defs(
            'EPSG:32651',
            '+proj=utm +zone=51 +datum=WGS84 +units=m +no_defs'
          );
        }
        register(proj4);
      } catch (err) {
        console.error('Failed to register projection EPSG:' + srid, err);
      }
    }
  }, [srid]);

  // Initialize Map
  useEffect(() => {
    if (mapInstanceRef.current) return;

    // Styles
    const oltStyle = (feature) => {
      const code = feature.get('OLT_CODE');
      const status = (feature.get('STATUS') ?? '').toString().toUpperCase();
      const isSelected = feature.get('isSelected');
      const isProposed = status === 'PROPOSED';
      const fillColor = isProposed ? '#9ca3af' : isSelected ? '#1d4ed8' : '#2563eb';
      return new Style({
        image: new Circle({
          radius: isSelected ? 12 : 9,
          fill: new Fill({ color: fillColor }),
          stroke: new Stroke({
            color: '#ffffff',
            width: isSelected ? 3 : 2
          })
        }),
        text: new Text({
          text: code || '',
          offsetY: -16,
          fill: new Fill({ color: '#0f172a' }),
          stroke: new Stroke({ color: '#ffffff', width: 3 }),
          font: 'bold 12px sans-serif'
        })
      });
    };

    const lcpStyle = (feature) => {
      const id = feature.get('ODNC_ODN_CONT_ID');
      const isSelected = feature.get('isSelected');
      const isPoint = feature.getGeometry()?.getType() === 'Point';
      return new Style({
        image: isPoint
          ? new RegularShape({
              points: 3,
              radius: isSelected ? 12 : 9,
              rotation: 0,
              angle: 0,
              fill: new Fill({ color: '#facc15' }),
              stroke: new Stroke({
                color: isSelected ? '#92400e' : '#a16207',
                width: isSelected ? 3 : 2
              })
            })
          : undefined,
        text: new Text({
          text: id || '',
          offsetY: isPoint ? -20 : 0,
          fill: new Fill({ color: '#064e3b' }),
          stroke: new Stroke({ color: '#ffffff', width: 2 }),
          font: 'bold 11px sans-serif'
        })
      });
    };

    const napStyle = (feature) => {
      const napId = feature.get('ODNC_ODN_CONT_ID') || feature.get('NAP_ID') || 'NAP';
      const isSelected = feature.get('isSelected');
      const utilization = Number(feature.get('UTILIZATION') ?? feature.get('utilization'));
      const utilizationColor = utilization >= 100
        ? '#dc2626'
        : utilization >= 50
          ? '#eab308'
          : utilization >= 0
            ? '#16a34a'
            : '#64748b';
      return new Style({
        image: new Circle({
          radius: isSelected ? 9 : 6,
          fill: new Fill({ color: utilizationColor }),
          stroke: new Stroke({ color: isSelected ? '#0f172a' : '#ffffff', width: isSelected ? 3 : 1.5 })
        }),
        text: new Text({
          text: napId,
          offsetY: 14,
          fill: new Fill({ color: utilizationColor }),
          stroke: new Stroke({ color: '#ffffff', width: 2 }),
          font: 'bold 10px sans-serif'
        })
      });
    };

    const routeStyle = new Style({
      stroke: new Stroke({ color: '#7c3aed', width: 4 })
    });

    const shortestPathStyle = new Style({
      stroke: new Stroke({ color: '#ef4444', width: 5 })
    });

    const oltLayer = new VectorLayer({
      source: oltSourceRef.current,
      style: oltStyle,
      zIndex: 3
    });

    const lcpLayer = new VectorLayer({
      source: lcpSourceRef.current,
      style: lcpStyle,
      zIndex: 2
    });

    const napLayer = new VectorLayer({
      source: napSourceRef.current,
      style: napStyle,
      zIndex: 4
    });

    const routeLayer = new VectorLayer({
      source: routeSourceRef.current,
      style: (feature) => feature.get('__shortestPath') ? shortestPathStyle : routeStyle,
      zIndex: 1
    });

    const shortestPathPinLayer = new VectorLayer({
      source: shortestPathSourceRef.current,
      style: (feature) => {
        const color = feature.get('pinColor') || '#16a34a';
        return new Style({
          image: new Circle({
            radius: 9,
            fill: new Fill({ color }),
            stroke: new Stroke({ color: '#ffffff', width: 3 })
          }),
          text: new Text({
            text: feature.get('label') || '',
            offsetY: -16,
            fill: new Fill({ color: '#0f172a' }),
            stroke: new Stroke({ color: '#ffffff', width: 2 }),
            font: 'bold 10px sans-serif'
          })
        });
      },
      zIndex: 6
    });

    const proposedOltPinLayer = new VectorLayer({
      source: proposedOltPinSourceRef.current,
      style: new Style({
        image: new Circle({
          radius: 9,
          fill: new Fill({ color: '#0f766e' }),
          stroke: new Stroke({ color: '#ffffff', width: 3 })
        }),
        text: new Text({
          text: 'P',
          offsetY: -16,
          fill: new Fill({ color: '#0f172a' }),
          stroke: new Stroke({ color: '#ffffff', width: 2 }),
          font: 'bold 10px sans-serif'
        })
      }),
      zIndex: 7
    });

    const redlineLayer = new VectorLayer({
      source: redlineSourceRef.current,
      style: new Style({
        fill: new Fill({ color: 'rgba(239, 68, 68, 0.18)' }),
        stroke: new Stroke({ color: '#dc2626', width: 3 })
      }),
      zIndex: 9,
      visible: Boolean(redlineVisible)
    });
    redlineLayer.set('isRedlineLayer', true);

    // Create Popup Overlay
    const overlay = new Overlay({
      element: popupElementRef.current,
      autoPan: true,
      autoPanAnimation: { duration: 250 }
    });
    overlayRef.current = overlay;

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        lcpLayer,
        routeLayer,
        oltLayer,
        napLayer,
        shortestPathPinLayer,
        proposedOltPinLayer,
        redlineLayer
      ],
      overlays: [overlay],
      view: new View({
        center: [13470000, 1630000], // Default approx Philippines center in EPSG:3857
        zoom: 11
      })
    });

    // Map Click Handler
    map.on('singleclick', (evt) => {
      if (proposedOltPinModeRef.current && onProposedOltPinSelectRef.current) {
        const [longitude, latitude] = transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326');
        const normalizedLongitude = Number(longitude.toFixed(6));
        const normalizedLatitude = Number(latitude.toFixed(6));
        onProposedOltPinSelectRef.current({
          longitude: normalizedLongitude,
          latitude: normalizedLatitude
        });
        return;
      }

      if (shortestPathModeRef.current && onMapCoordinateSelectRef.current) {
        const targetSrid = srid ? `EPSG:${srid}` : 'EPSG:32651';
        const [x, y] = transform(evt.coordinate, 'EPSG:3857', targetSrid);
        onMapCoordinateSelectRef.current({ x, y });
        return;
      }

      let featureFound = false;
      map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
        if (featureFound) return;
        const oltCode = feature.get('OLT_CODE');
        const odnContId = feature.get('ODNC_ODN_CONT_ID');

        if (oltCode && onOltClick) {
          featureFound = true;
          onOltClick(oltCode);
        } else if (layer === napLayer && odnContId && onNapClick) {
          featureFound = true;
          onNapClick(odnContId);
        } else if (odnContId && onLcpClick) {
          featureFound = true;
          onLcpClick(odnContId);
        }
      });
    });

    // Hover Tooltip / Pointer Handler
    map.on('pointermove', (evt) => {
      if (evt.dragging) return;
      const pixel = map.getEventPixel(evt.originalEvent);
      let hit = false;
      map.forEachFeatureAtPixel(pixel, (feature) => {
        hit = true;
        const oltCode = feature.get('OLT_CODE');
        const lcpId = feature.get('ODNC_ODN_CONT_ID');
        const napId = feature.get('ODNC_ODN_CONT_ID') || feature.get('NAP_ID');

        let text = '';
        if (oltCode) text = `<strong>OLT</strong><br/>Code: ${oltCode}`;
        else if (lcpId) text = `<strong>LCP</strong><br/>ID: ${lcpId}`;
        else if (napId) text = `<strong>NAP</strong><br/>ID: ${napId}`;

        if (popupElementRef.current && text) {
          popupElementRef.current.innerHTML = text;
          overlay.setPosition(evt.coordinate);
        }
      });

      map.getTargetElement().style.cursor = hit ? 'pointer' : '';
      if (!hit) {
        overlay.setPosition(undefined);
      }
    });

    mapInstanceRef.current = map;
    const updateZoomLevel = () => setZoomLevel(Math.round(map.getView().getZoom() ?? 0));
    map.getView().on('change:resolution', updateZoomLevel);
    updateZoomLevel();
  }, []);

  useEffect(() => {
    oltSourceRef.current.getFeatures().forEach((feature) => {
      feature.set('isSelected', feature.get('OLT_CODE') === selectedOltCode);
    });
    lcpSourceRef.current.getFeatures().forEach((feature) => {
      feature.set('isSelected', feature.get('ODNC_ODN_CONT_ID') === selectedLcpId);
    });
    napSourceRef.current.getFeatures().forEach((feature) => {
      feature.set('isSelected', feature.get('ODNC_ODN_CONT_ID') === selectedNapId || feature.get('NAP_ID') === selectedNapId);
    });
  }, [selectedOltCode, selectedLcpId, selectedNapId]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    routeSourceRef.current.clear();
    const features = parseWktFeatures(routes, '32651');
    routeSourceRef.current.addFeatures(features);
  }, [routes, srid]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    redlineSourceRef.current.clear();

    redlinePolygons.forEach((polygon) => {
      if (polygon) {
        redlineSourceRef.current.addFeature(new Feature({ geometry: polygon }));
      }
    });
  }, [redlinePolygons]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    shortestPathSourceRef.current.clear();

    const pins = [];
    if (shortestPathStart) {
      pins.push(new Feature({
        geometry: new Point([shortestPathStart.x, shortestPathStart.y]),
        label: 'S',
        pinColor: '#16a34a'
      }));
    }
    if (shortestPathEnd) {
      pins.push(new Feature({
        geometry: new Point([shortestPathEnd.x, shortestPathEnd.y]),
        label: 'E',
        pinColor: '#dc2626'
      }));
    }

    if (pins.length > 0) {
      const transformedPins = pins.map((feature) => {
        const proj = srid ? `EPSG:${srid}` : 'EPSG:32651';
        const coords = feature.getGeometry().getCoordinates();
        const transformed = transform(coords, proj, 'EPSG:3857');
        feature.setGeometry(new Point(transformed));
        return feature;
      });
      shortestPathSourceRef.current.addFeatures(transformedPins);
    }
  }, [shortestPathStart, shortestPathEnd, srid]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    proposedOltPinSourceRef.current.clear();

    if (!proposedOltPin) return;

    const pin = new Feature({
      geometry: new Point(transform([proposedOltPin.longitude, proposedOltPin.latitude], 'EPSG:4326', 'EPSG:3857'))
    });
    proposedOltPinSourceRef.current.addFeature(pin);
  }, [proposedOltPin]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const redlineLayer = mapInstanceRef.current
      .getLayers()
      .getArray()
      .find((layer) => layer.get('isRedlineLayer'));

    if (redlineLayer) {
      redlineLayer.setVisible(Boolean(redlineVisible));
    }
  }, [redlineVisible]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (drawInteractionRef.current) {
      mapInstanceRef.current.removeInteraction(drawInteractionRef.current);
      drawInteractionRef.current = null;
    }

    if (!isRedlineDrawing || !redlineVisible) return;

    const draw = new Draw({
      source: redlineSourceRef.current,
      type: 'Polygon'
    });

    draw.on('drawend', (event) => {
      const geom = event.feature.getGeometry();
      if (geom instanceof Polygon) {
        onRedlineDrawComplete?.(geom.clone());
      }
    });

    mapInstanceRef.current.addInteraction(draw);
    drawInteractionRef.current = draw;
  }, [isRedlineDrawing, redlineVisible, onRedlineDrawComplete]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    geoServerLayerRefs.current.forEach((layer) => {
      if (mapInstanceRef.current.getLayers().getArray().includes(layer)) {
        mapInstanceRef.current.removeLayer(layer);
      }
    });
    geoServerLayerRefs.current = [];

    activeGeoServerLayers.forEach((layerName) => {
      const layer = new TileLayer({
        source: new TileWMS({
          url: '/geoserver/PPGIS/wms',
          params: {
            LAYERS: `PPGIS:${layerName}`,
            TILED: true,
            FORMAT: 'image/png8'
          },
          serverType: 'geoserver',
          crossOrigin: 'anonymous'
        }),
        zIndex: 8,
        visible: true
      });

      layer.set('isGeoServerLayer', true);
      mapInstanceRef.current.addLayer(layer);
      geoServerLayerRefs.current.push(layer);
    });
  }, [activeGeoServerLayers]);

  // WKT Parser Helper
  const parseWktFeatures = (records, defaultSrid) => {
    const format = new WKT();
    const sourceProj = srid ? `EPSG:${srid}` : `EPSG:${defaultSrid || '32651'}`;
    const targetProj = 'EPSG:3857';
    const numericValue = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?';
    const normalizeWkt = (wkt) => {
      const coordinate = new RegExp(
        `(${numericValue})\\s+(${numericValue})(?:\\s+${numericValue})+`,
        'g'
      );
      return wkt.replace(coordinate, '$1 $2');
    };

    return records
      .map((item) => {
        if (!item.WKT) return null;
        try {
          const geom = format.readGeometry(normalizeWkt(item.WKT), {
            dataProjection: sourceProj,
            featureProjection: targetProj
          });
          const feature = new Feature({ geometry: geom });
          Object.keys(item).forEach((key) => {
            feature.set(key, item[key]);
          });
          return feature;
        } catch (err) {
          console.error('Error parsing WKT:', item.WKT, err);
          return null;
        }
      })
      .filter(Boolean);
  };

  // Update OLT Features
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    oltSourceRef.current.clear();

    const features = parseWktFeatures(olts, '32651');
    if (features.length > 0) {
      features.forEach((feature) => feature.set('isSelected', feature.get('OLT_CODE') === selectedOltCode));
      oltSourceRef.current.addFeatures(features);
      const extent = oltSourceRef.current.getExtent();
      mapInstanceRef.current.getView().fit(extent, {
        padding: [80, 80, 80, 80],
        maxZoom: 13,
        duration: 800
      });
    }
  }, [olts, srid]);

  // Update LCP Features
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    lcpSourceRef.current.clear();

    const features = parseWktFeatures(lcps, '32651');
    if (features.length > 0) {
      features.forEach((feature) => feature.set('isSelected', feature.get('ODNC_ODN_CONT_ID') === selectedLcpId));
      lcpSourceRef.current.addFeatures(features);
      const extent = lcpSourceRef.current.getExtent();
      mapInstanceRef.current.getView().fit(extent, {
        padding: [100, 100, 100, 100],
        maxZoom: 15,
        duration: 800
      });
    }
  }, [lcps, srid]);

  // Update NAP Features
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    napSourceRef.current.clear();

    const features = parseWktFeatures(naps, '32651');
    if (features.length > 0) {
      features.forEach((feature) => feature.set('isSelected', feature.get('ODNC_ODN_CONT_ID') === selectedNapId || feature.get('NAP_ID') === selectedNapId));
      napSourceRef.current.addFeatures(features);
      const extent = napSourceRef.current.getExtent();
      mapInstanceRef.current.getView().fit(extent, {
        padding: [120, 120, 120, 120],
        maxZoom: 16,
        duration: 800
      });
    }
  }, [naps, srid]);

  return (
    <div className="map-container">
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      <div className="zoom-level" aria-live="polite">
        Zoom {zoomLevel}
      </div>
      <div ref={popupElementRef} className="ol-popup" />
    </div>
  );
});

export default MapView;
