// Company name extraction functions
function extractCompanyName() {
  return (
    extractFromStructuredData() || 
    extractFromCommonPatterns() || 
    extractFromTitle() || 
    extractFromURL() ||
    null
  );
}

function extractFromStructuredData() {
  const jsonLdElements = document.querySelectorAll('script[type="application/ld+json"]');
  for (const element of jsonLdElements) {
    try {
      const data = JSON.parse(element.textContent);
      
      if (data["@type"] === "JobPosting" && data.hiringOrganization) {
        return data.hiringOrganization.name || 
               (data.hiringOrganization.identifier ? data.hiringOrganization.identifier.name : null);
      }
      
      if (data["@type"] === "Organization" && data.name) {
        return data.name;
      }
      
      if (Array.isArray(data) && data.length > 0) {
        for (const item of data) {
          if (item["@type"] === "Organization" && item.name) {
            return item.name;
          }
          if (item["@type"] === "JobPosting" && item.hiringOrganization && item.hiringOrganization.name) {
            return item.hiringOrganization.name;
          }
        }
      }
    } catch (e) {
      continue;
    }
  }
  
  const itemOrg = document.querySelector('[itemtype*="Organization"]');
  if (itemOrg) {
    const nameElement = itemOrg.querySelector('[itemprop="name"]');
    if (nameElement) return nameElement.textContent.trim();
  }
  
  return null;
}

function extractFromCommonPatterns() {
  const selectors = [
    '[class*="company"]:not(a)', '[class*="employer"]', '[class*="organization"]',
    '[id*="company"]:not(input)', '[id*="employer"]', '[id*="organization"]',
    '[data-company]', '[data-employer]', '[data-organization]',
    'meta[property="og:site_name"]',
    'meta[name="author"]',
    'meta[name="publisher"]',
    '.job-company', '.company-name', '.employer-name', '.organization-name',
    '.posting-company', '.job-employer', '.job-details-company',
    'header [class*="logo-text"]', 'header .brand', 'footer .copyright',
    'form [name*="company"]', 'form [id*="company"]',
    '.jobs-unified-top-card__company-name', '.jobs-company__name',
    '.jobsearch-InlineCompanyRating > div:first-child',
    '.company', '.employer', '.organization'
  ];
  
  for (const selector of selectors) {
    try {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        if (element.tagName === 'META') {
          const content = element.getAttribute('content');
          if (content && isLikelyCompanyName(content)) return content;
          continue;
        }
        
        const text = element.textContent.trim();
        if (text && isLikelyCompanyName(text)) {
          return cleanCompanyName(text);
        }
      }
    } catch (e) {
      continue;
    }
  }
  
  return null;
}

function extractFromTitle() {
  const title = document.title;
  
  const patterns = [
    /(?:.*)\s+at\s+([^|:]+)(?:\s*[-|:].*)?$/i,
    /^([^:]+):\s+(?:.*)/i,
    /^([^-]+)\s+-\s+(?:.*)/i,
    /^([^|]+)\s+\|\s+(?:.*)/i,
    /^(.+?)\s+(?:Careers|Jobs|Job Openings|Careers Portal|Job Board)$/i
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match && match[1]) {
      const company = match[1].trim();
      if (company && isLikelyCompanyName(company)) {
        return cleanCompanyName(company);
      }
    }
  }
  
  return null;
}

function extractFromURL() {
  let hostname = window.location.hostname
    .replace(/^www\./i, '')
    .replace(/\.(com|org|net|io|gov|edu|co|jobs)$/i, '');
  
  const hostnameParts = hostname.split('.');
  
  if (hostnameParts.length > 1 && ['careers', 'jobs', 'job', 'work', 'apply'].includes(hostnameParts[0])) {
    return capitalizeWords(hostnameParts[1]);
  }
  
  const jobBoards = ['linkedin', 'indeed', 'glassdoor', 'monster', 'ziprecruiter', 'dice', 'careerbuilder'];
  if (jobBoards.some(board => hostname.includes(board))) {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    
    for (const part of pathParts) {
      if (['jobs', 'careers', 'job', 'position', 'listing', 'apply', 'posting'].includes(part)) continue;
      
      if (part.includes('-') || part.includes('_')) {
        return capitalizeWords(part.replace(/[-_]/g, ' '));
      }
    }
    return null;
  }
  
  return capitalizeWords(hostnameParts[0]);
}

function isLikelyCompanyName(text) {
  if (!text || text.length < 2 || text.length > 50) return false;
  
  const skipWords = ['menu', 'navigation', 'submit', 'apply', 'next', 'previous', 'search'];
  if (skipWords.some(word => text.toLowerCase().includes(word))) return false;
  
  return true;
}

function cleanCompanyName(text) {
  return text
    .replace(/^at\s+/i, '')
    .replace(/^apply\s+to\s+/i, '')
    .replace(/^join\s+/i, '')
    .replace(/^work\s+at\s+/i, '')
    .replace(/^career(s)?\s+at\s+/i, '')
    .replace(/^job(s)?\s+at\s+/i, '')
    .replace(/\s+careers$/i, '')
    .replace(/\s+jobs$/i, '')
    .replace(/\s+job\s+posting$/i, '')
    .trim();
}

function capitalizeWords(text) {
  return text.replace(/\b\w/g, l => l.toUpperCase());
}

// Company name and job title extraction functions
function extractJobInfo() {
  return {
    companyName: extractCompanyName(),
    jobTitle: extractJobTitle()
  };
}

function extractJobTitle() {
  return (
    extractJobTitleFromStructuredData() ||
    extractJobTitleFromCommonPatterns() ||
    extractJobTitleFromTitle() ||
    null
  );
}

function extractJobTitleFromStructuredData() {
  const jsonLdElements = document.querySelectorAll('script[type="application/ld+json"]');
  for (const element of jsonLdElements) {
    try {
      const data = JSON.parse(element.textContent);
      
      if (data["@type"] === "JobPosting" && data.title) {
        return data.title;
      }
      
      if (Array.isArray(data) && data.length > 0) {
        for (const item of data) {
          if (item["@type"] === "JobPosting" && item.title) {
            return item.title;
          }
        }
      }
    } catch (e) {
      continue;
    }
  }
  
  const itemJob = document.querySelector('[itemtype*="JobPosting"]');
  if (itemJob) {
    const titleElement = itemJob.querySelector('[itemprop="title"]');
    if (titleElement) return titleElement.textContent.trim();
  }
  
  return null;
}

function extractJobTitleFromCommonPatterns() {
  const selectors = [
    '[class*="job-title"]', '[class*="position-title"]',
    '[id*="job-title"]', '[id*="position-title"]',
    '[data-job-title]', '[data-position-title]',
    '.job-title', '.position-title',
    '.posting-title', '.job-details-title',
    '.jobs-unified-top-card__job-title',
    '.jobsearch-JobInfoHeader-title'
  ];
  
  for (const selector of selectors) {
    try {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const text = element.textContent.trim();
        if (text && isLikelyJobTitle(text)) {
          return cleanJobTitle(text);
        }
      }
    } catch (e) {
      continue;
    }
  }
  
  return null;
}

function extractJobTitleFromTitle() {
  const title = document.title;
  
  const patterns = [
    /^([^-|:]+)(?:\s*[-|:].*)?$/i,
    /^.*\s+at\s+[^-|:]+(?:\s*[-|:].*)?$/i
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match && match[1]) {
      const jobTitle = match[1].trim();
      if (jobTitle && isLikelyJobTitle(jobTitle)) {
        return cleanJobTitle(jobTitle);
      }
    }
  }
  
  return null;
}

function isLikelyJobTitle(text) {
  if (!text || text.length < 2 || text.length > 100) return false;
  
  const skipWords = ['menu', 'navigation', 'submit', 'apply', 'next', 'previous', 'search'];
  if (skipWords.some(word => text.toLowerCase().includes(word))) return false;
  
  return true;
}

function cleanJobTitle(text) {
  return text
    .replace(/^job\s+title\s*:/i, '')
    .replace(/^position\s*:/i, '')
    .replace(/^title\s*:/i, '')
    .replace(/\s*\(.*?\)/g, '')
    .trim();
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "extractJobInfo") {
    const jobInfo = extractJobInfo();
    sendResponse(jobInfo);
  }
  return true;
}); 