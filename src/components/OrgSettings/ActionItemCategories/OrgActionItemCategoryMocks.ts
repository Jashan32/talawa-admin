import {
  CREATE_ACTION_ITEM_CATEGORY_MUTATION,
  UPDATE_ACTION_ITEM_CATEGORY_MUTATION,
  DELETE_ACTION_ITEM_CATEGORY_MUTATION,
} from 'GraphQl/Mutations/ActionItemCategoryMutations';

import { ACTION_ITEM_CATEGORY_LIST } from 'GraphQl/Queries/Queries';

export const MOCKS = [
  {
    request: {
      query: ACTION_ITEM_CATEGORY_LIST,
      variables: {
        input: {
          organizationId: 'orgId',
        },
      },
    },
    result: {
      data: {
        actionCategoriesByOrganization: [
          {
            id: 'categoryId1',
            name: 'Category 1',
            isDisabled: false,
            creatorId: 'creatorId1',
            createdAt: '2024-08-26',
            updatedAt: '2024-08-26',
          },
          {
            id: 'categoryId2',
            name: 'Category 2',
            isDisabled: true,
            creatorId: 'creatorId2',
            createdAt: '2024-08-25',
            updatedAt: '2024-08-25',
          },
        ],
      },
    },
  },
  // CREATE mutations for tests
  {
    request: {
      query: CREATE_ACTION_ITEM_CATEGORY_MUTATION,
      variables: {
        input: {
          name: 'New Category',
          description: 'New description',
          isDisabled: true,
          organizationId: 'orgId',
        },
      },
    },
    result: {
      data: {
        createActionItemCategory: {
          id: 'newCategoryId1',
          name: 'New Category',
          description: 'New description',
          isDisabled: true,
          createdAt: '2044-01-01',
          creator: {
            id: 'userId',
          },
          organization: {
            id: 'orgId',
            name: 'Test Organization',
          },
        },
      },
    },
  },
  {
    request: {
      query: CREATE_ACTION_ITEM_CATEGORY_MUTATION,
      variables: {
        input: {
          name: 'New Category',
          description: null,
          isDisabled: false,
          organizationId: 'orgId',
        },
      },
    },
    result: {
      data: {
        createActionItemCategory: {
          id: 'newCategoryId2',
          name: 'New Category',
          description: null,
          isDisabled: false,
          createdAt: '2044-01-01',
          creator: {
            id: 'userId',
          },
          organization: {
            id: 'orgId',
            name: 'Test Organization',
          },
        },
      },
    },
  },
  {
    request: {
      query: CREATE_ACTION_ITEM_CATEGORY_MUTATION,
      variables: {
        input: {
          name: 'Minimal Category',
          description: null,
          isDisabled: false,
          organizationId: 'orgId',
        },
      },
    },
    result: {
      data: {
        createActionItemCategory: {
          id: 'newCategoryId3',
          name: 'Minimal Category',
          description: null,
          isDisabled: false,
          createdAt: '2044-01-01',
          creator: {
            id: 'userId',
          },
          organization: {
            id: 'orgId',
            name: 'Test Organization',
          },
        },
      },
    },
  },
  // UPDATE mutations for single field changes
  {
    request: {
      query: UPDATE_ACTION_ITEM_CATEGORY_MUTATION,
      variables: {
        input: {
          id: 'categoryId',
          name: 'Category 2',
        },
      },
    },
    result: {
      data: {
        updateActionItemCategory: {
          id: 'categoryId',
          name: 'Category 2',
          isDisabled: false,
          updatedAt: '2044-01-01',
        },
      },
    },
  },
  {
    request: {
      query: UPDATE_ACTION_ITEM_CATEGORY_MUTATION,
      variables: {
        input: {
          id: 'categoryId',
          description: 'New description only',
        },
      },
    },
    result: {
      data: {
        updateActionItemCategory: {
          id: 'categoryId',
          name: 'Category 1',
          isDisabled: false,
          updatedAt: '2044-01-01',
        },
      },
    },
  },
  {
    request: {
      query: UPDATE_ACTION_ITEM_CATEGORY_MUTATION,
      variables: {
        input: {
          id: 'categoryId',
          isDisabled: true,
        },
      },
    },
    result: {
      data: {
        updateActionItemCategory: {
          id: 'categoryId',
          name: 'Category 1',
          isDisabled: true,
          updatedAt: '2044-01-01',
        },
      },
    },
  },
  {
    request: {
      query: UPDATE_ACTION_ITEM_CATEGORY_MUTATION,
      variables: {
        input: {
          id: 'categoryId',
          description: null,
        },
      },
    },
    result: {
      data: {
        updateActionItemCategory: {
          id: 'categoryId',
          name: 'Category 1',
          description: null,
          updatedAt: '2044-01-01',
        },
      },
    },
  },
  // UPDATE mutations for multiple field changes
  {
    request: {
      query: UPDATE_ACTION_ITEM_CATEGORY_MUTATION,
      variables: {
        input: {
          id: 'categoryId',
          name: 'Updated Name',
          description: 'Updated description',
        },
      },
    },
    result: {
      data: {
        updateActionItemCategory: {
          id: 'categoryId',
          name: 'Updated Name',
          isDisabled: false,
          updatedAt: '2044-01-01',
        },
      },
    },
  },
  {
    request: {
      query: UPDATE_ACTION_ITEM_CATEGORY_MUTATION,
      variables: {
        input: {
          id: 'categoryId',
          name: 'Updated Name',
          isDisabled: true,
        },
      },
    },
    result: {
      data: {
        updateActionItemCategory: {
          id: 'categoryId',
          name: 'Updated Name',
          isDisabled: true,
          updatedAt: '2044-01-01',
        },
      },
    },
  },
  {
    request: {
      query: UPDATE_ACTION_ITEM_CATEGORY_MUTATION,
      variables: {
        input: {
          id: 'categoryId',
          description: 'Updated description',
          isDisabled: true,
        },
      },
    },
    result: {
      data: {
        updateActionItemCategory: {
          id: 'categoryId',
          name: 'Category 1',
          isDisabled: true,
          updatedAt: '2044-01-01',
        },
      },
    },
  },
  {
    request: {
      query: UPDATE_ACTION_ITEM_CATEGORY_MUTATION,
      variables: {
        input: {
          id: 'categoryId',
          name: 'Completely New Name',
          description: 'Completely new description',
          isDisabled: true,
        },
      },
    },
    result: {
      data: {
        updateActionItemCategory: {
          id: 'categoryId',
          name: 'Completely New Name',
          isDisabled: true,
          updatedAt: '2044-01-01',
        },
      },
    },
  },
  // DELETE mutation
  {
    request: {
      query: DELETE_ACTION_ITEM_CATEGORY_MUTATION,
      variables: {
        input: {
          id: 'categoryId',
        },
      },
    },
    result: {
      data: {
        deleteActionItemCategory: {
          id: 'categoryId',
          name: 'Category 1',
        },
      },
    },
  },
];

export const MOCKS_EMPTY = [
  {
    request: {
      query: ACTION_ITEM_CATEGORY_LIST,
      variables: {
        input: {
          organizationId: 'orgId',
        },
      },
    },
    result: {
      data: {
        actionCategoriesByOrganization: [],
      },
    },
  },
];

export const MOCKS_ERROR = [
  {
    request: {
      query: ACTION_ITEM_CATEGORY_LIST,
      variables: {
        input: {
          organizationId: 'orgId',
        },
      },
    },
    error: new Error('Mock Graphql Error'),
  },
  {
    request: {
      query: CREATE_ACTION_ITEM_CATEGORY_MUTATION,
      variables: {
        input: {
          name: 'New Category',
          description: 'New description',
          isDisabled: true,
          organizationId: 'orgId',
        },
      },
    },
    error: new Error('Mock Graphql Error'),
  },
  {
    request: {
      query: UPDATE_ACTION_ITEM_CATEGORY_MUTATION,
      variables: {
        input: {
          id: 'categoryId',
          name: 'Updated Name',
        },
      },
    },
    error: new Error('Mock Graphql Error'),
  },
  {
    request: {
      query: UPDATE_ACTION_ITEM_CATEGORY_MUTATION,
      variables: {
        input: {
          id: 'categoryId',
          name: 'Updated Name',
          description: 'Updated description',
          isDisabled: true,
        },
      },
    },
    error: new Error('Mock Graphql Error'),
  },
  {
    request: {
      query: DELETE_ACTION_ITEM_CATEGORY_MUTATION,
      variables: {
        input: {
          id: 'categoryId',
        },
      },
    },
    error: new Error('Mock Graphql Error'),
  },
];
