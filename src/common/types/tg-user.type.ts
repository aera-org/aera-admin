export type UpdateTgUser = {
  isBlocked?: boolean;
  subscribedUntil?: string;
  fuel?: number;
  air?: number;
};

export interface ITgUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  air: number;
  fuel: number;
  isBlocked: boolean;
  subscribedUntil?: string | null;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}
