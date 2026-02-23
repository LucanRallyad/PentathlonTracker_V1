import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const MOBILE_VIEWPORT = {
  width: 375,
  height: 812,
};

const ADMIN_CREDENTIALS = {
  email: 'admin@pentathlon.ca',
  password: 'admin123',
};

const PAGES_TO_TEST = [
  { name: 'Dashboard', url: '/admin' },
  { name: 'Athletes', url: '/athletes' },
  { name: 'Rankings', url: '/rankings' },
  { name: 'Comparison', url: '/comparison' },
  { name: 'Profile', url: '/profile' },
];

interface MobileIssue {
  page: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  element?: string;
  details?: any;
}

const issues: MobileIssue[] = [];

function addIssue(issue: MobileIssue) {
  issues.push(issue);
  console.log(`[${issue.severity.toUpperCase()}] ${issue.page} - ${issue.category}: ${issue.description}`);
}

async function checkTextSize(page: Page, pageName: string) {
  const smallText = await page.evaluate(() => {
    const elements = document.querySelectorAll('*');
    const smallElements: Array<{ tag: string; text: string; fontSize: string; selector: string }> = [];
    
    elements.forEach((el) => {
      const style = window.getComputedStyle(el);
      const fontSize = parseFloat(style.fontSize);
      const text = el.textContent?.trim() || '';
      
      if (fontSize < 14 && text.length > 0 && text.length < 200) {
        const selector = el.tagName.toLowerCase() + 
          (el.id ? `#${el.id}` : '') + 
          (el.className ? `.${Array.from(el.classList).join('.')}` : '');
        smallElements.push({
          tag: el.tagName,
          text: text.substring(0, 50),
          fontSize: style.fontSize,
          selector,
        });
      }
    });
    
    return smallElements;
  });

  smallText.forEach((item) => {
    addIssue({
      page: pageName,
      category: 'Text Size',
      severity: 'medium',
      description: `Text is too small (${item.fontSize}) - should be at least 14px`,
      element: item.selector,
      details: { text: item.text },
    });
  });
}

async function checkHorizontalOverflow(page: Page, pageName: string) {
  const overflow = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const elements = document.querySelectorAll('*');
    const overflowingElements: Array<{ selector: string; width: number; overflow: number }> = [];
    
    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.right > viewportWidth) {
        const selector = el.tagName.toLowerCase() + 
          (el.id ? `#${el.id}` : '') + 
          (el.className ? `.${Array.from(el.classList).join('.')}` : '');
        overflowingElements.push({
          selector,
          width: rect.width,
          overflow: rect.right - viewportWidth,
        });
      }
    });
    
    return overflowingElements;
  });

  overflow.forEach((item) => {
    addIssue({
      page: pageName,
      category: 'Horizontal Overflow',
      severity: 'high',
      description: `Element overflows viewport by ${Math.round(item.overflow)}px`,
      element: item.selector,
      details: { elementWidth: item.width, viewportWidth: MOBILE_VIEWPORT.width },
    });
  });
}

async function checkTapTargetSize(page: Page, pageName: string) {
  const smallTargets = await page.evaluate(() => {
    const MIN_TAP_SIZE = 44;
    const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [onclick]');
    const smallElements: Array<{ selector: string; width: number; height: number }> = [];
    
    interactiveElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if ((rect.width < MIN_TAP_SIZE || rect.height < MIN_TAP_SIZE) && rect.width > 0 && rect.height > 0) {
        const selector = el.tagName.toLowerCase() + 
          (el.id ? `#${el.id}` : '') + 
          (el.className ? `.${Array.from(el.classList).join('.')}` : '');
        smallElements.push({
          selector,
          width: rect.width,
          height: rect.height,
        });
      }
    });
    
    return smallElements;
  });

  smallTargets.forEach((item) => {
    addIssue({
      page: pageName,
      category: 'Tap Target Size',
      severity: 'high',
      description: `Interactive element too small (${Math.round(item.width)}x${Math.round(item.height)}px) - should be at least 44x44px`,
      element: item.selector,
    });
  });
}

async function checkTableResponsiveness(page: Page, pageName: string) {
  const tableIssues = await page.evaluate(() => {
    const tables = document.querySelectorAll('table');
    const issues: Array<{ selector: string; width: number; columns: number }> = [];
    
    tables.forEach((table) => {
      const rect = table.getBoundingClientRect();
      const columns = table.querySelectorAll('th, td').length / (table.querySelectorAll('tr').length || 1);
      const selector = 'table' + 
        (table.id ? `#${table.id}` : '') + 
        (table.className ? `.${Array.from(table.classList).join('.')}` : '');
      
      if (rect.width > window.innerWidth) {
        issues.push({
          selector,
          width: rect.width,
          columns: Math.round(columns),
        });
      }
    });
    
    return issues;
  });

  tableIssues.forEach((item) => {
    addIssue({
      page: pageName,
      category: 'Table Responsiveness',
      severity: 'high',
      description: `Table is ${Math.round(item.width)}px wide (viewport is ${MOBILE_VIEWPORT.width}px) with ${item.columns} columns - needs horizontal scroll or responsive design`,
      element: item.selector,
    });
  });
}

async function checkNavigationSidebar(page: Page, pageName: string) {
  const sidebarIssue = await page.evaluate(() => {
    const sidebar = document.querySelector('nav, aside, [role="navigation"]');
    if (!sidebar) return null;
    
    const rect = sidebar.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const style = window.getComputedStyle(sidebar);
    
    const selector = sidebar.tagName.toLowerCase() + 
      (sidebar.id ? `#${sidebar.id}` : '') + 
      (sidebar.className ? `.${Array.from(sidebar.classList).join('.')}` : '');
    
    if (rect.width > viewportWidth * 0.5 && style.position !== 'fixed') {
      return {
        selector,
        width: rect.width,
        position: style.position,
      };
    }
    
    return null;
  });

  if (sidebarIssue) {
    addIssue({
      page: pageName,
      category: 'Navigation',
      severity: 'medium',
      description: `Navigation sidebar is ${Math.round(sidebarIssue.width)}px wide (${Math.round((sidebarIssue.width / MOBILE_VIEWPORT.width) * 100)}% of viewport) - should be collapsible on mobile`,
      element: sidebarIssue.selector,
    });
  }
}

async function checkContentVisibility(page: Page, pageName: string) {
  const hiddenContent = await page.evaluate(() => {
    const elements = document.querySelectorAll('*');
    const hidden: Array<{ selector: string; reason: string }> = [];
    
    elements.forEach((el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const text = el.textContent?.trim() || '';
      
      if (text.length > 20 && (style.overflow === 'hidden' || style.textOverflow === 'ellipsis') && rect.height < 100) {
        const selector = el.tagName.toLowerCase() + 
          (el.id ? `#${el.id}` : '') + 
          (el.className ? `.${Array.from(el.classList).join('.')}` : '');
        hidden.push({
          selector,
          reason: 'Content may be cut off due to overflow:hidden or text-overflow:ellipsis',
        });
      }
    });
    
    return hidden;
  });

  hiddenContent.forEach((item) => {
    addIssue({
      page: pageName,
      category: 'Content Visibility',
      severity: 'low',
      description: item.reason,
      element: item.selector,
    });
  });
}

async function checkSpacing(page: Page, pageName: string) {
  const spacingIssues = await page.evaluate(() => {
    const elements = document.querySelectorAll('button, a, input, .card, [class*="card"]');
    const issues: Array<{ selector: string; padding: string; margin: string }> = [];
    
    elements.forEach((el) => {
      const style = window.getComputedStyle(el);
      const paddingTop = parseFloat(style.paddingTop);
      const paddingBottom = parseFloat(style.paddingBottom);
      const marginTop = parseFloat(style.marginTop);
      const marginBottom = parseFloat(style.marginBottom);
      
      if ((paddingTop + paddingBottom < 8) || (marginTop + marginBottom < 4)) {
        const selector = el.tagName.toLowerCase() + 
          (el.id ? `#${el.id}` : '') + 
          (el.className ? `.${Array.from(el.classList).join('.')}` : '');
        issues.push({
          selector,
          padding: `${paddingTop}px/${paddingBottom}px`,
          margin: `${marginTop}px/${marginBottom}px`,
        });
      }
    });
    
    return issues;
  });

  spacingIssues.forEach((item) => {
    addIssue({
      page: pageName,
      category: 'Spacing',
      severity: 'low',
      description: `Element has insufficient spacing (padding: ${item.padding}, margin: ${item.margin})`,
      element: item.selector,
    });
  });
}

async function checkCharts(page: Page, pageName: string) {
  const chartIssues = await page.evaluate(() => {
    const charts = document.querySelectorAll('svg, canvas, [class*="chart"], [class*="graph"]');
    const issues: Array<{ selector: string; width: number; height: number }> = [];
    
    charts.forEach((chart) => {
      const rect = chart.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      
      if (rect.width > viewportWidth) {
        const selector = chart.tagName.toLowerCase() + 
          (chart.id ? `#${chart.id}` : '') + 
          (chart.className ? `.${Array.from(chart.classList).join('.')}` : '');
        issues.push({
          selector,
          width: rect.width,
          height: rect.height,
        });
      }
    });
    
    return issues;
  });

  chartIssues.forEach((item) => {
    addIssue({
      page: pageName,
      category: 'Charts/Graphs',
      severity: 'high',
      description: `Chart/graph is ${Math.round(item.width)}px wide (viewport is ${MOBILE_VIEWPORT.width}px) - overflows viewport`,
      element: item.selector,
    });
  });
}

test.describe('Mobile Compatibility Tests', () => {
  test.use({
    viewport: MOBILE_VIEWPORT,
  });

  test.beforeAll(async () => {
    const screenshotsDir = path.join(__dirname, '../test-results/mobile-screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test('Login and test all pages for mobile compatibility', async ({ page }) => {
    console.log('Starting mobile compatibility test...');
    console.log(`Viewport: ${MOBILE_VIEWPORT.width}x${MOBILE_VIEWPORT.height}`);

    console.log('\n=== LOGGING IN ===');
    await page.goto('http://localhost:3000/login/admin');
    await page.screenshot({ path: 'test-results/mobile-screenshots/00-login-page.png', fullPage: true });

    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/admin/, { timeout: 10000 });
    console.log('Login successful!');

    for (const pageInfo of PAGES_TO_TEST) {
      console.log(`\n=== TESTING ${pageInfo.name.toUpperCase()} PAGE ===`);
      
      await page.goto(`http://localhost:3000${pageInfo.url}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      
      const screenshotPath = `test-results/mobile-screenshots/${pageInfo.name.toLowerCase()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Screenshot saved: ${screenshotPath}`);

      await checkTextSize(page, pageInfo.name);
      await checkHorizontalOverflow(page, pageInfo.name);
      await checkTapTargetSize(page, pageInfo.name);
      await checkTableResponsiveness(page, pageInfo.name);
      await checkNavigationSidebar(page, pageInfo.name);
      await checkContentVisibility(page, pageInfo.name);
      await checkSpacing(page, pageInfo.name);
      await checkCharts(page, pageInfo.name);
    }

    console.log('\n=== GENERATING REPORT ===');
    generateReport();
  });
});

function generateReport() {
  const reportPath = path.join(__dirname, '../test-results/mobile-compatibility-report.md');
  
  let report = `# Mobile Compatibility Test Report\n\n`;
  report += `**Test Date:** ${new Date().toLocaleString()}\n`;
  report += `**Viewport:** ${MOBILE_VIEWPORT.width}x${MOBILE_VIEWPORT.height} (iPhone 13)\n`;
  report += `**Total Issues Found:** ${issues.length}\n\n`;

  const issuesBySeverity = {
    critical: issues.filter(i => i.severity === 'critical'),
    high: issues.filter(i => i.severity === 'high'),
    medium: issues.filter(i => i.severity === 'medium'),
    low: issues.filter(i => i.severity === 'low'),
  };

  report += `## Summary by Severity\n\n`;
  report += `- 🔴 Critical: ${issuesBySeverity.critical.length}\n`;
  report += `- 🟠 High: ${issuesBySeverity.high.length}\n`;
  report += `- 🟡 Medium: ${issuesBySeverity.medium.length}\n`;
  report += `- 🟢 Low: ${issuesBySeverity.low.length}\n\n`;

  PAGES_TO_TEST.forEach(pageInfo => {
    const pageIssues = issues.filter(i => i.page === pageInfo.name);
    report += `## ${pageInfo.name} Page\n\n`;
    report += `**Issues Found:** ${pageIssues.length}\n\n`;

    if (pageIssues.length === 0) {
      report += `✅ No mobile compatibility issues detected!\n\n`;
    } else {
      const categories = [...new Set(pageIssues.map(i => i.category))];
      
      categories.forEach(category => {
        const categoryIssues = pageIssues.filter(i => i.category === category);
        report += `### ${category} (${categoryIssues.length} issues)\n\n`;
        
        categoryIssues.forEach((issue, index) => {
          const severityIcon = {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢',
          }[issue.severity];
          
          report += `${index + 1}. ${severityIcon} **${issue.severity.toUpperCase()}**: ${issue.description}\n`;
          if (issue.element) {
            report += `   - Element: \`${issue.element}\`\n`;
          }
          if (issue.details) {
            report += `   - Details: ${JSON.stringify(issue.details, null, 2)}\n`;
          }
          report += `\n`;
        });
      });
    }
    
    report += `---\n\n`;
  });

  report += `## Recommendations\n\n`;
  
  if (issuesBySeverity.critical.length > 0 || issuesBySeverity.high.length > 0) {
    report += `### Priority Fixes\n\n`;
    
    if (issues.some(i => i.category === 'Horizontal Overflow')) {
      report += `- **Fix horizontal overflow**: Add \`max-width: 100%\` and \`overflow-x: auto\` to overflowing elements\n`;
    }
    
    if (issues.some(i => i.category === 'Tap Target Size')) {
      report += `- **Increase tap target sizes**: Ensure all interactive elements are at least 44x44px\n`;
    }
    
    if (issues.some(i => i.category === 'Table Responsiveness')) {
      report += `- **Make tables responsive**: Wrap tables in scrollable containers or use responsive table patterns\n`;
    }
    
    if (issues.some(i => i.category === 'Charts/Graphs')) {
      report += `- **Fix chart overflow**: Set chart containers to \`width: 100%\` and make charts responsive\n`;
    }
  }
  
  report += `\n### General Recommendations\n\n`;
  report += `- Use responsive design patterns (flexbox, grid)\n`;
  report += `- Test on actual mobile devices\n`;
  report += `- Add viewport meta tag if missing: \`<meta name="viewport" content="width=device-width, initial-scale=1">\`\n`;
  report += `- Consider using mobile-first CSS approach\n`;
  report += `- Implement hamburger menu for navigation on mobile\n`;
  report += `- Use relative units (rem, em, %) instead of fixed pixels where appropriate\n\n`;

  fs.writeFileSync(reportPath, report);
  console.log(`\n✅ Report generated: ${reportPath}`);
  console.log(`\n📊 Summary:`);
  console.log(`   - Critical: ${issuesBySeverity.critical.length}`);
  console.log(`   - High: ${issuesBySeverity.high.length}`);
  console.log(`   - Medium: ${issuesBySeverity.medium.length}`);
  console.log(`   - Low: ${issuesBySeverity.low.length}`);
  console.log(`   - Total: ${issues.length}`);
}
