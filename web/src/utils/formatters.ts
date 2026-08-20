import { ExportFormat, IpVersionOption, AccessTypeOption, CountryIpResource } from '../types';

export interface FormatOptions {
  countryCode: string;
  countryName: string;
  format: ExportFormat;
  version: IpVersionOption;
  access: AccessTypeOption;
  listName?: string;
  data: CountryIpResource;
  resolvedOrgs?: Record<string, string>;
}

export function generateFirewallConfig(options: FormatOptions): { text: string; filename: string; ruleCount: number } {
  const { countryCode, countryName, format, version, access, listName, data, resolvedOrgs = {} } = options;
  const name = (listName || countryCode).trim().toUpperCase();
  const permitDeny = access === 'allow' ? 'permit' : 'deny';
  const allowDeny = access === 'allow' ? 'Allow' : 'Deny';
  const iptablesTarget = access === 'allow' ? 'ACCEPT' : 'DROP';

  const includeV4 = version === 'any' || version === 'ipv4';
  const includeV6 = version === 'any' || version === 'ipv6';

  const v4List = includeV4 ? data.ipv4 : [];
  const v6List = includeV6 ? data.ipv6 : [];
  const totalRules = v4List.length + v6List.length;

  let content = '';
  let filename = `${countryCode.toLowerCase()}_${format}`;

  switch (format) {
    case 'mikrotik': {
      filename += '.rsc';
      const lines: string[] = [
        `# ========================================================`,
        `# IP-Hub MikroTik RouterOS Address-List Export`,
        `# Country: ${countryName} (${countryCode})`,
        `# Updated at: ${data.queryTime}`,
        `# Total IPv4: ${v4List.length}, Total IPv6: ${v6List.length}`,
        `# ========================================================`,
        '',
      ];

      if (includeV4 && v4List.length > 0) {
        lines.push('/ip/firewall/address-list');
        for (const ip of v4List) {
          const org = resolvedOrgs[ip];
          const comment = org ? ` comment="${org.replace(/"/g, "'")}"` : '';
          lines.push(`add list=${name} address=${ip}${comment}`);
        }
        lines.push('');
      }

      if (includeV6 && v6List.length > 0) {
        lines.push('/ipv6/firewall/address-list');
        for (const ip of v6List) {
          const org = resolvedOrgs[ip];
          const comment = org ? ` comment="${org.replace(/"/g, "'")}"` : '';
          lines.push(`add list=${name} address=${ip}${comment}`);
        }
        lines.push('');
      }

      content = lines.join('\n');
      break;
    }

    case 'cisco': {
      filename += '.txt';
      const lines: string[] = [
        `! ========================================================`,
        `! IP-Hub Cisco IOS Access-List (ACL) Export`,
        `! Country: ${countryName} (${countryCode})`,
        `! Action: ${permitDeny.toUpperCase()}`,
        `! Updated at: ${data.queryTime}`,
        `! ========================================================`,
        '',
      ];

      if (includeV4 && v4List.length > 0) {
        lines.push(`! IPv4 Access List for ${countryName}`);
        for (const ip of v4List) {
          lines.push(`ip access-list ${name} ${permitDeny} ${ip}`);
        }
        lines.push('');
      }

      if (includeV6 && v6List.length > 0) {
        lines.push(`! IPv6 Access List for ${countryName}`);
        for (const ip of v6List) {
          lines.push(`ipv6 access-list ${name} ${permitDeny} any ${ip} any any`);
        }
        lines.push('');
      }

      content = lines.join('\n');
      break;
    }

    case 'pf': {
      filename += '.conf';
      const pfAction = access === 'allow' ? 'pass' : 'block';
      const tableName = `ips_${(listName || countryCode).toLowerCase().replace(/[^a-z0-9_]/g, '')}`;
      const lines: string[] = [
        `# ========================================================`,
        `# IP-Hub FreeBSD Packet Filter (pf.conf) Table Export`,
        `# Country: ${countryName} (${countryCode})`,
        `# Action: ${pfAction}`,
        `# Updated at: ${data.queryTime}`,
        `# ========================================================`,
        `table <${tableName}> persist {`,
      ];

      for (const ip of [...v4List, ...v6List]) {
        lines.push(`    ${ip},`);
      }

      lines.push('}');
      lines.push('');
      lines.push('# Example PF Firewall Rule:');
      lines.push(`${pfAction} in quick from <${tableName}> to any`);

      content = lines.join('\n');
      break;
    }

    case 'htaccess': {
      filename = `.htaccess_${countryCode.toLowerCase()}`;
      const lines: string[] = [
        `# ========================================================`,
        `# IP-Hub Apache .htaccess Geo-Rule Export`,
        `# Country: ${countryName} (${countryCode})`,
        `# Action: ${allowDeny}`,
        `# ========================================================`,
        '<RequireAll>',
      ];

      if (access === 'allow') {
        lines.push('  Require all denied');
        for (const ip of [...v4List, ...v6List]) {
          lines.push(`  Require ip ${ip}`);
        }
      } else {
        lines.push('  Require all granted');
        for (const ip of [...v4List, ...v6List]) {
          lines.push(`  Require not ip ${ip}`);
        }
      }
      lines.push('</RequireAll>');
      lines.push('');

      // Also provide Order Allow,Deny legacy format
      lines.push('# Legacy Apache 2.2 Format:');
      lines.push(`Order ${access === 'allow' ? 'Deny,Allow' : 'Allow,Deny'}`);
      lines.push(access === 'allow' ? 'Deny from all' : 'Allow from all');
      for (const ip of [...v4List, ...v6List]) {
        lines.push(`${allowDeny} from ${ip}`);
      }

      content = lines.join('\n');
      break;
    }

    case 'iptables': {
      filename += '.sh';
      const lines: string[] = [
        `#!/bin/bash`,
        `# ========================================================`,
        `# IP-Hub Linux iptables & ip6tables Rules`,
        `# Country: ${countryName} (${countryCode})`,
        `# Target: ${iptablesTarget}`,
        `# ========================================================`,
        '',
      ];

      if (includeV4 && v4List.length > 0) {
        lines.push('# IPv4 iptables');
        for (const ip of v4List) {
          lines.push(`iptables -A INPUT -s ${ip} -j ${iptablesTarget}`);
        }
        lines.push('');
      }

      if (includeV6 && v6List.length > 0) {
        lines.push('# IPv6 ip6tables');
        for (const ip of v6List) {
          lines.push(`ip6tables -A INPUT -s ${ip} -j ${iptablesTarget}`);
        }
        lines.push('');
      }

      content = lines.join('\n');
      break;
    }

    case 'json': {
      filename += '.json';
      const output = {
        updatedAt: data.queryTime,
        countryCode,
        countryName,
        ipVersion: version,
        accessPolicy: access,
        ipv4Count: v4List.length,
        ipv6Count: v6List.length,
        asnCount: data.asns.length,
        totalEstimatedIpv4Addresses: data.totalEstimatedIpv4Addresses,
        ipv4: v4List,
        ipv6: v6List,
        asns: data.asns,
        asNames: data.asNames,
        resolvedOrgs,
      };
      content = JSON.stringify(output, null, 2);
      break;
    }

    case 'csv': {
      filename += '.csv';
      const rows = ['"Country","CountryCode","Protocol","Prefix","ISP / Organization"'];
      if (includeV4) {
        for (const ip of v4List) {
          const org = (resolvedOrgs[ip] || 'Unknown').replace(/"/g, '""');
          rows.push(`"${countryName}","${countryCode}","IPv4","${ip}","${org}"`);
        }
      }
      if (includeV6) {
        for (const ip of v6List) {
          const org = (resolvedOrgs[ip] || 'Unknown').replace(/"/g, '""');
          rows.push(`"${countryName}","${countryCode}","IPv6","${ip}","${org}"`);
        }
      }
      content = rows.join('\n');
      break;
    }

    case 'txt':
    default: {
      filename += '.txt';
      const lines: string[] = [
        `# IP-Hub Country CIDR Prefix Delegation: ${countryName} (${countryCode})`,
        `# Updated at: ${data.queryTime}`,
        `# Total IPv4: ${v4List.length}, Total IPv6: ${v6List.length}`,
        '',
      ];
      if (includeV4) {
        lines.push('# IPv4 Prefixes:');
        for (const ip of v4List) {
          const org = resolvedOrgs[ip];
          lines.push(org ? `${ip}\t# ${org}` : ip);
        }
        lines.push('');
      }
      if (includeV6) {
        lines.push('# IPv6 Prefixes:');
        for (const ip of v6List) {
          const org = resolvedOrgs[ip];
          lines.push(org ? `${ip}\t# ${org}` : ip);
        }
      }
      content = lines.join('\n');
      break;
    }
  }

  return {
    text: content,
    filename,
    ruleCount: totalRules,
  };
}
