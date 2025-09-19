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
  const { getByText: g, queryByText: q } = { getByText, queryByText };
  // press the initial button
  expect(g('翻訳')).toBeTruthy();
  fireEvent.press(g('翻訳'));

  await waitFor(() => expect(g('[mock ja] Hello')).toBeTruthy());

  // press again to revert: re-query the button by its updated label to avoid using a stale node
  fireEvent.press(g('原文に戻す'));
  await waitFor(() => expect(q('[mock ja] Hello')).toBeNull());
  });
});
