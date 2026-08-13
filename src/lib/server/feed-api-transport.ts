export interface FeedApiBinding {
  fetch(request: Request): Promise<Response>;
}

export function internalFeedRequest(incoming: Request, pathname: string): Request {
  if (!pathname.startsWith('/api/')) throw new TypeError('Internal Feed path must start with /api/');
  const url = new URL(pathname, 'https://feed-api.internal');
  return new Request(url, incoming);
}

export function fetchViaFeedBinding(
  binding: FeedApiBinding,
  incoming: Request,
  pathname: string,
): Promise<Response> {
  return binding.fetch(internalFeedRequest(incoming, pathname));
}
