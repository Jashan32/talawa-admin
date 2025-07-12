/**
 * Component representing a post card in the user portal.
 *
 * This component displays a post with its details such as title, content, creator,
 * likes, comments, and associated actions like editing, deleting, liking, and commenting.
 * It also includes modals for viewing the post in detail and editing the post content.
 *
 * @param props - The properties of the post card.
 * @param props.id - Unique identifier for the post.
 * @param props.creator - Object containing the creator's details (id, firstName, lastName, email).
 * @param props.title - Title of the post.
 * @param props.text - Content of the post.
 * @param props.image - URL of the post's image.
 * @param props.postedAt - Date when the post was created.
 * @param props.likeCount - Number of likes on the post.
 * @param props.likedBy - Array of users who liked the post.
 * @param props.comments - Array of comments on the post.
 * @param props.commentCount - Total number of comments on the post.
 * @param props.fetchPosts - Function to refresh the list of posts.
 *
 * @returns A JSX.Element representing the post card.
 *
 * @remarks
 * - Includes GraphQL mutations for liking, unliking, commenting, editing, and deleting posts.
 * - Uses `react-bootstrap` for UI components and `@apollo/client` for GraphQL operations.
 * - Handles state for likes, comments, and modals using React hooks.
 * - Displays error messages and success notifications using `react-toastify`.
 */
import React from 'react';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  Col,
  Button,
  Card,
  Dropdown,
  Form,
  InputGroup,
  Modal,
  ModalFooter,
} from 'react-bootstrap';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import ThumbUpOffAltIcon from '@mui/icons-material/ThumbUpOffAlt';
import SendIcon from '@mui/icons-material/Send';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import CommentIcon from '@mui/icons-material/Comment';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

import type {
  InterfacePostCard,
  InterfacePostEdge,
  InterfaceCommentEdge,
} from 'utils/interfaces';
import {
  CREATE_COMMENT_POST,
  DELETE_POST_MUTATION,
  LIKE_POST,
  UNLIKE_POST,
  UPDATE_POST_MUTATION,
} from 'GraphQl/Mutations/mutations';
import CommentCard from '../CommentCard/CommentCard';
import { errorHandler } from 'utils/errorHandler';
import useLocalStorage from 'utils/useLocalstorage';
import styles from '../../../style/app-fixed.module.css';
import UserDefault from '../../../assets/images/defaultImg.png';
import {
  GET_POST_WITH_COMMENTS,
  ORGANIZATION_POST_LIST,
} from 'GraphQl/Queries/OrganizationQueries';
interface InterfaceCommentCardProps {
  id: string;
  creator: { id: string; name: string };
  upVotesCount: number;
  likedBy: { id: string; name: string }[];
  text: string;
  handleLikeComment: (commentId: string) => void;
}

interface InterfaceQuery {
  organization: {
    posts: { edges: InterfacePostEdge[] };
  };
}

export default function postCard(props: InterfacePostCard): JSX.Element {
  const [fetchMoreCommentsQuery] = useLazyQuery(GET_POST_WITH_COMMENTS);
  const { t } = useTranslation('translation', { keyPrefix: 'postCard' });
  const { t: tCommon } = useTranslation('common');
  const { getItem } = useLocalStorage();

  // Retrieve user ID from local storage
  const userId = getItem('userId') as string;
  // Check if the post is liked by the current user
  const likedByUser = props.likedBy.some((likedBy) => likedBy.id === userId);
  // State variables
  const [comments, setComments] = React.useState(props.comments);
  const [numComments, setNumComments] = React.useState(props.commentsCount);
  const [commentsLoaded, setCommentsLoaded] = React.useState(false);
  const [loadingComments, setLoadingComments] = React.useState(false);

  const [likes, setLikes] = React.useState(props.upVotesCount);
  const [isLikedByUser, setIsLikedByUser] = React.useState(likedByUser);
  const [commentInput, setCommentInput] = React.useState('');
  const [viewPost, setViewPost] = React.useState(false);
  const [showEditPost, setShowEditPost] = React.useState(false);
  const [postContent, setPostContent] = React.useState<string>(props.caption);
  const postCreator = `${props.creator.name}`;

  // GraphQL mutations
  const [likePost, { loading: likeLoading }] = useMutation(LIKE_POST);
  const [unLikePost, { loading: unlikeLoading }] = useMutation(UNLIKE_POST);
  const [create, { loading: commentLoading }] =
    useMutation(CREATE_COMMENT_POST);
  const [editPost] = useMutation(UPDATE_POST_MUTATION);
  const [deletePost] = useMutation(DELETE_POST_MUTATION);
  const orgId = getItem('orgId');
  const { fetchMore } = useQuery(ORGANIZATION_POST_LIST, {
    variables: {
      input: { id: orgId as string },
      first: 10,
      postUpVotersFirst: 5,
    },
  });

  const loadPostComments = async (): Promise<void> => {
    try {
      const { data: commentsData } = await fetchMoreCommentsQuery({
        variables: {
          input: { id: props.postId },
          first: 10, // Load first 10 comments
        },
      });

      if (!commentsData?.post) return;

      // Update the posts state with the loaded comments
      props.setPosts((prevPosts) =>
        prevPosts.map((edge: InterfacePostEdge) => {
          if (edge.node.id !== props.postId) return edge;

          return {
            ...edge,
            node: {
              ...edge.node,
              comments: {
                edges: commentsData.post.comments.edges,
                pageInfo: commentsData.post.comments.pageInfo,
              },
              commentsCount: commentsData.post.commentsCount,
            },
          } as InterfacePostEdge;
        }),
      );

      // Set the initial cursor for this post
      if (commentsData.post.comments.pageInfo.endCursor) {
        props.setCommentsCursors((prev) => ({
          ...prev,
          [props.postId]: commentsData.post.comments.pageInfo.endCursor,
        }));
      }
    } catch (error) {
      console.error('Error loading post comments:', error);
    }
  };

  const loadMoreComments = async (after?: string): Promise<void> => {
    try {
      // Check if this is the first time loading comments for this post
      const currentPost = props.posts.find(
        (edge) => edge.node.id === props.postId,
      );
      const hasExistingComments =
        (currentPost?.node.comments?.edges?.length || 0) > 0;

      if (!hasExistingComments && !after) {
        await loadPostComments();
        return;
      }

      // Use the provided after cursor or get the last cursor for this post
      const cursor = after || props.commentsCursors[props.postId];
      const { data: commentsData } = await fetchMoreCommentsQuery({
        variables: {
          input: { id: props.postId },
          first: 10,
          after: cursor,
        },
      });

      if (!commentsData?.post) return;
      // Update the posts state with new comments
      props.setPosts((prevPosts) =>
        prevPosts.map((edge: InterfacePostEdge) => {
          if (edge.node.id !== props.postId) return edge;

          const newComments: InterfaceCommentEdge[] =
            commentsData.post.comments.edges;
          const existingComments = edge.node.comments?.edges || [];

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
        props.setCommentsCursors((prev) => ({
          ...prev,
          [props.postId]: commentsData.post.comments.pageInfo.endCursor,
        }));
      }
    } catch (error) {
      console.error('Error loading more comments:', error);
    }
  };

  const loadMorePostUpVoters = async (after?: string): Promise<void> => {
    try {
      const { data } = await fetchMore({
        variables: {
          input: { id: props.orgId as string },
          first: 10,
          postUpVotersFirst: 5,
          postUpVotersAfter: after,
        },
        updateQuery: (
          prev: InterfaceQuery,
          { fetchMoreResult }: { fetchMoreResult: InterfaceQuery },
        ) => {
          if (!fetchMoreResult) return prev;
          const updatedPosts = prev.organization.posts.edges.map(
            (edge: InterfacePostEdge) => {
              if (edge.node.id !== props.postId) return edge;

              // Find the updated post data
              const updatedPost = fetchMoreResult.organization.posts.edges.find(
                (newEdge: InterfacePostEdge) =>
                  newEdge.node.id === props.postId,
              );

              if (!updatedPost) return edge;

              // Merge existing and new upVoters, avoiding duplicates
              const existingUpVoters = edge.node.upVoters.edges;
              const newUpVoters = updatedPost.node.upVoters.edges;

              const mergedUpVoters = [
                ...existingUpVoters,
                ...newUpVoters.filter(
                  (newUpVoter: { node: { id: string; name: string } }) =>
                    !existingUpVoters.some(
                      (existingUpVoter: {
                        node: { id: string; name: string };
                      }) => existingUpVoter.node.id === newUpVoter.node.id,
                    ),
                ),
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
                  upVotesCount: updatedPost.node.upVotesCount,
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
      if (data?.organization?.posts?.edges) {
        const currentPost = data.organization.posts.edges.find(
          (edge: InterfacePostEdge) => edge.node.id === props.postId,
        );
        if (currentPost) {
          const allUpVoters = currentPost.node.upVoters.edges;
          const userHasLiked = allUpVoters.some(
            (upVoter: { node: { id: string; name: string } }) =>
              upVoter.node.id === userId,
          );
          setIsLikedByUser(userHasLiked);
          setLikes(currentPost.node.upVotesCount || 0);
        }
      }
    } catch (error) {
      console.error('Error loading more post upVoters:', error);
    }
  };
  const toggleViewPost = async (): Promise<void> => {
    if (!viewPost && !commentsLoaded) {
      setLoadingComments(true);
      await loadPostComments();
      setCommentsLoaded(true);
      setLoadingComments(false);
      await loadMorePostUpVoters();
    }
    setViewPost(!viewPost);
  };

  const toggleEditPost = (): void => setShowEditPost(!showEditPost);
  const handlePostInput = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setPostContent(e.target.value);
  };

  const handleToggleLike = async (): Promise<void> => {
    if (isLikedByUser) {
      try {
        const { data } = await unLikePost({
          variables: { postId: props.id, creatorId: userId },
        });

        if (data) {
          setLikes((likes) => likes - 1);
          setIsLikedByUser(false);
        }
      } catch (error: unknown) {
        toast.error(error as string);
      }
    } else {
      try {
        const { data } = await likePost({ variables: { postId: props.id } });

        if (data) {
          setLikes((likes) => likes + 1);
          setIsLikedByUser(true);
        }
      } catch (error: unknown) {
        toast.error(error as string);
      }
    }
  };

  // Handle changes to the comment input field
  const handleCommentInput = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void => {
    const comment = event.target.value;
    setCommentInput(comment);
  };

  // Like a comment
  const handleLikeComment = (commentId: string): void => {
    const updatedComments = comments.map((comment) => {
      let updatedComment = { ...comment };
      if (
        comment.id === commentId &&
        !comment.likedBy.some((user) => user.id === userId)
      ) {
        updatedComment = {
          ...comment,
          likedBy: [
            ...comment.likedBy,
            { id: userId as string, name: postCreator },
          ],
          upVotesCount: comment.upVotesCount + 1,
        };
      }
      return updatedComment;
    });
    setComments(updatedComments);
  };

  // Create a new comment
  const createComment = async (): Promise<void> => {
    try {
      // Ensure the input is not empty
      if (!commentInput.trim()) {
        toast.error(t('emptyCommentError'));
        return;
      }

      const { data: createEventData } = await create({
        variables: { postId: props.id, comment: commentInput },
      });

      if (createEventData) {
        setCommentInput('');
        setNumComments((numComments) => numComments + 1);
        console.log(createEventData.createComment);
        const newComment: InterfaceCommentCardProps = {
          id: createEventData.createComment.id,
          creator: {
            id: createEventData.createComment.creator._id,
            name: createEventData.createComment.creator.name,
          },
          upVotesCount: createEventData.createComment.upVotesCount,
          likedBy: createEventData.createComment.upVoters.edges.map(
            (user: { id: string; name: string }) => ({
              id: user.id,
              name: user.name,
            }),
          ),
          text: createEventData.createComment.body,
          handleLikeComment: handleLikeComment,
        };
        setComments([...comments, newComment]);
      }
    } catch (error: unknown) {
      console.error('Error creating comment:', error);
    }
  };

  const handleEditPost = async (): Promise<void> => {
    try {
      const { data: createEventData } = await editPost({
        variables: { id: props.id, text: postContent },
      });

      if (createEventData) {
        props.fetchPosts();
        toggleEditPost();
        toast.success(
          tCommon('updatedSuccessfully', { item: 'Post' }) as string,
        );
      }
    } catch (error: unknown) {
      errorHandler(t, error);
    }
  };

  const handleDeletePost = async (): Promise<void> => {
    try {
      const { data: createEventData } = await deletePost({
        variables: { id: props.id },
      });

      if (createEventData) {
        props.fetchPosts();
        toast.success('Successfully deleted the Post.');
      }
    } catch (error: unknown) {
      errorHandler(t, error);
    }
  };

  React.useEffect(() => {
    setComments(props.comments);
    if (props.comments.length > 0) {
      setCommentsLoaded(true);
    }
  }, [props.comments]);

  React.useEffect(() => {
    setLikes(props.upVotesCount);
    const userLiked = props.likedBy.some((likedBy) => likedBy.id === userId);
    setIsLikedByUser(userLiked);
  }, [props.upVotesCount, props.likedBy, userId]);

  return (
    <Col
      key={props.id}
      className="d-flex justify-content-center my-2"
      data-testid="postCardContainer"
    >
      <Card className={`${styles.cardStyles}`}>
        <Card.Header className={`${styles.cardHeaderPostCard}`}>
          <div data-testid={'creator'} className={`${styles.creator}`}>
            <AccountCircleIcon className="my-2" />
            <p>{postCreator}</p>
          </div>
          <Dropdown style={{ cursor: 'pointer' }}>
            <Dropdown.Toggle
              className={styles.customToggle}
              data-testid={'dropdown'}
            >
              <MoreVertIcon />
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={toggleEditPost} data-testid={'editPost'}>
                <EditOutlinedIcon
                  style={{ color: 'grey', marginRight: '8px' }}
                />
                {tCommon('edit')}
              </Dropdown.Item>
              <Dropdown.Item
                onClick={handleDeletePost}
                data-testid={'deletePost'}
              >
                <DeleteOutlineOutlinedIcon
                  style={{ color: 'red', marginRight: '8px' }}
                />
                {tCommon('delete')}
              </Dropdown.Item>
              {/* <Dropdown.Item href="#/action-3">Pin Post</Dropdown.Item>
              <Dropdown.Item href="#/action-3">Report</Dropdown.Item>
              <Dropdown.Item href="#/action-3">Share</Dropdown.Item> */}
            </Dropdown.Menu>
          </Dropdown>
        </Card.Header>
        <Card.Img
          className={styles.postImage}
          variant="top"
          src={
            props.image === '' ||
            props.image === null ||
            props.image === undefined
              ? UserDefault
              : props.image
          }
        />
        <Card.Body className="pb-0">
          <Card.Title
            datatest-id={'postTitle'}
            className={`${styles.cardTitlePostCard}`}
          >
            {props.title}
          </Card.Title>
          <Card.Subtitle style={{ color: '#808080' }}>
            {t('postedOn', { date: props.postedAt })}
          </Card.Subtitle>
          <Card.Text className={`${styles.cardText} mt-4`}>
            {props.caption}
          </Card.Text>
        </Card.Body>
        <Card.Footer style={{ border: 'none', background: 'white' }}>
          <div className={`${styles.cardActions}`}>
            <Button
              size="sm"
              className={`px-4 ${styles.addButton}`}
              data-testid={'viewPostBtn' + `${props.index}`}
              onClick={toggleViewPost}
            >
              {t('viewPost')}
            </Button>
          </div>
        </Card.Footer>
      </Card>
      <Modal show={viewPost} onHide={toggleViewPost} size="xl" centered>
        <Modal.Body className="d-flex w-100 p-0" style={{ minHeight: '80vh' }}>
          <div className="w-50 d-flex  align-items-center justify-content-center">
            <img
              src={
                props.image === '' ||
                props.image === null ||
                props.image === undefined
                  ? UserDefault
                  : props.image
              }
              alt="postImg"
              className="w-100"
            />
          </div>
          <div className="w-50 p-2 position-relative">
            <div className="d-flex justify-content-between align-items-center">
              <div className={`${styles.cardHeaderPostCard} p-0`}>
                <AccountCircleIcon className="my-2" />
                <p>{postCreator}</p>
              </div>
              <div style={{ cursor: 'pointer' }}>
                <MoreVertIcon />
              </div>
            </div>
            <div className="mt-2">
              <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                {props.title}
              </p>
              <p>{props.caption}</p>
            </div>
            <h4 datatest-id="commentid">Comments</h4>
            <div className={styles.commentContainer}>
              {loadingComments ? (
                <div className="d-flex justify-content-center p-3">
                  <HourglassBottomIcon className="me-2" />
                  <span>Loading comments...</span>
                </div>
              ) : numComments ? (
                comments.map((comment, index: number) => {
                  const cardProps: InterfaceCommentCardProps = {
                    id: comment.id,
                    creator: {
                      id: comment.creator.id,
                      name: comment.creator.name,
                    },
                    upVotesCount: comment.upVotesCount,
                    likedBy: comment.likedBy,
                    text: comment.text,
                    handleLikeComment: handleLikeComment,
                  };
                  return <CommentCard key={index} {...cardProps} />;
                })
              ) : (
                <p>No comments to show.</p>
              )}
              {!loadingComments && props.hasMoreComments && (
                <div className="d-flex justify-content-center mt-3">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => loadMoreComments()}
                    data-testid="loadMoreCommentsBtn"
                  >
                    Load More Comments
                  </Button>
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <div className={`${styles.modalActions}`}>
                <div className="d-flex align-items-center gap-2">
                  <Button
                    className={`${styles.cardActionBtn}`}
                    onClick={handleToggleLike}
                    data-testid={'likePostBtn'}
                  >
                    {likeLoading || unlikeLoading ? (
                      <HourglassBottomIcon fontSize="small" />
                    ) : isLikedByUser ? (
                      <ThumbUpIcon fontSize="small" />
                    ) : (
                      <ThumbUpOffAltIcon fontSize="small" />
                    )}
                  </Button>
                  {likes}
                  {` ${t('likes')}`}
                </div>
                <div className="d-flex align-items-center gap-2">
                  <Button className={`${styles.cardActionBtn}`}>
                    <CommentIcon fontSize="small" />
                  </Button>
                  {numComments}
                  {` ${t('comments')}`}
                </div>
              </div>
              <InputGroup className="mt-2">
                <Form.Control
                  placeholder={'Enter comment'}
                  type="text"
                  className={styles.inputArea}
                  value={commentInput}
                  onChange={handleCommentInput}
                  data-testid="commentInput"
                />
                <InputGroup.Text
                  className={`${styles.colorPrimary} ${styles.borderNone}`}
                  onClick={createComment}
                  data-testid="createCommentBtn"
                >
                  {commentLoading ? (
                    <HourglassBottomIcon fontSize="small" />
                  ) : (
                    <SendIcon />
                  )}
                </InputGroup.Text>
              </InputGroup>
            </div>
          </div>
        </Modal.Body>
      </Modal>
      <Modal show={showEditPost} onHide={toggleEditPost} size="lg" centered>
        <Modal.Header closeButton className={`py-2`}>
          <p className="fs-3" data-testid={'editPostModalTitle'}>
            {t('editPost')}
          </p>
        </Modal.Header>
        <Modal.Body>
          <Form.Control
            type="text"
            as="textarea"
            rows={3}
            className={styles.postInput}
            data-testid="postInput"
            autoComplete="off"
            required
            onChange={handlePostInput}
            value={postContent}
          />
        </Modal.Body>
        <ModalFooter>
          <Button
            size="sm"
            className={`px-4 ${styles.addButton}`}
            data-testid={'editPostBtn'}
            onClick={handleEditPost}
          >
            {t('editPost')}
          </Button>
        </ModalFooter>
      </Modal>
    </Col>
  );
}
