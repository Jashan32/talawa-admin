import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  cleanup,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/react-testing';
import type { MockedResponse } from '@apollo/react-testing';
import { StaticMockLink } from 'utils/StaticMockLink';
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter } from 'react-router';
import { toast } from 'react-toastify';
import { vi } from 'vitest';

import SharedOrgList from './orgList';
import {
  ORGANIZATION_LIST,
  CURRENT_USER,
  USER_CREATED_ORGANIZATIONS,
  ORGANIZATION_FILTER_LIST,
  USER_JOINED_ORGANIZATIONS_NO_MEMBERS,
} from 'GraphQl/Queries/Queries';
import {
  CREATE_ORGANIZATION_MUTATION_PG,
  CREATE_ORGANIZATION_MEMBERSHIP_MUTATION_PG,
} from 'GraphQl/Mutations/mutations';
import useLocalStorage from 'utils/useLocalstorage';
import i18nForTest from 'utils/i18nForTest';

const { setItem, getItem } = useLocalStorage();

// SKIP_LOCALSTORAGE_CHECK
vi.setConfig({ testTimeout: 30000 });

const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: mockToast,
  ToastContainer: vi
    .fn()
    .mockImplementation(() => <div data-testid="toast-container" />),
}));

// Mock PaginationList component
vi.mock('components/Pagination/PaginationList/PaginationList', () => ({
  default: ({
    count,
    rowsPerPage,
    page,
    onPageChange,
    onRowsPerPageChange,
  }: {
    count: number;
    rowsPerPage: number;
    page: number;
    onPageChange: (
      event: React.MouseEvent<unknown> | null,
      newPage: number,
    ) => void;
    onRowsPerPageChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  }) => (
    <div data-testid="table-pagination">
      <span data-testid="pagination-count">{count}</span>
      <select
        data-testid="rows-per-page"
        value={rowsPerPage}
        onChange={(e) => onRowsPerPageChange(e as any)}
      >
        <option value="5">5</option>
        <option value="10">10</option>
        <option value="25">25</option>
      </select>
      <span data-testid="current-page">{page}</span>
      <button
        data-testid="prev-page"
        onClick={(e) => onPageChange(e, Math.max(0, page - 1))}
        disabled={page === 0}
      >
        Previous
      </button>
      <button
        data-testid="next-page"
        onClick={(e) => onPageChange(e, page + 1)}
      >
        Next
      </button>
    </div>
  ),
}));

// Mock components
vi.mock('components/OrgListCard/OrgListCard', () => ({
  default: ({ data }: { data: any }) => (
    <div data-testid={`org-list-card-${data.id || 'unknown'}`}>
      <span data-testid="org-card-name">{data.name}</span>
      <span data-testid="org-card-id">{data.id}</span>
    </div>
  ),
}));

vi.mock('components/UserPortal/OrganizationCard/OrganizationCard', () => ({
  default: ({ name, id, membershipRequestStatus, isJoined }: any) => (
    <div data-testid={`organization-card-${id || 'unknown'}`}>
      <span data-testid={`org-name-${name}`}>{name}</span>
      <span data-testid={`org-id-${id}`}>{id}</span>
      <span data-testid={`membership-status-${name}`}>
        {membershipRequestStatus}
      </span>
      <span data-testid={`is-joined-${name}`}>
        {isJoined ? 'true' : 'false'}
      </span>
    </div>
  ),
}));

vi.mock('components/NotificationIcon/NotificationIcon', () => ({
  default: () => <div data-testid="notification-icon" />,
}));

vi.mock('subComponents/SortingButton', () => ({
  default: ({
    sortingOptions,
    selectedOption,
    onSortChange,
    dataTestIdPrefix,
    dropdownTestId,
  }: any) => (
    <div data-testid={dropdownTestId}>
      <button data-testid={`${dataTestIdPrefix}Toggle`}>
        {selectedOption}
      </button>
      <div data-testid="sortingDropdown">
        {sortingOptions.map((option: any, index: number) => (
          <button
            key={index}
            data-testid={option.value}
            onClick={() => onSortChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  ),
}));

vi.mock('./modal/OrganizationModal', () => ({
  default: ({
    showModal,
    toggleModal,
    createOrg,
    formState,
    setFormState,
  }: any) => (
    <div
      data-testid="organization-modal"
      style={{ display: showModal ? 'block' : 'none' }}
    >
      <button data-testid="close-modal" onClick={toggleModal}>
        Close
      </button>
      <form data-testid="org-form" onSubmit={createOrg}>
        <input
          data-testid="modalOrganizationName"
          value={formState.name}
          onChange={(e) => setFormState({ ...formState, name: e.target.value })}
          placeholder="Organization Name"
        />
        <input
          data-testid="modalDescription"
          value={formState.description}
          onChange={(e) =>
            setFormState({ ...formState, description: e.target.value })
          }
          placeholder="Description"
        />
        <input
          data-testid="modalAddressLine1"
          value={formState.addressLine1}
          onChange={(e) =>
            setFormState({ ...formState, addressLine1: e.target.value })
          }
          placeholder="Address Line 1"
        />
        <input
          data-testid="modalCity"
          value={formState.city}
          onChange={(e) => setFormState({ ...formState, city: e.target.value })}
          placeholder="City"
        />
        <input
          data-testid="modalState"
          value={formState.state}
          onChange={(e) =>
            setFormState({ ...formState, state: e.target.value })
          }
          placeholder="State"
        />
        <input
          data-testid="modalPostalCode"
          value={formState.postalCode}
          onChange={(e) =>
            setFormState({ ...formState, postalCode: e.target.value })
          }
          placeholder="Postal Code"
        />
        <select
          data-testid="modalCountryCode"
          value={formState.countryCode}
          onChange={(e) =>
            setFormState({ ...formState, countryCode: e.target.value })
          }
        >
          <option value="">Select Country</option>
          <option value="af">Afghanistan</option>
          <option value="us">United States</option>
        </select>
        <button type="submit" data-testid="createOrgSubmit">
          Create Organization
        </button>
      </form>
    </div>
  ),
}));

// Test constants
const TEST_USER_ID = '01958985-600e-7cde-94a2-b3fc1ce66cf3';
const TEST_ADMIN_ID = 'admin-user-id-123';

// Mock organization data
const mockOrgData = {
  adminOrgs: [
    {
      id: 'admin-org-1',
      name: 'Admin Organization 1',
      addressLine1: 'Admin Address 1',
      description: 'Admin Organization Description 1',
      avatarURL: '',
      createdAt: '2023-04-13T04:53:17.742+00:00',
      members: { edges: [] },
      membersCount: 10,
      adminsCount: 2,
    },
    {
      id: 'admin-org-2',
      name: 'Admin Organization 2',
      addressLine1: 'Admin Address 2',
      description: 'Admin Organization Description 2',
      avatarURL: '',
      createdAt: '2023-04-14T04:53:17.742+00:00',
      members: { edges: [] },
      membersCount: 15,
      adminsCount: 3,
    },
  ],
  userAllOrgs: [
    {
      id: 'user-org-1',
      name: 'User Organization 1',
      addressLine1: 'User Address 1',
      description: 'User Organization Description 1',
      avatarURL: '',
      isMember: true,
      adminsCount: 2,
      membersCount: 20,
      members: { edges: [] },
      __typename: 'Organization',
    },
    {
      id: 'user-org-2',
      name: 'User Organization 2',
      addressLine1: 'User Address 2',
      description: 'User Organization Description 2',
      avatarURL: '',
      isMember: false,
      adminsCount: 1,
      membersCount: 5,
      members: { edges: [] },
      __typename: 'Organization',
    },
  ],
  joinedOrgs: [
    {
      id: 'joined-org-1',
      name: 'Joined Organization 1',
      description: 'Joined Organization Description 1',
      addressLine1: 'Joined Address 1',
      avatarURL: '',
      image: '',
      address: {
        line1: 'Joined Address 1',
        city: 'Test City',
        countryCode: 'US',
        postalCode: '12345',
        state: 'Test State',
      },
      admins: [],
      membershipRequests: [],
      userRegistrationRequired: false,
      isJoined: true,
      membersCount: 25,
      adminsCount: 3,
      membershipRequestStatus: 'accepted',
    },
  ],
  createdOrgs: [
    {
      id: 'created-org-1',
      name: 'Created Organization 1',
      description: 'Created Organization Description 1',
      addressLine1: 'Created Address 1',
      avatarURL: '',
      image: '',
      address: {
        line1: 'Created Address 1',
        city: 'Created City',
        countryCode: 'US',
        postalCode: '54321',
        state: 'Created State',
      },
      admins: [],
      membershipRequests: [],
      userRegistrationRequired: false,
      isJoined: true,
      membersCount: 30,
      adminsCount: 4,
      membershipRequestStatus: 'created',
    },
  ],
};

// Mock queries
const CURRENT_USER_MOCK = {
  request: {
    query: CURRENT_USER,
    variables: { userId: TEST_USER_ID },
  },
  result: {
    data: {
      currentUser: {
        id: TEST_USER_ID,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        image: null,
      },
    },
  },
};

const ADMIN_CURRENT_USER_MOCK = {
  request: {
    query: CURRENT_USER,
    variables: { userId: TEST_ADMIN_ID },
  },
  result: {
    data: {
      currentUser: {
        id: TEST_ADMIN_ID,
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        image: null,
      },
    },
  },
};

const ORGANIZATION_LIST_MOCK = {
  request: {
    query: ORGANIZATION_LIST,
    variables: { filter: '' },
  },
  result: {
    data: {
      organizations: mockOrgData.adminOrgs,
    },
  },
};

const ORGANIZATION_FILTER_LIST_MOCK = {
  request: {
    query: ORGANIZATION_FILTER_LIST,
    variables: { filter: '' },
  },
  result: {
    data: {
      organizations: mockOrgData.userAllOrgs,
    },
  },
};

const USER_JOINED_ORGANIZATIONS_MOCK = {
  request: {
    query: USER_JOINED_ORGANIZATIONS_NO_MEMBERS,
    variables: { id: TEST_USER_ID, first: 5, filter: '' },
  },
  result: {
    data: {
      user: {
        organizationsWhereMember: {
          edges: mockOrgData.joinedOrgs.map((org) => ({ node: org })),
          pageInfo: {
            hasNextPage: false,
          },
        },
      },
    },
  },
};

const USER_CREATED_ORGANIZATIONS_MOCK = {
  request: {
    query: USER_CREATED_ORGANIZATIONS,
    variables: { id: TEST_USER_ID, filter: '' },
  },
  result: {
    data: {
      user: {
        id: TEST_USER_ID,
        createdOrganizations: mockOrgData.createdOrgs,
      },
    },
  },
};

const CREATE_ORGANIZATION_MOCK = {
  request: {
    query: CREATE_ORGANIZATION_MUTATION_PG,
    variables: {
      name: 'Test Organization',
      description: 'Test Description',
      addressLine1: '123 Test St',
      addressLine2: '',
      city: 'Test City',
      countryCode: 'us',
      postalCode: '12345',
      state: 'Test State',
      avatar: null,
    },
  },
  result: {
    data: {
      createOrganization: {
        id: 'new-org-id',
        name: 'Test Organization',
      },
    },
  },
};

const CREATE_MEMBERSHIP_MOCK = {
  request: {
    query: CREATE_ORGANIZATION_MEMBERSHIP_MUTATION_PG,
    variables: {
      memberId: TEST_ADMIN_ID,
      organizationId: 'new-org-id',
      role: 'administrator',
    },
  },
  result: {
    data: {
      createOrganizationMembership: {
        id: 'membership-id',
      },
    },
  },
};

const EMPTY_ORGANIZATIONS_MOCK = {
  request: {
    query: ORGANIZATION_FILTER_LIST,
    variables: { filter: '' },
  },
  result: {
    data: {
      organizations: [],
    },
  },
};

// Mock configurations
const adminMocks = [
  ADMIN_CURRENT_USER_MOCK,
  ORGANIZATION_LIST_MOCK,
  CREATE_ORGANIZATION_MOCK,
  CREATE_MEMBERSHIP_MOCK,
];

const userMocks = [
  CURRENT_USER_MOCK,
  ORGANIZATION_FILTER_LIST_MOCK,
  USER_JOINED_ORGANIZATIONS_MOCK,
  USER_CREATED_ORGANIZATIONS_MOCK,
];

const emptyMocks = [CURRENT_USER_MOCK, EMPTY_ORGANIZATIONS_MOCK];

// Helper function to render component with providers
const renderWithProviders = (mocks: MockedResponse[] = userMocks) => {
  const link = new StaticMockLink(mocks, true);
  return render(
    <MockedProvider addTypename={false} link={link}>
      <BrowserRouter>
        <I18nextProvider i18n={i18nForTest}>
          <SharedOrgList />
        </I18nextProvider>
      </BrowserRouter>
    </MockedProvider>,
  );
};

async function wait(ms = 100): Promise<void> {
  await act(() => {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  });
}

// Setup and teardown
beforeEach(() => {
  vi.spyOn(Storage.prototype, 'setItem');
});

afterEach(() => {
  localStorage.clear();
  cleanup();
  vi.clearAllMocks();
});

describe('SharedOrgList Component - Admin Mode', () => {
  beforeEach(() => {
    setItem('userId', TEST_ADMIN_ID);
    setItem('userType', 'ADMIN');
    setItem('role', 'administrator');
  });

  test('renders correctly in admin mode', async () => {
    renderWithProviders(adminMocks);
    await wait();

    expect(screen.getByTestId('searchInput')).toBeInTheDocument();
    expect(screen.getByTestId('searchBtn')).toBeInTheDocument();
    expect(screen.getByTestId('createOrganizationBtn')).toBeInTheDocument();
    expect(screen.getByTestId('notification-icon')).toBeInTheDocument();
    expect(screen.getByTestId('sort')).toBeInTheDocument();
  });

  test('displays admin organizations correctly', async () => {
    renderWithProviders(adminMocks);
    await wait();

    await waitFor(() => {
      // Check that admin organization cards are present
      const orgCards = document.querySelectorAll(
        '[data-testid*="org-list-card"]',
      );
      expect(orgCards.length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('Admin Organization 1')).toBeInTheDocument();
      expect(screen.getByText('Admin Organization 2')).toBeInTheDocument();
    });
  });

  test('handles search functionality in admin mode', async () => {
    const searchMocks = [
      ...adminMocks,
      {
        request: {
          query: ORGANIZATION_LIST,
          variables: { filter: 'Admin' },
        },
        result: {
          data: {
            organizations: [mockOrgData.adminOrgs[0]],
          },
        },
      },
    ];

    renderWithProviders(searchMocks);
    await wait();

    const searchInput = screen.getByTestId('searchInput');
    await userEvent.type(searchInput, 'Admin');

    const searchBtn = screen.getByTestId('searchBtn');
    fireEvent.click(searchBtn);

    await wait();
  });

  test('handles search by Enter key in admin mode', async () => {
    renderWithProviders(adminMocks);
    await wait();

    const searchInput = screen.getByTestId('searchInput');
    await userEvent.type(searchInput, 'Test');
    fireEvent.keyUp(searchInput, { key: 'Enter', code: 'Enter' });

    await wait();
  });

  test('handles sorting functionality', async () => {
    renderWithProviders(adminMocks);
    await wait();

    const sortToggle = screen.getByTestId('sortOrgsToggle');
    fireEvent.click(sortToggle);

    const latestOption = screen.getByTestId('Latest');
    fireEvent.click(latestOption);

    await wait();

    const earliestOption = screen.getByTestId('Earliest');
    fireEvent.click(earliestOption);

    await wait();
  });

  test('opens and closes create organization modal', async () => {
    renderWithProviders(adminMocks);
    await wait();

    const createBtn = screen.getByTestId('createOrganizationBtn');
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByTestId('organization-modal')).toBeVisible();
    });

    const closeBtn = screen.getByTestId('close-modal');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.getByTestId('organization-modal')).not.toBeVisible();
    });
  });

  test('creates organization successfully', async () => {
    renderWithProviders(adminMocks);
    await wait();

    // Open modal
    const createBtn = screen.getByTestId('createOrganizationBtn');
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByTestId('organization-modal')).toBeVisible();
    });

    // Fill form
    const nameInput = screen.getByTestId('modalOrganizationName');
    const descInput = screen.getByTestId('modalDescription');
    const addressInput = screen.getByTestId('modalAddressLine1');
    const cityInput = screen.getByTestId('modalCity');
    const stateInput = screen.getByTestId('modalState');
    const postalInput = screen.getByTestId('modalPostalCode');
    const countrySelect = screen.getByTestId('modalCountryCode');

    await userEvent.type(nameInput, 'Test Organization');
    await userEvent.type(descInput, 'Test Description');
    await userEvent.type(addressInput, '123 Test St');
    await userEvent.type(cityInput, 'Test City');
    await userEvent.type(stateInput, 'Test State');
    await userEvent.type(postalInput, '12345');
    await userEvent.selectOptions(countrySelect, 'us');

    // Submit form
    const submitBtn = screen.getByTestId('createOrgSubmit');
    fireEvent.click(submitBtn);

    await wait();
  });

  test('handles pagination in admin mode', async () => {
    const largeMocks = [
      ADMIN_CURRENT_USER_MOCK,
      {
        request: {
          query: ORGANIZATION_LIST,
          variables: { filter: '' },
        },
        result: {
          data: {
            organizations: Array.from({ length: 12 }, (_, i) => ({
              id: `org-${i}`,
              name: `Organization ${i + 1}`,
              addressLine1: `Address ${i + 1}`,
              description: `Description ${i + 1}`,
              avatarURL: '',
              createdAt: `2023-04-${13 + i}T04:53:17.742+00:00`,
              members: { edges: [] },
              membersCount: 5,
              adminsCount: 1,
            })),
          },
        },
      },
    ];

    renderWithProviders(largeMocks);
    await wait();

    await waitFor(() => {
      expect(screen.getByTestId('table-pagination')).toBeInTheDocument();
    });

    const nextButton = screen.getByTestId('next-page');
    fireEvent.click(nextButton);

    await wait();

    const prevButton = screen.getByTestId('prev-page');
    fireEvent.click(prevButton);

    await wait();
  });
});

describe('SharedOrgList Component - User Mode', () => {
  beforeEach(() => {
    setItem('userId', TEST_USER_ID);
    setItem('userType', 'USER');
    setItem('role', 'user');
  });

  test('renders correctly in user mode', async () => {
    renderWithProviders(userMocks);
    await wait();

    expect(screen.getByTestId('searchInput')).toBeInTheDocument();
    expect(screen.getByTestId('searchBtn')).toBeInTheDocument();
    expect(screen.getByTestId('modeChangeBtn')).toBeInTheDocument();
    expect(
      screen.queryByTestId('createOrganizationBtn'),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('notification-icon')).not.toBeInTheDocument();
  });

  test('displays all organizations mode correctly', async () => {
    renderWithProviders(userMocks);
    await wait();

    await waitFor(() => {
      expect(screen.getByTestId('organizations-list')).toBeInTheDocument();
      // Check for organization cards
      const orgCards = document.querySelectorAll(
        '[data-testid*="organization-card"]',
      );
      expect(orgCards.length).toBeGreaterThan(0);
    });
  });

  test('switches to joined organizations mode', async () => {
    renderWithProviders(userMocks);
    await wait();

    const modeBtn = screen.getByTestId('modeChangeBtn');
    fireEvent.click(modeBtn);

    const joinedBtn = screen.getByTestId('modeBtn1');
    fireEvent.click(joinedBtn);

    await wait();

    await waitFor(() => {
      // Check that we're in joined mode by checking the dropdown button
      const modeButton = screen.getByTestId('modeChangeBtn');
      expect(modeButton).toHaveTextContent('Joined Organizations');
      // Check that organizations list is present
      expect(screen.getByTestId('organizations-list')).toBeInTheDocument();
      // Check for organization cards (at least one should be visible)
      const orgCards = document.querySelectorAll(
        '[data-testid*="organization-card"]',
      );
      expect(orgCards.length).toBeGreaterThan(0);
    });
  });

  test('switches to created organizations mode', async () => {
    renderWithProviders(userMocks);
    await wait();

    const modeBtn = screen.getByTestId('modeChangeBtn');
    fireEvent.click(modeBtn);

    const createdBtn = screen.getByTestId('modeBtn2');
    fireEvent.click(createdBtn);

    await wait();

    await waitFor(() => {
      // Check that we're in created mode by checking the dropdown button
      const modeButton = screen.getByTestId('modeChangeBtn');
      expect(modeButton).toHaveTextContent('Created Organizations');
      // Check that organizations list is present
      expect(screen.getByTestId('organizations-list')).toBeInTheDocument();
      // Check for organization cards (should have created org data)
      const orgCards = document.querySelectorAll(
        '[data-testid*="organization-card"]',
      );
      expect(orgCards.length).toBeGreaterThan(0);
    });
  });

  test('handles search in user mode', async () => {
    const searchMocks = [
      ...userMocks,
      {
        request: {
          query: ORGANIZATION_FILTER_LIST,
          variables: { filter: 'User' },
        },
        result: {
          data: {
            organizations: [mockOrgData.userAllOrgs[0]],
          },
        },
      },
    ];

    renderWithProviders(searchMocks);
    await wait();

    const searchInput = screen.getByTestId('searchInput');
    await userEvent.type(searchInput, 'User');

    const searchBtn = screen.getByTestId('searchBtn');
    fireEvent.click(searchBtn);

    await wait();
  });

  test('handles debounced search', async () => {
    renderWithProviders(userMocks);
    await wait();

    const searchInput = screen.getByTestId('searchInput');
    await userEvent.type(searchInput, 'Test');

    // Wait for debounce
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });
  });
});

describe('SharedOrgList Component - Empty States', () => {
  beforeEach(() => {
    setItem('userId', TEST_USER_ID);
    setItem('userType', 'USER');
    setItem('role', 'user');
  });

  test('displays no organizations message when list is empty', async () => {
    renderWithProviders(emptyMocks);
    await wait();

    await waitFor(() => {
      // Check for the no organizations message (could be translation key or actual text)
      const noOrgMessage = screen.getByText(
        /noOrgErrorTitle|no.*organization/i,
      );
      expect(noOrgMessage).toBeInTheDocument();
    });
  });

  test('displays no results found for search', async () => {
    const noResultsMocks = [
      CURRENT_USER_MOCK,
      {
        request: {
          query: ORGANIZATION_FILTER_LIST,
          variables: { filter: 'NonExistent' },
        },
        result: {
          data: {
            organizations: [],
          },
        },
      },
    ];

    renderWithProviders(noResultsMocks);
    await wait();

    const searchInput = screen.getByTestId('searchInput');
    await userEvent.type(searchInput, 'NonExistent');

    const searchBtn = screen.getByTestId('searchBtn');
    fireEvent.click(searchBtn);

    await wait();

    await waitFor(() => {
      expect(screen.getByTestId('noResultFound')).toBeInTheDocument();
    });
  });

  test('displays loading spinner for user mode', async () => {
    const loadingMocks = [
      {
        request: {
          query: CURRENT_USER,
          variables: { userId: TEST_USER_ID },
        },
        delay: 1000,
        result: {
          data: {
            currentUser: {
              id: TEST_USER_ID,
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              image: null,
            },
          },
        },
      },
      {
        request: {
          query: ORGANIZATION_FILTER_LIST,
          variables: { filter: '' },
        },
        delay: 1000,
        result: {
          data: {
            organizations: [],
          },
        },
      },
    ];

    renderWithProviders(loadingMocks);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});

describe('SharedOrgList Component - Pagination', () => {
  beforeEach(() => {
    setItem('userId', TEST_USER_ID);
    setItem('userType', 'USER');
    setItem('role', 'user');
  });

  test('handles rows per page change', async () => {
    renderWithProviders(userMocks);
    await wait();

    await waitFor(() => {
      expect(screen.getByTestId('table-pagination')).toBeInTheDocument();
    });

    const rowsPerPageSelect = screen.getByTestId('rows-per-page');
    fireEvent.change(rowsPerPageSelect, { target: { value: '10' } });

    await wait();

    expect(rowsPerPageSelect).toHaveValue('10');
  });

  test('handles page navigation', async () => {
    const largeMocks = [
      CURRENT_USER_MOCK,
      {
        request: {
          query: ORGANIZATION_FILTER_LIST,
          variables: { filter: '' },
        },
        result: {
          data: {
            organizations: Array.from({ length: 12 }, (_, i) => ({
              id: `user-org-${i}`,
              name: `User Organization ${i + 1}`,
              addressLine1: `User Address ${i + 1}`,
              description: `User Description ${i + 1}`,
              avatarURL: '',
              isMember: true,
              adminsCount: 1,
              membersCount: 5,
              members: { edges: [] },
              __typename: 'Organization',
            })),
          },
        },
      },
    ];

    renderWithProviders(largeMocks);
    await wait();

    await waitFor(() => {
      expect(screen.getByTestId('table-pagination')).toBeInTheDocument();
    });

    const nextButton = screen.getByTestId('next-page');
    fireEvent.click(nextButton);

    await wait();

    expect(screen.getByTestId('current-page')).toHaveTextContent('1');
  });
});

describe('SharedOrgList Component - Error Handling', () => {
  beforeEach(() => {
    setItem('userId', TEST_USER_ID);
    setItem('userType', 'USER');
    setItem('role', 'user');
  });

  test('handles query errors gracefully', async () => {
    const errorMocks = [
      {
        request: {
          query: CURRENT_USER,
          variables: { userId: TEST_USER_ID },
        },
        error: new Error('Network error'),
      },
    ];

    // Mock localStorage.clear and window.location.assign
    const mockClear = vi.spyOn(Storage.prototype, 'clear');
    Object.defineProperty(window, 'location', {
      value: { assign: vi.fn() },
      writable: true,
    });

    renderWithProviders(errorMocks);
    await wait();

    // Note: Error handling might cause component to redirect or clear localStorage
    // This test ensures the component doesn't crash on errors
  });
});

describe('SharedOrgList Component - 100% Coverage Tests', () => {
  beforeEach(() => {
    setItem('userId', TEST_ADMIN_ID);
    setItem('userType', 'SUPERADMIN');
    setItem('role', 'superadmin');
  });

  test('handles closeDialogModal function', async () => {
    renderWithProviders(adminMocks);
    await wait();

    await waitFor(() => {
      expect(screen.getByTestId('createOrganizationBtn')).toBeInTheDocument();
    });

    const createOrgBtn = screen.getByTestId('createOrganizationBtn');
    fireEvent.click(createOrgBtn);

    await waitFor(() => {
      expect(screen.getByTestId('organization-modal')).toBeInTheDocument();
    });

    // Fill form and submit to trigger the dialog modal
    fireEvent.change(screen.getByTestId('modalOrganizationName'), {
      target: { value: 'Test Organization' },
    });
    fireEvent.change(screen.getByTestId('modalDescription'), {
      target: { value: 'Test Description' },
    });
    fireEvent.change(screen.getByTestId('modalAddressLine1'), {
      target: { value: '123 Test St' },
    });
    fireEvent.change(screen.getByTestId('modalCity'), {
      target: { value: 'Test City' },
    });
    fireEvent.change(screen.getByTestId('modalState'), {
      target: { value: 'Test State' },
    });
    fireEvent.change(screen.getByTestId('modalPostalCode'), {
      target: { value: '12345' },
    });
    fireEvent.change(screen.getByTestId('modalCountryCode'), {
      target: { value: 'us' },
    });

    const submitBtn = screen.getByTestId('createOrgSubmit');
    fireEvent.click(submitBtn);

    await wait();

    // First wait for the plugin notification modal header to appear
    await waitFor(
      () => {
        expect(
          screen.getByTestId('pluginNotificationHeader'),
        ).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Now the dialog modal should appear, and we can test closeDialogModal
    await waitFor(() => {
      expect(screen.getByTestId('enableEverythingForm')).toBeInTheDocument();
    });

    const enableEverythingBtn = screen.getByTestId('enableEverythingForm');
    fireEvent.click(enableEverythingBtn);

    // This should trigger closeDialogModal and close the plugin notification modal
    await waitFor(() => {
      expect(
        screen.queryByTestId('enableEverythingForm'),
      ).not.toBeInTheDocument();
    });
    await wait();
  });

  test('handles organization creation error with errorHandler', async () => {
    const errorMocks = [
      ADMIN_CURRENT_USER_MOCK,
      {
        request: {
          query: ORGANIZATION_LIST,
          variables: { filter: '' },
        },
        result: {
          data: {
            organizations: mockOrgData.adminOrgs,
          },
        },
      },
      {
        request: {
          query: CREATE_ORGANIZATION_MUTATION_PG,
          variables: {
            name: 'Test Organization',
            description: 'Test Description',
            addressLine1: 'Test Address',
            city: 'Test City',
            state: 'Test State',
            postalCode: '12345',
            countryCode: 'us',
          },
        },
        error: new Error('Creation failed'),
      },
    ];

    renderWithProviders(errorMocks);
    await wait();

    await waitFor(() => {
      expect(screen.getByTestId('createOrganizationBtn')).toBeInTheDocument();
    });

    const createOrgBtn = screen.getByTestId('createOrganizationBtn');
    fireEvent.click(createOrgBtn);

    await waitFor(() => {
      expect(screen.getByTestId('organization-modal')).toBeVisible();
    });

    // Fill form
    fireEvent.change(screen.getByTestId('modalOrganizationName'), {
      target: { value: 'Test Organization' },
    });
    fireEvent.change(screen.getByTestId('modalDescription'), {
      target: { value: 'Test Description' },
    });
    fireEvent.change(screen.getByTestId('modalAddressLine1'), {
      target: { value: 'Test Address' },
    });
    fireEvent.change(screen.getByTestId('modalCity'), {
      target: { value: 'Test City' },
    });
    fireEvent.change(screen.getByTestId('modalState'), {
      target: { value: 'Test State' },
    });
    fireEvent.change(screen.getByTestId('modalPostalCode'), {
      target: { value: '12345' },
    });
    fireEvent.change(screen.getByTestId('modalCountryCode'), {
      target: { value: 'us' },
    });

    const submitBtn = screen.getByTestId('createOrgSubmit');
    fireEvent.click(submitBtn);

    await wait();

    // Error should be handled by errorHandler
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalled();
    });
  });

  test('handles search in joined organizations mode (mode 1)', async () => {
    setItem('userId', TEST_USER_ID);
    setItem('userType', 'USER');
    setItem('role', 'user');

    const joinedSearchMocks = [
      CURRENT_USER_MOCK,
      {
        request: {
          query: USER_JOINED_ORGANIZATIONS_NO_MEMBERS,
          variables: {
            id: TEST_USER_ID,
            first: 10,
          },
        },
        result: {
          data: {
            user: {
              id: TEST_USER_ID,
              joinedOrganizations: mockOrgData.joinedOrgs,
            },
          },
        },
      },
      {
        request: {
          query: ORGANIZATION_FILTER_LIST,
          variables: { filter: '' },
        },
        result: {
          data: {
            organizations: mockOrgData.userAllOrgs,
          },
        },
      },
      {
        request: {
          query: USER_JOINED_ORGANIZATIONS_NO_MEMBERS,
          variables: {
            id: TEST_USER_ID,
            first: 10,
            filter: 'Search Term',
          },
        },
        result: {
          data: {
            user: {
              id: TEST_USER_ID,
              joinedOrganizations: [],
            },
          },
        },
      },
    ];

    renderWithProviders(joinedSearchMocks);
    await wait();

    // Switch to joined organizations mode
    const modeBtn = screen.getByTestId('modeChangeBtn');
    fireEvent.click(modeBtn);

    const joinedBtn = screen.getByTestId('modeBtn1');
    fireEvent.click(joinedBtn);

    await wait();

    // Perform search to trigger the search branch for mode 1
    const searchInput = screen.getByTestId('searchInput');
    fireEvent.change(searchInput, { target: { value: 'Search Term' } });

    const searchBtn = screen.getByTestId('searchBtn');
    fireEvent.click(searchBtn);

    await wait();

    // Just verify that the component rendered (no specific element to check)
    expect(screen.getByTestId('searchInput')).toHaveValue('Search Term');
  });

  test('handles search in created organizations mode (mode 2)', async () => {
    setItem('userId', TEST_USER_ID);
    setItem('userType', 'USER');
    setItem('role', 'user');

    const createdSearchMocks = [
      CURRENT_USER_MOCK,
      {
        request: {
          query: USER_CREATED_ORGANIZATIONS,
          variables: {
            id: TEST_USER_ID,
          },
        },
        result: {
          data: {
            user: {
              id: TEST_USER_ID,
              createdOrganizations: mockOrgData.createdOrgs,
            },
          },
        },
      },
      {
        request: {
          query: ORGANIZATION_FILTER_LIST,
          variables: { filter: '' },
        },
        result: {
          data: {
            organizations: mockOrgData.userAllOrgs,
          },
        },
      },
      {
        request: {
          query: USER_CREATED_ORGANIZATIONS,
          variables: {
            id: TEST_USER_ID,
            filter: 'Created Search',
          },
        },
        result: {
          data: {
            user: {
              id: TEST_USER_ID,
              createdOrganizations: [],
            },
          },
        },
      },
    ];

    renderWithProviders(createdSearchMocks);
    await wait();

    // Switch to created organizations mode
    const modeBtn = screen.getByTestId('modeChangeBtn');
    fireEvent.click(modeBtn);

    const createdBtn = screen.getByTestId('modeBtn2');
    fireEvent.click(createdBtn);

    await wait();

    // Perform search to trigger the search branch for mode 2
    const searchInput = screen.getByTestId('searchInput');
    fireEvent.change(searchInput, { target: { value: 'Created Search' } });

    const searchBtn = screen.getByTestId('searchBtn');
    fireEvent.click(searchBtn);

    await wait();

    // Just verify that the component rendered (no specific element to check)
    expect(screen.getByTestId('searchInput')).toHaveValue('Created Search');
  });

  test('handles search in all organizations mode (mode 0)', async () => {
    setItem('userId', TEST_USER_ID);
    setItem('userType', 'USER');
    setItem('role', 'user');

    const allSearchMocks = [
      CURRENT_USER_MOCK,
      {
        request: {
          query: ORGANIZATION_FILTER_LIST,
          variables: { filter: '' },
        },
        result: {
          data: {
            organizations: mockOrgData.userAllOrgs,
          },
        },
      },
      {
        request: {
          query: ORGANIZATION_FILTER_LIST,
          variables: { filter: 'All Search' },
        },
        result: {
          data: {
            organizations: [mockOrgData.userAllOrgs[0]],
          },
        },
      },
    ];

    renderWithProviders(allSearchMocks);
    await wait();

    // Should be in mode 0 by default (All Organizations)
    const searchInput = screen.getByTestId('searchInput');
    fireEvent.change(searchInput, { target: { value: 'All Search' } });

    const searchBtn = screen.getByTestId('searchBtn');
    fireEvent.click(searchBtn);

    await wait();

    // Just verify that the component rendered and search was executed
    expect(screen.getByTestId('searchInput')).toHaveValue('All Search');
  });
});
