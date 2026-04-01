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
 * 生成导出文件名
 * 格式：行程-{destination}-{YYYYMMDD}.{ext}
 * 需求：2.5、2.9
 */
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
      const { default: html2canvas } = await import('html2canvas');
      const { jsPDF } = await import('jspdf');
      if (!cardRef.current) throw new Error('cardRef is null');
      const canvas = await html2canvas(cardRef.current, { useCORS: true, scale: 2 });
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
      const { default: html2canvas } = await import('html2canvas');
      if (!cardRef.current) throw new Error('cardRef is null');
      const canvas = await html2canvas(cardRef.current, { useCORS: true, scale: 2 });
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
