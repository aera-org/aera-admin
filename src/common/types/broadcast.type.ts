export interface BroadcastFilters {
  lastVisitedBefore?: Date;
  lastVisitedAfter?: Date;
  subscribed?: boolean;
  userIds?: string[];
  /** isX: promote the rvb bot to users not yet notified, in random order. */
  rvb?: boolean;
  /** Max number of recipients. */
  amount?: number;
}

export enum MessageActionType {
  Callback = 'cb',
  Url = 'url',
  App = 'app',
}

interface BroadcastMessage {
  imgId?: string;
  videoId?: string;
  text: string;
  actions?: {
    text: string;
    value: string;
    type: MessageActionType;
  }[];
}

export interface BroadcastDto {
  message: BroadcastMessage;
  filters: BroadcastFilters;
}

export interface BroadcastCountResponse {
  count: number;
}
