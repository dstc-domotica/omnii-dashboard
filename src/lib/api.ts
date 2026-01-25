import createFetchClient from "openapi-fetch";
import createClient from "openapi-react-query";
import type { paths } from "./generated/api-schema";

const DEFAULT_API_BASE_URL = "http://localhost:3001";
const rawApiUrl = process.env.API_URL || DEFAULT_API_BASE_URL;
const fetchClient = createFetchClient<paths>({
	baseUrl: rawApiUrl,
});

export const api = createClient(fetchClient);

export type Instance =
	paths["/v1/instances/{id}"]["get"]["responses"]["200"]["content"]["application/json"];
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
	paths["/v1/instances/{id}/updates"]["get"]["responses"]["200"]["content"]["application/json"][number];
export type Heartbeat =
	paths["/v1/instances/{id}/heartbeats"]["get"]["responses"]["200"]["content"]["application/json"][number];
export type EnrollmentCode =
	paths["/v1/enrollment-codes"]["get"]["responses"]["200"]["content"]["application/json"][number];
export type TriggerUpdateBody =
	NonNullable<
		paths["/v1/instances/{id}/trigger-update"]["post"]["requestBody"]
	>["content"]["application/json"];
export type TriggerUpdateResult =
	paths["/v1/instances/{id}/trigger-update"]["post"]["responses"]["200"]["content"]["application/json"];
export type DeleteInstanceResult =
	paths["/v1/instances/{id}"]["delete"]["responses"]["200"]["content"]["application/json"];
export type ConfigResponse =
	paths["/v1/config"]["get"]["responses"]["200"]["content"]["application/json"];
