import { json } from "@tanstack/react-start";
import { createAPIFileRoute } from "@tanstack/react-start/api";

export const APIRoute = createAPIFileRoute("/api/config")({
  GET: () => {
    return json({
      apiUrl: process.env.API_URL || "http://localhost:3001",
    });
  },
});
