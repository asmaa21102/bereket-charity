# Bereket — demo charity platform

A portfolio project: a donation platform with three sides (donor, beneficiary, administration),
in Arabic (RTL), English and Turkish, in Turkish lira. **Payments are simulated and the organisation
is fictional — no real money is collected.**

- Backend: Laravel 12 REST API (`routes/api.php`), Sanctum cookie sessions, MySQL `fodern_charity`
- Frontend: React 19 + TypeScript + Tailwind CSS 4 + Framer Motion in `frontend/`, built into `public/app`

## Run

```bash
composer install && cp .env.example .env   # set DB_USERNAME / DB_PASSWORD
php artisan key:generate
php artisan migrate --seed                 # demo data (DemoSeeder)
cd frontend && npm ci && npm run build     # or `npm run dev` on :5180 (proxies the API)
cd .. && php artisan serve --port=8103     # http://localhost:8103
php artisan schedule:work                  # charges monthly/weekly donations
```


## Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@bereket.test | Admin12345 |
| Staff | staff@bereket.test | Staff12345 |
| Donor | donor@bereket.test | Donor12345 |
| Beneficiary | aid@bereket.test | Aid12345 |
| Volunteer | volunteer@bereket.test | Volunteer12345 |

Test cards: `4242 4242 4242 4242` succeeds · `4000 0000 0000 0002` is declined ·
`4000 0000 0000 9995` has insufficient funds (any future expiry, any CVC). Apple Pay / Google Pay are simulated.

## Features

- **Donor:** campaigns with live progress, one-tap amounts, an impact slider, a donation basket,
  regular giving (pause/cancel), gifts on behalf of someone with a gift card, an instant printable receipt,
  a giving wallet with badges and a "tree of good", a "where your money went" timeline, and a zakat calculator.
- **Beneficiary:** aid requests (medical, education, financial, rent) with documents, plus status tracking.
- **Administration:** an overview with charts, campaigns in 3 languages with field updates (donors are notified),
  donations with CSV export, a financial report per fund (zakat, sadaqah, jariyah, kaffarah, general),
  aid review (approve → disburse), volunteers and tasks, users and roles, an audit log, and zakat settings.
  Staff see only requests and volunteers.

## Security

- AES-256 encryption for aid request descriptions, phone numbers, decision notes, the TOTP secret,
  and every uploaded document (encrypted before it is written to disk).
- Card numbers are never stored, only the brand and last 4 digits (the PCI-DSS principle; a real gateway would tokenise).
- TOTP two-factor authentication. `CHARITY_ADMIN_2FA=required` forces it for staff; the demo uses `optional`.
- Role middleware, CSRF protection (Sanctum), separate rate limits for login, registration, checkout and aid requests,
  sign-out of suspended accounts, CSV formula-injection guard, and an audit log of payments, decisions,
  document views and exports.

Not included: a real payment gateway, SMS codes, social login, KYC with an identity provider, and push notifications
(notifications are in-app and by email).

## Checks

```bash
php artisan test                     # 22 feature tests (MySQL fodern_charity_test)
cd frontend && npm run typecheck && npm run check-i18n
```
