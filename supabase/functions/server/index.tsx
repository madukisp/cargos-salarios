import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-068aaf90/health", (c) => {
  return c.json({ status: "ok" });
});

// Dashboard stats endpoint
app.get("/make-server-068aaf90/dashboard/stats", async (c) => {
  try {
    const stats = await kv.get("dashboard_stats");
    
    if (!stats) {
      // Initialize with default data
      const defaultStats = {
        totalTlp: 1245,
        totalAtivos: 1198,
        saldoVagas: -47,
        vagasAbertas: 68,
        updatedAt: new Date().toISOString()
      };
      await kv.set("dashboard_stats", defaultStats);
      return c.json(defaultStats);
    }
    
    return c.json(stats);
  } catch (error) {
    console.log("Error fetching dashboard stats:", error);
    return c.json({ error: "Failed to fetch stats" }, 500);
  }
});

// Get all TLP data
app.get("/make-server-068aaf90/tlp", async (c) => {
  try {
    const tlpData = await kv.getByPrefix("tlp:");
    return c.json(tlpData || []);
  } catch (error) {
    console.log("Error fetching TLP data:", error);
    return c.json({ error: "Failed to fetch TLP data" }, 500);
  }
});

// Create or update TLP entry
app.post("/make-server-068aaf90/tlp", async (c) => {
  try {
    const data = await c.req.json();
    const key = `tlp:${data.cargo}-${data.unidade}`;
    await kv.set(key, data);
    return c.json({ success: true, data });
  } catch (error) {
    console.log("Error saving TLP data:", error);
    return c.json({ error: "Failed to save TLP data" }, 500);
  }
});

// Get all vacancies
app.get("/make-server-068aaf90/vacancies", async (c) => {
  try {
    const vacancies = await kv.getByPrefix("vacancy:");
    return c.json(vacancies || []);
  } catch (error) {
    console.log("Error fetching vacancies:", error);
    return c.json({ error: "Failed to fetch vacancies" }, 500);
  }
});

// Create vacancy
app.post("/make-server-068aaf90/vacancies", async (c) => {
  try {
    const data = await c.req.json();
    const id = `V${String(Date.now()).slice(-6)}`;
    const vacancy = { ...data, id, dataAbertura: new Date().toISOString() };
    await kv.set(`vacancy:${id}`, vacancy);
    return c.json({ success: true, data: vacancy });
  } catch (error) {
    console.log("Error creating vacancy:", error);
    return c.json({ error: "Failed to create vacancy" }, 500);
  }
});

// Update vacancy
app.put("/make-server-068aaf90/vacancies/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    await kv.set(`vacancy:${id}`, { ...data, id });
    return c.json({ success: true, data: { ...data, id } });
  } catch (error) {
    console.log("Error updating vacancy:", error);
    return c.json({ error: "Failed to update vacancy" }, 500);
  }
});

// Get all requisitions
app.get("/make-server-068aaf90/requisitions", async (c) => {
  try {
    const requisitions = await kv.getByPrefix("requisition:");
    return c.json(requisitions || []);
  } catch (error) {
    console.log("Error fetching requisitions:", error);
    return c.json({ error: "Failed to fetch requisitions" }, 500);
  }
});

// Create requisition
app.post("/make-server-068aaf90/requisitions", async (c) => {
  try {
    const data = await c.req.json();
    const id = `REQ${String(Date.now()).slice(-6)}`;
    const requisition = { 
      ...data, 
      id, 
      status: 'pendente',
      dataSolicitacao: new Date().toISOString() 
    };
    await kv.set(`requisition:${id}`, requisition);
    return c.json({ success: true, data: requisition });
  } catch (error) {
    console.log("Error creating requisition:", error);
    return c.json({ error: "Failed to create requisition" }, 500);
  }
});

// Update requisition (approve/reject)
app.put("/make-server-068aaf90/requisitions/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    await kv.set(`requisition:${id}`, { ...data, id });
    return c.json({ success: true, data: { ...data, id } });
  } catch (error) {
    console.log("Error updating requisition:", error);
    return c.json({ error: "Failed to update requisition" }, 500);
  }
});

// Initialize database with sample data
app.post("/make-server-068aaf90/init-data", async (c) => {
  try {
    // Initialize TLP data
    const tlpSampleData = [
      { cargo: 'Enfermeiro', unidade: 'UPA Central', tlp: 25, ativos: 22, saldo: -3, status: 'deficit' },
      { cargo: 'Médico Clínico', unidade: 'Hospital Geral', tlp: 45, ativos: 42, saldo: -3, status: 'deficit' },
      { cargo: 'Técnico Enfermagem', unidade: 'UBS Norte', tlp: 18, ativos: 20, saldo: 2, status: 'excedente' },
    ];

    for (const item of tlpSampleData) {
      await kv.set(`tlp:${item.cargo}-${item.unidade}`, item);
    }

    return c.json({ success: true, message: "Database initialized with sample data" });
  } catch (error) {
    console.log("Error initializing data:", error);
    return c.json({ error: "Failed to initialize data" }, 500);
  }
});

Deno.serve(app.fetch);