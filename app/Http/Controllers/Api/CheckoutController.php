<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Services\DonationService;
use App\Support\Charity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Pays a cart of donations in one step. Card details are passed straight to the
 * gateway and never stored (only brand + last 4 digits are kept).
 */
class CheckoutController extends Controller
{
    public function store(Request $request, DonationService $service): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:10'],
            'items.*.campaign_id' => ['nullable', 'integer', 'exists:campaigns,id'],
            'items.*.fund_type' => ['required', Rule::in(Charity::FUND_TYPES)],
            'items.*.amount' => ['required', 'numeric', 'between:10,500000'],
            'items.*.frequency' => ['nullable', Rule::in(['once', 'weekly', 'monthly'])],
            'donor.name' => [$user ? 'nullable' : 'required', 'string', 'max:120'],
            'donor.email' => [$user ? 'nullable' : 'required', 'email', 'max:150'],
            'donor.anonymous' => ['boolean'],
            'gift' => ['nullable', 'array'],
            'gift.name' => ['required_with:gift', 'string', 'max:120'],
            'gift.relation' => ['nullable', Rule::in(['parent', 'friend', 'deceased', 'other'])],
            'gift.message' => ['nullable', 'string', 'max:300'],
            'payment.method' => ['required', Rule::in(['card', 'apple_pay', 'google_pay'])],
            'payment.number' => ['required_if:payment.method,card', 'nullable', 'string', 'max:30'],
            'payment.expiry' => ['required_if:payment.method,card', 'nullable', 'string', 'max:7'],
            'payment.cvc' => ['required_if:payment.method,card', 'nullable', 'string', 'max:4'],
        ]);

        // Each campaign only accepts its own fund types, and only while it is open.
        $campaigns = Campaign::whereIn('id', collect($data['items'])->pluck('campaign_id')->filter())->get()->keyBy('id');
        foreach ($data['items'] as $i => $item) {
            if ($c = $campaigns->get($item['campaign_id'] ?? 0)) {
                if ($c->status !== 'active') {
                    throw ValidationException::withMessages(["items.$i.campaign_id" => __('api.campaign_closed')]);
                }
                if (! in_array($item['fund_type'], $c->fund_types, true)) {
                    throw ValidationException::withMessages(["items.$i.fund_type" => __('api.fund_not_allowed')]);
                }
            }
            if (($item['frequency'] ?? 'once') !== 'once' && ! $user) {
                $data['items'][$i]['frequency'] = 'once'; // recurring plans need an account
            }
        }

        $donor = ($data['donor'] ?? []) + ['gift' => $data['gift'] ?? null];
        $result = $service->checkout($data['items'], $donor, $data['payment'], $user);

        if (! $result['ok']) {
            return response()->json(['message' => __('api.payment.'.$result['error']), 'code' => $result['error']], 402);
        }
        $order = $result['order'];

        return response()->json([
            'order_id' => $order->id,
            'token' => $order->access_token,
            'total' => (float) $order->total,
            'receipts' => $order->donations->pluck('receipt_no'),
            'gift_token' => $order->donations->first()->gift_token,
            'badges' => $result['badges'] ?? [],
        ], 201);
    }
}
