import React from 'react';

export interface Activity {
  time: string;
  name: string;
  type: string;
  description?: string;
  cost: number;
  location?: string;
}

export interface DayPlan {
  day: number;
  theme?: string;
  activities: Activity[];
  dailyCost: number;
}

export interface Itinerary {
  destination: string;
  totalDays: number;
  totalBudget: number;
  estimatedCost: number;
  travelers?: number;
  summary?: string;
  days: DayPlan[];
  tips?: string[];
}

/**
 * 将行程转换为可读文本
 * 需求：2.3
 */
export function itineraryToText(itinerary: Itinerary): string {
  const { destination, totalBudget, estimatedCost, days, tips } = itinerary;
  const lines: string[] = [];

  lines.push(`【${destination}】${days.length}天行程`);
  lines.push(`预算：¥${totalBudget} | 预估花费：¥${estimatedCost}`);

  for (const day of days) {
    lines.push('');
    lines.push(`第${day.day}天${day.theme ? ' ' + day.theme : ''}`);
    for (const act of day.activities) {
      lines.push(`${act.time} [${act.type}] ${act.name} - ¥${act.cost}`);
      if (act.description) lines.push(`  ${act.description}`);
      if (act.location) lines.push(`  📍 ${act.location}`);
    }
  }

  if (tips && tips.length > 0) {
    lines.push('');
    lines.push('旅行小贴士：');
    for (const tip of tips) {
      lines.push(`• ${tip.replace(/^[•·\-\s]+/, '')}`);
    }
  }

  return lines.join('\n');
}

/**
 * 把 CSS 文本里 html2canvas 不支持的现代颜色函数替换为 transparent
 * 仅用于 stylesheet 级别的清理，内联样式会被 onclone 的计算值覆盖
 */
function sanitizeCssForCanvas(css: string): string {
  return css
    .replace(/color-mix\([^)]*\)/g, 'transparent')
    .replace(/\bcolor\((?![\s\S]*?\)[\s\S]*?\))[^)]*\)/g, 'transparent')
    .replace(/\boklch\([^)]*\)/g, 'transparent')
    .replace(/\boklab\([^)]*\)/g, 'transparent')
    .replace(/\blab\([^)]*\)/g, 'transparent')
    .replace(/\blch\([^)]*\)/g, 'transparent');
}

/**
 * 直接对原始元素截图
 * - onclone: 先清理 stylesheet 里的现代颜色函数，再把每个元素的计算色值内联覆盖
 * - ignoreElements: 跳过地图 canvas，避免跨域污染
 */
async function captureElement(el: HTMLElement): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import('html2canvas');

  return await html2canvas(el, {
    useCORS: true,
    allowTaint: false,
    scale: 2,
    logging: false,
    windowWidth: document.documentElement.scrollWidth,
    windowHeight: document.documentElement.scrollHeight,
    onclone: (clonedDoc: Document) => {
      // 1. 清理 stylesheet 里的现代颜色函数（兜底）
      clonedDoc.querySelectorAll('style').forEach((styleEl) => {
        styleEl.textContent = sanitizeCssForCanvas(styleEl.textContent ?? '');
      });
      clonedDoc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((link) => {
        try {
          const sheet = Array.from(document.styleSheets).find((s) => s.href === link.href);
          if (!sheet) return;
          let cssText = '';
          try { cssText = Array.from(sheet.cssRules).map((r) => r.cssText).join('\n'); }
          catch { return; }
          const style = clonedDoc.createElement('style');
          style.textContent = sanitizeCssForCanvas(cssText);
          link.replaceWith(style);
        } catch { /* ignore */ }
      });

      // 2. 把原始元素树的计算色值内联到克隆元素上，恢复被 transparent 抹掉的颜色
      const colorProps = [
        'color', 'background-color',
        'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
        'outline-color', 'text-decoration-color', 'fill', 'stroke',
      ];
      const srcAll = [el, ...el.querySelectorAll<HTMLElement>('*')];

      // clonedDoc 里的元素顺序与原始 DOM 一致，按 index 对应
      const clonedRoot = clonedDoc.body;
      const allCloned = clonedRoot.querySelectorAll<HTMLElement>('*');
      const clonedArr = Array.from(allCloned);
      // 找到克隆树中对应 el 的根节点（body 下第一个匹配的）
      srcAll.forEach((src, i) => {
        const dst = clonedArr[i];
        if (!dst) return;
        const computed = window.getComputedStyle(src);
        for (const prop of colorProps) {
          const val = computed.getPropertyValue(prop);
          // 只内联 rgb/rgba 格式（浏览器已计算好的值），跳过仍含现代函数的值
          if (val && /^rgba?\(/.test(val.trim())) {
            dst.style.setProperty(prop, val, 'important');
          }
        }
        // background-color 单独处理（渐变背景降级为纯色）
        const bgColor = computed.getPropertyValue('background-color');
        if (bgColor && /^rgba?\(/.test(bgColor.trim())) {
          dst.style.setProperty('background-color', bgColor, 'important');
        }
      });
    },
    ignoreElements: (node) => {
      if (node instanceof HTMLCanvasElement && node !== el) return true;
      const src = (node as HTMLElement).getAttribute?.('src') ?? '';
      return src.includes('map.baidu.com') || src.includes('api.map.baidu');
    },
  });
}


export function getExportFileName(itinerary: Itinerary, ext: 'pdf' | 'png'): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `行程-${itinerary.destination}-${yyyy}${mm}${dd}.${ext}`;
}

/**
 * 统一导出函数
 * 需求：2.3、2.4、2.5、2.6、2.7、2.8、2.9
 */
export async function exportItinerary(
  action: 'copy' | 'pdf' | 'image' | 'share',
  itinerary: Itinerary,
  cardRef: React.RefObject<HTMLDivElement | null>
): Promise<void> {
  switch (action) {
    case 'copy': {
      await navigator.clipboard.writeText(itineraryToText(itinerary));
      break;
    }

    case 'pdf': {
      const { jsPDF } = await import('jspdf');
      if (!cardRef.current) throw new Error('cardRef is null');
      const canvas = await captureElement(cardRef.current);
      const imgData = canvas.toDataURL('image/png');
      const pxToMm = (px: number) => (px * 25.4) / 96;
      const width = pxToMm(canvas.width / 2);
      const height = pxToMm(canvas.height / 2);
      const pdf = new jsPDF({ orientation: width > height ? 'l' : 'p', unit: 'mm', format: [width, height] });
      pdf.addImage(imgData, 'PNG', 0, 0, width, height);
      pdf.save(getExportFileName(itinerary, 'pdf'));
      break;
    }

    case 'image': {
      if (!cardRef.current) throw new Error('cardRef is null');
      const canvas = await captureElement(cardRef.current);
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = getExportFileName(itinerary, 'png');
      a.click();
      break;
    }

    case 'share': {
      if (!navigator.share) throw new Error('NOT_SUPPORTED');
      await navigator.share({
        title: itinerary.destination + '行程',
        text: itineraryToText(itinerary).slice(0, 200),
        url: window.location.href,
      });
      break;
    }
  }
}
