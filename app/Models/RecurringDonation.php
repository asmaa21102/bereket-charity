<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RecurringDonation extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['amount' => 'decimal:2', 'next_charge_on' => 'date'];

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function donations(): HasMany
    {
        return $this->hasMany(Donation::class);
    }

    public function advance(): void
    {
        $this->next_charge_on = $this->frequency === 'weekly' ? $this->next_charge_on->addWeek() : $this->next_charge_on->addMonthNoOverflow();
    }
}
