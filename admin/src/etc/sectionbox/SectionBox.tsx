import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import '@/styles/scss/components/section.scss';

type FooterAlign = 'right' | 'center' | 'between' | 'left';

interface SectionBoxProps extends HTMLAttributes<HTMLDivElement> {
  /** 박스 상단 타이틀 (.sectionTitle) */
  title?: ReactNode;
  /** 타이틀 옆 보조 문구 (.subText) */
  subText?: ReactNode;
  /** 박스 하단 버튼 영역 (.btnArea) */
  footer?: ReactNode;
  /** 하단 버튼 정렬 (기본: right) */
  footerAlign?: FooterAlign;
  children: ReactNode;
}

function SectionBox({
  title,
  subText,
  footer,
  footerAlign = 'right',
  className,
  children,
  ...rest
}: SectionBoxProps) {
  return (
    <div className={cn('sectionBox', className)} {...rest}>
      {title && (
        <h3 className="sectionTitle">
          {title}
          {subText && <span className="subText">{subText}</span>}
        </h3>
      )}
      {children}
      {footer && (
        <div className={cn('btnArea', footerAlign !== 'right' && footerAlign)}>
          {footer}
        </div>
      )}
    </div>
  );
}

export default SectionBox;
export type { SectionBoxProps };
