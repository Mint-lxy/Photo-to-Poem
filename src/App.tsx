/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Loader2, RefreshCw, Feather, XCircle, Copy, CheckCircle2, Download, FileText } from 'lucide-react';
import { motion } from 'motion/react';

const detectScript = (text: string) => {
  if (/[\u3040-\u30ff\u31f0-\u31ff]/.test(text)) return 'ja'; // Hiragana/Katakana
  if (/[\uac00-\ud7af\u1100-\u11ff]/.test(text)) return 'ko'; // Hangul
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh'; // CJK
  return 'en';
};

const getFontFamily = (style: string, text: string = '') => {
  const script = text ? detectScript(text) : 'en';

  if (style === 'handwritten') {
    if (script === 'zh') return '"Zhi Mang Xing", "Ma Shan Zheng", cursive';
    if (script === 'ja') return '"Yuji Syuku", cursive';
    if (script === 'ko') return '"East Sea Dokdo", cursive';
    return '"Dancing Script", "Caveat", cursive';
  }
  if (style === 'modern') {
    return 'ui-sans-serif, system-ui, sans-serif'; 
  }
  if (style === 'typewriter') {
    return '"Special Elite", "Noto Serif SC", monospace';
  }
  
  // elegant / default
  if (script === 'zh') return '"Noto Serif SC", serif';
  if (script === 'ja') return '"Shippori Mincho", "Noto Serif JP", serif';
  if (script === 'ko') return '"Noto Serif KR", serif';
  return '"Cormorant Garamond", "Playfair Display", serif';
};

const TEXT_CARD_BACKGROUNDS = [
  { 
    id: 'warm-paper', 
    name: '暖素 (Warm Paper)', 
    css: '#FDFCF8', 
    textColor: '#171717', 
    borderColor: '#E5E5E5',
    draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => { 
      ctx.fillStyle = '#FDFCF8'; 
      ctx.fillRect(0,0,w,h); 
    } 
  },
  { 
    id: 'pure-white', 
    name: '纯净 (Pure White)', 
    css: '#FAFAFA', 
    textColor: '#171717', 
    borderColor: '#E5E5E5',
    draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => { 
      ctx.fillStyle = '#FAFAFA'; 
      ctx.fillRect(0,0,w,h); 
    } 
  },
  { 
    id: 'dawn', 
    name: '晨曦 (Dawn)', 
    css: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)', 
    textColor: '#171717', 
    borderColor: '#D1D5DB',
    draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => { 
      const x = ctx.createLinearGradient(0,0,w,h); 
      x.addColorStop(0, '#fdfbfb'); x.addColorStop(1, '#ebedee'); 
      ctx.fillStyle = x; ctx.fillRect(0,0,w,h); 
    } 
  },
  { 
    id: 'twilight', 
    name: '青黛 (Twilight)', 
    css: 'linear-gradient(135deg, #141e30 0%, #243b55 100%)', 
    textColor: '#F1F5F9', 
    borderColor: 'rgba(255,255,255,0.2)',
    draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => { 
      const x = ctx.createLinearGradient(0,0,w,h); 
      x.addColorStop(0, '#141e30'); x.addColorStop(1, '#243b55'); 
      ctx.fillStyle = x; ctx.fillRect(0,0,w,h); 
    } 
  },
  { 
    id: 'cherry', 
    name: '樱草 (Cherry)', 
    css: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', 
    textColor: '#5a3d31', 
    borderColor: 'rgba(90,61,49,0.2)',
    draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => { 
      const x = ctx.createLinearGradient(0,0,w,h); 
      x.addColorStop(0, '#ffecd2'); x.addColorStop(1, '#fcb69f'); 
      ctx.fillStyle = x; ctx.fillRect(0,0,w,h); 
    } 
  },
];

export default function App() {
  const LANGUAGES = [
    '自动检测 (Auto-detect)',
    '简体中文 (Chinese)',
    '繁體中文 (Traditional Chinese)',
    'English',
    'Italiano (Italian)',
    'Español (Spanish)',
    'Français (French)',
    '日本語 (Japanese)',
    '한국어 (Korean)',
  ];

  const POEM_STYLES = [
    '现代散文诗 (Modern Prose)',
    '古体诗 (Classical Chinese)',
    '现代自由诗 (Free Verse)',
    '俳句 (Haiku)',
    '十四行诗 (Sonnet)',
    '五行打油诗 (Limerick)',
    '藏头诗 (Acrostic)',
  ];

  const POEM_LENGTHS = ['短 (Short)', '中等 (Medium)', '长 (Long)'];

  const [image, setImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [poem, setPoem] = useState<string | null>(null);
  const [poemTitle, setPoemTitle] = useState<string | null>(null);
  const [shortExcerpt, setShortExcerpt] = useState<string | null>(null);
  const [poemStyle, setPoemStyle] = useState<string>(POEM_STYLES[0]);
  const [poemLengthIndex, setPoemLengthIndex] = useState<number>(1); // Default to Medium
  const [poemLanguage, setPoemLanguage] = useState<string>(LANGUAGES[0]);
  const [fontStyle, setFontStyle] = useState<string>('elegant');
  const [textPlacement, setTextPlacement] = useState<string>('bottom-center');
  const [cardBackgroundIdx, setCardBackgroundIdx] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
      setMimeType(file.type);
      setPoem(null);
      setPoemTitle(null);
      setShortExcerpt(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const compressImageForAPI = async (dataUrl: string, maxDim: number = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width <= maxDim && height <= maxDim) {
          resolve(dataUrl.split(',')[1]);
          return;
        }
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
        } else {
          resolve(dataUrl.split(',')[1]);
        }
      };
      img.src = dataUrl;
    });
  };

  const generatePoem = async () => {
    if (!image || !mimeType) return;

    const controller = new AbortController();
    setAbortController(controller);
    setIsGenerating(true);
    setError(null);
    
    // Compress the image before uploading to Gemini API to speed up processing
    const base64Data = await compressImageForAPI(image, 800);

    try {
      const response = await fetch('/api/generate-poem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: 'image/jpeg',
          poemStyle,
          poemLength: POEM_LENGTHS[poemLengthIndex],
          poemLanguage,
        }),
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate poem');
      }

      setPoem(data.poem);
      setPoemTitle(data.title);
      setShortExcerpt(data.shortExcerpt || null);
      setFontStyle(data.fontStyle || 'elegant');
      setTextPlacement(data.textPlacement || 'bottom-center');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('诗歌生成已取消');
      } else {
        setError(err.message || '生成诗歌时发生错误。');
      }
    } finally {
      setIsGenerating(false);
      setAbortController(null);
    }
  };

  const cancelGeneration = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  const copyToClipboard = async () => {
    if (!poem) return;
    const textToCopy = poemTitle ? `${poemTitle}\n\n${poem}` : poem;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('复制文本失败:', err);
    }
  };

  const getLines = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const lines: string[] = [];
    const paragraphs = text.split('\n');
    
    for (const p of paragraphs) {
      if (p === '') {
        lines.push('');
        continue;
      }
      
      const isCJK = /[\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(p);
      let currentLine = '';
      
      if (isCJK) {
        const chars = Array.from(p);
        for (let i = 0; i < chars.length; i++) {
          const testLine = currentLine + chars[i];
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && i > 0) {
            lines.push(currentLine);
            currentLine = chars[i];
          } else {
            currentLine = testLine;
          }
        }
        lines.push(currentLine);
      } else {
        const words = p.split(' ');
        for (let i = 0; i < words.length; i++) {
          const testLine = currentLine + words[i] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && i > 0) {
            lines.push(currentLine.trimEnd());
            currentLine = words[i] + ' ';
          } else {
            currentLine = testLine;
          }
        }
        lines.push(currentLine.trimEnd());
      }
    }
    return lines;
  };

  const generateImagePreview = () => {
    if (!image || !poem) return;
    setIsSavingImage(true);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsSavingImage(false);
      return;
    }

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      const isTop = textPlacement.includes('top');
      const isBottom = textPlacement.includes('bottom');
      const isLeft = textPlacement.includes('left');
      const isRight = textPlacement.includes('right');
      const isCenterVertical = !isTop && !isBottom;
      const isCenterHorizontal = !isLeft && !isRight;

      ctx.fillStyle = 'white';
      ctx.textAlign = isCenterHorizontal ? 'center' : (isLeft ? 'left' : 'right');
      
      // Text shadows so it's readable over any image
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;

      const padding = Math.max(30, Math.floor(canvas.width * 0.08));
      const maxWidthText = canvas.width - (padding * 2);

      const titleFontSize = Math.max(40, Math.floor(canvas.width / 18));
      const poemFontSize = Math.max(24, Math.floor(canvas.width / 32));
      const lineHeight = poemFontSize * 1.6;

      const getFontString = (size: number, fw: string) => {
        return `${fw} ${size}px ${getFontFamily(fontStyle, poemTitle || poem || '')}`;
      };
      
      const lines: { text: string; isTitle: boolean }[] = [];
      
      if (poemTitle) {
        ctx.font = getFontString(titleFontSize, 'bold');
        const titleLines = getLines(ctx, poemTitle, maxWidthText);
        titleLines.forEach(l => lines.push({ text: l, isTitle: true }));
        lines.push({ text: '', isTitle: false });
      }
      
      ctx.font = getFontString(poemFontSize, 'normal');
      const poemLines = getLines(ctx, poem, maxWidthText);
      poemLines.forEach(l => lines.push({ text: l, isTitle: false }));

      let totalHeight = 0;
      lines.forEach(line => {
        totalHeight += line.isTitle ? (titleFontSize * 1.3) : lineHeight;
      });

      const maxAllowedHeight = canvas.height * 0.8;
      
      if (totalHeight > maxAllowedHeight && shortExcerpt) {
        lines.length = 0;
        if (poemTitle) {
          ctx.font = getFontString(titleFontSize, 'bold');
          const titleLines = getLines(ctx, poemTitle, maxWidthText);
          titleLines.forEach(l => lines.push({ text: l, isTitle: true }));
          lines.push({ text: '', isTitle: false });
        }
        ctx.font = getFontString(poemFontSize, 'normal');
        const excerptLines = getLines(ctx, shortExcerpt, maxWidthText);
        excerptLines.forEach(l => lines.push({ text: l, isTitle: false }));
        
        totalHeight = 0;
        lines.forEach(line => {
          totalHeight += line.isTitle ? (titleFontSize * 1.3) : lineHeight;
        });
      }

      let startY = 0;
      if (isTop) {
        startY = padding + (lines[0]?.isTitle ? titleFontSize : poemFontSize);
      } else if (isBottom) {
        startY = canvas.height - padding - totalHeight + (lines[0]?.isTitle ? titleFontSize : poemFontSize);
      } else {
        startY = (canvas.height - totalHeight) / 2 + (lines[0]?.isTitle ? titleFontSize : poemFontSize);
      }

      let currentY = startY;
      const getX = () => {
        if (isCenterHorizontal) return canvas.width / 2;
        if (isLeft) return padding;
        return canvas.width - padding;
      };
      
      const textX = getX();

      // Draw shadow
      ctx.shadowBlur = 16;
      lines.forEach(line => {
        let drawY = currentY;
        if (line.isTitle) {
          ctx.font = getFontString(titleFontSize, 'bold');
          if (line.text) ctx.fillText(line.text, textX, drawY);
          currentY += titleFontSize * 1.3;
        } else {
          ctx.font = getFontString(poemFontSize, 'normal');
          if (line.text) ctx.fillText(line.text, textX, drawY);
          currentY += lineHeight;
        }
      });
      
      // Draw foreground text
      ctx.shadowBlur = 4;
      currentY = startY;
      lines.forEach(line => {
        let drawY = currentY;
        if (line.isTitle) {
          ctx.font = getFontString(titleFontSize, 'bold');
          if (line.text) ctx.fillText(line.text, textX, drawY);
          currentY += titleFontSize * 1.3;
        } else {
          ctx.font = getFontString(poemFontSize, 'normal');
          if (line.text) ctx.fillText(line.text, textX, drawY);
          currentY += lineHeight;
        }
      });
      
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setPreviewImageUrl(dataUrl);
      } catch (err) {
        console.error('Error saving image:', err);
      } finally {
        setIsSavingImage(false);
      }
    };
    img.src = image;
  };

  const generateTextCardPreview = () => {
    if (!poem) return;
    setIsSavingImage(true);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsSavingImage(false);
      return;
    }

    const padding = 100;
    const maxAllowedWidth = 1080;
    const maxWidthText = maxAllowedWidth - (padding * 2);

    const titleFontSize = 64;
    const poemFontSize = 40;
    const lineHeight = poemFontSize * 1.8;

    const getFontString = (size: number, fw: string) => {
      return `${fw} ${size}px ${getFontFamily(fontStyle, poemTitle || poem || '')}`;
    };
    
    const lines: { text: string; isTitle: boolean }[] = [];
    let actualMaxWidth = 0;
    
    if (poemTitle) {
      ctx.font = getFontString(titleFontSize, 'bold');
      const titleLines = getLines(ctx, poemTitle, maxWidthText);
      titleLines.forEach(l => {
        actualMaxWidth = Math.max(actualMaxWidth, ctx.measureText(l).width);
        lines.push({ text: l, isTitle: true });
      });
      lines.push({ text: '', isTitle: false });
    }
    
    ctx.font = getFontString(poemFontSize, 'normal');
    const poemLines = getLines(ctx, poem, maxWidthText);
    poemLines.forEach(l => {
      actualMaxWidth = Math.max(actualMaxWidth, ctx.measureText(l).width);
      lines.push({ text: l, isTitle: false });
    });

    let totalHeight = 0;
    lines.forEach(line => {
      totalHeight += line.isTitle ? (titleFontSize * 1.3) : lineHeight;
    });

    // Make canvas width fit the text snugly, keeping styling padding
    const canvasWidth = Math.max(600, Math.min(1080, actualMaxWidth + padding * 2 + 80));
    // Let the canvas height match the content, without a giant 1080px minimum baseline
    const canvasHeight = Math.max(600, totalHeight + padding * 2);
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const bgConfig = TEXT_CARD_BACKGROUNDS[cardBackgroundIdx];

    // Draw background
    bgConfig.draw(ctx, canvas.width, canvas.height);
    
    ctx.strokeStyle = bgConfig.borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

    ctx.fillStyle = bgConfig.textColor; 
    ctx.textAlign = 'center';
    
    let currentY = padding + (lines[0]?.isTitle ? titleFontSize : poemFontSize);
    if (canvasHeight > totalHeight + padding * 2) {
      currentY = (canvasHeight - totalHeight) / 2 + (lines[0]?.isTitle ? titleFontSize : poemFontSize) / 2;
    }

    const textX = canvas.width / 2;

    lines.forEach(line => {
      let drawY = currentY;
      if (line.isTitle) {
        ctx.font = getFontString(titleFontSize, 'bold');
        if (line.text) ctx.fillText(line.text, textX, drawY);
        currentY += titleFontSize * 1.3;
      } else {
        ctx.font = getFontString(poemFontSize, 'normal');
        if (line.text) ctx.fillText(line.text, textX, drawY);
        currentY += lineHeight;
      }
    });

    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setPreviewImageUrl(dataUrl);
    } catch (err) {
      console.error('Error saving text card:', err);
    } finally {
      setIsSavingImage(false);
    }
  };

  const confirmDownloadImage = () => {
    if (!previewImageUrl) return;
    const a = document.createElement('a');
    a.href = previewImageUrl;
    a.download = `poem-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setPreviewImageUrl(null);
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-neutral-200">
      <main className="max-w-4xl mx-auto px-6 py-12 md:py-20 flex flex-col items-center">
        <header className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4 text-neutral-900">
            Photo to Poem
          </h1>
          <p className="text-lg text-neutral-500 max-w-lg mx-auto leading-relaxed">
            上传一张照片，AI会根据画面生成一首诗歌。
          </p>
        </header>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {/* Upload Section */}
          <div className="flex flex-col gap-6">
            {!image ? (
              <div 
                className="w-full aspect-[4/5] border-2 border-dashed border-neutral-300 rounded-3xl flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-neutral-100 hover:border-neutral-400 transition-all group"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                id="file-upload-dropzone"
              >
                <div className="p-4 bg-white rounded-full shadow-sm mb-4 group-hover:scale-105 transition-transform">
                  <Upload className="w-6 h-6 text-neutral-500" />
                </div>
                <h3 className="font-medium text-neutral-800 mb-1">点击或拖拽照片到此处</h3>
                <p className="text-sm text-neutral-500">支持 SVG, PNG, JPG 或 GIF</p>
              </div>
            ) : (
              <div className="relative w-full rounded-3xl overflow-hidden shadow-lg group">
                <img 
                  src={image} 
                  alt="Uploaded" 
                  className="w-full object-cover transition-transform duration-700 hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                  <button
                    onClick={() => {
                      setImage(null);
                      setPoem(null);
                      setPoemTitle(null);
                      setError(null);
                    }}
                    className="px-6 py-3 bg-white text-neutral-900 font-medium rounded-full shadow-xl hover:bg-neutral-100 transition-colors flex items-center gap-2"
                    id="choose-different-photo-btn"
                  >
                    <RefreshCw className="w-4 h-4" />
                    更换照片
                  </button>
                </div>
              </div>
            )}
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            {image && !poem && !isGenerating && (
              <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <label htmlFor="poem-language-select" className="text-sm font-medium text-neutral-700 ml-1">
                  语言
                </label>
                <div className="relative mb-2">
                  <select
                    id="poem-language-select"
                    value={poemLanguage}
                    onChange={(e) => setPoemLanguage(e.target.value)}
                    className="w-full py-3 px-4 bg-white border border-neutral-200 rounded-xl text-neutral-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 appearance-none pr-10"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>

                <label htmlFor="poem-style-select" className="text-sm font-medium text-neutral-700 ml-1">
                  选择诗歌风格
                </label>
                <div className="relative">
                  <select
                    id="poem-style-select"
                    value={poemStyle}
                    onChange={(e) => setPoemStyle(e.target.value)}
                    className="w-full py-3 px-4 bg-white border border-neutral-200 rounded-xl text-neutral-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 appearance-none pr-10"
                  >
                    {POEM_STYLES.map((style) => (
                      <option key={style} value={style}>
                        {style}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>

                <div className="mt-2">
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="poem-length-slider" className="text-sm font-medium text-neutral-700 ml-1">
                      诗歌长度
                    </label>
                    <span className="text-sm font-medium text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-md">
                      {POEM_LENGTHS[poemLengthIndex]}
                    </span>
                  </div>
                  <input
                    id="poem-length-slider"
                    type="range"
                    min="0"
                    max="2"
                    step="1"
                    value={poemLengthIndex}
                    onChange={(e) => setPoemLengthIndex(parseInt(e.target.value))}
                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                  />
                  <div className="flex justify-between mt-2 px-1">
                    {POEM_LENGTHS.map((len, idx) => (
                      <span key={len} className={`text-xs ${poemLengthIndex === idx ? 'text-neutral-900 font-medium' : 'text-neutral-400'}`}>
                        {len}
                      </span>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={generatePoem}
                  className="w-full py-4 px-6 bg-neutral-900 text-white rounded-2xl font-medium shadow-xl hover:bg-neutral-800 transition-colors hover:-translate-y-0.5 mt-2"
                  id="generate-poem-btn"
                >
                  开始作诗
                </button>
              </div>
            )}

            {isGenerating && (
              <div className="flex flex-col gap-3">
                <button
                  disabled
                  className="w-full py-4 px-6 bg-neutral-200 text-neutral-500 rounded-2xl font-medium flex items-center justify-center gap-3 cursor-not-allowed"
                >
                  <Loader2 className="w-5 h-5 animate-spin" />
                  正在字斟句酌...
                </button>
                <button
                  onClick={cancelGeneration}
                  className="w-full py-3 px-6 bg-white border border-neutral-200 text-neutral-600 hover:text-red-600 hover:bg-red-50 hover:border-red-100 rounded-2xl font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <XCircle className="w-5 h-5" />
                  取消生成
                </button>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100">
                {error}
              </div>
            )}
          </div>

          {/* Result Section */}
          <div className="flex flex-col">
            <div className={`w-full min-h-[400px] h-full rounded-3xl p-8 md:p-10 transition-all duration-700 flex flex-col justify-center ${poem ? 'bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] border border-neutral-100' : 'bg-transparent border-2 border-dashed border-neutral-200 flex-col items-center text-center'}`}>
              {!poem && !isGenerating && !image && (
                <div className="flex flex-col items-center text-neutral-400">
                  <ImageIcon className="w-12 h-12 mb-4 opacity-50" strokeWidth={1} />
                  <p>您的诗歌将显示在这里</p>
                </div>
              )}
              
              {!poem && !isGenerating && image && (
                <div className="flex flex-col items-center text-neutral-400 animate-pulse">
                  <Feather className="w-12 h-12 mb-4 opacity-50" strokeWidth={1} />
                  <p>准备就绪</p>
                </div>
              )}
              
              {isGenerating && (
                <div className="flex flex-col items-center text-neutral-400">
                  <div className="relative w-16 h-16 mb-6">
                    <div className="absolute inset-0 border-4 border-neutral-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-neutral-900 rounded-full border-t-transparent animate-spin"></div>
                  </div>
                  <p className="animate-pulse">正在分析图片细节...</p>
                </div>
              )}

              {poem && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="w-full flex flex-col items-center"
                >
                  <div 
                    className="w-full rounded-2xl p-10 mb-8 shadow-sm transition-all duration-500 relative"
                    style={{ 
                      background: TEXT_CARD_BACKGROUNDS[cardBackgroundIdx].css,
                      color: TEXT_CARD_BACKGROUNDS[cardBackgroundIdx].textColor,
                    }}
                  >
                    <div 
                      className="absolute inset-[16px] pointer-events-none border-2"
                      style={{ borderColor: TEXT_CARD_BACKGROUNDS[cardBackgroundIdx].borderColor }}
                    />
                    <div 
                      className="relative z-10 w-full flex-col items-center"
                      style={{ fontFamily: getFontFamily(fontStyle, poemTitle || poem || '') }}
                    >
                      {poemTitle && (
                        <motion.h2 
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                          className="text-3xl md:text-3xl lg:text-4xl font-bold mb-8 text-center leading-tight"
                        >
                          {poemTitle}
                        </motion.h2>
                      )}
                      <div className="text-lg md:text-xl leading-relaxed md:leading-[1.8] text-center">
                        {poem.split('\n').map((line, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.4 + i * 0.1, ease: "easeOut" }}
                            className={line.trim() === '' ? 'h-6' : ''}
                          >
                            {line}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.8 + (poem.split('\n').length * 0.05), ease: "easeOut" }}
                    className="w-full"
                  >
                    <div className="mb-6">
                      <label className="text-sm font-medium text-neutral-700 ml-1 mb-3 block text-center">
                        选择卡片背景
                      </label>
                      <div className="flex justify-center gap-3">
                        {TEXT_CARD_BACKGROUNDS.map((bg, idx) => (
                          <button
                            key={bg.id}
                            type="button"
                            onClick={() => setCardBackgroundIdx(idx)}
                            className={`w-10 h-10 rounded-full border-2 transition-all ${cardBackgroundIdx === idx ? 'border-neutral-800 scale-110 shadow-md ring-2 ring-neutral-200 ring-offset-2' : 'border-neutral-200 hover:border-neutral-400'}`}
                            style={{ background: bg.css }}
                            title={bg.name}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-4 w-full pt-6 border-t border-neutral-100">
                      <button
                        onClick={copyToClipboard}
                        className="px-6 py-3 bg-white border border-neutral-200 text-neutral-800 rounded-full font-medium flex items-center gap-2 hover:bg-neutral-50 transition-colors shadow-sm"
                      >
                        {copySuccess ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        {copySuccess ? '已复制' : '复制诗文字'}
                      </button>
                      <button
                        onClick={generateTextCardPreview}
                        disabled={isSavingImage}
                        className="px-6 py-3 bg-white border border-neutral-200 text-neutral-800 rounded-full font-medium flex items-center gap-2 hover:bg-neutral-50 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isSavingImage ? <Loader2 className="w-4 h-4 animate-spin text-neutral-500" /> : <FileText className="w-4 h-4" />}
                        保存文字卡片
                      </button>
                      <button
                        onClick={generateImagePreview}
                        disabled={isSavingImage}
                        className="px-6 py-3 bg-neutral-900 text-white rounded-full font-medium flex items-center gap-2 hover:bg-neutral-800 transition-colors shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isSavingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        保存为图片
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>

      {previewImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-neutral-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-neutral-900">效果预览</h3>
              <button onClick={() => setPreviewImageUrl(null)} className="text-neutral-500 hover:text-neutral-800 transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-neutral-100 flex justify-center items-center">
              <img src={previewImageUrl} alt="Generated preview" className="max-w-full max-h-[50vh] object-contain rounded-xl shadow-md border border-neutral-200" />
            </div>
            <div className="p-6 border-t border-neutral-100 flex justify-end gap-3 bg-white">
              <button
                onClick={() => setPreviewImageUrl(null)}
                className="px-6 py-2.5 bg-white border border-neutral-200 text-neutral-700 rounded-full font-medium hover:bg-neutral-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmDownloadImage}
                className="px-6 py-2.5 bg-neutral-900 text-white rounded-full font-medium hover:bg-neutral-800 transition-colors shadow-md flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                下载图片
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
