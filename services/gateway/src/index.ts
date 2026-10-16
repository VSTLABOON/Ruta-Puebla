import Fastify from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';

const fastify = Fastify({
  logger: true
});

await fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

const ROUTE_SVC_URL = process.env.ROUTE_SVC_URL || 'http://localhost:8001';
const ACCESS_SVC_URL = process.env.ACCESS_SVC_URL || 'http://localhost:8002';
const RECOMMEND_SVC_URL = process.env.RECOMMEND_SVC_URL || 'http://localhost:8003';

// Esquemas de validacion con Zod
const RouteRequestSchema = z.object({
  profile: z.enum(['sin_restriccion', 'movilidad_reducida', 'silla_de_ruedas']),
  max_time_min: z.number().int().min(30).max(480).default(180),
  max_budget_mxn: z.number().min(0).default(200),
  interests: z.array(z.string()).default([]),
  free_text: z.string().optional(),
  language: z.enum(['es', 'en']).default('es'),
  start_poi_id: z.string().default('poi_catedral'),
  balance_local_pct: z.number().int().min(0).max(100).default(50)
});

// 1. Health general del Gateway
fastify.get('/health', async () => {
  return {
    status: 'healthy',
    service: 'api-gateway',
    upstream_services: {
      route: ROUTE_SVC_URL,
      accessibility: ACCESS_SVC_URL,
      recommend: RECOMMEND_SVC_URL
    }
  };
});

// 2. Rutas Peatonales
fastify.post('/v1/routes/generate', async (request, reply) => {
  const parsed = RouteRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      error: 'Parametros de ruta invalidos',
      details: parsed.error.format()
    });
  }

  try {
    const upstreamRes = await fetch(`${ROUTE_SVC_URL}/v1/routes/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data)
    });
    const data = await upstreamRes.json();
    return reply.status(upstreamRes.status).send(data);
  } catch (err: any) {
    fastify.log.error(err);
    return reply.status(502).send({ error: 'Fallo de comunicacion con route-service' });
  }
});

// 3. Accesibilidad
fastify.get('/v1/accessibility/segments', async (request, reply) => {
  try {
    const url = new URL(`${ACCESS_SVC_URL}/v1/accessibility/segments`);
    const q = request.query as Record<string, string>;
    for (const [k, v] of Object.entries(q)) {
      url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString());
    const data = await res.json();
    return reply.status(res.status).send(data);
  } catch (err) {
    fastify.log.error(err);
    return reply.status(502).send({ error: 'Fallo de comunicacion con accessibility-service' });
  }
});

fastify.get('/v1/accessibility/barriers/ranking', async (request, reply) => {
  try {
    const url = new URL(`${ACCESS_SVC_URL}/v1/accessibility/barriers/ranking`);
    const q = request.query as Record<string, string>;
    for (const [k, v] of Object.entries(q)) {
      url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString());
    const data = await res.json();
    return reply.status(res.status).send(data);
  } catch (err) {
    fastify.log.error(err);
    return reply.status(502).send({ error: 'Fallo de comunicacion con accessibility-service' });
  }
});

// 4. Recomendacion y Cupos
fastify.post('/v1/interests/match', async (request, reply) => {
  try {
    const res = await fetch(`${RECOMMEND_SVC_URL}/v1/interests/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.body)
    });
    const data = await res.json();
    return reply.status(res.status).send(data);
  } catch (err) {
    fastify.log.error(err);
    return reply.status(502).send({ error: 'Fallo de comunicacion con recommend-service' });
  }
});

fastify.get('/v1/choice/weights', async (_request, reply) => {
  try {
    const res = await fetch(`${RECOMMEND_SVC_URL}/v1/choice/weights`);
    const data = await res.json();
    return reply.status(res.status).send(data);
  } catch (err) {
    fastify.log.error(err);
    return reply.status(502).send({ error: 'Fallo de comunicacion con recommend-service' });
  }
});

fastify.post('/v1/cultural/query', async (request, reply) => {
  try {
    const res = await fetch(`${RECOMMEND_SVC_URL}/v1/cultural/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.body)
    });
    const data = await res.json();
    return reply.status(res.status).send(data);
  } catch (err) {
    fastify.log.error(err);
    return reply.status(502).send({ error: 'Fallo de comunicacion con recommend-service' });
  }
});

fastify.get('/v1/zones/caps', async (_request, reply) => {
  try {
    const res = await fetch(`${RECOMMEND_SVC_URL}/v1/zones/caps`);
    const data = await res.json();
    return reply.status(res.status).send(data);
  } catch (err) {
    fastify.log.error(err);
    return reply.status(502).send({ error: 'Fallo de comunicacion con recommend-service' });
  }
});

fastify.put('/v1/zones/caps', async (request, reply) => {
  try {
    const res = await fetch(`${RECOMMEND_SVC_URL}/v1/zones/caps`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.body)
    });
    const data = await res.json();
    return reply.status(res.status).send(data);
  } catch (err) {
    fastify.log.error(err);
    return reply.status(502).send({ error: 'Fallo de comunicacion con recommend-service' });
  }
});

const port = Number(process.env.PORT) || 8000;
try {
  await fastify.listen({ port, host: '0.0.0.0' });
  console.log(`API Gateway escuchando en el puerto ${port}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
