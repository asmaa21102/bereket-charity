<?php

namespace App\Models;

use App\Models\Concerns\HasTranslations;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Campaign extends Model
{
    use HasTranslations;

    protected $guarded = ['id', 'raised_amount', 'donors_count'];

    protected $casts = [
        'title' => 'array', 'summary' => 'array', 'story' => 'array', 'unit_label' => 'array',
        'fund_types' => 'array', 'impact_levels' => 'array', 'is_urgent' => 'boolean',
        'goal_amount' => 'decimal:2', 'raised_amount' => 'decimal:2', 'unit_price' => 'decimal:2', 'ends_on' => 'date',
    ];

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function donations(): HasMany
    {
        return $this->hasMany(Donation::class);
    }

    public function updates(): HasMany
    {
        return $this->hasMany(CampaignUpdate::class)->latest('published_at');
    }

    public function scopeVisible(Builder $q): Builder
    {
        return $q->whereIn('status', ['active', 'completed'])->orderByDesc('is_urgent')->orderBy('sort_order');
    }

    public function progress(): int
    {
        return $this->goal_amount > 0 ? (int) min(100, round($this->raised_amount / $this->goal_amount * 100)) : 0;
    }

    /** Recomputes totals from paid donations (called after each payment). */
    public function refreshTotals(): void
    {
        $paid = $this->donations()->where('status', 'paid');
        $this->raised_amount = (clone $paid)->sum('amount');
        $this->donors_count = (clone $paid)->selectRaw('COUNT(DISTINCT COALESCE(user_id, donor_email)) AS n')->value('n') ?? 0;
        if ($this->status === 'active' && $this->raised_amount >= $this->goal_amount) {
            $this->status = 'completed';
        }
        $this->saveQuietly();
    }

    /** Shape sent to the pages, in the current language. */
    public function card(): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'category' => $this->category,
            'title' => $this->t('title'),
            'summary' => $this->t('summary'),
            'cover' => $this->cover ? asset($this->cover) : null,
            'goal' => (float) $this->goal_amount,
            'raised' => (float) $this->raised_amount,
            'donors' => $this->donors_count,
            'progress' => $this->progress(),
            'unit_price' => $this->unit_price ? (float) $this->unit_price : null,
            'unit_label' => $this->t('unit_label'),
            'fund_types' => $this->fund_types,
            'is_urgent' => $this->is_urgent,
            'status' => $this->status,
            'ends_on' => $this->ends_on?->toDateString(),
        ];
    }
}
