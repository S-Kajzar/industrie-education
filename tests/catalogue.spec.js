// Catalogue : filtres par thème, type, filière et niveau ; recherche insensible aux accents ; état dans l'adresse ;
// « Effacer les filtres » ; message si aucun résultat ; sans JavaScript, toutes les cartes affichées.
'use strict';

const { test, expect } = require('@playwright/test');
const { cartesCatalogue, themes, publics } = require('./outils');

// Contenus publiés et annales publiées (TRAME § 6 : les annales ont leurs cartes dans le catalogue).
const TOUS = cartesCatalogue();
const cartes = (page) => page.locator('[data-cartes] > li');
const visibles = (page) => page.locator('[data-cartes] > li:visible');
const normaliser = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

async function chemins(page) {
  return visibles(page).locator('a.carte').evaluateAll((as) => as.map((a) => new URL(a.href).pathname.split('/').slice(-3, -1).join('/') + '/'));
}

test.describe('sans JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('toutes les cartes sont affichées, les filtres restent masqués', async ({ page }) => {
    await page.goto('catalogue/?theme=energie&q=treuil');
    await expect(cartes(page)).toHaveCount(TOUS.length);
    await expect(visibles(page)).toHaveCount(TOUS.length);
    await expect(page.locator('[data-filtres]')).toBeHidden();
    await expect(page.locator('[data-compteur]')).toContainText(`${TOUS.length} contenus affichés`);
  });
});

test('filtre par thème : cartes, compteur et adresse', async ({ page }) => {
  await page.goto('catalogue/');
  await expect(visibles(page)).toHaveCount(TOUS.length);
  const energie = themes.find((t) => t.id === 'energie');
  await page.locator('[data-filtre="theme"][data-valeur="energie"]').click();
  const attendus = TOUS.filter((c) => c.theme === 'energie').map((c) => c.chemin).sort();
  expect((await chemins(page)).sort()).toEqual(attendus);
  await expect(page).toHaveURL(/\/catalogue\/\?theme=energie$/);
  await expect(page.locator('[data-filtre="theme"][data-valeur="energie"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-compteur]')).toHaveText(`${attendus.length} contenus affichés · ${energie.nom}`);
  // Second clic : l'option est retirée.
  await page.locator('[data-filtre="theme"][data-valeur="energie"]').click();
  await expect(visibles(page)).toHaveCount(TOUS.length);
  await expect(page).toHaveURL(/\/catalogue\/$/);
});

test('filtre par type, combiné au thème, et nombres par option', async ({ page }) => {
  await page.goto('catalogue/');
  await page.locator('[data-filtre="type"][data-valeur="exercice"]').click();
  expect((await chemins(page)).sort()).toEqual(TOUS.filter((c) => c.type === 'exercice').map((c) => c.chemin).sort());
  await expect(page).toHaveURL(/\?type=exercice$/);
  await page.locator('[data-filtre="theme"][data-valeur="mecanique"]').click();
  const attendus = TOUS.filter((c) => c.type === 'exercice' && c.theme === 'mecanique').map((c) => c.chemin).sort();
  expect((await chemins(page)).sort()).toEqual(attendus);
  await expect(page).toHaveURL(/\?theme=mecanique&type=exercice$/);
  // Le nombre affiché pour « Cours » tient compte du thème choisi.
  const cours = TOUS.filter((c) => c.type === 'cours' && c.theme === 'mecanique').length;
  await expect(page.locator('[data-filtre="type"][data-valeur="cours"] .filtre-nb')).toHaveText(String(cours));
});

test('filtres par filière et par niveau', async ({ page }) => {
  await page.goto('catalogue/');
  await page.locator('[data-filtre="public"][data-valeur="si"]').click();
  expect((await chemins(page)).sort()).toEqual(TOUS.filter((c) => c.publics.includes('si')).map((c) => c.chemin).sort());
  await page.locator('[data-filtre="niveau"][data-valeur="1"]').click();
  const attendus = TOUS.filter((c) => c.publics.includes('si') && c.niveau === 1).map((c) => c.chemin).sort();
  expect((await chemins(page)).sort()).toEqual(attendus);
  await expect(page).toHaveURL(/\?public=si&niveau=1$/);
  // Une filière inactive sans aucune carte est annoncée « bientôt » et ne se choisit pas ; dès qu'elle a une carte
  // (une annale, par exemple), elle devient choisissable.
  for (const p of publics.filter((x) => !x.actif)) {
    const bouton = page.locator(`[data-filtre="public"][data-valeur="${p.id}"]`);
    if (TOUS.some((c) => c.publics.includes(p.id))) await expect(bouton).toBeEnabled();
    else await expect(bouton).toBeDisabled();
  }
});

test('recherche sans accents', async ({ page }) => {
  await page.goto('catalogue/');
  const champ = page.locator('#q-catalogue');
  for (const mot of ['energie', 'velo', 'cle de serrage']) {
    await champ.fill(mot);
    // Attendu : les cartes dont le texte, débarrassé de ses accents, contient chacun des mots cherchés.
    const attendus = await cartes(page).evaluateAll((lis, m) => lis
      .filter((li) => {
        const texte = li.getAttribute('data-texte').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        return m.split(' ').every((w) => texte.includes(w));
      })
      .map((li) => li.querySelector('a').getAttribute('href')), mot);
    expect(attendus.length, mot).toBeGreaterThan(0);
    await expect(visibles(page)).toHaveCount(attendus.length);
    await expect(page).toHaveURL(new RegExp(`\\?q=${encodeURIComponent(mot).replace(/%20/g, '\\+')}$`));
  }
  // Le mot cherché n'a pas d'accent, les textes trouvés en ont.
  await champ.fill('energie');
  const textes = await visibles(page).evaluateAll((lis) => lis.map((li) => li.getAttribute('data-texte')));
  expect(textes.every((t) => normaliser(t).includes('energie'))).toBe(true);
  expect(textes.some((t) => t.includes('Énergie') || t.includes('énergie'))).toBe(true);
});

test('état lu dans l’adresse, valeurs inconnues ignorées', async ({ page }) => {
  await page.goto('catalogue/?theme=mecanique&type=exercice');
  expect((await chemins(page)).sort())
    .toEqual(TOUS.filter((c) => c.theme === 'mecanique' && c.type === 'exercice').map((c) => c.chemin).sort());
  await expect(page.locator('[data-filtre="theme"][data-valeur="mecanique"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-filtre="type"][data-valeur="exercice"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-filtre="theme"][data-valeur=""]')).toHaveAttribute('aria-pressed', 'false');

  await page.goto('catalogue/?q=velo');
  await expect(page.locator('#q-catalogue')).toHaveValue('velo');
  await expect(visibles(page)).toHaveCount(1);

  await page.goto('catalogue/?theme=inconnu&niveau=99');
  await expect(visibles(page)).toHaveCount(TOUS.length);
});

test('« Effacer les filtres » et message si aucun résultat', async ({ page }) => {
  await page.goto('catalogue/?theme=energie&type=cours&q=puissance');
  await expect(visibles(page)).toHaveCount(1);
  await page.locator('#q-catalogue').fill('zzzz');
  await expect(visibles(page)).toHaveCount(0);
  await expect(page.locator('[data-vide]')).toBeVisible();
  await expect(page.locator('[data-vide]')).toHaveText(/Aucun contenu ne correspond/);
  await expect(page.locator('[data-compteur]')).toContainText('0 contenu affiché');

  await page.getByRole('link', { name: 'Effacer les filtres' }).click();
  await expect(visibles(page)).toHaveCount(TOUS.length);
  await expect(page.locator('[data-vide]')).toBeHidden();
  await expect(page.locator('#q-catalogue')).toHaveValue('');
  await expect(page).toHaveURL(/\/catalogue\/$/);
});

test('la recherche de l’accueil mène au catalogue filtré', async ({ page }) => {
  await page.goto('');
  await page.locator('#q-accueil').fill('brouette');
  await page.locator('#q-accueil').press('Enter');
  await expect(page).toHaveURL(/\/catalogue\/\?q=brouette$/);
  await expect(visibles(page)).toHaveCount(1);
  await expect(visibles(page)).toContainText('La brouette');
});

test('sur téléphone, les filtres se replient derrière un bouton « Filtres »', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('catalogue/');
  const bouton = page.locator('[data-filtres-ouvrir]');
  await expect(bouton).toBeVisible();
  await expect(page.locator('#filtres-panneau')).toBeHidden();
  await bouton.click();
  await expect(bouton).toHaveAttribute('aria-expanded', 'true');
  await page.locator('[data-filtre="theme"][data-valeur="numerique"]').click();
  await expect(bouton).toContainText('1 actif');
  await expect(visibles(page)).toHaveCount(TOUS.filter((c) => c.theme === 'numerique').length);
});
