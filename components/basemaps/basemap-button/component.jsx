import cx from 'classnames';
import PropTypes from 'prop-types';

import Image from 'next/image';

export const BasemapButton = (props) => {
  const { image, label, active, onSelectBasemap } = props;

  return (
    <button className="c-basemap-button" onClick={() => onSelectBasemap(props)}>
      <Image
        src={image}
        alt={label}
        className={cx('basemap-thumb', { '-active': active })}
      />
      <span>{label}</span>
    </button>
  );
};

BasemapButton.propTypes = {
  image: PropTypes.string,
  label: PropTypes.string,
  active: PropTypes.bool,
  onSelectBasemap: PropTypes.func,
};

export default BasemapButton;
