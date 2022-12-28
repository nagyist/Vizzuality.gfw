import apiFetch from '@wordpress/api-fetch';
import axios from 'axios';

apiFetch.setFetchHandler(async (options) => {
  const headers = { 'Content-Type': 'application/json' };

  const { url, path, data, method, params } = options;

  return axios({
    headers,
    url: url || path,
    method,
    data,
    params,
  });
});

export async function getSGFProjectsTab({
  cancelToken,
  params,
  allLanguages,
} = {}) {
  const GFInfoData = await apiFetch({
    url: `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp/v2/pages?slug=grants-and-fellowships`,
    params: {
      ...params,
      _embed: true,
      ...(!allLanguages && {
        lang: 'en',
      }),
    },
    cancelToken,
  });

  const projects = GFInfoData?.data?.map((d) => {
    return {
      id: d.id,
      title: d.acf.projects_title,
      description: d.acf.projects_description,
    };
  });

  console.log({ projects });

  return projects;
}
