import { useSaveImgGeneration } from '@/app/img-generations';
import { SaveIcon } from '@/assets/icons';
import { IconButton } from '@/atoms';

type SaveGenerationButtonProps = {
  id?: string;
  isSaved?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

export function SaveGenerationButton({
  id,
  isSaved = false,
  disabled = false,
  size = 'sm',
}: SaveGenerationButtonProps) {
  const saveMutation = useSaveImgGeneration();
  const isDisabled = !id || isSaved || disabled || saveMutation.isPending;
  const label = isSaved ? 'Saved' : 'Save generation';

  return (
    <IconButton
      aria-label={label}
      tooltip={label}
      variant="ghost"
      size={size}
      icon={<SaveIcon />}
      loading={saveMutation.isPending}
      disabled={isDisabled}
      onClick={(event) => {
        event.stopPropagation();
        if (!id || isDisabled) return;
        saveMutation.mutate(id);
      }}
    />
  );
}
