export type UpdateTgUser = {
  isBlocked?: boolean;
  subscribedUntil?: string;
};

export interface ITgUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  isBlocked: boolean;
  subscribedUntil?: string | null;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}
