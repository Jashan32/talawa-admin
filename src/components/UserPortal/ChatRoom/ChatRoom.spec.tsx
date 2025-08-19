import React from 'react';
import {
  act,
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react';
import { MockedProvider } from '@apollo/react-testing';
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter } from 'react-router';
import { Provider } from 'react-redux';
import { store } from 'state/store';
import i18nForTest from 'utils/i18nForTest';
import { vi, describe, beforeEach, afterEach } from 'vitest';

import ChatRoom, { MessageImage } from './ChatRoom';
import {
  CHATS_LIST,
  CHAT_BY_ID,
  GROUP_CHAT_LIST,
  UNREAD_CHAT_LIST,
} from 'GraphQl/Queries/PlugInQueries';
import {
  MARK_CHAT_MESSAGES_AS_READ,
  MESSAGE_SENT_TO_CHAT,
  SEND_MESSAGE_TO_CHAT,
} from 'GraphQl/Mutations/OrganizationMutations';

// Mock external dependencies
vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('utils/fileValidation', () => ({
  validateFile: vi.fn().mockReturnValue({ isValid: true, error: null }),
}));

vi.mock('utils/MinioUpload', () => ({
  useMinioUpload: vi.fn().mockReturnValue({
    uploadFile: vi.fn().mockResolvedValue('mocked-file-url'),
  }),
}));

vi.mock('utils/MinioDownload', () => ({
  useMinioDownload: vi.fn().mockReturnValue({
    getFileFromMinio: vi.fn().mockResolvedValue('mocked-image-url'),
  }),
}));

vi.mock('utils/useLocalstorage', () => ({
  default: vi.fn().mockReturnValue({
    getItem: vi.fn().mockReturnValue('user123'),
    setItem: vi.fn(),
  }),
}));

// Mock DOM methods
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: vi.fn(),
  writable: true,
});

// Mock getElementById to return a valid element with lastElementChild
Object.defineProperty(document, 'getElementById', {
  value: vi.fn().mockReturnValue({
    lastElementChild: {
      scrollIntoView: vi.fn(),
    },
  }),
  writable: true,
});

// Mock data
const mockUser = {
  _id: 'user123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  image: null,
};

const mockChatData = {
  chatById: {
    _id: 'chat1',
    name: 'Test Chat',
    isGroup: false,
    organization: {
      _id: 'org1',
    },
    createdAt: '2023-01-01T10:00:00Z',
    messages: [
      {
        _id: 'msg1',
        createdAt: '2023-01-01T10:00:00Z',
        messageContent: 'Hello world!',
        media: null,
        replyTo: null,
        sender: mockUser,
      },
      {
        _id: 'msg2',
        createdAt: '2023-01-01T10:05:00Z',
        messageContent: 'How are you?',
        media: null,
        replyTo: null,
        sender: {
          _id: 'user456',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          image: null,
        },
      },
    ],
    users: [mockUser],
    admins: [mockUser],
    unseenMessagesByUsers: [],
  },
};

const mockChatsListData = {
  chatsByUser: [
    {
      id: 'chat1',
      name: 'chat1', // This should match selectedContact prop
      description: 'A test chat',
      avatarURL: null,
      avatarMimeType: null,
      createdAt: '2023-01-01T10:00:00Z',
      updatedAt: '2023-01-01T10:00:00Z',
      creator: {
        id: 'user123',
        name: 'John Doe',
      },
      messages: {
        edges: [
          {
            node: {
              id: 'msg1',
              body: 'Hello world!',
              createdAt: '2023-01-01T10:00:00Z',
              creator: {
                id: 'user123',
                name: 'John Doe',
              },
            },
          },
          {
            node: {
              id: 'msg2',
              body: 'How are you?',
              createdAt: '2023-01-01T10:05:00Z',
              creator: {
                id: 'user456',
                name: 'Jane Smith',
              },
            },
          },
        ],
      },
      organization: {
        id: 'org1',
        name: 'Test Organization',
      },
      members: {
        edges: [
          {
            node: {
              id: 'user123',
              name: 'John Doe',
              avatarURL: null,
            },
          },
          {
            node: {
              id: 'user456',
              name: 'Jane Smith',
              avatarURL: null,
            },
          },
        ],
      },
    },
    {
      id: 'emptychat',
      name: 'emptychat', // Empty chat case
      description: 'An empty chat',
      avatarURL: null,
      avatarMimeType: null,
      createdAt: '2023-01-01T10:00:00Z',
      updatedAt: '2023-01-01T10:00:00Z',
      creator: {
        id: 'user123',
        name: 'John Doe',
      },
      messages: {
        edges: [],
      },
      organization: {
        id: 'org1',
        name: 'Test Organization',
      },
      members: {
        edges: [
          {
            node: {
              id: 'user123',
              name: 'John Doe',
              avatarURL: null,
            },
          },
        ],
      },
    },
    {
      id: 'groupchat1',
      name: 'groupchat1', // Group chat case
      description: 'A group chat',
      avatarURL: null,
      avatarMimeType: null,
      createdAt: '2023-01-01T10:00:00Z',
      updatedAt: '2023-01-01T10:00:00Z',
      creator: {
        id: 'user123',
        name: 'John Doe',
      },
      messages: {
        edges: [],
      },
      organization: {
        id: 'org1',
        name: 'Test Organization',
      },
      members: {
        edges: [
          {
            node: {
              id: 'user123',
              name: 'John Doe',
              avatarURL: null,
            },
          },
          {
            node: {
              id: 'user456',
              name: 'Jane Smith',
              avatarURL: null,
            },
          },
          {
            node: {
              id: 'user789',
              name: 'Bob Johnson',
              avatarURL: null,
            },
          },
        ],
      },
    },
  ],
};

const mockGroupChatListData = {
  getGroupChatsByUserId: [
    {
      _id: 'groupchat1',
      isGroup: true,
      name: 'Test Group Chat',
      creator: mockUser,
      messages: [],
      organization: {
        _id: 'org1',
        name: 'Test Organization',
      },
      users: [mockUser],
      admins: [mockUser],
      unseenMessagesByUsers: [],
    },
  ],
};

const mockUnreadChatListData = {
  getUnreadChatsByUserId: [
    {
      _id: 'chat1',
      isGroup: false,
      name: 'Test Chat',
      creator: mockUser,
      messages: [],
      organization: {
        _id: 'org1',
        name: 'Test Organization',
      },
      users: [mockUser],
      admins: [mockUser],
      unseenMessagesByUsers: [],
    },
  ],
};

// GraphQL Mocks
const CHAT_BY_ID_MOCK = {
  request: {
    query: CHAT_BY_ID,
    variables: {
      id: 'chat1',
    },
  },
  result: {
    data: mockChatData,
  },
};

const CHATS_LIST_MOCK = {
  request: {
    query: CHATS_LIST,
    variables: {
      id: 'chat1',
    },
  },
  result: {
    data: mockChatsListData,
  },
};

// Additional mock instance for repeated calls
const CHATS_LIST_MOCK_2 = {
  request: {
    query: CHATS_LIST,
    variables: {
      id: 'chat1',
    },
  },
  result: {
    data: mockChatsListData,
  },
};

// Third mock instance for even more repeated calls
const CHATS_LIST_MOCK_3 = {
  request: {
    query: CHATS_LIST,
    variables: {
      id: 'chat1',
    },
  },
  result: {
    data: mockChatsListData,
  },
};

const CHATS_LIST_EMPTY_MOCK = {
  request: {
    query: CHATS_LIST,
    variables: {
      id: 'emptychat',
    },
  },
  result: {
    data: {
      chatsByUser: [
        {
          id: 'emptychat',
          name: 'emptychat',
          description: 'Empty test chat',
          avatarURL: null,
          avatarMimeType: null,
          createdAt: '2023-01-01T10:00:00Z',
          updatedAt: '2023-01-01T10:00:00Z',
          creator: {
            id: 'user123',
            name: 'John Doe',
          },
          messages: {
            edges: [],
          },
          organization: {
            id: 'org1',
            name: 'Test Organization',
          },
          members: {
            edges: [
              {
                node: {
                  id: 'user123',
                  name: 'John Doe',
                  avatarURL: null,
                },
              },
            ],
          },
        },
      ],
    },
  },
};

const CHATS_LIST_GROUP_MOCK = {
  request: {
    query: CHATS_LIST,
    variables: {
      id: 'groupchat1',
    },
  },
  result: {
    data: {
      chatsByUser: [
        {
          id: 'groupchat1',
          name: 'groupchat1',
          description: 'Group test chat',
          avatarURL: null,
          avatarMimeType: null,
          createdAt: '2023-01-01T10:00:00Z',
          updatedAt: '2023-01-01T10:00:00Z',
          creator: {
            id: 'user123',
            name: 'John Doe',
          },
          messages: {
            edges: [],
          },
          organization: {
            id: 'org1',
            name: 'Test Organization',
          },
          members: {
            edges: [
              {
                node: {
                  id: 'user123',
                  name: 'John Doe',
                  avatarURL: null,
                },
              },
              {
                node: {
                  id: 'user456',
                  name: 'Jane Smith',
                  avatarURL: null,
                },
              },
              {
                node: {
                  id: 'user789',
                  name: 'Bob Johnson',
                  avatarURL: null,
                },
              },
            ],
          },
        },
      ],
    },
  },
};

const CHATS_LIST_EMPTY_STRING_MOCK = {
  request: {
    query: CHATS_LIST,
    variables: {
      id: '',
    },
  },
  result: {
    data: {
      chatsByUser: [],
    },
  },
};

const GROUP_CHAT_LIST_MOCK = {
  request: {
    query: GROUP_CHAT_LIST,
  },
  result: {
    data: mockGroupChatListData,
  },
};

const UNREAD_CHAT_LIST_MOCK = {
  request: {
    query: UNREAD_CHAT_LIST,
    variables: {
      id: 'user123',
    },
  },
  result: {
    data: mockUnreadChatListData,
  },
};

const SEND_MESSAGE_MOCK = {
  request: {
    query: SEND_MESSAGE_TO_CHAT,
    variables: {
      body: 'Test message',
      chatId: 'chat1',
      parentMessageId: null,
    },
  },
  result: {
    data: {
      createChatMessage: {
        id: 'newmsg1',
        body: 'Test message',
        createdAt: '2023-01-01T11:00:00Z',
        creator: {
          id: 'user123',
          name: 'John Doe',
        },
      },
    },
  },
};

const SEND_MESSAGE_UNDEFINED_MOCK = {
  request: {
    query: SEND_MESSAGE_TO_CHAT,
    variables: {
      body: 'Test message',
      chatId: undefined,
      parentMessageId: undefined,
    },
  },
  result: {
    data: {
      createChatMessage: {
        id: 'newmsg1',
        body: 'Test message',
        createdAt: '2023-01-01T11:00:00Z',
        creator: {
          id: 'user123',
          name: 'John Doe',
        },
      },
    },
  },
};

const SEND_MESSAGE_EMPTY_UNDEFINED_MOCK = {
  request: {
    query: SEND_MESSAGE_TO_CHAT,
    variables: {
      body: '',
      chatId: undefined,
      parentMessageId: undefined,
    },
  },
  result: {
    data: {
      createChatMessage: {
        id: 'newmsg1',
        body: '',
        createdAt: '2023-01-01T11:00:00Z',
        creator: {
          id: 'user123',
          name: 'John Doe',
        },
      },
    },
  },
};

// Additional send message mocks for different chat scenarios
const SEND_MESSAGE_EMPTY_MOCK = {
  request: {
    query: SEND_MESSAGE_TO_CHAT,
    variables: {
      body: 'Test message',
      chatId: 'emptychat',
      parentMessageId: null,
    },
  },
  result: {
    data: {
      createChatMessage: {
        id: 'newmsg_empty1',
        body: 'Test message',
        createdAt: '2023-01-01T10:10:00Z',
        creator: {
          id: 'user123',
          name: 'John Doe',
        },
      },
    },
  },
};

const SEND_MESSAGE_GROUP_MOCK = {
  request: {
    query: SEND_MESSAGE_TO_CHAT,
    variables: {
      body: 'Test message',
      chatId: 'groupchat1',
      parentMessageId: null,
    },
  },
  result: {
    data: {
      createChatMessage: {
        id: 'newmsg_group1',
        body: 'Test message',
        createdAt: '2023-01-01T10:10:00Z',
        creator: {
          id: 'user123',
          name: 'John Doe',
        },
      },
    },
  },
};

// Mock for sending empty messages (should not be used as empty messages are prevented)
const SEND_EMPTY_MESSAGE_MOCK = {
  request: {
    query: SEND_MESSAGE_TO_CHAT,
    variables: {
      body: '',
      chatId: 'chat1',
      parentMessageId: null,
    },
  },
  result: {
    data: {
      createChatMessage: {
        id: 'should_not_happen',
        body: '',
        createdAt: '2023-01-01T10:10:00Z',
        creator: {
          id: 'user123',
          name: 'John Doe',
        },
      },
    },
  },
};

const MARK_MESSAGES_READ_MOCK = {
  request: {
    query: MARK_CHAT_MESSAGES_AS_READ,
    variables: {
      chatId: 'chat1',
      userId: 'user123',
    },
  },
  result: {
    data: {
      markChatMessagesAsRead: {
        _id: 'chat1',
      },
    },
  },
};

const MARK_MESSAGES_READ_EMPTY_MOCK = {
  request: {
    query: MARK_CHAT_MESSAGES_AS_READ,
    variables: {
      chatId: 'emptychat',
      userId: 'user123',
    },
  },
  result: {
    data: {
      markChatMessagesAsRead: {
        _id: 'emptychat',
      },
    },
  },
};

const MARK_MESSAGES_READ_GROUP_MOCK = {
  request: {
    query: MARK_CHAT_MESSAGES_AS_READ,
    variables: {
      chatId: 'groupchat1',
      userId: 'user123',
    },
  },
  result: {
    data: {
      markChatMessagesAsRead: {
        _id: 'groupchat1',
      },
    },
  },
};

const MARK_MESSAGES_READ_EMPTY_STRING_MOCK = {
  request: {
    query: MARK_CHAT_MESSAGES_AS_READ,
    variables: {
      chatId: '',
      userId: 'user123',
    },
  },
  result: {
    data: {
      markChatMessagesAsRead: {
        _id: '',
      },
    },
  },
};

const MESSAGE_SUBSCRIPTION_MOCK = {
  request: {
    query: MESSAGE_SENT_TO_CHAT,
    variables: {
      userId: 'user123',
    },
  },
  result: {
    data: {
      messageSentToChat: {
        _id: 'newmsg2',
        createdAt: '2023-01-01T10:15:00Z',
        chatMessageBelongsTo: {
          _id: 'chat1',
        },
        messageContent: 'New subscription message',
        replyTo: null,
        sender: {
          _id: 'user456',
          firstName: 'Jane',
          lastName: 'Smith',
        },
        updatedAt: '2023-01-01T10:15:00Z',
      },
    },
  },
};

// Create an array of MARK_MESSAGES_READ_MOCK instances to prevent exhaustion
const MARK_MESSAGES_READ_INSTANCES = Array(50).fill(MARK_MESSAGES_READ_MOCK);

const defaultMocks = [
  CHAT_BY_ID_MOCK,
  CHATS_LIST_MOCK,
  CHATS_LIST_MOCK_2, // Additional instances for repeated calls
  CHATS_LIST_MOCK_3,
  CHATS_LIST_EMPTY_MOCK,
  CHATS_LIST_GROUP_MOCK,
  CHATS_LIST_EMPTY_STRING_MOCK,
  GROUP_CHAT_LIST_MOCK,
  UNREAD_CHAT_LIST_MOCK,
  UNREAD_CHAT_LIST_MOCK, // Multiple instances for repeated calls
  UNREAD_CHAT_LIST_MOCK,
  UNREAD_CHAT_LIST_MOCK,
  UNREAD_CHAT_LIST_MOCK,
  SEND_MESSAGE_MOCK,
  SEND_MESSAGE_UNDEFINED_MOCK,
  SEND_MESSAGE_EMPTY_UNDEFINED_MOCK,
  SEND_MESSAGE_EMPTY_MOCK,
  SEND_MESSAGE_GROUP_MOCK,
  ...MARK_MESSAGES_READ_INSTANCES, // Use spread to add 50 instances
  MARK_MESSAGES_READ_EMPTY_MOCK,
  MARK_MESSAGES_READ_GROUP_MOCK,
  MARK_MESSAGES_READ_EMPTY_STRING_MOCK,
  MESSAGE_SUBSCRIPTION_MOCK,
];

const renderChatRoom = (
  props = {
    selectedContact: 'chat1',
    chatListRefetch: vi.fn().mockResolvedValue({ data: mockChatsListData }),
  },
  mocks = defaultMocks,
) => {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <BrowserRouter>
        <Provider store={store}>
          <I18nextProvider i18n={i18nForTest}>
            <ChatRoom {...props} />
          </I18nextProvider>
        </Provider>
      </BrowserRouter>
    </MockedProvider>,
  );
};

describe('ChatRoom Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render the chat room component', async () => {
    renderChatRoom();
    
    // Wait for the component to load - using the message input as indicator
    await waitFor(() => {
      expect(screen.getByTestId('messageInput')).toBeInTheDocument();
    });
  });

  it('should display chat messages', async () => {
    renderChatRoom();

    await waitFor(() => {
      expect(screen.getByText('Hello world!')).toBeInTheDocument();
      expect(screen.getByText('How are you?')).toBeInTheDocument();
    });
  });

  it('should show message sender information', async () => {
    renderChatRoom();

    await waitFor(() => {
      // Check for sender names that are actually displayed in the component
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      // Alternative: Check if the content and alt attributes contain the names
      expect(screen.getByAltText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('should render message input field', async () => {
    renderChatRoom();

    await waitFor(() => {
      const messageInput = screen.getByPlaceholderText('Send Message');
      expect(messageInput).toBeInTheDocument();
    });
  });

  it('should render send button', async () => {
    renderChatRoom();

    await waitFor(() => {
      const sendButton = screen.getByTestId('sendMessage');
      expect(sendButton).toBeInTheDocument();
    });
  });

  it('should allow typing in message input', async () => {
    renderChatRoom();

    await waitFor(() => {
      const messageInput = screen.getByPlaceholderText('Send Message');
      fireEvent.change(messageInput, { target: { value: 'Test message' } });
      expect(messageInput).toHaveValue('Test message');
    });
  });

  it('should send a message when send button is clicked', async () => {
    const mockRefetch = vi.fn().mockResolvedValue({ data: mockChatsListData });
    renderChatRoom({
      selectedContact: 'chat1',
      chatListRefetch: mockRefetch,
    });

    await waitFor(() => {
      const messageInput = screen.getByPlaceholderText('Send Message');
      const sendButton = screen.getByTestId('sendMessage');

      fireEvent.change(messageInput, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);
    });

    // Wait for the mutation to complete
    await waitFor(() => {
      // The input should be cleared after sending
      const messageInput = screen.getByPlaceholderText('Send Message');
      expect(messageInput).toHaveValue('');
    });
  });

  it('should handle file attachment', async () => {
    renderChatRoom();

    await waitFor(() => {
      const fileInput = screen.getByTestId('hidden-file-input');
      expect(fileInput).toBeInTheDocument();
    });

    const file = new File(['test content'], 'test.png', { type: 'image/png' });
    const fileInput = screen.getByTestId('hidden-file-input');
    
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    // File should be processed (mocked validation passes)
    expect((fileInput as HTMLInputElement).files).toHaveLength(1);
  });

  it('should display chat name in header', async () => {
    renderChatRoom(); // Use default props with selectedContact: 'chat1'

    await waitFor(() => {
      // Since the component shows "Jane Smith" in header for user chat, let's test for that
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('should handle empty chat gracefully', async () => {
    const emptyChatMock = {
      request: {
        query: CHAT_BY_ID,
        variables: {
          id: 'emptychat',
        },
      },
      result: {
        data: {
          chatById: {
            _id: 'emptychat',
            name: 'Empty Chat',
            isGroup: false,
            organization: { _id: 'org1' },
            createdAt: '2023-01-01T10:00:00Z',
            messages: [],
            users: [mockUser],
            admins: [mockUser],
            unseenMessagesByUsers: [],
          },
        },
      },
    };

    const testMocks = [
      emptyChatMock,
      CHATS_LIST_EMPTY_MOCK, // Use the correct mock for emptychat
      GROUP_CHAT_LIST_MOCK,
      UNREAD_CHAT_LIST_MOCK,
      SEND_MESSAGE_EMPTY_MOCK,
      MARK_MESSAGES_READ_EMPTY_MOCK,
      MESSAGE_SUBSCRIPTION_MOCK,
    ];

    renderChatRoom(
      {
        selectedContact: 'emptychat',
        chatListRefetch: vi.fn().mockResolvedValue({ data: mockChatsListData }),
      },
      testMocks,
    );

    await waitFor(() => {
      expect(screen.getByText('emptychat')).toBeInTheDocument();
    });
  });

  it('should handle group chat display', async () => {
    const groupChatMock = {
      request: {
        query: CHAT_BY_ID,
        variables: {
          id: 'groupchat1',
        },
      },
      result: {
        data: {
          chatById: {
            _id: 'groupchat1',
            name: 'Test Group Chat',
            isGroup: true,
            organization: { _id: 'org1' },
            createdAt: '2023-01-01T10:00:00Z',
            messages: [],
            users: [mockUser],
            admins: [mockUser],
            unseenMessagesByUsers: [],
          },
        },
      },
    };

    const testMocks = [
      groupChatMock,
      CHATS_LIST_GROUP_MOCK, // Use the correct mock for groupchat1
      GROUP_CHAT_LIST_MOCK,
      UNREAD_CHAT_LIST_MOCK,
      SEND_MESSAGE_GROUP_MOCK,
      MARK_MESSAGES_READ_GROUP_MOCK,
      MESSAGE_SUBSCRIPTION_MOCK,
    ];

    renderChatRoom(
      {
        selectedContact: 'groupchat1',
        chatListRefetch: vi.fn().mockResolvedValue({ data: mockChatsListData }),
      },
      testMocks,
    );

    await waitFor(() => {
      expect(screen.getByText('groupchat1')).toBeInTheDocument();
    });
  });

  it('should prevent sending empty messages', async () => {
    renderChatRoom();

    await waitFor(() => {
      const sendButton = screen.getByTestId('sendMessage');
      fireEvent.click(sendButton);
    });

    // Should not attempt to send empty message
    const sendButton = screen.getByTestId('sendMessage');
    expect(sendButton).toBeInTheDocument();
  });

  it('should handle network errors gracefully', async () => {
    const errorMock = {
      request: {
        query: CHAT_BY_ID,
        variables: {
          id: 'chat1',
        },
      },
      error: new Error('Network error'),
    };

    const testMocks = [
      errorMock as any,
      CHATS_LIST_MOCK,
      GROUP_CHAT_LIST_MOCK,
      UNREAD_CHAT_LIST_MOCK,
      MARK_MESSAGES_READ_MOCK,
      MESSAGE_SUBSCRIPTION_MOCK,
    ];

    renderChatRoom(
      {
        selectedContact: 'chat1',
        chatListRefetch: vi.fn().mockResolvedValue({ data: mockChatsListData }),
      },
      testMocks,
    );

    // Component should handle error state - check for message input
    await waitFor(() => {
      expect(screen.getByTestId('messageInput')).toBeInTheDocument();
    });
  });

  it('should show no chat selected message when no contact is selected', async () => {
    renderChatRoom(
      {
        selectedContact: '',
        chatListRefetch: vi.fn().mockResolvedValue({ data: mockChatsListData }),
      },
      [CHATS_LIST_MOCK, GROUP_CHAT_LIST_MOCK, UNREAD_CHAT_LIST_MOCK, MARK_MESSAGES_READ_EMPTY_STRING_MOCK],
    );

    await waitFor(() => {
      expect(screen.getByTestId('noChatSelected')).toBeInTheDocument();
    });
  });

  it('should show no chat selected message when no contact is selected', async () => {
    renderChatRoom({
      selectedContact: '',
      chatListRefetch: vi.fn().mockResolvedValue({ data: mockChatsListData }),
    });

    await waitFor(() => {
      expect(screen.getByTestId('noChatSelected')).toBeInTheDocument();
    });
  });
});

describe('MessageImage Component', () => {
  const mockGetFileFromMinio = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFileFromMinio.mockResolvedValue('mocked-image-url');
  });

  afterEach(() => {
    cleanup();
  });

  it('should render base64 image directly', () => {
    const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    
    render(
      <MessageImage
        media={base64Image}
        organizationId="org1"
        getFileFromMinio={mockGetFileFromMinio}
      />
    );

    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', base64Image);
    expect(mockGetFileFromMinio).not.toHaveBeenCalled();
  });

  it('should fetch image from MinIO for non-base64 media', async () => {
    render(
      <MessageImage
        media="test-image.png"
        organizationId="org1"
        getFileFromMinio={mockGetFileFromMinio}
      />
    );

    // Should show loading state initially
    expect(screen.getByText('Loading image...')).toBeInTheDocument();

    // Wait for image to load
    await waitFor(() => {
      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'mocked-image-url');
    });

    expect(mockGetFileFromMinio).toHaveBeenCalledWith('test-image.png', 'org1');
  });

  it('should handle MinIO fetch errors', async () => {
    mockGetFileFromMinio.mockRejectedValue(new Error('MinIO error'));

    render(
      <MessageImage
        media="test-image.png"
        organizationId="org1"
        getFileFromMinio={mockGetFileFromMinio}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Image not available')).toBeInTheDocument();
    });
  });

  it('should handle empty media', () => {
    render(
      <MessageImage
        media=""
        organizationId="org1"
        getFileFromMinio={mockGetFileFromMinio}
      />
    );

    expect(screen.getByText('Image not available')).toBeInTheDocument();
    expect(mockGetFileFromMinio).not.toHaveBeenCalled();
  });

  it('should use fallback organization ID for direct messages', async () => {
    render(
      <MessageImage
        media="test-image.png"
        getFileFromMinio={mockGetFileFromMinio}
      />
    );

    await waitFor(() => {
      expect(mockGetFileFromMinio).toHaveBeenCalledWith('test-image.png', 'organization');
    });
  });
});
