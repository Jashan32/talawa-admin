import type { User } from '../User/type';
import type { Organization } from 'types/Organization/type';

export type DirectMessage = {
  id: string;
  createdAt: Date;
  creator: {
    id: string;
    name: string;
    emailAddress: string;
  };
  body: string;
  parentMessage?: DirectMessage;
  updatedAt?: Date;
};

export type GroupChat = {
  id: string;
  name: string;
  description?: string;
  avatarURL?: string;
  avatarMimeType?: string;
  createdAt: Date;
  updatedAt?: Date;
  creator: {
    id: string;
    name: string;
    emailAddress: string;
  };
  messages: {
    edges: Array<{
      node: DirectMessage;
    }>;
  };
  organization: {
    id: string;
    name: string;
  };
  members: {
    edges: Array<{
      node: {
        id: string;
        name: string;
        emailAddress: string;
        avatarURL?: string;
      };
    }>;
  };
  // Legacy properties for backward compatibility
  _id?: string;
  isGroup?: boolean;
  image?: string;
  admins?: User[];
  users?: User[];
  unseenMessagesByUsers?: string;
  lastMessageId?: string;
};

export type ChatInput = {
  organizationId: string;
  name: string;
  description?: string;
  avatar?: File;
};
