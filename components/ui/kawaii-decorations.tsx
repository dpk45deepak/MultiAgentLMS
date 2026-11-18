import React from 'react';
import { cn } from '@/lib/utils';

/**
 * 4-pointed kawaii sparkle star (✦)
 */
export function Sparkle({
  size = 18,
  color = '#FFE9A8',
  className,
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={cn('inline-block shrink-0', className)}
      aria-hidden="true"
    >
      <path d="M12 0C12 7 7 12 0 12C7 12 12 17 12 24C12 17 17 12 24 12C17 12 12 7 12 0Z" />
    </svg>
  );
}

/**
 * Cute smiling cloud mascot with blush cheeks
 */
export function SmilingCloud({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={(size * 26) / 40}
      viewBox="0 0 48 32"
      fill="none"
      className={cn('inline-block shrink-0 drop-shadow-xs', className)}
      aria-hidden="true"
    >
      <path
        d="M13 28H37C41.4 28 45 24.4 45 20C45 15.9 41.9 12.5 37.9 12.1C36.9 6.4 31.9 2 26 2C20.8 2 16.4 5.5 14.8 10.3C14.2 10.1 13.6 10 13 10C7.5 10 3 14.5 3 20C3 24.4 6.6 28 11 28H13Z"
        fill="#FFFFFF"
        stroke="#B9D9F5"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Eyes */}
      <circle cx="21" cy="18" r="1.8" fill="#24364B" />
      <circle cx="29" cy="18" r="1.8" fill="#24364B" />
      {/* Blush */}
      <ellipse cx="17.5" cy="20.5" rx="2.5" ry="1.5" fill="#F8C9D4" opacity="0.9" />
      <ellipse cx="32.5" cy="20.5" rx="2.5" ry="1.5" fill="#F8C9D4" opacity="0.9" />
      {/* Smile */}
      <path
        d="M23 20.5C24 22 26 22 27 20.5"
        stroke="#24364B"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Cute Envelope Mascot with pink heart seal and smiling face
 */
export function EnvelopeMascot({
  size = 54,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={(size * 42) / 54}
        viewBox="0 0 54 42"
        fill="none"
        className="drop-shadow-sm"
        aria-hidden="true"
      >
        {/* Envelope Body */}
        <rect
          x="2"
          y="8"
          width="50"
          height="32"
          rx="6"
          fill="#FFFFFF"
          stroke="#B9D9F5"
          strokeWidth="2.5"
        />
        {/* Envelope Flap Backing */}
        <path
          d="M3 11L27 27L51 11"
          stroke="#D7EAFB"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Paper peaking out */}
        <rect
          x="8"
          y="3"
          width="38"
          height="16"
          rx="4"
          fill="#FFF9EE"
          stroke="#B9D9F5"
          strokeWidth="1.8"
        />
        {/* Cute Face on letter */}
        <circle cx="23" cy="10" r="1.5" fill="#24364B" />
        <circle cx="31" cy="10" r="1.5" fill="#24364B" />
        <path
          d="M25.5 12C26.2 13 27.8 13 28.5 12"
          stroke="#24364B"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        {/* Blushes */}
        <ellipse cx="20" cy="11" rx="1.8" ry="1" fill="#F8C9D4" />
        <ellipse cx="34" cy="11" rx="1.8" ry="1" fill="#F8C9D4" />
        {/* Envelope Flap Front */}
        <path
          d="M2 10L27 26L52 10"
          stroke="#B9D9F5"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Heart Seal */}
        <path
          d="M27 27.5C27 27.5 22.5 23.5 22.5 20.8C22.5 19.3 23.7 18.2 25.2 18.2C26.1 18.2 26.9 18.7 27 19.3C27.1 18.7 27.9 18.2 28.8 18.2C30.3 18.2 31.5 19.3 31.5 20.8C31.5 23.5 27 27.5 27 27.5Z"
          fill="#F8C9D4"
          stroke="#E57388"
          strokeWidth="1.2"
        />
      </svg>
    </div>
  );
}

/**
 * Cute Bunny Mascot with laptop, as seen in the reference image bottom-left!
 */
export function BunnyMascot({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={cn('relative inline-flex flex-col items-center select-none', className)}>
      <svg
        width="110"
        height="100"
        viewBox="0 0 110 100"
        fill="none"
        aria-hidden="true"
      >
        {/* Ears */}
        <ellipse
          cx="42"
          cy="26"
          rx="8"
          ry="19"
          transform="rotate(-8 42 26)"
          fill="#FFFFFF"
          stroke="#24364B"
          strokeWidth="2.2"
        />
        <ellipse
          cx="42"
          cy="27"
          rx="4.5"
          ry="13"
          transform="rotate(-8 42 27)"
          fill="#F8C9D4"
          opacity="0.8"
        />

        <ellipse
          cx="68"
          cy="26"
          rx="8"
          ry="19"
          transform="rotate(8 68 26)"
          fill="#FFFFFF"
          stroke="#24364B"
          strokeWidth="2.2"
        />
        <ellipse
          cx="68"
          cy="27"
          rx="4.5"
          ry="13"
          transform="rotate(8 68 27)"
          fill="#F8C9D4"
          opacity="0.8"
        />

        {/* Head */}
        <ellipse
          cx="55"
          cy="52"
          rx="25"
          ry="23"
          fill="#FFFFFF"
          stroke="#24364B"
          strokeWidth="2.5"
        />

        {/* Eyes */}
        <circle cx="47" cy="50" r="2.2" fill="#24364B" />
        <circle cx="63" cy="50" r="2.2" fill="#24364B" />
        {/* Eye sparkles */}
        <circle cx="48" cy="49" r="0.7" fill="#FFFFFF" />
        <circle cx="64" cy="49" r="0.7" fill="#FFFFFF" />

        {/* Nose & Mouth */}
        <path
          d="M55 53.5V56.5M55 56.5C53.8 56.5 52.8 57.5 52.8 58.5M55 56.5C56.2 56.5 57.2 57.5 57.2 58.5"
          stroke="#24364B"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Blush */}
        <ellipse cx="40" cy="56" rx="4" ry="2.5" fill="#F8C9D4" />
        <ellipse cx="70" cy="56" rx="4" ry="2.5" fill="#F8C9D4" />

        {/* Little Body */}
        <path
          d="M38 72C38 67 44 65 55 65C66 65 72 67 72 72L74 88H36L38 72Z"
          fill="#FFFFFF"
          stroke="#24364B"
          strokeWidth="2.2"
        />

        {/* Pastel Mug on table */}
        <rect
          x="22"
          y="74"
          width="13"
          height="15"
          rx="3"
          fill="#B9D9F5"
          stroke="#24364B"
          strokeWidth="1.8"
        />
        <path
          d="M21 78C18.5 78 17 80 17 82C17 84 18.5 86 21 86"
          stroke="#24364B"
          strokeWidth="1.8"
        />
        {/* Heart on mug */}
        <path
          d="M28.5 81C28.5 81 26 79 26 77.5C26 76.5 26.8 76 27.5 76C28 76 28.3 76.3 28.5 76.6C28.7 76.3 29 76 29.5 76C30.2 76 31 76.5 31 77.5C31 79 28.5 81 28.5 81Z"
          fill="#F8C9D4"
        />

        {/* Laptop Screen */}
        <path
          d="M50 68L78 68L76 83L48 83Z"
          fill="#B9D9F5"
          stroke="#24364B"
          strokeWidth="2"
        />
        {/* Heart logo on laptop back */}
        <path
          d="M63 75.5C63 75.5 60.5 73.5 60.5 72C60.5 71 61.3 70.5 62 70.5C62.5 70.5 62.8 70.8 63 71.1C63.2 70.8 63.5 70.5 64 70.5C64.7 70.5 65.5 71 65.5 72C65.5 73.5 63 75.5 63 75.5Z"
          fill="#FFFFFF"
        />

        {/* Laptop Base */}
        <path
          d="M44 83L80 83L84 88L40 88Z"
          fill="#D7EAFB"
          stroke="#24364B"
          strokeWidth="2"
        />

        {/* Table line */}
        <line x1="10" y1="88" x2="100" y2="88" stroke="#24364B" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/**
 * Pastel 3D Folder Icon for Desktop shortcuts
 */
export function PastelFolder({
  variant = 'blue',
  badge = 'heart',
  size = 52,
  className,
}: {
  variant?: 'blue' | 'yellow' | 'pink' | 'mint' | 'lavender';
  badge?: 'heart' | 'cloud' | 'star' | 'sprout' | 'book';
  size?: number;
  className?: string;
}) {
  const colors = {
    blue: { back: '#A3CBF0', front: '#B9D9F5', stroke: '#75A9D6' },
    yellow: { back: '#F7DB8A', front: '#FFE9A8', stroke: '#E8BE54' },
    pink: { back: '#F3B4C2', front: '#F8C9D4', stroke: '#E88B9F' },
    mint: { back: '#BFDEBF', front: '#D6EAD6', stroke: '#9BC79B' },
    lavender: { back: '#D5C7F0', front: '#E6DDF8', stroke: '#B6A1DF' },
  }[variant];

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={(size * 44) / 52}
        viewBox="0 0 52 44"
        fill="none"
        aria-hidden="true"
      >
        {/* Back tab */}
        <path
          d="M4 10C4 7.8 5.8 6 8 6H19L24 11H44C46.2 11 48 12.8 48 15V36C48 38.2 46.2 40 44 40H8C5.8 40 4 38.2 4 36V10Z"
          fill={colors.back}
          stroke={colors.stroke}
          strokeWidth="2"
        />
        {/* Front flap with 3D inset */}
        <path
          d="M4 17C4 14.8 5.8 13 8 13H44C46.2 13 48 14.8 48 17V36C48 38.2 46.2 40 44 40H8C5.8 40 4 38.2 4 36V17Z"
          fill={colors.front}
          stroke={colors.stroke}
          strokeWidth="2"
        />
        {/* Highlight sheen */}
        <path
          d="M8 16H44"
          stroke="#FFFFFF"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.8"
        />
      </svg>
      {/* Center Mini-Badge */}
      <div className="absolute inset-0 flex items-center justify-center pt-2">
        {badge === 'heart' && (
          <span className="text-sm drop-shadow-xs" aria-hidden="true">
            🤍
          </span>
        )}
        {badge === 'cloud' && (
          <span className="text-sm drop-shadow-xs" aria-hidden="true">
            ☁️
          </span>
        )}
        {badge === 'star' && (
          <span className="text-sm drop-shadow-xs" aria-hidden="true">
            ⭐
          </span>
        )}
        {badge === 'sprout' && (
          <span className="text-sm drop-shadow-xs" aria-hidden="true">
            🌱
          </span>
        )}
        {badge === 'book' && (
          <span className="text-sm drop-shadow-xs" aria-hidden="true">
            📖
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Sticky note with realistic washi tape
 */
export function StickyNoteWidget({
  title,
  message,
  signature = '@haruverse ♡',
  variant = 'yellow',
  className,
}: {
  title?: string;
  message: string;
  signature?: string;
  variant?: 'yellow' | 'pink' | 'mint' | 'blue';
  className?: string;
}) {
  const bgStyles = {
    yellow: 'bg-[#FFE9A8] text-[#24364B]',
    pink: 'bg-[#F8C9D4] text-[#24364B]',
    mint: 'bg-[#D6EAD6] text-[#24364B]',
    blue: 'bg-[#D7EAFB] text-[#24364B]',
  }[variant];

  const tapeColors = {
    yellow: 'bg-[#FFF2C2]',
    pink: 'bg-[#FCE0E7]',
    mint: 'bg-[#E5F4E5]',
    blue: 'bg-[#E5F1FC]',
  }[variant];

  return (
    <div
      className={cn(
        'relative rounded-xl p-4 shadow-sticky transition-transform duration-200 hover:rotate-0 hover:scale-[1.02]',
        bgStyles,
        className
      )}
    >
      {/* Washi tape on top */}
      <div
        className={cn(
          'absolute -top-2.5 left-1/2 h-4 w-16 -translate-x-1/2 -rotate-1 rounded-xs border-x border-dashed border-white/80 opacity-90 shadow-xs pointer-events-none',
          tapeColors
        )}
      />
      {title && <p className="mb-1 font-heading text-xs font-bold uppercase tracking-wider">{title}</p>}
      <p className="font-heading text-xs font-medium leading-relaxed sm:text-sm whitespace-pre-line">
        {message}
      </p>
      {signature && (
        <p className="mt-2 text-right font-sans text-[11px] font-bold text-[#6C7C91]">
          {signature}
        </p>
      )}
    </div>
  );
}
