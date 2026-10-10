import React from 'react';
import { Segmented, Space } from 'antd';
import { useLanguage } from '../i18n/LanguageContext';
import { FlagIcon } from './FlagIcon';
import { Language } from '../types';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <Segmented<Language>
      size="small"
      value={language}
      onChange={(val) => setLanguage(val as Language)}
      options={[
        {
          value: 'en',
          label: (
            <Space orientation="horizontal" size={4} align="center">
              <FlagIcon code="US" loading="eager" className="w-3.5 h-2.5" />
              <span>EN</span>
            </Space>
          ),
        },
        {
          value: 'fa',
          label: (
            <Space orientation="horizontal" size={4} align="center">
              <FlagIcon code="IR" loading="eager" className="w-3.5 h-2.5" />
              <span>FA</span>
            </Space>
          ),
        },
      ]}
    />
  );
};
