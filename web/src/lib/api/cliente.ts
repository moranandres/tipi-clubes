import createClient from "openapi-fetch";
import type { components, paths } from "./tipos-api";

export type Esquemas = components["schemas"];

export const URL_API =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export const api = createClient<paths>({ baseUrl: URL_API });
