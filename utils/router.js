import Router from 'next/router';
import qs from 'query-string';

import { decodeParamsForState, encodeStateForUrl } from './stateToUrl';

const useRouter = () => {
  const router = Router.router || {};

  if (router) {
    if (router?.asPath?.includes('?')) {
      router.query = {
        ...router.query,
        ...qs.parse(router.asPath.split('?')[1]),
      };
    }

    router.query = router.query ? decodeParamsForState(router.query) : {};
  }

  router.pushQuery = ({ pathname, query, hash, options }) => {
    const queryWithoutLocation = { ...query, location: null };
    const queryString =
      queryWithoutLocation &&
      encodeStateForUrl(queryWithoutLocation, {
        skipNull: true,
        skipEmptyString: true,
        arrayFormat: 'comma',
      });

    router.push(
      `${pathname}${queryString ? `?${queryString}` : ''}${hash || ''}`,
      options
    );
  };

  return { ...Router, ...router };
};

export default useRouter;
