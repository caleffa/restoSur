import http from './http';

export async function getSystemTexts(language) {
  const { data } = await http.get('/system-texts', {
    params: { lang: language },
  });
  return data?.data || {};
}
