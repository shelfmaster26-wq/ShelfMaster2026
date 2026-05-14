let config = {
  ip: localStorage.getItem("server_ip") || "",
  port: localStorage.getItem("server_port") || "5000"
};

export function setConnection(ip, port) {
  config.ip = ip;
  config.port = port;

  localStorage.setItem("server_ip", ip);
  localStorage.setItem("server_port", port);
}

export function getConnection() {
  return config;
}

export function getBaseURL() {
  if (!config.ip) return '';
  return `http://${config.ip}:${config.port}`;
}
