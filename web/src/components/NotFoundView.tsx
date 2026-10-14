import React from 'react';
import { Result, Button } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { useLanguage } from '../i18n/LanguageContext';
import { ActiveView } from '../types';

interface NotFoundViewProps {
  onNavigate: (view: ActiveView) => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({ onNavigate }) => {
  const { t } = useLanguage();

  return (
    <div style={{ maxWidth: 640, margin: '48px auto', padding: '0 16px' }}>
      <Result
        status="404"
        title={t.notFound.title}
        subTitle={t.notFound.description}
        extra={
          <Button
            type="primary"
            size="large"
            icon={<HomeOutlined />}
            onClick={() => onNavigate('lookup')}
          >
            {t.notFound.homeBtn}
          </Button>
        }
      />
    </div>
  );
};

export default NotFoundView;
