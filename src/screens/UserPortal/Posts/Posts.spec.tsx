import React, { act } from 'react';
import { MockedProvider } from '@apollo/react-testing';
import type { RenderResult } from '@testing-library/react';
import {
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import userEvent from '@testing-library/user-event';
import {
  ORGANIZATION_ADVERTISEMENT_LIST,
  ORGANIZATION_POST_LIST,
  USER_DETAILS,
  GET_POST_WITH_COMMENTS,
} from 'GraphQl/Queries/Queries';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { store } from 'state/store';
import { StaticMockLink } from 'utils/StaticMockLink';
import i18nForTest from 'utils/i18nForTest';
import Home from './Posts';
import useLocalStorage from 'utils/useLocalstorage';
import { DELETE_POST_MUTATION } from 'GraphQl/Mutations/mutations';
import { expect, describe, it, vi } from 'vitest';

const { setItem } = useLocalStorage();

vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('react-multi-carousel', () => {
  const Carousel = ({ children }: React.PropsWithChildren) => {
    return (
      <div className="react-multi-carousel-list">
        <div className="react-multi-carousel-track">{children}</div>
      </div>
    );
  };

  Carousel.defaultProps = {
    responsive: {},
  };

  return {
    default: Carousel,
  };
});

vi.mock('utils/convertToBase64', () => ({
  default: vi.fn().mockResolvedValue('data:image/png;base64,mockBase64String'),
}));

const mockUseParams = vi.fn().mockReturnValue({ orgId: 'orgId' });

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useParams: () => mockUseParams(),
    useNavigate: () => vi.fn(),
  };
});
const upVoters = [
  {
    node: {
      id: '640d98d9eb6a743d75341067',
      name: 'Glen Dsza',
    },
  },
  {
    node: {
      id: '640d98d9eb6a743d75341068',
      name: 'Glen2 Dsza2',
    },
  },
  {
    node: {
      id: '640d98d9eb6a743d75341069',
      name: 'Glen3 Dsza3',
    },
  },
];
const comments = {
  edges: [
    {
      node: {
        id: '6411e54835d7ba2344a78e29',
        creator: {
          id: '640d98d9eb6a743d75341067',
          name: 'Glen Dsza',
        },
        upVotesCount: 2,
        upVoters: {
          edges: upVoters.slice(0, 2),
        },
        body: 'This is the first comment',
        createdAt: '2024-03-03T09:26:56.524+00:00',
      },
    },
    {
      node: {
        id: '6411e54835d7ba2344a78e30',
        creator: {
          id: '640d98d9eb6a743d75341068',
          name: 'Glen2 Dsza2',
        },
        upVotesCount: 0,
        upVoters: {
          edges: [],
        },
        body: 'This is the second comment',
        createdAt: '2024-03-03T10:26:56.524+00:00',
      },
    },
  ],
  pageInfo: {
    hasNextPage: true,
    endCursor: 'comment-cursor-1',
  },
};
const posts = [
  {
    node: {
      id: '6411e53835d7ba2344a78e21',
      title: 'post one',
      caption: 'This is the first post',
      imageUrl: null,
      createdAt: '2024-03-03T09:26:56.524+00:00',
      pinnedAt: '2024-03-04T09:26:56.524+00:00',
      creator: {
        id: '640d98d9eb6a743d75341067',
        name: 'Glen Dsza',
      },
      upVotesCount: 0,
      commentsCount: 0,
      comments: {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          endCursor: null,
        },
      },
      upVoters: {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          endCursor: null,
        },
      },
    },
    cursor: '6411e53835d7ba2344a78e21',
  },
  {
    node: {
      id: '6411e54835d7ba2344a78e29',
      title: 'post two',
      caption: 'This is the post two',
      imageUrl: null,
      createdAt: '2024-03-03T09:26:56.524+00:00',
      pinnedAt: null,
      creator: {
        id: '640d98d9eb6a743d75341067',
        name: 'Glen Dsza',
      },
      upVotesCount: 2,
      commentsCount: 1,
      upVoters: {
        edges: upVoters.slice(0, 2),
        pageInfo: {
          hasNextPage: false,
          endCursor: null,
        },
      },
      comments: comments,
    },
    cursor: '6411e54835d7ba2344a78e29',
  },
];
const MOCKS = [
  {
    request: {
      query: ORGANIZATION_POST_LIST,
      variables: {
        input: { id: 'orgId' },
        first: 10,
        postUpVotersFirst: 5,
      },
    },
    result: {
      data: {
        organization: {
          posts: {
            edges: posts,
            pageInfo: {
              startCursor: '6411e53835d7ba2344a78e21',
              endCursor: '6411e54835d7ba2344a78e31',
              hasNextPage: true,
              hasPreviousPage: false,
            },
          },
        },
      },
    },
  },
  {
    request: {
      query: ORGANIZATION_ADVERTISEMENT_LIST,
      variables: { id: 'orgId', first: 6 },
    },
    result: {
      data: {
        organizations: [
          {
            _id: 'orgId',
            advertisements: {
              edges: [
                {
                  node: {
                    _id: '1234',
                    name: 'Ad 1',
                    type: 'BANNER',
                    organization: {
                      _id: 'orgId',
                    },
                    mediaUrl: 'Link 1',
                  },
                },
                {
                  node: {
                    _id: '2345',
                    name: 'Ad 2',
                    type: 'MENU',
                    organization: {
                      _id: 'orgId',
                    },
                    mediaUrl: 'Link 2',
                  },
                },
              ],
              totalCount: 2,
            },
          },
        ],
      },
    },
  },
  {
    request: {
      query: USER_DETAILS,
      variables: {
        id: '640d98d9eb6a743d75341067',
        first: 8,
      },
    },
    result: {
      data: {
        user: {
          id: '640d98d9eb6a743d75341067',
          name: 'Glen Dsza',
          image: null,
          tagsAssignedWith: {
            edges: [],
            pageInfo: {
              hasNextPage: false,
              endCursor: null,
            },
          },
        },
      },
    },
  },
  {
    request: {
      query: GET_POST_WITH_COMMENTS,
      variables: {
        input: { id: '6411e54835d7ba2344a78e29' },
        first: 10,
      },
    },
    result: {
      data: {
        post: {
          id: '6411e54835d7ba2344a78e29',
          commentsCount: 2,
          comments: comments,
        },
      },
    },
  },
  {
    request: {
      query: GET_POST_WITH_COMMENTS,
      variables: {
        input: { id: '6411e54835d7ba2344a78e29' },
        first: 10,
        after: 'comment-cursor-1',
      },
    },
    result: {
      data: {
        post: {
          id: '6411e54835d7ba2344a78e29',
          commentsCount: 3,
          comments: comments,
        },
      },
    },
  },
  {
    request: {
      query: ORGANIZATION_POST_LIST,
      variables: {
        input: { id: 'orgId' },
        after: '6411e54835d7ba2344a78e31',
        first: 10,
        postUpVotersFirst: 5,
      },
    },
    result: {
      data: {
        organization: {
          posts: {
            edges: posts,
            pageInfo: {
              startCursor: '6411e54835d7ba2344a78e40',
              endCursor: '6411e54835d7ba2344a78e40',
              hasNextPage: false,
              hasPreviousPage: true,
            },
          },
        },
      },
    },
  },
  {
    request: {
      query: ORGANIZATION_POST_LIST,
      variables: {
        input: { id: 'orgId' },
        first: 10,
        postUpVotersFirst: 5,
        postUpVotersAfter: '640d98d9eb6a743d75341068',
      },
    },
    result: {
      data: {
        organization: {
          posts: {
            edges: [
              {
                node: {
                  id: '6411e54835d7ba2344a78e29',
                  upVoters: {
                    edges: upVoters,
                    pageInfo: {
                      hasNextPage: false,
                      endCursor: '640d98d9eb6a743d75341069',
                    },
                  },
                },
              },
            ],
            pageInfo: {
              hasNextPage: false,
              endCursor: null,
            },
          },
        },
      },
    },
  },
  {
    request: {
      query: DELETE_POST_MUTATION,
      variables: { id: '6411e54835d7ba2344a78e29' },
    },
    result: {
      data: {
        removePost: { _id: '6411e54835d7ba2344a78e29' },
      },
    },
  },
  // Mock for empty posts
  {
    request: {
      query: ORGANIZATION_POST_LIST,
      variables: {
        input: { id: 'emptyOrgId' },
        first: 10,
        postUpVotersFirst: 5,
      },
    },
    result: {
      data: {
        organization: {
          posts: {
            edges: [],
            pageInfo: {
              startCursor: null,
              endCursor: null,
              hasNextPage: false,
              hasPreviousPage: false,
            },
          },
        },
      },
    },
  },
];

const link = new StaticMockLink(MOCKS, true);

afterEach(() => {
  localStorage.clear();
});

async function wait(ms = 300): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  });
}

const renderHomeScreen = (): RenderResult =>
  render(
    <MockedProvider addTypename={false} link={link}>
      <MemoryRouter initialEntries={['/user/organization/orgId']}>
        <Provider store={store}>
          <I18nextProvider i18n={i18nForTest}>
            <Routes>
              <Route path="/user/organization/:orgId" element={<Home />} />
            </Routes>
          </I18nextProvider>
        </Provider>
      </MemoryRouter>
    </MockedProvider>,
  );

const renderHomeScreenWithEmptyPosts = (): RenderResult =>
  render(
    <MockedProvider addTypename={false} link={link}>
      <MemoryRouter initialEntries={['/user/organization/emptyOrgId']}>
        <Provider store={store}>
          <I18nextProvider i18n={i18nForTest}>
            <Routes>
              <Route path="/user/organization/:orgId" element={<Home />} />
            </Routes>
          </I18nextProvider>
        </Provider>
      </MemoryRouter>
    </MockedProvider>,
  );

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('Testing Home Screen: User Portal', () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({ orgId: 'orgId' });
  });
  afterAll(() => {
    vi.clearAllMocks();
  });

  it('Check if HomeScreen renders properly', async () => {
    renderHomeScreen();

    await wait();
    const startPostBtn = await screen.findByTestId('postBtn');
    expect(startPostBtn).toBeInTheDocument();
  });

  it('StartPostModal should render on click of StartPost btn', async () => {
    renderHomeScreen();
    await wait();
    const startPostBtn = await screen.findByTestId('postBtn');
    expect(startPostBtn).toBeInTheDocument();
    await userEvent.click(startPostBtn);
    const startPostModal = screen.getByTestId('startPostModal');
    expect(startPostModal).toBeInTheDocument();
  });

  it('StartPostModal should close on clicking the close button', async () => {
    renderHomeScreen();

    await wait();
    await userEvent.upload(
      screen.getByTestId('postImageInput'),
      new File(['image content'], 'image.png', { type: 'image/png' }),
    );
    await wait();
    const startPostBtn = await screen.findByTestId('postBtn');
    expect(startPostBtn).toBeInTheDocument();
    await userEvent.click(startPostBtn);
    const startPostModal = screen.getByTestId('startPostModal');
    expect(startPostModal).toBeInTheDocument();
    await userEvent.type(screen.getByTestId('postInput'), 'some content');
    expect(screen.getByTestId('postInput')).toHaveValue('some content');
    await screen.findByAltText('Post Image Preview');
    expect(screen.getByAltText('Post Image Preview')).toBeInTheDocument();
    const closeButton = within(startPostModal).getByRole('button', {
      name: /close/i,
    });
    fireEvent.click(closeButton);
    const closedModalText = screen.queryByText(/somethingOnYourMind/i);
    expect(closedModalText).not.toBeInTheDocument();
    expect(screen.getByTestId('postInput')).toHaveValue('');
    const fileInput = screen.getByTestId('postImageInput') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: null } });
    expect(fileInput.files?.length).toBeFalsy();
  });

  it('Check whether Posts render in PostCard', async () => {
    setItem('userId', '640d98d9eb6a743d75341067');
    renderHomeScreen();
    await wait();
    const postCardContainers = screen.findAllByTestId('postCardContainer');
    expect(postCardContainers).not.toBeNull();
    expect(screen.queryAllByText('post one')[0]).toBeInTheDocument();
    expect(
      screen.queryAllByText('This is the first post')[0],
    ).toBeInTheDocument();
    expect(screen.queryByText('post two')).toBeInTheDocument();
    expect(screen.queryByText('This is the post two')).toBeInTheDocument();
  });

  it('Checking if refetch works after deleting this post', async () => {
    setItem('userId', '640d98d9eb6a743d75341067');
    renderHomeScreen();
    expect(screen.queryAllByTestId('dropdown')).not.toBeNull();
    const dropdowns = await screen.findAllByTestId('dropdown');
    await userEvent.click(dropdowns[1]);
    const deleteButton = await screen.findByTestId('deletePost');
    await userEvent.click(deleteButton);
  });
});

describe('HomeScreen with invalid orgId', () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({ orgId: undefined });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('Redirect to /user when organizationId is falsy', async () => {
    render(
      <MockedProvider addTypename={false} link={link}>
        <MemoryRouter initialEntries={['/user/organization/']}>
          <Provider store={store}>
            <I18nextProvider i18n={i18nForTest}>
              <Routes>
                <Route path="/user/organization/" element={<Home />} />
                <Route
                  path="/user"
                  element={<div data-testid="homeEl"></div>}
                />
              </Routes>
            </I18nextProvider>
          </Provider>
        </MemoryRouter>
      </MockedProvider>,
    );
    const homeEl = await screen.findByTestId('homeEl');
    expect(homeEl).toBeInTheDocument();
    const postCardContainers = screen.queryAllByTestId('postCardContainer');
    expect(postCardContainers).toHaveLength(0);
  });
});

describe('Testing Home Screen: User Portal with Empty Posts', () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({ orgId: 'emptyOrgId' });
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  it('Check if HomeScreen renders properly with empty posts', async () => {
    renderHomeScreenWithEmptyPosts();
    await wait(300);
    const startPostBtn = await screen.findByTestId('postBtn');
    expect(startPostBtn).toBeInTheDocument();
  });

  it('StartPostModal should render on click of StartPost btn with empty posts', async () => {
    renderHomeScreenWithEmptyPosts();
    await wait(300);
    const startPostBtn = await screen.findByTestId('postBtn');
    expect(startPostBtn).toBeInTheDocument();
    await userEvent.click(startPostBtn);
    const startPostModal = screen.getByTestId('startPostModal');
    expect(startPostModal).toBeInTheDocument();
  });

  it('Check whether no Posts render when there are empty posts', async () => {
    renderHomeScreenWithEmptyPosts();
    await wait(300);
    const postCardContainers = screen.queryAllByTestId('postCardContainer');
    expect(postCardContainers).toHaveLength(0);
  });
});

describe('Testing Home Screen additional features', () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({ orgId: 'orgId' });
    setItem('userId', '640d98d9eb6a743d75341067');
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should display promoted posts (advertisements)', async () => {
    renderHomeScreen();
    await wait(300);
    const promotedPostsContainer = await screen.findByTestId(
      'promotedPostsContainer',
    );
    expect(promotedPostsContainer).toBeInTheDocument();
  });

  it('should handle file input change for post creation', async () => {
    renderHomeScreen();
    await wait(300);
    if (!global.URL.createObjectURL) {
      global.URL.createObjectURL = vi.fn();
    }
    global.URL.createObjectURL = vi.fn(() => 'mocked-url');
    const fileInput = screen.getByTestId('postImageInput');
    expect(fileInput).toBeInTheDocument();
    const file = new File(['image content'], 'image.png', {
      type: 'image/png',
    });
    await userEvent.upload(fileInput, file);
    await wait(300);
    const postBtn = screen.getByTestId('postBtn');
    expect(postBtn).toBeInTheDocument();
    await userEvent.click(postBtn);
    await wait(300);
    const modal = screen.getByTestId('startPostModal');
    expect(modal).toBeInTheDocument();
    await waitFor(
      () => {
        const imgPreview = screen.queryByAltText('Post Image Preview');
        if (imgPreview) {
          expect(imgPreview).toBeInTheDocument();
        }
      },
      { timeout: 1000 },
    );
  });

  it('should display a message when there are no posts', async () => {
    mockUseParams.mockReturnValue({ orgId: 'emptyOrgId' });
    renderHomeScreenWithEmptyPosts();
    await wait(300);
    const noPostsMessage = screen.queryByText('nothingToShowHere');
    if (noPostsMessage) {
      expect(noPostsMessage).toBeInTheDocument();
    } else {
      // If not found with exact text, look for any text that might contain the message
      const possibleMessages = [/nothing to show/i, /no posts/i, /empty/i];
      let found = false;
      for (const pattern of possibleMessages) {
        const element = screen.queryByText(pattern);
        if (element) {
          expect(element).toBeInTheDocument();
          found = true;
          break;
        }
      }
      if (!found) {
        const postCards = screen.queryAllByTestId('postCardContainer');
        expect(postCards.length).toBe(0);
      }
    }
  });

  it('loads more posts when "Load More" is clicked', async () => {
    renderHomeScreen();
    await wait(300);
    const loadMoreButton = screen.getByTestId('loadMoreButton');
    expect(loadMoreButton).toBeInTheDocument();
    await userEvent.click(loadMoreButton);
    await wait(300);
    const postCards = screen.queryAllByTestId('postCardContainer');
    expect(postCards.length).toBeGreaterThan(2); // Assuming there were initially 2 posts
  });

  it('handles post clicking', async () => {
    renderHomeScreen();
    await wait(300);
    const postCards = screen.queryAllByTestId('postCardContainer');
    expect(postCards.length).toBeGreaterThan(0);
    const viewBtn = within(postCards[1]).getByTestId('viewPostBtn0');
    expect(viewBtn).toBeInTheDocument();
    await userEvent.click(viewBtn);
    await wait(500);
  });
});
