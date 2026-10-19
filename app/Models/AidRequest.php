<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AidRequest extends Model
{
    protected $guarded = ['id'];

    // Personal details are encrypted at rest (AES-256 with the app key).
    protected $casts = [
        'description' => 'encrypted',
        'phone' => 'encrypted',
        'decision_note' => 'encrypted',
        'amount_requested' => 'decimal:2',
        'approved_amount' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(AidDocument::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(AidRequestEvent::class)->oldest();
    }
}
