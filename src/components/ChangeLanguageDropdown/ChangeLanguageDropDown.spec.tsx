import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import React from 'react';
import { toast } from 'react-toastify';
import cookies from 'js-cookie';
import i18next from 'i18next';
import ChangeLanguageDropDown from './ChangeLanguageDropDown';
import { UPDATE_CURRENT_USER_MUTATION } from 'GraphQl/Mutations/mutations';
import { languages } from 'utils/languages';
import useLocalStorage from 'utils/useLocalstorage';
import { urlToFile } from 'utils/urlToFile';

// Mock dependencies
vi.mock('react-toastify', () => ({ toast: { error: vi.fn() } }));

vi.mock('js-cookie', () => ({ default: { get: vi.fn(), set: vi.fn() } }));

vi.mock('i18next', () => ({ default: { changeLanguage: vi.fn() } }));

vi.mock('utils/useLocalstorage', () => ({ default: vi.fn() }));

vi.mock('utils/urlToFile', () => ({ urlToFile: vi.fn() }));

// Mock the CSS module
vi.mock('style/app-fixed.module.css', () => ({
  default: { changeLanguageBtn: '_changeLanguageBtn_d00707' },
}));

describe('ChangeLanguageDropDown', () => {
  const mockUserId = 'test-user-123';
  const mockUserImage = 'http://example.com/avatar.jpg';
  const mockFile = new File([''], 'avatar.jpg', { type: 'image/jpeg' });

  const mocks = [
    {
      request: {
        query: UPDATE_CURRENT_USER_MUTATION,
        variables: { input: { naturalLanguageCode: 'es', avatar: mockFile } },
      },
      result: { data: { updateUser: { id: mockUserId } } },
    },
  ];

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Setup default mock implementations
    (useLocalStorage as jest.Mock).mockReturnValue({
      getItem: vi.fn((key) => {
        if (key === 'id') return mockUserId;
        if (key === 'UserImage') return mockUserImage;
        return null;
      }),
    });

    (cookies.get as jest.Mock).mockReturnValue('en');
    (urlToFile as jest.Mock).mockResolvedValue(mockFile);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default language (English)', () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ChangeLanguageDropDown />
      </MockedProvider>,
    );

    const englishOption = screen.getByText('English');
    expect(englishOption).toBeInTheDocument();
  });

  it('shows error toast when userId is not found', async () => {
    (useLocalStorage as jest.Mock).mockReturnValue({
      getItem: vi.fn(() => null),
    });

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ChangeLanguageDropDown />
      </MockedProvider>,
    );

    const dropdown = screen.getByTestId('language-dropdown-btn');
    fireEvent.click(dropdown);

    const spanishOption = screen.getByTestId('change-language-btn-es');
    fireEvent.click(spanishOption);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('User not found');
    });
  });

  it('successfully changes language', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ChangeLanguageDropDown />
      </MockedProvider>,
    );

    const dropdown = screen.getByTestId('language-dropdown-btn');
    fireEvent.click(dropdown);

    const spanishOption = screen.getByTestId('change-language-btn-es');
    fireEvent.click(spanishOption);

    await waitFor(() => {
      expect(i18next.changeLanguage).toHaveBeenCalledWith('es');
      expect(cookies.set).toHaveBeenCalledWith('i18next', 'es');
    });
  });

  it('renders all available languages in the dropdown', () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ChangeLanguageDropDown />
      </MockedProvider>,
    );

    const dropdown = screen.getByTestId('language-dropdown-btn');
    fireEvent.click(dropdown);

    languages.forEach((language) => {
      const option = screen.getByTestId(`change-language-btn-${language.code}`);
      expect(option).toBeInTheDocument();
    });
  });

  it('handles urlToFile error when processing avatar', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    (urlToFile as jest.Mock).mockRejectedValue(
      new Error('File processing error'),
    );

    const mockWithoutAvatarDueToError = [
      {
        request: {
          query: UPDATE_CURRENT_USER_MUTATION,
          variables: { input: { naturalLanguageCode: 'es' } },
        },
        result: { data: { updateUser: { id: mockUserId } } },
      },
    ];

    render(
      <MockedProvider mocks={mockWithoutAvatarDueToError} addTypename={false}>
        <ChangeLanguageDropDown />
      </MockedProvider>,
    );

    const dropdown = screen.getByTestId('language-dropdown-btn');
    fireEvent.click(dropdown);

    const spanishOption = screen.getByTestId('change-language-btn-es');
    fireEvent.click(spanishOption);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error processing avatar:',
        expect.any(Error),
      );
    });

    consoleSpy.mockRestore();
  });

  it('changes language without userImage in localStorage', async () => {
    (useLocalStorage as jest.Mock).mockReturnValue({
      getItem: vi.fn((key) => {
        if (key === 'id') return mockUserId;
        if (key === 'UserImage') return null; // No user image
        return null;
      }),
    });

    const mockWithoutAvatar = [
      {
        request: {
          query: UPDATE_CURRENT_USER_MUTATION,
          variables: { input: { naturalLanguageCode: 'fr' } },
        },
        result: { data: { updateUser: { id: mockUserId } } },
      },
    ];

    render(
      <MockedProvider mocks={mockWithoutAvatar} addTypename={false}>
        <ChangeLanguageDropDown />
      </MockedProvider>,
    );

    const dropdown = screen.getByTestId('language-dropdown-btn');
    fireEvent.click(dropdown);

    const frenchOption = screen.getByTestId('change-language-btn-fr');
    fireEvent.click(frenchOption);

    await waitFor(() => {
      expect(i18next.changeLanguage).toHaveBeenCalledWith('fr');
      expect(cookies.set).toHaveBeenCalledWith('i18next', 'fr');
    });
  });

  it('handles mutation error during language change', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorMocks = [
      {
        request: {
          query: UPDATE_CURRENT_USER_MUTATION,
          variables: { input: { naturalLanguageCode: 'hi', avatar: mockFile } },
        },
        error: new Error('Mutation failed'),
      },
    ];

    render(
      <MockedProvider mocks={errorMocks} addTypename={false}>
        <ChangeLanguageDropDown />
      </MockedProvider>,
    );

    const dropdown = screen.getByTestId('language-dropdown-btn');
    fireEvent.click(dropdown);

    const hindiOption = screen.getByTestId('change-language-btn-hi');
    fireEvent.click(hindiOption);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in changing language',
        expect.any(Error),
      );
    });

    consoleSpy.mockRestore();
  });

  it('disables current language option in dropdown', () => {
    (cookies.get as jest.Mock).mockReturnValue('zh'); // Set Chinese as current language

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ChangeLanguageDropDown />
      </MockedProvider>,
    );

    const dropdown = screen.getByTestId('language-dropdown-btn');
    fireEvent.click(dropdown);

    const chineseOption = screen.getByTestId('change-language-btn-zh');
    expect(chineseOption).toHaveClass('disabled');

    const englishOption = screen.getByTestId('change-language-btn-en');
    expect(englishOption).not.toHaveClass('disabled');
  });

  it('displays correct current language in button', () => {
    (cookies.get as jest.Mock).mockReturnValue('hi'); // Set Hindi as current language

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ChangeLanguageDropDown />
      </MockedProvider>,
    );

    expect(screen.getByText('हिन्दी')).toBeInTheDocument();
  });

  it('handles non-string userImage gracefully', async () => {
    (useLocalStorage as jest.Mock).mockReturnValue({
      getItem: vi.fn((key) => {
        if (key === 'id') return mockUserId;
        if (key === 'UserImage')
          return { url: 'http://example.com/avatar.jpg' }; // Non-string userImage
        return null;
      }),
    });

    const mockWithoutAvatar = [
      {
        request: {
          query: UPDATE_CURRENT_USER_MUTATION,
          variables: { input: { naturalLanguageCode: 'es' } },
        },
        result: { data: { updateUser: { id: mockUserId } } },
      },
    ];

    render(
      <MockedProvider mocks={mockWithoutAvatar} addTypename={false}>
        <ChangeLanguageDropDown />
      </MockedProvider>,
    );

    const dropdown = screen.getByTestId('language-dropdown-btn');
    fireEvent.click(dropdown);

    const spanishOption = screen.getByTestId('change-language-btn-es');
    fireEvent.click(spanishOption);

    await waitFor(() => {
      expect(i18next.changeLanguage).toHaveBeenCalledWith('es');
      expect(cookies.set).toHaveBeenCalledWith('i18next', 'es');
    });

    // Verify urlToFile was not called for non-string userImage
    expect(urlToFile).not.toHaveBeenCalled();
  });

  it('applies custom btnTextStyle prop', () => {
    const customStyle = 'custom-btn-style';
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ChangeLanguageDropDown btnTextStyle={customStyle} />
      </MockedProvider>,
    );

    const buttonText = screen.getByText('English').closest('span');
    expect(buttonText).toHaveClass(customStyle);
  });

  it('handles default language when no cookie is set', () => {
    (cookies.get as jest.Mock).mockReturnValue(null); // No cookie set

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ChangeLanguageDropDown />
      </MockedProvider>,
    );

    // Should default to English
    expect(screen.getByText('English')).toBeInTheDocument();
  });
});
