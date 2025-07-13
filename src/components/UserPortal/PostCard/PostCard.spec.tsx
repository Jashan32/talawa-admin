import React, { act } from 'react';
import { MockedProvider } from '@apollo/react-testing';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router';
import { store } from 'state/store';
import i18nForTest from 'utils/i18nForTest';
import { StaticMockLink } from 'utils/StaticMockLink';
import { toast } from 'react-toastify';

import PostCard from './PostCard';
import userEvent from '@testing-library/user-event';
import {
  CREATE_COMMENT_POST,
  LIKE_POST,
  UNLIKE_POST,
  LIKE_COMMENT,
  UNLIKE_COMMENT,
  DELETE_POST_MUTATION,
  UPDATE_POST_MUTATION,
} from 'GraphQl/Mutations/mutations';
import useLocalStorage from 'utils/useLocalstorage';
import { vi } from 'vitest';
import type { InterfacePostCard, InterfacePostEdge } from 'utils/interfaces';
import { GET_POST_WITH_COMMENTS } from 'GraphQl/Queries/OrganizationQueries';

/**
 * Unit tests for the PostCard component in the User Portal.
 *
 * These tests ensure the PostCard component behaves as expected:
 *
 * 1. **Component rendering**: Verifies correct rendering with props like title, text, and creator info.
 * 2. **Dropdown functionality**: Tests the dropdown for editing and deleting posts.
 * 3. **Edit post**: Ensures the post can be edited with a success message.
 * 4. **Delete post**: Verifies post deletion works with a success message.
 * 5. **Like/unlike post**: Ensures the UI updates when a user likes or unlikes a post.
 * 6. **Post image**: Verifies post image rendering.
 * 7. **Create comment**: Ensures a comment is created successfully.
 * 8. **Like/unlike comment**: Tests liking/unliking comments.
 * 9. **Comment modal**: Verifies the comment modal appears when clicked.
 * 10. **Comment validation**: Ensures an error toast appears when an empty comment is submitted.
 * 11. **Comment submission error**: Ensures an error toast appears when a network error occurs.
 * 12. **Delete post failure**: Ensures the error toast appears when post deletion fails.
 * 13. **Post image**: Verifies post image rendering.
 * 14. **Delete post success**: Ensures the success toast appears when CreateEvenData is returned.
 *
 * Mocked GraphQL data is used for simulating backend behavior.
 */

const { setItem, getItem } = useLocalStorage();

vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

const mockPosts = [
  {
    node: {
      id: '1',
      title: 'Test Title',
      pinnedAt: null,
      caption: 'Test Caption',
      imageUrl: null,
      videoUrl: null,
      createdAt: '2025-07-12T19:20:00Z',
      upVoters: {
        edges: [{ node: { id: 'u2', name: 'Jane Smith' } }],
        pageInfo: {
          startCursor: '',
          endCursor: '',
          hasNextPage: true,
          hasPreviousPage: false,
        },
      },
      creator: {
        id: 'u1',
        name: 'John Doe',
        email: 'john@example.com',
      },
      upVotesCount: 1,
      commentsCount: 2,
      commentsPageInfo: {
        hasNextPage: true,
        endCursor: 'cursor1',
      },
      comments: {
        edges: [
          {
            node: {
              id: 'c1',
              creator: {
                id: 'u2',
                name: 'Jane Smith',
              },
              body: 'Comment body',
              upVotesCount: 0,
              upVoters: {
                edges: [],
                pageInfo: {
                  startCursor: '',
                  endCursor: '',
                  hasNextPage: true,
                  hasPreviousPage: false,
                },
              },
            },
          },
        ],
        pageInfo: {
          hasNextPage: true,
          endCursor: 'cursor1',
          startCursor: 'cursor1',
          hasPreviousPage: false,
        },
      },
    },
  },
];

const errorMock = {
  request: {
    query: GET_POST_WITH_COMMENTS,
    variables: {
      input: { id: '1' },
      first: 10,
      after: 'cursor1',
    },
  },
  error: new Error('Failed to load comments'),
};
const mockCommentsWithPagination = {
  request: {
    query: GET_POST_WITH_COMMENTS,
    variables: {
      input: { id: '1' },
      first: 10,
      after: 'cursor1',
    },
  },
  result: {
    data: {
      post: {
        id: '1',
        comments: {
          edges: [
            {
              node: {
                id: 'comment2',
                creator: { id: '2', name: 'User Two' },
                body: 'Second comment',
                upVotesCount: 0,
                upVoters: { edges: [] },
              },
            },
            {
              node: {
                id: 'comment3',
                creator: { id: '3', name: 'User Three' },
                body: 'Third comment',
                upVotesCount: 0,
                upVoters: { edges: [] },
              },
            },
          ],
          pageInfo: {
            hasNextPage: false,
            endCursor: 'cursor3',
            startCursor: 'cursor2',
            hasPreviousPage: true,
          },
        },
        commentsCount: 3,
      },
    },
  },
};

const createBaseCardProps = (
  overrides: Partial<InterfacePostCard> = {},
): InterfacePostCard => {
  const mockPosts: InterfacePostEdge[] = [];
  const mockSetPosts = vi.fn();
  const mockSetCommentsCursors = vi.fn();

  return {
    index: 0,
    id: overrides.id || 'postId',
    postId: overrides.postId || overrides.id || 'postId',
    creator: {
      name: 'test user',
      id: '1',
    },
    postedAt: '',
    image: '',
    video: '',
    caption: 'This is post test text',
    title: 'This is post test title',
    upVotesCount: 1,
    commentsCount: 0,
    comments: [],
    likedBy: [
      {
        name: 'test user',
        id: '1',
      },
    ],
    fetchPosts: vi.fn(),
    hasMoreComments: false,
    hasMorePostUpVoters: false,
    setPosts: mockSetPosts,
    posts: mockPosts,
    commentsCursors: {},
    setCommentsCursors: mockSetCommentsCursors,
    orgId: 'testOrgId',
    ...overrides,
  };
};

const MOCKS = [
  {
    request: {
      query: LIKE_POST,
      variables: {
        postId: '',
      },
      result: {
        data: {
          likePost: {
            _id: '',
          },
        },
      },
    },
  },
  {
    request: {
      query: UNLIKE_POST,
      variables: {
        post: '',
      },
      result: {
        data: {
          unlikePost: {
            _id: '',
          },
        },
      },
    },
  },
  {
    request: {
      query: CREATE_COMMENT_POST,
      variables: {
        postId: '1',
        comment: 'testComment',
      },
      result: {
        data: {
          createComment: {
            _id: '64ef885bca85de60ebe0f304',
            creator: {
              _id: '63d6064458fce20ee25c3bf7',
              firstName: 'Noble',
              lastName: 'Mittal',
              email: 'test@gmail.com',
              __typename: 'User',
            },
            upVotesCount: 0,
            likedBy: [],
            text: 'testComment',
            __typename: 'Comment',
          },
        },
      },
    },
  },
  {
    request: {
      query: LIKE_COMMENT,
      variables: {
        commentId: '1',
      },
    },
    result: {
      data: {
        likeComment: {
          _id: '1',
        },
      },
    },
  },
  {
    request: {
      query: UNLIKE_COMMENT,
      variables: {
        commentId: '1',
      },
    },
    result: {
      data: {
        unlikeComment: {
          _id: '1',
        },
      },
    },
  },
  {
    request: {
      query: UPDATE_POST_MUTATION,
      variables: {
        id: 'postId',
        text: 'Edited Post',
      },
    },
    result: {
      data: {
        updatePost: {
          _id: '',
        },
      },
    },
  },
  {
    request: {
      query: DELETE_POST_MUTATION,
      variables: {
        id: 'postId',
      },
    },
    result: {
      data: {
        removePost: {
          _id: '',
        },
      },
    },
  },
];

async function wait(ms = 100): Promise<void> {
  await act(() => {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  });
}

const link = new StaticMockLink(MOCKS, true);

describe('Testing PostCard Component [User Portal]', () => {
  test('Edit post should work properly', async () => {
    setItem('userId', '2');

    const cardProps = createBaseCardProps({
      id: 'postId',
      caption: 'test Post',
    });

    render(
      <MockedProvider addTypename={false} link={link}>
        <BrowserRouter>
          <Provider store={store}>
            <I18nextProvider i18n={i18nForTest}>
              <PostCard {...cardProps} />
            </I18nextProvider>
          </Provider>
        </BrowserRouter>
      </MockedProvider>,
    );
    await wait();

    await userEvent.click(screen.getByTestId('dropdown'));
    await userEvent.click(screen.getByTestId('editPost'));
    await wait();

    expect(screen.getByTestId('editPostModalTitle')).toBeInTheDocument();
    await userEvent.clear(screen.getByTestId('postInput'));
    await userEvent.type(screen.getByTestId('postInput'), 'Edited Post');
    await userEvent.click(screen.getByTestId('editPostBtn'));
    await wait();

    expect(toast.success).toHaveBeenCalledWith('Post updated Successfully');
  });

  test('Component should be rendered properly if user unlikes a post', async () => {
    const beforeUserId = getItem('userId');
    setItem('userId', '2');

    const cardProps = createBaseCardProps({
      id: '',
    });

    render(
      <MockedProvider addTypename={false} link={link}>
        <BrowserRouter>
          <Provider store={store}>
            <I18nextProvider i18n={i18nForTest}>
              <PostCard {...cardProps} />
            </I18nextProvider>
          </Provider>
        </BrowserRouter>
      </MockedProvider>,
    );

    await wait();

    await userEvent.click(screen.getByTestId('viewPostBtn0'));
    await userEvent.click(screen.getByTestId('likePostBtn'));

    if (beforeUserId) {
      setItem('userId', beforeUserId);
    }
  });

  test('Comment is created successfully after create comment button is clicked.', async () => {
    const cardProps = createBaseCardProps({
      id: '1',
      image: 'testImage',
    });

    render(
      <MockedProvider addTypename={false} link={link}>
        <BrowserRouter>
          <Provider store={store}>
            <I18nextProvider i18n={i18nForTest}>
              <PostCard {...cardProps} />
            </I18nextProvider>
          </Provider>
        </BrowserRouter>
      </MockedProvider>,
    );

    const randomComment = 'testComment';

    await userEvent.click(screen.getByTestId('viewPostBtn0'));

    await userEvent.type(screen.getByTestId('commentInput'), randomComment);
    await userEvent.click(screen.getByTestId('createCommentBtn'));

    await wait();
  });

  test('Comment validation displays an error toast when an empty comment is submitted', async () => {
    const cardProps = createBaseCardProps({
      id: '1',
      image: 'testImage',
    });

    expect(toast.error).toBeDefined();

    render(
      <MockedProvider addTypename={false} link={link}>
        <BrowserRouter>
          <Provider store={store}>
            <I18nextProvider i18n={i18nForTest}>
              <PostCard {...cardProps} />
            </I18nextProvider>
          </Provider>
        </BrowserRouter>
      </MockedProvider>,
    );
    await userEvent.click(screen.getByTestId('viewPostBtn0'));
    await userEvent.clear(screen.getByTestId('commentInput'));
    await userEvent.click(screen.getByTestId('createCommentBtn'));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        i18nForTest.t('postCard.emptyCommentError'),
      );
    });
  });

  test('Delete post should work properly', async () => {
    setItem('userId', '2');

    const deletePostMock = {
      request: {
        query: DELETE_POST_MUTATION,
        variables: {
          id: 'postId',
        },
      },
      result: {
        data: {
          removePost: {
            _id: 'postId',
          },
        },
      },
    };

    const customLink = new StaticMockLink([deletePostMock], true);

    const cardProps = createBaseCardProps({
      id: 'postId',
      caption: 'test Post',
      likedBy: [
        {
          name: 'test user',
          id: '2',
        },
      ],
    });

    render(
      <MockedProvider addTypename={false} link={customLink}>
        <BrowserRouter>
          <Provider store={store}>
            <I18nextProvider i18n={i18nForTest}>
              <PostCard {...cardProps} />
            </I18nextProvider>
          </Provider>
        </BrowserRouter>
      </MockedProvider>,
    );

    await wait();

    await userEvent.click(screen.getByTestId('dropdown'));

    await waitFor(() => {
      expect(screen.getByTestId('deletePost')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('deletePost'));

    await wait(200);

    expect(toast.success).toHaveBeenCalledWith(
      'Successfully deleted the Post.',
    );

    expect(cardProps.fetchPosts).toHaveBeenCalled();
  });

  test('Should handle delete post failure correctly', async () => {
    const cardProps = createBaseCardProps({
      id: 'postId',
      caption: 'test Post',
      creator: {
        name: 'test',
        id: '2',
      },
      likedBy: [
        {
          name: 'test',
          id: '2',
        },
      ],
    });

    const deleteErrorMock = {
      request: {
        query: DELETE_POST_MUTATION,
        variables: { id: 'postId' },
      },
      error: new Error('Network error: Failed to delete post'),
    };

    const errorLink = new StaticMockLink([deleteErrorMock], true);

    render(
      <MockedProvider addTypename={false} link={errorLink}>
        <BrowserRouter>
          <Provider store={store}>
            <I18nextProvider i18n={i18nForTest}>
              <PostCard {...cardProps} />
            </I18nextProvider>
          </Provider>
        </BrowserRouter>
      </MockedProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('dropdown')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('dropdown'));

    await waitFor(() => {
      expect(screen.getByTestId('deletePost')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('deletePost'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Network error: Failed to delete post',
      );

      expect(cardProps.fetchPosts).not.toHaveBeenCalled();
    });
  });

  test('Should handle edit post with error', async () => {
    const errorMock = {
      request: {
        query: UPDATE_POST_MUTATION,
        variables: {
          id: 'postId',
          text: 'Updated content',
        },
      },
      error: new Error('Failed to update post'),
    };
    const errorLink = new StaticMockLink([errorMock], true);
    const cardProps = createBaseCardProps({
      id: 'postId',
      caption: 'Original content',
    });
    setItem('userId', '2');
    render(
      <MockedProvider addTypename={false} link={errorLink}>
        <BrowserRouter>
          <Provider store={store}>
            <I18nextProvider i18n={i18nForTest}>
              <PostCard {...cardProps} />
            </I18nextProvider>
          </Provider>
        </BrowserRouter>
      </MockedProvider>,
    );
    await userEvent.click(screen.getByTestId('dropdown'));
    await userEvent.click(screen.getByTestId('editPost'));
    const postInput = screen.getByTestId('postInput');
    await userEvent.clear(postInput);
    await userEvent.type(postInput, 'Updated content');
    const toastErrorSpy = vi.spyOn(toast, 'error');
    await userEvent.click(screen.getByTestId('editPostBtn'));
    await waitFor(() => {
      expect(toastErrorSpy).toHaveBeenCalled();
    });
    toastErrorSpy.mockRestore();
  });

  test('Should handle unlike post errors', async () => {
    const unlikeErrorMock = {
      request: {
        query: UNLIKE_POST,
        variables: { postId: 'testPost', creatorId: '1' },
      },
      error: new Error('Failed to unlike post'),
    };
    const errorLink = new StaticMockLink([unlikeErrorMock], true);
    const cardProps = createBaseCardProps({
      id: 'testPost',
      upVotesCount: 1,
      likedBy: [{ id: '1', name: 'Test User' }],
    });
    setItem('userId', '1');
    render(
      <MockedProvider addTypename={false} link={errorLink}>
        <BrowserRouter>
          <Provider store={store}>
            <I18nextProvider i18n={i18nForTest}>
              <PostCard {...cardProps} />
            </I18nextProvider>
          </Provider>
        </BrowserRouter>
      </MockedProvider>,
    );

    await userEvent.click(screen.getByTestId('viewPostBtn0'));
    const toastErrorSpy = vi.spyOn(toast, 'error');
    await userEvent.click(screen.getByTestId('likePostBtn'));
    await waitFor(() => {
      expect(toastErrorSpy).toHaveBeenCalled();
    });

    toastErrorSpy.mockRestore();
  });

  test('Should handle like comment', async () => {
    const likeCommentMock = {
      request: {
        query: LIKE_COMMENT,
        variables: { commentId: 'comment1' },
      },
      result: {
        data: {
          createCommentVote: { id: 'vote1' },
        },
      },
    };
    const customLink = new StaticMockLink([likeCommentMock], true);
    const cardProps = createBaseCardProps({
      id: 'testPost',
      comments: [
        {
          id: 'comment1',
          creator: { id: '2', name: 'Test User' },
          text: 'Test comment',
          upVotesCount: 0,
          likedBy: [],
        },
      ],
      commentsCount: 1,
    });
    setItem('userId', '1');
    render(
      <MockedProvider addTypename={false} link={customLink}>
        <BrowserRouter>
          <Provider store={store}>
            <I18nextProvider i18n={i18nForTest}>
              <PostCard {...cardProps} />
            </I18nextProvider>
          </Provider>
        </BrowserRouter>
      </MockedProvider>,
    );
    await userEvent.click(screen.getByTestId('viewPostBtn0'));
    await userEvent.click(screen.getByTestId('likeCommentBtn'));
    await wait();
  });

  test('Should handle like post', async () => {
    const likePostMock = {
      request: {
        query: LIKE_POST,
        variables: { postId: 'testPost' },
      },
      result: {
        data: {
          likePost: { _id: 'testPost' },
        },
      },
    };
    const customLink = new StaticMockLink([likePostMock], true);
    const cardProps = createBaseCardProps({
      id: 'testPost',
      upVotesCount: 0,
      likedBy: [],
    });
    setItem('userId', '1');
    render(
      <MockedProvider addTypename={false} link={customLink}>
        <BrowserRouter>
          <Provider store={store}>
            <I18nextProvider i18n={i18nForTest}>
              <PostCard {...cardProps} />
            </I18nextProvider>
          </Provider>
        </BrowserRouter>
      </MockedProvider>,
    );
    await userEvent.click(screen.getByTestId('viewPostBtn0'));
    await userEvent.click(screen.getByTestId('likePostBtn'));
    await wait();
  });

  test('Should handle unlike post when user has already liked it', async () => {
    const unlikeMock = {
      request: {
        query: UNLIKE_POST,
        variables: { postId: 'testPost', creatorId: '1' },
      },
      result: {
        data: {
          unlikePost: { _id: 'testPost' },
        },
      },
    };
    const customLink = new StaticMockLink([unlikeMock], true);
    const cardProps = createBaseCardProps({
      id: 'testPost',
      upVotesCount: 1,
      likedBy: [{ id: '1', name: 'Test User' }],
    });
    setItem('userId', '1');
    render(
      <MockedProvider addTypename={false} link={customLink}>
        <BrowserRouter>
          <Provider store={store}>
            <I18nextProvider i18n={i18nForTest}>
              <PostCard {...cardProps} />
            </I18nextProvider>
          </Provider>
        </BrowserRouter>
      </MockedProvider>,
    );
    await userEvent.click(screen.getByTestId('viewPostBtn0'));
    await userEvent.click(screen.getByTestId('likePostBtn'));
    await wait();
  });

  test('Should handle comment with existing upVoters', async () => {
    const createCommentMock = {
      request: {
        query: CREATE_COMMENT_POST,
        variables: {
          postId: '1',
          comment: 'test comment',
        },
      },
      result: {
        data: {
          createComment: {
            id: 'newComment',
            creator: {
              _id: 'user1',
              name: 'Test User',
            },
            upVotesCount: 2,
            upVoters: {
              edges: [
                { id: 'user1', name: 'User 1' },
                { id: 'user2', name: 'User 2' },
              ],
            },
            body: 'test comment',
          },
        },
      },
    };
    const customLink = new StaticMockLink([createCommentMock], true);
    const cardProps = createBaseCardProps({
      id: '1',
      comments: [],
      commentsCount: 0,
    });
    render(
      <MockedProvider addTypename={false} link={customLink}>
        <BrowserRouter>
          <Provider store={store}>
            <I18nextProvider i18n={i18nForTest}>
              <PostCard {...cardProps} />
            </I18nextProvider>
          </Provider>
        </BrowserRouter>
      </MockedProvider>,
    );
    await userEvent.click(screen.getByTestId('viewPostBtn0'));
    const commentInput = screen.getByTestId('commentInput');
    await userEvent.type(commentInput, 'test comment');
    await userEvent.click(screen.getByTestId('createCommentBtn'));
    await wait();
  });

  test('Should handle loadMoreComments with existing comments', async () => {
    const mockSetPosts = vi.fn();
    const mockSetCommentsCursors = vi.fn();
    const cardProps = createBaseCardProps({
      id: '1',
      postId: '1',
      posts: mockPosts,
      commentsCursors: { '1': 'cursor1' },
      hasMoreComments: true,
      comments: [
        {
          id: 'comment1',
          creator: { id: '1', name: 'User 1' },
          text: 'First comment',
          upVotesCount: 0,
          likedBy: [],
        },
      ],
      setPosts: mockSetPosts,
      setCommentsCursors: mockSetCommentsCursors,
    });
    render(
      <MockedProvider addTypename={false} mocks={[mockCommentsWithPagination]}>
        <BrowserRouter>
          <Provider store={store}>
            <I18nextProvider i18n={i18nForTest}>
              <PostCard {...cardProps} />
            </I18nextProvider>
          </Provider>
        </BrowserRouter>
      </MockedProvider>,
    );
    await userEvent.click(screen.getByTestId('viewPostBtn0'));
    await wait();
    const loadMoreBtn = screen.getByTestId('loadMoreCommentsBtn');
    await userEvent.click(loadMoreBtn);
    await wait();
    expect(mockSetPosts).toHaveBeenCalled();
    expect(mockSetCommentsCursors).toHaveBeenCalled();
  });

  test('Should handle error when loading more comments', async () => {
    const mockSetPosts = vi.fn();
    const mockSetCommentsCursors = vi.fn();
    const cardProps = createBaseCardProps({
      id: '1',
      hasMoreComments: true,
      commentsCursors: { '1': 'cursor1' },
      comments: [
        {
          id: 'comment1',
          creator: { id: '1', name: 'User 1' },
          text: 'First comment',
          upVotesCount: 0,
          likedBy: [],
        },
      ],
      setPosts: mockSetPosts,
      setCommentsCursors: mockSetCommentsCursors,
    });

    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    render(
      <MockedProvider addTypename={false} mocks={[errorMock]}>
        <BrowserRouter>
          <Provider store={store}>
            <I18nextProvider i18n={i18nForTest}>
              <PostCard {...cardProps} />
            </I18nextProvider>
          </Provider>
        </BrowserRouter>
      </MockedProvider>,
    );

    await userEvent.click(screen.getByTestId('viewPostBtn0'));
    await wait();
    const loadMoreBtn = screen.getByTestId('loadMoreCommentsBtn');
    await userEvent.click(loadMoreBtn);
    await wait();
    consoleErrorSpy.mockRestore();
  });

  test('Should handle loadMoreComments when no cursor is available', async () => {
    const mockSetPosts = vi.fn();
    const mockSetCommentsCursors = vi.fn();

    const cardProps = createBaseCardProps({
      id: '1',
      hasMoreComments: true,
      commentsCursors: {},
      comments: [
        {
          id: 'comment1',
          creator: { id: '1', name: 'User 1' },
          text: 'First comment',
          upVotesCount: 0,
          likedBy: [],
        },
      ],
      setPosts: mockSetPosts,
      setCommentsCursors: mockSetCommentsCursors,
    });

    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {});

    render(
      <MockedProvider addTypename={false} mocks={[]}>
        <BrowserRouter>
          <Provider store={store}>
            <I18nextProvider i18n={i18nForTest}>
              <PostCard {...cardProps} />
            </I18nextProvider>
          </Provider>
        </BrowserRouter>
      </MockedProvider>,
    );

    await userEvent.click(screen.getByTestId('viewPostBtn0'));
    await wait();
    const loadMoreBtn = screen.getByTestId('loadMoreCommentsBtn');
    await userEvent.click(loadMoreBtn);
    await wait();
    expect(mockSetPosts).not.toHaveBeenCalled();
    expect(mockSetCommentsCursors).not.toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });
});
