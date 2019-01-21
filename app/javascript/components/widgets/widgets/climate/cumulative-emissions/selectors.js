import { createSelector, createStructuredSelector } from 'reselect';
import isEmpty from 'lodash/isEmpty';
import { formatNumber } from 'utils/format';
import groupBy from 'lodash/groupBy';
import range from 'lodash/range';
import moment from 'moment';

import { getDatesData, getChartConfig } from 'components/widgets/utils/data';

const getAlerts = state => (state.data && state.data.data) || null;
const getLocationName = state => state.locationName || null;
const getColors = state => state.colors || null;
const getActiveData = state => state.settings.activeData || null;
const getSentences = state => state.config.sentence || null;
const getSettings = state => state.settings;

const getDataSettings = state => state.data && state.data.settings;
export const getDataOptions = state => state.data && state.data.options;

export const getData = createSelector([getAlerts], data => {
  if (!data || isEmpty(data)) return null;

  const unit = 'cumulative_deforestation';
  const target = 1088880;

  const groupedByYear = Object.entries(data).reduce(
    (acc, [y, arr]) => ({
      ...acc,
      [y]: arr.map(d => ({ ...d, count: d[unit], year: y, target }))
    }),
    {}
  );

  const latestFullWeek = moment().subtract(2, 'w');
  const lastWeek = {
    isoWeek: latestFullWeek.isoWeek(),
    year: latestFullWeek.year()
  };

  const years = range(2015, lastWeek.year);
  const yearLengths = {};

  years.forEach(y => {
    if (lastWeek.year === parseInt(y, 10)) {
      yearLengths[y] = lastWeek.isoWeek;
    } else if (moment(`${y}-12-31`).weekday() === 1) {
      yearLengths[y] = moment(`${y}-12-30`).isoWeek();
    } else {
      yearLengths[y] = moment(`${y}-12-31`).isoWeek();
    }
  });

  return Object.entries(groupedByYear).reduce((acc, [y, arr]) => {
    const yearDataByWeek = groupBy(arr, 'week');
    const zeroFilledData = [];
    for (let i = 1; i <= yearLengths[y]; i += 1) {
      zeroFilledData.push(
        yearDataByWeek[i]
          ? yearDataByWeek[i][0]
          : { count: 0, week: i, year: parseInt(y, 10) }
      );
    }
    return { ...acc, [y]: zeroFilledData };
  }, {});
});

export const getStdDev = createSelector(
  [getData, getSettings],
  (data, settings) => {
    if (!data) return null;
    const years = Object.keys(data);
    const { year } = settings;
    const stdevs = [];
    const means = data[year].map((obj, weeknum) => {
      const sum = years.reduce(
        (acc, y) =>
          (y === year || !data[y][weeknum] ? acc : acc + data[y][weeknum].count),
        0
      );
      const mean = sum / years.length;
      const stdev = Math.sqrt(
        data[year].reduce((acc, d) => acc + (d.count - mean) ** 2, 0) /
          data[year].length
      );
      stdevs.push(stdev);
      return mean;
    });
    return data[year].map((d, i) => {
      const w = means[i] === undefined ? i : i - 1;
      return {
        ...d,
        twoPlusStdDev: [means[w], means[w] + stdevs[w]],
        twoMinusStdDev: [means[w] - stdevs[w], means[w]]
      };
    });
  }
);

export const getDates = createSelector([getStdDev], data => {
  if (!data) return null;
  return getDatesData(data);
});

export const parseData = createSelector([getDates], data => {
  if (!data) return null;
  return data;
});

export const parseConfig = createSelector([getColors], colors =>
  getChartConfig(
    colors,
    moment()
      .subtract(2, 'w')
      .format('YYYY-MM-DD')
  )
);

export const parseSentence = createSelector(
  [parseData, getActiveData, getSentences, getSettings, getLocationName],
  (data, activeData, sentence, settings, locationName) => {
    if (!data) return null;
    let lastDate = data[data.length - 1] || {};
    if (!isEmpty(activeData)) {
      lastDate = activeData;
    }
    const { count, date } = lastDate || {};
    const { year } = settings;

    const formattedData = moment(date).format('Do of MMMM YYYY');
    const unit = 'cumulative_deforestation';

    const params = {
      // {variable} {location} in {year} sums a total cummulative value of {value}
      date: formattedData,
      location: locationName,
      variable: unit,
      year,
      value: formatNumber({ num: count, unit: 't' })
    };
    return { sentence, params };
  }
);

export default createStructuredSelector({
  data: parseData,
  dataConfig: parseConfig,
  sentence: parseSentence,
  settings: getDataSettings
});
