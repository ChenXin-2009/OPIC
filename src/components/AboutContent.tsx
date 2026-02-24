/**
 * 关于页面内容组件
 * 动态读取并渲染 src/components/ABOUT.md
 */

'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function AboutContent() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/ABOUT.md')
      .then(res => res.text())
      .then(text => {
        setContent(text);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load ABOUT.md:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="text-center text-gray-400 py-8">
        加载中...
      </div>
    );
  }

  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 标题样式
          h2: ({ children }) => (
            <h3 className="text-lg font-light text-white/80 mb-3 tracking-wide mt-8 first:mt-0 pl-4 border-l border-white/15">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="text-base font-light text-white/70 mb-2 tracking-wide mt-6">
              {children}
            </h4>
          ),
          // 段落样式
          p: ({ children, node }) => {
            // 检查段落中是否包含图片
            const hasImage = node?.children?.some((child: any) => child.tagName === 'img');
            
            // 如果包含图片，使用 div 而不是 p
            if (hasImage) {
              return (
                <div className="text-sm text-gray-400 leading-relaxed mb-3">
                  {children}
                </div>
              );
            }
            
            return (
              <p className="text-sm text-gray-400 leading-relaxed mb-3">
                {children}
              </p>
            );
          },
          // 列表样式
          ul: ({ children }) => (
            <div className="space-y-2 text-sm text-gray-400 mb-4">
              {children}
            </div>
          ),
          li: ({ children }) => (
            <div className="flex items-start gap-2">
              <span className="text-white/50 mt-1">▸</span>
              <span>{children}</span>
            </div>
          ),
          // 链接样式
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/70 hover:text-white transition-colors"
            >
              {children}
            </a>
          ),
          // 图片样式 - 不包裹在额外的 div 中
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt}
              className="w-100 h-100 object-contain mx-auto my-4 block"
              style={{ filter: 'brightness(0.9)' }}
            />
          ),
          // 代码样式
          code: ({ children }) => (
            <code className="text-xs text-gray-500 font-mono tracking-wider bg-white/5 px-1 rounded">
              {children}
            </code>
          ),
          // 强调样式
          strong: ({ children }) => (
            <strong className="text-white/80 font-medium">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="text-gray-500 text-xs">
              {children}
            </em>
          ),
          // 分隔线
          hr: () => (
            <div className="relative h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-6" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
