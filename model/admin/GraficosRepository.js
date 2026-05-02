import { SYSTEM_MESSAGES } from "../SystemMessages.js";
import { adminRequest } from "./AdminRequest.js";

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && `${value}`.trim() !== "") {
      query.set(key, value);
    }
  });
  return query.toString();
}

export async function obterVendasGrafico(params = {}) {
  const query = buildQuery(params);
  const response = await adminRequest(`/api/admin/graficos/vendas${query ? `?${query}` : ""}`, {
    method: "GET"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || SYSTEM_MESSAGES.admin.errors.loadGraficosFailed;
    throw new Error(message);
  }
  return payload;
}
