import type {Access} from 'payload';

export const authenticated: Access = ({req}) => Boolean(req.user);
export const publishedOrAuthenticated: Access = ({req}) =>
  req.user ? true : {_status: {equals: 'published'}};

export const contentAccess = {
  create: authenticated,
  read: publishedOrAuthenticated,
  readVersions: authenticated,
  update: authenticated,
  delete: authenticated,
};
