import { useState } from 'react';
import { Giscus } from '@giscus/react';

interface Props {
  slug: string;
  title: string;
}

export default function ArticleFooter({ slug, title }: Props) {
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const [copied, setCopied] = useState(false);
  const [showWechatTip, setShowWechatTip] = useState(false);

  const shareTwitter = () => {
    const text = encodeURIComponent(title);
    const shareUrl = encodeURIComponent(url);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${shareUrl}`, '_blank', 'noopener,noreferrer');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      setShowWechatTip(true);
    }
  };

  const shareWechat = () => {
    setShowWechatTip((prev) => !prev);
  };

  return (
    <div className="article-footer">
      {/* 分享按钮 */}
      <div className="share-buttons">
        <button onClick={shareTwitter} className="share-btn" title="分享到 X/Twitter">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </button>
        <button onClick={copyLink} className="share-btn" title="复制链接">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </button>
        <button onClick={shareWechat} className="share-btn" title="分享到微信朋友圈">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.952-7.062-6.122zm-1.18 2.912c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982z"/>
          </svg>
        </button>
      </div>

      {/* Toast */}
      {copied && (
        <div className="toast">已复制链接</div>
      )}

      {/* 微信引导 */}
      {showWechatTip && (
        <div className="wechat-tip">
          请复制链接后在微信中粘贴分享：
          <code className="wechat-url">{url}</code>
        </div>
      )}

      {/* Giscus 评论 */}
      <div className="giscus-wrapper">
        <Giscus
          id="comments"
          repo="catstarry-owner/catstarry.xyz"
          repoId="R_kg_DO0000000"
          category="Blog Comments"
          categoryId="DIC_kwDO0000000"
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

      <style>{`
        .article-footer {
          max-width: var(--content-width, 680px);
          margin: var(--space-xl, 3rem) auto 0;
          padding: 0 var(--content-padding, 1.25rem);
        }

        .share-buttons {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-bottom: var(--space-xl, 3rem);
          padding-bottom: var(--space-lg, 2rem);
          border-bottom: 1px solid var(--color-border, #e8d9cc);
        }

        .share-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border: 1px solid var(--color-border, #e8d9cc);
          border-radius: 50%;
          background: var(--color-surface, #fff9f4);
          color: var(--color-text-muted, #8a7a6e);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .share-btn:hover {
          background: var(--color-accent, #c77a4a);
          color: #fff;
          border-color: var(--color-accent, #c77a4a);
        }

        .toast {
          position: fixed;
          bottom: 2rem;
          left: 50%;
          transform: translateX(-50%);
          background: var(--color-text, #3e2f24);
          color: var(--color-bg, #fdf6f0);
          padding: 0.6rem 1.5rem;
          border-radius: 8px;
          font-size: var(--text-sm, 0.9rem);
          z-index: 1000;
          animation: toast-in 0.3s ease;
        }

        @keyframes toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .wechat-tip {
          text-align: center;
          padding: 1rem;
          margin-bottom: var(--space-lg, 2rem);
          background: var(--color-surface, #fff9f4);
          border: 1px solid var(--color-border, #e8d9cc);
          border-radius: var(--border-radius, 8px);
          color: var(--color-text-muted, #8a7a6e);
          font-size: var(--text-sm, 0.9rem);
        }

        .wechat-url {
          display: block;
          margin-top: 0.5rem;
          padding: 0.4rem 0.8rem;
          background: var(--color-code-bg, #f3e8de);
          border-radius: 4px;
          font-family: var(--font-mono);
          font-size: var(--text-xs);
          word-break: break-all;
          user-select: all;
        }

        .giscus-wrapper {
          margin-top: 0;
        }

        @media (max-width: 640px) {
          .share-btn {
            width: 36px;
            height: 36px;
          }
        }
      `}</style>
    </div>
  );
}
