import { PencilLineIcon } from '@/assets/icons';
import { Badge, Field, FormRow, IconButton, Typography } from '@/atoms';
import type { ICharacterDetails } from '@/common/types';

import {
  formatCharacterPersonalities,
  getBodyTypeLabel,
  getBreastSizeLabel,
  getEthnicityLabel,
  getEyeColorLabel,
  getHairColorLabel,
  getHairStyleLabel,
} from '../characterAttributeOptions';
import s from '../CharacterDetailsPage.module.scss';


type CharacterOverviewProps = {
  data: ICharacterDetails | undefined;
  formatDate: (value: string | null | undefined) => string;
  formatValue: (value: string | null | undefined) => string;
  loraLabel: string;
  onEdit: () => void;
  canEdit: boolean;
};

export function CharacterOverview({
  data,
  formatValue,
  loraLabel,
  onEdit,
  canEdit,
}: CharacterOverviewProps) {
  const description = data?.description?.trim() ?? '';
  const avatarName = data?.name ?? 'Character';
  const promoImageUrl = data?.promoImg?.url ?? '';

  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <Typography variant="h3">Overview</Typography>
        <span className={s.sectionEdit}>
          <IconButton
            aria-label="Edit overview"
            icon={<PencilLineIcon />}
            tooltip="Edit"
            variant="ghost"
            size="sm"
            onClick={onEdit}
            disabled={!canEdit}
          />
        </span>
      </div>
      <FormRow columns={3}>
        <Field label="Name" labelFor="character-name">
          <Typography id="character-name" variant="body">
            {data?.name ?? '-'}
          </Typography>
        </Field>
        <Field label="Emoji" labelFor="character-emoji">
          <Typography id="character-emoji" variant="body">
            {data?.emoji || '-'}
          </Typography>
        </Field>

        <Field
          className={s.statusField}
          label="Status"
          labelFor="character-status"
        >
          {data ? (
            <Badge tone={data.isActive ? 'success' : 'warning'}>
              {data.isActive ? 'Active' : 'Inactive'}
            </Badge>
          ) : (
            <Typography id="character-status" variant="body">
              -
            </Typography>
          )}
        </Field>
      </FormRow>

      <FormRow columns={3}>
        <Field label="Description" labelFor="character-description">
          <Typography
            id="character-description"
            variant="body"
            className={s.multiline}
          >
            {description || '-'}
          </Typography>
        </Field>
        <Field label="LoRA" labelFor="character-lora">
          <Typography id="character-lora" variant="body">
            {loraLabel}
          </Typography>
        </Field>

        <Field label="Featured" labelFor="character-featured">
          {data ? (
            <Badge tone={data.isFeatured ? 'accent' : 'warning'}>
              {data.isFeatured ? 'Featured' : 'Not featured'}
            </Badge>
          ) : (
            <Typography id="character-featured" variant="body">
              -
            </Typography>
          )}
        </Field>
      </FormRow>

      <FormRow columns={3}>
        <Field label="Avatar" labelFor="character-avatar">
          {data ? (
            <img
              id="character-avatar"
              className={s.promoImage}
              src={data?.avatar?.url ?? undefined}
              alt={`${avatarName} promo`}
              loading="lazy"
            />
          ) : (
            <Typography id="character-avatar" variant="body">
              -
            </Typography>
          )}
        </Field>
        <Field label="Promo image" labelFor="character-promo-image">
          {promoImageUrl ? (
            <img
              id="character-promo-image"
              className={s.promoImage}
              src={promoImageUrl}
              alt={`${avatarName} promo`}
              loading="lazy"
            />
          ) : (
            <div id="character-promo-image" className={s.promoImagePlaceholder}>
              <Typography variant="caption" tone="muted">
                No image
              </Typography>
            </div>
          )}
        </Field>

        <Field label="Gender" labelFor="character-gender">
          <Typography id="character-gender" variant="body">
            {formatValue(data?.gender)}
          </Typography>
        </Field>
      </FormRow>

      <FormRow columns={3}>
        <Field label="Age" labelFor="character-age">
          <Typography id="character-age" variant="body">
            {data?.age ?? '-'}
          </Typography>
        </Field>
        <Field label="Hair color" labelFor="character-hair-color">
          <Typography id="character-hair-color" variant="body">
            {getHairColorLabel(data?.hairColor)}
          </Typography>
        </Field>
        <Field label="Hair style" labelFor="character-hair-style">
          <Typography id="character-hair-style" variant="body">
            {getHairStyleLabel(data?.hairStyle)}
          </Typography>
        </Field>
      </FormRow>

      <FormRow columns={3}>
        <Field label="Eye color" labelFor="character-eye-color">
          <Typography id="character-eye-color" variant="body">
            {getEyeColorLabel(data?.eyeColor)}
          </Typography>
        </Field>
        <Field label="Ethnicity" labelFor="character-ethnicity">
          <Typography id="character-ethnicity" variant="body">
            {getEthnicityLabel(data?.ethnicity)}
          </Typography>
        </Field>
        <Field label="Body type" labelFor="character-body-type">
          <Typography id="character-body-type" variant="body">
            {getBodyTypeLabel(data?.bodyType)}
          </Typography>
        </Field>
      </FormRow>

      <FormRow columns={3}>
        <Field label="Breast size" labelFor="character-breast-size">
          <Typography id="character-breast-size" variant="body">
            {getBreastSizeLabel(data?.breastSize)}
          </Typography>
        </Field>
          <Field label="Personality" labelFor="character-personality">
            <Typography id="character-personality" variant="body">
              {formatCharacterPersonalities(data?.personality)}
            </Typography>
          </Field>
      </FormRow>
    </div>
  );
}
