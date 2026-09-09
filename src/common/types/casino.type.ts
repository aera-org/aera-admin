export enum CasinoChatItemType {
  Human = 'human',
  Ai = 'ai',
  Event = 'event',
}

interface CasinoChatItemBase {
  id: string;
  type: CasinoChatItemType;
  content?: string;
  createdAt: string;
}

interface CasinoChatItemHuman extends CasinoChatItemBase {
  type: CasinoChatItemType.Human;
  content: string;
}

interface CasinoChatItemAi extends CasinoChatItemBase {
  type: CasinoChatItemType.Ai;
  content: string;
}

export enum CasinoChatItemEventType {
  RegisterSuggestion = 'register_suggestion',
  RegisterSuccess = 'register_success',
  ChatCompacted = 'chat_compacted',
  SignupSuggestion = 'signup_suggestion',
  SignupSuccess = 'signup_success',
  DepositSuggestion = 'deposit_suggestion',
  DepositSuccess = 'deposit_success',
  WinSuggestion = 'win_suggestion',
  WinSuccess = 'win_success',
  ShowedPhoto = 'showed_photo',
  ShowedVideo = 'showed_video',
  LevelUp = 'level_up',
  Ping = 'ping',
  LevelNudge = 'level_nudge',
}

export interface CasinoChatItemEvent extends CasinoChatItemBase {
  type: CasinoChatItemType.Event;
  event: CasinoChatItemEventType;
  mediaId?: string;
  instruction?: string;
}

export type CasinoChatItem =
  | CasinoChatItemHuman
  | CasinoChatItemAi
  | CasinoChatItemEvent;

export type CasinoOrder = 'ASC' | 'DESC';
export type CasinoOrderBy = 'createdAt' | 'messagesCount';

export interface CasinoChatsQuery {
  level?: number;
  from?: string;
  to?: string;
  username?: string;
}

export type ChatsQuery = CasinoChatsQuery;

export interface CasinoChatsListParams extends CasinoChatsQuery {
  orderBy?: CasinoOrderBy;
  order?: CasinoOrder;
  skip?: number;
  take?: number;
}

export interface CasinoChatsAnalyticsQuery {
  level?: number;
  from?: string;
  to?: string;
}

export type ChatsAnalyticsQuery = CasinoChatsAnalyticsQuery;

export interface CasinoAnalytics {
  chatsTotal: number;
  chatsLevels: Record<number, number>;
  msgTotal: number;
  msgLevels: Record<number, number>;
  users: number;
}

export interface CasinoChat {
  id: string;
  level: number;
  user: {
    id: string;
    username?: string | null;
  };
  createdAt: string;
  messagesCount: number;
}

export interface CasinoChatDetails extends CasinoChat {
  history: CasinoChatItem[];
}
