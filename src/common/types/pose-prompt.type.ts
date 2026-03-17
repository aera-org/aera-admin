export interface IPosePrompt {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface IPosePromptDetails extends IPosePrompt {
  meta: {
    pose: string;
    details: string;
    angle: string;
  };
  prompt: string;
}

export type CreatePosePromptDto = {
  name: string;
  meta: {
    pose: string;
    details: string;
    angle: string;
  };
  prompt: string;
};

export type UpdatePosePromptDto = {
  name: string;
  meta: {
    pose: string;
    details: string;
    angle: string;
  };
  prompt: string;
};
