<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\CampaignUpdate;
use App\Models\Disbursement;
use App\Models\Donation;
use App\Models\Order;
use App\Models\Setting;
use App\Support\Charity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicController extends Controller
{
    /** Lists and values the front end needs everywhere. */
    public function meta(): JsonResponse
    {
        $gold = (float) Setting::get('gold_price_per_gram', 3100);

        return response()->json([
            'currency' => Charity::CURRENCY,
            'fund_types' => Charity::FUND_TYPES,
            'categories' => Charity::CATEGORIES,
            'aid_types' => Charity::AID_TYPES,
            'doc_kinds' => Charity::DOC_KINDS,
            'skills' => Charity::SKILLS,
            'presets' => Charity::PRESET_AMOUNTS,
            // Zakat: nisab = 85 g of gold, rate 2.5 %
            'zakat' => ['gold_price' => $gold, 'silver_price' => (float) Setting::get('silver_price_per_gram', 38), 'nisab_grams' => 85, 'rate' => 0.025],
            'demo' => (bool) config('charity.demo'),
            'admin_2fa' => config('charity.admin_2fa'),
        ]);
    }

    public function home(): JsonResponse
    {
        $paid = Donation::where('status', 'paid');

        return response()->json([
            'stats' => [
                'raised' => (float) (clone $paid)->sum('amount'),
                'donors' => (clone $paid)->selectRaw('COUNT(DISTINCT COALESCE(user_id, donor_email)) n')->value('n') ?? 0,
                'campaigns' => Campaign::where('status', 'active')->count(),
                'delivered' => (float) Disbursement::sum('amount'),
            ],
            'urgent' => Campaign::visible()->where('status', 'active')->where('is_urgent', true)->limit(3)->get()->map->card(),
            'campaigns' => Campaign::visible()->where('status', 'active')->limit(6)->get()->map->card(),
            // "Stories" from the field: latest updates with a photo
            'stories' => CampaignUpdate::with('campaign')->whereNotNull('image')->whereNotNull('published_at')->latest('published_at')->limit(10)->get()->map->toCard(),
        ]);
    }

    public function campaigns(Request $request): JsonResponse
    {
        $q = Campaign::visible();
        if (in_array($request->query('category'), Charity::CATEGORIES, true)) {
            $q->where('category', $request->query('category'));
        }
        if ($request->query('status') === 'completed') {
            $q->where('status', 'completed');
        } elseif ($request->query('status') !== 'all') {
            $q->where('status', 'active');
        }
        if ($search = trim((string) $request->query('q'))) {
            $q->where(fn ($w) => $w->where('title', 'like', "%{$search}%")->orWhere('summary', 'like', "%{$search}%"));
        }

        return response()->json(['campaigns' => $q->get()->map->card()]);
    }

    public function campaign(Campaign $campaign): JsonResponse
    {
        abort_unless(in_array($campaign->status, ['active', 'completed'], true), 404);
        $recent = $campaign->donations()->where('status', 'paid')->latest('paid_at')->limit(8)->get()
            ->map(fn (Donation $d) => ['name' => $d->is_anonymous || ! $d->donor_name ? null : $this->firstName($d->donor_name), 'amount' => (float) $d->amount, 'at' => $d->paid_at?->toIso8601String()]);

        return response()->json([
            'campaign' => $campaign->card() + [
                'story' => $campaign->t('story'),
                'impact_levels' => collect($campaign->impact_levels ?? [])->map(fn ($l) => ['amount' => (float) $l['amount'], 'text' => $l['text'][app()->getLocale()] ?? $l['text']['ar'] ?? ''])->values(),
                'spent' => (float) Disbursement::where('campaign_id', $campaign->id)->sum('amount'),
            ],
            'updates' => $campaign->updates()->whereNotNull('published_at')->get()->map->toCard(),
            'recent_donors' => $recent,
        ]);
    }

    /** Public gift card ("a donation was made in your name"). */
    public function gift(string $token): JsonResponse
    {
        $d = Donation::with('campaign')->where('gift_token', $token)->where('status', 'paid')->firstOrFail();

        return response()->json(['gift' => [
            'to' => $d->gift_name,
            'from' => $d->is_anonymous ? null : $d->donor_name,
            'relation' => $d->gift_relation,
            'message' => $d->gift_message,
            'campaign' => $d->campaign ? ['slug' => $d->campaign->slug, 'title' => $d->campaign->t('title'), 'cover' => $d->campaign->cover ? asset($d->campaign->cover) : null] : null,
            'fund_type' => $d->fund_type,
            'date' => $d->paid_at?->toDateString(),
        ]]);
    }

    /** Receipts of one checkout: for its owner, or for a guest holding the order's access token. */
    public function order(Request $request, Order $order): JsonResponse
    {
        $mine = $request->user() && $order->user_id === $request->user()->id;
        abort_unless($mine || hash_equals($order->access_token, (string) $request->query('token')), 404);
        $order->load('donations.campaign');

        return response()->json(['order' => [
            'id' => $order->id,
            'status' => $order->status,
            'total' => (float) $order->total,
            'payment_method' => $order->payment_method,
            'payment_ref' => $order->payment_ref,
            'created_at' => $order->created_at->toIso8601String(),
            'donor' => ['name' => $order->donations->first()?->donor_name, 'email' => $order->donations->first()?->donor_email],
            'donations' => $order->donations->map(fn (Donation $d) => $d->summary() + ['units' => \App\Services\DonationService::units($d->campaign, (float) $d->amount), 'unit_label' => $d->campaign?->t('unit_label')]),
        ]]);
    }

    private function firstName(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name));

        return count($parts) > 1 ? $parts[0].' '.mb_substr(end($parts), 0, 1).'.' : $parts[0];
    }
}
