import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';

export const CLIP_CAPTURE_LIMITS = Object.freeze({
  timeoutMs: 10_000,
  maximumBytes: 1_048_576,
  maximumRedirects: 5,
  minimumArticleCharacters: 500,
});

export type ClipCaptureReason =
  | 'fetch_failed'
  | 'non_html'
  | 'content_too_large'
  | 'article_unavailable'
  | 'extraction_failed';

export type ClipArticleEvidence = {
  title: string | null;
  byline: string | null;
  excerpt: string | null;
  siteName: string | null;
  publishedTime: string | null;
  textContent: string;
};

export type ClipCaptureResult = {
  status: 'article' | 'metadata' | 'failed';
  reason: ClipCaptureReason | null;
  originalUrl: string;
  finalUrl: string | null;
  title: string | null;
  metadataDescription: string | null;
  image: string | null;
  article: ClipArticleEvidence | null;
};

type FetchImplementation = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const CHALLENGE_TITLE_PATTERN = /^\s*(?:just a moment(?:\.{3}|…)?|checking (?:your )?browser|verify (?:you are|that you are) human|attention required|security (?:check|verification)|access denied)(?:\s*[|·—-]\s*.+)?\s*$/i;
const CHALLENGE_TEXT_PATTERN = /(?:verify (?:you are|that you are) human|checking your browser|enable javascript(?: and cookies)? to continue|complete the security check|security verification)/i;

class CaptureFailure extends Error {
  constructor(readonly reason: ClipCaptureReason) {
    super(reason);
  }
}

function isNonPublicIpv4(host: string): boolean {
  const octets = host.split('.').map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [first, second, third] = octets;
  return first === 0
    || first === 10
    || first === 127
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 0 && third === 0)
    || (first === 192 && second === 0 && third === 2)
    || (first === 192 && second === 168)
    || (first === 198 && (second === 18 || second === 19))
    || (first === 198 && second === 51 && third === 100)
    || (first === 203 && second === 0 && third === 113)
    || first >= 224;
}

function isIpv4(host: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
}

function isPublicIpv6(host: string): boolean {
  if (!host.includes(':') || !/^[0-9a-f:]+$/i.test(host)) return false;
  const first = Number.parseInt(host.split(':', 1)[0] || '0', 16);
  return first >= 0x2000 && first <= 0x3fff && !host.toLowerCase().startsWith('2001:db8:');
}

export function parsePublicWebUrl(value: unknown): URL | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.username || url.password || url.port) return null;
    const host = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
    if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return null;
    if (isIpv4(host)) return isNonPublicIpv4(host) ? null : url;
    if (host.includes(':')) return isPublicIpv6(host) ? url : null;
    return url;
  } catch {
    return null;
  }
}

async function cancelBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // The redirect body is irrelevant and may already be closed.
  }
}

async function readLimitedText(response: Response): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > CLIP_CAPTURE_LIMITS.maximumBytes) {
        await reader.cancel('clip capture body limit exceeded');
        throw new CaptureFailure('content_too_large');
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

async function retrieveHtml(originalUrl: URL, fetchImpl: FetchImplementation): Promise<{ finalUrl: URL; html: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLIP_CAPTURE_LIMITS.timeoutMs);
  let currentUrl = originalUrl;
  let redirects = 0;
  try {
    while (true) {
      let response: Response;
      try {
        response = await fetchImpl(currentUrl, {
          headers: { Accept: 'text/html,application/xhtml+xml;q=0.9' },
          redirect: 'manual',
          signal: controller.signal,
        });
      } catch {
        throw new CaptureFailure('fetch_failed');
      }

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location || redirects >= CLIP_CAPTURE_LIMITS.maximumRedirects) {
          await cancelBody(response);
          throw new CaptureFailure('fetch_failed');
        }
        let nextUrl: URL | null = null;
        try {
          nextUrl = parsePublicWebUrl(new URL(location, currentUrl).toString());
        } catch {
          nextUrl = null;
        }
        await cancelBody(response);
        if (!nextUrl) throw new CaptureFailure('fetch_failed');
        redirects += 1;
        currentUrl = nextUrl;
        continue;
      }

      if (!response.ok) {
        await cancelBody(response);
        throw new CaptureFailure('fetch_failed');
      }
      const contentType = response.headers.get('content-type') ?? '';
      if (!/^(?:text\/html|application\/xhtml\+xml)(?:\s*;|$)/i.test(contentType)) {
        await cancelBody(response);
        throw new CaptureFailure('non_html');
      }
      const declaredLength = Number(response.headers.get('content-length') ?? '0');
      if (Number.isFinite(declaredLength) && declaredLength > CLIP_CAPTURE_LIMITS.maximumBytes) {
        await cancelBody(response);
        throw new CaptureFailure('content_too_large');
      }
      return { finalUrl: currentUrl, html: await readLimitedText(response) };
    }
  } finally {
    clearTimeout(timeout);
  }
}

function createDocument(html: string, finalUrl: string) {
  const { document } = parseHTML(html);
  const base = document.createElement('base');
  base.setAttribute('href', finalUrl);
  (document.head ?? document.documentElement).prepend(base as unknown as string);
  Object.defineProperty(document, 'documentURI', { configurable: true, value: finalUrl });
  Object.defineProperty(document, 'URL', { configurable: true, value: finalUrl });
  return document;
}

function meta(document: ReturnType<typeof createDocument>, names: string[]): string | null {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  for (const element of document.querySelectorAll('meta')) {
    const name = (element.getAttribute('property') ?? element.getAttribute('name') ?? '').trim().toLowerCase();
    const content = element.getAttribute('content')?.trim();
    if (wanted.has(name) && content) return content;
  }
  return null;
}

function safeImageUrl(value: string | null, finalUrl: URL): string | null {
  if (!value) return null;
  try {
    return parsePublicWebUrl(new URL(value, finalUrl).toString())?.toString() ?? null;
  } catch {
    return null;
  }
}

function looksLikeChallenge(title: string | null, text: string): boolean {
  return Boolean(title && CHALLENGE_TITLE_PATTERN.test(title) && CHALLENGE_TEXT_PATTERN.test(text.slice(0, 4_000)));
}

function emptyResult(originalUrl: string, reason: ClipCaptureReason): ClipCaptureResult {
  return {
    status: 'failed', reason, originalUrl, finalUrl: null,
    title: null, metadataDescription: null, image: null, article: null,
  };
}

export async function captureClipArticle(input: string, fetchImpl: FetchImplementation = fetch): Promise<ClipCaptureResult> {
  const originalUrl = parsePublicWebUrl(input);
  if (!originalUrl) return emptyResult(input, 'fetch_failed');
  let retrieval: { finalUrl: URL; html: string };
  try {
    retrieval = await retrieveHtml(originalUrl, fetchImpl);
  } catch (error) {
    return emptyResult(originalUrl.toString(), error instanceof CaptureFailure ? error.reason : 'fetch_failed');
  }

  try {
    const metadataDocument = createDocument(retrieval.html, retrieval.finalUrl.toString());
    const metadataTitle = meta(metadataDocument, ['og:title'])
      ?? metadataDocument.querySelector('title')?.textContent?.trim()
      ?? null;
    const metadataDescription = meta(metadataDocument, ['og:description', 'description']);
    const image = safeImageUrl(meta(metadataDocument, ['og:image']), retrieval.finalUrl);
    const parsed = new Readability(createDocument(retrieval.html, retrieval.finalUrl.toString())).parse();
    const articleText = parsed?.textContent?.trim() ?? '';
    const extractedTitle = parsed?.title?.trim() || metadataTitle;
    const article = parsed
      && articleText.length >= CLIP_CAPTURE_LIMITS.minimumArticleCharacters
      && !looksLikeChallenge(extractedTitle, articleText)
      ? {
          title: parsed.title?.trim() || null,
          byline: parsed.byline?.trim() || null,
          excerpt: parsed.excerpt?.trim() || null,
          siteName: parsed.siteName?.trim() || null,
          publishedTime: parsed.publishedTime?.trim()
            || meta(metadataDocument, ['article:published_time'])
            || null,
          textContent: articleText,
        }
      : null;
    const title = article?.title || metadataTitle;
    const hasMetadata = Boolean(title || metadataDescription || image);
    return {
      status: article ? 'article' : hasMetadata ? 'metadata' : 'failed',
      reason: article ? null : 'article_unavailable',
      originalUrl: originalUrl.toString(),
      finalUrl: retrieval.finalUrl.toString(),
      title,
      metadataDescription,
      image,
      article,
    };
  } catch {
    return {
      ...emptyResult(originalUrl.toString(), 'extraction_failed'),
      finalUrl: retrieval.finalUrl.toString(),
    };
  }
}
