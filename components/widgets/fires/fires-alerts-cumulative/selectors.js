/* eslint-disable prefer-destructuring */
import { createSelector, createStructuredSelector } from 'reselect';
import moment from 'moment';
import { format } from 'd3-format';
import isEmpty from 'lodash/isEmpty';
import sortBy from 'lodash/sortBy';
import groupBy from 'lodash/groupBy';
import max from 'lodash/max';
import maxBy from 'lodash/maxBy';
import min from 'lodash/min';
import findLastIndex from 'lodash/findLastIndex';

import { getColorPalette } from 'components/widgets/utils/colors';
import {
  getCumulativeStatsData,
  getDatesData,
  getChartConfig,
} from 'components/widgets/utils/data';
import { localizeWidgetSentenceDate } from 'utils/localize-date';

const getAlerts = (state) => state.data && state.data.alerts;
const getLatest = (state) => state.data && state.data.latest;
const getColors = (state) => state.colors || null;
const getCompareYear = (state) => state.settings.compareYear || null;
const getAllYears = (state) =>
  state.data &&
  state.data.options &&
  state.data.options.compareYear.map((y) => y.value);
const getDataset = (state) => state.settings.dataset || null;
const getStartIndex = (state) => state.settings.startIndex || 0;
const getEndIndex = (state) => state.settings.endIndex || null;
const getSentences = (state) => state.sentences || null;
const getLocationName = (state) => state.locationLabel;
const getOptionsSelected = (state) => state.optionsSelected;
const getIndicator = (state) => state.indicator;
const getSettings = (state) => state.settings;
const getLanguage = (state) => state.lang;

export const getCompareYears = createSelector(
  [getCompareYear, getAllYears],
  (compareYear, allYears) => {
    if (!compareYear || !allYears) return null;
    if (compareYear === 'all') return allYears;

    return allYears.filter((y) => y === compareYear);
  }
);

export const getData = createSelector(
  [getAlerts, getLatest],
  (data, latest) => {
    if (!data || isEmpty(data)) return null;
    const parsedData = data.map((d) => ({
      ...d,
      count: d.alert__count,
      week: parseInt(d.alert__week, 10),
      year: parseInt(d.alert__year, 10),
    }));
    const groupedByYear = groupBy(sortBy(parsedData, ['year', 'week']), 'year');
    const hasAlertsByYears = Object.values(groupedByYear).reduce(
      (acc, next) => {
        const { year } = next[0];
        return {
          ...acc,
          [year]: next.some((item) => item.count > 0),
        };
      },
      {}
    );

    const dataYears = Object.keys(hasAlertsByYears).filter(
      (key) => hasAlertsByYears[key] === true
    );
    const minYear = Math.min(...dataYears.map((el) => parseInt(el, 10)));
    const startYear =
      minYear === moment().year() ? moment().year() - 1 : minYear;

    const years = [];
    const latestWeek = moment(latest);
    const lastWeek = {
      isoWeek: latestWeek.isoWeek(),
      year: latestWeek.year(),
    };

    for (let i = startYear; i <= lastWeek.year; i += 1) {
      years.push(i);
    }

    const yearLengths = {};
    years.forEach((y) => {
      if (moment(`${y}-12-31`).isoWeek() === 1) {
        yearLengths[y] = moment(`${y}-12-31`).subtract(1, 'week').isoWeek();
      } else {
        yearLengths[y] = moment(`${y}-12-31`).isoWeek();
      }
    });

    const zeroFilledData = [];

    years.forEach((year) => {
      let countAcc = 0;
      const yearDataByWeek = groupBy(groupedByYear[year], 'week');

      for (let i = 1; i <= yearLengths[year]; i += 1) {
        const alerts = [];
        const yearDataLength = yearDataByWeek[i]
          ? yearDataByWeek[i].length - 1
          : 0;

        for (let index = 0; index <= yearDataLength; index += 1) {
          if (yearDataByWeek[i]) {
            alerts.push(yearDataByWeek[i][index]);
          }
        }

        const allConfidencesAggregated = alerts.reduce(
          (acc, curr) => {
            return {
              ...curr,
              alert__count: acc?.alert__count + curr?.alert__count,
              count: acc?.alert__count + curr?.alert__count,
            };
          },
          { alert__count: 0 }
        );

        const weekData = yearDataByWeek[i]
          ? allConfidencesAggregated
          : { count: 0, week: i, year: parseInt(year, 10), alert__count: 0 };
        countAcc += weekData.count;

        if (parseInt(year, 10) === lastWeek.year && i > lastWeek.isoWeek) {
          zeroFilledData.push({
            ...weekData,
            count: null,
          });
        } else {
          zeroFilledData.push({
            ...weekData,
            count: countAcc,
          });
        }
      }
    });

    return zeroFilledData;
  }
);

export const getStats = createSelector([getData], (data) => {
  if (!data || isEmpty(data)) return null;
  return getCumulativeStatsData(data);
});

export const getDates = createSelector([getStats], (data) => {
  if (!data || isEmpty(data)) return null;
  return getDatesData(data);
});

export const getMaxMinDates = createSelector(
  [getData, getDates],
  (data, currentData) => {
    if (!data || isEmpty(data) || !currentData || isEmpty(currentData))
      return {};
    const minYear = min(data.map((d) => d.year));
    const maxYear = max(data.map((d) => d.year));

    return {
      min: minYear,
      max: maxYear,
    };
  }
);

export const parseData = createSelector(
  [getData, getDates, getMaxMinDates, getCompareYears],
  (data, currentData, maxminYear, compareYears) => {
    if (!data || isEmpty(data) || !currentData || isEmpty(currentData))
      return null;

    return currentData.map((d) => {
      const yearDifference = maxminYear.max - d.year;
      const { week } = d;

      if (compareYears) {
        const compareYearData = compareYears.reduce((acc, year) => {
          const compareWeek = data.find(
            (dt) => dt.year === year - yearDifference && dt.week === week
          );

          return {
            ...acc,
            [year]: compareWeek ? compareWeek.count : null,
          };
        }, {});

        return {
          ...d,
          ...compareYearData,
        };
      }

      return d;
    });
  }
);

export const parseBrushedData = createSelector(
  [parseData, getStartIndex, getEndIndex],
  (data, startIndex, endIndex) => {
    if (!data || isEmpty(data)) return null;

    const start = startIndex || 0;
    const end = endIndex || data.length - 1;

    return data.slice(start, end + 1);
  }
);

export const getLegend = createSelector(
  [parseBrushedData, getColors, getCompareYears, getMaxMinDates],
  (data, colors, compareYears, maxminYear) => {
    if (!data || isEmpty(data)) return {};
    const end = data[data.length - 1];
    const yearsArray =
      compareYears && compareYears.filter((y) => y !== maxminYear.max).sort();
    return {
      current: {
        label: `${moment(end.date).format('YYYY')}`,
        color: colors.main,
      },
      ...(yearsArray && {
        compare: {
          label:
            yearsArray.length > 1
              ? `${yearsArray[0]}-${yearsArray[yearsArray.length - 1]}`
              : `${yearsArray}`,
          color: '#49b5e3',
        },
      }),
      average: {
        label: 'Normal Range',
        color: 'rgba(85,85,85, 0.15)',
      },
      unusual: {
        label: 'Above/Below Normal Range',
        color: 'rgba(85,85,85, 0.25)',
      },
    };
  }
);

export const parseConfig = createSelector(
  [
    getDates,
    getLegend,
    getColors,
    getLatest,
    getMaxMinDates,
    getCompareYears,
    getDataset,
    getStartIndex,
    getEndIndex,
  ],
  (
    currentData,
    legend,
    colors,
    latest,
    maxminYear,
    compareYears,
    dataset,
    startIndex,
    endIndex
  ) => {
    if (!currentData || isEmpty(currentData)) return null;
    const tooltip = [
      {
        key: 'count',
        labelKey: 'date',
        labelFormat: (value) => moment(value).format('MMM DD YYYY'),
        unit: ` ${dataset.toUpperCase()} alert`,
        color: colors.main,
        nullValue: 'No data available',
        unitFormat: (value) => Number.isInteger(value) && format(',')(value),
      },
    ];
    const compareYearsLines = {};
    if (compareYears && compareYears.length > 0) {
      const colorRange = getColorPalette(
        colors.compareYearRamp,
        compareYears.length
      );
      const yearsArray = compareYears
        .filter((y) => y !== maxminYear.max)
        .sort()
        .reverse();
      yearsArray.forEach((year, i) => {
        tooltip.push({
          key: year,
          labelKey: 'date',
          labelFormat: (value) => {
            const date = moment(value);
            const yearDifference = maxminYear.max - date.year();
            date.set('year', year - yearDifference);

            return date.format('MMM DD YYYY');
          },
          unit: ` ${dataset.toUpperCase()} alerts`,
          color: compareYears.length === 1 ? colors.compareYear : colorRange[i],
          nullValue: 'No data available',
          unitFormat: (value) => Number.isInteger(value) && format(',')(value),
        });
        compareYearsLines[year] = {
          stroke:
            compareYears.length === 1 ? colors.compareYear : colorRange[i],
          isAnimationActive: false,
        };
      });
    }
    const presentDayIndex = findLastIndex(
      currentData,
      (d) => typeof d.count === 'number'
    );
    const presentDay = currentData[presentDayIndex].date;
    return {
      ...getChartConfig(colors, moment(latest), compareYearsLines, ''),
      xAxis: {
        tickCount: 12,
        interval: 4,
        scale: 'point',
        tickFormatter: (t) => moment(t).format('MMM'),
        ...(typeof endIndex === 'number' &&
          typeof startIndex === 'number' &&
          endIndex - startIndex < 12 && {
            tickCount: 5,
            interval: 0,
            tickFormatter: (t) => moment(t).format('MMM-DD'),
          }),
      },
      legend,
      tooltip: [...tooltip],
      tooltipParseData: ({ settings, values }) => {
        const sorted =
          settings &&
          values &&
          settings.sort((a, b) => values[a.key] - values[b.key]).reverse();
        return Array.isArray(sorted)
          ? [
              {
                label: 'Fire alerts',
              },
              ...sorted,
            ]
          : [
              {
                label: 'Fire alerts',
              },
            ];
      },
      referenceLine: {
        x: presentDay,
        stroke: '#CCC',
        strokeWidth: 2,
        strokeDasharray: '20 5',
        label: {
          position: 'top',
          value: 'Latest data',
          fill: '#333',
          fontSize: 11,
        },
      },
      brush: {
        width: '100%',
        height: 60,
        margin: {
          top: 0,
          right: 10,
          left: 48,
          bottom: 12,
        },
        minimumGap: 4,
        dataKey: 'date',
        startIndex,
        endIndex,
        config: {
          margin: {
            top: 5,
            right: 0,
            left: 42,
            bottom: 20,
          },
          yKeys: {
            lines: {
              count: {
                stroke: colors.main,
                isAnimationActive: false,
              },
              compareCount: {
                stroke: '#49b5e3',
                isAnimationActive: false,
              },
              ...(Object.keys(compareYearsLines).length, compareYearsLines),
            },
          },
          xAxis: {
            hide: true,
          },
          yAxis: {
            hide: true,
          },
          cartesianGrid: {
            horizontal: false,
            vertical: false,
          },
          height: 60,
        },
      },
    };
  }
);

export const parseSentence = createSelector(
  [
    getData,
    parseData,
    getColors,
    getSentences,
    getDataset,
    getLocationName,
    getStartIndex,
    getOptionsSelected,
    getIndicator,
    getSettings,
    getLanguage,
  ],
  (
    raw_data,
    data,
    colors,
    sentences,
    dataset,
    location,
    startIndex,
    options,
    indicator,
    settings,
    language
  ) => {
    if (!data || isEmpty(data)) return null;

    const {
      highConfidence,
      allAlerts,
      highConfidenceWithInd,
      allAlertsWithInd,
    } = sentences;
    const { confidenceToggle } = settings;
    let { confidence } = options;

    /*
      Validation for the Analysis
    */
    if (confidenceToggle) {
      confidence =
        confidenceToggle === 'true' ? { value: 'h' } : { value: 'all' };
    }

    const indicatorLabel =
      indicator && indicator.label ? indicator.label : null;
    const start = startIndex;
    const latestYear = maxBy(data, 'year').year;
    const lastDate =
      maxBy(
        data.filter((d) => d.year === latestYear && d.count !== null),
        'date'
      ) || {};
    const firstDate = data[start] || {};

    const slicedData = data.filter(
      (el) => el.date >= firstDate.date && el.date <= lastDate.date
    );

    const maxWeek = maxBy(raw_data, 'count');
    const maxTotal = maxWeek.count;
    const maxYear = maxWeek.year;
    const maxCountCurrentYear =
      slicedData.length > 0 ? slicedData[slicedData.length - 1] : [];
    const totalCurrentYear =
      maxCountCurrentYear && maxCountCurrentYear.count
        ? maxCountCurrentYear.count
        : 0;
    const mean =
      maxCountCurrentYear && maxCountCurrentYear.mean
        ? maxCountCurrentYear.mean
        : 0;
    const stdDev =
      maxCountCurrentYear && maxCountCurrentYear.stdDev
        ? maxCountCurrentYear.stdDev
        : 0;

    const colorRange = colors.ramp;
    let statusColor = colorRange[8];
    const { date } = lastDate || {};

    let status = 'unusually low';
    if (totalCurrentYear > 2 * stdDev + mean) {
      status = 'unusually high';
      statusColor = colorRange[0];
    } else if (
      totalCurrentYear <= 2 * stdDev + mean &&
      totalCurrentYear > 1 * stdDev + mean
    ) {
      status = 'high';
      statusColor = colorRange[2];
    } else if (
      totalCurrentYear <= 1 * stdDev + mean &&
      totalCurrentYear > -1 * stdDev + mean
    ) {
      status = 'normal';
      statusColor = colorRange[4];
    } else if (
      totalCurrentYear <= -1 * stdDev + mean &&
      totalCurrentYear > -2 * stdDev + mean
    ) {
      status = 'low';
      statusColor = colorRange[6];
    }

    let sentence =
      confidence && confidence.value === 'h' ? highConfidence : allAlerts;
    if (indicator) {
      sentence =
        confidence && confidence.value === 'h'
          ? highConfidenceWithInd
          : allAlertsWithInd;
    }

    const params = {
      location,
      indicator: indicatorLabel,
      date: localizeWidgetSentenceDate(date, language),
      latestYear,
      dataset_start_year: dataset === 'viirs' ? 2012 : 2001,
      maxYear,
      maxTotal: {
        value: maxTotal ? format(',')(maxTotal) : 0,
        color: colors.main,
      },
      dataset: dataset.toUpperCase(),
      count: {
        value: totalCurrentYear ? format(',')(totalCurrentYear) : 0,
        color: colors.main,
      },
      status: {
        value: status,
        color: statusColor,
      },
    };
    return { sentence, params };
  }
);

export default createStructuredSelector({
  originalData: parseData,
  data: parseBrushedData,
  config: parseConfig,
  sentence: parseSentence,
});
