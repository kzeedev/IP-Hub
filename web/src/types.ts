export type ActiveView = 
  | 'lookup' 
  | 'country-ips' 
  | 'batch' 
  | 'subnet-calc' 
  | 'source' 
  | 'issues'
  | 'settings';

export type ActiveTab = 
  | 'overview' 
  | 'objects' 
  | 'routing' 
  | 'abuse' 
  | 'geoloc' 
  | 'subnet' 
  | 'raw';

export type Language = 'en' | 'fa';

export type ExportFormat = 
  | 'mikrotik' 
  | 'cisco' 
  | 'htaccess' 
  | 'iptables' 
  | 'json' 
  | 'csv' 
  | 'txt';

export type IpVersionOption = 'any' | 'ipv4' | 'ipv6';
export type AccessTypeOption = 'allow' | 'deny';

export interface RipeAttribute {
  name: string;
  value: string;
  comment?: string;
}

export interface RipeObject {
  type: string;
  primaryKey: string;
  attributes: RipeAttribute[];
}

export interface ContactDetail {
  handle: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string[];
  role?: string;
  source?: string;
}

export interface AbuseContact {
  email: string;
  phone?: string;
  address?: string[];
  orgName?: string;
  orgHandle?: string;
  irtHandle?: string;
  nicHandle?: string;
  source?: string;
  description?: string;
}

export interface RoutingStatus {
  originAsn: string;
  asName?: string;
  announcedPrefix?: string;
  isAnnounced: boolean;
  bgpVisibilityPercentage: number;
  risPeersSeen: number;
  totalRisPeers: number;
  lastUpdated?: string;
}

export interface GeoLocation {
  country: string;
  countryCode: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  prefix?: string;
}

export interface SubnetBreakdown {
  ip: string;
  ipVersion: 4 | 6;
  cidr: string;
  prefixLength: number;
  networkAddress: string;
  broadcastAddress?: string;
  netmask?: string;
  wildcardMask?: string;
  firstUsableIp?: string;
  lastUsableIp?: string;
  totalHosts: string;
  usableHosts: string;
  binaryIp?: string;
}

export interface WhoisRecord {
  query: string;
  queryType: 'ipv4' | 'ipv6' | 'asn' | 'prefix' | 'unknown';
  normalizedQuery: string;
  netname: string;
  range: string;
  cidr: string;
  description: string[];
  country: string;
  countryCode: string;
  status: string;
  orgHandle?: string;
  orgName?: string;
  adminContacts: ContactDetail[];
  techContacts: ContactDetail[];
  abuseContact: AbuseContact;
  mntBy: string[];
  created?: string;
  lastModified?: string;
  source: string;
  reverseDns?: string;
  geolocation: GeoLocation;
  routing: RoutingStatus;
  subnet?: SubnetBreakdown;
  ripeObjects: RipeObject[];
  rawWhoisText: string;
  cached: boolean;
  queriedAt: string;
  responseTimeMs: number;
}

export interface AsnRecord {
  asn: string;
  asnNumber: number;
  holder: string;
  description?: string;
  country: string;
  countryCode: string;
  orgName?: string;
  announcedPrefixesCount: number;
  prefixes: string[];
  routingStatus: {
    announced: boolean;
    firstSeen?: string;
    peersCount?: number;
  };
  abuseContact?: AbuseContact;
  ripeObjects?: RipeObject[];
  rawWhoisText: string;
  queriedAt: string;
  responseTimeMs: number;
}

export interface CountryIpResource {
  countryCode: string;
  countryName: string;
  queryTime?: string;
  ipv4Count: number;
  ipv6Count: number;
  asnCount: number;
  totalEstimatedIpv4Addresses: number;
  ipv4: string[];
  ipv6: string[];
  asns: number[];
  asNames?: Record<string, string>;
  prefixOrgs?: Record<string, string>;
  cached?: boolean;
}

export interface CountryItem {
  code: string;
  name: string;
  flag: string;
  region?: string;
}

export interface BatchLookupItemResult {
  query: string;
  status: 'success' | 'error';
  ipVersion?: 4 | 6;
  netname?: string;
  range?: string;
  country?: string;
  countryCode?: string;
  originAsn?: string;
  asName?: string;
  abuseEmail?: string;
  error?: string;
}

export interface SearchHistoryItem {
  query: string;
  type: 'ip' | 'asn' | 'prefix';
  netname?: string;
  countryCode?: string;
  timestamp: number;
}
