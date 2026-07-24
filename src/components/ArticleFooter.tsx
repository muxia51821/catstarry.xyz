import { useEffect, useState } from 'react';
import Giscus from '@giscus/react';

interface Props {
  slug: string;
  title: string;
  url: string;
}

export default function ArticleFooter({ slug, title, url }: Props) {
  const [copied, setCopied] = useState(false);
  const [showWechatTip, setShowWechatTip] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const shareTwitter = () => {
    const shareUrl = new URL('https://twitter.com/intent/tweet');
    shareUrl.searchParams.set('text', title);
    shareUrl.searchParams.set('url', url);
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setShowWechatTip(false);
    } catch {
      setShowWechatTip(true);
    }
  };

  return (
    <footer className="blog-share">
      <h2 className="blog-share__title">分享与讨论</h2>
      <div className="blog-share__actions">
        <button type="button" className="blog-share__button" onClick={shareTwitter}>分享到 X</button>
        <button type="button" className="blog-share__button" onClick={copyLink}>复制链接</button>
        <button type="button" className="blog-share__button" onClick={() => setShowWechatTip((visible) => !visible)}>分享到微信</button>
      </div>
      <p className="blog-share__message" aria-live="polite">
        {copied && '链接已复制。'}
        {showWechatTip && <><span>请复制以下链接后在微信中粘贴分享。</span><code className="blog-share__url">{url}</code></>}
      </p>
      <div className="blog-giscus">
        <Giscus
          id="comments"
          repo="muxia51821/catstarry.xyz"
          repoId="R_kgDOTMzWDA"
          category="Announcements"
          categoryId="DIC_kwDOTMzWDM4DAcAs"
          mapping="specific"
          term={slug}
          reactionsEnabled="1"
          emitMetadata="0"
          inputPosition="top"
          theme="light"
          lang="zh-CN"
          loading="lazy"
        />
      </div>
    </footer>
  );
}
