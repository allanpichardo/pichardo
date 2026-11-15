import {getPayload} from 'payload';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password || password.length < 16) {
  throw new Error(
    'Set ADMIN_EMAIL and ADMIN_PASSWORD with at least 16 characters.',
  );
}

const {default: config} = await import('../payload.config');
const payload = await getPayload({config});
try {
  const existing = await payload.find({
    collection: 'users',
    where: {email: {equals: email}},
    limit: 1,
    overrideAccess: true,
  });
  if (existing.totalDocs === 0) {
    await payload.create({
      collection: 'users',
      data: {email, password},
      overrideAccess: true,
    });
    payload.logger.info('Administrator created.');
  } else {
    payload.logger.info(
      'Administrator already exists. Credentials were not changed.',
    );
  }
} finally {
  await payload.destroy();
}
