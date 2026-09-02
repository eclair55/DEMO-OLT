import React from 'react';
import { Route, MapPin, Trash2, LocateFixed } from 'lucide-react';

export default function ShortestPathPanel({
  shortestPathMode,
  shortestPathStart,
  shortestPathEnd,
  maxSnapDistance,
  isShortestPathLoading,
  onSetMaxSnapDistance,
  onStartShortestPath,
  onResetShortestPath,
  onCalculateShortestPath,
  onClearStart,
  onClearEnd
}) {
  return (
    <div className="shortest-path-panel">
      <div className="shortest-path-header">
        <div className="shortest-path-title-wrap">
          <Route size={16} color="#7c3aed" />
          <span>Shortest Path</span>
        </div>
      </div>

      {!shortestPathMode ? (
        <button className="shortest-path-btn" type="button" onClick={onStartShortestPath}>
          <LocateFixed size={14} />
          Select route points
        </button>
      ) : (
        <div className="shortest-path-builder">
          <div className="shortest-path-point-row">
            <button className="point-chip point-start">
              <MapPin size={12} />
              <span>Start</span>
            </button>
            <div className="point-value">
              {shortestPathStart ? `${shortestPathStart.x.toFixed(2)}, ${shortestPathStart.y.toFixed(2)}` : 'Waiting...'}
            </div>
            {shortestPathStart && (
              <button className="clear-point-btn" type="button" onClick={onClearStart} aria-label="Clear start point">
                <Trash2 size={12} />
              </button>
            )}
          </div>

          <div className="shortest-path-point-row">
            <div className="point-chip point-end">
              <MapPin size={12} />
              <span>End</span>
            </div>
            <div className="point-value">
              {shortestPathEnd ? `${shortestPathEnd.x.toFixed(2)}, ${shortestPathEnd.y.toFixed(2)}` : 'Waiting...'}
            </div>
            {shortestPathEnd && (
              <button className="clear-point-btn" type="button" onClick={onClearEnd} aria-label="Clear end point">
                <Trash2 size={12} />
              </button>
            )}
          </div>

          <label className="shortest-path-field">
            <span>Max snap distance (m)</span>
            <input
              type="number"
              min="0"
              step="1"
              value={maxSnapDistance}
              onChange={(event) => onSetMaxSnapDistance(Number(event.target.value || 0))}
            />
          </label>

          <div className="shortest-path-actions">
            <button
              className="shortest-path-primary"
              type="button"
              disabled={!shortestPathStart || !shortestPathEnd || isShortestPathLoading}
              onClick={onCalculateShortestPath}
            >
              {isShortestPathLoading ? 'Calculating...' : 'Calculate route'}
            </button>
            <button className="shortest-path-secondary" type="button" onClick={onResetShortestPath}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
