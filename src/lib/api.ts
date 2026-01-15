const DEFAULT_API_BASE_URL = "http://localhost:3001";
const DEFAULT_GRPC_ADDRESS = "localhost:50051";
let configPromise: Promise<{ apiBaseUrl: string; grpcAddress: string }> | null =
	null;

async function getConfig(): Promise<{
	apiBaseUrl: string;
	grpcAddress: string;
}> {
	if (import.meta.env.VITE_API_URL) {
		return {
			apiBaseUrl: import.meta.env.VITE_API_URL,
			grpcAddress: DEFAULT_GRPC_ADDRESS,
		};
	}

	if (!configPromise) {
		const configHost =
			window.location.port === "3000"
				? `http://${window.location.hostname}:3001`
				: window.location.origin;
		const configUrl = `${configHost}/config`;

		configPromise = fetch(configUrl)
			.then(async (response) => {
				if (!response.ok) {
					throw new Error("Failed to load config");
				}
				const config = await response.json();
				return {
					apiBaseUrl:
						typeof config?.apiBaseUrl === "string"
							? config.apiBaseUrl
							: DEFAULT_API_BASE_URL,
					grpcAddress:
						typeof config?.grpcAddress === "string"
							? config.grpcAddress
							: DEFAULT_GRPC_ADDRESS,
				};
			})
			.catch(() => ({
				apiBaseUrl: DEFAULT_API_BASE_URL,
				grpcAddress: DEFAULT_GRPC_ADDRESS,
			}));
	}

	return configPromise;
}

async function getApiBaseUrl(): Promise<string> {
	const config = await getConfig();
	return config.apiBaseUrl;
}

export async function getGrpcAddress(): Promise<string> {
	const config = await getConfig();
	return config.grpcAddress;
}

export interface Instance {
	id: string;
	name: string;
	enrollmentCode: string | null;
	enrolledAt: number | null;
	status: "online" | "offline" | "error";
	lastSeen: number | null;
	createdAt: number;
	updatedAt: number;
}

export interface EnrollmentCode {
	id: string;
	code: string;
	instanceId: string | null;
	createdAt: number;
	expiresAt: number;
	usedAt: number | null;
	deactivatedAt: number | null;
}

export interface SystemInfo {
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
}

export interface AvailableUpdate {
	id: string;
	instanceId: string;
	updateType: "core" | "os" | "supervisor" | "addon";
	slug: string | null;
	name: string | null; // Only for addons
	icon: string | null; // Only for addons
	version: string | null;
	versionLatest: string | null;
	updateAvailable: number | null;
	reportGeneratedAt: number | null;
	panelPath: string | null;
	createdAt: number;
}

export interface Heartbeat {
	id: string;
	instanceId: string;
	timestamp: number;
	status: string;
	latencyMs: number | null;
}

async function fetchAPI<T>(
	endpoint: string,
	options?: RequestInit,
): Promise<T> {
	const apiBaseUrl = await getApiBaseUrl();
	const response = await fetch(`${apiBaseUrl}${endpoint}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...options?.headers,
		},
	});

	if (!response.ok) {
		const error = await response
			.json()
			.catch(() => ({ message: response.statusText }));
		throw new Error(error.message || `HTTP error! status: ${response.status}`);
	}

	return response.json();
}

export async function getInstances(): Promise<Instance[]> {
	return fetchAPI<Instance[]>("/instances");
}

export async function getInstance(id: string): Promise<Instance> {
	return fetchAPI<Instance>(`/instances/${id}`);
}

export async function getInstanceSystemInfo(
	id: string,
): Promise<SystemInfo | null> {
	return fetchAPI<SystemInfo | null>(`/instances/${id}/system-info`);
}

export async function getInstanceUpdates(
	id: string,
): Promise<AvailableUpdate[]> {
	return fetchAPI<AvailableUpdate[]>(`/instances/${id}/updates`);
}

export async function triggerUpdate(
	instanceId: string,
	updateType: string,
	addonSlug?: string,
): Promise<{ message: string }> {
	return fetchAPI(`/instances/${instanceId}/trigger-update`, {
		method: "POST",
		body: JSON.stringify({ updateType, addonSlug }),
	});
}

export async function getInstanceHeartbeats(
	id: string,
	limit: number = 100,
): Promise<Heartbeat[]> {
	return fetchAPI<Heartbeat[]>(`/instances/${id}/heartbeats?limit=${limit}`);
}

export async function getEnrollmentCodes(
	all: boolean = true,
): Promise<EnrollmentCode[]> {
	return fetchAPI<EnrollmentCode[]>(
		`/enrollment-codes${all ? "?all=true" : ""}`,
	);
}

export async function createEnrollmentCode(): Promise<EnrollmentCode> {
	return fetchAPI<EnrollmentCode>("/enrollment-codes", {
		method: "POST",
	});
}

export async function deleteInstance(id: string): Promise<{ message: string }> {
	return fetchAPI(`/instances/${id}`, {
		method: "DELETE",
	});
}

export async function deactivateEnrollmentCode(
	id: string,
): Promise<{ deactivated: boolean }> {
	return fetchAPI(`/enrollment-codes/${id}/deactivate`, {
		method: "POST",
	});
}
