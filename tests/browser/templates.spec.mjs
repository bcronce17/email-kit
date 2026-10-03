import { test, expect } from '@playwright/test';
import * as templates from '../../dist/templates.js';
import { templateCases } from '../support/templates.mjs';

async function expectResponsiveLayout(page) {
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth
  }));

  expect(dimensions.contentWidth).toBeLessThanOrEqual(dimensions.width);

  const action = page.locator('a').first();

  const bounds = await action.boundingBox();

  expect(bounds).not.toBeNull();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(dimensions.width);
  expect(bounds.height).toBeGreaterThanOrEqual(44);
}

for (const [name, renderer, options] of templateCases) {
  test(`${name} displays readable content and a usable action`, async ({ page }) => {
    const message = templates[renderer](options);

    await page.setContent(message.html);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(options.brand.name, { exact: true })).toBeVisible();
    await expect(page.locator('a').first()).toHaveAttribute('href', options.actionUrl);
    await expect(page.locator('a').nth(1)).toHaveText(options.actionUrl);
    await expectResponsiveLayout(page);

    await page.locator('a').first().focus();

    await expect(page.locator('a').first()).toBeFocused();
  });
}

test('custom copy, long links, and notification details fit the viewport', async ({ page }) => {
  const actionUrl = `https://example.com/action?token=${'synthetic-preview-token-'.repeat(30)}`;
  const message = templates.renderNotificationEmail({
    brand: {
      name: 'A community with a considerably longer name',
      tagline: 'Updates for everyone in our shared community.',
      accentColor: '#245c45'
    },
    language: 'fr',
    subject: 'Une mise à jour',
    heading: 'Une mise à jour pour votre communauté',
    summary: 'Consultez les informations de votre projet.',
    actionUrl,
    preferencesUrl: 'https://example.com/preferences',
    linkPolicy: { allowedOrigins: ['https://example.com'] },
    details: [
      {
        label: 'Projet',
        value: 'Un projet avec un nom particulièrement long et des informations complémentaires'
      }
    ],
    copy: {
      actionLabel: 'Consulter les informations de votre projet',
      preferencesLabel: 'Préférences des notifications'
    }
  });

  await page.setContent(message.html);

  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Une mise à jour pour votre communauté');
  await expect(page.getByRole('rowheader', { name: 'Projet' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Préférences des notifications' })).toHaveAttribute(
    'href',
    'https://example.com/preferences'
  );
  await expectResponsiveLayout(page);
});
