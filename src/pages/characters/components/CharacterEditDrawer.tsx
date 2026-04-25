import { useMemo } from 'react';

import { useUpdateCharacter } from '@/app/characters';
import {
  CharacterBodyType,
  CharacterBreastSize,
  CharacterEthnicity,
  CharacterEyeColor,
  CharacterHairColor,
  CharacterHairStyle,
  CharacterType,
  type ICharacterDetails,
} from '@/common/types';

import {
  CharacterFormDrawer,
  type CharacterFormValues,
} from './CharacterFormDrawer';

const isPersonalityEnabled = import.meta.env.VITE_PERSONALITY_ON === 'true';

type CharacterEditDrawerProps = {
  character: ICharacterDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CharacterEditDrawer({
  character,
  open,
  onOpenChange,
}: CharacterEditDrawerProps) {
  const updateMutation = useUpdateCharacter();

  const initialValues = useMemo<CharacterFormValues>(() => {
    if (!character) {
      return {
        name: '',
        emoji: '',
        type: CharacterType.Realistic,
        gender: 'female',
        age: '',
        hairColor: CharacterHairColor.Blond,
        hairStyle: CharacterHairStyle.Straight,
        eyeColor: CharacterEyeColor.Brown,
        ethnicity: CharacterEthnicity.Caucasian,
        bodyType: CharacterBodyType.Average,
        breastSize: CharacterBreastSize.Medium,
        isActive: true,
        isFeatured: false,
        loraId: '',
        description: '',
        personality: [],
        avatarId: '',
        promoImgId: '',
      };
    }

    return {
      name: character.name ?? '',
      emoji: character.emoji ?? '',
      type: character.type,
      gender: character.gender ?? '',
      age: character.age ? String(character.age) : '',
      hairColor: character.hairColor,
      hairStyle: character.hairStyle,
      eyeColor: character.eyeColor,
      ethnicity: character.ethnicity,
      bodyType: character.bodyType,
      breastSize: character.breastSize,
      isActive: character.isActive,
      isFeatured: Boolean(character.isFeatured),
      loraId: character.lora?.id ?? '',
      description: character.description ?? '',
      personality: character.personality ?? [],
      avatarId: character.avatar?.id ?? '',
      promoImgId: character.promoImg?.id ?? '',
    };
  }, [character]);

  if (!character) return null;

  return (
    <CharacterFormDrawer
      open={open}
      title="Edit character"
      submitLabel="Save"
      initialValues={initialValues}
      initialAvatarFile={character.avatar ?? null}
      initialPromoFile={character.promoImg ?? null}
      initialLoraOption={
        character.lora
          ? {
              id: character.lora.id,
              fileName: character.lora.fileName,
            }
          : null
      }
      onOpenChange={onOpenChange}
      isSubmitting={updateMutation.isPending}
      requireDirty
      showStatus
      showPersonality={isPersonalityEnabled}
      onSubmit={async (values) => {
        await updateMutation.mutateAsync({
          id: character.id,
          payload: {
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
            isActive: values.isActive,
            isFeatured: values.isFeatured,
            loraId: values.loraId,
            description: values.description,
            personality: values.personality,
            avatarId: values.avatarId,
            promoImgId: values.promoImgId || undefined,
          },
        });

        onOpenChange(false);
      }}
    />
  );
}
