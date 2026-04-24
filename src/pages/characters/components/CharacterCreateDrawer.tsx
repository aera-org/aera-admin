import { useNavigate } from 'react-router-dom';

import { useCreateCharacter } from '@/app/characters';

import {
  CharacterFormDrawer,
  DEFAULT_CHARACTER_FORM_VALUES,
} from './CharacterFormDrawer';

type CharacterCreateDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CharacterCreateDrawer({
  open,
  onOpenChange,
}: CharacterCreateDrawerProps) {
  const navigate = useNavigate();
  const createMutation = useCreateCharacter();

  return (
    <CharacterFormDrawer
      open={open}
      title="Create character"
      submitLabel="Create"
      initialValues={DEFAULT_CHARACTER_FORM_VALUES}
      onOpenChange={onOpenChange}
      isSubmitting={createMutation.isPending}
      onSubmit={async (values) => {
        const result = await createMutation.mutateAsync({
          name: values.name,
          emoji: values.emoji,
          gender: values.gender,
          age: values.age ? Number(values.age) : undefined,
          hairColor: values.hairColor,
          hairStyle: values.hairStyle,
          eyeColor: values.eyeColor,
          ethnicity: values.ethnicity,
          bodyType: values.bodyType,
          breastSize: values.breastSize,
          loraId: values.loraId,
          description: values.description,
          avatarId: values.avatarId,
          isFeatured: values.isFeatured,
          promoImgId: values.promoImgId || undefined,
        });

        onOpenChange(false);
        if (result?.id) {
          navigate(`/characters/${result.id}`);
        }
      }}
    />
  );
}
