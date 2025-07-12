/**
 * The `home` component serves as the main user interface for displaying posts,
 * advertisements, and pinned posts within an organization. It also provides
 * functionality for creating new posts and inte      // Initialize comment cursors for each post
      const initialCursors: Record<string, string> = {};
      console.log(data.organization.posts.edges);
      data.organization.posts.edges.forEach((edge: InterfacePostEdge) => {
        const extendedEdge = edge as ExtendedPostEdge;
        if (extendedEdge.node.comments?.pageInfo?.endCursor) {
          initialCursors[edge.node.id] = extendedEdge.node.comments.pageInfo.endCursor;
        }
      });
      setCommentsCursors(initialCursors);ith existing ones.
 *
 * @returns {JSX.Element} The rendered home component.
 *
 * @remarks
 * - This component uses GraphQL queries to fetch posts, advertisements, and user details.
 * - It includes a post creation modal and a carousel for pinned posts.
 * - The component redirects to the user page if the organization ID is not available.
 *
 * @component
 * @category Screens
 *
 * @dependencies
 * - `@apollo/client` for GraphQL queries.
 * - `@mui/icons-material` for icons.
 * - `react-bootstrap` for UI components.
 * - `react-multi-carousel` for carousel functionality.
 * - Custom components like `PostCard`, `PromotedPost`, and `StartPostModal`.
 *
 * @example
 * ```tsx
 * <home />
 * ```
 *
 * @remarks
 * The component uses the following GraphQL queries:
 * - `ORGANIZATION_ADVERTISEMENT_LIST` to fetch advertisements.
 * - `ORGANIZATION_POST_LIST` to fetch posts.
 * - `USER_DETAILS` to fetch user details.
 *
 * @remarks
 * The component maintains the following state variables:
 * - `posts`: Stores the list of posts fetched from the server.
 * - `pinnedPosts`: Stores the list of pinned posts.
 * - `adContent`: Stores the list of advertisements.
 * - `showModal`: Controls the visibility of the post creation modal.
 * - `postImg`: Stores the base64-encoded image for a new post.
 *
 * @remarks
 * The component includes the following key functionalities:
 * - Fetching and displaying posts and advertisements.
 * - Filtering and displaying pinned posts in a carousel.
 * - Handling post creation through a modal.
 * - Redirecting to the user page if the organization ID is missing.
 */
import { useQuery, useLazyQuery } from '@apollo/client';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import SendIcon from '@mui/icons-material/Send';
import {
  ORGANIZATION_ADVERTISEMENT_LIST,
  ORGANIZATION_POST_LIST,
  USER_DETAILS,
  GET_POST_WITH_COMMENTS,
} from 'GraphQl/Queries/Queries';
import PostCard from 'components/UserPortal/PostCard/PostCard';
import type {
  InterfacePostEdge,
  InterfacePostCard,
  InterfaceCommentEdge,
  InterfaceQueryOrganizationAdvertisementListItem,
  InterfaceQueryUserListItem,
} from 'utils/interfaces';
import PromotedPost from 'components/UserPortal/PromotedPost/PromotedPost';
import StartPostModal from 'components/UserPortal/StartPostModal/StartPostModal';
import React, { useEffect, useState } from 'react';
import { Button, Col, Form, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import { Navigate, useParams } from 'react-router';
import useLocalStorage from 'utils/useLocalstorage';
import styles from 'style/app-fixed.module.css';
import convertToBase64 from 'utils/convertToBase64';
import Carousel from 'react-multi-carousel';
import { TAGS_QUERY_DATA_CHUNK_SIZE } from 'utils/organizationTagsUtils';
import 'react-multi-carousel/lib/styles.css';
import { PostComments, PostLikes, PostNode } from 'types/Post/type';

const responsive = {
  superLargeDesktop: { breakpoint: { max: 4000, min: 3000 }, items: 5 },
  desktop: { breakpoint: { max: 3000, min: 1024 }, items: 3 },
  tablet: { breakpoint: { max: 1024, min: 600 }, items: 2 },
  mobile: { breakpoint: { max: 600, min: 0 }, items: 1 },
};

type Ad = {
  _id: string;
  name: string;
  type: 'BANNER' | 'MENU' | 'POPUP';
  mediaUrl: string;
  endDate: string; // Assuming it's a string in the format 'yyyy-MM-dd'
  startDate: string; // Assuming it's a string in the format 'yyyy-MM-dd'
};

export default function home(): JSX.Element {
  // Translation hook for localized text
  const { t } = useTranslation('translation', { keyPrefix: 'home' });
  const { t: tCommon } = useTranslation('common');

  // Custom hook for accessing local storage
  const { getItem } = useLocalStorage();
  const [posts, setPosts] = useState<InterfacePostEdge[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<InterfacePostEdge[]>([]);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);

  // Track pagination cursors for comments of each post
  const [commentsCursors, setCommentsCursors] = useState<
    Record<string, string>
  >({});

  const [showModal, setShowModal] = useState<boolean>(false);
  const [postImg, setPostImg] = useState<string | null>('');

  // Fetching the organization ID from URL parameters
  const { orgId } = useParams();

  // Redirect to user page if organization ID is not available
  if (!orgId) {
    return <Navigate to={'/user'} />;
  }

  // Query hooks for fetching posts, advertisements, and user details
  const {
    data: promotedPostsData,
  }: {
    data?: { organizations: InterfaceQueryOrganizationAdvertisementListItem[] };
    refetch: () => void;
  } = useQuery(ORGANIZATION_ADVERTISEMENT_LIST, {
    variables: { id: orgId, first: 6 },
  });

  const {
    data,
    loading: loadingPosts,
    refetch,
    fetchMore,
  } = useQuery(ORGANIZATION_POST_LIST, {
    variables: {
      input: { id: orgId as string },
      first: 10,
      commentsFirst: 5,
      commentUpVotersFirst: 5,
      postUpVotersFirst: 5,
    },
  });

  const [adContent, setAdContent] = useState<Ad[]>([]);
  const userId: string | null = getItem('userId');

  const { data: userData } = useQuery(USER_DETAILS, {
    variables: {
      id: userId,
      first: TAGS_QUERY_DATA_CHUNK_SIZE, // This is for tagsAssignedWith pagination
    },
  });

  // Query hook for fetching comments with pagination
  const [fetchMoreCommentsQuery] = useLazyQuery(GET_POST_WITH_COMMENTS);

  const user: InterfaceQueryUserListItem | undefined = userData?.user;

  // Effect hook to update posts state when data changes
  useEffect(() => {
    if (data) {
      setPosts(data.organization.posts.edges as InterfacePostEdge[]);
      setHasMorePosts(data.organization.posts.pageInfo.hasNextPage);

      // Initialize comment cursors for each post
      const initialCursors: Record<string, string> = {};
      data.organization.posts.edges.forEach((edge: InterfacePostEdge) => {
        const extendedEdge = edge as InterfacePostEdge;
        if (extendedEdge.node.comments?.pageInfo?.endCursor) {
          initialCursors[edge.node.id] =
            extendedEdge.node.comments.pageInfo.endCursor;
        }
      });
      setCommentsCursors(initialCursors);
    }
  }, [data]);

  // Effect hook to update advertisements state when data changes
  useEffect(() => {
    if (promotedPostsData && promotedPostsData.organizations) {
      const ads: Ad[] =
        promotedPostsData.organizations[0].advertisements?.edges.map(
          (edge) => edge.node,
        ) || [];

      setAdContent(ads);
    }
  }, [promotedPostsData]);

  useEffect(() => {
    setPinnedPosts(
      posts.filter((edge: InterfacePostEdge) => {
        return edge.node.pinned;
      }),
    );
  }, [posts]);

  /**
   * Converts a post node into props for the `PostCard` component.
   *
   * @param node - The post node to convert.
   * @returns The props for the `PostCard` component.
   */
  const getCardProps = (node: PostNode): InterfacePostCard => {
    const {
      creator,
      id,
      imageUrl,
      videoUrl,
      title,
      caption,
      upVotesCount,
      upVoters,
      commentsCount,
      comments,
    } = node;
    const allLikes: PostLikes =
      upVoters?.edges?.map((value) => ({
        name: value.node?.name || '',
        id: value.node?.id || '',
      })) || [];
    const postComments: PostComments =
      comments?.edges.map((value) => {
        return {
          id: value.node.id,
          creator: {
            name: value.node.creator?.name ?? '',
            id: value.node.creator?.id ?? '',
          },
          upVotesCount: value.node.upVotesCount,
          likedBy:
            value.node.upVoters.edges?.map(
              (like: { node: { id: string; name: string } }) => ({
                id: like?.node.id ?? '',
                name: like?.node.name ?? '',
              }),
            ) ?? [],
          text: value.node.body,
        };
      }) ?? [];

    const date = new Date(node.createdAt);
    const formattedDate = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
    const cardProps: InterfacePostCard = {
      id: id,
      creator: {
        id: creator.id,
        name: creator.name,
      },
      postedAt: formattedDate,
      image: imageUrl,
      video: videoUrl,
      title,
      caption,
      upVotesCount,
      commentsCount,
      comments: postComments,
      likedBy: allLikes,
      fetchPosts: () => refetch(),
      // Add pagination functions and state
      loadMoreComments: (after?: string) => loadMoreComments(id, after),
      loadMorePostUpVoters: (after?: string) => loadMorePostUpVoters(id, after),
      loadMoreCommentUpVoters: (commentId: string, after?: string) =>
        loadMoreCommentUpVoters(id, commentId, after),
      hasMoreComments: comments?.pageInfo?.hasNextPage || false,
      hasMorePostUpVoters: upVoters?.pageInfo?.hasNextPage || false,
    };

    return cardProps;
  };

  /**
   * Opens the post creation modal.
   */
  const handlePostButtonClick = (): void => {
    setShowModal(true);
  };

  /**
   * Closes the post creation modal.
   */
  const handleModalClose = (): void => {
    setShowModal(false);
  };

  /**
   * Loads more posts using pagination.
   */
  const loadMorePosts = async (): Promise<void> => {
    if (!hasMorePosts || loadingMorePosts) return;

    setLoadingMorePosts(true);
    try {
      await fetchMore({
        variables: {
          input: { id: orgId as string },
          after: data?.organization.posts.pageInfo.endCursor,
          first: 10,
          commentsFirst: 5,
          commentUpVotersFirst: 5,
          postUpVotersFirst: 5,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;

          return {
            organization: {
              ...prev.organization,
              posts: {
                ...fetchMoreResult.organization.posts,
                edges: [
                  ...prev.organization.posts.edges,
                  ...fetchMoreResult.organization.posts.edges,
                ],
              },
            },
          };
        },
      });
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setLoadingMorePosts(false);
    }
  };

  /**
   * Loads more comments for a specific post using pagination.
   */
  const loadMoreComments = async (
    postId: string,
    after?: string,
  ): Promise<void> => {
    try {
      // Use the provided after cursor or get the last cursor for this post
      const cursor = after || commentsCursors[postId];
      const { data: commentsData } = await fetchMoreCommentsQuery({
        variables: {
          input: { id: postId },
          first: 10,
          after: cursor,
        },
      });

      if (!commentsData?.post) return;
      // Update the posts state with new comments
      setPosts((prevPosts) =>
        prevPosts.map((edge: InterfacePostEdge) => {
          if (edge.node.id !== postId) return edge;

          const newComments: InterfaceCommentEdge[] =
            commentsData.post.comments.edges;
          const existingComments = edge.node.comments.edges;

          // Merge existing and new comments, avoiding duplicates
          const mergedComments = [
            ...existingComments,
            ...newComments.filter(
              (newComment: InterfaceCommentEdge) =>
                !existingComments.some(
                  (existingComment: InterfaceCommentEdge) =>
                    existingComment.node.id === newComment.node.id,
                ),
            ),
          ];
          return {
            ...edge,
            node: {
              ...edge.node,
              comments: {
                ...edge.node.comments,
                edges: mergedComments,
                pageInfo: commentsData.post.comments.pageInfo,
              },
              commentsCount: commentsData.post.commentsCount,
            },
          } as InterfacePostEdge;
        }),
      );

      // Update the cursor for this post
      if (commentsData.post.comments.pageInfo.endCursor) {
        setCommentsCursors((prev) => ({
          ...prev,
          [postId]: commentsData.post.comments.pageInfo.endCursor,
        }));
      }
    } catch (error) {
      console.error('Error loading more comments:', error);
    }
  };

  /**
   * Loads more upVoters for a specific post using pagination.
   */
  const loadMorePostUpVoters = async (
    postId: string,
    after?: string,
  ): Promise<void> => {
    try {
      await fetchMore({
        variables: {
          input: { id: orgId as string },
          first: 10,
          commentsFirst: 5,
          commentUpVotersFirst: 5,
          postUpVotersFirst: 5,
          postUpVotersAfter: after,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;

          const updatedPosts = prev.organization.posts.edges.map(
            (edge: InterfacePostEdge) => {
              if (edge.node.id !== postId) return edge;

              // Find the updated post data
              const updatedPost = fetchMoreResult.organization.posts.edges.find(
                (newEdge: InterfacePostEdge) => newEdge.node.id === postId,
              );

              if (!updatedPost) return edge;

              // Merge existing and new upVoters
              const mergedUpVoters = [
                ...edge.node.upVoters.edges,
                ...updatedPost.node.upVoters.edges,
              ];

              return {
                ...edge,
                node: {
                  ...edge.node,
                  upVoters: {
                    ...edge.node.upVoters,
                    edges: mergedUpVoters,
                    pageInfo: updatedPost.node.upVoters.pageInfo,
                  },
                },
              };
            },
          );

          return {
            organization: {
              ...prev.organization,
              posts: {
                ...prev.organization.posts,
                edges: updatedPosts,
              },
            },
          };
        },
      });
    } catch (error) {
      console.error('Error loading more post upVoters:', error);
    }
  };

  /**
   * Loads more upVoters for a specific comment using pagination.
   */
  const loadMoreCommentUpVoters = async (
    postId: string,
    commentId: string,
    after?: string,
  ): Promise<void> => {
    try {
      await fetchMore({
        variables: {
          input: { id: orgId as string },
          first: 10,
          commentsFirst: 5,
          commentUpVotersFirst: 5,
          commentUpVotersAfter: after,
          postUpVotersFirst: 5,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;

          const updatedPosts = prev.organization.posts.edges.map(
            (edge: InterfacePostEdge) => {
              if (edge.node.id !== postId) return edge;

              // Find the updated post data
              const updatedPost = fetchMoreResult.organization.posts.edges.find(
                (newEdge: InterfacePostEdge) => newEdge.node.id === postId,
              );

              if (!updatedPost) return edge;

              // Update comments with new upVoters
              const updatedComments = edge.node.comments.edges.map(
                (commentEdge: InterfaceCommentEdge) => {
                  if (commentEdge.node.id !== commentId) return commentEdge;

                  // Find the updated comment data
                  const updatedComment = updatedPost.node.comments.edges.find(
                    (newCommentEdge: InterfaceCommentEdge) =>
                      newCommentEdge.node.id === commentId,
                  );

                  if (!updatedComment) return commentEdge;

                  // Merge existing and new upVoters for the comment
                  const mergedUpVoters = [
                    ...commentEdge.node.upVoters.edges,
                    ...updatedComment.node.upVoters.edges,
                  ];

                  return {
                    ...commentEdge,
                    node: {
                      ...commentEdge.node,
                      upVoters: {
                        ...commentEdge.node.upVoters,
                        edges: mergedUpVoters,
                        pageInfo: updatedComment.node.upVoters.pageInfo,
                      },
                    },
                  };
                },
              );

              return {
                ...edge,
                node: {
                  ...edge.node,
                  comments: {
                    ...edge.node.comments,
                    edges: updatedComments,
                  },
                },
              };
            },
          );

          return {
            organization: {
              ...prev.organization,
              posts: {
                ...prev.organization.posts,
                edges: updatedPosts,
              },
            },
          };
        },
      });
    } catch (error) {
      console.error('Error loading more comment upVoters:', error);
    }
  };

  return (
    <>
      <div className={`d-flex flex-row ${styles.containerHeightUserPost}`}>
        <div className={`${styles.colorLight} ${styles.mainContainer50}`}>
          <div className={`${styles.postContainer}`}>
            <div className={`${styles.heading}`}>{t('startPost')}</div>
            <div className={styles.postInputContainer}>
              <Row className="d-flex gap-1">
                <Col className={styles.maxWidthUserPost}>
                  <Form.Control
                    type="file"
                    accept="image/*"
                    multiple={false}
                    className={styles.inputField}
                    data-testid="postImageInput"
                    autoComplete="off"
                    onChange={async (
                      e: React.ChangeEvent<HTMLInputElement>,
                    ): Promise<void> => {
                      setPostImg('');
                      const target = e.target as HTMLInputElement;
                      const file = target.files && target.files[0];
                      const base64file = file && (await convertToBase64(file));
                      setPostImg(base64file);
                    }}
                  />
                </Col>
              </Row>
            </div>
            <div className="d-flex justify-content-end">
              <Button
                size="sm"
                data-testid={'postBtn'}
                onClick={handlePostButtonClick}
                className={`px-4 py-sm-2 ${styles.addButton}`}
              >
                {t('post')} <SendIcon />
              </Button>
            </div>
          </div>
          <div
            style={{
              justifyContent: `space-between`,
              alignItems: `center`,
              marginTop: `1rem`,
            }}
          >
            <h2>{t('feed')}</h2>
            {pinnedPosts.length > 0 && (
              <Carousel responsive={responsive}>
                {pinnedPosts.map((edge: InterfacePostEdge) => {
                  const cardProps = getCardProps(edge.node as PostNode);
                  return <PostCard key={edge.node.id} {...cardProps} />;
                })}
              </Carousel>
            )}
          </div>

          {adContent.length > 0 && (
            <div data-testid="promotedPostsContainer">
              {adContent.map((post: Ad) => (
                <PromotedPost
                  key={post._id}
                  id={post._id}
                  image={post.mediaUrl}
                  title={post.name}
                  data-testid="postid"
                />
              ))}
            </div>
          )}
          <p className="fs-5 mt-5">{t(`yourFeed`)}</p>
          <div className={` ${styles.postsCardsContainer}`}>
            {loadingPosts ? (
              <div className={`d-flex flex-row justify-content-center`}>
                <HourglassBottomIcon /> <span>{tCommon('loading')}</span>
              </div>
            ) : (
              <>
                {posts.length > 0 ? (
                  <>
                    <Row className="my-2">
                      {posts.map((edge: InterfacePostEdge) => {
                        const cardProps = getCardProps(edge.node as PostNode);
                        return <PostCard key={edge.node.id} {...cardProps} />;
                      })}
                    </Row>
                    {hasMorePosts && (
                      <div className="d-flex justify-content-center my-4">
                        <Button
                          variant="outline-primary"
                          onClick={loadMorePosts}
                          disabled={loadingMorePosts}
                          data-testid="loadMoreButton"
                        >
                          {loadingMorePosts ? (
                            <>
                              <HourglassBottomIcon className="me-2" />
                              {tCommon('loading')}
                            </>
                          ) : (
                            'Load More'
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="container flex justify-content-center my-4">
                    {t(`nothingToShowHere`)}
                  </p>
                )}
              </>
            )}
          </div>
          <StartPostModal
            show={showModal}
            onHide={handleModalClose}
            fetchPosts={refetch}
            userData={user}
            organizationId={orgId}
            img={postImg}
          />
        </div>
      </div>
    </>
  );
}
