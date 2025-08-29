import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

const app = new Hono();

app.use("*", cors());

// Health checks on both / and /api (since Vercel keeps the /api prefix)
app.get("/", (c) => c.json({ status: "ok", message: "API is running" }));
app.get("/api", (c) => c.json({ status: "ok", message: "API is running" }));

// Mount tRPC under /api/trpc to match vercel.json rewrite
// Ensure both "/api/trpc" and "/api/trpc/*" are handled to avoid 404 on the base endpoint
app.use(
  "/api/trpc",
  trpcServer({
    router: appRouter,
    createContext,
    endpoint: "/api/trpc",
  })
);
app.use(
  "/api/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
    endpoint: "/api/trpc",
  })
);

app.all("*", (c) => c.json({ error: "Route not found" }, 404));

export default app;