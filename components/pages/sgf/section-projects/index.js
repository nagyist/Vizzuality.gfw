import { createElement, PureComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { scroller } from 'react-scroll';
import reducerRegistry from 'redux/registry';

import * as modalActions from 'components/pages/sgf/section-projects/section-projects-modal/actions';
import * as actions from './actions';

import reducers, { initialState } from './reducers';
import SectionProjectsComponent from './component';
import {
  getCategoriesList,
  getProjectsList,
  getGlobeClusters,
} from './selectors';

const mapStateToProps = ({ sgfProjects }, { projects, images, latLngs }) => {
  const filters = sgfProjects?.customFilter;
  const projectData = {
    data: projects,
    latLngs,
    images,
    search: sgfProjects?.search,
    categorySelected: sgfProjects?.categorySelected,
    customFilter: filters,
  };

  return {
    data: getProjectsList(projectData),
    globeData: getGlobeClusters(projectData),
    categories: getCategoriesList(projectData),
    categorySelected:
      filters && filters.length
        ? ''
        : sgfProjects && sgfProjects.categorySelected,
    search: sgfProjects && sgfProjects.search,
    customFilter: sgfProjects && sgfProjects.customFilter,
  };
};

class SectionProjectsContainer extends PureComponent {
  static propTypes = {
    setCustomFilter: PropTypes.func,
    setSectionProjectsModalSlug: PropTypes.func,
  };

  handleOpenModal = (slug) => {
    this.props.setSectionProjectsModalSlug(slug);
  };

  handleGlobeClick = (d) => {
    const { setCustomFilter } = this.props;
    if (!d?.cluster || d?.cluster?.length === 1) {
      this.handleOpenModal(d.id || (d?.cluster && d?.cluster?.[0].id));
    } else {
      const projectIds = d.cluster.map((p) => p.id);
      setCustomFilter(projectIds);
      scroller.scrollTo('project-cards', {
        duration: 800,
        smooth: true,
        offset: -50,
      });
    }
  };

  render() {
    return createElement(SectionProjectsComponent, {
      ...this.props,
      handleGlobeClick: this.handleGlobeClick,
      handleOpenModal: this.handleOpenModal,
    });
  }
}

reducerRegistry.registerModule('sgfProjects', {
  actions,
  reducers,
  initialState,
});

export default connect(mapStateToProps, { ...actions, ...modalActions })(
  SectionProjectsContainer
);
