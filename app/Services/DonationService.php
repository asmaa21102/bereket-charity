<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Campaign;
use App\Models\Donation;
use App\Models\Order;
use App\Models\RecurringDonation;
use App\Models\User;
use App\Notifications\AppNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Turns a cart into an order, charges it through the gateway and, when it succeeds,
 * issues receipts, updates campaign progress, starts recurring plans and awards badges.
 */
class DonationService
{
    public function __construct(private FakePaymentGateway $gateway, private Badges $badges) {}

    /**
     * @param  array<int, array{campaign_id: ?int, fund_type: string, amount: float, frequency?: ?string}>  $items
     * @param  array{name: ?string, email: ?string, anonymous?: bool, gift?: ?array}  $donor
     * @param  array{method: string, number?: string, expiry?: string, cvc?: string}  $payment
     * @return array{ok: bool, order?: Order, error?: string, badges?: array}
     */
    public function checkout(array $items, array $donor, array $payment, ?User $user): array
    {
        $total = round(array_sum(array_column($items, 'amount')), 2);

        $order = DB::transaction(function () use ($items, $donor, $user, $total, $payment) {
            $order = Order::create(['user_id' => $user?->id, 'total' => $total, 'payment_method' => $payment['method'], 'access_token' => Str::random(40)]);
            foreach ($items as $item) {
                $gift = $donor['gift'] ?? null;
                $order->donations()->create([
                    'user_id' => $user?->id,
                    'campaign_id' => $item['campaign_id'] ?? null,
                    'fund_type' => $item['fund_type'],
                    'amount' => $item['amount'],
                    'payment_method' => $payment['method'],
                    'donor_name' => $user?->name ?? $donor['name'] ?? null,
                    'donor_email' => $user?->email ?? $donor['email'] ?? null,
                    'is_anonymous' => (bool) ($donor['anonymous'] ?? false),
                    'gift_name' => $gift['name'] ?? null,
                    'gift_relation' => $gift ? ($gift['relation'] ?? 'other') : null,
                    'gift_message' => $gift['message'] ?? null,
                    'gift_token' => $gift ? Str::random(32) : null,
                ]);
            }

            return $order;
        });

        $result = $this->gateway->charge($total, $payment['method'], $payment);
        if (! $result['ok']) {
            $order->update(['status' => 'failed', 'failure_reason' => $result['error']]);
            $order->donations()->update(['status' => 'failed']);
            AuditLog::record('payment.failed', $order, ['error' => $result['error'], 'total' => $total]);

            return ['ok' => false, 'order' => $order, 'error' => $result['error']];
        }

        DB::transaction(function () use ($order, $result, $items, $user) {
            $order->update(['status' => 'paid', 'payment_ref' => $result['ref']]);
            foreach ($order->donations as $i => $donation) {
                $donation->forceFill([
                    'status' => 'paid',
                    'paid_at' => now(),
                    'card_brand' => $result['brand'] ?? null,
                    'card_last4' => $result['last4'] ?? null,
                ])->save();
                $donation->assignReceiptNumber();

                // "Make this monthly / weekly": the first charge is today, the plan continues from here.
                $frequency = $items[$i]['frequency'] ?? null;
                if ($user && in_array($frequency, ['weekly', 'monthly'], true)) {
                    $plan = RecurringDonation::create([
                        'user_id' => $user->id,
                        'campaign_id' => $donation->campaign_id,
                        'fund_type' => $donation->fund_type,
                        'amount' => $donation->amount,
                        'frequency' => $frequency,
                        'next_charge_on' => $frequency === 'weekly' ? today()->addWeek() : today()->addMonthNoOverflow(),
                        'card_brand' => $donation->card_brand,
                        'card_last4' => $donation->card_last4,
                        'charges_count' => 1,
                    ]);
                    $donation->update(['recurring_donation_id' => $plan->id]);
                }
            }
            Campaign::whereIn('id', $order->donations->pluck('campaign_id')->filter()->unique())->get()->each->refreshTotals();
        });

        $order->load('donations.campaign');
        AuditLog::record('donation.paid', $order, ['total' => $total, 'count' => $order->donations->count()]);
        $newBadges = [];
        if ($user) {
            $user->notify(new AppNotification('donation_received', ['amount' => $total, 'receipt' => $order->donations->first()->receipt_no], '/wallet', email: true));
            $newBadges = $this->badges->evaluate($user);
            foreach ($newBadges as $b) {
                $user->notify(new AppNotification('badge_earned', ['badge' => $b], '/wallet'));
            }
        }

        return ['ok' => true, 'order' => $order, 'badges' => $newBadges];
    }

    /** Charges every recurring plan that is due (run daily by the scheduler). */
    public function chargeDueRecurring(): int
    {
        $count = 0;
        RecurringDonation::with('user')->where('status', 'active')->whereDate('next_charge_on', '<=', today())->each(function (RecurringDonation $plan) use (&$count) {
            $result = $this->gateway->chargeSaved((float) $plan->amount);
            if (! $result['ok']) {
                return;
            }
            $donation = Donation::create([
                'user_id' => $plan->user_id,
                'campaign_id' => $plan->campaign_id,
                'recurring_donation_id' => $plan->id,
                'fund_type' => $plan->fund_type,
                'amount' => $plan->amount,
                'status' => 'paid',
                'paid_at' => now(),
                'payment_method' => 'card',
                'card_brand' => $plan->card_brand,
                'card_last4' => $plan->card_last4,
                'donor_name' => $plan->user->name,
                'donor_email' => $plan->user->email,
            ]);
            $donation->assignReceiptNumber();
            $plan->charges_count++;
            $plan->advance();
            $plan->save();
            $plan->campaign?->refreshTotals();
            $plan->user->notify(new AppNotification('recurring_charged', ['amount' => (float) $plan->amount, 'receipt' => $donation->receipt_no], '/wallet'));
            $count++;
        });

        return $count;
    }

    /** "Your 500 TRY provides 2 food baskets" — the impact of an amount for a campaign. */
    public static function units(?Campaign $campaign, float $amount): ?int
    {
        if (! $campaign?->unit_price || $campaign->unit_price <= 0) {
            return null;
        }

        return (int) floor($amount / (float) $campaign->unit_price);
    }
}
