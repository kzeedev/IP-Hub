export const translations = {
  en: {
    brand: 'IP-Hub',
    tagline: 'Country IP Lists & RIPE WHOIS Intelligence',
    subtitle: 'Free country IP address ranges supporting MikroTik, Cisco ACL, .htaccess, and real-time WHOIS lookup',

    // Nav
    nav: {
      singleLookup: 'Single Lookup',
      countryIps: 'Country IPs & Firewalls',
      batch: 'Batch Inspector',
      subnetCalc: 'CIDR Calculator',
      source: 'Source & About',
      issues: 'Issues & Bugs',
      architecture: 'Architecture & API',
      settings: 'Settings',
      myIp: 'My IP',
      detectingIp: 'Detecting IP...',
      themeLight: 'Light Mode',
      themeDark: 'Dark Mode',
    },

    // Search header
    search: {
      placeholder: 'Search IP, CIDR prefix, or ASN (e.g. 193.0.6.139, AS3333, 193.0.0.0/21)...',
      button: 'Inspect',
      historyTitle: 'Recent Lookups',
      clearHistory: 'Clear history',
      quickSamples: 'Quick Samples:',
      queryError: 'Query Error',
      retry: 'Retry',
      querying: 'Querying WHOIS & RDAP...',
      resolving: 'Resolving network details and geolocation...',
    },

    // Tabs
    tabs: {
      overview: 'Overview',
      objects: 'RIPE Objects',
      routing: 'Routing & BGP',
      abuse: 'Abuse Contact',
      location: 'Location & Map',
      subnet: 'Subnet Math',
      rawWhois: 'Raw WHOIS',
    },

    // Summary cards
    summary: {
      netname: 'Network Name',
      ipRange: 'Allocated Range',
      country: 'Country / Registry',
      originAsn: 'Origin Route ASN',
      status: 'Status / Type',
      abuseContact: 'Abuse Contact',
      cidr: 'CIDR Prefix',
      reverseDns: 'Reverse DNS',
      exploreCountry: 'Explore Country IPs',
      whoisLookup: 'WHOIS Lookup',
      unannounced: 'Unannounced',
      unrouted: 'Unrouted',
    },

    // Country IP Explorer & Firewall Formatter
    countryExplorer: {
      title: 'Country IP Allocations & Firewall Generator',
      description: 'Inspect, filter, and export full IPv4/IPv6 country IP ranges formatted for MikroTik, Cisco, .htaccess, and iptables.',
      selectCountry: 'Select Country',
      searchCountry: 'Search country or ISO code...',
      topRegions: 'Popular Regions:',
      ipv4Allocations: 'IPv4 Allocations',
      ipv6Allocations: 'IPv6 Allocations',
      originAsns: 'Origin ASNs',
      estCapacity: 'Est. IPv4 Capacity',
      prefixBlocks: 'CIDR Prefix Blocks',
      nextGenPrefixes: 'Next-Gen Routing Prefixes',
      asNetworks: 'Autonomous System Networks',
      totalRouted: 'Total routed host addresses',

      // Generator Panel
      firewallGenerator: 'Firewall & Format Generator',
      generatorDesc: 'Export country IP ranges into ready-to-use firewall configuration rules',
      formatLabel: 'Export Format',
      versionLabel: 'IP Version',
      accessLabel: 'Access Policy',
      listNameLabel: 'Address-List / ACL Name',

      formats: {
        mikrotik: 'MikroTik address-list',
        cisco: 'Cisco access-list',
        htaccess: 'Apache .htaccess',
        iptables: 'Linux iptables',
        json: 'JSON Data',
        csv: 'CSV Spreadsheet',
        txt: 'Plain CIDR (TXT)',
      },

      versions: {
        any: 'Both (IPv4 & IPv6)',
        ipv4: 'IPv4 Only',
        ipv6: 'IPv6 Only',
      },

      access: {
        allow: 'Allow / Permit',
        deny: 'Deny / Block',
      },

      copyScript: 'Copy Configuration',
      copied: 'Copied to Clipboard!',
      downloadScript: 'Download File',
      previewRules: 'Configuration Preview',
      rulesGenerated: 'rules generated',

      // Table
      tableTitle: 'Delegated Prefixes & Networks',
      filterPlaceholder: 'Filter prefixes (e.g. 193.0 or /24 or ISP name)...',
      allCidrs: 'All CIDRs',
      colIndex: '#',
      colResource: 'IP Prefix / Range',
      colOrg: 'ISP / Organization',
      colPrefixLen: 'Prefix Length',
      colCapacity: 'Estimated Capacity',
      colCountry: 'Country',
      colActions: 'Actions',
      resolving: 'Resolving ISP...',
      unknownOrg: 'Unannounced / Local',
      addresses: 'addresses',
      openWhois: 'WHOIS',
      copyAll: 'Copy All',
      downloadTxt: 'TXT',
      downloadCsv: 'CSV',
      downloadJson: 'JSON',
      noPrefixesFound: 'No IP prefixes found matching your filter.',
    },

    // Batch Inspector
    batch: {
      title: 'Batch IP & Prefix Inspector',
      description: 'Inspect up to 50 IP addresses, CIDR blocks, or ASNs simultaneously.',
      inputPlaceholder: 'Enter IP addresses or prefixes (one per line, comma, or space separated)...',
      analyzeButton: 'Inspect Batch',
      analyzing: 'Analyzing Batch...',
      sampleButton: 'Load Sample Batch',
      clearButton: 'Clear',
      resultsTitle: 'Batch Inspection Results',
      exportCsv: 'Export CSV',
      exportJson: 'Export JSON',
      colTarget: 'Target',
      colNetname: 'Netname',
      colCidr: 'CIDR',
      colCountry: 'Country',
      colOrigin: 'Origin ASN',
      colOrg: 'Organization',
      colStatus: 'Status',
    },

    // Subnet Calculator
    subnetCalc: {
      title: 'CIDR & Subnet Calculator',
      description: 'Calculate IP ranges, netmasks, broadcast addresses, and binary breakdown.',
      ipLabel: 'IP Address / CIDR',
      cidrLabel: 'Subnet Mask / Prefix Length',
      calculate: 'Calculate',
      networkAddr: 'Network Address',
      broadcastAddr: 'Broadcast Address',
      netmask: 'Subnet Mask',
      wildcard: 'Wildcard Mask',
      usableRange: 'Usable Host Range',
      totalHosts: 'Total IP Addresses',
      usableHosts: 'Usable Hosts',
      binaryMask: 'Binary Subnet Mask',
      cidrTableTitle: 'IPv4 CIDR Prefix Reference Table',
      prefix: 'Prefix',
      subnets: 'Subnets',
      hosts: 'Hosts',
    },

    // Source & Issues
    sourcePage: {
      title: 'Source & Open Source Community',
      badge: 'Open Source Project',
      intro: 'IP-Hub is a free and open-source network intelligence service providing updated country-specific IP address lists in various formats alongside RIPE WHOIS data.',
      projectPage: 'Project Homepage',
      githubRepo: 'GitHub Repository',
      featuresTitle: 'Key Architecture & Capabilities',
      feature1: 'Comprehensive IPv4 and IPv6 Country IP delegations fetched directly from RIPE NCC and RIR databases.',
      feature2: 'Instant export for MikroTik RouterOS, Cisco IOS ACLs, Apache .htaccess, Linux iptables, and JSON.',
      feature3: 'Low-latency Redis caching and high-concurrency Go Fiber backend.',
      feature4: 'Real-time BGP routing, ASN announcements, and abuse contact discovery.',
      communityTitle: 'Join the Community',
      communityText: 'IP-Hub is completely open source under the MIT License. Contributions, feedback, and pull requests are welcomed.',
    },

    issuesPage: {
      title: 'Report Issues & Contribute',
      badge: 'GitHub Issues',
      intro: 'If you encounter any bugs, formatting discrepancies, or have feature suggestions, please let us know on our GitHub repository.',
      submitIssue: 'Submit an Issue',
      createPr: 'Create a Pull Request',
      guidelinesTitle: 'Contribution Guidelines',
      guide1: 'Search existing issues before creating a new ticket.',
      guide2: 'Include sample IP addresses, country codes, or screenshots when reporting bugs.',
      guide3: 'Pull requests for new firewall formatters, plugin enhancements, and translations are always appreciated.',
    },

    // Settings
    settingsModal: {
      title: 'Settings & Application Info',
      version: 'Application Version',
      status: 'Backend Status',
      connected: 'Go Fiber Backend Online',
      language: 'Language / زبان',
      theme: 'Theme Preference',
      close: 'Close',
    },

    // SEO Section
    seo: {
      heading: 'About IP-Hub Network Intelligence & GeoIP Tools',
      section1Title: 'Country IP Lists for Firewalls & Routers',
      section1Text: 'IP-Hub aggregates authoritative country IP address allocations directly from RIPE NCC, ARIN, APNIC, AFRINIC, and LACNIC. It provides instant firewall rule generators for MikroTik address-lists (/ip firewall address-list), Cisco Access Control Lists (ACLs), Linux iptables/nftables, and Apache .htaccess geo-blocking.',
      section2Title: 'RIPE WHOIS & ASN BGP Routing Analysis',
      section2Text: 'Perform real-time WHOIS queries to inspect network ownership, netnames, inetnum/inet6num objects, origin ASNs, BGP routing visibility, abuse contacts, and reverse DNS records with high accuracy.',
      section3Title: 'Why Geo-blocking & Country IP Management Matters',
      section3Text: 'Network administrators and security engineers use country IP lists to protect critical infrastructure, enforce geographic access policies, reduce DDoS attack surfaces, and optimize traffic routing.',
      keywordsTitle: 'Related Network & GeoIP Topics:',
    },

    // Common
    common: {
      copy: 'Copy',
      copied: 'Copied!',
      download: 'Download',
      loading: 'Loading...',
      error: 'An error occurred',
      back: 'Back',
      all: 'All',
      unknown: 'Unknown',
    }
  },

  fa: {
    brand: 'آی‌پی هاب',
    tagline: 'لیست IP کشورها و سامانه هویز RIPE',
    subtitle: 'سرویس رایگان دریافت رنج‌های IP کشورها با خروجی‌های میکروتیک، سیسکو، htaccess و استعلام زنده RIPE WHOIS',

    // Nav
    nav: {
      singleLookup: 'استعلام تک IP / ASN',
      countryIps: 'IP کشورها و فایروال',
      batch: 'بررسی گروهی IP',
      subnetCalc: 'محاسبه‌گر ساب‌نت (CIDR)',
      source: 'سورس و درباره پروژه',
      issues: 'گزارش باگ و گیت‌هاب',
      architecture: 'معماری و مستندات',
      settings: 'تنظیمات',
      myIp: 'IP من',
      detectingIp: 'تشخیص IP...',
      themeLight: 'حالت روشن',
      themeDark: 'حالت تاریک',
    },

    // Search header
    search: {
      placeholder: 'جستجوی IP، رنج CIDR یا شماره ASN (مثال: 193.0.6.139 یا AS3333)...',
      button: 'جستجو و استعلام',
      historyTitle: 'جستجوهای اخیر',
      clearHistory: 'پاک‌کردن تاریخچه',
      quickSamples: 'نمونه‌های آماده:',
      queryError: 'خطا در جستجو',
      retry: 'تلاش مجدد',
      querying: 'در حال استعلام از WHOIS و RDAP...',
      resolving: 'در حال دریافت مشخصات شبکه و موقعیت مکانی...',
    },

    // Tabs
    tabs: {
      overview: 'نمای کلی',
      objects: 'آبجکت‌های RIPE',
      routing: 'مسیریابی و BGP',
      abuse: 'گزارش تخلف (Abuse)',
      location: 'موقعیت و نقشه',
      subnet: 'محاسبات ساب‌نت',
      rawWhois: 'متن خام WHOIS',
    },

    // Summary cards
    summary: {
      netname: 'نام شبکه (Netname)',
      ipRange: 'بازه تخصیص‌یافته',
      country: 'کشور / رجیستری',
      originAsn: 'شماره ASN مبدا',
      status: 'وضعیت / نوع تخصیص',
      abuseContact: 'ایمیل گزارش تخلف',
      cidr: 'پیشوند CIDR',
      reverseDns: 'Reverse DNS',
      exploreCountry: 'مشاهده تمام IPهای کشور',
      whoisLookup: 'استعلام WHOIS',
      unannounced: 'اعلام‌نشده',
      unrouted: 'بدون روت',
    },

    // Country IP Explorer & Firewall Formatter
    countryExplorer: {
      title: 'لیست رنج IP کشورها و سازنده قوانین فایروال',
      description: 'مشاهده، فیلتر و خروجی تمام رنج‌های IPv4 و IPv6 کشورها برای میکروتیک، سیسکو، .htaccess و iptables.',
      selectCountry: 'انتخاب کشور',
      searchCountry: 'جستجوی نام یا کد کشور (مثال: IR, NL, US)...',
      topRegions: 'کشورهای پرکاربرد:',
      ipv4Allocations: 'رنج‌های IPv4',
      ipv6Allocations: 'رنج‌های IPv6',
      originAsns: 'شبکه‌های خودمختار (ASN)',
      estCapacity: 'تعداد کل IPهای IPv4',
      prefixBlocks: 'بلاک‌های پیشوند CIDR',
      nextGenPrefixes: 'پیشوندهای نسل جدید IPv6',
      asNetworks: 'شماره‌های AS ثبت‌شده',
      totalRouted: 'تعداد کل آدرس‌های فعال',

      // Generator Panel
      firewallGenerator: 'تولیدکننده قوانین فایروال و رول‌ها',
      generatorDesc: 'تبدیل خودکار رنج‌های IP کشور انتخاب‌شده به رول‌های آماده میکروتیک، سیسکو و سرور',
      formatLabel: 'فرمت خروجی',
      versionLabel: 'نسخه پروتکل IP',
      accessLabel: 'سیاست دسترسی (Action)',
      listNameLabel: 'نام Address-List یا ACL',

      formats: {
        mikrotik: 'میکروتیک (MikroTik address-list)',
        cisco: 'سیسکو (Cisco access-list)',
        htaccess: 'آپاچی (.htaccess)',
        iptables: 'لینوکس (iptables)',
        json: 'ساختار JSON',
        csv: 'جدول اکسل (CSV)',
        txt: 'لیست خطی CIDR (TXT)',
      },

      versions: {
        any: 'هر دو (IPv4 و IPv6)',
        ipv4: 'فقط IPv4',
        ipv6: 'فقط IPv6',
      },

      access: {
        allow: 'مجاز (Allow / Permit)',
        deny: 'مسدود (Deny / Block / Drop)',
      },

      copyScript: 'کپی اسکریپت کانفیگ',
      copied: 'در کلیپ‌بورد کپی شد!',
      downloadScript: 'دانلود فایل کانفیگ',
      previewRules: 'پیش‌نمایش قوانین تولیدشده',
      rulesGenerated: 'قانون تولید شد',

      // Table
      tableTitle: 'پیشوندها و رنج‌های تخصیص‌یافته',
      filterPlaceholder: 'فیلتر رنج‌ها (مثال: 193.0 یا /24 یا نام ارائه‌دهنده)...',
      allCidrs: 'تمام ساب‌نت‌ها',
      colIndex: 'ردیف',
      colResource: 'پیشوند IP / رنج',
      colOrg: 'ارائه‌دهنده / سازمان (ISP)',
      colPrefixLen: 'طول پیشوند',
      colCapacity: 'تعداد تخمینی IP',
      colCountry: 'کشور',
      colActions: 'عملیات',
      resolving: 'درحال بررسی ISP...',
      unknownOrg: 'محلی / نامشخص',
      addresses: 'آدرس IP',
      openWhois: 'استعلام هویز',
      copyAll: 'کپی همه',
      downloadTxt: 'TXT',
      downloadCsv: 'CSV',
      downloadJson: 'JSON',
      noPrefixesFound: 'هیچ رنجی مطابق با فیلتر شما پیدا نشد.',
    },

    // Batch Inspector
    batch: {
      title: 'بررسی دسته‌جمعی IP و رنج‌ها',
      description: 'استعلام همزمان تا ۵۰ آدرس IP، بلاک CIDR یا شماره ASN.',
      inputPlaceholder: 'آدرس‌های IP یا پیشوندها را وارد کنید (هر کدام در یک خط یا با فاصله/کاما)...',
      analyzeButton: 'بررسی گروهی',
      analyzing: 'درحال پردازش...',
      sampleButton: 'بارگذاری نمونه',
      clearButton: 'پاک‌کردن',
      resultsTitle: 'نتایج بررسی دسته‌جمعی',
      exportCsv: 'خروجی CSV',
      exportJson: 'خروجی JSON',
      colTarget: 'مقصد',
      colNetname: 'نام شبکه',
      colCidr: 'CIDR',
      colCountry: 'کشور',
      colOrigin: 'ASN مبدا',
      colOrg: 'سازمان',
      colStatus: 'وضعیت',
    },

    // Subnet Calculator
    subnetCalc: {
      title: 'محاسبه‌گر ساب‌نت و CIDR',
      description: 'محاسبه رنج‌های IP، نت‌ماسک، آدرس شبکه، برودکست و تفکیک باینری.',
      ipLabel: 'آدرس IP / رنج CIDR',
      cidrLabel: 'طول پیشوند (Prefix / CIDR)',
      calculate: 'محاسبه',
      networkAddr: 'آدرس شبکه (Network)',
      broadcastAddr: 'آدرس برودکست (Broadcast)',
      netmask: 'ساب‌نت ماسک (Netmask)',
      wildcard: 'وایلدکارت ماسک (Wildcard)',
      usableRange: 'بازه IPهای قابل استفاده',
      totalHosts: 'تعداد کل آدرس‌ها',
      usableHosts: 'تعداد هاست‌های قابل استفاده',
      binaryMask: 'ساب‌نت ماسک به باینری',
      cidrTableTitle: 'جدول مرجع پیشوندهای IPv4 CIDR',
      prefix: 'پیشوند',
      subnets: 'ساب‌نت‌ها',
      hosts: 'هاست‌ها',
    },

    // Source & Issues
    sourcePage: {
      title: 'سورس کد و جامعه متن‌باز',
      badge: 'پروژه متن‌باز (Open Source)',
      intro: 'پروژه IP-Hub یک سرویس کاملاً رایگان و اوپن‌سورس جهت استعلام رنج‌های IP کشورها و اطلاعات شبکه است.',
      projectPage: 'صفحه اصلی پروژه',
      githubRepo: 'مخزن رسمی در گیت‌هاب',
      featuresTitle: 'ویژگی‌ها و معماری سیستم',
      feature1: 'دریافت مستقیم بازه‌های IP اختصاص‌یافته از RIPE NCC و سایر رجیستری‌های قاره‌ای.',
      feature2: 'تولید آنی خروجی برای میکروتیک (RouterOS Address List)، سیسکو ACL، آپاچی htaccess و لینوکس iptables.',
      feature3: 'بک‌ند بسیار سریع با زبان Go و فریم‌ورک Fiber به همراه کش قدرتمند Redis.',
      feature4: 'استعلام زنده مسیرهای BGP، پیشوندهای اعلام‌شده و اطلاعات تماس جهت گزارش Abuse.',
      communityTitle: 'پیوستن به جامعه توسعه‌دهندگان',
      communityText: 'این پروژه تحت مجوز MIT منتشر شده و مشارکت شما در بهبود کدها و اضافه کردن قابلیت‌های جدید مایه افتخار است.',
    },

    issuesPage: {
      title: 'گزارش باگ و مشارکت در توسعه',
      badge: 'ایشوهای گیت‌هاب',
      intro: 'اگر باگی مشاهده کردید یا پیشنهاد و قابلیت جدیدی مدنظرتان است، می‌توانید از طریق گیت‌هاب ثبت کنید.',
      submitIssue: 'ثبت ایشو جدید در گیت‌هاب',
      createPr: 'ایجاد پول ریکوئست (PR)',
      guidelinesTitle: 'راهنمای مشارکت',
      guide1: 'قبل از ایجاد ایشو، موارد قبلی را بررسی کنید تا تکراری نباشد.',
      guide2: 'در صورت گزارش باگ، آدرس IP نمونه یا کشور مربوطه را ذکر نمایید.',
      guide3: 'پول‌ریکوئست‌های ارائه‌دهنده فرمت‌های جدید فایروال و ترجمه‌ها با استقبال ادغام می‌شوند.',
    },

    // Settings
    settingsModal: {
      title: 'تنظیمات و اطلاعات سیستم',
      version: 'نسخه برنامه',
      status: 'وضعیت بک‌ند',
      connected: 'بک‌ند Go Fiber فعال است',
      language: 'زبان سامانه / Language',
      theme: 'پوسته ظاهری',
      close: 'بستن',
    },

    // SEO Section
    seo: {
      heading: 'درباره ابزارهای شبکه و لیست IP کشورهای IP-Hub',
      section1Title: 'لیست IP کشورها برای فایروال و روترها',
      section1Text: 'سرویس IP-Hub اطلاعات دقیق و به‌روز رنج‌های آی‌پی کشورهای جهان را مستقیماً از RIPE NCC و سایر RIRها دریافت کرده و برای فایروال‌های میکروتیک (MikroTik address-list)، سیسکو (Cisco ACL)، آپاچی (.htaccess) و لینوکس (iptables) به فرمت آماده تبدیل می‌کند.',
      section2Title: 'هویز RIPE و تحلیل مسیریابی BGP و ASN',
      section2Text: 'استعلام بلادرنگ وضعیت مالکیت آی‌پی، نام شبکه (Netname)، آبجکت‌های inetnum و inet6num، شماره‌های خودمختار (ASN)، رصد دیداری BGP و ایمیل‌های تماس Abuse با بالاترین دقت.',
      section3Title: 'کاربردهای مسدودسازی یا مجاز کردن ترافیک کشورها (Geo-Blocking)',
      section3Text: 'مدیران شبکه و متخصصان امنیت با استفاده از لیست IP کشورها می‌توانند سیاست‌های دسترسی جغرافیایی را روی روترها اعمال کنند، حملات DDoS را محدود سازند و امنیت سرورها را افزایش دهند.',
      keywordsTitle: 'کلمات کلیدی و مباحث مرتبط با شبکه:',
    },

    // Common
    common: {
      copy: 'کپی',
      copied: 'کپی شد!',
      download: 'دانلود',
      loading: 'درحال بارگذاری...',
      error: 'خطایی رخ داد',
      back: 'بازگشت',
      all: 'همه',
      unknown: 'نامشخص',
    }
  }
};
