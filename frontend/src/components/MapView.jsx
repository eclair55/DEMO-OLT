import React, { useEffect, useRef } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import Feature from 'ol/Feature';
import Overlay from 'ol/Overlay';
import WKT from 'ol/format/WKT';
import { Style, Circle, Fill, Stroke, Text, RegularShape } from 'ol/style';
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';

export default function MapView({
  olts,
  lcps,
  naps,
  srid,
  selectedOltCode,
  selectedLcpId,
  onOltClick,
  onLcpClick
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const oltSourceRef = useRef(new VectorSource());
  const lcpSourceRef = useRef(new VectorSource());
  const napSourceRef = useRef(new VectorSource());
  const overlayRef = useRef(null);
  const popupElementRef = useRef(null);

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
      const isSelected = code === selectedOltCode;
      return new Style({
        image: new Circle({
          radius: isSelected ? 12 : 9,
          fill: new Fill({ color: isSelected ? '#1d4ed8' : '#2563eb' }),
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
      const isSelected = id === selectedLcpId;
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
        stroke: new Stroke({
          color: isSelected ? '#047857' : '#059669',
          width: isSelected ? 6 : 4
        }),
        fill: new Fill({
          color: isSelected ? 'rgba(5, 150, 105, 0.3)' : 'rgba(5, 150, 105, 0.15)'
        }),
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
      return new Style({
        image: new Circle({
          radius: 6,
          fill: new Fill({ color: '#dc2626' }),
          stroke: new Stroke({ color: '#ffffff', width: 1.5 })
        }),
        text: new Text({
          text: napId,
          offsetY: 14,
          fill: new Fill({ color: '#991b1b' }),
          stroke: new Stroke({ color: '#ffffff', width: 2 }),
          font: 'bold 10px sans-serif'
        })
      });
    };

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
        oltLayer,
        napLayer
      ],
      overlays: [overlay],
      view: new View({
        center: [13470000, 1630000], // Default approx Philippines center in EPSG:3857
        zoom: 11
      })
    });

    // Map Click Handler
    map.on('singleclick', (evt) => {
      let featureFound = false;
      map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
        if (featureFound) return;
        const oltCode = feature.get('OLT_CODE');
        const odnContId = feature.get('ODNC_ODN_CONT_ID');

        if (oltCode && onOltClick) {
          featureFound = true;
          onOltClick(oltCode);
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
  }, []);

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
      <div ref={popupElementRef} className="ol-popup" />
    </div>
  );
}
