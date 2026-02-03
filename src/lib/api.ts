import createFetchClient from "openapi-fetch";
import createClient from "openapi-react-query";
import type { paths } from "./generated/api-schema";

const DEFAULT_API_BASE_URL = "http://localhost:3001";
const apiUrl = process.env.API_URL || DEFAULT_API_BASE_URL;
const fetchClient = createFetchClient<paths>({
	baseUrl: apiUrl,
});

export const api = createClient(fetchClient);

export type Instance =
	paths["/instances/{id}"]["get"]["responses"]["200"]["content"]["application/json"];
// openapi-typescript currently outputs `unknown` for system-info anyOf.
// Keep this aligned with the spec until it resolves to a concrete type.
export type SystemInfo = {
	id: string;
	instanceId: string;
	supervisor: string | null;
	homeassistant: string | null;
	hassos: string | null;
	docker: string | null;
	hostname: string | null;
	operatingSystem: string | null;
	machine: string | null;
	arch: string | null;
	channel: string | null;
	state: string | null;
	updatedAt: number;
};
export type AvailableUpdate =
	paths["/instances/{id}/updates"]["get"]["responses"]["200"]["content"]["application/json"][number];
export type Heartbeat =
	paths["/instances/{id}/heartbeats"]["get"]["responses"]["200"]["content"]["application/json"][number];
export type ConnectivityCheck =
	paths["/instances/{id}/connectivity"]["get"]["responses"]["200"]["content"]["application/json"][number];
export type EnrollmentCode =
	paths["/enrollment-codes"]["get"]["responses"]["200"]["content"]["application/json"][number];
export type TriggerUpdateBody =
	NonNullable<
		paths["/instances/{id}/trigger-update"]["post"]["requestBody"]
	>["content"]["application/json"];
export type TriggerUpdateResult =
	paths["/instances/{id}/trigger-update"]["post"]["responses"]["200"]["content"]["application/json"];
export type DeleteInstanceResult =
	paths["/instances/{id}"]["delete"]["responses"]["200"]["content"]["application/json"];
export type ConfigResponse =
	paths["/config"]["get"]["responses"]["200"]["content"]["application/json"];
