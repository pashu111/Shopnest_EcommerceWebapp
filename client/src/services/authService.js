import API from "./api";

export const loginAPI = (data) =>
  API.post("/auth/login", data);

export const registerAPI = (data) =>
  API.post("/auth/register", data);
