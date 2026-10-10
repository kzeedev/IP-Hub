import React, { useState } from 'react';
import { Card, Input, Select, Collapse, Descriptions, Tag, Typography, Space, Button, Empty, theme } from 'antd';
import { DatabaseOutlined, SearchOutlined, CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { RipeObject } from '../types';
import { copyToClipboard } from '../utils/helpers';
import { useLanguage } from '../i18n/LanguageContext';

const { Text } = Typography;

interface RipeObjectsTabProps {
  objects?: RipeObject[];
  onSearchResource: (res: string) => void;
}

export const RipeObjectsTab: React.FC<RipeObjectsTabProps> = ({ objects = [], onSearchResource }) => {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [filterText, setFilterText] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    if (!text) return;
    copyToClipboard(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const safeObjects = Array.isArray(objects) ? objects.filter(Boolean) : [];

  const objectTypes: string[] = Array.from(
    new Set(safeObjects.map((o) => o?.type).filter((t): t is string => Boolean(t)))
  );

  const filteredObjects = safeObjects.filter((obj) => {
    if (!obj) return false;
    const objType = obj.type || '';
    const primaryKey = obj.primaryKey || '';

    if (selectedType !== 'all' && objType !== selectedType) return false;
    if (!filterText.trim()) return true;

    const query = filterText.toLowerCase();
    if (objType.toLowerCase().includes(query) || primaryKey.toLowerCase().includes(query)) return true;

    return obj.attributes?.some((attr) => {
      const name = attr?.name || '';
      const val = attr?.value != null ? String(attr.value) : '';
      return name.toLowerCase().includes(query) || val.toLowerCase().includes(query);
    });
  });

  const collapseItems = filteredObjects.map((obj, idx) => {
    const objText = (obj.attributes || [])
      .map((a) => `${a.name.padEnd(16)}: ${a.value}`)
      .join('\n');

    return {
      key: String(idx),
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Space orientation="horizontal" size={8}>
            <Tag color="blue" style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}>
              {obj.type}
            </Tag>
            <Text strong style={{ fontFamily: 'monospace' }}>
              {obj.primaryKey}
            </Text>
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {obj.attributes?.length || 0} attributes
          </Text>
        </div>
      ),
      extra: (
        <Button
          type="text"
          size="small"
          icon={copiedKey === String(idx) ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            handleCopy(String(idx), objText);
          }}
          title={t.common.copy}
        />
      ),
      children: (
        <Descriptions
          bordered
          size="small"
          column={{ xs: 1, sm: 1, md: 2 }}
          items={(obj.attributes || []).map((attr, aIdx) => ({
            key: aIdx,
            label: <Text code>{attr.name}</Text>,
            children: (
              <Text copyable={{ text: String(attr.value) }} style={{ fontFamily: 'monospace' }}>
                {String(attr.value)}
              </Text>
            ),
          }))}
        />
      ),
    };
  });

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      {/* Controls Card */}
      <Card>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input
            style={{ flex: 1, minWidth: 200 }}
            prefix={<SearchOutlined style={{ color: token.colorTextSecondary }} />}
            placeholder={t.ripeObjectsTab.searchPlaceholder}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            allowClear
          />

          <Select
            style={{ minWidth: 160 }}
            value={selectedType}
            onChange={setSelectedType}
            options={[
              { value: 'all', label: `${t.ripeObjectsTab.allTypes} (${safeObjects.length})` },
              ...objectTypes.map((type) => ({ value: type, label: type.toUpperCase() })),
            ]}
          />
        </div>
      </Card>

      {/* Collapse Listing */}
      {collapseItems.length === 0 ? (
        <Card>
          <Empty description={t.ripeObjectsTab.noObjects} />
        </Card>
      ) : (
        <Collapse
          defaultActiveKey={['0']}
          items={collapseItems}
        />
      )}
    </Space>
  );
};
