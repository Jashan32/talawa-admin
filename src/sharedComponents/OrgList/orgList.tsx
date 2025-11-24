/**
 * Shared OrgList component that can be used by both admin and user interfaces.
 *
 * The component automatically detects user role from localStorage and adjusts functionality accordingly:
 * - For administrators: Shows create organization button and uses OrgListCard
 * - For users: Shows filtering options and uses OrganizationCard
 *
 * @component
 * @returns {JSX.Element} The rendered organization list component.
 *
 * @remarks
 * - Detects user role from localStorage automatically
 * - Provides unified organization listing functionality
 * - Includes search, sorting, and pagination features
 * - Responsive design with proper loading states
 *
 * @dependencies
 * - GraphQL queries for fetching organization data
 * - react-i18next for localization
 * - useLocalStorage for accessing user data
 * - Various UI components for cards, pagination, modals
 */

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  CREATE_ORGANIZATION_MUTATION_PG,
  CREATE_ORGANIZATION_MEMBERSHIP_MUTATION_PG,
} from 'GraphQl/Mutations/mutations';
import {
  ORGANIZATION_LIST,
  CURRENT_USER,
  USER_CREATED_ORGANIZATIONS,
  ORGANIZATION_FILTER_LIST,
  USER_JOINED_ORGANIZATIONS_NO_MEMBERS,
} from 'GraphQl/Queries/Queries';

import OrgListCard from 'components/OrgListCard/OrgListCard';
import OrganizationCard from 'components/UserPortal/OrganizationCard/OrganizationCard';
import PaginationList from 'components/Pagination/PaginationList/PaginationList';
import { useTranslation } from 'react-i18next';
import { errorHandler } from 'utils/errorHandler';
import type {
  InterfaceCurrentUserTypePG,
  InterfaceOrgInfoTypePG,
} from 'utils/interfaces';
import useLocalStorage from 'utils/useLocalstorage';
import styles from 'style/app-fixed.module.css';
import SortingButton from 'subComponents/SortingButton';
import { Button } from '@mui/material';
import OrganizationModal from './modal/OrganizationModal';
import { toast } from 'react-toastify';
import { Link } from 'react-router';
import { Form, InputGroup, Modal, Dropdown } from 'react-bootstrap';
import type { ChangeEvent } from 'react';
import NotificationIcon from 'components/NotificationIcon/NotificationIcon';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';

const { getItem } = useLocalStorage();

function useDebounce<T>(fn: (val: T) => void, delay: number) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function debouncedFn(val: T) {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      fn(val);
    }, delay);
  }

  return debouncedFn;
}

interface InterfaceFormStateType {
  addressLine1: string;
  addressLine2: string;
  avatar: string | null;
  city: string;
  countryCode: string;
  description: string;
  name: string;
  postalCode: string;
  state: string;
}

interface IOrganizationCardProps {
  id: string;
  name: string;
  image: string;
  description: string;
  admins: [];
  address: {
    city: string;
    countryCode: string;
    line1: string;
    postalCode: string;
    state: string;
  };
  membershipRequestStatus: string;
  userRegistrationRequired: boolean;
  membershipRequests: {
    id: string;
    user: {
      id: string;
    };
  }[];
  isJoined: boolean;
  membersCount: number;
  adminsCount: number;
}

interface InterfaceMemberNode {
  id: string;
}

interface InterfaceMemberEdge {
  node: InterfaceMemberNode;
}

interface InterfaceMembersConnection {
  edges: InterfaceMemberEdge[];
  pageInfo?: {
    hasNextPage: boolean;
  };
}

interface IOrganization {
  isJoined: boolean;
  id: string;
  name: string;
  image?: string;
  avatarURL?: string;
  addressLine1?: string;
  description: string;
  adminsCount?: number;
  membersCount?: number;
  admins: [];
  members?: InterfaceMembersConnection;
  address: {
    city: string;
    countryCode: string;
    line1: string;
    postalCode: string;
    state: string;
  };
  membershipRequestStatus: string;
  userRegistrationRequired: boolean;
  membershipRequests: {
    id: string;
    user: {
      id: string;
    };
  }[];
}

interface IOrgData {
  isMember: boolean;
  addressLine1: string;
  avatarURL: string | null;
  id: string;
  adminsCount: number;
  membersCount: number;
  members: {
    edges: [
      {
        node: {
          id: string;
          __typename: string;
        };
        __typename: string;
      },
    ];
  };
  description: string;
  __typename: string;
  name: string;
}

function SharedOrgList(): JSX.Element {
  // Get user role from localStorage to determine interface mode
  const userType = getItem('userType') || getItem('role');
  const userId = getItem('userId') || getItem('id');
  const isAdmin =
    userType === 'ADMIN' ||
    userType === 'SUPERADMIN' ||
    userType === 'administrator';

  const { t } = useTranslation('translation', {
    keyPrefix: isAdmin ? 'orgList' : 'userOrganizations',
  });
  const { t: tCommon } = useTranslation('common');

  // Common state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [isLoading, setIsLoading] = useState(true);
  const [typedValue, setTypedValue] = useState('');
  const [filterName, setFilterName] = useState('');
  const [searchByName, setSearchByName] = useState('');

  // Admin-specific state
  const [dialogModalisOpen, setdialogModalIsOpen] = useState(false);
  const [dialogRedirectOrgId, setDialogRedirectOrgId] = useState('<ORG_ID>');
  const [sortingState, setSortingState] = useState({
    option: '',
    selectedOption: t('sort'),
  });
  const [showModal, setShowModal] = useState(false);
  const [formState, setFormState] = useState<InterfaceFormStateType>({
    addressLine1: '',
    addressLine2: '',
    avatar: null,
    city: '',
    countryCode: '',
    description: '',
    name: '',
    postalCode: '',
    state: '',
  });

  // User-specific state
  const [organizations, setOrganizations] = useState<IOrganization[]>([]);
  const [mode, setMode] = useState(0);

  const modes = [
    t('allOrganizations'),
    t('joinedOrganizations'),
    t('createdOrganizations'),
  ];

  // Mutations for admin
  const [create] = useMutation(CREATE_ORGANIZATION_MUTATION_PG);
  const [createMembership] = useMutation(
    CREATE_ORGANIZATION_MEMBERSHIP_MUTATION_PG,
  );

  // User data query
  const {
    data: userData,
    error: errorUser,
  }: {
    data: InterfaceCurrentUserTypePG | undefined;
    loading: boolean;
    error?: Error | undefined;
  } = useQuery(CURRENT_USER, {
    variables: { userId: userId },
    context: { headers: { authorization: `Bearer ${getItem('token')}` } },
  });

  // Admin queries
  const {
    data: allOrganizationsData,
    loading: loadingAll,
    error: errorList,
    refetch: refetchOrgs,
  } = useQuery(ORGANIZATION_LIST, {
    variables: { filter: filterName },
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
    skip: !isAdmin,
  });

  // User queries
  const {
    data: allUserOrganizationsData,
    loading: loadingUserAll,
    refetch: refetchUserAll,
  } = useQuery(ORGANIZATION_FILTER_LIST, {
    variables: { filter: filterName },
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
    skip: isAdmin || mode !== 0,
    notifyOnNetworkStatusChange: true,
  });

  const {
    data: joinedOrganizationsData,
    loading: loadingJoined,
    refetch: refetchJoined,
  } = useQuery(USER_JOINED_ORGANIZATIONS_NO_MEMBERS, {
    variables: { id: userId, first: rowsPerPage, filter: filterName },
    skip: isAdmin || mode !== 1,
  });

  const {
    data: createdOrganizationsData,
    loading: loadingCreated,
    refetch: refetchCreated,
  } = useQuery(USER_CREATED_ORGANIZATIONS, {
    variables: { id: userId, filter: filterName },
    skip: isAdmin || mode !== 2,
  });

  // Get appropriate data based on mode
  const orgsData = isAdmin ? allOrganizationsData?.organizations : null;

  // Sorted organizations for admin view
  const sortedOrganizations = useMemo(() => {
    if (!isAdmin || !orgsData) return [];

    let result = [...orgsData];

    if (searchByName) {
      result = result.filter((org: InterfaceOrgInfoTypePG) =>
        org.name.toLowerCase().includes(searchByName.toLowerCase()),
      );
    }

    if (
      sortingState.option === 'Latest' ||
      sortingState.option === 'Earliest'
    ) {
      result.sort((a: InterfaceOrgInfoTypePG, b: InterfaceOrgInfoTypePG) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortingState.option === 'Latest' ? dateB - dateA : dateA - dateB;
      });
    }

    return result;
  }, [orgsData, searchByName, sortingState.option, isAdmin]);

  // Update loading state
  useEffect(() => {
    if (isAdmin) {
      setIsLoading(loadingAll);
    } else {
      setIsLoading(loadingUserAll || loadingJoined || loadingCreated);
    }
  }, [isAdmin, loadingAll, loadingUserAll, loadingJoined, loadingCreated]);

  // Handle user organizations data
  useEffect(() => {
    if (isAdmin) return;

    if (mode === 0) {
      if (allUserOrganizationsData?.organizations) {
        const orgs = allUserOrganizationsData.organizations.map(
          (org: IOrgData) => {
            const isMember = org.isMember;
            return {
              id: org.id,
              name: org.name,
              image: org.avatarURL || null,
              address: {
                line1: org.addressLine1 || '',
                city: '',
                countryCode: '',
                postalCode: '',
                state: '',
              },
              adminsCount: org.adminsCount || 0,
              membersCount: org.membersCount || 0,
              admins: [],
              membershipRequestStatus: isMember ? 'accepted' : '',
              userRegistrationRequired: false,
              membershipRequests: [],
              isJoined: isMember,
            };
          },
        );
        setOrganizations(orgs);
      }
    } else if (mode === 1) {
      if (joinedOrganizationsData?.user?.organizationsWhereMember?.edges) {
        const orgs =
          joinedOrganizationsData.user.organizationsWhereMember.edges.map(
            (edge: { node: IOrganization }) => {
              const organization = edge.node;
              return {
                ...organization,
                membershipRequestStatus: 'accepted',
                isJoined: true,
              };
            },
          );
        setOrganizations(orgs);
      } else {
        setOrganizations([]);
      }
    } else if (mode === 2) {
      if (createdOrganizationsData?.user?.createdOrganizations) {
        const orgs = createdOrganizationsData.user.createdOrganizations.map(
          (org: IOrganization) => ({
            ...org,
            membershipRequestStatus: 'created',
            isJoined: true,
          }),
        );
        setOrganizations(orgs);
      } else {
        setOrganizations([]);
      }
    }
  }, [
    mode,
    allUserOrganizationsData,
    joinedOrganizationsData,
    createdOrganizationsData,
    userId,
    isAdmin,
  ]);

  // Modal functions
  function openDialogModal(redirectOrgId: string): void {
    setDialogRedirectOrgId(redirectOrgId);
    setdialogModalIsOpen(true);
  }

  function closeDialogModal(): void {
    setdialogModalIsOpen(false);
  }

  const toggleDialogModal = (): void =>
    setdialogModalIsOpen(!dialogModalisOpen);
  const toggleModal = (): void => setShowModal(!showModal);

  // Organization creation
  const createOrg = async (e: ChangeEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    const {
      addressLine1: _addressLine1,
      addressLine2: _addressLine2,
      avatar: _avatar,
      city: _city,
      countryCode: _countryCode,
      description: _description,
      name: _name,
      postalCode: _postalCode,
      state: _state,
    } = formState;

    const addressLine1 = _addressLine1.trim();
    const addressLine2 = _addressLine2.trim();
    const avatar = _avatar;
    const city = _city.trim();
    const countryCode = _countryCode.trim();
    const description = _description.trim();
    const name = _name.trim();
    const postalCode = _postalCode.trim();
    const state = _state.trim();

    try {
      const { data } = await create({
        variables: {
          addressLine1,
          addressLine2,
          avatar,
          city,
          countryCode,
          description,
          name,
          postalCode,
          state,
        },
      });

      await createMembership({
        variables: {
          memberId: userData?.currentUser.id,
          organizationId: data?.createOrganization.id,
          role: 'administrator',
        },
      });

      if (data) {
        toast.success('Congratulation the Organization is created');
        if (isAdmin) {
          refetchOrgs();
        }
        openDialogModal(data.createOrganization.id);
        setFormState({
          addressLine1: '',
          addressLine2: '',
          avatar: null,
          city: '',
          countryCode: '',
          description: '',
          name: '',
          postalCode: '',
          state: '',
        });
        toggleModal();
      }
    } catch (error: unknown) {
      errorHandler(t, error);
    }
  };

  // Search functionality
  const doSearch = (value: string): void => {
    setFilterName(value);
    if (isAdmin) {
      refetchOrgs({ filter: value });
    } else {
      if (mode === 0) {
        refetchUserAll({ filter: value });
      } else if (mode === 1) {
        refetchJoined({ id: userId, first: rowsPerPage, filter: value });
      } else {
        refetchCreated({ id: userId, filter: value });
      }
    }
  };

  const debouncedSearch = useDebounce(doSearch, 300);

  const handleChangeFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setTypedValue(newVal);
    setSearchByName(newVal);
    debouncedSearch(newVal);
  };

  const handleSearchByEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      doSearch(typedValue);
    }
  };

  const handleSearchByBtnClick = () => {
    doSearch(typedValue);
  };

  const handleSortChange = (value: string): void => {
    setSortingState({ option: value, selectedOption: t(value) });
  };

  // Pagination
  const handleChangePage = (
    _event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number,
  ): void => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void => {
    const newVal = event.target.value;
    setRowsPerPage(parseInt(newVal, 10));
    setPage(0);
  };

  // Error handling
  if (errorList || errorUser) {
    errorHandler(t, errorList || errorUser);
    localStorage.clear();
    window.location.assign('/');
  }

  document.title = t('title');
  const currentDisplayData = isAdmin ? sortedOrganizations : organizations;

  return (
    <div className={`${styles.pageContainer} ${styles.expandedContent}`}>
      {/* Search and Controls */}
      <div className={styles.btnsContainerSearchBar}>
        <div className={styles.inputOrgList}>
          <InputGroup className={styles.maxWidth}>
            <Form.Control
              placeholder={t('searchOrganizations')}
              id="searchUserOrgs"
              type="text"
              className={styles.inputField}
              value={typedValue}
              onChange={handleChangeFilter}
              onKeyUp={handleSearchByEnter}
              data-testid="searchInput"
            />
          </InputGroup>
        </div>

        <div className={styles.btnsBlock}>
          <InputGroup.Text
            className={styles.searchButton}
            style={{ cursor: 'pointer' }}
            onClick={handleSearchByBtnClick}
            data-testid="searchBtn"
            title={t('search')}
          >
            <SearchOutlined className={styles.colorWhite} />
          </InputGroup.Text>

          {isAdmin && <NotificationIcon />}

          <div style={{ display: 'flex', alignItems: 'center' }}>
            {isAdmin ? (
              <div className={styles.btnsBlockSearchBar}>
                <SortingButton
                  title={t('sortOrganizations')}
                  sortingOptions={[
                    { label: t('Latest'), value: 'Latest' },
                    { label: t('Earliest'), value: 'Earliest' },
                  ]}
                  selectedOption={sortingState.selectedOption}
                  onSortChange={handleSortChange}
                  dataTestIdPrefix="sortOrgs"
                  dropdownTestId="sort"
                />
              </div>
            ) : (
              <div className={styles.btnsBlock}>
                <Dropdown drop="down-centered">
                  <Dropdown.Toggle
                    className={styles.dropdown}
                    variant="success"
                    id="dropdown-basic"
                    data-testid="modeChangeBtn"
                  >
                    {modes[mode]}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    {modes.map((value, index) => (
                      <Dropdown.Item
                        key={index}
                        data-testid={`modeBtn${index}`}
                        onClick={() => setMode(index)}
                      >
                        {value}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            )}

            {isAdmin && (
              <div className={styles.btnsBlock}>
                <Button
                  className={`${styles.dropdown} ${styles.createorgdropdown}`}
                  onClick={toggleModal}
                  data-testid="createOrganizationBtn"
                >
                  <i className="fa fa-plus me-2" />
                  {t('createOrganization')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {!isLoading &&
      (!currentDisplayData || currentDisplayData.length === 0) &&
      searchByName.length === 0 ? (
        <div className={styles.notFound}>
          <h3 className="m-0">{t('noOrgErrorTitle')}</h3>
          <h6 className="text-secondary">{t('noOrgErrorDescription')}</h6>
        </div>
      ) : !isLoading &&
        currentDisplayData?.length === 0 &&
        searchByName.length > 0 ? (
        <div className={styles.notFound} data-testid="noResultFound">
          <h4 className="m-0">
            {tCommon('noResultsFoundFor')} &quot;{searchByName}&quot;
          </h4>
        </div>
      ) : (
        <>
          {isLoading ? (
            isAdmin ? (
              <>
                {[...Array(8)].map((_, index) => (
                  <div key={index} className={styles.itemCardOrgList}>
                    <div className={styles.loadingWrapper}>
                      <div className={styles.innerContainer}>
                        <div className={`${styles.orgImgContainer} shimmer`} />
                        <div className={styles.content}>
                          <h5 className="shimmer" title="Org name"></h5>
                          <h6 className="shimmer" title="Location"></h6>
                          <h6 className="shimmer" title="Admins"></h6>
                          <h6 className="shimmer" title="Members"></h6>
                        </div>
                      </div>
                      <div className={`shimmer ${styles.button}`} />
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div
                className="d-flex flex-row justify-content-center"
                data-testid="loading-spinner"
                role="status"
              >
                <HourglassBottomIcon />
                <span aria-live="polite">Loading...</span>
              </div>
            )
          ) : (
            <>
              {isAdmin ? (
                <div className={`${styles.listBoxOrgList}`}>
                  {(rowsPerPage > 0
                    ? currentDisplayData.slice(
                        page * rowsPerPage,
                        page * rowsPerPage + rowsPerPage,
                      )
                    : currentDisplayData
                  )?.map((item: InterfaceOrgInfoTypePG) => {
                    return (
                      <div key={item.id} className={styles.itemCardOrgList}>
                        <OrgListCard data={item} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="row" data-testid="organizations-list">
                  {(rowsPerPage > 0
                    ? currentDisplayData.slice(
                        page * rowsPerPage,
                        page * rowsPerPage + rowsPerPage,
                      )
                    : currentDisplayData
                  ).map((organization: IOrganization, index) => {
                    const cardProps: IOrganizationCardProps = {
                      name: organization.name,
                      image: organization.image ?? '',
                      id: organization.id,
                      description: organization.description,
                      admins: organization.admins,
                      address: organization.address,
                      membershipRequestStatus:
                        organization.membershipRequestStatus,
                      userRegistrationRequired:
                        organization.userRegistrationRequired,
                      membershipRequests: organization.membershipRequests,
                      isJoined: organization.isJoined,
                      membersCount: organization.membersCount || 0,
                      adminsCount: organization.adminsCount || 0,
                    };
                    return (
                      <div
                        key={index}
                        className="col-md-6 mb-4"
                        data-testid="organization-card"
                        data-organization-name={organization.name}
                        data-membership-status={
                          organization.membershipRequestStatus
                        }
                        data-cy="orgCard"
                      >
                        <div
                          data-testid={`membership-status-${organization.name}`}
                          data-status={organization.membershipRequestStatus}
                          className="visually-hidden"
                        ></div>
                        <OrganizationCard {...cardProps} />
                        <span
                          data-testid={`org-name-${organization.name}`}
                          className="visually-hidden"
                        >
                          {organization.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              <table style={{ width: '100%' }}>
                <tbody>
                  <tr>
                    <PaginationList
                      count={currentDisplayData.length || 0}
                      rowsPerPage={rowsPerPage}
                      page={page}
                      onPageChange={handleChangePage}
                      onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                  </tr>
                </tbody>
              </table>
            </>
          )}
        </>
      )}

      {/* Create Organization Modal for Admin */}
      {isAdmin && (
        <OrganizationModal
          showModal={showModal}
          toggleModal={toggleModal}
          formState={formState}
          setFormState={setFormState}
          createOrg={createOrg}
          t={t}
          tCommon={tCommon}
          userData={userData}
        />
      )}

      {/* Plugin Notification Modal after Org is Created */}
      {isAdmin && (
        <Modal show={dialogModalisOpen} onHide={toggleDialogModal}>
          <Modal.Header
            className={styles.modalHeader}
            closeButton
            data-testid="pluginNotificationHeader"
          >
            <Modal.Title className="text-white">
              {t('manageFeatures')}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <section id={styles.grid_wrapper}>
              <div>
                <h4 className={styles.titlemodaldialog}>
                  {t('manageFeaturesInfo')}
                </h4>
                <div className={styles.pluginStoreBtnContainer}>
                  <Link
                    className={`btn btn-primary ${styles.pluginStoreBtn}`}
                    data-testid="goToStore"
                    to={`orgstore/id=${dialogRedirectOrgId}`}
                  >
                    {t('goToStore')}
                  </Link>
                  <Button
                    type="submit"
                    className={styles.enableEverythingBtn}
                    onClick={closeDialogModal}
                    data-testid="enableEverythingForm"
                  >
                    {t('enableEverything')}
                  </Button>
                </div>
              </div>
            </section>
          </Modal.Body>
        </Modal>
      )}
    </div>
  );
}

export default SharedOrgList;
