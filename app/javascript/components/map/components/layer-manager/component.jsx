import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { LayerManager, Layer } from 'layer-manager/dist/components';
import { PluginMapboxGl } from 'layer-manager';

class LayerManagerComponent extends PureComponent {
  render() {
    const { layers, geostore, setMapLoading, basemap, map, isAoI } = this.props;
    const geostoreLayer =
      geostore && geostore.id && !isAoI
        ? {
          id: geostore.id,
          name: 'Geojson',
          provider: 'geojson',
          layerConfig: {
            data: geostore.geojson,
            body: {
              vectorLayers: [
                {
                  type: 'fill',
                  paint: {
                    'fill-color': 'transparent'
                  }
                },
                {
                  type: 'line',
                  paint: {
                    'line-color': '#000',
                    'line-width': 2
                  }
                }
              ]
            }
          },
          zIndex: 1060
        }
        : null;

    const aoiLayer =
      geostore && geostore.id && isAoI
        ? {
          id: geostore.id,
          name: 'Geojson',
          provider: 'geojson',
          layerConfig: {
            data: geostore.geojson,
            body: {
              vectorLayers: [
                {
                  type: 'fill',
                  paint: {
                    'fill-color': 'transparent'
                  }
                },
                {
                  type: 'line',
                  paint: {
                    'line-color': '#C0FF24',
                    'line-width': 3,
                    'line-offset': 0
                  }
                },
                {
                  type: 'line',
                  paint: {
                    'line-color': '#000',
                    'line-width': 2
                  }
                }
              ]
            }
          },
          zIndex: 1060
        }
        : null;

    const basemapLayer =
      basemap && basemap.url
        ? {
          id: basemap.url,
          name: 'Basemap',
          provider: 'leaflet',
          layerConfig: {
            body: {
              url: basemap.url
            }
          },
          zIndex: 100
        }
        : null;

    const allLayers = [geostoreLayer, aoiLayer, basemapLayer]
      .concat(layers)
      .filter(l => l);

    return (
      <LayerManager
        map={map}
        plugin={PluginMapboxGl}
        onLayerLoading={loading => setMapLoading(loading)}
      >
        {allLayers && allLayers.map(l => <Layer key={l.id} {...l} />)}
      </LayerManager>
    );
  }
}

LayerManagerComponent.propTypes = {
  loading: PropTypes.bool,
  layers: PropTypes.array,
  isAoI: PropTypes.bool,
  basemap: PropTypes.object,
  geostore: PropTypes.object,
  setMapLoading: PropTypes.func,
  map: PropTypes.object
};

export default LayerManagerComponent;
