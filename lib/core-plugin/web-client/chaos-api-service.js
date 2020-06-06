import axios from 'axios';

import {UserService} from './user';

const request = async (method, path, data = undefined) => {
  const response = await axios({
    method: method,
    url: path,
    data: data,
    headers: { authorization: `bearer ${UserService.getJwt()}` }
  });

  return response.data;
};

const get = (path) => request("GET", path);
const post = (path, data) => request("POST", path, data);

const ChaosApiService = {
  login: ({code}) => post('/api/login', {code}),

  guilds: {
    get: () => get('/api/guilds')
      .then((data) => data.guilds),
  },

  guild: (guildId) => ({
    get: () => get(`/api/guilds/${guildId}`)
      .then((data) => data.guild),
    getPlugins: () => get(`/api/guilds/${guildId}/plugins`)
      .then((data) => data.plugins),
  }),
};

export default ChaosApiService;