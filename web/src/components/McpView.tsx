import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Tag,
  Button,
  Tabs,
  Table,
  Alert,
  Steps,
  Collapse,
  Descriptions,
  Badge,
  Tooltip,
  theme,
} from 'antd';
import {
  ApiOutlined,
  RobotOutlined,
  CopyOutlined,
  CheckOutlined,
  CodeOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  SafetyCertificateOutlined,
  QuestionCircleOutlined,
  CompassOutlined,
} from '@ant-design/icons';
import { useLanguage } from '../i18n/LanguageContext';
import { copyToClipboard } from '../utils/helpers';

const { Title, Paragraph, Text } = Typography;

export const McpView: React.FC = () => {
  const { language, t } = useLanguage();
  const { token } = theme.useToken();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const mp = t.mcpPage;
  const canonicalEndpoint = 'https://ip-hub.ir/mcp';

  const handleCopy = (id: string, text: string) => {
    copyToClipboard(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Inject JSON-LD Structured Data (TechArticle + SoftwareApplication + HowTo + FAQPage) for SEO / AEO / GEO
  useEffect(() => {
    const scriptId = 'mcp-page-jsonld-schema';
    let scriptEl = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = scriptId;
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }

    const schemaGraph = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'TechArticle',
          headline: mp.schemaHeadline,
          description: mp.schemaDesc,
          url: language === 'fa' ? 'https://ip-hub.ir/fa/mcp' : 'https://ip-hub.ir/mcp',
          inLanguage: language === 'fa' ? 'fa-IR' : 'en-US',
          datePublished: '2026-08-19',
          dateModified: '2026-11-23',
          author: {
            '@type': 'Organization',
            name: t.brand,
            url: 'https://ip-hub.ir/',
          },
          publisher: {
            '@type': 'Organization',
            name: t.brand,
            url: 'https://ip-hub.ir/',
          },
        },
        {
          '@type': 'SoftwareApplication',
          name: mp.title,
          applicationCategory: 'DeveloperApplication',
          operatingSystem: 'All',
          url: canonicalEndpoint,
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
          featureList: [
            'Streamable HTTP MCP Transport at https://ip-hub.ir/mcp',
            '6 Network Intelligence Tools: whois_lookup, whois_batch, country_resources, subnet_calculator, system_status, list_plugins',
            '5 Static & Dynamic URI Resources (iphub://country/{code}/rules/{format})',
            '7 Bilingual (English & Persian) Prompt Templates including لیست IP {country} برای {format}',
          ],
        },
        {
          '@type': 'HowTo',
          name: mp.schemaHowToName,
          step: [
            {
              '@type': 'HowToStep',
              position: 1,
              name: mp.schemaStep1Name,
              text: mp.schemaStep1Text,
            },
            {
              '@type': 'HowToStep',
              position: 2,
              name: mp.schemaStep2Name,
              text: mp.schemaStep2Text,
            },
            {
              '@type': 'HowToStep',
              position: 3,
              name: mp.schemaStep3Name,
              text: mp.schemaStep3Text,
            },
          ],
        },
        {
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: mp.schemaFaq1Q,
              acceptedAnswer: {
                '@type': 'Answer',
                text: mp.schemaFaq1A,
              },
            },
            {
              '@type': 'Question',
              name: mp.schemaFaq2Q,
              acceptedAnswer: {
                '@type': 'Answer',
                text: mp.schemaFaq2A,
              },
            },
          ],
        },
      ],
    };

    scriptEl.textContent = JSON.stringify(schemaGraph);
    return () => {
      const existing = document.getElementById(scriptId);
      if (existing) existing.remove();
    };
  }, [language, mp, t.brand]);

  const claudeCodeSnippet = `# Add IP-Hub Streamable HTTP MCP Server to Claude Code CLI
claude mcp add --transport http ip-hub ${canonicalEndpoint}

# Or in claude_desktop_config.json (via npx mcp-remote for clients requiring stdio bridge):
{
  "mcpServers": {
    "ip-hub": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${canonicalEndpoint}"]
    }
  }
}`;

  const cursorSnippet = `// .cursor/mcp.json or ~/.cursor/mcp.json
{
  "mcpServers": {
    "ip-hub": {
      "url": "${canonicalEndpoint}"
    }
  }
}`;

  const vscodeSnippet = `// .vscode/mcp.json (VS Code GitHub Copilot / Antigravity IDE)
{
  "servers": {
    "ip-hub": {
      "type": "http",
      "url": "${canonicalEndpoint}"
    }
  }
}`;

  const windsurfClineSnippet = `// Windsurf (mcp_config.json) / Cline / Roo Code
{
  "mcpServers": {
    "ip-hub": {
      "serverUrl": "${canonicalEndpoint}",
      "url": "${canonicalEndpoint}"
    }
  }
}`;

  const curlJsonRpcSnippet = `# 1. Initialize MCP Session over Streamable HTTP
curl -i -X POST "${canonicalEndpoint}" \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json, text/event-stream" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": { "name": "curl-client", "version": "1.0.0" }
    }
  }'

# 2. Call country_resources Tool (Accepts ISO code or English/Persian country name)
curl -X POST "${canonicalEndpoint}" \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json, text/event-stream" \\
  -H "Mcp-Session-Id: <SESSION_ID_FROM_HEADER>" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "country_resources",
      "arguments": {
        "code": "Iran",
        "format": "mikrotik",
        "version": "ipv4",
        "access": "allow",
        "listName": "IRAN"
      }
    }
  }'`;

  const renderCodeBlock = (id: string, code: string, label: string) => (
    <div
      style={{
        position: 'relative',
        background: token.colorFillAlter,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        padding: '14px 16px',
        fontFamily: 'monospace',
        fontSize: 12.5,
        lineHeight: 1.65,
        direction: 'ltr',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
          paddingBottom: 6,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>
          {label}
        </Text>
        <Button
          size="small"
          type={copiedId === id ? 'primary' : 'default'}
          icon={copiedId === id ? <CheckOutlined /> : <CopyOutlined />}
          onClick={() => handleCopy(id, code)}
        >
          {copiedId === id ? mp.copiedCodeBtn : mp.copyCodeBtn}
        </Button>
      </div>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: token.colorText }}>
        {code}
      </pre>
    </div>
  );

  const toolsData = [
    {
      name: 'whois_lookup',
      title: mp.tools.whoisLookupTitle,
      args: 'query (string, required)',
      description: mp.tools.whoisLookupDesc,
      sample: '{"query": "193.0.6.139"}',
    },
    {
      name: 'country_resources',
      title: mp.tools.countryResourcesTitle,
      args: 'code (country name or ISO), format?, version?, access?, listName?',
      description: mp.tools.countryResourcesDesc,
      sample: '{"code": "ایران", "format": "mikrotik", "version": "ipv4", "access": "allow", "listName": "IRAN"}',
    },
    {
      name: 'whois_batch',
      title: mp.tools.whoisBatchTitle,
      args: 'items (string[], max 50)',
      description: mp.tools.whoisBatchDesc,
      sample: '{"items": ["1.1.1.1", "8.8.8.8", "193.0.6.139"]}',
    },
    {
      name: 'subnet_calculator',
      title: mp.tools.subnetCalcTitle,
      args: 'ip (string, required), cidr? (int)',
      description: mp.tools.subnetCalcDesc,
      sample: '{"ip": "192.168.10.0/24"}',
    },
    {
      name: 'system_status',
      title: mp.tools.systemStatusTitle,
      args: '{}',
      description: mp.tools.systemStatusDesc,
      sample: '{}',
    },
    {
      name: 'list_plugins',
      title: mp.tools.listPluginsTitle,
      args: '{}',
      description: mp.tools.listPluginsDesc,
      sample: '{}',
    },
  ];

  const resourcesData = [
    {
      uri: 'iphub://country/{code}',
      type: mp.resourceTypeTemplate,
      mime: 'application/json',
      description: mp.resources.countryDesc,
    },
    {
      uri: 'iphub://country/{code}/rules/{format}',
      type: mp.resourceTypeTemplate,
      mime: 'text/plain / application/json',
      description: mp.resources.countryRulesDesc,
    },
    {
      uri: 'iphub://system/status',
      type: mp.resourceTypeStatic,
      mime: 'application/json',
      description: mp.resources.statusDesc,
    },
    {
      uri: 'iphub://system/plugins',
      type: mp.resourceTypeStatic,
      mime: 'application/json',
      description: mp.resources.pluginsDesc,
    },
    {
      uri: 'iphub://docs/llms.txt',
      type: mp.resourceTypeStatic,
      mime: 'text/markdown',
      description: mp.resources.llmsDesc,
    },
  ];

  const promptsData = [
    {
      name: 'country_ip_list_fa',
      templateTitle: mp.prompts.countryIpListFaTitle,
      args: 'country (required), format (required), version?, access?, list_name?, use_case?',
      description: mp.prompts.countryIpListFaDesc,
      examplePrompt: mp.prompts.countryIpListFaExample,
    },
    {
      name: 'generate_country_firewall_config',
      templateTitle: mp.prompts.generateFirewallTitle,
      args: 'country (required), format (required), policy?, version?, list_name?, lang? (en/fa)',
      description: mp.prompts.generateFirewallDesc,
      examplePrompt: mp.prompts.generateFirewallExample,
    },
    {
      name: 'ddos_geoip_mitigation_guide',
      templateTitle: mp.prompts.ddosGuideTitle,
      args: 'country (required), format (required), strategy? (whitelist/blacklist), lang?',
      description: mp.prompts.ddosGuideDesc,
      examplePrompt: mp.prompts.ddosGuideExample,
    },
    {
      name: 'investigate_network_resource',
      templateTitle: mp.prompts.investigateTitle,
      args: 'target (required), lang? (en/fa)',
      description: mp.prompts.investigateDesc,
      examplePrompt: mp.prompts.investigateExample,
    },
    {
      name: 'batch_ip_security_triage',
      templateTitle: mp.prompts.batchTriageTitle,
      args: 'ips (required), format?, lang? (en/fa)',
      description: mp.prompts.batchTriageDesc,
      examplePrompt: mp.prompts.batchTriageExample,
    },
    {
      name: 'asn_bgp_peering_analysis',
      templateTitle: mp.prompts.asnAnalysisTitle,
      args: 'asn (required), format?, lang? (en/fa)',
      description: mp.prompts.asnAnalysisDesc,
      examplePrompt: mp.prompts.asnAnalysisExample,
    },
    {
      name: 'subnet_planning_assistant',
      templateTitle: mp.prompts.subnetAssistantTitle,
      args: 'cidr (required), lang? (en/fa)',
      description: mp.prompts.subnetAssistantDesc,
      examplePrompt: mp.prompts.subnetAssistantExample,
    },
  ];

  const faqItems = [
    {
      key: 'faq-1',
      label: <Text strong>{mp.faq1Q}</Text>,
      children: (
        <Paragraph style={{ margin: 0, fontSize: 13, textAlign: 'justify' }}>
          {mp.faq1A}
        </Paragraph>
      ),
    },
    {
      key: 'faq-2',
      label: <Text strong>{mp.faq2Q}</Text>,
      children: (
        <Paragraph style={{ margin: 0, fontSize: 13, textAlign: 'justify' }}>
          {mp.faq2A}
        </Paragraph>
      ),
    },
    {
      key: 'faq-3',
      label: <Text strong>{mp.faq3Q}</Text>,
      children: (
        <Paragraph style={{ margin: 0, fontSize: 13, textAlign: 'justify' }}>
          {mp.faq3A}
        </Paragraph>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px', width: '100%' }}>
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        {/* Header Card */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: token.borderRadiusLG,
                background: token.colorPrimary,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                flexShrink: 0,
              }}
            >
              <ApiOutlined />
            </div>
            <div>
              <Title level={3} style={{ margin: 0, fontWeight: 800 }}>
                {mp.title}
              </Title>
              <Paragraph type="secondary" style={{ margin: '4px 0 0', fontSize: 13, textAlign: 'justify' }}>
                {mp.subtitle}
              </Paragraph>
            </div>
          </div>

          {/* Endpoint Bar */}
          <div
            style={{
              marginTop: 20,
              padding: '12px 16px',
              borderRadius: token.borderRadiusLG,
              background: token.colorFillAlter,
              border: `1px solid ${token.colorBorderSecondary}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <Space orientation="horizontal" size={10} align="center" wrap>
              <Badge status="processing" />
              <Text strong style={{ fontSize: 13 }}>
                {mp.endpointLabel}
              </Text>
              <Tag
                color="processing"
                style={{
                  fontFamily: 'monospace',
                  fontSize: 13.5,
                  padding: '3px 10px',
                  margin: 0,
                  direction: 'ltr',
                }}
              >
                {canonicalEndpoint}
              </Tag>
            </Space>

            <Space orientation="horizontal" size={8}>
              <Button
                type="primary"
                size="small"
                icon={copiedId === 'endpoint-url' ? <CheckOutlined /> : <CopyOutlined />}
                onClick={() => handleCopy('endpoint-url', canonicalEndpoint)}
              >
                {copiedId === 'endpoint-url' ? mp.copiedEndpointBtn : mp.copyEndpointBtn}
              </Button>
            </Space>
          </div>
        </Card>

        {/* Direct Answer & Server Specifications */}
        <Card
          title={
            <Space orientation="horizontal" size={8}>
              <RobotOutlined style={{ color: token.colorPrimary, fontSize: 18 }} />
              <span style={{ whiteSpace: 'normal' }}>{mp.specsCardTitle}</span>
            </Space>
          }
        >
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              title={mp.directAnswerTitle}
              description={
                <div style={{ fontSize: 13, lineHeight: 1.75, textAlign: 'justify' }}>
                  {mp.directAnswerBody}
                </div>
              }
            />

            <Descriptions
              bordered
              size="small"
              column={{ xs: 1, sm: 2, md: 3 }}
              styles={{
                label: { width: '1%', whiteSpace: 'nowrap' },
                content: { width: 'auto' },
              }}
              items={[
                {
                  key: 'server-name',
                  label: mp.specServerNameLabel,
                  styles: { content: { width: '1%', whiteSpace: 'nowrap' } },
                  children: <Text code>ip-hub</Text>,
                },
                {
                  key: 'transport',
                  label: mp.specTransportLabel,
                  children: <Tag color="blue">{mp.specTransportValue}</Tag>,
                },
                {
                  key: 'auth',
                  label: mp.specAuthLabel,
                  children: <Tag color="success">{mp.specAuthValue}</Tag>,
                },
                {
                  key: 'url',
                  label: mp.specUrlLabel,
                  styles: { content: { width: '1%', whiteSpace: 'nowrap' } },
                  children: (
                    <Text copyable style={{ fontFamily: 'monospace', direction: 'ltr', whiteSpace: 'nowrap' }}>
                      {canonicalEndpoint}
                    </Text>
                  ),
                },
                {
                  key: 'country-res',
                  label: mp.specCountryResLabel,
                  children: mp.specCountryResValue,
                },
                {
                  key: 'formats',
                  label: mp.specFormatsLabel,
                  children: (
                    <Space size={4} wrap>
                      <Tag>mikrotik</Tag>
                      <Tag>cisco</Tag>
                      <Tag>ipset</Tag>
                      <Tag>freebsd-pf</Tag>
                      <Tag>fortigate</Tag>
                      <Tag>htaccess</Tag>
                      <Tag>json</Tag>
                    </Space>
                  ),
                },
              ]}
            />
          </Space>
        </Card>

        {/* Quick Start Steps & Client Setup Tabs */}
        <Card
          title={
            <Space orientation="horizontal" size={8}>
              <ThunderboltOutlined style={{ color: '#fa8c16', fontSize: 18 }} />
              <span style={{ whiteSpace: 'normal' }}>{mp.quickStartTitle}</span>
            </Space>
          }
        >
          <Space orientation="vertical" size={20} style={{ width: '100%' }}>
            <Steps
              current={-1}
              items={[
                {
                  title: mp.step1Title,
                  description: mp.step1Desc,
                },
                {
                  title: mp.step2Title,
                  description: mp.step2Desc,
                },
                {
                  title: mp.step3Title,
                  description: mp.step3Desc,
                },
              ]}
            />

            <Tabs
              defaultActiveKey="cursor"
              items={[
                {
                  key: 'cursor',
                  label: mp.tabCursor,
                  children: renderCodeBlock('cfg-cursor', cursorSnippet, '.cursor/mcp.json'),
                },
                {
                  key: 'vscode',
                  label: mp.tabVscode,
                  children: renderCodeBlock('cfg-vscode', vscodeSnippet, '.vscode/mcp.json'),
                },
                {
                  key: 'claude',
                  label: mp.tabClaude,
                  children: renderCodeBlock('cfg-claude', claudeCodeSnippet, 'Claude CLI / claude_desktop_config.json'),
                },
                {
                  key: 'windsurf',
                  label: mp.tabWindsurf,
                  children: renderCodeBlock('cfg-windsurf', windsurfClineSnippet, 'mcp_config.json'),
                },
                {
                  key: 'curl',
                  label: mp.tabCurl,
                  children: renderCodeBlock('cfg-curl', curlJsonRpcSnippet, 'Streamable HTTP POST /mcp'),
                },
              ]}
            />
          </Space>
        </Card>

        {/* 6 MCP Tools Table */}
        <Card
          title={
            <Space orientation="horizontal" size={8}>
              <CodeOutlined style={{ color: token.colorPrimary, fontSize: 18 }} />
              <span style={{ whiteSpace: 'normal' }}>{mp.toolsCardTitle}</span>
            </Space>
          }
        >
          <Table
            rowKey="name"
            size="middle"
            pagination={false}
            scroll={{ x: 760 }}
            dataSource={toolsData}
            columns={[
              {
                title: mp.colToolName,
                dataIndex: 'name',
                key: 'name',
                width: 190,
                render: (val: string, record) => (
                  <Space orientation="vertical" size={2}>
                    <Tag color="blue" style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 600 }}>
                      {val}
                    </Tag>
                    <Text type="secondary" style={{ fontSize: 11.5 }}>
                      {record.title}
                    </Text>
                  </Space>
                ),
              },
              {
                title: mp.colArgs,
                dataIndex: 'args',
                key: 'args',
                width: 220,
                align: 'left',
                onCell: () => ({ style: { direction: 'ltr', textAlign: 'left' } }),
                render: (val: string) => (
                  <Text code style={{ fontSize: 12, direction: 'ltr', textAlign: 'left', display: 'inline-block' }}>
                    {val}
                  </Text>
                ),
              },
              {
                title: mp.colDesc,
                dataIndex: 'description',
                key: 'description',
                onCell: () => ({ style: { textAlign: 'justify' } }),
                render: (val: string) => (
                  <div style={{ fontSize: 13, textAlign: 'justify' }}>{val}</div>
                ),
              },
              {
                title: mp.colSample,
                dataIndex: 'sample',
                key: 'sample',
                width: 240,
                align: 'left',
                onCell: () => ({ style: { direction: 'ltr', textAlign: 'left' } }),
                render: (val: string, record) => (
                  <Space orientation="horizontal" size={6} style={{ direction: 'ltr' }}>
                    <Tooltip title={val}>
                      <Text
                        code
                        style={{
                          fontSize: 11.5,
                          maxWidth: 175,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'inline-block',
                          direction: 'ltr',
                          textAlign: 'left',
                        }}
                      >
                        {val}
                      </Text>
                    </Tooltip>
                    <Button
                      size="small"
                      type="text"
                      icon={copiedId === `tool-${record.name}` ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
                      onClick={() => handleCopy(`tool-${record.name}`, val)}
                      title={mp.copySampleTooltip}
                    />
                  </Space>
                ),
              },
            ]}
          />
        </Card>

        {/* 7 Parameterized Prompts Table (English & Persian) */}
        <Card
          title={
            <Space orientation="horizontal" size={8}>
              <SafetyCertificateOutlined style={{ color: '#52c41a', fontSize: 18 }} />
              <span style={{ whiteSpace: 'normal' }}>{mp.promptsCardTitle}</span>
            </Space>
          }
        >
          <Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 16, fontSize: 13, textAlign: 'justify' }}>
            {mp.promptsIntro}
          </Paragraph>

          <Table
            rowKey="name"
            size="middle"
            pagination={false}
            scroll={{ x: 780 }}
            dataSource={promptsData}
            columns={[
              {
                title: mp.colPromptName,
                dataIndex: 'name',
                key: 'name',
                width: 240,
                render: (val: string, record) => (
                  <Space orientation="vertical" size={4}>
                    <Tag color="purple" style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>
                      {val}
                    </Tag>
                    <Text strong style={{ fontSize: 12.5 }}>
                      {record.templateTitle}
                    </Text>
                  </Space>
                ),
              },
              {
                title: mp.colPromptArgs,
                dataIndex: 'args',
                key: 'args',
                width: 210,
                align: 'left',
                onCell: () => ({ style: { direction: 'ltr', textAlign: 'left' } }),
                render: (val: string) => (
                  <Text code style={{ fontSize: 11.5, direction: 'ltr', textAlign: 'left', display: 'inline-block' }}>
                    {val}
                  </Text>
                ),
              },
              {
                title: mp.colPromptDesc,
                dataIndex: 'description',
                key: 'description',
                onCell: () => ({ style: { textAlign: 'justify' } }),
                render: (val: string) => (
                  <div style={{ fontSize: 13, textAlign: 'justify' }}>{val}</div>
                ),
              },
              {
                title: mp.colPromptExample,
                dataIndex: 'examplePrompt',
                key: 'examplePrompt',
                width: 240,
                render: (val: string, record) => (
                  <Space orientation="horizontal" size={6} style={{ justifyContent: 'space-between', width: '100%' }}>
                    <Text style={{ fontSize: 12 }}>{val}</Text>
                    <Button
                      size="small"
                      type="text"
                      icon={copiedId === `prompt-${record.name}` ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
                      onClick={() => handleCopy(`prompt-${record.name}`, val)}
                      title={mp.copyPromptTooltip}
                    />
                  </Space>
                ),
              },
            ]}
          />
        </Card>

        {/* 5 MCP Resources & Templates Table */}
        <Card
          title={
            <Space orientation="horizontal" size={8}>
              <DatabaseOutlined style={{ color: '#722ed1', fontSize: 18 }} />
              <span style={{ whiteSpace: 'normal' }}>{mp.resourcesCardTitle}</span>
            </Space>
          }
        >
          <Table
            rowKey="uri"
            size="middle"
            pagination={false}
            scroll={{ x: 700 }}
            dataSource={resourcesData}
            columns={[
              {
                title: mp.colResourceUri,
                dataIndex: 'uri',
                key: 'uri',
                width: 270,
                align: 'left',
                onCell: () => ({ style: { direction: 'ltr', textAlign: 'left' } }),
                render: (val: string) => (
                  <Space orientation="horizontal" size={6} style={{ direction: 'ltr' }}>
                    <Tag color="geekblue" style={{ fontFamily: 'monospace', fontSize: 12, direction: 'ltr', textAlign: 'left' }}>
                      {val}
                    </Tag>
                    <Button
                      size="small"
                      type="text"
                      icon={copiedId === `res-${val}` ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
                      onClick={() => handleCopy(`res-${val}`, val)}
                    />
                  </Space>
                ),
              },
              {
                title: mp.colResourceType,
                dataIndex: 'type',
                key: 'type',
                width: 150,
                render: (val: string) => <Tag>{val}</Tag>,
              },
              {
                title: mp.colResourceMime,
                dataIndex: 'mime',
                key: 'mime',
                width: 180,
                align: 'left',
                onCell: () => ({ style: { direction: 'ltr', textAlign: 'left' } }),
                render: (val: string) => (
                  <Text code style={{ fontSize: 12, direction: 'ltr', textAlign: 'left', display: 'inline-block' }}>
                    {val}
                  </Text>
                ),
              },
              {
                title: mp.colResourceDesc,
                dataIndex: 'description',
                key: 'description',
                onCell: () => ({ style: { textAlign: 'justify' } }),
                render: (val: string) => (
                  <div style={{ fontSize: 13, textAlign: 'justify' }}>{val}</div>
                ),
              },
            ]}
          />
        </Card>

        {/* Practical Examples Grid + FAQ */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card
              style={{ height: '100%' }}
              title={
                <Space orientation="horizontal" size={8}>
                  <CompassOutlined style={{ color: token.colorPrimary }} />
                  <span style={{ whiteSpace: 'normal' }}>{mp.commonFaPromptsTitle}</span>
                </Space>
              }
            >
              <Space orientation="vertical" size={10} style={{ width: '100%' }}>
                {mp.commonFaPrompts.map((sample, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '10px 12px',
                      borderRadius: token.borderRadius,
                      background: token.colorFillAlter,
                      border: `1px solid ${token.colorBorderSecondary}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      direction: 'rtl',
                    }}
                  >
                    <Text style={{ fontSize: 12.5 }}>{sample}</Text>
                    <Button
                      size="small"
                      type="text"
                      icon={copiedId === `fa-sample-${idx}` ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
                      onClick={() => handleCopy(`fa-sample-${idx}`, sample)}
                    />
                  </div>
                ))}
              </Space>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              style={{ height: '100%' }}
              title={
                <Space orientation="horizontal" size={8}>
                  <GlobalOutlined style={{ color: '#13c2c2' }} />
                  <span style={{ whiteSpace: 'normal' }}>{mp.commonEnPromptsTitle}</span>
                </Space>
              }
            >
              <Space orientation="vertical" size={10} style={{ width: '100%' }}>
                {mp.commonEnPrompts.map((sample, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '10px 12px',
                      borderRadius: token.borderRadius,
                      background: token.colorFillAlter,
                      border: `1px solid ${token.colorBorderSecondary}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      direction: 'ltr',
                    }}
                  >
                    <Text style={{ fontSize: 12.5 }}>{sample}</Text>
                    <Button
                      size="small"
                      type="text"
                      icon={copiedId === `en-sample-${idx}` ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
                      onClick={() => handleCopy(`en-sample-${idx}`, sample)}
                    />
                  </div>
                ))}
              </Space>
            </Card>
          </Col>
        </Row>

        {/* FAQ Collapse */}
        <Card
          title={
            <Space orientation="horizontal" size={8}>
              <QuestionCircleOutlined style={{ color: token.colorWarning, fontSize: 18 }} />
              <span style={{ whiteSpace: 'normal' }}>{mp.faqCardTitle}</span>
            </Space>
          }
        >
          <Collapse items={faqItems} defaultActiveKey={['faq-1', 'faq-2']} />
        </Card>
      </Space>
    </div>
  );
};

export default McpView;
