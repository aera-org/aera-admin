import type { MouseEvent, ReactNode } from 'react';
import { useState } from 'react';

import { downloadFile } from '@/app/files/downloadFile';
import { notifyError } from '@/app/toast';
import { DownloadIcon } from '@/assets/icons';
import { IconButton } from '@/atoms';
import type { IFile } from '@/common/types';

type DownloadableFile = Pick<IFile, 'id' | 'name' | 'url'>;

type DownloadFileButtonProps = {
  file?: DownloadableFile | null;
  fallbackName?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'text';
  tooltip?: ReactNode;
  'aria-label': string;
  stopPropagation?: boolean;
};

export function DownloadFileButton({
  file,
  fallbackName,
  disabled,
  className,
  size = 'sm',
  variant = 'ghost',
  tooltip = 'Download',
  stopPropagation = false,
  'aria-label': ariaLabel,
}: DownloadFileButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const isDisabled = disabled || isDownloading || (!file?.id && !file?.url);

  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    if (stopPropagation) {
      event.stopPropagation();
    }
    if (!file || isDisabled) return;

    setIsDownloading(true);
    try {
      await downloadFile({
        id: file.id,
        url: file.url,
        fileName: file.name,
        fallbackName,
      });
    } catch (error) {
      notifyError(error, 'Unable to download file.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <IconButton
      aria-label={ariaLabel}
      className={className}
      disabled={isDisabled}
      icon={<DownloadIcon />}
      loading={isDownloading}
      onClick={handleClick}
      size={size}
      tooltip={tooltip}
      variant={variant}
    />
  );
}
