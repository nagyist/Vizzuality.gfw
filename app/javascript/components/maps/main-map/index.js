import { createElement, PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import isEqual from 'lodash/isEqual';
import isEmpty from 'lodash/isEmpty';
import flatMap from 'lodash/flatMap';
import moment from 'moment';
import startCase from 'lodash/startCase';
import { format } from 'd3-format';
import { track } from 'app/analytics';

import { setRecentImagerySettings } from 'components/maps/main-map/components/recent-imagery/recent-imagery-actions';
import { setMenuSettings } from 'components/maps/components/menu/menu-actions';
import * as ownActions from './actions';
import { getMapProps } from './selectors';
import MapComponent from './component';

const actions = {
  setRecentImagerySettings,
  setMenuSettings,
  ...ownActions
};

class MainMapContainer extends PureComponent {
  state = {
    showTooltip: false,
    tooltipData: {}
  };

  componentDidMount() {
    const { activeDatasets } = this.props;
    const layerIds = flatMap(activeDatasets.map(d => d.layers));
    track('mapInitialLayers', {
      label: layerIds && layerIds.join(', ')
    });
  }

  componentDidUpdate(prevProps) {
    const {
      selectedInteraction,
      setMainMapAnalysisView,
      oneClickAnalysis
    } = this.props;

    // set analysis view if interaction changes
    if (
      oneClickAnalysis &&
      selectedInteraction &&
      !isEmpty(selectedInteraction.data) &&
      !isEqual(selectedInteraction, prevProps.selectedInteraction)
    ) {
      setMainMapAnalysisView(selectedInteraction);
    }
  }

  handleShowTooltip = (show, data) => {
    this.setState({ showTooltip: show, tooltipData: data });
  };

  handleRecentImageryTooltip = e => {
    const data = e.layer.feature.properties;
    const { cloudScore, instrument, dateTime } = data;
    this.handleShowTooltip(true, {
      instrument: startCase(instrument),
      date: moment(dateTime)
        .format('DD MMM YYYY, HH:mm')
        .toUpperCase(),
      cloudCoverage: `${format('.0f')(cloudScore)}%`
    });
  };

  handleClickMap = () => {
    if (this.props.menuSection) {
      this.props.setMenuSettings({ menuSection: '' });
    }
  };

  render() {
    return createElement(MapComponent, {
      ...this.props,
      ...this.state,
      handleShowTooltip: this.handleShowTooltip,
      handleRecentImageryTooltip: this.handleRecentImageryTooltip,
      handleClickMap: this.handleClickMap
    });
  }
}

MainMapContainer.propTypes = {
  oneClickAnalysis: PropTypes.bool,
  setMainMapAnalysisView: PropTypes.func,
  selectedInteraction: PropTypes.object,
  setMenuSettings: PropTypes.func,
  activeDatasets: PropTypes.array,
  menuSection: PropTypes.string
};

export default connect(getMapProps, actions)(MainMapContainer);
