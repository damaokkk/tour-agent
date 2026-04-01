/**
 * AvatarBadge 组件
 * 渲染圆形头像（昵称首字母）+ 右下角确认状态图标
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

// 预设色板 — 与 --smart-* 色系协调
const COLOR_PALETTE = [
  '#6f9dff', // smart-primary
  '#8b85f4', // smart-accent / chip-purple
  '#6bb7d9', // chip-cyan
  '#82b4ff', // smart-secondary
  '#6f92ff', // chip-indigo
  '#5e8ff5', // smart-primary-hover
  '#76a7ff', // chip-blue
  '#7b9ef0', // 蓝紫过渡
  '#6fc4b8', // 青绿
  '#9b8af5', // 浅紫
];

/**
 * 根据名字确定性地生成背景色（纯函数）
 * 对 name 各字符 charCode 求和取模映射到色板
 * Requirements: 3.2, 3.3, 3.4
 */
export function generateAvatarColor(name: string): string {
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return COLOR_PALETTE[sum % COLOR_PALETTE.length];
}

interface AvatarBadgeProps {
  /** 用于生成首字母和背景色 */
  name: string;
  /** true=绿色实心勾，false=灰色空心圆 */
  confirmed: boolean;
  /** 默认 'md'（32px），'sm'（24px） */
  size?: 'md' | 'sm';
}

/**
 * AvatarBadge
 * Requirements: 3.1, 3.5, 3.6
 */
export function AvatarBadge({ name, confirmed, size = 'md' }: AvatarBadgeProps) {
  const avatarSize = size === 'md' ? 32 : 24;
  const badgeSize = Math.round(avatarSize * 0.4); // ~40% of avatar
  const fontSize = size === 'md' ? 13 : 10;

  const bgColor = generateAvatarColor(name);
  const initial = name.length > 0 ? name[0].toUpperCase() : '?';

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: avatarSize, height: avatarSize }}
    >
      {/* 圆形头像 */}
      <div
        className="rounded-full flex items-center justify-center select-none"
        style={{
          width: avatarSize,
          height: avatarSize,
          backgroundColor: bgColor,
          fontSize,
          color: '#ffffff',
          fontWeight: 600,
          lineHeight: 1,
        }}
        aria-label={name}
      >
        {initial}
      </div>

      {/* 右下角 badge */}
      <div
        className="absolute bottom-0 right-0 rounded-full flex items-center justify-center"
        style={{
          width: badgeSize,
          height: badgeSize,
          // 白色描边防止与头像重叠
          outline: '1.5px solid #ffffff',
          backgroundColor: confirmed ? '#2f8b64' : '#ffffff',
          border: confirmed ? 'none' : '1.5px solid #b0bec5',
        }}
        aria-label={confirmed ? '已确认' : '未确认'}
      >
        {confirmed ? (
          // 绿色实心勾
          <svg
            width={badgeSize * 0.65}
            height={badgeSize * 0.65}
            viewBox="0 0 10 10"
            fill="none"
            aria-hidden="true"
          >
            <polyline
              points="1.5,5 4,7.5 8.5,2.5"
              stroke="#ffffff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          // 灰色空心圆（内部空白，边框已由 border 提供）
          null
        )}
      </div>
    </div>
  );
}

export default AvatarBadge;
