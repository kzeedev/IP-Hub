package models

type RipeAttribute struct {
	Name    string `json:"name"`
	Value   string `json:"value"`
	Comment string `json:"comment,omitempty"`
}

type RipeObject struct {
	Type       string          `json:"type"`
	PrimaryKey string          `json:"primaryKey"`
	Attributes []RipeAttribute `json:"attributes"`
}

type ContactDetail struct {
	Handle  string   `json:"handle"`
	Name    string   `json:"name,omitempty"`
	Email   string   `json:"email,omitempty"`
	Phone   string   `json:"phone,omitempty"`
	Address []string `json:"address,omitempty"`
	Role    string   `json:"role,omitempty"`
	Source  string   `json:"source,omitempty"`
}

type AbuseContact struct {
	Email       string   `json:"email"`
	Phone       string   `json:"phone,omitempty"`
	Address     []string `json:"address,omitempty"`
	OrgName     string   `json:"orgName,omitempty"`
	OrgHandle   string   `json:"orgHandle,omitempty"`
	IrtHandle   string   `json:"irtHandle,omitempty"`
	NicHandle   string   `json:"nicHandle,omitempty"`
	Source      string   `json:"source,omitempty"`
	Description string   `json:"description,omitempty"`
}

type RoutingStatus struct {
	OriginAsn               string `json:"originAsn"`
	AsName                  string `json:"asName,omitempty"`
	AnnouncedPrefix         string `json:"announcedPrefix,omitempty"`
	IsAnnounced             bool   `json:"isAnnounced"`
	BgpVisibilityPercentage int    `json:"bgpVisibilityPercentage"`
	RisPeersSeen            int    `json:"risPeersSeen"`
	TotalRisPeers           int    `json:"totalRisPeers"`
	LastUpdated             string `json:"lastUpdated,omitempty"`
}

type GeoLocation struct {
	Country     string   `json:"country"`
	CountryCode string   `json:"countryCode"`
	City        string   `json:"city,omitempty"`
	Region      string   `json:"region,omitempty"`
	Latitude    *float64 `json:"latitude,omitempty"`
	Longitude   *float64 `json:"longitude,omitempty"`
	Timezone    string   `json:"timezone,omitempty"`
	Prefix      string   `json:"prefix,omitempty"`
}

type SubnetBreakdown struct {
	IP               string `json:"ip"`
	IPVersion        int    `json:"ipVersion"`
	CIDR             string `json:"cidr"`
	PrefixLength     int    `json:"prefixLength"`
	NetworkAddress   string `json:"networkAddress"`
	BroadcastAddress string `json:"broadcastAddress,omitempty"`
	Netmask          string `json:"netmask,omitempty"`
	WildcardMask     string `json:"wildcardMask,omitempty"`
	FirstUsableIP    string `json:"firstUsableIp,omitempty"`
	LastUsableIP     string `json:"lastUsableIp,omitempty"`
	TotalHosts       string `json:"totalHosts"`
	UsableHosts      string `json:"usableHosts"`
	BinaryIP         string `json:"binaryIp,omitempty"`
}

type WhoisRecord struct {
	Query           string           `json:"query"`
	QueryType       string           `json:"queryType"`
	NormalizedQuery string           `json:"normalizedQuery"`
	Netname         string           `json:"netname"`
	Range           string           `json:"range"`
	CIDR            string           `json:"cidr"`
	Description     []string         `json:"description"`
	Country         string           `json:"country"`
	CountryCode     string           `json:"countryCode"`
	Status          string           `json:"status"`
	OrgHandle       string           `json:"orgHandle,omitempty"`
	OrgName         string           `json:"orgName,omitempty"`
	AdminContacts   []ContactDetail  `json:"adminContacts"`
	TechContacts    []ContactDetail  `json:"techContacts"`
	AbuseContact    AbuseContact     `json:"abuseContact"`
	MntBy           []string         `json:"mntBy"`
	Created         string           `json:"created,omitempty"`
	LastModified    string           `json:"lastModified,omitempty"`
	Source          string           `json:"source"`
	ReverseDNS      string           `json:"reverseDns,omitempty"`
	Geolocation     GeoLocation      `json:"geolocation"`
	Routing         RoutingStatus    `json:"routing"`
	Subnet          *SubnetBreakdown `json:"subnet,omitempty"`
	RipeObjects     []RipeObject     `json:"ripeObjects"`
	RawWhoisText    string           `json:"rawWhoisText"`
	Cached          bool             `json:"cached"`
	QueriedAt       string           `json:"queriedAt"`
	ResponseTimeMs  int64            `json:"responseTimeMs"`
}

type AsnRecord struct {
	Asn                    string        `json:"asn"`
	AsnNumber              int           `json:"asnNumber"`
	Holder                 string        `json:"holder"`
	Description            string        `json:"description,omitempty"`
	Country                string        `json:"country"`
	CountryCode            string        `json:"countryCode"`
	OrgName                string        `json:"orgName,omitempty"`
	AnnouncedPrefixesCount int           `json:"announcedPrefixesCount"`
	Prefixes               []string      `json:"prefixes"`
	RoutingStatus          struct {
		Announced bool `json:"announced"`
	} `json:"routingStatus"`
	AbuseContact   *AbuseContact `json:"abuseContact,omitempty"`
	RawWhoisText   string        `json:"rawWhoisText"`
	QueriedAt      string        `json:"queriedAt"`
	ResponseTimeMs int64         `json:"responseTimeMs"`
}

type CountryIpResource struct {
	CountryCode                 string            `json:"countryCode"`
	CountryName                 string            `json:"countryName"`
	QueryTime                   string            `json:"queryTime"`
	IPv4Count                   int               `json:"ipv4Count"`
	IPv6Count                   int               `json:"ipv6Count"`
	AsnCount                    int               `json:"asnCount"`
	TotalEstimatedIPv4Addresses int64             `json:"totalEstimatedIpv4Addresses"`
	IPv4                        []string          `json:"ipv4"`
	IPv6                        []string          `json:"ipv6"`
	ASNs                        []int             `json:"asns"`
	AsNames                     map[string]string `json:"asNames"`
	PrefixOrgs                  map[string]string `json:"prefixOrgs"`
	Cached                      bool              `json:"cached"`
}

type BatchItemResult struct {
	Query       string `json:"query"`
	Status      string `json:"status"`
	IPVersion   int    `json:"ipVersion,omitempty"`
	Netname     string `json:"netname,omitempty"`
	Range       string `json:"range,omitempty"`
	Country     string `json:"country,omitempty"`
	CountryCode string `json:"countryCode,omitempty"`
	OriginAsn   string `json:"originAsn,omitempty"`
	AsName      string `json:"asName,omitempty"`
	AbuseEmail  string `json:"abuseEmail,omitempty"`
	Error       string `json:"error,omitempty"`
}
