<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Donation;
use App\Models\RecurringDonation;
use App\Services\Badges;
use App\Services\DonationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** The donor's wallet: history, receipts, recurring plans, badges and the tree of good. */
class WalletController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $paid = $user->donations()->where('status', 'paid');
        $total = (float) (clone $paid)->sum('amount');

        return response()->json([
            'total' => $total,
            'count' => (clone $paid)->count(),
            'campaigns' => (clone $paid)->whereNotNull('campaign_id')->distinct()->count('campaign_id'),
            'by_fund' => (clone $paid)->selectRaw('fund_type, SUM(amount) total')->groupBy('fund_type')->pluck('total', 'fund_type'),
            'tree' => Badges::treeStage($total),
            'badges' => $user->badges()->orderBy('created_at')->get(['badge', 'created_at']),
            'all_badges' => Badges::ALL,
            'donations' => $user->donations()->with('campaign')->where('status', 'paid')->latest('paid_at')->limit(100)->get()->map->summary(),
            'recurring' => $user->recurringDonations()->with('campaign')->where('status', '!=', 'cancelled')->latest()->get()->map(fn (RecurringDonation $r) => [
                'id' => $r->id,
                'amount' => (float) $r->amount,
                'fund_type' => $r->fund_type,
                'frequency' => $r->frequency,
                'status' => $r->status,
                'next_charge_on' => $r->next_charge_on->toDateString(),
                'charges' => $r->charges_count,
                'card' => $r->card_last4 ? trim($r->card_brand.' •••• '.$r->card_last4) : $r->card_brand,
                'campaign' => $r->campaign ? ['slug' => $r->campaign->slug, 'title' => $r->campaign->t('title')] : null,
            ]),
        ]);
    }

    /** One donation with its receipt and the "where did my money go" timeline. */
    public function show(Request $request, Donation $donation): JsonResponse
    {
        abort_unless($donation->user_id === $request->user()->id, 404);
        $donation->load('campaign');
        $timeline = [['stage' => 'received', 'at' => $donation->paid_at?->toIso8601String(), 'title' => null, 'image' => null]];
        if ($donation->campaign) {
            foreach ($donation->campaign->updates()->whereNotNull('published_at')->where('published_at', '>=', $donation->paid_at?->copy()->subDays(30))->oldest('published_at')->get() as $u) {
                $timeline[] = ['stage' => $u->stage, 'at' => $u->published_at->toIso8601String(), 'title' => $u->t('title'), 'body' => $u->t('body'), 'image' => $u->image ? asset($u->image) : null];
            }
        }

        return response()->json(['donation' => $donation->summary() + [
            'units' => DonationService::units($donation->campaign, (float) $donation->amount),
            'unit_label' => $donation->campaign?->t('unit_label'),
            'donor_name' => $donation->donor_name,
            'donor_email' => $donation->donor_email,
            'order_id' => $donation->order_id,
            'timeline' => $timeline,
        ]]);
    }

    public function updateRecurring(Request $request, RecurringDonation $recurring): JsonResponse
    {
        abort_unless($recurring->user_id === $request->user()->id, 404);
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(['active', 'paused', 'cancelled'])],
            'amount' => ['sometimes', 'numeric', 'between:10,100000'],
        ]);
        $recurring->update($data);
        AuditLog::record('recurring.updated', $recurring, $data);

        return response()->json(['ok' => true]);
    }
}
