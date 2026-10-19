<?php

namespace App\Services;

use Illuminate\Support\Str;

/**
 * A stand-in for a real payment gateway (Stripe, iyzico, PayTabs…), for the demo.
 * It checks the card the way a gateway would (Luhn checksum, expiry, CVC) but never
 * charges anything. The card number only lives in memory for this call; the app keeps
 * only the brand and last 4 digits, like a real PCI-DSS compliant integration.
 *
 * Test cards: 4242 4242 4242 4242 = success · 4000 0000 0000 0002 = declined ·
 * 4000 0000 0000 9995 = insufficient funds.
 */
class FakePaymentGateway
{
    public const DECLINED = '4000000000000002';

    public const NO_FUNDS = '4000000000009995';

    /** @return array{ok: bool, ref?: string, brand?: string, last4?: string, error?: string} */
    public function charge(float $amount, string $method, array $card = []): array
    {
        if ($amount <= 0) {
            return ['ok' => false, 'error' => 'invalid_amount'];
        }

        // Wallets (Apple Pay / Google Pay) hand over an already-verified token.
        if (in_array($method, ['apple_pay', 'google_pay'], true)) {
            return ['ok' => true, 'ref' => $this->ref(), 'brand' => $method === 'apple_pay' ? 'Apple Pay' : 'Google Pay', 'last4' => null];
        }

        $number = preg_replace('/\D/', '', $card['number'] ?? '');
        if (strlen($number) < 13 || strlen($number) > 19 || ! $this->luhn($number)) {
            return ['ok' => false, 'error' => 'card_invalid'];
        }
        if (! $this->expiryValid($card['expiry'] ?? '')) {
            return ['ok' => false, 'error' => 'card_expired'];
        }
        if (! preg_match('/^\d{3,4}$/', $card['cvc'] ?? '')) {
            return ['ok' => false, 'error' => 'cvc_invalid'];
        }
        if ($number === self::DECLINED) {
            return ['ok' => false, 'error' => 'card_declined'];
        }
        if ($number === self::NO_FUNDS) {
            return ['ok' => false, 'error' => 'insufficient_funds'];
        }

        return ['ok' => true, 'ref' => $this->ref(), 'brand' => $this->brand($number), 'last4' => substr($number, -4)];
    }

    /** A saved recurring "token" is charged without the card number. */
    public function chargeSaved(float $amount): array
    {
        return ['ok' => true, 'ref' => $this->ref()];
    }

    public function luhn(string $number): bool
    {
        $sum = 0;
        $alt = false;
        for ($i = strlen($number) - 1; $i >= 0; $i--) {
            $d = (int) $number[$i];
            if ($alt) {
                $d *= 2;
                if ($d > 9) {
                    $d -= 9;
                }
            }
            $sum += $d;
            $alt = ! $alt;
        }

        return $sum % 10 === 0;
    }

    private function expiryValid(string $expiry): bool
    {
        if (! preg_match('/^(0[1-9]|1[0-2])\s*\/\s*(\d{2})$/', trim($expiry), $m)) {
            return false;
        }

        return now()->startOfMonth()->lte(now()->setDate(2000 + (int) $m[2], (int) $m[1], 1)->startOfMonth());
    }

    public function brand(string $number): string
    {
        return match (true) {
            str_starts_with($number, '9792') => 'Troy',
            str_starts_with($number, '4') => 'Visa',
            (bool) preg_match('/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/', $number) => 'Mastercard',
            (bool) preg_match('/^3[47]/', $number) => 'Amex',
            default => 'Card',
        };
    }

    private function ref(): string
    {
        return 'pay_test_'.Str::lower(Str::random(16));
    }
}
