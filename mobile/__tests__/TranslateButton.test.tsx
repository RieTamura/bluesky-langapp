import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TranslateButton from '../src/components/TranslateButton';
import translation from '../src/services/translation';

jest.mock('../src/services/translation');

describe('TranslateButton', () => {
  it('renders and toggles translation', async () => {
  // @ts-expect-error mocked
  translation.translate.mockResolvedValue({ text: '[mock ja] Hello', detectedLanguage: 'en' });

  const { getByText, queryByText } = render(<TranslateButton text="Hello" targetLang="ja" />);
  const btn = getByText('翻訳');
  expect(btn).toBeTruthy();

  fireEvent.press(btn);

  await waitFor(() => expect(getByText('[mock ja] Hello')).toBeTruthy());

  // press again to revert
  fireEvent.press(btn);
  await waitFor(() => expect(queryByText('[mock ja] Hello')).toBeNull());
  });
});
