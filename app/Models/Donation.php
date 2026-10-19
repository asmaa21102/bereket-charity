<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Donation extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['amount' => 'decimal:2', 'paid_at' => 'datetime', 'is_anonymous' => 'boolean'];

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /** Serial receipt number, e.g. BRK-2026-000042 (assigned once the payment succeeds). */
    public function assignReceiptNumber(): void
    {
        $this->receipt_no ??= sprintf('BRK-%s-%06d', ($this->paid_at ?? now())->format('Y'), $this->id);
        $this->save();
    }

    public function summary(): array
    {
        return [
            'id' => $this->id,
            'receipt_no' => $this->receipt_no,
            'amount' => (float) $this->amount,
            'fund_type' => $this->fund_type,
            'status' => $this->status,
            'payment_method' => $this->payment_method,
            'card' => $this->card_last4 ? trim(($this->card_brand ?? '').' •••• '.$this->card_last4) : null,
            'paid_at' => $this->paid_at?->toIso8601String(),
            'campaign' => $this->campaign ? ['slug' => $this->campaign->slug, 'title' => $this->campaign->t('title'), 'category' => $this->campaign->category, 'cover' => $this->campaign->cover ? asset($this->campaign->cover) : null] : null,
            'gift' => $this->gift_name ? ['name' => $this->gift_name, 'relation' => $this->gift_relation, 'message' => $this->gift_message, 'token' => $this->gift_token] : null,
            'recurring' => (bool) $this->recurring_donation_id,
        ];
    }
}
