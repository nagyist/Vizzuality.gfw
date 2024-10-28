import { createSelector, createStructuredSelector } from 'reselect';
import isEmpty from 'lodash/isEmpty';
import sumBy from 'lodash/sumBy';
import groupBy from 'lodash/groupBy';
import { formatNumber } from 'utils/format';
import {
  yearTicksFormatter,
  zeroFillYears,
} from 'components/widgets/utils/data';

// get list data
const getExtent = (state) => state.data && state.data.extent;
const getPrimaryLoss = (state) => state.data && state.data.primaryLoss;
const getAdminLoss = (state) => state.data && state.data.adminLoss;
const getSettings = (state) => state.settings;
const getLocationLabel = (state) => state.locationLabel;
const getAlerts = (state) => state.alerts || [];
const getAdm0 = (state) => state.adm0;
const getIndicator = (state) => state.indicator;
const getColors = (state) => state.colors;
const getSentence = (state) => state && state.sentence;
const getTitle = (state) => state.title;

const sumByYear = (data) => {
  const groupedByYear = groupBy(data, 'year');
  const summedByYear = Object.entries(groupedByYear);
  return summedByYear.map(([yearKey, valArr]) => ({
    area: sumBy(valArr, 'area'),
    year: parseInt(yearKey, 10),
  }));
};

const parseData = createSelector(
  [getAdminLoss, getPrimaryLoss, getExtent, getSettings],
  (adminLossData, primaryLossData, extentData, settings) => {
    if (
      !extentData ||
      !adminLossData ||
      isEmpty(adminLossData) ||
      !primaryLossData ||
      isEmpty(primaryLossData)
    ) {
      return null;
    }

    const { startYear, endYear, yearsRange } = settings;
    const years = yearsRange && yearsRange.map((yearObj) => yearObj.value);
    const fillObj = {
      area: 0,
      percentage: 0,
    };

    const primaryLoss = sumByYear(primaryLossData);
    const adminLoss = sumByYear(adminLossData);

    const initalLossArr = primaryLoss.find((d) => d.year === 2002);
    const initalLoss = initalLossArr ? initalLossArr.area : 0;
    const totalAdminLoss =
      sumBy(
        adminLoss.filter((d) => d.year >= startYear && d.year <= endYear),
        'area'
      ) || 0;

    const extent = (extentData.length && sumBy(extentData, 'extent')) || 0;
    let initalExtent = extent - initalLoss || 0;
    const initalExtent2001 = extent - initalLoss || 0;

    const zeroFilledData = zeroFillYears(
      primaryLoss,
      2001,
      endYear,
      [2001, ...years],
      fillObj
    );

    const parsedData = zeroFilledData.map((d) => {
      if (d.year !== 2001) initalExtent -= d.area;
      const yearData = {
        ...d,
        initalExtent2001,
        totalLoss: totalAdminLoss,
        area: d.area || 0,
        extentRemainingHa: initalExtent,
        extentRemaining: (100 * initalExtent) / initalExtent2001,
      };
      return yearData;
    });
    return parsedData;
  }
);

const filterData = createSelector(
  [parseData, getSettings],
  (parsedData, settings) => {
    if (!parsedData || isEmpty(parsedData)) {
      return null;
    }
    const { startYear, endYear } = settings;
    return parsedData.filter((d) => d.year >= startYear && d.year <= endYear);
  }
);

const parseConfig = createSelector([getColors], (colors) => ({
  height: 250,
  xKey: 'year',
  yKeys: {
    bars: {
      area: {
        fill: colors.primaryForestLoss,
        background: false,
        yAxisId: 'area',
      },
    },
    lines: {
      extentRemaining: {
        stroke: colors.primaryForestExtent,
        yAxisId: 'extentRemaining',
        strokeDasharray: '3 4',
      },
    },
  },
  xAxis: {
    tickFormatter: yearTicksFormatter,
  },
  yAxis: {
    yAxisId: 'area',
  },
  rightYAxis: {
    yAxisId: 'extentRemaining',
    unit: '%',
    maxYValue: 100,
  },
  unit: 'ha',
  tooltip: [
    {
      key: 'year',
    },
    {
      key: 'extentRemaining',
      unitFormat: (value) =>
        formatNumber({ num: value, unit: '%', precision: 3 }),
      label: 'Primary forest extent remaining',
      color: colors.primaryForestExtent,
      dashline: true,
    },
    {
      key: 'area',
      unitFormat: (value) =>
        formatNumber({ num: value, unit: 'ha', spaceUnit: true }),
      label: 'Primary forest loss',
      color: colors.primaryForestLoss,
    },
  ],
  chartLegend: {
    columns: [
      {
        items: [
          {
            label: 'Area of tree cover loss within 2001 primary forest extent',
            color: colors.primaryForestLoss,
          },
          {
            label: 'Percent of primary forest area in 2001 remaining',
            color: colors.primaryForestExtent,
            dashline: true,
          },
        ],
      },
    ],
  },
}));

export const parseTitle = createSelector(
  [getTitle, getLocationLabel],
  (title, name) => {
    let selectedTitle = title.default;
    if (name === 'global') {
      selectedTitle = title.global;
    }
    return selectedTitle;
  }
);

export const parseAlerts = createSelector(
  [getAlerts, getLocationLabel, getAdm0],
  (alerts, locationLabel, adm0) => {
    const countriesWithNewWarningText = [
      'CMR',
      'CIV',
      'COD',
      'GNQ',
      'GAB',
      'GHA',
      'GIN',
      'GNB',
      'LBR',
      'MDG',
      'COG',
      'SLE',
    ];

    if (countriesWithNewWarningText.includes(adm0)) {
      return [
        {
          text: `The methods behind this data have changed over time, resulting in an underreporting of tree cover loss in ${locationLabel} prior to 2015. We advise against comparing the data before/after 2015 in ${locationLabel}. [Read more here](https://www.globalforestwatch.org/blog/data-and-research/tree-cover-loss-satellite-data-trend-analysis/).`,
          visible: ['global', 'country', 'geostore', 'aoi', 'wdpa', 'use'],
        },
      ];
    }

    return alerts;
  }
);

const parseSentence = createSelector(
  [
    parseData,
    filterData,
    getExtent,
    getSettings,
    getLocationLabel,
    getIndicator,
    getSentence,
  ],
  (
    data,
    filteredData,
    extent,
    settings,
    locationLabel,
    indicator,
    sentences
  ) => {
    if (!data) return null;
    const {
      initial,
      withIndicator,
      noLoss,
      noLossWithIndicator,
      globalInitial,
      globalWithIndicator,
    } = sentences;
    const { startYear, endYear } = settings;

    const totalLossPrimary =
      filteredData && filteredData.length ? sumBy(filteredData, 'area') : 0;

    const totalLoss = data && data.length ? data[0].totalLoss : 0;
    const percentageLoss =
      (totalLoss && extent && (totalLossPrimary / totalLoss) * 100) || 0;

    const initialExtentData = data.find((d) => d.year === startYear - 1);
    const initialExtent =
      (initialExtentData && initialExtentData.extentRemaining) || 100;

    const finalExtentData = data.find((d) => d.year === endYear);
    const finalExtent =
      (finalExtentData && finalExtentData.extentRemaining) || 0;

    let sentence = indicator ? withIndicator : initial;
    if (totalLoss === 0) {
      sentence = indicator ? noLossWithIndicator : noLoss;
    }
    if (locationLabel === 'global') {
      sentence = indicator ? globalWithIndicator : globalInitial;
    }
    const params = {
      indicator: indicator && indicator.label,
      location: locationLabel === 'global' ? 'globally' : locationLabel,
      startYear,
      endYear,
      extentDelta: formatNumber({
        num: Math.abs(initialExtent - finalExtent),
        unit: '%',
      }),
      loss: formatNumber({
        num: totalLossPrimary,
        unit: 'ha',
        spaceUnit: true,
      }),
      percent: formatNumber({ num: percentageLoss, unit: '%' }),
      component: {
        key: 'total tree cover loss',
        fine: true,
        tooltip:
          'Total tree cover loss includes loss in dry and non-tropical primary forests, secondary forests, and tree plantations in addition to humid primary forest loss.',
      },
    };

    return {
      sentence,
      params,
    };
  }
);

export default createStructuredSelector({
  data: filterData,
  config: parseConfig,
  sentence: parseSentence,
  title: parseTitle,
  alerts: parseAlerts,
});
