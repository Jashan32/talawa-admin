import type { ApolloLink } from '@apollo/client';
import { MockedProvider } from '@apollo/react-testing';
import { LocalizationProvider } from '@mui/x-date-pickers';
import type { RenderResult } from '@testing-library/react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router';
import { store } from 'state/store';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import i18nForTest from 'utils/i18nForTest';
import { StaticMockLink } from 'utils/StaticMockLink';
import { toast } from 'react-toastify';
import type { InterfacePledgeModal } from './PledgeModal';
import PledgeModal from './PledgeModal';
import React from 'react';
import { USER_DETAILS } from 'GraphQl/Queries/Queries';
import { CREATE_PLEDGE, UPDATE_PLEDGE } from 'GraphQl/Mutations/PledgeMutation';
import { vi } from 'vitest';

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@mui/x-date-pickers/DesktopDateTimePicker', async () => {
  const { DesktopDateTimePicker } = await vi.importActual(
    '@mui/x-date-pickers/DesktopDateTimePicker',
  );
  return {
    DateTimePicker: DesktopDateTimePicker,
  };
});

const pledgeProps: InterfacePledgeModal[] = [
  {
    isOpen: true,
    hide: vi.fn(),
    pledge: {
      id: '1',
      amount: 100,
      currency: 'USD',
      startDate: '2024-01-01',
      endDate: '2024-01-10',
      pledger: {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        name: 'John Doe',
        avatarURL: undefined,
      },
    },
    refetchPledge: vi.fn(),
    campaignId: 'campaignId',
    userId: 'userId',
    endDate: new Date(),
    mode: 'create',
  },
  {
    isOpen: true,
    hide: vi.fn(),
    pledge: {
      id: '1',
      amount: 100,
      currency: 'USD',
      startDate: '2024-01-01',
      endDate: '2024-01-10',
      pledger: {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        name: 'John Doe',
        avatarURL: undefined,
      },
    },
    refetchPledge: vi.fn(),
    campaignId: 'campaignId',
    userId: 'userId',
    endDate: new Date(),
    mode: 'edit',
  },
];

const PLEDGE_MODAL_MOCKS = [
  {
    request: {
      query: USER_DETAILS,
      variables: {
        input: {
          id: 'userId',
        },
      },
    },
    result: {
      data: {
        user: {
          id: 'userId',
          name: 'Harve Lance',
          emailAddress: 'testuser1@example.com',
          avatarURL: null,
          birthDate: null,
          city: 'CityName',
          countryCode: 'CountryCode',
          createdAt: '2023-04-13T04:53:17.742Z',
          updatedAt: '2023-04-13T04:53:17.742Z',
          educationGrade: null,
          employmentStatus: null,
          isEmailAddressVerified: false,
          maritalStatus: null,
          natalSex: null,
          naturalLanguageCode: 'en',
          postalCode: null,
          role: 'USER',
          state: 'State',
          mobilePhoneNumber: null,
          homePhoneNumber: null,
          workPhoneNumber: null,
          __typename: 'User',
        },
      },
    },
  },
  {
    request: {
      query: UPDATE_PLEDGE,
      variables: {
        id: '1',
        amount: 200,
      },
    },
    result: {
      data: {
        updateFundCampaignPledge: {
          id: '1',
          amount: 200,
          note: null,
          campaign: {
            id: 'campaignId',
            name: 'Test Campaign',
            __typename: 'FundCampaign',
          },
          pledger: {
            id: '1',
            name: 'John Doe',
            __typename: 'User',
          },
          __typename: 'FundCampaignPledge',
        },
      },
    },
  },
  {
    request: {
      query: CREATE_PLEDGE,
      variables: {
        campaignId: 'campaignId',
        amount: 200,
        currency: 'USD',
        startDate: '2024-01-01',
        endDate: '2024-01-01',
        userIds: ['userId'],
      },
    },
    result: {
      data: {
        createFundCampaignPledge: {
          id: '3',
          amount: 200,
          note: null,
          campaign: {
            id: 'campaignId',
            name: 'Test Campaign',
            __typename: 'FundCampaign',
          },
          pledger: {
            id: 'userId',
            name: 'Harve Lance',
            __typename: 'User',
          },
          __typename: 'FundCampaignPledge',
        },
      },
    },
  },
  // Error mocks
  {
    request: {
      query: UPDATE_PLEDGE,
      variables: {
        id: '1',
        amount: 150,
      },
    },
    error: new Error('Failed to update pledge'),
  },
  {
    request: {
      query: CREATE_PLEDGE,
      variables: {
        campaignId: 'campaignId',
        amount: 100,
        currency: 'USD',
        startDate: '2024-01-01',
        endDate: '2024-01-01',
        userIds: ['userId'],
      },
    },
    error: new Error('Failed to create pledge'),
  },
];

const link1 = new StaticMockLink(PLEDGE_MODAL_MOCKS);
const translations = JSON.parse(
  JSON.stringify(i18nForTest.getDataByLanguage('en')?.translation.pledges),
);

const renderPledgeModal = (
  link: ApolloLink,
  props: InterfacePledgeModal,
): RenderResult => {
  return render(
    <MockedProvider link={link}>
      <Provider store={store}>
        <BrowserRouter>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <I18nextProvider i18n={i18nForTest}>
              <PledgeModal {...props} />
            </I18nextProvider>
          </LocalizationProvider>
        </BrowserRouter>
      </Provider>
    </MockedProvider>,
  );
};

describe('PledgeModal', () => {
  beforeAll(() => {
    vi.mock('react-router', async () => {
      const actual = await vi.importActual('react-router');
      return {
        ...actual,
        useParams: () => ({ orgId: 'orgId', fundCampaignId: 'fundCampaignId' }),
        useNavigate: vi.fn(),
      };
    });
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });
  it('should populate form fields with correct values in edit mode', async () => {
    renderPledgeModal(link1, pledgeProps[1]);
    await waitFor(() =>
      expect(screen.getByText(translations.editPledge)).toBeInTheDocument(),
    );
    // Use getAllByText to find the text content anywhere in the component
    expect(screen.getAllByText(/John Doe/i)[0]).toBeInTheDocument();
    expect(screen.getByLabelText('Start Date')).toHaveValue('01/01/2024');
    expect(screen.getByLabelText('End Date')).toHaveValue('10/01/2024');
    expect(screen.getByLabelText('Currency')).toHaveTextContent('USD ($)');
    expect(screen.getByLabelText('Amount')).toHaveValue('100');
  });

  it('should update pledgeAmount when input value changes', async () => {
    renderPledgeModal(link1, pledgeProps[1]);
    const amountInput = screen.getByLabelText('Amount');
    expect(amountInput).toHaveValue('100');
    fireEvent.change(amountInput, { target: { value: '200' } });
    expect(amountInput).toHaveValue('200');
  });

  it('should not update pledgeAmount when input value is less than or equal to 0', async () => {
    renderPledgeModal(link1, pledgeProps[1]);
    const amountInput = screen.getByLabelText('Amount');
    expect(amountInput).toHaveValue('100');
    fireEvent.change(amountInput, { target: { value: '-10' } });
    expect(amountInput).toHaveValue('100');
  });

  it('should update pledgeStartDate when a new date is selected', async () => {
    renderPledgeModal(link1, pledgeProps[1]);
    const startDateInput = screen.getByLabelText('Start Date');
    fireEvent.change(startDateInput, { target: { value: '02/01/2024' } });
    expect(startDateInput).toHaveValue('02/01/2024');
    expect(pledgeProps[1].pledge?.startDate).toEqual('2024-01-01');
  });

  it('pledgeStartDate onChange when its null', async () => {
    renderPledgeModal(link1, pledgeProps[1]);
    const startDateInput = screen.getByLabelText('Start Date');
    fireEvent.change(startDateInput, { target: { value: null } });
    expect(pledgeProps[1].pledge?.startDate).toEqual('2024-01-01');
  });

  it('should update pledgeEndDate when a new date is selected', async () => {
    renderPledgeModal(link1, pledgeProps[1]);
    const startDateInput = screen.getByLabelText('End Date');
    fireEvent.change(startDateInput, { target: { value: '02/01/2024' } });
    expect(startDateInput).toHaveValue('02/01/2024');
    expect(pledgeProps[1].pledge?.endDate).toEqual('2024-01-10');
  });

  it('pledgeEndDate onChange when its null', async () => {
    renderPledgeModal(link1, pledgeProps[1]);
    const endDateInput = screen.getByLabelText('End Date');
    fireEvent.change(endDateInput, { target: { value: null } });
    expect(pledgeProps[1].pledge?.endDate).toEqual('2024-01-10');
  });

  it('should update currency when currency select value changes', async () => {
    renderPledgeModal(link1, pledgeProps[1]);
    const currencySelect = screen
      .getByTestId('currencySelect')
      .querySelector('input') as HTMLInputElement;
    expect(currencySelect).toHaveValue('USD');
  });

  it('should close modal when close button is clicked', async () => {
    renderPledgeModal(link1, pledgeProps[0]);
    const closeButton = screen.getByTestId('pledgeModalCloseBtn');
    fireEvent.click(closeButton);
    expect(pledgeProps[0].hide).toHaveBeenCalled();
  });

  it('should handle pledger selection in create mode', async () => {
    renderPledgeModal(link1, pledgeProps[0]);

    await waitFor(() => {
      expect(screen.getByTestId('pledgerSelect')).toBeInTheDocument();
    });
  });

  it('should update pledge successfully', async () => {
    renderPledgeModal(link1, pledgeProps[1]);

    await waitFor(() => {
      expect(screen.getByText(translations.editPledge)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '200' },
    });

    const form = screen.getByTestId('pledgeForm');
    fireEvent.submit(form);

    await waitFor(
      () => {
        expect(toast.success).toHaveBeenCalledWith(translations.pledgeUpdated);
      },
      { timeout: 2000 },
    );

    expect(pledgeProps[1].refetchPledge).toHaveBeenCalled();
    expect(pledgeProps[1].hide).toHaveBeenCalled();
  });

  it('should Update pledge', async () => {
    renderPledgeModal(link1, pledgeProps[0]);

    await waitFor(() => {
      expect(screen.getByTestId('pledgerSelect')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '200' },
    });

    // Submit the form
    const form = screen.getByTestId('pledgeForm');
    fireEvent.submit(form);

    await waitFor(
      () => {
        expect(toast.success).toHaveBeenCalledWith(translations.pledgeUpdated);
      },
      { timeout: 2000 },
    );
  });

  it('should update pledge with multiple field changes', async () => {
    const multiFieldUpdateMock = {
      request: {
        query: UPDATE_PLEDGE,
        variables: {
          id: '1',
          amount: 300,
          currency: 'EUR',
          startDate: '2024-02-01',
          endDate: '2024-02-15',
        },
      },
      result: {
        data: {
          updateFundCampaignPledge: {
            id: '1',
            amount: 300,
            note: null,
            campaign: {
              id: 'campaignId',
              name: 'Test Campaign',
              __typename: 'FundCampaign',
            },
            pledger: {
              id: '1',
              name: 'John Doe',
              __typename: 'User',
            },
            __typename: 'FundCampaignPledge',
          },
        },
      },
    };

    const extendedMocks = [...PLEDGE_MODAL_MOCKS, multiFieldUpdateMock];
    const link = new StaticMockLink(extendedMocks);

    renderPledgeModal(link, pledgeProps[1]);

    await waitFor(() => {
      expect(screen.getByText(translations.editPledge)).toBeInTheDocument();
    });

    // Change multiple fields
    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '300' },
    });

    // Change start date
    fireEvent.change(screen.getByLabelText('Start Date'), {
      target: { value: '01/02/2024' },
    });

    // Change end date
    fireEvent.change(screen.getByLabelText('End Date'), {
      target: { value: '15/02/2024' },
    });

    const form = screen.getByTestId('pledgeForm');
    fireEvent.submit(form);

    await waitFor(
      () => {
        expect(toast.success).toHaveBeenCalledWith(translations.pledgeUpdated);
      },
      { timeout: 3000 },
    );
  });
});
