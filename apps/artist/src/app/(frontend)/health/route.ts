import {getPayload} from 'payload';
import config from '@payload-config';
import {healthResponse} from '../../../health';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return healthResponse(async () => {
    const payload = await getPayload({config});
    await payload.find({
      collection: 'users',
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
  });
}
