import type { IFile } from './file.type';

// Admin API for the RVB bot (isX only): /admin/rvb-*.

export interface IRvbPlan {
  id: string;
  code: string;
  /** Telegram Stars. */
  price: number;
  credits: number;
  /** Percent, display only. */
  discount: number | null;
  isActive: boolean;
  isRecommended: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateRvbPlanDto = {
  code: string;
  price: number;
  credits: number;
  discount?: number | null;
  isActive?: boolean;
};

export type UpdateRvbPlanDto = Partial<CreateRvbPlanDto>;

/** Compact user, embedded in payments and generations. */
export interface IRvbUserShort {
  id: string;
  telegramId: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
}

export interface IRvbUser extends IRvbUserShort {
  languageCode: string | null;
  languageUI: string | null;
  country: string | null;
  credits: number;
  /** The user blocked the bot. */
  isBlocked: boolean;
  /** Has an active generation (uploaded a photo at least once). */
  started: boolean;
  activeGenerationId: string | null;
  /** Acquisition ref. */
  ref: string | null;
  lastActivityAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IRvbDeeplink {
  acquisitionDeeplink: string | null;
  acquisitionRef: string | null;
  acquisitionPostId: string | null;
  acquisitionAt: string;
  lastDeeplink: string;
  lastRef: string | null;
  lastPostId: string | null;
  lastDeeplinkAt: string;
}

export interface IRvbUserPayment {
  id: string;
  /** Telegram Stars. */
  amount: number;
  ref: string | null;
  plan: IRvbPlan | null;
  createdAt: string;
}

export interface IRvbUserDetails extends IRvbUser {
  deeplink: IRvbDeeplink | null;
  /** Newest first. */
  payments: IRvbUserPayment[];
  /** Telegram Stars. */
  totalPaid: number;
  generationsCount: number;
}

export type UpdateRvbUserDto = {
  credits?: number;
};

export interface IRvbPayment {
  id: string;
  /** Telegram Stars. */
  amount: number;
  ref: string | null;
  telegramChargeId: string;
  user: IRvbUserShort | null;
  plan: IRvbPlan | null;
  createdAt: string;
}

export enum RvbGenerationType {
  Video = 'video',
  VideoSound = 'video_sound',
  VideoPair = 'video_pair',
  VideoPairSound = 'video_pair_sound',
  PhotoEdit = 'photo_edit',
}

export enum RvbGenerationStatus {
  /** Being set up by the user. */
  Pending = 'pending',
  /** Paid and queued or running. */
  Processing = 'processing',
  Ready = 'ready',
  /** Failed and refunded. */
  Failed = 'failed',
}

export interface IRvbGeneration {
  id: string;
  /** null until the user picks a type. */
  type: RvbGenerationType | null;
  status: RvbGenerationStatus;
  /** Price, credits. */
  credits: number;
  resolution: number | null;
  /** Seconds. */
  duration: number | null;
  aspectRatio: string | null;
  user: IRvbUserShort | null;
  prompt: { id: string; name: string } | null;
  /** First photo. */
  ref1: IFile | null;
  /** Second photo. */
  ref2: IFile | null;
  /** Result video. */
  video: IFile | null;
  /** Result photo. */
  photo: IFile | null;
  createdAt: string;
  updatedAt: string;
}
