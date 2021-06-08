import { createStructuredSelector, createSelector } from 'reselect';

import find from 'lodash/find';

import {
  getBasemaps,
  getBasemap,
  // getMapLabels,
  // getMapZoom,
  // getMapRoads,
  // getActiveDatasetsFromState,
} from 'components/map/selectors';

import { getPeriodOptions } from './settings/planet-menu/selectors';

export const getDynoBasemaps = createSelector([getBasemaps], (basemaps) => {
  const out = [];
  Object.keys(basemaps).forEach((key) => {
    if (!basemaps[key].static) {
      out.push(basemaps[key]);
    }
  });
  return out;
});

export const getActiveDynoBasemap = createSelector(
  [getDynoBasemaps, getBasemap],
  (basemaps, activeBasemap) => {
    if (!basemaps || !activeBasemap) {
      return null;
    }

    const defaultBasemap = find(basemaps, { label: 'Planet' });
    const dynoBasemap = find(basemaps, { label: activeBasemap.label });

    if (dynoBasemap) {
      return {
        ...dynoBasemap,
        active: true,
      };
    }

    if (defaultBasemap) {
      return {
        ...defaultBasemap,
        active: false,
      };
    }

    return null;
  }
);

export const getBasemapProps = createStructuredSelector({
  activeBasemap: getActiveDynoBasemap,
  planetPeriods: getPeriodOptions,
  basemaps: getDynoBasemaps,
});
