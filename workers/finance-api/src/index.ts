import {
  handleCorsPreflight,
  rejectUntrustedStateChange,
  withCors,
} from '../../../shared/cors';

const cors = {
  allowedOrigins: ['https://f.catstarry.xyz'],
} as const;

export default {
  async fetch(request): Promise<Response> {
    const preflight = handleCorsPreflight(request, cors);
    if (preflight) return preflight;

    const originRejection = rejectUntrustedStateChange(request, cors);
    if (originRejection) return originRejection;

    return withCors(new Response('Not found', { status: 404 }), request, cors);
  },

  async scheduled(controller): Promise<void> {
    console.info('Finance cron is reserved for a later finance module', {
      cron: controller.cron,
    });
  },
} satisfies ExportedHandler<Env>;
