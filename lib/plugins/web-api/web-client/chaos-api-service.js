import axios from "axios";
import AuthService from "./auth/auth-service.js";

const request = async (method, path, data = undefined) => {
  const response = await axios({
    method: method,
    url: path,
    data: data,
    headers: { authorization: `bearer ${AuthService.getJwt()}` }
  });

  return response.data;
};

const get = (path) => request("GET", path);
const post = (path, data) => request("POST", path, data);

const ChaosApiService = {
  login: ({ code }) => post('/api/login', { code }),

  guilds: {
    get: () => get('/api/guilds'),
  }
};

export default ChaosApiService;