import { expect, test, type Page } from '@playwright/test'

const volunteer = {
  id: 'v1',
  name: 'Alice Martin',
  roles: ['benevole'],
  active: true,
}
const admin = {
  id: 'a1',
  name: 'Camille Dupont',
  roles: ['admin'],
  active: true,
}
const availability = {
  id: 1,
  user_ref: 'v1',
  date: '2026-10-26',
  start: '09:00',
  end: '12:00',
  details: 'Disponible pour le tri',
}

async function setup(
  page: Page,
  options: {
    admin?: boolean
    guest?: boolean
    loadFailure?: boolean
    saveConflict?: boolean
    expire?: boolean
    delay?: boolean
  } = {},
) {
  let user = options.guest ? null : options.admin ? admin : volunteer
  let slots = [availability]
  let planning: any = null
  let nextId = 2
  let loadFailure = options.loadFailure ?? false
  const mutations: string[] = []
  await page.clock.install({ time: new Date('2026-10-27T10:00:00+01:00') })
  await page.route('**/admin/login/**', (route) =>
    route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body:
        '<h1>Connexion Django</h1>' +
        (route.request().url().includes('expired=1')
          ? '<p role="status">Votre session a expiré</p>'
          : ''),
    }),
  )
  await page.route('**/api/planning/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/planning/', '')
    const method = request.method()
    const data = method === 'GET' ? null : request.postDataJSON()
    const reply = (body: unknown, status = 200) =>
      route.fulfill({ status, json: body })
    if (method !== 'GET') mutations.push(`${method} ${path}`)
    if (path === 'session/') return reply({ user, csrf: 'test-token' })
    if (path === 'login/') {
      user = volunteer
      return reply({ user, csrf: 'new-token' })
    }
    if (path === 'logout/') {
      user = null
      return reply({ ok: true })
    }
    if (options.expire && path === 'availabilities/')
      return reply({ errors: { auth: ['Connexion requise.'] } }, 401)
    if (path === 'weeks/' && method === 'GET') {
      if (loadFailure)
        return reply({ errors: { server: ['Service indisponible.'] } }, 503)
      if (options.delay && url.searchParams.get('week') === '2026-11-02')
        await new Promise((resolve) => setTimeout(resolve, 300))
      return reply({
        items:
          planning && planning.week === url.searchParams.get('week')
            ? [planning]
            : [],
      })
    }
    if (path === 'volunteers/') return reply({ items: [volunteer] })
    if (path === 'weeks/' && method === 'POST') {
      planning = { id: 1, week: data.week, published: false, assignments: [] }
      return reply(planning, 201)
    }
    if (path === 'weeks/1/publication/') {
      planning.published = data.published
      return reply(planning)
    }
    if (path === 'weeks/1/assignments/' && method === 'POST') {
      planning.assignments.push({ ...data, id: nextId++, name: volunteer.name })
      return reply(planning.assignments.at(-1), 201)
    }
    if (
      (path === 'availabilities/' && method === 'POST') ||
      (path === 'availabilities/1/' && method === 'PUT')
    ) {
      if (options.saveConflict)
        return reply(
          {
            errors: {
              start: ['Cette plage chevauche une autre disponibilité.'],
            },
          },
          400,
        )
      const item = {
        ...data,
        id: method === 'PUT' ? 1 : nextId++,
        user_ref: 'v1',
      }
      slots =
        method === 'PUT'
          ? slots.map((slot) => (slot.id === 1 ? item : slot))
          : [...slots, item]
      return reply(item, method === 'PUT' ? 200 : 201)
    }
    if (path === 'availabilities/1/' && method === 'DELETE') {
      slots = []
      return reply({ ok: true })
    }
    if (path === 'availabilities/' || path === 'team-availabilities/')
      return reply({
        items: slots.filter(
          (slot) => slot.date >= (url.searchParams.get('week') ?? ''),
        ),
      })
    return reply({ errors: { route: ['Route inattendue dans le test.'] } }, 404)
  })
  await page.goto('/')
  return {
    mutations,
    recover: () => {
      loadFailure = false
    },
  }
}

test('validation des horaires et conservation de la saisie après conflit', async ({
  page,
}, testInfo) => {
  const mock = await setup(page, { saveConflict: true })
  await page
    .getByRole('button', { name: 'Mes disponibilités', exact: true })
    .click()
  await page.getByLabel('Fin', { exact: true }).fill('08:00')
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(page.getByLabel('Fin', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  )
  expect(mock.mutations).not.toContain('POST availabilities/')
  await page.getByLabel('Fin', { exact: true }).fill('13:00')
  await page
    .getByLabel('Détails (facultatif)', { exact: true })
    .fill('Ma saisie à conserver')
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(
    page.getByText('Cette plage chevauche une autre disponibilité.', {
      exact: true,
    }),
  ).toBeVisible()
  await expect(page.getByLabel('Début', { exact: true })).toBeFocused()
  await expect(
    page.getByLabel('Détails (facultatif)', { exact: true }),
  ).toHaveValue('Ma saisie à conserver')
})

test('un échec de chargement ne permet pas de créer un planning vide', async ({
  page,
}) => {
  const mock = await setup(page, { admin: true, loadFailure: true })
  await page
    .getByRole('button', { name: 'Gestion du planning', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText(
    'n’ont pas pu être chargées',
  )
  await expect(
    page.getByRole('button', { name: 'Créer le planning', exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: 'Une nouvelle semaine à organiser' }),
  ).toHaveCount(0)
  mock.recover()
  await page.getByRole('button', { name: 'Réessayer le chargement' }).click()
  await expect(
    page.getByRole('button', { name: 'Créer le planning', exact: true }),
  ).toBeVisible()
})

test('corriger un champ ne déplace pas le focus vers une autre erreur', async ({
  page,
}) => {
  await setup(page)
  await page
    .getByRole('button', { name: 'Mes disponibilités', exact: true })
    .click()
  await page.getByLabel('Date', { exact: true }).fill('')
  await page.getByLabel('Fin', { exact: true }).fill('08:00')
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(page.getByLabel('Date', { exact: true })).toBeFocused()
  await page.getByLabel('Date', { exact: true }).fill('2026-10-27')
  await expect(page.getByLabel('Date', { exact: true })).toBeFocused()
  await expect(page.getByLabel('Fin', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  )
})

test('la navigation protège une saisie non enregistrée', async ({ page }) => {
  await setup(page)
  await page
    .getByRole('button', { name: 'Mes disponibilités', exact: true })
    .click()
  await page
    .getByLabel('Détails (facultatif)', { exact: true })
    .fill('À ne pas perdre')
  await page
    .getByRole('button', { name: 'Semaine suivante', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Annuler', exact: true })
    .click()
  await expect(
    page.getByLabel('Détails (facultatif)', { exact: true }),
  ).toHaveValue('À ne pas perdre')
  await expect(
    page.getByLabel('Semaine du lundi', { exact: true }),
  ).toHaveValue('2026-10-26')
  await page
    .getByRole('button', { name: 'Semaine suivante', exact: true })
    .click()
  await page.getByRole('button', { name: 'Continuer sans enregistrer' }).click()
  await expect(
    page.getByLabel('Semaine du lundi', { exact: true }),
  ).toHaveValue('2026-11-02')
  await expect(
    page.getByLabel('Détails (facultatif)', { exact: true }),
  ).toHaveValue('')
})

test('actualiser conserve le formulaire en cours', async ({ page }) => {
  await setup(page)
  await page
    .getByRole('button', { name: 'Mes disponibilités', exact: true })
    .click()
  await page
    .getByLabel('Détails (facultatif)', { exact: true })
    .fill('Brouillon conservé')
  await page.getByRole('button', { name: 'Actualiser la semaine' }).click()
  await expect(
    page.getByLabel('Détails (facultatif)', { exact: true }),
  ).toHaveValue('Brouillon conservé')
})

test('une session expirée revient à la connexion', async ({ page }) => {
  await setup(page, { expire: true })
  await page
    .getByRole('button', { name: 'Mes disponibilités', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Connexion Django' }),
  ).toBeVisible()
  await expect(page.getByRole('status')).toContainText('Votre session a expiré')
})

test('création, affectation et publication avec retours de succès', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await setup(page, { admin: true })
  await page
    .getByRole('button', { name: 'Gestion du planning', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Créer le planning', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Préparer une affectation', exact: true })
    .click()
  await expect(page.getByLabel('Bénévole', { exact: true })).toHaveValue('v1')
  await expect(page.getByLabel('Date', { exact: true })).toBeFocused()
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Affectation enregistrée.' }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Publier le planning', exact: true })
    .click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Planning publié.' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Dépublier', exact: true }),
  ).toBeVisible()
  await page.screenshot({
    path: testInfo.outputPath('admin.png'),
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Dépublier', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Annuler', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Dépublier', exact: true }),
  ).toBeVisible()
})

test('la suppression demande confirmation puis actualise la liste', async ({
  page,
}) => {
  const mock = await setup(page)
  await page
    .getByRole('button', { name: 'Mes disponibilités', exact: true })
    .click()
  await page.getByRole('button', { name: /^Supprimer la plage/ }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Annuler', exact: true })
    .click()
  expect(mock.mutations).not.toContain('DELETE availabilities/1/')
  await page.getByRole('button', { name: /^Supprimer la plage/ }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Supprimer', exact: true })
    .click()
  await expect(
    page.getByText('Disponible pour le tri', { exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('status').filter({ hasText: 'Disponibilité supprimée.' }),
  ).toBeVisible()
})

test('édition accessible sur mobile et absence de débordement à 320 px', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await setup(page)
  await page
    .getByRole('button', { name: 'Mes disponibilités', exact: true })
    .click()
  await page.getByRole('button', { name: 'Modifier', exact: true }).click()
  await expect(page.getByLabel('Date', { exact: true })).toBeFocused()
  await expect(
    page.getByRole('heading', {
      name: 'Modifier une disponibilité',
      exact: true,
    }),
  ).toBeInViewport()
  await expect(
    page.getByLabel('Détails (facultatif)', { exact: true }),
  ).toHaveValue('Disponible pour le tri')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy()
  await page.screenshot({
    path: testInfo.outputPath('mobile.png'),
    fullPage: true,
  })
})

test('les jours de la semaine restent stables dans un autre fuseau horaire', async ({
  browser,
}) => {
  const context = await browser.newContext({ timezoneId: 'Pacific/Kiritimati' })
  const page = await context.newPage()
  try {
    await setup(page)
    await page
      .getByRole('button', { name: 'Mes disponibilités', exact: true })
      .click()
    await expect(
      page.getByLabel('Semaine du lundi', { exact: true }),
    ).toHaveValue('2026-10-26')
    await expect(
      page.getByRole('region', { name: 'lundi 26 octobre', exact: true }),
    ).toBeVisible()
  } finally {
    await context.close()
  }
})

test('une semaine ancienne ne réapparaît pas après navigation rapide', async ({
  page,
}) => {
  await setup(page, { delay: true })
  await page
    .getByRole('button', { name: 'Semaine suivante', exact: true })
    .click()
  await expect(page.getByRole('status')).toContainText(
    'Chargement de la semaine',
  )
  // Navigation between sections cancels the pending request for the old view.
  await page
    .getByRole('button', { name: 'Mes disponibilités', exact: true })
    .click()
  await expect(page.getByLabel('Date', { exact: true })).toHaveValue(
    '2026-11-02',
  )
  await expect(
    page.getByText('Disponible pour le tri', { exact: true }),
  ).toHaveCount(0)
})

test('sans session, le frontend redirige vers le formulaire Django commun', async ({
  page,
}) => {
  await setup(page, { guest: true })
  await expect(
    page.getByRole('heading', { name: 'Connexion Django' }),
  ).toBeVisible()
  const destination = new URL(page.url())
  expect(destination.pathname).toBe('/admin/login/')
  expect(destination.searchParams.get('next')).toBe('/admin/planning/')
})
